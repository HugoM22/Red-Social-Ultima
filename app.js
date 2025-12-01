
require('dotenv').config();

const express = require('express');
const path    = require('path');
const http    = require('http');
const session = require('express-session');
const { Server } = require('socket.io');

const sequelize = require('./config/database');
require('./models'); // carga tus modelos

const app    = express();

const authRoutes    = require('./routes/authRoutes');
const homeRoutes    = require('./routes/homeRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const albumRoutes   = require('./routes/albumRoutes');
const imagenRoutes  = require('./routes/imagenRoutes');
const friendRoutes  = require('./routes/friendRoutes');
const { Friend, Notificacion }    = require('./models');
const { log } = require('console');


const server = http.createServer(app);
const io     = new Server(server);

// View
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Sesiones sockete io
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24,
  }
});
app.use(sessionMiddleware);

app.use((req,res,next)=>{
  res.locals.session =req.session || {};
  next();
})
//permitir que socket io use la misma session
io.use((socket,next)=>{
  sessionMiddleware(socket.request,{},next);
});

// Mapa de sockets online
const onlineUsers = {};
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// Railway
app.set('trust proxy', 1);


// Parsers y estáticos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// Contador de solicitudes
app.use(async (req, res, next) => {
  if (req.session.usuarioId) {
    const userId = req.session.usuarioId;

    const pendientes = await Notificacion.count({
      where: {
        usuario_id: userId,
        leido: false
      }
    });

    res.locals.pendingNotificationsCount = pendientes;
  } else {
    res.locals.pendingNotificationsCount = 0;
  }
  next();
});

// Rutas
app.use('/', authRoutes);
app.use('/', homeRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/album', albumRoutes);
app.use('/imagen', imagenRoutes);
app.use('/friend', friendRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página no encontrada' });
});

// Socket io
io.on('connection', socket => {
  const usuarioId = socket.request.session.usuarioId;

  if (usuarioId) {
    onlineUsers[usuarioId] = socket.id;
    console.log(`Usuario ${usuarioId} Conectado en socket ${socket.id}`);
  }

  socket.on('join', data => {
    if (data && data.userId) {
      onlineUsers[data.userId] = socket.id;
    }
  });

  socket.on('disconnect', () => {
    if (usuarioId && onlineUsers[usuarioId] === socket.id) {
      delete onlineUsers[usuarioId];
      console.log(`Usuario ${usuarioId} Desconectado`);
    }
  });
});

// Levantar DB y servidor
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos.');
    await sequelize.sync();
    console.log('✅ Tablas sincronizadas correctamente');

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('⛔⛔ No se pudo conectar a la base de datos:', err);
    process.exit(1);
  }
})();


