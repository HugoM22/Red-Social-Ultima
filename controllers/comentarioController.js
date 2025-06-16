const { Comentario } = require('../models');

module.exports = {
  // Crear un comentario sobre una imagen compartida
    async create(req, res, next) {
        try {
        const usuarioId = req.session.usuarioId;
        const { imagenId, contenido } = req.body;

        // si no viene texto o imagen, volvemos
        if (!contenido || !imagenId) {
            return res.redirect('/');
        }

        // utilizamos el campo `text` que espera tu modelo
        await Comentario.create({
            imagen_id: imagenId,
            usuario_id: usuarioId,
            text: contenido 
        });
        //const backUrl = req.get('Referer')|| '/'
        return res.redirect('');
        } catch (err) {
        next(err);
        }
    }
};