// The other Tessariels' moves (src/sim/hero.js, src/sim/heroskills.js), run with no page: every move of every class cast at
// a ring of foes and played out, on the real bodies and clips.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_NAMES } from '../src/core/heroes.js';
import { SKILLS } from '../src/sim/hero.js';
import { MORE_SKILLS, movesOf, rank } from '../src/sim/heroskills.js';
import { stage } from './hero-stage.mjs';

test('every class has eight new moves and more, each with a name, a level to come by it at, and something that does it', async () => {
  const { castSkill } = await import('../src/sim/heroskills.js');
  for (const cls of CLASS_NAMES) {
    const list = MORE_SKILLS[cls];
    assert.ok(list && list.length >= 8, `${cls} has ${list?.length} new moves`);
    const keys = new Set((SKILLS[cls] || []).map((s) => s.key));
    for (const s of list) {
      assert.ok(!keys.has(s.key), `${cls}: ${s.key} twice`);
      keys.add(s.key);
      assert.ok(s.name && s.cd > 0 && s.lvl >= 1 && s.lvl <= 20, `${cls}: ${s.key} wants a name, a cooldown and a level`);
    }
    // They come with the levels: fewer at five than at twenty, all of them by twenty.
    assert.ok(movesOf(cls, 5).length < movesOf(cls, 20).length, `${cls} learns as it levels`);
    assert.equal(movesOf(cls, 20).length, list.length, `${cls} has everything by level 20`);
    assert.ok(movesOf(cls, 4).length >= 2, `${cls} has something new by level 4`);
  }
  assert.equal(typeof castSkill, 'function');
});

test('rank goes up one every five levels', () => {
  const at = (level) => rank({ person: { level } });
  assert.deepEqual([1, 4, 5, 9, 10, 20, 30, 50].map(at), [1, 1, 2, 2, 3, 5, 6, 6]);
});

for (const cls of CLASS_NAMES) {
  test(`${cls}: every move, old and new, plays out and leaves the hero whole`, () => {
    const all = [...(SKILLS[cls] || []), ...MORE_SKILLS[cls]].filter((s) => !s.song && !s.heal);
    for (const s of all) {
      const { sim, w, hero, foes, fx, step, ctx } = stage(cls);
      ctx.now = s.key;
      // Where the move wants its foe: in the middle of its range, or at arm's length.
      const want = s.range ? Math.max(1.2, (s.range[0] + Math.min(s.range[1], s.range[0] + 6)) / 2 + 0.5) : 1.6;
      const dx = want - foes[0].x;
      for (const f of foes) f.x += dx;
      hero.foe = foes[0];
      hero.hp = hero.maxHp * (s.def ? 0.3 : 1);
      if (s.key === 'substitution' || s.key === 'smoke_bomb' || s.key === 'divine_shield') hero.lastHitBy = { x: foes[0].x, z: foes[0].z, t: sim.time };
      step(0.2);
      hero.gcd = 1e9;                                   // (only what's asked for)
      for (const q of hero.skills) q.t = 1e9;
      hero.skill(sim, s.key, foes[0]);
      let drawn = 0, peak = 0;
      step(7, () => { peak = Math.max(peak, fx.n - drawn); drawn = fx.n; });
      const struck = foes.reduce((a, f) => a + f.hits, 0);
      const quiet = ['shield_wall', 'divine_shield', 'substitution', 'smoke_bomb', 'vanish', 'tower_shields', 'lance_barrier', 'orbiting_rangs', 'dancing_notes', 'lullaby'];
      if (!quiet.includes(s.key)) assert.ok(struck > 0, `${cls}: ${s.key} struck nothing (foe at ${want.toFixed(1)} m)`);
      assert.ok(fx.n + fx.bursts > 0, `${cls}: ${s.key} drew nothing`);
      assert.ok(peak < 300, `${cls}: ${s.key} drew ${peak} shapes in one tick`);
      // (The fight over: whatever the class does between its blows, a ninja's stars or a bard's notes, stops with it.)
      for (const f of foes) { f.x += 900; f.aggro = false; }
      hero.foe = null; hero.skirm = null; hero.hold = 1e9;
      step(9);
      assert.ok(!hero.jump && !hero.charge, `${cls}: ${s.key} left the hero in the air or on the run`);
      assert.ok(Math.abs(hero.bodyFlip) < 1e-6 && Math.abs(hero.bodyRoll) < 1e-6, `${cls}: ${s.key} left the hero turned over`);
      // (Pointed by nothing but its own hold: a lancer's lance, in his hand at ease, is his hold's.)
      assert.ok(hero.free.every((m) => !m) && (!hero.aim || hero.aim === hero.heldAim), `${cls}: ${s.key} left something out of the hero's hands (free ${hero.free.map((m) => !!m)}, aim ${hero.aim})`);
      assert.ok(!hero.orbiting, `${cls}: ${s.key} left something turning round the hero`);
      assert.equal(w.shots.filter((q) => q.kind === 'x').length, 0, `${cls}: ${s.key} left something in the air`);
      assert.ok(Math.abs(hero.y) < 0.6, `${cls}: ${s.key} left the hero off the ground (${hero.y.toFixed(2)})`);
    }
  });
}

test('a bard takes up the lute to play: both hands come to it, the sword goes to the hip, and it throws off notes', () => {
  const { sim, w, hero, fx, step } = stage('bard', 30, 0);
  assert.ok(hero.luteP, 'the bard has a lute');
  hero.foe = null; hero.hold = 1e9;
  step(0.5);
  const back = hero.propMatrices.slice(48, 64), swordAtRest = hero.propMatrices.slice(0, 16);
  assert.ok(back[15] === 1, 'the lute is drawn');
  // (On the back: behind the chest.)
  const chest = hero.J.spine3 * 3, behind = (m) => (m[12] - hero.pose.wt[chest]) * Math.sin(hero.yaw) + (m[14] - hero.pose.wt[chest + 2]) * Math.cos(hero.yaw);
  assert.ok(behind(back) < -0.15, `at rest the lute is on the back (${behind(back).toFixed(2)})`);
  for (const v of [0, 1, 2]) {
    hero.playLute(3, v);
    const seen = [];
    let n0 = fx.events.length;
    step(2.5, () => { const m = hero.propMatrices; seen.push([m[60], m[61], m[62]]); });
    const lute = hero.propMatrices.slice(48, 64);
    // (Before his hips: bent over it to pick, his chest comes forward over the lute, so it's the hips it's measured from.)
    const hips = hero.J.pelvis * 3, before = (lute[12] - hero.pose.wt[hips]) * Math.sin(hero.yaw) + (lute[14] - hero.pose.wt[hips + 2]) * Math.cos(hero.yaw);
    assert.ok(before > 0.15, `played, the lute is before him (way ${v}: ${before.toFixed(2)})`);
    // Both hands within a hand's breadth of where they belong on it.
    const L = hero.luteP, at = (x, y, z) => [lute[12] + lute[0] * x + lute[4] * y + lute[8] * z, lute[13] + lute[1] * x + lute[5] * y + lute[9] * z, lute[14] + lute[2] * x + lute[6] * y + lute[10] * z];
    const hand = (side) => hero.handPos(side), gap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    assert.ok(gap(hand('l'), at(L.neck[0], L.neck[1], L.neck[2])) < 0.24, `way ${v}: the left hand is on the neck (${gap(hand('l'), at(L.neck[0], L.neck[1], L.neck[2])).toFixed(2)} m off)`);
    assert.ok(gap(hand('r'), at(0, L.strum, 0)) < (v === 2 ? 1.25 : 0.3), `way ${v}: the right hand is at the strings (or, wheeling, up over his shoulder on its way back to them) (${gap(hand('r'), at(0, L.strum, 0)).toFixed(2)} m off)`);
    // The sword is off the hand, at the hip.
    const sw = hero.propMatrices, hr = hand('r');
    assert.ok(Math.hypot(sw[12] - hr[0], sw[13] - hr[1], sw[14] - hr[2]) > 0.25, `way ${v}: the sword is out of the strumming hand`);
    assert.ok(fx.events.length > n0, `way ${v}: the strings are heard`);
    step(1.5);
  }
  step(2);
  assert.ok(behind(hero.propMatrices.slice(48, 64)) < -0.15, 'put away, the lute is on the back again');
  const sw = hero.propMatrices, hr = hero.handPos('r');
  assert.ok(Math.hypot(sw[12] - hr[0], sw[13] - hr[1], sw[14] - hr[2]) < 0.2, 'and the sword is back in the hand');
  assert.ok(swordAtRest[15] === 1);
});

test('a dragoon dives with the spear in his fist: it points down the dive, stands in the ground where he lands, and is back in his hand', () => {
  const { sim, hero, foes, step } = stage('dragoon');
  for (const f of foes) f.x += 2;
  hero.foe = foes[0]; hero.gcd = 1e9; for (const q of hero.skills) q.t = 1e9;
  hero.shotCd = 1e9;                                    // (no ordinary thrusts after it: those point the spear too)
  step(0.2);
  hero.skill(sim, 'jump', foes[0]);
  let aimedDown = false, planted = false, top = 0;
  step(2.2, () => {
    top = Math.max(top, hero.air);
    const m = hero.propMatrices;
    if (hero.jump?.phase === 1 && hero.jump.u > 0.75 && m[5] < -0.3 && m[4] * Math.sin(hero.jump.head) + m[6] * Math.cos(hero.jump.head) > 0.3) aimedDown = true;
    if (hero.free[0]) { planted = true; assert.ok(hero.free[0][5] < -0.5, 'the planted spear points into the ground'); const tip = hero.free[0][13] + hero.free[0][5] * hero.mainP.reach; assert.ok(tip < 0, `its point is under the ground (${tip.toFixed(2)})`); }
  });
  // (Not so high that whoever's watching loses him off the top of the picture.)
  assert.ok(top > 1.5 && top < 2.6, `he leaves the ground, and not far (${top.toFixed(1)} m)`);
  assert.ok(aimedDown, 'the spear in his fist points down the dive');
  assert.ok(planted, 'and stands in the ground where he lands');
  // (Pointed by nothing but his own hold again: both hands on it, level at what he's fighting.)
  assert.ok(!hero.free[0] && (!hero.aim || hero.aim === hero.heldAim), 'and is back in his hand after');
  assert.ok(foes[0].hits > 0, 'and the landing strikes');
});

test('a lancer fights with the lance: couched and level behind a raised board, driven out in a thrust, and carried so through a run', () => {
  const { sim, hero, foes, step } = stage('lancer');
  for (const f of foes) f.x += 1;                       // (the first of them seven metres off: outside the lance's point)
  hero.foe = foes[0]; hero.gcd = 1e9; for (const q of hero.skills) q.t = 1e9;
  hero.shotCd = 1e9; hero.hold = 1e9;                   // (stood to them, and nothing struck till it's asked)
  const m = hero.propMatrices, reach = hero.mainP.reach;
  const fx = () => Math.sin(hero.yaw), fz = () => Math.cos(hero.yaw);
  // How far along his facing the lance points, where its point is before him, and where the board is and which way its back is turned.
  const along = () => m[4] * fx() + m[6] * fz();
  const tip = () => (m[12] + m[4] * reach - hero.x) * fx() + (m[14] + m[6] * reach - hero.z) * fz();
  const board = () => (m[28] - hero.x) * fx() + (m[30] - hero.z) * fz();
  const boardBack = () => m[24] * fx() + m[26] * fz();
  const held = (what) => {
    assert.ok(along() > 0.93 && Math.abs(m[5]) < 0.25, `${what}: the lance is level and points the way he faces (${along().toFixed(2)}, ${m[5].toFixed(2)} up)`);
    assert.ok(board() > 0.25, `${what}: the board is before him (${board().toFixed(2)} m)`);
    assert.ok(boardBack() < -0.8, `${what}: its face is to them, its back to him (${boardBack().toFixed(2)})`);
    assert.ok(m[29] - hero.y > 0.8 && m[29] - hero.y < 1.6, `${what}: and up, its middle between his belt and his chin (${(m[29] - hero.y).toFixed(2)} m)`);
  };
  step(0.8);
  held('on guard');
  const rest = tip();
  // A thrust: back, then out past where it rested, and it lands.
  for (const f of foes) f.x -= 3.5;
  hero.hold = 0; hero.goal = null;                     // (they've been moved to him: he isn't still walking to where they were)
  hero.blow(sim, foes[0], hero.blows[0]);
  hero.shotCd = 1e9;
  let lo = rest, hi = rest;
  step(0.75, () => { if (hero.swing) { lo = Math.min(lo, tip()); hi = Math.max(hi, tip()); held('in a thrust'); } });
  assert.ok(rest - lo > 0.15, `the lance is drawn back first (${(rest - lo).toFixed(2)} m)`);
  assert.ok(hi - lo > 0.7, `and its point is driven out (${(hi - lo).toFixed(2)} m from back to out)`);
  assert.ok(foes[0].hits > 0, 'and the thrust lands');
  // A charge: a run, the lance level down the way he goes and the board up before him the whole of it. It ends: he stops
  // short of them with his point's reach in hand, plants, and drives the point in; he doesn't run on through them.
  step(0.6);
  for (const f of foes) f.x += 5;
  hero.goal = null;
  const x0 = hero.x, hits0 = foes[0].hits;
  hero.skill(sim, 'charge', foes[0]);
  let ran = 0, drove = 0, nearest = 1e9;
  step(1.9, () => {
    nearest = Math.min(nearest, foes[0].x - hero.x);
    if (hero.charge && hero.charge.wait <= 0 && hero.rushW > 0.9) { ran++; held('in the run'); assert.ok(hero.action?.name === 'Sprint_Loop', 'he runs it'); }
    else if (!hero.charge && hero.swing?.stab) { drove = Math.max(drove, tip()); held('in the thrust that ends it'); assert.ok(Math.hypot(hero.vx, hero.vz) < 0.5, 'planted: he is not still running'); }
  });
  assert.ok(ran > 20, `the run lasts (${ran} ticks of it)`);
  assert.ok(hero.x - x0 > 3, `and covers ground (${(hero.x - x0).toFixed(1)} m)`);
  assert.ok(nearest > 2, `he stops short of them: he doesn't run through them (${nearest.toFixed(2)} m off at the nearest)`);
  assert.ok(drove > rest + 0.4, `and the point's driven out at the end of it (${drove.toFixed(2)} m before him, ${rest.toFixed(2)} on guard)`);
  assert.ok(foes[0].hits > hits0, 'and it lands');
  assert.ok(!hero.charge && !hero.swing, 'and is over');
});

test("a bard's sword put away is at his left hip, point down and back, whatever a clip does to his hips and wherever his lute is", () => {
  const { sim, hero } = stage('bard', 30, 0);
  hero.foe = null; hero.task = null; hero.hold = 1e9;
  const J = (n) => hero.rig.index.get(n) * 3, wt = hero.pose.wt, m = hero.propMatrices;
  const sub = (a, b) => [wt[a] - wt[b], wt[a + 1] - wt[b + 1], wt[a + 2] - wt[b + 2]], unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); }, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // (Some of the gesture clips turn the pelvis bone right round and the body back again above it; the lute coming off his back
  // or going back to it used to leave the sword part-way between his hand and his hip.)
  for (const clip of ['Idle_Loop', 'LP_idle', 'LP_look_around', 'LP_greet_01', 'LP_wave_goodbye_01', 'LP_laugh_01', 'Idle_Talking_Loop', 'LP_fold_arms']) {
    if (!hero.bank.clips[clip]) continue;
    for (const lute of [0, 0.05, 0.4]) {
      hero.x = hero.z = 0; hero.yaw = hero.faceYaw = 0; hero.stow = 1; hero.calmT = 1e3; hero.luteW = lute; hero.tune = null; hero.gesture = 'talk'; hero.gestureT = 1e9;
      hero.play(clip, 0, 'full', 0); hero.actT = 0.5 * hero.bank.clips[clip].dur; hero.fromW = 0;
      hero.animate(1 / 120, sim);
      // By his own body, whatever way the clip has turned it: his left from shoulder to shoulder, up his spine, before him.
      const L = unit(sub(J('clavicle_l'), J('clavicle_r'))), U = unit(sub(J('spine_03'), J('pelvis'))), F = [L[1] * U[2] - L[2] * U[1], L[2] * U[0] - L[0] * U[2], L[0] * U[1] - L[1] * U[0]];
      const g = [m[12] - wt[J('pelvis')], m[13] - wt[J('pelvis') + 1], m[14] - wt[J('pelvis') + 2]], blade = [m[4], m[5], m[6]];
      assert.ok(dot(g, L) > 0.1, `${clip}, lute ${lute}: its grip is at his left hip (${dot(g, L).toFixed(2)} m to his left)`);
      assert.ok(dot(blade, U) < -0.4 && dot(blade, F) < 0.3, `${clip}, lute ${lute}: its point is down and back (${dot(blade, U).toFixed(2)} up, ${dot(blade, F).toFixed(2)} forward)`);
    }
  }
});

test("a dragoon's lead hand stays on the spear's shaft through guard, draw and thrust: it slides, it never lets go", () => {
  const { sim, hero, foes, step } = stage('dragoon');
  for (const f of foes) f.x -= 3.2;                     // (the first of them at his thrust's reach)
  hero.foe = foes[0]; hero.gcd = 1e9; for (const q of hero.skills) q.t = 1e9;
  hero.shotCd = 1e9; hero.hold = 1e9;
  const m = hero.propMatrices, wt = hero.pose.wt, hl = hero.arms.l.h * 3;
  // How far the left wrist is from the spear's own line (a palm's length off it is a hand on it).
  const off = () => { const d = [wt[hl] - m[12], wt[hl + 1] - m[13], wt[hl + 2] - m[14]], a = [m[4], m[5], m[6]], t = d[0] * a[0] + d[1] * a[1] + d[2] * a[2]; return Math.hypot(d[0] - a[0] * t, d[1] - a[1] * t, d[2] - a[2] * t); };
  step(0.8);
  assert.ok(off() < 0.16, `on guard his left hand is on the shaft (${off().toFixed(2)} m off it)`);
  hero.hold = 0; hero.goal = null;
  hero.blow(sim, foes[0], hero.blows[0]);
  hero.shotCd = 1e9;
  let worst = 0, drew = false;
  step(0.8, () => { if (hero.swing) { worst = Math.max(worst, off()); if (hero.jab < -0.6) drew = true; } });
  assert.ok(drew, 'the thrust has a draw');
  assert.ok(worst < 0.16, `through the draw and the thrust it never leaves the shaft (${worst.toFixed(2)} m off it at the worst)`);
  assert.ok(foes[0].hits > 0, 'and the thrust lands');
});

test('a paladin with a board throws it: it leaves his arm, strikes more than one, and is back on his arm', () => {
  const { sim, hero, foes, w, step } = stage('paladin');
  // (A paladin who carries a board, if this cast's doesn't: the move is the same either way.)
  for (const f of foes) f.x += 2;
  hero.foe = foes[0]; hero.gcd = 1e9; for (const q of hero.skills) q.t = 1e9;
  step(0.2);
  hero.skill(sim, 'blessed_shield', foes[0]);
  let away = false;
  step(5, () => { if (w.shots.some((s) => s.kind === 'x')) away = true; });
  assert.ok(away, 'something flew');
  assert.ok(foes.filter((f) => f.hits > 0).length >= 2, 'it struck more than one');
  assert.ok(!hero.free[1], 'and nothing is left out of his hands');
});

test('a lancer raises boards of light: they turn round him, cut what they touch, and whatever they touch is his', () => {
  const { sim, hero, foes, step } = stage('lancer');
  for (const f of foes) { f.x -= 4.4; }
  hero.foe = foes[0]; hero.gcd = 1e9; for (const q of hero.skills) q.t = 1e9;
  step(0.2);
  hero.skill(sim, 'tower_shields', foes[0]);
  step(3);
  assert.ok(hero.orbiting, 'the boards are up');
  assert.ok(foes.some((f) => f.tauntBy === hero), 'what they touch goes for him');
  assert.ok(foes.some((f) => f.hits > 0), 'and is cut');
  step(9);
  assert.ok(!hero.orbiting, 'and they come down again');
});

test('a boomerang knight looses fifteen that find their mark, and one of gold that comes back', () => {
  const { sim, hero, foes, w, step } = stage('boomerang');
  for (const f of foes) f.x += 2;
  hero.foe = foes[0]; hero.gcd = 1e9; for (const q of hero.skills) q.t = 1e9;
  step(0.2);
  hero.skill(sim, 'homing_salvo', foes[0]);
  let most = 0, total = new Set();
  step(4, () => { const live = w.shots.filter((s) => s.kind === 'x'); most = Math.max(most, live.length); for (const s of live) total.add(s); });
  assert.equal(total.size, 15, 'fifteen of them');
  assert.ok(most >= 8, `most of them in the air at once (${most})`);
  assert.ok(foes[0].hits >= 10, `and they find the mark (${foes[0].hits} of 15)`);
  hero.skill(sim, 'golden_boomerang', foes[0]);
  let out = 0, back = false;
  step(6, () => { for (const s of w.shots) if (s.kind === 'x') { out = Math.max(out, Math.hypot(s.x - hero.x, s.z - hero.z)); if (s.back) back = true; } });
  assert.ok(out > 6, `the golden one goes out (${out.toFixed(1)} m)`);
  assert.ok(back, 'and turns for home');
  assert.equal(w.shots.filter((s) => s.kind === 'x').length, 0, 'and is caught');
});

test('in a fight a hero of level 20 uses many of its moves, not one over and over', () => {
  for (const cls of CLASS_NAMES) {
    const { sim, hero, foes, step } = stage(cls, 20, 5);
    const used = new Set(), real = hero.skill.bind(hero);
    hero.skill = (s, key, m) => { used.add(key); return real(s, key, m); };
    hero.foe = foes[0];
    step(60, () => { if (!hero.foe) hero.foe = foes[0]; hero.hp = hero.maxHp; });
    assert.ok(used.size >= 6, `${cls} used ${used.size} moves in a minute: ${[...used].join(', ')}`);
  }
});

test('hired, each class fights at your side for a minute: it uses its moves, the healer from its place, and nothing breaks', () => {
  for (const cls of CLASS_NAMES) {
    const { sim, w, hero, foes, step } = stage(cls, 20, 5);
    assert.ok(w.hire(0, { level: 20, stay: true, name: 'Bren' }), `${cls} is hired`);
    assert.equal(hero.person.level, 20);
    const used = new Set(), real = hero.skill.bind(hero);
    hero.skill = (s, key, m) => { used.add(key); return real(s, key, m); };
    hero.hold = 0;
    for (const f of foes) { f.aggro = true; f.x -= 2; }
    step(60, () => { hero.hp = hero.maxHp; for (const f of foes) f.aggro = true; });
    assert.ok(used.size >= (cls === 'paladin' ? 2 : 4), `hired ${cls} used ${used.size} moves in a minute: ${[...used].join(', ')}`);
    assert.ok(foes.some((f) => f.hits > 0), `hired ${cls} struck something`);
    // A level from you: more moves to choose from, and more life.
    const hp = hero.maxHp;
    w.setLevel(hero, 30);
    assert.ok(hero.maxHp > hp, `${cls} has more life at 30 than at 20`);
  }
});

test('the world keeps pace with you: the other Tessariels are never far below your level, and never below where they began', () => {
  const { w, hero } = stage('rogue', 6, 0);
  const began = hero.person.level;
  w.keepPace(2);
  assert.equal(hero.person.level, began, 'a low level of yours takes nothing from them');
  w.keepPace(30);
  assert.ok(hero.person.level >= 27 && hero.person.level <= 33, `at your 30 they are ${hero.person.level}`);
  w.keepPace(12);
  assert.ok(hero.person.level >= began, 'and back down no further than where they began');
});
