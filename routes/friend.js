const express = require('express');
const { Op } = require('sequelize');

const { authenticateToken } = require('../middleware/auth');
const { Friendship, User } = require('../models');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: API для управления друзьями и запросами в друзья
 */

// 1. Получить список друзей (принятые)
router.get('/', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Friends']
    try {
        const friendships = await Friendship.findAll({
            where: {
                [Op.or]: [{ userId: req.user.id }, { friendId: req.user.id }],
                status: 'accepted',
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'profilePicture', 'status', 'tag'],
                },
                {
                    model: User,
                    as: 'friend',
                    attributes: ['id', 'username', 'profilePicture', 'status', 'tag'],
                },
            ],
        });

        const friends = friendships.map((f) => {
            return f.userId === req.user.id ? f.friend : f.user;
        });

        res.status(200).json(friends);
    } catch (error) {
        console.error('Ошибка при получении списка друзей:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// 2. Получить список входящих/исходящих запросов
router.get('/requests', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Friends']
    try {
        const incoming = await Friendship.findAll({
            where: { friendId: req.user.id, status: 'pending' },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'profilePicture', 'tag'],
                },
            ],
        });

        const outgoing = await Friendship.findAll({
            where: { userId: req.user.id, status: 'pending' },
            include: [
                {
                    model: User,
                    as: 'friend',
                    attributes: ['id', 'username', 'profilePicture', 'tag'],
                },
            ],
        });

        res.status(200).json({
            incoming: incoming.map((f) => ({ id: f.id, user: f.user, createdAt: f.createdAt })),
            outgoing: outgoing.map((f) => ({ id: f.id, user: f.friend, createdAt: f.createdAt })),
        });
    } catch (error) {
        console.error('Ошибка при получении запросов в друзья:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// 3. Отправить запрос в друзья (по ID или по тегу/имени - сделаем по ID для начала)
router.post('/request', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Friends']
    const { friendId } = req.body;

    if (friendId === req.user.id) {
        return res.status(400).json({ error: 'Вы не можете добавить самого себя в друзья.' });
    }

    try {
        const targetUser = await User.findByPk(friendId);
        if (!targetUser) {
            return res.status(404).json({ error: 'Пользователь не найден.' });
        }

        const existingFriendship = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { userId: req.user.id, friendId: friendId },
                    { userId: friendId, friendId: req.user.id },
                ],
            },
        });

        if (existingFriendship) {
            if (existingFriendship.status === 'accepted') {
                return res.status(400).json({ error: 'Вы уже друзья.' });
            }
            if (existingFriendship.status === 'blocked') {
                return res.status(403).json({ error: 'Пользователь заблокирован.' });
            }
            if (existingFriendship.userId === req.user.id) {
                return res.status(400).json({ error: 'Запрос уже отправлен.' });
            } else {
                return res
                    .status(400)
                    .json({ error: 'Этот пользователь уже отправил вам запрос.' });
            }
        }

        const request = await Friendship.create({
            userId: req.user.id,
            friendId: friendId,
            status: 'pending',
        });

        res.status(201).json({ message: 'Запрос в друзья отправлен.', request });
    } catch (error) {
        console.error('Ошибка при отправке запроса в друзья:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// 4. Принять запрос в друзья
router.post('/accept/:requestId', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Friends']
    try {
        const friendship = await Friendship.findOne({
            where: { id: req.params.requestId, friendId: req.user.id, status: 'pending' },
        });

        if (!friendship) {
            return res.status(404).json({ error: 'Запрос в друзья не найден.' });
        }

        await friendship.update({ status: 'accepted' });

        res.status(200).json({ message: 'Запрос в друзья принят.' });
    } catch (error) {
        console.error('Ошибка при принятии запроса в друзья:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// 5. Отклонить запрос или удалить из друзей
router.delete('/:id', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Friends']
    try {
        // id может быть либо ID дружбы, либо ID пользователя. Сделаем универсально по ID дружбы или поиску по ID друга.
        const friendship = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { id: req.params.id },
                    { userId: req.user.id, friendId: req.params.id },
                    { userId: req.params.id, friendId: req.user.id },
                ],
            },
        });

        if (!friendship) {
            return res.status(404).json({ error: 'Дружба или запрос не найдены.' });
        }

        // Проверяем, что текущий пользователь участвует в этой дружбе
        if (friendship.userId !== req.user.id && friendship.friendId !== req.user.id) {
            return res.status(403).json({ error: 'У вас нет прав для этого действия.' });
        }

        await friendship.destroy();
        res.status(200).json({ message: 'Друг удален или запрос отклонен.' });
    } catch (error) {
        console.error('Ошибка при удалении друга:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// 6. Заблокировать пользователя
router.post('/block/:targetUserId', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Friends']
    const { targetUserId } = req.params;

    if (targetUserId === req.user.id) {
        return res.status(400).json({ error: 'Вы не можете заблокировать самого себя.' });
    }

    try {
        const [friendship, created] = await Friendship.findOrCreate({
            where: {
                userId: req.user.id,
                friendId: targetUserId,
            },
            defaults: {
                status: 'blocked',
            },
        });

        if (!created) {
            await friendship.update({
                status: 'blocked',
                userId: req.user.id,
                friendId: targetUserId,
            });
        }

        res.status(200).json({ message: 'Пользователь заблокирован.' });
    } catch (error) {
        console.error('Ошибка при блокировке пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// 7. Список заблокированных
router.get('/blocked', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Friends']
    try {
        const blockedList = await Friendship.findAll({
            where: { userId: req.user.id, status: 'blocked' },
            include: [
                {
                    model: User,
                    as: 'friend',
                    attributes: ['id', 'username', 'profilePicture', 'tag'],
                },
            ],
        });

        res.status(200).json(blockedList.map((b) => b.friend));
    } catch (error) {
        console.error('Ошибка при получении списка заблокированных:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

module.exports = router;
