const express = require('express');
const router = express.Router();
const imagenController = require('../controllers/imagenController');
const authMiddleware = require('../middlewares/auth');
const uploadMiddleware = require('../middlewares/upload');

//Mostrar formulario de publicar
router.get(
    '/publicar',
    authMiddleware,
    imagenController.publicarForm
);

//subir imagen a un album
router.post(
    '/:albumId/imagen',
    authMiddleware,
    uploadMiddleware.single('archivo'),
    imagenController.subir
);

module.exports = router;