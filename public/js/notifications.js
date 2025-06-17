//const { actualizar } = require("../../controllers/usuarioController");

const socket = io();

socket.emit('join',{userId: window.SESSION_USER_ID});

socket.on('notification:friend_request',data =>{
    actualizarBadge();
    mostrarToast(`${data.from.nombre} ${data.from.apellido} Te ha envaido una solicitud`);
})

socket.on('notification:friend_response',data =>{
    actualizarBadge();
    mostrarToast(`Tu solicitud fue ${data.estado.toLowerCase()}`);
})
socket.on('notification:new_comment', data =>{
    actualizarBadge();
    mostrarToast(`${data.autor.nombre} ${data.autor.apellido}, comento: ${data.excerpt}`)
})

function actualizarBadge(){
    const badge = document.getElementById('notif-count');
    const count = parseInt(badge.textContent || '0',10)+1;
    badge.textContent=count;
    badge.style.display = 'inline';
}
function mostrarToast(message){
    console.log('Toast', message);
}