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

## Décisions techniques
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
