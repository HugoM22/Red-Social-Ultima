const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');
const eventoController = require('../controllers/eventoController');

// Aplicar middleware de autenticación a todas las rutas de eventos
router.use(authMiddleware);

// Listar eventos
router.get('/', eventoController.listar);

// Crear evento
router.post('/crear', eventoController.crear);

// Inscribirse / desinscribirse
router.post('/:id/inscribirse', eventoController.inscribirse);
router.post('/:id/desinscribirse', eventoController.desinscribirse);

module.exports = router;
