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

//ver detalle de una imagen
router.get(
  '/detalle/:id',
  authMiddleware,
  imagenController.detalle
);

//Formulario para editar imagen
router.get(
  '/:id/editar',
  authMiddleware,
  imagenController.editarForm
);

//Guardar cambios de imagen
router.post(
  '/:id/editar',
  authMiddleware,
  imagenController.actualizar
);

//Eliminar imagen
router.post(
  '/:id/eliminar',
  authMiddleware,
  imagenController.eliminar
);

//subir imagen a un album
router.post(
  '/:albumId/imagen',
  authMiddleware,
  uploadMiddleware.single('archivo'),
  imagenController.subir
);

module.exports = router;