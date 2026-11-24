// The folk on the roads (docs/ROAD-LIFE.md): when you're out on a road, every so often a carter, a pedlar, a pair of pilgrims
// is set down on it ahead of you, out of your sight, to come down it at you and on past, or to be overtaken going your way,
// or to be found stood by the roadside resting; and when the land puts travellers in a fix on the road (src/sim/wilds.js
// rescue), it's them you find huddled there. Their bodies and their walking are the town's thread's (src/folk/road-folk.js,
// src/folk/brain.js onRoad); this picks where, by the road graph, and tells it how a fix is going.
import { CHARS_START, C, C_SIZE, H } from '../core/layout.js';
import { nearestRoad, overLand } from '../core/roads.js';
import { townDist } from '../core/town.js';
import { cityIn } from '../core/east.js';
import { inDungeon } from '../core/dungeon.js';
import { terrainHeight } from '../core/terrain.js';

// first, every: seconds to the first band and between them (while you're on a road); out: how many bands at once; onRoad:
// how near a road you must be; town: how far from Bellmourn; city: from Phobos's wall (its crowd's its own); toward, ahead,
// resting: how likely each is (the rest: resting); n: how likely one, two (else three).
export const ROADFOLK = { first: [35, 70], every: [55, 110], out: 2, onRoad: 40, town: 300, city: 1.4, toward: 0.5, ahead: 0.25, n: [0.4, 0.8],
  rest: [40, 90], life: 900 };
const rand = (a, b) => a + Math.random() * (b - a);
// The way along the roads from (ax, az) to (bx, bz), a point every 8 m or so; cut where it leaves the roads to go straight over
// open country (the graph's points are 20 m apart: a longer step is off them), as nobody on foot with a cart would.
export function roadWay(ax, az, bx, bz) {
  const out = [];
  let lx = Infinity, lz = Infinity;
  for (const [x, z] of overLand(ax, az, bx, bz)) {
    const d = Math.hypot(x - lx, z - lz);
    if (out.length && d > 45) break;
    if (d >= 8) { out.push([Math.round(x * 10) / 10, Math.round(z * 10) / 10]); lx = x; lz = z; }
  }
  return out;
}

export class RoadFolk {
  // o: { town (src/folk/client.js), snap(), paused(), log(text) }
  constructor(o) {
    this.o = o;
    this.bands = new Map();      // id -> { kind, t0, who }
    this.fix = null;             // { id, x, z }: travellers in a fix on the road
    this.nextT = performance.now() / 1000 + rand(...ROADFOLK.first);
    this.n = 0;
    o.town?.on?.((e) => this.event(e));
    setInterval(() => this.tick(), 1000);
  }

  event(e) {
    if (e.type === 'road') { const b = this.bands.get(e.id); if (b) b.who = e.who; if (this.fix?.id === e.id) this.fix.who = e.who; }
    else if (e.type === 'roadDone') { this.bands.delete(e.id); if (this.fix?.id === e.id) this.fix = null; }
  }

  send(m) { this.o.town?.road?.(m); }
  // (What's been done, for a review: bm.view.roadFolk.notes.)
  note(t) { (this.notes ||= []).push(`${Math.round(performance.now() / 1000)} ${t}`); if (this.notes.length > 40) this.notes.shift(); }

  tick() {
    const s = this.o.snap?.(), now = performance.now() / 1000;
    if (!s || this.o.paused?.()) return;
    const px = s[H.PX], pz = s[H.PZ];
    // (Bands that have gone on too long, whatever's become of them: done with.)
    for (const [id, b] of this.bands) if (now - b.t0 > ROADFOLK.life) { this.send({ op: 'end', id }); this.bands.delete(id); }
    // What's at the travellers in a fix: the nearest of the land's things to them, for them to face.
    if (this.fix && !this.fix.done) {
      const f = this.near(s, this.fix.x, this.fix.z, 30);
      if (f) this.send({ op: 'foe', id: this.fix.id, x: f[0], z: f[1] });
    }
    if (now < this.nextT) return;
    this.nextT = now + 4;
    if (this.bands.size >= ROADFOLK.out || s[H.HP] <= 0 || inDungeon(px, pz) || townDist(px, pz) < ROADFOLK.town || cityIn(px, pz) < ROADFOLK.city) return;
    if (this.o.busy?.()) return;
    if (nearestRoad(px, pz, ROADFOLK.onRoad).i < 0) return;
    if (this.walk(s)) this.nextT = now + rand(...ROADFOLK.every);
  }

  // The nearest hostile thing to (x, z) within r: [x, z], or null.
  near(s, x, z, r) {
    let best = null, bd = r;
    for (let i = 0, n = s[H.NCHARS] | 0; i < n; i++) {
      const o = CHARS_START + i * C_SIZE;
      if (s[o + C.ACTIVE] < 0.5 || s[o + C.HOSTILE] < 0.5 || s[o + C.HP] <= 0) continue;
      const d = Math.hypot(s[o + C.X] - x, s[o + C.Z] - z);
      if (d < bd) { bd = d; best = [s[o + C.X], s[o + C.Z]]; }
    }
    return best;
  }

  // Whether the ground hides (x, z) from (px, pz): the land rising over the line between, somewhere along it.
  hidden(px, py, pz, x, z) {
    const y = terrainHeight(x, z) + 1.6, eye = py + 1.6;
    for (let k = 1; k < 12; k++) {
      const t = k / 12, gx = px + (x - px) * t, gz = pz + (z - pz) * t;
      if (terrainHeight(gx, gz) > eye + (y - eye) * t + 0.3) return true;
    }
    return false;
  }

  // A band set down on the road ahead of you (behind, coming the same way), out of your sight for choice.
  walk(s) {
    const px = s[H.PX], py = s[H.PY], pz = s[H.PZ];
    const sp = Math.hypot(s[H.VX], s[H.VZ]), head = sp > 1.2 ? Math.atan2(s[H.VX], s[H.VZ]) : (this.o.yaw?.() ?? 0);
    const r = Math.random(), kind = r < ROADFOLK.toward ? 'toward' : r < ROADFOLK.toward + ROADFOLK.ahead ? 'ahead' : 'resting';
    const fx = Math.sin(head), fz = Math.cos(head);
    let spot = null;
    for (const d of kind === 'resting' ? [120, 140, 155] : [150, 160, 140, 165]) {
      const q = nearestRoad(px + fx * d, pz + fz * d, 45);
      if (q.i < 0) continue;
      const qd = Math.hypot(q.x - px, q.z - pz);
      if (qd < 95 || qd > 168) continue;
      spot = [q.x, q.z];
      if (this.hidden(px, py, pz, q.x, q.z)) break;
    }
    if (!spot) return false;
    // Where they're off to: on down the road past you (or on ahead, going your way), a few hundred metres, by the roads.
    const end = kind === 'toward' ? nearestRoad(px - fx * 300, pz - fz * 300, 120) : nearestRoad(spot[0] + fx * 380, spot[1] + fz * 380, 120);
    if (end.i < 0) return false;
    const pts = roadWay(spot[0], spot[1], end.x, end.z);
    if (pts.length < 6) return false;
    const n = Math.random() < ROADFOLK.n[0] ? 1 : Math.random() < ROADFOLK.n[1] ? 2 : 3;
    const id = `rd${++this.n}`;
    this.bands.set(id, { kind, t0: performance.now() / 1000, who: null });
    this.send({ op: 'walk', id, n, pts, rest: kind === 'resting' ? rand(...ROADFOLK.rest) : 0 });
    this.note(`${n} ${kind} at ${spot[0].toFixed(0)}, ${spot[1].toFixed(0)}`);
    return true;
  }

  // From the land (src/ui/wilds.js, the rescue meeting): kind 'start' | 'hurt' | 'fled' | 'saved' | 'gone' | 'over'.
  rescue(kind, x, z) {
    const s = this.o.snap?.();
    if (kind === 'start') {
      if (this.fix) this.send({ op: 'end', id: this.fix.id });
      const id = `rf${++this.n}`;
      this.fix = { id, x, z, who: null };
      this.send({ op: 'fix', id, n: Math.random() < 0.5 ? 2 : 3, x, z });
      this.note(`fix at ${x.toFixed(0)}, ${z.toFixed(0)}`);
      return;
    }
    const F = this.fix;
    if (!F) return;
    if (kind === 'hurt') this.send({ op: 'state', id: F.id, state: 'hurt' });
    else if (kind === 'fled') {
      // (Away from what's at them, else from you.)
      const f = s && (this.near(s, F.x, F.z, 30) || [s[H.PX], s[H.PZ]]);
      this.send({ op: 'state', id: F.id, state: 'fled', dir: f ? Math.atan2(F.x - f[0], F.z - f[1]) : Math.random() * 6.28 });
    } else if (kind === 'saved') {
      // On their way again by the road: on the way they were going, away from where you came from.
      let away = null;
      if (s) {
        const dx = F.x - s[H.PX], dz = F.z - s[H.PZ], d = Math.hypot(dx, dz) || 1;
        const end = nearestRoad(F.x + (dx / d) * 260, F.z + (dz / d) * 260, 120);
        if (end.i >= 0) away = roadWay(F.x, F.z, end.x, end.z);
      }
      this.send({ op: 'state', id: F.id, state: 'saved', away });
      this.fix = { ...F, done: true };
    } else this.send({ op: 'end', id: F.id });
    if (kind !== 'hurt' && kind !== 'saved') this.fix = null;
  }
}
