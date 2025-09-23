#!/usr/bin/env bash
# Usage: ./ocr_post.sh /absolute/path/to/image.png

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 /absolute/path/to/image"
  exit 1
fi

IMG_PATH="$1"

if [ ! -f "$IMG_PATH" ]; then
  echo "File not found: $IMG_PATH"
  exit 1
fi

# Encode to base64 without line breaks
B64=$(base64 -i "$IMG_PATH" | tr -d '\n')
echo $B64
# POST JSON payload
curl -s -X POST "http://localhost:8000/ocr" \
  -H "Content-Type: application/json" \
  -d "{\"image_b64\":\"$B64\"}"
