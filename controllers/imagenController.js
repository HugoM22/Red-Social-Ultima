
const { Op } = require('sequelize');
const { Album, Friend, Usuario, Imagen, Comentario,Tag,ImagenCompartida } = require('../models');

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

      // ❗ Deduplicar contactos (si hay A→B y B→A solo aparece una vez)
      const contactos = amigos.reduce((acc, f) => {
        const a = f.solicitante_id === usuarioId ? f.Receptor : f.Solicitante;

        if (!acc.find(u => u.id === a.id_usuario)) {
          acc.push({
            id: a.id_usuario,
            nombre: `${a.nombre} ${a.apellido}`
          });
        }

        return acc;
      }, []);

      // 3) Tags
      const tags = await Tag.findAll({
        order: [['nombre', 'ASC']]
      });

      return res.render('publicar', {
        misAlbumnesPropios,
        contactos,
        solicitudes: [],
        compartidas: [],
        tags
      });
    } catch (err) {
      next(err);
    }
  },


  //ver detalle de una imagen concreta
  async detalle(req, res, next) {
    try {
      const imagenId  = req.params.id;
      const usuarioId = req.session.usuarioId;

      const imagen = await Imagen.findByPk(imagenId, {
        include: [
          {
            model: Usuario,
            as: 'Autor',
            attributes: ['id_usuario', 'nombre', 'apellido', 'avatarUrl']
          },
          {
            model: Comentario,
            as: 'Comentarios',
            include: [
              {
                model: Usuario,
                as: 'Usuario',
                attributes: ['id_usuario', 'nombre', 'apellido', 'avatarUrl']
              }
            ],
          
          }
        ],
        order: [[{ model: Comentario, as: 'Comentarios' }, 'creado_en', 'DESC']]
      });

      if (!imagen) {
        return res.status(404).render('404');
      }

      res.render('imagenDetalle', { imagen, usuarioId });
    } catch (err) {
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

      // 2) Verificar que el álbum exista y que pertenezca al usuario
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

      // 4) Compartir con los contactos seleccionados
      const lista = Array.isArray(req.body.compartirCon)
        ? req.body.compartirCon
        : [req.body.compartirCon].filter(Boolean);

      for (const receptor_id of lista) {
        await ImagenCompartida.create({
          imagen_id: imagen.id_imagen,
          compartido_con_id: receptor_id,
          usuario_id: usuarioId
        });
      }

      // 5) Redirigir al álbum
      return res.redirect(`/album/${albumId}/albums`);
    } catch (err) {
      next(err);
    }
  },
  async editarForm(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const imagenId  = +req.params.id;

      const imagen = await Imagen.findByPk(imagenId);
      if (!imagen) return res.status(404).render('404');
      if (imagen.usuario_id !== usuarioId) return res.redirect('/');

      // Contactos = amistades aceptadas
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

      const contactos = amigos.reduce((acc, f) => {
        const a = f.solicitante_id === usuarioId ? f.Receptor : f.Solicitante;
        if (!acc.find(u => u.id === a.id_usuario)) {
          acc.push({
            id: a.id_usuario,
            nombre: `${a.nombre} ${a.apellido}`
          });
        }
        return acc;
      }, []);

      // Imagen compartida con
      const compartidos = await ImagenCompartida.findAll({
        where: { imagen_id: imagenId }
      });
      const compartidosIds = compartidos.map(c => c.compartido_con_id);

      return res.render('imagenEditar', {
        imagen,
        contactos,
        compartidosIds
      });
    } catch (err) {
      next(err);
    }
  },

  // Actualizar imagen
  async actualizar(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const imagenId  = +req.params.id;
      const { titulo, descripcion } = req.body;

      const imagen = await Imagen.findByPk(imagenId);
      if (!imagen) return res.status(404).render('404');
      if (imagen.usuario_id !== usuarioId) return res.redirect('/');

      await imagen.update({ titulo, descripcion });

      // actualizar compartidos
      const lista = Array.isArray(req.body.compartirCon)
        ? req.body.compartirCon
        : [req.body.compartirCon].filter(Boolean);

      // borro compartidos anteriores
      await ImagenCompartida.destroy({ where: { imagen_id: imagenId } });

      // creo los nuevos
      for (const receptor_id of lista) {
        await ImagenCompartida.create({
          imagen_id: imagenId,
          compartido_con_id: receptor_id
        });
      }

      return res.redirect(`/album/${imagen.album_id}/albums`);
    } catch (err) {
      next(err);
    }
  },

  // ✨ Eliminar imagen
  async eliminar(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const imagenId  = +req.params.id;

      const imagen = await Imagen.findByPk(imagenId);
      if (!imagen) return res.status(404).render('404');
      if (imagen.usuario_id !== usuarioId) return res.redirect('/');

      const albumId = imagen.album_id;

      // borro relaciones compartidas
      await ImagenCompartida.destroy({ where: { imagen_id: imagenId } });

      // (opcional) borrar comentarios también, si querés:
      // await Comentario.destroy({ where: { imagen_id: imagenId } });

      await imagen.destroy();

      return res.redirect(`/album/${albumId}/albums`);
    } catch (err) {
      next(err);
    }
  }
};

