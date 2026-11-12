// Moving the interface about: Move Buttons, on the pause screen. Every button, bar and the map can be dragged anywhere on the
// screen, and made bigger or smaller, on a desk and (above all) on a phone; the layout is kept in localStorage
// (velscour.layout), one for a touch screen and one for a desk, and put back every time the game starts.
//
// How a piece is moved: each keeps its place from the stylesheet (src/ui/hud.css, src/ui/thumbs.js) and is shifted from it by
// CSS's own translate and scale properties, which sit apart from the transform the game's rules already use (a pressed
// button's scale, a centred bar's translateX). The shift is in units (--u: a pixel on a desk, a phone's unit on a phone), so a
// layout made on one phone holds its shape on the next, and anything a different screen would push off its edge is brought back
// on as it's put up (fit), without changing what's kept. Several elements that make one piece (the medal and its bars, the map
// and its frame) move as one, and grow about the piece's middle: k is each one's own point from that middle, in units.
//
// Nothing here runs as it's imported: the game makes an Arrange (src/main.js), and the test reads PIECES, cssFor and clean.
import { unitOf } from './thumbs.js';

export const LAYOUT_KEY = 'velscour.layout';
export const SCALE_MIN = 0.6, SCALE_MAX = 1.8, SCALE_STEP = 0.1;
const FAR = 4000;   // (no shift is further than this, in units: anything more is junk)

// What can be moved. touch / desk: the elements that make it on that screen (none: it isn't there).
const slot = (k) => ({ key: `slot${k + 1}`, name: `Spell ${k + 1}`, touch: [`#spells .spell[data-k="${k}"]`] });
export const PIECES = [
  { key: 'frame', name: 'Level and bars', touch: ['#levelBox', '#vitals'], desk: ['#levelBox', '#vitals'] },
  { key: 'buffs', name: "What's on you", touch: ['#buffs'], desk: ['#buffs'] },
  { key: 'party', name: 'Party', touch: ['#partyFrames'], desk: ['#partyFrames'] },
  { key: 'map', name: 'Map', touch: ['#mapMini', '#mapRing', '#bMap', '#clock'], desk: ['#mapMini', '#mapRing'] },
  { key: 'clock', name: 'Clock', desk: ['#clock'] },
  { key: 'skull', name: "Velscour's Skull", touch: ['#vskull', '#vskullTag'], desk: ['#vskull', '#vskullTag'] },
  { key: 'auto', name: 'Auto', touch: ['#autoBtn'], desk: ['#autoBtn'] },
  { key: 'autoLine', name: "Auto-play's line", touch: ['#autoStatus'], desk: ['#autoStatus'] },
  { key: 'chat', name: 'Chat', touch: ['#heroChat'], desk: ['#heroChat'] },
  { key: 'news', name: 'Foe and news', touch: ['#topStack'], desk: ['#foe'] },
  { key: 'spellbar', name: 'Spell bar', desk: ['#spells'] },
  { key: 'staff', name: 'Staff', touch: ['#bAttack', '#bCast'] },
  { key: 'dodge', name: 'Dodge', touch: ['#bDodge'] },
  { key: 'jump', name: 'Jump', touch: ['#bJump'] },
  { key: 'guard', name: 'Shield', touch: ['#bWide'] },
  { key: 'take', name: 'Take and talk', touch: ['#bTake', '#take'] },
  { key: 'run', name: 'Run', touch: ['#bSprint'] },
  { key: 'stick', name: 'Stick', touch: ['#stickHome'] },
  ...[0, 1, 2, 3, 4, 5].map(slot),
  { key: 'spellName', name: "Spell's name", touch: ['#spellName'] },
  { key: 'menu', name: 'Menu', touch: ['#bPause'] },
  { key: 'pack', name: 'Pack', touch: ['#bPack'] },
  { key: 'book', name: 'Spellbook', touch: ['#bBook'] },
  { key: 'quests', name: 'Quest log', touch: ['#bQuests'] },
  { key: 'view', name: 'View', touch: ['#bView'] },
];
const BY = Object.fromEntries(PIECES.map((p) => [p.key, p]));

const num = (v, lo, hi, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const r2 = (v) => Math.round(v * 100) / 100;

/** What's kept, made safe: only pieces there are, shifts and sizes in bounds, nothing else. (A layout from an older or a
 * tampered save loses what doesn't fit and keeps the rest.) */
export function clean(raw) {
  const out = { v: 1, touch: {}, desk: {} };
  if (!raw || typeof raw !== 'object') return out;
  for (const mode of ['touch', 'desk']) {
    const m = raw[mode];
    if (!m || typeof m !== 'object') continue;
    for (const [key, e] of Object.entries(m)) {
      const p = BY[key];
      if (!p || !p[mode] || !e || typeof e !== 'object') continue;
      const v = { x: r2(num(e.x, -FAR, FAR)), y: r2(num(e.y, -FAR, FAR)), s: r2(num(e.s, SCALE_MIN, SCALE_MAX, 1)) };
      if (Array.isArray(e.k)) v.k = p[mode].map((_, i) => { const q = e.k[i]; return Array.isArray(q) ? [r2(num(q[0], -FAR, FAR)), r2(num(q[1], -FAR, FAR))] : [0, 0]; });
      if (v.x || v.y || v.s !== 1) out[mode][key] = v;
    }
  }
  return out;
}

/** The stylesheet for one screen's layout: each moved element's translate and scale. */
export function cssFor(layout, mode) {
  let out = '';
  for (const p of PIECES) {
    const sels = p[mode], v = layout?.[p.key];
    if (!sels || !v) continue;
    sels.forEach((sel, i) => {
      const k = v.k?.[i] || [0, 0];
      const x = r2(v.x + (v.s - 1) * k[0]), y = r2(v.y + (v.s - 1) * k[1]);
      out += `${sel} { translate: calc(${x} * var(--u, 1px)) calc(${y} * var(--u, 1px)) !important;${v.s !== 1 ? ` scale: ${v.s} !important;` : ''} }\n`;
    });
  }
  return out;
}

const CSS = `
/* (Move Buttons, src/ui/arrange.js) */
#arrange { position: fixed; inset: 0; z-index: 70; display: none; touch-action: none; user-select: none; -webkit-user-select: none; background: rgba(0, 0, 0, .18); }
body.arranging #arrange { display: block; }
#arrange .arr-h { position: absolute; box-sizing: border-box; border: 1.5px dashed rgba(241, 214, 138, .8); border-radius: 6px; background: rgba(241, 214, 138, .08); cursor: grab; touch-action: none; }
#arrange .arr-h.sel { border-style: solid; border-color: #f1d68a; background: rgba(241, 214, 138, .18); box-shadow: 0 0 14px rgba(241, 214, 138, .45); }
#arrange .arr-h.moved { border-color: rgba(143, 224, 255, .85); }
#arrange .arr-h.sel.moved { border-color: #8fe0ff; }
#arrange .arr-h.drag { cursor: grabbing; }
#arrange .arr-h i { position: absolute; left: 50%; bottom: 100%; transform: translateX(-50%); margin-bottom: 2px; padding: 1px 5px; white-space: nowrap; pointer-events: none;
  font: 700 10px/1.2 Georgia, serif; font-style: normal; color: #1c1408; background: #f1d68a; border-radius: 3px; opacity: 0; }
#arrange .arr-h.sel i, #arrange .arr-h:hover i { opacity: 1; }
#arrange .arr-bar { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px;
  width: max-content; max-width: min(560px, 76vw); padding: 10px 12px; box-sizing: border-box; background: rgba(10, 8, 6, .9); border: 1px solid rgba(201, 163, 92, .6); border-radius: 6px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, .7); color: #efe4c8; font: 13px Georgia, serif; transition: opacity .15s; }
#arrange.dragging .arr-bar { opacity: .15; pointer-events: none; }
#arrange .arr-bar .arr-say { flex: 1 0 100%; text-align: center; color: #cdbf9f; cursor: move; touch-action: none; padding-bottom: 2px; }
#arrange .arr-bar .arr-say::before { content: ''; display: block; width: 34px; height: 3px; margin: -3px auto 5px; border-radius: 2px; background: rgba(201, 163, 92, .55); }
#arrange .arr-bar .arr-say b { color: #f1d68a; font: 700 14px Cinzel, Georgia, serif; letter-spacing: .06em; }
#arrange .arr-bar button { font: 600 13px Georgia, serif; color: #f3e6c4; background: #1b1611; border: 1px solid rgba(201, 163, 92, .55); border-radius: 4px; padding: 7px 11px; min-height: 36px; cursor: pointer; }
#arrange .arr-bar button:hover { border-color: #f1d68a; }
#arrange .arr-bar button:disabled { opacity: .4; cursor: default; }
#arrange .arr-bar button[data-a="save"] { color: #1c1408; background: linear-gradient(#f3dc9c, #c49a48); border-color: #fff0c0; }
/* While it's up, everything that can be moved is shown, the pause's hiding of it lifted, even what isn't there just now. */
body.arranging #touch, body.arranging #hud { visibility: visible !important; }
body.arranging :is(#bTake, #bWide, #bView) { display: flex !important; }
body.arranging #autoBtn { display: block !important; visibility: visible !important; }
body.arranging #vskull { display: block !important; visibility: visible !important; }
body.arranging #vskullTag { visibility: visible !important; }
body.arranging :is(#autoStatus, #heroChat) { display: block !important; visibility: visible !important; min-width: 120px; min-height: 24px; }
body.arranging #partyFrames { display: flex !important; min-width: 120px; min-height: 40px; }
body.arranging #topStack { display: flex !important; min-width: 160px; min-height: 28px; }
body.arranging #foe { opacity: 1 !important; }
body.arranging #stickHome { opacity: .8 !important; }
body.arranging #buffs { min-width: 60px; min-height: 22px; }
body.arranging #spellName:empty { min-width: 80px; min-height: 14px; }
`;

const HINT = 'Drag anything to move it; tap one to make it bigger or smaller. Drag this box by its top to see under it.';
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const clone = (o) => JSON.parse(JSON.stringify(o || {}));

export class Arrange {
  // o: { touch, input, onOpen(), onClose() }
  constructor(o) {
    this.o = o;
    this.mode = o.touch ? 'touch' : 'desk';
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); } catch { /* none kept */ }
    this.kept = clean(raw);
    this.draft = null;       // while it's up: the layout being made
    this.eff = {};           // what's put up: what's kept, brought on screen where it would run off it
    this.sel = null;
    const style = el('style'); style.textContent = CSS; document.head.append(style);
    this.sheet = el('style'); this.sheet.id = 'arrangeCss'; document.head.append(this.sheet);
    this.root = el('div'); this.root.id = 'arrange';
    this.bar = el('div', 'arr-bar', `<span class="arr-say"><b>Move Buttons</b><br><span class="arr-what">${HINT}</span></span>
      <button type="button" data-a="smaller" aria-label="Smaller">Smaller</button><button type="button" data-a="larger" aria-label="Bigger">Bigger</button>
      <button type="button" data-a="one">Reset this</button><button type="button" data-a="all">Reset all</button>
      <button type="button" data-a="cancel">Cancel</button><button type="button" data-a="save">Save</button>`);
    this.root.append(this.bar);
    document.body.append(this.root);
    for (const b of this.bar.querySelectorAll('[data-a]')) b.addEventListener('click', (e) => { e.stopPropagation(); this.act(b.dataset.a); });
    this.grabBar(this.bar.querySelector('.arr-say'));
    this.root.addEventListener('pointerdown', (e) => { if (e.target === this.root) this.pick(null); });
    // (Nothing under it hears a touch or a key while it's up.)
    for (const t of ['touchstart', 'touchmove', 'touchend', 'mousedown', 'wheel', 'contextmenu']) this.root.addEventListener(t, (e) => e.stopPropagation(), { passive: t !== 'contextmenu' && t !== 'touchmove' });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      e.stopPropagation(); e.preventDefault();
      if (e.code === 'Escape') this.act('cancel');
      else if (e.code === 'Enter') this.act('save');
    }, true);
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => (this.isOpen ? this.drawHandles() : this.apply()), 200); });
    this.apply();
    setTimeout(() => this.apply(), 2500);   // (once the game's own pieces are all up)
  }

  get isOpen() { return document.body.classList.contains('arranging'); }
  get u() { return this.mode === 'touch' ? unitOf(innerHeight) : 1; }
  layout() { return this.draft || this.eff; }

  // ---- what's put up

  /** Puts the kept layout up, brought on screen where this screen would push it off. */
  apply() {
    this.eff = clone(this.kept[this.mode]);
    this.write(this.eff);
    this.fit(this.eff);
  }

  write(layout) {
    this.sheet.textContent = cssFor(layout, this.mode);
    this.sideOfStick();
  }

  // The elements of a piece that are on the page and shown, and the box round them all.
  els(p) { return (p[this.mode] || []).map((s) => document.querySelector(s)); }
  box(p) {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const e of this.els(p)) {
      if (!e) continue;
      const q = e.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) continue;
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    }
    return l < r ? { l, t, r, b } : null;
  }

  // Anything off the screen brought back on (this screen only: what's kept is left as it was).
  fit(layout) {
    let changed = false;
    const W = innerWidth, H = innerHeight, u = this.u;
    for (const p of PIECES) {
      const v = layout[p.key];
      if (!v || !p[this.mode]) continue;
      const q = this.box(p);
      if (!q) continue;
      const dx = q.l < 0 ? -q.l : q.r > W ? W - q.r : 0, dy = q.t < 0 ? -q.t : q.b > H ? H - q.b : 0;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      v.x = r2(v.x + dx / u); v.y = r2(v.y + dy / u); changed = true;
    }
    if (changed) this.write(layout);
  }

  // The stick is taken up on whichever side of the screen its place is (src/input.js).
  sideOfStick() {
    const s = this.mode === 'touch' && document.getElementById('stickHome');
    if (!s || !this.o.input) return;
    const q = s.getBoundingClientRect();
    if (q.width) this.o.input.stickRight = q.left + q.width / 2 > innerWidth / 2;
  }

  // ---- Move Buttons

  open() {
    if (this.isOpen) return;
    this.draft = clone(this.kept[this.mode]);
    this.bar.style.left = this.bar.style.top = '';
    document.body.classList.add('arranging');
    this.o.onOpen?.();
    this.write(this.draft);
    this.fit(this.draft);
    this.pick(null);
    this.drawHandles();
  }

  close(save) {
    if (!this.isOpen) return;
    if (save) {
      const all = clean({ ...this.kept, [this.mode]: this.draft });
      this.kept = all;
      try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(all)); } catch (e) { console.warn('layout not kept', e); }
    }
    this.draft = null;
    for (const h of this.root.querySelectorAll('.arr-h')) h.remove();
    document.body.classList.remove('arranging');
    this.apply();
    this.o.onClose?.(save);
  }

  act(a) {
    const d = this.draft;
    if (!d) return;
    if (a === 'save') return this.close(true);
    if (a === 'cancel') return this.close(false);
    if (a === 'all') { this.draft = {}; this.write(this.draft); this.drawHandles(); return; }
    const k = this.sel;
    if (!k) return;
    if (a === 'one') delete d[k];
    else if (a === 'smaller' || a === 'larger') this.resize(k, a === 'larger' ? SCALE_STEP : -SCALE_STEP);
    this.write(d);
    this.fit(d);
    this.drawHandles();
  }

  // Bigger or smaller about the piece's middle: each of its elements' own point from there (k) is measured as it stands.
  resize(key, by) {
    const p = BY[key], d = this.draft;
    const v = d[key] || (d[key] = { x: 0, y: 0, s: 1 });
    const s = r2(Math.min(SCALE_MAX, Math.max(SCALE_MIN, v.s + by)));
    if (s === v.s) return;
    const q = this.box(p), u = this.u;
    if (q) {
      const gx = (q.l + q.r) / 2, gy = (q.t + q.b) / 2;
      v.k = this.els(p).map((e) => {
        if (!e) return [0, 0];
        const r = e.getBoundingClientRect();
        if (r.width < 1 || !e.offsetWidth) return [0, 0];
        // (the point it grows about: its transform-origin, where it is now)
        const [ox, oy] = getComputedStyle(e).transformOrigin.split(' ').map(parseFloat);
        const px = r.left + r.width * ((ox || 0) / e.offsetWidth), py = r.top + r.height * ((oy || 0) / e.offsetHeight);
        return [r2((px - gx) / (v.s * u)), r2((py - gy) / (v.s * u))];
      });
    }
    v.s = s;
  }

  pick(key) {
    this.sel = key;
    for (const h of this.root.querySelectorAll('.arr-h')) h.classList.toggle('sel', h.dataset.k === key);
    const v = key && this.draft?.[key];
    this.bar.querySelector('.arr-what').textContent = key ? `${BY[key].name}${v && v.s !== 1 ? ` · ${Math.round(v.s * 100)}%` : ''}` : HINT;
    for (const a of ['smaller', 'larger', 'one']) this.bar.querySelector(`[data-a="${a}"]`).disabled = !key;
  }

  // A dashed box over every piece on the screen, to take hold of.
  drawHandles() {
    for (const h of this.root.querySelectorAll('.arr-h')) h.remove();
    for (const p of PIECES) {
      if (!p[this.mode]) continue;
      const q = this.box(p);
      if (!q) continue;
      const h = el('div', 'arr-h', `<i>${p.name}</i>`);
      h.dataset.k = p.key;
      this.place(h, q);
      h.classList.toggle('moved', !!this.draft[p.key]);
      h.classList.toggle('sel', this.sel === p.key);
      this.grab(h, p);
      this.root.insertBefore(h, this.bar);
    }
    this.pick(this.sel);
  }

  place(h, q) {
    const pad = 3, min = 28;
    const w = Math.max(min, q.r - q.l + pad * 2), hh = Math.max(min, q.b - q.t + pad * 2);
    h.style.left = `${(q.l + q.r) / 2 - w / 2}px`; h.style.top = `${(q.t + q.b) / 2 - hh / 2}px`;
    h.style.width = `${w}px`; h.style.height = `${hh}px`;
  }

  // The box of buttons itself, by its top, out of the way of whatever's under it (where it is isn't kept).
  grabBar(grip) {
    let start = null;
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      grip.setPointerCapture?.(e.pointerId);
      const q = this.bar.getBoundingClientRect();
      start = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: q.left + q.width / 2, cy: q.top + q.height / 2, w: q.width, h: q.height };
    });
    grip.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const x = Math.min(innerWidth - start.w / 2, Math.max(start.w / 2, start.cx + e.clientX - start.x));
      const y = Math.min(innerHeight - start.h / 2, Math.max(start.h / 2, start.cy + e.clientY - start.y));
      this.bar.style.left = `${x}px`; this.bar.style.top = `${y}px`;
    });
    const end = (e) => { if (start && e.pointerId === start.id) start = null; };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }

  // Dragged with a finger or the mouse: kept whole on the screen.
  grab(h, p) {
    let start = null;
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      h.setPointerCapture?.(e.pointerId);
      const v = this.draft[p.key] || { x: 0, y: 0, s: 1 };
      start = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, q: this.box(p), moved: false };
      this.pick(p.key);
    });
    h.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      let dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) < 4) return;
      if (!start.moved) { start.moved = true; h.classList.add('drag'); this.root.classList.add('dragging'); }
      const q = start.q;
      if (q) {
        dx = Math.min(innerWidth - q.r, Math.max(-q.l, dx));
        dy = Math.min(innerHeight - q.b, Math.max(-q.t, dy));
      }
      const u = this.u, v = this.draft[p.key] || (this.draft[p.key] = { x: 0, y: 0, s: 1 });
      v.x = r2(start.vx + dx / u); v.y = r2(start.vy + dy / u);
      this.write(this.draft);
      if (q) this.place(h, { l: q.l + dx, r: q.r + dx, t: q.t + dy, b: q.b + dy });
      h.classList.add('moved');
    });
    const end = (e) => {
      if (!start || e.pointerId !== start.id) return;
      const moved = start.moved;
      start = null;
      h.classList.remove('drag'); this.root.classList.remove('dragging');
      if (moved) this.drawHandles();
    };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  }
}
