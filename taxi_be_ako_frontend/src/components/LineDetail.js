import { getLineStops, getLineEnds } from '../utils/lines';

export default function LineDetail({ line, onBack, t }) {
  if (!line) return null;

  return (
    <div className="home-grid">
      <section className="det-hero">
        <button className="link" onClick={onBack}>{t.retour_aux_lignes}</button>
        <span className="line-number">{line.numero}</span>
        <h2>{line.nom}</h2>
        <p>{line.description || getLineEnds(line)}</p>
      </section>
      <section className="web-panel">
        <div className="panel-title">
          <span>{t.parcours}</span>
          <h2>{line.nb_arrets || getLineStops(line).length} {t.arrets}</h2>
        </div>
        <div className="stop-list">
          {getLineStops(line).map((item, index) => {
            const stopName = item.arret?.nom || item.nom || `Arrêt #${item.id || '?'}`;
            return (
              <div className="stop-row" key={item.id || `${line.id}-${index}`}>
                <span>{item.ordre || index + 1}</span>
                <strong>{stopName}</strong>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
