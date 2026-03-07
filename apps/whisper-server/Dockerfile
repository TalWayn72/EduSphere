# EduSphere Whisper Server
# Multi-stage: cpu-base (always works) + cuda (NVIDIA GPU mode)
# Build for CPU:  docker build --target cpu-base -t edusphere/whisper-server:cpu .
# Build for GPU:  docker build --target cuda -t edusphere/whisper-server:cuda .

# ── Stage: cpu-base ───────────────────────────────────────────────
FROM python:3.11-slim AS cpu-base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (CPU CTranslate2 — no CUDA required)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY config.py main.py ./

# Non-root user (security)
RUN useradd -r -u 1001 -m whisper
USER whisper

ENV PORT=3200 \
    WHISPER_DEVICE=cpu \
    WHISPER_COMPUTE_TYPE=int8 \
    WHISPER_MODEL_SIZE=base \
    WHISPER_CPU_THREADS=4

EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:3200/health || exit 1

CMD ["python", "main.py"]

# ── Stage: cuda (NVIDIA GPU) ──────────────────────────────────────
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04 AS cuda

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install CUDA-enabled CTranslate2 + faster-whisper
RUN pip3 install --no-cache-dir -r requirements.txt

COPY config.py main.py ./

RUN useradd -r -u 1001 -m whisper
USER whisper

ENV PORT=3200 \
    WHISPER_DEVICE=cuda \
    WHISPER_COMPUTE_TYPE=float16 \
    WHISPER_MODEL_SIZE=large-v3

EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -sf http://localhost:3200/health || exit 1

CMD ["python3", "main.py"]
