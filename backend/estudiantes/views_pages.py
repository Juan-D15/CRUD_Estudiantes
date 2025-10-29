from django.shortcuts import render
from utils.guards import require_role 
from .db import get_usuario_info, solicitar_codigo_reset, verificar_codigo_reset
from django.views.decorators.csrf import ensure_csrf_cookie
import secrets

def login_select(r):
    return render(r, "login_select.html")

@ensure_csrf_cookie
def admin_reset_page(r):
    # Si ya viene por ?t=..., úsalo; si no, lo generamos para el admin logueado
    email = (r.GET.get("e") or "").strip().lower()
    token = (r.GET.get("t") or "").strip()

    if not token:
        uid = r.session.get("id_usuario_db")
        if uid:
            info = get_usuario_info(uid)
            if info:
                email = email or (info.get("correo") or "")
                rol = "admin"
                code = f"{secrets.randbelow(900000)+100000:06d}"
                try:
                    solicitar_codigo_reset(email, code, r.META.get("REMOTE_ADDR"), rol)
                    ok, tk = verificar_codigo_reset(email, code, rol)
                    if ok:
                        token = tk
                except Exception:
                    pass  # si algo falla, la página se renderiza sin token y el JS mostrará el error

    return render(r, "admin_reset.html", {"email": email, "token": token})

@ensure_csrf_cookie
def secretario_reset_page(r):
    email = (r.GET.get("e") or "").strip().lower()
    token = (r.GET.get("t") or "").strip()

    if not token:
        uid = r.session.get("id_usuario_db")
        if uid:
            info = get_usuario_info(uid)
            if info:
                email = email or (info.get("correo") or "")
                rol = "secretaria"
                code = f"{secrets.randbelow(900000)+100000:06d}"
                try:
                    solicitar_codigo_reset(email, code, r.META.get("REMOTE_ADDR"), rol)
                    ok, tk = verificar_codigo_reset(email, code, rol)
                    if ok:
                        token = tk
                except Exception:
                    pass

    return render(r, "secretario_reset.html", {"email": email, "token": token})
    
# ===================== Secretaria =====================
@require_role("secretaria")
@ensure_csrf_cookie
def secre_home_page(request):
    idu = request.session.get("id_usuario_db")
    info = get_usuario_info(idu)
    return render(request, "secretaria/home.html", {"userinfo": info or {}})

# ---- Estudiantes (secretaria) ----
@require_role("secretaria")
@ensure_csrf_cookie
def secre_est_index(request):        # menú/landing del módulo estudiantes
    return render(request, "secretaria/estudiantes/index.html")

@require_role("secretaria")
@ensure_csrf_cookie
def secre_est_listado(request):
    return render(request, "secretaria/estudiantes/listado.html")

@require_role("secretaria")
@ensure_csrf_cookie
def secre_est_registrar(request):
    return render(request, "secretaria/estudiantes/registrar.html")

@require_role("secretaria") 
@ensure_csrf_cookie
def secre_est_actualizar(request, id_est=None):
    return render(request, "secretaria/estudiantes/actualizar.html", {"id_est": id_est})

# ---- Gestión-Usuario (secretaria) ----
@require_role("secretaria")
@ensure_csrf_cookie
def secre_usr_index(request):
    return render(request, "secretaria/gestion-usuario/index.html")

@require_role("secretaria")
@ensure_csrf_cookie
def secre_usr_info(request, id_usr=None):
    if id_usr is None:
        id_usr = request.session.get("id_usuario_db")  # id del usuario logueado
    return render(request, "secretaria/gestion-usuario/info.html", {"id_usr": id_usr})


# ---- Productos (secretaria) ----
@require_role("secretaria")
@ensure_csrf_cookie
def secre_prod_index(request):
    """Página principal del módulo de productos (secretaria)"""
    return render(request, "secretaria/ventas/index-productos-secretario.html")


@require_role("secretaria")
@ensure_csrf_cookie
def secre_prod_inventario(request):
    """Inventario de productos (secretaria)"""
    return render(request, "secretaria/ventas/inventario-productos-secretario.html")


@require_role("secretaria")
@ensure_csrf_cookie
def secre_prod_reportes(request):
    """Reportes de ventas (secretaria)"""
    return render(request, "secretaria/ventas/reportes-ventas-secretario.html")


# ===================== ADMIN =====================
@require_role("admin")
@ensure_csrf_cookie
def admin_home_page(request):
    idu = request.session.get("id_usuario_db")
    info = get_usuario_info(idu)
    return render(request, "admin/home.html", {"userinfo": info or {}})

# ---- Estudiantes (admin) ----
@require_role("admin")
@ensure_csrf_cookie
def admin_est_index(request):        # menú/landing del módulo estudiantes
    return render(request, "admin/estudiantes/index.html")

@require_role("admin")
@ensure_csrf_cookie
def admin_est_listado(request):
    return render(request, "admin/estudiantes/listado.html")

@require_role("admin")
@ensure_csrf_cookie
def admin_est_registrar(request):
    return render(request, "admin/estudiantes/registrar.html")

@require_role("admin") 
@ensure_csrf_cookie
def admin_est_actualizar(request, id_est=None):
    return render(request, "admin/estudiantes/actualizar.html", {"id_est": id_est})

@require_role("admin")                 # eliminar SOLO admin
@ensure_csrf_cookie
def admin_est_eliminar(request, id_est=None):
    return render(request, "admin/estudiantes/eliminar.html", {"id_est": id_est})

# ---- Usuarios (admin) ----
@require_role("admin")
@ensure_csrf_cookie
def admin_usr_index(request):
    return render(request, "admin/usuarios/index.html")

@require_role("admin")
@ensure_csrf_cookie
def admin_usr_listado(request):
    return render(request, "admin/usuarios/listado.html")

@require_role("admin")
@ensure_csrf_cookie
def admin_usr_registrar(request):
    return render(request, "admin/usuarios/registrar.html")

@require_role("admin")
@ensure_csrf_cookie
def admin_usr_editar(request, id_usr=None):
    return render(request, "admin/usuarios/editar.html", {"id_usr": id_usr})

@require_role("admin")
@ensure_csrf_cookie
def admin_usr_eliminar(request, id_usr=None):
    return render(request, "admin/usuarios/eliminar.html", {"id_usr": id_usr})

@require_role("admin")
@ensure_csrf_cookie
def admin_usr_info(request, id_usr=None):
    if id_usr is None:
        id_usr = request.session.get("id_usuario_db")  # id del usuario logueado
    return render(request, "admin/tramites/info.html", {"id_usr": id_usr})

# ---- Reportes (admin) ----
@require_role("admin")
@ensure_csrf_cookie
def admin_rep_index(request):        # menú/landing del módulo estudiantes
    return render(request, "admin/tramites/index.html")

@require_role("admin")
@ensure_csrf_cookie
def admin_rep_reportes(request):        
    return render(request, "admin/tramites/reportes.html")

@require_role("admin")
@ensure_csrf_cookie
def admin_rep_filtros(request):        
    return render(request, "admin/tramites/filtros_busqueda.html")


# ===================== PRODUCTOS / VENTAS =====================
@require_role("admin")
@ensure_csrf_cookie
def admin_prod_index(request):
    """Página principal del módulo de productos"""
    return render(request, "admin/ventas/home-productos.html")


@require_role("admin")
@ensure_csrf_cookie
def admin_prod_categorias(request):
    """Gestión de categorías de productos"""
    return render(request, "admin/ventas/categorias-productos.html")


@require_role("admin")
@ensure_csrf_cookie
def admin_prod_sistema(request):
    """Sistema de productos (CRUD completo)"""
    return render(request, "admin/ventas/productos-sistema.html")


@require_role("admin")
@ensure_csrf_cookie
def admin_prod_inventario(request):
    """Gestión de inventario"""
    return render(request, "admin/ventas/inventario-productos.html")


@require_role("admin")
@ensure_csrf_cookie
def admin_prod_ventas(request):
    """Registro de ventas"""
    return render(request, "admin/ventas/ventas.html")


@require_role("admin")
@ensure_csrf_cookie
def admin_prod_reportes(request):
    """Reportes de productos y ventas"""
    return render(request, "admin/ventas/reportes-productos.html")