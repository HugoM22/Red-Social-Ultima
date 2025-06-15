const { Album, Imagen } = require('../models');

module.exports = {
  // Mostrar un álbum y todas sus imágenes
  async listar(req, res, next) {
    try {
      const albumId = req.params.id;
      const usuarioId = req.session.usuarioId;

      // 1) Busca y valida que sea tu álbum
      const album = await Album.findOne({
        where: { id_album: albumId, usuario_id: usuarioId }
      });
      if (!album) return res.status(404).render('404');

      // 2) Carga todas sus imágenes
      const imagenes = await Imagen.findAll({
        where: { album_id: albumId },
        order: [['creado_en', 'DESC']]
      });

      // 3) Renderiza la vista 'albums' pasándole album e imagenes
      res.render('albums', { album, imagenes });
    } catch (err) {
      next(err);
    }
  },

  // Formulario para crear álbum
  formCrear(req, res) {
    res.render('albumCrear');
  },

  // Crear álbum
  async crear(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const { titulo } = req.body;
      await Album.create({ titulo, usuario_id: usuarioId });
      res.redirect('/imagen/publicar');
    } catch (err) {
      next(err);
    }
  }
};