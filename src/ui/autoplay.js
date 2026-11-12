// Auto-play: the game plays itself. The Auto button sits under Velscour's Skull whenever you're playing, its picture and its glow
// taken from Velscour (Agilancer/velscour assets/ui/btn_auto.webp, css/style.css .hbtn). The button or P turns it on and off;
// moving yourself (the keys or the stick) takes the controls back for a moment. The head is src/ui/autobrain.js.
//
// The button (or P) brings up a menu first: Complete Quests, Grind monsters for XP (and where: GRINDS) or Dungeon Runs (round
// every dungeon the player has finished, until it's stopped: DUNGEONS). Clicking the status line while it plays brings the menu
// back, to change what it's at. While it's on, the mouse is left free (no pointer lock), so the button and its menu can be
// clicked; Esc pauses and resumes. On the quests with every quest done, a menu asks where to grind (GRINDS), and keeps the last
// choice if nobody answers.
//
// It's made to be watched (Settings' Auto-play): the camera stands behind him and is directed (src/ui/autocam.js), what he's at
// is narrated, with banners for what's worth one and a recap of what he got done (src/ui/autoshow.js), a line said to him is
// left up to be read, and a long walk with nothing about is hurried (the world's clock at HASTE: CTRL.HASTE, src/sim/sim.worker.js).
// The menu also sets his temperament, Careful or Bold (Brain.bold in src/ui/autobrain.js).
//
// Settings' Interface in auto-play, Hidden until you tap: while it plays and nobody's touched anything for a few seconds, the
// interface is put away (body.ui-bare, src/ui/hud.css), all but the map and the chat if those are kept (Map in auto-play, Chat
// in auto-play: body.bare-map, body.bare-chat). A tap, a click, a key or the mouse moved brings it all back at once.
import { CTRL, INPUT } from '../core/layout.js';
import { RULES } from '../folk/quests.js';
import { Brain, DUNGEONS, GRINDS, MODES, finishedDungeons } from './autobrain.js';
import { AutoLog } from './autolog.js';
import { AutoShow } from './autoshow.js';
import { AutoCam } from './autocam.js';

const BTN = 'assets/ui/btn_auto.webp';
const MENU_WAIT = 12;   // seconds the menu waits for a choice before it keeps the last one
const HASTE = 2;        // how fast the world runs while a long walk is hurried (Settings' Long walks in auto-play)
const BARE_AFTER = 4;   // seconds left be before the interface is put away, with Settings' Interface in auto-play: Hidden until you tap

const CSS = `
#autoBtn { position: fixed; top: 268px; right: 22px; width: 52px; height: 56px; z-index: 45; border: 0; background: none; cursor: pointer; padding: 0; display: none; }
body.playing #autoBtn { display: block; }
#autoBtn img { display: block; width: 100%; height: 100%; filter: drop-shadow(0 2px 3px #000); transition: filter .12s, transform .12s; pointer-events: none; }
#autoBtn:hover img { filter: drop-shadow(0 0 5px rgba(255,190,90,.75)) brightness(1.15); }
#autoBtn:active img { transform: scale(.94); }
#autoBtn.on img { filter: drop-shadow(0 0 4px #2ab0ff) drop-shadow(0 0 2px #8fe0ff) hue-rotate(160deg) saturate(1.6) brightness(1.15); animation: autoglow 1.6s ease-in-out infinite; }
@keyframes autoglow { 50% { filter: drop-shadow(0 0 9px #4fd0ff) drop-shadow(0 0 3px #bff0ff) hue-rotate(160deg) saturate(1.8) brightness(1.3); } }
#autoStatus { position: fixed; top: 330px; right: 10px; z-index: 45; max-width: min(46vw, 320px); text-align: right; display: none; pointer-events: none; }
body.playing #autoStatus.shown { display: block; }
#autoStatus b { display: inline-block; padding: 2px 8px; border: 1px solid #2a6a8a; border-radius: 4px; background: rgba(4,20,30,.72); font: 700 12px Georgia, serif; color: #8fe0ff;
  letter-spacing: .3px; text-shadow: 0 0 4px #000; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#autoStatus small { display: block; margin-top: 3px; font: 11px Georgia, serif; color: #9fb8c4; text-shadow: 0 1px 2px #000; }
#autoStatus u { pointer-events: auto; cursor: pointer; color: #8fe0ff; text-decoration: underline dotted; margin-left: 6px; }
#autoLog { position: fixed; z-index: 48; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(760px, 96vw); max-height: 90vh; overflow: auto; display: none;
  background: rgba(8, 12, 16, .97); border: 1px solid #2a6a8a; box-shadow: 0 10px 40px #000c; color: #d8e6ec; font: 13px Georgia, serif; padding: 16px 18px; box-sizing: border-box; }
#autoLog.on { display: block; }
#autoLog h2 { margin: 0 0 6px; font: 700 18px Cinzel, Georgia, serif; color: #8fe0ff; }
#autoLog h3 { margin: 14px 0 4px; font: 700 12px Cinzel, Georgia, serif; color: #8fb8c8; letter-spacing: .1em; text-transform: uppercase; }
#autoLog table { border-collapse: collapse; width: 100%; font-size: 12px; }
#autoLog th, #autoLog td { text-align: left; padding: 3px 6px; border-bottom: 1px solid #1c3440; }
#autoLog th { color: #8fb8c8; font-weight: 400; }
#autoLog .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; position: sticky; bottom: -16px; background: rgba(8,12,16,.97); padding: 8px 0; }
#autoLog .foot button { font: inherit; color: #d8e8ee; background: #142028; border: 1px solid #2a4a5a; padding: 7px 12px; cursor: pointer; }
#autoLog .foot button:hover { border-color: #8fe0ff; }
#autoStatus.live { pointer-events: auto; cursor: pointer; }
#autoMenu { position: fixed; z-index: 47; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, 94vw); max-height: 88vh; overflow: auto; display: none;
  background: rgba(8, 12, 16, .96); border: 1px solid #2a6a8a; box-shadow: 0 10px 40px #000c, 0 0 18px rgba(42,176,255,.18); color: #e2eef4; font: 14px Georgia, serif; padding: 18px 20px; box-sizing: border-box; }
#autoMenu.on { display: block; }
#autoMenu h2 { margin: 0 0 4px; font: 700 20px Cinzel, Georgia, serif; color: #8fe0ff; letter-spacing: .05em; }
#autoMenu p { margin: 0 0 12px; color: #a8c0cc; }
#autoMenu .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
#autoMenu .card { font: inherit; color: inherit; text-align: left; background: #0e1a22; border: 1px solid #23485a; padding: 10px; cursor: pointer; border-radius: 3px; }
#autoMenu .card b { display: block; color: #e8f6fc; margin-bottom: 3px; }
#autoMenu .card span { display: block; font-size: 12px; color: #93acb8; }
#autoMenu .card:hover { border-color: #4fd0ff; background: #12242e; }
#autoMenu .card.sel { border-color: #8fe0ff; box-shadow: inset 0 0 12px rgba(79,208,255,.25); }
#autoMenu .card:disabled { opacity: .45; cursor: default; border-color: #23485a; background: #0e1a22; }
#autoMenu p.sub { margin: 12px 0 8px; }
#autoMenu .cards.two { grid-template-columns: 1fr 1fr; }
#autoMenu .card i { display: block; margin-top: 5px; font-size: 11px; color: #8fe0ff; font-style: normal; }
#autoMenu .foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 12px; }
#autoMenu .wait { font-size: 12px; color: #7f9aa6; }
#autoMenu .foot button { font: inherit; color: #d8e8ee; background: #142028; border: 1px solid #2a4a5a; padding: 7px 12px; cursor: pointer; }
#autoMenu .foot button:hover { border-color: #8fe0ff; }
`;

const lower = (s) => s[0].toLowerCase() + s.slice(1);
const el = (tag, id, cls, html) => { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export class AutoPlay {
  // o: { base, opening, game, shared, input, hud, audio, pack, inventory, townUI, lands, renderer, town, spellbar(), paused(), pause(on),
  //   settings (src/title.js: autohide, autohideMap, autohideChat) }
  constructor(o) {
    this.o = o;
    this.on = false; this.brain = null;
    this.yieldT = 0; this.calm = true;
    this.mode = 'quests';   // what it was last set to (MODES): the menu starts on it
    try { const k = localStorage.getItem('bm-auto-mode'); if (MODES[k]) this.mode = k; } catch { /* no storage: quests */ }
    this.bold = false;      // his temperament (the menu): careful, or bold
    try { this.bold = localStorage.getItem('bm-auto-bold') === '1'; } catch { /* no storage: careful */ }
    this.asking = false;    // the menu is up before it's on: the game's hands off, the mouse free to choose
    const style = el('style'); style.textContent = CSS; document.head.append(style);
    this.btn = el('button', 'autoBtn', null, `<img src="${BTN}" alt="Auto" draggable="false">`);
    this.btn.type = 'button';
    this.btn.title = 'Auto-play (P): he plays on his own';
    this.statusEl = el('div', 'autoStatus', null, '<b></b><small></small>');
    this.menu = el('div', 'autoMenu');
    this.logEl = el('div', 'autoLog');
    this.log = new AutoLog();
    document.body.append(this.btn, this.statusEl, this.menu, this.logEl);
    this.show = new AutoShow({ statusEl: this.statusEl, pack: o.pack, townUI: o.townUI, settings: o.settings, isOn: () => this.on });
    this.cam = new AutoCam({ game: o.game, shared: o.shared, settings: o.settings, townUI: o.townUI });
    const press = (e) => { e.preventDefault(); e.stopPropagation(); this.btn.blur(); this.press(); };
    this.btn.addEventListener('click', press);
    this.btn.addEventListener('touchend', press, { passive: false });
    // (The pointer over it: a head start on the nav thread, which takes a few seconds to come up.)
    this.btn.addEventListener('pointerenter', () => this.wake());
    for (const t of [this.btn, this.statusEl, this.menu, this.logEl]) {
      t.addEventListener('pointerdown', (e) => e.stopPropagation());
      t.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    }
    this.statusEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.tagName === 'U') this.showLog();
      else if (this.on) this.askMode();
    });
    addEventListener('keydown', (e) => this.key(e));
    // The interface put away while it plays comes back the instant anything's touched (and the touch does nothing else: what
    // was under it wasn't on the screen).
    this.bare = false; this.since = 0;   // (since: when the interface was last wanted, by the clock: a slow frame isn't a longer one)
    const back = (e) => { if (!e.isTrusted) return; this.since = 0; this.setBare(false); this.show.touched(); };
    for (const t of ['pointerdown', 'touchstart', 'keydown', 'wheel']) addEventListener(t, back, { capture: true, passive: true });
    let mx = -1, my = -1;
    addEventListener('mousemove', (e) => {
      if (Math.abs(e.clientX - mx) + Math.abs(e.clientY - my) > 6 && mx >= 0) back(e);
      mx = e.clientX; my = e.clientY;
    }, { capture: true, passive: true });
  }

  // Put away or brought back (body.ui-bare), keeping the map and the chat on the screen if the settings say so.
  setBare(on) {
    const s = this.o.settings || {}, c = document.body.classList;
    c.toggle('bare-map', s.autohideMap !== 'off');
    c.toggle('bare-chat', s.autohideChat !== 'off');
    if (on === this.bare) return;
    this.bare = on;
    c.toggle('ui-bare', on);
  }

  // Every frame: whether the interface should be put away now. (Only the player's own hands count as being busy with it: a
  // chest or a word it opens itself is up over the bare picture, as it would be over the interface.)
  bareStep() {
    const want = this.on && this.o.settings?.autohide === 'on' && !this.asking && !this.o.paused()
      && !this.menu.classList.contains('on') && !this.logEl.classList.contains('on') && !this.show.card.classList.contains('on') && !document.body.classList.contains('arranging');
    if (!want) { this.since = 0; if (this.bare) this.setBare(false); return; }
    const now = performance.now();
    if (!this.since) this.since = now;
    if (now - this.since > BARE_AFTER * 1000) this.setBare(true);
  }

  // Its head, and the thread it finds its way with (a few seconds to build: started the first time it's wanted, not before, so a
  // game nobody hands over to never pays for it).
  wake() {
    const o = this.o;
    this.brain ||= new Brain({
      game: o.game, shared: o.shared, input: o.input, pack: o.pack, inventory: o.inventory, townUI: o.townUI, lands: o.lands,
      get spellbar() { return o.spellbar(); }, renderer: o.renderer, town: o.town, base: o.base, opening: o.opening,
      heroCount: () => o.renderer.heroCast?.length || 0, foeNames: o.foeNames,
      say: (t) => this.status(t), note: (t) => o.townUI.note(t, 'hint'), allDone: () => this.askGrind(), log: this.log,
      settings: o.settings, event: (k, d) => this.show.event(k, d),
    });
    this.brain.bold = this.bold;
  }

  key(e) {
    if (e.repeat) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const { input } = this.o;
    if (this.asking && (e.code === 'KeyP' || e.code === 'Escape')) { e.preventDefault(); this.cancel(); return; }
    if (e.code === 'KeyP' && input.enabled && !input.menu) { e.preventDefault(); this.press(); return; }
    // With the mouse left free, Esc is the pause (there's no pointer lock for the browser to take back).
    if (e.code === 'Escape' && this.on && input.enabled && this.calm) {
      if (this.menu.classList.contains('on')) { this.closeMenu(); return; }
      if (this.logEl.classList.contains('on')) { this.logEl.classList.remove('on'); return; }
      if (this.show.shut()) return;
      this.o.pause(!this.o.paused());
    }
  }

  // The button or P: off, the menu (what should it do?); on, it stops.
  press() {
    if (this.on) { this.toggle(false); return; }
    if (this.asking) { this.cancel(); return; }
    if (!this.o.input.enabled) return;
    this.askMode();
  }

  // Started from the menu, at what was chosen.
  begin(mode) {
    this.mode = mode;
    try { localStorage.setItem('bm-auto-mode', mode); } catch { /* not kept: fine */ }
    this.wake();
    const b = this.brain;
    const was = b.mode;
    b.mode = mode;
    if (mode !== was || mode === 'dungeons') { b.job = null; b.jobKey = ''; b.runState = null; b.runKey = null; b.laps = 0; }
    this.release();
    if (this.on) { this.o.hud.tip(`Auto-play: ${lower(MODES[mode].name)}.`, 3); return; }
    this.toggle(true);
  }

  toggle(v = !this.on) {
    if (v === this.on) return;
    const { input, hud } = this.o;
    this.on = v;
    this.btn.classList.toggle('on', v);
    if (v) {
      this.wake();
      // (Its line under the button, from the first time it's on: what it's about, and the log.)
      this.statusEl.classList.add('shown');
      input.free = true;
      if (document.pointerLockElement) document.exitPointerLock();
      this.brain.start();
      this.brain.bold = this.bold;
      this.show.start();
      if (this.o.paused()) this.o.pause(false);
      this.brain.mode = this.mode;
      hud.tip(`${MODES[this.mode].name}. ${input.touch ? 'Use the stick to take over for a moment; Auto to stop.' : 'Move to take over for a moment; P or the Auto button stops it. Esc pauses.'}`, 5);
      if (this.mode === 'quests' && this.brain.allQuestsDone()) this.askGrind();
    } else {
      this.brain?.stop();
      this.haste(false);
      if (this.o.game.viewSwitch) this.o.game.viewSwitch.forced = false;
      this.since = 0; this.setBare(false);
      this.show.stop();
      this.log.endFight(); this.log.save();
      input.free = false;
      input.releaseControls();
      this.closeMenu();
      this.status('Auto-play off.');
      // The mouse back to the game (a lock needs this press), or the pause screen if the browser won't.
      if (!this.o.paused()) input.lock();
    }
  }

  status(text) {
    this.statusEl.querySelector('b').textContent = text || '';
    const Q = this.o.townUI.quests, all = Object.keys(RULES), n = all.filter((id) => Q.done(id)).length;
    this.statusEl.classList.toggle('live', this.on);
    const small = this.statusEl.querySelector('small');
    small.textContent = this.on ? `Level ${this.o.pack.level} · quests ${n} of ${all.length} done · click to change` : '';
    small.insertAdjacentHTML('beforeend', '<u>log</u>');
  }

  // Every frame of play.
  frame(dt, snap) {
    const { input, townUI, lands, inventory } = this.o;
    this.calm = !input.menu && !townUI.open && !townUI.book && !lands.isOpen && !inventory.open;
    if (this.menuT > 0 && this.menu.classList.contains('on') && !this.o.paused()) {
      this.menuT -= dt;
      const w = this.menu.querySelector('.wait');
      if (w) w.textContent = `Keeps to ${lower(GRINDS[this.brain.grind].name)} in ${Math.ceil(this.menuT)} s`;
      if (this.menuT <= 0) this.pickGrind(this.brain.grind);
    }
    if (this.asking && !input.enabled) this.cancel();
    this.bareStep();
    // The view behind him while it plays, and the director's shots over that (src/ui/autocam.js): eased out when it stops.
    const vs = this.o.game.viewSwitch;
    if (vs) vs.forced = this.on && this.cam.third;
    if (snap) this.cam.frame(dt, snap, this);
    if (!this.on || !snap) return;
    if (!input.enabled) { this.toggle(false); return; }
    if (this.o.shared.input[INPUT.PAUSE]) { this.haste(false); this.brain.halt(); return; }
    // Hands on the keys: theirs, for a moment.
    if (input.handsOn) {
      if (this.yieldT <= 0) this.status('You have the controls.');
      this.yieldT = 1.5;
      input.auto = null;
      this.haste(false);
      return;
    }
    if (this.yieldT > 0) { this.yieldT -= dt; if (this.yieldT > 0) return; input.auto = this.brain.auto; this.brain.goal = null; this.brain.sub = null; }
    try { this.brain.step(dt, snap); } catch (err) { console.error('auto-play', err); this.brain.halt(); }
    this.haste(this.brain.hurry && this.o.settings?.autohaste !== 'off');
    this.show.frame(dt, snap, this.brain, this.brain.me(snap));
  }

  // The world's clock hurried, or as ever (CTRL.HASTE, in hundredths: src/sim/sim.worker.js).
  haste(on) {
    const c = this.o.shared?.ctrl, v = on ? HASTE * 100 : 100;
    if (c && this.hasted !== v) { this.hasted = v; Atomics.store(c, CTRL.HASTE, v); }
  }

  // ---- the menu: what it should do

  // Before it's on, the game's hands are off and the mouse is free to choose (as with any of the game's panels).
  hold() {
    const { input } = this.o;
    if (this.on || this.asking) return;
    this.asking = true;
    input.free = true;
    input.menu = true;
    input.releaseControls();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  release() {
    if (!this.asking) return;
    this.asking = false;
    this.o.input.menu = false;
    if (!this.on) this.o.input.free = false;
  }

  // Shut without a choice: back to the game as it was.
  cancel() {
    const was = this.asking;
    this.closeMenu();
    this.release();
    if (was && !this.on && !this.o.paused()) this.o.input.lock();
  }

  askMode() {
    this.wake();
    this.hold();
    const { townUI, game } = this.o;
    const done = finishedDungeons(townUI, game);
    const runs = done.length ? `Round and round: ${done.map((d) => lower(d.name)).join(', ')}.` : `Nothing finished yet: ${DUNGEONS.map((d) => lower(d.name)).join(', ')} count once they're done.`;
    const cards = Object.entries(MODES).map(([k, v]) => {
      const off = k === 'dungeons' && !done.length;
      return `<button type="button" class="card${k === this.mode ? ' sel' : ''}" data-m="${k}"${off ? ' disabled' : ''}><b>${v.name}</b><span>${v.line}</span>${k === 'dungeons' ? `<i>${runs}</i>` : ''}</button>`;
    }).join('');
    const temper = [['', 'Careful', 'Runs from what he can\'t yet beat, falls back when he\'s hurt, and comes back two levels stronger.'], ['1', 'Bold', 'Takes fights two levels early and stays in to finish a kill. More close calls, and more falls.']]
      .map(([k, name, line]) => `<button type="button" class="card${(k === '1') === this.bold ? ' sel' : ''}" data-t="${k}"><b>${name}</b><span>${line}</span></button>`).join('');
    this.menu.innerHTML = `<h2>Auto-play</h2><p>What should he do?</p><div class="cards">${cards}</div>
      <p class="sub">And how?</p><div class="cards two">${temper}</div>
      <div class="foot"><span class="wait"></span><span>${this.on ? '<button type="button" data-a="recap">Recap</button> <button type="button" data-a="log">Balance log</button> <button type="button" data-a="stop">Stop auto-play</button> <button type="button" data-a="keep">Carry on</button>' : '<button type="button" data-a="cancel">Cancel</button>'}</span></div>`;
    for (const b of this.menu.querySelectorAll('[data-m]')) b.onclick = () => { if (!b.disabled) this.pickMode(b.dataset.m); };
    for (const b of this.menu.querySelectorAll('[data-t]')) b.onclick = () => { this.setBold(b.dataset.t === '1'); for (const q of this.menu.querySelectorAll('[data-t]')) q.classList.toggle('sel', q === b); };
    this.wire();
    this.menu.classList.add('on');
    this.menuT = 0;
    this.o.audio.play?.('uiOpen', null, 0, 0, 0.4, 1, false);
  }

  // His temperament, kept for next time.
  setBold(on) {
    this.bold = !!on;
    try { localStorage.setItem('bm-auto-bold', on ? '1' : ''); } catch { /* not kept: fine */ }
    if (this.brain) { this.brain.bold = this.bold; this.brain.job = null; this.brain.jobKey = ''; }
  }

  pickMode(k) {
    if (k === 'grind') { this.askGrind(true); return; }
    this.closeMenu();
    this.begin(k);
  }

  // The footer's buttons, whichever menu is up.
  wire() {
    const on = (a, f) => { const b = this.menu.querySelector(`[data-a="${a}"]`); if (b) b.onclick = f; };
    on('stop', () => { this.closeMenu(); this.toggle(false); });
    on('cancel', () => this.cancel());
    on('keep', () => (this.menuT > 0 ? this.pickGrind(this.brain.grind) : this.closeMenu()));
    on('back', () => this.askMode());
    on('log', () => { this.closeMenu(); this.showLog(); });
    on('recap', () => { this.closeMenu(); this.show.recapNow(); });
  }

  // Where to grind: chosen from the menu (chosen), or asked once every quest is done (it keeps the last after a while).
  askGrind(chosen = false) {
    this.wake();
    if (chosen) this.hold();
    const g = this.brain.grind;
    const head = chosen ? `<h2>${MODES.grind.name}</h2><p>Where should he grind?</p>` : `<h2>Every quest is done</h2><p>Nothing's asked of him now but to get stronger. Where should he grind?</p>`;
    const foot = chosen ? `<button type="button" data-a="back">Back</button>${this.asking ? ' <button type="button" data-a="cancel">Cancel</button>' : ''}` : '<button type="button" data-a="log">Balance log</button> <button type="button" data-a="stop">Stop auto-play</button> <button type="button" data-a="keep">Keep grinding</button>';
    this.menu.innerHTML = `${head}
      <div class="cards">${Object.entries(GRINDS).map(([k, v]) => `<button type="button" class="card${k === g ? ' sel' : ''}" data-g="${k}"><b>${v.name}</b><span>${v.line}</span></button>`).join('')}</div>
      <div class="foot"><span class="wait"></span><span>${foot}</span></div>`;
    for (const b of this.menu.querySelectorAll('[data-g]')) b.onclick = () => this.pickGrind(b.dataset.g, chosen);
    this.wire();
    this.menu.classList.add('on');
    this.menuT = chosen ? 0 : MENU_WAIT;
    this.o.audio.play?.('uiOpen', null, 0, 0, 0.4, 1, false);
  }

  pickGrind(k, chosen = false) {
    if (!this.brain || !GRINDS[k]) return;
    this.brain.grind = k;
    this.brain.job = null; this.brain.jobKey = '';
    this.closeMenu();
    if (chosen) this.begin('grind');
    this.o.hud.tip(`Grinding: ${lower(GRINDS[k].name)}.`, 3);
  }

  closeMenu() { this.menu.classList.remove('on'); this.menuT = 0; }

  // What it's working on, for the quest log (src/ui/folk.js): { on, quest, offer, say, mode } (src/ui/autobrain.js doing).
  current() {
    if (!this.on || !this.brain) return { on: false };
    return { on: true, ...this.brain.doing() };
  }

  // A kill of the player's, by what it was (src/main.js EV.LOOT): for the log, while it's playing.
  kill(name) { if (this.on) { this.log.kill(name); this.show.kill(name, this.brain); } }

  // The balance log: what the run has come to so far, and a way to keep it.
  showLog() {
    this.logEl.innerHTML = `<h2>Auto-play log</h2>${this.log.html()}<div class="foot"><button type="button" data-a="save">Save as JSON</button><button type="button" data-a="reset">Start a new log</button><button type="button" data-a="close">Close</button></div>`;
    this.logEl.querySelector('[data-a="close"]').onclick = () => this.logEl.classList.remove('on');
    this.logEl.querySelector('[data-a="reset"]').onclick = () => { this.log.reset(); this.showLog(); };
    this.logEl.querySelector('[data-a="save"]').onclick = () => {
      this.log.save();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(this.log.d, null, 1)], { type: 'application/json' }));
      a.download = `bm-autoplay-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    this.logEl.classList.add('on');
  }
}
