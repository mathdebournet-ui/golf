/* =========================================================
   Actualités du golf : bandeau en haut de l'onglet « Aujourd'hui ».

   Pour ajouter une actualité : copier une ligne de la liste
   ACTUALITES ci-dessous et changer les valeurs.
     - debut / fin : dates au format "AAAA-MM-JJ" (incluses).
       L'actu n'est affichée qu'entre ces deux dates, puis
       disparaît toute seule.
     - icone : un emoji.
     - texte : le message.
   ========================================================= */

const ACTUALITES = [
  { debut: "2026-11-15", fin: "2026-11-15", icone: "🚫", texte: "Chariots interdits aujourd'hui, dimanche 15 novembre." },
];

// Date du jour au format "AAAA-MM-JJ" (heure locale du téléphone)
function dateActualite() {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mois + "-" + jour;
}

// Affiche les actualités du jour dans #actualites (rien s'il n'y en a pas)
function afficherActualites() {
  const zone = document.getElementById("actualites");
  if (!zone) return;
  const aujourdhui = dateActualite();
  const actives = ACTUALITES.filter((a) => a.debut <= aujourdhui && aujourdhui <= a.fin);
  zone.textContent = "";
  for (const actu of actives) {
    const bloc = document.createElement("p");
    bloc.className = "actualite";
    bloc.textContent = actu.icone + " " + actu.texte;   // textContent = pas de HTML injecté
    zone.appendChild(bloc);
  }
  zone.hidden = actives.length === 0;
}

afficherActualites();
