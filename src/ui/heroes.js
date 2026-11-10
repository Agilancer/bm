// The other Tessariels, heard and named: what they say and to whom, their names over their heads, their bubbles, and the
// chat log, as an MMO's would be. The sim (src/sim/hero.js) says when something happens (EV.HERO: slot, trigger, other,
// place, mob, extra); this picks the words from assets/game/heroes/script.json and plays them. Triggers about the player
// (seeing your magic, Lisandra walking with you, your falls) are noticed here, from the snapshot and the events.
//
// The script's rules (its spec, kept with it): pools blend (any + class + persona + time, the specific ones weighted
// double); a line isn't heard twice within 200; tokens fill from the speaker, the listener and the moment; gates hold a
// line back until its time, its bond or its memory is true. Lisandra is talked about only by daylight or by dark, never in
// the minutes either side of dawn and dusk, when the glamour turns.
import { C, C_HERO, C_SIZE, CHARS_START, H } from '../core/layout.js';
import { kindOfGroup } from '../core/tripo-monsters.js';
import { CAUSES, CLASSES, GESTURES, MOBS, MOB_KEYS, MOVE_KEYS, PLACES, PLACE_IDS, TRIGGERS, WALK_ENDS, hourBand, rng } from '../core/heroes.js';
import { LISANDRA_FORMS } from '../core/lisandra.js';
import { townDist } from '../core/town.js';
import { TOWN_KNIGHTS } from '../core/knights.js';
import { DAWN_HOUR, DUSK_HOUR } from '../gfx/daylight.js';
import { ELEM, SPELLS } from '../sim/spells.js';
import { CLOSE_X } from './menu-x.js';

const BANDS = ['night', 'dawn', 'day', 'dusk'];
const EARSHOT = 30;            // a Say is heard this far from the player
const TAG_FAR = 46;            // names fade out by here
const TALK_REACH = 3.2;        // E stops a hero this close for a word
const SAVE_KEY = 'bm.heroes';
const RECENT = 200;            // lines not heard twice within this many
const A_MOB = { zombie: 'a zombie', champion: 'a champion', crab: 'a crab' };
const CLASS_WORD = { paladin: 'paladin', lancer: 'lancer', archer: 'archer', rogue: 'rogue', ninja: 'ninja', dragoon: 'dragoon', boomerang: 'boomerang knight', bard: 'bard' };
const article = (w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
const NUMBER = ['nothing', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const words = (n) => NUMBER[n] ?? String(n);
const ANIM = { fold_arms: 'fold', look_around: 'look', nod: 'yes' };
const EMOTE = { startle: '!', question: '?', anger: '#', gloom: '///', love: '♥', music: '♪', sleep: 'z z', dots: '…' };
// The channels, as the log shows them.
const CHANNEL = { say: ['Say', '#efe6d2'], party: ['Party', '#9cc3ff'], guild: ['Guild', '#86dc95'], trade: ['Trade', '#efae66'], shout: ['Shout', '#ff8a6a'], system: ['', '#f1d68a'] };
// What drops, as heroes name it (src/items/items.js has the real tables; these are what's talked about).
const RARITY = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythical'];
const THINGS = ['kite shield', 'tower shield', 'skull focus', 'robe', 'staff', 'ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'scroll of Mend', 'scroll of Blink'];
// Monsters by what the sim's LOOT event calls them (src/main.js FOE_NAMES), for the player's big kills.
// The triggers that tell of deeds from the world log (their lines gated by event).
const EVENT_TRIGS = new Set(['gossip', 'gossip_player', 'bard_perform', 'guild_chat']);
// The engine's spell elements by number (src/sim/spells.js), for the script's spell_elements map.
const ELEM_NAMES = Object.keys(ELEM).sort((a, b) => ELEM[a] - ELEM[b]);
const rand = (a, b) => a + Math.random() * (b - a);
// What a hero remembers, kept between sessions: rescues both ways and the debts still open, duels, spells seen, the Tally.
const freshMem = (m = {}) => ({ savedBy: {}, saved: {}, debts: {}, owed: {}, spells: [], tallyNo: {}, ...m });
// (The werewolf is a Tripo monster now: its group's kind, src/core/tripo-monsters.js.)
const BIG_KILL = { 0: 'black_knight', 3: 'gravehart', 4: 'hydra', 6: 'ogre', [kindOfGroup('Werewolf')]: 'werewolf', 10: 'mouth' };

export class HeroTalk {
  constructor({ base, cast, renderer, sim, settings, playerName, playerSkull, touch, ui = {} }) {
    Object.assign(this, { base, cast, renderer, sim, settings, playerName, playerSkull, touch, ui });
    this.open = null;     // the hero the player has stopped for a word (E), while the panel is up
    // (Listening before src/main.js does, so the E that opens the panel doesn't also close it.)
    window.addEventListener('keydown', (e) => this.key(e));
    this.script = null; this.names = null;
    this.recent = []; this.recentSet = new Set(); this.convosUsed = [];
    this.heroes = cast.map((p) => ({ p, cool: new Map(), bubbleT: 0, busyT: 0, seenPlayer: false, magic: 0, herSeen: 0, mem: freshMem(), stage: 0, greetT: -1e9, x: 0, y: 0, z: 0, shown: false, tagY: 0 }));
    this.bonds = new Map();
    this.t = 0; this.scanT = 0; this.chatterT = 20; this.gossipT = 40; this.saveT = 30; this.magicT = -1e9; this.lastSpell = 0; this.lastSpellT = -1e9;
    this.timers = [];     // things said a moment after something else
    this.gameH = 0;       // game hours played, all sessions: days for the log's {ago} and the player's absences
    this.convo = [];      // playing conversations
    this.log = [];        // the world log: big kills and deaths, for gossip and bards
    this.load();
    for (const h of this.heroes) if (h.mem.tallyN == null) h.mem.tallyN = 3 + (h.p.seed % 60);
    this.buildDom();
  }

  async fetchScript() {
    try {
      const [script, names] = await Promise.all([
        fetch(`${this.base}assets/game/heroes/script.json`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${this.base}assets/game/heroes/names.json`).then((r) => (r.ok ? r.json() : null)),
      ]);
      this.names = names;
      if (!script) return;
      this.script = script;
      // Pools by trigger, convos by trigger.
      this.barks = new Map(); this.convos = new Map();
      for (const b of script.barks) (this.barks.get(b.when) || this.barks.set(b.when, []).get(b.when)).push(b);
      for (const c of script.convos) (this.convos.get(c.when) || this.convos.set(c.when, []).get(c.when)).push(c);
      this.defaults = script.triggers._defaults || {};
    } catch (e) { console.warn('hero script', e); }
  }

  // ---- what's kept between sessions ---------------------------------------------------------------------------------

  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { /* none */ }
    if (!d || !d.people) return;
    this.heroes.forEach((h) => {
      const k = d.people[h.p.body + ':' + h.p.name];
      if (!k) return;
      Object.assign(h, { seenPlayer: k.seen, magic: k.magic || 0, herSeen: k.her || 0, mem: freshMem(k.mem || {}), stage: k.stage || 0 });
      h.p.level = Math.max(h.p.level, k.level || 0); h.p.gold = k.gold ?? h.p.gold;
    });
    for (const [k, v] of Object.entries(d.bonds || {})) this.bonds.set(k, v);
    this.log = (d.log || []).filter((e) => e.type);
    this.gameH = d.gameH || 0;
    for (const h of this.heroes) if (h.p.persona === 'zealot' && h.mem.tallyN == null) h.mem.tallyN = 3 + (h.p.seed % 60);
  }

  save() {
    const people = {};
    let prev = null;
    try { prev = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { /* none */ }
    for (const h of this.heroes) people[h.p.body + ':' + h.p.name] = { seen: h.seenPlayer, magic: h.magic, her: h.herSeen, mem: h.mem, stage: h.stage, level: h.p.level, gold: h.p.gold };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ seed: prev?.seed, people: { ...(prev?.people || {}), ...people }, bonds: Object.fromEntries(this.bonds), log: this.log.slice(-40), gameH: this.gameH })); } catch { /* full */ }
  }

  // A new name for one of them (hired of the Free Company: src/ui/party.js), over their head too.
  renamed(slot) {
    const h = this.heroes[slot];
    if (!h?.tag) return;
    h.tag.querySelector('b').textContent = h.p.name;
    h.tag.querySelector('i').textContent = h.p.guild ? `<${h.p.guild}>` : '';
  }

  // A pair's bond, kept by the pair: { b: 'friend' | 'rival' | 'respect', c: { [name]: what made it, from their side } }.
  bond(a, b) { const v = this.bonds.get(a < b ? `${a}|${b}` : `${b}|${a}`); return typeof v === 'string' ? { b: v, c: {} } : v; }
  setBond(h, o, b, ch, co) { this.bonds.set(h.p.name < o.p.name ? `${h.p.name}|${o.p.name}` : `${o.p.name}|${h.p.name}`, { b, c: { [h.p.name]: ch, [o.p.name]: co } }); }
  // (An explicit bond outranks a shared guild.)
  bondOf(h, o) {
    if (!o) return 'stranger';
    const k = this.bond(h.p.name, o.p.name);
    if (k) return k.b;
    return h.p.guild && h.p.guild === o.p.guild ? 'guild' : 'stranger';
  }
  causeOf(h, o) { return o ? this.bond(h.p.name, o.p.name)?.c?.[h.p.name] ?? null : null; }

  // A bond made or turned: kept, and both say so, each from their own side.
  turnBond(h, o, b, ch, co, ctx = {}) {
    if (!o || this.bondOf(h, o) === b) return false;
    this.setBond(h, o, b, ch, co);
    this.say(h, 'bond_change', o, { ...ctx, cause: ch });
    this.later(rand(1.6, 3), () => this.say(o, 'bond_change', h, { ...ctx, cause: co }));
    return true;
  }

  later(s, fn) { this.timers.push({ t: this.t + s, fn }); }

  // ---- the page -----------------------------------------------------------------------------------------------------

  buildDom() {
    const css = document.createElement('style');
    css.textContent = `
      #heroLayer { position: fixed; inset: 0; pointer-events: none; z-index: 4; overflow: hidden; }
      #heroLayer .tag { position: absolute; left: 0; top: 0; text-align: center; white-space: nowrap; transform-origin: 50% 100%; will-change: transform; font-family: Georgia, serif; }
      #heroLayer .tag b { display: block; font-weight: normal; font-size: 14px; letter-spacing: .04em; color: #bfe0ff; text-shadow: 0 0 3px #000, 0 1px 2px #000, 0 0 6px rgba(0,0,0,.8); }
      #heroLayer .tag i { display: block; font-style: normal; font-size: 11.5px; letter-spacing: .06em; color: #8fe0a0; text-shadow: 0 0 3px #000, 0 1px 2px #000; }
      #heroLayer .tag u { display: block; text-decoration: none; font-size: 10.5px; color: #d8cdb3; opacity: .85; text-shadow: 0 0 3px #000; }
      #heroLayer .tag.dead b { color: #8d8d8d; }
      #heroLayer .bub { position: absolute; left: 0; top: 0; max-width: 240px; padding: 6px 10px 7px; font: 13.5px/1.32 Georgia, serif; color: #1d160e;
        background: rgba(244,236,218,.94); border: 1px solid rgba(80,60,30,.6); border-radius: 9px; box-shadow: 0 2px 8px rgba(0,0,0,.45); will-change: transform; transition: opacity .35s; }
      #heroLayer .bub::after { content: ''; position: absolute; left: 50%; bottom: -7px; margin-left: -6px; border: 6px solid transparent; border-top-color: rgba(244,236,218,.94); border-bottom: 0; }
      #heroLayer .bub.party { background: rgba(214,228,252,.95); } #heroLayer .bub.party::after { border-top-color: rgba(214,228,252,.95); }
      #heroLayer .mark { position: absolute; left: 0; top: 0; font: bold 22px Georgia, serif; color: #ffe27a; text-shadow: 0 0 4px #000, 0 0 2px #000; will-change: transform; transition: opacity .3s; }
      #heroLayer .mark.anger { color: #ff4a3a; } #heroLayer .mark.love { color: #ff8fb0; } #heroLayer .mark.gloom { color: #9fb2d8; } #heroLayer .mark.music { color: #c8f0ff; }
      #heroChat { position: fixed; left: 14px; bottom: 132px; width: min(440px, 58vw); pointer-events: none; z-index: 5; font: 13px/1.38 Georgia, serif;
        padding: 6px 10px 6px 8px; border-radius: 6px; background: linear-gradient(90deg, rgba(8,6,4,.5), rgba(8,6,4,.32) 70%, rgba(8,6,4,0)); }
      #heroChat:empty { display: none; }
      #heroChat div { color: #efe6d2; text-shadow: 0 0 3px #000, 0 1px 2px #000; margin-top: 2px; transition: opacity 1.2s; }
      #heroChat div span.n { color: #bfe0ff; } #heroChat div span.c { opacity: .85; }
      body.touch #heroChat { bottom: 46%; width: 46vw; font-size: 11.5px; }
      body.cinematic #heroLayer, body.cinematic #heroChat { display: none; }
      #heroTalk { position: fixed; z-index: 12; left: 50%; bottom: max(3vh, 14px); transform: translateX(-50%); width: min(680px, 94vw); padding: 13px 18px 10px; display: none; flex-direction: column;
        background: rgba(11,9,7,.95); border: 1px solid var(--gold-dim, #8c7344); box-shadow: 0 10px 34px #000b; color: var(--bone, #e9dfc8); font-family: Georgia, serif; }
      #heroTalk .tk-head { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid rgba(140,115,68,.42); padding-bottom: 6px; margin-bottom: 9px; }
      #heroTalk .tk-name { font: 700 18px Cinzel, Georgia, serif; color: #bfe0ff; letter-spacing: .05em; }
      #heroTalk .tk-title { font-size: 13px; opacity: .62; font-style: italic; }
      #heroTalk .tk-guild { margin-left: auto; font-size: 13px; color: #8fe0a0; }
      #heroTalk .tk-head .menu-x { align-self: center; margin: -6px -10px 0 4px; }
      #heroTalk .tk-line { font-size: 17px; line-height: 1.5; min-height: 2.6em; animation: htkIn .28s ease-out; }
      @keyframes htkIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
      #heroTalk ol { list-style: none; margin: 9px 0 0; padding: 0; }
      #heroTalk li { display: flex; gap: 9px; align-items: baseline; padding: 4px 8px; cursor: pointer; font-size: 15.5px; color: #d6c8a5; border-radius: 3px; }
      #heroTalk li:hover { background: rgba(201,163,92,.15); color: #fff4da; }
      #heroTalk li kbd { flex: none; min-width: 1.5em; text-align: center; font: 12px Georgia, serif; color: var(--gold-dim, #8c7344); border: 1px solid rgba(140,115,68,.5); border-radius: 3px; padding: 0 3px; }
      #heroTalk li.dim { opacity: .45; }
    `;
    document.head.appendChild(css);
    this.layer = document.createElement('div'); this.layer.id = 'heroLayer';
    this.chat = document.createElement('div'); this.chat.id = 'heroChat';
    this.panel = document.createElement('div'); this.panel.id = 'heroTalk';
    document.body.append(this.layer, this.chat, this.panel);
    for (const h of this.heroes) {
      h.tag = document.createElement('div'); h.tag.className = 'tag';
      h.tag.innerHTML = `<b></b><i></i><u></u>`;
      h.tag.querySelector('b').textContent = h.p.name;
      h.tag.querySelector('i').textContent = h.p.guild ? `<${h.p.guild}>` : '';
      h.bub = document.createElement('div'); h.bub.className = 'bub'; h.bub.style.opacity = 0;
      h.mark = document.createElement('div'); h.mark.className = 'mark'; h.mark.style.opacity = 0;
      this.layer.append(h.tag, h.bub, h.mark);
    }
  }

  // ---- each frame -----------------------------------------------------------------------------------------------------

  update(dt, snap, hour, active) {
    this.t += dt;
    // Game hours played: the clock's forward steps (a jump back past midnight is a day turning, not time undone).
    if (this.hour != null) { let d = hour - this.hour; if (d < -12) d += 24; if (d > 0 && d < 3) this.gameH += d; }
    this.hour = hour;
    if (this.timers.length) { const due = this.timers.filter((x) => x.t <= this.t); this.timers = this.timers.filter((x) => x.t > this.t); for (const x of due) x.fn(); }
    this.snap = snap;
    const show = active && this.settings.tags !== 'off';
    css(this.layer, 'display', active ? '' : 'none');
    css(this.chat, 'display', active && this.settings.chatlog !== 'off' ? '' : 'none');
    const nk = snap[H.NCHARS] - this.heroes.length - LISANDRA_FORMS.length;
    this.firstHero = nk;
    const px = snap[H.PX], py = snap[H.PY], pz = snap[H.PZ];
    this.player = { x: px, y: py, z: pz, hp: snap[H.HP] / snap[H.MAX_HP], dead: snap[H.HP] <= 0 };
    const m = this.renderer.frameData, W = innerWidth, Ht = innerHeight;
    const toScreen = (x, y, z) => {
      const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (cw < 0.1) return null;
      return [(cx / cw * 0.5 + 0.5) * W, (0.5 - cy / cw * 0.5) * Ht, cw];
    };
    const placed = [];
    this.heroes.forEach((h, i) => {
      h.scr = null;
      const co = CHARS_START + (nk + i) * C_SIZE, o = co + C_HERO;
      h.shown = snap[o] > 0.5; h.x = snap[o + 2]; h.y = snap[o + 3]; h.z = snap[o + 4]; h.tagY = snap[o + 1];
      h.hp = snap[o + 5]; h.party = snap[o + 7]; h.act = snap[o + 8] | 0; h.dead = snap[o + 9] > 0.5; h.below = snap[o + 10] > 0.5; h.fighting = snap[o + 11] > 0.5;
      h.p.level = Math.max(h.p.level, snap[o + 6] | 0);
      h.dist = Math.hypot(h.x - px, h.z - pz);
      h.bubbleT -= dt; h.markT = (h.markT || 0) - dt;
      const s = h.shown && h.dist < TAG_FAR ? toScreen(h.x, h.tagY || h.y + 2, h.z) : null;
      if (!s) { css(h.tag, 'opacity', 0); css(h.bub, 'opacity', 0); css(h.mark, 'opacity', 0); return; }
      const k = Math.max(0.55, Math.min(1.05, 9 / s[2]));
      const fade = Math.min(1, (TAG_FAR - h.dist) / 10);
      if (show) {
        { const cn = 'tag' + (h.dead ? ' dead' : ''); if (h.tag.className !== cn) h.tag.className = cn; }
        css(h.tagI || (h.tagI = h.tag.querySelector('i')), 'display', this.settings.tags === 'names' ? 'none' : '');
        const near = h.dist < 12;
        const u = h.tagU || (h.tagU = h.tag.querySelector('u'));
        const line = near ? `Level ${h.p.level} ${CLASSES[h.p.cls].title}` : '';
        if (u.textContent !== line || !h.tagW) { u.textContent = line; h.tagW = h.tag.offsetWidth; h.tagH = h.tag.offsetHeight; }
      }
      h.scr = s; h.k = k; h.fade = fade;
      placed.push(h);
    });
    // Nearest first. A tag that lands on a nearer one's dims, the way a crowd reads in an MMO; bubbles never cover
    // each other: each one rises above any nearer bubble it would land on, and none leaves the screen.
    placed.sort((a, b) => a.dist - b.dist);
    const tags = [], bubs = [];
    const hit = (r, list) => list.find((q) => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h);
    for (const h of placed) {
      const s = h.scr, k = h.k;
      if (show) {
        const r = { x: s[0] - h.tagW * k / 2, y: s[1] - h.tagH * k, w: h.tagW * k, h: h.tagH * k };
        const under = !!hit(r, tags);
        tags.push(r);
        css(h.tag, 'opacity', (h.fade * (under ? 0.28 : 1)).toFixed(2));
        css(h.tag, 'transform', `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`);
      } else css(h.tag, 'opacity', 0);
      const lift = show ? 44 * k : 10;
      const talking = h.bubbleT > 0 && this.settings.bubbles !== 'off' && h.dist < 38;
      css(h.bub, 'opacity', talking ? Math.min(1, h.bubbleT * 3, h.fade).toFixed(2) : 0);
      let top = s[1] - lift;
      if (talking) {
        const bk = Math.max(0.7, k), w = (h.bubW || 200) * bk, bh = (h.bubH || 40) * bk;
        const x = Math.max(8, Math.min(W - 8 - w, s[0] - w / 2));
        const r = { x: x - 3, y: top - bh - 3, w: w + 6, h: bh + 6 };
        for (let n = 0, q; n < 8 && (q = hit(r, bubs)); n++) r.y = q.y - r.h;
        r.y = Math.max(4, r.y);
        bubs.push(r);
        top = r.y + 3 + bh;
        css(h.bub, 'transform', `translate(${(x + w / 2).toFixed(1)}px, ${top.toFixed(1)}px) translate(-50%, -100%) scale(${bk.toFixed(3)})`);
        top -= bh + 6;
      }
      const marked = h.markT > 0;
      css(h.mark, 'opacity', marked ? Math.min(1, h.markT * 3, h.fade).toFixed(2) : 0);
      if (marked) css(h.mark, 'transform', `translate(${s[0].toFixed(1)}px, ${top.toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`);
    }
    // The log fades line by line.
    // (Gone lines leave the page, so the log's backing goes with the last of them.)
    for (const e of this.log2 || []) { e.t -= dt; if (e.t < 0 && !e.gone) { e.gone = true; e.el.style.opacity = 0; } if (e.t < -1.4) e.el.remove(); }
    if (this.log2?.length && this.log2[0].t < -1.4) this.log2 = this.log2.filter((e) => e.t >= -1.4);
    this.stepConvos(dt);
    if (this.open) this.stepTalk(dt);
    if ((this.scanT -= dt) <= 0) { this.scanT = 0.25; this.scan(snap); }
    if ((this.chatterT -= dt) <= 0) { this.chatterT = 25 + Math.random() * 55; this.chatter(); }
    if ((this.saveT -= dt) <= 0) { this.saveT = 30; this.save(); }
  }

  // ---- what the sim says happened ------------------------------------------------------------------------------------

  onEvent(slot, trig, other, place, mob, extra) {
    const h = this.heroes[slot | 0];
    const name = TRIGGERS[trig | 0];
    if (!h || !name) return;
    const o = other >= 0 ? this.heroes[other | 0] : null;
    const ctx = { place: place >= 0 ? PLACES[place | 0] : null, mob: mob >= 0 ? MOB_KEYS[mob | 0] : null, extra };
    const M = h.mem;
    if (name === 'meet') return this.meet(h, o);
    // A fact from the sim, not a line: a rescue or a kill taken (src/sim/hero.js onKill). The bond and the debts follow.
    if (name === 'bond_change') { this.onBondFact(h, o, CAUSES[extra | 0], ctx); return; }
    if (name === 'class_skill') ctx.move = MOVE_KEYS[extra | 0];
    if (name === 'level_up') { ctx.level = extra; this.system(`${h.p.name} has reached level ${extra | 0}.`); }
    if (name === 'hero_death') { this.system(`${h.p.name} has fallen${ctx.mob ? ` to ${MOBS[ctx.mob].name}` : ''}.`); this.worldLog('death', h.p.name, h, ctx); }
    if (name === 'wipe') this.worldLog('wipe', h.p.name, h, ctx);
    if (name === 'boss_first_kill') { this.system(`${h.p.name} has felled ${MOBS[ctx.mob]?.name || 'a great beast'}.`); this.worldLog('boss_kill', h.p.name, h, ctx); }
    else if (name === 'hunt_kill' && (MOBS[ctx.mob]?.danger || 1) >= 3) this.worldLog('boss_kill', h.p.name, h, ctx);
    if (name === 'rare_drop') this.worldLog('rare_drop', h.p.name, h, ctx);
    if (name === 'corpse_eaten') this.worldLog('corpse_eaten', h.p.name, h, ctx);
    if (name === 'surf_crash') this.worldLog('crash', h.p.name, h, { ...ctx, place: PLACES.find((p) => p.id === 'summit') });
    if (name === 'surf_win') this.worldLog('race', h.p.name, h, ctx);
    if (name === 'surf_lose' && o) {
      if (!this.log.some((e) => e.type === 'race' && e.actor === o.p.name && this.gameH - e.t < 0.5)) this.worldLog('race', o.p.name, o, ctx);
      if (this.bondOf(h, o) === 'stranger' && Math.random() < 0.3) this.turnBond(h, o, 'rival', 'race_lost', 'race_won');
    }
    if (name === 'town_sell' || name === 'town_repair' || name === 'bard_tip') ctx.gold = extra | 0;
    if (name === 'duel_win' && o) {
      this.duelScore(h, o);
      this.worldLog('duel', h.p.name, h, ctx);
      const b = this.bondOf(h, o);
      // A rival who has lost to you three times comes round to respect; anyone else you've beaten is a rival now.
      if (b === 'rival' && (o.mem.duels?.[h.p.name]?.[1] || 0) >= 3) this.later(2.5, () => this.turnBond(o, h, 'respect', 'duel_lost', 'duel_won'));
      else if (b === 'stranger' || b === 'guild') this.later(2.5, () => this.turnBond(o, h, 'rival', 'duel_lost', 'duel_won'));
    }
    if (name === 'party_join' && o) {
      const b = this.bondOf(h, o);
      if ((b === 'stranger' || b === 'guild') && Math.random() < 0.3) this.later(6, () => this.turnBond(h, o, 'friend', 'party', 'party'));
    }
    // What's owed the player is paid back by a heal or a hand in a fight.
    // (Closed after the line, so the line that pays it back is the one that plays.)
    const repaid = (name === 'player_help' || name === 'player_heal') && M.debtPlayer;
    if (name === 'player_walk_end') ctx.walk_end = WALK_ENDS[extra | 0];
    if (name === 'player_help' || name === 'player_heal') M.helped = (M.helped || 0) + 1;
    if (name === 'saved_by_player') {
      h.stage = 3; ctx.spell = this.spellName();
      M.savedByPlayer = ctx.mob || M.savedByPlayer || 'zombie'; M.debtPlayer = true; M.debtPlayerT = this.t; M.rescueSpell = ctx.spell;
      this.worldLog('player_save', h.p.name, h, ctx);
      // And walks with the player a while after (unless a party needs them: the sim says no then).
      this.later(3, () => this.walkWith(h, 90));
    }
    if (name === 'player_steals_kill') ctx.spell = this.spellName();
    // (Paid when it's said: a help that went unspoken leaves the debt for the next.)
    if (this.say(h, name, o, ctx) && repaid) M.debtPlayer = false;
  }

  // A rescue or a stolen kill, as the sim saw it. h is the one rescued (or robbed), o the one who struck.
  onBondFact(h, o, cause, ctx) {
    if (!o) return;
    const mob = ctx.mob || 'zombie', b = this.bondOf(h, o);
    if (cause === 'rescued') {
      h.mem.savedBy[o.p.name] = mob; o.mem.saved[h.p.name] = mob;
      // o owed h from before: this squares it. Otherwise h owes o now.
      if (o.mem.debts[h.p.name]) {
        delete o.mem.debts[h.p.name]; delete h.mem.owed[o.p.name];
        this.later(1.5, () => this.say(o, 'debt_repaid', h, { saved_from: mob, mob }));
      } else { h.mem.debts[o.p.name] = mob; o.mem.owed[h.p.name] = mob; }
      if (b === 'rival') this.turnBond(h, o, 'respect', 'rescued', 'rescuer', { saved_from: mob });
      else if (b === 'stranger' || b === 'guild') this.turnBond(h, o, 'friend', 'rescued', 'rescuer', { saved_from: mob });
    } else if (cause === 'kill_lost' && b === 'stranger' && Math.random() < 0.35) this.turnBond(h, o, 'rival', 'kill_lost', 'kill_took', { mob });
  }

  // Your spells, the player's big kills, falls: what the heroes see of you.
  onSpell(spell) { this.lastSpell = spell | 0; this.castT = this.t; this.castMob = null; this.spellPending = true; }
  onSpellHit(mob) { if (!this.castMob && mob >= 0 && this.t - this.castT < 4) this.castMob = MOB_KEYS[mob | 0]; }
  spellName() { return SPELLS[this.lastSpell]?.name || 'that'; }
  // A hero walks with the player a while (src/sim/hero.js walkFor; 'edge' stops at the town's edge).
  walkWith(h, seconds, mode = 'escort') { this.sim.postMessage({ type: 'heroWalk', slot: h.p.slot, seconds, mode }); }

  spellKind(name) { return (this.script?.spell_kinds?.utility || []).includes(name) ? 'utility' : 'harm'; }

  onPlayerKill(kind) {
    const mob = BIG_KILL[kind | 0];
    if (!mob) return;
    this.worldLog('player_kill', this.playerName(), null, { mob });
    const near = this.heroes.filter((h) => h.shown && !h.dead);
    const h = near[Math.floor(Math.random() * near.length)] || this.heroes[0];
    if (h) this.say(h, 'player_big_kill', null, { mob });
  }

  // The world log: deeds with who did them, where and when (game hours), for gossip, bards and guild talk.
  worldLog(type, actor, h, ctx) {
    const place = ctx.place?.id || (h ? this.nearestPlace(h) : null);
    this.log.push({ type, actor, mob: ctx.mob || null, place, t: this.gameH, h: this.hour });
    if (this.log.length > 60) this.log.shift();
  }
  nearestPlace(h) {
    let best = null, bd = 1e9;
    for (const p of PLACES) { const d = Math.hypot(p.spot[0] - h.x, p.spot[1] - h.z) - p.r; if (d < bd) { bd = d; best = p.id; } }
    return bd < 40 ? best : null;
  }
  // An entry to tell of: not the speaker's own deed nor the listener's, no older than a week, the newest likeliest.
  entryFor(name, h, o) {
    const types = name === 'gossip_player' ? ['player_kill', 'player_save'] : null;
    const ok = this.log.filter((e) => e.type && this.gameH - e.t <= 7 * 24 && e.actor !== h.p.name && e.actor !== o?.p.name && (!types || types.includes(e.type)));
    if (!ok.length) return null;
    const w = ok.map((e) => 1 / (1 + (this.gameH - e.t) / 12));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ok.length; i++) if ((r -= w[i]) <= 0) return ok[i];
    return ok[ok.length - 1];
  }
  ago(e) {
    const d = Math.floor(this.gameH / 24) - Math.floor(e.t / 24);
    if (d <= 0) return e.h < 12 ? 'this morning' : 'today';
    return d === 1 ? 'yesterday' : d === 2 ? 'two days back' : 'this week';
  }

  duelScore(win, lose) {
    const r = (win.mem.duels ||= {}), s = (lose.mem.duels ||= {});
    r[lose.p.name] = [(r[lose.p.name]?.[0] || 0) + 1, r[lose.p.name]?.[1] || 0];
    s[win.p.name] = [s[win.p.name]?.[0] || 0, (s[win.p.name]?.[1] || 0) + 1];
  }

  // ---- what heroes notice for themselves (four times a second) ---------------------------------------------------------

  scan(snap) {
    const P = this.player, hour = this.hour, band = BANDS[hourBand(hour)];
    const day = Math.floor(this.gameH / 24), nightKey = Math.floor((this.gameH - 12) / 24);
    // Lisandra as heroes see her: whichever of her two forms is walking, if she's out at all.
    const nc = snap[H.NCHARS];
    let her = null;
    for (let i = nc - LISANDRA_FORMS.length; i < nc; i++) {
      const o = CHARS_START + i * C_SIZE;
      if (snap[o + C.ACTIVE] > 0.5) her = { x: snap[o + C.X], z: snap[o + C.Z] };
    }
    const turning = Math.min(Math.abs(hour - DAWN_HOUR), Math.abs(hour - DUSK_HOUR)) < 2 / 60;
    const knights = [];
    const tk0 = this.firstHero - TOWN_KNIGHTS.length;
    for (let i = 0; i < TOWN_KNIGHTS.length; i++) {
      if (TOWN_KNIGHTS[i].kind !== 1) continue;
      const o = CHARS_START + (tk0 + i) * C_SIZE;
      if (snap[o + C.ACTIVE] > 0.5) knights.push({ x: snap[o + C.X], z: snap[o + C.Z] });
    }
    // A spell is judged once it has landed (or not): a second after the cast, with the first thing it struck.
    const magic = this.spellPending && this.t - this.castT > 1.1;
    if (magic) this.spellPending = false;
    for (const h of this.heroes) {
      if (!h.shown || h.dead) continue;
      const near = h.dist, M = h.mem;
      if (near < 16 && !P.dead) {
        // Back after days away: said once, on the first sight of this session.
        if (!h.sawThisRun) {
          h.sawThisRun = true;
          const away = M.lastSaw != null ? day - M.lastSaw : 0;
          if (h.seenPlayer && away >= 3) { M.lastSaw = day; this.say(h, 'player_absent_return', null, { days_away: away >= 12 ? 'a dozen' : words(away) }); continue; }
        }
        M.lastSaw = day;
      }
      if (!h.seenPlayer && near < 16 && !P.dead) { h.seenPlayer = true; this.say(h, 'player_first_sight'); continue; }
      if (near < 6 && !h.fighting && !P.dead && this.t - h.greetT > 300 && h.busyT <= 0) {
        h.greetT = this.t;
        // One who'd stand by the player offers to walk out with them: kept, if the player heads out soon after.
        if (this.say(h, 'player_greet') && this.lastPool?.walk_offer && townDist(P.x, P.z) < 0) h.walkOffer = this.t + 45;
      }
      if (h.walkOffer > this.t && !P.dead && near < 25 && townDist(P.x, P.z) > -8 && P.x * snap[H.VX] + P.z * snap[H.VZ] > 0) { h.walkOffer = 0; this.walkWith(h, 90); }
      // By night a romantic trails the player and the lady, as far as the edge of town and no further.
      if (band === 'night' && her && !P.dead && near < 18 && Math.hypot(her.x - P.x, her.z - P.z) < 12 && townDist(P.x, P.z) < -6
        && this.persona(h) === 'romantic' && !h.fighting && h.busyT <= 0 && this.t - (this.trailT ?? -1e9) > 240 && this.say(h, 'lisandra_follow')) {
        this.trailT = this.t; this.walkWith(h, 150, 'edge');
      }
      if (P.hp < 0.3 && !P.dead && near < 16) this.say(h, 'player_hurt');
      if (P.dead && near < 25 && !this.downSaid) this.say(h, 'player_down');
      if (magic && near < 26 && this.t - this.magicT > 45) {
        this.magicT = this.t; h.magic++;
        // Awe, envy, suspicion by sightings; respect only by a rescue (saved_by_player).
        if (h.stage < 3) h.stage = h.magic < 3 ? 0 : h.magic < 7 ? 1 : 2;
        const spell = this.spellName(), kind = this.spellKind(spell);
        this.say(h, 'player_magic_seen', null, { spell, spellKind: kind, mob: kind === 'harm' ? this.castMob : null });
        if (!M.spells.includes(spell)) M.spells.push(spell);
      }
      if (this.playerSkull?.() && near < 7 && !h.skullSaid) { h.skullSaid = true; this.say(h, 'player_skull'); }
      if (snap[H.SURF] > 0.5 && near < 10 && Math.hypot(snap[H.VX], snap[H.VZ]) > 7) this.say(h, 'player_surf');
      // Lisandra walking by: by day the crone, by night the lady who chose them; and never in the turning of the light.
      // (Nights are counted once each, so the bands in the script count nights, not glances.)
      if (her && !turning && Math.hypot(her.x - h.x, her.z - h.z) < 14 && near < 30) {
        if (band === 'night') { if (M.herNight !== nightKey) { M.herNight = nightKey; h.herSeen++; } this.say(h, 'lisandra_night'); } else if (band === 'day') this.say(h, 'lisandra_day');
      }
      for (const k of knights) if (Math.hypot(k.x - h.x, k.z - h.z) < 4) { this.say(h, 'knight_pass'); break; }
    }
    this.downSaid = P.dead;
    // Idle talk in the town: gossip from the world log, now and then.
    if ((this.gossipT -= 0.25) <= 0) {
      this.gossipT = 30 + Math.random() * 60;
      const idle = this.heroes.filter((h) => h.shown && !h.dead && !h.fighting && h.busyT <= 0 && Math.hypot(h.x, h.z) < 50);
      const h = idle[Math.floor(Math.random() * idle.length)];
      if (h) {
        if (Math.random() < 0.35 && this.say(h, 'gossip_player')) return;
        this.say(h, band === 'night' && Math.random() < 0.4 ? 'well_night' : Math.random() < 0.5 ? 'gossip' : 'town_idle');
      }
    }
  }

  // Two heroes idle side by side: a conversation if one fits them, the bond's own words if not, else a greeting.
  meet(h, o) {
    if (!o || h.busyT > 0 || o.busyT > 0) return;
    const bond = this.bondOf(h, o), band = BANDS[hourBand(this.hour)];
    // Now and then a guildless hero is taken in by one who has a guild.
    if (!h.p.guild && o.p.guild && Math.random() < 0.06) {
      h.p.guild = o.p.guild;
      h.tag.querySelector('i').textContent = `<${h.p.guild}>`; h.tagW = 0;
      this.system(`${h.p.name} has joined <${h.p.guild}>.`);
      this.say(h, 'guild_join', o);
      return;
    }
    const bondTrig = { friend: 'friend_meet', rival: 'rival_meet', respect: 'respect_meet' }[bond];
    if (bondTrig && Math.random() < 0.7) {
      if (this.tryConvo(bondTrig, h, o)) return;
      if (this.say(h, bondTrig, o)) return;
    }
    const wants = ['tessariel_claim', 'gossip'];
    if (band === 'night') wants.push('origin_story', 'origin_story');
    if (h.p.persona === 'newcomer' && o.p.level >= 15) wants.push('mentor');
    for (const w of wants.sort(() => Math.random() - 0.5)) if (this.tryConvo(w, h, o)) return;
    this.say(h, bond === 'guild' ? 'greet_guild' : 'greet', o);
  }

  // ---- the lines -------------------------------------------------------------------------------------------------------

  trig(name) { return { ...this.defaults, ...(this.script?.triggers[name] || {}) }; }

  persona(h) {
    // Newcomers grow up at ten (the script's own ruling).
    if (h.p.persona === 'newcomer' && h.p.level >= 10) return h.p.seed % 2 ? 'kind' : 'earnest';
    return h.p.persona;
  }

  // The time words a gate may use: the four bands, and the finer morning, afternoon and evening.
  timeIs(words) {
    const hr = this.hour, band = BANDS[hourBand(hr)];
    return words.some((w) => w === band || (w === 'morning' && hr >= 5 && hr < 12) || (w === 'afternoon' && hr >= 12 && hr < 17) || (w === 'evening' && hr >= 17 && hr < 21));
  }

  // A memory the script may ask for, for x against y (the other hero; or, in a convo, 'saved_by:X' names the rescuer).
  mem(x, y, k) {
    const M = x.mem, n = y?.p.name;
    switch (k) {
      case 'saved_by_other': return n != null && M.savedBy[n] != null;
      case 'saved_other': return n != null && M.saved[n] != null;
      case 'saved_by_player': return M.savedByPlayer != null;
      case 'duel_record': return n != null && !!M.duels?.[n];
      case 'debt_open': return n != null && M.debts[n] != null;
      case 'owed': return n != null && M.owed[n] != null;
      case 'debt_player': return !!M.debtPlayer;
      default: return false;
    }
  }
  // What {saved_from} names for a memory: the monster of that rescue.
  savedFrom(x, y, k) {
    const M = x.mem, n = y?.p.name;
    if (k === 'saved_by_other' || k === 'debt_open') return M.savedBy[n];
    if (k === 'saved_other' || k === 'owed') return M.saved[n];
    if (k === 'saved_by_player' || k === 'debt_player') return M.savedByPlayer;
    return null;
  }
  tallyKey(o) { return o ? o.p.name : '@player'; }
  duelLead(x, y) { const d = y && x.mem.duels?.[y.p.name]; return !d ? null : d[0] > d[1] ? 'ahead' : d[0] < d[1] ? 'behind' : 'level'; }
  inList(v, x) { return Array.isArray(v) ? v.includes(x) : v === x; }

  // What a line's gate asks of one hero alone: their stage with the player, their nights, the spell, their Tally.
  gateSelf(g, x, o, ctx) {
    const stage = g.stage, herMin = g.her_min, herMax = g.her_max;
    if (stage !== undefined && !this.inList(stage, x.stage)) return false;
    if (herMin !== undefined && x.herSeen < herMin) return false;
    if (herMax !== undefined && x.herSeen > herMax) return false;
    if (g.first_seen !== undefined && x.mem.spells.includes(ctx.spell) === g.first_seen) return false;
    if (g.rescue_spell && !g.rescue_spell.includes(x.mem.rescueSpell)) return false;
    // In a party right now, or not (the sim's party id; -1 for none).
    if (g.in_party !== undefined && (x.party >= 0) !== g.in_party) return false;
    if (g.tally) { const listed = x.mem.tallyNo[this.tallyKey(o)] != null; if ((g.tally === 'listed') !== listed) return false; }
    return true;
  }
  // What it asks of the pair: their bond and what made it, the duel record, a shared phrase for her, what they remember.
  gatePair(g, x, y) {
    if (g.bond && !this.inList(g.bond, this.bondOf(x, y))) return false;
    if (g.cause && !g.cause.includes(this.causeOf(x, y))) return false;
    if (g.duel_lead && !this.inList(g.duel_lead, this.duelLead(x, y))) return false;
    if (g.same_herphrase !== undefined && (!y || (this.herphrase(x) === this.herphrase(y)) !== g.same_herphrase)) return false;
    return true;
  }
  // And of the moment: the hour, the move, the spell, the deed being told, the place.
  gateMoment(g, ctx) {
    if (g.time && !this.timeIs(g.time)) return false;
    if (g.move && g.move !== ctx.move) return false;
    if (g.walk_end && !g.walk_end.includes(ctx.walk_end)) return false;
    if (g.spell_kind && g.spell_kind !== (ctx.spellKind || this.spellKind(ctx.spell))) return false;
    if (g.spell || g.spell_elem) {
      const bySpell = g.spell && g.spell.includes(ctx.spell);
      let byElem = false;
      if (g.spell_elem) {
        const s = SPELLS.find((q) => q.name === ctx.spell);
        const engine = s ? ELEM_NAMES[s.elem] : null;
        const map = this.script?.spell_elements || {};
        byElem = g.spell_elem.some((e) => (map[e] || [e.toUpperCase()]).includes(engine));
      }
      if (!bySpell && !byElem) return false;
    }
    if (g.won !== undefined && g.won !== ctx.won) return false;
    if (g.event) {
      const e = ctx.entry;
      if (!e || !g.event.includes(e.type)) return false;
      if (g.event_age) {
        const dt = this.gameH - e.t;
        const ok = g.event_age === 'fresh' ? dt < 2 : g.event_age === 'today' ? Math.floor(e.t / 24) === Math.floor(this.gameH / 24) : dt <= 7 * 24;
        if (!ok) return false;
      }
    } else if (ctx.entry && EVENT_TRIGS.has(ctx.name)) return false;      // (A deed picked: only the lines that tell one.)
    if (g.place && !(ctx.place && g.place.includes(ctx.place.id))) return false;
    return true;
  }

  // A bark's whole gate, for its speaker h and the other o.
  gate(g, h, o, ctx) {
    if (!this.gateMoment(g, ctx) || !this.gateSelf(g, h, o, ctx) || !this.gatePair(g, h, o)) return false;
    if (g.needs_mem) for (const k of g.needs_mem) if (!this.mem(h, o, k)) return false;
    if (g.needs_mem_not) for (const k of g.needs_mem_not) if (this.mem(h, o, k)) return false;
    return true;
  }

  // A convo's gates once it's cast. stage and the night bands may name each member ({A: 2, C: 3}); a plain value is A's.
  gateCast(c, cast, ctx) {
    const A = cast[c.cast[0]], B = cast[c.cast[1]];
    const per = (v, role) => (v !== null && typeof v === 'object' && !Array.isArray(v) ? v[role] : role === c.cast[0] ? v : undefined);
    for (const role of c.cast) {
      const x = cast[role];
      const other = role === c.cast[0] ? B : A;
      const mine = { ...c, stage: per(c.stage, role), her_min: per(c.her_min, role), her_max: per(c.her_max, role), tally: per(c.tally, role) };
      if (!this.gateSelf(mine, x, /^player_/.test(c.when) ? null : other, ctx)) return false;
      const need = c.needs?.[role] || {};
      if (need.guild === 'none' && x.p.guild) return false;
      if (need.guild === 'some' && !x.p.guild) return false;
      for (const k of (c.needs_mem && !Array.isArray(c.needs_mem) ? c.needs_mem[role] : null) || []) {
        const [key, y] = this.memOf(k, role, cast, c);
        if (y === undefined || !this.mem(x, y, key)) return false;
      }
      for (const k of (c.needs_mem_not && !Array.isArray(c.needs_mem_not) ? c.needs_mem_not[role] : null) || []) {
        const [key, y] = this.memOf(k, role, cast, c);
        if (y !== undefined && this.mem(x, y, key)) return false;
      }
    }
    if (B && !this.gatePair(c, A, B)) return false;
    if (Array.isArray(c.needs_mem)) for (const k of c.needs_mem) if (!this.mem(A, B, k)) return false;
    return true;
  }
  // A convo memory and the cast member it's held against: 'debt_open:A' is a debt to A; 'saved_by:A' is A's rescue;
  // a bare value is against the A-B partner. (undefined: the named member isn't in the cast.)
  memOf(k, role, cast, c) {
    const m = /^(\w+):([A-Z])$/.exec(k);
    if (!m) return [k, role === c.cast[0] ? cast[c.cast[1]] : cast[c.cast[0]]];
    return [m[1] === 'saved_by' ? 'saved_by_other' : m[1], cast[m[2]]];
  }

  herphrase(x) { const phr = this.script?.herphrases || []; const r = rng(x.p.seed + 7); r(); return phr.length ? phr[Math.floor(r() * phr.length)] : null; }
  woke(x) { const wake = this.script?.wakings || []; const r = rng(x.p.seed + 7); return wake.length ? wake[Math.floor(r() * wake.length)] : null; }

  tokens(h, o, ctx) {
    const e = ctx.entry;
    const place = e ? PLACES.find((p) => p.id === e.place) || null : ctx.place || PLACES.find((p) => p.id === 'well');
    const mobKey = e ? e.mob : ctx.mob;
    const mob = mobKey ? MOBS[mobKey] : null;
    const duel = o && h.mem.duels?.[o.p.name];
    const sf = ctx.saved_from ? MOBS[ctx.saved_from]?.name || null : null;
    const t = {
      me: h.p.name, you: o ? o.p.name : this.playerName(), player: this.playerName(), guild: h.p.guild || null, level: String(ctx.level ?? h.p.level),
      class: CLASS_WORD[h.p.cls], a_class: article(CLASS_WORD[h.p.cls]),
      woke: this.woke(h), herphrase: this.herphrase(h),
      inn_count: words(this.heroes.filter((x) => x.shown && Math.hypot(x.x, x.z) < 50).length), hero_count: String(this.population()),
      place: place?.name || null, mob: mob?.name || null, a_mob: mobKey ? A_MOB[mobKey] || mob?.name || null : null,
      item: this.item(h), gold: String(ctx.gold || 10 + Math.floor(Math.random() * 190)), spell: ctx.spell || this.spellName(),
      their_level: o ? String(o.p.level) : null,
      tally: h.p.persona === 'zealot' ? String(h.mem.tallyN) : null,
      tally_no: (() => { const n = h.mem.tallyNo[this.tallyKey(/^player_/.test(ctx.name || '') ? null : o)]; return n != null ? String(n) : null; })(),
      string: h.p.cls === 'archer' && h.p.kit?.string ? h.p.kit.string : null,
      saved_from: sf, duel_record: duel ? `${words(duel[0])} to ${words(duel[1])}` : null,
      actor: e ? e.actor : null, ago: e ? this.ago(e) : null, days_away: ctx.days_away || null,
    };
    // party_call names the class wanted, not the speaker's own.
    if (ctx.wanted) { t.class = CLASS_WORD[ctx.wanted]; t.a_class = article(t.class); }
    return t;
  }

  fill(line, t) {
    let ok = true;
    const out = line.replace(/\{(\w+)\}/g, (m, k) => { const v = t[k]; if (v == null) ok = false; return v ?? ''; });
    // A filled-in place ("the south woods") can open a sentence: give it its capital.
    return ok ? out.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, c) => a + c.toUpperCase()) : null;
  }

  item(h) {
    const r = Math.random();
    const rar = RARITY[r < 0.5 ? 0 : r < 0.8 ? 1 : r < 0.95 ? 2 : r < 0.99 ? 3 : 4];
    const thing = THINGS[Math.floor(Math.random() * THINGS.length)];
    return /^(ruby|sapphire|emerald|topaz|amethyst)$/.test(thing) ? (rar === 'Common' ? 'chipped ' : 'flawless ') + thing : thing.startsWith('scroll') ? thing : `${rar} ${thing}`;
  }

  population() { return this.heroes.length + 37 + Math.floor((Math.sin(this.t / 600) + 1) * 30); }

  remember(text) {
    this.recent.push(text); this.recentSet.add(text);
    if (this.recent.length > RECENT) this.recentSet.delete(this.recent.shift());
  }

  // A hero says something for a trigger: a conversation if one fits and there's company, else a line from the pools.
  say(h, name, o = null, ctx = {}) {
    if (!this.script) return false;
    const tr = this.trig(name);
    if (tr.time && !tr.time.includes(BANDS[hourBand(this.hour)])) return false;
    // (Lisandra's own lines wait out the turning of the light.)
    if (/^lisandra_/.test(name) && Math.min(Math.abs(this.hour - DAWN_HOUR), Math.abs(this.hour - DUSK_HOUR)) < 2 / 60) return false;
    const key = name + (ctx.move || '');
    const last = h.cool.get(key) ?? -1e9;
    if (this.t - last < (tr.cooldown ?? 25)) return false;
    if (Math.random() > (tr.chance ?? 1)) return false;
    // Someone mid-sentence finishes first, unless this matters more.
    if (h.bubbleT > 0.5 && (tr.priority ?? 2) < 3) return false;
    ctx = { ...ctx, name };
    this.lastPool = null;
    // Gossip, bards and guild talk tell of a deed from the world log, more often than not, when there's one to tell.
    if (EVENT_TRIGS.has(name) && ctx.entry === undefined) ctx.entry = Math.random() < 0.65 ? this.entryFor(name, h, o) : null;
    h.cool.set(key, this.t);
    if (o === null && this.convos?.get(name) && Math.random() < 0.45 && this.tryConvo(name, h, null, ctx)) return true;
    if (o && this.convos?.get(name) && Math.random() < 0.6 && this.tryConvo(name, h, o, ctx)) return true;
    let line = this.pick(name, h, o, ctx, tr);
    // (No line tells this deed: say something that tells none.)
    if (!line && ctx.entry) line = this.pick(name, h, o, { ...ctx, entry: null }, tr);
    if (!line) return false;
    this.lastPool = line.pool;
    this.speak(h, line.text, line.channel || tr.audience || 'say', line.anim);
    return true;
  }

  // From the blended pools: the plain ones once, class, persona and time-of-day ones twice.
  pick(name, h, o, ctx, tr) {
    const pools = (this.barks.get(name) || []).filter((b) => {
      if (b.class !== 'any' && b.class !== h.p.cls) return false;
      if (b.persona !== 'any' && b.persona !== this.persona(h)) return false;
      return this.gate(b, h, o, ctx);
    });
    if (!pools.length) return null;
    const base = this.tokens(h, o, ctx);
    const weighted = [];
    for (const b of pools) {
      const specific = b.class !== 'any' || b.persona !== 'any' || b.time || b.stage !== undefined || b.move || b.bond || b.event;
      // (A pool that needs a memory, a debt or a rescue, says the thing that matters most when it applies: mostly that.)
      // (Debts weigh most; a rescue long repaid comes up now and then, not every time.)
      const w = b.needs_mem?.some((k) => k === 'debt_open' || k === 'owed' || k === 'debt_player') ? 10 : b.needs_mem?.length ? 3 : specific ? 2 : 1;
      for (const line of b.lines) weighted.push([b, line, w]);
    }
    for (let tries = 0; tries < 24; tries++) {
      let sum = 0;
      for (const x of weighted) sum += x[2] / (this.recentSet.has(x[1]) ? 50 : 1);
      if (sum <= 0) return null;
      let r = Math.random() * sum, got = weighted[0];
      for (const x of weighted) { r -= x[2] / (this.recentSet.has(x[1]) ? 50 : 1); if (r <= 0) { got = x; break; } }
      const b = got[0];
      // {saved_from} is the rescue this pool's memory names; a new name on a zealot's Tally gets its number now.
      let t = base;
      const sk = (b.needs_mem || []).find((k) => this.savedFrom(h, o, k) != null);
      if (sk) t = { ...base, saved_from: MOBS[this.savedFrom(h, o, sk)]?.name || null };
      if (b.tally === 'new') t = { ...t, tally: String(h.mem.tallyN + 1), tally_no: String(h.mem.tallyN + 1) };
      const text = this.fill(got[1], t);
      if (!text || text.length > 120) { got[2] = 0; continue; }
      if (b.tally === 'new') { h.mem.tallyN++; h.mem.tallyNo[this.tallyKey(o)] = h.mem.tallyN; }
      this.remember(got[1]);
      return { text, channel: b.channel, anim: b.anim && b.anim !== '-' ? b.anim : null, pool: b };
    }
    return null;
  }

  // Out loud: a bubble over the head and, in earshot, the log. Town-wide channels go to the log only.
  speak(h, text, channel = 'say', anim = null, emote = null) {
    if (channel === 'guild') return;     // (Seen only by a guild's own: the player's in none.)
    if (channel === 'system') { this.system(text); return; }
    const near = h.dist < EARSHOT && h.shown;
    if (channel === 'say' || channel === 'party') {
      if (!h.shown) return;
      h.bub.textContent = text;
      h.bub.className = 'bub' + (channel === 'party' ? ' party' : '');
      h.bubW = h.bub.offsetWidth; h.bubH = h.bub.offsetHeight;   // (Measured once per line, for the stacking in update.)
      h.bubbleT = Math.min(8, 2.4 + text.length * 0.055);
      if (near) this.logLine(channel, h.p.name, text);
    } else this.logLine(channel, h.p.name, text);
    if (emote) this.emote(h, emote);
    if (anim) this.act(h, anim);
  }

  emote(h, e) {
    h.mark.textContent = EMOTE[e] || '';
    h.mark.className = 'mark ' + e;
    h.markT = 2.6;
  }

  act(h, anim) {
    const g = ANIM[anim] || anim;
    if (!GESTURES[g]) return;
    this.sim.postMessage({ type: 'heroAct', slot: h.p.slot, name: g, seconds: g === 'sit' ? 8 : undefined });
  }

  system(text) { this.logLine('system', null, text); }

  logLine(channel, who, text) {
    const [label, colour] = CHANNEL[channel] || CHANNEL.say;
    const el = document.createElement('div');
    el.style.color = colour;
    const tag = label ? `<span class="c">[${label}]</span> ` : '';
    el.innerHTML = `${tag}${who ? `<span class="n">${esc(who)}:</span> ` : ''}${esc(text)}`;
    this.chat.appendChild(el);
    (this.log2 ||= []).push({ el, t: channel === 'system' ? 10 : 14 });
    const most = this.touch ? 4 : 8;
    while (this.log2.length > most) this.log2.shift().el.remove();
  }

  // ---- conversations -------------------------------------------------------------------------------------------------

  // Find a cast for a conversation: the hero who started it as its first voice, the other where it fits, and anyone idle close by.
  tryConvo(name, h, o, ctx = {}) {
    ctx = { ...ctx, name };
    if (EVENT_TRIGS.has(name) && ctx.entry === undefined) ctx.entry = Math.random() < 0.65 ? this.entryFor(name, h, o) : null;
    const list = (this.convos?.get(name) || []).filter((c) => !this.convosUsed.includes(c.id) && this.gateMoment(c, ctx));
    if (!list.length) return false;
    const pool = [h, ...(o ? [o] : []), ...this.heroes.filter((x) => x !== h && x !== o && x.shown && !x.dead && x.busyT <= 0 && !x.fighting && Math.hypot(x.x - h.x, x.z - h.z) < 9)];
    for (const c of list.sort(() => Math.random() - 0.5)) {
      // Townsfolk roles wait for the townsfolk; Lisandra and the town's knights are here.
      const roles = c.cast.map((r) => c.needs?.[r]?.role).filter(Boolean);
      if (roles.some((r) => r !== 'hero')) continue;
      if (!ctx.combat && c.combat && !h.fighting) continue;
      const cast = this.castFor(c, pool, h, o, ctx);
      if (!cast) continue;
      // The rescue a convo's memory names is what {saved_from} says.
      let saved = null;
      for (const [role, ks] of Object.entries(c.needs_mem && !Array.isArray(c.needs_mem) ? c.needs_mem : {})) for (const k of ks) {
        const [key, y] = this.memOf(k, role, cast, c);
        const got = this.savedFrom(cast[role], y, key);
        if (got != null) saved = got;
      }
      this.playConvo(c, cast, saved ? { ...ctx, saved_from: saved } : ctx);
      return true;
    }
    return false;
  }

  // A cast, role by role: each the first who fits the role's needs and, with those already cast, the convo's gates.
  // (A pair that must share a phrase for her looks for one that does, and skips the convo if none is near.)
  castFor(c, pool, h, o, ctx) {
    const fits = (x, need = {}) => (!need.class || need.class === x.p.cls) && (!need.persona || need.persona === this.persona(x)) && (!need.sex || need.sex === x.p.sex)
      && (need.guild !== 'none' || !x.p.guild) && (need.guild !== 'some' || !!x.p.guild);
    const out = {};
    const used = new Set();
    const order = [h, o].filter(Boolean);
    const pairOk = (role, x) => role !== c.cast[1] || this.gatePair(c, out[c.cast[0]], x);
    for (const role of c.cast) {
      const need = c.needs?.[role] || {};
      const cands = [...order, ...pool].filter((x, i, a) => a.indexOf(x) === i && !used.has(x) && fits(x, need) && pairOk(role, x));
      const got = cands[0];
      if (!got) return null;
      if (role === c.cast[0] && got !== h) return null;
      out[role] = got; used.add(got);
    }
    return this.gateCast(c, out, ctx) ? out : null;
  }

  playConvo(c, cast, ctx) {
    this.convosUsed.push(c.id);
    if (this.convosUsed.length > 60) this.convosUsed.shift();
    // A zealot whose Tally is 'new' here adds the other (or, on a player trigger, the player) now, for good,
    // unless a line fails to fill and the convo never plays.
    const added = [];
    for (const role of c.cast) {
      const v = c.tally !== null && typeof c.tally === 'object' ? c.tally[role] : role === c.cast[0] ? c.tally : undefined;
      if (v !== 'new') continue;
      const x = cast[role], other = cast[role === c.cast[0] ? c.cast[1] : c.cast[0]];
      const key = this.tallyKey(/^player_/.test(c.when) ? null : other);
      added.push([x, key, x.mem.tallyNo[key]]);
      x.mem.tallyN++;
      x.mem.tallyNo[key] = x.mem.tallyN;
    }
    const beats = c.beats.map((b) => {
      const who = cast[b.who];
      const other = b.to ? cast[b.to] : cast[b.who === c.cast[0] ? c.cast[1] : c.cast[0]] || Object.values(cast).find((x) => x !== who);
      const text = this.fill(b.line, this.tokens(who, other, ctx));
      return text ? { who, text, anim: b.anim, emote: b.emote, dur: Math.min(6.5, 2.2 + text.length * 0.05) } : null;
    });
    if (beats.some((b) => !b)) {
      for (const [x, key, was] of added) { x.mem.tallyN--; if (was == null) delete x.mem.tallyNo[key]; else x.mem.tallyNo[key] = was; }
      return;
    }
    const total = beats.reduce((a, b) => a + b.dur + 0.35, 0);
    const members = Object.values(cast);
    for (const x of members) x.busyT = total;
    this.sim.postMessage({ type: 'heroHold', slots: members.map((x) => x.p.slot), seconds: total + 0.5 });
    const channel = c.channel || 'say';
    this.convo.push({ beats, i: 0, t: 0.4, members, channel });
  }

  stepConvos(dt) {
    for (const h of this.heroes) h.busyT -= dt;
    for (const cv of this.convo) {
      cv.t -= dt;
      if (cv.t > 0) continue;
      // Someone fell, or a fight broke out: the rest goes unsaid.
      if (cv.members.some((x) => x.dead || !x.shown)) { cv.done = true; continue; }
      const b = cv.beats[cv.i++];
      if (!b) { cv.done = true; continue; }
      this.speak(b.who, b.text, cv.channel, b.anim, b.emote);
      b.who.bubbleT = b.dur;
      cv.t = b.dur + 0.35;
    }
    this.convo = this.convo.filter((c) => !c.done);
  }

  // ---- a word with a hero (E): they stop, turn to you, and talk -------------------------------------------------------

  // The hero the player is facing, close enough for a word (the townsfolk's rule in src/ui/folk.js nearest).
  nearest(px, py, pz, yaw) {
    if (!this.script || this.open) return null;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    let best = null, bs = Infinity;
    for (const h of this.heroes) {
      if (!h.shown || h.dead || h.below || Math.abs(h.y - py) > 1.6) continue;
      const dx = h.x - px, dz = h.z - pz, d = Math.hypot(dx, dz);
      if (d > TALK_REACH) continue;
      const ahead = d < 0.01 ? 1 : (dx * fx + dz * fz) / d;
      if (ahead < 0.45 && d > 1.1) continue;
      const s = d * (1.6 - ahead);
      if (s < bs) { bs = s; best = h; }
    }
    if (!best) return null;
    if (best.p.broker) return { h: best, busy: false, label: `Hire a party of ${best.p.name}` };
    return { h: best, busy: best.fighting, label: best.fighting ? `${best.p.name} is fighting` : `Talk to ${best.p.name}` };
  }

  // Stopped for a word: the sim holds them square on to the player (src/sim/hero.js talkTo), and they greet you.
  talkTo(h) {
    // (A quartermaster of the Free Company opens his books instead: src/ui/party.js.)
    if (h?.p.broker) { this.ui.broker?.(h); return; }
    if (!h || h.dead || h.fighting || this.open || !this.script) return;
    this.open = h; this.talkKeep = 30;
    h.greetT = this.t; h.walkOffer = 0;
    this.sim.postMessage({ type: 'heroTalk', slot: h.p.slot, on: true });
    this.ui.opened?.();
    this.panel.style.display = 'flex';
    this.showTalk(this.talkLine(h, ['player_greet', 'greet']) || `${this.playerName()}.`);
  }

  showTalk(line) {
    const h = this.open;
    if (!h) return;
    this.talkOpts = this.optsFor(h);
    const title = `Level ${h.p.level} ${CLASSES[h.p.cls].title}`;
    this.panel.innerHTML = `<div class="tk-head"><span class="tk-name">${esc(h.p.name)}</span><span class="tk-title">${esc(title)}</span><span class="tk-guild">${h.p.guild ? esc(`<${h.p.guild}>`) : ''}</span>${CLOSE_X}</div>
      <div class="tk-line">${esc(line)}</div><ol></ol>`;
    // The × in the corner: the talk's over at once, as Esc ends it.
    this.panel.querySelector('.menu-x').onclick = () => this.closeTalk(false);
    const ol = this.panel.querySelector('ol');
    this.talkOpts.forEach((o, k) => {
      const li = document.createElement('li');
      li.className = o.dim ? 'dim' : '';
      li.innerHTML = `<kbd>${k + 1}</kbd><span>${esc(o.label)}</span>`;
      li.onclick = () => this.chooseTalk(k);
      ol.appendChild(li);
    });
  }

  // You never speak: what you can do is ask, by a look and a gesture, and they answer.
  optsFor(h) {
    const asked = (this.asked ||= new Map()).get(h) || new Set();
    const o = (key, label, run) => ({ key, label, run, dim: asked.has(key) && key !== 'bye' && key !== 'walk' });
    // One of your party: a word, or let them go back to the Company.
    if (this.ui.isMember?.(h.p.slot)) return [
      o('news', 'Ask how they fare', () => this.ask(h, 'news', ['player_request', 'gossip_player', 'town_idle'], this.huntCtx())),
      o('woke', 'Ask where they woke', () => this.ask(h, 'woke', ['origin_story', 'player_rivalry'])),
      o('dismiss', 'Let them go from your party', () => { this.closeTalk(false, ''); this.ui.dismiss?.(h.p.slot); }),
      o('bye', 'Nod, and go', () => this.closeTalk(true)),
    ];
    return [
      o('woke', 'Ask where they woke', () => this.ask(h, 'woke', ['origin_story', 'player_rivalry'])),
      o('claim', 'Ask if they are Tessariel', () => this.ask(h, 'claim', ['player_rivalry', 'tessariel_claim'])),
      o('news', 'Ask for news', () => this.ask(h, 'news', ['gossip_player', 'gossip', 'town_idle'])),
      o('work', 'Ask if anything needs killing', () => this.ask(h, 'work', ['player_request'], this.huntCtx())),
      o('walk', 'Ask them to walk with you', () => this.askWalk(h)),
      o('bye', 'Nod, and go', () => this.closeTalk(true)),
    ];
  }

  chooseTalk(k) {
    const o = this.talkOpts?.[k];
    if (!o) return;
    this.ui.click?.();
    o.run();
  }

  ask(h, key, names, ctx = {}) {
    ((this.asked ||= new Map()).get(h) || this.asked.set(h, new Set()).get(h)).add(key);
    this.showTalk(this.talkLine(h, names, ctx) || 'Hm. Ask me another day.');
  }

  askWalk(h) {
    const line = this.talkLine(h, ['player_walk_ask']);
    // (A hero in a party says no: src/sim/hero.js walkFor would refuse anyway.)
    if (h.party < 0) {
      this.closeTalk(false, line);
      this.walkWith(h, 120);
    } else this.showTalk(line || 'My party is waiting on me.');
  }

  // Somewhere worth a hunt, and the thing to hunt there, for a request.
  huntCtx() {
    const spots = PLACES.filter((p) => p.kind === 'hunt' && p.mobs?.length);
    const place = spots[Math.floor(Math.random() * spots.length)];
    return { place, mob: place.mobs[Math.floor(Math.random() * place.mobs.length)] };
  }

  // A line from the first pool that has one for this hero, said out loud too (the bubble, the log, the gesture).
  talkLine(h, names, ctx = {}) {
    for (const name of names) {
      const c = { ...ctx, name };
      if (EVENT_TRIGS.has(name) && c.entry === undefined) c.entry = this.entryFor(name, h, null);
      const tr = this.trig(name);
      let line = this.pick(name, h, null, c, tr);
      if (!line && c.entry) line = this.pick(name, h, null, { ...c, entry: null }, tr);
      if (!line) continue;
      h.cool.set(name, this.t);
      this.speak(h, line.text, 'say', line.anim);
      return line.text;
    }
    return null;
  }

  stepTalk(dt) {
    const h = this.open;
    // A fight, a fall, or out of sight: the talk is over.
    if (h.dead || h.fighting || !h.shown || h.dist > 9) { this.closeTalk(false); return; }
    // (The sim lets a talk lapse after a while; keep it held while the panel is up.)
    if ((this.talkKeep -= dt) <= 0) { this.talkKeep = 30; this.sim.postMessage({ type: 'heroTalk', slot: h.p.slot, on: true }); }
  }

  closeTalk(bye, said = null) {
    const h = this.open;
    if (!h) return;
    this.open = null;
    this.panel.style.display = 'none';
    this.sim.postMessage({ type: 'heroTalk', slot: h.p.slot, on: false });
    if (said == null && bye) this.talkLine(h, ['farewell']);
    this.ui.closed?.();
  }

  key(e) {
    if (!this.open || e.repeat) return;
    const n = e.code.startsWith('Digit') ? +e.code.slice(5) : e.code.startsWith('Numpad') ? +e.code.slice(6) : NaN;
    if (!Number.isNaN(n) && n > 0) { e.preventDefault(); this.chooseTalk(n - 1); return; }
    if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); this.closeTalk(e.code !== 'Escape'); }
  }

  // ---- the rest of the server: Trade and Shout from heroes who aren't standing in front of you -------------------------

  chatter() {
    if (!this.script || !this.names) return;
    const r = Math.random();
    const name = r < 0.55 ? 'trade_call' : r < 0.8 ? 'guild_recruit' : 'show_off';
    const sex = Math.random() < 0.5 ? 'female' : 'male';
    const nm = this.names[sex][Math.floor(Math.random() * this.names[sex].length)];
    const cls = Object.keys(CLASSES)[Math.floor(Math.random() * 8)];
    const personas = ['earnest', 'braggart', 'goblin', 'kind', 'minmaxer', 'jokester', 'lorenerd', 'grumbler', 'romantic', 'quiet', 'zealot'];
    const ghost = { p: { name: nm, cls, sex: sex[0], persona: personas[Math.floor(Math.random() * personas.length)], level: 5 + Math.floor(Math.random() * 30), seed: Math.floor(Math.random() * 1e9),
      guild: this.names.guilds[Math.floor(Math.random() * this.names.guilds.length)], kit: {} }, mem: { ...freshMem(), tallyN: 40 }, stage: 0, herSeen: 0, cool: new Map(), dist: 1e9, shown: false };
    const line = this.pick(name, ghost, null, {}, this.trig(name));
    if (!line) return;
    const ch = line.channel === 'say' || line.channel === 'party' ? (name === 'trade_call' ? 'trade' : 'shout') : line.channel;
    this.logLine(ch, nm, line.text);
  }
}

// A style set only when it changes: a frame's worth of writes to the page is otherwise a frame's worth of style work.
const css = (el, k, v) => { const c = el._css || (el._css = {}); v = String(v); if (c[k] !== v) { c[k] = v; el.style[k] = v; } };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
