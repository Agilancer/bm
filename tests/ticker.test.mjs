// The emergency ticker (src/ui/ticker.js): which of the delves' calls run along it, and how each is cut in two, what's
// happening and then what to do. (Its look and crawl are seen in the game: a shot recipe is in the PR that brought it.)
//   node --test tests/ticker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { WARN, WARNINGS, WARN_CALM } from '../src/core/dungeon.js';
import { callParts } from '../src/ui/ticker.js';

test('a call is cut where it turns from what is happening to what to do, in capitals', () => {
  assert.deepEqual(callParts('A wall of bolts! Find the gap.'), ['A WALL OF BOLTS', 'FIND THE GAP']);
  assert.deepEqual(callParts('Venomaw draws breath! Only the tank in front of her!'), ['VENOMAW DRAWS BREATH', 'ONLY THE TANK IN FRONT OF HER']);
  assert.deepEqual(callParts('Grubnash is enraged!'), ['GRUBNASH IS ENRAGED', '']);
  // (No "!": at the first colon, else the first full stop; an ellipsis isn't a full stop.)
  assert.deepEqual(callParts('The hand closes: you are flung across to the other.'), ['THE HAND CLOSES', 'YOU ARE FLUNG ACROSS TO THE OTHER']);
  assert.deepEqual(callParts('The lights come up.'), ['THE LIGHTS COME UP', '']);
  assert.equal(callParts('The music slows... and picks up again! Move.')[0], 'THE MUSIC SLOWS... AND PICKS UP AGAIN');
});

test('the calm words stay on the screen: the openings, the sealed doors, the two Warrens fights that explain themselves', () => {
  assert.ok(WARN_CALM.has(3) && WARN_CALM.has(7), 'the twins\' shared pain and Venomaw\'s opening');
  for (const [k, i] of Object.entries(WARN)) assert.equal(WARN_CALM.has(i), /_(open|shut)$|^ed_(under|sealed)$/.test(k), k);
  assert.ok(!WARN_CALM.has(8) && !WARN_CALM.has(14), 'breath and the tank down are shouted');
});

test('every shouted call has words to run along the bar, none too long to read', () => {
  for (const [i, text] of WARNINGS.entries()) {
    if (WARN_CALM.has(i)) continue;
    const [head, rest] = callParts(text);
    assert.ok(head.length > 0, `call ${i} has nothing to show`);
    assert.ok(head.length + rest.length < 160, `call ${i} is too long for the ticker: ${text}`);
  }
});
