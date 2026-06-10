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
BASE_URL="/app"

echo "🔨 Building PWA with baseUrl=$BASE_URL ..."
cd "$APP_DIR"

# Temporarily set baseUrl for production build
node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('app.json','utf8'));
cfg.expo.experiments.baseUrl = '$BASE_URL';
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

echo "🔧 Fixing paths for baseUrl=$BASE_URL ..."

# Fix manifest.json: update start_url and icon paths
node -e "
const fs = require('fs');
const p = '$WEBAPP_DIR/manifest.json';
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
m.start_url = '$BASE_URL/';
m.scope = '$BASE_URL/';
m.icons = m.icons.map(i => ({ ...i, src: '$BASE_URL' + i.src }));
fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
console.log('  ✓ manifest.json');
"

# Fix index.html: update icon, manifest, and sw paths
sed -i '' \
  -e 's|href="/icon-|href="/app/icon-|g' \
  -e 's|src="/icon-|src="/app/icon-|g' \
  -e 's|href="/manifest.json"|href="/app/manifest.json"|g' \
  -e "s|register('/sw.js')|register('/app/sw.js')|g" \
  "$WEBAPP_DIR/index.html"
echo "  ✓ index.html"

# Fix sw.js: update cache name and precache paths
sed -i '' \
  -e "s|'/offline.html'|'/app/offline.html'|g" \
  "$WEBAPP_DIR/sw.js"
echo "  ✓ sw.js"

echo ""
echo "✅ PWA deployed to backend/src/webapp"
echo "   Files: $(find "$WEBAPP_DIR" -type f | wc -l | tr -d ' ')"
echo "   Size:  $(du -sh "$WEBAPP_DIR" | cut -f1)"
echo ""
echo "🚀 Deploy the backend to make it live!"
