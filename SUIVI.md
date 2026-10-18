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

- ✅ v4 (18/10/2026) : **onglets ⛳ Parcours + Historique** (demande utilisateur). Nom demandé au départ, recherche du golf (mes parcours + OpenStreetMap via Photon, ou ajout manuel), saisie trou par trou (par, score, putts, fairway, pénalités, GIR auto), note libre, historique avec stats et carte de score, modifier/supprimer. Testé en local (mobile 375 px, clair/sombre) : recherche « saint-cloud » → Golf de Saint-Cloud (Garches), partie 18 trous complète, stats justes, pars retenus, reprise après rechargement, aucune erreur console. **Pas encore publié.**

## Décisions techniques
- **Recherche des golfs avec Photon** (OpenStreetMap) : gratuit, sans clé, filtre « terrain de golf », rapide (~50-400 ms). Nominatim testé : renvoie surtout des rues « Golf … » ; Overpass : trop lent.
- **Parties gardées seulement dans le navigateur du téléphone** (préfixe `golf-parcours-v1:`, jamais purgé). Pas de sauvegarde fichier (non demandée) : vider le navigateur ou changer de téléphone = parties perdues.
- **Par saisi pendant la partie** (pas d'écran de saisie préalable) et mémorisé par parcours.
- **Site dans `exercice golf/`** : les PDF sont liés directement. L'Excel est exclu par `.gitignore`.
- **Tirage aléatoire à chaque ouverture** (v3), historique mémorisé dans le navigateur (remplace le tirage déterministe par date des v1-v2).
- **Créneaux** : chaque exercice du jour = un créneau (bloc + catégories autorisées). Même logique pour le tirage et pour « Autre exo ».
- **Bunker dans le créneau chipping** (jeu court autour du green) : sinon les 3 fiches bunker n'apparaîtraient jamais. À confirmer avec l'utilisateur.
- **Prépa physique TPI + coach uniquement** (v2) : retrait de 10 fiches d'autres sources (Golf Digest, ACE, NHS, SuperSpeed…). Le Copenhagen est conservé avec TPI comme source.
- **4 fiches practice ajoutées** (porte de départ aux fers, pieds joints, jouer le parcours au practice, échelle de wedges) : avec seulement 7 fiches, le practice se répétait.
- **Stockage v2** (`golf-seance-v2:`) : les remplacements sont indexés par position ; l'ancienne version est purgée.
- **`fiches-data.js`** : ouverture par double-clic possible.
- **Python embarqué** (`../python-runtime`) avec `pypdf` + `python-docx`.

## Prochaines étapes
- [x] Publier sur GitHub Pages.
- Mises à jour : GitHub Desktop → message → **Commit to main** → **Push origin**.
- [ ] Confirmer : bunker dans le créneau chipping ? Durée de la journée (~2 h) acceptable ?
- [ ] Ajuster les objectifs chiffrés après quelques séances.
- [ ] Publier la v4 (Parcours + Historique) et tester sur le téléphone, sur un vrai parcours.
- [ ] Idée possible : bouton « Sauvegarder mes parties » (fichier) si l'utilisateur craint de les perdre.

## Idées repérées dans les photos (non faites)
- **Défi à points** (photo 25, avril 2026) : barème d'activités (50 pompes = 2 pts, footing 3 km = 5…) avec un objectif de points par jour → pourrait devenir un onglet « Défi ».
- **Échauffement compétition** (photos 12 et 13) : pourrait devenir un bouton « Échauffement avant compét ».

## Points d'attention / à vérifier
- Photos du préparateur **non publiées** (prénoms d'autres joueurs, documents privés) : exclues par `.gitignore`.
- Photo 3 : durée du gainage sur swiss ball illisible (40 s proposé). Photo 8 : « 50 rameur » = 50 m ou 50 coups ? Photo 13 : « tibias parallèles au sol » (chaise murale) probablement « cuisses ».
- « Faire la phrase » (tableau photo 25) et « Routines TPI et phrase » (.docx) : toujours non identifié.
- La bibliothèque TPI (mytpi.com/exercises) demande une connexion : les fiches viennent des **articles publics** TPI. Plusieurs articles ne donnent pas les séries/répétitions → proposées par le coach et signalées en note.
- Cardio : 6 fiches seulement (TPI recommande peu de cardio) → la séance du lundi varie surtout dans l'ordre.
- « Routines TPI et phrase » (programme physique) : intitulé ambigu → pas de fiche.
- Trèfle : « SG +2.19 » non expliqué.
- Interprétations à confirmer : Leap Frog, Snail, Lowry Putt, Start Line, Speed Drill (voir notes des fiches).
- Toute modification de la liste des fiches change les tirages (y compris celui du jour).
- Les PDF et le .docx seront publics une fois en ligne.
