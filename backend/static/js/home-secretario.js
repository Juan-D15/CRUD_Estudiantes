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

function getCsrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

async function doLogout(logoutUrl, redirectTo) {
  try {
    const r = await fetch(logoutUrl || '/logout', {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrfToken() }
    });
    if (!r.ok) {
      await fetch(logoutUrl || '/logout', { method: 'GET', credentials: 'include' });
    }
  } catch(e) {}
  finally { window.location.href = redirectTo || (window.SECRE_LOGIN_URL || '../secretario_login.html'); }
}

// ---------- back: confirmar cierre de sesión ----------
document.getElementById('btnBack').addEventListener('click', ()=>{
  openConfirm({
    title: '¿Estás seguro que quieres cerrar sesión y salir?',
    confirmText: 'Cerrar sesión',
    cancelText: 'Cancelar',
    onConfirm: () => doLogout(window.SECRE_LOGOUT_URL, window.SECRE_LOGIN_URL)
  });
});

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
    onConfirm:()=> doLogout(window.SECRE_LOGOUT_URL, window.SECRE_LOGIN_URL)
  });
});

uChange.addEventListener('click', ()=>{
  userMenu.classList.remove('open');
  openConfirm({
    title:'¿Seguro que quieres cambiar de contraseña?',
    confirmText:'Continuar',
    cancelText:'Cancelar',
    onConfirm:()=>{ window.location.href = window.SECRE_RESET_URL || '../admin-reset.html'; }
  });
});
uInfo.addEventListener('click', ()=>{
  userMenu.classList.remove('open');
  window.location.href = window.SECRE_INFO_URL || '../gestion-usuario/info.html';
});

// ---------- rutas rápidas (tarjetas + dock) ----------
// Los href ya están configurados en el HTML con {% url %}, 
// no necesitamos event listeners adicionales, la navegación es nativa

// ---------- efecto “escritura” + aparición de tarjetas ----------
const titleHolder = document.getElementById('titleHolder');
const typeTitle   = document.getElementById('typeTitle');
const cards       = document.getElementById('cards');

function typewriter(node, text, speed=28){
  node.classList.add('typing');
  node.textContent = '';
  let i = 0;
  const tick = () => {
    node.textContent += text[i++];
    if(i < text.length){ setTimeout(tick, speed); }
    else{
      node.classList.remove('typing');
      titleHolder.classList.add('docked');           // “sube” el título
      setTimeout(()=> cards.classList.add('show'), 120); // aparece grid
    }
  };
  tick();
}
typewriter(typeTitle, typeTitle.dataset.text || 'Portal Secretario(a)');

// ---------- efecto “dibujo” en los íconos ----------
const cardEls = [...document.querySelectorAll('.card')];

function prepStroke(svg){
  const paths = svg.querySelectorAll('.stroke');
  paths.forEach(p=>{
    const len = p.getTotalLength ? p.getTotalLength() : 300;
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
  });
}
document.querySelectorAll('.icon-draw').forEach(prepStroke);

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

// pequeño efecto al pasar por el dock (ya hay :hover en CSS)
document.querySelectorAll('.dock-item').forEach(a=>{
  a.addEventListener('mouseenter', ()=> a.style.opacity = '1');
  a.addEventListener('mouseleave', ()=> a.style.opacity = '');
});
