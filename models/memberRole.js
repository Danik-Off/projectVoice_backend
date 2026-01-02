'use strict';
module.exports = (sequelize, DataTypes) => {
  const MemberRole = sequelize.define(
    'MemberRole',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      memberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: true,
    }
  );

  MemberRole.associate = (models) => {
    MemberRole.belongsTo(models.ServerMember, { foreignKey: 'memberId' });
    MemberRole.belongsTo(models.Role, { foreignKey: 'roleId' });
  };

  return MemberRole;
};

