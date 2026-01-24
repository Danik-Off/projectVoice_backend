// config/discord.config.js
const { Permissions } = require('../utils/permissions');

const DiscordStyles = {
    colors: {
        blurple: '#5865F2',
        green: '#57F287',
        yellow: '#FEE75C',
        fuchsia: '#EB459E',
        red: '#ED4245',
        white: '#FFFFFF',
        black: '#23272A',
        grey: '#99AAB5',
        darkGrey: '#2C2F33',
        darkerGrey: '#23272A',
    },
    defaultRoles: [
        {
            name: '@everyone',
            color: '#99AAB5',
            permissions:
                Permissions.VIEW_CHANNEL |
                Permissions.SEND_MESSAGES |
                Permissions.CONNECT |
                Permissions.SPEAK |
                Permissions.READ_MESSAGE_HISTORY |
                Permissions.ADD_REACTIONS,
            position: 0,
            isHoisted: false,
        },
        {
            name: 'Member',
            color: '#57F287', // Discord Green
            permissions:
                Permissions.VIEW_CHANNEL |
                Permissions.SEND_MESSAGES |
                Permissions.CONNECT |
                Permissions.SPEAK |
                Permissions.READ_MESSAGE_HISTORY |
                Permissions.ADD_REACTIONS |
                Permissions.CHANGE_NICKNAME,
            position: 1,
            isHoisted: false,
        },
        {
            name: 'Moderator',
            color: '#5865F2', // Discord Blurple
            permissions:
                Permissions.VIEW_CHANNEL |
                Permissions.SEND_MESSAGES |
                Permissions.CONNECT |
                Permissions.SPEAK |
                Permissions.READ_MESSAGE_HISTORY |
                Permissions.ADD_REACTIONS |
                Permissions.MANAGE_MESSAGES |
                Permissions.KICK_MEMBERS |
                Permissions.BAN_MEMBERS |
                Permissions.MUTE_MEMBERS |
                Permissions.DEAFEN_MEMBERS |
                Permissions.MOVE_MEMBERS,
            position: 2,
            isHoisted: true,
        },
        {
            name: 'Admin',
            color: '#E67E22', // Discord Orange
            permissions:
                Permissions.ADMINISTRATOR |
                Permissions.MANAGE_GUILD |
                Permissions.MANAGE_CHANNELS |
                Permissions.MANAGE_ROLES |
                Permissions.VIEW_AUDIT_LOG,
            position: 3,
            isHoisted: true,
        },
        {
            name: 'Owner',
            color: '#F1C40F', // Discord Yellow
            permissions: Permissions.ADMINISTRATOR,
            position: 4,
            isHoisted: true,
        },
    ],
};

module.exports = DiscordStyles;
