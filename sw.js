// Service Worker: alles vorab cachen, offline-fähig, Update über neue VERSION.
// GEN:START
const VERSION = "ed8212e121";
const FILES = [
  "./",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "src/app.js",
  "src/content.js",
  "src/engine/circuit.js",
  "src/engine/progress.js",
  "src/engine/review.js",
  "src/engine/teile.js",
  "src/module-liste.json",
  "src/schaltungen-liste.json",
  "src/state.js",
  "src/ui/dashboard.js",
  "src/ui/dom.js",
  "src/ui/fortschritt.js",
  "src/ui/lektion-status.js",
  "src/ui/lektion.js",
  "src/ui/lernen.js",
  "src/ui/meister.js",
  "src/ui/praxis.js",
  "src/ui/quiz.js",
  "src/ui/symbole.js",
  "src/ui/trainer-logik.js",
  "src/ui/trainer.js",
  "content/circuits/ausschaltung.json",
  "content/circuits/fehler-kurzschluss.json",
  "content/circuits/fehler-l-direkt.json",
  "content/circuits/fehler-n-fehlt.json",
  "content/circuits/fehler-pe-vergessen.json",
  "content/circuits/fehler-schalter-im-n.json",
  "content/circuits/fehler-wechsel-vertauscht.json",
  "content/circuits/kreuz.json",
  "content/circuits/serie.json",
  "content/circuits/steckdose_geschaltet.json",
  "content/circuits/stromstoss.json",
  "content/circuits/wechsel.json",
  "content/modul-0.json",
  "content/modul-1.json",
  "content/modul-2.json",
  "content/modul-3.json",
  "content/modul-4.json",
  "content/modul-5.json",
  "content/modul-6.json",
  "content/modul-7.json"
];
// GEN:END
const CACHE = `elektrocampus-${VERSION}`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("elektrocampus-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match("./")))
  );
});
