# GitMind API Contracts

## Base URL
Development: http://localhost:8000
Production: https://gitmind-api.onrender.com

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
GET /api/issues?owner=facebook&repo=react
Response:
{
  "issues": [...],
  "duplicates": [
    {
      "issue_1": 123,
      "issue_2": 456,
      "similarity": 0.91
    }
  ]
}

### 3. Release Notes
POST /api/release-notes
Request:
{
  "owner": "facebook",
  "repo": "react"
}
Response:
{
  "notes": "This release includes..."
}

### 4. Dashboard
GET /api/dashboard?owner=facebook&repo=react
Response:
{
  "open_issues": 23,
  "merged_prs": 45,
  "contributors": 12,
  "stale_prs": 3
}
