from math import asin, cos, radians, sin, sqrt
from dataclasses import dataclass


class TrajetIntrouvable(Exception):
    """
    Exception levée lorsqu'un trajet ne peut être trouvé entre deux arrêts.
    
    Cette exception est utilisée par les algorithmes de recherche de trajet
    lorsqu'aucun chemin n'existe entre les arrêts demandés.
    """


@dataclass(frozen=True)
class Edge:
    """
    Représente une arête dans le graphe de transport.
    
    Attributs:
        destination_id (int): Identifiant de l'arrêt de destination
        ligne_id (int): Identifiant de la ligne utilisée pour cette arête
        distance_km (float): Distance entre les arrêts en kilomètres
    """
    destination_id: int
    ligne_id: int | None
    distance_km: float
    mode: str = "bus"


def calculer_distance(arret_a, arret_b):
    """
    Calcule la distance Haversine entre deux arrêts.
    
    Utilise la formule de Haversine pour calculer la distance à la surface
    de la Terre entre deux points géographiques donnés par leurs latitudes
    et longitudes.
    
    Si l'un des arrêts a des coordonnées nulles, retourne une distance
    de 0 km pour ne pas planter le calcul du graphe.
    
    Args:
        arret_a (Arret): Premier arrêt
        arret_b (Arret): Deuxième arrêt
        
    Returns:
        float: Distance en kilomètres
    """
    rayon_terre_km = 6371.0
    lat1, lon1 = arret_a.latitude, arret_a.longitude
    lat2, lon2 = arret_b.latitude, arret_b.longitude
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    lat1, lon1 = radians(lat1), radians(lon1)
    lat2, lon2 = radians(lat2), radians(lon2)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    hav = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * rayon_terre_km * asin(sqrt(hav))
