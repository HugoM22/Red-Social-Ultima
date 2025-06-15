module.exports = (sequelize,DataTypes)=>{
    return sequelize.define('Evento',{
        id_eventos:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        titulo:{
            type: DataTypes.STRING(150),
            allowNull: false
        },
        descripcion:{
            type: DataTypes.TEXT,
            allowNull: false
        },
        fecha:{
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        lugar:{
            type: DataTypes.STRING(255),
            allowNull: false
        },
        creado_por:{
            type: DataTypes.INTEGER,
            allowNull: false
        },
        creado_en:{
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },{
        //tableName: 'evento',
        timestamps: false
    })
}