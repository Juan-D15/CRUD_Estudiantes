// Variables globales
let productos = [];
let categorias = [];
let productoActual = null;
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
  const btnCrear = document.getElementById('btnCrear');
  const searchInput = document.getElementById('search');

  if (btnCrear) btnCrear.addEventListener('click', () => abrirModalCrear());
  if (searchInput) searchInput.addEventListener('input', () => buscarProductos());

  // Cargar datos iniciales
  cargarCategoriasDesdeAPI();
  cargarProductosDesdeAPI();
});

// Cargar categorías desde la API
async function cargarCategoriasDesdeAPI() {
  try {
    console.log('🔍 Consultando API de categorías:', window.API_CATEGORIAS_LISTAR);
    const response = await fetch(`${window.API_CATEGORIAS_LISTAR}?soloActivas=1`, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    const data = await response.json();
    console.log('✅ Categorías cargadas desde BD:', data);
    if (data.ok) {
      categorias = data.data || [];
      console.log(`📋 Total categorías activas: ${categorias.length}`);
    }
  } catch (error) {
    console.error('❌ Error al cargar categorías:', error);
  }
}

// Cargar productos desde la API
async function cargarProductosDesdeAPI() {
  try {
    const busqueda = document.getElementById('search')?.value || '';
    // Agregar conCategorias=1 para obtener las categorías de cada producto
    const url = `${window.API_PRODUCTOS_LISTAR}?buscar=${encodeURIComponent(busqueda)}&page=${paginaActual}&pageSize=${itemsPorPagina}&conCategorias=1`;
    
    console.log('🔍 Consultando API de productos:', url);
    
    const response = await fetch(url, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    
    const data = await response.json();
    
    console.log('✅ Respuesta de la API:', data);
    
    if (data.ok) {
      productos = data.data || [];
      console.log(`📦 Productos cargados desde BD: ${productos.length} productos`);
      renderizarProductos(data.data || [], data.total || 0);
    } else {
      console.error('❌ Error al cargar productos:', data.msg);
      mostrarError('Error al cargar productos');
    }
  } catch (error) {
    console.error('❌ Error en la petición:', error);
    mostrarError('Error de conexión');
  }
}

function renderizarProductos(items, total) {
  const tbody = document.getElementById('tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">No se encontraron productos</td></tr>';
  } else {
    items.forEach(producto => {
      const tr = document.createElement('tr');
      const stockActual = parseInt(producto.stockActual) || 0;
      const stockMinimo = parseInt(producto.stockMinimo) || 0;
      
      tr.innerHTML = `
        <td>${producto.idProducto || 'N/A'}</td>
        <td><strong>${producto.codigo || 'N/A'}</strong></td>
        <td>${producto.nombre || 'N/A'}</td>
        <td>${producto.descripcion || '-'}</td>
        <td>Q${parseFloat(producto.precioCosto || 0).toFixed(2)}</td>
        <td><strong>Q${parseFloat(producto.precioVenta || 0).toFixed(2)}</strong></td>
        <td><span class="stock ${stockActual <= stockMinimo ? 'critico' : ''}">${stockActual}</span></td>
        <td><span class="badge ${producto.estado}">${producto.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
        <td class="actions">
          <button class="btn-action btn-edit" onclick="editarProducto(${producto.idProducto})">Editar</button>
          <button class="btn-action btn-categoria" onclick="gestionarCategorias(${producto.idProducto})">Categorías</button>
          <button class="btn-action btn-delete" onclick="eliminarProducto(${producto.idProducto})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const totalPaginas = Math.ceil(total / itemsPorPagina);
  actualizarPaginacion(totalPaginas);
}

function actualizarPaginacion(totalPaginas) {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;
  
  pagination.innerHTML = '';
  
  if (totalPaginas <= 1) return;

  const btnAnterior = document.createElement('button');
  btnAnterior.textContent = '←';
  btnAnterior.disabled = paginaActual === 1;
  btnAnterior.addEventListener('click', () => {
    if (paginaActual > 1) { paginaActual--; cargarProductosDesdeAPI(); }
  });
  pagination.appendChild(btnAnterior);

  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.classList.toggle('active', i === paginaActual);
    btn.addEventListener('click', () => { paginaActual = i; cargarProductosDesdeAPI(); });
    pagination.appendChild(btn);
  }

  const btnSiguiente = document.createElement('button');
  btnSiguiente.textContent = '→';
  btnSiguiente.disabled = paginaActual === totalPaginas;
  btnSiguiente.addEventListener('click', () => {
    if (paginaActual < totalPaginas) { paginaActual++; cargarProductosDesdeAPI(); }
  });
  pagination.appendChild(btnSiguiente);
}

function buscarProductos() {
  paginaActual = 1;
  cargarProductosDesdeAPI();
}

function abrirModalCrear() {
  productoActual = null;
  mostrarModalFormulario('Nuevo Producto');
}

function editarProducto(id) {
  productoActual = productos.find(p => p.idProducto === id);
  if (!productoActual) return;
  mostrarModalFormulario('Editar Producto');
  
  document.getElementById('formCodigo').value = productoActual.codigo || '';
  document.getElementById('formNombre').value = productoActual.nombre || '';
  document.getElementById('formDescripcion').value = productoActual.descripcion || '';
  document.getElementById('formPrecioCosto').value = productoActual.precioCosto || 0;
  document.getElementById('formPrecioVenta').value = productoActual.precioVenta || 0;
  document.getElementById('formStockActual').value = productoActual.stockActual || 0;
  document.getElementById('formStockMinimo').value = productoActual.stockMinimo || 0;
  document.getElementById('formDescuentoMax').value = productoActual.descuentoMaximoPct || 0;
  document.getElementById('formEstado').value = productoActual.estado || 'activo';
}

// Función para cargar categorías actuales del producto
async function cargarCategoriasProducto(idProducto) {
  try {
    // Obtener categorías asignadas al producto
    const response = await fetch(`${window.API_PRODUCTO_CATEGORIAS_BASE}${idProducto}/categorias`, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    const data = await response.json();
    
    const categoriasDelProducto = data.ok ? (data.data || []) : [];
    const idsCategoriasAsignadas = categoriasDelProducto.map(c => c.idCategoria);
    
    // Generar checkboxes con las categorías marcadas
    const categoriasForm = document.getElementById('categoriasForm');
    if (categoriasForm) {
      categoriasForm.innerHTML = categorias
        .filter(c => c.estado === 'activa')
        .map(c => {
          const checked = idsCategoriasAsignadas.includes(c.idCategoria) ? 'checked' : '';
          return `
            <label class="checkbox-item" style="margin: 0;">
              <input type="checkbox" value="${c.idCategoria}" ${checked}>
              <span>${c.nombre}</span>
            </label>
          `;
        }).join('');
    }
  } catch (error) {
    console.error('Error al cargar categorías del producto:', error);
  }
}

function mostrarModalFormulario(titulo) {
  if (!document.getElementById('modalForm')) {
    const modal = document.createElement('div');
    modal.id = 'modalForm';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>${titulo}</h2>
          <button class="modal-close" onclick="cerrarModal()">&times;</button>
        </div>
        <form id="formProducto" onsubmit="guardarProducto(event)">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9);">Información Básica</h3>
          
          <div class="field">
            <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(255,255,255,0.7);">Código *</label>
            <input type="text" id="formCodigo" name="codigo" placeholder="Código del producto" required autocomplete="off" />
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M7 7h10M7 7V5m0 2v2m14-2V5a2 2 0 0 0-2-2h-2m-4 4h2m0 0v2m0-2v-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </span>
            <small id="err-codigo" class="error"></small>
          </div>
          
          <div class="field">
            <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(255,255,255,0.7);">Nombre *</label>
            <input type="text" id="formNombre" name="nombre" placeholder="Nombre del producto" required autocomplete="off" />
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </span>
            <small id="err-nombre" class="error"></small>
          </div>

          <div class="field">
            <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(255,255,255,0.7);">Descripción</label>
            <input type="text" id="formDescripcion" name="descripcion" placeholder="Descripción (opcional)" autocomplete="off" />
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            </span>
          </div>
          
          <h3 style="margin: 20px 0 12px 0; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9);">Precios</h3>

          <div class="field-row">
            <div class="field">
              <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(255,255,255,0.7);">Precio de Costo *</label>
              <input type="number" step="0.01" id="formPrecioCosto" name="precioCosto" placeholder="Q 0.00" min="0" required />
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
              </span>
              <small id="err-precioCosto" class="error"></small>
            </div>
            <div class="field">
              <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(255,255,255,0.7);">Precio de Venta *</label>
              <input type="number" step="0.01" id="formPrecioVenta" name="precioVenta" placeholder="Q 0.00" min="0" required />
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
              </span>
              <small id="err-precioVenta" class="error"></small>
            </div>
          </div>
          
          <h3 style="margin: 20px 0 12px 0; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9);">Inventario</h3>

          <div class="field-row">
            <div class="field">
              <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(255,255,255,0.7);">Stock Actual *</label>
              <input type="number" id="formStockActual" name="stockActual" placeholder="Cantidad disponible" min="0" required value="0" />
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M9 11h6M9 7h6M9 15h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
              </span>
              <small id="err-stockActual" class="error"></small>
            </div>
            <div class="field">
              <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(255,255,255,0.7);">Stock Mínimo *</label>
              <input type="number" id="formStockMinimo" name="stockMinimo" placeholder="Alerta de reabastecimiento" min="0" required value="0" />
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M9 11h6M9 7h6M9 15h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
              </span>
              <small id="err-stockMinimo" class="error"></small>
            </div>
          </div>
          
          <h3 style="margin: 20px 0 12px 0; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9);">Descuento y Estado</h3>

          <div class="field-row">
            <div class="field">
              <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(255,255,255,0.7);">Descuento Máximo (%) *</label>
              <input type="number" step="0.01" id="formDescuentoMax" name="descuentoMax" placeholder="Ej: 10 = 10%" min="0" max="100" required value="0" />
              <span class="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </span>
              <small id="err-descuentoMax" class="error"></small>
            </div>
            <div class="field">
              <label style="display: block; margin-bottom: 4px; font-size: 12px; color: rgba(255,255,255,0.7);">Estado *</label>
              <select id="formEstado" name="estado" required>
                <option value="">Seleccione el estado</option>
                <option value="activo" selected>Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
              <small id="err-estado" class="error"></small>
            </div>
          </div>

          <div class="field">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.9);">Categorías</h3>
            <div id="categoriasForm" style="display: grid; gap: 10px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <!-- Se genera dinámicamente -->
            </div>
            <small id="err-categorias" class="error"></small>
          </div>

          <button type="submit" class="btn-primary">Guardar</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    document.querySelector('#modalForm .modal-header h2').textContent = titulo;
  }

  document.getElementById('modalForm').style.display = 'flex';

  // Generar checkboxes de categorías (para CREACIÓN y EDICIÓN)
  const categoriasForm = document.getElementById('categoriasForm');
  const seccionCategorias = categoriasForm ? categoriasForm.closest('.field') : null;
  
  // Siempre mostrar la sección de categorías
  if (seccionCategorias) {
    seccionCategorias.style.display = 'block';
  }
  
  // Eliminar mensaje si existe (ya no se necesita)
  const mensajeExistente = document.getElementById('mensaje-categorias-edicion');
  if (mensajeExistente) {
    mensajeExistente.remove();
  }
  
  if (categoriasForm) {
    if (categorias.filter(c => c.estado === 'activa').length === 0) {
      categoriasForm.innerHTML = '<p style="color: rgba(255,255,255,0.5); margin: 0;">No hay categorías activas. Crea una categoría primero.</p>';
    } else {
      // Si es EDICIÓN, cargar categorías actuales del producto
      if (productoActual) {
        cargarCategoriasProducto(productoActual.idProducto);
      } else {
        // Si es CREACIÓN, mostrar checkboxes sin marcar
        categoriasForm.innerHTML = categorias
          .filter(c => c.estado === 'activa')
          .map(c => {
            return `
              <label class="checkbox-item" style="margin: 0;">
                <input type="checkbox" value="${c.idCategoria}">
                <span>${c.nombre}</span>
              </label>
            `;
          }).join('');
      }
    }
  }

  if (productoActual) {
    document.getElementById('formCodigo').value = productoActual.codigo;
    document.getElementById('formNombre').value = productoActual.nombre;
    document.getElementById('formDescripcion').value = productoActual.descripcion || '';
    document.getElementById('formPrecioCosto').value = productoActual.precioCosto;
    document.getElementById('formPrecioVenta').value = productoActual.precioVenta;
    document.getElementById('formStockActual').value = productoActual.stockActual;
    document.getElementById('formStockMinimo').value = productoActual.stockMinimo;
    document.getElementById('formDescuentoMax').value = productoActual.descuentoMaximoPct;
    document.getElementById('formEstado').value = productoActual.estado;
  } else {
    document.getElementById('formProducto').reset();
  }
}

function cerrarModal() {
  document.getElementById('modalForm').style.display = 'none';
  productoActual = null;
}

async function guardarProducto(event) {
  event.preventDefault();
  limpiarErrores(); // Limpiar errores previos

  const codigo = document.getElementById('formCodigo').value.trim();
  const nombre = document.getElementById('formNombre').value.trim();
  const descripcion = document.getElementById('formDescripcion').value.trim();
  const precioCosto = parseFloat(document.getElementById('formPrecioCosto').value);
  const precioVenta = parseFloat(document.getElementById('formPrecioVenta').value);
  const stockActual = parseInt(document.getElementById('formStockActual').value);
  const stockMinimo = parseInt(document.getElementById('formStockMinimo').value);
  const descuentoMax = parseFloat(document.getElementById('formDescuentoMax').value);
  const estado = document.getElementById('formEstado').value;
  
  // Obtener categorías seleccionadas del formulario
  const checkboxesCategorias = document.querySelectorAll('#categoriasForm input[type="checkbox"]:checked');
  const categoriasSeleccionadas = Array.from(checkboxesCategorias).map(cb => parseInt(cb.value));

  // Validar campos requeridos
  if (!codigo || !nombre) {
    mostrarError('codigo', 'Código y nombre son requeridos');
    return;
  }

  // Validar precios
  if (precioCosto < 0) {
    mostrarError('precioCosto', 'El precio de costo no puede ser negativo');
    return;
  }
  
  if (precioVenta < 0) {
    mostrarError('precioVenta', 'El precio de venta no puede ser negativo');
    return;
  }

  // Validar stocks
  if (stockActual < 0) {
    mostrarError('stockActual', 'El stock actual no puede ser negativo');
    return;
  }
  
  if (stockMinimo < 0) {
    mostrarError('stockMinimo', 'El stock mínimo no puede ser negativo');
    return;
  }

  // Validar descuento (debe ser entre 0 y 100%)
  if (descuentoMax < 0) {
    mostrarError('descuentoMax', 'El descuento no puede ser negativo');
    return;
  }
  
  if (descuentoMax > 100) {
    mostrarError('descuentoMax', 'El descuento no puede ser mayor a 100%');
    return;
  }

  try {
    let url, method, body;
    
    if (productoActual) {
      // Actualizar
      url = `/api/productos/${productoActual.idProducto}/update`;
      method = 'PUT';
      body = JSON.stringify({
        codigo, nombre, descripcion,
        precioCosto, precioVenta,
        stockActual, stockMinimo,
        descuentoMaximoPct: descuentoMax,
        estado
      });
    } else {
      // Crear
      url = window.API_PRODUCTOS_CREAR;
      method = 'POST';
      body = JSON.stringify({
        codigo, nombre, descripcion,
        precioCosto, precioVenta,
        stockActual, stockMinimo,
        descuentoMaximoPct: descuentoMax,
        estado
      });
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      body
    });

    const data = await response.json();

    if (data.ok) {
      const idProductoFinal = productoActual ? productoActual.idProducto : data.idProducto;
      
      // Actualizar categorías (tanto para CREAR como para EDITAR)
      if (idProductoFinal) {
        console.log(`✅ Actualizando categorías para producto ID: ${idProductoFinal}...`);
        
        // Obtener categorías actuales del producto
        const respActuales = await fetch(`${window.API_PRODUCTO_CATEGORIAS_BASE}${idProductoFinal}/categorias`, {
          headers: { 'X-CSRFToken': csrftoken }
        });
        const dataActuales = await respActuales.json();
        const categoriasActuales = dataActuales.ok ? (dataActuales.data || []).map(c => c.idCategoria) : [];
        
        // Determinar qué categorías agregar y qué categorías eliminar
        const categoriasAgregar = categoriasSeleccionadas.filter(id => !categoriasActuales.includes(id));
        const categoriasEliminar = categoriasActuales.filter(id => !categoriasSeleccionadas.includes(id));
        
        console.log(`📋 Categorías a agregar: ${categoriasAgregar.length}`, categoriasAgregar);
        console.log(`📋 Categorías a eliminar: ${categoriasEliminar.length}`, categoriasEliminar);
        
        // Agregar nuevas categorías
        for (const idCategoria of categoriasAgregar) {
          try {
            const respCat = await fetch(
              `${window.API_PRODUCTO_CATEGORIAS_BASE}${idProductoFinal}/categorias/${idCategoria}/assign`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': csrftoken
                }
              }
            );
            const dataCat = await respCat.json();
            if (dataCat.ok) {
              console.log(`✅ Categoría ${idCategoria} asignada`);
            } else {
              console.error(`❌ Error al asignar categoría ${idCategoria}:`, dataCat.msg);
            }
          } catch (errCat) {
            console.error(`❌ Error al asignar categoría ${idCategoria}:`, errCat);
          }
        }
        
        // Eliminar categorías deseleccionadas
        for (const idCategoria of categoriasEliminar) {
          try {
            const respCat = await fetch(
              `${window.API_PRODUCTO_CATEGORIAS_BASE}${idProductoFinal}/categorias/${idCategoria}/unassign`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': csrftoken
                }
              }
            );
            const dataCat = await respCat.json();
            if (dataCat.ok) {
              console.log(`✅ Categoría ${idCategoria} eliminada`);
            } else {
              console.error(`❌ Error al eliminar categoría ${idCategoria}:`, dataCat.msg);
            }
          } catch (errCat) {
            console.error(`❌ Error al eliminar categoría ${idCategoria}:`, errCat);
          }
        }
        
        mostrarNotificacion(
          productoActual 
            ? `Producto actualizado con ${categoriasSeleccionadas.length} categoría(s)` 
            : `Producto creado con ${categoriasSeleccionadas.length} categoría(s)`
        );
      } else {
        mostrarNotificacion(
          productoActual ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente'
        );
      }
      
      cerrarModal();
      cargarProductosDesdeAPI();
    } else {
      mostrarError('codigo', data.msg || 'Error al guardar el producto');
    }
  } catch (error) {
    console.error('Error al guardar:', error);
    mostrarError('codigo', 'Error de conexión');
  }
}

async function eliminarProducto(id) {
  const producto = productos.find(p => p.idProducto === id);
  if (!producto) return;

  if (confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"?`)) {
    try {
      const response = await fetch(`/api/productos/${id}/delete`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrftoken
        }
      });

      const data = await response.json();

      if (data.ok) {
        cargarProductosDesdeAPI();
        mostrarNotificacion('Producto eliminado exitosamente');
      } else {
        alert(data.msg || 'Error al eliminar el producto');
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error de conexión');
    }
  }
}

async function gestionarCategorias(idProducto) {
  const producto = productos.find(p => p.idProducto === idProducto);
  if (!producto) return;

  // Cargar categorías actuales del producto desde la API
  try {
    const response = await fetch(`${window.API_PRODUCTO_CATEGORIAS_BASE}${idProducto}/categorias`, {
      headers: { 'X-CSRFToken': csrftoken }
    });
    const data = await response.json();
    
    if (data.ok) {
      // Convertir array de objetos a array de IDs
      producto.categoriasAsignadas = (data.data || []).map(c => c.idCategoria);
      console.log('📋 Categorías asignadas al producto:', producto.categoriasAsignadas);
    } else {
      producto.categoriasAsignadas = [];
    }
  } catch (error) {
    console.error('Error al cargar categorías del producto:', error);
    producto.categoriasAsignadas = [];
  }

  mostrarModalCategorias(producto);
}

function mostrarModalCategorias(producto) {
  if (!document.getElementById('modalCategorias')) {
    const modal = document.createElement('div');
    modal.id = 'modalCategorias';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="tituloModalCategorias">Gestionar Categorías: ${producto.nombre}</h2>
          <button class="modal-close" onclick="cerrarModalCategorias()">&times;</button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <button type="button" id="btnAgregarCategoria" style="display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid rgba(255,255,255,0.3); border-radius: 999px; background: rgba(52, 211, 153, 0.15); color: #34d399; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.15s ease; font-family: inherit;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Agregar Categoría
          </button>
        </div>
        <div class="categorias-list" id="categoriasList">
          <!-- Se genera dinámicamente -->
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="cerrarModalCategorias()">Cancelar</button>
          <button type="button" class="btn-primary" onclick="guardarCategoriasProducto()">Guardar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    // Si el modal ya existe, actualizar el título con el nombre del producto actual
    const tituloModal = document.getElementById('tituloModalCategorias');
    if (tituloModal) {
      tituloModal.textContent = `Gestionar Categorías: ${producto.nombre}`;
    }
  }

  const categoriasList = document.getElementById('categoriasList');
  
  // Botón para agregar categoría
  const btnAgregarCategoria = document.getElementById('btnAgregarCategoria');
  if (btnAgregarCategoria) {
    btnAgregarCategoria.onclick = () => {
      window.location.href = window.API_CATEGORIAS_PAGE || '/admin/productos/categorias';
    };
  }
  
  // Usar categoriasAsignadas que viene de la API
  const categoriasProducto = producto.categoriasAsignadas || [];
  
  categoriasList.innerHTML = categorias
    .filter(c => c.estado === 'activa')
    .map(c => {
      const estaSeleccionada = categoriasProducto.includes(c.idCategoria);
      return `
        <label class="checkbox-item">
          <input type="checkbox" value="${c.idCategoria}" ${estaSeleccionada ? 'checked' : ''}>
          <span>${c.nombre}</span>
        </label>
      `;
    }).join('');
  
  console.log('✅ Modal de categorías mostrado. Categorías del producto:', categoriasProducto);

  productoActual = producto;
  document.getElementById('modalCategorias').style.display = 'flex';
}

function cerrarModalCategorias() {
  document.getElementById('modalCategorias').style.display = 'none';
  productoActual = null;
}

async function guardarCategoriasProducto() {
  if (!productoActual) return;

  const checkboxes = document.querySelectorAll('#categoriasList input[type="checkbox"]');
  const categoriasSeleccionadas = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => parseInt(cb.value));

  const categoriasActuales = productoActual.categoriasAsignadas || [];
  
  console.log('📋 Categorías actuales:', categoriasActuales);
  console.log('📋 Categorías seleccionadas:', categoriasSeleccionadas);

  // Determinar qué categorías agregar y cuáles quitar
  const categoriasAAgregar = categoriasSeleccionadas.filter(id => !categoriasActuales.includes(id));
  const categoriasAQuitar = categoriasActuales.filter(id => !categoriasSeleccionadas.includes(id));

  console.log('➕ Categorías a agregar:', categoriasAAgregar);
  console.log('➖ Categorías a quitar:', categoriasAQuitar);

  try {
    // Agregar nuevas categorías
    for (const idCategoria of categoriasAAgregar) {
      const response = await fetch(
        `${window.API_PRODUCTO_CATEGORIAS_BASE}${productoActual.idProducto}/categorias/${idCategoria}/assign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken
          }
        }
      );
      const data = await response.json();
      if (!data.ok) {
        console.error(`Error al asignar categoría ${idCategoria}:`, data.msg);
      } else {
        console.log(`✅ Categoría ${idCategoria} asignada exitosamente`);
      }
    }

    // Quitar categorías desmarcadas
    for (const idCategoria of categoriasAQuitar) {
      const response = await fetch(
        `${window.API_PRODUCTO_CATEGORIAS_BASE}${productoActual.idProducto}/categorias/${idCategoria}/remove`,
        {
          method: 'DELETE',
          headers: {
            'X-CSRFToken': csrftoken
          }
        }
      );
      const data = await response.json();
      if (!data.ok) {
        console.error(`Error al quitar categoría ${idCategoria}:`, data.msg);
      } else {
        console.log(`✅ Categoría ${idCategoria} quitada exitosamente`);
      }
    }

    cerrarModalCategorias();
    cargarProductosDesdeAPI();
    mostrarNotificacion('Categorías actualizadas exitosamente');
  } catch (error) {
    console.error('Error al actualizar categorías:', error);
    mostrarError('Error de conexión al actualizar categorías');
  }
}

function limpiarErrores() {
  const errores = document.querySelectorAll('.error');
  errores.forEach(error => {
    error.textContent = '';
    error.style.display = 'none';
  });
}

function mostrarError(campo, mensaje) {
  limpiarErrores(); // Limpiar errores previos
  const errorEl = document.getElementById(`err-${campo}`);
  if (errorEl) {
    errorEl.textContent = mensaje;
    errorEl.style.display = 'block';
    
    // Hacer scroll al campo con error
    const campoEl = document.getElementById(campo) || document.getElementById(`form${campo.charAt(0).toUpperCase() + campo.slice(1)}`);
    if (campoEl) {
      campoEl.focus();
      campoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function mostrarNotificacion(mensaje) {
  if (!document.getElementById('notificacion')) {
    const notif = document.createElement('div');
    notif.id = 'notificacion';
    notif.className = 'notificacion';
    document.body.appendChild(notif);
  }

  const notif = document.getElementById('notificacion');
  notif.textContent = mensaje;
  notif.classList.add('show');

  setTimeout(() => {
    notif.classList.remove('show');
  }, 3000);
}

document.addEventListener('click', (e) => {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    if (e.target === modal) {
      modal.style.display = 'none';
      productoActual = null;
    }
  });
});

