#!/bin/bash
# EduSphere GPU Detection Script
# Detects available GPU hardware and exports optimal AI service configuration.
# Writes results to /tmp/gpu-env.sh — sourced by supervisord programs before starting.
# Called at container startup with priority 5 (before Ollama at priority 60).

set -euo pipefail

GPU_AVAILABLE=false
GPU_VENDOR=none
GPU_VRAM_MB=0
OLLAMA_NUM_GPU=0
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_MODEL_SIZE=base
WHISPER_CPU_THREADS=$(nproc 2>/dev/null || echo 4)

log() { echo "[gpu-detect] $*" >&2; }

# 1. Check NVIDIA GPU (CUDA)
if command -v nvidia-smi &>/dev/null && nvidia-smi &>/dev/null 2>&1; then
  VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d ' ' || echo 0)
  GPU_AVAILABLE=true
  GPU_VENDOR=nvidia
  GPU_VRAM_MB=${VRAM:-0}
  OLLAMA_NUM_GPU=
  WHISPER_DEVICE=cuda
  WHISPER_COMPUTE_TYPE=float16
  WHISPER_MODEL_SIZE=large-v3
  log "Detected NVIDIA GPU: ${GPU_VRAM_MB}MB VRAM — using CUDA mode"

# 2. Check AMD GPU (ROCm)
elif command -v rocm-smi &>/dev/null && rocm-smi &>/dev/null 2>&1; then
  GPU_AVAILABLE=true
  GPU_VENDOR=amd
  GPU_VRAM_MB=0
  OLLAMA_NUM_GPU=
  WHISPER_DEVICE=cuda
  WHISPER_COMPUTE_TYPE=float16
  WHISPER_MODEL_SIZE=large-v3
  log "Detected AMD GPU (ROCm) — using CUDA-compat mode"

# 3. CPU fallback (Intel integrated, no discrete GPU)
else
  log "No discrete GPU detected — using CPU mode (device=cpu, compute_type=int8, model=base)"
fi

# Write to file for sourcing by other supervisord programs
cat > /tmp/gpu-env.sh <<EOF
export GPU_AVAILABLE=${GPU_AVAILABLE}
export GPU_VENDOR=${GPU_VENDOR}
export GPU_VRAM_MB=${GPU_VRAM_MB}
export WHISPER_DEVICE=${WHISPER_DEVICE}
export WHISPER_COMPUTE_TYPE=${WHISPER_COMPUTE_TYPE}
export WHISPER_MODEL_SIZE=${WHISPER_MODEL_SIZE}
export WHISPER_CPU_THREADS=${WHISPER_CPU_THREADS}
EOF

# OLLAMA_NUM_GPU: only export if set (empty = Ollama auto-detects GPU layers)
if [ -n "${OLLAMA_NUM_GPU+x}" ] && [ "${OLLAMA_NUM_GPU}" != "" ]; then
  echo "export OLLAMA_NUM_GPU=${OLLAMA_NUM_GPU}" >> /tmp/gpu-env.sh
fi

log "GPU detection complete: GPU_AVAILABLE=${GPU_AVAILABLE} VENDOR=${GPU_VENDOR} WHISPER_DEVICE=${WHISPER_DEVICE}"
