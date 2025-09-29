import base64
from io import BytesIO
from typing import List, Optional, Literal
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, constr
from PIL import Image
import torch
from transformers import AutoModelForCausalLM
import os

token = os.environ["HUGGINGFACE_HUB_TOKEN"]

# ----- Config -----
MODEL_ID = "moondream/moondream3-preview"

# ----- Load model on startup (MPS on Apple, else CPU) -----
device = "mps" if torch.backends.mps.is_available() else "cpu"
dtype = torch.bfloat16 if device == "mps" else torch.float32
print("device", device)


# HACK FOR MPS
import torch.nn.attention.flex_attention as flex
def mps_only_block_mask(causal_mask, *args, **kwargs):
    mask = causal_mask.clone().to(dtype=torch.bool)
    if torch.backends.mps.is_available():
        mask = mask.to("mps")
    return mask

flex.create_block_mask = mps_only_block_mask
# END HACK FOR MPS

model = AutoModelForCausalLM.from_pretrained(
  MODEL_ID,
  trust_remote_code=True,
  torch_dtype=dtype,
  device_map=device,
  token=token
)

app = FastAPI(title="detect")

class DetectPayload(BaseModel):
  image_base64: str
  label: str

class Detection(BaseModel):
  label: str
  score: Optional[float] = None
  x: int
  y: int
  width: int
  height: int

class DetectResponse(BaseModel):
  image_size: dict
  detections: List[Detection]

# return PIL image from b64 image
def _open_rgb_from_b64(b64_no_prefix: str) -> Image.Image:
  try:
    data = base64.b64decode(b64_no_prefix, validate=True)
  except Exception as e:
    raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")
  try:
    img = Image.open(BytesIO(data)).convert("RGB")
  except Exception as e:
    raise HTTPException(status_code=400, detail=f"Invalid image bytes: {e}")
  return img

def _clip01(x: float) -> float:
  return max(0.0, min(1.0, float(x)))

def _norm_to_pixels(obj: dict, w: int, h:int) -> dict:
  x_min = _clip01(obj["x_min"])
  y_min = _clip01(obj["y_min"])
  x_max = _clip01(obj["x_max"])
  y_max = _clip01(obj["y_max"])
  return {
    "x": round(x_min * w),
    "y": round(y_min * h),
    "width": round((x_max - x_min) * w),
    "height": round((y_max - y_min) * h),
    "score": float(obj.get("score", 0.0)),
  }

@app.post("/detect", response_model=DetectResponse)
def detect(payload: DetectPayload):
  try:
    img = _open_rgb_from_b64(payload.image_base64)
    w, h = img.size

    # Moondream v3 Preview exposes .detect(image, label) -> {"objects":[...]}
    result = model.detect(img, payload.label)
    objs = result.get("objects", [])

    detections: List[Detection] = []
    for o in objs:
      p = _norm_to_pixels(o, w, h)
      detections.append(Detection(
        label=payload.label,
        score=p['score'],
        x=p['x'],
        y=p['y'],
        width=p['width'],
        height=p['height']
      ))

    return JSONResponse(DetectResponse(
      image_size={"width": w, "height": h},
      detections=detections
    ))
  except Exception as e:
    tb = traceback.format_exc()
    print(f"[ERROR] /detect failed: {e}\n{tb}")

    # return JSON error to client
    raise HTTPException(
        status_code=500,
        detail={"error": str(e), "type": e.__class__.__name__}
    )