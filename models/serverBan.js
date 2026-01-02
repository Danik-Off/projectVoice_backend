'use strict';
module.exports = (sequelize, DataTypes) => {
  const ServerBan = sequelize.define(
    'ServerBan',
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
      },
      adminId: {
        type: DataTypes.INTEGER,
      },
    },
    {
      timestamps: true,
    }
  );

  ServerBan.associate = (models) => {
    ServerBan.belongsTo(models.Server, { foreignKey: 'serverId', as: 'server' });
    ServerBan.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ServerBan.belongsTo(models.User, { foreignKey: 'adminId', as: 'admin' });
  };

  return ServerBan;
};

