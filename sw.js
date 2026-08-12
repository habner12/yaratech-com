const CACHE_NAME = 'trans-caranavi-v7';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css?v=booking-steps-3',
    './script.js',
    './manifest.json',
    './ipsum.jpeg',
    './minibus.jpeg',
    './flota.jpeg',
    './qr.jpeg',
    './caranavi.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './Parque de Aventuras San Benito en Coroico.mp4',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap',
    'https://unpkg.com/@phosphor-icons/web'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cache if found
                if (response) {
                    return response;
                }
                
                // Else fetch from network
                let fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    let responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            if (event.request.url.startsWith(self.location.origin)) {
                                cache.put(event.request, responseToCache);
                            }
                        });
                        
                    return response;
                });
            })
    );
});
