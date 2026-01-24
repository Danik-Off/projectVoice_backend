'use strict';
module.exports = (sequelize, DataTypes) => {
    const Friendship = sequelize.define(
        'Friendship',
        {
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id',
                },
            },
            friendId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id',
                },
            },
            status: {
                type: DataTypes.ENUM('pending', 'accepted', 'blocked'),
                allowNull: false,
                defaultValue: 'pending',
            },
        },
        {
            timestamps: true,
        }
    );

    Friendship.associate = (models) => {
        Friendship.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });
        Friendship.belongsTo(models.User, {
            foreignKey: 'friendId',
            as: 'friend',
        });
    };

    return Friendship;
};
