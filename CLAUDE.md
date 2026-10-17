# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Site statique (GitHub Pages, aucun serveur/BDD) qui affiche chaque jour un « programme d'entraînement » golf + prépa physique pour un golfeur de compétition (handicap +3.6), utilisé sur téléphone au practice. Tout est en **français** (UI, fiches, commentaires de code). L'utilisateur débute en code : code simple et commenté en français.

## Règles impératives

- **Ne jamais modifier, renommer ni supprimer** les PDF, le `.docx` de `prepa phisique/` ni l'Excel `Entrainement_Toussaint_*.xlsx` (lecture seule ; l'Excel n'est **pas** une source d'exercices et est exclu de la publication via `.gitignore`).
- Si un PDF est illisible/incomplet : le signaler, ne pas inventer. Ce qui est déduit ou ajouté par rapport au PDF va dans le champ `note` de la fiche.
- Exercices trouvés en ligne : source sérieuse obligatoire dans `source.url`.
- **Prépa physique : uniquement des exercices TPI (mytpi.com, articles publics) ou du préparateur physique (.docx + photos de ses fiches « PARIS / ALTUS » dans `prepa phisique/`)** — choix de l'utilisateur, son coach physique travaille avec TPI. Quand TPI cite un exercice sans le détailler, le dire dans `note`.
- Tout accès `localStorage` passe par `lireStockage` / `ecrireStockage` (try/catch) dans `app.js`.

## Commandes

```bash
# Mettre à jour fiches.json après ajout d'un PDF (crée des brouillons, régénère fiches-data.js)
"../python-runtime/python.exe" outils/maj_fiches.py      # ou double-clic sur outils/maj_fiches.bat

# Tester en local (http://localhost:8770) — config « golf » dans ../.claude/launch.json
"../python-runtime/python.exe" -m http.server 8770 --directory .
```

Pas de build, pas de tests automatisés, pas de dépendances JS. Python embarqué dans `../python-runtime/` (avec `pypdf` et `python-docx`). Pas de git installé sur la machine : publication prévue via GitHub Desktop ou upload web.

## Architecture

- `fiches.json` = **source de vérité** des exercices. `fiches-data.js` en est une copie (`window.FICHES_SECOURS`) **générée par le script** — ne jamais l'éditer à la main ; après toute modif de `fiches.json`, relancer `outils/maj_fiches.py` pour la régénérer (le script valide aussi les champs).
- `app.js` charge `fiches.json` via `fetch`, et retombe sur `FICHES_SECOURS` si fetch échoue (page ouverte en `file://`).
- **Structure du jour** (constantes en tête de `app.js`) : `CRENEAUX_GOLF` = 3 putting, 1 chipping/bunker, 2 practice (fers/drive/approches, `categoriesDifferentes`) ; `SEANCES_SPORT` par jour de semaine (0 = dimanche) : lun cardio ×5, mar/jeu 2 puissance + 3 force, mer/sam mobilité ×5, ven abdos ×5, dim récupération légère (1 récupération + 2 mobilité). Chaque exercice est un « créneau » `{bloc, categories}` ; `tirerPourCreneau()` sert au tirage ET à « Autre exo ».
- **Tirage du jour déterministe** : PRNG (FNV-1a + mulberry32) amorcé par la date. Pour exclure les exos des 3 derniers jours sans rien stocker, `programmeDuJour()` rejoue tous les jours depuis `DATE_DEPART` (2026-01-01). Conséquence : modifier la liste des fiches valides change les tirages (y compris celui du jour). Dans un créneau, le tirage choisit d'abord une **catégorie** puis une fiche. L'exclusion est « si possible » : un pool trop petit pour un créneau (il faut ≥ 4 × nb de créneaux de cette catégorie sur 4 jours glissants) provoque des répétitions — à vérifier par simulation sur 365 jours après tout changement de structure.
- « Fait ✓ » et « Autre exo » sont stockés par jour (`golf-seance-v2:jour:AAAA-MM-JJ`, remplacements indexés par position de créneau — changer la structure des créneaux impose de changer `PREFIXE_STOCKAGE`). Les remplacements n'influencent pas l'exclusion des jours suivants. Données de plus de 30 jours purgées.
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
