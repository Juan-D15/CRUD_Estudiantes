from django.shortcuts import render
def home_page(r): return render(r,"home.html")
def registrar_page(r): return render(r,"registrar.html")
def actualizar_page(r): return render(r,"actualizar.html")
def eliminar_page(r): return render(r,"eliminar.html")
def listado_page(r): return render(r,"listado.html")
