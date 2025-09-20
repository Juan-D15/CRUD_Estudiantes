// === Utilidades ===
function getQuery(name){
  const m = new RegExp('[?&]'+name+'=([^&]*)').exec(window.location.search);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
}

// Rellena el correo en modo lectura
(function initEmail(){
  const q = getQuery('email');
  const ls = localStorage.getItem('recoveryEmail');
  const email = q || ls || (document.body.dataset.role === 'admin' ? 'admin@dominio.com' : 'secretaria@dominio.com');
  const el = document.getElementById('emailView');
  if(el){ el.value = email; }
})();

// -------- Fuerza de contraseña --------
function checkReqs(pwd){
  // Requisitos: mayúscula, minúscula, número, símbolo
  const req = {
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    digit: /\d/.test(pwd),
    symbol: /[^0-9A-Za-z]/.test(pwd),
    lengthOk: (pwd || '').length >= 8
  };
  const missing = [];
  if(!req.upper)  missing.push('una mayúscula');
  if(!req.lower)  missing.push('una minúscula');
  if(!req.digit)  missing.push('un número');
  if(!req.symbol) missing.push('un símbolo');
  return { req, missing };
}

function renderStrength(){
  const p1 = document.getElementById('pwd1').value || '';
  const s1 = document.getElementById('s1');
  const e1 = document.getElementById('e1');

  // Mensaje de longitud mínima
  e1.textContent = '';
  if(p1.length && p1.length < 8){
    e1.textContent = 'Mínimo 8 caracteres.';
  }

  // Mensaje de requisitos (fuerza)
  s1.textContent = '';
  s1.classList.remove('bad','mid','good');

  if(!p1) return; // no mostrar nada si está vacío

  const { missing } = checkReqs(p1);
  if(missing.length >= 2){        // faltan 2 o más
    s1.textContent = 'Contraseña Débil, asegúrate de llevar ' + missing.join(', ') + '.';
    s1.classList.add('bad');
  }else if(missing.length === 1){ // falta 1
    s1.textContent = 'Contraseña Decente, asegúrate de llevar ' + missing[0] + '.';
    s1.classList.add('mid');
  }else{                          // 0 faltantes
    s1.textContent = 'Contraseña Fuerte';
    s1.classList.add('good');
  }
}

// Validación simple (mínimo 8 y coincidencia)
function validate(){
  const p1 = document.getElementById('pwd1').value.trim();
  const p2 = document.getElementById('pwd2').value.trim();
  let ok = true;
  const e1 = document.getElementById('e1');
  const e2 = document.getElementById('e2');
  e1.textContent = ''; e2.textContent = '';

  if(p1.length < 8){ e1.textContent = 'Mínimo 8 caracteres.'; ok = false; }
  if(p1 !== p2){ e2.textContent = 'Las contraseñas no coinciden.'; ok = false; }
  return ok;
}

// Eventos de escritura para actualizar mensajes en vivo
const pwd1 = document.getElementById('pwd1');
const pwd2 = document.getElementById('pwd2');

pwd1.addEventListener('input', renderStrength);
pwd2.addEventListener('input', () => {
  const p1 = pwd1.value.trim();
  const p2 = pwd2.value.trim();
  const e2 = document.getElementById('e2');
  e2.textContent = '';
  if(p2 && p1 !== p2){
    e2.textContent = 'Las contraseñas no coinciden.';
  }
});

// Envío (demo): sólo front, redirige al login correspondiente
document.getElementById('formReset').addEventListener('submit', (e)=>{
  e.preventDefault();
  if(!validate()) return;
  alert('Contraseña actualizada (demo).');
  window.location.href = window.LOGIN_BACK_URL || 'login_select.html';
});

// === Modal de confirmación dinámico ===
const btnCancel = document.getElementById('btnCancel');

function closeConfirm(){
  const o = document.getElementById('recover-overlay');
  const m = document.getElementById('recover-modal');
  if(o) o.remove();
  if(m) m.remove();
  document.body.classList.remove('no-scroll');
  document.removeEventListener('keydown', onEsc);
}

function onEsc(ev){ if(ev.key === 'Escape') closeConfirm(); }

function showConfirm(){
  if(document.getElementById('recover-modal')) return; // ya abierto
  document.body.classList.add('no-scroll');

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'recover-overlay';
  overlay.addEventListener('click', closeConfirm);

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'recover-modal';
  modal.innerHTML = `
    <div class="modal-inner">
      <div class="modal-head">
        <span class="warn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3l9 16H3l9-16z" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M12 9v4M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <h3>¿Seguro que quieres cancelar este proceso?</h3>
      </div>
      <div class="modal-actions two">
        <button class="btn-outline btn-yes">Sí, estoy seguro</button>
        <button class="btn-outline btn-keep">Seguir recuperando</button>
      </div>
    </div>
  `;

  document.body.append(overlay, modal);
  document.addEventListener('keydown', onEsc);

  modal.querySelector('.btn-yes').addEventListener('click', ()=>{
    window.location.href = window.LOGIN_BACK_URL || 'login_select.html';
  });
  modal.querySelector('.btn-keep').addEventListener('click', closeConfirm);
}

btnCancel.addEventListener('click', showConfirm);

// --- Toggle mostrar/ocultar contraseña con ojito ---
(function setupEyes(){
  document.querySelectorAll('.input-wrap').forEach(wrap=>{
    const btn = wrap.querySelector('.toggle-eye');
    const input = wrap.querySelector('input[type="password"], input[type="text"]');
    if(!btn || !input) return;

    const eye = btn.querySelector('.eye');
    const off = btn.querySelector('.eye-off');

    btn.addEventListener('click', ()=>{
      const showing = input.type === 'text';
      if(showing){
        input.type = 'password';
        btn.setAttribute('aria-pressed','false');
        eye.classList.remove('hidden');
        off.classList.add('hidden');
      }else{
        input.type = 'text';
        btn.setAttribute('aria-pressed','true');
        eye.classList.add('hidden');
        off.classList.remove('hidden');
      }
      input.focus();
    });
  });
})();
