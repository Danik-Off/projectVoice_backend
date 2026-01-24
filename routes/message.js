const express = require('express');
const { Op } = require('sequelize');

const { authenticateToken } = require('../middleware/auth');
const { Message, User, Channel } = require('../models');

const router = express.Router();

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
 *       400:
 *         description: Неверные параметры запроса
 *       404:
 *         description: Канал не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { channelId, page = 1, limit = 50 } = req.query;

        if (!channelId) {
            return res.status(400).json({ error: 'Параметр channelId обязателен.' });
        }

        const channel = await Channel.findByPk(channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Канал не найден.' });
        }

        const offset = (page - 1) * limit;

        const { count, rows: messages } = await Message.findAndCountAll({
            where: { channelId: parseInt(channelId) },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'profilePicture'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset,
        });

        const formattedMessages = messages.reverse().map((message) => ({
            id: message.id,
            content: message.text,
            userId: message.userId,
            channelId: message.channelId,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            user: {
                id: message.user.id,
                username: message.user.username,
                avatar: message.user.profilePicture,
            },
            isEdited: message.updatedAt > message.createdAt,
        }));

        res.status(200).json({
            messages: formattedMessages,
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('Ошибка при получении сообщений:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Создание нового сообщения
/**
 * @swagger
 * /api/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Создать новое сообщение
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { content, channelId } = req.body;

        if (!content || !channelId) {
            return res.status(400).json({ error: 'Параметры content и channelId обязательны.' });
        }

        const channel = await Channel.findByPk(channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Канал не найден.' });
        }

        const message = await Message.create({
            text: content,
            userId: req.user.id,
            channelId: parseInt(channelId),
        });

        const messageWithUser = await Message.findByPk(message.id, {
            include: [
                { model: User, as: 'user', attributes: ['id', 'username', 'profilePicture'] },
            ],
        });

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
                avatar: messageWithUser.user.profilePicture,
            },
            isEdited: false,
        };

        res.status(201).json(formattedMessage);
    } catch (error) {
        console.error('Ошибка при создании сообщения:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Обновление сообщения
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Параметр content обязателен.' });
        }

        const message = await Message.findByPk(id);
        if (!message) {
            return res.status(404).json({ error: 'Сообщение не найдено.' });
        }

        if (
            message.userId !== req.user.id &&
            req.user.role !== 'admin' &&
            req.user.role !== 'moderator'
        ) {
            return res
                .status(403)
                .json({ error: 'У вас недостаточно прав для редактирования этого сообщения.' });
        }

        await message.update({ text: content });

        const updatedMessage = await Message.findByPk(id, {
            include: [
                { model: User, as: 'user', attributes: ['id', 'username', 'profilePicture'] },
            ],
        });

        res.status(200).json({
            id: updatedMessage.id,
            content: updatedMessage.text,
            userId: updatedMessage.userId,
            channelId: updatedMessage.channelId,
            createdAt: updatedMessage.createdAt,
            updatedAt: updatedMessage.updatedAt,
            user: {
                id: updatedMessage.user.id,
                username: updatedMessage.user.username,
                avatar: updatedMessage.user.profilePicture,
            },
            isEdited: true,
        });
    } catch (error) {
        console.error('Ошибка при обновлении сообщения:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Удаление сообщения
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Message.findByPk(id);

        if (!message) {
            return res.status(404).json({ error: 'Сообщение не найдено.' });
        }

        if (
            message.userId !== req.user.id &&
            req.user.role !== 'admin' &&
            req.user.role !== 'moderator'
        ) {
            return res
                .status(403)
                .json({ error: 'У вас недостаточно прав для удаления этого сообщения.' });
        }

        await message.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('Ошибка при удалении сообщения:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Поиск сообщений
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { query, channelId, page = 1, limit = 50 } = req.query;

        if (!query || !channelId) {
            return res.status(400).json({ error: 'Параметры query и channelId обязательны.' });
        }

        const { count, rows: messages } = await Message.findAndCountAll({
            where: {
                channelId: parseInt(channelId),
                text: { [Op.iLike]: `%${query}%` },
            },
            include: [
                { model: User, as: 'user', attributes: ['id', 'username', 'profilePicture'] },
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (page - 1) * limit,
        });

        res.status(200).json({
            messages: messages.map((m) => ({
                id: m.id,
                content: m.text,
                userId: m.userId,
                channelId: m.channelId,
                user: { id: m.user.id, username: m.user.username, avatar: m.user.profilePicture },
            })),
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('Ошибка при поиске сообщений:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

module.exports = router;
