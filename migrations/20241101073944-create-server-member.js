'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('serverMembers', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            userId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users', // Название таблицы, с которой будет связь
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            serverId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'servers', // Название таблицы, с которой будет связь
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            role: {
                type: Sequelize.ENUM('member', 'moderator', 'admin', 'owner'), // Роли участников
                allowNull: false,
                defaultValue: 'member',
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
    },

    async down(queryInterface) {
        await queryInterface.dropTable('serverMembers');
    },
};
