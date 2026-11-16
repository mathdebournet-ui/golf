/* =========================================================
   Onglet 🧠 Mental
   - Exercice mental du jour (même exercice toute la journée,
     une catégorie différente chaque jour, rotation équilibrée)
   - Minuteur guidé plein écran (respiration animée, visualisation)
   - Routines « Sous pression » (coup sous pression / avant le départ)
   - Liste de tous les exercices mentaux, filtrable
   - « C'est fait » + ressenti + note libre, gardés dans le navigateur
   Contenu : mental-data.js (window.DONNEES_MENTAL).
   Ne compte PAS pour la série 🔥 (choix de l'utilisateur).
   Toutes les fonctions commencent par « mental » : les fichiers
   partagent les mêmes noms globaux, on évite les collisions.
   ========================================================= */

const PREFIXE_MENTAL = "golf-mental-v1:";   // ne jamais purger : notes de l'utilisateur
const COULEURS_MENTAL = {
  respiration: "#2b6a8a", routine: "#1d6b3a", pression: "#b0122f",
  visualisation: "#6a2c91", concentration: "#8a5300", confiance: "#2e7d4f", analyse: "#3a4f66",
};
const RESSENTIS_MENTAL = ["", "😣 Tendu", "😐 Neutre", "🙂 Bien", "💪 Au top"];

let mentalSousVue = "jour";       // "jour" | "pression" | "liste"
let mentalFiltre = "tous";
let mentalOuvert = null;          // id de l'exercice ouvert depuis la liste

/* ---------- Données & stockage ---------- */
function mentalDonnees() { return window.DONNEES_MENTAL || { categories: [], exercices: [], routinesPression: [] }; }
function mentalHistorique() { return lireStockage("historique", [], PREFIXE_MENTAL); }   // lireStockage : app.js (try/catch)
function mentalEnregistrer(liste) { return ecrireStockage("historique", liste, PREFIXE_MENTAL); }
function mentalExo(id) { return mentalDonnees().exercices.find((e) => e.id === id); }
function mentalNomCat(id) { return (mentalDonnees().categories.find((c) => c.id === id) || {}).nom || id; }

// Date locale AAAA-MM-JJ et numéro de jour stable
function mentalCleDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mentalNumeroJour(d = new Date()) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/** Exercice du jour : la catégorie tourne chaque jour, puis on avance d'un exercice dans la catégorie. */
function mentalExoDuJour(d = new Date()) {
  const { categories, exercices } = mentalDonnees();
  const cats = categories.filter((c) => exercices.some((e) => e.categorie === c.id));
  if (!cats.length) return null;
  const n = mentalNumeroJour(d);
  const cat = cats[n % cats.length];
  const liste = exercices.filter((e) => e.categorie === cat.id);
  return liste[Math.floor(n / cats.length) % liste.length];
}

function mentalEntreeDuJour(id) {
  const jour = mentalCleDate();
  return mentalHistorique().find((h) => h.date === jour && h.id === id);
}
function mentalMarquerFait(id) {
  const liste = mentalHistorique();
  if (!liste.some((h) => h.date === mentalCleDate() && h.id === id)) {
    liste.push({ date: mentalCleDate(), id, ressenti: null, note: "", t: Date.now() });
    if (!mentalEnregistrer(liste)) mentalMessage("Pas pu enregistrer : la mémoire du navigateur est indisponible (navigation privée ?).");
  }
}
function mentalAnnulerFait(id) {
  mentalEnregistrer(mentalHistorique().filter((h) => !(h.date === mentalCleDate() && h.id === id)));
}

/* ---------- Affichage de l'onglet ---------- */
function afficherMental() {
  const zone = document.getElementById("mental");
  if (!zone) return;
  if (!mentalDonnees().exercices.length) {
    zone.innerHTML = `<p class="erreur">Les exercices mentaux n'ont pas pu être chargés (fichier mental-data.js manquant ou mal écrit).</p>`;
    return;
  }
  const sousVues = [["jour", "Du jour"], ["pression", "⚡ Pression"], ["liste", "Tous"]];
  zone.innerHTML = `
    <div class="filtres mt-sous-onglets">
      ${sousVues.map(([v, nom]) => `<button type="button" class="filtre ${v === mentalSousVue ? "actif" : ""}" data-mental-vue="${v}">${nom}</button>`).join("")}
    </div>
    <div id="mental-contenu"></div>
    <p class="mt-mention">${echapper(mentalDonnees().mention || "")}</p>`;
  if (mentalSousVue === "jour") mentalAfficherJour();
  else if (mentalSousVue === "pression") mentalAfficherPression();
  else mentalAfficherListe();
}

function mentalDuree(m) {
  if (!m) return 0;
  return m.type === "simple" ? m.secondes : m.cycles * m.phases.reduce((s, p) => s + p.secondes, 0);
}
function mentalFormatTemps(sec) { return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`; }

/** Carte complète d'un exercice mental (même style que les fiches golf). */
function mentalCarte(exo) {
  const fait = mentalEntreeDuJour(exo.id);
  const m = exo.minuteur;
  return `
  <article class="carte ${fait ? "faite" : ""}" style="--couleur-cat:${COULEURS_MENTAL[exo.categorie] || "var(--accent)"}">
    <div class="carte-haut">
      <span class="pastille">${echapper(mentalNomCat(exo.categorie))}</span>
      <span class="duree">⏱ ${echapper(exo.duree)} min</span>
      ${exo.lieu ? `<span class="duree">· ${echapper(exo.lieu)}</span>` : ""}
    </div>
    <h3 class="carte-titre">${echapper(exo.titre)}</h3>
    <p class="objectif">${echapper(exo.objectif)}</p>
    <h4>Étapes</h4>
    <ol>${exo.etapes.map((e) => `<li>${echapper(e)}</li>`).join("")}</ol>
    ${exo.conseil ? `<div class="variante mt-conseil"><strong>Le conseil</strong>${echapper(exo.conseil)}</div>` : ""}
    ${fait && (fait.ressenti || fait.note) ? `<p class="mt-ma-note">${fait.ressenti ? RESSENTIS_MENTAL[fait.ressenti] : ""}${fait.note ? ` — « ${echapper(fait.note)} »` : ""}</p>` : ""}
    <div class="actions">
      ${m ? `<button type="button" class="bouton ${fait ? "" : "principal"} pleine-largeur" data-mental-minuteur="${echapper(exo.id)}">▶ Minuteur guidé · ${mentalFormatTemps(mentalDuree(m))}</button>` : ""}
      ${fait
        ? `<button type="button" class="bouton fait pleine-largeur" data-mental-note="${echapper(exo.id)}">✓ Fait · ${fait.note || fait.ressenti ? "modifier ma note" : "ajouter une note"}</button>`
        : `<button type="button" class="bouton ${m ? "" : "principal"} pleine-largeur" data-mental-fait="${echapper(exo.id)}">C'est fait</button>`}
    </div>
  </article>`;
}

function mentalAfficherJour() {
  const exo = mentalExoDuJour();
  const demain = new Date(); demain.setDate(demain.getDate() + 1);
  const exoDemain = mentalExoDuJour(demain);
  const recents = [...mentalHistorique()].sort((a, b) => b.t - a.t).slice(0, 5);
  const total = mentalHistorique().length;
  document.getElementById("mental-contenu").innerHTML = `
    <h2 class="bloc-titre">Ton exercice mental du jour</h2>
    <p class="bloc-info">Demain : ${echapper(mentalNomCat(exoDemain.categorie))}</p>
    ${mentalCarte(exo)}
    <h2 class="bloc-titre">Mes dernières notes</h2>
    <p class="bloc-info">${total} exercice${total > 1 ? "s" : ""} mental${total > 1 ? "aux" : ""} fait${total > 1 ? "s" : ""} au total</p>
    ${recents.length
      ? `<ul class="mt-notes">${recents.map((h) => {
          const e = mentalExo(h.id);
          const [a, mo, j] = h.date.split("-").map(Number);
          return `<li><strong>${echapper(e ? e.titre : h.id)}</strong> <span class="duree">${new Date(a, mo - 1, j).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
            ${h.ressenti || h.note ? `<br><span class="mt-gris">${h.ressenti ? RESSENTIS_MENTAL[h.ressenti] : ""}${h.note ? ` — « ${echapper(h.note)} »` : ""}</span>` : ""}</li>`;
        }).join("")}</ul>`
      : `<p class="compte">Rien pour l'instant : ton premier exercice mental t'attend juste au-dessus.</p>`}`;
}

function mentalAfficherPression() {
  document.getElementById("mental-contenu").innerHTML = `
    <h2 class="bloc-titre">Sous pression ?</h2>
    <p class="bloc-info">Choisis ta routine et laisse-toi guider, étape par étape.</p>
    ${mentalDonnees().routinesPression.map((r) => {
      const total = r.etapes.reduce((s, e) => s + e.secondes, 0);
      return `<button type="button" class="bouton mt-routine" data-mental-routine="${echapper(r.id)}">
        <span class="mt-routine-titre">${total < 90 ? "⚡" : "⛳"} ${echapper(r.titre)}</span>
        <small>${echapper(r.sousTitre)} · ${mentalFormatTemps(total)}</small>
      </button>`;
    }).join("")}`;
}

function mentalAfficherListe() {
  const { categories, exercices } = mentalDonnees();
  if (mentalOuvert && mentalExo(mentalOuvert)) {
    document.getElementById("mental-contenu").innerHTML = `
      <button type="button" class="lien-bouton mt-retour" data-mental-retour>← Tous les exercices mentaux</button>
      ${mentalCarte(mentalExo(mentalOuvert))}`;
    return;
  }
  const faits = new Set(mentalHistorique().map((h) => h.id));
  const liste = exercices.filter((e) => mentalFiltre === "tous" || e.categorie === mentalFiltre);
  document.getElementById("mental-contenu").innerHTML = `
    <div class="filtres sous-filtres">
      ${[{ id: "tous", nom: "Toutes" }, ...categories].map((c) =>
        `<button type="button" class="filtre ${c.id === mentalFiltre ? "actif" : ""}" data-mental-filtre="${echapper(c.id)}">${echapper(c.nom)}</button>`).join("")}
    </div>
    <p class="compte">${liste.length} exercice${liste.length > 1 ? "s" : ""}</p>
    ${liste.map((e) => `
      <button type="button" class="carte mt-ligne" style="--couleur-cat:${COULEURS_MENTAL[e.categorie]}" data-mental-ouvrir="${echapper(e.id)}">
        <span class="carte-haut"><span class="pastille">${echapper(mentalNomCat(e.categorie))}</span>
          <span class="duree">${echapper(e.duree)} min${e.minuteur ? " · minuteur" : ""}${faits.has(e.id) ? " · ✓ déjà fait" : ""}</span></span>
        <span class="mt-ligne-titre">${echapper(e.titre)} ›</span>
      </button>`).join("")}`;
}

/* =========================================================
   Minuteur plein écran
   Une séquence = liste d'étapes { titre, texte, secondes, phases? }.
   Temps mesuré avec performance.now() ; setInterval (et pas
   requestAnimationFrame) pour continuer même si l'écran passe
   en arrière-plan. La transition CSS rend l'animation fluide.
   ========================================================= */
const MENTAL_MIN = { etapes: [], i: 0, debut: 0, pauseA: null, timer: 0, fini: false, exoId: null, verrou: null, phasePrec: "" };
const MENTAL_CIRC = 339.3; // 2πr, r = 54

function mentalCreerOverlays() {
  if (document.getElementById("mt-minuteur")) return;
  document.body.insertAdjacentHTML("beforeend", `
  <div id="mt-minuteur" class="mt-minuteur" hidden role="dialog" aria-modal="true" aria-labelledby="mt-min-titre">
    <div class="mt-min-haut">
      <button type="button" class="mt-rond" data-mental-min="fermer" aria-label="Arrêter">✕</button>
      <span id="mt-min-titre" class="mt-min-titre"></span>
      <span id="mt-min-total" class="mt-min-total"></span>
    </div>
    <div id="mt-min-etapes" class="mt-min-etapes"></div>
    <div class="mt-min-centre">
      <div class="mt-cercle">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" class="mt-anneau-fond"/><circle cx="60" cy="60" r="54" class="mt-anneau" id="mt-anneau"/></svg>
        <div id="mt-bulle" class="mt-bulle"></div>
        <div class="mt-min-texte"><span id="mt-phase" class="mt-phase"></span><span id="mt-secondes" class="mt-secondes"></span></div>
      </div>
      <p id="mt-consigne" class="mt-consigne"></p>
    </div>
    <div class="mt-min-bas">
      <button type="button" class="bouton mt-clair" data-mental-min="pause" id="mt-pause">Pause</button>
      <button type="button" class="bouton mt-clair" data-mental-min="suivant" id="mt-suivant" hidden>Étape suivante</button>
      <button type="button" class="bouton mt-or" data-mental-min="fait" id="mt-fait" hidden>C'est fait</button>
    </div>
  </div>
  <div id="mt-voile" class="mt-voile" hidden></div>
  <div id="mt-feuille" class="mt-feuille" hidden role="dialog" aria-modal="true" aria-labelledby="mt-feuille-titre">
    <h2 id="mt-feuille-titre">Bravo, c'est noté ✓</h2>
    <p id="mt-feuille-exo" class="compte"></p>
    <p class="mt-etiquette">Comment tu t'es senti ?</p>
    <div class="mt-ressentis" id="mt-ressentis">
      ${[1, 2, 3, 4].map((r) => `<button type="button" class="filtre" data-r="${r}">${RESSENTIS_MENTAL[r]}</button>`).join("")}
    </div>
    <label class="mt-etiquette" for="mt-note">Ta note (facultatif)</label>
    <textarea id="mt-note" rows="3" maxlength="600" placeholder="Ce que tu as ressenti, ce que tu retiens…"></textarea>
    <div class="actions">
      <button type="button" class="bouton principal pleine-largeur" data-mental-feuille="enregistrer">Enregistrer</button>
      <button type="button" class="lien-bouton pleine-largeur" data-mental-feuille="annuler">Annuler « fait »</button>
    </div>
  </div>`);
}

function mentalOuvrirMinuteur(titre, etapes, exoId) {
  Object.assign(MENTAL_MIN, { etapes, i: 0, pauseA: null, fini: false, exoId });
  document.getElementById("mt-min-titre").textContent = titre;
  document.getElementById("mt-min-etapes").innerHTML = etapes.length > 1 ? etapes.map(() => "<i></i>").join("") : "";
  document.getElementById("mt-suivant").hidden = etapes.length < 2;
  document.getElementById("mt-pause").hidden = false;
  document.getElementById("mt-pause").textContent = "Pause";
  document.getElementById("mt-fait").hidden = true;
  document.getElementById("mt-minuteur").hidden = false;
  document.body.style.overflow = "hidden";
  mentalEcranAllume(true);
  mentalEntrerEtape();
  mentalTic();
  clearInterval(MENTAL_MIN.timer);
  MENTAL_MIN.timer = setInterval(mentalTic, 100);
}
function mentalFermerMinuteur() {
  clearInterval(MENTAL_MIN.timer);
  document.getElementById("mt-minuteur").hidden = true;
  document.body.style.overflow = "";
  mentalEcranAllume(false);
}
function mentalEntrerEtape() {
  const e = MENTAL_MIN.etapes[MENTAL_MIN.i];
  MENTAL_MIN.debut = performance.now();
  MENTAL_MIN.phasePrec = "";
  document.getElementById("mt-consigne").textContent = MENTAL_MIN.etapes.length > 1 ? `${e.titre} — ${e.texte}` : e.texte;
  document.querySelectorAll("#mt-min-etapes i").forEach((el, k) => {
    el.className = k < MENTAL_MIN.i ? "passe" : k === MENTAL_MIN.i ? "encours" : "";
  });
  document.getElementById("mt-suivant").textContent = MENTAL_MIN.i === MENTAL_MIN.etapes.length - 1 ? "Terminer" : "Étape suivante";
  if (MENTAL_MIN.i > 0) mentalVibrer(60);
}
function mentalTic() {
  if (MENTAL_MIN.fini) return;
  const e = MENTAL_MIN.etapes[MENTAL_MIN.i];
  const t = Math.min(((MENTAL_MIN.pauseA ?? performance.now()) - MENTAL_MIN.debut) / 1000, e.secondes);
  const reste = e.secondes - t;
  const resteTotal = reste + MENTAL_MIN.etapes.slice(MENTAL_MIN.i + 1).reduce((a, x) => a + x.secondes, 0);
  document.getElementById("mt-min-total").textContent = mentalFormatTemps(Math.ceil(resteTotal));
  document.getElementById("mt-anneau").style.strokeDashoffset = MENTAL_CIRC * (1 - t / e.secondes);

  const bulle = document.getElementById("mt-bulle");
  if (e.phases) {
    // Respiration : on retrouve la phase en cours dans le cycle
    const cycle = e.phases.reduce((a, p) => a + p.secondes, 0);
    let x = t % cycle, k = 0, echelle = 0.55;
    while (k < e.phases.length - 1 && x >= e.phases[k].secondes) {
      if (e.phases[k].action === "in") echelle = 1;
      if (e.phases[k].action === "out") echelle = 0.55;
      x -= e.phases[k].secondes; k++;
    }
    const p = e.phases[k];
    const prog = 0.5 - Math.cos(Math.PI * (x / p.secondes)) / 2;   // départ et arrivée en douceur
    if (p.action === "in") echelle = 0.55 + 0.45 * prog;
    if (p.action === "out") echelle = 1 - 0.45 * prog;
    bulle.style.transform = `scale(${echelle})`;
    document.getElementById("mt-phase").textContent = p.label;
    document.getElementById("mt-secondes").textContent = Math.max(1, Math.ceil(p.secondes - x));
    const cle = `${Math.floor(t / cycle)}-${k}`;
    if (MENTAL_MIN.phasePrec && cle !== MENTAL_MIN.phasePrec) mentalVibrer(25);
    MENTAL_MIN.phasePrec = cle;
  } else {
    bulle.style.transform = "scale(.82)";
    document.getElementById("mt-phase").textContent = MENTAL_MIN.etapes.length > 1 ? e.titre : "";
    document.getElementById("mt-secondes").textContent = mentalFormatTemps(Math.ceil(reste));
  }
  if (reste <= 0 && !MENTAL_MIN.pauseA) {
    if (MENTAL_MIN.i < MENTAL_MIN.etapes.length - 1) { MENTAL_MIN.i++; mentalEntrerEtape(); }
    else mentalTerminer();
  }
}
function mentalTerminer() {
  MENTAL_MIN.fini = true;
  clearInterval(MENTAL_MIN.timer);
  mentalVibrer([120, 80, 120]);
  mentalEcranAllume(false);
  document.getElementById("mt-bulle").style.transform = "scale(.82)";
  document.getElementById("mt-phase").textContent = "Terminé";
  document.getElementById("mt-secondes").textContent = "✓";
  document.getElementById("mt-min-total").textContent = "0:00";
  document.getElementById("mt-anneau").style.strokeDashoffset = 0;
  document.getElementById("mt-consigne").textContent = MENTAL_MIN.exoId ? "Beau travail. Note comment tu t'es senti." : "Tu es prêt. Joue ton coup, libéré.";
  document.querySelectorAll("#mt-min-etapes i").forEach((el) => (el.className = "passe"));
  document.getElementById("mt-pause").hidden = true;
  document.getElementById("mt-suivant").hidden = true;
  document.getElementById("mt-fait").hidden = !MENTAL_MIN.exoId;
  if (!MENTAL_MIN.exoId) setTimeout(() => { if (MENTAL_MIN.fini) mentalFermerMinuteur(); }, 4000);
}
function mentalPause() {
  if (MENTAL_MIN.fini) return;
  const bouton = document.getElementById("mt-pause");
  if (MENTAL_MIN.pauseA) { MENTAL_MIN.debut += performance.now() - MENTAL_MIN.pauseA; MENTAL_MIN.pauseA = null; bouton.textContent = "Pause"; }
  else { MENTAL_MIN.pauseA = performance.now(); bouton.textContent = "Reprendre"; }
}
function mentalEtapeSuivante() {
  if (MENTAL_MIN.fini) return;
  MENTAL_MIN.pauseA = null;
  document.getElementById("mt-pause").textContent = "Pause";
  if (MENTAL_MIN.i < MENTAL_MIN.etapes.length - 1) { MENTAL_MIN.i++; mentalEntrerEtape(); mentalTic(); }
  else mentalTerminer();
}
function mentalVibrer(motif) { try { if (navigator.vibrate) navigator.vibrate(motif); } catch (e) { /* non supporté */ } }
async function mentalEcranAllume(actif) {
  try {
    if (actif && "wakeLock" in navigator) MENTAL_MIN.verrou = await navigator.wakeLock.request("screen");
    else if (!actif && MENTAL_MIN.verrou) { await MENTAL_MIN.verrou.release(); MENTAL_MIN.verrou = null; }
  } catch (e) { /* refusé ou non supporté : pas grave */ }
}

/* ---------- Feuille « Comment je me suis senti » ---------- */
let mentalNoteId = null;
function mentalOuvrirNote(id) {
  const exo = mentalExo(id);
  const entree = mentalEntreeDuJour(id);
  if (!exo || !entree) return;
  mentalNoteId = id;
  document.getElementById("mt-feuille-exo").textContent = exo.titre;
  document.getElementById("mt-note").value = entree.note || "";
  document.querySelectorAll("#mt-ressentis .filtre").forEach((b) => b.classList.toggle("actif", Number(b.dataset.r) === entree.ressenti));
  document.getElementById("mt-voile").hidden = false;
  document.getElementById("mt-feuille").hidden = false;
}
function mentalFermerNote() {
  document.getElementById("mt-voile").hidden = true;
  document.getElementById("mt-feuille").hidden = true;
  mentalNoteId = null;
  afficherMental();
}
function mentalEnregistrerNote() {
  const liste = mentalHistorique();
  const entree = liste.find((h) => h.date === mentalCleDate() && h.id === mentalNoteId);
  if (entree) {
    const choisi = document.querySelector("#mt-ressentis .filtre.actif");
    entree.ressenti = choisi ? Number(choisi.dataset.r) : null;
    entree.note = document.getElementById("mt-note").value.trim().slice(0, 600);
    if (!mentalEnregistrer(liste)) mentalMessage("Pas pu enregistrer : la mémoire du navigateur est indisponible (navigation privée ?).");
  }
  mentalFermerNote();
}
function mentalMessage(texte) {
  const zone = document.getElementById("erreur");
  if (zone) { zone.textContent = texte; zone.hidden = false; }
}

/* ---------- Clics (un seul écouteur, délégation) ---------- */
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-mental-vue],[data-mental-filtre],[data-mental-ouvrir],[data-mental-retour],[data-mental-fait],[data-mental-note],[data-mental-minuteur],[data-mental-routine],[data-mental-min],[data-mental-feuille],#mt-ressentis .filtre,#mt-voile");
  if (!el) return;
  const d = el.dataset;
  if (d.mentalVue) { mentalSousVue = d.mentalVue; mentalOuvert = null; afficherMental(); }
  else if (d.mentalFiltre) { mentalFiltre = d.mentalFiltre; afficherMental(); }
  else if (d.mentalOuvrir) { mentalOuvert = d.mentalOuvrir; afficherMental(); window.scrollTo(0, 0); }
  else if ("mentalRetour" in d) { mentalOuvert = null; afficherMental(); }
  else if (d.mentalFait) { mentalMarquerFait(d.mentalFait); mentalOuvrirNote(d.mentalFait); }
  else if (d.mentalNote) mentalOuvrirNote(d.mentalNote);
  else if (d.mentalMinuteur) {
    const exo = mentalExo(d.mentalMinuteur);
    if (!exo || !exo.minuteur) return;
    const m = exo.minuteur;
    const etape = m.type === "respiration"
      ? { titre: exo.titre, texte: "Suis le rythme de la bulle.", secondes: mentalDuree(m), phases: m.phases }
      : { titre: exo.titre, texte: "Ferme les yeux si tu peux. Le téléphone vibre à la fin.", secondes: m.secondes, phases: null };
    mentalOuvrirMinuteur(exo.titre, [etape], exo.id);
  }
  else if (d.mentalRoutine) {
    const r = mentalDonnees().routinesPression.find((x) => x.id === d.mentalRoutine);
    if (r) mentalOuvrirMinuteur(r.titre, r.etapes.map((e) => ({ titre: e.titre, texte: e.texte, secondes: e.secondes, phases: e.respiration || null })), null);
  }
  else if (d.mentalMin === "fermer") mentalFermerMinuteur();
  else if (d.mentalMin === "pause") mentalPause();
  else if (d.mentalMin === "suivant") mentalEtapeSuivante();
  else if (d.mentalMin === "fait") { const id = MENTAL_MIN.exoId; mentalFermerMinuteur(); mentalMarquerFait(id); mentalOuvrirNote(id); }
  else if (d.mentalFeuille === "enregistrer" || el.id === "mt-voile") mentalEnregistrerNote();
  else if (d.mentalFeuille === "annuler") { if (mentalNoteId) mentalAnnulerFait(mentalNoteId); mentalFermerNote(); }
  else if (d.r) {
    const deja = el.classList.contains("actif");
    document.querySelectorAll("#mt-ressentis .filtre").forEach((b) => b.classList.remove("actif"));
    if (!deja) el.classList.add("actif");
  }
});

// Écran rallumé pendant le minuteur : on redemande à garder l'écran allumé
document.addEventListener("visibilitychange", () => {
  const ouvert = document.getElementById("mt-minuteur");
  if (document.visibilityState === "visible" && ouvert && !ouvert.hidden && !MENTAL_MIN.fini) mentalEcranAllume(true);
});

mentalCreerOverlays();
