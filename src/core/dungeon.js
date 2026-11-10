// The Hollowfang Warrens: the first party dungeon. A cave system under the hills north-east of Bellmourn, dug out by kobolds
// and taken over by goblins, with Venomaw, the green dragon, asleep on her hoard at the bottom. It's entered by a portal at
// the cave mouth near the kobolds' den (PORTAL), and the Free Company's quartermaster stands beside it to hire a party from.
// It can't be done alone: the portal lets in a full party, a tank, a healer and two to do the damage, with you.
//
// Where it really is: out past the world's edge (WORLD_EDGE in src/core/lands.js), deep under the land, so nothing walking
// the surface ever comes near it and nothing in it is near anything else. The portals carry you there and back.
//
// It's shared by every thread. Its shape is a set of rooms and tunnels (ROOMS, TUNNELS, PILLARS) made into one field, worked
// out once a thread first asks: how far each point is inside the rock-free space (sdf), and the floor's height there. The
// sim's World walks against it (src/sim/world.js), the render thread builds its walls, floor and roof from it
// (src/core/sites.js caveKit), and the shaders call everything in its box underground (indoorAt, src/gfx/shaders.js).
//
// To change it: move the rooms and tunnels below; the encounters (PACKS, BOSSES) name rooms by id, so they move with them.
// Then node tools/dungeon/check.mjs walks it: every room joined, every pack and boss on the floor, the portals clear.

import { hash2, vnoise } from './terrain-noise.js';

// Where it lies: its entrance, in the world, and the height its rooms are measured from.
export const DUNGEON = { name: 'The Hollowfang Warrens', x: 5760, z: -40, y: -50 };
// The cave mouth near the kobolds' den where its portal stands, and where the quartermaster waits.
export const PORTAL = { x: 128, z: -212, yaw: 2.6, r: 2.2 };
export const BROKER_SPOTS = { portal: [PORTAL.x + 4.2, PORTAL.z + 2.4], town: [5, -2] };

// Rooms: id, middle (local: x east, z south of the entrance), radius, floor height over DUNGEON.y, how high the roof can rise.
export const ROOMS = [
  { id: 'mouth', x: 0, z: 0, r: 9, y: 0, roof: 7, name: 'the Mouth' },
  { id: 'diggings', x: 0, z: -46, r: 14, y: -2, roof: 9, name: 'the Diggings' },
  { id: 'tallow', x: 52, z: -63, r: 13, y: -3, roof: 9, name: 'the Tallow Pit' },
  { id: 'dig', x: 52, z: -120, r: 20, y: -6, roof: 15, name: "Grubnash's Dig" },
  { id: 'warren', x: -15, z: -147, r: 14, y: -6, roof: 9, name: 'the Warren' },
  { id: 'feast', x: -62, z: -180, r: 15, y: -6, roof: 11, name: 'the Feasting Hall' },
  { id: 'throne', x: -62, z: -232, r: 19, y: -7, roof: 14, name: 'the Twin Thrones' },
  { id: 'descent', x: 0, z: -272, r: 12, y: -14, roof: 12, name: 'the Bone Stair' },
  { id: 'lair', x: 0, z: -334, r: 30, y: -16, roof: 24, name: "Venomaw's Hoard" },
];
// Tunnels: a line of points (local x, z) and how wide it is either side. Their floors run between the rooms' they join.
export const TUNNELS = [
  { pts: [[0, -7], [1.5, -22], [0, -34]], w: 3.2 },
  { pts: [[11, -51], [26, -55], [41, -60]], w: 3 },
  { pts: [[52, -75], [50, -88], [52, -101]], w: 3.4 },
  { pts: [[36, -130], [18, -137], [0, -143]], w: 3 },
  { pts: [[-27, -153], [-40, -160], [-51, -170]], w: 3 },
  { pts: [[-62, -194], [-60, -204], [-62, -214]], w: 3.4 },
  { pts: [[-46, -243], [-30, -252], [-14, -262], [-5, -268]], w: 3.2 },
  { pts: [[0, -283], [1, -293], [0, -305]], w: 4.4 },
  // Grubnash's diggers' holes: dead ends off his dig, where they come out.
  { pts: [[70, -112], [80, -106]], w: 1.8, dead: true },
  { pts: [[38, -106], [30, -98]], w: 1.8, dead: true },
  { pts: [[60, -138], [66, -147]], w: 1.8, dead: true },
];
// (Each tunnel's ends are carried on into the room it opens on, so a narrow place in a room's edge can't close it.)
for (const t of TUNNELS) {
  for (const end of [0, t.pts.length - 1]) {
    const p = t.pts[end];
    let best = null, bd = Infinity;
    for (const r of ROOMS) { const d = Math.hypot(p[0] - r.x, p[1] - r.z) - r.r; if (d < bd) { bd = d; best = r; } }
    if (!best || bd > 5) continue;
    const L = Math.hypot(best.x - p[0], best.z - p[1]) || 1, go = Math.min(6, L - 2);
    const q = [p[0] + (best.x - p[0]) / L * go, p[1] + (best.z - p[1]) / L * go];
    if (end === 0) t.pts.unshift(q); else t.pts.push(q);
  }
}

// Rock left standing: pillars a body can hide behind (local x, z, radius). Venomaw's hoard has a ring of them.
export const PILLARS = [
  [-5, -44, 1.3], [6, -50, 0.9], [57, -60, 1.1],
  [44, -118, 1.4], [61, -126, 1.2],
  [-70, -226, 1.3], [-56, -222, 1.3],
  [-13, -332, 2.0], [13, -332, 2.0], [-8, -320, 1.8], [8, -320, 1.8], [-17, -345, 1.9], [17, -345, 1.9],
];

// The trash, room by room: who (roster.json models), how many. They wake as you come into their room.
const KOBOLDS = ['kobold_1', 'kobold_3', 'kobold_armored_1', 'kobold_armored_2'];
const GOBLINS = ['goblin_green_1', 'goblin_green_2', 'goblin_green_3', 'goblin_green_armored_1', 'goblin_green_armored_2'];
export const PACKS = [
  { key: 'hf_diggings', room: 'diggings', pick: KOBOLDS, n: 4, pal: ['Base', 'Base', 'Infernal'] },
  { key: 'hf_tallow', room: 'tallow', pick: KOBOLDS, n: 4, pal: ['Base', 'Abyssal'] },
  { key: 'hf_warren', room: 'warren', pick: GOBLINS, n: 4, pal: ['Base', 'Blighted'] },
  { key: 'hf_feast', room: 'feast', pick: GOBLINS.concat(KOBOLDS), n: 5, pal: ['Base', 'Ashen', 'Blighted'] },
  { key: 'hf_descent', room: 'descent', pick: ['goblin_green_armored_1', 'goblin_green_armored_2', 'kobold_armored_3'], n: 4, pal: ['Blighted', 'Corrupted'] },
];
// The bosses, in the order they're met. model: roster.json (the bosses are bigger, recoloured copies of the rank and file:
// see the hf_ entries there). The fights themselves are src/sim/dungeon.js.
export const BOSSES = [
  { key: 'grubnash', room: 'dig', name: 'Grubnash the Tunnel-King', models: ['hf_grubnash'], pal: ['Infernal'], hp: 9000, damage: 55, reach: 3.0, loot: 8 },
  { key: 'twins', room: 'throne', name: 'Skrit and Skrat', models: ['hf_skrit', 'hf_skrat'], pal: ['Base'], hp: 5200, damage: 36, reach: 2.6, loot: 8 },
  { key: 'venomaw', room: 'lair', name: 'Venomaw, Mother of the Warren', models: ['hf_venomaw'], pal: ['Base'], hp: 16000, damage: 70, reach: 5.2, loot: 0 },
];
export const BOSS_KEYS = BOSSES.map((b) => b.key);
// What the fights call out, by number (src/sim/dungeon.js sends the number, src/ui/party.js shows the words): the mechanics,
// and what to do about each. A boss's own lines are its name and then the words.
export const WARNINGS = [
  /* 0 */ 'Grubnash slams the roof! Rocks are coming down: get out of the circles!',
  /* 1 */ 'Grubnash calls his diggers! Kill them before they reach him: each one he eats makes him stronger.',
  /* 2 */ 'Grubnash eats a digger and grows stronger!',
  /* 3 */ 'Skrit and Skrat share their pain: keep their health even, or the weaker one shrugs your blows off.',
  /* 4 */ 'Skrit hurls a firepot! Move out of the fire.',
  /* 5 */ 'Skrat spins his blades! Get away from him until he stops.',
  /* 6 */ 'One twin is down: the other goes wild! Finish him fast.',
  /* 7 */ 'Venomaw: stand at her sides. Her breath burns what is in front of her, her tail sweeps what is behind. Only the tank faces her.',
  /* 8 */ 'Venomaw draws breath! Only the tank in front of her!',
  /* 9 */ 'Venomaw spits acid! Move out of the green.',
  /* 10 */ 'Venomaw takes to the air! Hide behind a stone pillar when she breathes!',
  /* 11 */ 'Venomaw breathes across the hoard! Behind a pillar, now!',
  /* 12 */ 'Whelps hatch from the hoard! Kill them before they swarm the healer.',
  /* 13 */ 'Venomaw lands, frenzied! Burn her down!',
  /* 14 */ 'The tank is down! Healer, get them up, everyone else back off!',
  /* 15 */ 'Grubnash is enraged!',
  /* 16 */ 'Venomaw is enraged: she will kill you all!',
  /* 17 */ 'Grubnash turns on you! Get behind the tank, or out of his reach, till he lets go.',
  /* 18 */ 'A twin turns on you! Get behind the tank, or out of his reach, till he lets go.',
  /* 19 */ 'Venomaw turns her head to you! Get behind the tank, out of her reach, till she looks away.',
];
// Which of those a boss calls when it turns on you (src/sim/dungeon.js turnOn).
export const TURN_WARN = { grubnash: 17, twins: 18, venomaw: 19 };

// The digger who runs from his hole to Grubnash, and the dragon's whelps.
export const ADDS = { digger: 'kobold_1', whelp: 'hf_whelp' };
// The diggers' holes (the dead-end tunnels' far ends) and Venomaw's perch when she flies (local).
export const HOLES = TUNNELS.filter((t) => t.dead).map((t) => t.pts[t.pts.length - 1]);
export const PERCH = { x: 0, z: -348, up: 3 };
// What the party needs to go in: four with you, one to take the blows, one to heal (src/sim/dungeon.js, src/ui/party.js).
export const PARTY = { size: 4, tanks: ['lancer'], healers: ['paladin'] };
export const roleOf = (cls) => (PARTY.tanks.includes(cls) ? 'tank' : PARTY.healers.includes(cls) ? 'heal' : 'dps');
// The Delve's codes, sent from the sim as EV.DELVE (code, a, b, c).
export const DELVE = { NEED: 0, ENTER: 1, LEAVE: 2, WARN: 3, BOSS: 4, BOSS_DOWN: 5, WIPE: 6, CLEAR: 7, RESET: 8 };

// Where you come in, and where the portals inside stand (local).
export const ENTRY = { x: 0, z: 3, yaw: Math.PI };
export const EXIT_IN = { x: 0, z: 6.5 };          // back out, by the way in
export const EXIT_OUT = { x: 0, z: -358 };        // out, behind Venomaw's hoard, once she's dead

// ---- the field ---------------------------------------------------------------------------------------------------------

const CELL = 0.5;
const PAD = 6;
const room = (id) => ROOMS.find((r) => r.id === id);
export const roomOf = room;
let G = null;

// A room's edge isn't round: a few waves round it, the same every time.
function roomR(r, a) {
  const s = (r.seed ??= hash2(Math.round(r.x * 7), Math.round(r.z * 3)) * 6.28);
  return r.r * (1 + 0.11 * Math.sin(a * 3 + s) + 0.07 * Math.sin(a * 5 + s * 2.1) + 0.035 * Math.sin(a * 11 + s * 0.7));
}

function build() {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const grow = (x, z, r) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r); };
  for (const r of ROOMS) grow(r.x, r.z, r.r * 1.25);
  for (const t of TUNNELS) for (const [x, z] of t.pts) grow(x, z, t.w * 1.4);
  x0 = Math.floor(x0 - PAD); z0 = Math.floor(z0 - PAD); x1 = Math.ceil(x1 + PAD); z1 = Math.ceil(z1 + PAD);
  const W = Math.round((x1 - x0) / CELL) + 1, H = Math.round((z1 - z0) / CELL) + 1;
  const sdf = new Float32Array(W * H).fill(-PAD), floor = new Float32Array(W * H);
  // The tunnels' ends take their floors from the rooms they open into (or the nearest point of another tunnel).
  const tunnelY = TUNNELS.map((t) => {
    const end = (p) => {
      let best = null, bd = Infinity;
      for (const r of ROOMS) { const d = Math.hypot(p[0] - r.x, p[1] - r.z) - r.r; if (d < bd) { bd = d; best = r.y; } }
      return best;
    };
    return [end(t.pts[0]), end(t.pts[t.pts.length - 1])];
  });
  // Each tunnel's length along its points, for its floor's slope.
  const lens = TUNNELS.map((t) => { const s = [0]; for (let i = 1; i < t.pts.length; i++) s.push(s[i - 1] + Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][1] - t.pts[i - 1][1])); return s; });
  for (let j = 0; j < H; j++) {
    const z = z0 + j * CELL;
    for (let i = 0; i < W; i++) {
      const x = x0 + i * CELL;
      let f = -PAD, wsum = 0, ysum = 0;
      for (let q = 0; q < ROOMS.length; q++) {
        const r = ROOMS[q], dx = x - r.x, dz = z - r.z;
        if (Math.abs(dx) > r.r * 1.3 + 6 || Math.abs(dz) > r.r * 1.3 + 6) continue;
        const v = roomR(r, Math.atan2(dz, dx)) - Math.hypot(dx, dz);
        if (v > f) f = v;
        const w = Math.exp(Math.min(v, 8) * 0.9);
        wsum += w; ysum += w * r.y;
      }
      for (let k = 0; k < TUNNELS.length; k++) {
        const t = TUNNELS[k], s = lens[k], L = s[s.length - 1], pad = t.w * 2 + 3;
        for (let q = 1; q < t.pts.length; q++) {
          const a = t.pts[q - 1], b = t.pts[q];
          if (x < Math.min(a[0], b[0]) - pad || x > Math.max(a[0], b[0]) + pad || z < Math.min(a[1], b[1]) - pad || z > Math.max(a[1], b[1]) + pad) continue;
          const sx = b[0] - a[0], sz = b[1] - a[1];
          const u = Math.max(0, Math.min(1, ((x - a[0]) * sx + (z - a[1]) * sz) / (sx * sx + sz * sz || 1)));
          const d = Math.hypot(x - a[0] - sx * u, z - a[1] - sz * u);
          const along = (s[q - 1] + (s[q] - s[q - 1]) * u) / L;
          const w0 = t.w * (1 + 0.18 * Math.sin(along * L * 0.35 + k * 1.7) + 0.08 * Math.sin(along * L * 0.9 + k));
          const v = w0 - d;
          if (v > f) f = v;
          const w = Math.exp(Math.min(v, 8) * 0.9) * 0.7;
          wsum += w; ysum += w * (tunnelY[k][0] + (tunnelY[k][1] - tunnelY[k][0]) * along);
        }
      }
      for (let q = 0; q < PILLARS.length; q++) {
        const px = PILLARS[q][0], pz = PILLARS[q][1], pr = PILLARS[q][2];
        if (Math.abs(x - px) > pr + 7 || Math.abs(z - pz) > pr + 7) continue;
        const v = Math.hypot(x - px, z - pz) - pr * (1 + 0.12 * Math.sin(Math.atan2(z - pz, x - px) * 4 + px));
        if (v < f) f = v;
      }
      const k = j * W + i;
      sdf[k] = Math.max(-PAD, f);
      // A little give in the floor, lumps and hollows, worn smooth near the middle of a way.
      floor[k] = (wsum > 0 ? ysum / wsum : 0) + (vnoise(x * 0.31, z * 0.31) - 0.5) * 0.35 * Math.min(1, Math.max(0, 1.5 - f * 0.25));
    }
  }
  // Smooth the floor a few times, so the slopes between levels are walked, not stepped.
  const tmp = new Float32Array(W * H);
  for (let pass = 0; pass < 3; pass++) {
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      const k = j * W + i;
      tmp[k] = (floor[k] * 4 + floor[k - 1] + floor[k + 1] + floor[k - W] + floor[k + W]) / 8;
    }
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) floor[j * W + i] = tmp[j * W + i];
  }
  G = { x0: DUNGEON.x + x0, z0: DUNGEON.z + z0, W, H, sdf, floor };
  G.x1 = G.x0 + (W - 1) * CELL; G.z1 = G.z0 + (H - 1) * CELL;
  return G;
}

export const grid = () => G || build();
export const DUNGEON_CELL = CELL;

// The box it all lies in, in the world (from the layout alone, without building the field): for the shaders, the map, a
// quick test. Kept generous.
export const DUNGEON_BOX = (() => {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const r of ROOMS) { x0 = Math.min(x0, r.x - r.r * 1.3); x1 = Math.max(x1, r.x + r.r * 1.3); z0 = Math.min(z0, r.z - r.r * 1.3); z1 = Math.max(z1, r.z + r.r * 1.3); }
  for (const t of TUNNELS) for (const [x, z] of t.pts) { x0 = Math.min(x0, x - 6); x1 = Math.max(x1, x + 6); z0 = Math.min(z0, z - 6); z1 = Math.max(z1, z + 6); }
  return { x0: DUNGEON.x + x0 - PAD, z0: DUNGEON.z + z0 - PAD, x1: DUNGEON.x + x1 + PAD, z1: DUNGEON.z + z1 + PAD, y0: DUNGEON.y - 30, y1: DUNGEON.y + 30 };
})();

export const inDungeon = (x, z) => x > DUNGEON_BOX.x0 && x < DUNGEON_BOX.x1 && z > DUNGEON_BOX.z0 && z < DUNGEON_BOX.z1;

function sample(arr, x, z) {
  const g = grid();
  const u = Math.max(0, Math.min(g.W - 1.001, (x - g.x0) / CELL)), v = Math.max(0, Math.min(g.H - 1.001, (z - g.z0) / CELL));
  const i = u | 0, j = v | 0, a = u - i, b = v - j, k = j * g.W + i;
  return (arr[k] * (1 - a) + arr[k + 1] * a) * (1 - b) + (arr[k + g.W] * (1 - a) + arr[k + g.W + 1] * a) * b;
}

// How far inside the open cave a point is (metres; below zero is in the rock).
export const caveRoom = (x, z) => sample(grid().sdf, x, z);
// The floor under a point, in the world.
export const caveFloorY = (x, z) => DUNGEON.y + sample(grid().floor, x, z);
// The roof over a point: low at the walls, rising to the room's own height toward its middle.
export function caveRoofY(x, z) {
  const d = Math.max(0, caveRoom(x, z));
  let top = 6;
  for (const r of ROOMS) { const dd = Math.hypot(x - DUNGEON.x - r.x, z - DUNGEON.z - r.z); if (dd < r.r * 1.3) top = Math.max(top, r.roof * (1 - Math.max(0, dd - r.r * 0.3) / (r.r * 1.0)) + 3); }
  return caveFloorY(x, z) + Math.min(top, 3.2 + d * 0.9 + (vnoise(x * 0.17, z * 0.17) - 0.5) * 1.2);
}

// Push a body of radius r out of the rock, along the way out. True if it was pushed.
export function caveKeep(out, r) {
  let hit = false;
  for (let pass = 0; pass < 3; pass++) {
    const x = out[0], z = out[2], d = caveRoom(x, z);
    if (d >= r) break;
    const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e);
    const L = Math.hypot(gx, gz);
    if (L < 1e-5) break;
    const push = Math.min(2, r - d + 0.01);
    out[0] = x + gx / L * push; out[2] = z + gz / L * push;
    hit = true;
  }
  return hit;
}

// Whether a straight line along the ground stays in the open (sight, a shot, a breath): stepped along the field.
export function caveClear(ax, az, bx, bz, pad = 0.05) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.35);
  for (let i = 1; i < n; i++) { const t = i / n; if (caveRoom(ax + (bx - ax) * t, az + (bz - az) * t) < pad) return false; }
  return true;
}
// How far a ray goes along the ground before the rock, or -1 if it doesn't meet it within maxT.
export function caveRay(ox, oz, dx, dz, maxT) {
  const flat = Math.hypot(dx, dz);
  if (flat < 1e-5) return -1;
  for (let s = 0.3; s <= maxT; s += 0.3) if (caveRoom(ox + dx * s, oz + dz * s) < 0.02) return s;
  return -1;
}

// A local point in the world.
export const toWorld = (x, z) => [DUNGEON.x + x, DUNGEON.z + z];
export const roomAt = (x, z) => {
  let best = null, bd = Infinity;
  for (const r of ROOMS) { const d = Math.hypot(x - DUNGEON.x - r.x, z - DUNGEON.z - r.z) - r.r; if (d < bd) { bd = d; best = r; } }
  return bd < 2 ? best : null;
};
// The middle of a room, in the world, on its floor.
export function roomSpot(id) { const r = room(id); const [x, z] = toWorld(r.x, r.z); return [x, caveFloorY(x, z), z]; }

// Torches on the walls: every so far along each room's edge and down each tunnel, a little in from the rock. [x, y, z, nx, nz]
// (nx, nz: the way out from the wall). The same on every thread, so what's drawn is what's lit.
let TORCHES = null;
export function torches() {
  if (TORCHES) return TORCHES;
  TORCHES = [];
  const place = (x, z) => {
    // Find the wall: step out from (x, z) toward the rock along the field's fall.
    for (let k = 0; k < 20; k++) {
      const d = caveRoom(x, z);
      if (d < 0.6) break;
      const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
      x -= gx / L * (d - 0.45); z -= gz / L * (d - 0.45);
    }
    const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
    if (caveRoom(x, z) < 0.2 || caveRoom(x, z) > 1.2) return;
    if (TORCHES.some((t) => Math.hypot(t[0] - x, t[2] - z) < 4.2)) return;
    TORCHES.push([x, caveFloorY(x, z) + 2.3, z, gx / L, gz / L]);
  };
  // (A torch every seven metres or so round each room's wall, and every six down the tunnels.)
  for (const r of ROOMS) {
    const n = Math.max(5, Math.round(r.r * 6.28 / 7));
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n * 6.28, [x, z] = toWorld(r.x + Math.cos(a) * r.r * 0.6, r.z + Math.sin(a) * r.r * 0.6);
      place(x, z);
    }
  }
  for (const t of TUNNELS) {
    if (t.dead) continue;
    for (let q = 1; q < t.pts.length; q++) {
      const a = t.pts[q - 1], b = t.pts[q], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
      for (let s = 3; s < L; s += 6) {
        const side = (Math.round(s) + q) % 2 ? 1 : -1;
        const [x, z] = toWorld(a[0] + (b[0] - a[0]) * s / L + nx * side, a[1] + (b[1] - a[1]) * s / L + nz * side);
        place(x, z);
      }
    }
  }
  return TORCHES;
}

// Braziers standing round the bigger rooms, a couple of strides out from the wall between its torches: fires on posts
// that light the floor where the fighting is (src/core/sites.js builds them, src/gfx/renderer.js lights them). Clear of
// the portals and the way in. [x, floor y, z]
let BRAZIERS = null;
export function braziers() {
  if (BRAZIERS) return BRAZIERS;
  BRAZIERS = [];
  const keep = [ENTRY, EXIT_IN, EXIT_OUT].map((q) => toWorld(q.x, q.z));
  for (const r of ROOMS) {
    if (r.r < 9) continue;
    const n = r.r >= 25 ? 6 : r.r >= 14 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i + 0.25) / n * 6.28;
      let [x, z] = toWorld(r.x + Math.cos(a) * r.r * 0.5, r.z + Math.sin(a) * r.r * 0.5);
      // Out toward the rock till it's two metres off it.
      for (let k = 0; k < 24 && caveRoom(x, z) > 2.2; k++) {
        const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
        x -= gx / L * 0.5; z -= gz / L * 0.5;
      }
      const d = caveRoom(x, z);
      if (d < 1.6 || d > 2.8) continue;
      if (keep.some(([kx, kz]) => Math.hypot(kx - x, kz - z) < 6)) continue;
      if (BRAZIERS.some((b) => Math.hypot(b[0] - x, b[2] - z) < 5)) continue;
      BRAZIERS.push([x, caveFloorY(x, z), z]);
    }
  }
  return BRAZIERS;
}

// ---- the dungeon's flow field, for whatever chases or follows inside it ---------------------------------------------------
// A metre grid over the box, the cells too near the rock for a body shut. Fields are made to a goal, shared by everyone going
// to the same place (a goal is rounded to two metres), a few kept at a time.

export class CaveNav {
  constructor() {
    const g = grid();
    this.cell = 1; this.x0 = g.x0; this.z0 = g.z0;
    this.W = Math.floor((g.x1 - g.x0) / this.cell); this.H = Math.floor((g.z1 - g.z0) / this.cell);
    this.block = new Uint8Array(this.W * this.H);
    for (let j = 0; j < this.H; j++) for (let i = 0; i < this.W; i++) this.block[j * this.W + i] = caveRoom(this.x0 + (i + 0.5) * this.cell, this.z0 + (j + 0.5) * this.cell) < 0.55 ? 1 : 0;
    this.fields = new Map();
    this.queue = new Int32Array(this.W * this.H);
  }

  cellOf(x, z) {
    const i = Math.max(0, Math.min(this.W - 1, Math.floor((x - this.x0) / this.cell))), j = Math.max(0, Math.min(this.H - 1, Math.floor((z - this.z0) / this.cell)));
    return j * this.W + i;
  }

  field(tx, tz, now) {
    const key = Math.round(tx / 2) * 100003 + Math.round(tz / 2);
    let f = this.fields.get(key);
    if (f && now - f.t < 3) { this.fields.delete(key); this.fields.set(key, f); return f.d; }
    const d = f?.d || new Float32Array(this.W * this.H);
    d.fill(1e9);
    let start = this.cellOf(tx, tz);
    // (A goal against the rock: the nearest open cell to it.)
    if (this.block[start]) {
      let best = -1, bd = 1e9;
      const si = start % this.W, sj = (start / this.W) | 0;
      for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) {
        const i = si + di, j = sj + dj;
        if (i < 0 || j < 0 || i >= this.W || j >= this.H || this.block[j * this.W + i]) continue;
        if (di * di + dj * dj < bd) { bd = di * di + dj * dj; best = j * this.W + i; }
      }
      if (best >= 0) start = best;
    }
    const q = this.queue, W = this.W, H = this.H, B = this.block;
    let head = 0, tail = 0;
    q[tail++] = start; d[start] = 0;
    while (head < tail) {
      const k = q[head++], i = k % W, j = (k / W) | 0, dk = d[k];
      if (dk > 700) continue;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const nk = nj * W + ni;
        if (B[nk] || (di && dj && (B[j * W + ni] || B[nj * W + i]))) continue;
        const nd = dk + (di && dj ? 1.414 : 1);
        if (nd < d[nk] - 1e-3) { d[nk] = nd; q[tail++] = nk; }
      }
    }
    if (f) this.fields.delete(key);
    this.fields.set(key, { d, t: now });
    while (this.fields.size > 10) this.fields.delete(this.fields.keys().next().value);
    return d;
  }

  // The way to go from (x, z) toward (tx, tz): straight when the way's open, else down the field.
  flow(out, x, z, tx, tz, now) {
    const L = Math.hypot(tx - x, tz - z) || 1;
    if (L < 1.2 || caveClear(x, z, tx, tz, 0.5)) { out[0] = (tx - x) / L; out[1] = (tz - z) / L; return out; }
    const d = this.field(tx, tz, now), W = this.W;
    const k = this.cellOf(x, z), i = k % W, j = (k / W) | 0;
    let best = d[k], bx = (tx - x) / L, bz = (tz - z) / L;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= this.H) continue;
      const v = d[nj * W + ni] + (di && dj ? 0.414 : 0);
      if (v < best - 0.01) { best = v; bx = di; bz = dj; }
    }
    // (Out of the grid's reach, or on a shut cell: back out from the rock first.)
    if (best >= 1e8 || this.block[k]) {
      const e = 0.3, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e);
      if (Math.hypot(gx, gz) > 1e-4) { bx = gx; bz = gz; }
    }
    const l = Math.hypot(bx, bz) || 1;
    out[0] = bx / l; out[1] = bz / l;
    return out;
  }

  // How far, walking, from one point to another (metres), or Infinity.
  walkDist(x, z, tx, tz, now) {
    const d = this.field(tx, tz, now)[this.cellOf(x, z)];
    return d >= 1e8 ? Infinity : d;
  }
}
