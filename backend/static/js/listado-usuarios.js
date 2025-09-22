// ===== Demo de datos (reemplazar por fetch al conectar backend) =====
let usuarios = [
  {
    idUsuario: 1, usuario: "admin", nombreCompleto: "Administrador General",
    correo: "admin@dominio.com", rol: "admin", estado: "activo",
    ultimoCambioPwd: "2025-05-20 09:12", fechaCreacion: "2024-12-10 14:05",
    intentosFallidos: 0, must_reset: 0
  },
  {
    idUsuario: 2, usuario: "marta.s", nombreCompleto: "Marta Sánchez",
    correo: "marta@dominio.com", rol: "secretaria", estado: "activo",
    ultimoCambioPwd: "2025-06-02 10:00", fechaCreacion: "2025-01-08 08:40",
    intentosFallidos: 1, must_reset: 0
  },
  {
    idUsuario: 3, usuario: "oscar.r", nombreCompleto: "Óscar Rubio",
    correo: "oscar@dominio.com", rol: "secretaria", estado: "bloqueado",
    ultimoCambioPwd: "2025-04-18 16:21", fechaCreacion: "2024-11-02 12:10",
    intentosFallidos: 5, must_reset: 1
  },
  {
    idUsuario: 4, usuario: "luz.a", nombreCompleto: "Luz Arriola",
    correo: "luz@dominio.com", rol: "admin", estado: "activo",
    ultimoCambioPwd: "2025-03-01 09:55", fechaCreacion: "2025-02-11 07:30",
    intentosFallidos: 0, must_reset: 0
  }
];

const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];

const tbody = $("#tbodyUsuarios");
const msg   = $("#msg");

// Filtros
const formFiltros = $("#formFiltros");
const btnAplicar  = $("#btnAplicar");
const btnLimpiar  = $("#btnLimpiar");
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

// ===== Render tabla con filtros/orden =====
function getFiltros(){
  const ordenFecha = ($('input[name="ordenFecha"]:checked') || {}).value || "desc";
  const roles = $$('.filters input[name="rol"]:checked').map(i=>i.value);
  const estados = $$('.filters input[name="estado"]:checked').map(i=>i.value);
  return {ordenFecha, roles, estados};
}

function renderTabla(){
  const {ordenFecha, roles, estados} = getFiltros();
  let rows = usuarios.slice();

  if(roles.length)   rows = rows.filter(u => roles.includes(u.rol));
  if(estados.length) rows = rows.filter(u => estados.includes(u.estado));

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
      <td>
        <span class="badge ${u.estado === 'activo' ? 'green' : 'red'}">${u.estado}</span>
      </td>
      <td>${u.ultimoCambioPwd}</td>
      <td>${u.fechaCreacion}</td>
      <td>${u.intentosFallidos}</td>
      <td>${u.must_reset ? 'Sí' : 'No'}</td>
    `;
    tbody.appendChild(tr);
  });

  msg.textContent = rows.length ? "" : "No hay usuarios que coincidan con los filtros.";
}

renderTabla();

// ===== Acciones de filtros =====
btnAplicar.addEventListener("click", renderTabla);

btnLimpiar.addEventListener("click", ()=>{
  formFiltros.reset();
  // asegurar que “Más reciente” quede activo
  $('input[name="ordenFecha"][value="desc"]').checked = true;
  renderTabla();
});

// ===== Actualizar (simulado) =====
btnRefrescar.addEventListener("click", ()=>{
  // Aquí podrías: const data = await fetch('/api/usuarios').then(r=>r.json()); usuarios = data;
  msg.textContent = "Tabla actualizada.";
  setTimeout(()=> msg.textContent = "", 1600);
});

// ===== Modal de detalle =====
tbody.addEventListener("click", (e)=>{
  const tr = e.target.closest("tr");
  if(!tr) return;
  const idx = [...tbody.children].indexOf(tr);
  const {ordenFecha, roles, estados} = getFiltros();
  // reconstruir colección filtrada para mapear índice visible -> objeto
  let rows = usuarios.slice();
  if(roles.length)   rows = rows.filter(u => roles.includes(u.rol));
  if(estados.length) rows = rows.filter(u => estados.includes(u.estado));
  rows.sort((a,b)=> (ordenFecha === "desc")
                    ? new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
                    : new Date(a.fechaCreacion) - new Date(b.fechaCreacion));

  const u = rows[idx];
  if(!u) return;

  m.id.textContent  = u.idUsuario;
  m.usuario.textContent = u.usuario;
  m.nombre.textContent  = u.nombreCompleto;
  m.correo.textContent  = u.correo;
  m.rol.textContent     = u.rol === 'admin' ? 'Administrador' : 'Secretario(a)';
  m.estado.textContent  = u.estado;
  m.uc.textContent      = u.ultimoCambioPwd;
  m.fc.textContent      = u.fechaCreacion;
  m.iff.textContent     = u.intentosFallidos;
  m.mr.textContent      = u.must_reset ? "Sí" : "No";

  overlay.classList.remove("hidden");
  modal.classList.remove("hidden");
  btnCerrar.focus();
});

function closeModal(){
  overlay.classList.add("hidden");
  modal.classList.add("hidden");
}
overlay.addEventListener("click", closeModal);
btnCerrar.addEventListener("click", closeModal);
window.addEventListener("keydown", (ev)=>{ if(ev.key === "Escape") closeModal(); });
