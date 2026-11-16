/* =========================================================
   Jeux « une balle = un appui » au practice (fers et drive)
   ---------------------------------------------------------
   - Sur la carte de l'exo, un bouton ouvre le jeu en plein écran.
   - Après chaque balle, on appuie sur la zone où elle a fini
     (Fairway / Gauche / Droite, Green / Bon côté / Danger…).
     Chaque zone vaut des points ; l'appli compte le score par
     « phase » (Driver puis Bois 3, Série 1/4…) et le total.
   - À la fin : bilan à l'écran, le score va dans « Mon score »
     (scores.js : historique, record, exo coché « Fait »).
   - Sur la carte : dernier tour phase par phase + côté des ratés
     sur tous les tours (zones avec « cote »).
   Pour ajouter un jeu : une entrée de plus dans JEUX_ZONES.
   Données (préfixe golf-scores-v1:, jamais purgé) :
     zones-<id>-encours = { exo, debut, coups: [idZone…] }
     zones-<id>-tours   = [{ t, d, score, phases: [{ score, comptes: {idZone: n} }] }]
   Utilise : lireStockage / ecrireStockage / echapper / dateEnTexte (app.js),
   PREFIXE_SCORES / UNITES_SCORE / enregistrerScore / rafraichirCaseScore (scores.js).
   ========================================================= */

"use strict";

// Zones réutilisées
const ZONES_FAIRWAY = [
  { id: "fairway", texte: "✅ Fairway", pts: 1, classe: "bon" },
  { id: "gauche", texte: "⬅ Raté à gauche", pts: 0, classe: "mauvais", cote: "gauche" },
  { id: "droite", texte: "Raté à droite ➡", pts: 0, classe: "mauvais", cote: "droite" },
];
const ZONES_OB = [
  { id: "fairway", texte: "✅ Fairway (+5)", pts: 5, classe: "bon" },
  { id: "sur", texte: "😐 Raté côté sûr (0)", pts: 0, classe: "moyen" },
  { id: "ob", texte: "❌ Hors-limites (−5)", pts: -5, classe: "mauvais" },
];
const ZONES_GREEN = [
  { id: "green", texte: "🟢 Sur le green (+2)", pts: 2, classe: "bon" },
  { id: "bon-cote", texte: "🙂 Bon côté (+1)", pts: 1, classe: "moyen" },
  { id: "ailleurs", texte: "😐 Court / long (0)", pts: 0, classe: "moyen" },
  { id: "danger", texte: "❌ Danger (−2)", pts: -2, classe: "mauvais" },
];

const JEUX_ZONES = {
  "fairway-finder": {
    nom: "Fairway finder", emoji: "🎯", unite: "/ 10",
    phases: [{ nom: "Driver", balles: 10 }],
    zones: ZONES_FAIRWAY,
  },
  "jeu-hors-limites-drive": {
    nom: "Jeu du hors-limites", emoji: "🚧", unite: "points",
    phases: [
      { nom: "OB à droite · balles droites", balles: 5, groupe: "OB à droite" },
      { nom: "OB à droite · draws", balles: 5, groupe: "OB à droite" },
      { nom: "OB à droite · fades", balles: 5, groupe: "OB à droite" },
      { nom: "OB à gauche · balles droites", balles: 5, groupe: "OB à gauche" },
      { nom: "OB à gauche · draws", balles: 5, groupe: "OB à gauche" },
      { nom: "OB à gauche · fades", balles: 5, groupe: "OB à gauche" },
    ],
    zones: ZONES_OB,
  },
  "duel-driver-bois-3": {
    nom: "Duel driver / bois 3", emoji: "⚔️", unite: "/ 20",
    phases: [{ nom: "Driver", balles: 10 }, { nom: "Bois 3", balles: 10 }],
    zones: ZONES_FAIRWAY,
    comparer: true,
  },
  "couloir-20-drives-3-criteres": {
    nom: "Couloir 20 drives", emoji: "🛣️", unite: "/ 20",
    phases: [{ nom: "Driver", balles: 20 }],
    zones: [
      { id: "trois", texte: "✅ Les 3 critères", pts: 1, classe: "bon" },
      { id: "un-rate", texte: "🟡 Dans le couloir, 1 critère raté", pts: 0, classe: "moyen" },
      { id: "gauche", texte: "⬅ Hors couloir à gauche", pts: 0, classe: "mauvais", cote: "gauche" },
      { id: "droite", texte: "Hors couloir à droite ➡", pts: 0, classe: "mauvais", cote: "droite" },
    ],
  },
  "green-imaginaire-points": {
    nom: "Green imaginaire", emoji: "⛳", unite: "points",
    phases: [
      { nom: "Série 1/4 · danger à gauche", balles: 5 },
      { nom: "Série 2/4 · danger à droite", balles: 5 },
      { nom: "Série 3/4 · danger à gauche", balles: 5 },
      { nom: "Série 4/4 · danger à droite", balles: 5 },
    ],
    zones: ZONES_GREEN,
    seuilSerie: 6,   // 6 points ou plus sur une série de 5 = série réussie
  },
};

// Unités affichées par scores.js (« 7 / 10 », « 18 points »)
Object.entries(JEUX_ZONES).forEach(([id, jeu]) => { UNITES_SCORE[id] = jeu.unite; });

function jeuZonesDeLaFiche(idFiche) { return JEUX_ZONES[idFiche] ? idFiche : null; }

const cleZonesEnCours = (id) => `zones-${id}-encours`;
const cleZonesTours = (id) => `zones-${id}-tours`;

function zonesEnCours(id) {
  const tour = lireStockage(cleZonesEnCours(id), null, PREFIXE_SCORES);
  return tour && Array.isArray(tour.coups) ? tour : null;
}
function zonesTours(id) {
  const tours = lireStockage(cleZonesTours(id), [], PREFIXE_SCORES);
  return Array.isArray(tours) ? tours : [];
}

const totalBalles = (jeu) => jeu.phases.reduce((n, p) => n + p.balles, 0);
const zoneParId = (jeu, idZone) => jeu.zones.find((z) => z.id === idZone);
const pointsTexte = (n) => (n > 0 ? "+" : "") + n;
// Jeux « compte » (1 point par bonne balle : fairways…) : pas de signe +
const estCompte = (jeu) => jeu.zones.every((z) => z.pts === 0 || z.pts === 1);

// Découpe les coups du tour par phase : [{ phase, coups: [idZone…] }]
function coupsParPhase(jeu, coups) {
  let debut = 0;
  return jeu.phases.map((phase) => {
    const morceau = coups.slice(debut, debut + phase.balles);
    debut += phase.balles;
    return { phase, coups: morceau };
  });
}

function resumePhase(jeu, coups) {
  const comptes = {};
  let score = 0;
  coups.forEach((idZone) => {
    comptes[idZone] = (comptes[idZone] || 0) + 1;
    score += (zoneParId(jeu, idZone) || { pts: 0 }).pts;
  });
  return { score, comptes };
}

// Score d'une phase en texte : « 7/10 fairways » ou « 12 points »
function texteScorePhase(jeu, phase, resume) {
  const maxi = estCompte(jeu) ? phase.balles : null;
  return maxi ? `${resume.score}/${maxi}` : `${pointsTexte(resume.score)} pts`;
}

// Côté des ratés (zones avec « cote ») sur une liste de comptes
function texteCoteRates(jeu, listeComptes) {
  const cotes = { gauche: 0, droite: 0 };
  listeComptes.forEach((comptes) => jeu.zones.forEach((z) => { if (z.cote) cotes[z.cote] += comptes[z.id] || 0; }));
  const total = cotes.gauche + cotes.droite;
  if (total === 0) return "";
  const cote = cotes.droite >= cotes.gauche ? "droite" : "gauche";
  return `Ratés : ${Math.round((100 * cotes[cote]) / total)} % à ${cote} (${total} raté${total > 1 ? "s" : ""})`;
}

// Bilan d'un tour (phases terminées) : lignes de texte
function bilanJeu(id, coups) {
  const jeu = JEUX_ZONES[id];
  const morceaux = coupsParPhase(jeu, coups).map((m) => ({ ...m, resume: resumePhase(jeu, m.coups) }));
  const lignes = morceaux.map((m) => `${m.phase.nom} : ${texteScorePhase(jeu, m.phase, m.resume)}`);

  // Jeu du hors-limites : meilleure forme de balle de chaque côté
  const groupes = [...new Set(jeu.phases.map((p) => p.groupe).filter(Boolean))];
  groupes.forEach((g) => {
    const duGroupe = morceaux.filter((m) => m.phase.groupe === g);
    const meilleur = duGroupe.reduce((a, b) => (b.resume.score > a.resume.score ? b : a));
    lignes.push(`👉 ${g} : joue ${meilleur.phase.nom.split(" · ")[1]} (${pointsTexte(meilleur.resume.score)} pts)`);
  });
  // Duel : le club qui touche le plus de fairways
  if (jeu.comparer && morceaux.length === 2) {
    const [a, b] = morceaux;
    lignes.push(a.resume.score === b.resume.score
      ? "👉 Égalité : prends le club le plus long si le départ le permet."
      : `👉 Club sûr sur un départ serré : ${(a.resume.score > b.resume.score ? a : b).phase.nom}`);
  }
  // Green imaginaire : séries à 6 points ou plus, deux d'affilée ?
  if (jeu.seuilSerie) {
    const reussies = morceaux.map((m) => m.resume.score >= jeu.seuilSerie);
    const deuxDeSuite = reussies.some((r, i) => r && reussies[i + 1]);
    lignes.push(`${reussies.filter(Boolean).length} série${reussies.filter(Boolean).length > 1 ? "s" : ""} à ${jeu.seuilSerie} pts ou plus${deuxDeSuite ? " · deux d'affilée, bravo ! 🎉" : ""}`);
  }
  const cote = texteCoteRates(jeu, morceaux.map((m) => m.resume.comptes));
  if (cote) lignes.push(cote);
  return { lignes, morceaux, score: morceaux.reduce((n, m) => n + m.resume.score, 0) };
}

/* ---------- Sur la carte de l'exo ---------- */

function zoneJeuZones(idFiche) {
  const id = jeuZonesDeLaFiche(idFiche);
  if (!id) return "";
  const jeu = JEUX_ZONES[id];
  const enCours = zonesEnCours(id);
  const tours = zonesTours(id);
  const dernier = tours[tours.length - 1];
  const bouton = enCours
    ? `<button type="button" class="bouton principal pleine-largeur" data-action="zones-reprendre" data-jeu="${id}">${jeu.emoji} Reprendre (${enCours.coups.length}/${totalBalles(jeu)} balles)</button>`
    : `<button type="button" class="bouton principal pleine-largeur" data-action="zones-commencer" data-jeu="${id}">${jeu.emoji} Jouer balle par balle</button>`;
  const detail = dernier && jeu.phases.length > 1
    ? `<p class="petit">Dernier tour : ${jeu.phases.map((p, i) => `${echapper(p.nom)} ${echapper(texteScorePhase(jeu, p, dernier.phases[i] || { score: 0 }))}`).join(" · ")}</p>`
    : "";
  const cote = texteCoteRates(jeu, tours.flatMap((t) => t.phases.map((p) => p.comptes || {})));
  return `
    <div class="zone-trefle">
      <div class="boutons-modes">${bouton}</div>
      ${detail}
      ${cote ? `<p class="petit">${echapper(cote)} · sur ${tours.length} tour${tours.length > 1 ? "s" : ""}</p>` : ""}
    </div>`;
}

/* ---------- Écran de jeu (plein écran) ---------- */

let jeuZonesAffiche = null;

function ecranJeuZones() {
  let zone = document.getElementById("jeu-zones");
  if (!zone) {
    document.body.insertAdjacentHTML("beforeend", `<div id="jeu-zones" class="trefle-jeu" hidden role="dialog" aria-modal="true"></div>`);
    zone = document.getElementById("jeu-zones");
  }
  return zone;
}

function afficherJeuZones() {
  const ecran = ecranJeuZones();
  const id = jeuZonesAffiche;
  const tour = id ? zonesEnCours(id) : null;
  if (!tour) { ecran.hidden = true; return; }
  const jeu = JEUX_ZONES[id];
  const total = totalBalles(jeu);
  const joues = tour.coups.length;
  const morceaux = coupsParPhase(jeu, tour.coups);
  const iPhase = morceaux.findIndex((m) => m.coups.length < m.phase.balles);
  const fini = iPhase === -1;
  const scoreTotal = resumePhase(jeu, tour.coups).score;

  const pastilles = (m) => `<div class="jz-balles" aria-label="Balles jouées">${Array.from({ length: m.phase.balles }, (_, k) => {
    const z = zoneParId(jeu, m.coups[k]);
    return `<span class="jz-balle ${z ? "jz-" + z.classe : ""}" title="${z ? echapper(z.texte) : "à jouer"}"></span>`;
  }).join("")}</div>`;

  let milieu;
  if (fini) {
    const bilan = bilanJeu(id, tour.coups);
    milieu = `
      <div class="jz-bilan carte">
        <h3 class="carte-titre">Bilan</h3>
        <ul>${bilan.lignes.map((l) => `<li>${echapper(l)}</li>`).join("")}</ul>
        <p><strong>Score : ${echapper(texteScore(id, bilan.score))}</strong></p>
      </div>
      <div class="actions"><button type="button" class="bouton principal pleine-largeur" data-action="zones-terminer">✔ Enregistrer le score</button></div>`;
  } else {
    const m = morceaux[iPhase];
    milieu = `
      <p class="jz-phase"><strong>${echapper(m.phase.nom)}</strong> · balle ${m.coups.length + 1}/${m.phase.balles}</p>
      ${pastilles(m)}
      <p class="petit">Où a fini la balle ?</p>
      <div class="jz-zones">
        ${jeu.zones.map((z) => `<button type="button" class="bouton jz-zone jz-${z.classe}" data-action="zones-balle" data-zone="${z.id}">${echapper(z.texte)}</button>`).join("")}
      </div>`;
  }

  ecran.innerHTML = `
    <div class="trefle-contenu">
      <div class="trefle-haut">
        <h2 class="bloc-titre">${jeu.emoji} ${echapper(jeu.nom)}</h2>
        <button type="button" class="bouton" data-action="zones-fermer">Fermer</button>
      </div>
      <p class="bloc-info">${joues}/${total} balles · score ${echapper(estCompte(jeu) ? String(scoreTotal) : pointsTexte(scoreTotal))}${jeu.phases.length > 1 && !fini ? ` · phase ${iPhase + 1}/${jeu.phases.length}` : ""}</p>
      ${milieu}
      <div class="actions">
        ${joues ? `<button type="button" class="bouton pleine-largeur" data-action="zones-annuler">↶ Annuler la dernière balle</button>` : ""}
        <button type="button" class="bouton pleine-largeur" data-action="zones-abandonner">Abandonner (rien n'est compté)</button>
      </div>
    </div>`;
  ecran.hidden = false;
}

function ecrireTourZones(id, tour) { ecrireStockage(cleZonesEnCours(id), tour, PREFIXE_SCORES); }

function commencerJeuZones(id) {
  if (!JEUX_ZONES[id]) return;
  jeuZonesAffiche = id;
  if (!zonesEnCours(id)) ecrireTourZones(id, { exo: id, debut: Date.now(), coups: [] });
  afficherJeuZones();
}

function noterBalleZones(idZone) {
  const id = jeuZonesAffiche;
  const tour = id ? zonesEnCours(id) : null;
  if (!tour || !zoneParId(JEUX_ZONES[id], idZone) || tour.coups.length >= totalBalles(JEUX_ZONES[id])) return;
  tour.coups.push(idZone);
  ecrireTourZones(id, tour);
  try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { /* pas de vibration */ }
  afficherJeuZones();
}

function annulerBalleZones() {
  const id = jeuZonesAffiche;
  const tour = id ? zonesEnCours(id) : null;
  if (!tour || tour.coups.length === 0) return;
  tour.coups.pop();
  ecrireTourZones(id, tour);
  afficherJeuZones();
}

function fermerJeuZones() {
  const id = jeuZonesAffiche;
  jeuZonesAffiche = null;
  ecranJeuZones().hidden = true;
  if (id) rafraichirCaseScore(id);
}

function abandonnerJeuZones() {
  const id = jeuZonesAffiche;
  if (!id || !confirm("Abandonner ? Les balles notées seront effacées (rien n'est compté).")) return;
  ecrireStockage(cleZonesEnCours(id), null, PREFIXE_SCORES);
  fermerJeuZones();
}

function terminerJeuZones() {
  const id = jeuZonesAffiche;
  const tour = id ? zonesEnCours(id) : null;
  const jeu = JEUX_ZONES[id];
  if (!tour || tour.coups.length < totalBalles(jeu)) return;
  const bilan = bilanJeu(id, tour.coups);
  const tours = zonesTours(id);
  tours.push({ t: Date.now(), d: dateEnTexte(new Date()), score: bilan.score, phases: bilan.morceaux.map((m) => m.resume) });
  ecrireStockage(cleZonesTours(id), tours, PREFIXE_SCORES);
  ecrireStockage(cleZonesEnCours(id), null, PREFIXE_SCORES);
  jeuZonesAffiche = null;
  ecranJeuZones().hidden = true;
  enregistrerScore(id, bilan.score);   // historique, record, « Fait » (scores.js)
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (evenement) => {
    const cible = evenement.target.closest("[data-action^='zones-']");
    if (!cible) return;
    const action = cible.dataset.action;
    if (action === "zones-commencer" || action === "zones-reprendre") commencerJeuZones(cible.dataset.jeu);
    if (action === "zones-balle") noterBalleZones(cible.dataset.zone);
    if (action === "zones-annuler") annulerBalleZones();
    if (action === "zones-abandonner") abandonnerJeuZones();
    if (action === "zones-terminer") terminerJeuZones();
    if (action === "zones-fermer") fermerJeuZones();
  });
});
