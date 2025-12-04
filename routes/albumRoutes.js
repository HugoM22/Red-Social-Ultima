const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const authMiddleware = require('../middlewares/auth');

//formulario para editar un álbum
router.get('/:id/editar', authMiddleware, albumController.editarForm);

//guardar cambios de un álbum
router.post('/:id/editar', authMiddleware, albumController.actualizar);

// listar album de un usuario
router.get('/:id/albums', albumController.listar);

//Mostrar formulario para crear un album 
router.get('/crear', authMiddleware, albumController.formCrear)

//Creacion de album 
router.post('/crear', authMiddleware, albumController.crear);

module.exports = router;