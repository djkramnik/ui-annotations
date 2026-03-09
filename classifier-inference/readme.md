## What is this

A lightweight FastAPI server for timm classifier inference, modeled after `yolo-inference`.

## Setup

```bash
cd classifier-inference
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
```

## Model artifacts

Put each model in its own subfolder under `models/` (this folder is gitignored):

```txt
models/
  interactive/
    model_best.pth   # or model_last.pth
    classes.json     # produced by classifier-prep training
    metrics.json     # optional, but should include model_name and image_size
```

Then map the folder name in `src/server.py` `MODEL_REGISTRY`.

## Run

```bash
./run-server.sh
```

## Docker

Build:

```bash
docker build -t classifier-inference .
```

Run (host-reachable on port `5000`):

```bash
docker run --rm \
  -p 5000:5000 \
  -v "$(pwd)/models:/app/models" \
  classifier-inference
```

## Test Inference

Use the helper script to send an image to the classifier endpoint:

```bash
./predict-image.sh /path/to/image.png
```

Optional environment overrides:

```bash
MODEL_NAME=interactive TOP_K=3 CLASSIFIER_ENDPOINT=http://127.0.0.1:5000/classifier_predictions ./predict-image.sh /path/to/image.png
```
