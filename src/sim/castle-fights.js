// The fights in Castle Velscour's wards (src/core/delve-castle.js). In the manner of src/sim/sewer-fights.js: a deck of
// called-out moves, adds at so much of its life, a turn on you, an enrage, and one thing of its own:
//   the Gate Captain's garrison comes down off the walls, and while any of them stands their shields cover him (he takes
//     a third of what he's dealt); and he drops the gate's teeth across his yard, from the slots they hang in. And what you
//     emptied behind his walls first leaves him less: the Bunk Rooms, fewer of his garrison come down; the Armoury, no
//     crossbows on the walls; the Oubliettes (their Gaoler keeps the gate's winch), no gate.
// Gone in alone or not (party: false), so its calls speak to one: you.
import { MOVES } from './moves.js';
import { ELEM } from './spells.js';
import { WARN, roomOf, roomSpot } from '../core/dungeon.js';
import { GATE_SLOTS } from '../core/delve-castle.js';

const { DRAIN, STONE } = ELEM;
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const K = (m, x) => m.opts.damage * x * 1.3;
const sweep = (P, m, t, dmg, o = {}) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: o.r || 8, half: o.half || 1.0, fuse: o.fuse || 1.15, dmg, knock: 4, elem: o.elem ?? STONE, from: m, aim: t, lock: 0.45, tag: o.tag || 'sweep' });
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
// (One of his garrison: it fights, and it's counted while it stands.)
const shieldman = (W, k) => { k.garrison = true; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; };
// (A wing of the ward you've emptied: its pack's lair cleared, now or before.)
const emptied = (W, key) => !!W.sim.tripo?.lairs.some((l) => l.key === key && (l.state === 'cleared' || l.clearedOnce));
const DECK = ['cleave', 'charge', 'bash', 'gate', 'volley'];

export const CASTLE_FIGHTS = {
  // ---- the Gate Captain: his blade, his charge, his shield, the gate's teeth and the walls' crossbows, and his garrison ----------
  gatecaptain: {
    open: 'gcp_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [300, 2, 'gcp_enrage'],
    deck: (f) => f.deck || DECK,
    adds: [
      { at: 0.7, warn: 'gcp_garrison', n: (W, f) => (f.fewer ? 2 : 3), pick: KNIGHTS, from: 'doors', hp: 2600, damage: 48, name: 'GARRISON KNIGHT', pal: ['Oxblood'], setUp: shieldman },
      { at: 0.35, warn: 'gcp_garrison', n: (W, f) => (f.fewer ? 2 : 4), pick: KNIGHTS, from: 'doors', hp: 2600, damage: 48, name: 'GARRISON KNIGHT', pal: ['Oxblood'], setUp: shieldman },
    ],
    moves: {
      cleave: { clip: 'atk2', secs: 1.3, warn: 'gcp_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.3), { r: 9, half: 1.1 }) },
      charge: { who: 'far', clip: null, warn: 'gcp_charge', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.55), { r: 24, w: 1.8 }) },
      bash: { who: 'none', clip: 'bash', at: 0.5, secs: 1.5, warn: 'gcp_bash', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.45), { reach: 22, speed: 10 }) },
      // The gate's teeth: all three dropped from their slots, each a line right across his yard under its own.
      gate: { who: 'none', clip: 'roar', secs: 1.5, warn: 'gcp_gate', go(W, f, m, t, P) {
        const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id);
        // (In his red, and faint, so the yard still shows under them.)
        for (const z of GATE_SLOTS) P.mark({ shape: 'line', x: rx - r.hx, z: rz + (z - r.z), yaw: Math.PI / 2, r: r.hx * 2, w: 1.2, fuse: 1.8, dmg: K(m, 1.5), knock: 3, elem: DRAIN, dim: 0.55, from: m, tag: 'gate' });
      } },
      // The crossbows on the yard's walls: on you, and wherever else.
      volley: { who: 'none', clip: 'atk4', secs: 1.4, warn: 'gcp_volley', go(W, f, m, t, P) {
        const [rx, , rz] = roomSpot(roomOf(f.boss.room).id);
        for (const b of W.bodies()) P.mark({ x: b.x, z: b.z, r: 2.4, fuse: 1.9, dmg: K(m, 0.8), knock: 1, elem: STONE, follow: b, lock: 0.45, tag: 'volley' });
        P.rain(rx, rz, 18, 8, 1.2, { r: 2.2, fuse: 1.7, dmg: K(m, 0.7), knock: 1, elem: DRAIN, tag: 'volley' });
      } },
    },
    // His garrison's shields: while one of them stands he takes a third of what he's dealt. The last of them down, he's bare.
    step(W, f, [m]) {
      if (!m) return;
      // (Weighed once, as he comes at you: which of his wings you'd emptied.)
      if (!f.weighed) {
        f.weighed = true; f.fewer = emptied(W, 'cl_bunks');
        const bows = !emptied(W, 'cl_armoury'), gate = !emptied(W, 'cl_oub');
        f.deck = DECK.filter((k) => (k !== 'volley' || bows) && (k !== 'gate' || gate));
        // (Each named, only what's gone.)
        if (f.fewer) W.warn(WARN.gcp_less_men, 30);
        if (!bows) W.warn(WARN.gcp_less_bows, 30);
        if (!gate) W.warn(WARN.gcp_less_gate, 30);
      }
      const cover = W.adds().some((a) => a.garrison && !a.dead && a.hp > 0);
      if (cover) { m.shrug = 0.33; f.covered = true; }
      else if (f.covered) { f.covered = false; m.shrug = 1; W.warn(WARN.gcp_bare, 4); }
    },
  },
};
