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
  echo "🔄 正在关闭旧的服务器进程 (PID: $PID)..."
  kill $PID 2>/dev/null
  sleep 1
fi

# Start server
echo ""
echo "🚀 Starting server..."
echo "👉 Open http://localhost:3000 in your browser"
echo ""
node server/index.js
