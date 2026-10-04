#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# AI Resume Analyzer — Backend Startup Script
# ─────────────────────────────────────────────────────────────

set -e

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend"
cd "$BACKEND_DIR"

# Check for .env
if [ ! -f ".env" ]; then
  echo "⚠️  No .env file found in backend/"
  echo "   Copy the example: cp backend/.env.example backend/.env"
  echo "   Then add your GEMINI_API_KEY."
  echo ""
fi

# Try to find uvicorn
if command -v uvicorn &>/dev/null; then
  UVICORN="uvicorn"
elif [ -f "$HOME/Library/Python/3.9/bin/uvicorn" ]; then
  UVICORN="$HOME/Library/Python/3.9/bin/uvicorn"
else
  echo "❌ uvicorn not found. Run: pip3 install -r backend/requirements.txt"
  exit 1
fi

echo "🚀 Starting AI Resume Analyzer Backend..."
echo "   URL: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo ""

$UVICORN main:app --host 0.0.0.0 --port 8000 --reload
