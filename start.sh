#!/bin/zsh
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

PYTHON_BIN="/Users/bigstone/My_SideProject/Server_Manager/venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="python3"
fi

# 기존 백엔드(8050) 프로세스 정리 후 재기동
lsof -ti:8050 | xargs kill -9 2>/dev/null || true
nohup "$PYTHON_BIN" -m uvicorn backend.server:app --host 0.0.0.0 --port 8050 > backend.log 2>&1 &

# 프론트엔드(5174) 실행
exec npm run dev -- --port 5174 --host 0.0.0.0
