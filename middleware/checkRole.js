const { User, ServerMember, Role, Server } = require('../models');
const { hasPermission, ALL_PERMISSIONS } = require('../utils/permissions');

// Middleware для проверки роли пользователя (глобальной)
const checkRole = (requiredRoles) => {
    return async (req, res, next) => {
        // ... (rest of the checkRole function remains same, just updating imports)
        try {
            console.log('🔍 Проверка роли для пользователя:', req.user.userId);
            console.log('🔍 Требуемые роли:', requiredRoles);

            const user = await User.findByPk(req.user.userId);

            if (!user) {
                console.log('❌ Пользователь не найден');
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            console.log('👤 Найден пользователь:', {
                id: user.id,
                username: user.username,
                role: user.role,
                isActive: user.isActive,
            });

            if (!user.isActive) {
                console.log('❌ Аккаунт заблокирован');
                return res.status(403).json({ error: 'Аккаунт заблокирован' });
            }

            if (!requiredRoles.includes(user.role)) {
                console.log(
                    '❌ Недостаточно прав. Роль пользователя:',
                    user.role,
                    'Требуемые роли:',
                    requiredRoles
                );
                return res.status(403).json({ error: 'Недостаточно прав' });
            }

            console.log('✅ Роль проверена успешно');
            req.userRole = user.role;
            req.userData = user;
            next();
        } catch (error) {
            console.error('❌ Ошибка проверки роли:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    };
};

// Middleware для проверки разрешений на сервере
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            const serverId = req.params.serverId || req.body.serverId;
            if (!serverId) {
                return res.status(400).json({ error: 'ID сервера не указан' });
            }

            const member = await ServerMember.findOne({
                where: {
                    serverId,
                    userId: req.user.userId,
                },
                include: [
                    {
                        model: Role,
                        as: 'roles',
                        through: { attributes: [] },
                    },
                ],
            });

            if (!member) {
                return res.status(403).json({ error: 'Вы не являетесь участником этого сервера' });
            }

            // Получаем роль @everyone для базовых прав и позиции
            const everyoneRole = await Role.findOne({
                where: {
                    serverId,
                    name: '@everyone',
                },
            });

            // Находим позицию самой высокой роли участника
            let maxPosition = 0;
            if (everyoneRole) maxPosition = everyoneRole.position;
            if (member.roles && member.roles.length > 0) {
                const positions = member.roles.map((r) => r.position);
                maxPosition = Math.max(maxPosition, ...positions);
            }

            // Добавляем полезную информацию в запрос
            req.member = member;
            req.maxRolePosition = maxPosition;

            // Владелец сервера имеет все права
            if (member.role === 'owner') {
                req.memberPermissions = ALL_PERMISSIONS;
                return next();
            }

            // Вычисляем общие права из всех ролей участника
            let userPermissions = 0n;
            if (everyoneRole) {
                userPermissions |= BigInt(everyoneRole.permissions);
            }

            if (member.roles && member.roles.length > 0) {
                member.roles.forEach((role) => {
                    userPermissions |= BigInt(role.permissions);
                });
            }

            if (!hasPermission(userPermissions, permission)) {
                return res.status(403).json({ error: 'Недостаточно прав на сервере' });
            }

            req.memberPermissions = userPermissions;
            next();
        } catch (error) {
            console.error('Ошибка проверки разрешений:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    };
};

// Middleware для проверки модератора
const isModerator = checkRole(['moderator', 'admin']);

// Middleware для проверки администратора
const isAdmin = checkRole(['admin']);

// Middleware для проверки владельца сервера
const isServerOwner = async (req, res, next) => {
    try {
        // Проверяем, является ли пользователь владельцем сервера по роли в ServerMembers
        const member = await ServerMember.findOne({
            where: {
                serverId: req.params.serverId,
                userId: req.user.userId,
                role: 'owner',
            },
        });

        // Проверяем, является ли пользователь владельцем сервера по полю ownerId
        const server = await Server.findByPk(req.params.serverId);
        const isOwnerByField = server && server.ownerId === req.user.userId;

        if (!member && !isOwnerByField) {
            return res
                .status(403)
                .json({ error: 'Только владелец сервера может выполнить это действие' });
        }

        next();
    } catch (error) {
        console.error('Ошибка проверки владельца сервера:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = {
    checkRole,
    requirePermission,
    isModerator,
    isAdmin,
    isServerOwner,
};
