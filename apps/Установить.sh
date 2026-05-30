#!/bin/bash
# Установка зависимостей для обоих Electron-приложений (macOS)

DIR="$(cd "$(dirname "$0")" && pwd)"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v npm &>/dev/null; then
  echo "Node.js не найден. Устанавливаю через Homebrew..."
  if command -v brew &>/dev/null; then
    brew install node
  else
    echo "❌ Homebrew не найден. Установите Node.js вручную: https://nodejs.org"
    exit 1
  fi
fi

echo "=== Установка зависимостей ==="

echo "→ Основное приложение..."
cd "$DIR/apps/основной" && npm install

echo "→ Склад..."
cd "$DIR/apps/склад" && npm install

echo ""
echo "✅ Готово! Запустите: ./Запустить.sh"
