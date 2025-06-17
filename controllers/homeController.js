const { Op, where } = require('sequelize');
const { Usuario, Friend, Album, Imagen, ImagenCompartida, Comentario } = require('../models');

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
        // 2)evitar duplicados
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
      //-2 mis propias imaganes en home
      const propias =await Imagen.findAll({
        where:{usuario_id: usuarioId},
        include:[
          {model:Usuario, as: 'Autor', attributes:['id_usuario','nombre','apellido','avatarUrl']},
          {model: Comentario, as: 'Comentarios',
            include:[{model: Usuario, as: 'Usuario', attributes:['id_usuario','nombre','apellido','avatarUrl']}]
          }
        ]
      })

      // — 3 Feed de imágenes compartidas conmigo
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
          descripcion:img.descripcion,
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
          descripcion:img.descripcion,
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
        .sort((a,b)=>b.createdAt - a.createdAt)
      return res.render('home', { posts, contacts });
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
      
      // 1 comprobar duplicados en ambas direccion
      const yaExiste = await Friend.findOne({
        where: { solicitante_id, receptor_id }
      });
      if(yaExiste){
        return res.redirect('/');
      }
      //2) si no existia, la creo
      await Friend.create({
        solicitante_id,
        receptor_id,
        estado: 'Pendiente'
      });
      //Emitir notificacion en tiempo real al receptor
      const io = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers');
      const socketId = onlineUsers[receptor_id];

      if(socketId){
        io.to(socketId).emit('notification:friend_request',{
          solicitudId: nuevaSolicitud.id_friend,
          from:{
            id: solicitante_id,
            nombre: req.session.usuarioNombre,
            apellido: req.session.usuarioApellido,
            avatarUrl: req.session.usuarioAvatar || '/default-avatar.png'
          }
        })
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

      //emitir notificacion en tiempo real al solicitante
      const io = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers');
      const socketId = onlineUsers[sol.solicitante_id];

      if(socketId){
        io.to(socketId).emit('notification:friend_response',{
          solicitudId,
          estado
        })
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
      const contactos = amigos.map(f => {
        const a = (f.solicitante_id === usuarioId) ? f.Receptor : f.Solicitante;
        return { id: a.id_usuario, nombre: `${a.nombre} ${a.apellido}`, avatarUrl: amigo.avatarUrl };
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


