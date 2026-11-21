// Talking with Bellmourn: what's said in the street, over the speaker's head; a word with someone (E), with what they've to
// say, what they'll tell you, the work they've got, and their counter if they keep one; the quest log (J); and the notes
// that come up as things happen; and the ! and ? over the heads of those with work. Lisandra, once she's walked you down,
// stands where the Long Road comes in and is talked to here too (src/folk/lines/lisandra.js). What's said is src/folk/lines/;
// quests' workings src/folk/quests.js; trade src/folk/shops.js.
import { CROWD, FOLK, PEOPLE, POSTED, first as firstName } from '../folk/people.js';
import { LINES as LA } from '../folk/lines/town_a.js';
import { LINES as LB } from '../folk/lines/town_b.js';
import { LINES as LC } from '../folk/lines/town_c.js';
import { QUESTS } from '../folk/lines/quests.js';
import { BEYOND, LINES as LBEY } from '../folk/lines/beyond.js';
import { LINES as LLAND } from '../folk/lines/land.js';
import { LINES as LPHOBOS } from '../folk/lines/phobos.js';
import { LINES as LHUBS } from '../folk/lines/phobos-hubs.js';
import { LISANDRA, LINES as LLIS } from '../folk/lines/lisandra.js';
import { C, CHARS_START, C_PROPS, C_SIZE, H } from '../core/layout.js';
import { LISANDRA_FORMS } from '../core/lisandra.js';
import { OPENING } from '../core/opening.js';
import { TOWN_KNIGHTS } from '../core/knights.js';
import { QuestBook, RULES, WATCH_MAX, sayable } from '../folk/quests.js';
import { CRAFTS, GOODS, MAX_EMBERS, TRADES, matsText, offerFor, priceText, rollStock, worth } from '../folk/shops.js';
import { DAYS, partOfDay } from '../folk/days.js';
import { MATS, colorOf, makeRng, matName, nameOf, rollSkull } from '../items/items.js';
import { MAX_EXTRA, slotPrice } from '../items/pack.js';
import { SPELLS } from '../sim/spells.js';
import { CLOSE_X } from './menu-x.js';
import { art } from './skin.js';
import { giverOf, hintOf, levelTone, nameOf as whoName, objectivesOf, placeOf, questLevel, rewardsOf, shortOf, standOf, zoneOf, zoneRank } from './questlog.js';
import { icon, paintIcons } from './icons.js';

const LINES = { ...LA, ...LB, ...LC, ...LBEY, ...LLAND, ...LLIS, ...LPHOBOS, ...LHUBS };
// Where the people out past the town keep (src/folk/lines/beyond.js): the middle of the beat they walk (core/knights.js).
// (Or, with no knight flagged as theirs, where their entry says they stand: `at`.)
const BEYOND_AT = Object.fromEntries(BEYOND.map((b) => {
  const k = TOWN_KNIGHTS.find((t) => t[b.id]), r = k?.route || [b.at];
  return [b.id, { x: r.reduce((s, p) => s + p[0], 0) / r.length, z: r.reduce((s, p) => s + p[1], 0) / r.length, k: k ? TOWN_KNIGHTS.indexOf(k) : -1 }];
}));
const ACT = { SLEEP: 2, WORK: 4, SHOP: 5, FLEE: 12, HIDE: 13 };
const REACH = 2.3;
// A keeper behind a stall's counter is further than that from anyone in front of it: the counter's 1.2 m deep, and they stand back of it.
const STALL_REACH = 3.4;

// Wes Harrow the tanner lets packs out (letOut): room bought a cell at a time, each dearer than the last (src/items/pack.js
// slotPrice). The words, for auto-play to find them by (src/ui/autobrain.js).
export const PACK_MAKER = 'wes';
export const LET_OUT = 'Could you let my pack out?';
export const ONE_MORE = 'One more pocket';
// Lisandra unbinds what you've learned (unbind): every point spent back, for a fee that's next to nothing. (The spellbook's own
// Unlearn button, B, does it anywhere, for more: src/sim/skills.js respecCost.)
export const UNBIND = "Could you undo what I've learned?";
export const unbindFee = (level) => 5 + 2 * level;
const SEEN = 19;               // balloons further off than this aren't shown
const MARK_SEEN = 70;          // nor quest marks further off than this (the Bellwright's tower, out on its knoll, further)
const FOV = 64;                // the camera's, top to bottom (src/gfx/renderer.js)

// What the player asks about, in their own words.
const TOPICS = { tessariels: 'The other Tessariels', knight: 'The knight at the cathedral', dead: 'The walking dead', lis: 'Lisandra', town: 'Bellmourn', silver: 'The silver knight by the green' };
// What the player can say back, to a few, after they've told of the other Tessariels and the beautiful woman (lines: `old`).
const OLD = "She wasn't beautiful. She was old.";

const STYLE = `
body.folk-talking #cross, body.folk-talking #take { visibility: hidden; }
/* (The words and the marks are placed from the screen's corner, so their holders are a point there, not the whole screen.
   Over the world's picture, a holder the screen's size is a picture of its own the screen's size: 11 MB on an iPhone, made
   again each time it's shown.) */
#folkSay { position: fixed; left: 0; top: 0; width: 0; height: 0; overflow: visible; pointer-events: none; z-index: 6; }
.fb { position: absolute; transform: translate(-50%, -100%); width: max-content; max-width: min(270px, 60vw); padding: 7px 11px 8px; background: #f3e5c3; color: #2a1a0e;
  border: 1.5px solid #c9a96a; border-radius: 8px; outline: 2px solid #19100d; box-shadow: 0 4px 10px #0008; font: 600 14.5px/1.28 "Alegreya Sans", "Segoe UI", sans-serif; text-align: center; transition: opacity .25s; }
.fb::after { content: ""; position: absolute; left: calc(50% - 6px); bottom: -9px; width: 11px; height: 11px; background: #f3e5c3; border-right: 1.5px solid #19100d; border-bottom: 1.5px solid #19100d; transform: rotate(45deg); }
.fb .who { position: absolute; bottom: calc(100% + 4px); left: 6px; white-space: nowrap; font: italic 600 12.5px "Alegreya Sans", sans-serif; color: #f3e5c3; text-shadow: 0 1px 3px #000, 0 0 4px #000; }
.fb.small { font-size: 13.5px; background: #ece0c4; }
#folkTalk { position: fixed; z-index: 12; display: none; background: rgba(11,9,7,.95); border: 1px solid var(--gold-dim); box-shadow: 0 10px 34px #000b; color: var(--bone); font-family: BmNum, Georgia, serif; }
#folkTalk { left: 50%; bottom: max(3vh, 14px); transform: translateX(-50%); width: min(780px, 94vw); max-height: 88vh; padding: 13px 18px 10px; display: none; flex-direction: column; }
#folkTalk .tk-head { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid rgba(140,115,68,.42); padding-bottom: 6px; margin-bottom: 9px; }
#folkTalk .tk-name { font: 700 18px Cinzel, BmNum, Georgia, serif; color: var(--gold); letter-spacing: .05em; }
#folkTalk .tk-title { font-size: 13px; opacity: .62; font-style: italic; }
#folkTalk .tk-purse { margin-left: auto; font-size: 13px; color: #e8c15a; }
#folkTalk .tk-head .menu-x { align-self: center; margin: -6px -10px 0 4px; }
#folkTalk .tk-line { font-size: 17px; line-height: 1.5; min-height: 2.6em; animation: tkIn .28s ease-out; }
#folkTalk .tk-line .sp { color: var(--gold); font-style: italic; margin-right: .35em; }
@keyframes tkIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
.tk-paper { white-space: pre-wrap; background: linear-gradient(#ecdfc2, #e2d1ad); color: #2b1d10; font: 15px/1.5 BmNum, Georgia, serif; padding: 13px 18px; margin: 10px 0 2px; max-height: 38vh; overflow: auto;
  box-shadow: inset 0 0 34px rgba(120,80,30,.4), 0 2px 8px #0008; }
#folkTalk ol { list-style: none; margin: 9px 0 0; padding: 0; overflow: auto; }
#folkTalk li { display: flex; gap: 9px; align-items: baseline; padding: 4px 8px; cursor: pointer; font-size: 15.5px; color: #d6c8a5; border-radius: 3px; }
#folkTalk li:hover { background: rgba(201,163,92,.15); color: #fff4da; }
#folkTalk li kbd { flex: none; min-width: 1.5em; text-align: center; font: 12px BmNum, Georgia, serif; color: var(--gold-dim); border: 1px solid rgba(140,115,68,.5); border-radius: 3px; padding: 0 3px; }
#folkTalk li.offer span::before { content: "!  "; font-weight: 700; color: #f2d04f; }
#folkTalk li.q span { color: #f1d78f; }
#folkTalk li.q span::before { content: "\\25C6  "; color: #e8c15a; font-size: 11px; }
#folkTalk li.gossip span { font-style: italic; }
#folkTalk li.dim { opacity: .45; }
.tk-tabs { display: flex; gap: 4px; margin: 10px 0 6px; }
.tk-tabs button { font: 13px BmNum, Georgia, serif; letter-spacing: .08em; text-transform: uppercase; color: #cdbd98; background: transparent; border: 1px solid rgba(140,115,68,.45); padding: 4px 12px; cursor: pointer; }
.tk-tabs button.on { color: #11100c; background: var(--gold); border-color: var(--gold); }
.tk-wares { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 5px; max-height: 40vh; overflow: auto; padding: 2px; }
.tk-ware { display: flex; gap: 9px; align-items: center; padding: 5px 7px; border: 1px solid rgba(140,115,68,.3); background: rgba(255,255,255,.025); cursor: pointer; min-height: 52px; }
.tk-ware:hover { background: rgba(201,163,92,.12); border-color: rgba(201,163,92,.6); }
.tk-ware.no { opacity: .5; }
.tk-ware .pic { flex: none; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; }
.tk-ware .pic .ico { height: 46px; }
.tk-ware .pic svg { width: 40px; height: 40px; }
.tk-ware .nm { font-size: 14px; line-height: 1.25; }
.tk-ware .pr { font-size: 12.5px; color: #e8c15a; margin-top: 2px; }
.tk-ware .pr.need { color: #c9b48a; }
.tk-ember { display: flex; gap: 8px; align-items: center; font-size: 13.5px; margin: 2px 0 6px; color: #e9b48a; }
.tk-ember button { width: 24px; height: 22px; font: 14px BmNum, Georgia; color: var(--bone); background: rgba(255,255,255,.06); border: 1px solid rgba(140,115,68,.5); cursor: pointer; }
.tk-satchel { font-size: 12.5px; opacity: .8; margin-top: 6px; }
/* (The quest log, #folkBook: src/ui/menus.css, with the other menus.) */
#folkNotes { position: fixed; left: 50%; top: 13vh; transform: translateX(-50%); z-index: 7; display: flex; flex-direction: column; align-items: center; gap: 5px; pointer-events: none; }
.fn { padding: 5px 14px; background: rgba(8,6,4,.72); border: 1px solid rgba(140,115,68,.45); font: 15px BmNum, Georgia, serif; letter-spacing: .02em; color: var(--bone); transition: opacity .6s, transform .6s; }
.fn.quest, .fn.done { color: #f1d78f; border-color: rgba(232,193,90,.7); font-size: 16px; }
.fn.mat { font-size: 14px; }
.fn.drop { color: #f3c4b6; border-color: rgba(238,141,117,.6); }
.fn.gone { opacity: 0; transform: translateY(-6px); }
#folkMarks { position: fixed; left: 0; top: 0; width: 0; height: 0; overflow: visible; pointer-events: none; z-index: 5; }
body:not(.playing) #folkMarks, body.cinematic #folkMarks { display: none; }
.qm { position: absolute; transform: translate(-50%, -100%); font: 900 var(--s, 44px)/1 BmNum, Georgia, "Times New Roman", serif; color: #ffd21f;
  -webkit-text-stroke: .09em #2a1700; paint-order: stroke fill; text-shadow: 0 0 .18em #000c, 0 .06em .1em #000; }
.qm span { display: block; animation: qmBob 1.6s ease-in-out infinite; }
.qm.busy { color: #b9b6ae; -webkit-text-stroke-color: #1a1a1a; }
@keyframes qmBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-.12em); } }
#folkFade { position: fixed; inset: 0; z-index: 11; background: #000; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 1.1s; display: flex; align-items: center; justify-content: center; font: italic 18px BmNum, Georgia, serif; color: #cdbd98; }
`;

// Small drawings for the things sold that aren't items in the pack.
const GLYPH = {
  bed: '<svg viewBox="0 0 40 40"><rect x="5" y="18" width="30" height="10" rx="2" fill="#7a4a2a"/><rect x="5" y="14" width="9" height="7" rx="2" fill="#e6dcc4"/><rect x="13" y="15" width="22" height="6" rx="2" fill="#8b2e22"/><rect x="5" y="27" width="3" height="7" fill="#5a361e"/><rect x="32" y="27" width="3" height="7" fill="#5a361e"/></svg>',
  ale: '<svg viewBox="0 0 40 40"><rect x="10" y="11" width="17" height="22" rx="2" fill="#6b4a2a"/><path d="M27 15h4a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-4" stroke="#6b4a2a" stroke-width="3" fill="none"/><path d="M9 12c2-5 17-5 19 0" fill="#efe2bf"/><rect x="10" y="17" width="17" height="2" fill="#3f2a17"/><rect x="10" y="27" width="17" height="2" fill="#3f2a17"/></svg>',
  roll: '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="23" rx="12" ry="8" fill="#b9793a"/><path d="M12 21q4-5 8 0q4-5 8 0" stroke="#e7b874" stroke-width="2" fill="none"/></svg>',
  loaf: '<svg viewBox="0 0 40 40"><path d="M6 27c0-9 7-14 14-14s14 5 14 14z" fill="#a8672e"/><path d="M12 20l3 4M18 17l3 4M24 17l3 4" stroke="#e4b06c" stroke-width="2"/><rect x="5" y="26" width="30" height="4" rx="2" fill="#7b4720"/></svg>',
  dressing: '<svg viewBox="0 0 40 40"><rect x="9" y="14" width="22" height="12" rx="6" fill="#e9e0cc"/><path d="M14 14v12M20 14v12M26 14v12" stroke="#c9bb9a" stroke-width="1.5"/><circle cx="31" cy="12" r="4" fill="#7c9a4a"/><circle cx="34" cy="16" r="3" fill="#94b45a"/></svg>',
  candle: '<svg viewBox="0 0 40 40"><rect x="16" y="15" width="8" height="18" rx="1" fill="#e6d7a6"/><rect x="12" y="32" width="16" height="3" rx="1" fill="#6b5030"/><path d="M20 6c3 4 3 7 0 9c-3-2-3-5 0-9z" fill="#ffb347"/></svg>',
  oil: '<svg viewBox="0 0 40 40"><path d="M14 15h12l3 18H11z" fill="#5f6b4a"/><rect x="16" y="9" width="8" height="6" fill="#4a3a26"/><rect x="13" y="22" width="14" height="7" fill="#d2a54e" opacity=".85"/></svg>',
  grave_candle: '<svg viewBox="0 0 40 40"><rect x="15" y="13" width="10" height="20" rx="1" fill="#efe8d4"/><path d="M15 18q3 3 5 0q3-3 5 0" stroke="#cbbfa0" fill="none"/><rect x="11" y="32" width="18" height="3" rx="1" fill="#3a332b"/><path d="M20 3c3 4 3 7 0 9c-3-2-3-5 0-9z" fill="#ffe7a8"/></svg>',
};
// (A painted picture from the art kit, where there is one: src/ui/skin.js.)
const painted = (k) => { const u = art('goods', k); return u ? `<img src="${u}" alt="" style="width:44px;height:44px;object-fit:contain">` : null; };
const goodPic = (k) => painted(k) || GLYPH[k];
const matDrawn = (k) => `<svg viewBox="0 0 40 40"><g fill="${MATS[k].color}" stroke="#1b130b" stroke-width="1.2">${{
  bone: '<path d="M8 26l20-12 3 3-20 12z"/><path d="M12 31l17-5 1 3-17 5z"/><path d="M14 13l9 15-3 1-9-14z"/>',
  iron: '<rect x="8" y="22" width="24" height="5" rx="1"/><path d="M12 9h4v3h-1v13h-2V12h-1z"/><path d="M22 9h4v3h-1l3 10-2 1-3-11h-1z"/>',
  silk: '<path d="M7 22h26v5H7z"/><path d="M9 17h22v5H9z"/><path d="M11 12h18l3 5H11z"/>',
  wax: '<rect x="9" y="17" width="7" height="15" rx="1"/><rect x="18" y="21" width="6" height="11" rx="1"/><rect x="26" y="14" width="6" height="18" rx="1"/>',
  ember: '<path d="M20 5l9 12-9 17-9-17z" fill="#ff6a2a"/><path d="M20 5l4 12-4 17" fill="#ffb27a" stroke="none"/>',
}[k]}</g></svg>`;
const matSvg = (k) => painted(k) || matDrawn(k);

const pick = (list, n) => (list && list.length ? list[((n % list.length) + list.length) % list.length] : null);

export class TownUI {
  // o: { town, renderer, pack, input, hud, inventory, spellbar, act: { heal(n), hp(), sleep(onDone), give(item), xp(n), day(), hour(),
  //      opened(), closed(), player(), saved() } }
  constructor(o) {
    Object.assign(this, o);
    // The town's, then those posted out in the land (theirs is the town's thread too: people.js POSTED), then those out past it
    // with no body in the town's worker, then her.
    // (Phobos's street crowd after the posted: theirs is the town's thread too.)
    this.people = PEOPLE.concat(POSTED, CROWD, BEYOND, [LISANDRA]);
    this.lisI = this.people.length - 1;
    this.marks = new Map();         // person -> { el, kind }: the ! and ? over the heads of those with work
    this.balloons = new Map();
    this.with = -1; this.open = false; this.book = false;
    this.met = new Set();
    this.said = {};                 // `${person}:${topic}` -> how many of those they've said
    this.stock = {};                // trade -> { day, items }
    this.lamp = null;               // { left, spec }
    this.freeBed = false;
    this.given = new Set();         // who's fed you for nothing, once (lines: `gift`)
    this.papers = [];               // letters and pages kept: { title, text }
    // The quest log: its tab, the one picked in each, the parts of the world folded away, what's searched for.
    this.qTab = 'active'; this.qPick = { active: null, done: null, journal: null }; this.qShut = new Set(); this.qFind = '';
    this.quests = new QuestBook({
      change: () => { this.marksStale = true; this.town.setFlags(this.quests.flags); if (this.book) this.drawBook(); },
      toast: (t, kind) => this.note(t, kind),
      done: (id) => this.act.triumph?.(id),
      // (Silas hands over the Sexton's Door's key with this one: src/main.js locked.)
      begun: (id) => { if (id === 'dead_cant_wait') this.act.sound?.('keys'); },
      // Given up (from the log): what was handed over for it, back in the satchel; and the game kept.
      dropped: (id, back) => {
        if (back) this.pack.mats[back.mat] = (this.pack.mats[back.mat] || 0) + back.n;
        this.act.sound?.('bookClose');
        this.act.saved?.();
      },
    });
    const css = document.createElement('style');
    css.textContent = STYLE;
    document.head.appendChild(css);
    const div = (id) => { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); return d; };
    this.sayEl = div('folkSay');
    this.panel = div('folkTalk');
    this.bookEl = div('folkBook');
    this.notes = div('folkNotes');
    this.markEl = div('folkMarks');
    this.fade = div('folkFade');
    for (const el of [this.panel, this.bookEl]) {
      for (const t of ['touchstart', 'touchmove', 'touchend']) el.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    window.addEventListener('keydown', (e) => this.key(e));
    this.town.on((e) => this.event(e));
  }

  person(i) { return this.people[i]; }
  // Where someone stands: the town's worker's word, or (out past the town) the beat they keep.
  whereOf(i) {
    if (i < FOLK.length) return this.renderer.folk?.where(i);
    if (i === this.lisI) return this.lisandra();
    const at = BEYOND_AT[this.people[i]?.id];
    if (!at) return null;
    // Their body in the sim, walking its beat, if it's there (their own, by their place among the town's knights); else the
    // middle of the beat. Their head as posed, so a mark over it sways and turns with them.
    const k = this.snap && ((at.k >= 0 && this.bodyAt((this.renderer.firstTown ?? -1) + at.k, at.x, at.z, 15)) || this.bodyNear(at.x, at.z, 6));
    return k ? { x: k.x, y: k.y, z: k.z, hx: k.hx, hy: k.hy, hz: k.hz, busy: 0, sleep: false, house: -1, beyond: true }
      : { ...at, busy: 0, sleep: false, house: -1, beyond: true };
  }

  // Body i in the sim, if it's up and within r metres of (x, z): { x, y, z, hx, hy, hz }, or null.
  bodyAt(i, x, z, r) {
    const s = this.snap;
    if (!(i >= 0 && i < s[H.NCHARS])) return null;
    const o = CHARS_START + i * C_SIZE;
    if (s[o + C.ACTIVE] < 0.5 || Math.hypot(s[o + C.X] - x, s[o + C.Z] - z) > r) return null;
    const y = s[o + C.Y], hy = s[o + C.HEAD_Y];
    // (A head where a head can be, or else over where it stands.)
    return hy > y + 0.3 && hy < y + 3 ? { x: s[o + C.X], y, z: s[o + C.Z], hx: s[o + C.HEAD_X], hy, hz: s[o + C.HEAD_Z] }
      : { x: s[o + C.X], y, z: s[o + C.Z], hx: s[o + C.X], hy: y + 1.7, hz: s[o + C.Z] };
  }

  // The nearest body in the sim to (x, z), within r metres, as bodyAt has it; or null.
  bodyNear(x, z, r) {
    const s = this.snap, n = s[H.NCHARS];
    let best = null, bd = r;
    for (let i = 0; i < n; i++) {
      const o = CHARS_START + i * C_SIZE;
      if (s[o + C.ACTIVE] < 0.5) continue;
      const d = Math.hypot(s[o + C.X] - x, s[o + C.Z] - z);
      if (d < bd) { bd = d; best = i; }
    }
    return best === null ? null : this.bodyAt(best, x, z, r);
  }

  // Lisandra, once she's walked you down to the town (src/sim/opening.js keeps her where the road comes in): whichever of
  // her two forms is out, the last chars in the sim's list (as src/ui/heroes.js finds her).
  lisandra() {
    const s = this.snap;
    if (!s || s[H.OPENING] !== OPENING.ARRIVED) return null;
    const n = s[H.NCHARS];
    for (let i = n - 1; i >= n - LISANDRA_FORMS.length && i >= 0; i--) {
      const o = CHARS_START + i * C_SIZE;
      if (s[o + C.ACTIVE] < 0.5) continue;
      // (Her head as posed: src/sim/village-walker.js writes it where a prop would go, a little above it.)
      const y = s[o + C.Y], head = s[o + C_PROPS + 1] - 0.19, ok = head > y + 0.3 && head < y + 3;
      return { x: s[o + C.X], y, z: s[o + C.Z], hx: ok ? s[o + C_PROPS] : s[o + C.X], hy: ok ? head : y + 1.6, hz: ok ? s[o + C_PROPS + 2] : s[o + C.Z], busy: 0, sleep: false, house: -1, beyond: true };
    }
    return null;
  }
  lines(i) { return LINES[this.people[i].id] || {}; }
  fill(t) { return String(t).replaceAll('{name}', this.name || 'stranger'); }
  // The lines of a list that can be said now: before or after a quest, once you've met someone (src/folk/quests.js sayable).
  ok(list) { return sayable(list, this.quests.flags, this.met); }

  // Food for nothing, the first time someone who feeds people finds you with no coin. gift: { at: 'first' | 'bye', say, again,
  // note, heal }: said on meeting (or, met already, `again` on a later word) or as they see you off. Null if not now.
  gift(p, L, at) {
    const g = L.gift;
    if (!g || g.at !== at || this.given.has(p.id) || this.pack.purse() > 0) return null;
    const text = at === 'first' && this.met.has(p.id) ? g.again : g.say;
    if (!text) return null;
    this.given.add(p.id);
    this.act.heal(g.heal || 14);
    setTimeout(() => this.note(g.note, 'hint'), 600);
    return text;
  }

  // ---- what's said in the street ----

  event(e) {
    if (e.type !== 'say') return;
    if (this.open && e.i === this.with) return;
    // (Something that speaks and isn't anybody: `who` it is and `at` where. The axe on the smith's rack.)
    if (e.at) {
      const key = `at:${e.who}`;
      this.balloons.get(key)?.el.remove();
      const el = document.createElement('div');
      el.className = 'fb small';
      el.innerHTML = `<span class="who">${e.who}</span>`;
      el.appendChild(document.createTextNode(e.text));
      this.sayEl.appendChild(el);
      this.balloons.set(key, { el, at: e.at, until: performance.now() + e.dur * 1000 });
      return;
    }
    let b = this.balloons.get(e.i);
    if (!b) {
      const el = document.createElement('div');
      el.className = 'fb';
      this.sayEl.appendChild(el);
      b = { el };
      this.balloons.set(e.i, b);
    }
    const p = this.person(e.i);
    // (Lisandra's go into the chat log as well, as everything she says to you does.)
    if (e.i === this.lisI) this.act.log?.(p.name, e.text);
    b.el.className = `fb${e.kind === 'small' ? ' small' : ''}`;
    b.el.innerHTML = `<span class="who">${firstName(p)}</span>`;
    b.el.appendChild(document.createTextNode(e.text));
    b.until = performance.now() + e.dur * 1000;
  }

  houseOf(x, y, z) {
    const hs = this.town.houses;
    if (!hs || y > 9) return -1;
    return hs.findIndex((h) => h && x > h[0] && x < h[2] && z > h[1] && z < h[3]);
  }

  project(cam, x, y, z) {
    const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    const depth = dx * cam.fx + dy * cam.fy + dz * cam.fz;
    if (depth < 0.3) return null;
    const rx = cam.fy * cam.uz - cam.fz * cam.uy, ry = cam.fz * cam.ux - cam.fx * cam.uz, rz = cam.fx * cam.uy - cam.fy * cam.ux;
    const f = innerHeight / (2 * Math.tan(FOV * Math.PI / 360));
    return [innerWidth / 2 + (dx * rx + dy * ry + dz * rz) / depth * f, innerHeight / 2 - (dx * cam.ux + dy * cam.uy + dz * cam.uz) / depth * f, depth];
  }

  // Every frame: the balloons follow their speakers; the light you carry burns down.
  frame(dt, cam, px, py, pz, yaw, paused, snap = null) {
    this.snap = snap;
    // The quest log open: drawn again if auto-play has moved on to something else.
    // (The dead up on the road down, and put down again: the opening's work changes, and the hint in the log with it.)
    const roadFight = !!snap && snap[H.OPENING] === OPENING.ESCORT && snap[H.OPENING_FIGHT] > 0;
    if (snap && roadFight !== !!this.roadFight) { this.roadFight = roadFight; if (this.book) this.drawBook(); }
    if (this.book && (this.bookT = (this.bookT || 0) - dt) <= 0) { this.bookT = 0.5; if (autoKey(this.autoNow()) !== this.autoSeen) this.drawBook(); }
    const now = performance.now();
    const ph = this.houseOf(px, py, pz);
    this.drawMarks(cam, px, pz, ph);
    for (const [i, b] of this.balloons) {
      // (Whoever it is: the townsfolk, those out past the town, and Lisandra.)
      const w = b.at ? { x: b.at[0], z: b.at[2], hx: b.at[0], hy: b.at[1] - 0.36, hz: b.at[2], house: -1 } : this.whereOf(i);
      if (!w || now > b.until) { b.el.remove(); this.balloons.delete(i); continue; }
      const d = Math.hypot(w.x - px, w.z - pz);
      const there = d < 4 || w.house === ph || (w.house < 0 && ph < 0);
      const s = there && d < SEEN ? this.project(cam, w.hx, w.hy + 0.36, w.hz) : null;
      if (!s || s[0] < -80 || s[0] > innerWidth + 80) { b.el.style.visibility = 'hidden'; continue; }
      b.el.style.visibility = 'visible';
      b.el.style.left = `${s[0].toFixed(0)}px`;
      b.el.style.top = `${Math.max(46, s[1]).toFixed(0)}px`;
      b.el.style.opacity = (Math.min(1, (SEEN - d) / 6) * (now > b.until - 300 ? 0.2 : 1)).toFixed(2);
    }
    // A light carried: a little ahead and above, and it gutters.
    const r = this.renderer;
    if (this.lamp && !paused) {
      this.lamp.left -= dt;
      if (this.lamp.left <= 0) { this.lamp = null; this.note('Your light has burnt out.', 'hint'); }
    }
    if (this.lamp) {
      const L = this.lamp.spec, t = now / 1000, fl = 1 + 0.12 * Math.sin(t * 11.3) + 0.07 * Math.sin(t * 23.1) - (this.lamp.left < 20 ? 0.35 * (1 - this.lamp.left / 20) : 0);
      r.carryLight = { p: [px + Math.sin(yaw) * 0.35 + Math.cos(yaw) * 0.25, py + 1.45, pz + Math.cos(yaw) * 0.35 - Math.sin(yaw) * 0.25], r: L.r, c: L.c, i: L.i * fl };
    } else r.carryLight = null;
    // What you can step up and talk to.
    if (!paused && (this.qT = (this.qT || 0) - dt) <= 0) { this.qT = 0.5; this.quests.lisHere = !!this.lisandra(); this.quests.where(px, py, pz, this.act.hour()); }
  }

  // The marks over the heads of those with work (src/folk/quests.js QuestBook.mark): a yellow ! for work to give, a grey ?
  // for work of theirs under way, a yellow ? for work to hand in. Seen as the balloons are: not through a house's walls.
  drawMarks(cam, px, pz, ph) {
    // Which mark each one has: worked out again whenever a quest moves, and four times a second for what the pack and the day
    // change. (Asking every frame went through every quest for every one of them.)
    const now = performance.now(), kinds = this.markKinds || (this.markKinds = new Array(this.people.length).fill(null));
    if (this.marksStale !== false || now - (this.markKindsAt ?? -1e9) >= 250) {
      this.marksStale = false; this.markKindsAt = now;
      const day = this.act.day();
      for (let i = 0; i < this.people.length; i++) kinds[i] = this.quests.mark(this.people[i].id, this.pack.mats, day);
    }
    const seen = new Set();
    for (let i = 0; i < this.people.length; i++) {
      const kind = kinds[i];
      if (!kind) continue;
      const w = this.whereOf(i);
      if (!w || w.hy == null) continue;
      const d = Math.hypot(w.x - px, w.z - pz);
      const there = w.beyond || d < 4 || w.house === ph || (w.house < 0 && ph < 0);
      const s = there && d < (w.beyond ? MARK_SEEN * 3 : MARK_SEEN) ? this.project(cam, w.hx, w.hy + 0.42, w.hz) : null;
      if (!s || s[0] < -60 || s[0] > innerWidth + 60 || s[1] < -60) continue;
      let m = this.marks.get(i);
      if (!m) { m = { el: document.createElement('div') }; m.el.innerHTML = '<span></span>'; this.markEl.appendChild(m.el); this.marks.set(i, m); }
      if (m.kind !== kind) {
        m.kind = kind;
        m.el.className = `qm${kind === 'busy' ? ' busy' : ''}`;
        // (A painted mark from the art kit, where there is one: src/ui/skin.js.)
        const pic = art('icons', kind === 'offer' ? 'quest_offer' : kind === 'busy' ? 'quest_busy' : 'quest_ready');
        if (pic) m.el.firstChild.innerHTML = `<img src="${pic}" alt="" style="display:block;width:1em;height:1em">`;
        else m.el.firstChild.textContent = kind === 'offer' ? '!' : '?';
      }
      // About two thirds of a metre tall in the world, but never too small to see nor so big it hides them.
      const tall = 0.65 * innerHeight / (2 * Math.tan(FOV * Math.PI / 360)) / s[2];
      m.el.style.setProperty('--s', `${Math.max(26, Math.min(72, tall)).toFixed(0)}px`);
      m.el.style.left = `${s[0].toFixed(0)}px`;
      m.el.style.top = `${s[1].toFixed(0)}px`;
      seen.add(i);
    }
    for (const [i, m] of this.marks) if (!seen.has(i)) { m.el.remove(); this.marks.delete(i); }
  }

  // Who's in front of you and near enough to talk to: { i, label }, or null.
  nearest(px, py, pz, yaw) {
    const folk = this.renderer.folk;
    if (!folk?.slot) return null;
    let best = null, bs = Infinity;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    for (let i = 0; i < this.people.length; i++) {
      const w = this.whereOf(i);
      if (!w || (!w.beyond && Math.abs(w.y - py) > 1.3)) continue;
      const dx = w.x - px, dz = w.z - pz, d = Math.hypot(dx, dz);
      const keeper = w.busy === ACT.SHOP;
      // (Out past the town they walk a short beat, so the reach is the beat's.)
      if (d > (w.beyond ? 4.2 : keeper ? STALL_REACH : REACH)) continue;
      const ahead = d < 0.01 ? 1 : (dx * fx + dz * fz) / d;
      if (ahead < (keeper && d > REACH ? 0.8 : 0.45) && d > 1.1) continue;
      const score = (keeper ? d * REACH / STALL_REACH : d) * (1.6 - ahead);
      if (score < bs) { bs = score; best = { i, w }; }
    }
    if (!best) return null;
    const p = this.person(best.i);
    const busy = best.w.busy === ACT.FLEE || best.w.busy === ACT.HIDE;
    return { i: best.i, label: busy ? `${p.name} has no time for you` : best.w.sleep ? `Wake ${p.name}` : `Talk to ${p.name}${p.title ? `, ${p.title}` : ''}`, busy };
  }

  // ---- a word with someone ----

  talk(i) {
    const w = this.whereOf(i);
    if (!w) return;
    this.with = i; this.open = true;
    if (!w.beyond) this.town.talkTo(i);
    this.balloons.get(i)?.el.remove(); this.balloons.delete(i);
    this.act.opened();
    document.body.classList.add('folk-talking');
    const p = this.person(i), L = this.lines(i);
    this.mode = 'talk';
    this.panel.style.display = 'flex';
    let line;
    if (w.sleep) line = pick(this.ok(L.barks?.woken), this.count(p.id, 'woken'));
    else if ((line = this.gift(p, L, 'first'))) this.met.add(p.id);
    else if (!this.met.has(p.id) && L.first) {
      // A first meeting: the last of their first lines that fits, so the later ones, which know who you've met already, win.
      const f = this.ok(L.first);
      line = f[f.length - 1];
      this.met.add(p.id);
    } else {
      // Now and then, after a quest of theirs: how it's turned out.
      const after = Object.keys(QUESTS).find((id) => QUESTS[id].giver === p.id && this.quests.done(id) && QUESTS[id].after?.length);
      line = after && (!this.said[`${p.id}:after:${after}`] || Math.random() < 0.35) ? pick(this.ok(QUESTS[after].after), this.count(p.id, `after:${after}`)) : pick(this.ok(L.greet?.[partOfDay(this.act.hour())]), this.count(p.id, 'greet'));
    }
    this.met.add(p.id);
    this.show(line || '...', null, this.root());
  }

  count(id, topic) { const k = `${id}:${topic}`; const n = this.said[k] || 0; this.said[k] = n + 1; return n; }

  // The panel: whose it is, what was just said (and by whom, if not them), anything handed over to read, and what you can say.
  show(line, speaker, opts, paper = null) {
    const p = this.person(this.with);
    if (line !== this.view?.line || speaker !== this.view?.speaker) this.speak(line, speaker || p.id);
    this.view = { line, speaker, opts, paper };
    const sp = speaker && speaker !== p.id ? `<span class="sp">${firstName(this.people.find((q) => q.id === speaker) || { name: speaker, id: speaker })}:</span>` : '';
    this.panel.innerHTML = `<div class="tk-head"><span class="tk-name">${p.name}</span><span class="tk-title">${p.title || (p.age < 15 ? 'a child of the town' : '')}</span><span class="tk-purse">${this.pack.purse() ? priceText(this.pack.purse()) : 'No coin'}</span>${CLOSE_X}</div>
      <div class="tk-line">${sp}${esc(this.fill(line))}</div>${paper ? `<div class="tk-paper">${esc(paper)}</div>` : ''}<div class="tk-shop"></div><ol></ol>`;
    if (this.mode === 'shop') this.drawShop();
    // The × in the corner: the talk's over at once, as Esc ends it.
    this.panel.querySelector('.menu-x').onclick = () => this.close(false);
    const ol = this.panel.querySelector('ol');
    opts.forEach((o, k) => {
      const li = document.createElement('li');
      li.className = o.cls || '';
      li.innerHTML = `<kbd>${k < 9 ? k + 1 : 0}</kbd><span>${esc(o.label)}</span>`;
      li.onclick = () => this.choose(k);
      ol.appendChild(li);
    });
  }

  choose(k) {
    const o = this.view?.opts[k];
    if (!o || o.cls === 'dim') return;
    this.act.click?.();
    o.run();
  }

  // What you can say to them, at the top of a conversation.
  root() {
    const p = this.person(this.with), id = p.id, L = this.lines(this.with), Q = this.quests, out = [];
    for (const qid of Object.keys(RULES)) {
      const s = Q.state(qid), st = Q.step(qid), text = QUESTS[qid];
      if (!s || s.stage === 'done') continue;
      if (st?.talk === id) out.push({ label: st.say, cls: 'q', run: () => this.stepTalk(qid, 0) });
      if (text.giver !== id) continue;
      if (s.stage === 'making') out.push({ label: `${text.title}: is it ready?`, cls: 'q', run: () => this.collect(qid) });
      else if (st?.bring) {
        const have = this.pack.mats[st.bring] || 0;
        out.push(have >= st.n ? { label: `Here: ${st.n} ${matName(st.bring, st.n)}.`, cls: 'q', run: () => this.handIn(qid) }
          : { label: `${text.title} (${Math.min(have, st.n)} of ${st.n} ${matName(st.bring, st.n)})`, cls: 'q', run: () => this.progress(qid) });
      } else if (st?.back) out.push({ label: st.say || `${text.title}: it's done.`, cls: 'q', run: () => this.handIn(qid) });
      else out.push({ label: text.title, cls: 'q', run: () => this.progress(qid) });
    }
    for (const qid of Q.offers(id)) out.push({ label: QUESTS[qid].title, cls: 'offer', run: () => this.offer(qid, 0) });
    // What they've to say about someone else's quest under way.
    for (const qid of Object.keys(RULES)) {
      const said = this.ok(QUESTS[qid].others?.[id]);
      if (!said.length || !Q.state(qid) || Q.done(qid) || QUESTS[qid].giver === id || RULES[qid].steps.some((s) => s.talk === id)) continue;
      out.push({ label: `${QUESTS[qid].title}?`, cls: 'gossip', run: () => this.show(pick(said, this.count(id, `q:${qid}`)), id, this.root()) });
    }
    out.push({ label: 'Ask about...', run: () => this.asks() });
    const about = this.ok(L.about);
    if (about.length) out.push({ label: 'Who are you?', run: () => this.show(pick(about, this.count(id, 'about')), id, this.root()) });
    if (p.trade && TRADES[p.trade]) out.push({ label: TRADES[p.trade].label, run: () => this.shop() });
    if (id === PACK_MAKER && this.pack.extra < MAX_EXTRA) out.push({ label: LET_OUT, run: () => this.letOut() });
    if (id === LISANDRA.id && this.act.spentPoints?.() > 0) out.push({ label: `${UNBIND} (${unbindFee(this.pack.level)} gold)`, run: () => this.unbind() });
    out.push({ label: 'Farewell.', run: () => this.close(true) });
    return out;
  }

  // ---- Wes Harrow's leather: room in the pack ----

  letOut() {
    const p = this.person(this.with), L = this.lines(this.with);
    const line = pick(this.ok(L.pack?.offer), this.count(p.id, 'pack')) || 'I can sew a pocket on. Costs.';
    this.show(line.replace('{price}', slotPrice(this.pack.extra)), p.id, this.letOutOpts());
  }

  letOutOpts() {
    const n = this.pack.extra, left = MAX_EXTRA - n, purse = this.pack.purse();
    const five = Array.from({ length: Math.min(5, left) }, (_, k) => slotPrice(n + k)).reduce((a, b) => a + b, 0);
    const out = [];
    if (left > 0) out.push({ label: `${ONE_MORE} · ${slotPrice(n)} gold`, cls: purse >= slotPrice(n) * 10 ? '' : 'dim', run: () => this.buyRoom(1) });
    if (left >= 5) out.push({ label: `Five more · ${five} gold`, cls: purse >= five * 10 ? '' : 'dim', run: () => this.buyRoom(5) });
    out.push({ label: 'Back.', run: () => this.show(this.view.line, this.view.speaker, this.root()) });
    out.push({ label: 'Farewell.', run: () => this.close(true) });
    return out;
  }

  // k more cells, each at its own price, as far as the purse goes. How many were bought.
  buyRoom(k) {
    const p = this.person(this.with), L = this.lines(this.with);
    let bought = 0;
    while (bought < k && this.pack.extra < MAX_EXTRA && this.pack.pay(slotPrice(this.pack.extra) * 10)) { this.pack.extra++; bought++; }
    if (!bought) { this.show(pick(this.ok(L.pack?.poor), this.count(p.id, 'packPoor')) || "That's short.", p.id, this.letOutOpts()); return 0; }
    this.inventory.render();
    this.act.sound?.('takeRobe');
    this.note(`Your pack is let out: room for ${this.pack.cells} now${this.pack.extra < MAX_EXTRA ? '' : ', and that is as far as it goes'}.`, 'quest');
    this.act.saved();
    const done = this.pack.extra >= MAX_EXTRA ? pick(this.ok(L.pack?.full), 0) : pick(this.ok(L.pack?.done), this.count(p.id, 'packDone'));
    this.show(done || 'Done.', p.id, this.pack.extra >= MAX_EXTRA ? this.root() : this.letOutOpts());
    return bought;
  }

  // ---- Lisandra's unbinding: every point back ----

  unbind() {
    const p = this.person(this.with), L = this.lines(this.with), fee = unbindFee(this.pack.level);
    const line = pick(this.ok(L.unbind?.ask), this.count(p.id, 'unbind')) || 'I can. Are you sure?';
    this.show(line.replace('{fee}', fee), p.id, [
      { label: `Yes. Undo it all. (${fee} gold)`, cls: this.pack.purse() >= fee * 10 ? '' : 'dim', run: () => this.unbound(fee) },
      { label: 'No. Leave it as it is.', run: () => this.show(pick(this.ok(L.unbind?.no), 0) || 'As you like.', p.id, this.root()) },
    ]);
  }

  unbound(fee) {
    const p = this.person(this.with), L = this.lines(this.with);
    if (!this.pack.pay(fee * 10)) { this.show(pick(this.ok(L.unbind?.poor), 0) || "You haven't the coin.", p.id, this.root()); return; }
    this.act.respec?.();
    this.act.sound?.('scroll');
    this.note(`Every point is yours to spend again: your spellbook${this.input?.touch ? '' : ', B'}.`, 'quest');
    this.act.saved();
    this.show(pick(this.ok(L.unbind?.done), this.count(p.id, 'unbound')) || 'Done.', p.id, this.root());
  }

  asks() { this.show(this.view.line, this.view.speaker, this.askOpts()); }

  // What you can ask them about. told: they've just told you of the other Tessariels, and the beautiful woman who sent each.
  askOpts(told = false) {
    const p = this.person(this.with), L = this.lines(this.with), out = [];
    const ask = L.ask || {};
    // Said back, once, to the few who'd hear it (lines: `old`, said a line at a time).
    if (told && L.old?.length && !this.said[`${p.id}:old`]) {
      const back = (k) => this.show(L.old[k], p.id, k < L.old.length - 1 ? [{ label: '...', run: () => back(k + 1) }] : this.askOpts());
      out.push({ label: OLD, cls: 'q', run: () => { this.said[`${p.id}:old`] = 1; back(0); } });
    }
    for (const [k, label] of Object.entries({ ...TOPICS, ...(L.topics || {}) })) {
      const said = this.ok(ask[k]);
      if (!said.length) continue;
      out.push({ label, run: () => this.show(pick(said, this.count(p.id, `ask:${k}`)), p.id, this.askOpts(k === 'tessariels')) });
    }
    out.push({ label: 'Something else.', run: () => this.show(this.view.line, this.view.speaker, this.root()) });
    return out;
  }

  // ---- quests ----

  // A quest's offer, one line at a time, then yes or no.
  offer(qid, k) {
    const q = QUESTS[qid], lines = this.ok(q.offer), line = lines[k];
    const [who, text] = Array.isArray(line) ? line : [q.giver, line];
    if (k < lines.length - 1) { this.show(text, who, [{ label: 'Go on.', run: () => this.offer(qid, k + 1) }]); return; }
    this.show(text, who, [
      { label: q.accept, cls: 'q', run: () => this.accept(qid) },
      { label: q.decline, run: () => this.show(q.declineLine, q.giver, this.root()) },
    ]);
  }

  accept(qid) {
    const q = QUESTS[qid];
    this.quests.begin(qid);
    if (qid === 'bed_and_bell') this.freeBed = true;
    this.show(q.acceptLine, q.giver, this.root());
  }

  // A line or a run of them about a step that's someone else's to hear (Silas for Bram; Elowen for Cedric).
  stepTalk(qid, k) {
    const id = this.person(this.with).id, said = QUESTS[qid].others?.[id] || ['...'];
    const last = k >= said.length - 1;
    let paper = null;
    if (qid === 'letter' && k === 1) { paper = QUESTS.letter.letters.cedric; this.keep("Cedric Ashby's letter", paper); }
    if (qid === 'letter' && last) { paper = QUESTS.letter.letters.elowen; this.keep("Elowen Halloway's answer", paper); }
    // (Said to the one a word was carried to: on to the next step; or, where the errand ends with them, done and paid here.)
    if (last) { if (this.quests.step(qid)?.end) this.reward(qid); else this.quests.advance(qid); }
    this.show(said[k], id, last ? this.root() : [{ label: 'Go on.', run: () => this.stepTalk(qid, k + 1) }], paper);
  }

  progress(qid) { const q = QUESTS[qid]; this.show(pick(this.ok(q.progress), this.count(q.giver, `p:${qid}`)), q.giver, this.root()); }

  handIn(qid) {
    const st = this.quests.step(qid), q = QUESTS[qid];
    if (st?.bring && !this.pack.takeMat(st.bring, st.n)) return;
    if (st?.bring) this.note(`Handed over: ${st.n} ${matName(st.bring, st.n)}`, 'mat');
    const how = this.quests.handIn(qid, this.act.day());
    if (how === 'making') { this.show(q.done[0], q.giver, this.root()); this.act.saved(); return; }
    this.reward(qid);
    this.doneLines(qid, 0);
  }

  // Made overnight: ready the day after it was handed in.
  collect(qid) {
    const s = this.quests.state(qid), q = QUESTS[qid];
    if (this.act.day() < s.ready) { this.show(pick(this.ok(q.waiting), this.count(q.giver, `w:${qid}`)) || 'Not yet.', q.giver, this.root()); return; }
    this.quests.finish(qid);
    this.reward(qid);
    this.doneLines(qid, 1);
  }

  // The bell's errand handed in at the bed: its done lines, then to sleep.
  bedTold(k) {
    const q = QUESTS.bed_and_bell;
    if (k === 0) { this.quests.handIn('bed_and_bell', this.act.day()); this.reward('bed_and_bell'); }
    const line = q.done[k], [who, text] = Array.isArray(line) ? line : [q.giver, line];
    const last = k >= q.done.length - 1;
    this.show(text, who, [{ label: last ? 'To bed.' : 'Go on.', run: () => { if (last) { this.close(false); this.sleep(); } else this.bedTold(k + 1); } }]);
  }

  doneLines(qid, k) {
    const q = QUESTS[qid], line = q.done[k];
    const [who, text] = Array.isArray(line) ? line : [q.giver, line];
    const paper = q.page && k === q.done.length - 1 ? q.page : null;
    if (paper) this.keep(qid === 'toll_of_bell' ? "From the cathedral's register" : `${q.title}: Orrin's page`, paper);
    if (k < q.done.length - 1) this.show(text, who, [{ label: 'Go on.', run: () => this.doneLines(qid, k + 1) }], paper);
    else this.show(text, who, this.root(), paper);
  }

  reward(qid) {
    const R = RULES[qid];
    if (this.quests.state(qid)?.stage !== 'done') this.quests.finish(qid);
    if (R.gold) { this.pack.gold += R.gold; this.note(`${R.gold} gold`, 'mat'); }
    if (R.xp) this.act.xp(R.xp);
    const rng = makeRng(R.named ? R.seed >>> 0 : (Math.random() * 2 ** 32) >>> 0);
    let item = null;
    if (R.item === 'skull') item = R.rarity === undefined ? CRAFTS.skull.make(rng, 2) : rollSkull(rng, { rarity: R.rarity });
    else if (R.item === 'staff') item = CRAFTS.staff.make(rng, 2);
    else if (R.item === 'robe') item = CRAFTS.robe.make(rng, 2);
    else if (R.charm) { if (this.act.charm?.(R.charm)) this.note(`Received: ${R.charmName || 'a charm'}. (I: your pack.)`, 'quest'); }
    else if (R.item === 'scroll') {
      // (A scroll you can read and haven't: of the trees' second and third tiers, at your level. Its first rank costs no point.)
      const barred = this.spellbar.noScroll?.() ?? this.spellbar.known, left = SPELLS.map((_, i) => i).filter((i) => !barred.has(i));
      if (left.length) { const sp = left[Math.floor(rng() * left.length)]; this.spellbar.learn(sp); this.note(`You learn ${SPELLS[sp].name}. B: your spellbook.`, 'quest'); } else { this.pack.gold += 120; this.note('120 gold', 'mat'); }
    }
    if (item && R.named) item.named = R.named;
    if (item) { this.act.give(item); this.note(`Received: ${nameOf(item)}`, 'quest'); }
    this.act.saved();
  }

  keep(title, text) {
    const at = this.papers.findIndex((p) => p.title === title || (title.startsWith('Cedric') && p.title.startsWith('Cedric')));
    if (at >= 0) this.papers.splice(at, 1);
    if (text) this.papers.push({ title, text });
  }

  // ---- the counter ----

  // Open while their day has them at their trade (src/folk/days.js), awake and not running from something.
  isOpen(i) {
    const p = this.person(i), w = this.renderer.folk.where(i), t = TRADES[p.trade], h = this.act.hour();
    if (!w || w.sleep || w.busy === ACT.FLEE || w.busy === ACT.HIDE) return false;
    if (t.hours && (h < t.hours[0] || h >= t.hours[1])) return false;
    if (w.busy === ACT.WORK || w.busy === ACT.SHOP) return true;
    let now = null;
    for (const [at, what] of DAYS[p.job] || []) if (h >= at) now = what;
    return now === 'work' || now === 'stall' || now === 'shop';
  }

  shop() {
    const i = this.with, p = this.person(i), L = this.lines(i);
    if (!this.isOpen(i)) { this.show(pick(this.ok(L.shop?.closed), this.count(p.id, 'closed')) || 'Not now.', p.id, this.root()); return; }
    this.mode = 'shop';
    this.tab = 'buy'; this.embers = 0;
    this.show(pick(this.ok(L.shop?.open), this.count(p.id, 'open')), p.id, this.shopOpts());
  }

  shopOpts() {
    return [{ label: 'Back.', run: () => { this.mode = 'talk'; this.show(this.view.line, this.view.speaker, this.root()); } }, { label: 'Farewell.', run: () => this.close(true) }];
  }

  stockOf(trade) {
    const day = this.act.day();
    if (!TRADES[trade].stock) return [];
    if (this.stock[trade]?.day !== day) this.stock[trade] = { day, items: rollStock(trade, day, this.spellbar.noScroll?.() ?? this.spellbar.known) };
    return this.stock[trade].items;
  }

  drawShop() {
    const box = this.panel.querySelector('.tk-shop');
    const p = this.person(this.with), t = TRADES[p.trade];
    const canMake = t.crafts && (!t.unlock || this.quests.done(t.unlock));
    const tabs = [['buy', 'Buy'], ...(t.buys || t.buysMats ? [['sell', 'Sell']] : []), ...(canMake ? [['make', t.unlock ? 'Made to order' : 'Make']] : [])];
    box.innerHTML = `<div class="tk-tabs">${tabs.map(([k, n]) => `<button data-t="${k}" class="${this.tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="tk-ember"></div><div class="tk-wares"></div><div class="tk-satchel"></div>`;
    for (const b of box.querySelectorAll('[data-t]')) b.onclick = () => { this.tab = b.dataset.t; this.drawShop(); };
    const wares = box.querySelector('.tk-wares');
    const add = (pic, name, color, price, ok, run, tip) => {
      const d = document.createElement('div');
      d.className = `tk-ware${ok ? '' : ' no'}`;
      d.innerHTML = `<div class="pic">${pic}</div><div><div class="nm" style="color:${color}">${esc(name)}</div><div class="pr${ok ? '' : ' need'}">${esc(price)}</div></div>`;
      d.onclick = run;
      if (tip) { d.onpointermove = (e) => this.inventory.showTip(tip, e); d.onpointerleave = () => this.inventory.showTip(null); }
      wares.appendChild(d);
    };
    const purse = this.pack.purse();
    if (this.tab === 'buy') {
      for (const g of t.goods || []) { const G = GOODS[g]; add(goodPic(g), G.name, '#e9dfc9', `${priceText(G.price)}  ·  ${G.note}`, purse >= G.price, () => this.buyGood(g)); }
      this.stockOf(p.trade).forEach((it, k) => {
        const price = (it.type === 'spell' ? 120 : worth(it)) * 10;
        add(it.type === 'spell' ? GLYPH.candle.replace('#ffb347', '#b78cf0') : this.inventory.iconOf(it), nameOf(it), colorOf(it), priceText(price), purse >= price, () => this.buyItem(k, price), it.type === 'spell' ? null : it);
      });
      if (!wares.children.length) wares.innerHTML = '<div class="qd">Sold out till tomorrow.</div>';
    } else if (this.tab === 'sell') {
      for (const e of this.pack.entries) {
        const c = offerFor(p.trade, e.item);
        if (c) add(this.inventory.iconOf(e.item), nameOf(e.item), colorOf(e.item), `They'll give ${priceText(c)}`, true, () => this.sell(e, c), e.item);
      }
      // (What your party carry in their own bags, sold through you: src/ui/party.js bagged.)
      for (const b of this.party?.()?.bagged?.() || []) {
        const c = offerFor(p.trade, b.item);
        if (c) add(this.inventory.iconOf(b.item), nameOf(b.item), colorOf(b.item), `From ${b.entry.name}'s bag: they'll give ${priceText(c)}`, true, () => this.sellBag(b, c), b.item);
      }
      for (const [k, c] of Object.entries(t.buysMats || {})) {
        const n = this.pack.mats[k] || 0;
        if (n) add(matSvg(k), `${n} ${matName(k, n)}`, MATS[k].color, `${priceText(c)} each: all for ${priceText(c * n)}`, true, () => this.sellMat(k, c));
      }
      if (!wares.children.length) wares.innerHTML = '<div class="qd">Nothing you carry is any use to them. (What you have on is not for sale.)</div>';
    } else {
      const em = box.querySelector('.tk-ember'), have = this.pack.mats.ember || 0;
      this.embers = Math.min(this.embers, have, MAX_EMBERS);
      if (t.crafts.some((c) => CRAFTS[c].make)) {
        em.innerHTML = `Soul Embers worked in: <button data-e="-1">-</button> <b>${this.embers}</b> <button data-e="1">+</button> <span style="opacity:.7">(you have ${have}; each makes it a grade finer)</span>`;
        for (const b of em.querySelectorAll('[data-e]')) b.onclick = () => { this.embers = Math.max(0, Math.min(have, MAX_EMBERS, this.embers + +b.dataset.e)); this.drawShop(); };
      }
      for (const c of t.crafts) {
        const C = CRAFTS[c], ok = Object.entries(C.mats).every(([k, n]) => this.pack.has(k, n)) && this.pack.gold >= C.gold;
        const tier = 1 + (C.make ? this.embers : 0);
        add(C.make ? matSvg(Object.keys(C.mats)[0]) : goodPic(c), C.name, C.make ? ['#a8a8a8', '#3fd14a', '#3f8cff', '#b04df0', '#ff8a1e'][tier] : '#e9dfc9', `${matsText(C.mats)}${C.gold ? `, ${C.gold} gold` : ''}${C.make ? `  ·  at least ${['common', 'uncommon', 'rare', 'epic', 'legendary'][tier]}` : `  ·  ${C.note}`}`, ok, () => this.make(c));
      }
    }
    const sat = Object.entries(this.pack.mats).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${matName(k, n)}`).join(', ');
    box.querySelector('.tk-satchel').textContent = sat ? `In your satchel: ${sat}.` : 'Your satchel is empty. What the dead leave, you can bring up to be made into things.';
  }

  say(kind) { const p = this.person(this.with), L = this.lines(this.with); return pick(this.ok(L.shop?.[kind]), this.count(p.id, kind)); }
  short() { this.show(this.say('poor') || 'That\'s short.', this.person(this.with).id, this.shopOpts()); }

  buyGood(g) {
    const G = GOODS[g], p = this.person(this.with);
    if (G.effect.sleep) {
      const h = this.act.hour();
      if (h >= 6 && h < 17) { this.show("A bed's for the night. Come back after supper. I'll be here. I'm always here.", p.id, this.shopOpts()); return; }
      if (!this.freeBed && !this.pack.pay(G.price)) { this.short(); return; }
      if (this.freeBed) this.freeBed = false;
      // Back from Silas's and taking the bed you're owed: that's the errand done, and said over the key.
      if (this.quests.step('bed_and_bell')?.back) { this.bedTold(0); return; }
      this.close(false);
      this.sleep();
      return;
    }
    if (G.effect.heal >= 9999 && this.act.hp() > 0.995) { this.show("There's nothing to mend. Come back when there is. You will.", p.id, this.shopOpts()); return; }
    if (!this.pack.pay(G.price)) { this.short(); return; }
    if (G.effect.heal) this.act.heal(G.effect.heal);
    if (G.effect.light) this.light(G.effect.light);
    this.show(this.say('buy'), p.id, this.shopOpts());
  }

  buyItem(k, price) {
    const items = this.stockOf(this.person(this.with).trade), it = items[k], p = this.person(this.with);
    if (!it) return;
    if (this.pack.purse() < price) { this.short(); return; }
    if (it.type === 'spell') {
      if (!this.spellbar.learn(it.spell)) { this.show(this.spellbar.known.has(it.spell) ? 'You know that one already.' : "That one's beyond you yet. Come back with more behind you.", p.id, this.shopOpts()); return; }
      this.pack.pay(price); items.splice(k, 1);
      this.note(`You learn ${SPELLS[it.spell].name}. B: your spellbook.`, 'quest');
    } else {
      if (!this.pack.add(it)) { this.show("Your pack's full. Make room, then we'll talk.", p.id, this.shopOpts()); return; }
      this.pack.pay(price); items.splice(k, 1);
    }
    this.inventory.showTip(null);
    this.act.saved();
    this.show(this.say('buy'), p.id, this.shopOpts());
  }

  sell(entry, copper) {
    this.pack.remove(entry);
    this.pack.earn(copper);
    this.inventory.showTip(null);
    this.act.saved();
    this.show(this.say('sell'), this.person(this.with).id, this.shopOpts());
  }

  // A piece out of one of your party's bags (b: { entry, item }, src/ui/party.js bagged).
  sellBag(b, copper) {
    if (!this.party?.()?.unbag(b.entry, b.item)) return;
    this.pack.earn(copper);
    this.inventory.showTip(null);
    this.act.saved();
    this.show(this.say('sell'), this.person(this.with).id, this.shopOpts());
  }

  sellMat(k, each) {
    const n = this.pack.mats[k] || 0;
    if (!n) return;
    // (Not what a quest is waiting on, without asking twice.)
    if (!this.sure && Object.keys(RULES).some((id) => this.quests.step(id)?.bring === k)) {
      this.sure = true;
      this.show("Those are the ones somebody's waiting on. Sell them, and you'll only be fetching more. Still selling? Ask again.", this.person(this.with).id, this.shopOpts());
      return;
    }
    this.sure = false;
    this.pack.mats[k] = 0;
    this.pack.earn(n * each);
    this.act.saved();
    // (Thanks for what was sold: a satchel of bits is not a skull. shop.sell_bone and so on, or the plain thanks.)
    this.show(this.say(`sell_${k}`) || this.say('sell'), this.person(this.with).id, this.shopOpts());
  }

  make(c) {
    const C = CRAFTS[c], p = this.person(this.with);
    if (!Object.entries(C.mats).every(([k, n]) => this.pack.has(k, n))) { this.show(`It takes ${matsText(C.mats)}. Bring them up and I'll make it.`, p.id, this.shopOpts()); return; }
    if (this.pack.gold < C.gold) { this.short(); return; }
    if (C.use) {
      for (const [k, n] of Object.entries(C.mats)) this.pack.takeMat(k, n);
      this.light(C.use.light);
      this.show(this.say('buy'), p.id, this.shopOpts());
      return;
    }
    const rng = makeRng((Math.random() * 2 ** 32) >>> 0);
    const item = C.make(rng, 1 + this.embers);
    for (const [k, n] of Object.entries(C.mats)) this.pack.takeMat(k, n);
    this.pack.takeMat('ember', this.embers);
    this.pack.gold -= C.gold;
    this.embers = 0;
    this.act.give(item);
    this.note(`Made for you: ${nameOf(item)}`, 'quest');
    this.act.saved();
    this.show(this.say('buy'), p.id, this.shopOpts());
  }

  light(spec) {
    // (Time adds up; the brighter light is the one carried.)
    const left = (this.lamp?.left || 0) + spec.secs;
    this.lamp = { left, spec: this.lamp && this.lamp.spec.r >= spec.r ? this.lamp.spec : spec };
    this.note(`A light to carry: ${Math.round(this.lamp.left / 60)} minutes of it.`, 'hint');
  }

  // A night at the Bell: the dark comes down, the bell goes three, and it's dawn.
  sleep() {
    this.fade.textContent = '';
    // (Not there at all but while it's used: a black screen at nothing, over the world, was a screen-sized picture kept for good.)
    this.fade.style.visibility = 'visible';
    this.fade.style.opacity = 1;
    setTimeout(() => {
      // (The cathedral's bell, out along the east road, till its warden's put down: src/folk/lines/quests.js toll_of_bell.)
      this.fade.textContent = this.quests.done('toll_of_bell') ? 'Midnight comes. The bell keeps its peace.' : 'Out along the east road, the bell goes three.';
      this.act.sleep();
    }, 1200);
    setTimeout(() => { this.fade.textContent = ''; this.fade.style.opacity = 0; this.note('You wake at dawn, mended.', 'hint'); }, 3600);
    setTimeout(() => { if (this.fade.style.opacity === '0') this.fade.style.visibility = ''; }, 3600 + 1250);
  }

  // ---- closing ----

  // What Lisandra says to you goes into the chat log too (src/ui/chatlog.js), as the opening's does. (Her recordings, in
  // assets/voice, aren't played.)
  speak(line, who) {
    if (who !== LISANDRA.id || typeof line !== 'string') return;
    this.act.log?.(LISANDRA.name || 'Lisandra', this.fill(line));
  }

  close(bye) {
    if (!this.open) return;
    const i = this.with, L = this.lines(i);
    this.open = false; this.mode = 'talk';
    this.panel.style.display = 'none';
    document.body.classList.remove('folk-talking');
    this.inventory.showTip(null);
    this.town.talkTo(-1);
    this.with = -1;
    const p = this.person(i), bl = this.ok(L.bye);
    const said = bye && (this.gift(p, L, 'bye') || (bl.length && pick(bl, this.count(p.id, 'bye'))));
    if (said) this.event({ type: 'say', i, text: this.fill(said), dur: 3.5, kind: 'bark' });
    this.act.closed();
  }

  key(e) {
    if (this.book) { if (this.bookKey(e)) e.preventDefault(); return; }
    if (e.repeat) return;
    if (this.open) {
      const n = e.code.startsWith('Digit') ? +e.code.slice(5) : e.code.startsWith('Numpad') ? +e.code.slice(6) : NaN;
      if (!Number.isNaN(n)) { e.preventDefault(); this.choose(n === 0 ? 9 : n - 1); return; }
      if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); this.close(e.code !== 'Escape'); }
      return;
    }
    if (e.code === 'KeyJ' && this.act.canMenu()) { e.preventDefault(); this.openBook(); }
  }

  // ---- the quest log ----
  // Kept as the big games keep theirs. Down the left, the quests under way, grouped by the part of the world they belong to and
  // coloured by their level against yours, each with how far along it is; on the right, the one picked, in full: what it asks of
  // you (counted where it can be), where it takes place now, what it pays and who gave it. Under that: Follow trail (the gold
  // trail on the ground to it), Show on map (the big map, framed on it), Track (in the tracker under the map, src/ui/tracker.js)
  // and Abandon (src/folk/quests.js drop: its giver offers it again). Then the Completed tab, and the Journal: the papers kept and
  // the satchel. With nothing taken on, a hint: what to be doing instead. The workings: src/ui/questlog.js.

  // (tab: the one to open on; pick: the quest to show, else the one you follow.)
  openBook(tab, pick) {
    this.book = true;
    if (tab) this.qTab = tab;
    document.body.classList.add('quest-log'); this.act.sound?.('bookOpen'); this.act.opened();
    // (It opens on the quest you follow, as the big games open on the one you're on.)
    const on = this.quests.followed();
    if (pick) this.qPick[this.qTab] = pick;
    else if (on && on !== 'start') this.qPick.active = on;
    this.qDocFor = null;
    this.drawBook();
    this.bookEl.style.display = 'flex';
    this.bookEl.querySelector('.ql-row.sel')?.scrollIntoView({ block: 'nearest' });
  }
  closeBook() {
    this.book = false;
    if (this.bookEl.contains(document.activeElement)) document.activeElement.blur();
    document.body.classList.remove('quest-log'); this.act.sound?.('bookClose'); this.bookEl.style.display = 'none'; this.act.closed();
  }

  // Where someone is now, by id: { x, z }, or null when they can't be found.
  personAt(id) {
    const i = this.people.findIndex((p) => p.id === id), w = i >= 0 ? this.whereOf(i) : null;
    return w ? { x: w.x, z: w.z } : null;
  }

  // What auto-play is about (src/ui/autoplay.js current): { on, quest, offer, say }.
  autoNow() { return this.act.auto?.() || { on: false }; }

  drawBook() {
    const Q = this.quests, snap = this.snap, mats = this.pack.mats, day = this.act.day(), lvl = this.pack.level || 1;
    const person = (id) => this.personAt(id), auto = this.autoNow(), on = Q.followed();
    this.autoSeen = autoKey(auto);
    const live = Q.active(), done = Object.keys(Q.q).filter((id) => Q.done(id)).reverse();
    const tab = this.qTab, find = this.qFind.trim().toLowerCase();
    const finite = (sp) => Number.isFinite(sp?.x) && Number.isFinite(sp?.z);
    // (What auto-play says it's doing, less the quest's own title in front of it.)
    const doing = (id) => { const t = `${QUESTS[id].title}: `, say = auto.say || ''; return say.startsWith(t) ? say.slice(t.length) : say; };
    const tone = (id) => (Q.done(id) ? 'grey' : levelTone(questLevel(id), lvl));
    const ic = (name, fall = name) => `<span class="m-ic" data-ic="${name}">${icon(fall)}</span>`;
    const key = (k) => `<em class="m-key">${k}</em>`;
    // (A button whose words change as it's pressed, kept as wide as the longer of the two, so the row never jumps.)
    const two = (now, other) => `<span class="m-two"><span>${now}</span><span aria-hidden="true">${other}</span></span>`;

    // ---- the list: the quests of this tab, by the part of the world they're in
    const hit = (id) => !find || `${QUESTS[id].title} ${whoName(QUESTS[id].giver)} ${zoneOf(id)}`.toLowerCase().includes(find);
    const ids = tab === 'active' ? live.filter(hit) : tab === 'done' ? done.filter(hit) : [];
    const zones = new Map();
    for (const id of ids) { const z = zoneOf(id); if (!zones.has(z)) zones.set(z, []); zones.get(z).push(id); }
    const order = [...zones.keys()].sort((a, b) => zoneRank(a) - zoneRank(b));
    if (tab === 'active') for (const z of order) zones.get(z).sort((a, b) => questLevel(a) - questLevel(b));
    const flat = order.flatMap((z) => (this.qShut.has(z) && !find ? [] : zones.get(z)));
    let sel = null;
    if (tab === 'journal') {
      sel = this.qPick.journal;
      if (sel !== 'satchel' && !this.papers[+sel]) sel = this.papers.length ? '0' : 'satchel';
      this.qFlat = [...this.papers.map((_, k) => String(k)), 'satchel'];
    } else {
      sel = flat.includes(this.qPick[tab]) ? this.qPick[tab] : flat[0] || null;
      this.qFlat = flat;
    }
    this.qPick[tab] = sel;
    this.qCur = sel;

    const row = (id) => {
      const isDone = tab === 'done', stand = isDone ? '' : standOf(id, Q, mats, day), isAuto = auto.on && auto.quest === id, w = Q.watching(id);
      const marks = [isAuto && '<i class="ql-auto-dot" title="Auto-play is on this"></i>',
        stand === 'ready' && `<span class="m-ic" data-ic="quest_ready" title="Ready">${icon('quest')}</span>`,
        !isDone && `<span class="ql-pin${w ? ' on' : ''}" data-track="${id}" role="checkbox" aria-checked="${w}" title="${w ? 'Tracked under the map: click to stop tracking it' : 'Track it under the map'}"></span>`].filter(Boolean).join('');
      const sub = isDone ? `From ${whoName(QUESTS[id].giver)}` : shortOf(id, Q, mats, day) || Q.journalLine(id);
      return `<button type="button" class="ql-row${id === sel ? ' sel' : ''}${isDone ? ' done' : ''}${on === id ? ' trail' : ''}" data-sel="${id}" style="--lv:var(--m-lv-${tone(id)})">`
        + `<span class="ql-lv" title="Level ${questLevel(id)}">${questLevel(id)}</span><span class="ql-t">${esc(QUESTS[id].title)}</span>`
        + `<span class="ql-marks">${marks}</span><span class="ql-s${stand === 'ready' ? ' ready' : ''}">${esc(sub)}</span></button>`;
    };
    let list;
    if (tab === 'journal') {
      const kinds = Object.values(mats).filter((n) => n > 0).length;
      list = `${this.papers.length ? `<div class="ql-zone flat">Letters and pages <span>${this.papers.length}</span></div>` : ''}`
        + this.papers.map((p, k) => `<button type="button" class="ql-paper${sel === String(k) ? ' sel' : ''}" data-paper="${k}">${ic('journal')}<span>${esc(p.title)}</span></button>`).join('')
        + `<div class="ql-zone flat">Carried <span></span></div>`
        + `<button type="button" class="ql-paper${sel === 'satchel' ? ' sel' : ''}" data-paper="satchel">${ic('pack')}<span>The satchel</span><b class="ql-n">${kinds || ''}</b></button>`;
    } else if (!ids.length) {
      list = find ? `<div class="m-empty">${ic('quest')}<span>Nothing here matches &ldquo;${esc(this.qFind.trim())}&rdquo;.</span></div>`
        : tab === 'done' ? `<div class="m-empty">${ic('quest_ready', 'quest')}<span>Nothing done yet. The quests you finish are kept here.</span></div>`
          : `<div class="m-empty">${ic('quest_offer', 'quest')}<span>No quests under way.</span></div>`;
    } else {
      list = order.map((z) => {
        const shut = this.qShut.has(z) && !find;
        return `<button type="button" class="ql-zone${shut ? ' shut' : ''}" data-zone="${esc(z)}" aria-expanded="${!shut}">${esc(z)}<span>${zones.get(z).length}</span></button>${shut ? '' : zones.get(z).map(row).join('')}`;
      }).join('');
    }
    // Auto-play, over the list, while it's on: what it's working on.
    const autoLine = tab === 'active' && auto.on
      ? `<div class="ql-autoline"><b>AUTO-PLAY</b><span>${auto.quest && live.includes(auto.quest) ? `On <i>${esc(QUESTS[auto.quest].title)}</i>${doing(auto.quest) ? `: ${esc(doing(auto.quest))}` : ''}`
        : `${auto.offer ? 'Off to take on new work: ' : ''}${esc(auto.say || 'Looking for what to do.')}`}</span></div>` : '';

    // ---- the page: the one picked
    let doc = '', acts = '', hint = null;
    this.qPlace = null;
    if (tab === 'journal') {
      if (sel === 'satchel') {
        const have = Object.entries(mats).filter(([, n]) => n > 0);
        doc = `<h3>The Satchel</h3><div class="ql-meta"><span>What you carry for the townsfolk's work: it doesn't weigh on your pack.</span></div><h4>Carried</h4>`
          + (have.length ? `<div class="ql-satchel">${have.map(([k, n]) => { const src = art('goods', k);
            return `<div class="ql-mat">${src ? `<img src="${src}" alt="">` : ic('pack')}<span>${esc(matName(k, n).replace(/^./, (c) => c.toUpperCase()))}</span><b>${n}</b></div>`; }).join('')}</div>`
            : '<p class="ql-about">Empty.</p>');
      } else {
        const p = this.papers[+sel];
        doc = `<h3>${esc(p.title)}</h3><div class="ql-meta"><span>Kept</span></div><h4>The page</h4><div class="tk-paper">${esc(p.text)}</div>`;
      }
    } else if (sel) {
      const id = sel, q = QUESTS[id], s = Q.state(id), want = questLevel(id), isDone = s.stage === 'done';
      const place = isDone ? null : placeOf(id, { Q, mats, person });
      this.qPlace = place;
      const stand = isDone ? '' : standOf(id, Q, mats, day), isAuto = !isDone && auto.on && auto.quest === id, w = Q.watching(id);
      const tags = [isDone && '<span class="m-tag ready">Completed</span>',
        stand === 'ready' && `<span class="m-tag ready">${s.stage === 'making' ? 'Ready to collect' : 'Ready to hand in'}</span>`,
        stand === 'wait' && '<span class="m-tag warn">Ready tomorrow</span>',
        !isDone && on === id && '<span class="m-tag follow">Following its trail</span>',
        !isDone && w && '<span class="m-tag">Tracked</span>',
        isAuto && '<span class="m-tag auto">Auto-play is on this</span>',
        !isDone && want >= lvl + 3 && '<span class="m-tag warn">Above your level</span>'].filter(Boolean).join('');
      const objs = isDone ? (q.journal || []).map((text) => ({ text, done: true })) : objectivesOf(id, Q, mats, day);
      const obj = objs.map((o) => `<li class="${o.done ? 'done' : o.ready ? 'ready' : ''}">${esc(o.text)}${!o.done && o.need > 1
        ? `<div class="ql-bar"><i><b style="width:${Math.round((100 * Math.min(o.have, o.need)) / o.need)}%"></b></i><span>${o.have} / ${o.need}</span></div>` : ''}</li>`).join('');
      const pic = (r) => `<span class="ql-pic${r.tall ? ' tall' : ''}" style="background-image:url('${this.inventory?.base || ''}assets/game/items/icons/${r.pic}.webp')"></span>`;
      const rw = rewardsOf(id).map((r) => `<div class="ql-rw${r.gold ? ' gold' : ''}">${r.xp ? '<span class="ql-xp">XP</span>' : r.pic ? pic(r) : ic(r.ic, r.ic === 'gold' || r.ic === 'book' ? r.ic : 'pack')}<span>${esc(r.text)}</span></div>`).join('');
      doc = `<h3>${esc(q.title)}</h3>
        <div class="ql-meta"><span class="ql-lvw" style="--lv:var(--m-lv-${tone(id)})">Level ${want}</span><i class="ql-sep"></i><span>${esc(zoneOf(id))}</span><i class="ql-sep"></i><span>From ${esc(whoName(q.giver))}</span></div>
        ${tags ? `<div class="ql-tags">${tags}</div>` : ''}
        <h4>${isDone ? 'What was asked' : 'Objectives'}</h4><ul class="ql-obj">${obj}</ul>
        ${isAuto && doing(id) ? `<div class="ql-doing"><b>AUTO-PLAY</b>${esc(doing(id))}</div>` : ''}
        ${place?.where ? `<h4>Where</h4><div class="ql-where">${ic('map')}<span>${esc(place.where)}</span></div>` : ''}
        <h4>Description</h4><p class="ql-about">${esc(q.about || '')}</p>
        ${rw ? `<h4>${isDone ? 'Earned' : 'Rewards'}</h4><div class="ql-rewards">${rw}</div>` : ''}
        <h4>Given by</h4><div class="ql-giver">${ic('talk')}<span>${esc(giverOf(id))}</span></div>`;
      if (!isDone) {
        const mapOk = !!place?.spots.some(finite), full = !w && Q.watch.length >= WATCH_MAX;
        acts = `<button type="button" class="m-btn${on === id ? ' on' : ''}" data-act="follow" title="${on === id ? 'Put the gold trail on the ground away' : 'A gold trail on the ground, to where it takes place'}">${key('F')}${on === id ? two('Hide trail', 'Follow trail') : two('Follow trail', 'Hide trail')}</button>`
          + `<button type="button" class="m-btn" data-act="map"${mapOk ? ' title="The big map, framed on where it takes place"' : ' disabled title="Not to be found just now"'}>${key('M')}Show on map</button>`
          + `<button type="button" class="m-btn${w ? ' on' : ''}" data-act="track"${full ? ` disabled title="${WATCH_MAX} are tracked already: stop tracking one first"` : ` title="${w ? 'Take it out of the tracker under the map' : 'Show it in the tracker under the map'}"`}>${key('T')}${w ? two('Untrack', 'Track') : two('Track', 'Untrack')}</button>`
          + `<span class="m-gap"></span><button type="button" class="m-btn danger" data-act="drop" title="Give it up: ${esc(whoName(q.giver))} will offer it again">${key('Del')}Abandon</button>`;
      }
    } else if (tab === 'active' && !find) {
      // Nothing taken on: what to be doing instead.
      const stage = snap ? snap[H.OPENING] : OPENING.ARRIVED, arrived = !(stage > 0 && stage < OPENING.ARRIVED);
      hint = hintOf({ Q, stage, fight: snap ? snap[H.OPENING_FIGHT] : 0, lisHere: !!this.whereOf(this.lisI), level: lvl, person, px: snap ? snap[H.PX] : 0, pz: snap ? snap[H.PZ] : 0 });
      if (hint) {
        const okSpot = (it) => finite(it.spot) && (arrived || stage === OPENING.ESCORT);
        doc = `<div class="ql-hint"><h3>${esc(hint.title)}</h3><p>${esc(hint.text)}</p>
          ${hint.items.length ? `<h4>Where to go</h4><ul class="ql-people">${hint.items.map((it, k) => `<li>${ic('quest_offer', 'quest')}<span>${esc(it.text)}</span><button type="button" class="m-btn" data-hint="${k}"${okSpot(it) ? '' : ' disabled'}>Show on map</button></li>`).join('')}</ul>` : ''}</div>`;
        if (!Q.started() && arrived) acts = `<button type="button" class="m-btn${on === 'start' ? ' on' : ''}" data-act="start">${key('F')}${on === 'start' ? 'Hide trail' : 'Follow trail'}</button>`;
      }
    } else {
      doc = `<div class="m-empty">${ic('journal')}<span>${tab === 'done' ? 'Finish a quest and it is kept here, with what it paid.' : 'Pick a quest on the left.'}</span></div>`;
    }

    // ---- the window
    const tabs = [['active', 'Active', live.length], ['done', 'Completed', done.length], ['journal', 'Journal', this.papers.length]];
    const typing = document.activeElement?.matches?.('#folkBook .m-search input') ? document.activeElement.selectionStart : -1;
    const was = { list: this.bookEl.querySelector('.ql-list')?.scrollTop || 0, doc: this.bookEl.querySelector('.ql-doc')?.scrollTop || 0 };
    const docFor = `${tab}:${sel}`;
    this.bookEl.innerHTML = `<div class="m-head">${ic('journal')}<h2>Quest Log</h2>
        <div class="m-tabs" role="tablist">${tabs.map(([k, w, n]) => `<button type="button" role="tab" data-tab="${k}" class="${tab === k ? 'on' : ''}" aria-selected="${tab === k}">${w}${n ? `<b>${n}</b>` : ''}</button>`).join('')}</div>
        <div class="m-end">${tab === 'journal' ? '' : `<label class="m-search"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 10l4.2 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><input type="search" placeholder="Search quests" aria-label="Search quests" value="${esc(this.qFind).replace(/"/g, '&quot;')}"></label>`}
          <span class="m-count" title="Quests in the tracker under the map"><b>${Q.watch.length} / ${WATCH_MAX}</b> tracked</span>${CLOSE_X}</div></div>
      <div class="m-body"><div class="ql-list m-scroll">${autoLine}${list}</div>
        <div class="ql-page${tab === 'done' ? ' past' : ''}"><div class="ql-doc m-scroll">${doc}</div>${acts ? `<div class="ql-acts">${acts}</div>` : ''}</div></div>`;
    paintIcons(this.bookEl);
    // (Drawn again as things change: kept where it was scrolled to, and the search box kept as it was being written in.)
    this.bookEl.querySelector('.ql-list').scrollTop = was.list;
    this.bookEl.querySelector('.ql-doc').scrollTop = this.qDocFor === docFor ? was.doc : 0;
    this.qDocFor = docFor;
    const search = this.bookEl.querySelector('.m-search input');
    if (search) {
      if (typing >= 0) { search.focus({ preventScroll: true }); search.setSelectionRange(typing, typing); }
      search.oninput = () => { this.qFind = search.value; this.drawBook(); };
      search.onkeydown = (e) => {
        // (The game's keys don't hear what's written here; Esc empties it, and Esc again shuts the log.)
        if (e.code === 'Escape' && search.value) { e.preventDefault(); search.value = ''; this.qFind = ''; this.drawBook(); }
        if (e.code !== 'Escape') e.stopPropagation();
        if (e.code === 'Escape' && !search.value) search.blur();
      };
    }
    const click = () => this.act.click?.();
    this.bookEl.querySelector('.menu-x').onclick = (e) => { e.stopPropagation(); this.closeBook(); };
    for (const b of this.bookEl.querySelectorAll('[data-tab]')) b.onclick = () => { click(); this.qTab = b.dataset.tab; this.drawBook(); };
    for (const b of this.bookEl.querySelectorAll('[data-zone]')) b.onclick = () => { click(); const z = b.dataset.zone; if (this.qShut.has(z)) this.qShut.delete(z); else this.qShut.add(z); this.drawBook(); };
    for (const b of this.bookEl.querySelectorAll('[data-sel]')) b.onclick = (e) => {
      if (e.target.closest('[data-track]')) return;
      click(); this.qPick[tab] = b.dataset.sel; this.drawBook();
    };
    for (const b of this.bookEl.querySelectorAll('[data-track]')) b.onclick = (e) => { e.stopPropagation(); this.trackQuest(b.dataset.track); };
    for (const b of this.bookEl.querySelectorAll('[data-paper]')) b.onclick = () => { click(); this.qPick.journal = b.dataset.paper; this.drawBook(); };
    for (const b of this.bookEl.querySelectorAll('[data-hint]')) b.onclick = () => { const it = hint.items[+b.dataset.hint]; this.showOnMap(hint.title, [{ ...it.spot, name: it.spot.name || it.text }]); };
    for (const b of this.bookEl.querySelectorAll('[data-act]')) b.onclick = () => this.bookAct(b.dataset.act);
  }

  // A button under the quest picked (or its key): follow, map, track, drop; or, with nothing taken on, follow the way to Bram.
  bookAct(a) {
    const Q = this.quests, id = this.qTab === 'active' ? this.qCur : null;
    if (a === 'start') { if (!Q.active().length && !Q.started()) { this.act.sound?.('ui_confirm'); Q.pick('start'); } return; }
    if (!id || !Q.state(id) || Q.done(id)) return;
    if (a === 'follow') { this.act.sound?.('ui_confirm'); Q.pick(id); }
    else if (a === 'map') { const sp = this.qPlace?.spots || []; if (sp.some((s) => Number.isFinite(s?.x))) this.showOnMap(QUESTS[id].title, sp); }
    else if (a === 'track') this.trackQuest(id);
    else if (a === 'drop') this.abandon(id);
  }

  trackQuest(id) {
    const Q = this.quests;
    this.act.click?.();
    if (!Q.track(id)) this.note(`${WATCH_MAX} quests are tracked already: stop tracking one first.`, 'hint');
  }

  // Giving a quest up, once you've said you mean it: what's been done towards it goes, what's been handed over for it comes
  // back, and whoever gave it offers it again (src/folk/quests.js drop).
  async abandon(id) {
    const Q = this.quests, q = QUESTS[id], s = Q.state(id);
    if (!Q.canDrop(id) || this.dropping) return;
    // (What it costs you, said plainly: the count you'd lose, the goods that stay with you or come back, a reward waiting.)
    const st = RULES[id].steps[s.step], giver = whoName(q.giver), mats = this.pack.mats, day = this.act.day();
    const now = objectivesOf(id, Q, mats, day).at(-1), stand = standOf(id, Q, mats, day), lines = [];
    if (s.stage === 'making' && st?.bring) lines.push(`The ${st.n || 1} ${matName(st.bring, st.n || 1)} you gave ${giver} come back to you.`);
    else if (stand === 'ready') lines.push(`It's ready to hand in: abandon it now and the reward goes with it.`);
    else if (st?.bring) lines.push(mats[st.bring] ? `The ${mats[st.bring]} ${matName(st.bring, mats[st.bring])} you carry stay in your satchel.` : 'Nothing is lost but the quest.');
    else if (now?.need > 1 && now.have > 0) lines.push(`Your progress (${Math.min(now.have, now.need)} / ${now.need}) is lost.`);
    else if (s.step > 0) lines.push("What you've done towards it is lost.");
    lines.push(`Go back to ${giver} (yellow !) to take it up again, from the start.`);
    const text = lines.join(' ');
    this.dropping = true;
    const tone = `var(--m-lv-${levelTone(questLevel(id), this.pack.level || 1)})`;
    const yes = await (this.act.confirm ? this.act.confirm({ title: 'Abandon quest?', name: q.title, tone, text, yes: 'Abandon', no: 'Keep it', danger: true }) : Promise.resolve(window.confirm(`Abandon "${q.title}"?\n\n${text}`)));
    this.dropping = false;
    if (!yes || !Q.canDrop(id)) return;
    Q.drop(id);
    this.bookEl.querySelector('.ql-list')?.focus?.();
  }

  // The keys while the log is open: up and down the list, left and right through the tabs, F follow, M map, T track, Delete
  // abandon, J or Esc to shut it.
  bookKey(e) {
    if (e.target?.closest?.('#folkBook input')) return false;
    const c = e.code;
    if (c === 'Escape' || c === 'KeyJ') { if (!e.repeat) this.closeBook(); return true; }
    if (c === 'ArrowUp' || c === 'ArrowDown') {
      const L = this.qFlat || [], i = L.indexOf(this.qCur), d = c === 'ArrowUp' ? -1 : 1;
      if (!L.length) return true;
      const next = L[i < 0 ? 0 : Math.max(0, Math.min(L.length - 1, i + d))];
      this.qPick[this.qTab] = next; this.drawBook();
      this.bookEl.querySelector('.ql-row.sel, .ql-paper.sel')?.scrollIntoView({ block: 'nearest' });
      return true;
    }
    if (e.repeat) return true;
    if (c === 'ArrowLeft' || c === 'ArrowRight') {
      const T = ['active', 'done', 'journal'], i = T.indexOf(this.qTab);
      this.qTab = T[(i + (c === 'ArrowLeft' ? 2 : 1)) % 3]; this.act.click?.(); this.drawBook(); return true;
    }
    const a = { KeyF: this.quests.active().length ? 'follow' : 'start', KeyM: 'map', KeyT: 'track', Delete: 'drop', Backspace: 'drop' }[c];
    if (a) { this.bookAct(a); return true; }
    return false;
  }

  // The big map, framed on where something takes place (src/ui/map.js showPlace); someone who walks about is followed there.
  showOnMap(title, spots) {
    const live = spots.map((sp) => (sp.who ? { ...sp, at: () => this.personAt(sp.who) } : sp));
    this.closeBook();
    this.act.map?.({ title, spots: live });
  }

  // ---- notes as things happen ----

  note(text, kind = '') {
    const d = document.createElement('div');
    d.className = `fn ${kind}`;
    d.textContent = text;
    this.notes.appendChild(d);
    while (this.notes.children.length > 4) this.notes.firstChild.remove();
    setTimeout(() => d.classList.add('gone'), kind === 'quest' || kind === 'done' ? 4800 : 3200);
    setTimeout(() => d.remove(), kind === 'quest' || kind === 'done' ? 5500 : 3900);
  }

  // Something put down, somewhere: for the quests' counts.
  kill(x, y, z, kind, group = null) { this.quests.kill(x, y, z, kind, group); }

  // ---- saving ----

  save() {
    return { quests: this.quests.save(), met: [...this.met], said: this.said, stock: this.stock, freeBed: this.freeBed, papers: this.papers, lamp: this.lamp, given: [...this.given] };
  }

  load(d) {
    this.quests.load(d?.quests);
    this.met = new Set(d?.met || []);
    this.said = { ...(d?.said || {}) };
    this.stock = structuredClone(d?.stock || {});
    this.freeBed = !!d?.freeBed;
    this.given = new Set(d?.given || []);
    this.papers = structuredClone(d?.papers || []);
    this.lamp = d?.lamp ? structuredClone(d.lamp) : null;
    this.qPick = { active: null, done: null, journal: null }; this.qFind = '';
    if (this.open) this.close(false);
    if (this.book) this.closeBook();
  }
}

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
// What the log shows of auto-play, as one string: it's drawn again when this changes.
const autoKey = (a) => `${a.on ? 1 : 0}|${a.quest || ''}|${a.offer || ''}|${a.say || ''}|${a.mode || ''}`;
