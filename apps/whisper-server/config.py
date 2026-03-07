"""
Hardware-adaptive WhisperModel configuration.
Uses ctranslate2.get_cuda_device_count() — the same backend as faster-whisper —
for reliable GPU detection without requiring PyTorch.
"""
import logging
import os

logger = logging.getLogger(__name__)


def detect_hardware() -> dict:
    """
    Detect available compute hardware and return optimal WhisperModel settings.

    Priority:
    1. Respect explicit env vars (WHISPER_DEVICE != "auto")
    2. Auto-detect via ctranslate2 CUDA device count
    3. Fall back to CPU/int8

    Note: device="auto" is NOT a valid faster-whisper value — must be cpu or cuda.
    """
    device = os.getenv("WHISPER_DEVICE", "auto")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "auto")
    model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
    cpu_threads = int(os.getenv("WHISPER_CPU_THREADS", "4"))

    if device == "auto":
        try:
            import ctranslate2  # noqa: PLC0415
            cuda_count = ctranslate2.get_cuda_device_count()
        except Exception:
            cuda_count = 0

        if cuda_count > 0:
            device = "cuda"
            compute_type = "float16" if compute_type == "auto" else compute_type
            model_size = os.getenv("WHISPER_MODEL_SIZE", "large-v3")
            logger.info("Auto-detected %d CUDA device(s) — using GPU mode", cuda_count)
        else:
            device = "cpu"
            compute_type = "int8" if compute_type == "auto" else compute_type
            model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
            logger.info("No CUDA devices detected — using CPU mode")

    cfg = {
        "device": device,
        "compute_type": compute_type,
        "model_size": model_size,
        "cpu_threads": cpu_threads,
    }
    logger.info(
        "Whisper config: device=%s compute_type=%s model_size=%s cpu_threads=%d",
        cfg["device"], cfg["compute_type"], cfg["model_size"], cfg["cpu_threads"],
    )
    return cfg


def load_model(cfg: dict):
    """Load WhisperModel with the given hardware config."""
    from faster_whisper import WhisperModel  # noqa: PLC0415

    return WhisperModel(
        cfg["model_size"],
        device=cfg["device"],
        compute_type=cfg["compute_type"],
        cpu_threads=cfg.get("cpu_threads", 4),
        num_workers=1,
    )
