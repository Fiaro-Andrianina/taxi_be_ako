import { useState } from 'react';

export default function ConnectionCard({ connection, onRefresh, t }) {
  const [showDetails, setShowDetails] = useState(false);

  const isOnline = connection.state === 'online';
  const isOffline = connection.state === 'offline';
  const statusLabel = isOnline
    ? (t.etat_en_ligne || 'Vous êtes en ligne')
    : isOffline
      ? (t.etat_hors_ligne || 'Vous êtes hors ligne')
      : t[connection.label] || connection.label;

  return (
    <div className={`connection-card ${connection.state}`}>
      <span className="connection-dot" />
      <strong>{statusLabel}</strong>
      <button className="connection-details-toggle" onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? t.cacher || 'Cacher' : t.details || 'Détails'} ▼
      </button>
      {showDetails && (
        <div className="connection-detail">
          {connection.detail}
        </div>
      )}
      <button className="connection-refresh" onClick={onRefresh}>
        {t.verifier}
      </button>
    </div>
  );
}
