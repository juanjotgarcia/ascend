/* ZELUM — languages (v1.15.0). English is written straight into the templates; Spanish lives in js/lang-es.js
   as a dictionary from the English text to the Spanish text, so the screens' code stays one readable version.
   - Loaded first. Reads the choice from localStorage (per device, like Graphics): 'auto' follows the phone.
   - In Spanish, every HTML string the app writes (innerHTML, insertAdjacentHTML) is translated on its way in:
     each text run between tags, and placeholder/title/aria-label/alt. morphHTML still compares the English
     strings, so unchanged screens skip all of this.
   - Keys with {} are patterns: "{} sets left" matches "3 sets left". In the Spanish side {} fills in order,
     {0} {1}… picks a capture by position. Captures are translated too ("Next: {}" → "Siguiente: Empuje A").
   - Plain text that never becomes HTML (system notifications, widgets) goes through tr().
   - Text with no entry stays English. Add new strings with: node tools/i18n-extract.js (lists the missing ones),
     and in the browser console I18N.missing lists what the screens showed untranslated. */
const LANGS = [['auto', 'Automatic'], ['en', 'English'], ['es', 'Español']];
const I18N = (() => {
  const KEY = 'ledger.lang';
  let pref = 'auto';
  try { pref = localStorage.getItem(KEY) || 'auto'; } catch (e) { }
  const sys = String((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  const lang = pref === 'es' || pref === 'en' ? pref : sys;
  // The dictionary only downloads for Spanish. A parser-inserted script, so it runs before the app's own scripts.
  if (lang === 'es' && !window.LANG_ES) document.write('<script src="js/lang-es.js"><\/script>');
  document.documentElement.lang = lang;
  return { pref, lang, sys, KEY, missing: new Set() };
})();
const LANG = I18N.lang;
const LOCALE = LANG === 'es' ? 'es-419' : 'en-US';
function setLang(v) { try { localStorage.setItem(I18N.KEY, v); } catch (e) { } location.reload(); }

(() => {
  let exact = null, pats = null;
  const cache = new Map();
  const decode = s => s.indexOf('&') < 0 ? s : s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, '\'');
  const encode = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function compile() {
    exact = new Map(); pats = [];
    const D = Object.assign({}, window.LANG_ES);
    // "{} Rest {}" is usually an icon then text; the icon is markup, so the text arrives as "Rest 1:30"
    for (const k in D) if (k.startsWith('{} ') && D[k] && D[k].startsWith('{} ') && !(k.slice(3) in D)) D[k.slice(3)] = D[k].slice(3);
    for (const k in D) {
      const v = D[k]; if (!v) continue;
      if (k.indexOf('{}') < 0) { exact.set(k, v); continue; }
      const parts = k.split('{}'), lit = parts.join('');
      if (!/[A-Za-z]/.test(lit)) continue;      // "{} · {}" would match almost anything
      const anchor = parts.reduce((a, b) => b.length > a.length ? b : a, '');
      pats.push({ re: new RegExp('^' + parts.map(reEsc).join('(.*?)') + '$', 's'), anchor, v, n: lit.length });
    }
    pats.sort((a, b) => b.n - a.n);             // the most specific pattern wins
  }
  function fill(v, caps, depth) {
    let i = 0;
    return v.replace(/\{(\d*)\}/g, (_, n) => { const c = caps[n === '' ? i++ : +n] ?? ''; return look(c, depth + 1) ?? c; });
  }
  // key: decoded, whitespace-collapsed, trimmed. Returns the translation or null.
  // ctx: the data-i18n (else data-act) of the tag the text sits in, or the attribute name. "Back@onbBack" or
  // "Back@aria-label" in the dictionary wins over plain "Back" there (one English word, two Spanish ones).
  // data-i18n="col" etc. only exists to give such a context, e.g. short column headers.
  function look(key, depth = 0, ctx = '') {
    if (!key || depth > 4 || !/[A-Za-z]/.test(key)) return null;
    const lead = key.match(/^\s*/)[0], trail = key.match(/\s*$/)[0], k = key.trim();
    let v = ctx ? exact.get(k + '@' + ctx) : undefined;
    if (v === undefined) v = exact.get(k);
    if (v === undefined) {
      v = null;
      for (const p of pats) {
        if (p.anchor && k.indexOf(p.anchor) < 0) continue;
        const m = p.re.exec(k); if (m) { v = fill(p.v, m.slice(1), depth); break; }
      }
    }
    if (v === null) v = pieces(k, depth);
    return v === null ? null : lead + v + trail;
  }
  // Fallbacks for text glued together from parts: "Chest · Barbell" translates part by part, and a final
  // period or colon is tried without it. null when nothing in it is known.
  function pieces(k, depth) {
    if (k.indexOf(' · ') > 0) {
      let hit = false;
      const out = k.split(' · ').map(p => { const t = look(p, depth + 1); if (t !== null) hit = true; return t ?? p; }).join(' · ');
      return hit ? out : null;
    }
    const q = /^([“"])(.+)([”"])$/.exec(k);   // a quote of the day in quotation marks
    if (q) { const t = look(q[2], depth + 1); return t === null ? null : q[1] + t + q[3]; }
    const end = /[.:]$/.exec(k);
    if (end && k.length > 2) { const t = look(k.slice(0, -1), depth + 1); return t === null ? null : t + end[0]; }
    return null;
  }
  // One text run from HTML (or plain text when plain = true)
  function run(raw, plain, ctx = '') {
    if (!/[A-Za-z]/.test(raw)) return raw;
    const ck = (plain ? '\u0001' : '') + ctx + '\u0002' + raw;
    let out = cache.get(ck);
    if (out !== undefined) return out;
    if (!exact) compile();
    const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    const key = decode(raw).replace(/\s+/g, ' ').trim();
    const v = look(key, 0, ctx);
    if (v === null) { out = raw; if (I18N.missing.size < 3000) I18N.missing.add(key); }
    else out = lead + (plain ? v : encode(v)) + trail;
    if (cache.size > 20000) cache.clear();
    cache.set(ck, out);
    return out;
  }
  const ATTR = /\b(placeholder|title|aria-label|alt)="([^"]*)"/g;
  function trHTML(html) {
    if (typeof html !== 'string' || !/[A-Za-z]/.test(html)) return html;
    let skip = false, ctx = '';
    return html.replace(/<[^>]*>|[^<]+/g, m => {
      if (m.charCodeAt(0) === 60 && m.length > 1 && /^<[\/!a-zA-Z]/.test(m)) {
        const low = m.slice(0, 8).toLowerCase();
        if (low.startsWith('<style') || low.startsWith('<script')) skip = true;
        else if (low.startsWith('</style') || low.startsWith('</scrip')) skip = false;
        if (m.indexOf('="') < 0) { ctx = ''; return m; }
        const act = m.indexOf(' data-') < 0 ? null : /data-i18n="([^"]*)"/.exec(m) || /data-act="([^"]*)"/.exec(m);
        ctx = act ? act[1] : '';
        return m.replace(ATTR, (a, n, val) => { const t = run(val, false, n); return t === val ? a : `${n}="${t.replace(/"/g, '&quot;')}"`; });
      }
      return skip ? m : run(m, false, ctx);
    });
  }
  window.tr = s => LANG === 'es' && s ? run(String(s), true) : s;
  window.trHTML = s => LANG === 'es' ? trHTML(s) : s;
  if (LANG !== 'es') return;
  // Translate HTML on its way into the page
  const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', { configurable: true, enumerable: desc.enumerable, get: desc.get, set(v) { desc.set.call(this, trHTML(v)); } });
  const ins = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (pos, html) { return ins.call(this, pos, trHTML(html)); };
})();
