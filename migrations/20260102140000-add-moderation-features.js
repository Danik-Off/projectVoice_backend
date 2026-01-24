'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Добавляем поля для мута/дефа в ServerMembers
        await queryInterface.addColumn('ServerMembers', 'isMuted', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        });
        await queryInterface.addColumn('ServerMembers', 'isDeafened', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        });

        // Создаем таблицу ServerBans
        await queryInterface.createTable('ServerBans', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            serverId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Servers', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Users', key: 'id' },
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
                references: { model: 'Users', key: 'id' },
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

        await queryInterface.addIndex('ServerBans', ['serverId', 'userId'], {
            unique: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('ServerBans');
        await queryInterface.removeColumn('ServerMembers', 'isMuted');
        await queryInterface.removeColumn('ServerMembers', 'isDeafened');
    },
};
