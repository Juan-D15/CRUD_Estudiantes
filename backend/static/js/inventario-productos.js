// Variables globales
let productos = [];
let tipoMovimientoActual = 'E'; // E = Entrada, S = Salida
let paginaActual = 1;
const itemsPorPagina = 10;

// Función para obtener el token CSRF
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
  const btnEntrada = document.getElementById('btnEntrada');
  const btnSalida = document.getElementById('btnSalida');
  const searchInput = document.getElementById('search');

  if (btnEntrada) btnEntrada.addEventListener('click', () => abrirModalMovimiento('E'));
  if (btnSalida) btnSalida.addEventListener('click', () => abrirModalMovimiento('S'));
  if (searchInput) searchInput.addEventListener('input', () => buscarProductos());

  cargarInventarioDesdeAPI();
});

// Cargar inventario desde la API
async function cargarInventarioDesdeAPI() {
  try {
    const busqueda = document.getElementById('search')?.value || '';
    const url = `${window.API_INVENTARIO}?buscar=${encodeURIComponent(busqueda)}&page=${paginaActual}&pageSize=${itemsPorPagina}`;
    
    console.log('🔍 Consultando API de inventario:', url);
    
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const data = await response.json();
    
    console.log('✅ Respuesta de la API:', data);
    
    if (data.ok) {
      productos = data.data || [];
      console.log(`📦 Productos en inventario: ${productos.length} productos`);
      renderizarInventario(data.data || [], data.total || 0);
    } else {
      console.error('❌ Error al cargar inventario:', data.msg);
    }
  } catch (error) {
    console.error('❌ Error en la petición:', error);
  }
}

function renderizarInventario(items, total) {
  const tbody = document.getElementById('tbody');
  if (!tbody) return;
  
  const totalPaginas = Math.ceil(total / itemsPorPagina);

  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No se encontraron productos</td></tr>';
    actualizarPaginacion(totalPaginas);
    return;
  }

  items.forEach(producto => {
    const stockActual = parseInt(producto.stockActual) || 0;
    const stockMinimo = parseInt(producto.stockMinimo) || 0;
    const estadoStock = obtenerEstadoStock(stockActual, stockMinimo);
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${producto.idProducto || 'N/A'}</td>
      <td><strong>${producto.codigo || 'N/A'}</strong></td>
      <td>${producto.nombre || 'N/A'}</td>
      <td><span class="stock ${estadoStock.clase}">${stockActual}</span></td>
      <td>${stockMinimo}</td>
      <td><span class="badge ${producto.estado}">${producto.estado.toUpperCase()}</span></td>
      <td>${formatearFecha(producto.UltimoMovimiento || producto.fechaCreacion)}</td>
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
  if (!pagination) return;
  
  pagination.innerHTML = '';

  if (totalPaginas <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.textContent = '«';
  btnPrev.disabled = paginaActual === 1;
  btnPrev.onclick = () => {
    if (paginaActual > 1) {
      paginaActual--;
      cargarInventarioDesdeAPI();
    }
  };
  pagination.appendChild(btnPrev);

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.classList.toggle('active', i === paginaActual);
    btn.onclick = () => {
      paginaActual = i;
      cargarInventarioDesdeAPI();
    };
    pagination.appendChild(btn);
  }

  const btnNext = document.createElement('button');
  btnNext.textContent = '»';
  btnNext.disabled = paginaActual === totalPaginas;
  btnNext.onclick = () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      cargarInventarioDesdeAPI();
    }
  };
  pagination.appendChild(btnNext);
}

function buscarProductos() {
  paginaActual = 1;
  cargarInventarioDesdeAPI();
}

function abrirModalMovimiento(tipo) {
  tipoMovimientoActual = tipo;
  const esEntrada = tipo === 'E';
  const titulo = esEntrada ? 'Registrar Entrada' : 'Registrar Salida';
  const claseBoton = esEntrada ? 'btn-entrada' : 'btn-salida';

  let modal = document.getElementById('modalMovimiento');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalMovimiento';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${titulo}</h2>
        <button class="modal-close" onclick="cerrarModal()">&times;</button>
      </div>
      <form id="formMovimiento" onsubmit="guardarMovimiento(event)">
        <div class="field">
          <label>Producto</label>
          <select id="formProducto" name="producto" required>
            <option value="">Seleccione un producto</option>
            ${productos.filter(p => p.estado === 'activo').map(p => 
              `<option value="${p.idProducto}" data-stock="${p.stockActual}">${p.codigo} - ${p.nombre}</option>`
            ).join('')}
          </select>
          <small id="err-producto" class="error"></small>
        </div>

        <div class="field">
          <label>Cantidad</label>
          <input type="number" id="formCantidad" name="cantidad" placeholder="Cantidad" min="1" required />
          <small id="err-cantidad" class="error"></small>
        </div>

        ${esEntrada ? `
          <div class="field">
            <label>Costo Unitario</label>
            <input type="number" step="0.01" id="formCostoUnitario" name="costoUnitario" placeholder="Costo por unidad" min="0" />
          </div>
        ` : `
          <div class="field">
            <label>Precio Unitario</label>
            <input type="number" step="0.01" id="formPrecioUnitario" name="precioUnitario" placeholder="Precio por unidad" min="0" required />
            <small id="err-precioUnitario" class="error"></small>
          </div>
        `}

        <div class="field">
          <label>Motivo</label>
          <textarea id="formMotivo" name="motivo" placeholder="Motivo del movimiento (ej: compra, venta, ajuste, etc.)" rows="3"></textarea>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="cerrarModal()">Cancelar</button>
          <button type="submit" class="btn-primary ${claseBoton}">Registrar Movimiento</button>
        </div>
      </form>
    </div>
  `;

  modal.style.display = 'flex';

  // Event listener para cuando se selecciona un producto
  const selectProducto = document.getElementById('formProducto');
  selectProducto.addEventListener('change', (e) => {
    const idProductoSeleccionado = parseInt(e.target.value);
    const productoSeleccionado = productos.find(p => p.idProducto === idProductoSeleccionado);
    
    if (productoSeleccionado) {
      // Pre-llenar el costo/precio según el tipo de movimiento
      if (esEntrada) {
        // En ENTRADA: pre-llenar con el precio de costo
        const inputCosto = document.getElementById('formCostoUnitario');
        if (inputCosto) {
          inputCosto.value = productoSeleccionado.precioCosto || '';
        }
      } else {
        // En SALIDA: pre-llenar con el precio de venta
        const inputPrecio = document.getElementById('formPrecioUnitario');
        if (inputPrecio) {
          inputPrecio.value = productoSeleccionado.precioVenta || '';
        }
      }
    }

    // Validar stock (solo para salidas)
    if (!esEntrada) {
      const option = e.target.options[e.target.selectedIndex];
      const stockActual = parseInt(option.dataset.stock || '0');
      const cantidadInput = document.getElementById('formCantidad');
      
      if (stockActual > 0) {
        cantidadInput.max = stockActual;
        cantidadInput.setAttribute('data-stock', stockActual);
      } else {
        cantidadInput.max = '';
        cantidadInput.removeAttribute('data-stock');
      }
    }
  });

  // Validar cantidad vs stock al escribir (solo para salidas)
  if (!esEntrada) {
    const cantidadInput = document.getElementById('formCantidad');
    cantidadInput.addEventListener('input', (e) => {
      const cantidad = parseInt(e.target.value);
      const stockMax = parseInt(e.target.dataset.stock || '0');
      const errorElement = document.getElementById('err-cantidad');
      
      if (stockMax > 0 && cantidad > stockMax) {
        errorElement.textContent = `Stock insuficiente. Disponible: ${stockMax}`;
        errorElement.style.display = 'block';
      } else {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
      }
    });
  }
}

function cerrarModal() {
  const modal = document.getElementById('modalMovimiento');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function guardarMovimiento(event) {
  event.preventDefault();

  const form = document.getElementById('formMovimiento');
  const idProducto = parseInt(form.formProducto.value);
  const cantidad = parseInt(form.formCantidad.value);
  const descripcion = form.formMotivo.value.trim() || 'Sin motivo';

  // Obtener datos del producto
  const producto = productos.find(p => p.idProducto === idProducto);
  if (!producto) {
    mostrarError('Producto no encontrado');
    return;
  }

  // Validar stock para salidas
  if (tipoMovimientoActual === 'S' && cantidad > producto.stockActual) {
    mostrarError(`Stock insuficiente. Disponible: ${producto.stockActual}`);
    return;
  }

  // Preparar payload según el tipo de movimiento
  const payload = {
    idProducto: idProducto,
    cantidad: cantidad,
    tipoMovimiento: tipoMovimientoActual,
    descripcion: descripcion
  };

  // Para ENTRADAS, incluir costoUnitario si se proporcionó
  if (tipoMovimientoActual === 'E') {
    const costoInput = form.formCostoUnitario;
    if (costoInput && costoInput.value) {
      const costoUnitario = parseFloat(costoInput.value);
      if (costoUnitario > 0) {
        payload.costoUnitario = costoUnitario;
      }
    }
  }

  try {
    console.log(`📝 Registrando ${tipoMovimientoActual === 'E' ? 'ENTRADA' : 'SALIDA'}:`, payload);

    const response = await fetch(window.API_INVENTARIO_ENTRADA, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Movimiento registrado exitosamente');
      cerrarModal();
      cargarInventarioDesdeAPI();
      mostrarNotificacion(
        tipoMovimientoActual === 'E' ? 'Entrada registrada correctamente' : 'Salida registrada correctamente'
      );
    } else {
      console.error('❌ Error al registrar movimiento:', data.msg);
      mostrarError(data.msg || 'Error al registrar movimiento');
    }
  } catch (error) {
    console.error('❌ Error en la petición:', error);
    mostrarError('Error de conexión al registrar movimiento');
  }
}

async function verHistorial(idProducto) {
  const producto = productos.find(p => p.idProducto === idProducto);
  
  if (!producto) {
    mostrarError('Producto no encontrado');
    return;
  }

  console.log(`📜 Consultando historial del producto ${idProducto}...`);

  // Crear modal
  let modal = document.getElementById('modalHistorial');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalHistorial';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  // Mostrar loading
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h2>Historial de Movimientos</h2>
        <button class="modal-close" onclick="cerrarModalHistorial()">&times;</button>
      </div>
      <div style="padding: 40px; text-align: center; color: rgba(255,255,255,0.6);">
        Cargando historial...
      </div>
    </div>
  `;
  modal.style.display = 'flex';

  // Consultar API
  try {
    const response = await fetch(`/api/inventario/historial/${idProducto}`, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const data = await response.json();
    
    console.log('✅ Historial obtenido:', data);
    
    const movimientos = data.ok ? (data.data || []) : [];
    
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
                  <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase;">Descripción</th>
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
                           <td style="padding: 12px; font-size: 13px; color: rgba(255,255,255,0.7);">${m.motivo || 'Sin motivo'}</td>
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
    
    // Scroll personalizado para la tabla
    const scrollContainer = modal.querySelector('div[style*="max-height"]');
    if (scrollContainer) {
      scrollContainer.style.scrollbarWidth = 'thin';
      scrollContainer.style.scrollbarColor = 'rgba(255,255,255,0.3) rgba(255,255,255,0.05)';
    }
  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h2>Historial de Movimientos</h2>
          <button class="modal-close" onclick="cerrarModalHistorial()">&times;</button>
        </div>
        <div style="padding: 40px; text-align: center; color: rgba(255,75,47,0.8);">
          Error al cargar el historial
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="cerrarModalHistorial()">Cerrar</button>
        </div>
      </div>
    `;
  }
}

function cerrarModalHistorial() {
  const modal = document.getElementById('modalHistorial');
  if (modal) {
    modal.style.display = 'none';
  }
}

function mostrarError(mensaje) {
  const notificacion = document.createElement('div');
  notificacion.className = 'notificacion';
  notificacion.style.background = 'rgba(255, 75, 47, 0.15)';
  notificacion.style.borderColor = 'rgba(255, 75, 47, 0.3)';
  notificacion.style.color = '#ff4b2f';
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  setTimeout(() => notificacion.classList.add('show'), 10);

  setTimeout(() => {
    notificacion.classList.remove('show');
    setTimeout(() => notificacion.remove(), 300);
  }, 3000);
}

function mostrarNotificacion(mensaje) {
  const notificacion = document.createElement('div');
  notificacion.className = 'notificacion';
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  setTimeout(() => notificacion.classList.add('show'), 10);

  setTimeout(() => {
    notificacion.classList.remove('show');
    setTimeout(() => notificacion.remove(), 300);
  }, 3000);
}


