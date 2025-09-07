// static/js/actualizar.js
(function () {
  const API_BASE = ""; // prefijo si aplica

  function getCookie(name) {
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    if (p.length === 2) return p.pop().split(";").shift();
  }

  const $ = (id) => document.getElementById(id);

  // Buscar
  const frmBuscar = $("frmBuscar");
  const idInput   = $("idEstudiante");
  const msgBuscar = $("msgBuscar");
  const btnBuscar = $("btnBuscar");

  // Panel/Actualizar
  const panelAct  = $("panelActualizar");
  const frmAct    = $("frmActualizar");
  const uN        = $("nombres");
  const uA        = $("apellidos");
  const uC        = $("correo");
  const uT        = $("telefono");

  const eN = $("err-nombres");
  const eA = $("err-apellidos");
  const eC = $("err-correo");
  const eT = $("err-telefono");
  const msgAct = $("msgActualizar");

  function showPanel(show) {
    if (!panelAct) return;
    if (show) {
      panelAct.classList.remove("hidden");
      panelAct.setAttribute("aria-hidden", "false");
    } else {
      panelAct.classList.add("hidden");
      panelAct.setAttribute("aria-hidden", "true");
    }
  }

  function clearUpdateErrors() {
    [eN, eA, eC, eT].forEach(e => e && (e.textContent = ""));
    msgAct && (msgAct.textContent = "");
  }

  function validateUpdate() {
    let ok = true;
    const n = (uN.value || "").trim();
    const a = (uA.value || "").trim();
    const c = (uC.value || "").trim();
    const t = (uT.value || "").trim();

    if (n === "") { eN.textContent = "Nombre vacío (error 1)"; ok = false; }
    if (a === "") { eA.textContent = "Apellido vacío (error 2)"; ok = false; }
    if (!c.includes("@")) { eC.textContent = 'Correo sin "@" (error 3)'; ok = false; }
    if (!/^\d{8}$/.test(t)) { eT.textContent = "Teléfono inválido (8 dígitos) (error 4)"; ok = false; }

    return ok;
  }

  async function fetchDetalle(id) {
    const res = await fetch(`${API_BASE}/api/estudiantes/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function fetchActualizar(id, payload) {
    const res = await fetch(`${API_BASE}/api/estudiantes/${id}/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken") || ""
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  frmBuscar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgBuscar.textContent = "";

    const id = (idInput.value || "").trim();
    if (!/^\d+$/.test(id)) {
      msgBuscar.textContent = "Ingresa un ID válido.";
      showPanel(false);
      return;
    }

    try {
      const data = await fetchDetalle(id);
      if (!data) {
        msgBuscar.textContent = "Estudiante no encontrado (rc=6).";
        showPanel(false);
        return;
      }
      uN.value = data.nombres || "";
      uA.value = data.apellidos || "";
      uC.value = data.correo || "";
      uT.value = data.telefono || "";

      showPanel(true);
    } catch (err) {
      console.error(err);
      msgBuscar.textContent = "Error al consultar el estudiante.";
      showPanel(false);
    }
  });

  btnBuscar?.addEventListener("click", (e) => {
    e.preventDefault();
    frmBuscar?.dispatchEvent(new Event("submit", { cancelable: true }));
  });

  frmAct?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearUpdateErrors();

    const id = (idInput.value || "").trim();
    if (!/^\d+$/.test(id)) {
      msgAct.textContent = "ID inválido.";
      return;
    }
    if (!validateUpdate()) return;

    try {
      const payload = {
        nombres: uN.value.trim(),
        apellidos: uA.value.trim(),
        correo: uC.value.trim(),
        telefono: uT.value.trim(),
      };
      const data = await fetchActualizar(id, payload);
      const { rc } = data || {};
      if (rc === 0) {
        msgAct.textContent = "Actualizado correctamente.";
      } else if (rc === 6) {
        msgAct.textContent = "Estudiante no encontrado (rc=6).";
      } else if (rc === 5) {
        msgAct.textContent = "Error BD (posible correo duplicado).";
      } else {
        msgAct.textContent = `Error de validación (rc=${rc}).`;
      }
    } catch (err) {
      console.error(err);
      msgAct.textContent = "Error de red/servidor al actualizar.";
    }
  });
})();
