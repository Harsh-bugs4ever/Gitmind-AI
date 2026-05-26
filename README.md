# GitMind 🧠
AI-Powered Repository Intelligence Platform

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- Coral CLI
- PostgreSQL

### Installation

1. Clone the repo:
git clone https://github.com/Harsh-bugs4ever/Gitmind-AI.git
cd Gitmind-AI

2. Install Coral:
curl -fsSL https://withcoral.com/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
coral source add --interactive github

3. Setup backend:
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your .env values
uvicorn main:app --reload

4. Setup frontend:
cd frontend
npm install
npm start

## Team Structure
- AI/ML Engineer: ai/ folder, ai branch
- Backend Engineer: backend/ folder, backend branch
- Frontend Engineer: frontend/ folder, frontend branch
- DevOps/Integration: root folder, main branch

## API Docs
See API_CONTRACTS.md for all endpoints.

## Live Demo
- Frontend: https://gitmind.vercel.app
- Backend: https://gitmind-api.onrender.com
