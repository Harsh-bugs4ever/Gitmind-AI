#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://localhost:8000}"
OWNER="${OWNER:-withcoral}"
REPO="${REPO:-coral}"

echo "Testing backend health..."
curl -f "$BASE_URL/health"

echo "Testing chat endpoint..."
curl -f -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"how many open issues?\", \"owner\": \"$OWNER\", \"repo\": \"$REPO\"}"

echo "Testing repository stats endpoint..."
curl -f "$BASE_URL/api/repo/stats?owner=$OWNER&repo=$REPO"

echo "Testing release notes endpoint..."
curl -f "$BASE_URL/api/releases/generate?owner=$OWNER&repo=$REPO"

echo "Testing duplicate issue endpoint..."
curl -f -X POST "$BASE_URL/api/issues/check-duplicate" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Login button does not submit the form\", \"owner\": \"$OWNER\", \"repo\": \"$REPO\"}"
