/* LEDGER — premium sound effects, synthesized live with the Web Audio API.
   No audio files: everything is generated on the device, so it works offline and costs nothing.
   Soft bells, glassy ticks and a touch of reverb, in the spirit of iOS system sounds. */
const SFX = (() => {
  let ctx = null, master = null, verb = null;
  const N = n => 440 * Math.pow(2, (n - 69) / 12);           // MIDI note → Hz
  const enabled = () => !(typeof S !== 'undefined' && S && S.settings && S.settings.sound === false);
  const volume = () => (typeof S !== 'undefined' && S && S.settings && S.settings.volume != null ? S.settings.volume : 0.7);

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = volume();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    // Small "room": a decaying noise impulse makes the bells feel expensive
    verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.8), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = buf;
    const wet = ctx.createGain(); wet.gain.value = 0.2;
    verb.connect(wet).connect(master);
    return ctx;
  }

  function tone(t, { f = 880, f2, type = 'sine', a = 0.004, d = 0.25, g = 0.2, wet = true }) {
    const o = ctx.createOscillator(), e = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d * 0.8);
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(g, t + a);
    e.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(e); e.connect(master); if (wet) e.connect(verb);
    o.start(t); o.stop(t + d + 0.05);
  }
  /* Bell = fundamental + slightly inharmonic partials that die faster */
  function bell(t, f, g = 0.16, d = 0.8) {
    tone(t, { f, g, d });
    tone(t, { f: f * 2.005, g: g * 0.32, d: d * 0.55 });
    tone(t, { f: f * 3.01, g: g * 0.1, d: d * 0.3 });
  }
  function noise(t, { d = 0.2, g = 0.08, f = 1500, f2, q = 0.8, type = 'bandpass', wet = false }) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * d)), b = ctx.createBuffer(1, len, ctx.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + d * 0.3); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl).connect(e); e.connect(master); if (wet) e.connect(verb);
    s.start(t);
  }

  const SOUNDS = {
    tap:       t => tone(t, { f: 2100, a: 0.001, d: 0.03, g: 0.045, wet: false }),
    nav:       t => { tone(t, { f: 1250, f2: 1600, a: 0.002, d: 0.06, g: 0.05, wet: false }); noise(t, { d: 0.05, g: 0.02, f: 5000, type: 'highpass' }); },
    open:      t => noise(t, { d: 0.24, g: 0.05, f: 500, f2: 2600, q: 0.6 }),
    close:     t => noise(t, { d: 0.18, g: 0.04, f: 2400, f2: 450, q: 0.6 }),
    toggleOn:  t => { bell(t, N(84), 0.12, 0.35); bell(t + 0.06, N(91), 0.12, 0.6); },
    toggleOff: t => tone(t, { f: N(79), f2: N(70), d: 0.16, g: 0.08, wet: false }),
    check:     t => { bell(t, N(88), 0.13, 0.5); bell(t + 0.075, N(95), 0.13, 0.9); },
    set:       t => { tone(t, { f: N(76), type: 'triangle', d: 0.12, g: 0.1, wet: false }); bell(t + 0.04, N(88), 0.1, 0.5); },
    water:     t => { tone(t, { f: 320, f2: 980, d: 0.13, g: 0.18 }); tone(t + 0.085, { f: 560, f2: 1500, d: 0.1, g: 0.09 }); },
    coin:      t => { [88, 92, 95, 100].forEach((n, i) => bell(t + i * 0.055, N(n), 0.1, 0.55)); noise(t + 0.18, { d: 0.35, g: 0.025, f: 7000, type: 'highpass', wet: true }); },
    badge:     t => { [84, 88, 91, 96, 100].forEach((n, i) => bell(t + i * 0.06, N(n), 0.11, 0.9)); },
    pr:        t => { [96, 100, 103, 108].forEach((n, i) => bell(t + i * 0.045, N(n), 0.08, 0.6)); noise(t, { d: 0.6, g: 0.03, f: 8000, type: 'highpass', wet: true }); },
    start:     t => { tone(t, { f: N(48), type: 'triangle', d: 0.6, g: 0.12 }); bell(t + 0.08, N(72), 0.12, 0.7); bell(t + 0.17, N(79), 0.11, 0.9); },
    complete:  t => { [67, 72, 76].forEach((n, i) => bell(t + i * 0.09, N(n), 0.13, 0.7)); [72, 76, 79, 84].forEach(n => tone(t + 0.3, { f: N(n), type: 'triangle', a: 0.03, d: 1.5, g: 0.05 })); },
    levelUp:   t => { [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => bell(t + i * 0.07, N(n), 0.11, 1.3)); [60, 67, 72, 76].forEach(n => tone(t + 0.5, { f: N(n), type: 'triangle', a: 0.06, d: 2, g: 0.05 })); noise(t + 0.45, { d: 1.3, g: 0.035, f: 6500, type: 'highpass', wet: true }); },
    rest:      t => { [0, 0.32, 0.64].forEach((dt, i) => bell(t + dt, N(i === 2 ? 91 : 88), 0.16, 0.7)); },
    error:     t => { tone(t, { f: 220, type: 'triangle', d: 0.18, g: 0.12, wet: false }); tone(t + 0.1, { f: 175, type: 'triangle', d: 0.24, g: 0.1, wet: false }); },
    swoosh:    t => noise(t, { d: 0.35, g: 0.06, f: 300, f2: 4000, q: 0.5, wet: true }),
  };

  return {
    play(name) {
      if (!enabled()) return;
      const c = init(); if (!c) return;
      if (c.state === 'suspended') c.resume();
      master.gain.value = volume();
      try { SOUNDS[name] && SOUNDS[name](c.currentTime + 0.01); } catch (e) { }
    },
    unlock() { const c = init(); if (c && c.state === 'suspended') c.resume(); },
    names: Object.keys(SOUNDS),
  };
})();
