const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middlewares/upload');


//login
router.get('/login',authController.formLogin);
router.post('/login',authController.login);

//registrar
router.get('/registrar',authController.formRegistrar);

router.post('/registrar',upload.single('avatar'),
authController.registrar);

//logout
router.get('/logout',authController.logout);

module.exports = router;