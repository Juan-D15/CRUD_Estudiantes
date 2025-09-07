// static/js/eliminar.js
(function () {
  const API_BASE = ""; // prefijo si aplica

  function getCookie(name) {
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    if (p.length === 2) return p.pop().split(";").shift();
  }

  const $ = (id) => document.getElementById(id);
  const tbody = $("tbodyEstudiantes");
  const msg   = $("msg");

  // Modal
  const overlay     = $("overlay");
  const modal       = $("modal");
  const mId         = $("m-id");
  const mNombre     = $("m-nombre");
  const mApellido   = $("m-apellido");
  const mCorreo     = $("m-correo");
  const mFecha      = $("m-fecha");
  const btnCancelar = $("btnCancelar");
  const btnEliminar = $("btnEliminar");

  let currentId = null;

  function openModal(row) {
    currentId = row.idEstudiante;
    mId.textContent = row.idEstudiante;
    mNombre.textContent = row.nombres;
    mApellido.textContent = row.apellidos;
    mCorreo.textContent = row.correo;
    mFecha.textContent = row.fechaRegistro ? String(row.fechaRegistro).replace("T"," ").slice(0,19) : "";
    overlay.classList.remove("hidden");
    modal.classList.remove("hidden");
  }
  function closeModal() {
    overlay.classList.add("hidden");
    modal.classList.add("hidden");
    currentId = null;
  }

  async function cargarTabla() {
    try {
      const res = await fetch(`${API_BASE}/api/estudiantes`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = data?.data ?? [];
      tbody.innerHTML = "";

      list.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.idEstudiante}</td>
          <td>${row.nombres}</td>
          <td>${row.apellidos}</td>
          <td>${row.correo}</td>
          <td>${row.fechaRegistro ? String(row.fechaRegistro).replace("T"," ").slice(0,19) : ""}</td>
          <td class="col-actions">
            <button class="btn-trash" aria-label="Eliminar">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </td>
        `;
        tr.querySelector(".btn-trash").addEventListener("click", () => openModal(row));
        tbody.appendChild(tr);
      });

      msg.textContent = list.length ? "" : "No hay estudiantes registrados.";
    } catch (err) {
      console.error(err);
      msg.textContent = "Error al cargar la tabla.";
    }
  }

  async function eliminar(id) {
    const res = await fetch(`${API_BASE}/api/estudiantes/${id}/delete`, {
      method: "DELETE",
      headers: { "X-CSRFToken": getCookie("csrftoken") || "" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  btnCancelar?.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });
  overlay?.addEventListener("click", closeModal);

  btnEliminar?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!currentId) return;
    try {
      const data = await eliminar(currentId);
      if (data?.rc === 0) {
        msg.textContent = "Eliminado correctamente.";
        closeModal();
        cargarTabla();
      } else if (data?.rc === 6) {
        msg.textContent = "No encontrado (rc=6).";
      } else {
        msg.textContent = `Error al eliminar (rc=${data?.rc ?? "?"}).`;
      }
    } catch (err) {
      console.error(err);
      msg.textContent = "Error de red/servidor al eliminar.";
    }
  });

  // init
  cargarTabla();
})();
