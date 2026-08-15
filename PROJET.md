# Taxi be Ako — PROJET

App transport urbain Antananarivo : recherche itinéraires bus, carte Leaflet, admin CRUD.

## Stack

Frontend: React 18 + Leaflet | Backend: Django REST | Carte: OSM | Routing: OSRM + fallback local | Calcul back: A*

## Démarrage

```bash
python manage.py runserver 127.0.0.1:8000   # back
cd taxi_be_ako_frontend && npm start         # front (proxy)
```

## Architecture des fichiers

```
taxi_be_ako/
├── transport/
│   ├── views.py              # Endpoints REST
│   ├── serializers.py        # JSON lignes/arrêts/trajets
│   ├── models.py             # Arret, Ligne, LigneArret, Correspondance, TrajetHistorique
│   ├── urls.py               # Routes URL transport
│   └── services/
│       ├── optimized.py      # A* (production)
│       ├── baseline.py       # BFS (référence)
│       ├── common.py         # Edge, calculer_distance (Haversine)
│       └── stop_geocoding.py # Alignement GPS sur OSM
├── comptes/                  # Authentification + historique
└── taxi_be_ako_frontend/src/
    ├── app/
    │   ├── AppContent.js     # Sidebar + MainLayout + vues
    │   ├── Sidebar.js        # Navigation
    │   └── useAppLogic.js    # État global, auth, recherche, offline
    ├── components/
    │   ├── SearchView.js     # Formulaire recherche
    │   ├── RouteResult.js    # Résultat trajet
    │   ├── MainLayout.js     # Carte + calibration
    │   ├── MapLayers.js      # Polylines (lignes, trajets, marche)
    │   ├── MapMarkers.js     # Marqueurs arrêts
    │   ├── LineCard.js        # Carte ligne réutilisable
    │   ├── LinesView.js      # Liste lignes
    │   ├── LineDetail.js     # Détail ligne
    │   ├── ConnectionCard.js # Statut online/offline
    │   ├── DiagnosticView.js # Diagnostic connexion
    │   ├── AdminView.js      # CRUD admin
    │   └── SettingsView.js   # Paramètres (profil, langue, thème, historique)
    ├── utils/
    │   ├── api.js            # Client HTTP + OSRM (fetchRoadRouteLeg)
    │   ├── lines.js          # buildLocalTrajet, suggestLinesForRoute, parseTrajetSegments
    │   ├── positions.js      # getLineRouteData, getSegmentRouteData, getTripPositions
    │   ├── stopGeocoding.js  # Alignement arrêts sur OSM
    │   └── geo.js             # orientTraceBetweenStops, smoothTraceProgress
    ├── data/fallback.js      # Données hors-ligne (13 lignes, 37 arrêts Tana)
    └── hooks/useRoadRoute.js # Hook appel OSRM
```

## Carte des boutons (frontend)

| Composant | Bouton | Handler | Effet |
|-----------|--------|---------|-------|
| `LoginView` | Se connecter / Créer compte | `handleSubmit` | `POST /api/login/` ou register → `setUser` |
| `Sidebar` | Recherche | `showSearch` | `view = 'search'` |
| `Sidebar` | Lignes | `setView('lines')` | `view = 'lines'` |
| `Sidebar` | Diagnostic | `setView('diagnostic')` | `view = 'diagnostic'` |
| `Sidebar` | Admin | `setView('admin')` | `view = 'admin'` (si role=admin) |
| `Sidebar` | Paramètres | `setShowSettings(true)` | Ouvre modal `SettingsView` |
| `Sidebar` | Déconnexion | `handleLogout` | `POST /api/logout/` → reset état |
| `ConnectionCard` | Vérifier | `onRefresh` | `GET /api/sync/` + OSM → maj données |
| `MainLayout` | Rafraîchir | `onMapMove` | Recharge données backend |
| `SearchView` | Trouver | `onSearch` | `POST /api/trajet/` → trajet direct ou alternatives |
| `RouteResult` | Voir sur carte | `onHighlightLine` | Surbrillance ligne sur carte |
| `LinesView` | LineCard / Détails | `onHighlightLine` / `onOpenLine` | Trace ligne ou `view = 'line'` |
| `AdminView` | Enregistrer ligne/arrêt | `saveLine` / `saveArret` | `POST/PUT` ou `PATCH /api/...` |
| `AdminView` | Ajouter/Retirer arrêt ligne | `addStopToLine` / `removeStopFromLine` | `POST/DELETE /api/ligne-arrets/` |
| `MainLayout` (calibration) | Clic carte | `pickCalibratedCoords` | Sauvegarde lat/lng |
| `MainLayout` (calibration) | ✓ | `saveCalibratedArret` | `PATCH /api/arrets/<id>/` |

## Algorithmes backend

### BFS — `transport/services/baseline.py` (`AlgorithmeSearchBaseline`)

| Fonction | Rôle |
|----------|------|
| `__init__()` | Charge arrêts/lignes, construit graphe |
| `construire_graphe()` | Arêtes bidirectionnelles bus entre arrêts consécutifs |
| `bfs(start, end)` | File FIFO → chemin **moins d'arrêts** (pas optimal temps) |
| `trouver_correspondances(chemin)` | Détecte changements ligne → crée `Correspondance` |
| `calculer_trajet(depart, arrivee)` | Orchestre BFS → durée = `dist×3 + correspondances×5` |

### A* — `transport/services/optimized.py` (`AlgorithmeSearchOptimized`)

Paramètres :
```python
TRANSFER_PENALTY_MINUTES = 5   # pénalité changement
MINUTES_PER_KM = 2.5            # vitesse bus ≈ 24 km/h
WALK_SPEED_KMH = 5              # vitesse marche
MAX_WALKING_TRANSFER_KM = 0.5   # max 500m à pied
```

| Fonction | Rôle |
|----------|------|
| `construire_graphe()` | Ajoute arêtes `walk` (<500m, lignes différentes) au graphe bus |
| `_chemin_bus_direct(depart, arrivee)` | Cas 1 : vérifie trajet direct sur une ligne → retour immédiat |
| `dijkstra(start, end)` | A* : état `(arret_id, ligne_id)`, coût `dist×2.5 + pénalité`, heuristique `dist_vol_oiseau×2.5` |
| `trouver_correspondances(chemin)` | Détecte transferts avec cache pour éviter doublons DB |
| `calculer_trajet(depart, arrivee)` | Tente direct → sinon A* → sauvegarde `TrajetHistorique` → retour `cas=1` ou `cas=2` |

### Commun — `transport/services/common.py`

| Élément | Rôle |
|---------|------|
| `Edge` | `destination_id`, `ligne_id`, `distance_km`, `mode` (`bus`/`walk`) |
| `calculer_distance(a, b)` | Haversine (rayon Terre 6371 km) |

## Algorithmes frontend

| Fonction | Fichier | Rôle |
|----------|---------|------|
| `buildLocalTrajet(lignes, arrets, departId, arriveeId)` | `utils/lines.js` | Recherche trajet direct sur une ligne (hors ligne) |
| `suggestLinesForRoute(lignes, departId, arriveeId, arrets)` | `utils/lines.js` | Alternatives avec correspondance (hors ligne) |
| `buildTrajetFromAlternative({alternative, depStop, arrStop})` | `utils/lines.js` | Convertit alternative en objet `trajet` affichable |
| `parseTrajetSegments(trajet)` | `utils/lines.js` | Découpe trajet en segments bus / marche pour la carte |
| `fetchRoadRouteLeg(from, to, signal)` | `utils/api.js` | Appel OSRM entre 2 arrêts → positions routières |
| `fetchRoadRoutePositions(positions, signal)` | `utils/api.js` | Route toutes les jambes d'un trajet via OSRM |
| `useRoadRoutePositions(basePositions, shouldRoute)` | `hooks/useRoadRoute.js` | Hook : affichage immédiat arrêts, puis mise à jour OSRM |
| `orientTraceBetweenStops(trace, from, to)` | `utils/geo.js` | Garantit sens départ→arrivée de la trace |
| `smoothTraceProgress(trace, from, to)` | `utils/geo.js` | Filtre points aberrants (progression non monotone) |

## Flux principaux

```
CHARGEMENT DONNÉES
  refreshData()
    → Promise.all(api('/api/sync/'), fetchOsmBusStopIndex())
    → alignArretsList() → setData()
    → connection.state = 'online'
    (échec → fallback.js → 'offline')

RECHERCHE ITINÉRAIRE
  handleSearch()
    → POST /api/trajet/ {depart, arrivee}
    → setTrajet(result) → TripRouteLayers / LineRouteLayer
    (offline → buildLocalTrajet / suggestLinesForRoute)

CALCUL BACKEND
  POST /api/trajet/
    → AlgorithmeSearchOptimized
    → _chemin_bus_direct() [cas 1 direct]
    → ou dijkstra() A* [cas 2 correspondance]
    → _etapes() → trajet_to_dict()

TRACÉ CARTE
  TripRouteLayers
    → parseTrajetSegments(trajet)
    → getTripPositions(trajet, arrets)
    → useRoadRoutePositions(basePositions, true)
      → fetchRoadRoutePositions() [OSRM]
      → isAcceptableRoutedLeg() [filtre aberrant]
    → SegmentRoutePolyline
      → sliceFallback(fallbackPositions, firstStop, lastStop)
      → <Polyline positions={positions} />
```

## API

| Méthode | URL | Usage |
|---------|-----|-------|
| GET | `/api/sync/` | Lignes + arrêts + correspondances |
| GET | `/api/osm-bus-stops/` | Index arrêts bus OSM |
| POST | `/api/trajet/` | Calcul itinéraire `{depart, arrivee}` |
| POST | `/api/login/` | Connexion |
| GET | `/api/me/` | Utilisateur courant |
| PATCH | `/api/arrets/<id>/` | Modifier arrêt (admin) |
| GET/POST | `/api/lignes/` | Liste / créer ligne |
| DELETE | `/api/lignes/<id>/` | Supprimer ligne |
| POST/DELETE | `/api/ligne-arrets/` | Associer / dissocier arrêt-ligne |

## Identifiants demo

Utilisateur : `admin` / Mot de passe : `admin123`
