import {
  normalizeTracePoint,
  orientTraceBetweenStops,
  smoothTraceProgress,
  appendPositions,
} from './geo';
import { getLineStops, getLineStopIndex, findFullLine } from './lines';

export function getSegmentPositions(segment, arrets) {
  return segment.stops
    .map((s) => getStopPosition(s.arret, arrets))
    .filter((pos) => pos !== null);
}

/** Coordonnées synchronisées : priorité à la liste arrets (API), puis champs embarqués. */
export function resolveStopCoords(stop, arrets = []) {
  if (!stop) return null;

  let synced = null;
  if (stop.id) {
    synced = arrets.find((a) => a.id === stop.id);
  }
  if (!synced && stop.nom) {
    const nom = stop.nom.toLowerCase();
    synced = arrets.find((a) => a.nom && a.nom.toLowerCase() === nom);
  }

  const base = synced ? { ...synced, nom: synced.nom || stop?.nom } : stop;
  const lat = base.lat ?? base.latitude;
  const lng = base.lng ?? base.longitude;

  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return [lat, lng];
  }
  return null;
}

export function getStopPosition(stop, arrets) {
  return resolveStopCoords(stop, arrets);
}

export function getLinePositions(line, arrets) {
  return (line?.arrets || [])
    .map(item => getStopPosition(item.arret || item, arrets))
    .filter(pos => pos !== null);
}

export function getLineRouteData(line, arrets) {
  const stops = line?.arrets || [];
  const positions = [];
  let hasTrace = false;

  stops.forEach((item, index) => {
    const stopPosition = getStopPosition(item.arret || item, arrets);
    if (stopPosition) appendPositions(positions, [stopPosition]);

    if (index >= stops.length - 1) return;
    const nextStopPosition = getStopPosition(stops[index + 1].arret || stops[index + 1], arrets);
    const tracePositions = Array.isArray(item.trace)
      ? item.trace.map(normalizeTracePoint).filter(Boolean)
      : [];
    const orientedTrace = smoothTraceProgress(
      orientTraceBetweenStops(tracePositions, stopPosition, nextStopPosition),
      stopPosition,
      nextStopPosition
    );
    if (orientedTrace.length > 1) hasTrace = true;
    appendPositions(positions, orientedTrace);
  });

  return {
    positions: positions.length ? positions : getLinePositions(line, arrets),
    hasTrace,
  };
}

export function getLineRoutePositions(line, arrets) {
  return getLineRouteData(line, arrets).positions;
}

export function getSegmentRoutePositions(segment, arrets, lignes = []) {
  return getSegmentRouteData(segment, arrets, lignes).positions;
}

export function getSegmentRouteData(segment, arrets, lignes = []) {
  if (segment.mode === 'walk') {
    return {
      positions: [getStopPosition(segment.from, arrets), getStopPosition(segment.to, arrets)].filter(Boolean),
      hasTrace: true,
    };
  }

  const basePositions = (segment.stops || [])
    .map((s) => getStopPosition(s.arret, arrets))
    .filter(Boolean);
  const fullLine = findFullLine(segment.line, lignes);
  const lineStops = getLineStops(fullLine);
  if (!fullLine || !lineStops.length || (segment.stops || []).length < 2) {
    return { positions: basePositions, hasTrace: false };
  }

  const firstIdx = getLineStopIndex(fullLine, segment.stops[0]?.arret);
  const lastIdx = getLineStopIndex(fullLine, segment.stops[segment.stops.length - 1]?.arret);
  if (firstIdx < 0 || lastIdx < 0) {
    return { positions: basePositions, hasTrace: false };
  }

  // IMPORTANT: on doit construire les positions dans le sens réel du trajet.
  // En particulier, le fait de calculer dans le sens "croissant" puis de faire un reverse global
  // peut provoquer des inversions locales (effet "rebrousse chemin") car l'orientation de trace
  // dépend des couples (from -> to) successifs.
  const sliceStart = Math.min(firstIdx, lastIdx);
  const sliceEnd = Math.max(firstIdx, lastIdx);
  const slicedStops = lineStops.slice(sliceStart, sliceEnd + 1);
  const travelingBackward = firstIdx > lastIdx;
  if (travelingBackward) slicedStops.reverse();

  const slicedLine = {
    ...fullLine,
    arrets: slicedStops,
  };
  const routeData = getLineRouteData(slicedLine, arrets);
  return {
    positions: routeData.positions,
    hasTrace: routeData.hasTrace,
  };
}

export function getTripPositions(trajet, arrets) {
  if (!trajet) return [];

  const steps = trajet.arrets?.length
    ? trajet.arrets.map((step) => step.arret).filter(Boolean)
    : [];

  const endpoints = [trajet.depart, trajet.arrivee].filter(Boolean);
  const ordered = steps.length ? steps : endpoints;

  const seen = new Set();
  const positions = [];

  [...ordered, ...endpoints].forEach((stop) => {
    const key = stop.id ? `id:${stop.id}` : stop.nom ? `nom:${stop.nom.toLowerCase()}` : null;
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    const pos = resolveStopCoords(stop, arrets);
    if (pos) positions.push(pos);
  });

  return positions;
}
