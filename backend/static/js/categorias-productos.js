// Variables globales
let categorias = [];
let categoriaActual = null;
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

  // Event listeners
  if (btnCrear) btnCrear.addEventListener('click', () => abrirModalCrear());
  if (searchInput) searchInput.addEventListener('input', () => buscarCategorias());

  // Cargar categorías al inicio
  cargarCategoriasDesdeAPI();
});

// Cargar categorías desde la API
async function cargarCategoriasDesdeAPI() {
  try {
    const busqueda = document.getElementById('search')?.value || '';
    const url = `${window.API_CATEGORIAS_LISTAR}?buscar=${encodeURIComponent(busqueda)}&page=${paginaActual}&pageSize=${itemsPorPagina}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-CSRFToken': csrftoken
      }
    });
    
    const data = await response.json();
    
    if (data.ok) {
      categorias = data.data || [];
      renderizarCategorias(data.data || [], data.total || 0);
    } else {
      console.error('Error al cargar categorías:', data.msg);
      mostrarError('Error al cargar categorías');
    }
  } catch (error) {
    console.error('Error en la petición:', error);
    mostrarError('Error de conexión');
  }
}

function renderizarCategorias(items, total) {
  const tbody = document.getElementById('tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No se encontraron categorías</td></tr>';
  } else {
    items.forEach(categoria => {
      const tr = document.createElement('tr');
      const fechaFormateada = categoria.fechaCreacion ? 
        new Date(categoria.fechaCreacion).toLocaleDateString('es-ES') : 'N/A';
      
      tr.innerHTML = `
        <td>${categoria.idCategoria || 'N/A'}</td>
        <td>${categoria.nombre || 'N/A'}</td>
        <td><span class="badge ${categoria.estado}">${categoria.estado === 'activa' ? 'Activa' : 'Inactiva'}</span></td>
        <td>${fechaFormateada}</td>
        <td class="actions">
          <button class="btn-action btn-edit" onclick="editarCategoria(${categoria.idCategoria})">Editar</button>
          <button class="btn-action btn-delete" onclick="eliminarCategoria(${categoria.idCategoria})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Actualizar paginación
  const totalPaginas = Math.ceil(total / itemsPorPagina);
  actualizarPaginacion(totalPaginas);
}

// Función de búsqueda
function buscarCategorias() {
  paginaActual = 1;
  cargarCategoriasDesdeAPI();
}

function actualizarPaginacion(totalPaginas) {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;
  
  pagination.innerHTML = '';

  if (totalPaginas <= 1) return;

  // Botón Anterior
  const btnAnterior = document.createElement('button');
  btnAnterior.textContent = '←';
  btnAnterior.disabled = paginaActual === 1;
  btnAnterior.addEventListener('click', () => {
    if (paginaActual > 1) {
      paginaActual--;
      cargarCategoriasDesdeAPI();
    }
  });
  pagination.appendChild(btnAnterior);

  // Números de página
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.classList.toggle('active', i === paginaActual);
    btn.addEventListener('click', () => {
      paginaActual = i;
      cargarCategoriasDesdeAPI();
    });
    pagination.appendChild(btn);
  }

  // Botón Siguiente
  const btnSiguiente = document.createElement('button');
  btnSiguiente.textContent = '→';
  btnSiguiente.disabled = paginaActual === totalPaginas;
  btnSiguiente.addEventListener('click', () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      cargarCategoriasDesdeAPI();
    }
  });
  pagination.appendChild(btnSiguiente);
}

function abrirModalCrear() {
  categoriaActual = null;
  mostrarModalFormulario('Nueva Categoría');
}

function editarCategoria(id) {
  categoriaActual = categorias.find(c => c.idCategoria === id);
  if (!categoriaActual) return;

  mostrarModalFormulario('Editar Categoría');
  
  // Llenar el formulario
  document.getElementById('formNombre').value = categoriaActual.nombre;
  document.getElementById('formEstado').value = categoriaActual.estado;
}

function mostrarModalFormulario(titulo) {
  // Crear modal si no existe
  if (!document.getElementById('modalForm')) {
    const modal = document.createElement('div');
    modal.id = 'modalForm';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${titulo}</h2>
          <button class="modal-close" onclick="cerrarModal()">&times;</button>
        </div>
        <form id="formCategoria" onsubmit="guardarCategoria(event)">
          <div class="field">
            <input type="text" id="formNombre" name="nombre" placeholder="Nombre de la categoría" required autocomplete="off" />
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </span>
            <small id="err-nombre" class="error"></small>
          </div>
          
          <div class="field">
            <select id="formEstado" name="estado" required>
              <option value="">Seleccione el estado</option>
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 7h18M3 12h18M3 17h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </span>
            <small id="err-estado" class="error"></small>
          </div>

          <button type="submit" class="btn-primary">Guardar</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    document.querySelector('#modalForm .modal-header h2').textContent = titulo;
  }

  // Mostrar modal
  document.getElementById('modalForm').style.display = 'flex';

  // Si es edición, actualizar formulario
  if (categoriaActual) {
    document.getElementById('formNombre').value = categoriaActual.nombre;
    document.getElementById('formEstado').value = categoriaActual.estado;
  } else {
    document.getElementById('formCategoria').reset();
  }
}

function cerrarModal() {
  document.getElementById('modalForm').style.display = 'none';
  categoriaActual = null;
}

async function guardarCategoria(event) {
  event.preventDefault();

  const nombre = document.getElementById('formNombre').value.trim();
  const estado = document.getElementById('formEstado').value;

  if (!nombre) {
    mostrarError('nombre', 'El nombre es requerido');
    return;
  }

  try {
    let url, method, body;
    
    if (categoriaActual) {
      // Actualizar
      url = `/api/categorias/${categoriaActual.idCategoria}/update`;
      method = 'PUT';
      body = JSON.stringify({ nombre, estado });
    } else {
      // Crear
      url = window.API_CATEGORIAS_CREAR;
      method = 'POST';
      body = JSON.stringify({ nombre, estado });
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
      cerrarModal();
      cargarCategoriasDesdeAPI();
      mostrarNotificacion(
        categoriaActual ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente'
      );
    } else {
      mostrarError('nombre', data.msg || 'Error al guardar la categoría');
    }
  } catch (error) {
    console.error('Error al guardar:', error);
    mostrarError('nombre', 'Error de conexión');
  }
}

async function eliminarCategoria(id) {
  const categoria = categorias.find(c => c.idCategoria === id);
  if (!categoria) return;

  if (confirm(`¿Estás seguro de eliminar la categoría "${categoria.nombre}"?`)) {
    try {
      const response = await fetch(`/api/categorias/${id}/delete`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrftoken
        }
      });

      const data = await response.json();

      if (data.ok) {
        cargarCategoriasDesdeAPI();
        mostrarNotificacion('Categoría eliminada exitosamente');
      } else {
        alert(data.msg || 'Error al eliminar la categoría');
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error de conexión');
    }
  }
}

function mostrarError(campo, mensaje) {
  const errorEl = document.getElementById(`err-${campo}`);
  if (errorEl) {
    errorEl.textContent = mensaje;
    errorEl.style.display = 'block';
  }
}

function mostrarNotificacion(mensaje) {
  // Crear notificación si no existe
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

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
  const modal = document.getElementById('modalForm');
  if (e.target === modal) {
    cerrarModal();
  }
});
