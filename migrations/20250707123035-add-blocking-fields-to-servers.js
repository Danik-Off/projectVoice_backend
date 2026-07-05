'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('servers', 'isBlocked', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        });

        await queryInterface.addColumn('servers', 'blockReason', {
            type: Sequelize.TEXT,
            allowNull: true,
        });

        await queryInterface.addColumn('servers', 'blockedAt', {
            type: Sequelize.DATE,
            allowNull: true,
        });

        await queryInterface.addColumn('servers', 'blockedBy', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('servers', 'isBlocked');
        await queryInterface.removeColumn('servers', 'blockReason');
        await queryInterface.removeColumn('servers', 'blockedAt');
        await queryInterface.removeColumn('servers', 'blockedBy');
    },
};
