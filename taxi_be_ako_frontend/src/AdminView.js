import { useEffect, useState, useCallback } from 'react';
import './App.css';

// ── Reusable API helper (mirrors App.js) ─────────────────────────────────────
function buildApiError(error, fallback = 'Erreur API') {
  if (error?.name === 'TypeError') {
    return "Backend Django indisponible. Demarrez Django sur http://127.0.0.1:8000 puis rechargez.";
  }
  return error?.message || fallback;
}

async function api(path, options) {
  let response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
      ...options,
    });
  } catch (error) {
    error.name = 'TypeError';
    throw error;
  }
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.detail || `Erreur API ${response.status}`);
  return payload;
}

// ── Inline form row ───────────────────────────────────────────────────────────
function FormRow({ label, children }) {
  return (
    <div className="inp-wrap">
      <label>{label}</label>
      {children}
    </div>
  );
}

function InlineButton({ children, onClick, variant = 'secondary', type = 'button', disabled = false }) {
  const cls = variant === 'danger' ? 'btn-danger' : variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <button type={type} className={`btn ${cls}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// CORRECTION: Helper pour obtenir un nom d'arrêt sécurisé
function getSafeArretName(arret) {
  if (!arret) return 'Arrêt inconnu';
  if (typeof arret === 'string') return arret;
  if (typeof arret.nom === 'string') return arret.nom;
  if (arret.id) return `Arrêt #${arret.id}`;
  return 'Arrêt inconnu';
}

// CORRECTION: Helper pour formater les coordonnées
function formatCoord(value) {
  if (typeof value === 'number') return value.toFixed(6);
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? '' : num.toFixed(6);
  }
  return '';
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN  VIEW
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminView({ t, arrets = [], onCalibrateStart, onSaveCalibrated, onDataChange }) {
  const [tab, setTab] = useState('lignes');
  const [lignes, setLignes] = useState([]);
  const [arretsList, setArretsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);

  const [editLine, setEditLine] = useState(null);
  const [lineForm, setLineForm] = useState({ numero: '', nom: '', description: '' });
  const [savingLine, setSavingLine] = useState(false);

  const [editArret, setEditArret] = useState(null);
  const [arretForm, setArretForm] = useState({ nom: '', latitude: '', longitude: '' });
  const [savingArret, setSavingArret] = useState(false);
  const [arretSearch, setArretSearch] = useState('');
  const [showArretSuggestions, setShowArretSuggestions] = useState(false);

  const [lineStops, setLineStops] = useState([]);
  const [selectedLineForStops, setSelectedLineForStops] = useState(null);
  const [newStopLineId, setNewStopLineId] = useState('');
  const [newStopArretId, setNewStopArretId] = useState('');
  const [newStopOrdre, setNewStopOrdre] = useState(1);
  const [savingLineStop, setSavingLineStop] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lData, aData] = await Promise.all([
        api('/api/lignes/'),
        api('/api/arrets/'),
      ]);
      setLignes(lData || []);
      setArretsList(aData || []);
    } catch (e) {
      setError(buildApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api('/api/admin/check/')
      .then(data => setDenied(!data.is_admin))
      .catch(() => setDenied(true));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startNewLine = useCallback(() => {
    setEditLine(null);
    setLineForm({ numero: '', nom: '', description: '' });
  }, []);

  const startEditLine = useCallback((ligne) => {
    setEditLine(ligne);
    setLineForm({ numero: ligne.numero, nom: ligne.nom, description: ligne.description || '' });
  }, []);

  const cancelEditLine = () => {
    setEditLine(null);
    setLineForm({ numero: '', nom: '', description: '' });
  };

  const saveLine = async () => {
    if (!lineForm.numero.trim() || !lineForm.nom.trim()) {
      setError(t.admin_numero_nom_obligatoires || 'Numéro et nom sont obligatoires.');
      return;
    }
    setSavingLine(true);
    try {
      if (editLine) {
        await api(`/api/lignes/${editLine.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(lineForm),
        });
      } else {
        await api('/api/lignes/', {
          method: 'POST',
          body: JSON.stringify(lineForm),
        });
      }
      await refresh();
      onDataChange && onDataChange();
      cancelEditLine();
    } catch (e) {
      setError(buildApiError(e));
    } finally {
      setSavingLine(false);
    }
  };

  const deleteLine = async (id) => {
    if (!window.confirm(t.confirmer_suppression_ligne || 'Supprimer définitivement cette ligne ?')) return;
    try {
      await api(`/api/lignes/${id}/`, { method: 'DELETE' });
      await refresh();
      onDataChange && onDataChange();
      if (selectedLineForStops?.id === id) {
        setSelectedLineForStops(null);
        setLineStops([]);
      }
    } catch (e) {
      setError(buildApiError(e));
    }
  };

  const startNewArret = useCallback(() => {
    setEditArret(null);
    setArretForm({ nom: '', latitude: '', longitude: '' });
    setArretSearch('');
  }, []);

  const startEditArret = useCallback((arret) => {
    setEditArret(arret);
    setArretForm({
      nom: arret.nom || '',
      latitude: String(arret.lat ?? arret.latitude ?? ''),
      longitude: String(arret.lng ?? arret.longitude ?? ''),
    });
    setArretSearch(arret.nom || '');
  }, []);

  const cancelEditArret = () => {
    setEditArret(null);
    setArretForm({ nom: '', latitude: '', longitude: '' });
    setArretSearch('');
  };

  const saveArret = async () => {
    if (!arretForm.nom.trim() || !arretForm.latitude || !arretForm.longitude) {
      setError(t.admin_arret_champs_obligatoires || 'Nom, latitude et longitude sont obligatoires.');
      return;
    }
    setSavingArret(true);
    try {
      const payload = {
        nom: arretForm.nom.trim(),
        latitude: parseFloat(arretForm.latitude),
        longitude: parseFloat(arretForm.longitude),
      };
      if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
        setError('Latitude / longitude invalides.');
        setSavingArret(false);
        return;
      }
      if (editArret) {
        await api(`/api/arrets/${editArret.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await api('/api/arrets/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      await refresh();
      cancelEditArret();
      onDataChange && onDataChange();
    } catch (e) {
      setError(buildApiError(e));
    } finally {
      setSavingArret(false);
    }
  };

  const deleteArret = async (id) => {
    if (!window.confirm(t.confirmer_suppression_arret || 'Supprimer définitivement cet arrêt ?')) return;
    try {
      const ligneArrets = await api(`/api/ligne-arrets/?arret=${id}`);
      await api(`/api/arrets/${id}/`, { method: 'DELETE' });
      for (const la of (ligneArrets || [])) {
        const ligneId = la.ligne?.id || la.ligne_id;
        const removedOrdre = la.ordre;
        if (ligneId) {
          const stopsInLine = await api(`/api/ligne-arrets/?ligne=${ligneId}`);
          for (const stop of (stopsInLine || [])) {
            if (stop.ordre > removedOrdre) {
              await api(`/api/ligne-arrets/${stop.id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ ordre: stop.ordre - 1 }),
              });
            }
          }
        }
      }
      await refresh();
      onDataChange && onDataChange();
      if (selectedLineForStops) loadLineStops(selectedLineForStops);
    } catch (e) {
      setError(buildApiError(e));
    }
  };

  const loadLineStops = async (ligne) => {
    setSelectedLineForStops(ligne);
    setNewStopLineId(String(ligne.id));
    setNewStopOrdre((ligne.nb_arrets || 0) + 1);
    try {
      const data = await api('/api/ligne-arrets/');
      setLineStops((data || []).filter(item => {
        return item.ligne && item.ligne.id === ligne.id;
      }));
    } catch (e) {
      setError(buildApiError(e));
    }
  };

  const addStopToLine = async () => {
    if (!newStopLineId || !newStopArretId) {
      setError(t.selectionner_ligne_arret || 'Sélectionnez une ligne et un arrêt.');
      return;
    }
    setSavingLineStop(true);
    try {
      await api('/api/ligne-arrets/', {
        method: 'POST',
        body: JSON.stringify({
          ligne: parseInt(newStopLineId, 10),
          arret: parseInt(newStopArretId, 10),
          ordre: Math.max(1, newStopOrdre),
        }),
      });
      await refresh();
      onDataChange && onDataChange();
      const currentId = parseInt(newStopLineId, 10);
      const current = lignes.find(l => l.id === currentId);
      if (current) loadLineStops(current);
    } catch (e) {
      setError(buildApiError(e));
    } finally {
      setSavingLineStop(false);
    }
  };

  const removeStopFromLine = async (ligneArretId) => {
    if (!window.confirm(t.confirmer_suppression_arret_ligne || 'Supprimer cet arrêt de la ligne ?')) return;
    const removedStop = lineStops.find(item => item.id === ligneArretId);
    if (!removedStop) return;
    const removedOrdre = removedStop.ordre;
    try {
      await api(`/api/ligne-arrets/${ligneArretId}/`, { method: 'DELETE' });
      const stopsToUpdate = lineStops.filter(item => item.id !== ligneArretId && item.ordre > removedOrdre);
      for (const stop of stopsToUpdate) {
        await api(`/api/ligne-arrets/${stop.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ ordre: stop.ordre - 1 }),
        });
      }
      await refresh();
      onDataChange && onDataChange();
      if (selectedLineForStops) loadLineStops(selectedLineForStops);
    } catch (e) {
      setError(buildApiError(e));
    }
  };

  const isEditingLigne = editLine !== null;
  const isEditingArret = editArret !== null;

  const tabs = [
    { key: 'lignes',   label: t.admin_lignes },
    { key: 'arrets',   label: t.admin_arrets },
    { key: 'associations', label: t.admin_associations },
  ];

  return (
    <div className="admin-view">
      <div className="admin-header">
        <h2>⚙️ {t.admin_panel}</h2>
        <p className="admin-sub">Gestion des données du réseau de transport</p>
      </div>

      {denied ? (
        <div className="admin-error" style={{ textAlign: 'center', padding: '30px', marginBottom: '16px' }}>
          {t.admin_no_access}{' '}
          <span style={{ opacity: 0.7, fontSize: 'var(--text-sm)' }}>
            (Session expirée ou droits insuffisants.)
          </span>
        </div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : null}

      {!denied && (
        <>
          <div className="admin-tabs">
            {tabs.map(tb => (
              <button
                key={tb.key}
                className={`admin-tab ${tab === tb.key ? 'active' : ''}`}
                onClick={() => { setTab(tb.key); setError(''); }}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {/* ═══════ TAB : LIGNES ═══════ */}
          {tab === 'lignes' && (
            <section className="admin-section">
              <div className="admin-card editor-card">
                <h3>{isEditingLigne ? t.admin_modifier_ligne : t.admin_nouvelle_ligne}</h3>
                {isEditingLigne && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={startNewLine}
                    style={{ marginBottom: '12px' }}
                  >
                    {t.admin_nouvelle_ligne}
                  </button>
                )}

                <FormRow label={t.admin_numero}>
                  <input
                    type="text"
                    value={lineForm.numero}
                    onChange={e => setLineForm(f => ({ ...f, numero: e.target.value }))}
                    placeholder="ex: 135"
                  />
                </FormRow>

                <FormRow label={t.admin_nom}>
                  <input
                    type="text"
                    value={lineForm.nom}
                    onChange={e => setLineForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="ex: Ampefiloha - Analakely"
                  />
                </FormRow>

                <FormRow label={t.admin_description}>
                  <textarea
                    rows={2}
                    value={lineForm.description}
                    onChange={e => setLineForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Ex: Axe nord-sud"
                  />
                </FormRow>

                <div className="btn-row">
                  <InlineButton onClick={saveLine} variant="primary" disabled={savingLine}>
                    {savingLine ? '…' : t.admin_enregistrer}
                  </InlineButton>
                  {isEditingLigne && <InlineButton onClick={cancelEditLine}>{t.admin_annuler}</InlineButton>}
                </div>
              </div>

              <div className="admin-card list-card">
                <h3>{t.admin_lignes} ({lignes.length})</h3>
                {loading && <p className="loading-msg">{t.loading_msg}</p>}
                {!loading && lignes.length === 0 && <p className="empty-msg">{t.admin_liste_vide}</p>}
                <ul className="admin-list">
                  {lignes.map(ligne => (
                    <li key={ligne.id} className="admin-list-item">
                      <div className="item-main">
                        <span className="line-badge">{ligne.numero}</span>
                        <div>
                          <strong>{ligne.nom}</strong>
                          {ligne.description && <small>{ligne.description}</small>}
                          <small>{ligne.nb_arrets} {t.admin_nb_arrets}</small>
                        </div>
                      </div>
                      <div className="item-actions">
                        <InlineButton onClick={() => startEditLine(ligne)} variant="primary">
                          {t.admin_modifier}
                        </InlineButton>
                        <InlineButton onClick={() => deleteLine(ligne.id)} variant="danger">
                          {t.admin_supprimer}
                        </InlineButton>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

{/* ═══════ TAB : ARRETS ═══════ */}
          {tab === 'arrets' && (
            <section className="admin-section">
              <div className="admin-card editor-card">
                <h3>{isEditingArret ? t.modifier_l_arret : t.nouvel_arret}</h3>
                {isEditingArret && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={startNewArret}
                    style={{ marginBottom: '12px' }}
                  >
                    {t.nouvel_arret}
                  </button>
                )}

                <FormRow label={t.admin_nom}>
                  <div className="select-stop">
                    <div className="select-stop-container">
                      <input
                        type="text"
                        value={arretSearch}
                        onChange={e => {
                          setArretSearch(e.target.value);
                          setShowArretSuggestions(true);
                          if (!editArret) {
                            setArretForm(f => ({ ...f, nom: e.target.value }));
                          }
                        }}
                        onFocus={() => setShowArretSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowArretSuggestions(false), 200)}
                        placeholder="Rechercher un arrêt..."
                      />
                      {showArretSuggestions && arretSearch && (
                        <div className="stop-options">
                          {arretsList
                            .filter(a => getSafeArretName(a).toLowerCase().includes(arretSearch.toLowerCase()))
                            .slice(0, 10)
                            .map(a => (
                              <div
                                key={a.id}
                                className="stop-option"
                                onMouseDown={() => {
                                  startEditArret(a);
                                  setArretSearch(getSafeArretName(a));
                                  setShowArretSuggestions(false);
                                }}
                              >
                                {getSafeArretName(a)}
                                <small>{formatCoord(a.lat ?? a.latitude)}, {formatCoord(a.lng ?? a.longitude)}</small>
                              </div>
                            ))}
                          {arretsList.filter(a => getSafeArretName(a).toLowerCase().includes(arretSearch.toLowerCase())).length === 0 && (
                            <div className="no-stops">Aucun arrêt trouvé</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </FormRow>

                <FormRow label={t.admin_latitude}>
                  <input
                    type="number"
                    step="any"
                    value={arretForm.latitude}
                    onChange={e => setArretForm(f => ({ ...f, latitude: e.target.value }))}
                    placeholder="-18.8790"
                  />
                </FormRow>

                <FormRow label={t.admin_longitude}>
                  <input
                    type="number"
                    step="any"
                    value={arretForm.longitude}
                    onChange={e => setArretForm(f => ({ ...f, longitude: e.target.value }))}
                    placeholder="47.5079"
                  />
                </FormRow>

                <div className="btn-row">
                  <InlineButton onClick={saveArret} variant="primary" disabled={savingArret}>
                    {savingArret ? '…' : t.admin_enregistrer}
                  </InlineButton>
                  {isEditingArret && (
                    <>
                      <InlineButton onClick={cancelEditArret}>{t.admin_annuler}</InlineButton>
                      <InlineButton onClick={() => deleteArret(editArret.id)} variant="danger">
                        {t.admin_supprimer}
                      </InlineButton>
                    </>
                  )}
                </div>
              </div>

              {/* CORRECTION: Liste des arrêts avec noms sécurisés */}
              <div className="admin-card list-card">
                <h3>{t.admin_arrets} ({arretsList.length})</h3>
                {loading && <p className="loading-msg">{t.loading_msg}</p>}
                {!loading && arretsList.length === 0 && <p className="empty-msg">{t.admin_liste_vide}</p>}
                <ul className="admin-list">
                  {arretsList.map(arret => {
                    // CORRECTION: S'assurer que le nom est une chaîne
                    const safeName = getSafeArretName(arret);
                    const lat = formatCoord(arret.lat ?? arret.latitude);
                    const lng = formatCoord(arret.lng ?? arret.longitude);
                    return (
                      <li key={arret.id} className="admin-list-item">
                        <div className="item-main">
                          <strong>{safeName}</strong>
                          <small>{lat}, {lng}</small>
                        </div>
                        <div className="item-actions">
                          <InlineButton onClick={() => startEditArret(arret)} variant="primary">
                            {t.admin_modifier}
                          </InlineButton>
                          <InlineButton onClick={() => deleteArret(arret.id)} variant="danger">
                            {t.admin_supprimer}
                          </InlineButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {/* ═══════ TAB : ASSOCIATIONS ═══════ */}
          {tab === 'associations' && (
            <section className="admin-section">
              <div className="admin-card">
                <h3>{t.admin_arrets_de_la_ligne}</h3>
                <div className="inp-wrap">
                  <label>{t.choisir_une_ligne}</label>
                  <select
                    value={selectedLineForStops ? String(selectedLineForStops.id) : ''}
                    onChange={e => {
                      const ligne = lignes.find(l => String(l.id) === e.target.value);
                      if (ligne) loadLineStops(ligne);
                    }}
                  >
                    <option value="">{t.selectionner_une_ligne}</option>
                    {lignes.map(l => (
                      <option key={l.id} value={String(l.id)}>
                        {l.numero} — {l.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedLineForStops && (
                <>
                  <div className="admin-card editor-card">
                    <h3>{t.admin_ajouter_arret}</h3>

                    <FormRow label={t.admin_numero}>
                      <div className="badge-field">
                        <span className="line-badge">{selectedLineForStops.numero}</span>
                        <span>{selectedLineForStops.nom}</span>
                      </div>
                    </FormRow>

                    <FormRow label={t.choisir_un_arret}>
                      <select
                        value={newStopArretId}
                        onChange={e => setNewStopArretId(e.target.value)}
                      >
                        <option value="">{t.choisir_un_arret_placeholder}</option>
                        {arretsList.map(a => (
                          <option key={a.id} value={String(a.id)}>
                            {getSafeArretName(a)}
                          </option>
                        ))}
                      </select>
                    </FormRow>

                    <FormRow label={t.admin_ordre}>
                      <select
                        value={newStopOrdre}
                        onChange={e => setNewStopOrdre(parseInt(e.target.value, 10))}
                      >
                        {Array.from({ length: lineStops.length + 1 }, (_, i) => i + 1).map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </FormRow>

                    <div className="btn-row">
                      <InlineButton
                        onClick={addStopToLine}
                        variant="primary"
                        disabled={savingLineStop || !newStopArretId}
                      >
                        {savingLineStop ? '…' : t.admin_ajouter_arret}
                      </InlineButton>
                    </div>
                  </div>

                  {/* CORRECTION: Liste des arrêts de la ligne avec noms sécurisés */}
                  <div className="admin-card list-card">
                    <h3>
                      {t.admin_arrets_de_la_ligne} — {selectedLineForStops.numero} ({lineStops.length})
                    </h3>
                    {lineStops.length === 0 && <p className="empty-msg">{t.admin_liste_vide}</p>}
                    <ul className="admin-list">
                      {lineStops.map(item => {
                        const arret = item.arret || item;
                        const safeName = getSafeArretName(arret);
                        return (
                          <li key={item.id} className="admin-list-item stop-item">
                            <span className="ordre-badge">{item.ordre}</span>
                            <span className="stop-name">{safeName}</span>
                            <InlineButton
                              onClick={() => removeStopFromLine(item.id)}
                              variant="danger"
                            >
                              {t.admin_supprimer}
                            </InlineButton>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}