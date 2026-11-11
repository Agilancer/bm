// The town as the townsfolk know it: whose house is whose, its door, its beds, its seats and tables, its hearth and work
// places (from assets/game/folk/spots.json, read off the furniture by tools/folk/spots.py), and the places outdoors where
// they work, trade, gather and play (PLACES below). Any of these can be claimed by one person at a time (or `cap`).

// The village's houses in tools/village/build_village.py's order, by who has them. (The Halloways keep the old faith and wear its
// blue and gold, so their house is the old one on the square; the reeve, who collects the Throne's tithe and would like it seen,
// has the new stone house at the east end, nearest Velscour's church. Nothing of Tessariel's near Velscour's: see T_CLEAR.)
export const HOUSES = ['inn', 'chandler', 'halloway', 'cottage', 'smith', 'alewife', 'barn', 'tannery', 'weaver', 'hunter', 'coffins', 'tower', 'reeve', 'bakery', 'herbalist'];
// Until a house is built, who'd live there lodges here.
const LODGE = { reeve: 'halloway', bakery: 'inn', herbalist: 'weaver', barn: 'cottage' };

// The owner's rule: nothing of Tessariel's near anything of Velscour's. Whoever wears Tessariel's blue and gold keeps west of this
// (the east end runs on to Velscour's church); src/folk/brain.js holds them to it, tools/folk/life_test.mjs checks it.
export const T_CLEAR = 60;
export const wearsT = (p) => /blue/.test(p.body);

// Outdoors. [x, z, facing yaw (radians, 0 = +z)]; kind says what happens there. cap: how many at once.
// (Laid out for the town as it stands; tools/folk/town_check.mjs says whether each is on free ground.)
export const PLACES = [
  // The square round the well.
  { id: 'well', kind: 'gather', at: [-1.5, 1], r: 3.2, cap: 6 },
  { id: 'square_n', kind: 'gather', at: [-3, -7], r: 2.2, cap: 4 },
  { id: 'square_s', kind: 'gather', at: [-6, 8], r: 2.2, cap: 4 },
  { id: 'square_e', kind: 'gather', at: [7, -2], r: 2.2, cap: 4 },
  { id: 'inn_door', kind: 'gather', at: [-0.5, -11.5], r: 2, cap: 4 },
  { id: 'east_end', kind: 'gather', at: [66, -3.0], r: 2.2, cap: 4 },
  { id: 'oak', kind: 'tryst', at: [-14.5, 18.5], yaw: 0, r: 1.2, cap: 2 },
  // Stalls: the keeper stands behind, customers in front. stall: where the stall itself stands, [x, z, yaw], its keeper's side
  // to its local +z (STALLS in tools/village/build_village.py; the wares on it are drawn by Renderer.wares in src/gfx/renderer.js).
  // at, yaw and front are worked out from it below (STALL_SPOTS).
  { id: 'curios', kind: 'stall', at: [-6.5, -8.6], yaw: Math.PI, front: [-6.5, -11.2], cap: 1, stall: [-6.5, -9.8, 0.08] },
  { id: 'ale', kind: 'stall', at: [7.5, 5.5], yaw: -1.9, front: [5.03, 4.68], cap: 1, stall: [6.36, 5.12, 1.249] },
  { id: 'bread', kind: 'stall', at: [-8, 4.5], yaw: 1.53, front: [-5.4, 4.61], cap: 1, stall: [-6.8, 4.55, -1.61] },
  { id: 'cloth', kind: 'stall', at: [5, -7], yaw: -0.59, front: [3.56, -4.84], cap: 1, stall: [4.33, -6.0, 2.553] },
  // Where the children play.
  { id: 'green', kind: 'play', at: [-9, 15], r: 5, cap: 9 },
  { id: 'square_play', kind: 'play', at: [3, 9], r: 4, cap: 6 },
  // Work outdoors.
  { id: 'fields', kind: 'work', at: [10, 52], r: 7, cap: 4, clips: ['harvest', 'plant', 'water', 'dig', 'shovel'] },
  { id: 'woodpile', kind: 'work', at: [-46.5, 23.5], yaw: Math.PI, cap: 1, clips: ['chop_wood'] },
  { id: 'coffin_yard', kind: 'work', at: [12.5, -31], yaw: 0, cap: 1, clips: ['interact', 'lift'] },
  { id: 'barn', kind: 'work', at: [38, -28], yaw: Math.PI, cap: 2, clips: ['lift', 'shovel'] },
  { id: 'herb_garden', kind: 'work', at: [81.6, 18.4], yaw: 0, cap: 2, clips: ['harvest', 'plant', 'water'] },
  // The watch's posts: the road in from the south-west, and the west road where it comes into town. (None at the east end: the
  // watch are Halloways, in Tessariel's colours, and that end runs on to Velscour's church. T_CLEAR.)
  { id: 'watch_west', kind: 'post', at: [-31, 19], yaw: -2.2, cap: 1 },
  { id: 'watch_gate', kind: 'post', at: [-34, 3.2], yaw: -Math.PI / 2, cap: 1 },
  { id: 'lesson', kind: 'lesson', at: [-10, 12], yaw: 0, r: 2.5, cap: 10 },
  { id: 'yard', kind: 'work', at: [-30, -26], yaw: 0, cap: 2 },
  { id: 'woods_edge', kind: 'work', at: [-60, 14], r: 6, cap: 1 },
];
// A stall's keeper stands under the awning just behind the counter, 0.18 m in from its middle and facing out; customers 1.45 m out the
// other way, in front of the cloth. (The counter is a board 0.6 deep across the customers' side: stall() in build_village.py.)
const STALL_SPOTS = { keeper: 0.18, customer: -1.45 };
for (const p of PLACES) {
  if (!p.stall) continue;
  const [x, z, yaw] = p.stall, sn = Math.sin(yaw), cs = Math.cos(yaw);
  p.at = [x + STALL_SPOTS.keeper * sn, z + STALL_SPOTS.keeper * cs];
  p.front = [x + STALL_SPOTS.customer * sn, z + STALL_SPOTS.customer * cs];
  p.yaw = yaw + Math.PI;
}

// Jory's round at night, lantern up: the edges of the town, and the square.
export const ROUND = [[-1.5, 6], [-14, 10], [-30, 16], [-36, 4], [-34, -22], [-20, -28], [-2, -28], [16, -26], [34, -24], [48, -6], [66, -2.5], [92, -2.5], [92, 3.2], [74, 3.0], [56, 3.5], [42, 14], [24, 30], [4, 44], [-8, 26], [-1.5, 6]];

export class Town {
  constructor(village, interior, spots) {
    this.houses = village.homes.map((h, i) => {
      const c = Math.cos(h.yaw), s = Math.sin(h.yaw), hd = h.d / 2, k = h.k || 1;
      const tr = (lx, lz) => { const X = lx * k, Z = (lz - hd) * k + hd; return [h.x + X * c + Z * s, h.z - X * s + Z * c]; };
      const inner = interior.homes[i + 1] || {};
      const sp = spots?.houses?.[i]?.spots || [];
      const house = {
        i, key: HOUSES[i], x: h.x, z: h.z, yaw: h.yaw,
        outside: tr(h.door, hd + 1.4), inside: tr(h.door, hd - 1.1), door: tr(h.door, hd), doorId: null,
        route: inner.route || [], stair: inner.stair ?? -1,
        upY: Math.max(0, ...((inner.floors || []).map((f) => (f.y === f.y2 ? f.y : 0)))),
        beds: sp.filter((p) => p.kind === 'bed'),
        seats: [], tables: sp.filter((p) => p.kind === 'table' || p.kind === 'trestle'),
        hearth: sp.find((p) => p.kind === 'hearth') || null,
        oven: sp.find((p) => p.kind === 'oven') || null,
        furniture: sp,
      };
      for (const p of sp) {
        if (p.kind === 'chair') house.seats.push({ x: p.x, z: p.z, y: p.y, yaw: Math.atan2(p.dir[0], p.dir[1]), level: p.level });
        if (p.kind === 'bench') {
          // A seat every 0.6 m along it, facing whichever table it's beside (or, with none, the room).
          const n = Math.max(1, Math.floor(p.len / 0.62));
          const t = house.tables.filter((q) => q.level === p.level).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
          let fx = -p.axis[1], fz = p.axis[0];
          const tx = t ? t.x - p.x : h.x - p.x, tz = t ? t.z - p.z : h.z - p.z;
          if (fx * tx + fz * tz < 0) { fx = -fx; fz = -fz; }
          for (let k2 = 0; k2 < n; k2++) {
            const o = (k2 - (n - 1) / 2) * (p.len / n);
            house.seats.push({ x: p.x + p.axis[0] * o, z: p.z + p.axis[1] * o, y: p.y, yaw: Math.atan2(fx, fz), level: p.level, bench: true });
          }
        }
      }
      // Seats at a table: within reach of one and facing it.
      for (const st of house.seats) {
        const t = house.tables.find((q) => q.level === st.level && Math.abs(st.x - q.x) < q.hx + 0.9 && Math.abs(st.z - q.z) < q.hz + 0.9);
        st.table = t ? house.tables.indexOf(t) : -1;
      }
      return house;
    });
    // Each house's door is a thing in the interior's list: the nearest.
    const doors = (interior.things || []).filter((t) => t.type === 'door');
    for (const h of this.houses) {
      let best = null, bd = 4;
      for (const d of doors) { const dist = Math.hypot(d.cx - h.door[0], d.cz - h.door[1]); if (dist < bd) { bd = dist; best = d; } }
      h.doorId = best ? best.id : null;
    }
    this.byKey = Object.fromEntries(this.houses.map((h) => [h.key, h]));
    this.places = Object.fromEntries(PLACES.map((p) => [p.id, { ...p, held: new Set() }]));
    this.claims = new Map();   // spot object -> person id
  }

  house(key) {
    return this.byKey[key] || this.byKey[LODGE[key]] || this.byKey.inn;
  }

  // A seat, a bed or a stall: theirs while they hold it.
  claim(spot, who) {
    const held = this.claims.get(spot);
    if (held && held !== who) return false;
    this.claims.set(spot, who);
    return true;
  }

  release(spot, who) {
    if (spot && this.claims.get(spot) === who) this.claims.delete(spot);
  }

  free(spot, who) {
    const held = this.claims.get(spot);
    return !held || held === who;
  }

  // A free seat in a house, preferring one at a table and on the ground floor.
  seat(house, who, { table = true, level = 0 } = {}) {
    const pick = house.seats.filter((s) => s.ok !== false && s.level === level && (!table || s.table >= 0) && this.free(s, who));
    if (!pick.length) return null;
    return pick[Math.floor(Math.random() * pick.length)];
  }
}
