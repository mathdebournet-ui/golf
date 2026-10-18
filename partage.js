/* =========================================================
   Partage des parties entre joueurs (Firebase / Firestore)
   ---------------------------------------------------------
   - Chaque téléphone reçoit un identifiant anonyme (pas de mot
     de passe, pas de compte à créer pour les joueurs).
   - Quand une partie est terminée, elle est envoyée en ligne ;
     sans réseau, elle part plus tard (au prochain lancement ou
     dès que le réseau revient).
   - Tout le monde peut LIRE toutes les parties ; chacun ne peut
     modifier ou supprimer QUE les siennes (règles dans
     outils/regles-firestore.txt, à coller dans la console Firebase).
   Si CONFIG_FIREBASE vaut null, le partage est désactivé
   et l'appli marche comme avant (tout reste sur le téléphone).
   Ce fichier utilise des fonctions de parcours.js : lireParcours,
   ecrireParcours, partiesTerminees.
   ========================================================= */

"use strict";

// ---------- Réglages ----------
// À remplir avec la configuration donnée par la console Firebase
// (Paramètres du projet > Vos applications > Configuration du SDK).
// Ces valeurs ne sont pas secrètes : ce sont les règles qui protègent la base.
const CONFIG_FIREBASE = {
  apiKey: "AIzaSyDntnXPq7KvIZNV9k-Yr4xjwwtQlze-yDg",
  authDomain: "golf-seance.firebaseapp.com",
  projectId: "golf-seance",
  storageBucket: "golf-seance.firebasestorage.app",
  messagingSenderId: "440164177910",
  appId: "1:440164177910:web:4d0b9b0e0af233f55219d7",
};

const VERSION_FIREBASE = "10.12.2";
const COLLECTION_PARTIES = "parties";
const PARTIES_COMMUNAUTE_MAX = 100;   // nombre de parties récentes affichées

// Codes d'état -> phrases claires
const MESSAGES_PARTAGE = {
  "non-configure": "Le partage entre joueurs n'est pas encore activé (bientôt).",
  "hors-ligne": "Pas de réseau : impossible de voir les parties des autres joueurs pour l'instant.",
  erreur: "Le partage en ligne ne répond pas. Réessaie dans un moment.",
  refuse: "La base en ligne a refusé l'envoi (nom ou note trop long ?). Préviens Mathias.",
  connexion: "Ce téléphone n'arrive pas à se connecter au partage (navigation privée ?). Ouvre l'appli dans un navigateur normal.",
};

// Code d'erreur Firebase -> code de message ci-dessus
function codeErreurPartage(e) {
  if (!navigator.onLine) return "hors-ligne";
  const code = (e && e.code) || "";
  if (code === "permission-denied") return "refuse";
  if (code.startsWith("auth/")) return "connexion";
  return "erreur";
}

// État (non mémorisé)
let etatPartage = CONFIG_FIREBASE ? "attente" : "non-configure";   // attente, pret, hors-ligne, erreur
let baseDeDonnees = null;
let idAppareil = null;          // identifiant anonyme de ce téléphone
let promesseDemarrage = null;
let synchroEnCours = false;


function partageConfigure() { return CONFIG_FIREBASE !== null; }

function chargerScript(adresse) {
  return new Promise((ok, echec) => {
    const script = document.createElement("script");
    script.src = adresse;
    script.onload = ok;
    script.onerror = echec;
    document.head.appendChild(script);
  });
}

// Charge Firebase (seulement si besoin) et connecte ce téléphone anonymement.
// Renvoie true si le partage est prêt.
function demarrerPartage() {
  if (!partageConfigure()) return Promise.resolve(false);
  if (etatPartage === "pret") return Promise.resolve(true);
  if (promesseDemarrage) return promesseDemarrage;

  promesseDemarrage = (async () => {
    try {
      if (!window.firebase || !firebase.auth || !firebase.firestore) {
        const base = `https://www.gstatic.com/firebasejs/${VERSION_FIREBASE}/`;
        await chargerScript(base + "firebase-app-compat.js");
        await chargerScript(base + "firebase-auth-compat.js");
        await chargerScript(base + "firebase-firestore-compat.js");
      }
      if (firebase.apps.length === 0) firebase.initializeApp(CONFIG_FIREBASE);
      // Si ce téléphone est déjà connu, Firebase redonne le même identifiant
      const resultat = await firebase.auth().signInAnonymously();
      idAppareil = resultat.user.uid;
      baseDeDonnees = firebase.firestore();
      etatPartage = "pret";
      return true;
    } catch (e) {
      etatPartage = codeErreurPartage(e);
      return false;
    } finally {
      promesseDemarrage = null;   // on pourra réessayer plus tard
    }
  })();
  return promesseDemarrage;
}

function documentPartie(id) {
  return baseDeDonnees.collection(COLLECTION_PARTIES).doc(`${idAppareil}_${id}`);
}

// Ce qu'on envoie : la partie, sans le drapeau local « partagee »
function donneesAEnvoyer(partie) {
  const { partagee, ...donnees } = partie;
  return donnees;
}

// Envoie les parties pas encore partagées et applique les suppressions en attente
async function synchroniserPartage() {
  if (synchroEnCours) return;
  if (!(await demarrerPartage())) {
    rafraichirHistorique();
    return;
  }
  synchroEnCours = true;
  etatPartage = "pret";
  try {
    // 1. Suppressions demandées (y compris hors-ligne)
    for (const id of lireParcours("aSupprimer", [])) {
      await documentPartie(id).delete();
      ecrireParcours("aSupprimer", lireParcours("aSupprimer", []).filter((x) => x !== id));
    }
    // 2. Parties terminées ou modifiées, pas encore envoyées
    // (une partie refusée ne bloque pas l'envoi des suivantes)
    let erreurEnvoi = null;
    for (const partie of partiesTerminees().filter((p) => !p.partagee)) {
      const envoyee = donneesAEnvoyer(partie);
      try {
        await documentPartie(partie.id).set({
          ...envoyee,
          uid: idAppareil,
          envoyeLe: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        erreurEnvoi = e;
        continue;
      }
      // On marque « partagée » seulement si elle n'a pas changé pendant l'envoi
      const parties = partiesTerminees();
      const actuelle = parties.find((p) => p.id === partie.id);
      if (actuelle && JSON.stringify(donneesAEnvoyer(actuelle)) === JSON.stringify(envoyee)) {
        actuelle.partagee = true;
        ecrireParcours("parties", parties);
      }
    }
    if (erreurEnvoi) throw erreurEnvoi;   // pour afficher la raison dans l'Historique
  } catch (e) {
    etatPartage = codeErreurPartage(e);
  } finally {
    synchroEnCours = false;
  }
  rafraichirHistorique();
}

// Met à jour les pastilles « partagée / en attente » si l'historique est affiché
function rafraichirHistorique() {
  if (!document.getElementById("vue-historique").hidden) afficherHistorique();
}

// Une partie supprimée sur le téléphone doit aussi disparaître en ligne
function supprimerEnLigne(partie) {
  if (!partageConfigure() || !partie.partagee) return;
  const file = lireParcours("aSupprimer", []);
  if (!file.includes(partie.id)) file.push(partie.id);
  ecrireParcours("aSupprimer", file);
  synchroniserPartage();
}

// Parties récentes de tous les joueurs (null si impossible)
async function chargerCommunaute() {
  if (!(await demarrerPartage())) return null;
  try {
    const instantane = await baseDeDonnees.collection(COLLECTION_PARTIES)
      .orderBy("envoyeLe", "desc").limit(PARTIES_COMMUNAUTE_MAX).get();
    return instantane.docs.map((doc) => ({ ...doc.data(), cle: doc.id }));
  } catch (e) {
    etatPartage = codeErreurPartage(e);
    return null;
  }
}

// Envoi automatique de ce qui attend (aucun bouton à toucher) :
//  - au lancement de l'appli,
//  - dès que le réseau revient,
//  - quand on revient dans l'appli (téléphone rallumé),
//  - et toutes les 30 secondes tant qu'une partie attend.
const INTERVALLE_REESSAI_MS = 30000;

function partiesEnAttente() {
  return partiesTerminees().some((p) => !p.partagee) || lireParcours("aSupprimer", []).length > 0;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!partageConfigure()) return;
  synchroniserPartage();
  window.addEventListener("online", synchroniserPartage);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && partiesEnAttente()) synchroniserPartage();
  });
  setInterval(() => {
    if (document.visibilityState === "visible" && partiesEnAttente()) synchroniserPartage();
  }, INTERVALLE_REESSAI_MS);
});
