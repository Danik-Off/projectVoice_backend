'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Добавляем поля для мута/дефа в ServerMembers
        await queryInterface.addColumn('serverMembers', 'isMuted', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        });
        await queryInterface.addColumn('serverMembers', 'isDeafened', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        });

        // Создаем таблицу ServerBans
        await queryInterface.createTable('serverBans', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            serverId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'servers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            reason: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            adminId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
        });

        await queryInterface.addIndex('serverBans', ['serverId', 'userId'], {
            unique: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('serverBans');
        await queryInterface.removeColumn('serverMembers', 'isMuted');
        await queryInterface.removeColumn('serverMembers', 'isDeafened');
    },
};
