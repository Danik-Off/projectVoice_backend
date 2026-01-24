// routes/index.js
const express = require('express');
const router = express.Router();

const DiscordStyles = require('../config/discord.config');

const adminRoutes = require('./admin');
const authRoutes = require('./auth');
const channelRoutes = require('./channel');
const friendRoutes = require('./friend');
const serverInviteRoutes = require('./invite');
const messageRoutes = require('./message');
const roleRoutes = require('./role');
const serverRoutes = require('./server');
const serverMembersRoutes = require('./serverMembers');
const userRoutes = require('./user');

// API Health check & Styles
router.get('/info', (req, res) => {
    res.json({
        status: 'success',
        app: 'ProjectVoice Backend',
        version: '1.0.0',
        styles: DiscordStyles.colors,
        timestamp: new Date().toISOString(),
    });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/servers', serverRoutes);
router.use('/servers', channelRoutes);
router.use('/serverMembers', serverMembersRoutes);
router.use('/invite', serverInviteRoutes);
router.use('/admin', adminRoutes);
router.use('/messages', messageRoutes);
router.use('/servers/:serverId/roles', roleRoutes);
router.use('/friends', friendRoutes);

module.exports = router;
