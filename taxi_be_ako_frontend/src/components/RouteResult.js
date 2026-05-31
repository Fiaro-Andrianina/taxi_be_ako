import { getLineColor, isDirectTrip, parseTrajetSegments } from '../utils/lines';
import Metric from './Metric';

export default function RouteResult({ trajet, t, onHighlightLine, highlightedLineId }) {
  const direct = isDirectTrip(trajet);
  const segments = parseTrajetSegments(trajet);
  const steps = [];

  if (direct) {
    const mainSegment = segments.length === 1
      ? segments[0]
      : {
          line: trajet.lignes?.[0],
          stops: (trajet.arrets || []).map((step, idx) => ({
            arret: step.arret,
            ordre: idx + 1,
            role: idx === 0 ? 'depart' : idx === trajet.arrets.length - 1 ? 'arrivee' : 'intermediate',
          })),
        };
    if (mainSegment?.line) {
      steps.push({ type: 'segment', line: mainSegment.line, steps: mainSegment.stops });
    }
  } else {
    segments.forEach((segment, segIdx) => {
      if (segment.mode === 'walk') {
        steps.push({ type: 'walk', ...segment });
        return;
      }
      steps.push({ type: 'segment', line: segment.line, steps: segment.stops });
      if (segIdx < segments.length - 1) {
        const nextSegment = segments.slice(segIdx + 1).find((item) => item.mode !== 'walk');
        const transferStop = segment.stops[segment.stops.length - 1];
        const nextLine = nextSegment?.line;
        if (segments[segIdx + 1]?.mode === 'walk') return;
        steps.push({
          type: 'transfer',
          arret: transferStop?.arret,
          arrivalLine: segment.line,
          departureLine: nextLine,
          lignes: [segment.line, nextLine].filter(Boolean),
        });
      }
    });
  }

  const isOptimal = trajet.est_optimal ? trajet.est_optimal : false;

  const departLine = steps.find(s => s.type === 'segment')?.line || trajet.lignes?.[0] || null;
  const arriveeLine = [...steps].reverse().find(s => s.type === 'segment')?.line || trajet.lignes?.slice(-1)[0] || null;

  const getStopName = (stop) => {
    if (!stop) return null;
    if (typeof stop === 'string') return stop;
    if (typeof stop.nom === 'string') return stop.nom;
    if (stop.id) return `Arrêt #${stop.id}`;
    return null;
  };

  const departName = getStopName(trajet.depart) || 'Départ';
  const arriveeName = getStopName(trajet.arrivee) || 'Arrivée';

  const getSafeStopName = (stop) => {
    if (!stop) return 'Arrêt inconnu';
    if (typeof stop.nom === 'string') return stop.nom;
    if (stop.id) return `Arrêt #${stop.id}`;
    return 'Arrêt inconnu';
  };

  return (
    <div className="route-result">
      <div className="route-header">
        <div className="panel-title">
           <span>{t.itineraire_optimal}</span>
           <h2>{departName} → {arriveeName}</h2>
        </div>
        {isOptimal && (
          <div className="optimal-badge">
            <span>★ {t.optimal}</span>
          </div>
        )}
        {direct ? (
          <div className="route-mode-banner route-mode-direct">
            <strong>{t.trajet_direct || 'Trajet direct'}</strong>
            <p>{t.trajet_direct_desc || 'Un seul bus suffit, sans changement.'}</p>
            {departLine && (
              <button
                type="button"
                className={`line-highlight-btn ${highlightedLineId === departLine.id ? 'active' : ''}`}
                style={{ borderColor: getLineColor(departLine), color: getLineColor(departLine) }}
                onClick={() => onHighlightLine?.(departLine)}
              >
                <span className="line-color-dot" style={{ backgroundColor: getLineColor(departLine) }} />
                Ligne <strong>{departLine.numero}</strong> — {departLine.nom}
                <small>{t.voir_sur_carte || 'Voir sur la carte'}</small>
              </button>
            )}
          </div>
        ) : (
          <div className="route-mode-banner route-mode-transfer">
            <strong>{t.trajet_avec_correspondances || 'Trajet avec correspondances'}</strong>
            <p>{t.trajet_avec_correspondances_desc || 'Changez de bus aux arrêts indiqués.'}</p>
          </div>
        )}
        {(departLine || arriveeLine) && !direct && (
          <div className="route-lines-info">
            {departLine && (
              <div className="route-line-info depart-line">
                <span>{t.depart_en_ligne || 'Départ en ligne'}</span>
                <button
                  type="button"
                  className={`line-highlight-btn inline ${highlightedLineId === departLine.id ? 'active' : ''}`}
                  onClick={() => onHighlightLine?.(departLine)}
                >
                  <strong style={{ color: getLineColor(departLine) }}>{departLine.numero}</strong> {departLine.nom}
                </button>
              </div>
            )}
            {arriveeLine && arriveeLine.id !== departLine?.id && (
              <div className="route-line-info arrivee-line">
                <span>{t.arrivee_en_ligne || 'Arrivée en ligne'}</span>
                <button
                  type="button"
                  className={`line-highlight-btn inline ${highlightedLineId === arriveeLine.id ? 'active' : ''}`}
                  onClick={() => onHighlightLine?.(arriveeLine)}
                >
                  <strong style={{ color: getLineColor(arriveeLine) }}>{arriveeLine.numero}</strong> {arriveeLine.nom}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

     <div className="route-metrics">
       <Metric label={t.duree} value={`${trajet.duree_minutes} min`} />
       <Metric label={t.distance} value={`${trajet.distance_km} km`} />
       <Metric label={t.changements} value={direct ? (t.sans_changement || '0') : trajet.nb_changements} />
     </div>

     <div className="route-instructions">
       {steps.map((step, index) => {
         if (step.type === 'segment') {
           const isFirstSegment = index === 0 && steps[0].type === 'segment';
           const lineColor = getLineColor(step.line);
           return (
             <div
               key={index}
               className={`instruction-segment ${isFirstSegment ? 'first-segment' : ''}`}
               style={{ borderLeftColor: lineColor }}
             >
               <div className="instruction-header">
                 <button
                   type="button"
                   className={`line-highlight-btn compact ${highlightedLineId === step.line.id ? 'active' : ''}`}
                   onClick={() => onHighlightLine?.(step.line)}
                   style={{ borderColor: lineColor }}
                 >
                   <span style={{ backgroundColor: lineColor }} className="line-color-dot" />
                   <span style={{ color: lineColor }}><strong>{step.line.numero}</strong></span> {step.line.nom}
                   <small>{t.voir_sur_carte || 'Carte'}</small>
                 </button>
                 {step.steps && step.steps.length > 0 && (
                   <span className="instruction-detail">
                     {getSafeStopName(step.steps[0].arret)} → {getSafeStopName(step.steps[step.steps.length - 1].arret)}
                   </span>
                 )}
               </div>
               <div className="segment-stops">
                 {step.steps.map((s, i) => {
                   const orderNum = typeof s.ordre === 'number' ? s.ordre : i + 1;
                   const stopName = getSafeStopName(s.arret);
                   const roleClass = s.role === 'depart' ? 'stop-depart' : s.role === 'arrivee' ? 'stop-arrivee' : s.role === 'correspondance' ? 'stop-transfer' : '';
                   return (
                     <div key={i} className={`segment-stop ${roleClass}`}>
                       <span className="stop-order-badge" style={{ backgroundColor: lineColor }}>{orderNum}</span>
                       <span>{stopName}</span>
                       {s.role === 'depart' && <em className="stop-role">Départ</em>}
                       {s.role === 'arrivee' && <em className="stop-role">Arrivée</em>}
                       {s.role === 'correspondance' && <em className="stop-role">Correspondance</em>}
                     </div>
                   );
                 })}
               </div>
             </div>
           );
         }

         if (step.type === 'transfer' && !direct) {
           const transferStopName = getSafeStopName(step.arret);
           return (
             <div key={index} className="instruction-transfer highlight-transfer">
               <span className="transfer-icon">🔄</span>
               <div>
                 <strong>{t.changements}</strong> {transferStopName}
                  {step.arrivalLine && step.departureLine && (
                    <div className="transfer-details">
                      <span>
                        {t.descendre_arret || 'Descendre à l\'arrêt'} {transferStopName} {t.et_prenez_bus || 'et prendre le bus'} 
                        <span style={{ color: getLineColor(step.departureLine) }}><strong>{step.departureLine.numero}</strong></span>
                      </span>
                    </div>
                  )}
                  {step.lignes.length > 1 && (
                    <div className="transfer-options">
                      <span className="transfer-label">{t.correspondance_label || 'Correspondance'}:</span>
                      {step.lignes.map(l => l.numero + ' (' + l.nom + ')').join(', ')}
                    </div>
                  )}
               </div>
             </div>
           );
         }

         if (step.type === 'walk' && !direct) {
           const fromName = getSafeStopName(step.from);
           const toName = getSafeStopName(step.to);
           const walkDuration = step.durationMinutes ? `${step.durationMinutes} min` : 'quelques minutes';
           const walkDistance = step.distanceKm ? `${Math.round(step.distanceKm * 1000)} m` : 'arrêt proche';
           const hasBusAfter = steps.slice(index + 1).some((item) => item.type === 'segment');
           return (
             <div key={index} className="instruction-walk highlight-walk">
               <span className="walk-icon">👣</span>
               <div>
                 <strong>Marchez un peu</strong>
                 <div className="transfer-details">
                   <span>
                     Descendez à {fromName}, marchez jusqu'à {toName} ({walkDistance}, {walkDuration}){hasBusAfter ? ', puis prenez le bus suivant.' : '.'}
                   </span>
                 </div>
               </div>
             </div>
           );
         }

         return null;
       })}
     </div>
   </div>
  );
}
