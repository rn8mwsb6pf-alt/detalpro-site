@echo off
setlocal
chcp 65001 >nul

echo.
echo  ============================================
echo   Дорожный комплекс Гараж — Запуск
echo  ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден. Установите с https://nodejs.org/
    pause & exit /b 1
)

cd /d "%~dp0"

:: ── Установить зависимости если нужно ─────────────────────────────────────────
if not exist "основной\node_modules\electron\dist\electron.exe" (
    echo [INFO] Установка зависимостей: Основное приложение...
    cd основной & call npm install & cd ..
)

if not exist "склад\node_modules\electron\dist\electron.exe" (
    echo [INFO] Установка зависимостей: Склад...
    cd склад & call npm install & cd ..
)

:: ── Создать иконки если нет ───────────────────────────────────────────────────
if not exist "основной\assets\icon.ico" (
    echo [INFO] Создание иконок...
    cd основной & node create-icons.js & cd ..
)
if not exist "склад\assets\icon.ico" (
    if exist "основной\assets\icon.ico" (
        xcopy /y "основной\assets\*" "склад\assets\" >nul 2>&1
    )
)

:: ── Запуск ────────────────────────────────────────────────────────────────────
echo [INFO] Запуск основного приложения (сайт)...
start "" "основной\node_modules\electron\dist\electron.exe" "." /D "%~dp0основной"

timeout /t 1 /nobreak >nul

echo [INFO] Запуск складского приложения...
start "" "склад\node_modules\electron\dist\electron.exe" "." /D "%~dp0склад"

echo.
echo [ГОТОВО] Оба приложения запущены.
echo.
timeout /t 2 /nobreak >nul
