# utils/guards.py
from functools import wraps
from django.shortcuts import redirect, render
from django.urls import reverse
from django.http import JsonResponse
from django.utils.http import url_has_allowed_host_and_scheme

def _wants_json(request):
    # Detecta llamadas AJAX / API
    if request.path.startswith("/api/"):
        return True
    xrw = request.headers.get("X-Requested-With", "")
    accept = request.headers.get("Accept", "")
    return xrw.lower() == "xmlhttprequest" or "application/json" in accept.lower()

def require_role(*allowed_roles):
    """
    Verifica sesión y (opcional) rol. Si no hay sesión -> 401/redirect a login.
    Si hay sesión pero rol incorrecto -> 403 (HTML o JSON).
    """
    allowed = {r.lower() for r in allowed_roles if r}

    def deco(view_func):
        @wraps(view_func)
        def _wrapped(request, *args, **kwargs):
            rol = (request.session.get("rol") or "").lower()
            uid = request.session.get("id_usuario_db")

            # 1) No autenticado
            if not uid or not rol:
                if _wants_json(request):
                    return JsonResponse({"detail": "auth_required"}, status=401)
                login_url = reverse("login_select")
                next_url = request.get_full_path()
                # Evita open-redirect: solo permite volver al mismo host
                if not url_has_allowed_host_and_scheme(next_url, {request.get_host()}):
                    next_url = "/"
                return redirect(f"{login_url}?next={next_url}")

            # 2) Autenticado pero rol prohibido
            if allowed and rol not in allowed:
                if _wants_json(request):
                    return JsonResponse({"detail": "forbidden"}, status=403)
                # Página 403 amable (crea 403_portal.html si no la tienes)
                return render(request, "403_portal.html",
                              {"error": "No autorizado en este portal."}, status=403)

            # 3) OK
            return view_func(request, *args, **kwargs)
        return _wrapped
    return deco
