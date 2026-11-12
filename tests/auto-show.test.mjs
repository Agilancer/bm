// Auto-play as something to watch: the director's camera (src/ui/autocam.js), the narrator, the banners and the recap
// (src/ui/autoshow.js), a line left up to be read, a long walk hurried, the temperament and the settings that turn each off.
//   node --test tests/auto-show.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SHOTS, pose, thirdLead, wanted } from '../src/ui/autocam.js';
import { recapRows, tally, told } from '../src/ui/autoshow.js';
import { readTime } from '../src/ui/autobrain.js';
import { CTRL } from '../src/core/layout.js';
import { THIRD } from '../src/core/third.js';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const me = { x: 10, y: 2, z: -5, yaw: 0.7, vx: Math.sin(0.7), vz: Math.cos(0.7), t: 2, s: 1, a0: 0.7 + Math.PI, ox: 12, oz: -3 };

test('no shot is taken in a fight, a talk comes before the rest, and the open sky is wanted for all but a talk', () => {
  const s = { fighting: false, talking: false, sky: true, riding: false, orbit: false, arrived: false, travelling: false, sinceShot: 99, turn: 0 };
  assert.equal(wanted(s), null);
  assert.equal(wanted({ ...s, fighting: true, talking: true, riding: true, orbit: true }), null, 'a shot in a fight takes the view off his aim');
  assert.equal(wanted({ ...s, talking: true, riding: true }), 'talk');
  assert.equal(wanted({ ...s, talking: true, sky: false }), 'talk', 'a talk indoors is still framed');
  for (const k of ['riding', 'orbit', 'arrived', 'travelling']) assert.equal(wanted({ ...s, [k]: true, sky: false }), null, `${k} under a roof`);
  assert.equal(wanted({ ...s, riding: true, orbit: true }), 'ride');
  assert.equal(wanted({ ...s, orbit: true, arrived: true }), 'orbit');
  assert.equal(wanted({ ...s, arrived: true }), 'arrive');
  assert.equal(wanted({ ...s, travelling: true, turn: 0 }), 'side');
  assert.equal(wanted({ ...s, travelling: true, turn: 1 }), 'front');
  assert.equal(wanted({ ...s, travelling: true, sinceShot: 2 }), null, 'a long walk is mostly seen from behind him');
});

test('every shot has him in the picture: the camera off him, looking his way, not under his feet', () => {
  for (const kind of Object.keys(SHOTS)) {
    for (const s of [1, -1]) {
      for (const t of [0, 1.5, 5]) {
        const { p, l } = pose(kind, { ...me, s, t });
        for (const v of [...p, ...l]) assert.ok(Number.isFinite(v), `${kind}: a bad number`);
        const d = Math.hypot(p[0] - me.x, p[2] - me.z);
        assert.ok(d > 1.2 && d < 16, `${kind}: the camera is ${d.toFixed(1)} m from him`);
        assert.ok(p[1] > me.y + 0.5, `${kind}: the camera is at his feet`);
        // The way it looks, against the way to him: he's in front of it, within a third of a turn of its middle.
        const fx = l[0] - p[0], fz = l[2] - p[2], hx = me.x - p[0], hz = me.z - p[2];
        const cos = (fx * hx + fz * hz) / (Math.hypot(fx, fz) * Math.hypot(hx, hz));
        assert.ok(cos > 0.5, `${kind}: he isn't in the picture (${cos.toFixed(2)})`);
      }
    }
  }
});

test('an orbit begins behind him, where the view already is, and goes round', () => {
  const a = pose('orbit', { ...me, t: 0 }).p, b = pose('orbit', { ...me, t: 5 }).p;
  // (Behind him: against the way he looks.)
  assert.ok((a[0] - me.x) * Math.sin(me.yaw) + (a[2] - me.z) * Math.cos(me.yaw) < -4);
  assert.ok(Math.hypot(a[0] - b[0], a[2] - b[2]) > 4, 'it hasn\'t moved');
});

test('in third person the look is turned so the camera\'s line, a step to his right, runs through the mark', () => {
  for (const d of [3, 8, 20, 40]) {
    for (const side of [1, -1, 0.4]) {
      const th = 0.3, y = th + thirdLead(side, d);
      // The camera: a step along his right (as GameView.updateCamera has it), back along the look; the mark, d off at th.
      const rx = -Math.cos(y), rz = Math.sin(y), fx = Math.sin(y), fz = Math.cos(y);
      const cx = rx * THIRD.side * side - fx * THIRD.dist, cz = rz * THIRD.side * side - fz * THIRD.dist;
      const tx = Math.sin(th) * d - cx, tz = Math.cos(th) * d - cz;
      const off = Math.abs(tx * fz - tz * fx);
      assert.ok(off < 0.02, `at ${d} m the X is ${off.toFixed(2)} m off the mark`);
    }
  }
  assert.ok(Math.abs(thirdLead(1, 0.1)) <= 0.5, 'right on top of him, the look isn\'t thrown round');
});

test('a line is left up as long as it takes to read: a moment for a word, never for ever', () => {
  assert.ok(readTime('Aye.') >= 1.2);
  assert.ok(readTime('x'.repeat(100)) > readTime('x'.repeat(40)));
  assert.ok(readTime('x'.repeat(2000)) <= 5);
  assert.equal(readTime('<i>Aye.</i>'), readTime('Aye.'), 'markup isn\'t read');
});

test('the recap says what there is to say, and nothing about what didn\'t happen', () => {
  const T = tally(4, 100);
  T.t = 30;
  assert.deepEqual(recapRows(T).map((r) => r[0]), ['Played']);
  Object.assign(T, { t: 1500, level: 7, purse: 2600, quests: ['What Walks in the Pines', 'The Dead Can\'t Wait'], kills: { 'THE RISEN': 31, OGRE: 2, WEREWOLF: 1 }, nKills: 34,
    big: ['the Werewolf'], low: { hpf: 0.07, who: 'the werewolf' }, falls: 1, spells: ['Chain Lightning'], best: { name: 'A Fine Staff', gain: 80 }, lands: ['The Green Downs'] });
  const rows = Object.fromEntries(recapRows(T));
  assert.equal(rows.Played, '25 minutes');
  assert.equal(rows.Levels, '4 to 7');
  assert.match(rows['2 quests done'], /Pines/);
  assert.match(rows['Put down'], /^34 in all: 31 × Risen/);
  assert.match(rows['Closest call'], /7% of his life left, against the werewolf/);
  assert.equal(rows['Beaten back'], 'once');
  assert.equal(rows['Best find'], 'A Fine Staff');
  assert.equal(rows.Gold, '250 more in the purse');
  assert.equal(rows['Brought down'], 'the Werewolf');
  // (A fight that never came near costing him isn't a close call.)
  T.low = { hpf: 0.9, who: 'a jelly' };
  assert.ok(!Object.fromEntries(recapRows(T))['Closest call']);
});

test('a kill is told by a name you could say', () => {
  assert.equal(told('BONE HYDRA'), 'the Bone Hydra');
  assert.equal(told('THE RISEN'), 'the Risen');
  assert.equal(told('KNIGHT OF VELSCOUR'), 'the Knight of Velscour');
});

test('each part of the show can be turned off in the settings, and is on to begin with', () => {
  const title = read('../src/title.js');
  for (const [k, v] of [['autocam', 'director'], ['autoread', 'on'], ['autohaste', 'on'], ['autotell', 'on']]) {
    assert.ok(title.includes(`${k}: '${v}'`), `${k} doesn't start ${v}`);
    assert.ok(title.includes(`data-k="${k}"`), `Settings has no ${k}`);
  }
  const auto = read('../src/ui/autoplay.js'), brain = read('../src/ui/autobrain.js'), cam = read('../src/ui/autocam.js'), show = read('../src/ui/autoshow.js');
  assert.ok(auto.includes("this.o.settings?.autohaste !== 'off'") && brain.includes("this.o.settings?.autoread !== 'off'"));
  assert.ok(cam.includes("settings?.autocam ?? 'director'") && show.includes("settings?.autotell === 'off'"));
});

test('the world\'s clock is only hurried by auto-play, in ticks no longer than ever, and let go when it stops', () => {
  const taken = Object.entries(CTRL).filter(([k]) => k !== 'SIZE' && k !== 'HASTE').map(([, v]) => v);
  // (SNAP_US is three words: one for each snapshot slot.)
  taken.push(CTRL.SNAP_US + 1, CTRL.SNAP_US + 2);
  assert.ok(!taken.includes(CTRL.HASTE) && CTRL.HASTE < CTRL.SIZE, 'CTRL.HASTE shares a word');
  const sim = read('../src/sim/sim.worker.js'), auto = read('../src/ui/autoplay.js');
  assert.ok(sim.includes('Math.min(owed, MOST) * haste()') && sim.includes('next += 1000 / hz / f'), 'the sim doesn\'t step by it');
  assert.match(auto, /this\.brain\?\.stop\(\);\s*this\.haste\(false\);/, 'stopping auto-play leaves the world hurried');
  for (const stop of ['INPUT.PAUSE]) { this.haste(false);', 'input.auto = null;\n      this.haste(false);']) assert.ok(auto.includes(stop), 'hands on, or the pause, leaves the world hurried');
});

test('the view behind him is only lent to auto-play: nothing is saved, and the switch is as it was after', () => {
  const view = read('../src/ui/view.js'), auto = read('../src/ui/autoplay.js');
  assert.ok(view.includes('(this.on || this.forced) && allowed') && !/forced[^\n]*save\(/.test(view));
  assert.ok(auto.includes('vs.forced = this.on && this.cam.third'));
});

test('bold is a choice in the menu, kept, and makes the head dare more', () => {
  const auto = read('../src/ui/autoplay.js'), brain = read('../src/ui/autobrain.js');
  assert.ok(auto.includes("localStorage.setItem('bm-auto-bold'") && auto.includes('data-t='));
  assert.ok(brain.includes('lvl: p.level + (this.bold ? BOLD_LEVELS : 0), own: p.level'));
  // (His own level, not the dared one, is what the log keeps and what the black knight is gone at by.)
  assert.ok(brain.includes('m.own >= BOSS_LEVEL') && brain.includes('this.o.log?.fell(m, m.own'));
});
