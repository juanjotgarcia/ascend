/* Ledger service worker — caches the app shell so it works fully offline. Bump CACHE when files change
   (updates also arrive without a bump: see refreshShell). */
const CACHE = 'ledger-v1.9.3';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/data.js', './js/gym.js', './js/store.js', './js/engine.js', './js/coach.js', './js/ui.js', './js/sfx.js', './js/firebase-config.js', './js/cloud.js', './js/habits.js', './js/ranks.js', './js/spotify-config.js', './js/music.js', './js/notify.js', './js/native.js', './js/figures.js', './js/gymui.js', './js/app.js', './auth.html',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/badge-96.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Cache first: Ledger opens instantly from the device, never waiting on a slow or patchy connection
   (the old network-first strategy made every launch wait for ~20 round trips before the first frame).
   A few seconds after each launch the whole shell is re-downloaded in the background and swapped in
   as one consistent set, so a new version is used the next time Ledger opens. */
let refreshing = null, lastRefresh = 0;
function refreshShell() {
  if (refreshing || Date.now() - lastRefresh < 60000) return refreshing || Promise.resolve();
  lastRefresh = Date.now();
  refreshing = new Promise(r => setTimeout(r, 2500))
    .then(() => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'no-cache' })).then(res => { if (!res.ok) throw new Error(f); return [f, res]; }))))
    .then(list => caches.open(CACHE).then(c => Promise.all(list.map(([f, res]) => c.put(f, res)))))   // all or nothing: never a mix of versions
    .catch(() => { })
    .finally(() => { refreshing = null; });
  return refreshing;
}
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Firebase SDK files are versioned and never change: cache-first so sign-in also starts offline
  if (e.request.method === 'GET' && url.host === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; })));
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') e.waitUntil(refreshShell());
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});

/* Tapping a notification opens (or focuses) Ledger on the right screen */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './index.html#today', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
/* Ready for server-sent reminders (Web Push) */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Ledger', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Ledger', { body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: d.tag || 'ledger', data: { url: d.url || './index.html#today' } }));
});
