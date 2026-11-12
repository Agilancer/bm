// Auto-play as something to watch: the narrator under its line, the banners over the picture, and the card that says what
// happened while nobody was looking. (The camera is src/ui/autocam.js; the head, src/ui/autobrain.js; the button and the menu,
// src/ui/autoplay.js.)
//
//   the line      under what it's doing (#autoStatus b), what that amounts to (#autoStatus em): how many are on him and how much
//                 life he has left in a fight, how far there is to go on a walk, that the road is being hurried
//   the feed      the last few things worth telling (#autoStatus ol): a level, a quest done, a spell learned, something big
//                 put down, a close call, a fall. Not on a phone, where there isn't the room
//   the banners   the same things, large, over the middle of the picture for a few seconds (#autoBanner), one after another;
//                 they stay when the interface is put away (Settings' Interface in auto-play): they're the show
//   the recap     a card (#autoRecap) of what a stretch of auto-play came to: the time, the levels, the quests done, what was
//                 put down, the closest call, the best thing put on, the gold. Shown when it's stopped, when you come back to
//                 it after AWAY seconds of leaving it be, and from the menu
import { RULES } from '../folk/quests.js';
import { QUESTS } from '../folk/lines/quests.js';
import { COUNTRIES, countryAt } from '../core/lands.js';
import { nameOf } from '../items/items.js';

export const AWAY = 180;         // seconds left alone before coming back gets a recap
export const RECAP_MIN = 60;     // a stretch shorter than this isn't worth a card when it's stopped
const BANNER_FOR = 3.4, FEED_MAX = 4, FEED_FOR = 90;
// What's worth a banner of its own when it dies, by the name the kill comes with (FOE_NAMES in src/main.js).
const BIG = new Set(['KNIGHT OF VELSCOUR', 'GRAVEHART', 'BONE HYDRA', 'WEREWOLF', 'ABYSSAL MOUTH', 'CHAMPION', 'HOARD', 'OGRE']);

const CSS = `
#autoStatus em { display: block; margin-top: 3px; font: italic 12px Georgia, serif; color: #d8c79a; text-shadow: 0 1px 2px #000; min-height: 0; }
#autoStatus em:empty { display: none; }
#autoStatus ol { list-style: none; margin: 6px 0 0; padding: 0; }
#autoStatus ol li { font: 12px Georgia, serif; color: #c9d8de; text-shadow: 0 1px 2px #000; margin-top: 2px; transition: opacity .6s; }
#autoStatus ol li i { font-style: normal; color: #8fe0ff; margin-right: 5px; }
#autoStatus ol li.old { opacity: .45; }
body.touch #autoStatus ol { display: none; }
body.touch #autoStatus em { font-size: calc(10 * var(--u)); }
#autoStatus b { font-size: 14px; padding: 3px 10px; }
#autoBanner { position: fixed; z-index: 44; left: 50%; top: 15%; transform: translate(-50%, 0); width: min(720px, 92vw); text-align: center; pointer-events: none;
  opacity: 0; transition: opacity .45s, transform .45s; }
#autoBanner.on { opacity: 1; transform: translate(-50%, 6px); }
#autoBanner b { display: block; font: 700 30px Cinzel, Georgia, serif; letter-spacing: .08em; color: #f3e6c0; text-shadow: 0 2px 6px #000, 0 0 22px rgba(0,0,0,.8); }
#autoBanner span { display: block; margin-top: 4px; font: 16px Georgia, serif; color: #d6e6ee; text-shadow: 0 1px 4px #000, 0 0 14px rgba(0,0,0,.8); }
#autoBanner.k-boss b { color: #ffcf8a; }
#autoBanner.k-fell b { color: #e89a8a; }
#autoBanner.k-land b { letter-spacing: .16em; }
body.touch #autoBanner b { font-size: calc(19 * var(--u)); }
body.touch #autoBanner span { font-size: calc(11.5 * var(--u)); }
body.paused #autoBanner, body.menu-up #autoBanner { visibility: hidden; }
#autoRecap { position: fixed; z-index: 48; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(520px, 94vw); max-height: 90vh; overflow: auto; display: none;
  background: rgba(8, 12, 16, .96); border: 1px solid #2a6a8a; box-shadow: 0 10px 40px #000c, 0 0 18px rgba(42,176,255,.18); color: #e2eef4; font: 14px Georgia, serif; padding: 18px 20px; box-sizing: border-box; }
#autoRecap.on { display: block; }
#autoRecap h2 { margin: 0 0 2px; font: 700 20px Cinzel, Georgia, serif; color: #8fe0ff; letter-spacing: .05em; }
#autoRecap p { margin: 0 0 10px; color: #a8c0cc; }
#autoRecap dl { display: grid; grid-template-columns: max-content 1fr; gap: 5px 14px; margin: 0; }
#autoRecap dt { color: #8fb8c8; }
#autoRecap dd { margin: 0; color: #e8f6fc; }
#autoRecap .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
#autoRecap .foot button { font: inherit; color: #d8e8ee; background: #142028; border: 1px solid #2a4a5a; padding: 7px 12px; cursor: pointer; }
#autoRecap .foot button:hover { border-color: #8fe0ff; }
body.touch #autoRecap { max-height: calc(100vh - 12px); padding: 12px 16px; }
body.touch #autoRecap .foot button { min-height: 40px; padding: 7px 18px; }
`;

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
/** A kill's name as it's told: 'BONE HYDRA' is 'the Bone Hydra'. */
export const told = (name) => {
  const s = String(name || '').toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bOf\b/g, 'of').replace(/\bOr\b/g, 'or');
  return /^The /.test(s) ? `the ${s.slice(4)}` : /s$/.test(s) ? s : `the ${s}`;
};
const span = (secs) => (secs < 90 ? `${Math.round(secs)} seconds` : secs < 5400 ? `${Math.round(secs / 60)} minutes` : `${(secs / 3600).toFixed(1)} hours`);
const several = (list, most = 3) => (list.length <= most ? list.join(', ') : `${list.slice(0, most).join(', ')} and ${list.length - most} more`);

/** A stretch of auto-play, counted up: what the recap card is made from. */
export function tally(level = 0, purse = 0) {
  return { t: 0, level0: level, level, purse0: purse, purse, quests: [], kills: {}, nKills: 0, big: [], low: null, falls: 0, spells: [], best: null, lands: [] };
}

/** The recap's rows, [what, how much], from a tally: only what there's something to say about. (Pure: tests/auto-show.test.mjs.) */
export function recapRows(T) {
  const rows = [];
  rows.push(['Played', span(T.t)]);
  if (T.level > T.level0) rows.push(['Levels', `${T.level0} to ${T.level}`]);
  if (T.quests.length) rows.push([T.quests.length === 1 ? 'Quest done' : `${T.quests.length} quests done`, several(T.quests)]);
  if (T.spells.length) rows.push(['Learned', several(T.spells, 4)]);
  if (T.big.length) rows.push(['Brought down', several(T.big)]);
  if (T.nKills) {
    const top = Object.entries(T.kills).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${n} × ${told(k).replace(/^the /, '')}`);
    rows.push(['Put down', `${T.nKills} in all: ${top.join(', ')}`]);
  }
  if (T.low && T.low.hpf < 0.5) rows.push(['Closest call', `${Math.max(1, Math.round(T.low.hpf * 100))}% of his life left${T.low.who ? `, against ${T.low.who}` : ''}`]);
  if (T.falls) rows.push(['Beaten back', T.falls === 1 ? 'once' : `${T.falls} times`]);
  if (T.best) rows.push(['Best find', T.best.name]);
  const gold = Math.round((T.purse - T.purse0) / 10);
  if (gold) rows.push(['Gold', gold > 0 ? `${gold} more in the purse` : `${-gold} spent`]);
  if (T.lands.length) rows.push(['Went through', several(T.lands, 4)]);
  return rows;
}

export class AutoShow {
  // o: { statusEl, pack, townUI, settings, isOn(): auto-play is playing }
  constructor(o) {
    this.o = o;
    const style = document.createElement('style'); style.textContent = CSS; document.head.append(style);
    this.em = document.createElement('em');
    this.feedEl = document.createElement('ol');
    o.statusEl.querySelector('b').after(this.em);
    o.statusEl.append(this.feedEl);
    this.bannerEl = document.createElement('div'); this.bannerEl.id = 'autoBanner'; this.bannerEl.innerHTML = '<b></b><span></span>';
    this.card = document.createElement('div'); this.card.id = 'autoRecap';
    document.body.append(this.bannerEl, this.card);
    for (const t of ['pointerdown', 'touchstart']) this.card.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
    this.queue = []; this.bannerT = 0; this.feed = [];
    this.run = null; this.gone = null;   // the tallies: since it was turned on; since anyone last touched anything
    this.idle = 0;                       // seconds since anyone touched anything, with it on
    this.level = 0; this.questT = 0; this.done = null; this.land = null; this.landT = 0; this.stakes = '';
  }

  // ---- the tallies

  each(f) { if (this.run) f(this.run); if (this.gone) f(this.gone); }

  // Turned on: a stretch begins.
  start() {
    const { pack } = this.o;
    this.run = tally(pack.level, pack.purse());
    this.gone = tally(pack.level, pack.purse());
    this.idle = 0; this.level = pack.level; this.done = null; this.land = null; this.feed = []; this.drawFeed();
  }

  // Turned off: what the stretch came to, if it was long enough to say.
  stop() {
    this.queue = []; this.bannerT = 0; this.bannerEl.classList.remove('on'); this.em.textContent = '';
    const T = this.run;
    this.run = null; this.gone = null;
    if (T && T.t >= RECAP_MIN) this.recap(T, 'Auto-play stopped');
  }

  // Somebody's hand on it (src/ui/autoplay.js back): if it's been left a good while, what happened in that while.
  touched() {
    const was = this.idle, T = this.gone;
    this.idle = 0;
    if (!this.o.isOn() || !T) return;
    if (was >= AWAY && !this.card.classList.contains('on')) this.recap(T, 'While you were away');
    if (was >= AWAY) this.gone = tally(this.o.pack.level, this.o.pack.purse());
  }

  // ---- what happens

  // From the head (src/ui/autobrain.js o.event).
  event(kind, d = {}) {
    if (kind === 'spell') { this.each((T) => T.spells.push(d.name)); this.tell('spell', d.name, 'A new spell in the book', 'Learned'); }
    else if (kind === 'wear') {
      const name = nameOf(d.item);
      this.each((T) => { if (!T.best || d.gain > T.best.gain) T.best = { name, gain: d.gain }; });
      if (d.gain > 40) this.note('Put on', name);
    } else if (kind === 'fell') { this.each((T) => { T.falls++; }); this.tell('fell', 'Beaten back', d.say ? 'He\'ll come back to that stronger.' : '', 'Beaten back'); }
    else if (kind === 'opener') this.note('Opens with', `${d.spell} on ${d.who}`);
    else if (kind === 'finisher') this.note('Ends it with', `${d.spell} on ${d.who}`);
  }

  // A kill of his (src/ui/autoplay.js kill): counted, and told if it was something big.
  kill(name, brain) {
    this.each((T) => { T.kills[name] = (T.kills[name] || 0) + 1; T.nKills++; });
    // (Only what he was fighting: a knight the town's own put down while he was at a chest isn't his to be told of.)
    const sc = brain?.scene0, his = !!sc && brain.t - sc.t < 4;
    const big = his && (BIG.has(name) || (sc.big && sc.left < 0.4));
    if (!big) return;
    const who = BIG.has(name) || !sc ? told(name) : sc.who;
    this.each((T) => T.big.push(who));
    this.tell('boss', `Down: ${who}`, '', 'Down');
    this.orbit = true;   // (for the camera: src/ui/autocam.js takes it up)
  }

  // Every frame it's on.
  frame(dt, snap, brain, m) {
    const { pack, townUI } = this.o;
    this.idle += dt;
    this.each((T) => { T.t += dt; T.level = pack.level; T.purse = pack.purse(); });
    // A level.
    if (pack.level > this.level && this.level > 0) { this.tell('level', `Level ${pack.level}`, 'Stronger, and a point for the book', 'Level'); this.orbit = true; }
    this.level = pack.level;
    // The quests, a couple of times a second: one done since the last look.
    if ((this.questT -= dt) <= 0) {
      this.questT = 0.5;
      const now = new Set(Object.keys(RULES).filter((id) => townUI.quests.done(id)));
      if (this.done) for (const id of now) if (!this.done.has(id)) { const title = QUESTS[id]?.title || id; this.each((T) => T.quests.push(title)); this.tell('quest', 'Quest done', title, 'Quest done'); }
      this.done = now;
      // And the country he's in: a new one is told once he's well into it.
      const land = m.below ? this.land : countryAt(m.x, m.z);
      if (land !== this.land) { if (this.landIs !== land) { this.landIs = land; this.landT = 0; } else if ((this.landT += 0.5) >= 4) { const first = this.land === null; this.land = land; const name = COUNTRIES[land]?.name; if (name && !first) { this.each((T) => { if (!T.lands.includes(name)) T.lands.push(name); }); this.tell('land', name, '', 'Into'); this.arrived = true; } } }
    }
    // A fight: how it stands, and the closest it came.
    const sc = brain.scene0, fight = brain.fighting && sc && brain.t - sc.t < 1;
    if (fight) this.each((T) => { if (!T.low || m.hpf < T.low.hpf) T.low = { hpf: m.hpf, who: sc.n > 1 ? `${sc.n} at once` : sc.who }; });
    if (fight && m.hpf < 0.2 && !this.close) { this.close = true; this.note('Close', `${Math.max(1, Math.round(m.hpf * 100))}% of his life left`); }
    if (m.hpf > 0.5) this.close = false;
    const g = brain.goal, togo = g && brain.useGoal ? Math.hypot(g.x - m.x, g.z - m.z) : 0;
    const stakes = fight ? `${sc.n > 1 ? `${sc.n} on him` : sc.who} · ${Math.max(1, Math.round(m.hpf * 100))}% life${sc.early ? ' · before his level' : ''}`
      : brain.hurry ? `Hurrying the long road · ${Math.round(togo / 10) * 10} m to go`
        : togo > 80 ? `${Math.round(togo / 10) * 10} m to go` : '';
    if (stakes !== this.stakes) { this.stakes = stakes; this.em.textContent = stakes; }
    // The banners, one at a time.
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0.5) this.bannerEl.classList.remove('on'); }
    if (this.bannerT <= 0 && this.queue.length) {
      const b = this.queue.shift();
      this.bannerEl.className = `on k-${b.kind}`;
      this.bannerEl.querySelector('b').textContent = b.big;
      this.bannerEl.querySelector('span').textContent = b.small || '';
      this.bannerT = BANNER_FOR;
    }
    if ((this.feedT = (this.feedT || 0) - dt) <= 0) { this.feedT = 5; this.drawFeed(); }
  }

  // ---- the banners and the feed

  // Told large, and kept on the feed.
  tell(kind, big, small, label) {
    if (this.o.settings?.autotell === 'off') { this.note(label, kind === 'quest' || kind === 'spell' ? (kind === 'spell' ? big : small) : big.replace(/^(Level |Down: )/, '')); return; }
    if (this.queue.length < 5) this.queue.push({ kind, big, small });
    this.note(label, kind === 'quest' ? small : kind === 'level' || kind === 'boss' ? big.replace(/^(Level |Down: )/, '') : kind === 'fell' ? '' : big);
  }

  // A line on the feed.
  note(label, text) {
    this.feed.push({ label, text, at: performance.now() });
    while (this.feed.length > FEED_MAX) this.feed.shift();
    this.drawFeed();
  }

  drawFeed() {
    const now = performance.now();
    this.feed = this.feed.filter((f) => now - f.at < FEED_FOR * 1000);
    this.feedEl.innerHTML = this.feed.map((f) => `<li class="${now - f.at > 20000 ? 'old' : ''}"><i>${esc(f.label)}</i>${esc(f.text)}</li>`).join('');
  }

  // ---- the recap

  recap(T, title) {
    const rows = recapRows(T);
    const quiet = rows.length <= 1;
    this.card.innerHTML = `<h2>${esc(title)}</h2><p>${quiet ? 'Nothing much to tell yet.' : 'What he got done on his own.'}</p>
      <dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <div class="foot"><button type="button">Close</button></div>`;
    this.card.querySelector('button').onclick = () => this.card.classList.remove('on');
    this.card.classList.add('on');
    clearTimeout(this.cardT);
    this.cardT = setTimeout(() => this.card.classList.remove('on'), 30000);
  }

  // From the menu: the stretch so far.
  recapNow() { if (this.run) this.recap(this.run, 'So far'); }
  shut() { if (!this.card.classList.contains('on')) return false; this.card.classList.remove('on'); return true; }
}
