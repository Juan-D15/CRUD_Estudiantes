// static/js/actualizar.js
(function () {
  const API_BASE = ""; // prefijo si aplica

  function getCookie(name) {
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    if (p.length === 2) return p.pop().split(";").shift();
  }

  const $ = (id) => document.getElementById(id);
  
  // Elementos del formulario de búsqueda
  const idEstudiante = $("idEstudiante");
  const btnBuscar = $("btnBuscar");
  const msgBuscar = $("msgBuscar");
  const errId = $("err-id");
  const frmBuscar = $("frmBuscar");
  
  // Panel y formulario de actualización
  const panelActualizar = $("panelActualizar");
  const frmActualizar = $("frmActualizar");
  const nombres = $("nombres");
  const apellidos = $("apellidos");
  const correo = $("correo");
  const telefono = $("telefono");
  const btnActualizar = $("btnActualizar");
  const msgActualizar = $("msgActualizar");
  
  // Campos de error
  const errNombres = $("err-nombres");
  const errApellidos = $("err-apellidos");
  const errCorreo = $("err-correo");
  const errTelefono = $("err-telefono");

  let currentId = null;

  // Limpiar mensajes de error
  function clearErrors() {
    [errId, errNombres, errApellidos, errCorreo, errTelefono].forEach(el => {
      if (el) el.textContent = "";
    });
    [idEstudiante, nombres, apellidos, correo, telefono].forEach(el => {
      if (el) el.parentElement?.classList.remove("error");
    });
  }

  // Mostrar error en campo específico
  function showError(field, message) {
    const errorEl = $(`err-${field}`);
    const inputEl = $(`${field === 'id' ? 'idEstudiante' : field}`);
    
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.parentElement?.classList.add("error");
  }

  // Validar formulario de búsqueda
  function validateBuscar() {
    clearErrors();
    const id = idEstudiante.value.trim();
    
    if (!id) {
      showError('id', 'Ingrese el ID del estudiante');
      return false;
    }
    
    if (!/^\d+$/.test(id)) {
      showError('id', 'El ID debe ser un número');
      return false;
    }
    
    return true;
  }

  // Validar formulario de actualización
  function validateActualizar() {
    clearErrors();
    let valid = true;
    
    if (!nombres.value.trim()) {
      showError('nombres', 'Los nombres son obligatorios');
      valid = false;
    }
    
    if (!apellidos.value.trim()) {
      showError('apellidos', 'Los apellidos son obligatorios');
      valid = false;
    }
    
    if (!correo.value.trim()) {
      showError('correo', 'El correo es obligatorio');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim())) {
      showError('correo', 'Ingrese un correo válido');
      valid = false;
    }
    
    if (!telefono.value.trim()) {
      showError('telefono', 'El teléfono es obligatorio');
      valid = false;
    } else if (!/^\d{8}$/.test(telefono.value.trim())) {
      showError('telefono', 'El teléfono debe tener 8 dígitos');
      valid = false;
    }
    
    return valid;
  }

  // Buscar estudiante
  async function buscarEstudiante(id) {
    try {
      const res = await fetch(`${API_BASE}/api/estudiantes/${id}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          msgBuscar.textContent = "Estudiante no encontrado.";
          msgBuscar.className = "msg error";
          return null;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      msgBuscar.textContent = "Estudiante encontrado.";
      msgBuscar.className = "msg success";
      return data;
      
    } catch (err) {
      console.error(err);
      msgBuscar.textContent = "Error al buscar el estudiante.";
      msgBuscar.className = "msg error";
      return null;
    }
  }

  // Cargar datos en el formulario de actualización
  function cargarDatos(data) {
    currentId = data.idEstudiante;
    nombres.value = data.nombres || "";
    apellidos.value = data.apellidos || "";
    correo.value = data.correo || "";
    telefono.value = data.telefono || "";
    
    // Mostrar panel de actualización
    panelActualizar.classList.remove("hidden");
    panelActualizar.setAttribute("aria-hidden", "false");
    
    // Limpiar mensajes previos
    msgActualizar.textContent = "";
  }

  // Actualizar estudiante
  async function actualizarEstudiante() {
    if (!currentId) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/estudiantes/${currentId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || ""
        },
        body: JSON.stringify({
          nombres: nombres.value.trim(),
          apellidos: apellidos.value.trim(),
          correo: correo.value.trim(),
          telefono: telefono.value.trim()
        })
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      if (data?.rc === 0) {
        msgActualizar.textContent = "Estudiante actualizado correctamente.";
        msgActualizar.className = "msg success";
      } else if (data?.rc === 6) {
        msgActualizar.textContent = "Estudiante no encontrado.";
        msgActualizar.className = "msg error";
      } else if (data?.rc === 2) {
        msgActualizar.textContent = "El correo ya está registrado.";
        msgActualizar.className = "msg error";
        showError('correo', 'Este correo ya está en uso');
      } else {
        msgActualizar.textContent = `Error al actualizar (código ${data?.rc ?? "?"}).`;
        msgActualizar.className = "msg error";
      }
      
    } catch (err) {
      console.error(err);
      msgActualizar.textContent = "Error de red/servidor al actualizar.";
      msgActualizar.className = "msg error";
    }
  }

  // Event Listeners
  btnBuscar?.addEventListener("click", async (e) => {
    e.preventDefault();
    
    if (!validateBuscar()) return;
    
    const id = parseInt(idEstudiante.value.trim());
    const data = await buscarEstudiante(id);
    
    if (data) {
      cargarDatos(data);
    } else {
      // Ocultar panel de actualización si no se encuentra
      panelActualizar.classList.add("hidden");
      panelActualizar.setAttribute("aria-hidden", "true");
    }
  });

  frmActualizar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!validateActualizar()) return;
    
    await actualizarEstudiante();
  });

  // Permitir buscar con Enter
  idEstudiante?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnBuscar.click();
    }
  });

  // Limpiar mensajes cuando se modifica el input de búsqueda
  idEstudiante?.addEventListener("input", () => {
    msgBuscar.textContent = "";
    panelActualizar.classList.add("hidden");
    panelActualizar.setAttribute("aria-hidden", "true");
    clearErrors();
  });

})();