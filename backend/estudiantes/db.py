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
    rc: 0 ok, 7 bloqueado, 8 credenciales inválidas, otros = error.
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