const { Op } = require('sequelize');
const {Usuario, Album,Imagen,Friend,Login} = require('../models');
const bcrypt = require('bcrypt');
module.exports={
    // Mostrar perfil del usuario con sus albumnes
    async verPerfil(req,res,next){
        try{
            const usuarioId= req.params.id;
            const usuario = await Usuario.findByPk(usuarioId,{
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
            const{
                nombre,
                apellido,
                sexo,
                intereses,
                antecedentes
            } = req.body;
            await Usuario.update(
                {
                    nombre,
                    apellido,
                    sexo,
                    intereses,
                    antecedentes
                },
                {where: {id_usuario: usuarioId}}
            );
            // actualizar datos
            req.session.nombre = nombre;
            req.session.apellido = apellido;

            req.session.nombreUsuario = nombre;
            req.session.apellidoUsuario = apellido;
            
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
            if(!file) return res.status(400).send('No se subió ninguna imagen');

            const avatarUrl = `/uploads/${file.filename}`;

            await Usuario.update(
            { avatarUrl },
            { where: { id_usuario: usuarioId } }
            );
            // actualizar datos de sesion
            req.session.usuarioAvatar = avatarUrl;

            res.redirect(`/usuarios/perfil/${usuarioId}`);
        }catch(err){
            next(err);
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

    // Mostrar formulario de cambio de contraseña
    async formPassword(req,res,next){
        try{
            const usuarioId = req.session.usuarioId;

            if (+req.params.id !== usuarioId) {
            return res.redirect('/'); 
            }

            res.render('perfilPassword', { usuarioId });
        }catch(err){
            next(err);
        }
    },
    // Procesar cambio de contraseña
    async cambiarPassword(req,res,next){
        try{
            const usuarioId = req.session.usuarioId;

            if (+req.params.id !== usuarioId) {
            return res.redirect('/');
            }

            const { actual, nueva, confirmar } = req.body;

            if (!actual || !nueva || !confirmar) {
            return res.render('perfilPassword', {
                usuarioId,
                error: 'Completá todos los campos.'
            });
            }

            if (nueva !== confirmar) {
            return res.render('perfilPassword', {
                usuarioId,
                error: 'La nueva contraseña y la confirmación no coinciden.'
            });
            }

            // Buscar login del usuario
            const login = await Login.findOne({
            where: { usuario_id: usuarioId }
            });

            if (!login) {
            return res.render('perfilPassword', {
                usuarioId,
                error: 'No se encontró el registro de login.'
            });
            }

            // Verificar contraseña actual
            const ok = await bcrypt.compare(actual, login.contrasenia);
            if (!ok) {
            return res.render('perfilPassword', {
                usuarioId,
                error: 'La contraseña actual es incorrecta.'
            });
            }

            // Hashear nueva contraseña
            const hash = await bcrypt.hash(nueva, 10);
            login.contrasenia = hash;
            await login.save();

            res.render('perfilPassword', {
            usuarioId,
            success: 'La contraseña se actualizó correctamente.'
            });
        }catch(err){
            next(err);
        }
    }
};
