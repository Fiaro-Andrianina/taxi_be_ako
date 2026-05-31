import Metric from './Metric';

export default function DiagnosticView({ connection, arrets, lignes, onRefresh, t }) {
  return (
    <section className="web-panel diagnostic-panel">
      <div className="panel-title">
        <span>{t.diagnostic}</span>
        <h2>{t.etat_api}</h2>
      </div>
      <div className={`diagnostic-status ${connection.state}`}>
        <strong>{connection.label}</strong>
        <p>{connection.detail}</p>
      </div>
      <div className="diagnostic-grid">
        <Metric label={t.backend_attendu} value="127.0.0.1:8000" />
        <Metric label={t.endpoint_donnees} value="/api/sync/" />
        <Metric label={t.arrets_charges} value={arrets.length} />
        <Metric label={t.lignes_chargees} value={lignes.length} />
      </div>
      <div className="web-alert">
        {t.si_statut_reste}
        <code>python manage.py runserver 127.0.0.1:8000</code>
      </div>
      <button className="primary-btn" onClick={onRefresh}>{t.relancer_le_diagnostic}</button>
    </section>
  );
}
