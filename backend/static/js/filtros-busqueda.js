/* ============== Utils / DOM ============== */
const $  = (s, c = document) => c.querySelector(s);

const resultados    = $('#resultados');
const msg           = $('#msg');

const fUsuario      = $('#fUsuario');
const fAccion       = $('#fAccion');
const fFechaTipo    = $('#fFechaTipo');

const fDesde        = $('#fDesde');
const fHasta        = $('#fHasta');
const rangoFechas   = $('#rangoFechas');       // fallback inline (si no hay popover)

const popoverRango  = $('#popoverRango');      // popover (si existe en tu HTML)
const btnRangoClose = $('#btnRangoClose');     // botón cerrar popover (opcional)

const chkActivo     = $('#chkActivo');
const chkBloqueado  = $('#chkBloqueado');

const btnBuscar     = $('#btnBuscar');
const btnLimpiar    = $('#btnLimpiar');
const btnExportar   = $('#btnExportar');

const overlay       = $('#overlay');
const modal         = $('#modal');
const mId           = $('#m-id');
const mUsu          = $('#m-usuario');
const mNom          = $('#m-nombre');
const mCor          = $('#m-correo');
const mRol          = $('#m-rol');
const mEst          = $('#m-estado');
const mAcc          = $('#m-accion');
const mFec          = $('#m-fecha');
const mDet          = $('#m-detalle');
const btnCerrar     = $('#btnCerrar');
const API_URL = '/api/filtros/busqueda';
/* Guardamos el último set filtrado para exportar */
let lastResults = [];   // [{user, log}...]

/* ============== Popover de rango de fechas (sin colisiones) ============== */
/* Se abre cuando el select "fFechaTipo" == 'rango'. Si no existe popoverRango,
   usamos el bloque inline #rangoFechas como en tu JS anterior. */

function openRangePopover() {
  if (!popoverRango) return;

  // Mostrar
  popoverRango.classList.add('open');

  // Posicionar bajo el select
  positionPopover(fFechaTipo, popoverRango);

  // Cerrar al hacer click fuera
  setTimeout(() => {
    document.addEventListener('click', outsideCloseRange, { once: true });
  }, 0);
}

function closeRangePopover() {
  if (!popoverRango) return;
  popoverRango.classList.remove('open');
}

function outsideCloseRange(e){
  if (!popoverRango) return;
  if (popoverRango.contains(e.target) || e.target === fFechaTipo) {
    // Hicieron click dentro; no cerramos.
    document.addEventListener('click', outsideCloseRange, { once: true });
    return;
  }
  closeRangePopover();
}

// Coloca el popover bajo el elemento anchor y “voltea” si se sale a la derecha
function positionPopover(anchorEl, popEl){
  const a = anchorEl.getBoundingClientRect();
  const p = popEl.getBoundingClientRect();
  const spaceRight = window.innerWidth - a.left;

  popEl.style.top  = `${a.bottom + window.scrollY + 8}px`;
  popEl.style.left = `${a.left + window.scrollX}px`;

  popEl.classList.remove('flip-right');
  if (spaceRight < p.width) {
    popEl.classList.add('flip-right');
    // al voltear, reposicionamos a la derecha del anchor
    popEl.style.left = `${a.right + window.scrollX - p.width}px`;
  }
}

if (btnRangoClose) btnRangoClose.addEventListener('click', closeRangePopover);

/* Mostrar / ocultar controles de fecha según selección */
fFechaTipo.addEventListener('change', () => {
  if (fFechaTipo.value === 'rango') {
    if (popoverRango) {
      openRangePopover();
    } else if (rangoFechas) {
      rangoFechas.classList.remove('hidden'); // fallback layout inline
    }
  } else {
    if (popoverRango) closeRangePopover();
    if (rangoFechas)  rangoFechas.classList.add('hidden');
  }
});

/* ============== Búsqueda y acciones ============== */
// Buscar con Enter
fUsuario.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); aplicarFiltros(); } });

btnBuscar.addEventListener('click', aplicarFiltros);

btnLimpiar.addEventListener('click', ()=>{
  fUsuario.value   = '';
  fAccion.value    = '';
  fFechaTipo.value = '';
  if (fDesde) fDesde.value = '';
  if (fHasta) fHasta.value = '';
  if (rangoFechas)  rangoFechas.classList.add('hidden');
  if (popoverRango) closeRangePopover();

  chkActivo.checked    = true;
  chkBloqueado.checked = false;

  resultados.innerHTML = '';
  msg.textContent = '';
  lastResults = [];
});

btnExportar.addEventListener('click', exportarPDF);

function buildQuery() {
  const p = new URLSearchParams();
  const userQ = (fUsuario.value || '').trim();
  if (userQ) p.set('usuario', userQ);
  if (fAccion.value) p.set('accion', fAccion.value);
  if (fFechaTipo.value) p.set('fechaTipo', fFechaTipo.value);
  if (fFechaTipo.value === 'rango') {
    if (fDesde.value) p.set('desde', fDesde.value);
    if (fHasta.value) p.set('hasta', fHasta.value);
  }
  if (chkActivo.checked)    p.append('estado', 'activo');
  if (chkBloqueado.checked) p.append('estado', 'bloqueado');
  p.set('limit','500');
  return p.toString();
}

/* Render inicial */
aplicarFiltros();

/* ============== Lógica principal ============== */
async function aplicarFiltros(){
  msg.textContent = '';
  resultados.setAttribute('aria-busy','true');

  try{
    const qs = buildQuery();
    const r  = await fetch(`${API_URL}?${qs}`, { headers: { 'X-Requested-With':'fetch' }});
    const j  = await r.json();
    lastResults = j.rows || [];
    renderResultados(lastResults);
  }catch(err){
    console.error(err);
    msg.textContent = 'Error consultando la búsqueda.';
    lastResults = [];
    resultados.innerHTML = '';
  }finally{
    resultados.setAttribute('aria-busy','false');
  }
}

function renderResultados(items){
  resultados.innerHTML = '';
  if (!items.length) {
    msg.textContent = 'Sin resultados con los filtros aplicados.';
    return;
  }

  for (const it of items){
    const row = document.createElement('button');
    row.className = 'row';
    row.innerHTML = `
      <span class="role-ico">${iconoRol(it.rol)}</span>
      <div>
        <div class="main">${escapeHTML(it.usuario)} — ${escapeHTML(mapAccion({accion:it.accion, exito:it.exito}))}</div>
        <div class="sub">${escapeHTML(formatFecha(it.fechaHora))} · ${escapeHTML(it.nombreCompleto)} · 
          <span class="badge ${it.estado==='activo'?'green':'red'}">${escapeHTML(it.estado)}</span>
        </div>
      </div>
      <div>${it.rol==='admin'?'Administrador':'Secretaría'}</div>
    `;
    row.addEventListener('click', ()=> abrirModal(it));
    resultados.appendChild(row);
  }
}


/* ============== Modal detalle ============== */
function abrirModal(it){
  mId.textContent   = it.idUsuario ?? '';
  mUsu.textContent  = it.usuario ?? '';
  mNom.textContent  = it.nombreCompleto ?? '';
  mCor.textContent  = it.correo ?? '';
  mRol.textContent  = it.rol==='admin'?'Administrador':'Secretaría';
  mEst.textContent  = it.estado ?? '';
  mAcc.textContent  = mapAccion({accion:it.accion, exito:it.exito});
  mFec.textContent  = formatFecha(it.fechaHora);
  mDet.textContent  = it.detalle || (it.exito===true?'Éxito':(it.exito===false?'Fallo':''));

  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  btnCerrar.focus();
}

function cerrarModal(){
  overlay.classList.add('hidden');
  modal.classList.add('hidden');
}
overlay.addEventListener('click', cerrarModal);
btnCerrar.addEventListener('click', cerrarModal);
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') cerrarModal(); });

/* ============== Exportar PDF (plantilla limpia sin choques) ============== */
function exportarPDF(){
  if (!lastResults.length){
    msg.textContent = 'No hay resultados para exportar.';
    setTimeout(()=> msg.textContent='', 1500);
    return;
  }

  const win = window.open('', '_blank', 'width=1000,height=800');
  const css = `
    <style>
      *{box-sizing:border-box}
      body{font-family:Inter,Arial,sans-serif;color:#111;background:#fff;margin:22px}
      h2{margin:0 0 16px 0;font-size:22px}
      .list{display:grid;gap:8px}
      .p-row{
        display:grid;grid-template-columns:28px 1fr auto;gap:12px;align-items:center;
        padding:10px 12px;border:1px solid #E5E7EB;border-radius:12px;
      }
      .p-ico svg{width:22px;height:22px}
      .p-ico svg *{stroke:#111;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
      .p-main{font-weight:800}
      .p-sub{color:#111;font-size:12px;opacity:.85}
      .badge{display:inline-block;padding:.12rem .45rem;border-radius:999px;border:1px solid #111;font-size:11px}
      .rlabel{color:#111;opacity:.9}
      @media print{
        @page{margin:16mm}
      }
    </style>`;

  const rowsHTML = lastResults.map(({user:u, log:l}) => `
    <div class="p-row">
      <div class="p-ico">${iconoRolPrint(u.rol)}</div>
      <div>
        <div class="p-main">${escapeHTML(u.usuario)} — ${escapeHTML(mapAccion(l))}</div>
        <div class="p-sub">${escapeHTML(formatFecha(l.fecha))} · ${escapeHTML(u.nombre)} · <span class="badge">${escapeHTML(u.estado)}</span></div>
      </div>
      <div class="rlabel">${u.rol==='admin'?'Administrador':'Secretaría'}</div>
    </div>
  `).join('');

  const html = `
    <h2>Resultados — Filtro de Búsqueda</h2>
    <div class="list">${rowsHTML}</div>
  `;

  win.document.write(`<html><head><title>Exportar búsqueda</title>${css}</head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

/* ============== Helpers ============== */
function iconoRol(rol){
  // blanco en pantalla (usa currentColor; CSS pone color blanco)
  if(rol === 'admin'){
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8l4 3 4-5 4 5 4-3v8H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>`;
  }
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M5 20c2-5 6-5 7-5s5 0 7 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
}
function iconoRolPrint(rol){
  // ícono negro para PDF/impresión
  if(rol === 'admin'){
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8l4 3 4-5 4 5 4-3v8H4z" />
      </svg>`;
  }
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2"/>
      <path d="M5 20c2-5 6-5 7-5s5 0 7 5"/>
    </svg>`;
}
function mapAccion(l){
  const map = {
    login:       `Login ${l.exito===false ? '(Fallo)' : '(Éxito)'}`,
    user_reg:    'Registro de usuario',
    user_edit:   'Edición de usuario',
    user_del:    'Eliminación de usuario',
    stu_reg:     'Registro de estudiante',
    stu_edit:    'Edición de estudiante',
    stu_del:     'Eliminación de estudiante',
    pwd_change:  'Cambio de contraseña',
    self_edit:   'Edición de su cuenta',
    report:      'Generación de reportes',
    last_login:  'Última conexión'
  };
  return map[l.accion] || l.accion;
}
function formatFecha(s){
  const d = new Date(s);
  if(Number.isNaN(d.getTime())) return s;
  const pad = n => n.toString().padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function escapeHTML(s){
  return (s ?? '').toString().replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}
