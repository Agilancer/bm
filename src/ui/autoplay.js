// Auto-play: the game plays itself. The Auto button sits under Velscour's Skull whenever you're playing, its picture and its glow
// taken from Velscour (Agilancer/velscour assets/ui/btn_auto.webp, css/style.css .hbtn). The button or P turns it on and off;
// moving yourself (the keys or the stick) takes the controls back for a moment. The head is src/ui/autobrain.js.
//
// While it's on, the mouse is left free (no pointer lock), so the button and its menu can be clicked; Esc pauses and resumes.
// When every quest is done and it's only grinding, a menu asks where (GRINDS), and keeps the last choice if nobody answers.
import { INPUT } from '../core/layout.js';
import { RULES } from '../folk/quests.js';
import { Brain, GRINDS } from './autobrain.js';
import { AutoLog } from './autolog.js';

const BTN = 'assets/ui/btn_auto.webp';
const MENU_WAIT = 12;   // seconds the menu waits for a choice before it keeps the last one

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
#autoStatus.grinding { pointer-events: auto; cursor: pointer; }
body.touch #autoBtn { width: 38px; height: 41px; top: 250px; right: 12px; }
body.touch #autoStatus { top: 296px; }
body.touch #autoStatus b { font-size: 10px; }
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
#autoMenu .foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 12px; }
#autoMenu .wait { font-size: 12px; color: #7f9aa6; }
#autoMenu .foot button { font: inherit; color: #d8e8ee; background: #142028; border: 1px solid #2a4a5a; padding: 7px 12px; cursor: pointer; }
#autoMenu .foot button:hover { border-color: #8fe0ff; }
`;

const lower = (s) => s[0].toLowerCase() + s.slice(1);
const el = (tag, id, cls, html) => { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export class AutoPlay {
  // o: { base, opening, game, shared, input, hud, audio, pack, inventory, townUI, lands, renderer, town, spellbar(), paused(), pause(on) }
  constructor(o) {
    this.o = o;
    this.on = false; this.brain = null;
    this.yieldT = 0; this.calm = true;
    const style = el('style'); style.textContent = CSS; document.head.append(style);
    this.btn = el('button', 'autoBtn', null, `<img src="${BTN}" alt="Auto" draggable="false">`);
    this.btn.type = 'button';
    this.btn.title = 'Auto-play (P): he plays on his own';
    this.statusEl = el('div', 'autoStatus', null, '<b></b><small></small>');
    this.menu = el('div', 'autoMenu');
    this.logEl = el('div', 'autoLog');
    this.log = new AutoLog();
    document.body.append(this.btn, this.statusEl, this.menu, this.logEl);
    const press = (e) => { e.preventDefault(); e.stopPropagation(); this.btn.blur(); this.toggle(); };
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
      else if (this.on && this.brain?.allQuestsDone()) this.askGrind();
    });
    addEventListener('keydown', (e) => this.key(e));
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
    });
  }

  key(e) {
    if (e.repeat) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const { input } = this.o;
    if (e.code === 'KeyP' && input.enabled && !input.menu) { e.preventDefault(); this.toggle(); return; }
    // With the mouse left free, Esc is the pause (there's no pointer lock for the browser to take back).
    if (e.code === 'Escape' && this.on && input.enabled && this.calm) {
      if (this.menu.classList.contains('on')) { this.closeMenu(); return; }
      if (this.logEl.classList.contains('on')) { this.logEl.classList.remove('on'); return; }
      this.o.pause(!this.o.paused());
    }
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
      if (this.o.paused()) this.o.pause(false);
      hud.tip(input.touch ? 'Auto-play on. Use the stick to take over for a moment; Auto to stop.' : 'Auto-play on. Move to take over for a moment; P or the Auto button stops it. Esc pauses.', 5);
      if (this.brain.allQuestsDone()) this.askGrind();
    } else {
      this.brain?.stop();
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
    const grinding = this.on && n === all.length;
    this.statusEl.classList.toggle('grinding', grinding);
    const small = this.statusEl.querySelector('small');
    small.textContent = this.on ? `Level ${this.o.pack.level} · quests ${n} of ${all.length} done${grinding ? ' · click to choose where' : ''}` : '';
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
    if (!this.on || !snap) return;
    if (!input.enabled) { this.toggle(false); return; }
    if (this.o.shared.input[INPUT.PAUSE]) { this.brain.halt(); return; }
    // Hands on the keys: theirs, for a moment.
    if (input.handsOn) {
      if (this.yieldT <= 0) this.status('You have the controls.');
      this.yieldT = 1.5;
      input.auto = null;
      return;
    }
    if (this.yieldT > 0) { this.yieldT -= dt; if (this.yieldT > 0) return; input.auto = this.brain.auto; this.brain.goal = null; this.brain.sub = null; }
    try { this.brain.step(dt, snap); } catch (err) { console.error('auto-play', err); this.brain.halt(); }
  }

  // ---- the menu, once there's nothing left but grinding

  askGrind() {
    if (!this.brain) return;
    const g = this.brain.grind;
    this.menu.innerHTML = `<h2>Every quest is done</h2><p>Nothing's asked of him now but to get stronger. Where should he grind?</p>
      <div class="cards">${Object.entries(GRINDS).map(([k, v]) => `<button type="button" class="card${k === g ? ' sel' : ''}" data-g="${k}"><b>${v.name}</b><span>${v.line}</span></button>`).join('')}</div>
      <div class="foot"><span class="wait"></span><span><button type="button" data-a="log">Balance log</button> <button type="button" data-a="stop">Stop auto-play</button> <button type="button" data-a="keep">Keep grinding</button></span></div>`;
    for (const b of this.menu.querySelectorAll('[data-g]')) b.onclick = () => this.pickGrind(b.dataset.g);
    this.menu.querySelector('[data-a="stop"]').onclick = () => { this.closeMenu(); this.toggle(false); };
    this.menu.querySelector('[data-a="keep"]').onclick = () => this.pickGrind(this.brain.grind);
    this.menu.querySelector('[data-a="log"]').onclick = () => { this.closeMenu(); this.showLog(); };
    this.menu.classList.add('on');
    this.menuT = MENU_WAIT;
    this.o.audio.play?.('uiOpen', null, 0, 0, 0.4, 1, false);
  }

  pickGrind(k) {
    if (!this.brain || !GRINDS[k]) return;
    this.brain.grind = k;
    this.brain.job = null; this.brain.jobKey = '';
    this.closeMenu();
    this.o.hud.tip(`Grinding: ${lower(GRINDS[k].name)}.`, 3);
  }

  closeMenu() { this.menu.classList.remove('on'); this.menuT = 0; }

  // What it's working on, for the quest log (src/ui/folk.js): { on, quest, offer, say } (src/ui/autobrain.js doing).
  current() {
    if (!this.on || !this.brain) return { on: false };
    return { on: true, ...this.brain.doing() };
  }

  // A kill of the player's, by what it was (src/main.js EV.LOOT): for the log, while it's playing.
  kill(name) { if (this.on) this.log.kill(name); }

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
