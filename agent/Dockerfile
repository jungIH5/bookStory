FROM python:3.11-slim

WORKDIR /app

# pyannote.audio + pydub 의존 시스템 패키지
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# torch CPU 전용 먼저 설치 (GPU 버전 대비 이미지 크기 ~4GB 절감)
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads/voice_samples

EXPOSE 5001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001", "--reload"]
