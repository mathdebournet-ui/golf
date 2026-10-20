# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Site statique (GitHub Pages, aucun serveur/BDD) qui affiche chaque jour un « programme d'entraînement » golf + prépa physique pour un golfeur de compétition (handicap +3.6), utilisé sur téléphone au practice. Tout est en **français** (UI, fiches, commentaires de code). L'utilisateur débute en code : code simple et commenté en français.

## Règles impératives

- **Ne jamais modifier, renommer ni supprimer** les PDF, le `.docx` de `prepa phisique/` ni l'Excel `Entrainement_Toussaint_*.xlsx` (lecture seule ; l'Excel n'est **pas** une source d'exercices et est exclu de la publication via `.gitignore`).
- Si un PDF est illisible/incomplet : le signaler, ne pas inventer. Ce qui est déduit ou ajouté par rapport au PDF va dans le champ `note` de la fiche.
- Exercices trouvés en ligne : source sérieuse obligatoire dans `source.url`.
- **Practice (fers / drive / approches) : uniquement des exercices de PERFORMANCE** (jeu noté, cible, record à battre), jamais de technique (choix de l'utilisateur ; les fiches techniques ont été supprimées).
- Ne jamais mentionner le « SG » du PDF Trèfle sur le site.
- **Prépa physique : uniquement des exercices TPI (mytpi.com, articles publics) ou du préparateur physique (.docx + photos de ses fiches « PARIS / ALTUS » dans `prepa phisique/`)** — choix de l'utilisateur, son coach physique travaille avec TPI. Quand TPI cite un exercice sans le détailler, le dire dans `note`.
- Tout accès `localStorage` passe par `lireStockage` / `ecrireStockage` (try/catch) dans `app.js` (paramètre `prefixe` optionnel ; `parcours.js` passe par `lireParcours` / `ecrireParcours`).
- **Ne jamais purger ni changer le préfixe `golf-parcours-v1:`** : ce sont les parties de l'utilisateur, sans autre copie.

## Commandes

```bash
# Mettre à jour fiches.json après ajout d'un PDF (crée des brouillons, régénère fiches-data.js)
"../python-runtime/python.exe" outils/maj_fiches.py      # ou double-clic sur outils/maj_fiches.bat

# Tester en local (http://localhost:8770) — config « golf » dans ../.claude/launch.json
"../python-runtime/python.exe" -m http.server 8770 --directory .
```

Pas de build, pas de tests automatisés, pas de dépendances JS. Python embarqué dans `../python-runtime/` (avec `pypdf` et `python-docx`).

**Publication** : site en ligne sur https://mathdebournet-ui.github.io/golf/ (dépôt public `mathdebournet-ui/golf`, GitHub Pages depuis `main` / racine). Pas de git dans le PATH : l'utilisateur publie avec GitHub Desktop (Commit to main → Push origin). Pour inspecter le dépôt en lecture seule : `$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`. Ne jamais pousser sans accord explicite.

## Architecture

- `fiches.json` = **source de vérité** des exercices. `fiches-data.js` en est une copie (`window.FICHES_SECOURS`) **générée par le script** — ne jamais l'éditer à la main ; après toute modif de `fiches.json`, relancer `outils/maj_fiches.py` pour la régénérer (le script valide aussi les champs).
- `app.js` charge `fiches.json` via `fetch`, et retombe sur `FICHES_SECOURS` si fetch échoue (page ouverte en `file://`).
- **Structure du jour** (constantes en tête de `app.js`) : `CRENEAUX_GOLF` = 3 putting, 1 chipping/bunker, 2 practice (fers/drive/approches, `categoriesDifferentes`) ; `SEANCES_SPORT` (n'est plus dans « Aujourd'hui », sert au bouton « Je ne sais pas » de Prépa) par jour de semaine (0 = dimanche) : lun cardio ×5, mar/jeu 2 puissance + 3 force, mer/sam mobilité ×5, ven abdos ×5, dim récupération légère (1 récupération + 2 mobilité). Chaque exercice est un « créneau » `{bloc, categories}` ; `tirerPourCreneau()` sert au tirage ET à « Autre exo ».
- **Nouveau tirage à chaque ouverture** (choix de l'utilisateur, v3 — l'ancien tirage déterministe par date a été abandonné) : `nouveauProgramme()` utilise `Math.random`, en évitant via `idsRecents()` les exos des 3 jours précédents **et** du dernier programme affiché aujourd'hui. Dans un créneau, le tirage choisit d'abord une **catégorie** puis une fiche. L'exclusion est « si possible » (repli si le pool est trop petit).
- Stockage par jour `golf-seance-v3:jour:AAAA-MM-JJ` = `{ programme: [ids par position de créneau], faits, dejaProposes }`. Chaque ouverture écrase le programme du jour et remet les ✓ à zéro ; « Autre exo » met à jour `programme`. L'historique (donc l'exclusion) est propre à chaque navigateur. Changer la structure des créneaux impose de changer `PREFIXE_STOCKAGE`. Données de plus de 30 jours purgées.
- **5 onglets** (`changerVue` dans `app.js` montre `#vue-<nom>`) : Aujourd'hui (golf seulement depuis v6), 💪 Prépa, ⛳ Parcours, Historique, Bibliothèque.
- **`prepa.js`** (v6) : « Qu'est-ce que tu veux faire ? » → `TYPES_DE_TRAVAIL` (catégories), `OBJECTIFS_GOLF` (catégories, ou liste fixe d'ids : échauffement = photos 12-13 du préparateur, après-partie = photo 22 + rouleau/respiration), séances du préparateur recalculées depuis les fiches `source.type:"photo"` (une par photo, doublons retirés ; les photos ne sont jamais affichées), bouton « Je ne sais pas » = `SEANCES_SPORT[jour]`. Séance mémorisée pour la journée dans la clé `prepa` ({jour, titre, categories, ids, faits}).
- **`parcours.js`** (chargé AVANT `app.js`, qui appelle `afficherAccueil()` puis `partieEnCoursExiste()` au démarrage) : nom du joueur demandé sur la **première page du site** (`#accueil`, classe `body.accueil-actif` qui cache onglets et vues, v11) ; recherche des golfs = « mes parcours » (filtre local) + **Photon** (`photon.komoot.io`, données OpenStreetMap, filtre `osm_tag=leisure:golf_course`, priorité France, sur appui de « Chercher » uniquement, attribution OSM affichée) + ajout manuel ; formats 18 / 9 aller / 9 retour ; par trou : par (3/4/5, mémorisé par parcours), score, putts, fairway (par 4-5), pénalités ; GIR calculé (`score − putts ≤ par − 2`) ; note libre ; Historique = liste + détail (stats, carte de score, Modifier, Supprimer). Clés `golf-parcours-v1:` : `joueur`, `parcours` ({id → {nom, lieu, pars[18], dernierePartie}}), `partieEnCours`, `parties`.
- **`partage.js`** (chargé avant `parcours.js`) : partage des parties terminées via Firebase (Firestore collection `parties`, doc `<uid>_<id>`, connexion anonyme). `CONFIG_FIREBASE = null` = partage désactivé. Règles de sécurité : `outils/regles-firestore.txt` (à recoller dans la console si on change le format d'une partie). Données reçues en ligne = non fiables : normalisées dans `actualiserCommunaute()` et toujours échappées.
- **`serie.js`** (v12, chargé avant `app.js`) : série de jours d'affilée (jour gagné = 3 exos d'« Aujourd'hui » cochés, `noterExoFait()` appelé par `basculerFait`), badge `#serie` en en-tête, préfixe `golf-serie-v1:` (ne jamais purger). Envoi dans Firestore `series/<uid>` ; lecture réservée à l'admin (connexion Google sur une app Firebase nommée « admin », vue `#vue-admin` ouverte par le lien du pied de page). L'adresse Gmail de l'admin ne doit pas apparaître dans le dépôt public (placeholder `ADRESSE_ADMIN` dans les règles).
- **Programme du jour** (v16) : tiré une fois par jour et gardé (`programmeEnregistre`), bouton « 🔄 Nouveau programme ». Remplace le « nouveau tirage à chaque ouverture » décrit plus haut.
- **`scores.js`** (v16) : case score sur les cartes de putting d'Aujourd'hui (`caseScore()` appelé par `carteFiche`), unités dans `UNITES_SCORE`, plus haut = mieux. Préfixe `golf-scores-v1:` (`scores` = {idFiche: [{t, d, v}]}, `effaces`, `dernierEnvoi`), jamais purgé. Firestore `scores/<uid>` lu par l'admin seulement.
- **`chrono.js`** (v16) : `boutonsChrono(fiche)` (durées de 10 s à 10 min trouvées dans titre/miseEnPlace/deroule), barre `#barre-chrono`.
- **`compte.js`** (v16) : sauvegarde Google facultative (compte anonyme relié via `linkWithPopup`, ou on rejoint un compte existant). Document privé `sauvegardes/<uid>` = JSON de `donneesLocales()`. `fusionner()` ne perd rien sauf les suppressions mémorisées (`golf-parcours-v1:supprimees`, `golf-scores-v1:effaces`). `planifierSauvegarde()` est appelée par `ecrireParcours`, `noterExoFait` et les scores. `demarrerPartage()` (partage.js) réutilise la connexion existante (Google ou anonyme) avant de se connecter en anonyme.
- **Espace admin** (`serie.js`) : onglets Séries / Parcours / Putting ; `normaliserParties()` (parcours.js) nettoie les parties reçues.
- **`remise-a-zero.js`** : `REMISE_A_ZERO` (1 = 21/10/2026). L'augmenter efface parties/série/scores sur chaque appareil à l'ouverture (clé `golf-remise-a-zero`) ; c'est la seule exception voulue à « ne jamais purger `golf-parcours-v1:` », et seulement sur demande explicite de l'utilisateur.
- Ordre des scripts : fiches-data, remise-a-zero, partage, parcours, serie, scores, compte, chrono, prepa, app.
- `sw.js` : service worker réseau-d'abord pour l'usage hors-ligne (actif seulement en https/localhost). Incrémenter `NOM_CACHE` si on ajoute des fichiers essentiels.

## Format d'une fiche (`fiches.json` → `fiches[]`)

`id` (slug unique), `titre`, `type` (`golf`|`physique`), `categorie` (golf : `putting`, `chipping`, `approches` (affiché « Wedging »), `fers`, `drive`, `bunker` ; physique : `cardio`, `force`, `puissance`, `mobilite`, `abdos`, `recuperation`), `duree` (minutes), `objectif`, `materiel[]`, `miseEnPlace[]`, `deroule[]`, `reussite`, `varianteFacile`, `varianteDifficile`, `source` (`{type:"pdf"|"docx", fichier, page?}` ou `{type:"web", nom, url}`), `note?`, `statut` (`valide`|`brouillon`).

- **Photos** (`source.type: "photo"`, `fichier` + `fichiers` = toutes les photos où l'exercice apparaît, doublons compris) : lues visuellement par Claude (une photo = plusieurs exercices). Elles ne sont **pas publiées** (`.gitignore`, prénoms d'autres joueurs) : la page n'affiche pas de lien pour elles. `fichiersAnalyses` (objet `chemin → raison` à la racine de `fiches.json`) liste les fichiers déjà traités sans fiche (ex. tableau de points). Une nouvelle photo → le script crée un brouillon « photo à analyser ».
- `source.fichier` doit être le nom **exact du disque** (le .docx a un « É » en Unicode décomposé NFD) : le script le corrige automatiquement, ne pas le retaper à la main.
- Un PDF couvre une ou plusieurs fiches (ex. `Fiches exercices.pdf` → 3 fiches avec `page`). Le script considère un fichier « couvert » dès qu'une fiche le référence.
- Les fiches `brouillon` (créées par le script avec `texteExtrait`, `categorie: "a-classer"`) sont exclues du programme du jour. Pour les finaliser : lire le PDF (visuellement, ce sont des schémas), remplir tous les champs, choisir la catégorie, passer `statut` à `valide`, supprimer `texteExtrait`/`alerte`, puis relancer le script.
- Pour ajouter une catégorie : `CATEGORIES` dans `maj_fiches.py`, `NOMS_CATEGORIES` dans `app.js` (+ créneaux/séances qui l'utilisent), couleur `.cat-xxx` dans `style.css`.

## Suivi

Tenir `SUIVI.md` à jour (état, décisions, TODO).
