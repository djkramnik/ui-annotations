#!/usr/bin/env python3
"""
visualize.py

Usage:
  python visualize.py path/to/image.b64 [--output annotated.jpg] [--object "person"] [--min-conf 0.0]

Notes:
- Only accepts a *.b64* file. The file may be raw base64 or a data URI.
- Prints the exact request URL, headers (token redacted), and body sent to Moondream.
- Expects response: {"objects":[{"x_min":..,"y_min":..,"x_max":..,"y_max":.., "confidence"?: float}]}
"""

import os, sys, io, base64, json, argparse
from typing import Tuple, List, Optional
import requests
from PIL import Image, ImageDraw, ImageFont

API_URL = "https://api.moondream.ai/v1/detect"

def read_b64_file(path: str) -> Tuple[bytes, str, Image.Image]:
    """Read a .b64 file, decode (handles optional data: prefix), return (jpeg_bytes, mime, PIL.Image)."""
    raw = open(path, "rb").read().decode("utf-8").strip()
    if raw.startswith("data:"):
        prefix, b64 = raw.split(",", 1)
        mime = prefix.split(";")[0].split(":", 1)[1] or "image/jpeg"
    else:
        b64 = raw
        mime = "image/jpeg"
    img_bytes = base64.b64decode(b64)
    pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    # Re-encode to JPEG for consistent drawing/saving
    out = io.BytesIO()
    pil.save(out, format="JPEG", quality=95)
    return out.getvalue(), "image/jpeg", pil

def build_data_uri(mime: str, img_bytes: bytes) -> str:
    return f"data:{mime};base64,{base64.b64encode(img_bytes).decode('utf-8')}"

def norm_to_px(n: float, size: int) -> int:
    return max(0, min(size, int(round(n * size))))

def draw_boxes(pil: Image.Image, boxes_px: List[Tuple[int,int,int,int]], labels: Optional[List[str]]=None) -> Image.Image:
    img = pil.copy().convert("RGBA")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/Library/Fonts/Arial.ttf", 20)
    except Exception:
        font = ImageFont.load_default()

    for i, (x0,y0,x1,y1) in enumerate(boxes_px):
        # red rectangle
        draw.rectangle([x0,y0,x1,y1], outline=(255,0,0,255), width=3)
        # label box
        label = labels[i] if labels and i < len(labels) else ""
        if label:
            text_w, text_h = draw.textbbox((0,0), label, font=font)[2:]
            pad = 6
            bg = Image.new("RGBA", (text_w+2*pad, text_h+2*pad), (0,0,0,128))
            img.alpha_composite(bg, dest=(x0+4, y0+4))
            draw.text((x0+4+pad, y0+4+pad), label, fill=(255,0,0,255), font=font)
    return img.convert("RGB")

def redact_token(tok: str) -> str:
    if not tok: return ""
    return tok[:6] + "…" + tok[-4:] if len(tok) > 12 else "•••redacted•••"

def main():
    p = argparse.ArgumentParser()
    p.add_argument("b64_path", help="Path to base64 file (required).")
    p.add_argument("--output", "-o", default=None, help="Output annotated image path (default: annotated_<basename>.jpg)")
    p.add_argument("--object", "-k", default=None, help="Optional object keyword to include in request body.")
    p.add_argument("--min-conf", type=float, default=0.0, help="Minimum confidence to draw (objects missing confidence are kept).")
    args = p.parse_args()

    token = os.environ.get("MOONDREAM_AUTH_TOKEN")
    if not token:
        print("Error: MOONDREAM_AUTH_TOKEN not set", file=sys.stderr)
        sys.exit(1)

    if not args.b64_path.lower().endswith(".b64"):
        print("Error: only .b64 files are accepted.", file=sys.stderr)
        sys.exit(1)

    # Load image bytes from .b64 file
    try:
        img_bytes, mime, pil = read_b64_file(args.b64_path)
    except Exception as e:
        print(f"Failed to read/decode base64: {e}", file=sys.stderr)
        sys.exit(1)

    data_uri = build_data_uri(mime, img_bytes)

    # Build request
    body = {"image_url": data_uri}
    if args.object:
        body["object"] = args.object

    headers = {
        "Content-Type": "application/json",
        "X-Moondream-Auth": token,
    }

    # Print the outgoing request (token redacted)
    print("=== Moondream Request ===")
    print("URL:", API_URL)
    print("Headers:", json.dumps({**headers, "X-Moondream-Auth": redact_token(token)}, indent=2))
    # Show a shortened body so console doesn't explode with giant base64:
    short_body = dict(body)
    short_body["image_url"] = f"{data_uri[:60]}…{data_uri[-20:]}"
    print("Body (abbrev):", json.dumps(short_body, indent=2))
    print("=========================")

    # Send
    try:
        r = requests.post(API_URL, headers=headers, data=json.dumps(body), timeout=120)
        r.raise_for_status()
    except requests.RequestException as e:
        print(f"HTTP error: {e}", file=sys.stderr)
        if e.response is not None:
            print("Response text:", e.response.text, file=sys.stderr)
        sys.exit(1)

    # Parse response
    try:
        resp = r.json()
    except Exception:
        print("Non-JSON response:", r.text, file=sys.stderr)
        sys.exit(1)

    # Expect {"objects":[{x_min,y_min,x_max,y_max,confidence?}, ...]}
    objs = resp.get("objects") or []
    if not isinstance(objs, list) or not objs:
        print("No objects found in response. Raw JSON:")
        print(json.dumps(resp, indent=2))
        sys.exit(2)

    W, H = pil.size
    boxes_px, labels = [], []
    kept = 0
    for o in objs:
        try:
            x0 = norm_to_px(float(o["x_min"]), W)
            x1 = norm_to_px(float(o["x_max"]), W)
            y0 = norm_to_px(float(o["y_min"]), H)
            y1 = norm_to_px(float(o["y_max"]), H)
            conf = o.get("confidence")
            if conf is not None and float(conf) < args.min_conf:
                continue
            boxes_px.append((x0,y0,x1,y1))
            lbl = ""
            if args.object:
                lbl = args.object
                if conf is not None:
                    lbl += f" ({float(conf):.3f})"
            elif conf is not None:
                lbl = f"{float(conf):.3f}"
            labels.append(lbl)
            kept += 1
        except Exception:
            continue

    if not boxes_px:
        print(f"No objects >= min-conf {args.min_conf}. Full response:")
        print(json.dumps(resp, indent=2))
        sys.exit(0)

    annotated = draw_boxes(pil, boxes_px, labels)
    out_path = args.output or f"annotated_{os.path.basename(os.path.splitext(args.b64_path)[0])}.jpg"
    try:
        annotated.save(out_path, quality=95)
    except Exception as e:
        print(f"Failed to save output: {e}", file=sys.stderr)
        sys.exit(1)

    # Final logs
    print(f"Wrote: {out_path}  (W×H={W}×{H})")
    for i,(x0,y0,x1,y1) in enumerate(boxes_px, 1):
        print(f"[{i}] box px: x0={x0} y0={y0} x1={x1} y1={y1}  label='{labels[i-1]}'")
    print("Response JSON:")
    print(json.dumps(resp, indent=2))

if __name__ == "__main__":
    main()
