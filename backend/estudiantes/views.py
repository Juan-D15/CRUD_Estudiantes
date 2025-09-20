from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt  
import json
from django.shortcuts import render, redirect
from .security import verify_recaptcha  

from .db import (
    listar_estudiantes,            
    obtener_estudiante_por_id,     
    insertar_estudiante,
    actualizar_estudiante,
    eliminar_estudiante,
    login_usuario,
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
    if request.method == "GET":
        return render(request, "admin_login.html")
    # POST
    usuario = request.POST.get("usuario","").strip()
    pwd = request.POST.get("password","")
    token = request.POST.get("g-recaptcha-response")
    if not verify_recaptcha(token, request.META.get("REMOTE_ADDR")):
        return render(request, "admin_login.html", {"error": "Captcha inválido"})

    rc, id_sesion, rol = login_usuario(usuario, pwd, request.META.get("REMOTE_ADDR"), "web")
    if rc == 0 and rol.lower() == "admin":
        request.session["sid"] = id_sesion
        request.session["usuario"] = usuario
        request.session["rol"] = rol
        return redirect("home")
    msg = "Usuario/contraseña incorrectos" if rc == 8 else ("Cuenta bloqueada" if rc == 7 else f"Error {rc}")
    return render(request, "admin_login.html", {"error": msg})

@require_http_methods(["GET", "POST"])
def login_secretario(request):
    if request.method == "GET":
        return render(request, "secretario_login.html")
    usuario = request.POST.get("usuario","").strip()
    pwd = request.POST.get("password","")
    token = request.POST.get("g-recaptcha-response")
    if not verify_recaptcha(token, request.META.get("REMOTE_ADDR")):
        return render(request, "secretario_login.html", {"error": "Captcha inválido"})

    rc, id_sesion, rol = login_usuario(usuario, pwd, request.META.get("REMOTE_ADDR"), "web")
    if rc == 0 and rol.lower() == "secretaria":
        request.session["sid"] = id_sesion
        request.session["usuario"] = usuario
        request.session["rol"] = rol
        return redirect("home")
    msg = "Usuario/contraseña incorrectos" if rc == 8 else ("Cuenta bloqueada" if rc == 7 else f"Error {rc}")
    return render(request, "secretario_login.html", {"error": msg})

def logout_view(request):
    request.session.flush()
    return redirect("login_select")