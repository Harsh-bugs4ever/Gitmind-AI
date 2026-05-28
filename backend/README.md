# GitMind Backend

FastAPI backend for the GitMind GitHub repository intelligence platform.

## Requirements

- Python 3.10+
- PostgreSQL (running locally or remotely)
- [Coral CLI](https://withcoral.com) installed and on your `PATH`
- Google Gemini API key

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env
# Edit .env — fill in DATABASE_URL, GEMINI_API_KEY, GITHUB_TOKEN

# 2. Install dependencies (using uv — recommended)
uv pip install -e .

# — OR using pip —
pip install -e .

# 3. Run the dev server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

---

## Environment Variables

| Variable                | Required | Description                              |
|-------------------------|----------|------------------------------------------|
| `AUTH_SECRET_KEY`       | Yes      | Secret used to sign/verify bearer tokens |
| `GITHUB_CLIENT_ID`      | Yes      | GitHub OAuth App client ID               |
| `GITHUB_CLIENT_SECRET`  | Yes      | GitHub OAuth App client secret           |
| `GITHUB_REDIRECT_URI`   | Yes      | OAuth callback URL (backend endpoint)    |
| `FRONTEND_AUTH_SUCCESS_URL` | Yes  | Frontend callback URL that receives `token` |
| `DATABASE_URL`          | Yes      | PostgreSQL DSN (`postgresql://user:pw@host:5432/dbname`) |
| `GEMINI_API_KEY`        | Yes      | Google Gemini API key for AI features |
| `GEMINI_MODEL`          | No       | Gemini model name (defaults to `gemini-2.5-flash`) |
| `GITHUB_TOKEN`          | TODO     | GitHub PAT (used in webhook validation)  |
| `GITHUB_WEBHOOK_SECRET` | No       | HMAC secret for GitHub webhook signature check |

---

## Endpoints

| Method | Path                          | Description                                       |
|--------|-------------------------------|---------------------------------------------------|
| GET    | `/health`                     | Liveness probe → `{ "status": "ok" }`            |
| GET    | `/auth/github/login`          | Start GitHub OAuth flow (public)                 |
| GET    | `/auth/github/callback`       | OAuth callback, returns bearer token (public)    |
| GET    | `/auth/me`                    | Return current token user                         |
| POST   | `/api/chat`                   | Natural-language Q&A over repo data               |
| GET    | `/api/issues`                 | List issues and potential duplicate pairs         |
| POST   | `/api/issues/embed`           | Store an embedding for an issue                   |
| POST   | `/api/issues/check-duplicate` | Find semantically similar issues (≥ 0.8 similarity) |
| POST   | `/api/release-notes`          | Generate release notes string from merged PRs     |
| GET    | `/api/dashboard`              | Contract-compatible dashboard metrics             |
| GET    | `/api/releases/generate`      | Generate categorised release notes from merged PRs |
| GET    | `/api/repo/stats`             | Open issues, PR merge rate, contributors, stale PRs |
| GET    | `/api/repo/trends`            | Weekly issue counts for the last 3 months          |
| POST   | `/api/webhooks/github`        | Receive GitHub webhook events                     |

---

## Project Layout

```
backend/
├── main.py                    # FastAPI app factory + entry point
├── pyproject.toml             # Dependencies
├── .env.example               # Environment variable template
└── app/
    ├── config.py              # Settings via pydantic-settings
    ├── database.py            # psycopg2 connection pool + schema bootstrap
    ├── models.py              # Pydantic request/response models
    ├── coral.py               # subprocess wrapper for `coral sql`
    ├── gemini.py              # Gemini API integration
    ├── embeddings.py          # Embedding placeholder (TODO: wire up sentence-transformers)
    └── routers/
        ├── chat.py            # POST /api/chat
        ├── issues.py          # POST /api/issues/*
        ├── releases.py        # GET  /api/releases/generate
        ├── repo.py            # GET  /api/repo/stats|trends
        └── webhooks.py        # POST /api/webhooks/github
```

---

## AI/ML Modules

Gemini powers the chat and release-note endpoints. Embeddings still require
the optional sentence-transformers dependency.

### `app/gemini.py`
- `generate_sql()` → Call Gemini to convert question → SQL
- `summarise_query_result()` → Summarise coral output in natural language
- `generate_release_notes()` → Categorise PR titles into release sections

### `app/embeddings.py`
- `embed()` → Generate sentence-transformers vector
- `cosine_similarity()` → Real vector similarity
- `find_similar()` → Filter stored embeddings above threshold

## Database Schema

The backend automatically creates the required table on first startup:

```sql
CREATE TABLE IF NOT EXISTS issue_embeddings (
    issue_id    TEXT        PRIMARY KEY,
    embedding   FLOAT8[]    NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> **Tip:** When the AI/ML embeddings are wired up, consider installing
> [pgvector](https://github.com/pgvector/pgvector) for native ANN search,
> which will be much faster than the current in-memory cosine comparison.

---

## Coral CLI

All GitHub data queries use:
```bash
coral sql "<SQL query>"
```

Install Coral:
```bash
curl -fsSL https://withcoral.com/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
coral source add --interactive github
```

---

## How To Use This Backend API

Base URL:
- Local: `http://localhost:8000`
- Production: `https://gitmind-api.onrender.com`

Quick verify:
```bash
curl http://localhost:8000/health
```

### Authentication Flow (GitHub OAuth)

All `/api/*` routes require `Authorization: Bearer <token>`.

1. Open login URL in browser:
```text
http://localhost:8000/auth/github/login
```
2. After GitHub consent, callback returns JSON containing:
   - `access_token`
   - `token_type`
   - `user`
3. Use `access_token` as bearer token in Postman or frontend.

Example protected request header:
```text
Authorization: Bearer <access_token>
```

### 1) Chat endpoint
Use this when the user asks a natural-language question about a repository.

```bash
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "how many open bugs?",
    "owner": "facebook",
    "repo": "react"
  }'
```

Response shape:
```json
{
  "answer": "There are 23 open bugs...",
  "sql": "SELECT COUNT(*) FROM github.issues ..."
}
```

### 2) Issues endpoint
Use this to fetch issue rows for a repo and receive duplicate pairs.

```bash
curl "http://localhost:8000/api/issues?owner=facebook&repo=react"
```

Response shape:
```json
{
  "issues": [],
  "duplicates": [
    {
      "issue_1": 123,
      "issue_2": 456,
      "similarity": 0.91
    }
  ]
}
```

### 3) Release notes endpoint
Use this to generate release notes text from recent merged PRs.

```bash
curl -X POST "http://localhost:8000/api/release-notes" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "facebook",
    "repo": "react"
  }'
```

Response shape:
```json
{
  "notes": "This release includes..."
}
```

### 4) Dashboard endpoint
Use this to populate summary cards in the frontend dashboard.

```bash
curl "http://localhost:8000/api/dashboard?owner=facebook&repo=react"
```

Response shape:
```json
{
  "open_issues": 23,
  "merged_prs": 45,
  "contributors": 12,
  "stale_prs": 3
}
```

---

## User Flow (Frontend -> Backend)

Recommended user flow for the app:

1. User selects GitHub `owner` + `repo`.
2. Frontend calls `GET /api/dashboard` to render top metrics cards first.
3. Frontend calls `GET /api/issues` to render the issue list and duplicate hints.
4. User asks a question in chat; frontend calls `POST /api/chat`.
5. User clicks "Generate release notes"; frontend calls `POST /api/release-notes`.
6. Frontend displays results and allows re-run with different repositories.

Typical loading strategy:
- Load dashboard first (fast summary).
- Load issues second (list/detail view).
- Trigger chat/release notes on explicit user actions.

Error-handling guidance:
- `4xx`: user input or request shape problems.
- `5xx`: service/internal error; show retry action.
- `502`: Coral CLI query failure; surface "data source unavailable" message.
