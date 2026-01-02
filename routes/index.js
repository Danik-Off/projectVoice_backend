// routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./user');
const serverRoutes = require('./server');
const channelRoutes = require('./channel');
const serverMembersRoutes = require('./serverMembers');
const serverInviteRoutes = require('./invite');
const adminRoutes = require('./admin');
const messageRoutes = require('./message');
const roleRoutes = require('./role');
const DiscordStyles = require('../config/discord.config');

// API Health check & Styles
router.get('/info', (req, res) => {
    res.json({
        status: 'success',
        app: 'ProjectVoice Backend',
        version: '1.0.0',
        styles: DiscordStyles.colors,
        timestamp: new Date().toISOString()
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

module.exports = router;

