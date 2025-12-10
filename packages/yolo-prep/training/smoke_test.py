import argparse
from pathlib import Path

from ultralytics import YOLO
from PIL import Image
import numpy as np


def run_smoke_test(model_path: str, image_path: str, output_path: str | None, device: str | None):
    model_path = Path(model_path)
    image_path = Path(image_path)

    if output_path is None:
        out = image_path.with_name(image_path.stem + "_yolo.png")
    else:
        out = Path(output_path)

    print(f"Loading model from: {model_path}")
    model = YOLO(str(model_path))

    print(f"Running inference on: {image_path}")
    results = model(
        source=str(image_path),
        imgsz=640,
        conf=0.25,
        device=device,  # None -> auto (cuda / mps / cpu)
        verbose=False,
    )

    # Ultralytics returns a list of results; we only passed one image
    res = results[0]

    # res.plot() returns a BGR numpy array with boxes & labels drawn
    annotated_bgr = res.plot()
    annotated_rgb = annotated_bgr[..., ::-1]  # convert BGR -> RGB

    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(annotated_rgb).save(out)

    print(f"Saved annotated image to: {out}")
    print("Detected objects:")
    for box in res.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        label = res.names[cls_id]
        print(f"  - {label} ({conf:.2f})")


def main():
    parser = argparse.ArgumentParser(description="YOLO smoke test: run best.pt on a single image.")
    parser.add_argument("--model", default="model/best.pt", help="Path to YOLO model weights (e.g. best.pt)")
    parser.add_argument("--image", required=True, help="Path to input image")
    parser.add_argument("--out", help="Path to output annotated image (optional)")
    parser.add_argument("--device", help='Device: "cpu", "mps", "0", etc. Default: auto-select')

    args = parser.parse_args()
    run_smoke_test(args.model, args.image, args.out, args.device)


if __name__ == "__main__":
    main()
