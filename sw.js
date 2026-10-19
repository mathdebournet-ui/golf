/* =========================================================
   Service worker : permet d'ouvrir la page sans réseau
   (practice, salle de sport…).
   Stratégie « réseau d'abord » : si internet marche, on prend
   la version en ligne (et on la garde en copie) ; sinon on
   affiche la dernière copie enregistrée.
   ========================================================= */

const NOM_CACHE = "golf-seance-v13";   // changer le numéro force un cache neuf
const FICHIERS_ESSENTIELS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "parcours.js",
  "prepa.js",
  "partage.js",
  "serie.js",
  "fiches.json",
  "fiches-data.js",
  "manifest.json",
  "icones/icone-192.png",
];

// Installation : on met de côté les fichiers essentiels
self.addEventListener("install", (evenement) => {
  evenement.waitUntil(caches.open(NOM_CACHE).then((cache) => cache.addAll(FICHIERS_ESSENTIELS)));
  self.skipWaiting();
});

// Activation : on supprime les anciens caches
self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches.keys().then((noms) => Promise.all(noms.filter((n) => n !== NOM_CACHE).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

// Chaque requête : réseau d'abord, copie de secours ensuite
self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== location.origin) return;

  evenement.respondWith(
    // « no-cache » : on redemande toujours au site s'il y a du nouveau
    // (sinon le navigateur peut garder une ancienne version ~10 minutes)
    fetch(requete.url, { cache: "no-cache" })
      .then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(NOM_CACHE).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      })
      .catch(() => caches.match(requete, { ignoreSearch: true }))
  );
});
