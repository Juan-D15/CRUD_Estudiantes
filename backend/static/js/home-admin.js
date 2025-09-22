// Util: abrir modal genérico
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

// Volver / cerrar sesión
document.getElementById('btnBack').addEventListener('click', ()=>{
  openConfirm({
    title: '¿Estás seguro que quieres cerrar sesión y salir?',
    confirmText: 'Cerrar sesión',
    cancelText: 'Cancelar',
    onConfirm: () => { window.location.href = window.ADMIN_LOGIN_URL || '../admin-login.html'; }
  });
});

// Menú de usuario
const btnUser   = document.getElementById('btnUser');
const userMenu  = document.getElementById('userMenu');
const uChange   = document.getElementById('uChange');
const uClose    = document.getElementById('uClose');
const uLogout   = document.getElementById('uLogout');

btnUser.addEventListener('click', (e)=>{
  e.stopPropagation();
  userMenu.classList.toggle('open');
});
uClose.addEventListener('click', ()=> userMenu.classList.remove('open'));
document.addEventListener('click', (e)=>{
  if(!userMenu.contains(e.target) && e.target !== btnUser){ userMenu.classList.remove('open'); }
});
uLogout.addEventListener('click', ()=>{
  userMenu.classList.remove('open');
  openConfirm({
    title:'¿Estás seguro que quieres cerrar sesión y salir?',
    confirmText:'Cerrar sesión',
    cancelText:'Cancelar',
    onConfirm:()=>{ window.location.href = window.ADMIN_LOGIN_URL || '../admin-login.html'; }
  });
});
uChange.addEventListener('click', ()=>{
  userMenu.classList.remove('open');
  openConfirm({
    title:'¿Seguro que quieres cambiar de contraseña?',
    confirmText:'Continuar',
    cancelText:'Cancelar',
    onConfirm:()=>{ window.location.href = window.ADMIN_RESET_URL || '../admin-reset.html'; }
  });
});

// Efecto “dibujo” de íconos en las tarjetas
const cards = document.getElementById('cards');
const cardEls = [...document.querySelectorAll('.card')];

// Prepara trazos de todos los SVG con clase .icon-draw (dasharray/offset = length)
function prepStroke(svg){
  const paths = svg.querySelectorAll('.stroke');
  paths.forEach(p=>{
    const len = p.getTotalLength ? p.getTotalLength() : 300;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });
}
document.querySelectorAll('.icon-draw').forEach(prepStroke);

// Hover para resaltar una tarjeta y dibujar su ícono
cardEls.forEach(card=>{
  card.addEventListener('mouseenter', ()=>{
    cards.classList.add('hovering');
    card.classList.add('focus','draw');
  });
  card.addEventListener('mouseleave', ()=>{
    cards.classList.remove('hovering');
    card.classList.remove('focus','draw');
  });
});

// Dock: pequeño efecto (opcional ya hay :hover en CSS)
document.querySelectorAll('.dock-item').forEach(a=>{
  a.addEventListener('mouseenter', ()=> a.style.opacity = '1');
  a.addEventListener('mouseleave', ()=> a.style.opacity = '');
});
