const sequelize = require('../config/database');
const {DataTypes} = require('sequelize');
//Cargar los modelos de sequelize
const Usuario = require('./Usuario')(sequelize, DataTypes);
const Login = require('./Login')(sequelize, DataTypes);
const Friend = require('./Friend')(sequelize, DataTypes);
const Album = require('./Album')(sequelize, DataTypes);
const Imagen = require('./Imagen')(sequelize, DataTypes);
const Comentario = require('./Comentario')(sequelize, DataTypes);
const ImagenCompartida = require('./ImagenCompartida')(sequelize, DataTypes);
const Tag = require('./Tag')(sequelize, DataTypes);
const AlbumTag = require('./AlbumTag')(sequelize, DataTypes);
const Notificacion = require('./Notificacion')(sequelize, DataTypes);
const Evento = require('./Evento')(sequelize, DataTypes);
const UsuarioEvento = require('./UsuarioEvento')(sequelize, DataTypes);

// Relacion Login -> Usuario
Login.belongsTo(Usuario,{foreignKey: 'usuario_id'});
Usuario.hasOne(Login, {foreignKey: 'usuario_id'});

// Relacion Friend <-> Usuario
Friend.belongsTo(Usuario,{as:'Solicitante', foreignKey: 'solicitante_id'});
Friend.belongsTo(Usuario,{as:'Receptor', foreignKey: 'receptor_id'});
Usuario.hasMany(Friend, {as: 'SolicitudesEnviadas', foreignKey: 'solicitante_id'});
Usuario.hasMany(Friend, {as: 'SolicitudesRecibidas', foreignKey: 'receptor_id'});

//Relacion Album -> Usuario
Album.belongsTo(Usuario, {foreignKey: 'usuario_id'});
Usuario.hasMany(Album, {foreignKey: 'usuario_id'});

// Relación Imagen -> Usuario (autor de la imagen)
Imagen.belongsTo(Usuario, { as: 'Autor', foreignKey: 'usuario_id' });
Usuario.hasMany(Imagen, { as: 'Imagenes', foreignKey: 'usuario_id' });

//Relacion Imagen -> Album
Imagen.belongsTo(Album, {foreignKey: 'album_id'});
Album.hasMany(Imagen, {foreignKey: 'album_id'});

//Relacion Comentarios -> Imagen y Usuario
Comentario.belongsTo(Imagen, {foreignKey: 'imagen_id'});
Imagen.hasMany(Comentario, {as: 'Comentarios',foreignKey: 'imagen_id'});
Comentario.belongsTo(Usuario, {as: 'Usuario',foreignKey: 'usuario_id'});
Usuario.hasMany(Comentario, {as: 'Comentarios', foreignKey: 'usuario_id'});

//Relacion ImagenCompartida -> Imagen y Usuario
ImagenCompartida.belongsTo(Imagen, {foreignKey: 'imagen_id'});
Imagen.hasMany(ImagenCompartida, {foreignKey: 'imagen_id'});
ImagenCompartida.belongsTo(Usuario, {foreignKey: 'usuario_id'});
Usuario.hasMany(ImagenCompartida, {foreignKey: 'usuario_id'});

//Relacion AlbumTag <-> Album , Tag 
Album.belongsToMany(Tag,{
    through: AlbumTag,
    foreignKey: 'album_id',
    otherKey: 'tag_id'
});
Tag.belongsToMany(Album, {
    through: AlbumTag,
    foreignKey: 'tag_id',
    otherKey: 'album_id'
});

// Relacion Notificacion -> Usuario
Notificacion.belongsTo(Usuario, {foreignKey: 'usuario_id'});
Usuario.hasMany(Notificacion, {foreignKey: 'usuario_id'});

//Relacion Evento -> Usuario
Evento.belongsTo(Usuario, {foreignKey: 'creado_por'});
Usuario.hasMany(Evento, {foreignKey: 'creado_por'});

//Relacion UsuarioEvento <-> Usuario , Evento
UsuarioEvento.belongsTo(Usuario, {foreignKey: 'usuario_id'});
Usuario.hasMany(UsuarioEvento, {foreignKey: 'usuario_id'});
UsuarioEvento.belongsTo(Evento, {foreignKey: 'evento_id'});
Evento.hasMany(UsuarioEvento, {foreignKey: 'evento_id'});

module.exports = {
    sequelize,
    Usuario,
    Login,
    Friend,
    Album,
    Imagen,
    Comentario,
    ImagenCompartida,
    Tag,
    AlbumTag,
    Notificacion,
    Evento,
    UsuarioEvento
};