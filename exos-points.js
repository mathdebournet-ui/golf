/* =========================================================
   Exos de putting « à points » interactifs : Trèfle 🍀 et Snail 🐌
   ---------------------------------------------------------
   - Sur la carte de l'exo (Aujourd'hui), un bouton ouvre le schéma
     en plein écran : le trou et les points, chacun avec sa distance.
   - On appuie sur un point, puis « Rentré » ou « Raté ». Un raté ne
     fait pas repartir de zéro (choix de l'utilisateur).
   - Le Snail se joue en montante (3 → 10 pieds), en descendante
     (10 → 3 pieds) ou en montante puis descendante (16 putts).
   - À la fin : le nombre de putts rentrés va dans « Mon score »
     (scores.js) et l'exo passe en « Fait ».
   - Statistiques par distance (ratés moyens, réussite) sur tous les
     tours, envoyées avec les scores (clés « trefle-stats » et
     « snail-stats ») : tableaux dans l'Espace admin (serie.js).
   Pour ajouter un exo : une entrée de plus dans EXOS_POINTS.
   Données (préfixe golf-scores-v1:) : <cleTours> = tours terminés
   { t, d, mode, rentres, total, rates: {distance: n}, tentes: {distance: n} },
   <cleEnCours> = tour en cours { exo, mode, etapes: [points], resultats }.
   ========================================================= */

"use strict";

// Points recopiés des schémas du PDF « Fiches exercices » (x, y par rapport
// au trou, y vers le bas ; d = distance en pieds).
const EXOS_POINTS = {
  trefle: {
    nom: "Trèfle",
    emoji: "🍀",
    idFiche: "trefle",
    cleStats: "trefle-stats",
    cleTours: "trefles",
    cleEnCours: "trefleEnCours",
    viewBox: "-295 -255 590 600",
    // Page 2 : 3 feuilles (haut, gauche, droite), 4 points à 3 pieds en
    // diagonale, et en bas une ligne 3-4-5 pieds (confirmée par l'utilisateur).
    // Ordre des aiguilles d'une montre en partant du haut.
    points: [
      { x: 0, y: -217, d: 5 }, { x: 70, y: -167, d: 4 }, { x: 92, y: -77, d: 3 },
      { x: 187, y: -55, d: 4 }, { x: 255, y: 0, d: 5 }, { x: 187, y: 61, d: 4 },
      { x: 92, y: 103, d: 3 }, { x: 0, y: 148, d: 3 }, { x: 0, y: 216, d: 4 },
      { x: 0, y: 303, d: 5 }, { x: -92, y: 103, d: 3 }, { x: -187, y: 61, d: 4 },
      { x: -255, y: 0, d: 5 }, { x: -187, y: -55, d: 4 }, { x: -92, y: -77, d: 3 },
      { x: -70, y: -167, d: 4 },
    ],
    modes: { tour: { nom: "Commencer le Trèfle", phases: [[...Array(16).keys()]] } },
  },
  snail: {
    nom: "Snail",
    emoji: "🐌",
    idFiche: "snail-3-10-feet",
    cleStats: "snail-stats",
    cleTours: "snails",
    cleEnCours: "snailEnCours",
    viewBox: "-135 -205 540 480",
    // Page 3 : spirale de 8 points autour du trou, de 3 à 10 pieds.
    points: [
      { x: -93, y: 78, d: 3 }, { x: -41, y: 177, d: 4 }, { x: 65, y: 229, d: 5 },
      { x: 190, y: 201, d: 6 }, { x: 296, y: 141, d: 7 }, { x: 363, y: 55, d: 8 },
      { x: 365, y: -54, d: 9 }, { x: 308, y: -164, d: 10 },
    ],
    // Règle « montante / descendante » (expliquée par l'utilisateur) : on part de
    // 3 pieds ; putt rentré = on avance au point suivant, putt raté = on redescend
    // au point d'avant. Fini quand le 10 pieds est rentré. Pas de score dans
    // « Mon score » (choix de l'utilisateur) : seulement les moyennes par distance.
    modes: { "montante-descendante": { nom: "⬆⬇ Montante / descendante", dynamique: true, sansScore: true } },
  },
};

let etapeChoisie = null;   // étape sélectionnée (index dans tour.etapes)

const virgule = (n) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");

function distancesDe(exo) {
  return [...new Set(EXOS_POINTS[exo].points.map((p) => p.d))].sort((a, b) => a - b);
}

// Exo sans case « Mon score » (tous ses modes sont sans score : le Snail)
function sansScore(exo) { return Object.values(EXOS_POINTS[exo].modes).every((m) => m.sansScore); }

function exoDeLaFiche(idFiche) {
  return Object.keys(EXOS_POINTS).find((cle) => EXOS_POINTS[cle].idFiche === idFiche) || null;
}


/* ---------- Données ---------- */

// Ancien format du Trèfle (v20 : { rentres, m3, m4, m5 }) → format commun
function normaliserTour(exo, x) {
  if (!x || typeof x !== "object") return null;
  if (x.rates && x.tentes) return x;
  if (exo === "trefle" && "m3" in x) {
    return { ...x, mode: "tour", total: 16, rates: { 3: x.m3 || 0, 4: x.m4 || 0, 5: x.m5 || 0 }, tentes: { 3: 5, 4: 7, 5: 4 } };
  }
  return null;
}

function toursDe(exo) {
  const tours = lireStockage(EXOS_POINTS[exo].cleTours, [], PREFIXE_SCORES);
  return Array.isArray(tours) ? tours.map((x) => normaliserTour(exo, x)).filter(Boolean) : [];
}

function tourEnCours(exo) {
  const tour = lireStockage(EXOS_POINTS[exo].cleEnCours, null, PREFIXE_SCORES);
  const mode = tour && EXOS_POINTS[exo].modes[tour.mode];
  if (!mode) return null;   // mode supprimé depuis (ex. ancien Snail « montante puis descendante »)
  if (mode.dynamique) return Array.isArray(tour.coups) && Number.isInteger(tour.position) ? tour : null;
  return Array.isArray(tour.etapes) && Array.isArray(tour.resultats) && tour.etapes.length === tour.resultats.length ? tour : null;
}

function estDynamique(tour) { return !!EXOS_POINTS[tour.exo].modes[tour.mode].dynamique; }

// Moyennes sur des tours : { nombre, rentres, total, rates: {d}, reussite: {d} }
function statsDe(exo, tours) {
  if (!tours.length) return null;
  const s = {
    nombre: tours.length,
    rentres: tours.reduce((t, x) => t + x.rentres, 0) / tours.length,
    total: tours.reduce((t, x) => t + (x.total || 0), 0) / tours.length,
    rates: {},
    reussite: {},
  };
  distancesDe(exo).forEach((d) => {
    const rates = tours.reduce((t, x) => t + ((x.rates && x.rates[d]) || 0), 0);
    const tentes = tours.reduce((t, x) => t + ((x.tentes && x.tentes[d]) || 0), 0);
    s.rates[d] = rates / tours.length;
    s.reussite[d] = tentes ? Math.round(100 * (1 - rates / tentes)) : null;
  });
  return s;
}


/* ---------- Carte de l'exo (appelée par caseScore, scores.js) ---------- */

function tableauStats(exo, stats) {
  if (!stats) return `<p class="petit">Pas encore de ${EXOS_POINTS[exo].nom} joué : tes moyennes par distance apparaîtront ici.</p>`;
  return `
    <p class="petit">${stats.nombre} ${EXOS_POINTS[exo].nom}${stats.nombre > 1 ? "s" : ""} joué${stats.nombre > 1 ? "s" : ""} · ${sansScore(exo)
      ? `en moyenne ${virgule(stats.total)} putts joués par tour (${virgule(stats.rentres)} rentrés)`
      : `moyenne ${virgule(stats.rentres)} rentrés sur ${virgule(stats.total)}`}</p>
    <div class="tableau-defilant"><table class="tableau-admin">
      <thead><tr><th>Distance</th><th>Ratés en moyenne</th><th>Réussite</th></tr></thead>
      <tbody>${distancesDe(exo).map((d) => `<tr><td>${d} pieds</td><td class="nombre">${virgule(stats.rates[d])}</td><td class="nombre">${stats.reussite[d] === null ? "—" : stats.reussite[d] + " %"}</td></tr>`).join("")}</tbody>
    </table></div>`;
}

function zoneExoPoints(idFiche) {
  const exo = exoDeLaFiche(idFiche);
  if (!exo) return "";
  const config = EXOS_POINTS[exo];
  const enCours = tourEnCours(exo);
  const boutons = enCours
    ? `<button type="button" class="bouton principal pleine-largeur" data-action="points-reprendre" data-exo="${exo}">${config.emoji} Reprendre (${echapper(config.modes[enCours.mode] ? config.modes[enCours.mode].nom : config.nom)})</button>`
    : Object.entries(config.modes).map(([id, m]) =>
        `<button type="button" class="bouton ${Object.keys(config.modes).length === 1 ? "principal" : ""} pleine-largeur" data-action="points-commencer" data-exo="${exo}" data-mode="${id}">${config.emoji} ${echapper(m.nom)}</button>`).join("");
  return `
    <div class="zone-trefle">
      <div class="boutons-modes">${boutons}</div>
      ${tableauStats(exo, statsDe(exo, toursDe(exo)))}
    </div>`;
}


/* ---------- Écran de jeu (plein écran) ---------- */

let exoAffiche = null;

// Phase en cours : la première qui a encore des putts à jouer (sinon la dernière)
function phaseActuelle(tour) {
  const phases = EXOS_POINTS[tour.exo].modes[tour.mode].phases;
  let debut = 0;
  for (let p = 0; p < phases.length; p++) {
    const fin = debut + phases[p].length;
    if (tour.resultats.slice(debut, fin).some((r) => r === null) || p === phases.length - 1) {
      return { numero: p, debut, fin, nombre: phases.length };
    }
    debut = fin;
  }
  return { numero: 0, debut: 0, fin: tour.etapes.length, nombre: 1 };
}

function schemaExo(tour) {
  const config = EXOS_POINTS[tour.exo];
  const phase = phaseActuelle(tour);
  // Pour chaque point : l'étape de la phase en cours qui le concerne
  const etapeDuPoint = {};
  for (let e = phase.debut; e < phase.fin; e++) etapeDuPoint[tour.etapes[e]] = e;

  const points = config.points.map((p, i) => {
    const e = etapeDuPoint[i];
    const r = e === undefined ? null : tour.resultats[e];
    const etat = e === undefined ? "hors-phase" : r === true ? "rentre" : r === false ? "rate" : "a-jouer";
    const nomEtat = { rentre: "rentré", rate: "raté", "a-jouer": "à jouer", "hors-phase": "pas dans cette phase" }[etat];
    const attributs = e === undefined ? "" : `data-action="points-point" data-etape="${e}" role="button" tabindex="0"`;
    return `
      <g class="point-trefle ${etat} ${etapeChoisie === e && e !== undefined ? "choisi" : ""}" ${attributs} aria-label="${p.d} pieds, ${nomEtat}">
        <circle cx="${p.x}" cy="${p.y}" r="31"></circle>
        <text x="${p.x}" y="${p.y + 9}" text-anchor="middle">${r === true ? "✓" : r === false ? "✗" : p.d}</text>
      </g>`;
  }).join("");
  return `
    <svg class="schema-trefle" viewBox="${config.viewBox}" role="group" aria-label="Schéma du ${config.nom} : appuie sur un point">
      <circle class="trou" cx="0" cy="0" r="20"></circle>
      ${points}
    </svg>`;
}

// Mode « montante / descendante » : seul le point où l'on est peut être joué
function schemaDynamique(tour) {
  const config = EXOS_POINTS[tour.exo];
  const meilleur = Math.max(-1, ...tour.coups.filter((c) => c.rentre).map((c) => c.point));
  const points = config.points.map((p, i) => {
    const etat = i === tour.position ? "a-jouer" : i <= meilleur ? "rentre" : "hors-phase";
    return `
      <g class="point-trefle ${etat} ${i === tour.position ? "choisi" : ""}" aria-label="${p.d} pieds${i === tour.position ? ", à jouer maintenant" : i <= meilleur ? ", déjà rentré" : ""}">
        <circle cx="${p.x}" cy="${p.y}" r="31"></circle>
        <text x="${p.x}" y="${p.y + 9}" text-anchor="middle">${p.d}</text>
      </g>`;
  }).join("");
  return `
    <svg class="schema-trefle" viewBox="${config.viewBox}" role="img" aria-label="Schéma du ${config.nom} : point en cours entouré">
      <circle class="trou" cx="0" cy="0" r="20"></circle>
      ${points}
    </svg>`;
}

function afficherDynamique(tour) {
  const zone = document.getElementById("trefle-jeu");
  const config = EXOS_POINTS[tour.exo];
  const p = config.points[tour.position];
  const rentres = tour.coups.filter((c) => c.rentre).length;
  const dernier = tour.coups[tour.coups.length - 1];
  const message = dernier
    ? (dernier.rentre ? `✅ Rentré à ${config.points[dernier.point].d} pieds : tu avances.` : `❌ Raté à ${config.points[dernier.point].d} pieds : tu redescends.`)
    : "Rentré = tu avances au point suivant · Raté = tu redescends d'un point.";
  zone.innerHTML = `
    <div class="trefle-contenu">
      <div class="trefle-haut">
        <h2 class="bloc-titre">${config.emoji} ${echapper(config.nom)}</h2>
        <button type="button" class="bouton" data-action="points-fermer">Fermer</button>
      </div>
      <p class="bloc-info">${echapper(config.modes[tour.mode].nom)} · ${tour.coups.length} putt${tour.coups.length > 1 ? "s" : ""} joué${tour.coups.length > 1 ? "s" : ""} · ${rentres} rentré${rentres > 1 ? "s" : ""}</p>
      ${schemaDynamique(tour)}
      <div class="trefle-choix">
        <p class="petit">${message}</p>
        <p><strong>À jouer : ${p.d} pieds</strong></p>
        <div class="actions">
          <button type="button" class="bouton principal" data-action="points-resultat" data-valeur="oui">✅ Rentré</button>
          <button type="button" class="bouton danger" data-action="points-resultat" data-valeur="non">❌ Raté</button>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="bouton pleine-largeur" data-action="points-terminer" ${tour.coups.length === 0 ? "disabled" : ""}>Arrêter et enregistrer</button>
        <button type="button" class="bouton pleine-largeur" data-action="points-abandonner">Abandonner (rien n'est compté)</button>
      </div>
    </div>`;
  zone.hidden = false;
}

function afficherExoPoints() {
  const zone = document.getElementById("trefle-jeu");
  const tour = exoAffiche ? tourEnCours(exoAffiche) : null;
  if (!tour) { zone.hidden = true; return; }
  if (estDynamique(tour)) { afficherDynamique(tour); return; }
  const config = EXOS_POINTS[tour.exo];
  const mode = config.modes[tour.mode];
  const phase = phaseActuelle(tour);
  const joues = tour.resultats.filter((r) => r !== null).length;
  const rentres = tour.resultats.filter((r) => r === true).length;
  const total = tour.etapes.length;
  const p = etapeChoisie !== null ? config.points[tour.etapes[etapeChoisie]] : null;
  const nomPhase = phase.nombre > 1 ? ` · ${phase.numero === 0 ? "⬆ montante" : "⬇ descendante"}` : "";

  zone.innerHTML = `
    <div class="trefle-contenu">
      <div class="trefle-haut">
        <h2 class="bloc-titre">${config.emoji} ${echapper(config.nom)}</h2>
        <button type="button" class="bouton" data-action="points-fermer">Fermer</button>
      </div>
      <p class="bloc-info">${Object.keys(config.modes).length > 1 ? echapper(mode.nom) + " · " : ""}${joues}/${total} joués · ${rentres} rentré${rentres > 1 ? "s" : ""}${nomPhase}</p>
      ${schemaExo(tour)}
      <div class="trefle-choix">
        ${p
          ? `<p><strong>${p.d} pieds</strong></p>
             <div class="actions">
               <button type="button" class="bouton principal" data-action="points-resultat" data-valeur="oui">✅ Rentré</button>
               <button type="button" class="bouton danger" data-action="points-resultat" data-valeur="non">❌ Raté</button>
             </div>`
          : `<p class="petit">Appuie sur un point du schéma (blanc = à jouer, vert = rentré, rouge = raté). Les chiffres = distance en pieds.</p>`}
      </div>
      <div class="actions">
        <button type="button" class="bouton principal pleine-largeur" data-action="points-terminer" ${joues < total ? "disabled" : ""}>
          ${joues < total ? `Terminer (encore ${total - joues} putt${total - joues > 1 ? "s" : ""})` : "✔ Terminer"}
        </button>
        <button type="button" class="bouton pleine-largeur" data-action="points-abandonner">Abandonner</button>
      </div>
    </div>`;
  zone.hidden = false;
}

// Prochaine étape pas encore jouée, dans l'ordre (en partant de « depuis »)
function etapeSuivante(tour, depuis = -1) {
  const n = tour.etapes.length;
  for (let k = 1; k <= n; k++) {
    const e = (depuis + k + n) % n;
    if (tour.resultats[e] === null) return e;
  }
  return null;
}

function commencerExo(exo, mode) {
  const config = EXOS_POINTS[exo];
  if (!config || !config.modes[mode]) return;
  if (config.modes[mode].dynamique) {
    ecrireStockage(config.cleEnCours, { exo, mode, debut: Date.now(), position: 0, coups: [] }, PREFIXE_SCORES);
    exoAffiche = exo;
    etapeChoisie = null;
    afficherExoPoints();
    return;
  }
  const etapes = config.modes[mode].phases.flat();
  ecrireStockage(config.cleEnCours, { exo, mode, debut: Date.now(), etapes, resultats: etapes.map(() => null) }, PREFIXE_SCORES);
  exoAffiche = exo;
  etapeChoisie = 0;
  afficherExoPoints();
}

function reprendreExo(exo) {
  const tour = tourEnCours(exo);
  if (!tour) return;
  exoAffiche = exo;
  etapeChoisie = estDynamique(tour) ? null : etapeSuivante(tour);
  afficherExoPoints();
}

function noterEtape(rentre) {
  const tour = exoAffiche ? tourEnCours(exoAffiche) : null;
  if (!tour) return;
  if (estDynamique(tour)) {
    // Rentré : on avance (fini si c'était le dernier point) ; raté : on redescend d'un point
    tour.coups.push({ point: tour.position, rentre });
    const dernier = EXOS_POINTS[tour.exo].points.length - 1;
    if (rentre && tour.position === dernier) {
      ecrireStockage(EXOS_POINTS[tour.exo].cleEnCours, tour, PREFIXE_SCORES);
      terminerExo();
      return;
    }
    tour.position = rentre ? tour.position + 1 : Math.max(0, tour.position - 1);
    ecrireStockage(EXOS_POINTS[tour.exo].cleEnCours, tour, PREFIXE_SCORES);
    afficherExoPoints();
    return;
  }
  if (etapeChoisie === null) return;
  tour.resultats[etapeChoisie] = rentre;
  ecrireStockage(EXOS_POINTS[tour.exo].cleEnCours, tour, PREFIXE_SCORES);
  etapeChoisie = etapeSuivante(tour, etapeChoisie);
  afficherExoPoints();
}

function terminerExo() {
  const tour = exoAffiche ? tourEnCours(exoAffiche) : null;
  if (!tour) return;
  const config = EXOS_POINTS[tour.exo];
  const mode = config.modes[tour.mode];
  // Liste des putts joués : [{ point, rentre }]
  let coups;
  if (mode.dynamique) {
    if (tour.coups.length === 0) return;
    coups = tour.coups;
  } else {
    if (tour.resultats.some((r) => r === null)) return;
    coups = tour.etapes.map((point, e) => ({ point, rentre: tour.resultats[e] }));
  }
  const rates = {};
  const tentes = {};
  distancesDe(tour.exo).forEach((d) => { rates[d] = 0; tentes[d] = 0; });
  coups.forEach((c) => {
    const d = config.points[c.point].d;
    tentes[d]++;
    if (!c.rentre) rates[d]++;
  });
  const rentres = coups.filter((c) => c.rentre).length;
  const dernierPoint = config.points.length - 1;
  const fini = !mode.dynamique || coups.some((c) => c.rentre && c.point === dernierPoint);
  const tours = toursDe(tour.exo);
  tours.push({ t: Date.now(), d: dateEnTexte(new Date()), mode: tour.mode, rentres, total: coups.length, fini, rates, tentes });
  ecrireStockage(config.cleTours, tours, PREFIXE_SCORES);
  ecrireStockage(config.cleEnCours, null, PREFIXE_SCORES);
  etapeChoisie = null;
  exoAffiche = null;
  document.getElementById("trefle-jeu").hidden = true;

  if (mode.sansScore) {
    // Pas de score (choix de l'utilisateur) : l'exo est juste coché « Fait » et les moyennes envoyées
    const jour = dateEnTexte(new Date());
    const dansLeProgramme = programmeCourant.some((p) => p.fiche && p.fiche.id === config.idFiche);
    if (dansLeProgramme && !lireJournee(jour).faits.includes(config.idFiche)) basculerFait(jour, config.idFiche);
    else rafraichirCaseScore(config.idFiche);
    envoyerScores();
    if (typeof planifierSauvegarde === "function") planifierSauvegarde();
  } else {
    // Score dans « Mon score » + exo coché « Fait » (scores.js)
    enregistrerScore(config.idFiche, rentres);
  }
  const detail = distancesDe(tour.exo).filter((d) => rates[d] > 0).map((d) => `${rates[d]} à ${d} pieds`).join(", ");
  const bilan = mode.dynamique
    ? `${fini ? `Bravo, ${d10(config)} rentré !` : "Arrêté avant la fin."} ${coups.length} putts joués, ${rentres} rentrés.`
    : `${rentres}/${coups.length} rentrés.`;
  alert(`${config.nom} terminé : ${bilan}\n${detail ? "Ratés : " + detail + "." : "Aucun raté, bravo !"}`);
}

// « 10 pieds » : la distance du dernier point
function d10(config) { return `${config.points[config.points.length - 1].d} pieds`; }

function abandonnerExo() {
  if (!exoAffiche || !confirm("Abandonner ? Les putts notés seront effacés (rien n'est compté).")) return;
  ecrireStockage(EXOS_POINTS[exoAffiche].cleEnCours, null, PREFIXE_SCORES);
  const idFiche = EXOS_POINTS[exoAffiche].idFiche;
  etapeChoisie = null;
  exoAffiche = null;
  document.getElementById("trefle-jeu").hidden = true;
  rafraichirCaseScore(idFiche);
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (evenement) => {
    const cible = evenement.target.closest("[data-action^='points-']");
    if (!cible) return;
    const action = cible.dataset.action;
    if (action === "points-commencer") commencerExo(cible.dataset.exo, cible.dataset.mode);
    if (action === "points-reprendre") reprendreExo(cible.dataset.exo);
    if (action === "points-point") { etapeChoisie = Number(cible.dataset.etape); afficherExoPoints(); }
    if (action === "points-resultat") noterEtape(cible.dataset.valeur === "oui");
    if (action === "points-terminer") terminerExo();
    if (action === "points-abandonner") abandonnerExo();
    if (action === "points-fermer") {
      // Le tour en cours est gardé : bouton « Reprendre » sur la carte
      const idFiche = exoAffiche ? EXOS_POINTS[exoAffiche].idFiche : null;
      document.getElementById("trefle-jeu").hidden = true;
      exoAffiche = null;
      if (idFiche) rafraichirCaseScore(idFiche);
    }
  });
  // Clavier : Entrée / Espace sur un point du schéma
  document.addEventListener("keydown", (evenement) => {
    const point = evenement.target.closest && evenement.target.closest(".point-trefle[data-etape]");
    if (point && (evenement.key === "Enter" || evenement.key === " ")) {
      evenement.preventDefault();
      etapeChoisie = Number(point.dataset.etape);
      afficherExoPoints();
    }
  });
});
