#!/bin/bash
set -e

echo "══════════════════════════════════════════"
echo "  Build — Rede de Embaixadores (Staging)"
echo "══════════════════════════════════════════"

# ─── 1. PWA (Expo Web) ───
echo "▶ [1/4] Instalando dependências do app..."
command -v pnpm || npm install -g pnpm
cd app && pnpm install

echo "▶ [2/4] Exportando PWA (Expo Web)..."
EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
EXPO_BASE_URL=/app \
npx expo export --platform web --output-dir ../backend/src/webapp

cp public/firebase-messaging-sw.js ../backend/src/webapp/firebase-messaging-sw.js
cd ..

# ─── 2. Admin (Next.js) ───
echo "▶ [3/4] Build do Admin (Next.js)..."
cd admin && npm install
NEXT_OUTPUT_MODE=export \
NEXT_PUBLIC_BASE_PATH=/admin \
NEXT_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
npx next build

mkdir -p ../backend/src/adminweb
cp -r out/* ../backend/src/adminweb/
cd ..

# ─── 3. Backend (Python) ───
echo "▶ [4/4] Instalando dependências do backend..."
cd backend && pip install -r requirements.txt

echo "✅ Build concluído com sucesso!"
