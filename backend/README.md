# GitMind Backend

FastAPI backend for the GitMind GitHub repository intelligence platform.

## Requirements

- Python 3.10+
- PostgreSQL (running locally or remotely)
- [Coral CLI](https://withcoral.com) installed and on your `PATH`

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
| POST   | `/api/chat`                   | Natural-language Q&A over repo data               |
| POST   | `/api/issues/embed`           | Store an embedding for an issue                   |
| POST   | `/api/issues/check-duplicate` | Find semantically similar issues (≥ 0.8 similarity) |
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

**When ready**, install the dependencies:
```bash
uv pip install sentence-transformers>=3.0.0 numpy>=1.26.0
```

---

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
