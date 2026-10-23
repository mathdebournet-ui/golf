/* =========================================================
   Case « score » des exos de putting
   ---------------------------------------------------------
   - Sur chaque carte de putting d'« Aujourd'hui » : on tape son
     score, l'appli garde l'historique, le dernier score et le record.
   - Pour tous ces exos, plus le score est haut, mieux c'est.
   - Les scores sont envoyés en ligne (Firestore, collection
     « scores ») : SEUL l'administrateur peut les lire (Espace admin).
   Utilise : lireStockage / ecrireStockage / dateEnTexte / echapper (app.js),
   nomDuJoueur / dateLisible (parcours.js), demarrerPartage (partage.js).
   ========================================================= */

"use strict";

// Préfixe à part, jamais purgé
const PREFIXE_SCORES = "golf-scores-v1:";
const COLLECTION_SCORES = "scores";
const SCORES_ENVOYES_MAX = 30;   // par exo, les plus récents

// Unité de chaque exo de putting (lue dans le « critère de réussite » des fiches)
const UNITES_SCORE = {
  "2-feet-circle": "/ 12",
  "9-putt-circle": "/ 9",
  "demi-lune": "/ 12",
  "leap-frog": "balles",
  "lowry-putt": "/ 6",
  "speed-drill-cross": "/ 12",
  "start-line": "%",
  "speed-drill": "/ 30",
  trefle: "/ 16",
  "snail-3-10-feet": "putts d'affilée",
  "cercle-mickelson": "d'affilée",
  "porte-de-depart": "/ 30",
  "echelle-de-dosage": "balles réussies",
  "echelle-inversee": "balles",
};

function lireScores() {
  const scores = lireStockage("scores", {}, PREFIXE_SCORES);
  return scores && typeof scores === "object" ? scores : {};
}
function ecrireScores(scores) { return ecrireStockage("scores", scores, PREFIXE_SCORES); }

function avecCaseScore(fiche) { return fiche.categorie === "putting"; }

// Texte d'un score avec son unité : « 9 / 12 », « 85 % », « 7 balles »
function texteScore(idFiche, valeur) {
  const unite = UNITES_SCORE[idFiche] || "";
  if (unite.startsWith("/")) return `${valeur} ${unite}`;
  if (unite === "%") return `${valeur} %`;
  return unite ? `${valeur} ${unite}` : String(valeur);
}

// { dernier, record, nombre } pour un exo (null si aucun score)
function resumeScores(liste) {
  if (!liste || liste.length === 0) return null;
  return {
    dernier: liste[liste.length - 1],
    record: Math.max(...liste.map((s) => s.v)),
    nombre: liste.length,
  };
}

// Zone « score » d'une carte (appelée par carteFiche dans app.js)
function caseScore(fiche) {
  if (!avecCaseScore(fiche)) return "";
  const id = echapper(fiche.id);
  const unite = UNITES_SCORE[fiche.id] || "";
  const r = resumeScores(lireScores()[fiche.id]);
  const resume = r
    ? `Dernier : <strong>${echapper(texteScore(fiche.id, r.dernier.v))}</strong> (${echapper(dateLisible(r.dernier.d))}) · 🏆 Record : <strong>${echapper(texteScore(fiche.id, r.record))}</strong> · ${r.nombre} score${r.nombre > 1 ? "s" : ""}`
    : "Pas encore de score : note le tien pour suivre tes progrès.";
  return `
    <div class="score-exo" data-score-id="${id}">
      ${fiche.id === "trefle" ? zoneTrefle() : ""}
      <form class="form-score" data-id="${id}">
        <label for="score-${id}">📝 Mon score</label>
        <div class="ligne-score">
          <input id="score-${id}" name="valeur" class="champ" type="number" inputmode="numeric" min="0" max="1000" step="1" required>
          ${unite ? `<span class="unite-score">${echapper(unite)}</span>` : ""}
          <button type="submit" class="bouton principal">Enregistrer</button>
        </div>
      </form>
      <p class="petit">${resume}</p>
      ${r ? `<button type="button" class="lien-bouton" data-action="score-effacer" data-id="${id}">↶ Effacer le dernier score</button>` : ""}
    </div>`;
}

function rafraichirCaseScore(idFiche) {
  const zone = document.querySelector(`.score-exo[data-score-id="${CSS.escape(idFiche)}"]`);
  const fiche = fichesValides.find((f) => f.id === idFiche);
  if (zone && fiche) zone.outerHTML = caseScore(fiche);
}

function enregistrerScore(idFiche, valeur) {
  const scores = lireScores();
  const liste = Array.isArray(scores[idFiche]) ? scores[idFiche] : [];
  // t = moment de l'enregistrement : identifie le score (utile pour la sauvegarde, voir compte.js)
  liste.push({ t: Date.now(), d: dateEnTexte(new Date()), v: valeur });
  scores[idFiche] = liste;
  ecrireScores(scores);
  rafraichirCaseScore(idFiche);
  envoyerScores();
  if (typeof planifierSauvegarde === "function") planifierSauvegarde();

  // Score noté = exo fait : il est coché « ✓ Fait » et descend dans « Terminés » (app.js)
  const jour = dateEnTexte(new Date());
  const dansLeProgramme = programmeCourant.some((p) => p.fiche && p.fiche.id === idFiche);
  if (dansLeProgramme && !lireJournee(jour).faits.includes(idFiche)) basculerFait(jour, idFiche);
}

function effacerDernierScore(idFiche) {
  const scores = lireScores();
  const liste = scores[idFiche] || [];
  const dernier = liste[liste.length - 1];
  if (!dernier || !confirm(`Effacer le score ${texteScore(idFiche, dernier.v)} du ${dateLisible(dernier.d)} ?`)) return;
  scores[idFiche] = liste.slice(0, -1);
  if (scores[idFiche].length === 0) delete scores[idFiche];
  ecrireScores(scores);
  // Mémorisé pour que la sauvegarde Google ne le fasse pas revenir
  const effaces = lireStockage("effaces", [], PREFIXE_SCORES);
  ecrireStockage("effaces", [...effaces, dernier.t], PREFIXE_SCORES);
  rafraichirCaseScore(idFiche);
  envoyerScores();
  if (typeof planifierSauvegarde === "function") planifierSauvegarde();
}

// Envoi en ligne (lu seulement par l'administrateur)
async function envoyerScores() {
  if (!partageConfigure() || !nomDuJoueur()) return;
  const scores = {};
  for (const [id, liste] of Object.entries(lireScores())) {
    if (!/^[a-z0-9-]{1,60}$/.test(id) || !Array.isArray(liste)) continue;
    scores[id] = liste.slice(-SCORES_ENVOYES_MAX).map((s) => ({ d: s.d, v: s.v }));
  }
  // Trèfle interactif : ratés à 3, 4 et 5 pieds de chaque tour (trefle.js)
  const tours = toursTrefle();
  if (tours.length) scores[CLE_STATS_TREFLE] = tours.slice(-SCORES_ENVOYES_MAX).map((x) => ({ d: x.d, v: x.rentres, m3: x.m3, m4: x.m4, m5: x.m5 }));
  const donnees = { joueur: nomDuJoueur(), scores };
  if (JSON.stringify(lireStockage("dernierEnvoi", null, PREFIXE_SCORES)) === JSON.stringify(donnees)) return;
  if (!(await demarrerPartage())) return;   // réessayé au prochain lancement / retour du réseau
  try {
    await baseDeDonnees.collection(COLLECTION_SCORES).doc(idAppareil).set({
      ...donnees,
      uid: idAppareil,
      majLe: firebase.firestore.FieldValue.serverTimestamp(),
    });
    ecrireStockage("dernierEnvoi", donnees, PREFIXE_SCORES);
  } catch (e) {
    // Pas grave : on réessaiera plus tard
  }
}

document.addEventListener("DOMContentLoaded", () => {
  envoyerScores();
  window.addEventListener("online", envoyerScores);

  document.addEventListener("submit", (evenement) => {
    const formulaire = evenement.target.closest(".form-score");
    if (!formulaire) return;
    evenement.preventDefault();
    const valeur = Number(formulaire.valeur.value);
    if (!Number.isInteger(valeur) || valeur < 0 || valeur > 1000) return;
    formulaire.valeur.blur();   // ferme le clavier du téléphone
    enregistrerScore(formulaire.dataset.id, valeur);
  });
  document.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest('button[data-action="score-effacer"]');
    if (bouton) effacerDernierScore(bouton.dataset.id);
  });
});
