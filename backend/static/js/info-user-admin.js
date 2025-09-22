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

// ===== Estado: color del select =====
function paintState(){
  fEstado.classList.remove('state-active','state-blocked');
  if(fEstado.value === 'activo') fEstado.classList.add('state-active');
  else fEstado.classList.add('state-blocked');
}
fEstado.addEventListener('change', paintState);
paintState();

// Guarda snapshot inicial
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

// Valida correo muy simple
function emailOk(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Construye diff y muestra modal
btnPreview.addEventListener('click', () => {
  // Validación mínima
  if(!emailOk(fCorreo.value.trim())){
    msg.textContent = 'Correo inválido.';
    setTimeout(() => msg.textContent = '', 1500);
    return;
  }

  const current = getCurrentValues();
  const rows = [];

  for(const key of Object.keys(current)){
    if(current[key] !== baseline[key]){
      rows.push({
        campo: keyMap(key),
        before: baseline[key],
        after: current[key]
      });
    }
  }

  if(rows.length === 0){
    showToast('No hay cambios para aplicar.');
    return;
  }

  // Render diff
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
  // Animación de entrada
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

// Confirmar (simulado)
btnConfirm.addEventListener('click', () => {
  baseline = getCurrentValues();     // “guardamos” como definitivo
  closeModal();
  showToast('Actualizado correctamente.');
});

// Toast
let toastTimer;
function showToast(text){
  toast.textContent = text;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 1800);
}
