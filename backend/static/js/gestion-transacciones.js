/* ====== Datos DEMO (reemplaza con fetch al backend) ====== */
const demoAccesos = [
  { usuario:"admin",     fecha:"2025-06-10 09:12", estado:"éxito" },
  { usuario:"secretaria",fecha:"2025-06-10 09:18", estado:"fallo" },
  { usuario:"luz.a",     fecha:"2025-06-10 09:21", estado:"éxito" },
  { usuario:"oscar.r",   fecha:"2025-06-10 10:01", estado:"fallo" },
];

const demoTrans = [
  { fecha:"2025-06-09 12:10", accion:"crear_usuario",        detalle:"marta.s" },
  { fecha:"2025-06-09 12:25", accion:"insertar_estudiante",  detalle:"ID:124" },
  { fecha:"2025-06-09 13:02", accion:"cambiar_password",     detalle:"usuario oscar.r" },
  { fecha:"2025-06-09 15:47", accion:"eliminar_estudiante",  detalle:"ID:119" },
  { fecha:"2025-06-09 18:00", accion:"eliminar_usuario",     detalle:"juan.tmp" },
];

let demoUsuarios = [
  { id:1, usuario:"admin",      nombre:"Administrador General", correo:"admin@dominio.com",   rol:"admin",      estado:"activo",    ultima:"2025-06-10 09:12" },
  { id:2, usuario:"marta.s",    nombre:"Marta Sánchez",         correo:"marta@dominio.com",   rol:"secretaria", estado:"activo",    ultima:"2025-06-10 08:55" },
  { id:3, usuario:"oscar.r",    nombre:"Óscar Rubio",           correo:"oscar@dominio.com",   rol:"secretaria", estado:"bloqueado", ultima:"2025-06-08 16:40" },
  { id:4, usuario:"luz.a",      nombre:"Luz Arriola",           correo:"luz@dominio.com",     rol:"admin",      estado:"activo",    ultima:"2025-06-09 19:02" },
];

const demoUso = [
  { usuario:"admin", minutos: 126 },
  { usuario:"luz.a", minutos: 84  },
  { usuario:"marta.s", minutos: 58 },
  { usuario:"oscar.r", minutos: 22 },
];

/* ====== Util ====== */
const $ = (s, c=document)=>c.querySelector(s);
const $$ = (s, c=document)=>[...c.querySelectorAll(s)];

function toast(text){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 1800);
}

/* ====== Estado de “Agregar al reporte” ====== */
const REPORT_KEY = 'reportSelections:v1';
let reportSelections = new Set(JSON.parse(localStorage.getItem(REPORT_KEY) || '[]'));
function saveSelections(){
  localStorage.setItem(REPORT_KEY, JSON.stringify([...reportSelections]));
}

/* ====== Modal generic ====== */
const overlay = $("#overlay");
const modal   = $("#modal");
const inner   = $(".modal-inner", modal);
const titleEl = $("#modal-title");
const bodyEl  = $("#modal-body");
const extraEl = $("#extra-actions");
const btnAdd  = $("#btnAddReport");
const btnClose= $("#btnClose");

function openModal(kind, title){
  titleEl.textContent = title;
  bodyEl.innerHTML = ""; extraEl.innerHTML = ""; extraEl.classList.add('hidden');

  // Estado del botón “Agregar al reporte”
  btnAdd.dataset.kind = kind;
  updateAddButton();

  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  // iniciar animación
  setTimeout(()=> inner.parentElement.classList.add('show'), 0);
}

function closeModal(){
  inner.parentElement.classList.remove('show');
  setTimeout(()=>{
    overlay.classList.add('hidden');
    modal.classList.add('hidden');
  }, 150);
}

overlay.addEventListener('click', closeModal);
btnClose.addEventListener('click', closeModal);
window.addEventListener('keydown', (ev)=>{ if(ev.key==='Escape') closeModal(); });

btnAdd.addEventListener('click', ()=>{
  const k = btnAdd.dataset.kind;
  if(reportSelections.has(k)){
    reportSelections.delete(k);
    toast('Sección quitada del reporte');
  }else{
    reportSelections.add(k);
    toast('Sección agregada al reporte');
  }
  saveSelections();
  updateAddButton();
});
function updateAddButton(){
  const k = btnAdd.dataset.kind;
  if(reportSelections.has(k)){
    btnAdd.textContent = 'Agregado ✓';
    btnAdd.classList.add('ghost');
  }else{
    btnAdd.textContent = 'Agregar al reporte';
    btnAdd.classList.remove('ghost');
  }
}

/* ====== Renderers ====== */
function table(headers, rows){
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const tbl = document.createElement('table');
  tbl.className = 'grid';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  const tbody = document.createElement('tbody');
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = r.map(v=>`<td>${v}</td>`).join('');
    tbody.appendChild(tr);
  });
  tbl.append(thead, tbody);
  wrap.appendChild(tbl);
  return wrap;
}

/* Accesos */
function renderAccesos(){
  openModal('accesos','Bitácora de Accesos');
  const rows = demoAccesos.map(a=>[
    a.usuario,
    a.fecha,
    `<span class="badge ${a.estado==='éxito'?'green':'red'}">${a.estado}</span>`
  ]);
  bodyEl.appendChild(table(['Usuario','Fecha / hora','Estado'], rows));
}

/* Transacciones */
function renderTrans(){
  openModal('trans','Bitácora de Transacciones');
  const rows = demoTrans.map(t=>[t.fecha, t.accion, t.detalle]);
  bodyEl.appendChild(table(['Fecha / hora','Acción','Detalle'], rows));
}

/* Últimas conexiones (listado comprimido / expandido) */
function renderUltimas(){
  openModal('ultimas','Última Conexión por Usuario');
  const rows = demoUsuarios.map(u=>[u.usuario, u.ultima]);
  bodyEl.appendChild(table(['Usuario','Último acceso exitoso'], rows));
}

/* Usuarios con bloqueo/desbloqueo (solo en modal) */
function renderUsuarios(){
  openModal('usuarios','Usuarios del Sistema');
  const headers = ['ID','Usuario','Nombre completo','Correo','Rol','Estado','Acción'];
  const rows = demoUsuarios.map(u=>[
    u.id,
    u.usuario,
    u.nombre,
    u.correo,
    u.rol === 'admin' ? 'Administrador':'Secretario(a)',
    `<span class="badge ${u.estado==='activo'?'green':'red'}">${u.estado}</span>`,
    `<button class="toggle ${u.estado==='activo'?'active':'block'}" data-id="${u.id}">
        ${u.estado==='activo'?'Activo':'Bloqueado'}
     </button>`
  ]);
  bodyEl.appendChild(table(headers, rows));

  // Delegación: toggle bloqueo
  bodyEl.addEventListener('click', (e)=>{
    const tg = e.target.closest('.toggle');
    if(!tg) return;
    const id = Number(tg.dataset.id);
    const user = demoUsuarios.find(x=>x.id===id);
    if(!user) return;
    if(user.estado==='activo'){
      user.estado='bloqueado';
      tg.classList.remove('active'); tg.classList.add('block'); tg.textContent='Bloqueado';
      demoTrans.push({fecha:new Date().toISOString().slice(0,16).replace('T',' '), accion:'bloquear_usuario', detalle:user.usuario});
      toast('Usuario bloqueado');
    }else{
      user.estado='activo';
      tg.classList.add('active'); tg.classList.remove('block'); tg.textContent='Activo';
      demoTrans.push({fecha:new Date().toISOString().slice(0,16).replace('T',' '), accion:'desbloquear_usuario', detalle:user.usuario});
      toast('Usuario desbloqueado');
    }
    // refrescar badges
    renderUsuarios();
  }, { once:true }); // reatacha en cada render
}

/* Intentos fallidos: tabla + generar archivos */
function renderFallidos(){
  openModal('fallidos','Intentos fallidos de login');

  // Simulación: derivar de demoAccesos
  const fall = demoAccesos
    .filter(a=>a.estado==='fallo')
    .map((f,i)=> ({ usuario:f.usuario, fecha:f.fecha, ip:`10.0.0.${50+i}`, motivo:"contraseña incorrecta" }));

  const rows = fall.map(x=>[x.usuario, x.fecha, x.ip, x.motivo]);
  bodyEl.appendChild(table(['Usuario','Fecha / hora','IP/Dispositivo','Motivo'], rows));

  // Acciones extra
  extraEl.classList.remove('hidden');
  extraEl.innerHTML = `
    <button id="btnLog"  class="btn-primary">Generar .log</button>
    <button id="btnPDF"  class="btn-outline">Exportar PDF</button>
  `;

  // Generar LOG
  $("#btnLog").addEventListener('click', ()=>{
    const lines = fall.map(x=>`[${x.fecha}] user="${x.usuario}" ip=${x.ip} motivo="${x.motivo}"`).join('\n');
    const blob = new Blob([lines], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href:url, download:'intentos_fallidos.log' });
    a.click(); URL.revokeObjectURL(url);
    toast('Archivo .log generado');
  });

  // Exportar a “PDF” (versión imprimible)
  $("#btnPDF").addEventListener('click', ()=>{
    const w = window.open('','_blank');
    w.document.write(`
      <html><head><title>Intentos fallidos</title>
      <style>body{font-family:Inter,Arial;margin:18px;} table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #999;padding:8px;text-align:left} th{background:#eee}</style>
      </head><body>
      <h2>Intentos fallidos de login</h2>
      <table><thead><tr><th>Usuario</th><th>Fecha / hora</th><th>IP</th><th>Motivo</th></tr></thead>
      <tbody>${fall.map(x=>`<tr><td>${x.usuario}</td><td>${x.fecha}</td><td>${x.ip}</td><td>${x.motivo}</td></tr>`).join('')}</tbody>
      </table></body></html>`);
    w.document.close(); w.focus(); w.print();
  });
}

/* Promedio de uso: Donas + Barras (SVG) */
function renderUso(){
  openModal('uso','Promedio de uso');

  // Datos resumidos por rol
  const sumRole = role => demoUso
    .filter(u=> role==='admin' ? ['admin'].includes(u.usuario) || u.usuario==='admin' : true)
  const adminM = demoUso.filter(u=>u.usuario==='admin' || u.usuario==='luz.a' && false).reduce((a,b)=>a+(b.usuario==='admin'?b.minutos:0),0);
  const secM   = demoUso.filter(u=>u.usuario!=='admin').reduce((a,b)=>a+b.minutos,0);

  const donut = (label, val, max=240)=>{ // 240min = 4h referencia
    const pct = Math.min(100, Math.round(val/max*100));
    const R=40, C=2*Math.PI*R, dash = (pct/100)*C;
    return `
      <div class="chart">
        <h4>${label}: ${val} min</h4>
        <svg class="donut-svg" viewBox="0 0 120 120" width="210" height="210">
          <circle class="bg" cx="60" cy="60" r="40" fill="none" stroke-width="12"/>
          <circle class="val" cx="60" cy="60" r="40" fill="none" stroke-width="12"
                  stroke-dasharray="${dash} ${C-dash}" transform="rotate(-90 60 60)"/>
        </svg>
      </div>`;
  };

  const bars = ()=>{
    const max = Math.max(...demoUso.map(u=>u.minutos), 1);
    const barW = 40, gap = 18, pad=28, H=180;
    const width = pad*2 + demoUso.length*barW + (demoUso.length-1)*gap;
    const rects = demoUso.map((u,i)=>{
      const h = Math.round((u.minutos/max)*H);
      const x = pad + i*(barW+gap), y = (H - h) + 20;
      return `<rect class="bar" x="${x}" y="${y}" width="${barW}" height="${h}"/>
              <text x="${x+barW/2}" y="${H+38}" text-anchor="middle" font-size="12" fill="#fff">${u.usuario}</text>
              <text x="${x+barW/2}" y="${y-6}" text-anchor="middle" font-size="12" fill="#b574ff">${u.minutos}</text>`;
    }).join('');
    return `
      <div class="chart">
        <h4>Uso por usuario (min)</h4>
        <svg class="bar-svg" viewBox="0 0 ${width} ${H+60}" width="${width}" height="${H+60}">
          ${rects}
        </svg>
      </div>`;
  };

  bodyEl.innerHTML = `<div class="charts">
      ${donut('Administradores', adminM)}
      ${donut('Secretarías', secM)}
      ${bars()}
    </div>`;
}

/* Exportar: checklist con lo que el usuario marcó previamente */
function renderExport(){
  openModal('export','Exportar Reporte');

  const all = [
    {k:'accesos', t:'Bitácora de Accesos'},
    {k:'trans',   t:'Bitácora de Transacciones'},
    {k:'ultimas', t:'Última Conexión por Usuario'},
    {k:'uso',     t:'Promedio de uso'},
    {k:'usuarios',t:'Usuarios del Sistema'},
    {k:'fallidos',t:'Intentos fallidos de login'}
  ];

  bodyEl.innerHTML = `
    <form id="formExport" class="export">
      ${all.map(a=>`
        <label class="check">
          <input type="checkbox" name="sec" value="${a.k}" ${reportSelections.has(a.k)?'checked':''}>
          <span>${a.t}</span>
        </label>`).join('')}
    </form>
    <div class="extra-actions">
      <button id="btnPDFAll" class="btn-primary">Exportar PDF</button>
      <button id="btnCSVAll" class="btn-outline">Exportar Excel (.csv)</button>
    </div>
  `;

  // PDF: ventana imprimible con tablas simples
  $("#btnPDFAll").addEventListener('click', ()=>{
    const sel = $$('#formExport input[name="sec"]:checked').map(i=>i.value);
    if(!sel.length){ toast('Selecciona al menos una sección'); return; }
    const sectionsHTML = sel.map(k => sectionHTML(k)).join('<hr/>');
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>Reporte</title>
      <style>body{font-family:Inter,Arial;margin:18px;} table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #999;padding:8px;text-align:left} th{background:#eee} h2{margin:12px 0}</style>
      </head><body>${sectionsHTML}</body></html>`);
    w.document.close(); w.focus(); w.print();
  });

  // CSV combinado
  $("#btnCSVAll").addEventListener('click', ()=>{
    const sel = $$('#formExport input[name="sec"]:checked').map(i=>i.value);
    if(!sel.length){ toast('Selecciona al menos una sección'); return; }
    const csv = sel.map(k => sectionCSV(k)).join('\n\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href:url, download:'reporte.csv' });
    a.click(); URL.revokeObjectURL(url);
  });
}

/* Helpers para exportación */
function sectionHTML(key){
  const T = (title, headers, rows) =>
    `<h2>${title}</h2><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${
      rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')
    }</tbody></table>`;

  switch(key){
    case 'accesos':
      return T('Bitácora de Accesos',
        ['Usuario','Fecha / hora','Estado'],
        demoAccesos.map(a=>[a.usuario,a.fecha,a.estado]));
    case 'trans':
      return T('Bitácora de Transacciones',
        ['Fecha / hora','Acción','Detalle'],
        demoTrans.map(t=>[t.fecha,t.accion,t.detalle]));
    case 'ultimas':
      return T('Última Conexión por Usuario',
        ['Usuario','Último acceso'],
        demoUsuarios.map(u=>[u.usuario,u.ultima]));
    case 'usuarios':
      return T('Usuarios del Sistema',
        ['ID','Usuario','Nombre','Correo','Rol','Estado'],
        demoUsuarios.map(u=>[u.id,u.usuario,u.nombre,u.correo,u.rol,u.estado]));
    case 'fallidos': {
      const fall = demoAccesos.filter(a=>a.estado==='fallo')
        .map((f,i)=> ({ usuario:f.usuario, fecha:f.fecha, ip:`10.0.0.${50+i}`, motivo:"contraseña incorrecta" }));
      return T('Intentos fallidos de login',
        ['Usuario','Fecha / hora','IP/Dispositivo','Motivo'],
        fall.map(x=>[x.usuario,x.fecha,x.ip,x.motivo]));
    }
    case 'uso': {
      const rows = demoUso.map(u=>[u.usuario,u.minutos]);
      return T('Promedio de uso por usuario (min)', ['Usuario','Minutos'], rows);
    }
  }
}

function sectionCSV(key){
  const C = (title, headers, rows) =>
    `${title}\n${headers.join(',')}\n${rows.map(r=>r.join(',')).join('\n')}`;

  switch(key){
    case 'accesos':
      return C('Bitácora de Accesos',
        ['Usuario','Fecha / hora','Estado'],
        demoAccesos.map(a=>[a.usuario,a.fecha,a.estado]));
    case 'trans':
      return C('Bitácora de Transacciones',
        ['Fecha / hora','Acción','Detalle'],
        demoTrans.map(t=>[t.fecha,t.accion,t.detalle]));
    case 'ultimas':
      return C('Última Conexión por Usuario',
        ['Usuario','Último acceso'],
        demoUsuarios.map(u=>[u.usuario,u.ultima]));
    case 'usuarios':
      return C('Usuarios del Sistema',
        ['ID','Usuario','Nombre','Correo','Rol','Estado'],
        demoUsuarios.map(u=>[u.id,u.usuario,u.nombre,u.correo,u.rol,u.estado]));
    case 'fallidos': {
      const fall = demoAccesos.filter(a=>a.estado==='fallo')
        .map((f,i)=> ({ usuario:f.usuario, fecha:f.fecha, ip:`10.0.0.${50+i}`, motivo:"contraseña incorrecta" }));
      return C('Intentos fallidos de login',
        ['Usuario','Fecha / hora','IP/Dispositivo','Motivo'],
        fall.map(x=>[x.usuario,x.fecha,x.ip,x.motivo]));
    }
    case 'uso':
      return C('Promedio de uso por usuario (min)', ['Usuario','Minutos'], demoUso.map(u=>[u.usuario,u.minutos]));
  }
  return '';
}

/* ====== Enlaces de las tarjetas ====== */
const actions = {
  accesos: renderAccesos,
  trans:   renderTrans,
  ultimas: renderUltimas,
  uso:     renderUso,
  usuarios:renderUsuarios,
  fallidos:renderFallidos,
  export:  renderExport,
};

$$('.card[data-modal]').forEach(card=>{
  card.addEventListener('click', ()=>{
    const key = card.dataset.modal;
    actions[key] && actions[key]();
  });
});

/* Fin */
