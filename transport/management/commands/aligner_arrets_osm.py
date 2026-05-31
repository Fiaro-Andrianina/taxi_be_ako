"""
Aligne les coordonnées des arrêts sur les marqueurs bus OpenStreetMap et les noms de quartiers.
"""
from django.core.management.base import BaseCommand

from transport.models import Arret
from transport.services.stop_geocoding import (
    dist_m,
    get_osm_index,
    in_bbox,
    pick_best_coords,
    resolve_arret_coordinates,
)


def needs_correction(arret, lat, lng, seuil):
    if arret.latitude is None or arret.longitude is None:
        return True
    cur_lat = float(arret.latitude)
    cur_lng = float(arret.longitude)
    if not in_bbox(cur_lat, cur_lng):
        return True
    if abs(cur_lat) < 0.01 and abs(cur_lng) < 0.01:
        return True
    return abs(cur_lat - lat) >= seuil or abs(cur_lng - lng) >= seuil


class Command(BaseCommand):
    help = (
        "Aligne latitude/longitude des arrets sur OSM (bus_stop) "
        "et les quartiers d'Antananarivo (ex. Ampandrana -> Ampandrana)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--seuil", type=float, default=0.0003)
        parser.add_argument(
            "--nominatim",
            action="store_true",
            help="Utilise Nominatim pour les arrets sans correspondance OSM.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force la mise a jour meme si deja proche.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        seuil = options["seuil"]
        use_nominatim = options["nominatim"]
        force = options["force"]

        self.stdout.write("Telechargement des arrets bus OSM...")
        try:
            osm_index = get_osm_index(force_refresh=True)
        except Exception as exc:
            self.stderr.write(self.style.ERROR(str(exc)))
            return

        self.stdout.write(f"{len(osm_index)} noms OSM indexes.")

        updated = 0
        skipped = 0
        not_found = 0

        for arret in Arret.objects.all().order_by("nom"):
            match = pick_best_coords(arret.nom, osm_index, use_nominatim=use_nominatim)
            if not match:
                lat, lng, corrected, source = resolve_arret_coordinates(
                    arret.nom,
                    arret.latitude,
                    arret.longitude,
                    osm_index=osm_index,
                    use_nominatim=use_nominatim,
                )
                if not corrected and source in ("db", "db_ok"):
                    skipped += 1
                    continue
                if source == "none":
                    not_found += 1
                    continue
                match = (lat, lng, source)
            else:
                lat, lng, source = match

            if not needs_correction(arret, lat, lng, seuil) and not force:
                skipped += 1
                continue

            cur_lat = float(arret.latitude or 0)
            cur_lng = float(arret.longitude or 0)
            delta_m = dist_m((cur_lat, cur_lng), (lat, lng)) if cur_lat else 0
            self.stdout.write(
                f"  {arret.nom}: ({cur_lat:.6f},{cur_lng:.6f}) "
                f"-> ({lat:.6f},{lng:.6f}) [{source}] ~{delta_m:.0f}m"
            )
            if not dry_run:
                arret.latitude = lat
                arret.longitude = lng
                arret.save(update_fields=["latitude", "longitude"])
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Termine: {updated} mis a jour, {skipped} deja OK, {not_found} sans correspondance."
            )
        )
        if dry_run:
            self.stdout.write(self.style.WARNING("Mode dry-run: aucune modification en base."))
