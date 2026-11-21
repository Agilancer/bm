// The gilded critters (src/core/critters.js, their bodies src/core/critter-models.js): twenty about you on open ground,
// the four kinds in VELSCOUR's shares, out of the way of rocks and trunks, never in town or a seal's dais, three of them ripe
// at a time, caught by a click on them (not through a trunk or a hill), and worth what they're worth.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRITTERS, CRITTER_COUNT, CritterField, NEAR, LEASH, IN_VIEW, RIPE_MAX, KILL_XP, UNRIPE, TIRED, TIRED_UNRIPE, PRISM_FIRST, openGround, obstaclesAround, meshHeight, lineClear } from '../src/core/critters.js';
import * as CM from '../src/core/critter-models.js';
import { townDist } from '../src/core/town.js';
import { SEALS } from '../src/core/sites.js';
import { CELL as TREE_CELL, TREE_FLOATS, treesInCells, trunkRadius } from '../src/core/forest.js';

// A seeded random, so a failure is the same failure next time.
const seeded = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const HERE = { x: 300, z: 300, fx: 0, fz: 1 };

test('twenty turn up about you, on open ground, within reach', () => {
  const f = new CritterField({ rng: seeded(7) });
  for (let i = 0; i < 40; i++) f.step(1 / 60, HERE);
  assert.equal(f.list.length, CRITTER_COUNT);
  for (const c of f.list) {
    const d = Math.hypot(c.x - HERE.x, c.z - HERE.z);
    assert.ok(d >= NEAR[0] - 1 && d <= NEAR[1] + 3, `${c.key} ${d.toFixed(1)} m off`);
    assert.ok(openGround(c.x, c.z));
  }
});

test('the first twenty come a few a frame, not all in one', () => {
  const f = new CritterField({ rng: seeded(3) });
  f.step(1 / 60, HERE);
  assert.ok(f.list.length > 0 && f.list.length <= 2, `${f.list.length} at once`);
});

test('the kinds come in VELSCOUR\'s shares (the Prismatic Wisp by its own clock, not the odds)', () => {
  const f = new CritterField({ rng: seeded(11) }), n = {}, N = 20000;
  for (let i = 0; i < N; i++) { const k = f.weighted(); n[k] = (n[k] || 0) + 1; }
  const total = Object.values(CRITTERS).reduce((s, K) => s + K.w, 0);
  for (const [k, K] of Object.entries(CRITTERS)) assert.ok(Math.abs((n[k] || 0) / N - K.w / total) < 0.02, `${k}: ${n[k] / N}`);
  assert.equal(n.prism, undefined);
});

test('a Prismatic Wisp is rare: none in the first two minutes, then one every three to five', () => {
  const f = new CritterField({ rng: seeded(29) }), dt = 1 / 10;
  let first = null, comes = 0, was = false;
  for (let t = 0; t < 20 * 60; t += dt) {
    f.step(dt, HERE);
    const is = f.list.some((c) => c.K.one && c.alive);
    if (is && !was) { comes++; if (first === null) first = t; }
    was = is;
  }
  assert.ok(first >= PRISM_FIRST[0], `the first at ${first}`);
  assert.ok(comes >= 3 && comes <= 7, `${comes} in twenty minutes`);
});

test('never in town, nor on a seal\'s dais', () => {
  assert.equal(openGround(0, 0), false);
  for (const s of SEALS.slice(0, 6)) assert.equal(openGround(s.x + 2, s.z + 1), false, s.key);
  const f = new CritterField({ rng: seeded(5) });
  const at = { x: 30, z: 120, fx: 1, fz: 0 };
  for (let i = 0; i < 600; i++) f.step(1 / 30, at);
  for (const c of f.list) assert.ok(townDist(c.x, c.z) >= 8, `${c.key} in town`);
});

test('they keep out of rocks and trunks, and stay within the leash as they wander', () => {
  const f = new CritterField({ rng: seeded(21) });
  for (let i = 0; i < 1800; i++) {
    f.step(1 / 30, HERE);
    if (i % 60) continue;
    for (const c of f.list) {
      if (c.K.fly === 'hover' || c.lift > 0.05 || c.sink > 0) continue;
      const o = obstaclesAround(c.x, c.z, 2);
      for (let k = 0; k < o.length; k += 3) assert.ok(Math.hypot(c.x - o[k], c.z - o[k + 1]) >= o[k + 2] - 0.05, `${c.key} inside an obstacle`);
      assert.ok(Math.hypot(c.x - HERE.x, c.z - HERE.z) <= LEASH + 1);
    }
  }
  assert.equal(f.list.length + f.owed.length, CRITTER_COUNT);
});

test('a crawler sits on the ground as it\'s drawn; a wisp skims low over it', () => {
  const f = new CritterField({ rng: seeded(9) });
  for (let i = 0; i < 120; i++) f.step(1 / 30, HERE);
  for (const c of f.list) {
    const g = meshHeight(c.x, c.z);
    if (c.arriving) continue;
    if (c.K.fly === 'hover') assert.ok(c.y - g > 0.05 && c.y - g < 0.6, `${c.key} ${(c.y - g).toFixed(2)} m up`);
    else if (!c.hop) assert.ok(Math.abs(c.y - g) < 1e-6);
  }
});

test('they turn gently, never spinning round on the spot in a frame', () => {
  const f = new CritterField({ rng: seeded(23) }), dt = 1 / 30;
  for (let i = 0; i < 40; i++) f.step(dt, HERE);
  const was = new Map();
  let most = 0;
  for (let i = 0; i < 1500; i++) {
    for (const c of f.list) was.set(c, c.a);
    f.step(dt, HERE);
    for (const c of f.list) {
      if (!was.has(c) || !c.alive || c.arriving) continue;
      const d = Math.abs(Math.atan2(Math.sin(c.a - was.get(c)), Math.cos(c.a - was.get(c)))) / dt;
      most = Math.max(most, d);
    }
  }
  assert.ok(most <= 4.01, `turned ${most.toFixed(2)} rad/s`);
});

test('shy: one near you turns away', () => {
  const f = new CritterField({ rng: seeded(13) });
  for (let i = 0; i < 40; i++) f.step(1 / 60, HERE);
  // (One with open ground to get away to: not one you've pinned against a trunk.)
  const c = f.list.find((q) => q.K.fly !== 'hop' && [0.5, 1, 1.5, 2].every((d) => !q.blocked(q.x + d, q.z)));
  const you = { x: c.x - 1.5, z: c.z, fx: 1, fz: 0 };
  const d0 = Math.hypot(c.x - you.x, c.z - you.z);
  for (let i = 0; i < 90; i++) f.step(1 / 30, you);
  if (f.list.includes(c)) assert.ok(Math.hypot(c.x - you.x, c.z - you.z) > d0, 'it came nearer');
});

test('one coming where you\'re looking comes no nearer than IN_VIEW, and comes in (down, or up out of the ground)', () => {
  const f = new CritterField({ rng: seeded(29) }), came = [];
  f.onSpawn = (c) => came.push([c, Math.hypot(c.x - HERE.x, c.z - HERE.z), Math.atan2(c.z - HERE.z, c.x - HERE.x), c.arrive]);
  for (let i = 0; i < 40; i++) f.step(1 / 30, HERE);
  for (let round = 0; round < 6; round++) {
    for (const c of f.list.slice(0, 6)) f.take(c, 1);
    for (let i = 0; i < 600; i++) f.step(1 / 30, HERE);
  }
  assert.ok(came.length >= 20, `${came.length} came`);
  const look = Math.atan2(HERE.fz, HERE.fx);
  for (const [c, d, a] of came) {
    const off = Math.abs(Math.atan2(Math.sin(a - look), Math.cos(a - look)));
    if (off < 0.95) assert.ok(d >= IN_VIEW - 0.01, `${c.key} came ${d.toFixed(1)} m off, in view`);
  }
  assert.ok(came.every((q) => q[3] === 0), 'each came in (none already there)');
});

test('three are ripe at a time, and a Prismatic Wisp is ripe from its coming, the one of it', () => {
  const f = new CritterField({ rng: seeded(31) });
  let most = 0, ripeSeen = 0, prisms = 0;
  for (let i = 0; i < 3600; i++) {
    f.step(1 / 30, HERE);
    const ripe = f.list.filter((c) => c.ripe && c.alive && !c.K.one).length;
    most = Math.max(most, ripe); ripeSeen = Math.max(ripeSeen, ripe);
    const p = f.list.filter((c) => c.K.one && c.state !== 'gone');
    assert.ok(p.length <= 1, `${p.length} prismatic wisps`);
    for (const c of p) assert.ok(c.ripe);
    prisms = Math.max(prisms, p.length);
    // (One that's ripe lasts a quarter of a minute or so, not its whole stay.)
    for (const c of f.list) if (c.ripe && c.alive) assert.ok(c.life - c.ripeAt <= 22, `${c.key} ripe for ${(c.life - c.ripeAt).toFixed(1)} s`);
  }
  assert.ok(most <= RIPE_MAX, `${most} ripe at once`);
  assert.ok(ripeSeen >= 2, 'they ripen');
});

test('a click picks the one under it; a caught one goes, and another comes for it', () => {
  const f = new CritterField({ rng: seeded(17) });
  for (let i = 0; i < 40; i++) f.step(1 / 60, HERE);
  // (A screen looking straight down: a metre is 20 pixels.)
  const toScreen = (x, y, z) => [(x - HERE.x) * 20 + 640, (z - HERE.z) * 20 + 360, 20];
  const c = f.list[3], [sx, sy] = toScreen(c.x, c.y, c.z);
  assert.equal(f.pick(toScreen, sx + 3, sy - 2, 24), c);
  assert.equal(f.pick(toScreen, sx + 400, sy + 400, 24) === c, false);
  // (With the crosshair, its body alone: not a body's width off it.)
  assert.equal(f.pick(toScreen, sx + c.K.size * 20 * 1.6, sy, 0, null, 1) === c, false);
  // (Not one there's something in the way of.)
  assert.equal(f.pick(toScreen, sx, sy, 24, () => false), null);
  const got = f.take(c, 1);
  assert.ok(got.xp > 0 || got.gold > 0);
  assert.equal(f.pick(toScreen, sx, sy, 24) === c, false, 'a caught one can\'t be caught again');
  for (let i = 0; i < 60; i++) f.step(1 / 30, HERE);
  assert.equal(f.list.includes(c), false);
  assert.equal(f.list.length + f.owed.length, CRITTER_COUNT);
});

test('worth: a ripe one, a share of a kill out here (more out in the countries); one not ripe, a little; tired, half', () => {
  const at = (key, ripe) => ({ K: CRITTERS[key], ripe });
  for (const key of ['wisp', 'moth', 'prism']) {
    const ripe = CritterField.pay(at(key, true), 1, () => 0.5).xp, far = CritterField.pay(at(key, true), 20, () => 0.5).xp;
    assert.equal(ripe, Math.round(KILL_XP(1) * CRITTERS[key].pay.xp));
    assert.ok(far > ripe * 3, `${key} ${ripe} ${far}`);
    const not = CritterField.pay(at(key, false), 1, () => 0.5).xp;
    assert.ok(not >= 1 && not <= Math.ceil(ripe * UNRIPE), `${key} not ripe ${not}`);
    assert.equal(CritterField.pay(at(key, true), 1, () => 0.5, TIRED.k).xp, Math.round(KILL_XP(1) * CRITTERS[key].pay.xp * TIRED.k));
  }
  // (A ripe wisp's worth less than a kill round Bellmourn, a Prismatic Wisp's some four: never a level at a stroke.)
  assert.ok(CritterField.pay(at('wisp', true), 1, () => 0.5).xp < 16);
  assert.ok(CritterField.pay(at('prism', true), 1, () => 0.5).xp < 90);
  const g1 = CritterField.pay(at('scarab', true), 1, () => 0.5).gold, g20 = CritterField.pay(at('scarab', true), 20, () => 0.5).gold;
  assert.ok(g1 >= 10 && g1 <= 15 && g20 > g1 * 2, `${g1} ${g20}`);
  assert.ok(CRITTERS.prism.pay.xp > CRITTERS.moth.pay.xp && CRITTERS.moth.pay.xp > CRITTERS.wisp.pay.xp);
  // Caught ripe one after another past TIRED.n in TIRED.over seconds: half.
  const f = new CritterField({ rng: seeded(37) });
  for (let i = 0; i < 40; i++) f.step(1 / 60, HERE);
  let tired = null;
  for (let n = 0; n <= TIRED.n; n++) { const c = f.list.find((q) => q.alive); c.ripe = true; tired = f.take(c, 1); }
  assert.equal(tired.tired, true);
  // And past TIRED_UNRIPE.n not ripe in TIRED_UNRIPE.over seconds: nothing.
  const g = new CritterField({ rng: seeded(41) });
  for (let i = 0; i < 40; i++) g.step(1 / 60, HERE);
  let last = null;
  for (let n = 0; n <= TIRED_UNRIPE.n; n++) { const c = g.list.find((q) => q.alive && !q.ripe); last = g.take(c, 1); if (n < TIRED_UNRIPE.n) assert.ok(last.xp > 0 || last.gold > 0); }
  assert.equal(last.none, true);
  assert.ok(!last.gold && !last.xp);
});

test('a teleport starts them all anew about where you are', () => {
  const f = new CritterField({ rng: seeded(19) });
  for (let i = 0; i < 40; i++) f.step(1 / 60, HERE);
  const far = { x: 900, z: -400, fx: 0, fz: 1 };
  for (let i = 0; i < 40; i++) f.step(1 / 60, far);
  assert.equal(f.list.length, CRITTER_COUNT);
  for (const c of f.list) assert.ok(Math.hypot(c.x - far.x, c.z - far.z) < NEAR[1] + 3);
});

test('seen: not through a rise of the ground, nor a pine\'s trunk', () => {
  const flat = () => 0, hill = (x) => (x > 5 && x < 6 ? 3 : 0);
  assert.equal(lineClear(0, 1.6, 0, 10, 0.1, 0, flat), true);
  assert.equal(lineClear(0, 1.6, 0, 10, 0.1, 0, hill), false);
  // A real pine near HERE, and a line from one side of its trunk to the other at a man's height.
  const t = treesInCells(Math.floor(250 / TREE_CELL), Math.ceil(350 / TREE_CELL), Math.floor(250 / TREE_CELL), Math.ceil(350 / TREE_CELL));
  assert.ok(t.length >= TREE_FLOATS, 'a pine about');
  const x = t[0], z = t[1], r = trunkRadius(t[2], t[3]), y = meshHeight(x, z) + 1.2;
  assert.equal(lineClear(x - 6, y, z, x + 6, y, z, () => -50), false);
  assert.equal(lineClear(x - 6, y, z + r + 2, x + 6, y, z + r + 2, () => -50), true);
});

test('their bodies: every part built, finite, and the size it should be', () => {
  const parts = {
    scarab: CM.scarabBody(), leg: CM.scarabLeg(0), moth: CM.mothBody(), fore: CM.wing('fore'), hind: CM.wing('hind'), mleg: CM.mothLeg(1),
    core: CM.wispCore(), ring: CM.wispRing(true, 2), arrow: CM.arrow(), gold: CM.arrow('amberFace', 'amberDark'),
  };
  for (const [k, g] of Object.entries(parts)) {
    assert.ok(g.count > 0 && g.idx.length % 3 === 0, k);
    assert.ok(g.p.every(Number.isFinite) && g.n.every(Number.isFinite) && g.uv.every(Number.isFinite), `${k} not finite`);
    assert.ok(g.idx.every((i) => i < g.count), `${k} index out of range`);
  }
  const span = (g, a) => g.bounds().hi[a] - g.bounds().lo[a];
  assert.ok(span(parts.scarab, 0) > 0.3 && span(parts.scarab, 0) < 0.5, 'scarab about 40 cm long');
  assert.ok(parts.fore.bounds().hi[2] > 0.2 && parts.fore.bounds().hi[2] < 0.3, 'a forewing about 25 cm');
  assert.ok(span(parts.ring, 0) < 0.5, 'a wisp under half a metre across');
  // A crawler's feet are on the ground: the scarab's leg reaches from its hip down to y 0, and out wide (a beetle's stance).
  const hip = CM.scarabHip(0, 1), low = parts.leg.bounds().lo[1] + hip[1];
  assert.ok(Math.abs(low) < 0.01, `foot at ${low}`);
  assert.ok(parts.leg.bounds().hi[2] + hip[2] > 0.2, 'feet well out from its middle');
  // The tail: nine beads, smaller as they go, down and back from the heart.
  const beads = Array.from({ length: 9 }, (_, i) => CM.tailBead(i, 0));
  for (let i = 1; i < 9; i++) assert.ok(beads[i][3] < beads[i - 1][3] && beads[i][1] < beads[i - 1][1]);
  assert.ok(beads[8][1] > -0.45 && beads[8][1] < -0.3, `tail ${beads[8][1]}`);
});

test('the palette: every material in it, what glows marked in its metal map, and the shell\'s gold from rim to crown', () => {
  const { col, mr } = CM.paletteBytes();
  assert.ok(CM.MAT_KEYS.length <= CM.SHELL_ROW * CM.PALETTE_W);
  const i = CM.MAT_KEYS.indexOf('gem');
  assert.equal(mr[i * 4], 255);
  assert.deepEqual([...col.slice(i * 4, i * 4 + 3)], [0x40, 0xff, 0xe8]);
  // (The polished gold glows a little of itself, so it's gold in the shade, but it's metal, not a lamp.)
  assert.ok(mr[CM.MAT_KEYS.indexOf('gold') * 4] < 26);
  const rim = CM.SHELL_ROW * CM.PALETTE_W, crown = rim + CM.PALETTE_W - 1, lum = (k) => col[k * 4] + col[k * 4 + 1] + col[k * 4 + 2];
  assert.ok(lum(crown) > lum(rim) * 2, 'the crown pale, the rim dark');
});
