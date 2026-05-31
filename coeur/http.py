import json

from django.http import JsonResponse

def lire_json(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}"), None
    except json.JSONDecodeError:
        return None, JsonResponse({"detail": "JSON invalide"}, status=400)

def methode_non_autorisee():
    return JsonResponse({"detail": "Methode non autorisee"}, status=405)
