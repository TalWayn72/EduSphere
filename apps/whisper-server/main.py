"""
EduSphere Whisper Server — Hardware-adaptive speech transcription HTTP service.
Compatible with apps/transcription-worker/src/transcription/whisper.client.ts

API contract (from whisper.client.ts):
  POST /asr
    multipart/form-data:
      audio_file  — audio blob (field name must be "audio_file")
      language    — BCP-47 language code, e.g. "en"
      output      — "json" (ignored; always returns JSON)
    Response JSON:
      { text: string, language?: string, segments?: Array<{ start, end, text }> }
      Note: client assigns its own segment ids — server does NOT need to include id.

  GET /health
    Response: { status, device, compute_type, model_size, cuda_available }
"""
import logging
import os
import sys
import tempfile
from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from config import detect_hardware, load_model

logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "name": "%(name)s", "message": "%(message)s"}',
    stream=sys.stdout,
)
logger = logging.getLogger("whisper-server")

# Global model state
_model = None
_hw_config: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model, _hw_config
    logger.info("Starting whisper-server — detecting hardware...")
    _hw_config = detect_hardware()
    logger.info("Loading WhisperModel: %s", _hw_config)
    _model = load_model(_hw_config)
    logger.info("WhisperModel ready")
    yield
    logger.info("Shutting down whisper-server")
    _model = None


app = FastAPI(title="EduSphere Whisper Server", lifespan=lifespan)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "device": _hw_config.get("device", "unknown"),
        "compute_type": _hw_config.get("compute_type", "unknown"),
        "model_size": _hw_config.get("model_size", "unknown"),
        "cuda_available": _hw_config.get("device") == "cuda",
    }


@app.post("/asr")
async def transcribe(
    audio_file: UploadFile = File(...),
    language: str = Form(default="en"),
    output: str = Form(default="json"),  # accepted for compat, always returns JSON
):
    """
    Transcribe audio file.

    whisper.client.ts sends multipart/form-data with fields:
      audio_file  — the audio blob
      language    — language code
      output      — "json" (always)

    Response shape matches what whisper.client.ts destructures:
      { text, language, segments: [{ start, end, text }] }
    Client assigns its own segment ids so we omit id from segments.
    """
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    suffix = os.path.splitext(audio_file.filename or "audio.wav")[1] or ".wav"
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            content = await audio_file.read()
            tmp.write(content)
            tmp_path = tmp.name

        segments_gen, info = _model.transcribe(
            tmp_path,
            language=language if language else None,
            beam_size=5,
        )

        segments = []
        full_text_parts = []
        for seg in segments_gen:
            segments.append({
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text.strip(),
            })
            full_text_parts.append(seg.text.strip())

        return JSONResponse({
            "text": " ".join(full_text_parts),
            "segments": segments,
            "language": info.language,
        })

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Transcription failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if tmp_path is not None:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


if __name__ == "__main__":
    port = int(os.getenv("PORT", "3200"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
