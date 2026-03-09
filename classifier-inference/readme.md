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
  screen_classifier/
    model_best.pth   # or model_last.pth
    classes.json     # produced by classifier-prep training
    metrics.json     # optional, but should include model_name and image_size
```

Then map the folder name in `src/server.py` `MODEL_REGISTRY`.

## Run

```bash
./run-server.sh
```
