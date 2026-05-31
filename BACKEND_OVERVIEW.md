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
- `reservations/` : application de gestion des réservations de taxi.
- `paiements/` : application de gestion des paiements.
- `requirements.txt` : dépendances Python.

## 2. Configuration clé

### `config/settings.py`

- `INSTALLED_APPS` :
  - Django core : `admin`, `auth`, `contenttypes`, `sessions`, `messages`, `staticfiles`
  - Applications métier :
    - `coeur.apps.CoreConfig`
    - `comptes.apps.AccountsConfig`
    - `transport.apps.TransportConfig`
    - `reservations.apps.BookingConfig`
    - `paiements.apps.PaymentsConfig`
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
- `/api/accounts/` : routes de l’app `comptes`.
- `/api/booking/` : routes de l’app `reservations`.
- `/api/payments/` : routes de l’app `paiements`.

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
- `/api/accounts/utilisateurs/`
- `/api/accounts/utilisateurs/<int:pk>/`

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

### `reservations`

Responsabilités :
- Création et gestion des réservations de trajets.
- Validation, annulation et suivi des réservations.

Modèle principal : `Reservation`
- `utilisateur` (ForeignKey vers l’utilisateur)
- `depart`, `arrivee` (ForeignKey vers `Arret`)
- `trajet` (ForeignKey vers `TrajetHistorique`)
- `statut`, `nb_passagers`, `prix_estime`, `date_trajet`, `notes`
- `cree_le`, `mis_a_jour_le`

Routes exposées :
- `/api/booking/reservations/`
- `/api/booking/reservations/<pk>/`
- `/api/booking/reservations/<pk>/confirmer/`
- `/api/booking/reservations/<pk>/annuler/`

### `paiements`

Responsabilités :
- Création et suivi des paiements.
- Validation d’un paiement.

Modèle principal : `Paiement`
- `reservation` (OneToOne vers `Reservation`)
- `montant`, `methode`, `statut`, `reference`, `cree_le`, `paye_le`

Routes exposées :
- `/api/payments/paiements/`
- `/api/payments/paiements/<pk>/`
- `/api/payments/paiements/<pk>/valider/`

## 4. Notes supplémentaires

- La gestion des utilisateurs s’appuie sur le modèle Django standard `User`.
- Les profils utilisateurs sont stockés dans `comptes.models.ProfilUtilisateur`.
- Le backend supporte MySQL via variables d’environnement, sinon SQLite.
- Le service expose des endpoints REST simples basés sur des vues fonctionnelles.

## 5. Point de départ pour le développement

1. Lire `config/settings.py` pour comprendre la configuration globale.
2. Consulter `config/urls.py` pour voir l’organisation des routes.
3. Explorer `transport.models.py` et `transport/services.py` pour la logique de graphe et de trajet.
4. Examiner `reservations.models.py` et `paiements.models.py` pour les workflows de réservation et paiement.
5. Utiliser `manage.py runserver` pour tester les endpoints en local.
