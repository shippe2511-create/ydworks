/* YD Works service worker: app shell offline, network-first for the page */
const CACHE = "yd-customer-1.0.0";
const SHELL = ["./", "index.html", "manifest.webmanifest", "assets/barge-sm.jpg", "assets/driver-sm.jpg", "assets/hero-sm.jpg", "assets/house-sm.jpg", "assets/truck-sm.jpg", "assets/yard-sm.jpg", "catalog/agg.jpg", "catalog/blk.jpg", "catalog/cem.jpg", "catalog/crane.jpg", "catalog/exc20.jpg", "catalog/exc5.jpg", "catalog/fork.jpg", "catalog/lorry.jpg", "catalog/mixer.jpg", "catalog/ply.jpg", "catalog/pvc.jpg", "catalog/roller.jpg", "catalog/roof.jpg", "catalog/sand.jpg", "catalog/tip.jpg", "catalog/wl.jpg", "catalog/y12.jpg", "catalog/y16.jpg", "fonts/fonts.css", "fonts/geist-latin-ext.woff2", "fonts/geist-latin.woff2", "fonts/geist-mono-latin-ext.woff2", "fonts/geist-mono-latin.woff2", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "vendor/jspdf.umd.min.js", "vendor/maplibre-gl.css", "vendor/maplibre-gl.js", "vendor/supabase.js", "yd-backend.js", "yd-catalog.js", "yd-config.js", "yd-docs.js", "yd-settings.js", "yd-ui.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then(res => { caches.open(CACHE).then(c => c.put("./", res.clone())); return res; }).catch(() => caches.match("./").then(m => m || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
    if (res.ok && new URL(r.url).origin === location.origin) caches.open(CACHE).then(c => c.put(r, res.clone()));
    return res;
  })));
});
