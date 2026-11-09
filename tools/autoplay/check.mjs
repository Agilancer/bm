// Does auto-play know the whole game? Run after adding quests, quest steps, foes, monster groups, lairs, places, spells or
// shops:  node tools/autoplay/check.mjs
// Lists what src/ui/autobrain.js has no rule for (coverage()), and fails until it's taught. The same list is warned in the
// browser's console when auto-play starts.
import { readFileSync } from 'node:fs';
import { GROUP_KEYS } from '../../src/core/tripo-monsters.js';
import { coverage } from '../../src/ui/autobrain.js';

// The foes by kind, as src/main.js names them (it can't be imported here: it's the page's).
const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const list = main.match(/const FOE_NAMES = \[([\s\S]*?)\.\.\.GROUP_KEYS/);
const foeNames = list ? [...list[1].matchAll(/'([^']*)'/g)].map((m) => m[1]).concat(GROUP_KEYS) : null;
if (!foeNames) console.warn('FOE_NAMES not found in src/main.js: the foes by kind went unchecked.');

const gaps = coverage(foeNames);
if (!gaps.length) { console.log('Auto-play knows everything in the game: every quest and step, place, foe, lair, spell and shop.'); process.exit(0); }
console.log(`Auto-play doesn't know ${gaps.length} thing${gaps.length > 1 ? 's' : ''} in the game. Teach it in src/ui/autobrain.js:\n`);
for (const g of gaps) console.log(`  ${g}`);
process.exit(1);
