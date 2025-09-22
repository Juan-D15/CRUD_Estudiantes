# CRUD/urls.py
from django.contrib import admin
from django.urls import path
from estudiantes import views as api
from estudiantes import views_pages as pages

urlpatterns = [
    #path("admin/", admin.site.urls),

    # Páginas
    path("", pages.login_select, name="login_select"),
    

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
    
    # Vistas Administrador
    path("admin/home", pages.admin_home_page, name="admin_home"),
    # Estudiantes (admin)
    path("admin/estudiantes", pages.admin_est_index, name="admin_est_index"),
    path("admin/estudiantes/listado",  pages.admin_est_listado,  name="admin_est_listado"),
    path("admin/estudiantes/registrar",pages.admin_est_registrar, name="admin_est_registrar"),
    path("admin/estudiantes/actualizar", pages.admin_est_actualizar, name="admin_est_actualizar"),           # sin id (lista → elige)
    path("admin/estudiantes/actualizar/<int:id_est>", pages.admin_est_actualizar, name="admin_est_actualizar"),
    path("admin/estudiantes/eliminar", pages.admin_est_eliminar, name="admin_est_eliminar"),
    path("admin/estudiantes/eliminar/<int:id_est>",   pages.admin_est_eliminar,   name="admin_est_eliminar"),
    # Usuarios (admin)
    path("admin/usuarios", pages.admin_usr_index, name="admin_usr_index"),
    path("admin/usuarios/listado", pages.admin_usr_listado, name="admin_usr_listado"),
    path("admin/usuarios/registrar", pages.admin_usr_registrar, name="admin_usr_registrar"),
    path("admin/usuarios/eliminar",   pages.admin_usr_eliminar,   name="admin_usr_eliminar"),
    path("admin/usuarios/eliminar/<int:id_usr>",   pages.admin_usr_eliminar,   name="admin_usr_eliminar"),
    path("admin/usuarios/editar", pages.admin_usr_editar, name="admin_usr_editar"),
    path("admin/usuarios/editar/<int:id_usr>", pages.admin_usr_editar, name="admin_usr_editar"),
    path("admin/usuarios/info", pages.admin_usr_info, name="admin_usr_info"),
    path("admin/usuarios/info/<int:id_usr>", pages.admin_usr_info, name="admin_usr_info"),
    #path("admin/usuarios/bloquear/<int:id_usr>",   pages.admin_usr_bloquear,   name="admin_usr_bloquear"),
    #path("admin/usuarios/desbloquear/<int:id_usr>",pages.admin_usr_desbloquear,name="admin_usr_desbloquear"),

    # Reportes (admin)
    path("admin/reportes", pages.admin_rep_index, name="admin_rep_index"),
    #path("admin/reportes/ultima-conexion", pages.admin_rep_ultima_conexion, name="admin_rep_ultima_conexion"),
    #path("admin/reportes/tiempo-promedio", pages.admin_rep_tiempo_promedio, name="admin_rep_tiempo_promedio"),
    
    
    # Vistas Secretaria
    #path("secretaria/home", pages.secretaria_home_page, name="secretaria_home"),
    # Estudiantes (secretaría)
    #path("secretaria/estudiantes/listado",   pages.secretaria_est_listado,   name="secretaria_est_listado"),
    #path("secretaria/estudiantes/registrar", pages.secretaria_est_registrar, name="secretaria_est_registrar"),
    #path("secretaria/estudiantes/actualizar/<int:id_est>", pages.secretaria_est_actualizar, name="secretaria_est_actualizar"),
    #path("secretaria/estudiantes/ver/<int:id_est>", pages.secretaria_est_ver, name="secretaria_est_ver"),

    # API
    #Estudiantes (admin, secretaria)
    path("api/estudiantes",                        api.api_listar,        name="api_listar"),          # GET (ambos roles)
    path("api/estudiantes/<int:id_est>",           api.api_detalle,       name="api_detalle"),         # GET (ambos roles)
    path("api/estudiantes/create",                  api.api_crear,         name="api_crear"),           # POST (ambos roles)
    path("api/estudiantes/<int:id_est>/update",api.api_actualizar,    name="api_actualizar"),      # PUT  (solo admin, secretaría)
    path("api/estudiantes/<int:id_est>/delete",  api.api_eliminar,      name="api_eliminar"),        # DELETE (solo admin)
    #Usuarios (admin)
    path("api/usuarios",                          api.api_usr_listar,       name="api_usr_listar"),      # GET: listar
    path("api/usuarios/crear",                    api.api_usr_crear,        name="api_usr_crear"),       # POST: crear
    path("api/usuarios/<int:id_usr>/actualizar",  api.api_usr_actualizar,   name="api_usr_actualizar"),  # PUT: actualizar
    path("api/usuarios/<int:id_usr>/eliminar",    api.api_usr_eliminar,     name="api_usr_eliminar"),    # DELETE: eliminar
    path("api/usuarios/<int:id_usr>/bloquear",    api.api_usr_bloquear,     name="api_usr_bloquear"),    # POST: bloquear
    path("api/usuarios/<int:id_usr>/desbloquear", api.api_usr_desbloquear,  name="api_usr_desbloquear"), # POST: desbloquear

    # ================== Reportes (SOLO ADMIN) ================================
    #path("api/reportes/ultima-conexion",  api.api_rep_ultima_conexion, name="api_rep_ultima_conexion"), # GET
    #path("api/reportes/tiempo-promedio",  api.api_rep_tiempo_promedio, name="api_rep_tiempo_promedio"), # GET
    
    # JSON
    path("api/reportes/ultima-conexion",  api.api_rep_ultima_conexion, name="api_rep_ultima_conexion"),
    path("api/reportes/tiempo-promedio",  api.api_rep_tiempo_promedio, name="api_rep_tiempo_promedio"),
    path("api/reportes/accesos",          api.api_rep_accesos,         name="api_rep_accesos"),
    path("api/reportes/transacciones",    api.api_rep_transacciones,   name="api_rep_transacciones"),
    path("api/reportes/datos-personales", api.api_rep_datos_personales,name="api_rep_datos_personales"),

    # Export
    path("api/reportes/accesos/export",       api.api_rep_accesos_export,       name="api_rep_accesos_export"),
    path("api/reportes/transacciones/export", api.api_rep_transacciones_export, name="api_rep_transacciones_export"),
]
