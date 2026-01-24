const express = require('express');

const { authenticateToken } = require('../middleware/auth'); // JWT middleware для проверки токена
const { User } = require('../models');

const router = express.Router();

// Получить информацию о пользователе по ID
router.get('/', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Users']
    try {
        const user = await User.findByPk(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден.' });
        }

        res.status(200).json({
            id: user.id,
            username: user.username,
            profilePicture: user.profilePicture,
            bio: user.bio,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
});

// Получить информацию о пользователе по ID
router.get('/:id', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Users']
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден.' });
        }

        res.status(200).json({
            id: user.id,
            name: user.username,
            profilePicture: user.profilePicture,
            bio: user.bio,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
});

// Обновить информацию о авторизованном пользователе
router.put('/', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Users']
    const { username, profilePicture, bio } = req.body;
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден.' });
        }

        if (username) user.username = username;
        if (bio !== undefined) user.bio = bio;
        if (profilePicture) user.profilePicture = profilePicture;

        await user.save();

        return res.status(200).json({
            id: user.id,
            username: user.username,
            profilePicture: user.profilePicture,
            bio: user.bio,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });
    } catch (error) {
        console.error('Ошибка при обновлении данных пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
});

// Удалить аккаунт
router.delete('/', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Users']
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден.' });
        }
        await user.destroy();
        res.status(200).json({ message: 'Аккаунт успешно удален.' });
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
});

module.exports = router;
