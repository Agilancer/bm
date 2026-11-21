// Run with node --test tests/*.test.mjs. No browser or GPU required.
// What's dropped is let go once it's gone unseen (src/gfx/renderer.js trimSwords), and a drop's held models are made only
// once a hand wants them (sword's hand, armSword).
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../src/gfx/renderer.js';

const gpuThing = (log, name) => ({ name, destroy() { log.push(name); } });
// A sword as buildSword leaves one: what lies on the ground, two glows of it, and (held) its hand and raised arm's.
function made(log, id, { hand = false, up = false } = {}) {
  const t = (k) => gpuThing(log, `${id}.${k}`);
  const maps = [t('alb'), t('nrm'), t('mr')], VB = t('VB'), IB = t('IB');
  const lying = { VB, IB, glowUbo: t('glow'), maps, tints: new Map() };
  lying.tints.set('#fff', { ...lying, glowUbo: t('tint1') });
  lying.tints.set('#f00', { ...lying, glowUbo: t('tint2') });
  const skinned = (k) => ({ srcBuf: t(`${k}.src`), sideVB: t(`${k}.side`), IB: t(`${k}.IB`), outBuf: t(`${k}.out`), palette: t(`${k}.pal`), params: t(`${k}.par`) });
  const s = { ready: true, lying, seen: 0 };
  if (hand) { s.hand = skinned('hand'); s.hand.lodIB = s.hand.IB; s.ubo = t('ubo'); }
  if (up) s.up = { hand: skinned('up'), ubo: s.ubo };
  return s;
}
function fixture(entries) {
  const r = Object.assign(Object.create(Renderer.prototype), { swords: new Map(entries), board: {} });
  return r;
}

test('swords unseen for 30 s are let go but for the eight most recently seen, and nothing worn or still being made', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const log = [], now = 100000, entries = [];
    // Twelve idle ones, the newest seen 31 s ago and each next one a second earlier.
    for (let i = 0; i < 12; i++) { const s = made(log, `old${i}`); s.seen = now - 31000 - i * 1000; entries.push([`old${i}`, s]); }
    const odd = { fresh: 1000, worn: 99000, keep: 99000, busy: 99000, failed: 99000, skull_arm: 99000 };
    for (const [id, ago] of Object.entries(odd)) { const s = made(log, id); s.seen = now - ago; entries.push([id, s]); }
    entries.find(([id]) => id === 'busy')[1].busy = true;
    entries.find(([id]) => id === 'failed')[1].failed = now - 1000;   // (failed a second ago: not tried again yet)
    const r = fixture(entries);
    r.swordKeeps = new Set(['keep']);
    r.offHand = 'worn';
    r.trimSwords(now);
    const left = [...r.swords.keys()].sort();
    assert.deepEqual(left, ['busy', 'failed', 'fresh', 'keep', 'old0', 'old1', 'old2', 'old3', 'old4', 'old5', 'old6', 'old7', 'skull_arm', 'worn'].sort());
    // (Destroyed a moment later, not now: a frame on its way may still draw them.)
    assert.equal(log.length, 0);
    mock.timers.tick(2000);
    assert.deepEqual([...new Set(log.map((n) => n.split('.')[0]))].sort(), ['old10', 'old11', 'old8', 'old9']);
    // (And not again for five seconds.)
    r.swords.get('old7').seen = 1;
    r.swords.set('extra', Object.assign(made(log, 'extra'), { seen: 0 }));
    r.trimSwords(now + 1000);
    assert.ok(r.swords.has('extra'));
    r.trimSwords(now + 6000);
    // (Nine idle now: the one seen longest ago goes.)
    assert.ok(!r.swords.has('extra') && r.swords.has('old7'));
  } finally { mock.timers.reset(); }
});

test("one whose file didn't come is tried again, worn or not, waiting twice as long each time it fails again", async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const r = fixture([]);
    r.offHand = 'kite';
    let tries = 0, works = false;
    r.buildSword = async () => { tries++; if (!works) throw new Error('offline'); };
    const quiet = mock.method(console, 'error', () => {});
    const at = (ms) => { mock.method(performance, 'now', () => ms); };
    const settle = async () => { for (let i = 0; i < 3; i++) await Promise.resolve(); };
    // Fails at 0: not tried again before 5 s, then it is (the next frame's ask makes it anew).
    at(0); r.sword('kite', false, true); await settle();
    assert.equal(tries, 1);
    assert.ok(r.swords.get('kite').failed !== undefined);
    r.trimSwords(4000); r.sword('kite', false, true); await settle();
    assert.equal(tries, 1);
    r.trimSwords(10000); at(10000); r.sword('kite', false, true); await settle();
    assert.equal(tries, 2);
    // Failed twice now: 10 s this time, not 5.
    r.trimSwords(16000); r.sword('kite', false, true); await settle();
    assert.equal(tries, 2);
    r.trimSwords(21000); at(21000); r.sword('kite', false, true); await settle();
    assert.equal(tries, 3);
    // Three times now: 20 s. And once it comes, it's kept as any other.
    works = true;
    r.trimSwords(32000); r.sword('kite', false, true); await settle();
    assert.equal(tries, 3);
    r.trimSwords(41000); at(41000); r.sword('kite', false, true); await settle();
    assert.equal(tries, 4);
    assert.equal(r.swords.get('kite').failed, undefined);
    assert.equal(r.swordFails.has('kite'), false);
    quiet.mock.restore();
  } finally { mock.timers.reset(); mock.restoreAll(); }
});

test('a let-go sword gives up everything it was given, each once', () => {
  const log = [], r = fixture([]);
  r.freeSword(made(log, 'kite', { hand: true, up: true }));
  const want = ['alb', 'nrm', 'mr', 'VB', 'IB', 'glow', 'tint1', 'tint2', 'ubo',
    ...['hand', 'up'].flatMap((k) => ['src', 'side', 'IB', 'out', 'pal', 'par'].map((b) => `${k}.${b}`))].map((k) => `kite.${k}`);
  assert.deepEqual([...log].sort(), want.sort());
  // (One that only ever lay on the ground: just that.)
  const log2 = [];
  r.freeSword(made(log2, 'axe'));
  assert.equal(log2.length, 8);
});

test("a drop's held models wait for a hand, and are made once when one wants them", async () => {
  const calls = [];
  const r = fixture([]);
  r.buildSword = async (id, s) => { calls.push(`build ${id}`); s.lying = { maps: [] }; if (!s.wantHand) { s.later = true; return; } await r.armSword(id, s); };
  r.armSword = async (id, s) => { s.later = false; calls.push(`arm ${id}`); s.hand = {}; s.ready = true; };
  const settle = () => new Promise((ok) => setTimeout(ok, 0));
  // On the ground: only that.
  const s = r.sword('axe');
  await settle();
  assert.deepEqual(calls, ['build axe']);
  assert.equal(s.ready, false);
  assert.equal(s.later, true);
  // Picked up and held: its hand's now, once.
  r.sword('axe', false, true); r.sword('axe', false, true);
  await settle();
  assert.deepEqual(calls, ['build axe', 'arm axe']);
  assert.equal(s.ready, true);
  // Held from the first: all at once.
  r.sword('staff', false, true);
  await settle();
  assert.deepEqual(calls.slice(2), ['build staff', 'arm staff']);
  // Wanted in a hand while its ground model is still on its way: made after it.
  let open;
  r.buildSword = (id, s2) => new Promise((ok) => { open = () => { s2.lying = { maps: [] }; s2.later = true; calls.push(`build ${id}`); ok(); }; });
  const late = r.sword('shield');
  r.sword('shield', false, true);
  assert.equal(late.busy, true);
  open();
  await settle(); await settle();
  assert.deepEqual(calls.slice(4), ['build shield', 'arm shield']);
  assert.equal(late.busy, false);
  // keep sticks, by id.
  r.sword('board', true);
  assert.ok(r.swordKeeps.has('board'));
});

test("the monsters' weapons are let go past sixteen, but never one a monster holds", async () => {
  const { TripoSlots } = await import('../src/gfx/tripo-slots.js');
  const t = Object.assign(Object.create(TripoSlots.prototype), { ids: ['ghoul', 'troll'], arms: ['club', 'axe', 'buckler'], props: new Map() });
  const gone = [];
  const prop = (k) => Promise.resolve({ VB: { destroy: () => gone.push(`${k} VB`) }, IB: { destroy: () => {} }, ubo: { destroy: () => {} }, tex: { destroy: () => gone.push(`${k} tex`) } });
  // A troll with an axe in its right hand and a buckler in its left; a ghoul with nothing.
  t.want = ['2:0:2:3', '1:4:0:0', 0];
  for (const k of ['troll:axe:R', 'troll:buckler:L', ...Array.from({ length: 18 }, (_, i) => `ghoul:w${i}:R`)]) t.props.set(k, prop(k));
  assert.ok(t.propInUse('troll:axe:R') && t.propInUse('troll:buckler:L'));
  assert.ok(!t.propInUse('troll:buckler:R') && !t.propInUse('ghoul:club:R'));
  t.trim(t.props, 16, (k) => t.propInUse(k), (v) => { for (const o of [v.VB, v.IB, v.ubo, v.tex]) o.destroy(); });
  await new Promise((ok) => setTimeout(ok, 0));
  assert.equal(t.props.size, 16);
  assert.ok(t.props.has('troll:axe:R') && t.props.has('troll:buckler:L'));
  assert.deepEqual(gone, ['ghoul:w0:R VB', 'ghoul:w0:R tex', 'ghoul:w1:R VB', 'ghoul:w1:R tex', 'ghoul:w2:R VB', 'ghoul:w2:R tex', 'ghoul:w3:R VB', 'ghoul:w3:R tex']);
});

test('a monster made for an A that went to B and back to A is let go, not put in over the latest', async () => {
  const { TripoSlots } = await import('../src/gfx/tripo-slots.js');
  const { C, C_HERO, C_SIZE, CHARS_START, SNAP_FLOATS } = await import('../src/core/layout.js');
  const { ARMS } = await import('../src/core/tripo-monsters.js');
  const r = { chars: [{}], props: [{}, {}], gashVersions: [0] };
  const t = Object.assign(Object.create(TripoSlots.prototype), { r, ids: ['ghoul', 'troll'], first: 0, count: 1, propBase: 0, want: [0], gens: [0] });
  const freed = [], waits = [];
  t.free = (ch) => { if (ch?.made) freed.push(ch.made); };
  t.instance = (id) => { const n = waits.length + 1; return new Promise((ok) => waits.push(() => ok([{ made: `${id} #${n}` }, null, null]))); };
  const snap = new Float32Array(SNAP_FLOATS);
  const co = CHARS_START, wear = (model) => { snap[co + C.ACTIVE] = 1; snap[co + C.MODEL] = model; snap[co + C_HERO + ARMS.RIGHT] = 0; t.sync(snap); };
  assert.equal(co, CHARS_START + 0 * C_SIZE);
  wear(1); wear(2); wear(1);            // ghoul, troll, ghoul again: three made, in that order
  assert.equal(waits.length, 3);
  waits[0](); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(freed, ['ghoul #1']);   // (the first ghoul's: its weapon may be gone; the slot wants a ghoul, but not that one)
  assert.equal(r.chars[0].made, undefined);
  waits[2](); waits[1](); await Promise.resolve(); await Promise.resolve();
  assert.equal(r.chars[0].made, 'ghoul #3');
  assert.deepEqual(freed, ['ghoul #1', 'troll #2']);
});

test('a sword asked for this frame is never let go by the same frame, however long it was unseen before', () => {
  const log = [], r = fixture([]);
  const now = 1e6;
  for (let i = 0; i < 12; i++) r.swords.set(`old${i}`, Object.assign(made(log, `old${i}`), { seen: 0 }));
  const realNow = performance.now;
  try {
    performance.now = () => now;
    // (The frame gathers what's drawn, asking for each, before it trims: renderer.js frame.)
    for (let i = 0; i < 12; i++) r.sword(`old${i}`);
    r.trimSwords(now);
    assert.equal(r.swords.size, 12);
  } finally { performance.now = realNow; }
});
