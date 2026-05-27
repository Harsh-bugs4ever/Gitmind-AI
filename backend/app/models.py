"""
GitMind Backend — Pydantic request / response models.

Centralising models here keeps the router files lean and makes the API
contract easy to audit in one place.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# /api/chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Natural-language question about the repository")
    owner: str = Field(..., min_length=1, description="GitHub organisation or user name")
    repo: str = Field(..., min_length=1, description="GitHub repository name")


class ChatResponse(BaseModel):
    answer: str = Field(..., description="Gemini's natural-language answer")
    sql: str = Field(..., description="SQL query that was generated and executed")


# ---------------------------------------------------------------------------
# /api/issues/check-duplicate
# ---------------------------------------------------------------------------

class DuplicateCheckRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Issue title and/or body text to check")
    owner: str = Field(..., min_length=1)
    repo: str = Field(..., min_length=1)


class DuplicateMatch(BaseModel):
    issue_id: str
    similarity: float = Field(..., ge=0.0, le=1.0)


class DuplicateCheckResponse(BaseModel):
    matches: list[DuplicateMatch] = Field(default_factory=list, description="Issues above the 0.8 cosine-similarity threshold")


# ---------------------------------------------------------------------------
# /api/issues/embed
# ---------------------------------------------------------------------------

class EmbedRequest(BaseModel):
    issue_id: str = Field(..., min_length=1, description="Unique identifier for the issue (e.g. '123')")
    text: str = Field(..., min_length=1, description="Issue title + body text to embed")


class EmbedResponse(BaseModel):
    issue_id: str
    stored: bool = True
    dimensions: int = Field(..., description="Length of the embedding vector")


# ---------------------------------------------------------------------------
# /api/releases/generate
# ---------------------------------------------------------------------------

class ReleaseNotes(BaseModel):
    features: list[str] = Field(default_factory=list)
    bug_fixes: list[str] = Field(default_factory=list)
    performance: list[str] = Field(default_factory=list)
    breaking_changes: list[str] = Field(default_factory=list)
    raw: str = Field("", description="Raw Gemini output (useful for debugging)")


# ---------------------------------------------------------------------------
# /api/repo/stats
# ---------------------------------------------------------------------------

class RepoStats(BaseModel):
    open_issues: int
    pr_merge_rate: float = Field(..., description="Ratio of merged PRs to total closed PRs (0–1)")
    contributor_count: int
    stale_prs: int = Field(..., description="PRs open for more than 30 days without activity")


# ---------------------------------------------------------------------------
# /api/repo/trends
# ---------------------------------------------------------------------------

class TrendPoint(BaseModel):
    week: str = Field(..., description="ISO week start date (YYYY-MM-DD)")
    issue_count: int


class RepoTrends(BaseModel):
    owner: str
    repo: str
    trends: list[TrendPoint]

# ---------------------------------------------------------------------------
# /api/repo/commits
# ---------------------------------------------------------------------------

class CommitSummary(BaseModel):
    sha: str = Field(..., description="Abbreviated 7-character commit SHA")
    author: str = Field(..., description="GitHub login of the commit author")
    date: str = Field(..., description="ISO date the commit was authored (YYYY-MM-DD)")
    message: str = Field(..., description="Subject line (first line) of the commit message")


class CommitPage(BaseModel):
    owner: str
    repo: str
    ref: str = Field(..., description="Branch name, tag, or SHA that was queried")
    page: int
    page_size: int
    total: int = Field(..., description="Total commits on this ref (use to compute page count)")
    commits: list[CommitSummary]
# ---------------------------------------------------------------------------
# /api/webhooks/github
# ---------------------------------------------------------------------------

class GitHubWebhookResponse(BaseModel):
    status: str
    detail: str = ""


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "ok"


class ErrorResponse(BaseModel):
    error: str
    detail: Any = None
