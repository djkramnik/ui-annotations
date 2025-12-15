import base64
import io
import os
from typing import Any, Dict, List

import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from ultralytics import YOLO

import torch

# -------------------------- config -------------------------- #

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Map semantic names -> model file paths.
# Edit these to match your on-disk layout.
MODEL_REGISTRY: Dict[str, str] = {
  "textregions": os.path.join(SCRIPT_DIR, "../models/text/best.pt"),
  "interactive": os.path.join(SCRIPT_DIR, "../models/interactive/best.pt"),
  "service_manuals": os.path.join(SCRIPT_DIR, "../models/service_manuals/best.pt"),
}

# Cache loaded YOLO models + names
_model_cache: Dict[str, YOLO] = {}
_names_cache: Dict[str, Dict[int, str]] = {}

def _device() -> str:
    # Keep parity with your existing behavior
    if torch.backends.mps.is_available():
        return "mps"
    # ultralytics will use cuda if available when device=0 or "cuda",
    # but we keep this explicit and stable:
    return "cuda" if torch.cuda.is_available() else "cpu"


def _warmup(model: YOLO) -> None:
    # Optional: helps avoid first-request latency spikes
    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    model.predict(
        source=dummy,
        imgsz=640,
        conf=0.25,
        iou=0.45,
        device=_device(),
        verbose=False,
    )

def _get_model(model_name: str) -> YOLO:
    if model_name not in MODEL_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "unknown model_name",
                "model_name": model_name,
                "available_models": sorted(MODEL_REGISTRY.keys()),
            },
        )

    # Return cached model if already loaded
    if model_name in _model_cache:
        return _model_cache[model_name]

    path = MODEL_REGISTRY[model_name]
    if not os.path.exists(path):
        raise HTTPException(
            status_code=500,
            detail={
                "error": "model file not found on server",
                "model_name": model_name,
                "path": path,
            },
        )

    try:
        m = YOLO(path)
        # names is usually dict[int,str] in ultralytics
        names = getattr(m, "names", None) or {}
        _model_cache[model_name] = m
        _names_cache[model_name] = names
        _warmup(m)
        return m
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "failed to load model", "model_name": model_name, "path": path, "exc": str(e)},
        )

# -------------------------- api -------------------------- #

app = FastAPI(title="YOLO Inference Server")


class ImagePayload(BaseModel):
    image_base64: str

class YoloPayload(ImagePayload):
    # required model name
    model_name: str = Field(..., min_length=1)

    # tunables (kept the same defaults/constraints)
    conf: float = Field(0.25, ge=0.0, le=1.0)
    iou: float = Field(0.45, ge=0.0, le=1.0)
    imgsz: int = Field(640, ge=64, le=4096)


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "device": _device(),
        "available_models": sorted(MODEL_REGISTRY.keys()),
        "loaded_models": sorted(_model_cache.keys()),
    }

@app.post("/yolo_predictions")
async def yolo_predictions(payload: YoloPayload) -> Dict[str, Any]:
    # validate params
    conf = float(payload.conf)
    iou = float(payload.iou)
    imgsz = int(payload.imgsz)

    if not (0.0 <= conf <= 1.0 and 0.0 <= iou <= 1.0):
        raise HTTPException(status_code=400, detail="bad conf or iou (0. - 1.)")

    # decode base64 image
    try:
        img_bytes = base64.b64decode(payload.image_base64, validate=True)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e}")

    width, height = img.size

    model = _get_model(payload.model_name)
    names = _names_cache.get(payload.model_name, {}) or {}

    try:
        results = model.predict(
            source=img,
            imgsz=imgsz,
            conf=conf,
            iou=iou,
            device=_device(),
            verbose=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YOLO predict error: {e}")

    r = results[0]
    detections: List[Dict[str, Any]] = []

    if getattr(r, "boxes", None) is None:
        return {"width": width, "height": height, "detections": detections}

    # [[x1,y1,x2,y2]]
    xyxy = r.boxes.xyxy.cpu().tolist()
    confs = r.boxes.conf.cpu().tolist()
    classes = [int(x) for x in r.boxes.cls.cpu().tolist()]

    for (x1, y1, x2, y2), c, cls in zip(xyxy, confs, classes):
        label = names.get(cls, str(cls))
        detections.append(
            {
                "box": [float(x1), float(y1), float(x2), float(y2)],
                "conf": float(c),
                "label": label,
            }
        )

    return {"width": width, "height": height, "detections": detections}
