// Does the Test Dungeon hold together, and can its keeper summon everything in the game?   node tools/testhall/check.mjs
//   - the hall (src/core/testhall.js): every counter and its keeper's place in the open and walked to from where you start;
//     the arena shut off while the door's down, and walked into once it's up, by the biggest monster there is; the ceilings
//     under the line the shaders call underground; its box clear of the world and of the Hollowfang Warrens.
//   - the bestiary (src/core/testhall-foes.js): every Tripo model, group, slime, tumbler, undead body and one-of-a-kind beast
//     in the game has a line in the keeper's book. Fails until a new monster's added there.
//   - the stores (src/ui/testhall.js): no V and no T on its shelves (CLAUDE.md).
import { readFileSync } from 'node:fs';
import { ARENA, DOOR, HALL, HALL_BOX, HallNav, LOBBY, MUSTER, SPAWN, STATIONS, hallAt, hallRoom, hallRoofY, setHallDoor } from '../../src/core/testhall.js';
import { BEASTS, FAMILIES, UNDEAD, hallFoes } from '../../src/core/testhall-foes.js';
import { GROUP_KEYS, withVariants } from '../../src/core/tripo-monsters.js';
import { FIELD_CREATURES } from '../../src/core/field-creatures.js';
import { TOWN_KNIGHTS } from '../../src/core/knights.js';
import { DUNGEON_BOX } from '../../src/core/dungeon.js';
import { WORLD_EDGE } from '../../src/core/lands.js';
import { BODIES } from '../../src/sim/undead.js';
import { SPECIES } from '../../src/sim/slimes.js';
import { TUMBLER_KINDS } from '../../src/sim/tumblers.js';
import { SHIELDS } from '../../src/items/items.js';

let bad = 0;
const fail = (m) => { console.log('FAIL', m); bad++; };

// ---- the hall
const [sx, sz] = hallAt(SPAWN.x, SPAWN.z);
setHallDoor(false);
const nav = new HallNav();
if (hallRoom(sx, sz) < 1.5) fail(`where you start is ${hallRoom(sx, sz).toFixed(2)} m from a wall`);
for (const s of STATIONS) {
  const [ax, az] = hallAt(s.at[0], s.at[1]), [nx, nz] = hallAt(s.x, s.z);
  if (hallRoom(ax, az) < 0.5) fail(`${s.key}: where you stand to talk is in or against a wall (${hallRoom(ax, az).toFixed(2)})`);
  if (hallRoom(nx, nz) < 0.5) fail(`${s.key}: its keeper's place is in or against a wall (${hallRoom(nx, nz).toFixed(2)})`);
  const d = nav.walkDist(sx, sz, ax, az, 0);
  if (!Number.isFinite(d)) fail(`${s.key}: can't be walked to from where you start`);
  console.log(`  ${s.key.padEnd(6)} walk ${Number.isFinite(d) ? d.toFixed(0) : '∞'} m, keeper ${Math.hypot(ax - nx, az - nz).toFixed(1)} m over the counter`);
}
const [mx, mz] = hallAt(MUSTER.x, MUSTER.z);
if (Number.isFinite(nav.walkDist(mx, mz, sx, sz, 1))) fail('the arena can be walked out of with the door down');
setHallDoor(true);
const open = nav.walkDist(mx, mz, sx, sz, 2);
if (!Number.isFinite(open)) fail("the arena can't be walked out of with the door up");
const [dx, dz] = hallAt((DOOR.x0 + DOOR.x1) / 2, (DOOR.z0 + DOOR.z1) / 2);
if (hallRoom(dx, dz) < 1.9) fail(`the doorway is too narrow for the biggest monster (${hallRoom(dx, dz).toFixed(2)} m half-width, want 1.9)`);
setHallDoor(false);
console.log(`  arena to the hall, door up: ${open.toFixed(0)} m`);
for (const r of [LOBBY, ARENA]) if (HALL.y + r.roof > HALL_BOX.y1 || HALL.y + r.roof > -6) fail(`a ceiling at ${HALL.y + r.roof}, above the underground line`);
if (hallRoofY(dx, dz) - HALL.y < 6) fail(`the doorway is only ${(hallRoofY(dx, dz) - HALL.y).toFixed(1)} m high`);
if (Math.min(Math.abs(HALL_BOX.x0), Math.abs(HALL_BOX.x1)) < WORLD_EDGE && Math.min(Math.abs(HALL_BOX.z0), Math.abs(HALL_BOX.z1)) < WORLD_EDGE) fail('the hall is inside the world');
if (HALL_BOX.x0 < DUNGEON_BOX.x1 && HALL_BOX.x1 > DUNGEON_BOX.x0 && HALL_BOX.z0 < DUNGEON_BOX.z1 && HALL_BOX.z1 > DUNGEON_BOX.z0) fail('the hall overlaps the Hollowfang Warrens');

// ---- the bestiary
const roster = withVariants(JSON.parse(readFileSync(new URL('../../assets/monsters/tripo/roster.json', import.meta.url), 'utf8')));
const foes = hallFoes(roster), ids = new Set(foes.map((f) => f.id));
for (const id of Object.keys(roster)) if (!ids.has(`tripo:${id}`)) fail(`Tripo model ${id}: not in the keeper's book`);
for (const g of GROUP_KEYS) if (!FAMILIES.some((f) => f.key === `tripo:${g}`)) fail(`monster group ${g}: no family in the book`);
for (const s of SPECIES) if (!ids.has(`slime:${s.key}`)) fail(`slime ${s.key}: not in the book`);
for (const k of TUMBLER_KINDS) if (!k.mother && !ids.has(`tumbler:${k.key}`)) fail(`tumbler ${k.key}: not in the book`);
const UNDEAD_OF = { zombie_ogre: 'ogre', necromancer: 'necromancer', zombie_necromancer: 'plaguebearer', evil_wizard: 'wizard' };
for (const b of BODIES) {
  const key = /^zombie_\d$/.test(b.model) ? 'shambler' : UNDEAD_OF[b.model];
  if (!key || !UNDEAD.some((u) => u.id === `undead:${key}`)) fail(`undead body ${b.model}: nothing in the book summons it`);
}
if (FIELD_CREATURES.length !== 1 || !BEASTS.some((b) => b.id === 'beast:mouth')) fail('a field creature the book has no line for (src/core/field-creatures.js)');
const hostileKnights = TOWN_KNIGHTS.filter((k) => k.hostile).length;
if (hostileKnights !== 1 || !BEASTS.some((b) => b.id === 'beast:west_knight')) fail(`${hostileKnights} hostile town knights: the book summons one (beast:west_knight in src/sim/testhall.js uniques)`);
for (const f of foes) if (!FAMILIES.some((q) => q.key === f.family)) fail(`${f.id}: in no family of the book`);
console.log(`  the book: ${foes.length} kinds in ${FAMILIES.length} families`);

// ---- the stores: what src/ui/testhall.js stocks
const ui = readFileSync(new URL('../../src/ui/testhall.js', import.meta.url), 'utf8');
if (!/PLAIN_SHIELDS = Object\.keys\(SHIELDS\)\.filter\(\(b\) => !SHIELDS\[b\]\.side\)/.test(ui)) fail("the stores' shields aren't kept to those with no V or T");
console.log(`  the stores: ${Object.keys(SHIELDS).filter((b) => !SHIELDS[b].side).length} shields, none of them V or T`);

if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log('The Test Dungeon holds together, and its keeper knows every monster in the game.');
