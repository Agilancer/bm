// The living land on the page: what the sim says is happening out there (EV.WILD, src/sim/wilds.js), told and paid for.
// A banner across the top for what's begun or done, a small tracker under it while something's on (a tear's waves and
// its clock, a meeting, a ritual's time), and the rewards: experience and what's left on the ground (src/items/drops.js).
// What you've found and the caches you've opened are kept in the save, so neither pays twice.
import { SITES } from '../core/lands.js';
import { FACTIONS, FACTION_KEYS, MEETINGS, RAID_TOWNS, TEARS_KINDS, TEAR, WILD } from '../core/wilds.js';
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
const wayTo = (dx, dz) => WAYS[Math.round(Math.atan2(dx, -dz) / (Math.PI / 4) + 8) % 8];
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

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
    (document.getElementById('hud') || document.body).append(this.banner, this.track);
    this.state = null;      // { title, sub, until (ms, or 0), of (seconds the bar is out of) }
    this.tearNear = null;
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
    return { title: `BOUNTY · ${O.name.replace(/^(an?|the) /, '').toUpperCase()}`, sub: d < O.r + 40 ? 'Here. Kill its chief and all its own' : `${Math.round(d / 10) * 10} m to the ${wayTo(O.x - p[0], O.z - p[1])}` };
  }

  tick() {
    let s = this.state;
    if (!s) {
      // (Nothing on: the bounty in hand, if there is one.)
      s = this.bountyTick();
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
        this.tearNear = K;
        this.say(K.name, 'The world is torn open near here. Walk into it to face what is behind it.', 5);
        this.show({ title: K.name, sub: 'Walk into it' });
        break;
      }
      case WILD.TEAR_GONE: this.tearNear = null; if (this.state && !this.state.fight) this.show(null); break;
      case WILD.TEAR_STAGE: {
        const K = TEARS_KINDS[a | 0], stage = b | 0;
        const sub = stage === 1 ? 'The first through' : stage === 2 ? 'The second wave, and who leads it' : stage === 3 ? 'Bonus: kill them before the clock runs out' : e ? 'A COLOSSUS comes through' : 'Its lord comes through';
        this.show({ title: K.name, sub, fight: true, done: 0, of: c | 0, secs: d, until: d ? performance.now() + d * 1000 : 0, base: sub });
        if (stage === 3) this.say('BONUS WAVE', `Kill them all in ${TEAR.bonusFor} seconds.`, 3);
        else if (stage === 4) this.say(e ? 'A COLOSSUS' : 'ITS LORD', e ? 'Three tears sealed, and something vast has noticed.' : 'What tore the world open comes through itself.', 3.5);
        break;
      }
      case WILD.TEAR_COUNT: if (this.state?.fight) { this.state.done = a | 0; this.state.of = b | 0; this.state.sub = `${this.state.base} · ${a | 0} of ${b | 0}`; this.tick(); } break;
      case WILD.TEAR_SEALED: {
        const K = TEARS_KINDS[a | 0], lvl = e | 0, bonus = f | 0;
        this.counts.tears++;
        const xp = Math.round((250 + lvl * 45) * (bonus ? 1.5 : 1));
        o.xp(xp);
        o.drop(b, c, d, lvl >= 14 ? 21 : 20);
        if (bonus) o.drop(b, c, d, 8);
        this.say('TEAR SEALED', `${K.name.replace('A TEAR', 'The tear')} is shut. ${xp} experience${bonus ? ', and the bonus' : ''}. (${this.counts.tears} sealed)`, 6);
        this.show(null);
        break;
      }
      case WILD.TEAR_LOST: this.say('THE TEAR HOLDS', 'You left it open. It will be there when you come back.', 4); this.show(null); break;
      case WILD.FOUND: {
        const O = OUTPOSTS[a | 0];
        if (!O || this.found.has(O.key)) break;
        this.found.add(O.key);
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
                  : M.key === 'drake' ? 'Something with wings has seen you' : `${who}, out looking for something to kill`;
        this.say(M.name, sub.charAt(0).toUpperCase() + sub.slice(1) + '.', 4.5);
        this.show({ title: M.name, sub: M.key === 'ritual' ? 'Stop the ritual' : sub.charAt(0).toUpperCase() + sub.slice(1), fight: true, secs: d, until: d ? performance.now() + d * 1000 : 0 });
        break;
      }
      case WILD.MEET_DONE: {
        const M = MEETINGS[a | 0], lvl = e | 0, won = f | 0;
        if (won > 0) {
          this.counts.meetings++;
          const xp = Math.round((50 + lvl * 10) * (won === 2 ? 1.5 : 1) * (M?.key === 'bounty' || M?.key === 'drake' ? 1.6 : 1));
          o.xp(xp);
          if (M?.key !== 'pack') o.drop(b, c, d, M?.key === 'bounty' || M?.key === 'drake' ? 8 : 6);
          this.say(won === 2 ? 'RITUAL BROKEN' : M?.key === 'bounty' ? 'A NAMED ONE IS DEAD' : 'DONE WITH', `${xp} experience.`, 3.5);
        }
        this.show(this.tearNear ? { title: this.tearNear.name, sub: 'Walk into it' } : null);
        break;
      }
      case WILD.HELP: this.say('ANOTHER TESSARIEL', (a | 0) > 1 ? 'Two more saw the light, and have come to the tear.' : 'Somebody else saw the light, and has come to the tear.', 3.5); break;
      case WILD.RAID: {
        const T = SITES[RAID_TOWNS[a | 0]], A = FACTIONS[FACTION_KEYS[b | 0]], who = SIDES[A?.side] || 'Something', wave = c | 0;
        const title = `${T.name.toUpperCase()} IS RAIDED`;
        const sub = wave === 1 ? `${who.charAt(0).toUpperCase() + who.slice(1)} are coming down on it` : 'A second band, from another side';
        if (wave === 1) this.say(title, `${sub}.${(e | 0) > 0 ? ` ${e | 0} of the other Tessariels have come out of its seal to hold it with you.` : ''}`, 6);
        else this.say('A SECOND BAND', 'They are not done with it. From another side.', 3.5);
        this.show({ title, sub, fight: true, done: 0, of: d | 0, base: sub });
        break;
      }
      case WILD.RAID_COUNT: if (this.state?.fight) { this.state.done = a | 0; this.state.of = b | 0; this.state.sub = `${this.state.base} · ${a | 0} of ${b | 0}`; this.tick(); } break;
      case WILD.RAID_DONE: {
        const T = SITES[RAID_TOWNS[a | 0]], lvl = e | 0, won = f | 0;
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
