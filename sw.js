/* Zelum service worker — caches the app shell so it works fully offline. Bump CACHE when files change
   (updates also arrive without a bump: see refreshShell). */
const CACHE = 'ledger-v1.13.1';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/data.js', './js/gym.js', './js/store.js', './js/engine.js', './js/coach.js', './js/ui.js', './js/sfx.js', './js/firebase-config.js', './js/cloud.js', './js/habits.js', './js/ranks.js', './js/spotify-config.js', './js/music.js', './js/notify.js', './js/native.js', './js/billing-config.js', './js/plans.js', './js/whatsnew.js', './js/figures.js', './js/gymui.js', './js/app.js', './auth.html',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/badge-96.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
/* Version inside app.js, e.g. "1.13.1" */
const versionOf = text => (String(text).match(/const VERSION = '([^']+)'/) || [])[1] || '';
const olderThan = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); return false; };
/* Tell the open app that a new version is ready; it restarts into it at a calm moment (Updater in app.js) */
function announce(version) {
  return self.clients.matchAll({ type: 'window' }).then(list => list.forEach(c => c.postMessage({ type: 'update-ready', version })));
}
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => {
    const old = keys.filter(k => k !== CACHE);
    return Promise.all(old.map(k => caches.delete(k))).then(() => self.clients.claim()).then(() => {
      if (!old.length) return;
      const v = CACHE.replace('ledger-v', '');
      // Pages from before 1.13.1 can't hear the announcement, so reload them once, right away
      const legacy = old.some(k => /^ledger-v[\d.]+$/.test(k) && olderThan(k.replace('ledger-v', ''), '1.13.1'));
      // Never wait for these reloads here: the reload's own request waits for activation to finish (deadlock)
      if (legacy) self.clients.matchAll({ type: 'window' }).then(list => list.forEach(c => c.navigate(c.url).catch(() => { })));
      else announce(v);
    });
  }));
});
/* The app asks for a check when it comes back to the foreground (Android keeps it in memory for days) */
self.addEventListener('message', e => { if (e.data && e.data.type === 'check') e.waitUntil(refreshShell(true)); });
/* Cache first: Zelum opens instantly from the device, never waiting on a slow or patchy connection
   (the old network-first strategy made every launch wait for ~20 round trips before the first frame).
   A few seconds after each launch the whole shell is re-downloaded in the background and swapped in
   as one consistent set. If that set is a new version, the open app is told and restarts into it
   at a calm moment, so people see an update within seconds instead of "the next time" (which on Android,
   where the app stays in memory, could mean days). */
let refreshing = null, lastRefresh = 0;
function refreshShell(soon) {
  if (refreshing || Date.now() - lastRefresh < 60000) return refreshing || Promise.resolve();
  lastRefresh = Date.now();
  let fresh = '';
  refreshing = new Promise(r => setTimeout(r, soon ? 300 : 2500))
    .then(() => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'no-cache' })).then(res => { if (!res.ok) throw new Error(f); return [f, res]; }))))
    .then(list => {
      const app = list.find(([f]) => f === './js/app.js');
      return app[1].clone().text().then(t => { fresh = versionOf(t); return list; });
    })
    .then(list => caches.open(CACHE).then(c => c.match('./js/app.js').then(r => r ? r.text() : '').then(oldText => {
      const was = versionOf(oldText);
      return Promise.all(list.map(([f, res]) => c.put(f, res)))   // all or nothing: never a mix of versions
        .then(() => { if (fresh && was && fresh !== was) return announce(fresh); });
    })))
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

/* Tapping a notification opens (or focuses) Zelum on the right screen */
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
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Zelum', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Zelum', { body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: d.tag || 'ledger', data: { url: d.url || './index.html#today' } }));
});
