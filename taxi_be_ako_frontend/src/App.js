import React from 'react';
import './App.css';
import 'leaflet/dist/leaflet.css';
import { LanguageProvider } from './LanguageContext';
import AppContent from './app/AppContent';

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
