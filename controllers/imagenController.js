const { Op } = require('sequelize');
const { Album, Friend, Usuario, Imagen } = require('../models');
const ImagenCompartida = require('../models/ImagenCompartida');

module.exports = {
  // Mostrar formulario de publicar
  async publicarForm(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;

      // 1) Álbumes propios (manuales)
      const misAlbumnesPropios = await Album.findAll({
        where: {
          usuario_id: usuarioId,
          autoCreado: false
        },
        order: [['creado_en', 'DESC']]
      });

      // 2) Contactos = amistades aceptadas
      const amigos = await Friend.findAll({
        where: {
          estado: 'Aceptado',
          [Op.or]: [
            { solicitante_id: usuarioId },
            { receptor_id:    usuarioId }
          ]
        },
        include: [
          { model: Usuario, as: 'Solicitante', attributes: ['id_usuario','nombre','apellido'] },
          { model: Usuario, as: 'Receptor',    attributes: ['id_usuario','nombre','apellido'] }
        ]
      });
      const contactos = amigos.map(f => {
        const a = f.solicitante_id === usuarioId ? f.Receptor : f.Solicitante;
        return { id: a.id_usuario, nombre: `${a.nombre} ${a.apellido}` };
      });

      // 3) (Opcional) solicitudes pendientes
      // const solicitudes = await Friend.findAll({ ... });

      // 4) (Opcional) tus compartidas en este feed
      // const compartidas = await ImagenCompartida.findAll({ ... });

      return res.render('publicar', {
        misAlbumnesPropios,
        contactos,
        solicitudes: [],
        compartidas: []
      });
    } catch (err) {
      console.error('ERROR en publicarForm:', err.message);
      console.error('SQL que falló:', err.sql);
      next(err);
    }
  },

  // Subir imagen a un álbum y compartirla
  async subir(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const { albumId, titulo, descripcion } = req.body;
      const file = req.file;

      // 1) Chequear archivo
      if (!file) {
        return res.status(400).send('No se subió ningún archivo.');
      }

      // 2) Verificar que el álbum exista y sea tuyo
      const album = await Album.findOne({
        where: { id_album: albumId, usuario_id: usuarioId }
      });
      if (!album) {
        return res.status(403).send('Álbum inválido o no te pertenece.');
      }

      // 3) Crear la imagen
      const imagen = await Imagen.create({
        album_id:   albumId,
        usuario_id: usuarioId,
        archivo:    `/uploads/${file.filename}`,
        titulo,
        descripcion
      });

      // 4) Compartir con los contactos seleccionados (si los hubo)
      const lista = Array.isArray(req.body.compartirCon)
        ? req.body.compartirCon
        : [req.body.compartirCon].filter(Boolean);

      for (const receptor_id of lista) {
        await ImagenCompartida.create({
          imagen_id: imagen.id_imagen,
          compartido_con_id: receptor_id
        });
      }

      // 5) Redirigir al álbum
      return res.redirect(`/album/${albumId}/albums`);
    } catch (err) {
      next(err);
    }
  }
};
