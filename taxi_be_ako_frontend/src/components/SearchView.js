import { useMemo, useState } from 'react';
import SelectStop from './SelectStop';
import LineCard from './LineCard';
import RouteResult from './RouteResult';
import Metric from './Metric';
import { getLinesServingQuery, getStopKey, getStopNameValue, getLineColor } from '../utils/lines';

export default function SearchView({
  arrets,
  lignes,
  depart,
  arrivee,
  setDepart,
  setArrivee,
  trajet,
  loading,
  routeError,
  routeSuggestions,
  onSearch,
  onHighlightLine,
  onSelectAlternative,
  onOpenLine,
  highlightedLineId,
  t,
}) {
  const [passageQuery, setPassageQuery] = useState('');
  const searchedPassage = passageQuery.trim();
  const passageResults = useMemo(
    () => getLinesServingQuery(lignes, searchedPassage),
    [lignes, searchedPassage]
  );

  return (
    <div className="overlay-grid">
      <section className="panel route-form-panel">
        <div className="panel-title">
          <span>{t.recherche}</span>
          <h2>{t.itineraire}</h2>
        </div>
        <form className="search-form" onSubmit={onSearch}>
          <SelectStop label={t.depart} value={depart} arrets={arrets} onChange={setDepart} t={t} />
          <SelectStop label={t.destination} value={arrivee} arrets={arrets} onChange={setArrivee} t={t} />
          <button className="primary-btn full" disabled={loading}>
            {loading ? t.chargement : t.trouver}
          </button>
        </form>
        <div className="passage-search-panel">
          <div className="panel-title compact-title">
            <span>{t.point_de_passage || 'Point de passage'}</span>
            <h3>{t.lignes_qui_desservent || 'Lignes qui desservent un arrêt'}</h3>
          </div>
          <SelectStop
            label={t.lieu_ou_arret || 'Lieu ou arrêt'}
            value={passageQuery}
            arrets={arrets}
            onChange={setPassageQuery}
            t={t}
          />
          {searchedPassage && (
            <div className="passage-results">
              <div className="passage-results-header">
                <strong>
                  {passageResults.length} {passageResults.length > 1 ? (t.lignes || 'lignes') : (t.ligne || 'ligne')}
                </strong>
                <span>{t.desservent_ce_point || 'desservent ce point'}</span>
              </div>
              {passageResults.length > 0 ? (
                <div className="cards-grid passage-cards">
                  {passageResults.map(({ line, matchedStops }) => (
                    <div className="passage-line-result" key={line.id}>
                      <LineCard
                        line={line}
                        t={t}
                        active={highlightedLineId === line.id}
                        onClick={() => onHighlightLine(line)}
                        onDetails={() => onOpenLine(line)}
                      />
                      <div className="matched-stops">
                        <span>{t.arrets_correspondants || 'Arrêts correspondants'} :</span>
                        {matchedStops.slice(0, 4).map((stop) => (
                          <button
                            type="button"
                            key={`${line.id}-${getStopKey(stop) || getStopNameValue(stop)}`}
                            onClick={() => {
                              setPassageQuery(getStopNameValue(stop));
                              onHighlightLine(line);
                            }}
                          >
                            {getStopNameValue(stop)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-stops">{t.aucune_ligne_point || 'Aucune ligne ne dessert ce point.'}</div>
              )}
            </div>
          )}
        </div>
{routeSuggestions && (
  <div className="route-error-block">
    {routeError ? <div className="metric error">{routeError}</div> : null}
    {routeSuggestions.alternatives?.length > 0 && (
      <div className="route-suggestions">
        <p>{routeError ? t.trajet_indisponible || t.aucun_trajet_trouve || 'Trajet indisponible sur cet axe.' : t.alternatives_disponibles || 'Aucun trajet direct, voir les alternatives suivantes.'}</p>
        {routeSuggestions.alternatives?.length > 0 && (
          <div>
            <strong>{t.correspondances_possibles || 'Correspondances possibles'} :</strong>
            <div className="route-alternatives">
              {routeSuggestions.alternatives.map((alt, index) => {
const transferName = getStopNameValue(alt.transferStop) || t.arret_correspondance || 'Arrêt de correspondance';
                 const estimatedDuration = alt.metrics?.totalMinutes ?? 30;
                 const estimatedDistance = alt.metrics?.distanceKm ?? 8;
                 const walkDepMinutes = alt.metrics?.walkDepMinutes ?? 0;
                 const walkArrMinutes = alt.metrics?.walkArrMinutes ?? 0;
                 const walkDepKm = alt.metrics?.walkDepKm ?? 0;
                 const walkArrKm = alt.metrics?.walkArrKm ?? 0;
                 const boardStop = alt.metrics?.boardStop || routeSuggestions?.depStop;
                 const alightStop = alt.metrics?.alightStop || routeSuggestions?.arrStop;
                
                const nbChangements = alt.metrics?.nbChangements ?? 1;

                return (
                  <div className="route-alternative-card" key={`${alt.departLine.id}-${alt.arriveeLine.id}-${index}`}>
                    <div className="route-header">
                      <div className="panel-title">
                        <span>{t.proposition} {index + 1}</span>
                        {index === 0 && (
                          <span className="route-badge">{
                            t.alternative_recommandee || 'Alternative recommandée'
                          }</span>
                        )}
                      </div>
                            <button
                              type="button"
                              className="line-highlight-btn compact"
                              onClick={() => onSelectAlternative?.(alt)}
                              style={{ borderColor: getLineColor(alt.departLine), color: getLineColor(alt.departLine) }}
                            >
                              <small>{t.voir_sur_carte || 'Voir sur la carte'}</small>
                            </button>
                    </div>
                    
                    <div className="route-metrics">
                      <Metric label={t.duree} value={`${estimatedDuration} min`} />
                      <Metric label={t.distance} value={`${estimatedDistance} km`} />
                      <Metric label={t.changements} value={
                        nbChangements > 0 ? nbChangements : t.sans_changement || '0'
                      } />
                    </div>
                    
                    <div className="route-instructions">
                      {/* Marche initiale si nécessaire */}
                      {walkDepMinutes > 0 && (
                        <div key={`walk-start-${index}`} className="instruction-walk highlight-walk">
                          <span className="walk-icon">👣</span>
                          <div>
                            <strong>{t.marche_jusqu_au_depart || 'Marchez jusqu\'au départ'}</strong>
                            <div className="transfer-details">
                              <span>
                                {Math.round(walkDepKm * 1000)} m, {walkDepMinutes} min
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Première ligne de bus */}
                      <div key={`segment-1-${index}`} className="instruction-segment first-segment"
                           style={{ borderLeftColor: getLineColor(alt.departLine) }}>
                        <div className="instruction-header">
                          <button
                            type="button"
                            className={`line-highlight-btn compact ${highlightedLineId === alt.departLine.id ? 'active' : ''}`}
                            onClick={() => onHighlightLine(alt.departLine)}
                            style={{ borderColor: getLineColor(alt.departLine) }}
                          >
                            <span style={{ backgroundColor: getLineColor(alt.departLine) }} className="line-color-dot" />
                            <span style={{ color: getLineColor(alt.departLine) }}>
                              <strong>{alt.departLine.numero}</strong>
                            </span> {alt.departLine.nom}
                            <small>{t.voir_sur_carte || 'Carte'}</small>
                          </button>
                          {alt.departLine.arrets && alt.departLine.arrets.length > 0 && (
                            <span className="instruction-detail">
                              {getStopNameValue(boardStop) || t.depart} 
                              → {getStopNameValue(alt.transferStop) || transferName}
                            </span>
                          )}
                        </div>
                        <div className="segment-stops">
                          {/* Simplified stops display */}
                          <div key={`stop-1-${index}`} className="segment-stop stop-depart">
                            <span className="stop-order-badge" style={{ backgroundColor: getLineColor(alt.departLine) }}>1</span>
                            <span>{getStopNameValue(boardStop) || t.depart}</span>
                          </div>
                          <div key={`stop-2-${index}`} className="segment-stop stop-transfer">
                            <span className="stop-order-badge" style={{ backgroundColor: getLineColor(alt.departLine) }}>2</span>
                            <span>{transferName}</span>
                            <em className="stop-role">{t.correspondance_label || 'Correspondance'}</em>
                          </div>
                        </div>
                      </div>
                      
                      {/* Correspondance entre deux lignes */}
                      <div key={`transfer-${index}`} className="instruction-transfer highlight-transfer">
                        <span className="transfer-icon">🔄</span>
                        <div>
                          <strong>{t.changements}</strong> {transferName}
                        </div>
                      </div>
                      
                      {/* Deuxième ligne de bus */}
                      <div key={`segment-2-${index}`} className="instruction-segment"
                           style={{ borderLeftColor: getLineColor(alt.arriveeLine) }}>
                        <div className="instruction-header">
                          <button
                            type="button"
                            className={`line-highlight-btn compact ${highlightedLineId === alt.arriveeLine.id ? 'active' : ''}`}
                            onClick={() => onHighlightLine(alt.arriveeLine)}
                            style={{ borderColor: getLineColor(alt.arriveeLine) }}
                          >
                            <span style={{ backgroundColor: getLineColor(alt.arriveeLine) }} className="line-color-dot" />
                            <span style={{ color: getLineColor(alt.arriveeLine) }}>
                              <strong>{alt.arriveeLine.numero}</strong>
                            </span> {alt.arriveeLine.nom}
                            <small>{t.voir_sur_carte || 'Carte'}</small>
                          </button>
                          {alt.arriveeLine.arrets && alt.arriveeLine.arrets.length > 0 && (
                            <span className="instruction-detail">
                              {transferName} 
                              → {getStopNameValue(alightStop) || t.destination}
                            </span>
                          )}
                        </div>
                        <div className="segment-stops">
                          <div key={`stop-3-${index}`} className="segment-stop stop-depart">
                            <span className="stop-order-badge" style={{ backgroundColor: getLineColor(alt.arriveeLine) }}>1</span>
                            <span>{transferName}</span>
                          </div>
                          <div key={`stop-4-${index}`} className="segment-stop stop-arrivee">
                            <span className="stop-order-badge" style={{ backgroundColor: getLineColor(alt.arriveeLine) }}>2</span>
                            <span>{getStopNameValue(alightStop) || t.destination}</span>
                            <em className="stop-role">{t.destination}</em>
                          </div>
                        </div>
                      </div>
                      
                      {/* Marche finale si nécessaire */}
                      {walkArrMinutes > 0 && (
                        <div key={`walk-end-${index}`} className="instruction-walk highlight-walk">
                          <span className="walk-icon">👣</span>
                          <div>
                            <strong>{t.marche_jusqu_a_destination || 'Marchez jusqu\'à destination'}</strong>
                            <div className="transfer-details">
                              <span>
                                {Math.round(walkArrKm * 1000)} m, {walkArrMinutes} min
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {routeSuggestions.depLines?.length > 0 && (
          <div>
            <strong>{t.lignes_au_depart || 'Lignes au départ'} :</strong>
            <div className="suggestion-chips">
              {routeSuggestions.depLines.map((l) => (
                <button
                  key={`dep-${l.id}`}
                  type="button"
                  className="suggestion-chip"
                  style={{ borderColor: getLineColor(l) }}
                  onClick={() => onHighlightLine(l)}
                >
                  {l.numero}
                </button>
              ))}
            </div>
          </div>
        )}
        {routeSuggestions.arrLines?.length > 0 && (
          <div>
            <strong>{t.lignes_a_arrivee || 'Lignes à l\'arrivée'} :</strong>
            <div className="suggestion-chips">
              {routeSuggestions.arrLines.map((l) => (
                <button
                  key={`arr-${l.id}`}
                  type="button"
                  className="suggestion-chip"
                  style={{ borderColor: getLineColor(l) }}
                  onClick={() => onHighlightLine(l)}
                >
                  {l.numero}
                </button>
              ))}
            </div>
          </div>
        )}
        <small>{t.cliquer_ligne_carte || 'Cliquez sur une ligne pour l\'afficher sur la carte'}</small>
      </div>
    )}
  </div>
)}
      </section>

      {trajet && (
        <section className="web-panel result-panel">
          <RouteResult
            trajet={trajet}
            t={t}
            onHighlightLine={onHighlightLine}
            highlightedLineId={highlightedLineId}
          />
        </section>
      )}

      <section className="web-panel wide">
        <div className="panel-title inline">
          <div>
            <span>{t.reseau}</span>
            <h2>{t.lignes}</h2>
          </div>
          <small>{lignes.length}</small>
        </div>
        <p className="map-hint-text">{t.cliquer_ligne_carte || 'Cliquez sur une ligne pour l\'afficher sur la carte'}</p>
        <div className="cards-grid">
          {lignes.slice(0, 6).map((line) => (
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
    </div>
  );
}
