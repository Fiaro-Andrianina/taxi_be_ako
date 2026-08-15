import L from 'leaflet';
import { Marker } from 'react-leaflet';
import { coordKey, interpolatePosition } from '../utils/geo';
import { getLineColor } from '../utils/lines';
import { resolveStopCoords } from '../utils/positions';

const SPIDERFY_RADIUS = 38;

// Function to calculate relative luminance of a color
// Returns a value between 0 and 1, where 0 is black and 1 is white
function getLuminance(color) {
  // Handle hex colors
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return luminanceFromRgb(r, g, b);
  }

  // Handle rgb() and rgba() colors
  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.?\d*))?\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return luminanceFromRgb(r, g, b);
  }

  // For other color formats (named colors, hsl, etc.), we can't easily compute luminance
  // Return a middle value so we default to black text (safe for light colors)
  // In practice, most of our colors should be hex or rgb
  return 0.5;
}

// Helper function to calculate luminance from RGB values
function luminanceFromRgb(r, g, b) {
  // Convert to sRGB
  const [rs, gs, bs] = [r, g, b].map(val => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  // Calculate luminance using ITU BT.709 coefficients
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Ensure color is opaque by forcing alpha to 1 if needed
function ensureOpaqueColor(color) {
  if (typeof color !== 'string') {
    // If it's not a string, return as-is (hopefully it's a valid color object elsewhere)
    return color;
  }

  const trimmed = color.trim();

  // Handle transparent named color
  if (trimmed.toLowerCase() === 'transparent') {
    // Fallback to black - we'll let the text color logic choose appropriate contrast
    return '#000000';
  }

  // Handle hex colors (including 3, 4, 6, 8 digit formats)
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    // Expand short forms
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    } else if (hex.length === 4) {
      hex = hex.split('').map(c => c + c).join('');
    }
    // Now hex should be 6 or 8 characters (RRGGBB or RRGGBBAA)
    if (hex.length === 6 || hex.length === 8) {
      // Return RGB part only, discarding alpha
      return '#' + hex.slice(0, 6);
    }
    // If not a valid hex length, return original (might be invalid but we'll let it through)
    return trimmed;
  }

  // Handle rgb() and rgba() functional notation (both old and new syntax)
  // Old: rgb(255, 255, 255) or rgba(255, 255, 255, 0.5)
  // New: rgb(255 255 255) or rgba(255 255 255 / 0.5) or rgb(255 255 255 / 50%)
  const rgbMatch = trimmed.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s]+\/?[\s]*(\d+\.?\d*))?\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Handle hsl() and hsla() functional notation (both old and new syntax)
  // Old: hsl(120, 100%, 50%) or hsla(120, 100%, 50%, 0.5)
  // New: hsl(120 100% 50%) or hsla(120 100% 50% / 0.5) or hsl(120 100% 50% / 50%)
  const hslMatch = trimmed.match(/^hsla?\((\d+)[,\s]+(\d+%)[,\s]+(\d+%)(?:[,\s]+\/?[\s]*(\d+\.?\d*))?\)$/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]);
    const s = hslMatch[2];
    const l = hslMatch[3];
    return `hsl(${h}, ${s}, ${l})`;
  }

  // For other formats (named colors, etc.), return as-is
  // We assume they are opaque (like 'red', 'blue', etc.)
  return trimmed;
}

export function buildMarkerOffsets(arrets) {
  const positions = new Map();

  arrets.forEach(a => {
    if (typeof a.lat !== 'number' || typeof a.lng !== 'number') return;
    const key = coordKey(a.lat, a.lng, 1e5);
    if (!positions.has(key)) positions.set(key, []);
    positions.get(key).push(a);
  });

  const offsets = new Map();
  positions.forEach((stops) => {
    if (stops.length <= 1) return;
    stops.forEach((stop, i) => {
      if (i === 0) {
        offsets.set(stop.id, { x: 0, y: 0 });
        return;
      }
      const angle = -Math.PI / 2 + (i * (2 * Math.PI)) / stops.length;
      const totalR = SPIDERFY_RADIUS * Math.min(stops.length, 10) * 0.65;
      offsets.set(stop.id, {
        x: Math.round(totalR * Math.cos(angle)),
        y: Math.round(totalR * Math.sin(angle)),
      });
    });
  });

  return offsets;
}

export function createMapMarkerIcon({ type, mainLabel, subLabel, color, size = 28, offset = null }) {
  const safeMain = String(mainLabel ?? '?');
  const safeSub = subLabel ? String(subLabel) : '';
  const subHtml = safeSub
    ? `<span class="marker-sublabel" title="${safeSub}">${safeSub.length > 14 ? `${safeSub.slice(0, 14)}…` : safeSub}</span>`
    : '';

  // Ensure color is opaque to prevent transparency issues
  const opaqueColor = ensureOpaqueColor(color);
  
  // Determine text color based on background luminance for better contrast
  const luminance = getLuminance(opaqueColor);
  const textColor = luminance > 0.5 ? '#000' : '#fff';

  const offsetStyle = offset
    ? `transform: translate(${offset.x}px, ${offset.y}px);`
    : '';

  return L.divIcon({
    className: `custom-marker custom-marker-${type}`,
    html: `<div class="map-marker-wrap" style="--marker-color:${opaqueColor};${offsetStyle}">
      <div class="custom-marker-inner" title="${safeSub || safeMain}" style="background:${opaqueColor};width:${size}px;height:${size}px; color: ${textColor};">${safeMain}</div>
      ${subHtml}
    </div>`,
    iconSize: [size, size + (safeSub ? 18 : 0)],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createFootstepIcon(index) {
  return L.divIcon({
    className: 'walking-footstep-marker',
    html: `<span style="transform:rotate(${index % 2 === 0 ? -18 : 18}deg)">&#128099;</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function FootstepMarkers({ positions }) {
  if (positions.length < 2) return null;
  const from = positions[0];
  const to = positions[positions.length - 1];
  return [0.22, 0.42, 0.62, 0.82].map((ratio, index) => (
    <Marker
      key={`footstep-${ratio}`}
      position={interpolatePosition(from, to, ratio)}
      icon={createFootstepIcon(index)}
      interactive={false}
    />
  ));
}

export function EnhancedTripMarkers({ trajet, arrets, departId, arriveeId }) {
  if (!trajet) return null;

  const departCoords = resolveStopCoords(trajet.depart, arrets);
  const arriveeCoords = resolveStopCoords(trajet.arrivee, arrets);
  const departName = trajet.depart?.nom || 'Départ';
  const arriveeName = trajet.arrivee?.nom || 'Arrivée';

  const markerOccurrenceByStop = new Map();
  const markerIndexByCoord = new Map();

  const intermediateMarkers = (trajet.arrets || []).map((step, idx) => {
    const stop = step.arret;
    if (!stop) return null;

    const depNom = trajet.depart?.nom;
    const arrNom = trajet.arrivee?.nom;
    const isDepartOrArrivee =
      (stop.id && (stop.id === departId || stop.id === arriveeId)) ||
      (stop.nom &&
        ((depNom && stop.nom.toLowerCase() === depNom.toLowerCase()) ||
          (arrNom && stop.nom.toLowerCase() === arrNom.toLowerCase())));
    if (isDepartOrArrivee) return null;

    const coords = resolveStopCoords(stop, arrets);
    if (!coords) return null;

    const stopKey = stop.id ? `id:${stop.id}` : `nom:${(stop.nom || '').toLowerCase()}`;
    const stopOccurrence = markerOccurrenceByStop.get(stopKey) || 0;
    markerOccurrenceByStop.set(stopKey, stopOccurrence + 1);

    const coordKey = `${coords[0].toFixed(6)}:${coords[1].toFixed(6)}`;
    const coordOccurrence = markerIndexByCoord.get(coordKey) || 0;
    markerIndexByCoord.set(coordKey, coordOccurrence + 1);

    const angle = (coordOccurrence * Math.PI) / 2;
    const offset = coordOccurrence === 0 ? null : {
      x: Math.round(Math.cos(angle) * 18),
      y: Math.round(Math.sin(angle) * 18),
    };

    const isCorrespondance = step.est_correspondance || (step.lignes && step.lignes.length > 1);
    const type = isCorrespondance ? 'correspondance' : 'intermediate';
    const stopName = typeof stop.nom === 'string' ? stop.nom : `Arrêt #${stop.id || '?'}`;
    const lineColor = step.lignes?.[0] ? getLineColor(step.lignes[0]) : '#1565C0';
    const markerLabel =
      stopOccurrence > 0
        ? `${idx + 1}/${stopOccurrence + 1}`
        : idx + 1;

    return (
      <Marker
        key={`intermediate-${stop.id || stop.nom || 'stop'}-${idx}`}
        position={coords}
        icon={createMapMarkerIcon({
          type,
          mainLabel: markerLabel,
          subLabel: stopName,
          color: isCorrespondance ? '#FF9800' : lineColor,
          size: isCorrespondance ? 30 : 28,
          offset,
        })}
        title={stopName}
      />
    );
  });

  return (
    <>
      {departCoords && (
        <Marker
          key="depart"
          position={departCoords}
          icon={createMapMarkerIcon({
            type: 'depart',
            mainLabel: 'D',
            subLabel: departName,
            color: '#4CAF50',
            size: 38,
          })}
          title={departName}
        />
      )}
      {arriveeCoords && (
        <Marker
          key="arrivee"
          position={arriveeCoords}
          icon={createMapMarkerIcon({
            type: 'arrivee',
            mainLabel: 'A',
            subLabel: arriveeName,
            color: '#f44336',
            size: 38,
          })}
          title={arriveeName}
        />
      )}
      {intermediateMarkers}
    </>
  );
}
