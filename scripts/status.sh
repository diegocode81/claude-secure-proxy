#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

PORT="3000"
if [ -f "$ENV_FILE" ]; then
  PORT_FROM_ENV="$(grep -E '^PORT=' "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'" | xargs || true)"
  PORT="${PORT_FROM_ENV:-3000}"
fi

if curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1; then
  echo "claude-secure-proxy is running."
else
  echo "claude-secure-proxy is not running."
fi
