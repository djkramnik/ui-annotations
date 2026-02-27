import argparse
import json
import os
from pathlib import Path
from typing import Tuple

import timm
import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train an image classifier with timm on SageMaker.")
    parser.add_argument("--model-name", type=str, default="vit_base_patch16_224")
    parser.add_argument("--num-classes", type=int, default=None)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--num-workers", type=int, default=4)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument(
        "--train-dir",
        type=str,
        default=os.environ.get("SM_CHANNEL_TRAINING")
        or os.environ.get("SM_CHANNEL_TRAIN")
        or "/opt/ml/input/data/training",
    )
    parser.add_argument(
        "--val-dir",
        type=str,
        default=os.environ.get("SM_CHANNEL_VALIDATION")
        or os.environ.get("SM_CHANNEL_VAL")
        or "",
    )
    parser.add_argument(
        "--model-dir",
        type=str,
        default=os.environ.get("SM_MODEL_DIR", "/opt/ml/model"),
    )
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def set_seed(seed: int) -> None:
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def resolve_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def build_transforms(image_size: int) -> Tuple[transforms.Compose, transforms.Compose]:
    train_tfms = transforms.Compose(
        [
            transforms.RandomResizedCrop(image_size),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ]
    )
    eval_tfms = transforms.Compose(
        [
            transforms.Resize(int(image_size * 1.14)),
            transforms.CenterCrop(image_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ]
    )
    return train_tfms, eval_tfms


def make_loaders(args: argparse.Namespace) -> Tuple[DataLoader, DataLoader | None, dict]:
    train_tfms, eval_tfms = build_transforms(args.image_size)

    train_ds = datasets.ImageFolder(args.train_dir, transform=train_tfms)
    val_ds = datasets.ImageFolder(args.val_dir, transform=eval_tfms) if args.val_dir else None

    if val_ds and train_ds.class_to_idx != val_ds.class_to_idx:
        raise ValueError("Training and validation class mappings do not match.")

    train_loader = DataLoader(
        train_ds,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=True,
    )
    val_loader = (
        DataLoader(
            val_ds,
            batch_size=args.batch_size,
            shuffle=False,
            num_workers=args.num_workers,
            pin_memory=True,
        )
        if val_ds
        else None
    )

    return train_loader, val_loader, train_ds.class_to_idx


def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float]:
    model.train()
    running_loss = 0.0
    running_correct = 0
    running_total = 0

    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)
        logits = model(images)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * labels.size(0)
        preds = logits.argmax(dim=1)
        running_correct += (preds == labels).sum().item()
        running_total += labels.size(0)

    return running_loss / running_total, running_correct / running_total


@torch.no_grad()
def evaluate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float]:
    model.eval()
    running_loss = 0.0
    running_correct = 0
    running_total = 0

    for images, labels in loader:
        images = images.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)

        logits = model(images)
        loss = criterion(logits, labels)

        running_loss += loss.item() * labels.size(0)
        preds = logits.argmax(dim=1)
        running_correct += (preds == labels).sum().item()
        running_total += labels.size(0)

    return running_loss / running_total, running_correct / running_total


def main() -> None:
    args = parse_args()
    set_seed(args.seed)
    device = resolve_device()

    model_dir = Path(args.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)

    if not Path(args.train_dir).is_dir():
        raise FileNotFoundError(f"Training directory does not exist: {args.train_dir}")
    if args.val_dir and not Path(args.val_dir).is_dir():
        raise FileNotFoundError(f"Validation directory does not exist: {args.val_dir}")

    train_loader, val_loader, class_to_idx = make_loaders(args)
    inferred_classes = len(class_to_idx)
    num_classes = args.num_classes or inferred_classes

    if num_classes != inferred_classes:
        raise ValueError(
            f"num_classes ({num_classes}) does not match training classes ({inferred_classes})."
        )

    model = timm.create_model(args.model_name, pretrained=True, num_classes=num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=args.learning_rate,
        weight_decay=args.weight_decay,
    )

    best_score = float("-inf")
    history = []

    for epoch in range(args.epochs):
        train_loss, train_acc = train_one_epoch(model, train_loader, optimizer, criterion, device)

        if val_loader is not None:
            val_loss, val_acc = evaluate(model, val_loader, criterion, device)
            score = val_acc
        else:
            val_loss, val_acc = float("nan"), float("nan")
            score = train_acc

        epoch_summary = {
            "epoch": epoch + 1,
            "train_loss": train_loss,
            "train_acc": train_acc,
            "val_loss": val_loss,
            "val_acc": val_acc,
        }
        history.append(epoch_summary)
        print(json.dumps(epoch_summary))

        if score > best_score:
            best_score = score
            torch.save(model.state_dict(), model_dir / "model_best.pth")

    torch.save(model.state_dict(), model_dir / "model_last.pth")

    idx_to_class = {idx: cls for cls, idx in class_to_idx.items()}
    with open(model_dir / "classes.json", "w", encoding="utf-8") as f:
        json.dump(idx_to_class, f, indent=2)

    metadata = {
        "model_name": args.model_name,
        "num_classes": num_classes,
        "image_size": args.image_size,
        "best_score": best_score,
        "has_validation": val_loader is not None,
        "history": history,
    }
    with open(model_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved artifacts to {model_dir}")


if __name__ == "__main__":
    main()
