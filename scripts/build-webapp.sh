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

# ═══ FIX FONTS: flatten node_modules paths that git ignores ═══
echo "🔧 Flattening font paths..."
FONTS_DIR="$WEBAPP_DIR/assets/fonts"
mkdir -p "$FONTS_DIR"

# Find all font files buried in node_modules-like paths and copy to clean path
find "$WEBAPP_DIR/assets" -name "*.ttf" -o -name "*.otf" -o -name "*.woff" -o -name "*.woff2" | while read font_file; do
  basename_font=$(basename "$font_file")
  if [ "$font_file" != "$FONTS_DIR/$basename_font" ]; then
    cp "$font_file" "$FONTS_DIR/$basename_font"
    echo "  ✓ $basename_font"
  fi
done

# Update JS bundles to reference the flattened font paths
for js_file in "$WEBAPP_DIR"/_expo/static/js/web/*.js; do
  if [ -f "$js_file" ]; then
    # Replace long node_modules paths with short /app/assets/fonts/ paths
    node -e "
const fs = require('fs');
const f = '$js_file';
let c = fs.readFileSync(f, 'utf8');
// Match paths like /app/assets/_node_modules/.../FontName.hash.ttf
// and replace with /app/assets/fonts/FontName.hash.ttf
const re = /\\/app\\/assets\\/[^\"'\\s]+?\\/([^/\"'\\s]+\\.(?:ttf|otf|woff2?))/g;
const changed = c.replace(re, '/app/assets/fonts/\$1');
if (changed !== c) {
  fs.writeFileSync(f, changed);
  console.log('  ✓ Updated: ' + f.split('/').pop());
}
"
  fi
done

# Remove the old deep node_modules font directories
rm -rf "$WEBAPP_DIR/assets/_node_modules"
echo "  ✓ Cleaned up _node_modules"

echo ""
echo "✅ PWA deployed to backend/src/webapp"
echo "   Files: $(find "$WEBAPP_DIR" -type f | wc -l | tr -d ' ')"
echo "   Size:  $(du -sh "$WEBAPP_DIR" | cut -f1)"
echo ""
echo "🚀 Deploy the backend to make it live!"
