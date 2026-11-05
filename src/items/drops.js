// What's lying on the ground, where it fell. This is the render thread's: the sim only says something died, and what's taken up
// goes to the pack. A sword on the ground is the same model as the sword in the hand, at the size the knights carry theirs.
import { groundAt as terrainHeight } from '../core/interior.js';
import { GEMS, hands, makeRng, rollLoot } from './items.js';

const MAX = 32;
const REACH = 1.8;
const FALL = 0.55;
const WORLD_SCALE = { 1: 1.5, 2: 1.3, 3: 1.15 };
const TIP = { 1: 0.6, 2: 1, 3: -0.58 };   // (A staff's fist is above its middle.)
const LIFT = 0.1;                          // a little proud of the ground, for the grass
const KITE_LIFT = 0.07, BOARD_LIFT = 0.09; // a shield's back and face stand this far off its grip

function groundNormal(x, z) {
  const e = 0.3;
  const nx = terrainHeight(x - e, z) - terrainHeight(x + e, z), nz = terrainHeight(x, z - e) - terrainHeight(x, z + e), ny = 2 * e;
  const l = 1 / Math.hypot(nx, ny, nz);
  return [nx * l, ny * l, nz * l];
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// The shield being ridden: on the ground's slope, face down, its point the way it's going. (hx, hz): a unit heading.
export function boardPose(m, x, y, z, hx, hz, grounded) {
  const n = grounded ? groundNormal(x, z) : [0, 1, 0];
  const along = hx * n[0] + hz * n[2];
  const f = [hx - n[0] * along, -n[1] * along, hz - n[2] * along], l = 1 / Math.hypot(f[0], f[1], f[2]);
  const Y = [-f[0] * l, -f[1] * l, -f[2] * l], X = cross(Y, n);
  m.set([...X, 0, ...Y, 0, ...n, 0, x, y + BOARD_LIFT, z, 1]);
}

export class Drops {
  constructor(renderer, audio) {
    this.renderer = renderer;
    this.audio = audio;
    this.list = [];
    renderer.ground = this.list;
    this.rng = makeRng((Math.random() * 4294967296) >>> 0);
  }

  clear() { this.list.length = 0; }

  // from: where it starts, in the air. It comes to rest at (x, z), about its middle.
  spawn(item, x, z, from) {
    if (this.list.length >= MAX) this.list.shift();
    const gem = item.type === 'gem';
    const d = {
      item, x, z, y: terrainHeight(x, z, from?.[1]), from, t: 0, glintT: Math.random(), spin: Math.random() * 6.28, mat: new Float32Array(16),
      n: groundNormal(x, z), turn: 2.5 + Math.random() * 2.5,
    };
    if (gem) d.gem = GEMS[item.kind].color;
    else if (item.type === 'gold') d.coins = true;
    else { d.sword = item.base; d.kite = item.type === 'shield'; }
    this.pose(d);
    this.list.push(d);
    return d;
  }

  // A death's worth, scattered about where it fell.
  fromKill(x, y, z, kind) {
    for (const item of rollLoot(this.rng, kind | 0)) {
      const a = Math.random() * 6.28, r = 0.7 + Math.random() * 0.8;
      this.spawn(item, x + Math.cos(a) * r, z + Math.sin(a) * r, [x, y + 1.1, z]);
    }
  }

  // Let go of by the player, a pace ahead.
  fromPlayer(item, x, y, z, yaw) {
    const a = yaw + (Math.random() - 0.5) * 0.7, r = 1 + Math.random() * 0.3;
    this.spawn(item, x + Math.sin(a) * r, z + Math.cos(a) * r, [x, y + 1.2, z]);
  }

  pose(d) {
    const m = d.mat;
    const k = Math.min(d.t, 1);
    const arc = Math.sin(k * Math.PI) * 0.7;
    if (d.coins) {
      const c = Math.cos(d.spin), s = Math.sin(d.spin);
      m.set([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, d.from[0] + (d.x - d.from[0]) * k, d.from[1] + (d.y + 0.01 - d.from[1]) * k + arc, d.from[2] + (d.z - d.from[2]) * k, 1]);
      return;
    }
    if (d.gem) {
      // Hangs at knee height, turning, to catch the eye in the grass.
      const px = d.from[0] + (d.x - d.from[0]) * k, pz = d.from[2] + (d.z - d.from[2]) * k;
      const rest = d.y + 0.34 + Math.sin(d.spin * 1.7) * 0.025;
      const py = d.from[1] + (rest - d.from[1]) * k + arc;
      const c = Math.cos(d.spin), s = Math.sin(d.spin);
      m.set([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, px, py, pz, 1]);
      return;
    }
    if (d.kite) {
      // On its back, face up.
      const a = [Math.sin(d.spin), 0, Math.cos(d.spin)], along = a[0] * d.n[0] + a[2] * d.n[2];
      const t = [a[0] - d.n[0] * along, -d.n[1] * along, a[2] - d.n[2] * along], tl = 1 / Math.hypot(t[0], t[1], t[2]);
      t[0] *= tl; t[1] *= tl; t[2] *= tl;
      const Z = [-d.n[0], -d.n[1], -d.n[2]], X = cross(t, Z);
      m.set([...X, 0, ...t, 0, ...Z, 0, d.from[0] + (d.x - d.from[0]) * k, d.from[1] + (d.y + KITE_LIFT - d.from[1]) * k + arc, d.from[2] + (d.z - d.from[2]) * k, 1]);
      return;
    }
    const n2 = hands(d.sword);
    const S = WORLD_SCALE[n2];
    // Flat on its side, front up, the blade lying whichever way it lands; turning end over end until then.
    const dir = [Math.sin(d.spin), 0, Math.cos(d.spin)];
    const along = dir[0] * d.n[0] + dir[2] * d.n[2];
    const t = [dir[0] - d.n[0] * along, -d.n[1] * along, dir[2] - d.n[2] * along];
    const tl = 1 / Math.hypot(t[0], t[1], t[2]);
    t[0] *= tl; t[1] *= tl; t[2] *= tl;
    const roll = (1 - k) * d.turn, c = Math.cos(roll), s = Math.sin(roll);
    const side = cross(t, d.n);
    const X = [d.n[0] * c + side[0] * s, d.n[1] * c + side[1] * s, d.n[2] * c + side[2] * s];
    const Z = cross(X, t);
    const half = TIP[n2] * 0.42 * S;
    const px = d.from[0] + (d.x - d.from[0]) * k - t[0] * half;
    const pz = d.from[2] + (d.z - d.from[2]) * k - t[2] * half;
    const py = d.from[1] + (d.y + LIFT - d.from[1]) * k + arc - t[1] * half;
    m.set([X[0] * S, X[1] * S, X[2] * S, 0, t[0] * S, t[1] * S, t[2] * S, 0, Z[0] * S, Z[1] * S, Z[2] * S, 0, px, py, pz, 1]);
  }

  // Moves what's still falling and glints what's down. Returns the nearest within reach of the player, or null.
  update(dt, px, py, pz) {
    let best = null, bestD = REACH;
    for (const d of this.list) {
      if (d.t < 1) {
        d.t += dt / FALL;
        if (d.t >= 1) {
          this.audio.play('land', d.x, d.y, d.z, d.gem ? 0.25 : 0.5, d.gem ? 2.2 : 1.7);
          this.renderer.emit(3, 4, d.x, d.y + 0.05, d.z, 0, 0.5, 0, 1, 0.15, 0.5, 0.04, 0.09, 0.4, 0.8);
        }
        this.pose(d);
      } else {
        if (d.gem) { d.spin += dt * 1.3; this.pose(d); }
        const dist = Math.hypot(d.x - px, d.z - pz);
        if (dist < bestD && Math.abs(d.y - py) < 2.5) { bestD = dist; best = d; }
      }
      // The rarer it is, the more often it catches the light.
      d.glintT -= dt;
      if (d.glintT <= 0 && d.t >= 1) {
        const rank = d.item.rarity ?? 1;
        d.glintT = 1.7 - rank * 0.35 + Math.random() * 0.6;
        this.renderer.emit(2, 1 + rank, d.x, d.y + (d.gem ? 0.34 : LIFT + 0.06), d.z, 0, 1, 0, 1.8, 0.1, 0.5, 0.004, 0.008, 0.15, 0.35);
      }
    }
    return best;
  }

  take(d) {
    this.list.splice(this.list.indexOf(d), 1);
    this.audio.play('draw', null, 0, 0, d.gem || d.coins ? 0.4 : 0.8, d.coins ? 1.9 : d.gem ? 1.6 : 1.15, false);
  }
}
