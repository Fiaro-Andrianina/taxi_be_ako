from django.core.management.base import BaseCommand
from django.db import transaction
from transport.models import Ligne, LigneArret


class Command(BaseCommand):
    help = "Réordonne les arrêts des lignes pour éliminer les doublons"

    def handle(self, *args, **options):
        with transaction.atomic():
            for ligne in Ligne.objects.all():
                arrets = list(LigneArret.objects.filter(ligne=ligne).order_by("ordre", "id"))
                seen = set()
                for i, la in enumerate(arrets, 1):
                    expected = i
                    if la.ordre != expected:
                        self.stdout.write(
                            f"Ligne {ligne.numero}: arrêt {la.arret.nom} "
                            f"{la.ordre} -> {expected}"
                        )
                    if la.ordre in seen:
                        self.stdout.write(
                            f"  DOUBLON détecté pour ordre {la.ordre}, correction"
                        )
                        la.ordre = expected
                    else:
                        la.ordre = expected
                    seen.add(la.ordre)
                    la.save(update_fields=["ordre"])
            self.stdout.write(self.style.SUCCESS("Réordonnancement terminé."))