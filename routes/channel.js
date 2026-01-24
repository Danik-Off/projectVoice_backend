const express = require('express');

const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/checkRole');
const { Channel } = require('../models');
const { Permissions } = require('../utils/permissions');

const router = express.Router({ mergeParams: true });

// Получить все каналы по serverId
router.get('/:serverId/channels', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Channels']
    const { serverId } = req.params; // Получаем serverId из параметров
    try {
        const channels = await Channel.findAll({ where: { serverId } });
        res.status(200).json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать новый канал в указанном сервере
router.post(
    '/:serverId/channels',
    authenticateToken,
    requirePermission(Permissions.MANAGE_CHANNELS),
    async (req, res) => {
        // #swagger.tags = ['Channels']
        const { name, type } = req.body; // serverId теперь в URL
        const { serverId } = req.params; // Получаем serverId из параметров
        try {
            const newChannel = await Channel.create({ name, type, serverId });
            res.status(201).json(newChannel);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
);

// Получить канал по ID в рамках конкретного сервера
router.get('/:serverId/channels/:channelId', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Channels']
    const { channelId } = req.params;
    try {
        const channel = await Channel.findByPk(channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Канал не найден.' });
        }
        res.status(200).json(channel);
    } catch (error) {
        console.error('Ошибка при получении канала:', error);
        res.status(500).json({ error: 'Ошибка сервера.' });
    }
});

// Обновить канал по ID в рамках конкретного сервера
router.put(
    '/:serverId/channels/:channelId',
    authenticateToken,
    requirePermission(Permissions.MANAGE_CHANNELS),
    async (req, res) => {
        // #swagger.tags = ['Channels']
        const { name, type } = req.body;
        const { channelId } = req.params;
        try {
            const channel = await Channel.findByPk(channelId);
            if (!channel) {
                return res.status(404).json({ error: 'Канал не найден.' });
            }

            await channel.update({ name, type });
            res.status(200).json(channel);
        } catch (error) {
            console.error('Ошибка при обновлении канала:', error);
            res.status(400).json({ error: 'Ошибка при обновлении канала.' });
        }
    }
);

// Удалить канал по ID в рамках конкретного сервера
router.delete(
    '/:serverId/channels/:channelId',
    authenticateToken,
    requirePermission(Permissions.MANAGE_CHANNELS),
    async (req, res) => {
        // #swagger.tags = ['Channels']
        const { channelId } = req.params;
        try {
            const deleted = await Channel.destroy({
                where: { id: channelId },
            });
            if (deleted) {
                return res.status(204).send();
            }
            return res.status(404).json({ error: 'Канал не найден.' });
        } catch (error) {
            console.error('Ошибка при удалении канала:', error);
            res.status(500).json({ error: 'Ошибка сервера при удалении канала.' });
        }
    }
);

module.exports = router;
