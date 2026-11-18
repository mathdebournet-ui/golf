/* =========================================================
   🏗️ Tycoon : on construit son parcours de golf avec des pièces
   ---------------------------------------------------------
   Repris du prototype fairway-tycoon/index.html, branché sur
   l'appli d'entraînement :
   - chaque exo d'« Aujourd'hui » coché ✓ rapporte 25 pièces
     (×2 si le jeu interactif est PARFAIT : ex. Trèfle 16/16),
   - chaque exercice 🧠 Mental fait : 25 pièces,
   - chaque partie ⛳ terminée : 50 pièces,
   - des « défis golf » de performance (10, 25 ou 50 pièces) :
     cochés à la main (putting, chipping, practice…) ou validés
     tout seuls par une partie notée (birdie, sans 3-putts…).
   Bonus : +10 % par jour de série 🔥 (serie.js), max +100 %.
   Les pièces servent à poser des éléments sur une carte
   isométrique 20 x 20 (gazon, bunker, lac, green, club-house…).

   Tout le fichier est dans une « fonction enveloppe » (IIFE) :
   ses noms de fonctions ne se mélangent pas avec ceux des
   autres fichiers. Seules 2 fonctions sont visibles dehors :
   afficherTycoon() (appelée par changerVue dans app.js) et
   tycoonSynchroniser(source) (appelée après un ✓, un exercice
   mental ou une partie terminée).

   Utilise (au moment de l'appel, pas au chargement) :
   lireStockage / ecrireStockage / toutesLesFiches / changerVue (app.js),
   faitsDuJour / calculerSerie (serie.js), mentalHistorique /
   mentalDonnees (mental.js), partiesTerminees (parcours.js).
   Stockage : « golf-tycoon-v1:etat » (ne jamais purger).
   ========================================================= */

(function () {
  "use strict";

  /* =======================================================
     1. RÉGLAGES ET ÉTAT
     ======================================================= */

  const PREFIXE_TYCOON = "golf-tycoon-v1:";
  const GAIN_EXO = 25;       // exo d'« Aujourd'hui » coché
  const GAIN_MENTAL = 25;    // exercice mental fait
  const GAIN_PARTIE = 50;    // partie terminée
  const PALIER_NIVEAU = 25;  // un niveau toutes les 25 actions
  const BONUS_PAR_JOUR = 10; // +10 % par jour de série
  const BONUS_MAX = 100;

  // Éléments de la boutique (plat = au sol ; haut = partie en hauteur)
  const ELEMENTS = {
    gazon:     { nom: "Gazon",      prix: 5,   niveau: 1, plat: true,  haut: false, couleur: "#5cc246" },
    fairway:   { nom: "Fairway",    prix: 10,  niveau: 1, plat: true,  haut: false, couleur: "#86e06a" },
    depart:    { nom: "Départ",     prix: 10,  niveau: 1, plat: true,  haut: false, couleur: "#6fcf55" },
    bunker:    { nom: "Bunker",     prix: 15,  niveau: 1, plat: true,  haut: false, couleur: "#f2dc9b" },
    arbre:     { nom: "Arbre",      prix: 20,  niveau: 1, plat: false, haut: true,  couleur: "#3fae4f" },
    lac:       { nom: "Lac",        prix: 40,  niveau: 2, plat: true,  haut: false, couleur: "#7fd0ff" },
    green:     { nom: "Green",      prix: 60,  niveau: 3, plat: true,  haut: true,  couleur: "#62e07c" },
    puttinggreen: { nom: "Putting green", prix: 120, niveau: 3, plat: false, haut: true, couleur: "#62e07c" },
    practice:  { nom: "Practice",   prix: 200, niveau: 4, plat: false, haut: true,  couleur: "#ffffff" },
    clubhouse: { nom: "Club-house", prix: 300, niveau: 5, plat: false, haut: true,  couleur: "#e05a4a" },
  };
  const ICONES = ["⛳", "🏌️", "🎯", "🕳️", "🚩", "🏖️", "📏", "🚀", "🔁", "🏆", "🟢", "🐦", "🧹", "⏱️", "🌲", "🔥"];

  // Défis golf proposés : uniquement de la PERFORMANCE (score, cible, record),
  // jamais de technique. Exemples écrits par Claude (sans source), à adapter.
  // auto = validé tout seul quand une partie terminée remplit la condition.
  const CATEGORIES_DEFIS = { putting: "Putting", chipping: "Chipping", bunker: "Bunker", practice: "Practice", parcours: "Sur le parcours" };
  // Niveau visé : joueurs de 5 à +4 d'index (v38, défis durcis).
  const CATALOGUE_DEFIS = [
    // Putting
    { ref: "putt-50-1m",    cat: "putting",  icone: "🕳️", nom: "50 putts rentrés d'affilée à 1,5 m", recompense: 25 },
    { ref: "putt-horloge",  cat: "putting",  icone: "🔁", nom: "Horloge : 12 putts à 1,5 m puis 12 à 2 m, sans rater", recompense: 50 },
    { ref: "putt-3m",       cat: "putting",  icone: "🎯", nom: "Putts de 3 m : 6 rentrés sur 10", recompense: 50 },
    { ref: "putt-lag",      cat: "putting",  icone: "📏", nom: "Lag : 10 putts de 15 m, tous à moins de 90 cm", recompense: 50 },
    // Chipping
    { ref: "chip-7-10",     cat: "chipping", icone: "🚩", nom: "10 chips : 8 à moins de 1 m et 1 rentré", recompense: 50 },
    { ref: "up-down",       cat: "chipping", icone: "⛳", nom: "Up & down : 8 réussis sur 10 (lies différents)", recompense: 50 },
    { ref: "lob",           cat: "chipping", icone: "🪂", nom: "Lob par-dessus un obstacle : 6 sur 10 à moins de 2 m", recompense: 25 },
    // Bunker
    { ref: "bunker-6-10",   cat: "bunker",   icone: "🏖️", nom: "10 sorties de bunker : 8 à moins de 2 m", recompense: 50 },
    { ref: "bunker-30m",    cat: "bunker",   icone: "🏝️", nom: "Bunker à 30 m du trou : 5 sur 10 à moins de 4 m", recompense: 50 },
    // Practice
    { ref: "drive-couloir", cat: "practice", icone: "🚀", nom: "Drive : 8 sur 10 dans un couloir de 20 m", recompense: 50 },
    { ref: "wedge-50",      cat: "practice", icone: "🎯", nom: "Wedging : 10 balles à 50 m, 7 à moins de 3 m", recompense: 50 },
    { ref: "wedge-3dist",   cat: "practice", icone: "📐", nom: "Wedging 40 / 60 / 80 m : 9 balles sur 15 à moins de 4 m", recompense: 50 },
    { ref: "fers-cible",    cat: "practice", icone: "🏌️", nom: "Fers à 150 m : 6 balles sur 10 à moins de 6 m de la cible", recompense: 50 },
    // Sur le parcours (validés tout seuls par une partie notée ; seuils pour 18 trous, entre parenthèses pour 9)
    { ref: "auto-birdie",   cat: "parcours", icone: "🐦", nom: "3 birdies dans la partie (2 sur 9 trous)", recompense: 25, auto: "birdies" },
    { ref: "auto-eagle",    cat: "parcours", icone: "🦅", nom: "Faire un eagle", recompense: 50, auto: "eagle" },
    { ref: "auto-3putts",   cat: "parcours", icone: "🟢", nom: "Partie sans 3-putts", recompense: 50, auto: "sans3putts" },
    { ref: "auto-double",   cat: "parcours", icone: "🧹", nom: "Au plus 2 bogeys, aucun double (1 sur 9 trous)", recompense: 50, auto: "peuDeBogeys" },
    { ref: "auto-penalite", cat: "parcours", icone: "🚫", nom: "Partie sans aucune pénalité", recompense: 25, auto: "sansPenalite" },
    { ref: "auto-gir",      cat: "parcours", icone: "🎯", nom: "14 greens en régulation sur 18 (7 sur 9)", recompense: 50, auto: "gir14" },
    { ref: "auto-par",      cat: "parcours", icone: "🏆", nom: "Finir sous le par", recompense: 25, auto: "sousLePar" },
    { ref: "auto-moins3",   cat: "parcours", icone: "🔥", nom: "Finir à −3 ou mieux (−2 sur 9 trous)", recompense: 50, auto: "moins3" },
  ];
  // Anciens textes (avant v38) : un défi jamais modifié par le joueur est mis à jour tout seul
  const ANCIENS_DEFIS = {
    "putt-50-1m": "50 putts rentrés d'affilée à 1 m", "putt-horloge": "Horloge : 12 putts à 1,5 m sans rater",
    "putt-lag": "Lag : 10 putts de 12 m, tous à moins de 1 m", "chip-7-10": "10 chips : au moins 7 à moins de 1 m",
    "up-down": "Up & down : 7 réussis sur 10 balles", "bunker-6-10": "10 sorties de bunker : 6 à moins de 2 m",
    "drive-couloir": "Drive : 8 sur 10 dans un couloir de 25 m", "wedge-50": "Wedging : 10 balles à 50 m, 6 à moins de 4 m",
    "fers-cible": "Fers : 10 balles, 6 à moins de 8 m de la cible", "auto-birdie": "Faire au moins un birdie",
    "auto-double": "Partie sans double bogey", "auto-gir": "2 greens sur 3 en régulation", "auto-par": "Finir une partie sous le par",
  };
  // Défis de départ
  const DEFIS_DE_DEPART = ["putt-3m", "putt-lag", "up-down", "wedge-50", "auto-birdie", "auto-3putts"];
  function defiDuCatalogue(ref) {
    const c = CATALOGUE_DEFIS.find((x) => x.ref === ref);
    return c ? { id: c.ref, ...c } : null;
  }

  // Conditions des défis « auto », vérifiées sur une partie terminée (parcours.js).
  // complete = tous les trous ont un score. Les seuils s'adaptent au nombre de trous (18 ou 9).
  const nb = (v) => Number.isFinite(v);
  const ecartPartie = (trous) => trous.reduce((s, t) => s + t.score - t.par, 0);
  const TESTS_AUTO = {
    birdies: (trous) => trous.filter((t) => nb(t.score) && t.score <= t.par - 1).length >= (trous.length >= 18 ? 3 : 2),
    eagle: (trous) => trous.some((t) => nb(t.score) && t.score <= t.par - 2),
    sans3putts: (trous, complete) => complete && trous.every((t) => nb(t.putts) && t.putts < 3),
    peuDeBogeys: (trous, complete) => complete && trous.every((t) => t.score <= t.par + 1) &&
      trous.filter((t) => t.score > t.par).length <= (trous.length >= 18 ? 2 : 1),
    sansPenalite: (trous, complete) => complete && trous.every((t) => !t.penalites),
    gir14: (trous, complete) => complete && trous.every((t) => nb(t.putts)) &&
      trous.filter((t) => t.score - t.putts <= t.par - 2).length * 9 >= trous.length * 7,
    sousLePar: (trous, complete) => complete && ecartPartie(trous) < 0,
    moins3: (trous, complete) => complete && ecartPartie(trous) <= (trous.length >= 18 ? -3 : -2),
    // Anciens tests (défis d'avant v38 modifiés par le joueur)
    birdie: (trous) => trous.some((t) => nb(t.score) && t.score <= t.par - 1),
    sansDouble: (trous, complete) => complete && trous.every((t) => t.score <= t.par + 1),
    gir: (trous, complete) => complete && trous.every((t) => nb(t.putts)) &&
      trous.filter((t) => t.score - t.putts <= t.par - 2).length * 3 >= trous.length * 2,
  };
  function defiReussiSurPartie(defi, partie) {
    const trous = Array.isArray(partie.trous) ? partie.trous.filter((t) => t && nb(t.par)) : [];
    if (!trous.length || !TESTS_AUTO[defi.auto]) return false;
    return TESTS_AUTO[defi.auto](trous, trous.every((t) => nb(t.score)));
  }

  let etat = null;      // chargé au démarrage (DOMContentLoaded)
  let pret = false;

  // --- Dates (heure locale) ---
  function cleJour(d = new Date()) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dateDe(cle) {
    const [a, m, j] = cle.split("-").map(Number);
    return new Date(a, m - 1, j, 12);
  }
  function decaler(cle, n) {
    const d = dateDe(cle);
    d.setDate(d.getDate() + n);
    return cleJour(d);
  }
  function joursEntre(a, b) { return Math.round((dateDe(b) - dateDe(a)) / 864e5); }
  function esc(t) {
    return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const $ = (s) => document.querySelector(s);

  // --- Sauvegarde (lireStockage / ecrireStockage d'app.js ont déjà le try/catch) ---
  function etatInitial() {
    return {
      version: 1,
      debut: cleJour(),
      pieces: 20,           // de quoi poser ses premières cases
      totalFaits: 0,        // nombre total d'actions récompensées
      son: true,
      habitudes: DEFIS_DE_DEPART.map(defiDuCatalogue),   // = les défis golf actifs
      journal: {},          // { "AAAA-MM-JJ": { cle: { g: gain, l: libellé, i: icône } } }
      carte: {},            // { "x,y": typeElement }
      parcelles: parcellesDeDepart(),   // ["px,py", …] : parcelles de 5 x 5 cases achetées
      ordreGreens: [],      // cases de green dans l'ordre de pose (trou 1 = le green posé en premier)
      nomGolf: "",          // nom du parcours publié en ligne
      joues: {},            // { idParcours: "AAAA-MM-JJ" } : dernière partie officielle (1 par jour)
      resultatsVirtuels: [],   // 30 dernières parties de mon golfeur { d, nom, score, par }
    };
  }
  // Parcelles de départ : 4 x 4 parcelles de 5 x 5 cases = le terrain 20 x 20 d'origine
  function parcellesDeDepart(cote = 4) {
    const liste = [];
    for (let py = 0; py < cote; py++) for (let px = 0; px < cote; px++) liste.push(px + "," + py);
    return liste;
  }
  function lireParcelles(d) {
    if (Array.isArray(d.parcelles)) {
      const ok = d.parcelles.filter((p) => typeof p === "string" && /^-?\d+,-?\d+$/.test(p) &&
        p.split(",").every((v) => Number(v) >= -8 && Number(v) <= 11));
      if (ok.length) return [...new Set(ok)];
    }
    // Ancienne version (terrain carré « taille ») : on la convertit en parcelles
    if ([20, 30, 40, 50].includes(d.taille)) return parcellesDeDepart(d.taille / 5);
    return parcellesDeDepart();
  }
  function chargerEtat() {
    const d = lireStockage("etat", null, PREFIXE_TYCOON);
    const base = etatInitial();
    if (!d || typeof d !== "object") return base;
    const e = {
      version: 1,
      debut: typeof d.debut === "string" && /^\d{4}-\d\d-\d\d$/.test(d.debut) ? d.debut : base.debut,
      pieces: Number.isFinite(d.pieces) ? Math.max(0, Math.floor(d.pieces)) : base.pieces,
      totalFaits: Number.isFinite(d.totalFaits) ? Math.max(0, Math.floor(d.totalFaits)) : 0,
      son: d.son !== false,
      habitudes: Array.isArray(d.habitudes) ? d.habitudes.filter((h) => h && h.id && h.nom) : base.habitudes,
      journal: d.journal && typeof d.journal === "object" ? d.journal : {},
      carte: {},
      parcelles: lireParcelles(d),
      ordreGreens: Array.isArray(d.ordreGreens) ? d.ordreGreens.filter((k) => typeof k === "string") : [],
      nomGolf: typeof d.nomGolf === "string" ? d.nomGolf.slice(0, 40) : "",
      joues: d.joues && typeof d.joues === "object" && !Array.isArray(d.joues) ? d.joues : {},
      resultatsVirtuels: Array.isArray(d.resultatsVirtuels) ? d.resultatsVirtuels.slice(-30) : [],
    };
    // Anciennes habitudes de départ (boire, dormir) jamais modifiées : remplacées par les défis golf
    const anciennes = ["Boire 2 L d'eau", "Dormir 8 h"];
    if (e.habitudes.length && e.habitudes.every((h) => anciennes.includes(h.nom))) e.habitudes = base.habitudes;
    // Défis d'avant v38 jamais modifiés : on prend la nouvelle version (plus dure)
    e.habitudes = e.habitudes.map((h) => (ANCIENS_DEFIS[h.id] === h.nom && defiDuCatalogue(h.id)) || h);
    if (d.carte && typeof d.carte === "object") {
      for (const [cle, type] of Object.entries(d.carte)) if (ELEMENTS[type]) e.carte[cle] = type;
      // Cases du grand club-house (2 x 2) : "@x,y" renvoie vers la case principale
      for (const [cle, type] of Object.entries(d.carte)) {
        if (typeof type === "string" && type.startsWith("@") && TAILLES[e.carte[type.slice(1)]]) e.carte[cle] = type;
      }
    }
    // Ordre des greens : on garde ceux qui existent, on ajoute ceux qui manquent
    e.ordreGreens = [...new Set(e.ordreGreens)].filter((k) => e.carte[k] === "green");
    for (const [cle, type] of Object.entries(e.carte)) if (type === "green" && !e.ordreGreens.includes(cle)) e.ordreGreens.push(cle);
    return e;
  }
  function sauvegarder() {
    if (!ecrireStockage("etat", etat, PREFIXE_TYCOON)) toast("⚠️ Sauvegarde impossible (navigation privée ?)");
  }

  // --- Calculs ---
  function nbJour(cle) { return Object.keys(etat.journal[cle] || {}).length; }
  function niveau() { return Math.floor(etat.totalFaits / PALIER_NIVEAU) + 1; }

  // Jours de série 🔥 AVANT aujourd'hui (la série du site : 3 exos cochés = jour gagné)
  function joursSerieAvant() {
    if (typeof calculerSerie !== "function") return 0;
    const s = calculerSerie();
    return Math.max(0, s.actuelle - (s.aujourdhuiValide ? 1 : 0));
  }
  function bonusSerie() { return Math.min(joursSerieAvant() * BONUS_PAR_JOUR, BONUS_MAX); }
  function avecBonus(base, bonus = bonusSerie()) { return Math.round(base * (1 + bonus / 100)); }

  // Gazon jauni : aucune pièce gagnée hier ni aujourd'hui (jamais le premier jour)
  function gazonJaune() {
    const auj = cleJour();
    if (nbJour(auj) > 0 || etat.debut >= auj) return false;
    return nbJour(decaler(auj, -1)) === 0;
  }

  // Noms lisibles des actions récompensées
  function titreFiche(id) {
    const f = typeof toutesLesFiches !== "undefined" ? toutesLesFiches.find((x) => x.id === id) : null;
    return f ? f.titre : "Exo du jour";
  }
  function titreMental(id) {
    const e = typeof mentalDonnees === "function" ? mentalDonnees().exercices.find((x) => x.id === id) : null;
    return e ? e.titre : "Exercice mental";
  }

  /* =======================================================
     2. GAINS : on regarde ce qui a été fait dans l'appli
     ======================================================= */

  // Ajoute un gain s'il n'a pas déjà été donné. Renvoie le gain (0 sinon).
  function ajouterGain(date, cle, base, libelle, icone) {
    const auj = cleJour();
    if (date < etat.debut || date > auj) return 0;   // rien d'avant le début du Tycoon
    const jour = etat.journal[date] || (etat.journal[date] = {});
    if (jour[cle]) return 0;
    const g = avecBonus(base);
    jour[cle] = { g, l: libelle, i: icone };
    etat.pieces += g;
    etat.totalFaits += 1;
    return g;
  }
  // Un ✓ enlevé aujourd'hui : on reprend les pièces (si elles n'ont pas été dépensées)
  function retirerAbsents(prefixe, idsPresents) {
    const jour = etat.journal[cleJour()];
    if (!jour) return 0;
    let repris = 0;
    for (const cle of Object.keys(jour)) {
      if (!cle.startsWith(prefixe) || idsPresents.includes(cle.slice(prefixe.length))) continue;
      if (etat.pieces < jour[cle].g) continue;   // déjà dépensées : on laisse
      etat.pieces -= jour[cle].g;
      etat.totalFaits = Math.max(0, etat.totalFaits - 1);
      repris += jour[cle].g;
      delete jour[cle];
    }
    return repris;
  }

  // Appelée après un ✓, un exercice mental, une partie terminée, et à l'ouverture.
  // source = bouton d'où partent les pièces volantes (facultatif)
  // Tycoon mis de côté (TYCOON_VISIBLE = false dans app.js) : on compte les pièces
  // sans aucun effet (pas de son, de pièces volantes ni de message)
  function tycoonCache() { return typeof TYCOON_VISIBLE !== "undefined" && !TYCOON_VISIBLE; }

  function synchroniser(source) {
    if (!pret) return;
    const auj = cleJour();
    const ancienNiveau = niveau();
    const etaitJaune = gazonJaune();
    let gagne = 0;
    let repris = 0;

    // Exos d'« Aujourd'hui » cochés (liste tenue par serie.js)
    // + 🌟 PARFAIT : un jeu interactif (Trèfle 16/16…) réussi sans aucun raté
    //   aujourd'hui = la récompense de l'exo est doublée (gain en plus « parfait:id »).
    const parfaits = [];
    if (typeof faitsDuJour === "function") {
      const ids = faitsDuJour();
      for (const id of ids) {
        gagne += ajouterGain(auj, "exo:" + id, GAIN_EXO, titreFiche(id), "⛳");
        const p = tourParfaitDuJour(id);
        if (p) {
          const g = ajouterGain(auj, "parfait:" + id, GAIN_EXO, `Parfait ${p.score} : ${p.nom} (récompense ×2)`, "🌟");
          if (g) { gagne += g; parfaits.push(`${p.nom} ${p.score}`); }
        }
      }
      repris += retirerAbsents("exo:", ids);
      repris += retirerAbsents("parfait:", ids);
    }
    if (parfaits.length && !tycoonCache()) setTimeout(() => { son("niveau"); confettis(); toast("🌟 PARFAIT " + parfaits.join(" · ") + " : récompense doublée !"); }, 300);
    // Exercices mentaux faits (mental.js)
    if (typeof mentalHistorique === "function") {
      const histo = mentalHistorique();
      for (const h of histo) {
        if (h && typeof h.date === "string") gagne += ajouterGain(h.date, "mental:" + h.id, GAIN_MENTAL, titreMental(h.id), "🧠");
      }
      repris += retirerAbsents("mental:", histo.filter((h) => h && h.date === auj).map((h) => h.id));
    }
    // Parties terminées (parcours.js) — une partie supprimée garde ses pièces.
    // On vérifie aussi les défis « auto » (birdie, sans 3-putts…) sur chaque partie.
    const defisReussis = [];
    if (typeof partiesTerminees === "function") {
      for (const p of partiesTerminees()) {
        if (!p || typeof p.date !== "string") continue;
        gagne += ajouterGain(p.date, "partie:" + p.id, GAIN_PARTIE, "Partie : " + (p.parcoursNom || "parcours"), "🏌️");
        for (const d of etat.habitudes) {
          if (!d.auto || !defiReussiSurPartie(d, p)) continue;
          const g = ajouterGain(p.date, "h:" + d.id, d.recompense, d.nom, d.icone);
          if (g) { gagne += g; defisReussis.push(d.icone + " " + d.nom); }
        }
      }
    }
    if (defisReussis.length && !tycoonCache()) setTimeout(() => toast("🏆 Défi réussi : " + defisReussis.join(" · ")), 400);
    if (etat.journal[auj] && !Object.keys(etat.journal[auj]).length) delete etat.journal[auj];

    if (gagne || repris) sauvegarder();
    if (gagne && !tycoonCache()) celebrerGain(source, gagne, ancienNiveau, etaitJaune);
    rafraichir(!gagne);
  }

  // Effets d'un gain : pièces volantes, son, niveau, gazon qui reverdit
  function celebrerGain(source, gain, ancienNiveau, etaitJaune) {
    son("check");
    const cible = afficherPastille(gain);
    if (source && source !== document.body && source.tagName === "BUTTON" && document.body.contains(source)) {
      texteFlottant(source, "+" + gain);
      volerPieces(source, cible, Math.min(12, 3 + Math.round(gain / 8)), () => animerPieces());
    } else {
      setTimeout(animerPieces, 300);
    }
    if (etaitJaune) setTimeout(() => { son("reverdit"); toast("🌱 Le gazon de ton parcours reverdit !"); }, 600);
    if (niveau() > ancienNiveau) setTimeout(() => montrerNiveau(niveau()), 1000);
  }

  // Tour PARFAIT aujourd'hui sur le jeu interactif de cette fiche (exos-points.js) :
  // toutes les balles réussies, aucun raté (ex. Trèfle 16/16). Renvoie {nom, score} ou null.
  function tourParfaitDuJour(idFiche) {
    if (typeof EXOS_POINTS === "undefined" || typeof toursDe !== "function") return null;
    const auj = cleJour();
    for (const [exo, config] of Object.entries(EXOS_POINTS)) {
      if (config.idFiche !== idFiche) continue;
      const t = toursDe(exo).find((x) => x.d === auj && x.total > 0 && x.rentres === x.total && x.fini !== false);
      if (t) return { nom: config.nom, score: `${t.rentres}/${t.total}` };
    }
    return null;
  }

  /* =======================================================
     3. SONS (Web Audio, générés en code)
     ======================================================= */

  let audio = null;
  function ctxAudio() {
    if (!audio) {
      try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  function note(freq, debut, duree, forme = "sine", vol = 0.15, freqFin = null) {
    const a = ctxAudio();
    if (!a) return;
    const t = a.currentTime + debut;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = forme;
    o.frequency.setValueAtTime(freq, t);
    if (freqFin) o.frequency.exponentialRampToValueAtTime(freqFin, t + duree);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + duree + 0.05);
  }
  function bruit(duree, vol) {
    const a = ctxAudio();
    if (!a) return;
    const n = Math.floor(a.sampleRate * duree);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / n);
    const s = a.createBufferSource();
    s.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 800;
    const g = a.createGain();
    g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(a.destination);
    s.start();
  }
  function son(nom, i = 0) {
    if (!etat || !etat.son) return;
    switch (nom) {
      case "check":    note(660, 0, .12, "triangle", .2); note(990, .08, .2, "triangle", .2); break;
      case "piece":    note(1300 + i * 80, 0, .08, "square", .04); note(1950 + i * 120, .03, .14, "sine", .07); break;
      case "pose":     note(170, 0, .2, "sine", .35, 55); note(600, 0, .05, "triangle", .06); bruit(.14, .25); break;
      case "retirer":  note(420, 0, .18, "sawtooth", .05, 110); bruit(.1, .12); break;
      case "erreur":   note(170, 0, .14, "square", .06); note(130, .11, .18, "square", .06); break;
      case "decoche":  note(520, 0, .14, "sine", .1, 260); break;
      case "clic":     note(880, 0, .04, "triangle", .06); break;
      case "niveau":   [523, 659, 784, 1047, 1319].forEach((f, k) => note(f, k * .1, .3, "triangle", .15)); break;
      case "reverdit": [392, 523, 659].forEach((f, k) => note(f, k * .09, .25, "sine", .12)); break;
    }
  }

  /* =======================================================
     4. EFFETS (pastille de pièces, pièces volantes, toasts, niveau)
     ======================================================= */

  // Pastille fixe en haut à droite, visible le temps d'un gain (l'en-tête n'est pas fixe)
  let minuteurPastille = null;
  function afficherPastille() {
    let p = $("#ty-pastille");
    if (!p) {
      p = document.createElement("button");
      p.type = "button";
      p.id = "ty-pastille";
      p.className = "ty-pastille";
      p.addEventListener("click", () => changerVue("tycoon"));   // app.js
      document.body.appendChild(p);
    }
    p.innerHTML = `<span class="ty-piece"></span><b>${piecesAffichees}</b>`;
    p.hidden = false;
    clearTimeout(minuteurPastille);
    minuteurPastille = setTimeout(() => { p.hidden = true; }, 2800);
    return p;
  }

  function volerPieces(depuis, vers, nb, auBout) {
    const a = depuis.getBoundingClientRect();
    const b = vers.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const x1 = b.left + 16, y1 = b.top + b.height / 2;
    let arrivees = 0;
    for (let i = 0; i < nb; i++) {
      const p = document.createElement("div");
      p.className = "ty-piece-volante";
      document.body.appendChild(p);
      const mx = x0 + (Math.random() - .5) * 120, my = y0 - 40 - Math.random() * 70;
      const anim = p.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(.4)` },
        { transform: `translate(${mx}px, ${my}px) scale(1.15)`, offset: .35 },
        { transform: `translate(${x1}px, ${y1}px) scale(.6)` },
      ], { duration: 750, delay: i * 55, easing: "cubic-bezier(.45,0,.55,1)", fill: "backwards" });
      anim.onfinish = () => {
        p.remove();
        son("piece", arrivees);
        arrivees++;
        vers.classList.remove("ty-pulse"); void vers.offsetWidth; vers.classList.add("ty-pulse");
        if (arrivees === nb && auBout) auBout();
      };
    }
  }

  // Les compteurs de pièces défilent jusqu'à la nouvelle valeur
  let piecesAffichees = 0;
  let jetonPieces = 0;
  function animerPieces() {
    const jeton = ++jetonPieces;
    const depart = piecesAffichees, fin = etat.pieces, t0 = performance.now();
    const pas = (t) => {
      if (jeton !== jetonPieces) return;
      const p = Math.min(1, (t - t0) / 450);
      piecesAffichees = Math.round(depart + (fin - depart) * p);
      document.querySelectorAll("[data-ty-pieces]").forEach((el) => { el.textContent = piecesAffichees; });
      const pastille = $("#ty-pastille b");
      if (pastille) pastille.textContent = piecesAffichees;
      if (p < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }

  function texteFlottant(depuis, texte) {
    const r = depuis.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "ty-texte-flottant";
    el.innerHTML = esc(texte) + ' <span class="ty-piece"></span>';
    el.style.left = (r.left + r.width / 2 - 24) + "px";
    el.style.top = (r.top - 6) + "px";
    document.body.appendChild(el);
    el.animate([
      { transform: "translateY(0) scale(.6)", opacity: 0 },
      { transform: "translateY(-14px) scale(1.15)", opacity: 1, offset: .25 },
      { transform: "translateY(-50px) scale(1)", opacity: 0 },
    ], { duration: 1000, easing: "ease-out" }).onfinish = () => el.remove();
  }

  let minuteurToast = null;
  function toast(msg) {
    let t = $("#ty-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "ty-toast";
      t.className = "ty-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => t.classList.remove("visible"), 2600);
  }

  function secouer(el) {
    if (!el) return;
    el.classList.remove("ty-secoue"); void el.offsetWidth; el.classList.add("ty-secoue");
  }

  function confettis() {
    const couleurs = ["#f5b919", "#2f9e5b", "#e0533f", "#4aaef0", "#ffffff", "#86e06a"];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement("div");
      c.className = "ty-confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = couleurs[i % couleurs.length];
      document.body.appendChild(c);
      const dx = (Math.random() - .5) * 200;
      c.animate([
        { transform: "translate(0,0) rotate(0)" },
        { transform: `translate(${dx}px, ${window.innerHeight + 40}px) rotate(${Math.random() * 900}deg)` },
      ], { duration: 1600 + Math.random() * 1400, delay: Math.random() * 300, easing: "cubic-bezier(.2,.6,.4,1)" })
        .onfinish = () => c.remove();
    }
  }

  function montrerNiveau(n) {
    son("niveau");
    confettis();
    const debloques = Object.values(ELEMENTS).filter((e) => e.niveau === n).map((e) => e.nom);
    const pop = document.createElement("div");
    pop.className = "ty-niveau-pop";
    pop.innerHTML = `<div><div class="ty-grand">🏆</div><h3>Niveau ${n} !</h3>
      <p>${debloques.length ? "Débloqué dans la boutique : <b>" + debloques.map(esc).join(", ") + "</b>" : "Continue comme ça !"}</p>
      <button type="button" class="bouton principal">Super !</button></div>`;
    pop.addEventListener("click", () => pop.remove());
    document.body.appendChild(pop);
    rafraichir(false);
  }

  /* =======================================================
     5. RENDU DE LA CARTE ISOMÉTRIQUE (Canvas)
     ======================================================= */

  const TW = 64, TH = 32;     // taille d'une case (losange), en unités « monde »
  const OX = 640, OY = 90;    // position « monde » du coin haut de la case (0,0)
  const EPAIS = 16;           // épaisseur du socle de terre

  /* ---------- Terrain en PARCELLES ----------
     Le terrain est fait de parcelles de 5 x 5 cases (au départ 4 x 4 parcelles = 20 x 20).
     On achète d'autres parcelles collées au terrain, dans la direction qu'on veut
     (de quoi faire un 18 trous). Les cases peuvent avoir des coordonnées négatives. */
  const PARCELLE = 5;
  const PARCELLE_MIN = -8, PARCELLE_MAX = 11;   // limite du monde : 20 x 20 parcelles = 100 x 100 cases
  const PARCELLES_DEPART = 16;
  // Prix d'une parcelle : 50 pièces, +5 à chaque achat (au plus 300)
  function prixParcelle() { return Math.min(300, 50 + 5 * Math.max(0, etat.parcelles.length - PARCELLES_DEPART)); }
  let parcellesPossedees = new Set();
  const bornes = { minX: 0, maxX: 19, minY: 0, maxY: 19 };   // cases extrêmes possédées
  function majTerrain() {
    parcellesPossedees = new Set(etat.parcelles);
    const pts = etat.parcelles.map((p) => p.split(",").map(Number));
    bornes.minX = Math.min(...pts.map((p) => p[0])) * PARCELLE;
    bornes.maxX = (Math.max(...pts.map((p) => p[0])) + 1) * PARCELLE - 1;
    bornes.minY = Math.min(...pts.map((p) => p[1])) * PARCELLE;
    bornes.maxY = (Math.max(...pts.map((p) => p[1])) + 1) * PARCELLE - 1;
  }
  function parcelleDe(x, y) { return Math.floor(x / PARCELLE) + "," + Math.floor(y / PARCELLE); }
  function possedee(x, y) { return parcellesPossedees.has(parcelleDe(x, y)); }
  // Parcelles qu'on peut acheter : collées (par un côté) à une parcelle possédée
  function parcellesAchetables() {
    const res = new Set();
    for (const p of parcellesPossedees) {
      const [px, py] = p.split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const qx = px + dx, qy = py + dy, q = qx + "," + qy;
        if (qx < PARCELLE_MIN || qx > PARCELLE_MAX || qy < PARCELLE_MIN || qy > PARCELLE_MAX) continue;
        if (!parcellesPossedees.has(q)) res.add(q);
      }
    }
    return res;
  }
  // Cadre « monde » du terrain (+ marge en cases), pour la caméra
  function cadreMonde(marge = 0) {
    const x0 = bornes.minX - marge, x1 = bornes.maxX + 1 + marge, y0 = bornes.minY - marge, y1 = bornes.maxY + 1 + marge;
    return {
      gauche: OX + (x0 - y1) * TW / 2, droite: OX + (x1 - y0) * TW / 2,
      haut: OY + (x0 + y0) * TH / 2 - 60, bas: OY + (x1 + y1) * TH / 2 + EPAIS,
    };
  }

  let canvas = null, ctx = null;
  const vue = { z: 1, x: 0, y: 0, l: 0, h: 0, dpr: 1, pret: false };
  let outil = null;           // null | "retirer" | type d'élément
  let survol = null;
  let animations = [];
  let particules = [];
  let besoinRendu = true;
  let fj = 0, fjCible = 0, fjDessin = 0;   // facteur « jaune » (0 = vert, 1 = jaune)
  let boucleActive = false;

  function coinCase(x, y) { return { sx: OX + (x - y) * TW / 2, sy: OY + (x + y) * TH / 2 }; }
  function caseDepuisMonde(wx, wy) {
    const px = wx - OX, py = wy - OY;
    return {
      x: Math.floor((px / (TW / 2) + py / (TH / 2)) / 2),
      y: Math.floor((py / (TH / 2) - px / (TW / 2)) / 2),
    };
  }

  const cacheHex = new Map();
  function hexVersRgb(c) {
    if (!cacheHex.has(c)) {
      const n = parseInt(c.slice(1), 16);
      cacheHex.set(c, [n >> 16 & 255, n >> 8 & 255, n & 255]);
    }
    return cacheHex.get(c);
  }
  // Couleur d'herbe : mélange vert -> jaune selon fjDessin
  function herbe(vert, jaune) {
    if (fjDessin <= 0) return vert;
    const A = hexVersRgb(vert), B = hexVersRgb(jaune);
    return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * fjDessin)).join(",") + ")";
  }

  // --- Primitives ---
  function poly(c, pts, couleur) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    c.fillStyle = couleur;
    c.fill();
  }
  function losange(c, sx, sy, k, couleur, contour) {
    const cy = sy + TH / 2, w = TW / 2 * k, h = TH / 2 * k;
    c.beginPath();
    c.moveTo(sx, cy - h); c.lineTo(sx + w, cy); c.lineTo(sx, cy + h); c.lineTo(sx - w, cy);
    c.closePath();
    if (couleur) { c.fillStyle = couleur; c.fill(); }
    if (contour) { c.strokeStyle = contour; c.lineWidth = 1; c.stroke(); }
  }
  function pt(sx, sy, u, v) { return [sx + (u - v) * TW / 2, sy + (u + v) * TH / 2]; }
  function ovale(c, x, y, rx, ry, couleur) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = couleur;
    c.fill();
  }
  function rond(c, x, y, r, couleur) { ovale(c, x, y, r, r, couleur); }
  // Boîte isométrique (X, Y = centre au sol ; a, b = demi-diagonales ; h = hauteur)
  function boite(c, X, Y, a, b, h, dessus, gauche, droite) {
    poly(c, [[X - a, Y], [X, Y + b], [X, Y + b - h], [X - a, Y - h]], gauche);
    poly(c, [[X, Y + b], [X + a, Y], [X + a, Y - h], [X, Y + b - h]], droite);
    if (dessus) poly(c, [[X, Y - b - h], [X + a, Y - h], [X, Y + b - h], [X - a, Y - h]], dessus);
  }
  function surFaceG(c, X, Y, a, b, h, s1, s2, t1, t2, couleur) {
    const P = (s, t) => [X - a + s * a, Y + s * b - t * h];
    poly(c, [P(s1, t1), P(s2, t1), P(s2, t2), P(s1, t2)], couleur);
  }
  function surFaceD(c, X, Y, a, b, h, s1, s2, t1, t2, couleur) {
    const P = (s, t) => [X + s * a, Y + b - s * b - t * h];
    poly(c, [P(s1, t1), P(s2, t1), P(s2, t2), P(s1, t2)], couleur);
  }

  // --- Sol d'une case ---
  function dessinerHerbe(c, sx, sy, x, y) {
    const pair = (x + y) % 2 === 0;
    losange(c, sx, sy, 1, pair ? herbe("#8fd16a", "#ddd27a") : herbe("#84c860", "#d2c66c"));
  }
  function dessinerSol(c, type, sx, sy, x, y) {
    const X = sx, Y = sy + TH / 2;
    switch (type) {
      case "gazon":
        losange(c, sx, sy, 1, herbe("#4cae3a", "#c2b046"));
        losange(c, sx, sy, .62, herbe("#5cc246", "#cdbb52"));
        break;
      case "fairway":
        losange(c, sx, sy, 1, herbe("#6fcf55", "#cfc25c"));
        for (let i = 0; i < 4; i += 2) {   // bandes de tonte
          poly(c, [pt(sx, sy, i / 4, 0), pt(sx, sy, (i + 1) / 4, 0), pt(sx, sy, (i + 1) / 4, 1), pt(sx, sy, i / 4, 1)], herbe("#88e26c", "#ddd172"));
        }
        break;
      case "bunker":
        dessinerHerbe(c, sx, sy, x, y);
        ovale(c, X, Y + 1, TW * .33, TH * .33, "#d6b866");
        ovale(c, X, Y, TW * .3, TH * .29, "#f3dd9e");
        ovale(c, X - 5, Y - 2, TW * .12, TH * .1, "#fbedc4");
        break;
      case "lac":
        losange(c, sx, sy, 1, "#2d86cf");
        losange(c, sx, sy, .84, "#4aaef0");
        c.strokeStyle = "rgba(255,255,255,.7)";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(X - 12, Y - 2); c.quadraticCurveTo(X - 8, Y - 5, X - 4, Y - 2);
        c.moveTo(X + 3, Y + 4); c.quadraticCurveTo(X + 7, Y + 1, X + 11, Y + 4);
        c.stroke();
        break;
      case "green": {
        // Le green se dessine dans le repère de la case (u, v de 0 à 1) : un rond au centre,
        // prolongé jusqu'au bord vers chaque green voisin => des greens collés n'en font qu'un.
        dessinerHerbe(c, sx, sy, x, y);
        surfaceGreen(c, sx, sy, (dx, dy) => greensFusionnes && etat.carte[(x + dx) + "," + (y + dy)] === "green");
        break;
      }
      case "depart": {   // zone de départ : herbe rase + 2 boules de départ
        losange(c, sx, sy, 1, herbe("#4fb83c", "#c4b44a"));
        poly(c, [pt(sx, sy, .18, .22), pt(sx, sy, .82, .22), pt(sx, sy, .82, .78), pt(sx, sy, .18, .78)], herbe("#73d65a", "#d6ca66"));
        const [ax, ay] = pt(sx, sy, .3, .3), [bx, by] = pt(sx, sy, .3, .7);
        rond(c, ax, ay, 2.3, "#e8433a"); rond(c, bx, by, 2.3, "#e8433a");
        rond(c, ...pt(sx, sy, .45, .5), 1.4, "#ffffff");
        break;
      }
      case "terrasse":   // dalles de pierre sous le grand club-house
        losange(c, sx, sy, 1, "#d8ccb4");
        losange(c, sx, sy, .9, "#e4dac6");
        c.strokeStyle = "rgba(120,95,60,.25)";
        c.lineWidth = .8;
        c.beginPath();
        c.moveTo(...pt(sx, sy, .5, 0)); c.lineTo(...pt(sx, sy, .5, 1));
        c.moveTo(...pt(sx, sy, 0, .5)); c.lineTo(...pt(sx, sy, 1, .5));
        c.stroke();
        break;
      default:
        dessinerHerbe(c, sx, sy, x, y);
    }
  }

  // Surface d'un green dans la case (sx, sy) ; g(dx, dy) = true si la case voisine
  // fait partie du même green (la surface se prolonge alors jusqu'à elle).
  function surfaceGreen(c, sx, sy, g) {
    c.save();
    c.translate(sx, sy);
    c.transform(TW / 2, TH / 2, -TW / 2, TH / 2, 0, 0);   // (u, v) -> losange de la case
    for (const [r, coul] of [[.5, herbe("#3fb85a", "#bdb04a")], [.42, herbe("#66e57f", "#d9d070")]]) {
      c.fillStyle = coul;
      c.beginPath(); c.arc(.5, .5, r, 0, Math.PI * 2); c.fill();
      // e = petit débord sur la case voisine pour qu'aucune ligne ne se voie à la jointure
      const a = .5 - r, l = 2 * r, e = .03;
      if (g(1, 0)) c.fillRect(.5, a, .5 + e, l);
      if (g(-1, 0)) c.fillRect(-e, a, .5 + e, l);
      if (g(0, 1)) c.fillRect(a, .5, l, .5 + e);
      if (g(0, -1)) c.fillRect(a, -e, l, .5 + e);
      // Coin rempli quand les 3 cases autour du coin sont aussi du green
      if (g(1, 0) && g(0, 1) && g(1, 1)) c.fillRect(.5, .5, .5 + e, .5 + e);
      if (g(-1, 0) && g(0, 1) && g(-1, 1)) c.fillRect(-e, .5, .5 + e, .5 + e);
      if (g(1, 0) && g(0, -1) && g(1, -1)) c.fillRect(.5, -e, .5 + e, .5 + e);
      if (g(-1, 0) && g(0, -1) && g(-1, -1)) c.fillRect(-e, -e, .5 + e, .5 + e);
    }
    c.restore();
  }

  /* ---------- Grands éléments sur plusieurs cases ----------
     Club-house 2 x 2, putting green 2 x 2, practice 4 x 2 (4 cases dans le sens x).
     La case du fond (« ancre ») contient le type, les autres contiennent
     "@x,y" (un renvoi vers l'ancre). TAILLES = [cases en x, cases en y]. */
  const TAILLES = { clubhouse: [2, 2], puttinggreen: [2, 2], practice: [4, 2] };
  function casesDe(type, x, y) {
    const [w, h] = TAILLES[type] || [1, 1];
    const liste = [];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) liste.push([x + i, y + j]);
    return liste;   // la première case est l'ancre
  }
  function estGrand(type, x, y) {
    return !!TAILLES[type] && etat.carte[x + "," + y] === type &&
      casesDe(type, x, y).slice(1).every(([a, b]) => etat.carte[a + "," + b] === "@" + x + "," + y);
  }
  // Type réel d'une case (une case « renvoi » donne le type de son ancre)
  function typeDe(cle) {
    const v = etat.carte[cle];
    if (!v) return null;
    return v.startsWith("@") ? etat.carte[v.slice(1)] || null : v;
  }
  function ancreDe(cle) {
    const v = etat.carte[cle];
    return v && v.startsWith("@") ? v.slice(1) : cle;
  }
  // Case ancre quand on touche (x, y) pour poser un grand élément : on cherche une
  // position qui contient la case touchée, sur le terrain, et si possible libre.
  function ancrePose(type, x, y) {
    const [w, h] = TAILLES[type] || [1, 1];
    let repli = null;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const a = { x: x - i, y: y - j };
      const cases = casesDe(type, a.x, a.y);
      if (!cases.every(([p, q]) => possedee(p, q))) continue;
      if (cases.every(([p, q]) => !etat.carte[p + "," + q] || etat.carte[p + "," + q] === "gazon")) return a;
      if (!repli) repli = a;
    }
    return repli || { x, y };
  }

  /* ---------- 3 trous tout prêts (par 3, par 4, par 5) ----------
     Toujours les mêmes plans. Une fois posés, ce sont des cases normales :
     on peut tout modifier (✏️ Modifier, 🧹 Retirer, poser par-dessus le gazon).
     Plans : une ligne = une rangée de cases (largeur), un caractère = une case (longueur).
     T départ · F fairway · G green · B bunker · L lac · A arbre · . gazon (rough) */
  const KITS_TROUS = {
    par3: { nom: "Trou par 3", icone: "3", prix: 250, niveau: 3, plan: [
      "A..A.A.A",
      "....LBGG",
      "TT..LGGG",
      "....LBGG",
      "A..A...A",
    ] },
    par4: { nom: "Trou par 4", icone: "4", prix: 400, niveau: 4, plan: [
      "A..A...A...A.",
      "......FFFB.GG",
      "TT.FFFFFFFFGG",
      "...FFFFB...BG",
      ".A....A..A...",
    ] },
    par5: { nom: "Trou par 5", icone: "5", prix: 550, niveau: 5, plan: [
      "A..A..A....A..A..A",
      "......FFF.LL..FFGG",
      "TT..FFFFFFLLFFFFGG",
      "....FFFFB.LLFFFBGG",
      ".......B..LL...B..",
      "A...A...A....A...A",
    ] },
  };
  const LEGENDE_KIT = { T: "depart", F: "fairway", G: "green", B: "bunker", L: "lac", A: "arbre", ".": "gazon" };
  let rotationKit = 0;   // 0 à 3 : quart de tour du trou avant de le poser
  // Cases d'un trou posé avec son centre en (cx, cy) : [[x, y, type], …]
  function casesKit(id, cx, cy, rot = rotationKit) {
    const plan = KITS_TROUS[id].plan;
    const h = plan.length, w = plan[0].length;
    const [W, H] = rot % 2 ? [h, w] : [w, h];
    const x0 = cx - Math.floor(W / 2), y0 = cy - Math.floor(H / 2);
    const res = [];
    for (let v = 0; v < h; v++) {
      for (let u = 0; u < w; u++) {
        const type = LEGENDE_KIT[plan[v][u]];
        if (!type) continue;
        let i, j;
        if (rot === 0) { i = u; j = v; } else if (rot === 1) { i = h - 1 - v; j = u; }
        else if (rot === 2) { i = w - 1 - u; j = h - 1 - v; } else { i = v; j = w - 1 - u; }
        res.push([x0 + i, y0 + j, type]);
      }
    }
    return res;
  }
  // Problèmes pour poser un trou : cases hors du terrain, cases déjà prises (le gazon ne gêne pas)
  function conflitsKit(cases) {
    const horsTerrain = cases.filter(([x, y]) => !possedee(x, y)).length;
    const prises = cases.filter(([x, y, t]) => t !== "gazon" && etat.carte[x + "," + y] && etat.carte[x + "," + y] !== "gazon").length;
    return { horsTerrain, prises };
  }
  // Nom / prix / niveau d'un outil (élément, trou tout prêt…)
  function infoOutil(o) {
    if (ELEMENTS[o]) return ELEMENTS[o];
    if (o && o.startsWith("kit:")) return KITS_TROUS[o.slice(4)];
    return null;
  }

  // Sol d'une case (i, j) d'un grand élément
  function dessinerSolGrand(c, type, sx, sy, i, j, x, y) {
    const [w, h] = TAILLES[type];
    const dedans = (dx, dy) => i + dx >= 0 && i + dx < w && j + dy >= 0 && j + dy < h;
    if (type === "clubhouse") {
      dessinerSol(c, "terrasse", sx, sy, x, y);
    } else if (type === "puttinggreen") {
      dessinerHerbe(c, sx, sy, x, y);
      surfaceGreen(c, sx, sy, dedans);
    } else if (type === "practice") {
      if (i === 0) {
        // Zone de frappe : gazon ras clair
        losange(c, sx, sy, 1, herbe("#9fd77f", "#d8cf7a"));
      } else {
        // Zone de réception : herbe tondue en bandes
        losange(c, sx, sy, 1, herbe(i % 2 ? "#79cf5c" : "#86d968", "#cfc25c"));
        poly(c, [pt(sx, sy, .5, 0), pt(sx, sy, 1, 0), pt(sx, sy, 1, 1), pt(sx, sy, .5, 1)], herbe("#8fdf72", "#d9cd6c"));
      }
    }
  }

  // Parties en hauteur d'un grand élément, dessinées quand on arrive à la case (i, j).
  // P(u, v) = point écran du coin (u, v) de l'élément (u de 0 à w, v de 0 à h).
  function dessinerPartieGrand(c, type, P, i, j, dy = 0) {
    if (type === "clubhouse" && i === 1 && j === 1) { const [X, Y] = P(1, 1); dessinerGrandClubHouse(c, X, Y, dy); }
    if (type === "puttinggreen" && i === 1 && j === 1) dessinerPuttingGreen(c, P, dy);
    if (type === "practice") {
      if (i === 0 && j === 1) dessinerAbriPractice(c, P, dy);
      if (i === 3 && j === 1) dessinerZonePractice(c, P, dy);
    }
  }

  // Élément complet (aperçu sous la souris, boutique)
  function dessinerGrandComplet(c, type, P) {
    const [w, h] = TAILLES[type];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const [sx, sy] = P(i, j);
      dessinerSolGrand(c, type, sx, sy, i, j, i, j);
    }
    for (let s = 0; s <= w + h - 2; s++) {
      for (let i = 0; i < w; i++) { const j = s - i; if (j >= 0 && j < h) dessinerPartieGrand(c, type, P, i, j, 0); }
    }
  }

  // Boîte posée sur le sol entre (u0, v0) et (u1, v1), de hauteur h, qui commence à la hauteur z0
  function boiteUV(c, P, u0, u1, v0, v1, h, z0, dessus, gauche, droite) {
    const up = ([x, y], z) => [x, y - z];
    const B = P(u0, v0), R = P(u1, v0), F = P(u1, v1), L = P(u0, v1);
    poly(c, [up(L, z0), up(F, z0), up(F, z0 + h), up(L, z0 + h)], gauche);
    poly(c, [up(F, z0), up(R, z0), up(R, z0 + h), up(F, z0 + h)], droite);
    if (dessus) poly(c, [up(B, z0 + h), up(R, z0 + h), up(F, z0 + h), up(L, z0 + h)], dessus);
  }
  // Petit drapeau (putting green, cibles du practice)
  function petitDrapeau(c, X, Y, haut, couleur) {
    ovale(c, X, Y + .5, 2.2, 1.1, "#1d2b22");
    c.strokeStyle = "#f4f4f4"; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(X, Y); c.lineTo(X, Y - haut); c.stroke();
    poly(c, [[X, Y - haut], [X + 7, Y - haut + 2.5], [X, Y - haut + 5]], couleur);
  }

  /* ---------- Putting green 2 x 2 : plusieurs trous avec petits drapeaux ---------- */
  function dessinerPuttingGreen(c, P, dy = 0) {
    c.save(); c.translate(0, dy);
    // Balles d'entraînement
    for (const [u, v] of [[.8, .75], [.92, .88], [1.3, .62], [1.62, 1.18], [1.2, 1.58], [.42, 1.1], [1.08, 1.27], [.7, 1.2]]) {
      const [x, y] = P(u, v); rond(c, x, y, 1.6, "#ffffff");
    }
    // 5 trous, dessinés de l'arrière vers l'avant
    const trous = [[.55, .6, "#ffd23f"], [1.45, .45, "#ffffff"], [1.0, 1.0, "#ff8c1a"], [.6, 1.45, "#e8433a"], [1.5, 1.4, "#2f6fd6"]];
    for (const [u, v, coul] of trous.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]))) {
      const [x, y] = P(u, v); petitDrapeau(c, x, y, 16, coul);
    }
    // Panneau « PUTTING » devant à gauche
    const [px, py] = P(.12, 1.9);
    c.strokeStyle = "#6b5a45"; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(px, py); c.lineTo(px, py - 10); c.stroke();
    c.fillStyle = "#1f5a3e"; c.fillRect(px - 13, py - 17, 26, 8);
    c.fillStyle = "#f2c94c"; c.font = "bold 5.2px system-ui, sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("PUTTING", px, py - 12.8);
    c.restore();
  }

  /* ---------- Practice 4 x 2 : abri de frappe + zone de réception avec cibles ---------- */
  function dessinerAbriPractice(c, P, dy = 0) {
    // Tapis de frappe et paniers de balles, devant l'abri (au sol)
    for (const [v0, v1] of [[.12, .42], [.58, .88], [1.12, 1.42], [1.58, 1.88]]) {
      poly(c, [P(.66, v0), P(.92, v0), P(.92, v1), P(.66, v1)], "#2f7d4a");
      const [bx, by] = P(.72, (v0 + v1) / 2);
      rond(c, bx, by, 1.5, "#ffffff"); rond(c, bx + 2.5, by - 1, 1.5, "#ffffff"); rond(c, bx + 1, by + 1.5, 1.5, "#ffffff");
    }
    c.save(); c.translate(0, dy);
    // Abri : mur du fond fermé, ouvert côté zone de réception
    boiteUV(c, P, .08, .6, .04, 1.96, 18, 0, null, "#efe4cb", "#4b3d2c");
    // Poteaux blancs entre les postes
    for (const v of [.04, .5, 1, 1.5, 1.96]) {
      const [x, y] = P(.6, v);
      c.strokeStyle = "#ffffff"; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 18); c.stroke();
    }
    // Toit vert qui dépasse un peu
    boiteUV(c, P, 0, .72, -.06, 2.06, 4, 18, "#3fb070", "#2f8f58", "#257447");
    // Enseigne « PRACTICE » sur le bord du toit (inclinée comme lui)
    c.save();
    const [ox, oy] = P(.72, 1.78);
    c.transform(1, -.5, 0, 1, ox, oy - 20);
    c.fillStyle = "#ffffff"; c.font = "bold 4.6px system-ui, sans-serif";
    c.textAlign = "left"; c.textBaseline = "middle";
    c.fillText("PRACTICE", 4, 0);
    c.restore();
    c.restore();
  }
  function dessinerZonePractice(c, P, dy = 0) {
    c.save(); c.translate(0, dy);
    // Balles éparpillées sur la zone de réception
    for (let k = 0; k < 26; k++) {
      const u = 1.1 + ((k * 37) % 29) / 29 * 2.8, v = .12 + ((k * 53) % 31) / 31 * 1.76;
      const [x, y] = P(u, v); rond(c, x, y, 1.3, "#ffffff");
    }
    // 3 cibles (petits greens ronds) avec drapeau et distance
    for (const [u, v, coul, dist] of [[1.9, .6, "#e8433a", "50"], [2.75, 1.35, "#ffd23f", "100"], [3.5, .7, "#ffffff", "150"]]) {
      const [o] = [P(0, 0)];
      c.save();
      c.translate(o[0], o[1]);
      c.transform(TW / 2, TH / 2, -TW / 2, TH / 2, 0, 0);
      c.fillStyle = herbe("#3fb85a", "#bdb04a"); c.beginPath(); c.arc(u, v, .34, 0, Math.PI * 2); c.fill();
      c.fillStyle = herbe("#66e57f", "#d9d070"); c.beginPath(); c.arc(u, v, .28, 0, Math.PI * 2); c.fill();
      c.restore();
      const [x, y] = P(u, v);
      petitDrapeau(c, x, y, 17, coul);
      // Panneau de distance
      c.fillStyle = "#ffffff"; c.fillRect(x - 17, y - 9, 11, 6.5);
      c.fillStyle = "#1f3436"; c.font = "bold 4.6px system-ui, sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(dist, x - 11.5, y - 5.6);
    }
    c.restore();
  }

  // X, Y = centre des 4 cases ; dy = décalage pendant la chute
  function dessinerGrandClubHouse(c, X, Y, dy = 0) {
    const k = Math.max(.3, 1 + dy / 200);
    ovale(c, X + 10, Y - 10, 44 * k, 18 * k, "rgba(0,0,0,.12)");   // ombre derrière le bâtiment
    c.save(); c.translate(0, dy);

    // --- Bâtiment : soubassement en pierre + murs crème ---
    const BX = X, BY = Y - 8, a = 40, b = 20;
    boite(c, BX, BY, a, b, 5, null, "#c9b896", "#a99776");
    const MY = BY - 5, h = 24;   // murs
    boite(c, BX, MY, a, b, h, null, "#fbf3e3", "#e1cfad");
    // Fenêtres face gauche (cadre blanc + vitre)
    for (const [s1, s2] of [[.07, .2], [.29, .42], [.58, .71], [.8, .93]]) {
      surFaceG(c, BX, MY, a, b, h, s1 - .015, s2 + .015, .1, .6, "#ffffff");
      surFaceG(c, BX, MY, a, b, h, s1, s2, .14, .56, "#8fd3f7");
      surFaceG(c, BX, MY, a, b, h, s1, (s1 + s2) / 2, .14, .56, "rgba(255,255,255,.35)");
    }
    // Face droite : grande porte vitrée + 2 fenêtres
    surFaceD(c, BX, MY, a, b, h, .38, .62, 0, .74, "#2b5d45");
    surFaceD(c, BX, MY, a, b, h, .41, .59, 0, .7, "#6fbbe6");
    surFaceD(c, BX, MY, a, b, h, .495, .505, 0, .7, "#2b5d45");
    for (const [s1, s2] of [[.08, .26], [.74, .92]]) {
      surFaceD(c, BX, MY, a, b, h, s1, s2, .25, .68, "#ffffff");
      surFaceD(c, BX, MY, a, b, h, s1 + .02, s2 - .02, .29, .64, "#79c3ec");
    }
    // Auvent vert au-dessus de la porte
    const P = (s, t) => [BX + s * a, MY + b - s * b - t * h];
    const [p1, p2] = [P(.34, .84), P(.66, .84)];
    poly(c, [p1, p2, [p2[0] + 5, p2[1] + 5], [p1[0] + 5, p1[1] + 5]], "#2f8a5c");
    poly(c, [[p1[0] + 5, p1[1] + 5], [p2[0] + 5, p2[1] + 5], [p2[0] + 5, p2[1] + 7], [p1[0] + 5, p1[1] + 7]], "#ffffff");

    // Enseigne « CLUB HOUSE » sur la face gauche (texte incliné comme le mur)
    c.save();
    const o = [BX - a + .22 * a, MY + .22 * b - .66 * h];
    c.transform(1, b / a, 0, 1, o[0], o[1]);
    c.fillStyle = "#1f5a3e";
    c.fillRect(0, -6.5, .56 * a, 7);
    c.fillStyle = "#f2c94c";
    c.font = "bold 4.8px system-ui, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("CLUB HOUSE", .28 * a, -2.9);
    c.restore();

    // --- Toit à quatre pans (vert golf) ---
    const Yt = MY - h, rh = 17, d = 1.08;   // d = débord du toit
    const L = [BX - a * d, Yt], F = [BX, Yt + b * d], R = [BX + a * d, Yt], Bk = [BX, Yt - b * d];
    const R1 = [BX - .3 * a, Yt - .3 * b - rh], R2 = [BX + .3 * a, Yt + .3 * b - rh];   // faîtage
    poly(c, [Bk, R, R2, R1], "#2a6448");
    poly(c, [L, Bk, R1], "#2f6e50");
    poly(c, [L, F, R2, R1], "#3f9467");
    poly(c, [F, R, R2], "#2b7350");
    c.strokeStyle = "#6cc394"; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(...R1); c.lineTo(...R2); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = .8;
    c.beginPath(); c.moveTo(...L); c.lineTo(...F); c.lineTo(...R); c.stroke();

    // Cheminée en briques
    boite(c, BX + 20, Yt - 2, 3, 1.5, 13, "#7a3424", "#b5523b", "#93402d");

    // --- Petite tour avec horloge au milieu du toit ---
    const TX = BX, TY = Yt - rh + 6, ta = 7, tb = 3.5, th = 15;
    boite(c, TX, TY, ta, tb, th, null, "#ffffff", "#e3dccd");
    rond(c, TX - ta / 2, TY + tb / 2 - th * .55, 2.6, "#2b3a33");
    rond(c, TX - ta / 2, TY + tb / 2 - th * .55, 2.1, "#fffdf5");
    c.strokeStyle = "#2b3a33"; c.lineWidth = .5;
    c.beginPath();
    c.moveTo(TX - ta / 2, TY + tb / 2 - th * .55); c.lineTo(TX - ta / 2, TY + tb / 2 - th * .55 - 1.6);
    c.moveTo(TX - ta / 2, TY + tb / 2 - th * .55); c.lineTo(TX - ta / 2 + 1.2, TY + tb / 2 - th * .55);
    c.stroke();
    const sommet = [TX, TY - th - 11];
    poly(c, [[TX - ta - 1, TY - th], [TX, TY + tb - th + 1], sommet], "#e9b949");
    poly(c, [[TX, TY + tb - th + 1], [TX + ta + 1, TY - th], sommet], "#c9952a");
    c.strokeStyle = "#ffffff"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(...sommet); c.lineTo(sommet[0], sommet[1] - 9); c.stroke();
    poly(c, [[sommet[0], sommet[1] - 9], [sommet[0] + 7, sommet[1] - 7], [sommet[0], sommet[1] - 5]], "#e8433a");

    // --- Devant : haie, mâts de drapeaux, terrasse avec parasols, voiturette ---
    for (let s = .08; s < 1; s += .14) rond(c, BX - a + s * a - 3, BY + s * b + 4, 3.6, s * 10 % 2 < 1 ? "#3f9a4f" : "#358843");
    for (const [fx, fy, coul] of [[-62, -2, "#e8433a"], [-57, 1, "#2f6fd6"], [-52, 4, "#f2c94c"]]) {   // à gauche de l'enseigne
      c.strokeStyle = "#f4f4f4"; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(X + fx, Y + fy); c.lineTo(X + fx, Y + fy - 40); c.stroke();
      poly(c, [[X + fx, Y + fy - 40], [X + fx - 9, Y + fy - 37], [X + fx, Y + fy - 34]], coul);
    }
    for (const [px, py, coul] of [[-20, 15, "#e8433a"], [4, 22, "#2f8a5c"], [22, 14, "#e8433a"]]) {
      ovale(c, X + px, Y + py + 1, 6, 2.5, "rgba(0,0,0,.12)");
      c.strokeStyle = "#6b5a45"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(X + px, Y + py); c.lineTo(X + px, Y + py - 15); c.stroke();
      ovale(c, X + px, Y + py - 4, 4.5, 2, "#ffffff");   // table
      poly(c, [[X + px - 11, Y + py - 13], [X + px + 11, Y + py - 13], [X + px, Y + py - 21]], coul);
      poly(c, [[X + px - 3.5, Y + py - 13], [X + px + 3.5, Y + py - 13], [X + px, Y + py - 21]], "#ffffff");
    }
    // Voiturette de golf
    const vx = X + 42, vy = Y + 6;
    rond(c, vx - 5, vy + 1, 1.8, "#222"); rond(c, vx + 4, vy + 4, 1.8, "#222");
    boite(c, vx, vy, 7, 3.5, 5, "#ffffff", "#ececec", "#cfcfcf");
    c.strokeStyle = "#555"; c.lineWidth = .8;
    c.beginPath(); c.moveTo(vx - 6, vy - 5); c.lineTo(vx - 6, vy - 11); c.moveTo(vx + 5, vy - 2); c.lineTo(vx + 5, vy - 9); c.stroke();
    boite(c, vx, vy - 11, 8, 4, 1.5, "#2f8a5c", "#26704a", "#1f5a3c");
    c.restore();
  }

  // --- Parties en hauteur (dy = décalage pendant la chute) ---
  function ombre(c, X, Y, rx, ry, dy) {
    const k = Math.max(.3, 1 + dy / 200);
    ovale(c, X + 4, Y + 2, rx * k, ry * k, "rgba(0,0,0,.18)");
  }
  function dessinerObjet(c, type, sx, sy, x, y, dy = 0) {
    const X = sx, Y = sy + TH / 2;
    switch (type) {
      case "arbre": {
        ombre(c, X, Y, 15, 6, dy);
        c.save(); c.translate(0, dy);
        if ((x * 7 + y * 3) % 3 === 0) {   // sapin
          c.fillStyle = "#7a4a24"; c.fillRect(X - 2, Y - 10, 4, 10);
          for (const [w, base, sommet, coul] of [[14, -8, -30, "#2f7f45"], [11, -20, -41, "#3a9b52"], [7, -31, -50, "#48b562"]]) {
            poly(c, [[X - w, Y + base], [X + w, Y + base], [X, Y + sommet]], coul);
            poly(c, [[X, Y + sommet], [X + w, Y + base], [X, Y + base]], "rgba(0,0,0,.13)");
          }
        } else {                           // feuillu
          c.fillStyle = "#7a4a24"; c.fillRect(X - 2.5, Y - 16, 5, 16);
          rond(c, X, Y - 22, 13, "#2e8b3e");
          rond(c, X + 5, Y - 24, 10, "#287a36");
          rond(c, X - 5, Y - 28, 9, "#3fae4f");
          rond(c, X + 3, Y - 33, 8, "#4cc35c");
          rond(c, X - 3, Y - 34, 4, "#7ee08a");
        }
        c.restore();
        break;
      }
      case "green":                        // drapeau seul (aperçu, boutique)
        dessinerDrapeau(c, X, Y, dy, null);
        break;
      case "practice": {
        ombre(c, X, Y, 24, 10, dy);
        c.save(); c.translate(0, dy);
        const a = 23, b = 11.5, h = 15;
        boite(c, X, Y - 2, a, b, h, null, "#efe4cb", "#d3c19c");
        surFaceD(c, X, Y - 2, a, b, h, .12, .88, .05, .82, "#4b3d2c");   // ouverture
        for (let k = 0; k < 4; k++) rond(c, X + 6 + k * 4, Y + 4 - k * 2 - h * .15, 1.6, "#ffffff");
        boite(c, X, Y - 2 - h, a + 4, b + 2, 4, "#3fb070", "#2f8f58", "#257447");   // toit
        surFaceG(c, X, Y - 2, a, b, h, .3, .7, .45, .75, "#2f8f58");
        c.restore();
        rond(c, X + 12, Y + 7, 2, "#ffffff");
        rond(c, X + 16, Y + 5, 2, "#ffffff");
        rond(c, X + 9, Y + 10, 2, "#ffffff");
        boite(c, X - 12, Y + 7, 3, 1.5, 5, "#ff8a6a", "#e0533f", "#b9402f");   // seau
        break;
      }
      case "clubhouse": {
        ombre(c, X, Y, 28, 12, dy);
        c.save(); c.translate(0, dy);
        const a = 25, b = 12.5, h = 24;
        boite(c, X, Y, a, b, h, null, "#f8eedb", "#dcc8a3");
        surFaceG(c, X, Y, a, b, h, .14, .36, .38, .72, "#7cc6f2");
        surFaceG(c, X, Y, a, b, h, .58, .8, .38, .72, "#7cc6f2");
        surFaceD(c, X, Y, a, b, h, .4, .62, 0, .62, "#8a5a2b");
        surFaceD(c, X, Y, a, b, h, .12, .28, .4, .7, "#5aa8d6");
        const sommet = [X, Y - h - 22];
        poly(c, [[X - a - 3, Y - h + 1], [X, Y + b - h + 2], sommet], "#e35d4c");
        poly(c, [[X, Y + b - h + 2], [X + a + 3, Y - h + 1], sommet], "#b8402f");
        c.strokeStyle = "#ffffff"; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(sommet[0], sommet[1]); c.lineTo(sommet[0], sommet[1] - 12); c.stroke();
        poly(c, [[sommet[0], sommet[1] - 12], [sommet[0] + 8, sommet[1] - 9.5], [sommet[0], sommet[1] - 7]], "#ffd23f");
        c.restore();
        break;
      }
    }
  }

  // Trou + drapeau planté en (hx, hy) ; numero = numéro du trou écrit sur le drapeau (ou null)
  function dessinerDrapeau(c, hx, hy, dy = 0, numero = null) {
    ovale(c, hx, hy + 1, 3, 1.6, "#1d2b22");   // le trou
    c.save(); c.translate(0, dy);
    c.strokeStyle = "#f4f4f4"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy - 40); c.stroke();
    if (numero == null) {
      poly(c, [[hx, hy - 40], [hx + 15, hy - 35], [hx, hy - 29]], "#e8433a");
    } else {
      // Drapeau rectangulaire avec le numéro du trou
      poly(c, [[hx, hy - 40], [hx + 19, hy - 38], [hx + 19, hy - 27], [hx, hy - 29]], "#e8433a");
      poly(c, [[hx, hy - 34], [hx + 19, hy - 32.5], [hx + 19, hy - 27], [hx, hy - 29]], "rgba(0,0,0,.12)");
      c.fillStyle = "#ffffff";
      c.font = `bold ${numero > 9 ? 8 : 9}px system-ui, sans-serif`;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(String(numero), hx + 9.5, hy - 33.2);
    }
    c.restore();
  }

  /* Greens collés = un seul green. On les regroupe (cases voisines par un côté),
     on plante le drapeau au milieu du groupe et on numérote les trous dans l'ordre de pose. */
  let greensFusionnes = true;   // false pour les petits dessins de la boutique
  function groupesDeGreens() {
    const vus = new Set();
    const groupes = [];
    const ordre = (k) => { const i = etat.ordreGreens.indexOf(k); return i < 0 ? 1e9 : i; };
    for (const [cle, type] of Object.entries(etat.carte)) {
      if (type !== "green" || vus.has(cle)) continue;
      const cases = [];
      const pile = [cle];
      vus.add(cle);
      while (pile.length) {
        const k = pile.pop();
        cases.push(k);
        const [x, y] = k.split(",").map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const v = (x + dx) + "," + (y + dy);
          if (etat.carte[v] === "green" && !vus.has(v)) { vus.add(v); pile.push(v); }
        }
      }
      const pts = cases.map((k) => k.split(",").map(Number));
      const cx = pts.reduce((t, p) => t + p[0] + .5, 0) / pts.length;
      const cy = pts.reduce((t, p) => t + p[1] + .5, 0) / pts.length;
      // Case du drapeau : celle du groupe la plus proche du centre
      let porteur = cases[0], meilleure = Infinity;
      for (const [x, y] of pts) {
        const d = (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2;
        if (d < meilleure) { meilleure = d; porteur = x + "," + y; }
      }
      const [px, py] = porteur.split(",").map(Number);
      // Trou un peu vers le centre du groupe, mais toujours dans la case porteuse
      const tx = px + .5 + Math.max(-.3, Math.min(.3, cx - px - .5));
      const ty = py + .5 + Math.max(-.3, Math.min(.3, cy - py - .5));
      groupes.push({ cases, porteur, tx, ty, rang: Math.min(...cases.map(ordre)) });
    }
    groupes.sort((a, b) => a.rang - b.rang);
    groupes.forEach((g, i) => { g.numero = i + 1; });
    return groupes;
  }

  function easeOutBack(p) { const s = 1.70158; return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); }
  function easeOutBounce(p) {
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + .75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + .9375;
    return n * (p -= 2.625 / d) * p + .984375;
  }

  function lancerParticules(x, y, couleur) {
    const { sx, sy } = coinCase(x, y);
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 90;
      particules.push({
        x: sx, y: sy + TH / 2, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v * .5 - 50,
        vie: .7, max: .7, r: 2 + Math.random() * 2.5, couleur: i % 3 === 0 ? "#ffd23f" : couleur,
      });
    }
  }

  function dessinerCarte(t) {
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.setTransform(vue.dpr * vue.z, 0, 0, vue.dpr * vue.z, vue.dpr * vue.x, vue.dpr * vue.y);
    fjDessin = fj;

    // Mode « Terrain » : parcelles à acheter en pointillés, avec leur prix
    if (outil === "terrain") {
      const prix = prixParcelle();
      for (const q of parcellesAchetables()) {
        const [px, py] = q.split(",").map(Number);
        const x0 = px * PARCELLE, y0 = py * PARCELLE, x1 = x0 + PARCELLE, y1 = y0 + PARCELLE;
        const pts = [coinCase(x0, y0), coinCase(x1, y0), coinCase(x1, y1), coinCase(x0, y1)].map((p) => [p.sx, p.sy]);
        poly(c, pts, etat.pieces >= prix ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.25)");
        c.setLineDash([10, 8]);
        c.strokeStyle = "#2f8a5c"; c.lineWidth = 3;
        c.beginPath(); c.moveTo(...pts[0]); pts.slice(1).forEach((p) => c.lineTo(...p)); c.closePath(); c.stroke();
        c.setLineDash([]);
        const m = coinCase(x0 + PARCELLE / 2, y0 + PARCELLE / 2);
        // Texte assez gros pour rester lisible quand on a dézoomé (≈ 12 px à l'écran au minimum)
        const t = Math.min(40, Math.max(22, 12 / vue.z));
        c.fillStyle = "#1f6b43";
        c.font = `bold ${Math.round(t * 1.5)}px system-ui, sans-serif`;
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("＋", m.sx, m.sy - t * .75);
        c.font = `bold ${Math.round(t)}px system-ui, sans-serif`;
        c.fillStyle = etat.pieces >= prix ? "#8a5d00" : "#b3423a";
        c.fillText(prix + " 🪙", m.sx, m.sy + t * .6);
      }
    }

    const drapeaux = {};   // case porteuse -> groupe de greens
    for (const g of groupesDeGreens()) drapeaux[g.porteur] = g;
    const anim = {};
    animations = animations.filter((a) => t - a.t0 < a.duree);
    // -1 = animation pas encore commencée (vague d'apparition d'un trou) : l'élément reste caché
    for (const a of animations) anim[a.cle] = t < a.t0 ? -1 : Math.min(1, (t - a.t0) / a.duree);

    // 1er passage : le sol (de l'arrière vers l'avant), avec les bords de terre
    const { minX, maxX, minY, maxY } = bornes;
    for (let s = minX + minY; s <= maxX + maxY; s++) {
      for (let x = Math.max(minX, s - maxY); x <= Math.min(maxX, s - minY); x++) {
        const y = s - x;
        if (!possedee(x, y)) continue;
        const cle = x + "," + y;
        const v = etat.carte[cle];
        const { sx, sy } = coinCase(x, y);
        // Bord de terre là où le terrain s'arrête (devant à gauche / devant à droite)
        // (dépassent d'un demi-pixel pour qu'on ne voie pas de jointure entre deux cases)
        if (!possedee(x, y + 1)) poly(c, [[sx - TW / 2 - .6, sy + TH / 2 - .3], [sx + .6, sy + TH + .3], [sx + .6, sy + TH + EPAIS + .3], [sx - TW / 2 - .6, sy + TH / 2 + EPAIS - .3]], "#9a6a3a");
        if (!possedee(x + 1, y)) poly(c, [[sx - .6, sy + TH + .3], [sx + TW / 2 + .6, sy + TH / 2 - .3], [sx + TW / 2 + .6, sy + TH / 2 + EPAIS - .3], [sx - .6, sy + TH + EPAIS + .3]], "#7d5430");
        // Cases d'un grand élément (club-house, putting green, practice) : sol spécial
        const ancre = v && v.startsWith("@") ? v.slice(1) : (v && TAILLES[v] ? cle : null);
        if (ancre) {
          const tA = etat.carte[ancre];
          const [ax, ay] = ancre.split(",").map(Number);
          if (estGrand(tA, ax, ay)) dessinerSolGrand(c, tA, sx, sy, x - ax, y - ay, x, y);
          else if (v.startsWith("@")) dessinerHerbe(c, sx, sy, x, y);
          if (estGrand(tA, ax, ay) || v.startsWith("@")) {
            if (outil) losange(c, sx, sy, 1, null, "rgba(0,0,0,.08)");
            continue;
          }
        }
        const type = v;
        if (type && ELEMENTS[type].plat && anim[cle] != null) {
          dessinerHerbe(c, sx, sy, x, y);
          const s = anim[cle] < 0 ? .01 : Math.max(.01, easeOutBack(anim[cle]));
          c.save();
          c.translate(sx, sy + TH / 2); c.scale(s, s); c.translate(-sx, -(sy + TH / 2));
          dessinerSol(c, type, sx, sy, x, y);
          c.restore();
        } else {
          dessinerSol(c, type && ELEMENTS[type].plat ? type : null, sx, sy, x, y);
        }
        if (outil) losange(c, sx, sy, 1, null, "rgba(0,0,0,.08)");   // quadrillage d'aide
      }
    }

    // 2e passage : objets en hauteur, de l'arrière vers l'avant
    for (let s = minX + minY; s <= maxX + maxY; s++) {
      for (let x = Math.max(minX, s - maxY); x <= Math.min(maxX, s - minY); x++) {
        const y = s - x;
        const cle = x + "," + y;
        const type = etat.carte[cle];
        if (!type) continue;
        // Grands éléments : chaque case dessine sa partie (de l'arrière vers l'avant)
        if (type.startsWith("@") || TAILLES[type]) {
          const ancre = type.startsWith("@") ? type.slice(1) : cle;
          const tA = etat.carte[ancre];
          const [ax, ay] = ancre.split(",").map(Number);
          if (estGrand(tA, ax, ay)) {
            const P = (u, v) => { const q = coinCase(ax + u, ay + v); return [q.sx, q.sy]; };
            const dyA = anim[ancre] != null ? -(1 - easeOutBounce(anim[ancre])) * 150 : 0;
            dessinerPartieGrand(c, tA, P, x - ax, y - ay, dyA);
            continue;
          }
          if (type.startsWith("@")) continue;
          // sinon : ancien élément d'une seule case, dessiné comme avant
        }
        if (type === "green") {
          const g = drapeaux[cle];
          if (g) {
            const t = coinCase(g.tx, g.ty);
            if (!(anim[cle] < 0)) dessinerDrapeau(c, t.sx, t.sy, anim[cle] != null ? -(1 - easeOutBounce(anim[cle])) * 150 : 0, g.numero);
          }
          continue;
        }
        if (!ELEMENTS[type].haut) continue;
        const { sx, sy } = coinCase(x, y);
        if (anim[cle] < 0) continue;   // pas encore apparu
        const dy = anim[cle] != null ? -(1 - easeOutBounce(anim[cle])) * 150 : 0;
        dessinerObjet(c, type, sx, sy, x, y, dy);
      }
    }

    // ✏️ Modifier : l'élément choisi est entouré en jaune
    if (outil === "modifier" && selection) {
      const [ax, ay] = selection.ancre.split(",").map(Number);
      const cases = estGrand(selection.type, ax, ay) ? casesDe(selection.type, ax, ay) : [[ax, ay]];
      for (const [a, b] of cases) { const q = coinCase(a, b); losange(c, q.sx, q.sy, 1, "rgba(255,210,63,.35)", "#ffb800"); }
    }
    // Aperçu d'un trou tout prêt sous la souris
    if (survol && outil && outil.startsWith("kit:")) {
      const cases = casesKit(outil.slice(4), survol.x, survol.y);
      c.save(); c.globalAlpha = .6;
      for (const [x, y, t] of cases) { const q = coinCase(x, y); dessinerSol(c, ELEMENTS[t].plat ? t : null, q.sx, q.sy, x, y); }
      c.restore();
      for (const [x, y, t] of cases) {
        const q = coinCase(x, y);
        const pb = !possedee(x, y) || (t !== "gazon" && etat.carte[x + "," + y] && etat.carte[x + "," + y] !== "gazon");
        if (pb) losange(c, q.sx, q.sy, 1, "rgba(224,83,63,.45)");
      }
    }
    // Aperçu sous la souris
    if (survol && outil && outil !== "terrain" && outil !== "modifier" && !outil.startsWith("kit:")) {
      const { sx, sy } = coinCase(survol.x, survol.y);
      const occupe = etat.carte[survol.x + "," + survol.y];
      if (outil === "retirer") {
        losange(c, sx, sy, 1, occupe ? "rgba(224,83,63,.35)" : "rgba(255,255,255,.25)", "#ffffff");
      } else if (TAILLES[outil]) {
        const an = ancrePose(outil, survol.x, survol.y);
        const cases = casesDe(outil, an.x, an.y);
        const libre = cases.every(([a, b]) => possedee(a, b) && (!etat.carte[a + "," + b] || etat.carte[a + "," + b] === "gazon"));
        const ok = libre && etat.pieces >= ELEMENTS[outil].prix;
        c.save();
        c.globalAlpha = .6;
        if (libre) dessinerGrandComplet(c, outil, (u, v) => { const q = coinCase(an.x + u, an.y + v); return [q.sx, q.sy]; });
        c.restore();
        for (const [a, b] of cases) {
          const q = coinCase(a, b);
          losange(c, q.sx, q.sy, 1, ok ? "rgba(255,255,255,.15)" : "rgba(224,83,63,.35)", ok ? "#ffffff" : "#e0533f");
        }
      } else {
        const libre = !occupe || (occupe === "gazon" && outil !== "gazon");   // on peut poser sur le gazon
        const ok = libre && etat.pieces >= ELEMENTS[outil].prix;
        c.save();
        c.globalAlpha = .6;
        if (libre) {
          if (ELEMENTS[outil].plat) dessinerSol(c, outil, sx, sy, survol.x, survol.y);
          if (ELEMENTS[outil].haut) dessinerObjet(c, outil, sx, sy, survol.x, survol.y);
        }
        c.restore();
        losange(c, sx, sy, 1, ok ? "rgba(255,255,255,.2)" : "rgba(224,83,63,.35)", ok ? "#ffffff" : "#e0533f");
      }
    }

    for (const p of particules) {
      c.globalAlpha = Math.max(0, p.vie / p.max);
      rond(c, p.x, p.y, p.r, p.couleur);
    }
    c.globalAlpha = 1;
  }

  // Boucle d'affichage : tourne seulement quand l'onglet Tycoon est visible
  let tPrec = 0;
  function boucle(t) {
    const section = document.getElementById("vue-tycoon");
    if (!section || section.hidden) { boucleActive = false; return; }
    const dt = Math.min(.05, (t - tPrec) / 1000);
    tPrec = t;
    if (fj !== fjCible) {
      fj = fjCible > fj ? Math.min(fjCible, fj + dt / .9) : Math.max(fjCible, fj - dt / .9);
      besoinRendu = true;
    }
    for (const a of animations) {
      if (!a.poussiere && t >= a.t0 && (t - a.t0) / a.duree >= a.impact) {
        a.poussiere = true;
        const [x, y] = a.cle.split(",").map(Number);
        const cases = estGrand(a.type, x, y) ? casesDe(a.type, x, y) : [[x, y]];
        for (const [px, py] of cases) lancerParticules(px, py, ELEMENTS[a.type].couleur);
        son("pose");
      }
    }
    if (particules.length) {
      for (const p of particules) { p.vie -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; }
      particules = particules.filter((p) => p.vie > 0);
      besoinRendu = true;
    }
    if ((besoinRendu || animations.length) && vue.l > 0) {
      besoinRendu = false;
      dessinerCarte(t);
    }
    requestAnimationFrame(boucle);
  }
  function lancerBoucle() {
    if (boucleActive) return;
    boucleActive = true;
    tPrec = performance.now();
    besoinRendu = true;
    requestAnimationFrame(boucle);
  }

  // --- Caméra ---
  // Zoom qui fait tenir tout le cadre (terrain + marge) dans l'écran
  function zoomPour(m) { return Math.min(vue.l / (m.droite - m.gauche + 40), vue.h / (m.bas - m.haut + 20)); }
  function zoomAjuste() { return zoomPour(cadreMonde(PARCELLE)); }
  // marge = cases autour du terrain à montrer (ex. les parcelles à acheter)
  function centrer(marge = 0) {
    const m = cadreMonde(marge);
    const fit = zoomPour(m);
    vue.z = marge ? fit : (vue.l < 700 ? Math.max(fit, .4) : fit);   // un peu plus gros sur téléphone
    vue.x = vue.l / 2 - (m.gauche + m.droite) / 2 * vue.z;
    vue.y = vue.h / 2 - (m.haut + m.bas) / 2 * vue.z;
    borner();
    besoinRendu = true;
  }
  // Le terrain ne doit jamais sortir complètement de l'écran
  function borner() {
    const m = cadreMonde(PARCELLE);
    const g = vue.x + m.gauche * vue.z, d = vue.x + m.droite * vue.z;
    const h = vue.y + m.haut * vue.z, b = vue.y + m.bas * vue.z;
    if (d < 60) vue.x += 60 - d;
    if (g > vue.l - 60) vue.x -= g - (vue.l - 60);
    if (b < 60) vue.y += 60 - b;
    if (h > vue.h - 60) vue.y -= h - (vue.h - 60);
  }
  function zoomAutour(facteur, sx, sy) {
    const nz = Math.min(3, Math.max(zoomAjuste() * .7, vue.z * facteur));
    const wx = (sx - vue.x) / vue.z, wy = (sy - vue.y) / vue.z;
    vue.z = nz;
    vue.x = sx - wx * nz;
    vue.y = sy - wy * nz;
    borner();
    besoinRendu = true;
  }
  function redimensionner() {
    const zone = $("#ty-carte-zone");
    if (!zone || !canvas) return;
    const r = zone.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;   // onglet caché
    const ancienL = vue.l, ancienH = vue.h;
    vue.l = r.width; vue.h = r.height;
    vue.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(r.width * vue.dpr);
    canvas.height = Math.round(r.height * vue.dpr);
    if (!vue.pret) { centrer(); vue.pret = true; }
    else { vue.x += (vue.l - ancienL) / 2; vue.y += (vue.h - ancienH) / 2; borner(); }
    besoinRendu = true;
    dessinerCarte(performance.now());
  }
  // Case sous le doigt, même hors du terrain
  function caseBrute(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return caseDepuisMonde((clientX - r.left - vue.x) / vue.z, (clientY - r.top - vue.y) / vue.z);
  }
  // Case du terrain possédé sous le doigt (null en dehors)
  function caseSousPointeur(clientX, clientY) {
    const cs = caseBrute(clientX, clientY);
    return possedee(cs.x, cs.y) ? cs : null;
  }

  // Achat de la parcelle touchée (outil « Terrain »)
  function acheterParcelle(clientX, clientY) {
    const cs = caseBrute(clientX, clientY);
    const q = parcelleDe(cs.x, cs.y);
    if (parcellesPossedees.has(q)) { toast("Cette parcelle est déjà à toi. Touche un carré en pointillés."); return; }
    if (!parcellesAchetables().has(q)) { son("erreur"); toast("Choisis un carré en pointillés, collé à ton terrain."); return; }
    const prix = prixParcelle();
    if (etat.pieces < prix) {
      son("erreur");
      secouer($("#ty-compteur"));
      toast(`Il manque ${prix - etat.pieces} pièces pour cette parcelle.`);
      return;
    }
    etat.pieces -= prix;
    etat.parcelles.push(q);
    majTerrain();
    sauvegarder();
    const [px, py] = q.split(",").map(Number);
    for (const [dx, dy] of [[0, 0], [4, 0], [0, 4], [4, 4], [2, 2]]) lancerParticules(px * PARCELLE + dx, py * PARCELLE + dy, "#5cc246");
    son("pose");
    son("reverdit");
    if (navigator.vibrate) { try { navigator.vibrate(20); } catch (e) { /* rien */ } }
    toast(`🗺️ Parcelle achetée : +${PARCELLE * PARCELLE} cases !`);
    animerPieces();
    majBoutique();
    besoinRendu = true;
  }

  // --- Gestes : glisser = déplacer, pincer / molette = zoomer, toucher = poser ---
  const pointeurs = new Map();
  let geste = null;
  function initGestes() {
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointeurs.size === 1) geste = { x0: e.clientX, y0: e.clientY, bouge: false };
      else if (geste) geste.bouge = true;   // deux doigts : jamais un « toucher »
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = pointeurs.get(e.pointerId);
      if (e.pointerType === "mouse") {
        const cs = caseSousPointeur(e.clientX, e.clientY);
        if ((cs && (!survol || cs.x !== survol.x || cs.y !== survol.y)) || (!cs && survol)) { survol = cs; besoinRendu = true; }
      }
      if (!p) return;
      if (pointeurs.size === 1) {
        if (geste && !geste.bouge && Math.hypot(e.clientX - geste.x0, e.clientY - geste.y0) > 8) geste.bouge = true;
        if (geste && geste.bouge) {
          vue.x += e.clientX - p.x; vue.y += e.clientY - p.y;
          borner(); besoinRendu = true;
        }
      } else if (pointeurs.size === 2) {
        const [a, b] = [...pointeurs.values()];
        const d0 = Math.hypot(a.x - b.x, a.y - b.y), m0 = [(a.x + b.x) / 2, (a.y + b.y) / 2];
        p.x = e.clientX; p.y = e.clientY;
        const d1 = Math.hypot(a.x - b.x, a.y - b.y), m1 = [(a.x + b.x) / 2, (a.y + b.y) / 2];
        const r = canvas.getBoundingClientRect();
        vue.x += m1[0] - m0[0]; vue.y += m1[1] - m0[1];
        if (d0 > 0) zoomAutour(d1 / d0, m1[0] - r.left, m1[1] - r.top);
        besoinRendu = true;
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    const fin = (e) => {
      const seul = pointeurs.size === 1;
      pointeurs.delete(e.pointerId);
      if (seul && geste && !geste.bouge && e.type === "pointerup") toucherCarte(e.clientX, e.clientY);
      if (pointeurs.size === 0) geste = null;
    };
    canvas.addEventListener("pointerup", fin);
    canvas.addEventListener("pointercancel", fin);
    canvas.addEventListener("pointerleave", () => { if (survol) { survol = null; besoinRendu = true; } });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomAutour(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    new ResizeObserver(redimensionner).observe($("#ty-carte-zone"));
  }

  function toucherCarte(clientX, clientY) {
    if (outil === "terrain") { acheterParcelle(clientX, clientY); return; }
    if (outil && outil.startsWith("kit:")) { const b = caseBrute(clientX, clientY); poserKit(outil.slice(4), b.x, b.y); return; }
    const cs = caseSousPointeur(clientX, clientY);
    if (!cs) return;
    if (outil === "modifier") { modifierToucher(cs); return; }
    let cle = cs.x + "," + cs.y;
    const present = typeDe(cle);   // type réel (aussi pour une case du club-house)

    if (!outil) {
      if (present === "green") {
        const g = groupesDeGreens().find((gr) => gr.cases.includes(cle));
        toast(`⛳ Green du trou n° ${g ? g.numero : "?"} (${g ? g.cases.length : 1} case${g && g.cases.length > 1 ? "s" : ""})`);
      } else {
        toast(present ? ELEMENTS[present].nom : "Choisis un élément dans la boutique ci-dessous 👇");
      }
      return;
    }
    if (outil === "retirer") {
      if (!present) return;
      const rendu = Math.floor(ELEMENTS[present].prix / 2);
      cle = ancreDe(cle);
      const [ax, ay] = cle.split(",").map(Number);
      // Grand élément : on libère toutes ses cases
      const cases = estGrand(present, ax, ay) ? casesDe(present, ax, ay) : [[cs.x, cs.y]];
      for (const [a, b] of cases) delete etat.carte[a + "," + b];
      etat.ordreGreens = etat.ordreGreens.filter((k) => etat.carte[k] === "green");
      etat.pieces += rendu;
      sauvegarder();
      for (const [a, b] of cases) lancerParticules(a, b, ELEMENTS[present].couleur);
      son("retirer");
      if (rendu) toast(`${ELEMENTS[present].nom} retiré : +${rendu} pièces`);
      animerPieces();
      majBoutique();
      besoinRendu = true;
      return;
    }
    const el = ELEMENTS[outil];
    // Grands éléments (club-house, putting green, practice) : toutes leurs cases doivent être libres
    const an = TAILLES[outil] ? ancrePose(outil, cs.x, cs.y) : cs;
    const cases = TAILLES[outil] ? casesDe(outil, an.x, an.y) : [[cs.x, cs.y]];
    // Une case de gazon peut être recouverte (sauf par du gazon)
    const prise = (a, b) => { const v = etat.carte[a + "," + b]; return v && !(v === "gazon" && outil !== "gazon"); };
    if (cases.some(([a, b]) => !possedee(a, b) || prise(a, b))) {
      son("erreur");
      const t = TAILLES[outil];
      toast(t ? `${el.nom} : il faut ${t[0] * t[1]} cases libres (${t[0]} × ${t[1]}) sur ton terrain` : "Case occupée — utilise 🧹 Retirer d'abord");
      return;
    }
    if (etat.pieces < el.prix) {
      son("erreur");
      secouer($("#ty-compteur"));
      toast(`Il manque ${el.prix - etat.pieces} pièces. Va cocher un exo !`);
      return;
    }
    etat.pieces -= el.prix;
    cle = an.x + "," + an.y;
    etat.carte[cle] = outil;
    for (const [a, b] of cases.slice(1)) etat.carte[a + "," + b] = "@" + cle;   // renvois vers l'ancre
    if (outil === "green") { etat.ordreGreens = etat.ordreGreens.filter((k) => k !== cle); etat.ordreGreens.push(cle); }
    sauvegarder();
    animations.push({ cle, type: outil, t0: performance.now(), duree: el.haut ? 650 : 380, impact: el.haut ? .36 : 0, poussiere: false });
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* rien */ } }
    besoinRendu = true;
    animerPieces();
    majBoutique();
  }

  // Pose d'un trou tout prêt centré sur la case (x, y)
  function poserKit(id, x, y) {
    const kit = KITS_TROUS[id];
    const cases = casesKit(id, x, y);
    const { horsTerrain, prises } = conflitsKit(cases);
    if (horsTerrain) {
      son("erreur");
      toast(`Pas assez de terrain ici : ${horsTerrain} case${horsTerrain > 1 ? "s" : ""} en dehors. Achète des parcelles 🗺️ ou tourne le trou ↻.`);
      return;
    }
    if (prises) {
      son("erreur");
      toast(`${prises} case${prises > 1 ? "s sont" : " est"} déjà prise${prises > 1 ? "s" : ""} (le gazon ne gêne pas). Déplace-les avec ✏️ ou retire-les 🧹.`);
      return;
    }
    if (etat.pieces < kit.prix) {
      son("erreur");
      secouer($("#ty-compteur"));
      toast(`Il manque ${kit.prix - etat.pieces} pièces pour le ${kit.nom.toLowerCase()}.`);
      return;
    }
    if (!confirm(`Poser le ${kit.nom.toLowerCase()} ici pour ${kit.prix} pièces ?\nTu pourras tout modifier ensuite (✏️ Modifier).`)) return;
    etat.pieces -= kit.prix;
    const t0 = performance.now();
    for (const [cx, cy, t] of cases) {
      const k = cx + "," + cy;
      if (t === "gazon" && etat.carte[k]) continue;   // le rough ne remplace rien
      etat.carte[k] = t;
      if (t === "green") etat.ordreGreens.push(k);
      // Petite vague d'apparition : du départ vers le green
      animations.push({ cle: k, type: t, t0: t0 + (cx + cy - x - y) * 18 + 200, duree: ELEMENTS[t].haut ? 650 : 380, impact: 9, poussiere: true });
    }
    etat.ordreGreens = [...new Set(etat.ordreGreens)];
    sauvegarder();
    for (let n = 0; n < 6; n++) { const [cx, cy] = cases[Math.floor(n * cases.length / 6)]; lancerParticules(cx, cy, "#86e06a"); }
    son("pose");
    son("niveau");
    confettis();
    toast(`⛳ ${kit.nom} posé ! Tout est modifiable avec ✏️ Modifier.`);
    animerPieces();
    majBoutique();
    besoinRendu = true;
  }

  // ✏️ Modifier : toucher un élément pour le choisir, puis une case libre pour le déplacer (gratuit)
  let selection = null;   // { ancre: "x,y", type }
  function modifierToucher(cs) {
    const cle = cs.x + "," + cs.y;
    const type = typeDe(cle);
    if (!selection) {
      if (!type) { toast("Touche d'abord un élément à déplacer."); return; }
      selection = { ancre: ancreDe(cle), type };
      son("clic");
      toast(`${ELEMENTS[type].nom} choisi : touche une case libre pour le déplacer.`);
      besoinRendu = true;
      return;
    }
    const ancreTouchee = type ? ancreDe(cle) : null;
    if (ancreTouchee === selection.ancre) { selection = null; toast("Sélection annulée."); besoinRendu = true; return; }
    if (type && type !== "gazon") {   // on change d'élément choisi
      selection = { ancre: ancreTouchee, type };
      son("clic");
      toast(`${ELEMENTS[type].nom} choisi : touche une case libre pour le déplacer.`);
      besoinRendu = true;
      return;
    }
    // Déplacement vers la case touchée (libre ou gazon)
    const { type: t } = selection;
    const [ax, ay] = selection.ancre.split(",").map(Number);
    const grand = estGrand(t, ax, ay);
    const anciennes = new Set((grand ? casesDe(t, ax, ay) : [[ax, ay]]).map(([a, b]) => a + "," + b));
    const libre = (a, b) => {
      const k = a + "," + b, v = etat.carte[k];
      return possedee(a, b) && (!v || anciennes.has(k) || (v === "gazon" && t !== "gazon"));
    };
    let na = null;
    if (grand) {
      const [w, h] = TAILLES[t];
      for (let j = 0; j < h && !na; j++) for (let i = 0; i < w && !na; i++) {
        const cand = { x: cs.x - i, y: cs.y - j };
        if (casesDe(t, cand.x, cand.y).every(([a, b]) => libre(a, b))) na = cand;
      }
    } else if (libre(cs.x, cs.y)) {
      na = { x: cs.x, y: cs.y };
    }
    if (!na) { son("erreur"); toast("Pas la place ici : il faut des cases libres sur ton terrain."); return; }
    for (const k of anciennes) delete etat.carte[k];
    const nouvelle = na.x + "," + na.y;
    etat.carte[nouvelle] = t;
    if (grand) for (const [a, b] of casesDe(t, na.x, na.y).slice(1)) etat.carte[a + "," + b] = "@" + nouvelle;
    // Un green déplacé garde son numéro de trou
    if (t === "green") etat.ordreGreens = etat.ordreGreens.map((k) => (k === selection.ancre ? nouvelle : k));
    selection = null;
    sauvegarder();
    animations.push({ cle: nouvelle, type: t, t0: performance.now(), duree: ELEMENTS[t].haut ? 500 : 300, impact: ELEMENTS[t].haut ? .36 : 0, poussiere: false });
    son("clic");
    besoinRendu = true;
    majBoutique();
  }

  /* =======================================================
     6. BOUTIQUE
     ======================================================= */

  function dessinerMini(cv, type) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = 60 * dpr; cv.height = 60 * dpr;
    const c = cv.getContext("2d");
    const k = 60 / 76;
    c.setTransform(dpr * k, 0, 0, dpr * k, dpr * 30, dpr * 2);
    const ancien = fjDessin;
    fjDessin = 0;
    greensFusionnes = false;
    if (TAILLES[type]) {   // grand élément : toutes ses cases, dessinées plus petites
      const [w, h] = TAILLES[type];
      const z = Math.min(60 / ((w + h) * TW / 2 + 10), .42);
      const cx = (w - h) / 2 * TW / 2, cy = (w + h) / 2 * TH / 2;   // centre de l'élément
      const bas = 60 - 4 * z - (w + h) / 2 * TH / 2 * z;             // on le pose en bas de l'image
      c.setTransform(dpr * z, 0, 0, dpr * z, dpr * (30 - cx * z), dpr * (bas - cy * z));
      dessinerGrandComplet(c, type, (u, v) => [(u - v) * TW / 2, (u + v) * TH / 2]);
      fjDessin = ancien;
      greensFusionnes = true;
      return;
    }
    dessinerSol(c, ELEMENTS[type].plat ? type : null, 0, 42, 0, 1);
    if (ELEMENTS[type].haut) dessinerObjet(c, type, 0, 42, 1, 0);
    fjDessin = ancien;
    greensFusionnes = true;
  }

  // Petit dessin d'un trou tout prêt pour la boutique
  function dessinerMiniKit(cv, id) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = 60 * dpr; cv.height = 60 * dpr;
    const c = cv.getContext("2d");
    const cases = casesKit(id, 0, 0, 0);
    const plan = KITS_TROUS[id].plan, w = plan[0].length, h = plan.length;
    const x0 = -Math.floor(w / 2), y0 = -Math.floor(h / 2);
    const z = Math.min(58 / ((w + h) * TW / 2), 50 / ((w + h) * TH / 2 + 30));
    const cx = (w - h) / 2 * TW / 2, cy = (w + h) / 2 * TH / 2;
    c.setTransform(dpr * z, 0, 0, dpr * z, dpr * (30 - cx * z), dpr * (34 - cy * z));
    const ancien = fjDessin;
    fjDessin = 0; greensFusionnes = false;
    const P = (x, y) => [(x - x0 - (y - y0)) * TW / 2, (x - x0 + y - y0) * TH / 2];
    for (const [x, y, t] of cases) { const [sx, sy] = P(x, y); dessinerSol(c, ELEMENTS[t].plat ? t : null, sx, sy, x, y); }
    for (const [x, y, t] of cases.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]))) {
      if (t === "arbre") { const [sx, sy] = P(x, y); dessinerObjet(c, t, sx, sy, x, y); }
    }
    // Drapeau au milieu du green
    const gr = cases.filter(([, , t]) => t === "green");
    const gx = gr.reduce((s, q) => s + q[0] + .5, 0) / gr.length, gy = gr.reduce((s, q) => s + q[1] + .5, 0) / gr.length;
    const [fx, fy] = P(gx, gy);
    dessinerDrapeau(c, fx, fy, 0, null);
    fjDessin = ancien; greensFusionnes = true;
  }

  function choisirOutil(type) {
    const el = infoOutil(type);
    if (el && niveau() < el.niveau) {
      const manque = (el.niveau - 1) * PALIER_NIVEAU - etat.totalFaits;
      son("erreur");
      toast(`🔒 ${el.nom} : niveau ${el.niveau} (encore ${manque} action${manque > 1 ? "s" : ""})`);
      return;
    }
    outil = outil === type ? null : type;
    selection = null;
    if (outil === "terrain") centrer(PARCELLE);   // on recule pour voir les parcelles à acheter
    son("clic");
    majBoutique();
    besoinRendu = true;
  }

  function majBoutique() {
    const zone = $("#ty-boutique");
    if (!zone) return;
    const niv = niveau();
    zone.querySelectorAll(".ty-article").forEach((btn) => {
      const type = btn.dataset.type;
      btn.classList.toggle("choisi", outil === type);
      if (type === "retirer" || type === "modifier") return;
      if (type === "terrain") {
        btn.classList.toggle("trop-cher", etat.pieces < prixParcelle());
        btn.querySelector(".ty-prix").innerHTML = `<span class="ty-piece"></span>${prixParcelle()}`;
        return;
      }
      const el = infoOutil(type);
      const verrou = niv < el.niveau;
      btn.classList.toggle("verrouille", verrou);
      btn.classList.toggle("trop-cher", !verrou && etat.pieces < el.prix);
      btn.querySelector(".ty-prix").innerHTML = verrou ? `🔒 Niv. ${el.niveau}` : `<span class="ty-piece"></span>${el.prix}`;
    });
    let txt;
    if (!outil) txt = "Choisis un élément, puis touche une case. Glisse pour te déplacer, pince pour zoomer.";
    else if (outil === "retirer") txt = "Touche un élément pour le retirer (la moitié du prix est rendue).";
    else if (outil === "modifier") txt = selection
      ? `${ELEMENTS[selection.type].nom} choisi (en jaune) : touche une case libre pour le déplacer, ou touche-le encore pour annuler.`
      : "✏️ Modifier : touche un élément pour le choisir, puis une case libre pour le déplacer (gratuit). Pour changer une case de gazon, pose simplement un autre élément dessus.";
    else if (outil.startsWith("kit:")) txt = `Touche la carte pour poser le ${KITS_TROUS[outil.slice(4)].nom.toLowerCase()} (centré sur la case touchée) — ${KITS_TROUS[outil.slice(4)].prix} pièces. ↻ pour le tourner. Sur ordinateur, l'aperçu montre en rouge ce qui gêne.`;
    else if (outil === "terrain") txt = `Touche un carré en pointillés collé à ton terrain pour l'acheter : ${PARCELLE} × ${PARCELLE} cases pour ${prixParcelle()} pièces (le prix monte un peu à chaque achat).`;
    else if (TAILLES[outil]) txt = `Touche la carte pour poser : ${ELEMENTS[outil].nom}. Il prend ${TAILLES[outil][0]} × ${TAILLES[outil][1]} cases libres — ${ELEMENTS[outil].prix} pièces.`;
    else txt = `Touche une case vide pour poser : ${ELEMENTS[outil].nom} (${ELEMENTS[outil].prix} pièces). Touche l'élément à nouveau pour arrêter.`;
    $("#ty-consigne").textContent = txt;
    $("#ty-tourner").hidden = !(outil && outil.startsWith("kit:"));
    canvas.classList.toggle("outil-actif", !!outil);
    $("#ty-cases").textContent = `${Object.keys(etat.carte).length} / ${etat.parcelles.length * PARCELLE * PARCELLE} cases`;
  }

  /* =======================================================
     7. DÉFIS GOLF + GAINS DU JOUR
     (dans le code, les défis s'appellent encore « habitudes »)
     ======================================================= */

  function rendreGains() {
    const auj = cleJour();
    const jour = etat.journal[auj] || {};
    const auto = Object.entries(jour).filter(([cle]) => !cle.startsWith("h:"));
    const total = Object.values(jour).reduce((s, v) => s + v.g, 0);
    $("#ty-gains").innerHTML = auto.length
      ? auto.map(([, v]) => `<li><span>${esc(v.i)}</span><span class="ty-gain-nom">${esc(v.l)}</span><b>+${v.g}</b></li>`).join("")
      : `<li class="ty-vide">Rien encore aujourd'hui. Coche un exo dans « Aujourd'hui », fais un exercice 🧠 Mental ou termine une partie ⛳.</li>`;
    $("#ty-total-jour").textContent = total ? `${total} pièces aujourd'hui` : "";
  }

  function rendreHabitudes() {
    const liste = $("#ty-habitudes");
    const jour = etat.journal[cleJour()] || {};
    const bonus = bonusSerie();
    liste.innerHTML = "";
    if (!etat.habitudes.length) liste.innerHTML = '<p class="ty-vide">Aucun défi. Ajoute-en un : putting, chipping, practice ou partie.</p>';
    for (const h of etat.habitudes) {
      const fait = jour["h:" + h.id];
      const gain = fait ? fait.g : avecBonus(h.recompense, bonus);
      const cat = CATEGORIES_DEFIS[h.cat] || "Défi";
      const ligne = document.createElement("div");
      ligne.className = "ty-habitude" + (fait ? " faite" : "");
      ligne.innerHTML = `
        <span class="ty-h-icone">${esc(h.icone)}</span>
        <div class="ty-h-texte">
          <div class="ty-h-nom">${esc(h.nom)}</div>
          <div class="ty-h-gain">${esc(cat)}${h.auto ? ' · <span class="ty-tag">🤖 auto</span>' : ""} · ${fait ? "Gagné" : "Rapporte"} <b>${gain}</b> <span class="ty-piece"></span></div>
        </div>
        <button type="button" class="ty-h-edit" aria-label="Modifier">✎</button>
        ${h.auto
          ? `<span class="ty-h-check ty-h-auto" title="Validé tout seul à la fin d'une partie notée dans ⛳ Parcours">${fait ? "✓" : "⛳"}</span>`
          : `<button type="button" class="ty-h-check" aria-label="${fait ? "Annuler" : "Valider"} ${esc(h.nom)}">${fait ? "✓" : ""}</button>`}`;
      if (!h.auto) ligne.querySelector(".ty-h-check").addEventListener("click", (ev) => basculerHabitude(h.id, ev.currentTarget));
      ligne.querySelector(".ty-h-edit").addEventListener("click", () => ouvrirModale(h.id));
      liste.appendChild(ligne);
    }
  }

  // Valider / annuler un défi coché à la main (pas les défis « auto »)
  function basculerHabitude(id, bouton) {
    const h = etat.habitudes.find((x) => x.id === id);
    if (!h || h.auto) return;
    const auj = cleJour();
    const jour = etat.journal[auj] || (etat.journal[auj] = {});
    const cle = "h:" + id;
    if (jour[cle]) {   // annuler : on reprend les pièces
      const g = jour[cle].g;
      if (etat.pieces < g) {
        son("erreur");
        secouer($("#ty-compteur"));
        toast(`Impossible d'annuler : les ${g} pièces sont déjà dépensées.`);
        return;
      }
      etat.pieces -= g;
      etat.totalFaits = Math.max(0, etat.totalFaits - 1);
      delete jour[cle];
      if (!Object.keys(jour).length) delete etat.journal[auj];
      sauvegarder();
      son("decoche");
      rafraichir(false);
      animerPieces();
      return;
    }
    const ancienNiveau = niveau();
    const etaitJaune = gazonJaune();
    const g = ajouterGain(auj, cle, h.recompense, h.nom, h.icone);
    sauvegarder();
    celebrerGain(bouton, g, ancienNiveau, etaitJaune);
    rafraichir(false);
  }

  // --- Fenêtre : catalogue de défis, ou formulaire (créer / modifier) ---
  let habitudeEditee = null;
  let iconeChoisie = ICONES[0];
  let recompenseChoisie = 25;
  let categorieChoisie = "practice";

  function creerModale() {
    const m = document.createElement("div");
    m.id = "ty-modale";
    m.className = "ty-modale";
    m.hidden = true;
    m.innerHTML = `
      <div class="ty-modale-boite">
        <div id="ty-m-catalogue">
          <h3>Ajouter un défi golf</h3>
          <p class="petit">Des défis de performance à réussir. Les défis 🤖 auto se valident tout seuls quand une partie notée dans ⛳ Parcours remplit la condition. Exemples à adapter à ton niveau (✎).</p>
          <div id="ty-m-liste"></div>
          <div class="ty-modale-actions">
            <button type="button" class="bouton" id="ty-m-creer">✏️ Créer mon défi</button>
            <span class="ty-espace"></span>
            <button type="button" class="bouton principal" data-ty-fermer>Fermer</button>
          </div>
        </div>
        <form id="ty-m-form" autocomplete="off" hidden>
          <h3 id="ty-modale-titre">Mon défi</h3>
          <label class="ty-label">Défi (avec un objectif chiffré)
            <input type="text" id="ty-f-nom" class="champ" maxlength="60" required placeholder="Ex. : 20 putts de 2 m, 15 rentrés">
          </label>
          <div class="ty-label">Catégorie</div>
          <div class="ty-segments ty-cats">${Object.entries(CATEGORIES_DEFIS).filter(([c]) => c !== "parcours")
            .map(([c, n]) => `<button type="button" data-c="${c}">${n}</button>`).join("")}</div>
          <div class="ty-label">Icône</div>
          <div class="ty-icones">${ICONES.map((i) => `<button type="button" data-i="${i}">${i}</button>`).join("")}</div>
          <div class="ty-label">Récompense (facile · moyen · difficile)</div>
          <div class="ty-segments ty-recompenses">${[10, 25, 50].map((v) => `<button type="button" data-v="${v}"><span class="ty-piece"></span>${v}</button>`).join("")}</div>
          <div class="ty-modale-actions">
            <button type="button" class="bouton" id="ty-f-supprimer">Supprimer</button>
            <span class="ty-espace"></span>
            <button type="button" class="bouton" data-ty-fermer>Annuler</button>
            <button type="submit" class="bouton principal">Enregistrer</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(m);

    m.querySelectorAll(".ty-icones button").forEach((b) => b.addEventListener("click", () => { iconeChoisie = b.dataset.i; majChoixModale(); son("clic"); }));
    m.querySelectorAll(".ty-recompenses button").forEach((b) => b.addEventListener("click", () => { recompenseChoisie = Number(b.dataset.v); majChoixModale(); son("clic"); }));
    m.querySelectorAll(".ty-cats button").forEach((b) => b.addEventListener("click", () => { categorieChoisie = b.dataset.c; majChoixModale(); son("clic"); }));
    m.querySelectorAll("[data-ty-fermer]").forEach((b) => b.addEventListener("click", () => { m.hidden = true; }));
    m.addEventListener("click", (ev) => { if (ev.target === m) m.hidden = true; });
    $("#ty-m-creer").addEventListener("click", () => ouvrirFormulaire(null));

    // Catalogue : un appui ajoute le défi (la fenêtre reste ouverte pour en ajouter d'autres)
    $("#ty-m-liste").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-ref]");
      if (!b || b.disabled) return;
      const defi = defiDuCatalogue(b.dataset.ref);
      if (!defi || etat.habitudes.some((h) => h.id === defi.id)) return;
      etat.habitudes.push(defi);
      sauvegarder();
      son("clic");
      rendreCatalogue();
      rendreHabitudes();
      synchroniser(null);   // un défi auto peut déjà être rempli par une partie d'aujourd'hui
    });

    m.querySelector("form").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const nom = $("#ty-f-nom").value.trim();
      if (!nom) return;
      const h = etat.habitudes.find((x) => x.id === habitudeEditee);
      if (h) {
        Object.assign(h, { nom, icone: iconeChoisie, recompense: recompenseChoisie });
        if (!h.auto) h.cat = categorieChoisie;
      } else {
        etat.habitudes.push({ id: "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nom, icone: iconeChoisie, recompense: recompenseChoisie, cat: categorieChoisie });
      }
      sauvegarder();
      m.hidden = true;
      rendreHabitudes();
    });
    $("#ty-f-supprimer").addEventListener("click", () => {
      const h = etat.habitudes.find((x) => x.id === habitudeEditee);
      if (!h || !confirm(`Retirer le défi « ${h.nom} » ? (le calendrier garde l'historique)`)) return;
      etat.habitudes = etat.habitudes.filter((x) => x.id !== habitudeEditee);
      sauvegarder();
      m.hidden = true;
      rendreHabitudes();
    });
  }

  function rendreCatalogue() {
    const actifs = new Set(etat.habitudes.map((h) => h.id));
    $("#ty-m-liste").innerHTML = Object.entries(CATEGORIES_DEFIS).map(([cat, nomCat]) => {
      const defis = CATALOGUE_DEFIS.filter((d) => d.cat === cat);
      return `<div class="ty-label">${nomCat}</div>` + defis.map((d) => `
        <button type="button" class="ty-m-defi" data-ref="${d.ref}" ${actifs.has(d.ref) ? "disabled" : ""}>
          <span class="ty-m-icone">${d.icone}</span>
          <span class="ty-m-nom">${esc(d.nom)}${d.auto ? ' <span class="ty-tag">🤖 auto</span>' : ""}</span>
          <span class="ty-m-prix">${actifs.has(d.ref) ? "✓ ajouté" : `<span class="ty-piece"></span> ${d.recompense}`}</span>
        </button>`).join("");
    }).join("");
  }

  function majChoixModale() {
    document.querySelectorAll(".ty-icones button").forEach((b) => b.classList.toggle("choisi", b.dataset.i === iconeChoisie));
    document.querySelectorAll(".ty-recompenses button").forEach((b) => b.classList.toggle("choisi", Number(b.dataset.v) === recompenseChoisie));
    document.querySelectorAll(".ty-cats button").forEach((b) => b.classList.toggle("choisi", b.dataset.c === categorieChoisie));
  }

  // Formulaire : id = défi à modifier, null = nouveau défi perso
  function ouvrirFormulaire(id) {
    habitudeEditee = id;
    const h = id ? etat.habitudes.find((x) => x.id === id) : null;
    $("#ty-m-catalogue").hidden = true;
    $("#ty-m-form").hidden = false;
    $("#ty-modale-titre").textContent = h ? "Modifier le défi" : "Mon défi";
    $("#ty-f-nom").value = h ? h.nom : "";
    iconeChoisie = h ? h.icone : ICONES[0];
    recompenseChoisie = h ? h.recompense : 25;
    categorieChoisie = h && h.cat && h.cat !== "parcours" ? h.cat : "practice";
    // La catégorie d'un défi auto (sur le parcours) ne change pas
    document.querySelector(".ty-cats").hidden = !!(h && h.auto);
    document.querySelector(".ty-cats").previousElementSibling.hidden = !!(h && h.auto);
    $("#ty-f-supprimer").hidden = !h;
    majChoixModale();
  }

  // id = défi à modifier ; sans id = catalogue pour en ajouter
  function ouvrirModale(id = null) {
    if (!$("#ty-modale")) creerModale();
    if (id) {
      ouvrirFormulaire(id);
    } else {
      $("#ty-m-catalogue").hidden = false;
      $("#ty-m-form").hidden = true;
      rendreCatalogue();
    }
    $("#ty-modale").hidden = false;
  }

  /* =======================================================
     8. CALENDRIER (heatmap 6 mois)
     ======================================================= */

  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const SEMAINES = 26;

  function rendreCalendrier() {
    const hm = $("#ty-heatmap");
    const auj = cleJour();
    const jourSemaine = (dateDe(auj).getDay() + 6) % 7;   // 0 = lundi
    const premierLundi = decaler(auj, -jourSemaine - (SEMAINES - 1) * 7);
    let html = '<div class="ty-hm-col"><span class="ty-hm-mois"></span>' +
      ["L", "", "M", "", "V", "", "D"].map((l) => `<span class="ty-hm-lib">${l}</span>`).join("") + "</div>";
    for (let s = 0; s < SEMAINES; s++) {
      const lundi = decaler(premierLundi, s * 7);
      let libelle = "";
      for (let k = 0; k < 7; k++) {
        const d = dateDe(decaler(lundi, k));
        if (d.getDate() === 1) { libelle = MOIS[d.getMonth()]; break; }
      }
      if (s === 0 && !libelle && dateDe(lundi).getDate() < 20) libelle = MOIS[dateDe(lundi).getMonth()];
      html += `<div class="ty-hm-col"><span class="ty-hm-mois">${libelle}</span>`;
      for (let k = 0; k < 7; k++) {
        const cle = decaler(lundi, k);
        if (cle > auj) { html += '<span class="ty-hm-case futur"></span>'; continue; }
        const n = nbJour(cle);
        html += `<button type="button" class="ty-hm-case${n ? " l" + Math.min(n, 4) : ""}${cle === auj ? " aujourdhui" : ""}" data-jour="${cle}" aria-label="${cle} : ${n}"></button>`;
      }
      html += "</div>";
    }
    hm.innerHTML = html;

    let actifs = 0;
    for (let i = 0; i < SEMAINES * 7; i++) if (nbJour(decaler(auj, -i)) > 0) actifs++;
    const gagne = Object.values(etat.journal).reduce((s, j) => s + Object.values(j).reduce((a, v) => a + (v.g || 0), 0), 0);
    $("#ty-stats").innerHTML = `
      <div class="ty-stat"><b>${actifs}</b><span>jours actifs (6 mois)</span></div>
      <div class="ty-stat"><b>${gagne}</b><span>pièces gagnées au total</span></div>`;
  }
  function detailJour(cle) {
    const jour = etat.journal[cle] || {};
    const libelle = dateDe(cle).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const items = Object.values(jour).map((v) => v.i + " " + v.l);
    $("#ty-info-jour").textContent = `${libelle} : ${items.length ? items.join(", ") : "rien"}`;
  }

  /* =======================================================
     8 bis. MON GOLFEUR + PARCOURS DES AUTRES (partie simulée)
     -------------------------------------------------------
     - Le golfeur a 5 notes sur 100 (drive, fers, petit jeu, putting,
       mental), calculées avec les VRAIS résultats du joueur : jeux de
       putting (exos-points.js), jeux du practice (jeux-zones.js), parties
       notées (parcours.js), exercices mentaux et exos cochés.
     - Les trous du parcours sont trouvés tout seuls : un green (numéroté)
       + le départ le plus proche. Par et obstacles viennent de la carte.
     - On publie son parcours en ligne (Firestore « parcoursTycoon », règles
       dans outils/regles-firestore.txt), on joue celui des autres : le
       golfeur fait le score trou par trou (au hasard, selon ses notes),
       1 partie officielle par jour et par parcours, classement
       « scoresTycoon ». Les données reçues sont vérifiées et échappées.
     ======================================================= */

  // Partie en ligne (publier / jouer chez les autres) : désactivée tant que les règles
  // Firestore (outils/regles-firestore.txt) n'ont pas été recollées dans la console
  // Firebase — choix de l'utilisateur, « on fera plus tard ». Mettre true pour l'activer.
  const TYCOON_EN_LIGNE = false;
  const COLLECTION_PARCOURS_TY = "parcoursTycoon";
  const COLLECTION_SCORES_TY = "scoresTycoon";
  const METRES_PAR_CASE = 28;
  const borne = (v, a, b) => Math.max(a, Math.min(b, v));

  // --- Les 5 notes du golfeur ---
  // Taux de réussite (0 à 1) des derniers tours des jeux interactifs d'une catégorie
  function categorieFiche(id) {
    const f = typeof toutesLesFiches !== "undefined" ? toutesLesFiches.find((x) => x.id === id) : null;
    return f ? f.categorie : null;
  }
  function tauxJeuxPoints(categories) {
    if (typeof EXOS_POINTS === "undefined" || typeof toursDe !== "function") return null;
    let ok = 0, total = 0;
    for (const [exo, config] of Object.entries(EXOS_POINTS)) {
      if (!categories.includes(categorieFiche(config.idFiche))) continue;
      for (const t of toursDe(exo).slice(-15)) { if (t.total > 0) { ok += t.rentres; total += t.total; } }
    }
    return total >= 10 ? ok / total : null;
  }
  function tauxJeuxZones(categories) {
    if (typeof JEUX_ZONES === "undefined") return null;
    let pts = 0, total = 0;
    for (const [id, jeu] of Object.entries(JEUX_ZONES)) {
      if (!categories.includes(categorieFiche(id))) continue;
      const valeur = {};
      for (const z of jeu.zones) valeur[z.id] = z.classe === "bon" ? 1 : z.classe === "moyen" ? .5 : 0;
      const tours = lireStockage(`zones-${id}-tours`, [], typeof PREFIXE_SCORES !== "undefined" ? PREFIXE_SCORES : "golf-scores-v1:");
      for (const t of (Array.isArray(tours) ? tours : []).slice(-10)) {
        for (const ph of (t && Array.isArray(t.phases) ? t.phases : [])) {
          for (const [z, n] of Object.entries(ph.comptes || {})) {
            if (Number.isFinite(n) && z in valeur) { pts += valeur[z] * n; total += n; }
          }
        }
      }
    }
    return total >= 10 ? pts / total : null;
  }
  // Statistiques des 10 dernières parties notées : fairways et greens en régulation
  function tauxParties() {
    if (typeof partiesTerminees !== "function") return { fw: null, gir: null };
    let fw = 0, fwN = 0, gir = 0, girN = 0;
    for (const p of partiesTerminees().slice(-10)) {
      for (const t of (Array.isArray(p.trous) ? p.trous : [])) {
        if (!t || !Number.isFinite(t.score)) continue;
        if (t.par >= 4 && t.fairway) { fwN++; if (t.fairway === "ok") fw++; }
        if (Number.isFinite(t.putts)) { girN++; if (t.score - t.putts <= t.par - 2) gir++; }
      }
    }
    return { fw: fwN >= 5 ? fw / fwN : null, gir: girN >= 9 ? gir / girN : null };
  }
  // Nombre d'actions récompensées sur 30 jours dont la clé passe le filtre
  function compte30Jours(filtre) {
    let n = 0;
    for (let i = 0; i < 30; i++) for (const cle of Object.keys(etat.journal[decaler(cleJour(), -i)] || {})) if (filtre(cle)) n++;
    return n;
  }
  // Note sur 100 : moyenne des sources disponibles (taux 0-1 -> 20 à 95), 50 sans données
  function noteSur100(sources) {
    const ok = sources.filter((s) => s.v != null);
    if (!ok.length) return { valeur: 50, detail: "pas encore de données" };
    const v = ok.reduce((t, s) => t + s.v, 0) / ok.length;
    return { valeur: Math.round(20 + 75 * v), detail: ok.map((s) => s.nom).join(" + ") };
  }
  function statsGolfeur() {
    const parties = tauxParties();
    const exosCat = (cats) => compte30Jours((k) => k.startsWith("exo:") && cats.includes(categorieFiche(k.slice(4))));
    const defisCat = (cats) => compte30Jours((k) => k.startsWith("h:") && cats.includes((etat.habitudes.find((h) => "h:" + h.id === k) || {}).cat));
    const petitJeu = exosCat(["chipping", "bunker"]) + defisCat(["chipping", "bunker"]);
    const mental = compte30Jours((k) => k.startsWith("mental:"));
    return {
      drive: noteSur100([{ nom: "jeux de drive", v: tauxJeuxZones(["drive"]) }, { nom: "fairways en partie", v: parties.fw }]),
      fers: noteSur100([{ nom: "jeux de fers", v: tauxJeuxPoints(["fers", "approches"]) }, { nom: "cibles au practice", v: tauxJeuxZones(["fers", "approches"]) }, { nom: "greens en régulation", v: parties.gir }]),
      petitJeu: noteSur100([{ nom: `${petitJeu} exos/défis chipping-bunker (30 j)`, v: petitJeu ? Math.min(1, .3 + petitJeu * .05) : null }]),
      putting: noteSur100([{ nom: "jeux de putting", v: tauxJeuxPoints(["putting"]) }]),
      mental: noteSur100([{ nom: `${mental} exercices mentaux (30 j)`, v: mental ? Math.min(1, .3 + mental * .05) : null }]),
    };
  }
  const NOMS_STATS = { drive: "🚀 Drive", fers: "🎯 Fers", petitJeu: "🏖️ Petit jeu", putting: "🕳️ Putting", mental: "🧠 Mental" };

  // --- Les trous de mon parcours (pour les publier ou les jouer) ---
  function groupesDe(type) {
    const vus = new Set(), groupes = [];
    for (const [cle, t] of Object.entries(etat.carte)) {
      if (t !== type || vus.has(cle)) continue;
      const cases = [], pile = [cle];
      vus.add(cle);
      while (pile.length) {
        const k = pile.pop(); cases.push(k);
        const [x, y] = k.split(",").map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const v = (x + dx) + "," + (y + dy);
          if (etat.carte[v] === type && !vus.has(v)) { vus.add(v); pile.push(v); }
        }
      }
      const pts = cases.map((k) => k.split(",").map(Number));
      groupes.push({ cx: pts.reduce((t, p) => t + p[0] + .5, 0) / pts.length, cy: pts.reduce((t, p) => t + p[1] + .5, 0) / pts.length });
    }
    return groupes;
  }
  function mesTrous() {
    const departs = groupesDe("depart");
    const pris = new Set();
    const trous = [], sansDepart = [];
    for (const g of groupesDeGreens()) {
      const gx = g.tx, gy = g.ty;
      // Départ libre le plus proche (à moins de 30 cases)
      let meilleur = -1, dMin = 30;
      departs.forEach((d, i) => {
        const dist = Math.hypot(d.cx - gx, d.cy - gy);
        if (!pris.has(i) && dist < dMin && dist >= 3) { dMin = dist; meilleur = i; }
      });
      if (meilleur < 0) { sansDepart.push(g.numero); continue; }
      pris.add(meilleur);
      const d = departs[meilleur];
      // Obstacles dans un couloir de 1,5 case de part et d'autre de la ligne départ -> green
      const comptes = { fairway: 0, bunker: 0, lac: 0, arbre: 0, autres: 0 };
      const x0 = Math.floor(Math.min(d.cx, gx)) - 2, x1 = Math.ceil(Math.max(d.cx, gx)) + 2;
      const y0 = Math.floor(Math.min(d.cy, gy)) - 2, y1 = Math.ceil(Math.max(d.cy, gy)) + 2;
      const lx = gx - d.cx, ly = gy - d.cy, l2 = lx * lx + ly * ly;
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const px = x + .5, py = y + .5;
        const t = borne(((px - d.cx) * lx + (py - d.cy) * ly) / l2, 0, 1);
        if (Math.hypot(px - d.cx - t * lx, py - d.cy - t * ly) > 1.5) continue;
        const type = typeDe(x + "," + y);
        if (type in comptes) comptes[type]++;
        else if (type !== "green" && type !== "depart") comptes.autres++;
      }
      const longueur = Math.hypot(lx, ly);
      const couloir = comptes.fairway + comptes.bunker + comptes.lac + comptes.arbre + comptes.autres || 1;
      trous.push({
        n: g.numero,
        par: longueur <= 9 ? 3 : longueur <= 15 ? 4 : 5,
        l: Math.round(longueur * METRES_PAR_CASE),
        fw: Math.round(100 * comptes.fairway / couloir),
        b: comptes.bunker, e: comptes.lac, a: comptes.arbre,
      });
    }
    trous.sort((a, b) => a.n - b.n);
    return { trous: trous.slice(0, 18), sansDepart };
  }
  function texteTrou(t) {
    const obst = [t.e ? `💦 ${t.e}` : "", t.b ? `🏖️ ${t.b}` : "", t.a ? `🌲 ${t.a}` : ""].filter(Boolean).join(" ");
    return `Trou ${t.n} · Par ${t.par} · ${t.l} m${obst ? " · " + obst : ""}`;
  }

  // --- Simulation d'un trou : renvoie { coups, recit: [...] } ---
  function simulerTrou(t, S) {
    const r = Math.random;
    const m = .04 * S.mental;
    let coups = 0, surGreen = false, situation = "fairway", puttLong = false;
    const recit = [];
    if (t.par >= 4) {
      coups++;
      const pFw = borne(.3 + .5 * S.drive + .15 * t.fw / 100 - .02 * t.a + m, .1, .92);
      if (r() < pFw) { situation = "fairway"; recit.push("🚀 Drive au milieu du fairway"); }
      else if (t.e && r() < .15 + .02 * t.e) { coups++; situation = "rough"; recit.push("💦 Drive dans l'eau (+1)"); }
      else if (t.b && r() < .3) { situation = "bunker"; recit.push("🏖️ Drive dans un bunker de fairway"); }
      else { situation = "rough"; recit.push(t.a > 2 && r() < .5 ? "🌲 Drive derrière les arbres" : "🌾 Drive dans le rough"); }
    }
    if (t.par === 5) {
      coups++;
      if (situation === "fairway" && S.drive > .55 && r() < .4) {
        if (r() < borne(.12 + .35 * S.fers + m, .05, .6)) { surGreen = true; puttLong = true; recit.push("💥 Attaque du green en 2 : réussie !"); }
        else { situation = "autour"; recit.push("💥 Attaque du green en 2 : ratée, à côté du green"); }
      } else {
        situation = r() < .75 + .2 * S.fers ? "fairway" : "rough";
        recit.push(situation === "fairway" ? "➡️ Lay-up sur le fairway" : "➡️ Lay-up dans le rough");
      }
    }
    if (!surGreen && situation !== "autour") {
      coups++;
      let p = .2 + .55 * S.fers + m + (t.par === 3 ? .05 : 0) - .015 * t.b;
      if (situation === "rough") p -= .15;
      if (situation === "bunker") p -= .22;
      if (r() < borne(p, .05, .9)) { surGreen = true; recit.push(t.par === 3 ? "🎯 Départ sur le green" : "🎯 Approche sur le green"); }
      else if (t.e && r() < .15 + .03 * t.e) { coups++; situation = "autour"; recit.push("💦 Dans l'eau (+1)"); }
      else if (t.b && r() < .35) { situation = "bunkerGreen"; recit.push("🏖️ Dans le bunker du green"); }
      else { situation = "autour"; recit.push("😐 Green manqué"); }
    }
    if (!surGreen) {
      coups++;
      const pUD = borne(.2 + .45 * S.petitJeu + .15 * S.putting + m - (situation === "bunkerGreen" ? .12 : 0), .05, .88);
      if (r() < pUD) { coups++; recit.push(situation === "bunkerGreen" ? "🏖️ Sortie près du trou, 1 putt" : "⛳ Chip près du trou, 1 putt"); }
      else if (r() < .08 + .15 * (1 - S.petitJeu)) { coups += 3; recit.push("😣 Chip raté, puis 2 putts"); }
      else { coups += 2; recit.push(situation === "bunkerGreen" ? "🏖️ Sortie, puis 2 putts" : "⛳ Chip, puis 2 putts"); }
      return { coups, recit };
    }
    const x = r();
    const p1 = (puttLong ? .06 : .1) + .2 * S.putting + m / 2;
    const p3 = (puttLong ? .22 : .16) - .13 * S.putting;
    if (x < p1) { coups += 1; recit.push("🕳️ 1 putt !"); }
    else if (x < p1 + p3) { coups += 3; recit.push("😬 3 putts"); }
    else { coups += 2; recit.push("🕳️ 2 putts"); }
    return { coups, recit };
  }
  function nomScore(ecart) {
    return ecart <= -2 ? "🦅 Eagle" : ecart === -1 ? "🐦 Birdie" : ecart === 0 ? "✅ Par" : ecart === 1 ? "Bogey" : ecart === 2 ? "Double bogey" : `+${ecart}`;
  }
  const texteEcart = (e) => (e === 0 ? "par" : e > 0 ? `+${e}` : String(e));

  // --- En ligne : publier, lister, classement ---
  function messageErreurEnLigne(e) {
    if (e && e.code === "permission-denied") return "Partage pas encore activé : il faut recoller les règles Firestore (fichier outils/regles-firestore.txt) dans la console Firebase.";
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "Pas de réseau pour l'instant.";
    return "Impossible de joindre le serveur pour l'instant. Réessaie plus tard.";
  }
  async function enLigne() {
    if (typeof demarrerPartage !== "function" || !(await demarrerPartage())) throw { code: "hors-ligne" };
  }
  async function publierParcours() {
    const zone = $("#ty-etat-partage");
    const nom = $("#ty-nom-golf").value.trim().slice(0, 40);
    const joueur = typeof nomDuJoueur === "function" ? nomDuJoueur() : "";
    const { trous } = mesTrous();
    if (!nom) { zone.textContent = "Donne un nom à ton golf."; return; }
    if (!trous.length) { zone.textContent = "Ton parcours n'a pas encore de trou jouable : il faut un green et un départ 🟩."; return; }
    if (!joueur) { zone.textContent = "Ton nom de joueur manque (première page du site)."; return; }
    etat.nomGolf = nom; sauvegarder();
    zone.textContent = "Envoi…";
    try {
      await enLigne();
      await baseDeDonnees.collection(COLLECTION_PARCOURS_TY).doc(idAppareil).set({
        uid: idAppareil, joueur: joueur.slice(0, 40), nom, trous, majLe: firebase.firestore.FieldValue.serverTimestamp(),
      });
      zone.textContent = `✅ « ${nom} » est en ligne (${trous.length} trou${trous.length > 1 ? "s" : ""}). Les autres joueurs peuvent venir le jouer !`;
      son("niveau");
    } catch (e) { zone.textContent = "⚠️ " + messageErreurEnLigne(e); }
  }
  // Données reçues d'internet : on ne garde que ce qui est bien formé
  function normaliserParcoursEnLigne(id, d) {
    if (!d || typeof d !== "object" || !Array.isArray(d.trous)) return null;
    const ent = (v, a, b) => (Number.isFinite(v) ? borne(Math.round(v), a, b) : null);
    const trous = d.trous.slice(0, 18).map((t) => t && ({
      n: ent(t.n, 1, 99), par: [3, 4, 5].includes(t.par) ? t.par : null, l: ent(t.l, 0, 1000),
      fw: ent(t.fw, 0, 100), b: ent(t.b, 0, 99), e: ent(t.e, 0, 99), a: ent(t.a, 0, 99),
    })).filter((t) => t && t.n && t.par && t.l != null && t.fw != null && t.b != null && t.e != null && t.a != null);
    if (!trous.length) return null;
    return { id, joueur: String(d.joueur || "?").slice(0, 40), nom: String(d.nom || "Golf").slice(0, 40), trous };
  }
  let parcoursEnLigne = [];
  async function chargerParcoursDesAutres() {
    const zone = $("#ty-liste-parcours");
    zone.innerHTML = '<p class="petit">Chargement…</p>';
    try {
      await enLigne();
      const snap = await baseDeDonnees.collection(COLLECTION_PARCOURS_TY).limit(60).get();
      parcoursEnLigne = snap.docs.map((doc) => normaliserParcoursEnLigne(doc.id, doc.data())).filter(Boolean)
        .filter((p) => p.id !== idAppareil);
      rendreListeParcours();
    } catch (e) { zone.innerHTML = `<p class="petit">⚠️ ${esc(messageErreurEnLigne(e))}</p>`; }
  }
  function rendreListeParcours() {
    const zone = $("#ty-liste-parcours");
    if (!parcoursEnLigne.length) { zone.innerHTML = '<p class="petit">Personne n\'a encore publié de parcours. Publie le tien en premier !</p>'; return; }
    const auj = cleJour();
    zone.innerHTML = parcoursEnLigne.map((p) => {
      const par = p.trous.reduce((t, x) => t + x.par, 0);
      const dejaJoue = etat.joues[p.id] === auj;
      return `<div class="ty-parcours">
        <div class="ty-parcours-texte"><b>${esc(p.nom)}</b><span class="petit">de ${esc(p.joueur)} · ${p.trous.length} trou${p.trous.length > 1 ? "s" : ""} · par ${par}</span></div>
        <button type="button" class="bouton" data-classement="${esc(p.id)}">🏆</button>
        <button type="button" class="bouton principal" data-jouer="${esc(p.id)}" ${dejaJoue ? "disabled" : ""}>${dejaJoue ? "Joué ✓" : "▶ Jouer"}</button>
      </div>`;
    }).join("");
  }
  async function envoyerScoreEnLigne(parcours, total, par) {
    const joueur = typeof nomDuJoueur === "function" ? nomDuJoueur() : "";
    if (!joueur) return "Score non envoyé : ton nom de joueur manque.";
    try {
      await enLigne();
      const ref = baseDeDonnees.collection(COLLECTION_SCORES_TY).doc(`${parcours.id}_${idAppareil}`);
      const ancien = await ref.get();
      const a = ancien.exists ? ancien.data() : null;
      // On garde le meilleur score (par rapport au par) de ce joueur sur ce parcours
      if (a && Number.isFinite(a.score) && Number.isFinite(a.par) && a.trous === parcours.trous.length && a.score - a.par <= total - par) return "";
      await ref.set({
        uid: idAppareil, joueur: joueur.slice(0, 40), parcours: parcours.id, score: total, par,
        trous: parcours.trous.length, date: cleJour(), majLe: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return "";
    } catch (e) { return "⚠️ " + messageErreurEnLigne(e); }
  }
  async function classementHTML(parcours) {
    try {
      await enLigne();
      const snap = await baseDeDonnees.collection(COLLECTION_SCORES_TY).where("parcours", "==", parcours.id).limit(100).get();
      const lignes = snap.docs.map((d) => d.data()).filter((s) => s && Number.isFinite(s.score) && Number.isFinite(s.par))
        .map((s) => ({ joueur: String(s.joueur || "?").slice(0, 40), ecart: s.score - s.par, score: s.score, moi: s.uid === idAppareil }))
        .sort((a, b) => a.ecart - b.ecart).slice(0, 10);
      if (!lignes.length) return '<p class="petit">Pas encore de score sur ce parcours.</p>';
      return '<ol class="ty-classement">' + lignes.map((l) =>
        `<li class="${l.moi ? "moi" : ""}"><span>${esc(l.joueur)}</span><b>${l.score} (${texteEcart(l.ecart)})</b></li>`).join("") + "</ol>";
    } catch (e) { return `<p class="petit">⚠️ ${esc(messageErreurEnLigne(e))}</p>`; }
  }

  // --- La partie à l'écran (fenêtre plein écran, trou par trou) ---
  function fenetrePartie() {
    let f = $("#ty-partie");
    if (!f) {
      f = document.createElement("div");
      f.id = "ty-partie";
      f.className = "ty-modale";
      f.innerHTML = '<div class="ty-modale-boite ty-partie-boite"><div id="ty-partie-contenu"></div><div class="ty-modale-actions"><span class="ty-espace"></span><button type="button" class="bouton principal" id="ty-partie-fermer">Fermer</button></div></div>';
      document.body.appendChild(f);
      $("#ty-partie-fermer").addEventListener("click", () => { f.hidden = true; partieEnCours = null; });
    }
    f.hidden = false;
    return $("#ty-partie-contenu");
  }
  let partieEnCours = null;
  async function jouerParcours(parcours, officielle) {
    const S = {};
    for (const [k, v] of Object.entries(statsGolfeur())) S[k] = v.valeur / 100;
    const zone = fenetrePartie();
    const par = parcours.trous.reduce((t, x) => t + x.par, 0);
    zone.innerHTML = `<h3>⛳ ${esc(parcours.nom)}</h3>
      <p class="petit">${officielle ? `Parcours de ${esc(parcours.joueur)} · partie officielle (1 par jour)` : "Entraînement sur ton parcours (pas de classement)"} · par ${par}</p>
      <ol class="ty-carte-score" id="ty-carte-score"></ol>
      <div class="ty-total-partie" id="ty-total-partie"></div>
      <div id="ty-classement-partie"></div>`;
    if (officielle) { etat.joues[parcours.id] = cleJour(); sauvegarder(); }
    const jeton = partieEnCours = {};
    let total = 0, ecart = 0;
    const resultats = [];
    for (const t of parcours.trous) {
      await new Promise((ok) => setTimeout(ok, 900));
      if (partieEnCours !== jeton) return;   // fenêtre fermée
      const res = simulerTrou(t, S);
      total += res.coups; ecart += res.coups - t.par;
      resultats.push(res.coups - t.par);
      const li = document.createElement("li");
      li.className = "ty-trou-joue " + (res.coups < t.par ? "sous" : res.coups === t.par ? "par" : "sur");
      li.innerHTML = `<div class="ty-trou-tete"><b>Trou ${t.n}</b> <span class="petit">Par ${t.par} · ${t.l} m</span><span class="ty-trou-score">${res.coups} · ${nomScore(res.coups - t.par)}</span></div>
        <div class="petit">${res.recit.map(esc).join(" → ")}</div>`;
      $("#ty-carte-score").appendChild(li);
      li.scrollIntoView({ block: "nearest", behavior: "smooth" });
      son(res.coups < t.par ? "reverdit" : res.coups === t.par ? "clic" : "decoche");
      $("#ty-total-partie").textContent = `Total : ${total} (${texteEcart(ecart)})`;
    }
    const birdies = resultats.filter((e) => e < 0).length;
    $("#ty-total-partie").innerHTML = `🏁 Score final : <b>${total}</b> (${texteEcart(ecart)})${birdies ? ` · ${birdies} birdie${birdies > 1 ? "s" : ""} ou mieux` : ""}`;
    if (ecart < 0) { son("niveau"); confettis(); }
    etat.resultatsVirtuels.push({ d: cleJour(), nom: parcours.nom.slice(0, 40), score: total, par });
    etat.resultatsVirtuels = etat.resultatsVirtuels.slice(-30);
    sauvegarder();
    if (officielle) {
      $("#ty-classement-partie").innerHTML = '<p class="petit">Envoi du score…</p>';
      const erreur = await envoyerScoreEnLigne(parcours, total, par);
      $("#ty-classement-partie").innerHTML = (erreur ? `<p class="petit">${esc(erreur)}</p>` : "") + "<h4>🏆 Classement</h4>" + await classementHTML(parcours);
      rendreListeParcours();
    }
  }

  // --- Affichage du bloc dans l'onglet ---
  function rendreGolfeur() {
    const stats = statsGolfeur();
    const moyenne = Object.values(stats).reduce((t, s) => t + s.valeur, 0) / 5;
    $("#ty-niveau-golfeur").textContent = `Niveau ${Math.round(moyenne)}/100`;
    $("#ty-stats-golfeur").innerHTML = Object.entries(stats).map(([k, s]) => `
      <div class="ty-stat-golfeur">
        <div class="ty-stat-ligne"><span>${NOMS_STATS[k]}</span><b>${s.valeur}</b></div>
        <i class="ty-barre"><i style="width:${s.valeur}%"></i></i>
        <span class="petit">${esc(s.detail)}</span>
      </div>`).join("");
    const { trous, sansDepart } = mesTrous();
    const par = trous.reduce((t, x) => t + x.par, 0);
    $("#ty-mes-trous").innerHTML = (trous.length
      ? `<p class="petit"><b>Mon parcours : ${trous.length} trou${trous.length > 1 ? "s" : ""} jouable${trous.length > 1 ? "s" : ""}, par ${par}</b></p><ul class="ty-liste-trous">${trous.map((t) => `<li>${esc(texteTrou(t))}</li>`).join("")}</ul>`
      : '<p class="petit">Pas encore de trou jouable : il faut un green ⛳ et, à au moins 3 cases, un départ 🟩 (ou un trou tout prêt de la boutique).</p>')
      + (sansDepart.length ? `<p class="petit">⚠️ Green${sansDepart.length > 1 ? "s" : ""} n° ${sansDepart.join(", ")} sans départ : pose un « Départ » pour ${sansDepart.length > 1 ? "qu'ils comptent" : "qu'il compte"}.</p>` : "");
    $("#ty-jouer-mien").disabled = !trous.length;
    if (etat.nomGolf && !$("#ty-nom-golf").value) $("#ty-nom-golf").value = etat.nomGolf;
  }
  function htmlGolfeur() {
    return `
      <div class="ty-bloc">
        <div class="ty-titre"><h2>🏌️ Mon golfeur</h2><span class="petit" id="ty-niveau-golfeur"></span></div>
        <p class="petit">Ses notes viennent de tes vrais résultats : jeux de putting, jeux du practice, parties notées, exos de petit jeu et entraînement mental. Plus tu t'entraînes, mieux il joue !</p>
        <div id="ty-stats-golfeur"></div>
        <div id="ty-mes-trous"></div>
        <button type="button" class="bouton pleine-largeur" id="ty-jouer-mien">▶ Jouer mon parcours (entraînement)</button>
      </div>
      <div class="ty-bloc" ${TYCOON_EN_LIGNE ? "" : "hidden"}>
        <div class="ty-titre"><h2>🌍 Parcours des autres</h2></div>
        <p class="petit">Publie ton parcours pour que les autres viennent le jouer, et va jouer le leur : ton golfeur fait le score tout seul, trou par trou. Une partie officielle par jour et par parcours, avec un classement.</p>
        <label class="ty-label">Nom de mon golf <input type="text" class="champ" id="ty-nom-golf" maxlength="40" placeholder="Ex. : Golf des Pins"></label>
        <button type="button" class="bouton principal pleine-largeur" id="ty-publier">📤 Publier mon parcours</button>
        <p class="petit" id="ty-etat-partage"></p>
        <button type="button" class="bouton pleine-largeur" id="ty-charger">🔄 Voir les parcours des autres</button>
        <div id="ty-liste-parcours"></div>
      </div>`;
  }
  function brancherGolfeur() {
    $("#ty-publier").addEventListener("click", publierParcours);
    $("#ty-charger").addEventListener("click", chargerParcoursDesAutres);
    $("#ty-jouer-mien").addEventListener("click", () => {
      const { trous } = mesTrous();
      if (trous.length) jouerParcours({ id: "moi", nom: etat.nomGolf || "Mon parcours", joueur: "toi", trous }, false);
    });
    $("#ty-liste-parcours").addEventListener("click", async (ev) => {
      const j = ev.target.closest("[data-jouer]"), c = ev.target.closest("[data-classement]");
      if (j && !j.disabled) {
        const p = parcoursEnLigne.find((x) => x.id === j.dataset.jouer);
        if (p) jouerParcours(p, true);
      }
      if (c) {
        const p = parcoursEnLigne.find((x) => x.id === c.dataset.classement);
        if (!p) return;
        const zone = fenetrePartie();
        zone.innerHTML = `<h3>🏆 ${esc(p.nom)}</h3><p class="petit">de ${esc(p.joueur)}</p><p class="petit">Chargement…</p>`;
        zone.innerHTML = `<h3>🏆 ${esc(p.nom)}</h3><p class="petit">de ${esc(p.joueur)} · ${p.trous.length} trous</p>` +
          `<ul class="ty-liste-trous">${p.trous.map((t) => `<li>${esc(texteTrou(t))}</li>`).join("")}</ul>` + await classementHTML(p);
      }
    });
  }

  /* =======================================================
     9. VUE « 🏗️ TYCOON » ET BADGE DE L'EN-TÊTE
     ======================================================= */

  // Badge cliquable dans l'en-tête (toujours visible en haut de page)
  function rendreBadge() {
    const zone = document.getElementById("tycoon-badge");
    if (!zone) return;
    zone.innerHTML = `<button type="button" class="badge bouton-badge ty-badge">🏗️ Tycoon · <span class="ty-piece"></span> <span data-ty-pieces>${piecesAffichees}</span> · Niv. ${niveau()}</button>`;
  }

  function construireVue() {
    const zone = document.getElementById("tycoon");
    zone.innerHTML = `
      <div class="ty-carte-info">
        <div class="ty-jour" id="ty-jour"></div>
        <div class="ty-chips">
          <span class="ty-chip" title="Actions récompensées">✅ <b id="ty-total"></b></span>
          <span class="ty-chip ty-niveau" title="Un niveau toutes les ${PALIER_NIVEAU} actions"><span class="ty-ligne">⭐ <b id="ty-niveau"></b></span><i class="ty-barre"><i id="ty-barre"></i></i></span>
          <span class="ty-chip ty-pieces" id="ty-compteur"><span class="ty-piece"></span><b data-ty-pieces></b></span>
          <button type="button" class="ty-chip" id="ty-son" aria-label="Son">🔊</button>
        </div>
        <p class="ty-bonus" id="ty-bonus"></p>
      </div>

      <div class="ty-bloc">
        <div class="ty-titre"><h2>Mon parcours</h2><span class="petit" id="ty-cases"></span></div>
        <div class="ty-carte-zone" id="ty-carte-zone">
          <canvas id="ty-canvas"></canvas>
          <div class="ty-bandeau" id="ty-bandeau" hidden>🍂 Le gazon jaunit… Entraîne-toi pour le faire reverdir !</div>
          <div class="ty-zoom">
            <button type="button" data-zoom="plus" aria-label="Zoomer">＋</button>
            <button type="button" data-zoom="moins" aria-label="Dézoomer">－</button>
            <button type="button" data-zoom="centrer" aria-label="Recentrer">⤢</button>
          </div>
        </div>
        <p class="ty-consigne" id="ty-consigne"></p>
        <button type="button" class="bouton ty-tourner" id="ty-tourner" hidden>↻ Tourner le trou</button>
        <div class="ty-boutique" id="ty-boutique"></div>
      </div>

      ${htmlGolfeur()}

      <div class="ty-bloc">
        <div class="ty-titre"><h2>Gains d'aujourd'hui</h2><span class="petit" id="ty-total-jour"></span></div>
        <ul class="ty-gains" id="ty-gains"></ul>
        <p class="petit">Barème : exo du jour ✓ ${GAIN_EXO} · exercice mental ${GAIN_MENTAL} · partie terminée ${GAIN_PARTIE} pièces · 🌟 parfait à un jeu interactif (ex. Trèfle 16/16) : récompense ×2.</p>
      </div>

      <div class="ty-bloc">
        <div class="ty-titre"><h2>🎯 Défis golf</h2></div>
        <p class="petit">Réussis un défi = des pièces (une fois par jour). Les défis 🤖 auto se valident tout seuls avec une partie notée dans ⛳ Parcours.</p>
        <div id="ty-habitudes"></div>
        <button type="button" class="bouton pleine-largeur" id="ty-ajout">＋ Ajouter un défi</button>
      </div>

      <div class="ty-bloc">
        <div class="ty-titre"><h2>6 derniers mois</h2><span class="petit">Touche un jour</span></div>
        <div class="ty-heatmap" id="ty-heatmap"></div>
        <div class="ty-legende">Moins <span class="ty-hm-case"></span><span class="ty-hm-case l1"></span><span class="ty-hm-case l2"></span><span class="ty-hm-case l3"></span><span class="ty-hm-case l4"></span> Plus</div>
        <p class="petit" id="ty-info-jour">&nbsp;</p>
        <div class="ty-stats" id="ty-stats"></div>
        <button type="button" class="lien-bouton" id="ty-reset">Recommencer le Tycoon à zéro</button>
      </div>`;

    canvas = $("#ty-canvas");
    ctx = canvas.getContext("2d");

    // Boutique
    const boutique = $("#ty-boutique");
    // En premier : « Terrain » (acheter des parcelles), « Modifier » (déplacer), puis les 3 trous tout prêts
    boutique.insertAdjacentHTML("beforeend",
      '<button type="button" class="ty-article" data-type="terrain"><span class="ty-icone">🗺️</span><span class="ty-nom">Terrain</span><span class="ty-prix"></span></button>' +
      '<button type="button" class="ty-article" data-type="modifier"><span class="ty-icone">✏️</span><span class="ty-nom">Modifier</span><span class="ty-prix">gratuit</span></button>');
    for (const [id, kit] of Object.entries(KITS_TROUS)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ty-article ty-kit";
      btn.dataset.type = "kit:" + id;
      const mini = document.createElement("canvas");
      dessinerMiniKit(mini, id);
      btn.appendChild(mini);
      btn.insertAdjacentHTML("beforeend", `<span class="ty-nom">${kit.nom}</span><span class="ty-prix"></span>`);
      boutique.appendChild(btn);
    }
    $("#ty-tourner").addEventListener("click", () => { rotationKit = (rotationKit + 1) % 4; son("clic"); besoinRendu = true; toast("↻ Trou tourné d'un quart de tour"); });
    for (const [type, el] of Object.entries(ELEMENTS)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ty-article";
      btn.dataset.type = type;
      const mini = document.createElement("canvas");
      dessinerMini(mini, type);
      btn.appendChild(mini);
      btn.insertAdjacentHTML("beforeend", `<span class="ty-nom">${el.nom}</span><span class="ty-prix"></span>`);
      boutique.appendChild(btn);
    }
    boutique.insertAdjacentHTML("beforeend",
      '<button type="button" class="ty-article" data-type="retirer"><span class="ty-icone">🧹</span><span class="ty-nom">Retirer</span><span class="ty-prix">50 % rendu</span></button>');
    boutique.addEventListener("click", (ev) => {
      const b = ev.target.closest(".ty-article");
      if (b) choisirOutil(b.dataset.type);
    });

    // Boutons divers
    zone.querySelector(".ty-zoom").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.zoom === "plus") zoomAutour(1.35, vue.l / 2, vue.h / 2);
      if (b.dataset.zoom === "moins") zoomAutour(1 / 1.35, vue.l / 2, vue.h / 2);
      if (b.dataset.zoom === "centrer") centrer();
    });
    $("#ty-son").addEventListener("click", () => { etat.son = !etat.son; sauvegarder(); rafraichir(); son("clic"); });
    $("#ty-ajout").addEventListener("click", () => ouvrirModale());
    $("#ty-heatmap").addEventListener("click", (ev) => {
      const c = ev.target.closest("[data-jour]");
      if (!c) return;
      document.querySelectorAll(".ty-hm-case.choisie").forEach((x) => x.classList.remove("choisie"));
      c.classList.add("choisie");
      detailJour(c.dataset.jour);
    });
    $("#ty-reset").addEventListener("click", () => {
      if (!confirm("Recommencer le Tycoon : pièces, carte, défis et calendrier du Tycoon effacés ? (tes exos, parties et séries ne bougent pas)")) return;
      if (!confirm("Vraiment ? C'est définitif.")) return;
      etat = etatInitial();
      sauvegarder();
      majTerrain();
      centrer();
      piecesAffichees = etat.pieces;
      outil = null;
      rafraichir();
      besoinRendu = true;
    });

    initGestes();
    brancherGolfeur();
  }

  // Met à jour tout ce qui est affiché (vue + badge)
  function rafraichir(avecPieces = true) {
    if (!pret) return;
    if (avecPieces) piecesAffichees = etat.pieces;
    rendreBadge();
    fjCible = gazonJaune() ? 1 : 0;
    const section = document.getElementById("vue-tycoon");
    if (!section || section.hidden || !$("#ty-jour")) return;
    const auj = cleJour();
    $("#ty-jour").textContent = "JOUR " + (joursEntre(etat.debut, auj) + 1);
    $("#ty-total").textContent = etat.totalFaits;
    $("#ty-niveau").textContent = "Niv. " + niveau();
    $("#ty-barre").style.width = (etat.totalFaits % PALIER_NIVEAU) / PALIER_NIVEAU * 100 + "%";
    document.querySelectorAll("[data-ty-pieces]").forEach((el) => { el.textContent = piecesAffichees; });
    $("#ty-son").textContent = etat.son ? "🔊" : "🔇";
    const bonus = bonusSerie();
    $("#ty-bonus").textContent = bonus
      ? `🔥 ${joursSerieAvant()} jour${joursSerieAvant() > 1 ? "s" : ""} de série : chaque gain +${bonus} %`
      : "🔥 Valide une journée (3 exos ✓) pour lancer ta série : +10 % de pièces par jour, jusqu'à +100 %.";
    $("#ty-bandeau").hidden = fjCible === 0;
    majBoutique();
    rendreGains();
    rendreHabitudes();
    rendreCalendrier();
    rendreGolfeur();
    besoinRendu = true;
  }

  // Ouvre l'onglet (appelée par changerVue dans app.js)
  function afficherTycoon() {
    if (!pret) return;
    if (!$("#ty-jour")) construireVue();
    synchroniser(null);
    rafraichir();
    fj = fjCible;
    lancerBoucle();
    requestAnimationFrame(redimensionner);
  }

  // Démarrage : après le chargement de tous les scripts (app.js compris)
  document.addEventListener("DOMContentLoaded", () => {
    etat = chargerEtat();
    majTerrain();
    piecesAffichees = etat.pieces;
    pret = true;
    sauvegarder();
    synchroniser(null);   // rattrape ce qui a été fait (même sans ouvrir l'onglet)
    rendreBadge();
    document.getElementById("tycoon-badge")?.addEventListener("click", () => changerVue("tycoon"));
    // Changement de jour pendant que l'appli est ouverte
    let jourAffiche = cleJour();
    const verifierJour = () => { if (cleJour() !== jourAffiche) { jourAffiche = cleJour(); rafraichir(); } };
    setInterval(verifierJour, 60000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) verifierJour(); });
  });

  // Les seules fonctions visibles par les autres fichiers
  window.afficherTycoon = afficherTycoon;
  window.tycoonSynchroniser = (source) => synchroniser(source || null);
  // Notes du golfeur, lues par l'onglet 📈 Progrès (progres.js)
  window.tycoonNotesGolfeur = () => (etat ? statsGolfeur() : null);
})();
