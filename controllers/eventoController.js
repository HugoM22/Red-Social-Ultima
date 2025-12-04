const { Op } = require('sequelize');
const { Evento, UsuarioEvento, Usuario } = require('../models');

function hoyLocalStr() {
  const h = new Date();
  const año = h.getFullYear();
  const mes = String(h.getMonth() + 1).padStart(2, '0');
  const dia = String(h.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

module.exports = {
  // Listar eventos
  async listar(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;

      const hoyStr = hoyLocalStr();

      const eventosDB = await Evento.findAll({
        include: [
          {
            model: Usuario,
            attributes: ['id_usuario', 'nombre', 'apellido']
          },
          {
            model: UsuarioEvento,
            attributes: ['id_usuario_evento']
          }
        ],
        order: [['fecha', 'ASC']]
      });

      // eventos donde el usuario está inscripto
      const inscripciones = await UsuarioEvento.findAll({
        where: { usuario_id: usuarioId },
        attributes: ['evento_id']
      });
      const inscritosIds = inscripciones.map(i => i.evento_id);

      const eventos = eventosDB.map(e => {
        const plain = e.get({ plain: true });
        const esPasado = plain.fecha < hoyStr;
        return {
          ...plain,
          esPasado,
          inscriptos: (plain.UsuarioEventos || []).length
        };
      });

      return res.render('eventos', { eventos, inscritosIds });

    } catch (err) {
      next(err);
    }
  },

  //formulario crear evento
  formCrear(req, res) {
    res.render('eventos', { error: null, old: {} });
  },

  //Crear evento
  async crear(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const { titulo, descripcion, fecha, lugar } = req.body;

      const old = { titulo, descripcion, fecha, lugar };
      const hoy = new Date();

      if (!titulo || !descripcion || !fecha || !lugar) {
        return res.status(400).render('eventos', {
          error: 'Completá todos los campos.',
          old
        });
      }

      const fEvento = new Date(fecha);
      if (isNaN(fEvento.getTime())) {
        return res.status(400).render('eventos', {
          error: 'La fecha del evento no es válida.',
          old
        });
      }

      const soloHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const soloEvento = new Date(fEvento.getFullYear(), fEvento.getMonth(), fEvento.getDate());

      if (soloEvento < soloHoy) {
        return res.status(400).render('eventos', {
          error: 'La fecha del evento debe ser hoy o una fecha futura.',
          old
        });
      }

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

  //Eliminar evento
  async eliminar(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const id = req.params.id;

      const evento = await Evento.findByPk(id);

      if (!evento || evento.creado_por !== usuarioId) {
        return res.redirect('/eventos');
      }

      await UsuarioEvento.destroy({ where: { evento_id: id } });
      await evento.destroy();

      res.redirect('/eventos');
    } catch (err) {
      next(err);
    }
  },

  //inscribirse a un evento
  async inscribirse(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const eventoId = req.params.id;

      const evento = await Evento.findByPk(eventoId);
      if (!evento) return res.redirect('/eventos');

      const hoyStr = hoyLocalStr();

      if (evento.fecha < hoyStr) {
        return res.redirect('/eventos');
      }

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

  // DESINSCRIBIRSE
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


