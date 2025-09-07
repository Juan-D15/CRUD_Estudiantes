from django.contrib import admin
from django.urls import path
from estudiantes import views as api
from estudiantes import views_pages as pages

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", pages.home_page, name="home"),
    path("registrar/", pages.registrar_page, name="registrar"),
    path("actualizar/", pages.actualizar_page, name="actualizar"),
    path("eliminar/", pages.eliminar_page, name="eliminar"),
    path("listado/", pages.listado_page, name="listado"),

    path("api/estudiantes", api.api_listar),
    path("api/estudiantes/<int:id_est>", api.api_detalle),
    path("api/estudiantes/create", api.api_crear),
    path("api/estudiantes/<int:id_est>/update", api.api_actualizar),
    path("api/estudiantes/<int:id_est>/delete", api.api_eliminar),
]
