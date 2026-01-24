const express = require('express');

const DiscordStyles = require('../config/discord.config');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/checkRole');
const { Server, User, Channel, ServerMember, Message, Role, MemberRole } = require('../models');
const { Permissions } = require('../utils/permissions');

const router = express.Router();

// Получить все серверы (только незаблокированные)
router.get('/', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Servers']
    try {
        const servers = await Server.findAll({
            where: {
                isBlocked: false, // Показываем только незаблокированные серверы
            },
            include: [
                {
                    model: ServerMember,
                    as: 'members',
                    where: { userId: req.user.userId },
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'profilePicture'],
                        },
                    ],
                },
                {
                    model: Channel,
                    as: 'channels',
                },
            ],
        });
        res.status(200).json(servers);
    } catch (error) {
        console.error('Ошибка при получении серверов:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Создать новый сервер и добавить создателя как владельца
router.post('/', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Servers']
    const { name, description, icon } = req.body;
    try {
        // Создаем новый сервер
        const newServer = await Server.create({
            name,
            ownerId: req.user.userId,
            description,
            icon,
        });

        // Создаем все базовые роли из глобального конфига
        const createdRoles = [];
        for (const roleDef of DiscordStyles.defaultRoles) {
            const role = await Role.create({
                serverId: newServer.id,
                ...roleDef,
            });
            createdRoles.push(role);
        }

        // Находим роль Owner для назначения создателю
        const ownerRole = createdRoles.find((r) => r.name === 'Owner');

        // Добавляем создателя как участника
        const member = await ServerMember.create({
            userId: req.user.userId,
            serverId: newServer.id,
            role: 'owner',
        });

        // Присваиваем создателю роль Owner
        if (ownerRole) {
            await MemberRole.create({
                memberId: member.id,
                roleId: ownerRole.id,
            });
        }

        res.status(201).json({
            server: newServer,
            roles: createdRoles,
        });
    } catch (error) {
        console.error('Ошибка при создании сервера:', error);
        res.status(400).json({
            error: 'Не удалось создать сервер. Проверьте правильность данных.',
        });
    }
});

// Получить сервер по ID и его каналы
router.get('/:id', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Servers']
    try {
        const server = await Server.findByPk(req.params.id, {
            include: [
                {
                    model: ServerMember,
                    as: 'members',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'profilePicture'],
                        },
                    ],
                },
                {
                    model: Channel,
                    as: 'channels',
                },
                {
                    model: Role,
                    as: 'roles',
                },
                {
                    model: User,
                    as: 'blockedByUser',
                    attributes: ['id', 'username'],
                },
            ],
        });

        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден.' });
        }

        // Если сервер заблокирован, возвращаем информацию о блокировке
        if (server.isBlocked) {
            return res.status(403).json({
                error: 'Сервер заблокирован.',
                server: {
                    id: server.id,
                    name: server.name,
                    isBlocked: server.isBlocked,
                    blockReason: server.blockReason,
                    blockedAt: server.blockedAt,
                    blockedBy: server.blockedByUser
                        ? {
                              id: server.blockedByUser.id,
                              username: server.blockedByUser.username,
                          }
                        : null,
                },
            });
        }

        res.status(200).json(server);
    } catch (error) {
        console.error('Ошибка при получении сервера:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Обновить сервер по ID
router.put(
    '/:id',
    authenticateToken,
    requirePermission(Permissions.MANAGE_GUILD),
    async (req, res) => {
        // #swagger.tags = ['Servers']
        const { name, description, icon } = req.body;
        try {
            const server = await Server.findByPk(req.params.id);
            if (!server) return res.status(404).json({ error: 'Сервер не найден.' });
            await server.update({ name, description, icon });
            res.status(200).json(server);
        } catch (error) {
            console.error('Ошибка при обновлении сервера:', error);
            res.status(400).json({ error: 'Не удалось обновить сервер.' });
        }
    }
);

// Удалить сервер по ID, включая все связи участников
router.delete(
    '/:id',
    authenticateToken,
    requirePermission(Permissions.ADMINISTRATOR),
    async (req, res) => {
        // #swagger.tags = ['Servers']
        try {
            const serverId = req.params.id;
            const server = await Server.findByPk(serverId);

            if (!server) {
                return res.status(404).json({ error: 'Сервер не найден.' });
            }

            console.log(`Удаление сервера с ID: ${serverId}`);

            // Получаем все каналы сервера
            const channels = await Channel.findAll({ where: { serverId } });
            const channelIds = channels.map((channel) => channel.id);

            // Удаляем все сообщения в каналах сервера
            if (channelIds.length > 0) {
                await Message.destroy({ where: { channelId: channelIds } });
            }

            // Удаляем все каналы сервера
            await Channel.destroy({ where: { serverId } });

            // Удаляем все связи участников сервера
            await ServerMember.destroy({ where: { serverId } });

            // Удаляем сервер
            await server.destroy();
            console.log('Сервер успешно удален');

            res.status(204).send();
        } catch (error) {
            console.error('Ошибка удаления сервера:', error);
            res.status(500).json({ error: 'Ошибка сервера при удалении.' });
        }
    }
);

module.exports = router;
