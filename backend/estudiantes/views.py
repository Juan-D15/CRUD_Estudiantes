# backend/estudiantes/views.py
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt  # si NO usas cookie CSRF, descomenta decoradores
import json

from .db import (
    listar_estudiantes,            # << antes ponías consultar_estudiantes
    obtener_estudiante_por_id,     # << detalle por id
    insertar_estudiante,
    actualizar_estudiante,
    eliminar_estudiante,
)


# ---------------------------
# Helpers
# ---------------------------
def _json_body(request):
    try:
        return json.loads(request.body or "{}")
    except Exception:
        return {}


# ---------------------------
# API: Listar
# GET /api/estudiantes
# ---------------------------
@require_http_methods(["GET"])
def api_listar(request):
    data = listar_estudiantes()
    return JsonResponse({"data": data})


# ---------------------------
# API: Detalle por id
# GET /api/estudiantes/<id>
# ---------------------------
@require_http_methods(["GET"])
def api_detalle(request, id_est):
    row = obtener_estudiante_por_id(id_est)
    if not row:
        return JsonResponse({"detail": "No encontrado"}, status=404)
    return JsonResponse(row)


# ---------------------------
# API: Crear
# POST /api/estudiantes/create
# body: {nombres, apellidos, correo, telefono}
# ---------------------------
@require_http_methods(["POST"])
def api_crear(request):
    data = _json_body(request)
    rc, id_nuevo = insertar_estudiante(
        data.get("nombres", ""),
        data.get("apellidos", ""),
        data.get("correo", ""),
        data.get("telefono", ""),
    )
    return JsonResponse({"rc": rc, "id": id_nuevo})


# ---------------------------
# API: Actualizar
# PUT /api/estudiantes/<id>/update
# body: {nombres, apellidos, correo, telefono}
# ---------------------------
@require_http_methods(["PUT"])
def api_actualizar(request, id_est):
    data = _json_body(request)
    rc = actualizar_estudiante(
        id_est,
        data.get("nombres", ""),
        data.get("apellidos", ""),
        data.get("correo", ""),
        data.get("telefono", ""),
    )
    return JsonResponse({"rc": rc})


# ---------------------------
# API: Eliminar
# DELETE /api/estudiantes/<id>/delete
# ---------------------------
@require_http_methods(["DELETE"])
def api_eliminar(request, id_est):
    rc = eliminar_estudiante(id_est)
    return JsonResponse({"rc": rc})
