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
const btnBuscar  = $('#btnBuscar');
const btnAct     = $('#btnActualizar');
const toast      = $('#toast');

let lastRolValue = selRol.value;

// === Demo de datos (sustituye por fetch al backend) ===
const demoUser = {
  id: 1,
  usuario: 'jdiaz',
  nombre: 'Juan Díaz',
  correo: 'juan.diaz@dominio.com',
  rol: 'secretaria',
  estado: 'activo'
};

// ===== UI utils =====
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

// Estado verde/rojo
function paintEstado(){
  const v = selEstado.value;
  estadoChip.textContent = v;
  estadoWrap.classList.toggle('ok',  v === 'activo');
  estadoWrap.classList.toggle('bad', v === 'bloqueado');
}

// Rellenar formulario
function fillForm(u){
  inpUsuario.value = u.usuario || '';
  inpNombre.value  = u.nombre  || '';
  inpCorreo.value  = u.correo  || '';
  selRol.value     = u.rol     || 'secretaria';
  selEstado.value  = u.estado  || 'activo';
  lastRolValue     = selRol.value;
  paintEstado();
}

// Validaciones mínimas
function validEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v||'').trim());
}
function validate(){
  if(!inpUsuario.value.trim() || !inpNombre.value.trim() || !validEmail(inpCorreo.value)){
    return false;
  }
  return true;
}

// ===== Eventos =====
btnBuscar.addEventListener('click', ()=>{
  const id = Number(idBuscar.value || '0');

  // Simulación: encuentra sólo si ID=1
  if(id === demoUser.id){
    msgBuscar.textContent = 'Usuario encontrado.';
    fillForm(demoUser);
    editCard.classList.remove('hidden');
    showToast('Usuario encontrado.', true);
  }else{
    msgBuscar.textContent = 'No se encontró el ID indicado.';
    editCard.classList.add('hidden');
    showToast('No se encontró el ID indicado.', false);
  }
});

selEstado.addEventListener('change', paintEstado);

// Confirmar al cambiar a admin
selRol.addEventListener('change', ()=>{
  if(selRol.value === 'admin' && lastRolValue !== 'admin'){
    openModal();
  }else{
    lastRolValue = selRol.value;
  }
});

$('#mNo').addEventListener('click', ()=>{
  selRol.value = lastRolValue;  // revertir
  closeModal();
});
$('#mYes').addEventListener('click', ()=>{
  lastRolValue = 'admin';
  closeModal();
});
overlay.addEventListener('click', closeModal);
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });

// Actualizar (demo front)
btnAct.addEventListener('click', ()=>{
  if(editCard.classList.contains('hidden')){
    showToast('No hay datos para actualizar.', false);
    return;
  }
  if(!validate()){
    showToast('Verifica usuario, nombre y correo válido.', false);
    return;
  }

  // Aquí harías tu fetch/POST al backend (sp_ActualizarUsuario, etc.)
  // Ejemplo:
  // fetch('/api/usuarios/actualizar', { method:'POST', body: JSON.stringify({...}) })
  //   .then(r=>r.ok ? showToast('Actualizado correctamente.', true) : showToast('No se pudo actualizar.', false))

  // DEMO éxito
  showToast('Actualizado correctamente.', true);
});
