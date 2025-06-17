const { Comentario, Imagen, Usuario} = require('../models');

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
        })
        //3 emitir notificacion en tiempo real al auto de la img
        const io = req.app.get('io');
        const onlineUsers = req.app.get('onlineUsers');
        const socketId = onlineUsers[imagen.Autor.id_usuario];

        if(socketId){
            io.to(socketId).emit('notification:new_comment',{
                imagenId: imagenId,
                comentarioId: comment.id_comentario,
                autor:{
                    id: usuarioId,
                    nombre: req.session.usuarioNombre,
                    apellido: req.session.usuarioApellido,
                    avatarUrl: req.session.usuarioAvatar || '/default-avatar.png'
                },
                excerpt: comment.text.slice(0,30)
            });
        }
        return res.redirect(req.get('Referer')||'/');
        } catch (err) {
        next(err);
        }
    }
};