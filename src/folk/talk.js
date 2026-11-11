// Who says what, in the street: the overheard scenes (src/folk/lines/scenes.js), small talk between any two, what each
// says aloud as the player passes or casts, the nods of people passing, and holding someone still while the player
// talks to them. Speech goes to the main thread as `say` events, shown as balloons over the speaker's head.
import { ACT, hash, wrapAngle } from './brain.js';
import { partOfDay } from './days.js';
import { sayable } from './quests.js';

const HEAR = 26;                  // scenes run only where the player could overhear them
const BUSY = new Set([ACT.SLEEP, ACT.FLEE, ACT.HIDE, ACT.PERFORM]);

// Who's whose, for small talk (src/folk/people.js has where they live, not who they are to each other; tools/folk/cast.md).
const FAMILY = {};
for (const [k, ids] of Object.entries({
  kettle: ['bram', 'maudie', 'nell', 'pip', 'kit'], tallow: ['elspeth', 'magda', 'wren'],
  ashby: ['corwin', 'isolde', 'cedric', 'rosalind', 'seraphine', 'juliana'], halloway: ['edric', 'margery', 'elowen', 'tobias', 'aldric'],
  fenwick: ['hob', 'bess', 'tilly', 'tam', 'dob'], brewer: ['hilde', 'lily', 'ivy'], reed: ['tamsin', 'wenna'], bramble: ['agnes', 'hal'], moss: ['sabine', 'bryony'],
})) for (const id of ids) FAMILY[id] = k;
const WED = new Set(['bram:maudie', 'corwin:isolde', 'edric:margery', 'hob:bess']);
const COURTING = new Set(['dob:ivy']);
const PARENTS = new Set(['bram', 'maudie', 'hob', 'bess', 'hilde', 'agnes', 'sabine']);   // of a child still at play
const pairKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);
// What an exchange can ask of a speaker (a: or b:, one or a list, all of them).
const ROLE = {
  parent: (o) => PARENTS.has(o.id),
  common: (o) => FAMILY[o.id] !== 'ashby' && FAMILY[o.id] !== 'halloway',
  gentry: (o) => FAMILY[o.id] === 'ashby' || FAMILY[o.id] === 'halloway',
  ashby: (o) => FAMILY[o.id] === 'ashby',
  halloway: (o) => FAMILY[o.id] === 'halloway',
  old: (o) => o.p.age >= 60,
  trade: (o) => !!o.p.trade,
};
// And of the two together (pair:).
const PAIR = {
  wed: (A, B) => WED.has(pairKey(A.id, B.id)),
  couple: (A, B) => WED.has(pairKey(A.id, B.id)) || COURTING.has(pairKey(A.id, B.id)),
  kin: (A, B) => !!FAMILY[A.id] && FAMILY[A.id] === FAMILY[B.id],
  apart: (A, B) => !(FAMILY[A.id] && FAMILY[A.id] === FAMILY[B.id]) && !COURTING.has(pairKey(A.id, B.id)),
};
const SMALL_PAIR = 240;           // seconds before the same two make small talk again
const SMALL_SAME = 1200;          // before anyone has the same exchange again
const SMALL_PAIR_SAME = 7200;     // before the same two have the same exchange again

const lineDur = (text) => Math.min(6.5, Math.max(2.2, 1.4 + text.length * 0.055));

export class Talk {
  // lines: { id: { barks, ... } } (all three town_*.js merged); scenes, smalltalk: src/folk/lines/scenes.js
  constructor(life, { lines = {}, scenes = [], smalltalk = [] }, emit) {
    this.life = life; this.lines = lines; this.scenes = scenes; this.small = smalltalk; this.emit = emit;
    this.t = 0;
    this.running = [];            // scenes under way
    this.played = new Map();      // scene id -> day it last played
    this.smallUsed = new Map();   // pair -> clock of their last small talk
    this.smallSaid = new Map();   // exchange -> clock it was last had, by anyone
    this.pairSaid = new Map();    // pair -> Map(exchange -> clock)
    this.nodAt = new Map();       // pair passing in the street -> clock of the last nod
    this.barkAt = new Map();      // person -> clock of their last bark
    this.lastBark = -99;
    this.nextScene = 2; this.nextSmall = 4; this.nextBark = 1;
    this.cast = 0;
    this.with = -1;               // who the player's talking to
    this.name = 'stranger';
    this.flags = new Set();       // 'arrived', 'quest:<id>' ...
    this.near = new Map();        // person -> seconds the player's stood by them
  }

  // world: { player, cast (a count of spells cast), name, flags: [...] }
  update(dt, world) {
    const life = this.life;
    this.t += dt;
    if (world.name) this.name = world.name;
    if (world.flags) this.flags = new Set(world.flags);
    for (const sc of this.running) this.step(sc, dt);
    this.running = this.running.filter((sc) => !sc.over);
    const [px, , pz] = life.player;
    if (this.t > this.nextScene) { this.nextScene = this.t + 2.5; this.tryScene(px, pz); }
    if (this.t > this.nextSmall) { this.nextSmall = this.t + 8; this.trySmall(px, pz); }
    if (this.t > this.nextBark) { this.nextBark = this.t + 0.8; this.barks(px, pz, dt + 0.8); }
    if (world.cast !== undefined && world.cast !== this.cast) { if (world.cast > this.cast) this.magic(px, pz); this.cast = world.cast; }
    this.passing();
    // Whoever the player's talking to looks at them, and turns to them if they're stood.
    const w = life.folk[this.with];
    if (w) {
      w.hold = 1e9;
      w.look = [px, life.player[1] + 1.55, pz];
      if (w.posture === 'stand') w.face = Math.atan2(px - w.x, pz - w.z);
    }
  }

  // ---- the player ----

  // The player's opened the panel on someone (or shut it: i = -1).
  talkTo(i) {
    const life = this.life;
    const was = life.folk[this.with];
    if (was && this.with !== i) {
      was.hold = 0; was.look = null; was.face = null; was.woken = false; was.talking = false;
      this.barkAt.set(was, this.t);
    }
    this.with = i;
    const me = life.folk[i];
    if (!me) return;
    me.talking = true;
    if (me.asleep) me.woken = true;
    // Out of any scene they're in.
    for (const sc of this.running) if (sc.who.includes(me)) this.end(sc);
  }

  // ---- scenes ----

  free(me, scene = false) {
    if (!me || !me.pose || me.talking || me.inScene || me.alarm || BUSY.has(me.act) || me.posture === 'lie' || me.posture === 'floor') return false;
    if (scene && me.act === ACT.PLAY && !me.child) return false;
    return true;
  }

  where(sc, who) {
    const life = this.life, t = life.town;
    const same = who.every((o) => o.house === who[0].house);
    if (!same) return false;
    switch (sc.where) {
      case 'square': { const w = t.places.well.at; return who.every((o) => o.house < 0 && Math.hypot(o.x - w[0], o.z - w[1]) < 16); }
      case 'inn': return who[0].house === life.inn.i;
      case 'home': return who[0].house >= 0 && who.some((o) => o.home.i === who[0].house);
      case 'work': return who.some((o) => o.act === ACT.WORK || o.act === ACT.SHOP || o.act === ACT.COOK);
      case 'street': return who[0].house < 0;
      case 'oak': { const o = t.places.oak.at; return who.every((p) => Math.hypot(p.x - o[0], p.z - o[1]) < 4); }
      default: return true;
    }
  }

  allowed(sc) {
    // after: a flag the town has ('arrived'; 'quest:<id>' begun, 'quest:<id>:done' handed in) or a scene already overheard
    // (the oak's run goes in order this way); until: a quest not yet done.
    if (sc.after && !this.flags.has(sc.after) && !(sc.after.startsWith('scene:') && this.played.has(sc.after.slice(6)))) return false;
    if (sc.until && this.flags.has(`${sc.until}:done`)) return false;
    if (sc.when && sc.when !== 'any' && sc.when !== partOfDay(this.life.hour)) return false;
    const last = this.played.get(sc.id);
    return last === undefined || this.life.day - last >= 3;
  }

  tryScene(px, pz) {
    const life = this.life;
    if (this.running.length >= 2) return;
    const fits = [];
    for (const sc of this.scenes) {
      if (!this.allowed(sc)) continue;
      const who = sc.who.map((id) => life.byId[id]);
      if (!who.every((o) => this.free(o, true))) continue;
      const cx = who.reduce((a, o) => a + o.x, 0) / who.length, cz = who.reduce((a, o) => a + o.z, 0) / who.length;
      if (Math.hypot(cx - px, cz - pz) > HEAR) continue;
      if (who.some((o) => Math.hypot(o.x - cx, o.z - cz) > 4.5)) continue;
      if (!this.where(sc, who)) continue;
      fits.push({ sc, who, cx, cz });
    }
    if (!fits.length) return;
    // A scene that waited for the player's arrival or a quest first, then the rest by chance.
    fits.sort((a, b) => (b.sc.after ? 1 : 0) - (a.sc.after ? 1 : 0));
    const f = fits[0].sc.after ? fits[0] : fits[Math.floor(hash(`${this.t}`) * fits.length)];
    this.played.set(f.sc.id, life.day);
    this.begin(f.sc.lines, f.who, f.cx, f.cz, 'scene', f.sc.id);
  }

  begin(lines, who, cx, cz, kind, id) {
    const sc = { lines, who, cx, cz, kind, id, k: -1, t: 0, gap: 0.6, over: false };
    for (const o of who) { o.inScene = sc; o.hold = 1; }
    this.running.push(sc);
    this.emit({ type: 'scene', id, who: who.map((o) => o.i), on: true });
    return sc;
  }

  step(sc, dt) {
    sc.t += dt;
    // Everyone in it looks at whoever's speaking, and stands round to face the middle.
    const sp = sc.k >= 0 ? sc.who[sc.speaker] : null;
    for (const o of sc.who) {
      if (o.talking) continue;
      const to = sp && sp !== o ? sp : sc.who.find((q) => q !== o);
      if (to) o.look = [to.x, to.y + (to.rig.headTop * (to.posture === 'sit' ? 0.72 : 0.93)), to.z];
      if (o.posture === 'stand' && (o.act === ACT.GATHER || o.act === ACT.IDLE || o.act === ACT.WALK || o.act === ACT.INN || o.act === ACT.LESSON || o.act === ACT.PLAY)) {
        const tx = sp && sp !== o ? sp.x : sc.cx, tz = sp && sp !== o ? sp.z : sc.cz;
        if (Math.hypot(tx - o.x, tz - o.z) > 0.3) o.face = Math.atan2(tx - o.x, tz - o.z);
      }
    }
    if (sc.t < sc.gap) return;
    sc.k++;
    if (sc.k >= sc.lines.length) { this.end(sc); return; }
    const [id, text, gesture] = sc.lines[sc.k];
    const k = sc.who.findIndex((o) => o.id === id || o.slot === id);
    if (k < 0) { sc.gap = 0; sc.t = 0; return; }
    sc.speaker = k;
    const me = sc.who[k];
    const said = this.fill(text);
    const dur = lineDur(said);
    if (gesture === 'sing' || gesture === 'dance') me.gesture(gesture === 'sing' ? 'sing_1' : 'dance_5');
    else me.gesture(gesture || 'talk');
    this.emit({ type: 'say', i: me.i, text: said, dur, kind: sc.kind });
    sc.t = 0; sc.gap = dur + 0.35;
  }

  end(sc) {
    if (sc.over) return;
    sc.over = true;
    for (const o of sc.who) {
      o.inScene = null;
      if (!o.talking) { o.hold = 0; o.look = null; o.face = null; }
    }
    this.emit({ type: 'scene', id: sc.id, who: sc.who.map((o) => o.i), on: false });
  }

  // ---- small talk ----

  // Whether an exchange (src/folk/lines/scenes.js SMALLTALK) can be had by A and B, A speaking first: its pair and roles, its
  // gates (before, after: as in quests.js sayable), its place and time of day.
  fits(x, A, B) {
    if (x.pair && !PAIR[x.pair](A, B)) return false;
    if (x.not && (x.not.includes(A.id) || x.not.includes(B.id))) return false;
    for (const [who, need] of [[A, x.a], [B, x.b]]) for (const r of [].concat(need || [])) if (!ROLE[r](who)) return false;
    return true;
  }

  smallOk(x, A, B) {
    if ((x.before || x.after) && !sayable([{ before: x.before, after: x.after, say: 1 }], this.flags).length) return false;
    if (x.when && x.when !== partOfDay(this.life.hour)) return false;
    return !x.where || this.where(x, [A, B]);
  }

  trySmall(px, pz) {
    const life = this.life;
    if (!this.small.length || this.running.length >= 3) return;
    const still = new Set([ACT.GATHER, ACT.INN, ACT.EAT, ACT.SHOP, ACT.IDLE, ACT.WORK, ACT.SIT]);
    const cand = life.folk.filter((o) => this.free(o) && !o.child && !o.posted && still.has(o.act) && Math.hypot(o.x - px, o.z - pz) < 18);
    for (let a = 0; a < cand.length; a++) {
      for (let b = a + 1; b < cand.length; b++) {
        const A = cand[a], B = cand[b];
        if (A.house !== B.house || Math.hypot(A.x - B.x, A.z - B.z) > 3.2) continue;
        const pair = pairKey(A.id, B.id);
        if (this.t - (this.smallUsed.get(pair) ?? -1e9) < SMALL_PAIR) continue;
        // What these two could say, either way round; the more particular to them, the likelier.
        const theirs = this.pairSaid.get(pair);
        const opts = [];
        let total = 0;
        this.small.forEach((x, k) => {
          if (this.t - (this.smallSaid.get(k) ?? -1e9) < SMALL_SAME || this.t - (theirs?.get(k) ?? -1e9) < SMALL_PAIR_SAME) return;
          const order = this.fits(x, A, B) ? [A, B] : this.fits(x, B, A) ? [B, A] : null;
          if (!order || !this.smallOk(x, A, B)) return;
          const w = 1 + (x.pair ? 2 : 0) + [].concat(x.a || [], x.b || []).length + (x.where || x.when || x.before || x.after ? 1 : 0);
          opts.push({ k, x, order, w }); total += w;
        });
        if (!opts.length) continue;
        let r = hash(`${pair}${life.day}${this.t | 0}`) * total, o = opts[0];
        for (const c of opts) { if ((r -= c.w) < 0) { o = c; break; } }
        this.smallUsed.set(pair, this.t);
        this.smallSaid.set(o.k, this.t);
        if (!theirs) this.pairSaid.set(pair, new Map([[o.k, this.t]])); else theirs.set(o.k, this.t);
        const [P, Q] = o.order;
        const lines = o.x.lines.map(([text, g], k) => [k % 2 ? Q.id : P.id, text, g || (k % 2 ? 'nod' : 'talk')]);
        this.begin(lines, [P, Q], (A.x + B.x) / 2, (A.z + B.z) / 2, 'small', `small:${pair}`);
        return;
      }
    }
  }

  // ---- what they say aloud ----

  fill(text) { return String(text).replaceAll('{name}', this.name); }

  bark(me, kind) {
    // (What can be said now: some lines are kept for while the bell still tolls, some for after. src/folk/quests.js sayable.)
    const list = sayable(this.lines[me.id]?.barks?.[kind], this.flags);
    if (!list.length) return false;
    const text = this.fill(list[Math.floor(hash(`${me.id}${kind}${this.t | 0}`) * list.length)]);
    this.emit({ type: 'say', i: me.i, text, dur: lineDur(text), kind: 'bark' });
    this.barkAt.set(me, this.t);
    this.lastBark = this.t;
    return true;
  }

  barks(px, pz, dt) {
    const life = this.life;
    for (const me of life.folk) {
      const d = Math.hypot(me.x - px, me.z - pz);
      const n = d < 2.6 && me.level === 0 ? (this.near.get(me) || 0) + dt : 0;
      this.near.set(me, n);
      if (d > 5 || !this.free(me) || this.t - this.lastBark < 4 || this.t - (this.barkAt.get(me) ?? -999) < 50) continue;
      if (Math.abs(life.player[1] - me.y) > 1.5) continue;
      const working = me.act === ACT.WORK || me.act === ACT.SHOP || me.act === ACT.COOK;
      let kind = null;
      if (n > 2.2) kind = 'player';
      else if (hash(`${me.id}${this.t | 0}`) < 0.3) kind = working && hash(`${me.id}w${this.t | 0}`) < 0.6 ? 'work' : partOfDay(life.hour);
      if (!kind) continue;
      if (this.bark(me, kind)) {
        me.look = [px, life.player[1] + 1.55, pz];
        me.lookUntil = this.t + 3;
        break;
      }
    }
    for (const me of life.folk) if (me.lookUntil && this.t > me.lookUntil && !me.inScene && !me.talking) { me.lookUntil = 0; me.look = null; }
  }

  // A spell cast near them: they've never seen real magic.
  magic(px, pz) {
    const life = this.life;
    const by = life.folk.filter((o) => this.free(o) && !o.asleep && Math.hypot(o.x - px, o.z - pz) < 16).sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz));
    let said = false;
    for (const o of by) {
      o.look = [px, life.player[1] + 1.2, pz];
      o.lookUntil = this.t + 4;
      o.gesture(['afraid', 'scared', 'frightened', 'point'][Math.floor(hash(`${o.id}${this.t}`) * 4)]);
      if (!said && this.t - (this.barkAt.get(o) ?? -999) > 20) said = this.bark(o, 'magic');
    }
  }

  // Two passing in the street see each other, and one nods.
  passing() {
    const life = this.life;
    for (let a = 0; a < life.folk.length; a++) {
      const A = life.folk[a];
      if (!A.moving || A.inScene || A.house >= 0) continue;
      for (let b = a + 1; b < life.folk.length; b++) {
        const B = life.folk[b];
        if (!B.moving || B.inScene || B.house >= 0) continue;
        const d = Math.hypot(A.x - B.x, A.z - B.z);
        if (d > 3 || d < 0.6) continue;
        const pair = `${A.i}:${B.i}`;
        if (this.t - (this.nodAt.get(pair) ?? -999) < 60) continue;
        // Coming toward each other, not following.
        if (Math.cos(wrapAngle(A.yaw - B.yaw)) > -0.3) continue;
        this.nodAt.set(pair, this.t);
        A.look = [B.x, B.y + 1.5, B.z]; B.look = [A.x, A.y + 1.5, A.z];
        A.lookUntil = this.t + 1.8; B.lookUntil = this.t + 1.8;
        (hash(pair) < 0.5 ? A : B).layer('nod', { from: 'Neck', weight: 0.8, dur: 1.4 });
      }
    }
  }
}
