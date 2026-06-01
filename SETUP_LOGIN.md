# Configuration de la page de connexion

## Vue d'ensemble

Une page de connexion a ete ajoutee au projet Taxi be Ako. Elle comprend:

### Backend (Django)
- **Nouveaux endpoints API:**
  - `POST /api/login/` - Connexion avec username et password
  - `POST /api/logout/` - Deconnexion
  - `GET /api/me/` - Recuperer les infos de l'utilisateur courant

### Frontend (React)
- **Nouveau composant:** `LoginView.js` - Page de connexion elegante
- **Authentification:** Gestion de l'etat d'authentification dans `App.js`
- **Styles:** Styles dedies dans `App.css`

## Configuration rapide

### 1. Creer l'utilisateur admin

Executez cette command pour creer un utilisateur de test:

```bash
python manage.py creer_admin
```

Cela creera un utilisateur avec:
- **Username:** admin
- **Password:** admin123

### 2. Demarrer le backend Django

```bash
python manage.py runserver 127.0.0.1:8000
```

### 3. Demarrer le frontend React

Dans un autre terminal:

```bash
cd taxi_be_ako_frontend
npm start
```

### 4. Tester la connexion

1. Ouvrez votre navigateur a `http://localhost:3000`
2. La page de connexion s'affichera automatiquement
3. Entrez les identifiants: `admin` / `admin123`
4. Apres connexion, vous accederez a l'application principale
5. Le nom d'utilisateur s'affiche dans la sidebar avec un bouton de deconnexion

## Fonctionnalites

- **Page de connexion elegante:** Design moderne avec le logo et les couleurs de la marque
- **Validation des champs:** Verification que tous les champs sont remplis
- **Messages d'erreur:** Affichage des erreurs de connexion
- **Etat de chargement:** Indicateur pendant la connexion
- **Deconnexion:** Bouton dans la sidebar pour se deconnecter
- **Protection des routes:** L'application principale n'est accessible qu'apres authentification
- **Session Django:** Utilise le systeme d'authentification par session de Django
- **Requêtes front-end:** Le frontend envoie les cookies de session avec `credentials: 'include'` pour que la connexion Django reste valide.

## Configuration du port

Le frontend React est configure pour se connecter au backend Django sur le port **8000**.
Si votre serveur Django tourne sur un autre port, modifiez le fichier `taxi_be_ako_frontend/package.json`:

```json
{
  "proxy": "http://127.0.0.1:VOTRE_PORT"
}
```

## Structure des fichiers modifies

```
taxi_be_ako/
├── comptes/
│   ├── views.py              # Ajout: se_connecter, se_deconnecter, utilisateur_courant
│   ├── urls.py               # Ajout: routes /api/login/, /api/logout/, /api/me/
│   └── management/commands/
│       └── creer_admin.py    # Nouveau: command pour creer l'admin
├── taxi_be_ako_frontend/
│   └── src/
│       ├── App.js            # Modifie: ajout authentification
│       ├── App.css           # Modifie: ajout styles login
│       └── LoginView.js      # Nouveau: composant de connexion
└── SETUP_LOGIN.md            # Ce fichier
```

## Notes

- Les identifiants par defaut sont: `admin` / `admin123`
- La session est geree par Django (cookies de session)
- En production, il faudra configurer HTTPS et des parametres de securite appropries