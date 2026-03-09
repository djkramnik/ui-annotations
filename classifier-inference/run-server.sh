#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${ROOT_DIR}/env"

if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  echo "Missing virtualenv at ${VENV_DIR}"
  echo "Create one with:"
  echo "  cd ${ROOT_DIR}"
  echo "  python3 -m venv env"
  echo "  source env/bin/activate"
  echo "  pip install -r requirements.txt"
  exit 1
fi

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

export PYTHONPATH="${ROOT_DIR}/src:${PYTHONPATH:-}"

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-4421}"

echo "Starting classifier FastAPI server"
echo "  Root: ${ROOT_DIR}"
echo "  App:  src/server.py"
echo "  Host: ${HOST}"
echo "  Port: ${PORT}"
echo

exec uvicorn server:app \
  --host "${HOST}" \
  --port "${PORT}"
