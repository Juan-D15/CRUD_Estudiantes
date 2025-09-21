from django.shortcuts import render

def home_page(r): 
    return render(r, "home.html")

def registrar_page(r): 
    return render(r, "registrar.html")

def actualizar_page(r): 
    return render(r, "actualizar.html")

def eliminar_page(r): 
    return render(r, "eliminar.html")

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