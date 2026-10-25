# Suivi – Séance de golf du jour

## Objectif
Page web statique (GitHub Pages) qui propose chaque jour un programme golf + une séance de sport, tiré d'une bibliothèque de fiches claires en français.

## État actuel (17/10/2026)
- ✅ **Structure du jour (v2)** :
  - Golf : 3 putting, 1 chipping (ou bunker), 2 practice (fers / drive / wedging, 2 catégories différentes).
  - Sport (5 exercices) : lundi cardio, mardi et jeudi force/vitesse/puissance (2 puissance + 3 force), mercredi et samedi mobilité, vendredi abdos, dimanche récupération légère (3 exercices).
- ✅ 206 fiches validées :
  - Golf (37) : 10 de mes PDF (putting), 27 trouvées en ligne (putting 4, chipping 3, bunker 3, wedging 3, fers 4, drive 4).
  - Physique (169) : TPI (mytpi.com) + programme du coach (.docx) + **105 fiches tirées des 47 photos des fiches du préparateur** (v3). Cardio 11, force 44, puissance 29, mobilité 57, abdos 28, récupération 6.
- ✅ Simulation sur 365 jours : aucune répétition sur 3 jours, les 206 fiches apparaissent, practice toujours de 2 catégories différentes.
- ✅ Le script gère les photos (nouvelle photo → brouillon « à analyser »).
- ✅ Testé dans le navigateur (mobile 375 px) : blocs, Fait ✓, Autre exo (respecte le créneau), durées.
- ✅ **En ligne** (17/10/2026) : https://mathdebournet-ui.github.io/golf/ — dépôt public `mathdebournet-ui/golf`, publié avec GitHub Desktop (branche `main`, racine). Vérifié : 206 fiches, PDF et .docx accessibles, photos non publiées (404), service worker actif.

- ✅ v3 (17/10/2026) : **nouveau programme à chaque ouverture** (demande utilisateur) au lieu d'un programme fixe par jour. Évite les exos des 3 jours précédents et de la dernière ouverture. Les ✓ repartent de zéro à chaque ouverture.

- ✅ v4 (18/10/2026) : **onglets ⛳ Parcours + Historique** (demande utilisateur). Nom demandé au départ, recherche du golf (mes parcours + OpenStreetMap via Photon, ou ajout manuel), saisie trou par trou (par, score, putts, fairway, pénalités, GIR auto), note libre, historique avec stats et carte de score, modifier/supprimer. Testé en local (mobile 375 px, clair/sombre) : recherche « saint-cloud » → Golf de Saint-Cloud (Garches), partie 18 trous complète, stats justes, pars retenus, reprise après rechargement, aucune erreur console. **En ligne** (vérifié le 18/10/2026 : 4 onglets, écran du nom, aucune erreur).

- ✅ v5 (18/10/2026) : **partage des parties entre joueurs** (demande utilisateur : « voir ce que les gens font sur le parcours »). Choix : tout le monde voit tout, envoi à la fin de la partie, simple message d'information (pas de case à cocher), Firebase. Code prêt (`partage.js`, Historique > « Tous les joueurs », règles dans `outils/regles-firestore.txt`). Projet Firebase `golf-seance` (forfait gratuit Spark, Firestore europe-west9, connexion anonyme, règles publiées). Testé en local sur la vraie base : envoi, lecture « Tous les joueurs », suppression en ligne, écriture au nom d'un autre téléphone refusée ; partie de test effacée. **En ligne** (vérifié le 18/10/2026 : connexion Firebase OK depuis github.io, « Tous les joueurs » vide).

- ✅ v6 (18/10/2026) : **onglet 💪 Prépa** (demande utilisateur) : le sport sort de « Aujourd'hui ». Choix par type de travail (6), objectif golf (vitesse de swing, dos, blessures, échauffement avant partie, récupération après partie), 33 séances du préparateur refaites depuis ses photos, bouton « Je ne sais pas » (planning de la semaine). Testé en local (375 px, aucune erreur). Publié.
- ✅ v8 (18/10/2026) : réponses de l'utilisateur intégrées : photo 8 « 50 rameur » = **50 coups** ; **« La phrase »** = série d'étirements avec engagement abdominal pour s'échauffer avant de jouer → fiche `la-phrase` (sans détail des mouvements, à préciser avec le préparateur), placée en tête de l'objectif « Échauffement avant une partie ». 207 fiches.

- 🔧 v7 (18/10/2026) : un joueur a terminé une partie mais **rien n'est arrivé dans Firestore** (base vide, vérifié). Cause non identifiée (ancienne version en cache sur son téléphone ? partie non terminée ? refus ?). Ajouts : bandeau « ⏳ X partie(s) pas encore visible(s) » + raison dans Historique > Mes parties, **sans bouton** (choix utilisateur : envoi 100 % automatique au lancement, au retour du réseau, au retour dans l'appli et toutes les 30 s tant qu'une partie attend) ; une partie refusée ne bloque plus les suivantes ; le service worker redemande toujours la dernière version (`cache: "no-cache"`). En attente du retour du joueur.

- ✅ v10 (18/10/2026) : **practice = exercices de PERFORMANCE uniquement** (demande utilisateur, practice seulement ; putting/chipping inchangés). Supprimés (techniques) : headcover-chemin, serviette-point-bas, pieds-joints, porte-de-depart-fers. Ajoutés (jeux notés, sources Golf Monthly / Alistair Davies et Golf Insider UK) : couloir de précision, tous les clubs sur le green, jeu à points aux fers (3 distances), jeu du hors-limites (drive), pitchs à points 27/46 m. Practice : 12 fiches (fers 4, drive 4, wedging 4). 208 fiches.

- ✅ v11 (19/10/2026) : **le nom est demandé dès l'ouverture du site** (demande utilisateur), sur une première page sans onglets (`#accueil`, `afficherAccueil()` dans parcours.js). Il n'est demandé qu'une fois et reste modifiable dans Parcours (« Changer »). Testé en local en 375 px : page d'accueil, validation, puis Aujourd'hui ; Parcours ne redemande plus le nom ; la page n'est plus affichée après un rechargement ; aucune erreur dans la console.
- 🔧 v12 (19/10/2026) : **série de jours d'affilée 🔥** (demande utilisateur, `serie.js`). Un jour compte quand au moins 3 exos d'« Aujourd'hui » sont cochés « Fait ✓ ». Badge en haut de toutes les pages : « 🔥 N jours d'affilée · aujourd'hui x/3 exos » et « 🏆 Record ». La série est envoyée dans Firestore (`series/<uid>`), mais **seul l'admin** peut la lire : il se connecte avec Google dans « 🔒 Espace admin » (lien en bas de page). Testé en local : calcul (série, record, série perdue, jour gagné qui reste gagné), affichage 375 px, page admin, envoi refusé proprement tant que les règles ne sont pas collées. **Pas testé : la connexion Google** (c'est l'utilisateur qui doit se connecter). À faire dans Firebase : activer Google, autoriser le domaine github.io et coller les nouvelles règles avec la vraie adresse.
- ✅ v13 (19/10/2026) : **exo coché « Fait » → descend tout en bas, grisé**, dans un bloc « ✓ Terminés » (demande utilisateur), dans Aujourd'hui et dans Prépa (`blocTermines()` dans app.js). Un bloc dont tous les exos sont faits disparaît du haut. On peut annuler avec « ✓ Fait » : l'exo remonte à sa place. Testé en local en 375 px, sans erreur.
- ✅ v14 (20/10/2026) : espace admin : **bouton 🗑 pour supprimer la ligne d'un joueur**, avec confirmation (même joueur sur 2 appareils). La règle Firestore `delete` est réservée à l'admin (`estAdmin()`). Deux adresses Google de l'utilisateur sont autorisées dans les règles de la console (pas dans le dépôt). Une ligne supprimée réapparaît si cet appareil valide un nouveau jour.
- 🔧 v16 (20/10/2026) : 4 demandes de l'utilisateur.
  - **Même programme toute la journée** (les ✓ sont gardés) + bouton « 🔄 Nouveau programme » (`programmeEnregistre`, `tirerNouveauProgramme` dans app.js). Fin du « nouveau tirage à chaque ouverture » de la v3.
  - **Case score sur chaque exo de putting** (`scores.js`) : dernier score, record (plus haut = mieux pour tous les exos de putting), nombre de scores, « Effacer le dernier ». Envoyé dans Firestore `scores/<uid>`, lisible seulement par l'admin.
  - **Chrono** (`chrono.js`) : boutons « ⏱ 30 s » détectés dans le texte des fiches (10 s à 10 min), barre en bas de l'écran, 3 bips + vibration à la fin.
  - **Sauvegarde Google** (`compte.js`) : badge « ⚠ Données sur ce téléphone seulement · ☁️ Sauvegarder avec Google », et « Retrouver mes données avec Google » sur la première page. Les données (nom, parcours, parties, série, scores) sont dans `sauvegardes/<uid>`, privé ; fusion entre appareils sans perte (suppressions mémorisées : `supprimees`, `effaces`).
  - **Espace admin** : onglets 🔥 Séries / ⛳ Parcours (tableau des parties par joueur) / 🎯 Putting (tableau des scores par joueur). 🗑 supprime la série et les scores.
  - Testé en local en 375 px : programme gardé après rechargement (avec ✓), nouveau programme, scores (enregistrer, record, effacer), chrono (compte à rebours, fin), fusion de deux appareils (simulée), tableaux admin (données de test), aucune erreur, pas de débordement. **Pas testé : la connexion Google** (compte de l'utilisateur). À faire : coller les nouvelles règles Firestore.
- ✅ v18 (20/10/2026) : enregistrer un score de putting coche l'exo « ✓ Fait » (il descend dans Terminés).
- 🔧 v19 (21/10/2026) : **remise à zéro de fin des tests** (demande utilisateur : tout remettre à 0). `remise-a-zero.js` (chargé en premier) efface sur chaque appareil, à l'ouverture, les parties, la partie en cours, la série et les scores (on garde le nom et les parcours mémorisés). Les sauvegardes Google d'avant la remise ne ramènent que nom + parcours (`remise` dans `fusionner`). Dans l'Espace admin, « 🧹 Tout remettre à zéro » efface en ligne parties, séries et scores (la règle `delete` des parties autorise maintenant l'admin). Testé en local (effacement, nom/parcours gardés, fusion). Pour une prochaine remise à zéro : `REMISE_A_ZERO` + 1.
- ✅ v20 (23/10/2026) : **Trèfle interactif** (`trefle.js`, demande utilisateur, « test » sur un exo). Sur la carte Trèfle, « 🍀 Commencer le Trèfle » ouvre un schéma plein écran avec les 16 points (4 × 3 pieds, 8 × 4 pieds, 4 × 5 pieds) : on appuie sur un point, puis Rentré ou Raté (choix de l'utilisateur : un raté ne fait pas repartir de zéro). Le tour en cours est gardé (« Reprendre »). À la fin, le score /16 va dans « Mon score » (l'exo passe en Fait). La carte affiche les ratés moyens et la réussite par distance sur tous les trèfles. Envoyé avec les scores (clé `trefle-stats`, pas de changement de règles Firestore) → onglet admin « 🍀 Trèfle » (un tableau pour tous les joueurs). Testé en local en 375 px : vrais appuis sur le schéma, tour complet, moyennes justes, tableau admin (données de test).
- ✅ v21 (23/10/2026) : **forme du Trèfle corrigée** d'après le PDF et les points jaunes de l'utilisateur : 3 feuilles (haut, gauche, droite : 5 pieds au bout, deux 4 pieds de chaque côté), 4 points à 3 pieds en diagonale, et en bas une ligne droite 3-4-5 pieds (que j'avais prise pour une légende). Soit 5 points à 3 pieds, 7 à 4 pieds et 4 à 5 pieds. Fiche « Trèfle » (mise en place) corrigée aussi.
- ✅ v22 (25/10/2026) : **Snail interactif** 🐌 (demande utilisateur), même principe que le Trèfle : spirale de 8 points (3 à 10 pieds) recopiée du PDF page 3 ; 3 boutons : ⬆ montante (3 → 10), ⬇ descendante (10 → 3), ⬆⬇ montante puis descendante (16 putts ; pendant chaque phase, seuls les points de la phase sont actifs). Score (putts rentrés) dans « Mon score », moyennes par distance sur la carte, onglet admin « 🐌 Snail ». Code commun : `exos-points.js` (remplace trefle.js ; les anciens tours de Trèfle sont convertis). Testé en local en 375 px : aller-retour complet, descendante, Trèfle (ancien + nouveau format), tableau admin (données de test), aucune erreur.
- ✅ v23 (25/10/2026) : Espace admin > ⛳ Parcours : le nom du parcours est cliquable et ouvre **le détail complet de la partie** (stats, carte de score trou par trou, note), comme dans l'Historique, sans Modifier/Supprimer (`detailPartie(partie, false)`). Testé en local (données de test).

## Décisions techniques
- **Sauvegarde = compte anonyme relié à Google** (`linkWithPopup`) : l'identifiant ne change pas, donc les parties déjà partagées restent les siennes. Si le compte Google existe déjà (autre appareil), le téléphone efface ses séries, scores et parties publiés sous l'ancien identifiant, rejoint le compte, fusionne, puis renvoie tout.
- **Fusion à chaque sauvegarde** (lecture → fusion → écriture) : deux appareils utilisés en parallèle ne s'écrasent pas. La partie modifiée en dernier gagne (`modifieeLe`).
- **Série = stockage à part `golf-serie-v1:`** (`faitsDuJour`, `joursValides`, `dernierEnvoi`), jamais purgé : les données du programme du jour sont purgées après 30 jours et les ✓ repartent de zéro à chaque ouverture.
- **Admin = 2e connexion Firebase nommée « admin »** (Google), séparée de la connexion anonyme : sinon la connexion Google changerait l'identifiant du téléphone et l'admin ne pourrait plus modifier ses propres parties. La lecture est bloquée par les règles (email de l'admin), pas par le code.
- **L'adresse de l'admin n'est pas écrite dans le dépôt public** : `outils/regles-firestore.txt` contient `ADRESSE_ADMIN`, à remplacer au moment de coller les règles.
- **Règle practice** : seulement des jeux de performance (score, cible, record à battre), jamais d'exercice de technique. À respecter pour toute nouvelle fiche fers/drive/approches.
- **Photos du préparateur toujours privées** (choix utilisateur v6) : l'onglet Prépa montre les séances refaites en fiches, jamais les photos.
- **Objectifs golf « vitesse / dos / blessures » = mélange de catégories** (pas de classement exercice par exercice) ; échauffement et récupération = listes fixes du préparateur.
- **Partage = Firebase (Firestore + connexion anonyme)** : gratuit, pas de compte pour les joueurs, chaque téléphone ne peut modifier/supprimer que ses parties (règles). SDK compat chargé à la demande depuis gstatic (rien si non configuré ou hors-ligne). Les parties restent d'abord sur le téléphone (`partagee: false` → envoyées dès que possible ; suppressions en file `aSupprimer`).
- **Recherche des golfs avec Photon** (OpenStreetMap) : gratuit, sans clé, filtre « terrain de golf », rapide (~50-400 ms). Nominatim testé : renvoie surtout des rues « Golf … » ; Overpass : trop lent.
- **Parties gardées seulement dans le navigateur du téléphone** (préfixe `golf-parcours-v1:`, jamais purgé). Pas de sauvegarde fichier (non demandée) : vider le navigateur ou changer de téléphone = parties perdues.
- **Par saisi pendant la partie** (pas d'écran de saisie préalable) et mémorisé par parcours.
- **Site dans `exercice golf/`** : les PDF sont liés directement. L'Excel est exclu par `.gitignore`.
- **Tirage aléatoire à chaque ouverture** (v3), historique mémorisé dans le navigateur (remplace le tirage déterministe par date des v1-v2).
- **Créneaux** : chaque exercice du jour = un créneau (bloc + catégories autorisées). Même logique pour le tirage et pour « Autre exo ».
- **Bunker dans le créneau chipping** (jeu court autour du green) : sinon les 3 fiches bunker n'apparaîtraient jamais. Confirmé par l'utilisateur (18/10/2026).
- **Prépa physique TPI + coach uniquement** (v2) : retrait de 10 fiches d'autres sources (Golf Digest, ACE, NHS, SuperSpeed…). Le Copenhagen est conservé avec TPI comme source.
- **4 fiches practice ajoutées** (porte de départ aux fers, pieds joints, jouer le parcours au practice, échelle de wedges) : avec seulement 7 fiches, le practice se répétait.
- **Stockage v2** (`golf-seance-v2:`) : les remplacements sont indexés par position ; l'ancienne version est purgée.
- **`fiches-data.js`** : ouverture par double-clic possible.
- **Python embarqué** (`../python-runtime`) avec `pypdf` + `python-docx`.

## Prochaines étapes
- [x] Publier sur GitHub Pages.
- Mises à jour : GitHub Desktop → message → **Commit to main** → **Push origin**.
- [x] Bunker dans le créneau chipping : confirmé.
- [ ] Ajuster les objectifs chiffrés après quelques séances.
- [x] Publier la v4 (Parcours + Historique).
- [ ] Retour de l'utilisateur après une vraie partie.
- [ ] **Plus tard (en pause, choix utilisateur du 25/10/2026)** : Trèfle pour le coach. `pour-le-coach/trefle.html` (version autonome, sans base, avec `postMessage` « trefle-termine » pour l'appli du coach) + `LISEZMOI.txt`. Le coach a une application sur mesure (perfgen.app, espace joueur / espace coach) : l'intégration est à faire par son développeur. ⚠ Version autonome **pas encore testée dans le navigateur** (une fenêtre de connexion Google bloquait le navigateur intégré) : la tester avant de l'envoyer.
- [ ] Idée possible : bouton « Sauvegarder mes parties » (fichier) si l'utilisateur craint de les perdre.

## Idées repérées dans les photos (non faites)
- **Défi à points** (photo 25, avril 2026) : barème d'activités (50 pompes = 2 pts, footing 3 km = 5…) avec un objectif de points par jour → pourrait devenir un onglet « Défi ».
- **Échauffement compétition** (photos 12 et 13) : pourrait devenir un bouton « Échauffement avant compét ».

## Points d'attention / à vérifier
- Photos du préparateur **non publiées** (prénoms d'autres joueurs, documents privés) : exclues par `.gitignore`.
- Confirmés par l'utilisateur (18/10/2026) : photo 3 = 40 s ; photo 13 = « tibias parallèles au sol » (consigne gardée telle quelle) ; photo 8 = 50 coups de rameur.
- « La phrase » : principe connu (étirements + gainage avant de jouer), mouvements exacts à demander au préparateur.
- La bibliothèque TPI (mytpi.com/exercises) demande une connexion : les fiches viennent des **articles publics** TPI. Plusieurs articles ne donnent pas les séries/répétitions → proposées par le coach et signalées en note.
- Cardio : 6 fiches seulement (TPI recommande peu de cardio) → la séance du lundi varie surtout dans l'ordre.
- Trèfle : une mention du PDF est à ignorer et à ne jamais citer sur le site (consigne de l'utilisateur). Elle reste visible dans le PDF lui-même (on ne modifie pas les PDF).
- Interprétations à confirmer : Leap Frog, Snail, Lowry Putt, Start Line, Speed Drill (voir notes des fiches).
- Toute modification de la liste des fiches change les tirages (y compris celui du jour).
- Les PDF et le .docx seront publics une fois en ligne.
