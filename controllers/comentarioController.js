const {Comentario} = require('../models');

module.exports={
    // Crear un comentario en una imagen 
    async create(req,res,next){
        try{
            const usuario_id = req.session.usuarioId;
            const {imagenId, contenido} = req.body;

            await Comentario.create({
                usuario_id,
                imagen_id: imagenId,
                contenido
            });
            res.redirect('/');
        } catch(err){
            next(err);
        }
    }
};