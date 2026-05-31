import { useCallback, useEffect, useRef, useState } from 'react';

export default function SelectStop({ label, value, arrets, onChange, t }) {
  const [showOptions, setShowOptions] = useState(false);
  const [filtered, setFiltered] = useState(arrets);
  const inputRef = useRef();

  useEffect(() => {
    setFiltered(arrets.filter(a => a.nom.toLowerCase().includes(value.toLowerCase())));
  }, [value, arrets]);

  const handleChange = useCallback((event) => {
    onChange(event.target.value);
    setShowOptions(true);
  }, [onChange]);

  const handleOptionClick = useCallback((nom) => {
    onChange(nom);
    setShowOptions(false);
  }, [onChange]);

  return (
    <div className="inp-wrap select-stop">
      <label htmlFor={label}>
        {label}
      </label>
      <div className="select-stop-container">
        <input
          id={label}
          type="text"
          placeholder={label}
          value={value}
          onChange={handleChange}
          onFocus={() => setShowOptions(true)}
          onBlur={() => setTimeout(() => setShowOptions(false), 200)}
          ref={inputRef}
          aria-label={label}
          role="combobox"
          aria-autocomplete="list"
          aria-controls="stop-options"
          aria-expanded={showOptions}
        />
        {showOptions && (
          <ul
            id="stop-options"
            className="stop-options"
            role="listbox"
            aria-label={`Suggestions pour ${label}`}
            tabIndex={0}
          >
            {filtered.slice(0, 10).map(a => (
              <li
                key={a.id}
                className="stop-option"
                onClick={() => handleOptionClick(a.nom)}
                role="option"
                aria-label={a.nom}
                aria-selected={value === a.nom}
              >
                {typeof a.nom === 'string' ? a.nom : `Arrêt #${a.id}`}
                {a.est_correspondance && (
                  <span className="correspondance-badge">
                    ✹ {t?.correspondance_label || 'Correspondance'}
                  </span>
                )}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="no-stops">
                {t?.aucun_arret_trouve || 'Aucun arrêt trouvé'}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
