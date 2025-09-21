from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt  
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse
from .security import verify_recaptcha  
import json
import secrets

from .db import (
    listar_estudiantes,            
    obtener_estudiante_por_id,     
    insertar_estudiante,
    actualizar_estudiante,
    eliminar_estudiante,
    login_usuario,
    solicitar_codigo_reset,  # crea registro y guarda hash del código
    verificar_codigo_reset,  # valida email+codigo -> retorna token
    reset_password_token,    # cambia contraseña por token
)


# ---------------------------
# Helpers
# ---------------------------
def _json_body(request):
    try:
        return json.loads(request.body or "{}")
    except Exception:
        return {}


# ---------------------------
# API: Listar
# GET /api/estudiantes
# ---------------------------
@require_http_methods(["GET"])
def api_listar(request):
    data = listar_estudiantes()
    return JsonResponse({"data": data})


# ---------------------------
# API: Detalle por id
# GET /api/estudiantes/<id>
# ---------------------------
@require_http_methods(["GET"])
def api_detalle(request, id_est):
    row = obtener_estudiante_por_id(id_est)
    if not row:
        return JsonResponse({"detail": "No encontrado"}, status=404)
    return JsonResponse(row)


# ---------------------------
# API: Crear
# POST /api/estudiantes/create
# body: {nombres, apellidos, correo, telefono}
# ---------------------------
@require_http_methods(["POST"])
def api_crear(request):
    data = _json_body(request)
    rc, id_nuevo = insertar_estudiante(
        data.get("nombres", ""),
        data.get("apellidos", ""),
        data.get("correo", ""),
        data.get("telefono", ""),
    )
    return JsonResponse({"rc": rc, "id": id_nuevo})


# ---------------------------
# API: Actualizar
# PUT /api/estudiantes/<id>/update
# body: {nombres, apellidos, correo, telefono}
# ---------------------------
@require_http_methods(["PUT"])
def api_actualizar(request, id_est):
    data = _json_body(request)
    rc = actualizar_estudiante(
        id_est,
        data.get("nombres", ""),
        data.get("apellidos", ""),
        data.get("correo", ""),
        data.get("telefono", ""),
    )
    return JsonResponse({"rc": rc})


# ---------------------------
# API: Eliminar
# DELETE /api/estudiantes/<id>/delete
# ---------------------------
@require_http_methods(["DELETE"])
def api_eliminar(request, id_est):
    rc = eliminar_estudiante(id_est)
    return JsonResponse({"rc": rc})

# ---------- AUTH: login con reCAPTCHA ----------
@require_http_methods(["GET", "POST"])
def login_admin(request):
    if request.method == "POST":
        u = (request.POST.get("usuario") or "").strip()
        p = request.POST.get("password") or ""
        ip = request.META.get("REMOTE_ADDR", "")
        rc, id_sesion = login_usuario(u, p, ip, "web-admin")

        if rc == 0:
            request.session["id_sesion"] = id_sesion
            request.session["usuario"] = u
            request.session["rol"] = "admin"
            return redirect("home")
        msg = "Usuario bloqueado." if rc == 7 else ("Usuario o contraseña incorrectos." if rc == 8 else "Error al iniciar sesión.")
        return render(request, "admin_login.html", {"error": msg})
    return render(request, "admin_login.html")

@require_http_methods(["GET", "POST"])
def login_secretario(request):
    if request.method == "POST":
        u = (request.POST.get("usuario") or "").strip()
        p = request.POST.get("password") or ""
        ip = request.META.get("REMOTE_ADDR", "")
        rc, id_sesion = login_usuario(u, p, ip, "web-secretaria")

        if rc == 0:
            request.session["id_sesion"] = id_sesion
            request.session["usuario"] = u
            request.session["rol"] = "secretaria"
            return redirect("home")
        msg = "Usuario bloqueado." if rc == 7 else ("Usuario o contraseña incorrectos." if rc == 8 else "Error al iniciar sesión.")
        return render(request, "secretario_login.html", {"error": msg})
    return render(request, "secretario_login.html")

def logout_view(request):
    request.session.flush()
    return redirect("login_select")

# ---------- AUTH: Recuperación Contraseña ----------
def _role_from_request(request):
    return (request.POST.get("rol") or request.GET.get("rol") or "").lower()

@require_POST
def reset_send_code(request):
    email = (request.POST.get("email") or "").strip().lower()
    rol   = _role_from_request(request)  # "admin" | "secretaria" (opcional)
    if not email:
        return JsonResponse({"ok": False, "msg": "Correo requerido."}, status=400)

    # Genera código aleatorio de 6 dígitos
    code = f"{secrets.randbelow(900000)+100000:06d}"
    rc = solicitar_codigo_reset(email, code, request.META.get("REMOTE_ADDR"), rol)

    # Mensaje neutro (no revelar si existe o no)
    if rc != 0:
        return JsonResponse({"ok": True, "msg": "Si el correo existe, te llegará un código."})

    # ENVÍO REAL al correo que el usuario escribió:
    send_mail(
        subject="Código de verificación",
        message=f"Tu código para restablecer contraseña es: {code}. Expira en 10 minutos.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],  # <--- AQUI: el correo del usuario
        fail_silently=False,
    )
    return JsonResponse({"ok": True, "msg": "Si el correo existe, te llegará un código."})

@require_POST
def reset_verify_code(request):
    email = (request.POST.get("email") or "").strip().lower()
    code  = (request.POST.get("code") or "").strip()
    rol   = (request.POST.get("rol") or "").lower()

    ok, token = verificar_codigo_reset(email, code, rol)
    if not ok:
        return JsonResponse({"ok": False, "msg": "Código inválido o expirado."}, status=400)

    if rol == "admin":
        url = f"{reverse('admin_reset_page')}?t={token}&e={email}"
    else:
        url = f"{reverse('secretario_reset_page')}?t={token}&e={email}"

    return JsonResponse({"ok": True, "redirect": url})
@require_POST
def reset_commit(request):
    token  = (request.POST.get("token") or "").strip()
    pwd1   = request.POST.get("pwd1") or ""
    pwd2   = request.POST.get("pwd2") or ""
    if not token:
        return JsonResponse({"ok": False, "msg": "Token faltante."}, status=400)
    if pwd1 != pwd2:
        return JsonResponse({"ok": False, "msg": "Las contraseñas no coinciden."}, status=400)
    # mínimos de seguridad
    import re
    if not (len(pwd1) >= 8 and re.search(r"[A-Z]", pwd1) and re.search(r"[a-z]", pwd1) and re.search(r"\d", pwd1)):
        return JsonResponse({"ok": False, "msg": "Contraseña débil (8+, may/min/número)."}, status=400)

    rc = reset_password_token(token, pwd1)
    if rc == 0:
        return JsonResponse({"ok": True})
    elif rc == 7:
        return JsonResponse({"ok": False, "msg": "Token ya usado."}, status=400)
    elif rc == 8:
        return JsonResponse({"ok": False, "msg": "Token inválido/expirado."}, status=400)
    return JsonResponse({"ok": False, "msg": f"Error {rc} al actualizar."}, status=400)