const { Friend } = require('../models');

module.exports = {
  async toggleAmigo(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const amigoId = req.params.id;

      const relacion = await Friend.findOne({
        where: {
          solicitante_id: usuarioId,
          receptor_id: amigoId
        }
      });

      if (relacion) {
        await relacion.destroy();
        return res.json({ status: 'eliminado' });
      }

      await Friend.create({
        solicitante_id: usuarioId,
        receptor_id: amigoId,
        estado: 'Pendiente'
      });

      res.json({ status: 'agregado' });
    } catch (err) {
      next(err);
    }
  },

  //Dejar de ser amigos
  /*
  async remove(req, res, next) {
    try {
      const usuarioId = req.session.usuarioId;
      const { friendId } = req.body; 

      // Buscamos la relación por id_friend
      const relacion = await Friend.findByPk(friendId);

      if (!relacion) {
        return res.redirect('back');
      }

      if (
        relacion.solicitante_id !== usuarioId &&
        relacion.receptor_id !== usuarioId
      ) {
        return res.status(403).send('No estás autorizado para hacer esto.');
      }

      await relacion.destroy();

      // Volver a la página desde donde vino
      return res.redirect('/home');
    } catch (err) {
      next(err);
    }
  } */
};