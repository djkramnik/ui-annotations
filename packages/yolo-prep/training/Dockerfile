# training/Dockerfile

FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# System deps
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1

# SageMaker working directory
WORKDIR /opt/ml/code

# Copy ONLY the required files — no .dockerignore needed
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY train.py .
COPY labels.json .

# Let the Python output stream immediately
ENV PYTHONUNBUFFERED=1

# Default command SageMaker will run
ENTRYPOINT ["python", "train.py"]
