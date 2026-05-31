import { useState } from 'react';
import LineCard from './LineCard';

export default function LinesView({ lignes, onHighlightLine, onOpenLine, highlightedLineId, t }) {
  const [filter, setFilter] = useState('');
  const filteredLines = lignes.filter(line =>
    line.numero.toString().toLowerCase().includes(filter.toLowerCase()) ||
    (line.nom && line.nom.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <section className="web-panel">
      <div className="panel-title inline">
        <div>
          <span>{t.reseau}</span>
          <h2>{t.toutes_les_lignes}</h2>
        </div>
        <small>{filteredLines.length} {t.lignes}</small>
      </div>
      <div className="search-bar">
        <input
          type="text"
          placeholder={t.rechercher_une_ligne}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <p className="map-hint-text">{t.cliquer_ligne_carte || 'Cliquez sur une ligne pour l\'afficher sur la carte'}</p>
      <div className="cards-grid">
        {filteredLines.map((line) => (
          <LineCard
            key={line.id}
            line={line}
            t={t}
            active={highlightedLineId === line.id}
            onClick={() => onHighlightLine(line)}
            onDetails={() => onOpenLine(line)}
          />
        ))}
      </div>
    </section>
  );
}
