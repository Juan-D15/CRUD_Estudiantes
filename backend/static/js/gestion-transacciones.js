/* ==========================================================
   Reportes – Transacciones, Accesos, Utilidad
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ---------- utils ----------
  const $  = (s, c=document)=>c.querySelector(s);
  const $$ = (s, c=document)=>[...c.querySelectorAll(s)];

  const overlay     = $('#overlay');
  const modal       = $('#modal');
  const modalTitle  = $('#modal-title');
  const modalBody   = $('#modal-body');
  const btnClose    = $('#btnClose');
  const extraBar    = $('#extra-actions');             // barra para export/acciones
  const btnAdd      = $('#btnAddReport');              // "Agregar al reporte"

  let currentKey = null;                               // panel activo
  const selectedForExport = new Set();                 // claves agregadas

  function openModal(key, title){
    currentKey = key || null;
    modalTitle.textContent = title || '';
    modalBody.innerHTML = '';
    if (extraBar) { extraBar.innerHTML = ''; extraBar.classList.add('hidden'); }

    // actualizar texto del botón "Agregar al reporte"
    if (btnAdd) {
      btnAdd.textContent = selectedForExport.has(key) ? 'Quitar del reporte' : 'Agregar al reporte';
      btnAdd.disabled = !key; // por si abrimos algo sin key
    }

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    setTimeout(()=> modal.classList.add('show'), 0);
  }
  function closeModal(){
    modal.classList.remove('show');
    setTimeout(()=>{
      overlay.classList.add('hidden');
      modal.classList.add('hidden');
    }, 150);
  }
  overlay?.addEventListener('click', closeModal);
  btnClose?.addEventListener('click', closeModal);

  // toggle agregar/quitar al reporte
  btnAdd?.addEventListener('click', () => {
    if (!currentKey) return;
    if (selectedForExport.has(currentKey)) {
      selectedForExport.delete(currentKey);
      btnAdd.textContent = 'Agregar al reporte';
    } else {
      selectedForExport.add(currentKey);
      btnAdd.textContent = 'Quitar del reporte';
    }
  });

  async function fetchJSON(url){
    const r = await fetch(url, { credentials:'same-origin', cache:'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }
  const fmtDate = s => {
    if (!s) return '';
    const d = new Date(s); return isNaN(d) ? s : d.toLocaleString();
  };
  const chipEstado = estado => {
    const ok = String(estado||'').toLowerCase()==='activo';
    return `<span class="badge ${ok?'green':'red'}">${ok?'activo':'bloqueado'}</span>`;
  };

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

  function exportRowsToPDF(title, headers, rows){
    const html = `
      <html><head><title>${title}</title>
      <style>
        body{font-family:Inter,Arial;margin:18px;}
        h2{margin:0 0 12px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #999;padding:8px;text-align:left}
        th{background:#eee}
      </style></head><body>
      <h2>${title}</h2>
      <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </body></html>`;
    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close(); w.focus(); w.print();
  }

  // ----- barra de exportación por panel -----
  function showExportBar(kind, headers, rows){
    if (!extraBar) return;
    extraBar.innerHTML = '';
    extraBar.classList.remove('hidden');

    const makeBtn = (id, txt, primary=false) => {
      const b = document.createElement('button');
      b.id = id;
      b.className = primary ? 'btn-primary' : 'btn-outline';
      b.textContent = txt;
      return b;
    };

    if (kind === 'fallidos') {
      const bLog = makeBtn('btnLog', 'Generar .log', true);
      const bPDF = makeBtn('btnPDF', 'Exportar PDF', false);
      extraBar.append(bLog, bPDF);

      bLog.addEventListener('click', () => {
        const lines = rows.map(r=>`[${r[1]}] user="${r[0]}" ip="${r[2]}" motivo="${r[3]}"`).join('\n');
        const blob = new Blob([lines], {type:'text/plain'});
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href:url, download:'intentos_fallidos.log' });
        a.click(); URL.revokeObjectURL(url);
      });
      bPDF.addEventListener('click', () => exportRowsToPDF('Intentos fallidos de login', headers, rows));
    } else {
      const bPDF = makeBtn('btnPDF', 'Exportar PDF', true);
      extraBar.append(bPDF);
      bPDF.addEventListener('click', () => exportRowsToPDF(modalTitle.textContent || 'Reporte', headers, rows));
    }
  }

  // ---------- acciones ----------
  const actions = {};

  // Accesos
  actions.accesos = async () => {
    openModal('accesos', 'Reporte de Accesos');
    try{
      const data = await fetchJSON('/api/reportes/filtros?fuente=accesos');
      const headers = ['Usuario','Fecha/Hora','Acción','Estado usuario','Motivo'];
      const rows = (data.rows||[]).map(a=>[
        a.usuario || a.usuarioTxt || '',
        fmtDate(a.fechaHora),
        a.accion || '',
        chipEstado(a.estadoUsuario || a.estado),
        a.motivo || ''
      ]);
      modalBody.appendChild(table(headers, rows));
      showExportBar('accesos', headers, rows);
    }catch(err){
      modalBody.innerHTML = `<div class="tip error">Error consultando accesos: ${err.message}</div>`;
    }
  };

  // Transacciones
  actions.trans = async () => {
    openModal('trans', 'Reporte de Transacciones');
    try{
      const data = await fetchJSON('/api/reportes/filtros?fuente=transacciones');
      const headers = ['Fecha/Hora','Usuario','Entidad','Operación','Id afectado'];
      const rows = (data.rows||[]).map(t=>[
        fmtDate(t.fechaHora), t.usuario, t.entidad, t.operacion, t.idAfectado ?? ''
      ]);
      modalBody.appendChild(table(headers, rows));
      showExportBar('trans', headers, rows);
    }catch(err){
      modalBody.innerHTML = `<div class="tip error">Error consultando transacciones: ${err.message}</div>`;
    }
  };

  // Usuarios del sistema
  actions.usuarios = async () => {
  openModal('usuarios', 'Usuarios del Sistema');
  try{
    const data = await fetchJSON('/api/reportes/filtros?fuente=usuarios');

    const headers = [
      'ID','Usuario','Nombre','Correo','Rol','Estado',
      'ÚLT. CAMBIO PWD','Intentos','Must reset','Creación'
    ];

    const rows = (data.rows||[]).map(u=>[
      u.idUsuario,
      u.usuario,
      u.nombreCompleto,
      u.correo,
      u.rol,
      chipEstado(u.estado),
      fmtDate(u.ultimoCambioPwd),         
      (u.intentosFallidos ?? 0),
      (u.must_reset ? 'Sí' : 'No'),
      fmtDate(u.fechaCreacion)
    ]);

    modalBody.appendChild(table(headers, rows));
    showExportBar('usuarios', headers, rows); // export de este panel
  }catch(err){
    modalBody.innerHTML = `<div class="tip error">Error consultando usuarios: ${err.message}</div>`;
  }
};


  // Últimas conexiones exitosas por usuario
  actions.ultimas = async () => {
    openModal('ultimas', 'Última Conexión por Usuario');
    try{
      const data = await fetchJSON('/api/reportes/filtros?fuente=accesos');
      const okRow = r => (r.exito===true || r.exito===1 || r.exito==='1' ||
                           (!r.motivo && String(r.accion||'').toLowerCase().includes('login')));
      const map = new Map();
      (data.rows||[]).forEach(r=>{
        const u = r.usuario || r.usuarioTxt || '';
        if (!u || !okRow(r)) return;
        const f = new Date(r.fechaHora);
        if (!map.has(u) || f > map.get(u)) map.set(u, f);
      });
      const headers = ['Usuario','Último acceso exitoso'];
      const rows = [...map.entries()].sort((a,b)=>b[1]-a[1])
                   .map(([u,dt])=>[u, dt.toLocaleString()]);
      modalBody.appendChild(table(headers, rows));
      showExportBar('ultimas', headers, rows);
    }catch(err){
      modalBody.innerHTML = `<div class="tip error">Error consultando últimas conexiones: ${err.message}</div>`;
    }
  };

  // Intentos fallidos de login
  actions.fallidos = async () => {
    openModal('fallidos', 'Intentos fallidos de login');
    try{
      const data = await fetchJSON('/api/reportes/filtros?fuente=accesos');
      const headers = ['Usuario','Fecha/Hora','IP/Dispositivo','Motivo'];
      const rows = (data.rows||[])
        .filter(r => (r.exito===false || r.exito===0 || r.exito==='0'))
        .map(x=>[
          x.usuario || x.usuarioTxt || '',
          fmtDate(x.fechaHora),
          x.ip || x.dispositivo || '-',
          x.motivo || 'credenciales inválidas'
        ]);

      modalBody.appendChild(table(headers, rows));
      // En fallidos queremos .log + PDF
      showExportBar('fallidos', headers, rows);
    }catch(err){
      modalBody.innerHTML = `<div class="tip error">Error consultando fallidos: ${err.message}</div>`;
    }
  };

  // Promedio de uso: Conteo de acciones + Minutos promedio por usuario
  // Promedio de uso: Conteo de acciones + Promedio en min/horas con selector
  actions.uso = async () => {
    openModal('uso', 'Promedio de uso');

    // --- helpers de formato/unidad (sólo para PROMEDIO)
    let UNIT = 'h'; // 'min' | 'h'
    const toUnit   = v => UNIT === 'h' ? (v/60) : v;                 // minutos -> unidad elegida
    const valText  = v => UNIT === 'h' ? (v/60).toFixed(1) : Math.round(v);
    const unitText = () => UNIT === 'h' ? 'h' : 'min';

    // ------- renderizadores -------
    const renderBarsCount = (pairs) => {
      const max   = Math.max(...pairs.map(([,v])=>v), 1);
      const barW  = 42, gap = 24, pad = 48, top = 24, H = 220, bottom = 80;
      const W     = pad*2 + pairs.length*barW + (pairs.length-1)*gap;
      const fmt   = v => String(v); // << definir antes de usar

      const rects = pairs.map(([u,val],i)=>{
        const h = Math.round((val/max)*H);
        const x = pad + i*(barW+gap), y = top + (H - h);
        const label = (u.length>16 ? u.slice(0,15)+'…' : u);
        return `
          <g>
            <rect class="bar" x="${x}" y="${y}" width="${barW}" height="${h}" rx="4"></rect>
            <text x="${x+barW/2}" y="${y-6}" text-anchor="middle" font-size="12" fill="#b574ff">${fmt(val)}</text>
            <text transform="translate(${x+barW/2},${top+H+30}) rotate(-35)"
                  text-anchor="end" font-size="12" fill="#fff" title="${u}">${label}</text>
          </g>`;
      }).join('');

      return `
        <div class="chart">
          <h4>Acciones por usuario (conteo)</h4>
          <svg class="bar-svg" viewBox="0 0 ${W} ${top+H+bottom}" width="${W}" height="${top+H+bottom}">
            ${rects}
          </svg>
        </div>`;
    };


    const renderBarsAvg = (pairs) => {
      const max = Math.max(...pairs.map(([,v])=>v), 1);
      const barW=42, gap=24, pad=48, top=24, H=220, bottom=80;
      const W = pad*2 + pairs.length*barW + (pairs.length-1)*gap;
      const rects = pairs.map(([u,val],i)=>{
        const h = Math.round((val/max)*H);
        const x = pad + i*(barW+gap), y = top + (H - h);
        const label = (u.length>16 ? u.slice(0,15)+'…' : u);
        return `
          <g>
            <rect class="bar" x="${x}" y="${y}" width="${barW}" height="${h}" rx="4"></rect>
            <text x="${x+barW/2}" y="${y-6}" text-anchor="middle" font-size="12" fill="#b574ff">${valText(val)}</text>
            <text transform="translate(${x+barW/2},${top+H+30}) rotate(-35)" text-anchor="end" font-size="12" fill="#fff" title="${u}">${label}</text>
          </g>`;
      }).join('');
      return `
        <div class="chart">
          <h4>Uso promedio por usuario (${unitText()})</h4>
          <svg class="bar-svg" viewBox="0 0 ${W} ${top+H+bottom}" width="${W}" height="${top+H+bottom}">
            ${rects}
          </svg>
        </div>`;
    };

    try {
      // 1) Conteo por usuario (transacciones)
      const trans = await fetchJSON('/api/reportes/filtros?fuente=transacciones');
      const counts = new Map();
      (trans.rows||[]).forEach(t=>{
        const u = t.usuario || '';
        if (u) counts.set(u, (counts.get(u)||0)+1);
      });
      const usuariosCount = [...counts.keys()];
      const entriesCount  = usuariosCount.map(u => [u, counts.get(u)||0]).sort((a,b)=>b[1]-a[1]);

      // 2) Minutos promedio por usuario (vista SQL)
      const minutosRaw = await (async()=>{
        try{
          const j = await fetchJSON('/api/reportes/tiempo-promedio');
          return j.data || j.rows || [];
        }catch{
          const j = await fetchJSON('/api/reportes/filtros?fuente=tiempo');
          return j.rows || [];
        }
      })();
      const minutos = new Map(); // minutos crudos desde la vista
      (minutosRaw||[]).forEach(r=>{
        const u = r.usuario || r.usuarioTxt || r.user || '';
        const m = Number(r.minutosPromedio ?? r.minutos ?? r.minutos_promedio);
        if (u && !isNaN(m)) minutos.set(u, m);
      });
      const usuarios = [...new Set([...counts.keys(), ...minutos.keys()])];
      const entriesMin = usuarios.map(u => [u, minutos.get(u) ?? 0]).sort((a,b)=>b[1]-a[1]);

      // 3) Layout con dos bloques
      modalBody.innerHTML = `
        <div id="wrap-count"></div>
        <div class="mini-toolbar" style="display:flex;gap:8px;align-items:center;margin:12px 0;">
          <span style="opacity:.8">Ver en:</span>
          <button class="u-btn" data-unit="min">min</button>
          <button class="u-btn active" data-unit="h">horas</button>
        </div>
        <div id="wrap-avg"></div>
      `;

      const wrapCount = modalBody.querySelector('#wrap-count');
      const wrapAvg   = modalBody.querySelector('#wrap-avg');

      // Render conteo
      wrapCount.innerHTML = renderBarsCount(entriesCount);

      // Render promedio (respeta unidad)
      const rerenderAvg = () => {
        const pairs = entriesMin.map(([u,m]) => [u, toUnit(m)]);
        wrapAvg.innerHTML = renderBarsAvg(pairs);
        // export del panel según unidad elegida (incluye conteo + promedio en la unidad elegida)
        const rows = usuarios
          .sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0))
          .map(u => [
            u,
            (counts.get(u)||0),
            (UNIT==='h' ? ((minutos.get(u)||0)/60).toFixed(1) : Math.round(minutos.get(u)||0))
          ]);
        showExportBar('uso', ['Usuario','Conteo', UNIT==='h' ? 'Horas promedio' : 'Minutos promedio'], rows);
      };
      rerenderAvg();

      // 4) Toggle de unidad (sólo afecta al promedio)
      modalBody.querySelectorAll('.u-btn').forEach(btn=>{
        btn.onclick = () => {
          UNIT = btn.dataset.unit;
          modalBody.querySelectorAll('.u-btn').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          rerenderAvg();
        };
      });
    } catch (err) {
      modalBody.innerHTML = `<div class="tip error">Error consultando uso: ${err.message}</div>`;
    }
  };

  // Exportar (usa lo agregado y permite seleccionar/descargar todo)
  actions.export = async () => {
    openModal('export', 'Exportar Reporte');
    // mapeo clave -> label de export
    const DEF = [
      ['accesos','Bitácora de Accesos'],
      ['trans','Bitácora de Transacciones'],
      ['usuarios','Usuarios del Sistema'],
      ['ultimas','Últimas Conexiones'],
      ['fallidos','Intentos fallidos de login'],
      ['uso','Promedio de uso'],
    ];

    modalBody.innerHTML = `
      <form id="formExport" class="export">
        ${DEF.map(([k,l])=>`
          <label class="check">
            <input type="checkbox" value="${k}" ${selectedForExport.has(k)?'checked':''}> <span>${l}</span>
          </label>`).join('')}
      </form>
      <div class="extra-actions">
        <button id="btnPDFAll" class="btn-primary">Exportar PDF</button>
        <button id="btnCSVAll" class="btn-outline">Exportar Excel (.csv)</button>
      </div>`;

    const esc = s => `"${String(s).replace(/"/g,'""')}"`;

    async function getBlock(key){
      switch(key){
        case 'accesos': {
          const d = await fetchJSON('/api/reportes/filtros?fuente=accesos');
          const headers = ['Usuario','Fecha/Hora','Acción','Estado','Motivo'];
          const rows = (d.rows||[]).map(a=>[a.usuario||a.usuarioTxt||'',fmtDate(a.fechaHora),a.accion||'',(a.estadoUsuario||'-'),a.motivo||'']);
          return { title:'Bitácora de Accesos', headers, rows };
        }
        case 'trans': {
          const d = await fetchJSON('/api/reportes/filtros?fuente=transacciones');
          const headers = ['Fecha/Hora','Usuario','Entidad','Operación','Id afectado'];
          const rows = (d.rows||[]).map(t=>[fmtDate(t.fechaHora),t.usuario,t.entidad,t.operacion,t.idAfectado??'']);
          return { title:'Bitácora de Transacciones', headers, rows };
        }
        case 'usuarios': {
          const d = await fetchJSON('/api/reportes/filtros?fuente=usuarios');
          const headers = [
            'ID','Usuario','Nombre','Correo','Rol','Estado',
            'ÚLT. CAMBIO PWD','Intentos','Must reset','Creación'
          ];
          const rows = (d.rows||[]).map(u=>[
            u.idUsuario,
            u.usuario,
            u.nombreCompleto,
            u.correo,
            u.rol,
            (u.estado || ''),
            fmtDate(u.ultimoCambioPwd),          
            (u.intentosFallidos ?? 0),
            (u.must_reset ? 'Sí' : 'No'),
            fmtDate(u.fechaCreacion)
          ]);
          return { title:'Usuarios del Sistema', headers, rows };
        }
        case 'ultimas': {
          const d = await fetchJSON('/api/reportes/filtros?fuente=accesos');
          const okRow = r => (r.exito===true||r.exito===1||r.exito==='1'||(!r.motivo && String(r.accion||'').toLowerCase().includes('login')));
          const map = new Map();
          (d.rows||[]).forEach(r=>{
            const u = r.usuario || r.usuarioTxt || '';
            if(!u || !okRow(r)) return;
            const f = new Date(r.fechaHora);
            if(!map.has(u)||f>map.get(u)) map.set(u,f);
          });
          const headers = ['Usuario','Último acceso'];
          const rows = [...map.entries()].sort((a,b)=>b[1]-a[1]).map(([u,dt])=>[u,dt.toLocaleString()]);
          return { title:'Últimas Conexiones', headers, rows };
        }
        case 'fallidos': {
          const d = await fetchJSON('/api/reportes/filtros?fuente=accesos');
          const headers = ['Usuario','Fecha/Hora','IP/Dispositivo','Motivo'];
          const rows = (d.rows||[]).filter(r=> (r.exito===false||r.exito===0||r.exito==='0'))
              .map(x=>[x.usuario||x.usuarioTxt||'',fmtDate(x.fechaHora),x.ip||x.dispositivo||'-',x.motivo||'credenciales inválidas']);
          return { title:'Intentos fallidos de login', headers, rows };
        }
        case 'uso': {
          const d1 = await fetchJSON('/api/reportes/filtros?fuente=transacciones');
          const counts = new Map();
          (d1.rows||[]).forEach(t=>{ const u=t.usuario||''; if(u) counts.set(u,(counts.get(u)||0)+1); });

          const d2 = await (async()=>{
            try{ const j = await fetchJSON('/api/reportes/tiempo-promedio'); return j.data||j.rows||[]; }
            catch{ const j = await fetchJSON('/api/reportes/filtros?fuente=tiempo'); return j.rows||[]; }
          })();
          const minutos = new Map();
          (d2||[]).forEach(r=>{
            const u = r.usuario || r.usuarioTxt || r.user || '';
            const m = Number(r.minutosPromedio ?? r.minutos ?? r.minutos_promedio);
            if(u && !isNaN(m)) minutos.set(u, m);
          });

          const usuarios = new Set([...counts.keys(), ...minutos.keys()]);
          const headers = ['Usuario','Conteo','Promedio (min)','Promedio (h)'];
          const rows = [...usuarios]
            .sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0))
            .map(u=>{
              const m = minutos.get(u) ?? 0;
              const h = (m/60).toFixed(1);
              return [u, (counts.get(u)||0), Math.round(m), h];
            });

          return { title:'Promedio de uso', headers, rows };
        }
      }
      return { title:key, headers:[], rows:[] };
    }

    $('#btnPDFAll')?.addEventListener('click', async ()=>{
      const sel = $$('#formExport input[type=checkbox]:checked').map(i=>i.value);
      if (!sel.length) { alert('Selecciona al menos una sección'); return; }
      const blocks = await Promise.all(sel.map(getBlock));
      const html = blocks.map(b=>`
        <h2>${b.title}</h2>
        <table style="border-collapse:collapse;width:100%">
          <thead><tr>${b.headers.map(h=>`<th style="border:1px solid #999;padding:8px;background:#eee">${h}</th>`).join('')}</tr></thead>
          <tbody>${b.rows.map(r=>`<tr>${r.map(c=>`<td style="border:1px solid #999;padding:8px">${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`).join('<hr/>');
      const w=window.open('','_blank');
      w.document.write(`<html><head><title>Reporte</title><style>body{font-family:Inter,Arial;margin:18px}</style></head><body>${html}</body></html>`);
      w.document.close(); w.focus(); w.print();
    });

    $('#btnCSVAll')?.addEventListener('click', async ()=>{
      const sel = $$('#formExport input[type=checkbox]:checked').map(i=>i.value);
      if (!sel.length) { alert('Selecciona al menos una sección'); return; }
      const blocks = await Promise.all(sel.map(getBlock));
      const csv = blocks.map(b=>[
        b.title,
        b.headers.join(','),
        ...b.rows.map(r=> r.map(esc).join(','))
      ].join('\n')).join('\n\n');
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
      const url  = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href:url, download:'reporte.csv' });
      a.click(); URL.revokeObjectURL(url);
    });
  };

  // ---------- wire de tarjetas ----------
  $$('.card[data-modal]').forEach(card=>{
    card.addEventListener('click', ()=>{
      const key = card.dataset.modal;
      const fn  = actions[key];
      if (typeof fn === 'function') fn();
    });
  });

  // La tarjeta "Filtros de Búsqueda" es un <a> hacia otra página (no se intercepta).
});
