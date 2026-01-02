const express = require('express');
const { ServerMember, User, Server, Role, MemberRole, ServerBan } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin, isServerOwner, isModerator, requirePermission } = require('../middleware/checkRole'); 
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
                    through: { attributes: [] }
                }
            ],
        });

        const members = membersData.map((member) => ({
            id: member.id,
            userId: member.userId,
            serverId: member.serverId,
            role: member.role,
            user: member.user,
            roles: member.roles,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
        }));

        res.status(200).json(members);
    } catch (error) {
        if (error.name === 'SequelizeDatabaseError') {
            res.status(400).json({ error: 'Database error occurred' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Добавить нового участника в сервер
router.post('/:serverId/members', authenticateToken, isModerator, async (req, res) => {
    const { userId, role } = req.body;
    // #swagger.tags = ['ServerMembers']
    try {
        const server = await Server.findByPk(req.params.serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (userId === server.ownerId) {
            return res.status(400).json({ error: 'User is already the owner of the server' });
        }

        // Проверка на существование участника
        const existingMember = await ServerMember.findOne({
            where: { userId, serverId: req.params.serverId },
        });

        if (existingMember) {
            return res.status(400).json({ error: 'User is already a member of the server' });
        }

        const newMemberRole = role || 'member';

        if (!['member', 'moderator', 'admin'].includes(newMemberRole)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const newMember = await ServerMember.create({
            userId,
            serverId: req.params.serverId,
            role: newMemberRole,
        });

        // Автоматическое назначение роли в зависимости от переданной роли
        let targetRoleName = 'Member';
        if (newMemberRole === 'moderator') targetRoleName = 'Moderator';
        if (newMemberRole === 'admin') targetRoleName = 'Admin';

        const customRole = await Role.findOne({
            where: {
                serverId: req.params.serverId,
                name: targetRoleName
            }
        });

        if (customRole) {
            await MemberRole.create({
                memberId: newMember.id,
                roleId: customRole.id
            });
        }

        res.status(201).json({
            member: newMember,
            assignedRole: customRole ? customRole.name : null
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Обновить информацию об участнике сервера
router.put('/:serverId/members/:memberId', authenticateToken, isAdmin, async (req, res) => {
    // #swagger.tags = ['ServerMembers']
    const { role } = req.body;

    try {
        const member = await ServerMember.findByPk(req.params.memberId);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (!['member', 'moderator', 'admin', 'owner'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        if (role === 'owner' && member.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Only the current owner can assign a new owner' });
        }

        await member.update({ role });
        res.status(200).json(member);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Удалить участника из сервера (Kick)
router.delete('/:serverId/members/:memberId', authenticateToken, requirePermission(Permissions.KICK_MEMBERS), async (req, res) => {
    // #swagger.tags = ['ServerMembers']
    try {
        const member = await ServerMember.findOne({
            where: { id: req.params.memberId, serverId: req.params.serverId }
        });

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        // Нельзя кикнуть владельца
        if (member.role === 'owner') {
            return res.status(403).json({ error: 'Cannot kick the server owner' });
        }

        await member.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Забанить участника (Ban)
router.post('/:serverId/members/:memberId/ban', authenticateToken, requirePermission(Permissions.BAN_MEMBERS), async (req, res) => {
    // #swagger.tags = ['ServerMembers']
    const { reason } = req.body;
    const { serverId, memberId } = req.params;

    try {
        const member = await ServerMember.findOne({
            where: { id: memberId, serverId }
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (member.role === 'owner') {
            return res.status(403).json({ error: 'Cannot ban the server owner' });
        }

        // Создаем запись о бане
        await ServerBan.create({
            serverId,
            userId: member.userId,
            reason: reason || 'No reason provided',
            adminId: req.user.userId
        });

        // Удаляем участника с сервера
        await member.destroy();

        res.status(200).json({ message: 'User has been banned' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Управление голосом (Mute/Deafen)
router.patch('/:serverId/members/:memberId/voice', authenticateToken, requirePermission(Permissions.MUTE_MEMBERS), async (req, res) => {
    // #swagger.tags = ['ServerMembers']
    const { isMuted, isDeafened } = req.body;
    const { serverId, memberId } = req.params;

    try {
        const member = await ServerMember.findOne({ where: { id: memberId, serverId } });
        if (!member) return res.status(404).json({ error: 'Member not found' });

        const updateData = {};
        if (isMuted !== undefined) updateData.isMuted = isMuted;
        if (isDeafened !== undefined) updateData.isDeafened = isDeafened;

        await member.update(updateData);
        res.status(200).json(member);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Установить нового владельца сервера
router.post('/:serverId/owner', authenticateToken, isServerOwner, async (req, res) => {
    // #swagger.tags = ['ServerMembers']
    try {
        const server = await Server.findByPk(req.params.serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Проверяем, является ли пользователь владельцем сервера по полю ownerId
        const isOwnerByField = server.ownerId === req.user.userId;
        
        // Проверяем, является ли пользователь владельцем сервера по роли в ServerMembers
        const member = await ServerMember.findOne({
            where: {
                serverId: req.params.serverId,
                userId: req.user.userId,
                role: 'owner'
            }
        });
        const isOwnerByRole = !!member;

        if (!isOwnerByField && !isOwnerByRole) {
            return res.status(403).json({ error: 'Only the owner can add an owner' });
        }

        server.ownerId = req.body.userId;
        await server.save();

        await ServerMember.create({
            userId: req.body.userId,
            serverId: req.params.serverId,
            role: 'owner',
        });

        res.status(200).json({ message: 'New owner added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
