@echo off
setlocal
chcp 65001 >nul

echo.
echo  ============================================
echo   Дорожный комплекс Гараж — Сборка Windows-приложения
echo  ============================================
echo.

:: Проверить Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден. Установите с https://nodejs.org/
    pause
    exit /b 1
)

:: Перейти в папку скрипта
cd /d "%~dp0"

:: Создать иконки-заглушки если их нет
if not exist "assets\icon.ico" (
    echo [INFO] Создание иконок-заглушек...
    node create-icons.js
    if %errorlevel% neq 0 (
        echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось создать иконки, продолжаем без них.
    )
)

:: Установить зависимости если нужно
if not exist "node_modules\" (
    echo [INFO] Установка зависимостей...
    call npm install
    if %errorlevel% neq 0 (
        echo [ОШИБКА] npm install завершился с ошибкой.
        pause
        exit /b 1
    )
)

:: Сборка
echo [INFO] Сборка установщика и портативной версии...
call npm run dist

if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Сборка не удалась. Смотрите вывод выше.
    pause
    exit /b 1
)

echo.
echo [ГОТОВО] Файлы в папке "dist\":
dir /b dist\*.exe 2>nul
echo.
pause
