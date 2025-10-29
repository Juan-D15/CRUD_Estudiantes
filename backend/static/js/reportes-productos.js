// Variables globales
let ventasData = [];
let inventarioData = { stockCritico: 0, entradas30: 0, salidas30: 0 };
let topProductos = [];
let ingresosMensuales = [];
let ingresosAnuales = [];
let chartVentas, chartIngresos;
let reportesSeleccionados = new Set(); // Cache de reportes seleccionados

// Obtener CSRF token
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
const csrftoken = getCookie('csrftoken');

document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 MÓDULO DE REPORTES - Iniciando...');
  console.log('🔍 Verificando URLs de API:');
  console.log('  - API_REPORTE_VENTAS:', window.API_REPORTE_VENTAS || 'NO DEFINIDA');
  console.log('  - API_REPORTE_INVENTARIO:', window.API_REPORTE_INVENTARIO || 'NO DEFINIDA');
  console.log('  - API_REPORTE_MAS_VENDIDOS:', window.API_REPORTE_MAS_VENDIDOS || 'NO DEFINIDA');
  console.log('  - API_REPORTE_INGRESOS:', window.API_REPORTE_INGRESOS || 'NO DEFINIDA');
  
  const btnAplicar = document.getElementById('btnAplicar');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const btnGenerarReporte = document.getElementById('btnGenerarReporte');
  
  console.log('🔍 Verificando elementos del DOM:');
  console.log('  - btnAplicar:', btnAplicar ? 'OK' : '❌ FALTA');
  console.log('  - tabButtons:', tabButtons.length > 0 ? `OK (${tabButtons.length})` : '❌ FALTA');
  console.log('  - btnGenerarReporte:', btnGenerarReporte ? 'OK' : '❌ FALTA');
  console.log('  - fechaDesde:', document.getElementById('fechaDesde') ? 'OK' : '❌ FALTA');
  console.log('  - fechaHasta:', document.getElementById('fechaHasta') ? 'OK' : '❌ FALTA');

  // Configurar fechas por defecto
  const hoy = new Date();
  const hace30Dias = new Date(hoy);
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  document.getElementById('fechaDesde').valueAsDate = hace30Dias;
  document.getElementById('fechaHasta').valueAsDate = hoy;
  
  console.log('📅 Fechas configuradas por defecto:');
  console.log('  - Desde:', hace30Dias.toISOString().split('T')[0]);
  console.log('  - Hasta:', hoy.toISOString().split('T')[0]);

  btnAplicar.addEventListener('click', aplicarFiltros);
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const modo = btn.dataset.tab;
      
      // Si cambiamos a anual y no tenemos datos, cargarlos
      if (modo === 'anual' && ingresosAnuales.length === 0) {
        await cargarIngresosTotales('anual');
      } else {
        actualizarGraficoIngresos(modo);
      }
    });
  });

  // Event listeners para botones de agregar al reporte
  document.querySelectorAll('.btn-add-report').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reporteId = btn.dataset.reporte;
      toggleReporteSeleccionado(reporteId, btn);
    });
  });

  // Event listener para botón generar reporte
  btnGenerarReporte.addEventListener('click', abrirModalGenerarReporte);

  // Inicializar gráficos vacíos
  inicializarGraficos();
  
  // Cargar datos desde la API
  cargarDatosIniciales();
});

function inicializarGraficos() {
  // Gráfico de Ventas por Fecha
  const ctxVentas = document.getElementById('chartVentas').getContext('2d');
  chartVentas = new Chart(ctxVentas, {
    type: 'line',
    data: {
      labels: ventasData.map(v => new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })),
      datasets: [{
        label: 'Ventas',
        data: ventasData.map(v => v.ventas),
        borderColor: '#34d399',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(20, 20, 25, 0.95)',
          titleColor: '#fff',
          bodyColor: '#34d399',
          borderColor: 'rgba(52, 211, 153, 0.3)',
          borderWidth: 1,
          padding: 12,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: 'rgba(255,255,255,0.7)'
          }
        },
        y: {
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: 'rgba(255,255,255,0.7)',
            callback: function(value) {
              return 'Q ' + value.toFixed(0);
            }
          }
        }
      }
    }
  });

  // Gráfico de Ingresos (inicialmente mensual)
  const ctxIngresos = document.getElementById('chartIngresos').getContext('2d');
  chartIngresos = new Chart(ctxIngresos, {
    type: 'bar',
    data: {
      labels: ingresosMensuales.map(i => i.mes),
      datasets: [{
        label: 'Ingresos',
        data: ingresosMensuales.map(i => i.ingresos),
        backgroundColor: 'rgba(147, 197, 253, 0.3)',
        borderColor: '#93c5fd',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(20, 20, 25, 0.95)',
          titleColor: '#fff',
          bodyColor: '#93c5fd',
          borderColor: 'rgba(147, 197, 253, 0.3)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return 'Q ' + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: 'rgba(255,255,255,0.7)'
          }
        },
        y: {
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: 'rgba(255,255,255,0.7)',
            callback: function(value) {
              return 'Q ' + value.toFixed(0);
            }
          }
        }
      }
    }
  });
}

// ========== FUNCIONES PARA CARGAR DATOS DESDE LA API ==========

async function cargarDatosIniciales() {
  console.log('📊 Cargando datos de reportes desde la API...');
  
  const fechaDesde = document.getElementById('fechaDesde').value;
  const fechaHasta = document.getElementById('fechaHasta').value;
  
  try {
    await Promise.all([
      cargarVentasPorFecha(fechaDesde, fechaHasta),
      cargarInventarioActual(),
      cargarTopProductos(10, fechaDesde, fechaHasta),
      cargarIngresosTotales('mensual')
    ]);
    
    console.log('✅ Todos los datos cargados correctamente');
  } catch (error) {
    console.error('❌ Error al cargar datos iniciales:', error);
    mostrarError('Error al cargar los datos de reportes');
  }
}

async function cargarVentasPorFecha(desde, hasta, idUsuario = null, idCategoria = null) {
  try {
    console.log('📥 Iniciando carga de ventas...');
    console.log('   Fechas:', { desde, hasta });
    
    const params = new URLSearchParams();
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    if (idUsuario) params.append('idUsuario', idUsuario);
    if (idCategoria) params.append('idCategoria', idCategoria);
    
    const url = `${window.API_REPORTE_VENTAS}?${params.toString()}`;
    console.log('🔍 Consultando ventas:', url);
    
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    console.log('📡 Respuesta de ventas recibida:', response.status);
    
    const result = await response.json();
    console.log('📊 Datos de ventas:', result);
    
    if (result.ok && result.data) {
      ventasData = result.data.map(v => ({
        fecha: v.fecha,
        ventas: parseFloat(v.total || v.ventas || 0)
      }));
      
      console.log(`✅ Ventas cargadas: ${ventasData.length} registros`);
      actualizarGraficoVentas();
    } else {
      console.warn('⚠️ No se recibieron datos de ventas o ok=false');
    }
  } catch (error) {
    console.error('❌ Error al cargar ventas:', error);
    console.error('❌ Detalles del error:', error.message, error.stack);
  }
}

async function cargarInventarioActual(soloCriticos = false) {
  try {
    const url = `${window.API_REPORTE_INVENTARIO}?soloCriticos=${soloCriticos ? '1' : '0'}`;
    console.log('🔍 Consultando inventario:', url);
    
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const result = await response.json();
    
    if (result.ok && result.data) {
      // Calcular estadísticas del inventario
      const productos = result.data;
      
      // Stock crítico: productos con stock < stockMinimo
      const stockCritico = productos.filter(p => 
        p.stockActual < (p.stockMinimo || 10)
      ).length;
      
      // Entradas y salidas de los últimos 30 días (estas vendrán de la API)
      inventarioData = {
        stockCritico: stockCritico,
        entradas30: productos.reduce((sum, p) => sum + (p.entradas30 || 0), 0),
        salidas30: productos.reduce((sum, p) => sum + (p.salidas30 || 0), 0)
      };
      
      console.log('✅ Inventario cargado:', inventarioData);
      actualizarInventarioUI();
    }
  } catch (error) {
    console.error('❌ Error al cargar inventario:', error);
  }
}

async function cargarTopProductos(topN = 10, desde = null, hasta = null) {
  try {
    const params = new URLSearchParams();
    params.append('topN', topN);
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    
    const url = `${window.API_REPORTE_MAS_VENDIDOS}?${params.toString()}`;
    console.log('🔍 Consultando top productos:', url);
    
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const result = await response.json();
    
    if (result.ok && result.data) {
      topProductos = result.data.map(p => ({
        nombre: p.nombre || p.nombreProducto,
        codigo: p.codigo || p.codigoProducto,
        cantidad: parseInt(p.cantidad || p.cantidadVendida || 0),
        ingresos: parseFloat(p.ingresos || p.totalIngresos || 0)
      }));
      
      console.log(`✅ Top productos cargados: ${topProductos.length} productos`);
      actualizarTopProductosUI();
    }
  } catch (error) {
    console.error('❌ Error al cargar top productos:', error);
  }
}

async function cargarIngresosTotales(modo = 'mensual', anio = null) {
  try {
    console.log('📥 Iniciando carga de ingresos...');
    console.log('   Modo:', modo, 'Año:', anio);
    
    const params = new URLSearchParams();
    params.append('modo', modo);
    if (anio) params.append('anio', anio);
    
    const url = `${window.API_REPORTE_INGRESOS}?${params.toString()}`;
    console.log('🔍 Consultando ingresos:', url);
    
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    console.log('📡 Respuesta de ingresos recibida:', response.status);
    
    const result = await response.json();
    console.log('📊 Datos de ingresos:', result);
    
    if (result.ok && result.data) {
      if (modo === 'mensual') {
        ingresosMensuales = result.data.map(i => ({
          mes: i.mes || i.periodo,
          ingresos: parseFloat(i.ingresos || i.total || 0)
        }));
        console.log(`✅ Ingresos mensuales cargados: ${ingresosMensuales.length} meses`);
      } else {
        ingresosAnuales = result.data.map(i => ({
          año: parseInt(i.anio || i.año || i.periodo),
          ingresos: parseFloat(i.ingresos || i.total || 0)
        }));
        console.log(`✅ Ingresos anuales cargados: ${ingresosAnuales.length} años`);
      }
      
      actualizarGraficoIngresos(modo);
    } else {
      console.warn('⚠️ No se recibieron datos de ingresos o ok=false');
    }
  } catch (error) {
    console.error('❌ Error al cargar ingresos:', error);
    console.error('❌ Detalles del error:', error.message, error.stack);
  }
}

// Funciones para actualizar la UI con los datos cargados

function actualizarGraficoVentas() {
  if (ventasData.length === 0) {
    console.log('⚠️ No hay datos de ventas para mostrar');
    return;
  }
  
  chartVentas.data.labels = ventasData.map(v => 
    new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  );
  chartVentas.data.datasets[0].data = ventasData.map(v => v.ventas);
  chartVentas.update();
}

function actualizarInventarioUI() {
  document.getElementById('stockCritico').textContent = inventarioData.stockCritico;
  document.getElementById('entradas30').textContent = inventarioData.entradas30;
  document.getElementById('salidas30').textContent = inventarioData.salidas30;
}

function actualizarTopProductosUI() {
  const container = document.getElementById('topProductsList');
  
  if (topProductos.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">No hay datos disponibles</p>';
    return;
  }
  
  container.innerHTML = '';
  topProductos.forEach(producto => {
    const item = document.createElement('div');
    item.className = 'top-product-item';
    item.innerHTML = `
      <div class="top-product-info">
        <div class="top-product-name">${producto.nombre}</div>
        <div class="top-product-code">${producto.codigo}</div>
      </div>
      <div class="top-product-stats">
        <div class="top-product-qty">${producto.cantidad}</div>
        <div class="top-product-revenue">Q ${producto.ingresos.toFixed(2)}</div>
      </div>
    `;
    container.appendChild(item);
  });
}

function actualizarGraficoIngresos(modo) {
  let labels, data;
  
  if (modo === 'mensual') {
    labels = ingresosMensuales.map(i => i.mes);
    data = ingresosMensuales.map(i => i.ingresos);
  } else {
    labels = ingresosAnuales.map(i => i.año);
    data = ingresosAnuales.map(i => i.ingresos);
  }

  chartIngresos.data.labels = labels;
  chartIngresos.data.datasets[0].data = data;
  chartIngresos.update();
}

async function aplicarFiltros() {
  const fechaDesde = document.getElementById('fechaDesde').value;
  const fechaHasta = document.getElementById('fechaHasta').value;
  const usuario = document.getElementById('filtroUsuario').value;
  const categoria = document.getElementById('filtroCategoria').value;

  console.log('🔍 Aplicando filtros:', { fechaDesde, fechaHasta, usuario, categoria });
  
  mostrarNotificacion('Aplicando filtros...');
  
  try {
    // Recargar datos con los filtros aplicados
    await Promise.all([
      cargarVentasPorFecha(fechaDesde, fechaHasta, usuario || null, categoria || null),
      cargarTopProductos(10, fechaDesde, fechaHasta)
    ]);
    
    mostrarNotificacion('Filtros aplicados correctamente');
  } catch (error) {
    console.error('❌ Error al aplicar filtros:', error);
    mostrarError('Error al aplicar los filtros');
  }
}

function toggleReporteSeleccionado(reporteId, btn) {
  if (reportesSeleccionados.has(reporteId)) {
    reportesSeleccionados.delete(reporteId);
    btn.classList.remove('added');
    mostrarNotificacion('Reporte removido de la selección');
  } else {
    reportesSeleccionados.add(reporteId);
    btn.classList.add('added');
    mostrarNotificacion('Reporte agregado a la selección');
  }
}

function abrirModalGenerarReporte() {
  if (reportesSeleccionados.size === 0) {
    mostrarError('Debes agregar al menos un reporte antes de generar');
    return;
  }

  const modal = document.getElementById('modalGenerarReporte');
  const checklist = document.getElementById('reporteChecklist');
  
  // Mapeo de IDs a nombres
  const nombresReportes = {
    'ventas': 'Ventas por Fecha',
    'inventario': 'Inventario Actual',
    'productos': 'Top 10 Productos Más Vendidos',
    'ingresos': 'Ingresos Totales'
  };

  // Generar checklist
  checklist.innerHTML = '';
  reportesSeleccionados.forEach(id => {
    const item = document.createElement('div');
    item.className = 'checklist-item';
    item.innerHTML = `
      <input type="checkbox" id="check-${id}" checked />
      <label for="check-${id}">${nombresReportes[id]}</label>
    `;
    checklist.appendChild(item);
  });

  modal.style.display = 'flex';
}

function cerrarModalReporte() {
  document.getElementById('modalGenerarReporte').style.display = 'none';
}

function exportarPDF() {
  const checksMarcados = Array.from(document.querySelectorAll('#reporteChecklist input[type="checkbox"]:checked'));
  
  if (checksMarcados.length === 0) {
    mostrarError('Debes seleccionar al menos un reporte');
    return;
  }

  const reportesAExportar = checksMarcados.map(check => {
    const id = check.id.replace('check-', '');
    return id;
  });

  try {
    mostrarNotificacion(`Generando PDF con ${reportesAExportar.length} reporte(s)...`);
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPos = 20;

    // Título
    doc.setFontSize(20);
    doc.text('Reporte de Productos', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(12);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 105, yPos, { align: 'center' });
    yPos += 15;

    // Mapeo de IDs a nombres y datos
    const nombresReportes = {
      'ventas': 'Ventas por Fecha',
      'inventario': 'Inventario Actual',
      'productos': 'Top 10 Productos Más Vendidos',
      'ingresos': 'Ingresos Totales'
    };

    reportesAExportar.forEach(reporteId => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(16);
      doc.text(nombresReportes[reporteId], 105, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(10);
      doc.setDrawColor(100, 100, 100);
      doc.line(20, yPos, 190, yPos);
      yPos += 5;

      // Generar contenido según el tipo de reporte
      switch(reporteId) {
        case 'ventas':
          yPos = agregarReporteVentas(doc, yPos);
          break;
        case 'inventario':
          yPos = agregarReporteInventario(doc, yPos);
          break;
        case 'productos':
          yPos = agregarReporteProductos(doc, yPos);
          break;
        case 'ingresos':
          yPos = agregarReporteIngresos(doc, yPos);
          break;
      }

      yPos += 10;
    });

    // Guardar PDF
    doc.save(`reporte-productos-${new Date().getTime()}.pdf`);
    
    setTimeout(() => {
      mostrarNotificacion('PDF generado exitosamente');
      cerrarModalReporte();
    }, 500);

  } catch (error) {
    console.error('Error al generar PDF:', error);
    mostrarError('Error al generar el PDF');
  }
}

async function exportarExcel() {
  const checksMarcados = Array.from(document.querySelectorAll('#reporteChecklist input[type="checkbox"]:checked'));
  
  if (checksMarcados.length === 0) {
    mostrarError('Debes seleccionar al menos un reporte');
    return;
  }

  const reportesAExportar = checksMarcados.map(check => {
    const id = check.id.replace('check-', '');
    return id;
  });

  try {
    mostrarNotificacion(`Generando Excel con ${reportesAExportar.length} reporte(s)...`);
    
    const workbook = new ExcelJS.Workbook();
    
    // Mapeo de IDs a nombres
    const nombresReportes = {
      'ventas': 'Ventas por Fecha',
      'inventario': 'Inventario Actual',
      'productos': 'Top 10 Productos Más Vendidos',
      'ingresos': 'Ingresos Totales'
    };

    // Crear una hoja para cada reporte
    reportesAExportar.forEach(reporteId => {
      const worksheet = workbook.addWorksheet(nombresReportes[reporteId]);
      
      // Aplicar estilos al encabezado
      worksheet.columns = [
        { header: 'Título', key: 'titulo', width: 40 },
        { header: 'Valor', key: 'valor', width: 30 }
      ];

      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      worksheet.getRow(1).font = { ...worksheet.getRow(1).font, color: { argb: 'FFFFFFFF' } };

      // Generar contenido según el tipo de reporte
      switch(reporteId) {
        case 'ventas':
          agregarReporteVentasExcel(worksheet);
          break;
        case 'inventario':
          agregarReporteInventarioExcel(worksheet);
          break;
        case 'productos':
          agregarReporteProductosExcel(worksheet);
          break;
        case 'ingresos':
          agregarReporteIngresosExcel(worksheet);
          break;
      }
    });

    // Generar buffer y descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-productos-${new Date().getTime()}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    setTimeout(() => {
      mostrarNotificacion('Excel generado exitosamente');
      cerrarModalReporte();
    }, 500);

  } catch (error) {
    console.error('Error al generar Excel:', error);
    mostrarError('Error al generar el Excel');
  }
}

function mostrarNotificacion(mensaje) {
  const notificacion = document.createElement('div');
  notificacion.style.position = 'fixed';
  notificacion.style.top = '24px';
  notificacion.style.right = '24px';
  notificacion.style.padding = '14px 24px';
  notificacion.style.background = 'rgba(52, 211, 153, 0.15)';
  notificacion.style.border = '1px solid rgba(52, 211, 153, 0.3)';
  notificacion.style.color = '#34d399';
  notificacion.style.borderRadius = '999px';
  notificacion.style.fontWeight = '600';
  notificacion.style.fontSize = '14px';
  notificacion.style.zIndex = '2000';
  notificacion.style.opacity = '0';
  notificacion.style.transform = 'translateY(-20px)';
  notificacion.style.transition = 'all 0.3s ease';
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  setTimeout(() => notificacion.style.opacity = '1', 10);
  setTimeout(() => notificacion.style.transform = 'translateY(0)', 10);

  setTimeout(() => {
    notificacion.style.opacity = '0';
    notificacion.style.transform = 'translateY(-20px)';
    setTimeout(() => notificacion.remove(), 300);
  }, 3000);
}

// Funciones auxiliares para PDF
function agregarReporteVentas(doc, yPos) {
  doc.setFontSize(12);
  doc.text('Resumen de Ventas:', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.text(`Total de ventas: ${ventasData.length}`, 20, yPos);
  yPos += 7;
  
  const totalVentas = ventasData.reduce((sum, v) => sum + v.ventas, 0);
  doc.text(`Monto total: Q ${totalVentas.toFixed(2)}`, 20, yPos);
  yPos += 10;
  
  // Tabla de ventas
  doc.setFontSize(10);
  doc.text('Fecha', 20, yPos);
  doc.text('Monto', 160, yPos);
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 5;
  
  ventasData.forEach(v => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(new Date(v.fecha).toLocaleDateString('es-ES'), 20, yPos);
    doc.text(`Q ${v.ventas.toFixed(2)}`, 160, yPos);
    yPos += 6;
  });
  
  return yPos;
}

function agregarReporteInventario(doc, yPos) {
  doc.setFontSize(12);
  doc.text('Estado del Inventario:', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.text(`Stock Crítico: ${inventarioData.stockCritico} productos`, 20, yPos);
  yPos += 7;
  doc.text(`Entradas últimos 30 días: ${inventarioData.entradas30}`, 20, yPos);
  yPos += 7;
  doc.text(`Salidas últimos 30 días: ${inventarioData.salidas30}`, 20, yPos);
  
  return yPos + 10;
}

function agregarReporteProductos(doc, yPos) {
  doc.setFontSize(12);
  doc.text('Top 10 Productos Más Vendidos:', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  topProductos.slice(0, 10).forEach((p, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`${index + 1}. ${p.nombre}`, 25, yPos);
    doc.text(`Cantidad: ${p.cantidad} | Ingresos: Q ${p.ingresos.toFixed(2)}`, 30, yPos + 5);
    yPos += 12;
  });
  
  return yPos;
}

function agregarReporteIngresos(doc, yPos) {
  doc.setFontSize(12);
  doc.text('Ingresos Mensuales:', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  ingresosMensuales.forEach(i => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`${i.mes}: Q ${i.ingresos.toFixed(2)}`, 25, yPos);
    yPos += 7;
  });
  
  return yPos + 5;
}

// Funciones auxiliares para Excel
function agregarReporteVentasExcel(worksheet) {
  worksheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Ventas', key: 'ventas', width: 20 }
  ];
  
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  ventasData.forEach(v => {
    worksheet.addRow({
      fecha: new Date(v.fecha).toLocaleDateString('es-ES'),
      ventas: `Q ${v.ventas.toFixed(2)}`
    });
  });
}

function agregarReporteInventarioExcel(worksheet) {
  worksheet.columns = [
    { header: 'Concepto', key: 'concepto', width: 30 },
    { header: 'Valor', key: 'valor', width: 20 }
  ];
  
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  worksheet.addRow({ concepto: 'Stock Crítico', valor: inventarioData.stockCritico });
  worksheet.addRow({ concepto: 'Entradas (30 días)', valor: inventarioData.entradas30 });
  worksheet.addRow({ concepto: 'Salidas (30 días)', valor: inventarioData.salidas30 });
}

function agregarReporteProductosExcel(worksheet) {
  worksheet.columns = [
    { header: '#', key: 'posicion', width: 10 },
    { header: 'Producto', key: 'producto', width: 40 },
    { header: 'Cantidad', key: 'cantidad', width: 15 },
    { header: 'Ingresos', key: 'ingresos', width: 20 }
  ];
  
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  topProductos.slice(0, 10).forEach((p, index) => {
    worksheet.addRow({
      posicion: index + 1,
      producto: p.nombre,
      cantidad: p.cantidad,
      ingresos: `Q ${p.ingresos.toFixed(2)}`
    });
  });
}

function agregarReporteIngresosExcel(worksheet) {
  worksheet.columns = [
    { header: 'Mes', key: 'mes', width: 20 },
    { header: 'Ingresos', key: 'ingresos', width: 20 }
  ];
  
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  ingresosMensuales.forEach(i => {
    worksheet.addRow({
      mes: i.mes,
      ingresos: `Q ${i.ingresos.toFixed(2)}`
    });
  });
}

function mostrarError(mensaje) {
  const notificacion = document.createElement('div');
  notificacion.style.position = 'fixed';
  notificacion.style.top = '24px';
  notificacion.style.right = '24px';
  notificacion.style.padding = '14px 24px';
  notificacion.style.background = 'rgba(255, 75, 47, 0.15)';
  notificacion.style.border = '1px solid rgba(255, 75, 47, 0.3)';
  notificacion.style.color = '#ff4b2f';
  notificacion.style.borderRadius = '999px';
  notificacion.style.fontWeight = '600';
  notificacion.style.fontSize = '14px';
  notificacion.style.zIndex = '2000';
  notificacion.style.opacity = '0';
  notificacion.style.transform = 'translateY(-20px)';
  notificacion.style.transition = 'all 0.3s ease';
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  setTimeout(() => notificacion.style.opacity = '1', 10);
  setTimeout(() => notificacion.style.transform = 'translateY(0)', 10);

  setTimeout(() => {
    notificacion.style.opacity = '0';
    notificacion.style.transform = 'translateY(-20px)';
    setTimeout(() => notificacion.remove(), 300);
  }, 3000);
}
