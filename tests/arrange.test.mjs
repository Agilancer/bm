// Run with node --test tests/*.test.mjs. No browser required.
// Move Buttons (src/ui/arrange.js): every piece it moves is on the page, what's kept is made safe as it's read back, and the
// stylesheet it writes moves each piece by its own translate and scale. And the two things beside it: the stick shows nothing
// until a thumb is on it, and auto-play can put the interface away (Settings), keeping the map and the chat if asked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PIECES, SCALE_MAX, SCALE_MIN, TOUCH_PLACES, clean, cssFor } from '../src/ui/arrange.js';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('../index.html'), css = read('../src/ui/hud.css'), main = read('../src/main.js');
const src = fs.readdirSync(new URL('../src/ui/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => read(`../src/ui/${f}`)).join('\n') + main;

test('every piece Move Buttons moves is on the page, or made by the game', () => {
  const keys = new Set();
  for (const p of PIECES) {
    assert.ok(!keys.has(p.key), `two pieces are called ${p.key}`); keys.add(p.key);
    assert.ok(p.name && (p.touch || p.desk), p.key);
    for (const sel of [...(p.touch || []), ...(p.desk || [])]) {
      const id = /^#([A-Za-z]+)/.exec(sel)[1];
      assert.ok(html.includes(`id="${id}"`) || src.includes(`'${id}'`), `${p.key}: nothing makes #${id}`);
    }
  }
  // The spell slots are found by their number (src/ui/spellbar.js), and every button a thumb presses can be moved.
  assert.ok(read('../src/ui/spellbar.js').includes('s.dataset.k = k'));
  const moved = new Set(PIECES.flatMap((p) => p.touch || []));
  for (const m of html.matchAll(/class="tbtn[^"]*" id="([A-Za-z]+)"/g)) assert.ok(moved.has(`#${m[1]}`), `#${m[1]} can't be moved`);
  for (let k = 0; k < 6; k++) assert.ok(moved.has(`#spells .spell[data-k="${k}"]`), `spell ${k + 1}`);
});

test('what\'s kept is made safe as it\'s read back', () => {
  assert.deepEqual(clean(null), { v: 1, t: TOUCH_PLACES, touch: {}, desk: {} });
  assert.deepEqual(clean('junk'), { v: 1, t: TOUCH_PLACES, touch: {}, desk: {} });
  // A phone's layout from before the table last moved is let go; a desk's is kept.
  const old = clean({ v: 1, touch: { staff: { x: 5, y: 0 } }, desk: { map: { x: 5, y: 0 } } });
  assert.deepEqual(old.touch, {});
  assert.equal(old.desk.map.x, 5);
  const c = clean({
    t: TOUCH_PLACES,
    touch: { staff: { x: -300, y: 12.345, s: 9 }, nothing: { x: 1 }, spellbar: { x: 5 }, dodge: { x: 0, y: 0, s: 1 }, jump: { x: 'a', y: Infinity, s: 0.1 },
      frame: { x: 3, y: 4, s: 1.2, k: [[1, 2], 'x', [5, 6]] } },
    desk: { spellbar: { x: 1e9, y: -20 }, staff: { x: 5 } },
  });
  assert.deepEqual(c.touch.staff, { x: -300, y: 12.35, s: SCALE_MAX });
  assert.equal(c.touch.nothing, undefined, 'a piece there isn\'t');
  assert.equal(c.touch.spellbar, undefined, 'the spell bar is a desk\'s');
  assert.equal(c.desk.staff, undefined, 'the staff\'s button is a phone\'s');
  assert.equal(c.touch.dodge, undefined, 'left where it was: nothing to keep');
  assert.deepEqual(c.touch.jump, { x: 0, y: 0, s: SCALE_MIN });
  assert.deepEqual(c.touch.frame.k, [[1, 2], [0, 0]], 'one k for each element of the piece');
  assert.equal(c.desk.spellbar.x, 4000);
});

test('the stylesheet moves each piece by its own translate and scale, in units', () => {
  assert.equal(cssFor({}, 'touch'), '');
  const t = cssFor({ staff: { x: -200, y: 10, s: 1 }, frame: { x: 5, y: 0, s: 1.5, k: [[-20, 0], [40, 2]] } }, 'touch');
  assert.match(t, /#bAttack \{ translate: calc\(-200 \* var\(--u, 1px\)\) calc\(10 \* var\(--u, 1px\)\) !important; \}/);
  assert.match(t, /#bCast \{ translate: calc\(-200 /, 'the cave\'s cast stands where the staff does');
  // (grown about the piece's middle: each element shifted by (s - 1) times its own point from there)
  assert.match(t, /#levelBox \{ translate: calc\(-5 \* var\(--u, 1px\)\) calc\(0 \* var\(--u, 1px\)\) !important; scale: 1.5 !important; \}/);
  assert.match(t, /#vitals \{ translate: calc\(25 \* var\(--u, 1px\)\) calc\(1 \* var\(--u, 1px\)\)/);
  assert.equal(cssFor({ staff: { x: 5, y: 5, s: 1 } }, 'desk'), '', 'no staff\'s button on a desk');
  // Nothing else in the game uses these two properties, so a moved piece keeps its own transforms (a press, a centring).
  for (const f of [css, html]) assert.ok(!/[;{\s]translate:|[;{\s]scale:/.test(f.replace(/\/\*[\s\S]*?\*\//g, '')), 'the game\'s own sheets use translate or scale');
});

test('Move Buttons is on the pause screen, and the game puts the kept layout up as it starts', () => {
  assert.ok(html.includes('data-p="arrange"'));
  assert.ok(main.includes("a === 'arrange'") && main.includes('new Arrange('));
  assert.match(read('../src/ui/arrange.js'), /localStorage\.getItem\(LAYOUT_KEY\)/);
  // The stick's side follows where it's put.
  assert.ok(read('../src/input.js').includes('this.stickRight ?'));
});

test('the stick shows nothing until a thumb is on it', () => {
  const rule = /#stickHome \{[^}]*\}/.exec(css)[0];
  assert.match(rule, /opacity: 0;/);
  assert.ok(!/#stickHome \{[^}]*opacity: \.[1-9]/.test(css.split('Move Buttons')[0]), 'the stick\'s ring is drawn while it waits');
});

test('auto-play can put the interface away, keeping the map and the chat if asked', () => {
  const title = read('../src/title.js');
  for (const k of ['autohide', 'autohideMap', 'autohideChat']) {
    assert.ok(new RegExp(`${k}: '`).test(title), `${k} has no default`);
    assert.ok(title.includes(`data-k="${k}"`), `${k} isn't in Settings`);
  }
  assert.match(css, /body\.ui-bare :is\([^)]*#hud[^)]*#touch[^)]*\) \{ visibility: hidden !important; \}/);
  assert.match(css, /body\.ui-bare\.bare-map :is\(#mapMini, #mapRing, #bMap\) \{ visibility: visible !important; \}/);
  assert.match(css, /body\.ui-bare\.bare-chat :is\(#heroChat, #heroLayer\) \{ visibility: visible !important; \}/);
  const auto = read('../src/ui/autoplay.js');
  assert.ok(auto.includes("c.toggle('ui-bare', on)") && auto.includes('this.bareStep()'));
  for (const t of ['pointerdown', 'touchstart', 'keydown']) assert.ok(auto.includes(`'${t}'`), `a ${t} doesn't bring it back`);
  assert.ok(main.includes('foeNames: FOE_NAMES, settings,'), 'auto-play isn\'t handed the settings');
});
