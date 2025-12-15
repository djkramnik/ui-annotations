#!/usr/bin/env bash
set -euo pipefail

# Resolve project root (directory where this script lives)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure src/ is on PYTHONPATH so `server:app` resolves cleanly
export PYTHONPATH="${ROOT_DIR}/src:${PYTHONPATH:-}"

HOST="0.0.0.0"
PORT="4420"

echo "Starting YOLO FastAPI server"
echo "  Root: $ROOT_DIR"
echo "  App:  src/server.py"
echo "  Host: $HOST"
echo "  Port: $PORT"
echo

exec uvicorn server:app \
  --host "$HOST" \
  --port "$PORT"
