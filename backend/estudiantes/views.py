from django.http import JsonResponse, HttpResponse, HttpResponseNotAllowed
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt 
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.core.mail import send_mail
from django.db import connection
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
    actualizar_usuario,
    actualizar_contrasena,
    sp_usr_eliminar,
    registrar_usuario,
    bloquear_usuario,
    desbloquear_usuario,
    rep_accesos, rep_transacciones, vw_ultima_conexion, vw_tiempo_promedio, rep_datos_personales,
    get_usuario_info,
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
    import json
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
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

# ---------------------------
# API: Crear
# ---------------------------
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

# ---------------------------
# API: Listar
# ---------------------------
@require_role("admin")
@require_http_methods(["GET"])
def api_usr_listar(request):
    """
    GET /api/usuarios
    Query:
      rol=admin|secretaria                (uno)            -> filtrado en SQL
      soloActivos=1|0                     (uno)            -> filtrado en SQL
      roles=admin,secretaria              (múltiples)      -> filtrado en Python
      estados=activo,bloqueado            (múltiples)      -> filtrado en Python
      orden=asc|desc                      (fechaCreacion)
    """
    # Compatibilidad hacia atrás (tu SP acepta 1 rol y activo/bloqueado)
    one_rol  = request.GET.get("rol")
    solo     = request.GET.get("soloActivos")
    solo_act = None if solo is None else (solo.lower() in ("1","true","t","yes","y"))

    # Pedimos a SQL lo más filtrado posible
    data = sp_usr_listar(solo_act, one_rol)   # <- SELECT con ORDER BY DESC por defecto
    # data: [{ idUsuario, usuario, nombreCompleto, correo, rol, estado, ultimoCambioPwd, intentosFallidos, must_reset, fechaCreacion }]

    # Filtros múltiples en Python (opcional)
    roles_q   = [r.strip().lower() for r in (request.GET.get("roles") or "").split(",") if r.strip()]
    estados_q = [e.strip().lower() for e in (request.GET.get("estados") or "").split(",") if e.strip()]
    if roles_q:
        data = [d for d in data if (d.get("rol") or "").lower() in roles_q]
    if estados_q:
        data = [d for d in data if (d.get("estado") or "").lower() in estados_q]

    # Orden explícito si lo piden
    orden = (request.GET.get("orden") or "desc").lower()
    if orden in ("asc", "desc"):
        data.sort(key=lambda x: (x.get("fechaCreacion") or ""), reverse=(orden=="desc"))

    return JsonResponse({"ok": True, "data": data})

# ---------------------------
# API: Detalle
# ---------------------------
@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_usr_detalle(request, id_usr: int):
    # si viene 0 o vacío, usar el id de la sesión
    if not id_usr:
        id_usr = request.session.get("id_usuario_db")

    # secretaria solo puede verse a sí misma
    if (request.session.get("rol") or "").lower() == "secretaria":
        if id_usr != request.session.get("id_usuario_db"):
            return JsonResponse({"rc": 13, "msg": "No autorizado"}, status=403)

    info = get_usuario_info(id_usr)
    if not info:
        return JsonResponse({"rc": 6, "msg": "no encontrado"}, status=404)

    data = {
        "idUsuario": id_usr,
        "usuario": info["usuario"],
        "nombreCompleto": info["nombreCompleto"],
        "correo": info["correo"],
        "rol": info["rol"],
        "estado": info["estado"],
        "fechaCreacion": info["fechaCreacion"],
    }
    return JsonResponse({"rc": 0, "user": data})

# ---------------------------
# API: Actualizar
# ---------------------------
@require_role("admin", "secretaria")
@require_http_methods(["PUT"])
def api_usr_actualizar(request, id_usr: int):
    """
    PUT /api/usuarios/<id>/actualizar
    - Secretaría: solo puede editar su propio perfil (nombre y usuario). No puede cambiar rol/estado/correo.
    - Admin: puede cambiar también rol/estado/correo; si se bloquea a sí mismo, se cierra sesión y se redirige.
    """
    from django.db import connection

    # --- Body JSON
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"rc": -1, "msg": "JSON inválido"})

    nuevo_usuario = (body.get("usuario") or "").strip()
    nuevo_nombre  = (body.get("nombreCompleto") or "").strip()
    nuevo_correo  = (body.get("correo") or "").strip().lower()
    nuevo_estado  = (body.get("estado") or "").strip().lower()
    nuevo_rol     = (body.get("rol") or "").strip().lower()

    # --- Identidad / permisos por rol
    session_id = request.session.get("id_usuario_db")
    rol_sesion = (request.session.get("rol") or "").lower()
    if not id_usr or int(id_usr) == 0:
        id_usr = session_id
    if rol_sesion == "secretaria" and int(id_usr) != int(session_id or -1):
        return JsonResponse({"rc": 13, "msg": "No autorizado"}, status=403)

    # --- Datos actuales del usuario
    info = get_usuario_info(id_usr)
    if not info:
        return JsonResponse({"rc": 6, "msg": "Usuario no existe."})
    rol_actual    = (info.get("rol") or "admin").strip().lower()
    estado_actual = (info.get("estado") or "activo").strip().lower()

    if nuevo_rol not in ("admin", "secretaria"):
        nuevo_rol = rol_actual
    if nuevo_estado not in ("activo", "bloqueado"):
        nuevo_estado = estado_actual

    # Secretaría no puede modificar correo/rol/estado
    if rol_sesion == "secretaria":
        nuevo_correo = (info.get("correo") or "").strip().lower()
        nuevo_rol    = rol_actual
        nuevo_estado = estado_actual

    if not nuevo_usuario or not nuevo_nombre:
        return JsonResponse({"rc": 1, "msg": "Dato inválido."}, status=400)

    # --- Unicidad del username (insensible a mayúsculas), excluyéndome
    with connection.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) 
            FROM dbo.tbUsuario 
            WHERE LOWER(usuario)=LOWER(%s) AND idUsuario<>%s
        """, [nuevo_usuario, id_usr])
        if cur.fetchone()[0]:
            return JsonResponse({"rc": 2, "msg": "Usuario duplicado."}, status=400)

    actor_id = session_id

    # 1) Intento normal (tu SP/función)
    rc = actualizar_usuario(
        id_usr,
        nuevo_usuario,
        nuevo_nombre,
        (nuevo_correo or (info.get("correo") or "").strip().lower()),
        nuevo_rol,
        estado_actual,  # el estado se trata después
        actor_id
    )

    # 1.b Fallback: si el SP dice "no existe", actualizamos POR ID directamente
    if rc == 6:
        try:
            with connection.cursor() as cur:
                cur.execute("""
                    UPDATE dbo.tbUsuario
                       SET usuario       = %s,
                           nombreCompleto= %s,
                           correo        = %s,
                           rol           = %s
                     WHERE idUsuario     = %s
                """, [nuevo_usuario,
                      nuevo_nombre,
                      (nuevo_correo or (info.get("correo") or "").strip().lower()),
                      nuevo_rol,
                      id_usr])
                if cur.rowcount == 1:
                    rc = 0  # lo dimos por actualizado correctamente
        except Exception:
            pass

    if rc != 0:
        msg_map = {
            0: "OK", 1: "Dato inválido.", 2: "Usuario duplicado.",
            3: "Correo duplicado.", 5: "Error.", 6: "No existe."
        }
        return JsonResponse({"rc": rc, "msg": msg_map.get(rc, "No se pudo actualizar.")})

    # 2) Cambio de estado (solo admin)
    redirect_url = None
    if rol_sesion != "secretaria" and nuevo_estado != estado_actual:
        if nuevo_estado == "bloqueado":
            rc2 = bloquear_usuario(actor_id, id_usr)
            if rc2 != 0:
                return JsonResponse({"rc": rc2, "msg": "No se pudo bloquear."})
            if int(id_usr) == int(actor_id):
                request.session.flush()
                try:
                    redirect_url = reverse("login_select")
                except Exception:
                    redirect_url = reverse("admin_login")
        elif nuevo_estado == "activo":
            rc2 = desbloquear_usuario(actor_id, id_usr)
            if rc2 != 0:
                return JsonResponse({"rc": rc2, "msg": "No se pudo desbloquear."})

    return JsonResponse({"rc": 0, "msg": "Actualizado correctamente.", "redirect": redirect_url})

# ---------------------------
# API: Eliminar
# ---------------------------
@require_role("admin")
@require_http_methods(["DELETE"])
def api_usr_eliminar(request, id_usr: int):
    """
    DELETE /api/usuarios/<id>/eliminar
    Códigos SP esperados:
      0 OK, 6 no existe, 10 tiene referencias (no se puede borrar), 5 error general
    """
    id_admin = request.session.get("id_usuario_db")
    rc = sp_usr_eliminar(id_usr, id_admin)

    msg_map = {
        0:  "Eliminado correctamente.",
        6:  "No existe.",
        10: "No se puede eliminar: tiene referencias (bloquéalo en su lugar).",
        5:  "Error del servidor.",
    }
    ok = (rc == 0)
    return JsonResponse({"ok": ok, "rc": rc, "msg": msg_map.get(rc, "Error")}, status=(200 if ok else 400))

# ---------------------------
# API: Bloquear
# ---------------------------
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

# ---------------------------
# API: Desbloquear
# ---------------------------
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

# ---------------------------
# API: Cambiar contraseña autenticado
# ---------------------------
@require_role("admin", "secretaria")  
@require_http_methods(["POST"])
def api_cambiar_password_autenticado(request):
    body = _json_body(request)
    p0 = (body.get("actual") or "").strip()
    p1 = (body.get("nueva") or "").strip()
    p2 = (body.get("confirm") or "").strip()
    idu = request.session.get("id_usuario_db")

    if not idu:
        return JsonResponse({"ok": False, "msg": "Sesión inválida."}, status=401)

    rc = actualizar_contrasena(idu, p0, p1, p2)

    # Códigos típicos del SP 
    MSG = {
        0: "OK",
        1: "Datos requeridos.",
        2: "La contraseña actual no coincide.",
        4: "Contraseña débil (8+, mayús, minús, número y símbolo).",
        9: "La confirmación de contraseña no coincide.",
        5: "Error general."
    }
    if rc != 0:
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)

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

@require_role('admin')
@require_http_methods(["GET"])
def api_filtros_busqueda(request):
    """
    GET /api/filtros/busqueda
    Query:
      usuario: substring (case-insensitive)
      accion:  '', 'login','user_reg','stu_reg', ... o 'last_login'
      fechaTipo: '', 'rango','recientes','antiguos'
      desde, hasta: 'YYYY-MM-DD'
      estado: puede venir varias veces ('activo','bloqueado')
      limit: int (default 500)
    """
    q_usuario  = (request.GET.get('usuario') or '').strip().lower()
    accion     = (request.GET.get('accion')  or '').strip()
    fechaTipo  = (request.GET.get('fechaTipo') or '').strip()
    desde      = (request.GET.get('desde') or '').strip()
    hasta      = (request.GET.get('hasta') or '').strip()
    estados    = request.GET.getlist('estado') or []
    try:
        limit = int(request.GET.get('limit') or 500)
    except:
        limit = 500

    rows = []

    dir_sql = "ASC" if fechaTipo == 'antiguos' else "DESC"

    with connection.cursor() as cur:
        if accion == 'last_login':
            # Vista de última conexión
            sql = """
                SELECT
                    u.idUsuario, u.usuario, u.nombreCompleto, u.correo, u.rol, u.estado,
                    'last_login' AS accion,
                    CAST(1 AS bit) AS exito,
                    v.ultimaConexion AS fechaHora,
                    CAST(NULL AS nvarchar(max)) AS detalle
                FROM dbo.vwUltimaConexion v
                JOIN dbo.tbUsuario u ON u.idUsuario = v.idUsuario
                WHERE v.ultimaConexion IS NOT NULL
            """
            params = []

            if q_usuario:
                sql += " AND LOWER(u.usuario) LIKE %s"
                params.append(f"%{q_usuario}%")

            if estados:
                placeholders = ",".join(["%s"] * len(estados))
                sql += f" AND u.estado IN ({placeholders})"
                params.extend(estados)

            if fechaTipo == 'rango' and desde and hasta:
                sql += " AND v.ultimaConexion BETWEEN %s AND DATEADD(SECOND, 86399, %s)"
                params.extend([desde, hasta])

            sql += f" ORDER BY v.ultimaConexion {dir_sql}, u.idUsuario {dir_sql} OFFSET 0 ROWS FETCH NEXT %s ROWS ONLY"
            params.append(limit)

            cur.execute(sql, params)
            cols = [c[0] for c in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        else:
            # Vista unificada de eventos
            sql = """
                SELECT
                    idUsuario, usuario, nombreCompleto, correo, rol, estado,
                    accion, exito, fechaHora, detalle
                FROM dbo.vwEventosAuditoria
                WHERE 1=1
            """
            params = []

            if q_usuario:
                sql += " AND LOWER(usuario) LIKE %s"
                params.append(f"%{q_usuario}%")

            if accion:
                sql += " AND accion = %s"
                params.append(accion)

            if estados:
                placeholders = ",".join(["%s"] * len(estados))
                sql += f" AND estado IN ({placeholders})"
                params.extend(estados)

            if fechaTipo == 'rango' and desde and hasta:
                sql += " AND fechaHora BETWEEN %s AND DATEADD(SECOND, 86399, %s)"
                params.extend([desde, hasta])

            sql += f" ORDER BY fechaHora {dir_sql} OFFSET 0 ROWS FETCH NEXT %s ROWS ONLY"
            params.append(limit)

            cur.execute(sql, params)
            cols = [c[0] for c in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    return JsonResponse({"rows": rows})
# ===================== EXPORTS =====================
@require_role("admin")
@require_http_methods(["GET"])
def api_reportes_acciones_transacciones(request):
    # lista simple para llenar el combo de acciones
    return JsonResponse({
        "ok": True,
        "acciones": ["INSERT","UPDATE","DELETE","CREATE","BLOCK","UNBLOCK","CHANGE_PASSWORD","RESET_PASSWORD"]
    })

@require_role("admin")
@require_http_methods(["GET"])
def api_reportes_filtros(request):
    fuente  = (request.GET.get("fuente") or "accesos").lower()
    usuario = (request.GET.get("usuario") or "").strip()
    rol     = (request.GET.get("rol") or "").strip().lower() or None
    estado  = (request.GET.get("estado") or "").strip().lower() or None  # activo|bloqueado
    accion  = (request.GET.get("accion") or "").strip()

    # helpers de fecha que ya tienes en este mismo archivo
    from .views import _get_date  # si está en este módulo; si no, muévelo arriba
    f_ini = _get_date(request.GET, "desde")
    f_fin = _get_date(request.GET, "hasta")

    if fuente == "usuarios":
        rows = rep_datos_personales(rol=rol, estado=estado)
        if usuario:
            u = usuario.lower()
            rows = [r for r in rows if u in (r.get("usuario","").lower()
                      + r.get("correo","").lower()
                      + r.get("nombreCompleto","").lower())]
        return JsonResponse({"ok": True, "rows": rows})

    if fuente == "transacciones":
        rows = rep_transacciones(usuario=(usuario or None),
                                 entidad=None, operacion=(accion or None),
                                 f_ini=f_ini, f_fin=f_fin)
        if estado in ("activo","bloqueado"):
            rows = [r for r in rows if (r.get("estadoUsuario","") or "").lower() == estado]
        return JsonResponse({"ok": True, "rows": rows})

    # accesos (por defecto)
    rows = rep_accesos(usuario=(usuario or None),
                       estado=None,  # ¡OJO! aquí 'estado' del SP es exito/fallo; no lo usamos
                       f_ini=f_ini, f_fin=f_fin, accion=(accion or None))
    if estado in ("activo","bloqueado"):
        rows = [r for r in rows if (r.get("estadoUsuario","") or "").lower() == estado]
    return JsonResponse({"ok": True, "rows": rows})

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


# ============================================================
# PRODUCTOS / VENTAS - APIs
# ============================================================

from .db import (
    # Categorías
    sp_categoria_crear, sp_categoria_actualizar, sp_categoria_eliminar,
    sp_categoria_obtener, sp_categoria_listar,
    # Inventario
    sp_inventario_historial,
    # Productos
    sp_producto_crear, sp_producto_actualizar, sp_producto_eliminar,
    sp_producto_obtener, sp_producto_listar, sp_producto_listar_con_categorias,
    # Producto-Categoría
    sp_producto_categoria_asignar, sp_producto_categoria_quitar, sp_producto_categoria_listar,
    # Inventario
    sp_inventario_registrar_entrada, vw_inventario_actual,
    # Ventas
    sp_registrar_venta, listar_ventas, obtener_venta_detalle,
    # Reportes
    sp_reporte_ventas_por_fecha, sp_reporte_inventario_actual,
    sp_reporte_productos_mas_vendidos, sp_reporte_ingresos_totales,
)

# ---------------------------
# APIs: Categorías
# ---------------------------
@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_categoria_listar(request):
    """Lista categorías con paginación y búsqueda"""
    buscar = request.GET.get("buscar")
    solo_activas = request.GET.get("soloActivas", "0").lower() in ("1", "true")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("pageSize", 100))
    
    result = sp_categoria_listar(buscar, solo_activas, page, page_size)
    return JsonResponse({"ok": True, **result})


@require_role("admin")
@require_http_methods(["GET"])
def api_categoria_detalle(request, id_cat: int):
    """Obtiene detalles de una categoría"""
    cat = sp_categoria_obtener(id_cat)
    if not cat:
        return JsonResponse({"ok": False, "msg": "Categoría no encontrada"}, status=404)
    return JsonResponse({"ok": True, "data": cat})


@require_role("admin")
@require_http_methods(["POST"])
def api_categoria_crear(request):
    """Crea una nueva categoría"""
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except:
        return JsonResponse({"ok": False, "msg": "JSON inválido"}, status=400)
    
    nombre = (body.get("nombre") or "").strip()
    estado = (body.get("estado") or "activa").strip()
    id_usuario = request.session.get("id_usuario_db")
    
    rc, id_cat = sp_categoria_crear(id_usuario, nombre, estado)
    
    if rc != 0:
        MSG = {1: "Dato inválido", 2: "Categoría duplicada", 6: "Usuario no válido", 5: "Error general"}
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)
    
    return JsonResponse({"ok": True, "idCategoria": id_cat})


@require_role("admin")
@require_http_methods(["PUT"])
def api_categoria_actualizar(request, id_cat: int):
    """Actualiza una categoría"""
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except:
        return JsonResponse({"ok": False, "msg": "JSON inválido"}, status=400)
    
    nombre = (body.get("nombre") or "").strip()
    estado = (body.get("estado") or "activa").strip()
    id_usuario = request.session.get("id_usuario_db")
    
    rc = sp_categoria_actualizar(id_usuario, id_cat, nombre, estado)
    
    if rc != 0:
        MSG = {1: "Dato inválido", 2: "Categoría duplicada", 3: "No existe", 5: "Error general"}
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)
    
    return JsonResponse({"ok": True})


@require_role("admin")
@require_http_methods(["DELETE"])
def api_categoria_eliminar(request, id_cat: int):
    """Elimina una categoría (soft por defecto)"""
    modo = request.GET.get("modo", "soft")
    id_usuario = request.session.get("id_usuario_db")
    
    rc = sp_categoria_eliminar(id_usuario, id_cat, modo)
    
    if rc != 0:
        MSG = {3: "No existe", 7: "Tiene referencias", 5: "Error general"}
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)
    
    return JsonResponse({"ok": True})


# ---------------------------
# APIs: Productos
# ---------------------------
@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_producto_listar(request):
    """Lista productos con filtros y paginación"""
    buscar = request.GET.get("buscar")
    id_categoria = request.GET.get("idCategoria")
    estado = request.GET.get("estado")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("pageSize", 100))
    con_categorias = request.GET.get("conCategorias", "0").lower() in ("1", "true")
    
    if con_categorias:
        result = sp_producto_listar_con_categorias(
            buscar, int(id_categoria) if id_categoria else None, estado, page, page_size
        )
    else:
        result = sp_producto_listar(
            buscar, int(id_categoria) if id_categoria else None, estado, page, page_size
        )
    
    return JsonResponse({"ok": True, **result})


@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_producto_detalle(request, id_prod: int):
    """Obtiene detalles de un producto"""
    prod = sp_producto_obtener(id_prod)
    if not prod:
        return JsonResponse({"ok": False, "msg": "Producto no encontrado"}, status=404)
    return JsonResponse({"ok": True, "data": prod})


@require_role("admin")
@require_http_methods(["POST"])
def api_producto_crear(request):
    """Crea un nuevo producto"""
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except:
        return JsonResponse({"ok": False, "msg": "JSON inválido"}, status=400)
    
    id_usuario = request.session.get("id_usuario_db")
    codigo = (body.get("codigo") or "").strip()
    nombre = (body.get("nombre") or "").strip()
    descripcion = (body.get("descripcion") or "").strip()
    precio_costo = float(body.get("precioCosto", 0))
    precio_venta = float(body.get("precioVenta", 0))
    stock_actual = int(body.get("stockActual", 0))
    stock_minimo = int(body.get("stockMinimo", 0))
    descuento_maximo_pct = float(body.get("descuentoMaximoPct", 0))
    estado = (body.get("estado") or "activo").strip()
    
    rc, id_prod = sp_producto_crear(
        id_usuario, codigo, nombre, descripcion,
        precio_costo, precio_venta, stock_actual, stock_minimo,
        descuento_maximo_pct, estado
    )
    
    if rc != 0:
        MSG = {1: "Dato inválido", 2: "Código duplicado", 6: "Usuario no válido", 5: "Error general"}
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)
    
    return JsonResponse({"ok": True, "idProducto": id_prod})


@require_role("admin")
@require_http_methods(["PUT"])
def api_producto_actualizar(request, id_prod: int):
    """Actualiza un producto"""
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except:
        return JsonResponse({"ok": False, "msg": "JSON inválido"}, status=400)
    
    id_usuario = request.session.get("id_usuario_db")
    codigo = (body.get("codigo") or "").strip()
    nombre = (body.get("nombre") or "").strip()
    descripcion = (body.get("descripcion") or "").strip()
    precio_costo = float(body.get("precioCosto", 0))
    precio_venta = float(body.get("precioVenta", 0))
    stock_actual = int(body.get("stockActual", 0))
    stock_minimo = int(body.get("stockMinimo", 0))
    descuento_maximo_pct = float(body.get("descuentoMaximoPct", 0))
    estado = (body.get("estado") or "activo").strip()
    
    rc = sp_producto_actualizar(
        id_usuario, id_prod, codigo, nombre, descripcion,
        precio_costo, precio_venta, stock_actual, stock_minimo,
        descuento_maximo_pct, estado
    )
    
    if rc != 0:
        MSG = {1: "Dato inválido", 2: "Código duplicado", 3: "No existe", 5: "Error general"}
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)
    
    return JsonResponse({"ok": True})


@require_role("admin")
@require_http_methods(["DELETE"])
def api_producto_eliminar(request, id_prod: int):
    """Elimina un producto (soft por defecto)"""
    modo = request.GET.get("modo", "soft")
    id_usuario = request.session.get("id_usuario_db")
    
    rc = sp_producto_eliminar(id_usuario, id_prod, modo)
    
    if rc != 0:
        MSG = {3: "No existe", 7: "Tiene referencias", 5: "Error general"}
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)
    
    return JsonResponse({"ok": True})


@require_role("admin")
@require_http_methods(["GET"])
def api_producto_categorias(request, id_prod: int):
    """Lista las categorías de un producto"""
    cats = sp_producto_categoria_listar(id_prod)
    return JsonResponse({"ok": True, "data": cats})


@require_role("admin")
@require_http_methods(["POST"])
def api_producto_categoria_asignar(request, id_prod: int, id_cat: int):
    """Asigna una categoría a un producto"""
    id_usuario = request.session.get("id_usuario_db")
    rc = sp_producto_categoria_asignar(id_usuario, id_prod, id_cat)
    
    if rc != 0:
        MSG = {3: "Producto o categoría no existe", 6: "Usuario no válido", 5: "Error general"}
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)
    
    return JsonResponse({"ok": True})


@require_role("admin")
@require_http_methods(["DELETE"])
def api_producto_categoria_quitar(request, id_prod: int, id_cat: int):
    """Quita una categoría de un producto"""
    id_usuario = request.session.get("id_usuario_db")
    rc = sp_producto_categoria_quitar(id_usuario, id_prod, id_cat)
    
    if rc != 0:
        return JsonResponse({"ok": False, "rc": rc, "msg": "Error al quitar categoría"}, status=400)
    
    return JsonResponse({"ok": True})


# ---------------------------
# APIs: Inventario
# ---------------------------
@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_inventario_actual(request):
    """Obtiene el inventario actual"""
    buscar = request.GET.get("buscar")
    solo_criticos = request.GET.get("soloCriticos", "0").lower() in ("1", "true")
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("pageSize", 100))
    
    result = vw_inventario_actual(buscar, solo_criticos, page, page_size)
    return JsonResponse({"ok": True, **result})


@require_role("admin")
@require_http_methods(["POST"])
def api_inventario_entrada(request):
    """Registra un movimiento de inventario (entrada o salida)"""
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except:
        return JsonResponse({"ok": False, "msg": "JSON inválido"}, status=400)
    
    id_usuario = request.session.get("id_usuario_db")
    id_producto = int(body.get("idProducto", 0))
    cantidad = int(body.get("cantidad", 0))
    tipo_movimiento = (body.get("tipoMovimiento") or "E").strip().upper()
    descripcion = (body.get("descripcion") or "").strip()
    
    # Solo tomar costoUnitario si se envió y es válido
    costo_unit = 0.0
    if "costoUnitario" in body and body["costoUnitario"]:
        try:
            costo_unit = float(body["costoUnitario"])
        except (ValueError, TypeError):
            costo_unit = 0.0
    
    # Descripción con tipo de movimiento
    motivo = f"{descripcion}" if descripcion else f"Movimiento tipo {tipo_movimiento}"
    
    # Llamar función con tipo de movimiento
    rc = sp_inventario_registrar_entrada(id_usuario, id_producto, cantidad, costo_unit, motivo, tipo_movimiento)
    
    if rc != 0:
        MSG = {
            1: "Dato inválido", 
            3: "Producto no encontrado",
            6: "Producto o usuario no válido", 
            5: "Error general", 
            11: "Stock insuficiente para realizar la salida"
        }
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)
    
    return JsonResponse({"ok": True})


@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_inventario_historial(request, id_prod: int):
    """Obtiene el historial de movimientos de un producto"""
    data = sp_inventario_historial(id_prod)
    return JsonResponse({"ok": True, "data": data})


# ---------------------------
# APIs: Ventas
# ---------------------------
@require_role("admin")
@require_http_methods(["GET"])
def api_ventas_listar(request):
    """Lista ventas con filtros"""
    fecha_inicio = request.GET.get("fechaInicio")
    fecha_fin = request.GET.get("fechaFin")
    id_usuario = request.GET.get("idUsuario")
    limit = int(request.GET.get("limit", 100))
    offset = int(request.GET.get("offset", 0))
    
    data = listar_ventas(
        fecha_inicio, fecha_fin,
        int(id_usuario) if id_usuario else None,
        limit, offset
    )
    return JsonResponse({"ok": True, "data": data})


@require_role("admin")
@require_http_methods(["POST"])
def api_venta_crear(request):
    """Registra una nueva venta"""
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except:
        return JsonResponse({"ok": False, "msg": "JSON inválido"}, status=400)
    
    id_usuario = request.session.get("id_usuario_db")
    detalles = body.get("detalles", [])
    
    if not detalles:
        return JsonResponse({"ok": False, "msg": "La venta debe tener al menos un producto"}, status=400)
    
    rc, id_venta = sp_registrar_venta(id_usuario, detalles)
    
    if rc != 0:
        MSG = {
            1: "Dato inválido",
            6: "Usuario no válido",
            11: "Stock insuficiente",
            5: "Error general"
        }
        return JsonResponse({"ok": False, "rc": rc, "msg": MSG.get(rc, "Error")}, status=400)
    
    return JsonResponse({"ok": True, "idVenta": id_venta})


@require_role("admin")
@require_http_methods(["GET"])
def api_venta_detalle(request, id_venta: int):
    """Obtiene detalles de una venta"""
    detalles = obtener_venta_detalle(id_venta)
    return JsonResponse({"ok": True, "data": detalles})


# ---------------------------
# APIs: Reportes Productos
# ---------------------------
@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_reporte_ventas_fecha(request):
    """Reporte de ventas por fecha"""
    desde = request.GET.get("desde")
    hasta = request.GET.get("hasta")
    id_usuario_filtro = request.GET.get("idUsuario")
    id_categoria = request.GET.get("idCategoria")
    exportar = request.GET.get("exportar")  # "pdf" o "excel"
    
    # Solo registrar en bitácora si se está exportando (no en visualización normal)
    id_usuario_accion = None
    if exportar in ("pdf", "excel"):
        id_usuario_accion = request.session.get("id_usuario_db")
    
    data = sp_reporte_ventas_por_fecha(
        desde, hasta,
        int(id_usuario_filtro) if id_usuario_filtro else None,
        int(id_categoria) if id_categoria else None,
        id_usuario_accion,  # Usuario que solicita el reporte (para bitácora)
        exportar  # Tipo de exportación
    )
    return JsonResponse({"ok": True, "data": data})


@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_reporte_inventario(request):
    """Reporte de inventario actual"""
    solo_criticos = request.GET.get("soloCriticos", "0").lower() in ("1", "true")
    exportar = request.GET.get("exportar")  # "pdf" o "excel"
    
    # Solo registrar en bitácora si se está exportando (no en visualización normal)
    id_usuario_accion = None
    if exportar in ("pdf", "excel"):
        id_usuario_accion = request.session.get("id_usuario_db")
    
    data = sp_reporte_inventario_actual(
        solo_criticos,
        id_usuario_accion,  # Usuario que solicita el reporte (para bitácora)
        exportar  # Tipo de exportación
    )
    return JsonResponse({"ok": True, "data": data})


@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_reporte_mas_vendidos(request):
    """Reporte de productos más vendidos"""
    top_n = int(request.GET.get("topN", 10))
    desde = request.GET.get("desde")
    hasta = request.GET.get("hasta")
    exportar = request.GET.get("exportar")  # "pdf" o "excel"
    
    # Solo registrar en bitácora si se está exportando (no en visualización normal)
    id_usuario_accion = None
    if exportar in ("pdf", "excel"):
        id_usuario_accion = request.session.get("id_usuario_db")
    
    data = sp_reporte_productos_mas_vendidos(
        top_n, desde, hasta,
        id_usuario_accion,  # Usuario que solicita el reporte (para bitácora)
        exportar  # Tipo de exportación
    )
    return JsonResponse({"ok": True, "data": data})


@require_role("admin", "secretaria")
@require_http_methods(["GET"])
def api_reporte_ingresos(request):
    """Reporte de ingresos totales"""
    modo = request.GET.get("modo", "mensual")
    anio = request.GET.get("anio")
    exportar = request.GET.get("exportar")  # "pdf" o "excel"
    
    # Solo registrar en bitácora si se está exportando (no en visualización normal)
    id_usuario_accion = None
    if exportar in ("pdf", "excel"):
        id_usuario_accion = request.session.get("id_usuario_db")
    
    data = sp_reporte_ingresos_totales(
        modo, 
        int(anio) if anio else None,
        id_usuario_accion,  # Usuario que solicita el reporte (para bitácora)
        exportar  # Tipo de exportación
    )
    return JsonResponse({"ok": True, "data": data})