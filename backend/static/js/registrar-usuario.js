// ======== Helpers ========
const $ = (sel) => document.querySelector(sel);

function toggleRole() {
  const card = $('#card');
  const rolField = $('#rol');
  const isSec = card.classList.toggle('is-secretaria');
  rolField.value = isSec ? 'secretaria' : 'admin';
}

// Email simple: debe tener una @ no al inicio/fin y al menos un punto luego
function isValidEmail(v) {
  if (!v) return false;
  if (v.startsWith('@') || v.endsWith('@')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Reglas de contraseña
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

  if (!lenOK) {
    s.textContent = 'Mínimo 8 caracteres.';
    s.classList.add('bad');
    return;
  }

  if (missing.length >= 2) {
    s.textContent = `Contraseña Débil, asegúrate de incluir: ${missing.join(', ')}.`;
    s.classList.add('bad');
  } else if (missing.length === 1) {
    s.textContent = `Contraseña Decente, asegúrate de incluir: ${missing[0]}.`;
    s.classList.add('mid');
  } else {
    s.textContent = 'Contraseña Fuerte';
    s.classList.add('good');
  }
}

function attachEye(btn, input) {
  btn.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.classList.toggle('is-on', !isPass);
    input.focus();
  });
}

// ======== Events / Init ========
$('#btnSwitch').addEventListener('click', toggleRole);

// Strength & validations en vivo
$('#pwd1').addEventListener('input', (e) => renderStrength(e.target.value));

// Ojos
document.querySelectorAll('.input-wrap').forEach(wrap => {
  const eye = wrap.querySelector('.eye');
  const inp = wrap.querySelector('input');
  if (eye && inp) attachEye(eye, inp);
});

$('#formUser').addEventListener('submit', (e) => {
  e.preventDefault();
  // Limpia errores
  ['eUsuario','eNombre','eCorreo','ePwd1','ePwd2'].forEach(id => { const el = $('#'+id); if(el) el.textContent=''; });

  const usuario = $('#usuario').value.trim();
  const nombre  = $('#nombre').value.trim();
  const correo  = $('#correo').value.trim();
  const pwd1    = $('#pwd1').value.trim();
  const pwd2    = $('#pwd2').value.trim();

  let ok = true;

  if (!usuario) { ok=false; $('#eUsuario').textContent = 'Requerido.'; }
  if (!nombre)  { ok=false; $('#eNombre').textContent  = 'Requerido.'; }

  if (!isValidEmail(correo)) {
    ok = false;
    $('#eCorreo').textContent = 'Correo inválido.';
  }

  const { missing, lenOK } = checkPasswordRules(pwd1);
  if (!lenOK) { ok=false; $('#ePwd1').textContent = 'Mínimo 8 caracteres.'; }
  if (missing.length) {
    ok=false;
    // además del texto de abajo, marcamos error en el bloque rojo
    if (!$('#sPwd1').textContent) renderStrength(pwd1);
  }
  if (pwd1 !== pwd2) { ok=false; $('#ePwd2').textContent = 'Las contraseñas no coinciden.'; }

  if (!ok) return;

  // FRONT-ONLY (demo)
  alert(`Usuario creado (demo)\nRol: ${$('#rol').value}`);
  // Aquí luego llamarías a tu endpoint / guardar vía fetch.
});
