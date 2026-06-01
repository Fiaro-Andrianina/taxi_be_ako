import { getLineColor, getLineEnds, getLineStops } from '../utils/lines';

export default function LineCard({ line, onClick, onHighlight, active, t }) {
  return (
    <div className={`line-card-web-wrap ${active ? 'active' : ''}`}>
      <button
        type="button"
        className="line-card-web"
        style={{ borderColor: active ? getLineColor(line) : undefined }}
        onClick={onClick}
        title={t?.cliquer_ligne_details || 'Voir les détails de la ligne'}
      >
        <span className="line-card-num" style={{ backgroundColor: getLineColor(line) }}>{line.numero}</span>
        <strong>{line.nom}</strong>
        <small>{getLineEnds(line)}</small>
        <em>{line.nb_arrets || getLineStops(line).length} {t?.arrets || 'arrêts'}</em>
      </button>
      {onHighlight && (
        <button type="button" className="line-card-details" onClick={onHighlight}>
          {t?.details || 'Détails'}
        </button>
      )}
    </div>
  );
}
