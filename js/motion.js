/* Zelum — Motion (v1.14): the feel of a flagship phone's own settings screens.
   - Elastic edges: pull past the top or bottom and the screen stretches with resistance, then springs back.
     A fling that hits an edge bounces softly instead of stopping dead.
   - Collapsing title: once the big title scrolls away, a compact bar with the screen's name settles in at the top.
   - Press highlight: big cards and rows light up softly under your finger.
   Rules (see learnings.md): one moving container (#view), transform/opacity only, nothing runs while idle.
   Everything is skipped for reduced motion, Smooth graphics and software drawing (Gfx.motion()). */
const Motion = {
  pull: 0, vel: 0, raf: 0, anchor: null, mode: 0, touching: false, lastY: 0,
  view: null, head: null, bar: null, barTitle: null, barOn: false, barAt: Infinity, dirty: true,
  sy: 0, st: 0,

  init() {
    this.view = document.getElementById('view');
    this.bar = document.getElementById('topbar');
    this.barTitle = this.bar && this.bar.querySelector('b');
    const o = { passive: true };
    addEventListener('touchstart', e => this.down(e), o);
    addEventListener('touchmove', e => this.move(e), o);
    addEventListener('touchend', e => this.up(e), o);
    addEventListener('touchcancel', e => this.up(e), o);
    addEventListener('scroll', () => this.scrolled(), o);
    addEventListener('resize', () => { this.dirty = true; }, o);
    document.addEventListener('pointerdown', e => this.pressDown(e), o);
    document.addEventListener('pointerup', () => this.pressUp(false), o);
    document.addEventListener('pointercancel', () => this.pressUp(true), o);
  },
  // Not tied to Graphics → Smooth: that setting only removes blur. (Tying them made the effects switch themselves
  // off a few seconds in, when Auto picked Smooth on a phone.) Only reduced motion and software drawing turn them off.
  on() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return !(typeof Native !== 'undefined' && Native.renderMode === 'software');
  },
  blocked(t) { return !this.view || (t && t.closest && t.closest('.sheet-wrap, #nav, .handback, input[type=range]')) || document.querySelector('.sheet-wrap'); },
  maxScroll() { return Math.max(0, document.documentElement.scrollHeight - innerHeight); },

  /* ---------- Elastic edges ---------- */
  // Resistance like a real material: easy at first, harder the further you pull (max ~ half the screen).
  rubber(x) { const d = innerHeight * 0.55, a = Math.abs(x); return Math.sign(x) * (1 - 1 / (a * 0.55 / d + 1)) * d; },
  down(e) {
    if (e.touches.length !== 1 || this.blocked(e.target) || !this.on()) { this.touching = false; return; }
    this.touching = true; this.anchor = null; this.mode = 0; this.lastY = e.touches[0].clientY;
    // Finger down at an edge: get the moving layer ready now, so the first frame of a pull has nothing to prepare.
    if (scrollY <= 1 || scrollY >= this.maxScroll() - 1) this.view.classList.add('elastic-ready');
    if (this.raf && Math.abs(this.pull) > 0.5) {   // caught mid-bounce: keep stretching from where it is
      cancelAnimationFrame(this.raf); this.raf = 0;
      this.mode = this.pull > 0 ? 1 : -1;
      this.anchor = this.lastY - this.unrubber(this.pull);
    }
  },
  unrubber(p) { const d = innerHeight * 0.55, a = Math.min(Math.abs(p), d * 0.98); return Math.sign(p) * (a * d / (d - a)) / 0.55; },
  move(e) {
    if (!this.touching || e.touches.length !== 1) return;
    const y = e.touches[0].clientY, dy = y - this.lastY; this.lastY = y;
    if (this.anchor === null) {
      const sy = scrollY;
      if (dy > 0 && sy <= 0) { this.mode = 1; this.anchor = y - dy; }
      else if (dy < 0 && sy >= this.maxScroll() - 1 && this.maxScroll() > 0) { this.mode = -1; this.anchor = y - dy; }
      else return;
    }
    const raw = y - this.anchor;
    if (raw * this.mode <= 0) { this.anchor = null; this.mode = 0; this.set(0); return; }
    this.set(this.rubber(raw));
  },
  up() {
    if (!this.touching) return;
    this.touching = false; this.anchor = null;
    if (Math.abs(this.pull) > 0.5) this.spring(0, 1);
    else if (!this.raf) this.view.classList.remove('elastic-ready');
  },
  set(p) {
    this.pull = p;
    const v = this.view;
    if (Math.abs(p) < 0.4) {
      if (v.style.transform) { v.style.transform = ''; if (this.head) this.head.style.transform = ''; v.classList.remove('stretching'); }
      if (!this.touching) v.classList.remove('elastic-ready');
      this.pull = 0; return;
    }
    if (!v.classList.contains('stretching')) {
      v.classList.add('stretching');
      this.head = p > 0 ? v.querySelector(':scope > header, :scope > .hero') : null;
    }
    v.style.transform = `translate3d(0,${p.toFixed(2)}px,0)`;
    // The title lags behind the content when pulled down, opening a soft gap (like the reference).
    if (this.head) this.head.style.transform = p > 0 ? `translate3d(0,${(-p * 0.55).toFixed(2)}px,0)` : '';
  },
  // Damped spring toward 0, tuned like the system's own: release snaps home in ~0.25 s with no wobble (zeta 1);
  // a fling bounce overshoots a touch (zeta 0.78). v1.14.0 used k=190, which felt slow and heavy.
  spring(v0, zeta) {
    cancelAnimationFrame(this.raf);
    if (!this.view.classList.contains('elastic-ready')) this.view.classList.add('elastic-ready');
    const k = 420, c = 2 * zeta * Math.sqrt(k);
    this.vel = v0;
    let last = 0;
    const step = t => {
      // Real elapsed time, in small steps: the motion takes the same time at 60, 120 or 144 Hz, even if a frame is late.
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 120; last = t;
      const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
      for (let i = 0; i < n; i++) { this.vel += (-k * this.pull - c * this.vel) * h; this.pull += this.vel * h; }
      if (Math.abs(this.pull) < 0.35 && Math.abs(this.vel) < 6) { this.raf = 0; this.set(0); return; }
      this.set(this.pull);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },

  /* ---------- Scroll: fling bounce + collapsing title ---------- */
  scrolled() {
    const y = scrollY, t = performance.now();
    const v = t - this.st < 80 ? (y - this.sy) / Math.max(1, t - this.st) : 0;   // px per ms
    this.sy = y; this.st = t;
    // A fling that reaches an edge hands its speed to the spring: a soft bounce out and back.
    if (!this.touching && !this.raf && Math.abs(v) > 0.6 && this.on()) {
      const max = this.maxScroll();
      const hit = (y <= 0 && v < 0) ? 1 : (max > 0 && y >= max - 1 && v > 0) ? -1 : 0;
      if (hit && !this.blocked()) this.spring(hit * Math.min(1500, Math.abs(v) * 450), 0.78);
    }
    if (this.touching && this.pull && this.mode === 1 && y > 0) { this.anchor = null; this.mode = 0; this.spring(0, 1); }
    this.title();
  },
  // Called after every render: the screen and its title may have changed.
  routeChanged(label) {
    if (this.barTitle && this.barTitle.textContent !== label) this.barTitle.textContent = label;
    this.dirty = true;
    if (Math.abs(this.pull) > 0.5 && !this.touching) this.spring(0, 1);
    // Measure in the next frame, where the browser lays the page out anyway: never force an extra layout in render().
    if (!this.tq) this.tq = requestAnimationFrame(() => { this.tq = 0; this.title(); });
  },
  tq: 0,
  title() {
    if (!this.bar) return;
    if (this.dirty) {
      this.dirty = false;
      const v = this.view, h = v && !document.querySelector('#app.onboarding') && !v.querySelector('.sticky-head') && v.querySelector('h1');
      this.barAt = h ? h.getBoundingClientRect().bottom + scrollY - this.bar.offsetHeight * 0.6 : Infinity;
    }
    const on = scrollY > this.barAt;
    if (on !== this.barOn) { this.barOn = on; this.bar.classList.toggle('on', on); }
  },

  /* ---------- Press highlight ---------- */
  pt: 0, pel: null,
  pressDown(e) {
    this.pressUp(true);
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // The tap target is either a glass row/card itself or a wide button filling most of one (habit rows).
    // Small buttons keep their own press (scale) and never light up the card around them.
    const hit = e.target.closest && e.target.closest('[data-act],[data-go]');
    if (!hit || hit.matches('.btn,.icon-btn,.round-btn,.chip-btn,.switch,.swatch,.lvl-pill,#fab,select,input') || hit.offsetWidth < innerWidth * 0.45) return;
    const el = hit.classList.contains('glass') || hit.classList.contains('srow') ? hit : hit.closest('.glass');
    if (!el || el.closest('#nav') || el.offsetHeight > innerHeight * 0.4 || hit.offsetWidth < el.offsetWidth * 0.5) return;
    this.pel = el;
    // A short delay so a scroll that starts on a card doesn't flash it.
    this.pt = setTimeout(() => { this.pt = 0; el.classList.add('pressed'); }, 55);
  },
  pressUp(cancel) {
    const el = this.pel; if (!el) return;
    this.pel = null;
    if (this.pt) { clearTimeout(this.pt); this.pt = 0; if (cancel) return; el.classList.add('pressed'); }
    if (cancel) { el.classList.remove('pressed'); return; }
    setTimeout(() => el.classList.remove('pressed'), 110);
  },
};
