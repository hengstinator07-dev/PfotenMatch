const CACHE_NAME = "pfotenmatch-v15";
const ASSETS = [
    "/",
    "/index.html",
    "/styles.css",
    "/app.js",
    "/data.js",
    "/supabase.js",
    "/manifest.json"
];

// Install — cache core assets
self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — network-first for HTML/JS/CSS, cache-first for external assets
self.addEventListener("fetch", (e) => {
    const url = new URL(e.request.url);

    // Skip non-GET and cross-origin API calls
    if (e.request.method !== "GET") return;

    // Network-first for own assets (always get latest)
    if (url.origin === location.origin) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // Cache-first for external resources (fonts, Leaflet CDN)
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return res;
            });
        })
    );
});
