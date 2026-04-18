// Service Worker for offline billing support
const CACHE_NAME = 'restro-billing-v1';
const OFFLINE_URLS = [
  '/captain',
  '/api/health',
];

// Install — cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    // For POST/PUT — queue if offline (IndexedDB)
    if (!navigator.onLine) {
      event.respondWith(
        saveOfflineRequest(request.clone()).then(() =>
          new Response(JSON.stringify({ success: true, offline: true, message: 'Saved offline, will sync when online' }), {
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
    }
    return;
  }

  // API calls — network first, cache fallback
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Pages — network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Listen for sync event to push queued requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(syncOfflineRequests());
  }
});

// IndexedDB helpers for offline queue
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('restro-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOfflineRequest(request) {
  try {
    const db = await openDB();
    const body = await request.text();
    const tx = db.transaction('requests', 'readwrite');
    tx.objectStore('requests').add({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    });
    return new Promise((resolve) => { tx.oncomplete = resolve; });
  } catch (e) {
    console.warn('Failed to save offline request:', e);
  }
}

async function syncOfflineRequests() {
  try {
    const db = await openDB();
    const tx = db.transaction('requests', 'readonly');
    const store = tx.objectStore('requests');
    const allReqs = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });

    for (const item of allReqs) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.method !== 'GET' ? item.body : undefined,
        });
        // Remove from queue after success
        const delTx = db.transaction('requests', 'readwrite');
        delTx.objectStore('requests').delete(item.id);
      } catch (e) {
        // Will retry next sync
        console.warn('Sync failed for:', item.url);
      }
    }
  } catch (e) {
    console.warn('Sync error:', e);
  }
}

// Listen for message to trigger manual sync
self.addEventListener('message', (event) => {
  if (event.data === 'SYNC_NOW') {
    syncOfflineRequests();
  }
});
