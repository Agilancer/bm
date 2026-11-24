// The living land on the page: what the sim says is happening out there (EV.WILD, src/sim/wilds.js), told and paid for.
// A banner across the top for what's begun or done, a small tracker under it while something's on (a tear's waves and
// its clock, a meeting, a ritual's time), and the rewards: experience and what's left on the ground (src/items/drops.js).
// What you've found and the caches you've opened are kept in the save, so neither pays twice.
import { SITES } from '../core/lands.js';
import { inDungeon } from '../core/dungeon.js';
import { BOSS_MOVES, BOSS_MOVE_KEYS, FACTIONS, FACTION_KEYS, MEETINGS, RAID_TOWNS, TEARS_KINDS, TEAR, WILD, WILD_VARIANTS, WORLD_BOSSES } from '../core/wilds.js';
import { FIND_KINDS, FINDS, OUTPOSTS } from '../core/wilds-data.js';

const SIDES = { goblin: 'goblins', kobold: 'kobolds', dead: 'the dead', brood: 'spiders', herd: 'goat men', pack: 'wolfkin', flock: 'harpies', wyrm: 'drakes',
  night: 'the things of the night', plague: 'the plague', cult: 'a cult', velscour: "Velscour's knights" };
const FOUND = { cart: 'A BROKEN CART', grave: 'A LONELY GRAVE', cairn: 'A CAIRN', camp: 'A COLD CAMP', stone: 'A STANDING STONE', bones: 'OLD BONES', well: 'A WAYSIDE WELL', hide: "A HUNTER'S HIDE",
  shrine: 'A WAYSIDE STONE', pyre: 'A BURNT-OUT PYRE', totem: 'A TOTEM', wreck: 'A WRECKED WAGON' };
const level = (x, z) => Math.max(4, Math.min(22, Math.round(3 + Math.hypot(x, z) / 270)));
// Where bounties are posted: the small towns that are raided, and Bellmourn itself.
const BOARDS = RAID_TOWNS.map((k) => ({ name: SITES[k].name, x: SITES[k].x, z: SITES[k].z, r: SITES[k].r })).concat([{ name: 'Bellmourn', x: 15, z: 0, r: 75 }]);
const WAYS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
// (+x is east, +z is south: src/core/lands.js.)
// (A bounty's line in the tracker is shown within this far of its outpost: they're given out 250 m to 2.2 km off.)
const BOUNTY_SHOWN = 2500;
const wayTo = (dx, dz) => WAYS[Math.round(Math.atan2(dx, -dz) / (Math.PI / 4) + 8) % 8];
// What the people posted in a town say over their heads when it's raided (POSTED in src/folk/people.js, by id): as it
// begins, at the second band, and when it's held. They keep their posts through it; these are all they do. Nobody's
// voice has them, and neither letter is named in any.
const RAID_WORDS = {
  thornwick: {
    dorcas: ['Raiders on the road! Not my windows, not again!', 'More of them? Mind the barrels!', 'Is that the last of them? Then the first one is on the house.'],
    osric: ['To the gate! They are through the hedge!', 'The east side now! Watch the east side!', 'Held. I will be mending that hedge till midsummer.'],
    wymond: ['Stand behind me, child. Well. Behind somebody.', 'Again? Have they no homes to go to?', 'Thank you. I shall say so where it counts.'],
  },
  cinderford: {
    hasket: ['Watch, to me! They are coming down the road!', 'Second band! Hold the line where you stand!', 'Held. Count heads, then count them again.'],
    colm: ['Not the clamps! A month of burning in those!', 'More? I have only the one shovel.', 'Still standing. So is the charcoal, thank you.'],
    ysolt: ['I ran from this once already.', 'They keep coming. They always keep coming.', 'It held. I did not think it would hold.'],
  },
  frostwatch: {
    garrick: ['To the wall! Something is on the road!', 'Another band, from the other side. To the wall!', 'The fort stands. It has stood through worse, but not by much.'],
  },
};
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// A world boss's name as said in a line: the part before its first comma, in ordinary letters ("Veyrasz", "the Moon-Eater").
const bossName = (B) => { const n = WILD_NAMES[B.id] || B.key; return n.split(',')[0].toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/^The /, 'the ').replace(/ Of /g, ' of ').replace(/ The /g, ' the '); };
// (Their names: src/core/wilds.js WILD_VARIANTS, by the boss's body.)
const WILD_NAMES = Object.fromEntries(Object.entries(WILD_VARIANTS).map(([id, v]) => [id, v.name]));
// What the Heralds' fall says of their gods (docs/ELDER-DRAGONS.md).
const HERALD_FALL = {
  thyrraxis: 'The wind drops all at once. Somewhere past the door in the Crown of Teeth, the storm god turns in its sleep.',
  kaldurra: 'The ground goes cold under your feet. Somewhere past the door in the Crown of Teeth, the hearth god turns in its sleep.',
  morvekh: 'The frost on everything runs to water. Somewhere past the door in the Crown of Teeth, the cold god turns in its sleep.',
  nihvaroth: 'For a moment there are no stars at all. Somewhere past the door in the Crown of Teeth, the Hollow Star turns in its sleep.',
};

export class WildsUI {
  // o: xp(amount), drop(x, y, z, kind), sound(), log(text) (the chat log, if there is one)
  constructor(o) {
    this.o = o;
    this.found = new Set(); this.taken = new Set();
    this.counts = { tears: 0, cleared: 0, meetings: 0, raids: 0, bounties: 0 };
    this.bounty = null; this.bountyNext = 0; this.lastBounty = '';
    const el = (id, cls) => { const d = document.createElement('div'); d.id = id; if (cls) d.className = cls; return d; };
    this.banner = el('wildBanner'); this.banner.innerHTML = '<b></b><i></i>';
    this.track = el('wildTrack'); this.track.innerHTML = '<b></b><i></i><u><s></s></u>';
    // (On a phone they go in the stack under the top bar with the foe's bar and the tip, src/ui/hud.css #topStack, so they
    // take their turn there and cover nothing; on a desk they hang under the foe's bar.)
    const stack = o.touch ? document.getElementById('topStack') : null;
    (stack || document.getElementById('hud') || document.body).append(this.track, this.banner);
    this.state = null;      // { title, sub, until (ms, or 0), of (seconds the bar is out of) }
    this.tearNear = null;
    this.tearAt = null;     // { kind, x, z, fight }: the open tear in sight, for whoever asks (calls)
    this.raidOn = null;     // { n }: the town being raided
    this.bossOn = null;     // { i, x, z, until (ms), called, fight, lvl }: a world boss risen, or being fought (src/sim/worldboss.js)
    this.rescueOn = null;   // { x, z, life }: travellers on the road with something at them
    setInterval(() => this.tick(), 250);
  }

  save() { return { found: [...this.found], taken: [...this.taken], counts: this.counts, bounty: this.bounty }; }
  load(d) { this.found = new Set(d?.found || []); this.taken = new Set(d?.taken || []); this.counts = { tears: 0, cleared: 0, meetings: 0, raids: 0, bounties: 0, ...(d?.counts || {}) }; this.bounty = OUTPOSTS.some((o) => o.key === d?.bounty?.key) ? d.bounty : null; this.show(null); }

  say(title, sub = '', secs = 4.5) {
    const b = this.banner;
    b.firstChild.textContent = title; b.lastChild.textContent = sub;
    b.classList.add('on');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => b.classList.remove('on'), secs * 1000);
    this.o.log?.(sub ? `${title}: ${sub}` : title);
  }

  show(s) {
    this.state = s;
    this.track.classList.toggle('on', !!s);
    if (s) { this.track.children[0].textContent = s.title; this.tick(); }
  }

  // What the land is calling anyone at p ([x, z]) to, most pressing first (WILD_CALLS in src/core/wilds.js): a town being
  // raided, an open tear in sight (fight: it's begun), a small thing to find close by, the bounty in hand. Each with where
  // it is, how hard (lvl) and what it's called. Auto-play asks (src/ui/autobrain.js wildJob).
  calls(p) {
    const out = [];
    if (this.raidOn) { const T = SITES[RAID_TOWNS[this.raidOn.n]]; out.push({ why: 'raid', x: T.x, z: T.z, lvl: level(T.x, T.z), name: T.name }); }
    const t = this.tearAt;
    if (t) out.push({ why: 'tear', x: t.x, z: t.z, lvl: level(t.x, t.z), fight: t.fight, name: TEARS_KINDS[t.kind].name });
    let best = -1, bd = 60;
    for (let i = 0; i < FINDS.length; i++) { if (this.taken.has(i)) continue; const d = Math.hypot(FINDS[i][0] - p[0], FINDS[i][1] - p[1]); if (d < bd) { bd = d; best = i; } }
    if (best >= 0) out.push({ why: 'find', x: FINDS[best][0], z: FINDS[best][1], lvl: 0, name: FOUND[FIND_KINDS[FINDS[best][2]]] || 'something' });
    const O = this.bounty && OUTPOSTS.find((o) => o.key === this.bounty.key);
    if (O) out.push({ why: 'bounty', x: O.x, z: O.z, lvl: FACTIONS[O.faction].lvl, name: O.name, key: O.key });
    // (A world boss, risen or being fought: where, how hard, and whether the fight's begun.)
    const W = this.bossOn;
    if (W && (W.fight || performance.now() < W.until)) out.push({ why: 'boss', x: W.x, z: W.z, lvl: W.lvl, fight: !!W.fight, name: bossName(WORLD_BOSSES[W.i]), key: WORLD_BOSSES[W.i].key, d: Math.hypot(W.x - p[0], W.z - p[1]) });
    const R = this.rescueOn;
    if (R && R.life > 0) out.push({ why: 'rescue', x: R.x, z: R.z, lvl: R.lvl, name: 'the travellers' });
    return out;
  }

  // A bounty: come into a town with none in hand and its people name a chief they want dead, at an outpost some way off.
  // It's shown in the tracker whenever nothing else is, with how far and which way; emptying that outpost pays it.
  bountyTick() {
    const p = this.o.pos?.();
    if (!p) return null;
    if (!this.bounty) {
      if (performance.now() < this.bountyNext) return null;
      const B = BOARDS.find((b) => Math.hypot(p[0] - b.x, p[1] - b.z) < b.r + 15);
      if (!B) return null;
      const near = OUTPOSTS.filter((o) => o.key !== this.lastBounty).map((o) => [o, Math.hypot(o.x - B.x, o.z - B.z)]).filter(([, d]) => d > 250 && d < 2200).sort((a, b) => a[1] - b[1]).slice(0, 5);
      if (!near.length) return null;
      const [O, d] = near[Math.floor(Math.random() * near.length)];
      this.bounty = { key: O.key, town: B.name };
      this.say('A BOUNTY', `${B.name} will pay for whoever leads ${O.name.replace(/^an? /, 'the ')}: ${Math.round(d / 10) * 10} m to the ${wayTo(O.x - B.x, O.z - B.z)}.`, 6);
    }
    const O = OUTPOSTS.find((o) => o.key === this.bounty.key);
    if (!O) { this.bounty = null; return null; }
    const d = Math.hypot(O.x - p[0], O.z - p[1]);
    // (Kept in hand, but not shown from a country away: a line of "9600 m to the west" over everything else on the Sill, under
    // a new quest's toast, read as where that quest was. The critics, docs/FIRST-VISIT.md.)
    if (d > BOUNTY_SHOWN) return null;
    return { title: `BOUNTY · ${O.name.replace(/^(an?|the) /, '').toUpperCase()}`, sub: d < O.r + 40 ? 'Here. Kill its chief and all its own' : `${Math.round(d / 10) * 10} m to the ${wayTo(O.x - p[0], O.z - p[1])}` };
  }

  tick() {
    let s = this.state;
    // (A world boss called and waiting: where it is, and how long it'll wait.)
    const W = this.bossOn;
    if (!s && W && !W.fight && W.called) {
      const p = this.o.pos?.();
      if (p && performance.now() < W.until) {
        const B = WORLD_BOSSES[W.i], d = Math.hypot(W.x - p[0], W.z - p[1]);
        s = { title: `WORLD BOSS · ${(WILD_NAMES[B.id] || '').split(',')[0]}`, sub: d < 60 ? 'Here' : `${Math.round(d / 10) * 10} m to the ${wayTo(W.x - p[0], W.z - p[1])}`, until: W.until, secs: W.secs };
        this.track.classList.add('on');
        this.track.children[0].textContent = s.title;
      } else if (p) this.bossOn = null;
    }
    if (!s) {
      // (Nothing on: the bounty in hand, if there is one. Not down a delve: it's the land's.)
      s = this.bountyTick();
      const p = this.o.pos?.();
      if (s && p && inDungeon(p[0], p[1])) s = null;
      this.track.classList.toggle('on', !!s);
      if (!s) return;
      this.track.children[0].textContent = s.title;
    }
    const left = s.until ? Math.max(0, (s.until - performance.now()) / 1000) : 0;
    this.track.children[1].textContent = s.until ? `${s.sub} · ${clock(left)}` : s.sub;
    const bar = this.track.children[2];
    bar.style.display = s.until || s.of ? '' : 'none';
    bar.firstChild.style.width = `${s.until ? left / s.secs * 100 : s.of ? s.done / s.of * 100 : 0}%`;
  }

  on(code, a, b, c, d, e, f) {
    const o = this.o;
    switch (code | 0) {
      case WILD.TEAR_NEAR: {
        const K = TEARS_KINDS[a | 0];
        this.tearNear = K; this.tearAt = { kind: a | 0, x: b, z: c, fight: false };
        this.say(K.name, 'The world is torn open near here. Walk into it to face what is behind it.', 5);
        this.show({ title: K.name, sub: 'Walk into it' });
        break;
      }
      case WILD.TEAR_GONE: this.tearNear = null; this.tearAt = null; if (this.state && !this.state.fight) this.show(null); break;
      case WILD.TEAR_STAGE: {
        const K = TEARS_KINDS[a | 0], stage = b | 0;
        if (this.tearAt) this.tearAt.fight = true;
        const sub = stage === 1 ? 'The first through' : stage === 2 ? 'The second wave, and who leads it' : stage === 3 ? 'Bonus: kill them before the clock runs out' : e ? 'A COLOSSUS comes through' : 'Its lord comes through';
        this.show({ title: K.name, sub, fight: true, done: 0, of: c | 0, secs: d, until: d ? performance.now() + d * 1000 : 0, base: sub });
        if (stage === 3) this.say('BONUS WAVE', `Kill them all in ${TEAR.bonusFor} seconds.`, 3);
        else if (stage === 4) { if (e) o.stinger?.('fell'); this.say(e ? 'A COLOSSUS' : 'ITS LORD', e ? 'Three tears sealed, and something vast has noticed.' : 'What tore the world open comes through itself.', 3.5); }
        break;
      }
      case WILD.TEAR_COUNT: if (this.state?.fight) { this.state.done = a | 0; this.state.of = b | 0; this.state.sub = `${this.state.base} · ${a | 0} of ${b | 0}`; this.tick(); } break;
      case WILD.TEAR_SEALED: {
        const K = TEARS_KINDS[a | 0], lvl = e | 0, bonus = f | 0;
        this.counts.tears++; this.tearAt = null; this.tearNear = null;
        o.stinger?.('triumph');
        const xp = Math.round((250 + lvl * 45) * (bonus ? 1.5 : 1));
        o.xp(xp);
        o.drop(b, c, d, lvl >= 14 ? 21 : 20);
        if (bonus) o.drop(b, c, d, 8);
        this.say('TEAR SEALED', `${K.name.replace('A TEAR', 'The tear')} is shut. ${xp} experience${bonus ? ', and the bonus' : ''}. (${this.counts.tears} sealed)`, 6);
        this.show(null);
        break;
      }
      case WILD.TEAR_LOST: this.tearAt = null; this.tearNear = null; this.say('THE TEAR HOLDS', 'You left it open. It will be there when you come back.', 4); this.show(null); break;
      case WILD.FOUND: {
        const O = OUTPOSTS[a | 0];
        if (!O || this.found.has(O.key)) break;
        this.found.add(O.key);
        o.stinger?.('found');
        const xp = 20 + FACTIONS[O.faction].lvl * 3;
        o.xp(xp);
        this.say(O.name.replace(/^(an?|the) /, '').toUpperCase(), `Found. It is held by ${SIDES[FACTIONS[O.faction].side] || 'something'}.`, 4);
        break;
      }
      case WILD.CLEARED: {
        const O = OUTPOSTS[a | 0];
        if (!O) break;
        this.counts.cleared++;
        const lvl = FACTIONS[O.faction].lvl, xp = 80 + lvl * 18;
        o.xp(xp);
        o.drop(b, c, d, lvl >= 13 ? 20 : 8);
        if (this.bounty?.key === O.key) {
          const pay = xp * 3;
          this.counts.bounties++; this.lastBounty = O.key;
          o.xp(pay); o.drop(b, c, d, 20);
          o.stinger?.('triumph');
          this.say('BOUNTY PAID', `${this.bounty.town} pays what it promised. ${xp + pay} experience in all.`, 6);
          this.bounty = null; this.bountyNext = performance.now() + 45000;
          break;
        }
        this.say('CLEARED', `${O.name.replace(/^an? /, 'the ').replace(/^t/, 'T')} is yours, for a while. ${xp} experience.`, 5);
        break;
      }
      case WILD.CACHE: {
        const i = a | 0, kind = FIND_KINDS[FINDS[i]?.[2]];
        if (this.taken.has(i)) break;
        this.taken.add(i);
        const xp = 15 + level(b, d) * 4;
        o.xp(xp);
        o.drop(b, c, d, level(b, d) >= 12 ? 8 : 6);
        this.say(FOUND[kind] || 'SOMETHING LEFT BEHIND', `Somebody put a little by here, and never came back for it. ${xp} experience.`, 4);
        break;
      }
      case WILD.MEET: {
        const M = MEETINGS[a | 0], A = FACTIONS[FACTION_KEYS[b | 0]], B = c >= 0 ? FACTIONS[FACTION_KEYS[c | 0]] : null;
        if (!M) break;
        const who = SIDES[A?.side] || 'something';
        if ((c | 0) === -2) { this.say('THE RITUAL IS DONE', 'You were too slow. What they called has come.', 4); this.show({ title: M.name, sub: 'Kill what they raised', fight: true }); break; }
        const sub = M.key === 'skirmish' ? `${who} against ${SIDES[B?.side] || 'something'}: let them thin each other, or wade in`
          : M.key === 'warband' ? `${who} are marching up the road at you`
            : M.key === 'bounty' ? `One of ${who}'s chiefs is out with only a few of its own`
              : M.key === 'ritual' ? 'Stop them before it is finished'
                : M.key === 'duel' ? 'Two sorcerers are settling something. The winner will be tired'
                  : M.key === 'drake' ? 'Something with wings has seen you'
                    : M.key === 'ambush' ? `${who} were lying in wait, both sides of the road`
                      : M.key === 'rescue' ? `Folk on the road ahead, and ${who} on them: get there before they break`
                        : M.key === 'heroes' ? `Some of the other Tessariels are at grips with ${who} on the road ahead` : `${who}, out looking for something to kill`;
        if (M.key === 'rescue') { this.rescueOn = { x: e, z: f, life: 100, lvl: 0 }; o.rescue?.('start', e, f); }
        this.say(M.name, sub.charAt(0).toUpperCase() + sub.slice(1) + '.', 4.5);
        this.show({ title: M.name, sub: M.key === 'ritual' ? 'Stop the ritual' : M.key === 'rescue' ? 'Save them' : sub.charAt(0).toUpperCase() + sub.slice(1), fight: true, rescue: M.key === 'rescue', secs: d, until: d ? performance.now() + d * 1000 : 0 });
        if (M.key === 'ambush') o.stinger?.('fell');
        break;
      }
      case WILD.MEET_DONE: {
        const M = MEETINGS[a | 0], lvl = e | 0, won = f | 0;
        if (M?.key === 'rescue') { o.rescue?.(won === 3 ? 'saved' : won === -1 ? 'gone' : 'over', b, d); this.rescueOn = null; }
        if (won === 3 || won === 4) {
          // The travellers: saved (paid in thanks and what they carry), or run off, and the fight still yours.
          this.counts.meetings++;
          const xp = Math.round((50 + lvl * 10) * (won === 3 ? 2.2 : 1));
          o.xp(xp); o.drop(b, c, d, won === 3 ? 8 : 6);
          if (won === 3) { this.counts.rescues = (this.counts.rescues || 0) + 1; o.drop(b, c, d, 6); }
          this.say(won === 3 ? 'THE TRAVELLERS ARE SAFE' : 'TOO LATE FOR THEM', won === 3 ? `They'll tell it on the road. ${xp} experience, and what they could spare.` : `They ran for it. ${xp} experience.`, 4.5);
        } else if (won > 0) {
          this.counts.meetings++;
          const xp = Math.round((50 + lvl * 10) * (won === 2 ? 1.5 : 1) * (M?.key === 'bounty' || M?.key === 'drake' ? 1.6 : 1));
          o.xp(xp);
          if (M?.key !== 'pack') o.drop(b, c, d, M?.key === 'bounty' || M?.key === 'drake' ? 8 : 6);
          this.say(won === 2 ? 'RITUAL BROKEN' : M?.key === 'bounty' ? 'A NAMED ONE IS DEAD' : 'DONE WITH', `${xp} experience.`, 3.5);
        }
        this.show(this.tearNear ? { title: this.tearNear.name, sub: 'Walk into it' } : null);
        break;
      }
      case WILD.RESCUE: {
        const left = a | 0;
        if (this.rescueOn) this.rescueOn.life = left;
        o.rescue?.(left > 0 ? 'hurt' : 'fled', b, c, left);
        if (this.state?.fight && this.state.rescue) { this.state.sub = left > 0 ? `Save them · they're holding, ${left}%` : 'They broke and ran. Deal with what was on them'; this.tick(); }
        if (left <= 0) this.say('THEY RUN FOR IT', 'The travellers broke and ran. What was on them is on you now.', 3.5);
        break;
      }
      case WILD.HEROES: break;
      case WILD.BOSS_RISE: {
        const B = WORLD_BOSSES[a | 0], wait = d | 0, called = (e | 0) === 1, lvl = f | 0;
        if (!B) break;
        const p = this.o.pos?.(), dist = p ? Math.hypot(b - p[0], c - p[1]) : 0, way = p ? wayTo(b - p[0], c - p[1]) : '';
        const name = (WILD_NAMES[B.id] || B.key).split(',')[0];
        this.bossOn = { i: a | 0, x: b, z: c, until: performance.now() + (wait || 300) * 1000, secs: wait || 300, called, fight: false, lvl };
        o.stinger?.('fell');
        if (called) {
          this.say(`WORLD BOSS: ${WILD_NAMES[B.id] || name}`, `${B.title}. It has risen ${Math.round(dist / 10) * 10} m to the ${way}, and the other Tessariels are going to it. It will wait ${Math.round(wait / 60)} minutes.`, 7);
          o.call?.(`${name} has risen ${Math.round(dist / 10) * 10} metres to the ${way}! The other Tessariels are going`);
        } else this.say(`WORLD BOSS: ${WILD_NAMES[B.id] || name}`, `In a clearing ${Math.round(dist / 10) * 10} m to the ${way}: some of the other Tessariels already have it at bay. Join them.`, 6);
        o.bossMark?.(B, b, c, called, name);
        break;
      }
      case WILD.BOSS_FIGHT: {
        const B = WORLD_BOSSES[a | 0];
        if (!B) break;
        if (this.bossOn) this.bossOn.fight = true;
        if ((b | 0) >= 0) o.bossBar?.(WILD_NAMES[B.id] || B.key, b | 0, B.title);
        break;
      }
      case WILD.BOSS_CALL: { const key = BOSS_MOVE_KEYS[b | 0]; if (key && BOSS_MOVES[key]) o.call?.(BOSS_MOVES[key].call); break; }
      case WILD.BOSS_DOWN: {
        const B = WORLD_BOSSES[a | 0], lvl = e | 0, yours = (f | 0) === 1;
        this.bossOn = null; o.bossBar?.(null); o.bossMark?.(null);
        if (!B) break;
        o.stinger?.('triumph');
        if (yours) {
          this.counts.bosses = (this.counts.bosses || 0) + 1;
          const xp = Math.round(900 + lvl * 160);
          o.xp(xp);
          for (const k of [21, 21, 20, 8]) o.drop(b, c, d, k);
          this.say(`${(WILD_NAMES[B.id] || B.key).split(',')[0]} IS DEAD`, B.god ? `${HERALD_FALL[B.god]} ${xp} experience.` : `The land's greatest, and you were in it. ${xp} experience, and what it guarded.`, 8);
        } else this.say(`${(WILD_NAMES[B.id] || B.key).split(',')[0]} IS DEAD`, B.god ? HERALD_FALL[B.god] : 'The other Tessariels brought it down without you.', 6);
        o.bossDown?.(B.key, yours);
        this.show(null);
        break;
      }
      case WILD.BOSS_GONE: {
        const B = WORLD_BOSSES[a | 0];
        this.bossOn = null; o.bossBar?.(null); o.bossMark?.(null);
        if (!B) break;
        const n = (WILD_NAMES[B.id] || B.key).split(',')[0];
        this.say(n, (b | 0) === 0 ? 'Nobody came to it in time, and it has gone back where it came from.' : (b | 0) === 2 ? 'It beat you all, and has gone back where it came from, whole.' : 'You left it, and it has gone back where it came from.', 4.5);
        break;
      }
      case WILD.HELP: this.say('ANOTHER TESSARIEL', (a | 0) > 1 ? 'Two more saw the light, and have come to the tear.' : 'Somebody else saw the light, and has come to the tear.', 3.5); break;
      case WILD.RAID: {
        const T = SITES[RAID_TOWNS[a | 0]], A = FACTIONS[FACTION_KEYS[b | 0]], who = SIDES[A?.side] || 'Something', wave = c | 0;
        const title = `${T.name.toUpperCase()} IS RAIDED`;
        this.raidOn = { n: a | 0 };
        if (wave === 1) o.stinger?.('fell');
        for (const [id, lines] of Object.entries(RAID_WORDS[RAID_TOWNS[a | 0]] || {})) o.folkSay?.(id, lines[wave - 1]);
        const sub = wave === 1 ? `${who.charAt(0).toUpperCase() + who.slice(1)} are coming down on it` : 'A second band, from another side';
        if (wave === 1) this.say(title, `${sub}.${(e | 0) > 0 ? ` ${e | 0} of the other Tessariels have come out of its seal to hold it with you.` : ''}`, 6);
        else this.say('A SECOND BAND', 'They are not done with it. From another side.', 3.5);
        this.show({ title, sub, fight: true, done: 0, of: d | 0, base: sub });
        break;
      }
      case WILD.RAID_COUNT: if (this.state?.fight) { this.state.done = a | 0; this.state.of = b | 0; this.state.sub = `${this.state.base} · ${a | 0} of ${b | 0}`; this.tick(); } break;
      case WILD.RAID_DONE: {
        const T = SITES[RAID_TOWNS[a | 0]], lvl = e | 0, won = f | 0;
        this.raidOn = null;
        if (won) { for (const [id, lines] of Object.entries(RAID_WORDS[RAID_TOWNS[a | 0]] || {})) o.folkSay?.(id, lines[2]); o.stinger?.('triumph'); }
        if (won === 1) {
          this.counts.raids++;
          const xp = 200 + lvl * 35;
          o.xp(xp); o.drop(b, c, d, lvl >= 12 ? 20 : 8);
          this.say(`${T.name.toUpperCase()} STANDS`, `The raid is broken. ${xp} experience, and what its people could spare.`, 6);
        } else if (won === 2) this.say(`${T.name.toUpperCase()} STANDS`, 'The other Tessariels held it without you.', 4);
        else this.say(`${T.name.toUpperCase()} IS LEFT TO IT`, 'You walked away from the raid.', 4);
        this.show(null);
        break;
      }
      default:
    }
  }
}
