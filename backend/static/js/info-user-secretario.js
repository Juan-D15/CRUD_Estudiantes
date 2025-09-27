// static/js/info-user-secretario.js
// Carga los datos reales del usuario logueado y permite editar: nombre y usuario.

const $ = (s, c=document)=>c.querySelector(s);

// Campos del formulario (coinciden con el HTML de secretaria)
const fId      = $('#f-id');
const fNombre  = $('#f-nombre');
const fUsuario = $('#f-usuario');
const fCorreo  = $('#f-correo');   // solo lectura
const fCreado  = $('#f-creado');   // solo lectura
const fEstado  = $('#f-estado');   // <span class="badge">... (no select)

// UI / modal
const msg        = $('#msg');
const overlay    = $('#overlay');
const modal      = $('#modal');
const diffBody   = $('#diffBody');
const btnPreview = $('#btnPreview');
const btnCancel  = $('#btnCancel');
const btnConfirm = $('#btnConfirm');
const toast      = $('#toast');

// ===== util CSRF =====
function getCookie(name){
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
const CSRFTOKEN = ()=> getCookie('csrftoken');

// ===== helpers =====
function paintBadgeEstado(estado){
  const v = (estado||'').toLowerCase();
  fEstado.textContent = v === 'bloqueado' ? 'Bloqueado' : 'Activo';
  fEstado.classList.remove('green','red');
  fEstado.classList.add(v === 'bloqueado' ? 'red' : 'green');
}
function emailOk(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function escapeHTML(s){
  return (s ?? '').toString().replace(/[&<>"']/g, m => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]
  ));
}
function showToast(text){
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.classList.add('hidden'), 1800);
}

// ===== snapshot/diff =====
let baseline = getCurrentValues();
function getCurrentValues(){
  return {
    nombre : (fNombre.value||'').trim(),
    usuario: (fUsuario.value||'').trim()
  };
}

// ===== Cargar perfil real =====
// (idéntico enfoque al admin: GET /api/usuarios/0 usa el id de sesión) :contentReference[oaicite:1]{index=1}
async function loadProfile(){
  try{
    let id = window.CURRENT_USER_ID;
    if (!Number.isFinite(id)) id = 0;

    const uid = Number(fId.value || window.CURRENT_USER_ID || 0) || 0;
    const res = await fetch(`/api/usuarios/${uid}`, {
        headers: { 'Accept':'application/json' },
        credentials: 'same-origin',
        cache: 'no-store'
      });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const raw = await res.json();
    const u = (raw && typeof raw.rc === 'number' && raw.user) ? raw.user : raw;

    // Pintar en la UI
    fId.value      = String(u.idUsuario ?? '');
    fNombre.value  = u.nombreCompleto ?? '';
    fUsuario.value = u.usuario ?? '';
    fCorreo.value  = u.correo ?? '';
    fCreado.value  = (u.fechaCreacion || '').toString().replace('T',' ').slice(0,16);
    paintBadgeEstado(u.estado || 'activo');

    baseline = getCurrentValues();
  }catch(e){
    console.error('loadProfile:', e);
    msg.textContent = 'No se pudo cargar la información.';
    setTimeout(()=> (msg.textContent=''), 2500);
  }
}
loadProfile();

// ===== Abrir modal con diff =====
btnPreview?.addEventListener('click', ()=>{
  const current = getCurrentValues();
  const changes = [];
  for(const k of Object.keys(current)){
    if(current[k] !== baseline[k]){
      changes.push({
        campo: (k==='nombre'?'Nombre completo':'Usuario'),
        before: baseline[k], after: current[k]
      });
    }
  }
  if(changes.length===0){ showToast('No hay cambios para aplicar.'); return; }

  diffBody.innerHTML = '';
  for(const c of changes){
    const tr = document.createElement('tr');
    tr.className = 'changed';
    tr.innerHTML = `<td>${c.campo}</td><td>${escapeHTML(c.before)}</td><td>${escapeHTML(c.after)}</td>`;
    diffBody.appendChild(tr);
  }
  // abrir modal
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  requestAnimationFrame(()=> modal.classList.add('show'));
  btnConfirm.focus();
});

// cerrar modal
function closeModal(){
  modal.classList.remove('show');
  setTimeout(()=>{ overlay.classList.add('hidden'); modal.classList.add('hidden'); }, 180);
}
overlay?.addEventListener('click', closeModal);
btnCancel?.addEventListener('click', closeModal);
window.addEventListener('keydown', ev=>{ if(ev.key==='Escape') closeModal(); });

// ===== Confirmar → PUT (solo nombre y usuario) =====
// (mismo endpoint que admin, pero solo enviamos 2 campos) :contentReference[oaicite:2]{index=2}
btnConfirm?.addEventListener('click', async ()=>{
  closeModal();
  const body = {
    nombreCompleto: (fNombre.value||'').trim(),
    usuario:        (fUsuario.value||'').trim()
  };
  try{
    const uid = Number(fId.value || window.CURRENT_USER_ID || 0) || 0;
    const res = await fetch(`/api/usuarios/${uid}/actualizar`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', 'X-CSRFToken': CSRFTOKEN()||'' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
        cache: 'no-store'
      });
    const j = await res.json().catch(()=> ({}));
    if(res.ok && (j.rc===0 || j.ok===true)){
      baseline = getCurrentValues();
      showToast('Actualizado correctamente.');
    }else{
      msg.textContent = j.msg || 'No se pudo actualizar.';
      setTimeout(()=> (msg.textContent=''), 2500);
    }
  }catch(e){
    console.error('update self:', e);
    msg.textContent = 'Error de red/servidor.';
    setTimeout(()=> (msg.textContent=''), 2500);
  }
});
