/* =========================================================
   Sauvegarde avec Google (facultative)
   ---------------------------------------------------------
   Sans compte : tout reste dans ce navigateur (comme avant).
   Avec « Sauvegarder avec Google » :
   - nom, parcours, parties, série 🔥 et scores sont gardés en
     ligne dans un document PRIVÉ (Firestore « sauvegardes/<uid> »,
     lisible seulement par ce compte Google : voir les règles) ;
   - sur un autre appareil, « Retrouver mes données avec Google »
     récupère tout, et les deux appareils deviennent UN seul joueur.
   Fusion entre appareils : rien n'est perdu (on garde tout ce qui
   existe d'un côté ou de l'autre), sauf ce qui a été supprimé exprès
   (listes « supprimees » et « effaces »).
   Utilise : partage.js (demarrerPartage, baseDeDonnees, idAppareil…),
   parcours.js, serie.js, scores.js, app.js (lireStockage…).
   ========================================================= */

"use strict";

const COLLECTION_SAUVEGARDES = "sauvegardes";
const DELAI_SAUVEGARDE_MS = 4000;   // on attend un peu : plusieurs changements = un seul envoi
const TAILLE_SAUVEGARDE_MAX = 900000;

const MESSAGES_COMPTE = {
  "hors-ligne": "Pas de réseau : la sauvegarde se fera dès que le réseau revient.",
  "popup-bloquee": "La fenêtre de connexion Google a été bloquée. Autorise les fenêtres pour ce site, puis réessaie.",
  annule: "Connexion annulée.",
  domaine: "Ce site n'est pas encore autorisé pour la connexion Google (Firebase > Authentication > Paramètres > Domaines autorisés).",
  "google-inactif": "La connexion Google n'est pas activée dans Firebase.",
  refuse: "La sauvegarde a été refusée par la base en ligne (règles Firestore à mettre à jour ?).",
  "trop-gros": "Tes données sont trop volumineuses pour la sauvegarde en ligne.",
  erreur: "La sauvegarde ne répond pas. Réessaie dans un moment.",
};

let etatCompte = "attente";   // attente, local (pas de compte Google), google, erreur
let erreurCompte = "";
let minuterieSauvegarde = null;
let sauvegardeEnCours = false;
let fusionDuDemarrageFaite = false;

function codeErreurCompte(e) {
  const code = (e && e.code) || "";
  if (!navigator.onLine) return "hors-ligne";
  if (code === "permission-denied") return "refuse";
  if (code === "auth/popup-blocked") return "popup-bloquee";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "annule";
  if (code === "auth/unauthorized-domain") return "domaine";
  if (code === "auth/operation-not-allowed") return "google-inactif";
  return "erreur";
}

function utilisateurGoogle() {
  try {
    const u = window.firebase && firebase.apps.some((a) => a.name === "[DEFAULT]") ? firebase.auth().currentUser : null;
    return u && !u.isAnonymous ? u : null;
  } catch (e) {
    return null;
  }
}


/* ---------- 1. Données à sauvegarder et fusion ---------- */

function donneesLocales() {
  return {
    remise: REMISE_A_ZERO,   // remise-a-zero.js
    joueur: nomDuJoueur(),
    parcours: mesParcours(),
    parties: partiesTerminees(),
    supprimees: lireParcours("supprimees", []),
    joursValides: joursValides(),
    faitsDuJour: lireStockage("faitsDuJour", {}, PREFIXE_SERIE),
    scores: lireScores(),
    scoresEffaces: lireStockage("effaces", [], PREFIXE_SCORES),
    // Tours des exos à points (exos-points.js) : { trefles: [...], snails: [...] }
    ...Object.fromEntries(Object.keys(EXOS_POINTS).map((exo) => [EXOS_POINTS[exo].cleTours, toursDe(exo)])),
  };
}

const union = (a, b) => [...new Set([...(a || []), ...(b || [])])];

// Fusionne deux sauvegardes. « prioritaire » gagne pour le nom du joueur.
function fusionner(prioritaire, autre) {
  let a = prioritaire || {};
  let b = autre || {};
  // Une sauvegarde d'avant la dernière remise à zéro ne garde que le nom et les parcours
  const remise = Math.max(a.remise || 0, b.remise || 0);
  const avantRemise = (d) => ({ remise, joueur: d.joueur, parcours: d.parcours });
  if ((a.remise || 0) < remise) a = avantRemise(a);
  if ((b.remise || 0) < remise) b = avantRemise(b);

  const supprimees = union(a.supprimees, b.supprimees);
  const parties = {};
  for (const p of [...(b.parties || []), ...(a.parties || [])]) {
    if (!p || !p.id || supprimees.includes(p.id)) continue;
    const deja = parties[p.id];
    // Même partie des deux côtés : la version modifiée en dernier gagne
    if (!deja || (p.modifieeLe || 0) >= (deja.modifieeLe || 0)) parties[p.id] = p;
  }

  const parcours = { ...(b.parcours || {}) };
  for (const [id, c] of Object.entries(a.parcours || {})) {
    const deja = parcours[id];
    if (!deja || (c.dernierePartie || "") >= (deja.dernierePartie || "")) parcours[id] = c;
  }

  const fa = a.faitsDuJour || {};
  const fb = b.faitsDuJour || {};
  const faitsDuJour = fa.jour === fb.jour
    ? { jour: fa.jour, ids: union(fa.ids, fb.ids) }
    : ((fa.jour || "") > (fb.jour || "") ? fa : fb);

  const scoresEffaces = union(a.scoresEffaces, b.scoresEffaces);
  const scores = {};
  for (const source of [b.scores || {}, a.scores || {}]) {
    for (const [id, liste] of Object.entries(source)) {
      if (!Array.isArray(liste)) continue;
      const parT = new Map((scores[id] || []).map((s) => [s.t, s]));
      liste.forEach((s) => { if (s && !scoresEffaces.includes(s.t)) parT.set(s.t, s); });
      scores[id] = [...parT.values()].sort((x, y) => x.t - y.t);
      if (scores[id].length === 0) delete scores[id];
    }
  }

  // Tours des exos à points (Trèfle, Snail) : union (chaque tour a son identifiant t)
  const tours = {};
  for (const config of Object.values(EXOS_POINTS)) {
    const parT = new Map();
    [...(b[config.cleTours] || []), ...(a[config.cleTours] || [])].forEach((x) => { if (x && x.t) parT.set(x.t, x); });
    tours[config.cleTours] = [...parT.values()].sort((x, y) => x.t - y.t);
  }

  return {
    remise,
    ...tours,
    joueur: a.joueur || b.joueur || "",
    parcours,
    parties: Object.values(parties).sort((x, y) => x.id.localeCompare(y.id)),
    supprimees,
    joursValides: union(a.joursValides, b.joursValides).sort(),
    faitsDuJour,
    scores,
    scoresEffaces,
  };
}

// Écrit une sauvegarde dans ce navigateur (sans redéclencher d'envoi)
function appliquerLocalement(d) {
  ecrireStockage("joueur", d.joueur, PREFIXE_PARCOURS);
  ecrireStockage("parcours", d.parcours, PREFIXE_PARCOURS);
  ecrireStockage("parties", d.parties, PREFIXE_PARCOURS);
  ecrireStockage("supprimees", d.supprimees, PREFIXE_PARCOURS);
  ecrireStockage("joursValides", d.joursValides, PREFIXE_SERIE);
  ecrireStockage("faitsDuJour", d.faitsDuJour, PREFIXE_SERIE);
  ecrireStockage("scores", d.scores, PREFIXE_SCORES);
  ecrireStockage("effaces", d.scoresEffaces, PREFIXE_SCORES);
  for (const config of Object.values(EXOS_POINTS)) ecrireStockage(config.cleTours, d[config.cleTours] || [], PREFIXE_SCORES);
}

// Rafraîchit ce qui est affiché après une restauration
function rafraichirApresRestauration() {
  afficherAccueil();
  afficherSerie();
  afficherCompte();
  if (!document.getElementById("vue-jour").hidden && programmeCourant.length) afficherProgramme(dateEnTexte(new Date()));
  if (!document.getElementById("vue-parcours").hidden) afficherParcours();
  if (!document.getElementById("vue-historique").hidden) afficherHistorique();
}


/* ---------- 2. Lecture / écriture en ligne ---------- */

async function lireSauvegarde(uid) {
  const doc = await baseDeDonnees.collection(COLLECTION_SAUVEGARDES).doc(uid).get();
  if (!doc.exists) return null;
  try { return JSON.parse(doc.data().donnees); } catch (e) { return null; }
}

// Lit la sauvegarde en ligne, la fusionne avec ce navigateur, puis renvoie le résultat
async function sauvegarder() {
  const u = utilisateurGoogle();
  if (!u || sauvegardeEnCours) return;
  sauvegardeEnCours = true;
  try {
    const locales = donneesLocales();
    const fusion = fusionner(locales, await lireSauvegarde(u.uid));
    if (JSON.stringify(fusion) !== JSON.stringify(locales)) {
      appliquerLocalement(fusion);
      rafraichirApresRestauration();
    }
    const texte = JSON.stringify(fusion);
    if (texte.length > TAILLE_SAUVEGARDE_MAX) throw { code: "trop-gros" };
    await baseDeDonnees.collection(COLLECTION_SAUVEGARDES).doc(u.uid).set({
      uid: u.uid,
      donnees: texte,
      majLe: firebase.firestore.FieldValue.serverTimestamp(),
    });
    erreurCompte = "";
  } catch (e) {
    erreurCompte = e && e.code === "trop-gros" ? "trop-gros" : codeErreurCompte(e);
  } finally {
    sauvegardeEnCours = false;
  }
  afficherCompte();
}

// Appelée à chaque changement (nom, parties, série, scores)
function planifierSauvegarde() {
  if (!utilisateurGoogle() || !fusionDuDemarrageFaite) return;
  clearTimeout(minuterieSauvegarde);
  minuterieSauvegarde = setTimeout(sauvegarder, DELAI_SAUVEGARDE_MS);
}


/* ---------- 3. Connexion Google ---------- */

async function activerSauvegarde() {
  erreurCompte = "";
  if (!(await demarrerPartage())) {
    erreurCompte = codeErreurCompte(null);
    afficherCompte();
    return;
  }
  const fournisseur = new firebase.auth.GoogleAuthProvider();
  fournisseur.setCustomParameters({ prompt: "select_account" });
  const anonyme = firebase.auth().currentUser;

  try {
    // Cas 1 : ce compte Google est nouveau → on le relie à ce téléphone (même identifiant, rien ne change)
    await anonyme.linkWithPopup(fournisseur);
  } catch (e) {
    if (e.code !== "auth/credential-already-in-use") {
      erreurCompte = codeErreurCompte(e);
      afficherCompte();
      return;
    }
    // Cas 2 : ce compte Google est déjà utilisé sur un autre appareil → on rejoint ce compte
    await rejoindreCompte(e.credential, fournisseur);
    return;
  }
  idAppareil = firebase.auth().currentUser.uid;
  fusionDuDemarrageFaite = true;
  await sauvegarder();
}

// Ce téléphone rejoint un compte Google déjà utilisé ailleurs :
// on retire ses données publiées sous l'ancien identifiant, on change
// d'identifiant, puis on fusionne et on renvoie tout sous le nouveau.
async function rejoindreCompte(identifiants, fournisseur) {
  const ancienUid = idAppareil;
  const locales = donneesLocales();
  try {
    // 1. Ménage sous l'ancien identifiant (pour ne pas avoir deux joueurs)
    const effacer = [
      baseDeDonnees.collection(COLLECTION_SERIES).doc(ancienUid).delete(),
      baseDeDonnees.collection(COLLECTION_SCORES).doc(ancienUid).delete(),
      ...locales.parties.filter((p) => p.partagee).map((p) => documentPartie(p.id).delete()),
    ];
    await Promise.allSettled(effacer);

    // 2. Connexion au compte Google existant
    const resultat = identifiants
      ? await firebase.auth().signInWithCredential(identifiants)
      : await firebase.auth().signInWithPopup(fournisseur);
    idAppareil = resultat.user.uid;

    // 3. Fusion : le compte en ligne garde son nom de joueur
    const enLigne = await lireSauvegarde(idAppareil);
    const fusion = fusionner(enLigne, locales);
    // Les parties de ce téléphone doivent être renvoyées sous le nouvel identifiant
    // (seules celles déjà partagées par le compte Google sont déjà en ligne)
    const dejaEnLigne = new Set(((enLigne && enLigne.parties) || []).filter((p) => p.partagee).map((p) => p.id));
    fusion.parties = fusion.parties.map((p) => ({ ...p, partagee: dejaEnLigne.has(p.id) && !!p.partagee }));
    appliquerLocalement(fusion);
    ecrireStockage("aSupprimer", [], PREFIXE_PARCOURS);
    ecrireStockage("dernierEnvoi", null, PREFIXE_SERIE);
    ecrireStockage("dernierEnvoi", null, PREFIXE_SCORES);

    fusionDuDemarrageFaite = true;
    await sauvegarder();
    synchroniserPartage();
    envoyerSerie();
    envoyerScores();
    rafraichirApresRestauration();
  } catch (e) {
    erreurCompte = codeErreurCompte(e);
    afficherCompte();
  }
}


/* ---------- 4. Affichage (badge en haut + écran d'accueil) ---------- */

function afficherCompte() {
  const zone = document.getElementById("compte");
  if (!zone || !partageConfigure()) return;
  const u = utilisateurGoogle();
  let html = u
    ? `<span class="badge">☁️ Sauvegardé avec Google</span>`
    : `<button type="button" class="badge attention bouton-badge" data-action="activer-sauvegarde">⚠ Données sur ce téléphone seulement · ☁️ Sauvegarder avec Google</button>`;
  if (erreurCompte) html += `<span class="badge attention">${echapper(MESSAGES_COMPTE[erreurCompte] || MESSAGES_COMPTE.erreur)}</span>`;
  zone.innerHTML = html;

  // Écran d'accueil (nom pas encore donné) : proposer de retrouver ses données
  const accueil = document.getElementById("accueil-google");
  if (accueil) accueil.hidden = !!u;
}


/* ---------- 5. Démarrage ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  if (!partageConfigure()) return;
  afficherCompte();
  document.addEventListener("click", (evenement) => {
    if (evenement.target.closest('[data-action="activer-sauvegarde"]')) activerSauvegarde();
  });
  window.addEventListener("online", () => { if (utilisateurGoogle()) sauvegarder(); });

  // Compte Google déjà relié : on récupère ce qui a été fait sur les autres appareils
  if (await demarrerPartage()) {
    if (utilisateurGoogle()) {
      fusionDuDemarrageFaite = true;
      await sauvegarder();
    }
  }
  fusionDuDemarrageFaite = true;
  afficherCompte();
});
