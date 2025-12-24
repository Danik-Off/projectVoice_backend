-- Скрипт инициализации базы данных ProjectVoice
-- Выполняется автоматически при установке

-- Создание базы данных (если не существует)
CREATE DATABASE IF NOT EXISTS test_projectvoice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Создание пользователя (если не существует)
CREATE USER IF NOT EXISTS 'test_projectvoice'@'localhost' IDENTIFIED BY 'TZ8TSEWPet5kJnzN';

-- Предоставление прав пользователю
GRANT ALL PRIVILEGES ON test_projectvoice.* TO 'test_projectvoice'@'localhost';

-- Применение изменений
FLUSH PRIVILEGES;

-- Вывод сообщения об успехе
SELECT 'Database and user created successfully!' AS Status;

-- ============================================
-- Создание администратора (выполнить ПОСЛЕ миграций)
-- ============================================
-- ВАЖНО: Этот блок нужно выполнить ПОСЛЕ запуска миграций (npm run db:migrate)
-- Используйте скрипт create-admin.js для автоматического создания админа с хешированным паролем
-- 
-- Или выполните вручную через Node.js:
-- node scripts/create-admin.js
--
-- Для ручного создания через SQL (пароль уже должен быть захеширован):
-- USE test_projectvoice;
-- INSERT INTO Users (username, email, password, role, isActive, createdAt, updatedAt)
-- VALUES ('admin', 'admin@projectvoice.com', '$2a$10$хешированный_пароль_здесь', 'admin', true, NOW(), NOW())
-- ON DUPLICATE KEY UPDATE role='admin', isActive=true;

