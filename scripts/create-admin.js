/**
 * Скрипт для создания администратора
 * Запуск: node scripts/create-admin.js
 *
 * Создает администратора с учетными данными:
 * Email: admin@projectvoice.com
 * Username: admin
 * Password: admin123 (можно изменить в коде)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');

const { User } = require('../models');

async function createAdmin() {
    try {
        console.log('🔐 Создание администратора...');

        // Данные администратора
        const adminData = {
            username: process.env.ADMIN_USERNAME || 'admin',
            email: process.env.ADMIN_EMAIL || 'admin@projectvoice.com',
            password: process.env.ADMIN_PASSWORD || 'admin123',
            role: 'admin',
            isActive: true,
        };

        // Проверка существования администратора
        const existingAdmin = await User.findOne({
            where: {
                email: adminData.email,
            },
        });

        if (existingAdmin) {
            // Обновляем существующего пользователя до админа
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                existingAdmin.isActive = true;
                await existingAdmin.save();
                console.log('✅ Существующий пользователь обновлен до администратора');
            } else {
                console.log('ℹ️  Администратор уже существует');
            }

            console.log('\n📋 Учетные данные администратора:');
            console.log(`   Email: ${adminData.email}`);
            console.log(`   Username: ${existingAdmin.username}`);
            console.log(`   Password: ${adminData.password} (или установленный в .env)`);
            return;
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        // Создание администратора
        const admin = await User.create({
            username: adminData.username,
            email: adminData.email,
            password: hashedPassword,
            role: 'admin',
            isActive: true,
        });

        console.log('✅ Администратор успешно создан!');
        console.log('\n📋 Учетные данные администратора:');
        console.log(`   ID: ${admin.id}`);
        console.log(`   Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Password: ${adminData.password}`);
        console.log(`   Role: ${admin.role}`);
        console.log('\n⚠️  ВАЖНО: Измените пароль после первого входа!');
        console.log('   Для изменения пароля используйте API или обновите в базе данных');
    } catch (error) {
        console.error('❌ Ошибка при создании администратора:', error.message);
        if (error.name === 'SequelizeUniqueConstraintError') {
            console.error('   Пользователь с таким email или username уже существует');
        }
        process.exit(1);
    } finally {
        // Закрываем соединение с базой данных
        const db = require('../models');
        if (db.sequelize) {
            await db.sequelize.close();
        }
        process.exit(0);
    }
}

// Запуск скрипта
createAdmin();
