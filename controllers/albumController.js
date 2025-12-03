const { Album, Imagen,Tag,AlbumTag } = require('../models');

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
  formCrear: async (req, res, next) => {
    try {
      const tags = await Tag.findAll({
        order: [['nombre', 'ASC']]
      });

      res.render('albumCrear', { tags });
    } catch (err) {
      next(err);
    }
},

  // Crear álbum
  async crear(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const { titulo } = req.body;
      let { tags } = req.body;

      // 1) Crear el álbum
      const album = await Album.create({
        titulo,
        usuario_id: usuarioId
      });

      // 2) Asociar los tags seleccionados
      if (tags) {
        if (!Array.isArray(tags)) {
          tags = [tags];
        }

        for (const tagId of tags) {
          await AlbumTag.create({
            album_id: album.id_album,
            tag_id: tagId
          });
        }
      }

      // 3) Volver a la pantalla de publicar
      return res.redirect('/imagen/publicar');
    } catch (err) {
      next(err);
    }
  }
};