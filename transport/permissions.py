"""
Décorateurs de permission pour l'API transport.

Les routes en écriture (POST, PUT, PATCH, DELETE) nécessitent
que l'utilisateur soit connecté ET ait le rôle administrateur.
"""

from functools import wraps

from django.http import JsonResponse


def admin_required(view_func):
    """
    Décorateur combiné : vérifie que l'utilisateur est connecté
    ET qu'il a le rôle administrateur.

    Retourne 401 si non authentifié.
    Retourne 403 si authentifié mais pas admin.

    Contrairement à ``login_required``, ce décorateur renvoie du JSON
    au lieu d'une redirection HTML — adapté aux appels d'API.
    """

    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse(
                {"detail": "Authentification requise. Veuillez vous connecter."},
                status=401,
            )
        profil = getattr(request.user, "profil_taxi", None)
        if not profil or profil.role != "admin":
            return JsonResponse(
                {"detail": "Acces refuse. Droits administrateur requis."},
                status=403,
            )
        return view_func(request, *args, **kwargs)

    return _wrapped_view
