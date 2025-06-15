module.exports = (sequelize,DataTypes)=>{
    return sequelize.define('Comentario',{
        id_comentario:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        imagen_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        usuario_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        text:{
            type: DataTypes.TEXT,
            allowNull: false
        },
        creado_en:{
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },{
        //tableName: 'comentario',
        timestamps: false
    })
}