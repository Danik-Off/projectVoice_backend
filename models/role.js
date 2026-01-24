'use strict';
module.exports = (sequelize, DataTypes) => {
    const Role = sequelize.define(
        'Role',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            serverId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            color: {
                type: DataTypes.STRING,
                defaultValue: '#99AAB5',
            },
            permissions: {
                type: DataTypes.BIGINT,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue('permissions');
                    return value ? BigInt(value) : 0n;
                },
                set(value) {
                    this.setDataValue('permissions', value ? BigInt(value).toString() : '0');
                },
            },
            position: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },
            isHoisted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            isMentionable: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
        },
        {
            timestamps: true,
        }
    );

    Role.associate = (models) => {
        Role.belongsTo(models.Server, { foreignKey: 'serverId', as: 'server' });
        Role.belongsToMany(models.ServerMember, {
            through: 'MemberRoles',
            foreignKey: 'roleId',
            otherKey: 'memberId',
            as: 'members',
        });
    };

    return Role;
};
