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

# Start server
echo ""
echo "🚀 Starting server..."
echo "👉 Open http://localhost:3000 in your browser"
echo ""
node server/index.js
