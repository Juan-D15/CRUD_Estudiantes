# CRUD/urls.py
from django.contrib import admin
from django.urls import path
from estudiantes import views as api
from estudiantes import views_pages as pages

urlpatterns = [
    path("admin/", admin.site.urls),

    # Páginas
    path("", pages.login_select, name="login_select"),
    #path("", pages.home_page, name="home"),
    path("home/", pages.home_page, name="home"),
    path("registrar/", pages.registrar_page, name="registrar"),
    path("actualizar/", pages.actualizar_page, name="actualizar"),
    path("eliminar/", pages.eliminar_page, name="eliminar"),
    path("listado/", pages.listado_page, name="listado"),

    #  Logins / selección
    path("login/", pages.login_select, name="login_select"),
    path("login/select", pages.login_select, name="login_select"),
    path("login/admin/", api.login_admin, name="admin_login"),
    path("login/secretario/", api.login_secretario, name="secretario_login"),
    path("logout/", api.logout_view, name="logout"),
    
    # Flujo Reset
    path("auth/reset/send-code", api.reset_send_code, name="reset_send_code"),
    path("auth/reset/verify",     api.reset_verify_code, name="reset_verify_code"),
    path("auth/reset/commit",     api.reset_commit,      name="reset_commit"),
    path("reset/admin",           pages.admin_reset_page,      name="admin_reset_page"),
    path("reset/secretario",      pages.secretario_reset_page, name="secretario_reset_page"),
    
    # API
    path("api/estudiantes", api.api_listar),
    path("api/estudiantes/<int:id_est>", api.api_detalle),
    path("api/estudiantes/create", api.api_crear),
    path("api/estudiantes/<int:id_est>/update", api.api_actualizar),
    path("api/estudiantes/<int:id_est>/delete", api.api_eliminar),
]
