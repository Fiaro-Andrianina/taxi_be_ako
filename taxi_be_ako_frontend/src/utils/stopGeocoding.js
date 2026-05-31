/**
 * Alignement des arrêts sur les marqueurs bus OpenStreetMap (carte Leaflet).
 * Miroir de transport/services/stop_geocoding.py
 */

import { api } from './api';

const TANA_CENTER = [-18.908, 47.522];

const TANA_QUARTIERS = {
  '67 ha': [-18.901158, 47.509165],
  '67ha': [-18.901158, 47.509165],
  analakely: [-18.904096, 47.521574],
  anosy: [-18.91982, 47.520117],
  mahamasina: [-18.91894, 47.524224],
  ivandry: [-18.86923, 47.528121],
  ankorondrano: [-18.889419, 47.522541],
  ambohijatovo: [-18.91004, 47.52856],
  ambanidia: [-18.919377, 47.538257],
  tanjombato: [-18.954453, 47.529021],
  amboditsiry: [-18.886345, 47.539482],
  antanimena: [-18.896965, 47.521152],
  andohananalakely: [-18.904096, 47.521574],
  ampandrana: [-18.8802, 47.5318],
  ampefiloha: [-18.9145, 47.5268],
  ambodivona: [-18.9068, 47.5245],
  ambohimanarina: [-18.8605, 47.4785],
  andoharanofotsy: [-18.8955, 47.5485],
  andravoahangy: [-18.898577, 47.530833],
  ankadifotsy: [-18.9255, 47.5125],
  ankatso: [-18.9125, 47.5355],
  antohomadinika: [-18.9142, 47.5318],
  besarety: [-18.9025, 47.5195],
  faravohitra: [-18.9055, 47.5355],
  isoraka: [-18.913, 47.528],
  isotry: [-18.9196, 47.5178],
  itaosy: [-18.924, 47.5072],
  andavamamba: [-18.92, 47.5182],
  soanierana: [-18.9322, 47.54],
  tsimbazaza: [-18.9318, 47.5258],
  rova: [-18.9088, 47.534],
  vasakosy: [-18.9195, 47.5105],
  morondava: [-18.921, 47.5055],
  fasankarana: [-18.946154, 47.516431],
  ambodimita: [-18.865569, 47.486222],
  ambohidroa: [-18.9075, 47.5378],
  mausolee: [-18.91167, 47.54667],
  ampasapito: [-18.896627, 47.545835],
  antanetibe: [-18.83399, 47.464285],
};

const BBOX = { south: -19.05, west: 47.45, north: -18.8, east: 47.6 };

const STOP_WORDS = new Set([
  'centre', 'bas', 'nord', 'sud', 'est', 'ouest', 'ha', 'arret', 'bus', 'taxi',
  'brousse', 'pharmacie', 'poste', 'pompe', 'garage', 'college', 'clinique',
  'gare', 'station', 'terminus', 'ligne',
]);

let cachedOsmIndex = null;

function norm(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(name) {
  return new Set(
    norm(name)
      .split(' ')
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t))
  );
}

function distM(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) * 111000;
}

function inBbox(lat, lng) {
  return lat >= BBOX.south && lat <= BBOX.north && lng >= BBOX.west && lng <= BBOX.east;
}

function extractQuartierKeys(stopName) {
  const n = norm(stopName);
  const found = [];
  Object.keys(TANA_QUARTIERS).forEach((key) => {
    if (n.includes(key) || (key.length >= 5 && n.replace(/\s/g, '').includes(key.replace(/\s/g, '')))) {
      found.push({ key, len: key.length });
    }
  });
  found.sort((a, b) => b.len - a.len);
  return found.map((f) => f.key);
}

function scoreFuzzy(arretNorm, osmNorm, arretTok, osmTok) {
  if (arretNorm === osmNorm) return 100;
  if (arretNorm.includes(osmNorm) || osmNorm.includes(arretNorm)) {
    const shorter = Math.min(arretNorm.length, osmNorm.length);
    const longer = Math.max(arretNorm.length, osmNorm.length);
    if (shorter / longer >= 0.55) return 80;
  }
  const shared = [...arretTok].filter((t) => osmTok.has(t));
  if (!shared.length) return 0;
  if (shared.length >= 2) return 60 + 10 * shared.length;
  if (shared.length === 1) {
    const word = shared[0];
    if (word.length >= 6 && arretNorm.includes(word) && osmNorm.includes(word)) {
      return arretNorm.startsWith(word) ? 55 : 50;
    }
  }
  return 0;
}

function nearestOsmNear(osmIndex, center, quartierKey, maxRadiusM = 1500) {
  const nQuartier = quartierKey ? norm(quartierKey) : '';
  let best = null;

  Object.entries(osmIndex).forEach(([osmKey, items]) => {
    if (quartierKey && !osmKey.includes(nQuartier) && !nQuartier.split(' ').some((t) => t.length >= 5 && osmKey.includes(t))) {
      return;
    }
    items.forEach(([label, lat, lng]) => {
      if (!inBbox(lat, lng)) return;
      const d = distM([lat, lng], center);
      if (d > maxRadiusM) return;
      let score = d;
      if (nQuartier && norm(label).includes(nQuartier)) score -= 400;
      if (!best || score < best.score) {
        best = { lat, lng, source: `osm:${label}`, score };
      }
    });
  });

  return best ? [best.lat, best.lng, best.source] : null;
}

export function pickBestCoords(stopName, osmIndex) {
  const n = norm(stopName);
  if (!n || !osmIndex) return null;

  const quartiers = extractQuartierKeys(stopName);
  const primary = quartiers[0];

  if (primary && TANA_QUARTIERS[primary]) {
    const center = TANA_QUARTIERS[primary];
    const osmNear = nearestOsmNear(osmIndex, center, primary);
    if (osmNear) return osmNear;
    return [center[0], center[1], `quartier:${primary}`];
  }

  if (TANA_QUARTIERS[n]) {
    const center = TANA_QUARTIERS[n];
    const osmNear = nearestOsmNear(osmIndex, center, n);
    if (osmNear) return osmNear;
    return [center[0], center[1], `quartier:${n}`];
  }

  if (osmIndex[n]) {
    const items = osmIndex[n].filter(([, lat, lng]) => inBbox(lat, lng));
    if (items.length) {
      const [label, lat, lng] = items.reduce((best, item) =>
        (distM([item[1], item[2]], TANA_CENTER) < distM([best[1], best[2]], TANA_CENTER) ? item : best)
      );
      return [lat, lng, `osm:${label}`];
    }
  }

  const arretTok = tokens(stopName);
  let best = null;
  Object.entries(osmIndex).forEach(([osmKey, items]) => {
    const sc = scoreFuzzy(n, osmKey, arretTok, tokens(osmKey));
    if (sc < 50) return;
    items.forEach(([label, lat, lng]) => {
      if (!inBbox(lat, lng)) return;
      if (primary && !osmKey.includes(primary)) return;
      if (!best || sc > best.sc || (sc === best.sc && distM([lat, lng], TANA_CENTER) < distM([best.lat, best.lng], TANA_CENTER))) {
        best = { lat, lng, source: `osm~:${label}`, sc };
      }
    });
  });

  if (best && best.sc >= 50) return [best.lat, best.lng, best.source];
  return null;
}

function buildOsmIndexFromPayload(rawIndex) {
  const index = {};
  Object.entries(rawIndex || {}).forEach(([key, items]) => {
    index[key] = (items || []).map((item) => [item.nom, item.lat, item.lng]);
  });
  return index;
}

export async function fetchOsmBusStopIndex(forceRefresh = false) {
  if (!forceRefresh && cachedOsmIndex) return cachedOsmIndex;

  try {
    const payload = await api('/api/osm-bus-stops/');
    cachedOsmIndex = buildOsmIndexFromPayload(payload.index);
    return cachedOsmIndex;
  } catch {
    cachedOsmIndex = cachedOsmIndex || {};
    return cachedOsmIndex;
  }
}

export function resolveArretCoordinates(arret, osmIndex, options = {}) {
  const trustRadiusM = options.trustRadiusM ?? 250;
  const correctRadiusM = options.correctRadiusM ?? 800;

  if (!arret?.nom) return arret;

  const curLat = arret.lat ?? arret.latitude;
  const curLng = arret.lng ?? arret.longitude;
  const match = pickBestCoords(arret.nom, osmIndex);

  if (!match) {
    if (typeof curLat === 'number' && typeof curLng === 'number' && !Number.isNaN(curLat)) {
      return { ...arret, lat: curLat, lng: curLng, latitude: curLat, longitude: curLng };
    }
    const quartiers = extractQuartierKeys(arret.nom);
    const primary = quartiers[0];
    if (primary && TANA_QUARTIERS[primary]) {
      const [lat, lng] = TANA_QUARTIERS[primary];
      return {
        ...arret,
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        coords_corrigees: true,
        coord_source: `quartier:${primary}`,
      };
    }
    return arret;
  }

  const [osmLat, osmLng, source] = match;

  if (typeof curLat !== 'number' || typeof curLng !== 'number' || Number.isNaN(curLat)) {
    return {
      ...arret,
      lat: osmLat,
      lng: osmLng,
      latitude: osmLat,
      longitude: osmLng,
      coords_corrigees: true,
      coord_source: source,
    };
  }

  if (!inBbox(curLat, curLng)) {
    return {
      ...arret,
      lat: osmLat,
      lng: osmLng,
      latitude: osmLat,
      longitude: osmLng,
      coords_corrigees: true,
      coord_source: source,
    };
  }

  const delta = distM([curLat, curLng], [osmLat, osmLng]);
  if (delta <= trustRadiusM) {
    return { ...arret, lat: curLat, lng: curLng, latitude: curLat, longitude: curLng, coord_source: 'db_ok' };
  }
  if (source.startsWith('osm') && delta > trustRadiusM) {
    return {
      ...arret,
      lat: osmLat,
      lng: osmLng,
      latitude: osmLat,
      longitude: osmLng,
      coords_corrigees: true,
      coord_source: source,
    };
  }
  if (delta >= correctRadiusM) {
    return {
      ...arret,
      lat: osmLat,
      lng: osmLng,
      latitude: osmLat,
      longitude: osmLng,
      coords_corrigees: true,
      coord_source: source,
    };
  }

  return { ...arret, lat: curLat, lng: curLng, latitude: curLat, longitude: curLng, coord_source: 'db' };
}

/** Aligne tous les arrêts sur les positions bus OSM (priorité carte Leaflet). */
export function alignArretsList(arrets, osmIndex) {
  return (arrets || []).map((arret) => resolveArretCoordinates(arret, osmIndex));
}

/** @deprecated Utiliser alignArretsList — conservé pour compatibilité. */
export function correctStopCoordinates(arret) {
  return resolveArretCoordinates(arret, null);
}

/** @deprecated Utiliser alignArretsList */
export function correctArretsList(arrets) {
  return (arrets || []).map(correctStopCoordinates);
}
