module.exports = (req,res,next) => {
    // si existe sesion con usuarioId, dejamos pasar
    if(req.session && req.session.usuarioId){
        return next();
    }
    // si no esta autenticado, redirigimos a login
    res.redirect('/login');
}