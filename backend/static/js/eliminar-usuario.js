// ====== DEMO DATA (reemplaza con fetch a tu API cuando conectes backend) ======
let usuarios = [
  {id:1, usuario:'admin',     correo:'admin@dominio.com',     rol:'admin',      fecha:'2025-06-01 10:15'},
  {id:2, usuario:'ana.alv',   correo:'ana.alvarez@correo.com', rol:'secretaria', fecha:'2025-06-02 11:25'},
  {id:3, usuario:'pedro.lpz', correo:'pedro.lopez@correo.com', rol:'secretaria', fecha:'2025-06-03 09:40'},
  {id:4, usuario:'lucia.gmz', correo:'lucia.gomez@correo.com', rol:'secretaria', fecha:'2025-06-05 14:20'},
];

// ====== DOM refs ======
const tbody   = document.getElementById('tbodyUsuarios');
const msg     = document.getElementById('msg');
const overlay = document.getElementById('overlay');
const modal   = document.getElementById('modal');
const toast   = document.getElementById('toast');

const mId     = document.getElementById('m-id');
const mUsr    = document.getElementById('m-usuario');
const mEmail  = document.getElementById('m-correo');
const mRol    = document.getElementById('m-rol');
const mFecha  = document.getElementById('m-fecha');

const btnCancelar = document.getElementById('btnCancelar');
const btnEliminar = document.getElementById('btnEliminar');

let toDeleteId = null;

// ====== Helpers ======
function show(el){ el.classList.remove('hidden') }
function hide(el){ el.classList.add('hidden') }

function showToast(text){
  toast.textContent = text;
  show(toast);
  setTimeout(()=> hide(toast), 2200);
}

function openModal(user){
  toDeleteId = user.id;
  mId.textContent    = user.id;
  mUsr.textContent   = user.usuario;
  mEmail.textContent = user.correo;
  mRol.textContent   = user.rol;
  mFecha.textContent = user.fecha;
  show(overlay); show(modal);
}
function closeModal(){ hide(overlay); hide(modal); toDeleteId = null; }

// ====== Render tabla ======
function render(){
  tbody.innerHTML = '';
  if(!usuarios.length){
    msg.textContent = 'No hay usuarios en el sistema.';
    return;
  }
  msg.textContent = '';

  usuarios.forEach(u=>{
    const tr = document.createElement('tr');

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

// ====== Eventos modal ======
btnCancelar.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal() });

btnEliminar.addEventListener('click', ()=>{
  if(toDeleteId == null) return;

  // Eliminar del arreglo (demo). En producción, haz fetch al backend.
  usuarios = usuarios.filter(u => u.id !== toDeleteId);
  render();
  closeModal();
  showToast('Usuario eliminado correctamente.');
});

// ====== Init ======
render();
