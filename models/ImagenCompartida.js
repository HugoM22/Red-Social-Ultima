const Usuario = require("./Usuario")

module.exports = (sequelize, DataTypes)=>{
    return sequelize.define('ImagenCompartida',{
        id_imagenes_compartidas:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        imagen_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        compartido_con_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        
        },
        usuario_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        publica:{
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },{
        //tableName: 'imagen_compartida',
        timestamps: false
    })
}