const bcrypt = require('bcrypt');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { Usuario , Login , sequelize } = require('../models');

module.exports={
    //GET Login
    formLogin(req,res){
        res.render('login',{title:'Iniciar Sesion'});
    },

    //POST Login
    async login(req,res,next){
        try{
            const {email,password} = req.body;
            const usuario = await Usuario.findOne({
                where:{email},
                include: Login
            });
            if(!usuario){
                return res.render('login',{title:'Iniciar Sesion',error:'Credenciales Invalidas'});
            }
            const ok= await bcrypt.compare(password,usuario.Login.contrasenia);
            if(!ok){
                return res.render('login',{title:'Iniciar Sesion', error:'Credenciales Invalidas'});
            }
            req.session.usuarioId= usuario.id_usuario;
            res.redirect('/');
        }catch(err){
            next(err);
        }
    },
    //Get registrar
    formRegistrar(req,res){
        res.render('registrar',{title:'Crear Cuenta'});
    },
    //POST registrar
    async registrar(req,res,next){
        console.log('BODY:', req.body);
        console.log('FILE (single):', req.file);
        console.log('FILES (array):', req.files);
        const t= await sequelize.transaction();
        try{
            const{
                nombre,
                apellido,
                fecha_nacimiento,
                sexo,
                intereses,
                antecedentes,
                email,
                password
            }=req.body;

            let avatarUrl = null;
            const file = req.file;
            if (file && file.path){
                const destDir = path.join(__dirname,'..','public','uploads');
                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir,{recursive: true});

                const nombreArchivo = `avatar-${Date.now()}.jpg`;
                const outputPath = path.join(destDir,nombreArchivo)

                await sharp(file.path)
                    .resize({width:300})
                    .jpeg({ quality:80})
                    .toFile(outputPath);
                avatarUrl=`/uploads/${nombreArchivo}`
            }

            const usuario = await Usuario.create({
                nombre,
                apellido,
                fecha_nacimiento,
                sexo,
                intereses,
                antecedentes,
                avatarUrl,
                email
            },{transaction:t});

            const hash = await bcrypt.hash(password,10);
            await Login.create({usuario_id:usuario.id_usuario,
                email,
                contrasenia :hash
            },{transaction:t});

            await t.commit();
            //iniciar sesion automaticamente tras el registro
            req.session.usuarioId=usuario.id_usuario;
            res.redirect('/');
        }catch(err){
            await t.rollback();
            next(err);
        }
    },
    //Get Logout
    logout(req,res){
        req.session.destroy(()=>res.redirect('/login'));
    }
};