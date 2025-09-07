// static/js/listado.js
(function () {
  const API_BASE = ""; // prefijo si aplica

  const $ = (id) => document.getElementById(id);

  const tbody = $("tbody");
  const msg   = $("msg");
  const btnRefrescar = $("btnRefrescar");

  // Modal informativo
  const overlay = $("overlay");
  const modal   = $("modal");
  const mId = $("m-id"), mN = $("m-nombres"), mA = $("m-apellidos"),
        mC = $("m-correo"), mT = $("m-telefono"), mF = $("m-fecha");
  const btnVolver = $("btnVolver");

  function openModal(row) {
    mId.textContent = row.idEstudiante;
    mN.textContent  = row.nombres;
    mA.textContent  = row.apellidos;
    mC.textContent  = row.correo;
    mT.textContent  = row.telefono ?? "";
    mF.textContent  = row.fechaRegistro ? String(row.fechaRegistro).replace("T"," ").slice(0,19) : "";
    overlay.classList.remove("hidden");
    modal.classList.remove("hidden");
  }
  function closeModal() {
    overlay.classList.add("hidden");
    modal.classList.add("hidden");
  }

  async function cargar() {
    try {
      const res = await fetch(`${API_BASE}/api/estudiantes`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json();
      const list = data ?? [];
      tbody.innerHTML = "";

      list.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.idEstudiante}</td>
          <td>${row.nombres}</td>
          <td>${row.apellidos}</td>
          <td>${row.correo}</td>
          <td>${row.telefono ?? ""}</td>
          <td>${row.fechaRegistro ? String(row.fechaRegistro).replace("T"," ").slice(0,19) : ""}</td>
        `;
        tr.addEventListener("click", () => openModal(row));
        tbody.appendChild(tr);
      });

      msg.textContent = list.length ? "" : "No hay estudiantes para mostrar.";
    } catch (err) {
      console.error(err);
      msg.textContent = "Error al cargar el listado.";
    }
  }

  btnRefrescar?.addEventListener("click", (e) => { e.preventDefault(); cargar(); });
  overlay?.addEventListener("click", closeModal);
  btnVolver?.addEventListener("click", (e) => { e.preventDefault(); closeModal(); });

  // init
  cargar();
})();
