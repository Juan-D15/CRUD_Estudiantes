// static/js/reset.js
// Cambia contraseña con token ya inyectado por el servidor.
// Si no hay token, muestra error (no auto-envía correo).

document.addEventListener('DOMContentLoaded', () => {
  const $ = s => document.querySelector(s);

  const form     = $('#formReset');
  const pwd1     = $('#pwd1');
  const pwd2     = $('#pwd2');
  const e2       = $('#e2');
  const s1       = $('#s1');
  const tokenHid = $('#token');
  const emailHid = $('#email');
  const emailView= $('#emailView');
  const roleLbl  = $('#roleLabel');

  // ---------- helpers ----------
  function setMsg(text, ok=false) {
    if (!e2) return;
    e2.textContent = text || '';
    e2.style.color = ok ? '#62d26f' : '#ff6b6b';
  }
  function getCSRF() {
    const m = document.cookie.match(/(?:^|;)\s*csrftoken=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
    const el = document.querySelector('input[name=csrfmiddlewaretoken]');
    return el ? el.value : '';
  }
  function checkStrength(v) {
    const ok = (/.{8,}/.test(v) && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^0-9A-Za-z]/.test(v));
    if (s1) s1.textContent = ok
      ? 'Contraseña fuerte ✔︎'
      : 'Debe tener 8+, mayúscula, minúscula, número y símbolo';
    return ok;
  }

  // 👁️ Mostrar/ocultar (mismo comportamiento que tenías)
  document.querySelectorAll('.toggle-eye, [data-toggle="password"]').forEach(btn => {
    btn.addEventListener('click', () => {
      let input = btn.previousElementSibling;
      if ((!input || input.tagName !== 'INPUT') && btn.dataset.target) {
        input = document.querySelector(btn.dataset.target);
      }
      if (!input || input.tagName !== 'INPUT') return;
      const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', type);
      btn.querySelector('.eye')?.classList.toggle('hidden', type !== 'password');
      (btn.querySelector('.eye-off') || btn.querySelector('.eye-closed'))?.classList
        .toggle('hidden', type === 'password');
      btn.setAttribute('aria-pressed', type === 'text' ? 'true' : 'false');
    });
  });

  // Si la vista no pudo inyectar email, traemos el del usuario logueado
  (async function fillEmailFromSessionIfMissing(){
    const hasEmail = (emailView?.value?.trim() || emailHid?.value?.trim());
    if (hasEmail) return;
    try {
      const r = await fetch('/api/usuarios/0', {
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (!r.ok) return;
      const j = await r.json();       // { rc:0, user:{...} }
      const u = j.user || j;
      if (emailView) emailView.value = u.correo || '';
      if (emailHid)  emailHid.value  = u.correo || '';
      if (roleLbl) roleLbl.textContent = (u.rol === 'admin' ? 'Administrador' : 'Secretario(a)');
    } catch {}
  })();

  // Medidor de fuerza
  pwd1?.addEventListener('input', e => checkStrength(e.target.value));

  // ---------- submit ----------
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    setMsg('');

    const token = tokenHid?.value || '';
    if (!token) { setMsg('No se pudo preparar el cambio. Recarga la página e inténtalo de nuevo.'); return; }

    const v1 = pwd1?.value || '';
    const v2 = pwd2?.value || '';
    if (!checkStrength(v1)) { setMsg('Contraseña débil.'); return; }
    if (v1 !== v2)           { setMsg('Las contraseñas no coinciden.'); return; }

    try {
      const res = await fetch('/auth/reset/commit', {
        method: 'POST',
        headers: { 'Content-Type':'application/x-www-form-urlencoded', 'X-CSRFToken': getCSRF() },
        body: new URLSearchParams({ token: token, pwd1: v1, pwd2: v2, email: emailHid?.value || '' }),
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const j = await res.json().catch(()=> ({}));
      if (!res.ok || j.ok === false) { setMsg(j.msg || 'No se pudo cambiar la contraseña.'); return; }

      alert('¡Contraseña actualizada! Ahora inicia sesión.');
      window.location.href = window.LOGIN_BACK_URL || '/login/';
    } catch {
      setMsg('Error de red. Intenta de nuevo.');
    }
  });

  // Cancelar
  $('#btnCancel')?.addEventListener('click', () => {
    window.location.href = window.LOGIN_BACK_URL || '/login/';
  });
});
