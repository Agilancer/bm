// Gilded critters, out of VELSCOUR (its src/game/critters.js): little treasures about the land, a Gilded Wisp skimming the
// grass, a Starmoth crawling with its wings spread and now and then fluttering off a few steps, a Golden Scarab scuttling
// through the turf, and now and then a Prismatic Wisp. Twenty of them are about you wherever you are out in the land; each
// stays a minute or so and then gets away (up into the sky, or down into a crack in the ground), and another turns up.
// They aren't creatures: nothing fights them, nothing walks into them, spells go through them, and they shy away from you, so
// walking up to one never catches it. Only a click on one (with the mouse held, the X on it; with it free, under the pointer;
// on a phone, a tap) catches it, while you play or while auto-play does, and auto-play leaves them to you.
//
// VELSCOUR had three about at once, each there for ten seconds and worth a good deal. Here twenty crawl about for the look of
// the land, and three of them at a time are RIPE, as VELSCOUR's three were: marked with its arrow, its ring on the ground and
// its glitter, worth a share of what a kill out here is, and there for a quarter of a minute before they get away. Another
// ripens a few seconds after. The rest are worth a little, caught. A Prismatic Wisp is ripe from the moment it comes, the
// one of it at a time, and gone again in a few seconds: the prize.
// Each pays one thing, as VELSCOUR's do: experience, or (the scarab) gold.
// This is the rules and the walking, with no page: what they look like is src/gfx/critters.js, and the wiring src/main.js.
import { terrainHeight } from './terrain.js';
import { stairDip } from './roadbed.js';
import { townDist } from './town.js';
import { inLand, siteAt, waterAt } from './lands.js';
import { STONE_CELL, BOULDER_CELL, rocksInCells, rockRadius, ROCK_FLOATS } from './rocks.js';
import { CELL as TREE_CELL, TREE_FLOATS, treesInCells, trunkRadius } from './forest.js';
import { OUTPOSTS } from './wilds-data.js';
import { PHOBOS } from './phobos-data.js';
import { CHURCH_FOOTPRINT } from './church.js';
import { SEALS } from './sites.js';

const TAU = Math.PI * 2;
const wrap = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);

// fly: 'hover' skims low over the ground, 'hop' crawls and flutters off a few steps now and then, none scuttles. w: odds.
// speed: metres a second. size: its body's radius in metres, for a click. pay.xp: ripe, so many of a kill's experience out
// here (KILL_XP); pay.gold: ripe, [base, a level of the land], in gold. color, light2: its light and its second, as in VELSCOUR.
// one: never more than one about, ripe from the start, and not by the odds: on its own clock (PRISM_EVERY).
export const CRITTERS = {
  wisp: { name: 'Gilded Wisp', color: '#ffd040', light2: '#ff9a20', fly: 'hover', w: 45, speed: 0.6, size: 0.22, pay: { xp: 0.8 } },
  moth: { name: 'Starmoth', color: '#a8c8ff', light2: '#b080ff', fly: 'hop', w: 25, speed: 0.3, size: 0.26, pay: { xp: 1 } },
  scarab: { name: 'Golden Scarab', color: '#ffb030', light2: '#40ffe8', fly: null, w: 22, speed: 0.48, size: 0.22, pay: { gold: [11, 1] } },
  prism: { name: 'Prismatic Wisp', color: '#ff80e0', light2: '#60d8ff', fly: 'hover', w: 0, speed: 0.85, size: 0.24, pay: { xp: 4 }, one: true },
};
export const CRITTER_KEYS = Object.keys(CRITTERS);

export const CRITTER_COUNT = 20;      // about you at once
export const NEAR = [6, 28];          // where one turns up: this far from you, in metres
export const IN_VIEW = 15;            // and none nearer than this where you're looking (and it comes in: down out of the sky, up out of the ground)
export const LEASH = 52;              // further off than this it fades, and another turns up nearer
export const LIFE = [45, 90];         // seconds before it gets away
export const SHY = 3.6;               // nearer you than this it turns away
export const REACH = 16;              // nearer than this to you it can be caught (a click further off is a word: get nearer)
// How far round one a click or a tap still catches it, in pixels of the screen (the owner: far ones are tiny, so be generous).
// cursor/soft: the free mouse and Alt's; aim: the crosshair; tap/stick: a thumb, [ripe, not]. body: and at least its body this
// many times over, near ones big on the screen (the crosshair's, aimBody).
export const PICK_ROOM = { cursor: 64, soft: 64, aim: 34, tap: [104, 72], stick: [64, 44], body: 2.4, aimBody: 1.8 };
export const LATE = 5;                // a ripe one's last seconds: its ring beats quicker, and it flashes
export const AWAY = { hover: 1.3, hop: 1.4, dig: 0.9 }; // how long getting away takes
export const ARRIVE = { hover: 1.7, hop: 1.3, dig: 0.9 }; // and coming: down out of the sky, fluttering in, digging up
export const AFTER_CATCH = [6, 14];   // seconds till another turns up for one caught
export const AFTER_AWAY = [1, 4];     // and for one that got away, or went out of reach
export const JUMP = 120;              // you've moved this far at a stroke (a portal, the beacon stone): all of them anew
// The ripe ones: how many at once, how long one stays ripe (a prismatic wisp, its own), how soon another ripens, how far
// off you one ripens, and what one not ripe pays, of what it would.
export const RIPE_MAX = 3;
export const RIPE_FOR = [14, 20], PRISM_FOR = [12, 15];
export const RIPEN_EVERY = [7, 13];
export const RIPE_NEAR = [9, 30];
export const UNRIPE = 0.15;
// The Prismatic Wisp: rare, as VELSCOUR's is (one in some twelve of its few, one every five minutes or so). The first a
// while after you're out among them, then a while after the last is gone; it turns up ahead of you, this far off.
export const PRISM_FIRST = [120, 200], PRISM_EVERY = [180, 300], PRISM_NEAR = [14, 24];
// A kill's experience out in the land, about, by its level (src/items/levels.js XP_OF: 14 to 45 the rank and file round
// Bellmourn, more out in the countries, src/core/tripo-monsters.js landLevel): what a ripe one's worth goes by.
export const KILL_XP = (landLv) => 18 + 3 * (Math.max(1, landLv) - 1);
// Caught one after another with no end: past so many ripe ones in so long, each pays half; and past so many not ripe in so
// long, those pay nothing.
export const TIRED = { n: 8, over: 120, k: 0.5 };
export const TIRED_UNRIPE = { n: 8, over: 60 };
// How fast it can turn, radians a second: a crawler's walk wanders gently, and it turns round no faster than this.
const TURN = { crawl: 4, hover: 3 };

// ---------------------------------------------------------------------------------------------------------- the ground
// The drawn ground, not the land's own height: round you it's a grid of square cells (src/core/ground-patches.js: 2 m on a
// PC, 4 on a phone), each cut in two along the same diagonal (src/sim/job.worker.js buildTerrain), and flat between its
// corners. A wisp hangs a little over it and doesn't care, but a scarab is fifteen centimetres high: on the land's own height
// it was half sunk in the hillside in one cell and stood on air in the next.
const corners = new Map();
const landAt = (x, z) => terrainHeight(x, z) - stairDip(x, z);
function corner(i, j, cell) {
  const k = (i + 8192) * 16384 + (j + 8192);
  let h = corners.get(k);
  if (h === undefined) {
    if (corners.size > 30000) corners.clear();
    h = landAt(i * cell, j * cell);
    corners.set(k, h);
  }
  return h;
}
let cornerCell = 2;
export function meshHeight(x, z, cell = cornerCell) {
  if (cell !== cornerCell) { corners.clear(); cornerCell = cell; }
  const fi = x / cell, fj = z / cell, i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j;
  // (a = i,j; b = i+1,j; c = i,j+1; d = i+1,j+1: the triangles a c b and b c d.)
  const hb = corner(i + 1, j, cell), hc = corner(i, j + 1, cell);
  if (u + v <= 1) { const ha = corner(i, j, cell); return ha + (hb - ha) * u + (hc - ha) * v; }
  const hd = corner(i + 1, j + 1, cell);
  return hd + (hc - hd) * (1 - u) + (hb - hd) * (1 - v);
}
// Which way is up there, smoothed over a stride (a body leans with the slope, not with each cell's facet).
export function groundUp(x, z, cell = cornerCell, out = [0, 1, 0]) {
  const e = 0.45;
  const nx = meshHeight(x - e, z, cell) - meshHeight(x + e, z, cell), nz = meshHeight(x, z - e, cell) - meshHeight(x, z + e, cell), ny = 2 * e;
  const l = 1 / Math.hypot(nx, ny, nz);
  out[0] = nx * l; out[1] = ny * l; out[2] = nz * l;
  return out;
}

// Ground a critter may be on: out in the land, off the town and its places, the outposts, the city and the church, out of the
// water, and not up a cliff. (Stones, boulders and trunks are each critter's own to steer round: Critter.blocked.)
const PHOBOS_RINGS = (PHOBOS.districts || []).map((d) => [d.x, d.z, d.r + 40]);
const F = CHURCH_FOOTPRINT, CHURCH = { x0: F.x - F.hx - 14, x1: F.x + F.hx + 40, z0: F.z - F.hz - 14, z1: F.z + F.hz + 14 };   // (and the wing over its stair)
export function openGround(x, z) {
  if (!inLand(x, z, -20)) return false;
  if (townDist(x, z) < 8) return false;
  if (siteAt(x, z, 6)) return false;
  for (const s of SEALS) if ((x - s.x) ** 2 + (z - s.z) ** 2 < 100) return false;    // (not in a seal's dais)
  if (x > CHURCH.x0 && x < CHURCH.x1 && z > CHURCH.z0 && z < CHURCH.z1) return false;
  for (const o of OUTPOSTS) if ((x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + 14) ** 2) return false;
  for (const [px, pz, pr] of PHOBOS_RINGS) if ((x - px) ** 2 + (z - pz) ** 2 < pr * pr) return false;
  const w = waterAt(x, z);
  if (w !== null && landAt(x, z) < w + 0.15) return false;
  // (No steeper than about 40 degrees: a hillside, not a crag's face.)
  const e = 0.8, s = Math.hypot(landAt(x + e, z) - landAt(x - e, z), landAt(x, z + e) - landAt(x, z - e)) / (2 * e);
  return s < 0.85;
}

const rocksNear = (x, z, reach, big) => {
  const c = big ? BOULDER_CELL : STONE_CELL;
  return rocksInCells(Math.floor((x - reach) / c), Math.ceil((x + reach) / c), Math.floor((z - reach) / c), Math.ceil((z + reach) / c), big);
};
const treesNear = (x, z, reach) => treesInCells(Math.floor((x - reach) / TREE_CELL), Math.ceil((x + reach) / TREE_CELL), Math.floor((z - reach) / TREE_CELL), Math.ceil((z + reach) / TREE_CELL));

// What stands in the way round a point: stones and boulders you'd walk into, and the pines' trunks, as [x, z, r] circles.
export function obstaclesAround(x, z, reach = 9) {
  const out = [];
  for (const big of [false, true]) {
    const r = rocksNear(x, z, reach, big);
    for (let o = 0; o < r.length; o += ROCK_FLOATS) {
      const rad = rockRadius(r[o + 3], r[o + 6], r[o + 8]);
      if (rad > 0) out.push(r[o], r[o + 2], rad);
    }
  }
  const t = treesNear(x, z, reach);
  for (let o = 0; o < t.length; o += TREE_FLOATS) out.push(t[o], t[o + 1], trunkRadius(t[o + 2], t[o + 3]) + 0.1);
  return out;
}

// Whether you can see from a to b: no rise of the ground, no trunk and no boulder in the way. (For a click: one behind a pine
// or over the brow of a hill isn't caught.) ground(x, z): the drawn ground's height. A rock stands about as high as it's wide.
export function lineClear(ax, ay, az, bx, by, bz, ground = meshHeight) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
  if (L < 0.5) return true;
  // The ground: every half metre, but the last half metre (it sits on it).
  for (let s = 0.5; s < L - 0.5; s += 0.5) {
    const k = s / L;
    if (ground(ax + dx * k, az + dz * k) > ay + (by - ay) * k + 0.03) return false;
  }
  const mx = (ax + bx) / 2, mz = (az + bz) / 2, reach = L / 2 + 3;
  // (How near the line's ground track comes to (x, z), and how high the line is there.)
  const at = (x, z) => { const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L * L))); return [Math.hypot(ax + dx * k - x, az + dz * k - z), ay + (by - ay) * k, k]; };
  const t = treesNear(mx, mz, reach);
  for (let o = 0; o < t.length; o += TREE_FLOATS) {
    const [d, , k] = at(t[o], t[o + 1]);
    if (k > 0.02 && k < 0.98 && d < trunkRadius(t[o + 2], t[o + 3])) return false;
  }
  for (const big of [false, true]) {
    const r = rocksNear(mx, mz, reach, big);
    for (let o = 0; o < r.length; o += ROCK_FLOATS) {
      const rad = rockRadius(r[o + 3], r[o + 6], r[o + 8]);
      if (rad < 0.3) continue;
      const [d, y, k] = at(r[o], r[o + 2]);
      if (k > 0.02 && k < 0.98 && d < rad * 0.85 && y < ground(r[o], r[o + 2]) + rad * 0.9) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------------------------------------- one critter
let nextId = 1;
export class Critter {
  // quiet: it was there already (you've only now come out among them): part way through its stay, and no coming.
  constructor(key, x, z, rng, quiet = false) {
    const K = CRITTERS[key];
    this.id = nextId++;
    this.key = key; this.K = K; this.rng = rng;
    this.x = x; this.z = z;
    this.a = rng() * TAU; this.da = 0; this.turn = 0; this.bump = 0;
    this.want = null;                        // a heading it's turning to (round something, away from you), or none
    this.t = quiet ? rng() * 20 : 0;         // (one that was there already is part way through its stay)
    this.life = LIFE[0] + rng() * (LIFE[1] - LIFE[0]) + (quiet ? 20 : 0);
    this.ph = rng() * TAU;
    this.state = 'live';                     // live, away (getting away), caught, fade (gone out of reach), gone
    this.born = quiet ? 1 : 0;               // 0..1 as it comes into being
    this.arrive = quiet ? 1 : 0;             // 0..1 as it comes in (down out of the sky, fluttering in, digging up)
    this.out = 0;                            // 0..1 as it goes (away, caught, faded)
    this.ripe = false;                       // marked, and worth what it's worth (CritterField.ripen)
    this.hover = K.fly === 'hover' ? 0.28 + rng() * 0.17 : 0;
    this.lift = 0;                           // how high it is over the ground (a moth in the air, a wisp going up)
    this.sink = 0;                           // a scarab digging in, or up
    this.speedNow = 0;                       // what it's going at now, metres a second (for its legs and wings)
    this.rest = 0;                           // a scarab's or a moth's still moment
    this.hop = null;                         // a moth's flight: { t, dur, h, sx, sz, ex, ez }
    this.hopIn = 3 + rng() * 6;
    this.walk = rng() * 10;                  // how far its feet have gone, in strides (src/gfx/critters.js)
    this.wings = 0;                          // a moth's wings: how fast they beat (0 still, 1 flying)
    this.block = null; this.blockAt = null;
    this.y = 0;
  }

  get alive() { return this.state === 'live'; }
  get late() { return this.state === 'live' && this.ripe && this.life - this.t < LATE; }
  get arriving() { return this.arrive < 1; }
  // (How long it takes to come and to go, by how it gets about.)
  get way() { return this.K.fly === 'hover' ? 'hover' : this.K.fly === 'hop' ? 'hop' : 'dig'; }

  /** Ripe: marked, worth its worth, and for so long only. */
  ripen() {
    const [a, b] = this.K.one ? PRISM_FOR : RIPE_FOR;
    this.ripe = true;
    this.ripeAt = this.t;
    this.life = this.t + a + this.rng() * (b - a) + (this.arriving ? ARRIVE[this.way] : 0);
  }

  /** Stones and trunks near it, looked up again when it has gone a few metres. */
  blocked(x, z) {
    if (!this.blockAt || Math.hypot(x - this.blockAt[0], z - this.blockAt[1]) > 4) { this.block = obstaclesAround(x, z); this.blockAt = [x, z]; }
    const b = this.block, me = this.K.fly === 'hover' ? 0 : this.K.size * 0.6;
    for (let o = 0; o < b.length; o += 3) if ((x - b[o]) ** 2 + (z - b[o + 1]) ** 2 < (b[o + 2] + me) ** 2) return true;
    return false;
  }

  /** A step of its life. (px, pz): where you are. Returns false once it's gone. */
  step(dt, px, pz, world) {
    const K = this.K, rng = this.rng;
    this.t += dt;
    this.born = Math.min(1, this.born + dt * 2.2);
    if (this.state === 'caught' || this.state === 'fade') { this.out = Math.min(1, this.out + dt / (this.state === 'caught' ? 0.35 : 0.5)); this.place(world); return this.out < 1; }
    if (this.state === 'live' && this.t >= this.life) { this.state = 'away'; this.out = 0; }
    if (this.state === 'away') {
      // Away it goes: a wisp up into the sky, a moth off over the trees, a scarab down into a crack in the ground.
      this.out = Math.min(1, this.out + dt / AWAY[this.way]);
      if (K.fly) { this.lift += dt * (1 + this.out * 7); this.wings = 1; const s = K.fly === 'hop' ? 2.5 : 0.8; this.x += Math.cos(this.a) * s * dt; this.z += Math.sin(this.a) * s * dt; }
      else this.sink = this.out;
      this.place(world);
      return this.out < 1;
    }
    if (this.arrive < 1) {
      // Coming: a wisp down out of the sky, a moth fluttering down onto the grass, a scarab digging up out of the ground.
      this.arrive = Math.min(1, this.arrive + dt / ARRIVE[this.way]);
      const k = this.arrive, e = 1 - (1 - k) * (1 - k);
      if (K.fly === 'hover') { this.lift = 6 * (1 - e); this.speedNow = 0.4; }
      else if (K.fly === 'hop') { this.lift = 2.6 * (1 - e) ** 1.4; this.wings = k < 0.92 ? 1 : this.wings * 0.8; this.speedNow = 0.9 * (1 - k); this.x += Math.cos(this.a) * this.speedNow * dt; this.z += Math.sin(this.a) * this.speedNow * dt; }
      else { this.sink = 1 - e; this.speedNow = 0; }
      if (k >= 1) { this.lift = 0; this.sink = 0; }
      this.place(world);
      return true;
    }
    // Wandering: gentle turns, kept within reach of you, shy of you, round what's in its way.
    const crawl = K.fly !== 'hover';
    if ((this.turn -= dt) <= 0) { this.turn = crawl ? 1.5 + rng() * 2.5 : 1 + rng() * 2; this.da = (rng() * 2 - 1) * (crawl ? 0.6 : 0.9); }
    this.bump -= dt;
    const hd = Math.hypot(px - this.x, pz - this.z);
    if (hd > LEASH * 0.7 && this.want === null) { this.want = Math.atan2(pz - this.z, px - this.x) + (rng() - 0.5) * 1.2; this.turn = 0.8; }
    else if (hd < SHY && this.bump <= 0) {
      this.want = Math.atan2(this.z - pz, this.x - px) + (rng() - 0.5) * 0.8; this.turn = 0.5; this.bump = 0.4;
      if (K.fly === 'hop' && !this.hop) this.hopIn = 0;          // (a moth takes off)
      else this.rest = 0;
    }
    // (Turning to where it wants to go, no faster than it can; turning a long way round, it all but stops to.)
    let pivot = 1;
    if (this.want !== null) {
      const d = wrap(this.want - this.a), mx = (crawl ? TURN.crawl : TURN.hover) * dt;
      if (Math.abs(d) <= mx) { this.a = this.want; this.want = null; } else this.a += Math.sign(d) * mx;
      if (crawl && Math.abs(d) > 0.8) pivot = 0.2;
    } else this.a += this.da * dt;
    let s = K.speed * pivot;
    if (K.fly === 'hop') {
      if (this.hop) {
        const h = this.hop;
        h.t += dt;
        const k = Math.min(1, h.t / h.dur);
        // (Fluttering: a little up and down, and side to side, as it goes.)
        const up = Math.sin(Math.PI * k), side = Math.sin(TAU * k * 1.5 + (h.ph || 0)) * 0.15 * up, l = Math.hypot(h.ex - h.sx, h.ez - h.sz) || 1;
        this.x = h.sx + (h.ex - h.sx) * k - (h.ez - h.sz) / l * side; this.z = h.sz + (h.ez - h.sz) * k + (h.ex - h.sx) / l * side;
        this.lift = up * h.h + Math.sin(h.t * TAU * 5) * 0.06 * up;
        this.speedNow = Math.hypot(h.ex - h.sx, h.ez - h.sz) / h.dur;
        this.wings = Math.min(1, this.wings + dt * 8);
        if (k >= 1) { this.hop = null; this.lift = 0; this.hopIn = 4 + rng() * 6; }
        this.place(world);
        return true;
      }
      this.wings = Math.max(0, this.wings - dt * 3);
      if ((this.hopIn -= dt) <= 0) {
        // Up, a few steps off, and down again. (It turns to its way in the air.)
        const d = 2 + rng() * 3.5;
        for (let i = 0; i < 6; i++) {
          const a = this.a + (i ? (rng() - 0.5) * 2.4 : 0), ex = this.x + Math.cos(a) * d, ez = this.z + Math.sin(a) * d;
          if (!world.open(ex, ez) || this.blocked(ex, ez)) continue;
          this.want = wrap(a);
          this.hop = { t: 0, dur: 1 + d * 0.3, h: 0.45 + d * 0.15 + rng() * 0.15, sx: this.x, sz: this.z, ex, ez, ph: rng() * TAU };
          break;
        }
        if (!this.hop) this.hopIn = 1;
        this.place(world);
        return true;
      }
    }
    if (crawl) {
      // A crawler stops now and then, for a moment, as a beetle does.
      if (this.rest > 0) { this.rest -= dt; s = 0; } else if (rng() < dt * 0.12) this.rest = 0.4 + rng() * 1.4;
      // (VELSCOUR's scarab scuttles in spurts.)
      if (s) s *= K.fly ? 0.7 + 0.3 * Math.abs(Math.sin(this.t * 3)) : 0.6 + 0.4 * Math.abs(Math.sin(this.t * 7));
    }
    const nx = this.x + Math.cos(this.a) * s * dt, nz = this.z + Math.sin(this.a) * s * dt;
    if (!s) this.speedNow = 0;
    else if (world.open(nx, nz) && !this.blocked(nx, nz)) { this.x = nx; this.z = nz; this.speedNow = s; }
    else {
      // Something in the way: it turns round, on the spot, and goes on.
      if (this.want === null) this.want = wrap(this.a + Math.PI * (0.6 + rng() * 0.8) * (rng() < 0.5 ? 1 : -1));
      this.turn = 0.6; this.bump = 0.5; this.speedNow = 0;
    }
    this.place(world);
    return true;
  }

  /** Its height: on the drawn ground, a wisp over it, bobbing. */
  place(world) {
    const g = world.ground(this.x, this.z);
    if (this.K.fly === 'hover') this.y = g + this.hover * (0.25 + 0.75 * this.born) + 0.05 * Math.sin(this.t * 2.1 + this.ph) + this.lift;
    else this.y = g + this.lift;
    this.groundY = g;
  }

  /** Where to click: its body's middle. */
  middle() {
    const K = this.K;
    return [this.x, this.y + (K.fly === 'hover' ? 0 : K.fly === 'hop' ? 0.06 : 0.07), this.z];
  }
}

// ---------------------------------------------------------------------------------------------------------- all of them
export class CritterField {
  // o: { rng, open(x, z), ground(x, z) }: what's open ground, and the drawn ground's height (both have defaults).
  // onRipe(c), onSpawn(c): said of each as it ripens, and as it comes (not those there already).
  constructor(o = {}) {
    this.rng = o.rng || Math.random;
    this.world = { open: o.open || openGround, ground: o.ground || ((x, z) => meshHeight(x, z)) };
    this.list = [];
    this.owed = [];          // seconds till each of the ones still to turn up does
    this.last = null;        // where you were
    this.caught = 0;
    this.quiet = 0;          // tries left at the first quiet twenty
    this.ripeIn = 2;         // seconds till the next ripens
    this.clock = 0;
    this.recent = [];        // when the last ripe ones were caught (TIRED)
    this.recentUnripe = [];  // and the last not ripe (TIRED_UNRIPE)
    this.prismIn = PRISM_FIRST[0] + this.rng() * (PRISM_FIRST[1] - PRISM_FIRST[0]); // seconds till a Prismatic Wisp
  }

  weighted() {
    const rng = this.rng, one = this.list.some((c) => c.K.one && c.state !== 'gone');
    for (let tries = 0; tries < 8; tries++) {
      let r = rng() * CRITTER_KEYS.reduce((a, k) => a + CRITTERS[k].w, 0), key = 'wisp';
      for (const k of CRITTER_KEYS) if ((r -= CRITTERS[k].w) <= 0) { key = k; break; }
      if (!(one && CRITTERS[key].one)) return key;
    }
    return 'wisp';
  }

  get ripeCount() { let n = 0; for (const c of this.list) if (c.ripe && c.alive && !c.K.one) n++; return n; }

  /** Somewhere open, NEAR from (px, pz), more often in front of you than not ((fx, fz): the way you look), but where you're
   *  looking no nearer than IN_VIEW: one comes into being out of your sight, or far enough off not to pop up at your feet. */
  spot(px, pz, fx = 0, fz = 0, quiet = false, near = null) {
    const rng = this.rng, look = Math.hypot(fx, fz) > 0.1, ahead = near ? look : look && rng() < 0.6, fa = Math.atan2(fz, fx);
    // (Those there already, as you come out among them, keep out of your face as much as those that come later.)
    const [n0, n1] = near || NEAR;
    for (let i = 0; i < 24; i++) {
      const a = ahead ? fa + (rng() - 0.5) * (near ? 0.9 : 1.4) : rng() * TAU, lo = ahead ? Math.max(n0, IN_VIEW) : n0;
      const r = lo + Math.sqrt(rng()) * (Math.max(lo + 1, n1) - lo);
      if (look && r < IN_VIEW && Math.abs(wrap(a - fa)) < 0.95) continue;
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      if (!this.world.open(x, z)) continue;
      // (Not on another's back.)
      if (this.list.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < 9)) continue;
      return [x, z];
    }
    return null;
  }

  add(px, pz, fx, fz, quiet = false, key = null, near = null) {
    const at = this.spot(px, pz, fx, fz, quiet, near);
    if (!at) return null;
    const c = new Critter(key || this.weighted(), at[0], at[1], this.rng, quiet);
    if (c.blocked(c.x, c.z)) return null;
    // (A wisp coming down out of the sky comes to this spot; a moth flutters in to it.)
    c.place(this.world);
    this.list.push(c);
    if (c.K.one) { c.ripen(); this.onRipe?.(c); }
    if (this.onSpawn && !quiet) this.onSpawn(c);
    return c;
  }

  /** The next to ripen: one about, a fair way off you but not too far, and more likely the way you're looking. */
  ripen(px, pz, fx, fz) {
    let best = null, bs = -Infinity;
    const fa = Math.atan2(fz, fx), look = Math.hypot(fx, fz) > 0.1;
    for (const c of this.list) {
      if (!c.alive || c.ripe || c.arriving || c.K.one) continue;
      const d = Math.hypot(c.x - px, c.z - pz);
      if (d < RIPE_NEAR[0] || d > RIPE_NEAR[1]) continue;
      // (It must be there long enough to be worth going to.)
      if (c.life - c.t < RIPE_FOR[0] + 2) continue;
      const s = this.rng() + (look && Math.abs(wrap(Math.atan2(c.z - pz, c.x - px) - fa)) < 0.9 ? 0.8 : 0);
      if (s > bs) { bs = s; best = c; }
    }
    if (best) { best.ripen(); this.onRipe?.(best); }
    return best;
  }

  /** A frame. here: { x, z, fx, fz } (you, and the way you look), or null where they can't be (the opening, down a delve,
   *  the Test Dungeon): there none turn up, and those far off go. */
  step(dt, here) {
    const rng = this.rng;
    this.clock += dt;
    // Moved a long way at a stroke: everyone anew, already there.
    if (here && this.last && Math.hypot(here.x - this.last[0], here.z - this.last[1]) > JUMP) {
      // (A Prismatic Wisp left behind: the next one's as far off as if it had gone.)
      if (this.list.some((c) => c.K.one)) this.prismIn = PRISM_EVERY[0] + rng() * (PRISM_EVERY[1] - PRISM_EVERY[0]);
      this.list.length = 0; this.owed.length = 0; this.filled = false;
    }
    if (here) this.last = [here.x, here.z];
    const px = here ? here.x : this.last ? this.last[0] : 0, pz = here ? here.z : this.last ? this.last[1] : 0;
    // Those already there, the first time you're out among them: twenty, quietly. (A few a frame: finding open ground for
    // twenty at once is a frame's work and more: two a frame.)
    if (here && !this.filled) { this.filled = true; this.quiet = CRITTER_COUNT * 3; this.ripeIn = 1.5; }
    if (here && this.quiet > 0) {
      for (let k = 0; k < 2 && this.quiet > 0 && this.list.length < CRITTER_COUNT; k++) { this.quiet--; this.add(px, pz, here.fx, here.fz, true); }
      if (this.list.length >= CRITTER_COUNT) this.quiet = 0;
      if (!this.quiet) this.owed = Array.from({ length: CRITTER_COUNT - this.list.length }, () => 1 + rng() * 6);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      // (Gone out of reach behind you: it fades, and another turns up nearer.)
      if (Math.hypot(c.x - px, c.z - pz) > LEASH && (c.state === 'live' || c.state === 'away')) { c.state = 'fade'; c.out = 0; }
      if (!c.step(dt, px, pz, this.world)) {
        c.state = c.state === 'caught' ? 'caught' : 'gone';
        this.list.splice(i, 1);
        // (A Prismatic Wisp gone, caught or not: the next one's a long while off.)
        if (c.K.one) this.prismIn = PRISM_EVERY[0] + rng() * (PRISM_EVERY[1] - PRISM_EVERY[0]);
        const [a, b] = c.state === 'caught' ? AFTER_CATCH : AFTER_AWAY;
        this.owed.push(a + rng() * (b - a));
      }
    }
    if (!here || this.quiet > 0) return;
    // A Prismatic Wisp, when its time's come: in the place of the next one owed, ahead of you.
    if (!this.list.some((c) => c.K.one) && (this.prismIn -= dt) <= 0 && this.list.length < CRITTER_COUNT) {
      if (this.add(px, pz, here.fx, here.fz, false, 'prism', PRISM_NEAR)) this.owed.pop();
      else this.prismIn = 1;
    }
    for (let i = this.owed.length - 1; i >= 0; i--) {
      if ((this.owed[i] -= dt) > 0) continue;
      if (this.list.length >= CRITTER_COUNT || this.add(px, pz, here.fx, here.fz)) this.owed.splice(i, 1);
      else this.owed[i] = 0.5;
    }
    while (this.list.length + this.owed.length < CRITTER_COUNT) this.owed.push(AFTER_AWAY[0] + rng() * (AFTER_AWAY[1] - AFTER_AWAY[0]));
    // Ripening: three at a time, another a few seconds after one goes.
    if ((this.ripeIn -= dt) <= 0) {
      this.ripeIn = this.ripeCount >= RIPE_MAX ? 0.5 : (this.ripen(px, pz, here.fx, here.fz) ? RIPEN_EVERY[0] + rng() * (RIPEN_EVERY[1] - RIPEN_EVERY[0]) : 1);
    }
  }

  /** The critter under a point on the screen, or null. toScreen(x, y, z) -> [sx, sy, pixels a metre] or null (behind you).
   *  reach: how far off the point counts, in pixels, or reach(c) (more on a phone; with the X its body, or 10). seen(c): nothing in
   *  the way. */
  pick(toScreen, sx, sy, reach, seen = null, body = 1.35) {
    let best = null, bs = Infinity;
    for (const c of this.list) {
      if (!c.alive || c.born < 0.3 || c.lift > 2) continue;
      const m = c.middle(), p = toScreen(m[0], m[1], m[2]);
      if (!p) continue;
      const d = Math.hypot(p[0] - sx, p[1] - sy), room = Math.max(typeof reach === 'function' ? reach(c) : reach, Math.max(c.K.size, body > 1.2 ? c.seenR || 0 : 0) * p[2] * body);
      if (d > room || d / room >= bs) continue;
      if (seen && !seen(c)) continue;
      best = c; bs = d / room;
    }
    return best;
  }

  /** What one's worth to you, out in land of level landLv: ripe, its worth; not, a little. k: tired, half. */
  static pay(c, landLv, rng = Math.random, k = 1) {
    const p = c.K.pay, f = (c.ripe ? 1 : UNRIPE) * k;
    if (p.gold) return { gold: Math.max(1, Math.round((p.gold[0] + p.gold[1] * landLv) * f * (0.85 + rng() * 0.3))) };
    return { xp: Math.max(1, Math.round(KILL_XP(landLv) * p.xp * f * (0.9 + rng() * 0.2))) };
  }

  /** Caught: it goes, and what it was worth (and whether it was ripe, and whether you've caught so many it paid half). */
  take(c, landLv) {
    if (!c || !c.alive) return null;
    c.state = 'caught'; c.out = 0;
    this.caught++;
    const now = this.clock;
    this.recent = this.recent.filter((t) => now - t < TIRED.over);
    this.recentUnripe = this.recentUnripe.filter((t) => now - t < TIRED_UNRIPE.over);
    const tired = c.ripe ? this.recent.length >= TIRED.n : this.recentUnripe.length >= TIRED_UNRIPE.n;
    (c.ripe ? this.recent : this.recentUnripe).push(now);
    // (Not ripe, and so many of late: nothing.)
    if (tired && !c.ripe) return { xp: 0, ripe: false, tired, none: true };
    return { ...CritterField.pay(c, landLv, this.rng, tired ? TIRED.k : 1), ripe: c.ripe, tired };
  }
}
