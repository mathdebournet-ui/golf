/* =========================================================
   ⭐ Exos donnés par le coach (v40)

   Le coach (l'admin, espace admin de serie.js) choisit des exos pour
   UN joueur. Ils sont écrits dans Firestore « consignes/<uid du joueur> » :
     { uid, exos: [ids de fiches], message, faits: { id: "AAAA-MM-JJ" }, majLe }
   - le coach écrit exos + message ;
   - le joueur ne peut modifier QUE « faits » (règles Firestore) : le coach
     voit ainsi quand chaque exo a été fait.

   Côté joueur : bloc « ⭐ Demandé par le coach » en haut d'Aujourd'hui
   (blocCoach, appelé par afficherProgramme dans app.js). Un exo reste
   affiché jusqu'à ce qu'il soit fait ; fait aujourd'hui, il descend dans
   « Terminés » ; les jours suivants, il disparaît (sauf si le coach le
   redonne). Copie locale (hors-ligne) : préfixe golf-coach-v1: (clé consignes).

   Fonctions préfixées « coach » (scripts classiques = noms globaux).
   ========================================================= */

const PREFIXE_COACH = "golf-coach-v1:";
const COLLECTION_CONSIGNES = "consignes";
const CONSIGNES_MAX = 10;              // exos donnés en même temps au maximum
const MESSAGE_COACH_MAX = 300;         // caractères

const idFicheValide = (id) => typeof id === "string" && /^[a-z0-9-]{1,60}$/.test(id);
const jourValide = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

// Données reçues (en ligne = non fiables) -> { exos, message, faits }
function normaliserConsignes(brut) {
  const d = brut && typeof brut === "object" ? brut : {};
  const exos = [...new Set((Array.isArray(d.exos) ? d.exos : []).filter(idFicheValide))].slice(0, CONSIGNES_MAX);
  const faits = {};
  if (d.faits && typeof d.faits === "object") {
    for (const [id, jour] of Object.entries(d.faits)) if (idFicheValide(id) && jourValide(jour)) faits[id] = jour;
  }
  return { exos, message: typeof d.message === "string" ? d.message.slice(0, MESSAGE_COACH_MAX) : "", faits };
}

function lireConsignes() { return normaliserConsignes(lireStockage("consignes", null, PREFIXE_COACH)); }
function ecrireConsignes(c) { return ecrireStockage("consignes", c, PREFIXE_COACH); }

// Fiches demandées par le coach, avec leur état
function coachExosAffiches(jour) {
  const c = lireConsignes();
  return c.exos
    .map((id) => ({ fiche: fichesValides.find((f) => f.id === id), faitLe: c.faits[id] || null }))
    .filter((e) => e.fiche && (!e.faitLe || e.faitLe === jour));   // fait un autre jour : il disparaît
}

// Vrai si cet exo est demandé par le coach (scores.js : un score noté le coche « Fait »)
function coachDemande(idFiche) { return lireConsignes().exos.includes(idFiche); }


/* ---------- Bloc dans « Aujourd'hui » (appelé par afficherProgramme) ---------- */

// Renvoie { html, cartesFaites } ; les exos déjà dans le programme du jour
// ne sont pas affichés deux fois.
function blocCoach(jour, idsDuProgramme) {
  const c = lireConsignes();
  const exos = coachExosAffiches(jour).filter((e) => !idsDuProgramme.includes(e.fiche.id));
  const journee = lireJournee(jour);
  const cartesFaites = [];
  let cartes = "";
  exos.forEach((e, i) => {
    const fait = e.faitLe === jour || journee.faits.includes(e.fiche.id);
    const carte = carteFiche(e.fiche, { numero: `${i + 1}/${exos.length}`, fait, avecActions: true, sansAutre: true });
    if (fait) cartesFaites.push(carte); else cartes += carte;
  });
  if (!cartes && !(c.message && exos.length)) return { html: "", cartesFaites };
  return {
    cartesFaites,
    html: `<section class="bloc bloc-coach">
      <h2 class="bloc-titre">⭐ Demandé par le coach</h2>
      ${c.message ? `<p class="message-coach">💬 ${echapper(c.message)}</p>` : ""}
      <p class="bloc-info">${cartes ? "À faire de préférence aujourd'hui" : "Tout est fait, bravo ! 🎉"}</p>
      ${cartes}
    </section>`,
  };
}


/* ---------- Synchronisation avec Firestore ---------- */

// Appelé par basculerFait (app.js) : note la date où l'exo du coach a été fait
function coachNoterFait(idFiche, fait, jour) {
  const c = lireConsignes();
  if (!c.exos.includes(idFiche)) return;
  if (fait) c.faits[idFiche] = jour;
  else if (c.faits[idFiche] === jour) delete c.faits[idFiche];
  ecrireConsignes(c);
  envoyerFaitsCoach();
}

async function envoyerFaitsCoach() {
  if (!partageConfigure() || !(await demarrerPartage())) return;   // partage.js
  try {
    await baseDeDonnees.collection(COLLECTION_CONSIGNES).doc(idAppareil).update({ faits: lireConsignes().faits });
  } catch (e) {
    // Hors-ligne ou consigne supprimée par le coach : on réessaiera au prochain lancement
  }
}

// Lit les consignes du coach (au démarrage et quand on revient sur l'appli)
async function chargerConsignes() {
  if (!partageConfigure() || !navigator.onLine || !(await demarrerPartage())) return;
  let recu;
  try {
    const doc = await baseDeDonnees.collection(COLLECTION_CONSIGNES).doc(idAppareil).get();
    recu = normaliserConsignes(doc.exists ? doc.data() : null);
  } catch (e) {
    return;   // pas de réseau ou règles pas encore publiées : on garde la copie locale
  }
  // Ce qui a été fait sur ce téléphone hors-ligne est gardé
  const local = lireConsignes();
  const faits = { ...recu.faits };
  let aEnvoyer = false;
  for (const id of recu.exos) {
    if (local.faits[id] && (!faits[id] || local.faits[id] > faits[id])) { faits[id] = local.faits[id]; aEnvoyer = true; }
  }
  const avant = JSON.stringify(local);
  const apres = { exos: recu.exos, message: recu.message, faits };
  ecrireConsignes(apres);
  if (aEnvoyer) envoyerFaitsCoach();
  // Nouvelles consignes : on redessine « Aujourd'hui » (si le programme est déjà là)
  if (avant !== JSON.stringify(apres) && programmeCourant.length) afficherProgramme(dateEnTexte(new Date()));
}

document.addEventListener("DOMContentLoaded", () => {
  chargerConsignes();
  window.addEventListener("online", chargerConsignes);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") chargerConsignes(); });
});
