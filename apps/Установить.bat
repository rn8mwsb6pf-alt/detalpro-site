@echo off
chcp 1251 >nul
setlocal

echo.
echo  ============================================
echo   Дорожный комплекс Гараж - Установка
echo  ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден. Установите с https://nodejs.org/
    pause & exit /b 1
)

cd /d "%~dp0"

echo [1/4] Установка зависимостей основного приложения...
cd "основной" & call npm install & cd ..

echo [2/4] Установка зависимостей склада...
cd "склад" & call npm install & cd ..

echo [3/4] Создание иконок...
cd "основной" & node create-icons.js & cd ..
xcopy /y "основной\assets\*" "склад\assets\" >nul 2>&1

echo [4/4] Готово!
echo.
echo Теперь запустите "Запустить.bat"
echo.
pause