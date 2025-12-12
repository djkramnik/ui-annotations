FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Install Python and system libraries needed by OpenCV (cv2)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 && \
    rm -rf /var/lib/apt/lists/*

# Make `python` point to python3
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1

WORKDIR /opt/ml/code

# 1. Install CUDA-enabled PyTorch (CUDA 12.1 wheels)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu121

# 2. Install training dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy training code and resources
COPY train.py .
COPY labels.json .
COPY yolo11s.pt .

# 4. Run training
ENTRYPOINT ["python", "-u", "train.py"]
