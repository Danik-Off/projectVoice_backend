#!/bin/bash

# Скрипт для деплоя на staging сервер
# Использование: ./deploy-staging.sh

set -e

echo "🚀 Starting staging deployment..."

# Проверка переменных окружения
if [ -z "$STAGING_HOST" ] || [ -z "$STAGING_USER" ] || [ -z "$STAGING_KEY" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "Required: STAGING_HOST, STAGING_USER, STAGING_KEY"
    exit 1
fi

# Создание временной директории для деплоя
TEMP_DIR=$(mktemp -d)
echo "📁 Created temporary directory: $TEMP_DIR"

# Копирование файлов проекта
echo "📦 Copying project files..."
cp -r . "$TEMP_DIR/"
cd "$TEMP_DIR"

# Установка зависимостей
echo "📥 Installing dependencies..."
npm ci --only=production

# Создание архива для деплоя
echo "🗜️ Creating deployment archive..."
tar -czf deployment.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.github \
    --exclude=*.log \
    --exclude=.env \
    --exclude=logs \
    --exclude=uploads \
    .

# Загрузка на сервер
echo "⬆️ Uploading to staging server..."
scp -i "$STAGING_KEY" deployment.tar.gz "$STAGING_USER@$STAGING_HOST:/tmp/"

# Выполнение команд на сервере
echo "🔧 Deploying on staging server..."
ssh -i "$STAGING_KEY" "$STAGING_USER@$STAGING_HOST" << 'EOF'
    set -e
    
    # Создание директории для деплоя
    DEPLOY_DIR="/opt/projectvoice-staging"
    sudo mkdir -p "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    
    # Остановка приложения
    sudo systemctl stop projectvoice-staging || true
    
    # Бэкап текущей версии
    if [ -d "current" ]; then
        sudo mv current backup-$(date +%Y%m%d-%H%M%S)
    fi
    
    # Распаковка новой версии
    sudo tar -xzf /tmp/deployment.tar.gz -C "$DEPLOY_DIR"
    sudo mv "$DEPLOY_DIR" current
    
    # Установка зависимостей
    cd current
    sudo npm ci --only=production
    
    # Запуск миграций
    sudo npm run db:migrate
    
    # Запуск приложения
    sudo systemctl start projectvoice-staging
    sudo systemctl enable projectvoice-staging
    
    # Проверка статуса
    sleep 5
    sudo systemctl status projectvoice-staging --no-pager
    
    echo "✅ Staging deployment completed successfully!"
EOF

# Очистка
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"
rm -f deployment.tar.gz

echo "🎉 Staging deployment completed!"

