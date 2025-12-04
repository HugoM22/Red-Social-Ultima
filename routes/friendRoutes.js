const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const authMiddleware = require('../middlewares/auth');

//Alternar amistad
router.post('/:id/alternar', authMiddleware, friendController.toggleAmigo);

//Dejar de ser amigos
//router.post("/remove",authMiddleware, friendController.remove);

module.exports = router;
