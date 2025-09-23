// ===== Helpers =====
const $ = (s) => document.querySelector(s);

function toggleRole() {
  const card = $('#card');
  card.classList.toggle('is-secretaria');
}

function isValidEmail(v) {
  if (!v) return false;
  if (v.startsWith('@') || v.endsWith('@')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function checkPasswordRules(pwd) {
  const missing = [];
  if (!/[A-Z]/.test(pwd)) missing.push('mayúscula');
  if (!/[a-z]/.test(pwd)) missing.push('minúscula');
  if (!/[0-9]/.test(pwd)) missing.push('número');
  if (!/[^0-9A-Za-z]/.test(pwd)) missing.push('símbolo');
  const lenOK = pwd.length >= 8;
  return { missing, lenOK };
}

function renderStrength(pwd) {
  const s = $('#sPwd1');
  s.textContent = '';
  s.className = 'strength';
  const { missing, lenOK } = checkPasswordRules(pwd);

  if (!pwd) return;
  if (!lenOK) { s.textContent = 'Mínimo 8 caracteres.'; s.classList.add('bad'); return; }
  if (missing.length >= 2) { s.textContent = `Contraseña Débil, incluye: ${missing.join(', ')}.`; s.classList.add('bad'); }
  else if (missing.length === 1) { s.textContent = `Contraseña Decente, falta: ${missing[0]}.`; s.classList.add('mid'); }
  else { s.textContent = 'Contraseña Fuerte'; s.classList.add('good'); }
}

function attachEye(btn, input) {
  btn.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.classList.toggle('is-on', !isPass);
    input.focus();
  });
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}
const csrftoken = getCookie('csrftoken');

// ===== Init UI =====
$('#btnSwitch').addEventListener('click', toggleRole);
$('#pwd1').addEventListener('input', (e) => renderStrength(e.target.value));
document.querySelectorAll('.input-wrap').forEach(w => {
  const eye = w.querySelector('.eye'); const inp = w.querySelector('input');
  if (eye && inp) attachEye(eye, inp);
});

function setError(id, msg){ const el = $('#'+id); if (el) el.textContent = msg || ''; }
function clearErrors(){ ['eUsuario','eNombre','eCorreo','ePwd1','ePwd2'].forEach(id => setError(id, '')); }

// ===== Submit =====
$('#formUser').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const isSec   = document.getElementById('card').classList.contains('is-secretaria');
  const rol     = isSec ? 'secretaria' : 'admin';
  const usuario = $('#usuario').value.trim();
  const nombre  = $('#nombre').value.trim();
  const correo  = $('#correo').value.trim();
  const pwd1    = $('#pwd1').value.trim();
  const pwd2    = $('#pwd2').value.trim();

  // Validaciones de UI
  let ok = true;
  if (!usuario) setError('eUsuario','Requerido.'), ok=false;
  if (!nombre)  setError('eNombre','Requerido.'), ok=false;
  if (!isValidEmail(correo)) setError('eCorreo','Correo inválido.'), ok=false;
  const { missing, lenOK } = checkPasswordRules(pwd1);
  if (!lenOK) setError('ePwd1','Mínimo 8 caracteres.'), ok=false;
  if (missing.length) { if (!$('#sPwd1').textContent) renderStrength(pwd1); ok=false; }
  if (pwd1 !== pwd2) setError('ePwd2','Las contraseñas no coinciden.'), ok=false;
  if (!ok) return;

  const fd = new FormData();
  fd.append('usuario', usuario);
  fd.append('nombreCompleto', nombre);
  fd.append('correo', correo);
  fd.append('rol', rol);
  fd.append('pwd', pwd1);
  fd.append('pwdConfirm', pwd2);

  try {
    const resp = await fetch('/api/usuarios/create', {
      method: 'POST',
      body: fd,
      headers: { 'X-CSRFToken': csrftoken }
    });
    const json = await resp.json().catch(() => ({}));

    if (!resp.ok || json.ok === false) {
      alert(json.msg || json.error || 'No se pudo registrar.');
      return;
    }

    alert('Usuario registrado correctamente.');
    $('#formUser').reset();
    $('#sPwd1').textContent = ''; $('#sPwd1').className = 'strength';
    // volver a ADMIN por defecto
    const card = $('#card'); card.classList.remove('is-secretaria');
  } catch (err) {
    console.error(err);
    alert('Error de red/servidor.');
  }
});
