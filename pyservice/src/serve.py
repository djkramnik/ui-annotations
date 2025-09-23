import io, os, json
from typing import List, Optional, Tuple, Dict, Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import torch
from detectron2.config import get_cfg
from detectron2.engine import DefaultPredictor
from detectron2.data import MetadataCatalog

import base64
from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse
from ultralytics import YOLO

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------- config ----------
MODEL_WEIGHTS = os.environ.get("MODEL_WEIGHTS", os.path.join(SCRIPT_DIR, "model_final.pth"))
CFG_PATH      = os.environ.get("CFG_PATH", os.path.join(SCRIPT_DIR, "config.yaml"))
META_PATH     = os.environ.get("META_PATH", os.path.join(SCRIPT_DIR,"metadata.json"))
DEVICE        = os.environ.get("DEVICE")  # "cpu" | "mps" | "cuda" (if present)
SCORE_THRESH  = float(os.environ.get("SCORE_THRESH", "0.5"))

# ---------- load metadata (class names) ----------
thing_classes: List[str] = []
if os.path.exists(META_PATH):
    with open(META_PATH, "r") as f:
        meta = json.load(f)
        # minimal schema: {"thing_classes": ["button", "heading", ...]}
        thing_classes = meta.get("thing_classes", [])
else:
    print(f"[warn] {META_PATH} not found; class_names will be omitted")

# ---------- build cfg & predictor ----------
cfg = get_cfg()
cfg.merge_from_file(CFG_PATH)
cfg.MODEL.WEIGHTS = MODEL_WEIGHTS

# choose device
if DEVICE:
    cfg.MODEL.DEVICE = DEVICE
else:
    # prefer mps on Apple Silicon if available; else CPU
    cfg.MODEL.DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"

# runtime thresholds
cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = SCORE_THRESH

# instantiate predictor
predictor = DefaultPredictor(cfg)

# attach metadata (optional; only used for friendly class names)
if thing_classes:
    # Use a fixed name so later code can look it up if needed
    ds_name = "inference_dataset"
    try:
        MetadataCatalog.get(ds_name).thing_classes = thing_classes
    except Exception:
        pass

app = FastAPI(title="UI Inference Server")

# CORS (handy if calling from your browser extension)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # change to your domain(s) for production
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

def _draw_detections(
    pil_img: Image.Image,
    boxes: list,
    scores: list,
    classes: list,
    names: list,
    min_score: float = 0.0,
    line_w: int = 3,
) -> Image.Image:
    img = pil_img.copy()
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None

    for (x1, y1, x2, y2), s, c in zip(boxes, scores, classes):
        if s < min_score:
            continue
        label = str(c)
        if names and 0 <= c < len(names):
            label = f"{names[c]} {s:.2f}"
        else:
            label = f"{label} {s:.2f}"

        # box
        draw.rectangle([x1, y1, x2, y2], outline=(0, 255, 0), width=line_w)

        # text bg
        tw, th = draw.textbbox((0, 0), label, font=font)[2:]
        bx, by = int(x1), int(max(0, y1 - th - 4))
        draw.rectangle([bx, by, bx + tw + 6, by + th + 4], fill=(0, 0, 0))
        draw.text((bx + 3, by + 2), label, fill=(255, 255, 255), font=font)

    return img

@app.get("/health")
def health():
    dev = cfg.MODEL.DEVICE
    return {"status": "ok", "device": dev, "score_thresh": SCORE_THRESH}


@app.get("/labels")
def labels():
    return {"thing_classes": thing_classes}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        img_bytes = await file.read()
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        # Detectron2 expects BGR ndarray (OpenCV convention)
        img = np.array(image)[:, :, ::-1]
    except Exception as e:
        raise HTTPException(400, f"Invalid image: {e}")

    with torch.no_grad():
        outputs = predictor(img)

    instances = outputs.get("instances", None)
    if instances is None or len(instances) == 0:
        return JSONResponse(
            {
                "boxes": [],
                "scores": [],
                "classes": [],
                "class_names": [],
                "width": image.width,
                "height": image.height,
            }
        )

    inst_cpu = instances.to("cpu")
    boxes  = inst_cpu.pred_boxes.tensor.numpy().tolist() if inst_cpu.has("pred_boxes") else []
    scores = inst_cpu.scores.numpy().tolist() if inst_cpu.has("scores") else []
    clses  = inst_cpu.pred_classes.numpy().tolist() if inst_cpu.has("pred_classes") else []
    names  = [thing_classes[i] if 0 <= i < len(thing_classes) else str(i) for i in clses] if thing_classes else []

    return JSONResponse(
        {
            "boxes": boxes,         # [x1, y1, x2, y2]
            "scores": scores,       # confidence
            "classes": clses,       # integer ids
            "class_names": names,   # optional strings
            "width": image.width,
            "height": image.height,
        }
    )

class ImagePayload(BaseModel):
  image_base64: str

class YoloPayload(ImagePayload):
    conf: float = Field(0.25, ge=0.0, le=1.0)
    iou:  float = Field(0.45, ge=0.0, le=1.0)
    imgsz: int   = Field(640,  ge=64,  le=4096)

@app.post("/predict_base64")
async def predict_base64(payload: ImagePayload):
    print("received predict request")
    try:
        # decode base64 to bytes
        img_bytes = base64.b64decode(payload.image_base64)
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img = np.array(image)[:, :, ::-1]  # BGR
    except Exception as e:
        raise HTTPException(400, f"Invalid base64 image: {e}")

    with torch.no_grad():
        outputs = predictor(img)

    instances = outputs.get("instances", None)
    if instances is None or len(instances) == 0:
        return JSONResponse(
            {
                "boxes": [],
                "scores": [],
                "classes": [],
                "class_names": [],
                "width": image.width,
                "height": image.height,
            }
        )

    inst_cpu = instances.to("cpu")
    boxes  = inst_cpu.pred_boxes.tensor.numpy().tolist() if inst_cpu.has("pred_boxes") else []
    scores = inst_cpu.scores.numpy().tolist() if inst_cpu.has("scores") else []
    clses  = inst_cpu.pred_classes.numpy().tolist() if inst_cpu.has("pred_classes") else []
    names  = [thing_classes[i] if 0 <= i < len(thing_classes) else str(i) for i in clses] if thing_classes else []

    return JSONResponse(
        {
            "boxes": boxes,
            "scores": scores,
            "classes": clses,
            "class_names": names,
            "width": image.width,
            "height": image.height,
        }
    )

@app.post("/visualize_base64")
async def visualize_base64(payload: ImagePayload, min_score: float = SCORE_THRESH, line_w: int = 3):
    # decode base64 & run inference
    try:
        img_bytes = base64.b64decode(payload.image_base64)
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(400, f"Invalid base64 image: {e}")
    img = np.array(image)[:, :, ::-1]  # BGR
    with torch.no_grad():
        outputs = predictor(img)

    instances = outputs.get("instances", None)
    if instances is None or len(instances) == 0:
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")

    inst = instances.to("cpu")
    boxes  = inst.pred_boxes.tensor.numpy().tolist() if inst.has("pred_boxes") else []
    scores = inst.scores.numpy().tolist() if inst.has("scores") else []
    clses  = inst.pred_classes.numpy().tolist() if inst.has("pred_classes") else []
    names  = thing_classes if thing_classes else []

    out_img = _draw_detections(image, boxes, scores, clses, names, min_score=min_score, line_w=line_w)
    buf = io.BytesIO()
    out_img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")



#--------- yolo setup -------------

YOLO_MODEL_PATH = os.path.join(SCRIPT_DIR, "textregion.pt")
YOLO_CONF = 0.25
YOLO_IOU = 0.45
YOLO_IMGSZ = 640
yolo_model = None
names = {}

def _device():
  return "mps" if torch.backends.mps.is_available() else "cpu"

def setup_yolo():
    global model, names
    model = YOLO(YOLO_MODEL_PATH)
    mn = getattr(model, "names", None)
    names = mn
    print("yolo model names", mn)
    dummy = np.zeros((640, 640, 3), dtype=np.uint8)
    model.predict(source=dummy, imgsz=640, conf=0.25, iou=0.45,
      device=_device(), verbose=False)

setup_yolo()
#--------- end yolo setup -------------

@app.post('/predict_textregions')
async def predict_textregions(payload: YoloPayload) -> Dict[str, Any]:
  global model, names
  if model is None:
    setup_yolo()

  conf = float(payload.conf)
  iou = float(payload.iou)
  imgsz = int(payload.imgsz)

  if (not 0.0 <= conf <= 1.0 and 0.0 <= iou <= 1.0):
    raise HTTPException(status_code=400, detail="bad conf or iou (0. - 1.)")

  image_b64 = payload.image_base64
  img_bytes = base64.b64decode(image_b64, validate=True)
  img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

  width, height = img.size

  results = model.predict(
    source=img,
    imgsz=imgsz,
    conf=conf,
    iou=iou,
    device=_device(),
    verbose=False
  )
  r = results[0]
  detections: List[Dict[str, Any]] = []
  if getattr(r, "boxes", None) is None:
    return { "width": width, "height": height, "detections": detections }

  # [[x1,y1,x2,y2]]
  xyxy = r.boxes.xyxy.cpu().tolist()
  confs = r.boxes.conf.cpu().tolist()
  classes = [int(x) for x in r.boxes.cls.cpu().tolist()]

  for (x1,y1,x2,y2), conf, cls in zip(xyxy, confs, classes):
    label = names[cls]
    detections.append({
      "box": [float(x1), float(y1), float(x2), float(y2)],
      "conf": float(conf),
      "label": label
    })
  return { "width": width, "height": height, "detections": detections }

#------ big file stew: PaddleOCR ----------

from paddleocr import TextRecognition
_rec = TextRecognition(
    model_name="latin_PP-OCRv5_mobile_rec"  # or "PP-OCRv5_server_rec"
)

class OCRReq(BaseModel):
    image_b64: str  # raw base64, no 'data:image/...;base64,' prefix

def _b64_to_np_rgb(b64: str) -> np.ndarray:
    try:
        raw = base64.b64decode(b64, validate=True)
    except Exception:
        try:
            raw = base64.b64decode(b64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decode error: {e}")
    return np.array(img)

@app.post('/ocr')
def ocr_endpoint(payload: OCRReq):
    img_np = _b64_to_np_rgb(payload.image_b64)

    try:
        # TextRecognition supports numpy ndarrays as input and returns a list of results
        out = _rec.predict(input=img_np, batch_size=1)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR error: {e}")

    if not out:
        return {"text": "", "score": 0.0}

    print('ocr out:', out)
    # Each item has a `.res` dict: {'rec_text', 'rec_score', ...}

    text = out[0].get("rec_text", "")
    score = float(out[0].get("rec_score", 0.0))
    return {"text": text, "score": score}

#---------- end big file stew: PaddleOCR --------