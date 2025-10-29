// index-productos-secretario.js
// Archivo JavaScript para la gestión de productos del secretario

// ---------- util: modal de confirmación ----------
function openConfirm({title, confirmText='Confirmar', cancelText='Cancelar', onConfirm}){
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.addEventListener('click', close);

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-inner">
      <h3>${title}</h3>
      <div class="modal-actions">
        <button class="btn-ghost danger" id="mConfirm">${confirmText}</button>
        <button class="btn-ghost" id="mCancel">${cancelText}</button>
      </div>
    </div>
  `;

  function close(){ overlay.remove(); modal.remove(); document.removeEventListener('keydown', onEsc); }
  function onEsc(e){ if(e.key === 'Escape') close(); }

  document.body.append(overlay, modal);
  document.addEventListener('keydown', onEsc);

  modal.querySelector('#mCancel').addEventListener('click', close);
  modal.querySelector('#mConfirm').addEventListener('click', ()=>{ close(); onConfirm && onConfirm(); });
}

// ---------- menú de usuario ----------
const btnUser  = document.getElementById('btnUser');
const userMenu = document.getElementById('userMenu');
const uChange  = document.getElementById('uChange');
const uInfo    = document.getElementById('uInfo');
const uLogout  = document.getElementById('uLogout');

btnUser.addEventListener('click', (e)=>{ e.stopPropagation(); userMenu.classList.toggle('open'); });
document.addEventListener('click', (e)=>{ if(!userMenu.contains(e.target) && e.target!==btnUser){ userMenu.classList.remove('open'); } });

uLogout.addEventListener('click', ()=>{
  userMenu.classList.remove('open');
  openConfirm({
    title:'¿Estás seguro que quieres cerrar sesión y salir?',
    confirmText:'Cerrar sesión',
    cancelText:'Cancelar',
    onConfirm:()=>{ window.location.href = window.SEC_LOGIN_URL || '../secretario-login.html'; }
  });
});
uChange.addEventListener('click', ()=>{
  userMenu.classList.remove('open');
  openConfirm({
    title:'¿Seguro que quieres cambiar de contraseña?',
    confirmText:'Continuar',
    cancelText:'Cancelar',
    onConfirm:()=>{ window.location.href = window.SEC_RESET_URL || '../secretario-reset.html'; }
  });
});
uInfo.addEventListener('click', ()=>{
  userMenu.classList.remove('open');
  window.location.href = window.SEC_INFO_URL || 'info-user-secretario.html';
});

// ---------- Obtener CSRF token ----------
function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') return value;
  }
  return '';
}
const csrftoken = getCsrfToken();

// ---------- Cargar información del usuario ----------
async function cargarInfoUsuario() {
  try {
    const url = window.SEC_INFO_URL || '/secretaria/cuenta/info';
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    if (!response.ok) {
      console.warn('No se pudo cargar la información del usuario');
      return;
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extraer datos del documento HTML o usar datos de sesión si están disponibles
    const usuario = doc.querySelector('[data-usuario]')?.dataset.usuario || 
                    sessionStorage.getItem('usuario') || 'Secretaria';
    const correo = doc.querySelector('[data-correo]')?.dataset.correo || 
                   sessionStorage.getItem('correo') || '';
    const fecha = doc.querySelector('[data-fecha]')?.dataset.fecha || 
                  sessionStorage.getItem('fecha') || '';
    
    document.getElementById('uUsuario').textContent = usuario;
    document.getElementById('uCorreo').textContent = correo || 'No disponible';
    document.getElementById('uFecha').textContent = fecha || 'No disponible';
    
    console.log('✅ Información de usuario cargada');
  } catch (error) {
    console.error('❌ Error al cargar información del usuario:', error);
    document.getElementById('uUsuario').textContent = 'Secretaria';
    document.getElementById('uCorreo').textContent = 'No disponible';
    document.getElementById('uFecha').textContent = 'No disponible';
  }
}

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', function() {
  console.log('Portal de gestión de productos (Secretario) cargado');
  cargarInfoUsuario();
});
