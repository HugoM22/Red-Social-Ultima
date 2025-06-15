module.exports = (sequelize, DataTypes)=>{
    return sequelize.define('Tag',{
        id_tag:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre:{
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        }
    },{
        //tableName: 'tag',
        timestamps: false
    })
}