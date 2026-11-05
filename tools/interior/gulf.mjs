// Can you cross it? Out of the Founders' Hall to the near shelf, along the bridge to the gap, a walking step into it, down to the bottom,
// along to the scaffold, up it, along the gangway and back to the shelf, with the same collision and floors the player gets.
// And the dead: that they can reach the shelf and the first half of the bridge, and can't step off or cross the gap.  node tools/interior/gulf.mjs
import { readFileSync } from 'node:fs';
import { World } from '../../src/sim/world.js';
import { inPit, floorAt } from '../../src/core/interior.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../../assets/game/${p}`, import.meta.url)));
const inter = json('interior/interior.json'), village = json('village.json');
const w = new World(village, inter);
const gulf = inter.homes[inter.homes.findIndex((h) => h.y < -30)];
const deck = gulf.floors.filter((f) => f.axis === 'z' && Math.abs(f.x1 - f.x0 - 2.1) < 0.01).sort((a, b) => b.z1 - a.z1);
const flat = gulf.floors.filter((f) => f.axis === 'z' && f.y === f.y2 && f.x1 - f.x0 > 3);
const X = (deck[0].x0 + deck[0].x1) / 2;
const shelf = flat.reduce((a, b) => (a.z1 > b.z1 ? a : b)), bottom = gulf.floors.find((f) => f.axis === 'x' && f.y === f.y2 && f.x1 - f.x0 > 30);
const stair = gulf.floors.find((f) => f.axis === 'x' && f.y !== f.y2), gangway = gulf.floors.find((f) => f.axis === 'z' && f.y !== f.y2 && f.x1 - f.x0 > 1.7 && f.x1 - f.x0 < 2);

let fails = 0;
const say = (name, ok, b) => { if (!ok) fails++; console.log(`  ${name}: ${ok ? 'ok' : 'FAIL'} at (${b.x.toFixed(2)}, ${b.y.toFixed(2)}, ${b.z.toFixed(2)})`); };

// As the player moves: at a speed, with their gravity and their floors.
const G = 14;
const walk = (b, tx, tz, v = 4.1, T = 30) => {
  const pos = [b.x, 0, b.z];
  for (let t = 0; t < T; t += 1 / 120) {
    const dx = tx - pos[0], dz = tz - pos[2], L = Math.hypot(dx, dz);
    if (L < 0.2) { b.x = pos[0]; b.z = pos[2]; return true; }
    pos[0] += dx / L * v / 120; pos[2] += dz / L * v / 120;
    w.resolve(pos, 0.36, b.y + 0.2);
    b.x = pos[0]; b.z = pos[2];
    settle(b);
  }
  return false;
};
const settle = (b) => {
  const g = w.heightFor(b.x, b.z, b.y);
  b.vy = (b.vy ?? 0) - G / 120;
  b.y += b.vy / 120;
  if (b.y <= g) { b.fell = -b.vy; b.y = g; b.vy = 0; }
};

const b = { x: X, y: shelf.y, z: (shelf.z0 + shelf.z1) / 2 };
console.log('the near shelf to the gap');
say('stepped on', walk(b, X, deck[0].z1 - 0.3), b);
const first = deck[deck.findIndex((f, i) => i && deck[i - 1].z0 - f.z1 > 1)];   // the first piece past the gap
const lip = deck[deck.indexOf(first) - 1];
const gapLen = lip.z0 - first.z1;
say(`gap of ${gapLen.toFixed(2)} m`, gapLen > 2.9 && gapLen < 3.3, b);
say('to a stride short of its lip', walk(b, X, lip.z0 + 0.8), b);
const lipY = b.y;

// A sprinting jump clears it. A walking one doesn't. Nothing beats the deck rising the far side, since it's still going down.
const jump = (v) => {
  const j = { x: b.x, y: b.y, z: b.z, vy: 5 };
  for (let t = 0; t < 3; t += 1 / 120) {
    j.z -= v / 120;
    const pos = [j.x, 0, j.z];
    w.resolve(pos, 0.36, j.y + 0.2);
    j.x = pos[0]; j.z = pos[2];
    j.vy -= G / 120;
    j.y += j.vy / 120;
    const g = w.heightFor(j.x, j.z, j.y);
    if (j.y <= g) { j.y = g; return j; }
  }
  return j;
};
const run = jump(6.6), amble = jump(4.1);
say('a sprinting jump lands on the far side', run.y > lipY - 2 && run.z < first.z1, run);
say('a walking jump falls in', amble.y < -40, amble);

console.log('across and the room beyond');
const across = { x: run.x, y: run.y, z: run.z };
say('up the far half', walk(across, X, deck[deck.length - 1].z0 - 0.2), across);
say('on the far shelf', Math.abs(across.y - shelf.y) < 0.8, across);
say('and through the door', walk(across, X, across.z - 8), across);

console.log('in, and back up');
const f = { x: X, y: lipY, z: (lip.z0 + first.z1) / 2 };   // (over the gap)
for (let t = 0; t < 5 && f.y > bottom.y + 0.001; t += 1 / 120) settle(f);
say('down to the floor', f.y < -44, f);
console.log(`  speed on landing ${f.fell.toFixed(1)} m/s`);
say('along it to the scaffold', walk(f, stair.x0 + 0.5, (stair.z0 + stair.z1) / 2, 4.1, 60), f);
say('up the scaffold', walk(f, stair.x1 - 0.3, (stair.z0 + stair.z1) / 2), f);
say('near the top', f.y > -26, f);
say('along the gangway', walk(f, (gangway.x0 + gangway.x1) / 2, f.z) && walk(f, (gangway.x0 + gangway.x1) / 2, gangway.z1 - 0.1), f);
say('back on the shelf', walk(f, (gangway.x0 + gangway.x1) / 2 + 0.6, shelf.z1 - 0.5) && Math.abs(f.y - shelf.y) < 0.2, f);

console.log('the dead');
for (const [name, x, z, pit] of [['the gap', X, (lip.z0 + first.z1) / 2, true], ['off the side of the bridge', X - 2, lip.z1, true], ['off the shelf', X + 2.8, shelf.z0 - 0.5, true], ['the bridge', X, (lip.z0 + lip.z1) / 2, false], ['the shelf', X, (shelf.z0 + shelf.z1) / 2, false]]) {
  const got = inPit(x, z);
  say(`${name} ${pit ? 'is' : 'is not'} a pit`, got === pit, { x, y: floorAt(x, z) ?? NaN, z });
}
console.log(fails, 'failed');
process.exit(fails ? 1 : 0);
