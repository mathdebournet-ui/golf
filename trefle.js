/* =========================================================
   Trèfle interactif (exo de putting « Trèfle »)
   ---------------------------------------------------------
   - « 🍀 Commencer le Trèfle » ouvre le schéma : le trou au centre
     et les 16 points du schéma de la fiche (5 à 3 pieds, 7 à 4 pieds, 4 à 5 pieds).
   - On appuie sur un point, puis « Rentré » ou « Raté ».
     On joue les 16 points une fois (un raté ne fait pas repartir
     de zéro : choix de l'utilisateur).
   - À la fin : le score (putts rentrés sur 16) est enregistré dans
     « Mon score » (scores.js) et l'exo passe en « Fait ».
   - Statistiques : ratés moyens par trèfle à 3, 4 et 5 pieds, sur
     tous les trèfles joués. Envoyées avec les scores (clé
     « trefle-stats ») : tableau dans l'Espace admin.
   Données : golf-scores-v1:trefles (tours terminés),
             golf-scores-v1:trefleEnCours (tour en cours).
   ========================================================= */

"use strict";

const DISTANCES_TREFLE = [3, 4, 5];   // en pieds
const CLE_STATS_TREFLE = "trefle-stats";

// Les 16 points, recopiés du schéma de la fiche (PDF « Fiches exercices », page 2) :
// x, y = position par rapport au trou (unités du schéma, y vers le bas),
// distance en pieds. Trois feuilles (haut, gauche, droite) et, en bas,
// une ligne droite de 3 points (3, 4 et 5 pieds), confirmée par l'utilisateur.
// Ordre = sens des aiguilles d'une montre en partant du haut.
const POINTS_TREFLE = [
  { x: 0, y: -217, distance: 5 },
  { x: 70, y: -167, distance: 4 },
  { x: 92, y: -77, distance: 3 },
  { x: 187, y: -55, distance: 4 },
  { x: 255, y: 0, distance: 5 },
  { x: 187, y: 61, distance: 4 },
  { x: 92, y: 103, distance: 3 },
  { x: 0, y: 148, distance: 3 },
  { x: 0, y: 216, distance: 4 },
  { x: 0, y: 303, distance: 5 },
  { x: -92, y: 103, distance: 3 },
  { x: -187, y: 61, distance: 4 },
  { x: -255, y: 0, distance: 5 },
  { x: -187, y: -55, distance: 4 },
  { x: -92, y: -77, distance: 3 },
  { x: -70, y: -167, distance: 4 },
];

let pointChoisi = null;   // index du point sélectionné sur le schéma

function toursTrefle() {
  const tours = lireStockage("trefles", [], PREFIXE_SCORES);
  return Array.isArray(tours) ? tours : [];
}

function trefleEnCours() {
  const tour = lireStockage("trefleEnCours", null, PREFIXE_SCORES);
  return tour && Array.isArray(tour.resultats) && tour.resultats.length === POINTS_TREFLE.length ? tour : null;
}

// Ratés par distance pour un tour : { 3: n, 4: n, 5: n }
function ratesDuTour(tour) {
  const rates = { 3: 0, 4: 0, 5: 0 };
  tour.resultats.forEach((r, i) => { if (r === false) rates[POINTS_TREFLE[i].distance]++; });
  return rates;
}

// Moyennes sur tous les tours : { nombre, rentres, rates: {3,4,5}, reussite: {3,4,5} }
function statsTrefle(tours) {
  if (tours.length === 0) return null;
  const nbPoints = (d) => POINTS_TREFLE.filter((p) => p.distance === d).length;
  const stats = { nombre: tours.length, rentres: 0, rates: {}, reussite: {} };
  stats.rentres = tours.reduce((t, x) => t + x.rentres, 0) / tours.length;
  DISTANCES_TREFLE.forEach((d) => {
    const total = tours.reduce((t, x) => t + (x[`m${d}`] || 0), 0);
    stats.rates[d] = total / tours.length;
    stats.reussite[d] = Math.round(100 * (1 - total / (tours.length * nbPoints(d))));
  });
  return stats;
}

const virgule = (n) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");

// Petit tableau « ratés en moyenne » (carte et fin de tour)
function tableauStatsTrefle(stats) {
  if (!stats) return `<p class="petit">Pas encore de trèfle joué : tes moyennes par distance apparaîtront ici.</p>`;
  return `
    <p class="petit">${stats.nombre} trèfle${stats.nombre > 1 ? "s" : ""} joué${stats.nombre > 1 ? "s" : ""} · moyenne ${virgule(stats.rentres)} / 16 rentrés</p>
    <div class="tableau-defilant"><table class="tableau-admin">
      <thead><tr><th>Distance</th><th>Ratés en moyenne</th><th>Réussite</th></tr></thead>
      <tbody>${DISTANCES_TREFLE.map((d) => `<tr><td>${d} pieds</td><td class="nombre">${virgule(stats.rates[d])}</td><td class="nombre">${stats.reussite[d]} %</td></tr>`).join("")}</tbody>
    </table></div>`;
}

// Zone ajoutée sur la carte « Trèfle » d'Aujourd'hui (appelée par caseScore, scores.js)
function zoneTrefle() {
  const enCours = trefleEnCours();
  return `
    <div class="zone-trefle">
      <button type="button" class="bouton principal pleine-largeur" data-action="trefle-ouvrir">🍀 ${enCours ? "Reprendre le Trèfle" : "Commencer le Trèfle"}</button>
      ${tableauStatsTrefle(statsTrefle(toursTrefle()))}
    </div>`;
}


/* ---------- Écran du Trèfle (plein écran) ---------- */

function schemaTrefle(tour) {
  const points = POINTS_TREFLE.map((p, i) => {
    const { x, y } = p;
    const r = tour.resultats[i];
    const etat = r === true ? "rentre" : r === false ? "rate" : "a-jouer";
    return `
      <g class="point-trefle ${etat} ${pointChoisi === i ? "choisi" : ""}" data-action="trefle-point" data-index="${i}" role="button" tabindex="0" aria-label="Point ${i + 1}, ${p.distance} pieds, ${etat === "a-jouer" ? "à jouer" : etat === "rentre" ? "rentré" : "raté"}">
        <circle cx="${x}" cy="${y}" r="31"></circle>
        <text x="${x}" y="${y + 9}" text-anchor="middle">${r === true ? "✓" : r === false ? "✗" : p.distance}</text>
      </g>`;
  }).join("");
  return `
    <svg class="schema-trefle" viewBox="-295 -255 590 600" role="group" aria-label="Schéma du trèfle : appuie sur un point">
      <circle class="trou" cx="0" cy="0" r="20"></circle>
      ${points}
    </svg>`;
}

function afficherTrefle() {
  const zone = document.getElementById("trefle-jeu");
  const tour = trefleEnCours();
  if (!tour) { zone.hidden = true; return; }
  const joues = tour.resultats.filter((r) => r !== null).length;
  const rentres = tour.resultats.filter((r) => r === true).length;
  const choisi = pointChoisi !== null ? POINTS_TREFLE[pointChoisi] : null;

  zone.innerHTML = `
    <div class="trefle-contenu">
      <div class="trefle-haut">
        <h2 class="bloc-titre">🍀 Trèfle</h2>
        <button type="button" class="bouton" data-action="trefle-fermer">Fermer</button>
      </div>
      <p class="bloc-info">${joues}/16 joués · ${rentres} rentré${rentres > 1 ? "s" : ""} · les chiffres = distance en pieds</p>
      ${schemaTrefle(tour)}
      <div class="trefle-choix">
        ${choisi
          ? `<p><strong>Point ${pointChoisi + 1} · ${choisi.distance} pieds</strong></p>
             <div class="actions">
               <button type="button" class="bouton principal" data-action="trefle-resultat" data-valeur="oui">✅ Rentré</button>
               <button type="button" class="bouton danger" data-action="trefle-resultat" data-valeur="non">❌ Raté</button>
             </div>`
          : `<p class="petit">Appuie sur un point du schéma (gris = à jouer, vert = rentré, rouge = raté).</p>`}
      </div>
      <div class="actions">
        <button type="button" class="bouton principal pleine-largeur" data-action="trefle-terminer" ${joues < 16 ? "disabled" : ""}>
          ${joues < 16 ? `Terminer le tour (encore ${16 - joues} point${16 - joues > 1 ? "s" : ""})` : "✔ Terminer le tour"}
        </button>
        <button type="button" class="bouton pleine-largeur" data-action="trefle-abandonner">Abandonner ce tour</button>
      </div>
    </div>`;
  zone.hidden = false;
}

function ouvrirTrefle() {
  if (!trefleEnCours()) ecrireStockage("trefleEnCours", { debut: Date.now(), resultats: Array(16).fill(null) }, PREFIXE_SCORES);
  // Premier point pas encore joué, dans l'ordre du tour
  const tour = trefleEnCours();
  const suivant = tour.resultats.findIndex((r) => r === null);
  pointChoisi = suivant >= 0 ? suivant : null;
  afficherTrefle();
}

function noterPoint(rentre) {
  const tour = trefleEnCours();
  if (!tour || pointChoisi === null) return;
  tour.resultats[pointChoisi] = rentre;
  ecrireStockage("trefleEnCours", tour, PREFIXE_SCORES);
  // On passe tout seul au point suivant pas encore joué (en tournant)
  const ordre = [...Array(16).keys()].map((k) => (pointChoisi + 1 + k) % 16);
  const suivant = ordre.find((i) => tour.resultats[i] === null);
  pointChoisi = suivant !== undefined ? suivant : null;
  afficherTrefle();
}

function terminerTrefle() {
  const tour = trefleEnCours();
  if (!tour || tour.resultats.some((r) => r === null)) return;
  const rates = ratesDuTour(tour);
  const rentres = tour.resultats.filter((r) => r === true).length;
  const tours = toursTrefle();
  tours.push({ t: Date.now(), d: dateEnTexte(new Date()), rentres, m3: rates[3], m4: rates[4], m5: rates[5] });
  ecrireStockage("trefles", tours, PREFIXE_SCORES);
  ecrireStockage("trefleEnCours", null, PREFIXE_SCORES);
  pointChoisi = null;
  document.getElementById("trefle-jeu").hidden = true;
  // Score dans « Mon score » + exo coché « Fait » (scores.js)
  enregistrerScore("trefle", rentres);
  alert(`Trèfle terminé : ${rentres}/16 rentrés.\nRatés : ${rates[3]} à 3 pieds, ${rates[4]} à 4 pieds, ${rates[5]} à 5 pieds.`);
}

function abandonnerTrefle() {
  if (!confirm("Abandonner ce tour ? Les points notés seront effacés (rien n'est compté).")) return;
  ecrireStockage("trefleEnCours", null, PREFIXE_SCORES);
  pointChoisi = null;
  document.getElementById("trefle-jeu").hidden = true;
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (evenement) => {
    const cible = evenement.target.closest("[data-action^='trefle-']");
    if (!cible) return;
    const action = cible.dataset.action;
    if (action === "trefle-ouvrir") ouvrirTrefle();
    if (action === "trefle-point") { pointChoisi = Number(cible.dataset.index); afficherTrefle(); }
    if (action === "trefle-resultat") noterPoint(cible.dataset.valeur === "oui");
    if (action === "trefle-terminer") terminerTrefle();
    if (action === "trefle-abandonner") abandonnerTrefle();
    if (action === "trefle-fermer") {
      // Le tour en cours est gardé : « Reprendre le Trèfle »
      document.getElementById("trefle-jeu").hidden = true;
      const fiche = fichesValides.find((f) => f.id === "trefle");
      if (fiche) rafraichirCaseScore("trefle");
    }
  });
  // Clavier : Entrée / Espace sur un point du schéma
  document.addEventListener("keydown", (evenement) => {
    const point = evenement.target.closest && evenement.target.closest(".point-trefle");
    if (point && (evenement.key === "Enter" || evenement.key === " ")) {
      evenement.preventDefault();
      pointChoisi = Number(point.dataset.index);
      afficherTrefle();
    }
  });
});
