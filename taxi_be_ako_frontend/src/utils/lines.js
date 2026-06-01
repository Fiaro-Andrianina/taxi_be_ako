export function getLineStops(line) {
  return line.arrets || [];
}

export function getLineEnds(line) {
  const stops = getLineStops(line);
  const first = stops[0]?.arret?.nom;
  const last = stops[stops.length - 1]?.arret?.nom;
  if (first && last) return `${first} - ${last}`;
  return line.nom || 'Parcours non renseigne';
}

export function hashLineColor(value) {
  const palette = [
    '#1976D2',
    '#388E3C',
    '#F57C00',
    '#7B1FA2',
    '#C2185B',
    '#0097A7',
    '#5D4037',
    '#455A64',
    '#D32F2F',
    '#689F38',
  ];
  const key = String(value ?? '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % palette.length;
  }
  return palette[hash];
}

export function getLineColor(lineOrNumero) {
  const numero = typeof lineOrNumero === 'object' ? lineOrNumero?.numero : lineOrNumero;
  const customColor = typeof lineOrNumero === 'object' ? lineOrNumero?.couleur : null;
  if (customColor) return customColor;

  const colors = {
    '119': '#1976D2',
    '183': '#388E3C',
    '194': '#F57C00',
    '141': '#E91E63',
    '133': '#2196F3',
    '178': '#795548',
    '115': '#607D8B',
    '135': '#e91e63',
    '58': '#2196f3',
    '12': '#4caf50',
    '19': '#ff9800',
    '61': '#9c27b0',
  };
  return String(numero) in colors ? colors[String(numero)] : hashLineColor(numero);
}

export function isDirectTrip(trajet) {
  if (!trajet) return false;
  if (trajet.direct === true) return true;
  return (trajet.nb_changements || 0) === 0;
}

export function lineContainsStop(line, stopId, stopName) {
  return getLineStops(line).some((item) => {
    const a = item.arret || item;
    if (stopId && a.id === stopId) return true;
    if (stopName && a.nom) {
      const normalizedStop = normalizeSearchValue(a.nom);
      const normalizedName = normalizeSearchValue(stopName);
      return normalizedStop === normalizedName || normalizedStop.includes(normalizedName);
    }
    return false;
  });
}

export function findStopByName(arrets, stopName) {
  if (!stopName) return null;
  const normalizedTarget = normalizeSearchValue(stopName);
  if (!normalizedTarget) return null;

  const normalizedStops = arrets.map((a) => ({
    item: a,
    name: normalizeSearchValue(a.nom || ''),
  }));

  const exactMatch = normalizedStops.find((entry) => entry.name === normalizedTarget);
  if (exactMatch) return exactMatch.item;

  const startsWithMatch = normalizedStops.find((entry) => entry.name.startsWith(normalizedTarget));
  if (startsWithMatch) return startsWithMatch.item;

  const containsMatch = normalizedStops.find((entry) => entry.name.includes(normalizedTarget));
  if (containsMatch) return containsMatch.item;

  return normalizedStops[0]?.item || null;
}

export function getStopKey(stop) {
  if (!stop) return null;
  if (stop.id) return `id:${stop.id}`;
  if (stop.nom) return `nom:${stop.nom.toLowerCase()}`;
  return null;
}

export function getStopNameValue(stop) {
  if (!stop) return '';
  if (typeof stop === 'string') return stop;
  return stop.nom || '';
}

export function normalizeSearchValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getLineStopsMatchingQuery(line, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return [];

  return getLineStops(line)
    .map((item) => item.arret || item)
    .filter((stop) => normalizeSearchValue(getStopNameValue(stop)).includes(normalizedQuery));
}

export function getLinesServingQuery(lignes, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return [];

  return lignes
    .map((line) => ({
      line,
      matchedStops: getLineStopsMatchingQuery(line, normalizedQuery),
    }))
    .filter((result) => result.matchedStops.length > 0);
}

function haversineKm(stop1, stop2) {
  if (!stop1 || !stop2) return Infinity;
  const lat1 = (stop1.lat ?? stop1.latitude) * Math.PI / 180;
  const lng1 = (stop1.lng ?? stop1.longitude) * Math.PI / 180;
  const lat2 = (stop2.lat ?? stop2.latitude) * Math.PI / 180;
  const lng2 = (stop2.lng ?? stop2.longitude) * Math.PI / 180;
  if ([lat1, lng1, lat2, lng2].some((v) => Number.isNaN(v))) return Infinity;
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getStopCoords(stop) {
  if (!stop) return null;
  const lat = stop.lat ?? stop.latitude;
  const lng = stop.lng ?? stop.longitude;
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return { lat, lng };
  }
  return null;
}

function lineStopList(line) {
  return getLineStops(line).map((item) => item.arret || item);
}

/** Score plus bas = alternative plus optimale (durée estimée en minutes). */
export function scoreAlternative(alt, depStop, arrStop) {
  const depCoords = getStopCoords(depStop);
  const arrCoords = getStopCoords(arrStop);
  if (!depCoords || !arrCoords) return Infinity;

  const departStops = lineStopList(alt.departLine);
  const arriveeStops = lineStopList(alt.arriveeLine);
  const transferKey = getStopKey(alt.transferStop);

  const boardIdx = departStops.findIndex((s) => getStopKey(s) === transferKey);
  const boardCandidates = boardIdx >= 0
    ? departStops.slice(0, boardIdx + 1)
    : departStops;
  const boardStop =
    boardCandidates.reduce((best, s) => {
      const d = haversineKm(depStop, s);
      return d < best.d ? { stop: s, d } : best;
    }, { stop: departStops[0], d: Infinity }).stop || departStops[0];

  const alightIdx = arriveeStops.findIndex((s) => getStopKey(s) === transferKey);
  const alightCandidates = alightIdx >= 0 ? arriveeStops.slice(alightIdx) : arriveeStops;
  const alightStop =
    alightCandidates.reduce((best, s) => {
      const d = haversineKm(arrStop, s);
      return d < best.d ? { stop: s, d } : best;
    }, { stop: arriveeStops[arriveeStops.length - 1], d: Infinity }).stop ||
    arriveeStops[arriveeStops.length - 1];

  const walkDepKm = haversineKm(depStop, boardStop);
  const walkArrKm = haversineKm(arrStop, alightStop);
  const bus1Km = haversineKm(boardStop, alt.transferStop);
  const bus2Km = haversineKm(alt.transferStop, alightStop);

  const walkMin = ((walkDepKm + walkArrKm) / 5) * 60;
  const busMin = ((bus1Km + bus2Km) / 18) * 60;
  const transferPenalty = 5;

  return {
    totalMinutes: Math.round(walkMin + busMin + transferPenalty),
    distanceKm: Math.round((walkDepKm + walkArrKm + bus1Km + bus2Km) * 10) / 10,
    walkMinutes: Math.round((walkDepKm + walkArrKm) / 5 * 60),
    nbChangements: 1,
    boardStop,
    alightStop,
    score: walkMin + busMin + transferPenalty,
  };
}

export function sortAlternativesByScore(alternatives, depStop, arrStop) {
  return [...alternatives]
    .map((alt) => {
      const metrics = scoreAlternative(alt, depStop, arrStop);
      return { ...alt, metrics };
    })
    .filter((alt) => Number.isFinite(alt.metrics.score))
    .sort((a, b) => a.metrics.score - b.metrics.score);
}

export function findTransferAlternatives(depLines, arrLines, limit = 4) {
  const alternatives = [];
  const seen = new Set();

  depLines.forEach((departLine) => {
    const departStops = getLineStops(departLine).map((item) => item.arret || item);
    arrLines.forEach((arriveeLine) => {
      if (departLine.id === arriveeLine.id) return;

      const arriveeStopsByKey = new Map(
        getLineStops(arriveeLine)
          .map((item) => item.arret || item)
          .map((stop) => [getStopKey(stop), stop])
          .filter(([key]) => key)
      );

      const transferStop = departStops.find((stop) => arriveeStopsByKey.has(getStopKey(stop)));
      if (!transferStop) return;

      const key = `${departLine.id}-${arriveeLine.id}-${getStopKey(transferStop)}`;
      if (seen.has(key)) return;
      seen.add(key);
      alternatives.push({
        departLine,
        arriveeLine,
        transferStop,
      });
    });
  });

  return alternatives.slice(0, limit);
}

function resolveRouteStop(arrets, departRef) {
  if (!departRef && departRef !== 0) return null;
  const asId = Number(departRef);
  if (!Number.isNaN(asId) && asId > 0) {
    return arrets.find((a) => a.id === asId) || null;
  }
  const name = String(departRef).trim();
  return arrets.find((a) => a.nom?.toLowerCase() === name.toLowerCase()) || null;
}

export function suggestLinesForRoute(lignes, departRef, arriveeRef, arrets) {
  const dep = resolveRouteStop(arrets, departRef);
  const arr = resolveRouteStop(arrets, arriveeRef);
  if (!dep || !arr) {
    return { depLines: [], arrLines: [], alternatives: [], depStop: dep, arrStop: arr };
  }

  const WALKING_THRESHOLD_KM = 2.5;
  const depNeighbors = arrets.filter((stop) => haversineKm(dep, stop) <= WALKING_THRESHOLD_KM);
  const arrNeighbors = arrets.filter((stop) => haversineKm(arr, stop) <= WALKING_THRESHOLD_KM);

  const depLines = lignes.filter((l) =>
    depNeighbors.some((stop) => lineContainsStop(l, stop.id, stop.nom))
  );
  const arrLines = lignes.filter((l) =>
    arrNeighbors.some((stop) => lineContainsStop(l, stop.id, stop.nom))
  );

  const rawAlternatives = findTransferAlternatives(depLines, arrLines, 24);
  const alternatives = sortAlternativesByScore(rawAlternatives, dep, arr).slice(0, 6);

  return { depLines, arrLines, alternatives, depStop: dep, arrStop: arr };
}

function estimateWalkMinutes(distanceKm, walkSpeedKmh = 5) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / walkSpeedKmh) * 60));
}

function asFloatOrZero(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convertit une alternative (2 lignes + arrêt de correspondance) en objet `trajet`
 * compatible avec l'affichage carte (TripRouteLayers) et l'instruction (RouteResult).
 *
 * Note: on modélise le trajet par segments bus + 2 segments marche (départ/arrivée)
 * quand `depStop -> boardStop` et `alightStop -> arrStop` ne sont pas les mêmes.
 */
export function buildTrajetFromAlternative({ alternative, depStop, arrStop }) {
  if (!alternative || !depStop || !arrStop) return null;

  const departLine = alternative.departLine;
  const arriveeLine = alternative.arriveeLine;
  const transferStop = alternative.transferStop;
  const metrics = alternative.metrics || {};

  // Métriques issues de scoreAlternative(): elles contiennent boardStop/alightStop.
  const boardStop =
    metrics.boardStop ||
    departLine?.arrets?.[0]?.arret ||
    getLineStops(departLine)?.[0]?.arret ||
    null;
  const alightStop =
    metrics.alightStop ||
    arriveeLine?.arrets?.slice(-1)?.[0]?.arret ||
    null;

  if (!departLine || !arriveeLine || !transferStop || !boardStop || !alightStop) return null;

  const getSameStop = (a, b) => {
    if (!a || !b) return false;
    if (a.id && b.id) return a.id === b.id;
    if (a.nom && b.nom) return String(a.nom).toLowerCase() === String(b.nom).toLowerCase();
    return false;
  };

  const walkingDepKm = haversineKm(depStop, boardStop);
  const walkingArrKm = haversineKm(alightStop, arrStop);

  const walkDepDurationMin = estimateWalkMinutes(walkingDepKm, 5);
  const walkArrDurationMin = estimateWalkMinutes(walkingArrKm, 5);

  const departStep = getSameStop(boardStop, depStop)
    ? { arret: boardStop, lignes: [departLine] }
    : { arret: depStop, lignes: [] };

  const firstWalkStep = getSameStop(boardStop, depStop)
    ? null
    : {
        arret: boardStop,
        mode: 'walk',
        lignes: [departLine], // Ligne à prendre après la marche
        marche: {
          distance_km: asFloatOrZero(walkingDepKm),
          duree_minutes: walkDepDurationMin,
        },
      };

  const transferStep = {
    arret: transferStop,
    lignes: [departLine, arriveeLine],
    est_correspondance: true,
  };

  const afterTransferBusStep = getSameStop(alightStop, transferStop)
    ? null
    : { arret: alightStop, lignes: [arriveeLine] };

  const lastWalkStep = getSameStop(alightStop, arrStop)
    ? null
    : {
        arret: arrStop,
        mode: 'walk',
        lignes: [], // Fin: plus de bus après l'arrivée
        marche: {
          distance_km: asFloatOrZero(walkingArrKm),
          duree_minutes: walkArrDurationMin,
        },
      };

  const arrets = [
    departStep,
    ...(firstWalkStep ? [firstWalkStep] : []),
    transferStep,
    ...(afterTransferBusStep ? [afterTransferBusStep] : []),
    ...(lastWalkStep ? [lastWalkStep] : []),
  ];

  const lignes = [departLine, arriveeLine].filter(Boolean);

  return {
    depart: depStop,
    arrivee: arrStop,
    arrets,
    lignes,
    correspondances: [],
    nb_changements: asFloatOrZero(metrics.nbChangements || 1),
    duree_minutes: asFloatOrZero(metrics.totalMinutes || 30),
    distance_km: asFloatOrZero(metrics.distanceKm || 8),
    direct: false,
    est_optimal: false,
  };
}

export function parseTrajetSegments(trajet) {
  if (!trajet?.arrets?.length) return [];

  const segments = [];
  let current = null;

  trajet.arrets.forEach((step, idx) => {
    const lines = step.lignes || [];
    const previousStep = trajet.arrets[idx - 1];
    const role = idx === 0 ? 'depart' : idx === trajet.arrets.length - 1 ? 'arrivee' : 'intermediate';

    if (step.mode === 'walk' && previousStep?.arret) {
      if (current) {
        segments.push(current);
        current = null;
      }
      segments.push({
        mode: 'walk',
        from: previousStep.arret,
        to: step.arret,
        distanceKm: step.marche?.distance_km,
        durationMinutes: step.marche?.duree_minutes,
      });

      const nextLine = lines[0];
      if (nextLine) {
        current = {
          line: nextLine,
          color: getLineColor(nextLine),
          stops: [{ arret: step.arret, ordre: idx + 1, role: role === 'arrivee' ? 'arrivee' : 'correspondance' }],
        };
      }
      return;
    }

    const isTransfer = step.est_correspondance || lines.length > 1;

    if (isTransfer && lines.length > 1) {
      if (current) {
        current.stops.push({ arret: step.arret, ordre: idx + 1, role: 'correspondance' });
        segments.push(current);
      }
      current = {
        line: lines[lines.length - 1],
        color: getLineColor(lines[lines.length - 1]),
        stops: [{ arret: step.arret, ordre: idx + 1, role: 'correspondance' }],
      };
      return;
    }

    const line = lines[0];
    if (!line) {
      if (current) current.stops.push({ arret: step.arret, ordre: idx + 1, role });
      return;
    }

    if (!current || current.line?.id !== line.id) {
      if (current) segments.push(current);
      current = {
        line,
        color: getLineColor(line),
        stops: [{ arret: step.arret, ordre: idx + 1, role }],
      };
    } else {
      current.stops.push({ arret: step.arret, ordre: idx + 1, role });
    }
  });

  if (current) segments.push(current);
  return segments;
}

export function buildLocalTrajet(lignes, arrets, departId, arriveeId) {
  const depStop = arrets.find((a) => a.id === departId);
  const arrStop = arrets.find((a) => a.id === arriveeId);
  if (!depStop || !arrStop) return null;

  for (const line of lignes) {
    const firstIdx = getLineStopIndex(line, depStop);
    const lastIdx = getLineStopIndex(line, arrStop);
    if (firstIdx < 0 || lastIdx < 0 || firstIdx === lastIdx) continue;

    const sliceStart = Math.min(firstIdx, lastIdx);
    const sliceEnd = Math.max(firstIdx, lastIdx);
    const lineStops = getLineStops(line);
    let slicedStops = lineStops.slice(sliceStart, sliceEnd + 1);
    if (firstIdx > lastIdx) slicedStops = [...slicedStops].reverse();

    let distanceKm = 0;
    for (let i = 1; i < slicedStops.length; i += 1) {
      const fromStop = slicedStops[i - 1].arret || slicedStops[i - 1];
      const toStop = slicedStops[i].arret || slicedStops[i];
      const fromCoords = arrets.find((a) => a.id === fromStop.id) || fromStop;
      const toCoords = arrets.find((a) => a.id === toStop.id) || toStop;
      distanceKm += haversineKm(fromCoords, toCoords);
    }

    return {
      depart: depStop,
      arrivee: arrStop,
      arrets: slicedStops.map((item) => ({
        arret: item.arret || item,
        lignes: [line],
        est_correspondance: false,
      })),
      lignes: [line],
      correspondances: [],
      nb_changements: 0,
      duree_minutes: Math.max(5, Math.round((distanceKm / 18) * 60)),
      distance_km: Math.round(distanceKm * 10) / 10,
      distance_marche_km: 0,
      direct: true,
      est_optimal: false,
    };
  }

  return null;
}

export function findFullLine(line, lignes) {
  if (!line) return null;
  return lignes.find((candidate) => candidate.id === line.id) || line;
}

export function getLineStopIndex(line, stop) {
  const key = getStopKey(stop);
  if (!line || !key) return -1;
  return getLineStops(line).findIndex((item) => getStopKey(item.arret || item) === key);
}

export function getSyncedStopCoords(stop, arrets) {
  if (!stop) return null;
  let synced = stop.id ? arrets.find((a) => a.id === stop.id) : null;
  if (!synced && stop.nom) {
    synced = arrets.find((a) => a.nom && a.nom.toLowerCase() === stop.nom.toLowerCase());
  }
  const source = synced || stop;
  const lat = source.lat ?? source.latitude;
  const lng = source.lng ?? source.longitude;
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  ) {
    return [lat, lng];
  }
  return null;
}
