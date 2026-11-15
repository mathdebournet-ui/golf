/* =========================================================
   Exos interactifs (tous les exos de putting + couloir de précision aux fers)
   ---------------------------------------------------------
   - Sur la carte de l'exo (Aujourd'hui), un bouton ouvre l'exo en
     plein écran : schéma avec le trou et les points (puces).
   - Trois façons de jouer (« modes ») :
     · points fixes (Trèfle, 2 Feet Circle, Lowry…) : on appuie sur un
       point (ou on suit l'ordre proposé), puis Réussi / Raté. Un point
       peut avoir plusieurs balles (petites pastilles à côté). Un tour
       peut avoir plusieurs « phases » (Suite 1/5, Série 2/3…).
       « melange » = ordre tiré au hasard dans chaque phase.
     · dynamique (Snail) : rentré = point suivant, raté = point d'avant.
     · série (Mickelson, Leap Frog, Échelle inversée) : on compte les
       réussites d'affilée, la série s'arrête au premier raté.
     · « jusqu'à N » (couloir de précision) : on joue jusqu'à avoir N
       balles réussies ; score = nombre de balles jouées (moins = mieux,
       voir SCORES_PLUS_BAS_MIEUX dans scores.js).
   - À la fin : le score va dans « Mon score » (scores.js) et l'exo
     passe en « Fait » (sauf modes « sansScore » : le Snail).
   - Statistiques par distance (ratés moyens, réussite) sur tous les
     tours, envoyées avec les scores (clé <cleStats>) : un onglet par
     exo dans l'Espace admin (serie.js).
   Pour ajouter un exo : une entrée de plus dans EXOS_POINTS (+ unité
   dans UNITES_SCORE de scores.js).
   Données (préfixe golf-scores-v1:) : <cleTours> = tours terminés
   { t, d, mode, rentres, total, fini, rates: {distance: n}, tentes: {distance: n} },
   <cleEnCours> = tour en cours :
     points fixes { exo, mode, etapes: [points], resultats, noms? }
     dynamique    { exo, mode, position, coups: [{ point, rentre }] }
     série        { exo, mode, coups: [{ point, rentre }] }
     jusqu'à N    { exo, mode, coups: [{ point: null, rentre }] }
   ========================================================= */

"use strict";

// Une balle par point, répété n fois : repete([0, 1], 3) → [0, 0, 0, 1, 1, 1]
function repete(indices, n) { return indices.flatMap((i) => Array(n).fill(i)); }
// n phases identiques : phasesIdentiques([0, 1], 3) → [[0, 1], [0, 1], [0, 1]]
function phasesIdentiques(indices, n) { return Array.from({ length: n }, () => [...indices]); }
function nomsNumerotes(mot, n) { return Array.from({ length: n }, (_, k) => `${mot} ${k + 1}/${n}`); }

// Les 4 puces en ligne (4, 7, 9, 11 m) du 2 Feet Circle et de la Demi-Lune
const PUCES_4_7_9_11 = [
  { x: 0, y: 110, d: 4 }, { x: 0, y: 200, d: 7 }, { x: 0, y: 290, d: 9 }, { x: 0, y: 380, d: 11 },
];

// Lignes du 9 Putt Circle : diagonale gauche, axe, diagonale droite (40° de l'axe)
function ligne9Putt(angle) {
  const a = (angle * Math.PI) / 180;
  return [[14, 170], [16, 250], [18, 330]].map(([d, r]) => ({ x: Math.round(r * Math.sin(a)), y: Math.round(r * Math.cos(a)), d }));
}

// Points (x, y par rapport au trou, y vers le bas ; d = distance).
// Trèfle et Snail : recopiés des schémas du PDF « Fiches exercices » ;
// les autres : schémas simplifiés d'après les fiches (pas à l'échelle).
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

  "2-feet-circle": {
    nom: "2 Feet Circle",
    emoji: "⭕",
    idFiche: "2-feet-circle",
    cleStats: "2-feet-circle-stats",
    cleTours: "tours-2-feet-circle",
    cleEnCours: "enCours-2-feet-circle",
    unite: "m",
    viewBox: "-150 -215 460 490",
    decor: `<circle class="decor-zone" cx="0" cy="0" r="58"></circle>
            <text class="decor-texte" x="0" y="-72" text-anchor="middle">cercle de 60 cm</text>`,
    consigne: "Réussi = la balle s'arrête dans le cercle de 60 cm (ou rentre).",
    boutons: ["✅ Dans le cercle", "❌ Dehors"],
    motReussi: "dans le cercle",
    // Puces tout autour du trou (pas en ligne droite), d'après le dessin de
    // l'utilisateur (14/11/2026) : 4 m en bas à gauche, 7 m en bas à droite,
    // 9 m en bas, 11 m en haut à droite.
    points: [
      { x: -105, y: 85, d: 4 }, { x: 109, y: 131, d: 7 }, { x: -51, y: 224, d: 9 }, { x: 195, y: -172, d: 11 },
    ],
    modes: {
      ordre: { nom: "Dans l'ordre (3 balles de 4 à 11 m)", phases: [repete([0, 1, 2, 3], 3)] },
      hasard: { nom: "🎲 Variante difficile : ordre au hasard", phases: phasesIdentiques([0, 1, 2, 3], 3), nomsPhases: nomsNumerotes("Tour", 3), melange: true },
    },
  },

  "9-putt-circle": {
    nom: "9 Putt Circle",
    emoji: "🎯",
    idFiche: "9-putt-circle",
    cleStats: "9-putt-circle-stats",
    cleTours: "tours-9-putt-circle",
    cleEnCours: "enCours-9-putt-circle",
    viewBox: "-270 -100 540 470",
    decor: `<circle class="decor-zone" cx="0" cy="0" r="48"></circle>
            <text class="decor-texte" x="0" y="-62" text-anchor="middle">cercle de 30 cm</text>`,
    consigne: "Routine complète à chaque putt. Réussi = la balle finit dans le cercle de 30 cm (ou rentre).",
    boutons: ["✅ Dans les 30 cm", "❌ Dehors"],
    motReussi: "dans la zone",
    points: [...ligne9Putt(-40), ...ligne9Putt(0), ...ligne9Putt(40)],
    modes: { tour: { nom: "Commencer (9 putts)", phases: [[...Array(9).keys()]] } },
  },

  "demi-lune": {
    nom: "Demi-Lune",
    emoji: "🌗",
    idFiche: "demi-lune",
    cleStats: "demi-lune-stats",
    cleTours: "tours-demi-lune",
    cleEnCours: "enCours-demi-lune",
    unite: "m",
    viewBox: "-140 -130 290 550",
    decor: `<path class="decor-zone" d="M -80 0 A 80 80 0 0 1 80 0 Z"></path>
            <text class="decor-texte" x="0" y="-95" text-anchor="middle">demi-lune 1,2 m derrière</text>`,
    consigne: "Réussi = la balle passe le trou et finit dans la demi-lune (ou rentre). Une balle courte ne compte jamais.",
    boutons: ["✅ Dans la demi-lune", "❌ Courte ou trop longue"],
    motReussi: "dans la demi-lune",
    points: PUCES_4_7_9_11,
    modes: {
      ordre: { nom: "Dans l'ordre (3 balles de 4 à 11 m)", phases: [repete([0, 1, 2, 3], 3)] },
      hasard: { nom: "🎲 Variante difficile : ordre au hasard", phases: phasesIdentiques([0, 1, 2, 3], 3), nomsPhases: nomsNumerotes("Tour", 3), melange: true },
    },
  },

  "leap-frog": {
    nom: "Leap Frog",
    emoji: "🐸",
    idFiche: "leap-frog",
    cleStats: "leap-frog-stats",
    cleTours: "tours-leap-frog",
    cleEnCours: "enCours-leap-frog",
    consigne: "Chaque balle doit s'arrêter dans le rectangle ET plus loin que la précédente. La série s'arrête dès qu'une balle sort ou finit plus courte.",
    boutons: ["✅ Dans la zone, plus loin", "❌ Sortie ou plus courte"],
    motReussi: "balles",
    objectif: 7,
    points: [],
    modes: { serie: { nom: "▶ Commencer une série", serie: true } },
  },

  "lowry-putt": {
    nom: "Lowry Putt",
    emoji: "📏",
    idFiche: "lowry-putt",
    cleStats: "lowry-putt-stats",
    cleTours: "tours-lowry-putt",
    cleEnCours: "enCours-lowry-putt",
    viewBox: "-290 -130 580 250",
    // 3 bandes centrées sur le trou, perpendiculaires à la ligne de jeu
    decor: `<rect class="decor-zone" x="-33" y="-100" width="66" height="200"></rect>
            <rect class="decor-zone" x="-22" y="-100" width="44" height="200"></rect>
            <rect class="decor-zone" x="-11" y="-100" width="22" height="200"></rect>
            <text class="decor-texte" x="0" y="-108" text-anchor="middle">zones 1, 2, 3</text>`,
    consigne: "Seule la profondeur compte : la balle doit finir dans la zone de sa puce.",
    boutons: ["✅ Dans la zone", "❌ Hors zone"],
    motReussi: "dans la zone",
    // Un côté puis l'autre (montée et descente)
    points: [
      { x: 95, y: 0, d: 10, aide: "Zone 1 : 30 cm de profondeur" },
      { x: 170, y: 0, d: 20, aide: "Zone 2 : 60 cm de profondeur" },
      { x: 245, y: 0, d: 30, aide: "Zone 3 : 90 cm de profondeur" },
      { x: -95, y: 0, d: 10, aide: "Zone 1 : 30 cm de profondeur" },
      { x: -170, y: 0, d: 20, aide: "Zone 2 : 60 cm de profondeur" },
      { x: -245, y: 0, d: 30, aide: "Zone 3 : 90 cm de profondeur" },
    ],
    modes: { tour: { nom: "Commencer (6 putts)", phases: [[0, 1, 2, 3, 4, 5]] } },
  },

  "speed-drill-cross": {
    nom: "Speed Drill Cross",
    emoji: "➕",
    idFiche: "speed-drill-cross",
    cleStats: "speed-drill-cross-stats",
    cleTours: "tours-speed-drill-cross",
    cleEnCours: "enCours-speed-drill-cross",
    viewBox: "-290 -290 580 580",
    consigne: "Réussi = la balle touche le faux trou ET s'arrête entre 30 et 60 cm derrière. Une branche après l'autre, en tournant.",
    boutons: ["✅ Touché, 30-60 cm derrière", "❌ Raté"],
    motReussi: "réussis",
    // Branches : haut, droite, bas, gauche ; 3, 4, 5 pieds
    points: [[0, -1], [1, 0], [0, 1], [-1, 0]].flatMap(([dx, dy]) =>
      [[3, 100], [4, 175], [5, 250]].map(([d, r]) => ({ x: dx * r, y: dy * r, d }))),
    modes: { tour: { nom: "Commencer (12 putts)", phases: [[...Array(12).keys()]] } },
  },

  "start-line": {
    nom: "Start Line (porte)",
    emoji: "➡️",
    idFiche: "start-line",
    cleStats: "start-line-stats",
    cleTours: "tours-start-line",
    cleEnCours: "enCours-start-line",
    sansTrou: true,
    viewBox: "-80 -340 355 380",
    // Balle au départ, porte de 2 tees juste devant, 3 cibles sur la ligne
    decor: `<line class="decor-ligne" x1="0" y1="0" x2="0" y2="-320"></line>
            <rect class="decor-tee" x="-22" y="-44" width="9" height="18"></rect>
            <rect class="decor-tee" x="13" y="-44" width="9" height="18"></rect>
            <text class="decor-texte" x="30" y="-28">porte</text>
            <circle class="decor-balle" cx="0" cy="0" r="13"></circle>`,
    consigne: "Réussi = la balle passe la porte sans toucher les tees. (La dispersion se note à part.)",
    boutons: ["✅ Sortie sur la ligne", "❌ Mal sortie"],
    motReussi: "bien sorties",
    score: "pourcentage",
    points: [{ x: 0, y: -110, d: 5 }, { x: 0, y: -205, d: 10 }, { x: 0, y: -300, d: 20 }],
    // Fusion avec l'ancien exo « Porte de départ » (14/11/2026) : version courte
    // = 3 séries de 10 putts vers la cible à 1,5 m
    modes: {
      tour: { nom: "Complet : 10 putts par cible (1,5, 3 et 6 m)", phases: [repete([0, 1, 2], 10)] },
      court: { nom: "Version courte : 3 séries de 10 à 1,5 m", phases: phasesIdentiques(repete([0], 10), 3), nomsPhases: nomsNumerotes("Série", 3) },
    },
  },

  "speed-drill": {
    nom: "Speed Drill",
    emoji: "⚡",
    idFiche: "speed-drill",
    cleStats: "speed-drill-stats",
    cleTours: "tours-speed-drill",
    cleEnCours: "enCours-speed-drill",
    unite: "m",
    viewBox: "-95 -85 615 165",
    // Zone de 60 × 120 cm qui commence au milieu du trou, derrière lui
    decor: `<rect class="decor-zone" x="-62" y="-58" width="62" height="116"></rect>
            <text class="decor-texte" x="-31" y="-66" text-anchor="middle">zone</text>`,
    consigne: "Une balle par puce = une suite. Réussi = la balle finit dans la zone derrière le trou (ou rentre).",
    boutons: ["✅ Dans la zone", "❌ Hors zone"],
    motReussi: "dans la zone",
    points: [5, 6, 7, 8, 9, 10].map((d, i) => ({ x: 95 + i * 78, y: 0, d })),
    modes: {
      ordre: { nom: "5 suites de 5 à 10 m (30 putts)", phases: phasesIdentiques([0, 1, 2, 3, 4, 5], 5), nomsPhases: nomsNumerotes("Suite", 5) },
      hasard: { nom: "🎲 Variante difficile : distances au hasard", phases: phasesIdentiques([0, 1, 2, 3, 4, 5], 5), nomsPhases: nomsNumerotes("Suite", 5), melange: true },
    },
  },

  "cercle-mickelson": {
    nom: "Cercle de 3 pieds",
    emoji: "🔁",
    idFiche: "cercle-mickelson",
    cleStats: "cercle-mickelson-stats",
    cleTours: "tours-cercle-mickelson",
    cleEnCours: "enCours-cercle-mickelson",
    viewBox: "-195 -195 390 390",
    consigne: "Rentre les balles une par une en tournant. Au moindre raté, la série s'arrête.",
    boutons: ["✅ Rentré", "❌ Raté"],
    motReussi: "d'affilée",
    objectif: 30,
    parDistance: false,
    // 10 balles en cercle à 3 pieds, numérotées dans l'ordre où on les joue
    points: Array.from({ length: 10 }, (_, k) => ({
      x: Math.round(150 * Math.sin((k * Math.PI) / 5)),
      y: Math.round(-150 * Math.cos((k * Math.PI) / 5)),
      d: 3,
      texte: String(k + 1),
    })),
    modes: { serie: { nom: "▶ Commencer une série", serie: true } },
  },

  "echelle-de-dosage": {
    nom: "Échelle de dosage",
    emoji: "📐",
    idFiche: "echelle-de-dosage",
    cleStats: "echelle-de-dosage-stats",
    cleTours: "tours-echelle-de-dosage",
    cleEnCours: "enCours-echelle-de-dosage",
    sansTrou: true,
    libelle: (d) => `tee ${d}`,
    viewBox: "-150 -370 300 405",
    decor: `<line class="decor-ligne" x1="0" y1="0" x2="0" y2="-325"></line>
            <circle class="decor-balle" cx="0" cy="0" r="13"></circle>`,
    consigne: "Du tee le plus loin au plus proche. Réussi = la balle finit plus près de son tee que du tee voisin.",
    boutons: ["✅ Plus près de son tee", "❌ Plus près du voisin"],
    motReussi: "réussies",
    points: [
      { x: 0, y: -100, d: 1, texte: "1", aide: "Le plus proche (≈ 2,5 m)" },
      { x: 0, y: -175, d: 2, texte: "2", aide: "≈ 3,1 m (60 cm après le tee 1)" },
      { x: 0, y: -250, d: 3, texte: "3", aide: "≈ 3,7 m (60 cm après le tee 2)" },
      { x: 0, y: -325, d: 4, texte: "4", aide: "≈ 4,3 m, le plus loin" },
    ],
    modes: { tour: { nom: "Commencer (4 balles)", phases: [[3, 2, 1, 0]] } },
  },

  "echelle-inversee": {
    nom: "Échelle inversée",
    emoji: "🔻",
    idFiche: "echelle-inversee",
    cleStats: "echelle-inversee-stats",
    cleTours: "tours-echelle-inversee",
    cleEnCours: "enCours-echelle-inversee",
    consigne: "Première balle assez longue (≈ 8 m). Chaque balle suivante doit s'arrêter 30 à 60 cm plus court que la précédente.",
    boutons: ["✅ Bien placée", "❌ Trop loin ou trop court"],
    motReussi: "balles",
    objectif: 7,
    points: [],
    modes: { serie: { nom: "▶ Commencer une série", serie: true } },
  },

  // Practice (fers) : premier exo interactif hors putting (15/11/2026)
  "couloir-precision-fers": {
    nom: "Couloir de précision",
    emoji: "🎯",
    idFiche: "couloir-precision-fers",
    cleStats: "couloir-precision-fers-stats",
    cleTours: "tours-couloir-precision-fers",
    cleEnCours: "enCours-couloir-precision-fers",
    consigne: "Routine complète avant chaque balle. Une balle compte seulement si elle ATTERRIT dans le couloir (un doigt de chaque côté du drapeau, bras tendu).",
    boutons: ["✅ Dans le couloir", "❌ Hors couloir"],
    motReussi: "dans le couloir",
    points: [],
    modes: { tour: { nom: "▶ Commencer (5 balles dans le couloir)", jusqua: 5 } },
  },
};

// Classement des exos par famille (onglets de l'Espace admin, serie.js),
// choisi avec l'utilisateur le 14/11/2026
const FAMILLES_PUTTING = [
  { id: "dosage", nom: "📏 Dosage", exos: ["2-feet-circle", "demi-lune", "speed-drill", "lowry-putt", "leap-frog", "echelle-de-dosage", "echelle-inversee"] },
  { id: "petits", nom: "🎯 Petits putts", exos: ["trefle", "cercle-mickelson", "speed-drill-cross"] },
  { id: "intermediaire", nom: "↔️ Intermédiaire", exos: ["snail", "9-putt-circle", "start-line"] },
  { id: "practice", nom: "🏌️ Practice", exos: ["couloir-precision-fers"] },
];

let etapeChoisie = null;   // étape sélectionnée (index dans tour.etapes)

const virgule = (n) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");

function distancesDe(exo) {
  return [...new Set(EXOS_POINTS[exo].points.map((p) => p.d))].sort((a, b) => a - b);
}

// « 4 m », « 10 pieds », « tee 2 »
function libelleDistance(exo, d) {
  const config = EXOS_POINTS[exo];
  return config.libelle ? config.libelle(d) : `${virgule(d)} ${config.unite || "pieds"}`;
}

// Exo sans case « Mon score » (tous ses modes sont sans score : le Snail)
function sansScore(exo) { return Object.values(EXOS_POINTS[exo].modes).every((m) => m.sansScore); }
// Exo joué en série d'affilée (Mickelson, Leap Frog, Échelle inversée)
function enSerie(exo) { return Object.values(EXOS_POINTS[exo].modes).every((m) => m.serie); }
// Exo joué « jusqu'à N réussites » (couloir de précision) : score = balles jouées
function enJusqua(exo) { return Object.values(EXOS_POINTS[exo].modes).every((m) => m.jusqua); }
// Tableau par distance utile ? (pas pour une seule distance ou sans distance)
function avecTableauDistances(exo) { return EXOS_POINTS[exo].parDistance !== false && distancesDe(exo).length > 1; }
function motReussi(exo) { return EXOS_POINTS[exo].motReussi || "rentrés"; }

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
  if (mode.serie || mode.jusqua) return Array.isArray(tour.coups) ? tour : null;
  if (mode.dynamique) return Array.isArray(tour.coups) && Number.isInteger(tour.position) ? tour : null;
  return Array.isArray(tour.etapes) && Array.isArray(tour.resultats) && tour.etapes.length === tour.resultats.length ? tour : null;
}

function modeDuTour(tour) { return EXOS_POINTS[tour.exo].modes[tour.mode]; }
function estDynamique(tour) { return !!modeDuTour(tour).dynamique; }
function estSerie(tour) { return !!modeDuTour(tour).serie; }
function estJusqua(tour) { return !!modeDuTour(tour).jusqua; }

// Moyennes sur des tours : { nombre, rentres, total, meilleur, rates: {d}, reussite: {d} }
function statsDe(exo, tours) {
  if (!tours.length) return null;
  const s = {
    nombre: tours.length,
    rentres: tours.reduce((t, x) => t + x.rentres, 0) / tours.length,
    total: tours.reduce((t, x) => t + (x.total || 0), 0) / tours.length,
    // Meilleur tour : le plus de réussites, ou le moins de balles (« jusqu'à N »)
    meilleur: enJusqua(exo) ? Math.min(...tours.map((x) => x.total)) : Math.max(...tours.map((x) => x.rentres)),
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
  const config = EXOS_POINTS[exo];
  if (!stats) return `<p class="petit">Pas encore de ${config.nom} joué ici : tes moyennes apparaîtront après le premier tour.</p>`;
  const pluriel = stats.nombre > 1 ? "s" : "";
  if (enJusqua(exo)) {
    return `<p class="petit">${stats.nombre} tour${pluriel} · en moyenne ${virgule(stats.total)} balles pour en mettre ${virgule(stats.rentres)} ${motReussi(exo)} · meilleur : ${stats.meilleur} balles</p>`;
  }
  if (enSerie(exo)) {
    return `<p class="petit">${stats.nombre} série${pluriel} · moyenne ${virgule(stats.rentres)} ${motReussi(exo)} · meilleure : ${stats.meilleur}${config.objectif ? ` · objectif : ${config.objectif}` : ""}</p>`;
  }
  const resume = sansScore(exo)
    ? `en moyenne ${virgule(stats.total)} putts joués par tour (${virgule(stats.rentres)} rentrés)`
    : `moyenne ${virgule(stats.rentres)} ${motReussi(exo)} sur ${virgule(stats.total)}`;
  const entete = `<p class="petit">${stats.nombre} tour${pluriel} joué${pluriel} · ${resume}</p>`;
  if (!avecTableauDistances(exo)) return entete;
  return `${entete}
    <div class="tableau-defilant"><table class="tableau-admin">
      <thead><tr><th>Distance</th><th>Ratés en moyenne</th><th>Réussite</th></tr></thead>
      <tbody>${distancesDe(exo).map((d) => `<tr><td>${echapper(libelleDistance(exo, d))}</td><td class="nombre">${virgule(stats.rates[d])}</td><td class="nombre">${stats.reussite[d] === null ? "—" : stats.reussite[d] + " %"}</td></tr>`).join("")}</tbody>
    </table></div>`;
}

function zoneExoPoints(idFiche) {
  const exo = exoDeLaFiche(idFiche);
  if (!exo) return "";
  const config = EXOS_POINTS[exo];
  const enCours = tourEnCours(exo);
  const plusieurs = Object.keys(config.modes).length > 1;
  const boutons = enCours
    ? `<button type="button" class="bouton principal pleine-largeur" data-action="points-reprendre" data-exo="${exo}">${config.emoji} Reprendre (${echapper(config.modes[enCours.mode].nom)})</button>`
    : Object.entries(config.modes).map(([id, m], k) =>
        `<button type="button" class="bouton ${!plusieurs || k === 0 ? "principal" : ""} pleine-largeur" data-action="points-commencer" data-exo="${exo}" data-mode="${id}">${config.emoji} ${echapper(m.nom)}</button>`).join("");
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
  const phases = tour.phases || modeDuTour(tour).phases;
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

function nomDePhase(tour, phase) {
  if (phase.nombre <= 1) return "";
  const noms = modeDuTour(tour).nomsPhases;
  return noms ? noms[phase.numero] : `Phase ${phase.numero + 1}/${phase.nombre}`;
}

function texteDuPoint(p) { return p.texte !== undefined ? p.texte : virgule(p.d); }

function enteteJeu(config) {
  return `
    <div class="trefle-haut">
      <h2 class="bloc-titre">${config.emoji} ${echapper(config.nom)}</h2>
      <button type="button" class="bouton" data-action="points-fermer">Fermer</button>
    </div>`;
}

function boutonsResultat(config) {
  const [oui, non] = config.boutons || ["✅ Rentré", "❌ Raté"];
  return `
    <div class="actions">
      <button type="button" class="bouton principal" data-action="points-resultat" data-valeur="oui">${echapper(oui)}</button>
      <button type="button" class="bouton danger" data-action="points-resultat" data-valeur="non">${echapper(non)}</button>
    </div>`;
}

function debutSchema(config, label, role) {
  return `<svg class="schema-trefle" viewBox="${config.viewBox}" role="${role}" aria-label="${echapper(label)}">
    ${config.decor || ""}
    ${config.sansTrou ? "" : `<circle class="trou" cx="0" cy="0" r="20"></circle>`}`;
}

// Points fixes : chaque point peut avoir plusieurs balles dans la phase
// (pastilles à droite du point : gris = à jouer, vert = réussi, rouge = raté)
function schemaExo(tour) {
  const config = EXOS_POINTS[tour.exo];
  const phase = phaseActuelle(tour);
  const etapesDuPoint = {};
  for (let e = phase.debut; e < phase.fin; e++) {
    (etapesDuPoint[tour.etapes[e]] = etapesDuPoint[tour.etapes[e]] || []).push(e);
  }

  const points = config.points.map((p, i) => {
    const etapes = etapesDuPoint[i] || [];
    const res = etapes.map((e) => tour.resultats[e]);
    let etat = "hors-phase";
    if (etapes.length) {
      if (res.some((r) => r === null)) etat = "a-jouer";
      else if (res.every((r) => r === true)) etat = "rentre";
      else if (res.every((r) => r === false)) etat = "rate";
      else etat = "mixte";
    }
    const choisi = etapeChoisie !== null && etapes.includes(etapeChoisie);
    const uneBalle = etapes.length === 1;
    const texte = uneBalle && res[0] !== null ? (res[0] ? "✓" : "✗") : texteDuPoint(p);
    // Étape jouée si on appuie sur le point : la première pas encore jouée, sinon la dernière (pour corriger)
    const cible = etapes.length ? etapes.find((e) => tour.resultats[e] === null) ?? etapes[etapes.length - 1] : undefined;
    const attributs = cible === undefined ? "" : `data-action="points-point" data-etape="${cible}" role="button" tabindex="0"`;
    const reussis = res.filter((r) => r === true).length;
    const joues = res.filter((r) => r !== null).length;
    const nomEtat = etat === "hors-phase" ? "pas dans cette phase" : etapes.length > 1 ? `${joues} sur ${etapes.length} joués, ${reussis} réussis` : { rentre: "réussi", rate: "raté", "a-jouer": "à jouer" }[etat];
    const pastilles = etapes.length > 1
      ? etapes.map((e, k) => {
          const r = tour.resultats[e];
          return `<circle class="bille ${r === true ? "rentre" : r === false ? "rate" : "a-jouer"} ${e === etapeChoisie ? "choisie" : ""}" cx="${p.x + 50 + k * 22}" cy="${p.y}" r="9"></circle>`;
        }).join("")
      : "";
    return `
      <g class="point-trefle ${etat} ${choisi ? "choisi" : ""}" ${attributs} aria-label="${echapper(libelleDistance(tour.exo, p.d))}, ${nomEtat}">
        <circle cx="${p.x}" cy="${p.y}" r="31"></circle>
        <text x="${p.x}" y="${p.y + 9}" text-anchor="middle">${echapper(texte)}</text>
        ${pastilles}
      </g>`;
  }).join("");
  return `${debutSchema(config, `Schéma du ${config.nom} : appuie sur un point`, "group")}${points}</svg>`;
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
  return `${debutSchema(config, `Schéma du ${config.nom} : point en cours entouré`, "img")}${points}</svg>`;
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
      ${enteteJeu(config)}
      <p class="bloc-info">${echapper(config.modes[tour.mode].nom)} · ${tour.coups.length} putt${tour.coups.length > 1 ? "s" : ""} joué${tour.coups.length > 1 ? "s" : ""} · ${rentres} rentré${rentres > 1 ? "s" : ""}</p>
      ${schemaDynamique(tour)}
      <div class="trefle-choix">
        <p class="petit">${message}</p>
        <p><strong>À jouer : ${p.d} pieds</strong></p>
        ${boutonsResultat(config)}
      </div>
      <div class="actions">
        <button type="button" class="bouton pleine-largeur" data-action="points-terminer" ${tour.coups.length === 0 ? "disabled" : ""}>Arrêter et enregistrer</button>
        <button type="button" class="bouton pleine-largeur" data-action="points-abandonner">Abandonner (rien n'est compté)</button>
      </div>
    </div>`;
  zone.hidden = false;
}

// Mode « série » : on compte les réussites d'affilée, fin au premier raté
function afficherJeuSerie(tour) {
  const zone = document.getElementById("trefle-jeu");
  const config = EXOS_POINTS[tour.exo];
  const serie = tour.coups.length;   // en cours, tous les coups notés sont réussis
  const r = resumeScores(lireScores()[config.idFiche], config.idFiche);   // scores.js
  const record = r ? r.record : 0;
  let schema = "";
  if (config.points.length) {
    const n = config.points.length;
    const position = serie % n;
    const points = config.points.map((p, i) => {
      const etat = i < position ? "rentre" : "a-jouer";
      return `
        <g class="point-trefle ${etat} ${i === position ? "choisi" : ""}" aria-label="balle ${i + 1}${i === position ? ", à jouer maintenant" : i < position ? ", rentrée" : ""}">
          <circle cx="${p.x}" cy="${p.y}" r="31"></circle>
          <text x="${p.x}" y="${p.y + 9}" text-anchor="middle">${i < position ? "✓" : echapper(texteDuPoint(p))}</text>
        </g>`;
    }).join("");
    schema = `${debutSchema(config, `Schéma du ${config.nom} : balle en cours entourée`, "img")}
      <text class="decor-texte" x="0" y="60" text-anchor="middle">tour ${Math.floor(serie / n) + 1}</text>${points}</svg>`;
  }
  const objectif = config.objectif && serie < config.objectif ? ` · objectif ${config.objectif}` : "";
  const message = record && serie > record ? "🏆 Nouveau record en cours !" : record ? `🏆 Record : ${record}${objectif}` : objectif.replace(" · o", "O");
  zone.innerHTML = `
    <div class="trefle-contenu">
      ${enteteJeu(config)}
      ${config.consigne ? `<p class="petit">${echapper(config.consigne)}</p>` : ""}
      ${schema}
      <div class="trefle-choix">
        <p class="compteur-serie" aria-live="polite">${serie}</p>
        <p class="petit">${echapper(motReussi(tour.exo))}${message ? " · " + message : ""}</p>
        ${boutonsResultat(config)}
      </div>
      <div class="actions">
        <button type="button" class="bouton pleine-largeur" data-action="points-terminer" ${serie === 0 ? "disabled" : ""}>Arrêter et enregistrer (${serie})</button>
        <button type="button" class="bouton pleine-largeur" data-action="points-abandonner">Abandonner (rien n'est compté)</button>
      </div>
    </div>`;
  zone.hidden = false;
}

// Mode « jusqu'à N » : on joue jusqu'à N balles réussies, on compte les balles jouées
function afficherJeuJusqua(tour) {
  const zone = document.getElementById("trefle-jeu");
  const config = EXOS_POINTS[tour.exo];
  const objectif = modeDuTour(tour).jusqua;
  const reussies = tour.coups.filter((c) => c.rentre).length;
  const jouees = tour.coups.length;
  const r = resumeScores(lireScores()[config.idFiche], config.idFiche);   // scores.js
  // Le record est battu tant qu'on a joué moins de balles que lui
  const message = r
    ? (jouees >= r.record ? `🏆 Record : ${r.record} balles (déjà dépassé, termine quand même)` : `🏆 Record : ${r.record} balles`)
    : "Premier tour : il deviendra ton record.";
  // Une pastille par balle jouée (vert = dans le couloir, rouge = hors couloir)
  const pastilles = tour.coups.map((c, i) =>
    `<span class="pastille-balle ${c.rentre ? "rentre" : "rate"}" title="balle ${i + 1}">${c.rentre ? "✓" : "✗"}</span>`).join("");
  zone.innerHTML = `
    <div class="trefle-contenu">
      ${enteteJeu(config)}
      ${config.consigne ? `<p class="petit">${echapper(config.consigne)}</p>` : ""}
      <div class="trefle-choix">
        <p class="compteur-serie" aria-live="polite">${reussies} / ${objectif}</p>
        <p><strong>${echapper(motReussi(tour.exo))}</strong> · ${jouees} balle${jouees > 1 ? "s" : ""} jouée${jouees > 1 ? "s" : ""}</p>
        <p class="petit">${echapper(message)}</p>
        ${pastilles ? `<p class="pastilles-balles" aria-label="balles jouées">${pastilles}</p>` : ""}
        ${boutonsResultat(config)}
      </div>
      <div class="actions">
        ${jouees ? `<button type="button" class="bouton pleine-largeur" data-action="points-annuler">↶ Annuler la dernière balle</button>` : ""}
        <button type="button" class="bouton pleine-largeur" data-action="points-abandonner">Abandonner (rien n'est compté)</button>
      </div>
    </div>`;
  zone.hidden = false;
}

// Efface la dernière balle notée (erreur de bouton) : mode « jusqu'à N »
function annulerDerniereBalle() {
  const tour = exoAffiche ? tourEnCours(exoAffiche) : null;
  if (!tour || !estJusqua(tour) || tour.coups.length === 0) return;
  tour.coups.pop();
  ecrireStockage(EXOS_POINTS[tour.exo].cleEnCours, tour, PREFIXE_SCORES);
  afficherExoPoints();
}

function afficherExoPoints() {
  const zone = document.getElementById("trefle-jeu");
  const tour = exoAffiche ? tourEnCours(exoAffiche) : null;
  if (!tour) { zone.hidden = true; return; }
  if (estJusqua(tour)) { afficherJeuJusqua(tour); return; }
  if (estDynamique(tour)) { afficherDynamique(tour); return; }
  if (estSerie(tour)) { afficherJeuSerie(tour); return; }
  const config = EXOS_POINTS[tour.exo];
  const mode = modeDuTour(tour);
  const phase = phaseActuelle(tour);
  const joues = tour.resultats.filter((r) => r !== null).length;
  const rentres = tour.resultats.filter((r) => r === true).length;
  const total = tour.etapes.length;
  const p = etapeChoisie !== null ? config.points[tour.etapes[etapeChoisie]] : null;
  const nomPhase = nomDePhase(tour, phase);

  zone.innerHTML = `
    <div class="trefle-contenu">
      ${enteteJeu(config)}
      <p class="bloc-info">${Object.keys(config.modes).length > 1 ? echapper(mode.nom) + " · " : ""}${joues}/${total} joués · ${rentres} ${echapper(motReussi(tour.exo))}${nomPhase ? " · " + echapper(nomPhase) : ""}</p>
      ${config.consigne ? `<p class="petit">${echapper(config.consigne)}</p>` : ""}
      ${schemaExo(tour)}
      <div class="trefle-choix">
        ${p
          ? `<p><strong>${mode.melange ? "🎲 " : ""}À jouer : ${echapper(libelleDistance(tour.exo, p.d))}</strong>${p.aide ? `<br><span class="petit">${echapper(p.aide)}</span>` : ""}</p>
             ${boutonsResultat(config)}`
          : `<p class="petit">Appuie sur un point du schéma (blanc = à jouer, vert = réussi, rouge = raté). Les chiffres = distance${config.unite === "m" ? " en mètres" : config.libelle ? "" : " en pieds"}.</p>`}
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

// Mélange de Fisher-Yates (ordre au hasard)
function melanger(liste) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

function commencerExo(exo, mode) {
  const config = EXOS_POINTS[exo];
  if (!config || !config.modes[mode]) return;
  const m = config.modes[mode];
  exoAffiche = exo;
  etapeChoisie = null;
  if (m.serie || m.jusqua) {
    ecrireStockage(config.cleEnCours, { exo, mode, debut: Date.now(), coups: [] }, PREFIXE_SCORES);
  } else if (m.dynamique) {
    ecrireStockage(config.cleEnCours, { exo, mode, debut: Date.now(), position: 0, coups: [] }, PREFIXE_SCORES);
  } else {
    // Ordre au hasard : tiré une fois au début, gardé dans le tour (phases)
    const phases = m.melange ? m.phases.map(melanger) : m.phases;
    const etapes = phases.flat();
    ecrireStockage(config.cleEnCours, { exo, mode, debut: Date.now(), phases, etapes, resultats: etapes.map(() => null) }, PREFIXE_SCORES);
    etapeChoisie = 0;
  }
  afficherExoPoints();
}

function reprendreExo(exo) {
  const tour = tourEnCours(exo);
  if (!tour) return;
  exoAffiche = exo;
  etapeChoisie = estDynamique(tour) || estSerie(tour) || estJusqua(tour) ? null : etapeSuivante(tour);
  afficherExoPoints();
}

function noterEtape(rentre) {
  const tour = exoAffiche ? tourEnCours(exoAffiche) : null;
  if (!tour) return;
  const config = EXOS_POINTS[tour.exo];
  if (estJusqua(tour)) {
    tour.coups.push({ point: null, rentre });
    ecrireStockage(config.cleEnCours, tour, PREFIXE_SCORES);
    // Fini dès qu'on a le nombre de balles réussies demandé
    if (tour.coups.filter((c) => c.rentre).length >= modeDuTour(tour).jusqua) { terminerExo(); return; }
    afficherExoPoints();
    return;
  }
  if (estSerie(tour)) {
    const n = config.points.length;
    tour.coups.push({ point: n ? tour.coups.length % n : null, rentre });
    ecrireStockage(config.cleEnCours, tour, PREFIXE_SCORES);
    if (!rentre) { terminerExo(); return; }   // raté : la série s'arrête
    afficherExoPoints();
    return;
  }
  if (estDynamique(tour)) {
    // Rentré : on avance (fini si c'était le dernier point) ; raté : on redescend d'un point
    tour.coups.push({ point: tour.position, rentre });
    const dernier = config.points.length - 1;
    if (rentre && tour.position === dernier) {
      ecrireStockage(config.cleEnCours, tour, PREFIXE_SCORES);
      terminerExo();
      return;
    }
    tour.position = rentre ? tour.position + 1 : Math.max(0, tour.position - 1);
    ecrireStockage(config.cleEnCours, tour, PREFIXE_SCORES);
    afficherExoPoints();
    return;
  }
  if (etapeChoisie === null) return;
  tour.resultats[etapeChoisie] = rentre;
  ecrireStockage(config.cleEnCours, tour, PREFIXE_SCORES);
  etapeChoisie = etapeSuivante(tour, etapeChoisie);
  afficherExoPoints();
}

function terminerExo() {
  const tour = exoAffiche ? tourEnCours(exoAffiche) : null;
  if (!tour) return;
  const config = EXOS_POINTS[tour.exo];
  const mode = modeDuTour(tour);
  // Liste des putts joués : [{ point, rentre }]
  let coups;
  if (mode.jusqua) {
    // Terminé seulement quand les N balles réussies sont atteintes
    if (tour.coups.filter((c) => c.rentre).length < mode.jusqua) return;
    coups = tour.coups;
  } else if (mode.dynamique || mode.serie) {
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
    const p = Number.isInteger(c.point) ? config.points[c.point] : null;
    if (!p) return;
    tentes[p.d]++;
    if (!c.rentre) rates[p.d]++;
  });
  const rentres = coups.filter((c) => c.rentre).length;
  const dernierPoint = config.points.length - 1;
  const fini = !mode.dynamique || coups.some((c) => c.rentre && c.point === dernierPoint);
  const ancienRecord = (resumeScores(lireScores()[config.idFiche], config.idFiche) || { record: 0 }).record;
  const tours = toursDe(tour.exo);
  tours.push({ t: Date.now(), d: dateEnTexte(new Date()), mode: tour.mode, rentres, total: coups.length, fini, rates, tentes });
  ecrireStockage(config.cleTours, tours, PREFIXE_SCORES);
  ecrireStockage(config.cleEnCours, null, PREFIXE_SCORES);
  etapeChoisie = null;
  exoAffiche = null;
  document.getElementById("trefle-jeu").hidden = true;

  // Score : pourcentage, balles jouées (« jusqu'à N », moins = mieux) ou réussites
  const score = config.score === "pourcentage" ? Math.round((100 * rentres) / coups.length) : mode.jusqua ? coups.length : rentres;
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
    enregistrerScore(config.idFiche, score);
  }
  const record = !mode.sansScore && ancienRecord > 0 && meilleurQue(config.idFiche, score, ancienRecord) ? `\n🏆 Nouveau record (avant : ${texteScore(config.idFiche, ancienRecord)}) !` : "";
  if (mode.serie) {
    alert(`${config.nom} : série de ${rentres} ${motReussi(tour.exo)}.${record}`);
    return;
  }
  if (mode.jusqua) {
    alert(`${config.nom} terminé : ${coups.length} balles pour en mettre ${rentres} ${motReussi(tour.exo)}.${record}`);
    return;
  }
  const detail = distancesDe(tour.exo).filter((d) => rates[d] > 0).map((d) => `${rates[d]} à ${libelleDistance(tour.exo, d)}`).join(", ");
  const bilan = mode.dynamique
    ? `${fini ? `Bravo, ${d10(config)} rentré !` : "Arrêté avant la fin."} ${coups.length} putts joués, ${rentres} rentrés.`
    : `${texteScore(config.idFiche, score)} (${rentres}/${coups.length} ${motReussi(tour.exo)}).`;
  const ratesTexte = avecTableauDistances(tour.exo) ? (detail ? "\nRatés : " + detail + "." : "\nAucun raté, bravo !") : "";
  alert(`${config.nom} terminé : ${bilan}${ratesTexte}${record}`);
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
    if (action === "points-annuler") annulerDerniereBalle();
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
