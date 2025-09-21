// static/js/reset.js
// Maneja la UI de cambio de contraseña con token (admin_reset / secretario_reset)
document.addEventListener('DOMContentLoaded', () => {
  const $ = s => document.querySelector(s);

  const form = $('#formReset');
  const pwd1 = $('#pwd1');
  const pwd2 = $('#pwd2');
  const e2   = $('#e2');
  const s1   = $('#s1');

  // Botón "ojo" mostrar/ocultar
  const eyes = document.querySelectorAll('.toggle-eye');
  eyes.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', type);
      btn.querySelector('.eye')?.classList.toggle('hidden', type !== 'password');
      btn.querySelector('.eye-off')?.classList.toggle('hidden', type === 'password');
      btn.setAttribute('aria-pressed', type === 'text' ? 'true' : 'false');
    });
  });

  // Hidrata campos ocultos y el email visible desde la URL si llegan por querystring
  (function hydrateFromQuery(){
    const qs = new URLSearchParams(location.search);
    const hiddenToken = $('#token');
    const hiddenEmail = $('#email');
    if (hiddenToken && !hiddenToken.value && qs.get('t')) hiddenToken.value = qs.get('t');
    if (hiddenEmail && !hiddenEmail.value && qs.get('e')) hiddenEmail.value = qs.get('e');
    const emailView = $('#emailView');
    if (emailView && !emailView.value && qs.get('e')) emailView.value = qs.get('e');
  })();

  function checkStrength(v) {
    const ok = (/.{8,}/.test(v) && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^0-9A-Za-z]/.test(v));
    if (s1) s1.textContent = ok
      ? 'Contraseña fuerte ✔︎'
      : 'Debe tener 8+, mayúscula, minúscula, número y símbolo';
    return ok;
  }
  pwd1?.addEventListener('input', e => checkStrength(e.target.value));

  function getCSRF() {
    const m = document.cookie.match(/(?:^|;)\s*csrftoken=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
    const el = document.querySelector('input[name=csrfmiddlewaretoken]');
    return el ? el.value : '';
  }

  // Helpers para leer token/email SIEMPRE frescos (del hidden o de la URL)
  function getToken() {
    const qs = new URLSearchParams(location.search);
    return ($('#token')?.value || qs.get('t') || '').trim();
  }
  function getEmail() {
    const qs = new URLSearchParams(location.search);
    return ($('#email')?.value || qs.get('e') || '').trim();
  }

  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    e2.textContent = '';

    const v1 = pwd1.value || '';
    const v2 = pwd2.value || '';
    const token = getToken();     // <-- AHORA se lee en el submit
    const email = getEmail();

    if (!checkStrength(v1)) { e2.textContent = 'Contraseña débil.'; return; }
    if (v1 !== v2)           { e2.textContent = 'Las contraseñas no coinciden.'; return; }
    if (!token)              { e2.textContent = 'Token inválido. Vuelve desde el enlace del correo.'; return; }

    try {
      const res = await fetch('/auth/reset/commit', {
        method: 'POST',
        headers: {'Content-Type':'application/x-www-form-urlencoded','X-CSRFToken': getCSRF()},
        body: new URLSearchParams({ token, pwd1: v1, pwd2: v2, email })
      });
      const j = await res.json();
      if (!j.ok) { e2.textContent = j.msg || 'No se pudo cambiar la contraseña.'; return; }
      alert('¡Contraseña actualizada! Ahora inicia sesión.');
      window.location.href = window.LOGIN_BACK_URL || '/login/';
    } catch (err) {
      e2.textContent = 'Error de red. Intenta de nuevo.';
    }
  });

  $('#btnCancel')?.addEventListener('click', () => {
    window.location.href = window.LOGIN_BACK_URL || '/login/';
  });
});
