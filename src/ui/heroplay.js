// Playing as one of your party, on the render thread (the sim's half is src/sim/heroplay.js): the ▶ by each of your party's
// life bars that puts you in their body (and the ◀ that gives it back), their bar of moves along the bottom in place of your
// spells, TERA's way (the blows on the mouse, the moves on 1-0, a chained move offered on Space, cooldowns sweeping round),
// what the crosshair's on (a mark over its head and its name and life at the top), and the party's four calls on Z X C G,
// as Dragon's Dogma's pawns take theirs.
import { CHARS_START, C, C_SIZE, H } from '../core/layout.js';
import { CLASSES, MOVE_KEYS, MOB_KEYS } from '../core/heroes.js';
import { MORE_SKILLS } from '../sim/heroskills.js';
import { BAR_SLOTS, CALLS, chainOf, FIRST_NAMES, PLAYER_MOVES, cdOf } from '../sim/heroplay-moves.js';
import { GLYPHS } from './spellglyphs.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const CALL_KEY = { KeyZ: 'go', KeyX: 'come', KeyC: 'wait', KeyG: 'help' };
const CALL_TEXT = { go: ['Z', 'Go!'], come: ['X', 'To me!'], wait: ['C', 'Wait!'], help: ['G', 'Help!'] };
// What you shout for each (the chat log has it under your name).
const CALL_SAY = { go: 'Go! Take it down!', come: 'To me! Fall back to me!', wait: 'Wait here.', help: 'Help me!' };
// Each class's colour on the bar.
const TINT = { paladin: '#f3d27a', lancer: '#8fc8ff', archer: '#a4ec7a', rogue: '#ff7d8a', ninja: '#c49bff', dragoon: '#7bebff', boomerang: '#ffbd6a', bard: '#ffa6e0' };

// A picture for each move, by what it is: on a 24 box, `s:` drawn as lines (as the spells' are: src/ui/spellglyphs.js).
const PICS = {
  shield: 'M12 2l8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5z',
  lance: 's:M3 21L18 6M14 3h7v7M7 13l4 4M5 16l3 3',
  arrow: 's:M3 21L20 4M14 4h6v6M3 16l5 5M6 13l-3 3M11 18l-3 3',
  star: 'M12 2l2.500 7.500L22 12l-7.500 2.500L12 22l-2.500-7.500L2 12l7.500-2.500z',
  hammer: 'M3 4h12v6H3zM8 10h3v12H8zM15 6l5-2v6l-5-2z',
  note: 'M9 18a3 3 0 1 1-2-2.800V4l11-2v12a3 3 0 1 1-2-2.800V6l-7 1.300z',
  rang: 'M3 6c5-2 9-1 10 4 1 4 4 7 8 8-4 2-9 1-11-3-1-3-4-5-7-5z',
  leap: 's:M3 21c3-10 9-14 17-16M14 3h6v6M3 21h6',
  blade: 's:M4 20L20 4M7 4c7 1 11 5 13 13M4 20l3-1-2-2z',
  shout: 's:M4 9v6h4l6 5V4L8 9zM17 8a5 5 0 0 1 0 8M19.500 5a9 9 0 0 1 0 14',
  kick: 's:M7 3v8l7 5h7M7 11L5 21M3 7h4',
  dash: GLYPHS.blink, chain: GLYPHS.chain, nova: GLYPHS.nova, heal: GLYPHS.mend, wisp: GLYPHS.wisp,
};
function picOf(key, cls) {
  const k = key;
  if (/heal|light|mend|song|chord|riff|echo|notes/.test(k)) return /light|mend|mending/.test(k) ? 'heal' : 'note';
  if (/leash|chain/.test(k)) return 'chain';
  if (/shout|wall|order/.test(k)) return 'shout';
  if (/shield|bulwark|tower|counter|phalanx/.test(k)) return 'shield';
  if (/hammer|smite|zeal|fist|solar/.test(k)) return 'hammer';
  if (/arrow|shot|volley|strafe|disengage/.test(k)) return 'arrow';
  if (/star|shuriken/.test(k)) return 'star';
  if (/rang|chakram|cross_cut|wind/.test(k)) return 'rang';
  if (/leap|jump|dive|fall|step|vault|death_from/.test(k)) return 'leap';
  if (/kick|dragon$|rising/.test(k)) return 'kick';
  if (/charge|rush|dash|flip|shadow|vanish|substitution/.test(k)) return 'dash';
  if (/nova|storm|rain|whirl|fury|wave|breath|tornado|ring/.test(k)) return 'nova';
  if (/lance|spear|thrust|barrage|flurry|sunspear|beam/.test(k)) return cls === 'paladin' ? 'hammer' : 'lance';
  return 'blade';
}
const svgOf = (pic, col) => {
  const g = PICS[pic] || PICS.wisp, line = g.startsWith('s:');
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${line ? g.slice(2) : g}" ${line ? `fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"` : `fill="${col}"`}/></svg>`;
};
export function moveName(cls, key) {
  return PLAYER_MOVES[cls]?.[key]?.name || FIRST_NAMES[key] || (MORE_SKILLS[cls] || []).find((s) => s.key === key)?.name || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
// The blows on the mouse, by class: what the left button does, and the right.
const LEFT = { lancer: 'Lance Thrust', paladin: 'Strike', archer: 'Shoot', rogue: 'Slash', ninja: 'Strike', dragoon: 'Spear Combo', boomerang: 'Throw', bard: 'Pluck' };
const RIGHT = (cls) => (cls === 'lancer' || cls === 'paladin' ? 'Block' : cls === 'archer' ? 'Charged Shot' : 'Heavy Blow');

export class HeroPlayUI {
  // o: { sim (the worker), input, party (PartyUI), hud, chatLog, viewSwitch, autoplay, renderer, playerName () }
  constructor(o) {
    Object.assign(this, o);
    this.slot = -1;        // whose body you're in (party slot), -1 your own
    this.bar = [];
    this.buildDom();
    // The party's frames get their ▶ (src/ui/party.js buildFrames calls this for each).
    this.party.playButton = (el, m) => this.button(el, m);
    window.addEventListener('keydown', (e) => this.key(e), true);
    const cv = this.input.canvas;
    cv.addEventListener('mousedown', (e) => { if (e.button === 0 && this.slot >= 0 && document.pointerLockElement === cv) this.held(true); });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.held(false); });
    window.addEventListener('blur', () => this.held(false));
    // (Alt's soft cursor reaches the ▶ too: src/input.js.)
    const soft = this.input.softPress;
    this.input.softPress = (x, y) => { const b = document.elementFromPoint(x, y)?.closest('.pf-play'); if (b) { b.click(); return; } soft?.(x, y); };
  }

  buildDom() {
    const css = document.createElement('style');
    css.textContent = `
      #partyFrames .pf { position: relative; }
      #partyFrames .pf-play { position: absolute; right: -30px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; padding: 0; pointer-events: auto; cursor: pointer;
        border: 1px solid rgba(201,163,92,.75); border-radius: 50%; background: radial-gradient(circle at 40% 35%, rgba(70,52,26,.95), rgba(14,10,6,.95)); color: #f1d68a;
        font: 11px/22px Georgia, serif; text-align: center; box-shadow: 0 1px 4px #000a; transition: transform .12s, box-shadow .12s; }
      #partyFrames .pf-play:hover { transform: translateY(-50%) scale(1.15); box-shadow: 0 0 10px rgba(241,214,138,.7); }
      #partyFrames .pf.played { border-color: #f1d68a; box-shadow: 0 0 12px rgba(241,214,138,.45); }
      #partyFrames .pf.played .pf-play { color: #9fd0ff; border-color: #9fd0ff; }
      body.hero-play #spells, body.hero-play #mana, body.hero-play #stam { display: none !important; }
      #heroBar { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 5; display: none; align-items: flex-end; gap: 6px; pointer-events: none; font-family: Georgia, serif; }
      body.hero-play #heroBar { display: flex; }
      #heroBar .grp { display: flex; gap: 4px; padding: 5px; background: linear-gradient(rgba(20,15,9,.82), rgba(8,6,4,.9)); border: 1px solid rgba(140,115,68,.6); border-radius: 6px; box-shadow: 0 4px 16px #0009; }
      #heroBar .hs { position: relative; width: 46px; height: 46px; border-radius: 4px; background: radial-gradient(circle at 50% 35%, rgba(60,48,30,.9), rgba(10,8,5,.95)); border: 1px solid rgba(160,130,80,.55); overflow: hidden; pointer-events: auto; }
      #heroBar .hs svg { position: absolute; inset: 9px; width: 28px; height: 28px; filter: drop-shadow(0 0 3px rgba(0,0,0,.8)); }
      #heroBar .hs kbd { position: absolute; left: 3px; top: 1px; font: 10px Georgia, serif; color: #e9dfc8; text-shadow: 0 0 3px #000, 0 0 2px #000; }
      #heroBar .hs .cd { position: absolute; inset: 0; background: conic-gradient(rgba(0,0,0,.72) var(--a, 0deg), transparent 0); }
      #heroBar .hs .cs { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: 700 15px Georgia, serif; color: #fff; text-shadow: 0 0 4px #000, 0 0 2px #000; }
      #heroBar .hs.empty { opacity: .35; }
      #heroBar .hs.chain { border-color: #ffe08a; box-shadow: inset 0 0 12px rgba(255,214,110,.75), 0 0 10px rgba(255,214,110,.6); animation: hpPulse .5s ease-in-out infinite alternate; }
      #heroBar .hs.on { border-color: #9fd0ff; box-shadow: inset 0 0 10px rgba(130,190,255,.7); }
      #heroBar .hs.mouse { width: 40px; }
      #heroBar .hs.space { width: 64px; }
      @keyframes hpPulse { from { filter: brightness(1); } to { filter: brightness(1.45); } }
      #heroVit { position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%); z-index: 5; display: none; width: min(420px, 60vw); pointer-events: none; font-family: Georgia, serif; text-align: center; }
      body.hero-play #heroVit { display: block; }
      #heroVit .who { font: 600 13px Cinzel, Georgia, serif; color: #e9dfc8; letter-spacing: .08em; text-shadow: 0 0 4px #000, 0 1px 2px #000; }
      #heroVit .who em { font-style: normal; opacity: .7; font-size: 11px; margin-left: 6px; }
      #heroVit .bar { height: 9px; margin-top: 3px; background: rgba(0,0,0,.7); border: 1px solid rgba(140,115,68,.6); border-radius: 2px; overflow: hidden; }
      #heroVit .bar i { display: block; height: 100%; background: linear-gradient(#e0473a, #8e1d12); transition: width .15s; }
      #heroChain { position: fixed; left: 50%; top: 63%; transform: translateX(-50%); z-index: 6; display: none; align-items: center; gap: 10px; padding: 6px 14px 8px; pointer-events: none;
        background: linear-gradient(rgba(30,22,10,.85), rgba(10,7,3,.9)); border: 1px solid #e8c15a; border-radius: 5px; box-shadow: 0 0 18px rgba(255,200,90,.45); font: 600 15px Cinzel, Georgia, serif; color: #ffe7a8; letter-spacing: .06em; }
      #heroChain kbd { font: 700 12px Georgia, serif; color: #1a1206; background: #f1d68a; border-radius: 3px; padding: 2px 7px; }
      #heroChain svg { width: 22px; height: 22px; }
      #heroChain .t { position: absolute; left: 0; bottom: 0; height: 2px; background: #f1d68a; }
      #heroTarget { position: fixed; left: 50%; top: 154px; transform: translateX(-50%); z-index: 5; display: none; width: min(340px, 60vw); pointer-events: none; text-align: center; font-family: Cinzel, Georgia, serif; }
      #heroTarget .n { font-size: 13px; color: #f4dfb0; letter-spacing: .07em; text-shadow: 0 0 4px #000, 0 1px 2px #000; }
      #heroTarget .bar { height: 7px; margin-top: 3px; background: rgba(0,0,0,.7); border: 1px solid rgba(140,115,68,.7); border-radius: 2px; overflow: hidden; }
      #heroTarget .bar i { display: block; height: 100%; background: linear-gradient(#d65b3c, #7c2410); }
      #heroMark { position: fixed; left: 0; top: 0; z-index: 4; width: 26px; height: 26px; margin: -13px 0 0 -13px; display: none; pointer-events: none;
        border: 2px solid rgba(255,90,60,.9); border-radius: 50%; box-shadow: 0 0 8px rgba(255,80,40,.7), inset 0 0 6px rgba(255,80,40,.5); }
      #heroMark::after { content: ''; position: absolute; left: 50%; top: -11px; margin-left: -6px; border: 6px solid transparent; border-top: 8px solid rgba(255,90,60,.95); }
      #heroCalls { position: fixed; left: 14px; bottom: 14px; z-index: 5; display: none; gap: 4px; pointer-events: none; font: 12px Georgia, serif; color: #d6c8a5; }
      body.has-party #heroCalls { display: flex; }
      #heroCalls span { padding: 2px 7px; background: rgba(8,6,4,.62); border: 1px solid rgba(140,115,68,.45); border-radius: 3px; }
      #heroCalls span b { color: #c9a35c; margin-right: 4px; font-weight: 400; }
      #heroCalls span.on { color: #fff4da; border-color: #f1d68a; box-shadow: 0 0 8px rgba(241,214,138,.5); }
      body.touch #heroVit { display: none !important; }
      body.touch #heroBar { bottom: auto; top: 10px; }
    `;
    document.head.appendChild(css);
    const mk = (id) => { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); return d; };
    this.barEl = mk('heroBar'); this.vitEl = mk('heroVit'); this.chainEl = mk('heroChain'); this.targetEl = mk('heroTarget'); this.markEl = mk('heroMark'); this.callsEl = mk('heroCalls');
    this.vitEl.innerHTML = '<div class="who"></div><div class="bar"><i></i></div>';
    this.targetEl.innerHTML = '<div class="n"></div><div class="bar"><i></i></div>';
    this.callsEl.innerHTML = CALLS.map((k) => `<span data-c="${k}"><b>${CALL_TEXT[k][0]}</b>${CALL_TEXT[k][1]}</span>`).join('');
    // (On a phone they're buttons, under the party's frames and over the stick's layer: src/ui/hud.css, PARTY in thumbs.js.
    // A tap is the call, and goes no further, so it never takes up the stick.)
    for (const s of this.callsEl.children) {
      const press = (e) => { e.preventDefault(); e.stopPropagation(); if (this.input.enabled && !this.input.menu) { s.classList.add('down'); this.call(s.dataset.c); } };
      const up = () => s.classList.remove('down');
      s.addEventListener('touchstart', press, { passive: false });
      s.addEventListener('mousedown', press);
      for (const t of ['touchend', 'touchcancel', 'mouseup', 'mouseleave']) s.addEventListener(t, up);
    }
  }

  // The ▶ on a party frame.
  button(el, m) {
    const b = document.createElement('button');
    b.className = 'pf-play';
    b.title = `Play as ${m.name}`;
    b.textContent = '▶';
    const go = (e) => { e.preventDefault(); e.stopPropagation(); if (this.slot === m.slot) this.release(); else this.take(m.slot); };
    b.addEventListener('click', go);
    b.addEventListener('touchstart', go, { passive: false });
    el.appendChild(b);
    m.playBtn = b;
    if (m.slot === this.slot) el.classList.add('played');
  }

  take(slot) {
    const m = this.party.member(slot);
    if (!m) return;
    this.sim.postMessage({ type: 'heroPlay', op: 'take', slot });
    this.sim.postMessage({ type: 'heroPlay', op: 'auto', on: !!this.autoplay?.on });
  }

  release() { this.sim.postMessage({ type: 'heroPlay', op: 'release' }); }

  held(on) {
    if (this.heldOn === on) return;
    this.heldOn = on;
    this.sim.postMessage({ type: 'heroPlay', op: 'held', on });
  }

  // On a phone, the calls sit just under the party's frames, however many there are (and wherever Move Buttons put them).
  placeCalls() {
    const f = this.party.frames?.getBoundingClientRect();
    if (!f || !f.height) return;
    const at = `${Math.round(f.left)},${Math.round(f.bottom)},${innerHeight}`;
    if (at === this.callsAt) return;
    this.callsAt = at;
    this.callsEl.style.left = `${Math.round(f.left)}px`;
    this.callsEl.style.top = `${Math.round(f.bottom + 6)}px`;
    // (The chat's lines, under them, grow up only so far as the calls, or the quest tracker under those (src/ui/tracker.js
    // capChat, by the same rule): the oldest go out of sight at the top.)
    const chat = document.getElementById('heroChat');
    if (chat) {
      const c = this.callsEl.getBoundingClientRect(), bottom = innerHeight - (parseFloat(getComputedStyle(chat).bottom) || 0);
      const t = document.getElementById('qTrack')?.getBoundingClientRect(), over = t?.height && t.top >= c.top ? t.bottom + 2 : 0;
      chat.style.maxHeight = `${Math.max(40, Math.round(bottom - Math.max(c.bottom, over) - 4))}px`;
    }
  }

  call(kind) {
    if (!this.party.members.length) return;
    this.sim.postMessage({ type: 'heroPlay', op: 'call', kind });
    this.chatLog?.line?.('party', this.playerName?.() || 'You', CALL_SAY[kind]);
  }

  // What the sim says back (src/sim/heroplay.js say).
  onMessage(m) {
    const M = this.party.member(m.slot);
    if (m.what === 'taken' && M) {
      this.slot = m.slot;
      this.cls = M.cls; this.name = M.name; this.level = M.level;
      document.body.classList.add('hero-play');
      // (Always from behind them, a little further back than your own: you're seeing a body, not your hands.)
      if (this.viewSwitch) { this.viewSwitch.forced = true; if (this.viewSwitch.zoom < 4.5) this.viewSwitch.zoom = 4.5; this.viewSwitch.draw(); }
      this.markFrames();
      this.hud?.tip(`You are ${M.name}, level ${M.level} ${CLASSES[M.cls].title}. ${this.input.touch ? 'The bar\'s moves at the top; tap the ▶ again to come back.' : `Left button: ${LEFT[M.cls]}. Right: ${RIGHT(M.cls)}. 1–0 their moves, Space a chained move (or evade), Q evade. ▶ again to come back.`}`, 7);
    } else if (m.what === 'released') {
      this.slot = -1; this.simBar = this.barDrawn = null; this.simLevel = 0;
      this.releasedAt = performance.now();   // (a frame or two still says you're them: not taken again from those)
      document.body.classList.remove('hero-play');
      if (this.viewSwitch) { this.viewSwitch.forced = false; this.viewSwitch.draw(); }
      this.markFrames();
      this.held(false);
      this.hud?.tip('Back in your own skin.', 2.5);
    } else if (m.what === 'bar') { this.simBar = m.bar; this.simLevel = m.level; }
    else if (m.what === 'refused') this.hud?.tip(M && M.dead !== undefined ? `${M.name} can't be taken just now.` : 'Not just now.', 2.5);
    else if (m.what === 'noTarget') this.hud?.tip('Nothing under the crosshair to leash.', 1.6);
    else if (m.what === 'tooFar') this.hud?.tip('Too far to leash.', 1.6);
  }

  markFrames() {
    for (const f of this.party.frameEls || []) {
      f.el.classList.toggle('played', f.m.slot === this.slot);
      if (f.m.playBtn) { f.m.playBtn.textContent = f.m.slot === this.slot ? '◀' : '▶'; f.m.playBtn.title = f.m.slot === this.slot ? 'Back to yourself' : `Play as ${f.m.name}`; }
    }
  }

  key(e) {
    if (e.repeat || !this.input.enabled || this.input.menu || e.ctrlKey || e.metaKey || e.altKey) return;
    const call = CALL_KEY[e.code];
    if (call && this.party.members.length) { e.preventDefault(); this.call(call); return; }
    if (this.slot < 0) return;
    const d = e.code.startsWith('Digit') ? e.code.slice(5) : e.code.startsWith('Numpad') ? e.code.slice(6) : null;
    const i = d === null ? -1 : KEYS.indexOf(d);
    if (i >= 0 && !e.shiftKey) {
      // (Theirs, not your spells': the spell bar never hears it. src/ui/spellbar.js.)
      e.preventDefault(); e.stopImmediatePropagation();
      this.sim.postMessage({ type: 'heroPlay', op: 'skill', i });
    }
  }

  drawBar(cls) {
    const col = TINT[cls] || '#e9dfc8';
    const slot = (k, key, label, extra = '') => `<div class="hs ${extra}" data-i="${k}" title="${esc(label)}">${key ? svgOf(picOf(key, cls), col) : ''}<div class="cd"></div><div class="cs"></div><kbd>${k === 'L' ? 'LMB' : k === 'R' ? 'RMB' : k === 'S' ? 'SPACE' : KEYS[k]}</kbd></div>`;
    const blowPic = { lancer: 'lance', paladin: 'hammer', archer: 'arrow', rogue: 'blade', ninja: 'star', dragoon: 'lance', boomerang: 'rang', bard: 'note' }[cls];
    const right = RIGHT(cls) === 'Block' ? 'shield' : RIGHT(cls) === 'Charged Shot' ? 'arrow' : 'blade';
    this.barEl.innerHTML = `<div class="grp">${slot('L', 'x', LEFT[cls] + ' (hold to keep on)', 'mouse').replace(/<svg[\s\S]*?<\/svg>/, svgOf(blowPic, col))}${slot('R', 'x', RIGHT(cls), 'mouse').replace(/<svg[\s\S]*?<\/svg>/, svgOf(right, col))}</div>`
      + `<div class="grp">${Array.from({ length: BAR_SLOTS }, (_, i) => this.bar[i] ? slot(i, this.bar[i], `${moveName(cls, this.bar[i])}${chainOf(cls, this.bar[i], this.bar) ? ` — chains into ${moveName(cls, chainOf(cls, this.bar[i], this.bar))}` : ''}`) : slot(i, null, '', 'empty')).join('')}</div>`
      + `<div class="grp">${slot('S', 'dash', 'Evade, or the chained move when one is offered', 'space')}</div>`;
    this.slotEls = [...this.barEl.querySelectorAll('.hs')].map((el) => ({ el, i: el.dataset.i, cd: el.querySelector('.cd'), cs: el.querySelector('.cs'), last: '' }));
    // (A tap on a slot is its key, on a phone or with Tab's free mouse.)
    for (const s of this.slotEls) {
      const i = +s.i;
      if (Number.isNaN(i)) continue;
      const fire = (e) => { e.preventDefault(); e.stopPropagation(); this.sim.postMessage({ type: 'heroPlay', op: 'skill', i }); };
      s.el.addEventListener('mousedown', fire);
      s.el.addEventListener('touchstart', fire, { passive: false });
    }
    this.spaceEl = this.slotEls.find((s) => s.i === 'S');
    this.rightEl = this.slotEls.find((s) => s.i === 'R');
  }

  // Each frame.
  update(dt, snap) {
    if (!snap) return;
    const o = H.PLAY, who = (snap[o] | 0) - 1;
    document.body.classList.toggle('has-party', this.party.members.length > 0);
    if (this.input.touch && this.party.members.length) this.placeCalls();
    // Auto-play on or off, told as it changes.
    const auto = !!this.autoplay?.on;
    if (auto !== this.autoSent && who >= 0) { this.autoSent = auto; this.sim.postMessage({ type: 'heroPlay', op: 'auto', on: auto }); }
    if (who < 0) this.autoSent = undefined;
    // The calls lit while they hold.
    const callOn = CALLS[(snap[o + 6] | 0) - 1] || '';
    if (callOn !== this.callShown) { this.callShown = callOn; for (const s of this.callsEl.children) s.classList.toggle('on', s.dataset.c === callOn); }
    if (who >= 0 && this.slot !== who && performance.now() - (this.releasedAt || -1e9) < 500) return;
    if (who < 0) { if (this.slot >= 0) this.onMessage({ what: 'released', slot: this.slot }); this.markEl.style.display = 'none'; this.targetEl.style.display = 'none'; this.chainEl.style.display = 'none'; return; }
    const M = this.party.member(who);
    if (!M) return;
    if (this.slot !== who) this.onMessage({ what: 'taken', slot: who });
    // The bar: theirs, as the sim has it (sent as it changes: src/sim/heroplay.js sendBar).
    if (this.simBar && (this.simBar !== this.barDrawn || this.cls !== M.cls || !this.slotEls)) { this.bar = this.simBar; this.barDrawn = this.simBar; this.cls = M.cls; this.drawBar(M.cls); }
    // Their life, and who they are.
    const hp = Math.max(0, Math.min(1, snap[o + 19]));
    const whoTxt = `${M.name}<em>Level ${this.simLevel || M.level} ${CLASSES[M.cls].title}${auto ? ' · auto' : ''}</em>`;
    if (whoTxt !== this.whoTxt) { this.whoTxt = whoTxt; this.vitEl.firstChild.innerHTML = whoTxt; }
    this.vitEl.querySelector('i').style.width = `${Math.round(hp * 1000) / 10}%`;
    // The waits, sweeping round; the chained move lit; the board up.
    const chainI = (snap[o + 2] | 0) - 1, chainT = snap[o + 3];
    for (const s of this.slotEls) {
      let left = 0, total = 1, chain = false;
      if (s.i === 'S') { left = snap[o + 5]; total = 1; chain = chainI >= 0; }
      else if (s.i !== 'L' && s.i !== 'R') { const k = +s.i, key = this.bar[k]; if (key) { left = snap[o + 8 + k]; total = cdOf(M.cls, key); chain = chainI === k; } }
      const frac = s.i === 'S' ? left : Math.min(1, left / total);
      const txt = s.i !== 'S' && left > 0.05 ? (left >= 10 ? Math.round(left) : left.toFixed(left < 3 ? 1 : 0)) : '';
      const st = `${Math.round(frac * 60)}|${txt}|${chain}`;
      if (st === s.last) continue;
      s.last = st;
      s.cd.style.setProperty('--a', `${frac * 360}deg`);
      s.cs.textContent = txt;
      s.el.classList.toggle('chain', chain);
    }
    this.rightEl?.el.classList.toggle('on', snap[o + 4] > 0.5);
    // The chain's prompt, in the middle (TERA's Space).
    if (chainI >= 0 && chainT > 0) {
      const key = chainI >= 100 ? MOVE_KEYS[snap[o + 18] | 0] || 'shield_counter' : this.bar[chainI];
      const fromBar = chainI < 100;
      const name = key ? moveName(M.cls, chainI >= 100 && !MOVE_KEYS[snap[o + 18] | 0] ? 'shield_counter' : key) : '';
      const html = `<kbd>SPACE</kbd>${svgOf(picOf(key || 'shield_counter', M.cls), '#ffe7a8')}<span>${esc(name)}</span>${fromBar ? `<kbd>${KEYS[chainI]}</kbd>` : ''}<i class="t"></i>`;
      if (html !== this.chainHtml) { this.chainHtml = html; this.chainEl.innerHTML = html; this.chainT = this.chainEl.querySelector('.t'); }
      this.chainEl.style.display = 'flex';
      this.chainT.style.width = `${Math.round(chainT * 100)}%`;
    } else { this.chainEl.style.display = 'none'; this.chainHtml = ''; }
    // What the crosshair's on: its name and life at the top, and a mark over its head.
    const ti = snap[o + 1] | 0;
    if (ti >= 0) {
      const co = CHARS_START + ti * C_SIZE;
      const life = (snap[co + C.HP] || 0) / (snap[co + C.MAX_HP] || 1);
      const name = this.foeName?.(ti, snap) || 'Foe';
      if (name !== this.tName) { this.tName = name; this.targetEl.firstChild.textContent = name; }
      this.targetEl.querySelector('i').style.width = `${Math.max(0, Math.min(100, life * 100))}%`;
      // (Not over a boss's own bar: the party's frame has it there.)
      this.targetEl.style.display = this.party.boss ? 'none' : 'block';
      this.placeMark(snap, co);
    } else { this.targetEl.style.display = 'none'; this.markEl.style.display = 'none'; }
  }

  // The mark over its head, on the screen (as the party's bubble over a god's: src/ui/party.js placeGod).
  placeMark(snap, co) {
    const m = this.renderer?.frameData, el = this.markEl;
    if (!m) { el.style.display = 'none'; return; }
    const hx = snap[co + C.HEAD_X], hy = snap[co + C.HEAD_Y], hz = snap[co + C.HEAD_Z];
    const wx = hx || snap[co + C.X], wz = hz || snap[co + C.Z], wy = (hy || snap[co + C.Y] + 1.8) + 0.55;
    const cx = m[0] * wx + m[4] * wy + m[8] * wz + m[12], cy = m[1] * wx + m[5] * wy + m[9] * wz + m[13], cw = m[3] * wx + m[7] * wy + m[11] * wz + m[15];
    if (cw < 0.1) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.transform = `translate(${(cx / cw * 0.5 + 0.5) * innerWidth}px, ${(0.5 - cy / cw * 0.5) * innerHeight}px)`;
  }
}

export { MOB_KEYS };
