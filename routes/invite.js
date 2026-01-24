const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { authenticateToken } = require('../middleware/auth');
const { Invite, Server, ServerMember, Role, MemberRole, ServerBan } = require('../models');

const router = express.Router();

// Создать приглашение на сервер
router.post('/:serverId/invite', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Invites']
    const { expiresAt, maxUses } = req.body;

    try {
        const server = await Server.findByPk(req.params.serverId);

        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден.' });
        }

        // Проверяем права пользователя на сервере
        const member = await ServerMember.findOne({
            where: {
                userId: req.user.userId,
                serverId: req.params.serverId,
            },
        });

        if (!member || !['owner', 'admin', 'moderator'].includes(member.role)) {
            return res
                .status(403)
                .json({ error: 'У вас недостаточно прав для создания приглашений.' });
        }

        const token = uuidv4();
        const invite = await Invite.create({
            token,
            serverId: req.params.serverId,
            createdBy: req.user.userId,
            expiresAt,
            maxUses,
            uses: 0,
        });

        res.status(201).json({
            invite: {
                id: invite.id,
                token: invite.token,
                serverId: invite.serverId,
                createdBy: invite.createdBy,
                maxUses: invite.maxUses,
                uses: invite.uses,
                expiresAt: invite.expiresAt,
                createdAt: invite.createdAt,
            },
        });
    } catch (error) {
        console.error('Ошибка при создании приглашения:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Принять приглашение (публичный роут для получения инфо)
router.get('/invite/:token', async (req, res) => {
    // #swagger.tags = ['Invites']
    try {
        const invite = await Invite.findOne({
            where: { token: req.params.token },
        });

        if (!invite) {
            return res.status(404).json({ error: 'Приглашение не найдено или истекло.' });
        }

        if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
            return res.status(400).json({ error: 'Срок действия приглашения истек.' });
        }

        if (invite.maxUses && invite.uses >= invite.maxUses) {
            return res
                .status(400)
                .json({ error: 'Приглашение достигло максимального количества использований.' });
        }

        const server = await Server.findByPk(invite.serverId);
        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден.' });
        }

        res.status(200).json({
            invite: {
                id: invite.id,
                token: invite.token,
                serverId: invite.serverId,
                maxUses: invite.maxUses,
                uses: invite.uses,
                expiresAt: invite.expiresAt,
            },
            server: {
                id: server.id,
                name: server.name,
                description: server.description,
                icon: server.icon,
            },
        });
    } catch (error) {
        console.error('Ошибка при получении приглашения:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Принять приглашение (для аутентифицированных пользователей)
router.post('/invite/:token/accept', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Invites']
    try {
        const invite = await Invite.findOne({
            where: { token: req.params.token },
        });

        if (!invite) {
            return res.status(404).json({ error: 'Приглашение не найдено или истекло.' });
        }

        if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
            return res.status(400).json({ error: 'Срок действия приглашения истек.' });
        }

        if (invite.maxUses && invite.uses >= invite.maxUses) {
            return res
                .status(400)
                .json({ error: 'Приглашение достигло максимального количества использований.' });
        }

        const isBanned = await ServerBan.findOne({
            where: { serverId: invite.serverId, userId: req.user.userId },
        });

        if (isBanned) {
            return res.status(403).json({ error: 'Вы забанены на этом сервере.' });
        }

        const existingMember = await ServerMember.findOne({
            where: { userId: req.user.userId, serverId: invite.serverId },
        });

        if (existingMember) {
            return res.status(400).json({ error: 'Вы уже являетесь участником этого сервера.' });
        }

        const member = await ServerMember.create({
            userId: req.user.userId,
            serverId: invite.serverId,
            role: 'member',
        });

        const memberRole = await Role.findOne({
            where: { serverId: invite.serverId, name: 'Member' },
        });

        if (memberRole) {
            await MemberRole.create({
                memberId: member.id,
                roleId: memberRole.id,
            });
        }

        invite.uses += 1;
        await invite.save();

        res.status(200).json({
            message: 'Вы успешно присоединились к серверу.',
            member: member,
            assignedRole: memberRole ? memberRole.name : null,
        });
    } catch (error) {
        console.error('Ошибка при принятии приглашения:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Получить все приглашения сервера
router.get('/:serverId/invites', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Invites']
    try {
        const member = await ServerMember.findOne({
            where: {
                userId: req.user.userId,
                serverId: req.params.serverId,
            },
        });

        if (!member || !['owner', 'admin', 'moderator'].includes(member.role)) {
            return res
                .status(403)
                .json({ error: 'У вас недостаточно прав для просмотра приглашений.' });
        }

        const invites = await Invite.findAll({
            where: { serverId: req.params.serverId },
            order: [['createdAt', 'DESC']],
        });

        res.status(200).json(invites);
    } catch (error) {
        console.error('Ошибка при получении списка приглашений:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Удалить приглашение
router.delete('/:inviteId', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Invites']
    try {
        const invite = await Invite.findByPk(req.params.inviteId);

        if (!invite) {
            return res.status(404).json({ error: 'Приглашение не найдено.' });
        }

        const member = await ServerMember.findOne({
            where: {
                userId: req.user.userId,
                serverId: invite.serverId,
            },
        });

        if (!member || !['owner', 'admin'].includes(member.role)) {
            return res
                .status(403)
                .json({ error: 'У вас недостаточно прав для удаления приглашений.' });
        }

        await invite.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('Ошибка при удалении приглашения:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

module.exports = router;
