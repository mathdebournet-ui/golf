/* =========================================================
   Prépa physique – « Qu'est-ce que tu veux faire ? »
   ---------------------------------------------------------
   On choisit :
     - un TYPE DE TRAVAIL (cardio, force, vitesse…),
     - ou un OBJECTIF GOLF (vitesse de swing, dos, échauffement…),
     - ou une SÉANCE DE TON PRÉPARATEUR (refaite à partir de ses
       photos : les photos elles-mêmes ne sont pas publiées),
     - ou « Je ne sais pas » : la séance prévue ce jour-là
       (lundi cardio, mardi force/vitesse… voir SEANCES_SPORT dans app.js).
   La séance choisie reste affichée toute la journée (Fait ✓, Autre exo).
   Ce fichier utilise app.js : fichesValides, toutesLesFiches,
   tirerPourCreneau, carteFiche, lireStockage, ecrireStockage,
   echapper, formaterDuree, dateEnTexte, texteEnDate, SEANCES_SPORT,
   NOMS_CATEGORIES.
   ========================================================= */

"use strict";

// Types de travail : chaque liste = la catégorie de chaque exercice
const TYPES_DE_TRAVAIL = [
  { id: "cardio", nom: "❤️ Cardio", exercices: ["cardio", "cardio", "cardio", "cardio", "cardio"] },
  { id: "force", nom: "🏋️ Force", exercices: ["force", "force", "force", "force", "force"] },
  { id: "puissance", nom: "⚡ Vitesse / puissance", exercices: ["puissance", "puissance", "puissance", "puissance", "puissance"] },
  { id: "mobilite", nom: "🧘 Mobilité", exercices: ["mobilite", "mobilite", "mobilite", "mobilite", "mobilite"] },
  { id: "abdos", nom: "🎯 Abdos / gainage", exercices: ["abdos", "abdos", "abdos", "abdos", "abdos"] },
  { id: "recuperation", nom: "😌 Récupération", exercices: ["recuperation", "recuperation", "mobilite", "mobilite"] },
];

// Objectifs golf : soit des catégories (tirées au hasard), soit une liste
// fixe d'exercices de ton préparateur (« fiches »).
const OBJECTIFS_GOLF = [
  {
    id: "vitesse", nom: "🚀 Gagner de la vitesse de swing",
    detail: "3 exercices explosifs puis 2 de force",
    exercices: ["puissance", "puissance", "puissance", "force", "force"],
  },
  {
    id: "dos", nom: "🛡️ Protéger mon dos",
    detail: "Mobilité des hanches et du haut du dos + gainage",
    exercices: ["mobilite", "mobilite", "abdos", "abdos", "abdos"],
  },
  {
    id: "blessures", nom: "🩹 Prévenir les blessures",
    detail: "Mobilité, force et gainage",
    exercices: ["mobilite", "mobilite", "force", "force", "abdos"],
  },
  {
    id: "echauffement", nom: "🔥 Échauffement avant une partie",
    detail: "La phrase + l'échauffement de compétition de ton préparateur",
    fiches: ["la-phrase", "agilite-ligne", "fente-rotation-jambe-avant", "elastique-diagonale-pied-main",
      "rotations-elastique-mi-hauteur", "squat-jump-leste", "chaise-murale"],
  },
  {
    id: "apres-partie", nom: "🛁 Récupérer après une partie",
    detail: "La récupération de ton préparateur + rouleau et respiration",
    fiches: ["recuperation-apres-competition", "foam-roller-fessiers", "foam-roller-haut-du-dos", "mini-meditation"],
  },
];

let seancesPreparateur = [];   // calculées une fois les fiches chargées


/* =========================================================
   1. Séances du préparateur (une par photo, sans doublons)
   ========================================================= */

function numeroDePhoto(chemin) {
  const nombre = chemin.split("/").pop().match(/^(\d+)\./);
  return nombre ? Number(nombre[1]) : 999;   // photos WhatsApp à la fin
}

function calculerSeancesPreparateur() {
  const parPhoto = new Map();   // photo -> [fiches], dans l'ordre de fiches.json
  fichesValides
    .filter((f) => f.type === "physique" && f.source && f.source.type === "photo")
    .forEach((f) => {
      [...new Set(f.source.fichiers || [f.source.fichier])].forEach((photo) => {
        if (!parPhoto.has(photo)) parPhoto.set(photo, []);
        parPhoto.get(photo).push(f);
      });
    });

  // Plusieurs photos montrent la même séance : on n'en garde qu'une
  const dejaVues = new Set();
  const seances = [];
  [...parPhoto.entries()]
    .sort(([a], [b]) => numeroDePhoto(a) - numeroDePhoto(b))
    .forEach(([photo, fiches]) => {
      const cle = fiches.map((f) => f.id).sort().join(",");
      if (dejaVues.has(cle)) return;
      dejaVues.add(cle);
      const categories = [...new Set(fiches.map((f) => NOMS_CATEGORIES[f.categorie] || f.categorie))];
      seances.push({
        id: "photo-" + seances.length,
        nom: `Séance ${seances.length + 1} : ${categories.join(", ")}`,
        detail: `${fiches.length} exercice${fiches.length > 1 ? "s" : ""} · ${formaterDuree(fiches.reduce((t, f) => t + (Number(f.duree) || 0), 0))}`,
        fiches: fiches.map((f) => f.id),
      });
    });
  seancesPreparateur = seances;
}


/* =========================================================
   2. Construire et mémoriser la séance choisie
   ========================================================= */

// Séance mémorisée pour aujourd'hui (sinon null)
function seanceMemorisee() {
  const seance = lireStockage("prepa", null);
  return seance && seance.jour === dateEnTexte(new Date()) ? seance : null;
}

// choix : { titre, exercices: [catégories] } ou { titre, fiches: [ids] }
function lancerSeance(choix) {
  const programme = [];   // [{ creneau, fiche }] : même format que le programme du jour
  if (choix.fiches) {
    choix.fiches.forEach((id) => {
      const fiche = fichesValides.find((f) => f.id === id);
      if (fiche) programme.push({ creneau: { bloc: "sport", categories: [fiche.categorie] }, fiche });
    });
  } else {
    choix.exercices.forEach((categorie) => {
      const creneau = { bloc: "sport", categories: [categorie] };
      programme.push({ creneau, fiche: tirerPourCreneau(creneau, programme, new Set()) });
    });
  }
  const presents = programme.filter((p) => p.fiche);
  ecrireStockage("prepa", {
    jour: dateEnTexte(new Date()),
    titre: choix.titre,
    categories: presents.map((p) => p.creneau.categories[0]),
    ids: presents.map((p) => p.fiche.id),
    faits: [],
  });
  afficherPrepa();
  window.scrollTo(0, 0);
}

function choisir(type, id) {
  if (type === "travail") {
    const t = TYPES_DE_TRAVAIL.find((x) => x.id === id);
    if (t) lancerSeance({ titre: t.nom, exercices: t.exercices });
  } else if (type === "objectif") {
    const o = OBJECTIFS_GOLF.find((x) => x.id === id);
    if (o) lancerSeance({ titre: o.nom, exercices: o.exercices, fiches: o.fiches });
  } else if (type === "preparateur") {
    const s = seancesPreparateur.find((x) => x.id === id);
    if (s) lancerSeance({ titre: "📋 " + s.nom, fiches: s.fiches });
  } else if (type === "je-sais-pas") {
    const seance = SEANCES_SPORT[new Date().getDay()];
    lancerSeance({ titre: `🤷 Séance du jour : ${seance.nom}`, exercices: seance.exercices });
  }
}

function basculerFaitPrepa(id) {
  const seance = seanceMemorisee();
  if (!seance) return;
  seance.faits = seance.faits.includes(id) ? seance.faits.filter((x) => x !== id) : [...seance.faits, id];
  ecrireStockage("prepa", seance);
  afficherPrepa();
}

// « Autre exo » : un autre exercice de la même catégorie
function remplacerPrepa(position) {
  const seance = seanceMemorisee();
  if (!seance) return;
  const programme = programmeDeSeance(seance);
  const place = programme.find((p) => p.position === position);
  if (!place) return;
  const autres = programme.filter((p) => p.position !== position);
  const nouvelle = tirerPourCreneau(place.creneau, autres, new Set(), new Set([place.fiche.id]));
  if (!nouvelle) return;
  seance.ids[position] = nouvelle.id;
  seance.faits = seance.faits.filter((x) => x !== place.fiche.id);
  ecrireStockage("prepa", seance);
  afficherPrepa();
}

function programmeDeSeance(seance) {
  return seance.ids
    .map((id, i) => ({
      position: i,   // place dans seance.ids (utile pour « Autre exo »)
      creneau: { bloc: "sport", categories: [seance.categories[i]] },
      fiche: fichesValides.find((f) => f.id === id),
    }))
    .filter((p) => p.fiche);   // fiche supprimée entre-temps : on l'ignore
}


/* =========================================================
   3. Affichage
   ========================================================= */

function ecranChoix() {
  const seanceDuJour = SEANCES_SPORT[new Date().getDay()];
  const jour = new Date().toLocaleDateString("fr-FR", { weekday: "long" });
  const bouton = (type, id, nom, detail) => `
    <button type="button" class="resultat" data-action="choisir" data-type="${type}" data-id="${echapper(id)}">
      <strong>${echapper(nom)}</strong>${detail ? `<span>${echapper(detail)}</span>` : ""}
    </button>`;

  return `
    <h2 class="bloc-titre">Qu'est-ce que tu veux faire ?</h2>
    <button type="button" class="bouton principal pleine-largeur je-sais-pas" data-action="choisir" data-type="je-sais-pas" data-id="jour">
      🤷 Je ne sais pas
      <small>Séance prévue le ${echapper(jour)} : ${echapper(seanceDuJour.nom)}</small>
    </button>

    <h3 class="sous-titre">Type de travail</h3>
    <div class="grille-choix">
      ${TYPES_DE_TRAVAIL.map((t) => `<button type="button" class="bouton" data-action="choisir" data-type="travail" data-id="${t.id}">${echapper(t.nom)}</button>`).join("")}
    </div>

    <h3 class="sous-titre">Objectif golf</h3>
    ${OBJECTIFS_GOLF.map((o) => bouton("objectif", o.id, o.nom, o.detail)).join("")}

    <h3 class="sous-titre">Séances de ton préparateur</h3>
    <p class="petit">Refaites à partir des photos de ses fiches (les photos restent privées).</p>
    ${seancesPreparateur.map((s) => bouton("preparateur", s.id, s.nom, s.detail)).join("")}`;
}

function ecranSeance(seance) {
  const programme = programmeDeSeance(seance);
  const duree = programme.reduce((t, p) => t + (Number(p.fiche.duree) || 0), 0);
  const nbFaits = programme.filter((p) => seance.faits.includes(p.fiche.id)).length;
  const cartes = programme.map((p, i) => carteFiche(p.fiche, {
    position: p.position,
    numero: `${i + 1}/${programme.length}`,
    fait: seance.faits.includes(p.fiche.id),
    avecActions: true,
  })).join("");

  return `
    <div class="resume">
      <span class="resume-total">${echapper(seance.titre)}</span>
      <p class="resume-detail">⏱ ${formaterDuree(duree)} · ${nbFaits}/${programme.length} fait${nbFaits > 1 ? "s" : ""}</p>
      ${programme.length > 0 && nbFaits === programme.length ? `<p class="resume-bravo">Séance terminée, bravo ! 🎉</p>` : ""}
    </div>
    ${cartes || `<p class="info-recherche attention">Aucun exercice disponible pour ce choix.</p>`}
    <button type="button" class="bouton pleine-largeur retour" data-action="changer">← Choisir une autre séance</button>`;
}

function afficherPrepa() {
  const zone = document.getElementById("prepa");
  if (fichesValides.length === 0) {
    zone.innerHTML = `<p class="info-recherche attention">Les exercices ne sont pas encore chargés. Vérifie ta connexion puis recharge la page.</p>`;
    return;
  }
  if (seancesPreparateur.length === 0) calculerSeancesPreparateur();
  const seance = seanceMemorisee();
  zone.innerHTML = seance ? ecranSeance(seance) : ecranChoix();
}


/* =========================================================
   4. Écouteur (un seul pour tout l'onglet)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("prepa").addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-action]");
    if (!bouton) return;
    const d = bouton.dataset;
    if (d.action === "choisir") choisir(d.type, d.id);
    if (d.action === "fait") basculerFaitPrepa(d.id);
    if (d.action === "autre") remplacerPrepa(Number(d.position));
    if (d.action === "changer") {
      ecrireStockage("prepa", null);
      afficherPrepa();
      window.scrollTo(0, 0);
    }
  });
});
