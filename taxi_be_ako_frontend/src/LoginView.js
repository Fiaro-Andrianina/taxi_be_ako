import { useState } from 'react';

/**
 * Composant de page de connexion et d'inscription
 * Permet a l'utilisateur de s'authentifier ou de creer un compte
 */
export default function LoginView({ onLogin, t }) {
  const [mode, setMode] = useState('login'); // 'login' ou 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function resetForm() {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  }

  function toggleMode() {
    resetForm();
    setMode(mode === 'login' ? 'register' : 'login');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'register') {
      if (!username || !email || !password || !confirmPassword) {
        setError(t.champ_obligatoire || 'Veuillez remplir tous les champs.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError(t.mots_de_passe_differents || 'Les mots de passe ne correspondent pas.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError(t.mot_de_passe_trop_court || 'Le mot de passe doit contenir au moins 6 caractères.');
        setLoading(false);
        return;
      }

      try {
        // Inscription : creation du compte
        const response = await fetch('/api/utilisateurs/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || t.erreur_inscription || "Erreur lors de l'inscription");
        }

        // Connexion automatique apres inscription
        const loginResponse = await fetch('/api/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          throw new Error(loginData.detail || t.erreur_connexion || 'Erreur de connexion');
        }

        onLogin(loginData.user);
      } catch (err) {
        setError(err.message || t.erreur_inattendue || 'Une erreur est survenue.');
      } finally {
        setLoading(false);
      }
    } else {
      // Mode connexion
      if (!username || !password) {
        setError(t.champ_obligatoire || 'Veuillez remplir tous les champs.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || t.erreur_connexion || 'Erreur de connexion');
        }

        // Appel du callback de succes avec les infos utilisateur
        onLogin(data.user);
      } catch (err) {
        setError(err.message || t.erreur_inattendue || 'Une erreur est survenue lors de la connexion.');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* Left side - Welcome section */}
        <div className="login-welcome-section">
          <div className="login-welcome-content">
            <div className="login-welcome-logo">
              <span>TA</span>
            </div>
              <h1 className="login-welcome-title">
                {t.bienvenue_title || (
                  <>
                    Bienvenue sur 
                    Taxi be Ako
                  </>
                )}
              </h1>
            <p className="login-welcome-description">
              {t.bienvenue_description || 'Votre compagnon de transport à Antananarivo.'}
              Découvrez les lignes de bus, visualisez les itinéraires
              et explorez la capitale malgache facilement.
            </p>
            <div className="login-welcome-features">
              <div className="feature-item">
                <div className="feature-icon map-icon" aria-hidden="true" />
                <span>{t.cartes_interactives || 'Cartes interactives'}</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon bus-icon" aria-hidden="true" />
                <span>{t.lignes_bus || 'Lignes de bus'}</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon route-icon" aria-hidden="true" />
                <span>{t.itineraires_rapides || 'Itinéraires rapides'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login / Register form */}
        <div className="login-form-section">
          <div className="login-container">
            <div className="login-header">
              {mode === 'login' ? (
                <>
                  <h2>{t.se_connecter || 'Se connecter'}</h2>
                  <p>{t.acces_espace_personnel || 'Accédez à votre espace personnel'}</p>
                </>
              ) : (
                <>
                  <h2>{t.creer_un_compte || 'Créer un compte'}</h2>
                  <p>{t.inscrivez_vous || 'Inscrivez-vous pour utiliser l\'application'}</p>
                </>
              )}
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              <label className="login-field">
                <span>{t.nom_utilisateur || 'Nom d\'utilisateur'}</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.placeholder_nom_utilisateur || (mode === 'login' ? 'Entrez votre nom d\'utilisateur' : 'Choisissez un nom d\'utilisateur')}
                  autoComplete="username"
                  disabled={loading}
                />
              </label>

              {mode === 'register' && (
                <label className="login-field">
                  <span>{t.email || 'Email'}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.placeholder_email || 'Entrez votre adresse email'}
                    autoComplete="email"
                    disabled={loading}
                  />
                </label>
              )}

              <label className="login-field">
                <span>{t.mot_de_passe || 'Mot de passe'}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.placeholder_mot_de_passe || 'Entrez votre mot de passe'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  disabled={loading}
                />
              </label>

              {mode === 'register' && (
                <label className="login-field">
                  <span>{t.confirmer_mot_de_passe || 'Confirmer le mot de passe'}</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.placeholder_confirmer || 'Confirmez votre mot de passe'}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </label>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? (mode === 'login' ? (t.connexion_en_cours || 'Connexion...') : (t.inscription_en_cours || 'Inscription...'))
                  : (mode === 'login' ? (t.se_connecter || 'Se connecter') : (t.creer_compte || 'Créer mon compte'))}
              </button>
            </form>

             <div className="login-footer">
               <button
                 type="button"
                 className="login-toggle-mode"
                 onClick={toggleMode}
                 disabled={loading}
               >
                 {mode === 'login'
                   ? (t.pas_de_compte || 'Pas encore de compte ?') + ' ' + (t.creer_un_compte || 'Créer un compte')
                   : (t.deja_un_compte || 'Déjà un compte ?') + ' ' + (t.se_connecter || 'Se connecter')}
               </button>
               {mode === 'login' && (
                 <p>{t.demo_identifiants || 'Demo: admin / admin123'}</p>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
