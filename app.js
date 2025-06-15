require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const sequelize = require('./config/database');
require('./models');

const app = express();
const PORT =  process.env.PORT || 3000;

//Vercel
app.set('trust proxy',1);

// Configuracion de Vistas
app.set('views',path.join(__dirname,'views'));
app.set('view engine','pug');

// Middlewares globlales
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

//Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000*60*60*24
    }
}))

app.use((req,res,next)=>{
    res.locals.session =req.session;
    next();
})

// Contador de solicitudes
const { Friend } = require('./models');
app.use(async (req, res, next) => {
    if (req.session.usuarioId) {
        // Cuenta de solicitudes pendientes
        const count = await Friend.count({
        where: { receptor_id: req.session.usuarioId, estado: 'Pendiente' }
        });
        res.locals.pendingFriendCount = count;
    } else {
        res.locals.pendingFriendCount = 0;
    }
    next();
});

//importar rutas
const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const albumRoutes = require('./routes/albumRoutes');
const imagenRoutes = require('./routes/imagenRoutes');
const homeRoutes = require('./routes/homeRoutes');
const friendRoutes = require('./routes/friendRoutes');

// Usar rutas
app.use('/',authRoutes);
app.use('/', homeRoutes);

app.use('/usuarios', usuarioRoutes);
//app.use('/usuarios',albumRoutes);
//app.use('/album', imagenRoutes);
app.use('/album', albumRoutes);
app.use('/imagen', imagenRoutes)
app.use('/friend', friendRoutes);



// -----Manejo de 404-----
app.use((req, res) => {
    res.status(404).render('404', { title: 'Página no encontrada' });
});

// ------Conexion y sincronizacion de la base de datos ------
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a la base de datos.✅');
        // Sincroniza tablas segun los modelos
        await sequelize.sync({})
        console.log('✅ Tablas sincronizadas correctamente');
    } catch (error) {
        console.error('⛔⛔ No se pudo conectar a la base de datos:', error);
        process.exit(1);
    }
})();
// --------Levantar Servidor-------- 
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 

