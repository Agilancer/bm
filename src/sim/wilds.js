// The living land on the sim thread (src/core/wilds.js says who and what; src/core/wilds-data.js where).
//
// - The sides at war: where monsters of two sides that aren't at truce are awake within sight of each other, each takes the
//   nearest of the other as its mark (m.rival, read by foeOf in src/sim/foes.js) and they fight it out. You're left alone
//   unless you hurt one or walk into it; what's left of the winners turns on you. Nothing they kill leaves you anything.
// - The outposts: lairs like any other (they're in LAIRS). Here it's only noticed when you first come on one, and when its
//   last defender falls, so the page can say so and pay you.
// - Tears: a share of the land's tear spots are open at any time, and turn over. Walk up to one and what's behind it comes
//   through in waves: a first, a second under a leader, a bonus wave against the clock if you were quick, then its lord
//   (every third one sealed, a colossus). Leave, or die, and it's lost and waits for you.
// - Meetings: walk a while with nothing about and something is stood ahead of you: a pack on the prowl, two sides in a
//   skirmish, a warband on the road, a named chief, a ritual to stop before it's done, two sorcerers duelling, a drake.
// - Things to find: each small thing in FINDS glints until you walk up to it, once.
//
// Everything stood up here is a temp lair of TripoWorld's (src/sim/tripo.js): the twelve slots are all there are, so
// nothing is rolled while they're busy.
import { EV } from '../core/layout.js';
import { OPENING } from '../core/opening.js';
import { townDist } from '../core/town.js';
import { SITES, countryAt, routeDist, siteAt, waterAt } from '../core/lands.js';
import { COUNTRY_FACTIONS, FACTIONS, FACTION_KEYS, MEET, MEETINGS, TEAR, TEARS_KINDS, WILD, atWar } from '../core/wilds.js';
import { FINDS, OUTPOSTS, TEAR_SPOTS } from '../core/wilds-data.js';
import { ELEM, FX } from './spells.js';
import { TripoEmpty, TripoMonster } from './tripo.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const CASTER = /caller|warlock|witch|seer|mancer|sorcerer|zealot|nurse|shaman|lord|magister|hierophant/;
const HOLY = Object.values(SITES).filter((s) => s.portal || s.light);
// How hard the land is at (x, z): easy by Bellmourn, hard at the rim.
export const wildLevel = (x, z) => clamp(Math.round(3 + Math.hypot(x, z) / 270), 4, 22);

export class Wilds {
  constructor(sim) {
    this.sim = sim;
    this.byKey = new Map();
    this.reset();
  }

  reset() {
    this.clock = 0; this.half = 0;
    this.found = new Set(); this.taken = new Set(); this.clearedAt = new Map();
    this.sealedAt = new Map(); this.sealed = 0;
    this.near = -1;          // the open tear in sight, its place in TEAR_SPOTS
    this.tear = null;        // the one being fought
    this.tearRest = 0;
    this.meet = null; this.nextMeet = 50;
    this.glints = [];
    this.log = [];
  }

  note(s) { this.log.push(`${this.sim.time.toFixed(0)} ${s}`); if (this.log.length > 60) this.log.shift(); }

  get wild() {
    const sim = this.sim, p = sim.player;
    return !(sim.opening && sim.opening.stage < OPENING.ARRIVED) && sim.gameState === 0 && Math.abs(p.x) < 5500 && Math.abs(p.z) < 5500 && p.y > -30;
  }

  step(dt) {
    const sim = this.sim, t = sim.tripo;
    if (!t || !this.wild) return;
    this.draw();
    if (dt <= 0) return;
    if ((this.half -= dt) <= 0) { this.half = 0.5; this.rivals(); }
    if ((this.clock -= dt) > 0) { if (this.tear) this.stepTear(dt); if (this.meet) this.stepMeet(dt); return; }
    this.clock = 1;
    this.lookOutposts(); this.lookFinds(); this.lookTears();
    if (this.tear) this.stepTear(dt); else if (this.meet) this.stepMeet(dt); else this.lookMeet();
  }

  monsters() { return this.sim.tripo.slots().filter((k) => k instanceof TripoMonster && !k.dead); }

  // ---- the sides at war ---------------------------------------------------------------------------------------------
  rivals() {
    const list = this.monsters().filter((m) => m.lair?.side && !m.buried);
    for (const m of list) {
      let best = null, bd = 36;
      for (const o of list) {
        if (o === m || !atWar(m.lair.side, o.lair.side)) continue;
        const d = Math.hypot(o.x - m.x, o.z - m.z);
        if (d < bd) { bd = d; best = o; }
      }
      m.rival = best;
    }
  }

  // ---- lairs of its own ---------------------------------------------------------------------------------------------
  // One more temp lair, stood up now. o: x, z, r, pick, boss, n, pal, side, tricks, tough, spots, set (each as it stands).
  stand(o) {
    const t = this.sim.tripo, have = (ids) => (ids || []).filter((id) => t.roster[id]);
    const boss = have(o.boss), pk = have(o.pick);
    const lair = { key: `wild_${o.tag}_${Math.floor(this.sim.time * 10)}_${Math.floor(Math.random() * 1e4)}`, x: o.x, z: o.z, r: o.r ?? 6, boss: boss.length ? boss : undefined, pick: pk, n: pk.length ? o.n : 0,
      pal: o.pal || ['Base'], wake: -1, temp: true, wild: true, side: o.side, tricks: !!o.tricks, tough: o.tough, spots: o.spots, state: 'asleep', at: -1e9, onSpawn: o.set, tries: 0, want: (boss.length ? 1 : 0) + (pk.length ? o.n : 0) };
    t.lairs.push(lair);
    t.wake(lair);
    return lair;
  }

  // Is this lair's fight over (everything it stood up is dead)? Stands it up again if it got nobody.
  over(lair) {
    const t = this.sim.tripo;
    if (t.loading.has(lair)) return false;
    if (lair.spawned > 0) return lair.killed >= lair.spawned;
    if (lair.tries++ < 6) { if (!t.lairs.includes(lair)) t.lairs.push(lair); t.wake(lair); return false; }
    return true;   // (no room for it at all: let it go)
  }

  drop(lair) {
    const sim = this.sim;
    sim.knights.forEach((k, i) => { if (k instanceof TripoMonster && k.lair === lair) sim.knights[i] = new TripoEmpty(i); });
    lair.state = 'cleared';
  }

  room() {
    const p = this.sim.player;
    let free = 0;
    for (const k of this.sim.tripo.slots()) if (k instanceof TripoEmpty || (k.dead && k.deadT > 45) || (!k.aggro && Math.hypot(k.x - p.x, k.z - p.z) > 150)) free++;
    return free;
  }

  // ---- the outposts, and the things to find -------------------------------------------------------------------------
  lookOutposts() {
    const sim = this.sim, p = sim.player;
    for (let i = 0; i < OUTPOSTS.length; i++) {
      const o = OUTPOSTS[i], d = Math.hypot(p.x - o.x, p.z - o.z);
      if (d > 260) continue;
      if (d < o.r + 48 && !this.found.has(i)) { this.found.add(i); sim.event(EV.WILD, WILD.FOUND, i); }
      let lair = this.byKey.get(o.key);
      if (!lair) { lair = sim.tripo.lairs.find((l) => l.key === o.key); if (lair) this.byKey.set(o.key, lair); }
      if (lair && lair.state === 'cleared' && lair.at !== this.clearedAt.get(i) && sim.time - lair.at < 5) {
        this.clearedAt.set(i, lair.at);
        if (d < 90) { sim.event(EV.WILD, WILD.CLEARED, i, o.x, sim.world.height(o.x, o.z), o.z); this.note(`cleared ${o.key}`); }
      }
    }
  }

  lookFinds() {
    const sim = this.sim, p = sim.player;
    this.glints.length = 0;
    for (let i = 0; i < FINDS.length; i++) {
      if (this.taken.has(i)) continue;
      const [x, z] = FINDS[i], d = Math.hypot(p.x - x, p.z - z);
      if (d > 70) continue;
      if (d < 3.4) { this.taken.add(i); sim.event(EV.WILD, WILD.CACHE, i, x, sim.world.height(x, z), z); continue; }
      this.glints.push([x, sim.world.height(x, z) + 1.1, z, i]);
    }
  }

  // ---- tears --------------------------------------------------------------------------------------------------------
  isOpen(i) {
    const time = this.sim.time, sealed = this.sealedAt.get(i);
    if (sealed !== undefined && time - sealed < TEAR.turn) return false;
    return hash(i * 7.31 + Math.floor((time + i * 97) / TEAR.turn) * 13.7) < TEAR.open;
  }

  lookTears() {
    const sim = this.sim, p = sim.player;
    if (this.tear) return;
    let best = -1, bd = TEAR.see;
    for (let i = 0; i < TEAR_SPOTS.length; i++) {
      const s = TEAR_SPOTS[i], d = Math.hypot(p.x - s[0], p.z - s[1]);
      if (d < bd && this.isOpen(i)) { bd = d; best = i; }
    }
    if (best !== this.near) {
      this.near = best;
      if (best >= 0) sim.event(EV.WILD, WILD.TEAR_NEAR, TEAR_SPOTS[best][2], TEAR_SPOTS[best][0], TEAR_SPOTS[best][1]);
      else sim.event(EV.WILD, WILD.TEAR_GONE);
    }
    this.tearRest -= 1;
    if (best >= 0 && bd < TEAR.start && this.tearRest <= 0 && !p.dead && !this.meet) this.openTear(best);
  }

  openTear(i) {
    const [x, z, kind] = TEAR_SPOTS[i], lvl = wildLevel(x, z);
    this.tear = { i, x, z, kind, lvl, stage: 0, lair: null, t0: this.sim.time, clock: 0, bonus: false, lostT: 0, shown: -1,
      colossus: (this.sealed + 1) % TEAR.colossusEvery === 0 && lvl >= 9 };
    this.note(`tear ${i} opened (${TEARS_KINDS[kind].key}, level ${lvl})`);
    this.nextStage();
  }

  nextStage() {
    const sim = this.sim, T = this.tear, K = TEARS_KINDS[T.kind];
    T.stage++;
    // (The bonus wave only for the quick.)
    if (T.stage === 3 && sim.time - T.t0 > TEAR.bonus) T.stage = 4;
    const tough = { hp: 0.7 + T.lvl * 0.04, damage: 0.75 + T.lvl * 0.03 };
    const set = (m) => { m.opts.sight = 80; m.opts.leash = 170; m.aggro = true; };
    const base = { tag: 'tear', x: T.x, z: T.z, r: 7, pal: K.pal, side: K.side, tough, set };
    let secs = 0;
    if (T.stage === 1) T.lair = this.stand({ ...base, pick: K.waves, n: 4 });
    else if (T.stage === 2) T.lair = this.stand({ ...base, pick: K.waves, boss: K.elite, n: 4, tricks: true });
    else if (T.stage === 3) { T.lair = this.stand({ ...base, r: 9, pick: K.waves, n: 6 }); secs = TEAR.bonusFor; T.clock = secs; }
    else T.lair = this.stand({ ...base, boss: [T.colossus ? K.colossus : K.lord], pick: K.elite, n: T.colossus ? 0 : 2, tricks: true, tough: T.colossus ? { hp: 1, damage: 1 } : tough });
    T.shown = -1;
    sim.event(EV.WILD, WILD.TEAR_STAGE, T.kind, T.stage, T.lair.want, secs, T.colossus ? 1 : 0);
    sim.event(EV.ROAR, T.x, sim.world.height(T.x, T.z) + 2, T.z, T.stage === 4 ? 1.6 : 1);
  }

  stepTear(dt) {
    const sim = this.sim, T = this.tear, p = sim.player, L = T.lair;
    const d = Math.hypot(p.x - T.x, p.z - T.z);
    T.lostT = p.dead || d > TEAR.leave ? T.lostT + dt : 0;
    if (T.lostT > TEAR.lost || (p.dead && T.lostT > 2)) {
      this.drop(L); this.tear = null; this.tearRest = 25;
      sim.event(EV.WILD, WILD.TEAR_LOST, T.kind);
      this.note(`tear ${T.i} lost`);
      return;
    }
    if (L.spawned && L.killed !== T.shown) { T.shown = L.killed; sim.event(EV.WILD, WILD.TEAR_COUNT, L.killed, Math.max(L.spawned, L.want)); }
    if (T.stage === 3) {
      T.clock -= dt;
      if (T.clock <= 0 && !this.over(L)) { this.drop(L); this.nextStage(); return; }   // (too slow: on to its lord, the bonus not won)
    }
    if (!this.over(L)) return;
    if (T.stage === 3) T.bonus = true;
    if (T.stage < 4) { this.nextStage(); return; }
    this.sealedAt.set(T.i, sim.time); this.sealed++;
    this.tear = null; this.near = -1; this.nextMeet = sim.time + rnd(...MEET.every);
    sim.event(EV.WILD, WILD.TEAR_SEALED, T.kind, T.x, sim.world.height(T.x, T.z), T.z, T.lvl, T.bonus ? 1 : 0, T.colossus ? 1 : 0);
    this.note(`tear ${T.i} sealed`);
  }

  // ---- meetings -----------------------------------------------------------------------------------------------------
  // Somewhere sound ahead of you, or null. road: on the road you're walking.
  spotAhead(road) {
    const sim = this.sim, p = sim.player, w = sim.world;
    const sp = Math.hypot(p.vx || 0, p.vz || 0), head = sp > 1.5 ? Math.atan2(p.vx, p.vz) : p.yaw;
    let best = null, bd = 1e9;
    for (let n = 0; n < 14; n++) {
      const a = head + (road ? (n - 6.5) * 0.16 : rnd(-0.6, 0.6)), d = rnd(...MEET.ahead);
      const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
      if (Math.abs(x) > 5350 || Math.abs(z) > 5350 || townDist(x, z) < 220 || waterAt(x, z) !== null || siteAt(x, z, 45)) continue;
      if (Math.abs(w.height(x + 5, z) - w.height(x - 5, z)) > 2.6 || Math.abs(w.height(x, z + 5) - w.height(x, z - 5)) > 2.6 || w.inside(x, z, 1.2)) continue;
      if (sim.tripo.lairs.some((l) => !l.temp && !l.dungeon && Math.hypot(l.x - x, l.z - z) < l.r + 55)) continue;
      const rd = routeDist(x, z);
      if (road) { if (rd.road && !rd.road.trail && rd.d < bd) { bd = rd.d; best = [x, z]; } } else if (!rd.road || rd.d > rd.road.w + 9) return [x, z];
    }
    return road && bd < 7 ? best : null;
  }

  lookMeet() {
    const sim = this.sim, p = sim.player;
    if (sim.time < this.nextMeet || p.dead || townDist(p.x, p.z) < 260 || siteAt(p.x, p.z, 70)) return;
    if (this.monsters().some((m) => Math.hypot(m.x - p.x, m.z - p.z) < MEET.quiet) || this.room() < 8) { this.nextMeet = sim.time + 6; return; }
    if (this.near >= 0 && Math.hypot(p.x - TEAR_SPOTS[this.near][0], p.z - TEAR_SPOTS[this.near][1]) < 90) return;
    const rd = routeDist(p.x, p.z), onRoad = !!rd.road && !rd.road.trail && rd.d < 14;
    const pool = MEETINGS.filter((m) => !m.road || onRoad);
    let roll = Math.random() * pool.reduce((s, m) => s + m.w, 0), kind = pool[0];
    for (const m of pool) { roll -= m.w; if (roll <= 0) { kind = m; break; } }
    const spot = this.spotAhead(kind.key === 'warband');
    if (!spot) { this.nextMeet = sim.time + 4; return; }
    this.startMeet(kind.key, spot[0], spot[1]);
  }

  // Who's about at (x, z): its country's factions, Velscour's only where they may stand.
  factionsAt(x, z) {
    const country = countryAt(x, z), holy = HOLY.some((s) => Math.hypot(s.x - x, s.z - z) < 560);
    return (COUNTRY_FACTIONS[country] || COUNTRY_FACTIONS.darkwood).filter((k) => !FACTIONS[k].v || (country === 'ashen' && !holy));
  }

  startMeet(key, x, z, force = null) {
    const sim = this.sim, p = sim.player, list = this.factionsAt(x, z);
    const fa = force?.a || pick(list), A = FACTIONS[fa], lvl = Math.max(wildLevel(x, z), 4);
    const tough = { hp: 0.75 + lvl * 0.03, damage: 0.8 + lvl * 0.02 };
    const M = { key, x, z, lvl, lairs: [], t0: sim.time, clock: 0, a: fa, b: null, march: null, risen: false, hit: false };
    const roam = (m) => { m.opts.sight = 30; m.opts.leash = 120; };
    const base = (F, more) => ({ tag: key, x, z, r: 6, pick: F.rank.concat(F.elite), pal: F.pal, side: F.side, tricks: F.lvl >= 9, tough, set: roam, ...more });
    let secs = 0;
    if (key === 'skirmish' || key === 'duel') {
      const foes = list.filter((k) => atWar(A.side, FACTIONS[k].side) && !(A.v && FACTIONS[k].v));
      const fb = force?.b || (foes.length ? pick(foes) : null);
      if (!fb && key === 'skirmish') return this.startMeet('pack', x, z, { a: fa });
      const a = Math.random() * 6.28, ox = Math.sin(a) * 8, oz = Math.cos(a) * 8;
      if (key === 'skirmish') {
        const B = FACTIONS[fb]; M.b = fb;
        const hard = { hp: tough.hp, damage: tough.damage };
        const slow = (m) => { roam(m); m.opts.rivalTake = 0.4; };
        M.lairs.push(this.stand(base(A, { x: x - ox, z: z - oz, r: 4, n: 3, tough: hard, set: slow })), this.stand(base(B, { x: x + ox, z: z + oz, r: 4, n: 3, tough: hard, set: slow })));
      } else {
        // Two sorcerers, each alone and each the other's side's enemy whatever they are.
        const all = FACTION_KEYS.flatMap((k) => FACTIONS[k].v ? [] : FACTIONS[k].elite.concat(FACTIONS[k].chief)).filter((id) => CASTER.test(id) && !/lord|hierophant|magister/.test(id));
        const one = (sx, sz, side) => this.stand({ tag: key, x: sx, z: sz, r: 1, boss: [pick(all)], n: 0, side, tricks: true, tough: { hp: 1.7, damage: 1.2 }, set: (m) => { m.opts.sight = 40; m.opts.leash = 60; } });
        M.lairs.push(one(x - ox, z - oz, 'duel_a'), one(x + ox, z + oz, 'duel_b'));
      }
    } else if (key === 'warband') {
      const marchers = list.filter((k) => ['goblin', 'kobold', 'velscour', 'plague', 'dead', 'herd'].includes(FACTIONS[k].side));
      const F = FACTIONS[M.a = marchers.length ? pick(marchers) : fa];
      M.march = [p.x, p.z];
      M.lairs.push(this.stand(base(F, { boss: F.chief, n: 3, r: 4, tricks: true, set: (m) => { m.opts.sight = 34; m.opts.leash = 400; m.opts.roam = 2; m.idleT = 0; } })));
    } else if (key === 'bounty') {
      M.lairs.push(this.stand(base(A, { boss: A.chief, n: 2, tricks: true, tough: { hp: tough.hp * 1.35, damage: tough.damage * 1.1 } })));
    } else if (key === 'ritual') {
      const cults = list.filter((k) => ['dead', 'cult'].includes(FACTIONS[k].side));
      const F = FACTIONS[M.a = cults.length ? pick(cults) : 'hedge'];
      let who = F.elite.concat(F.chief).filter((id) => CASTER.test(id) && !/lord|hierophant|magister/.test(id));
      if (!who.length) who = ['w_hedge_warlock', 'w_grave_caller'];
      const spots = [0, 1, 2].map((i) => [x + Math.sin(i * 2.094) * 4.5, z + Math.cos(i * 2.094) * 4.5]);
      M.lairs.push(this.stand({ tag: key, x, z, r: 5, pick: who, n: 3, pal: F.pal, side: F.side, tricks: true, tough, spots, set: (m) => { m.opts.sight = 16; m.opts.leash = 60; } }));
      secs = MEET.ritual; M.clock = secs; M.side = F.side;
    } else if (key === 'drake') {
      const c = countryAt(x, z);
      const who = c === 'rimeholt' ? ['w_frost_drake'] : c === 'fen' ? ['w_marsh_drake'] : c === 'ashen' || c === 'rustwood' ? ['w_ash_drake'] : c === 'barrow' || c === 'gallows' ? ['w_bone_drake'] : null;
      M.lairs.push(this.stand(who ? { tag: key, x, z, r: 3, boss: who, n: 0, side: 'wyrm', tricks: true, tough, set: (m) => { m.opts.sight = 110; m.opts.leash = 300; m.aggro = true; } }
        : { tag: key, x, z, r: 5, pick: ['w_cinder_whelp'], n: 3, side: 'wyrm', tricks: lvl > 7, tough, set: (m) => { m.opts.sight = 110; m.opts.leash = 300; m.aggro = true; } }));
    } else {
      M.lairs.push(this.stand(base(A, { n: lvl > 10 ? 4 : 3 })));
    }
    this.meet = M;
    sim.event(EV.WILD, WILD.MEET, MEETINGS.findIndex((m) => m.key === key), FACTION_KEYS.indexOf(M.a), M.b ? FACTION_KEYS.indexOf(M.b) : -1, secs, x, z);
    this.note(`meeting: ${key} (${M.a}${M.b ? ' v ' + M.b : ''}) at ${x.toFixed(0)}, ${z.toFixed(0)}`);
    return M;
  }

  stepMeet(dt) {
    const sim = this.sim, M = this.meet, p = sim.player;
    const mine = this.monsters().filter((m) => M.lairs.includes(m.lair));
    if (mine.length) { M.x = mine.reduce((s, m) => s + m.x, 0) / mine.length; M.z = mine.reduce((s, m) => s + m.z, 0) / mine.length; }
    // (Your hand in it: the dead count too, a blow that killed being the last anyone saw of it.)
    if (sim.tripo.slots().some((m) => m instanceof TripoMonster && M.lairs.includes(m.lair) && sim.time - (m.playerHitT ?? -1e9) < 3)) M.hit = true;
    // A warband walks the road to where you were when it set out.
    if (M.march) for (const m of mine) {
      const dx = M.march[0] - m.home[0], dz = M.march[1] - m.home[1], d = Math.hypot(dx, dz);
      if (d > 3) { m.home[0] += dx / d * 1.7 * dt; m.home[1] += dz / d * 1.7 * dt; }
    }
    // A ritual: done before you stopped it, and what they called stands up among them.
    if (M.key === 'ritual' && !M.risen) {
      M.clock -= dt;
      if (M.clock <= 0 && mine.length) {
        M.risen = true;
        const who = M.side === 'dead' ? ['w_charnel_golem', 'w_bone_sentinel'] : ['w_ember_fiend', 'w_dream_eater'];
        M.lairs.push(this.stand({ tag: 'risen', x: M.x, z: M.z, r: 1, boss: who, n: 0, side: M.side, tricks: true, tough: { hp: 1.3, damage: 1.1 }, set: (m) => { m.opts.sight = 60; m.opts.leash = 200; m.aggro = true; } }));
        sim.event(EV.ROAR, M.x, sim.world.height(M.x, M.z) + 2, M.z, 1.6);
        sim.event(EV.WILD, WILD.MEET, MEETINGS.findIndex((m) => m.key === 'ritual'), FACTION_KEYS.indexOf(M.a), -2, 0, M.x, M.z);
      }
    }
    const far = Math.hypot(p.x - M.x, p.z - M.z);
    const done = M.lairs.every((l) => this.over(l));
    // (A skirmish or a duel is done when one side's left and you've dealt with it, or left it be: when nothing of it's alive.)
    if (done) {
      this.meet = null; this.nextMeet = sim.time + rnd(...MEET.every);
      const won = M.hit && far < 140;
      sim.event(EV.WILD, WILD.MEET_DONE, MEETINGS.findIndex((m) => m.key === M.key), M.x, sim.world.height(M.x, M.z), M.z, M.lvl, won ? (M.key === 'ritual' && !M.risen ? 2 : 1) : 0);
      this.note(`meeting over (${M.key}, ${won ? 'won' : 'not yours'})`);
    } else if (far > MEET.gone || sim.time - M.t0 > 600) {
      for (const l of M.lairs) this.drop(l);
      this.meet = null; this.nextMeet = sim.time + rnd(...MEET.every) * 0.5;
      sim.event(EV.WILD, WILD.MEET_DONE, MEETINGS.findIndex((m) => m.key === M.key), M.x, 0, M.z, M.lvl, -1);
      this.note(`meeting left behind (${M.key})`);
    }
  }

  // For looking at it (bm.wild in the console, src/main.js): 1, a meeting of kind b ahead of you now; 2, to the nearest open
  // tear; 3, to outpost b; 4, to battle b's ground; 5, the next meeting as soon as there's room.
  debug(a, b) {
    const sim = this.sim, p = sim.player, to = (x, z) => { p.x = x; p.z = z; p.y = sim.world.height(x, z); };
    if ((a | 0) === 1) {
      if (this.meet) { for (const l of this.meet.lairs) this.drop(l); this.meet = null; }
      const key = MEETINGS[b | 0]?.key || 'pack', spot = this.spotAhead(key === 'warband') || this.spotAhead(false) || [p.x + Math.sin(p.yaw) * 60, p.z + Math.cos(p.yaw) * 60];
      this.startMeet(key, spot[0], spot[1]);
    } else if ((a | 0) === 2) {
      let best = -1, bd = 1e9;
      TEAR_SPOTS.forEach((s, i) => { const d = Math.hypot(p.x - s[0], p.z - s[1]); if (d < bd && this.isOpen(i)) { bd = d; best = i; } });
      if (best >= 0) to(TEAR_SPOTS[best][0] + 24, TEAR_SPOTS[best][1]);
    } else if ((a | 0) === 3) { const o = OUTPOSTS[(b | 0) % OUTPOSTS.length]; to(o.x + Math.sin(o.yaw) * (o.r + 26), o.z + Math.cos(o.yaw) * (o.r + 26)); }
    else if ((a | 0) === 4) { const l = sim.tripo.lairs.filter((q) => q.battle)[(b | 0) * 2]; if (l) to(l.x + 30, l.z); }
    else if ((a | 0) === 5) this.nextMeet = 0;
  }

  // ---- what's drawn -------------------------------------------------------------------------------------------------
  draw() {
    const sim = this.sim, c = sim.casting, time = sim.time;
    if (!c) return;
    // The things to find: a mote of light over each, turning.
    for (const [x, y, z, i] of this.glints) {
      const a = time * 1.6 + i;
      c.fx(FX.FLARE, ELEM.LIGHT, x + Math.cos(a) * 0.25, y + Math.sin(time * 2.3 + i) * 0.18, z + Math.sin(a) * 0.25, 0.09, 0, 1, 0, 0, 0.9, 1.5, 3, 0, i * 0.37);
    }
    // A tear: a wound of light over a ring of signs, a column you can see from a long way off; wilder while it's fought.
    const T = this.tear, i = T ? T.i : this.near;
    if (i >= 0) {
      const [x, z, kind] = TEAR_SPOTS[i], e = TEARS_KINDS[kind].elem, y = sim.world.height(x, z), hot = T ? 1 : 0;
      const beat = 0.5 + 0.5 * Math.sin(time * (2 + hot * 3));
      c.fx(FX.COLUMN, e, x, y, z, 0.7 + hot * 0.5 + beat * 0.2, 0, 1, 0, 34, 0.55 + hot * 0.3, 10 + hot * 10, 22, (time * 0.25) % 1, i * 0.21);
      c.fx(FX.VORTEX, e, x, y + 2.4, z, 1.5 + hot * 0.9 + beat * 0.3, 0, 1, 0, 0, 1, 9, 10, 0, i * 0.13);
      c.fx(FX.RUNE, e, x, y + 0.08, z, 4.2 + hot * 2.2, 0, 1, 0, 0, 0.75, 4, 6, (time * 0.08) % 1, i * 0.4);
      c.fx(FX.RING, e, x, y + 0.05, z, 6.5 + hot * 2 + beat * 0.5, 0, 1, 0, 0, 0.5, 0, 0, 0.4, i * 0.3);
      for (let k = 0; k < 4 + hot * 4; k++) {
        const a = time * (0.9 + hot) + k * 6.283 / (4 + hot * 4), r = 2.4 + Math.sin(time * 1.3 + k) * 0.7;
        c.fx(FX.FLARE, e, x + Math.cos(a) * r, y + 1 + (k % 3) * 0.9 + Math.sin(time * 2 + k) * 0.4, z + Math.sin(a) * r, 0.12 + hot * 0.06, 0, 1, 0, 0, 0.9, 0, 0, 0, k * 0.21);
      }
    }
    // A ritual: its circle fills as the time runs out.
    const M = this.meet;
    if (M && M.key === 'ritual' && !M.risen) {
      const u = 1 - clamp(M.clock / MEET.ritual, 0, 1), y = sim.world.height(M.x, M.z), e = M.side === 'dead' ? ELEM.BONE : ELEM.DRAIN;
      c.fx(FX.RUNE, e, M.x, y + 0.08, M.z, 2 + u * 3.5, 0, 1, 0, 0, 0.5 + u * 0.5, 3 + u * 9, 7, (time * 0.1) % 1, 0.7);
      c.fx(FX.COLUMN, e, M.x, y, M.z, 0.3 + u * 0.7, 0, 1, 0, 6 + u * 14, 0.3 + u * 0.5, 4 + u * 10, 10, (time * 0.3) % 1, 0.2);
    }
  }
}
