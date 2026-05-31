import json
import secrets
import string

from django.contrib.auth.models import User

from .models import ProfilUtilisateur, TripHistory, TripLeg


# ─── User / Profil serialisation ───────────────────────────────────────────────

def user_to_dict(user):
    """
    Sérialise un objet User Django en dictionnaire.

    Inclut les informations de base de l'utilisateur et les données de son
    profil.

    Args:
        user (User): Objet User Django

    Returns:
        dict: Dictionnaire contenant les données de l'utilisateur
    """
    profil = getattr(user, "profil_taxi", None)
    return {
        "id": user.id,
        "username": user.username,
        "nom": user.get_full_name().strip() or user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profil": profil_to_dict(profil) if profil else None,
    }


def profil_to_dict(profil):
    """
    Sérialise un objet ProfilUtilisateur en dictionnaire.

    Args:
        profil (ProfilUtilisateur): Objet profil utilisateur

    Returns:
        dict: Dictionnaire contenant les données du profil
    """
    return {
        "id": profil.id,
        "user_id": profil.user_id,
        "telephone": profil.telephone,
        "role": profil.role,
        "adresse": profil.adresse,
        "date_creation": profil.date_creation.isoformat(),
    }


def make_random_password(length: int = 12) -> str:
    """
    Génère un mot de passe aléatoire sécurisé.

    Utilise l'API secrets de Python pour générer un mot de passe
    aléatoire avec des lettres et chiffres.

    Args:
        length (int): Longueur du mot de passe (défaut 12)

    Returns:
        str: Mot de passe aléatoire généré
    """
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def creer_utilisateur(payload):
    """
    Crée un nouvel utilisateur avec son profil associé.

    Valide les données fournies et crée l'utilisateur Django et le profil
    ProfilUtilisateur correspondant. Le mot de passe peut être fourni ou
    généré automatiquement.

    Args:
        payload (dict): Données JSON de création d'utilisateur

    Returns:
        User: Objet User créé

    Raises:
        ValueError: Si les données sont invalides ou l'utilisateur existe déjà
    """
    username = payload.get("username") or payload.get("email")
    email = payload.get("email", "")
    password = payload.get("password") or make_random_password()

    if not username:
        raise ValueError("Le champ username ou email est obligatoire")
    if User.objects.filter(username=username).exists():
        raise ValueError("Ce nom d'utilisateur existe deja")

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=payload.get("first_name", payload.get("prenom", "")),
        last_name=payload.get("last_name", payload.get("nom", "")),
    )
    ProfilUtilisateur.objects.create(
        user=user,
        telephone=payload.get("telephone", ""),
        role=payload.get("role", ProfilUtilisateur.ROLE_CLIENT),
        adresse=payload.get("adresse", ""),
    )
    return user


# ─── TripLeg serialisation ─────────────────────────────────────────────────────

def trip_leg_to_dict(leg):
    """
    Sérialise un TripLeg en dictionnaire.

    Args:
        leg (TripLeg): Objet étape de trajet à sérialiser

    Returns:
        dict: Dictionnaire avec ordre, arret, ligne_numero
    """
    return {
        "ordre": leg.ordre,
        "arret": {
            "id": leg.arret.id,
            "nom": leg.arret.nom,
            "lat": leg.arret.latitude,
            "lng": leg.arret.longitude,
        },
        "ligne_numero": leg.ligne.numero if leg.ligne else None,
    }


# ─── TripHistory serialisation ─────────────────────────────────────────────────

def trip_history_to_dict(trip):
    """
    Sérialise un objet TripHistory en dictionnaire.

    Inclut les données du trajet et la liste des étapes avec leurs arrêts et
    lignes associées.

    Args:
        trip (TripHistory): Objet historique de trajet à sérialiser

    Returns:
        dict: Dictionnaire complet représentant le trajet
    """
    return {
        "id": trip.id,
        "user_id": trip.user_id,
        "username": trip.user.username,
        "user_nom": trip.user.get_full_name().strip() or trip.user.username,
        "depart": _arret_brief(trip.depart),
        "arrivee": _arret_brief(trip.arrivee),
        "nb_changements": trip.nb_changements,
        "duree_minutes": trip.duree_minutes,
        "distance_km": trip.distance_km,
        "prix": str(trip.prix) if trip.prix is not None else None,
        "date_voyage": (
            trip.date_voyage.isoformat() if trip.date_voyage else None
        ),
        "date_creation": trip.date_creation.isoformat(),
        "date_modification": trip.date_modification.isoformat(),
        "point_accrochage": trip.point_accrochage,
        "point_accrochage_label": trip.get_point_accrochage_display(),
        "est_explicite": trip.est_explicite,
        "est_supprime": trip.est_supprime,
        "etapes": [trip_leg_to_dict(leg) for leg in trip.etapes.all()],
    }


def trip_history_summary_to_dict(trip):
    """
    Sérialise un TripHistory en version allégée (liste d'historique utilisateur).

    Exclut les champs lourds comme la liste complète des étapes.

    Args:
        trip (TripHistory): Objet historique de trajet à sérialiser

    Returns:
        dict: Dictionnaire allégé représentant le trajet
    """
    return {
        "id": trip.id,
        "depart": _arret_brief(trip.depart),
        "arrivee": _arret_brief(trip.arrivee),
        "nb_changements": trip.nb_changements,
        "duree_minutes": trip.duree_minutes,
        "distance_km": trip.distance_km,
        "prix": str(trip.prix) if trip.prix is not None else None,
        "date_voyage": (
            trip.date_voyage.isoformat() if trip.date_voyage else None
        ),
        "date_creation": trip.date_creation.isoformat(),
        "point_accrochage": trip.point_accrochage,
        "point_accrochage_label": trip.get_point_accrochage_display(),
        "est_explicite": trip.est_explicite,
        "est_supprime": trip.est_supprime,
    }


def _arret_brief(arret):
    """
    Construit un dict minimal pour un arrêt (utilisé dans les résumés).

    Args:
        arret: Instance du modèle Arret.

    Returns:
        dict: Informations clés de l'arrêt.
    """
    return {
        "id": arret.id,
        "nom": arret.nom,
        "latitude": arret.latitude,
        "longitude": arret.longitude,
    }
