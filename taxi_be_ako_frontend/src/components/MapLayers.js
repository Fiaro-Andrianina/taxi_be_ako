import { useMemo } from 'react';
import { Marker, Polyline, useMapEvents } from 'react-leaflet';
import { getLineColor, getLineStops, findFullLine, parseTrajetSegments } from '../utils/lines';
import { getLineRouteData, getSegmentRouteData, getStopPosition } from '../utils/positions';
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
              opacity={0.4}
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
            title={`${ordre}. ${stopName} — Ligne ${line.numero}`}
          />
        );
      })}
    </>
  );
}

// Affiche un segment de trajet, soit bus soit marche, avec le style approprié.
export function SegmentRoutePolyline({ segment, arrets, lignes, segIdx }) {
  const routeData = useMemo(
    () => getSegmentRouteData(segment, arrets, lignes),
    [segment, arrets, lignes]
  );
  const positions = useRoadRoutePositions(routeData.positions, !routeData.hasTrace);
  if (!segment || positions.length < 2) return null;
  if (segment.mode === 'walk') {
    return (
      <>
        <Polyline
          key={`walk-${segIdx}`}
          positions={positions}
          color="#7A4D12"
          weight={5}
          opacity={0.95}
          dashArray="2, 12"
          zIndexOffset={100}
        />
        <FootstepMarkers positions={positions} />
      </>
    );
  }

  const displayLine = findFullLine(segment.line, lignes) || segment.line;
  const color = getLineColor(displayLine);

  return (
    <Polyline
      key={`seg-${segment.line?.id || segIdx}`}
      positions={positions}
      color={color}
      weight={6}
      opacity={0.96}
      zIndexOffset={100}
    />
  );
}

// Affiche tous les segments d'un trajet complet sur la carte.
export function TripRouteLayers({ trajet, arrets, lignes }) {
  const segments = useMemo(() => parseTrajetSegments(trajet), [trajet]);
  if (!segments.length) return null;

  return (
    <>
      {segments.map((segment, segIdx) => (
        <SegmentRoutePolyline
          key={`${segment.mode || 'seg'}-${segment.line?.id || segIdx}`}
          segment={segment}
          arrets={arrets}
          lignes={lignes}
          segIdx={segIdx}
        />
      ))}
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
