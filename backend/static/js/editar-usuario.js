// ===== Helpers =====
const $ = (s) => document.querySelector(s);

const editCard   = $('#editCard');
const msgBuscar  = $('#msgBuscar');
const idBuscar   = $('#idBuscar');

const inpUsuario = $('#usuario');
const inpNombre  = $('#nombre');
const inpCorreo  = $('#correo');
const selRol     = $('#rol');
const selEstado  = $('#estado');
const estadoWrap = $('#estadoWrap');
const estadoChip = $('#estadoChip');

const overlay    = $('#overlay');
const modalRol   = $('#modalRol');
const mYes       = $('#mYes');
const mNo        = $('#mNo');

const toast      = $('#toast');
const btnBuscar  = $('#btnBuscar');
const btnActualizar = $('#btnActualizar');

// ===== CSRF =====
function getCookie(name) {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return m ? m.pop() : '';
}
function csrfHeader() {
  return { 'X-CSRFToken': getCookie('csrftoken') };
}

// ===== API calls =====
async function apiGetUsuario(id) {
  // ¡SIEMPRE con el id que TIPEAS!
  const url = `/api/usuarios/${id}`;
  const r = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',         // evitar cache
    credentials: 'same-origin' // mantener sesión
  });
  if (!r.ok) {
    return { rc: 6, msg: `HTTP ${r.status}` };
  }
  // Puede venir como {rc:0,user:{...}} o como objeto "pelado"
  let raw;
  try { raw = await r.json(); } catch { return { rc: 5 }; }
  return (raw && typeof raw.rc === 'number') ? raw : { rc: 0, user: raw };
}

async function apiActualizarUsuario(id, payload) {
  const r = await fetch(`/api/usuarios/${id}/actualizar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...csrfHeader() },
    body: JSON.stringify(payload),
    cache: 'no-store',
    credentials: 'same-origin'
  });
  if (!r.ok) return { rc: 5 };
  let j; try { j = await r.json(); } catch { j = { rc: 5 }; }
  return j; // { rc, msg }
}

// ===== Pintado/estado =====
function show(el){ el.hidden = false; }
function hide(el){ el.hidden = true; }

function showToast(text, ok = true){
  toast.textContent = text;
  toast.classList.toggle('ok', ok);
  toast.classList.toggle('err', !ok);
  show(toast);
  setTimeout(()=> hide(toast), 2200);
}

function openModal(){ show(overlay); show(modalRol); }
function closeModal(){ hide(overlay); hide(modalRol); }

function paintEstado(){
  const v = selEstado.value;
  estadoChip.textContent = v;
  estadoWrap.classList.toggle('ok',  v === 'activo');
  estadoWrap.classList.toggle('bad', v === 'bloqueado');
}

// ===== Llenar formulario =====
function fillForm(u){
  const d = (u && (u.user || u)) || {};
  inpUsuario.value = d.usuario || '';
  inpNombre.value  = d.nombreCompleto || d.nombre || '';
  inpCorreo.value  = d.correo || '';
  selRol.value     = (d.rol || 'secretaria');
  selEstado.value  = (d.estado || 'activo');
  paintEstado();
}

// ===== Validación mínima =====
function validEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v||'').trim());
}
function validate(){
  return !!(inpUsuario.value.trim() && inpNombre.value.trim() && validEmail(inpCorreo.value));
}

// ===== Buscar por botón =====
btnBuscar.addEventListener('click', async ()=>{
  const raw = (idBuscar.value ?? '').toString().trim();
  const id = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
  if(!id){
    msgBuscar.textContent = 'Ingresa un ID numérico válido.';
    showToast('Ingresa un ID numérico válido.', false);
    return;
  }

  msgBuscar.textContent = 'Buscando...';
  const res = await apiGetUsuario(id);
  if(res.rc === 0){
    msgBuscar.textContent = 'Usuario encontrado.';
    fillForm(res.user || res);
    editCard.classList.remove('hidden');
    showToast('Usuario encontrado.', true);
    editCard.dataset.id = String(id); // guardar ID a actualizar
  }else{
    msgBuscar.textContent = 'No se encontró el ID indicado.';
    editCard.classList.add('hidden');
    showToast('No se encontró el ID indicado.', false);
    editCard.dataset.id = '';
  }
});

selEstado.addEventListener('change', paintEstado);

// Confirmar al cambiar a admin
selRol.addEventListener('change', ()=>{
  if(selRol.value === 'admin'){ openModal(); }
});
mYes.addEventListener('click', ()=> closeModal());
mNo.addEventListener('click', ()=>{
  selRol.value = 'secretaria';
  closeModal();
});

// ===== Actualizar =====
btnActualizar.addEventListener('click', async ()=>{
  const id = Number(editCard.dataset.id || '0');
  if(!id){
    showToast('Primero busca un usuario.', false);
    return;
  }
  if(!validate()){
    showToast('Verifica usuario, nombre y correo válido.', false);
    return;
  }

  const payload = {
    usuario: inpUsuario.value.trim(),
    nombreCompleto: inpNombre.value.trim(),
    correo: inpCorreo.value.trim(),
    rol: selRol.value,
    estado: selEstado.value,
  };

  const res = await apiActualizarUsuario(id, payload);
  if(res.rc === 0){
    showToast('Actualizado correctamente.', true);
  }else if(res.rc === 2){
    showToast('Usuario duplicado.', false);
  }else if(res.rc === 3){
    showToast('Correo duplicado.', false);
  }else if(res.rc === 6){
    showToast('No existe el usuario.', false);
  }else{
    showToast('No se pudo actualizar.', false);
  }
});

// ===== Auto-buscar si la página vino con un id en la URL (contexto del template) =====
window.addEventListener('DOMContentLoaded', () => {
  const init = (window.INIT_ID === 0 ? 0 : (window.INIT_ID || null));
  if (typeof init === 'number' && init > 0) {
    idBuscar.value = String(init);
    btnBuscar.click();
  }
});
