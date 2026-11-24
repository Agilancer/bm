// Auto combat style (Settings, Auto-play): Cinematic as it was, and Full Auto, which builds and casts for damage
// (src/ui/autobrain.js FULL_BUILD, fullBar, fullShoot). And the channels' mana: dear enough not to be held all fight.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPELLS } from '../src/sim/spells.js';
import { UTILITY, blocked, pointsAt, spent, startFree, startRanks } from '../src/sim/skills.js';
import { H, INPUT } from '../src/core/layout.js';
import { SkillBook } from '../src/items/skillbook.js';
import { MAIN, SpellBar, startLoadout } from '../src/ui/spellbar.js';
import { SPEC } from '../src/ui/settings-spec.js';
import { Brain, FOCI, FOCUS, FULL_BUILD, buildGaps, castWorth } from '../src/ui/autobrain.js';
import { NODES } from '../src/sim/skills.js';

const SP = Object.fromEntries(SPELLS.map((s, i) => [s.key, i]));

test('the setting: Cinematic or Full Auto, under Auto-play, Cinematic as the game comes', () => {
  const s = SPEC.find((q) => q.k === 'autoStyle');
  assert.ok(s, 'autoStyle is in the spec');
  assert.equal(s.tab, 'auto');
  assert.deepEqual(s.opts.map(([v]) => v), ['cinematic', 'full']);
  assert.match(readFileSync(new URL('../src/title.js', import.meta.url), 'utf8'), /autoStyle: 'cinematic'/);
});

test('a channel is dear: a full pool of 100 holds none of them three seconds', () => {
  const ch = SPELLS.filter((s) => s.channel);
  assert.deepEqual(ch.map((s) => s.key).sort(), ['chain', 'disintegrate', 'drain', 'firebeam', 'frostray', 'missiles']);
  for (const s of ch) {
    assert.ok(s.mana >= 12, `${s.key} costs ${s.mana} to begin`);
    assert.ok((100 - s.mana) / s.drain < 3, `${s.key} held ${((100 - s.mana) / s.drain).toFixed(1)} s on a full pool`);
  }
});

test('the Full Auto build is bought whole by level 50, with a Thunderbolt by 11 for the black knight', () => {
  assert.deepEqual(buildGaps(FULL_BUILD, 'full'), []);
  assert.deepEqual(buildGaps(), [], 'and Cinematic\'s still is');
  const ranks = startRanks(), free = startFree(), at = {};
  let k = 0;
  for (let lvl = 1; lvl <= 50; lvl++) {
    while (k < FULL_BUILD.length && pointsAt(lvl) - spent(ranks, free) > 0 && !blocked(ranks, free, lvl, FULL_BUILD[k])) {
      ranks[FULL_BUILD[k]] = (ranks[FULL_BUILD[k]] || 0) + 1; at[FULL_BUILD[k]] ??= lvl; k++;
    }
  }
  assert.ok(at.thunder <= 11, `Thunderbolt at ${at.thunder}`);
  assert.ok(at.mend <= 3, `Mend at ${at.mend}`);
  assert.ok(at.meteor <= 20, `Meteor at ${at.meteor}`);
});

function spellbar(keys) {
  const b = Object.create(SpellBar.prototype);
  b.loadout = startLoadout(); b.now = 0; b.i = 0; b.armed = -1; b.main = MAIN;
  b.draw = b.drawMenu = () => {}; b.tip = () => {}; b.input = { enabled: true, menu: false, fire() {} }; b.shared = { input: [] };
  b.skills = new SkillBook(() => 50);
  b.skills.onChange = () => b.refresh();
  for (const k of keys) b.skills.ranks[k] = 1;
  b.knownNow = null;
  return b;
}
function brain(sb, settings = { autoStyle: 'full' }) {
  const br = Object.create(Brain.prototype);
  br.o = { spellbar: sb, log: null, settings, shared: { input: new Float32Array(64) }, game: { currentSnap: () => null } };
  br.snap = null; br.t = 100; br.used = {}; br.castCool = 0; br.staffCool = 0; br.staffAt = -9; br.tapAt = -9; br.owed = null;
  br.frozenT = -99; br.pulledT = -99;
  return br;
}

test('Full Auto\'s bar: only what pays, in its order, the rest left empty; Mend on 0', () => {
  const know = ['firebolt', 'frost', 'stone', 'missiles', 'spark', 'wisp', 'mend', 'chain', 'thunderclap', 'meteor', 'firebeam', 'comet', 'firenova', 'bomb', 'thunder', 'fork', 'renew'];
  const sb = spellbar(know), br = brain(sb);
  br.bar();
  const keys = sb.loadout.map((i) => SPELLS[i]?.key ?? '-');
  assert.deepEqual(keys.slice(0, MAIN), ['firebolt', 'meteor', 'thunder', 'bomb', 'firenova', 'comet', 'thunderclap', 'spark', 'stone']);
  assert.deepEqual(keys.slice(MAIN), ['mend', 'renew', '-']);
  assert.ok(!keys.includes('firebeam') && !keys.includes('chain') && !keys.includes('missiles'), `no channels: ${keys}`);
  // (Cinematic, the same book: its turning lists, channels and all, as it was.)
  const cb = spellbar(know); brain(cb, {}).bar();
  assert.ok(cb.loadout.some((i) => SPELLS[i]?.channel), 'Cinematic still puts a channel on');
});

const sb0 = () => { const b = spellbar(['firebolt']); b.skills.ranks.firebolt = 5; b.skills.ranks['firebolt:searing'] = 3; b.skills.changed(); return b; };

// One look at a fight: which it casts (and how long it holds it), or the staff.
function look(o) {
  const sb = spellbar(['firebolt', 'frost', 'stone', 'missiles', 'spark', 'wisp', 'mend', 'meteor', 'bomb', 'thunder', 'firenova', 'comet', 'thunderclap', 'fork']);
  // (Firebolt as its build has it by level 15: rank 5, Searing Core 3.)
  sb.skills.ranks.firebolt = 5; sb.skills.ranks['firebolt:searing'] = 3; sb.skills.changed();
  const br = brain(sb);
  br.bar();
  const snap = new Float32Array(H.COOL + SPELLS.length + 8);
  for (const [k, t] of Object.entries(o.cool || {})) snap[H.COOL + SP[k]] = t;
  const m = { mana: o.mana ?? 100, maxMana: 100, hpf: o.hpf ?? 1, y: 0 };
  const c = { T: { y: 0, maxHp: 400 }, d: 7, dn: 7, n: 1, close: 0, near: 1, around: 1, aimed: true, hpf: m.hpf, left: 300, fast: false, still: true, big: true, inLine: 1, coming: false, frozen: false, shield: false, fresh: false, opener: false, finisher: false, ...o.c };
  let cast = null;
  br.cast = (i, hold) => { cast = { key: SPELLS[i].key, hold }; return true; };
  br.fullShoot(snap, m, c);
  return cast || (br.o.shared.input[INPUT.ATTACK] > 0 ? { key: 'staff' } : { key: 'nothing' });
}

test('Full Auto\'s rotation: cooldowns as they come, Firebolt gathered full between, the staff when it must', () => {
  assert.equal(look({ c: { n: 4, around: 4, near: 4 } }).key, 'meteor', 'a crowd, all ready: Meteor');
  assert.equal(look({}).key, 'meteor', 'something big and still, all ready: the heaviest first');
  assert.equal(look({ cool: { meteor: 8 } }).key, 'thunder', 'then the Thunderbolt');
  assert.equal(look({ cool: { meteor: 6, thunder: 3, bomb: 2 } }).key, 'firebolt', 'its cooldowns turning: Firebolt between');
  const fb = look({ mana: 55, cool: { meteor: 6, thunder: 3, bomb: 3.5, firenova: 9 } });
  assert.equal(fb.key, 'firebolt', 'half a pool: the filler that buys most with its mana');
  assert.ok(fb.hold >= sb0().def(SP.firebolt).gather, `gathered full: held ${fb.hold}`);
  // (Meteor ready in a second and 42 mana for it: a Firebolt now would leave too little, so the staff.)
  assert.equal(look({ mana: 48, cool: { meteor: 1, thunder: 4, bomb: 3, firenova: 9 } }).key, 'staff');
  assert.equal(look({ hpf: 0.3, c: { hpf: 0.3, dn: 8 } }).key, 'mend', 'low: Mend first');
  assert.equal(look({ c: { left: 4, big: false, T: { y: 0, maxHp: 40 } } }).key, 'staff', 'nearly dead: not worth a spell');
});

test('castWorth: more caught, more worth; past the mark\'s life, nothing more', () => {
  const met = SPELLS[SP.meteor], c = { n: 1, close: 0, around: 1, inLine: 1, left: 1000, frozen: false };
  assert.ok(castWorth(met, { ...c, around: 3, n: 3 }) > castWorth(met, c) * 2);
  assert.ok(castWorth(met, { ...c, left: 10 }) < 20);
  assert.equal(castWorth(SPELLS[SP.thunderclap], c), 0, 'a ring with nothing close');
  assert.ok(UTILITY.has(SP.mend));
});

// When each of a build's spells is first bought, played from level 1 to 50.
function firsts(build) {
  const ranks = startRanks(), free = startFree(), at = {};
  let k = 0;
  for (let lvl = 1; lvl <= 50; lvl++) {
    while (k < build.length && pointsAt(lvl) - spent(ranks, free) > 0 && !blocked(ranks, free, lvl, build[k])) { ranks[build[k]] = (ranks[build[k]] || 0) + 1; at[build[k]] ??= lvl; k++; }
  }
  return at;
}

test('Build focus: Best and the five schools, each bought whole, each with Mend and a blow from above by 11', () => {
  assert.deepEqual(FOCI.map(([k]) => k), ['best', 'fire', 'ice', 'earth', 'arcane', 'lightning']);
  assert.deepEqual(Object.keys(FOCUS), FOCI.slice(1).map(([k]) => k));
  const s = SPEC.find((q) => q.k === 'autoFocus');
  assert.deepEqual(s.opts.map(([v]) => v), FOCI.map(([k]) => k));
  assert.match(readFileSync(new URL('../src/title.js', import.meta.url), 'utf8'), /autoFocus: 'best'/);
  const ABOVE = ['meteor', 'blizzard', 'wallfire', 'zero', 'quake', 'monolith', 'rune', 'starfall', 'thunder', 'tempest'];
  for (const [k, b] of Object.entries(FOCUS)) {
    assert.deepEqual(buildGaps(b, k), [], k);
    const at = firsts(b);
    assert.ok(at.mend <= 3, `${k}: Mend at ${at.mend}`);
    assert.ok(ABOVE.some((q) => at[q] <= 11), `${k}: nothing from above by 11 (${ABOVE.filter((q) => at[q]).map((q) => `${q}@${at[q]}`)})`);
    // (Most of its points in its own school.)
    const tree = NODES[b[0]].tree, mine = b.filter((q) => NODES[q].tree === tree).length;
    assert.ok(mine / b.length > 0.6, `${k}: ${mine} of ${b.length} in its school`);
  }
});

test('a focus fills Full Auto\'s bar from its own school, the highest tier first', () => {
  const sb = spellbar(['frost', 'stone', 'firebolt', 'spark', 'missiles', 'wisp', 'mend', 'coldcone', 'rime', 'nova', 'prism', 'blizzard', 'shatter', 'orb', 'zero', 'meteor']);
  const br = brain(sb, { autoStyle: 'full', autoFocus: 'ice' });
  br.bar();
  const keys = sb.loadout.slice(0, MAIN).map((i) => SPELLS[i]?.key ?? '-');
  assert.equal(keys[0], 'zero', keys.join(' '));
  for (const k of ['blizzard', 'shatter', 'orb', 'nova', 'prism']) assert.ok(keys.includes(k), `${k} on: ${keys}`);
  assert.equal(brain(sb, { autoFocus: 'nonsense' }).focus, 'best');
});

test('a focus chosen with points spent elsewhere: unlearned once, for the fee, if it has the gold', () => {
  const sb = spellbar(['firebolt']);
  const S = sb.skills;
  for (const id of ['comet', 'firebolt', 'firebolt', 'firenova']) S.ranks[id] = (S.ranks[id] || 0) + 1;
  S.changed();
  const spentBefore = S.spent;
  assert.ok(spentBefore >= 3);
  let paid = 0, purse = 0;
  const br = brain(sb, { autoStyle: 'cinematic', autoFocus: 'ice' });
  br.o.pack = { pay: (c) => (purse >= c ? ((paid += c), (purse -= c), true) : false) };
  br.say = () => {}; br.o.note = () => {};
  br.restyle();
  assert.equal(S.spent, spentBefore, 'no gold: nothing unlearned');
  br.t += 61; purse = 1e6;
  br.restyle();
  assert.equal(S.spent, 0, 'unlearned');
  assert.ok(paid > 0);
  const again = paid; br.restyle(); assert.equal(paid, again, 'once a choosing');
  // (Cinematic on Best: whatever's there is kept, as it always was.)
  const cb = spellbar(['firebolt']); cb.skills.ranks.comet = 3; cb.skills.changed();
  const c2 = brain(cb, { autoStyle: 'cinematic', autoFocus: 'best' }); c2.o.pack = { pay: () => true }; c2.restyle();
  assert.ok(cb.skills.spent > 0);
});
