/**
 * Données hors-ligne pour Taxi be Ako (Antananarivo).
 * Inclut coordonnées, tracés GPS inter-arrêts et correspondances.
 */

const COORDS = {
  '67 Ha': [-18.901158, 47.509165],
  Analakely: [-18.904096, 47.521574],
  Anosy: [-18.91982, 47.520117],
  Mahamasina: [-18.91894, 47.524224],
  Ivandry: [-18.86923, 47.528121],
  Ankorondrano: [-18.889419, 47.522541],
  Ambohijatovo: [-18.91004, 47.52856],
  Ambanidia: [-18.919377, 47.538257],
  Tanjombato: [-18.954453, 47.529021],
  Amboditsiry: [-18.886345, 47.539482],
  Antanimena: [-18.896965, 47.521152],
  Andraisoro: [-18.904637, 47.558445],
  Itaosy: [-18.924, 47.5072],
  Fasankarana: [-18.946154, 47.516431],
  Isoraka: [-18.913, 47.528],
  Isotry: [-18.9196, 47.5178],
  Besarety: [-18.9025, 47.5195],
  Ampefiloha: [-18.9145, 47.5268],
  Ambodivona: [-18.9068, 47.5245],
  Soanierana: [-18.9322, 47.54],
  Tsimbazaza: [-18.9318, 47.5258],
  Andavamamba: [-18.92, 47.5182],
  Ampandrana: [-18.8802, 47.5318],
  Ankadifotsy: [-18.9255, 47.5125],
  Faravohitra: [-18.9055, 47.5355],
  Ampasapito: [-18.896627, 47.545835],
  Ambohimanarina: [-18.8605, 47.4785],
  Andoharanofotsy: [-18.8955, 47.5485],
  Antohomadinika: [-18.9142, 47.5318],
};

const ARRET_IDS = Object.fromEntries(
  Object.keys(COORDS).map((nom, index) => [nom, index + 1])
);

function traceBetween(fromNom, toNom, steps = 4) {
  const from = COORDS[fromNom];
  const to = COORDS[toNom];
  if (!from || !to) return [];
  const points = [];
  for (let i = 1; i < steps; i += 1) {
    points.push([
      from[0] + (to[0] - from[0]) * (i / steps),
      from[1] + (to[1] - from[1]) * (i / steps),
    ]);
  }
  return points;
}

function buildLineArrets(stopNames) {
  return stopNames.map((nom, index) => {
    const item = {
      ordre: index + 1,
      arret: { id: ARRET_IDS[nom], nom },
    };
    if (index < stopNames.length - 1) {
      item.trace = traceBetween(nom, stopNames[index + 1]);
    }
    return item;
  });
}

function arretRef(nom) {
  const id = ARRET_IDS[nom];
  const [lat, lng] = COORDS[nom];
  return { id, nom, lat, lng, latitude: lat, longitude: lng };
}

function buildCorrespondance(id, arretNom, depNumero, arrNumero, lignesByNumero) {
  const arret = arretRef(arretNom);
  return {
    id,
    arret,
    ligne_depart: lignesByNumero[depNumero],
    ligne_arrivee: lignesByNumero[arrNumero],
    temps_estime_minutes: 5,
  };
}

const LIGNE_DEFS = [
  {
    id: 1,
    numero: '119',
    nom: '67 Ha - Anosy',
    couleur: '#1976D2',
    description: 'Ligne urbaine reliant 67 Ha au centre administratif.',
    arrets: ['67 Ha', 'Analakely', 'Anosy', 'Mahamasina'],
  },
  {
    id: 2,
    numero: '183',
    nom: 'Ivandry - Analakely',
    couleur: '#388E3C',
    description: 'Ligne nord vers le centre-ville.',
    arrets: ['Ivandry', 'Ankorondrano', 'Analakely', 'Ambohijatovo'],
  },
  {
    id: 3,
    numero: '194',
    nom: 'Ambanidia - Tanjombato',
    couleur: '#F57C00',
    description: 'Ligne sud avec correspondance au centre.',
    arrets: ['Ambanidia', 'Ambohijatovo', 'Mahamasina', 'Tanjombato'],
  },
  {
    id: 4,
    numero: '141',
    nom: 'Andraisoro - Analakely',
    couleur: '#E91E63',
    description: 'Ligne reliant Andraisoro à Analakely.',
    arrets: ['Andraisoro', 'Faravohitra', 'Analakely'],
  },
  {
    id: 5,
    numero: '133',
    nom: 'Analakely - Itaosy',
    couleur: '#2196F3',
    description: 'Ligne Analakely - Itaosy via le sud-ouest.',
    arrets: ['Analakely', 'Isotry', 'Andavamamba', 'Itaosy'],
  },
  {
    id: 6,
    numero: '178',
    nom: '67 Ha - Andraisoro',
    couleur: '#795548',
    description: 'Ligne reliant 67 Ha à Andraisoro.',
    arrets: ['67 Ha', 'Besarety', 'Andraisoro'],
  },
  {
    id: 7,
    numero: '115',
    nom: '67 Ha - Fasankarana',
    couleur: '#607D8B',
    description: 'Ligne reliant 67 Ha à Fasankarana via Analakely.',
    arrets: ['67 Ha', 'Analakely', 'Isotry', 'Fasankarana'],
  },
  {
    id: 8,
    numero: '135',
    nom: 'Analakely - Soanierana',
    couleur: '#e91e63',
    description: 'Ligne est reliant le centre à Soanierana.',
    arrets: ['Analakely', 'Ambodivona', 'Isoraka', 'Soanierana'],
  },
  {
    id: 9,
    numero: '58',
    nom: 'Isotry - Analakely',
    couleur: '#2196f3',
    description: 'Ligne ouest reliant Isotry au centre.',
    arrets: ['Isotry', 'Andavamamba', 'Besarety', 'Analakely'],
  },
  {
    id: 10,
    numero: '12',
    nom: 'Besarety - Mahamasina',
    couleur: '#4caf50',
    description: 'Ligne centre reliant Besarety à Mahamasina.',
    arrets: ['Besarety', 'Analakely', 'Ampefiloha', 'Mahamasina'],
  },
  {
    id: 11,
    numero: '19',
    nom: 'Ampefiloha - Tanjombato',
    couleur: '#ff9800',
    description: 'Ligne sud passant par Ambohijatovo.',
    arrets: ['Ampefiloha', 'Ambohijatovo', 'Tsimbazaza', 'Tanjombato'],
  },
  {
    id: 12,
    numero: '61',
    nom: 'Ambodivona - Ivandry',
    couleur: '#9c27b0',
    description: 'Ligne nord-est reliant Ambodivona à Ivandry.',
    arrets: ['Ambodivona', 'Antanimena', 'Amboditsiry', 'Ivandry'],
  },
];

const lignesByNumero = Object.fromEntries(
  LIGNE_DEFS.map((def) => [def.numero, { id: def.id, numero: def.numero, nom: def.nom }])
);

const FALLBACK_DATA = {
  lignes: LIGNE_DEFS.map((def) => ({
    id: def.id,
    numero: def.numero,
    nom: def.nom,
    couleur: def.couleur,
    description: def.description,
    nb_arrets: def.arrets.length,
    arrets: buildLineArrets(def.arrets),
  })),
  arrets: Object.entries(COORDS).map(([nom, [lat, lng]]) => ({
    id: ARRET_IDS[nom],
    nom,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
  })),
  correspondances: [
    buildCorrespondance(1, 'Analakely', '119', '183', lignesByNumero),
    buildCorrespondance(2, 'Analakely', '119', '135', lignesByNumero),
    buildCorrespondance(3, 'Analakely', '183', '141', lignesByNumero),
    buildCorrespondance(4, 'Mahamasina', '119', '194', lignesByNumero),
    buildCorrespondance(5, 'Mahamasina', '12', '194', lignesByNumero),
    buildCorrespondance(6, 'Ambohijatovo', '183', '194', lignesByNumero),
    buildCorrespondance(7, 'Ambohijatovo', '19', '194', lignesByNumero),
    buildCorrespondance(8, 'Isotry', '58', '133', lignesByNumero),
    buildCorrespondance(9, 'Ambodivona', '135', '61', lignesByNumero),
    buildCorrespondance(10, 'Analakely', '58', '12', lignesByNumero),
  ],
};

export default FALLBACK_DATA;
