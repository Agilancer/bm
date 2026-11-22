// How far every quest sends you: who gives it and where they stand, each leg of its work, the furthest it takes you from
// its giver, and whether you have to come back.
//   node tools/quests/report.mjs            every quest, the longest walks first
//   node tools/quests/report.mjs --hubs     the quests by where they're given, with each hub's totals
//   node tools/quests/report.mjs <where>    one hub's (bellmourn, thornwick, a camp's key...)
import { RULES } from '../../src/folk/quests.js';
import { QUESTS } from '../../src/folk/lines/quests.js';
import { questLevel } from '../../src/ui/autobrain.js';
import { walk } from './geo.mjs';

const arg = process.argv[2];
const rows = Object.keys(RULES).map(walk).filter(Boolean);
const m = (d) => `${Math.round(d)} m`.padStart(7);
const line = (r) => `${String(questLevel(r.id)).padStart(3)}  ${r.id.padEnd(28)} ${r.giver.padEnd(12)} far ${m(r.far)}  walk ${m(r.total)}  ${r.oneWay ? `-> ${r.ends?.where}` : 'and back'}  ${r.legs.map((l) => `${l.what} ${Math.round(l.d)}`).join(' | ')}`;
if (!arg) {
  rows.sort((a, b) => b.total - a.total);
  for (const r of rows) console.log(line(r));
  console.log(`\n${rows.length} quests; ${rows.filter((r) => !r.oneWay && r.far > 800).length} send you over 800 m from the giver and back; ${rows.filter((r) => r.from.where === 'bellmourn').length} are given in Bellmourn.`);
} else {
  const by = {};
  for (const r of rows) (by[r.from.where] ||= []).push(r);
  for (const [k, list] of Object.entries(by)) {
    if (arg !== '--hubs' && arg !== k) continue;
    list.sort((a, b) => questLevel(a.id) - questLevel(b.id));
    console.log(`\n== ${k}: ${list.length} quests, levels ${questLevel(list[0].id)}-${questLevel(list.at(-1).id)}, ${Math.round(list.reduce((n, r) => n + r.total, 0) / 100) / 10} km of walking in all`);
    for (const r of list) console.log(`  ${line(r)}   "${QUESTS[r.id].title}"`);
  }
}
