#!/bin/zsh
set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

PYTHON_BIN="/Users/bigstone/My_SideProject/Server_Manager/venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="python3"
fi

# 의존성 미설치 시 자동 설치 가드 (맥미니 최초 배포 대응)
if [ ! -d "node_modules" ]; then
  echo "[MyTripLog] node_modules 미발견 -> npm install 자동 실행 중..."
  npm install
fi

# 기존 백엔드(8050) 프로세스 정리 후 재기동 (표준 출력/에러 통합)
lsof -ti:8050 | xargs kill -9 2>/dev/null || true
nohup "$PYTHON_BIN" -u -m uvicorn backend.server:app --host 0.0.0.0 --port 8050 2>&1 &

# 프론트엔드(5174) 실행
exec npm run dev -- --port 5174 --host 0.0.0.0
