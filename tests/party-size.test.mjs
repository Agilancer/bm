// Party size, in the settings: how many of the Free Company you can hire (two to four), and how many a delve's portal asks for.
// The page keeps it (src/ui/party.js setSize) and tells the sim, whose portal checks it (src/sim/dungeon.js ready).
//   node --test tests/party-size.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PARTY, partyWord, setPartySize } from '../src/core/dungeon.js';
import { Warrens } from '../src/sim/dungeon.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('Party size is two to four, four unless set', () => {
  assert.equal(PARTY.size, 4);
  for (const [v, n] of [['2', 2], ['3', 3], [4, 4], [1, 2], [9, 4], ['', 4], ['nonsense', 4], [2.6, 3]]) assert.equal(setPartySize(v), n, `${v}`);
  assert.equal(partyWord(2), 'two');
  setPartySize(4);
});

test('the settings offer it, and the game applies it as it starts and when it changes', () => {
  const title = read('src/title.js'), main = read('src/main.js'), party = read('src/ui/party.js'), worker = read('src/sim/sim.worker.js');
  assert.match(title, /party: '4'/, 'no default for it');
  const sel = title.match(/<select data-k="party">(.*?)<\/select>/);
  assert.ok(sel, 'Settings has no Party size');
  assert.deepEqual([...sel[1].matchAll(/value="(\d)"/g)].map((m) => m[1]).sort(), ['2', '3', '4']);
  assert.match(main, /game\.party\.setSize\(settings\.party\)/, 'not applied as the game starts');
  assert.match(main, /k === 'party'\) \{\s*game\.party\?\.setSize\(v\)/, 'not applied when it changes');
  assert.match(party, /postMessage\(\{ type: 'partySize'/, 'the sim is never told');
  assert.match(worker, /m\.type === 'partySize'\) setPartySize\(m\.n\)/, "the sim doesn't take it");
  // (Nobody already in a saved party is left behind by it: they come back past it.)
  assert.match(party, /hire\(\{ slot: c\.slot, name: s\.name, level: s\.level, off: s\.off \?\? 0 \}, true, true\)/);
});

test("a delve's portal opens for as many as Party size, with a lancer and a paladin among them", () => {
  const hero = (role) => ({ hired: true, role });
  const at = (...roles) => {
    const w = Object.create(Warrens.prototype);
    w.sim = { heroes: [...roles.map(hero), { hired: false, role: 'dps' }] };
    return w.ready();
  };
  try {
    setPartySize(2);
    assert.ok(at('tank', 'heal').ok);
    assert.ok(!at('tank', 'dps').ok, 'no healer');
    assert.ok(!at('tank').ok, 'one is too few');
    setPartySize(3);
    assert.ok(!at('tank', 'heal').ok, 'two is too few for three');
    assert.ok(at('tank', 'heal', 'dps').ok);
    setPartySize(4);
    assert.ok(!at('tank', 'heal', 'dps').ok);
    assert.ok(at('tank', 'heal', 'dps', 'dps').ok);
  } finally { setPartySize(4); }
});
