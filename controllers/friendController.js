const {Friend} = require('../models');

module.exports ={
    async toggleAmigo(req, res, next) {
        try{
            const usuarioId = req.session.usuarioId;
            const amigoId = req.params.id;

            // ya existe relacion?
            const relacion = await Friend.findOne({
                where: {
                    solicitante_id: usuarioId,
                    receptor_id: amigoId
                }
            });
            if(relacion){
                await relacion.destroy();
                return res.json({status:'eliminado'});
            }
            await Friend.create({ solicitante_id: usuarioId, receptor_id: amigoId });
            res.json({ status: 'agregado' });
        } catch (err) {
            next(err);
        }
    }
};