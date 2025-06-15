module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Usuario', {
        id_usuario:{
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre:{
            type: DataTypes.STRING(100),
            allowNull: false
        },
        apellido: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        fecha_nacimiento: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        sexo:{
            type: DataTypes.ENUM('MASCULINO', 'FEMENINO', 'OTRO'),
            allowNull: false
        },
        intereses:{
            type: DataTypes.STRING(255),
            allowNull: false
        },
        antecedentes:{
            type: DataTypes.STRING(255),
            allowNull: true
        },
        avatarUrl:{
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'imagen_perfil'
        },
        email:{
            type:DataTypes.STRING(150),
            allowNull:false,
            unique:true,
            validate:{isEmail:true}
        },
        creado_en:{
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },{
        //tableName: 'usuario',
        createdAt: 'creado_en',
        updatedAt: false
    });
    };