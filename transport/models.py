from typing import cast

from django.db import models
from django.db.models import Min


class Arret(models.Model):
    """
    Modèle représentant un arrêt de transport (station, arrêt de bus).
    
    Attributs:
        id: Identifiant unique
        nom: Nom de l'arrêt (unique)
        latitude: Latitude de la position géographique
        longitude: Longitude de la position géographique
        
    Méthodes:
        get_nom: Retourne le nom de l'arrêt
        get_coords: Retourne les coordonnées (latitude, longitude)
        est_correspondance: Vérifie si l'arrêt est une correspondance (plusieurs lignes)
    """
    id: int  # type: ignore[assignment]
    nom = models.CharField(max_length=120, unique=True)
    latitude = models.FloatField()
    longitude = models.FloatField()

    class Meta:
        db_table = "arret"
        ordering = ["nom"]
        verbose_name = "arret"
        verbose_name_plural = "arrets"

    def __str__(self):
        return self.nom

    def get_nom(self):
        """Retourne le nom de l'arrêt."""
        return self.nom

    def get_coords(self):
        """Retourne les coordonnées géographiques sous forme de tuple (lat, lng)."""
        return (self.latitude, self.longitude)

    def est_correspondance(self):
        """
        Vérifie si l'arrêt est une correspondance entre plusieurs lignes.
        
        Returns:
            bool: True si l'arrêt dessert plus d'une ligne, False sinon
        """
        return self.lignes.count() > 1  # type: ignore[attr-defined]


class Ligne(models.Model):
    """
    Modèle représentant une ligne de transport (itinéraire, bus).

    Correspond au tableau MySQL 'ligne' existant.

    Attributs:
        id: Identifiant unique
        numero: Numéro de ligne (unique)
        nom: Nom de la ligne
        description: Description de la ligne
        terminus_depart: Arrêt de départ (texte)
        terminus_arrivee: Arrêt d'arrivée (texte)
        zone_id: ID de zone géographique
        couleur: Couleur d'affichage de la ligne
        actif: Indique si la ligne est active
        arrets: Arrêts desservis via LigneArret (ManyToMany)

    Méthodes:
        get_arrets: Retourne la liste ordonnée des arrêts de la ligne
        get_terminus: Retourne les terminus (départ et arrivée)
        contient_arret: Vérifie si un arrêt fait partie de la ligne
        get_nb_arrets: Retourne le nombre d'arrêts sur la ligne
    """
    id: int  # type: ignore[assignment]
    numero = models.CharField(max_length=20, unique=True)
    nom = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    # Champs présents dans le schéma MySQL mais absents du modèle Python d'origine.
    # blank=True / default='' permet d'insérer depuis l'API sans erreur STRICT_TRANS_TABLES.
    terminus_depart = models.CharField(max_length=100, blank=True, default='')
    terminus_arrivee = models.CharField(max_length=100, blank=True, default='')
    zone_id = models.PositiveIntegerField(null=True, blank=True)
    couleur = models.CharField(max_length=60, blank=True)
    actif = models.BooleanField(default=True)
    arrets = models.ManyToManyField(Arret, through="LigneArret", related_name="lignes")

    class Meta:
        db_table = "ligne"
        ordering = ["numero", "nom"]

    def __str__(self):
        return f"{self.numero} - {self.nom}"

    def get_arrets(self):
        """
        Retourne la liste ordonnée des arrêts de la ligne.
        
        Les arrêts sont ordonnés selon leur ordre dans la séquence de la ligne.
        
        Returns:
            QuerySet: Liste des arrêts ordonnés
        """
        return Arret.objects.filter(lignearret__ligne=self).order_by("lignearret__ordre")

    def get_terminus(self):
        """
        Retourne les terminus (premier et dernier arrêt) de la ligne.
        
        Returns:
            list: Liste contenant 0, 1 ou 2 arrêts (départ et arrivée)
        """
        arrets = list(self.get_arrets())
        if not arrets:
            return []
        if len(arrets) == 1:
            return [arrets[0]]
        return [arrets[0], arrets[-1]]

    def contient_arret(self, arret):
        """
        Vérifie si un arrêt spécifique fait partie de la ligne.
        
        Args:
            arret (Arret): Objet arrêt à vérifier
            
        Returns:
            bool: True si l'arrêt est desservi par la ligne, False sinon
        """
        return self.arrets.filter(pk=arret.pk).exists()

    def get_nb_arrets(self):
        """
        Retourne le nombre total d'arrêts sur la ligne.
        
        Returns:
            int: Nombre d'arrêts
        """
        return self.arrets.count()


class LigneArret(models.Model):
    """
    Modèle de liaison entre une ligne et un arrêt, définissant l'ordre.
    
    Représente la présence d'un arrêt sur une ligne avec un ordre spécifique.
    Inclut également une trace GPS optionnelle entre cet arrêt et le suivant.
    
    Attributs:
        ligne: Ligne de transport associée
        arret: Arrêt associé
        ordre: Position de l'arrêt dans la séquence de la ligne
        trace: Trace GPS (liste de coordonnées) entre cet arrêt et le suivant
    """
    id: int  # type: ignore[assignment]
    ligne_id: int  # type: ignore[assignment]
    arret_id: int  # type: ignore[assignment]
    ligne = models.ForeignKey(Ligne, on_delete=models.CASCADE)
    arret = models.ForeignKey(Arret, on_delete=models.CASCADE)
    ordre = models.PositiveIntegerField()
    # Trace GPS du trajet entre cet arret et le suivant (liste de [lat, lng])
    # Format: [[lat1, lng1], [lat2, lng2], ...]
    trace = models.JSONField(null=True, blank=True, help_text="Trace GPS vers l'arret suivant")

    class Meta:
        db_table = "ligne_arret"
        ordering = ["ligne__numero", "ordre"]
        constraints = [
            models.UniqueConstraint(fields=["ligne", "arret"], name="unique_ligne_arret"),
            models.UniqueConstraint(fields=["ligne", "ordre"], name="unique_ordre_par_ligne"),
        ]

    def __str__(self):
        return f"{self.ligne.numero} - {self.ordre}. {self.arret.nom}"

    def get_ordre(self):
        """Retourne l'ordre de l'arrêt dans la ligne."""
        return self.ordre

    def get_arret(self):
        """Retourne l'objet Arret associé."""
        return self.arret

    def get_ligne(self):
        """Retourne l'objet Ligne associé."""
        return self.ligne


class Correspondance(models.Model):
    """
    Modèle représentant une correspondance entre deux lignes à un arrêt.
    
    Permet de définir les changements de ligne possibles à un arrêt spécifique.
    
    Attributs:
        arret: Arrêt où se fait la correspondance
        ligne_depart: Ligne à l'arrivée
        ligne_arrivee: Ligne au départ
        temps_estime_minutes: Temps de correspondance estimé
    """
    ligne_depart_id: int  # type: ignore[assignment]
    ligne_arrivee_id: int  # type: ignore[assignment]
    arret = models.ForeignKey(Arret, on_delete=models.CASCADE, related_name="correspondances")
    ligne_depart = models.ForeignKey(
        Ligne, on_delete=models.CASCADE, related_name="correspondances_depart"
    )
    ligne_arrivee = models.ForeignKey(
        Ligne, on_delete=models.CASCADE, related_name="correspondances_arrivee"
    )
    temps_estime_minutes = models.PositiveIntegerField(default=5)

    class Meta:
        db_table = "correspondance"
        ordering = ["arret__nom", "ligne_depart__numero", "ligne_arrivee__numero"]
        constraints = [
            models.UniqueConstraint(
                fields=["arret", "ligne_depart", "ligne_arrivee"],
                name="unique_correspondance",
            )
        ]

    def __str__(self):
        return f"{self.arret.nom}: {self.ligne_depart.numero} -> {self.ligne_arrivee.numero}"

    def get_arret_changement(self):
        """Retourne l'arrêt où se fait la correspondance."""
        return self.arret

    def get_lignes(self):
        """Retourne les deux lignes impliquées dans la correspondance."""
        return [self.ligne_depart, self.ligne_arrivee]

    def est_valide(self):
        """
        Vérifie la validité de la correspondance.
        
        Une correspondance est valide si:
        - Les deux lignes sont différentes
        - L'arrêt fait partie des deux lignes
        
        Returns:
            bool: True si la correspondance est valide, False sinon
        """
        return (
            self.ligne_depart_id != self.ligne_arrivee_id
            and self.ligne_depart.contient_arret(self.arret)
            and self.ligne_arrivee.contient_arret(self.arret)
        )


class TrajetHistorique(models.Model):
    """
    Modèle pour stocker l'historique des trajets recherchés.
    
    Enregistre les trajets calculés par le service pour analyse et optimisation.
    
    Attributs:
        depart: Arrêt de départ
        arrivee: Arrêt d'arrivée
        lignes: Lignes utilisées (plusieurs possibles)
        correspondances: Correspondances effectuées
        nb_changements: Nombre de changements de ligne
        duree_minutes: Durée totale du trajet en minutes
        distance_km: Distance totale en kilomètres
        cree_le: Date de création de l'enregistrement
    """
    depart = models.ForeignKey(Arret, on_delete=models.PROTECT, related_name="trajets_depart")
    arrivee = models.ForeignKey(Arret, on_delete=models.PROTECT, related_name="trajets_arrivee")
    lignes = models.ManyToManyField(Ligne, blank=True, related_name="trajets")
    correspondances = models.ManyToManyField(Correspondance, blank=True, related_name="trajets")
    nb_changements = models.PositiveIntegerField(default=0)
    duree_minutes = models.PositiveIntegerField(default=0)
    distance_km = models.FloatField(default=0)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "trajet_historique"
        ordering = ["-cree_le"]

    def __str__(self):
        return f"{self.depart.nom} -> {self.arrivee.nom}"

    def get_duree(self):
        """Retourne la durée du trajet en minutes."""
        return self.duree_minutes

    def afficher_itineraire(self):
        """
        Retourne une représentation textuelle de l'itinéraire.
        
        Returns:
            str: Itinéraire formaté avec les lignes utilisées
        """
        lignes = " -> ".join(ligne.numero for ligne in self.lignes.all())
        return f"{self.depart.nom} -> {self.arrivee.nom} ({lignes})"

    def est_optimal(self):
        """
        Vérifie si le trajet est optimal (meilleur temps).
        
        Compare la durée du trajet avec la durée minimale enregistrée.
        
        Returns:
            bool: True si le trajet a la durée minimale, False sinon
        """
        best = TrajetHistorique.objects.aggregate(best=Min("duree_minutes"))["best"]
        return best is None or self.duree_minutes <= best