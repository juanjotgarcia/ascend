/* ZELUM — plans: Free, Basic, Pro (monthly or annual) and Lifetime (one payment, Pro forever).

   Free trains you; paid plans add depth. Everything you need to train, log and build habits stays free:
   both disciplines, the overload engine, workout logging and history, the rest timer and live notification, XP,
   ranks and missions, nutrition, Coach Caleb, reminders, widgets, cloud backup and Faith mode.

   What each plan adds is in FEATURES below: change a feature's `need` to move it between plans.
   Purchases go through Google Play Billing (required for digital goods sold in a Play app) via RevenueCat,
   which verifies them on its servers and keeps the subscription status. The Android app checks it on every
   start and resume and stores the result in S.sub, so it also reaches the website through cloud sync.

   People who used the app before plans existed are Founders: Pro for life, free (store.js migrate). */

const PLAN_RANK = { free: 0, basic: 1, pro: 2 };
const PLAN_NAMES = { free: 'Free', basic: 'Basic', pro: 'Pro' };
const FREE_HABITS = 8;                                       // active habits on the Free plan (6 come built in)
const FREE_SKILLS = ['muscleup', 'handstand', 'lsit'];      // skill trees on the Free plan (the Main Quest's tree is always open)
const FREE_THEMES = ['midnight', 'mono'];                    // palettes on the Free plan

const FEATURES = {
  habits:   { need: 'basic', name: 'Unlimited habits',      desc: `More than ${FREE_HABITS} active habits`, icon: 'habits' },
  quit:     { need: 'basic', name: 'Quit habits',           desc: 'Break a habit with a live clean-time clock, milestones and slip tracking', icon: 'ban' },
  skills:   { need: 'basic', name: 'All 8 skill trees',     desc: 'Front lever, planche, back lever, pistol and human flag', icon: 'star' },
  foods:    { need: 'basic', name: 'Custom foods',          desc: 'Save your own foods and meals', icon: 'fuel' },
  themes:   { need: 'basic', name: 'All palettes & colors', desc: 'Every palette and a color picker for every part of the app', icon: 'palette' },
  plan:     { need: 'basic', name: 'Plan rebuilds',         desc: 'Rebuild your gym plan from your split, equipment and favorites any time', icon: 'refresh' },
  coach:    { need: 'pro',   name: 'Coach analysis',        desc: 'Stalls, weekly sets per muscle, balance, fatigue and deload timing', icon: 'chart' },
  records:  { need: 'pro',   name: 'Records & strength charts', desc: 'Best sets, estimated 1-rep max and its chart for every exercise', icon: 'trophy' },
  routines: { need: 'pro',   name: 'Custom routines',       desc: 'Build and edit your own routines: sets, rep ranges, rest, order', icon: 'edit' },
  music:    { need: 'pro',   name: 'Music colors',          desc: 'The app recolors itself with the album you are playing', icon: 'play' },
};
// What the plan cards list (in order)
const PLAN_PERKS = {
  basic: ['habits', 'quit', 'skills', 'foods', 'themes', 'plan'],
  pro: ['coach', 'records', 'routines', 'music'],
};
// Shown only until Google Play's real, local prices load (or on the website)
const PRICE_HINT = { basic_monthly: 'US$2.99', basic_annual: 'US$19.99', pro_monthly: 'US$4.99', pro_annual: 'US$34.99', lifetime: 'US$69.99' };

/* ---------- Current plan ---------- */
const Plan = {
  GRACE: 3 * 864e5,   // keep a lapsed subscription for 3 days (offline phones, Play's own grace period)
  current() {
    if (!S) return 'free';
    if (S.founder) return 'pro';
    const s = S.sub;
    if (s && PLAN_RANK[s.plan] && (s.lifetime || (s.expires && s.expires + this.GRACE > Date.now()))) return s.plan;
    return 'free';
  },
  is(p) { return PLAN_RANK[this.current()] >= PLAN_RANK[p]; },
  label() {
    const p = this.current(), s = S.sub;
    if (S.founder) return 'Founder · Pro for life';
    if (p === 'free') return 'Free';
    if (s && s.lifetime) return 'Pro · Lifetime';
    return `${PLAN_NAMES[p]} · ${s && s.period === 'annual' ? 'Annual' : 'Monthly'}`;
  },
  /* Store what RevenueCat says (CustomerInfo) in the synced state */
  fromCustomerInfo(ci, source = 'play') {
    const act = (ci && ci.entitlements && ci.entitlements.active) || {};
    const e = act[BILLING_CONFIG.entitlements.pro] || act[BILLING_CONFIG.entitlements.basic];
    const before = JSON.stringify(S.sub || null);
    if (!e) { if (S.sub && S.sub.source === source) S.sub = { ...S.sub, plan: 'free', lifetime: false, expires: 0, checked: Date.now() }; }
    else {
      const pid = e.productIdentifier || '';
      S.sub = { plan: act[BILLING_CONFIG.entitlements.pro] ? 'pro' : 'basic', lifetime: !e.expirationDate,
        expires: e.expirationDate ? Date.parse(e.expirationDate) : 0, period: !e.expirationDate ? 'lifetime' : /annual|year/i.test(pid) ? 'annual' : 'monthly',
        willRenew: !!e.willRenew, trial: e.periodType === 'TRIAL', product: pid, source, checked: Date.now() };
    }
    if (JSON.stringify(S.sub || null) !== before) { save(); render(); }
  },
};
const can = f => Plan.is((FEATURES[f] || {}).need || 'free');
/* Use before a paid action: true if allowed, otherwise opens the plans and returns false */
function requirePlan(f) { if (can(f)) return true; Paywall.open(f); return false; }
const lockTag = f => can(f) ? '' : `<span class="plan-tag ${FEATURES[f].need}">${icon('lock', 'xs')} ${PLAN_NAMES[FEATURES[f].need]}</span>`;

/* ---------- Google Play Billing (RevenueCat Capacitor plugin, called through the native bridge) ---------- */
const Billing = {
  p: null, ready: false, offering: null, busy: false, error: '',
  /* Test purchases: on a local preview, or with ?billing=test, buying just switches the plan on this device */
  test: /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&]billing=test\b/.test(location.search),
  native() { return Native.isApp && !!BILLING_CONFIG.revenuecatAndroidKey && this.hasPlugin(); },
  /* An APK built before plans existed has no Purchases plugin: it shows the plans but can't sell them */
  hasPlugin() {
    const c = window.Capacitor; if (!c) return false;
    if (typeof c.isPluginAvailable === 'function') return c.isPluginAvailable('Purchases');
    return (c.PluginHeaders || []).some(h => h.name === 'Purchases');
  },
  canBuy() { return this.test || (this.native() && this.ready); },
  async init() {
    if (!this.native()) return;
    try {
      this.p = nativePlugin('Purchases');
      const uid = (Cloud.user && Cloud.user.uid) || Cloud.meta().uid;
      await this.p.configure({ apiKey: BILLING_CONFIG.revenuecatAndroidKey, ...(uid ? { appUserID: uid } : {}) });
      this.ready = true;
      await this.refresh();
      this.loadOffering();
      Native.p.app.addListener('resume', () => this.refresh());
    } catch (e) { this.error = e.message || String(e); console.warn('billing', e); }
  },
  async refresh() {
    if (!this.ready) return;
    try { const r = await this.p.getCustomerInfo(); Plan.fromCustomerInfo(r.customerInfo || r); } catch (e) { console.warn('billing refresh', e); }
  },
  async loadOffering() {
    if (!this.ready) return null;
    try {
      const o = await this.p.getOfferings();
      this.offering = (o.all && o.all[BILLING_CONFIG.offering]) || o.current || null;
      Paywall.rerender();
    } catch (e) { this.error = e.message || String(e); }
    return this.offering;
  },
  /* Same RevenueCat customer as the Google account, so the plan follows the person to a new phone and the web */
  async identify(uid) { if (this.ready && uid) { try { const r = await this.p.logIn({ appUserID: uid }); Plan.fromCustomerInfo(r.customerInfo); } catch (e) { console.warn('billing login', e); } } },
  pkg(id) { return this.offering && (this.offering.availablePackages || []).find(p => p.identifier === id); },
  price(id) { const p = this.pkg(id); return p ? p.product.priceString : PRICE_HINT[id]; },
  trialDays(id) {
    const p = this.pkg(id), ph = p && p.product && p.product.defaultOption && p.product.defaultOption.freePhase;
    if (ph && ph.billingPeriod) { const m = String(ph.billingPeriod.iso8601 || '').match(/P(\d+)([DW])/); if (m) return +m[1] * (m[2] === 'W' ? 7 : 1); }
    return id === 'pro_annual' && !p ? 7 : 0;
  },
  async buy(id) {
    const info = BILLING_CONFIG.packages[id]; if (!info || this.busy) return;
    if (this.test && !this.native()) {   // simulated purchase (local preview only)
      S.sub = { plan: info.plan, lifetime: info.period === 'lifetime', expires: info.period === 'lifetime' ? 0 : Date.now() + (info.period === 'annual' ? 365 : 30) * 864e5,
        period: info.period, willRenew: info.period !== 'lifetime', product: id, source: 'test', checked: Date.now() };
      save(); return this.done(info);
    }
    const p = this.pkg(id) || (await this.loadOffering(), this.pkg(id));
    if (!p) return toast('Google Play didn\'t load the plans. Check your connection and try again.');
    this.busy = true; Paywall.rerender();
    try {
      const r = await this.p.purchasePackage({ aPackage: p });
      Plan.fromCustomerInfo(r.customerInfo);
      this.done(info);
    } catch (e) {
      const cancelled = e && (String(e.code) === '1' || (e.data && e.data.userCancelled));
      if (!cancelled) toast(`Purchase didn't go through: ${esc(e.message || 'try again')}`);
    } finally { this.busy = false; Paywall.rerender(); }
  },
  done(info) {
    closeSheet(); render();
    burst(innerWidth / 2, innerHeight / 3, 40); SFX.play('levelUp'); haptic([30, 40, 60]);
    toast(`${icon('check', 'xs')} ${info.period === 'lifetime' ? 'Zelum Pro is yours for life' : `Welcome to Zelum ${PLAN_NAMES[info.plan]}`}`);
  },
  async restore() {
    if (this.test && !this.native()) return toast(S.sub ? 'Test plan restored' : 'No purchases on this device');
    if (!this.ready) return toast('Open the Zelum Android app to restore purchases');
    try { const r = await this.p.restorePurchases(); Plan.fromCustomerInfo(r.customerInfo); toast(Plan.current() === 'free' ? 'No purchases found for this Google account' : `${icon('check', 'xs')} ${Plan.label()} restored`); }
    catch (e) { toast(`Couldn't restore: ${esc(e.message || 'try again')}`); }
  },
  /* Google Play's own subscription page: cancel, change payment method, see renewal date */
  manage() {
    const url = `https://play.google.com/store/account/subscriptions?package=io.github.juanjotgarcia.ledger${S.sub && S.sub.product ? `&sku=${encodeURIComponent(S.sub.product)}` : ''}`;
    if (Native.isApp) location.href = url; else window.open(url, '_blank', 'noopener');
  },
};

/* ---------- Plans screen (paywall) ---------- */
let payPeriod = 'annual', payFeature = null;
const Paywall = {
  open(feature = null) { payFeature = feature; payPeriod = 'annual'; openSheet(paywallHTML(), { cls: 'tall paywall' }); if (Billing.ready && !Billing.offering) Billing.loadOffering(); },
  rerender() { const s = sheetEl(); if (s && s.classList.contains('paywall')) morphHTML(s, '<div class="grabber"></div>' + paywallHTML()); },
};
function paywallHTML() {
  const cur = Plan.current(), f = payFeature && FEATURES[payFeature], an = payPeriod === 'annual';
  const saving = (m, y) => { const pm = Billing.pkg(m), py = Billing.pkg(y); if (!pm || !py) return m === 'basic_monthly' ? 44 : 42; return Math.round((1 - py.product.price / (pm.product.price * 12)) * 100); };
  const perk = k => `<li>${icon('check', 'xs')} <span><b>${esc(FEATURES[k].name)}</b> ${esc(FEATURES[k].desc)}</span></li>`;
  const buyBtn = (id, label, primary) => !Billing.canBuy()
    ? (Native.isApp ? `<p class="tiny muted mt-s center-t">${Billing.error ? `Google Play: ${esc(Billing.error)}` : Billing.native() ? 'Loading Google Play…' : 'Purchases open when Zelum launches on Google Play.'}</p>`
      : `<a class="btn ${primary ? 'primary' : 'soft'} wide mt-s" href="${APK_URL}" target="_blank" rel="noopener">${icon('download', 'sm')} Get it in the Android app</a>`)
    : `<button class="btn ${primary ? 'primary' : 'soft'} wide mt-s" data-act="buyPlan" data-id="${id}" ${Billing.busy ? 'aria-busy="true"' : ''}>${Billing.busy ? 'Opening Google Play…' : label}</button>`;
  const planCard = (plan, title, sub) => {
    const id = `${plan}_${an ? 'annual' : 'monthly'}`, owned = cur === plan && !S.founder && !(S.sub && S.sub.lifetime), trial = Billing.trialDays(id);
    return `<section class="plan-card ${plan} ${plan === 'pro' ? 'best' : ''}">
      ${plan === 'pro' ? '<span class="plan-flag">Most popular</span>' : ''}
      <div class="row between center"><div><h3>${title}</h3><p class="tiny muted">${sub}</p></div>
        <div class="plan-price"><b>${esc(Billing.price(id))}</b><span>/${an ? 'year' : 'month'}</span></div></div>
      ${an ? `<p class="tiny plan-save">Save ${saving(`${plan}_monthly`, id)}% vs monthly</p>` : ''}
      <ul class="perks">${plan === 'pro' ? `<li class="tiny muted">Everything in Basic, plus:</li>` : ''}${PLAN_PERKS[plan].map(perk).join('')}</ul>
      ${owned ? `<p class="small mt-s plan-owned">${icon('check', 'xs')} Your plan</p>` : PLAN_RANK[cur] > PLAN_RANK[plan] ? '' : buyBtn(id, trial ? `Start ${trial}-day free trial` : `Get ${PLAN_NAMES[plan]}`, plan === 'pro')}
      ${trial && !owned && PLAN_RANK[cur] < PLAN_RANK[plan] ? `<p class="tiny muted center-t mt-s">Then ${esc(Billing.price(id))}/${an ? 'year' : 'month'}. Cancel any time before the trial ends.</p>` : ''}
    </section>`;
  };
  return `<div class="pay-head"><div class="pay-logo">${logoSVG({ size: 64 })}</div>
      ${f ? `<p class="eyebrow gold mt">${PLAN_NAMES[f.need]} feature</p>` : ''}<h2>${f ? esc(f.name) : 'Zelum plans'}</h2>
      <p class="small muted">${f ? esc(f.desc) + '.' : 'Free trains you. Basic and Pro coach you deeper.'} Free stays free: training, logging, habits, nutrition and your coach.</p></div>
    ${S.founder ? `<div class="plan-founder mt">${icon('crown', 'sm')} <span>You're a <b>Founder</b>: Pro is yours for life, on us. Thank you for being here first.</span></div>` : ''}
    <div class="seg mt" role="tablist">${[['monthly', 'Monthly'], ['annual', 'Annual']].map(([v, l]) => `<button class="${payPeriod === v ? 'on' : ''}" data-act="payPeriod" data-v="${v}">${l}${v === 'annual' ? ' · save ~40%' : ''}</button>`).join('')}</div>
    ${[['basic', 'Basic', 'Go deeper on habits, skills and style'], ['pro', 'Pro', 'The full coach: analysis, records, routines']]
      .sort((x, y) => f && f.need === 'pro' ? (x[0] === 'pro' ? -1 : 1) : 0).map(c => planCard(...c)).join('')}
    <section class="plan-card lifetime">
      <div class="row between center"><div><h3>Lifetime</h3><p class="tiny muted">Everything in Pro, forever. Pay once.</p></div>
        <div class="plan-price"><b>${esc(Billing.price('lifetime'))}</b><span>once</span></div></div>
      ${S.founder || (S.sub && S.sub.lifetime) ? `<p class="small mt-s plan-owned">${icon('check', 'xs')} You have it</p>` : buyBtn('lifetime', 'Buy Lifetime', false)}
    </section>
    <div class="row gap mt wrap center-row">
      <button class="btn ghost sm" data-act="restorePlan">${icon('refresh', 'xs')} Restore purchases</button>
      ${S.sub && S.sub.source === 'play' && !S.sub.lifetime ? `<button class="btn ghost sm" data-act="managePlan">${icon('settings', 'xs')} Manage subscription</button>` : ''}
    </div>
    <p class="tiny muted mt pay-legal">Payment is charged to your Google Play account. Subscriptions renew automatically at the price shown until you cancel in Google Play → Payments &amp; subscriptions; cancel at least 24 hours before the period ends to avoid the next charge. Free trials convert to a paid plan when they end unless cancelled. Lifetime is a single payment.${Billing.test && !Billing.native() ? ' <b>Test mode:</b> purchases here only switch the plan on this device.' : ''}</p>`;
}
/* Me → Plan card */
function planCardHTML() {
  const p = Plan.current(), s = S.sub, renew = s && s.expires && !s.lifetime ? new Date(s.expires).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  return `${cardHead('Your plan', `<span class="plan-tag ${p}">${p === 'free' ? '' : icon('crown', 'xs')} ${esc(PLAN_NAMES[p])}</span>`, 'crown')}
    <h2>${esc(Plan.label())}</h2>
    <p class="small muted mt-s">${S.founder ? 'You were here before plans existed, so every Pro feature is yours for life.'
      : p === 'free' ? 'Upgrade for coach analysis, records, custom routines, all skill trees, unlimited habits and every palette.'
      : s && s.lifetime ? 'Paid once. Every Pro feature, forever.'
      : `${s && s.trial ? 'Free trial · ' : ''}${s && s.willRenew === false ? 'Ends' : 'Renews'} ${renew}${s && s.source === 'test' ? ' · test purchase' : ''}`}</p>
    <div class="row gap mt wrap">
      <button class="btn ${p === 'pro' ? 'soft' : 'primary'}" data-act="openPlans">${icon(p === 'pro' ? 'info' : 'crown', 'sm')} ${p === 'pro' ? 'See plans' : p === 'basic' ? 'Upgrade to Pro' : 'See plans'}</button>
      ${s && s.source === 'play' && !s.lifetime && p !== 'free' ? '<button class="btn ghost" data-act="managePlan">Manage</button>' : ''}
      ${s && s.source === 'test' ? '<button class="btn ghost" data-act="clearTestPlan">Clear test plan</button>' : ''}
    </div>`;
}
/* A locked tab or screen: what it does, and the way in */
function lockedHTML(f) {
  const F = FEATURES[f];
  return card(`<div class="locked"><span class="locked-ic">${icon(F.icon)}</span><h3>${esc(F.name)}</h3>
    <p class="small muted">${esc(F.desc)}.</p>
    <button class="btn primary mt" data-act="openPlans" data-f="${f}">${icon('lock', 'sm')} Unlock with ${PLAN_NAMES[F.need]}</button></div>`, 'locked-card');
}

const PLAN_ACT = {
  openPlans: d => Paywall.open(d && d.f || null),
  payPeriod: d => { payPeriod = d.v; SFX.play('tap'); Paywall.rerender(); },
  buyPlan: d => Billing.buy(d.id),
  restorePlan: () => Billing.restore(),
  managePlan: () => Billing.manage(),
  clearTestPlan: () => { if (S.sub && S.sub.source === 'test') { S.sub = null; save(); render(); toast('Test plan cleared'); } },
};
