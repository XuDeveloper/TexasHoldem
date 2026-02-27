#!/bin/bash
# Texas Hold'em Poker - Quick Start Script

echo "🃏 Texas Hold'em Poker"
echo "======================"

# Check and install Node.js via NVM if missing
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "⚠️ 未检测到 Node.js 或 npm，正在尝试自动为您安装..."
    
    # Determine NVM directory
    export NVM_DIR="$HOME/.nvm"
    
    # Install NVM if it doesn't exist
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
        echo "⬇️ 正在安装 NVM (Node Version Manager)..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
    
    # Load NVM into current session
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    if ! command -v nvm &> /dev/null; then
        echo "❌ NVM 安装失败，无法自动安装 Node.js。请访问 https://nodejs.org/ 下载安装。"
        exit 1
    fi
    
    # Install Node.js v20 (LTS)
    echo "⬇️ 正在使用 NVM 安装 Node.js (v20)..."
    nvm install 20
    nvm use 20
    
    # Verify installation
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 自动安装失败。请自主访问 https://nodejs.org/ 下载安装。"
        exit 1
    fi
    echo "✅ Node.js 环境自动配置成功！(如需在其他终端使用，请重启终端)"
fi

# Print versions
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "📦 环境检查: Node $NODE_VERSION, npm v$NPM_VERSION"

# Always ensure dependencies are up to date
echo "🔄 检查并安装依赖..."
npm install --no-fund --no-audit

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
