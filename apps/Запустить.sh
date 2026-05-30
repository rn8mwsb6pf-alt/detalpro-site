#!/bin/bash
# Запуск обоих приложений Дорожный комплекс Гараж (macOS)

DIR="$(cd "$(dirname "$0")" && pwd)"

# Подключаем Homebrew PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v npm &>/dev/null; then
  echo "❌ Node.js не найден. Установите: brew install node"
  exit 1
fi

echo "=== Запуск приложений ==="

cd "$DIR/apps/основной"
if [ ! -f "node_modules/.bin/electron" ] || [ ! -f "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]; then
  echo "→ Устанавливаю зависимости (основное)..."
  npm install
fi
echo "→ Запускаю основное приложение..."
npm start &

cd "$DIR/apps/склад"
if [ ! -f "node_modules/.bin/electron" ] || [ ! -f "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]; then
  echo "→ Устанавливаю зависимости (склад)..."
  npm install
fi
echo "→ Запускаю склад..."
npm start &

echo ""
echo "✅ Оба приложения запущены."
wait
