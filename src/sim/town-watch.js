// Tessariel's town guard (src/core/knights.js, guard): the knights walking the town's streets and its edge. Whatever comes
// at anyone in the town or close outside it, the nearest of them leaves his beat to deal with it, and goes back to his beat
// when it's dead or gone. A man of Velscour's in plate counts once he's fighting someone that near: the black knight from
// the church, pulled out to the end of his leash, or the man-at-arms on the west road. Something big gets two.
//
// The guard can't be harmed by you or the other Tessariels, and never turns on either (Knight.keeper: casting.hurt,
// player.js castRay and bash, Knight.strike). Monsters and Velscour's men can cut him down; he's back on his feet at his
// beat a minute later.
import { townDist } from '../core/town.js';
import { floorAt, inPit } from '../core/interior.js';
import { Knight, S } from './knight.js';

export const WATCH = {
  every: 0.25,     // seconds between looks
  near: 14,        // metres out from the town's edge that anything hunting counts
  plate: 32,       // and for one of Velscour's knights in a fight (the black knight's leash from the church reaches about 26 out)
  letGo: 10,       // metres further out before the guard gives one up, so he doesn't turn at the line
  roam: 50,        // no guard follows anything further than this from the town
  big: 300,        // hp past which a thing gets two guards
  rise: 60,        // seconds a fallen guard lies before he's back at his beat
  mend: 8,         // hp a second a guard gets back once he's had no fight for mend seconds
};

export class TownWatch {
  constructor(sim) {
    this.sim = sim;
    this.guards = sim.knights.filter((k) => k.opts?.guard);
    this.t = 0;
    this.threats = [];
    this.log = [];
  }

  // Is m something the guard should be at? held: a guard is at it already (and lets it go only further out).
  threat(m, held) {
    if (!m || m.dead || m.dormant || m.hidden || m.hp <= 0 || m.below > 0 || m.kind === 1 || m.opts?.hero || m.opts?.guard) return false;
    if (m.opts?.pit || inPit(m.x, m.z) || floorAt(m.x, m.z) !== null) return false;
    const d = townDist(m.x, m.z), out = held ? WATCH.letGo : 0;
    if (m instanceof Knight) {
      // A knight of Velscour's: only once he's at someone (a guard included) that near, or inside the town itself. Standing
      // his post he's let be, however close it is (the man-at-arms keeps the west road, ten metres out).
      // (Once a guard's at him he stays at him while he's that near, even backing off home.)
      const busy = m.target && !m.target.dead && townDist(m.target.x, m.target.z) < WATCH.plate + out;
      return d < out || (busy && d < WATCH.plate + out) || (held && d < WATCH.plate);
    }
    const hunting = m.aggro ?? m.hostile;
    return !!hunting && d < WATCH.near + out;
  }

  step(dt) {
    const sim = this.sim;
    for (const g of this.guards) this.keep(g, dt);
    if ((this.t -= dt) > 0) return;
    this.t = WATCH.every;
    // Let go of what's done with, or gone too far.
    for (const g of this.guards) {
      const m = g.duty;
      if (!m) continue;
      const why = g.dead ? 'fell' : !g.keeper ? 'turned' : m.dead || m.hp <= 0 ? 'killed it' : townDist(g.x, g.z) > WATCH.roam ? 'too far out' : !this.threat(m, true) ? 'it went' : '';
      if (why) this.release(g, why);
    }
    // What's out there now, nearest the town first.
    const list = this.threats;
    list.length = 0;
    for (const m of sim.knights) if (this.threat(m, this.guards.some((g) => g.duty === m))) list.push(m);
    list.sort((a, b) => townDist(a.x, a.z) - townDist(b.x, b.z));
    for (const m of list) {
      const want = m.maxHp >= WATCH.big || m instanceof Knight ? 2 : 1;
      let have = 0;
      for (const g of this.guards) if (g.duty === m) have++;
      while (have < want) {
        let best = null, bd = Infinity;
        for (const g of this.guards) {
          if (g.dead || g.duty || !g.keeper) continue;
          const d = Math.hypot(g.x - m.x, g.z - m.z);
          if (d < bd) { bd = d; best = g; }
        }
        // (Nobody free: the second waits for one; the first takes the nearest even off another fight, if that one has two.)
        if (!best && have === 0) best = this.spare(m);
        if (!best) break;
        this.send(best, m);
        have++;
      }
    }
  }

  // A guard off a fight that has two on it, for one that has none.
  spare(m) {
    let best = null, bd = Infinity;
    for (const g of this.guards) {
      if (g.dead || !g.duty || !g.keeper) continue;
      let n = 0;
      for (const o of this.guards) if (o.duty === g.duty) n++;
      if (n < 2) continue;
      const d = Math.hypot(g.x - m.x, g.z - m.z);
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  }

  send(g, m) {
    g.duty = m;
    this.note(`${g.opts.suit || 'silver'} -> ${m.opts?.name || m.opts?.suit || m.opts?.model || m.constructor.name} at ${m.x.toFixed(0)},${m.z.toFixed(0)}`);
  }

  release(g, why = '') {
    const m = g.duty;
    g.duty = null;
    if (m && m.fixOn === g) m.fixOn = null;
    this.note(`${g.opts.suit || 'silver'} back to his beat (${why})`);
  }

  // Up again after a fall, and mended between fights.
  keep(g, dt) {
    const sim = this.sim;
    if (g.dead) {
      if (g.duty) this.release(g, 'fell');
      if (g.deadT > WATCH.rise) this.rise(g);
      return;
    }
    if (g.duty || g.target || g.state !== S.PATROL) { g.calmT = 0; return; }
    g.calmT = (g.calmT || 0) + dt;
    if (g.calmT > WATCH.mend && g.hp < g.maxHp) {
      g.hp = Math.min(g.maxHp, g.hp + WATCH.mend * dt);
      if (g.hp >= g.maxHp) g.bleeds.length = 0;
    }
    void sim;
  }

  // Back on his feet at the post of his beat furthest from where you are, so you don't see him stand up out of nothing.
  rise(g) {
    const p = this.sim.player, route = g.opts.route;
    let at = 0, far = -1;
    route.forEach(([x, z], i) => { const d = Math.hypot(x - p.x, z - p.z); if (d > far) { far = d; at = i; } });
    g.reset(g.opts);
    g.x = route[at][0]; g.z = route[at][1]; g.routeI = (at + 1) % route.length;
    g.y = this.sim.world.height(g.x, g.z);
    this.note(`${g.opts.suit || 'silver'} stands again at ${g.x},${g.z}`);
  }

  note(s) {
    this.log.push(`${this.sim.time.toFixed(1)} ${s}`);
    if (this.log.length > 40) this.log.shift();
  }
}
