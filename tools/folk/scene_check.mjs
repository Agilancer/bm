// Which of the overheard scenes (src/folk/lines/scenes.js) can ever play: the town's day is run without drawing it, as
// tools/folk/life_test.mjs runs it, and every half second each scene is tried the way src/folk/talk.js tries it (its cast free,
// within 4.5 m of their middle, the right time of day, the right sort of place), with the player taken to be close by and every
// quest and arrival it waits on taken to have happened. What's counted is how often, and for how long, each could have begun.
//   node tools/folk/scene_check.mjs [days=1] [startHour=5]
// Prints the scenes that never could, with what kept them from it, then a count of the rest. Small talk is left out.
import { readFileSync } from 'node:fs';
import { parseGLB } from '../../src/core/glb.js';
import { FolkClips, FolkRig } from '../../src/folk/rig.js';
import { Ground } from '../../src/folk/ground.js';
import { Town } from '../../src/folk/town.js';
import { Life, ACT } from '../../src/folk/brain.js';
import { Talk } from '../../src/folk/talk.js';
import { partOfDay } from '../../src/folk/days.js';
import { SCENES } from '../../src/folk/lines/scenes.js';

const R = (p) => readFileSync(new URL(`../../${p}`, import.meta.url));
const J = (p) => JSON.parse(R(p));
const village = J('assets/game/village.json'), interior = J('assets/game/interior/interior.json'), spots = J('assets/game/folk/spots.json');
const folk = J('assets/game/folk/folk.json');
const bin = R('assets/game/folk/clips.bin');
const clips = new FolkClips(J('assets/game/folk/clips.json'), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const ground = new Ground(village, interior, [-80, -75, 110, 80]);
const town = new Town(village, interior, spots);
const life = new Life({ ground, town, clips, emit: () => {} });
const rigs = new Map();
for (const me of life.folk) {
  let m = me.p.body;
  if (!folk.models[m]) m = folk.swaps?.[m]?.base || folk.swaps?.[m]?.model || (me.child ? 'boy_1' : 'worker');
  if (!rigs.has(m)) { const b = R(`assets/game/folk/${folk.models[m].glb}`); rigs.set(m, new FolkRig(parseGLB(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)), clips)); }
  life.setRig(me.i, rigs.get(m));
}
// The director, as the game has it, for its tests of who's free and where they are.
const talk = new Talk(life, { lines: {}, scenes: SCENES, smalltalk: [] }, () => {});
const ACTS = Object.fromEntries(Object.entries(ACT).map(([k, v]) => [v, k.toLowerCase()]));

const days = +(process.argv[2] || 1), start = +(process.argv[3] || 5);
const missing = SCENES.filter((sc) => sc.who.some((id) => !life.byId[id]));
for (const sc of missing) console.log(`scene ${sc.id}: nobody called ${sc.who.filter((id) => !life.byId[id]).join(', ')}`);

// Per scene: seconds it could have begun, how many separate times, and for the ones that never could, what stopped it.
const stat = new Map(SCENES.map((sc) => [sc.id, { secs: 0, times: 0, on: false, best: Infinity, bestAt: '', why: {} }]));
const STEP = 0.5;
let hour = start, day = 0, elapsed = 0, acc = 0;
const dt = 1 / 20;
const t0 = performance.now();
while (elapsed < days * 24) {
  const rate = hour >= 6 && hour < 20 ? 180 : 60;
  const dh = dt / rate;
  hour += dh; elapsed += dh;
  if (hour >= 24) { hour -= 24; day++; }
  life.update(dt, { hour, day, player: [-200, 0, -200], dangers: [] });
  if ((acc += dt) < STEP) continue;
  acc -= STEP;
  const part = partOfDay(hour);
  for (const sc of SCENES) {
    const s = stat.get(sc.id);
    const who = sc.who.map((id) => life.byId[id]);
    let why = null;
    if (who.some((o) => !o)) why = 'cast';
    else if (sc.when && sc.when !== 'any' && sc.when !== part) why = null;   // (not its time: not counted against it)
    else {
      const cx = who.reduce((a, o) => a + o.x, 0) / who.length, cz = who.reduce((a, o) => a + o.z, 0) / who.length;
      const spread = Math.max(...who.map((o) => Math.hypot(o.x - cx, o.z - cz)));
      // How near they came to being together, in its hours: the furthest of them from their middle, and where they each were.
      if (spread < s.best) { s.best = spread; s.bestAt = `${String(Math.floor(hour)).padStart(2)}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')} ` + who.map((o) => `${o.id} ${ACTS[o.act]}${o.house >= 0 ? `@${town.houses[o.house].key}` : ''}`).join(', '); }
      if (!who.every((o) => talk.free(o, true))) why = 'busy';
      else if (spread > 4.5) why = 'apart';
      else if (!talk.where(sc, who)) why = 'place';
      else why = 'ok';
    }
    if (why === 'ok') { s.secs += STEP; if (!s.on) s.times++; s.on = true; } else { s.on = false; if (why) s.why[why] = (s.why[why] || 0) + STEP; }
  }
}
console.log(`ran ${days} day${days > 1 ? 's' : ''} from ${start}:00 in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
const never = SCENES.filter((sc) => !stat.get(sc.id).times);
console.log(`\nnever could play: ${never.length} of ${SCENES.length}`);
for (const sc of never) {
  const s = stat.get(sc.id);
  const why = Object.entries(s.why).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)}s`).join(', ');
  console.log(`  ${sc.id.padEnd(24)} ${(sc.when || 'any').padEnd(8)} ${(sc.where || 'any').padEnd(7)} [${sc.who.join(' ')}]`);
  console.log(`      ${why || 'never its time'}; closest ${s.best === Infinity ? '-' : `${s.best.toFixed(1)} m at ${s.bestAt}`}`);
}
const some = SCENES.filter((sc) => stat.get(sc.id).times).sort((a, b) => stat.get(a.id).times - stat.get(b.id).times);
console.log(`\ncould play: ${some.length} of ${SCENES.length} (times a day; seconds a day)`);
for (const sc of some) { const s = stat.get(sc.id); console.log(`  ${sc.id.padEnd(24)} ${String(Math.round(s.times / days)).padStart(4)}  ${String(Math.round(s.secs / days)).padStart(6)}s`); }
