module.exports = (sequelize, DataTypes)=>{
    return sequelize.define('Imagen',{
        id_imagen:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        album_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        archivo:{
            type: DataTypes.STRING(255),
            allowNull: false
        },
        titulo:{
            type: DataTypes.STRING(255),
            allowNull: false
        },
        descripcion:{
            type: DataTypes.TEXT,
            allowNull: true
        },
        creado_en:{
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },{
        //tableName: 'imagen',
        timestamps: false
    })
}