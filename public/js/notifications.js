
const socket = io();

if (window.SESSION_USER_ID) {
  socket.emit('join', { userId: window.SESSION_USER_ID });
}

socket.on('notification:friend_request', data => {
  actualizarBadge();
  mostrarToast(`${data.from.nombre} ${data.from.apellido} te ha enviado una solicitud de amistad.`, true);
});

socket.on('notification:friend_response', data => {
  mostrarToast(`Tu solicitud fue ${data.estado.toLowerCase()} por ${data.from.nombre} ${data.from.apellido}.`, false);
});

socket.on('notification:new_comment', data => {
  actualizarBadge();
  mostrarToast(`${data.autor.nombre} ${data.autor.apellido} comentó: ${data.excerpt}`, true);
});

function actualizarBadge() {
  let badge = document.getElementById('notif-count');
  if (!badge) return;
  let count = parseInt(badge.textContent || '0', 10) + 1;
  badge.textContent = count;
  badge.style.display = 'inline-block';
}

function mostrarToast(message, irANoti) {
  const container = document.getElementById('toast-container');
  if (!container) {
    alert(message);
    if (irANoti) window.location.href = '/notificaciones';
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-bg-dark border-0 show';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  if (irANoti) {
    toast.style.cursor = 'pointer';
    toast.addEventListener('click', () => {
      window.location.href = '/notificaciones';
    });
  }

  container.appendChild(toast);

  // que desaparezca solo
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 5000);
}
