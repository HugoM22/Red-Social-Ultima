const bcrypt = require('bcrypt');
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');
const { Usuario, Login, sequelize } = require('../models');

module.exports = {
  // GET Login
  formLogin(req, res) {
    res.render('login', { title: 'Iniciar Sesion' });
  },

  // POST Login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const usuario = await Usuario.findOne({
        where: { email },
        include: Login
      });

      if (!usuario) {
        return res.render('login', {
          title: 'Iniciar Sesion',
          error: 'Credenciales Invalidas',
          old: { email }
        });
      }

      const ok = await bcrypt.compare(password, usuario.Login.contrasenia);
      if (!ok) {
        return res.render('login', {
          title: 'Iniciar Sesion',
          error: 'Credenciales Invalidas',
          old: { email }
        });
      }

      req.session.usuarioId       = usuario.id_usuario;
      req.session.usuarioNombre   = usuario.nombre;
      req.session.usuarioApellido = usuario.apellido;
      req.session.avatarUrl       = usuario.avatarUrl || '/default-avatar.png';

      res.redirect('/');
    } catch (err) {
      next(err);
    }
  },

  // GET Registrar
  formRegistrar(req, res) {
    res.render('registrar', { title: 'Crear Cuenta' });
  },

  // POST Registrar
  async registrar(req, res, next) {
    console.log('BODY:', req.body);
    console.log('FILE (single):', req.file);
    console.log('FILES (array):', req.files);

    let t;
    try {
      const {
        nombre,
        apellido,
        fecha_nacimiento,
        sexo,
        intereses,
        antecedentes,
        email,
        password
      } = req.body;

      const error = [];

      // 1) Validar fecha_nacimiento
      if (!fecha_nacimiento) {
        error.push('La fecha de nacimiento es obligatoria.');
      } else {
        const partes = fecha_nacimiento.split('-'); // 'YYYY-MM-DD'
        if (partes.length !== 3) {
          error.push('La fecha de nacimiento no es válida.');
        } else {
          const [y, m, d] = partes.map(Number);
          const birth = new Date(y, m - 1, d); // local

          if (isNaN(birth.getTime())) {
            error.push('La fecha de nacimiento no es válida.');
          } else {
            const hoy = new Date();
            let   edad = hoy.getFullYear() - birth.getFullYear();
            const mes  = hoy.getMonth() - birth.getMonth();

            if (mes < 0 || (mes === 0 && hoy.getDate() < birth.getDate())) {
              edad--;
            }

            if (birth > hoy) {
              error.push('La fecha de nacimiento no puede ser futura.');
            } else if (edad < 18) {
              error.push('Debés tener al menos 18 años para registrarte.');
            }
          }
        }
      }

      // 2) Validar longitud de contraseña
      if (!password || password.length < 6) {
        error.push('La contraseña debe tener al menos 6 caracteres.');
      }

      // 3) Validar email único
      if (!email) {
        error.push('El correo electrónico es obligatorio.');
      } else {
        const existente = await Usuario.findOne({ where: { email } });
        if (existente) {
          error.push('Ya existe un usuario registrado con ese correo electrónico.');
        }
      }

      // Si hay errores, renderizar el formulario
      if (error.length) {
        return res.status(400).render('registrar', {
          title: 'Crear Cuenta',
          error,
          old: {
            nombre,
            apellido,
            fecha_nacimiento,
            sexo,
            intereses,
            antecedentes,
            email
          }
        });
      }

      // 4) Crear usuario y login dentro de una transacción
      t = await sequelize.transaction();

      let avatarUrl = null;
      const file = req.file;

      if (file && file.path) {
        const destDir = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        const nombreArchivo = `avatar-${Date.now()}.jpg`;
        const outputPath    = path.join(destDir, nombreArchivo);

        await sharp(file.path)
          .resize({ width: 300 })
          .jpeg({ quality: 80 })
          .toFile(outputPath);

        avatarUrl = `/uploads/${nombreArchivo}`;
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
      }, { transaction: t });

      const hash = await bcrypt.hash(password, 10);

      await Login.create({
        usuario_id: usuario.id_usuario,
        email,
        contrasenia: hash
      }, { transaction: t });

      await t.commit();


      req.session.usuarioId       = usuario.id_usuario;
      req.session.usuarioNombre   = usuario.nombre;
      req.session.usuarioApellido = usuario.apellido;
      req.session.avatarUrl       = usuario.avatarUrl || '/default-avatar.png';

      res.redirect('/');
    } catch (err) {
      if (t) await t.rollback();

      if (
        err.name === 'SequelizeUniqueConstraintError' ||
        (err.original && err.original.code === 'ER_DUP_ENTRY')
      ) {
        return res.status(400).render('registrar', {
          title: 'Crear Cuenta',
          error: ['Ya existe un usuario registrado con ese correo electrónico.'],
          old: req.body
        });
      }

      next(err);
    }
  },

  // GET Logout
  logout(req, res) {
    req.session.destroy(() => res.redirect('/login'));
  }
};
