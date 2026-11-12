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
import { BARROWS, CLIFF, MOUNT, POOL, SITES, WATERS, routeDist, waterLevel } from './lands.js';
import { hash2, vnoise } from './terrain-noise.js';
import { DELVES, PORTAL_PAD, caveFloorY } from './dungeon.js';
import { buildDelves } from './delve-build.js';
import { buildHall } from './testhall.js';
import { PIECES, cinderford, lesser, street, thornwick, way } from './places.js';

const TAU = Math.PI * 2;
// World metres to one repeat of each kind of painting, across and up.
const TILE = { wall: [7, 4.2], roof: [4, 2.3], stone: [3, 1.7], rubble: [3, 1.7], wood: [2.4, 1.4], door: [1.8, 2.6], cloth: [2, 2] };
const tileOf = (layer) => {
  const n = layer.replace(/^(dark|pale|frost):/, '');
  return n.startsWith('wall') || n === 'door_wall' ? TILE.wall : n.startsWith('roof') ? TILE.roof : n.startsWith('door') ? TILE.door : TILE[n] || TILE.cloth;
};

export class Kit {
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
    if (o.foot !== false && lo < y - 0.2) this.box(o.foot || 'rubble', x, lo - 0.3, z, hx + 0.12, y - lo + 0.5, hz + 0.12, yaw, { collide: false });
    this.box(wall, x, y, z, hx, h + 0.3, hz, yaw, { top: false });
    this.gable(roof, wall, x, y + h + 0.3, z, hx, hz, o.rise ?? Math.min(hx, hz) * 0.85, yaw);
    const d = [x + dx * c + (hz + 0.03) * s, z - dx * s + (hz + 0.03) * c];
    this.quad(o.door || 'door_1', [d[0] - 0.8 * c, y + 0.3, d[1] + 0.8 * s], [d[0] + 0.8 * c, y + 0.3, d[1] - 0.8 * s], [d[0] + 0.8 * c, y + 2.6, d[1] - 0.8 * s], [d[0] - 0.8 * c, y + 2.6, d[1] + 0.8 * s], [s, 0, c], [[0, 1], [1, 1], [1, 0], [0, 0]]);
    const gd = terrainHeight(d[0] + 0.6 * s, d[1] + 0.6 * c);
    if (o.foot !== false && gd < y) this.box('stone', d[0] + 0.5 * s, gd - 0.4, d[1] + 0.5 * c, 1.0, y + 0.3 - gd + 0.4 - 0.12, 0.5, yaw, { collide: false });
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
  // Millhaven Farm: the farmhouse, the barn and its cart shed, three fenced fields with the corn stooked in one, ricks, a
  // sty, a well. (South of the Hill Road and east of the Mill Lane, which leaves it here.)
  const f = at('farm');
  K.house(f.x - 12, f.z + 4, 7.5, 5, 6.5, 0.1, 'wall_14', 'roof_1', { chimney: 4.5, lamp: 1 });
  K.house(f.x + 30, f.z + 14, 7, 9, 5.5, Math.PI / 2 + 0.1, 'wood', 'roof_3', { door: 'door_3' });
  K.leanTo(f.x + 30, f.z + 28.5, 0.1, 5, 2.4, 3, 'roof_3');
  K.cart(f.x + 28.5, f.z + 29, 0.1 + Math.PI / 2, { load: 'cloth_oat' });
  for (const [dx, dz, w, d] of [[-40, 34, 17, 11], [-30, 68, 15, 11], [64, 44, 13, 9]]) {
    const x = f.x + dx, z = f.z + dz;
    K.fence([[x - w, z - d], [x + w, z - d], [x + w, z + d], [x - w, z + d], [x - w, z - d + 3]]);
  }
  for (let i = 0; i < 14; i++) { const x = f.x - 52 + (i % 5) * 6 + hash2(i, 2) * 2, z = f.z + 28 + Math.floor(i / 5) * 6 + hash2(i, 5) * 2; K.cone('cloth_oat', x, Y(x, z) - 0.1, z, 0.55, 1.3, 6, i); }
  for (const [dx, dz, r] of [[6, 30, 1.7], [10.5, 31, 1.4], [8, 35, 1.9]]) K.hayrick(f.x + dx, f.z + dz, r, r * 1.6);
  K.well(f.x - 1, f.z + 12, 0.4);
  K.trough(f.x + 20, f.z + 6, 1.2); K.woodpile(f.x - 20.5, f.z + 9, 0.1 + Math.PI / 2, 1.6, 1.1);
  K.stump(f.x - 18, f.z + 12, 0.35, 0.55);
  K.washing(f.x - 16, f.z + 13, f.x - 9, f.z + 15.5);
  // (The sty: a low wall round a little house.)
  for (const [ax, az, bx, bz] of [[-4, 22, 3, 22], [3, 22, 3, 28], [3, 28, -4, 28], [-4, 28, -4, 24]]) K.wall('rubble', f.x + ax, f.z + az, f.x + bx, f.z + bz, 0.4, 0.9);
  K.house(f.x + 1, f.z + 26, 1.3, 1.1, 1.0, -Math.PI / 2, 'wood', 'roof_3', { door: 'door_3', rise: 0.7 });
  K.goods(f.x + 23, f.z + 2, 5, 1.6); K.lantern(f.x - 4, f.z + 0.5, 2.6, 2);
  K.spots.farm_yard = [f.x + 6, Y(f.x + 6, f.z + 8), f.z + 8, Math.PI];
  // The windmill on its rise: a tapering tower on a footing, a gallery round it, a cap, four sails stopped at a slant; the
  // miller's house, his cart and a stone worn out.
  const m = at('mill'), my = Y(m.x, m.z);
  K.drum('stone', m.x, my - 0.6, m.z, 4.7, 1.3, 8);
  K.drum('wall_09', m.x, my - 0.5, m.z, 4.2, 13, 8, { r2: 3.2, collide: false });
  K.drum('wood', m.x, my + 4.4, m.z, 5.3, 0.16, 8, { r2: 5.3, collide: false });
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU, c = Math.cos(a), s = Math.sin(a); K.beam('wood', [m.x + c * 5.2, my + 4.5, m.z + s * 5.2], [m.x + c * 5.2, my + 5.5, m.z + s * 5.2], 0.08); K.beam('wood', [m.x + c * 5.1, my + 4.4, m.z + s * 5.1], [m.x + c * 3.95, my + 2.6, m.z + s * 3.95], 0.1); }
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU, b = (i + 1.5) / 8 * TAU; K.beam('wood', [m.x + Math.cos(a) * 5.2, my + 5.45, m.z + Math.sin(a) * 5.2], [m.x + Math.cos(b) * 5.2, my + 5.45, m.z + Math.sin(b) * 5.2], 0.07); }
  K.cone('roof_2', m.x, my + 12.5, m.z, 4, 4.2, 8);
  // (Its door to the lane, on the north; the sails to the south.)
  K.quad('door_2', [m.x + 0.8, my + 0.7, m.z - 4.22], [m.x - 0.8, my + 0.7, m.z - 4.22], [m.x - 0.8, my + 3.1, m.z - 4.22], [m.x + 0.8, my + 3.1, m.z - 4.22], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  K.steps('stone', m.x, m.z - 4.75, Math.PI, 1.1, 3, { rise: 0.2, tread: 0.4, y: my + 0.1 });
  const hub = [m.x, my + 11.5, m.z + 4.6];
  K.beam('wood', [m.x, my + 11.5, m.z + 2.6], [m.x, my + 11.5, m.z + 4.9], 0.5);
  for (let i = 0; i < 4; i++) {
    const a = 0.4 + i * Math.PI / 2, cx = Math.cos(a), cy = Math.sin(a);
    const P = (r, w, d = 0) => [hub[0] + cx * r - cy * w, hub[1] + cy * r + cx * w, hub[2] + d];
    K.beam('wood', P(0, 0), P(10.2, 0), 0.22);
    K.quad('cloth_oat', P(2, 0.15, 0.05), P(9.6, 0.15, 0.05), P(9.6, 1.7, 0.3), P(2, 1.7, 0.3));
    for (let q = 0; q < 6; q++) K.beam('wood', P(2 + q * 1.52, 0, 0.02), P(2 + q * 1.52, 1.75, 0.3), 0.06);
    K.beam('wood', P(2, 1.72, 0.3), P(9.6, 1.72, 0.3), 0.07);
  }
  // (The tail pole, down to the ground on the north-east, that turns the cap.)
  K.beam('wood', [m.x + 2, my + 12.6, m.z - 2.4], [m.x + 7.5, my + 0.4, m.z - 9], 0.16);
  K.house(m.x - 13, m.z - 3, 4.2, 3.4, 3.2, Math.PI / 2 + 0.2, 'wall_09', 'roof_2', { chimney: -2.5, lamp: -1 });
  K.cart(m.x + 8, m.z - 13, 2.2, { load: 'cloth_oat' });
  for (let i = 0; i < 5; i++) K.sack(m.x + 2.2 + (i % 3) * 0.6, m.z - 5.6 - Math.floor(i / 3) * 0.6, 0.36);
  K.wheel(m.x - 3.2, my + 0.7, m.z - 4.9, 0.5, 0.75, 'stone');
  K.fence([[m.x - 20, m.z - 9], [m.x - 20, m.z + 6], [m.x - 6, m.z + 8]]);
  // Millhaven: a street of homes along the Hill Road, a green with the well and the market pillar, a smithy, a tithe barn,
  // a graveyard behind its wall, folds and ricks out at its ends.
  const hm = at('hamlet'), st = street(hm.x, hm.z, way(1900, 60, 2040, 0), way(2040, 0, 2300, -60));
  const homes = [
    [-62, 15, 'wall_16', 'roof_1', 5.5, 4.2], [-38, 14, 'wall_13', 'roof_4', 5, 4.4], [-13, 15, 'wall_15', 'roof_3', 6, 4.5], [34, 15, 'wall_19', 'roof_2', 5.2, 4.2], [58, 14, 'wall_10', 'roof_1', 5.5, 4.5],
    [-52, -14, 'wall_12', 'roof_3', 5, 4.2], [-28, -15, 'wall_17', 'roof_1', 5.6, 4.4], [42, -14, 'wall_14', 'roof_4', 5.5, 4.5], [66, -15, 'wall_11', 'roof_3', 4.8, 4],
  ];
  homes.forEach(([t, off, w, r, hx, hz], i) => {
    const p = st(t, off);
    K.house(p.x, p.z, hx, hz, 4.2 + (i % 3) * 0.4, p.yaw, w, r, { chimney: i % 2 ? -3 : 3, lamp: i % 3 === 0 ? 1 : 0 });
    // (Behind each: a woodpile, a water butt, a line of washing or a rick.)
    const q = st(t + 3, off + Math.sign(off) * (hz + 3));
    if (i % 3 === 0) K.woodpile(q.x, q.z, p.yaw, 1.3, 0.9); else if (i % 3 === 1) K.hayrick(q.x, q.z, 1.3, 2.2); else { const e = st(t - 4, off + Math.sign(off) * (hz + 3.5)); K.washing(q.x, q.z, e.x, e.z); }
    const bq = st(t + hx + 0.8, off - Math.sign(off) * (hz - 1)); K.barrel(bq.x, bq.z);
  });
  // The green, north of the road at the middle: the well, the pillar on its steps, stalls on a market day, benches.
  const g = st(10, 15);
  K.well(g.x - 5, g.z - 2, 0.4);
  K.drum('stone', g.x + 4, Y(g.x + 4, g.z) - 0.6, g.z, 1.9, 0.9, 8); K.drum('stone', g.x + 4, Y(g.x + 4, g.z) + 0.3, g.z, 1.2, 0.3, 8, { collide: false });
  K.drum('stone', g.x + 4, Y(g.x + 4, g.z) + 0.6, g.z, 0.3, 3.2, 8, { r2: 0.22, collide: false }); K.drum('stone', g.x + 4, Y(g.x + 4, g.z) + 3.8, g.z, 0.42, 0.5, 6, { r2: 0.1, collide: false });
  for (const [t, off, c, k] of [[2, 9.5, 'cloth_oat', 0], [18, 9, 'cloth_red', 1], [13, 22, 'cloth_oat', 2]]) { const p = st(t, off); K.stall(p.x, p.z, p.yaw, c, k); }
  { const p = st(4, 21); K.bench(p.x, p.z, p.yaw); const q = st(22, 16); K.lantern(q.x, q.z, 2.8, 1); const sp = st(3, 7); K.spots.millhaven_green = [sp.x, Y(sp.x, sp.z), sp.z, sp.yaw]; }
  // The smithy, south of the road: an open shed, the forge's fire, the anvil's block, iron leaning on the wall.
  { const p = st(-6, -15); K.house(p.x, p.z, 4.5, 3.6, 3.6, p.yaw, 'wall_18', 'roof_2', { chimney: 3.2 });
    const q = st(2.5, -13); K.leanTo(q.x, q.z, p.yaw, 2.8, 2.2, 2.9, 'roof_2'); const a = st(2.5, -10.5);
    K.stump(a.x, a.z, 0.3, 0.6); K.box('iron', a.x, Y(a.x, a.z) + 0.6, a.z, 0.3, 0.2, 0.12, p.yaw, { collide: false });
    const fr = st(4, -14); K.box('stone', fr.x, Y(fr.x, fr.z) - 0.2, fr.z, 0.7, 1.1, 0.6, p.yaw); K.cone('flame', fr.x, Y(fr.x, fr.z) + 0.85, fr.z, 0.35, 0.5, 6);
    const tr = st(-0.4, -10.2); K.trough(tr.x, tr.z, p.yaw, 0.7); const c = st(8, -11); K.cart(c.x, c.z, p.yaw + 0.5, { wreck: false }); }
  // The tithe barn at the east end, and the graveyard behind its wall at the west.
  { const p = st(86, 20); K.house(p.x, p.z, 9, 5.5, 5.2, p.yaw, 'wood', 'roof_3', { door: 'door_3', rise: 5 }); const q = st(74, 22); K.hayrick(q.x, q.z, 1.8, 2.8); const r = st(98, 12); K.cart(r.x, r.z, 0.4, { load: 'cloth_oat' }); }
  { const p = st(-84, 22), y = p.yaw; K.graves(p.x, p.z, y, 6, 5, 'stone');
    const F = K.frame(p.x, p.z, y), c = [[-8.5, -7.5], [8.5, -7.5], [8.5, 7.5], [-8.5, 7.5]].map(([u, w]) => F(u, w));
    K.wall('rubble', ...c[0], ...c[1], 0.5, 1); K.wall('rubble', ...c[1], ...c[2], 0.5, 1); K.wall('rubble', ...c[3], ...c[0], 0.5, 1);
    K.wall('rubble', ...c[3], ...F(-2, 7.5), 0.5, 1); K.wall('rubble', ...F(2, 7.5), ...c[2], 0.5, 1); }
  // A fold of hurdles at the south-east, and a signpost where the road comes in from the west.
  { const p = st(70, -34); K.fence([[p.x - 8, p.z - 6], [p.x + 8, p.z - 6], [p.x + 8, p.z + 6], [p.x - 8, p.z + 6], [p.x - 8, p.z - 3]]); K.trough(p.x + 2, p.z - 4.5, 0, 1); const s = st(-92, -5); K.signpost(s.x, s.z, [1.2, -1.9]); }
  // Brightwater: the falls over the cliff, the pool under them, boulders; a fisher's hut on the west shore, his boat and
  // racks, a plank landing, stepping stones across the outflow.
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
  for (let i = 0; i < 16; i++) {
    const a = 0.9 + i * 0.3, r = pool.r + 2 + hash2(i, 1) * 5, x = pool.x + Math.cos(a) * r, z = pool.z + Math.sin(a) * r;
    if (Math.hypot(x - 2574.4, z + 124) < 9) continue;
    K.rock('rubble', x, z, 1.1 + hash2(i, 3) * 1.6, 1.3 + hash2(i, 5) * 1.6, { turn: a });
  }
  for (const [dx, dz, r] of [[22, -12, 3.2], [24, 10, 2.6], [17, -20, 2], [19, 19, 1.8]]) K.rock('rubble', pool.x + dx, pool.z + dz, r, r * 0.9, { y: py - 0.6 });
  { const hx = pool.x - 41, hz = pool.z + 26;
    K.house(hx, hz, 3.4, 2.8, 2.7, -0.9, 'wall_17', 'roof_1', { chimney: 2, lamp: 1 });
    K.rack(hx + 6, hz + 5.5, 0.4, 1.6); K.rack(hx + 4.5, hz + 8.5, 0.5, 1.6, 'cloth_oat', 1.5);
    K.boat(pool.x - 33.5, Y(pool.x - 33.5, pool.z + 14) - 0.05, pool.z + 14, 0.9, 4, { roll: 0.25 });
    K.boat(pool.x - 21, py - 0.12, pool.z + 6, 0.3, 4.2, { collide: false });
    K.bridge(pool.x - 33, pool.z + 5, pool.x - 24, pool.z + 3, 0.9, { up: 0.25, rail: false });
    K.barrel(hx + 3.2, hz - 3.4); K.crate(hx + 4.1, hz - 2.8, 0.35, 0.4); K.woodpile(hx - 4.6, hz + 1, -0.9, 1.1, 0.8);
    K.bench(pool.x - 30, pool.z + 30, 2.4); K.signpost(2486, -104, [-1.5, 1.3]);
    K.spots.falls_hut = [hx + 3.2, Y(hx + 3.2, hz + 3.6), hz + 3.6, 0.7]; }
  belltower(K);
  // The Cairnfield, on the open down west of the Abbey Road: dozens of cairns, some opened, round a great one in its kerb.
  const cf = at('cairnfield');
  K.cairn(cf.x, cf.z, 4.2, 4.4);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, x = cf.x + Math.cos(a) * 7.5, z = cf.z + Math.sin(a) * 7.5; K.rock('rubble', x, z, 0.7 + hash2(i, 3) * 0.3, 0.7, { turn: a, collide: false }); }
  K.menhir('rubble', cf.x + 10.5, cf.z - 3, 0.7, 3.6, 0.6, 0.08);
  for (let i = 0; i < 40; i++) {
    const a = hash2(i, 21) * TAU, r = 13 + hash2(i, 22) * 34, x = cf.x + Math.cos(a) * r, z = cf.z + Math.sin(a) * r, s = 0.9 + hash2(i, 23) * 1.1;
    if (routeDist(x, z).d < 5) continue;
    K.cairn(x, z, s, s * (0.9 + hash2(i, 24) * 0.5), 'rubble', i % 5 === 2);
  }
  // (Somebody's been digging: a barrow, a spade stuck in the spoil, a marker with a rag on it.)
  K.heap('dark:rubble', cf.x - 9, cf.z + 9, 1.6, 0.9, 7, { collide: false }); K.cart(cf.x - 12.5, cf.z + 11, 0.7, { len: 1.0 });
  K.beam('wood', [cf.x - 9.4, Y(cf.x - 9.4, cf.z + 8.6) + 0.5, cf.z + 8.6], [cf.x - 9.1, Y(cf.x - 9.4, cf.z + 8.6) + 1.8, cf.z + 8.9], 0.05);
  K.banner(cf.x + 3, cf.z + 12, 3.2, 1, 'cloth_oat', { w: 0.5, len: 0.9 });
}

// The Bell Tower of the Four Watches, Tessariel's, on Bell Knoll: a pale shaft on a battered plinth, buttressed at its
// corners, three stages of slits under string courses; a belfry of paired arches with the four bells in their frame over the
// louvres; a parapet with pinnacles, the copper spire and its gilt finial. Steps and a porch to the door on its south, his
// sunburst over it. Round it the Bellwright's yard: his house, wood and oil store, the well, the ladder he oils the bells
// from, an old cracked bell; the gate to the Knoll Path; and out on the knoll a ring of watch-stones.
function belltower(K) {
  const b = at('belltower'), x = b.x, z = b.z, by = Y(x, z), S = 'pale:stone', G = 'pale:rubble', SP = 'frost:roof_2', Q = Math.PI / 4, R2 = Math.SQRT2;
  K.drum(G, x, by - 1, z, 6.0 * R2, 4, 4, { r2: 5.0 * R2, turn: Q, collide: false, lid: S });
  K.box(S, x, by + 3, z, 4.6, 24.5, 4.6, 0, { top: 'wood', collide: false });
  K.collide(x, z, 5.6, 5.6, 0, by + 27);
  for (const [yy, hw, hh] of [[10.6, 4.9, 0.4], [18.6, 4.9, 0.4], [26.9, 4.85, 0.3], [27.2, 5.1, 0.5]]) K.box(S, x, by + yy, z, hw, hh, hw, 0, { collide: false });
  // Each face: its way out, and a point u along it, d out from the tower's middle, v up.
  const faces = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  faces.forEach(([nx, nz], fi) => {
    const F = (u, d, v) => [x + nx * d - nz * u, by + v, z + nz * d + nx * u];
    // The buttresses, a pair to a corner, stepping in at each string course under a sloped head.
    for (const u of [-3.95, 3.95]) for (const [y0, y1, pr] of [[-1, 10.6, 1.5], [10.6, 18.6, 1.0], [18.6, 26.2, 0.55]]) {
      const c = F(u, 4.6 + pr / 2, 0);
      K.box(S, c[0], by + y0, c[2], nz ? 0.55 : pr / 2, y1 - y0, nz ? pr / 2 : 0.55, 0, { collide: false });
      K.quad(S, F(u - 0.6, 4.6 + pr + 0.05, y1), F(u + 0.6, 4.6 + pr + 0.05, y1), F(u + 0.6, 4.6, y1 + 1.0), F(u - 0.6, 4.6, y1 + 1.0));
      for (const sd of [-1, 1]) K.tri(S, F(u + sd * 0.56, 4.6 + pr, y1), F(u + sd * 0.56, 4.6, y1), F(u + sd * 0.56, 4.6, y1 + 1.0));
    }
    // The slits: dark, under a little hood, a sill under them. (The south face's first stage has the door and the sunburst.)
    for (const [v, hh, uu] of [[5.6, 2.0, [0]], [13.0, 2.4, [0]], [21.0, 2.6, [-1.3, 1.3]]]) {
      if (fi === 0 && v < 6) continue;
      for (const u of uu) {
        K.quad('water', F(u - 0.2, 4.63, v), F(u + 0.2, 4.63, v), F(u + 0.2, 4.63, v + hh), F(u - 0.2, 4.63, v + hh), [nx, 0, nz]);
        K.tri('water', F(u - 0.2, 4.63, v + hh), F(u + 0.2, 4.63, v + hh), F(u, 4.63, v + hh + 0.4));
        const hd = F(u, 4.72, v + hh + 0.45), sl = F(u, 4.72, v - 0.2);
        K.box(S, hd[0], hd[1], hd[2], nz ? 0.5 : 0.14, 0.18, nz ? 0.14 : 0.5, 0, { collide: false });
        K.box(S, sl[0], sl[1], sl[2], nz ? 0.4 : 0.12, 0.16, nz ? 0.12 : 0.4, 0, { collide: false });
      }
    }
    // The belfry's face: two arches side by side, louvres across their lower half.
    const yaw = Math.atan2(nx, nz);
    for (const u of [-1.6, 1.6]) {
      const c = F(u, 4.2, 0);
      K.arch(S, c[0], c[2], yaw, { a: 1.25, pw: 0.35, hs: 4.4, top: 8.2, t: 0.8, y: by + 27.7, collide: false });
      for (const v of [0.5, 1.3, 2.1, 2.9]) K.quad('wood', F(u - 1.25, 4.5, 27.7 + v), F(u + 1.25, 4.5, 27.7 + v), F(u + 1.25, 3.95, 28.25 + v), F(u - 1.25, 3.95, 28.25 + v));
    }
    // The parapet over it, a pinnacle at the corner.
    const p = F(0, 4.8, 0);
    K.box(S, p[0], by + 36.35, p[2], nz ? 4.6 : 0.2, 1.15, nz ? 0.2 : 4.6, 0, { collide: false });
    for (let k = -3; k <= 3; k++) { const q = F(k * 1.25, 4.8, 0); K.box(S, q[0], by + 37.5, q[2], nz ? 0.32 : 0.2, 0.5, nz ? 0.2 : 0.32, 0, { collide: false }); }
    const cn = F(4.8, 4.8, 0);
    K.box(S, cn[0], by + 35.9, cn[2], 0.5, 2.9, 0.5, 0, { collide: false }); K.cone(S, cn[0], by + 38.8, cn[2], 0.75, 2.4, 4, Q);
    K.drum('fruit2', cn[0], by + 41.15, cn[2], 0.14, 0.28, 5, { collide: false });
  });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box(S, x + sx * 3.9, by + 27.7, z + sz * 3.9, 0.7, 8.2, 0.7, 0, { collide: false });
  K.box(S, x, by + 35.9, z, 5.1, 0.45, 5.1, 0, { collide: false });
  // The bells in their frame: bronze, a great one, two middling and a small, each under its headstock on the cage's beams.
  for (const s of [-1, 1]) { K.beam('wood', [x - 3.5, by + 33.6, z + s * 1.0], [x + 3.5, by + 33.6, z + s * 1.0], 0.28); K.beam('wood', [x + s * 1.0, by + 33.9, z - 3.5], [x + s * 1.0, by + 33.9, z + 3.5], 0.28); }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.beam('wood', [x + sx * 2.9, by + 27.7, z + sz * 2.9], [x + sx * 1.0, by + 33.6, z + sz * 1.0], 0.2);
  for (const [sx, sz, D] of [[0, 1, 1.2], [0, -1, 1.0], [1, 0, 0.9], [-1, 0, 0.78]]) {
    const bx = x + sx * 2.15, bz = z + sz * 2.15;
    K.drum('fruit2', bx, by + 33.2 - D * 1.25, bz, D, D * 0.45, 12, { r2: D * 0.72, collide: false, open: true });
    K.drum('fruit2', bx, by + 33.2 - D * 0.8, bz, D * 0.72, D * 0.8, 12, { r2: D * 0.4, collide: false });
    K.drum('iron', bx, by + 33.2 - D * 1.45, bz, 0.09, D * 0.6, 5, { collide: false });
    K.box('wood', bx, by + 33.2, bz, sx ? 0.18 : D * 0.9, 0.36, sx ? D * 0.9 : 0.18, 0, { collide: false });
  }
  // The spire: copper on an eight-sided drum, a ball and a rod, his sunburst in gilt at the very top, looking four ways.
  K.drum(SP, x, by + 36.35, z, 4.35, 1.3, 8, { turn: Q / 2, collide: false, open: true });
  K.cone(SP, x, by + 37.6, z, 4.6, 5.2, 8, Q / 2); K.drum(SP, x, by + 37.6, z, 3.35, 3.6, 8, { r2: 2.35, turn: Q / 2, collide: false, open: true });
  K.cone(SP, x, by + 41.2, z, 2.35, 11.2, 8, Q / 2);
  // (Pass two: the spire broached in two pitches, a gilt band where they meet, a lucarne on each face.)
  K.drum('fruit2', x, by + 41.0, z, 2.5, 0.3, 8, { r2: 2.45, turn: Q / 2, collide: false, open: true });
  for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const F = (u, d, v) => [x + nx * d - nz * u, by + v, z + nz * d + nx * u];
    K.quad('water', F(-0.45, 3.42, 38.0), F(0.45, 3.42, 38.0), F(0.45, 3.42, 39.3), F(-0.45, 3.42, 39.3), [nx, 0, nz]);
    K.quad(SP, F(-0.8, 3.5, 39.3), F(0, 3.5, 40.2), F(0, 2.4, 40.2), F(-0.8, 2.6, 39.3)); K.quad(SP, F(0.8, 3.5, 39.3), F(0, 3.5, 40.2), F(0, 2.4, 40.2), F(0.8, 2.6, 39.3));
    for (const sd of [-1, 1]) K.quad(S, F(sd * 0.45, 3.45, 37.9), F(sd * 0.62, 3.45, 37.9), F(sd * 0.62, 3.45, 39.3), F(sd * 0.45, 3.45, 39.3), [nx, 0, nz]);
  }
  // (And the watch lamp hung in the belfry's middle, that's seen from the road by night.)
  K.drum('iron', x, by + 30.2, z, 0.3, 0.9, 6, { r2: 0.38, open: true, collide: false }); K.cone('flame', x, by + 30.25, z, 0.26, 0.8, 6); K.beam('iron', [x, by + 31.1, z], [x, by + 33.6, z], 0.05);
  K.drum('fruit2', x, by + 52.2, z, 0.34, 0.6, 6, { r2: 0.2, collide: false }); K.box('fruit2', x, by + 52.7, z, 0.05, 1.9, 0.05, 0, { collide: false });
  K.sunburst('fruit2', x, by + 54.8, z, [0, 1], 1.05); K.sunburst('fruit2', x, by + 54.8, z, [1, 0], 1.05);
  // The door, in a block that stands out of the plinth's batter; a porch before it under its own little roof; five steps.
  const dy = by + 0.95;
  K.box(S, x, by - 1, z + 5.05, 2.05, 5.9, 0.47, 0, { collide: false });
  K.quad('door_4', [x - 1, dy, z + 5.54], [x + 1, dy, z + 5.54], [x + 1, dy + 2.9, z + 5.54], [x - 1, dy + 2.9, z + 5.54], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  K.box(G, x, by - 0.5, z + 6.2, 2.05, 1.45, 0.7, 0, { collide: false });
  K.deck([[x, z + 6.2, 1.2, 0.7, 0, dy]]);
  for (const s of [-1, 1]) K.box(S, x + s * 1.75, by - 0.5, z + 5.95, 0.3, 4.95, 0.45, 0);
  K.arch(S, x, z + 6.65, 0, { a: 1.2, pw: 0.55, hs: 2.3, top: 3.5, t: 0.5, y: dy });
  K.gable('roof_2', S, x, dy + 3.5, z + 6.0, 0.95, 2.05, 1.5, Math.PI / 2, 0.25);
  K.steps(G, x, z + 6.9, 0, 1.2, 5, { rise: 0.19, tread: 0.36, y: by });
  for (const s of [-1, 1]) { K.box(S, x + s * 1.47, by - 0.4, z + 7.8, 0.25, 1.0, 0.92, 0); K.wallLamp(x + s * 1.48, dy + 2.5, z + 6.92, [0, 1]); }
  K.sunburst('fruit2', x, by + 8.5, z + 4.64, [0, 1], 1.6);
  // (Pass two's small things. Pale cloth with his sunburst down the two buttresses by the door; the stair's slits lit on the
  // sides you come from; a dial for the four watches; the old bellwrights' slabs in the yard's corner; a rail down the steps.)
  for (const s of [-1, 1]) { K.hanging('white', x + s * 3.95, by + 9.6, z + 6.1, [0, 1], 0.9, 3.6, 2); K.sunburst('fruit2', x + s * 3.95, by + 8.3, z + 6.2, [0, 1], 0.36); }
  for (const [fx, fz, yy] of [[0, 1, 13.0], [-1, 0, 5.6], [1, 0, 13.0]]) K.quad('flame', [x + fx * 4.64 - fz * 0.12, by + yy + 0.3, z + fz * 4.64 + fx * 0.12], [x + fx * 4.64 + fz * 0.12, by + yy + 0.3, z + fz * 4.64 - fx * 0.12], [x + fx * 4.64 + fz * 0.12, by + yy + 1.5, z + fz * 4.64 - fx * 0.12], [x + fx * 4.64 - fz * 0.12, by + yy + 1.5, z + fz * 4.64 + fx * 0.12], [fx, 0, fz]);
  K.drum(S, x - 6.5, by - 0.3, z + 12.5, 0.55, 1.4, 8, { r2: 0.42 }); K.drum(S, x - 6.5, by + 1.1, z + 12.5, 0.62, 0.1, 8, { collide: false }); K.tri('fruit2', [x - 6.5, by + 1.2, z + 12.2], [x - 6.5, by + 1.2, z + 12.8], [x - 6.5, by + 1.65, z + 12.2]);
  K.graves(x - 13, z - 11.6, 0, 2.6, 0.9, S, 1.7);
  for (const s of [-1, 1]) { K.beam('iron', [x + s * 1.47, by + 1.5, z + 6.95], [x + s * 1.47, by + 1.05, z + 8.7], 0.05); K.cone('flame', x + s * 1.88, dy + 2.05, z + 6.92, 0.1, 0.34, 4); }
  K.windowAt(x + 9.98, by + 1.2, z + 6, [-1, 0], 0.35, 0.6, true);
  // The yard: a low wall of pale rubble, the gate on the south between two piers with a lantern by each.
  const W = 17, N = -14, So = 18;
  K.wall('pale:rubble', x - W, z + N, x + W, z + N, 0.7, 1.5); K.wall('pale:rubble', x + W, z + N, x + W, z + So, 0.7, 1.5); K.wall('pale:rubble', x - W, z + So, x - W, z + N, 0.7, 1.5);
  K.wall('pale:rubble', x - W, z + So, x - 2.6, z + So, 0.7, 1.5); K.wall('pale:rubble', x + 2.6, z + So, x + W, z + So, 0.7, 1.5);
  for (const s of [-1, 1]) {
    const gx = x + s * 2.45, gy = Y(gx, z + So);
    K.box(S, gx, gy - 0.5, z + So, 0.45, 3.2, 0.45, 0); K.cone(S, gx, gy + 2.7, z + So, 0.7, 0.8, 4, Q); K.drum('fruit2', gx, gy + 3.45, z + So, 0.16, 0.3, 5, { collide: false });
    K.lantern(x + s * 4.4, z + So + 1.2, 2.7, s > 0 ? Math.PI : 0);
  }
  K.paving('stone', x, z + 13.3, 8.5, 4.6);
  // The Bellwright's house against the east wall, his wood and his chopping block; the oil store under a lean-to on the
  // north wall; the well; a bench in the sun; the ladder up the west face; and the old first bell, cracked, on its baulks.
  K.house(x + 12.6, z + 4, 3.4, 2.6, 2.9, -Math.PI / 2, 'wall_12', 'roof_2', { chimney: -2.2, lamp: 1 });
  K.woodpile(x + 13.2, z + 9.6, 0, 1.7, 1.15, 0.5); K.stump(x + 10.4, z + 10.2, 0.32, 0.55);
  K.leanTo(x + 9, z - 12.4, 0, 2.6, 1.2, 2.4, 'roof_2');
  K.barrel(x + 7.6, z - 12.3); K.barrel(x + 8.5, z - 12.6); K.crate(x + 10.3, z - 12.4, 0.4, 0.2);
  K.well(x - 11, z + 9.5, 0.3, { roof: 'roof_2' });
  K.bench(x - 8, z + 14.6, 0.2);
  K.ladder(x - 7.6, z - 1.6, x - 4.72, by + 10.4, z - 1.6, 0.62);
  K.box('wood', x - 10.5, by - 0.05, z - 8.2, 1.3, 0.3, 0.14, 0.3, { collide: false }); K.box('wood', x - 10.2, by - 0.05, z - 7.0, 1.3, 0.3, 0.14, 0.3, { collide: false });
  K.drum('fruit2', x - 10.35, by + 0.22, z - 7.6, 1.0, 0.5, 12, { r2: 0.74 }); K.drum('fruit2', x - 10.35, by + 0.72, z - 7.6, 0.74, 0.8, 12, { r2: 0.4, collide: false });
  // Out on the knoll: four watch-stones at the quarters between the winds, and the stumps of the old watch-posts between
  // them; lanterns up the path to the gate.
  for (let i = 0; i < 12; i++) {
    const a = (i + 0.5) / 12 * TAU, px = x + Math.cos(a) * 36, pz = z + Math.sin(a) * 36;
    if (i % 3 === 1) K.menhir(S, px, pz, 1.0, 4.6 + hash2(i, 3), -a, (hash2(i, 5) - 0.5) * 0.1);
    else K.drum('bark', px, Y(px, pz) - 0.4, pz, 0.28, 1.5 + hash2(i, 7) * 1.4, 6, { r2: 0.2 });
  }
  K.lantern(x + 2.8, z + 31, 2.7, Math.PI); K.lantern(x - 2.8, z + 44, 2.7, 0);
  K.spots.bellwright = [x + 2.8, by, z + 9.6, Math.PI];
  K.spots.hale = [x - 4, by, z + 9.6, Math.PI];
}

function fen(K) {
  for (const key of ['sallow', 'fenpool1', 'fenpool2']) {
    const w = WATERS.find((q) => q.key === key);
    K.disc('lake', w.x, waterLevel(w), w.z, w.r + 1, 48);
  }
  // Sallowmere: the east jetty, half gone into the water, a boat tied to it; and where the Fen Way comes down to the south
  // shore, the eel-fishers' huts on their legs, a landing you can walk out on, boats, racks of nets, a smoke-shed.
  const s = at('sallow'), wy = waterLevel(WATERS.find((q) => q.key === 'sallow'));
  for (let i = 0; i < 9; i++) {
    const x = s.x + 96 - i * 3, z = s.z + 10;
    if (i < 7) K.box('wood', x, wy + 0.25 - i * 0.05, z, 1.5, 0.12, 1.2, 0.02 * i, { collide: false });
    K.box('wood', x, wy - 1.5, z + 1.2, 0.12, 2, 0.12, 0, { collide: false });
    K.box('wood', x, wy - 1.5, z - 1.2, 0.12, 2 + (i % 3) * 0.5, 0.12, 0, { collide: false });
  }
  K.boat(s.x + 84, wy - 0.15, s.z + 13.2, 0.1, 4.4, { collide: false });
  const sh = (dx) => { let z = s.z + 80; while (z < s.z + 120 && Y(s.x + dx, z) < wy + 0.35) z += 0.5; return z; };   // (the south shore's edge at x)
  [[-34, 0.15, 'wall_17'], [-17, -0.1, 'wall_18'], [16, 0.1, 'wall_20'], [33, -0.2, 'wall_17']].forEach(([dx, yaw, wall], i) => {
    const x = s.x + dx, z = sh(dx) + 6 + (i % 2) * 2.5, y = Math.max(Y(x, z), wy) + 1.1;
    for (const [px, pz] of [[-2.6, -2], [2.6, -2], [2.6, 2], [-2.6, 2]]) K.box('bark', x + px, Y(x + px, z + pz) - 0.6, z + pz, 0.13, y - Y(x + px, z + pz) + 0.9, 0.13, yaw, { collide: false });
    K.house(x, z, 3.1, 2.5, 2.4, yaw, wall, 'roof_4', { y: y + 0.3, rise: 2.2, door: 'door_3', foot: false });
    K.box('wood', x, y - 0.12, z, 3.5, 0.14, 2.9, yaw, { collide: false });
    K.ladder(x + 0.2, z + 4.2, x + 0.2, y, z + 2.95, 0.55);
    if (i % 2) K.rack(x + 5.5, z + 0.5, 1.3, 1.5); else K.barrel(x - 4.2, z + 1.2);
  });
  { const z0 = sh(0);
    K.bridge(s.x, z0 - 0.5, s.x, z0 - 19, 2.1, { up: 0.3 });
    K.boat(s.x + 3.2, wy - 0.15, z0 - 11, Math.PI / 2 + 0.1, 4.2, { collide: false }); K.boat(s.x - 3.4, wy - 0.15, z0 - 6, -Math.PI / 2, 3.8, { collide: false });
    K.boat(s.x + 8, Y(s.x + 8, z0 + 3) + 0.5, z0 + 3, 0.5, 4, { roll: 0, layer: 'wood' });
    K.leanTo(s.x - 9, z0 + 16, Math.PI, 2.2, 1.6, 2.4, 'roof_4'); K.rack(s.x - 9, z0 + 13.2, Math.PI, 1.6, 'cloth_oat', 1.6);
    K.rack(s.x + 9.5, z0 + 9, 0.3, 2, 'cloth_oat', 2); K.rack(s.x + 11, z0 + 12, 0.2, 2, 'cloth_oat', 2);
    K.lantern(s.x + 4.4, z0 + 3.5, 2.7, Math.PI); K.lantern(s.x - 4.4, z0 + 22, 2.7, 0);
    K.goods(s.x - 6, z0 + 6.5, 5, 1.5); K.hayrick(s.x + 16, z0 + 17, 1.1, 1.7); K.hayrick(s.x + 18.4, z0 + 16, 0.9, 1.4);
    K.campfire(s.x + 6, z0 + 14.5, true); K.bench(s.x + 6, z0 + 16.6, 0);
    K.spots.sallow_landing = [s.x - 3.6, Y(s.x - 3.6, z0 + 9), z0 + 9, Math.PI]; }
  // The Drowned Chapel: Tessariel's, roofless, its west end sunk in the mire; the T still on its gable, his sunburst under
  // it. Lancets down its sides between buttresses, the chancel arch still standing inside, its dead under pale slabs.
  const c = at('chapel'), cy = Y(c.x, c.z), lanc = (us, y0 = 2.2, y1 = 5) => us.map((u) => ({ u, w: 0.6, y0, y1, round: true }));
  K.pierced('rubble', c.x, c.z - 6, 0, 12, 7.4, 1, lanc([-8, -4, 0, 4, 8]), { ruin: true, y: cy });
  K.pierced('rubble', c.x, c.z + 6, 0, 12, 7.4, 1, lanc([-8, -4, 0, 4, 8]), { ruin: true, y: cy });
  K.pierced('rubble', c.x + 12, c.z, Math.PI / 2, 6.5, 9, 1, lanc([-2.2, 0, 2.2], 3, 6.2), { y: cy });
  K.tri('rubble', [c.x + 12.5, cy + 9, c.z - 6.5], [c.x + 12.5, cy + 9, c.z + 6.5], [c.x + 12.5, cy + 13.2, c.z]); K.tri('rubble', [c.x + 11.5, cy + 9, c.z - 6.5], [c.x + 11.5, cy + 9, c.z + 6.5], [c.x + 11.5, cy + 13.2, c.z]);
  K.pierced('rubble', c.x - 12, c.z, Math.PI / 2, 6.5, 5, 1, [{ u: 0, w: 1.3, y0: 0, y1: 2.6, round: true }], { ruin: true, y: cy });
  for (const u of [-10, -6, -2, 2, 6, 10]) for (const sd of [-1, 1]) K.box('rubble', c.x + u, cy - 0.5, c.z + sd * 6.9, 0.45, 3.6 + hash2(u, sd) * 2.4, 0.5, 0, { collide: false });
  K.arch('rubble', c.x + 5, c.z, Math.PI / 2, { a: 2.6, pw: 0.9, hs: 3.4, t: 0.9, ring: 0.6, y: cy, broken: 0.75 });
  K.box('pale:stone', c.x + 12.62, cy + 11.6, c.z, 0.2, 0.5, 1.5, 0, { collide: false });
  K.box('pale:stone', c.x + 12.62, cy + 9.3, c.z, 0.2, 2.4, 0.42, 0, { collide: false });
  K.sunburst('fruit2', c.x + 12.56, cy + 7.9, c.z, [1, 0], 0.9);
  K.disc('lake', c.x - 4, cy + 0.15, c.z, 7, 20);
  K.box('pale:stone', c.x + 9, cy - 0.2, c.z, 0.9, 1.25, 1.6, 0); K.box('pale:stone', c.x + 9, cy + 1.05, c.z, 1.05, 0.14, 1.8, 0, { collide: false });
  for (const [dx, dz, r, a] of [[-14.5, 3, 1.1, 0.4], [-9, -8.6, 0.9, 1.2], [3, 8.4, 1.0, 2.1], [-3, -1.5, 0.8, 0.3], [-15, -4, 0.7, 2.6]]) K.box('rubble', c.x + dx, Y(c.x + dx, c.z + dz) - 0.3, c.z + dz, r, 0.7, r * 0.6, a);
  K.graves(c.x + 4, c.z - 15, 0.1, 9, 3, 'pale:stone', 2.6);
  K.paving('wood', c.x - 18.5, c.z + 0.5, 4.5, 0.8, 0.15, 0.12);
  K.spots.chapel_door = [c.x - 17, Y(c.x - 17, c.z + 3.5), c.z + 3.5, -Math.PI / 2];
  // The Sunken Mile: the old pale causeway into the fen, most of its slabs under the mire or tipped, its piers broken off,
  // one arch of its bridge left, the waymark down in the reeds. (The path follows what's left of it.)
  const sm = at('causeway');
  for (let i = -8; i <= 8; i++) {
    const x = sm.x + i * 6.4 + hash2(i, 31) * 1.5, k = hash2(i, 33), off = k < 0.35 ? 0 : (k < 0.68 ? -1 : 1) * (3.4 + k * 4), z = sm.z + off, y = Y(x, z);
    // (On the way, a slab lies flat and you walk over it; off it, they've tipped and sunk.)
    if (off === 0) K.paving('pale:stone', x, z, 2.7, 1.9, hash2(i, 35) * 0.2 - 0.1, 0.07);
    else { const P = K.frame(x, z, k * 3), q = (u, w, v) => { const [px, pz] = P(u, w); return [px, y + v, pz]; }; K.quad('pale:stone', q(-2.6, -1.8, -0.3), q(-2.6, 1.8, -0.3), q(2.6, 1.8, 0.9 * k), q(2.6, -1.8, 0.9 * k)); K.collide(x, z, 1.4, 1.2, k * 3, y + 0.5); }
    if (i % 2) for (const sd of [-1, 1]) { const pz = sm.z + sd * (4.2 + hash2(i, sd + 40)), h = 0.8 + hash2(i * 3, sd + 7) * 2.6; K.drum('pale:stone', x + 1.5, Y(x + 1.5, pz) - 0.6, pz, 0.75, h + 0.6, 7, { r2: 0.62, turn: i }); }
  }
  K.arch('pale:stone', sm.x - 22, sm.z + 9.5, 0.2 + Math.PI / 2, { a: 2.4, pw: 1.3, hs: 1.6, t: 2.2, ring: 0.7, broken: 1 });
  K.arch('pale:stone', sm.x - 22.8, sm.z + 17.5, 0.2 + Math.PI / 2, { a: 2.4, pw: 1.3, hs: 1.6, t: 2.2, ring: 0.7, broken: 0.38 });
  // (The waymark: a needle of pale stone, down, in two pieces, by the foot it stood on.)
  K.box('pale:stone', sm.x + 14, Y(sm.x + 14, sm.z - 8) - 0.4, sm.z - 8, 1.3, 1.3, 1.3, 0.3);
  K.box('pale:stone', sm.x + 19.5, Y(sm.x + 19.5, sm.z - 9.5) - 0.35, sm.z - 9.5, 3.4, 0.9, 0.5, 0.25); K.box('pale:stone', sm.x + 25.6, Y(sm.x + 25.6, sm.z - 11.6) - 0.5, sm.z - 11.6, 1.9, 0.8, 0.42, 0.5);
  for (const [dx, dz, r] of [[-12, -10, 6], [8, 11, 7.5], [31, 6, 5], [-34, -6, 6.5]]) { let lo = 1e9; for (let a = 0; a < 6; a++) lo = Math.min(lo, Y(sm.x + dx + Math.cos(a) * r * 0.6, sm.z + dz + Math.sin(a) * r * 0.6)); K.disc('lake', sm.x + dx, lo + 0.1, sm.z + dz, r, 14); }
  K.boat(sm.x + 6, Y(sm.x + 6, sm.z + 9) - 0.1, sm.z + 9, 2.2, 3.6, { roll: 0.3, collide: false });
  K.spots.causeway_mark = [sm.x + 16.5, Y(sm.x + 16.5, sm.z - 5), sm.z - 5, 0];
}

function rustwood(K) {
  // The Abbey of Saint Ossery, Tessariel's: the nave's walls standing with their windows empty, its roof fallen in, the
  // east gable whole with his sunburst over three lancets, a bell-cote on the west gable over the door; the cloister's
  // arcade round its garth on the north, the brothers' graves on the south, and what's left of the precinct wall and gate.
  const a = at('abbey'), ay = Y(a.x, a.z);
  const L = 22, Wd = 8, win = (us, y0, y1, w = 0.9) => us.map((u) => ({ u, w, y0, y1, round: true }));
  K.pierced('stone', a.x, a.z - Wd, 0, L, 11, 1.4, win([-16, -8, 0, 8, 16], 3, 7.2), { ruin: true, y: ay });
  K.pierced('stone', a.x, a.z + Wd, 0, L, 11, 1.4, win([-16, -8, 0, 8, 16], 3, 7.2), { y: ay });
  K.pierced('stone', a.x + L, a.z, Math.PI / 2, Wd + 0.7, 13, 1.4, win([-3.2, 0, 3.2], 3.4, 8.6, 0.8), { y: ay });
  K.tri('stone', [a.x + L + 0.7, ay + 13, a.z - Wd - 0.7], [a.x + L + 0.7, ay + 13, a.z + Wd + 0.7], [a.x + L + 0.7, ay + 19, a.z]); K.tri('stone', [a.x + L - 0.7, ay + 13, a.z - Wd - 0.7], [a.x + L - 0.7, ay + 13, a.z + Wd + 0.7], [a.x + L - 0.7, ay + 19, a.z]);
  K.pierced('stone', a.x - L, a.z, Math.PI / 2, Wd + 0.7, 14, 1.4, [{ u: 0, w: 1.9, y0: 0, y1: 3.6, round: true }], { y: ay });
  for (const u of [-20, -12, -4, 4, 12, 20]) for (const sd of [-1, 1]) {
    if (sd < 0 && u === -4) continue;
    K.box('stone', a.x + u, ay - 0.3, a.z + sd * (Wd + 1.15), 0.8, 7.6, 0.75, 0, { collide: false }); K.box('stone', a.x + u, ay + 7.3, a.z + sd * (Wd + 0.95), 0.65, 3.2, 0.5, 0, { collide: false });
  }
  for (let i = 0; i < 6; i++) { const x = a.x + 6 - i * 4.4; K.box('roof_3', x, ay + 0.2 + (i % 2) * 0.7, a.z - 2 + (i % 3) * 1.6, 2.4, 0.3, 3, 0.3 * i, { collide: false }); }
  for (let i = 0; i < 4; i++) K.beam('dark:wood', [a.x - 14 + i * 9, ay + 0.3, a.z - 5 + (i % 2) * 6], [a.x - 9 + i * 9, ay + 3.2 + (i % 2) * 2.5, a.z + 5.5 - (i % 2) * 9], 0.35);
  // (The pillars of the nave: three pairs still up, the rest in drums on the floor.)
  for (const [u, hh] of [[-12, 6], [-4, 3.2], [4, 6], [12, 1.4]]) for (const sd of [-1, 1]) { K.drum('stone', a.x + u, ay - 0.3, a.z + sd * 4.2, 0.6, hh * (sd > 0 ? 1 : 0.7) + 0.3, 8); }
  for (const [dx, dz, t] of [[-6.5, 2.5, 0.4], [1.5, -1.6, 1.3], [9.5, 1.2, 2.2]]) K.drum('stone', a.x + dx, ay - 0.1, a.z + dz, 0.6, 0.9, 8, { turn: t });
  K.box('pale:stone', a.x + 17.5, ay - 0.2, a.z, 1.0, 1.3, 2.0, 0); K.box('pale:stone', a.x + 17.5, ay + 1.1, a.z, 1.15, 0.15, 2.2, 0, { collide: false });
  K.sunburst('fruit2', a.x + L + 0.72, ay + 15.2, a.z, [1, 0], 1.7);
  K.sunburst('fruit2', a.x - L - 0.72, ay + 6.6, a.z, [-1, 0], 1.1);
  // The bell-cote over the west door (Orrin asks after it): two piers, a lintel, a small bell, a little gable.
  for (const s of [-1, 1]) K.box('stone', a.x - L, ay + 14, a.z + s * 1.6, 0.6, 5, 0.6, 0, { collide: false });
  K.box('stone', a.x - L, ay + 19, a.z, 0.7, 0.6, 2.3, 0, { collide: false });
  K.gable('roof_3', 'stone', a.x - L, ay + 19.6, a.z, 2.3, 0.7, 1.3, Math.PI / 2, 0.2);
  K.drum('fruit2', a.x - L, ay + 16.2, a.z, 0.75, 0.9, 12, { r2: 0.32, collide: false });
  // The cloister: an arcade down two sides of the garth, a well in the grass, the walk's roof gone.
  const cz = a.z - Wd - 14;
  for (let i = 0; i < 7; i++) K.arch('stone', a.x - 19 + i * 5.2, cz, 0, { a: 1.9, pw: 0.7, hs: 2.5, t: 0.7, ring: 0.45, y: ay, broken: i === 4 ? 0.4 : i === 5 ? 0 : 1, n: 6 });
  for (let i = 0; i < 2; i++) K.arch('stone', a.x - 22, cz + 3.4 + i * 5.2, Math.PI / 2, { a: 1.9, pw: 0.7, hs: 2.5, t: 0.7, ring: 0.45, y: ay, n: 6 });
  K.wall('stone', a.x + 16, cz, a.x + 16, a.z - Wd, 0.9, 4.5, { ruin: true });
  K.well(a.x - 5, cz + 7, 0, { roof: false });
  K.paving('stone', a.x - 3, cz + 2.4, 17, 1.3);
  // The graves, the precinct's wall and its gate to the road, the lay brothers' shed with what they left.
  K.graves(a.x + 2, a.z + Wd + 13, 0, 12, 3.2, 'pale:stone', 2.5);
  K.wall('rubble', a.x - 46, a.z + 30, a.x - 14, a.z + 34, 0.9, 2.6, { ruin: true }); K.wall('rubble', a.x - 46, a.z + 30, a.x - 48, a.z - 6, 0.9, 2.6, { ruin: true });
  K.wall('rubble', a.x + 4, a.z + 35, a.x + 30, a.z + 33, 0.9, 2.6, { ruin: true });
  K.arch('stone', a.x - 5, a.z + 35, 0.05, { a: 2.2, pw: 1.1, hs: 2.8, t: 1.1, top: 6, y: Y(a.x - 5, a.z + 35) });
  K.sunburst('fruit2', a.x - 5, Y(a.x - 5, a.z + 35) + 5.25, a.z + 35.6, [0, 1], 0.55);
  K.leanTo(a.x - 30, a.z + 12.4, Math.PI, 3, 1.6, 2.6, 'roof_3'); K.goods(a.x - 31, a.z + 15.5, 4, 1.3); K.cart(a.x - 36, a.z + 20, 0.6, { wreck: true });
  for (const [dx, dz, r, t] of [[-27, 2.5, 1.2, 0.3], [-25.5, -4, 0.9, 1.1], [8, -12, 1.1, 2], [26, 5, 1.3, 0.7], [24.8, -6, 0.8, 1.9], [-12, 12, 0.9, 2.7]]) K.box('stone', a.x + dx, Y(a.x + dx, a.z + dz) - 0.3, a.z + dz, r, 0.8, r * 0.65, t);
  K.spots.abbey_door = [a.x - L - 6, Y(a.x - L - 6, a.z - 3), a.z - 3, -Math.PI / 2];
  // The Fungal Ring: caps the height of a man in a ring, a great one fallen across its middle, their young in clumps, and
  // the camp of somebody who came to look at them and didn't stay.
  const f = at('fungus');
  const cap = (x, z, h, big = true) => {
    const y = Y(x, z);
    K.drum('cloth_oat', x, y - 0.2, z, 0.35 + h * 0.08, h, big ? 8 : 5, { r2: 0.25 + h * 0.06, collide: big });
    K.drum('fruit', x, y + h - 0.2, z, 1 + h * 0.45, 0.35, big ? 12 : 7, { r2: 0.8 + h * 0.4, collide: false });
    K.cone('fruit', x, y + h + 0.15, z, 0.8 + h * 0.4, 0.5 + h * 0.18, big ? 12 : 7);
  };
  for (let i = 0; i < 13; i++) { const t = i / 13 * TAU, r = 22 + hash2(i, 9) * 4; cap(f.x + Math.cos(t) * r, f.z + Math.sin(t) * r, 1.5 + hash2(i, 11) * 2.5); }
  for (let i = 0; i < 26; i++) { const t = hash2(i, 51) * TAU, r = 6 + hash2(i, 52) * 26; cap(f.x + Math.cos(t) * r, f.z + Math.sin(t) * r, 0.25 + hash2(i, 53) * 0.7, false); }
  cap(f.x - 3, f.z + 2, 6.5);
  { const y = Y(f.x + 6, f.z - 4); K.beam('cloth_oat', [f.x + 3, y + 0.5, f.z - 7], [f.x + 12, y + 0.7, f.z - 1], 1.1); K.drum('fruit', f.x + 12.6, y - 0.6, f.z - 0.6, 2.8, 2.6, 9, { r2: 2.0, turn: 1 }); K.collide(f.x + 7.5, f.z - 4, 4.8, 0.6, -0.59, y + 1); }
  K.tent(f.x - 12, f.z - 9, 0.5, 1.5, 1.2, 1.5); K.campfire(f.x - 9, f.z - 6.5, false); K.crate(f.x - 13.5, f.z - 6, 0.35, 0.2); K.rack(f.x - 8, f.z - 11, 1.2, 1.1, 'cloth_oat', 1.4);
  K.spots.fungus_camp = [f.x - 7, Y(f.x - 7, f.z - 4), f.z - 4, 0.8];
  // The Woodcutters' Camp: two cabins and the mess lean-to, the sawpit under its trestle, stacks of sawn logs, the stumps
  // of what they've felled, a loaded cart, the fire and its benches.
  const w = at('cutters'), wy = Y(w.x, w.z);
  K.house(w.x - 9, w.z - 9, 4, 3, 2.7, 0.3, 'wood', 'roof_1', { door: 'door_3', chimney: 2.6 });
  K.house(w.x + 4, w.z - 12, 3.6, 2.8, 2.6, -0.15, 'wood', 'roof_3', { door: 'door_3' });
  K.leanTo(w.x - 13, w.z + 2, Math.PI / 2 + 0.2, 3.4, 2, 2.6, 'roof_1'); K.table(w.x - 12.6, w.z + 2, 0.2, 1.2); K.bench(w.x - 11.2, w.z + 2.2, 0.2 + Math.PI / 2, 1.1);
  for (let s = 0; s < 4; s++) K.woodpile(w.x + 9 + (s % 2) * 3.4, w.z + 2 + Math.floor(s / 2) * 6.5, 0.05 * s, 0.9 + (s % 2) * 0.3, 0.9 + hash2(s, 3) * 0.7, 2.6);
  // (The pit: a dark slot in the ground, a log across the trestle over it, the long saw standing in the cut.)
  K.paving('water', w.x - 1, w.z + 9, 3, 0.8, 0.1, 0.06);
  for (const u of [-2.6, 2.6]) { const P = K.frame(w.x - 1, w.z + 9, 0.1), [ax, az] = P(u, -1.3), [bx, bz] = P(u, 1.3); K.beam('wood', [ax, wy + 0.9, az], [bx, wy + 0.9, bz], 0.16); for (const [px, pz] of [[ax, az], [bx, bz]]) K.box('wood', px, wy - 0.2, pz, 0.09, 1.1, 0.09, 0.1); }
  K.beam('bark', [w.x - 4.4, wy + 1.25, w.z + 9.35], [w.x + 2.4, wy + 1.25, w.z + 8.65], 0.55); K.box('iron', w.x - 0.4, wy + 0.2, w.z + 9, 0.02, 2.2, 0.09, 0.1, { collide: false });
  K.collide(w.x - 1, w.z + 9, 3.4, 1.4, 0.1, wy + 1.3);
  for (let i = 0; i < 16; i++) { const t = hash2(i, 61) * TAU, r = 20 + hash2(i, 62) * 22, x = w.x + Math.cos(t) * r, z = w.z + Math.sin(t) * r; K.stump(x, z, 0.3 + hash2(i, 63) * 0.25, 0.35 + hash2(i, 64) * 0.4); }
  K.cart(w.x + 2, w.z + 17, 0.4, { load: 'bark', len: 1.8 }); K.campfire(w.x - 3, w.z - 1.5, true);
  K.bench(w.x - 3, w.z - 3.6, 0); K.bench(w.x - 5.2, w.z - 1.2, Math.PI / 2); K.stump(w.x - 0.6, w.z - 0.4, 0.34, 0.5);
  K.rack(w.x + 9.5, w.z - 8.5, 1.3, 1.2, null, 1.5); K.goods(w.x - 5, w.z - 12.5, 4, 1.2); K.lantern(w.x - 6.4, w.z - 5.6, 2.6, 1);
  K.spots.cutters_fire = [w.x - 0.5, wy, w.z - 3.4, -0.9];
}

function ashen(K) {
  // The Caravanserai of Khel: a square court behind blind walls with a tower at each corner, a gate between two more under
  // an arch, an arcade round the inside shaded with awnings, the well, the traders' stalls and carts, and the late comers'
  // tents outside the walls. (Plain folk's: nobody's colours on it.)
  const k = at('khel'), H = 30, ky = Y(k.x, k.z);
  K.wall('rubble', k.x - H, k.z - H, k.x + H, k.z - H, 1.6, 7, { crenel: true });
  K.wall('rubble', k.x + H, k.z - H, k.x + H, k.z + H, 1.6, 7, { crenel: true });
  K.wall('rubble', k.x + H, k.z + H, k.x + 5.4, k.z + H, 1.6, 7, { crenel: true }); K.wall('rubble', k.x - 5.4, k.z + H, k.x - H, k.z + H, 1.6, 7, { crenel: true });
  K.wall('rubble', k.x - H, k.z + H, k.x - H, k.z - H, 1.6, 7, { crenel: true });
  for (const sx of [-1, 1]) K.tower('rubble', k.x + sx * 8.6, k.z + H, 3, 11, null);
  K.arch('rubble', k.x, k.z + H, 0, { a: 3, pw: 2.4, hs: 3.6, top: 8.6, t: 2.2, y: ky, n: 8 });
  for (let i = -2; i <= 2; i++) K.box('rubble', k.x + i * 1.5, ky + 8.6, k.z + H + 0.7, 0.45, 1, 0.4, 0, { collide: false });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.tower('rubble', k.x + sx * H, k.z + sz * H, 3.4, 9, null);
  for (let i = 0; i < 10; i++) {
    const t = -H + 6 + i * (2 * H - 12) / 9;
    for (const [x, z] of [[k.x + t, k.z - H + 6], [k.x - H + 6, k.z + t], [k.x + H - 6, k.z + t]]) K.drum('stone', x, Y(x, z) - 0.2, z, 0.5, 4.2, 8);
  }
  // (The awnings: cloth from the wall down to the pillars' heads, bay by bay, a few gone.)
  for (let i = 0; i < 9; i++) {
    const t0 = -H + 6 + i * (2 * H - 12) / 9, t1 = t0 + (2 * H - 12) / 9, c = i % 4 === 1 ? 'wall_13' : 'cloth_oat';
    if (i !== 3) K.quad(c, [k.x + t0, ky + 5.2, k.z - H + 0.9], [k.x + t1, ky + 5.2, k.z - H + 0.9], [k.x + t1, ky + 4.05, k.z - H + 6.4], [k.x + t0, ky + 4.05, k.z - H + 6.4], null, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (i !== 6) K.quad(c, [k.x - H + 0.9, ky + 5.2, k.z + t1], [k.x - H + 0.9, ky + 5.2, k.z + t0], [k.x - H + 6.4, ky + 4.05, k.z + t0], [k.x - H + 6.4, ky + 4.05, k.z + t1], null, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (i !== 1) K.quad(c, [k.x + H - 0.9, ky + 5.2, k.z + t0], [k.x + H - 0.9, ky + 5.2, k.z + t1], [k.x + H - 6.4, ky + 4.05, k.z + t1], [k.x + H - 6.4, ky + 4.05, k.z + t0], null, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  K.well(k.x, k.z, 0.2, { stone: 'stone', roof: 'roof_1' }); K.trough(k.x + 3.4, k.z + 1.5, 0.2, 1.4); K.trough(k.x - 3.4, k.z - 1.5, 0.2, 1.4);
  for (const [dx, dz, yaw, c, s] of [[-14, 8, Math.PI / 2, 'cloth_oat', 0], [-14, -4, Math.PI / 2, 'wall_13', 1], [14, -6, -Math.PI / 2, 'cloth_oat', 2], [12, 12, -Math.PI / 2 - 0.3, 'wall_13', 3], [0, -15, 0, 'cloth_oat', 1]]) K.stall(k.x + dx, k.z + dz, yaw, c, s);
  K.cart(k.x + 17, k.z + 20, 0.4, { load: 'cloth_oat' }); K.cart(k.x - 19, k.z + 19, 2.6, { load: 'wood' }); K.cart(k.x + 20, k.z - 19, 1.2);
  K.goods(k.x - 21, k.z - 20, 7, 2.2); K.goods(k.x + 22, k.z + 3, 5, 1.6); K.goods(k.x - 22, k.z + 1, 4, 1.4);
  for (const [dx, dz] of [[-8, 22], [8, 22], [-8, -8], [8, -8]]) K.lantern(k.x + dx, k.z + dz, 3, dx > 0 ? Math.PI : 0);
  K.pavilion(k.x + 6, k.z + 14, 2.3, 3.4, 'cloth_oat', 'wall_13');
  for (const sx of [-1, 1]) K.banner(k.x + sx * 8.6, k.z + H, 5, 0, 'cloth_oat', { y: ky + 11, w: 1.1, len: 3.4, collide: false });
  // (Outside: a late caravan's camp against the east wall, a picket line, their fire.)
  K.tent(k.x + 42, k.z + 10, 0.3, 2, 1.5, 1.9); K.tent(k.x + 44, k.z + 18, -0.4, 1.8, 1.4, 1.8, 'wall_13'); K.pavilion(k.x + 40, k.z - 2, 2.1, 3.2);
  K.campfire(k.x + 39, k.z + 14, true); K.rack(k.x + 48, k.z + 4, 1.4, 3, null, 1.3); K.cart(k.x + 37, k.z + 24, 2.9, { load: 'cloth_oat' }); K.goods(k.x + 46, k.z + 12, 4, 1.3);
  K.spots.khel_court = [k.x + 5, ky, k.z + 6, Math.PI];
  // The Bone Field: the ribs of something enormous coming up out of the ash, its spine between them, the skull at their
  // east end with its horn. Velscour's: his red on poles down both sides, a black slab between two fires where it's fed.
  const b = at('bones');
  for (let r = 0; r < 9; r++) {
    for (const side of [-1, 1]) {
      const x0 = b.x - 24 + r * 6, z0 = b.z;
      for (let s = 0; s < 6; s++) {
        const u = s / 6, v = (s + 1) / 6, ang = (q) => q * 1.9;
        const P = (q) => [x0 + Math.sin(q * 0.4) * 0.6, Y(x0, z0) - 1 + Math.sin(ang(q)) * 14 * (1 - r * 0.05), z0 + side * (1 - Math.cos(ang(q))) * 9];
        K.beam('pale:stone', P(u), P(v), 0.75 - s * 0.08, 0.55 - s * 0.05);
      }
      K.collide(x0, b.z + side * 9, 0.5, 0.5, 0, Y(x0, b.z) + 3);
    }
    K.drum('pale:stone', b.x - 24 + r * 6, Y(b.x - 24 + r * 6, b.z) - 0.9, b.z, 1.5, 1.9, 7, { r2: 1.1, turn: r });
  }
  // (The skull: the brow, the long jaw laid on the ash, two pits for its eyes, the horn.)
  { const sx = b.x + 34, sy = Y(sx, b.z);
    K.rock('pale:stone', sx, b.z, 6.5, 5.2, { y: sy - 1.6, turn: 0.3 }); K.rock('pale:stone', sx + 7.5, b.z, 3.6, 2.2, { y: sy - 0.9, turn: 1.1, sx: 1.7 });
    for (const sd of [-1, 1]) { const e = [sx + 4.9, sy + 2.3, b.z + sd * 2.7]; for (let i = 0; i < 6; i++) { const a0 = i / 6 * TAU, a1 = (i + 1) / 6 * TAU; K.tri('obsidian', e, [e[0] - 0.5, e[1] + Math.cos(a0) * 1.0, e[2] + Math.sin(a0) * 1.1], [e[0] - 0.5, e[1] + Math.cos(a1) * 1.0, e[2] + Math.sin(a1) * 1.1]); } }
    K.spike('pale:stone', sx - 1, sy + 2.5, b.z, 1.9, 9, 6, 0.3, [-0.35, 0.1]); }
  for (let i = 0; i < 6; i++) { const x = b.x - 30 + i * 13, sd = i % 2 ? 1 : -1, z = b.z + sd * 15; K.banner(x, z, 5.5, sd > 0 ? 0.4 : 2.6, 'cloth_red', { pole: 'dark:wood', len: 2.6 }); }
  K.box('dark:stone', b.x - 36, Y(b.x - 36, b.z) - 0.4, b.z, 1.6, 1.3, 2.6, 0.1); K.brazier(b.x - 36, b.z + 5, 1.4); K.brazier(b.x - 36, b.z - 5, 1.4);
  for (let i = 0; i < 9; i++) { const t = hash2(i, 71) * TAU, r = 16 + hash2(i, 72) * 30, x = b.x + Math.cos(t) * r * 1.3, z = b.z + Math.sin(t) * r; if (Math.abs(z - b.z) < 11) continue; K.heap('pale:rubble', x, z, 1 + hash2(i, 73), 0.6 + hash2(i, 74) * 0.5, 6, { collide: false }); K.beam('pale:stone', [x + 1, Y(x + 1, z) + 0.2, z - 1.5], [x - 0.6, Y(x, z) + 0.9, z + 1.6], 0.22); }
  // The Black Obelisks: seven needles of his black stone, one fallen, on a ring of black paving round the stepped slab; his
  // red down two of them, iron from their heads to the slab, braziers that never go out, glass teeth come up outside the ring.
  const o = at('obelisks'), oy = Y(o.x, o.z);
  K.ringPaving('dark:stone', o.x, o.z, 4.6, 24.5, 20);
  for (let i = 0; i < 7; i++) {
    const t = i / 7 * TAU, x = o.x + Math.cos(t) * 20, z = o.z + Math.sin(t) * 20, hh = 16 + hash2(i, 2) * 6;
    if (i === 4) { K.box('dark:stone', x, Y(x, z) - 0.4, z, 9, 1.6, 1.4, t); continue; }
    K.box('dark:stone', x, Y(x, z) - 0.4, z, 2.1, 1.3, 2.1, -t);
    K.menhir('dark:stone', x, z, 1.5, hh, -t, 0);
    K.cone('dark:stone', x, Y(x, z) + hh - 0.6, z, 1.1, 2.5, 4, t);
    if (i % 3 === 0) K.hanging('cloth_red', x - Math.cos(t) * 1.25, Y(x, z) + hh * 0.72, z - Math.sin(t) * 1.25, [-Math.cos(t), -Math.sin(t)], 1.3, hh * 0.4, 3);
    if (i % 2) K.beam('iron', [x - Math.cos(t) * 0.8, Y(x, z) + hh * 0.8, z - Math.sin(t) * 0.8], [o.x + Math.cos(t) * 2, oy + 1.9, o.z + Math.sin(t) * 2], 0.09);
  }
  K.box('dark:stone', o.x, oy - 0.5, o.z, 4.4, 1.0, 4.4, 0.4); K.box('dark:stone', o.x, oy + 0.5, o.z, 3, 0.9, 3, 0.4, { collide: false });
  for (let i = 0; i < 4; i++) { const t = 0.4 + i * Math.PI / 2 + Math.PI / 4; K.brazier(o.x + Math.cos(t) * 7.5, o.z + Math.sin(t) * 7.5, 1.4); }
  for (let i = 0; i < 14; i++) { const t = hash2(i, 81) * TAU, r = 28 + hash2(i, 82) * 16, x = o.x + Math.cos(t) * r, z = o.z + Math.sin(t) * r; K.spike('obsidian', x, Y(x, z) - 0.5, z, 0.5 + hash2(i, 83) * 0.7, 2 + hash2(i, 84) * 4.5, 5, t, [(hash2(i, 85) - 0.5) * 0.4, (hash2(i, 86) - 0.5) * 0.4]); }
  // The Charred Mill, alone in the Waste: a post mill burnt where it stood. Its trestle and the black ribs of its body, the
  // stocks of two sails, the stones fallen through; a ring of ash round it; the miller's house a shell, his cart with it.
  const cm = at('charmill'), my = Y(cm.x, cm.z), C = 'dark:wood';
  K.ringPaving('dark:rubble', cm.x, cm.z, 0, 13, 18, 0.05); K.ringPaving('pale:rubble', cm.x, cm.z, 0, 7.5, 14, 0.08);
  K.drum(C, cm.x, my - 0.4, cm.z, 0.5, 6.4, 7);
  for (let i = 0; i < 4; i++) { const t = 0.3 + i * Math.PI / 2, c = Math.cos(t), s = Math.sin(t); K.beam(C, [cm.x - c * 0.2, my + 0.25, cm.z - s * 0.2], [cm.x + c * 4.2, my + 0.25, cm.z + s * 4.2], 0.36); K.beam(C, [cm.x + c * 3.8, my + 0.4, cm.z + s * 3.8], [cm.x + c * 0.3, my + 4.2, cm.z + s * 0.3], 0.3); K.box('rubble', cm.x + c * 4.1, my - 0.3, cm.z + s * 4.1, 0.6, 0.5, 0.6, -t); }
  { const P = K.frame(cm.x, cm.z, 0.3), V = (u, v, w) => { const [px, pz] = P(u, w); return [px, my + v, pz]; }, hx = 2.3, hz = 2.9;
    K.box(C, cm.x, my + 5.2, cm.z, hx, 0.28, hz, 0.3, { collide: false });
    for (const [u, w, hh] of [[-hx, -hz, 6.8], [hx, -hz, 4.4], [hx, hz, 7.4], [-hx, hz, 3.1], [0, -hz, 5.6], [0, hz, 7.9], [-hx, 0, 5.2], [hx, 0, 2.6]]) K.beam(C, V(u, 5.4, w), V(u * 0.97, 5.4 + hh, w * 0.97), 0.26);
    K.beam(C, V(-hx, 9.2, -hz), V(0, 10.6, -hz), 0.2); K.beam(C, V(-hx, 8.2, 0), V(-hx, 9.6, -hz), 0.2); K.beam(C, V(0, 12.6, hz), V(hx, 12.2, hz), 0.2);
    K.quad(C, V(-hx, 5.4, hz), V(0, 5.4, hz), V(0, 9.4, hz), V(-hx, 7.6, hz)); K.quad(C, V(hx, 5.4, -hz), V(hx, 5.4, 0), V(hx, 7.6, 0), V(hx, 8.8, -hz));
    // (The windshaft still through the head of it, two stocks of the sails on it, the others on the ground.)
    K.beam(C, V(0, 11.2, hz - 1.5), V(0, 11.9, hz + 1.9), 0.42); K.beam(C, V(-4.6, 9.2, hz + 1.7), V(3.4, 14, hz + 1.7), 0.2); K.beam(C, V(1.2, 11.9, hz + 1.75), V(-2.4, 16.6, hz + 1.75), 0.2);
    K.beam(C, V(4.2, 0.2, 7.5), V(-3.8, 0.35, 10.5), 0.2); K.beam(C, V(-6.5, 0.2, 5), V(-9.6, 0.3, -2.2), 0.2); for (let q = 0; q < 4; q++) K.beam(C, V(3 - q * 1.9, 0.25, 7.9 + q * 0.7), V(3.4 - q * 1.9, 0.25, 9.3 + q * 0.7), 0.07); }
  K.drum('stone', cm.x + 1.6, my - 0.1, cm.z - 2.4, 0.9, 0.34, 10, { r2: 0.9 }); K.wheel(cm.x - 2.6, my + 0.65, cm.z + 1.2, 1.1, 0.85, 'stone');
  K.collide(cm.x, cm.z, 1.2, 1.2, 0.3, my + 5);
  { const hx = cm.x + 15, hz = cm.z - 9;
    K.pierced('dark:rubble', hx, hz - 3.2, 0.2, 4.2, 3.4, 0.6, [{ u: 1.5, w: 0.5, y0: 1, y1: 2.1 }], { ruin: true }); K.pierced('dark:rubble', hx, hz + 3.2, 0.2, 4.2, 3.4, 0.6, [{ u: -0.5, w: 0.7, y0: 0, y1: 2.2 }], { ruin: true });
    const P = K.frame(hx, hz, 0.2); for (const sd of [-1, 1]) { const [px, pz] = P(sd * 4.2, 0); K.pierced('dark:rubble', px, pz, 0.2 + Math.PI / 2, 3.2, 4.4, 0.6, [], { ruin: true }); }
    K.beam(C, [hx - 3, Y(hx, hz) + 0.2, hz - 1], [hx + 2.4, Y(hx, hz) + 2.4, hz + 2.6], 0.24); K.beam(C, [hx + 3, Y(hx, hz) + 0.2, hz - 2], [hx - 1, Y(hx, hz) + 1.5, hz + 2.4], 0.24);
    K.box('stone', hx - 3, Y(hx - 3, hz) - 0.3, hz - 2.2, 0.6, 4.6, 0.6, 0.2, { collide: false }); }
  K.cart(cm.x - 13, cm.z + 8, 0.8, { wreck: true }); K.well(cm.x + 9, cm.z + 12, 0, { roof: false });
  for (let i = 0; i < 7; i++) { const t = hash2(i, 91) * TAU, r = 16 + hash2(i, 92) * 16, x = cm.x + Math.cos(t) * r, z = cm.z + Math.sin(t) * r; K.drum(C, x, Y(x, z) - 0.3, z, 0.22 + hash2(i, 93) * 0.15, 1 + hash2(i, 94) * 2.6, 5, { r2: 0.1 }); }
  K.spots.charmill_well = [cm.x + 6.5, Y(cm.x + 6.5, cm.z + 9.5), cm.z + 9.5, -2.2];
  // Blackvigil Keep: Velscour's. The curtain wall in his black stone, a drum tower at each corner, the gatehouse on the Vigil Road
  // (east), the great keep within, his red over the gate and braziers up the road.
  keep(K);
}

// Blackvigil Keep's outside. The curtain with a drum tower at each corner under its cone and plain ones along the walls;
// the gatehouse's two towers with a machicolated gallery between them over the gate, the portcullis down; arrow slits; the
// great keep within, buttressed, turrets on its corners, the tall tower behind with his lit windows at its head. Out along
// the approach: a spiked ditch-line between two black revetments with the bridge over it, the barbican beyond, gibbets and
// braziers up to it. (The ground straight before the gate, between it and the ditch, is left bare: the way down into the
// keep's dungeon stands there. The land can't be dug from here, so the ditch is a walled bed of stakes, not a hollow.)
function keep(K) {
  const k = at('keep'), y0 = Y(k.x, k.z), HX = 70, HZ = 58, wallH = 16;
  const G = 'dark:stone', R = 'dark:rubble';
  K.wall(G, k.x - HX, k.z - HZ, k.x + HX, k.z - HZ, 3, wallH, { crenel: true, y: y0 });
  K.wall(G, k.x - HX, k.z + HZ, k.x + HX, k.z + HZ, 3, wallH, { crenel: true, y: y0 });
  K.wall(G, k.x - HX, k.z - HZ, k.x - HX, k.z + HZ, 3, wallH, { crenel: true, y: y0 });
  K.wall(G, k.x + HX, k.z - HZ, k.x + HX, k.z + HZ, 3, wallH, { crenel: true, y: y0, gap: 4 });
  // A slit in a round tower's wall, looking out at ang; and one in a flat wall at (x, z) facing [nx, nz].
  const slit = (cx, cz, r, ang, yy, hh = 2.2, layer = 'iron') => { const c = Math.cos(ang), s = Math.sin(ang), px = cx + c * (r + 0.04), pz = cz + s * (r + 0.04); K.quad(layer, [px + s * 0.16, yy, pz - c * 0.16], [px - s * 0.16, yy, pz + c * 0.16], [px - s * 0.16, yy + hh, pz + c * 0.16], [px + s * 0.16, yy + hh, pz - c * 0.16], [c, 0, s]); };
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const cx = k.x + sx * HX, cz = k.z + sz * HZ;
    K.tower(G, cx, cz, 7, wallH + 8, 'dark:roof_2', { y: y0, sides: 16 });
    // (The gallery round its head, on corbels, to drop things from.)
    K.drum(G, cx, y0 + wallH + 3.6, cz, 7, 1.0, 16, { r2: 8.1, open: true, collide: false }); K.drum(G, cx, y0 + wallH + 4.6, cz, 8.1, 2.4, 16, { open: true, collide: false });
    for (let i = 0; i < 5; i++) { const a = Math.atan2(sz, sx) - 1.2 + i * 0.6; slit(cx, cz, 7, a, y0 + 6 + (i % 2) * 5); slit(cx, cz, 8.1, a + 0.3, y0 + wallH + 5); }
  }
  for (const [dx, dz] of [[-24, -HZ], [24, -HZ], [-24, HZ], [24, HZ], [-HX, 0], [HX, -33], [HX, 33]]) {
    K.tower(G, k.x + dx, k.z + dz, 5, wallH + 4, null, { y: y0 });
    const out = Math.atan2(Math.abs(dz) === HZ ? dz : 0, Math.abs(dx) === HX ? dx : 0);
    for (const da of [-0.7, 0, 0.7]) slit(k.x + dx, k.z + dz, 5, out + da, y0 + 7 + Math.abs(da) * 5);
  }
  // The gatehouse: two towers flanking the gate, a passage roofed over, the gallery across between them, the portcullis.
  for (const sz of [-1, 1]) { K.tower(G, k.x + HX + 2, k.z + sz * 9, 5.5, wallH + 6, null, { y: y0 }); for (const da of [-0.5, 0.25]) slit(k.x + HX + 2, k.z + sz * 9, 5.5, da * sz, y0 + 8 + (da > 0 ? 6 : 0), 2.4); }
  K.box(G, k.x + HX, y0 + 7.5, k.z, 3, wallH - 7.5, 4.5, 0, { collide: false });
  K.box(G, k.x + HX + 3.3, y0 + wallH - 1.6, k.z, 1.2, 3.4, 4.4, 0, { collide: false });
  for (let i = -3; i <= 3; i++) { if (i % 2) K.box(G, k.x + HX + 4.3, y0 + wallH + 1.8, k.z + i * 1.25, 0.2, 1.1, 0.5, 0, { collide: false }); K.box(G, k.x + HX + 3.5, y0 + wallH - 2.5, k.z + i * 1.3, 0.9, 0.9, 0.22, 0, { collide: false }); }
  K.quad('door_5', [k.x + HX + 1.6, y0, k.z + 3.6], [k.x + HX + 1.6, y0, k.z - 3.6], [k.x + HX + 1.6, y0 + 7.5, k.z - 3.6], [k.x + HX + 1.6, y0 + 7.5, k.z + 3.6], [1, 0, 0], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  for (let i = -3; i <= 3; i++) K.beam('iron', [k.x + HX + 1.85, y0, k.z + i * 1.05], [k.x + HX + 1.85, y0 + 7.5, k.z + i * 1.05], 0.13);
  for (const v of [1.6, 3.6, 5.6]) K.beam('iron', [k.x + HX + 1.85, y0 + v, k.z - 3.6], [k.x + HX + 1.85, y0 + v, k.z + 3.6], 0.11);
  K.collide(k.x + HX, k.z, 1.5, 4.2, 0, y0 + 7.5);   // (the gate's shut: he doesn't open it to you yet)
  // The road side of the curtain: a gallery on corbels either side of the gatehouse, slits under it.
  for (const s of [-1, 1]) {
    K.box(G, k.x + HX + 1.95, y0 + wallH - 1.2, k.z + s * 33, 0.5, 1.2, 18, 0, { collide: false });
    for (let i = 0; i < 12; i++) { const z = k.z + s * (16.5 + i * 3); K.box(G, k.x + HX + 1.85, y0 + wallH - 2.0, z, 0.4, 0.8, 0.25, 0, { collide: false }); if (i % 3 === 1) K.quad('iron', [k.x + HX + 1.54, y0 + 7, z + 1.66], [k.x + HX + 1.54, y0 + 7, z + 1.34], [k.x + HX + 1.54, y0 + 9.4, z + 1.34], [k.x + HX + 1.54, y0 + 9.4, z + 1.66], [1, 0, 0]); }
  }
  // The keep: a great block on a plinth, buttressed up its faces, a crown of merlons, a turret on three corners and at the
  // fourth the tower taller than everything, his red down its face and his fires in its head.
  const bx = k.x - 12;
  K.box(R, bx, y0 - 1, k.z, 30, 3, 26, 0);
  K.box(G, bx, y0 + 2, k.z, 26, 44, 22, 0, { top: R });
  for (let i = 0; i < 16; i++) {
    const u = (i + 0.5) / 16 * 2 - 1;
    K.box(G, bx + u * 26, y0 + 46, k.z - 22, 1, 1.8, 0.8, 0, { collide: false });
    K.box(G, bx + u * 26, y0 + 46, k.z + 22, 1, 1.8, 0.8, 0, { collide: false });
    K.box(G, bx - 26, y0 + 46, k.z + u * 22, 0.8, 1.8, 1, 0, { collide: false });
    K.box(G, bx + 26, y0 + 46, k.z + u * 22, 0.8, 1.8, 1, 0, { collide: false });
  }
  for (const dz of [-18, -6, 6, 18]) for (const sx of [-1, 1]) { K.box(G, bx + sx * 26.6, y0 + 2, k.z + dz, 0.7, 36, 1.1, 0, { collide: false }); K.box(G, bx + sx * 26.3, y0 + 38, k.z + dz, 0.4, 5, 0.9, 0, { collide: false }); }
  for (const dx of [-18, -6, 6, 18]) for (const sz of [-1, 1]) { K.box(G, bx + dx, y0 + 2, k.z + sz * 22.6, 1.1, 36, 0.7, 0, { collide: false }); K.box(G, bx + dx, y0 + 38, k.z + sz * 22.3, 0.9, 5, 0.4, 0, { collide: false }); }
  for (const [sx, sz] of [[1, -1], [1, 1], [-1, 1]]) { const cx = bx + sx * 26, cz = k.z + sz * 22; K.drum(G, cx, y0 + 37, cz, 2.2, 3, 10, { r2: 3.4, open: true, collide: false }); K.drum(G, cx, y0 + 40, cz, 3.4, 10, 10, { collide: false }); K.cone('dark:roof_2', cx, y0 + 50, cz, 4.1, 7, 10); slit(cx, cz, 3.4, Math.atan2(sz, sx), y0 + 43, 2.4, 'flame'); }
  K.tower(G, k.x - 34, k.z - 18, 9, 78, 'dark:roof_2', { y: y0, steep: 2.4, sides: 16 });
  K.drum(G, k.x - 34, y0 + 70, k.z - 18, 9, 1.4, 16, { r2: 10.4, open: true, collide: false }); K.drum(G, k.x - 34, y0 + 71.4, k.z - 18, 10.4, 5.6, 16, { open: true, collide: false });
  for (let i = 0; i < 8; i++) slit(k.x - 34, k.z - 18, 10.4, i / 8 * TAU + 0.2, y0 + 72.6, 2.6, 'flame');
  for (let i = 0; i < 6; i++) slit(k.x - 34, k.z - 18, 9, -0.9 + i * 0.36, y0 + 30 + i * 6, 3);
  // His red, long, down the road side of the corner towers and the tall tower, so the road sees it from far off.
  for (const sz of [-1, 1]) K.quad('cloth_red', [k.x + HX + 7.1, y0 + 18, k.z + sz * HZ - 2.2], [k.x + HX + 7.1, y0 + 18, k.z + sz * HZ + 2.2], [k.x + HX + 7.1, y0 + 4, k.z + sz * HZ + 2.2], [k.x + HX + 7.1, y0 + 4, k.z + sz * HZ - 2.2], [1, 0, 0], [[0, 0], [1, 0], [1, 3], [0, 3]]);
  K.quad('cloth_red', [k.x - 24.9, y0 + 68, k.z - 21], [k.x - 24.9, y0 + 68, k.z - 15], [k.x - 24.9, y0 + 34, k.z - 15], [k.x - 24.9, y0 + 34, k.z - 21], [1, 0, 0], [[0, 0], [1, 0], [1, 5], [0, 5]]);
  for (const dz of [-12, 0, 12]) K.hanging('cloth_red', k.x + 14, y0 + 42, k.z + dz, [1, 0], 4.4, 28, 3);
  K.quad('door_5', [k.x + 14.05, y0 + 2, k.z - 2.5], [k.x + 14.05, y0 + 2, k.z + 2.5], [k.x + 14.05, y0 + 8.5, k.z + 2.5], [k.x + 14.05, y0 + 8.5, k.z - 2.5], [1, 0, 0], [[1, 1], [0, 1], [0, 0], [1, 0]]);
  K.steps(R, k.x + 18, k.z, Math.PI / 2, 3.2, 10, { rise: 0.2, tread: 0.45, y: y0, walk: false });
  for (const dz of [-5, 5]) K.brazier(k.x + 18, k.z + dz, 1.6);
  K.hanging('cloth_red', k.x + HX + 4.5, y0 + wallH - 1.9, k.z, [1, 0], 3.4, 5.4, 2);
  for (const sz of [-1, 1]) K.banner(k.x + HX + 2, k.z + sz * 9, 7, sz > 0 ? 0 : Math.PI, 'cloth_red', { y: y0 + wallH + 6, pole: 'iron', w: 1.6, len: 5, collide: false });
  // The ditch-line across the approach, 38 m out: two revetments, the bed between them set with stakes, the bridge over it.
  const x0 = k.x + HX + 38, x1 = x0 + 7, xm = x0 + 3.5, dy = y0 + 1.33;
  for (const x of [x0, x1]) for (const s of [-1, 1]) K.wall(R, x, k.z + s * 3.4, x, k.z + s * 62, 0.9, 1.3, { y: y0 });
  for (const s of [-1, 1]) { K.wall(R, x0, k.z + s * 62, x1, k.z + s * 62, 0.9, 1.3, { y: y0 }); K.quad(R, [x0, y0 + 0.04, k.z + s * 3.4], [x0, y0 + 0.04, k.z + s * 62], [x1, y0 + 0.04, k.z + s * 62], [x1, y0 + 0.04, k.z + s * 3.4], [0, 1, 0]); }
  for (let i = 0; i < 46; i++) { const s = i % 2 ? 1 : -1, z = k.z + s * (5.5 + Math.floor(i / 2) * 2.45), x = x0 + 1.6 + hash2(i, 3) * 3.8; K.spike(i % 5 ? 'dark:wood' : 'obsidian', x, y0, z, 0.16, 1.7 + hash2(i, 5) * 0.9, 4, i, [(hash2(i, 7) - 0.3) * 0.5, 0]); }
  K.box('wood', xm, dy - 0.22, k.z, 4.4, 0.22, 3.2, 0, { collide: false });
  for (const dx of [-3.3, 0, 3.3]) K.box(G, xm + dx, y0 - 0.3, k.z, 0.6, 1.42, 3.3, 0, { collide: false });
  // (Its piers stop you from the ditch's side only: stood on the deck or its steps you're over them, and nobody finding a
  // way to the gate takes the bridge for a wall. t: its top less a step, as the portals' terraces have it.)
  K.colliders.push({ x: xm, z: k.z, hx: 4.4, hz: 3.3, yaw: 0, h: 1.15, t: dy - 0.45 });
  K.deck([[xm, k.z, 4.4, 3.0, 0, dy]]);
  K.steps(G, xm - 4.4, k.z, -Math.PI / 2, 3.0, 7, { rise: 0.19, tread: 0.42, y: y0 }); K.steps(G, xm + 4.4, k.z, Math.PI / 2, 3.0, 7, { rise: 0.19, tread: 0.42, y: y0 });
  for (const s of [-1, 1]) { K.box(G, xm, dy - 0.2, k.z + s * 3.2, 4.4, 1.1, 0.2, 0); for (const dx of [-4.4, 4.4]) { K.box(G, xm + dx, y0 - 0.3, k.z + s * 3.25, 0.4, 2.9, 0.4, 0); K.spike('iron', xm + dx, y0 + 2.6, k.z + s * 3.25, 0.2, 1.1, 4, 0.78); } }
  // The barbican past the ditch: two towers and the arch between them, wings of wall either side, his red on their heads.
  const xb = x1 + 7;
  for (const s of [-1, 1]) {
    K.tower(G, xb, k.z + s * 8, 3.7, 12, null, { y: y0 }); slit(xb, k.z + s * 8, 3.7, s * 0.5, y0 + 6); slit(xb, k.z + s * 8, 3.7, s * 0.5 + Math.PI - s, y0 + 6);
    K.wall(G, xb, k.z + s * 11.5, xb, k.z + s * 27, 2, 6, { crenel: true, y: y0 });
    K.banner(xb, k.z + s * 8, 6, s > 0 ? 0 : Math.PI, 'cloth_red', { y: y0 + 12, pole: 'iron', w: 1.3, len: 4, collide: false });
    K.brazier(xb + 5, k.z + s * 6, 1.6);
  }
  K.arch(G, xb, k.z, Math.PI / 2, { a: 3.3, pw: 1.0, hs: 4.2, top: 10, t: 3.2, y: y0 });
  for (let i = -3; i <= 3; i++) for (const dx of [-1.4, 1.4]) if (i % 2 === 0) K.box(G, xb + dx, y0 + 10, k.z + i * 1.25, 0.2, 1.1, 0.55, 0, { collide: false });
  // Up the Vigil Road to the barbican: gibbets, and braziers in pairs.
  for (let i = 2; i <= 6; i++) {
    const x = k.x + HX + 14 + i * 26;
    K.brazier(x, k.z + 7); K.brazier(x, k.z - 7);
    if (i % 2) { const gx = x + 13, gz = k.z + 11, gy = Y(gx, gz); K.box('wood', gx, gy - 0.4, gz, 0.15, 6, 0.15, 0); K.box('wood', gx - 1.2, gy + 5.4, gz, 1.4, 0.18, 0.15, 0, { collide: false }); K.drum('iron', gx - 2.3, gy + 2.6, gz, 0.4, 1.6, 6, { open: true, collide: false }); K.heap('pale:rubble', gx - 2.3, gz + 0.4, 0.9, 0.45, 6, { collide: false }); }
    else { const px = x + 13, pz = k.z - 11; K.spike('dark:wood', px, Y(px, pz) - 0.3, pz, 0.14, 4.4, 4, 0.5, [0.05, 0]); K.rock('pale:stone', px + 0.2, pz, 0.3, 0.32, { y: Y(px, pz) + 3.2, collide: false }); }
  }
  K.spots.keepGate = [k.x + HX + 8, y0, k.z, Math.PI / 2];
}

function barrow(K) {
  // The Barrows: the great mounds are the land's own (lands.js BARROWS); here, their doors: two stones and a lintel, a slab
  // across; a kerb of stones round the great one and an avenue up to its door from the track; a dolmen with its capstone
  // slid; and the camp of whoever's been digging into the second mound.
  const b = at('barrows');
  for (const [dx, dz, r, yaw] of BARROWS.map((q) => [q[0] - b.x, q[1] - b.z, q[2], q[4]])) {
    const x = b.x + dx + Math.cos(yaw) * r * 0.82, z = b.z + dz + Math.sin(yaw) * r * 0.82, y = Y(x, z);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const side of [-1, 1]) K.box('rubble', x - s * side * 1.4, y - 0.5, z + c * side * 1.4, 0.45, 3.2, 0.45, -yaw);
    K.box('rubble', x, y + 2.6, z, 0.6, 0.6, 2.2, -yaw, { collide: false });
    K.box('stone', x + c * 0.4, y - 0.3, z + s * 0.4, 0.2, 2.6, 1.05, -yaw);
    for (const side of [-1, 1]) for (const d of [1.6, 3.4]) K.rock('rubble', x + c * d - s * side * (2.2 + d * 0.25), z + s * d + c * side * (2.2 + d * 0.25), 0.55, 0.9, { collide: false });
  }
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * TAU, x = b.x + Math.cos(a) * 28.5, z = b.z + Math.sin(a) * 28.5;
    if (Math.abs(((a - 0.4 + Math.PI) % TAU) - Math.PI) < 0.22) continue;
    K.menhir('rubble', x, z, 0.5 + hash2(i, 3) * 0.25, 1.1 + hash2(i, 5) * 0.9, -a, (hash2(i, 7) - 0.5) * 0.2);
  }
  for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
    const d = 33 + i * 6.5, x = b.x + Math.cos(0.4) * d - Math.sin(0.4) * side * 3.6, z = b.z + Math.sin(0.4) * d + Math.cos(0.4) * side * 3.6;
    if (routeDist(x, z).d > 3) K.menhir('rubble', x, z, 0.45, 1.8 + hash2(i, side + 9) * 1.2, -0.4, (hash2(i, side + 3) - 0.5) * 0.25);
  }
  { const x = b.x - 62, z = b.z + 28, y = Y(x, z);
    for (const [dx, dz, hh] of [[-1.5, -1, 2.1], [1.6, -0.8, 1.9], [0, 1.6, 2.2]]) K.box('rubble', x + dx, y - 0.5, z + dz, 0.5, hh + 0.5, 0.4, dx);
    K.quad('rubble', [x - 2.8, y + 2.2, z - 2.2], [x - 2.4, y + 2.4, z + 2.8], [x + 3, y + 1.8, z + 2.4], [x + 2.6, y + 1.7, z - 2.4]); K.quad('rubble', [x - 2.8, y + 1.75, z - 2.2], [x + 2.6, y + 1.25, z - 2.4], [x + 3, y + 1.35, z + 2.4], [x - 2.4, y + 1.95, z + 2.8]);
    for (const [a, c] of [[[x - 2.8, z - 2.2, 2.2, 1.75], [x - 2.4, z + 2.8, 2.4, 1.95]], [[x - 2.4, z + 2.8, 2.4, 1.95], [x + 3, z + 2.4, 1.8, 1.35]], [[x + 3, z + 2.4, 1.8, 1.35], [x + 2.6, z - 2.4, 1.7, 1.25]], [[x + 2.6, z - 2.4, 1.7, 1.25], [x - 2.8, z - 2.2, 2.2, 1.75]]]) K.quad('rubble', [a[0], y + a[3], a[1]], [c[0], y + c[3], c[1]], [c[0], y + c[2], c[1]], [a[0], y + a[2], a[1]]); }
  { const [mx, mz, mr] = BARROWS[1], x = mx + 6, z = mz - mr - 7;
    K.heap('dark:rubble', mx + 1, mz - mr + 1.5, 2.4, 1.3, 7); K.heap('dark:rubble', mx - 4.5, mz - mr - 1, 1.6, 0.9, 6, { collide: false });
    K.tent(x, z, 0.5, 1.7, 1.3, 1.7); K.tent(x + 5.5, z - 2.5, -0.3, 1.5, 1.2, 1.5, 'wall_13'); K.campfire(x + 2, z + 4, false);
    K.cart(x - 6, z - 1, 2.4, { len: 1.1, load: 'dark:rubble' }); K.goods(x + 6.5, z + 2.5, 4, 1.2); K.ladder(mx + 3, mz - mr - 1, mx + 1.5, Y(mx, mz - mr + 4) + 0.5, mz - mr + 4.5);
    K.spots.barrows_camp = [x + 3.5, Y(x + 3.5, z + 1), z + 1, 2.4]; }
  for (const [dx, dz] of [[52, -78], [-30, -96], [96, 40]]) K.banner(b.x + dx, b.z + dz, 3, dx, 'cloth_oat', { w: 0.45, len: 1.0 });
  // The Nine Maidens: a ring of nine, one lying where she fell; the Piper off to the north-west, taller than any; two
  // stones and a lintel for the ring's door; a flat stone in its middle with a burnt-out fire by it.
  const m = at('stones');
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.75) / 9 * TAU, x = m.x + Math.cos(t) * 16, z = m.z + Math.sin(t) * 16;
    if (i === 6) { K.box('rubble', x, Y(x, z) - 0.3, z, 2.6, 0.9, 0.8, t); continue; }
    K.menhir('rubble', x, z, 0.9 + hash2(i, 1) * 0.3, 3.4 + hash2(i, 4) * 1.6, -t, (hash2(i, 8) - 0.5) * 0.12);
  }
  K.menhir('rubble', m.x - 25, m.z - 19, 1.2, 6.2, 0.7, 0.07);
  for (const s of [-1, 1]) K.menhir('rubble', m.x + s * 1.9, m.z - 21.5, 0.6, 3.1, 0, 0);
  K.box('rubble', m.x, Y(m.x, m.z - 21.5) + 2.45, m.z - 21.5, 2.9, 0.55, 0.6, 0, { collide: false });
  K.box('rubble', m.x - 1, Y(m.x - 1, m.z - 1) - 0.3, m.z - 1, 1.9, 0.85, 1.1, 0.5); K.campfire(m.x + 3.2, m.z + 1.5, false);
  for (let i = 0; i < 5; i++) { const t = 0.7 + i * 1.3, x = m.x + Math.cos(t) * (8 + i), z = m.z + Math.sin(t) * (8 + i); K.cairn(x, z, 0.4, 0.55); }
  K.spots.stones_ring = [m.x + 4, Y(m.x + 4, m.z - 5), m.z - 5, 0.6];
}

function rimeholt(K) {
  // Frostwatch: the watch-fort at the Frost Road's end. A stone tower with a beacon on its head, a wall round its yard with
  // a gate north to the road and south to the fells, two long houses, the stable and the smithy against the walls, a well,
  // sledges and stores, stakes outside against whatever comes down off the Deeps.
  const f = at('frostwatch'), fy = Y(f.x, f.z), FS = 'frost:stone', FR = 'frost:rubble';
  K.tower(FS, f.x, f.z - 10, 5, 20, null, { sides: 12 });
  K.drum(FS, f.x, fy + 16.6, f.z - 10, 5, 0.9, 12, { r2: 5.9, open: true, collide: false }); K.drum(FS, f.x, fy + 17.5, f.z - 10, 5.9, 2.4, 12, { open: true, collide: false });
  K.drum('iron', f.x, fy + 20, f.z - 10, 0.7, 0.9, 8, { r2: 1.2, open: true, collide: false }); K.cone('flame', f.x, fy + 20.4, f.z - 10, 0.9, 2.2, 6);
  for (const [a, yy] of [[0.3, 6], [1.9, 10], [3.5, 14], [5.1, 8]]) K.quad('water', [f.x + Math.cos(a) * 5.04 + Math.sin(a) * 0.2, fy + yy, f.z - 10 + Math.sin(a) * 5.04 - Math.cos(a) * 0.2], [f.x + Math.cos(a) * 5.04 - Math.sin(a) * 0.2, fy + yy, f.z - 10 + Math.sin(a) * 5.04 + Math.cos(a) * 0.2], [f.x + Math.cos(a) * 5.04 - Math.sin(a) * 0.2, fy + yy + 2, f.z - 10 + Math.sin(a) * 5.04 + Math.cos(a) * 0.2], [f.x + Math.cos(a) * 5.04 + Math.sin(a) * 0.2, fy + yy + 2, f.z - 10 + Math.sin(a) * 5.04 - Math.cos(a) * 0.2], [Math.cos(a), 0, Math.sin(a)]);
  K.quad('door_2', [f.x - 0.9, fy, f.z - 4.93], [f.x + 0.9, fy, f.z - 4.93], [f.x + 0.9, fy + 2.5, f.z - 4.93], [f.x - 0.9, fy + 2.5, f.z - 4.93], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
  const X = 26, Z = 22, wl = (ax, az, bx, bz) => K.wall(FR, f.x + ax, f.z + az, f.x + bx, f.z + bz, 1.2, 3.6, { crenel: true });
  wl(-X, -Z, 9.6, -Z); wl(14.4, -Z, X, -Z); wl(X, -Z, X, Z); wl(X, Z, 2.4, Z); wl(-2.4, Z, -X, Z); wl(-X, Z, -X, -Z);
  for (const [gx, gz] of [[9.2, -Z], [14.8, -Z], [-2.8, Z], [2.8, Z]]) K.box(FS, f.x + gx, Y(f.x + gx, f.z + gz) - 0.5, f.z + gz, 0.7, 5.6, 0.9, 0);
  for (const [bx, bz] of [[7.2, -Z - 2.6], [16.8, -Z - 2.6], [-4.8, Z + 2.4], [4.8, Z + 2.4]]) K.brazier(f.x + bx, f.z + bz, 1.5);
  K.box(FS, f.x + 12, Y(f.x + 12, f.z - Z) + 4.3, f.z - Z, 3.4, 0.8, 0.9, 0, { collide: false }); K.box(FS, f.x, Y(f.x, f.z + Z) + 4.3, f.z + Z, 3.4, 0.8, 0.9, 0, { collide: false });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.tower(FR, f.x + sx * X, f.z + sz * Z, 2.6, 5.6, null, { sides: 8 });
  K.house(f.x - 13, f.z + 9, 7, 4, 3.6, Math.PI, 'wall_18', 'roof_4', { chimney: 4, lamp: 1 });
  K.house(f.x + 14, f.z + 9, 7, 4, 3.6, Math.PI, 'wall_20', 'roof_4', { chimney: -4, lamp: -1 });
  // (The stable on the east wall, the smithy on the west; the well in the yard's middle.)
  K.leanTo(f.x + 23, f.z - 6, -Math.PI / 2, 5, 2, 3, 'roof_4'); K.trough(f.x + 19.6, f.z - 8.5, Math.PI / 2, 1.2); K.hayrick(f.x + 22.5, f.z - 13.5, 1.2, 1.9);
  K.leanTo(f.x - 23.2, f.z - 9, Math.PI / 2, 3.4, 1.9, 2.9, 'roof_4'); K.box('stone', f.x - 23.6, fy - 0.2, f.z - 10.6, 0.7, 1.1, 0.7, 0); K.cone('flame', f.x - 23.6, fy + 0.85, f.z - 10.6, 0.35, 0.5, 6);
  K.stump(f.x - 21.2, f.z - 8.4, 0.3, 0.6); K.box('iron', f.x - 21.2, fy + 0.6, f.z - 8.4, 0.3, 0.2, 0.12, 0.4, { collide: false });
  K.well(f.x + 6, f.z - 1, 0.2, { roof: 'roof_4', stone: FS });
  K.woodpile(f.x - 22.5, f.z + 2, Math.PI / 2, 2.4, 1.4, 0.55); K.woodpile(f.x + 5.6, f.z + 18.6, 0, 2.2, 1.2, 0.5);
  K.goods(f.x - 6, f.z + 18.5, 6, 1.7); K.rack(f.x - 15, f.z - 17.5, 0, 1.6, null, 1.5);
  // (A sledge by the south gate, another loaded.)
  for (const [sx, sz, yaw, load] of [[7, 13.5, 0.3, true], [-8, -17, 1.2, false]]) { const P = K.frame(f.x + sx, f.z + sz, yaw); for (const s of [-1, 1]) { const [ax, az] = P(-1.4, s * 0.45), [bx, bz] = P(1.5, s * 0.45), [cx, cz] = P(1.9, s * 0.45); K.beam('wood', [ax, fy + 0.08, az], [bx, fy + 0.08, bz], 0.09); K.beam('wood', [bx, fy + 0.08, bz], [cx, fy + 0.5, cz], 0.08); } K.box('wood', f.x + sx, fy + 0.25, f.z + sz, 1.3, 0.08, 0.55, yaw, { collide: false }); if (load) K.box('cloth_oat', f.x + sx, fy + 0.33, f.z + sz, 1.0, 0.5, 0.45, yaw, { collide: false }); K.collide(f.x + sx, f.z + sz, 1.5, 0.6, yaw, fy + 0.8); }
  K.lantern(f.x + 2.6, f.z + 4.5, 2.8, Math.PI); K.lantern(f.x + 15.5, f.z - 17, 2.8, Math.PI); K.banner(f.x, f.z - 10, 5, 0.4, 'cloth_oat', { y: fy + 19.9, w: 1.2, len: 3.2, collide: false });
  for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = 37 + hash2(i, 3) * 3, x = f.x + Math.cos(a) * r * 1.1, z = f.z + Math.sin(a) * r; if (routeDist(x, z).d < 5 || Math.hypot(x - 700, z - 3928) < 7) continue; K.spike('bark', x, Y(x, z) - 0.3, z, 0.17, 2.1, 4, a, [Math.cos(a) * 0.45, Math.sin(a) * 0.45]); }
  K.spots.frostwatch_yard = [f.x - 10, fy, f.z - 1, Math.PI / 2];
  // The Frozen Shrine: Tessariel's. Four pillars and a lintel round a T of white stone, all in ice; steps up to it, his
  // sunburst on the lintel, the ice hanging from it, two fires that haven't gone out, the pilgrims' cairns and their flags.
  const s = at('shrine'), sy = Y(s.x, s.z);
  K.disc('ice', s.x, sy + 0.05, s.z, 10.5, 20);
  K.box('frost:stone', s.x, sy - 0.4, s.z, 4.5, 0.8, 4.5, 0.3, { collide: false });
  K.deck([[s.x, s.z, 4.5, 4.5, 0.3, sy + 0.4]]);
  { for (let q = 0; q < 4; q++) { const yaw = 0.3 + q * Math.PI / 2, [px, pz] = K.frame(s.x, s.z, yaw)(0, 4.5); K.steps('frost:stone', px, pz, yaw, 1.6, 2, { rise: 0.2, tread: 0.4, y: sy }); } }
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [px, pz] = K.frame(s.x, s.z, 0.3)(sx * 3.4, sz * 3.4); K.drum('frost:stone', px, sy + 0.4, pz, 0.45, 5, 10, { collide: false }); K.drum('frost:stone', px, sy + 0.4, pz, 0.62, 0.4, 10, { collide: false }); K.collide(px, pz, 0.45, 0.45, 0, sy + 5.4); }
  K.box('frost:stone', s.x, sy + 5.4, s.z, 4.2, 0.6, 4.2, 0.3, { collide: false });
  for (let q = 0; q < 4; q++) { const a = 0.3 + q * Math.PI / 2, n = [Math.sin(a), Math.cos(a)]; K.sunburst('fruit2', s.x + n[0] * 4.22, sy + 5.7, s.z + n[1] * 4.22, n, 0.42); }
  K.box('pale:stone', s.x, sy + 0.4, s.z, 0.3, 3.2, 0.3, 0.3, { collide: false });
  K.box('pale:stone', s.x, sy + 3.0, s.z, 1.3, 0.3, 0.3, 0.3, { collide: false });
  K.collide(s.x, s.z, 0.4, 0.4, 0.3, sy + 3.6);
  for (let i = 0; i < 14; i++) { const t = i / 14 * TAU; K.spike('ice', s.x + Math.cos(t) * 2.6, sy + 0.4, s.z + Math.sin(t) * 2.6, 0.25, 1 + hash2(i, 3) * 2, 4, t); }
  for (let i = 0; i < 18; i++) { const [px, pz] = K.frame(s.x, s.z, 0.3)(i < 9 ? -4.1 + i * 1.02 : (i % 2 ? 4.1 : -4.1), i < 9 ? (i % 2 ? 4.1 : -4.1) : -4.1 + (i - 9) * 1.02); K.spike('ice', px, sy + 5.42, pz, 0.14, -(0.5 + hash2(i, 9) * 1.5), 4, i); }
  for (const sd of [-1, 1]) { const [px, pz] = K.frame(s.x, s.z, 0.3)(sd * 6.6, 7.4); K.drum('frost:stone', px, sy - 0.2, pz, 0.3, 1.5, 6); K.drum('iron', px, sy + 1.3, pz, 0.25, 0.35, 8, { r2: 0.45, collide: false, open: true }); K.cone('flame', px, sy + 1.45, pz, 0.32, 0.9, 6); }
  for (let i = 0; i < 7; i++) { const t = 1.1 + i * 0.75, r = 12.5 + hash2(i, 5) * 5, x = s.x + Math.cos(t) * r, z = s.z + Math.sin(t) * r; if (Math.hypot(x - -700, z - 3312) < 6.5) continue; K.cairn(x, z, 0.55 + hash2(i, 6) * 0.4, 0.8 + hash2(i, 7) * 0.5, 'frost:rubble'); }
  K.washing(s.x - 12, s.z - 8, s.x - 5.5, s.z - 11.5, 2.3); K.washing(s.x + 6, s.z - 12, s.x + 12.5, s.z - 8, 2.3);
}

function gallows(K) {
  // Hangman's Cross: where the roads meet under the gallows-tree: three posts and three beams on a mound, ropes still on
  // them; the old gibbet and its cage, the cairn, the fingerpost; the hangman's hut and the dead-cart, the stocks, the
  // nameless graves behind.
  const c = at('crossroads'), cy = Y(c.x, c.z);
  K.box('wood', c.x + 6, cy - 0.5, c.z + 6, 0.2, 7.5, 0.2, 0.6);
  K.box('wood', c.x + 4.8, cy + 6.6, c.z + 6.8, 1.6, 0.22, 0.18, 0.6, { collide: false });
  K.drum('iron', c.x + 3.6, cy + 3.6, c.z + 7.6, 0.45, 1.8, 6, { open: true, collide: false });
  K.drum('rubble', c.x - 6, cy - 0.4, c.z - 6, 2.2, 1.8, 9, { r2: 0.6 });
  K.signpost(c.x - 2, c.z + 3, [0.9, -2.3, 2.6], 3);
  { const gx = c.x + 10, gz = c.z - 9, tri = [0, 1, 2].map((i) => [gx + Math.cos(i * TAU / 3 + 0.4) * 3.2, gz + Math.sin(i * TAU / 3 + 0.4) * 3.2]);
    K.drum('rubble', gx, cy - 0.5, gz, 5.6, 1.0, 10, { r2: 4.6, collide: false }); K.collide(gx, gz, 3.6, 3.6, 0.4, cy + 0.5);
    tri.forEach(([px, pz], i) => { const [qx, qz] = tri[(i + 1) % 3]; K.box('wood', px, cy + 0.4, pz, 0.2, 6.2, 0.2, i, { collide: false }); K.beam('wood', [px, cy + 6.4, pz], [qx, cy + 6.4, qz], 0.24);
      for (const u of [0.3, 0.62]) { const rx = px + (qx - px) * u, rz = pz + (qz - pz) * u; K.beam('cloth_oat', [rx, cy + 6.3, rz], [rx, cy + 4.6 + u, rz], 0.04); } });
    K.ladder(gx - 4.6, gz + 3.4, tri[1][0] + 0.2, cy + 6.2, tri[1][1] + 0.2); }
  K.house(c.x - 15, c.z - 13, 3.2, 2.6, 2.5, 0.9, 'wall_18', 'roof_4', { door: 'door_3', chimney: -1.8, lamp: 1 });
  K.cart(c.x - 9, c.z - 16, -0.4, { len: 1.6 }); K.woodpile(c.x - 19.2, c.z - 9.5, 0.9, 1.2, 0.9);
  // (The stocks: two posts and the boards between.)
  for (const s of [-1, 1]) K.box('wood', c.x + 12 + s * 1.1, cy - 0.3, c.z + 12, 0.1, 1.5, 0.1, 0.2, { collide: false });
  K.box('wood', c.x + 12, cy + 0.55, c.z + 12, 1.2, 0.5, 0.06, 0.2);
  K.graves(c.x + 17, c.z - 20, 0.3, 5, 2.4, 'rubble', 2.4);
  for (let i = 0; i < 4; i++) K.box('dark:rubble', c.x + 12 + i * 2.6, Y(c.x + 12 + i * 2.6, c.z - 15) - 0.2, c.z - 15 + (i % 2) * 0.6, 0.45, 0.38, 0.95, 0.3, { collide: false });
  K.lantern(c.x - 4.5, c.z - 4.5, 2.9, 0.8); K.trough(c.x - 11, c.z - 8.5, 0.9, 1);
  K.spots.crossroads_post = [c.x - 6.5, cy, c.z + 1.5, 1.2];
  // Mother Grawl's Hut: crooked, low, the cauldron over its fire at the door, a fence of bones, her herbs on racks, skulls
  // on poles to say keep off, toadstools coming up round the garden she doesn't weed.
  const w = at('witch'), wy = Y(w.x, w.z);
  K.house(w.x, w.z, 4.5, 3.5, 2.8, 0.5, 'wall_18', 'roof_4', { rise: 4.5, door: 'door_3', chimney: 2.5 });
  K.windowAt(w.x + 2.2 * Math.cos(0.5) + 3.54 * Math.sin(0.5), wy + 1.0, w.z - 2.2 * Math.sin(0.5) + 3.54 * Math.cos(0.5), [Math.sin(0.5), Math.cos(0.5)], 0.4, 0.6, true);
  { const cx = w.x + 3 * Math.sin(0.5) + 2, cz = w.z + 3 * Math.cos(0.5) + 3;
    K.campfire(cx, cz, true); K.drum('iron', cx, wy + 0.45, cz, 0.8, 0.9, 10, { r2: 0.95, lid: 'lake', collide: false });
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3; K.beam('iron', [cx + Math.cos(a) * 1.3, wy, cz + Math.sin(a) * 1.3], [cx, wy + 2.6, cz], 0.06); } }
  for (let i = 0; i < 18; i++) { const t = 0.2 + i / 18 * 5.2, x = w.x + Math.cos(t) * 10, z = w.z + Math.sin(t) * 10; K.box('pale:stone', x, Y(x, z) - 0.2, z, 0.08, 1.3 + hash2(i, 2) * 0.5, 0.08, t, { collide: false }); if (i < 17) { const t2 = 0.2 + (i + 1) / 18 * 5.2; K.beam('pale:stone', [x, Y(x, z) + 0.8, z], [w.x + Math.cos(t2) * 10, Y(w.x + Math.cos(t2) * 10, w.z + Math.sin(t2) * 10) + 0.8, w.z + Math.sin(t2) * 10], 0.05); } }
  for (const [dx, dz, a] of [[11.5, 7.5, 0.4], [-12, 5, 2.2], [9, -11, 5.2]]) { const x = w.x + dx, z = w.z + dz; K.spike('bark', x, Y(x, z) - 0.3, z, 0.12, 3, 4, a); K.rock('pale:stone', x, z, 0.26, 0.3, { y: Y(x, z) + 2.5, collide: false }); }
  K.rack(w.x - 6.5, w.z + 3.5, 2.1, 1.3, 'cloth_oat', 1.6); K.rack(w.x - 6, w.z - 2.5, 1.7, 1.3, 'cloth_red', 1.6);
  K.woodpile(w.x + 5.6, w.z - 3.4, 0.5 + Math.PI / 2, 1.2, 0.9); K.well(w.x - 3, w.z + 7.6, 0.4, { roof: false, stone: 'rubble' });
  K.leanTo(w.x - 2.6, w.z - 5.2, 0.5 + Math.PI, 1.8, 1.1, 2, 'roof_4'); K.barrel(w.x - 3.6, w.z - 5.6); K.sack(w.x - 1.9, w.z - 6);
  for (let i = 0; i < 9; i++) { const t = hash2(i, 41) * TAU, r = 5.5 + hash2(i, 42) * 9, x = w.x + Math.cos(t) * r, z = w.z + Math.sin(t) * r, h = 0.2 + hash2(i, 43) * 0.35; K.drum('cloth_oat', x, Y(x, z) - 0.1, z, 0.06, h + 0.1, 5, { collide: false }); K.cone('fruit', x, Y(x, z) + h - 0.03, z, 0.22 + h * 0.4, 0.2, 7); }
  K.spots.witch_door = [w.x + 1.34, wy, w.z + 5.79, 0.5];
  // The Twisted Grove: its stone table, under dead trees wrung like rope; rags and bones hung in them, a ring of small
  // stones round the table, an old fire.
  const g = at('grove'), gy = Y(g.x, g.z);
  K.box('rubble', g.x, gy - 0.3, g.z, 2.6, 1.2, 1.4, 0.7); K.box('rubble', g.x, gy + 0.9, g.z, 2.9, 0.22, 1.7, 0.7, { collide: false });
  for (let i = 0; i < 11; i++) { const a = i / 11 * TAU; K.rock('rubble', g.x + Math.cos(a) * 6.5, g.z + Math.sin(a) * 6.5, 0.45, 0.5, { collide: false, turn: a }); }
  for (let i = 0; i < 13; i++) {
    const a = i / 13 * TAU + hash2(i, 1) * 0.3, r = 13 + hash2(i, 2) * 24, x = g.x + Math.cos(a) * r, z = g.z + Math.sin(a) * r, y = Y(x, z) - 0.4, hh = 5 + hash2(i, 3) * 4;
    // (A trunk in three twists, leaning round on itself, and bare boughs off it.)
    let p = [x, y, z], tw = hash2(i, 4) * TAU;
    for (let sgm = 0; sgm < 3; sgm++) { const q = [p[0] + Math.cos(tw) * 0.9, p[1] + hh / 3, p[2] + Math.sin(tw) * 0.9]; K.beam('bark', p, q, 0.75 - sgm * 0.2); p = q; tw += 2.1; }
    for (let bq = 0; bq < 4; bq++) { const ba = tw + bq * 1.7, e = [p[0] + Math.cos(ba) * (2 + hash2(i, bq + 5) * 2), p[1] + 0.6 + hash2(i, bq + 9) * 2.2 - bq * 0.9, p[2] + Math.sin(ba) * (2 + hash2(i, bq + 5) * 2)]; K.beam('bark', [p[0], p[1] - bq * 0.8, p[2]], e, 0.24); if ((i + bq) % 4 === 0) K.quad(bq % 2 ? 'cloth_red' : 'cloth_oat', e, [e[0] + 0.3, e[1], e[2] + 0.1], [e[0] + 0.3, e[1] - 1.3, e[2] + 0.2], [e[0], e[1] - 1.5, e[2] + 0.1], null, [[0, 0], [0.2, 0], [0.2, 0.6], [0, 0.6]]); }
    K.collide(x, z, 0.4, 0.4, 0, y + 3);
  }
  K.campfire(g.x - 5, g.z + 3.5, false); K.heap('pale:rubble', g.x + 3.6, g.z - 3.6, 0.9, 0.5, 6, { collide: false });
  K.spots.grove_table = [g.x - 1.5, Y(g.x - 1.5, g.z + 4), g.z + 4, 2.9];
}

function deepwood(K) {
  // The Hermit's Hollow: his one room and its smoke, a garden behind a wattle fence, hives, a spring in a stone ring, wood
  // stacked for a winter, a seat by his fire.
  const h = at('hermit'), hy = Y(h.x, h.z);
  K.house(h.x, h.z, 3.5, 3, 2.6, 2.4, 'wall_17', 'roof_1', { chimney: 2, lamp: 1 });
  K.fence([[h.x + 5, h.z + 2], [h.x + 12, h.z + 3], [h.x + 12.5, h.z + 9.5], [h.x + 5, h.z + 9], [h.x + 5, h.z + 4.2]], 0.9);
  for (let i = 0; i < 5; i++) K.box('dark:rubble', h.x + 6.2 + i * 1.2, hy - 0.05, h.z + 6, 0.4, 0.22, 2.4, 0.05, { collide: false });
  for (let i = 0; i < 9; i++) K.cone('cloth_oat', h.x + 6.2 + (i % 5) * 1.2, hy + 0.1, h.z + 4.6 + Math.floor(i / 5) * 2.2, 0.22, 0.5, 5, i);
  for (let i = 0; i < 3; i++) { const x = h.x - 7 - i * 1.5, z = h.z + 5 + (i % 2); K.box('wood', x, Y(x, z) - 0.1, z, 0.4, 0.5, 0.4, 0.3); K.drum('cloth_oat', x, Y(x, z) + 0.4, z, 0.36, 0.5, 8, { r2: 0.3, collide: false }); K.cone('cloth_oat', x, Y(x, z) + 0.9, z, 0.32, 0.3, 8); }
  K.well(h.x - 4.5, h.z - 6.5, 0.6, { roof: false, stone: 'rubble' }); K.woodpile(h.x + 4.4, h.z - 2.4, 2.4, 1.6, 1.2); K.woodpile(h.x + 6, h.z - 4.6, 2.4, 1.3, 0.9);
  K.campfire(h.x - 3.2, h.z + 6, true); K.stump(h.x - 4.9, h.z + 6.8, 0.36, 0.5); K.stump(h.x - 1.8, h.z + 7.6, 0.3, 0.45); K.rack(h.x - 8, h.z - 1, 1.2, 1.2, 'cloth_oat', 1.5);
  K.cairn(h.x + 2, h.z + 12, 0.7, 1.1); K.lantern(h.x - 1, h.z + 10.5, 2.3, 2);
  K.spots.hermit_fire = [h.x - 2.8, Y(h.x - 2.8, h.z + 3.6), h.z + 3.6, -0.6];
}

function sorrowhorn(K) {
  // The Broken Stair: the way onto the mountain. A gate of two great piers with a third of its arch left and the rest across
  // the road; the stair going up behind it between broken walls, the plinths of what stood either side; a shelter the
  // pilgrims built against one pier, their cairns and their flags.
  const s = at('stair'), sy = Y(s.x, s.z), yaw = Math.atan2(MOUNT.x - s.x, MOUNT.z - s.z);
  const c = Math.cos(yaw), sn = Math.sin(yaw), P = K.frame(s.x, s.z, yaw);
  K.arch('pale:stone', s.x, s.z, yaw, { a: 4, pw: 4, hs: 13, t: 4, ring: 1.7, y: sy, broken: 0.36, n: 10 });
  for (const side of [-1, 1]) { const [px, pz] = P(side * 6, 0); K.box('stone', px, sy - 1, pz, 2.5, 2.2, 2.5, yaw, { collide: false }); K.box('stone', px, sy + 12.3, pz, 2.3, 0.7, 2.3, yaw, { collide: false }); }
  K.box('pale:stone', s.x + c * 1.5 + sn * 5, sy - 0.6, s.z - sn * 1.5 + c * 5, 6, 1.6, 1.4, -yaw + 0.25);
  for (const [u, w, r, t] of [[-2.5, 7.5, 1.3, 0.4], [3.2, 9, 1, 1.2], [8, 4, 1.4, 2.2], [-1, 3.6, 0.9, 0.8]]) { const [px, pz] = P(u, w); K.box('pale:stone', px, Y(px, pz) - 0.4, pz, r, r * 0.8, r * 0.7, t); }
  for (let i = 0; i < 26; i++) { const [px, pz] = P(0, 8 + i * 1.4); K.box('stone', px, Y(px, pz) - 1.2, pz, 3.6, 1.32, 0.72, yaw, { collide: false }); }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) { const [ax, az] = P(side * 4.6, 8 + i * 9), [bx2, bz2] = P(side * 4.6, 16 + i * 9); K.wall('pale:rubble', ax, az, bx2, bz2, 0.9, 2.4, { ruin: true }); }
    const [px, pz] = P(side * 10, -6); K.box('pale:stone', px, Y(px, pz) - 0.5, pz, 1.3, 2.3, 1.3, yaw); K.rock('pale:stone', px, pz, 0.9, 0.8 + (side > 0 ? 2.2 : 0), { y: Y(px, pz) + 1.7, collide: false });
  }
  { const [lx, lz] = P(-10.8, -1.5); K.leanTo(lx, lz, yaw - Math.PI / 2, 2.4, 1.6, 2.4, 'roof_4'); const [fx, fz] = P(-14, -5); K.campfire(fx, fz, false); const [gx, gz] = P(-11.5, -6.5); K.goods(gx, gz, 3, 1); }
  for (let i = 0; i < 6; i++) { const [px, pz] = P((i % 2 ? 1 : -1) * (15 + i * 2.2), -(9 + i * 3.4)); if (Math.hypot(px + 1663.1, pz + 1890) < 7 || routeDist(px, pz).d < 4) continue; K.cairn(px, pz, 0.6 + hash2(i, 3) * 0.5, 0.9 + hash2(i, 5) * 0.7, 'pale:rubble'); if (i % 2) K.banner(px + 1.5, pz, 2.6, i, 'cloth_oat', { w: 0.4, len: 0.9, collide: false }); }
  K.spots.stair_gate = [P(-5, -10)[0], Y(...P(-5, -10)), P(-5, -10)[1], yaw + Math.PI];
  // Greywatch, high on the shoulder: a ruined tower, its head broken, a beacon iron on it gone cold; what's left of its
  // yard wall and the stair up to its door; somebody's frozen camp in its lee.
  const gx = MOUNT.x + 820, gz = MOUNT.z + 760, gy = Y(gx, gz);
  K.tower('pale:rubble', gx, gz, 6, 18, null);
  for (let i = 0; i < 5; i++) { const a = 0.6 + i * 0.5; K.box('pale:rubble', gx + Math.cos(a) * 5.4, gy + 18, gz + Math.sin(a) * 5.4, 0.7, 1.5 + hash2(i, 2) * 3.5, 0.55, -a, { collide: false }); }
  K.drum('iron', gx, gy + 18, gz, 0.6, 0.8, 8, { r2: 1.0, open: true, collide: false });
  for (const [a, yy] of [[0.4, 5], [2.2, 9], [4.3, 12], [5.6, 6.5]]) K.quad('water', [gx + Math.cos(a) * 6.05 + Math.sin(a) * 0.22, gy + yy, gz + Math.sin(a) * 6.05 - Math.cos(a) * 0.22], [gx + Math.cos(a) * 6.05 - Math.sin(a) * 0.22, gy + yy, gz + Math.sin(a) * 6.05 + Math.cos(a) * 0.22], [gx + Math.cos(a) * 6.05 - Math.sin(a) * 0.22, gy + yy + 2.2, gz + Math.sin(a) * 6.05 + Math.cos(a) * 0.22], [gx + Math.cos(a) * 6.05 + Math.sin(a) * 0.22, gy + yy + 2.2, gz + Math.sin(a) * 6.05 - Math.cos(a) * 0.22], [Math.cos(a), 0, Math.sin(a)]);
  K.wall('pale:rubble', gx - 16, gz + 10, gx + 18, gz + 14, 1.4, 5, { ruin: true });
  K.wall('pale:rubble', gx + 18, gz + 14, gx + 20, gz - 8, 1.4, 4, { ruin: true });
  for (const [dx, dz, r, t] of [[9, 4, 1.3, 0.5], [11.5, 7, 0.9, 1.4], [-9, 5, 1.1, 2.3], [7, -9, 1.2, 0.2], [-3, 9.5, 0.8, 1]]) K.box('pale:rubble', gx + dx, Y(gx + dx, gz + dz) - 0.4, gz + dz, r, r * 0.8, r * 0.7, t);
  K.tent(gx + 12, gz + 1, 0.4, 1.5, 1.2, 1.5, 'cloth_oat'); K.campfire(gx + 9.5, gz - 1.5, false); K.crate(gx + 13.6, gz - 1.6, 0.35, 0.3);
  // (Where somebody'd stand: the levellest ground just outside it.)
  let gs = null;
  for (let i = 0; i < 24; i++) for (const r of [9, 11, 13]) { const a = i / 24 * TAU, x = gx + Math.cos(a) * r, z = gz + Math.sin(a) * r; let sl = 0; for (let q = 0; q < 8; q++) sl = Math.max(sl, Math.abs(Y(x + Math.cos(q) * 2, z + Math.sin(q) * 2) - Y(x, z))); if (!gs || sl < gs[4]) gs = [x, Y(x, z), z, Math.atan2(Math.cos(a), Math.sin(a)), sl]; }
  K.spots.greywatch = gs.slice(0, 4);
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
    const t = i / 12 * TAU, x = MOUNT.x + Math.cos(t) * (MOUNT.lake + 26), z = MOUNT.z + Math.sin(t) * (MOUNT.lake + 26), low = i % 4 === 1;
    K.drum('pale:stone', x, Y(x, z) - 0.5, z, 1.2, low ? 4 : 11, 10); K.drum('pale:stone', x, Y(x, z) - 0.5, z, 1.7, 1.1, 10, { collide: false });
    if (!low) K.drum('pale:stone', x, Y(x, z) + 10.5, z, 1.2, 0.7, 10, { r2: 1.6, collide: false });
    else for (let q = 0; q < 2; q++) { const dx = x + Math.cos(t + 1.2 + q) * (3 + q * 2.4), dz = z + Math.sin(t + 1.2 + q) * (3 + q * 2.4); K.drum('pale:stone', dx, Y(dx, dz) - 0.3, dz, 1.2, 1.3, 10, { turn: q }); }
  }
  // (Ice come up out of the lake in a broken ring, and slabs of the old way laid from the rim's seal toward it.)
  for (let i = 0; i < 16; i++) { const t = i / 16 * TAU + hash2(i, 21) * 0.2, r = 30 + hash2(i, 22) * 26; K.spike('ice', MOUNT.x + Math.cos(t) * r, ly - 0.3, MOUNT.z + Math.sin(t) * r, 0.7 + hash2(i, 23), 2 + hash2(i, 24) * 5, 5, t, [Math.cos(t) * 0.25, Math.sin(t) * 0.25]); }
  for (let i = 0; i < 5; i++) K.paving('pale:stone', MOUNT.x + MOUNT.lake + 30 - i * 5.2, MOUNT.z + (i % 2) * 0.8, 2.2, 1.6, hash2(i, 31) * 0.3, 0.08);
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
    // (The two small towns' are inside their walls, on the level, where nothing's built.)
    const set = { thornwick: [2396, 1833], cinderford: [-2088, -162] }[k];
    return set ? { key: k, x: set[0], z: set[1], name: s.name } : { key: k, ...flattest(s.x + off[0], s.z + off[1]), name: s.name };
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
  thornwick(K); cinderford(K); lesser(K);   // (the small towns and the lesser places: src/core/places.js)
  buildDelves(K, portalWall); warrensMouth(K);
  // (The Test Dungeon's white hall, out past the world's west edge: src/core/testhall.js.)
  buildHall(K);
  for (const s of SEALS) K.seal(s.key, s.x, s.z, Math.atan2(-s.z, -s.x));
  built = { parts: K.parts, colliders: K.colliders, spots: K.spots, floors: K.floors };
  return built;
}
