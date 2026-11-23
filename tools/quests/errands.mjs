// The long errands, and what's met on the way: every quest step that sends you to someone (a `talk`) 800 m or more from
// where the step before left you, and the longest stretch of its straight line with no lair within 250 m of it. Auto-play
// goes by a lair it's up to on such a walk (src/ui/autobrain.js viaLair); a walk with a kilometre of nothing is two
// minutes of riding. Fails (exit 1) on any errand with 600 m of line and nothing by it, or nothing of its level by it
// (within five below the quest's: what auto-play will fight, so goes by).
//   node tools/quests/errands.mjs [region] [--all]
// --all: every errand of 800 m, not only the failing. Each line: the quest, from and to, the length, the longest empty
// stretch (and the longest with nothing of the quest's level by it), and the lairs by the line (key and level; * one of
// the quest's level). A quest with no level (the city's, Phobos) is held only to the first.
import { RULES } from '../../src/folk/quests.js';
import { REGION_LEVELS } from '../../src/folk/regions/index.js';
import { LAIRS, lairLevel } from '../../src/core/tripo-monsters.js';
import { inDungeon } from '../../src/core/dungeon.js';
import { stepSpots, whereIs } from './geo.mjs';
import { QUESTS } from '../../src/folk/lines/quests.js';
import { REGIONS } from './regions.mjs';

const LONG = 800, NEAR = 250, GAP = 600;
const args = process.argv.slice(2), all = args.includes('--all'), only = args.find((a) => !a.startsWith('--'));
const LV = new Map(REGION_LEVELS);
const lairs = LAIRS.filter((l) => !inDungeon(l.x, l.z));
const regionOfQuest = (id) => { const g = whereIs(QUESTS[id]?.giver); const w = g?.where; return REGIONS.find((r) => r.hubs.includes(w))?.key || (w === 'phobos' ? 'phobos' : '?'); };

export function errands() {
  const out = [];
  for (const id of Object.keys(RULES)) {
    // (A door's a step through candles, not a walk: src/folk/first-visit.js.)
    if (!QUESTS[id] || RULES[id].door) continue;
    const g = whereIs(QUESTS[id].giver);
    if (!g) continue;
    let at = g;
    for (const st of RULES[id].steps) {
      for (const s of stepSpots(id, st)) {
        const d = s.down && s.down === at.down ? 0 : Math.hypot(s.x - at.x, s.z - at.z);
        if (st.talk && d >= LONG && !inDungeon(s.x, s.z) && !inDungeon(at.x, at.z)) out.push({ id, region: regionOfQuest(id), lvl: LV.get(id) ?? 0, from: { x: at.x, z: at.z }, to: { x: s.x, z: s.z }, who: st.talk, d, ...cover(at, s, LV.get(id) ?? 0) });
        at = s;
      }
    }
  }
  return out;
}
// The longest stretch of the line from a to b, in metres, with no lair within NEAR of it; and the lairs that are.
function cover(a, b, lvl) {
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 10);
  let run = 0, worst = 0, frun = 0, fworst = 0;
  const by = new Map(), fits = (l) => { const lv = lairLevel(l); return lv <= lvl && lv >= lvl - 5; };
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    let hit = false, fit = false;
    for (const l of lairs) if (Math.hypot(l.x - x, l.z - z) < NEAR) { hit = true; fit ||= fits(l); by.set(l.key, l); }
    run = hit ? 0 : run + d / n; worst = Math.max(worst, run);
    frun = fit ? 0 : frun + d / n; fworst = Math.max(fworst, frun);
  }
  const near = [...by.values()].map((l) => `${l.key}:${lairLevel(l)}${fits(l) ? '*' : ''}`);
  return { gap: worst, fitGap: fworst, near };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tools/quests/errands.mjs')) {
  const list = errands().filter((e) => !only || e.region === only).sort((p, q) => q.gap - p.gap);
  let bad = 0;
  for (const e of list) {
    const fail = e.gap >= GAP || (e.lvl > 0 && e.fitGap >= GAP);
    bad += fail;
    if (!fail && !all) continue;
    const r = (v) => Math.round(v);
    console.log(`${fail ? 'FAIL' : 'ok  '} ${e.region.padEnd(9)} ${e.id.padEnd(24)} L${String(e.lvl).padEnd(3)} (${r(e.from.x)},${r(e.from.z)}) -> ${e.who} (${r(e.to.x)},${r(e.to.z)})  ${r(e.d)} m, empty ${r(e.gap)} m (of its level ${r(e.fitGap)} m)  ${e.near.join(' ')}`);
  }
  console.log(`${list.length} errands of ${LONG} m or more; ${bad} with ${GAP} m of line and no lair (of its level) within ${NEAR} m.`);
  process.exit(bad ? 1 : 0);
}
