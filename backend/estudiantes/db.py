# backend/estudiantes/db.py
from django.db import connection

def _row_to_dict(row, cols):
    return {c: row[i] for i, c in enumerate(cols)}

# ============ CREATE ============
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

# ============ READ ============
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

# ============ UPDATE ============
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

# ============ DELETE ============
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
