const { DataTypes } = require("sequelize")

module.exports = (sequelize,Datatypes)=>{
    return sequelize.define('UsuarioEvento',{
        id_usuario_evento:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        usuario_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        evento_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },{
        //tableName:'usuario_evento',
        timestamps: false,
    })
}