#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"
PID_FILE="$DATA_DIR/proxy.pid"
LOG_FILE="$DATA_DIR/proxy.log"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env file. Copy .env.example to .env and configure ANTHROPIC_API_KEY."
  exit 1
fi

mkdir -p "$DATA_DIR"

PORT="$(grep -E '^PORT=' "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'" | xargs || true)"
PORT="${PORT:-3000}"

if curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1; then
  echo "claude-secure-proxy is already running."
  exit 0
fi

if command -v lsof >/dev/null 2>&1 && lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "claude-secure-proxy is already running."
  exit 0
fi

cd "$PROJECT_ROOT"
nohup npm run dev >> "$LOG_FILE" 2>&1 &
echo "$!" > "$PID_FILE"

echo "claude-secure-proxy started on http://localhost:$PORT"
