import { useState } from 'react';

export default function ConnectionCard({ connection, onRefresh, t }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`connection-card ${connection.state}`}>
      <span className="connection-dot" />
      <strong>{t[connection.label] || connection.label}</strong>
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
