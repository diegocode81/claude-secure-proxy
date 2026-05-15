#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"
PID_FILE="$DATA_DIR/proxy.pid"
ENV_FILE="$PROJECT_ROOT/.env"

mkdir -p "$DATA_DIR"

PORT="3000"
if [ -f "$ENV_FILE" ]; then
  PORT_FROM_ENV="$(grep -E '^PORT=' "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'" | xargs || true)"
  PORT="${PORT_FROM_ENV:-3000}"
fi

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE")"
  if [ -n "$PID" ] && kill -0 "$PID" >/dev/null 2>&1; then
    if command -v pkill >/dev/null 2>&1; then
      pkill -TERM -P "$PID" >/dev/null 2>&1 || true
    fi
    kill "$PID" >/dev/null 2>&1 || true
  fi
fi

if command -v lsof >/dev/null 2>&1; then
  for PID_ON_PORT in $(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true); do
    kill "$PID_ON_PORT" >/dev/null 2>&1 || true
  done
fi

rm -f "$PID_FILE"
echo "claude-secure-proxy stopped."
