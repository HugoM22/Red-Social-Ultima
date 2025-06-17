const { Op } = require('sequelize');
const {Usuario, Album,Imagen,Friend} = require('../models');
module.exports={
    // Mostrar perfil del usuario con sus albumnes
    async verPerfil(req,res,next){
        try{
            const usuarioId= req.params.id;
            const usuario = await Usuario.findByPk(usuarioId,{
                attributes:['id_usuario','nombre','email','avatarUrl'],
                include:[
                    {
                        model: Album,
                        attributes:['id_album','titulo','creado_en'],
                        include:[{
                            model:Imagen,
                            as: 'Imagens',
                            attributes:['id_imagen','archivo','titulo'],
                            order: [['creado_en','DESC']],
                            limit: 1
                        }]
                    }
                ]
            });
            if(!usuario)return res.status(404).render('404');
            res.render('perfil',{usuario});
        }catch(err){
            next(err);
        }
    },
    //Mostrar Formulario de edicion de perfil
    async editarForm(req,res,next){
        try{
        const usuario = await Usuario.findByPk(req.session.usuarioId);
            res.render('perfilEditar' , {usuario});
        } catch(err){
            next(err);
        }
    },
    //Procesar actualizacion de datos perfil
    async actualizar(req,res,next){
        try{
            const usuarioId = req.session.usuarioId;
            const {nombre,email}=req.body;
        await Usuario.update({nombre,email},{where:{id:usuarioId}});
            res.redirect(`/usuarios/perfil/${usuarioId}`);
        }catch(err){
            next(err);
        }
    },
    //procesar cambio de avatar (subida de imagen)
    async cambiarAvatar(req,res,next){
        try{
            const usuarioId = req.session.usuarioId;
            const file = req.file;
            if(!file)return res.status(400).send('No se subio ninguna');
            await Usuario.update(
                {avatarUrl: `/uploads/${file.filename}`},
                {where: {id_usuario: usuarioId}}
            );
        }catch(err){
            next(err)
        }
    },
    //listar todos los usuarios (menos el logueado)
    async listarUsuarios(req,res,next){
        try{
            const usuarios = await Usuario.findAll({
                where:{ id_usuario: {[Op.ne]:req.session.usuarioId}},
                attributes: ['id_usuario','nombre','apellido','avatarUrl'],
                order: [['nombre','ASC']],
            });
            res.render('explorar',{usuarios});
        }catch(err){
            next(err);
        }
    },
    //Enviar solicitud de amistad
    async enviarSolicitud(req,res,next){
        try{
            const solicitante_id = req.session.usuarioId;
            const {receptorId} = req.body;

            //enviar duplicados
            const existe = await Friend.findOne({
                where:{
                    solicitante_id,
                    receptor_id: receptorId,
                },
            });
            if(!existe){
                await Friend.create({
                    solicitante_id,
                    receptor_id: receptorId,
                    estado:'Pendiente',
                });
            }
            res.redirect('/usuarios/explorar');
        } catch(err){
            next(err);
        }
    }
};
