// The fights in Castle Velscour's wards (src/core/delve-castle.js). In the manner of src/sim/sewer-fights.js: a deck of
// called-out moves, adds at so much of its life, a turn on you, an enrage, and one thing of its own:
//   the Gate Captain's garrison comes down off the walls, and while any of them stands their shields cover him (he takes
//     a third of what he's dealt); and he drops the gate's teeth across his yard, from the slots they hang in. And what you
//     emptied behind his walls first leaves him less: the Bunk Rooms, fewer of his garrison come down; the Armoury, no
//     crossbows on the walls; the Oubliettes (their Gaoler keeps the gate's winch), no gate.
//   the Feast That Walks, in the Middle Ward's Great Hall: his servers bring him his courses through the doors by the
//     screens, and each that reaches him feeds him (life back, and he hits the harder); and he heaves the long tables down
//     their rows, or sweeps the aisle between them: a lane of the hall is always clear, and it's never the same one.
//   the Iron Barracks' three (src/core/delve-barracks.js): the Kennelmaster's hounds, his whip and the blood-scent you
//     wash off in the trough; the Quartermaster's powder-runners, whose kegs he throws; the Iron Marshal's ranks, his
//     Iron Standard (while it stands he mends and calls men to it) and his last stand.
// Gone in alone or not (party: false), so its calls speak to one: you. (The Iron Barracks takes a party: its calls speak
// to all of you.)
import { MOVES } from './moves.js';
import { ELEM, FX } from './spells.js';
import { WARN, roomOf, roomSpot } from '../core/dungeon.js';
import { GATE_SLOTS, HALL_ROWS } from '../core/delve-castle.js';
import { POWDER_RACKS, STANDARD_AT, TROUGH } from '../core/delve-barracks.js';
import { errand } from './sewer-fights.js';

const { DRAIN, STONE, POISON, FIRE, BONE } = ELEM;
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// (A spot in the delve, from its own x and z: its room's spot, offset.)
const at = (W, [x, z]) => [W.delve.x + x, W.delve.z + z];
const yawTo = (m, t) => Math.atan2(t.x - m.x, t.z - m.z);
const K = (m, x) => m.opts.damage * x * 1.3;
const sweep = (P, m, t, dmg, o = {}) => P.mark({ shape: 'cone', x: m.x, z: m.z, yaw: yawTo(m, t), r: o.r || 8, half: o.half || 1.0, fuse: o.fuse || 1.15, dmg, knock: 4, elem: o.elem ?? STONE, from: m, aim: t, lock: 0.45, tag: o.tag || 'sweep' });
const KNIGHTS = ['velscour_knight_3', 'velscour_knight_4', 'velscour_knight_5', 'velscour_knight_6'];
// (One of his garrison: it fights, and it's counted while it stands.)
const shieldman = (W, k) => { k.garrison = true; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; };
// (A wing of the ward you've emptied: its pack's lair cleared, now or before.)
const emptied = (W, key) => !!W.sim.tripo?.lairs.some((l) => l.key === key && (l.state === 'cleared' || l.clearedOnce));
const DECK = ['cleave', 'charge', 'bash', 'gate', 'volley'];

// (The Feast's servers: each to him, wherever he's got to, with a course.)
const SERVERS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
function server(W, k, m) {
  errand(W, k, m, () => [m.x, m.z], 1.7, (b, sim) => {
    m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.025); m.opts.damage *= 1.06;
    W.warn(WARN.fea_fed, 4);
    sim.casting.burst(FX.PUFF, POISON, m.x, m.y + 2.4, m.z, 0.9, 3, 0.5);
  });
}
// (A lane of the Great Hall, from its west wall to its east, at local z: a line across the whole of it.)
const lane = (W, f, m, P, z, w, dmg, tag) => {
  const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id);
  P.mark({ shape: 'line', x: rx - r.hx, z: rz + (z - r.z), yaw: Math.PI / 2, r: r.hx * 2, w, fuse: 1.9, dmg, knock: 4, elem: STONE, from: m, tag });
};


// (One of the Kennelmaster's hounds: it fights, and it's counted, and the whip and the scent work on it.)
const hound = (W, k) => { k.hound = true; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; };
// (A powder-runner: to the Quartermaster, wherever he's got to; there, he throws its keg.)
function runner(W, k, m) {
  k.runner = true;
  errand(W, k, m, () => [m.x, m.z], 2.0, (b, sim) => {
    W.warn(WARN.qm_keg, 4);
    MOVES.quakeWave(sim.perils, m, null, K(m, 0.55), { reach: 30, speed: 10, elem: FIRE });
    sim.casting.burst(FX.PUFF, FIRE, m.x, m.y + 2.4, m.z, 1.4, 10, 0.6);
  });
}

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

  // ---- the Feast That Walks: his servers and their courses, the tables, his maw, his belly, the plate, the bile ----------
  feast: {
    open: 'fea_open', pace: [4.4, 3.4, 0.35], turn: [24, 4], enrage: [300, 2, 'fea_enrage'],
    deck: ['tables', 'gorge', 'plates', 'belly', 'aisle', 'bile'],
    adds: [
      { at: 0.75, warn: 'fea_courses', n: 3, pick: SERVERS, from: 'doors', hp: 2400, damage: 30, name: 'SERVER', pal: ['Bone-white'], setUp: server },
      { at: 0.45, warn: 'fea_courses', n: 4, pick: SERVERS, from: 'doors', hp: 2400, damage: 30, name: 'SERVER', pal: ['Bone-white'], setUp: server },
      { at: 0.2, warn: 'fea_courses', n: 4, pick: SERVERS, from: 'doors', hp: 2400, damage: 30, name: 'SERVER', pal: ['Bone-white'], setUp: server },
    ],
    moves: {
      // The long tables heaved down both their rows: the aisle between is clear.
      tables: { who: 'none', clip: 'atk2', secs: 1.6, warn: 'fea_tables', go(W, f, m, t, P) { for (const z of [HALL_ROWS[0], HALL_ROWS[2]]) lane(W, f, m, P, z, 2.3, K(m, 1.4), 'tables'); } },
      // The high table swept down the aisle: in among the benches is clear.
      aisle: { who: 'none', clip: 'atk3', secs: 1.6, warn: 'fea_aisle', go: (W, f, m, t, P) => lane(W, f, m, P, HALL_ROWS[1], 3.2, K(m, 1.4), 'aisle') },
      gorge: { clip: 'atk1', secs: 1.3, warn: 'fea_gorge', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.3), { r: 9, half: 1.0, elem: DRAIN }) },
      belly: { who: 'none', clip: 'atk4', at: 0.5, secs: 1.5, warn: 'fea_belly', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.45), { reach: 22, speed: 9 }) },
      // The plate off the high table, at you and wherever else.
      plates: { who: 'none', clip: 'atk2', secs: 1.3, warn: 'fea_plates', go(W, f, m, t, P) {
        for (const b of W.bodies()) P.mark({ x: b.x, z: b.z, r: 2.4, fuse: 1.8, dmg: K(m, 0.8), knock: 1, elem: STONE, follow: b, lock: 0.45, from: m, tag: 'plates' });
        P.rain(m.x, m.z, 14, 6, 1.2, { r: 2, fuse: 1.6, dmg: K(m, 0.6), knock: 1, elem: STONE, tag: 'plates' });
      } },
      bile: { clip: 'atk1', secs: 1.4, warn: 'fea_bile', go: (W, f, m, t, P) => MOVES.spitRain(P, m, t, K(m, 0.6)) },
    },
  },

  // ---- the Kennelmaster: his lash and his chain, his hounds and his whip, and the blood-scent ------------------------------
  kennelmaster: {
    open: 'ken_open', pace: [4.0, 3.1, 0.35], turn: [22, 4], enrage: [300, 2, 'ken_enrage'],
    deck: ['lash', 'scent', 'chain', 'lash', 'net', 'howl'],
    adds: [
      { at: 0.8, warn: 'ken_hounds', n: 3, pick: ['ib_hound'], from: 'doors', hp: 2200, damage: 40, name: 'WAR-HOUND', pal: ['Rust'], setUp: hound },
      { at: 0.55, warn: 'ken_hounds', n: 3, pick: ['ib_hound'], from: 'doors', hp: 2200, damage: 40, name: 'WAR-HOUND', pal: ['Rust'], setUp: hound },
      { at: 0.3, warn: 'ken_hounds', n: 4, pick: ['ib_hound'], from: 'doors', hp: 2200, damage: 40, name: 'WAR-HOUND', pal: ['Rust'], setUp: hound },
    ],
    moves: {
      lash: { clip: 'atk2', secs: 1.3, warn: 'ken_lash', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.8), { r: 9, half: 0.9, elem: DRAIN }) },
      chain: { who: 'far', clip: 'atk3', secs: 1.4, warn: 'ken_chain', go: (W, f, m, t, P) => P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t), r: 22, w: 1.6, fuse: 1.3, dmg: K(m, 1.6), knock: 4, elem: STONE, from: m, aim: t, lock: 0.5, tag: 'chain' }) },
      net: { clip: 'atk1', secs: 1.2, warn: 'ken_net', go: (W, f, m, t, P) => P.mark({ x: t.x, z: t.z, r: 3.2, fuse: 1.6, dmg: K(m, 2.1), knock: 1, elem: STONE, follow: t, lock: 0.5, from: m, tag: 'net' }) },
      howl: { who: 'none', clip: 'roar', secs: 1.5, warn: 'ken_howl', go: (W, f, m, t, P) => MOVES.howlWave(P, m, null, K(m, 0.8)) },
      // One of you marked with the hounds' blood-scent: till it's washed off in the trough, every hound runs at them, and bites
      // the harder.
      scent: { who: 'mark', clip: 'atk4', secs: 1.0, warn: 'ken_scent', go(W, f, m, t) { f.scent = t; f.scentAt = 0; } },
    },
    // His whip: every twenty-five seconds, every hound still up goes mad. And the scent: on whoever it's on till they stand
    // in the trough; the hounds after them alone.
    step(W, f, [m], dt) {
      if (!m) return;
      const hounds = W.adds().filter((a) => a.hound && !a.dead && a.hp > 0);
      if ((f.whip = (f.whip || 0) + dt) > 25 && hounds.length) {
        f.whip = 0; W.warn(WARN.ken_whip, 4);
        for (const h of hounds) { h.opts.damage *= 1.35; h.opts.speed = (h.opts.speed || 5) * 1.15; }
      }
      const s = f.scent;
      if (s) {
        const [tx, tz] = at(W, TROUGH);
        if (s.dead || Math.hypot(s.x - tx, s.z - tz) < 2.4 || (f.scentAt += dt) > 30) { f.scent = null; if (!s.dead) W.warn(WARN.ken_washed, 4); for (const h of hounds) h.fixT = 0; }
        else for (const h of hounds) { h.fixOn = s; h.fixT = W.sim.time + 0.5; }
      }
    },
    // The scented: to the trough, now. (Everyone else stays as they are.)
    order(W, f, b) { return f.scent === b ? { to: at(W, TROUGH), urgent: true } : null; },
  },

  // ---- the Quartermaster: his maul and his grapeshot, his racks, his fuses, and his powder-runners --------------------------
  quartermaster: {
    open: 'qm_open', pace: [4.2, 3.2, 0.35], turn: [22, 4], enrage: [300, 2, 'qm_enrage'],
    deck: ['cleave', 'racks', 'shot', 'quake', 'fuse', 'cleave'],
    adds: [],
    moves: {
      cleave: { clip: 'atk2', secs: 1.4, warn: 'qm_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.0), { r: 9, half: 1.0 }) },
      // The racks along the room pulled down: three lanes the length of it, a lane between each clear.
      racks: { who: 'none', clip: 'atk3', secs: 1.6, warn: 'qm_racks', go(W, f, m, t, P) {
        const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id);
        for (const dz of [-10, 0, 10]) P.mark({ shape: 'line', x: rx - r.hx, z: rz + dz, yaw: Math.PI / 2, r: r.hx * 2, w: 3, fuse: 1.9, dmg: K(m, 1.3), knock: 3, elem: STONE, from: m, tag: 'racks' });
      } },
      shot: { who: 'none', clip: 'atk4', secs: 1.3, warn: 'qm_shot', go(W, f, m, t, P) {
        for (const b of W.bodies()) P.mark({ x: b.x, z: b.z, r: 2.4, fuse: 1.8, dmg: K(m, 0.8), knock: 1, elem: FIRE, follow: b, lock: 0.45, tag: 'shot' });
        P.rain(m.x, m.z, 16, 7, 1.2, { r: 2.1, fuse: 1.7, dmg: K(m, 0.65), knock: 1, elem: FIRE, tag: 'shot' });
      } },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'qm_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.4), { reach: 22, speed: 9 }) },
      fuse: { clip: 'atk1', secs: 1.3, warn: 'qm_fuse', go: (W, f, m, t, P) => MOVES.firepots(P, m, t, K(m, 0.7)) },
    },
    // His powder-runners: out of the racks every twenty seconds, two at a time, each to him; one that gets there, he throws
    // its keg, a blast right across the stores. (Every twenty-six: at twenty, a player half a second late lost the party.)
    step(W, f, [m], dt) {
      if (!m) return;
      if ((f.run = (f.run || 0) + dt) < 26) return;
      f.run = 0; W.warn(WARN.qm_runners, 4);
      for (let i = 0; i < 2; i++) {
        const n = (f.racks = (f.racks || 0) + 1), [x, z] = at(W, POWDER_RACKS[n % POWDER_RACKS.length]);
        W.spawnAdds(`qm_runner_${n}`, ['ib_runner'], [x, z], 1, (k) => { k.hp = k.maxHp = 1600; k.opts.name = 'POWDER-RUNNER'; runner(W, k, m); }, ['Rust']);
      }
    },
    // (The runners are everyone's but the tank's: whoever's nearest a living one goes for it.)
    order(W, f, b, [m]) {
      if (!m || W.tank(m) === b) return null;
      const rs = W.adds().filter((a) => a.runner && !a.dead && a.hp > 0);
      if (!rs.length) return null;
      const near = rs.reduce((p, q) => (gap(q, b) < gap(p, b) ? q : p));
      return { to: [near.x, near.z] };
    },
  },

  // ---- the Iron Marshal: his ranks, his blade and charge, his lances, the Iron Standard and his last stand -----------------
  ironmarshal: {
    open: 'irm_open', pace: [4.0, 3.0, 0.35], turn: [20, 4], enrage: [360, 2.2, 'irm_enrage'],
    deck: (f) => (f.last ? ['ranks', 'quake', 'lances', 'charge', 'cleave', 'quake'] : ['ranks', 'cleave', 'charge', 'lances', 'cleave', 'quake']),
    adds: [{ at: 0.45, warn: 'irm_called', n: 3, pick: KNIGHTS, from: 'doors', hp: 2600, damage: 48, name: 'BARRACKS KNIGHT', pal: ['Oxblood'] }],
    moves: {
      // His ranks across the hall: four lines of men marching its width, a lane between each to stand in.
      ranks: { who: 'none', clip: 'roar', secs: 1.6, warn: 'irm_ranks', go(W, f, m, t, P) {
        const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id), off = (f.rankOff = ((f.rankOff || 0) + 1) % 2) * 6;
        for (let dz = -18 + off; dz <= 18; dz += 12) P.march(rx - r.hx, rz + dz, Math.PI / 2, r.hx * 2, 2.2, 0.2, { r: 1.5, fuse: 1.0, dmg: K(m, 0.85), knock: 3, elem: STONE, tag: 'ranks' });
      } },
      cleave: { clip: 'atk2', secs: 1.3, warn: 'irm_cleave', go: (W, f, m, t, P) => sweep(P, m, t, K(m, 1.05), { r: 10, half: 1.0 }) },
      charge: { who: 'far', clip: null, warn: 'irm_charge', go: (W, f, m, t, P) => MOVES.ram(P, m, t, K(m, 0.6), { r: 26, w: 2 }) },
      lances: { clip: 'atk3', secs: 1.3, warn: 'irm_lances', go: (W, f, m, t, P) => { for (const turn of [-0.45, 0, 0.45]) P.mark({ shape: 'line', x: m.x, z: m.z, yaw: yawTo(m, t) + turn, r: 18, w: 1, fuse: 1.1, dmg: K(m, 0.8), knock: 2, elem: DRAIN, from: m, tag: 'lances' }); } },
      quake: { who: 'none', clip: 'jump', at: 0.5, secs: 1.4, warn: 'irm_quake', go: (W, f, m, t, P) => MOVES.quakeWave(P, m, null, K(m, 0.45), { reach: 26, speed: 10 }) },
    },
    // At sixty in a hundred, the Iron Standard set up at the hall's far end: while it stands he mends a little every second
    // and twice, twenty seconds apart, calls two men in from the hall's doors. At a quarter, his last stand: the harder deck, his blows the heavier.
    step(W, f, [m], dt) {
      if (!m) return;
      const life = m.hp / m.maxHp;
      if (!f.standard && life < 0.6) {   // (asked for once; f.standard is the add itself once it's up)
        const [x, z] = at(W, STANDARD_AT);
        f.standard = { asked: true };
        W.spawnAdds('irm_standard', ['ib_standard'], [x, z], 1, (k) => { k.hp = k.maxHp = 9000; k.opts.damage = 0; k.opts.speed = 0; k.opts.name = 'THE IRON STANDARD'; k.standard = true; k.aggro = true; k.opts.leash = 400; k.opts.sight = 80; f.standard = k; }, ['Oxblood']);
        W.warn(WARN.irm_standard, 5);
      }
      const st = f.standard?.asked ? null : f.standard;
      if (st && !st.dead && st.hp > 0) {
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.0015 * dt);
        if ((f.calls || 0) < 2 && (f.call = (f.call || 0) + dt) > 20) {
          f.call = 0; W.warn(WARN.irm_called, 4);
          const r = roomOf(f.boss.room), [rx, , rz] = roomSpot(r.id);
          W.spawnAdds(`irm_call_${(f.calls = (f.calls || 0) + 1)}`, KNIGHTS, [rx, rz + r.hz - 4], 2, (k) => { k.hp = k.maxHp = 2200; k.opts.damage = 44; k.opts.name = 'BARRACKS KNIGHT'; k.aggro = true; k.opts.leash = 200; k.opts.sight = 60; }, ['Oxblood']);
        }
      } else if (st && !f.fallen) { f.fallen = true; W.warn(WARN.irm_fallen, 4); }
      if (!f.last && life < 0.25) { f.last = true; m.opts.damage *= 1.25; W.warn(WARN.irm_last, 5); }
    },
    // While the standard stands: everyone but his tank, to it.
    order(W, f, b, [m]) {
      const st = f.standard;
      if (!m || !st || st.asked || st.dead || st.hp <= 0 || W.tank(m) === b) return null;
      // (Not while he's turned on you: getting out of his reach comes first.)
      if (m.fixOn === b && W.sim.time < m.fixT) return null;
      return { to: [st.x, st.z] };
    },
  },
};
