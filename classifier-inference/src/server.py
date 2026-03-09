import base64
import io
import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List

import timm
import torch
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from torchvision import transforms

# -------------------------- config -------------------------- #

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Map semantic names -> model directories.
# Each directory should contain:
# - model_best.pth (or model_last.pth)
# - classes.json
# - metrics.json (optional, but preferred)
MODEL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "interactive": {
        "dir": os.path.join(SCRIPT_DIR, "../models/interactive"),
        # Fallbacks if metrics.json is missing these keys:
        "model_name": "vit_base_patch16_224",
        "image_size": 224,
    },
}


@dataclass
class LoadedClassifier:
    model: torch.nn.Module
    idx_to_class: Dict[int, str]
    model_name: str
    image_size: int
    transform: transforms.Compose


_model_cache: Dict[str, LoadedClassifier] = {}


def _device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    return "cuda" if torch.cuda.is_available() else "cpu"


def _build_eval_transform(image_size: int) -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize(int(image_size * 1.14)),
            transforms.CenterCrop(image_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ]
    )


def _resolve_artifacts(model_name: str, config: Dict[str, Any]) -> Dict[str, str]:
    model_dir = config.get("dir")
    if not model_dir:
        raise HTTPException(
            status_code=500,
            detail={"error": "model registry missing dir", "model_name": model_name},
        )

    weights_best = os.path.join(model_dir, "model_best.pth")
    weights_last = os.path.join(model_dir, "model_last.pth")
    if os.path.exists(weights_best):
        weights_path = weights_best
    elif os.path.exists(weights_last):
        weights_path = weights_last
    else:
        weights_path = weights_best

    return {
        "model_dir": model_dir,
        "weights_path": weights_path,
        "classes_path": os.path.join(model_dir, "classes.json"),
        "metrics_path": os.path.join(model_dir, "metrics.json"),
    }


def _load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_idx_to_class(path: str) -> Dict[int, str]:
    raw = _load_json(path)
    out: Dict[int, str] = {}
    for k, v in raw.items():
        out[int(k)] = str(v)
    if not out:
        raise ValueError("classes.json is empty")
    return out


def _warmup(loaded: LoadedClassifier) -> None:
    dummy = torch.zeros((1, 3, loaded.image_size, loaded.image_size), dtype=torch.float32)
    dummy = dummy.to(_device())
    with torch.no_grad():
        loaded.model(dummy)


def _get_classifier(model_name: str) -> LoadedClassifier:
    if model_name not in MODEL_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "unknown model_name",
                "model_name": model_name,
                "available_models": sorted(MODEL_REGISTRY.keys()),
            },
        )

    if model_name in _model_cache:
        return _model_cache[model_name]

    config = MODEL_REGISTRY[model_name]
    artifacts = _resolve_artifacts(model_name, config)

    weights_path = artifacts["weights_path"]
    classes_path = artifacts["classes_path"]
    metrics_path = artifacts["metrics_path"]

    if not os.path.exists(weights_path):
        raise HTTPException(
            status_code=500,
            detail={"error": "model file not found on server", "model_name": model_name, "path": weights_path},
        )
    if not os.path.exists(classes_path):
        raise HTTPException(
            status_code=500,
            detail={"error": "classes.json not found on server", "model_name": model_name, "path": classes_path},
        )

    try:
        idx_to_class = _load_idx_to_class(classes_path)

        metrics: Dict[str, Any] = {}
        if os.path.exists(metrics_path):
            metrics = _load_json(metrics_path)

        architecture = metrics.get("model_name") or config.get("model_name")
        image_size = int(metrics.get("image_size") or config.get("image_size") or 224)
        if not architecture:
            raise ValueError("Missing model_name in metrics.json and registry fallback")

        classifier = timm.create_model(
            architecture,
            pretrained=False,
            num_classes=len(idx_to_class),
        )
        state_dict = torch.load(weights_path, map_location="cpu")
        if isinstance(state_dict, dict) and "state_dict" in state_dict and isinstance(state_dict["state_dict"], dict):
            state_dict = state_dict["state_dict"]
        classifier.load_state_dict(state_dict, strict=True)
        classifier.to(_device())
        classifier.eval()

        loaded = LoadedClassifier(
            model=classifier,
            idx_to_class=idx_to_class,
            model_name=architecture,
            image_size=image_size,
            transform=_build_eval_transform(image_size),
        )
        _warmup(loaded)
        _model_cache[model_name] = loaded
        return loaded
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "failed to load classifier model",
                "model_name": model_name,
                "exc": str(e),
            },
        )


def _decode_rgb_image(image_base64: str) -> Image.Image:
    img_bytes = base64.b64decode(image_base64, validate=True)
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")


# -------------------------- api -------------------------- #

app = FastAPI(title="Classifier Inference Server")


class ClassifierPayload(BaseModel):
    image_base64: str
    model_name: str = Field(..., min_length=1)
    top_k: int = Field(1, ge=1, le=20)


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "device": _device(),
        "available_models": sorted(MODEL_REGISTRY.keys()),
        "loaded_models": sorted(_model_cache.keys()),
    }


@app.post("/classifier_predictions")
async def classifier_predictions(payload: ClassifierPayload) -> Dict[str, Any]:
    try:
        img = _decode_rgb_image(payload.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e}")

    width, height = img.size
    loaded = _get_classifier(payload.model_name)

    try:
        x = loaded.transform(img).unsqueeze(0).to(_device())
        with torch.no_grad():
            logits = loaded.model(x)
            probs = torch.softmax(logits, dim=1)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classifier predict error: {e}")

    k = min(int(payload.top_k), int(probs.shape[0]))
    confs, classes = torch.topk(probs, k=k)

    predictions: List[Dict[str, Any]] = []
    for conf, cls_idx in zip(confs.tolist(), classes.tolist()):
        idx = int(cls_idx)
        predictions.append(
            {
                "class_index": idx,
                "label": loaded.idx_to_class.get(idx, str(idx)),
                "conf": float(conf),
            }
        )

    return {
        "imgWidth": width,
        "imgHeight": height,
        "modelName": loaded.model_name,
        "predictions": predictions,
        "topPrediction": predictions[0] if predictions else None,
    }
