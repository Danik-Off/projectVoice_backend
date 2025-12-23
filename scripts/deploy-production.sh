#!/bin/bash

# Скрипт для деплоя на production сервер
# Использование: ./deploy-production.sh

set -e

echo "🚀 Starting production deployment..."

# Проверка переменных окружения
if [ -z "$PROD_HOST" ] || [ -z "$PROD_USER" ] || [ -z "$PROD_KEY" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "Required: PROD_HOST, PROD_USER, PROD_KEY"
    exit 1
fi

# Подтверждение деплоя
read -p "⚠️  Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
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
echo "⬆️ Uploading to production server..."
scp -i "$PROD_KEY" deployment.tar.gz "$PROD_USER@$PROD_HOST:/tmp/"

# Выполнение команд на сервере
echo "🔧 Deploying on production server..."
ssh -i "$PROD_KEY" "$PROD_USER@$PROD_HOST" << 'EOF'
    set -e
    
    # Создание директории для деплоя
    DEPLOY_DIR="/opt/projectvoice"
    sudo mkdir -p "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    
    # Остановка приложения
    sudo systemctl stop projectvoice || true
    
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
    echo "🔄 Running database migrations..."
    sudo npm run db:migrate
    
    # Запуск приложения
    sudo systemctl start projectvoice
    sudo systemctl enable projectvoice
    
    # Проверка статуса
    sleep 10
    sudo systemctl status projectvoice --no-pager
    
    # Проверка работоспособности
    echo "🔍 Performing health check..."
    sleep 30
    
    # Проверка доступности API
    if curl -f http://localhost:5001/api-docs > /dev/null 2>&1; then
        echo "✅ Health check passed - API is responding"
    else
        echo "❌ Health check failed - API is not responding"
        sudo systemctl status projectvoice --no-pager
        exit 1
    fi
    
    echo "✅ Production deployment completed successfully!"
EOF

# Очистка
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"
rm -f deployment.tar.gz

echo "🎉 Production deployment completed!"
echo "📊 Application is running at: http://$PROD_HOST:5001"
echo "📚 API Documentation: http://$PROD_HOST:5001/api-docs"

