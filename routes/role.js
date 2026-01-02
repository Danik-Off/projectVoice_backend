const express = require('express');
const { Role, ServerMember, MemberRole, Server } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, isServerOwner } = require('../middleware/checkRole');
const { Permissions } = require('../utils/permissions');

const router = express.Router({ mergeParams: true });

// Получить все роли сервера
router.get('/', authenticateToken, async (req, res) => {
    // #swagger.tags = ['Roles']
    try {
        const roles = await Role.findAll({
            where: { serverId: req.params.serverId },
            order: [['position', 'DESC']],
        });
        res.status(200).json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать новую роль
router.post('/', authenticateToken, requirePermission(Permissions.MANAGE_ROLES), async (req, res) => {
    // #swagger.tags = ['Roles']
    const { name, color, permissions, position, isHoisted, isMentionable } = req.body;
    try {
        const role = await Role.create({
            serverId: req.params.serverId,
            name,
            color,
            permissions: permissions || 0n,
            position: position || 0,
            isHoisted: isHoisted || false,
            isMentionable: isMentionable || false,
        });
        res.status(201).json(role);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Обновить роль
router.patch('/:roleId', authenticateToken, requirePermission(Permissions.MANAGE_ROLES), async (req, res) => {
    // #swagger.tags = ['Roles']
    const { name, color, permissions, position, isHoisted, isMentionable } = req.body;
    try {
        const role = await Role.findOne({
            where: { id: req.params.roleId, serverId: req.params.serverId }
        });

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Проверка иерархии: нельзя редактировать роль выше или равную своей (кроме владельца)
        if (req.member.role !== 'owner' && role.position >= req.maxRolePosition) {
            return res.status(403).json({ error: 'You cannot manage a role that is higher or equal to your highest role' });
        }

        // Нельзя переместить роль выше своей (кроме владельца)
        if (position !== undefined && req.member.role !== 'owner' && position >= req.maxRolePosition) {
            return res.status(403).json({ error: 'You cannot move a role to a position higher than or equal to your highest role' });
        }

        await role.update({
            name,
            color,
            permissions,
            position,
            isHoisted,
            isMentionable,
        });

        res.status(200).json(role);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Удалить роль
router.delete('/:roleId', authenticateToken, requirePermission(Permissions.MANAGE_ROLES), async (req, res) => {
    // #swagger.tags = ['Roles']
    try {
        const role = await Role.findOne({
            where: { id: req.params.roleId, serverId: req.params.serverId }
        });

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Проверка иерархии (кроме владельца)
        if (req.member.role !== 'owner' && role.position >= req.maxRolePosition) {
            return res.status(403).json({ error: 'You cannot delete a role that is higher or equal to your highest role' });
        }

        if (role.name === '@everyone') {
            return res.status(400).json({ error: 'Cannot delete @everyone role' });
        }

        await role.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Назначить роль участнику
router.post('/members/:memberId/roles/:roleId', authenticateToken, requirePermission(Permissions.MANAGE_ROLES), async (req, res) => {
    // #swagger.tags = ['Roles']
    try {
        const { memberId, roleId, serverId } = req.params;

        const member = await ServerMember.findOne({ where: { id: memberId, serverId } });
        const role = await Role.findOne({ where: { id: roleId, serverId } });

        if (!member || !role) {
            return res.status(404).json({ error: 'Member or Role not found' });
        }

        // Проверка иерархии (кроме владельца)
        if (req.member.role !== 'owner' && role.position >= req.maxRolePosition) {
            return res.status(403).json({ error: 'You cannot assign a role that is higher or equal to your highest role' });
        }

        await MemberRole.create({ memberId, roleId });
        res.status(201).json({ message: 'Role assigned successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Снять роль с участника
router.delete('/members/:memberId/roles/:roleId', authenticateToken, requirePermission(Permissions.MANAGE_ROLES), async (req, res) => {
    // #swagger.tags = ['Roles']
    try {
        const { memberId, roleId, serverId } = req.params;

        const memberRole = await MemberRole.findOne({
            include: [
                {
                    model: Role,
                    where: { id: roleId, serverId }
                },
                {
                    model: ServerMember,
                    where: { id: memberId, serverId }
                }
            ]
        });

        if (!memberRole) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        await memberRole.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

