const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/auth');
const uploadMiddleware = require('../middlewares/upload');

router.use(authMiddleware);

//Listar todos los usuarios (excepto el logueado)
router.get('/explorar', usuarioController.listarUsuarios);

//enviar solicitud de amistad
router.post('/friend/request', usuarioController.enviarSolicitud);



// -----Perfil-----
//ver perfil de cualquier usuario
router.get('/perfil/:id', authMiddleware, usuarioController.verPerfil);

//formulario de edicion de tu perfil
router.get('/perfil/:id/editar', authMiddleware,usuarioController.editarForm);
//procesra actulizcion de nombre/email
router.post('/perfil/:id',authMiddleware,usuarioController.actualizar)
//procesar subida de avatar 
router.post(
    '/perfil/:id/avatar',
    authMiddleware,
    uploadMiddleware.single('avatar'),
    usuarioController.cambiarAvatar
);

//actualizacion de tu perfil
// router.post('/:id/editar',authMiddleware,usuarioController.actualizar);

module.exports = router;