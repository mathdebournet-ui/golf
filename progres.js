/* =========================================================
   📈 Onglet « Progrès » (v39)

   Tout est calculé à partir des données déjà dans l'appli
   (rien de nouveau n'est enregistré) :
     - les 5 notes du golfeur du Tycoon (tycoonNotesGolfeur, tycoon.js)
       en radar + bouton « Travailler mon point faible »
       (programmePointFaible, app.js) ;
     - les 30 derniers jours comparés aux 30 d'avant, par partie du jeu
       (scores des exos : lireScores, scores.js ; parties : parcours.js) ;
     - une courbe + le record ⭐ de chaque exo qui a un score ;
     - la courbe des parties (écart au par ramené à 18 trous).

   Fonctions préfixées « progres » (scripts classiques = noms globaux).
   ========================================================= */

// Parties du jeu comparées sur 30 jours (catégories des fiches)
const PROGRES_FAMILLES = [
  { cle: "putting", nom: "🕳️ Putting", categories: ["putting"] },
  { cle: "petitJeu", nom: "🏖️ Petit jeu", categories: ["chipping", "bunker"] },
  { cle: "fers", nom: "🎯 Fers / wedging", categories: ["fers", "approches"] },
  { cle: "drive", nom: "🚀 Drive", categories: ["drive"] },
];
// Note du golfeur -> programme « point faible » (CRENEAUX_FOCUS, app.js)
const PROGRES_NOMS_NOTES = { drive: "🚀 Drive", fers: "🎯 Fers", petitJeu: "🏖️ Petit jeu", putting: "🕳️ Putting", mental: "🧠 Mental" };
const PROGRES_ORDRE_RADAR = ["putting", "petitJeu", "fers", "drive", "mental"];

const progresVirgule = (n) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");

// « AAAA-MM-JJ » d'il y a n jours
function progresIlYA(n) { return dateEnTexte(ajouterJours(new Date(), -n)); }

function progresMoyenne(liste) { return liste.length ? liste.reduce((t, x) => t + x, 0) / liste.length : null; }


/* ---------- Données ---------- */

// Scores de chaque exo, triés par date : [{ fiche, liste: [{t, d, v}] }]
// scores = { idFiche: [{d, v, t?}] } (les miens par défaut, ou ceux d'un joueur dans l'espace admin)
function progresExosAvecScores(scores = lireScores()) {
  return Object.entries(scores)
    .map(([id, liste]) => ({
      fiche: fichesValides.find((f) => f.id === id),
      liste: (Array.isArray(liste) ? liste : []).filter((s) => s && Number.isFinite(s.v) && typeof s.d === "string").sort((a, b) => a.d.localeCompare(b.d) || (a.t || 0) - (b.t || 0)),
    }))
    .filter((e) => e.fiche && e.liste.length > 0);
}

// Évolution d'un exo en % entre les 30 derniers jours et les 30 d'avant
// (positif = mieux, même pour les exos où moins de balles = mieux)
function progresEvolutionExo(e) {
  const debut = progresIlYA(29), avant = progresIlYA(59);
  const recents = progresMoyenne(e.liste.filter((s) => s.d >= debut).map((s) => s.v));
  const anciens = progresMoyenne(e.liste.filter((s) => s.d >= avant && s.d < debut).map((s) => s.v));
  if (recents === null || anciens === null || anciens === 0) return null;
  const ecart = 100 * (recents - anciens) / Math.abs(anciens);
  return SCORES_PLUS_BAS_MIEUX.has(e.fiche.id) ? -ecart : ecart;
}

// Parties terminées avec leurs stats, de la plus ancienne à la plus récente
// liste = mes parties par défaut, ou celles d'un joueur dans l'espace admin
function progresParties(liste = partiesTerminees()) {
  return liste
    .filter((p) => p && Array.isArray(p.trous) && typeof p.date === "string")
    .map((p) => ({ partie: p, stats: calculerStats(p) }))
    .filter((p) => p.stats.trousJoues >= 9)
    .sort((a, b) => (a.partie.date < b.partie.date ? -1 : a.partie.date > b.partie.date ? 1 : 0));
}

// Écart au par ramené à 18 trous (une partie de 9 trous compte double)
function progresEcart18(p) { return p.stats.ecart * 18 / p.stats.trousJoues; }

// Point faible = la note la plus basse parmi celles qui ont des données
function progresPointFaible(notes) {
  const avecDonnees = Object.entries(notes).filter(([, n]) => n.detail !== "pas encore de données");
  if (!avecDonnees.length) return null;
  return avecDonnees.sort((a, b) => a[1].valeur - b[1].valeur)[0][0];
}


/* ---------- Dessins (SVG) ---------- */

// Radar des 5 notes (0 à 100)
function progresRadar(notes) {
  const cx = 130, cy = 118, r = 82;
  const angle = (i) => -Math.PI / 2 + i * 2 * Math.PI / PROGRES_ORDRE_RADAR.length;
  const point = (i, v) => [cx + Math.cos(angle(i)) * r * v / 100, cy + Math.sin(angle(i)) * r * v / 100];
  const anneaux = [25, 50, 75, 100].map((v) =>
    `<polygon points="${PROGRES_ORDRE_RADAR.map((_, i) => point(i, v).join(",")).join(" ")}" class="pr-anneau"/>`).join("");
  const axes = PROGRES_ORDRE_RADAR.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${point(i, 100)[0]}" y2="${point(i, 100)[1]}" class="pr-anneau"/>`).join("");
  const forme = PROGRES_ORDRE_RADAR.map((cle, i) => point(i, notes[cle].valeur).join(",")).join(" ");
  const etiquettes = PROGRES_ORDRE_RADAR.map((cle, i) => {
    const [x, y] = point(i, 128);
    const sans = notes[cle].detail === "pas encore de données";
    return `<text x="${x}" y="${y}" text-anchor="middle" class="pr-etiquette">${PROGRES_NOMS_NOTES[cle]}</text>
      <text x="${x}" y="${y + 15}" text-anchor="middle" class="pr-valeur${sans ? " pr-sans" : ""}">${sans ? "—" : notes[cle].valeur}</text>`;
  }).join("");
  return `<svg class="pr-radar" viewBox="0 0 260 250" role="img" aria-label="Radar de tes 5 notes">
    ${anneaux}${axes}
    <polygon points="${forme}" class="pr-forme"/>
    ${PROGRES_ORDRE_RADAR.map((cle, i) => `<circle cx="${point(i, notes[cle].valeur)[0]}" cy="${point(i, notes[cle].valeur)[1]}" r="3.5" class="pr-point"/>`).join("")}
    ${etiquettes}
  </svg>`;
}

// Petite courbe : valeurs dans l'ordre, record entouré.
// basMieux = vrai si le plus petit est le meilleur (la courbe monte quand on progresse)
function progresCourbe(valeurs, basMieux, record) {
  const l = 240, h = 60, m = 6;
  if (valeurs.length === 1) {
    return `<svg class="pr-courbe" viewBox="0 0 ${l} ${h}" aria-hidden="true"><circle cx="${l / 2}" cy="${h / 2}" r="4" class="pr-point"/></svg>`;
  }
  const min = Math.min(...valeurs), max = Math.max(...valeurs);
  const ampl = max - min || 1;
  const x = (i) => m + i * (l - 2 * m) / (valeurs.length - 1);
  const y = (v) => {
    const k = (v - min) / ampl;   // 0 = plus petit
    return basMieux ? m + k * (h - 2 * m) : h - m - k * (h - 2 * m);
  };
  const points = valeurs.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const iRecord = valeurs.lastIndexOf(record);
  return `<svg class="pr-courbe" viewBox="0 0 ${l} ${h}" aria-hidden="true">
    <polyline points="${points}" class="pr-ligne"/>
    ${valeurs.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === iRecord ? 4.5 : 2.5}" class="${i === iRecord ? "pr-record" : "pr-point"}"/>`).join("")}
  </svg>`;
}

// Flèche + texte d'une évolution en %
function progresBadgeEvolution(ecart) {
  if (ecart === null) return `<span class="pr-evo pr-neutre">pas assez de données</span>`;
  const r = Math.round(ecart);
  const classe = r > 2 ? "pr-mieux" : r < -2 ? "pr-moins" : "pr-neutre";
  const fleche = r > 2 ? "▲" : r < -2 ? "▼" : "=";
  return `<span class="pr-evo ${classe}">${fleche} ${r > 0 ? "+" : ""}${r} %</span>`;
}


/* ---------- Blocs de la page ---------- */

function progresBlocNotes(notes) {
  if (!notes) return "";
  const faible = progresPointFaible(notes);
  let action;
  if (!faible) {
    action = `<p class="petit">Joue quelques exos interactifs et note une partie : ton point faible apparaîtra ici.</p>`;
  } else if (faible === "mental" && !MENTAL_VISIBLE) {
    action = `<p>Point faible : <strong>${PROGRES_NOMS_NOTES[faible]}</strong> (${notes[faible].valeur}/100)</p>
      <p class="petit">L'onglet 🧠 Mental arrive bientôt.</p>`;
  } else if (faible === "mental") {
    action = `<p>Point faible : <strong>${PROGRES_NOMS_NOTES[faible]}</strong> (${notes[faible].valeur}/100)</p>
      <button type="button" class="pr-bouton" data-progres="mental">🧠 Aller faire un exercice mental</button>`;
  } else {
    action = `<p>Point faible : <strong>${PROGRES_NOMS_NOTES[faible]}</strong> (${notes[faible].valeur}/100)</p>
      <button type="button" class="pr-bouton" data-progres="focus" data-focus="${faible}">🎯 Travailler mon point faible aujourd'hui</button>
      <p class="petit">Remplace le programme d'Aujourd'hui : 3 à 4 exos sur ce point faible.</p>`;
  }
  return `<section class="bloc pr-bloc">
    <h2 class="bloc-titre">🏌️ Mes 5 notes</h2>
    <p class="bloc-info">Sur 100, d'après tes jeux, exos et parties des 30 derniers jours (— = pas encore de données)</p>
    ${progresRadar(notes)}
    <ul class="pr-details">${PROGRES_ORDRE_RADAR.map((cle) => `<li><strong>${PROGRES_NOMS_NOTES[cle]}</strong> : ${echapper(notes[cle].detail)}</li>`).join("")}</ul>
    <div class="pr-action">${action}</div>
  </section>`;
}

// Espace admin (serie.js) : notes envoyées par l'appli du joueur ({ cle: valeur }),
// radar + point faible, sans bouton
function progresBlocNotesAdmin(notesRecues) {
  const notes = {};
  for (const cle of PROGRES_ORDRE_RADAR) {
    const v = notesRecues && Number.isInteger(notesRecues[cle]) && notesRecues[cle] >= 0 && notesRecues[cle] <= 100 ? notesRecues[cle] : null;
    notes[cle] = v === null ? { valeur: 50, detail: "pas encore de données" } : { valeur: v, detail: "" };
  }
  const faible = progresPointFaible(notes);
  return `<section class="bloc pr-bloc">
    <h2 class="bloc-titre">🏌️ Ses 5 notes</h2>
    <p class="bloc-info">Calculées par son appli (— = pas encore de données)</p>
    ${progresRadar(notes)}
    ${faible ? `<p>Point faible : <strong>${PROGRES_NOMS_NOTES[faible]}</strong> (${notes[faible].valeur}/100)</p>` : ""}
  </section>`;
}

function progresBlocMois(exos, parties) {
  const lignes = PROGRES_FAMILLES.map((fam) => {
    const evolutions = exos.filter((e) => fam.categories.includes(e.fiche.categorie)).map(progresEvolutionExo).filter((v) => v !== null);
    return `<li><span>${fam.nom}</span>${progresBadgeEvolution(evolutions.length ? progresMoyenne(evolutions) : null)}</li>`;
  });
  // Parcours : écart moyen au par (sur 18 trous), en coups
  const debut = progresIlYA(29), avant = progresIlYA(59);
  const recents = progresMoyenne(parties.filter((p) => p.partie.date >= debut).map(progresEcart18));
  const anciens = progresMoyenne(parties.filter((p) => p.partie.date >= avant && p.partie.date < debut).map(progresEcart18));
  let parcours = `<span class="pr-evo pr-neutre">pas assez de données</span>`;
  if (recents !== null && anciens !== null) {
    const gain = anciens - recents;   // coups gagnés
    const classe = gain > 0.4 ? "pr-mieux" : gain < -0.4 ? "pr-moins" : "pr-neutre";
    parcours = `<span class="pr-evo ${classe}">${gain > 0.4 ? "▲" : gain < -0.4 ? "▼" : "="} ${gain > 0 ? "−" : "+"}${progresVirgule(Math.abs(gain))} coup${Math.abs(gain) >= 2 ? "s" : ""}</span>`;
  }
  lignes.push(`<li><span>⛳ Parcours</span>${parcours}</li>`);
  return `<section class="bloc pr-bloc">
    <h2 class="bloc-titre">📅 Ce mois-ci</h2>
    <p class="bloc-info">Tes 30 derniers jours comparés aux 30 d'avant (moyenne des scores de chaque exo)</p>
    <ul class="pr-mois">${lignes.join("")}</ul>
  </section>`;
}

function progresBlocExos(exos) {
  if (!exos.length) {
    return `<section class="bloc pr-bloc"><h2 class="bloc-titre">⭐ Mes records</h2>
      <p class="petit">Pas encore de score : joue un exo interactif (Trèfle, Snail, practice…) depuis Aujourd'hui.</p></section>`;
  }
  const debutMois = progresIlYA(29);
  // Les exos joués le plus récemment d'abord
  const dernier = (e) => e.liste[e.liste.length - 1];
  const cartes = [...exos].sort((a, b) => dernier(b).d.localeCompare(dernier(a).d) || (dernier(b).t || 0) - (dernier(a).t || 0)).map((e) => {
    const id = e.fiche.id;
    const valeurs = e.liste.map((s) => s.v);
    const record = meilleurScore(id, valeurs);
    const derniers = valeurs.slice(-20);
    const sRecord = [...e.liste].reverse().find((s) => s.v === record);
    const recordDuMois = sRecord && sRecord.d >= debutMois && e.liste.length > 1;
    return `<article class="pr-exo cat-${echapper(e.fiche.categorie)}">
      <div class="pr-exo-tete">
        <h3>${echapper(e.fiche.titre)}</h3>
        <span class="pastille cat-${echapper(e.fiche.categorie)}">${echapper(NOMS_CATEGORIES[e.fiche.categorie] || e.fiche.categorie)}</span>
      </div>
      ${progresCourbe(derniers, SCORES_PLUS_BAS_MIEUX.has(id), meilleurScore(id, derniers))}
      <p class="pr-exo-chiffres">
        <span>⭐ Record <strong>${echapper(texteScore(id, record))}</strong>${recordDuMois ? ` <em class="pr-nouveau">ce mois-ci !</em>` : ""}</span>
        <span>Dernier : ${echapper(texteScore(id, valeurs[valeurs.length - 1]))}</span>
        <span>${e.liste.length} score${e.liste.length > 1 ? "s" : ""}</span>
        ${progresBadgeEvolution(progresEvolutionExo(e))}
      </p>
    </article>`;
  });
  return `<section class="bloc pr-bloc">
    <h2 class="bloc-titre">⭐ Mes records</h2>
    <p class="bloc-info">Courbe des 20 derniers scores (plus haut = mieux) · le gros point = le record</p>
    ${cartes.join("")}
  </section>`;
}

function progresBlocParcours(parties) {
  if (!parties.length) {
    return `<section class="bloc pr-bloc"><h2 class="bloc-titre">⛳ Mes parties</h2>
      <p class="petit">Note une partie dans l'onglet ⛳ Parcours (9 trous ou plus) pour voir ta courbe.</p></section>`;
  }
  const dernieres = parties.slice(-20);
  const ecarts = dernieres.map(progresEcart18);
  const texteEcart18 = (v) => (Math.round(v) === 0 ? "par" : `${v > 0 ? "+" : "−"}${progresVirgule(Math.abs(v))}`);
  const meilleur = Math.min(...parties.map(progresEcart18));
  // Moyennes sur les 5 dernières parties
  const cinq = parties.slice(-5).map((p) => p.stats);
  const somme = (champ) => cinq.reduce((t, s) => t + s[champ], 0);
  const trous = somme("trousJoues"), trousPutts = somme("trousAvecPutts");
  const stats = [
    `<li><span>Écart moyen <small>/18 trous</small></span><strong>${texteEcart18(progresMoyenne(parties.slice(-5).map(progresEcart18)))}</strong></li>`,
    trousPutts ? `<li><span>Putts <small>/18 trous</small></span><strong>${progresVirgule(somme("putts") * 18 / trousPutts)}</strong></li>` : "",
    trousPutts ? `<li><span>Greens en régulation</span><strong>${Math.round(100 * somme("greens") / trousPutts)} %</strong></li>` : "",
    somme("fairwaysNotes") ? `<li><span>Fairways</span><strong>${Math.round(100 * somme("fairwaysTouches") / somme("fairwaysNotes"))} %</strong></li>` : "",
    `<li><span>Birdies ou mieux <small>/18 trous</small></span><strong>${progresVirgule(somme("sousPar") * 18 / trous)}</strong></li>`,
  ].join("");
  return `<section class="bloc pr-bloc">
    <h2 class="bloc-titre">⛳ Mes parties</h2>
    <p class="bloc-info">Écart au par ramené à 18 trous · ${parties.length} partie${parties.length > 1 ? "s" : ""} · meilleure : ${texteEcart18(meilleur)}</p>
    ${progresCourbe(ecarts, true, Math.min(...ecarts))}
    <p class="petit">Moyennes des ${cinq.length} dernières parties :</p>
    <ul class="pr-stats">${stats}</ul>
  </section>`;
}


/* ---------- Affichage (appelé par changerVue, app.js) ---------- */

function afficherProgres() {
  const zone = document.getElementById("progres");
  const exos = progresExosAvecScores();
  const parties = progresParties();
  const notes = typeof tycoonNotesGolfeur === "function" ? tycoonNotesGolfeur() : null;
  zone.innerHTML = `
    <h1 class="pr-titre">📈 Mes progrès</h1>
    ${progresBlocNotes(notes)}
    ${progresBlocMois(exos, parties)}
    ${progresBlocExos(exos)}
    ${progresBlocParcours(parties)}`;
}

// Boutons de la page (délégation, branchée une seule fois)
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("progres").addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("[data-progres]");
    if (!bouton) return;
    if (bouton.dataset.progres === "mental") changerVue("mental");
    if (bouton.dataset.progres === "focus") programmePointFaible(bouton.dataset.focus);
  });
});
