'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableName = 'servers';
        const columnName = 'ownerId';

        try {
            // Пытаемся добавить колонку
            await queryInterface.addColumn(tableName, columnName, {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            });

            // Заполняем поле ownerId для существующих серверов
            const servers = await queryInterface.sequelize.query(
                `SELECT id FROM ${tableName} WHERE "ownerId" IS NULL`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            for (const server of servers) {
                const ownerMember = await queryInterface.sequelize.query(
                    `SELECT "userId" FROM "serverMembers" WHERE "serverId" = $1 AND role = 'owner' LIMIT 1`,
                    {
                        type: Sequelize.QueryTypes.SELECT,
                        replacements: [server.id],
                    }
                );

                if (ownerMember.length > 0) {
                    await queryInterface.sequelize.query(
                        `UPDATE ${tableName} SET "ownerId" = $1 WHERE id = $2`,
                        {
                            type: Sequelize.QueryTypes.UPDATE,
                            replacements: [ownerMember[0].userId, server.id],
                        }
                    );
                }
            }

            // Делаем поле NOT NULL
            await queryInterface.changeColumn(tableName, columnName, {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            });
        } catch (error) {
            // Если колонка уже существует, проверяем, что она NOT NULL
            if (error.message.includes('already exists')) {
                // Колонка уже есть — просто убеждаемся, что она NOT NULL
                // Ничего не делаем, так как она уже настроена
                return;
            }
            throw error;
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('servers', 'ownerId');
    },
};
