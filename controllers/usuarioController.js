const { Op } = require('sequelize');
const {Usuario, Album,Imagen,Friend,Login, Comentario,UsuarioEvento} = require('../models');
const bcrypt = require('bcrypt');
module.exports={
    // Mostrar perfil del usuario con sus álbumes + estadísticas
    async verPerfil(req, res, next) {
        try {
            const usuarioId = req.params.id;

            // 1) Datos del usuario + sus álbumes
            const usuario = await Usuario.findByPk(usuarioId, {
            attributes: [
                'id_usuario',
                'nombre',
                'apellido',
                'email',
                'avatarUrl',
                'fecha_nacimiento',
                'sexo',
                'intereses',
                'antecedentes',
                'creado_en'
            ],
            include: [
                {
                model: Album,
                attributes: ['id_album', 'titulo', 'creado_en'],
                include: [
                    {
                    model: Imagen,
                    as: 'Imagens',   
                    attributes: ['id_imagen', 'archivo', 'titulo', 'creado_en']
                    }
                ]
                }
            ]
            });

            if (!usuario) return res.status(404).render('404');

            // 2) Estadísticas básicas

            // Albumnes subidos por este usuario
            const totalAlbums = usuario.Albums ? usuario.Albums.length : 0;

            // Imágenes subidas por este usuario
            const totalImagenes = await Imagen.count({
            where: { usuario_id: usuarioId }
            });

            // Ids de imágenes del usuario
            const imagenesUsuario = await Imagen.findAll({
            where: { usuario_id: usuarioId },
            attributes: ['id_imagen']
            });
            const imagenIds = imagenesUsuario.map(i => i.id_imagen);

            // Comentarios recibidos en esas imágenes
            let totalComentariosRecibidos = 0;
            if (imagenIds.length) {
            totalComentariosRecibidos = await Comentario.count({
                where: {
                imagen_id: { [Op.in]: imagenIds }
                }
            });
            }

            // Amigos
           const amistades = await Friend.findAll({
            where: {
                estado: 'Aceptado',
                [Op.or]: [
                { solicitante_id: usuarioId },
                { receptor_id: usuarioId }
                ]
            },
            attributes: ['solicitante_id', 'receptor_id']
            });

            const amigosIds = new Set();
            const uid = Number(usuarioId);

            for (const f of amistades) {
                const otroId = f.solicitante_id === uid
                    ? f.receptor_id
                    : f.solicitante_id;
                amigosIds.add(otroId);
            }

            const totalAmigos = amigosIds.size;

            // Eventos a los que está inscripto
            let totalEventosInscripto = 0;
            try {
                totalEventosInscripto = await UsuarioEvento.count({
                    where: { usuario_id: usuarioId }
                });
                } catch (e) {
                    totalEventosInscripto = 0;
            }

            const stats = {
            totalImagenes,
            totalAlbums,
            totalComentariosRecibidos,
            totalAmigos,
            totalEventosInscripto
            };

            return res.render('perfil', { usuario, stats });
        } catch (err) {
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
