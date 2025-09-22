# utils/guards.py
from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages

def require_role(*allowed_roles):
    """
    Decorador para Function-Based Views.
    Verifica rol en session y redirige a login_select si no cumple.
    """
    allowed = set(r.lower() for r in allowed_roles)

    def deco(view_func):
        @wraps(view_func)
        def _wrapped(request, *args, **kwargs):
            rol = (request.session.get("rol") or "").lower()
            if not rol:
                messages.error(request, "Inicia sesión para continuar.")
                return redirect(f"/login/select?next={request.path}")
            if allowed and rol not in allowed:
                messages.error(request, "No autorizado en este portal.")
                return redirect("login_select")
            return view_func(request, *args, **kwargs)
        return _wrapped
    return deco
