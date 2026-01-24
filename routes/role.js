const express = require('express');

const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/checkRole');
const { Role, ServerMember, MemberRole } = require('../models');
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
        console.error('Ошибка при получении ролей:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
    }
});

// Создать новую роль
router.post(
    '/',
    authenticateToken,
    requirePermission(Permissions.MANAGE_ROLES),
    async (req, res) => {
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
            console.error('Ошибка при создании роли:', error);
            res.status(400).json({ error: 'Не удалось создать роль.' });
        }
    }
);

// Обновить роль
router.patch(
    '/:roleId',
    authenticateToken,
    requirePermission(Permissions.MANAGE_ROLES),
    async (req, res) => {
        // #swagger.tags = ['Roles']
        const { name, color, permissions, position, isHoisted, isMentionable } = req.body;
        try {
            const role = await Role.findOne({
                where: { id: req.params.roleId, serverId: req.params.serverId },
            });

            if (!role) {
                return res.status(404).json({ error: 'Роль не найдена.' });
            }

            // Проверка иерархии (кроме владельца)
            if (req.member.role !== 'owner' && role.position >= req.maxRolePosition) {
                return res.status(403).json({
                    error: 'Вы не можете управлять ролью, которая выше или равна вашей текущей роли.',
                });
            }

            if (
                position !== undefined &&
                req.member.role !== 'owner' &&
                position >= req.maxRolePosition
            ) {
                return res.status(403).json({
                    error: 'Вы не можете переместить роль на позицию выше или равную вашей текущей роли.',
                });
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
            console.error('Ошибка при обновлении роли:', error);
            res.status(400).json({ error: 'Не удалось обновить роль.' });
        }
    }
);

// Удалить роль
router.delete(
    '/:roleId',
    authenticateToken,
    requirePermission(Permissions.MANAGE_ROLES),
    async (req, res) => {
        // #swagger.tags = ['Roles']
        try {
            const role = await Role.findOne({
                where: { id: req.params.roleId, serverId: req.params.serverId },
            });

            if (!role) {
                return res.status(404).json({ error: 'Роль не найдена.' });
            }

            if (req.member.role !== 'owner' && role.position >= req.maxRolePosition) {
                return res.status(403).json({
                    error: 'Вы не можете удалить роль, которая выше или равна вашей текущей роли.',
                });
            }

            if (role.name === '@everyone') {
                return res.status(400).json({ error: 'Нельзя удалить роль @everyone.' });
            }

            await role.destroy();
            res.status(204).send();
        } catch (error) {
            console.error('Ошибка при удалении роли:', error);
            res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
        }
    }
);

// Назначить роль участнику
router.post(
    '/members/:memberId/roles/:roleId',
    authenticateToken,
    requirePermission(Permissions.MANAGE_ROLES),
    async (req, res) => {
        // #swagger.tags = ['Roles']
        try {
            const { memberId, roleId, serverId } = req.params;

            const member = await ServerMember.findOne({ where: { id: memberId, serverId } });
            const role = await Role.findOne({ where: { id: roleId, serverId } });

            if (!member || !role) {
                return res.status(404).json({ error: 'Участник или роль не найдены.' });
            }

            if (req.member.role !== 'owner' && role.position >= req.maxRolePosition) {
                return res.status(403).json({
                    error: 'Вы не можете назначать роль, которая выше или равна вашей текущей роли.',
                });
            }

            await MemberRole.create({ memberId, roleId });
            res.status(201).json({ message: 'Роль успешно назначена.' });
        } catch (error) {
            console.error('Ошибка при назначении роли:', error);
            res.status(400).json({ error: 'Не удалось назначить роль.' });
        }
    }
);

// Снять роль с участника
router.delete(
    '/members/:memberId/roles/:roleId',
    authenticateToken,
    requirePermission(Permissions.MANAGE_ROLES),
    async (req, res) => {
        // #swagger.tags = ['Roles']
        try {
            const { memberId, roleId, serverId } = req.params;

            const memberRole = await MemberRole.findOne({
                include: [
                    {
                        model: Role,
                        where: { id: roleId, serverId },
                    },
                    {
                        model: ServerMember,
                        where: { id: memberId, serverId },
                    },
                ],
            });

            if (!memberRole) {
                return res.status(404).json({ error: 'Назначение не найдено.' });
            }

            await memberRole.destroy();
            res.status(204).send();
        } catch (error) {
            console.error('Ошибка при снятии роли:', error);
            res.status(500).json({ error: 'Внутренняя ошибка сервера.' });
        }
    }
);

module.exports = router;
