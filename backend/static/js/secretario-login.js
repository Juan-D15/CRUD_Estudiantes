// Login JS para secretario. Maneja: validaciones de campos, compatibilidad con reCAPTCHA v2,
// soporte opcional para captcha simple (si existen #captchaQ/#captchaA), toggle de recuperación
// y envío simulado de código. Solo bloqueamos el submit si hay errores; si todo está ok, dejamos
// que el formulario haga POST a Django.

document.addEventListener('DOMContentLoaded', () => {
  const $ = (sel) => document.querySelector(sel);

  // ---------- Utilidades ----------
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function text(el, t) { if (el) el.textContent = t || ''; }

  // Crea contenedor de error para captcha si no existe
  function ensureCaptchaErrorEl() {
    let el = document.getElementById('eCaptcha');
    if (!el) {
      const g = document.querySelector('.g-recaptcha');
      if (g && g.parentNode) {
        el = document.createElement('p');
        el.id = 'eCaptcha';
        el.className = 'err';
        g.parentNode.insertBefore(el, g.nextSibling);
      }
    }
    return el;
  }

  // ---------- Captcha simple (opcional) ----------
  const capQ = $('#captchaQ');
  const capA = $('#captchaA');
  const capBtn = $('#btnNewCaptcha');
  let capAns = null;

  function newCaptcha() {
    const a = Math.floor(1 + Math.random()*9);
    const b = Math.floor(1 + Math.random()*9);
    capAns = a + b;
    if (capQ) capQ.textContent = `${a} + ${b} = ?`;
  }

  if (capQ && capA) {
    newCaptcha();
    if (capBtn) capBtn.addEventListener('click', (e)=>{ e.preventDefault(); newCaptcha(); });
  }

  // ---------- Toggle recuperación ----------
  const btnToggle  = $('#toggleForgot');
  const forgotForm = $('#formForgot');
  if (btnToggle && forgotForm) {
    btnToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const hidden = forgotForm.classList.toggle('hidden');
      btnToggle.textContent = hidden ? 'Olvidé mi contraseña' : 'Volver al login';
      btnToggle.setAttribute('aria-expanded', String(!hidden));
    });
  }

  // ---------- Validación de Login ----------
  function validateLogin() {
    const u = $('#usuario')?.value.trim() || '';
    const p = $('#password')?.value || '';
    const eU = $('#eUsuario');
    const eP = $('#ePassword');
    const eC = ensureCaptchaErrorEl();

    text(eU, ''); text(eP, ''); text(eC, '');

    let ok = true;
    if (!u) { text(eU, 'Ingresa tu usuario o correo.'); ok = false; }
    if (!p) { text(eP, 'Ingresa tu contraseña.'); ok = false; }

    // 1) Si existe captcha simple, validarlo
    if (capQ && capA) {
      const val = capA.value.trim();
      if (val === '' || Number(val) !== capAns) { text(eC, 'Captcha incorrecto.'); ok = false; }
    } else {
      // 2) Si hay Google reCAPTCHA, validar que esté marcado
      if (typeof grecaptcha !== 'undefined') {
        const resp = grecaptcha.getResponse();
        if (!resp) { text(eC, 'Marca el reCAPTCHA.'); ok = false; }
      }
    }
    return ok;
  }

  const form = $('#formLogin');
  if (form) {
    form.addEventListener('submit', (e) => {
      if (!validateLogin()) { e.preventDefault(); }
      // Si pasa validación, dejamos que Django procese el POST
    });
  }

  // ---------- Recuperación: Enviar código ----------
  const btnSend = $('#btnSendCode');
  const recEmail = $('#recEmail');
  const sendMsg = $('#sendCodeMsg');

  function setSendMsg(t, kind='info') {
    if (!sendMsg) return;
    sendMsg.textContent = t || '';
    sendMsg.style.color = (kind==='err') ? '#fca5a5' : (kind==='ok' ? '#a7f3d0' : 'rgba(255,255,255,.85)');
  }

  if (btnSend) {
    btnSend.addEventListener('click', async () => {
      const email = (recEmail?.value || '').trim();
      if (!emailRe.test(email)) { setSendMsg('Correo inválido.', 'err'); recEmail?.focus(); return; }
      btnSend.disabled = true;
      setSendMsg('Verificando correo y enviando código…');
      // TODO: fetch al backend
      setTimeout(() => { btnSend.disabled = false; setSendMsg('Si el correo existe, te llegará un código.', 'ok'); }, 800);
    });
  }

  // ---------- Recuperación: Validar código y continuar ----------
  const btnRecover = $('#btnRecuperar');
  if (btnRecover) {
    btnRecover.addEventListener('click', () => {
      const email = (recEmail?.value || '').trim().toLowerCase();
      const code  = $('#recCode')?.value.trim() || '';
      if (!emailRe.test(email)) { setSendMsg('Correo inválido.', 'err'); recEmail?.focus(); return; }
      if (!/^\d{6}$/.test(code)) { setSendMsg('El código debe tener 6 dígitos.', 'err'); $('#recCode')?.focus(); return; }
      // En el futuro: validar con backend. Por ahora, navegar a la página de reset.
      window.location.href = 'secretario-reset.html';
    });
  }
});
