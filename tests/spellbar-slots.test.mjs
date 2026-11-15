// The spell bar's twelve slots (src/ui/spellbar.js): 1 to 9 for any spell, and 0, - and + for the Utility school's alone;
// what a new game, an old save, a spell learned and a swap do with them; and auto-play's bar (src/ui/autobrain.js bar()),
// which fills the nine and the three and keeps to the same rule.
//   node --test tests/spellbar-slots.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SPELLS } from '../src/sim/spells.js';
import { STARTERS, UTILITY } from '../src/sim/skills.js';
import { SkillBook } from '../src/items/skillbook.js';
import { KEYS, MAIN, SLOTS, SpellBar, fits, startLoadout } from '../src/ui/spellbar.js';
import { Brain } from '../src/ui/autobrain.js';

const SP = Object.fromEntries(SPELLS.map((s, i) => [s.key, i]));

// The bar's rules, without its page: what it draws is let be.
function bar(keys = []) {
  const b = Object.create(SpellBar.prototype);
  b.loadout = startLoadout(); b.now = 0; b.i = 0; b.armed = -1; b.main = MAIN;
  b.draw = b.drawMenu = () => {}; b.tip = () => {}; b.input = { enabled: true, menu: false, fire() {} }; b.shared = { input: [] };
  b.skills = new SkillBook(() => 50);
  b.skills.onChange = () => b.refresh();
  for (const k of keys) b.skills.ranks[k] = 1;
  b.knownNow = null;
  return b;
}

test('twelve slots: nine for any spell, and 0, - and + for the Utility school alone', () => {
  assert.equal(SLOTS, 12); assert.equal(MAIN, 9);
  assert.deepEqual(KEYS, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '−', '+']);
  assert.deepEqual([...UTILITY].map((i) => SPELLS[i].key).sort(), ['aegis', 'drain', 'empower', 'fleet', 'mend', 'renew', 'sanctuary', 'stillness', 'turn', 'wisp']);
  for (let k = 0; k < SLOTS; k++) for (let i = 0; i < SPELLS.length; i++) assert.equal(fits(k, i), k < MAIN || UTILITY.has(i), `${SPELLS[i].key} in slot ${KEYS[k]}`);
  for (let k = 0; k < SLOTS; k++) assert.ok(fits(k, -1), 'any slot can be emptied');
});

test('a new game: the five first spells on 1 to 5 and Wisp Light on 0', () => {
  const l = startLoadout();
  assert.equal(l.length, SLOTS);
  assert.deepEqual(l.slice(0, 5).map((i) => SPELLS[i].key), ['firebolt', 'frost', 'stone', 'missiles', 'spark']);
  assert.equal(SPELLS[l[MAIN]].key, 'wisp');
  assert.equal(l.filter((i) => i >= 0).length, STARTERS.length);
});

test('0, - and + turn away anything but a Utility spell, and a swap never puts one there', () => {
  const b = bar(['mend', 'renew', 'meteor']);
  assert.equal(b.assign(10, SP.firebolt), false, 'Firebolt on -');
  assert.equal(b.loadout[10], -1);
  assert.match(b.refused.text, /isn't a Utility spell/);
  assert.equal(b.assign(10, SP.mend), true);
  assert.equal(b.loadout[10], SP.mend);
  // Mend from - to 1, where Firebolt is: Firebolt can't go to -, so - is left empty.
  assert.equal(b.assign(0, SP.mend), true);
  assert.equal(b.loadout[0], SP.mend);
  assert.equal(b.loadout[10], -1);
  assert.ok(!b.loadout.includes(SP.firebolt));
  // A Utility spell from 1 to +, where Renew is: Renew goes to 1. Two Utility spells change places as any two do.
  b.assign(11, SP.renew);
  b.assign(11, SP.mend);
  assert.equal(b.loadout[11], SP.mend); assert.equal(b.loadout[0], SP.renew);
  // Out of reach: nothing happens.
  assert.equal(b.assign(12, SP.mend), false); assert.equal(b.assign(-1, SP.mend), false);
});

test('a spell learned goes in the first empty slot it may: a Utility spell in 0, - or + first', () => {
  const b = bar();
  b.loadout = Array(SLOTS).fill(-1); b.loadout[0] = SP.firebolt; b.loadout[MAIN] = SP.wisp;
  assert.equal(b.freeSlot(SP.mend), MAIN + 1);
  assert.equal(b.freeSlot(SP.meteor), 1);
  b.loadout.fill(SP.firebolt, 0, MAIN);
  assert.equal(b.freeSlot(SP.meteor), -1, 'the nine full: not into the three');
  b.loadout.fill(SP.mend, MAIN, SLOTS);
  assert.equal(b.freeSlot(SP.renew), -1);
  b.loadout[3] = -1;
  assert.equal(b.freeSlot(SP.renew), 3, 'the three full: into the nine');
});

test('a bar saved with six slots loads into 1 to 6; anything but a Utility spell is taken off 0, - and +', () => {
  const b = bar();
  const six = [SP.firebolt, SP.frost, SP.stone, SP.missiles, SP.spark, SP.wisp];
  b.load({ loadout: six, now: 5, skills: null });
  assert.equal(b.loadout.length, SLOTS);
  assert.deepEqual(b.loadout.slice(0, 6), six);
  assert.deepEqual(b.loadout.slice(6), [-1, -1, -1, -1, -1, -1]);
  assert.equal(b.now, 5);
  const twelve = [...six, -1, -1, -1, SP.firebolt, SP.wisp, -1];
  b.load({ loadout: twelve, now: 10, skills: null });
  assert.equal(b.loadout[9], -1, 'Firebolt is no Utility spell');
  assert.equal(b.loadout[10], SP.wisp);
  assert.equal(b.now, 10);
  b.load({ loadout: [...twelve, 1], skills: null });
  assert.deepEqual(b.loadout, startLoadout(), 'too long: a new bar');
  b.load(null);
  assert.deepEqual(b.loadout, startLoadout());
});

// Auto-play's head, with nothing round it but the bar it sets.
function brain(sb) {
  const br = Object.create(Brain.prototype);
  br.o = { spellbar: sb, log: null }; br.snap = null; br.t = 0;
  return br;
}

test('auto-play fills all twelve from what it knows: the nine for a fight, the three with Utility spells', () => {
  const know = ['firebolt', 'frost', 'stone', 'missiles', 'spark', 'wisp', 'mend', 'chain', 'thunderclap', 'turn', 'renew', 'aegis', 'meteor', 'firebeam',
    'wallfire', 'comet', 'firenova', 'bomb', 'thunder', 'coldcone', 'nova', 'fork', 'sanctuary', 'empower'];
  const sb = bar(know), br = brain(sb);
  br.bar();
  const l = sb.loadout, keys = l.map((i) => SPELLS[i]?.key ?? '-');
  for (let k = 0; k < MAIN; k++) assert.ok(l[k] >= 0 && !UTILITY.has(l[k]), `slot ${KEYS[k]}: ${keys[k]}`);
  for (let k = MAIN; k < SLOTS; k++) assert.ok(UTILITY.has(l[k]), `slot ${KEYS[k]}: ${keys[k]}`);
  assert.equal(new Set(l).size, SLOTS, `no spell twice: ${keys}`);
  for (const i of l) assert.ok(sb.known.has(i), `${SPELLS[i].key} is known`);
  assert.ok(keys.includes('firebolt') && keys.includes('meteor') && keys.includes('nova'), `what it leans on: ${keys}`);
  assert.equal(keys[MAIN], 'mend'); assert.equal(keys[MAIN + 1], 'turn');
  assert.ok(!keys.includes('wisp'), 'Wisp Light is cast from the book');
  // Run again, nothing changes; four minutes on, the turning lists move on, and the rule still holds.
  const before = l.slice(); br.bar(); assert.deepEqual(sb.loadout, before);
  br.t = 241; br.bar();
  for (let k = MAIN; k < SLOTS; k++) assert.ok(UTILITY.has(sb.loadout[k]));
  assert.equal(new Set(sb.loadout).size, SLOTS);
});

test('auto-play with few spells: the three take what Utility it has, and nothing else', () => {
  const sb = bar(['firebolt', 'frost', 'stone', 'missiles', 'spark', 'wisp', 'mend']), br = brain(sb);
  br.bar();
  const l = sb.loadout;
  assert.equal(l[MAIN], SP.mend);
  for (let k = MAIN; k < SLOTS; k++) assert.ok(l[k] < 0 || UTILITY.has(l[k]), SPELLS[l[k]]?.key);
  for (const k of ['firebolt', 'frost', 'stone', 'missiles', 'spark']) assert.ok(l.slice(0, MAIN).includes(SP[k]), k);
});

test('auto-play casts from 0, - and + as from 1 to 9: by the slot\'s own press', () => {
  const sb = bar(['firebolt', 'mend', 'renew']), br = brain(sb);
  sb.loadout = Array(SLOTS).fill(-1); sb.loadout[0] = SP.firebolt; sb.loadout[MAIN + 1] = SP.renew;
  const pressed = [];
  sb.press = (k, by) => pressed.push([k, by]); sb.release = () => {};
  Object.assign(br, { auto: { cast: false }, slotHeld: false, used: {}, o: { ...br.o, game: { currentSnap: () => null }, input: { fire() {} } } });
  assert.ok(br.cast(SP.renew, 0));
  assert.deepEqual(pressed, [[MAIN + 1, 'auto']]);
});
