const { Album, Imagen, Tag, AlbumTag,ImagenCompartida,Usuario } = require('../models');

module.exports = {
  // Mostrar un álbum y todas sus imágenes
  async listar(req, res, next) {
    try {
      const albumId   = req.params.id;
      const usuarioId = req.session.usuarioId;

      // 1) Buscar el álbum y validar que sea mío
      const album = await Album.findOne({
        where: { id_album: albumId, usuario_id: usuarioId }
      });

      if (!album) {
        return res.status(404).render('404');
      }

      let imagenes = [];
      let amigo = null;

      // 2) Si es un álbum AUTO-CREADO, mostrar fotos compartidas por ese amigo
      if (album.autoCreado && album.amigo_id) {
        // Traigo datos del amigo para mostrar en la vista
        amigo = await Usuario.findByPk(album.amigo_id, {
          attributes: ['id_usuario', 'nombre', 'apellido', 'avatarUrl']
        });

        imagenes = await Imagen.findAll({
          where: {
            usuario_id: album.amigo_id   // imágenes creadas por el amigo
          },
          include: [
            {
              model: ImagenCompartida,
              required: true,
              where: {
                usuario_id:       album.amigo_id, // quien las comparte
                compartido_con_id: usuarioId      // yo
              }
            }
          ],
          order: [['creado_en', 'DESC']]
        });

      } else {
        // 3) Álbum normal: traer todas las imágenes del álbum
        imagenes = await Imagen.findAll({
          where: { album_id: albumId },
          order: [['creado_en', 'DESC']]
        });
      }

      // 4) Renderizar vista
      res.render('albums', { album, imagenes, amigo });
    } catch (err) {
      next(err);
    }
  },

  // Formulario para editar un álbum
  async editarForm(req, res, next) {
    try {
      const albumId = req.params.id;
      const usuarioId = req.session.usuarioId;

      const album = await Album.findOne({
        where: { id_album: albumId, usuario_id: usuarioId }
      });
      if (!album) return res.status(404).render('404');

      const imagenes = await Imagen.findAll({
        where: { album_id: albumId },
        order: [['creado_en', 'DESC']]
      });

      return res.render('albumEditar', { album, imagenes });
    } catch (err) {
      next(err);
    }
  },

  // Actualizar álbum
  async actualizar(req, res, next) {
    try {
      const albumId = req.params.id;
      const usuarioId = req.session.usuarioId;
      const { titulo } = req.body;

      const album = await Album.findOne({
        where: { id_album: albumId, usuario_id: usuarioId }
      });
      if (!album) return res.status(404).render('404');

      await album.update({ titulo });

      return res.redirect(`/album/${albumId}/albums`);
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

      const album = await Album.create({
        titulo,
        usuario_id: usuarioId
      });

      if (tags) {
        if (!Array.isArray(tags)) tags = [tags];

        for (const tagId of tags) {
          await AlbumTag.create({
            album_id: album.id_album,
            tag_id: tagId
          });
        }
      }

      return res.redirect('/imagen/publicar');
    } catch (err) {
      next(err);
    }
  }
};
