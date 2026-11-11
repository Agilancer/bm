// What stands out in the countries (src/core/lands.js): built here as plain geometry in the town's own paintings (the static
// texture array, assets/game/tex), with a collider for everything you'd walk into. The render thread draws it with the village
// (Renderer.buildStatics); the sim's World takes the colliders. Every place keeps its intent from the first Bellmourn
// (Agilancer/Bellmourn src/fps), its shapes are new.
//
// Layers: a texture's name, or a flat material (lake, falls, ice, seal, iron, flame, fruit), or a tinted copy of a painting:
// 'dark:stone' is Velscour's black stone, 'pale:stone' bleached limestone and bone, 'frost:stone' rimed (materials.js STATIC).
//
// The two letters: the keep, the obelisks and the bone field are Velscour's and carry his red; the bell tower, the abbey, the
// chapel and the frozen shrine are Tessariel's and carry his T. tools/lands/check.mjs keeps them 1.5 km apart.

import { portalFloor, terrainHeight } from './terrain.js';
import { BARROWS, CLIFF, MOUNT, POOL, SITES, WATERS, waterLevel } from './lands.js';
import { hash2, vnoise } from './terrain-noise.js';
import { DELVES, PORTAL_PAD, caveFloorY } from './dungeon.js';
import { buildDelves } from './delve-build.js';
import { buildHall } from './testhall.js';
import { PIECES, cinderford, lesser, thornwick } from './places.js';

const TAU = Math.PI * 2;
// World metres to one repeat of each kind of painting, across and up.
const TILE = { wall: [7, 4.2], roof: [4, 2.3], stone: [3, 1.7], rubble: [3, 1.7], wood: [2.4, 1.4], door: [1.8, 2.6], cloth: [2, 2] };
const tileOf = (layer) => {
  const n = layer.replace(/^(dark|pale|frost):/, '');
  return n.startsWith('wall') || n === 'door_wall' ? TILE.wall : n.startsWith('roof') ? TILE.roof : n.startsWith('door') ? TILE.door : TILE[n] || TILE.cloth;
};

class Kit {
  constructor() { this.parts = new Map(); this.colliders = []; this.spots = {}; this.floors = []; }

  part(layer) {
    let p = this.parts.get(layer);
    if (!p) { p = { pos: [], nrm: [], uv: [], idx: [] }; this.parts.set(layer, p); }
    return p;
  }

  // A flat four-cornered face, a b c d going round; uv by the painting's own scale, from the face's own across and up.
  quad(layer, a, b, c, d, nrm = null, uvs = null) {
    const p = this.part(layer), base = p.pos.length / 3;
    if (!nrm) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      nrm = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const l = Math.hypot(...nrm) || 1; nrm = nrm.map((v) => v / l);
    }
    if (!uvs) {
      const [tw, th] = tileOf(layer);
      const w = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), h = Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
      // (Horizontal faces take world x and z, so floors and tops run on across their joins.)
      if (Math.abs(nrm[1]) > 0.9) uvs = [a, b, c, d].map((q) => [q[0] / tw, q[2] / tw]);
      else { const u0 = (a[0] + a[2]) / tw * 0.37; uvs = [[u0, a[1] / -th], [u0 + w / tw, b[1] / -th], [u0 + w / tw, (b[1] + h) / -th], [u0, (a[1] + h) / -th]]; }
    }
    for (const q of [a, b, c, d]) p.pos.push(q[0], q[1], q[2]);
    for (let k = 0; k < 4; k++) p.nrm.push(nrm[0], nrm[1], nrm[2]);
    for (const t of uvs) p.uv.push(t[0], t[1]);
    p.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  tri(layer, a, b, c) {
    const p = this.part(layer), base = p.pos.length / 3;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const l = Math.hypot(...n) || 1; n = n.map((v) => v / l);
    const [tw, th] = tileOf(layer);
    for (const q of [a, b, c]) { p.pos.push(...q); p.nrm.push(...n); p.uv.push((q[0] + q[2]) / tw * 0.7, q[1] / -th); }
    p.idx.push(base, base + 1, base + 2);
  }

  // A box, its foot at y, turned by yaw about its middle. top: false leaves the lid off. collide: a collider for it.
  box(layer, x, y, z, hx, h, hz, yaw = 0, o = {}) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
    const sideL = o.side || layer, topL = o.top === false ? null : o.top || layer;
    const corners = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
      this.quad(sideL, P(ax, 0, az), P(bx, 0, bz), P(bx, h, bz), P(ax, h, az));
    }
    if (topL) this.quad(topL, P(-hx, h, -hz), P(-hx, h, hz), P(hx, h, hz), P(hx, h, -hz), [0, 1, 0]);
    if (o.collide !== false) this.collide(x, z, hx, hz, yaw, y + h, o.under);
  }

  // A collider: a box on the ground to height top (world y). (World.resolve takes h over the land at its middle.)
  collide(x, z, hx, hz, yaw, top, under = 0) {
    const h = top - terrainHeight(x, z) + under;
    if (h > 0.05) this.colliders.push({ x, z, hx, hz, yaw, h });
  }

  // A pitched roof over a w by d plan, ridge along its length (x before the turn), eaves at y, rising rise; gable ends in wall.
  gable(roof, wall, x, y, z, hx, hz, rise, yaw = 0, over = 0.5) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
    const ex = hx + over, ez = hz + over;
    this.quad(roof, P(-ex, -0.25, -ez), P(ex, -0.25, -ez), P(ex, rise, 0), P(-ex, rise, 0));
    this.quad(roof, P(ex, -0.25, ez), P(-ex, -0.25, ez), P(-ex, rise, 0), P(ex, rise, 0));
    this.tri(wall, P(-hx, 0, -hz), P(-hx, 0, hz), P(-hx, rise * (hz / ez), 0));
    this.tri(wall, P(hx, 0, hz), P(hx, 0, -hz), P(hx, rise * (hz / ez), 0));
  }

  // A house: walls of wall to height h, a gabled roof, a door on its front (+z before the turn). Its floor is the land's at
  // its middle; where the land falls away under it, it stands on a footing of rubble, with a step at the door.
  house(x, z, hx, hz, h, yaw, wall, roof, o = {}) {
    const y = (o.y ?? terrainHeight(x, z)) - 0.3;
    const c = Math.cos(yaw), s = Math.sin(yaw), dx = o.doorAt ?? 0;
    let lo = y;
    for (const [lx, lz] of [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]) lo = Math.min(lo, terrainHeight(x + lx * c + lz * s, z - lx * s + lz * c) - 0.3);
    if (lo < y - 0.2) this.box(o.foot || 'rubble', x, lo - 0.3, z, hx + 0.12, y - lo + 0.5, hz + 0.12, yaw, { collide: false });
    this.box(wall, x, y, z, hx, h + 0.3, hz, yaw, { top: false });
    this.gable(roof, wall, x, y + h + 0.3, z, hx, hz, o.rise ?? Math.min(hx, hz) * 0.85, yaw);
    const d = [x + dx * c + (hz + 0.03) * s, z - dx * s + (hz + 0.03) * c];
    this.quad(o.door || 'door_1', [d[0] - 0.8 * c, y + 0.3, d[1] + 0.8 * s], [d[0] + 0.8 * c, y + 0.3, d[1] - 0.8 * s], [d[0] + 0.8 * c, y + 2.6, d[1] - 0.8 * s], [d[0] - 0.8 * c, y + 2.6, d[1] + 0.8 * s], [s, 0, c], [[0, 1], [1, 1], [1, 0], [0, 0]]);
    const gd = terrainHeight(d[0] + 0.6 * s, d[1] + 0.6 * c);
    if (gd < y) this.box('stone', d[0] + 0.5 * s, gd - 0.4, d[1] + 0.5 * c, 1.0, y + 0.3 - gd + 0.4 - 0.12, 0.5, yaw, { collide: false });
    if (o.chimney) this.box('stone', x + o.chimney * c, y + h, z - o.chimney * s, 0.6, Math.min(hx, hz) + 1.4, 0.6, yaw, { collide: false });
    if (o.lamp) this.wallLamp(d[0] + (o.lamp * 1.25) * c, y + 2.6, d[1] - (o.lamp * 1.25) * s, [s, c]);
  }

  // A round thing of sides faces: a drum from y to y + h, radius r (r2 at its top), with a lid unless open.
  drum(layer, x, y, z, r, h, sides = 12, o = {}) {
    const r2 = o.r2 ?? r, a0 = o.turn || 0;
    const [tw, th] = tileOf(layer);
    const p = this.part(layer);
    for (let i = 0; i < sides; i++) {
      const a = a0 + i / sides * TAU, b = a0 + (i + 1) / sides * TAU;
      const base = p.pos.length / 3, arc = TAU * r / sides;
      const pts = [[x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], [x + Math.cos(b) * r2, y + h, z + Math.sin(b) * r2], [x + Math.cos(a) * r2, y + h, z + Math.sin(a) * r2]];
      const nn = [[Math.cos(a), (r - r2) / h, Math.sin(a)], [Math.cos(b), (r - r2) / h, Math.sin(b)], [Math.cos(b), (r - r2) / h, Math.sin(b)], [Math.cos(a), (r - r2) / h, Math.sin(a)]];
      for (const q of pts) p.pos.push(...q);
      for (const q of nn) { const l = Math.hypot(...q); p.nrm.push(q[0] / l, q[1] / l, q[2] / l); }
      const u = i * arc / tw;
      p.uv.push(u, -y / th, u + arc / tw, -y / th, u + arc / tw, -(y + h) / th, u, -(y + h) / th);
      p.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    if (!o.open && r2 > 0.01) {
      const lid = o.lid || layer;
      for (let i = 0; i < sides; i++) {
        const a = a0 + i / sides * TAU, b = a0 + (i + 1) / sides * TAU;
        this.tri(lid, [x, y + h, z], [x + Math.cos(b) * r2, y + h, z + Math.sin(b) * r2], [x + Math.cos(a) * r2, y + h, z + Math.sin(a) * r2]);
      }
    }
    if (o.collide !== false) this.collide(x, z, r * 0.8, r * 0.8, 0, y + h);
  }

  cone(layer, x, y, z, r, h, sides = 12, turn = 0) { this.drum(layer, x, y, z, r, h, sides, { r2: 0.001, open: true, collide: false, turn }); }

  // A level disc (water, ice, a seal's face) of radius r at height y.
  disc(layer, x, y, z, r, sides = 32) {
    const p = this.part(layer), base = p.pos.length / 3;
    p.pos.push(x, y, z); p.nrm.push(0, 1, 0); p.uv.push(x / 4, z / 4);
    for (let i = 0; i <= sides; i++) {
      const a = i / sides * TAU, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      p.pos.push(px, y, pz); p.nrm.push(0, 1, 0); p.uv.push(px / 4, pz / 4);
      if (i) p.idx.push(base, base + i + 1, base + i);
    }
  }

  // A wall from a to b, thick t, tall h on the land, with merlons along its top if crenel.
  wall(layer, ax, az, bx, bz, t, h, o = {}) {
    const len = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(bx - ax, bz - az) - Math.PI / 2;
    const n = Math.max(1, Math.ceil(len / 8));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u;
      if (o.gap && Math.abs(u - 0.5) * len < o.gap) continue;
      const y = Math.min(terrainHeight(x - (bx - ax) / n / 2, z - (bz - az) / n / 2), terrainHeight(x + (bx - ax) / n / 2, z + (bz - az) / n / 2)) - 0.5;
      const top = (o.y ?? y + 0.5) + h;
      const hh = o.ruin ? h * (0.35 + 0.65 * hash2(Math.round(x), Math.round(z))) : h;
      this.box(layer, x, y, z, len / n / 2 + 0.05, (o.y ?? y + 0.5) + hh - y, t / 2, yaw);
      if (o.crenel && !o.ruin) for (let k = 0; k < 2; k++) {
        const v = (k - 0.5) * len / n / 2;
        this.box(layer, x + Math.cos(yaw) * v, top, z - Math.sin(yaw) * v, 0.6, 1.2, t / 2, yaw, { collide: false });
      }
    }
  }

  // A round tower with a cone of roof (or a crenellated top), its door facing doorYaw.
  tower(layer, x, z, r, h, roof = 'roof_2', o = {}) {
    const y = (o.y ?? terrainHeight(x, z)) - 1;
    this.drum(layer, x, y, z, r, h + 1, o.sides || 14);
    if (roof) this.cone(roof, x, y + h + 1, z, r + 0.8, r * (o.steep ?? 1.6), o.sides || 14);
    else for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; this.box(layer, x + Math.cos(a) * (r - 0.4), y + h + 1, z + Math.sin(a) * (r - 0.4), 0.55, 1.2, 0.4, -a, { collide: false }); }
  }

  fence(pts, h = 1.1) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2.5));
      const yaw = Math.atan2(bx - ax, bz - az) - Math.PI / 2;
      for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; this.box('wood', x, terrainHeight(x, z) - 0.2, z, 0.07, h + 0.2, 0.07, yaw, { collide: false }); }
      for (const ry of [0.45, 0.9]) {
        const y = (terrainHeight(ax, az) + terrainHeight(bx, bz)) / 2 + ry;
        this.box('wood', (ax + bx) / 2, y, (az + bz) / 2, len / 2, 0.08, 0.04, yaw, { collide: false });
      }
      this.collide((ax + bx) / 2, (az + bz) / 2, len / 2, 0.1, yaw, (terrainHeight(ax, az) + terrainHeight(bx, bz)) / 2 + h);
    }
  }

  // A standing stone, leaning a little.
  menhir(layer, x, z, w, h, yaw, lean = 0) {
    const y = terrainHeight(x, z) - 0.6;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (lx, ly, lz) => [x + (lx + ly * lean) * c + lz * s, y + ly, z - (lx + ly * lean) * s + lz * c];
    const t = w * 0.45, k = 0.72;
    const B = [[-w, -t], [w, -t], [w, t], [-w, t]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = B[i], [bx, bz] = B[(i + 1) % 4];
      this.quad(layer, P(ax, 0, az), P(bx, 0, bz), P(bx * k, h, bz * k), P(ax * k, h, az * k));
    }
    this.quad(layer, P(-w * k, h, -t * k), P(-w * k, h, t * k), P(w * k, h, t * k), P(w * k, h, -t * k), [0, 1, 0]);
    this.collide(x, z, w, t, yaw, y + h);
  }

  // Tessariel's sunburst, flat on a wall: a boss and twelve rays, long and short. (x, y, z) its middle; face: the wall's
  // outward direction in the ground plane, [nx, nz].
  sunburst(layer, x, y, z, face, r) {
    const [nx, nz] = face, rx = nz, rz = -nx, P = (u, v) => [x + rx * u + nx * 0.02, y + v, z + rz * u + nz * 0.02];
    const two = (a, b, c) => { this.tri(layer, a, b, c); this.tri(layer, a, c, b); };
    for (let i = 0; i < 12; i++) {
      const t = i / 12 * TAU, w = 0.13, L = r * (i % 2 ? 0.62 : 1);
      two(P(Math.cos(t - w) * r * 0.3, Math.sin(t - w) * r * 0.3), P(Math.cos(t) * L, Math.sin(t) * L), P(Math.cos(t + w) * r * 0.3, Math.sin(t + w) * r * 0.3));
    }
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, b = (i + 1) / 12 * TAU, c = r * 0.34;
      two(P(0, 0), P(Math.cos(a) * c, Math.sin(a) * c), P(Math.cos(b) * c, Math.sin(b) * c));
    }
  }

  // A tapering spike of a few sides: obsidian teeth, icicles turned up.
  spike(layer, x, y, z, r, h, sides = 5, turn = 0, lean = [0, 0]) {
    const p = this.part(layer);
    for (let i = 0; i < sides; i++) {
      const a = turn + i / sides * TAU, b = turn + (i + 1) / sides * TAU;
      const A = [x + Math.cos(a) * r, y, z + Math.sin(a) * r], B = [x + Math.cos(b) * r, y, z + Math.sin(b) * r], T = [x + lean[0] * h, y + h, z + lean[1] * h];
      this.tri(layer, A, T, B);
    }
    if (r > 0.6) this.collide(x, z, r * 0.7, r * 0.7, 0, y + h * 0.6);
    return p;
  }

  // A brazier on a post: a fire you see from far off.
  brazier(x, z, h = 1.2) {
    const y = terrainHeight(x, z);
    this.drum('dark:stone', x, y - 0.2, z, 0.25, h + 0.2, 6);
    this.drum('iron', x, y + h, z, 0.25, 0.35, 8, { r2: 0.45, collide: false, open: true });
    this.cone('flame', x, y + h + 0.15, z, 0.32, 0.9, 6);
  }

  // A seal: the portal you stand on to travel (src/ui/lands.js), the owner's round dais (drawn by the renderer: PORTAL_MODELS
  // ground), its swirl in the middle. It's let down into the ground a little at its highest, and stands on a plinth of dark
  // stone where the ground falls away under it. You walk on its step, its ring and its swirl (K.floors).
  seal(key, x, z, look = 0) {
    const { scale: S, sink } = PORTAL_MODELS.ground, R = 0.5 * S;
    let hi = -Infinity, lo = Infinity;
    for (let i = 0; i < 24; i++) for (const r of [0, R * 0.5, R]) {
      const a = i / 24 * TAU, g = terrainHeight(x + Math.cos(a) * r, z + Math.sin(a) * r);
      hi = Math.max(hi, g); lo = Math.min(lo, g);
    }
    const y = hi - sink;
    if (y - lo > 0.05) this.drum('dark:stone', x, lo - 0.5, z, R * 0.97, y - lo + 0.55, 24, { collide: false });
    const plat = { x, z, r: 0, rects: [] };
    this.floors.push(plat);
    // (Measured in tools/portal/pack.py: its swirl to 0.267 at 0.086, its ring to 0.45 at 0.107, its step to 0.5 at 0.065.)
    discFloor(plat, x, z, 0.267 * S, y + 0.086 * S);
    ringFloor(plat, x, z, 0.267 * S, 0.45 * S, y + 0.107 * S);
    ringFloor(plat, x, z, 0.45 * S, 0.5 * S, y + 0.065 * S, 24);
    this.spots[`seal_${key}`] = [x, hi, z, look];
  }
}
Object.assign(Kit.prototype, PIECES);   // (The dressing: src/core/places.js.)


// ---------------------------------------------------------------- the party dungeons (src/core/dungeon.js)
// (Their walls, floors, roofs, fires and everything in their rooms: src/core/delve-build.js, called from buildSites below.
// Their portals are built here.)

// The portals' models (drawn by the renderer: src/gfx/renderer.js portalModels, packed by tools/portal/pack.py): how big
// they're drawn, and how far each is let down into what it stands on.
export const PORTAL_MODELS = {
  // The seals' portal, a round dais 0.5 across in its file: 3.5 m round, its rune ring 0.75 m up.
  ground: { file: 'portal-ground', scale: 7, sink: 0.3 },
  // The Warrens' portal, an arch on a dais, 1 x 0.83 in its file: 6 m across, the arch 5 m high. Its dais is let down into
  // the terrace to a third of a metre: a party walks onto it, and nobody finds their way up more than 0.6 (src/sim/world.js).
  dungeon: { file: 'portal-dungeon', scale: 6, sink: 0.3 },
};

// A level floor on a platform that's round (rects turned four ways: a sixteen-sided floor a hair over r).
function discFloor(plat, x, z, r, y) {
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 8;
    plat.rects.push({ x, z, c: Math.cos(a), s: Math.sin(a), hu: r * 0.99, hw: r * 0.99, y });
  }
  plat.r = Math.max(plat.r, Math.hypot(x - plat.x, z - plat.z) + r * 1.5 + 0.5);
}
// And a ring of it, r0 out to r1 (n flat pieces round it, each a tangent; their inner edges never reach in past r0).
function ringFloor(plat, x, z, r0, r1, y, n = 16) {
  const rm = (r0 + r1) / 2, half = rm * Math.tan(Math.PI / n) + 0.05;
  for (let k = 0; k < n; k++) {
    const a = k / n * TAU, c = Math.cos(a), s = Math.sin(a);
    // (Its across along the tangent, its through outward: World tests |dx c - dz s| <= hu and |dx s + dz c| <= hw.)
    plat.rects.push({ x: x + s * rm, z: z + c * rm, c, s, hu: half, hw: (r1 - r0) / 2, y });
  }
  plat.r = Math.max(plat.r, Math.hypot(x - plat.x, z - plat.z) + r1 * 1.5 + 0.5);
}

// The Warrens' portal: the owner's dungeon portal model, set into a wall. Its whirl is a funnel that runs back out of the arch,
// so the wall has a niche cut in it for that: the arch stands against the wall's face, the niche's mouth just inside the arch's
// frame (a round-headed hole, the frame covering its edge), going back 2.5 m. The model's own dais stands out in front, on a
// level stone terrace that's built for it where it stands, the way you'd build one on a hillside, with the wall across its back.
// Out on the land it faces down the hill and the hill's cut back under it (src/core/terrain.js portalCut), so its floor is
// flush with the cut and the wall holds the hill; where the land falls away at the front it stands up on a wall, a plinth at its
// foot and a pale coping round its top. Out on the land you can get onto it from every side but the wall's: a wide flight
// comes down the front, as far down the hill as it takes to meet the ground, and at each end, in front of the wall, a flight
// comes down along the hill, or the parapet's left open where the ground's level with the floor. (Down in the Warrens: steps
// at the front where a short flight reaches the floor, and none at the ends.) Anywhere else it stands well over the ground,
// a parapet. A brazier at each front corner.
// x, z, yaw: where the portal stands and the way it faces (the model's own middle, on its dais). You walk on its floor, its
// steps and the dais (K.floors, src/sim/world.js height), and its walls stop you where they stand more than a step over your
// feet (K.colliders, t: their top less a step). ground is the land's height there (the land's, or the Warrens' floor, where
// only the rock stops anyone). key names its spot (K.spots): the model's middle, on the terrace's floor.
// (stair, ends: half the width of the front flight and the ends'. most: the steps in a short flight; far: in the front one on
// the land, which goes on down the hill till it meets it.)
const PLAT = { lift: 0.3, edge: 0.14, rise: 0.19, tread: 0.42, stair: 1.7, ends: 1.15, cheek: 0.32, most: 12, far: 30, drop: 0.9, rail: 0.75 };
// The arch, in the model's units (tools/portal/pack.py): the wall's face behind its frame, the niche's half width (and the
// radius of its head) and how high its head's middle is, how far back the niche goes, the dais's height, how far round it's
// level and the step at its front, and the frame's posts (across and through). The wall's height over the floor, in metres.
const ARCH = { face: 0.11, hole: 0.345, mid: 0.36, back: 0.42, deck: 0.107, deckR: 0.45, step: 0.044, frame: [0.28, 0.46], frameZ: [-0.16, 0.02], high: 7.2 };

function portalWall(K, x, z, yaw, key, ground = terrainHeight) {
  const { lift, edge, rise, tread, stair, ends, cheek, most, far, drop, rail } = PLAT;
  const { hu, hw, at } = PORTAL_PAD;
  const { scale: S, sink } = PORTAL_MODELS.dungeon;
  const land = ground === terrainHeight;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // The terrace's middle, behind the portal by at; P is a point across it (u) and through it (w, + out the front).
  const ox = x - at * s, oz = z - at * c;
  const P = (u, w) => [ox + u * c + w * s, oz - u * s + w * c];
  const G = (u, w) => { const [px, pz] = P(u, w); return ground(px, pz); };
  const plat = { x: ox, z: oz, r: 0, rects: [] };
  K.floors.push(plat);
  // A box in the terrace's own frame: its middle, its half sizes, from y0 to y1.
  const block = (layer, u, w, fu, fw, y0, y1, o = {}) => { const [px, pz] = P(u, w); K.box(layer, px, y0, pz, fu, y1 - y0, fw, yaw, { collide: false, ...o }); };
  const floor = (u, w, fu, fw, y) => {
    const [px, pz] = P(u, w);
    plat.rects.push({ x: px, z: pz, c, s, hu: fu, hw: fw, y });
    plat.r = Math.max(plat.r, Math.abs(u) + fu + 0.5, Math.abs(w) + fw + 0.5);
  };
  // A wall that stops you unless you're within a step of its top. (Not down in the Warrens: there only the rock stops anyone.)
  const wall = (u, w, fu, fw, y) => {
    if (!land) return;
    const [px, pz] = P(u, w);
    K.colliders.push({ x: px, z: pz, hx: fu, hz: fw, yaw, h: y - terrainHeight(px, pz), t: y - 0.45 });
  };
  // The ground under it, high and low. Its floor: at the Warrens' mouth, the cut's (which is the hill a little in front of
  // the wall); anywhere else on the land, and down in a dungeon, a little over the highest ground under it, so it stands
  // on whatever's there with nothing dug.
  let hi = -Infinity, lo = Infinity;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
    const g = G((i / 4 - 1) * (hu + edge), (j / 4 - 1) * (hw + edge));
    hi = Math.max(hi, g); lo = Math.min(lo, g);
  }
  const top = land && key === 'hf_portal' ? portalFloor() : hi + lift, foot = Math.min(lo, top) - 0.7;
  // The body, its plinth, and the coping round its top with the paving set in it.
  block('dark:stone', 0, 0, hu, hw, foot, top - 0.2, { top: false });
  block('dark:stone', 0, 0, hu + 0.2, hw + 0.2, foot, Math.min(lo, top - 0.5) + 0.3);
  block('pale:stone', 0, 0, hu + edge, hw + edge, top - 0.22, top);
  const pv = (u, w) => { const [px, pz] = P(u, w); return [px, top + 0.006, pz]; };
  K.quad('stone', pv(-hu + 0.5, -hw + 0.5), pv(-hu + 0.5, hw - 0.5), pv(hu - 0.5, hw - 0.5), pv(hu - 0.5, -hw + 0.5), [0, 1, 0]);
  floor(0, 0, hu + edge, hw + edge, top);
  wall(0, 0, hu + edge, hw + edge, top);

  // ---- the wall across the back, and the niche in it
  // Its back, the face of the niche's mouth and the niche's back (w); how far across it goes; its top. The niche: its half
  // width a, the middle of its round head (the model's own height, from where it's set down).
  const base = top - sink, wb = -hw - edge, wf = at - ARCH.face * S, wn = at - ARCH.back * S, U = hu + edge, Y = top + ARCH.high;
  const a = ARCH.hole * S, yc = base + ARCH.mid * S;
  block('dark:stone', 0, (wb + wn) / 2, U, (wn - wb) / 2, foot, Y);
  block('dark:stone', -(U + a) / 2, (wn + wf) / 2, (U - a) / 2, (wf - wn) / 2, foot, Y);
  block('dark:stone', (U + a) / 2, (wn + wf) / 2, (U - a) / 2, (wf - wn) / 2, foot, Y);
  block('dark:stone', 0, (wn + wf) / 2, a, (wf - wn) / 2, yc + a, Y);
  // The niche's head: the face of the wall either side of its round top, and the vault over it back to the niche's back.
  const W = (u, y, w) => { const [px, pz] = P(u, w); return [px, y, pz]; };
  const N = 16, front = [s, 0, c];
  for (let i = 0; i < N; i++) {
    const t0 = i / N * Math.PI, t1 = (i + 1) / N * Math.PI;
    const u0 = Math.cos(t0) * a, y0 = yc + Math.sin(t0) * a, u1 = Math.cos(t1) * a, y1 = yc + Math.sin(t1) * a;
    K.quad('dark:stone', W(u1, y1, wf), W(u0, y0, wf), W(u0, yc + a, wf), W(u1, yc + a, wf), front);
    const tm = (t0 + t1) / 2, n = [-Math.cos(tm) * c, -Math.sin(tm), Math.cos(tm) * s];
    K.quad('dark:stone', W(u0, y0, wf), W(u1, y1, wf), W(u1, y1, wn), W(u0, y0, wn), n);
  }
  // A pale coping along its top, a band across its face over the arch, and pilasters up its face.
  block('pale:stone', 0, (wb + wf) / 2, U + 0.12, (wf - wb) / 2 + 0.12, Y, Y + 0.3);
  block('pale:stone', 0, wf + 0.08, U, 0.1, top + 5.5, top + 5.75);
  for (const pu of [-(U - 0.35), -(a + 2.1), a + 2.1, U - 0.35]) {
    block('dark:stone', pu, wf + 0.14, 0.32, 0.16, top - 0.05, Y - 0.05);
    block('pale:stone', pu, wf + 0.18, 0.38, 0.2, top - 0.05, top + 0.3);
    block('pale:stone', pu, wf + 0.18, 0.38, 0.2, top + 5.4, top + 5.85);
  }
  // It stops you: all of it but the arch, whose frame stands out in front of it, and that stops you too.
  const wc = at - 0.95;
  wall(0, (wb + wc) / 2, U, (wc - wb) / 2, Y);
  for (const side of [-1, 1]) {
    const f0 = ARCH.frame[0] * S, f1 = ARCH.frame[1] * S, z0 = at + ARCH.frameZ[0] * S, z1 = at + ARCH.frameZ[1] * S;
    wall(side * (f0 + f1) / 2, (z0 + z1) / 2, (f1 - f0) / 2, (z1 - z0) / 2, base + 0.83 * S);
  }
  // The dais: its top, and its steps at the front.
  discFloor(plat, x, z, ARCH.deckR * S, base + ARCH.deck * S);
  floor(0, at + (ARCH.deckR + 0.03) * S, 1.3, 0.03 * S, base + ARCH.step * S);

  // ---- the terrace's other three edges: n the way out, half its length, how far out from the middle. on() is a point a along
  // an edge, b out from it. The ends' steps come down in front of the wall, mid along them.
  const sides = [
    { n: [0, 1], half: hu, out: hw, way: true, mid: 0 },
    { n: [1, 0], half: hw, out: hu, way: false, mid: (wf + hw) / 2 }, { n: [-1, 0], half: hw, out: hu, way: false, mid: -(wf + hw) / 2 },
  ];
  const on = (sd, q, b) => [sd.n[0] * (sd.out + b) - sd.n[1] * q, sd.n[1] * (sd.out + b) + sd.n[0] * q];
  const along = (layer, sd, q, b, fa, fb, y0, y1) => { const [u, w] = on(sd, q, b); if (sd.n[0]) block(layer, u, w, fb, fa, y0, y1); else block(layer, u, w, fa, fb, y0, y1); };
  const flat = (sd, q, b, fa, fb, y) => { const [u, w] = on(sd, q, b); if (sd.n[0]) floor(u, w, fb, fa, y); else floor(u, w, fa, fb, y); };
  const stop = (sd, q, b, fa, fb, y) => { const [u, w] = on(sd, q, b); if (sd.n[0]) wall(u, w, fb, fa, y); else wall(u, w, fa, fb, y); };
  // Where along an edge is clear of the wall (along an end, the wall's where w < wf).
  const clear = (sd) => (sd.n[0] > 0 ? [wf, sd.half + edge] : sd.n[0] < 0 ? [-sd.half - edge, -wf] : [-sd.half - edge, sd.half + edge]);
  // A flight down from an edge, hs wide either side of m: its steps (none, where the ground's level with the floor there), or
  // null if count of them never reach the ground.
  const flight = (sd, m, hs, count = most) => {
    const steps = [];
    for (let k = 0; k < count; k++) {
      const b = edge + k * tread + tread / 2, y = top - (k + 1) * rise;
      const under = [-hs - cheek, 0, hs + cheek].map((q) => G(...on(sd, m + q, b)));
      // (Done where its middle meets the ground: across a slope its high side runs into the hill.)
      if (y < under[1] + 0.05) return steps;
      steps.push({ b, y, base: Math.min(...under) - 0.5 });
    }
    return null;
  };
  // A wall along an edge whose top slopes (a stair's cheek): q0..q1 along the edge, b0..b1 out from it, from y0 up to yt0 at b0
  // and yt1 at b1; its sides in layer, its top in cap. (Faced the way Kit.box faces its sides.)
  const ramp = (layer, cap, sd, q0, q1, b0, b1, y0, yt0, yt1) => {
    const pts = [[q0, b0], [q1, b0], [q1, b1], [q0, b1]].map(([q, b]) => { const [u, w] = on(sd, q, b); return { u, w, t: b === b0 ? yt0 : yt1 }; });
    const mu = pts.reduce((m, p) => m + p.u, 0) / 4, mw = pts.reduce((m, p) => m + p.w, 0) / 4;
    pts.sort((p, q) => Math.atan2(p.w - mw, p.u - mu) - Math.atan2(q.w - mw, q.u - mu));
    const V = (p, y) => { const [px, pz] = P(p.u, p.w); return [px, y, pz]; };
    for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; K.quad(layer, V(p, y0), V(q, y0), V(q, q.t), V(p, p.t)); }
    const A = V(pts[0], pts[0].t), B = V(pts[1], pts[1].t), D = V(pts[3], pts[3].t);
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = D[0] - A[0], vy = D[1] - A[1], vz = D[2] - A[2];
    let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const l = Math.hypot(...n) * Math.sign(n[1] || 1);
    n = n.map((v) => v / l);
    K.quad(cap, A, D, V(pts[2], pts[2].t), B, n);
  };
  const ahead = flight(sides[0], 0, stair, land ? far : most);
  for (const sd of sides) {
    const hs = sd.way ? stair : ends, m = sd.mid;
    const steps = sd.way ? ahead : land ? flight(sd, m, hs) : null;
    const n = steps ? steps.length : 0;
    for (const { b, y, base: under } of steps || []) {
      along('pale:stone', sd, m, b, hs, tread / 2 + 0.01, under, y);
      flat(sd, m, b, hs, tread / 2 + 0.01, y);
    }
    // Its cheeks, a wall either side whose coping runs down with the steps' noses (none for a step or two on the level).
    if (n > 1) {
      const nose = (b) => top - rise + 0.45 - (b - edge) * rise / tread, b1 = edge + n * tread;
      const under = Math.min(...steps.map((q) => q.base));
      for (const sg of [-1, 1]) {
        const q0 = m + sg * hs, q1 = m + sg * (hs + cheek);
        ramp('dark:stone', 'pale:stone', sd, Math.min(q0, q1), Math.max(q0, q1), 0, b1, under, nose(0), nose(b1));
        for (const { b } of steps) {
          flat(sd, m + sg * (hs + cheek / 2), b, cheek / 2, tread / 2 + 0.01, nose(b));
          stop(sd, m + sg * (hs + cheek / 2), b, cheek / 2, tread / 2 + 0.01, nose(b));
        }
      }
    }
    // A parapet where it stands well over the ground, but for the way down (steps, or on the land the level ground) and where
    // the wall is.
    const [c0, c1] = clear(sd);
    const gap = n || (land && steps) ? hs + cheek : 0;
    const segs = (gap ? [[c0, m - gap], [m + gap, c1]] : [[c0, c1]]).filter(([q0, q1]) => q1 - q0 > 0.3);
    for (const [q0, q1] of segs) {
      let under = Infinity;
      for (let k = 0; k <= 6; k++) under = Math.min(under, G(...on(sd, q0 + (q1 - q0) * k / 6, edge + 0.4)));
      if (top - under < drop) continue;
      const qm = (q0 + q1) / 2, fa = (q1 - q0) / 2;
      along('dark:stone', sd, qm, edge - 0.17, fa - 0.02, 0.15, top, top + rail - 0.13);
      along('pale:stone', sd, qm, edge - 0.17, fa, 0.2, top + rail - 0.13, top + rail);
      stop(sd, qm, edge - 0.17, fa, 0.2, top + rail);
    }
    // Pilasters up a tall wall, to break it: near its corners and, on a long one with no steps, in its middle.
    let low = Infinity;
    for (let k = 0; k <= 8; k++) low = Math.min(low, G(...on(sd, c0 + (c1 - c0) * k / 8, 0.4)));
    if (top - low > 1.3) {
      const spots = [c0 + 0.35, c1 - 0.35].concat(!n && c1 - c0 > 6 ? [(c0 + c1) / 2] : []);
      for (const q of spots) {
        if (n && Math.abs(q - m) < hs + cheek + 0.35) continue;
        along('dark:stone', sd, q, 0.08, 0.26, 0.2, foot, top - 0.36);
        along('pale:stone', sd, q, 0.1, 0.3, 0.23, top - 0.36, top - 0.22);
      }
    }
  }
  // A brazier at each front corner: a post of stone, an iron bowl, the fire in it.
  for (const u of [-1, 1]) {
    const [bx, bz] = P(u * (hu - 0.6), hw - 0.6);
    K.drum('dark:stone', bx, top - 0.05, bz, 0.24, 1.05, 6, { r2: 0.19, collide: false });
    K.drum('iron', bx, top + 0.95, bz, 0.2, 0.3, 8, { r2: 0.4, collide: false, open: true });
    K.cone('flame', bx, top + 1.08, bz, 0.28, 0.8, 6);
    if (land) K.colliders.push({ x: bx, z: bz, hx: 0.25, hz: 0.25, yaw: 0, h: top + 1.3 - terrainHeight(bx, bz), t: top + 1.2 });
  }
  K.spots[key] = [x, top, z, yaw];
}

// The ways in, out on the land: the Warrens' in its wall on the hillside near the kobolds' den, the keep's before its gate
// on the Vigil Road, the Deeps' at the Howling Mouth. (Their spots: hf_portal, bv_portal, hd_portal.)
function warrensMouth(K) {
  for (const d of DELVES) portalWall(K, d.portal.x, d.portal.z, d.portal.yaw, `${d.tag}_portal`);
}

// ---------------------------------------------------------------- the places

const at = (k) => SITES[k];
const Y = (x, z) => terrainHeight(x, z);

function downs(K) {
  // Millhaven Farm: the farmhouse, the barn, three fenced fields, hay and a well.
  const f = at('farm');
  K.house(f.x - 10, f.z - 6, 7.5, 5, 6.5, 0.1, 'wall_14', 'roof_1', { chimney: 4.5 });
  K.house(f.x + 16, f.z + 12, 7, 9, 5.5, Math.PI / 2 + 0.1, 'wood', 'roof_3', { door: 'door_3' });
  for (const [dx, dz, w, d] of [[-40, 30, 17, 11], [-30, 64, 15, 11], [36, 52, 13, 9]]) {
    const x = f.x + dx, z = f.z + dz;
    K.fence([[x - w, z - d], [x + w, z - d], [x + w, z + d], [x - w, z + d], [x - w, z - d + 3]]);
  }
  for (let i = 0; i < 7; i++) { const x = f.x + 6 + (i % 3) * 2.2, z = f.z + 26 + Math.floor(i / 3) * 1.6; K.drum('cloth_oat', x, Y(x, z) - 0.1, z, 0.75, 1.1, 10, { collide: i === 0 }); }
  K.drum('stone', f.x + 2, Y(f.x + 2, f.z + 4) - 0.2, f.z + 4, 1, 1.1, 12, { lid: 'water' });
  // The windmill on its rise: a tapering tower, a cap, four sails stopped at a slant.
  const m = at('mill'), my = Y(m.x, m.z);
  K.drum('wall_09', m.x, my - 0.5, m.z, 4.2, 13, 8, { r2: 3.2 });
  K.cone('roof_2', m.x, my + 12.5, m.z, 4, 4.2, 8);
  K.quad('door_2', [m.x - 0.8, my, m.z + 4.15], [m.x + 0.8, my, m.z + 4.15], [m.x + 0.8, my + 2.4, m.z + 4.15], [m.x - 0.8, my + 2.4, m.z + 4.15], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  const hub = [m.x, my + 11.5, m.z + 4.6];
  for (let i = 0; i < 4; i++) {
    const a = 0.4 + i * Math.PI / 2, cx = Math.cos(a), cy = Math.sin(a);
    const P = (r, w) => [hub[0] + cx * r - cy * w, hub[1] + cy * r + cx * w, hub[2]];
    K.quad('wood', P(0.3, -0.12), P(10, -0.12), P(10, 0.12), P(0.3, 0.12), [0, 0, 1]);
    K.quad('cloth_oat', P(2, 0.15), P(9.6, 0.15), P(9.6, 1.6), P(2, 1.6), [0, 0, 1]);
  }
  // Millhaven: four homes round a green.
  const hm = at('hamlet');
  const homes = [[-30, 40, 'wall_16', 'roof_1', 0.2], [34, 30, 'wall_13', 'roof_4', -0.3], [-36, -34, 'wall_15', 'roof_3', Math.PI - 0.2], [28, -40, 'wall_19', 'roof_2', Math.PI + 0.4]];
  for (const [dx, dz, w, r, yaw] of homes) K.house(hm.x + dx, hm.z + dz, 5.5, 4.5, 4.4, yaw, w, r, { chimney: -3 });
  K.drum('stone', hm.x - 4, Y(hm.x - 4, hm.z) - 0.2, hm.z, 1, 1.1, 12, { lid: 'water' });
  // Brightwater: the falls over the cliff, the pool under them, boulders.
  const pool = WATERS.find((w) => w.key === 'pool'), py = waterLevel(pool);
  K.disc('lake', pool.x, py, pool.z, pool.r + 1, 40);
  // (Down the face as it really lies, a strip at a time, a hand's breadth off the rock; from the lip to the pool's edge.)
  let lip = CLIFF.x;
  for (let x = CLIFF.x; x < CLIFF.x + 70; x += 2) if (Y(x, POOL.z) > Y(lip, POOL.z)) lip = x;
  let prev = null;
  for (let x = CLIFF.x - 6; x <= lip + 2; x += 3) {
    const y = Math.max(py, Y(x, POOL.z)) + 0.35, v = (lip - x) / 8;
    if (prev) K.quad('falls', [x, y, POOL.z - 7], [x, y, POOL.z + 7], [prev[0], prev[1], POOL.z + 7.5], [prev[0], prev[1], POOL.z - 7.5], null, [[0, v], [1, v], [1, prev[2]], [0, prev[2]]]);
    prev = [x, y, v];
  }
  for (let i = 0; i < 9; i++) {
    const a = 1.2 + i * 0.5, x = pool.x + Math.cos(a) * (pool.r + 3), z = pool.z + Math.sin(a) * (pool.r + 3);
    K.box('rubble', x, Y(x, z) - 0.6, z, 1 + hash2(i, 3) * 1.2, 1.4 + hash2(i, 5) * 1.5, 1 + hash2(i, 7), a);
  }
  // The Bell Tower of the Four Watches: a pale square shaft, an open belfry on four piers, four bells, a copper spire.
  const b = at('belltower'), by = Y(b.x, b.z);
  K.box('stone', b.x, by - 1, b.z, 5.4, 2, 5.4, 0);
  K.box('pale:stone', b.x, by + 1, b.z, 5, 27, 5, 0, { top: 'wood' });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box('pale:stone', b.x + sx * 5.2, by - 1, b.z + sz * 5.2, 0.9, 30, 0.9, 0, { collide: false });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box('pale:stone', b.x + sx * 4.3, by + 28, b.z + sz * 4.3, 0.7, 8, 0.7, 0, { collide: false });
  K.box('pale:stone', b.x, by + 36, b.z, 5.2, 1.2, 5.2, 0, { collide: false });
  K.cone('roof_2', b.x, by + 37.2, b.z, 5.6, 11, 8, Math.PI / 8);
  const bells = [[0, 1, 1.25], [0, -1, 1.05], [1, 0, 0.95], [-1, 0, 0.85]];
  for (const [sx, sz, D] of bells) {
    const x = b.x + sx * 2.4, z = b.z + sz * 2.4;
    K.drum('iron', x, by + 31.6 - D, z, D, D * 1.15, 14, { r2: D * 0.42, collide: false });
    K.box('wood', x, by + 33, z, 0.15, 0.3, 1.2, sx ? Math.PI / 2 : 0, { collide: false });
  }
  // (Tessariel's: his sunburst in gilt over the door.)
  K.sunburst('fruit2', b.x, by + 6.2, b.z + 5.04, [0, 1], 1.5);
  K.quad('door_4', [b.x - 1, by + 1, b.z + 5.04], [b.x + 1, by + 1, b.z + 5.04], [b.x + 1, by + 3.9, b.z + 5.04], [b.x - 1, by + 3.9, b.z + 5.04], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  K.spots.bellwright = [b.x + 2.8, by + 1, b.z + 7.5, Math.PI];
}

function fen(K) {
  for (const key of ['sallow', 'fenpool1', 'fenpool2']) {
    const w = WATERS.find((q) => q.key === key);
    K.disc('lake', w.x, waterLevel(w), w.z, w.r + 1, 48);
  }
  // Sallowmere's jetty, half gone into the water.
  const s = at('sallow'), wy = waterLevel(WATERS.find((q) => q.key === 'sallow'));
  for (let i = 0; i < 9; i++) {
    const x = s.x + 96 - i * 3, z = s.z + 10;
    if (i < 7) K.box('wood', x, wy + 0.25 - i * 0.05, z, 1.5, 0.12, 1.2, 0.02 * i, { collide: false });
    K.box('wood', x, wy - 1.5, z + 1.2, 0.12, 2, 0.12, 0, { collide: false });
  }
  // The Drowned Chapel: Tessariel's, roofless, its west end sunk in the mire; the T still on its gable.
  const c = at('chapel'), cy = Y(c.x, c.z);
  K.wall('rubble', c.x - 12, c.z - 6, c.x + 12, c.z - 6, 1, 7, { ruin: true });
  K.wall('rubble', c.x - 12, c.z + 6, c.x + 12, c.z + 6, 1, 7, { ruin: true });
  K.wall('rubble', c.x + 12, c.z - 6, c.x + 12, c.z + 6, 1, 10);
  K.wall('rubble', c.x - 12, c.z - 6, c.x - 12, c.z + 6, 1, 4, { gap: 1.6, ruin: true });
  K.box('pale:stone', c.x + 12.6, cy + 10.5, c.z, 0.2, 0.5, 1.6, 0, { collide: false });
  K.box('pale:stone', c.x + 12.6, cy + 8, c.z, 0.2, 2.6, 0.45, 0, { collide: false });
  K.disc('lake', c.x - 4, cy + 0.15, c.z, 7, 20);
  K.box('pale:stone', c.x + 8, cy - 0.2, c.z, 1.6, 1.1, 0.9, 0);
}

function rustwood(K) {
  // The Abbey of Saint Ossery: the nave's walls standing, its roof fallen in, a bell-cote on the west gable, a cloister's arcade.
  const a = at('abbey'), ay = Y(a.x, a.z);
  const L = 22, Wd = 8;
  K.wall('stone', a.x - L, a.z - Wd, a.x + L, a.z - Wd, 1.4, 11, { ruin: true });
  K.wall('stone', a.x - L, a.z + Wd, a.x + L, a.z + Wd, 1.4, 11);
  K.wall('stone', a.x + L, a.z - Wd, a.x + L, a.z + Wd, 1.4, 16);
  K.wall('stone', a.x - L, a.z - Wd, a.x - L, a.z + Wd, 1.4, 14, { gap: 2 });
  for (let i = -2; i <= 2; i++) K.box('stone', a.x + i * 8, ay - 0.3, a.z + Wd + 0.9, 0.9, 12, 0.6, 0, { collide: false });
  for (let i = 0; i < 6; i++) { const x = a.x + 6 - i * 4.4; K.box('roof_3', x, ay + 2 + (i % 2), a.z - 2 + (i % 3), 2.4, 0.3, 3, 0.3 * i, { collide: false }); }
  for (let i = 0; i < 6; i++) K.drum('stone', a.x - 18 + i * 6, ay - 0.3, a.z - Wd - 14, 0.45, 4.5, 8);
  K.box('stone', a.x - 3, ay - 0.3, a.z - Wd - 14, 18, 0.6, 1.4, 0, { collide: false, top: 'stone' });
  K.sunburst('fruit2', a.x + L + 0.72, ay + 12.4, a.z, [1, 0], 1.6);
  // The bell-cote over the west door (Orrin asks after it): two piers, a lintel, a small bell, a little gable.
  for (const s of [-1, 1]) K.box('stone', a.x - L, ay + 14, a.z + s * 1.6, 0.6, 5, 0.6, 0, { collide: false });
  K.box('stone', a.x - L, ay + 19, a.z, 0.7, 0.6, 2.3, 0, { collide: false });
  K.drum('iron', a.x - L, ay + 16.2, a.z, 0.75, 0.9, 12, { r2: 0.32, collide: false });
  // The Fungal Ring: caps the height of a man, in a ring.
  const f = at('fungus');
  for (let i = 0; i < 13; i++) {
    const t = i / 13 * TAU, r = 22 + hash2(i, 9) * 4, x = f.x + Math.cos(t) * r, z = f.z + Math.sin(t) * r, h = 1.5 + hash2(i, 11) * 2.5, y = Y(x, z);
    K.drum('cloth_oat', x, y - 0.2, z, 0.35 + h * 0.08, h, 8, { r2: 0.25 + h * 0.06 });
    K.drum('fruit', x, y + h - 0.2, z, 1 + h * 0.45, 0.35, 12, { r2: 0.8 + h * 0.4, collide: false });
    K.cone('fruit', x, y + h + 0.15, z, 0.8 + h * 0.4, 0.5 + h * 0.18, 12);
  }
  // The Woodcutters' Camp: a lean-to, log stacks, the sawpit.
  const w = at('cutters'), wy = Y(w.x, w.z);
  K.box('wood', w.x, wy - 0.2, w.z - 4, 4, 2.4, 0.2, 0.2);
  K.quad('roof_1', [w.x - 4.4, wy + 2.2, w.z - 4.2], [w.x + 4.4, wy + 2.2, w.z - 4.2], [w.x + 4.4, wy + 1.1, w.z + 0.5], [w.x - 4.4, wy + 1.1, w.z + 0.5]);
  for (let s = 0; s < 3; s++) for (let i = 0; i < 6; i++) {
    const x = w.x + 7 + (i % 3) * 0.75 + s * 0.37, z = w.z + 2 + s * 4;
    K.quad('bark', [x, wy + 0.4 * Math.floor(i / 3), z - 2.5], [x, wy + 0.4 * Math.floor(i / 3), z + 2.5], [x, wy + 0.4 + 0.4 * Math.floor(i / 3), z + 2.5], [x, wy + 0.4 + 0.4 * Math.floor(i / 3), z - 2.5]);
  }
  K.collide(w.x + 8, w.z + 6, 1.4, 6, 0, wy + 0.9);
}

function ashen(K) {
  // The Caravanserai of Khel: a square court behind blind walls, a gate between two towers, an arcade round the inside, a well.
  const k = at('khel'), H = 30;
  K.wall('rubble', k.x - H, k.z - H, k.x + H, k.z - H, 1.6, 7, { crenel: true });
  K.wall('rubble', k.x + H, k.z - H, k.x + H, k.z + H, 1.6, 7, { crenel: true });
  K.wall('rubble', k.x + H, k.z + H, k.x - H, k.z + H, 1.6, 7, { crenel: true, gap: 3.4 });
  K.wall('rubble', k.x - H, k.z + H, k.x - H, k.z - H, 1.6, 7, { crenel: true });
  for (const sx of [-1, 1]) K.tower('rubble', k.x + sx * 5.4, k.z + H, 3, 11, null);
  for (const [sx, sz] of [[-1, -1], [1, -1]]) K.tower('rubble', k.x + sx * H, k.z + sz * H, 3.4, 9, null);
  for (let i = 0; i < 10; i++) {
    const t = -H + 6 + i * (2 * H - 12) / 9;
    for (const [x, z] of [[k.x + t, k.z - H + 6], [k.x - H + 6, k.z + t], [k.x + H - 6, k.z + t]]) K.drum('stone', x, Y(x, z) - 0.2, z, 0.5, 4.2, 8);
  }
  K.drum('stone', k.x, Y(k.x, k.z) - 0.2, k.z, 1.6, 1.0, 14, { lid: 'water' });
  // The Bone Field: the ribs of something enormous coming up out of the ash, and its skull. Velscour's: his red rag on a pole.
  const b = at('bones');
  for (let r = 0; r < 9; r++) {
    for (const side of [-1, 1]) {
      const x0 = b.x - 24 + r * 6, z0 = b.z;
      for (let s = 0; s < 6; s++) {
        const u = s / 6, v = (s + 1) / 6, ang = (q) => q * 1.9;
        const P = (q) => [x0 + Math.sin(q * 0.4) * 0.6, Y(x0, z0) - 1 + Math.sin(ang(q)) * 14 * (1 - r * 0.05), z0 + side * (1 - Math.cos(ang(q))) * 9];
        const A = P(u), B = P(v);
        K.quad('pale:stone', [A[0] - 0.35, A[1], A[2]], [A[0] + 0.35, A[1], A[2]], [B[0] + 0.35, B[1], B[2]], [B[0] - 0.35, B[1], B[2]]);
      }
      K.collide(x0, b.z + side * 9, 0.5, 0.5, 0, Y(x0, b.z) + 3);
    }
  }
  // (The horn of whatever this was, at the ribs' east end.)
  K.spike('pale:stone', b.x + 34, Y(b.x + 34, b.z) - 2, b.z, 6, 9, 7, 0.3);
  K.box('wood', b.x - 30, Y(b.x - 30, b.z + 3) - 0.3, b.z + 3, 0.1, 5, 0.1, 0);
  K.quad('cloth_red', [b.x - 29.9, Y(b.x - 30, b.z + 3) + 4.6, b.z + 3], [b.x - 29.9, Y(b.x - 30, b.z + 3) + 4.6, b.z + 4.8], [b.x - 29.9, Y(b.x - 30, b.z + 3) + 2.6, b.z + 4.6], [b.x - 29.9, Y(b.x - 30, b.z + 3) + 2.6, b.z + 3]);
  // The Black Obelisks: seven needles of his black stone, one fallen, braziers that never go out.
  const o = at('obelisks');
  for (let i = 0; i < 7; i++) {
    const t = i / 7 * TAU, x = o.x + Math.cos(t) * 20, z = o.z + Math.sin(t) * 20;
    if (i === 4) { K.box('dark:stone', x, Y(x, z) - 0.4, z, 9, 1.6, 1.4, t); continue; }
    K.menhir('dark:stone', x, z, 1.5, 16 + hash2(i, 2) * 6, -t, 0);
    K.cone('dark:stone', x, Y(x, z) + 15.4 + hash2(i, 2) * 6, z, 1.1, 2.5, 4, t);
  }
  K.box('dark:stone', o.x, Y(o.x, o.z) - 0.5, o.z, 3, 1.4, 3, 0.4);
  K.brazier(o.x + 6, o.z, 1.3); K.brazier(o.x - 6, o.z, 1.3);
  // Blackvigil Keep: Velscour's. The curtain wall in his black stone, a drum tower at each corner, the gatehouse on the Vigil Road
  // (east), the great keep within, his red over the gate and braziers up the road.
  keep(K);
}

function keep(K) {
  const k = at('keep'), y0 = Y(k.x, k.z), HX = 70, HZ = 58, wallH = 16;
  const G = 'dark:stone', R = 'dark:rubble';
  K.wall(G, k.x - HX, k.z - HZ, k.x + HX, k.z - HZ, 3, wallH, { crenel: true, y: y0 });
  K.wall(G, k.x - HX, k.z + HZ, k.x + HX, k.z + HZ, 3, wallH, { crenel: true, y: y0 });
  K.wall(G, k.x - HX, k.z - HZ, k.x - HX, k.z + HZ, 3, wallH, { crenel: true, y: y0 });
  K.wall(G, k.x + HX, k.z - HZ, k.x + HX, k.z + HZ, 3, wallH, { crenel: true, y: y0, gap: 4 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.tower(G, k.x + sx * HX, k.z + sz * HZ, 7, wallH + 8, 'dark:roof_2', { y: y0, sides: 16 });
  // The gatehouse: two towers flanking the gate, a passage roofed over.
  for (const sz of [-1, 1]) K.tower(G, k.x + HX + 2, k.z + sz * 9, 5.5, wallH + 6, null, { y: y0 });
  K.box(G, k.x + HX, y0 + 7.5, k.z, 3, wallH - 7.5, 4.5, 0, { collide: false });
  K.quad('door_5', [k.x + HX + 1.6, y0, k.z + 3.6], [k.x + HX + 1.6, y0, k.z - 3.6], [k.x + HX + 1.6, y0 + 7.5, k.z - 3.6], [k.x + HX + 1.6, y0 + 7.5, k.z + 3.6], [1, 0, 0], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  K.collide(k.x + HX, k.z, 1.5, 4.2, 0, y0 + 7.5);   // (the gate's shut: he doesn't open it to you yet)
  // The keep: a great block on a plinth, a crown of merlons, a tower at its back corner taller than everything, his red down its face.
  K.box(R, k.x - 12, y0 - 1, k.z, 30, 3, 26, 0);
  K.box(G, k.x - 12, y0 + 2, k.z, 26, 44, 22, 0, { top: R });
  for (let i = 0; i < 16; i++) {
    const u = (i + 0.5) / 16 * 2 - 1;
    K.box(G, k.x - 12 + u * 26, y0 + 46, k.z - 22, 1, 1.8, 0.8, 0, { collide: false });
    K.box(G, k.x - 12 + u * 26, y0 + 46, k.z + 22, 1, 1.8, 0.8, 0, { collide: false });
    K.box(G, k.x - 12 - 26, y0 + 46, k.z + u * 22, 0.8, 1.8, 1, 0, { collide: false });
    K.box(G, k.x - 12 + 26, y0 + 46, k.z + u * 22, 0.8, 1.8, 1, 0, { collide: false });
  }
  K.tower(G, k.x - 34, k.z - 18, 9, 78, 'dark:roof_2', { y: y0, steep: 2.4, sides: 16 });
  // His red, long, down the road side of the corner towers and the tall tower, so the road sees it from far off.
  for (const sz of [-1, 1]) K.quad('cloth_red', [k.x + HX + 7.1, y0 + 22, k.z + sz * HZ - 2.2], [k.x + HX + 7.1, y0 + 22, k.z + sz * HZ + 2.2], [k.x + HX + 7.1, y0 + 4, k.z + sz * HZ + 2.2], [k.x + HX + 7.1, y0 + 4, k.z + sz * HZ - 2.2], [1, 0, 0], [[0, 0], [1, 0], [1, 3], [0, 3]]);
  K.quad('cloth_red', [k.x - 24.9, y0 + 72, k.z - 21], [k.x - 24.9, y0 + 72, k.z - 15], [k.x - 24.9, y0 + 34, k.z - 15], [k.x - 24.9, y0 + 34, k.z - 21], [1, 0, 0], [[0, 0], [1, 0], [1, 5], [0, 5]]);
  for (const dz of [-12, 0, 12]) K.quad('cloth_red', [k.x + 14.05, y0 + 42, k.z + dz - 2.2], [k.x + 14.05, y0 + 42, k.z + dz + 2.2], [k.x + 14.05, y0 + 12, k.z + dz + 2.2], [k.x + 14.05, y0 + 12, k.z + dz - 2.2], [1, 0, 0], [[0, 0], [1, 0], [1, 3], [0, 3]]);
  K.quad('door_5', [k.x + 14.05, y0 + 2, k.z - 2.5], [k.x + 14.05, y0 + 2, k.z + 2.5], [k.x + 14.05, y0 + 8.5, k.z + 2.5], [k.x + 14.05, y0 + 8.5, k.z - 2.5], [1, 0, 0], [[1, 1], [0, 1], [0, 0], [1, 0]]);
  for (const dz of [-5, 5]) K.brazier(k.x + 18, k.z + dz, 1.6);
  K.quad('cloth_red', [k.x + HX + 3.05, y0 + 15, k.z - 2], [k.x + HX + 3.05, y0 + 15, k.z + 2], [k.x + HX + 3.05, y0 + 8, k.z + 2], [k.x + HX + 3.05, y0 + 8, k.z - 2], [1, 0, 0], [[0, 0], [1, 0], [1, 2], [0, 2]]);
  // Up the Vigil Road to the gate: gibbets, and braziers in pairs.
  for (let i = 1; i <= 6; i++) {
    const x = k.x + HX + 14 + i * 26;
    K.brazier(x, k.z + 7); K.brazier(x, k.z - 7);
    if (i % 2) { const gx = x + 13, gz = k.z + 11, gy = Y(gx, gz); K.box('wood', gx, gy - 0.4, gz, 0.15, 6, 0.15, 0); K.box('wood', gx - 1.2, gy + 5.4, gz, 1.4, 0.18, 0.15, 0, { collide: false }); K.drum('iron', gx - 2.3, gy + 2.6, gz, 0.4, 1.6, 6, { open: true, collide: false }); }
  }
  K.spots.keepGate = [k.x + HX + 8, y0, k.z, Math.PI / 2];
}

function barrow(K) {
  // The Barrows: the great mounds are the land's own (lands.js BARROWS); here, their doors: two stones and a lintel, a slab across.
  const b = at('barrows');
  for (const [dx, dz, r, yaw] of BARROWS.map((q) => [q[0] - b.x, q[1] - b.z, q[2], q[4]])) {
    const x = b.x + dx + Math.cos(yaw) * r * 0.82, z = b.z + dz + Math.sin(yaw) * r * 0.82, y = Y(x, z);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const side of [-1, 1]) K.box('rubble', x - s * side * 1.4, y - 0.5, z + c * side * 1.4, 0.45, 3.2, 0.45, -yaw);
    K.box('rubble', x, y + 2.6, z, 0.6, 0.6, 2.2, -yaw, { collide: false });
    K.box('stone', x + c * 0.4, y - 0.3, z + s * 0.4, 0.2, 2.6, 1.05, -yaw);
  }
  // The Nine Maidens: a ring of nine, one lying where she fell.
  const m = at('stones');
  for (let i = 0; i < 9; i++) {
    const t = i / 9 * TAU, x = m.x + Math.cos(t) * 16, z = m.z + Math.sin(t) * 16;
    if (i === 6) { K.box('stone', x, Y(x, z) - 0.3, z, 2.6, 0.9, 0.8, t); continue; }
    K.menhir('stone', x, z, 0.9 + hash2(i, 1) * 0.3, 3.4 + hash2(i, 4) * 1.6, -t, (hash2(i, 8) - 0.5) * 0.12);
  }
}

function rimeholt(K) {
  // Frostwatch: a stone watchtower, a wall round its yard, two long houses under snow-dark roofs.
  const f = at('frostwatch');
  K.tower('frost:stone', f.x, f.z - 10, 5, 20, 'roof_4', { steep: 1.3 });
  for (const [ax, az, bx, bz, gap] of [[-24, -22, 24, -22, 0], [24, -22, 24, 22, 0], [24, 22, -24, 22, 3], [-24, 22, -24, -22, 0]]) K.wall('frost:rubble', f.x + ax, f.z + az, f.x + bx, f.z + bz, 1.2, 3.4, { gap });
  K.house(f.x - 12, f.z + 8, 7, 4, 3.6, 0, 'wall_18', 'roof_4', { chimney: 4 });
  K.house(f.x + 12, f.z + 8, 7, 4, 3.6, 0, 'wall_20', 'roof_4', { chimney: -4 });
  // The Frozen Shrine: Tessariel's. Four pillars and a lintel round a T of white stone, all in ice.
  const s = at('shrine'), sy = Y(s.x, s.z);
  K.box('frost:stone', s.x, sy - 0.4, s.z, 4.5, 0.8, 4.5, 0.3);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.drum('frost:stone', s.x + sx * 3.4, sy + 0.4, s.z + sz * 3.4, 0.45, 5, 10);
  K.box('frost:stone', s.x, sy + 5.4, s.z, 4.2, 0.6, 4.2, 0.3, { collide: false });
  K.box('pale:stone', s.x, sy + 0.4, s.z, 0.3, 3.2, 0.3, 0.3);
  K.box('pale:stone', s.x, sy + 3.0, s.z, 1.3, 0.3, 0.3, 0.3, { collide: false });
  for (let i = 0; i < 14; i++) { const t = i / 14 * TAU; K.spike('ice', s.x + Math.cos(t) * 2.6, sy + 0.4, s.z + Math.sin(t) * 2.6, 0.25, 1 + hash2(i, 3) * 2, 4, t); }
}

function gallows(K) {
  // Hangman's Cross: four roads, a gibbet, a cairn and a fingerpost.
  const c = at('crossroads'), cy = Y(c.x, c.z);
  K.box('wood', c.x + 6, cy - 0.5, c.z + 6, 0.2, 7.5, 0.2, 0.6);
  K.box('wood', c.x + 4.8, cy + 6.6, c.z + 6.8, 1.6, 0.22, 0.18, 0.6, { collide: false });
  K.drum('iron', c.x + 3.6, cy + 3.6, c.z + 7.6, 0.45, 1.8, 6, { open: true, collide: false });
  K.drum('rubble', c.x - 6, cy - 0.4, c.z - 6, 2.2, 1.8, 9, { r2: 0.6 });
  K.box('wood', c.x - 2, cy - 0.3, c.z + 3, 0.1, 3, 0.1, 0);
  for (let i = 0; i < 3; i++) K.box('wood', c.x - 2 + 0.7, cy + 2.2 - i * 0.45, c.z + 3, 0.7, 0.14, 0.05, i * 0.9, { collide: false });
  // Mother Grawl's Hut: crooked, low, a cauldron at the door, a fence of bones.
  const w = at('witch'), wy = Y(w.x, w.z);
  K.house(w.x, w.z, 4.5, 3.5, 2.8, 0.5, 'wall_18', 'roof_4', { rise: 4.5, door: 'door_3', chimney: 2.5 });
  K.drum('iron', w.x + 3 * Math.sin(0.5) + 2, wy - 0.1, w.z + 3 * Math.cos(0.5) + 3, 0.8, 0.9, 10, { r2: 0.95, lid: 'lake' });
  for (let i = 0; i < 18; i++) { const t = 0.2 + i / 18 * 5.2, x = w.x + Math.cos(t) * 10, z = w.z + Math.sin(t) * 10; K.box('pale:stone', x, Y(x, z) - 0.2, z, 0.08, 1.3 + hash2(i, 2) * 0.5, 0.08, t, { collide: false }); }
  // The Twisted Grove: its stone table, under the dead wood.
  const g = at('grove');
  K.box('rubble', g.x, Y(g.x, g.z) - 0.3, g.z, 2.6, 1.2, 1.4, 0.7);
}

function deepwood(K) {
  const h = at('hermit');
  K.house(h.x, h.z, 3.5, 3, 2.6, 2.4, 'wall_17', 'roof_1', { chimney: 2 });
  for (let i = 0; i < 5; i++) K.box('wood', h.x + 6 + i * 0.9, Y(h.x + 6 + i * 0.9, h.z + 4) - 0.1, h.z + 4, 0.35, 0.25, 2, 0, { collide: false });
}

function sorrowhorn(K) {
  // The Broken Stair: the way onto the mountain, a gate of two great piers, its arch fallen across the road.
  const s = at('stair'), sy = Y(s.x, s.z), yaw = Math.atan2(MOUNT.x - s.x, MOUNT.z - s.z);
  const c = Math.cos(yaw), sn = Math.sin(yaw);
  for (const side of [-1, 1]) K.box('pale:stone', s.x + c * side * 6, sy - 1, s.z - sn * side * 6, 2, 14, 2, -yaw);
  K.box('pale:stone', s.x + c * 1.5 + sn * 5, sy - 0.6, s.z - sn * 1.5 + c * 5, 6, 1.6, 1.4, -yaw + 0.25);
  for (let i = 0; i < 8; i++) K.box('stone', s.x + sn * (8 + i * 1.4), sy - 1 + i * 0.4, s.z + c * (8 + i * 1.4), 3.6, 1, 0.7, -yaw, { collide: false });
  // Greywatch, high on the shoulder: a ruined tower and its wall.
  const gx = MOUNT.x + 820, gz = MOUNT.z + 760;
  K.tower('pale:rubble', gx, gz, 6, 18, null);
  K.wall('pale:rubble', gx - 16, gz + 10, gx + 18, gz + 14, 1.4, 5, { ruin: true });
  K.spots.greywatch = [gx, Y(gx, gz), gz];
  // The Crown of Teeth (the top, as nothing else in the land): the Rimeglass, a frozen lake in the caldera; in it, a spire of black glass
  // that the ice has climbed; round the shelf, twelve pale pillars with nothing on them, and black teeth along the rim.
  const lake = WATERS.find((w) => w.key === 'rimeglass'), ly = waterLevel(lake);
  K.disc('ice', MOUNT.x, ly, MOUNT.z, MOUNT.lake + 2, 48);
  for (let i = 0; i < 9; i++) {
    const t = i / 9 * TAU, r = i ? 6 + hash2(i, 1) * 5 : 0;
    K.spike('obsidian', MOUNT.x + Math.cos(t) * r, ly - 1, MOUNT.z + Math.sin(t) * r, i ? 2.4 + hash2(i, 2) * 1.8 : 8, i ? 16 + hash2(i, 3) * 20 : 84, i ? 5 : 7, t, [(hash2(i, 4) - 0.5) * 0.3, (hash2(i, 5) - 0.5) * 0.3]);
  }
  for (let i = 0; i < 26; i++) { const t = i / 26 * TAU; K.spike('ice', MOUNT.x + Math.cos(t) * 7.5, ly + 3 + hash2(i, 6) * 26, MOUNT.z + Math.sin(t) * 7.5, 0.6, 2 + hash2(i, 7) * 3, 4, t, [Math.cos(t) * 0.5, Math.sin(t) * 0.5]); }
  for (let i = 0; i < 12; i++) {
    const t = i / 12 * TAU, x = MOUNT.x + Math.cos(t) * (MOUNT.lake + 26), z = MOUNT.z + Math.sin(t) * (MOUNT.lake + 26);
    K.drum('pale:stone', x, Y(x, z) - 0.5, z, 1.2, i % 4 === 1 ? 4 : 11, 10);
  }
  for (let i = 0; i < 40; i++) {
    const t = i / 40 * TAU + hash2(i, 9) * 0.1, r = MOUNT.crown - 6 + hash2(i, 10) * 14, x = MOUNT.x + Math.cos(t) * r, z = MOUNT.z + Math.sin(t) * r;
    K.spike('obsidian', x, Y(x, z) - 2, z, 2 + hash2(i, 11) * 2, 8 + hash2(i, 12) * 16, 5, t, [(hash2(i, 13) - 0.5) * 0.4, (hash2(i, 14) - 0.5) * 0.4]);
  }
}


// Every seal's place: the sites that have one, and Bellmourn's own beside the south road.
export const SEALS = [{ key: 'bellmourn', x: 7.6, z: 86, name: 'Bellmourn' }].concat(
  Object.keys(SITES).filter((k) => SITES[k].portal).map((k) => {
    const s = SITES[k];
    // (Off to one side of each place, on its own ground: where a seal stood in the first game, at the edge of things.)
    const off = { farm: [-30, -26], hamlet: [6, 14], falls: [-48, -10], belltower: [-6, 26], sallow: [118, 24], abbey: [36, 22], khel: [10, 46], keep: [112, 18], stones: [0, 30], frostwatch: [0, 40], crossroads: [-14, 16], stair: [-20, 14], crown: [MOUNT.lake + 40, 0] }[k] || [0, s.r * 0.7];
    return { key: k, ...flattest(s.x + off[0], s.z + off[1]), name: s.name };
  }));

// The flattest ground for a seal's dais within 16 m of where it was meant to go: how far the land under it rises and falls,
// and a little for going further.
function flattest(x0, z0) {
  const R = 0.5 * PORTAL_MODELS.ground.scale;
  let best = null;
  for (const r of [0, 4, 8, 12, 16]) for (let k = 0; k < (r ? 12 : 1); k++) {
    const x = x0 + Math.cos(k / 12 * TAU) * r, z = z0 + Math.sin(k / 12 * TAU) * r;
    let hi = -Infinity, lo = Infinity;
    for (let i = 0; i < 16; i++) for (const q of [0, R * 0.5, R]) {
      const g = terrainHeight(x + Math.cos(i / 16 * TAU) * q, z + Math.sin(i / 16 * TAU) * q);
      hi = Math.max(hi, g); lo = Math.min(lo, g);
    }
    const score = hi - lo + r * 0.02;
    if (!best || score < best.score) best = { x, z, score };
  }
  return { x: Math.round(best.x * 10) / 10, z: Math.round(best.z * 10) / 10 };
}

let built = null;
// Everything, once: { parts: Map(layer -> {pos, nrm, uv, idx}), colliders, spots }.
export function buildSites() {
  if (built) return built;
  const K = new Kit();
  downs(K); fen(K); rustwood(K); ashen(K); barrow(K); rimeholt(K); gallows(K); deepwood(K); sorrowhorn(K);
  buildDelves(K, portalWall); warrensMouth(K);
  // (The Test Dungeon's white hall, out past the world's west edge: src/core/testhall.js.)
  buildHall(K);
  for (const s of SEALS) K.seal(s.key, s.x, s.z, Math.atan2(-s.z, -s.x));
  built = { parts: K.parts, colliders: K.colliders, spots: K.spots, floors: K.floors };
  return built;
}
