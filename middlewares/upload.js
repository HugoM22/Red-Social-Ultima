const multer = require('multer');
const path = require('path');

//filtrar solo imagenes y limitar tamaño a 5mb
const fileFilter = (req,file,cb) => {
    if(/^image\/(jpeg|jpg|png|gif)$/.test(file.mimetype)){
        cb(null,true);
    }else{
        cb(new Error('Solo se permiten imagenes JPEG, PNG O GIF'), false);
    }
};

//configuracion de almacenamiento en disco
const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        //carpeta donde se guardan los uploads
        cb(null,path.join(__dirname,'../public/uploads'));
    },
    filename: (req,file,cb)=>{
        //generar nombre unico
        const ext = path.extname(file.originalname);
        cb(null,`${Date.now()}${ext}`);
    }
});

module.exports = multer({
    storage,
    fileFilter,
    limits:{fileSize: 5 * 1024 * 1024} // 5 MB
});