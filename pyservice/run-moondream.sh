set -euo pipefail
# export DEVICE=mps
# export SCORE_THRESH=0.5
# export CFG_PATH=./config.yaml
# export MODEL_WEIGHTS=./model_final.pth
# export META_PATH=./metadata.json

export PYTHONPATH="$PWD/src${PYTHONPATH:+:$PYTHONPATH}"
export CUDA_VISIBLE_DEVICES=""
exec uvicorn moondream:app --host 127.0.0.1 --port 8001 --reload