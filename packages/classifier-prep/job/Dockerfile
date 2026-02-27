FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1

WORKDIR /opt/ml/code

# Install CUDA-enabled PyTorch wheels compatible with CUDA 12.1 base image.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
      torch \
      torchvision \
      --index-url https://download.pytorch.org/whl/cu121

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY train.py .

ENTRYPOINT ["python", "-u", "train.py"]
