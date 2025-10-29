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
    path("logout/", api.logout_view, name="logout_view"),
    
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
    path("api/usuarios/<int:id_usr>", api.api_usr_detalle, name="api_usr_detalle"),
    path("admin/usuarios/info", pages.admin_usr_info, name="admin_usr_info"),
    path("admin/usuarios/info/<int:id_usr>", pages.admin_usr_info, name="admin_usr_info"),

    # Reportes (admin)
    path("admin/reportes", pages.admin_rep_index, name="admin_rep_index"),
    path("admin/reportes/gestion", pages.admin_rep_reportes, name="admin_rep_reportes"),
    path("admin/reportes/filtros", pages.admin_rep_filtros, name="admin_rep_filtros"),
    
    # Vistas Secretaría
    path("secretaria/home", pages.secre_home_page, name="secretaria_home"),

    # Estudiantes (secretaría)
    path("secretaria/estudiantes",                 pages.secre_est_index,     name="secre_est_index"),
    path("secretaria/estudiantes/listado",         pages.secre_est_listado,   name="secre_est_listado"),
    path("secretaria/estudiantes/registrar",       pages.secre_est_registrar, name="secre_est_registrar"),
    path("secretaria/estudiantes/actualizar",      pages.secre_est_actualizar, name="secre_est_actualizar"),
    path("secretaria/estudiantes/actualizar/<int:id_est>", pages.secre_est_actualizar, name="secre_est_actualizar"),

    # Gestión de cuenta (secretaría)
    path("secretaria/cuenta",         pages.secre_usr_index, name="secre_usr_index"),
    path("secretaria/cuenta/info",    pages.secre_usr_info,  name="secre_usr_info"),
   # path("secretaria/cuenta/info/<int:id_usr>", pages.secre_usr_info, name="secre_usr_info"),

    # Productos (secretaría)
    path("secretaria/productos",              pages.secre_prod_index,      name="secre_prod_index"),
    path("secretaria/productos/inventario",   pages.secre_prod_inventario, name="secre_prod_inventario"),
    path("secretaria/productos/reportes",     pages.secre_prod_reportes,   name="secre_prod_reportes"),


    # API
    #Estudiantes (admin, secretaria)
    path("api/estudiantes",                        api.api_listar,        name="api_listar"),          # GET (ambos roles)
    path("api/estudiantes/<int:id_est>",           api.api_detalle,       name="api_detalle"),         # GET (ambos roles)
    path("api/estudiantes/create",                  api.api_crear,         name="api_crear"),           # POST (ambos roles)
    path("api/estudiantes/<int:id_est>/update",api.api_actualizar,    name="api_actualizar"),      # PUT  (solo admin, secretaría)
    path("api/estudiantes/<int:id_est>/delete",  api.api_eliminar,      name="api_eliminar"),        # DELETE (solo admin)
    #Usuarios (admin)
    path("api/usuarios",                          api.api_usr_listar,       name="api_usr_listar"),      # GET: listar
    path("api/usuarios/<int:id_usr>", api.api_usr_detalle, name="api_usr_detalle"),
    path("api/usuarios/create",                    api.api_usr_crear,        name="api_usr_crear"),       # POST: crear
    path("api/usuarios/<int:id_usr>/actualizar",  api.api_usr_actualizar,   name="api_usr_actualizar"),  # PUT: actualizar
    path("api/usuarios/<int:id_usr>/eliminar",    api.api_usr_eliminar,     name="api_usr_eliminar"),    # DELETE: eliminar
    path("api/usuarios/<int:id_usr>/bloquear",    api.api_usr_bloquear,     name="api_usr_bloquear"),    # POST: bloquear
    path("api/usuarios/<int:id_usr>/desbloquear", api.api_usr_desbloquear,  name="api_usr_desbloquear"), # POST: desbloquear
    path("api/cuenta/password/cambiar", api.api_cambiar_password_autenticado, name="api_cambiar_password_autenticado"),

    # Reportes (admin)
    path("api/reportes/filtros", api.api_reportes_filtros, name="api_reportes_filtros"),
    path("api/reportes/acciones-transacciones", api.api_reportes_acciones_transacciones, name="api_reportes_acciones_transacciones"),
    path('api/filtros/busqueda', api.api_filtros_busqueda, name="api_filtros_busqueda"),

    # JSON
    path("api/reportes/ultima-conexion",  api.api_rep_ultima_conexion, name="api_rep_ultima_conexion"),
    path("api/reportes/tiempo-promedio",  api.api_rep_tiempo_promedio, name="api_rep_tiempo_promedio"),
    path("api/reportes/accesos",          api.api_rep_accesos,         name="api_rep_accesos"),
    path("api/reportes/transacciones",    api.api_rep_transacciones,   name="api_rep_transacciones"),
    path("api/reportes/datos-personales", api.api_rep_datos_personales,name="api_rep_datos_personales"),

    # Export
    path("api/reportes/accesos/export",       api.api_rep_accesos_export,       name="api_rep_accesos_export"),
    path("api/reportes/transacciones/export", api.api_rep_transacciones_export, name="api_rep_transacciones_export"),

    # ============ PRODUCTOS / VENTAS ============
    # Vistas de páginas (admin)
    path("admin/productos", pages.admin_prod_index, name="admin_prod_index"),
    path("admin/productos/categorias", pages.admin_prod_categorias, name="admin_prod_categorias"),
    path("admin/productos/sistema", pages.admin_prod_sistema, name="admin_prod_sistema"),
    path("admin/productos/inventario", pages.admin_prod_inventario, name="admin_prod_inventario"),
    path("admin/productos/ventas", pages.admin_prod_ventas, name="admin_prod_ventas"),
    path("admin/productos/reportes", pages.admin_prod_reportes, name="admin_prod_reportes"),

    # APIs - Categorías
    path("api/categorias", api.api_categoria_listar, name="api_categoria_listar"),
    path("api/categorias/<int:id_cat>", api.api_categoria_detalle, name="api_categoria_detalle"),
    path("api/categorias/create", api.api_categoria_crear, name="api_categoria_crear"),
    path("api/categorias/<int:id_cat>/update", api.api_categoria_actualizar, name="api_categoria_actualizar"),
    path("api/categorias/<int:id_cat>/delete", api.api_categoria_eliminar, name="api_categoria_eliminar"),

    # APIs - Productos
    path("api/productos", api.api_producto_listar, name="api_producto_listar"),
    path("api/productos/<int:id_prod>", api.api_producto_detalle, name="api_producto_detalle"),
    path("api/productos/create", api.api_producto_crear, name="api_producto_crear"),
    path("api/productos/<int:id_prod>/update", api.api_producto_actualizar, name="api_producto_actualizar"),
    path("api/productos/<int:id_prod>/delete", api.api_producto_eliminar, name="api_producto_eliminar"),
    path("api/productos/<int:id_prod>/categorias", api.api_producto_categorias, name="api_producto_categorias"),
    path("api/productos/<int:id_prod>/categorias/<int:id_cat>/assign", api.api_producto_categoria_asignar, name="api_producto_categoria_asignar"),
    path("api/productos/<int:id_prod>/categorias/<int:id_cat>/remove", api.api_producto_categoria_quitar, name="api_producto_categoria_quitar"),

    # APIs - Inventario
    path("api/inventario", api.api_inventario_actual, name="api_inventario_actual"),
    path("api/inventario/entrada", api.api_inventario_entrada, name="api_inventario_entrada"),
    path("api/inventario/historial/<int:id_prod>", api.api_inventario_historial, name="api_inventario_historial"),

    # APIs - Ventas
    path("api/ventas", api.api_ventas_listar, name="api_ventas_listar"),
    path("api/ventas/create", api.api_venta_crear, name="api_venta_crear"),
    path("api/ventas/<int:id_venta>", api.api_venta_detalle, name="api_venta_detalle"),

    # APIs - Reportes Productos
    path("api/reportes/productos/ventas", api.api_reporte_ventas_fecha, name="api_reporte_ventas_fecha"),
    path("api/reportes/productos/inventario", api.api_reporte_inventario, name="api_reporte_inventario"),
    path("api/reportes/productos/mas-vendidos", api.api_reporte_mas_vendidos, name="api_reporte_mas_vendidos"),
    path("api/reportes/productos/ingresos", api.api_reporte_ingresos, name="api_reporte_ingresos"),
]
