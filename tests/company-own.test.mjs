// Your party out of a fight (HeroWorld.heel in src/sim/hero.js), run with no page: on the road they face the way they go and
// some run on ahead; standing, each does something of their own, and turning your head moves nobody.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stage } from './hero-stage.mjs';

const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };

// A party of four hired, no foes about, the player at the middle of a bare land.
function party() {
  const s = stage('lancer', 20, 0, ['rogue', 'archer', 'bard']);
  const p = s.sim.player;
  Object.assign(p, { x: 0, z: 0, yaw: 0, vx: 0, vz: 0 });
  s.heroes.forEach((h, i) => { h.x = h.lastX = -3 + i * 2; h.z = h.lastZ = -3; assert.ok(s.w.hire(i, { level: 20, stay: true, name: `H${i}` }), `${h.person.cls} is hired`); h.hold = 0; });
  // (The player walks: dir is the way, v the pace; a step of the sim's at a time.)
  const walk = (secs, yaw, v, each) => s.step(secs, () => {
    p.vx = Math.sin(yaw) * v; p.vz = Math.cos(yaw) * v; p.x += p.vx / 120; p.z += p.vz / 120;
    each?.();
  });
  const stand = (secs, each) => { p.vx = p.vz = 0; s.step(secs, each); };
  return { ...s, p, walk, stand };
}

test('on the road your party keeps up, faces the way it walks, and some of them run on ahead of you', () => {
  const { heroes, p, walk } = party();
  const ahead = new Set();
  let off = 0, n = 0, most = 0, worst = 0;
  // (East, the way nobody's looking: the player's look stays north the whole way.)
  const yaw = Math.PI / 2;
  walk(90, yaw, 4.2, () => {
    for (const h of heroes) {
      const along = (h.x - p.x) * Math.sin(yaw) + (h.z - p.z) * Math.cos(yaw);
      if (along > 3) ahead.add(h.slot);
      worst = Math.max(worst, Math.hypot(h.x - p.x, h.z - p.z));
      if (h.speed > 2) { off += Math.abs(wrap(h.yaw - Math.atan2(h.vx, h.vz))); n++; }
    }
    most = Math.max(most, heroes.filter((h) => h.own?.lead).length);
  });
  assert.ok(ahead.size >= 1, 'in a minute and a half on the road, someone ran on ahead');
  assert.ok(most <= 2, `no more than two ahead at once (${most})`);
  assert.ok(worst < 25, `nobody was left behind or ran off (${worst.toFixed(1)} m)`);
  assert.ok(off / n < 0.35, `they face the way they walk (${(off / n).toFixed(2)} rad off, on average)`);
  assert.ok(heroes.every((h) => Math.abs(wrap(h.yaw - p.yaw)) > 0.8), 'none is turned the way the player looks');
});

test('standing, each of your party does something of their own, and they do not all face one way', () => {
  const { heroes, p, walk, stand } = party();
  walk(6, 0, 4);
  const bits = new Set(), moved = new Set(), faced = heroes.map(() => new Set());
  let same = 0, ticks = 0, gestures = 0, sat = 0;
  const at = heroes.map((h) => [h.x, h.z]);
  stand(150, () => {
    ticks++;
    heroes.forEach((h, i) => {
      if (h.own?.bit) bits.add(h.own.bit.kind);
      if (Math.hypot(h.x - at[i][0], h.z - at[i][1]) > 2) moved.add(i);
      faced[i].add(Math.round(wrap(h.yaw) / 0.8));
      if (h.gesture) gestures++;
      if (h.sitting) sat++;
      assert.ok(Math.hypot(h.x - p.x, h.z - p.z) < 16, `${h.person.cls} stays about (${Math.hypot(h.x - p.x, h.z - p.z).toFixed(1)} m)`);
    });
    if (heroes.every((h) => Math.abs(wrap(h.yaw - heroes[0].yaw)) < 0.3)) same++;
  });
  assert.ok(bits.size >= 5, `several kinds of thing were done: ${[...bits].join(', ')}`);
  assert.ok(moved.size >= 2, `some of them walked about (${moved.size})`);
  assert.ok(gestures > 0, 'someone made a gesture');
  assert.ok(faced.every((f) => f.size >= 3), `each faced several ways (${faced.map((f) => f.size)})`);
  assert.ok(same / ticks < 0.1, `they were not all turned one way (${(100 * same / ticks).toFixed(0)}% of the time)`);
});

test('turning your head while you stand moves nobody; setting off gets the one sitting to their feet', () => {
  const { heroes, p, walk, stand } = party();
  walk(4, 0, 4);
  stand(3);
  // (Whatever they're at is stopped, so only the turning could move them.)
  for (const h of heroes) { h.own.bit = null; h.own.wait = 1e9; }
  stand(2);
  const at = heroes.map((h) => [h.x, h.z]);
  stand(6, () => { p.yaw += 0.02; });
  heroes.forEach((h, i) => assert.ok(Math.hypot(h.x - at[i][0], h.z - at[i][1]) < 0.3, `${h.person.cls} stood where they were`));
  const h = heroes[1];
  h.own.bit = { kind: 'sit' }; h.own.t = 60; h.sitting = true;
  walk(4, 0, 4);
  assert.ok(!h.sitting && !h.own.bit, 'up again');
  assert.ok(Math.hypot(h.x - p.x, h.z - p.z) < 9, 'and along with you');
});
