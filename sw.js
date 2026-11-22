// オフライン対応：オンラインなら常に最新を取得し、取得できないときはキャッシュを使う
const CACHE = "ap-study-v1";
const FILES = [
  "./", "index.html", "css/style.css", "js/app.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png",
  "js/data/exam.js", "js/data/units-tech1.js", "js/data/units-tech2.js", "js/data/units-tech3.js",
  "js/data/units-mgmt.js", "js/data/units-strat.js", "js/data/kamoku-b.js"
];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
  );
});
