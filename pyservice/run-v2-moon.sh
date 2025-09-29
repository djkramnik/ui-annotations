#!/usr/bin/env bash
LABEL="$1"
IMG_B64=$(cat sample.b64)

curl -s -X POST http://localhost:2020/v1/detect \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "data:image/png;base64,'"${IMG_B64}"'",
    "object": "'"${LABEL}"'"
  }' | jq .