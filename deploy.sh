#!/bin/bash
echo "Pulling latest code..."
git pull origin main

echo "Rebuilding and starting containers..."
docker compose up -d --build

echo "Deployment complete."
