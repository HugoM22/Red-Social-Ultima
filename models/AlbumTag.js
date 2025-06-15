module.exports = (sequelize,DataTypes)=>{
    return sequelize.define('AlbumTag',{
        id_album_tag:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        album_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        },tag_id:{
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },{
        //tableName: 'album_tag',
        timestamps: false
    })
}