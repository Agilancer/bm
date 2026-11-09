// The lamps in the townsfolk's houses: lit while somebody in the house is up, put out when everyone's asleep or out, and the
// hearth banked down to its embers. A lamp's light (Renderer's frame, L.dim) and its flame in the glow pass go out together.
// Who's in which house, and who's asleep: the folk slot (src/folk/layout.js F.HOUSE, F.SLEEP).
import { F, FOLK_STRIDE, SLOT_HEAD, SH } from '../folk/layout.js';

const EMBERS = 0.3;      // a banked hearth's light, of its blaze
const NEAR_FLAME = 0.35; // a lamp's or candle's flame is this near its light (tools/interior/build_interior.py lamps, candle)

export class HomeLights {
  // it: loadInterior's result (data, glowVB, glowCPU, glowTown); lights: the interior's own lights (data.lights).
  constructor(device, it, lights) {
    this.device = device; this.it = it;
    const homes = it.data.homes, G = it.glowCPU, tris = it.glowTown / 3;
    const inBox = (h, x, z) => x > h.x0 - 0.2 && x < h.x1 + 0.2 && z > h.z0 - 0.2 && z < h.z1 + 0.2;
    const taken = new Set();
    this.houses = [];     // by village house (data.homes[i + 1])
    for (let i = 1; i < homes.length; i++) {
      const h = homes[i], house = { lit: true, lamps: [], fires: [], tris: [] };
      this.houses[i - 1] = house;
      if (!h.route) continue;
      for (const L of lights) {
        if (!inBox(h, L.p[0], L.p[2])) continue;
        const fire = L.flicker >= 0.79;   // hearths (1.0) and the bread oven (0.8); lamps and candles flicker less
        (fire ? house.fires : house.lamps).push(L);
        for (let t = 0; t < tris; t++) {
          if (taken.has(t)) continue;
          const o = t * 27, cx = (G[o] + G[o + 9] + G[o + 18]) / 3, cy = (G[o + 1] + G[o + 10] + G[o + 19]) / 3, cz = (G[o + 2] + G[o + 11] + G[o + 20]) / 3;
          const dx = cx - L.p[0], dy = cy - L.p[1], dz = cz - L.p[2];
          // A lamp's flame and halo; a fire's flame cards (layer 103: the embers under them stay).
          const mine = fire ? G[o + 8] > 102.5 && Math.hypot(dx, dz) < 1.2 && dy > -1.1 && dy < 0.3 : Math.hypot(dx, dy, dz) < NEAR_FLAME;
          if (mine) { taken.add(t); house.tris.push(t); }
        }
      }
    }
    this.t = 0;
  }

  // Every frame: s is the folk slot the renderer holds (null with no townsfolk: then every lamp stays lit).
  frame(s, dt) {
    if (!s) return;
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 0.3;
      const up = new Uint8Array(this.houses.length), n = s[SH.COUNT] | 0;
      for (let i = 0; i < n; i++) {
        const o = SLOT_HEAD + i * FOLK_STRIDE;
        if (s[o + F.ACTIVE] < 0.5 || s[o + F.SLEEP] > 0.5) continue;
        const h = s[o + F.HOUSE];
        if (h >= 0 && h < up.length) up[h] = 1;
      }
      for (let h = 0; h < this.houses.length; h++) {
        const house = this.houses[h];
        if (!house || house.lit === !!up[h]) continue;
        house.lit = !!up[h];
        this.flames(house);
        // (Someone's lit them: the sound of it, by src/main.js. Not on the first look round, when every house is set as it is.)
        if (house.lit && this.seen) this.onLit?.(house.lamps[0] || house.fires[0]);
      }
      this.seen = true;
    }
    // A lamp's put out in a breath, and lit as quick; a fire dies down slowly.
    for (const house of this.houses) {
      if (!house) continue;
      for (const L of house.lamps) L.dim = step(L.dim ?? 1, house.lit ? 1 : 0, dt * 4);
      for (const L of house.fires) L.dim = step(L.dim ?? 1, house.lit ? 1 : EMBERS, dt * 0.5);
    }
  }

  // The house's flames in the glow buffer: as built, or zeroed (a triangle with no area draws nothing).
  flames(house) {
    const G = this.it.glowCPU, zero = new Float32Array(27);
    for (const t of house.tris) this.device.queue.writeBuffer(this.it.glowVB, t * 108, house.lit ? G.subarray(t * 27, t * 27 + 27) : zero);
  }
}

function step(v, to, k) {
  return v < to ? Math.min(to, v + k) : Math.max(to, v - k);
}
