# CI/CD Setup Guide

Этот документ описывает настройку CI/CD pipeline для проекта ProjectVoice Backend.

## Обзор

CI/CD pipeline включает в себя:
- Автоматическое тестирование и линтинг
- Сборку приложения
- Деплой на staging и production серверы
- Создание релизов

## Структура файлов

```
.github/workflows/
├── ci-cd.yml              # Основной workflow для CI/CD

scripts/
├── deploy-staging.sh      # Скрипт деплоя на staging
├── deploy-production.sh   # Скрипт деплоя на production
├── setup-server.sh        # Скрипт настройки сервера
├── projectvoice.service   # Systemd сервис для production
└── projectvoice-staging.service # Systemd сервис для staging

tests/
├── api.test.js           # Тесты API
└── setup.js              # Настройка тестового окружения

env.example               # Пример переменных окружения
jest.config.js           # Конфигурация Jest
```

## Настройка GitHub Secrets

Для работы CI/CD необходимо настроить следующие secrets в GitHub:

### Staging Environment
- `STAGING_HOST` - IP адрес staging сервера
- `STAGING_USER` - пользователь для SSH подключения
- `STAGING_KEY` - приватный SSH ключ

### Production Environment
- `PROD_HOST` - IP адрес production сервера
- `PROD_USER` - пользователь для SSH подключения
- `PROD_KEY` - приватный SSH ключ
- `PROD_DB_HOST` - хост базы данных production
- `PROD_DB_USERNAME` - пользователь базы данных production
- `PROD_DB_PASSWORD` - пароль базы данных production
- `PROD_DB_DATABASE` - имя базы данных production

## Настройка серверов

### 1. Подготовка сервера

На каждом сервере (staging и production) выполните:

```bash
# Загрузите скрипт настройки
scp scripts/setup-server.sh user@server:/tmp/
scp scripts/projectvoice*.service user@server:/tmp/

# Подключитесь к серверу
ssh user@server

# Запустите настройку
sudo bash /tmp/setup-server.sh staging  # для staging
sudo bash /tmp/setup-server.sh production  # для production
```

### 2. Настройка базы данных

Создайте базу данных и пользователя:

```sql
-- Для staging
CREATE DATABASE projectvoice_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'projectvoice_staging'@'localhost' IDENTIFIED BY 'staging_password';
GRANT ALL PRIVILEGES ON projectvoice_staging.* TO 'projectvoice_staging'@'localhost';

-- Для production
CREATE DATABASE projectvoice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'projectvoice'@'localhost' IDENTIFIED BY 'production_password';
GRANT ALL PRIVILEGES ON projectvoice.* TO 'projectvoice'@'localhost';

FLUSH PRIVILEGES;
```

### 3. Настройка переменных окружения

Создайте файл `.env` на каждом сервере:

```bash
# На staging сервере
sudo nano /opt/projectvoice-staging/.env

# На production сервере
sudo nano /opt/projectvoice/.env
```

Пример содержимого для production:

```env
# Database Configuration
DB_USERNAME=projectvoice
DB_PASSWORD=production_password
DB_DATABASE=projectvoice
DB_HOST=localhost
DB_PORT=3306
DB_DIALECT=mysql
DB_LOGGING=false
DB_SSL=false

# Server Configuration
PORT=5001
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your_very_long_production_secret_key_here
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
```

## Workflow Triggers

### Автоматические триггеры:
- **Push в main** → полный CI/CD pipeline + деплой в production
- **Push в develop** → полный CI/CD pipeline + деплой в staging
- **Pull Request** → только тестирование и линтинг

### Ручные триггеры:
- Можно запустить любой job вручную через GitHub Actions UI

## Мониторинг и логи

### Просмотр логов приложения:
```bash
# Production
sudo journalctl -u projectvoice -f

# Staging
sudo journalctl -u projectvoice-staging -f
```

### Проверка статуса сервисов:
```bash
# Production
sudo systemctl status projectvoice

# Staging
sudo systemctl status projectvoice-staging
```

### Мониторинг здоровья:
```bash
# Проверка API
curl http://localhost:5001/api-docs  # production
curl http://localhost:5002/api-docs  # staging
```

## Откат изменений

В случае проблем с деплоем:

```bash
# Остановить сервис
sudo systemctl stop projectvoice

# Восстановить предыдущую версию
cd /opt/projectvoice
sudo mv current current-failed
sudo mv backup-YYYYMMDD-HHMMSS current

# Запустить сервис
sudo systemctl start projectvoice
```

## Безопасность

### SSH ключи:
- Используйте отдельные SSH ключи для каждого окружения
- Регулярно ротируйте ключи
- Ограничьте доступ по IP адресам

### База данных:
- Используйте сильные пароли
- Ограничьте права пользователей
- Настройте SSL для production

### Приложение:
- Используйте сильные JWT секреты
- Настройте HTTPS в production
- Регулярно обновляйте зависимости

## Troubleshooting

### Частые проблемы:

1. **Ошибка подключения к базе данных**
   - Проверьте статус MySQL: `sudo systemctl status mysql`
   - Проверьте логи: `sudo journalctl -u mysql -f`

2. **Ошибка порта**
   - Проверьте занятые порты: `sudo netstat -tlnp | grep :5001`
   - Измените порт в .env файле

3. **Ошибка прав доступа**
   - Проверьте владельца файлов: `sudo chown -R www-data:www-data /opt/projectvoice`

4. **Ошибка миграций**
   - Проверьте подключение к БД
   - Запустите миграции вручную: `sudo npm run db:migrate`

### Полезные команды:

```bash
# Перезапуск сервисов
sudo systemctl restart projectvoice
sudo systemctl restart nginx
sudo systemctl restart mysql

# Проверка конфигурации Nginx
sudo nginx -t

# Просмотр активных соединений
sudo netstat -tlnp

# Мониторинг ресурсов
htop
df -h
free -h
```

## Обновление CI/CD

При изменении CI/CD конфигурации:

1. Обновите файлы в репозитории
2. Проверьте синтаксис YAML
3. Протестируйте на staging окружении
4. Примените изменения в production

## Контакты

При возникновении проблем с CI/CD обращайтесь к команде разработки.


