FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir fastapi==0.115.0 uvicorn==0.32.0 python-multipart==0.0.12

WORKDIR /app
COPY app.py .

EXPOSE 8003

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8003"]
