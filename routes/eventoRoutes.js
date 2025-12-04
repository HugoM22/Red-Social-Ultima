// routes/eventoRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const eventoController = require('../controllers/eventoController');

router.use(authMiddleware);

router.get('/', eventoController.listar);

router.get('/crear', eventoController.formCrear);
router.post('/crear', eventoController.crear);

router.post('/:id/eliminar', eventoController.eliminar);

router.post('/:id/inscribirse', eventoController.inscribirse);
router.post('/:id/desinscribirse', eventoController.desinscribirse);

module.exports = router;

