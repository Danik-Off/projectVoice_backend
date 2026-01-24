const fs = require('fs');
const http = require('http');
const path = require('path');

const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');

const webrtc = require('./modules/webrtc/webrtc');
const apiRoutes = require('./routes/index');
const swaggerSpec = require('./utils/swagger/swagger-output.json');

// Загрузка переменных окружения (из backend/.env)
dotenv.config({ path: path.resolve(__dirname, '.env') });

const WEBSOCKET_PATH = `/socket`;

// Инициализация Express
const app = express();
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const io = new Server(server, {
    path: WEBSOCKET_PATH,
    cors: {
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',')
            : ['http://localhost:3000', 'http://localhost:3001', '*'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'], // Поддержка разных транспортов
    allowEIO3: true, // Совместимость с клиентами Socket.IO v3
});

app.use(express.json());

// Настройка CORS
app.use(
    cors({
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',')
            : ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    })
);

// Логирование запросов (для отладки)
// Можно отключить установив LOG_REQUESTS=false в .env
if (process.env.LOG_REQUESTS !== 'false') {
    app.use((req, res, next) => {
        // Пропускаем логирование для WebSocket и опционально для частых запросов
        const skipLogging = req.path.startsWith('/socket');

        if (!skipLogging) {
            const timestamp = new Date().toLocaleTimeString('ru-RU');
            console.log(`[${timestamp}] ${req.method} ${req.url}`);
        }
        next();
    });
}

// Тестовый эндпоинт
app.get('/api/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'API работает!',
        timestamp: new Date().toISOString(),
        server: 'ProjectVoice Backend',
        version: '1.0.0',
        websocket: {
            path: WEBSOCKET_PATH,
            url: `ws://localhost:${process.env.PORT || 5001}${WEBSOCKET_PATH}`,
        },
    });
});

// Подключение маршрутов API
app.use('/api', apiRoutes);

// Swagger документация
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Подключаем логику WebRTC из отдельного модуля (ДО обработки фронтенда)
webrtc(io);
console.log('✅ WebRTC/Socket.IO инициализирован на пути:', WEBSOCKET_PATH);

// Настройка раздачи статических файлов фронтенда (опционально)
const frontendBuildPath = path.join(__dirname, '../frontend/build');
const frontendIndexPath = path.join(frontendBuildPath, 'index.html');

if (fs.existsSync(frontendBuildPath) && fs.existsSync(frontendIndexPath)) {
    // Раздача статических файлов фронтенда
    app.use(express.static(frontendBuildPath));

    // Обработка всех GET маршрутов для фронтенда (только для SPA)
    // ВАЖНО: этот роутер должен быть последним, чтобы не перехватывать Socket.IO
    app.get('*', (req, res, next) => {
        // Пропускаем Socket.IO, API маршруты и документацию
        if (
            req.path.startsWith('/socket') ||
            req.path.startsWith('/api') ||
            req.path.startsWith('/api-docs')
        ) {
            return next(); // Передаем управление дальше
        }
        res.sendFile(frontendIndexPath);
    });
    console.log('✅ Фронтенд подключен: статические файлы раздаются');
} else {
    // Если фронтенд не собран, возвращаем 404 для не-API маршрутов
    // ВАЖНО: этот роутер должен быть последним
    app.get('*', (req, res) => {
        // Пропускаем Socket.IO, API маршруты и документацию
        if (
            req.path.startsWith('/socket') ||
            req.path.startsWith('/api') ||
            req.path.startsWith('/api-docs')
        ) {
            return res.status(404).json({ error: 'Endpoint not found' });
        }
        res.status(404).json({
            error: 'Frontend not found',
            message: 'Фронтенд не собран. Используйте API эндпоинты или соберите фронтенд.',
            apiDocs: `http://localhost:${PORT}/api-docs`,
        });
    });
    console.log('ℹ️  Фронтенд не найден: работаем только в режиме API');
}

// Запуск сервера
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📚 Swagger документация: http://localhost:${PORT}/api-docs`);
    console.log(`🌐 API базовый URL: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket путь: ${WEBSOCKET_PATH}`);
    console.log(`🔌 WebSocket URL: ws://localhost:${PORT}${WEBSOCKET_PATH}`);
});
