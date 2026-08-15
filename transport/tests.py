from django.test import TestCase

from transport.models import Arret, Ligne, LigneArret
from transport.services import AlgorithmeSearchOptimized, TrajetIntrouvable


class AlgorithmeSearchOptimizedTests(TestCase):
    def setUp(self):
        self.arrets = {}
        for nom, lat, lng in [
            ("A", -18.90, 47.52),
            ("B", -18.91, 47.53),
            ("C", -18.92, 47.54),
            ("D", -18.93, 47.55),
        ]:
            self.arrets[nom] = Arret.objects.create(nom=nom, latitude=lat, longitude=lng)

        self.ligne1 = Ligne.objects.create(numero="1", nom="Ligne 1")
        self.ligne2 = Ligne.objects.create(numero="2", nom="Ligne 2")

        for ordre, nom in enumerate(["A", "B", "C"], start=1):
            LigneArret.objects.create(ligne=self.ligne1, arret=self.arrets[nom], ordre=ordre)
        for ordre, nom in enumerate(["B", "D"], start=1):
            LigneArret.objects.create(ligne=self.ligne2, arret=self.arrets[nom], ordre=ordre)

        self.algo = AlgorithmeSearchOptimized()

    def test_cas1_un_seul_bus(self):
        resultat = self.algo.calculer_trajet(self.arrets["A"].id, self.arrets["C"].id)
        self.assertTrue(resultat["direct"])
        self.assertEqual(resultat["nb_changements"], 0)
        self.assertEqual(resultat["distance_marche_km"], 0)
        self.assertEqual(len(resultat["lignes"]), 1)

    def test_cas2_correspondance_sans_marche_depart_arrivee(self):
        resultat = self.algo.calculer_trajet(self.arrets["A"].id, self.arrets["D"].id)
        self.assertEqual(resultat["nb_changements"], 1)
        self.assertFalse(any(etape.get("mode") == "walk" for etape in resultat["arrets"]))

    def test_cas3_trajet_indisponible(self):
        arret_iso = Arret.objects.create(nom="Z", latitude=-19.0, longitude=47.6)
        with self.assertRaises(TrajetIntrouvable):
            self.algo.calculer_trajet(arret_iso.id, self.arrets["A"].id)
