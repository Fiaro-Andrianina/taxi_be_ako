"""
Géocodage des arrêts Taxi be Ako : quartiers d'Antananarivo + marqueurs bus OSM.

Si un arrêt s'appelle « Ampandrana », les coordonnées doivent être à Ampandrana,
en priorité sur un bus_stop OSM du même nom, sinon sur le centre du quartier.
"""
from __future__ import annotations

import json
import math
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_MIRROR = "https://overpass.kumi.systems/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "TaxiBeAko/1.0 (stop_geocoding Antananarivo)"

BBOX = (-19.05, 47.45, -18.80, 47.60)
TANA_CENTER = (-18.908, 47.522)
MAX_DIST_M = 14_000
NOMINATIM_DELAY = 1.1

# Centres de quartiers / lieux (référence OSM + vérifications manuelles)
TANA_QUARTIERS: dict[str, tuple[float, float]] = {
    "67 ha": (-18.901158, 47.509165),
    "67ha": (-18.901158, 47.509165),
    "analakely": (-18.904096, 47.521574),
    "anosy": (-18.919820, 47.520117),
    "mahamasina": (-18.918940, 47.524224),
    "ivandry": (-18.869230, 47.528121),
    "ankorondrano": (-18.889419, 47.522541),
    "ambohijatovo": (-18.910040, 47.528560),
    "ambanidia": (-18.919377, 47.538257),
    "tanjombato": (-18.954453, 47.529021),
    "amboditsiry": (-18.886345, 47.539482),
    "antanimena": (-18.896965, 47.521152),
    "andohananalakely": (-18.904096, 47.521574),
    "ampandrana": (-18.880200, 47.531800),
    "ampefiloha": (-18.914500, 47.526800),
    "ambodivona": (-18.906800, 47.524500),
    "ambohimanarina": (-18.860500, 47.478500),
    "andoharanofotsy": (-18.895500, 47.548500),
    "andravoahangy": (-18.898577, 47.530833),
    "ankadifotsy": (-18.925500, 47.512500),
    "ankatso": (-18.912500, 47.535500),
    "antohomadinika": (-18.914200, 47.531800),
    "besarety": (-18.902500, 47.519500),
    "faravohitra": (-18.905500, 47.535500),
    "isoraka": (-18.913000, 47.528000),
    "isotry": (-18.919600, 47.517800),
    "itaosy": (-18.924000, 47.507200),
    "andavamamba": (-18.920000, 47.518200),
    "soanierana": (-18.932200, 47.540000),
    "tsimbazaza": (-18.931800, 47.525800),
    "rova": (-18.908800, 47.534000),
    "vasakosy": (-18.919500, 47.510500),
    "morondava": (-18.921000, 47.505500),
    "fasankarana": (-18.946154, 47.516431),
    "ambodimita": (-18.865569, 47.486222),
    "ambohidroa": (-18.907500, 47.537800),
    "mausolee": (-18.911670, 47.546670),
    "ampasapito": (-18.896627, 47.545835),
    "antanetibe": (-18.833990, 47.464285),
    "ankadindramamy": (-18.888500, 47.518500),
    "ankadikely": (-18.887200, 47.520100),
    "ankadivato": (-18.915500, 47.521500),
    "bemasoandro": (-18.892500, 47.534500),
    "betongolo": (-18.916800, 47.527500),
    "fiadanamanga": (-18.900500, 47.528500),
    "mahazoarivo": (-18.917500, 47.532500),
    "manakambahiny": (-18.903500, 47.525500),
    "namontana": (-18.875500, 47.515500),
    "sabotsy": (-18.928500, 47.542500),
    "scav": (-18.920800, 47.529800),
    "firaisana": (-18.918500, 47.534200),
    "jirama": (-18.931500, 47.540500),
    "paompy anosisoa": (-18.870229, 47.493593),
    "tanjona": (-18.920000, 47.538000),
}

STOP_WORDS = {
    "centre", "bas", "nord", "sud", "est", "ouest", "ha", "rm1", "rm2",
    "arret", "arrêt", "bus", "taxi", "brousse", "pharmacie", "poste",
    "pompe", "garage", "college", "clinique", "forello", "barrage", "gare",
    "station", "terminus", "rond", "point", "vers", "vers", "ligne",
}

_osm_index_cache: dict[str, list[tuple[str, float, float]]] | None = None
_osm_cache_at: float = 0.0
_OSM_CACHE_TTL = 3600 * 6


def norm(name: str | None) -> str:
    if not name:
        return ""
    s = name.lower().strip()
    s = re.sub(r"[''`]", " ", s)
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tokens(name: str) -> set[str]:
    return {t for t in norm(name).split() if len(t) >= 3 and t not in STOP_WORDS}


def dist_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1]) * 111_000


def in_bbox(lat: float, lng: float) -> bool:
    south, west, north, east = BBOX
    return south <= lat <= north and west <= lng <= east


def extract_quartier_keys(stop_name: str) -> list[str]:
    """Quartiers mentionnés dans le nom (plus long d'abord)."""
    n = norm(stop_name)
    if not n:
        return []
    found: list[tuple[int, str]] = []
    for key in TANA_QUARTIERS:
        if key in n or (len(key) >= 5 and key.replace(" ", "") in n.replace(" ", "")):
            found.append((len(key), key))
    found.sort(reverse=True)
    return [k for _, k in found]


def fetch_osm_bus_stops() -> dict[str, list[tuple[str, float, float]]]:
    south, west, north, east = BBOX
    query = f"""
[out:json][timeout:90];
(
  node["highway"="bus_stop"]({south},{west},{north},{east});
  node["public_transport"="platform"]["bus"="yes"]({south},{west},{north},{east});
);
out body;
"""
    data = None
    for url in (OVERPASS_URL, OVERPASS_MIRROR):
        try:
            req = urllib.request.Request(
                url,
                data=query.encode(),
                headers={"User-Agent": USER_AGENT},
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read())
            break
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
            data = None
    if not data:
        return {}

    index: dict[str, list[tuple[str, float, float]]] = {}
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        for key in ("name", "name:fr", "name:mg"):
            label = (tags.get(key) or "").strip()
            if not label:
                continue
            n = norm(label)
            index.setdefault(n, []).append((label, float(el["lat"]), float(el["lon"])))
    return index


def get_osm_index(force_refresh: bool = False) -> dict[str, list[tuple[str, float, float]]]:
    global _osm_index_cache, _osm_cache_at
    now = time.time()
    if (
        not force_refresh
        and _osm_index_cache is not None
        and (now - _osm_cache_at) < _OSM_CACHE_TTL
    ):
        return _osm_index_cache
    _osm_index_cache = fetch_osm_bus_stops()
    _osm_cache_at = now
    return _osm_index_cache


def query_nominatim(place_query: str) -> tuple[float, float, str] | None:
    params = urllib.parse.urlencode(
        {
            "q": place_query,
            "format": "json",
            "limit": 1,
            "countrycodes": "mg",
        }
    )
    req = urllib.request.Request(
        f"{NOMINATIM_URL}?{params}",
        headers={"User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    if not data:
        return None
    r = data[0]
    lat, lng = float(r["lat"]), float(r["lon"])
    if not in_bbox(lat, lng) or dist_m((lat, lng), TANA_CENTER) > MAX_DIST_M:
        return None
    return lat, lng, f"nominatim:{r.get('display_name', '')[:50]}"


def score_fuzzy(arret_norm: str, osm_norm: str, arret_tok: set[str], osm_tok: set[str]) -> int:
    if arret_norm == osm_norm:
        return 100
    if arret_norm in osm_norm or osm_norm in arret_norm:
        shorter = min(len(arret_norm), len(osm_norm))
        longer = max(len(arret_norm), len(osm_norm))
        if shorter / longer >= 0.55:
            return 80
    shared = arret_tok & osm_tok
    if not shared:
        return 0
    if len(shared) >= 2:
        return 60 + 10 * len(shared)
    if len(shared) == 1:
        word = next(iter(shared))
        if len(word) >= 6 and word in arret_norm and word in osm_norm:
            return 55 if arret_norm.startswith(word) else 50
    return 0


def nearest_osm_near(
    osm_index: dict[str, list[tuple[str, float, float]]],
    center: tuple[float, float],
    quartier_key: str | None,
    max_radius_m: float = 1500,
) -> tuple[float, float, str] | None:
    """Marqueur bus OSM le plus proche du quartier, de préférence avec le même nom."""
    n_quartier = norm(quartier_key) if quartier_key else ""
    best: tuple[float, float, str, float] | None = None

    for osm_key, items in osm_index.items():
        if quartier_key and n_quartier not in osm_key and not any(
            t in osm_key for t in n_quartier.split() if len(t) >= 5
        ):
            continue
        for label, lat, lng in items:
            if not in_bbox(lat, lng):
                continue
            d = dist_m((lat, lng), center)
            if d > max_radius_m:
                continue
            bonus = 0.0
            if n_quartier and n_quartier in norm(label):
                bonus = -400
            score = d + bonus
            if best is None or score < best[3]:
                best = (lat, lng, f"osm:{label}", score)

    if best:
        return best[0], best[1], best[2]
    return None


def pick_best_coords(
    stop_name: str,
    osm_index: dict[str, list[tuple[str, float, float]]],
    current: tuple[float, float] | None = None,
    use_nominatim: bool = False,
) -> tuple[float, float, str] | None:
    n = norm(stop_name)
    if not n:
        return None

    quartiers = extract_quartier_keys(stop_name)
    primary = quartiers[0] if quartiers else None

    if primary and primary in TANA_QUARTIERS:
        center = TANA_QUARTIERS[primary]
        osm_near = nearest_osm_near(osm_index, center, primary)
        if osm_near:
            return osm_near
        return center[0], center[1], f"quartier:{primary}"

    if n in TANA_QUARTIERS:
        center = TANA_QUARTIERS[n]
        osm_near = nearest_osm_near(osm_index, center, n)
        if osm_near:
            return osm_near
        return center[0], center[1], f"quartier:{n}"

    if n in osm_index:
        items = [(label, la, ln) for label, la, ln in osm_index[n] if in_bbox(la, ln)]
        if items:
            anchor = current if current is not None else TANA_CENTER
            label, lat, lng = min(items, key=lambda x: dist_m((x[1], x[2]), anchor))
            return lat, lng, f"osm:{label}"

    arret_tok = tokens(stop_name)
    best: tuple[float, float, str, int] | None = None
    for osm_key, items in osm_index.items():
        sc = score_fuzzy(n, osm_key, arret_tok, tokens(osm_key))
        if sc < 50:
            continue
        for label, lat, lng in items:
            if not in_bbox(lat, lng):
                continue
            if primary and primary not in osm_key:
                continue
            if best is None or sc > best[3] or (
                sc == best[3]
                and dist_m((lat, lng), TANA_CENTER) < dist_m((best[0], best[1]), TANA_CENTER)
            ):
                best = (lat, lng, f"osm~:{label}", sc)

    if best and best[3] >= 50:
        return best[0], best[1], best[2]

    if use_nominatim:
        time.sleep(NOMINATIM_DELAY)
        for query in (
            f"arrêt bus {stop_name}, Antananarivo, Madagascar",
            f"{primary or stop_name}, Antananarivo, Madagascar",
        ):
            if not query.strip():
                continue
            try:
                result = query_nominatim(query)
                if result:
                    return result
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError, ValueError, OSError):
                continue
    return None


def resolve_arret_coordinates(
    nom: str,
    latitude: float | None,
    longitude: float | None,
    *,
    osm_index: dict[str, list[tuple[str, float, float]]] | None = None,
    use_nominatim: bool = False,
    trust_radius_m: float = 250,
    correct_radius_m: float = 800,
) -> tuple[float, float, bool, str]:
    """
    Retourne (lat, lng, corrected, source).
    Ne remplace pas une position déjà proche d'un bon marqueur (calibration admin).
    """
    if osm_index is None:
        try:
            osm_index = get_osm_index()
        except (urllib.error.URLError, TimeoutError, OSError):
            osm_index = {}

    current_coords = None
    if latitude is not None and longitude is not None:
        current_coords = (float(latitude), float(longitude))
    match = pick_best_coords(
        nom,
        osm_index,
        current=current_coords,
        use_nominatim=use_nominatim,
    )
    if not match:
        if latitude is not None and longitude is not None:
            return float(latitude), float(longitude), False, "db"
        quartiers = extract_quartier_keys(nom)
        if quartiers and quartiers[0] in TANA_QUARTIERS:
            lat, lng = TANA_QUARTIERS[quartiers[0]]
            return lat, lng, True, f"quartier:{quartiers[0]}"
        return 0.0, 0.0, False, "none"

    lat, lng, source = match
    if latitude is None or longitude is None:
        return lat, lng, True, source

    cur = (float(latitude), float(longitude))
    if not in_bbox(cur[0], cur[1]):
        return lat, lng, True, source

    d_cur = dist_m(cur, (lat, lng))
    if d_cur <= trust_radius_m:
        return cur[0], cur[1], False, "db_ok"
    # Priorité aux marqueurs bus OSM visibles sur la carte Leaflet.
    if source.startswith("osm") and d_cur > trust_radius_m:
        return lat, lng, True, source
    if d_cur >= correct_radius_m:
        return lat, lng, True, source
    return cur[0], cur[1], False, "db"
