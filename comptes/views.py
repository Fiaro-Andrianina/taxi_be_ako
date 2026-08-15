import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import TripHistory, TripLeg
from .serializers import (
    creer_utilisateur,
    trip_history_summary_to_dict,
    trip_history_to_dict,
    user_to_dict,
)


def _is_admin(user):
    profil = getattr(user, "profil_taxi", None)
    return bool(profil and profil.role == "admin")


def admin_check(request):
    """
    Vérifie si l'utilisateur connecté a le rôle admin.

    GET uniquement. Retourne 200 avec { is_admin: true / false } si l'utilisateur
    est authentifié, sinon 401.

    Args:
        request: Objet requête HTTP

    Returns:
        JsonResponse: { is_admin: bool }
    """
    if not request.user.is_authenticated:
        return JsonResponse(
            {"is_admin": False, "detail": "Non authentifie"}, status=401
        )

    return JsonResponse({"is_admin": _is_admin(request.user)})


@csrf_exempt
def utilisateurs(request):
    """
    Endpoint GET: Liste tous les utilisateurs.
    Endpoint POST: Crée un nouvel utilisateur.

    GET retourne la liste de tous les utilisateurs avec leurs profils.
    POST crée un nouvel utilisateur à partir des données JSON fournies.

    Args:
        request: Objet requête HTTP

    Returns:
        JsonResponse: Selon la méthode:
        - GET: Liste des utilisateurs au format JSON
        - POST: Utilisateur créé au format JSON avec statut 201
        - Autres: Erreur 405
    """
    if request.method == "GET":
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Non authentifie"}, status=401)
        if not _is_admin(request.user):
            return JsonResponse({"detail": "Acces refuse"}, status=403)
        users = User.objects.select_related("profil_taxi").all().order_by("username")
        return JsonResponse([user_to_dict(user) for user in users], safe=False)

    if request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
            user = creer_utilisateur(payload)
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON invalide"}, status=400)
        except ValueError as exc:
            return JsonResponse({"detail": str(exc)}, status=400)

        return JsonResponse(user_to_dict(user), status=201)

    return JsonResponse({"detail": "Methode non autorisee"}, status=405)


@csrf_exempt
def se_connecter(request):
    """
    Endpoint de connexion des utilisateurs.

    Endpoint POST uniquement: authentifie un utilisateur avec son nom
    d'utilisateur et mot de passe, et initialise la session.

    Args:
        request: Objet requête HTTP

    Returns:
        JsonResponse:
        - Succès: Message de succès et données utilisateur
        - Erreur: Message d'erreur avec code statut approprié
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Methode non autorisee"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "JSON invalide"}, status=400)

    username = payload.get("username")
    password = payload.get("password")

    if not username or not password:
        return JsonResponse(
            {"detail": "Nom d'utilisateur et mot de passe requis"}, status=400
        )

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"detail": "Identifiants invalides"}, status=401)

    login(request, user)
    return JsonResponse({
        "message": "Connexion reussie",
        "user": user_to_dict(user),
    })


@csrf_exempt
def se_deconnecter(request):
    """
    Endpoint de déconnexion des utilisateurs.

    Endpoint POST uniquement: termine la session de l'utilisateur courant.

    Args:
        request: Objet requête HTTP

    Returns:
        JsonResponse: Message de succès
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Methode non autorisee"}, status=405)

    logout(request)
    return JsonResponse({"message": "Deconnexion reussie"})


@csrf_exempt
def utilisateur_courant(request):
    """
    Retourne les informations de l'utilisateur actuellement authentifié.

    Endpoint GET uniquement. Retourne 401 si l'utilisateur n'est pas connecté.

    Args:
        request: Objet requête HTTP

    Returns:
        JsonResponse: Données de l'utilisateur courant ou erreur 401
    """
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Non authentifie"}, status=401)

    return JsonResponse({"user": user_to_dict(request.user)})


@csrf_exempt
def utilisateur_detail(request, pk):
    """
    Gestion complète d'un utilisateur spécifique.

    Supporte GET, PUT/PATCH, DELETE pour un utilisateur avec l'ID spécifié.

    Args:
        request: Objet requête HTTP
        pk: ID de l'utilisateur à manipuler

    Returns:
        JsonResponse: Selon la méthode:
        - GET: Données de l'utilisateur
        - PUT/PATCH: Données de l'utilisateur mises à jour
        - DELETE: Message de suppression
        - Autres: Erreur 405
    """
    try:
        user = User.objects.select_related("profil_taxi").get(pk=pk)
    except User.DoesNotExist:
        return JsonResponse({"detail": "Utilisateur introuvable"}, status=404)

    if request.method == "GET":
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Non authentifie"}, status=401)
        if request.user.id != user.id and not _is_admin(request.user):
            return JsonResponse({"detail": "Acces refuse"}, status=403)
        return JsonResponse(user_to_dict(user))

    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Non authentifie"}, status=401)
    is_admin = _is_admin(request.user)
    if request.user.id != user.id and not is_admin:
        return JsonResponse({"detail": "Acces refuse"}, status=403)

    if request.method in ["PUT", "PATCH"]:
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON invalide"}, status=400)
        user.username = payload.get("username", user.username)
        user.email = payload.get("email", user.email)
        user.first_name = payload.get("first_name", payload.get("prenom", user.first_name))
        user.last_name = payload.get("last_name", payload.get("nom", user.last_name))
        if payload.get("password"):
            user.set_password(payload["password"])
        user.save()

        profil = getattr(user, "profil_taxi", None)
        if profil:
            profil.telephone = payload.get("telephone", profil.telephone)
            if is_admin:
                profil.role = payload.get("role", profil.role)
            profil.adresse = payload.get("adresse", profil.adresse)
            profil.save()

        return JsonResponse(user_to_dict(user))

    if request.method == "DELETE":
        user.delete()
        return JsonResponse({"detail": "Utilisateur supprime"})

    return JsonResponse({"detail": "Methode non autorisee"}, status=405)


# ─── TripHistory endpoints ─────────────────────────────────────────────────────

@csrf_exempt
def trip_history_list(request):
    """
    GET /api/users/trips/ - Liste les trajets de l'utilisateur connecté
    POST /api/users/trips/ - Crée un nouvel historique de trajet
    """
    if request.method == "GET":
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Non authentifie"}, status=401)

        profil = getattr(request.user, "profil_taxi", None)
        is_admin = bool(profil and profil.role == "admin")

        queryset = TripHistory.objects.select_related(
            "user", "depart", "arrivee"
        ).prefetch_related("etapes__arret", "etapes__ligne")

        if is_admin and request.GET.get("user_id"):
            try:
                target_user_id = int(request.GET["user_id"])
            except (ValueError, KeyError):
                return JsonResponse(
                    {"detail": "Le parametre user_id doit etre un entier"},
                    status=400,
                )
            queryset = queryset.filter(user_id=target_user_id)
        else:
            queryset = queryset.filter(user=request.user, est_supprime=False)

        return JsonResponse(
            [trip_history_summary_to_dict(trip) for trip in queryset],
            safe=False,
            json_dumps_params={"ensure_ascii": False},
        )

    if request.method == "POST":
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Non authentifie"}, status=401)

        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON invalide"}, status=400)

        try:
            trip = TripHistory.objects.create(
                user=request.user,
                depart_id=payload.get("depart"),
                arrivee_id=payload.get("arrivee"),
                nb_changements=payload.get("nb_changements", 0),
                duree_minutes=payload.get("duree_minutes", 0),
                distance_km=payload.get("distance_km", 0),
                prix=payload.get("prix"),
                date_voyage=payload.get("date_voyage"),
                point_accrochage=payload.get("point_accrochage", "arrivee"),
                est_explicite=payload.get("est_explicite", True),
            )
            # Create trip legs if provided
            etapes = payload.get("etapes", [])
            for idx, etape in enumerate(etapes):
                TripLeg.objects.create(
                    trip_history=trip,
                    arret_id=etape.get("arret"),
                    ligne_id=etape.get("ligne"),
                    ordre=etape.get("ordre", idx),
                )
        except (KeyError, ValueError) as exc:
            return JsonResponse({"detail": str(exc)}, status=400)

        return JsonResponse(trip_history_to_dict(trip), status=201)

    return JsonResponse({"detail": "Methode non autorisee"}, status=405)


@csrf_exempt
def trip_history_detail(request, pk):
    """
    GET /api/users/trips/<trip_id>/ — détail
    DELETE /api/users/trips/<trip_id>/ — suppression (soft-delete)

    Seul l'utilisateur propriétaire ou un admin peut accéder au trajet.
    """
    if request.method not in ("GET", "DELETE"):
        return JsonResponse({"detail": "Methode non autorisee"}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Non authentifie"}, status=401)

    try:
        trip = TripHistory.objects.select_related(
            "user", "depart", "arrivee"
        ).prefetch_related("etapes__arret", "etapes__ligne").get(pk=pk)
    except TripHistory.DoesNotExist:
        return JsonResponse({"detail": "Trajet introuvable"}, status=404)

    profil = getattr(request.user, "profil_taxi", None)
    is_admin = bool(profil and profil.role == "admin")
    if trip.user_id != request.user.id and not is_admin:
        return JsonResponse({"detail": "Acces refuse"}, status=403)

    if request.method == "DELETE":
        trip.est_supprime = True
        trip.save(update_fields=["est_supprime", "date_modification"])
        return JsonResponse({"detail": "Historique supprime"})

    return JsonResponse(trip_history_to_dict(trip))
