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
let productos = [];
let paginaActual = 1;
const itemsPorPagina = 10;

// ========== Inicialización ==========
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', () => buscarProductos());

  cargarInventarioDesdeAPI();
});

// ========== Cargar inventario desde API ==========
async function cargarInventarioDesdeAPI() {
  try {
    console.log('🔄 Iniciando carga de inventario...');
    const url = window.API_INVENTARIO_LISTAR || '/api/inventario';
    console.log('📡 URL:', url);
    
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });

    console.log('📥 Response status:', response.status);
    const result = await response.json();
    console.log('📦 Datos recibidos:', result);
    
    if (result.ok && result.data) {
      console.log('📊 Número de productos en result.data:', result.data.length);
      console.log('🔍 Primer producto (raw):', result.data[0]);
      
      productos = result.data.map(p => ({
        idProducto: p.idProducto,
        codigo: p.codigo,
        nombre: p.nombre,
        stockActual: p.stockActual || 0,
        stockMinimo: p.stockMinimo || 0,
        estado: p.estado || 'activo',
        ultimoMovimiento: p.UltimoMovimiento || null
      }));
      
      console.log('✅ Productos mapeados:', productos.length);
      console.log('🔍 Primer producto (mapeado):', productos[0]);
      cargarInventario();
    } else {
      console.error('❌ Error al cargar inventario:', result.msg || 'Error desconocido');
      console.error('❌ result.ok:', result.ok);
      console.error('❌ result.data:', result.data);
      productos = [];
      cargarInventario();
    }
  } catch (error) {
    console.error('❌ Error al cargar inventario:', error);
    productos = [];
    cargarInventario();
  }
}

function cargarInventario() {
  console.log('🎨 Renderizando inventario...');
  console.log('📦 Total productos disponibles:', productos.length);
  
  const tbody = document.getElementById('tbody');
  const busqueda = document.getElementById('search').value.toLowerCase();

  let productosFiltrados = productos.filter(p =>
    p.codigo.toLowerCase().includes(busqueda) ||
    p.nombre.toLowerCase().includes(busqueda)
  );

  console.log('🔍 Productos filtrados:', productosFiltrados.length);
  
  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);
  const inicio = (paginaActual - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const productosPaginados = productosFiltrados.slice(inicio, fin);

  console.log('📄 Productos en página actual:', productosPaginados.length);
  
  tbody.innerHTML = '';

  if (productosPaginados.length === 0) {
    console.warn('⚠️ No hay productos para mostrar');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No se encontraron productos</td></tr>';
    actualizarPaginacion(totalPaginas);
    return;
  }
  
  console.log('✅ Renderizando filas...');

  productosPaginados.forEach(producto => {
    const estadoStock = obtenerEstadoStock(producto.stockActual, producto.stockMinimo);
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${producto.idProducto}</td>
      <td><strong>${producto.codigo}</strong></td>
      <td>${producto.nombre}</td>
      <td><span class="stock ${estadoStock.clase}">${producto.stockActual}</span></td>
      <td>${producto.stockMinimo}</td>
      <td><span class="badge ${producto.estado}">${producto.estado.toUpperCase()}</span></td>
      <td>${formatearFecha(producto.ultimoMovimiento)}</td>
      <td>
        <div class="actions">
          <button class="btn-table btn-historial" onclick="verHistorial(${producto.idProducto})">
            Historial
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  actualizarPaginacion(totalPaginas);
}

function obtenerEstadoStock(stockActual, stockMinimo) {
  if (stockActual === 0) {
    return { clase: 'critico', texto: 'Sin stock' };
  } else if (stockActual < stockMinimo) {
    return { clase: 'critico', texto: 'Crítico' };
  } else if (stockActual < stockMinimo * 1.5) {
    return { clase: 'bajo', texto: 'Bajo' };
  } else {
    return { clase: 'disponible', texto: 'Disponible' };
  }
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return 'N/A';
  const fecha = new Date(fechaStr);
  return fecha.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function actualizarPaginacion(totalPaginas) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  if (totalPaginas <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.textContent = '«';
  btnPrev.disabled = paginaActual === 1;
  btnPrev.onclick = () => {
    if (paginaActual > 1) {
      paginaActual--;
      cargarInventario();
    }
  };
  pagination.appendChild(btnPrev);

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.classList.toggle('active', i === paginaActual);
    btn.onclick = () => {
      paginaActual = i;
      cargarInventario();
    };
    pagination.appendChild(btn);
  }

  const btnNext = document.createElement('button');
  btnNext.textContent = '»';
  btnNext.disabled = paginaActual === totalPaginas;
  btnNext.onclick = () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      cargarInventario();
    }
  };
  pagination.appendChild(btnNext);
}

function buscarProductos() {
  paginaActual = 1;
  cargarInventario();
}

async function verHistorial(idProducto) {
  const producto = productos.find(p => p.idProducto === idProducto);
  
  if (!producto) {
    alert('Producto no encontrado');
    return;
  }

  // Cargar historial desde API
  let movimientos = [];
  try {
    const url = `/api/inventario/historial/${idProducto}`;
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const result = await response.json();
    if (result.ok && result.data) {
      movimientos = result.data.map(m => ({
        fecha: m.fecha,
        tipo: m.tipo,
        cantidad: m.cantidad,
        motivo: m.motivo || 'Sin descripción'
      }));
    }
  } catch (error) {
    console.error('Error al cargar historial:', error);
  }

  let modal = document.getElementById('modalHistorial');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalHistorial';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>Historial de Movimientos</h2>
        <button class="modal-close" onclick="cerrarModalHistorial()">&times;</button>
      </div>
      <div style="margin-bottom: 20px;">
        <p style="margin: 0; color: rgba(255,255,255,0.8);">
          <strong>Producto:</strong> ${producto.codigo} - ${producto.nombre}<br>
          <strong>Stock Actual:</strong> ${producto.stockActual} unidades
        </p>
      </div>
      <div style="max-height: 400px; overflow-y: auto;">
        ${movimientos.length === 0 ? 
          '<p style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">No hay movimientos registrados</p>' :
          `<table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid rgba(255,255,255,0.2);">
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase;">Fecha</th>
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase;">Tipo</th>
                <th style="padding: 10px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase;">Cantidad</th>
                <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase;">Motivo</th>
              </tr>
            </thead>
            <tbody>
              ${movimientos.map(m => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                  <td style="padding: 12px; font-size: 13px;">${formatearFecha(m.fecha)}</td>
                  <td style="padding: 12px;">
                    <span style="padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; ${
                      m.tipo === 'E' 
                        ? 'background: rgba(52,211,153,0.2); color: #34d399;' 
                        : 'background: rgba(255,75,47,0.2); color: #ff4b2f;'
                    }">
                      ${m.tipo === 'E' ? 'ENTRADA' : 'SALIDA'}
                    </span>
                  </td>
                  <td style="padding: 12px; text-align: right; font-weight: 700;">${m.cantidad}</td>
                  <td style="padding: 12px; font-size: 13px; color: rgba(255,255,255,0.7);">${m.motivo}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" onclick="cerrarModalHistorial()">Cerrar</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  // Scroll personalizado para la tabla
  const scrollContainer = modal.querySelector('div[style*="max-height"]');
  if (scrollContainer) {
    scrollContainer.style.scrollbarWidth = 'thin';
    scrollContainer.style.scrollbarColor = 'rgba(255,255,255,0.3) rgba(255,255,255,0.05)';
  }
}

function cerrarModalHistorial() {
  const modal = document.getElementById('modalHistorial');
  if (modal) {
    modal.style.display = 'none';
  }
}

