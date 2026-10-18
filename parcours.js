/* =========================================================
   Parcours – noter une partie trou par trou + historique
   ---------------------------------------------------------
   1. La première fois : on demande le nom du joueur.
   2. Nouvelle partie : on cherche le golf (mes parcours déjà joués,
      puis recherche en ligne dans OpenStreetMap), on choisit
      18 trous / 9 aller / 9 retour.
   3. Pour chaque trou : par, score, putts, fairway, pénalités.
      Le green en régulation est calculé tout seul.
   4. « Terminer » range la partie dans l'onglet Historique
      (et l'envoie en ligne pour les autres joueurs : voir partage.js).
   5. Historique > « Tous les joueurs » : les parties de tout le monde.

   Tout est gardé dans le navigateur du téléphone (localStorage),
   sous un préfixe à part : ces données ne sont JAMAIS effacées
   automatiquement (contrairement aux programmes du jour).
   Ce fichier utilise des fonctions de app.js : lireStockage,
   ecrireStockage, echapper, dateEnTexte, texteEnDate, changerVue.
   Il est chargé AVANT app.js, mais ses fonctions ne servent
   qu'une fois la page prête.
   ========================================================= */

"use strict";

// ---------- Réglages ----------
const PREFIXE_PARCOURS = "golf-parcours-v1:";
// Recherche des golfs : Photon (moteur de recherche gratuit basé sur OpenStreetMap)
const ADRESSE_RECHERCHE = "https://photon.komoot.io/api/";
const DELAI_RECHERCHE_MS = 8000;   // au-delà, on abandonne la recherche

const FORMATS = {
  "18": { nom: "18 trous", numeros: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] },
  aller: { nom: "9 trous (aller)", numeros: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  retour: { nom: "9 trous (retour)", numeros: [10, 11, 12, 13, 14, 15, 16, 17, 18] },
};

// Codes d'erreur -> phrases claires
const MESSAGES_PARCOURS = {
  "hors-ligne": "Pas de réseau : la recherche en ligne est impossible. Tu peux choisir un de tes parcours ou ajouter le golf à la main.",
  erreur: "La recherche en ligne ne répond pas. Réessaie dans un instant, ou ajoute le golf à la main.",
  aucun: "Aucun golf trouvé en ligne avec ce nom. Essaie le nom de la ville, ou ajoute le golf à la main.",
  memoire: "⚠ La mémoire du navigateur est indisponible : ta partie ne pourra pas être gardée.",
};

// État de l'écran (non mémorisé)
let changementDeNom = false;      // true = on affiche le formulaire du nom
let texteRecherche = "";
let resultatsEnLigne = [];        // [{ id, nom, lieu }]
let etatRecherche = "";           // "", "chargement", "ok", ou un code d'erreur
let numeroRecherche = 0;          // pour ignorer une réponse arrivée trop tard
let parcoursChoisi = null;        // parcours sélectionné avant de commencer
let partieOuverte = null;         // partie affichée dans l'historique (id, ou clé en ligne)
let vueHistorique = "miens";      // "miens" ou "tous" (parties de tous les joueurs)
let partiesCommunaute = null;     // null = pas encore chargées
let chargementCommunaute = false;
let erreurCommunaute = "";
let filtreJoueur = "tous";


/* =========================================================
   1. Données mémorisées
   ========================================================= */

function lireParcours(cle, defaut) { return lireStockage(cle, defaut, PREFIXE_PARCOURS); }
function ecrireParcours(cle, valeur) { return ecrireStockage(cle, valeur, PREFIXE_PARCOURS); }

function nomDuJoueur() { return lireParcours("joueur", ""); }
function mesParcours() { return lireParcours("parcours", {}); }          // { id: { id, nom, lieu, pars[18], dernierePartie } }
function partieEnCours() { return lireParcours("partieEnCours", null); }
function partiesTerminees() { return lireParcours("parties", []); }

function partieEnCoursExiste() { return partieEnCours() !== null; }


/* =========================================================
   2. Calculs
   ========================================================= */

// -2 -> "−2", 0 -> "Par", 3 -> "+3"
function texteEcart(ecart) {
  if (ecart === 0) return "Par";
  return ecart > 0 ? `+${ecart}` : `−${-ecart}`;
}

// Nom du score par rapport au par
function nomDuScore(score, par) {
  if (score === 1) return "En 1 !";
  const ecart = score - par;
  return { "-3": "Albatros", "-2": "Eagle", "-1": "Birdie", 0: "Par", 1: "Bogey", 2: "Double" }[ecart] || `+${ecart}`;
}

// Classe de couleur d'un score (sous le par, par, bogey, double et plus)
function classeDuScore(score, par) {
  if (score === null || score === undefined) return "";
  const ecart = score - par;
  if (ecart < 0) return "sous-par";
  if (ecart === 0) return "au-par";
  return ecart === 1 ? "bogey" : "double";
}

// Green en régulation : on est sur le green en (par − 2) coups ou moins
function greenEnRegulation(trou) {
  if (trou.score === null || trou.putts === null) return null;
  return trou.score - trou.putts <= trou.par - 2;
}

function calculerStats(partie) {
  const joues = partie.trous.filter((t) => t.score !== null);
  const somme = (liste, champ) => liste.reduce((total, t) => total + (t[champ] || 0), 0);
  const avecPutts = joues.filter((t) => t.putts !== null);
  const fairways = joues.filter((t) => t.par >= 4 && t.fairway !== null);
  const ecarts = joues.map((t) => t.score - t.par);
  return {
    trousJoues: joues.length,
    score: somme(joues, "score"),
    ecart: somme(joues, "score") - somme(joues, "par"),
    putts: somme(avecPutts, "putts"),
    trousAvecPutts: avecPutts.length,
    fairwaysTouches: fairways.filter((t) => t.fairway === "ok").length,
    fairwaysNotes: fairways.length,
    greens: avecPutts.filter(greenEnRegulation).length,
    penalites: somme(joues, "penalites"),
    sousPar: ecarts.filter((e) => e < 0).length,
    pars: ecarts.filter((e) => e === 0).length,
    bogeys: ecarts.filter((e) => e === 1).length,
    doubles: ecarts.filter((e) => e >= 2).length,
  };
}

function dateLisible(texte) {
  return texteEnDate(texte).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function pourcentage(nombre, total) {
  return total ? `${Math.round((nombre / total) * 100)} %` : "—";
}


/* =========================================================
   3. Recherche des golfs
   ========================================================= */

function sansAccents(texte) {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Mes parcours qui contiennent le texte tapé (les plus récents d'abord)
function mesParcoursFiltres() {
  const cherche = sansAccents(texteRecherche.trim());
  return Object.values(mesParcours())
    .filter((p) => !cherche || sansAccents(`${p.nom} ${p.lieu || ""}`).includes(cherche))
    .sort((a, b) => (b.dernierePartie || "").localeCompare(a.dernierePartie || "") || a.nom.localeCompare(b.nom, "fr"));
}

async function chercherEnLigne() {
  const texte = texteRecherche.trim();
  if (texte.length < 2) return;
  const numero = ++numeroRecherche;

  if (!navigator.onLine) {
    etatRecherche = "hors-ligne";
    afficherResultats();
    return;
  }
  etatRecherche = "chargement";
  afficherResultats();

  // On abandonne si la réponse met trop de temps (réseau faible sur le parcours)
  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_RECHERCHE_MS);
  try {
    // osm_tag : seulement les terrains de golf ; lat/lon : priorité à la France
    const adresse = `${ADRESSE_RECHERCHE}?q=${encodeURIComponent(texte)}&osm_tag=leisure:golf_course&limit=10&lat=46.6&lon=2.4`;
    const reponse = await fetch(adresse, { signal: controle.signal });
    if (!reponse.ok) throw new Error("erreur");
    const donnees = await reponse.json();
    if (numero !== numeroRecherche) return;   // une recherche plus récente a été lancée

    resultatsEnLigne = (donnees.features || [])
      .map((f) => f.properties || {})
      .filter((p) => p.name && p.osm_id)
      .map((p) => ({
        id: `osm-${p.osm_type}${p.osm_id}`,
        nom: p.name,
        lieu: [p.city || p.county, p.countrycode === "FR" ? "" : p.country].filter(Boolean).join(", "),
        france: p.countrycode === "FR",
      }))
      .sort((a, b) => Number(b.france) - Number(a.france));   // les golfs français d'abord
    etatRecherche = resultatsEnLigne.length > 0 ? "ok" : "aucun";
  } catch (e) {
    if (numero !== numeroRecherche) return;
    etatRecherche = "erreur";
  } finally {
    clearTimeout(minuteur);
  }
  afficherResultats();
}

// Garde le parcours dans « mes parcours » (sans écraser les pars déjà notés)
function memoriserParcours(parcours) {
  const tous = mesParcours();
  const existant = tous[parcours.id];
  tous[parcours.id] = {
    id: parcours.id,
    nom: parcours.nom,
    lieu: parcours.lieu || "",
    pars: existant && Array.isArray(existant.pars) ? existant.pars : Array(18).fill(4),
    dernierePartie: existant ? existant.dernierePartie : "",
  };
  ecrireParcours("parcours", tous);
  return tous[parcours.id];
}


/* =========================================================
   4. Actions sur la partie
   ========================================================= */

function commencerPartie(format) {
  if (!parcoursChoisi || !FORMATS[format]) return;
  const parcours = memoriserParcours(parcoursChoisi);
  const partie = {
    id: String(Date.now()),
    date: dateEnTexte(new Date()),
    joueur: nomDuJoueur(),
    parcoursId: parcours.id,
    parcoursNom: parcours.nom,
    parcoursLieu: parcours.lieu,
    format,
    trous: FORMATS[format].numeros.map((numero) => ({
      numero,
      par: parcours.pars[numero - 1] || 4,
      score: null,
      putts: null,
      fairway: null,      // "gauche", "ok", "droite" ou null
      penalites: 0,
    })),
    trouActuel: 0,        // position du trou affiché
    note: "",
  };
  ecrireParcours("partieEnCours", partie);
  parcoursChoisi = null;
  afficherParcours();
}

// Change une valeur du trou affiché (par, score, putts, fairway, penalites)
function modifierTrou(champ, valeur) {
  const partie = partieEnCours();
  if (!partie) return;
  const trou = partie.trous[partie.trouActuel];

  if (champ === "par") {
    trou.par = valeur;
    if (trou.par === 3) trou.fairway = null;   // pas de fairway sur un par 3
    // On retient le par de ce trou pour la prochaine partie sur ce parcours
    const tous = mesParcours();
    if (tous[partie.parcoursId]) {
      tous[partie.parcoursId].pars[trou.numero - 1] = valeur;
      ecrireParcours("parcours", tous);
    }
  } else if (champ === "fairway") {
    trou.fairway = trou.fairway === valeur ? null : valeur;   // 2e appui = on efface
  } else if (champ === "plus") {
    trou.score = Math.max(trou.score || 0, trou.par + 5) + 1;  // score au-delà des boutons
  } else {
    trou[champ] = valeur;
  }
  // Pas plus de putts que de coups
  if (trou.score !== null && trou.putts !== null && trou.putts > trou.score) trou.putts = trou.score;

  ecrireParcours("partieEnCours", partie);
  afficherParcours();
}

function allerAuTrou(position) {
  const partie = partieEnCours();
  if (!partie || position < 0 || position >= partie.trous.length) return;
  partie.trouActuel = position;
  ecrireParcours("partieEnCours", partie);
  afficherParcours();
  // On remonte en haut de la carte du trou (utile après la grille en bas)
  const carte = document.querySelector(".carte-trou");
  if (carte) carte.scrollIntoView({ block: "start" });
}

function terminerPartie() {
  const partie = partieEnCours();
  if (!partie) return;
  const sansScore = partie.trous.filter((t) => t.score === null).length;
  if (sansScore === partie.trous.length) {
    alert("Aucun trou n'a de score. Note au moins un trou, ou abandonne la partie.");
    return;
  }
  if (sansScore > 0 && !confirm(`${sansScore} trou${sansScore > 1 ? "s n'ont" : " n'a"} pas de score. Terminer quand même ?`)) return;

  // On range la partie dans l'historique (à la place de l'ancienne version si on la modifiait)
  const { trouActuel, enModification, ...aGarder } = partie;
  aGarder.partagee = false;   // à (r)envoyer en ligne (partage.js)
  const parties = partiesTerminees().filter((p) => p.id !== partie.id);
  parties.push(aGarder);
  ecrireParcours("parties", parties);
  synchroniserPartage();

  // Date de la dernière partie : les parcours les plus joués remontent en premier
  const tous = mesParcours();
  if (tous[partie.parcoursId] && !enModification) {
    tous[partie.parcoursId].dernierePartie = partie.date;
    ecrireParcours("parcours", tous);
  }

  ecrireParcours("partieEnCours", null);
  partieOuverte = partie.id;
  vueHistorique = "miens";
  changerVue("historique");
}

function abandonnerPartie() {
  const partie = partieEnCours();
  if (!partie) return;
  const question = partie.enModification
    ? "Annuler les modifications ? La partie reste comme avant dans l'historique."
    : "Abandonner la partie ? Les scores notés seront effacés.";
  if (!confirm(question)) return;
  ecrireParcours("partieEnCours", null);
  afficherParcours();
}

// Rouvre une partie terminée pour la corriger
function modifierPartie(id) {
  if (partieEnCoursExiste()) {
    alert("Une partie est déjà en cours. Termine-la ou abandonne-la avant d'en modifier une autre.");
    return;
  }
  const partie = partiesTerminees().find((p) => p.id === id);
  if (!partie) return;
  ecrireParcours("partieEnCours", { ...partie, trouActuel: 0, enModification: true });
  changerVue("parcours");
}

function supprimerPartie(id) {
  if (!confirm("Supprimer définitivement cette partie de l'historique ?")) return;
  const partie = partiesTerminees().find((p) => p.id === id);
  ecrireParcours("parties", partiesTerminees().filter((p) => p.id !== id));
  if (partie) supprimerEnLigne(partie);   // la retire aussi pour les autres joueurs
  partieOuverte = null;
  afficherHistorique();
}


/* =========================================================
   5. Affichage – onglet Parcours
   ========================================================= */

// Une rangée de gros boutons à choix unique
// choix : [[valeur, texte, sousTexte?]] ; actuel : valeur sélectionnée
function rangeeDeChoix(champ, choix, actuel, colonnes) {
  const boutons = choix.map(([valeur, texte, sousTexte]) => {
    const actif = valeur === actuel;
    return `<button type="button" class="choix-bouton ${actif ? "actif" : ""}" data-action="trou" data-champ="${champ}" data-valeur="${echapper(valeur)}" aria-pressed="${actif}">
      ${echapper(texte)}${sousTexte ? `<small>${echapper(sousTexte)}</small>` : ""}
    </button>`;
  });
  return `<div class="choix" style="--colonnes:${colonnes}">${boutons.join("")}</div>`;
}

function ecranNom() {
  const actuel = nomDuJoueur();
  return `
    <article class="carte">
      <h2 class="carte-titre">${actuel ? "Changer de nom" : "👋 Bienvenue !"}</h2>
      <p>${actuel ? "Ce nom sera affiché sur tes prochaines parties." : "Avant ta première partie, comment tu t'appelles ?"}</p>
      ${partageConfigure() ? `<p class="info-recherche attention">ℹ️ Tes parties terminées sont partagées : tous les joueurs qui utilisent l'appli voient ton nom, tes scores, tes statistiques et tes notes.</p>` : ""}
      <form id="form-nom" class="formulaire">
        <label for="champ-nom">Ton nom</label>
        <input id="champ-nom" name="nom" class="champ" type="text" maxlength="40" autocomplete="name" value="${echapper(actuel)}" required>
        <div class="actions">
          <button type="submit" class="bouton principal ${actuel ? "" : "pleine-largeur"}">Valider</button>
          ${actuel ? `<button type="button" class="bouton" data-action="annuler-nom">Annuler</button>` : ""}
        </div>
      </form>
    </article>`;
}

function ecranNouvellePartie() {
  const joueur = `
    <div class="ligne-joueur">
      <span>🏌️ Joueur : <strong>${echapper(nomDuJoueur())}</strong></span>
      <button type="button" class="lien-bouton" data-action="changer-nom">Changer</button>
    </div>`;

  // Parcours déjà choisi : on demande le nombre de trous
  if (parcoursChoisi) {
    const connu = mesParcours()[parcoursChoisi.id];
    const par18 = connu ? connu.pars.reduce((a, b) => a + b, 0) : null;
    return `${joueur}
      <article class="carte">
        <h2 class="carte-titre">⛳ ${echapper(parcoursChoisi.nom)}</h2>
        ${parcoursChoisi.lieu ? `<p class="objectif">${echapper(parcoursChoisi.lieu)}</p>` : ""}
        <p class="petit">${connu ? `Pars mémorisés de ta dernière partie (par ${par18} sur 18 trous).` : "Premier passage sur ce parcours : indique le par de chaque trou pendant la partie, il sera retenu pour la prochaine fois."}</p>
        <h4>Combien de trous ?</h4>
        <div class="actions">
          <button type="button" class="bouton principal pleine-largeur" data-action="commencer" data-format="18">18 trous</button>
          <button type="button" class="bouton" data-action="commencer" data-format="aller">9 trous aller</button>
          <button type="button" class="bouton" data-action="commencer" data-format="retour">9 trous retour</button>
          <button type="button" class="bouton pleine-largeur" data-action="changer-parcours">← Changer de parcours</button>
        </div>
      </article>`;
  }

  return `${joueur}
    <h2 class="bloc-titre">Nouvelle partie</h2>
    <p class="bloc-info">Où joues-tu aujourd'hui ?</p>
    <form id="form-recherche" class="recherche" role="search">
      <input name="recherche" class="champ" type="search" placeholder="Nom du golf ou de la ville" value="${echapper(texteRecherche)}" autocomplete="off" aria-label="Nom du golf ou de la ville">
      <button type="submit" class="bouton principal">🔍 Chercher</button>
    </form>
    <div id="parcours-resultats"></div>`;
}

// Liste des résultats (mise à jour à chaque lettre tapée, sans toucher au champ de saisie)
function afficherResultats() {
  const zone = document.getElementById("parcours-resultats");
  if (!zone) return;
  const bouton = (p, origine) => `
    <button type="button" class="resultat" data-action="choisir" data-origine="${origine}" data-id="${echapper(p.id)}">
      <strong>${echapper(p.nom)}</strong>${p.lieu ? `<span>${echapper(p.lieu)}</span>` : ""}
    </button>`;

  const miens = mesParcoursFiltres();
  let html = "";
  if (miens.length > 0) {
    html += `<h3 class="sous-titre">Mes parcours</h3>${miens.map((p) => bouton(p, "mes")).join("")}`;
  }

  if (etatRecherche === "chargement") {
    html += `<p class="info-recherche">Recherche en cours…</p>`;
  } else if (etatRecherche === "ok") {
    html += `<h3 class="sous-titre">Trouvés en ligne</h3>${resultatsEnLigne.map((p) => bouton(p, "ligne")).join("")}
      <p class="petit">Données © les contributeurs d'<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>.</p>`;
  } else if (MESSAGES_PARCOURS[etatRecherche]) {
    html += `<p class="info-recherche attention">${echapper(MESSAGES_PARCOURS[etatRecherche])}</p>`;
  } else if (miens.length === 0) {
    html += `<p class="info-recherche">Tape le nom du golf (ou de la ville), puis appuie sur « Chercher ».</p>`;
  }

  const texte = texteRecherche.trim();
  if (texte) {
    html += `<button type="button" class="bouton pleine-largeur ajout-manuel" data-action="ajouter-main">➕ Ajouter « ${echapper(texte)} » à la main</button>`;
  }
  zone.innerHTML = html;
}

function ecranTrou(partie) {
  const stats = calculerStats(partie);
  const trou = partie.trous[partie.trouActuel];
  const dernier = partie.trouActuel === partie.trous.length - 1;

  // Petite grille de tous les trous (un appui = aller au trou)
  const grille = partie.trous.map((t, i) => `
    <button type="button" class="case-trou ${classeDuScore(t.score, t.par)} ${i === partie.trouActuel ? "actuel" : ""}" data-action="aller" data-position="${i}" aria-label="Trou ${t.numero}">
      <small>${t.numero}</small>${t.score === null ? "·" : t.score}
    </button>`).join("");

  // Boutons de score : de 1 à par + 5 (et « + » au-delà)
  const scores = [];
  for (let s = 1; s <= trou.par + 5; s++) scores.push([s, String(s), nomDuScore(s, trou.par)]);
  if (trou.score !== null && trou.score > trou.par + 5) scores.push([trou.score, String(trou.score), nomDuScore(trou.score, trou.par)]);

  const gir = greenEnRegulation(trou);
  const titreTotal = stats.trousJoues
    ? `${stats.score} coups (${texteEcart(stats.ecart)}) après ${stats.trousJoues} trou${stats.trousJoues > 1 ? "s" : ""}`
    : "Aucun trou noté pour l'instant";

  return `
    <div class="resume">
      <span class="resume-total">${echapper(partie.parcoursNom)}</span>
      <p class="resume-detail">🏌️ ${echapper(partie.joueur)} · ${FORMATS[partie.format].nom}${partie.enModification ? " · modification" : ""}</p>
      <p class="resume-detail"><strong>${titreTotal}</strong></p>
    </div>

    <article class="carte carte-trou">
      <div class="carte-haut">
        <h2 class="numero-trou">Trou ${trou.numero}</h2>
        <span class="numero">${partie.trouActuel + 1}/${partie.trous.length}</span>
      </div>

      <h4>Par</h4>
      ${rangeeDeChoix("par", [[3, "Par 3"], [4, "Par 4"], [5, "Par 5"]], trou.par, 3)}

      <h4>Score</h4>
      ${rangeeDeChoix("score", scores, trou.score, 5)}
      <button type="button" class="lien-bouton" data-action="trou" data-champ="plus">+ Score plus élevé</button>

      <h4>Putts</h4>
      ${rangeeDeChoix("putts", [[0, "0"], [1, "1"], [2, "2"], [3, "3"], [4, "4"]], trou.putts, 5)}

      ${trou.par >= 4 ? `<h4>Fairway (coup de départ)</h4>
      ${rangeeDeChoix("fairway", [["gauche", "⬅ Gauche"], ["ok", "✓ Touché"], ["droite", "Droite ➡"]], trou.fairway, 3)}` : ""}

      <h4>Pénalités</h4>
      ${rangeeDeChoix("penalites", [[0, "0"], [1, "1"], [2, "2"], [3, "3"]], trou.penalites, 4)}

      <p class="green ${gir === null ? "" : gir ? "oui" : "non"}">
        ${gir === null ? "Green en régulation : calculé quand score et putts sont notés" : gir ? "✓ Green en régulation" : "✗ Green manqué en régulation"}
      </p>

      <div class="actions">
        <button type="button" class="bouton" data-action="aller" data-position="${partie.trouActuel - 1}" ${partie.trouActuel === 0 ? "disabled" : ""}>← Précédent</button>
        ${dernier
          ? `<button type="button" class="bouton principal" data-action="terminer">🏁 Terminer</button>`
          : `<button type="button" class="bouton principal" data-action="aller" data-position="${partie.trouActuel + 1}">Suivant →</button>`}
      </div>
    </article>

    <h4 class="sous-titre">Tous les trous</h4>
    <div class="grille-trous">${grille}</div>

    <article class="carte">
      <h4>📝 Note sur la partie</h4>
      ${partageConfigure() ? `<p class="petit">Visible par tous les joueurs une fois la partie terminée.</p>` : ""}
      <textarea id="note-partie" class="champ zone-note" rows="3" placeholder="Ex. : bon putting, drive à droite, vent fort… à travailler : wedges 50-80 m">${echapper(partie.note)}</textarea>
      <div class="actions">
        <button type="button" class="bouton principal" data-action="terminer">🏁 Terminer la partie</button>
        <button type="button" class="bouton" data-action="abandonner">${partie.enModification ? "Annuler" : "Abandonner"}</button>
      </div>
    </article>`;
}

function afficherParcours() {
  const zone = document.getElementById("parcours");
  const avertissement = stockageDisponible() ? "" : `<p class="erreur">${MESSAGES_PARCOURS.memoire}</p>`;
  const partie = partieEnCours();

  if (!nomDuJoueur() || changementDeNom) {
    zone.innerHTML = avertissement + ecranNom();
  } else if (partie) {
    zone.innerHTML = avertissement + ecranTrou(partie);
  } else {
    zone.innerHTML = avertissement + ecranNouvellePartie();
    afficherResultats();
  }
}


/* =========================================================
   6. Affichage – onglet Historique
   ========================================================= */

function carteDeScore(partie) {
  const lignes = partie.trous.map((t) => {
    const gir = greenEnRegulation(t);
    const fairway = { gauche: "⬅", ok: "✓", droite: "➡" }[t.fairway] || (t.par === 3 ? "" : "—");
    return `<tr>
      <td>${t.numero}</td><td>${t.par}</td>
      <td class="${classeDuScore(t.score, t.par)}">${t.score ?? "—"}</td>
      <td>${t.putts ?? "—"}</td><td>${fairway}</td>
      <td>${gir === null ? "—" : gir ? "✓" : "✗"}</td>
      <td>${t.penalites || ""}</td>
    </tr>`;
  }).join("");
  const s = calculerStats(partie);
  const parTotal = partie.trous.reduce((total, t) => total + t.par, 0);
  return `
    <div class="tableau-defilant">
      <table class="carte-score">
        <thead><tr><th>Trou</th><th>Par</th><th>Score</th><th>Putts</th><th>FW</th><th>GIR</th><th>Pén.</th></tr></thead>
        <tbody>${lignes}</tbody>
        <tfoot><tr><td>Total</td><td>${parTotal}</td><td>${s.score}</td><td>${s.putts}</td><td>${s.fairwaysTouches}</td><td>${s.greens}</td><td>${s.penalites || ""}</td></tr></tfoot>
      </table>
    </div>`;
}

// modifiable : true pour mes parties (boutons Modifier / Supprimer)
function detailPartie(partie, modifiable) {
  const s = calculerStats(partie);
  const chiffres = [
    ["Score", `${s.score} (${texteEcart(s.ecart)})`],
    ["Putts", s.trousAvecPutts ? `${s.putts} (${(s.putts / s.trousAvecPutts).toFixed(1).replace(".", ",")} / trou)` : "—"],
    ["Fairways", s.fairwaysNotes ? `${s.fairwaysTouches}/${s.fairwaysNotes} (${pourcentage(s.fairwaysTouches, s.fairwaysNotes)})` : "—"],
    ["Greens en régul.", s.trousAvecPutts ? `${s.greens}/${s.trousAvecPutts} (${pourcentage(s.greens, s.trousAvecPutts)})` : "—"],
    ["Pénalités", String(s.penalites)],
    ["Birdies ou mieux", String(s.sousPar)],
    ["Pars", String(s.pars)],
    ["Bogeys", String(s.bogeys)],
    ["Doubles ou plus", String(s.doubles)],
  ];
  return `
    <button type="button" class="bouton pleine-largeur retour" data-action="liste">← Toutes les parties</button>
    <article class="carte">
      <h2 class="carte-titre">⛳ ${echapper(partie.parcoursNom)}</h2>
      <p class="objectif">${echapper(dateLisible(partie.date))} · 🏌️ ${echapper(partie.joueur)} · ${nomFormat(partie.format)}</p>
      <dl class="chiffres">${chiffres.map(([nom, valeur]) => `<div><dt>${nom}</dt><dd>${echapper(valeur)}</dd></div>`).join("")}</dl>
      ${s.trousJoues < partie.trous.length ? `<p class="note">${partie.trous.length - s.trousJoues} trou(s) sans score : non comptés.</p>` : ""}
      <h4>Carte de score</h4>
      ${carteDeScore(partie)}
      <h4>📝 Note</h4>
      <p class="note-partie">${partie.note ? echapper(partie.note) : "Pas de note."}</p>
      ${modifiable ? `<div class="actions">
        <button type="button" class="bouton" data-action="modifier" data-id="${echapper(partie.id)}">✏️ Modifier</button>
        <button type="button" class="bouton danger" data-action="supprimer" data-id="${echapper(partie.id)}">🗑 Supprimer</button>
      </div>` : ""}
    </article>`;
}

// Nom du format, même si la donnée reçue en ligne est inattendue
function nomFormat(format) { return FORMATS[format] ? FORMATS[format].nom : ""; }

// Une ligne de la liste des parties (un appui = voir le détail)
function ligneDePartie(p, cle, etiquette = "") {
  const s = calculerStats(p);
  return `
    <button type="button" class="resultat partie" data-action="ouvrir" data-cle="${echapper(cle)}">
      <span class="partie-score ${s.ecart < 0 ? "sous-par" : s.ecart === 0 ? "au-par" : ""}">${s.score}<small>${texteEcart(s.ecart)}</small></span>
      <span class="partie-texte">
        <strong>${echapper(p.parcoursNom)}</strong>
        <span>${echapper(dateLisible(p.date))} · ${echapper(p.joueur)} · ${nomFormat(p.format)}${etiquette}</span>
      </span>
    </button>`;
}

// Boutons « Mes parties » / « Tous les joueurs »
function choixHistorique() {
  return `<div class="filtres">
    ${[["miens", "Mes parties"], ["tous", "👥 Tous les joueurs"]].map(([valeur, nom]) =>
      `<button type="button" class="filtre ${vueHistorique === valeur ? "actif" : ""}" data-action="vue-historique" data-valeur="${valeur}" aria-pressed="${vueHistorique === valeur}">${nom}</button>`).join("")}
  </div>`;
}

function afficherHistorique() {
  if (vueHistorique === "tous") {
    afficherCommunaute();
    return;
  }
  const zone = document.getElementById("historique");
  const parties = partiesTerminees().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const ouverte = parties.find((p) => p.id === partieOuverte);
  if (ouverte) {
    zone.innerHTML = detailPartie(ouverte, true);
    return;
  }

  let html = choixHistorique();

  // Parties pas encore envoyées : on dit pourquoi (l'envoi se refait tout seul, voir partage.js)
  const enAttente = parties.filter((p) => !p.partagee).length;
  if (partageConfigure() && enAttente > 0) {
    const raison = MESSAGES_PARTAGE[etatPartage] || "Envoi en cours…";
    html += `<div class="resume en-attente">
      <p class="resume-detail">⏳ ${enAttente} partie${enAttente > 1 ? "s" : ""} pas encore visible${enAttente > 1 ? "s" : ""} par les autres joueurs : envoi automatique dès que possible.</p>
      <p class="resume-detail">${echapper(raison)}</p>
    </div>`;
  }

  const enCours = partieEnCours();
  if (enCours) {
    html += `<div class="resume en-cours">
      <p class="resume-detail">⏳ Partie en cours : <strong>${echapper(enCours.parcoursNom)}</strong> (trou ${enCours.trous[enCours.trouActuel].numero})</p>
      <button type="button" class="bouton principal pleine-largeur" data-action="reprendre">Reprendre la partie</button>
    </div>`;
  }

  if (parties.length === 0) {
    zone.innerHTML = html + `<p class="info-recherche">Aucune partie terminée pour l'instant. Lance une partie dans l'onglet « Parcours ».</p>`;
    return;
  }

  // Petit résumé : moyenne des scores et des putts sur les parties de 18 trous complètes
  const completes18 = parties.filter((p) => p.format === "18" && p.trous.every((t) => t.score !== null));
  if (completes18.length > 0) {
    const stats = completes18.map(calculerStats);
    const moyenne = (champ) => (stats.reduce((t, s) => t + s[champ], 0) / stats.length).toFixed(1).replace(".", ",");
    html += `<div class="resume">
      <span class="resume-total">${parties.length} partie${parties.length > 1 ? "s" : ""}</span>
      <p class="resume-detail">Sur ${completes18.length} partie${completes18.length > 1 ? "s" : ""} de 18 trous : moyenne ${moyenne("score")} coups, ${moyenne("putts")} putts</p>
    </div>`;
  } else {
    html += `<p class="compte">${parties.length} partie${parties.length > 1 ? "s" : ""}</p>`;
  }

  // Avec le partage : on indique si la partie est déjà en ligne
  const etiquette = (p) => (partageConfigure() ? (p.partagee ? " · ☁️ partagée" : " · ⏳ en attente d'envoi") : "");
  html += parties.map((p) => ligneDePartie(p, p.id, etiquette(p))).join("");
  zone.innerHTML = html;
}

// Onglet Historique > Tous les joueurs : parties envoyées par tout le monde
function afficherCommunaute() {
  const zone = document.getElementById("historique");

  if (!partageConfigure()) {
    zone.innerHTML = choixHistorique() + `<p class="info-recherche attention">${MESSAGES_PARTAGE["non-configure"]}</p>`;
    return;
  }
  if (partiesCommunaute === null) {
    zone.innerHTML = choixHistorique() + `<p class="info-recherche">Chargement des parties…</p>`;
    if (!chargementCommunaute) actualiserCommunaute();
    return;
  }

  const ouverte = partiesCommunaute.find((p) => p.cle === partieOuverte);
  if (ouverte) {
    zone.innerHTML = detailPartie(ouverte, false);
    return;
  }

  let html = choixHistorique();
  if (erreurCommunaute) {
    html += `<p class="info-recherche attention">${MESSAGES_PARTAGE[erreurCommunaute] || MESSAGES_PARTAGE.erreur}</p>`;
  }

  // Filtre par joueur
  const joueurs = [...new Set(partiesCommunaute.map((p) => p.joueur))].sort((a, b) => a.localeCompare(b, "fr"));
  if (filtreJoueur !== "tous" && !joueurs.includes(filtreJoueur)) filtreJoueur = "tous";
  if (joueurs.length > 1) {
    html += `<div class="filtres">${[["tous", "Tous"], ...joueurs.map((j) => [j, j])].map(([valeur, nom]) =>
      `<button type="button" class="filtre ${filtreJoueur === valeur ? "actif" : ""}" data-action="filtre-joueur" data-valeur="${echapper(valeur)}" aria-pressed="${filtreJoueur === valeur}">${echapper(nom)}</button>`).join("")}</div>`;
  }

  const visibles = partiesCommunaute
    .filter((p) => filtreJoueur === "tous" || p.joueur === filtreJoueur)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  html += `<p class="compte">${visibles.length} partie${visibles.length > 1 ? "s" : ""}${chargementCommunaute ? " · actualisation…" : ""}</p>`;
  html += visibles.length
    ? visibles.map((p) => ligneDePartie(p, p.cle)).join("")
    : `<p class="info-recherche">Aucune partie partagée pour l'instant.</p>`;
  html += `<button type="button" class="bouton pleine-largeur retour" data-action="actualiser">↻ Actualiser</button>`;
  zone.innerHTML = html;
}

async function actualiserCommunaute() {
  chargementCommunaute = true;
  const parties = await chargerCommunaute();   // partage.js
  chargementCommunaute = false;
  if (parties) {
    // Données venues d'internet : on garde seulement les parties bien formées
    const nombre = (v) => (Number.isInteger(v) && v >= 0 && v < 30 ? v : null);
    partiesCommunaute = parties
      .filter((p) => p && Array.isArray(p.trous) && typeof p.joueur === "string" && typeof p.parcoursNom === "string")
      .map((p) => ({
        ...p,
        note: typeof p.note === "string" ? p.note : "",
        trous: p.trous.map((t) => ({
          numero: nombre(t.numero) || 0,
          par: [3, 4, 5].includes(t.par) ? t.par : 4,
          score: nombre(t.score),
          putts: nombre(t.putts),
          fairway: ["gauche", "ok", "droite"].includes(t.fairway) ? t.fairway : null,
          penalites: nombre(t.penalites) || 0,
        })),
      }));
    erreurCommunaute = "";
  } else {
    erreurCommunaute = etatPartage;
    if (partiesCommunaute === null) partiesCommunaute = [];
  }
  if (!document.getElementById("vue-historique").hidden) afficherHistorique();
}


/* =========================================================
   7. Écouteurs (un seul par zone, grâce à data-action)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const zoneParcours = document.getElementById("parcours");
  const zoneHistorique = document.getElementById("historique");

  zoneParcours.addEventListener("submit", (evenement) => {
    evenement.preventDefault();   // pas de rechargement de la page
    const formulaire = evenement.target;
    if (formulaire.id === "form-nom") {
      const nom = formulaire.nom.value.trim();
      if (!nom) return;
      ecrireParcours("joueur", nom);
      changementDeNom = false;
      afficherParcours();
    } else if (formulaire.id === "form-recherche") {
      formulaire.recherche.blur();   // ferme le clavier du téléphone
      chercherEnLigne();
    }
  });

  zoneParcours.addEventListener("input", (evenement) => {
    if (evenement.target.name === "recherche") {
      texteRecherche = evenement.target.value;
      if (etatRecherche !== "chargement") etatRecherche = "";   // l'ancien résultat ne correspond plus
      afficherResultats();
    } else if (evenement.target.id === "note-partie") {
      // La note est enregistrée à chaque lettre (rien à perdre si le téléphone se met en veille)
      const partie = partieEnCours();
      if (partie) {
        partie.note = evenement.target.value;
        ecrireParcours("partieEnCours", partie);
      }
    }
  });

  zoneParcours.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-action]");
    if (!bouton) return;
    const d = bouton.dataset;
    if (d.action === "changer-nom") { changementDeNom = true; afficherParcours(); }
    if (d.action === "annuler-nom") { changementDeNom = false; afficherParcours(); }
    if (d.action === "choisir") {
      const liste = d.origine === "mes" ? Object.values(mesParcours()) : resultatsEnLigne;
      parcoursChoisi = liste.find((p) => p.id === d.id) || null;
      afficherParcours();
      window.scrollTo(0, 0);
    }
    if (d.action === "ajouter-main") {
      parcoursChoisi = { id: `perso-${Date.now()}`, nom: texteRecherche.trim(), lieu: "" };
      afficherParcours();
    }
    if (d.action === "changer-parcours") { parcoursChoisi = null; afficherParcours(); }
    if (d.action === "commencer") commencerPartie(d.format);
    if (d.action === "trou") {
      const valeur = ["fairway"].includes(d.champ) ? d.valeur : Number(d.valeur);
      modifierTrou(d.champ, valeur);
    }
    if (d.action === "aller") allerAuTrou(Number(d.position));
    if (d.action === "terminer") terminerPartie();
    if (d.action === "abandonner") abandonnerPartie();
  });

  zoneHistorique.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-action]");
    if (!bouton) return;
    const d = bouton.dataset;
    if (d.action === "ouvrir") { partieOuverte = d.cle; afficherHistorique(); window.scrollTo(0, 0); }
    if (d.action === "liste") { partieOuverte = null; afficherHistorique(); }
    if (d.action === "vue-historique") {
      vueHistorique = d.valeur;
      partieOuverte = null;
      if (vueHistorique === "tous" && partiesCommunaute !== null) actualiserCommunaute();   // données fraîches
      afficherHistorique();
    }
    if (d.action === "filtre-joueur") { filtreJoueur = d.valeur; afficherHistorique(); }
    if (d.action === "actualiser") { actualiserCommunaute(); afficherHistorique(); }
    if (d.action === "reprendre") changerVue("parcours");    if (d.action === "modifier") modifierPartie(d.id);
    if (d.action === "supprimer") supprimerPartie(d.id);
  });
});
