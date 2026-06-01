# Taxi_be_ako Backend Overview

Ce document décrit l’architecture du backend Django du projet `taxi_be_ako`.

## 1. Structure générale

- `manage.py` : point d’entrée Django pour les commandes (`runserver`, `migrate`, etc.).
- `config/` : configuration du projet Django.
  - `settings.py` : paramètres Django, base de données, apps installées, middleware.
  - `urls.py` : routeur principal du projet.
- `coeur/` : application cœur pour les pages d’accueil, santé et statistiques.
- `comptes/` : application de gestion des utilisateurs et des profils.
- `transport/` : application de gestion des lignes, arrêts, trajets et graphe.
- `requirements.txt` : dépendances Python.

## 2. Configuration clé

### `config/settings.py`

- `INSTALLED_APPS` :
  - Django core : `admin`, `auth`, `contenttypes`, `sessions`, `messages`, `staticfiles`
  - Applications métier :
    - `coeur.apps.CoreConfig`
    - `comptes.apps.AccountsConfig`
    - `transport.apps.TransportConfig`
- Base de données :
  - Si `DB_ENGINE=mysql` dans l’environnement, utilisation de MySQL.
  - Sinon SQLite3 par défaut.
- `DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'`
- `LANGUAGE_CODE = 'fr-fr'`
- `TIME_ZONE = 'Indian/Antananarivo'`

### `config/urls.py`

Le projet expose les routes principales :

- `/admin/` : interface d’administration Django.
- `/` : routes de l’app `coeur`.
- `/api/` : routes de l’app `transport`.
- `/api/` : routes de l’app `comptes`.

## 3. Applications et responsabilités

### `coeur`

Responsabilités :
- Vue d’accueil du service.
- Endpoint santé (`/health/`).
- Statistiques globales (`/stats/`).

### `comptes`

Responsabilités :
- Gestion des utilisateurs Django.
- Création de comptes.
- Profils utilisateurs.

Modèle principal : `ProfilUtilisateur`
- `user` (OneToOne vers `AUTH_USER_MODEL`)
- `telephone`
- `role` (`client`, `chauffeur`, `admin`)
- `adresse`
- `date_creation`

Routes exposées :
- `/api/utilisateurs/`
- `/api/utilisateurs/<int:pk>/`
- `/api/login/`
- `/api/logout/`
- `/api/me/`

### `transport`

Responsabilités :
- Gestion des arrêts (`Arret`), lignes (`Ligne`), et relations de parcours (`LigneArret`).
- Calcul de graphes de trajet.
- Recherche de trajet et historique.
- Synchronisation des données.

Modèles principaux :
- `Arret` : nom, latitude, longitude.
- `Ligne` : numéro, nom, description, relation M2M avec `Arret` via `LigneArret`.
- `LigneArret` : position d’un arrêt sur une ligne, ordre.
- `Correspondance` : changement entre deux lignes à un arrêt.
- `TrajetHistorique` : trajet recherché, durée, distance, lignes, correspondances.

Routes exposées :
- `/api/health/`
- `/api/lignes/`
- `/api/lignes/<pk>/`
- `/api/lignes/<pk>/arrets/`
- `/api/arrets/`
- `/api/arrets/<pk>/`
- `/api/ligne-arrets/`
- `/api/ligne-arrets/<pk>/`
- `/api/sync/`
- `/api/graphe/`
- `/api/trajet/`
- `/api/trajets/historique/`

Notes techniques :
- Une logique de recherche de trajet est implémentée dans `transport/services.py`.
- Le backend construit un graphe de mobilité à partir des arrêts et des lignes.

## 4. Notes supplémentaires

- La gestion des utilisateurs s’appuie sur le modèle Django standard `User`.
- Les profils utilisateurs sont stockés dans `comptes.models.ProfilUtilisateur`.
- Le backend supporte MySQL via variables d’environnement, sinon SQLite.
- Le service expose des endpoints REST simples basés sur des vues fonctionnelles.

## 5. Point de départ pour le développement

1. Lire `config/settings.py` pour comprendre la configuration globale.
2. Consulter `config/urls.py` pour voir l’organisation des routes.
3. Explorer `transport.models.py` et `transport/services.py` pour la logique de graphe et de trajet.

5. Utiliser `manage.py runserver` pour tester les endpoints en local.
