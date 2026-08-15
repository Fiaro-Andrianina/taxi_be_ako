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
  if (customColor && /^#[0-9a-f]{3,6}$/i.test(customColor)) return customColor;

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
  // Cas 1 explicite depuis le backend
  if (trajet.cas === 1) return true;
  // Direct uniquement si aucun changement ET aucune marche
  if (trajet.direct === true && (trajet.distance_marche_km ?? 0) === 0) return true;
  return (trajet.nb_changements || 0) === 0 && (trajet.distance_marche_km ?? 0) === 0;
}

export function lineContainsStop(line, stopId, stopName) {
  return getLineStops(line).some((item) => {
    const a = item.arret || item;
    if (stopId && a?.id === stopId) return true;
    if (stopName) {
      const normalizedStop = normalizeSearchValue(getStopNameValue(a));
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

  const startsWithMatches = normalizedStops.filter((entry) => entry.name.startsWith(normalizedTarget));
  if (startsWithMatches.length > 0) {
    return startsWithMatches.reduce((best, entry) => (
      entry.name.length < best.name.length ? entry : best
    )).item;
  }

  const containsMatches = normalizedStops.filter((entry) => entry.name.includes(normalizedTarget));
  if (containsMatches.length > 0) {
    return containsMatches.reduce((best, entry) => (
      entry.name.length < best.name.length ? entry : best
    )).item;
  }

  return null;
}

export function getStopKey(stop) {
  if (!stop) return null;
  if (typeof stop === 'string') return `nom:${normalizeSearchValue(stop)}`;
  if (stop.id) return `id:${stop.id}`;
  if (stop.nom) return `nom:${normalizeSearchValue(stop.nom)}`;
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
  const depKey = getStopKey(depStop);
  const arrKey = getStopKey(arrStop);

  const depIdx = departStops.findIndex((s) => getStopKey(s) === depKey);
  const transferDepIdx = departStops.findIndex((s) => getStopKey(s) === transferKey);
  const transferArrIdx = arriveeStops.findIndex((s) => getStopKey(s) === transferKey);
  const arrIdx = arriveeStops.findIndex((s) => getStopKey(s) === arrKey);

  if (depIdx < 0 || transferDepIdx < 0 || depIdx >= transferDepIdx) return Infinity;
  if (transferArrIdx < 0 || arrIdx < 0 || transferArrIdx > arrIdx) return Infinity;

  const boardStop = depStop;
  const alightStop = arrStop;
  const bus1Km = haversineKm(boardStop, alt.transferStop);
  const bus2Km = haversineKm(alt.transferStop, alightStop);

  if (bus1Km < 0.005 || bus2Km < 0.005) {
    return Infinity;
  }

  const busMin = ((bus1Km + bus2Km) / 18) * 60;
  const transferPenalty = 5;

  return {
    totalMinutes: Math.round(busMin + transferPenalty),
    distanceKm: Math.round((bus1Km + bus2Km) * 10) / 10,
    walkMinutes: 0,
    walkDepMinutes: 0,
    walkArrMinutes: 0,
    walkDepKm: 0,
    walkArrKm: 0,
    nbChangements: 1,
    boardStop,
    alightStop,
    score: busMin + transferPenalty,
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

function resolveStopReference(stop, arrets) {
  if (!stop) return null;
  if (typeof stop === 'string') {
    return findStopByName(arrets, stop);
  }
  if (stop.id) {
    return arrets.find((a) => a.id === stop.id) || findStopByName(arrets, stop.nom);
  }
  return findStopByName(arrets, stop.nom);
}

export function findTransferAlternatives(depLines, arrLines, depStop, arrStop, arrets, limit = 4) {
  const alternatives = [];
  const seen = new Set();
  const depKey = getStopKey(depStop);
  const arrKey = getStopKey(arrStop);

  depLines.forEach((departLine) => {
    const departStops = getLineStops(departLine).map((item) => item.arret || item);
    const depIdx = departStops.findIndex((stop) => getStopKey(stop) === depKey);
    if (depIdx < 0) return;

    arrLines.forEach((arriveeLine) => {
      if (departLine.id === arriveeLine.id) return;

      const arriveeStops = getLineStops(arriveeLine).map((item) => item.arret || item);
      const arrIdx = arriveeStops.findIndex((stop) => getStopKey(stop) === arrKey);
      if (arrIdx < 0) return;

      const arriveeStopsByKey = new Map(
        arriveeStops.map((stop) => [getStopKey(stop), stop]).filter(([key]) => key)
      );

      const commonTransferStops = departStops.filter((stop) => arriveeStopsByKey.has(getStopKey(stop)));
      if (!commonTransferStops.length) return;

      commonTransferStops.forEach((transferStop) => {
        const transferIdx = departStops.findIndex((stop) => getStopKey(stop) === getStopKey(transferStop));
        const transferArrIdx = arriveeStops.findIndex((stop) => getStopKey(stop) === getStopKey(transferStop));
        if (transferIdx < 0 || transferArrIdx < 0) return;
        if (depIdx >= transferIdx || transferArrIdx > arrIdx) return;

        const transferStopObj = resolveStopReference(transferStop, arrets);
        if (!transferStopObj) return;

        const key = `${departLine.id}-${arriveeLine.id}-${getStopKey(transferStopObj)}`;
        if (seen.has(key)) return;
        seen.add(key);
        alternatives.push({
          departLine,
          arriveeLine,
          transferStop: transferStopObj,
        });
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
  const name = normalizeSearchValue(String(departRef).trim());
  if (!name) return null;
  return (
    arrets.find((a) => normalizeSearchValue(a.nom || '') === name) ||
    arrets.find((a) => normalizeSearchValue(a.nom || '').includes(name)) ||
    null
  );
}

export function suggestLinesForRoute(lignes, departRef, arriveeRef, arrets) {
  const dep = resolveRouteStop(arrets, departRef);
  const arr = resolveRouteStop(arrets, arriveeRef);
  if (!dep || !arr) {
    return { depLines: [], arrLines: [], alternatives: [], depStop: dep, arrStop: arr };
  }

  const depLines = lignes.filter((l) => lineContainsStop(l, dep.id, dep.nom));
  const arrLines = lignes.filter((l) => lineContainsStop(l, arr.id, arr.nom));

  const rawAlternatives = findTransferAlternatives(depLines, arrLines, dep, arr, arrets, 24);
  const alternatives = sortAlternativesByScore(rawAlternatives, dep, arr).slice(0, 6);

  return { depLines, arrLines, alternatives, depStop: dep, arrStop: arr };
}



function asFloatOrZero(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convertit une alternative (2 lignes + arrêt de correspondance) en objet `trajet`
 * compatible avec l'affichage carte (TripRouteLayers) et l'instruction (RouteResult).
 *
 * Cas 2 : bus 1 (depart -> correspondance), bus 2 (correspondance -> arrivee).
 * Pas de marche au depart ni a l'arrivee : l'utilisateur a deja choisi les arrets A et B.
 */
export function buildTrajetFromAlternative({ alternative, depStop, arrStop }) {
  if (!alternative || !depStop || !arrStop) return null;

  const departLine = alternative.departLine;
  const arriveeLine = alternative.arriveeLine;
  const transferStop = alternative.transferStop;
  const metrics = alternative.metrics || {};

  const boardStop = metrics.boardStop || depStop;
  const alightStop = metrics.alightStop || arrStop;

  if (!departLine || !arriveeLine || !transferStop || !boardStop || !alightStop) return null;

  const transferStep = {
    arret: transferStop,
    lignes: [departLine, arriveeLine],
    est_correspondance: true,
  };

  const arrets = [
    { arret: boardStop, lignes: [departLine] },
    transferStep,
    { arret: alightStop, lignes: [arriveeLine] },
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

    // Gestion des étapes marche (format backend: marche est sur l'arrêt d'arrivée)
    if (step.mode === 'walk' && step.marche) {
      if (current) {
        segments.push(current);
        current = null;
      }
      // Marche depuis l'arrêt précédent ou depuis le départ du trajet
      const fromStop = previousStep?.arret || trajet.depart;
      segments.push({
        mode: 'walk',
        from: fromStop,
        to: step.arret,
        distanceKm: step.marche?.distance_km,
        durationMinutes: step.marche?.duree_minutes,
      });

      // Si la marche amène à destination, ne pas créer de segment bus vide
      if (role === 'arrivee') {
        current = null;
        return;
      }

      // Continuer avec la ligne suivante si présente
      const nextLine = lines[0];
      if (nextLine) {
        current = {
          line: nextLine,
          color: getLineColor(nextLine),
          stops: [{ arret: step.arret, ordre: idx + 1, role: 'correspondance' }],
        };
      }
      return;
    }

    const isTransfer = step.est_correspondance || lines.length > 1;

    if (isTransfer && lines.length > 1) {
      if (role === 'arrivee') {
        if (current) {
          current.stops.push({ arret: step.arret, ordre: idx + 1, role: 'arrivee' });
          segments.push(current);
          current = null;
        }
        return;
      }
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
      // Cas trajet direct : utiliser la ligne du trajet si disponible
      const trajetLine = trajet?.lignes?.[0];
      if (trajetLine) {
        if (!current) {
          current = {
            line: trajetLine,
            color: getLineColor(trajetLine),
            stops: [],
          };
        }
        current.stops.push({ arret: step.arret, ordre: idx + 1, role });
      } else if (current) {
        current.stops.push({ arret: step.arret, ordre: idx + 1, role });
      }
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
    const lineStops = getLineStops(line).map((item) => item.arret || item);
    const resolvedStops = lineStops
      .map((stop) => (typeof stop === 'string' ? findStopByName(arrets, stop) : stop))
      .filter(Boolean);
    let slicedStops = resolvedStops.slice(sliceStart, sliceEnd + 1);
    if (firstIdx > lastIdx) slicedStops = [...slicedStops].reverse();

    let distanceKm = 0;
    for (let i = 1; i < slicedStops.length; i += 1) {
      const fromCoords = slicedStops[i - 1];
      const toCoords = slicedStops[i];
      distanceKm += haversineKm(fromCoords, toCoords);
    }

    return {
      depart: depStop,
      arrivee: arrStop,
      arrets: slicedStops.map((stop) => ({
        arret: stop,
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

  return getLineStops(line).findIndex((item) => {
    const candidate = item.arret || item;
    const candidateKey = getStopKey(candidate);
    if (candidateKey === key) return true;
    const candidateName = normalizeSearchValue(getStopNameValue(candidate));
    const stopName = normalizeSearchValue(getStopNameValue(stop));
    return Boolean(candidateName && stopName && (candidateName === stopName || candidateName.includes(stopName)));
  });
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

/**
 * Construit les suggestions d'alternatives à partir de la réponse 404 enrichie du backend (Cas 3).
 * Le backend retourne les lignes au départ et à l'arrivée avec leurs arrêts détaillés.
 */
export function buildSuggestionsFromBackend404(errorData, arrets) {
  if (!errorData) return null;

  const depStop = errorData.depart
    ? arrets.find((a) => a.id === errorData.depart.id) || errorData.depart
    : null;
  const arrStop = errorData.arrivee
    ? arrets.find((a) => a.id === errorData.arrivee.id) || errorData.arrivee
    : null;

  const depLines = errorData.lignes_depart || [];
  const arrLines = errorData.lignes_arrivee || [];

  if (!depStop || !arrStop) {
    return { depLines, arrLines, alternatives: [], depStop, arrStop };
  }

  const rawAlternatives = findTransferAlternatives(depLines, arrLines, depStop, arrStop, 24);
  const alternatives = sortAlternativesByScore(rawAlternatives, depStop, arrStop).slice(0, 6);

  return { depLines, arrLines, alternatives, depStop, arrStop };
}
