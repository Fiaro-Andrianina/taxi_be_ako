from decimal import Decimal

from django.conf import settings
from django.db import models


class ProfilUtilisateur(models.Model):
    """
    Modèle représentant le profil étendu d'un utilisateur.

    Ce modèle étend le modèle Django User par des informations métier
    spécifiques aux utilisateurs de Taxi_be_ako.

    Attributes:
        ROLE_CLIENT: Rôle client standard
        ROLE_CHAUFFEUR: Rôle chauffeur de taxi
        ROLE_ADMIN: Rôle administrateur
        user: Utilisateur Django lié (OneToOne)
        telephone: Numéro de téléphone de l'utilisateur
        role: Rôle de l'utilisateur (choix prédéfinis)
        adresse: Adresse de l'utilisateur
        date_creation: Date de création du profil
    """
    ROLE_CLIENT = "client"
    ROLE_CHAUFFEUR = "chauffeur"
    ROLE_ADMIN = "admin"

    ROLE_CHOICES = [
        (ROLE_CLIENT, "Client"),
        (ROLE_CHAUFFEUR, "Chauffeur"),
        (ROLE_ADMIN, "Administrateur"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profil_taxi",
    )
    telephone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CLIENT)
    adresse = models.CharField(max_length=255, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "profil_utilisateur"
        ordering = ["user__username"]

    def __str__(self):
        return self.get_nom()

    def get_id(self):
        return self.user.id

    def get_nom(self):
        nom_complet = self.user.get_full_name().strip()
        return nom_complet or self.user.username

    def get_email(self):
        return self.user.email


class TripLeg(models.Model):
    """
    Sous-modèle représentant une étape individuelle d'un trajet utilisateur.

    Chaque TripLeg correspond à un arrêt sur l'itinéraire final et enregistre
    la ligne de bus utilisée pour rejoindre l'arrêt suivant (ou None si c'est
    l'arrêt de destination finale). Lié à un TripHistory par FK CASCADE :
    la suppression du TripHistory parent supprime automatiquement toutes ses
    étapes.

    Attributes:
        trip_history: Trajet parent auquel appartient cette étape.
        arret:     Arrêt desservi à cette étape du trajet.
        ligne:     Ligne de bus utilisée pour atteindre l'arrêt (None si finale).
        ordre:     Position de l'étape dans l'itinéraire (commence à 0).
    """

    trip_history = models.ForeignKey(
        "TripHistory",
        on_delete=models.CASCADE,
        related_name="etapes",
    )
    arret = models.ForeignKey(
        "transport.Arret",
        on_delete=models.PROTECT,
        related_name="trip_legs",
        help_text="Arrêt desservi à cette étape du trajet",
    )
    ligne = models.ForeignKey(
        "transport.Ligne",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trip_legs",
        help_text=(
            "Ligne de bus utilisée pour rejoindre cet arrêt "
            "(None si arrêt de destination final)"
        ),
    )
    ordre = models.PositiveIntegerField(
        help_text="Position de l'étape dans l'itinéraire (0 = premier arrêt)",
    )

    class Meta:
        db_table = "trip_leg"
        ordering = ["trip_history", "ordre"]
        verbose_name = "étape de trajet"
        verbose_name_plural = "étapes de trajet"
        constraints = [
            models.UniqueConstraint(
                fields=["trip_history", "ordre"],
                name="unique_ordre_par_trajet",
            )
        ]

    def __str__(self):
        ligne_label = self.ligne.numero if self.ligne else "—"
        return (
            f"[{self.ordre}] {self.arret.nom} "
            f"(ligne {ligne_label}) — trajet {self.trip_history_id}"
        )

    def get_arret_display(self):
        """Retourne le nom de l'arrêt de cette étape."""
        return self.arret.nom

    def get_ligne_numero(self):
        """Retourne le numéro de la ligne ou None."""
        return self.ligne.numero if self.ligne else None


class TripHistory(models.Model):
    """
    Modèle principal de l'historique des trajets par utilisateur.

    Enregistre chaque trajet calculé ou saisi par un utilisateur, avec :
    - Les arrêts de départ et d'arrivée.
    - Le nombre de changements de ligne.
    - La durée et la distance estimées.
    - Le prix de la course.
    - La date réelle du voyage (pour les trajets planifiés).
    - Les étapes intermédiaires via le sous-modèle TripLeg.
    - Soft-delete et trajet-explicite flags.

    Attributes:
        user:              Utilisateur propriétaire du trajet (obligatoire).
        depart:            Arrêt de départ.
        arrivee:           Arrêt d'arrivée.
        nb_changements:    Nombre de changements de ligne.
        duree_minutes:     Durée totale estimée en minutes.
        distance_km:       Distance totale estimée en kilomètres.
        prix:              Prix de la course (optionnel, FCFA).
        date_voyage:       Date/heure réelles du voyage (optionnel).
        date_creation:     Date d'enregistrement automatique (auto_now_add).
        date_modification: Date de dernière modification automatique (auto_now).
        point_accrochage:  Type du point marqué sur la carte
                           (debut / courant / intermediaire / arrivee).
        est_explicite:     True = trajet créé explicitement par l'utilisateur.
        est_supprime:      Soft-delete : True = masqué de l'historique public.
    """

    POINT_DEBUT = "debut"
    POINT_COURANT = "courant"
    POINT_INTERMEDIAIRE = "intermediaire"
    POINT_ARRIVEE = "arrivee"

    POINT_ACCROCHAGE_CHOICES = [
        (POINT_DEBUT, "Début"),
        (POINT_COURANT, "Point courant"),
        (POINT_INTERMEDIAIRE, "Point intermédiaire"),
        (POINT_ARRIVEE, "Arrivée"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trip_history",
        help_text="Utilisateur propriétaire de ce trajet",
    )

    depart = models.ForeignKey(
        "transport.Arret",
        on_delete=models.PROTECT,
        related_name="trip_history_depart",
        help_text="Arrêt de départ du trajet",
    )
    arrivee = models.ForeignKey(
        "transport.Arret",
        on_delete=models.PROTECT,
        related_name="trip_history_arrivee",
        help_text="Arrêt d'arrivée du trajet",
    )

    nb_changements = models.PositiveIntegerField(
        default=0,
        help_text="Nombre de changements de ligne effectués",
    )
    duree_minutes = models.PositiveIntegerField(
        default=0,
        help_text="Durée totale estimée en minutes",
    )
    distance_km = models.FloatField(
        default=0,
        help_text="Distance totale estimée en kilomètres",
    )
    prix = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Prix de la course (optionnel)",
    )

    date_voyage = models.DateTimeField(
        null=True,
        blank=True,
        help_text=(
            "Date et heure réelles du voyage "
            "(None si le trajet n'a pas encore eu lieu)"
        ),
    )

    date_creation = models.DateTimeField(
        auto_now_add=True,
        help_text="Date d'enregistrement automatique",
    )
    date_modification = models.DateTimeField(
        auto_now=True,
        help_text="Date de dernière modification automatique",
    )

    point_accrochage = models.CharField(
        max_length=30,
        choices=POINT_ACCROCHAGE_CHOICES,
        default=POINT_ARRIVEE,
        help_text=(
            "Type de point dans l'itinéraire : "
            "'debut' = arrêt de départ, "
            "'courant' = dernier arrêt visité, "
            "'intermediaire' = étape intermédiaire explicite, "
            "'arrivee' = arrêt de destination"
        ),
    )

    est_explicite = models.BooleanField(
        default=True,
        help_text=(
            "True si le trajet a été créé explicitement par l'utilisateur "
            "(et pas seulement lors d'une recherche automatique)"
        ),
    )
    est_supprime = models.BooleanField(
        default=False,
        help_text="Soft-delete : True = trajet masqué de l'historique public",
    )

    class Meta:
        db_table = "trip_history"
        ordering = ["-date_creation"]
        verbose_name = "historique de trajet"
        verbose_name_plural = "historiques de trajet"
        indexes = [
            models.Index(
                fields=["user", "date_creation"],
                name="trip_hist_user_date_idx",
            ),
            models.Index(
                fields=["user", "est_supprime", "date_creation"],
                name="trip_hist_user_suppr_date_idx",
            ),
            models.Index(
                fields=["date_voyage"],
                name="trip_hist_date_voyage_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.get_point_accrochage_display()} — "
            f"{self.depart.nom} → {self.arrivee.nom} "
            f"(user {self.user_id})"
        )

    def get_marqueur_label(self):
        """
        Retourne le libellé court du marqueur pour affichage sur carte.

        Returns:
            str: Libellé correspondant au point d'accrochage.
        """
        return self.get_point_accrochage_display()

    @property
    def is_deleted(self):
        """Alias de compatibilité pour est_supprime."""
        return self.est_supprime
