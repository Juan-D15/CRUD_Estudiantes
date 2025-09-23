// ========= Helpers =========
const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];

const tbody = $("#tbodyUsuarios");
const msg   = $("#msg");

// Filtros
const formFiltros  = $("#formFiltros");
const btnAplicar   = $("#btnAplicar");
const btnLimpiar   = $("#btnLimpiar");
const btnRefrescar = $("#btnRefrescar");

// Modal
const overlay = $("#overlay");
const modal   = $("#modal");
const m = {
  id: $("#m-id"),
  usuario: $("#m-usuario"),
  nombre: $("#m-nombre"),
  correo: $("#m-correo"),
  rol: $("#m-rol"),
  estado: $("#m-estado"),
  uc: $("#m-uc"),
  fc: $("#m-fc"),
  iff: $("#m-if"),
  mr: $("#m-mr")
};
const btnCerrar = $("#btnCerrar");

// cache en memoria de la colección que está visible
let USUARIOS = [];

// ========= Lectura de filtros =========
function getFiltros(){
  const ordenFecha = ($('input[name="ordenFecha"]:checked') || {}).value || "desc";
  const roles   = $$('.filters input[name="rol"]:checked').map(i=>i.value);       // ['admin','secretaria']
  const estados = $$('.filters input[name="estado"]:checked').map(i=>i.value);    // ['activo','bloqueado']
  return { ordenFecha, roles, estados };
}

// ========= API =========
async function fetchUsuariosServer({roles, estados}){
  // Si hay exactamente 1 rol o 1 estado, aprovechamos los parámetros del backend
  const params = new URLSearchParams();
  if (roles.length === 1)   params.set('rol', roles[0]);          // backend acepta 1 rol
  if (estados.length === 1) params.set('soloActivos', estados[0] === 'activo' ? '1' : '0'); // backend acepta activo/bloqueado

  const url = `/api/usuarios${params.toString() ? ('?' + params.toString()) : ''}`;
  const r = await fetch(url, { headers: { 'Accept':'application/json' }, credentials:'same-origin', cache:'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return Array.isArray(j?.data) ? j.data : [];
}

function filtrarCliente(rows, {roles, estados}){
  let out = rows.slice();
  if (roles.length > 0)   out = out.filter(u => roles.includes(u.rol));
  if (estados.length > 0) out = out.filter(u => estados.includes(u.estado));
  return out;
}

// ========= Render =========
function renderTabla(){
  const {ordenFecha, roles, estados} = getFiltros();

  let rows = USUARIOS.slice();
  // Si el server NO filtró (varios roles/estados), filtramos en cliente
  rows = filtrarCliente(rows, {roles, estados});

  rows.sort((a,b)=>{
    const da = new Date(a.fechaCreacion), db = new Date(b.fechaCreacion);
    return (ordenFecha === "desc") ? (db - da) : (da - db);
  });

  tbody.innerHTML = "";
  rows.forEach(u=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.idUsuario}</td>
      <td>${u.usuario}</td>
      <td>${u.nombreCompleto}</td>
      <td>${u.correo}</td>
      <td>${u.rol === 'admin' ? 'Administrador' : 'Secretario(a)'}</td>
      <td><span class="badge ${u.estado === 'activo' ? 'green' : 'red'}">${u.estado}</span></td>
      <td>${u.ultimoCambioPwd ?? ''}</td>
      <td>${u.fechaCreacion ?? ''}</td>
      <td>${u.intentosFallidos ?? 0}</td>
      <td>${u.must_reset ? 'Sí' : 'No'}</td>
    `;
    tbody.appendChild(tr);
  });

  msg.textContent = rows.length ? "" : "No hay usuarios que coincidan con los filtros.";
}

// Mapea índice visible -> objeto “filtrado+ordenado” actual
function getRowByIndex(idx){
  const {ordenFecha, roles, estados} = getFiltros();
  let rows = filtrarCliente(USUARIOS.slice(), {roles, estados});
  rows.sort((a,b)=> (ordenFecha === "desc")
    ? new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
    : new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
  return rows[idx];
}

// ========= Modal =========
function openModal(u){
  if(!u) return;
  m.id.textContent      = u.idUsuario;
  m.usuario.textContent = u.usuario;
  m.nombre.textContent  = u.nombreCompleto;
  m.correo.textContent  = u.correo;
  m.rol.textContent     = (u.rol === 'admin' ? 'Administrador' : 'Secretario(a)');
  m.estado.textContent  = u.estado;
  m.uc.textContent      = u.ultimoCambioPwd ?? '';
  m.fc.textContent      = u.fechaCreacion ?? '';
  m.iff.textContent     = u.intentosFallidos ?? 0;
  m.mr.textContent      = u.must_reset ? "Sí" : "No";
  overlay.classList.remove("hidden");
  modal.classList.remove("hidden");
  btnCerrar.focus();
}
function closeModal(){
  overlay.classList.add("hidden");
  modal.classList.add("hidden");
}
overlay.addEventListener("click", closeModal);
btnCerrar.addEventListener("click", closeModal);
window.addEventListener("keydown", (ev)=>{ if(ev.key === "Escape") closeModal(); });

tbody.addEventListener("click", (ev)=>{
  const tr = ev.target.closest("tr");
  if(!tr) return;
  const idx = [...tbody.children].indexOf(tr);
  openModal(getRowByIndex(idx));
});

// ========= Carga / acciones =========
async function cargar(){
  const filtros = getFiltros();
  try{
    // pedir al server con 1 rol/estado si aplica; si no, traer todo y filtrar aquí
    USUARIOS = await fetchUsuariosServer(filtros);
    renderTabla();
  }catch(e){
    msg.textContent = "No se pudo cargar el listado.";
  }
}

btnAplicar.addEventListener("click", cargar);
btnLimpiar.addEventListener("click", ()=>{
  formFiltros.reset();
  $('input[name="ordenFecha"][value="desc"]').checked = true; // por defecto
  cargar();
});
btnRefrescar.addEventListener("click", cargar);

// primera carga
document.addEventListener("DOMContentLoaded", cargar);
