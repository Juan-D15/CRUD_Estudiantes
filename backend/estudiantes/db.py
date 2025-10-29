from django.db import connection

def _row_to_dict(row, cols):
    return {c: row[i] for i, c in enumerate(cols)}

# Códigos de retorno estándar de los Stored Procedures
RC_OK = 0
RC_DATO_INVALIDO = 1
RC_DUPLICADO = 2
RC_NO_EXISTE = 3
RC_PWD_DEBIL = 4
RC_ERROR_GENERAL = 5
RC_USUARIO_NO_EXISTE = 6
RC_TIENE_REFERENCIAS = 7
RC_CREDENCIALES_INVALIDAS = 8
RC_CONFIRMACION_NO_COINCIDE = 9
RC_TIENE_REFERENCIAS_BITACORA = 10
RC_STOCK_INSUFICIENTE = 11

def get_rc_message(rc: int) -> str:
    """Convierte código de retorno a mensaje en español"""
    messages = {
        RC_OK: "Operación exitosa",
        RC_DATO_INVALIDO: "Dato requerido o inválido",
        RC_DUPLICADO: "Ya existe un registro con esos datos",
        RC_NO_EXISTE: "El registro no existe",
        RC_PWD_DEBIL: "La contraseña no cumple los requisitos de seguridad",
        RC_ERROR_GENERAL: "Error general en la base de datos",
        RC_USUARIO_NO_EXISTE: "Usuario no existe o no está activo",
        RC_TIENE_REFERENCIAS: "No se puede eliminar: tiene referencias en otros registros",
        RC_CREDENCIALES_INVALIDAS: "Usuario o contraseña incorrectos",
        RC_CONFIRMACION_NO_COINCIDE: "La confirmación no coincide",
        RC_TIENE_REFERENCIAS_BITACORA: "No se puede eliminar: tiene registros en bitácora",
        RC_STOCK_INSUFICIENTE: "Stock insuficiente para completar la operación"
    }
    return messages.get(rc, f"Error desconocido: {rc}")

# ============ INSERTAR ============
def insertar_estudiante(nombres: str, apellidos: str, correo: str, telefono: str):
    """
    Llama a dbo.sp_InsertarEstudiante y recupera:
      - rc (código de retorno)
      - idNuevo (ID del estudiante insertado)
    """
    sql = """
    DECLARE @rc INT, @id INT;

    EXEC @rc = dbo.sp_InsertarEstudiante
        @nombres = %s,
        @apellidos = %s,
        @correo = %s,
        @telefono = %s,
        @idNuevo = @id OUTPUT;

    SELECT @rc AS rc, @id AS idNuevo;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [nombres, apellidos, correo, telefono])
        rc, id_nuevo = cur.fetchone()
    # rc: 0=ok, 1..6=errores (según tu convenio)
    return int(rc), (int(id_nuevo) if id_nuevo is not None else None)

# ============ CONSULTAR ============
def listar_estudiantes():
    """
    Devuelve lista de dicts con:
    idEstudiante, nombres, apellidos, correo, telefono, fechaRegistro
    """
    sql = "EXEC dbo.sp_ConsultarEstudiantes"
    with connection.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
    cols = ["idEstudiante", "nombres", "apellidos", "correo", "telefono", "fechaRegistro"]
    return [_row_to_dict(r, cols) for r in rows]

def obtener_estudiante_por_id(id_est: int):
    """
    Consulta directa a la tabla (solo para detalle puntual).
    """
    sql = """
    SELECT idEstudiante, nombres, apellidos, correo, telefono, fechaRegistro
    FROM dbo.tbEstudiante
    WHERE idEstudiante = %s
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_est])
        row = cur.fetchone()
    if not row:
        return None
    cols = ["idEstudiante", "nombres", "apellidos", "correo", "telefono", "fechaRegistro"]
    return _row_to_dict(row, cols)

# ============ ACTUALIZAR ============
def actualizar_estudiante(id_est: int, nombres: str, apellidos: str, correo: str, telefono: str):
    """
    Llama a dbo.sp_ActualizarEstudiante
    Retorna rc (0=ok, 1..6=errores)
    """
    sql = """
    DECLARE @rc INT;

    EXEC @rc = dbo.sp_ActualizarEstudiante
        @idEstudiante = %s,
        @nombres = %s,
        @apellidos = %s,
        @correo = %s,
        @telefono = %s;

    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_est, nombres, apellidos, correo, telefono])
        rc = cur.fetchone()[0]
    return int(rc)

# ============ ELIMINAR ============
def eliminar_estudiante(id_est: int):
    """
    Llama a dbo.sp_EliminarEstudiante
    Retorna rc (0=ok, 6=no encontrado, 5=error BD)
    """
    sql = """
    DECLARE @rc INT;

    EXEC @rc = dbo.sp_EliminarEstudiante
        @idEstudiante = %s;

    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_est])
        rc = cur.fetchone()[0]
    return int(rc)

# ============ LOGIN ============
def login_usuario(usuario: str, pwd: str, ip: str | None = None, dispositivo: str | None = None):
    """
    Llama dbo.sp_LoginUsuario y devuelve (rc, id_sesion).
    rc: 0 ok, 7 bloqueado, 8 credenciales inválidas.
    """
    sql = """
    DECLARE @rc INT, @idSesion INT;
    EXEC @rc = dbo.sp_LoginUsuario
         @usuario=%s,
         @pwd=%s,
         @ip=%s,
         @dispositivo=%s,
         @idSesion=@idSesion OUTPUT;
    SELECT @rc, @idSesion;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [usuario, pwd, ip, dispositivo])
        rc, id_sesion = cur.fetchone()
    return int(rc), (id_sesion or 0)

def get_usuario_rol(login_str: str):
    """
    Devuelve (idUsuario, rol) buscando por usuario O por correo (case-insensitive).
    """
    sql = """
    SELECT TOP 1 idUsuario, rol
    FROM dbo.tbUsuario
    WHERE usuario = %s OR LOWER(correo) = LOWER(%s)
    """
    with connection.cursor() as cur:
        cur.execute(sql, [login_str, login_str])
        row = cur.fetchone()
    return (row[0], row[1]) if row else (None, None)

def cerrar_sesion(id_sesion: int, ip: str | None = None, dispositivo: str | None = None):
    """
    Cierra sesión en BD (sp_CerrarSesion). Devuelve rc.
    """
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_CerrarSesion
         @idSesion=%s,
         @ip=%s,
         @dispositivo=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_sesion, ip, dispositivo])
        rc, = cur.fetchone()
    return int(rc)

# ============ CODIGO RECUPERACIÓN ============
def solicitar_codigo_reset(email: str, code: str, ip: str|None, rol: str|None) -> int:
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_Reset_SolicitarCodigo
      @Correo=%s, @CodigoPlano=%s, @Ip=%s, @Rol=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [email, code, ip, rol])
        rc, = cur.fetchone()
    return int(rc)

def verificar_codigo_reset(email: str, code: str, rol: str|None):
    sql = """
    DECLARE @ok bit, @token nvarchar(200);
    EXEC dbo.sp_Reset_VerificarCodigo
      @Correo=%s, @CodigoPlano=%s, @Rol=%s,
      @Ok=@ok OUTPUT, @Token=@token OUTPUT;
    SELECT @ok, @token;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [email, code, rol])
        ok, token = cur.fetchone()
    return bool(ok), (token or "")

def reset_password_token(token: str, newpwd: str) -> int:
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_Reset_CambiarPassword
      @Token=%s, @NuevaPwd=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [token, newpwd])
        rc, = cur.fetchone()
    return int(rc)

# -----------------------
# Estudiantes (con auditoría)
# -----------------------
def sp_est_insertar(n, a, c, t, id_usuario_accion: int):
    sql = """
    DECLARE @rc INT, @idNuevo INT;
    EXEC @rc = dbo.sp_InsertarEstudiante
      @nombres=%s, @apellidos=%s, @correo=%s, @telefono=%s,
      @idUsuarioAccion=%s, @idNuevo=@idNuevo OUTPUT;
    SELECT @rc, @idNuevo;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [n, a, c, t, id_usuario_accion])
        rc, new_id = cur.fetchone()
    return int(rc), int(new_id or 0)

def sp_est_actualizar(id_est: int, n, a, c, t, id_usuario_accion: int):
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_ActualizarEstudiante
      @idEstudiante=%s, @nombres=%s, @apellidos=%s, @correo=%s, @telefono=%s,
      @idUsuarioAccion=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_est, n, a, c, t, id_usuario_accion])
        rc, = cur.fetchone()
    return int(rc)

def sp_est_eliminar(id_est: int, id_usuario_accion: int):
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_EliminarEstudiante
      @idEstudiante=%s, @idUsuarioAccion=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_est, id_usuario_accion])
        rc, = cur.fetchone()
    return int(rc)


# -----------------------
# Usuarios (solo admin)
# -----------------------
def registrar_usuario(u, nc, co, rol, pwd, pwdc):
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_RegistrarUsuario
      @usuario=%s, @nombreCompleto=%s, @correo=%s, @rol=%s, @pwd=%s, @pwdConfirm=%s;
    SELECT @rc;
    """
    from django.db import connection
    with connection.cursor() as cur:
        cur.execute(sql, [u, nc, co, rol, pwd, pwdc])
        rc, = cur.fetchone()
    return int(rc)

def sp_usr_listar(solo_activos: bool|None=None, rol: str|None=None):
    sql = "EXEC dbo.sp_ListarUsuarios @soloActivos=%s, @rol=%s"
    with connection.cursor() as cur:
        cur.execute(sql, [None if solo_activos is None else (1 if solo_activos else 0), rol])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


def actualizar_usuario(id_usr: int, usuario: str, nombre: str, correo: str,
                       rol: str, estado: str, id_admin_accion: int) -> int:
    """
    Llama a dbo.sp_ActualizarUsuario (ya creado en tu SQL).
    Códigos: 0=OK, 2=usuario duplicado, 3=correo duplicado, 6=no existe, 5=error.
    """
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_ActualizarUsuario
        @idUsuario = %s,
        @usuario = %s,
        @nombreCompleto = %s,
        @correo = %s,
        @rol = %s,
        @estado = %s,
        @idAdminAccion = %s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usr, usuario, nombre, correo, rol, estado, id_admin_accion])
        rc = cur.fetchone()[0]
    return int(rc)

def sp_usr_eliminar(id_usuario: int, id_admin_accion: int):
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_EliminarUsuario
      @idUsuario=%s, @idAdminAccion=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, id_admin_accion])
        rc, = cur.fetchone()
    return int(rc)

def bloquear_usuario(id_admin: int, id_usuario: int) -> int:
    """
    Llama dbo.sp_BloquearUsuario.
    rc:
      0 = OK
      6 = admin no válido o usuario no existe
      5 = error general (si lo definiste así en el SP)
    """
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_BloquearUsuario
         @idAdmin=%s,
         @idUsuario=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_admin, id_usuario])
        rc, = cur.fetchone()
    return int(rc)

def desbloquear_usuario(id_admin: int, id_usuario: int) -> int:
    """
    Llama dbo.sp_DesbloquearUsuario.
    rc:
      0 = OK
      6 = admin no válido o usuario no existe
      5 = error general (si lo definiste así en el SP)
    """
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_DesbloquearUsuario
         @idAdmin=%s,
         @idUsuario=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_admin, id_usuario])
        rc, = cur.fetchone()
    return int(rc)


def get_usuario_info(id_usuario: int):
    if not id_usuario:
        return None
    sql = """
    SELECT usuario, nombreCompleto, correo, rol, estado, fechaCreacion
    FROM dbo.tbUsuario WHERE idUsuario=%s
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario])
        row = cur.fetchone()
        if not row: return None
        cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))

def actualizar_contrasena(id_usuario: int, pwd_actual: str, pwd_nueva: str, pwd_confirm: str) -> int:
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_ActualizarContrasena
      @idUsuario=%s, @pwdActual=%s, @pwdNueva=%s, @pwdConfirm=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, pwd_actual, pwd_nueva, pwd_confirm])
        rc, = cur.fetchone()
    return int(rc)


# -----------------------
# Reportes
# -----------------------
def rep_accesos(usuario=None, estado=None, f_ini=None, f_fin=None, accion=None, limit=500, offset=0):
    """
    estado: None = todos, True = éxitos, False = fallos
    accion: 'login' | 'logout' | None
    f_ini/f_fin: 'YYYY-MM-DD' (inclusive f_ini, exclusivo f_fin +1 día si quieres exacto por app)
    """
    where = []
    params = []

    if usuario:
        where.append("(u.usuario = %s OR a.usuarioTxt = %s)")
        params += [usuario, usuario]
    if estado is not None:
        where.append("a.exito = %s")
        params.append(1 if estado else 0)
    if accion:
        where.append("a.accion = %s")
        params.append(accion)
    if f_ini:
        where.append("a.fechaHora >= %s")
        params.append(f_ini)
    if f_fin:
        where.append("a.fechaHora < DATEADD(day, 1, %s)")
        params.append(f_fin)

    sql = f"""
    SELECT a.idAcceso,
           COALESCE(u.usuario, a.usuarioTxt) AS usuario,
           a.fechaHora, a.exito, a.accion, a.ip, a.dispositivo, a.motivo,
           u.estado AS estadoUsuario                -- <--- NUEVO
    FROM dbo.tbBitacoraAcceso a
    LEFT JOIN dbo.tbUsuario u ON u.idUsuario = a.idUsuario
    {"WHERE " + " AND ".join(where) if where else ""}
    ORDER BY a.fechaHora DESC, a.idAcceso DESC
    OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
    """
    params += [offset, limit]
    with connection.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]

# ------- Bitácora de Transacciones (con filtros) -------
def rep_transacciones(usuario=None, entidad=None, operacion=None, f_ini=None, f_fin=None, limit=500, offset=0):
    """
    entidad: 'tbUsuario' | 'tbEstudiante' | None
    operacion: 'INSERT','UPDATE','DELETE','CREATE','BLOCK','UNBLOCK','CHANGE_PASSWORD' | None
    """
    where, params = [], []
    if usuario:
        where.append("u.usuario = %s")
        params.append(usuario)
    if entidad:
        where.append("t.entidad = %s")
        params.append(entidad)
    if operacion:
        where.append("t.operacion = %s")
        params.append(operacion)
    if f_ini:
        where.append("t.fechaHora >= %s")
        params.append(f_ini)
    if f_fin:
        where.append("t.fechaHora < DATEADD(day, 1, %s)")
        params.append(f_fin)

    sql = f"""
    SELECT t.idTransaccion, u.usuario, t.fechaHora, t.entidad, t.operacion, t.idAfectado,
           t.datosAnterior, t.datosNuevo,
           u.estado AS estadoUsuario                -- <--- NUEVO
    FROM dbo.tbBitacoraTransacciones t
    JOIN dbo.tbUsuario u ON u.idUsuario = t.idUsuario
    {"WHERE " + " AND ".join(where) if where else ""}
    ORDER BY t.fechaHora DESC, t.idTransaccion DESC
    OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
    """
    params += [offset, limit]
    with connection.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]

# ------- Vistas: última conexión y tiempo promedio -------
def vw_ultima_conexion():
    with connection.cursor() as cur:
        cur.execute("SELECT idUsuario, usuario, ultimaConexion FROM dbo.vwUltimaConexion ORDER BY ultimaConexion DESC")
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]

def vw_tiempo_promedio():
    with connection.cursor() as cur:
        cur.execute("SELECT idUsuario, usuario, minutosPromedio FROM dbo.vwTiempoPromedioUso ORDER BY minutosPromedio DESC")
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]

# ------- Datos personales de usuarios -------
def rep_datos_personales(rol=None, estado=None):
    """
    rol: 'admin'|'secretaria'|None
    estado: 'activo'|'bloqueado'|None
    """
    where, params = [], []
    if rol:
        where.append("rol = %s")
        params.append(rol)
    if estado:
        where.append("estado = %s")
        params.append(estado)

    sql = f"""
    SELECT
        idUsuario,
        usuario,
        nombreCompleto,
        correo,
        rol,
        estado,
        ultimoCambioPwd,
        intentosFallidos,
        must_reset,
        fechaCreacion
    FROM dbo.tbUsuario
    {"WHERE " + " AND ".join(where) if where else ""}
    ORDER BY fechaCreacion DESC, idUsuario DESC
    """
    with connection.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


# -----------------------
# CATEGORÍAS
# -----------------------
def sp_categoria_crear(id_usuario: int, nombre: str, estado: str = 'activa'):
    """
    Crea una categoría.
    RC: 0=OK, 1=dato inválido, 2=duplicado, 6=usuario no existe, 5=error
    """
    sql = """
    DECLARE @rc INT, @id INT;
    EXEC @rc = dbo.sp_Categoria_Crear
      @idUsuario=%s, @nombre=%s, @estado=%s, @idCategoria=@id OUTPUT;
    SELECT @rc, @id;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, nombre, estado])
        rc, id_cat = cur.fetchone()
    return int(rc), int(id_cat or 0)


def sp_categoria_actualizar(id_usuario: int, id_categoria: int, nombre: str, estado: str):
    """Actualiza categoría. RC: 0=OK, 1=inválido, 2=duplicado, 3=no existe"""
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_Categoria_Actualizar
      @idUsuario=%s, @idCategoria=%s, @nombre=%s, @estado=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, id_categoria, nombre, estado])
        rc, = cur.fetchone()
    return int(rc)


def sp_categoria_eliminar(id_usuario: int, id_categoria: int, modo: str = 'soft'):
    """Elimina categoría. RC: 0=OK, 3=no existe, 7=tiene referencias"""
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_Categoria_Eliminar
      @idUsuario=%s, @idCategoria=%s, @modo=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, id_categoria, modo])
        rc, = cur.fetchone()
    return int(rc)


def sp_categoria_obtener(id_categoria: int):
    """Obtiene una categoría por ID"""
    sql = "EXEC dbo.sp_Categoria_Obtener @idCategoria=%s"
    with connection.cursor() as cur:
        cur.execute(sql, [id_categoria])
        row = cur.fetchone()
        if not row:
            return None
        cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))


def sp_categoria_listar(buscar: str = None, solo_activas: bool = False, page: int = 1, page_size: int = 100):
    """Lista categorías con paginación (acceso directo optimizado)"""
    where = ["1=1"]
    params = []
    
    if solo_activas:
        where.append("estado = 'activa'")
    
    if buscar:
        where.append("nombre LIKE %s")
        params.append(f'%{buscar}%')
    
    where_clause = " AND ".join(where)
    
    # Contar total
    sql_count = f"SELECT COUNT(*) FROM dbo.tbCategoria WHERE {where_clause}"
    
    # Obtener datos paginados
    sql_data = f"""
    SELECT idCategoria, nombre, estado, fechaCreacion
    FROM dbo.tbCategoria
    WHERE {where_clause}
    ORDER BY nombre
    OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
    """
    
    with connection.cursor() as cur:
        # Total
        cur.execute(sql_count, params)
        total = cur.fetchone()[0]
        
        # Datos
        offset = (page - 1) * page_size
        cur.execute(sql_data, params + [offset, page_size])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
        data = [dict(zip(cols, r)) for r in rows]
    
    return {
        'data': data,
        'total': total,
        'page': page,
        'pageSize': page_size
    }


# -----------------------
# PRODUCTOS
# -----------------------
def sp_producto_crear(id_usuario: int, codigo: str, nombre: str, descripcion: str = None,
                     precio_costo: float = 0, precio_venta: float = 0, stock_actual: int = 0, 
                     stock_minimo: int = 0, descuento_maximo_pct: float = 0, estado: str = 'activo'):
    """
    Crea un producto.
    RC: 0=OK, 1=dato inválido, 2=código duplicado, 6=usuario no existe, 5=error
    Nota: stockActual se puede establecer directamente (útil para carga inicial)
    """
    sql = """
    DECLARE @rc INT, @id INT;
    EXEC @rc = dbo.sp_Producto_Crear
      @idUsuario=%s, @codigo=%s, @nombre=%s, @descripcion=%s,
      @precioCosto=%s, @precioVenta=%s, @stockMinimo=%s,
      @descuentoMaximoPct=%s, @estado=%s, @idProducto=@id OUTPUT;
    SELECT @rc, @id;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, codigo, nombre, descripcion,
                         precio_costo, precio_venta, stock_minimo,
                         descuento_maximo_pct, estado])
        rc, id_prod = cur.fetchone()
    
    # Si se creó exitosamente y stockActual > 0, actualizarlo directamente
    if rc == 0 and id_prod and stock_actual > 0:
        sql_update = "UPDATE dbo.tbProducto SET stockActual = %s WHERE idProducto = %s"
        with connection.cursor() as cur:
            cur.execute(sql_update, [stock_actual, id_prod])
    
    return int(rc), int(id_prod or 0)


def sp_producto_actualizar(id_usuario: int, id_producto: int, codigo: str, nombre: str,
                          descripcion: str, precio_costo: float, precio_venta: float,
                          stock_actual: int, stock_minimo: int, descuento_maximo_pct: float, estado: str):
    """
    Actualiza producto incluyendo stockActual.
    Nota: Permite edición directa del stock para correcciones de inventario
    """
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_Producto_Actualizar
      @idUsuario=%s, @idProducto=%s, @codigo=%s, @nombre=%s, @descripcion=%s,
      @precioCosto=%s, @precioVenta=%s, @stockMinimo=%s,
      @descuentoMaximoPct=%s, @estado=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, id_producto, codigo, nombre, descripcion,
                         precio_costo, precio_venta, stock_minimo,
                         descuento_maximo_pct, estado])
        rc, = cur.fetchone()
    
    # Si la actualización fue exitosa, actualizar también el stock
    if rc == 0:
        sql_update = "UPDATE dbo.tbProducto SET stockActual = %s WHERE idProducto = %s"
        with connection.cursor() as cur:
            cur.execute(sql_update, [stock_actual, id_producto])
    
    return int(rc)


def sp_producto_eliminar(id_usuario: int, id_producto: int, modo: str = 'soft'):
    """Elimina producto (soft/hard)"""
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_Producto_Eliminar
      @idUsuario=%s, @idProducto=%s, @modo=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, id_producto, modo])
        rc, = cur.fetchone()
    return int(rc)


def sp_producto_obtener(id_producto: int):
    """Obtiene un producto por ID"""
    sql = "EXEC dbo.sp_Producto_Obtener @idProducto=%s"
    with connection.cursor() as cur:
        cur.execute(sql, [id_producto])
        row = cur.fetchone()
        if not row:
            return None
        cols = [c[0] for c in cur.description]
    return dict(zip(cols, row))


def sp_producto_listar(buscar: str = None, id_categoria: int = None, estado: str = None,
                      page: int = 1, page_size: int = 100):
    """Lista productos con paginación (acceso directo optimizado)"""
    where = ["1=1"]
    params = []
    
    if estado:
        where.append("p.estado = %s")
        params.append(estado)
    
    if buscar:
        where.append("(p.codigo LIKE %s OR p.nombre LIKE %s)")
        params.extend([f'%{buscar}%', f'%{buscar}%'])
    
    if id_categoria:
        where.append("EXISTS(SELECT 1 FROM dbo.tbProductoCategoria pc WHERE pc.idProducto=p.idProducto AND pc.idCategoria=%s)")
        params.append(id_categoria)
    
    where_clause = " AND ".join(where)
    
    sql_count = f"""
    SELECT COUNT(DISTINCT p.idProducto)
    FROM dbo.tbProducto p
    WHERE {where_clause}
    """
    
    sql_data = f"""
    SELECT DISTINCT p.*
    FROM dbo.tbProducto p
    WHERE {where_clause}
    ORDER BY p.nombre
    OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
    """
    
    with connection.cursor() as cur:
        # Total
        cur.execute(sql_count, params)
        total = cur.fetchone()[0]
        
        # Datos
        offset = (page - 1) * page_size
        cur.execute(sql_data, params + [offset, page_size])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
        data = [dict(zip(cols, r)) for r in rows]
    
    return {
        'data': data,
        'total': total,
        'page': page,
        'pageSize': page_size
    }


def sp_producto_listar_con_categorias(buscar: str = None, id_categoria: int = None,
                                      estado: str = None, page: int = 1, page_size: int = 100):
    """Lista productos con categorías concatenadas usando vista"""
    where = ["1=1"]
    params = []
    
    if estado:
        where.append("v.estado = %s")
        params.append(estado)
    
    if buscar:
        where.append("(v.codigo LIKE %s OR v.nombre LIKE %s OR v.categorias LIKE %s)")
        params.extend([f'%{buscar}%', f'%{buscar}%', f'%{buscar}%'])
    
    if id_categoria:
        where.append("EXISTS(SELECT 1 FROM dbo.tbProductoCategoria pc WHERE pc.idProducto=v.idProducto AND pc.idCategoria=%s)")
        params.append(id_categoria)
    
    where_clause = " AND ".join(where)
    
    sql_count = f"""
    SELECT COUNT(*)
    FROM dbo.vwProductoConCategorias v
    WHERE {where_clause}
    """
    
    sql_data = f"""
    SELECT v.*
    FROM dbo.vwProductoConCategorias v
    WHERE {where_clause}
    ORDER BY v.nombre
    OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
    """
    
    with connection.cursor() as cur:
        # Total
        cur.execute(sql_count, params)
        total = cur.fetchone()[0]
        
        # Datos
        offset = (page - 1) * page_size
        cur.execute(sql_data, params + [offset, page_size])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
        data = [dict(zip(cols, r)) for r in rows]
    
    return {
        'data': data,
        'total': total,
        'page': page,
        'pageSize': page_size
    }


# -----------------------
# PRODUCTO-CATEGORÍA
# -----------------------
def sp_producto_categoria_asignar(id_usuario: int, id_producto: int, id_categoria: int):
    """Asigna categoría a producto"""
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_ProductoCategoria_Asignar
      @idUsuario=%s, @idProducto=%s, @idCategoria=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, id_producto, id_categoria])
        rc, = cur.fetchone()
    return int(rc)


def sp_producto_categoria_quitar(id_usuario: int, id_producto: int, id_categoria: int):
    """Quita categoría de producto"""
    sql = """
    DECLARE @rc INT;
    EXEC @rc = dbo.sp_ProductoCategoria_Quitar
      @idUsuario=%s, @idProducto=%s, @idCategoria=%s;
    SELECT @rc;
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_usuario, id_producto, id_categoria])
        rc, = cur.fetchone()
    return int(rc)


def sp_producto_categoria_listar(id_producto: int):
    """Lista categorías de un producto"""
    sql = "EXEC dbo.sp_ProductoCategoria_Listar @idProducto=%s"
    with connection.cursor() as cur:
        cur.execute(sql, [id_producto])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


# -----------------------
# INVENTARIO
# -----------------------
def sp_inventario_registrar_entrada(id_usuario: int, id_producto: int, cantidad: int,
                                    costo_unit: float, motivo: str = 'compra', tipo_movimiento: str = 'E'):
    """Registra un movimiento de inventario (entrada o salida)
    
    NOTA: El stock se actualiza automáticamente mediante el trigger tr_Inventario_AfterInsert
    """
    try:
        with connection.cursor() as cur:
            # Verificar que el producto existe
            cur.execute("SELECT stockActual FROM dbo.tbProducto WHERE idProducto = %s", [id_producto])
            row = cur.fetchone()
            if not row:
                return 3  # Producto no existe
            
            stock_actual = row[0]
            
            # Si es salida, validar stock
            if tipo_movimiento == 'S' and cantidad > stock_actual:
                return 11  # Stock insuficiente
            
            # Insertar movimiento en tbInventarioMovimiento
            # El trigger tr_Inventario_AfterInsert actualizará el stock automáticamente
            cur.execute("""
                INSERT INTO dbo.tbInventarioMovimiento 
                (idProducto, tipo, cantidad, costoUnitario, motivo, idUsuario)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, [id_producto, tipo_movimiento, cantidad, costo_unit if costo_unit > 0 else None, motivo, id_usuario])
            
            connection.commit()
            return 0  # Éxito
    except Exception as e:
        print(f"Error en sp_inventario_registrar_entrada: {e}")
        connection.rollback()
        return 5  # Error general


def vw_inventario_actual(buscar: str = None, solo_criticos: bool = False, 
                         page: int = 1, page_size: int = 100):
    """Inventario actual desde tbProducto con paginación"""
    where = ["1=1"]
    params = []
    
    if buscar:
        where.append("(codigo LIKE %s OR nombre LIKE %s)")
        params.extend([f'%{buscar}%', f'%{buscar}%'])
    
    # Contar total
    sql_count = f"""
        SELECT COUNT(*) FROM dbo.tbProducto
        WHERE {" AND ".join(where)}
    """
    
    # Obtener datos
    sql_data = f"""
        SELECT 
            idProducto,
            codigo,
            nombre,
            descripcion,
            stockActual,
            stockMinimo,
            precioCosto,
            precioVenta,
            estado,
            fechaCreacion,
            fechaCreacion AS UltimoMovimiento
        FROM dbo.tbProducto
        WHERE {" AND ".join(where)}
        ORDER BY nombre
        OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
    """
    
    with connection.cursor() as cur:
        # Total
        cur.execute(sql_count, params)
        total = cur.fetchone()[0]
        
        # Datos
        offset = (page - 1) * page_size
        cur.execute(sql_data, params + [offset, page_size])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
        items = [dict(zip(cols, r)) for r in rows]
    
    return {
        'data': items,  # Cambiado de 'items' a 'data' para consistencia con otras APIs
        'total': total,
        'page': page,
        'pageSize': page_size
    }


def sp_inventario_historial(id_producto: int):
    """Obtiene el historial de movimientos de inventario de un producto"""
    sql = """
    SELECT 
        idMovimiento,
        idProducto,
        tipo,
        cantidad,
        motivo,
        fecha,
        idUsuario,
        costoUnitario,
        precioUnitario
    FROM dbo.tbInventarioMovimiento
    WHERE idProducto = %s
    ORDER BY fecha DESC
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_producto])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
        data = [dict(zip(cols, r)) for r in rows]
    return data


# -----------------------
# VENTAS
# -----------------------
def sp_registrar_venta(id_usuario: int, detalles: list):
    """
    Registra una venta con sus detalles directamente (sin usar TVP por limitaciones de pyodbc).
    detalles: lista de dicts con {idProducto, cantidad, precioUnitario, descuentoPct}
    RC: 0=OK, 1=inválido, 6=usuario no existe, 11=sin stock, 5=error
    """
    try:
        with connection.cursor() as cur:
            # 1. Validar usuario
            cur.execute("SELECT 1 FROM dbo.tbUsuario WHERE idUsuario = %s AND estado = 'activo'", [id_usuario])
            if not cur.fetchone():
                return 6, 0  # Usuario no válido
            
            # 2. Validar que hay detalles
            if not detalles or len(detalles) == 0:
                return 1, 0  # Datos inválidos
            
            # 3. Validar cada detalle y verificar stock (guardamos info de productos para usarla después)
            productos_info = {}
            for det in detalles:
                id_producto = det['idProducto']
                cantidad = det['cantidad']
                precio_unitario = det['precioUnitario']
                descuento_pct = det.get('descuentoPct', 0)
                
                # Validaciones básicas
                if cantidad <= 0 or precio_unitario < 0 or descuento_pct < 0 or descuento_pct > 100:
                    return 1, 0  # Datos inválidos
                
                # Verificar producto activo y obtener info
                cur.execute("""
                    SELECT stockActual, descuentoMaximoPct, estado, precioCosto
                    FROM dbo.tbProducto 
                    WHERE idProducto = %s
                """, [id_producto])
                producto = cur.fetchone()
                
                if not producto:
                    return 3, 0  # Producto no existe
                
                stock_actual, descuento_max, estado, precio_costo = producto
                
                # Guardar info del producto para usar después
                productos_info[id_producto] = {
                    'precioCosto': precio_costo or 0
                }
                
                if estado != 'activo':
                    return 1, 0  # Producto no activo
                
                # Validar descuento
                if descuento_pct > descuento_max:
                    return 1, 0  # Descuento excede el máximo
                
                # ✅ VALIDAR STOCK ESTRICTAMENTE
                print(f"🔍 Validando stock para producto {id_producto}:")
                print(f"   Cantidad solicitada: {cantidad}")
                print(f"   Stock disponible: {stock_actual}")
                
                if cantidad > stock_actual:
                    print(f"   ❌ STOCK INSUFICIENTE - RECHAZANDO VENTA")
                    print(f"   Producto: {id_producto}, Solicitado: {cantidad}, Disponible: {stock_actual}")
                    connection.rollback()  # ← Asegurar rollback
                    return 11, 0  # Stock insuficiente
                
                print(f"   ✅ Stock OK")
            
            # 4. Calcular totales
            subtotal = 0
            descuentos = 0
            
            for det in detalles:
                subtotal_linea = det['cantidad'] * det['precioUnitario']
                descuento_linea = subtotal_linea * (det.get('descuentoPct', 0) / 100.0)
                subtotal += subtotal_linea
                descuentos += descuento_linea
            
            total = subtotal - descuentos
            
            # 5. Insertar venta y obtener ID
            print(f"💳 Insertando venta: subtotal={subtotal}, descuentos={descuentos}, total={total}")
            print(f"   Detalles: {len(detalles)} productos")
            for det in detalles:
                print(f"      - Producto {det['idProducto']}: {det['cantidad']} x Q{det['precioUnitario']} (desc: {det.get('descuentoPct', 0)}%)")
            
            # Insertar la venta
            cur.execute("""
                INSERT INTO dbo.tbVenta (idUsuario, subtotal, descuentos, total)
                VALUES (%s, %s, %s, %s)
            """, [id_usuario, subtotal, descuentos, total])
            
            # Obtener el último ID insertado usando MAX
            cur.execute("SELECT MAX(idVenta) FROM dbo.tbVenta WHERE idUsuario = %s", [id_usuario])
            result = cur.fetchone()
            
            if not result or result[0] is None:
                print("❌ ERROR: No se pudo obtener el ID de la venta insertada")
                return 5, 0
            
            id_venta = int(result[0])
            print(f"✅ Venta insertada con ID: {id_venta}")
            
            # 6. Insertar detalles y movimientos de inventario
            print(f"📝 Insertando {len(detalles)} detalles de venta...")
            for i, det in enumerate(detalles, 1):
                id_producto = det['idProducto']
                cantidad = det['cantidad']
                precio_unitario = det['precioUnitario']
                descuento_pct = det.get('descuentoPct', 0)
                
                # Obtener el costo del producto
                costo_unitario = productos_info[id_producto]['precioCosto']
                
                subtotal_linea = cantidad * precio_unitario
                total_linea = subtotal_linea * (1 - descuento_pct / 100.0)
                
                print(f"   Detalle {i}: producto={id_producto}, cant={cantidad}, precio={precio_unitario}, desc={descuento_pct}%, subtotal={subtotal_linea}, total={total_linea}")
                
                # Insertar detalle
                cur.execute("""
                    INSERT INTO dbo.tbVentaDetalle 
                    (idVenta, idProducto, cantidad, precioUnitario, descuentoPct, subtotalLinea, totalLinea)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, [id_venta, id_producto, cantidad, precio_unitario, descuento_pct, subtotal_linea, total_linea])
                print(f"   ✅ Detalle insertado en tbVentaDetalle")
                
                # Insertar movimiento de inventario (salida) con costoUnitario y precioUnitario
                cur.execute("""
                    INSERT INTO dbo.tbInventarioMovimiento 
                    (idProducto, tipo, cantidad, costoUnitario, precioUnitario, motivo, idVenta, idUsuario)
                    VALUES (%s, 'S', %s, %s, %s, 'venta', %s, %s)
                """, [id_producto, cantidad, costo_unitario, precio_unitario, id_venta, id_usuario])
                print(f"   ✅ Movimiento insertado en tbInventarioMovimiento (costo={costo_unitario})")
            
            # 7. Registrar en bitácora
            import json
            payload = json.dumps({
                'idVenta': id_venta,
                'subtotal': float(subtotal),
                'descuentos': float(descuentos),
                'total': float(total)
            })
            
            cur.execute("""
                INSERT INTO dbo.tbBitacoraTransacciones (idUsuario, entidad, operacion, idAfectado, datosNuevo)
                VALUES (%s, 'tbVenta', 'CREATE', %s, %s)
            """, [id_usuario, id_venta, payload])
            
            connection.commit()
            return 0, id_venta
            
    except Exception as e:
        print(f"Error en sp_registrar_venta: {e}")
        connection.rollback()
        return 5, 0  # Error general


def listar_ventas(fecha_inicio=None, fecha_fin=None, id_usuario=None, page: int = 1, page_size: int = 100):
    """Lista ventas con filtros y paginación"""
    where = []
    params = []
    
    if fecha_inicio:
        where.append("v.fecha >= %s")
        params.append(fecha_inicio)
    
    if fecha_fin:
        where.append("v.fecha < DATEADD(DAY, 1, %s)")
        params.append(fecha_fin)
    
    if id_usuario:
        where.append("v.idUsuario = %s")
        params.append(id_usuario)
    
    sql_count = f"""
    SELECT COUNT(*) FROM dbo.tbVenta v
    {"WHERE " + " AND ".join(where) if where else ""}
    """
    
    sql_data = f"""
    SELECT v.idVenta, v.fecha, u.usuario, v.subtotal, v.descuentos, v.total
    FROM dbo.tbVenta v
    JOIN dbo.tbUsuario u ON u.idUsuario = v.idUsuario
    {"WHERE " + " AND ".join(where) if where else ""}
    ORDER BY v.fecha DESC, v.idVenta DESC
    OFFSET %s ROWS FETCH NEXT %s ROWS ONLY
    """
    
    with connection.cursor() as cur:
        # Total
        cur.execute(sql_count, params)
        total = cur.fetchone()[0]
        
        # Datos
        cur.execute(sql_data, params + [(page-1)*page_size, page_size])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    
    return {
        'data': [dict(zip(cols, r)) for r in rows],
        'total': total,
        'page': page,
        'pageSize': page_size
    }


def obtener_venta_detalle(id_venta: int):
    """Obtiene detalles de una venta"""
    sql = """
    SELECT vd.*, p.codigo, p.nombre AS nombreProducto
    FROM dbo.tbVentaDetalle vd
    JOIN dbo.tbProducto p ON p.idProducto = vd.idProducto
    WHERE vd.idVenta = %s
    ORDER BY vd.idDetalle
    """
    with connection.cursor() as cur:
        cur.execute(sql, [id_venta])
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]


# -----------------------
# REPORTES
# -----------------------
def sp_reporte_ventas_por_fecha(desde, hasta, id_usuario_filtro=None, id_categoria=None, id_usuario_accion=None, exportar=None):
    """Reporte de ventas por fecha
    
    Args:
        desde: Fecha inicial del reporte
        hasta: Fecha final del reporte
        id_usuario_filtro: Filtrar ventas por usuario (opcional)
        id_categoria: Filtrar por categoría (opcional)
        id_usuario_accion: Usuario que solicita el reporte (para bitácora)
        exportar: Tipo de exportación ("pdf" o "excel"), None si solo visualización
    
    Retorna: fecha, total
    """
    try:
        # 1. Obtener datos del reporte
        with connection.cursor() as cur:
            sql = """
            SELECT 
                CAST(v.fecha AS DATE) AS fecha,
                SUM(v.total) AS total
            FROM dbo.tbVenta v
            WHERE v.fecha >= CAST(%s AS DATETIME)
              AND v.fecha < DATEADD(DAY, 1, CAST(%s AS DATETIME))
              AND (%s IS NULL OR v.idUsuario = %s)
              AND (
                   %s IS NULL OR EXISTS(
                     SELECT 1
                     FROM dbo.tbVentaDetalle vd
                     JOIN dbo.tbProductoCategoria pc ON pc.idProducto = vd.idProducto
                     WHERE vd.idVenta = v.idVenta AND pc.idCategoria = %s
                   )
              )
            GROUP BY CAST(v.fecha AS DATE)
            ORDER BY fecha DESC
            """
            cur.execute(sql, [desde, hasta, id_usuario_filtro, id_usuario_filtro, id_categoria, id_categoria])
            rows = cur.fetchall()
            cols = [c[0].lower() for c in cur.description] if rows else []
        
        # 2. Registrar en bitácora SOLO si se está exportando
        if id_usuario_accion and exportar:
            import json
            datos = json.dumps({
                'reporte': 'ventas_por_fecha',
                'formato_exportacion': exportar,  # "pdf" o "excel"
                'desde': str(desde),
                'hasta': str(hasta),
                'id_usuario_filtro': id_usuario_filtro,
                'id_categoria': id_categoria,
                'registros': len(rows)
            })
            with connection.cursor() as cur:
                cur.execute("""
                    INSERT INTO dbo.tbBitacoraTransacciones 
                    (idUsuario, entidad, operacion, datosNuevo)
                    VALUES (%s, 'Reportes', 'EXPORTAR_VENTAS_FECHA', %s)
                """, [id_usuario_accion, datos])
            connection.commit()
            print(f"✅ Exportación registrada en bitácora: EXPORTAR_VENTAS_FECHA ({exportar.upper()}), usuario={id_usuario_accion}")
        
        if not rows:
            return []
        
        return [dict(zip(cols, r)) for r in rows]
    except Exception as e:
        print(f"❌ Error en sp_reporte_ventas_por_fecha: {e}")
        import traceback
        traceback.print_exc()
        connection.rollback()
        return []


def sp_reporte_inventario_actual(solo_criticos: bool = False, id_usuario_accion=None, exportar=None):
    """Reporte de inventario actual
    
    Args:
        solo_criticos: Si True, solo retorna productos con stock crítico
        id_usuario_accion: Usuario que solicita el reporte (para bitácora)
        exportar: Tipo de exportación ("pdf" o "excel"), None si solo visualización
    
    Retorna: idProducto, nombre, stockActual, stockMinimo, entradas30, salidas30
    """
    try:
        # 1. Obtener datos del reporte
        with connection.cursor() as cur:
            sql = """
            SELECT 
                p.idProducto,
                p.codigo,
                p.nombre,
                p.estado,
                p.stockActual,
                p.stockMinimo,
                CASE WHEN p.stockActual <= p.stockMinimo THEN 1 ELSE 0 END AS Critico,
                (SELECT MAX(fecha) FROM dbo.tbInventarioMovimiento m WHERE m.idProducto = p.idProducto) AS UltimoMovimiento,
                ISNULL((SELECT SUM(cantidad) FROM dbo.tbInventarioMovimiento m 
                        WHERE m.idProducto = p.idProducto 
                          AND m.tipo = 'E' 
                          AND m.fecha >= DATEADD(DAY, -30, GETDATE())), 0) AS EntradasUlt30,
                ISNULL((SELECT SUM(cantidad) FROM dbo.tbInventarioMovimiento m 
                        WHERE m.idProducto = p.idProducto 
                          AND m.tipo = 'S' 
                          AND m.fecha >= DATEADD(DAY, -30, GETDATE())), 0) AS SalidasUlt30
            FROM dbo.tbProducto p
            WHERE (%s = 0 OR p.stockActual <= p.stockMinimo)
              AND p.estado = 'activo'
            ORDER BY 
                CASE WHEN p.stockActual <= p.stockMinimo THEN 0 ELSE 1 END,
                p.nombre
            """
            cur.execute(sql, [1 if solo_criticos else 0])
            rows = cur.fetchall()
            cols_orig = [c[0] for c in cur.description] if rows else []
        
        # 2. Registrar en bitácora SOLO si se está exportando
        if id_usuario_accion and exportar:
            import json
            datos = json.dumps({
                'reporte': 'inventario_actual',
                'formato_exportacion': exportar,  # "pdf" o "excel"
                'solo_criticos': solo_criticos,
                'registros': len(rows)
            })
            with connection.cursor() as cur:
                cur.execute("""
                    INSERT INTO dbo.tbBitacoraTransacciones 
                    (idUsuario, entidad, operacion, datosNuevo)
                    VALUES (%s, 'Reportes', 'EXPORTAR_INVENTARIO', %s)
                """, [id_usuario_accion, datos])
            connection.commit()
            print(f"✅ Exportación registrada en bitácora: EXPORTAR_INVENTARIO ({exportar.upper()}), usuario={id_usuario_accion}")
        
        if not rows:
            return []
        
        # Mapear a los nombres que espera el frontend
        result = []
        for row in rows:
            data_dict = dict(zip(cols_orig, row))
            normalized = {
                'idProducto': data_dict.get('idProducto'),
                'nombre': data_dict.get('nombre'),
                'stockActual': data_dict.get('stockActual'),
                'stockMinimo': data_dict.get('stockMinimo'),
                'entradas30': data_dict.get('EntradasUlt30', 0),
                'salidas30': data_dict.get('SalidasUlt30', 0),
                'codigo': data_dict.get('codigo'),
                'estado': data_dict.get('estado'),
                'critico': data_dict.get('Critico', 0)
            }
            result.append(normalized)
        
        return result
    except Exception as e:
        print(f"❌ Error en sp_reporte_inventario_actual: {e}")
        import traceback
        traceback.print_exc()
        connection.rollback()
        return []


def sp_reporte_productos_mas_vendidos(top_n: int = 10, desde=None, hasta=None, id_usuario_accion=None, exportar=None):
    """Reporte de productos más vendidos
    
    Args:
        top_n: Número de productos a retornar (por defecto 10)
        desde: Fecha inicial del reporte (opcional)
        hasta: Fecha final del reporte (opcional)
        id_usuario_accion: Usuario que solicita el reporte (para bitácora)
        exportar: Tipo de exportación ("pdf" o "excel"), None si solo visualización
    
    Retorna: nombre, codigo, cantidad, ingresos
    """
    try:
        # 1. Obtener datos del reporte
        with connection.cursor() as cur:
            sql = """
            SELECT TOP(%s)
                p.idProducto,
                p.codigo,
                p.nombre,
                SUM(vd.cantidad) AS Cantidad,
                SUM(vd.totalLinea) AS Ingreso
            FROM dbo.tbVentaDetalle vd
            JOIN dbo.tbVenta v ON v.idVenta = vd.idVenta
            JOIN dbo.tbProducto p ON p.idProducto = vd.idProducto
            WHERE (%s IS NULL OR v.fecha >= CAST(%s AS DATETIME))
              AND (%s IS NULL OR v.fecha < DATEADD(DAY, 1, CAST(%s AS DATETIME)))
            GROUP BY p.idProducto, p.codigo, p.nombre
            ORDER BY SUM(vd.cantidad) DESC, SUM(vd.totalLinea) DESC
            """
            cur.execute(sql, [top_n, desde, desde, hasta, hasta])
            rows = cur.fetchall()
            cols_orig = [c[0] for c in cur.description] if rows else []
        
        # 2. Registrar en bitácora SOLO si se está exportando
        if id_usuario_accion and exportar:
            import json
            datos = json.dumps({
                'reporte': 'productos_mas_vendidos',
                'formato_exportacion': exportar,  # "pdf" o "excel"
                'top_n': top_n,
                'desde': str(desde) if desde else None,
                'hasta': str(hasta) if hasta else None,
                'registros': len(rows)
            })
            with connection.cursor() as cur:
                cur.execute("""
                    INSERT INTO dbo.tbBitacoraTransacciones 
                    (idUsuario, entidad, operacion, datosNuevo)
                    VALUES (%s, 'Reportes', 'EXPORTAR_MAS_VENDIDOS', %s)
                """, [id_usuario_accion, datos])
            connection.commit()
            print(f"✅ Exportación registrada en bitácora: EXPORTAR_MAS_VENDIDOS ({exportar.upper()}), usuario={id_usuario_accion}")
        
        if not rows:
            return []
        
        # Mapear a los nombres que espera el frontend
        result = []
        for row in rows:
            data_dict = dict(zip(cols_orig, row))
            normalized = {
                'idProducto': data_dict.get('idProducto'),
                'nombre': data_dict.get('nombre'),
                'codigo': data_dict.get('codigo'),
                'cantidad': data_dict.get('Cantidad', 0),
                'ingresos': float(data_dict.get('Ingreso', 0))
            }
            result.append(normalized)
        
        return result
    except Exception as e:
        print(f"❌ Error en sp_reporte_productos_mas_vendidos: {e}")
        import traceback
        traceback.print_exc()
        connection.rollback()
        return []


def sp_reporte_ingresos_totales(modo: str = 'mensual', anio: int = None, id_usuario_accion=None, exportar=None):
    """Reporte de ingresos totales (mensual/anual)
    
    Args:
        modo: 'mensual' o 'anual'
        anio: Año a consultar (solo para modo mensual, por defecto el actual)
        id_usuario_accion: Usuario que solicita el reporte (para bitácora)
        exportar: Tipo de exportación ("pdf" o "excel"), None si solo visualización
    
    Retorna: mes/anio, ingresos
    """
    try:
        # 1. Obtener datos del reporte
        with connection.cursor() as cur:
            # Si no se especifica año, usar el actual
            if modo == 'mensual' and anio is None:
                cur.execute("SELECT YEAR(GETDATE())")
                anio = cur.fetchone()[0]
            
            # Consulta directa
            if modo == 'mensual':
                sql = """
                SELECT 
                    MONTH(v.fecha) AS Mes,
                    SUM(v.total) AS Ingresos
                FROM dbo.tbVenta v
                WHERE YEAR(v.fecha) = %s
                GROUP BY MONTH(v.fecha)
                ORDER BY Mes
                """
                cur.execute(sql, [anio])
            else:  # anual
                sql = """
                SELECT 
                    YEAR(v.fecha) AS Anio,
                    SUM(v.total) AS Ingresos
                FROM dbo.tbVenta v
                GROUP BY YEAR(v.fecha)
                ORDER BY Anio
                """
                cur.execute(sql)
            
            rows = cur.fetchall()
            cols_orig = [c[0] for c in cur.description] if rows else []
        
        # 2. Registrar en bitácora SOLO si se está exportando
        if id_usuario_accion and exportar:
            import json
            datos = json.dumps({
                'reporte': 'ingresos_totales',
                'formato_exportacion': exportar,  # "pdf" o "excel"
                'modo': modo,
                'anio': anio if modo == 'mensual' else None,
                'registros': len(rows)
            })
            with connection.cursor() as cur:
                cur.execute("""
                    INSERT INTO dbo.tbBitacoraTransacciones 
                    (idUsuario, entidad, operacion, datosNuevo)
                    VALUES (%s, 'Reportes', 'EXPORTAR_INGRESOS', %s)
                """, [id_usuario_accion, datos])
            connection.commit()
            print(f"✅ Exportación registrada en bitácora: EXPORTAR_INGRESOS ({exportar.upper()}), usuario={id_usuario_accion}")
        
        if not rows:
            return []
        
        # Mapear a los nombres que espera el frontend
        result = []
        for row in rows:
            data_dict = dict(zip(cols_orig, row))
            if modo == 'mensual':
                normalized = {
                    'mes': data_dict.get('Mes'),
                    'ingresos': float(data_dict.get('Ingresos', 0))
                }
            else:
                normalized = {
                    'anio': data_dict.get('Anio'),
                    'ingresos': float(data_dict.get('Ingresos', 0))
                }
            result.append(normalized)
        
        return result
    except Exception as e:
        print(f"❌ Error en sp_reporte_ingresos_totales: {e}")
        import traceback
        traceback.print_exc()
        connection.rollback()
        return []