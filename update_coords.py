#!/usr/bin/env python3
"""
Script to update bus stop coordinates using OpenStreetMap Nominatim.
Fetches all stops from the backend, queries Nominatim for each stop name,
and updates the stop if the coordinates differ significantly.
"""

import json
import time
import sys
from urllib import request, parse, error
import http.cookiejar

# Backend API base URL
BASE_URL = "http://127.0.0.1:8000"
# Nominatim API URL
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Delay between Nominatim requests (to be respectful)
DELAY = 1.0  # seconds
# Threshold for updating (degrees)
THRESHOLD = 0.001  # about 100 meters

def build_opener():
    """Build an opener that handles cookies."""
    cookie_jar = http.cookiejar.CookieJar()
    return request.build_opener(request.HTTPCookieProcessor(cookie_jar))

def fetch_json(opener, url, data=None, headers=None, method='GET'):
    """Fetch JSON from a URL using the given opener."""
    if headers is None:
        headers = {}
    # Add default headers that the frontend uses
    headers.update({
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    })
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with opener.open(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
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
    """Log in to the backend and return True if successful."""
    url = f"{BASE_URL}/api/login/"
    # LoginView.js does NOT use X-Requested-With header for login
    login_headers = {'Content-Type': 'application/json'}
    data = json.dumps({'username': username, 'password': password}).encode()
    try:
        with opener.open(request.Request(url, data=data, headers=login_headers, method='POST'), timeout=30) as resp:
            # Read response to ensure login succeeded
            resp_data = json.loads(resp.read().decode('utf-8'))
            if 'user' in resp_data:
                print(f"Logged in as {resp_data['user'].get('username', 'unknown')}")
                return True
            else:
                print("Login failed: no user in response", file=sys.stderr)
                return False
    except error.HTTPError as e:
        print(f"HTTP error {e.code} for login: {e.reason}", file=sys.stderr)
        return False
    except error.URLError as e:
        print(f"URL error for login: {e.reason}", file=sys.stderr)
        return False
    except json.JSONDecodeError as e:
        print(f"JSON decode error for login: {e}", file=sys.stderr)
        return False

def get_stops(opener):
    """Fetch all stops from the backend."""
    url = f"{BASE_URL}/api/arrets/"
    stops = fetch_json(opener, url)
    if stops is None:
        print("Failed to fetch stops from backend.", file=sys.stderr)
        sys.exit(1)
    return stops

def update_stop(opener, stop_id, latitude, longitude):
    """Update a stop via PATCH."""
    url = f"{BASE_URL}/api/arrets/{stop_id}/"
    payload = {
        "latitude": latitude,
        "longitude": longitude
    }
    data = json.dumps(payload).encode()
    result = fetch_json(opener, url, data=data, method='PATCH')
    if result is None:
        print(f"Failed to update stop {stop_id}", file=sys.stderr)
        return False
    return True

# Arrêts bus OSM de référence (Antananarivo) — alignés avec charger_donnees_demo.py
OSM_BUS_STOPS = {
    "67 Ha": (-18.901158, 47.509165),
    "Analakely": (-18.904096, 47.521574),
    "Anosy": (-18.919820, 47.520117),
    "Mahamasina": (-18.918940, 47.524224),
    "Ivandry": (-18.869230, 47.528121),
    "Ankorondrano": (-18.889419, 47.522541),
    "Ambohijatovo": (-18.910040, 47.528560),
    "Ambanidia": (-18.919377, 47.538257),
    "Tanjombato": (-18.954453, 47.529021),
}


def query_osm_reference(stop_name):
    """Return known OSM bus_stop coordinates if the stop name matches."""
    key = stop_name.strip()
    if key in OSM_BUS_STOPS:
        return OSM_BUS_STOPS[key]
    lower = key.lower()
    for name, coords in OSM_BUS_STOPS.items():
        if lower in name.lower() or name.lower() in lower:
            return coords
    return None


def query_nominatim(stop_name):
    """Query Nominatim for a stop name in Antananarivo, Madagascar."""
    ref = query_osm_reference(stop_name)
    if ref:
        return ref
    query = f"arrêt bus {stop_name}, Antananarivo, Madagascar"
    params = {
        'q': query,
        'format': 'json',
        'limit': 1,
        'addressdetails': 1
    }
    url = f"{NOMINATIM_URL}?{parse.urlencode(params)}"
    req = request.Request(url, headers={
        'User-Agent': 'TaxiBeAko/1.0 (https://github.com/yourname/taxi_be_ako)'
    })
    try:
        with request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except error.HTTPError as e:
        print(f"HTTP error {e.code} for Nominatim query: {e.reason}", file=sys.stderr)
        return None
    except error.URLError as e:
        print(f"URL error for Nominatim query: {e.reason}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"JSON decode error for Nominatim query: {e}", file=sys.stderr)
        return None
    if data is None or len(data) == 0:
        return None
    # Take the first result
    result = data[0]
    try:
        lat = float(result['lat'])
        lon = float(result['lon'])
        return lat, lon
    except (KeyError, ValueError, TypeError) as e:
        print(f"Error parsing Nominatim result for '{stop_name}': {e}", file=sys.stderr)
        return None

def main():
    print("Building opener with cookie handling...")
    opener = build_opener()

    print("Logging in to backend...")
    # Use demo credentials as seen in the login view footer
    if not login(opener, "admin", "admin123"):
        print("Could not log in. Check credentials or backend availability.", file=sys.stderr)
        sys.exit(1)

    print("Fetching stops from backend...")
    stops = get_stops(opener)
    print(f"Fetched {len(stops)} stops.")

    updated = 0
    skipped = 0
    errors = 0

    for stop in stops:
        stop_id = stop.get('id')
        stop_name = stop.get('nom')
        current_lat = stop.get('lat')
        current_lng = stop.get('lng')

        if not stop_id or not stop_name:
            print(f"Skipping stop with missing id or name: {stop}", file=sys.stderr)
            skipped += 1
            continue

        # If current coordinates are missing, we might want to update anyway
        if current_lat is None or current_lng is None:
            print(f"Stop {stop_name} (id: {stop_id}) has missing coordinates, will attempt to fetch.")
        else:
            # Check if current coordinates are valid numbers
            try:
                current_lat = float(current_lat)
                current_lng = float(current_lng)
            except (ValueError, TypeError):
                print(f"Stop {stop_name} (id: {stop_id}) has invalid coordinates, will attempt to fetch.")
                current_lat = None
                current_lng = None

        # Query OSM reference table, then Nominatim
        print(f"Resolving coordinates for: {stop_name}")
        coords = query_nominatim(stop_name)
        if coords is None:
            print(f"  -> No results from Nominatim for '{stop_name}'")
            skipped += 1
            time.sleep(DELAY)
            continue

        lat, lon = coords
        print(f"  -> Nominatim returned: ({lat}, {lon})")

        # If we have current coordinates, check the difference
        if current_lat is not None and current_lng is not None:
            diff_lat = abs(lat - current_lat)
            diff_lon = abs(lon - current_lng)
            if diff_lat < THRESHOLD and diff_lon < THRESHOLD:
                print(f"  -> Coordinates are close enough (diff lat: {diff_lat:.6f}, diff lon: {diff_lon:.6f}). Skipping update.")
                skipped += 1
                time.sleep(DELAY)
                continue
            else:
                print(f"  -> Coordinates differ (diff lat: {diff_lat:.6f}, diff lon: {diff_lon:.6f}). Updating...")
        else:
            print(f"  -> Current coordinates missing or invalid. Updating...")

        # Update the stop
        if update_stop(opener, stop_id, lat, lon):
            print(f"  -> Successfully updated stop {stop_id} ({stop_name}) to ({lat}, {lon})")
            updated += 1
        else:
            print(f"  -> Failed to update stop {stop_id}", file=sys.stderr)
            errors += 1

        # Be respectful to Nominatim
        time.sleep(DELAY)

    print("\n=== Summary ===")
    print(f"Stops processed: {len(stops)}")
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")
    print(f"Errors: {errors}")

if __name__ == "__main__":
    main()