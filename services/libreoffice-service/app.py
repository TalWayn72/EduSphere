"""LibreOffice headless PPTX/DOCX → PDF conversion microservice.

Port: 8003
Converts PPTX, DOCX, ODP, ODS to PDF via LibreOffice headless mode.
"""
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

app = FastAPI(title="EduSphere LibreOffice Converter", version="1.0.0")


@app.post("/convert")
async def convert_to_pdf(file: UploadFile = File(...)) -> FileResponse:
    """Convert PPTX/DOCX/ODP/ODS to PDF."""
    with tempfile.TemporaryDirectory() as tmpdir:
        input_path = Path(tmpdir) / (file.filename or "document")
        input_path.write_bytes(await file.read())

        result = subprocess.run(
            ["libreoffice", "--headless", "--convert-to", "pdf",
             "--outdir", tmpdir, str(input_path)],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Conversion failed: {result.stderr}")

        pdf_path = input_path.with_suffix(".pdf")
        if not pdf_path.exists():
            raise HTTPException(status_code=500, detail="PDF output not found")

        return FileResponse(str(pdf_path), media_type="application/pdf")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "engine": "LibreOffice headless"}
