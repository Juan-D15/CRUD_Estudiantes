import requests
from django.conf import settings
def verify_recaptcha(token, ip=None):
    if not token: return False
    data = {"secret": settings.RECAPTCHA_SECRET_KEY, "response": token}
    if ip: data["remoteip"] = ip
    try:
        r = requests.post("https://www.google.com/recaptcha/api/siteverify", data=data, timeout=5)
        return bool(r.json().get("success"))
    except Exception:
        return False
