const express = require('express');
const { Op } = require('sequelize');

const { authenticateToken } = require('../middleware/auth');
const { isAdmin, isModerator } = require('../middleware/checkRole');
const { User, Server, Channel, Message, ServerMember } = require('../models');

const router = express.Router();

// Тестовый маршрут для проверки
/**
 * @swagger
 * /api/admin/test:
 *   get:
 *     tags: [Admin]
 *     summary: Тестовый маршрут
 *     description: Проверка работоспособности админских маршрутов
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав (требуется роль admin)
 */
router.get('/test', authenticateToken, isAdmin, async (req, res) => {
    try {
        res.json({ message: 'Админский маршрут работает' });
    } catch (error) {
        console.error('Ошибка тестового маршрута:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Тестовый маршрут для проверки подключения к базе данных
/**
 * @swagger
 * /api/admin/db-test:
 *   get:
 *     tags: [Admin]
 *     summary: Тест подключения к базе данных
 *     description: Проверяет подключение к базе данных и доступность моделей
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Подключение работает
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *             userCount:
 *               type: integer
 *             models:
 *               type: object
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 *       500:
 *         description: Ошибка базы данных
 */
router.get('/db-test', authenticateToken, isAdmin, async (req, res) => {
    try {
        console.log('Проверяем подключение к базе данных...');

        // Проверяем доступность моделей
        console.log('User model:', typeof User);
        console.log('Server model:', typeof Server);
        console.log('Channel model:', typeof Channel);
        console.log('Message model:', typeof Message);

        // Простой тест подключения
        const userCount = await User.count();
        console.log('User count:', userCount);

        res.json({
            message: 'Подключение к базе данных работает',
            userCount: userCount,
            models: {
                User: typeof User,
                Server: typeof Server,
                Channel: typeof Channel,
                Message: typeof Message,
            },
        });
    } catch (error) {
        console.error('Ошибка теста базы данных:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Ошибка базы данных', details: error.message });
    }
});

// Получение статистики системы
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Получить статистику системы
 *     description: Возвращает общую статистику по пользователям, серверам, каналам и сообщениям
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика системы
 *         schema:
 *           type: object
 *           properties:
 *             users:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 active:
 *                   type: integer
 *                 blocked:
 *                   type: integer
 *                 byRole:
 *                   type: object
 *             servers:
 *               type: object
 *             channels:
 *               type: object
 *             messages:
 *               type: object
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        console.log('Начинаем получение статистики...');

        // Получаем базовую статистику
        const totalUsers = await User.count();
        console.log('Total users:', totalUsers);

        const activeUsers = await User.count({ where: { isActive: true } });
        console.log('Active users:', activeUsers);

        const blockedUsers = await User.count({ where: { isActive: false } });
        console.log('Blocked users:', blockedUsers);

        // Статистика по ролям
        const roleStats = {
            admin: 0,
            moderator: 0,
            user: 0,
        };

        // Получаем количество пользователей по ролям
        const adminCount = await User.count({ where: { role: 'admin' } });
        const moderatorCount = await User.count({ where: { role: 'moderator' } });
        const userCount = await User.count({ where: { role: 'user' } });

        roleStats.admin = adminCount;
        roleStats.moderator = moderatorCount;
        roleStats.user = userCount;

        console.log('Role stats:', roleStats);

        const totalServers = await Server.count();
        console.log('Total servers:', totalServers);

        const activeServers = await Server.count({ where: { isBlocked: false } });
        console.log('Active servers:', activeServers);

        const blockedServers = await Server.count({ where: { isBlocked: true } });
        console.log('Blocked servers:', blockedServers);

        // Серверы с каналами
        const serversWithChannels = await Server.count({
            include: [
                {
                    model: Channel,
                    as: 'channels',
                    required: true,
                },
            ],
        });
        console.log('Servers with channels:', serversWithChannels);

        const totalChannels = await Channel.count();
        console.log('Total channels:', totalChannels);

        const textChannels = await Channel.count({ where: { type: 'text' } });
        console.log('Text channels:', textChannels);

        const voiceChannels = await Channel.count({ where: { type: 'voice' } });
        console.log('Voice channels:', voiceChannels);

        const totalMessages = await Message.count();
        console.log('Total messages:', totalMessages);

        // Сообщения за сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const messagesToday = await Message.count({
            where: {
                createdAt: {
                    [Op.gte]: today,
                },
            },
        });
        console.log('Messages today:', messagesToday);

        const stats = {
            users: {
                total: totalUsers,
                active: activeUsers,
                blocked: blockedUsers,
                byRole: roleStats,
            },
            servers: {
                total: totalServers,
                active: activeServers,
                blocked: blockedServers,
                withChannels: serversWithChannels,
            },
            channels: {
                total: totalChannels,
                text: textChannels,
                voice: voiceChannels,
            },
            messages: {
                total: totalMessages,
                today: messagesToday,
            },
        };

        console.log('Final stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Получение списка пользователей с пагинацией
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Получить список пользователей
 *     description: Возвращает список пользователей с пагинацией, поиском и фильтрацией
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Количество записей на странице
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по username или email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, moderator, admin]
 *         description: Фильтр по роли
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, blocked]
 *         description: Фильтр по статусу
 *     responses:
 *       200:
 *         description: Список пользователей
 *         schema:
 *           type: object
 *           properties:
 *             users:
 *               type: array
 *               items:
 *                 $ref: '#/definitions/User'
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 *       400:
 *         description: Неверные параметры
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.get('/users', authenticateToken, isModerator, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const role = req.query.role || '';
        const status = req.query.status || '';

        // Валидация параметров
        if (page < 1) {
            return res.status(400).json({ error: 'Номер страницы должен быть больше 0' });
        }
        if (limit < 1 || limit > 100) {
            return res.status(400).json({ error: 'Лимит должен быть от 1 до 100' });
        }

        const where = {};

        if (search) {
            where[Op.or] = [
                { username: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
            ];
        }

        if (role && ['user', 'moderator', 'admin'].includes(role)) {
            where.role = role;
        }

        if (status === 'active') {
            where.isActive = true;
        } else if (status === 'blocked') {
            where.isActive = false;
        }

        const users = await User.findAndCountAll({
            where,
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
            include: [
                {
                    model: ServerMember,
                    as: 'serverMembers',
                    include: [
                        {
                            model: Server,
                            as: 'server',
                            attributes: ['id', 'name'],
                        },
                    ],
                },
            ],
        });

        res.json({
            users: users.rows,
            total: users.count,
            page,
            limit,
            totalPages: Math.ceil(users.count / limit),
        });
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Получение информации о пользователе
/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Получить информацию о пользователе
 *     description: Возвращает детальную информацию о пользователе по ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         schema:
 *           $ref: '#/definitions/User'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Пользователь не найден
 */
router.get('/users/:id', authenticateToken, isModerator, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: ServerMember,
                    as: 'serverMembers',
                    include: [
                        {
                            model: Server,
                            as: 'server',
                        },
                    ],
                },
            ],
        });

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление пользователя (роль, статус)
/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Обновить пользователя
 *     description: Обновляет роль и статус пользователя (только для администраторов)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID пользователя
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             role:
 *               type: string
 *               enum: [user, moderator, admin]
 *             isActive:
 *               type: boolean
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 *       400:
 *         description: Неверные параметры
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Пользователь не найден
 */
router.put('/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { role, isActive } = req.body;
        const userId = parseInt(req.params.id);

        // Валидация ID
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверка, что не блокируем самих себя
        if (user.id === req.user.userId && isActive === false) {
            return res.status(400).json({ error: 'Нельзя заблокировать свой аккаунт' });
        }

        // Валидация роли
        if (role && !['user', 'moderator', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Неверная роль' });
        }

        // Проверка, что не понижаем роль другого админа
        if (role && user.role === 'admin' && role !== 'admin' && user.id !== req.user.userId) {
            return res.status(400).json({ error: 'Нельзя понизить роль другого администратора' });
        }

        // Обновление полей
        if (role) user.role = role;
        if (typeof isActive === 'boolean') user.isActive = isActive;

        await user.save();

        // Возвращаем обновленного пользователя без пароля
        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password'] },
        });

        res.json({
            message: 'Пользователь обновлен',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Удаление пользователя
/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Удалить пользователя
 *     description: Удаляет пользователя из системы (только для администраторов)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Пользователь удален
 *       400:
 *         description: Неверные параметры
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Пользователь не найден
 */
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Валидация ID
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверка, что не удаляем самих себя
        if (user.id === req.user.userId) {
            return res.status(400).json({ error: 'Нельзя удалить свой аккаунт' });
        }

        // Проверка, что не удаляем другого админа
        if (user.role === 'admin' && user.id !== req.user.userId) {
            return res.status(400).json({ error: 'Нельзя удалить другого администратора' });
        }

        await user.destroy();

        res.json({ message: 'Пользователь удален' });
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Получение списка серверов
/**
 * @swagger
 * /api/admin/servers:
 *   get:
 *     tags: [Admin]
 *     summary: Получить список серверов
 *     description: Возвращает список серверов с пагинацией и фильтрацией
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, blocked]
 *     responses:
 *       200:
 *         description: Список серверов
 *       400:
 *         description: Неверные параметры
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.get('/servers', authenticateToken, isModerator, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const status = req.query.status || '';

        // Валидация параметров
        if (page < 1) {
            return res.status(400).json({ error: 'Номер страницы должен быть больше 0' });
        }
        if (limit < 1 || limit > 100) {
            return res.status(400).json({ error: 'Лимит должен быть от 1 до 100' });
        }

        const where = {};
        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }

        if (status === 'active') {
            where.isBlocked = false;
        } else if (status === 'blocked') {
            where.isBlocked = true;
        }

        const servers = await Server.findAndCountAll({
            where,
            attributes: [
                'id',
                'name',
                'description',
                'isBlocked',
                'blockReason',
                'blockedAt',
                'createdAt',
                'ownerId',
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'username', 'email'],
                },
                {
                    model: User,
                    as: 'blockedByUser',
                    attributes: ['id', 'username'],
                },
                {
                    model: Channel,
                    as: 'channels',
                    attributes: ['id', 'name', 'type'],
                },
            ],
        });

        res.json({
            servers: servers.rows,
            total: servers.count,
            page,
            limit,
            totalPages: Math.ceil(servers.count / limit),
        });
    } catch (error) {
        console.error('Ошибка получения серверов:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Получение информации о сервере
router.get('/servers/:id', authenticateToken, isModerator, async (req, res) => {
    try {
        const serverId = parseInt(req.params.id);

        // Валидация ID
        if (isNaN(serverId)) {
            return res.status(400).json({ error: 'Неверный ID сервера' });
        }

        const server = await Server.findByPk(serverId, {
            include: [
                {
                    model: Channel,
                    as: 'channels',
                    attributes: ['id', 'name', 'type'],
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'username', 'email'],
                },
                {
                    model: User,
                    as: 'blockedByUser',
                    attributes: ['id', 'username'],
                },
                {
                    model: ServerMember,
                    as: 'members',
                    attributes: ['id', 'role', 'joinedAt'],
                    include: [
                        {
                            model: User,
                            attributes: ['id', 'username', 'email'],
                        },
                    ],
                },
            ],
        });

        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден' });
        }

        res.json(server);
    } catch (error) {
        console.error('Ошибка получения сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Блокировка сервера
/**
 * @swagger
 * /api/admin/servers/{id}/block:
 *   post:
 *     tags: [Admin]
 *     summary: Заблокировать сервер
 *     description: Блокирует сервер с указанием причины
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - reason
 *           properties:
 *             reason:
 *               type: string
 *               minLength: 3
 *     responses:
 *       200:
 *         description: Сервер заблокирован
 *       400:
 *         description: Неверные параметры
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Сервер не найден
 */
router.post('/servers/:id/block', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const serverId = parseInt(req.params.id);

        // Валидация ID
        if (isNaN(serverId)) {
            return res.status(400).json({ error: 'Неверный ID сервера' });
        }

        const server = await Server.findByPk(serverId);

        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден' });
        }

        if (server.isBlocked) {
            return res.status(400).json({ error: 'Сервер уже заблокирован' });
        }

        // Валидация причины блокировки
        if (!reason || reason.trim().length < 3) {
            return res
                .status(400)
                .json({ error: 'Причина блокировки должна содержать минимум 3 символа' });
        }

        server.isBlocked = true;
        server.blockReason = reason.trim();
        server.blockedAt = new Date();
        server.blockedBy = req.user.userId;

        await server.save();

        // Возвращаем обновленный сервер с дополнительной информацией
        const updatedServer = await Server.findByPk(serverId, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'username', 'email'],
                },
                {
                    model: User,
                    as: 'blockedByUser',
                    attributes: ['id', 'username'],
                },
            ],
        });

        res.json({
            message: 'Сервер заблокирован',
            server: updatedServer,
        });
    } catch (error) {
        console.error('Ошибка блокировки сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Разблокировка сервера
/**
 * @swagger
 * /api/admin/servers/{id}/unblock:
 *   post:
 *     tags: [Admin]
 *     summary: Разблокировать сервер
 *     description: Снимает блокировку с сервера
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Сервер разблокирован
 *       400:
 *         description: Неверные параметры
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 *       404:
 *         description: Сервер не найден
 */
router.post('/servers/:id/unblock', authenticateToken, isAdmin, async (req, res) => {
    try {
        const serverId = parseInt(req.params.id);

        // Валидация ID
        if (isNaN(serverId)) {
            return res.status(400).json({ error: 'Неверный ID сервера' });
        }

        const server = await Server.findByPk(serverId);

        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден' });
        }

        if (!server.isBlocked) {
            return res.status(400).json({ error: 'Сервер не заблокирован' });
        }

        server.isBlocked = false;
        server.blockReason = null;
        server.blockedAt = null;
        server.blockedBy = null;

        await server.save();

        // Возвращаем обновленный сервер с дополнительной информацией
        const updatedServer = await Server.findByPk(serverId, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'username', 'email'],
                },
                {
                    model: User,
                    as: 'blockedByUser',
                    attributes: ['id', 'username'],
                },
            ],
        });

        res.json({
            message: 'Сервер разблокирован',
            server: updatedServer,
        });
    } catch (error) {
        console.error('Ошибка разблокировки сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Удаление сервера
router.delete('/servers/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const serverId = parseInt(req.params.id);

        // Валидация ID
        if (isNaN(serverId)) {
            return res.status(400).json({ error: 'Неверный ID сервера' });
        }

        const server = await Server.findByPk(serverId);

        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден' });
        }

        await server.destroy();

        res.json({ message: 'Сервер удален' });
    } catch (error) {
        console.error('Ошибка удаления сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера', details: error.message });
    }
});

// Получение логов системы
/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     tags: [Admin]
 *     summary: Получить логи системы
 *     description: Возвращает логи системы (заглушка)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Логи системы
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
router.get('/logs', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Здесь можно добавить логику получения логов из файла или базы данных
        const logs = {
            system: 'Логи системы будут здесь',
            errors: 'Логи ошибок будут здесь',
            access: 'Логи доступа будут здесь',
        };

        res.json(logs);
    } catch (error) {
        console.error('Ошибка получения логов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
