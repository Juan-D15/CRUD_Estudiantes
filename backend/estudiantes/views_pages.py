from django.shortcuts import render
from utils.guards import require_role  # <-- NUEVO

@require_role("admin", "secretaria")
def home_page(r): 
    return render(r, "home.html")

@require_role("admin", "secretaria")
def registrar_page(r): 
    return render(r, "registrar.html")

@require_role("admin")  # solo admin
def actualizar_page(r): 
    return render(r, "actualizar.html")

@require_role("admin")  # solo admin
def eliminar_page(r): 
    return render(r, "eliminar.html")

@require_role("admin", "secretaria")
def listado_page(r): 
    return render(r, "listado.html")

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
