module.exports = (sequelize,DataTypes)=>{
    return sequelize.define('Notificacion',{
        id_notificacion: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        usuario_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        tipo:{
            type: DataTypes.ENUM('Solicitud','Comentario')
        },
        mensaje:{
            type: DataTypes.TEXT,
            allowNull: false
        },
        origin_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        leido:{
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
        },{
            //tableName: 'notificacion',
            timestamps: false
    })
}