@echo off
setlocal
chcp 65001 >nul

echo.
echo  ============================================
echo   Гараж — Склад. Сборка Windows-приложения
echo  ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден. Установите с https://nodejs.org/
    pause & exit /b 1
)

cd /d "%~dp0"

if not exist "assets\" (
    echo [INFO] Создание иконок...
    node ..\electron-app\create-icons.js
)

if not exist "node_modules\" (
    echo [INFO] Установка зависимостей...
    call npm install
    if %errorlevel% neq 0 ( echo [ОШИБКА] npm install failed & pause & exit /b 1 )
)

echo [INFO] Сборка...
call npm run dist

if %errorlevel% neq 0 ( echo [ОШИБКА] Сборка не удалась & pause & exit /b 1 )

echo.
echo [ГОТОВО] Файлы в dist\:
dir /b dist\*.exe 2>nul
echo.
pause
