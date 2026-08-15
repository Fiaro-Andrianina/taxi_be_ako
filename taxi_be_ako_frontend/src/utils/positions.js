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

  // Dépaqueter les objets LigneArret (ex: { ordre, arret: { id, nom, lat, lng } })
  const resolved = stop.arret && (stop.ordre || stop.ordre === 0) ? stop.arret : stop;

  let synced = null;
  if (resolved.id) {
    synced = arrets.find((a) => a.id === resolved.id);
  }
  if (!synced && resolved.nom) {
    const nom = resolved.nom.toLowerCase();
    synced = arrets.find((a) => a.nom && a.nom.toLowerCase() === nom);
  }

  const base = synced ? { ...synced, nom: synced.nom || resolved?.nom } : resolved;
  const lat = Number(base.lat ?? base.latitude);
  const lng = Number(base.lng ?? base.longitude);

  if (
    isFinite(lat) && isFinite(lng) &&
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
  if (!fullLine || !lineStops.length) {
    return { positions: basePositions, hasTrace: basePositions.length >= 2 };
  }
  // Moins de 2 arrêts : essayer de compléter avec les arrêts de la ligne
  if ((segment.stops || []).length < 2) {
    // Si on a au moins 1 arrêt, essayer d'ajouter un arrêt adjacent sur la ligne
    if (segment.stops?.length === 1 && segment.stops[0]?.arret) {
      const firstStop = segment.stops[0].arret;
      const firstIdx = getLineStopIndex(fullLine, firstStop);
      if (firstIdx >= 0 && firstIdx < lineStops.length - 1) {
        // Essayer le prochain arrêt dans le sens normal de la ligne
        const nextStop = lineStops[firstIdx + 1]?.arret || lineStops[firstIdx + 1];
        const nextStopPos = getStopPosition(nextStop, arrets);
        if (nextStopPos) {
          const extendedPositions = [...basePositions, nextStopPos];
          return { positions: extendedPositions, hasTrace: false };
        }
      }
    }
    return { positions: basePositions, hasTrace: false };
  }

  const firstIdx = getLineStopIndex(fullLine, segment.stops[0]?.arret);
  const lastIdx = getLineStopIndex(fullLine, segment.stops[segment.stops.length - 1]?.arret);
  if (firstIdx < 0 || lastIdx < 0) {
    // Indexation impossible : essayer par nom d'arrêt
    const firstStop = segment.stops[0]?.arret;
    const lastStop = segment.stops[segment.stops.length - 1]?.arret;
    const firstStopName = firstStop?.nom?.toLowerCase();
    const lastStopName = lastStop?.nom?.toLowerCase();

    let useFirstIdx = firstIdx;
    let useLastIdx = lastIdx;

    if (firstStopName && lastStopName) {
      const lineStopNames = lineStops.map(s => (s.arret || s)?.nom?.toLowerCase()).filter(Boolean);
      if (useFirstIdx < 0) useFirstIdx = lineStopNames.indexOf(firstStopName);
      if (useLastIdx < 0) useLastIdx = lineStopNames.indexOf(lastStopName);
    }

    // Les deux indices trouvés (par ID ou par nom) → découpe normale
    if (useFirstIdx >= 0 && useLastIdx >= 0) {
      const sliceStart = Math.min(useFirstIdx, useLastIdx);
      const sliceEnd = Math.max(useFirstIdx, useLastIdx);
      const slicedStops = lineStops.slice(sliceStart, sliceEnd + 1);
      const travelingBackward = useFirstIdx > useLastIdx;
      if (travelingBackward) slicedStops.reverse();

      const slicedLine = {
        ...fullLine,
        arrets: slicedStops,
      };
      const routeData = getLineRouteData(slicedLine, arrets);
      return {
        positions: routeData.positions.length >= 2 ? routeData.positions : basePositions,
        hasTrace: routeData.hasTrace || basePositions.length >= 2,
      };
    }

    // Si le premier arrêt n'est pas sur la ligne (ex: correspondance),
    // on ne peut pas utiliser la trace de la ligne — elle commencerait
    // au mauvais endroit. On laisse le OSRM/sliced-fallback gérer.
    if (useFirstIdx < 0 && useLastIdx >= 0) {
      return { positions: basePositions, hasTrace: false };
    }

    // Un seul indice trouvé (le premier arrêt uniquement) :
    // découper depuis l'arrêt trouvé jusqu'à la fin de la ligne.
    if (useFirstIdx >= 0 || useLastIdx >= 0) {
      const sliceA = useFirstIdx >= 0 ? Math.max(0, useFirstIdx - 2) : 0;
      const sliceB = useLastIdx >= 0 ? Math.min(lineStops.length - 1, useLastIdx + 2) : lineStops.length - 1;
      const slStart = Math.min(sliceA, sliceB);
      const slEnd = Math.max(sliceA, sliceB);
      const slicedStops = lineStops.slice(slStart, slEnd + 1);
      const sLine = { ...fullLine, arrets: slicedStops };
      const rd = getLineRouteData(sLine, arrets);
      if (rd.positions.length >= 2) {
        return { positions: rd.positions, hasTrace: rd.hasTrace };
      }
    }

    // Aucun fallback possible → ligne droite entre les arrêts
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
