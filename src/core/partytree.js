// The Free Company's books for those you've hired: a skill tree for each class of the other Tessariels, kept with each of
// them on your roster (src/ui/party.js), spent by you in their book or by themselves (and by auto-play, Settings' Your
// party's skill points). Shared by the page (the book: src/ui/partybook.js) and the sim (src/sim/hero.js reads treeMods
// and moveRank), which make a hero's numbers from it the same way.
//
// Each class has three branches, made from its own moves (src/sim/hero.js SKILLS, src/sim/heroskills.js MORE_SKILLS):
//   the first   what it hits one thing with: its blows, shots and throws down a line
//   the second  what it does to a crowd: everything with an area
//   the third   how it keeps itself and you up and about: its leaps, dashes, guards, songs and heals
// A point buys one rank of one node:
//   a move      five ranks. The first lets them use it; each past it is RANK_DMG more of it, and more of what it makes
//               (more hammers, more bounces: heroskills.js rk). It needs their level to have reached the move's own, and so
//               many points already in its branch (movePoints). The moves a class starts with have their first rank free.
//   a passive   two a branch, up to twenty-five ranks: more damage, more life, less taken, shorter waits, more healing, life
//               drawn from blows. From level 3.
//   a capstone  one a branch, five ranks: every move in the branch the stronger. Twenty points in the branch and level 20.
// One point a level past the first, as you have yours (pointsAt): at level 200 that's nearly every rank in all three.
import { MORE_SKILLS } from '../sim/heroskills.js';
import { CLASS_NAMES } from './heroes.js';

export const MOVE_MAX = 5, PASSIVE_MAX = 25, CAP_MAX = 5;
export const RANK_DMG = 0.15;
export const pointsAt = (level) => Math.max(0, Math.round(level) - 1);
// Points a move wants in its branch first, by the level it's come by at.
export const movePoints = (lvl) => Math.max(0, Math.floor((lvl - 1) * 0.75));
export const CAP_POINTS = 20, CAP_LEVEL = 20, PASSIVE_LEVEL = 3, PASSIVE_POINTS = 0;

// The moves each class starts with (src/sim/hero.js SKILLS; tests/party-tree.test.mjs keeps the two the same), by name.
// kind: which branch it falls in.
export const FIRST_MOVES = {
  paladin: [['blessed_hammers', 'Blessed Hammers', 'crowd'], ['hammer_throw', 'Hammer Throw', 'hit'], ['smite', 'Smite', 'hit'], ['consecration', 'Consecration', 'crowd'], ['holy_light', 'Holy Light', 'keep']],
  lancer: [['charge', 'Charge', 'keep'], ['shield_wall', 'Shield Wall', 'keep'], ['shield_bash', 'Shield Bash', 'hit']],
  archer: [['rain_of_arrows', 'Rain of Arrows', 'crowd'], ['volley', 'Volley', 'crowd'], ['strafe', 'Strafe', 'hit']],
  rogue: [['vanish', 'Vanish', 'keep'], ['flurry', 'Flurry', 'hit']],
  ninja: [['shadow_step', 'Shadow Step', 'keep'], ['leaping_kick', 'Leaping Kick', 'keep'], ['throwing_stars', 'Throwing Stars', 'hit'], ['ninja_flurry', 'Flurry of Blades', 'hit']],
  dragoon: [['spear_barrage', 'Spear Barrage', 'hit'], ['jump', 'Jump', 'keep']],
  boomerang: [['double_throw', 'Double Throw', 'hit']],
  bard: [['war_song', 'War Song', 'keep'], ['marching_song', 'Marching Song', 'keep'], ['mending_song', 'Mending Song', 'keep']],
};

// Each class's three branches, by name, and the two passives in each: [key, name, what a rank gives].
// (Stats a passive raises: dmg, hp, ward (less taken), tempo (shorter waits), grace (healing done), thirst (life from blows).)
const P = {
  dmg: (n) => `+${(2 * n).toFixed(0)}% damage`, hp: (n) => `+${(3 * n).toFixed(0)}% life`, ward: (n) => `${(1.2 * n).toFixed(1)}% less damage taken`,
  tempo: (n) => `${n}% shorter waits between moves`, grace: (n) => `+${4 * n}% healing done`, thirst: (n) => `${(0.4 * n).toFixed(1)}% of damage dealt drawn back as life`,
};
export const PASSIVE_STAT = { dmg: 0.02, hp: 0.03, ward: 0.012, tempo: 0.01, grace: 0.04, thirst: 0.004 };
export const PASSIVE_TEXT = P;
const BR = (hit, crowd, keep) => ({ hit, crowd, keep });
const BRANCH_NAMES = {
  paladin: BR('Judgement', 'Radiance', 'Mercy'),
  lancer: BR('The Point', 'The Line', 'The Wall'),
  archer: BR('Marksman', 'Hail', 'Ranger'),
  rogue: BR('Knives', 'Shadows', 'Footwork'),
  ninja: BR('Stars', 'Storm', 'The Way'),
  dragoon: BR('The Spear', 'The Rain', 'The Sky'),
  boomerang: BR('The Edge', 'The Wind', 'The Return'),
  bard: BR('Chords', 'Crescendo', 'Songs'),
};
// The two passives of each kind of branch, and its capstone's name.
const BRANCH_KIT = {
  hit: { passives: [['dmg', 'Might'], ['thirst', 'Bloodthirst']], cap: 'Master of the Blow' },
  crowd: { passives: [['tempo', 'Tempo'], ['dmg', 'Fury']], cap: 'Master of the Crowd' },
  keep: { passives: [['hp', 'Toughness'], ['ward', 'Warding']], cap: 'Master of the Field' },
};
// A healer's third branch is for healing: grace in place of warding.
const HEAL_KEEP = { passives: [['hp', 'Toughness'], ['grace', 'Grace']], cap: 'Master of Mercy' };
const KIND_ORDER = ['hit', 'crowd', 'keep'];
// Which branch a later move goes in, by what it is.
const kindOf = (s) => (s.def || s.need && !s.range || s.move && !s.aoe || s.heal || s.song ? 'keep' : s.aoe ? 'crowd' : 'hit');

// The trees: TREES[cls] = [{ kind, name, nodes: [...] } x3]; NODES[cls][id] = a node. A node: { id, kind: 'move' | 'passive'
// | 'cap', branch (0-2), name, max, lvl (the level it opens at), pts (points in the branch it wants), key (a move's), stat
// (a passive's), first (a starting move) }.
export const TREES = {}, NODES = {};
for (const cls of CLASS_NAMES) {
  const firsts = (FIRST_MOVES[cls] || []).map(([key, name, kind]) => ({ key, name, kind, lvl: 1, first: true }));
  const more = (MORE_SKILLS[cls] || []).map((s) => ({ key: s.key, name: s.name, kind: kindOf(s), lvl: s.lvl || 1 }));
  const all = [...firsts, ...more];
  // (No branch left with fewer than three moves: the busiest gives up its latest.)
  for (const k of KIND_ORDER) {
    while (all.filter((m) => m.kind === k).length < 3) {
      const busiest = KIND_ORDER.filter((q) => q !== k).sort((a, b) => all.filter((m) => m.kind === b).length - all.filter((m) => m.kind === a).length)[0];
      const give = all.filter((m) => m.kind === busiest && !m.first).sort((a, b) => b.lvl - a.lvl)[0];
      if (!give || all.filter((m) => m.kind === busiest).length <= 3) break;
      give.kind = k;
    }
  }
  const healer = cls === 'paladin' || cls === 'bard';
  TREES[cls] = KIND_ORDER.map((kind, b) => {
    const kit = kind === 'keep' && healer ? HEAL_KEEP : BRANCH_KIT[kind];
    const moves = all.filter((m) => m.kind === kind).sort((x, y) => x.lvl - y.lvl)
      .map((m) => ({ id: m.key, kind: 'move', branch: b, name: m.name, max: MOVE_MAX, lvl: m.lvl, pts: m.first ? 0 : movePoints(m.lvl), key: m.key, first: !!m.first }));
    const passives = kit.passives.map(([stat, name]) => ({ id: `${kind}_${stat}`, kind: 'passive', branch: b, name, max: PASSIVE_MAX, lvl: PASSIVE_LEVEL, pts: PASSIVE_POINTS, stat }));
    const cap = { id: `${kind}_cap`, kind: 'cap', branch: b, name: kit.cap, max: CAP_MAX, lvl: CAP_LEVEL, pts: CAP_POINTS };
    return { kind, name: BRANCH_NAMES[cls][kind], nodes: [...moves, ...passives, cap] };
  });
  NODES[cls] = {};
  for (const br of TREES[cls]) for (const n of br.nodes) NODES[cls][n.id] = n;
}

// A tree's state, as kept: { ranks: { id: n }, auto: true (they spend their own) }. The starting moves' free first rank
// isn't in ranks: rank() adds it.
export const freshTree = () => ({ ranks: {}, auto: true });
export function rank(cls, tree, id) {
  const n = NODES[cls]?.[id];
  if (!n) return 0;
  return Math.min(n.max, (tree?.ranks?.[id] | 0) + (n.first ? 1 : 0));
}
export function spentIn(cls, tree, branch = -1) {
  let s = 0;
  for (const [id, r] of Object.entries(tree?.ranks || {})) { const n = NODES[cls]?.[id]; if (n && (branch < 0 || n.branch === branch)) s += r | 0; }
  return s;
}
export const pointsLeft = (cls, tree, level) => pointsAt(level) - spentIn(cls, tree);
// Why a point can't go in (a sentence), or '' if it can.
export function why(cls, tree, level, id) {
  const n = NODES[cls]?.[id];
  if (!n) return 'No such thing in their book.';
  if (rank(cls, tree, id) >= n.max) return 'As high as it goes.';
  if (pointsLeft(cls, tree, level) <= 0) return 'No points left: one comes with every level.';
  if (level < n.lvl) return `Opens at level ${n.lvl}.`;
  const inB = spentIn(cls, tree, n.branch);
  if (inB < n.pts) return `Wants ${n.pts} points in ${TREES[cls][n.branch].name} first (${inB} so far).`;
  return '';
}
export function spend(cls, tree, level, id) {
  if (why(cls, tree, level, id)) return false;
  tree.ranks[id] = (tree.ranks[id] | 0) + 1;
  return true;
}
// Everything back, for gold (src/ui/partybook.js): what it costs.
export const respecCost = (level, spent) => (spent > 0 ? 20 + level * 8 : 0);

// ---- what the sim reads ----------------------------------------------------------------------------------------------

// The tree's sums, for the sim: { dmg, hp, ward, tempo, grace, thirst } as fractions, and each move's rank and its power
// (1 at rank one; the branch's capstone on top). known: the moves they can use.
export function treeMods(cls, tree) {
  const out = { dmg: 0, hp: 0, ward: 0, tempo: 0, grace: 0, thirst: 0, moves: {}, known: [] };
  const caps = [0, 1, 2].map((b) => rank(cls, tree, `${KIND_ORDER[b]}_cap`));
  for (const br of TREES[cls] || []) {
    for (const n of br.nodes) {
      const r = rank(cls, tree, n.id);
      if (n.kind === 'passive') out[n.stat] += PASSIVE_STAT[n.stat] * r;
      else if (n.kind === 'move' && r > 0) { out.moves[n.key] = { rank: r, power: 1 + RANK_DMG * (r - 1) + 0.08 * caps[n.branch] }; out.known.push(n.key); }
    }
  }
  out.ward = Math.min(0.6, out.ward); out.tempo = Math.min(0.4, out.tempo);
  return out;
}

// ---- spent for them ----------------------------------------------------------------------------------------------------

// How each role spends: each move as it opens, first; then the role's passives and its moves to three; the capstones;
// then everything to the top. Healers lean on grace, tanks on life and warding, the rest on might.
const LEAN = {
  tank: ['keep_hp', 'keep_ward', 'hit_dmg', 'crowd_tempo', 'hit_thirst', 'crowd_dmg'],
  heal: ['keep_grace', 'keep_hp', 'crowd_tempo', 'hit_dmg', 'crowd_dmg', 'hit_thirst'],
  dps: ['hit_dmg', 'crowd_dmg', 'crowd_tempo', 'hit_thirst', 'keep_hp', 'keep_ward'],
};
export function autoSpend(cls, tree, level, role = 'dps') {
  let n = 0;
  const nodes = Object.values(NODES[cls] || {});
  const lean = (LEAN[role] || LEAN.dps).filter((id) => NODES[cls]?.[id]);
  const step = () => {
    // A move that's opened and not yet had.
    for (const q of nodes) if (q.kind === 'move' && rank(cls, tree, q.id) === 0 && spend(cls, tree, level, q.id)) return true;
    // The role's passives a few ranks ahead of its moves, its moves to three.
    const moveR = Math.min(...nodes.filter((q) => q.kind === 'move' && level >= q.lvl).map((q) => rank(cls, tree, q.id)), 9);
    for (const id of lean) if (rank(cls, tree, id) < Math.min(PASSIVE_MAX, 4 + moveR * 3) && spend(cls, tree, level, id)) return true;
    for (const q of nodes.filter((x) => x.kind === 'move').sort((a, b) => rank(cls, tree, a.id) - rank(cls, tree, b.id))) if (rank(cls, tree, q.id) < 3 && spend(cls, tree, level, q.id)) return true;
    for (const q of nodes) if (q.kind === 'cap' && spend(cls, tree, level, q.id)) return true;
    for (const q of nodes.filter((x) => x.kind === 'move').sort((a, b) => rank(cls, tree, a.id) - rank(cls, tree, b.id))) if (spend(cls, tree, level, q.id)) return true;
    for (const id of lean) if (spend(cls, tree, level, id)) return true;
    for (const q of nodes) if (spend(cls, tree, level, q.id)) return true;
    return false;
  };
  while (pointsLeft(cls, tree, level) > 0 && step()) n++;
  return n;
}
