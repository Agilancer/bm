// What breaks the quest loop's rules (docs/QUEST-LOOP.md; the rules themselves: tools/quests/rules.mjs).
//   node tools/quests/check.mjs            the whole game
//   node tools/quests/check.mjs <region>   one region's hubs (tools/quests/regions.mjs: bellmourn, downs, fen, deepwood,
//                                          rustwood, waste, moor, fells, gallows, east, phobos)
import { violations, REGIONS } from './rules.mjs';

const region = process.argv[2] || null;
if (region && !REGIONS.some((r) => r.key === region)) { console.error(`No region "${region}". They are: ${REGIONS.map((r) => r.key).join(', ')}.`); process.exit(2); }
const list = violations(region);
if (!list.length) { console.log(`The quest loop's rules hold${region ? ` in ${REGIONS.find((r) => r.key === region).name}` : ''}.`); process.exit(0); }
const by = {};
for (const v of list) (by[v.hub] ||= []).push(v);
for (const [hub, vs] of Object.entries(by)) { console.log(`\n${hub}`); for (const v of vs) console.log(`  [${v.rule}] ${v.quest ? `${v.quest}: ` : ''}${v.say}`); }
console.log(`\n${list.length} broken${region ? ` in ${region}` : ''}.`);
process.exit(1);
