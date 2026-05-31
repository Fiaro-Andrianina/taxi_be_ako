from django.core.management.base import BaseCommand
from django.db import transaction

from transport.models import Arret, Correspondance, Ligne, LigneArret

# Coordonnées alignées sur les arrêts bus OpenStreetMap (Antananarivo).
# Voir aussi: python manage.py aligner_arrets_osm
ARRETS = [
    ("Analakely", -18.904096, 47.521574),
    ("Anosy", -18.919820, 47.520117),
    ("Mahamasina", -18.918940, 47.524224),
    ("67 Ha", -18.901158, 47.509165),
    ("Ankorondrano", -18.889419, 47.522541),
    ("Ivandry", -18.869230, 47.528121),
    ("Ambohijatovo", -18.910040, 47.528560),
    ("Ambanidia", -18.919377, 47.538257),
    ("Tanjombato", -18.954453, 47.529021),
    ("Amboditsiry", -18.886345, 47.539482),
    ("Antanimena", -18.896965, 47.521152),
]

LIGNES = [
    {
        "numero": "119",
        "nom": "67 Ha - Anosy",
        "description": "Ligne urbaine reliant 67 Ha au centre administratif.",
        "arrets": ["67 Ha", "Analakely", "Anosy", "Mahamasina"],
    },
    {
        "numero": "183",
        "nom": "Ivandry - Analakely",
        "description": "Ligne nord vers le centre-ville.",
        "arrets": ["Ivandry", "Ankorondrano", "Analakely", "Ambohijatovo"],
    },
    {
        "numero": "194",
        "nom": "Ambanidia - Tanjombato",
        "description": "Ligne sud avec correspondance au centre.",
        "arrets": ["Ambanidia", "Ambohijatovo", "Mahamasina", "Tanjombato"],
    },
]

class Command(BaseCommand):
    help = "Charge les donnees de demonstration de Taxi be Ako."

    @transaction.atomic
    def handle(self, *args, **options):
        arrets = {}
        for nom, latitude, longitude in ARRETS:
            arret, _ = Arret.objects.update_or_create(
                nom=nom,
                defaults={
                    "latitude": latitude,
                    "longitude": longitude,
                    "zone_id": 1,
                },
            )
            arrets[nom] = arret

        lignes = {}
        for definition in LIGNES:
            ligne, _ = Ligne.objects.update_or_create(
                numero=definition["numero"],
                defaults={
                    "nom": definition["nom"],
                    "description": definition["description"],
                },
            )
            lignes[definition["numero"]] = ligne

            LigneArret.objects.filter(ligne=ligne).delete()
            for ordre, arret_nom in enumerate(definition["arrets"], start=1):
                LigneArret.objects.create(
                    ligne=ligne,
                    arret=arrets[arret_nom],
                    ordre=ordre,
                )

        Correspondance.objects.all().delete()
        self._creer_correspondance(arrets["Analakely"], lignes["119"], lignes["183"])
        self._creer_correspondance(arrets["Mahamasina"], lignes["119"], lignes["194"])
        self._creer_correspondance(arrets["Ambohijatovo"], lignes["183"], lignes["194"])

        self.stdout.write(self.style.SUCCESS("Donnees demo chargees avec succes."))

    def _creer_correspondance(self, arret, ligne_a, ligne_b):
        Correspondance.objects.get_or_create(
            arret=arret,
            ligne_depart=ligne_a,
            ligne_arrivee=ligne_b,
            defaults={"temps_estime_minutes": 5},
        )
        Correspondance.objects.get_or_create(
            arret=arret,
            ligne_depart=ligne_b,
            ligne_arrivee=ligne_a,
            defaults={"temps_estime_minutes": 5},
        )
