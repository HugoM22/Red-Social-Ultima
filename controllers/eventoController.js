const { Evento, UsuarioEvento, Usuario } = require('../models');
const { Op } = require('sequelize');

module.exports = {
  // Listar eventos, saber a cuáles estoy inscripto
  async listar(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;

      const eventos = await Evento.findAll({
        include: [
          {
            model: Usuario,
            attributes: ['id_usuario', 'nombre', 'apellido']
          }
        ],
        order: [['fecha', 'ASC']]
      });

      // eventos donde este usuario está inscripto
      const inscripciones = await UsuarioEvento.findAll({
        where: { usuario_id: usuarioId },
        attributes: ['evento_id']
      });
      const inscritosIds = inscripciones.map(i => i.evento_id);

      return res.render('eventos', { eventos, inscritosIds });
    } catch (err) {
      next(err);
    }
  },

  // Crear un nuevo evento
  async crear(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const { titulo, descripcion, fecha, lugar } = req.body;

      await Evento.create({
        titulo,
        descripcion,
        fecha,
        lugar,
        creado_por: usuarioId
      });

      res.redirect('/eventos');
    } catch (err) {
      next(err);
    }
  },

  // Inscribirse a un evento
  async inscribirse(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const eventoId = req.params.id;

      const ya = await UsuarioEvento.findOne({
        where: {
          usuario_id: usuarioId,
          evento_id: eventoId
        }
      });

      if (!ya) {
        await UsuarioEvento.create({
          usuario_id: usuarioId,
          evento_id: eventoId
        });
      }

      res.redirect('/eventos');
    } catch (err) {
      next(err);
    }
  },

  // Desinscribirse
  async desinscribirse(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const eventoId = req.params.id;

      await UsuarioEvento.destroy({
        where: {
          usuario_id: usuarioId,
          evento_id: eventoId
        }
      });

      res.redirect('/eventos');
    } catch (err) {
      next(err);
    }
  }
};
