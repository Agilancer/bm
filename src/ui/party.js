// Your party, of the Free Company: the quartermasters' panel (hire up to four, let them go), the frames down the left with
// each one's life, and the Hollowfang Warrens' calls, the boss's bar and the word at the portal (src/sim/dungeon.js).
//
// Who can be hired is whoever of the other Tessariels isn't hired already (src/core/heroes.js makeCast): the quartermaster
// gives each a name of the Company's and a level near yours, and the sim takes the body into your party (HeroWorld.hire).
// Lancers take the blows, paladins heal, everyone else does the damage (roleOf in src/core/dungeon.js).
//
// Everyone you've had along stays on your roster, as an old companion: the quartermaster offers them again, with the gear
// you gave them (src/items/partygear.js) and the skill tree you or they spent (src/core/partytree.js). They go on levelling
// as you do, and for every four levels you've gone past where you last had them along they come by a piece of middling
// gear of their own (catchUp), so one you haven't asked for in twenty levels is still fit to stand beside you.
import { art } from './skin.js';
import { CAPS, HG_STATS, SHIELD_PLACE, catchUp, fits, gearStats, kindsOf, score } from '../items/partygear.js';
import { autoSpend, freshTree, treeMods } from '../core/partytree.js';
import { makeRng } from '../items/items.js';
import { CLASSES, CLASS_NAMES } from '../core/heroes.js';
import { movesOf } from '../sim/heroskills.js';
import { BOSSES, DELVE, DELVES, PARTY, WARNINGS, roleOf } from '../core/dungeon.js';
import { C, CHARS_START, C_HERO, C_SIZE } from '../core/layout.js';
import { priceText } from '../folk/shops.js';
import { CLOSE_X } from './menu-x.js';

// (A role's mark: the painted one from the art kit where there is one, src/ui/skin.js, else its sign.)
const roleMark = (r) => { const pic = art('icons', `role_${r}`); return pic ? `<img src="${pic}" alt="" style="width:1.25em;height:1.25em;vertical-align:-.25em">` : ROLE[r][2]; };
const ROLE = { tank: ['Tank', '#7fb6ff', '⛨'], heal: ['Healer', '#8fe0a0', '✚'], dps: ['Damage', '#ff9a7a', '⚔'] };
const OFFERS = 6;
// How many moves a class has at a level, past the ones it starts with: shown on the books, and told when one's come by.
const movesAt = (cls, level) => movesOf(cls, level);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// What a sword-arm costs, in copper, for as long as you keep them: by their level.
export const hirePrice = (level) => (6 + level * 2) * 10;
const ROSTER_MAX = 40;   // old companions kept: past it the longest gone are forgotten, those with gear last
const CATCH_STEP = 4;    // levels of yours, past where you last had one along, for each piece they come by
export const BAG_MAX = 24;   // pieces of gear a companion carries in their own bag, beside what they wear

export class PartyUI {
  // o: { base, cast, sim (the worker), pack, level () => the player's level, firstHero () => the first hero's char index,
  //      tip (text, secs), opened, closed, click, heroTalk }
  constructor(o) {
    Object.assign(this, o);
    this.members = [];         // { slot, name, level, off, cls, rid }
    this.roster = [];          // everyone you've had along: { id, body, cls, sex, kit, name, off, level, lastWith, caught, gear, tree, got, seen }
    this.nextId = 1;
    this.rng = makeRng((Math.random() * 2 ** 32) >>> 0);
    this.open = null;          // the quartermaster whose panel is up
    this.offers = null; this.offersFor = -1;
    this.boss = null;          // { key, ids, name }
    this.warrens = null;       // the sim's last word on the fight (auto-play reads it too)
    this.clears = 0;           // how often the Warrens have been cleared in this game (auto-play's dungeon runs read it)
    this.clearsBy = {};        // and each party dungeon, by its key (src/core/dungeon.js DELVES)
    this.names = null;
    fetch(`${this.base}assets/game/heroes/names.json`).then((r) => r.json()).then((n) => { this.names = n; }).catch(() => {});
    this.buildDom();
    window.addEventListener('keydown', (e) => this.key(e));
  }

  buildDom() {
    const css = document.createElement('style');
    css.textContent = `
      #partyFrames { position: fixed; left: 14px; top: 34%; z-index: 5; display: flex; flex-direction: column; gap: 5px; pointer-events: none; font-family: Georgia, serif; }
      #partyFrames .pf { width: 184px; padding: 4px 7px 5px; background: rgba(8,6,4,.62); border: 1px solid rgba(140,115,68,.5); border-radius: 4px; }
      #partyFrames .pf .nm { display: flex; gap: 6px; align-items: baseline; font-size: 12.5px; color: #e9dfc8; white-space: nowrap; overflow: hidden; }
      #partyFrames .pf .nm em { font-style: normal; font-size: 11px; opacity: .75; margin-left: auto; }
      #partyFrames .pf .bar { height: 7px; margin-top: 3px; background: rgba(0,0,0,.6); border-radius: 2px; overflow: hidden; }
      #partyFrames .pf .bar i { display: block; height: 100%; background: linear-gradient(#5fc46a, #2f8a3a); transition: width .15s; }
      #partyFrames .pf.low .bar i { background: linear-gradient(#e4a33a, #b4661c); }
      #partyFrames .pf.dead { opacity: .5; } #partyFrames .pf.dead .bar i { width: 0 !important; }
      #bossFrame { position: fixed; left: 50%; top: 52px; transform: translateX(-50%); z-index: 6; width: min(560px, 82vw); display: none; pointer-events: none; font-family: Cinzel, Georgia, serif; text-align: center; }
      #bossFrame .bn { font-size: 17px; color: #f1d68a; letter-spacing: .08em; text-shadow: 0 0 4px #000, 0 1px 2px #000; }
      #bossFrame .bb { height: 12px; margin-top: 4px; background: rgba(0,0,0,.7); border: 1px solid rgba(140,115,68,.7); border-radius: 2px; overflow: hidden; }
      #bossFrame .bb i { display: block; height: 100%; background: linear-gradient(#d0402c, #7c1a10); transition: width .2s; }
      #raidWarn { position: fixed; left: 50%; top: 22%; transform: translateX(-50%); z-index: 7; width: min(760px, 92vw); text-align: center; pointer-events: none;
        font: 700 22px/1.3 Georgia, serif; color: #ffcf6a; text-shadow: 0 0 6px #000, 0 2px 3px #000, 0 0 14px rgba(120,30,0,.8); }
      #raidWarn div { animation: rwIn .25s ease-out; transition: opacity .6s; margin-bottom: 6px; }
      @keyframes rwIn { from { opacity: 0; transform: scale(1.15); } to { opacity: 1; transform: none; } }
      #hirePanel { position: fixed; z-index: 12; left: 50%; bottom: max(3vh, 14px); transform: translateX(-50%); width: min(720px, 95vw); max-height: 78vh; overflow-y: auto; padding: 13px 18px 12px; display: none; flex-direction: column;
        background: rgba(11,9,7,.96); border: 1px solid var(--gold-dim, #8c7344); box-shadow: 0 10px 34px #000b; color: var(--bone, #e9dfc8); font-family: Georgia, serif; }
      #hirePanel .tk-head { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid rgba(140,115,68,.42); padding-bottom: 6px; margin-bottom: 8px; }
      #hirePanel .tk-name { font: 700 18px Cinzel, Georgia, serif; color: #bfe0ff; letter-spacing: .05em; }
      #hirePanel .tk-title { font-size: 13px; opacity: .62; font-style: italic; }
      #hirePanel .tk-purse { margin-left: auto; font-size: 13px; color: #f1d68a; }
      #hirePanel .tk-head .menu-x { align-self: center; margin: -6px -10px 0 4px; }
      #hirePanel .line { font-size: 15.5px; line-height: 1.45; margin-bottom: 8px; }
      #hirePanel h4 { margin: 8px 0 4px; font: 600 13px Georgia, serif; color: #c9a35c; letter-spacing: .08em; text-transform: uppercase; }
      #hirePanel ol { list-style: none; margin: 0; padding: 0; }
      #hirePanel li { display: flex; gap: 9px; align-items: baseline; padding: 4px 8px; cursor: pointer; font-size: 15px; color: #d6c8a5; border-radius: 3px; }
      #hirePanel li:hover { background: rgba(201,163,92,.15); color: #fff4da; }
      #hirePanel li.dim { opacity: .42; cursor: default; }
      #hirePanel li kbd { flex: none; min-width: 1.5em; text-align: center; font: 12px Georgia, serif; color: var(--gold-dim, #8c7344); border: 1px solid rgba(140,115,68,.5); border-radius: 3px; padding: 0 3px; }
      #hirePanel li .rl { flex: none; width: 1.3em; text-align: center; }
      #hirePanel li .pr { margin-left: auto; color: #f1d68a; font-size: 13px; }
      #hirePanel li .mv { margin-left: auto; font-size: 12px; opacity: .6; font-style: italic; }
      #hirePanel li .mv + .pr { margin-left: 12px; }
    `;
    document.head.appendChild(css);
    this.frames = document.createElement('div'); this.frames.id = 'partyFrames';
    this.bossEl = document.createElement('div'); this.bossEl.id = 'bossFrame';
    this.warnEl = document.createElement('div'); this.warnEl.id = 'raidWarn';
    this.panel = document.createElement('div'); this.panel.id = 'hirePanel';
    document.body.append(this.frames, this.bossEl, this.warnEl, this.panel);
    this.frameEls = [];
  }

  // ---- the party ---------------------------------------------------------------------------------------------------------

  isBroker(p) { return !!p?.broker; }
  member(slot) { return this.members.find((m) => m.slot === slot) || null; }
  roles() { const r = { tank: 0, heal: 0, dps: 0 }; for (const m of this.members) r[roleOf(m.cls)]++; return r; }
  full() { return this.members.length >= PARTY.size; }
  // Fit for the Warrens: four, with a tank and a healer among them.
  fit() { const r = this.roles(); return this.full() && r.tank >= 1 && r.heal >= 1; }

  // A name of the Company's for someone new: not one already about (taken: names given out just now, not yet on the roster).
  freshName(sex, taken) {
    const pool = (sex === 'f' ? this.names?.female : this.names?.male) || ['Bren', 'Talla', 'Osric', 'Mira', 'Corvin', 'Elsa', 'Dain', 'Hesk'];
    const used = new Set([...this.cast.map((c) => c.name), ...this.roster.map((e) => e.name), ...(taken || [])]);
    for (let t = 0; t < 30; t++) { const n = pool[Math.floor(Math.random() * pool.length)]; if (!used.has(n)) return n; }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Who the quartermaster has on his books today: everyone free, the first of each role first, a level about yours each.
  makeOffers() {
    const L = this.level();
    const free = this.cast.filter((c) => !c.broker && !this.member(c.slot));
    const by = { tank: [], heal: [], dps: [] };
    for (const c of free.sort(() => Math.random() - 0.5)) by[roleOf(c.cls)].push(c);
    // One of every class that's free, so a boomerang knight and a bard can always be had, as an archer or a rogue can; then
    // a second of each of the two the Warrens need.
    const seen = new Set(), one = [];
    for (const cls of CLASS_NAMES) { const c = free.find((x) => x.cls === cls); if (c) { one.push(c); seen.add(c); } }
    const more = [...by.tank, ...by.heal].filter((c) => !seen.has(c)).slice(0, 2);
    const order = { tank: 0, heal: 1, dps: 2 };
    const pickN = [...one, ...more].sort((a, b) => order[roleOf(a.cls)] - order[roleOf(b.cls)] || CLASS_NAMES.indexOf(a.cls) - CLASS_NAMES.indexOf(b.cls));
    const taken = new Set();
    this.offers = pickN.map((c) => {
      const off = Math.floor(Math.random() * 4) - 2;
      const level = Math.max(1, L + off), name = this.freshName(c.sex, taken);
      taken.add(name);
      return { slot: c.slot, cls: c.cls, sex: c.sex, name, level, off, price: hirePrice(level) };
    });
    this.offersAt = performance.now();
  }

  // o: an offer (makeOffers), or an old companion's (companionOffers: o.entry).
  hire(o, free = false) {
    if (this.full()) { this.tip('Your party is full: four is as many as the Company will send with you.', 3); return false; }
    const e0 = o.entry || null;
    if (e0 && this.members.some((m) => m.rid === e0.id)) return false;
    const slot = e0 ? this.slotFor(e0) : o.slot;
    if (slot == null || slot < 0 || this.member(slot)) { if (e0) this.tip(`${e0.name} can't be found about just now.`, 3); return false; }
    // (Nobody's paid in the Test Dungeon: src/ui/testhall.js.)
    if (!free && !this.freeHire?.() && !this.pack.pay(o.price)) { this.tip(`You can't pay ${priceText(o.price)}.`, 2.5); return false; }
    const c = this.cast[slot], L = this.level();
    const e = e0 || this.enrol(c, o);
    e.level = e0 ? Math.max(1, L + e.off) : o.level;
    if (e0 && o.level) e.level = o.level;   // (a save's own word on it)
    e.lastWith = L; e.caught = 0; e.got = 0; e.seen = Date.now();
    c.name = e.name; c.full = e.name; c.guild = 'The Free Company'; c.level = e.level;
    this.members.push({ slot, name: e.name, level: e.level, off: e.off ?? 0, cls: c.cls, rid: e.id });
    this.sim.postMessage({ type: 'hire', slot, name: e.name, level: e.level, stay: !!o.stay });
    this.heroTalk?.renamed?.(slot);
    if (this.offers) this.offers = this.offers.filter((x) => x.slot !== slot);
    this.dress(this.members.at(-1));
    this.changed();
    return true;
  }

  // Someone newly hired, onto the roster.
  enrol(c, o) {
    const e = { id: this.nextId++, body: c.body, cls: c.cls, sex: c.sex, kit: { ...(c.kit || {}) }, name: o.name, off: o.off ?? 0, level: o.level, lastWith: this.level(), caught: 0, gear: {}, bag: [], tree: freshTree(), got: 0, seen: Date.now() };
    this.roster.push(e);
    this.trimRoster();
    return e;
  }

  trimRoster() {
    if (this.roster.length <= ROSTER_MAX) return;
    const away = this.roster.filter((e) => !this.members.some((m) => m.rid === e.id));
    const has = (e) => (Object.keys(e.gear).length || e.bag?.length ? 1 : 0);
    away.sort((a, b) => has(a) - has(b) || a.seen - b.seen);
    const drop = new Set(away.slice(0, this.roster.length - ROSTER_MAX).map((e) => e.id));
    this.roster = this.roster.filter((e) => !drop.has(e.id));
  }

  // Which body in the world an old companion comes back in: their own, if it's about and free; else another of their class
  // and sex, of the same fighting style; else of their class. (The world holds only so many bodies at once: src/core/heroes.js.)
  slotFor(e) {
    const free = this.cast.filter((c) => !c.broker && !this.member(c.slot));
    const pickBy = (f) => free.find(f)?.slot;
    return pickBy((c) => c.body === e.body) ?? pickBy((c) => c.cls === e.cls && c.sex === e.sex && c.kit?.style === e.kit?.style)
      ?? pickBy((c) => c.cls === e.cls && c.kit?.style === e.kit?.style) ?? pickBy((c) => c.cls === e.cls) ?? -1;
  }

  entryOf(m) { return m ? this.roster.find((e) => e.id === m.rid) || null : null; }
  // A member as gear sees them (src/items/partygear.js fits): their class, sex and what they fight with in the body they're in.
  whoOf(m) {
    const e = this.entryOf(m), c = this.cast[m.slot];
    return { cls: m.cls, sex: e?.sex ?? c?.sex, body: e?.body ?? c?.body, kit: c?.kit || e?.kit, level: m.level, name: m.name, gear: e?.gear };
  }
  whoOfEntry(e) {
    const m = this.members.find((x) => x.rid === e.id);
    return m ? this.whoOf(m) : { cls: e.cls, sex: e.sex, body: e.body, kit: e.kit, level: e.level, name: e.name, gear: e.gear };
  }

  // What they hold: the body's own, with their gear's weapon and shield where its kind fits. { kit, pal } for the
  // renderer and the sim.
  kitFor(m) {
    const e = this.entryOf(m), base = { ...(this.cast[m.slot]?.kit || {}) }, pal = {};
    const kinds = kindsOf(base);
    const w = e?.gear.weapon, sh = e?.gear.off, place = SHIELD_PLACE(base);
    if (w && w.kind === kinds.weapon) { base.main = w.prop; pal.main = w.pal; }
    if (sh && sh.kind === kinds.off) { base[place] = sh.prop; pal[place] = sh.pal; }
    return { kit: base, pal };
  }

  // Their tree and gear, to the sim (src/sim/hero.js setMods).
  modsFor(m) {
    const e = this.entryOf(m);
    if (!e) return null;
    const t = treeMods(e.cls, e.tree), g = gearStats(e.gear), out = { ...t };
    for (const k of HG_STATS) out[k] = (t[k] || 0) + (g[k] || 0);
    for (const [k, cap] of Object.entries(CAPS)) out[k] = Math.min(cap, out[k]);
    out.kit = this.kitFor(m).kit;
    return out;
  }

  // Their tree spent if they spend their own, their numbers to the sim, and their looks to the renderer (looks: main.js).
  dress(m) {
    const e = this.entryOf(m);
    if (!e) return;
    if (e.tree.auto) autoSpend(e.cls, e.tree, e.level, roleOf(e.cls));
    this.sim.postMessage({ type: 'heroMods', slot: m.slot, mods: this.modsFor(m) });
    this.looks?.(m.slot, e, this.kitFor(m));
  }

  // Gear given in their book (src/ui/partybook.js): on, now. Hands back what it took the place of.
  equip(m, item) {
    const e = this.entryOf(m);
    if (!e || !fits(item, this.whoOf(m))) return null;
    const was = e.gear[item.slot] || null;
    e.gear[item.slot] = item;
    this.dress(m);
    this.onChange?.();
    return was;
  }
  unequip(m, slot) {
    const e = this.entryOf(m);
    const was = e?.gear[slot] || null;
    if (!was) return null;
    delete e.gear[slot];
    this.dress(m);
    this.onChange?.();
    return was;
  }
  // The best for them of what's given, slot by slot: { slot: item } of those that beat what they have on.
  bestFor(m, items) {
    const e = this.entryOf(m), who = this.whoOf(m), out = {};
    if (!e) return out;
    for (const it of items) { if (!fits(it, who)) continue; const cur = out[it.slot] || e.gear[it.slot]; if (score(it) > score(cur)) out[it.slot] = it; }
    return out;
  }

  // Whether anyone on the roster would be the better for a piece: auto-play keeps it for them, and sells it if not.
  wantedBy(item) {
    return this.roster.some((e) => fits(item, this.whoOfEntry(e)) && score(item) > score(e.gear[item.slot]));
  }

  // ---- their bags ------------------------------------------------------------------------------------------------------
  // Party gear you pick up isn't yours to carry: it goes in the bag of one of your party it's for (who it would be an
  // upgrade for first, then whoever has the most room), or, if none of them can use it, of an old companion who can, kept
  // for them with the Company. Null: nobody who can use it has room.
  homeFor(item) {
    const here = this.members.map((m) => this.entryOf(m)).filter(Boolean);
    const away = this.roster.filter((e) => !here.includes(e)).sort((a, b) => b.seen - a.seen);
    for (const list of [here, away]) {
      const ok = list.filter((e) => fits(item, this.whoOfEntry(e)) && (e.bag ||= []).length < BAG_MAX);
      if (!ok.length) continue;
      const up = (e) => (score(item) > score(e.gear[item.slot]) ? 1 : 0);
      return ok.sort((a, b) => up(b) - up(a) || a.bag.length - b.bag.length)[0];
    }
    return null;
  }
  // Into that bag: hands back whose it went in, or null. (with: true if they're with you.)
  stow(item) {
    const e = this.homeFor(item);
    if (!e) return null;
    e.bag.push(item);
    this.onChange?.();
    return { entry: e, with: this.members.some((m) => m.rid === e.id) };
  }
  // Why a piece can't be stowed, to say.
  noRoom(item) {
    const can = this.roster.filter((e) => fits(item, this.whoOfEntry(e)));
    if (!can.length) return `None of your companions can use the ${item.name}.`;
    return `${can.slice(0, 3).map((e) => e.name).join(' and ')}${can.length > 3 ? ' and the rest' : ''} ${can.length > 1 ? 'have' : 'has'} no room in their bag${can.length > 1 ? 's' : ''} for the ${item.name}.`;
  }
  // What the party with you carry, for a shop to buy through you: [{ entry, item }].
  bagged() {
    const out = [];
    for (const m of this.members) { const e = this.entryOf(m); for (const item of e?.bag || []) out.push({ entry: e, item }); }
    return out;
  }
  // Of that, what nobody on the roster would be the better for: auto-play sells it.
  bagJunk() { return this.bagged().filter((x) => !this.wantedBy(x.item)); }
  // Out of a bag (sold, worn, thrown down). True if it was there.
  unbag(e, item) {
    const i = e?.bag?.indexOf(item) ?? -1;
    if (i < 0) return false;
    e.bag.splice(i, 1);
    this.onChange?.();
    return true;
  }

  // Auto-play's care of the party (src/ui/autoplay.js): o.gear puts their best from their own bags on them, o.skills
  // spends every point they have by their class. Hands back what it did, as lines.
  upkeep(o) {
    const said = [];
    for (const m of this.members) {
      const e = this.entryOf(m);
      if (!e) continue;
      let changed = false;
      if (o.skills && autoSpend(e.cls, e.tree, e.level, roleOf(e.cls))) changed = true;
      if (o.gear) {
        const best = this.bestFor(m, e.bag || []);
        for (const it of Object.values(best)) {
          if (!this.unbag(e, it)) continue;
          const was = e.gear[it.slot];
          e.gear[it.slot] = it;
          if (was) e.bag.push(was);
          said.push(`${m.name} put on the ${it.name}.`);
          changed = true;
        }
      }
      if (changed) this.dress(m);
    }
    if (said.length) this.onChange?.();
    return said;
  }

  dismiss(slot) {
    const i = this.members.findIndex((m) => m.slot === slot);
    if (i < 0) return;
    const [m] = this.members.splice(i, 1);
    const e = this.entryOf(m);
    if (e) { e.lastWith = this.level(); e.caught = 0; e.got = 0; e.seen = Date.now(); }
    this.sim.postMessage({ type: 'dismiss', slot });
    this.looks?.(slot, null, null);
    this.changed();
  }

  // Old companions not with you now, as the quartermaster offers them.
  companionOffers() {
    return this.roster.filter((e) => !this.members.some((m) => m.rid === e.id)).sort((a, b) => b.seen - a.seen)
      .map((e) => ({ entry: e, old: true, cls: e.cls, sex: e.sex, name: e.name, level: e.level, price: hirePrice(e.level), pieces: Object.keys(e.gear).length, gearScore: Object.values(e.gear).reduce((s, it) => s + score(it), 0) }));
  }
  allOffers() { return [...this.companionOffers(), ...(this.offers || [])]; }

  // A new level of yours: theirs go with it.
  levelled() {
    const L = this.level();
    for (const m of this.members) {
      const was = m.level;
      m.level = Math.max(1, L + m.off);
      this.cast[m.slot].level = m.level;
      this.sim.postMessage({ type: 'hireLevel', slot: m.slot, level: m.level });
      const e = this.entryOf(m);
      if (e) { e.level = m.level; e.lastWith = L; e.caught = 0; this.dress(m); }
      // (What they've come by with it: their moves are by level too. src/sim/heroskills.js.)
      const got = movesAt(m.cls, m.level).filter((q) => q.lvl > was);
      if (got.length && m.level > was) this.tip(`${m.name} is level ${m.level}, and has learned ${got.map((q) => q.name).join(' and ')}.`, 5);
    }
    // Those away: their level with yours, and a piece of their own for every four of yours since you last had them.
    for (const e of this.roster) {
      if (this.members.some((m) => m.rid === e.id)) continue;
      e.level = Math.max(1, L + e.off);
      const steps = Math.floor((L - e.lastWith) / CATCH_STEP) - (e.caught || 0);
      if (steps > 0) { e.caught = (e.caught || 0) + steps; e.got = (e.got || 0) + catchUp(this.rng, this.whoOfEntry(e), e.gear, steps).length; }
      if (e.tree.auto) autoSpend(e.cls, e.tree, e.level, roleOf(e.cls));
    }
    this.paceSent = -1;
  }

  changed() { this.buildFrames(); if (this.open) this.showPanel(); this.onChange?.(); }

  // ---- the quartermaster's panel ---------------------------------------------------------------------------------------

  talkTo(h) {
    this.open = h;
    if (!this.offers || performance.now() - (this.offersAt || 0) > 240000) this.makeOffers();
    this.opened?.();
    this.panel.style.display = 'flex';
    this.showPanel();
  }

  close() {
    if (!this.open) return;
    this.open = null;
    this.panel.style.display = 'none';
    this.closed?.();
  }

  showPanel(line) {
    const h = this.open;
    if (!h) return;
    const r = this.roles();
    const want = [!r.tank && 'a lancer to take the blows', !r.heal && 'a paladin to keep you standing', 'blades to do the work'].filter(Boolean);
    // (A post at one of the later delves speaks of its own: src/core/dungeon.js POSTS.)
    const where = h.p.delve || 'the Hollowfang Warrens', short = h.p.delve || 'the Warrens';
    const need = this.fit() ? `That is a party fit for ${where}.`
      : `For ${short} you'll want four at your back: ${want.length > 1 ? `${want.slice(0, -1).join(', ')} and ${want.at(-1)}` : want[0]}.`;
    const gratis = !!this.freeHire?.();
    const say = line || (gratis ? `In this hall the Company sends whoever you ask for, and asks nothing for them. ${need}` : h.p.say ? `${h.p.say} ${need}` : h.p.broker === 'portal'
      ? `The Warrens won't let one through alone, nor two. Four at your back, or the kobolds have you before the first bend. ${need}`
      : `The Free Company, at your service. Swords for hire: paid once, up front, and they're yours till you let them go. ${need}`);
    this.opts = [];
    const li = (o) => { this.opts.push(o); return o; };
    let html = `<div class="tk-head"><span class="tk-name">${esc(h.p.name)}</span><span class="tk-title">${esc(h.p.title || 'Quartermaster')}</span><span class="tk-purse">${this.pack.purse() ? priceText(this.pack.purse()) : 'No coin'}</span>${CLOSE_X}</div>
      <div class="line">${esc(say)}</div>`;
    const row = (o, k) => `<li class="${o.dim ? 'dim' : ''}" data-k="${k}"${o.title ? ` title="${esc(o.title).replace(/"/g, '&quot;')}"` : ''}><kbd>${k < 9 ? k + 1 : k === 9 ? 0 : ''}</kbd><span class="rl" style="color:${ROLE[o.role][1]}">${roleMark(o.role)}</span><span>${esc(o.label)}</span>${o.note ? `<span class="mv">${esc(o.note)}</span>` : ''}${o.price ? `<span class="pr">${gratis ? 'Free' : priceText(o.price)}</span>` : ''}</li>`;
    if (this.members.length) {
      html += `<h4>Your party (${this.members.length} of ${PARTY.size})</h4><ol>`;
      for (const m of this.members) {
        const o = li({ role: roleOf(m.cls), title: movesAt(m.cls, m.level).map((q) => q.name).join(', '), label: `Let ${m.name} go: level ${m.level} ${CLASSES[m.cls].title}`, run: () => { this.dismiss(m.slot); this.showPanel(`${m.name} salutes and goes back on the Company's books.`); } });
        html += row(o, this.opts.length - 1);
      }
      html += '</ol>';
    }
    // Those you've had along before, with what you gave them and what they've come by since.
    const olds = this.companionOffers();
    if (olds.length) {
      html += `<h4>Old companions</h4><ol>`;
      for (const of of olds) {
        const role = roleOf(of.cls), e = of.entry;
        const note = `${of.pieces ? `${of.pieces} piece${of.pieces > 1 ? 's' : ''} of gear` : 'no gear'}${e.got ? `, ${e.got} new since` : ''}`;
        const o = li({ role, price: of.price, dim: this.full() || this.slotFor(e) < 0, label: `${of.name}, level ${of.level} ${CLASSES[of.cls].title} (${ROLE[role][0].toLowerCase()})`, note,
          title: this.slotFor(e) < 0 ? `No ${CLASSES[of.cls].title.toLowerCase()} is about to come back in just now.` : `Last with you at your level ${e.lastWith}.`,
          run: () => { if (this.hire(of)) this.showPanel(`${of.name}! Good to have them back.`); } });
        html += row(o, this.opts.length - 1);
      }
      html += '</ol>';
    }
    html += `<h4>On the Company's books</h4><ol>`;
    for (const of of this.offers || []) {
      const role = roleOf(of.cls);
      const o = li({ role, price: of.price, dim: this.full(), label: `${of.name}, level ${of.level} ${CLASSES[of.cls].title} (${ROLE[role][0].toLowerCase()})`, note: ((n) => (n ? `${n} new move${n === 1 ? '' : 's'}` : 'first moves only'))(movesAt(of.cls, of.level).length), title: movesAt(of.cls, of.level).map((q) => q.name).join(', '),
        run: () => { if (this.hire(of)) this.showPanel(`${of.name} it is. They'll keep at your back.`); } });
      html += row(o, this.opts.length - 1);
    }
    if (!this.offers?.length) html += '<li class="dim">Nobody free just now.</li>';
    html += '</ol>';
    this.panel.innerHTML = html;
    this.panel.querySelector('.menu-x').onclick = () => this.close();
    for (const el of this.panel.querySelectorAll('li[data-k]')) el.onclick = () => this.choose(+el.dataset.k);
  }

  choose(k) { const o = this.opts?.[k]; if (!o || o.dim) return; this.click?.(); o.run(); }

  key(e) {
    if (!this.open || e.repeat) return;
    const n = e.code.startsWith('Digit') ? +e.code.slice(5) : e.code.startsWith('Numpad') ? +e.code.slice(6) : NaN;
    if (!Number.isNaN(n) && n >= 0) { e.preventDefault(); e.stopPropagation(); this.choose(n === 0 ? 9 : n - 1); return; }
    if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); e.stopPropagation(); this.close(); }
  }

  // ---- the frames --------------------------------------------------------------------------------------------------------

  buildFrames() {
    this.frames.innerHTML = '';
    this.frameEls = this.members.map((m) => {
      const el = document.createElement('div'); el.className = 'pf';
      const [rn, col, mark] = ROLE[roleOf(m.cls)];
      el.innerHTML = `<div class="nm"><span style="color:${col}">${mark}</span><span>${esc(m.name)}</span><em>${m.level} ${esc(CLASSES[m.cls].title)}</em></div><div class="bar"><i></i></div>`;
      el.title = rn;
      this.frames.appendChild(el);
      return { el, bar: el.querySelector('i'), m, w: -1, cls: '' };
    });
  }

  // Each frame: life bars, the boss's bar, the calls fading.
  update(dt, snap) {
    if (!snap) return;
    // Your level, told to the world now and then: the other Tessariels out in it keep pace with you (HeroWorld.keepPace).
    if ((this.paceT = (this.paceT || 0) - dt) <= 0) { this.paceT = 4; const L = this.level(); if (L !== this.paceSent) { this.paceSent = L; this.sim.postMessage({ type: 'playerLevel', level: L }); } }
    const first = this.firstHero();
    for (const f of this.frameEls) {
      const o = CHARS_START + (first + f.m.slot) * C_SIZE + C_HERO;
      const hp = Math.max(0, Math.min(1, snap[o + 5] || 0)), dead = snap[o + 9] > 0.5;
      const w = Math.round(hp * 100);
      if (w !== f.w) { f.w = w; f.bar.style.width = `${w}%`; }
      const cls = `pf${dead ? ' dead' : hp < 0.35 ? ' low' : ''}`;
      if (cls !== f.cls) { f.cls = cls; f.el.className = cls; }
    }
    if (this.boss) {
      const bars = this.boss.ids.map((id) => { const co = CHARS_START + id * C_SIZE; return snap[co + C.ACTIVE] > 0.5 ? Math.max(0, snap[co + C.HP] / (snap[co + C.MAX_HP] || 1)) : 0; });
      for (let i = 0; i < bars.length; i++) {
        const w = Math.round(bars[i] * 1000) / 10;
        if (this.boss.bars[i] && this.boss.w[i] !== w) { this.boss.w[i] = w; this.boss.bars[i].style.width = `${w}%`; }
      }
    }
    if (this.open && this.open.dist > 6) this.close();
  }

  // ---- the Warrens' word -------------------------------------------------------------------------------------------------

  warn(text, secs = 5) {
    const d = document.createElement('div');
    d.textContent = text;
    this.warnEl.appendChild(d);
    while (this.warnEl.children.length > 3) this.warnEl.firstChild.remove();
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 700); }, secs * 1000);
    this.warned?.(text);
  }

  showBoss(i, ids) {
    const b = BOSSES[i];
    if (!b) return;
    this.boss = { key: b.key, ids: ids.filter((x) => x >= 0), w: [], bars: [] };
    this.bossEl.innerHTML = `<div class="bn">${esc(b.name)}</div>` + this.boss.ids.map(() => '<div class="bb"><i></i></div>').join('');
    this.boss.bars = [...this.bossEl.querySelectorAll('.bb i')];
    this.bossEl.style.display = 'block';
  }

  hideBoss() { this.boss = null; this.bossEl.style.display = 'none'; }

  // EV.DELVE from the sim.
  onDelve(code, a, b, c) {
    // (Which delve, for its coming in, going out, clearing and wipe: the sim says. src/sim/dungeon.js)
    const d = DELVES[b | 0] || DELVES[0];
    switch (code | 0) {
      case DELVE.NEED: {
        const lack = [];
        if (a < PARTY.size) lack.push(`${PARTY.size - a} more in your party`);
        if (!b) lack.push('a lancer to take the blows');
        if (!c) lack.push('a paladin to heal');
        this.tip(`The portal won't open for so few. You need ${lack.join(', ')}. Captain Merrow Vale, beside it, hires them out.`, 6);
        break;
      }
      case DELVE.ENTER: this.warn(a ? `${d.name}. Your dead foes are as you left them.` : d.words.enter, 6); break;
      case DELVE.LEAVE: this.hideBoss(); break;
      case DELVE.CLEAR: this.hideBoss(); this.warn(d.words.clear, 7); this.clearsBy[d.key] = (this.clearsBy[d.key] || 0) + 1; if (d.key === 'warrens') this.clears++; this.cleared?.(d); break;
      case DELVE.WARN: this.warn(WARNINGS[a | 0] || '', 5); break;
      case DELVE.BOSS: this.showBoss(a | 0, [b | 0, c | 0]); this.warn(`${BOSSES[a | 0]?.name || ''}!`, 3); break;
      case DELVE.BOSS_DOWN: this.hideBoss(); this.warn(`${BOSSES[a | 0]?.name || 'The boss'} is dead!`, 5); this.bossDown?.(BOSSES[a | 0]?.key); break;
      case DELVE.WIPE: this.wipes = (this.wipes || 0) + 1; this.hideBoss(); this.warn(d.words.wipe, 5); break;
      default: break;
    }
  }

  // The sim's word on the fight, a few times a second (src/sim/dungeon.js post).
  onWarrens(m) {
    this.warrens = { ...m, at: performance.now() };
    if (!m.fight && this.boss) this.hideBoss();
  }

  // ---- kept in the save ----------------------------------------------------------------------------------------------

  save() {
    return { members: this.members.map((m) => ({ body: this.cast[m.slot].body, cls: m.cls, name: m.name, level: m.level, off: m.off, rid: m.rid })),
      roster: structuredClone(this.roster), nextId: this.nextId, clears: this.clears, clearsBy: { ...this.clearsBy } };
  }

  load(d) {
    this.clears = d?.clears || 0;
    // (A save from before the other dungeons: the Warrens' count is all there was.)
    this.clearsBy = { ...(d?.clearsBy || (this.clears ? { warrens: this.clears } : {})) };
    for (const m of this.members.slice()) this.dismiss(m.slot);
    this.offers = null;
    this.roster = structuredClone(d?.roster || []);
    for (const e of this.roster) { e.gear ||= {}; e.bag ||= []; e.tree ||= freshTree(); e.tree.ranks ||= {}; e.kit ||= {}; e.seen ||= 0; }
    this.nextId = Math.max(d?.nextId || 1, ...this.roster.map((e) => e.id + 1));
    for (const s of d?.members || []) {
      // (Someone off the roster, back in their own body if it's about this time, else another of their class. A save from
      // before the roster: they go on it now, as they were.)
      let e = this.roster.find((x) => x.id === s.rid);
      if (!e) {
        const c = this.cast.find((x) => !x.broker && x.body === s.body && !this.member(x.slot)) || this.cast.find((x) => !x.broker && x.cls === s.cls && !this.member(x.slot));
        if (!c) continue;
        e = this.enrol(c, { name: s.name, off: s.off ?? 0, level: s.level });
      }
      this.hire({ entry: e, level: s.level }, true);
    }
  }
}
