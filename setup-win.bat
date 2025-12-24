@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
REM Скрипт быстрой установки для Windows (Batch файл)
REM Запустите: setup-win.bat

echo.
echo ========================================
echo Установка ProjectVoice Backend для Windows
echo ========================================
echo.

REM Проверка Node.js
echo [1/5] Проверка Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден!
    echo Установите Node.js с https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js установлен: !NODE_VERSION!
echo.

REM Проверка npm
echo [2/5] Проверка npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] npm не найден в PATH!
    echo.
    pause
    exit /b 1
)
echo [OK] npm найден
echo.

REM Установка зависимостей
echo [3/5] Установка зависимостей npm...
echo Это может занять несколько минут, пожалуйста подождите...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ОШИБКА] Ошибка при установке зависимостей!
    echo Проверьте подключение к интернету и попробуйте снова
    echo.
    pause
    exit /b 1
)
echo.
echo [OK] Зависимости установлены успешно!
echo.

REM Создание .env файла
echo [4/5] Настройка переменных окружения...
if exist .env (
    echo [INFO] Файл .env уже существует, пропускаем создание
) else (
    if exist env.example (
        copy env.example .env >nul 2>&1
        if %errorlevel% equ 0 (
            echo [OK] Файл .env создан из env.example
            echo [INFO] Не забудьте проверить настройки в .env файле!
        ) else (
            echo [ОШИБКА] Не удалось создать файл .env
        )
    ) else (
        echo [WARNING] Файл env.example не найден
        echo [INFO] Создайте файл .env вручную на основе env.example
    )
)
echo.

REM Проверка и настройка MySQL
echo [5/6] Проверка MySQL...
mysql --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('mysql --version') do set MYSQL_VERSION=%%i
    echo [OK] MySQL найден: !MYSQL_VERSION!
    echo.
    echo [6/6] Настройка базы данных...
    echo.
    if exist init-database.sql (
        echo Попытка автоматического создания базы данных...
        echo.
        echo Пробуем подключиться к MySQL без пароля...
        mysql -u root < init-database.sql 2>nul
        if errorlevel 1 (
            echo [WARNING] Не удалось подключиться без пароля
            echo.
            echo Для создания базы данных вручную:
            echo 1. Откройте MySQL Workbench или командную строку MySQL
            echo 2. Выполните команду: mysql -u root -p ^< init-database.sql
            echo 3. Или скопируйте содержимое файла init-database.sql в MySQL Workbench
            echo.
            echo Файл init-database.sql содержит SQL команды для создания БД
        ) else (
            echo [OK] База данных и пользователь созданы успешно!
            echo.
            echo Запуск миграций базы данных...
            call npm run db:migrate
            if errorlevel 1 (
                echo [WARNING] Ошибка при выполнении миграций
                echo [INFO] Выполните вручную: npm run db:migrate
            ) else (
                echo [OK] Миграции выполнены успешно!
                echo.
                echo Создание администратора...
                call npm run create-admin
                if errorlevel 1 (
                    echo [WARNING] Ошибка при создании администратора
                    echo [INFO] Выполните вручную: npm run create-admin
                ) else (
                    echo [OK] Администратор создан успешно!
                )
            )
        )
    ) else (
        echo [WARNING] Файл init-database.sql не найден
        echo [INFO] Создайте базу данных вручную (см. QUICK_START_WINDOWS.md)
    )
) else (
    echo [WARNING] MySQL не найден в PATH
    echo [INFO] Убедитесь, что MySQL установлен и добавлен в PATH
    echo [INFO] Или используйте MySQL Workbench для создания БД
)
echo.

echo ========================================
echo Установка завершена!
echo ========================================
echo.
echo Следующие шаги:
echo.
echo 1. Проверьте настройки в .env файле
echo    Откройте файл .env и при необходимости измените настройки
echo.
echo 2. Запустите миграции базы данных (если еще не выполнены):
echo    npm run db:migrate
echo.
echo 3. Запустите сервер разработки:
echo    npm run dev
echo.
echo 4. Откройте в браузере:
echo    http://localhost:5001/api-docs
echo.
echo Документация: QUICK_START_WINDOWS.md
echo.
pause
