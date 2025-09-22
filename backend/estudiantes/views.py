from django.http import JsonResponse, HttpResponse, HttpResponseNotAllowed
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt  
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse
from .security import verify_recaptcha  
from utils.guards import require_role
import csv, io, datetime
import json
import secrets

from .db import (
    listar_estudiantes,            
    obtener_estudiante_por_id,     
    sp_est_insertar,
    sp_est_actualizar,
    sp_est_eliminar,
    sp_usr_listar,
    sp_usr_actualizar,
    sp_usr_eliminar,
    registrar_usuario,
    bloquear_usuario,
    desbloquear_usuario,
    rep_accesos, rep_transacciones, vw_ultima_conexion, vw_tiempo_promedio, rep_datos_personales,
    login_usuario,
    solicitar_codigo_reset,  # crea registro y guarda hash del código
    verificar_codigo_reset,  # valida email+codigo -> retorna token
    reset_password_token,    # cambia contraseña por token
    login_usuario, 
    get_usuario_rol, 
    cerrar_sesion,
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
@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_listar(request):
    data = listar_estudiantes()
    return JsonResponse({"data": data})


# ---------------------------
# API: Detalle por id
# GET /api/estudiantes/<id>
# ---------------------------
@require_role("admin","secretaria")
@require_http_methods(["GET"])
def api_detalle(request, id_est: int):
    row = obtener_estudiante_por_id(id_est)
    if not row:
        return JsonResponse({"msg": "no encontrado"}, status=404)
    return JsonResponse(row)


# ---------------------------
# API: Crear
# POST /api/estudiantes/create
# body: {nombres, apellidos, correo, telefono}
# ---------------------------
@require_role("admin","secretaria")
@require_http_methods(["POST"])
def api_crear(request):
    # Los JS envían JSON
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"rc": -1, "msg": "JSON inválido"})  # 200
    rc, new_id = sp_est_insertar(
        body.get("nombres",""), body.get("apellidos",""),
        body.get("correo",""),  body.get("telefono",""),
        request.session.get("id_usuario_db"),
    )
    return JsonResponse({"rc": rc, "id": new_id}) 

# ---------------------------
# API: Actualizar
# PUT /api/estudiantes/<id>/update
# body: {nombres, apellidos, correo, telefono}
# ---------------------------
@require_role("admin","secretaria")
@require_http_methods(["PUT"])
def api_actualizar(request, id_est: int):
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"rc": -1, "msg": "JSON inválido"})  # 200
    rc = sp_est_actualizar(
        id_est,
        body.get("nombres",""), body.get("apellidos",""),
        body.get("correo",""),  body.get("telefono",""),
        request.session.get("id_usuario_db"),
    )
    return JsonResponse({"rc": rc})  # 200

# ---------------------------
# API: Eliminar
# DELETE /api/estudiantes/<id>/delete
# ---------------------------
@require_role("admin")
@require_http_methods(["DELETE"])
def api_eliminar(request, id_est: int):
    rc = sp_est_eliminar(id_est, request.session.get("id_usuario_db"))
    return JsonResponse({"rc": rc})  # 200
#-------------------------
# APIs Usuarios
#-------------------------
@require_role("admin")
@require_http_methods(["POST"])
def api_usr_crear(request):
    # Lee desde form-urlencoded o multipart/form
    u   = (request.POST.get("usuario") or "").strip()
    nc  = (request.POST.get("nombreCompleto") or "").strip()
    co  = (request.POST.get("correo") or "").strip().lower()
    rol = (request.POST.get("rol") or "").strip().lower()  # 'admin' | 'secretaria'
    p1  = request.POST.get("pwd") or ""
    p2  = request.POST.get("pwdConfirm") or ""

    if rol not in ("admin", "secretaria"):
        return JsonResponse({"ok": False, "msg": "Rol inválido."}, status=400)

    rc = registrar_usuario(u, nc, co, rol, p1, p2)

    if rc != 0:
        MSG = {
            1: "Datos requeridos.",
            2: "Usuario duplicado.",
            3: "Correo duplicado.",
            4: "Contraseña débil (8+, mayús, minús, número y símbolo).",
            5: "Error general.",
            9: "La confirmación de contraseña no coincide."
        }
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)

    return JsonResponse({"ok": True})

@require_role("admin")
@require_http_methods(["GET"])
def api_usr_listar(request):
    solo = request.GET.get("soloActivos")
    rol  = request.GET.get("rol")
    solo_activos = None if solo is None else (solo.lower() in ("1","true","t","yes","y"))
    data = sp_usr_listar(solo_activos, rol)
    return JsonResponse({"ok": True, "data": data})

@require_role("admin")
@require_http_methods(["PUT"])
def api_usr_actualizar(request, id_usr):
    d = _json_body(request)
    id_admin = request.session.get("id_usuario_db")
    rc = sp_usr_actualizar(
        id_usr,
        (d.get("usuario") or "").strip(),
        (d.get("nombreCompleto") or "").strip(),
        (d.get("correo") or "").strip().lower(),
        (d.get("rol") or "").strip().lower(),
        (d.get("estado") or "").strip().lower(),
        id_admin
    )
    if rc != 0:
        msg = {1:"Dato requerido",2:"Usuario duplicado",3:"Correo duplicado",5:"Error",6:"No existe"}.get(rc,"Error")
        return JsonResponse({"ok": False, "rc": rc, "msg": msg}, status=400)
    return JsonResponse({"ok": True})

@require_role("admin")
@require_http_methods(["DELETE"])
def api_usr_eliminar(request, id_usr):
    id_admin = request.session.get("id_usuario_db")
    rc = sp_usr_eliminar(id_usr, id_admin)
    if rc != 0:
        msg = {6:"No existe",10:"Tiene referencias; bloquéalo en lugar de eliminar.",5:"Error"}.get(rc,"Error")
        return JsonResponse({"ok": False, "rc": rc, "msg": msg}, status=400)
    return JsonResponse({"ok": True})

@require_role("admin")
@require_http_methods(["POST"])
def api_usr_bloquear(request, id_usr: int):
    """
    Bloquea a un usuario (solo admin).
    RC del SP:
      0 = OK
      6 = admin no válido o usuario no existe
    """
    admin_id = request.session.get("id_usuario_db")
    if not admin_id:
        return JsonResponse({"ok": False, "msg": "Sesión inválida."}, status=401)

    rc = bloquear_usuario(admin_id, id_usr)
    if rc != 0:
        msg = "No existe/permiso inválido." if rc == 6 else "Error al bloquear."
        return JsonResponse({"ok": False, "rc": rc, "msg": msg}, status=400)

    return JsonResponse({"ok": True})


@require_role("admin")
@require_http_methods(["POST"])
def api_usr_desbloquear(request, id_usr: int):
    """
    Desbloquea a un usuario (solo admin).
    RC del SP:
      0 = OK
      6 = admin no válido o usuario no existe
    """
    admin_id = request.session.get("id_usuario_db")
    if not admin_id:
        return JsonResponse({"ok": False, "msg": "Sesión inválida."}, status=401)

    rc = desbloquear_usuario(admin_id, id_usr)
    if rc != 0:
        msg = "No existe/permiso inválido." if rc == 6 else "Error al desbloquear."
        return JsonResponse({"ok": False, "rc": rc, "msg": msg}, status=400)

    return JsonResponse({"ok": True})


#---------------------------------------
# Reportes
#----------------------------------------
def _get_date(qs, name):
    v = (qs.get(name) or "").strip()
    if not v: return None
    try:
        return datetime.datetime.strptime(v, "%Y-%m-%d").date()
    except:
        return None

def _bool_or_none(v):
    if v is None: return None
    s = str(v).lower()
    return True if s in ("1","true","t","yes","y") else False if s in ("0","false","f","no","n") else None

# ===================== JSON =====================

@require_role("admin")
@require_http_methods(["GET"])
def api_rep_ultima_conexion(request):
    return JsonResponse({"ok": True, "data": vw_ultima_conexion()})

@require_role("admin")
@require_http_methods(["GET"])
def api_rep_tiempo_promedio(request):
    return JsonResponse({"ok": True, "data": vw_tiempo_promedio()})

@require_role("admin")
@require_http_methods(["GET"])
def api_rep_accesos(request):
    qs = request.GET
    data = rep_accesos(
        usuario=qs.get("usuario"),
        estado=_bool_or_none(qs.get("exito")),
        f_ini=_get_date(qs, "desde"),
        f_fin=_get_date(qs, "hasta"),
        accion=qs.get("accion"),
        limit=int(qs.get("limit") or 500),
        offset=int(qs.get("offset") or 0),
    )
    return JsonResponse({"ok": True, "data": data})

@require_role("admin")
@require_http_methods(["GET"])
def api_rep_transacciones(request):
    qs = request.GET
    data = rep_transacciones(
        usuario=qs.get("usuario"),
        entidad=qs.get("entidad"),
        operacion=qs.get("operacion"),
        f_ini=_get_date(qs, "desde"),
        f_fin=_get_date(qs, "hasta"),
        limit=int(qs.get("limit") or 500),
        offset=int(qs.get("offset") or 0),
    )
    return JsonResponse({"ok": True, "data": data})

@require_role("admin")
@require_http_methods(["GET"])
def api_rep_datos_personales(request):
    qs = request.GET
    data = rep_datos_personales(rol=qs.get("rol"), estado=qs.get("estado"))
    return JsonResponse({"ok": True, "data": data})

# ===================== EXPORTS =====================

@require_role("admin")
@require_http_methods(["GET"])
def api_rep_accesos_export(request):
    """
    Exporta Accesos: ?format=csv|pdf|log + mismos filtros que JSON
    - csv: CSV con todas las columnas
    - pdf: PDF simple (requiere reportlab)
    - log: archivo .log SOLO con intentos fallidos (exito=0), formato texto
    """
    fmt = (request.GET.get("format") or "csv").lower()
    filtros = dict(
        usuario=request.GET.get("usuario"),
        estado=_bool_or_none(request.GET.get("exito")),
        f_ini=_get_date(request.GET, "desde"),
        f_fin=_get_date(request.GET, "hasta"),
        accion=request.GET.get("accion"),
        limit=5000, offset=0
    )
    rows = rep_accesos(**filtros)

    if fmt == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["usuario","fechaHora","exito","accion","ip","dispositivo","motivo"])
        for r in rows:
            w.writerow([r["usuario"], r["fechaHora"], r["exito"], r["accion"], r["ip"], r["dispositivo"], r["motivo"]])
        out = buf.getvalue().encode("utf-8-sig")
        resp = HttpResponse(out, content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = 'attachment; filename="accesos.csv"'
        return resp

    if fmt == "log":
        # Solo fallidos, como pide el documento
        lines = []
        for r in rows:
            if not r["exito"]:
                lines.append(f'{r["fechaHora"]} | user="{r["usuario"]}" | ip="{r["ip"]}" | dev="{r["dispositivo"]}" | motivo="{r["motivo"]}"')
        out = ("\n".join(lines) or "Sin registros.").encode("utf-8")
        resp = HttpResponse(out, content_type="text/plain; charset=utf-8")
        resp["Content-Disposition"] = 'attachment; filename="intentos_fallidos.log"'
        return resp

    if fmt == "pdf":
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import cm
        except ImportError:
            return JsonResponse({"ok": False, "msg": "Instala reportlab para exportar a PDF: pip install reportlab"}, status=400)
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        width, height = A4
        y = height - 2*cm
        c.setFont("Helvetica-Bold", 12)
        c.drawString(2*cm, y, "Reporte: Bitácora de Accesos")
        y -= 0.7*cm
        c.setFont("Helvetica", 9)
        head = "Usuario        Fecha/Hora              Éxito  Acción  IP              Motivo"
        c.drawString(2*cm, y, head); y -= 0.5*cm
        for r in rows:
            line = f'{(r["usuario"] or ""):12.12}  {str(r["fechaHora"])[:19]:19}  {"OK " if r["exito"] else "FAIL"}   {(r["accion"] or ""):6.6}  {(r["ip"] or ""):15.15}  {(r["motivo"] or ""):30.30}'
            if y < 2*cm:
                c.showPage(); y = height - 2*cm; c.setFont("Helvetica", 9)
            c.drawString(2*cm, y, line); y -= 0.42*cm
        c.showPage(); c.save()
        pdf = buf.getvalue()
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = 'attachment; filename="accesos.pdf"'
        return resp

    return JsonResponse({"ok": False, "msg": "format inválido (usa csv|pdf|log)"}, status=400)


@require_role("admin")
@require_http_methods(["GET"])
def api_rep_transacciones_export(request):
    """
    Exporta Transacciones: ?format=csv|pdf + filtros
    """
    fmt = (request.GET.get("format") or "csv").lower()
    rows = rep_transacciones(
        usuario=request.GET.get("usuario"),
        entidad=request.GET.get("entidad"),
        operacion=request.GET.get("operacion"),
        f_ini=_get_date(request.GET, "desde"),
        f_fin=_get_date(request.GET, "hasta"),
        limit=5000, offset=0
    )

    if fmt == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["usuario","fechaHora","entidad","operacion","idAfectado","datosAnterior","datosNuevo"])
        for r in rows:
            w.writerow([r["usuario"], r["fechaHora"], r["entidad"], r["operacion"], r["idAfectado"], r["datosAnterior"], r["datosNuevo"]])
        out = buf.getvalue().encode("utf-8-sig")
        resp = HttpResponse(out, content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = 'attachment; filename="transacciones.csv"'
        return resp

    if fmt == "pdf":
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import cm
        except ImportError:
            return JsonResponse({"ok": False, "msg": "Instala reportlab para exportar a PDF: pip install reportlab"}, status=400)
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        width, height = A4
        y = height - 2*cm
        c.setFont("Helvetica-Bold", 12)
        c.drawString(2*cm, y, "Reporte: Bitácora de Transacciones"); y -= 0.7*cm
        c.setFont("Helvetica", 9)
        head = "Usuario   Fecha/Hora           Entidad         Operación   idAfectado"
        c.drawString(2*cm, y, head); y -= 0.5*cm
        for r in rows:
            line = f'{(r["usuario"] or ""):8.8} {str(r["fechaHora"])[:19]:19} {(r["entidad"] or ""):15.15} {(r["operacion"] or ""):10.10} {str(r["idAfectado"] or ""):>6}'
            if y < 2*cm:
                c.showPage(); y = height - 2*cm; c.setFont("Helvetica", 9)
            c.drawString(2*cm, y, line); y -= 0.42*cm
        c.showPage(); c.save()
        pdf = buf.getvalue()
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = 'attachment; filename="transacciones.pdf"'
        return resp

    return JsonResponse({"ok": False, "msg": "format inválido (usa csv|pdf)"}, status=400)

# ---------- AUTH: login con reCAPTCHA ----------
@require_http_methods(["GET","POST"])
def login_admin(request):
    if request.method == "POST":
        u = (request.POST.get("usuario") or "").strip()
        p = request.POST.get("password") or ""
        ip = request.META.get("REMOTE_ADDR","")
        rc, id_sesion = login_usuario(u, p, ip, "web-admin")
        if rc == 0:
            # lee id y rol reales desde BD
            idu, rol = get_usuario_rol(u)
            if rol != "admin":
                # cerrar sesión en BD si el usuario no corresponde al portal
                if id_sesion: 
                    try: cerrar_sesion(id_sesion, ip, "mismatch-portal")
                    except: pass
                return render(request, "admin_login.html", {"error":"No autorizado en este portal."})
            request.session["id_sesion"] = id_sesion
            request.session["usuario"] = u
            request.session["rol"] = rol
            request.session["id_usuario_db"] = idu
            return redirect("admin_home")
        msg = "Usuario bloqueado." if rc==7 else ("Usuario o contraseña incorrectos." if rc==8 else "Error al iniciar sesión.")
        return render(request, "admin_login.html", {"error": msg})
    return render(request, "admin_login.html")

@require_http_methods(["GET","POST"])
def login_secretario(request):
    if request.method == "POST":
        u = (request.POST.get("usuario") or "").strip()
        p = request.POST.get("password") or ""
        ip = request.META.get("REMOTE_ADDR","")
        rc, id_sesion = login_usuario(u, p, ip, "web-secretaria")
        if rc == 0:
            idu, rol = get_usuario_rol(u)
            if rol != "secretaria":
                if id_sesion:
                    try: cerrar_sesion(id_sesion, ip, "mismatch-portal")
                    except: pass
                return render(request, "secretario_login.html", {"error":"No autorizado en este portal."})
            request.session["id_sesion"] = id_sesion
            request.session["usuario"] = u
            request.session["rol"] = rol
            request.session["id_usuario_db"] = idu
            return redirect("secretaria_home")
        msg = "Usuario bloqueado." if rc==7 else ("Usuario o contraseña incorrectos." if rc==8 else "Error al iniciar sesión.")
        return render(request, "secretario_login.html", {"error": msg})
    return render(request, "secretario_login.html")

def logout_view(request):
    id_sesion = request.session.get("id_sesion")
    ip = request.META.get("REMOTE_ADDR", "")
    if id_sesion:
        try:
            cerrar_sesion(id_sesion, ip, "web-logout")
        except Exception:
            pass
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

def _bloqueo_portal_incorrecto(request, template):
    # Mensaje neutro para no revelar detalles
    return render(request, template, {"error": "No autorizado en este portal. Usa el acceso correcto."})
