from django.shortcuts import render
from utils.guards import require_role 
from .db import get_usuario_info 
from django.views.decorators.csrf import ensure_csrf_cookie


def login_select(r):
    return render(r, "login_select.html")

def admin_reset_page(r):
    return render(r, "admin_reset.html", {
        "email": r.GET.get("e",""),
        "token": r.GET.get("t",""),
    })

def secretario_reset_page(r):
    return render(r, "secretario_reset.html", {
        "email": r.GET.get("e",""),
        "token": r.GET.get("t",""),
    })
    
# ===================== ADMIN =====================

@require_role("admin")
def admin_home_page(request):
    idu = request.session.get("id_usuario_db")
    info = get_usuario_info(idu)
    return render(request, "admin/home.html", {"userinfo": info or {}})

# ---- Estudiantes (admin) ----
@require_role("admin")
def admin_est_index(request):        # menú/landing del módulo estudiantes
    return render(request, "admin/estudiantes/index.html")

@require_role("admin", "secretaria")
@ensure_csrf_cookie
def admin_est_listado(request):
    return render(request, "admin/estudiantes/listado.html")

@require_role("admin", "secretaria")
@ensure_csrf_cookie
def admin_est_registrar(request):
    return render(request, "admin/estudiantes/registrar.html")

@require_role("admin", "secretaria") 
@ensure_csrf_cookie
def admin_est_actualizar(request, id_est=None):
    # si quieres, pasa el id al template: {"id_est": id_est}
    return render(request, "admin/estudiantes/actualizar.html", {"id_est": id_est})

@require_role("admin")                 # eliminar SOLO admin
@ensure_csrf_cookie
def admin_est_eliminar(request, id_est=None):
    return render(request, "admin/estudiantes/eliminar.html", {"id_est": id_est})

# ---- Usuarios (admin) ----
@require_role("admin")
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

#Reportes
@require_role("admin")
def admin_rep_index(request):        # menú/landing del módulo estudiantes
    return render(request, "admin/tramites/index.html")

@require_role("admin")
def admin_rep_reportes(request):        
    return render(request, "admin/tramites/reportes.html")
