/* Minimal offline cache so the games work on a tablet without internet. */
const CACHE = "play-learn-v15";
const ASSETS = [
  "./index.html", "./styles.css", "./manifest.json",
  "./js/shell.js", "./js/wordsnake.js", "./js/fishing.js", "./js/spelling.js", "./js/main.js",
  "./icons/icon.svg", "./assets/catch.mp4", "./assets/wrong.mp4",
  "./assets/icon-snake.jpg", "./assets/icon-fishing.jpg"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
