from django.db import connection

def _row_to_dict(row, cols):
    return {c: row[i] for i, c in enumerate(cols)}

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
    SELECT a.idAcceso, COALESCE(u.usuario, a.usuarioTxt) AS usuario,
           a.fechaHora, a.exito, a.accion, a.ip, a.dispositivo, a.motivo
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
           t.datosAnterior, t.datosNuevo
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
    SELECT idUsuario, usuario, nombreCompleto, correo, rol, estado, fechaCreacion
    FROM dbo.tbUsuario
    {"WHERE " + " AND ".join(where) if where else ""}
    ORDER BY fechaCreacion DESC, idUsuario DESC
    """
    with connection.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        cols = [c[0] for c in cur.description]
    return [dict(zip(cols, r)) for r in rows]