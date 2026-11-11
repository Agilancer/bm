// What you've learned in the six trees (src/sim/skills.js): the rank of every node you've put a point in, and which spells
// came for nothing (the six you start with; any read from a scroll). It lives on the page beside the spell bar, is kept in
// the save with it, and is sent to the sim whenever it changes (onChange: src/main.js), which casts the spells with it.
import { SPELLS } from '../sim/spells.js';
import { NODES, STARTERS, blocked, canRead, effectiveAll, pointsAt, rankOf, respecCost, spent, startFree, startRanks } from '../sim/skills.js';

export class SkillBook {
  // level: () => your level now.
  constructor(level) {
    this.level = level;
    this.onChange = null;
    this.reset(true);
  }

  reset(quiet = false) {
    this.ranks = startRanks();
    this.free = new Set(startFree());
    this.bonus = 0;      // points given beyond what your level has earned (the Test Dungeon's stores)
    this.defs = null;
    if (!quiet) this.changed();
  }

  rank(id) { return rankOf(this.ranks, id); }
  /** Whether spell i (its place in SPELLS) can be cast. */
  known(i) { return this.rank(SPELLS[i]?.key) > 0; }
  /** Every spell you know, by its place in SPELLS. */
  knownSet() { const out = new Set(); SPELLS.forEach((d, i) => { if (this.ranks[d.key] > 0) out.add(i); }); return out; }
  get spent() { return spent(this.ranks, this.free); }
  get earned() { return pointsAt(this.level()) + this.bonus; }
  /** Points you have and haven't spent. */
  get points() { return Math.max(0, this.earned - this.spent); }
  /** Every spell's numbers as you cast it. */
  spells() { return (this.defs ||= effectiveAll(this.ranks)); }

  /** Why a point can't go into this node now, or null if it can. */
  why(id) {
    const no = blocked(this.ranks, this.free, this.level(), id);
    return no || (this.points > 0 ? null : 'No points to spend. Each level brings one, and every fifth another.');
  }

  /** Puts a point in. False if it can't go there. */
  spend(id) {
    if (this.why(id)) return false;
    this.ranks[id] = this.rank(id) + 1;
    this.changed();
    return true;
  }

  /** A scroll read: the spell's first rank, for nothing. False if you knew it, or aren't yet of a level to read it. */
  teach(i) {
    if (this.known(i) || !canRead(this.level(), i)) return false;
    const key = SPELLS[i].key;
    this.ranks[key] = 1; this.free.add(key);
    this.changed();
    return true;
  }
  canRead(i) { return canRead(this.level(), i); }

  get respecCost() { return respecCost(this.level(), this.spent); }
  /** Every point back. What a scroll taught stays known, at its first rank. */
  unlearn() {
    const kept = [...this.free];
    this.ranks = Object.fromEntries(kept.map((k) => [k, 1]));
    this.changed();
  }

  // A level taken away (the Test Dungeon's stores can do it) can leave more spent than earned: then everything's unlearned.
  fit() { if (this.spent > this.earned) this.unlearn(); }

  changed() { this.defs = null; this.onChange?.(); }

  /** More points to spend, for nothing (the Test Dungeon's stores). */
  give(n) { this.bonus += n; this.changed(); }
  /** Everything, for trying it out: every spell at its fifth rank, the first branch of each in full, every mastery. */
  learnAll() {
    for (const n of Object.values(NODES)) if (n.kind !== 'branch' || n.of.augs[0] === n) this.ranks[n.id] = n.max;
    for (const n of Object.values(NODES)) if (n.kind === 'branch' && n.of.augs[0] !== n) delete this.ranks[n.id];
    this.bonus = Math.max(this.bonus, this.spent - pointsAt(this.level()));
    this.changed();
  }

  save() { return { ranks: { ...this.ranks }, free: [...this.free], bonus: this.bonus }; }

  load(d) {
    this.reset(true);
    if (d && typeof d.ranks === 'object' && d.ranks) {
      if (d.bonus > 0) this.bonus = d.bonus | 0;
      for (const k of Array.isArray(d.free) ? d.free : []) if (NODES[k]?.kind === 'spell') this.free.add(k);
      for (const [id, r] of Object.entries(d.ranks)) { const n = NODES[id]; if (n && Number.isInteger(r) && r > 0) this.ranks[id] = Math.min(r, n.max); }
      // (A branch whose spell is gone, or both of a pair: out, and the points come back.)
      for (const id of Object.keys(this.ranks)) {
        const n = NODES[id];
        if (n.kind !== 'branch') continue;
        const other = n.of.augs.find((a) => a !== n);
        if (!(this.ranks[n.of.id] > 0) || (this.ranks[other.id] > 0 && other.id < id)) delete this.ranks[id];
      }
      for (const i of STARTERS) this.ranks[SPELLS[i].key] ||= 1;
    }
    this.fit();
    this.changed();
  }
}
