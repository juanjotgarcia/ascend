/* ZELUM — Android app bridge (Capacitor). Everything here is a no-op on the web.
   • Live workout notification (native foreground service) mirrors the in-app island.
   • Buttons on that notification (+15s, Skip, Set done) are queued natively and applied here.
   • Reminders are scheduled as exact Android notifications for the next 3 days.
   • Home-screen widgets get fresh data after every change.
   • Google sign-in and Spotify open in a secure Chrome tab and come back via ledger:// links.
   • Music colors from any player: LedgerPlugin.nowPlaying reads Android's media sessions (see music.js). */

/* Talk to a native plugin through Android's built-in bridge (no Capacitor JS library needed).
   Every method returns a Promise; addListener(event, callback) subscribes to plugin events. */
function nativePlugin(name) {
  const cap = window.Capacitor;
  if (cap && typeof cap.registerPlugin === 'function') return cap.registerPlugin(name);
  return new Proxy({}, {
    get(_, method) {
      if (method === 'then') return undefined;   // not a thenable
      if (method === 'addListener') return (event, cb) => Promise.resolve(cap.addListener(name, event, cb));
      return (options = {}) => cap.nativePromise(name, String(method), options);
    },
  });
}

const Native = {
  isApp: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
  /* The Google Play build carries the web files inside the app (tools/android-build-web.js --store adds this tag);
     the sideloaded APK loads the live site instead. Both run at the same address, so saved data is shared. */
  store: !!document.querySelector('meta[name="ledger-build"][content="store"]'),
  p: {}, wsig: '', timer: null, renderMode: null,
  /* Exact reminder times (Android 12+ "Alarms & reminders"): 'granted' | 'denied' | 'na' (older app without the check).
     Opt-in: without it reminders still arrive, Android may just hold them a few minutes to save battery. */
  exact: null,

  init() {
    if (!this.isApp) return;
    const reg = n => nativePlugin(n);
    this.p = { notif: reg('LocalNotifications'), app: reg('App'), browser: reg('Browser'), ledger: reg('Ledger') };
    document.documentElement.classList.add('native');
    this.p.app.addListener('appUrlOpen', e => this.onUrl(e.url));
    this.p.app.getLaunchUrl().then(r => { if (r && r.url) this.onUrl(r.url); }).catch(() => { });
    this.p.app.addListener('resume', () => { this.drain(); this.checkExact().then(() => this.sync(true)); });
    this.p.ledger.addListener('workoutAction', () => this.drain());
    this.p.ledger.addListener('nowPlayingChanged', () => Music.phoneEvent());   // a music app started, stopped or skipped
    this.p.notif.addListener('localNotificationActionPerformed', e => { const to = e && e.notification && e.notification.extra && e.notification.extra.to; if (to) go(to); });
    this.p.notif.createChannel({ id: 'reminders', name: 'Reminders', description: 'Habits, workouts and water', importance: 4, vibration: true, visibility: 1 }).catch(() => { });
    document.addEventListener('visibilitychange', () => this.p.ledger.visible({ on: !document.hidden }).catch(() => { }));
    this.drain();
    this.checkExact();
    this.p.ledger.rendering({}).then(r => { this.renderMode = r.mode; if ((route === 'me' || route === 'settings')) render(); }).catch(() => { });
    setTimeout(() => this.sync(true), 1500);
  },

  /* ledger://auth?id_token=… · ledger://spotify?code=…&state=… · ledger://go/habits */
  async onUrl(url) {
    if (!url || !url.startsWith('ledger:')) return;
    this.p.browser.close().catch(() => { });
    const u = new URL(url), kind = u.host || u.pathname.replace(/^\/+/, '').split('/')[0];
    try {
      if (kind === 'auth') await Cloud.signInWithTokens(u.searchParams.get('id_token'), u.searchParams.get('access_token'));
      else if (kind === 'spotify') await Music.exchange(u.searchParams.get('code'), u.searchParams.get('state'));
      else if (kind === 'go') go(u.pathname.replace(/^\/+/, '') || 'today');
    } catch (e) { toast(`Couldn't finish: ${esc(e.message || e)}`); }
  },
  openBrowser(url) { return this.p.browser.open({ url, toolbarColor: '#000000' }); },
  async ensurePermission() {
    try {
      const r = await this.p.notif.checkPermissions();
      if (r.display === 'granted') return true;
      const q = await this.p.notif.requestPermissions();
      return q.display === 'granted';
    } catch (e) { return false; }
  },
  async checkExact() {
    if (!this.isApp) return;
    const was = this.exact;
    try { const r = await this.p.notif.checkExactNotificationSetting(); this.exact = r && r.exact_alarm === 'granted' ? 'granted' : 'denied'; }
    catch (e) { this.exact = 'na'; }
    if (was !== null && was !== this.exact && (route === 'me' || route === 'settings')) render();
  },
  exactOn() { return this.exact === 'granted' || this.exact === 'na'; },
  /* Opens Android's "Alarms & reminders" switch for Zelum, then reschedules with whatever the user chose */
  async allowExact() {
    try { await this.p.notif.changeExactNotificationSetting(); } catch (e) { }
    await this.checkExact();
    this.sync(true);
    if ((route === 'me' || route === 'settings')) render();
    toast(this.exactOn() ? 'Reminders will arrive at the exact minute' : 'Exact times are off — reminders may arrive a few minutes late');
  },

  /* ---------- Live workout notification ---------- */
  workoutSync() {
    if (!this.isApp) return;
    if (!S.active) {
      if (this.wsig !== 'stop') { this.wsig = 'stop'; this.p.ledger.workout({ action: 'stop' }).catch(() => { }); }
      return;
    }
    const ns = nextSet();
    const next = ns && !ns.done ? `Set ${ns.n}/${ns.of} · ${ns.name}${ns.t ? ` · ${ns.t}${ns.u}` : ''}${ns.kg ? ` · ${ns.kgTxt}` : ''}` : 'All sets done — finish when ready';
    const done = sum(S.active.entries.map(e => doneSets(e).length));
    const data = { action: 'update', title: S.active.name, next, sub: `${done} set${done === 1 ? '' : 's'} done`, startedAt: S.active.start,
      restEndsAt: rest ? Math.round(rest.end) : 0, restSec: S.settings.restSec, accent: themeColors().accent };
    const sig = JSON.stringify(data);
    if (sig === this.wsig) return;
    this.wsig = sig;
    this.p.ledger.workout(data).catch(e => console.warn('live notification', e));
  },
  async drain() {
    if (!this.isApp) return;
    try {
      const r = await this.p.ledger.pendingActions();
      for (const a of JSON.parse(r.actions || '[]')) this.apply(a);
    } catch (e) { console.warn('drain', e); }
  },
  apply(a) {
    if (!S.active) return;
    if (a.a === 'skip') rest = null;
    else if (a.a === 'rest+15') { if (rest) { rest.end += 15000; rest.total += 15; } }
    else if (a.a === 'setDone') {
      for (const e of S.active.entries) {
        const s = e.sets.find(x => !x.done);
        if (s) { s.done = true; if (!(s.v > 0)) s.v = s.t || 1; break; }
      }
      const e = S.active.entries.find(x => x.sets.some(s => s.done)) || {}, rs = e.rest || S.settings.restSec, end = (a.t || Date.now()) + rs * 1000;
      rest = end > Date.now() ? { end, total: rs } : null;
      save();
    }
    islandSig = ''; render(); tick();
  },

  /* ---------- Reminders + widgets (debounced after every save) ---------- */
  sync(now) {
    if (!this.isApp) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.scheduleReminders(); this.updateWidgets(); }, now ? 0 : 2500);
  },
  async scheduleReminders() {
    const P = this.p.notif, n = S.settings.notif;
    try {
      const pend = await P.getPending();
      const ours = (pend.notifications || []).filter(x => x.id >= 100000 && x.id < 200000).map(x => ({ id: x.id }));
      if (ours.length) await P.cancel({ notifications: ours });
    } catch (e) { }
    if (!S.onboarded || !n || !n.enabled) return;
    if (this.exact === null) await this.checkExact();
    // Ask for exact alarms only when the user allowed them: otherwise the plugin would open the
    // "Alarms & reminders" settings screen on every reschedule.
    const exact = this.exactOn();
    const list = [], ids = new Set();
    for (let d = 0; d < 3; d++) {
      const k = addDays(today(), d), [y, m, dd] = k.split('-').map(Number);
      for (const r of remindersFor(k)) {
        const at = new Date(y, m - 1, dd, Math.floor(r.at / 60), r.at % 60);
        if (at.getTime() <= Date.now() + 30000) continue;
        let id = 100000 + (hashStr(k + r.key) % 99990);
        while (ids.has(id)) id++;
        ids.add(id);
        list.push({ id, title: r.title, body: r.body, schedule: { at, allowWhileIdle: true }, isExactNotification: exact, channelId: 'reminders', smallIcon: 'ic_stat_ledger', iconColor: '#FFFFFF', extra: { to: r.to } });
      }
    }
    list.sort((a, b) => a.schedule.at - b.schedule.at);
    if (list.length) await P.schedule({ notifications: list.slice(0, 60) }).catch(e => console.warn('schedule', e));
  },
  updateWidgets() {
    if (!S.onboarded) return;
    const k = today(), due = buildDue(k), open = due.filter(h => !habitDone(h, k)), li = levelInfo(), c = themeColors();
    const v = faithOn() ? verseOfDay() : { text: quoteOfDay(), ref: '' };   // the daily-line widget: verse only in Faith mode
    const next = S.active ? `In progress: ${S.active.name}` : workoutsOn(k).length ? 'Trained today ✓' : isTrainingDay(k) ? `Next: ${tplInfo(nextTemplate()).name}` : 'Rest day — recover well';
    this.p.ledger.widgets({
      done: due.length - open.length, due: due.length, streak: streak(), rank: `${li.title} · Lv ${li.lvl}`,
      accent: c.accent, faith: c.faith, next, verse: v.text, ref: v.ref, quote: faithOn() ? quoteOfDay() : '',
      habits: [...open, ...due.filter(h => habitDone(h, k))].slice(0, 3).map(h => ({ name: h.name, done: habitDone(h, k) })),
    }).catch(e => console.warn('widgets', e));
  },
  async testNotification() {
    if (!(await this.ensurePermission())) return toast('Allow notifications for Zelum in Android settings');
    if (this.exact === null) await this.checkExact();
    await this.p.notif.schedule({ notifications: [{ id: 199999, title: 'Zelum notifications are on', body: 'Reminders arrive even when Zelum is closed.', schedule: { at: new Date(Date.now() + 2500), allowWhileIdle: true }, isExactNotification: this.exactOn(), channelId: 'reminders', smallIcon: 'ic_stat_ledger', iconColor: '#FFFFFF' }] });
    toast('Test notification in 2 seconds');
  },
};
