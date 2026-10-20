/* =========================================================
   Chrono intégré pour les exos chronométrés
   ---------------------------------------------------------
   - Les durées sont trouvées dans le texte de la fiche
     (« 30 secondes », « 40 s », « 2 minutes »…) : de 10 s à 10 min.
     En dessous (ex. « tiens 2 secondes »), c'est un tempo, pas un chrono.
   - Un appui sur « ⏱ 30 s » lance le compte à rebours dans une
     barre en bas de l'écran ; à la fin : bip + vibration.
   ========================================================= */

"use strict";

const CHRONO_MIN_S = 10;
const CHRONO_MAX_S = 600;
const CHRONO_BOUTONS_MAX = 3;

let chronoFin = 0;          // heure de fin (ms), 0 = pas de chrono en cours
let chronoTotal = 0;        // durée lancée (s)
let chronoMinuterie = null;
let contexteSon = null;

// Durées (en secondes) trouvées dans la fiche, sans doublon, dans l'ordre
function dureesDeLaFiche(fiche) {
  const texte = [fiche.titre, ...(fiche.miseEnPlace || []), ...(fiche.deroule || [])].join(" ");
  const motif = /(\d+)\s*(secondes?|sec\b|s\b|minutes?|min\b)/gi;
  const durees = [];
  let m;
  while ((m = motif.exec(texte)) !== null) {
    const secondes = Number(m[1]) * (m[2].toLowerCase().startsWith("m") ? 60 : 1);
    if (secondes >= CHRONO_MIN_S && secondes <= CHRONO_MAX_S && !durees.includes(secondes)) durees.push(secondes);
  }
  return durees.slice(0, CHRONO_BOUTONS_MAX);
}

// 90 -> « 1 min 30 » ; 30 -> « 30 s »
function texteDuree(secondes) {
  if (secondes < 60) return `${secondes} s`;
  const reste = secondes % 60;
  return `${Math.floor(secondes / 60)} min${reste ? " " + String(reste).padStart(2, "0") : ""}`;
}

// Boutons à mettre sur la carte (vide si la fiche n'a pas de durée)
function boutonsChrono(fiche) {
  return dureesDeLaFiche(fiche)
    .map((s) => `<button type="button" class="bouton chrono" data-action="chrono" data-secondes="${s}">⏱ ${texteDuree(s)}</button>`)
    .join("");
}

// Bip court (le son doit être « débloqué » par un appui de l'utilisateur : on le prépare au lancement)
function preparerSon() {
  try {
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (!contexteSon && Contexte) contexteSon = new Contexte();
    if (contexteSon && contexteSon.state === "suspended") contexteSon.resume();
  } catch (e) { contexteSon = null; }
}

function bip() {
  try {
    if (!contexteSon) return;
    [0, 0.35, 0.7].forEach((decalage) => {   // 3 bips
      const oscillateur = contexteSon.createOscillator();
      const volume = contexteSon.createGain();
      oscillateur.frequency.value = 880;
      volume.gain.value = 0.3;
      oscillateur.connect(volume).connect(contexteSon.destination);
      oscillateur.start(contexteSon.currentTime + decalage);
      oscillateur.stop(contexteSon.currentTime + decalage + 0.2);
    });
  } catch (e) { /* pas de son possible : la barre s'affiche quand même */ }
  try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) { /* rien */ }
}

function afficherBarreChrono(texte, termine = false) {
  const barre = document.getElementById("barre-chrono");
  barre.hidden = false;
  barre.classList.toggle("termine", termine);
  barre.querySelector(".chrono-temps").textContent = texte;
  barre.querySelector("button").textContent = termine ? "OK" : "Arrêter";
}

function arreterChrono() {
  clearInterval(chronoMinuterie);
  chronoMinuterie = null;
  chronoFin = 0;
  document.getElementById("barre-chrono").hidden = true;
}

function tic() {
  const reste = Math.max(0, Math.ceil((chronoFin - Date.now()) / 1000));
  if (reste > 0) {
    afficherBarreChrono(`⏱ ${Math.floor(reste / 60)}:${String(reste % 60).padStart(2, "0")} / ${texteDuree(chronoTotal)}`);
    return;
  }
  clearInterval(chronoMinuterie);
  chronoMinuterie = null;
  chronoFin = 0;
  afficherBarreChrono(`✅ ${texteDuree(chronoTotal)} : terminé !`, true);
  bip();
}

function lancerChrono(secondes) {
  preparerSon();
  clearInterval(chronoMinuterie);
  chronoTotal = secondes;
  // On calcule avec l'heure de fin : le chrono reste juste même si le téléphone ralentit la page
  chronoFin = Date.now() + secondes * 1000;
  tic();
  chronoMinuterie = setInterval(tic, 250);
}

document.addEventListener("DOMContentLoaded", () => {
  // Un seul écouteur pour tous les boutons « ⏱ » de la page (Aujourd'hui, Prépa, Bibliothèque)
  document.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest('button[data-action="chrono"]');
    if (bouton) lancerChrono(Number(bouton.dataset.secondes));
  });
  document.querySelector("#barre-chrono button").addEventListener("click", arreterChrono);
  // Retour dans l'appli : on met l'affichage à l'heure tout de suite
  document.addEventListener("visibilitychange", () => { if (chronoFin) tic(); });
});
