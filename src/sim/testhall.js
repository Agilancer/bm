// The Test Dungeon on the sim thread (src/core/testhall.js says where everything is): the mode on and off, the monsters stood
// in the arena when they're summoned, the door that opens on them and shuts again once they're all down, and a fall that
// stands you back at the hall's south end with the arena cleared.
//
// What can be summoned is the whole bestiary (src/core/testhall-foes.js lists it, by an id per kind): the Tripo monsters, one
// lair of their own per summoning (src/sim/tripo.js); the risen and the casters, out of the undead's own bodies
// (src/sim/undead.js); the slimes and the tumblers, camps of their own (src/sim/slimes.js, src/sim/tumblers.js); and the beasts
// that are one of a kind out in the world (the great crabs, the Gravehart, the Bone Hydra, the Abyssal Mouth, Velscour's
// knights), whose bodies are brought here with their ground moved under them, and sent home again after.
import { ARENA, DOOR, HALL, MUSTER, SPAWN, STATIONS, hallAt, hallDoorOpen, hallRoom, inArena, inDoorway, inHall, inLobby, setHallDoor } from '../core/testhall.js';
import { FIELD_CREATURES } from '../core/field-creatures.js';
import { INPUT } from '../core/layout.js';
import { OPENING } from '../core/opening.js';
import { Crab } from './crab.js';
import { FieldCreature } from './field-creature.js';
import { Gravehart } from './gravehart.js';
import { Hydra } from './hydra.js';
import { Knight } from './knight.js';
import { ELEM, FX } from './spells.js';
import { TripoMonster } from './tripo.js';
import { Caster, Zombie, huntPlayer } from './undead.js';

const RESPAWN_AFTER = 2.5;     // seconds fallen before you're stood back in the hall
const CLEAR_FOR = 1.2;         // seconds of nothing alive past the door before the fight's called won
const MUSTER_MOST = 8;         // seconds the door waits for the monsters' models to come in
const PASSABLE = 0.55;         // how far up the slab is before anything can pass under it

export class TestHall {
  constructor(sim) {
    this.sim = sim;
    this.on = false;
    this.state = 'shut';           // shut, muster, opening, open, clear, closing
    this.k = 0; this.want = 0;     // the door: 0 down, 1 up
    this.t = 0; this.clearT = 0; this.alertT = 0; this.postT = 0; this.deadT = 0;
    this.moved = [];               // the one-of-a-kind brought here: { k, home, pit }
    this.lairs = []; this.slimeCamp = null; this.tumblerCamps = [];
    this.summoned = 0; this.label = '';
    this.seq = 0;
  }

  // ---- on and off --------------------------------------------------------------------------------------------------------

  message(m) {
    if (m.cmd === 'enter') { this.on = true; this.clearArena(); this.standAtSpawn(); this.posts(); }
    else if (m.cmd === 'leave') this.leave();
    else if (m.cmd === 'summon') this.summon(m.list || [], m.id);
    else if (m.cmd === 'clear') { if (this.on) this.clearArena(); }
    // (For tests: everything past the door dropped where it stands. bm.hall('kill') in src/main.js.)
    else if (m.cmd === 'kill' && this.on) {
      const sim = this.sim;
      for (const k of sim.knights) if (!k.dead && inHall(k.x, k.z)) k.hp = 0;
      for (const s of [...sim.slimes.list, ...sim.tumblers.list]) if (!s.dead && inHall(s.x, s.z)) { s.hp = 0; s.die(sim); }
    }
    this.post(true);
  }

  leave() {
    if (!this.on) return;
    this.clearArena();
    this.on = false;
    const hw = this.sim.heroWorld;
    // (The quartermasters back to their own posts, src/core/dungeon.js BROKER_SPOTS; anyone else in here back to the town.)
    if (hw) for (const h of hw.heroes) {
      if (!inHall(h.x, h.z)) continue;
      if (h.broker) { const s = hw.postOf(h); hw.place(h, s[0], s[1]); continue; }
      if (h.hired) hw.dismiss(h.slot);
      const [x, z] = hw.postOf({ broker: 'town' });
      hw.place(h, x + 3 + Math.random() * 4, z + 3 + Math.random() * 4);
      hw.goHome(h);
    }
  }

  // The hall's people at their counters (src/sim/hero.js atPost asks postOf).
  postOf(broker) {
    if (!this.on) return null;
    const s = STATIONS.find((q) => q.who === broker);
    if (!s) return null;
    const [x, z] = hallAt(s.x, s.z);
    return [x, z, s.yaw];
  }

  posts() {
    const hw = this.sim.heroWorld;
    if (!hw) return;
    for (const h of hw.heroes) {
      const s = h.broker && this.postOf(h.broker);
      if (s) { hw.place(h, s[0], s[1], s[2]); h.hp = h.maxHp; }
    }
  }

  // You (and your party round you) at the hall's south end, looking up it at the door.
  standAtSpawn() {
    const sim = this.sim, p = sim.player, [x, z] = hallAt(SPAWN.x, SPAWN.z);
    p.x = x; p.z = z; p.y = sim.world.height(x, z); p.vx = p.vy = p.vz = 0; p.onGround = true; p.yaw = SPAWN.yaw; p.surfing = false;
    sim.input[INPUT.YAW] = SPAWN.yaw; sim.input[INPUT.PITCH] = 0;
    self.postMessage({ type: 'look', yaw: SPAWN.yaw, pitch: 0 });
    const hw = sim.heroWorld;
    if (hw) for (const h of hw.heroes) if (h.hired) { if (h.dead) hw.revive(h, 1); h.hp = h.maxHp; h.foe = null; hw.bringTo(h); }
  }

  // ---- a fall ----------------------------------------------------------------------------------------------------------

  // Before the world's started over: whatever was brought here goes home first, so the world's own reset finds it there.
  beforeRestart() {
    if (this.on) this.clearArena();
  }

  // After it (src/sim/sim.worker.js restart): the story's long over, and you're back in the hall.
  afterRestart() {
    if (!this.on) return;
    this.sim.opening?.restore({ opening: OPENING.ARRIVED, name: 'Tessariel', guide: [0, 0, 0, 0] });
    this.clearArena();
    this.standAtSpawn();
    this.posts();
  }

  // ---- the arena -------------------------------------------------------------------------------------------------------

  // Everything past the door gone, the door down and shut, the beasts that were brought here sent home.
  clearArena() {
    const sim = this.sim;
    this.sendHome();
    const t = sim.tripo;
    if (t) {
      for (const l of this.lairs) { t.sleep(l); l.state = 'cleared'; }
      t.lairs = t.lairs.filter((l) => !l.hall);
    }
    this.lairs.length = 0;
    // The undead that were stood here go back into the ground, as a new game has them.
    for (const k of sim.knights) if (k instanceof Zombie && inHall(k.x, k.z)) { k.reset(k.opts); k.y = sim.world.height(k.x, k.z); }
    sim.slimes.list = sim.slimes.list.filter((s) => !inHall(s.x, s.z));
    sim.slimes.camps = sim.slimes.camps.filter((c) => !c.hall);
    sim.tumblers.list = sim.tumblers.list.filter((s) => !inHall(s.x, s.z));
    sim.tumblers.camps = sim.tumblers.camps.filter((c) => !c.hall);
    this.slimeCamp = null; this.tumblerCamps.length = 0;
    this.state = 'shut'; this.k = 0; this.want = 0; setHallDoor(false);
    this.summoned = 0; this.label = '';
  }

  // The one-of-a-kind that were brought here back on their own ground, as they were (the Hydra's pit its own again).
  sendHome() {
    for (const mv of this.moved) {
      const k = mv.k;
      if (mv.pit) Object.assign(k.opts.pit, mv.pit);
      k.opts = mv.home;
      k.reset(k.opts);
      k.y = k.opts.pit ? k.opts.pit.y : this.sim.world.height(k.x, k.z);
    }
    this.moved.length = 0;
  }

  // Somewhere clear in the arena's far half for the nth of them, spiralling out from its middle.
  spot(n, r = 0.8) {
    const sim = this.sim;
    for (let t = 0; t < 40; t++) {
      const i = n + t * 7, a = i * 2.39996, d = Math.min(MUSTER.r, 1.4 * Math.sqrt(i + 0.5));
      const [x, z] = hallAt(MUSTER.x + Math.sin(a) * d, MUSTER.z + Math.cos(a) * d);
      if (hallRoom(x, z) > r + 0.6 && !sim.world.inside(x, z, r)) return [x, z];
    }
    return hallAt(MUSTER.x, MUSTER.z);
  }

  // A summoning: [{ id, n, opt }], all stood in the arena behind the door, and the door raised on them once they're in.
  summon(list, id) {
    const sim = this.sim;
    if (!this.on) return;
    if (this.state !== 'shut') {
      const why = { clear: 'Come back through the door first: it shuts behind you, then you can summon again.', closing: 'The door is coming down: summon again once it is shut.' };
      this.reply(id, 0, why[this.state] || 'The door is open on a fight already.');
      return;
    }
    const face = 0;   // (looking south, down the arena at the door)
    let n = 0, asked = 0;
    const names = [];
    for (const e of list) {
      const want = Math.max(1, Math.min(60, e.n | 0));
      asked += want;
      const got = this.spawn(e.id, want, e.opt || {}, n, face);
      if (got > 0) names.push(`${got} ${e.name || e.id}`);
      n += got;
    }
    if (!n) { this.reply(id, 0, 'Nothing came: every body of that kind is in use.'); return; }
    this.summoned = n; this.label = names.join(', ');
    this.state = 'muster'; this.t = 0; this.seq++;
    for (const [x, z] of this.flashes || []) sim.casting.burst(FX.FLARE, ELEM.ARCANE, x, HALL.y + 1, z, 0.6, 0.2, 0.6, { light: 5, lightR: 5 });
    this.flashes = null;
    this.reply(id, n, n < asked ? `${n} of ${asked} came: the rest of their kind are in use.` : '');
  }

  reply(id, n, note) { self.postMessage({ type: 'hallSummoned', id, n, note }); }

  flash(x, z) { (this.flashes ||= []).push([x, z]); }

  // n of one kind, from the nth place on. Returns how many came.
  spawn(id, n, opt, at, face) {
    const sim = this.sim, [kind, key] = id.split(':');
    let got = 0;
    if (kind === 'tripo') {
      const t = sim.tripo;
      if (!t || !t.roster[key]) return 0;
      const [x, z] = this.spot(at, 1.5);
      const free = t.slots().filter((k) => !(k instanceof TripoMonster) || k.dead || !inHall(k.x, k.z)).length - [...(t.claimed || [])].length;
      n = Math.min(n, Math.max(0, free));
      if (!n) return 0;
      const lair = { key: `hall_${this.seq}_${this.lairs.length}`, x, z, r: Math.min(MUSTER.r, 2 + n * 1.2), boss: [key], pick: [key], n: n - 1, pal: [opt.pal || 'Base'], wake: -1, tricks: true, state: 'asleep', at: -1e9, temp: true, hall: true, face,
        onSpawn: (m) => { m.opts.sight = 120; m.opts.leash = 300; m.home = [m.x, m.z]; } };
      t.lairs.push(lair); this.lairs.push(lair);
      t.wake(lair);
      this.flash(x, z);
      return n;
    }
    if (kind === 'undead') {
      const free = (k) => k instanceof Zombie && !k.opts.reserve && !inHall(k.x, k.z) && (k.dormant || k.dead || !k.aggro);
      const fits = {
        ogre: (k) => !(k instanceof Caster) && k.opts.model === 'zombie_ogre',
        necromancer: (k) => k.opts.role === 'necromancer', plaguebearer: (k) => k.opts.role === 'plaguebearer', wizard: (k) => k.opts.role === 'wizard',
      }[key] || ((k) => !(k instanceof Caster) && k.opts.model !== 'zombie_ogre');
      const bodies = sim.knights.filter((k) => free(k) && fits(k)).slice(0, n);
      for (const b of bodies) {
        const [x, z] = this.spot(at + got, 0.7);
        const type = b.opts.role ? undefined : key === 'ogre' ? 'runner' : ['shambler', 'runner', 'lurker'].includes(key) ? key : 'runner';
        b.reset({ ...b.opts, sleeper: false, type, spawn: [x, z], yaw: face + (Math.random() - 0.5) });
        b.y = sim.world.height(x, z); b.hostile = true; b.dormant = false;
        if (key === 'champion') { b.champion = true; b.hp = b.maxHp = b.hp * 5; b.dmgScale *= 1.8; b.pace *= 1.15; }
        this.flash(x, z);
        got++;
      }
      return got;
    }
    if (kind === 'slime') {
      const S = sim.slimes, room = 40 - S.list.length;
      n = Math.min(n, room);
      const species = S.speciesIndex(key);
      if (species < 0 || n <= 0) return 0;
      const camp = this.slimeCamp ||= S.addCamp({ x: hallAt(MUSTER.x, MUSTER.z)[0], z: hallAt(MUSTER.x, MUSTER.z)[1], r: MUSTER.r, hall: true });
      for (let i = 0; i < n; i++) { const [x, z] = this.spot(at + i, 1); S.spawn(camp, species, opt.size || 'M', x, z, sim); this.flash(x, z); }
      return n;
    }
    if (kind === 'tumbler') {
      const T = sim.tumblers;
      const k = T.kindIndex(key);
      if (k < 0) return 0;
      const [x, z] = this.spot(at, 1.2);
      if (T.isFlock(k)) { n = Math.min(n, 30); this.tumblerCamps.push(T.spawnFlock(x, z, n, sim)); this.flash(x, z); return n; }
      n = Math.min(n, 48 - T.list.length);
      const si = typeof opt.size === 'string' ? Math.max(0, ['S', 'M', 'L', 'XL'].indexOf(opt.size)) : opt.size ?? 1;
      for (let i = 0; i < n; i++) { const [sx, sz] = this.spot(at + i, 1.2); this.tumblerCamps.push(T.spawnOne(k, si, sx, sz, sim)); this.flash(sx, sz); }
      return Math.max(0, n);
    }
    // The one-of-a-kind: brought here, their ground with them.
    const bodies = this.uniques(kind === 'beast' ? key : id).filter((k) => !this.moved.some((mv) => mv.k === k)).slice(0, n);
    for (const k of bodies) {
      const [x, z] = this.spot(at + got, k instanceof Hydra ? 4 : 1.5);
      const home = k.opts, mv = { k, home, pit: null };
      const opts = { ...home, spawn: [x, z], yaw: face };
      if (k instanceof Knight) Object.assign(opts, { route: [[x, z], [x + 2, z]], leash: 300, keep: false, hostile: true });
      if (k instanceof Gravehart) Object.assign(opts, { lair: hallAt(0, ARENA.z0 + 4), territory: 90 });
      if (k instanceof Hydra) {
        mv.pit = { ...home.pit };
        const m = 3;
        Object.assign(home.pit, { y: HALL.y, x0: HALL.x + ARENA.x0 + m, x1: HALL.x + ARENA.x1 - m, z0: HALL.z + ARENA.z0 + m, z1: HALL.z + ARENA.z1 - m });
        Object.assign(opts, { lair: hallAt(0, ARENA.z0 + 6), territory: 70 });
      }
      k.opts = opts;
      k.reset(opts);
      k.y = opts.pit ? opts.pit.y : sim.world.height(x, z);
      k.hostile = true;
      this.moved.push(mv);
      this.flash(x, z);
      got++;
    }
    return got;
  }

  // The world's one-of-a-kind bodies, by the bestiary's key.
  uniques(key) {
    const ks = this.sim.knights;
    if (key === 'crab') return ks.filter((k) => k instanceof Crab);
    if (key === 'gravehart') return ks.filter((k) => k instanceof Gravehart);
    if (key === 'hydra') return ks.filter((k) => k instanceof Hydra);
    if (key === 'mouth') return ks.filter((k) => k instanceof FieldCreature && !(k instanceof TripoMonster) && k.opts.model === FIELD_CREATURES[0].model);
    if (key === 'black_knight') return ks.slice(0, 1).filter((k) => k instanceof Knight && k.kind === 0);
    if (key === 'west_knight') return ks.filter((k, i) => i > 0 && k instanceof Knight && k.kind === 0 && k.opts.suit === 'knight');
    return [];
  }

  // What's alive past the door: everything summoned, and whatever they've raised or split into since.
  alive() {
    const sim = this.sim;
    let n = 0;
    for (const k of sim.knights) if (!k.dead && !k.dormant && inHall(k.x, k.z)) n++;
    for (const s of sim.slimes.list) if (!s.dead && inHall(s.x, s.z)) n++;
    for (const s of sim.tumblers.list) if (!s.dead && inHall(s.x, s.z)) n++;
    const t = sim.tripo;
    if (t) for (const l of this.lairs) if (t.loading.has(l)) n++;
    return n;
  }

  // Every one of them set on you (and kept on you: a beast that's lost the scent is given it again).
  alert() {
    const sim = this.sim, p = sim.player;
    if (p.dead) return;
    for (const k of sim.knights) {
      if (k.dead || k.dormant || !inHall(k.x, k.z)) continue;
      if (k instanceof TripoMonster) { if (!k.aggro) k.notice(sim); }
      else if (k instanceof Zombie) huntPlayer(sim, k);
      else if (k instanceof FieldCreature) k.aggro = true;
      else if (k instanceof Knight) { k.hostile = true; }
    }
    for (const s of sim.slimes.list) if (!s.dead && inHall(s.x, s.z) && inArena(p.x, p.z)) s.aggro = true;
  }

  // ---- each tick -------------------------------------------------------------------------------------------------------

  step(dt) {
    if (!this.on) return;
    const sim = this.sim, p = sim.player;
    // Fallen: a moment, and you're back at the start.
    if (p.dead) { this.deadT += dt; if (this.deadT > RESPAWN_AFTER) { this.deadT = 0; sim.wantRestart = true; } return; }
    this.deadT = 0;
    // (Out of the hall somehow: started over, as a fall is.)
    if (!inHall(p.x, p.z)) { sim.wantRestart = true; return; }
    const was = this.k;
    this.k = this.want > this.k ? Math.min(1, this.k + dt / DOOR.open) : Math.max(0, this.k - dt / DOOR.open);
    if (this.want > 0 && this.k >= PASSABLE && !hallDoorOpen()) setHallDoor(true);
    this.t += dt;
    if (this.state === 'muster') {
      const loading = sim.tripo && this.lairs.some((l) => sim.tripo.loading.has(l));
      if (this.t > 0.8 && (!loading || this.t > MUSTER_MOST)) { this.state = 'opening'; this.want = 1; this.post(true); }
    } else if (this.state === 'opening') {
      if (this.k >= 1) { this.state = 'open'; this.clearT = 0; this.alertT = 0; this.alert(); }
    } else if (this.state === 'open') {
      if ((this.alertT -= dt) <= 0) { this.alertT = 1; this.alert(); }
      this.clearT = this.alive() ? 0 : this.clearT + dt;
      if (this.clearT > CLEAR_FOR) { this.state = 'clear'; this.t = 0; }
    } else if (this.state === 'clear') {
      // The door comes down once you're back on this side of it, and the way under it is clear.
      if (this.alive()) { this.state = 'open'; this.clearT = 0; }
      else if (inLobby(p.x, p.z) && !this.blocked()) {
        this.state = 'closing'; this.want = 0; setHallDoor(false); this.post(true);
        // (Any of your party still past it come to you.)
        const hw = sim.heroWorld;
        if (hw) for (const h of hw.heroes) if (h.hired && !h.dead && !inLobby(h.x, h.z)) hw.bringTo(h);
        this.clearDead();
      }
    } else if (this.state === 'closing') {
      if (this.k <= 0) { this.state = 'shut'; this.summoned = 0; this.label = ''; }
    }
    if (was !== this.k && (was === 0 || was === 1)) this.post(true);
    this.post(false);
  }

  // Anyone under the door.
  blocked() {
    const sim = this.sim;
    if (inDoorway(sim.player.x, sim.player.z, 0.8)) return true;
    return sim.heroes.some((h) => h.active && !h.dead && inDoorway(h.x, h.z, 1));
  }

  // Once the door's down on them, the dead are cleared away, and what was brought here goes home: a clean arena for the next.
  clearDead() {
    const sim = this.sim;
    this.sendHome();
    const t = sim.tripo;
    if (t) { for (const l of this.lairs) t.sleep(l); t.lairs = t.lairs.filter((l) => !l.hall); }
    this.lairs.length = 0;
    for (const k of sim.knights) if (k instanceof Zombie && k.dead && inHall(k.x, k.z)) { k.reset(k.opts); k.y = sim.world.height(k.x, k.z); }
    sim.slimes.camps = sim.slimes.camps.filter((c) => !c.hall); this.slimeCamp = null;
    sim.tumblers.camps = sim.tumblers.camps.filter((c) => !c.hall); this.tumblerCamps.length = 0;
  }

  // What the page needs, a few times a second: the door (src/gfx/renderer.js slides it) and the fight (src/ui/testhall.js).
  post(now) {
    if (!now && (this.postT -= 1 / 120) > 0) return;
    this.postT = 0.2;
    if (!this.on && !now) return;
    self.postMessage({ type: 'hall', on: this.on, state: this.state, want: this.want, k: this.k, alive: this.on ? this.alive() : 0, summoned: this.summoned, label: this.label });
  }
}
