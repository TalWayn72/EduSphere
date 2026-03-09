FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn==0.32.0 \
    transformers==4.46.0 \
    torch==2.5.0 \
    torchvision==0.20.0 \
    Pillow==11.0.0 \
    python-multipart==0.0.12

COPY app.py .

EXPOSE 8002

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
