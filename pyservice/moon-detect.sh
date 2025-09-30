#!/usr/bin/env bash
# Usage: ./moon-detect.sh person ./image.b64

OBJECT="$1"
B64_FILE="$2"

if [ -z "$OBJECT" ] || [ -z "$B64_FILE" ]; then
  echo "Usage: $0 <object> <image.b64>"
  exit 1
fi

if [ -z "$MOONDREAM_AUTH_TOKEN" ]; then
  echo "Error: MOONDREAM_AUTH_TOKEN environment variable not set"
  exit 1
fi

B64_DATA=$(cat "$B64_FILE")

curl -X POST "https://api.moondream.ai/v1/detect" \
  -H "Content-Type: application/json" \
  -H "X-Moondream-Auth: $MOONDREAM_AUTH_TOKEN" \
  -d "{
    \"image_url\": \"data:image/jpeg;base64,${B64_DATA}\",
    \"object\": \"${OBJECT}\"
  }"
