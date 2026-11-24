/* ZELUM — "What's new": a one-time screen after an update.

   It appears once, the first time the app opens on a new version, and lists every release the person hasn't
   seen yet (newest first). New users never see it: finishing onboarding marks the current version as seen.
   The last version seen is kept in the synced state (S.seenVersion), so reading it on one device counts for all.
   Me → the version number in "Your data" opens it again any time.

   To announce a release: bump VERSION (app.js) and CACHE (sw.js), then add an entry at the top of RELEASES.
   Write for the person using the app: what they can do now, in plain words. Kinds: new · improved · fixed. */

const RELEASES = [
  {
    v: '1.14.0', date: '2026-11-24',
    title: 'Fluid motion',
    intro: 'Zelum now moves like your phone\'s own apps: soft, springy and fast.',
    items: [
      ['new', 'Elastic edges', 'Pull past the top or bottom of a screen and it stretches, then springs back. A fast scroll bounces softly at the end.'],
      ['new', 'Compact title', 'When the big title scrolls away, a slim bar with the screen\'s name stays at the top.'],
      ['new', 'Touch highlight', 'Cards light up softly under your finger.'],
      ['improved', 'Full refresh rate', 'The Android app now asks for your screen\'s fastest refresh rate (90, 120 or 144 Hz). Install the new app version once to get it.'],
      ['improved', 'Faster Me screen', 'Changes on the Me screen redraw faster.'],
    ],
  },
  {
    v: '1.13.1', date: '2026-11-24',
    title: 'Meet Zelum',
    intro: 'Thanks for training with us. We hope you\'re enjoying the app! This is our biggest update yet: a new name, a smoother feel and new ways to go further.',
    items: [
      ['new', 'A new name and look', 'Ledger is now Zelum (Latin for "zeal"), with a new logo on your home screen.'],
      ['new', 'Plans', 'Free keeps everything you need to train. Basic and Pro add skill trees, unlimited habits, Coach analysis, Records and custom routines. Lifetime is Pro with one payment.'],
      ['new', 'Faith mode', 'Verse of the day, Scripture in workouts and prayer habits now live behind one switch in Me → Settings.'],
      ['new', 'Graphics setting', 'Me → Settings → Graphics. Auto switches slower phones to Smooth so scrolling stays fluid.'],
      ['improved', 'Much smoother', 'Taps respond up to 5× faster, screens crossfade and a pill slides between tabs. Built for 120 Hz screens.'],
      ['improved', 'Your account, your choice', 'Delete your account and cloud backup any time from Me → Account.'],
      ['improved', 'Reminders', 'Exact reminder times are now optional (Me → Notifications → Exact times).'],
      ['fixed', 'Updates arrive right away', 'Zelum now refreshes itself a few seconds after an update is ready, instead of waiting for a full restart.'],
      ['fixed', 'Smoother sheets', 'Pop-up sheets no longer blur the whole screen, which caused stutter on some Android phones.'],
      ['fixed', 'Music colors', 'Could fail when the app went to the background while it was still starting.'],
      ['fixed', 'Badges', 'Three gym badges were listed twice.'],
    ],
  },
];
const RELEASE_KINDS = { new: ['New', 'star'], improved: ['Improved', 'up'], fixed: ['Fixed', 'check'] };
const LAST_VERSION_BEFORE_NOTES = '1.10.0';   // what people had before "What's new" existed

/* 1.10.0 < 1.13.0 */
function cmpVersion(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
}

const WhatsNew = {
  unseen() {
    const seen = S.seenVersion || LAST_VERSION_BEFORE_NOTES;
    return RELEASES.filter(r => cmpVersion(r.v, seen) > 0 && cmpVersion(r.v, VERSION) <= 0);
  },
  markSeen() { if (S.seenVersion !== VERSION) { S.seenVersion = VERSION; save(); } },
  /* On start-up: show once, after the first screen has painted, never over onboarding or a workout */
  maybeShow() {
    if (!S.onboarded || S.active) return;
    const list = this.unseen();
    if (!list.length) return this.markSeen();
    setTimeout(() => { if (!document.querySelector('.sheet-wrap')) this.open(list); }, 900);
  },
  open(list = RELEASES.slice(0, 1)) {
    openSheet(whatsNewHTML(list.slice(0, 3)), { cls: 'tall whatsnew', onClose: () => this.markSeen() });
    SFX.play('levelUp');
  },
};

function whatsNewHTML(list) {
  const top = list[0], name = S.profile.name ? `, ${esc(S.profile.name)}` : '';
  const item = ([kind, title, text]) => `<li class="wn-item"><span class="wn-ic ${kind}">${icon(RELEASE_KINDS[kind][1], 'sm')}</span>
    <div><b>${esc(title)}</b><p class="small muted">${esc(text)}</p></div></li>`;
  const release = (r, i) => `<section class="wn-release">
      ${i ? `<h4 class="wn-older">Also in v${esc(r.v)} · ${esc(r.title)}</h4>` : ''}
      ${Object.keys(RELEASE_KINDS).map(k => {
        const its = r.items.filter(x => x[0] === k);
        return its.length ? `<div class="wn-group"><span class="wn-kind ${k}">${RELEASE_KINDS[k][0]}</span><ul class="wn-list">${its.map(item).join('')}</ul></div>` : '';
      }).join('')}
    </section>`;
  return `<div class="wn-head">
      <div class="wn-logo">${logoSVG({ size: 72 })}</div>
      <p class="eyebrow gold mt">What's new · v${esc(top.v)}</p>
      <h2>${esc(top.title)}</h2>
      <p class="small muted wn-intro">Hey${name}! ${esc(top.intro)}</p>
    </div>
    ${S.founder && list.some(r => r.v === '1.13.1') ? `<div class="plan-founder mt">${icon('crown', 'sm')} <span>You were here first, so you're a <b>Founder</b>: every Pro feature is yours for life, on us.</span></div>` : ''}
    ${list.map(release).join('')}
    <button class="btn primary wide mt" data-act="closeSheet">Let's go</button>
    <p class="tiny muted center-t mt-s">See this again any time: Me → the version number.</p>`;
}

const WHATSNEW_ACT = { whatsNew: () => WhatsNew.open() };
