/* =========================================================
   Remise à zéro de l'historique sur TOUS les appareils
   ---------------------------------------------------------
   Chargé en PREMIER (avant partage.js) : à l'ouverture, si cet
   appareil n'a pas encore fait la remise à zéro n° REMISE_A_ZERO,
   on efface ses parties, sa série 🔥 et ses scores de putting,
   avant que quoi que ce soit ne parte en ligne.
   On garde : le nom du joueur, les parcours mémorisés (noms, pars)
   et le programme du jour.
   Pour une nouvelle remise à zéro : augmenter REMISE_A_ZERO de 1
   (puis « 🧹 Tout remettre à zéro » dans l'Espace admin pour les
   données en ligne).
   ========================================================= */

"use strict";

const REMISE_A_ZERO = 1;   // 1 = remise à zéro du 21/10/2026 (fin des tests)

(function remettreAZero() {
  try {
    const dejaFaite = Number(localStorage.getItem("golf-remise-a-zero") || 0);
    if (dejaFaite >= REMISE_A_ZERO) return;
    const aEffacer = [];
    for (let i = 0; i < localStorage.length; i++) {
      const cle = localStorage.key(i);
      if (!cle) continue;
      if (cle.startsWith("golf-serie-v1:") || cle.startsWith("golf-scores-v1:")) aEffacer.push(cle);
      if (["parties", "partieEnCours", "aSupprimer", "supprimees"].some((c) => cle === "golf-parcours-v1:" + c)) aEffacer.push(cle);
    }
    aEffacer.forEach((cle) => localStorage.removeItem(cle));
    localStorage.setItem("golf-remise-a-zero", String(REMISE_A_ZERO));
  } catch (e) {
    // Mémoire indisponible : rien à effacer
  }
})();
