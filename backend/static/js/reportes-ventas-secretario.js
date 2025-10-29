// ========== Obtener CSRF token ==========
function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') return value;
  }
  return '';
}
const csrftoken = getCsrfToken();

// ========== Variables globales ==========
let ventasData = [];
let inventarioData = { stockCritico: 0, entradas30: 0, salidas30: 0 };
let topProductos = [];
let ingresosMensuales = [];
let ingresosAnuales = [];

let chartVentas, chartIngresos;
let reportesSeleccionados = new Set();

// ========== Inicialización ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('📊 Módulo de Reportes Secretaria - Inicializando...');
  console.log('🔍 Verificando URLs de API:');
  console.log('  - API_REPORTE_VENTAS:', window.API_REPORTE_VENTAS || 'NO DEFINIDA');
  console.log('  - API_REPORTE_INVENTARIO:', window.API_REPORTE_INVENTARIO || 'NO DEFINIDA');
  console.log('  - API_REPORTE_MAS_VENDIDOS:', window.API_REPORTE_MAS_VENDIDOS || 'NO DEFINIDA');
  console.log('  - API_REPORTE_INGRESOS:', window.API_REPORTE_INGRESOS || 'NO DEFINIDA');
  
  const btnAplicar = document.getElementById('btnAplicar');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const btnGenerarReporte = document.getElementById('btnGenerarReporte');

  // Configurar fechas por defecto
  const hoy = new Date();
  const hace30Dias = new Date(hoy);
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  document.getElementById('fechaDesde').valueAsDate = hace30Dias;
  document.getElementById('fechaHasta').valueAsDate = hoy;
  
  console.log('📅 Rango de fechas:', {desde: hace30Dias.toISOString().split('T')[0], hasta: hoy.toISOString().split('T')[0]});

  btnAplicar.addEventListener('click', aplicarFiltros);
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      actualizarGraficoIngresos(btn.dataset.tab);
    });
  });

  document.querySelectorAll('.btn-add-report').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reporteId = btn.dataset.reporte;
      toggleReporteSeleccionado(reporteId, btn);
    });
  });

  btnGenerarReporte.addEventListener('click', abrirModalGenerarReporte);

  // Cargar datos iniciales
  cargarFiltros();
  cargarDatosIniciales();
});

// ========== Cargar opciones de filtros ==========
async function cargarFiltros() {
  // Cargar categorías desde la API
  try {
    const response = await fetch('/api/categorias', {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const result = await response.json();
    
    if (result.ok && result.data) {
      const selectCategoria = document.getElementById('filtroCategoria');
      selectCategoria.innerHTML = '<option value="">Todas las categorías</option>';
      
      result.data.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.idCategoria;
        option.textContent = cat.nombre;
        selectCategoria.appendChild(option);
      });
      
      console.log(`✅ Categorías cargadas: ${result.data.length}`);
    }
  } catch (error) {
    console.error('❌ Error al cargar categorías:', error);
  }
  
  // Los usuarios se dejan como están (Admin/Secretario) ya que son roles fijos
}

// ========== Cargar datos desde APIs ==========
async function cargarDatosIniciales() {
  console.log('🔄 Cargando datos iniciales...');
  
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;
  
  console.log('📅 Parámetros de búsqueda:', {desde, hasta});
  
  await Promise.all([
    cargarVentasPorFecha(desde, hasta),
    cargarInventario(),
    cargarTopProductos(desde, hasta),
    cargarIngresosTotales(desde, hasta)
  ]);
  
  console.log('✅ Todas las APIs cargadas, inicializando gráficos...');
  inicializarGraficos();
}

async function cargarVentasPorFecha(desde, hasta, idUsuario = null, idCategoria = null) {
  try {
    console.log('📥 Cargando ventas por fecha...');
    
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    if (idUsuario) params.append('idUsuario', idUsuario);
    if (idCategoria) params.append('idCategoria', idCategoria);
    
    const url = `${window.API_REPORTE_VENTAS}?${params.toString()}`;
    console.log('🔗 URL completa:', url);
    
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    console.log('📡 Response status:', response.status);
    const result = await response.json();
    console.log('📦 Datos recibidos:', result);
    
    if (result.ok && result.data) {
      ventasData = result.data.map(v => ({
        fecha: v.fecha,
        ventas: parseFloat(v.total || v.ventas || 0)
      }));
      
      console.log(`✅ Ventas cargadas: ${ventasData.length} registros`);
      if (ventasData.length > 0) {
        console.log('🔍 Primera venta:', ventasData[0]);
      }
      actualizarGraficoVentas();
    } else {
      console.warn('⚠️ No se recibieron datos de ventas o ok=false');
    }
  } catch (error) {
    console.error('❌ Error al cargar ventas:', error);
  }
}

async function cargarInventario() {
  try {
    console.log('📥 Cargando inventario...');
    
    const url = window.API_REPORTE_INVENTARIO;
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const result = await response.json();
    
    if (result.ok && result.data) {
      // El endpoint devuelve una lista de productos, necesitamos calcular los totales
      const productos = result.data;
      
      // Contar productos en stock crítico
      const stockCritico = productos.filter(p => p.critico === 1 || p.stockActual <= p.stockMinimo).length;
      
      // Sumar totales de entradas y salidas
      const entradas30 = productos.reduce((sum, p) => sum + (p.entradas30 || 0), 0);
      const salidas30 = productos.reduce((sum, p) => sum + (p.salidas30 || 0), 0);
      
      inventarioData = {
        stockCritico: stockCritico,
        entradas30: entradas30,
        salidas30: salidas30
      };
      
      console.log('✅ Inventario cargado:', inventarioData);
      actualizarDatosInventario();
    }
  } catch (error) {
    console.error('❌ Error al cargar inventario:', error);
  }
}

async function cargarTopProductos(desde, hasta, idUsuario = null, idCategoria = null) {
  try {
    console.log('📥 Cargando top productos...');
    
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    if (idUsuario) params.append('idUsuario', idUsuario);
    if (idCategoria) params.append('idCategoria', idCategoria);
    
    const url = `${window.API_REPORTE_MAS_VENDIDOS}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const result = await response.json();
    
    if (result.ok && result.data) {
      topProductos = result.data.map(p => ({
        nombre: p.nombre,
        codigo: p.codigo,
        cantidad: parseInt(p.cantidad || p.totalvendido || 0),
        ingresos: parseFloat(p.ingresos || p.totalingresos || 0)
      }));
      
      console.log(`✅ Top productos cargados: ${topProductos.length} registros`);
      actualizarTopProductos();
    }
  } catch (error) {
    console.error('❌ Error al cargar top productos:', error);
  }
}

async function cargarIngresosTotales(desde, hasta) {
  try {
    console.log('📥 Cargando ingresos totales...');
    
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    
    const url = `${window.API_REPORTE_INGRESOS}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const result = await response.json();
    
    if (result.ok && result.data) {
      // Separar en mensuales y anuales
      ingresosMensuales = result.data
        .filter(i => i.mes)
        .map(i => ({
          mes: i.mes,
          ingresos: parseFloat(i.total || i.ingresos || 0)
        }));
      
      ingresosAnuales = result.data
        .filter(i => i.anio)
        .map(i => ({
          año: parseInt(i.anio),
          ingresos: parseFloat(i.total || i.ingresos || 0)
        }));
      
      console.log(`✅ Ingresos cargados: ${ingresosMensuales.length} mensuales, ${ingresosAnuales.length} anuales`);
      actualizarGraficoIngresos('mensual');
    }
  } catch (error) {
    console.error('❌ Error al cargar ingresos:', error);
  }
}

// ========== Aplicar filtros ==========
function aplicarFiltros() {
  const desde = document.getElementById('fechaDesde').value;
  const hasta = document.getElementById('fechaHasta').value;
  const idUsuario = document.getElementById('filtroUsuario').value || null;
  const idCategoria = document.getElementById('filtroCategoria').value || null;

  cargarVentasPorFecha(desde, hasta, idUsuario, idCategoria);
  cargarTopProductos(desde, hasta, idUsuario, idCategoria);
  cargarIngresosTotales(desde, hasta);
}

// ========== Inicializar gráficos ==========
function inicializarGraficos() {
  const ctxVentas = document.getElementById('chartVentas').getContext('2d');
  chartVentas = new Chart(ctxVentas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Ventas',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: { callback: value => `$${value.toFixed(2)}` }
        }
      }
    }
  });

  const ctxIngresos = document.getElementById('chartIngresos').getContext('2d');
  chartIngresos = new Chart(ctxIngresos, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Ingresos',
        data: [],
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgb(153, 102, 255)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: { 
          callbacks: { 
            label: context => `Ingresos: $${context.parsed.y.toFixed(2)}` 
          } 
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: { callback: value => `$${value.toFixed(2)}` }
        }
      }
    }
  });
}

// ========== Actualizar gráficos ==========
function actualizarGraficoVentas() {
  if (!chartVentas) return;
  
  chartVentas.data.labels = ventasData.map(v => 
    new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  );
  chartVentas.data.datasets[0].data = ventasData.map(v => v.ventas);
  chartVentas.update();
}

function actualizarGraficoIngresos(tipo) {
  if (!chartIngresos) return;
  
  const datos = tipo === 'mensual' ? ingresosMensuales : ingresosAnuales;
  
  chartIngresos.data.labels = datos.map(d => tipo === 'mensual' ? d.mes : d.año);
  chartIngresos.data.datasets[0].data = datos.map(d => d.ingresos);
  chartIngresos.update();
}

function actualizarDatosInventario() {
  document.getElementById('stockCritico').textContent = inventarioData.stockCritico;
  document.getElementById('entradas30').textContent = inventarioData.entradas30;
  document.getElementById('salidas30').textContent = inventarioData.salidas30;
}

function actualizarTopProductos() {
  const lista = document.getElementById('topProductsList');
  
  if (topProductos.length === 0) {
    lista.innerHTML = '<p style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">No hay datos disponibles</p>';
    return;
  }
  
  lista.innerHTML = topProductos.map((p, i) => `
    <div class="top-product-item">
      <div class="product-rank">${i + 1}</div>
      <div class="product-info">
        <div class="product-name">${p.nombre}</div>
        <div class="product-code">${p.codigo}</div>
      </div>
      <div class="product-stats">
        <div class="stat"><strong>${p.cantidad}</strong> unidades</div>
        <div class="stat income">$${p.ingresos.toFixed(2)}</div>
      </div>
    </div>
  `).join('');
}

// ========== Gestión de reportes seleccionados ==========
function toggleReporteSeleccionado(reporteId, btn) {
  if (reportesSeleccionados.has(reporteId)) {
    reportesSeleccionados.delete(reporteId);
    btn.classList.remove('selected');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span>Agregar al Reporte</span>
    `;
  } else {
    reportesSeleccionados.add(reporteId);
    btn.classList.add('selected');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Agregado</span>
    `;
  }
}

function abrirModalGenerarReporte() {
  if (reportesSeleccionados.size === 0) {
    alert('Por favor selecciona al menos un reporte para generar');
    return;
  }

  const modal = document.getElementById('modalGenerarReporte');
  const checklist = document.getElementById('reporteChecklist');
  
  const nombresReportes = {
    'ventas': 'Ventas por Fecha',
    'inventario': 'Inventario Actual',
    'productos': 'Top 10 Productos Más Vendidos',
    'ingresos': 'Ingresos Totales'
  };
  
  checklist.innerHTML = '<h3 style="margin-top: 0;">Reportes seleccionados:</h3>' +
    Array.from(reportesSeleccionados)
      .map(id => `<div style="padding: 10px; margin: 5px 0; background: rgba(255,255,255,0.1); border-radius: 6px;">✓ ${nombresReportes[id]}</div>`)
      .join('');
  
  modal.style.display = 'flex';
}

function cerrarModalReporte() {
  document.getElementById('modalGenerarReporte').style.display = 'none';
}

// ========== Exportar reportes ==========
async function exportarPDF() {
  if (typeof jspdf === 'undefined') {
    alert('La librería jsPDF no está cargada');
    return;
  }
  
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Reporte de Ventas y Productos', 20, 20);
  
  let y = 40;
  
  if (reportesSeleccionados.has('ventas')) {
    doc.setFontSize(14);
    doc.text('Ventas por Fecha', 20, y);
    y += 10;
    doc.setFontSize(10);
    ventasData.forEach(v => {
      doc.text(`${v.fecha}: $${v.ventas.toFixed(2)}`, 20, y);
      y += 7;
    });
    y += 10;
  }
  
  if (reportesSeleccionados.has('inventario')) {
    doc.setFontSize(14);
    doc.text('Inventario Actual', 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Stock Crítico: ${inventarioData.stockCritico}`, 20, y);
    y += 7;
    doc.text(`Entradas (30 días): ${inventarioData.entradas30}`, 20, y);
    y += 7;
    doc.text(`Salidas (30 días): ${inventarioData.salidas30}`, 20, y);
    y += 10;
  }
  
  if (reportesSeleccionados.has('productos')) {
    doc.setFontSize(14);
    doc.text('Top 10 Productos', 20, y);
    y += 10;
    doc.setFontSize(10);
    topProductos.forEach((p, i) => {
      doc.text(`${i+1}. ${p.nombre} - ${p.cantidad} unidades - $${p.ingresos.toFixed(2)}`, 20, y);
      y += 7;
    });
  }
  
  doc.save('reporte-ventas.pdf');
  cerrarModalReporte();
}

async function exportarExcel() {
  if (typeof ExcelJS === 'undefined') {
    alert('La librería ExcelJS no está cargada');
    return;
  }
  
  const workbook = new ExcelJS.Workbook();
  
  if (reportesSeleccionados.has('ventas')) {
    const sheet = workbook.addWorksheet('Ventas');
    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Ventas', key: 'ventas', width: 15 }
    ];
    sheet.addRows(ventasData);
  }
  
  if (reportesSeleccionados.has('productos')) {
    const sheet = workbook.addWorksheet('Top Productos');
    sheet.columns = [
      { header: 'Producto', key: 'nombre', width: 30 },
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Cantidad', key: 'cantidad', width: 15 },
      { header: 'Ingresos', key: 'ingresos', width: 15 }
    ];
    sheet.addRows(topProductos);
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reporte-ventas.xlsx';
  a.click();
  
  cerrarModalReporte();
}
