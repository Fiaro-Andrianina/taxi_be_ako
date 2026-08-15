from .models import Arret, Correspondance, Ligne, LigneArret, TrajetHistorique
from .services.stop_geocoding import get_osm_index, resolve_arret_coordinates


def arret_to_dict(arret, osm_index=None):
    """
    Sérialise un objet Arret en dictionnaire.
    
    Args:
        arret (Arret): Objet arrêt à sérialiser
        osm_index: Index OSM bus_stop (optionnel, pour alignement par nom de quartier)
        
    Returns:
        dict: Dictionnaire contenant les données de l'arrêt
    """
    lat = arret.latitude
    lng = arret.longitude
    coords_corrigees = False

    if lat is None or lng is None:
        lat, lng, coords_corrigees, _source = resolve_arret_coordinates(
            arret.nom,
            arret.latitude,
            arret.longitude,
            osm_index=osm_index,
        )

    return {
        "id": arret.id,
        "nom": arret.nom,
        "lat": lat,
        "lng": lng,
        "latitude": lat,
        "longitude": lng,
        "est_correspondance": arret.est_correspondance(),
        "coords_corrigees": coords_corrigees,
    }


def ligne_to_dict(ligne, detail=False, osm_index=None):
    """
    Sérialise un objet Ligne en dictionnaire.
    
    Args:
        ligne (Ligne): Objet ligne à sérialiser
        detail (bool): Si True, inclut les arrêts détaillés
        
    Returns:
        dict: Dictionnaire contenant les données de la ligne
    """
    data = {
        "id": ligne.id,
        "numero": ligne.numero,
        "nom": ligne.nom,
        "description": ligne.description,
        "couleur": ligne.couleur,
        "nb_arrets": ligne.get_nb_arrets(),
    }
    if detail:
        data["arrets"] = [
            ligne_arret_to_dict(item, osm_index=osm_index)
            for item in LigneArret.objects.filter(ligne=ligne)
            .select_related("arret")
            .order_by("ordre")
        ]
    return data


def ligne_arret_to_dict(ligne_arret, osm_index=None):
    """
    Sérialise un objet LigneArret en dictionnaire.
    
    Args:
        ligne_arret (LigneArret): Objet association ligne-arrêt
        
    Returns:
        dict: Dictionnaire contenant les données de l'association
    """
    data = {
        "id": ligne_arret.id,
        "ordre": ligne_arret.ordre,
        "arret": arret_to_dict(ligne_arret.arret, osm_index=osm_index),
    }
    if ligne_arret.trace:
        data["trace"] = ligne_arret.trace
    return data


def correspondance_to_dict(correspondance):
    """
    Sérialise un objet Correspondance en dictionnaire.
    
    Args:
        correspondance (Correspondance): Objet correspondance
        
    Returns:
        dict: Dictionnaire contenant les données de la correspondance
    """
    return {
        "id": correspondance.id,
        "arret": arret_to_dict(correspondance.arret),
        "ligne_depart": ligne_to_dict(correspondance.ligne_depart),
        "ligne_arrivee": ligne_to_dict(correspondance.ligne_arrivee),
        "temps_estime_minutes": correspondance.temps_estime_minutes,
    }


def etape_to_dict(etape):
    """
    Sérialise une étape de trajet en dictionnaire.
    
    Args:
        etape (dict): Étape contenant un arrêt et les lignes associées
        
    Returns:
        dict: Dictionnaire contenant les données de l'étape
    """
    data = {
        "arret": arret_to_dict(etape["arret"]),
        "lignes": [ligne_to_dict(ligne) for ligne in etape["lignes"]],
        "est_correspondance": bool(etape.get("est_correspondance")),
    }
    if etape.get("mode"):
        data["mode"] = etape["mode"]
    if etape.get("marche"):
        data["marche"] = etape["marche"]
    return data


def trajet_to_dict(trajet):
    """
    Sérialise un trajet calculé (résultat de l'algorithme) en dictionnaire.
    
    Args:
        trajet (dict): Trajet contenant les informations de départ, arrivée,
                       arrets, lignes, correspondances, etc.
        
    Returns:
        dict: Dictionnaire contenant toutes les données du trajet
    """
    return {
        "depart": arret_to_dict(trajet["depart"]),
        "arrivee": arret_to_dict(trajet["arrivee"]),
        "arrets": [etape_to_dict(etape) for etape in trajet["arrets"]],
        "lignes": [ligne_to_dict(ligne, detail=True) for ligne in trajet["lignes"]],
        "correspondances": [
            correspondance_to_dict(correspondance)
            for correspondance in trajet["correspondances"]
        ],
        "nb_changements": trajet["nb_changements"],
        "duree_minutes": trajet["duree_minutes"],
        "distance_km": trajet["distance_km"],
        "distance_marche_km": trajet.get("distance_marche_km", 0),
        "direct": trajet.get("direct", trajet["nb_changements"] == 0),
        "cas": trajet.get("cas", 1 if trajet.get("direct") else 2),
    }


def historique_to_dict(trajet):
    """
    Sérialise un objet TrajetHistorique en dictionnaire.
    
    Args:
        trajet (TrajetHistorique): Objet trajet historique
        
    Returns:
        dict: Dictionnaire contenant les données du trajet historique
    """
    return {
        "id": trajet.id,
        "depart": arret_to_dict(trajet.depart),
        "arrivee": arret_to_dict(trajet.arrivee),
        "lignes": [ligne_to_dict(ligne) for ligne in trajet.lignes.all()],
        "correspondances": [
            correspondance_to_dict(correspondance)
            for correspondance in trajet.correspondances.all()
        ],
        "nb_changements": trajet.nb_changements,
        "duree_minutes": trajet.duree_minutes,
        "distance_km": trajet.distance_km,
        "cree_le": trajet.cree_le.isoformat(),
    }


def graphe_to_dict(graphe):
    """
    Sérialise un graphe de transport en dictionnaire.
    
    Args:
        graphe (dict): Graphe contenant les noeuds (arrêts) et arêtes (liens)
        
    Returns:
        dict: Dictionnaire contenant la structure du graphe
    """
    return {
        "noeuds": [arret_to_dict(arret) for arret in graphe["noeuds"]],
        "aretes": [
            {
                "depart": arret_to_dict(arete["depart"]),
                "arrivee": arret_to_dict(arete["arrivee"]),
                "ligne": ligne_to_dict(arete["ligne"]),
                "distance_km": arete["distance_km"],
            }
            for arete in graphe["aretes"]
        ],
    }


def sync_to_dict():
    """
    Retourne l'état complet de synchronisation des données de transport.
    
    Returns:
        dict: Dictionnaire contenant toutes les lignes, arrêts et correspondances
    """
    try:
        osm_index = get_osm_index()
    except Exception:
        osm_index = {}

    arrets = Arret.objects.all()
    arrets_dicts = [arret_to_dict(arret, osm_index=osm_index) for arret in arrets]

    return {
        "lignes": [
            ligne_to_dict(ligne, detail=True, osm_index=osm_index)
            for ligne in Ligne.objects.all()
        ],
        "arrets": arrets_dicts,
        "correspondances": [
            correspondance_to_dict(correspondance)
            for correspondance in Correspondance.objects.select_related(
                "arret", "ligne_depart", "ligne_arrivee"
            )
        ],
    }
