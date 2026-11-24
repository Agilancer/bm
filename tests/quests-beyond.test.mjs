// The quests of the land beyond Bellmourn (src/folk/land-quests.js, words in src/folk/lines/land.js): every one of them is
// walked through here as the game would report it (where the player stands, what dies and where, which boss falls), taken,
// advanced step by step and handed in; and everyone, every place, lair and boss they name is checked to be there.
//   node --test tests/quests-beyond.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestBook, RULES, areaAt, hasArea, placeSpot, delvePortal, gatherSpots, outpostOf } from '../src/folk/quests.js';
import { DENS } from '../src/core/camps-data.js';
import { LAND_RULES } from '../src/folk/land-quests.js';
import { QUESTS } from '../src/folk/lines/quests.js';
import { LINES, QUESTS as LAND_QUESTS } from '../src/folk/lines/land.js';
import { BEYOND } from '../src/folk/lines/beyond.js';
import { GIVERS } from '../src/folk/lines/lisandra.js';
import { FOLK, PEOPLE, POSTED } from '../src/folk/people.js';
import { FOLK_MAX } from '../src/folk/layout.js';
import { DAYS } from '../src/folk/days.js';
import { BOSSES, BOSS_KEYS, DELVES } from '../src/core/dungeon.js';
import { GROUPS, LAIRS } from '../src/core/tripo-monsters.js';
import { SITES, routeDist, siteAt, waterAt } from '../src/core/lands.js';
import { MATS } from '../src/items/items.js';
import { WORLD_BOSSES, groundOf } from '../src/core/wilds.js';

import { churchAt } from '../src/core/church.js';

const churchSpot = churchAt(186, 0);   // (the Bell Crypt, down among the dead)
const IDS = Object.keys(LAND_RULES);
const WHO = new Set([...FOLK, ...BEYOND].map((p) => p.id));
const book = () => new QuestBook({ change() {}, toast() {}, done() {} });
// Somewhere inside a place: a site's middle, a lair's, a dungeon's way in (down at its own depth).
function inside(k) {
  const d = DELVES.find((q) => q.key === k);
  if (d) return [d.x + (d.entry?.x ?? 0), d.y ?? -50, d.z + (d.entry?.z ?? 3)];
  if (k === 'catacombs') return null;
  if (k === 'waste') return [-4200, 0, -900];
  if (k === 'millhaven') return [SITES.farm.x - 60, 0, SITES.farm.z - 50];   // (the pond by the farm, where its jellies are: src/sim/slimes.js)
  if (k === 'fen') return [SITES.sallow.x + 70, 0, SITES.sallow.z + 80];   // (Sallowmere's east shore, where its jellies are: src/sim/slimes.js)
  const at = placeSpot(k);
  return at ? [at.x, 0, at.z] : null;
}
const groupOf = (st) => st.foe?.[0] ?? (st.kill.startsWith('lair:') || st.kill.startsWith('outpost:') ? 'Goblins' : null);
const needsOf = (id) => [].concat(RULES[id].needs || []);

test('there are plenty of them, and three or more go into each party dungeon', () => {
  assert.ok(IDS.length >= 20, `${IDS.length} quests`);
  for (const id of IDS) assert.equal(RULES[id], LAND_RULES[id], id);
  const into = (key) => IDS.filter((id) => LAND_RULES[id].steps.some((s) => s.enter === key || s.kill === key || BOSSES.find((b) => b.key === s.boss)?.delve === key));
  // (And two or more into each of the four made after them. Phobos's sewers' and its castle's are the city's: tests/sewers.test.mjs,
  // tests/castle.test.mjs.)
  for (const d of DELVES.filter((q) => !q.sewer && !q.castle)) assert.ok(into(d.key).length >= 2, `${d.key}: ${into(d.key)}`);
  // (The catacombs' are the town's own starter work now, docs/QUEST-LOOP.md: the dead, and what's brought up off them.)
  assert.ok(Object.keys(RULES).filter((id) => RULES[id].steps.some((s) => s.kill === 'catacombs' || (s.bring && !s.at))).length >= 2, 'the catacombs');
  // Each dungeon's first boss and its last have a quest.
  for (const d of DELVES.filter((q) => !q.sewer && !q.castle)) {
    const mine = BOSSES.filter((b) => b.delve === d.key).map((b) => b.key);
    if (!mine.length) continue;
    for (const key of [mine[0], mine[mine.length - 1]]) assert.ok(IDS.some((id) => LAND_RULES[id].steps.some((s) => s.boss === key)), `no quest for ${key}`);
  }
});

test('everyone, every place, lair, monster and boss a quest names is there', () => {
  for (const id of IDS) {
    const R = LAND_RULES[id], q = QUESTS[id];
    assert.ok(q && q === LAND_QUESTS[id], `${id} has no words`);
    assert.ok(WHO.has(q.giver), `${id}: no such giver ${q.giver}`);
    // (Of Bellmourn's own, only those Lisandra sends you round to give work: tests/quest-marks.test.mjs.)
    if (PEOPLE.some((p) => p.id === q.giver)) assert.ok(GIVERS.includes(q.giver), `${id}: ${q.giver} gives no work in Bellmourn`);
    for (const n of needsOf(id)) assert.ok(RULES[n], `${id} needs ${n}`);
    for (const who of Object.keys(q.others || {})) assert.ok(WHO.has(who), `${id}: ${who} has a line and isn't anyone`);
    const end = R.steps.at(-1);
    assert.ok(end.back || end.bring || (end.talk && end.end), `${id} ends with nobody`);
    for (const st of R.steps.slice(0, -1)) assert.ok(!st.end, `${id}: an end before the end`);
    for (const st of R.steps) {
      for (const k of [st.enter, st.kill, st.at, st.gather, ...(st.visit || [])].filter(Boolean)) {
        assert.ok(hasArea(k), `${id}: no such place ${k}`);
        if (k !== 'catacombs') assert.ok(inside(k) && areaAt(k, ...inside(k)), `${id}: ${k} can't be stood in`);
      }
      if (st.kill?.startsWith('lair:')) {
        const l = LAIRS.find((q2) => q2.key === st.kill.slice(5));
        assert.ok(st.n <= (l.boss ? 1 : 0) + l.n, `${id}: ${st.kill} holds fewer than ${st.n}`);
      }
      // (A den to empty is one of the pinned ones; things to gather lie where they can be walked to, enough of them.)
      if (st.clear) assert.ok(outpostOf(st.clear) && DENS.some((d) => d.key === st.clear), `${id}: no pinned den ${st.clear}`);
      if (st.gather) { assert.ok(st.n >= 1 && st.what, `${id}: gather wants n and what`); assert.equal(gatherSpots(id, st).length, st.n, `${id}: ${st.n} to gather`); }
      for (const g of st.foe || []) assert.ok(GROUPS[g], `${id}: no such monsters ${g}`);
      if (st.boss) assert.ok(BOSS_KEYS.includes(st.boss), `${id}: no such boss ${st.boss}`);
      // (A world boss, a Herald of the Elder Dragon Gods: one of the land's, with a ground of its own to rise at, near enough the giver.)
      if (st.wboss) {
        const B = WORLD_BOSSES.find((b) => b.key === st.wboss), g = groundOf(st.ground), w = POSTED.find((p) => p.id === q.giver);
        assert.ok(B && g, `${id}: no world boss ${st.wboss} at ${st.ground}`);
        if (w?.post) assert.ok(Math.hypot(g.x - w.post[0], g.z - w.post[1]) < 650, `${id}: ${st.ground} is far from ${q.giver}`);
      }
      if (st.talk) { assert.ok(WHO.has(st.talk), `${id}: nobody called ${st.talk}`); assert.ok(q.others?.[st.talk]?.length, `${id}: ${st.talk} has nothing to say`); }
      if (st.bring) assert.ok(MATS[st.bring], `${id}: no such thing as ${st.bring}`);
      if (st.talk || st.back) assert.ok(st.say, `${id}: a step with nothing to say`);
    }
    if (R.charm) assert.ok(R.charmName, id);
  }
});

test('every quest has all its words, and none is too long for the panel', () => {
  const tooLong = (l, max, where) => { const t = Array.isArray(l) ? l[1] : typeof l === 'string' ? l : l.say; assert.ok(String(Array.isArray(t) ? t[1] : t).length <= max, `${where}: ${String(t).length} letters: ${t}`); };
  for (const id of IDS) {
    const q = QUESTS[id], n = LAND_RULES[id].steps.length;
    for (const k of ['title', 'accept', 'acceptLine', 'decline', 'declineLine']) assert.ok(q[k], `${id}.${k}`);
    assert.equal(q.journal.length, n, `${id}: ${q.journal.length} journal lines for ${n} steps`);
    assert.ok(q.offer.length >= 2 && q.progress.length && q.done.length >= 2 && q.after.length, id);
    for (const l of [...q.offer, q.acceptLine, q.declineLine, ...q.progress, ...q.done, ...q.after, ...Object.values(q.others || {}).flat()]) tooLong(l, 280, id);
    for (const l of q.journal) tooLong(l, 320, id);
    for (const l of [q.accept, q.decline, ...LAND_RULES[id].steps.map((s) => s.say).filter(Boolean)]) tooLong(l, 70, id);
  }
  for (const [who, L] of Object.entries(LINES)) {
    assert.ok(WHO.has(who), who);
    assert.ok(L.first?.length && L.about?.length && L.bye?.length, who);
    for (const part of ['morning', 'day', 'evening', 'night']) assert.ok(L.greet[part]?.length, `${who} ${part}`);
    for (const l of [...L.first, ...Object.values(L.greet).flat(), ...L.about, ...Object.values(L.ask || {}).flat()]) tooLong(l, 280, who);
    for (const l of [...L.bye, ...Object.values(L.barks || {}).flat()]) tooLong(l, 90, who);
    for (const k of Object.keys(L.topics || {})) assert.ok(L.ask[k]?.length, `${who}: nothing to say about ${k}`);
  }
});

test('the two letters keep apart in the writing', () => {
  const V = /Velscour|Blackvigil|the keep\b|Castellan|Maldrec|Sorvane|red over black|Throne|Dark Lord/i;
  const T = /Tessariel|Bell Tower|Four Watches|\bseal\b|\bseals\b|sunburst|abbey|chapel|shrine|Bellwright|Anselm|the tower\b/i;
  const each = (o, f, path = '') => { if (typeof o === 'string') f(o, path); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) each(v, f, `${path}.${k}`); };
  each({ LINES, LAND_QUESTS }, (line, path) => assert.ok(!(V.test(line) && T.test(line)), `${path}: both letters in one line: ${line}`));
  // Thornwick and Cinderford are of neither letter: nobody there names either power, and Cinderford never speaks of the tower.
  for (const who of ['dorcas', 'osric', 'wymond', 'hasket', 'colm', 'ysolt']) each(LINES[who], (line, path) => assert.ok(!/Velscour|Tessariel\b|Bell Tower|Bellwright/.test(line), `${who}${path}: ${line}`));
  // Ser Hale is Tessariel's: he never names Velscour.
  each(LINES.hale, (line) => assert.ok(!/Velscour|Blackvigil/.test(line), line));
});

test('each can be taken, walked through as the game reports it, and handed in', () => {
  for (const id of IDS) {
    const Q = book(), R = LAND_RULES[id], q = QUESTS[id];
    for (const todo = needsOf(id); todo.length;) { const n = todo.pop(); Q.q[n] = { stage: 'done' }; todo.push(...needsOf(n)); }
    if (R.due) Q.flags.add(R.due);
    assert.ok(Q.offers(q.giver).includes(id), `${id} isn't offered`);
    assert.equal(Q.mark(q.giver, {}, 0), 'offer', id);
    Q.begin(id);
    // (A grey ? while it's under way; or a ! still, if they've more to give.)
    assert.ok(['busy', 'offer'].includes(Q.mark(q.giver, {}, 0)), id);
    for (let k = 0; k < R.steps.length; k++) {
      const st = R.steps[k];
      assert.equal(Q.state(id).step, k, `${id} step ${k}`);
      assert.ok(Q.journalLine(id).length > 20, `${id} step ${k}: nothing in the journal`);
      if (st.enter) {
        // (Elsewhere first: it doesn't count; then there.)
        Q.where(30, 2, 30, 12); assert.equal(Q.state(id).step, k, `${id}: ${st.enter} counted from Bellmourn`);
        // (By night only, where the step says so: by day it doesn't count.)
        if (st.night) { Q.where(...inside(st.enter), 12); assert.equal(Q.state(id).step, k, `${id}: ${st.enter} counted by day`); }
        Q.where(...inside(st.enter), st.night ? 23 : 12);
      } else if (st.visit) {
        for (const v of st.visit) Q.where(...inside(v), 12);
      } else if (st.kill) {
        const at = inside(st.kill) || [churchSpot[0], -13, churchSpot[1]], g = groupOf(st);
        // (The wrong sort of thing, or the right sort somewhere else, doesn't count.)
        if (st.foe) Q.kill(...at, 5, 'Giant Worms');
        if (st.kill.startsWith('lair:') || st.kill.startsWith('outpost:')) Q.kill(...at, 9, null);
        if (st.kill !== 'catacombs') Q.kill(40, 2, 40, 5, g);
        assert.equal(Q.state(id).n, 0, `${id}: a kill counted that shouldn't`);
        // (One kind only, where the step says which: of. Anything else there doesn't count.)
        if (st.of != null) Q.kill(...at, 5, g);
        assert.equal(Q.state(id).n, 0, `${id}: a kill of the wrong kind counted`);
        for (let i = 0; i < st.n; i++) Q.kill(...at, st.of ?? 5, g);
      } else if (st.clear) {
        Q.cleared('wo_nothing'); assert.equal(Q.state(id).step, k);
        Q.cleared(st.clear);
      } else if (st.gather) {
        Q.where(30, 2, 30, 12); assert.equal(Q.state(id).n, 0, `${id}: something gathered in Bellmourn`);
        for (const [gx, gz] of gatherSpots(id, st)) Q.where(gx + 0.5, 0, gz, 12);
      } else if (st.boss) {
        Q.boss('nobody'); assert.equal(Q.state(id).step, k);
        Q.boss(st.boss);
      } else if (st.wboss) {
        // (Wanted, where it's to rise, while the step's on; another world boss doesn't count.)
        assert.deepEqual(Q.wantedBosses().map((w) => [w.key, w.at]), [[st.wboss, st.ground]], id);
        assert.ok(Q.wantedBosses()[0].lvl >= 9, `${id}: no level for its Herald`);
        Q.boss('gorehorn'); assert.equal(Q.state(id).step, k);
        Q.boss(st.wboss);
        assert.deepEqual(Q.wantedBosses(), [], id);
      } else if (st.talk) {
        assert.equal(Q.mark(st.talk, {}, 0), 'ready', `${id}: no ? over ${st.talk}`);
        if (st.end) { Q.finish(id); assert.ok(Q.done(id)); continue; }   // (said, and paid there: src/ui/folk.js stepTalk)
        Q.advance(id);   // (said, in the panel)
      } else if (st.bring) {
        assert.equal(Q.mark(q.giver, { [st.bring]: st.n - 1 }, 0), 'busy', id);
        assert.equal(Q.mark(q.giver, { [st.bring]: st.n }, 0), 'ready', id);
      } else if (st.back) {
        assert.equal(Q.mark(q.giver, {}, 0), 'ready', `${id}: no ? over ${q.giver}`);
      }
      if (!st.back && !st.bring) assert.equal(Q.state(id).step, k + 1, `${id}: step ${k} (${Object.keys(st)[0]}) didn't finish`);
    }
    if (R.steps.at(-1).end) continue;
    // Saved and loaded at the last step, it holds; then handed in.
    const S = book(); S.load(structuredClone(Q.save()));
    assert.deepEqual(S.state(id), Q.state(id), id);
    assert.equal(S.handIn(id, 3), 'done', id);
    assert.ok(S.done(id) && S.flags.has(`quest:${id}:done`), id);
    assert.equal(S.mark(q.giver, {}, 3) === 'ready', false, id);
  }
});

test('a boss that fell before its quest was taken still counts, and is remembered in a save', () => {
  const id = IDS.find((q) => LAND_RULES[q].steps.some((st) => st.boss)), k = LAND_RULES[id].steps.findIndex((st) => st.boss), key = LAND_RULES[id].steps[k].boss;
  const Q = book();
  Q.boss(key);
  const R = book(); R.load(Q.save());
  for (const todo = needsOf(id); todo.length;) { const n = todo.pop(); R.q[n] = { stage: 'done' }; todo.push(...needsOf(n)); }
  R.begin(id);
  R.q[id].step = k;
  assert.ok(R.step(id).boss);
  R.where(0, 0, 0, 12);
  assert.equal(R.state(id).step, k + 1, `${id}: ${key} had fallen already`);
});

test('the trail has somewhere to lead for every step out in the land', () => {
  for (const d of DELVES.map((q) => q.key)) { const p = delvePortal(d); assert.ok(p && Number.isFinite(p.x) && Number.isFinite(p.z), d); }
  // (A dungeon's portal stands out in the land, not down in the dungeon.)
  for (const d of DELVES.map((q) => q.key)) assert.ok(!areaAt(d, delvePortal(d).x, 0, delvePortal(d).z), `${d}'s portal is inside it`);
  for (const id of IDS) for (const st of LAND_RULES[id].steps) {
    for (const k of [st.enter, st.kill, st.at, st.gather, st.clear && `outpost:${st.clear}`, ...(st.visit || [])].filter((x) => x && !['catacombs', 'waste', 'woods', 'bellcrypt', 'millhaven', 'fen'].includes(x))) assert.ok(placeSpot(k), `${id}: nowhere to lead to for ${k}`);
    if (st.wboss) assert.ok(groundOf(st.ground), `${id}: nowhere to lead to for ${st.ground}`);
  }
});

test('the people posted in the land: room for them, somewhere sound to stand, and their own words', () => {
  assert.ok(FOLK.length <= FOLK_MAX, `${FOLK.length} bodies for ${FOLK_MAX} places`);
  assert.equal(new Set(FOLK.map((p) => p.id)).size, FOLK.length);
  assert.ok(DAYS.posted);
  // (Phobos's hub givers stand in their yards, not in the land's places: tests/phobos-quests.test.mjs.)
  // (Nor does Wenna on the Sill, the first visit's, by its own lairs: tests/first-visit.test.mjs.)
  for (const p of POSTED.filter((q) => !q.hub && !q.sewer && !q.delve && !q.firstVisit)) {
    assert.equal(p.job, 'posted', p.id);
    assert.ok(LINES[p.id], `${p.id} has nothing to say`);
    const [x, z] = p.post, near = Object.values(SITES).find((s) => Math.hypot(x - s.x, z - s.z) < s.r);
    assert.ok(near, `${p.id} stands nowhere`);
    assert.equal(waterAt(x, z), null, `${p.id} stands in water`);
    // (Clear of anyone else posted: nobody talks across them.)
    for (const o of POSTED) if (o !== p) assert.ok(Math.hypot(o.post[0] - x, o.post[1] - z) > 6, `${p.id} and ${o.id}`);
    // And none stands among monsters (a camp's own are further off than anything there can see: a lair's sight is 34 m).
    for (const l of LAIRS) assert.ok(Math.hypot(l.x - x, l.z - z) > (p.camp ? 85 : 150), `${p.id} is ${Math.hypot(l.x - x, l.z - z) | 0} m from ${l.key}`);
  }
  // Every one of them gives work, or buys and sells (a camp's sutler).
  for (const p of [...POSTED.filter((q) => !q.hub && !q.sewer && !q.delve && !q.firstVisit), BEYOND.find((b) => b.id === 'hale')]) assert.ok(p.trade || Object.keys(RULES).some((id) => QUESTS[id].giver === p.id), `${p.id} gives nothing`);
});

test('the lairs: none in a place, on a road or in water, and no more near any one than the slots can stand up', () => {
  const size = (l) => (l.boss ? 1 : 0) + l.n;
  assert.equal(new Set(LAIRS.map((l) => l.key)).size, LAIRS.length);
  for (const l of LAIRS) {
    if (Math.hypot(l.x, l.z) < 330) continue;   // (the town's own woods: tests/hunts.test.mjs)
    assert.equal(waterAt(l.x, l.z), null, `${l.key} is in water`);
    const rd = routeDist(l.x, l.z);
    // (But for the ones that keep a place a road runs to: the drowned at Sallowmere's jetty.)
    if (!siteAt(l.x, l.z, 40)) assert.ok(!rd.road || rd.d > rd.road.w + l.r + 8, `${l.key} is on ${rd.road?.name}`);
    let near = 0;
    for (const o of LAIRS) if (Math.hypot(o.x - l.x, o.z - l.z) < 235) near += size(o);
    assert.ok(near <= 12, `${l.key}: ${near} bodies within reach of one spot`);
  }
  // Every country's places have something at or near them (but for the safe towns and Tessariel's own houses).
  const SAFE = new Set(['hamlet', 'farm', 'thornwick', 'cinderford', 'frostwatch', 'belltower', 'abbey', 'chapel', 'shrine']);
  for (const [k, s] of Object.entries(SITES)) {
    if (SAFE.has(k) || s.camp) continue;   // (the camps are safe ground too: src/core/camps-data.js)
    assert.ok(LAIRS.some((l) => Math.hypot(l.x - s.x, l.z - s.z) < s.r + 320), `nothing lives near ${k}`);
  }
});

// ---- the posted, on the town's own thread ----
import { readFileSync } from 'node:fs';
import { parseGLB } from '../src/core/glb.js';
import { FolkClips, FolkRig } from '../src/folk/rig.js';
import { Ground } from '../src/folk/ground.js';
import { Town } from '../src/folk/town.js';
import { Life, ACT } from '../src/folk/brain.js';
import { Talk } from '../src/folk/talk.js';
import { terrainHeight } from '../src/core/terrain.js';

test('a day and a night at their posts: they stand where they were put, turn to whoever comes up, and never run or go to bed', () => {
  const R = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
  const J = (p) => JSON.parse(R(p));
  const AB = (p) => { const b = R(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
  const clips = new FolkClips(J('assets/game/folk/clips.json'), AB('assets/game/folk/clips.bin'));
  const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), folk = J('assets/game/folk/folk.json');
  for (const p of POSTED) { assert.ok(folk.models[p.body] || folk.swaps[p.body], `${p.id} has no body`); for (const c of p.idles) assert.ok(clips.clips[c], `${p.id}: no clip ${c}`); }
  const town = new Town(village, interior, J('assets/game/folk/spots.json'));
  const said = [];
  const life = new Life({ ground: new Ground(village, interior, [-80, -75, 110, 80]), town, clips, emit: () => {}, people: FOLK });
  const talk = new Talk(life, { lines: LINES, scenes: [], smalltalk: [] }, (e) => said.push(e));
  const rigs = new Map();
  for (const me of life.folk) {
    let m = me.p.body;
    if (!folk.models[m]) m = folk.swaps?.[m]?.base || (me.child ? 'boy_1' : 'worker');
    if (!rigs.has(m)) rigs.set(m, new FolkRig(parseGLB(AB(`assets/game/folk/${folk.models[m].glb}`)), clips, {}));
    life.setRig(me.i, rigs.get(m));
  }
  const posted = life.folk.filter((me) => me.posted);
  assert.equal(posted.length, POSTED.length);
  // (They come after the town's people, so nobody in Bellmourn has changed place in the buffer; and nobody's bed is theirs.)
  assert.deepEqual(life.folk.slice(0, PEOPLE.length).map((me) => me.id), PEOPLE.map((p) => p.id));
  for (const me of posted) assert.equal(me.bed, null);
  const dt = 1 / 20, who = life.byId.osric;
  // A day and a night, an hour a step and a little of each lived; a monster at the gate the whole while; then the clock
  // set back by hand (a sleep at the inn), which puts everyone where they'd be.
  for (const hour of [6, 9, 12, 15, 18, 21, 23.5, 2, 4.5, 8]) {
    const day = hour < 6 ? 1 : 0;
    for (let k = 0; k < 40; k++) life.update(dt, { hour, day, player: [0, 0, 0], dangers: [[who.x + 3, who.z]] });
    for (const me of posted) {
      const [x, z] = me.p.post;
      assert.ok(Math.hypot(me.x - x, me.z - z) < 0.01, `${me.id} has left their post at ${hour}`);
      assert.ok(Math.abs(me.y - (me.p.post[2] ?? terrainHeight(x, z))) < 0.01, `${me.id} isn't on the ground`);
      assert.equal(me.posture, 'stand'); assert.equal(me.act, ACT.IDLE); assert.equal(me.alarm, false);
      assert.ok(me.pose.clip, `${me.id} has no pose`);
    }
  }
  // Nobody of the town's has been sent out to them, or anywhere off the town's own ground.
  // (Phobos's street crowd's parked in the city till you're in it: tests/phobos-crowd.test.mjs.)
  for (const me of life.folk) if (!me.posted && !me.crowd) assert.ok(Math.hypot(me.x, me.z) < 400, `${me.id} is at ${me.x | 0}, ${me.z | 0}`);
  // Someone walks up: they look, and turn; and say something as you stand there.
  const at = [who.x + 1.8, who.y, who.z + 1.2];
  for (let k = 0; k < 200; k++) { life.update(dt, { hour: 10, day: 1, player: at, dangers: [] }); talk.update(dt, { player: at, cast: 0 }); }
  const want = Math.atan2(at[0] - who.x, at[2] - who.z);
  assert.ok(Math.abs(Math.atan2(Math.sin(who.yaw - want), Math.cos(who.yaw - want))) < 0.1, 'he has turned to you');
  assert.ok(who.look, 'he is looking at you');
  assert.ok(said.some((e) => e.type === 'say' && e.i === who.i), 'he says something');
  // And a word with him holds him as it holds anyone (src/folk/talk.js talkTo).
  talk.talkTo(who.i); talk.update(dt, { player: at, cast: 0 });
  assert.equal(who.talking, true);
  talk.talkTo(-1);
  // You go: he looks back the way he was put.
  for (let k = 0; k < 200; k++) life.update(dt, { hour: 10.1, day: 1, player: [0, 0, 0], dangers: [] });
  assert.ok(Math.abs(Math.atan2(Math.sin(who.yaw - who.p.face), Math.cos(who.yaw - who.p.face))) < 0.1, 'he has turned back');
  assert.equal(who.look, null);
});

test('every hub is led to: a quest from somewhere you already are sends you to each posted person, each hub and each dungeon', () => {
  // What can be come by starting from Bellmourn's own givers: a quest is open when its giver is one of the town's or someone
  // an open quest has already sent you to speak to, and whatever it needs is open too.
  const town = new Set(PEOPLE.map((p) => p.id)), met = new Set(), open = new Set();
  // (Standing within seventy paces of each other, out of any camp, in sight across one yard: the porter and the cook at
  // Khel's gate, a small town's three round its square. Not a whole site's width: two ends of a town aren't met at once.)
  const loose = (q) => q.post && !q.camp && !q.hub && !q.delve && !q.sewer;
  const beside = (p, q) => Math.hypot(p.post[0] - q.post[0], p.post[1] - q.post[1]) < 70;
  // (Rounds enough for the longest chain: Bellmourn to the Hollow Watch is five errands, then Blackvigil's five, then the Horn's.)
  for (let round = 0; round < 30; round++) {
    for (const id of Object.keys(RULES)) {
      if (open.has(id) || !QUESTS[id]) continue;
      const g = QUESTS[id].giver;
      if (!(town.has(g) || g === 'lisandra' || met.has(g)) || ![RULES[id].needs].flat().every((n) => !n || open.has(n))) continue;
      open.add(id);
      // (Sent to someone at a camp, you've met whoever else is posted there: its second, across the fire. And at one of the
      // land's places with more than one posted, a small town or Khel, whoever stands within seventy paces of them.)
      for (const st of RULES[id].steps) if (st.talk) {
        met.add(st.talk);
        const p = POSTED.find((q) => q.id === st.talk), c = p?.camp;
        if (c) for (const q of POSTED) if (q.camp === c) met.add(q.id);
        if (p && loose(p)) for (const q of POSTED) if (loose(q) && beside(p, q)) met.add(q.id);
      }
    }
  }
  // (Hubs whose errand in is another region's to write, and isn't written yet: Kestrel Hide's comes from Thornwick, with
  // the Gallows Road's quests. docs/QUEST-LOOP.md. Take each out of here when its errand is made.)
  const AWAITED = new Set(['kestrel']);
  const awaited = (pid) => AWAITED.has(POSTED.find((q) => q.id === pid)?.camp);
  for (const id of IDS) assert.ok(open.has(id) || awaited(QUESTS[id].giver), `${id} can't be come by from Bellmourn`);
  const steps = [...open].flatMap((id) => RULES[id].steps.map((st) => [id, st]));
  // Each person out in the land who gives work is someone a quest sends you to speak to, or stands at a hub with someone who
  // is (a camp's second and third: you meet them when you're sent to the first).
  const hubOf = (p) => (p.post ? Object.entries(SITES).find(([, q]) => Math.hypot(p.post[0] - q.x, p.post[1] - q.z) < q.r + 40)?.[0] : null);
  const ledTo = new Set(steps.map(([, st]) => st.talk).filter(Boolean));
  for (const p of [...POSTED.filter((q) => !q.firstVisit || q.id === 'fv_wenna'), ...BEYOND]) {
    const mates = POSTED.filter((q) => q !== p && hubOf(q) && hubOf(q) === hubOf(p));
    assert.ok(ledTo.has(p.id) || mates.some((q) => ledTo.has(q.id)) || p.delve || p.sewer || p.hub || awaited(p.id), `no quest leads to ${p.id}`);
  }
  // And each dungeon is somewhere a step sends you.
  for (const k of DELVES.filter((q) => !q.sewer && !q.castle).map((q) => q.key)) {
    assert.ok(steps.some(([, st]) => st.enter === k || BOSSES.find((b) => b.key === st.boss)?.delve === k), `no quest sends you to ${k}`);
  }
});
