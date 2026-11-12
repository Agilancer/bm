// What the hero viewer (heroes.html) shows of each class's fighting, gathered from the game's own tables: the classes
// (src/core/heroes.js CLASSES), their ordinary blows by kit style (BLOWS), their moves (SKILLS in src/sim/hero.js and
// MORE_SKILLS in src/sim/heroskills.js), the words' gestures (GESTURES), and which clips each move plays
// (tools/heroes/viewer/move_clips.json, read from the code by hand). Writes tools/heroes/viewer/data.json.
//
//   node tools/heroes/viewer/data.mjs
//
// It fails if a move has no entry in move_clips.json, or names a clip the heroes' bank doesn't have: give it one (and say
// what the move does), then run it again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const { BLOWS, CLASSES, GESTURES, MOVES, PERSONAS } = await import('../../../src/core/heroes.js');
const { SKILLS } = await import('../../../src/sim/hero.js');
const { MORE_SKILLS } = await import('../../../src/sim/heroskills.js');
const table = JSON.parse(fs.readFileSync(path.join(here, 'move_clips.json'), 'utf8'));
const bank = JSON.parse(fs.readFileSync(path.join(root, 'assets/game/heroes/clips.json'), 'utf8')).clips;

const problems = [];
const title = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const clipsOf = (key) => {
  const t = table.skills[key];
  if (!t) { problems.push(`${key}: no entry in move_clips.json`); return { clips: [], desc: '' }; }
  for (const c of t.clips) if (!bank[c.clip]) problems.push(`${key}: clip ${c.clip} isn't in the heroes' bank`);
  return t;
};

const classes = {};
for (const [cls, c] of Object.entries(CLASSES)) {
  const skills = [];
  for (const s of SKILLS[cls] || []) skills.push({ key: s.key, name: title(s.key), cd: s.cd, lvl: 1, ...pick(clipsOf(s.key)) });
  for (const s of MORE_SKILLS[cls] || []) skills.push({ key: s.key, name: s.name || title(s.key), cd: s.cd, lvl: s.lvl ?? 1, ...pick(clipsOf(s.key)) });
  // (What the words call the rest: the class's ordinary blows, a kite, a catch, a backstab.)
  const extra = (MOVES[cls] || []).filter((k) => !skills.some((s) => s.key === k) && table.skills[k]);
  for (const k of extra) skills.push({ key: k, name: title(k), cd: null, lvl: 1, passive: true, ...pick(clipsOf(k)) });
  classes[cls] = { title: c.title, hp: c.hp, range: c.range, ranged: c.ranged, skills };
}
function pick(t) { return { clips: t.clips, desc: t.desc }; }

for (const [l, clip] of Object.entries(table.locomotion)) if (!bank[clip]) problems.push(`locomotion ${l}: clip ${clip} isn't in the heroes' bank`);
for (const [g, list] of Object.entries(GESTURES)) for (const clip of list) if (!bank[clip]) problems.push(`gesture ${g}: clip ${clip} isn't in the heroes' bank`);
for (const [style, list] of Object.entries(BLOWS)) for (const b of list) if (!bank[b.clip]) problems.push(`blow ${style}: clip ${b.clip} isn't in the heroes' bank`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
const out = { made: 'node tools/heroes/viewer/data.mjs', classes, blows: BLOWS, gestures: GESTURES, locomotion: table.locomotion, personas: Object.keys(PERSONAS) };
fs.writeFileSync(path.join(here, 'data.json'), JSON.stringify(out));
console.log(`data.json: ${Object.keys(classes).length} classes, ${Object.values(classes).reduce((n, c) => n + c.skills.length, 0)} moves`);
