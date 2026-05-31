import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('react-leaflet', () => {
  const React = require('react');
  return {
    MapContainer: ({ children }) => React.createElement('div', { 'data-testid': 'map' }, children),
    TileLayer: () => null,
    Polyline: () => null,
    Marker: () => null,
    useMap: () => ({
      fitBounds: jest.fn(),
      setView: jest.fn(),
    }),
    useMapEvents: () => null,
  };
}); 

jest.mock('leaflet', () => ({
  latLng: (lat, lng) => ({ lat, lng }),
  latLngBounds: (points) => ({ points }),
}));

test('renders the login screen after auth check', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false });

  render(<App />);

  await waitFor(() => {
    // Selon la langue chargée, le titre peut être en français ("Se connecter")
    // ou en malgache ("Hiditra").
    expect(
      screen.getByRole('heading', { name: /(se connecter|hiditra)/i })
    ).toBeInTheDocument();
  });
});
