# Instructions pour créer et mettre à jour un dépôt GitHub

## Initialisation du dépôt local
- `git init` – Initialise un nouveau dépôt Git vide dans le répertoire courant.

## Configuration de l'identité
- `git config --global user.name "Votre Nom"` – Configure votre nom d'utilisateur pour tous les dépôts.
- `git config --global user.email "votre.email@example.com"` – Configure votre email pour tous les dépôts.

## Ajout des fichiers au suivi
- `git add .` – Ajoute **tous** les fichiers modifiés et nouveaux au prochain commit.
- `git add <chemin>` – Ajoute un fichier ou répertoire spécifique au suivi.

## Enregistrement des changements
- `git commit -m "Message descriptif"` – Crée un commit contenant les modifications ajoutées, avec un message explicatif.

## Configuration du dépôt distant
- `git remote add origin https://github.com/Fiaro-Andrianina/<repo>.git` – Associe le dépôt local à un dépôt distant nommé **origin**.
- `git remote -v` – Vérifie les URLs configurées pour le dépôt distant (fetch et push).

## Publication des commits
- `git push origin master` – Envoie les commits de la branche **master** vers le dépôt distant.
- `git push -u origin <branche>` – Crée la branche distante et la configure comme branche de suivi par défaut.

## Synchronisation avec le dépôt distant
- `git pull` – Récupère les changements du dépôt distant et les fusionne avec la branche locale.
- `git fetch` – Récupère les changements sans les fusionner automatiquement.

## Gestion des conflits
- `git merge <branche>` – Fusionne une branche dans la branche courante, résout les conflits si nécessaire.
- `git status` – Montre l'état actuel du dépôt (fichiers modifiés, en attente, etc.).

## Outils d'inspection
- `git log` – Affiche l'historique des commits.
- `git diff` – Montre les différences entre les modifications non commitées et le dernier commit.
- `git show <commit>` – Affiche les détails d'un commit spécifique.

## Authentification GitHub
Pour pousser vers GitHub avec un compte Google, utilisez un **Personal Access Token (PAT)** :
1. Générez un token sur GitHub : Settings → Developer settings → Personal access tokens → Generate new token
2. Utilisez le token comme mot de passe lors du push :
   ```bash
   git push https://<username>:<token>@github.com/<username>/<repo>.git
   ```