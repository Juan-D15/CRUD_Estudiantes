// ===== Helpers =====
const $ = (s) => document.querySelector(s);

const tbody   = $('#tbodyUsuarios');
const msg     = $('#msg');
const overlay = $('#overlay');
const modal   = $('#modal');
const toast   = $('#toast');

const mId     = $('#m-id');
const mUsr    = $('#m-usuario');
const mEmail  = $('#m-correo');
const mRol    = $('#m-rol');
const mFecha  = $('#m-fecha');

const btnCancelar = $('#btnCancelar');
const btnEliminar = $('#btnEliminar');
const btnBloquear = $('#btnBloquear'); // <— NUEVO botón para fallback

let toDeleteId = null;
let usuarios = [];  // listado

function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function showToast(text){
  toast.textContent = text;
  show(toast);
  setTimeout(()=> hide(toast), 2200);
}

function getCookie(name) {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return m ? m.pop() : '';
}
function csrfHeader(){
  return { 'X-CSRFToken': getCookie('csrftoken') };
}

// ===== Normalizadores =====
function normalizeRow(r) {
  return {
    id: r.idUsuario ?? r.id ?? r.id_usuario,
    usuario: r.usuario ?? '',
    correo: r.correo ?? '',
    rol: r.rol ?? '',
    estado: r.estado ?? 'activo',
    fecha: r.fechaCreacion ?? r.fecha_registro ?? ''
  };
}
function normalizeUserDetail(j){
  // acepta {rc:0,user:{...}} o el objeto pelado
  const d = (j && (j.user || j)) || {};
  return {
    id: d.idUsuario ?? d.id ?? 0,
    usuario: d.usuario ?? '',
    nombreCompleto: d.nombreCompleto ?? d.nombre ?? '',
    correo: d.correo ?? '',
    rol: d.rol ?? 'secretaria',
    estado: d.estado ?? 'activo',
    fecha: d.fechaCreacion ?? ''
  };
}

// ===== API =====
async function apiListarUsuarios(){
  const r = await fetch('/api/usuarios', {
    headers: { 'Accept': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if(!r.ok) throw new Error('HTTP '+r.status);
  const j = await r.json();
  const arr = (j && j.data) ? j.data : [];
  return arr.map(normalizeRow);
}

async function apiEliminarUsuario(id){
  const r = await fetch(`/api/usuarios/${id}/eliminar`, {
    method: 'DELETE',
    headers: { ...csrfHeader(), 'Accept': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store'
  });
  const j = await r.json().catch(()=> ({}));
  // ok:true cuando rc==0; si rc==10, mostramos el botón Bloquear
  if(!r.ok || (j && j.ok === false)) {
    const rc  = (j && typeof j.rc === 'number') ? j.rc : -1;
    const msg = (j && j.msg) || `No se pudo eliminar (HTTP ${r.status})`;
    const error = new Error(msg);
    error.rc = rc;
    throw error;
  }
  return j; // { ok:true, rc:0, msg:'...' }
}

// detalle para poder bloquear (necesitamos nombre/usuario/correo/rol)
async function apiGetUsuario(id){
  const r = await fetch(`/api/usuarios/${id}`, {
    headers: { 'Accept': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store'
  });
  if(!r.ok) throw new Error('HTTP '+r.status);
  const j = await r.json();
  return normalizeUserDetail(j);
}

async function apiActualizarUsuario(id, payload){
  const r = await fetch(`/api/usuarios/${id}/actualizar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...csrfHeader() },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
    cache: 'no-store'
  });
  const j = await r.json().catch(()=> ({rc:5}));
  return j; // { rc, msg }
}

// bloqueo “soft delete” cuando rc=10
async function apiBloquearUsuario(id){
  const u = await apiGetUsuario(id);
  const body = {
    usuario: u.usuario,
    nombreCompleto: u.nombreCompleto,
    correo: u.correo,
    rol: u.rol,
    estado: 'bloqueado',
  };
  return apiActualizarUsuario(id, body);
}

// ===== Render =====
function render(){
  tbody.innerHTML = '';
  if(!usuarios.length){
    msg.textContent = 'No hay usuarios en el sistema.';
    return;
  }
  msg.textContent = '';

  usuarios.forEach(u=>{
    const tr = document.createElement('tr');
    if (u.estado === 'bloqueado') tr.classList.add('blocked'); // opcional (estilo gris)

    const tdId    = document.createElement('td'); tdId.textContent = u.id;
    const tdUsr   = document.createElement('td'); tdUsr.textContent = u.usuario;
    const tdMail  = document.createElement('td'); tdMail.textContent = u.correo;
    const tdRol   = document.createElement('td'); tdRol.textContent  = u.rol;
    const tdFecha = document.createElement('td'); tdFecha.textContent = u.fecha;

    const tdAcc   = document.createElement('td'); tdAcc.className = 'col-actions';
    const b = document.createElement('button');
    b.className = 'btn-icon act-del';
    b.setAttribute('title','Eliminar');
    b.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>`;
    b.addEventListener('click', ()=> openModal(u));
    tdAcc.appendChild(b);

    tr.append(tdId, tdUsr, tdMail, tdRol, tdFecha, tdAcc);
    tbody.appendChild(tr);
  });
}

function openModal(user){
  toDeleteId = user.id;
  mId.textContent    = user.id;
  mUsr.textContent   = user.usuario;
  mEmail.textContent = user.correo;
  mRol.textContent   = user.rol;
  mFecha.textContent = user.fecha;
  hide(btnBloquear);            // se muestra solo si rc=10
  show(overlay); show(modal);
}
function closeModal(){ hide(overlay); hide(modal); toDeleteId = null; hide(btnBloquear); }

// ===== Eventos modal =====
btnCancelar.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

btnEliminar.addEventListener('click', async ()=>{
  if(toDeleteId == null) return;
  btnEliminar.disabled = true;
  try{
    await apiEliminarUsuario(toDeleteId);
    usuarios = usuarios.filter(u => u.id !== toDeleteId);
    render();
    closeModal();
    showToast('Usuario eliminado correctamente.');
  }catch(err){
    // Si es rc=10 => mostrar botón Bloquear
    if (err && err.rc === 10) {
      show(btnBloquear);
      showToast('No se puede eliminar: tiene referencias. Puedes bloquearlo.',);
    } else {
      showToast(err.message || 'No se pudo eliminar.');
    }
  }finally{
    btnEliminar.disabled = false;
  }
});

btnBloquear.addEventListener('click', async ()=>{
  if(toDeleteId == null) return;
  btnBloquear.disabled = true;
  try{
    const res = await apiBloquearUsuario(toDeleteId);
    if (res.rc === 0) {
      usuarios = usuarios.map(u => u.id === toDeleteId ? {...u, estado:'bloqueado'} : u);
      render();
      closeModal();
      showToast('Usuario bloqueado.');
    } else {
      showToast(res.msg || 'No se pudo bloquear.');
    }
  }catch(err){
    showToast(err.message || 'No se pudo bloquear.');
  }finally{
    btnBloquear.disabled = false;
  }
});

// ===== Init =====
async function init(){
  try{
    usuarios = await apiListarUsuarios();
    render();

    // INIT_ID opcional para abrir modal directo
    const initId = (window.INIT_ID ?? null);
    if(typeof initId === 'number' && initId > 0){
      const u = usuarios.find(x => x.id === initId);
      if(u) openModal(u);
    }
  }catch(err){
    msg.textContent = 'No se pudo cargar el listado.';
  }
}
document.addEventListener('DOMContentLoaded', init);
