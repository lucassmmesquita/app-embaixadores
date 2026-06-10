#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Build PWA and deploy to backend/src/webapp
#  Usage: ./scripts/build-webapp.sh
# ═══════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
APP_DIR="$ROOT_DIR/app"
BACKEND_DIR="$ROOT_DIR/backend"
WEBAPP_DIR="$BACKEND_DIR/src/webapp"

echo "🔨 Building PWA with baseUrl=/app ..."
cd "$APP_DIR"

# Temporarily set baseUrl for production build
node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('app.json','utf8'));
cfg.expo.experiments.baseUrl = '/app';
fs.writeFileSync('app.json', JSON.stringify(cfg, null, 2) + '\n');
"

npx expo export --platform web 2>&1 | tail -10

# Restore app.json (remove baseUrl)
node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('app.json','utf8'));
delete cfg.expo.experiments.baseUrl;
fs.writeFileSync('app.json', JSON.stringify(cfg, null, 2) + '\n');
"

echo ""
echo "📦 Copying to backend..."
rm -rf "$WEBAPP_DIR"
cp -r "$APP_DIR/dist" "$WEBAPP_DIR"

echo "✅ PWA deployed to backend/src/webapp"
echo "   Files: $(find "$WEBAPP_DIR" -type f | wc -l | tr -d ' ')"
echo "   Size:  $(du -sh "$WEBAPP_DIR" | cut -f1)"
echo ""
echo "🚀 Deploy the backend to make it live!"
