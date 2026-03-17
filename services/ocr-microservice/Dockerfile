# Pinned 2026-03-17 — was python:3.11-slim
FROM python:3.11.12-slim-bookworm

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn==0.32.0 \
    paddleocr==2.8.1 \
    paddlepaddle==2.6.1 \
    python-multipart==0.0.12

COPY app.py .

EXPOSE 8001

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
