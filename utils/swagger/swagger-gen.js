// swagger-gen.js
const path = require('path');

const swaggerAutogen = require('swagger-autogen')();
require('dotenv').config();

// Путь к файлам, которые будут использоваться для генерации документации
const outputFile = path.join(__dirname, 'swagger-output.json'); // Путь для генерируемого файла
const endpointsFiles = [path.join(__dirname, '../../index.js')]; // Путь к главному файлу приложения

// Конфигурация документации
const port = process.env.PORT || 5001;
const host = `localhost:${port}`;
const doc = {
    info: {
        title: 'ProjectVoice API',
        description:
            'REST API для голосового приложения ProjectVoice с поддержкой WebRTC. API предоставляет функционал для управления пользователями, серверами, каналами, сообщениями и приглашениями.',
        version: '1.0.0',
        contact: {
            name: 'API Support',
            email: 'support@projectvoice.com',
        },
    },
    host, // Хост
    basePath: '/',
    schemes: ['http', 'https'], // Схемы (HTTP/HTTPS)
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
        bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            scheme: 'bearer',
            in: 'header',
            description: 'JWT токен для аутентификации. Формат: Bearer {token}',
        },
    },
    tags: [
        { name: 'Auth', description: 'API для аутентификации и авторизации пользователей' },
        { name: 'Users', description: 'API для управления профилями пользователей' },
        { name: 'Servers', description: 'API для управления серверами (комнатами)' },
        {
            name: 'Channels',
            description: 'API для управления каналами на серверах (текстовые и голосовые)',
        },
        { name: 'ServerMembers', description: 'API для управления участниками серверов' },
        { name: 'Invites', description: 'API для создания и управления приглашениями на серверы' },
        { name: 'Messages', description: 'API для работы с сообщениями в каналах' },
        {
            name: 'Admin',
            description: 'API для административной панели (требуются права администратора)',
        },
        { name: 'Friends', description: 'API для управления друзьями и запросами' },
    ],
    definitions: {
        User: {
            id: 1,
            username: 'string',
            email: 'string',
            role: 'user',
            isActive: true,
            profilePicture: 'string',
            bio: 'string',
            status: 'online',
            tag: 'string',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
        Server: {
            id: 1,
            name: 'string',
            description: 'string',
            icon: 'string',
            ownerId: 1,
            isBlocked: false,
            blockReason: null,
            blockedAt: null,
            blockedBy: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
        Channel: {
            id: 1,
            name: 'string',
            type: 'text',
            serverId: 1,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
        Message: {
            id: 1,
            content: 'string',
            userId: 1,
            channelId: 1,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            user: {
                id: 1,
                username: 'string',
                avatar: 'string',
            },
            isEdited: false,
        },
        ServerMember: {
            id: 1,
            userId: 1,
            serverId: 1,
            role: 'member',
            isMuted: false,
            isDeafened: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            user: {
                id: 1,
                username: 'string',
                profilePicture: 'string',
            },
            roles: [
                {
                    $ref: '#/definitions/Role',
                },
            ],
        },
        Invite: {
            id: 1,
            token: 'string',
            serverId: 1,
            createdBy: 1,
            maxUses: 10,
            uses: 0,
            expiresAt: '2024-12-31T23:59:59.000Z',
            createdAt: '2024-01-01T00:00:00.000Z',
        },
        Friendship: {
            id: 1,
            userId: 1,
            friendId: 2,
            status: 'pending',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
        Role: {
            id: 1,
            serverId: 1,
            name: 'string',
            color: '#99AAB5',
            permissions: '1024',
            position: 0,
            isHoisted: false,
            isMentionable: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
        Error: {
            error: 'string',
            message: 'string',
        },
        Success: {
            message: 'string',
        },
    },
};

// Генерация документации
swaggerAutogen(outputFile, endpointsFiles, doc)
    .then(() => {
        console.log('✅ Swagger documentation generated successfully!');
        console.log(`📄 Documentation available at: http://${host}/api-docs`);
    })
    .catch((error) => {
        console.error('❌ Error generating Swagger documentation:', error);
    });
