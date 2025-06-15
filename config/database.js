require('dotenv').config();
const mysql2= require('mysql2');
const {Sequelize} = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectModule: mysql2,
    logging: false,
    define:{
        freezeTableName: false,
        underscored:true,
        timestamps: true,
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
    }
});
module.exports = sequelize;