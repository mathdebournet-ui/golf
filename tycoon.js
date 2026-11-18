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
    bunker:    { nom: "Bunker",     prix: 15,  niveau: 1, plat: true,  haut: false, couleur: "#f2dc9b" },
    arbre:     { nom: "Arbre",      prix: 20,  niveau: 1, plat: false, haut: true,  couleur: "#3fae4f" },
    lac:       { nom: "Lac",        prix: 40,  niveau: 2, plat: true,  haut: false, couleur: "#7fd0ff" },
    green:     { nom: "Green",      prix: 60,  niveau: 3, plat: true,  haut: true,  couleur: "#62e07c" },
    practice:  { nom: "Practice",   prix: 150, niveau: 4, plat: false, haut: true,  couleur: "#ffffff" },
    clubhouse: { nom: "Club-house", prix: 300, niveau: 5, plat: false, haut: true,  couleur: "#e05a4a" },
  };
  const ICONES = ["⛳", "🏌️", "🎯", "🕳️", "🚩", "🏖️", "📏", "🚀", "🔁", "🏆", "🟢", "🐦", "🧹", "⏱️", "🌲", "🔥"];

  // Défis golf proposés : uniquement de la PERFORMANCE (score, cible, record),
  // jamais de technique. Exemples écrits par Claude (sans source), à adapter.
  // auto = validé tout seul quand une partie terminée remplit la condition.
  const CATEGORIES_DEFIS = { putting: "Putting", chipping: "Chipping", bunker: "Bunker", practice: "Practice", parcours: "Sur le parcours" };
  const CATALOGUE_DEFIS = [
    { ref: "putt-50-1m",    cat: "putting",  icone: "🕳️", nom: "50 putts rentrés d'affilée à 1 m", recompense: 25 },
    { ref: "putt-horloge",  cat: "putting",  icone: "🔁", nom: "Horloge : 12 putts à 1,5 m sans rater", recompense: 25 },
    { ref: "putt-lag",      cat: "putting",  icone: "📏", nom: "Lag : 10 putts de 12 m, tous à moins de 1 m", recompense: 50 },
    { ref: "chip-7-10",     cat: "chipping", icone: "🚩", nom: "10 chips : au moins 7 à moins de 1 m", recompense: 25 },
    { ref: "up-down",       cat: "chipping", icone: "⛳", nom: "Up & down : 7 réussis sur 10 balles", recompense: 50 },
    { ref: "bunker-6-10",   cat: "bunker",   icone: "🏖️", nom: "10 sorties de bunker : 6 à moins de 2 m", recompense: 25 },
    { ref: "drive-couloir", cat: "practice", icone: "🚀", nom: "Drive : 8 sur 10 dans un couloir de 25 m", recompense: 25 },
    { ref: "wedge-50",      cat: "practice", icone: "🎯", nom: "Wedging : 10 balles à 50 m, 6 à moins de 4 m", recompense: 25 },
    { ref: "fers-cible",    cat: "practice", icone: "🏌️", nom: "Fers : 10 balles, 6 à moins de 8 m de la cible", recompense: 25 },
    { ref: "auto-birdie",   cat: "parcours", icone: "🐦", nom: "Faire au moins un birdie", recompense: 10, auto: "birdie" },
    { ref: "auto-3putts",   cat: "parcours", icone: "🟢", nom: "Partie sans 3-putts", recompense: 50, auto: "sans3putts" },
    { ref: "auto-double",   cat: "parcours", icone: "🧹", nom: "Partie sans double bogey", recompense: 50, auto: "sansDouble" },
    { ref: "auto-gir",      cat: "parcours", icone: "🎯", nom: "2 greens sur 3 en régulation", recompense: 50, auto: "gir" },
    { ref: "auto-par",      cat: "parcours", icone: "🏆", nom: "Finir une partie sous le par", recompense: 50, auto: "sousLePar" },
  ];
  // Défis de départ
  const DEFIS_DE_DEPART = ["putt-50-1m", "putt-lag", "up-down", "drive-couloir", "auto-birdie", "auto-3putts"];
  function defiDuCatalogue(ref) {
    const c = CATALOGUE_DEFIS.find((x) => x.ref === ref);
    return c ? { id: c.ref, ...c } : null;
  }

  // Conditions des défis « auto », vérifiées sur une partie terminée (parcours.js).
  // complete = tous les trous ont un score.
  const nb = (v) => Number.isFinite(v);
  const TESTS_AUTO = {
    birdie: (trous) => trous.some((t) => nb(t.score) && t.score <= t.par - 1),
    sans3putts: (trous, complete) => complete && trous.every((t) => nb(t.putts) && t.putts < 3),
    sansDouble: (trous, complete) => complete && trous.every((t) => t.score <= t.par + 1),
    gir: (trous, complete) => complete && trous.every((t) => nb(t.putts)) &&
      trous.filter((t) => t.score - t.putts <= t.par - 2).length * 3 >= trous.length * 2,
    sousLePar: (trous, complete) => complete &&
      trous.reduce((s, t) => s + t.score, 0) < trous.reduce((s, t) => s + t.par, 0),
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
    };
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
    };
    // Anciennes habitudes de départ (boire, dormir) jamais modifiées : remplacées par les défis golf
    const anciennes = ["Boire 2 L d'eau", "Dormir 8 h"];
    if (e.habitudes.length && e.habitudes.every((h) => anciennes.includes(h.nom))) e.habitudes = base.habitudes;
    if (d.carte && typeof d.carte === "object") {
      for (const [cle, type] of Object.entries(d.carte)) if (ELEMENTS[type]) e.carte[cle] = type;
      // Cases du grand club-house (2 x 2) : "@x,y" renvoie vers la case principale
      for (const [cle, type] of Object.entries(d.carte)) {
        if (typeof type === "string" && type.startsWith("@") && e.carte[type.slice(1)] === "clubhouse") e.carte[cle] = type;
      }
    }
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
    if (parfaits.length) setTimeout(() => { son("niveau"); confettis(); toast("🌟 PARFAIT " + parfaits.join(" · ") + " : récompense doublée !"); }, 300);
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
    if (defisReussis.length) setTimeout(() => toast("🏆 Défi réussi : " + defisReussis.join(" · ")), 400);
    if (etat.journal[auj] && !Object.keys(etat.journal[auj]).length) delete etat.journal[auj];

    if (gagne || repris) sauvegarder();
    if (gagne) celebrerGain(source, gagne, ancienNiveau, etaitJaune);
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

  const N = 20;
  const TW = 64, TH = 32;     // taille d'une case (losange), en unités « monde »
  const OX = 640, OY = 90;    // coin haut de la case (0,0)
  const EPAIS = 16;           // épaisseur du socle de terre
  const MONDE_L = N * TW;
  const MONDE_H = OY + N * TH + EPAIS + 20;

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
      case "green":
        dessinerHerbe(c, sx, sy, x, y);
        ovale(c, X, Y + 1, TW * .38, TH * .38, herbe("#3fb85a", "#bdb04a"));
        ovale(c, X, Y, TW * .34, TH * .33, herbe("#66e57f", "#d9d070"));
        ovale(c, X + 3, Y + 1, 2.6, 1.4, "#1d2b22");   // le trou
        break;
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

  /* ---------- Grand club-house sur 2 x 2 cases ----------
     La case du fond (« ancre ») contient "clubhouse", les 3 autres
     contiennent "@x,y" (un renvoi vers l'ancre). */
  function casesClubHouse(x, y) { return [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]; }
  function estGrandClubHouse(x, y) {
    return etat.carte[x + "," + y] === "clubhouse" &&
      casesClubHouse(x, y).slice(1).every(([a, b]) => etat.carte[a + "," + b] === "@" + x + "," + y);
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
  // Case ancre quand on touche (x, y) pour poser le club-house (reste dans la grille)
  function ancrePose(x, y) { return { x: Math.min(x, N - 2), y: Math.min(y, N - 2) }; }

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
      case "green": {                      // drapeau dans le trou
        const hx = X + 3, hy = Y + 1;
        c.save(); c.translate(0, dy);
        c.strokeStyle = "#f4f4f4"; c.lineWidth = 2;
        c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy - 36); c.stroke();
        poly(c, [[hx, hy - 36], [hx + 15, hy - 31], [hx, hy - 25]], "#e8433a");
        poly(c, [[hx, hy - 31], [hx + 15, hy - 31], [hx, hy - 25]], "rgba(0,0,0,.12)");
        c.restore();
        break;
      }
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

    // Socle de terre
    const gauche = [0, OY + N * TH / 2], bas = [OX, OY + N * TH], droite = [MONDE_L, OY + N * TH / 2];
    poly(c, [gauche, bas, [bas[0], bas[1] + EPAIS], [gauche[0], gauche[1] + EPAIS]], "#9a6a3a");
    poly(c, [bas, droite, [droite[0], droite[1] + EPAIS], [bas[0], bas[1] + EPAIS]], "#7d5430");

    const anim = {};
    animations = animations.filter((a) => t - a.t0 < a.duree);
    for (const a of animations) anim[a.cle] = Math.min(1, Math.max(0, (t - a.t0) / a.duree));

    // 1er passage : le sol
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const cle = x + "," + y;
        const v = etat.carte[cle];
        const { sx, sy } = coinCase(x, y);
        // Cases du grand club-house : terrasse pavée
        if ((v && v.startsWith("@")) || (v === "clubhouse" && estGrandClubHouse(x, y))) {
          dessinerSol(c, "terrasse", sx, sy, x, y);
          if (outil) losange(c, sx, sy, 1, null, "rgba(0,0,0,.08)");
          continue;
        }
        const type = v;
        if (type && ELEMENTS[type].plat && anim[cle] != null) {
          dessinerHerbe(c, sx, sy, x, y);
          const s = Math.max(.01, easeOutBack(anim[cle]));
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
    for (let s = 0; s <= 2 * (N - 1); s++) {
      for (let x = Math.max(0, s - N + 1); x <= Math.min(s, N - 1); x++) {
        const y = s - x;
        const cle = x + "," + y;
        const type = etat.carte[cle];
        if (!type) continue;
        if (type.startsWith("@")) {
          const [ax, ay] = type.slice(1).split(",").map(Number);
          if (x === ax + 1 && y === ay + 1 && estGrandClubHouse(ax, ay)) {
            const ca = ax + "," + ay;
            const centre = coinCase(ax + 1, ay + 1);
            dessinerGrandClubHouse(c, centre.sx, centre.sy, anim[ca] != null ? -(1 - easeOutBounce(anim[ca])) * 150 : 0);
          }
          continue;
        }
        if (type === "clubhouse" && estGrandClubHouse(x, y)) continue;
        if (!ELEMENTS[type].haut) continue;
        const { sx, sy } = coinCase(x, y);
        const dy = anim[cle] != null ? -(1 - easeOutBounce(anim[cle])) * 150 : 0;
        dessinerObjet(c, type, sx, sy, x, y, dy);
      }
    }

    // Aperçu sous la souris
    if (survol && outil) {
      const { sx, sy } = coinCase(survol.x, survol.y);
      const occupe = etat.carte[survol.x + "," + survol.y];
      if (outil === "retirer") {
        losange(c, sx, sy, 1, occupe ? "rgba(224,83,63,.35)" : "rgba(255,255,255,.25)", "#ffffff");
      } else if (outil === "clubhouse") {
        const an = ancrePose(survol.x, survol.y);
        const cases = casesClubHouse(an.x, an.y);
        const libre = cases.every(([a, b]) => !etat.carte[a + "," + b]);
        const ok = libre && etat.pieces >= ELEMENTS.clubhouse.prix;
        c.save();
        c.globalAlpha = .6;
        if (libre) {
          for (const [a, b] of cases) { const q = coinCase(a, b); dessinerSol(c, "terrasse", q.sx, q.sy, a, b); }
          const centre = coinCase(an.x + 1, an.y + 1);
          dessinerGrandClubHouse(c, centre.sx, centre.sy);
        }
        c.restore();
        for (const [a, b] of cases) {
          const q = coinCase(a, b);
          losange(c, q.sx, q.sy, 1, ok ? "rgba(255,255,255,.15)" : "rgba(224,83,63,.35)", ok ? "#ffffff" : "#e0533f");
        }
      } else {
        const ok = !occupe && etat.pieces >= ELEMENTS[outil].prix;
        c.save();
        c.globalAlpha = .6;
        if (!occupe) {
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
      if (!a.poussiere && (t - a.t0) / a.duree >= a.impact) {
        a.poussiere = true;
        const [x, y] = a.cle.split(",").map(Number);
        const cases = a.type === "clubhouse" && estGrandClubHouse(x, y) ? casesClubHouse(x, y) : [[x, y]];
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
  function zoomAjuste() { return Math.min(vue.l / (MONDE_L + 40), vue.h / (MONDE_H + 20)); }
  function centrer() {
    const fit = zoomAjuste();
    vue.z = vue.l < 700 ? Math.max(fit, .4) : fit;   // un peu plus gros sur téléphone
    vue.x = (vue.l - MONDE_L * vue.z) / 2;
    vue.y = (vue.h - MONDE_H * vue.z) / 2;
    borner();
    besoinRendu = true;
  }
  function borner() {
    const cxs = vue.x + MONDE_L / 2 * vue.z, cys = vue.y + MONDE_H / 2 * vue.z;
    if (cxs < 0) vue.x -= cxs;
    if (cxs > vue.l) vue.x -= cxs - vue.l;
    if (cys < 0) vue.y -= cys;
    if (cys > vue.h) vue.y -= cys - vue.h;
  }
  function zoomAutour(facteur, sx, sy) {
    const nz = Math.min(3, Math.max(zoomAjuste() * .8, vue.z * facteur));
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
  function caseSousPointeur(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const cs = caseDepuisMonde((clientX - r.left - vue.x) / vue.z, (clientY - r.top - vue.y) / vue.z);
    return cs.x >= 0 && cs.y >= 0 && cs.x < N && cs.y < N ? cs : null;
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
    const cs = caseSousPointeur(clientX, clientY);
    if (!cs) return;
    let cle = cs.x + "," + cs.y;
    const present = typeDe(cle);   // type réel (aussi pour une case du club-house)

    if (!outil) {
      toast(present ? ELEMENTS[present].nom : "Choisis un élément dans la boutique ci-dessous 👇");
      return;
    }
    if (outil === "retirer") {
      if (!present) return;
      const rendu = Math.floor(ELEMENTS[present].prix / 2);
      cle = ancreDe(cle);
      const [ax, ay] = cle.split(",").map(Number);
      // Grand club-house : on libère ses 4 cases
      const cases = present === "clubhouse" && estGrandClubHouse(ax, ay) ? casesClubHouse(ax, ay) : [[cs.x, cs.y]];
      for (const [a, b] of cases) delete etat.carte[a + "," + b];
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
    // Le club-house prend 4 cases (2 x 2) : toutes doivent être libres
    const an = outil === "clubhouse" ? ancrePose(cs.x, cs.y) : cs;
    const cases = outil === "clubhouse" ? casesClubHouse(an.x, an.y) : [[cs.x, cs.y]];
    if (cases.some(([a, b]) => etat.carte[a + "," + b])) {
      son("erreur");
      toast(outil === "clubhouse" ? "Le club-house a besoin de 4 cases libres (2 × 2)" : "Case occupée — utilise 🧹 Retirer d'abord");
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
    sauvegarder();
    animations.push({ cle, type: outil, t0: performance.now(), duree: el.haut ? 650 : 380, impact: el.haut ? .36 : 0, poussiere: false });
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* rien */ } }
    besoinRendu = true;
    animerPieces();
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
    if (type === "clubhouse") {   // grand club-house : 4 cases, dessiné plus petit
      c.setTransform(dpr * .42, 0, 0, dpr * .42, dpr * 30, 0);
      for (const [i, j] of casesClubHouse(0, 0)) dessinerSol(c, "terrasse", (i - j) * TW / 2, 105 + (i + j - 2) * TH / 2, i, j);
      dessinerGrandClubHouse(c, 0, 105);
      fjDessin = ancien;
      return;
    }
    dessinerSol(c, ELEMENTS[type].plat ? type : null, 0, 42, 0, 1);
    if (ELEMENTS[type].haut) dessinerObjet(c, type, 0, 42, 1, 0);
    fjDessin = ancien;
  }

  function choisirOutil(type) {
    if (type !== "retirer" && niveau() < ELEMENTS[type].niveau) {
      const el = ELEMENTS[type];
      const manque = (el.niveau - 1) * PALIER_NIVEAU - etat.totalFaits;
      son("erreur");
      toast(`🔒 ${el.nom} : niveau ${el.niveau} (encore ${manque} action${manque > 1 ? "s" : ""})`);
      return;
    }
    outil = outil === type ? null : type;
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
      if (type === "retirer") return;
      const el = ELEMENTS[type];
      const verrou = niv < el.niveau;
      btn.classList.toggle("verrouille", verrou);
      btn.classList.toggle("trop-cher", !verrou && etat.pieces < el.prix);
      btn.querySelector(".ty-prix").innerHTML = verrou ? `🔒 Niv. ${el.niveau}` : `<span class="ty-piece"></span>${el.prix}`;
    });
    let txt;
    if (!outil) txt = "Choisis un élément, puis touche une case. Glisse pour te déplacer, pince pour zoomer.";
    else if (outil === "retirer") txt = "Touche un élément pour le retirer (la moitié du prix est rendue).";
    else if (outil === "clubhouse") txt = `Touche la carte pour poser le club-house : il prend 4 cases libres (2 × 2) — ${ELEMENTS.clubhouse.prix} pièces.`;
    else txt = `Touche une case vide pour poser : ${ELEMENTS[outil].nom} (${ELEMENTS[outil].prix} pièces). Touche l'élément à nouveau pour arrêter.`;
    $("#ty-consigne").textContent = txt;
    canvas.classList.toggle("outil-actif", !!outil);
    $("#ty-cases").textContent = `${Object.keys(etat.carte).length} / ${N * N} cases`;
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
        <div class="ty-boutique" id="ty-boutique"></div>
      </div>

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
      piecesAffichees = etat.pieces;
      outil = null;
      rafraichir();
      besoinRendu = true;
    });

    initGestes();
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

  // Les 2 seules fonctions visibles par les autres fichiers
  window.afficherTycoon = afficherTycoon;
  window.tycoonSynchroniser = (source) => synchroniser(source || null);
})();
