#!/usr/bin/env bash
# Usage: ./post_ocr_batch.sh img1.png [img2.jpg ...]
# Sends: { "clips": ["<b64_1>", "<b64_2>", ...] } to http://localhost:8000/ocr/batch

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 /path/to/one.png [/path/to/two.jpg ...]" >&2
  exit 1
fi

API_URL="http://localhost:8000/ocr/batch"

# Require jq
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: 'jq' is required. Install it (brew install jq) and retry." >&2
  exit 1
fi

# Build a newline-separated list of base64 strings (no prefixes, no newlines)
# macOS base64 wraps lines by default; strip both \n and \r just in case.
b64_list=""
for img in "$@"; do
  [[ -f "$img" ]] || { echo "File not found: $img" >&2; exit 1; }
  b64=$(base64 < "$img" | tr -d '\r\n')
  b64_list+="${b64}"$'\n'
done

# Convert newline-separated b64s -> JSON { "clips": ["...","..."] }
payload=$(printf '%s' "$b64_list" \
  | jq -Rcs '{clips: (split("\n") | map(select(length>0)))}')
echo $payload
# POST (use --data-binary to avoid any accidental form encoding)
curl -sS -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  --data-binary "$payload"
echo
