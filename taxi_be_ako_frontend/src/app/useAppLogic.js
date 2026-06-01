import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { translations } from '../SettingsView';
import FALLBACK_DATA from '../data/fallback';
import { buildApiError, api } from '../utils/api';
import { buildTrajetFromAlternative, suggestLinesForRoute, findFullLine, buildLocalTrajet } from '../utils/lines';
import { alignArretsList, fetchOsmBusStopIndex, resolveArretCoordinates } from '../utils/stopGeocoding';

// Prépare les données hors-ligne en alignant les arrêts fallback avec l'index OSM.
async function prepareFallbackData() {
  const osmIndex = await fetchOsmBusStopIndex();
  const arrets = alignArretsList(
    (FALLBACK_DATA.arrets || []).map((a) => ({
      ...a,
      latitude: a.latitude ?? a.lat,
      longitude: a.longitude ?? a.lng,
      lat: a.lat ?? a.latitude,
      lng: a.lng ?? a.longitude,
    })),
    osmIndex
  );
  return {
    lignes: FALLBACK_DATA.lignes || [],
    arrets,
    correspondances: FALLBACK_DATA.correspondances || [],
  };
}

// Normalise les propriétés de coordonnées pour garantir lat/lng et latitude/longitude.
function normalizeArretCoordinates(arret) {
  const lat = typeof arret.lat === 'number' ? arret.lat : arret.latitude;
  const lng = typeof arret.lng === 'number' ? arret.lng : arret.longitude;
  return {
    ...arret,
    lat,
    lng,
    latitude: arret.latitude ?? lat,
    longitude: arret.longitude ?? lng,
  };
}

// Vérifie que l'arrêt possède des coordonnées valides utilisables sur la carte.
function hasValidCoordinates(arret) {
  return (
    typeof arret.lat === 'number' &&
    typeof arret.lng === 'number' &&
    !Number.isNaN(arret.lat) &&
    !Number.isNaN(arret.lng)
  );
}

// Tente de résoudre une recherche d'itinéraire avec les données locales en mode hors-ligne.
function applyOfflineRouteSearch({ departId, arriveeId, lignes, arrets, setTrajet, setHighlightedLine, setRouteSuggestions, setRouteError, t }) {
  const localTrajet = buildLocalTrajet(lignes, arrets, departId, arriveeId);
  if (localTrajet) {
    setTrajet(localTrajet);
    setRouteSuggestions(null);
    setRouteError('');
    setHighlightedLine(findFullLine(localTrajet.lignes[0], lignes) || localTrajet.lignes[0]);
    return true;
  }

  const suggestions = suggestLinesForRoute(lignes, departId, arriveeId, arrets);
  setRouteSuggestions(suggestions);

  if (suggestions?.alternatives?.length > 0) {
    const best = suggestions.alternatives[0];
    const syntheticTrajet = buildTrajetFromAlternative({
      alternative: best,
      depStop: suggestions.depStop,
      arrStop: suggestions.arrStop,
    });
    if (syntheticTrajet) {
      setTrajet(syntheticTrajet);
      setHighlightedLine(null);
      setRouteError('');
      return true;
    }
  }

  setRouteError(t.trajet_introuvable_hors_ligne || 'Trajet introuvable hors ligne. Consultez les alternatives proposées.');
  return false;
}

// Hook principal du frontend qui centralise l'état de l'application et toutes les actions.
export function useAppLogic() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('search');
  const [showAdmin, setShowAdmin] = useState(false);
  const [data, setData] = useState({
    lignes: FALLBACK_DATA.lignes || [],
    arrets: FALLBACK_DATA.arrets || [],
    correspondances: FALLBACK_DATA.correspondances || [],
  });
  const [connection, setConnection] = useState({
    state: 'loading',
    label: 'Verification du backend...',
    detail: 'Proxy React -> http://127.0.0.1:8000',
  });
  const [depart, setDepart] = useState('');
  const [arrivee, setArrivee] = useState('');
  const [trajet, setTrajet] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeSuggestions, setRouteSuggestions] = useState(null);
  const { language, setLanguage } = useLanguage();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showSettings, setShowSettings] = useState(false);

  const [calibratingArretId, setCalibratingArretId] = useState(null);
  const [calibPickedLatLng,  setCalibPickedLatLng]  = useState(null);

  const t = translations[language];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    checkAuth();
  }, []);

  // Vérifie si l'utilisateur est déjà connecté en appelant l'API /api/me/.
  async function checkAuth() {
    try {
      const response = await fetch('/api/me/', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        const role = data.user?.profil?.role;
        setShowAdmin(role === 'admin');
      }
    } catch (error) {
      setShowAdmin(false);
    } finally {
      setAuthLoading(false);
    }
  }

  // Gère la connexion en stockant l'utilisateur et en activant l'affichage admin si nécessaire.
  function handleLogin(userData) {
    setUser(userData);
    const role = userData?.profil?.role;
    setShowAdmin(role === 'admin');
  }

  // Déconnecte l'utilisateur et réinitialise l'état de l'application.
  async function handleLogout() {
    try {
      await fetch('/api/logout/', { method: 'POST', credentials: 'include' });
    } catch (error) {
      // Ignore errors
    }
    setUser(null);
    setShowAdmin(false);
    setTrajet(null);
    setSelectedLine(null);
    setHighlightedLine(null);
    setDepart('');
    setArrivee('');
    setRouteSuggestions(null);
    setView('search');
  }

  // Enregistre les coordonnées choisies sur la carte lors de la calibration d'un arrêt.
  function pickCalibratedCoords(ll) {
    const lat = typeof ll?.lat === 'number' ? ll.lat : parseFloat(ll?.lat);
    const lng = typeof ll?.lng === 'number' ? ll.lng : parseFloat(ll?.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    setCalibPickedLatLng([lat, lng]);
  }

  // Sauvegarde les nouvelles coordonnées d'un arrêt calibré vers le backend.
  async function saveCalibratedArret() {
    const arret = arrets.find(a => a.id === calibratingArretId);
    if (!arret) return;

    const newLat  = calibPickedLatLng?.[0] ?? arret.latitude ?? arret.lat;
    const newLng  = calibPickedLatLng?.[1] ?? arret.longitude ?? arret.lng;
    const newName = arret.nom;

    if (isNaN(newLat) || isNaN(newLng)) {
      alert('Coordonnées invalides.');
      return;
    }

    try {
      await api(`/api/arrets/${arret.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          nom: newName,
          latitude: newLat,
          longitude: newLng,
        }),
      });
      await refreshData();
      setCalibratingArretId(null);
      setCalibPickedLatLng(null);
    } catch (e) {
      console.error('Erreur calibration stop:', e);
      alert('Erreur: ' + (e.message || 'Impossible de sauvegarder'));
    }
  }

  const arrets = useMemo(() =>
    (data.arrets || []).map(a => ({
      ...a,
      latitude:  a.latitude  ?? a.lat,
      longitude: a.longitude ?? a.lng,
      lat:       a.lat       ?? a.latitude,
      lng:       a.lng       ?? a.longitude,
    })),
    [data]
  );
  const lignes = useMemo(() => data.lignes || [], [data]);

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      prepareFallbackData().then((fallback) => setData(fallback));
    }
  }, [user]);

  // Recharge les données du backend et aligne les arrêts avec l'index OSM.
  async function refreshData() {
    setConnection({
      state: 'loading',
      label: 'verification_du_backend',
      detail: 'Lecture de /api/sync/',
    });
    setRouteError('');

    try {
      const [payload, osmIndex] = await Promise.all([
        api('/api/sync/'),
        fetchOsmBusStopIndex(),
      ]);
      const mergedArrets = (payload.arrets || []).map((arret) => {
        const normalized = normalizeArretCoordinates(arret);
        const fallback =
          FALLBACK_DATA.arrets.find((f) => f.id === arret.id) ||
          (arret.nom
            ? FALLBACK_DATA.arrets.find(
                (f) => f.nom && f.nom.toLowerCase() === arret.nom.toLowerCase()
              )
            : null);
        return fallback
          ? normalizeArretCoordinates({ ...normalized, ...fallback })
          : normalized;
      });
      const alignedArrets = mergedArrets
        .map((arret) => resolveArretCoordinates(arret, osmIndex))
        .filter(hasValidCoordinates);
      setData({
        lignes: payload.lignes?.length ? payload.lignes : [],
        arrets: alignedArrets,
        correspondances: payload.correspondances || [],
      });
      setConnection({
        state: 'online',
        label: 'backend_connecte',
        detail: `${payload.arrets?.length || 0} arrets, ${payload.lignes?.length || 0} lignes`,
      });
    } catch (error) {
      const fallback = await prepareFallbackData();
      setData(fallback);
      setConnection({
        state: 'offline',
        label: 'backend_indisponible',
        detail: buildApiError(error),
      });
    }
  }

  // Lance la recherche de trajet, appelle l'API, et gère les modes en ligne/hors-ligne.
  async function handleSearch(event) {
    event.preventDefault();
    setTrajet(null);
    setHighlightedLine(null);
    setRouteError('');
    setRouteSuggestions(null);

    if (!depart || !arrivee) {
      setRouteError(t.choisissez_depart_destination || 'Choisissez le départ et la destination.');
      return;
    }
    if (depart === arrivee) {
      setRouteError(t.depart_arrivee_differents);
      return;
    }

    const departId = Number(depart) || arrets.find((a) => a.nom.toLowerCase() === depart.toLowerCase())?.id;
    const arriveeId = Number(arrivee) || arrets.find((a) => a.nom.toLowerCase() === arrivee.toLowerCase())?.id;
    if (!departId || !arriveeId) {
      setRouteError(t.nom_arret_inconnu || 'Nom d\'arrêt inconnu. Vérifiez les noms saisis.');
      return;
    }

    setLoading(true);
    try {
      const result = await api('/api/trajet/', {
        method: 'POST',
        body: JSON.stringify({ depart: departId, arrivee: arriveeId }),
      });
      setTrajet(result);
      setRouteSuggestions(null);
      if (result.lignes?.length === 1) {
        setHighlightedLine(findFullLine(result.lignes[0], lignes) || result.lignes[0]);
      }
      if (user) {
        try {
          await fetch('/api/users/trips/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              depart: departId,
              arrivee: arriveeId,
              nb_changements: result.nb_changements || 0,
              duree_minutes: result.duree_minutes || 0,
              distance_km: result.distance_km || 0,
              point_accrochage: 'arrivee',
              est_explicite: true,
            }),
          });
        } catch (e) {
          // Silently ignore history saving errors
        }
      }
      setConnection({
        state: 'online',
        label: 'trajet_calcule',
        detail: `${result.duree_minutes} min, ${result.distance_km} km`,
      });
      setView('search');
    } catch (error) {
      const isOffline = error?.name === 'TypeError';
      const msg = buildApiError(error, 'Impossible de calculer ce trajet.');
      setRouteError(msg);

      if (isOffline) {
        const handled = applyOfflineRouteSearch({
          departId,
          arriveeId,
          lignes,
          arrets,
          setTrajet,
          setHighlightedLine,
          setRouteSuggestions,
          setRouteError,
          t,
        });
        if (handled) {
          setConnection({
            state: 'offline',
            label: 'mode_hors_ligne',
            detail: `${FALLBACK_DATA.lignes.length} lignes demo`,
          });
          setView('search');
          return;
        }
      }

      if (msg.toLowerCase().includes('trajet') || msg.toLowerCase().includes('introuvable') || msg.toLowerCase().includes('404')) {
        const suggestions = suggestLinesForRoute(lignes, departId, arriveeId, arrets);
        setRouteSuggestions(suggestions);
        // Affichage immédiat de la meilleure alternative sur la carte.
        if (suggestions?.alternatives?.length > 0) {
          const best = suggestions.alternatives[0];
          const syntheticTrajet = buildTrajetFromAlternative({
            alternative: best,
            depStop: suggestions.depStop,
            arrStop: suggestions.arrStop,
          });
          if (syntheticTrajet) {
            setTrajet(syntheticTrajet);
            setHighlightedLine(null);
          }
        }
      } else {
        setRouteSuggestions(null);
      }
      setConnection((current) => ({
        ...current,
        state: error?.name === 'TypeError' ? 'offline' : current.state,
        label: error?.name === 'TypeError' ? 'Backend indisponible' : current.label,
      }));
    } finally {
      setLoading(false);
    }
  }

  // Sélectionne une ligne pour la mettre en surbrillance sur la carte.
  function highlightLineOnMap(line) {
    setHighlightedLine(findFullLine(line, lignes) || line);
  }

  // Affiche une alternative de trajet calculée localement sur la carte.
  function showAlternativeOnMap(alternative) {
    if (!routeSuggestions?.depStop || !routeSuggestions?.arrStop) return;
    const syntheticTrajet = buildTrajetFromAlternative({
      alternative,
      depStop: routeSuggestions.depStop,
      arrStop: routeSuggestions.arrStop,
    });
    if (!syntheticTrajet) return;
    setTrajet(syntheticTrajet);
    setHighlightedLine(null);
    setView('search');
  }

  // Ouvre la page de détail d'une ligne en sélectionnant la ligne et en la mettant en surbrillance.
  function openLine(line) {
    const fullLine = findFullLine(line, lignes) || line;
    setSelectedLine(fullLine);
    setHighlightedLine(fullLine);
    setView('line');
  }

  // Retourne à l'écran de recherche principal.
  function showSearch() {
    setSelectedLine(null);
    setHighlightedLine(null);
    setView('search');
  }

  const mapHighlightedLine = highlightedLine || (view === 'line' ? selectedLine : null);

  return {
    user,
    setUser,
    authLoading,
    view,
    setView,
    showAdmin,
    data,
    connection,
    depart,
    setDepart,
    arrivee,
    setArrivee,
    trajet,
    selectedLine,
    setSelectedLine,
    highlightedLine,
    setHighlightedLine,
    loading,
    routeError,
    routeSuggestions,
    language,
    setLanguage,
    theme,
    setTheme,
    showSettings,
    setShowSettings,
    calibratingArretId,
    setCalibratingArretId,
    calibPickedLatLng,
    setCalibPickedLatLng,
    t,
    checkAuth,
    handleLogin,
    handleLogout,
    pickCalibratedCoords,
    saveCalibratedArret,
    arrets,
    lignes,
    refreshData,
    handleSearch,
    highlightLineOnMap,
    showAlternativeOnMap,
    openLine,
    showSearch,
    mapHighlightedLine
  };
}
