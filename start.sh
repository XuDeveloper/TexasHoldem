#!/bin/bash
# Texas Hold'em Poker - Quick Start Script

echo "🃏 Texas Hold'em Poker"
echo "======================"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build frontend
echo "🔨 Building frontend..."
npx vite build

# Kill any existing process on port 3000
PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PID" ]; then
  echo "🔄 正在请求关闭旧的服务器进程 (PID: $PID)..."
  kill $PID 2>/dev/null
  
  # Wait until the port is actually free, with a 5s timeout
  WAIT_TIME=0
  while lsof -ti:3000 >/dev/null 2>&1; do
    echo "⏳ 等待旧进程释放端口..."
    sleep 1
    WAIT_TIME=$((WAIT_TIME + 1))
    if [ $WAIT_TIME -ge 5 ]; then
      echo "⚠️ 旧进程未能在 5 秒内关闭，正在强制结束 (kill -9)..."
      kill -9 $PID 2>/dev/null
      sleep 1
      break
    fi
  done
  echo "✅ 端口已释放"
fi

# Start server
echo ""
echo "🚀 Starting server..."
echo "👉 Open http://localhost:3000 in your browser"
echo ""
node server/index.js
