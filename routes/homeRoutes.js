const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const uploadMiddleware = require('../middlewares/upload');
const homeController = require('../controllers/homeController');
const comentarioController = require('../controllers/comentarioController');

//Aplicar autenticacion a todas las rutas
router.use(authMiddleware);

//Mostrar la pagina principal
router.get('/',homeController.showHome);

//Explorar usuriaos 
router.get('/explorar', homeController.showExplorar);

//Enviar solicitud de amistad
router.post('/friend/request',homeController.sendRequest);

//responder solicitud de amistad
router.post('/friend/respond',homeController.respondRequest);

//publicar imagen y compartirla 
router.get('/publicar',homeController.showPublicar);
router.post(
    '/publicar',
    uploadMiddleware.single('archivo'),
    homeController.publishImage
);

// crear comentario en una imagen
router.post('/comment', comentarioController.create);

// ver notificaciones
router.get('/notificaciones', homeController.showNotificaciones);

// ver notificacion de comentario
router.get('/notificaciones/comentario/:id', homeController.verNotificacionComentario);
module.exports = router;