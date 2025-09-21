// static/js/admin-login.js
// Login + recuperación (enviar/validar código). Muestra mensajes y escribe logs en consola.

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const role = (document.body.dataset.role || 'admin').toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const eUsuario = $('#eUsuario');
  const ePassword = $('#ePassword');
  const sendMsg = $('#sendCodeMsg');
  const recEmail = $('#recEmail');

  const capQ = $('#captchaQ');
  const capA = $('#captchaA');
  const capBtn = $('#btnNewCaptcha');
  let capAns = null;

  function setText(el, t=''){ if(el) el.textContent = t; }
  function setSendMsg(t, kind='info'){
    if(!sendMsg) return;
    sendMsg.textContent = t || '';
    sendMsg.style.color = kind==='err' ? '#fda4a4' : (kind==='ok' ? '#86efac' : 'rgba(255,255,255,.85)');
  }
  function getCSRF(){
    const m = document.cookie.match(/(?:^|;)\s*csrftoken=([^;]+)/);
    if(m) return decodeURIComponent(m[1]);
    const el = document.querySelector('input[name=csrfmiddlewaretoken]');
    return el ? el.value : '';
  }

  // ---- Captcha simple (si existe) ----
  function newCaptcha(){
    const a = Math.floor(1+Math.random()*9), b = Math.floor(1+Math.random()*9);
    capAns = a+b; if(capQ) capQ.textContent = `${a} + ${b} = ?`;
  }
  if (capQ && capA) {
    newCaptcha();
    if (capBtn) capBtn.addEventListener('click', (e)=>{ e.preventDefault(); newCaptcha(); });
  }

  // ---- Toggle forgot ----
  const btnToggle = $('#toggleForgot'), forgotForm = $('#formForgot');
  if (btnToggle && forgotForm) {
    btnToggle.addEventListener('click', (e)=>{
      e.preventDefault();
      const hidden = forgotForm.classList.toggle('hidden');
      btnToggle.textContent = hidden ? 'Olvidé mi contraseña' : 'Volver al login';
      btnToggle.setAttribute('aria-expanded', String(!hidden));
    });
  }

  // ---- Validación login ----
  function ensureCaptchaErrorEl(){
    let el = $('#eCaptcha');
    if(!el){
      const g = $('.g-recaptcha');
      if(g && g.parentNode){
        el = document.createElement('p'); el.id='eCaptcha'; el.className='err';
        g.parentNode.insertBefore(el, g.nextSibling);
      }
    }
    return el;
  }
  function validateLogin(){
    const u = $('#usuario')?.value.trim() || '';
    const p = $('#password')?.value || '';
    const eC = ensureCaptchaErrorEl();
    setText(eUsuario); setText(ePassword); setText(eC);

    let ok = true;
    if(!u){ setText(eUsuario,'Ingresa tu usuario o correo.'); ok=false; }
    if(!p){ setText(ePassword,'Ingresa tu contraseña.'); ok=false; }

    if (capQ && capA){
      const v = capA.value.trim();
      if(v==='' || Number(v)!==capAns){ setText(eC,'Captcha incorrecto.'); ok=false; }
    } else if (typeof grecaptcha !== 'undefined'){
      const resp = grecaptcha.getResponse();
      if(!resp){ setText(eC,'Marca el reCAPTCHA.'); ok=false; }
    }
    return ok;
  }
  $('#formLogin')?.addEventListener('submit', (e)=>{
    if(!validateLogin()) e.preventDefault();
  });

  // ---- Enviar código ----
  const btnSend = $('#btnSendCode');
  btnSend?.addEventListener('click', async ()=>{
    const email = (recEmail?.value || '').trim();
    if(!emailRe.test(email)){ setSendMsg('Correo inválido.','err'); recEmail?.focus(); return; }

    btnSend.disabled = true; setSendMsg('Enviando código…');
    try{
      const r = await fetch('/auth/reset/send-code', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRFToken':getCSRF()},
        body:new URLSearchParams({ email, rol: role })
      });
      let j={}; try{ j = await r.json(); }catch{}
      console.log('send-code status:', r.status, j);
      if(r.ok && j && j.ok!==false){
        setSendMsg(j.msg || 'Si el correo existe, te llegará un código.','ok');
      }else{
        setSendMsg((j&&j.msg)||'No se pudo enviar el código.','err');
      }
    }catch(err){
      console.error('send-code error:', err);
      setSendMsg('Error de red al enviar el código.','err');
    }finally{
      btnSend.disabled = false;
    }
  });

  // ---- Verificar código ----
  const btnRecover = $('#btnRecuperar');
  btnRecover?.addEventListener('click', async ()=>{
    const email = (recEmail?.value || '').trim();
    const code = ($('#recCode')?.value || '').trim();
    if(!emailRe.test(email)){ setSendMsg('Correo inválido.','err'); recEmail?.focus(); return; }
    if(!/^\d{6}$/.test(code)){ setSendMsg('El código debe tener 6 dígitos.','err'); $('#recCode')?.focus(); return; }

    try{
      const r = await fetch('/auth/reset/verify', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRFToken':getCSRF()},
        body:new URLSearchParams({ email, code, rol: role })
      });
      let j={}; try{ j = await r.json(); }catch{}
      console.log('verify status:', r.status, j);
      if(r.ok && j && j.ok){ window.location.href = j.redirect; }
      else{ setSendMsg((j&&j.msg)||'Código inválido o expirado.','err'); }
    }catch(err){
      console.error('verify error:', err);
      setSendMsg('Error de red al verificar el código.','err');
    }
  });
});
