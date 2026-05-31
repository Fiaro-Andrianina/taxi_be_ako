from heapq import heappop, heappush
from typing import TypeAlias

from ..models import Arret, Correspondance, Ligne, LigneArret, TrajetHistorique
from .baseline import AlgorithmeSearchBaseline
from .common import Edge, TrajetIntrouvable, calculer_distance

# Sentinel pour représenter "aucune ligne" dans le tas (évite None dans le heap).
NO_LINE = -1
SearchState: TypeAlias = tuple[int, int | None]
HeapEntry: TypeAlias = tuple[float, float, int, int]


def _decode_line(line_id: int) -> int | None:
    return None if line_id == NO_LINE else line_id


class AlgorithmeSearchOptimized(AlgorithmeSearchBaseline):
    """
    Algorithme de recherche de trajet optimisé utilisant A* avec une fonction de coût.
    
    Version avancée qui prend en compte à la fois la distance et le temps de correspondance
    pour trouver le trajet le plus pratique pour l'utilisateur, et non pas juste le plus court.
    
    Attributs (supplémentaires):
        TRANSFER_PENALTY_MINUTES: Pénalité de temps pour un changement de ligne (minutes)
        MINUTES_PER_KM: Vitesse moyenne de déplacement (minutes par kilomètre)
        WALK_SPEED_KMH: Vitesse de marche (km/h) - non utilisée directement ici
        _correspondance_cache: Cache pour éviter les requêtes en double
        
    Hérite de AlgorithmeSearchBaseline pour réutiliser la construction du graphe.
    """

    TRANSFER_PENALTY_MINUTES = 5
    MINUTES_PER_KM = 2.5
    WALK_SPEED_KMH = 5
    MAX_WALKING_TRANSFER_KM = 0.35

    def __init__(self) -> None:
        super().__init__()
        self._correspondance_cache: dict[tuple, Correspondance] = {}

    def construire_graphe(self):
        graphe = super().construire_graphe()
        lignes_par_arret: dict[int, set[int]] = {arret_id: set() for arret_id in self.arrets}

        for item in LigneArret.objects.only("ligne_id", "arret_id"):
            lignes_par_arret.setdefault(item.arret_id, set()).add(item.ligne_id)

        arrets = list(self.arrets.values())
        for index, depart in enumerate(arrets):
            for arrivee in arrets[index + 1:]:
                distance = calculer_distance(depart, arrivee)
                if distance <= 0 or distance > self.MAX_WALKING_TRANSFER_KM:
                    continue

                # On garde la marche pour les vrais raccourcis de correspondance:
                # deux arrets proches mais pas exactement desservis par les memes lignes.
                if lignes_par_arret.get(depart.id) == lignes_par_arret.get(arrivee.id):
                    continue

                graphe[depart.id].append(Edge(arrivee.id, None, distance, "walk"))
                graphe[arrivee.id].append(Edge(depart.id, None, distance, "walk"))

        return graphe

    def trouver_correspondances(self, chemin):
        """
        Identifie les correspondances le long du chemin avec mise en cache.
        
        Surcharge de la méthode de la classe mère pour ajouter un cache
        qui évite les requêtes en double pour la même correspondance.
        
        Args:
            chemin (list[Edge]): Liste des arêtes du chemin
            
        Returns:
            list[Correspondance]: Liste des correspondances
        """
        correspondances = []
        for previous, current in zip(chemin, chemin[1:]):
            if previous.mode == "walk" or current.mode == "walk":
                continue
            if previous.ligne_id == current.ligne_id:
                continue
            cache_key = (previous.destination_id, previous.ligne_id, current.ligne_id)
            correspondance = self._correspondance_cache.get(cache_key)
            if correspondance is None:
                correspondance, _ = Correspondance.objects.get_or_create(
                    arret_id=previous.destination_id,
                    ligne_depart_id=previous.ligne_id,
                    ligne_arrivee_id=current.ligne_id,
                    defaults={"temps_estime_minutes": 5},
                )
                self._correspondance_cache[cache_key] = correspondance
            correspondances.append(correspondance)
        return correspondances

    def dijkstra(self, start_id, end_id):
        """
        Algorithme A* pour trouver le chemin de coût minimal.
        
        Args:
            start_id (int): Identifiant de l'arrêt de départ
            end_id (int): Identifiant de l'arrêt d'arrivée
            
        Returns:
            list[Edge]: Chemin optimal trouvé
            
        Raises:
            TrajetIntrouvable: Si aucun chemin n'existe
        """
        start_state: SearchState = (start_id, None)
        g_score: dict[SearchState, float] = {start_state: 0.0}
        parents: dict[SearchState, tuple[SearchState, Edge]] = {}
        heap: list[HeapEntry] = [(0.0, 0.0, start_id, NO_LINE)]

        while heap:
            f_courant, g_courant, courant, ligne_courante_encoded = heappop(heap)
            ligne_courante = _decode_line(ligne_courante_encoded)
            state: SearchState = (courant, ligne_courante)

            # Si nous avons déjà trouvé un meilleur chemin pour cet état, on continue
            if g_courant > g_score.get(state, float("inf")):
                continue

            if courant == end_id:
                return self._reconstruire_chemin(parents, start_state, state)

            for edge in self.graphe.get(courant, []):
                if edge.mode == "walk":
                    edge_minutes = (edge.distance_km / self.WALK_SPEED_KMH) * 60
                    tentative_g = g_courant + edge_minutes
                    next_state: SearchState = (edge.destination_id, None)
                    next_line_encoded = NO_LINE
                else:
                    if edge.ligne_id is None:
                        continue
                    change_penalty = (
                        self.TRANSFER_PENALTY_MINUTES
                        if ligne_courante is not None and ligne_courante != edge.ligne_id
                        else 0
                    )
                    tentative_g = g_courant + edge.distance_km * self.MINUTES_PER_KM + change_penalty
                    next_state = (edge.destination_id, edge.ligne_id)
                    next_line_encoded = edge.ligne_id

                if tentative_g < g_score.get(next_state, float("inf")):
                    parents[next_state] = (state, edge)
                    g_score[next_state] = tentative_g
                    h = calculer_distance(
                        self.arrets[edge.destination_id],
                        self.arrets[end_id],
                    ) * self.MINUTES_PER_KM
                    f_score = tentative_g + h
                    heappush(heap, (f_score, tentative_g, edge.destination_id, next_line_encoded))

        raise TrajetIntrouvable("Aucun trajet disponible")

    def _reconstruire_chemin(
        self,
        parents: dict[SearchState, tuple[SearchState, Edge]],
        start_state: SearchState,
        end_state: SearchState,
    ):
        """
        Reconstruit le chemin à partir des informations de parenté.
        
        Args:
            parents (dict): Dictionnaire de parenté
            start_state (tuple): État de départ
            end_state (tuple): État d'arrivée
            
        Returns:
            list[Edge]: Chemin reconstruit
            
        Raises:
            TrajetIntrouvable: Si le chemin ne peut être reconstruit
        """
        courant = end_state
        chemin = []
        while courant != start_state:
            if courant not in parents:
                raise TrajetIntrouvable("Aucun trajet disponible")
            precedent, edge = parents[courant]
            chemin.append(edge)
            courant = precedent
        chemin.reverse()
        return chemin

    def calculer_trajet(self, depart_id, arrivee_id):
        """
        Calcule un trajet optimisé en utilisant l'algorithme A*.
        
        Args:
            depart_id (int): Identifiant de l'arrêt de départ
            arrivee_id (int): Identifiant de l'arrêt d'arrivée
            
        Returns:
            dict: Résultat du trajet avec itinéraire, durée, distance, etc.
            
        Raises:
            TrajetIntrouvable: Si un trajet ne peut être trouvé
        """
        if depart_id not in self.arrets or arrivee_id not in self.arrets:
            raise TrajetIntrouvable("Arret introuvable")

        chemin = self.dijkstra(depart_id, arrivee_id)
        if not chemin:
            raise TrajetIntrouvable("Aucun trajet disponible")

        arret_ids = [depart_id] + [edge.destination_id for edge in chemin]
        ligne_ids = []
        for edge in chemin:
            if edge.ligne_id is not None and edge.ligne_id not in ligne_ids:
                ligne_ids.append(edge.ligne_id)

        distance_km = round(sum(edge.distance_km for edge in chemin), 2)
        walking_distance_km = sum(edge.distance_km for edge in chemin if edge.mode == "walk")
        correspondances = self.trouver_correspondances(chemin)
        walking_transfers = sum(1 for edge in chemin if edge.mode == "walk")
        bus_distance_km = distance_km - walking_distance_km
        duree_minutes = max(
            1,
            round(
                bus_distance_km * self.MINUTES_PER_KM
                + (walking_distance_km / self.WALK_SPEED_KMH) * 60
                + len(correspondances) * self.TRANSFER_PENALTY_MINUTES
            ),
        )

        historique = TrajetHistorique.objects.create(
            depart_id=depart_id,
            arrivee_id=arrivee_id,
            nb_changements=len(correspondances) + walking_transfers,
            duree_minutes=duree_minutes,
            distance_km=distance_km,
        )
        historique.lignes.set(ligne_ids)
        historique.correspondances.set(correspondances)

        return {
            "depart": self.arrets[depart_id],
            "arrivee": self.arrets[arrivee_id],
            "arrets": self._etapes(arret_ids, chemin),
            "lignes": [self.lignes[ligne_id] for ligne_id in ligne_ids],
            "correspondances": correspondances,
            "historique": historique,
            "nb_changements": len(correspondances) + walking_transfers,
            "duree_minutes": duree_minutes,
            "distance_km": distance_km,
            "distance_marche_km": round(walking_distance_km, 2),
        }

    def _etapes(self, arret_ids, chemin):
        etapes = []

        for i, arret_id in enumerate(arret_ids):
            lignes = []
            est_correspondance = False
            mode = "bus"
            marche = None

            prev_edge = chemin[i - 1] if i > 0 else None
            next_edge = chemin[i] if i < len(chemin) else None

            if prev_edge and prev_edge.mode == "walk":
                mode = "walk"
                marche = {
                    "distance_km": round(prev_edge.distance_km, 2),
                    "duree_minutes": max(1, round((prev_edge.distance_km / self.WALK_SPEED_KMH) * 60)),
                }

            for edge in (prev_edge, next_edge):
                if edge and edge.ligne_id is not None and self.lignes[edge.ligne_id] not in lignes:
                    lignes.append(self.lignes[edge.ligne_id])

            if prev_edge and next_edge:
                if prev_edge.mode == "walk" or next_edge.mode == "walk":
                    est_correspondance = True
                elif prev_edge.ligne_id != next_edge.ligne_id:
                    est_correspondance = True

            etape = {
                "arret": self.arrets[arret_id],
                "lignes": lignes,
                "est_correspondance": est_correspondance,
                "mode": mode,
            }
            if marche:
                etape["marche"] = marche
            etapes.append(etape)

        return etapes
