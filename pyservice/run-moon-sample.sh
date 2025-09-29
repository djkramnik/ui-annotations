#!/usr/bin/env bash

LABEL="$1"

curl -s http://127.0.0.1:8001/detect \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "'"$(cat sample.b64)"'",
    "label": "'"$LABEL"'"
  }'