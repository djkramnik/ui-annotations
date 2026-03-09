#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <image_path>"
  echo
  echo "Optional env vars:"
  echo "  CLASSIFIER_ENDPOINT (default: http://127.0.0.1:5000/classifier_predictions)"
  echo "  MODEL_NAME           (default: interactive)"
  echo "  TOP_K                (default: 5)"
  exit 1
fi

IMAGE_PATH="$1"
ENDPOINT="${CLASSIFIER_ENDPOINT:-http://127.0.0.1:5001/classifier_predictions}"
MODEL_NAME="${MODEL_NAME:-interactive}"
TOP_K="${TOP_K:-5}"

if [[ ! -f "$IMAGE_PATH" ]]; then
  echo "Image file not found: $IMAGE_PATH" >&2
  exit 1
fi

if ! [[ "$TOP_K" =~ ^[0-9]+$ ]] || [[ "$TOP_K" -lt 1 ]]; then
  echo "TOP_K must be a positive integer (got: $TOP_K)" >&2
  exit 1
fi

PAYLOAD="$(
python3 - "$IMAGE_PATH" "$MODEL_NAME" "$TOP_K" <<'PY'
import base64
import json
import pathlib
import sys

image_path = pathlib.Path(sys.argv[1])
model_name = sys.argv[2]
top_k = int(sys.argv[3])

with image_path.open("rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")

print(json.dumps({
    "image_base64": b64,
    "model_name": model_name,
    "top_k": top_k,
}))
PY
)"

HTTP_RESPONSE="$(
curl -sS \
  -w '\n%{http_code}' \
  -X POST "$ENDPOINT" \
  -H 'Content-Type: application/json' \
  --data "$PAYLOAD"
)"

HTTP_STATUS="${HTTP_RESPONSE##*$'\n'}"
RESPONSE_BODY="${HTTP_RESPONSE%$'\n'*}"

if [[ "$HTTP_STATUS" -lt 200 || "$HTTP_STATUS" -ge 300 ]]; then
  echo "Request failed (HTTP $HTTP_STATUS) from $ENDPOINT" >&2
  echo "$RESPONSE_BODY" >&2
  exit 1
fi

python3 - "$RESPONSE_BODY" <<'PY'
import json
import sys

try:
    data = json.loads(sys.argv[1])
except Exception as exc:
    print(f"Failed to parse JSON response: {exc}", file=sys.stderr)
    sys.exit(1)

top = data.get("topPrediction") or {}
label = top.get("label", "<unknown>")
conf = top.get("conf")

print(f"Top label: {label}")
if conf is None:
    print("Top confidence: <missing>")
else:
    print(f"Top confidence: {float(conf):.6f}")

print(f"Model: {data.get('modelName', '<unknown>')}")
print(f"Image size: {data.get('imgWidth', '?')}x{data.get('imgHeight', '?')}")

preds = data.get("predictions") or []
if preds:
    print("Predictions:")
    for p in preds:
        p_label = p.get("label", "<unknown>")
        p_idx = p.get("class_index", "?")
        p_conf = p.get("conf")
        if p_conf is None:
            conf_txt = "<missing>"
        else:
            conf_txt = f"{float(p_conf):.6f}"
        print(f"  - idx={p_idx} label={p_label} conf={conf_txt}")
PY
