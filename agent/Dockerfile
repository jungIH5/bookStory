FROM python:3.11-slim

WORKDIR /app

# 녹음 분석(화자 분리) 기능을 끄면서 libsndfile1/ffmpeg(pyannote·pydub용)와
# torch/torchaudio 설치를 제거함 — 이미지 용량 절감이 목적. 코드는 agent/routers/recordings.py,
# agent/graphs/recording_analysis.py, agent/nodes/ 에 그대로 남아있고, main.py에서만 미탑재 상태.
# 다시 켤 때는 아래 두 줄과 requirements.txt의 주석 처리된 4개 패키지를 복원할 것.
# RUN apt-get update && apt-get install -y --no-install-recommends libsndfile1 ffmpeg && rm -rf /var/lib/apt/lists/*
# RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads/voice_samples

EXPOSE 5001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001", "--reload"]
