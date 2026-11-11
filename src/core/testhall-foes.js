// Everything the Test Dungeon's keeper can summon (src/ui/testhall.js lists it, src/sim/testhall.js stands it in the arena),
// by an id per kind: 'tripo:<model>', 'undead:<kind>', 'slime:<species>', 'tumbler:<kind>', 'beast:<key>'. most: how many of
// it the world has bodies for at once; kinds that share their bodies (the risen, the Tripo monsters) share the count too.
// sizes: what it comes in, when it comes in more than one.
//
// Kept with the game: a new monster, kind or group is added here as it's added to the world, or the keeper can't call it.
// (node tools/testhall/check.mjs fails until every group, model, species and kind is in this list.)
import { FIELD_CREATURES } from './field-creatures.js';
import { GROUPS, GROUP_KEYS, MODEL_STATS, TRIPO_SLOTS, VARIANTS } from './tripo-monsters.js';
import { BODIES } from '../sim/undead.js';
import { SIZES, SPECIES } from '../sim/slimes.js';
import { TUMBLER_KINDS, TUMBLER_SIZES } from '../sim/tumblers.js';
import { MAX_SLIMES, MAX_TUMBLERS } from './layout.js';

const count = (model) => BODIES.filter((b) => b.model === model && !b.child).reduce((n, b) => n + b.count - (b.kept || 0), 0);
const RISEN = BODIES.filter((b) => /^zombie_\d$/.test(b.model) && !b.child).reduce((n, b) => n + b.count - (b.kept || 0), 0);
const title = (s) => s.toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase()).replace(/(?!^)\b(Of|The|And)\b/g, (w) => w.toLowerCase());

// The families, in the order the keeper's book has them.
export const FAMILIES = [
  { key: 'undead', name: 'The Risen and their Masters' },
  { key: 'beast', name: 'The Great Beasts and Knights' },
  ...GROUP_KEYS.map((g) => ({ key: `tripo:${g}`, name: g })),
  { key: 'slime', name: 'Slimes and Oozes' },
  { key: 'tumbler', name: 'Tumblers and Crows' },
];

export const UNDEAD = [
  { id: 'undead:shambler', name: 'Risen shambler', most: RISEN, note: 'Slow, and keeps coming.' },
  { id: 'undead:runner', name: 'Risen runner', most: RISEN, note: 'Quick on its feet: it runs you down.' },
  { id: 'undead:lurker', name: 'Risen lurker', most: RISEN, note: 'Lies as if dead till you come close.' },
  { id: 'undead:champion', name: 'Risen champion', most: RISEN, note: 'Five times the life, and hits near twice as hard.' },
  { id: 'undead:ogre', name: 'Ogre', most: count('zombie_ogre') },
  { id: 'undead:necromancer', name: 'Necromancer', most: count('necromancer'), note: 'Raises the fallen round it.' },
  { id: 'undead:plaguebearer', name: 'Plague-bearer', most: count('zombie_necromancer'), note: 'The necromancer of the plague, closer in.' },
  { id: 'undead:wizard', name: 'Wizard', most: count('evil_wizard'), note: 'Blinks from what you throw, and cages you.' },
];

export const BEASTS = [
  { id: 'beast:crab', name: 'Great crab', most: 3 },
  { id: 'beast:gravehart', name: 'The Gravehart', most: 1, note: 'Warns you off first.' },
  { id: 'beast:hydra', name: 'The Bone Hydra', most: 1, note: 'Too big for the door: go in to it. Its heads come off.' },
  { id: 'beast:mouth', name: title(FIELD_CREATURES[0].name), most: 1 },
  { id: 'beast:black_knight', name: "Velscour's knight, of the church steps", most: 1 },
  { id: 'beast:west_knight', name: "Velscour's man of the west road", most: 1 },
];

// The Tripo monsters, from roster.json (with the Warrens' bosses: withVariants), by their group.
export function tripoFoes(roster) {
  const list = Object.entries(roster).map(([id, m]) => {
    const g = GROUPS[m.group] || GROUPS.Goblins, own = MODEL_STATS[id] || {}, v = VARIANTS[id];
    const base = title(own.name || v?.name || g.name);
    // (The rank and file of a group are told apart by what the model's called, less the words its name has already.)
    const words = new Set(base.toLowerCase().split(/[\s-]+/).flatMap((w) => [w, w.replace(/s$/, '')]));
    const joined = base.toLowerCase().replace(/[\s-]+/g, '');
    const tail = id.split('_').filter((w) => w !== 'hf' && w !== 'zombie' && w !== joined && !words.has(w)).join(' ');
    return { id: `tripo:${id}`, family: `tripo:${m.group}`, name: base, tail, named: !!(own.name || v), most: TRIPO_SLOTS, hp: own.hp || g.hp, pal: true, boss: !!v };
  });
  for (const f of list) {
    const twin = list.some((o) => o !== f && o.name === f.name);
    if (f.tail && (!f.named || twin)) f.name = `${f.name} (${f.tail})`;
    delete f.tail; delete f.named;
  }
  return list;
}

export const SLIMES = SPECIES.map((s) => ({ id: `slime:${s.key}`, name: s.name, most: MAX_SLIMES, sizes: Object.keys(SIZES), size: 'M', note: s.splits?.length ? `The ${s.splits.join(' and ')} split when they burst.` : '' }));
export const TUMBLERS = TUMBLER_KINDS.filter((k) => !k.mother).map((k) => (k.fly
  ? { id: `tumbler:${k.key}`, name: `${k.name}s, with their Crowmother`, most: 30, note: 'A flock: how many is how many crows.' }
  : { id: `tumbler:${k.key}`, name: k.name, most: MAX_TUMBLERS, sizes: Object.keys(TUMBLER_SIZES), size: 'M' }));

// The whole list, each with its family: what the keeper's book shows.
export function hallFoes(roster) {
  return [
    ...UNDEAD.map((f) => ({ ...f, family: 'undead' })),
    ...BEASTS.map((f) => ({ ...f, family: 'beast' })),
    ...tripoFoes(roster),
    ...SLIMES.map((f) => ({ ...f, family: 'slime' })),
    ...TUMBLERS.map((f) => ({ ...f, family: 'tumbler' })),
  ];
}
