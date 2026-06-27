#!/bin/bash
set -e

echo "══════════════════════════════════════════"
echo "  Start — Rede de Embaixadores"
echo "══════════════════════════════════════════"

cd backend

echo "▶ Rodando migrations..."
alembic upgrade head

echo "▶ Iniciando servidor..."
gunicorn src.main:app \
  -w 1 \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:$PORT
