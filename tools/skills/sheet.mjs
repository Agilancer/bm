// The six trees as a sheet to read: every spell by tier, its numbers at ranks 1 and 5, what a rank adds, and its two branches.
//   node tools/skills/sheet.mjs > sheet.md
import { SPELLS } from '../../src/sim/spells.js';
import { MASTERY, MAX_RANK, NODES, RANK_DMG, STATS, TIER_LEVEL, TIER_POINTS, TREES, effective, pointsAt } from '../../src/sim/skills.js';

const line = (i, ranks) => { const d = effective(i, ranks); return STATS.filter(([f]) => typeof d[f] === 'number').map(([f, label, fmt]) => `${f === 'cd' && d.cast === 'buff' ? 'Ready again, once it ends, in' : label} ${fmt(d[f])}`).join(', '); };
console.log('# The six schools\n');
console.log(`Points: one a level past the first, one more at every fifth: ${[2, 5, 10, 15, 20, 30, 50].map((l) => `level ${l}: ${pointsAt(l)}`).join(', ')}.`);
console.log(`Tiers open at levels ${TIER_LEVEL.join(', ')}, and need ${TIER_POINTS.join(', ')} points already spent in the school. A spell has ${MAX_RANK} ranks; each past the first is +${RANK_DMG * 100}% to what it does, and what its row says. A spell's two branches are one or the other, and a branch's rank can't pass its spell's rank less one. Mastery: ${MASTERY.max} ranks, +${MASTERY.dmg * 100}% damage and -${MASTERY.mana * 100}% mana a rank for the school, after ${MASTERY.needs} points in it.\n`);
for (const t of TREES) {
  let ranks = 0;
  for (const n of t.spells) ranks += n.max - (n.tier === 0 ? 1 : 0) + Math.max(...n.augs.map((b) => b.max));
  console.log(`## ${t.name} (${t.mastery})\n\n${t.blurb} (${t.spells.length} spells; up to ${ranks + MASTERY.max} points to take all of it, one branch a spell.)\n`);
  for (let tier = 0; tier < TIER_LEVEL.length; tier++) {
    for (const n of t.spells.filter((q) => q.tier === tier).sort((a, b) => a.row - b.row)) {
      const d = SPELLS[n.spell];
      console.log(`### ${d.name}  (tier ${tier + 1}, level ${TIER_LEVEL[tier]}${n.req.length ? `; needs ${n.req.map((k) => SPELLS[NODES[k].spell].name).join(' or ')}` : '; known from the start'})\n`);
      console.log(`${d.desc} *${d.hands === 2 ? 'Two hands' : 'One hand'}${d.channel ? ', held' : ''}${d.gather ? ', gathered' : ''}.*\n`);
      console.log(`- Rank 1: ${line(n.spell, { [n.key]: 1 })}`);
      console.log(`- Rank 5: ${line(n.spell, { [n.key]: 5 })}`);
      n.augs.forEach((a, k) => console.log(`- ${k ? 'Or' : 'Branch'}, ${a.name} (${a.max} rank${a.max > 1 ? 's' : ''}): ${a.desc}`));
      console.log('');
    }
  }
}
