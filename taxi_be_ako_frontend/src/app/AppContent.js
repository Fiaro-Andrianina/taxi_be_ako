import React from 'react';
import LoginView from '../LoginView';
import SettingsView from '../SettingsView';
import AdminView from '../AdminView';
import SearchView from '../components/SearchView';
import LinesView from '../components/LinesView';
import DiagnosticView from '../components/DiagnosticView';
import LineDetail from '../components/LineDetail';
import MainLayout from '../components/MainLayout';
import Sidebar from './Sidebar';
import { useAppLogic } from './useAppLogic';
import { api } from '../utils/api';

// Composant racine qui assemble la sidebar, la carte et les vues selon l'état.
export default function AppContent() {
  const {
    user,
    authLoading,
    view,
    setView,
    showAdmin,
    connection,
    depart,
    setDepart,
    arrivee,
    setArrivee,
    trajet,
    selectedLine,
    highlightedLine,
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
    t,
    handleLogin,
    handleLogout,
    setUser,
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
  } = useAppLogic();

  if (!authLoading && !user) {
    return <LoginView onLogin={handleLogin} t={t} />;
  }

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <div className="login-logo">
              <span>TA</span>
            </div>
            <h1>Taxi be Ako</h1>
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={setView}
        showSearch={showSearch}
        showAdmin={showAdmin}
        connection={connection}
        refreshData={refreshData}
        user={user}
        setShowSettings={setShowSettings}
        handleLogout={handleLogout}
        t={t}
      />

      <MainLayout
        arrets={arrets}
        lignes={lignes}
        trajet={trajet}
        highlightedLine={mapHighlightedLine}
        onMapMove={refreshData}
        t={t}
        calibratingArretId={calibratingArretId}
        calibPickedLatLng={calibPickedLatLng}
        setCalibratingArret={setCalibratingArretId}
        pickCalibratedCoords={pickCalibratedCoords}
        saveCalibratedArret={saveCalibratedArret}
      >
        {view === 'search' && (
          <SearchView
            arrets={arrets}
            lignes={lignes}
            depart={depart}
            arrivee={arrivee}
            setDepart={setDepart}
            setArrivee={setArrivee}
            trajet={trajet}
            loading={loading}
            routeError={routeError}
            routeSuggestions={routeSuggestions}
            onSearch={handleSearch}
            onHighlightLine={highlightLineOnMap}
            onSelectAlternative={showAlternativeOnMap}
            onOpenLine={openLine}
            highlightedLineId={highlightedLine?.id}
            t={t}
          />
        )}
        {view === 'lines' && (
          <LinesView
            lignes={lignes}
            onHighlightLine={highlightLineOnMap}
            onOpenLine={openLine}
            highlightedLineId={highlightedLine?.id}
            t={t}
          />
        )}
        {view === 'diagnostic' && (
          <DiagnosticView
            connection={connection}
            arrets={arrets}
            lignes={lignes}
            onRefresh={refreshData}
            t={t}
            isAdmin={showAdmin}
          />
        )}
        {view === 'admin' && showAdmin && (
          <AdminView
            t={t}
            arrets={arrets}
            onCalibrateStart={id => setCalibratingArretId(id)}
            onSaveCalibrated={async (arretId, newLat, newLng, newName) => {
              try {
                await api(`/api/arrets/${arretId}/`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    nom: newName,
                    latitude: newLat,
                    longitude: newLng,
                  }),
                });
                await refreshData();
              } catch (e) {
                console.error('Erreur calibration stop:', e);
                alert('Erreur: ' + (e.message || 'Impossible de sauvegarder'));
              }
            }}
            onDataChange={refreshData}
          />
        )}
        {view === 'line' && selectedLine && (
          <LineDetail line={selectedLine} onBack={() => setView('lines')} t={t} />
        )}
      </MainLayout>

      {showSettings && (
        <SettingsView
          language={language}
          onLanguageChange={setLanguage}
          onClose={() => setShowSettings(false)}
          theme={theme}
          onThemeChange={setTheme}
          user={user}
          onUserUpdate={setUser}
        />
      )}
    </div>
  );
}
