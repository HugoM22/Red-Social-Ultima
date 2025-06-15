const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const authMiddleware = require('../middlewares/auth');

// listar album de un usuario
router.get('/:id/albums', albumController.listar);

//Mostrar formulario para crear un album 
router.get('/crear', authMiddleware, albumController.formCrear)

//Creacion de album 

router.post('/crear', authMiddleware, albumController.crear);

module.exports = router;