// A life bar over every enemy's head, in the world: the only life bar on the interface itself is a boss's (#foe, by isBoss
// below; a dungeon boss's is #bossFrame, src/ui/party.js). A bar for each body in the snapshot that isn't one of yours (not
// the other Tessariels, Lisandra or your own body; Tessariel's knights only if one's turned on you), each jelly, and each
// tumbler that's awake. Whatever means you harm or has been hurt shows from FAR metres; what hasn't seen you yet, from
// NEAR (so a room's worth of the dead isn't read through its wall from across the catacombs). Nearest first, MOST at once.
//
// Where the bar sits: over the head the sim wrote for it (C.HEAD_Y: a knight's own head as posed, src/sim/knight.js; the top
// of any other body, src/sim/beast.js), or by its kind if there's none (TALL). A jelly's and a tumbler's, over its top by its
// size; their life is the last float of each one's block (src/sim/slimes.js, src/sim/tumblers.js).
import { C, CHARS_START, C_SIZE, H, MAX_SLIMES, MAX_TUMBLERS, SLIME_FLOATS, SLIMES_START, TUMBLER_FLOATS, TUMBLERS_START } from '../core/layout.js';
import { TRIPO_KIND } from '../core/tripo-monsters.js';

export const FAR = 34, NEAR = 18, MOST = 28;
// How tall each kind stands when the sim hasn't said where its head is (FOE_NAMES in src/main.js).
export const TALL = { 0: 2.15, 1: 2.15, 2: 1.7, 3: 3.4, 4: 5.2, 5: 2.05, 6: 3.1, 9: 2.7, 10: 2.6 };
// A boss, whose life is on the interface as well: Velscour's knights (the black knight among them), the Gravehart, the Bone
// Hydra, the werewolf, the Abyssal Mouth, and any monster with a great beast's life or more.
export const BOSS_KINDS = new Set([0, 3, 4, 9, 10]), BOSS_LIFE = 400;
export const isBoss = (kind, maxHp) => BOSS_KINDS.has(kind) || (kind >= TRIPO_KIND && maxHp >= BOSS_LIFE);

/** How high over its feet a body's bar goes: y its feet, hy the head the sim wrote (or nothing), kind what it is. */
export function barHeight(kind, y, hy) {
  const head = hy > y + 0.3 && hy < y + 14;
  // (A knight's is the middle of his head; any other is the top of the body already.)
  return head ? hy - y + (kind < 2 ? 0.5 : 0.3) : (TALL[kind] ?? 2.1) + 0.3;
}

/** Whether a body gets a bar: d metres off, hostile (it means you harm), its life and its most. Tessariel's knights (kind 1)
 * only when they've turned on you. */
export function barShown(kind, d, hostile, hp, maxHp) {
  if (!(hp > 0) || !(maxHp > 0)) return false;
  if (kind === 1 && !hostile) return false;
  return d < (hostile || hp < maxHp - 0.5 ? FAR : NEAR);
}

const CSS = `
#foeBars { position: fixed; inset: 0; pointer-events: none; z-index: 3; overflow: hidden; }
#foeBars div { position: absolute; left: 0; top: 0; width: 70px; height: 8px; margin: -8px 0 0 -35px; background: rgba(0,0,0,.72); border: 1px solid rgba(20,12,8,.95); border-radius: 2px;
  box-shadow: 0 0 3px rgba(0,0,0,.8); will-change: transform, opacity; opacity: 0; transform-origin: 50% 100%; }
#foeBars div i { display: block; height: 100%; width: 100%; transform-origin: 0 50%; background: linear-gradient(180deg, #e0503a, #a0231a 55%, #5b0e08); }
#foeBars div.calm i { background: linear-gradient(180deg, #c9a24a, #8a6a24 55%, #4f3a10); }
body.cinematic #foeBars, body.paused #foeBars { display: none; }
`;

export class FoeBars {
  // o: { renderer (its frameData: the view and projection), heroCount(): how many of the other Tessariels close the list }
  constructor(o) {
    this.o = o;
    const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
    this.layer = document.createElement('div'); this.layer.id = 'foeBars';
    document.body.append(this.layer);
    this.bars = [];
    for (let i = 0; i < MOST; i++) {
      const el = document.createElement('div'); el.innerHTML = '<i></i>';
      this.layer.append(el);
      this.bars.push({ el, fill: el.firstChild, op: '0', tf: '', f: -1, calm: false });
    }
    this.list = [];
  }

  // Each frame: active, the game's being played (no menu over it).
  update(snap, active) {
    const list = this.list;
    list.length = 0;
    if (active && snap[H.GAME] !== 2) {
      const px = snap[H.PX], py = snap[H.PY], pz = snap[H.PZ];
      // The bodies: all but the last of them (the other Tessariels, Lisandra's two, and your own in third person).
      const n = Math.max(0, (snap[H.NCHARS] | 0) - (this.o.heroCount() || 0) - 2);
      for (let i = 0; i < n; i++) {
        const o = CHARS_START + i * C_SIZE;
        if (snap[o + C.ACTIVE] < 0.5 || snap[o + C.STATE] === 10) continue;
        const kind = snap[o + C.KIND] | 0, x = snap[o + C.X], y = snap[o + C.Y], z = snap[o + C.Z];
        if (Math.abs(y - py) > 14) continue;
        const d = Math.hypot(x - px, z - pz), hostile = snap[o + C.HOSTILE] > 0.5, hp = snap[o + C.HP], max = snap[o + C.MAX_HP];
        if (!barShown(kind, d, hostile, hp, max)) continue;
        list.push({ x, y: y + barHeight(kind, y, snap[o + C.HEAD_Y]), z, d, f: hp / max, calm: !hostile });
      }
      for (let i = 0; i < MAX_SLIMES; i++) {
        const o = SLIMES_START + i * SLIME_FLOATS;
        if (snap[o] < 0.5) continue;
        const x = snap[o + 1], y = snap[o + 2], z = snap[o + 3], d = Math.hypot(x - px, z - pz), f = snap[o + SLIME_FLOATS - 1];
        if (!(f > 0) || d > (d < 14 || f < 0.999 ? FAR : NEAR) || Math.abs(y - py) > 14) continue;
        list.push({ x, y: y + snap[o + 4] * 1.5 + 0.35, z, d, f, calm: d >= 14 });
      }
      for (let i = 0; i < MAX_TUMBLERS; i++) {
        const o = TUMBLERS_START + i * TUMBLER_FLOATS;
        if (snap[o] < 0.5) continue;
        const x = snap[o + 1], y = snap[o + 2], z = snap[o + 3], d = Math.hypot(x - px, z - pz), f = snap[o + TUMBLER_FLOATS - 1], awake = snap[o + 6] > 0.05;
        // (Asleep and whole, it's a boulder like any other: no bar gives it away.)
        if (!(f > 0) || (!awake && f > 0.999) || d > FAR || Math.abs(y - py) > 24) continue;
        list.push({ x, y: y + snap[o + 4] * 1.75 + 0.3, z, d, f, calm: !awake });
      }
      if (list.length > MOST) { list.sort((a, b) => a.d - b.d); list.length = MOST; }
    }
    const m = this.o.renderer.frameData, W = innerWidth, Ht = innerHeight;
    for (let k = 0; k < MOST; k++) {
      const b = this.bars[k], e = list[k];
      let op = '0';
      if (e && m) {
        const cx = m[0] * e.x + m[4] * e.y + m[8] * e.z + m[12], cy = m[1] * e.x + m[5] * e.y + m[9] * e.z + m[13], cw = m[3] * e.x + m[7] * e.y + m[11] * e.z + m[15];
        if (cw > 0.1) {
          const sx = (cx / cw * 0.5 + 0.5) * W, sy = (0.5 - cy / cw * 0.5) * Ht;
          if (sx > -40 && sx < W + 40 && sy > -10 && sy < Ht + 10) {
            const s = Math.max(0.62, Math.min(1.15, 9 / cw));
            const tf = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${s.toFixed(3)})`;
            if (tf !== b.tf) { b.tf = tf; b.el.style.transform = tf; }
            const f = Math.max(0, Math.min(1, e.f));
            if (Math.abs(f - b.f) > 0.004) { b.f = f; b.fill.style.transform = `scaleX(${f.toFixed(3)})`; }
            if (e.calm !== b.calm) { b.calm = e.calm; b.el.className = e.calm ? 'calm' : ''; }
            op = Math.min(1, (FAR - e.d) / 6).toFixed(2);
          }
        }
      }
      if (op !== b.op) { b.op = op; b.el.style.opacity = op; }
    }
  }
}
