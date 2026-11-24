// A region's quests laid out to be read and judged (docs/QUEST-LOOP.md): each hub, who stands there, what's round it, the
// work it gives in the order a player comes to it, how far each piece of it takes you, and where it sends you next. Then
// the region walked through as auto-play would, with what that comes to in metres and fights.
//   node tools/quests/sheet.mjs <region> [--words]     (regions: tools/quests/regions.mjs; --words: every line of each quest)
import { RULES, outpostOf } from '../../src/folk/quests.js';
import { QUESTS } from '../../src/folk/lines/quests.js';
import { POSTED, PEOPLE } from '../../src/folk/people.js';
import { BEYOND } from '../../src/folk/lines/beyond.js';
import { CAMPS, DENS } from '../../src/core/camps-data.js';
import { SITES, countryAt, COUNTRIES } from '../../src/core/lands.js';
import { LAIRS } from '../../src/core/tripo-monsters.js';
import { OUTPOSTS, FINDS, TEAR_SPOTS } from '../../src/core/wilds-data.js';
import { FACTIONS } from '../../src/core/wilds.js';
import { DELVES } from '../../src/core/dungeon.js';
import { SEALS } from '../../src/core/sites.js';
import { lairLevelOf } from '../../src/ui/autobrain.js';
import { roadNear } from './spot.mjs';
import { table, violations, personHub, REGIONS, LOCAL } from './rules.mjs';
import { whereIs } from './geo.mjs';

const key = process.argv[2], words = process.argv.includes('--words');
const R = REGIONS.find((r) => r.key === key);
if (!R) { console.error(`node tools/quests/sheet.mjs <region>: ${REGIONS.map((r) => r.key).join(', ')}`); process.exit(2); }
const T = table(), m = (d) => `${Math.round(d)} m`;
const hubAt = (h) => (h === 'bellmourn' ? { x: 10, z: 0, name: 'Bellmourn', r: 80 } : SITES[h] ? SITES[h] : null);
const stepSay = (st) => {
  const at = (k) => (k.startsWith('outpost:') ? `${outpostOf(k.slice(8))?.name} (${k})` : k.startsWith('lair:') ? `the lair ${k.slice(5)} (level ${lairLevelOf(k.slice(5))})` : SITES[k]?.name || k);
  if (st.talk) return `a word with ${st.talk}${st.end ? ' (it ends there, and is paid there)' : ''}`;
  if (st.back) return 'back to the giver';
  if (st.start) return `take work from each of ${st.start.length} people`;
  if (st.bring) return `bring ${st.n} ${st.bring}${st.at ? ` from ${at(st.at)}` : ''}`;
  if (st.boss) return `kill the boss ${st.boss}`;
  if (st.clear) return `empty ${outpostOf(st.clear)?.name} (${st.clear}: ${outpostOf(st.clear)?.faction}, level ${FACTIONS[outpostOf(st.clear)?.faction]?.lvl})`;
  if (st.gather) return `gather ${st.n} ${st.what || 'things'} at ${at(st.gather)}`;
  if (st.kill) return `kill ${st.n}${st.foe ? ` ${st.foe.join('/')}` : st.of === 9 ? ' jellies' : ''} at ${at(st.kill)}`;
  if (st.warden) return "kill the bell's warden";
  if (st.visit) return `visit ${st.visit.map(at).join(', ')}`;
  if (st.enter) return `go to ${at(st.enter)}${st.night ? ' by night' : ''}`;
  return JSON.stringify(st);
};
const pay = (r) => [r.gold && `${r.gold} gold`, r.xp && `${r.xp} xp`, r.item && `a ${r.item}${r.named ? ` ("${r.named}")` : ''}`, r.charm && r.charmName].filter(Boolean).join(', ');

console.log(`# ${R.name}\n\nLevels about ${R.levels[0]} to ${R.levels[1]}. Hubs: ${R.hubs.filter((h) => T.some((q) => q.hub === h) || CAMPS.some((c) => c.key === h)).join(', ')}.\n`);
let walked = 0, quests = 0, kills = 0, longest = 0;
for (const hub of R.hubs) {
  const list = T.filter((q) => q.hub === hub).sort((a, b) => a.level - b.level), at = hubAt(hub), camp = CAMPS.find((c) => c.key === hub);
  if (!list.length && !camp) continue;
  console.log(`\n## ${at?.name || hub} (${hub})${camp ? `: a camp, ${camp.style}, its landmark a ${camp.mark}` : ''}`);
  if (at) {
    const rd = roadNear(at.x, at.z);
    console.log(`At ${Math.round(at.x)}, ${Math.round(at.z)}, ${COUNTRIES[countryAt(at.x, at.z)]?.name}; ${m(Math.hypot(at.x, at.z))} from Bellmourn; ${m(rd.d)} from ${rd.road.name} (a ${rd.road.cls}).`);
    const near = (list2, R2) => list2.map((q) => [q, Math.hypot(q.x - at.x, q.z - at.z)]).filter(([, d]) => d < R2).sort((a, b) => a[1] - b[1]);
    const seal = near(SEALS, 400)[0];
    if (seal) console.log(`A seal ${m(seal[1])} off (${seal[0].name}).`);
    const folk = [...POSTED.filter((p) => !p.delve && !p.sewer && Math.hypot(p.post[0] - at.x, p.post[1] - at.z) < (at.r || 30) + 60), ...(hub === 'belltower' ? BEYOND : [])];
    console.log(`People: ${hub === 'bellmourn' ? `${PEOPLE.length} townsfolk` : folk.map((p) => `${p.name} (${p.id}), ${p.title}${p.trade ? `, ${p.trade}` : ''}`).join('; ') || 'NOBODY'}.`);
    console.log(`Round it, within ${LOCAL} m:`);
    for (const [l, d] of near(LAIRS.filter((q) => !q.wild), LOCAL)) console.log(`  lair ${l.key}, level ${lairLevelOf(l.key)}, ${m(d)}: ${[...(l.boss || []), l.n ? `${l.n} of ${[...new Set((l.pick || []).map((p) => p.replace(/_\d+$/, '')))].join('/')}` : ''].filter(Boolean).join(' + ')}`);
    for (const [o, d] of near(OUTPOSTS, LOCAL)) console.log(`  ${o.pin ? `DEN ${o.key}` : 'outpost'} "${o.name}", ${o.faction} level ${FACTIONS[o.faction].lvl}, ${m(d)}${o.trail ? ', a trail to it' : ''}${o.pin ? `${T.some((q) => RULES[q.id].steps.some((s) => s.clear === o.key || [s.kill, s.gather, s.enter].includes(`outpost:${o.key}`))) ? '' : '  (no quest uses it yet)'}` : ''}`);
    for (const d of DELVES) if (d.portal && !d.within && Math.hypot(d.portal.x - at.x, d.portal.z - at.z) < LOCAL + 100) console.log(`  DUNGEON ${d.key} "${d.name}", level ${d.level}, its portal ${m(Math.hypot(d.portal.x - at.x, d.portal.z - at.z))} off`);
    console.log(`  and ${TEAR_SPOTS.filter((t) => Math.hypot(t[0] - at.x, t[1] - at.z) < LOCAL).length} places a tear can open, ${FINDS.filter((f) => Math.hypot(f[0] - at.x, f[1] - at.z) < LOCAL).length} small things to find.`);
  }
  const into = T.filter((q) => q.oneWay && q.to === hub && q.hub !== hub);
  console.log(into.length ? `You're sent here by: ${into.map((q) => `${q.id} (from ${q.hub}, level ${q.level}, ${m(q.far)})`).join('; ')}.` : hub === 'bellmourn' ? '' : "NOTHING SENDS YOU HERE.");
  console.log(`\n${list.length} quests:`);
  for (const q of list) {
    const r = RULES[q.id], Q = QUESTS[q.id];
    console.log(`\n- **${Q.title}** (${q.id}), level ${q.level}, from ${Q.giver}${r.needs ? `, after ${[].concat(r.needs).join(' and ')}` : ''}. ${q.oneWay ? `One way, to ${q.to}: ${m(q.far)}.` : `Furthest from the giver: ${m(q.far)}; walked in all: ${m(q.total)}.`} Pays ${pay(r)}.`);
    r.steps.forEach((st, i) => console.log(`    ${i + 1}. ${stepSay(st)}`));
    if (words) {
      for (const k of ['offer', 'accept', 'acceptLine', 'journal', 'progress', 'done', 'after']) if (Q[k]) console.log(`    ${k}: ${[].concat(Q[k]).map((l) => (typeof l === 'string' ? l : Array.isArray(l) ? l.join(': ') : l.say || JSON.stringify(l))).join(' | ')}`);
      if (Q.about) console.log(`    about: ${Q.about}`);
    }
    walked += q.total; quests++; longest = Math.max(longest, ...q.legs.map((l) => l.d));
    for (const st of r.steps) if (st.kill) kills += st.n; else if (st.clear) kills += 5; else if (st.boss) kills += 12;
  }
  const out = list.filter((q) => q.oneWay && q.to && q.to !== hub);
  if (list.length) console.log(`\nSends you on to: ${out.map((q) => `${q.to} (${q.id}, ${m(q.far)})`).join('; ') || 'nowhere'}.`);
}
if (words) {
  const ids = new Set(R.hubs.flatMap((h) => POSTED.filter((p) => personHub(p.id) === h && !p.hub).map((p) => p.id)));
  console.log(`\n## Who's posted in this region: ${[...ids].join(', ') || 'nobody yet'}`);
  for (const id of ids) { const w = whereIs(id), p = POSTED.find((q) => q.id === id); console.log(`- ${p.name}, ${p.title} (${id}; ${p.sex}, ${p.age}; body ${p.body}${p.trade ? `; ${p.trade}` : ''}) at ${w.where}`); }
}
console.log(`\n## The region as it plays\n${quests} quests; ${Math.round(walked / 100) / 10} km walked for them in all, ${quests ? Math.round(walked / quests) : 0} m a quest; about ${kills} things to kill; the longest single leg ${m(longest)}.`);
const v = violations(key);
console.log(v.length ? `\n## What breaks the loop's rules here (${v.length})\n${v.map((q) => `- [${q.rule}] ${q.hub}${q.quest ? ` / ${q.quest}` : ''}: ${q.say}`).join('\n')}` : "\nThe loop's rules hold here.");
