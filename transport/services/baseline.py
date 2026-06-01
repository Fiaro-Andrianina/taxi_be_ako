from collections import deque

from ..models import Arret, Correspondance, Ligne, LigneArret, TrajetHistorique
from .common import Edge, TrajetIntrouvable, calculer_distance


class AlgorithmeSearchBaseline:
    """
    Algorithme de recherche de trajet utilisant BFS (Breadth-First Search).
    
    Version simple et rapide pour les petits graphes. Trouve le chemin le plus court
    en nombre d'étapes (arrêts traversés).
    
    Attributs:
        arrets: Dictionnaire des arrêts (id -> objet Arret)
        lignes: Dictionnaire des lignes (id -> objet Ligne)
        graphe: Graphe sous forme de dictionnaire {arret_id: [Edge, ...]}
    """

    # Initialise les données en mémoire et construit le graphe de transport.
    def __init__(self) -> None:
        self.arrets: dict[int, Arret] = {arret.id: arret for arret in Arret.objects.all()}
        self.lignes: dict[int, Ligne] = {ligne.id: ligne for ligne in Ligne.objects.all()}
        self.graphe = self.construire_graphe()

    # Construit le graphe de transport à partir de l'ordre des arrêts sur chaque ligne.
    def construire_graphe(self):
        """
        Construit le graphe de transport à partir des lignes et arrêts.
        
        Le graphe est représenté comme un dictionnaire où chaque clé est un arrêt
        et la valeur est une liste d'objets Edge représentant les arrêts voisins.
        
        Returns:
            dict: Graphe construit
        """
        graphe = {arret_id: [] for arret_id in self.arrets}
        lignes_arrets = LigneArret.objects.select_related("ligne", "arret").order_by(
            "ligne_id", "ordre"
        )

        par_ligne: dict[int, list[LigneArret]] = {}
        for item in lignes_arrets:
            par_ligne.setdefault(item.ligne_id, []).append(item)

        for ligne_id, sequence in par_ligne.items():
            for index in range(len(sequence) - 1):
                depart = sequence[index].arret
                arrivee = sequence[index + 1].arret
                distance = calculer_distance(depart, arrivee)
                # Ajout des arêtes bidirectionnelles entre les arrêts
                # Ajout des arêtes bidirectionnelles avec calcul de distance
                
                graphe[depart.id].append(Edge(arrivee.id, ligne_id, distance))
                graphe[arrivee.id].append(Edge(depart.id, ligne_id, distance))

        return graphe

    # Prépare une version sérialisable du graphe pour l'API ou l'affichage.
    def get_graphe(self):
        """
        Retourne le graphe de transport sous forme de dictionnaire standardisé.
        
        Returns:
            dict: Structure du graphe avec noeuds et arêtes
        """
        aretes = []
        deja_vues = set()

        for depart_id, edges in self.graphe.items():
            for edge in edges:
                if edge.ligne_id is None:
                    continue
                cle = tuple(sorted([depart_id, edge.destination_id])) + (edge.ligne_id,)
                if cle in deja_vues:
                    continue
                deja_vues.add(cle)
                aretes.append(
                    {
                        "depart": self.arrets[depart_id],
                        "arrivee": self.arrets[edge.destination_id],
                        "ligne": self.lignes[edge.ligne_id],
                        "distance_km": round(edge.distance_km, 2),
                    }
                )

        return {
            "noeuds": list(self.arrets.values()),
            "aretes": aretes,
        }

    # Recherche le chemin avec le moins d'arrêts en utilisant une file FIFO.
    def bfs(self, start_id, end_id):
        """
        Recherche en largeur (BFS) pour trouver le plus court chemin en nombre d'arrêts.
        
        Args:
            start_id (int): Identifiant de l'arrêt de départ
            end_id (int): Identifiant de l'arrêt d'arrivée
            
        Returns:
            list[Edge]: Liste des arêtes constituant le chemin trouvé
            
        Raises:
            TrajetIntrouvable: Si aucun chemin n'existe entre les deux arrêts
        """
        if start_id == end_id:
            return []

        # parent: node_id -> (prev_node_id, edge)
        parent = {start_id: (None, None)}
        queue = deque([start_id])

        while queue:
            courant = queue.popleft()
            if courant == end_id:
                break

            for edge in self.graphe.get(courant, []):
                nxt = edge.destination_id
                if nxt in parent:
                    continue
                parent[nxt] = (courant, edge)
                queue.append(nxt)

        if end_id not in parent:
            raise TrajetIntrouvable("Aucun trajet disponible")

        # Reconstruction
        chemin = []
        node = end_id
        while node != start_id:
            prev, edge = parent[node]
            if edge is None:
                break
            chemin.append(edge)
            node = prev

        chemin.reverse()
        return chemin

    # Analyse un chemin pour détecter les changements de ligne et créer les correspondances.
    def trouver_correspondances(self, chemin):
        """
        Identifie les correspondances nécessaires le long du chemin.
        
        Args:
            chemin (list[Edge]): Liste des arêtes du chemin
            
        Returns:
            list[Correspondance]: Liste des correspondances à effectuer
        """
        correspondances = []
        for previous, current in zip(chemin, chemin[1:]):
            if previous.ligne_id == current.ligne_id:
                continue
            correspondance, _ = Correspondance.objects.get_or_create(
                arret_id=previous.destination_id,
                ligne_depart_id=previous.ligne_id,
                ligne_arrivee_id=current.ligne_id,
                defaults={"temps_estime_minutes": 5},
            )
            correspondances.append(correspondance)
        return correspondances

    # Calcule le trajet complet à partir du chemin BFS, puis sauvegarde l'historique.
    def calculer_trajet(self, depart_id, arrivee_id):
        """
        Calcule un trajet entre deux arrêts en utilisant l'algorithme BFS.
        
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

        chemin = self.bfs(depart_id, arrivee_id)
        if not chemin:
            raise TrajetIntrouvable("Aucun trajet disponible")

        arret_ids = [depart_id] + [edge.destination_id for edge in chemin]
        ligne_ids = []
        for edge in chemin:
            if edge.ligne_id not in ligne_ids:
                ligne_ids.append(edge.ligne_id)

        distance_km = round(sum(edge.distance_km for edge in chemin), 2)
        correspondances = self.trouver_correspondances(chemin)
        duree_minutes = max(1, round(distance_km * 3 + len(correspondances) * 5))

        historique = TrajetHistorique.objects.create(
            depart_id=depart_id,
            arrivee_id=arrivee_id,
            nb_changements=len(correspondances),
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
            "nb_changements": len(correspondances),
            "duree_minutes": duree_minutes,
            "distance_km": distance_km,
        }

    # Formate chaque arrêt du trajet pour l'interface en indiquant les lignes et transferts.
    def _etapes(self, arret_ids, chemin):
        """
        Formate les étapes du trajet pour l'affichage.
        
        Retourne une liste d'étapes où chaque étape contient un arrêt et les lignes
        qui y sont associées (ligne précédente et suivante).
        
        Args:
            arret_ids (list[int]): Liste des identifiants d'arrêts
            chemin (list[Edge]): Liste des arêtes du chemin
            
        Returns:
            list[dict]: Liste des étapes formatées
        """
        etapes = []

        for i, arret_id in enumerate(arret_ids):
            lignes = []
            est_correspondance = False

            # Determine the line(s) at this stop
            if i == 0:
                # First stop (departure) - show the first line
                if len(chemin) > 0:
                    lignes.append(self.lignes[chemin[0].ligne_id])
            elif i == len(arret_ids) - 1:
                # Last stop (arrival) - show the last line
                lignes.append(self.lignes[chemin[-1].ligne_id])
            else:
                # Intermediate stop - check if this is a transfer point
                prev_line_id = chemin[i - 1].ligne_id
                curr_line_id = chemin[i].ligne_id

                if prev_line_id == curr_line_id:
                    # Same line - just show one line
                    lignes.append(self.lignes[prev_line_id])
                else:
                    # Transfer point - show both lines
                    lignes.append(self.lignes[prev_line_id])
                    lignes.append(self.lignes[curr_line_id])
                    est_correspondance = True

            etapes.append({
                "arret": self.arrets[arret_id],
                "lignes": lignes,
                "est_correspondance": est_correspondance,
            })
        return etapes