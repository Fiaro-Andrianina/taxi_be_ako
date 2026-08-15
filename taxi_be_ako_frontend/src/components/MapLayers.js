import { useMemo } from 'react';
import { Marker, Polyline, useMapEvents } from 'react-leaflet';
import { getLineColor, getLineStops, parseTrajetSegments } from '../utils/lines';
import { getLineRouteData, getStopPosition, getTripPositions } from '../utils/positions';
import { useRoadRoutePositions } from '../hooks/useRoadRoute';
import { createMapMarkerIcon, FootstepMarkers } from './MapMarkers';



// Affiche la ligne de bus sélectionnée sur la carte avec son tracé et ses arrêts.
export function LineRouteLayer({ line, arrets, active }) {
  const routeData = useMemo(
    () => (line ? getLineRouteData(line, arrets) : { positions: [], hasTrace: false }),
    [line, arrets]
  );
  const positions = useRoadRoutePositions(routeData.positions, !routeData.hasTrace);
  if (!line) return null;
  const color = getLineColor(line);
  const stops = getLineStops(line);

  return (
    <>
      {positions.length > 1 && (
        <>
          {/* Background line for better visibility */}
          {!active && (
            <Polyline
              positions={positions}
              color="#ffffff"
              weight={8}
          opacity={0.2}
              dashArray="8, 6"
              zIndexOffset={48}
              interactive={false}
            />
          )}
          <Polyline
            positions={positions}
            color={color}
            weight={active ? 6 : 5}
            opacity={active ? 1 : 0.85}
            dashArray={active ? null : '8, 6'}
            zIndexOffset={active ? 100 : 50}
            lineCap="round"
            lineJoin="round"
          />
        </>
      )}
      {stops.map((item, index) => {
        const stop = item.arret || item;
        const coords = getStopPosition(stop, arrets);
        if (!coords) return null;
        const ordre = item.ordre ?? index + 1;
        const stopName = stop.nom || `Arrêt #${stop.id}`;
        const isTerminus = index === 0 || index === stops.length - 1;
        return (
          <Marker
            key={`line-${line.id}-${stop.id || index}`}
            position={coords}
            icon={createMapMarkerIcon({
              type: isTerminus ? (index === 0 ? 'depart' : 'arrivee') : 'line-stop',
              mainLabel: ordre,
              subLabel: stopName,
              color,
              size: isTerminus ? 34 : 28,
            })}
            title={stopName}
          />
        );
      })}
    </>
  );
}

// Extrait [lat, lng] d'un objet arrêt (ArretObject du backend)
function extractCoords(stop) {
  const inner = stop?.arret && (stop.ordre || stop.ordre === 0) ? stop.arret : stop;
  const lat = Number(inner?.lat ?? inner?.latitude);
  const lng = Number(inner?.lng ?? inner?.longitude);
  return (isFinite(lat) && isFinite(lng)) ? [lat, lng] : null;
}

// Découpe les positions du fallback OSRM entre deux points pour le suivi routier
function sliceFallback(fallbackPositions, fromPos, toPos) {
  if (!fallbackPositions?.length || fallbackPositions.length < 2 || !fromPos || !toPos) return null;
  const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const firstIdx = fallbackPositions.reduce((best, p, i) =>
    dist(p, fromPos) < dist(fallbackPositions[best], fromPos) ? i : best, 0);
  const lastIdx = fallbackPositions.reduce((best, p, i) =>
    dist(p, toPos) < dist(fallbackPositions[best], toPos) ? i : best, 0);
  const from = Math.min(firstIdx, lastIdx);
  const to = Math.max(firstIdx, lastIdx);
  if (to <= from) return null;
  return fallbackPositions.slice(from, to + 1);
}

export function SegmentRoutePolyline({ segment, arrets, segIdx, fallbackPositions }) {
  // Positions des arrêts du segment (extraites directement du step.arret)
  const stopPositions = useMemo(() => {
    if (!segment?.stops?.length) return [];
    return segment.stops.map((s) => extractCoords(s.arret || s)).filter(Boolean);
  }, [segment]);

  // Marche à pied : ligne droite entre les deux arrêts
  if (segment?.mode === 'walk') {
    const posFrom = segment.from ? extractCoords(segment.from) : null;
    const posTo = segment.to ? extractCoords(segment.to) : null;
    if (!posFrom || !posTo) return null;
    return (
      <>
        <Polyline
          key={`walk-${segIdx}`}
          positions={[posFrom, posTo]}
          color="#7A4D12"
          weight={5}
          opacity={0.95}
          dashArray="2, 12"
          zIndexOffset={100}
        />
        <FootstepMarkers positions={[posFrom, posTo]} />
      </>
    );
  }

  if (!segment || stopPositions.length < 2) return null;

  const firstPos = stopPositions[0];
  const lastPos = stopPositions[stopPositions.length - 1];
  const positions = sliceFallback(fallbackPositions, firstPos, lastPos) || stopPositions;

  const color = segment.color || getLineColor(segment.line);

  return (
    <Polyline
      key={`seg-${segment.line?.id || segIdx}-${color}`}
      positions={positions}
      color={color}
      weight={6}
      opacity={1}
    />
  );
}

// Affiche tous les segments d'un trajet complet sur la carte.
export function TripRouteLayers({ trajet, arrets, lignes }) {
  const segments = useMemo(() => parseTrajetSegments(trajet), [trajet]);
  const rawFallback = useMemo(() => getTripPositions(trajet, arrets), [trajet, arrets]);
  const fallbackPositions = useRoadRoutePositions(rawFallback, true);

  return (
    <>
      {segments.map((segment, segIdx) => {
        const segColor = segment.color || getLineColor(segment.line);
        return (
          <SegmentRoutePolyline
            key={`${segment.mode || 'seg'}-${segment.line?.id || segIdx}-${segColor}`}
            segment={segment}
            arrets={arrets}
            segIdx={segIdx}
            fallbackPositions={fallbackPositions}
          />
        );
      })}
    </>
  );
}

// Gère les clics sur la carte pour enregistrer les coordonnées lors de la calibration.
export function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}
