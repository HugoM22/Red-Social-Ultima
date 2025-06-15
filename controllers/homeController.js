const { Op } = require('sequelize');
const { Usuario, Friend, Album, Imagen, ImagenCompartida, Comentario } = require('../models');

module.exports = {
  // 1) Página principal (Home)
  async showHome(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;

      // Lista de amigos aceptados
      const amigos = await Friend.findAll({
        where: {
          estado: 'Aceptado',
          [Op.or]: [
            { solicitante_id: usuarioId },
            { receptor_id:   usuarioId }
          ]
        },
        include: [
          { model: Usuario, as: 'Solicitante', attributes: ['id_usuario', 'nombre', 'apellido'] },
          { model: Usuario, as: 'Receptor',   attributes: ['id_usuario', 'nombre', 'apellido'] }
        ]
      });
      const contacts = amigos.map(f => {
        const amigo = (f.solicitante_id === usuarioId) ? f.Receptor : f.Solicitante;
        return { id: amigo.id_usuario, nombre: `${amigo.nombre} ${amigo.apellido}` };
      });

      // Feed de imágenes compartidas contigo
      const compartidas = await ImagenCompartida.findAll({
        where: { compartido_con_id: usuarioId },
        include: [{
          model: Imagen,
          include: [
            { model: Usuario, as: 'Autor', attributes: ['id_usuario', 'nombre', 'avatarUrl'] },
            { model: Comentario }
          ]
        }],
        order: [[{ model: Imagen }, 'creado_en', 'DESC']]
      });
      const posts = compartidas.map(c => {
        const img = c.Imagen;
        return {
          id: img.id_imagen,
          descripcion: img.descripcion,
          imageUrl: img.archivo,
          createdAt: img.creado_en,
          user: img.Autor
        };
      });

      return res.render('home', { posts, contacts });
    } catch (err) {
      next(err);
    }
  },

  // 2) Explorar usuarios
  async showExplorar(req, res, next) {
    try {
      const miId = req.session.usuarioId;
      const usuarios = await Usuario.findAll({
        where: { id_usuario: { [Op.ne]: miId } },
        attributes: ['id_usuario','nombre','apellido','avatarUrl']
      });
      return res.render('explorar', { usuarios });
    } catch (err) {
      next(err);
    }
  },

  // 3) Enviar solicitud de amistad
  async sendRequest(req, res, next) {
    try {
      const solicitante_id = req.session.usuarioId;
      const { receptorId } = req.body;
      await Friend.create({ solicitante_id, receptor_id: receptorId, estado: 'Pendiente' });
      return res.redirect('/');
    } catch (err) {
      next(err);
    }
  },

  // 4) Responder solicitud de amistad
  async respondRequest(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const { solicitudId, action } = req.body;
      const sol = await Friend.findByPk(solicitudId);
      if (!sol || sol.receptor_id !== usuarioId) return res.redirect('/');

      sol.estado = action === 'aceptar' ? 'Aceptado' : 'Rechazado';
      await sol.save();

      if (action === 'aceptar') {
        const usuarioAcept = await Usuario.findByPk(usuarioId);
        await Album.create({
          titulo: `${usuarioAcept.nombre} ${usuarioAcept.apellido}`,
          usuario_id: sol.solicitante_id,
          autoCreado: true
        });
      }
      return res.redirect('/');
    } catch (err) {
      next(err);
    }
  },

  // 5) Mostrar formulario de publicar
  async showPublicar(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;

      // 1) Amigos aceptados → contactos
      const amigos = await Friend.findAll({
        where: {
          estado: 'Aceptado',
          [Op.or]: [
            { solicitante_id: usuarioId },
            { receptor_id:   usuarioId }
          ]
        },
        include: [
          { model: Usuario, as: 'Solicitante', attributes: ['id_usuario','nombre','apellido'] },
          { model: Usuario, as: 'Receptor',   attributes: ['id_usuario','nombre','apellido'] }
        ]
      });
      const contactos = amigos.map(f => {
        const a = (f.solicitante_id === usuarioId) ? f.Receptor : f.Solicitante;
        return { id: a.id_usuario, nombre: `${a.nombre} ${a.apellido}` };
      });

      // 2) Títulos automáticos (álbumes de amistad)
      const titulosAuto = contactos.map(c => c.nombre);

      // 3) Álbumes propios (manuales)
      const misAlbumnesPropios = await Album.findAll({
        where: {
          usuario_id: usuarioId,
          titulo:     { [Op.notIn]: titulosAuto }
        },
        order: [['creado_en','DESC']]
      });

      // 4) Solicitudes pendientes
      const solicitudes = await Friend.findAll({
        where: { estado: 'Pendiente', receptor_id: usuarioId },
        include: [{ model: Usuario, as: 'Solicitante', attributes: ['id_usuario','nombre','apellido','avatarUrl'] }]
      });

      // 5) Imágenes compartidas
      const compartidas = await ImagenCompartida.findAll({
        where: { compartido_con_id: usuarioId },
        include: [{
          model: Imagen,
          include: [
            { model: Usuario, as: 'Autor', attributes: ['id_usuario','nombre','Apellido','avatarUrl'] },
            { model: Comentario, include: [{ model: Usuario, attributes: ['nombre','avatarUrl'] }] }
          ]
        }],
        order: [[{ model: Imagen }, 'creado_en','DESC']]
      });

      // Depuración
      console.log('Álbumes propios:', misAlbumnesPropios.map(a => a.titulo));
      console.log('Contactos:', contactos.map(c => c.nombre));

      // 6) Render
      return res.render('publicar', {
        misAlbumnesPropios,
        contactos,
        solicitudes,
        compartidas
      });
    } catch (err) {
      next(err);
    }
  },

  // 6) Publicar imagen y compartir
  async publishImage(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const file      = req.file;
      const { descripcion, compartirCon, albumId, titulo } = req.body;

      if (!file) {
        return res.status(400).send('No se subió ningún archivo');
      }

      // 1) Crear la imagen
      const imagen = await Imagen.create({
        archivo:    `/uploads/${file.filename}`,
        titulo,
        descripcion,
        album_id:   albumId || null,
        usuario_id: usuarioId
      });

      // 2) Normalizar lista de IDs (puede venir string, array o undefined)
      const lista = Array.isArray(compartirCon)
        ? compartirCon.filter(Boolean)
        : [compartirCon].filter(Boolean);

      // 3) Crear los registros en ImagenCompartida usando el campo correcto
      for (const compartidoConId of lista) {
        await ImagenCompartida.create({
          imagen_id:          imagen.id_imagen,
          compartido_con_id:  compartidoConId
        });
      }

      return res.redirect('/');
    } catch (err) {
      next(err);
    }
  },

  // 7) Mostrar notificaciones
  async showNotificaciones(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const solicitudes = await Friend.findAll({
        where: { receptor_id: usuarioId, estado: 'Pendiente' },
        include: [{ model: Usuario, as: 'Solicitante', attributes: ['id_usuario','nombre','apellido','avatarUrl'] }]
      });
      return res.render('notificaciones', { solicitudes });
    } catch (err) {
      next(err);
    }
  }
};


