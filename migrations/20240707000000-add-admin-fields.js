'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'role', {
            type: Sequelize.ENUM('user', 'moderator', 'admin'),
            allowNull: false,
            defaultValue: 'user',
        });

        await queryInterface.addColumn('users', 'isActive', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        });

        // Создаем первого администратора
        await queryInterface.bulkInsert('users', [
            {
                username: 'admin',
                email: 'admin@projectvoice.com',
                password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
                role: 'admin',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('users', 'isActive');
        await queryInterface.removeColumn('users', 'role');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_role";');
    },
};
