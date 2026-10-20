/* =========================================================
   Série de jours d'affilée (🔥) + espace administrateur
   ---------------------------------------------------------
   - Un jour compte dans la série quand au moins 3 exos du
     programme « Aujourd'hui » sont cochés « Fait ✓ ».
   - La série et le record sont calculés sur le téléphone,
     puis envoyés en ligne (Firestore, collection « series »).
   - SEUL l'administrateur (connecté avec son compte Google)
     peut lire les séries de tous les joueurs : c'est garanti
     par les règles Firestore (outils/regles-firestore.txt),
     pas par ce code.
   L'espace admin montre aussi les parties (⛳) et les scores de
   putting (🎯, voir scores.js) de chaque joueur, en tableaux.
   Utilise : lireStockage / ecrireStockage / dateEnTexte /
   texteEnDate / ajouterJours / echapper (app.js),
   nomDuJoueur / dateLisible (parcours.js),
   demarrerPartage / CONFIG_FIREBASE / codeErreurPartage (partage.js).
   ========================================================= */

"use strict";

// Préfixe à part, jamais purgé (la série peut durer plus de 30 jours)
const PREFIXE_SERIE = "golf-serie-v1:";
const EXOS_POUR_VALIDER = 3;
const COLLECTION_SERIES = "series";
const NOM_APP_ADMIN = "admin";   // 2e connexion Firebase, séparée de la connexion anonyme

const MESSAGES_ADMIN = {
  refuse: "Cet espace est réservé à l'administrateur. Connecte-toi avec le bon compte Google.",
  "hors-ligne": "Pas de réseau : impossible de charger les séries.",
  "popup-bloquee": "La fenêtre de connexion Google a été bloquée. Autorise les fenêtres pour ce site, puis réessaie.",
  annule: "Connexion annulée.",
  "suppression-refusee": "Suppression refusée par Firebase : dans les règles Firestore, la ligne « allow read, delete » des séries n'est pas (encore) publiée.",
  domaine: "Ce site n'est pas encore autorisé pour la connexion Google (Firebase > Authentication > Paramètres > Domaines autorisés).",
  "google-inactif": "La connexion Google n'est pas encore activée dans Firebase (Authentication > Méthode de connexion).",
  erreur: "Impossible de charger les séries pour l'instant. Réessaie dans un moment.",
};

function lireSerieStockee(cle, defaut) { return lireStockage(cle, defaut, PREFIXE_SERIE); }
function ecrireSerieStockee(cle, valeur) { return ecrireStockage(cle, valeur, PREFIXE_SERIE); }


/* ---------- 1. Calcul de la série ---------- */

// Exos cochés aujourd'hui. On garde notre propre liste : la page
// remet les ✓ à zéro à chaque ouverture, mais ce qui a été fait reste fait.
function faitsDuJour() {
  const aujourdhui = dateEnTexte(new Date());
  const memo = lireSerieStockee("faitsDuJour", {});
  return memo.jour === aujourdhui && Array.isArray(memo.ids) ? memo.ids : [];
}

function joursValides() {
  const jours = lireSerieStockee("joursValides", []);
  return Array.isArray(jours) ? jours : [];
}

// Appelé par app.js quand on coche / décoche « Fait ✓ »
function noterExoFait(idFiche, fait) {
  const aujourdhui = dateEnTexte(new Date());
  let ids = faitsDuJour().filter((id) => id !== idFiche);
  if (fait) ids.push(idFiche);
  ecrireSerieStockee("faitsDuJour", { jour: aujourdhui, ids });

  // 3 exos atteints : le jour est gagné (il reste gagné même si on décoche ensuite)
  const jours = joursValides();
  if (ids.length >= EXOS_POUR_VALIDER && !jours.includes(aujourdhui)) {
    jours.push(aujourdhui);
    ecrireSerieStockee("joursValides", jours.sort());
    envoyerSerie();
  }
  afficherSerie();
  if (typeof planifierSauvegarde === "function") planifierSauvegarde();   // compte.js
}

// { actuelle, record, dernierJour, aujourdhuiFait }
function calculerSerie() {
  const jours = new Set(joursValides());
  const aujourdhui = dateEnTexte(new Date());
  const hier = dateEnTexte(ajouterJours(new Date(), -1));

  // Série actuelle : toujours vivante tant qu'hier est validé (on a la journée pour continuer)
  let actuelle = 0;
  let jour = jours.has(aujourdhui) ? aujourdhui : hier;
  while (jours.has(jour)) {
    actuelle++;
    jour = dateEnTexte(ajouterJours(texteEnDate(jour), -1));
  }

  // Record : la plus longue suite de jours qui se suivent
  let record = 0;
  let suite = 0;
  let precedent = null;
  for (const j of [...jours].sort()) {
    suite = precedent && dateEnTexte(ajouterJours(texteEnDate(precedent), 1)) === j ? suite + 1 : 1;
    record = Math.max(record, suite);
    precedent = j;
  }

  return {
    actuelle,
    record,
    dernierJour: precedent || "",
    aujourdhuiFait: Math.min(faitsDuJour().length, EXOS_POUR_VALIDER),
    aujourdhuiValide: jours.has(aujourdhui),
  };
}


/* ---------- 2. Affichage (badge en haut de toutes les pages) ---------- */

function afficherSerie() {
  const zone = document.getElementById("serie");
  if (!zone) return;
  const s = calculerSerie();
  const jours = `${s.actuelle} jour${s.actuelle > 1 ? "s" : ""} d'affilée`;
  const aujourdhui = s.aujourdhuiValide
    ? "aujourd'hui ✓"
    : `aujourd'hui ${s.aujourdhuiFait}/${EXOS_POUR_VALIDER} exos`;
  zone.innerHTML = `
    <span class="badge serie ${s.actuelle > 0 ? "active" : ""}">🔥 ${jours} · ${aujourdhui}</span>
    <span class="badge">🏆 Record : ${s.record} jour${s.record > 1 ? "s" : ""}</span>`;
}


/* ---------- 3. Envoi en ligne (lu seulement par l'administrateur) ---------- */

async function envoyerSerie() {
  if (!partageConfigure() || !nomDuJoueur()) return;
  const s = calculerSerie();
  const donnees = { joueur: nomDuJoueur(), actuelle: s.actuelle, record: s.record, dernierJour: s.dernierJour };
  // Rien de neuf depuis le dernier envoi réussi : on ne renvoie pas
  if (JSON.stringify(lireSerieStockee("dernierEnvoi", null)) === JSON.stringify(donnees)) return;
  if (!(await demarrerPartage())) return;   // réessayé au prochain lancement / retour du réseau
  try {
    await baseDeDonnees.collection(COLLECTION_SERIES).doc(idAppareil).set({
      ...donnees,
      uid: idAppareil,
      majLe: firebase.firestore.FieldValue.serverTimestamp(),
    });
    ecrireSerieStockee("dernierEnvoi", donnees);
  } catch (e) {
    // Pas grave : on réessaiera plus tard
  }
}


/* ---------- 4. Espace administrateur ---------- */

// Trois onglets : 🔥 Séries, ⛳ Parcours (parties de chaque joueur), 🎯 Putting (scores)
let ongletAdmin = "series";
let joueurAdmin = "";         // uid du joueur affiché (onglets Parcours et Putting)
let seriesAdmin = null;       // données reçues (null = pas encore chargées)
let partiesAdmin = null;
let scoresAdmin = null;
let erreurAdmin = "";
let chargementAdmin = false;

function appAdmin() {
  try { return firebase.app(NOM_APP_ADMIN); } catch (e) { return firebase.initializeApp(CONFIG_FIREBASE, NOM_APP_ADMIN); }
}

function codeErreurAdmin(e) {
  const code = (e && e.code) || "";
  if (!navigator.onLine) return "hors-ligne";
  if (code === "permission-denied") return "refuse";
  if (code === "auth/popup-blocked") return "popup-bloquee";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "annule";
  if (code === "auth/unauthorized-domain") return "domaine";
  if (code === "auth/operation-not-allowed") return "google-inactif";
  return "erreur";
}

// Série affichée pour l'admin : si le joueur n'a rien validé ni hier ni aujourd'hui, elle est perdue
function serieEnCours(s) {
  const hier = dateEnTexte(ajouterJours(new Date(), -1));
  return s.dernierJour >= hier ? s.actuelle : 0;
}

async function connecterAdmin() {
  erreurAdmin = "";
  if (!(await demarrerPartage()) && !window.firebase) {
    erreurAdmin = "hors-ligne";
    afficherAdmin();
    return;
  }
  try {
    // Les données se chargent ensuite toutes seules (onAuthStateChanged, voir ouvrirAdmin)
    await appAdmin().auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
  } catch (e) {
    erreurAdmin = codeErreurAdmin(e);
    afficherAdmin();
  }
}

async function deconnecterAdmin() {
  try { await appAdmin().auth().signOut(); } catch (e) { /* rien à faire */ }
  seriesAdmin = partiesAdmin = scoresAdmin = null;
  erreurAdmin = "";
  afficherAdmin();
}

const dateValide = (d) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "");

async function chargerAdmin() {
  chargementAdmin = true;
  erreurAdmin = "";
  afficherAdmin();
  const base = appAdmin().firestore();
  const [series, parties, scores] = await Promise.allSettled([
    base.collection(COLLECTION_SERIES).get(),
    base.collection(COLLECTION_PARTIES).orderBy("envoyeLe", "desc").limit(500).get(),
    base.collection(COLLECTION_SCORES).get(),
  ]);
  // Données en ligne = non fiables : on vérifie chaque champ
  if (series.status === "fulfilled") {
    seriesAdmin = series.value.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }))
      .filter((s) => typeof s.joueur === "string")
      .map((s) => ({
        id: s.id,
        joueur: s.joueur,
        actuelle: Number.isInteger(s.actuelle) ? s.actuelle : 0,
        record: Number.isInteger(s.record) ? s.record : 0,
        dernierJour: dateValide(s.dernierJour),
      }));
  } else {
    erreurAdmin = codeErreurAdmin(series.reason);
  }
  if (parties.status === "fulfilled") {
    partiesAdmin = normaliserParties(parties.value.docs.map((doc) => doc.data()))   // parcours.js
      .filter((p) => typeof p.uid === "string");
  }
  if (scores.status === "fulfilled") {
    scoresAdmin = scores.value.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }))
      .filter((s) => typeof s.joueur === "string" && s.scores && typeof s.scores === "object")
      .map((s) => {
        const propres = {};
        for (const [idFiche, liste] of Object.entries(s.scores)) {
          if (!Array.isArray(liste)) continue;
          const ok = liste.filter((x) => x && Number.isInteger(x.v) && dateValide(x.d));
          if (ok.length) propres[idFiche] = ok.map((x) => ({ d: x.d, v: x.v }));
        }
        return { id: s.id, joueur: s.joueur, scores: propres };
      });
  } else if (!erreurAdmin) {
    erreurAdmin = codeErreurAdmin(scores.reason);
  }
  chargementAdmin = false;
  afficherAdmin();
}

// Tous les joueurs connus (un par identifiant), avec leur nom le plus récent
function joueursAdmin() {
  const noms = new Map();
  (partiesAdmin || []).slice().reverse().forEach((p) => noms.set(p.uid, p.joueur));   // de la plus ancienne à la plus récente
  (seriesAdmin || []).forEach((s) => noms.set(s.id, s.joueur));
  (scoresAdmin || []).forEach((s) => noms.set(s.id, s.joueur));
  return [...noms.entries()]
    .map(([uid, nom]) => ({ uid, nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

// Boutons pour choisir le joueur (même prénom sur 2 appareils : on numérote)
function choixJoueurAdmin(joueurs) {
  if (!joueurs.some((j) => j.uid === joueurAdmin)) joueurAdmin = joueurs.length ? joueurs[0].uid : "";
  const compte = {};
  return `<div class="filtres">${joueurs.map((j) => {
    compte[j.nom] = (compte[j.nom] || 0) + 1;
    const doublon = joueurs.filter((x) => x.nom === j.nom).length > 1 ? ` (${compte[j.nom]})` : "";
    const actif = j.uid === joueurAdmin;
    return `<button type="button" class="filtre ${actif ? "actif" : ""}" data-action="admin-joueur" data-uid="${echapper(j.uid)}" aria-pressed="${actif}">${echapper(j.nom + doublon)}</button>`;
  }).join("")}</div>`;
}

function htmlSeriesAdmin() {
  if (!seriesAdmin) return "";
  const liste = seriesAdmin
    .map((s) => ({ ...s, enCours: serieEnCours(s) }))
    .sort((a, b) => b.enCours - a.enCours || b.record - a.record || a.joueur.localeCompare(b.joueur, "fr"));
  if (liste.length === 0) return `<p class="petit">Aucune série reçue pour l'instant.</p>`;
  return liste.map((s) => `
    <div class="resultat partie">
      <span class="partie-score ${s.enCours > 0 ? "sous-par" : ""}">${s.enCours}<small>🔥</small></span>
      <span class="partie-texte">
        <strong>${echapper(s.joueur)}</strong>
        <span>🏆 Record ${s.record} · ${s.dernierJour ? "dernier jour validé : " + echapper(dateLisible(s.dernierJour)) : "aucun jour validé"}</span>
      </span>
      <button type="button" class="bouton danger supprimer-serie" data-action="admin-supprimer" data-id="${echapper(s.id)}" data-nom="${echapper(s.joueur)}" aria-label="Supprimer ${echapper(s.joueur)}">🗑</button>
    </div>`).join("");
}

function htmlParcoursAdmin() {
  if (!partiesAdmin) return "";
  const joueurs = joueursAdmin().filter((j) => partiesAdmin.some((p) => p.uid === j.uid));
  if (joueurs.length === 0) return `<p class="petit">Aucune partie partagée pour l'instant.</p>`;
  let html = choixJoueurAdmin(joueurs);
  const parties = partiesAdmin.filter((p) => p.uid === joueurAdmin).sort((a, b) => b.date.localeCompare(a.date));
  const lignes = parties.map((p) => {
    const s = calculerStats(p);   // parcours.js
    return `<tr>
      <td>${echapper(dateLisible(p.date))}</td>
      <td>${echapper(p.parcoursNom)}<br><small>${echapper(nomFormat(p.format))}</small></td>
      <td class="nombre"><strong>${s.score}</strong> <small>${texteEcart(s.ecart)}</small></td>
      <td class="nombre">${s.trousAvecPutts ? s.putts : "—"}</td>
      <td class="nombre">${s.trousAvecPutts ? `${s.greens}/${s.trousAvecPutts}` : "—"}</td>
      <td class="nombre">${s.fairwaysNotes ? `${s.fairwaysTouches}/${s.fairwaysNotes}` : "—"}</td>
    </tr>`;
  }).join("");
  html += `<div class="tableau-defilant"><table class="tableau-admin">
    <thead><tr><th>Date</th><th>Parcours</th><th>Score</th><th>Putts</th><th>GIR</th><th>Fairways</th></tr></thead>
    <tbody>${lignes}</tbody></table></div>`;
  return html;
}

function htmlPuttingAdmin() {
  if (!scoresAdmin) return "";
  const joueurs = joueursAdmin().filter((j) => scoresAdmin.some((s) => s.id === j.uid && Object.keys(s.scores).length));
  if (joueurs.length === 0) return `<p class="petit">Aucun score de putting reçu pour l'instant.</p>`;
  let html = choixJoueurAdmin(joueurs);
  const scores = (scoresAdmin.find((s) => s.id === joueurAdmin) || { scores: {} }).scores;
  const lignes = Object.entries(scores)
    .map(([idFiche, liste]) => {
      const fiche = fichesValides.find((f) => f.id === idFiche);
      const tries = liste.slice().sort((a, b) => a.d.localeCompare(b.d));
      return { titre: fiche ? fiche.titre : idFiche, idFiche, liste: tries };
    })
    .sort((a, b) => a.titre.localeCompare(b.titre, "fr"))
    .map((e) => {
      const dernier = e.liste[e.liste.length - 1];
      const record = Math.max(...e.liste.map((x) => x.v));
      const recents = e.liste.slice(-5).map((x) => x.v).join(" · ");
      return `<tr>
        <td>${echapper(e.titre)}</td>
        <td class="nombre"><strong>${echapper(texteScore(e.idFiche, dernier.v))}</strong><br><small>${echapper(dateLisible(dernier.d))}</small></td>
        <td class="nombre">${echapper(texteScore(e.idFiche, record))}</td>
        <td class="nombre">${e.liste.length}</td>
        <td><small>${echapper(recents)}</small></td>
      </tr>`;
    }).join("");
  html += `<div class="tableau-defilant"><table class="tableau-admin">
    <thead><tr><th>Exo</th><th>Dernier</th><th>Record</th><th>Nb</th><th>5 derniers</th></tr></thead>
    <tbody>${lignes}</tbody></table></div>`;
  return html;
}

function afficherAdmin() {
  const zone = document.getElementById("admin");
  let utilisateur = null;
  try { utilisateur = window.firebase ? appAdmin().auth().currentUser : null; } catch (e) { /* pas encore chargé */ }

  let html = `<h2 class="bloc-titre">🔒 Espace admin</h2>
    <p class="bloc-info">Suivi de tous les joueurs (visible par toi seul).</p>`;
  if (erreurAdmin) html += `<p class="erreur">${echapper(MESSAGES_ADMIN[erreurAdmin] || MESSAGES_ADMIN.erreur)}</p>`;

  if (!utilisateur) {
    html += `<div class="actions"><button type="button" class="bouton principal pleine-largeur" data-action="admin-connexion">Se connecter avec Google</button></div>`;
    zone.innerHTML = html;
    return;
  }

  html += `<p class="petit">Connecté : ${echapper(utilisateur.email || "")}</p>
    <div class="filtres">${[["series", "🔥 Séries"], ["parcours", "⛳ Parcours"], ["putting", "🎯 Putting"]].map(([valeur, nom]) =>
      `<button type="button" class="filtre ${ongletAdmin === valeur ? "actif" : ""}" data-action="admin-onglet" data-valeur="${valeur}" aria-pressed="${ongletAdmin === valeur}">${nom}</button>`).join("")}</div>`;
  if (chargementAdmin) html += `<p class="petit">Chargement…</p>`;
  else if (ongletAdmin === "series") html += htmlSeriesAdmin();
  else if (ongletAdmin === "parcours") html += htmlParcoursAdmin();
  else html += htmlPuttingAdmin();

  html += `<div class="actions">
    <button type="button" class="bouton" data-action="admin-actualiser">↻ Actualiser</button>
    <button type="button" class="bouton" data-action="admin-deconnexion">Se déconnecter</button>
  </div>`;
  zone.innerHTML = html;
}

// Supprime la série ET les scores d'un joueur (ex. le même joueur sur deux appareils).
// Si cet appareil valide un nouveau jour ou note un score, il réapparaîtra.
async function supprimerSerieAdmin(id, nom) {
  if (!confirm(`Supprimer « ${nom} » (série et scores de putting) ?`)) return;
  try {
    const base = appAdmin().firestore();
    await base.collection(COLLECTION_SERIES).doc(id).delete();
    await base.collection(COLLECTION_SCORES).doc(id).delete();
    await chargerAdmin();
  } catch (e) {
    erreurAdmin = codeErreurAdmin(e) === "refuse" ? "suppression-refusee" : codeErreurAdmin(e);
    afficherAdmin();
  }
}

// Appelé par changerVue("admin")
let suiviAdmin = false;
async function ouvrirAdmin() {
  afficherAdmin();
  await demarrerPartage();          // charge Firebase si besoin
  if (!window.firebase) return;
  if (!suiviAdmin) {
    // Firebase prévient à chaque connexion / déconnexion (et tout de suite au départ :
    // la connexion Google est gardée d'une fois sur l'autre)
    suiviAdmin = true;
    appAdmin().auth().onAuthStateChanged((u) => {
      if (document.getElementById("vue-admin").hidden) return;
      if (u) chargerAdmin(); else afficherAdmin();
    });
  } else if (appAdmin().auth().currentUser) {
    chargerAdmin();                 // données fraîches à chaque ouverture
  }
}


/* ---------- 5. Démarrage ---------- */

document.addEventListener("DOMContentLoaded", () => {
  afficherSerie();
  envoyerSerie();
  window.addEventListener("online", envoyerSerie);
  // La page reste ouverte après minuit : le badge doit suivre
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") afficherSerie(); });

  document.getElementById("lien-admin").addEventListener("click", () => changerVue("admin"));
  document.getElementById("admin").addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-action]");
    if (!bouton) return;
    if (bouton.dataset.action === "admin-connexion") connecterAdmin();
    if (bouton.dataset.action === "admin-actualiser") chargerAdmin();
    if (bouton.dataset.action === "admin-onglet") { ongletAdmin = bouton.dataset.valeur; afficherAdmin(); }
    if (bouton.dataset.action === "admin-joueur") { joueurAdmin = bouton.dataset.uid; afficherAdmin(); }
    if (bouton.dataset.action === "admin-deconnexion") deconnecterAdmin();
    if (bouton.dataset.action === "admin-supprimer") supprimerSerieAdmin(bouton.dataset.id, bouton.dataset.nom);
  });
});
