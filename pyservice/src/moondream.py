import base64
from io import BytesIO
from typing import List, Optional, Literal

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

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    trust_remote_code=True,
    torch_dtype=dtype,
    device_map=device,
    token=token
)

print(type(model))