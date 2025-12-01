const { Comentario, Imagen, Usuario,Notificacion} = require('../models');

module.exports = {
  // Crear un comentario sobre una imagen compartida
    async create(req, res, next) {
        try {
        const usuarioId = req.session.usuarioId;
        const { imagenId, contenido } = req.body;

        // si no viene texto o imagen, volvemos
        if (!contenido || !imagenId) {
            return res.redirect('/');
        }//1 crear y guardar comentario 
        const comment = await Comentario.create({
            imagen_id: imagenId,
            usuario_id: usuarioId,
            text: contenido 
        });
        //2 Obtener la imagen con su autor
        const imagen = await Imagen.findByPk(imagenId,{
            include:[{model:Usuario, as: 'Autor', attributes:['id_usuario']}]
        });
        const nombreSesion =
            req.session.usuarioNombre   ||
            req.session.nombreUsuario   ||
            req.session.nombre          ||
            '';

            const apellidoSesion =
            req.session.usuarioApellido ||
            req.session.apellidoUsuario ||
            req.session.apellido        ||
            '';

            const avatarSesion =
            req.session.usuarioAvatar   ||
            req.session.avatarUrl       ||
            '/default-avatar.png';

        //3 emitir notificacion en tiempo real al auto de la img
        const io = req.app.get('io');
        const onlineUsers = req.app.get('onlineUsers');
        const socketId = onlineUsers[imagen.Autor.id_usuario];

        // Evitar notificar si el autor del comentario es el mismo que el de la imagen
        if (imagen.Autor.id_usuario !== usuarioId) {
            // Guardar notificación en BD
            await Notificacion.create({
                usuario_id: imagen.Autor.id_usuario,
                tipo: 'Comentario',
                mensaje: `Tu imagen "${imagen.titulo}" recibió un nuevo comentario`,
                origin_id: comment.id_comentario
            });

            if(socketId){
                io.to(socketId).emit('notification:new_comment',{
                imagenId: imagenId,
                comentarioId: comment.id_comentario,
                autor:{
                    id: usuarioId,
                    nombre: req.session.usuarioNombre || req.session.nombreUsuario,
                    apellido: req.session.usuarioApellido || req.session.apellidoUsuario,
                    avatarUrl: req.session.usuarioAvatar || req.session.avatarUrl || '/default-avatar.png'
                },
                excerpt: comment.text.slice(0,30)
                });
            }
        }
        return res.redirect(req.get('Referer')||'/');
        } catch (err) {
        next(err);
        }
    }
};