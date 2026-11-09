// What's on the ground, where it fell. This is the render thread's: the sim only says something died, and what's taken up
// goes to the pack. Everything hangs in the air, a small copy of the thing itself, slowly turning and glowing the colour of its rarity.
import { groundAt as terrainHeight } from '../core/interior.js';
import { GEMS, MATS, RARITIES, hands, makeRng, rollLoot, setFind } from './items.js';
import { inChurch } from '../core/church.js';

const MAX = 64;
const GRAB = 1.9;   // coins and orbs come to you, for walking near them: there's no stopping in a fight
const REACH = 1.8;
const FALL = 0.55;
const TIP = { 1: 0.5, 2: 0.7, 3: -0.5 };   // how far along its length a sword's middle is from its fist. (A staff's fist is above its middle.)
const HOVER = 0.62;                        // the height of a thing's middle over the ground
const SPIN = 0.9;                          // radians a second
const BOB = 0.035;
const SCALE = { weapon: 0.5, shield: 0.55, armor: 0.72, robe: 0.8, skull: 1.5 };  // of the model. A suit's piece comes half a metre long: tools/gear/atlas.py
const BOARD_LIFT = 0.09;                   // a ridden shield's face stands this far off its grip

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

// What the dead leave to be made into something (items.js MATS): far more of it down in the catacombs, where they were
// buried in it, than out in the fields. kind as rollLoot has it: 5 the dead, 6 an ogre, 7 a caster, 8 a champion.
const MAT_ODDS = {
  deep: { 5: [['bone', 0.65, 1, 2], ['silk', 0.35, 1, 1], ['iron', 0.3, 1, 1], ['wax', 0.12, 1, 1], ['ember', 0.015, 1, 1]],
    6: [['bone', 1, 2, 3], ['iron', 0.6, 1, 2], ['ember', 0.15, 1, 1]],
    7: [['wax', 0.55, 1, 2], ['bone', 0.4, 1, 1], ['silk', 0.3, 1, 1], ['ember', 0.1, 1, 1]],
    8: [['bone', 1, 2, 2], ['iron', 0.7, 1, 2], ['silk', 0.4, 1, 2], ['ember', 0.35, 1, 1]] },
  out: { 5: [['bone', 0.3, 1, 1], ['iron', 0.08, 1, 1], ['ember', 0.005, 1, 1]],
    6: [['bone', 1, 1, 2], ['iron', 0.4, 1, 1], ['ember', 0.08, 1, 1]],
    7: [['wax', 0.35, 1, 1], ['bone', 0.3, 1, 1], ['ember', 0.05, 1, 1]],
    8: [['bone', 0.8, 1, 2], ['iron', 0.4, 1, 1], ['ember', 0.25, 1, 1]],
    0: [['iron', 1, 2, 3], ['ember', 1, 1, 1]], 3: [['bone', 1, 3, 4], ['ember', 1, 2, 2]], 4: [['bone', 1, 3, 4], ['ember', 1, 1, 2]] },
};
export function matsOf(rng, kind, deep) {
  const out = [];
  for (const [k, p, lo, hi] of (deep ? MAT_ODDS.deep[kind] : null) || MAT_ODDS.out[kind] || []) if (rng() < p) out.push({ type: 'mat', kind: k, n: lo + Math.floor(rng() * (hi - lo + 1)), rarity: 0 });
  return out;
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
    else if (item.type === 'orb') { d.gem = item.kind === 'life' ? GEMS.ruby.color : (GEMS.sapphire || GEMS.ruby).color; d.auto = true; }
    else if (item.type === 'spell') d.gem = (GEMS.amethyst || GEMS.ruby).color;
    else if (item.type === 'gold') { d.coins = true; d.auto = true; }
    else if (item.type === 'mat') { d.stuff = item.kind; d.gem = MATS[item.kind].color; d.auto = true; }
    else {
      d.sword = item.base;
      d.glow = RARITIES[item.rarity].color;
      d.scale = SCALE[item.type];
      d.center = item.type === 'weapon' ? TIP[hands(item.base)] * d.scale : 0;
    }
    this.pose(d);
    this.list.push(d);
    return d;
  }

  // A death's worth, scattered about where it fell.
  fromKill(x, y, z, kind) {
    // The deeper and further out, the better it runs.
    setFind(y < -2 ? 2.4 : Math.hypot(x, z) > 150 ? 1.6 : 1);
    const orbs = [];
    if ((kind | 0) >= 2 && Math.random() < (this.low ? 0.45 : 0.2)) orbs.push({ type: 'orb', kind: 'life', rarity: 0 });
    if ((kind | 0) >= 2 && Math.random() < 0.1) orbs.push({ type: 'orb', kind: 'mana', rarity: 0 });
    for (const item of [...rollLoot(this.rng, kind | 0), ...orbs, ...matsOf(this.rng, kind | 0, y < -6 && inChurch(x, y + 1, z))]) {
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
    // Upright, turning about its middle, which rises and falls a little.
    const S = d.scale, c = Math.cos(d.spin), sn = Math.sin(d.spin);
    const rest = d.y + HOVER + Math.sin(d.spin * 1.7) * BOB;
    const px = d.from[0] + (d.x - d.from[0]) * k, pz = d.from[2] + (d.z - d.from[2]) * k;
    const py = d.from[1] + (rest - d.from[1]) * k + arc - d.center;
    m.set([c * S, 0, -sn * S, 0, 0, S, 0, 0, sn * S, 0, c * S, 0, px, py, pz, 1]);
  }

  // Moves what's still falling and glints what's down. Returns the nearest within reach of the player, or null.
  update(dt, px, py, pz) {
    let best = null, bestD = REACH;
    for (const d of this.list) {
      if (d.t < 1) {
        d.t += dt / FALL;
        if (d.t >= 1) {
          if (d.coins) this.audio.play('coinLand', d.x, d.y, d.z, 0.5);
          else if (d.gem) this.audio.play('gemLand', d.x, d.y, d.z, 0.3, 1.1);
          else this.audio.play('land', d.x, d.y, d.z, 0.5, 1.7);
          this.renderer.emit(3, 4, d.x, d.y + 0.05, d.z, 0, 0.5, 0, 1, 0.15, 0.5, 0.04, 0.09, 0.4, 0.8);
        }
        d.spin += dt * 2.5;
        this.pose(d);
      } else {
        d.spin += dt * (d.gem ? 1.3 : SPIN);
        this.pose(d);
        const dist = Math.hypot(d.x - px, d.z - pz);
        if (d.auto) { if (dist < GRAB && Math.abs(d.y - py) < 2.5) (this.grabbed ||= []).push(d); continue; }
        if (dist < bestD && Math.abs(d.y - py) < 2.5) { bestD = dist; best = d; }
      }
      // The rarer it is, the more often it catches the light.
      d.glintT -= dt;
      if (d.glintT <= 0 && d.t >= 1) {
        const rank = d.item.rarity ?? 1;
        d.glintT = 1.7 - rank * 0.35 + Math.random() * 0.6;
        this.renderer.emit(2, 1 + rank, d.x, d.y + (d.gem ? 0.34 : HOVER), d.z, 0, 1, 0, 1.8, 0.1, 0.5, 0.004, 0.008, 0.15, 0.35);
      }
    }
    if (this.grabbed?.length) { for (const d of this.grabbed) { this.onGrab?.(d); this.take(d); } this.grabbed.length = 0; }
    return best;
  }

  take(d) {
    this.list.splice(this.list.indexOf(d), 1);
    // What it is, by its sound: coin, a life or mana orb, a scroll, a gem or a stone, a robe, a skull, a staff or a shield.
    const t = d.item.type;
    const bank = d.coins ? 'coin' : t === 'orb' ? 'orb' : t === 'spell' ? 'scroll' : d.gem ? 'gem' : t === 'robe' ? 'takeRobe' : t === 'skull' ? 'takeThing' : 'takeGear';
    this.audio.play(bank, null, 0, 0, d.coins ? 0.45 : t === 'orb' ? 0.5 : d.gem ? 0.4 : 0.7, t === 'orb' && d.item.kind === 'mana' ? 1.15 : 1, false);
  }
}
