// Where City State Phobos's street crowd (src/folk/people.js CROWD) sleep: each of them a house in their own district and a
// bed in it, from the house's own plan (src/core/phobos-rooms.js roomPlan: the beds it lays out are the household's, and
// these people are of those households). The owner, 2026-11-20: "Make sure everyone has beds too in phobos, and places to
// sleep, which are in beds in their houses for the most part."
//
// Who goes where, from their kind: a baker over a baker's, a chandler over a chandler's, a tanner by the Tanners' Steps in a
// tanner's house; the sellswords and delvers lodge at an alehouse; the beggars and the urchins in the poorest houses; a
// servant on the pallet in a great house; the rest in a home of their district. Some live together (HOUSEHOLDS): the
// Gutted Lamb's people over the Gutted Lamb, Suds and Yoke in the one bed. A house takes one household of the crowd (an
// alehouse, its lodgers too). Worked out once, from the houses' households alone (holdOf, no planning); the bed itself
// only when it's wanted (bedOf: one house's plan, a millisecond or two).
import { footing, phobosHouses, upstairs } from '../core/phobos-build.js';
import { holdOf, roomPlan } from '../core/phobos-rooms.js';
import { CROWD } from './people.js';

// Who live together: the first of each list's household is theirs, the rest share it, in this order of its beds (a couple
// the double bed).
const HOUSEHOLDS = [
  { ids: ['ph_tap', 'ph_bess', 'ph_wenna', 'ph_ladle'], kinds: ['tavern', 'lodge'] },
  { ids: ['ph_suds', 'ph_yoke'] },
  // (The lady her own side of the great bed, her son the next bed; her maid and her man the servants' places.)
  { ids: ['ph_lady', 'ph_lordling', 'ph_maid', 'ph_livery'], wealth: 2, slots: [0, 2, 's', 'last'] },
  { ids: ['ph_cob', 'ph_nan'] },
  { ids: ['ph_brann', 'ph_merrin'] },
  { ids: ['ph_keys', 'ph_digger'] },
];
// What house a kind looks for: its trade (the shop's sign, or the trade worked at home: phobos-rooms.js SIGN_TRADE,
// HOME_TRADES), else just how well off.
const TRADE = {
  baker: ['baker', 'pies'], chandler: ['chandler'], fishwife: ['fish'], tanner: ['tanner'], dyer: ['dyer'], smelter: ['smith', 'charcoal'],
  apothecary: ['apothecary'], bonecarver: ['bone'], gravedigger: ['coffins', 'bone'], ferryman: ['ferry', 'nets'], dockhand: ['nets', 'cooper'],
  joiner: ['joiner', 'cooper'], weaver: ['weaver'], moneylender: ['pawn'], ragwoman: ['rags'], scribe: ['scholar'], merchant: ['goods'],
  butcher: ['poultry'], ratcatcher: ['hooks', 'rags'], plaguedoctor: ['apothecary', 'scholar'], acolyte: ['scholar', 'coffins'],
};
const LODGE = new Set(['sellsword', 'delver', 'hunter', 'busker', 'veteran']);
const POOR = new Set(['beggar', 'urchin', 'drunk', 'sweep', 'cutpurse', 'mourner']);
const RICH = new Set(['moneylender', 'merchant']);
const roomy = (hold) => hold.beds.reduce((a, b) => a + (b.kind === 'cot' ? 0 : b.n), 0);

let HOMES = null;
// person id → { house (index into phobosHouses()), slot (which place in its beds, counted along the plan's beds), lodger }.
export function phobosHomes() {
  if (HOMES) return HOMES;
  HOMES = new Map();
  const H = phobosHouses(), byArea = new Map(), holds = H.map((h) => (h.roof && h.mark?.kind !== 'shell' && h.hx > 2.05 && h.hz > 2.05 ? holdOf(h, true) : null));
  H.forEach((h, i) => { if (!holds[i]) return; if (!byArea.has(h.dk)) byArea.set(h.dk, []); byArea.get(h.dk).push(i); });
  const taken = new Set(), lodged = new Map(), people = new Map(CROWD.map((p) => [p.id, p]));
  // (The first house of the district, of those not yet taken, that fits: walked from a place picked from the person's own name.)
  const pick = (p, ok) => {
    const list = byArea.get(p.area) || byArea.get('other') || [];
    if (!list.length) return -1;
    let s = 2166136261; for (let k = 0; k < p.id.length; k++) s = Math.imul(s ^ p.id.charCodeAt(k), 16777619);
    const at = (s >>> 0) % list.length;
    for (let k = 0; k < list.length; k++) { const i = list[(at + k) % list.length]; if (!taken.has(i) && ok(holds[i], H[i])) return i; }
    return -1;
  };
  const home = (p, need = 1, extra = null) => {
    const room = (hd) => roomy(hd) >= need && hd.kind !== 'tavern' && hd.kind !== 'lodge' && hd.kind !== 'guildhall';
    const tr = TRADE[p.kind], tests = [];
    if (extra) tests.push((hd) => extra(hd) && roomy(hd) >= need);
    if (tr) tests.push((hd) => room(hd) && tr.includes(hd.trade));
    if (POOR.has(p.kind)) tests.push((hd) => room(hd) && hd.wealth === 0);
    if (RICH.has(p.kind) || p.kind === 'servant') tests.push((hd) => room(hd) && hd.wealth === 2);
    tests.push((hd) => room(hd));
    for (const t of tests) { const i = pick(p, t); if (i >= 0) return i; }
    return -1;
  };
  // The households first, then the lodgers, then everyone else.
  for (const g of HOUSEHOLDS) {
    const ps = g.ids.map((id) => people.get(id)).filter(Boolean);
    if (!ps.length) continue;
    const i = home(ps[0], ps.length, g.kinds ? (hd) => g.kinds.includes(hd.kind) : g.wealth ? (hd) => hd.wealth >= g.wealth : null);
    if (i < 0) continue;
    taken.add(i);
    ps.forEach((p, k) => { const sl = g.slots?.[k] ?? k; HOMES.set(p.id, { house: i, slot: typeof sl === 'number' ? sl : 0, lodger: false, servant: sl === 's', last: sl === 'last' }); });
  }
  for (const p of CROWD) {
    if (HOMES.has(p.id) || !LODGE.has(p.kind)) continue;
    // (An alehouse of the district with a bed over it left: the beds after the household's are the lodgers'.)
    const list = byArea.get(p.area) || [];
    for (const i of list) {
      const hd = holds[i];
      if (hd.kind !== 'tavern' && hd.kind !== 'lodge') continue;
      const n = lodged.get(i) || 0, room = hd.lodgers || 0;
      if (n >= room) continue;
      lodged.set(i, n + 1);
      HOMES.set(p.id, { house: i, slot: n, lodger: true });
      break;
    }
  }
  for (const p of CROWD) {
    if (HOMES.has(p.id)) continue;
    const i = home(p, 1);
    if (i < 0) continue;
    taken.add(i);
    // (A servant on the servant's pallet; anyone else the household's first bed, the one at its head.)
    HOMES.set(p.id, { house: i, slot: p.kind === 'servant' ? -1 : 0, lodger: false, servant: p.kind === 'servant' });
  }
  return HOMES;
}

// Where person id lies in bed: { x, y, z, yaw (the way their feet point), level, house, kind, cx, cz (the bed's middle), hu (half
// its width), side (-1, 0, 1: which half of it's theirs), edge (where they sit up on it) }
// in the world, or null (no house for them: shouldn't happen). y is what they lie at: the bed's top, sunk 0.1 into it.
// Worked out for everyone of a house at once, so no two are given the one place.
const BEDS = new Map();
// (The blanket over a sleeper the colour of the bed's own cover: src/gfx/blankets.js WOOLS, walnut, madder, undyed brown,
// mulberry, moss.)
const BLANKET = { p2_wool_blanket: 5, cloth_red: 0, 'umber:cloth_oat': 1, 'dark:cloth_red': 4, 'moss:cloth_oat': 2 };
export function bedOf(id) {
  if (BEDS.has(id)) return BEDS.get(id);
  const homes = phobosHomes(), hm = homes.get(id);
  if (!hm) { BEDS.set(id, null); return null; }
  const h = phobosHouses()[hm.house], F = footing(h), up = upstairs(h, F), plan = roomPlan(h, F, up);
  // (Every place in a bed in order, the cots left to the children: two to a double bed.)
  const places = [];
  for (const b of plan.beds) if (b.kind !== 'cot') for (let k = 0; k < b.n; k++) places.push({ b, side: b.n > 1 ? (k ? 1 : -1) : 0 });
  const mine = plan.hold.beds.reduce((a, b) => a + (b.kind === 'cot' ? 0 : b.n), 0), used = new Set();
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw), f = h.front, W = (lx, lw) => [h.x + lx * c + f * lw * s, h.z - lx * s + f * lw * c];
  for (const [pid, m] of homes) {
    if (m.house !== hm.house) continue;
    let k = m.lodger ? mine + m.slot : m.servant ? places.findIndex((q) => q.b.servant) : m.last ? places.length - 1 : m.slot;
    if (k < 0 || k >= places.length) k = m.lodger ? places.length - 1 - m.slot : places.length - 1;
    // (Taken already: the next place along that isn't, round to the first; a house of the crowd with more of them than places,
    // which holdOf's roomy keeps from happening, would put the last two in the one.)
    for (let t = 0; t < places.length && used.has(k); t++) k = (k + 1) % places.length;
    used.add(k);
    const pl = places[Math.max(0, k)];
    if (!pl) { BEDS.set(pid, null); continue; }
    const { b, side } = pl, [cx, cz] = W(b.x, b.w), [ex, ez] = W(b.x + b.F[0], b.w + b.F[1]);
    const yaw = Math.atan2(ex - cx, ez - cz), rx = -Math.cos(yaw), rz = Math.sin(yaw), lat = side * 0.25, e = side >= 0 ? 1 : -1;
    BEDS.set(pid, { x: cx + rx * lat, z: cz + rz * lat, y: b.top - 0.1, yaw, level: b.level, house: hm.house, kind: b.kind, cx, cz, hu: b.hu, side, blanket: BLANKET[b.wool] ?? 5,
      // (Its edge, sat on when they're woken: their side of it, by its middle, facing out.)
      edge: { x: cx + rx * (b.hu - 0.2) * e, z: cz + rz * (b.hu - 0.2) * e, y: b.top, yaw: Math.atan2(rx * e, rz * e), level: b.level } });
  }
  return BEDS.get(id) ?? null;
}
