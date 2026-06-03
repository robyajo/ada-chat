#!/bin/bash

# finish.sh - Frontend Production Build
# Usage: ./finish.sh

set -e

echo "=== ADA CHAT — Frontend Production Build ==="

echo "[1/4] Pulling latest changes..."
git pull

echo "[2/4] Installing dependencies..."
npm ci

echo "[3/4] Building..."
npm run build

echo "[4/4] Restarting PM2 API..."
pm2 restart ada-chat-api

echo "=== Done ==="