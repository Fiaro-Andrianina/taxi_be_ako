import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import MapBounds from '../MapBounds';
import { LineRouteLayer, TripRouteLayers, MapClickHandler } from './MapLayers';
import { EnhancedTripMarkers, buildMarkerOffsets } from './MapMarkers';
import { getLineRoutePositions, getTripPositions, getSegmentRoutePositions } from '../utils/positions';
import { parseTrajetSegments, lineContainsStop, findFullLine } from '../utils/lines';

// Affiche l'interface de calibration d'un arrêt lorsque l'administrateur déplace un marqueur.
function CalibrationOverlay({
  arrets, calibratingArretId, calibPickedLatLng,
  setCalibratingArret, pickCalibratedCoords, saveCalibratedArret, t,
}) {
  const arret = arrets.find(a => a.id === calibratingArretId);
  if (!arret) return null;

  const displayLat = calibPickedLatLng?.[0] ?? arret.latitude ?? arret.lat;
  const displayLng = calibPickedLatLng?.[1] ?? arret.longitude ?? arret.lng;
  const fmt = v => (v != null ? Number(v).toFixed(6) : '—');

  const arretName = typeof arret.nom === 'string' ? arret.nom : `Arrêt #${arret.id || '?'}`;

  return (
    <>
      <div className="calib-backdrop" />
      <div className="calib-info-bar">
        <span className="calib-badge calib-badge-pulse">●</span>
        <strong>{t.recadrer_arret || 'Recadrer'} : {arretName}</strong>
        <span className="calib-coords">
          {fmt(displayLat)}, {fmt(displayLng)}
        </span>
        {calibPickedLatLng && (
          <span className="calib-updated">↑ {t.coords_maj || 'Coords mises à jour'}</span>
        )}
      </div>
      <div className="calib-hint calib-hint-left">
        {t.appuis_osm || 'Cliquez sur l\'icône OSM sur la carte'}
      </div>
      <div className="calib-hint calib-hint-right">
        {t.valider_ensuite || 'Puis validez ci-dessous'}
      </div>
      <div className="calib-h calib" />
      <div className="calib-v calib" />
      <div className="calib-panel">
        <button type="button" className="calib-panel-close" onClick={() => setCalibratingArret(null)}>
          ✕
        </button>
        <h4>{t.recadrer_arret || 'Recadrer l\'arrêt'}</h4>
        <div className="calib-arret-name">
          <span className="calib-stop-icon">📍</span>
          <div>
            <strong>{arretName}</strong>
            <small>ID {arret.id}</small>
          </div>
        </div>
        <div className="calib-inputs">
          <div className="calib-input-group">
            <label>{t.admin_latitude}</label>
            <input
              id="calib-lat"
              type="number"
              step="any"
              value={displayLat}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) pickCalibratedCoords({ lat: v, lng: displayLng });
              }}
            />
          </div>
          <div className="calib-input-group">
            <label>{t.admin_longitude}</label>
            <input
              id="calib-lng"
              type="number"
              step="any"
              value={displayLng}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) pickCalibratedCoords({ lat: displayLat, lng: v });
              }}
            />
          </div>
        </div>
        <div className="calib-actions">
          <button
            type="button"
            className="calib-btn calib-btn-save"
            onClick={saveCalibratedArret}
          >
            ✓ {t.admin_enregistrer}
          </button>
          <button
            type="button"
            className="calib-btn calib-btn-cancel"
            onClick={() => setCalibratingArret(null)}
          >
            {t.admin_annuler || 'Annuler'}
          </button>
        </div>
      </div>
    </>
  );
}

// Composant principal de mise en page qui affiche la carte Leaflet et le panneau de contenu.
export default function MainLayout({
  arrets, lignes, trajet, highlightedLine, onMapMove, children, t,
  calibratingArretId, calibPickedLatLng, setCalibratingArret,
  pickCalibratedCoords, saveCalibratedArret,
}) {
  const resolvedHighlightedLine = useMemo(
    () => findFullLine(highlightedLine, lignes),
    [highlightedLine, lignes]
  );
  const linePositions = useMemo(
    () => getLineRoutePositions(resolvedHighlightedLine, arrets),
    [resolvedHighlightedLine, arrets]
  );
  const tripPositions = useMemo(
    () => getTripPositions(trajet, arrets),
    [trajet, arrets]
  );
  const tripSegments = useMemo(() => parseTrajetSegments(trajet), [trajet]);
  const segmentPositions = useMemo(
    () => tripSegments.flatMap((seg) => getSegmentRoutePositions(seg, arrets, lignes)),
    [tripSegments, arrets, lignes]
  );
  const focusPositions = resolvedHighlightedLine && !trajet
    ? linePositions
    : segmentPositions.length
      ? segmentPositions
      : tripPositions;
  const markerOffsets = buildMarkerOffsets(arrets);

  const tripStopIds = useMemo(() => {
    const ids = new Set();
    (trajet?.arrets || []).forEach(step => {
      if (step.arret?.id) ids.add(step.arret.id);
    });
    return ids;
  }, [trajet]);

  const tripStopNames = useMemo(() => {
    const names = new Set();
    (trajet?.arrets || []).forEach(step => {
      if (step.arret?.nom) names.add(step.arret.nom.toLowerCase());
    });
    return names;
  }, [trajet]);

  const departId = trajet?.depart?.id;
  const arriveeId = trajet?.arrivee?.id;

  const calib = calibratingArretId !== null;

  const getSafeArretName = (arret) => {
    if (!arret) return 'Arrêt inconnu';
    if (typeof arret.nom === 'string') return arret.nom;
    if (arret.id) return `Arrêt #${arret.id}`;
    return 'Arrêt inconnu';
  };

  return (
    <main className="main">
      <header className="topbar compact">
        <div>
          <p>{t.reseau || 'Antananarivo'}</p>
          <h1>Taxi be Ako</h1>
        </div>
        <button className="srch-btn" onClick={onMapMove}>
          {t.rafraichir}
        </button>
      </header>
      <div className="main-screens calib-parent">
        <MapContainer
          id="taxi-map"
          center={[-18.90, 47.52]}
          zoom={13}
          minZoom={11}
          maxZoom={18}
          maxBounds={[[-19.2, 47.2], [-18.5, 47.8]]}
          maxBoundsViscosity={0.5}
          worldCopyJump={false}
          bounceAtZoomLimits={false}
          dragging={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          <MapBounds arrets={arrets} focusPositions={focusPositions} />

          {!calib && resolvedHighlightedLine && (
            <LineRouteLayer line={resolvedHighlightedLine} arrets={arrets} active />
          )}

          {!calib && !resolvedHighlightedLine && trajet && (
            <TripRouteLayers trajet={trajet} arrets={arrets} lignes={lignes} />
          )}

          {!calib && !resolvedHighlightedLine && trajet && (
            <EnhancedTripMarkers
              trajet={trajet}
              arrets={arrets}
              departId={departId}
              arriveeId={arriveeId}
            />
          )}

          {!calib && arrets.map((arret) => {
             if (!arret || typeof arret !== 'object') return null;
             if (typeof arret.lat !== 'number' || typeof arret.lng !== 'number') return null;

             const isInTrip =
               !resolvedHighlightedLine &&
               (tripStopIds.has(arret.id) ||
                 (arret.nom && tripStopNames.has(arret.nom.toLowerCase())));
             const isOnHighlightedLine =
               resolvedHighlightedLine &&
               lineContainsStop(resolvedHighlightedLine, arret.id, arret.nom);
             if (isInTrip || isOnHighlightedLine) return null;

             const off = markerOffsets.get(arret.id) || { x: 0, y: 0 };
             const shiftLabelX = off.x > 0 ? 6 : off.x < 0 ? -6 : 0;

             const rawName = getSafeArretName(arret);
             const safeName = rawName.replace(/[<>&"']/g, (ch) => (
                { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[ch]
              ));

                return (
                  <Marker
                    key={arret.id || Math.random()}
                    position={[arret.lat, arret.lng]}
                   icon={L.divIcon({
                    className: 'standard-stop-marker',
                    html: `<div class="ss-wrapper" style="transform:translate(${off.x}px,${off.y}px)">
                            <div class="ss-dot"></div>
                            <span class="ss-label" style="transform:translateX(${shiftLabelX}px)">${safeName}</span>
                          </div>`,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0],
                  })}
                />
              );
          })}

          {calib && <CalibrationOverlay
            arrets={arrets}
            calibratingArretId={calibratingArretId}
            calibPickedLatLng={calibPickedLatLng}
            setCalibratingArret={setCalibratingArret}
            pickCalibratedCoords={pickCalibratedCoords}
            saveCalibratedArret={saveCalibratedArret}
            t={t}
          />}

          {calib && <MapClickHandler onPick={pickCalibratedCoords} />}
        </MapContainer>

        <div className="page">
          {children}
        </div>
      </div>
    </main>
  );
}
