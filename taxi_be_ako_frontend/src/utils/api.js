import { isValidLatLng, appendPositions, isAcceptableRoutedLeg } from './geo';

export const ROUTING_SERVICE_URL = 'https://router.project-osrm.org/route/v1/driving';

export function buildApiError(error, fallback = 'Erreur API') {
  if (error?.name === 'TypeError') {
    return "Backend Django indisponible. Demarrez Django sur http://127.0.0.1:8000 puis rechargez les donnees.";
  }
  return error?.message || fallback;
}

export async function api(path, options) {
  let response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    });
  } catch (error) {
    error.name = 'TypeError';
    throw error;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.detail || `Erreur API ${response.status}`);
  }
  return payload;
}

export async function fetchRoadRouteLeg(fromPosition, toPosition, signal) {
  const coords = [fromPosition, toPosition].map(([lat, lng]) => `${lng},${lat}`).join(';');
  const response = await fetch(`${ROUTING_SERVICE_URL}/${coords}?overview=full&geometries=geojson&steps=false`, { signal });
  if (!response.ok) throw new Error(`Routing API ${response.status}`);

  const payload = await response.json();
  const routeCoords = payload.routes?.[0]?.geometry?.coordinates || [];
  const routedPositions = routeCoords
    .map(([lng, lat]) => {
      const pos = [lat, lng];
      return pos[0] >= -90 && pos[0] <= 90 && pos[1] >= -180 && pos[1] <= 180 ? pos : null;
    })
    .filter(Boolean);

  if (
    routedPositions.length > 1 &&
    isAcceptableRoutedLeg(fromPosition, toPosition, routedPositions)
  ) {
    return routedPositions;
  }

  return [fromPosition, toPosition];
}


export async function fetchRoadRoutePositions(positions, signal) {
  const validPositions = positions.filter(isValidLatLng);
  if (validPositions.length < 2) return validPositions;

  const routedPositions = [];
  for (let index = 0; index < validPositions.length - 1; index += 1) {
    const legPositions = await fetchRoadRouteLeg(
      validPositions[index],
      validPositions[index + 1],
      signal
    );
    appendPositions(routedPositions, legPositions);
  }

  return routedPositions.length > 1 ? routedPositions : validPositions;
}
