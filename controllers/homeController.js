const { Op, where } = require('sequelize');
const { Usuario, Friend, Album, Imagen, ImagenCompartida, Comentario, Notificacion, Tag,Evento, UsuarioEvento } = require('../models');

module.exports = {
  // 1) Página principal (Home)
  async showHome(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;

      // — 1. Traer contactos aceptados
      const amigos = await Friend.findAll({
        where: {
          estado: 'Aceptado',
          [Op.or]: [
            { solicitante_id: usuarioId },
            { receptor_id: usuarioId }
          ]
        },
        include: [
          { model: Usuario, as: 'Solicitante', attributes: ['id_usuario','nombre','apellido','avatarUrl'] },
          { model: Usuario, as: 'Receptor',    attributes: ['id_usuario','nombre','apellido','avatarUrl'] }
        ]
      });

      const contacts = amigos.reduce((acc, f) => {
        const amigo = (f.solicitante_id === usuarioId) ? f.Receptor : f.Solicitante;
        // 2) evitar duplicados
        if (!acc.find(u => u.id === amigo.id_usuario)) {
          acc.push({
            id: amigo.id_usuario,
            nombre: amigo.nombre,
            apellido: amigo.apellido,
            avatarUrl: amigo.avatarUrl
          });
        }
        return acc;
      }, []);

      // — 2. Mis propias imágenes en home
      const propias = await Imagen.findAll({
        where: { usuario_id: usuarioId },
        include: [
          { model: Usuario, as: 'Autor', attributes: ['id_usuario','nombre','apellido','avatarUrl'] },
          {
            model: Comentario,
            as: 'Comentarios',
            include: [{ model: Usuario, as: 'Usuario', attributes: ['id_usuario','nombre','apellido','avatarUrl'] }]
          }
        ]
      });

      // — 3. Feed de imágenes compartidas conmigo
      const compartidas = await ImagenCompartida.findAll({
        where: { compartido_con_id: usuarioId },
        include: [{
          model: Imagen,
          include: [
            // Autor de la imagen
            { model: Usuario, as: 'Autor', attributes: ['id_usuario','nombre','apellido','avatarUrl'] },
            // Comentarios as 'Comentarios'
            {
              model: Comentario,
              as: 'Comentarios',
              include: [{
                model: Usuario,
                as: 'Usuario',
                attributes: ['id_usuario','nombre','apellido','avatarUrl']
              }]
            }
          ]
        }],
        order: [[{ model: Imagen }, 'creado_en', 'DESC']]
      });

      // — 4. Mapear a posts para la vista
      const ownPosts = propias.map(img => ({
        id: img.id_imagen,
        titulo: img.titulo,
        descripcion: img.descripcion,
        imageUrl: img.archivo,
        createdAt: img.creado_en,
        user: img.Autor,
        comentarios: (img.Comentarios || []).map(cm => ({
          id: cm.id_comentario,
          contenido: cm.text,
          creadoEn: cm.creado_en,
          user: {
            id: cm.Usuario.id_usuario,
            nombre: cm.Usuario.nombre,
            apellido: cm.Usuario.apellido,
            avatarUrl: cm.Usuario.avatarUrl
          }
        }))
      }));

      const sharedPosts = compartidas.map(c => {
        const img = c.Imagen;
        return {
          id: img.id_imagen,
          titulo: img.titulo,
          descripcion: img.descripcion,
          imageUrl: img.archivo,
          createdAt: img.creado_en,
          user: img.Autor,
          comentarios: (img.Comentarios || []).map(cm => ({
            id: cm.id_comentario,
            contenido: cm.text,
            creadoEn: cm.creado_en,
            user: {
              id: cm.Usuario.id_usuario,
              nombre: cm.Usuario.nombre,
              apellido: cm.Usuario.apellido,
              avatarUrl: cm.Usuario.avatarUrl
            }
          }))
        };
      });

      const posts = [...ownPosts, ...sharedPosts]
        .sort((a, b) => b.createdAt - a.createdAt);

      // — 5. Próximos eventos donde estoy inscripto (ordenados por fecha)
      const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

      const eventos = await Evento.findAll({
        include: [{
          model: UsuarioEvento,
          where: { usuario_id: usuarioId },
          attributes: []      
        }],
        where: {
          fecha: { [Op.gte]: today }
        },
        order: [['fecha', 'ASC']] 
      });

      return res.render('home', { posts, contacts, eventos });
    } catch (err) {
      next(err);
    }
  },

  // 2)1 Explorar usuarios
  async showExplorar(req, res, next) {
    try {
      const miId = req.session.usuarioId;

      // 2.1) Traigo todos los usuarios salvo yo
      const usuariosRaw = await Usuario.findAll({
        where: { id_usuario: { [Op.ne]: miId } },
        attributes: ['id_usuario','nombre','apellido','avatarUrl']
      });

      // 2.2) Traigo las relaciones *que yo lancé* y están PENDIENTES o ACEPTADAS
      const lanzadas = await Friend.findAll({
        where: {
          solicitante_id: miId,
          estado: { [Op.in]: ['Pendiente','Aceptado'] } 
        }
      });
      const enviadosIds = lanzadas.map(r => r.receptor_id);

      // 2.3)arreglo final
      const usuarios = usuariosRaw
        .filter(u => !enviadosIds.includes(u.id_usuario))
        .map(u => {
          const rel = lanzadas.find(r => r.receptor_id === u.id_usuario);
          return {
            id_usuario: u.id_usuario,
            nombre: u.nombre,
            apellido: u.apellido,
            avatarUrl: u.avatarUrl,
            estado: rel ? rel.estado : null   
          };
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
      const receptor_id = +req.body.receptorId;
      
      // 1) comprobar duplicados en ambas direcciones
      const yaExiste = await Friend.findOne({
        where: {solicitante_id, receptor_id}
      });
      if (yaExiste) {
        return res.redirect('/');
      }

      // 2) Crear solicitud
      const nuevaSolicitud = await Friend.create({
        solicitante_id,
        receptor_id,
        estado: 'Pendiente'
      });

     //Crear notificación para el receptor
      await Notificacion.create({
        usuario_id: receptor_id,
        tipo: 'Solicitud',
        mensaje: 'Has recibido una nueva solicitud de amistad',
        origin_id: nuevaSolicitud.id_friend
      });

      // 3) Emitir notificación en tiempo real al receptor
      const io          = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers');
      const socketId    = onlineUsers[receptor_id];

      if (io && socketId) {
        // saco los datos del usuario de la BD (no de la sesión)
        const solicitante = await Usuario.findByPk(solicitante_id, {
          attributes: ['id_usuario','nombre','apellido','avatarUrl']
        });

        io.to(socketId).emit('notification:friend_request', {
          solicitudId: nuevaSolicitud.id_friend,
          from: {
            id: solicitante.id_usuario,
            nombre: solicitante.nombre,
            apellido: solicitante.apellido,
            avatarUrl: solicitante.avatarUrl || '/default-avatar.png'
          }
        });
      }

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

      // Marcar notificación como leída
      await Notificacion.update(
        { leido: true },
        {
          where: {
            usuario_id: usuarioId,
            tipo: 'Solicitud',
            origin_id: solicitudId
          }
        }
      );
      // Crear notificación para el solicitante
      await Notificacion.create({
        usuario_id: sol.solicitante_id,
        tipo: 'Solicitud',
        mensaje: `Tu solicitud fue ${sol.estado.toLowerCase()}`,
        origin_id: sol.id_friend
      });

      // emitir notificación en tiempo real al solicitante
      const io          = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers');
      const socketId    = onlineUsers[sol.solicitante_id];

      if (io && socketId) {
        const usuarioAcept = await Usuario.findByPk(usuarioId, {
          attributes: ['id_usuario','nombre','apellido','avatarUrl']
        });

        io.to(socketId).emit('notification:friend_response', {
          solicitudId,
          estado: sol.estado,
          from: {
            id: usuarioAcept.id_usuario,
            nombre: usuarioAcept.nombre,
            apellido: usuarioAcept.apellido,
            avatarUrl: usuarioAcept.avatarUrl || '/default-avatar.png'
          }
        });
      }

      if (action === 'aceptar') {
        const usuarioAcept = await Usuario.findByPk(usuarioId);
        await Album.create({
          titulo:      `${usuarioAcept.nombre} ${usuarioAcept.apellido}`,
          usuario_id:  sol.solicitante_id,
          autoCreado:  true
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
            { receptor_id: usuarioId }
          ]
        },
        include: [
          { model: Usuario, as: 'Solicitante', attributes: ['id_usuario','nombre','apellido','avatarUrl'] },
          { model: Usuario, as: 'Receptor',   attributes: ['id_usuario','nombre','apellido','avatarUrl'] }
        ]
      });
      const contactos = amigos.reduce((acc,f)=> {
        const a = (f.solicitante_id === usuarioId) ? f.Receptor : f.Solicitante;
        if(!acc.find(u=> u.id === a.id_usuario)){
          acc.push({
            id: a.id_usuario,
            nombre: `${a.nombre} ${a.apellido}`,
            avatarUrl: a.avatarUrl
          })
        }
          return acc;
        },[]);

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
      const file = req.file;
      const { descripcion, compartirCon, albumId, titulo } = req.body;

      if (!file) {
        return res.status(400).send('No se subió ningún archivo');
      }

      // 1) Crear la imagen
      const imagen = await Imagen.create({
        archivo: `/uploads/${file.filename}`,
        titulo,
        descripcion,
        album_id: albumId || null,
        usuario_id: usuarioId
      });

      // 2) Normalizar lista de ID
      const lista = Array.isArray(compartirCon)
        ? compartirCon.filter(Boolean)
        : [compartirCon].filter(Boolean);

      // 3) Crear los registros en ImagenCompartida
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

      // 1) Solicitudes de amistad pendientes
      const solicitudes = await Friend.findAll({
        where: { receptor_id: usuarioId, estado: 'Pendiente' },
        include: [
          {
            model: Usuario,
            as: 'Solicitante',
            attributes: ['id_usuario','nombre','apellido','avatarUrl']
          }
        ]
      });

      // 2) Comentarios en tus imágenes
      const comentarios = await Comentario.findAll({
        include: [
          {
            model: Imagen,
            attributes: ['id_imagen','titulo','archivo','album_id','usuario_id'],
            include: [
              {
                model: Usuario,
                as: 'Autor',
                attributes: ['id_usuario']
              }
            ]
          },
          {
            model: Usuario,
            as: 'Usuario', // quien comenta
            attributes: ['id_usuario','nombre','apellido','avatarUrl']
          }
        ],
        // Solo comentarios sobre imágenes cuyo autor sos vos
        where: {
          '$Imagen.Autor.id_usuario$': usuarioId
        },
        order: [['creado_en','DESC']],
        limit: 20
      });
      // 3) Todas las notificaciones del usuario
      const notifs = await Notificacion.findAll({
        where: { usuario_id: usuarioId }
      });

      // 4) IDs de origen NO leídos
      const solicitudesNoLeidasIds = notifs
        .filter(n => n.tipo === 'Solicitud' && !n.leido)
        .map(n => n.origin_id);

      const comentariosNoLeidosIds = notifs
        .filter(n => n.tipo === 'Comentario' && !n.leido)
        .map(n => n.origin_id);

      return res.render('notificaciones', {
        solicitudes,
        comentarios,
        solicitudesNoLeidasIds,
        comentariosNoLeidosIds
      })
    } catch (err) {
      next(err);
    }
  },

  // 8) Ver notificación de comentario
  async verNotificacionComentario(req, res, next) {
    try {
      const usuarioId   = req.session.usuarioId;
      const comentarioId = req.params.id;

      // 1) Marcar notificación como leída
      await Notificacion.update(
        { leido: true },
        {
          where: {
            usuario_id: usuarioId,
            tipo: 'Comentario',
            origin_id: comentarioId
          }
        }
      );

      // 2) Buscar el comentario para saber a qué imagen corresponde
      const comentario = await Comentario.findByPk(comentarioId, {
        include: [{ model: Imagen, attributes: ['id_imagen'] }]
      });

      if (!comentario || !comentario.Imagen) {
        return res.redirect('/notificaciones');
      }

      // 3) Redirigir al detalle de la imagen
      return res.redirect(`/imagen/detalle/${comentario.Imagen.id_imagen}`);
    } catch (err) {
      next(err);
    }
  },
  // 9) Búsqueda global
  async buscar(req, res, next) {
    try {
      const q = (req.query.q || '').trim();
      const miId = req.session.usuarioId;

      if (!q) {
        return res.render('buscar', {
          query: '',
          usuarios: [],
          albums: [],
          imagenes: []
        });
      }

      const like = `%${q}%`;

      // 1) Usuarios por nombre / apellido / intereses
      const usuariosDB = await Usuario.findAll({
        where: {
          id_usuario: { [Op.ne]: miId },
          [Op.or]: [
            { nombre:    { [Op.like]: like } },
            { apellido:  { [Op.like]: like } },
            { intereses: { [Op.like]: like } }
          ]
        },
        attributes: ['id_usuario', 'nombre', 'apellido', 'avatarUrl']
      });

      let usuarios = [];

      if (usuariosDB.length > 0) {
        const idsUsuarios = usuariosDB.map(u => u.id_usuario);

      // Traer relaciones de amistad con esos usuarios
        const amistades = await Friend.findAll({
          where: {
            [Op.or]: [
              { solicitante_id: miId, receptor_id: { [Op.in]: idsUsuarios } },
              { solicitante_id: { [Op.in]: idsUsuarios }, receptor_id: miId }
            ]
          }
        });

        // Mapa: idUsuario ↦ { tipo, friendId }
        const relacionesMap = {};
        amistades.forEach(a => {
          const otroId = a.solicitante_id === miId ? a.receptor_id : a.solicitante_id;

          let tipo;
          if (a.estado === 'Aceptada') {
            tipo = 'amigos';
          } else if (a.estado === 'Pendiente') {
            tipo = a.solicitante_id === miId
              ? 'pendiente_enviada'
              : 'pendiente_recibida';
          }

          relacionesMap[otroId] = {
            tipo,
            friendId: a.id_friend || a.id
          };
        });

        // Pasamos a objetos plain + la relación
        usuarios = usuariosDB.map(u => ({
          ...u.get({ plain: true }),
          relacion: relacionesMap[u.id_usuario] || null
        }));
      }

      // 2) Álbumes por título
      const albumsTitulo = await Album.findAll({
        where: { titulo: { [Op.like]: like } },
        include: [
          {
            model: Usuario,
            attributes: ['id_usuario', 'nombre', 'apellido', 'avatarUrl']
          },
          {
            model: Tag,
            through: { attributes: [] }
          }
        ]
      });

      // 3) Álbumes por tag
      const albumsPorTag = await Album.findAll({
        include: [
          {
            model: Tag,
            through: { attributes: [] },
            where: { nombre: { [Op.like]: like } }
          },
          {
            model: Usuario,
            attributes: ['id_usuario', 'nombre', 'apellido', 'avatarUrl']
          }
        ]
      });

      // Deduplicar álbumes
      const albumsMap = new Map();
      for (const a of [...albumsTitulo, ...albumsPorTag]) {
        if (!albumsMap.has(a.id_album)) {
          albumsMap.set(a.id_album, a);
        }
      }
      const albums = Array.from(albumsMap.values());

      // 4) Imágenes por título / descripción o por tag del álbum
      const imagenes = await Imagen.findAll({
        include: [
          {
            model: Usuario,
            as: 'Autor',
            attributes: ['id_usuario', 'nombre', 'apellido', 'avatarUrl']
          },
          {
            model: Album,
            required: false,
            include: [
              {
                model: Tag,
                required: false,
                through: { attributes: [] }
              }
            ]
          }
        ],
        where: {
          [Op.or]: [
            { titulo:      { [Op.like]: like } },
            { descripcion: { [Op.like]: like } },
            { '$Album.Tags.nombre$': { [Op.like]: like } }
          ]
        },
        order: [['creado_en', 'DESC']]
      });

      return res.render('buscar', {
        query: q,
        usuarios,
        albums,
        imagenes
      });
    } catch (err) {
      next(err);
    }
  },
};


