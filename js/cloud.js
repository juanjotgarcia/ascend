/* ZELUM — Google sign-in, cloud backup and phone ↔ computer sync (Firebase).
   Offline-first: the app always works from local data; when signed in, every change is
   pushed a few seconds later, and changes from your other device arrive live.
   Data lives at users/{uid} (meta) + users/{uid}/parts/p0..pN (the saved state, in chunks). */
const FB_VER = '10.14.1';
const CHUNK = 700000;   // characters per part (Firestore documents max out at 1 MiB)

const Cloud = {
  user: null, status: 'off', lastError: '', loading: null, unsub: null, pushTimer: null, pending: null,

  enabled() { return typeof FIREBASE_CONFIG !== 'undefined' && !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey); },
  meta() { try { return JSON.parse(localStorage.getItem('ledger.sync') || '{}'); } catch (e) { return {}; } },
  setMeta(m) { try { localStorage.setItem('ledger.sync', JSON.stringify({ ...this.meta(), ...m })); } catch (e) { } },
  device() {
    let d = localStorage.getItem('ledger.device');
    if (!d) { d = 'd' + Math.random().toString(36).slice(2, 10); try { localStorage.setItem('ledger.device', d); } catch (e) { } }
    return d;
  },
  ref() { return this.db.collection('users').doc(this.user.uid); },
  unsynced() { return !!this.user && (S.updatedAt || 0) > (this.meta().syncedAt || 0); },

  /* Firebase loads only when needed, so the app stays fast and offline-capable */
  load() {
    if (!this.enabled()) return Promise.resolve(false);
    if (this.loading) return this.loading;
    const js = n => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = `https://www.gstatic.com/firebasejs/${FB_VER}/firebase-${n}-compat.js`;
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    this.loading = js('app').then(() => Promise.all([js('auth'), js('firestore')])).then(() => {
      firebase.initializeApp(FIREBASE_CONFIG);
      this.auth = firebase.auth(); this.db = firebase.firestore();
      this.auth.getRedirectResult().catch(e => this.fail(e, true));
      this.auth.onAuthStateChanged(u => this.onUser(u));
      return true;
    }).catch(e => { this.loading = null; this.fail(e); return false; });
    return this.loading;
  },

  async signIn() {
    if (Native.isApp) { Native.openBrowser(location.origin + location.pathname.replace(/index\.html$/, '') + 'auth.html'); return; }
    if (!(await this.load())) { toast('Can\'t reach Google right now — check your connection'); return; }
    const p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    try { await this.auth.signInWithPopup(p); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) return this.auth.signInWithRedirect(p);
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) this.fail(e, true);
    }
  },
  /* Android app: the Chrome tab signs in with Google and hands back the tokens */
  async signInWithTokens(idToken, accessToken) {
    if (!idToken && !accessToken) throw new Error('No sign-in token received');
    if (!(await this.load())) throw new Error('Can\'t reach Google right now');
    const cred = firebase.auth.GoogleAuthProvider.credential(idToken || null, accessToken || null);
    // Coming back from the "confirm it's you" step of Delete account
    if (this.pendingDelete && this.user && Date.now() - this.pendingDelete < 10 * 60000) {
      try { await this.user.reauthenticateWithCredential(cred); }
      catch (e) { this.pendingDelete = 0; throw new Error(e.code === 'auth/user-mismatch' ? 'that was a different Google account' : (e.code || e.message)); }
      return this.wipe();
    }
    await this.auth.signInWithCredential(cred);
    toast(`${icon('check', 'xs')} Signed in with Google`);
  },
  async signOut() {
    if (this.unsynced()) await this.push();
    if (this.unsub) { this.unsub(); this.unsub = null; }
    await this.auth.signOut();
    this.setMeta({ uid: null, syncedAt: 0 });
    toast('Signed out — your progress stays on this device');
  },

  /* Delete account (Google Play requires it in-app): removes users/{uid} and every part, then the sign-in itself.
     Firebase only deletes an account signed in during the last few minutes, so older sessions confirm with Google first
     (a popup on the web; on Android the Chrome tab comes back to signInWithTokens, which finishes the job). */
  async deleteAccount() {
    if (!this.user) return;
    const fresh = Date.now() - new Date(this.user.metadata.lastSignInTime || 0).getTime() < 4 * 60000;
    if (!fresh) {
      this.pendingDelete = Date.now();
      if (Native.isApp) { toast('Confirm it\'s you with Google to finish deleting'); Native.openBrowser(location.origin + location.pathname.replace(/index\.html$/, '') + 'auth.html'); return; }
      const p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ login_hint: this.user.email || '' });
      try { await this.user.reauthenticateWithPopup(p); }
      catch (e) {
        this.pendingDelete = 0;
        if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) toast(`Couldn't confirm: ${esc(e.code === 'auth/user-mismatch' ? 'that was a different Google account' : (e.code || e.message))}`);
        return;
      }
    }
    return this.wipe();
  },
  async wipe() {
    this.pendingDelete = 0;
    const u = this.user;
    if (!u) return;
    clearTimeout(this.pushTimer);
    if (this.unsub) { this.unsub(); this.unsub = null; }
    this.setStatus('syncing');
    try {
      const parts = await this.ref().collection('parts').get();
      const b = this.db.batch();
      parts.forEach(d => b.delete(d.ref));
      b.delete(this.ref());
      await b.commit();
      await u.delete();
      this.user = null;
      this.setMeta({ uid: null, syncedAt: 0 });
      this.setStatus('off');
      render();
      toast(`${icon('check', 'xs')} Account and cloud backup deleted. Your progress stays on this device.`);
    } catch (e) { this.fail(e, true); }
  },

  async onUser(u) {
    this.user = u;
    if (this.unsub) { this.unsub(); this.unsub = null; }
    if (!u) { this.setStatus('off'); render(); return; }
    if (!S.profile.name && u.displayName) S.profile.name = u.displayName.split(' ')[0];
    Billing.identify(u.uid);
    await this.reconcile(await this.ref().get().catch(e => { this.fail(e); return null; }), true);
    this.unsub = this.ref().onSnapshot(d => {
      if (d.metadata.hasPendingWrites) return;
      const cm = d.exists ? d.data() : null;
      if (cm && cm.device !== this.device() && cm.updated > (this.meta().syncedAt || 0)) this.reconcile(d, false);
    }, e => this.fail(e));
    render();
  },

  /* Decide which copy wins: this device, the cloud, or ask */
  async reconcile(snap, first) {
    if (!snap) return;
    this.setStatus('syncing');
    try {
      const cm = snap.exists ? snap.data() : null, m = this.meta();
      if (!cm || !cm.n) {
        if (S.onboarded) await this.push();
        else { this.done(0); toast('Signed in — no saved progress yet, so let\'s set you up'); }
        return;
      }
      if (!S.onboarded) return this.apply(await this.read(cm), cm, 'Welcome back — your progress is restored');
      if (cm.updated === S.updatedAt) return this.done(cm.updated);
      const known = m.uid === this.user.uid;
      const localChanged = !known || (S.updatedAt || 0) > (m.syncedAt || 0);
      const cloudChanged = !known || cm.updated > (m.syncedAt || 0);
      if (localChanged && !cloudChanged) return this.push();
      if (cloudChanged && !localChanged) return this.apply(await this.read(cm), cm, first ? 'Progress synced from the cloud' : 'Updated from your other device');
      this.pending = { cloud: await this.read(cm), cm };
      this.setStatus('conflict');
      openSheet(conflictSheet(this.pending.cloud, cm), { cls: 'center' });
    } catch (e) { this.fail(e, first); }
  },
  async read(cm) {
    const parts = await Promise.all(Array.from({ length: cm.n }, (_, i) => this.ref().collection('parts').doc('p' + i).get()));
    return JSON.parse(parts.map(p => (p.data() || {}).d || '').join(''));
  },
  apply(state, cm, msg) {
    try { localStorage.setItem('ledger.prev', JSON.stringify(S)); } catch (e) { }   // safety copy of what we replace
    S = migrate(state); S.updatedAt = cm.updated;
    saveNow(false); this.done(cm.updated);
    applyTheme(); render(true);
    if (msg) toast(`${icon('check', 'xs')} ${msg}`);
  },
  async push() {
    if (!this.user) return;
    clearTimeout(this.pushTimer);
    this.setStatus('syncing');
    try {
      if (!S.updatedAt) S.updatedAt = Date.now();
      const stamp = S.updatedAt, json = JSON.stringify(S), n = Math.max(1, Math.ceil(json.length / CHUNK));
      const prev = await this.ref().get(), prevN = prev.exists ? (prev.data().n || 0) : 0;
      const b = this.db.batch(), parts = this.ref().collection('parts');
      for (let i = 0; i < n; i++) b.set(parts.doc('p' + i), { d: json.slice(i * CHUNK, (i + 1) * CHUNK) });
      for (let i = n; i < prevN; i++) b.delete(parts.doc('p' + i));
      b.set(this.ref(), { n, updated: stamp, device: this.device(), app: typeof VERSION !== 'undefined' ? VERSION : '', at: firebase.firestore.FieldValue.serverTimestamp() });
      await b.commit();
      this.done(stamp);
    } catch (e) { this.fail(e); }
  },
  schedulePush() {
    if (!this.user) return;
    clearTimeout(this.pushTimer);
    this.setStatus('pending');
    this.pushTimer = setTimeout(() => this.push(), 3500);
  },
  done(stamp) { this.setMeta({ uid: this.user ? this.user.uid : null, syncedAt: stamp }); this.lastSync = Date.now(); this.setStatus('synced'); },
  fail(e, loud) {
    console.warn('Cloud:', e);
    this.lastError = (e && (e.code || e.message)) || 'error';
    this.setStatus(navigator.onLine ? 'error' : 'offline');
    if (loud) toast(`Sync problem: ${esc(this.lastError)}`);
  },
  setStatus(s) {
    this.status = s;
    document.querySelectorAll('[data-cloud-status]').forEach(el => { el.innerHTML = cloudStatusText(); el.dataset.state = s; });
  },
};

function cloudStatusText() {
  const s = Cloud.status;
  if (s === 'syncing') return 'Syncing…';
  if (s === 'pending') return 'Saving to the cloud…';
  if (s === 'offline') return 'Offline — will sync when you\'re back online';
  if (s === 'error') return `Sync paused (${esc(Cloud.lastError)})`;
  if (s === 'conflict') return 'Waiting for you to choose which progress to keep';
  if (s === 'synced') return 'Backed up & synced';
  return 'Not signed in';
}
function conflictSheet(cloud, cm) {
  const sum = st => {
    const xp = Object.values(st.xpLog || {}).reduce((a, v) => a + v[0], 0);
    return `${(st.workouts || []).length} workouts · level ${levelFromXP(xp)} · ${fmtN(xp)} XP`;
  };
  const when = t => t ? new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
  return `<h3 class="sheet-title">Which progress should Zelum keep?</h3>
    <p class="small muted">This device and your Google account both have changes. The one you don't pick is kept as a safety copy on this device.</p>
    <button class="choice glass-btn mt" data-act="cloudKeep" data-v="cloud" style="width:100%"><b>${icon('upload', 'sm')} Google account</b><span class="small muted">${sum(cloud)} · saved ${when(cm.updated)}</span></button>
    <button class="choice glass-btn mt-s" data-act="cloudKeep" data-v="local" style="width:100%"><b>${icon('user', 'sm')} This device</b><span class="small muted">${sum(S)} · saved ${when(S.updatedAt)}</span></button>`;
}
/* The official-style Google button */
const GOOGLE_G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.2C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.2-8.5 2.2-6.3 0-11.6-4.1-13.5-9.7l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>';

/* Push right away when the app goes to the background or the connection returns */
document.addEventListener('visibilitychange', () => { if (document.hidden && Cloud.unsynced()) Cloud.push(); });
window.addEventListener('online', () => { if (Cloud.unsynced()) Cloud.push(); });
