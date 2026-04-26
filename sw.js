const CACHE_NAME = "pfotenmatch-v32";
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

const API_HOSTS = ["overpass-api.de", "overpass.kumi.systems", "photon.komoot.io", "nominatim.openstreetmap.org", "supabase.co"];

// Fetch — network-first for HTML/JS/CSS, skip API calls, cache-first for CDN assets
self.addEventListener("fetch", (e) => {
    const url = new URL(e.request.url);

    // Skip non-GET requests
    if (e.request.method !== "GET") return;

    // Never cache API calls — let them go to network directly
    if (API_HOSTS.some(h => url.hostname.includes(h))) return;

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
