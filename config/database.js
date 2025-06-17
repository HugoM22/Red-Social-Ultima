require('dotenv').config();
const mysql2= require('mysql2');
const {Sequelize} = require('sequelize');

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

// Si existe la URL completa (producción), la usamos; si no, caemos al .env local
const sequelize = process.env.MYSQL_URL
    ? new Sequelize(process.env.MYSQL_URL, commonOptions)
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            ...commonOptions,
        }
        );

module.exports = sequelize;




// const sequelize = new Sequelize(
//     process.env.DB_NAME,
//     process.env.DB_USER,
//     process.env.DB_PASSWORD, {
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT || 3306,
//     dialect: 'mysql',
//     dialectModule: mysql2,
//     logging: false,
//     define:{
//         freezeTableName: false,
//         underscored:true,
//         timestamps: true,
//         createdAt: 'creado_en',
//         updatedAt: 'actualizado_en',
//     }
// });
// module.exports = sequelize;