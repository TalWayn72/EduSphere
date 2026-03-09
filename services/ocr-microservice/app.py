"""PaddleOCR v4 microservice — Tier 2 OCR for complex layouts.

Port: 8001
Called from NestJS when Tesseract.js confidence < 70%.
"""
import base64
import io
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from paddleocr import PaddleOCR

app = FastAPI(title="EduSphere OCR Service", version="1.0.0")
ocr_engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)


class OcrRequest(BaseModel):
    image_base64: str
    language: str = "en"


class OcrResponse(BaseModel):
    text: str
    confidence: float
    boxes: list[Any]


@app.post("/ocr/extract", response_model=OcrResponse)
async def extract_text(request: OcrRequest) -> OcrResponse:
    try:
        image_bytes = base64.b64decode(request.image_base64)
        image_file = io.BytesIO(image_bytes)
        result = ocr_engine.ocr(image_file, cls=True)

        if not result or not result[0]:
            return OcrResponse(text="", confidence=0.0, boxes=[])

        texts = []
        confidences = []
        boxes = []
        for line in result[0]:
            box, (text, conf) = line
            texts.append(text)
            confidences.append(conf)
            boxes.append(box)

        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        return OcrResponse(
            text="\n".join(texts),
            confidence=avg_confidence,
            boxes=boxes,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "engine": "PaddleOCR v4"}
