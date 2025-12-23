const express = require('express');
const router = express.Router();
const { Message, User, Channel } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// Получение сообщений канала с пагинацией
/**
 * @swagger
 * /api/messages:
 *   get:
 *     tags: [Messages]
 *     summary: Получить сообщения канала
 *     description: Возвращает список сообщений указанного канала с поддержкой пагинации
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: channelId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID канала
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
 *           default: 50
 *         description: Количество сообщений на странице
 *     responses:
 *       200:
 *         description: Список сообщений
 *         schema:
 *           type: object
 *           properties:
 *             messages:
 *               type: array
 *               items:
 *                 $ref: '#/definitions/Message'
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 *       400:
 *         description: Неверные параметры запроса
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { channelId, page = 1, limit = 50 } = req.query;
        
        if (!channelId) {
            return res.status(400).json({ error: 'channelId is required' });
        }

        const offset = (page - 1) * limit;
        
        const { count, rows: messages } = await Message.findAndCountAll({
            where: { channelId: parseInt(channelId) },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'profilePicture']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        // Преобразуем сообщения для фронтенда
        const formattedMessages = messages.reverse().map(message => ({
            id: message.id,
            content: message.text, // Преобразуем text в content
            userId: message.userId,
            channelId: message.channelId,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            user: {
                id: message.user.id,
                username: message.user.username,
                avatar: message.user.profilePicture // Преобразуем profilePicture в avatar
            },
            isEdited: message.updatedAt > message.createdAt
        }));

        const totalPages = Math.ceil(count / limit);

        res.json({
            messages: formattedMessages,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание нового сообщения
/**
 * @swagger
 * /api/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Создать новое сообщение
 *     description: Создает новое сообщение в указанном канале
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - content
 *             - channelId
 *           properties:
 *             content:
 *               type: string
 *               description: Текст сообщения
 *             channelId:
 *               type: integer
 *               description: ID канала
 *     responses:
 *       201:
 *         description: Сообщение успешно создано
 *         schema:
 *           $ref: '#/definitions/Message'
 *       400:
 *         description: Неверные параметры запроса
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Канал не найден
 *       500:
 *         description: Ошибка сервера
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { content, channelId } = req.body;
        
        console.log('Creating message:', { content, channelId, user: req.user });
        
        if (!content || !channelId) {
            return res.status(400).json({ error: 'content and channelId are required' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'User not authenticated properly' });
        }

        // Проверяем, что канал существует
        const channel = await Channel.findByPk(channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        const message = await Message.create({
            text: content,
            userId: req.user.id,
            channelId: parseInt(channelId)
        });

        // Получаем сообщение с данными пользователя
        const messageWithUser = await Message.findByPk(message.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'profilePicture']
                }
            ]
        });

        // Форматируем сообщение для фронтенда
        const formattedMessage = {
            id: messageWithUser.id,
            content: messageWithUser.text,
            userId: messageWithUser.userId,
            channelId: messageWithUser.channelId,
            createdAt: messageWithUser.createdAt,
            updatedAt: messageWithUser.updatedAt,
            user: {
                id: messageWithUser.user.id,
                username: messageWithUser.user.username,
                avatar: messageWithUser.user.profilePicture // Преобразуем profilePicture в avatar
            },
            isEdited: false
        };

        res.status(201).json(formattedMessage);
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновление сообщения
/**
 * @swagger
 * /api/messages/{id}:
 *   put:
 *     tags: [Messages]
 *     summary: Обновить сообщение
 *     description: Обновляет текст существующего сообщения. Только автор сообщения или модератор могут редактировать
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID сообщения
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - content
 *           properties:
 *             content:
 *               type: string
 *               description: Новый текст сообщения
 *     responses:
 *       200:
 *         description: Сообщение успешно обновлено
 *         schema:
 *           $ref: '#/definitions/Message'
 *       400:
 *         description: Неверные параметры запроса
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав для редактирования
 *       404:
 *         description: Сообщение не найдено
 *       500:
 *         description: Ошибка сервера
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'content is required' });
        }

        const message = await Message.findByPk(id);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Проверяем права на редактирование
        if (message.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
            return res.status(403).json({ error: 'You can only edit your own messages' });
        }

        await message.update({ text: content });

        // Получаем обновленное сообщение с данными пользователя
        const updatedMessage = await Message.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'profilePicture']
                }
            ]
        });

        // Форматируем сообщение для фронтенда
        const formattedMessage = {
            id: updatedMessage.id,
            content: updatedMessage.text,
            userId: updatedMessage.userId,
            channelId: updatedMessage.channelId,
            createdAt: updatedMessage.createdAt,
            updatedAt: updatedMessage.updatedAt,
            user: {
                id: updatedMessage.user.id,
                username: updatedMessage.user.username,
                avatar: updatedMessage.user.profilePicture // Преобразуем profilePicture в avatar
            },
            isEdited: true
        };

        res.json(formattedMessage);
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удаление сообщения
/**
 * @swagger
 * /api/messages/{id}:
 *   delete:
 *     tags: [Messages]
 *     summary: Удалить сообщение
 *     description: Удаляет сообщение. Только автор сообщения или модератор могут удалять
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID сообщения
 *     responses:
 *       204:
 *         description: Сообщение успешно удалено
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав для удаления
 *       404:
 *         description: Сообщение не найдено
 *       500:
 *         description: Ошибка сервера
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const message = await Message.findByPk(id);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Проверяем права на удаление
        if (message.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'moderator') {
            return res.status(403).json({ error: 'You can only delete your own messages' });
        }

        await message.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Поиск сообщений
/**
 * @swagger
 * /api/messages/search:
 *   get:
 *     tags: [Messages]
 *     summary: Поиск сообщений
 *     description: Поиск сообщений в канале по тексту с поддержкой пагинации
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Поисковый запрос
 *       - in: query
 *         name: channelId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID канала
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
 *           default: 50
 *         description: Количество результатов на странице
 *     responses:
 *       200:
 *         description: Результаты поиска
 *         schema:
 *           type: object
 *           properties:
 *             messages:
 *               type: array
 *               items:
 *                 $ref: '#/definitions/Message'
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 *       400:
 *         description: Неверные параметры запроса
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Ошибка сервера
 */
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { query, channelId, page = 1, limit = 50 } = req.query;
        
        if (!query || !channelId) {
            return res.status(400).json({ error: 'query and channelId are required' });
        }

        const offset = (page - 1) * limit;
        
        const { count, rows: messages } = await Message.findAndCountAll({
            where: {
                channelId: parseInt(channelId),
                text: {
                    [Op.iLike]: `%${query}%`
                }
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'profilePicture']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        // Преобразуем сообщения для фронтенда
        const formattedMessages = messages.reverse().map(message => ({
            id: message.id,
            content: message.text,
            userId: message.userId,
            channelId: message.channelId,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            user: {
                id: message.user.id,
                username: message.user.username,
                avatar: message.user.profilePicture // Преобразуем profilePicture в avatar
            },
            isEdited: message.updatedAt > message.createdAt
        }));

        const totalPages = Math.ceil(count / limit);

        res.json({
            messages: formattedMessages,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages
        });
    } catch (error) {
        console.error('Error searching messages:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 