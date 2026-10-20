/* =========================================================
   Séance du jour – logique de la page
   ---------------------------------------------------------
   1. Charger les fiches (fiches.json, ou fiches-data.js en secours)
   2. Construire le programme golf du jour : 3 putting, 1 chipping
      (ou bunker), 2 practice (fers / drive / wedging, de catégories
      différentes). Le sport est dans l'onglet Prépa physique (prepa.js).
      Le programme est tiré une fois par jour et reste le même toute la
      journée ; le bouton « 🔄 Nouveau programme » en tire un autre. Il évite
      les exercices des 3 jours précédents (et le programme actuel).
   3. Gérer « Fait ✓ », « Autre exo », la case score (putting, scores.js)
      et le chrono des exos chronométrés, mémorisés dans le navigateur.
   ========================================================= */

"use strict";

// ---------- Réglages ----------
const JOURS_A_EVITER = 3;            // ne pas reproposer les exos des 3 derniers jours
const PREFIXE_STOCKAGE = "golf-seance-v3:";
const JOURS_CONSERVES = 30;          // on efface les données de plus de 30 jours

// Programme golf : chaque ligne = 1 exercice (un « créneau »)
const CRENEAUX_GOLF = [
  { bloc: "putting", categories: ["putting"] },
  { bloc: "putting", categories: ["putting"] },
  { bloc: "putting", categories: ["putting"] },
  { bloc: "chipping", categories: ["chipping", "bunker"] },
  // categoriesDifferentes : les 2 exos practice ne sont pas de la même catégorie
  { bloc: "practice", categories: ["fers", "drive", "approches"], categoriesDifferentes: true },
  { bloc: "practice", categories: ["fers", "drive", "approches"], categoriesDifferentes: true },
];

// Séance de sport selon le jour (0 = dimanche, 1 = lundi … 6 = samedi) :
// utilisée par le bouton « Je ne sais pas » de l'onglet Prépa physique.
// « exercices » = la catégorie de chaque exercice de la séance, dans l'ordre.
const FORCE_PUISSANCE = {
  nom: "Force / vitesse / puissance",
  exercices: ["puissance", "puissance", "force", "force", "force"],   // l'explosif d'abord, quand on est frais
};
const MOBILITE = { nom: "Mobilité", exercices: ["mobilite", "mobilite", "mobilite", "mobilite", "mobilite"] };
const SEANCES_SPORT = {
  0: { nom: "Récupération légère", exercices: ["recuperation", "mobilite", "mobilite"] },
  1: { nom: "Cardio", exercices: ["cardio", "cardio", "cardio", "cardio", "cardio"] },
  2: FORCE_PUISSANCE,
  3: MOBILITE,
  4: FORCE_PUISSANCE,
  5: { nom: "Abdos", exercices: ["abdos", "abdos", "abdos", "abdos", "abdos"] },
  6: MOBILITE,
};

// Titres des blocs affichés
const NOMS_BLOCS = {
  putting: "⛳ Putting",
  chipping: "🏖️ Chipping / bunker",
  practice: "🏌️ Practice (fers, drive, wedging)",
  sport: "💪 Sport",
};

// Noms affichés des catégories
const NOMS_CATEGORIES = {
  putting: "Putting", chipping: "Chipping", bunker: "Bunker",
  approches: "Wedging", fers: "Fers", drive: "Drive",
  cardio: "Cardio", force: "Force", puissance: "Puissance / vitesse",
  mobilite: "Mobilité", abdos: "Abdos", recuperation: "Récupération",
  "a-classer": "À classer",
};

// Codes d'erreur -> phrases claires (jamais de message technique à l'écran)
const MESSAGES_ERREUR = {
  chargement: "Impossible de charger les exercices. Vérifie ta connexion internet puis recharge la page.",
  format: "La liste des exercices est abîmée (fiches.json). Relance le script de mise à jour ou restaure fiches.json.bak.",
  manque: "Il manque des exercices validés pour composer la séance dans ces catégories : ",
};

// État de la page
let toutesLesFiches = [];   // toutes les fiches (y compris brouillons)
let fichesValides = [];     // seulement celles utilisables dans le programme
let programmeCourant = [];  // programme affiché : [{ creneau, fiche }]
let filtreActif = "tous";   // filtre de la bibliothèque


/* =========================================================
   1. Stockage navigateur – TOUJOURS protégé par try/catch
   (il peut être indisponible : navigation privée, quota…)
   ========================================================= */

// « prefixe » : par défaut celui du programme du jour ; parcours.js utilise
// le sien, pour que ses données (les parties) ne soient jamais purgées.
function lireStockage(cle, valeurParDefaut, prefixe = PREFIXE_STOCKAGE) {
  try {
    const texte = localStorage.getItem(prefixe + cle);
    return texte === null ? valeurParDefaut : JSON.parse(texte);
  } catch (e) {
    return valeurParDefaut;
  }
}

function ecrireStockage(cle, valeur, prefixe = PREFIXE_STOCKAGE) {
  try {
    localStorage.setItem(prefixe + cle, JSON.stringify(valeur));
    return true;
  } catch (e) {
    return false;
  }
}

function stockageDisponible() {
  try {
    const test = PREFIXE_STOCKAGE + "test";
    localStorage.setItem(test, "1");
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

// Efface les journées trop anciennes (et l'ancienne version des données)
function nettoyerVieuxJours() {
  try {
    const limite = dateEnTexte(ajouterJours(new Date(), -JOURS_CONSERVES));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const cle = localStorage.key(i);
      if (!cle) continue;
      if (cle.startsWith("golf-seance:") || cle.startsWith("golf-seance-v2:")) {   // anciennes versions
        localStorage.removeItem(cle);
      } else if (cle.startsWith(PREFIXE_STOCKAGE + "jour:")) {
        const jour = cle.slice((PREFIXE_STOCKAGE + "jour:").length);
        if (jour < limite) localStorage.removeItem(cle);
      }
    }
  } catch (e) {
    // pas grave : on ne fait rien
  }
}

// Données mémorisées pour une journée : le dernier programme affiché,
// les exercices faits et les exercices déjà proposés par « Autre exo »
function lireJournee(jour) {
  const donnees = lireStockage("jour:" + jour, {});
  return {
    programme: Array.isArray(donnees.programme) ? donnees.programme : [],   // ids, dans l'ordre des créneaux
    faits: Array.isArray(donnees.faits) ? donnees.faits : [],
    dejaProposes: donnees.dejaProposes || {},     // { position: [ids] }
  };
}

function ecrireJournee(jour, journee) {
  return ecrireStockage("jour:" + jour, journee);
}


/* =========================================================
   2. Dates
   ========================================================= */

// Date -> "2026-10-17" (heure locale du téléphone)
function dateEnTexte(date) {
  const a = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const j = String(date.getDate()).padStart(2, "0");
  return `${a}-${m}-${j}`;
}

// "2026-10-17" -> Date (à midi, pour éviter les soucis de changement d'heure)
function texteEnDate(texte) {
  const [a, m, j] = texte.split("-").map(Number);
  return new Date(a, m - 1, j, 12);
}

function ajouterJours(date, nombre) {
  const copie = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  copie.setDate(copie.getDate() + nombre);
  return copie;
}

// 125 -> "2 h 05" ; 45 -> "45 min"
function formaterDuree(minutes) {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}


/* =========================================================
   3. Hasard
   ========================================================= */

function choisirAuHasard(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}


/* =========================================================
   4. Construction du programme
   ========================================================= */

// Liste des créneaux du jour (golf seulement : le sport est dans Prépa physique)
function creneauxDuJour() {
  return CRENEAUX_GOLF;
}

// Choisit une fiche pour un créneau.
//  - autres : les exercices déjà placés aujourd'hui ([{ creneau, fiche }])
//  - idsRecents : exercices récents (évités si possible)
//  - exclus : ids à ne pas proposer (pour « Autre exo »)
// On choisit d'abord une CATÉGORIE au hasard, puis une fiche : ainsi le
// wedging (3 fiches) a autant de chances que le drive (4 fiches).
function tirerPourCreneau(creneau, autres, idsRecents, exclus = new Set()) {
  const idsPris = new Set(autres.map((p) => p.fiche && p.fiche.id));
  let candidates = fichesValides.filter(
    (f) => creneau.categories.includes(f.categorie) && !idsPris.has(f.id) && !exclus.has(f.id)
  );

  // Practice : une catégorie différente de l'autre exercice du même bloc
  if (creneau.categoriesDifferentes) {
    const dejaUtilisees = autres
      .filter((p) => p.fiche && p.creneau.bloc === creneau.bloc)
      .map((p) => p.fiche.categorie);
    const sansDoublon = candidates.filter((f) => !dejaUtilisees.includes(f.categorie));
    if (sansDoublon.length > 0) candidates = sansDoublon;
  }

  // On évite les exos des derniers jours… sauf s'il n'en reste plus
  const nonRecentes = candidates.filter((f) => !idsRecents.has(f.id));
  if (nonRecentes.length > 0) candidates = nonRecentes;
  if (candidates.length === 0) return null;

  const categories = [...new Set(candidates.map((f) => f.categorie))].sort();
  const categorie = choisirAuHasard(categories);
  return choisirAuHasard(candidates.filter((f) => f.categorie === categorie));
}

// Exercices à éviter : ceux des 3 jours précédents ET ceux de la dernière
// ouverture d'aujourd'hui (pour que chaque ouverture propose autre chose).
// L'historique est celui mémorisé dans ce navigateur.
function idsRecents(jour) {
  const ids = new Set();
  for (let i = 0; i <= JOURS_A_EVITER; i++) {
    const date = dateEnTexte(ajouterJours(texteEnDate(jour), -i));
    lireJournee(date).programme.forEach((id) => id && ids.add(id));
  }
  return ids;
}

// Tire un tout nouveau programme pour ce jour
function nouveauProgramme(jour) {
  const recents = idsRecents(jour);
  const programme = [];
  for (const creneau of creneauxDuJour(jour)) {
    programme.push({ creneau, fiche: tirerPourCreneau(creneau, programme, recents) });
  }
  return programme;
}

// Programme déjà tiré aujourd'hui (null s'il n'y en a pas ou si une fiche a disparu)
function programmeEnregistre(jour) {
  const ids = lireJournee(jour).programme;
  const creneaux = creneauxDuJour(jour);
  if (ids.length !== creneaux.length) return null;
  const programme = creneaux.map((creneau, i) => ({ creneau, fiche: fichesValides.find((f) => f.id === ids[i]) || null }));
  return programme.every((p) => p.fiche) ? programme : null;
}

// Bouton « 🔄 Nouveau programme » : nouveau tirage, les ✓ repartent de zéro
function tirerNouveauProgramme(jour) {
  if (lireJournee(jour).faits.length > 0 && !confirm("Tirer un nouveau programme ? Les exos cochés « Fait » seront décochés (ta série 🔥 du jour est gardée).")) return;
  programmeCourant = nouveauProgramme(jour);
  enregistrerProgramme(jour, { faits: [], dejaProposes: {} });
  afficherProgramme(jour);
  window.scrollTo(0, 0);
}

// Mémorise le programme affiché (sert d'historique pour les prochains tirages)
function enregistrerProgramme(jour, journee) {
  journee.programme = programmeCourant.map((p) => (p.fiche ? p.fiche.id : null));
  ecrireJournee(jour, journee);
}


/* =========================================================
   5. Actions des boutons
   ========================================================= */

function basculerFait(jour, idFiche) {
  const journee = lireJournee(jour);
  const fait = !journee.faits.includes(idFiche);
  if (fait) {
    journee.faits.push(idFiche);
  } else {
    journee.faits = journee.faits.filter((id) => id !== idFiche);
  }
  ecrireJournee(jour, journee);
  noterExoFait(idFiche, fait);   // série de jours d'affilée (serie.js)
  afficherProgramme(jour);
}

// « Autre exo » : remplace l'exercice à cette position par un autre qui
// respecte le même créneau (même bloc, mêmes catégories). On évite les exos
// déjà proposés aujourd'hui à cette place et ceux des 3 derniers jours,
// tant que c'est possible.
function remplacerExercice(jour, position) {
  const journee = lireJournee(jour);
  const place = programmeCourant[position];
  const autres = programmeCourant.filter((_, i) => i !== position);
  const recents = idsRecents(jour);

  const dejaVus = journee.dejaProposes[position] || [place.fiche.id];
  let nouvelle = tirerPourCreneau(place.creneau, autres, recents, new Set(dejaVus));
  let vus = [...dejaVus];
  if (!nouvelle) {
    // On a fait le tour : on repart de zéro (en évitant juste l'exo actuel)
    nouvelle = tirerPourCreneau(place.creneau, autres, recents, new Set([place.fiche.id]));
    vus = [place.fiche.id];
  }
  if (!nouvelle) return;   // aucun autre exercice possible pour ce créneau

  programmeCourant[position] = { creneau: place.creneau, fiche: nouvelle };
  journee.dejaProposes[position] = [...vus, nouvelle.id];
  journee.faits = journee.faits.filter((id) => id !== place.fiche.id);
  enregistrerProgramme(jour, journee);
  afficherProgramme(jour);
}


/* =========================================================
   6. Affichage
   ========================================================= */

// Protège le texte avant de l'insérer dans la page
function echapper(texte) {
  return String(texte ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function liste(elements, balise) {
  if (!elements || elements.length === 0) return "<p>—</p>";
  return `<${balise}>${elements.map((e) => `<li>${echapper(e)}</li>`).join("")}</${balise}>`;
}

// Lien vers le document d'origine (PDF ou Word), s'il existe
function lienOrigine(fiche) {
  const source = fiche.source || {};
  // Les photos du préparateur ne sont pas publiées en ligne (voir .gitignore) : pas de lien
  if (!source.fichier || source.type === "photo") return "";
  const estPdf = source.fichier.toLowerCase().endsWith(".pdf");
  const ancre = estPdf && source.page ? `#page=${source.page}` : "";
  const texte = estPdf ? "📄 PDF d'origine" : "📄 Document d'origine";
  return `<a class="bouton pleine-largeur" href="${echapper(encodeURI(source.fichier) + ancre)}" target="_blank" rel="noopener">${texte}</a>`;
}

function texteSource(fiche) {
  const s = fiche.source || {};
  if (s.type === "web") {
    return `Source : <a href="${echapper(s.url)}" target="_blank" rel="noopener">${echapper(s.nom)}</a>`;
  }
  if (s.type === "photo") {
    const photos = (s.fichiers || [s.fichier]).map((f) => f.split("/").pop());
    return `Source : fiche de ton préparateur physique (photo${photos.length > 1 ? "s" : ""} ${echapper(photos.join(", "))})`;
  }
  if (s.fichier) {
    const page = s.page ? ` (page ${s.page})` : "";
    return `Source : ta fiche « ${echapper(s.fichier)} »${page}`;
  }
  return "";
}

// Construit le HTML d'une carte d'exercice
// options : { position, numero, fait, avecActions }
function carteFiche(fiche, options) {
  const brouillon = fiche.statut === "brouillon";
  const nomCategorie = NOMS_CATEGORIES[fiche.categorie] || fiche.categorie;
  const numero = options.numero ? `<span class="numero">${options.numero}</span>` : "";
  const pastille = brouillon
    ? `<span class="pastille brouillon">À compléter</span>`
    : `<span class="pastille">${echapper(nomCategorie)}</span>`;

  let contenu;
  if (brouillon) {
    contenu = `
      <p class="note">${echapper(fiche.alerte || "Fiche créée automatiquement : demande à Claude de la rédiger. Elle n'apparaîtra pas dans le programme du jour tant qu'elle n'est pas validée.")}</p>
      ${fiche.texteExtrait ? `<h4>Texte extrait du document</h4><p class="texte-extrait">${echapper(fiche.texteExtrait)}</p>` : ""}`;
  } else {
    contenu = `
      <h4>Matériel</h4>${liste(fiche.materiel, "ul")}
      <h4>Mise en place</h4>${liste(fiche.miseEnPlace, "ol")}
      <h4>Déroulé</h4>${liste(fiche.deroule, "ol")}
      <h4>Critère de réussite</h4><p>${echapper(fiche.reussite)}</p>
      <div class="variantes">
        <div class="variante"><strong>Plus facile</strong>${echapper(fiche.varianteFacile)}</div>
        <div class="variante"><strong>Plus difficile</strong>${echapper(fiche.varianteDifficile)}</div>
      </div>
      ${fiche.note ? `<p class="note">${echapper(fiche.note)}</p>` : ""}`;
  }

  let actions = "";
  if (options.avecActions) {
    actions = `
      <div class="actions">
        <button type="button" class="bouton ${options.fait ? "fait" : "principal"}" data-action="fait" data-id="${echapper(fiche.id)}" aria-pressed="${options.fait}">
          ${options.fait ? "✓ Fait" : "Fait ✓"}
        </button>
        <button type="button" class="bouton" data-action="autre" data-position="${options.position}">↻ Autre exo</button>
        ${lienOrigine(fiche)}
      </div>`;
  } else if (lienOrigine(fiche)) {
    actions = `<div class="actions">${lienOrigine(fiche)}</div>`;
  }

  // Chrono (chrono.js) et case score du putting (scores.js)
  const chronos = brouillon ? "" : boutonsChrono(fiche);
  const score = options.avecActions && !brouillon ? caseScore(fiche) : "";

  return `
    <article class="carte cat-${echapper(fiche.categorie)} ${options.fait ? "faite" : ""}">
      <div class="carte-haut">${pastille}<span class="duree">⏱ ${Number(fiche.duree) || 0} min</span>${numero}</div>
      <h3 class="carte-titre">${echapper(fiche.titre)}</h3>
      ${fiche.objectif ? `<p class="objectif">${echapper(fiche.objectif)}</p>` : ""}
      <details>
        <summary>${brouillon ? "Voir le brouillon" : "Comment faire"}</summary>
        ${contenu}
        <p class="source">${texteSource(fiche)}</p>
      </details>
      ${chronos ? `<div class="chronos">${chronos}</div>` : ""}
      ${score}
      ${actions}
    </article>`;
}

function afficherProgramme(jour) {
  const programme = programmeCourant.map((place, position) => ({ ...place, position }));
  const presents = programme.filter((p) => p.fiche);
  const journee = lireJournee(jour);
  const estFait = (p) => journee.faits.includes(p.fiche.id);
  const duree = (liste) => liste.reduce((total, p) => total + (Number(p.fiche.duree) || 0), 0);

  const nbFaits = presents.filter(estFait).length;

  document.getElementById("resume").innerHTML = `
    <span class="resume-total">⏱ ${formaterDuree(duree(presents))}</span>
    <span class="resume-avancement">${nbFaits}/${presents.length} fait${nbFaits > 1 ? "s" : ""}</span>
    <p class="resume-detail">Golf · le sport est dans l'onglet 💪 Prépa physique</p>
    ${nbFaits === presents.length ? `<p class="resume-bravo">Journée terminée, bravo ! 🎉</p>` : ""}
    <button type="button" class="lien-bouton" data-action="nouveau-programme">🔄 Nouveau programme</button>`;

  // Un bloc par groupe (putting, chipping, practice) avec les exos pas encore faits ;
  // les exos faits descendent tout en bas, grisés, dans « Terminés »
  const blocs = ["putting", "chipping", "practice"];
  const cartesFaites = [];
  const html = blocs
    .map((bloc) => {
      const places = presents.filter((p) => p.creneau.bloc === bloc);
      if (places.length === 0) return "";
      const faits = places.filter(estFait).length;
      const titre = NOMS_BLOCS[bloc];
      let cartes = "";
      places.forEach((p, i) => {
        const carte = carteFiche(p.fiche, {
          position: p.position,
          numero: `${i + 1}/${places.length}`,
          fait: estFait(p),
          avecActions: true,
        });
        if (estFait(p)) cartesFaites.push(carte); else cartes += carte;
      });
      if (!cartes) return "";   // tout le bloc est fait : il n'est plus que dans « Terminés »
      return `
        <section class="bloc">
          <h2 class="bloc-titre">${echapper(titre)}</h2>
          <p class="bloc-info">${places.length} exo${places.length > 1 ? "s" : ""} · ${formaterDuree(duree(places))} · ${faits}/${places.length} fait${faits > 1 ? "s" : ""}</p>
          ${cartes}
        </section>`;
    })
    .join("");
  document.getElementById("programme").innerHTML = html + blocTermines(cartesFaites);
}

// Bloc « ✓ Terminés » placé en bas de page (Aujourd'hui et Prépa)
function blocTermines(cartes) {
  if (cartes.length === 0) return "";
  return `
    <section class="bloc termines">
      <h2 class="bloc-titre">✓ Terminés</h2>
      <p class="bloc-info">${cartes.length} exo${cartes.length > 1 ? "s" : ""} fait${cartes.length > 1 ? "s" : ""} · appuie sur « ✓ Fait » pour annuler</p>
      ${cartes.join("")}
    </section>`;
}

function afficherBibliotheque() {
  // Boutons de filtre : Tous, Golf, Physique, chaque catégorie présente, À compléter
  const categoriesPresentes = Object.keys(NOMS_CATEGORIES).filter((c) => toutesLesFiches.some((f) => f.categorie === c));
  const filtres = [
    ["tous", "Tous"], ["golf", "Golf"], ["physique", "Physique"],
    ...categoriesPresentes.map((c) => [c, NOMS_CATEGORIES[c]]),
  ];
  if (toutesLesFiches.some((f) => f.statut === "brouillon")) filtres.push(["brouillon", "À compléter"]);

  document.getElementById("filtres").innerHTML = filtres
    .map(([valeur, nom]) =>
      `<button type="button" class="filtre ${valeur === filtreActif ? "actif" : ""}" data-filtre="${valeur}" aria-pressed="${valeur === filtreActif}">${echapper(nom)}</button>`)
    .join("");

  const visibles = toutesLesFiches
    .filter((f) => {
      if (filtreActif === "tous") return true;
      if (filtreActif === "brouillon") return f.statut === "brouillon";
      if (filtreActif === "golf" || filtreActif === "physique") return f.type === filtreActif;
      return f.categorie === filtreActif;
    })
    .sort((a, b) => a.type.localeCompare(b.type) || a.categorie.localeCompare(b.categorie) || a.titre.localeCompare(b.titre, "fr"));

  document.getElementById("liste").innerHTML =
    `<p class="compte">${visibles.length} fiche${visibles.length > 1 ? "s" : ""}</p>` +
    visibles.map((f) => carteFiche(f, { avecActions: false })).join("");
}

function afficherBadges(nombreBrouillons, memoireOk) {
  // Seulement les alertes (le nombre d'exos et « progression mémorisée » ont été retirés à la demande de l'utilisateur)
  const badges = [];
  if (!memoireOk) badges.push(`<span class="badge attention">⚠ Mémoire du navigateur indisponible : les ✓ ne seront pas gardés</span>`);
  if (nombreBrouillons > 0) {
    badges.push(`<span class="badge attention">✏️ ${nombreBrouillons} fiche${nombreBrouillons > 1 ? "s" : ""} à compléter</span>`);
  }
  document.getElementById("badges").innerHTML = badges.join("");
}

function afficherErreur(code, complement = "") {
  const zone = document.getElementById("erreur");
  zone.textContent = (MESSAGES_ERREUR[code] || MESSAGES_ERREUR.chargement) + complement;
  zone.hidden = false;
}

// Affiche une vue (jour, biblio, parcours, historique) et cache les autres
function changerVue(vue) {
  document.querySelectorAll("main > section[id^='vue-']").forEach((section) => {
    section.hidden = section.id !== "vue-" + vue;
  });
  document.querySelectorAll(".onglet").forEach((bouton) => {
    const actif = bouton.dataset.vue === vue;
    bouton.classList.toggle("actif", actif);
    bouton.setAttribute("aria-pressed", String(actif));
  });
  if (vue === "biblio") afficherBibliotheque();
  if (vue === "prepa") afficherPrepa();             // dans prepa.js
  if (vue === "parcours") afficherParcours();       // dans parcours.js
  if (vue === "historique") afficherHistorique();   // dans parcours.js
  if (vue === "admin") ouvrirAdmin();               // dans serie.js
  window.scrollTo(0, 0);
}

// Catégories utilisées par le programme mais sans aucune fiche validée
function categoriesManquantes() {
  const utilisees = new Set(CRENEAUX_GOLF.flatMap((c) => c.categories));
  Object.values(SEANCES_SPORT).forEach((s) => s.exercices.forEach((c) => utilisees.add(c)));
  return [...utilisees].filter((c) => !fichesValides.some((f) => f.categorie === c));
}


/* =========================================================
   7. Chargement des fiches
   ========================================================= */

async function chargerFiches() {
  // En ligne : on lit fiches.json (toujours la dernière version)
  try {
    const reponse = await fetch("fiches.json", { cache: "no-cache" });
    if (reponse.ok) return await reponse.json();
  } catch (e) {
    // Page ouverte par double-clic (file://) : fetch est bloqué -> plan B
  }
  // Plan B : la copie chargée par fiches-data.js
  if (window.FICHES_SECOURS) return window.FICHES_SECOURS;
  throw new Error("chargement");
}

async function demarrer() {
  const aujourdhui = dateEnTexte(new Date());
  document.getElementById("date-du-jour").textContent = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const memoireOk = stockageDisponible();
  nettoyerVieuxJours();

  // Onglets branchés tout de suite : « Parcours » marche même sans les fiches
  document.querySelectorAll(".onglet").forEach((bouton) => {
    bouton.addEventListener("click", () => changerVue(bouton.dataset.vue));
  });
  // Première ouverture : la page d'accueil demande le nom (parcours.js)
  afficherAccueil();
  // Une partie était en cours (téléphone mis en veille sur le parcours) : on la reprend
  if (partieEnCoursExiste()) changerVue("parcours");

  let donnees;
  try {
    donnees = await chargerFiches();
  } catch (e) {
    afficherErreur("chargement");
    return;
  }
  if (!donnees || !Array.isArray(donnees.fiches)) {
    afficherErreur("format");
    return;
  }

  toutesLesFiches = donnees.fiches;
  fichesValides = toutesLesFiches.filter((f) => f.statut === "valide");
  afficherBadges(toutesLesFiches.length - fichesValides.length, memoireOk);
  if (donnees.miseAJour) {
    document.getElementById("info-maj").textContent =
      "Fiches mises à jour le " + texteEnDate(donnees.miseAJour).toLocaleDateString("fr-FR");
  }

  // Prévenir clairement s'il manque une catégorie (le programme reste affiché sans elle)
  const manquantes = categoriesManquantes();
  if (manquantes.length > 0) {
    afficherErreur("manque", manquantes.map((c) => NOMS_CATEGORIES[c] || c).join(", ") + ".");
  }

  // Même programme toute la journée (on retrouve aussi les ✓) ; sinon on en tire un
  programmeCourant = programmeEnregistre(aujourdhui);
  if (!programmeCourant) {
    programmeCourant = nouveauProgramme(aujourdhui);
    enregistrerProgramme(aujourdhui, { faits: [], dejaProposes: {} });
  }
  afficherProgramme(aujourdhui);
  // Onglet Prépa ouvert avant la fin du chargement : on l'affiche maintenant
  if (!document.getElementById("vue-prepa").hidden) afficherPrepa();

  document.getElementById("resume").addEventListener("click", (evenement) => {
    if (evenement.target.closest('button[data-action="nouveau-programme"]')) tirerNouveauProgramme(aujourdhui);
  });

  // Un seul écouteur pour tous les boutons des cartes (délégation)
  document.getElementById("programme").addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-action]");
    if (!bouton) return;
    if (bouton.dataset.action === "fait") basculerFait(aujourdhui, bouton.dataset.id);
    if (bouton.dataset.action === "autre") remplacerExercice(aujourdhui, Number(bouton.dataset.position));
  });

  document.getElementById("filtres").addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("button[data-filtre]");
    if (!bouton) return;
    filtreActif = bouton.dataset.filtre;
    afficherBibliotheque();
  });

  // Si la page reste ouverte jusqu'au lendemain, on recharge au retour
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && dateEnTexte(new Date()) !== aujourdhui) {
      window.location.reload();
    }
  });
}

// Mode hors-ligne (seulement en ligne en https, ou sur localhost)
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {
    // Sans service worker la page marche quand même, simplement pas hors-ligne
  });
}

demarrer();
