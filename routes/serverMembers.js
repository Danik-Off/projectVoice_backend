const express = require('express');

const { authenticateToken } = require('../middleware/auth');
const { isServerOwner, requirePermission } = require('../middleware/checkRole');
const { ServerMember, User, Server, Role, MemberRole, ServerBan } = require('../models');
const { Permissions } = require('../utils/permissions');

const router = express.Router({ mergeParams: true });

// Получить всех участников сервера
router.get('/:serverId/members', authenticateToken, async (req, res) => {
    // #swagger.tags = ['ServerMembers']
    try {
        const membersData = await ServerMember.findAll({
            where: { serverId: req.params.serverId },
            attributes: ['id', 'userId', 'serverId', 'role', 'createdAt', 'updatedAt'],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'profilePicture'],
                },
                {
                    model: Role,
                    as: 'roles',
                    through: { attributes: [] },
                },
            ],
        });

        res.status(200).json(membersData);
    } catch (error) {
        console.error('Ошибка при получении участников:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Добавить нового участника в сервер
router.post(
    '/:serverId/members',
    authenticateToken,
    requirePermission(Permissions.MANAGE_GUILD),
    async (req, res) => {
        // #swagger.tags = ['ServerMembers']
        const { userId, role } = req.body;
        try {
            const server = await Server.findByPk(req.params.serverId);
            if (!server) {
                return res.status(404).json({ error: 'Сервер не найден.' });
            }

            const existingMember = await ServerMember.findOne({
                where: { userId, serverId: req.params.serverId },
            });

            if (existingMember) {
                return res
                    .status(400)
                    .json({ error: 'Пользователь уже является участником сервера.' });
            }

            const newMemberRole = role || 'member';
            if (!['member', 'moderator', 'admin'].includes(newMemberRole)) {
                return res.status(400).json({ error: 'Неверная роль.' });
            }

            const newMember = await ServerMember.create({
                userId,
                serverId: req.params.serverId,
                role: newMemberRole,
            });

            let targetRoleName = 'Member';
            if (newMemberRole === 'moderator') targetRoleName = 'Moderator';
            if (newMemberRole === 'admin') targetRoleName = 'Admin';

            const customRole = await Role.findOne({
                where: { serverId: req.params.serverId, name: targetRoleName },
            });

            if (customRole) {
                await MemberRole.create({
                    memberId: newMember.id,
                    roleId: customRole.id,
                });
            }

            res.status(201).json({
                member: newMember,
                assignedRole: customRole ? customRole.name : null,
            });
        } catch (error) {
            console.error('Ошибка при добавлении участника:', error);
            res.status(400).json({ error: 'Не удалось добавить участника.' });
        }
    }
);

// Обновить информацию об участнике сервера
router.put(
    '/:serverId/members/:memberId',
    authenticateToken,
    requirePermission(Permissions.MANAGE_ROLES),
    async (req, res) => {
        // #swagger.tags = ['ServerMembers']
        const { role } = req.body;
        try {
            const member = await ServerMember.findByPk(req.params.memberId);
            if (!member) {
                return res.status(404).json({ error: 'Участник не найден.' });
            }

            if (!['member', 'moderator', 'admin', 'owner'].includes(role)) {
                return res.status(400).json({ error: 'Неверная роль.' });
            }

            if (role === 'owner' && member.userId !== req.user.id) {
                return res
                    .status(403)
                    .json({ error: 'Только текущий владелец может назначить нового владельца.' });
            }

            await member.update({ role });
            res.status(200).json(member);
        } catch (error) {
            console.error('Ошибка при обновлении участника:', error);
            res.status(400).json({ error: 'Не удалось обновить участника.' });
        }
    }
);

// Удалить участника из сервера (Kick)
router.delete(
    '/:serverId/members/:memberId',
    authenticateToken,
    requirePermission(Permissions.KICK_MEMBERS),
    async (req, res) => {
        // #swagger.tags = ['ServerMembers']
        try {
            const member = await ServerMember.findOne({
                where: { id: req.params.memberId, serverId: req.params.serverId },
            });

            if (!member) {
                return res.status(404).json({ error: 'Участник не найден.' });
            }

            if (member.role === 'owner') {
                return res.status(403).json({ error: 'Нельзя исключить владельца сервера.' });
            }

            await member.destroy();
            res.status(204).send();
        } catch (error) {
            console.error('Ошибка при исключении участника:', error);
            res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
        }
    }
);

// Забанить участника (Ban)
router.post(
    '/:serverId/members/:memberId/ban',
    authenticateToken,
    requirePermission(Permissions.BAN_MEMBERS),
    async (req, res) => {
        // #swagger.tags = ['ServerMembers']
        const { reason } = req.body;
        const { serverId, memberId } = req.params;

        try {
            const member = await ServerMember.findOne({
                where: { id: memberId, serverId },
            });

            if (!member) {
                return res.status(404).json({ error: 'Участник не найден.' });
            }

            if (member.role === 'owner') {
                return res.status(403).json({ error: 'Нельзя забанить владельца сервера.' });
            }

            await ServerBan.create({
                serverId,
                userId: member.userId,
                reason: reason || 'Причина не указана',
                bannedBy: req.user.id,
            });

            await member.destroy();

            res.status(200).json({ message: 'Пользователь был забанен.' });
        } catch (error) {
            console.error('Ошибка при бане участника:', error);
            res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
        }
    }
);

// Управление голосом (Mute/Deafen)
router.patch(
    '/:serverId/members/:memberId/voice',
    authenticateToken,
    requirePermission(Permissions.MUTE_MEMBERS),
    async (req, res) => {
        // #swagger.tags = ['ServerMembers']
        const { isMuted, isDeafened } = req.body;
        const { serverId, memberId } = req.params;

        try {
            const member = await ServerMember.findOne({ where: { id: memberId, serverId } });
            if (!member) return res.status(404).json({ error: 'Участник не найден.' });

            const updateData = {};
            if (isMuted !== undefined) updateData.isMuted = isMuted;
            if (isDeafened !== undefined) updateData.isDeafened = isDeafened;

            await member.update(updateData);
            res.status(200).json(member);
        } catch (error) {
            console.error('Ошибка при управлении голосом:', error);
            res.status(400).json({ error: 'Не удалось обновить настройки голоса.' });
        }
    }
);

// Установить нового владельца сервера
router.post('/:serverId/owner', authenticateToken, isServerOwner, async (req, res) => {
    // #swagger.tags = ['ServerMembers']
    try {
        const server = await Server.findByPk(req.params.serverId);
        if (!server) {
            return res.status(404).json({ error: 'Сервер не найден.' });
        }

        server.ownerId = req.body.userId;
        await server.save();

        res.status(200).json({ message: 'Владелец сервера успешно изменен.' });
    } catch (error) {
        console.error('Ошибка при смене владельца:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

module.exports = router;
