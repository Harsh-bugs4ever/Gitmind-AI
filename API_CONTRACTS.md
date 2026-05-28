# GitMind API Contracts

## Base URL
Development: http://localhost:8000
Production: https://gitmind-api.onrender.com

## AI Provider
GitMind uses Google Gemini for natural-language-to-SQL generation,
summarisation, duplicate-analysis prompts, and release-note generation.

## Endpoints

### 1. Chat
POST /api/chat
Request:
{
  "question": "how many open bugs?",
  "owner": "facebook",
  "repo": "react"
}
Response:
{
  "answer": "There are 23 open bugs...",
  "sql": "SELECT COUNT(*) FROM github.issues..."
}

### 2. Issues
POST /api/issues/embed
Request:
{
  "issue_id": "123",
  "text": "Issue title and body"
}
Response:
{
  "issue_id": "123",
  "stored": true,
  "dimensions": 384
}

POST /api/issues/check-duplicate
Request:
{
  "text": "Issue title and body",
  "owner": "facebook",
  "repo": "react"
}
Response:
{
  "matches": [
    {
      "issue_id": "456",
      "similarity": 0.91
    }
  ]
}

### 3. Release Notes
GET /api/releases/generate?owner=facebook&repo=react
Response:
{
  "features": ["..."],
  "bug_fixes": ["..."],
  "performance": ["..."],
  "breaking_changes": ["..."],
  "raw": "{...}"
}

### 4. Repository Stats
GET /api/repo/stats?owner=facebook&repo=react
Response:
{
  "open_issues": 23,
  "pr_merge_rate": 0.82,
  "contributor_count": 12,
  "stale_prs": 3
}

### 5. Repository Trends
GET /api/repo/trends?owner=facebook&repo=react
Response:
{
  "owner": "facebook",
  "repo": "react",
  "trends": [
    {
      "week": "2026-05-25",
      "issue_count": 14
    }
  ]
}
