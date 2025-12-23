#!/bin/bash

# Скрипт для настройки сервера для деплоя
# Использование: ./setup-server.sh [staging|production]

set -e

ENVIRONMENT=${1:-production}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "❌ Error: Environment must be 'staging' or 'production'"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo "🔧 Setting up server for $ENVIRONMENT environment..."

# Обновление системы
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Установка Node.js
echo "📥 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка MySQL
echo "🗄️ Installing MySQL..."
sudo apt-get install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# Установка дополнительных пакетов
echo "📦 Installing additional packages..."
sudo apt-get install -y nginx git curl wget unzip

# Создание пользователя для приложения
echo "👤 Creating application user..."
sudo useradd -r -s /bin/false www-data || true
sudo usermod -aG www-data www-data

# Создание директорий
if [ "$ENVIRONMENT" = "staging" ]; then
    APP_DIR="/opt/projectvoice-staging"
    SERVICE_NAME="projectvoice-staging"
    PORT="5002"
else
    APP_DIR="/opt/projectvoice"
    SERVICE_NAME="projectvoice"
    PORT="5001"
fi

echo "📁 Creating application directories..."
sudo mkdir -p "$APP_DIR"
sudo mkdir -p "$APP_DIR/logs"
sudo mkdir -p "$APP_DIR/uploads"
sudo chown -R www-data:www-data "$APP_DIR"

# Настройка systemd сервиса
echo "⚙️ Setting up systemd service..."
if [ "$ENVIRONMENT" = "staging" ]; then
    sudo cp projectvoice-staging.service /etc/systemd/system/
else
    sudo cp projectvoice.service /etc/systemd/system/
fi

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

# Настройка Nginx
echo "🌐 Setting up Nginx..."
sudo tee "/etc/nginx/sites-available/projectvoice-$ENVIRONMENT" > /dev/null << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf "/etc/nginx/sites-available/projectvoice-$ENVIRONMENT" "/etc/nginx/sites-enabled/"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Настройка firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Настройка логирования
echo "📝 Setting up log rotation..."
sudo tee "/etc/logrotate.d/projectvoice-$ENVIRONMENT" > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload $SERVICE_NAME
    endscript
}
EOF

# Создание скрипта для мониторинга
echo "📊 Creating monitoring script..."
sudo tee "/usr/local/bin/projectvoice-monitor.sh" > /dev/null << 'EOF'
#!/bin/bash

SERVICE_NAME="projectvoice"
if [ "$1" = "staging" ]; then
    SERVICE_NAME="projectvoice-staging"
fi

# Проверка статуса сервиса
if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "❌ Service $SERVICE_NAME is not running"
    systemctl restart "$SERVICE_NAME"
    echo "🔄 Service $SERVICE_NAME restarted"
fi

# Проверка доступности API
PORT="5001"
if [ "$1" = "staging" ]; then
    PORT="5002"
fi

if ! curl -f "http://localhost:$PORT/api-docs" > /dev/null 2>&1; then
    echo "❌ API health check failed"
    systemctl restart "$SERVICE_NAME"
    echo "🔄 Service $SERVICE_NAME restarted due to health check failure"
fi
EOF

sudo chmod +x /usr/local/bin/projectvoice-monitor.sh

# Настройка cron для мониторинга
echo "⏰ Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/projectvoice-monitor.sh $ENVIRONMENT") | crontab -

echo "✅ Server setup completed for $ENVIRONMENT environment!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your .env file with production settings"
echo "2. Set up your database"
echo "3. Deploy your application using the deployment script"
echo "4. Check service status: sudo systemctl status $SERVICE_NAME"
echo "5. View logs: sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "🌐 Application will be available at: http://your-server-ip"
echo "📚 API Documentation: http://your-server-ip/api-docs"

