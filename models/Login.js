module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Login', {
        id_login:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        usuario_id:{
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        email:{
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            validate:{ isEmail:true}
        },
        contrasenia:{
            type: DataTypes.STRING(255),
            allowNull: false
        },
        token:{
            type: DataTypes.STRING(255),
            allowNull: true
        },
        tokem_expira:{
            type: DataTypes.DATE,
            allowNull: true
        }
    },{
        //tableName: 'login',
        timestamps: false
    });
};