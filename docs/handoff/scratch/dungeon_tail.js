// ---- the delves --------------------------------------------------------------------------------------------------------
// One per dungeon. key: what the quests and the debug call it. tag: before its portals' spots (hf_portal, hf_in, hf_out).
// x, z, y: where its entrance lies in the world, and the height its floors are measured from. level: who it's for. style:
// 'cave' (round, lumpy rooms; winding tunnels; a roof that rises to each room's middle) or 'castle' (rooms with four straight
// walls, level floors, flat roofs, straight passages). rooms, tunnels, pillars, packs: as the Warrens' above. nooks: more
// floor joined to the rooms that isn't a room of its own (an alcove, a gallery). daises: floor raised a step. props: what
// stands in the rooms (src/core/delve-build.js draws them); the solid ones are rock to the field. last: the boss whose death
// opens the way out and clears it. tough: what its packs are to their cousins in the woods. pay: what clearing it is worth.
// look: its paintings and its lights (src/core/delve-build.js, src/gfx/renderer.js).

const WARRENS = {
  key: 'warrens', tag: 'hf', name: DUNGEON.name, short: 'the Warrens', x: DUNGEON.x, z: DUNGEON.z, y: DUNGEON.y, level: 7, style: 'cave',
  rooms: ROOMS, tunnels: TUNNELS, pillars: PILLARS, packs: PACKS, props: WARRENS_PROPS,
  entry: ENTRY, exitIn: EXIT_IN, exitOut: EXIT_OUT, portal: PORTAL, last: 'venomaw', tough: PACK_TOUGH, pay: { xp: 1500, gold: 250 },
  look: { wall: 'rubble', floor: 'rubble', roof: 'dark:rubble', spike: 'dark:rubble', flame: 'flame', light: [1, 0.56, 0.24], fire: [1, 0.6, 0.28] },
  words: { enter: 'The Hollowfang Warrens. Kobolds dug it; goblins took it; something old sleeps at the bottom.', clear: 'The Hollowfang Warrens are cleared. Venomaw is dead!', wipe: "Your party falls... and wakes at the Warrens' mouth." },
};
export const DELVES = [WARRENS, BLACKVIGIL, DEEPS];
for (const d of DELVES) {
  d.nooks ||= []; d.daises ||= []; d.props ||= []; d.pillars ||= [];
  for (const r of d.rooms.concat(d.nooks)) { r.delve = d; if (r.hx !== undefined) r.r = Math.min(r.hx, r.hz); }
  for (const p of d.packs) p.delve = d.key;
  if (d !== WARRENS) carryEnds(d.rooms, d.tunnels);
}
carryEnds(ROOMS, TUNNELS);
// (The new delves' bosses after the Warrens', so a boss's number in BOSSES never changes; and their calls after its calls.)
export const WARN = {};
for (const d of DELVES.slice(1)) {
  for (const b of d.bosses) BOSSES.push({ ...b, delve: d.key });
  for (const [k, text] of Object.entries(d.warnings || {})) { WARN[k] = WARNINGS.length; WARNINGS.push(text); }
  for (const [k, name] of Object.entries(d.turnWarn || {})) TURN_WARN[k] = WARN[name];
}
BOSS_KEYS.push(...BOSSES.slice(BOSS_KEYS.length).map((b) => b.key));
export const ALL_PACKS = DELVES.flatMap((d) => d.packs);
export const delveByKey = (key) => DELVES.find((d) => d.key === key) || null;
// Every portal's spot (src/core/sites.js portalWall names them; src/gfx/renderer.js stands the models on them).
export const PORTAL_SPOTS = DELVES.flatMap((d) => [`${d.tag}_portal`, `${d.tag}_in`, `${d.tag}_out`]);

// ---- the field ---------------------------------------------------------------------------------------------------------

const CELL = 0.5;
const PAD = 6;
const allRooms = DELVES.flatMap((d) => d.rooms);
const room = (id) => allRooms.find((r) => r.id === id);
export const roomOf = room;

// A room's edge isn't round: a few waves round it, the same every time.
function roomR(r, a) {
  const s = (r.seed ??= hash2(Math.round(r.x * 7), Math.round(r.z * 3)) * 6.28);
  return r.r * (1 + 0.11 * Math.sin(a * 3 + s) + 0.07 * Math.sin(a * 5 + s * 2.1) + 0.035 * Math.sin(a * 11 + s * 0.7));
}
// How far outside a room a point is (below zero inside it), by its plain shape: a circle, or four straight walls.
function roomOut(r, dx, dz) {
  if (r.hx === undefined) return Math.hypot(dx, dz) - r.r;
  const ax = Math.abs(dx) - r.hx, az = Math.abs(dz) - r.hz;
  return ax > 0 && az > 0 ? Math.hypot(ax, az) : Math.max(ax, az);
}
// The floor of a room at a point of it: level, or a stair's slope (tz: metres up for each metre south).
const roomY = (r, dz) => r.y + (r.tz || 0) * dz;
// How far a thing standing in a room reaches (a pillar [x, z, r], or a box [x, z, hx, hz]): below zero inside it.
const blockOut = (b, x, z) => (b.length > 3 ? Math.max(Math.abs(x - b[0]) - b[2], Math.abs(z - b[1]) - b[3]) : Math.hypot(x - b[0], z - b[1]) - b[2]);
const solids = (d) => d.solid || (d.solid = d.props.filter((p) => p.solid).map((p) => (p.hx !== undefined ? [p.x, p.z, p.hx, p.hz] : [p.x, p.z, p.r])));

function extent(d) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const grow = (x, z, rx, rz) => { x0 = Math.min(x0, x - rx); x1 = Math.max(x1, x + rx); z0 = Math.min(z0, z - rz); z1 = Math.max(z1, z + rz); };
  for (const r of d.rooms.concat(d.nooks)) { if (r.hx !== undefined) grow(r.x, r.z, r.hx + 2, r.hz + 2); else grow(r.x, r.z, r.r * 1.3, r.r * 1.3); }
  for (const t of d.tunnels) for (const [x, z] of t.pts) grow(x, z, t.w * 1.4 + 2, t.w * 1.4 + 2);
  // (A castle's walls fall on the builder's two-metre cells: its field starts on an even metre.)
  const snap = d.style === 'castle' ? 2 : 1;
  return { x0: Math.floor((x0 - PAD) / snap) * snap, z0: Math.floor((z0 - PAD) / snap) * snap, x1: Math.ceil((x1 + PAD) / snap) * snap, z1: Math.ceil((z1 + PAD) / snap) * snap };
}

function build(d) {
  const { x0, z0, x1, z1 } = extent(d), cave = d.style !== 'castle';
  const ROOMS = d.rooms.concat(d.nooks), TUNNELS = d.tunnels, PILLARS = d.pillars.concat(solids(d));
  const W = Math.round((x1 - x0) / CELL) + 1, H = Math.round((z1 - z0) / CELL) + 1;
  const sdf = new Float32Array(W * H).fill(-PAD), floor = new Float32Array(W * H);
  // The tunnels' ends take their floors from the rooms they open into (or the nearest point of another tunnel).
  const tunnelY = TUNNELS.map((t) => {
    const end = (p) => {
      let best = null, bd = Infinity;
      for (const r of ROOMS) { const dd = roomOut(r, p[0] - r.x, p[1] - r.z); if (dd < bd) { bd = dd; best = roomY(r, p[1] - r.z); } }
      return best;
    };
    const a = end(t.pts[0]), b = end(t.pts[t.pts.length - 1]);
    return [a, t.niche ? a + (t.rise || 0) : b];
  });
  // Each tunnel's length along its points, for its floor's slope.
  const lens = TUNNELS.map((t) => { const s = [0]; for (let i = 1; i < t.pts.length; i++) s.push(s[i - 1] + Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][1] - t.pts[i - 1][1])); return s; });
  for (let j = 0; j < H; j++) {
    const z = z0 + j * CELL;
    for (let i = 0; i < W; i++) {
      const x = x0 + i * CELL;
      let f = -PAD, wsum = 0, ysum = 0, level = 0;
      for (let q = 0; q < ROOMS.length; q++) {
        const r = ROOMS[q], dx = x - r.x, dz = z - r.z;
        let v;
        if (r.hx !== undefined) {
          if (Math.abs(dx) > r.hx + 8 || Math.abs(dz) > r.hz + 8) continue;
          v = -roomOut(r, dx, dz);
        } else {
          if (Math.abs(dx) > r.r * 1.3 + 6 || Math.abs(dz) > r.r * 1.3 + 6) continue;
          v = (cave ? roomR(r, Math.atan2(dz, dx)) : r.r) - Math.hypot(dx, dz);
        }
        if (v > f) f = v;
        const w = Math.exp(Math.min(v, 8) * 0.9);
        wsum += w; ysum += w * roomY(r, dz);
        if (r.flat) level += w;
      }
      for (let k = 0; k < TUNNELS.length; k++) {
        const t = TUNNELS[k], s = lens[k], L = s[s.length - 1], pad = t.w * 2 + 3;
        for (let q = 1; q < t.pts.length; q++) {
          const a = t.pts[q - 1], b = t.pts[q];
          if (x < Math.min(a[0], b[0]) - pad || x > Math.max(a[0], b[0]) + pad || z < Math.min(a[1], b[1]) - pad || z > Math.max(a[1], b[1]) + pad) continue;
          const sx = b[0] - a[0], sz = b[1] - a[1];
          const u = Math.max(0, Math.min(1, ((x - a[0]) * sx + (z - a[1]) * sz) / (sx * sx + sz * sz || 1)));
          const dd = Math.hypot(x - a[0] - sx * u, z - a[1] - sz * u);
          const along = (s[q - 1] + (s[q] - s[q - 1]) * u) / L;
          const w0 = cave ? t.w * (1 + 0.18 * Math.sin(along * L * 0.35 + k * 1.7) + 0.08 * Math.sin(along * L * 0.9 + k)) : t.w;
          const v = w0 - dd;
          if (v > f) f = v;
          const w = Math.exp(Math.min(v, 8) * 0.9) * 0.7;
          wsum += w; ysum += w * (tunnelY[k][0] + (tunnelY[k][1] - tunnelY[k][0]) * along);
        }
      }
      for (let q = 0; q < PILLARS.length; q++) {
        const b = PILLARS[q], px = b[0], pz = b[1], reach = (b.length > 3 ? Math.max(b[2], b[3]) : b[2]) + 7;
        if (Math.abs(x - px) > reach || Math.abs(z - pz) > reach) continue;
        const v = b.length > 3 || !cave || q >= d.pillars.length ? blockOut(b, x, z) : Math.hypot(x - px, z - pz) - b[2] * (1 + 0.12 * Math.sin(Math.atan2(z - pz, x - px) * 4 + px));
        if (v < f) f = v;
      }
      const k = j * W + i;
      sdf[k] = Math.max(-PAD, f);
      // A little give in the floor, lumps and hollows, worn smooth near the middle of a way. (None where it's laid in flags,
      // or is a lake's ice.)
      const rough = cave ? 0.35 * (1 - (wsum > 0 ? level / wsum : 0)) : 0;
      floor[k] = (wsum > 0 ? ysum / wsum : 0) + (rough ? (vnoise(x * 0.31, z * 0.31) - 0.5) * rough * Math.min(1, Math.max(0, 1.5 - f * 0.25)) : 0);
    }
  }
  // Floor raised a step or two: a dais, a gallery's alcove.
  for (const s of d.daises) {
    const i0 = Math.max(0, Math.ceil((s.x - s.hx - x0) / CELL)), i1 = Math.min(W - 1, Math.floor((s.x + s.hx - x0) / CELL));
    const j0 = Math.max(0, Math.ceil((s.z - s.hz - z0) / CELL)), j1 = Math.min(H - 1, Math.floor((s.z + s.hz - z0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) floor[j * W + i] += s.dy;
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
  const G = { x0: d.x + x0, z0: d.z + z0, W, H, sdf, floor };
  G.x1 = G.x0 + (W - 1) * CELL; G.z1 = G.z0 + (H - 1) * CELL;
  return (d.G = G);
}

export const grid = (d = WARRENS) => d.G || build(d);
export const DUNGEON_CELL = CELL;

// The box each lies in, in the world (from the layout alone, without building the field): for the shaders, the map, a
// quick test. Kept generous.
for (const d of DELVES) {
  const e = extent(d);
  d.box = { x0: d.x + e.x0 - 4, z0: d.z + e.z0 - 4, x1: d.x + e.x1 + 4, z1: d.z + e.z1 + 4, y0: d.y - 40, y1: d.y + 50 };
}
export const DUNGEON_BOX = WARRENS.box;

// Which delve a world point is inside: the delve itself, or its key; null out under the sky.
export function delveOf(x, z) {
  for (let i = 0; i < DELVES.length; i++) { const b = DELVES[i].box; if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return DELVES[i]; }
  return null;
}
export const delveAt = (x, z) => delveOf(x, z)?.key ?? null;
export const inDungeon = (x, z) => delveOf(x, z) !== null;

function sample(d, arr, x, z) {
  const g = d.G || build(d);
  const u = Math.max(0, Math.min(g.W - 1.001, (x - g.x0) / CELL)), v = Math.max(0, Math.min(g.H - 1.001, (z - g.z0) / CELL));
  const i = u | 0, j = v | 0, a = u - i, b = v - j, k = j * g.W + i;
  return (arr[k] * (1 - a) + arr[k + 1] * a) * (1 - b) + (arr[k + g.W] * (1 - a) + arr[k + g.W + 1] * a) * b;
}

// How far inside the open cave a point is (metres; below zero is in the rock).
export const caveRoom = (x, z) => { const d = delveOf(x, z) || WARRENS; return sample(d, (d.G || build(d)).sdf, x, z); };
// The floor under a point, in the world.
export const caveFloorY = (x, z) => { const d = delveOf(x, z) || WARRENS; return d.y + sample(d, (d.G || build(d)).floor, x, z); };
// The roof over a point. In a cave: low at the walls, rising to the room's own height toward its middle. In a castle: each
// room's own, level from wall to wall, and a passage's (h, or five metres) between them.
export function caveRoofY(x, z) {
  const d = delveOf(x, z) || WARRENS, lx = x - d.x, lz = z - d.z;
  if (d.style === 'castle') {
    let top = 0;
    for (const r of d.rooms.concat(d.nooks)) if (roomOut(r, lx - r.x, lz - r.z) < 0.3) top = Math.max(top, r.roof);
    if (!top) {
      let bd = Infinity;
      for (const t of d.tunnels) for (let q = 1; q < t.pts.length; q++) {
        const a = t.pts[q - 1], b = t.pts[q], sx = b[0] - a[0], sz = b[1] - a[1];
        const u = Math.max(0, Math.min(1, ((lx - a[0]) * sx + (lz - a[1]) * sz) / (sx * sx + sz * sz || 1)));
        const dd = Math.hypot(lx - a[0] - sx * u, lz - a[1] - sz * u) - t.w;
        if (dd < bd) { bd = dd; top = t.h || 5; }
      }
    }
    return caveFloorY(x, z) + top;
  }
  const dist = Math.max(0, caveRoom(x, z));
  let top = 6;
  for (const r of d.rooms) { const dd = Math.hypot(lx - r.x, lz - r.z); if (dd < r.r * 1.3) top = Math.max(top, r.roof * (1 - Math.max(0, dd - r.r * 0.3) / (r.r * 1.0)) + 3); }
  return caveFloorY(x, z) + Math.min(top, 3.2 + dist * 0.9 + (vnoise(x * 0.17, z * 0.17) - 0.5) * 1.2);
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

// A local point in the world (the Warrens', unless another delve is named).
export const toWorld = (x, z, d = WARRENS) => [d.x + x, d.z + z];
export const roomAt = (x, z) => {
  const d = delveOf(x, z);
  if (!d) return null;
  let best = null, bd = Infinity;
  for (const r of d.rooms) { const dd = roomOut(r, x - d.x - r.x, z - d.z - r.z); if (dd < bd) { bd = dd; best = r; } }
  return bd < 2 ? best : null;
};
// The middle of a room, in the world, on its floor. (And a point of it, so far east and south of its middle.)
export function roomSpot(id, dx = 0, dz = 0) { const r = room(id), x = r.delve.x + r.x + dx, z = r.delve.z + r.z + dz; return [x, caveFloorY(x, z), z]; }
// The points round a room's wall, every `step` metres, a little in from it (local).
function roomEdge(r, step, inset) {
  const out = [];
  if (r.hx === undefined) {
    const n = Math.max(5, Math.round(r.r * 6.28 / step));
    for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * 6.28; out.push([r.x + Math.cos(a) * r.r * inset, r.z + Math.sin(a) * r.r * inset]); }
    return out;
  }
  const hx = r.hx - 1.5, hz = r.hz - 1.5;
  for (const [ax, az, bx, bz] of [[-hx, -hz, hx, -hz], [hx, -hz, hx, hz], [hx, hz, -hx, hz], [-hx, hz, -hx, -hz]]) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; out.push([r.x + ax + (bx - ax) * u, r.z + az + (bz - az) * u]); }
  }
  return out;
}

// Torches on the walls: every so far along each room's edge and down each tunnel, a little in from the rock. [x, y, z, nx, nz]
// (nx, nz: the way out from the wall). The same on every thread, so what's drawn is what's lit. (In the Deeps they're
// shards of ice with a cold light in them: the delve's look says.)
export function torches(d = WARRENS) {
  if (d.torches) return d.torches;
  const TORCHES = d.torches = [], every = d.look.every || 7, high = d.look.high || 2.3;
  const place = (x, z) => {
    // Find the wall: step out from (x, z) toward the rock along the field's fall.
    for (let k = 0; k < 20; k++) {
      const dd = caveRoom(x, z);
      if (dd < 0.6) break;
      const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
      x -= gx / L * (dd - 0.45); z -= gz / L * (dd - 0.45);
    }
    const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
    if (caveRoom(x, z) < 0.2 || caveRoom(x, z) > 1.2) return;
    // (Not on a table or a pew: on the wall.)
    if (solids(d).some((b) => blockOut(b, x - d.x, z - d.z) < 0.9)) return;
    if (TORCHES.some((t) => Math.hypot(t[0] - x, t[2] - z) < every * 0.6)) return;
    TORCHES.push([x, caveFloorY(x, z) + high, z, gx / L, gz / L]);
  };
  // (A torch every seven metres or so round each room's wall, and every six down the tunnels.)
  for (const r of d.rooms) for (const [lx, lz] of roomEdge(r, every, 0.6)) place(d.x + lx, d.z + lz);
  for (const t of d.tunnels) {
    if (t.dead || t.niche) continue;
    for (let q = 1; q < t.pts.length; q++) {
      const a = t.pts[q - 1], b = t.pts[q], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
      for (let s = 3; s < L; s += 6) {
        const side = (Math.round(s) + q) % 2 ? 1 : -1;
        place(d.x + a[0] + (b[0] - a[0]) * s / L + nx * side, d.z + a[1] + (b[1] - a[1]) * s / L + nz * side);
      }
    }
  }
  return TORCHES;
}

// Braziers standing round the bigger rooms, a couple of strides out from the wall between its torches: fires on posts
// that light the floor where the fighting is (src/core/delve-build.js builds them, src/gfx/renderer.js lights them). Clear
// of the portals and the way in. And the ones a room's own things ask for (a prop of kind 'brazier'). [x, floor y, z]
export function braziers(d = WARRENS) {
  if (d.braziers) return d.braziers;
  const BRAZIERS = d.braziers = [];
  const keep = [d.entry, d.exitIn, d.exitOut].map((q) => [d.x + q.x, d.z + q.z]);
  for (const p of d.props) if (p.kind === 'brazier') BRAZIERS.push([d.x + p.x, caveFloorY(d.x + p.x, d.z + p.z), d.z + p.z]);
  for (const r of d.rooms) {
    if (r.r < 9 || r.fires === 0) continue;
    const n = r.r >= 25 ? 6 : r.r >= 14 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i + 0.25) / n * 6.28;
      let x = d.x + r.x + Math.cos(a) * r.r * 0.5, z = d.z + r.z + Math.sin(a) * r.r * 0.5;
      // Out toward the rock till it's two metres off it.
      for (let k = 0; k < 60 && caveRoom(x, z) > 2.2; k++) {
        const e = 0.25, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
        x -= gx / L * 0.5; z -= gz / L * 0.5;
      }
      const dd = caveRoom(x, z);
      if (dd < 1.6 || dd > 2.8) continue;
      if (keep.some(([kx, kz]) => Math.hypot(kx - x, kz - z) < 6)) continue;
      if (BRAZIERS.some((b) => Math.hypot(b[0] - x, b[2] - z) < 5)) continue;
      BRAZIERS.push([x, caveFloorY(x, z), z]);
    }
  }
  return BRAZIERS;
}

// ---- the dungeon's flow field, for whatever chases or follows inside it ---------------------------------------------------
// A metre grid over a delve's box, the cells too near the rock for a body shut. Fields are made to a goal, shared by everyone
// going to the same place (a goal is rounded to two metres), a few kept at a time. One for each delve (the Warrens', unless
// another is named): src/sim/world.js keeps the one for wherever it's asked about.

export class CaveNav {
  constructor(d = WARRENS) {
    const g = grid(d);
    this.delve = d;
    this.cell = 1; this.x0 = g.x0; this.z0 = g.z0;
    this.W = Math.floor((g.x1 - g.x0) / this.cell); this.H = Math.floor((g.z1 - g.z0) / this.cell);
    this.block = new Uint8Array(this.W * this.H);
    for (let j = 0; j < this.H; j++) for (let i = 0; i < this.W; i++) this.block[j * this.W + i] = caveRoom(this.x0 + (i + 0.5) * this.cell, this.z0 + (j + 0.5) * this.cell) < 0.55 ? 1 : 0;
    this.fields = new Map();
    this.queue = new Int32Array(this.W * this.H);
  }
