import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';

export default function MapBounds({ arrets, focusPositions = [] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (!focusPositions.length) {
      const allLatLngs = arrets
        .filter(a => typeof a.lat === 'number' && typeof a.lng === 'number')
        .map(a => L.latLng(a.lat, a.lng));
      if (allLatLngs.length) {
        const bounds = L.latLngBounds(allLatLngs);
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    } else if (focusPositions.length > 1) {
      const latlngs = focusPositions.map(pos => L.latLng(pos[0], pos[1]));
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (focusPositions.length === 1) {
      const latlng = L.latLng(focusPositions[0][0], focusPositions[0][1]);
      map.setView(latlng, 13);
    }
  }, [arrets, focusPositions, map]);

  return null;
}
