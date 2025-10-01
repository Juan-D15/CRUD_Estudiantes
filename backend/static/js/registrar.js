// static/js/registrar.js
(function () {
  const API_BASE = ""; // si tus rutas tienen prefijo, ponlo aquí (p.ej. "/backend")

  function getCookie(name) {
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    if (p.length === 2) return p.pop().split(";").shift();
  }

  const $ = (id) => document.getElementById(id);

  const form = $("frmRegistrar");
  const inpN = $("nombres");
  const inpA = $("apellidos");
  const inpC = $("correo");
  const inpT = $("telefono");

  const errN = $("err-nombres");
  const errA = $("err-apellidos");
  const errC = $("err-correo");
  const errT = $("err-telefono");
  const msg  = $("msg");

  function clearErrors() {
    [errN, errA, errC, errT].forEach(e => e && (e.textContent = ""));
    msg && (msg.textContent = "");
  }

  function validate() {
    let ok = true;
    const n = (inpN.value || "").trim();
    const a = (inpA.value || "").trim();
    const c = (inpC.value || "").trim();
    const t = (inpT.value || "").trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (n === "") { errN.textContent = "Nombre vacío (error 1)"; ok = false; }
    if (a === "") { errA.textContent = "Apellido vacío (error 2)"; ok = false; }
    if (!emailRe.test(c)) { errC.textContent = "Correo inválido"; ok = false; }
    if (!/^\d{8}$/.test(t)) { errT.textContent = "Teléfono inválido (8 dígitos) (error 4)"; ok = false; }

    return ok;
  }

  async function crearEstudiante(payload) {
    const res = await fetch(`${API_BASE}/api/estudiantes/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken") || ""
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    if (!validate()) return;

    try {
      const payload = {
        nombres: inpN.value.trim(),
        apellidos: inpA.value.trim(),
        correo: inpC.value.trim(),
        telefono: inpT.value.trim(),
      };
      const data = await crearEstudiante(payload);
      const { rc, id } = data || {};

      if (rc === 0) {
        msg.textContent = `Registrado correctamente (ID: ${id ?? "?"}).`;
        form.reset();
      } else if (rc === 5) {
        msg.textContent = "Error BD (posible correo duplicado).";
      } else {
        msg.textContent = `Error de validación (rc=${rc}).`;
      }
    } catch (err) {
      console.error(err);
      msg.textContent = "Error de red/servidor al registrar.";
    }
  });
})();
