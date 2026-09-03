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

# root로 실행하지 않는다 — 컨테이너가 뚫려도 피해 범위를 줄이기 위한 배포 기본기.
RUN useradd --create-home --shell /bin/bash appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5001

# --reload는 로컬 개발 전용(파일 변경 시 자동 재시작)이라 항상 켜두면 안 된다 — 로컬 docker-compose.yml이
# UVICORN_EXTRA_ARGS=--reload를 넘겨줄 때만 켜지고, 프로덕션(Render 등)에서는 이 값이 안 넘어오므로
# --reload 없이 뜬다. $PORT는 Render가 배포 시 주입하는 포트 — 로컬에선 안 넘어오니 5001로 대체한다.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-5001} $UVICORN_EXTRA_ARGS
