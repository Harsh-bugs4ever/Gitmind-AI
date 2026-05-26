GitMind 🚀

AI-Powered Repository Intelligence Platform

GitMind is an AI-powered platform designed to help open source maintainers manage GitHub repositories more efficiently.

The platform uses AI, semantic search, and repository analytics to automate repetitive maintainer tasks such as issue triaging, duplicate issue detection, release note generation, and repository querying using natural language.

GitMind allows maintainers to interact with repositories conversationally instead of manually searching through issues and pull requests.

---

✨ Features

💬 Natural Language Repository Chat

Ask repositories questions in plain English.

Examples:

- "What bugs were fixed last week?"
- "Which PRs are stale?"
- "Who is the most active contributor?"

---

🤖 Duplicate Issue Detection

Detects semantically similar GitHub issues automatically using embeddings.

---

📝 AI Release Notes Generator

Generates release notes automatically from merged pull requests.

---

📊 Repository Health Dashboard

Displays:

- Open issues
- PR activity
- Contributor activity
- Stale PRs

---

🏗 System Architecture

User
  ↓
React Frontend
  ↓
FastAPI Backend
  ↓
Claude API + Coral
  ↓
GitHub API + PostgreSQL

---

🛠 Tech Stack

Frontend

- React
- TailwindCSS
- Recharts

Backend

- FastAPI
- PostgreSQL

AI

- Claude API
- sentence-transformers

Repository Data

- Coral
- GitHub API

---

📂 Project Structure

gitmind-ai/
│
├── frontend/
├── backend/
├── ai-services/
├── docs/
├── README.md

---

⚡ Getting Started

Clone Repository

git clone https://github.com/YOUR_USERNAME/gitmind-ai.git
cd gitmind-ai

---

Frontend Setup

cd frontend
npm install
npm run dev

---

Backend Setup

cd backend
pip install -r requirements.txt
uvicorn main:app --reload

---

🎯 Goal

Help open source maintainers automate repetitive repository management tasks using AI.
