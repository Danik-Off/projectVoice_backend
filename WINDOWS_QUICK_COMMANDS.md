# 🚀 Быстрые команды для Windows

## Минимальная установка (5 минут)

```powershell
# 1. Установить зависимости
npm install

# 2. Создать .env файл
copy env.example .env

# 3. Создать БД в MySQL Workbench (см. QUICK_START_WINDOWS.md)

# 4. Запустить миграции
npm run db:migrate

# 5. Создать администратора
npm run create-admin

# 6. Запустить сервер
npm run dev
```

## Основные команды

```powershell
# Разработка (с автоперезагрузкой)
npm run dev

# Обычный запуск
npm start

# Миграции БД
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:undo

# Создание администратора
npm run create-admin

# Генерация Swagger документации
npm run docs-gen

# Тесты
npm test
```

## Проверка

- **Swagger UI**: http://localhost:5001/api-docs
- **API**: http://localhost:5001/api

## Быстрая установка через скрипт

```powershell
# Запустить автоматическую установку
.\setup-windows.ps1
```

## Если что-то не работает

```powershell
# Очистка и переустановка
npm cache clean --force
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

📖 **Полная инструкция**: [QUICK_START_WINDOWS.md](QUICK_START_WINDOWS.md)
