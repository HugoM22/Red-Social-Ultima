require('dotenv').config();
const mysql2 = require('mysql2');
const { Sequelize } = require('sequelize');

const commonOptions = {
    dialect: 'mysql',
    dialectModule: mysql2,
    logging: false,
    define: {
        freezeTableName: false,
        underscored: true,
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
    },
};

const sequelize = process.env.MYSQL_URL
  // Producción: usamos la URL completa
    ? new Sequelize(process.env.MYSQL_URL, commonOptions)
    // Desarrollo local: desglosamos host/port/user/password/database
    : new Sequelize(
        process.env.MYSQLDATABASE,
        process.env.MYSQLUSER,
        process.env.MYSQLPASSWORD,
        {
            host: process.env.MYSQLHOST,
            port: process.env.MYSQLPORT || 3306,
            ...commonOptions,
        }
        );

module.exports = sequelize;