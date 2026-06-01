import React from 'react';
import ConnectionCard from '../components/ConnectionCard';

export default function Sidebar({
  view,
  setView,
  showSearch,
  showAdmin,
  connection,
  refreshData,
  user,
  setShowSettings,
  handleLogout,
  t
}) {
  return (
    <aside className="sidebar">
      <button className="sidebar-brand" onClick={showSearch}>
        <span>TA</span>
        <strong>Taxi be Ako</strong>
      </button>
      <nav className="sidebar-nav">
        <button className={view === 'search' ? 'active' : ''} onClick={showSearch}>{t.recherche}</button>
        <button className={view === 'lines' ? 'active' : ''} onClick={() => setView('lines')}>{t.lignes}</button>
        {showAdmin && (
          <button className={view === 'diagnostic' ? 'active' : ''} onClick={() => setView('diagnostic')}>{t.diagnostic}</button>
        )}
        {showAdmin && (
          <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>{t.admin}</button>
        )}
      </nav>
      <ConnectionCard connection={connection} onRefresh={refreshData} t={t} />
      {user && (
        <div className="feat-mini">
          <span className="brand-title">{user.nom || user.username}</span>
          <div className="topbar-actions">
            <button className="nav-item" onClick={() => setShowSettings(true)} title={t.parametres}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <button className="nav-item" onClick={handleLogout}>{t.deconnexion}</button>
          </div>
        </div>
      )}
    </aside>
  );
}
