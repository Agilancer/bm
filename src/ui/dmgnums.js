// What a spell took, as a number that leaps off whatever it struck: in the spell's own colour, bigger the harder it bit,
// gone in under a second. A held spell's bites on the same body within a moment are one number that counts up, not a
// fountain of small ones. Yours only (EV.SPELL_HIT, src/sim/casting.js hurt): the other Tessariels' blows show none.
import { ELEM_LIGHT } from '../sim/spells.js';

const MOST = 28, LIFE = 0.95, JOIN = 0.45, JOIN_R = 1.1;
const CSS = `
#dmgNums { position: fixed; inset: 0; pointer-events: none; z-index: 3; overflow: hidden; }
#dmgNums b { position: absolute; left: 0; top: 0; margin: -0.6em 0 0 -2em; width: 4em; text-align: center; font: 800 25px/1.2 Cinzel, 'Trajan Pro', Georgia, serif;
  letter-spacing: .02em; -webkit-text-stroke: 2px #0a0705; paint-order: stroke fill; text-shadow: 0 2px 3px #000, 0 0 9px rgba(0, 0, 0, .9); will-change: transform, opacity; opacity: 0; }
#dmgNums b.big { font-size: 36px; }
body.cinematic #dmgNums, body.paused #dmgNums { display: none; }
`;
const rgb = (e) => { const c = ELEM_LIGHT[e] || [1, 1, 1], f = (v) => Math.round(255 * Math.min(1, 0.5 + v * 0.6)); return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`; };

export class DmgNums {
  // o: { renderer (its frameData: the view and projection) }
  constructor(o) {
    this.o = o;
    const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
    this.layer = document.createElement('div'); this.layer.id = 'dmgNums';
    document.body.append(this.layer);
    this.nums = [];
    for (let i = 0; i < MOST; i++) { const el = document.createElement('b'); this.layer.append(el); this.nums.push({ el, t: LIFE, x: 0, y: 0, z: 0, v: 0, e: -1, big: false, sx: 0, text: '' }); }
    this.next = 0;
  }

  /** v of damage by element e, at (x, y, z). `most`: what counts as a heavy blow here (a fifth of your level's Firebolt). */
  add(x, y, z, v, e, most = 60) {
    if (!(v >= 0.5)) return;
    let n = this.nums.find((q) => q.t < JOIN && q.e === e && Math.hypot(q.x - x, q.y - y, q.z - z) < JOIN_R);
    if (n) { n.v += v; n.t = Math.min(n.t, 0.08); }
    else {
      n = this.nums[this.next]; this.next = (this.next + 1) % MOST;
      // (Over the life bar above its head, not on it, and off to one side or the other as it goes.)
      Object.assign(n, { t: 0, x, y: y + 0.95, z, v, e, sx: (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 40) });
      n.el.style.color = rgb(e);
    }
    const big = n.v >= most;
    if (big !== n.big) { n.big = big; n.el.className = big ? 'big' : ''; }
    const text = String(Math.round(n.v));
    if (text !== n.text) { n.text = text; n.el.textContent = text; }
  }

  update(dt, active) {
    const m = this.o.renderer.frameData, W = innerWidth, Ht = innerHeight;
    for (const n of this.nums) {
      if (n.t >= LIFE) continue;
      n.t += dt;
      let op = 0;
      if (n.t < LIFE && m && active) {
        const cx = m[0] * n.x + m[4] * n.y + m[8] * n.z + m[12], cy = m[1] * n.x + m[5] * n.y + m[9] * n.z + m[13], cw = m[3] * n.x + m[7] * n.y + m[11] * n.z + m[15];
        if (cw > 0.1) {
          const k = n.t / LIFE, pop = n.t < 0.09 ? 0.6 + n.t / 0.09 * 0.75 : 1.35 - Math.min(1, (n.t - 0.09) / 0.12) * 0.35;
          const sx = (cx / cw * 0.5 + 0.5) * W + n.sx * k, sy = (0.5 - cy / cw * 0.5) * Ht - 58 * (1 - (1 - k) ** 2) + 26 * k * k;
          n.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${(pop * Math.max(0.7, Math.min(1.2, 8 / cw))).toFixed(3)})`;
          op = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        }
      }
      n.el.style.opacity = op.toFixed(2);
    }
  }
}
