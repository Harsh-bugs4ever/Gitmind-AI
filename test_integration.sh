#!/bin/bash
echo "Testing backend health..."
curl http://localhost:8000/

echo "Testing chat endpoint..."
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "how many open issues?", "owner": "withcoral", "repo": "coral"}'

echo "Testing dashboard endpoint..."
curl http://localhost:8000/api/dashboard?owner=withcoral&repo=coral

echo "Testing issues endpoint..."
curl http://localhost:8000/api/issues?owner=withcoral&repo=coral
