#!/usr/bin/env python3
"""
Propose des corrections de position pour les arrêts et applique les changements si demandé.

Usage:
  python scripts/suggest_and_apply_stop_fixes.py [--apply] [--use-nominatim]

Le script récupère la liste des arrêts via l'API backend `/api/arrets/`, calcule
la meilleure position via `transport.services.stop_geocoding.resolve_arret_coordinates`
et affiche les candidats dont la position serait corrigée. Avec `--apply` il envoie
des PATCH vers l'API pour mettre à jour les coordonnées.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from urllib import request, parse, error
import http.cookiejar
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

try:
    from transport.services import stop_geocoding
except Exception:
    # Avoid importing the package which may initialize Django apps.
    import importlib.util
    sg_path = os.path.join(ROOT, "transport", "services", "stop_geocoding.py")
    spec = importlib.util.spec_from_file_location("stop_geocoding", sg_path)
    stop_geocoding = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(stop_geocoding)

BASE_URL = os.environ.get("TBA_BASE_URL", "http://127.0.0.1:8000")
DELAY = 1.0


def build_opener():
    cj = http.cookiejar.CookieJar()
    return request.build_opener(request.HTTPCookieProcessor(cj))


def fetch_json(opener, url, data=None, headers=None, method='GET'):
    if headers is None:
        headers = {}
    headers.update({'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest'})
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with opener.open(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except error.HTTPError as e:
        print(f"HTTP error {e.code} for {url}: {e.reason}", file=sys.stderr)
        return None
    except error.URLError as e:
        print(f"URL error for {url}: {e.reason}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"JSON decode error for {url}: {e}", file=sys.stderr)
        return None


def login(opener, username, password):
    url = f"{BASE_URL}/api/login/"
    data = json.dumps({'username': username, 'password': password}).encode()
    try:
        with opener.open(request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST'), timeout=30) as resp:
            resp_data = json.loads(resp.read().decode('utf-8'))
            return 'user' in resp_data
    except Exception as e:
        print(f"Login failed: {e}", file=sys.stderr)
        return False


def get_stops(opener):
    url = f"{BASE_URL}/api/arrets/"
    return fetch_json(opener, url)


def patch_stop(opener, stop_id, lat, lng):
    url = f"{BASE_URL}/api/arrets/{stop_id}/"
    payload = {'latitude': lat, 'longitude': lng}
    data = json.dumps(payload).encode()
    return fetch_json(opener, url, data=data, method='PATCH')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true', help='Appliquer les corrections via PATCH')
    parser.add_argument('--use-nominatim', action='store_true', help='Autoriser Nominatim en dernier recours')
    parser.add_argument('--username', default='admin')
    parser.add_argument('--password', default='admin123')
    args = parser.parse_args()

    opener = build_opener()
    print('Login...')
    if not login(opener, args.username, args.password):
        print('Échec de la connexion au backend. Vérifiez que le backend est en marche et les identifiants.', file=sys.stderr)
        sys.exit(1)

    print('Récupération des arrêts...')
    stops = get_stops(opener)
    if stops is None:
        print('Impossible de récupérer la liste des arrêts.', file=sys.stderr)
        sys.exit(1)

    osm_index = None
    try:
        osm_index = stop_geocoding.get_osm_index()
    except Exception:
        osm_index = {}

    candidates = []
    for s in stops:
        stop_id = s.get('id')
        nom = s.get('nom') or s.get('name') or ''
        lat = s.get('lat') if 'lat' in s else s.get('latitude')
        lng = s.get('lng') if 'lng' in s else s.get('longitude')
        print(f"Analyse: id={stop_id} nom='{nom}'")
        try:
            res = stop_geocoding.resolve_arret_coordinates(nom, lat, lng, osm_index=osm_index, use_nominatim=args.use_nominatim)
        except Exception as e:
            print(f"  -> erreur résolution: {e}")
            continue
        new_lat, new_lng, corrected, source = res
        if corrected:
            dlat = (float(new_lat) - float(lat)) if lat is not None else None
            dlng = (float(new_lng) - float(lng)) if lng is not None else None
            candidates.append({'id': stop_id, 'nom': nom, 'old': (lat, lng), 'new': (new_lat, new_lng), 'delta': (dlat, dlng), 'source': source})
            print(f"  -> Proposition: {new_lat:.6f}, {new_lng:.6f} (source: {source})")
        else:
            print("  -> Position conservée")
        time.sleep(0.05)

    if not candidates:
        print('\nAucune correction proposée.')
        return

    print('\nCorrections proposées:')
    for c in candidates:
        print(f"- id={c['id']} nom='{c['nom']}' old={c['old']} -> new={c['new']} source={c['source']}")

    if args.apply:
        print('\nApplication des corrections...')
        updated = 0
        for c in candidates:
            sid = c['id']
            lat, lng = c['new']
            ok = patch_stop(opener, sid, lat, lng)
            if ok is not None:
                print(f"  -> id={sid} mis à jour.")
                updated += 1
            else:
                print(f"  -> id={sid} ÉCHEC.")
            time.sleep(DELAY)
        print(f"\nTerminé. Mis à jour: {updated}/{len(candidates)}")
    else:
        print('\nExécutez avec `--apply` pour appliquer ces changements.')


if __name__ == '__main__':
    main()
