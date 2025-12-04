module.exports = (sequelize, DataTypes) =>{
    return sequelize.define('Album',{
        id_album:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        usuario_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        amigo_id: {
        type: DataTypes.INTEGER,
        allowNull: true
        },
        titulo:{
            type: DataTypes.STRING(150),
            allowNull: false
        },
        autoCreado: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'auto_creado'
    },
        creado_en:{
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },{
        //tableName: 'album',
        timestamps: false
    });
};