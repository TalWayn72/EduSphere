"""TrOCR handwriting recognition microservice — Tier 3 OCR.

Port: 8002
Called from NestJS when Moondream 2 detects handwriting in an image.
Model: microsoft/trocr-large-handwritten (443MB, MIT license)
"""
import base64
import io

from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

app = FastAPI(title="EduSphere Handwriting OCR", version="1.0.0")

# Lazy-load model on first request to reduce startup time
_processor: TrOCRProcessor | None = None
_model: VisionEncoderDecoderModel | None = None


def get_model() -> tuple[TrOCRProcessor, VisionEncoderDecoderModel]:
    global _processor, _model
    if _processor is None:
        _processor = TrOCRProcessor.from_pretrained("microsoft/trocr-large-handwritten")
        _model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-large-handwritten")
    return _processor, _model


class HandwritingRequest(BaseModel):
    image_base64: str


class HandwritingResponse(BaseModel):
    text: str
    confidence: float


@app.post("/handwriting/extract", response_model=HandwritingResponse)
async def extract_handwriting(request: HandwritingRequest) -> HandwritingResponse:
    try:
        image_bytes = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        processor, model = get_model()
        pixel_values = processor(images=image, return_tensors="pt").pixel_values
        generated_ids = model.generate(pixel_values)
        generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return HandwritingResponse(text=generated_text.strip(), confidence=0.95)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "engine": "TrOCR (microsoft/trocr-large-handwritten)"}
