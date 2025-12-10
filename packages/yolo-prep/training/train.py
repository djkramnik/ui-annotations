import json
import os
import shutil
from pathlib import Path
from urllib.parse import urlparse

import boto3
import yaml
from ultralytics import YOLO

# ------------------------ S3 helpers ------------------------ #
def parse_s3_uri(s3_uri: str):
    """
    Parse s3://bucket/prefix style URIs into (bucket, prefix).
    """
    if not s3_uri.startswith("s3://"):
        raise ValueError(f"DATASET_S3_URI must start with s3://, got: {s3_uri}")
    parsed = urlparse(s3_uri)
    bucket = parsed.netloc
    prefix = parsed.path.lstrip("/")  # may be empty
    return bucket, prefix


def download_s3_prefix_to_dir(s3_uri: str, local_dir: Path):
    """
    Download all objects under an S3 prefix into a local directory, preserving
    relative paths.
    """
    bucket, prefix = parse_s3_uri(s3_uri)
    s3 = boto3.client("s3")

    local_dir.mkdir(parents=True, exist_ok=True)

    paginator = s3.get_paginator("list_objects_v2")
    print(f"Listing objects under s3://{bucket}/{prefix}")
    found_any = False

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        contents = page.get("Contents", [])
        if not contents:
            continue

        for obj in contents:
            found_any = True
            key = obj["Key"]

            # Remove the prefix from the key to get a relative path
            rel = key[len(prefix):].lstrip("/") if prefix else key
            if not rel:
                # Sometimes the prefix itself is a folder marker
                continue

            dest_path = local_dir / rel
            dest_path.parent.mkdir(parents=True, exist_ok=True)

            print(f"Downloading s3://{bucket}/{key} -> {dest_path}")
            s3.download_file(bucket, key, str(dest_path))

    if not found_any:
        raise RuntimeError(f"No objects found under s3://{bucket}/{prefix}")


# ------------------------ data.yaml generation ------------------------ #

def write_data_yaml(dataset_dir: Path, class_names: list[str]) -> Path:
    """
    Generate data.yaml for YOLO with absolute train/val paths.

    Expects:
      dataset_dir/
        images/train/
        images/val/
        labels/train/
        labels/val/
    """
    dataset_dir = dataset_dir.resolve()

    train_dir = (dataset_dir / "images" / "train").resolve()
    val_dir   = (dataset_dir / "images" / "val").resolve()

    data = {
        # Absolute paths so we don't care about CWD
        "train": str(train_dir),
        "val": str(val_dir),
        "names": class_names,
    }

    yaml_path = dataset_dir / "data.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(data, f, sort_keys=False)

    print(f"Generated YOLO data.yaml at {yaml_path}")
    return yaml_path

def load_class_names(labels_json_path: str) -> list[str]:
    """
    Load class names from a JSON file containing a string array.
    Example JSON: ["textRegion", "heading", "diagram"]
    """
    if not labels_json_path:
        raise ValueError("LABELS_JSON_PATH is required but not set")

    path = Path(labels_json_path)
    if not path.is_file():
        raise FileNotFoundError(f"LABELS_JSON_PATH does not exist: {path}")

    with open(path, "r") as f:
        data = json.load(f)

    if not isinstance(data, list) or not all(isinstance(x, str) for x in data):
        raise ValueError(
            f"Expected LABELS_JSON_PATH to contain a JSON array of strings, got: {data!r}"
        )

    print(f"Loaded {len(data)} class names from {path}")
    return data


# ------------------------ main training entrypoint ------------------------ #

def main():
    # --- Config via environment variables ------------------------ #
    # Dataset location:
    #   If DATASET_S3_URI is set, we download from S3 to DATASET_DIR.
    #   Otherwise, we assume DATASET_DIR already contains the YOLO structure.
    dataset_s3_uri = os.environ.get("DATASET_S3_URI")
    dataset_dir = Path(os.environ.get("DATASET_DIR", "./dataset"))

    # Mandatory JSON file containing ["label1", "label2", ...]
    labels_json_path = os.environ.get("LABELS_JSON_PATH")
    class_names = load_class_names(labels_json_path)

    # YOLO base model (e.g., yolo11n.pt, yolo11m.pt, etc.)
    base_model = os.environ.get("BASE_MODEL", "yolo11n.pt")

    # Training hyperparams
    epochs = int(os.environ.get("EPOCHS", "50"))
    imgsz = int(os.environ.get("IMG_SIZE", "640"))

    # Device: None -> let Ultralytics auto-select (CUDA / MPS / CPU)
    device = os.environ.get("DEVICE")  # e.g. "0", "cpu", "mps"
    print("device", device)
    # Model output directory:
    #   - On SageMaker, SM_MODEL_DIR is the canonical place.
    #   - Locally, default to ./model
    model_dir = Path(
        os.environ.get("MODEL_DIR")
        or os.environ.get("SM_MODEL_DIR", "./model")
    )
    model_dir.mkdir(parents=True, exist_ok=True)

    # --- Download / prepare dataset ------------------------------ #

    if dataset_s3_uri:
        print(f"DATASET_S3_URI set, downloading to {dataset_dir}...")
        download_s3_prefix_to_dir(dataset_s3_uri, dataset_dir)
    else:
        print(
            f"No DATASET_S3_URI set, assuming dataset already exists at {dataset_dir}"
        )

    # At this point we expect:
    #   dataset_dir/images/train
    #   dataset_dir/images/val
    #   dataset_dir/labels/train
    #   dataset_dir/labels/val

    images_train = dataset_dir / "images" / "train"
    labels_train = dataset_dir / "labels" / "train"
    if not images_train.is_dir() or not labels_train.is_dir():
        raise RuntimeError(
            f"Expected YOLO structure under {dataset_dir}, "
            f"but missing images/train or labels/train"
        )

    # Generate data.yaml from the class names JSON
    data_yaml_path = write_data_yaml(dataset_dir, class_names)

    # --- Train YOLO model ---------------------------------------- #

    print(f"Loading base model: {base_model}")
    model = YOLO(base_model)

    print(
        f"Starting training: data={data_yaml_path}, "
        f"epochs={epochs}, imgsz={imgsz}, device={device or 'auto'}"
    )

    train_results = model.train(
        data=str(data_yaml_path),
        epochs=epochs,
        imgsz=imgsz,
        device=device,  # None -> auto-select
    )

    # --- Locate best weights and copy to model_dir --------------- #

    # Ultralytics saves checkpoints in <save_dir>/weights/best.pt
    save_dir = Path(getattr(train_results, "save_dir", "."))

    best_weights = save_dir / "weights" / "best.pt"
    if best_weights.is_file():
        dest = model_dir / "best.pt"
        shutil.copy2(best_weights, dest)
        print(f"Copied best model to: {dest}")
    else:
        print(
            f"WARNING: best.pt not found at {best_weights}. "
            f"Check Ultralytics run directory: {save_dir}"
        )

    print("Training complete.")


if __name__ == "__main__":
    main()
