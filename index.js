const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const webrtc = require('./modules/webrtc/webrtc'); // Подключение логики WebRTC

// Импорт маршрутов
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/server');
const channelRoutes = require('./routes/channel');
const serverMembersRoutes = require('./routes/serverMembers');
const serverInviteRoutes = require('./routes/invite');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/message');

// Документация Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./utils/swagger/swagger-output.json');

// Загрузка переменных окружения (из backend/.env)
dotenv.config({ path: path.resolve(__dirname, '.env') });

const WEBSOCKET_PATH = `/socket`;

// Инициализация Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    path: WEBSOCKET_PATH,
    cors: {
        origin: '*', // Разрешите доступ с любого источника
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Укажите разрешенные методы
        credentials: true, // Укажите, если нужно передавать куки
    },
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
        optionsSuccessStatus: 204
    })
);

app.use((req, res, next) => {
    console.log(`Запрос: ${req.method} ${req.url}`);
    next();
});

// Подключение маршрутов API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/servers', channelRoutes); // Каналы серверов
app.use('/api/serverMembers', serverMembersRoutes); // Участники серверов
app.use('/api/invite', serverInviteRoutes); // Приглашения на серверы
app.use('/api/admin', adminRoutes); // Административная панель
app.use('/api/messages', messageRoutes); // Сообщения в каналах

// Swagger документация
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Настройка раздачи статических файлов фронтенда
app.use(express.static('../frontend/build')); // Укажите путь к директории сборки

// Обработка всех GET маршрутов для фронтенда (только для SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'build', 'index.html')); // Возвращаем главный файл
});

// Подключаем логику WebRTC из отдельного модуля
webrtc(io);

// Запуск сервера
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📚 Swagger документация: http://localhost:${PORT}/api-docs`);
    console.log(`🌐 API базовый URL: http://localhost:${PORT}/api`);
});

