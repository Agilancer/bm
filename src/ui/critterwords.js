// What a gilded critter was worth (src/core/critters.js), as words rising off where it was caught: "+48 XP" in its own
// colour, or "+30 gold" in gold, as VELSCOUR floats them, gone in under two seconds; and its motes flying off it to where it
// went (the level's medal for experience, the pack for gold), which swells and glows as they come. And the crosshair's grab
// mark, over one a click would catch (src/main.js updateCritters): gold, and turned into a plus.
const MOST = 6, LIFE = 1.8, MOTES = 24, FLY = 0.55;
const CSS = `
#critterWords { position: fixed; inset: 0; pointer-events: none; z-index: 3; overflow: hidden; }
#critterWords b { position: absolute; left: 0; top: 0; margin: -0.6em 0 0 -4em; width: 8em; text-align: center; font: 800 24px/1.2 Cinzel, 'Trajan Pro', Georgia, serif;
  letter-spacing: .03em; -webkit-text-stroke: 2px #0a0705; paint-order: stroke fill; text-shadow: 0 2px 3px #000, 0 0 12px rgba(0, 0, 0, .9); will-change: transform, opacity; opacity: 0; }
#critterWords i { position: absolute; left: 0; top: 0; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%; opacity: 0; will-change: transform, opacity;
  background: radial-gradient(circle, #fff 0 25%, var(--c) 45%, transparent 72%); box-shadow: 0 0 10px 3px var(--c); }
body.cinematic #critterWords, body.paused #critterWords { display: none; }
@keyframes critterPulse { 0% { filter: none; scale: 1; } 30% { filter: brightness(1.7) drop-shadow(0 0 10px #ffd860); scale: 1.12; } 100% { filter: none; scale: 1; } }
.critterPulse { animation: critterPulse .45s ease-out; }
#cross.grab { opacity: 1; transform: translate(-50%, -50%) rotate(45deg) scale(1.3); }
#cross.grab::before, #cross.grab::after { background: #ffd040; box-shadow: 0 0 6px #ffb020, 0 0 2px #000; }
`;

export class CritterWords {
  // o: { renderer (its frameData: the view and projection) }
  constructor(o) {
    this.o = o;
    const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
    this.layer = document.createElement('div'); this.layer.id = 'critterWords';
    document.body.append(this.layer);
    this.words = [];
    for (let i = 0; i < MOST; i++) { const el = document.createElement('b'); this.layer.append(el); this.words.push({ el, t: LIFE, x: 0, y: 0, z: 0, k: 1 }); }
    this.next = 0;
    this.motes = [];
    for (let i = 0; i < MOTES; i++) { const el = document.createElement('i'); this.layer.append(el); this.motes.push({ el, t: 1, wait: 0, a: [0, 0], b: [0, 0], bend: 0, to: null }); }
    this.nextMote = 0;
  }

  // The words; k: their size (one not ripe: smaller).
  add(x, y, z, text, color, k = 1) {
    const w = this.words[this.next]; this.next = (this.next + 1) % MOST;
    Object.assign(w, { t: 0, x, y, z, k });
    w.el.textContent = text; w.el.style.color = color;
  }

  // Its motes, n of them, off (x, y, z) in the world to the element to (by id), one after another.
  fly(x, y, z, to, color, n) {
    const p = this.screen(x, y, z), el = document.getElementById(to);
    if (!p || !el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const b = [r.left + r.width / 2, r.top + r.height / 2];
    for (let i = 0; i < n; i++) {
      const m = this.motes[this.nextMote]; this.nextMote = (this.nextMote + 1) % MOTES;
      Object.assign(m, { t: 0, wait: i * 0.04, a: [p[0] + (Math.random() - 0.5) * 30, p[1] + (Math.random() - 0.5) * 30], b, bend: (Math.random() - 0.5) * 260, to: i === 0 ? el : null });
      m.el.style.setProperty('--c', color);
    }
  }

  screen(x, y, z) {
    const m = this.o.renderer.frameData;
    if (!m) return null;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    return cw > 0.1 ? [(cx / cw * 0.5 + 0.5) * innerWidth, (0.5 - cy / cw * 0.5) * innerHeight, cw] : null;
  }

  update(dt, active) {
    for (const w of this.words) {
      if (w.t >= LIFE) continue;
      w.t += dt;
      let op = 0;
      const p = active && w.t < LIFE ? this.screen(w.x, w.y, w.z) : null;
      if (p) {
        const k = w.t / LIFE, pop = w.t < 0.12 ? 0.6 + (w.t / 0.12) * 0.6 : 1.2 - Math.min(1, (w.t - 0.12) / 0.2) * 0.2;
        const sy = p[1] - 70 * (1 - (1 - k) ** 2);
        w.el.style.transform = `translate(${p[0].toFixed(1)}px, ${sy.toFixed(1)}px) scale(${(w.k * pop * Math.max(0.75, Math.min(1.15, 9 / p[2]))).toFixed(3)})`;
        op = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
      }
      w.el.style.opacity = op.toFixed(2);
    }
    // The motes: off in a curve, quicker as they go, and the first to land makes what they went to swell.
    for (const m of this.motes) {
      if (m.t >= 1) continue;
      if ((m.wait -= dt) > 0) { m.el.style.opacity = '0'; continue; }
      m.t = Math.min(1, m.t + dt / FLY);
      const k = m.t * m.t, x = m.a[0] + (m.b[0] - m.a[0]) * k + Math.sin(Math.PI * m.t) * m.bend * 0.5, y = m.a[1] + (m.b[1] - m.a[1]) * k - Math.sin(Math.PI * m.t) * 60;
      m.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(1.3 - m.t * 0.5).toFixed(2)})`;
      m.el.style.opacity = active && m.t < 1 ? '1' : '0';
      if (m.t >= 1 && m.to) { const el = m.to; el.classList.remove('critterPulse'); void el.offsetWidth; el.classList.add('critterPulse'); m.to = null; }
    }
  }
}
