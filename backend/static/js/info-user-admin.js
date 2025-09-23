// Helpers
const $ = (s, c = document) => c.querySelector(s);

// Campos
const fId      = $('#f-id');
const fNombre  = $('#f-nombre');
const fUsuario = $('#f-usuario');
const fCorreo  = $('#f-correo');
const fPass    = $('#f-pass');
const fCreado  = $('#f-creado');
const fEstado  = $('#f-estado');

const btnPreview = $('#btnPreview');
const msg        = $('#msg');

// Modal
const overlay   = $('#overlay');
const modal     = $('#modal');
const diffBody  = $('#diffBody');
const btnCancel = $('#btnCancel');
const btnConfirm= $('#btnConfirm');

// Toast
const toast = $('#toast');

// ========= UTIL: CSRF =========
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
const CSRFTOKEN = () => getCookie('csrftoken');

// ===== Estado: color del select =====
function paintState(){
  fEstado.classList.remove('state-active','state-blocked');
  if(fEstado.value === 'activo') fEstado.classList.add('state-active');
  else fEstado.classList.add('state-blocked');
}
fEstado.addEventListener('change', paintState);

// ===== Snapshot inicial =====
let baseline = getCurrentValues();
function getCurrentValues(){
  return {
    id: fId.value.trim(),
    nombre: fNombre.value.trim(),
    usuario: fUsuario.value.trim(),
    correo: fCorreo.value.trim(),
    estado: fEstado.value
  };
}

// ===== Validación correo simple =====
function emailOk(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

// ===== Cargar datos reales del usuario logueado =====
async function loadProfile() {
  try {
    // 0 = “usa el ID de la sesión” (soportado por el backend)
    let id = window.CURRENT_USER_ID;
    if (!Number.isFinite(id)) id = 0;

    const res = await fetch(`/api/usuarios/${id}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const raw = await res.json();
    const u = (raw && typeof raw.rc === 'number' && raw.user) ? raw.user : raw;

    fId.value      = String(u.idUsuario ?? id);
    fNombre.value  = u.nombreCompleto ?? '';
    fUsuario.value = u.usuario ?? '';
    fCorreo.value  = u.correo ?? '';
    fCreado.value  = (u.fechaCreacion || '').toString().replace('T',' ').slice(0,16);
    fEstado.value  = (u.estado || 'activo').toLowerCase();
    paintState();

    baseline = getCurrentValues();
  } catch (e) {
    console.error('loadProfile:', e);
    msg.textContent = 'No se pudo cargar la información.';
    setTimeout(() => (msg.textContent = ''), 2500);
  }
}
loadProfile();

// ===== Diff y modal =====
btnPreview.addEventListener('click', () => {
  if(!emailOk(fCorreo.value.trim())){
    msg.textContent = 'Correo inválido.';
    setTimeout(() => msg.textContent = '', 1500);
    return;
  }

  const current = getCurrentValues();
  const rows = [];

  for(const key of Object.keys(current)){
    if(current[key] !== baseline[key]){
      rows.push({ campo: keyMap(key), before: baseline[key], after: current[key] });
    }
  }

  if(rows.length === 0){
    showToast('No hay cambios para aplicar.');
    return;
  }

  diffBody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'changed';
    tr.innerHTML = `<td>${r.campo}</td><td>${escapeHTML(r.before)}</td><td>${escapeHTML(r.after)}</td>`;
    diffBody.appendChild(tr);
  });

  openModal();
});

function keyMap(k){
  switch(k){
    case 'id': return 'ID';
    case 'nombre': return 'Nombre completo';
    case 'usuario': return 'Usuario';
    case 'correo': return 'Correo';
    case 'estado': return 'Estado';
    default: return k;
  }
}

function escapeHTML(s){
  return (s ?? '').toString().replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}

// Modal open/close
function openModal(){
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('show'));
  btnConfirm.focus();
}
function closeModal(){
  modal.classList.remove('show');
  setTimeout(() => {
    overlay.classList.add('hidden');
    modal.classList.add('hidden');
  }, 180);
}
overlay.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
window.addEventListener('keydown', (ev)=> { if(ev.key === 'Escape') closeModal(); });

// ===== Confirmar: llama API (actualizar mi perfil) =====
btnConfirm.addEventListener('click', async () => {
  closeModal();

  const id = Number.isFinite(window.CURRENT_USER_ID) ? window.CURRENT_USER_ID : 0;
  const body = {
    nombreCompleto: fNombre.value.trim(),
    usuario:        fUsuario.value.trim(),
    correo:         fCorreo.value.trim(),
    estado:         fEstado.value
  };

  try {
    const res = await fetch(`/api/usuarios/${id}/actualizar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': CSRFTOKEN()
      },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const j = await res.json().catch(() => ({}));

    if(res.ok && (j.rc === 0 || j.ok === true)){
      baseline = getCurrentValues();
      showToast('Actualizado correctamente.');
    } else {
      const msgMap = {
        1: 'Dato requerido.',
        2: 'Usuario duplicado.',
        3: 'Correo duplicado.',
        4: 'Contraseña débil.',
        5: 'Error del servidor.',
        6: 'No existe o no permitido.'
      };
      msg.textContent = j.msg || msgMap[j.rc] || 'No se pudo actualizar.';
      setTimeout(() => msg.textContent = '', 2500);
    }
  } catch (e) {
    console.error('update self:', e);
    msg.textContent = 'Error de red/servidor.';
    setTimeout(() => msg.textContent = '', 2500);
  }
});

// Toast
let toastTimer;
function showToast(text){
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 1800);
}
