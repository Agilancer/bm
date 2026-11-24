// The title screen, from Bellmourn's (src/fps/title.js there). Two cards first, Blastorama Gaming and then
// Jamie Herrington, each fading in with glints flaring on the edges of its letters, a sheen across them, gold dust
// rising and a tinkle of little glass bells for every glint; then Bellmourn's logo with its church bells ringing
// out and trailing away under the title's song, over black while the game loads behind it; then the menu (New
// Game, Continue, Load, Test Dungeon, Settings, How to Play). No village behind it: the title stays on black.
//
// Here too: the Settings and How to Play windows, the save slots and the "are you sure" box (the pause screen
// opens them as well), the settings themselves, and the "click to begin" a browser asks for before it plays sound.
//
// The cards, glints and fades are CSS animations of opacity and transform, all set going at one moment, and every
// sound is booked on the audio clock at that moment, so they keep time however hard the loading holds the thread.

import { SLOT_COUNT, saves } from './saves.js';
import { isMobileDevice } from './gfx/gpu.js';
import { slim } from './audio.js';
import { AI_PARTS, KEYS, SPEC, TABS } from './ui/settings-spec.js';
import { icon } from './ui/icons.js';
import { CLOSE_X } from './ui/menu-x.js';

const LOGOS = {
  blastorama: 'assets/title/blastorama.webp',
  herrington: 'assets/title/herrington.webp',
  bellmourn: 'assets/title/bellmourn.webp',
};
// (absolute: the logos are used as masks from title.css too, which would read them from src/)
for (const k in LOGOS) LOGOS[k] = new URL(LOGOS[k], document.baseURI).href;
const BELLS_URL = 'assets/title/title_bells.mp3';
const SONG_URL = 'assets/title/title_frozen_hearts.mp3';
const SONG_LEVEL = 0.62;
const CARDS = [['blastorama', 1], ['herrington', 3]];   // the cards in turn (and the note each one's tinkles start from)
const CARD = 5.2, GAP = 0.45, CUT = 0.3;
const CARD_GLINTS = [0.85, 1.4, 1.95, 2.55, 3.1];
const SHINE_AT = 1.0, MAIN_IN = 1.9, MAIN_GLINTS = [1.25, 2.05];
const BELLS = { vol: 0.85, hold: 4.2, trail: 10.5, down: 42 };
const ZONES = [[0, 0.2], [0.8, 1], [0.24, 0.5], [0.5, 0.76], [0.02, 0.3], [0.7, 0.98]];
const SCALE = [1318.5, 1480, 1661.2, 1975.5, 2217.5, 2637, 2960];   // E major pentatonic, E6 .. F#7
const TING = [[1, 1, 1.5], [2.0, 0.38, 0.75], [3.0, 0.16, 0.45], [4.2, 0.1, 0.28], [5.4, 0.05, 0.18]];
const MENU = [['new', 'New Game'], ['continue', 'Continue'], ['load', 'Load'], ['test', 'Test Dungeon'], ['settings', 'Settings'], ['howto', 'How to Play']];
const MODS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn']);
const TOUCH = /Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { console.warn('storage', e); return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* no storage */ } },
};

// ---- settings ------------------------------------------------------------------------------------------------------

const SETTINGS_KEY = 'velscour.settings';
// keep: whether the game's files are kept on this device (coi-sw.js), asked once before the title ('ask' until then).
export const settings = { volume: 0.8, music: 0.7, ambience: 0.8, look: 1, res: 'auto', gfx: 'auto', perf: 'off', tags: 'full', bubbles: 'on', chatlog: 'on', heroes: 'auto', keep: 'ask', autohide: 'off', autohideMap: 'on', autohideChat: 'on', autocam: 'director', autoStyle: 'cinematic', autoFocus: 'best', autoread: 'on', autotell: 'on', phobosAwe: 'on', ticker: 1, background: 'run', bgSound: 'on', tracker: 'on' };
// What auto-play sees to by itself (src/ui/autobrain.js allow()): each 'on' or 'off'. Off, it's left for you to do. The list,
// with the words for each, is src/ui/settings-spec.js AI_PARTS.
export { AI_PARTS };
for (const [k] of AI_PARTS) settings[k] = 'on';
// As the game came: what Reset puts back, and what a setting is marked as changed from.
export const DEFAULTS = Object.freeze({ ...settings });
try { Object.assign(settings, JSON.parse(store.get(SETTINGS_KEY) || '{}')); } catch { /* defaults */ }
export const saveSettings = () => store.set(SETTINGS_KEY, JSON.stringify(settings));

// Digits that read as digits (src/ui/menus.css BmNum). Where Georgia has lining figures of its own (Windows' does: the
// lining-nums asked for all over the game picks them), they're its weight and width, so BmNum's borrowed ones are let go;
// where it hasn't (its 0 an o), BmNum stays. Told apart by measure: the two sets of figures aren't the same width.
try {
  const s = document.createElement('span');
  s.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font:700 40px Georgia';
  s.textContent = '0123456789';
  document.body.append(s);
  s.style.setProperty('font-variant-numeric', 'oldstyle-nums', 'important');
  const old = s.getBoundingClientRect().width;
  s.style.setProperty('font-variant-numeric', 'lining-nums', 'important');
  const lining = s.getBoundingClientRect().width;
  s.remove();
  if (Math.abs(old - lining) > 0.5) {
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (let i = rules.length - 1; i >= 0; i--) if (rules[i] instanceof CSSFontFaceRule && /BmNum/.test(rules[i].style.getPropertyValue('font-family'))) sheet.deleteRule(i);
    }
    document.documentElement.classList.add('own-lining');
  }
} catch { /* BmNum stays */ }

const when = (t) => {
  const d = new Date(t);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};
// How long ago, in words: "just now", "12 min ago", "3 h ago", "yesterday", or the date.
const ago = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 172800) return 'yesterday';
  return when(t);
};
const playedWords = (sec) => { const m = Math.floor((sec || 0) / 60), h = Math.floor(m / 60); return h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ic = (name, fall = name) => `<span class="m-ic" data-ic="${name}">${icon(fall)}</span>`;

// ---- the windows' contents (src/ui/menus.css) ---------------------------------------------------------------------

const SPECK = Object.fromEntries(SPEC.map((s) => [s.k, s]));
const fmtOf = (s, v) => (s.fmt === 'pct' ? `${Math.round(v * 100)}%` : s.fmt === 'x' ? `×${Number(v).toFixed(1)}` : String(v));
// A setting's value in words, as its control shows it.
const wordsOf = (s, v) => (s.kind === 'range' ? fmtOf(s, v) : s.kind === 'toggle' ? (v === 'on' ? s.on : s.off)
  : s.opts.find(([o]) => String(o) === String(v))?.[1] ?? (v === 'ask' ? 'Not asked yet' : String(v)));
const changed = (k) => k !== 'keep' && String(settings[k]) !== String(DEFAULTS[k]);

// A key, or keys, as keycaps: "W A S D" four of them, "Shift + wheel" two with a plus between.
const cap = (t) => `<em class="m-key">${t}</em>`;
const caps = (k) => (k.includes(' + ') ? k.split(' + ').map(cap).join('<i>+</i>')
  : k.split(/\s+/).every((t) => t.length <= 2) ? k.split(/\s+/).map((t) => (t === '–' ? '<i>–</i>' : cap(t))).join('') : cap(k));

function control(s) {
  if (s.kind === 'range') return `<div class="m-slide"><input class="m-range" type="range" data-k="${s.k}" min="${s.min}" max="${s.max}" step="${s.step}" aria-label="${s.label}"><output></output></div>`;
  if (s.kind === 'seg') return `<div class="m-seg" role="radiogroup" aria-label="${s.label}" data-k="${s.k}">${s.opts.map(([v, w]) => `<button type="button" role="radio" data-v="${v}">${w}</button>`).join('')}</div>`;
  if (s.kind === 'select') return `<select class="m-sel" data-k="${s.k}" aria-label="${s.label}">${s.opts.map(([v, w]) => `<option value="${v}">${w}</option>`).join('')}</select>`;
  return `<button type="button" class="m-tog" role="switch" data-k="${s.k}" aria-label="${s.label}"><i></i><span></span></button>`;
}

// On a phone: the thumbs and the buttons. [icon, heading, words]
const TOUCH_TIPS = [
  ['dodge', 'Moving', 'The <b>left thumb</b> moves: push it right out to run, or press <b>run</b> to keep running. The <b>right thumb</b> looks, on or off the buttons.'],
  ['staff', 'Your staff', 'The big button fires your <b>staff</b>. Round it: <b>dodge</b>, <b>jump</b> (hold it to ride your shield) and <b>guard</b> with your shield.'],
  ['cast', 'Spells', 'Your spells stand in rings round those: one to six, seven to nine further out, and outermost the three <b>Utility</b> slots. Tap one to cast it; hold it to keep casting.'],
  ['take', 'Take, talk, open', 'When something is in reach a gold button comes up beside them: <b>take</b>, <b>talk</b> or <b>open</b>.'],
  ['menu', 'Along the top', 'The <b>menu</b> (save, load, settings), your <b>pack</b>, your <b>spellbook</b>, your <b>quest log</b> and the view. Tap the <b>map</b> in the corner for the big one.'],
  ['pack', 'The pack', 'Tap to lift and set down, double tap to put on or stow, tap outside to drop. <b>Move Buttons</b> on the menu puts any button where your thumbs want it.'],
];
const TIPS = [
  ['quest', 'Quests', 'A yellow <b>!</b> over someone\'s head means they have work for you: talk to them to take it on. The <b>quest log</b> keeps it all. Follow a quest\'s trail, track it under the map, or abandon it, and whoever gave it offers it again.'],
  ['cast', 'Staff and spells', 'Your staff fires where you aim. Spells go on the bar: learn more in the <b>spellbook</b> with the points each level brings, and set them where you like.'],
  ['guard', 'Your shield', 'Guard with your shield to take a blow. Hold jump to <b>ride</b> it: fast over the ground, and away from a fight.'],
  ['pack', 'Gear', 'What you find goes in the <b>pack</b>. Put on what\'s better, set gems in its sockets, and sell the rest in Bellmourn\'s shops.'],
  ['home', 'Getting home', 'The <b>beacon stone</b> takes you home to Bellmourn, your party with you. A night at the Tolling Bell mends you, and keeps the game.'],
  ['save', 'Saving', 'The game keeps itself as you play: <b>Continue</b> picks up where you were. Pause to keep a copy in one of ten save slots.'],
  ['resume', 'Auto-play', '<b>Auto-play</b> plays for you: quests, fights, levels. Settings, Auto-play says what it sees to by itself and what it leaves to you.'],
  ['centre', 'Test Dungeon', 'On the title, <b>Test Dungeon</b> is a white hall for trying out the monsters, with any gear and a party for nothing. Nothing of it is kept.'],
];
const tip = ([i, h, p]) => `<div class="m-tip"><h4>${ic(i)}${h}</h4><p>${p}</p></div>`;

// A tab's settings, under the headings they're grouped by; the Controls tab ends with the keys (or, on a phone, the thumbs).
function rows(tab) {
  let g = null, out = '';
  for (const s of SPEC.filter((x) => x.tab === tab)) {
    if (s.group && s.group !== g) { g = s.group; out += `<div class="m-group">${s.group}</div>`; }
    out += `<div class="m-row" data-row="${s.k}"><div class="m-lab"><span>${s.label}</span>${s.restart ? '<em class="m-tag warn">Restart</em>' : ''}</div>${control(s)}<div class="m-rhelp">${s.help}</div></div>`;
  }
  if (tab === 'controls') {
    out += TOUCH ? `<div class="m-group">On a phone</div><div class="m-tips">${TOUCH_TIPS.map(tip).join('')}</div>`
      : `<div class="m-group">Keys</div><div class="m-keylist">${KEYS.map(([k, v]) => `<span class="m-caps">${caps(k)}</span><span>${v}</span>`).join('')}</div>`;
  }
  return out;
}

const SETTINGS = `<div class="m-head">${ic('settings')}<h2>Settings</h2><span class="m-sub">Kept as you change them</span><div class="m-end">${CLOSE_X}</div></div>
  <div class="m-body">
    <nav class="m-rail m-scroll" role="tablist">${TABS.map(([k, w, d]) => `<button type="button" role="tab" data-tab="${k}">${w}<i class="m-dot" hidden title="Changed from how the game came"></i></button>`).join('')}</nav>
    <div class="m-pane m-scroll">${TABS.map(([t, w, d]) => `<section data-pane="${t}" hidden><h3>${w}</h3><p class="m-lede">${d}</p>${rows(t)}</section>`).join('')}</div>
    <aside class="m-help"><h4></h4><p></p><p class="m-now"></p></aside>
  </div>
  <div class="m-foot"><div class="m-hints"><span>${cap('↑')}${cap('↓')} Move</span><span>${cap('Esc')} Close</span></div>
    <span class="m-restart" hidden><span></span><button type="button" class="m-btn pri" data-restart>Restart now</button></span>
    <span class="m-gap"></span><button type="button" class="m-btn" data-reset="tab">Reset tab</button><button type="button" class="m-btn danger" data-reset="all">Reset all</button><button type="button" class="m-btn pri" data-close>Done</button></div>`;

const HOWTO = `<div class="m-head">${ic('howto')}<h2>How to Play</h2>
    <div class="m-tabs" role="tablist"><button type="button" role="tab" class="on" data-ht="controls">${TOUCH ? 'Touch' : 'Controls'}</button><button type="button" role="tab" data-ht="tips">Tips</button></div><div class="m-end">${CLOSE_X}</div></div>
  <div class="m-body"><div class="m-pane m-scroll">
    <section data-hp="controls">${TOUCH ? `<div class="m-tips">${TOUCH_TIPS.map(tip).join('')}</div>` : `<div class="m-keys">${KEYS.map(([k, v]) => `<div><span>${caps(k)}</span><span>${v}</span></div>`).join('')}</div>`}</section>
    <section data-hp="tips" hidden><div class="m-tips">${TIPS.map(tip).join('')}</div></section>
  </div></div>
  <div class="m-foot"><div class="m-hints"><span>${cap('Esc')} Close</span></div><span class="m-gap"></span><button type="button" class="m-btn pri" data-close>Done</button></div>`;

const DIALOG = `<h2></h2><p class="t-name" hidden></p><div class="t-rule"></div><p class="t-msg"></p>
  <div class="t-dbtns"><button type="button" class="m-btn" data-v="no"><span></span></button><button type="button" class="m-btn pri" data-v="yes"><span></span></button></div>`;

/** A four-pointed star of light, drawn once, for the glints. */
function starSprite(n = 160) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d'), h = n / 2;
  g.globalCompositeOperation = 'lighter';
  const glow = g.createRadialGradient(h, h, 0, h, h, h * 0.55);
  glow.addColorStop(0, 'rgba(255,236,190,0.85)'); glow.addColorStop(0.22, 'rgba(255,205,110,0.3)'); glow.addColorStop(1, 'rgba(255,190,80,0)');
  g.fillStyle = glow; g.fillRect(0, 0, n, n);
  const ray = (ang, len, w, a) => {
    g.save(); g.translate(h, h); g.rotate(ang);
    const gr = g.createLinearGradient(-len, 0, len, 0);
    gr.addColorStop(0, 'rgba(255,225,150,0)'); gr.addColorStop(0.5, `rgba(255,253,240,${a})`); gr.addColorStop(1, 'rgba(255,225,150,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.closePath(); g.fill();
    g.restore();
  };
  ray(0, h, n * 0.03, 1); ray(Math.PI / 2, h, n * 0.03, 1);
  ray(Math.PI / 4, h * 0.42, n * 0.02, 0.6); ray(-Math.PI / 4, h * 0.42, n * 0.02, 0.6);
  const core = g.createRadialGradient(h, h, 0, h, h, n * 0.08);
  core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = core; g.fillRect(0, 0, n, n);
  return c.toDataURL();
}

/** The upper edges of a logo's letters (where a gilded edge catches the light), as fractions of it. */
function edgesOf(img) {
  const w = 360, h = Math.max(1, Math.round(w * (img.naturalHeight || 1) / (img.naturalWidth || 1)));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  let d;
  try { g.drawImage(img, 0, 0, w, h); d = g.getImageData(0, 0, w, h).data; } catch { return []; }
  const pts = [];
  for (let y = 3; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 200 && d[((y - 3) * w + x) * 4 + 3] < 30) pts.push([x / w, y / h]);
  return pts;
}

/** A room's echo: a couple of seconds of decaying noise, a little different in each ear. */
function impulse(c, secs, decay) {
  const n = Math.round(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * Math.min(1, i / (c.sampleRate * 0.012));
  }
  return b;
}

/** Where a recording's sound begins (past its leading silence), in seconds. */
function onset(b) {
  const d = b.getChannelData(0), n = Math.min(d.length, Math.round(b.sampleRate * 0.25));
  for (let i = 0; i < n; i++) if (Math.abs(d[i]) > 0.0025) return Math.max(0, i - b.sampleRate * 0.004) / b.sampleRate;
  return 0;
}

export class Title {
  constructor() {
    this.mode = 'off';            // off | boot | gate | splash | main | hidden
    this.isReady = false; this.logoIn = false; this.menuOn = false;
    this.state = () => ({});
    this.onMenu = null;           // (action): new, continue, load
    this.onSetting = null;        // (key, value): the game applies a setting
    this.edges = {};
    this.initAudio();
    this.build();
  }

  // ------------------------------------------------------------------ sound: one context for the title and the game
  initAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC({ latencyHint: 'interactive' });
    this.out = c.createGain();                 // the Volume setting: everything goes through here
    this.out.gain.value = settings.volume;
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -3; lim.ratio.value = 12;
    this.out.connect(lim); lim.connect(c.destination);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = settings.music;
    this.musicBus.connect(this.out);
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  /** Inside a click or a key: let the sound play. */
  unlock() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }

  async decode(url) {
    if (!this.ctx) return null;
    // (One channel on a phone, src/audio.js slim: the song decoded is tens of MB, held while the game loads under it.)
    try { const r = await fetch(url); return slim(this.ctx, await this.ctx.decodeAudioData(await r.arrayBuffer())); } catch (e) { console.warn('title audio', url, e); return null; }
  }

  // ------------------------------------------------------------------ the screen
  build() {
    const R = this.root = document.getElementById('title');
    R.classList.toggle('is-touch', TOUCH);
    R.style.setProperty('--t-star', `url(${starSprite()})`);
    this.screen = R.appendChild(el('div', 't-screen gone'));
    this.screen.append(el('div', 't-veil'));
    this.cover = this.screen.appendChild(el('div', 't-cover'));
    this.cards = el('div', 't-cards');
    this.main = el('div', 't-main', `
      <div class="t-logo t-mainlogo"><img alt="Bellmourn" src="${LOGOS.bellmourn}" draggable="false">
        <div class="t-shine" style="--m:url(${LOGOS.bellmourn})"><i></i></div><div class="t-glints"></div><div class="t-motes"></div></div>
      <div class="t-under"><div class="t-status"><span></span><div class="t-bar"><i></i></div><em class="t-file"></em></div><nav class="t-menu"></nav></div>`);
    this.mainLogo = this.main.querySelector('.t-mainlogo');
    this.statusEl = this.main.querySelector('.t-status');
    this.menuEl = this.main.querySelector('.t-menu');
    MENU.forEach(([a, label], i) => {
      const b = el('button', 't-btn', `<span>${label}</span>`);
      b.dataset.a = a; b.style.setProperty('--i', i);
      b.onclick = (e) => { e.stopPropagation(); this.chime(); this.act(a, b); };
      this.menuEl.append(b);
    });
    this.gate = el('div', 't-gate', `<b>${TOUCH ? 'Tap' : 'Click'} to begin</b>`);
    this.skipEl = el('div', 't-skip', TOUCH ? 'Tap to skip' : 'Click or press a key to skip');
    this.screen.append(this.cards, this.main, this.gate, this.skipEl);
    this.screen.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'splash' || e.button > 0) return;
      e.preventDefault();
      this.next();
    });
    const motes = this.mainLogo.querySelector('.t-motes');
    for (let i = 0; i < 16; i++) motes.append(this.mote(rnd(0.02, 0.98), rnd(-0.1, 1.15), rnd(0, 7), true));

    // the windows over everything: settings, how to play, the save slots, the confirm box (src/ui/menus.css)
    this.modal = R.appendChild(el('div', 't-modal'));
    this.scrim = el('div', 't-scrim');
    this.settings = el('div', 't-frame m-win m-settings', SETTINGS);
    this.howto = el('div', 't-frame m-win m-howto', HOWTO);
    this.slotsEl = el('div', 't-frame m-win m-saves');
    this.dialog = el('div', 't-frame t-dialog', DIALOG);
    for (const f of [this.settings, this.howto, this.slotsEl, this.dialog]) { f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); }
    this.frames = [this.settings, this.howto, this.slotsEl];
    this.modal.append(this.scrim, ...this.frames, this.dialog);
    for (const f of [this.settings, this.howto]) for (const b of f.querySelectorAll('[data-close], .menu-x')) b.onclick = () => { this.chime(); this.frame(f, false); };
    for (const b of this.dialog.querySelectorAll('[data-v]')) b.onclick = () => { this.chime(); this.answer?.(b.dataset.v === 'yes'); };
    for (const b of this.howto.querySelectorAll('[data-ht]')) b.onclick = () => {
      this.tick();
      for (const o of this.howto.querySelectorAll('[data-ht]')) { o.classList.toggle('on', o === b); o.setAttribute('aria-selected', o === b); }
      for (const p of this.howto.querySelectorAll('[data-hp]')) p.hidden = p.dataset.hp !== b.dataset.ht;
      this.howto.querySelector('.m-pane').scrollTop = 0;
    };
    this.scrim.onclick = () => this.closeTop();
    new MutationObserver(() => this.scrim.classList.toggle('on', !!this.top())).observe(this.modal, { subtree: true, attributes: true, attributeFilter: ['class'] });
    const HOVER = '.t-btn, .m-btn, .m-rail button, .m-tabs button';
    R.addEventListener('pointerover', (e) => { const b = e.target.closest?.(HOVER); if (b && b !== this.hovered && !b.disabled) { this.hovered = b; this.tick(); } });
    R.addEventListener('pointerout', (e) => { if (this.hovered && e.target.closest?.(HOVER) === this.hovered && !this.hovered.contains(e.relatedTarget)) this.hovered = null; });
    addEventListener('keydown', (e) => this.key(e), true);
    this.buildSettings();
  }

  // ------------------------------------------------------------------ the settings window
  // Built from src/ui/settings-spec.js: a tab down the left for each part of the game, its settings on the right (sliders with
  // what they're at, two or three choices side by side, a list for more, a switch for on and off), and beside them what the one
  // pointed at does. A setting changed from how the game came is marked, on its row and on its tab. Each is kept as it's changed
  // and handed to the game (onSetting); the two that wait on a restart say so, with Restart now at the foot.
  buildSettings() {
    const S = this.settings;
    // (What the game started with: the restart settings are only waiting while they differ from it.)
    this.started = Object.fromEntries(SPEC.filter((s) => s.restart).map((s) => [s.k, settings[s.k]]));
    for (const s of SPEC) {
      const c = S.querySelector(`[data-k="${s.k}"]`);
      if (s.kind === 'range') {
        c.addEventListener('input', () => this.setVal(s.k, Number(c.value)));
        c.addEventListener('change', () => this.tick(1.6));
      } else if (s.kind === 'seg') {
        for (const b of c.querySelectorAll('button')) b.onclick = () => { this.tick(); this.setVal(s.k, b.dataset.v); };
      } else if (s.kind === 'select') {
        c.addEventListener('change', () => { this.tick(); this.setVal(s.k, c.value); });
      } else {
        c.onclick = () => { this.tick(); this.setVal(s.k, settings[s.k] === 'on' ? 'off' : 'on'); };
      }
      const row = c.closest('.m-row');
      row.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') this.helpFor(s.k); });
      row.addEventListener('focusin', () => this.helpFor(s.k));
      row.addEventListener('pointerdown', () => this.helpFor(s.k), { passive: true });
      this.syncRow(s.k);
    }
    for (const b of S.querySelectorAll('[data-tab]')) b.onclick = () => { this.tick(); this.setTab(b.dataset.tab); };
    S.querySelector('[data-reset=tab]').onclick = async () => {
      this.chime();
      const [t, w] = TABS.find(([k]) => k === this.tab), list = SPEC.filter((s) => s.tab === t && changed(s.k));
      if (!list.length) { this.toast(`${w}: as the game came already`); return; }
      if (await this.confirm({ title: `Reset ${w}?`, text: `Every ${w} setting goes back to how the game came.`, yes: 'Reset', no: 'Keep them' })) this.resetTo(list);
    };
    S.querySelector('[data-reset=all]').onclick = async () => {
      this.chime();
      const list = SPEC.filter((s) => changed(s.k));
      if (!list.length) { this.toast('Every setting is as the game came'); return; }
      if (await this.confirm({ title: 'Reset all settings?', text: `${list.length === 1 ? 'The one setting you changed goes' : list.length === 2 ? 'Both settings you changed go' : `The ${list.length} settings you changed go`} back to how the game came. Whether the game's files are kept on this device stays as it is.`, yes: 'Reset all', no: 'Keep them', danger: true })) this.resetTo(list);
    };
    S.querySelector('[data-restart]').onclick = () => { this.chime(); if (this.onRestart) this.onRestart(); else this.reload(); };
    this.setTab('audio');
  }

  /** A setting changed from its window: kept, its control shown as it now is, and handed to the game. */
  setVal(k, v) {
    settings[k] = v;
    saveSettings();
    if (k === 'volume' && this.out) this.out.gain.setTargetAtTime(settings.volume, this.ctx.currentTime, 0.03);
    if (k === 'music' && this.musicBus) this.musicBus.gain.setTargetAtTime(settings.music, this.ctx.currentTime, 0.05);
    this.syncRow(k);
    this.onSetting?.(k, v);
  }

  resetTo(list) {
    for (const s of list) this.setVal(s.k, DEFAULTS[s.k]);
    this.toast(list.length === 1 ? `${list[0].label}: as the game came` : 'Settings reset');
  }

  setTab(t) {
    const S = this.settings;
    this.tab = t;
    for (const b of S.querySelectorAll('[data-tab]')) { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }
    // (The focus goes with the pick, so one tab never looks picked while another is.)
    if (S.querySelector('.m-rail').contains(document.activeElement)) S.querySelector(`[data-tab="${t}"]`).focus({ preventScroll: true });
    for (const p of S.querySelectorAll('[data-pane]')) p.hidden = p.dataset.pane !== t;
    S.querySelector('.m-pane').scrollTop = 0;
    this.helpFor(SPEC.find((s) => s.tab === t)?.k, true);
  }

  /** Beside the settings: what the one pointed at (or picked) does, what it's at, and how the game came. quiet: not marked. */
  helpFor(k, quiet = false) {
    const S = this.settings, s = SPECK[k];
    if (!s) return;
    for (const r of S.querySelectorAll('.m-row.on')) r.classList.remove('on');
    if (!quiet) S.querySelector(`[data-row="${k}"]`)?.classList.add('on');
    this.helpK = k;
    const H = S.querySelector('.m-help'), v = settings[k];
    H.querySelector('h4').textContent = s.label;
    H.querySelector('p').textContent = s.help;
    H.querySelector('.m-now').innerHTML = `Now: <b>${esc(wordsOf(s, v))}</b>${changed(k) ? `<br><i class="m-dot"></i> Changed. As the game came: <b>${esc(wordsOf(s, DEFAULTS[k]))}</b>` : ''}${s.restart ? '<br><em class="m-tag warn">Restart</em> Takes hold when the game starts again.' : ''}`;
  }

  /** A setting's control as the setting is now, its row and tab marked if it's changed, and the restart word at the foot. */
  syncRow(k) {
    const S = this.settings, s = SPECK[k], c = S.querySelector(`[data-k="${k}"]`), v = settings[k];
    if (!s || !c) return;
    if (s.kind === 'range') {
      c.value = String(v);
      c.style.setProperty('--v', `${(((Number(v) - s.min) / (s.max - s.min)) * 100).toFixed(1)}%`);
      c.nextElementSibling.textContent = fmtOf(s, Number(v));
    } else if (s.kind === 'seg') {
      // (The files' choice is 'ask' till it's been asked, and they aren't kept till then.)
      const shown = k === 'keep' && v !== 'yes' ? 'no' : String(v);
      for (const b of c.querySelectorAll('button')) { const on = b.dataset.v === shown; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }
    } else if (s.kind === 'select') c.value = String(v);
    else { const on = v === 'on'; c.classList.toggle('on', on); c.setAttribute('aria-checked', on); c.querySelector('span').textContent = on ? s.on : s.off; }
    c.closest('.m-row').classList.toggle('changed', changed(k));
    for (const [t] of TABS) S.querySelector(`[data-tab="${t}"] .m-dot`).hidden = !SPEC.some((x) => x.tab === t && changed(x.k));
    const wait = SPEC.filter((x) => x.restart && String(settings[x.k]) !== String(this.started?.[x.k] ?? settings[x.k]));
    const R = S.querySelector('.m-restart');
    R.hidden = !wait.length;
    R.querySelector('span').textContent = wait.length ? `${wait.map((x) => x.label).join(' and ')}: on a restart` : '';
    if (this.helpK === k) this.helpFor(k, !S.querySelector('.m-row.on'));
  }

  mote(x, y, delay, loop = false) {
    const m = el('s', loop ? 't-mote loop' : 't-mote');
    m.style.cssText = `left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%;animation-delay:${delay.toFixed(2)}s;--dx:${rnd(-14, 14).toFixed(0)}px;--dy:${rnd(-70, -30).toFixed(0)}px;--z:${rnd(0.6, 1.3).toFixed(2)}`;
    return m;
  }

  glint(x, y, delay, s = 1) {
    const g = el('i', 't-glint');
    g.style.cssText = `left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;animation-delay:${delay.toFixed(3)}s;--s:${s.toFixed(2)}`;
    return g;
  }

  /** A spot on a logo's edges within the zone [x0, x1], not too near one already taken. */
  spot(name, [x0, x1], taken) {
    const pts = (this.edges[name] || []).filter(([x]) => x >= x0 && x <= x1);
    for (let k = 0; k < 24 && pts.length; k++) {
      const p = pts[Math.floor(Math.random() * pts.length)];
      if (taken.every(([x, y]) => Math.hypot((x - p[0]) * 4, y - p[1]) > 0.35)) { taken.push(p); return p; }
    }
    const p = pts.length ? pts[Math.floor(Math.random() * pts.length)] : [rnd(x0, x1), rnd(0.25, 0.6)];
    taken.push(p);
    return p;
  }

  // ------------------------------------------------------------------ the start
  /** Up from black: the pictures and sounds in hand, then (after a click if the browser wants one) the cards. */
  async start() {
    if (this.mode !== 'off') return;
    this.mode = 'boot';
    let skip = false;
    try { skip = sessionStorage.getItem('velscour.skipSplash') === '1'; sessionStorage.removeItem('velscour.skipSplash'); } catch { /* no storage */ }
    document.body.classList.add('title-up');
    this.screen.classList.remove('gone');
    const imgs = Object.entries(LOGOS).map(([k, src]) => { const i = new Image(); i.src = src; return [k, i]; });
    const song = this.decode(SONG_URL).then((b) => { this.songBuf = b; if (b && this.mainAt != null && !this.song) this.bookSong(Math.max(this.mainAt, this.ctx.currentTime)); });
    const bells = this.decode(BELLS_URL).then((b) => { this.bellsBuf = b; });
    await Promise.race([Promise.all([...imgs.map(([, i]) => i.decode().catch(() => {})), bells]), wait(15000)]);
    void song;
    for (const [k, i] of imgs) this.edges[k] = edgesOf(i);
    const c = this.ctx;
    if (c && c.state !== 'running') await Promise.race([new Promise((r) => c.addEventListener('statechange', r, { once: true })), wait(250)]);
    if (this.mode !== 'boot') return;
    if (skip || !c || c.state === 'running') { this.run(skip); return; }
    // A browser plays no sound till it's been clicked. (A click, not a press: on a phone only the lifted finger counts.)
    this.mode = 'gate';
    this.gate.classList.add('on');
    const go = (e) => {
      if (this.mode !== 'gate' || (e.type === 'keydown' && MODS.has(e.key))) return;
      e.preventDefault?.();
      this.gate.removeEventListener('click', go);
      if (TOUCH) document.documentElement.requestFullscreen?.()?.then(() => screen.orientation?.lock?.('landscape'))?.catch(() => {});
      this.gate.classList.remove('on');
      this.mode = 'boot';
      Promise.race([c.resume(), wait(400)]).catch(() => {}).then(() => this.run(false));
    };
    this.gate.addEventListener('click', go);
    this.gateKey = go;
  }

  run(skip) {
    if (this.mode === 'hidden') return;
    this.mode = skip ? 'main' : 'splash';
    if (!skip) { this.skipEl.classList.add('on'); this.splash(0, 0); return; }
    const c = this.audio();
    this.bus = this.newBus();
    this.beginMain(0, c ? c.currentTime + 0.08 : 0);
  }

  /** The cards from the `from`th on, the first `at` seconds from now, then Bellmourn's logo. */
  splash(from, at) {
    const c = this.audio(), lead = 0.08, at0 = c ? c.currentTime + lead : 0;
    this.bus = this.newBus();
    this.cardFrom = from;
    this.t0 = performance.now() + (lead + at) * 1000;
    this.cardEls = CARDS.slice(from).map(([name, note], k) => this.card(name, at + k * (CARD + GAP), at0, note));
    this.cards.append(...this.cardEls);
    const main = at + this.cardEls.length * (CARD + GAP);
    clearTimeout(this.splashT);
    this.splashT = setTimeout(() => this.skip(true), main * 1000);
    this.beginMain(main, at0);
  }

  /** A click, a tap or a key while the cards are up: the one showing fades out and the next comes up. */
  next() {
    if (this.mode !== 'splash') return;
    const into = (performance.now() - this.t0) / 1000;
    if (into < 0) return;
    const k = Math.min(this.cardEls.length - 1, Math.floor(into / (CARD + GAP))), n = this.cardFrom + k + 1;
    if (n >= CARDS.length) { this.skip(); return; }
    this.fadeCards();
    this.hush(0.08);
    this.splash(n, CUT);
  }

  fadeCards() {
    for (const c of this.cardEls || []) {
      const s = getComputedStyle(c), o = s.opacity, t = s.transform;
      c.style.animation = 'none'; c.style.opacity = o; c.style.transform = t;
      void c.offsetWidth;
      c.style.transition = `opacity ${CUT}s ease-out`; c.style.opacity = '0';
      setTimeout(() => c.remove(), CUT * 1000 + 120);
    }
    this.cardEls = [];
  }

  /** One card: its logo fading in and out at `at` seconds, its glints and their tinkles. */
  card(name, at, at0, from) {
    const src = LOGOS[name], c = el('div', 't-card');
    c.style.animationDelay = `${at}s`;
    c.innerHTML = `<div class="t-logo"><img src="${src}" alt="" draggable="false"><div class="t-shine" style="--m:url(${src})"><i style="animation-delay:${at + SHINE_AT}s"></i></div><div class="t-glints"></div><div class="t-motes"></div></div>`;
    const glints = c.querySelector('.t-glints'), motes = c.querySelector('.t-motes'), taken = [];
    let note = from;
    CARD_GLINTS.forEach((d, i) => {
      const [x, y] = this.spot(name, ZONES[i % ZONES.length], taken), t = at + d + rnd(-0.08, 0.08);
      glints.append(this.glint(x, y, t, rnd(0.75, 1.2)));
      if (this.bus) this.tinkle(this.bus, at0 + t + 0.07, note, (x - 0.5) * 1.3, 1);
      note = Math.max(0, Math.min(SCALE.length - 3, note + [-2, -1, 1, 2][Math.floor(Math.random() * 4)]));
    });
    for (let i = 0; i < 14; i++) motes.append(this.mote(rnd(0, 1), rnd(-0.15, 1.1), at + rnd(0.5, 3.4)));
    return c;
  }

  /** Bellmourn's logo coming up `at` seconds on: its bells, the song, then a couple of tinkles. */
  beginMain(at, at0) {
    const L = this.mainLogo, taken = [], shine = L.querySelector('.t-shine i');
    for (const e of [L, this.statusEl, shine]) e.style.animation = 'none';
    void L.offsetWidth;
    L.style.animation = `t-main ${MAIN_IN}s cubic-bezier(.25,.6,.3,1) ${at}s both`;
    this.statusEl.style.animation = `t-fade 1.2s ease ${at + 1.2}s both`;
    shine.style.animation = `t-shine 1.7s ease-in-out ${at + 0.9}s both`;
    const glints = L.querySelector('.t-glints');
    glints.querySelectorAll('.t-glint').forEach((g) => g.remove());
    if (this.bus) this.ring(this.bus, at0 + at + 0.05);
    this.mainAt = at0 + at;
    if (this.ctx) this.bookSong(this.mainAt);
    MAIN_GLINTS.forEach((d, i) => {
      const [x, y] = this.spot('bellmourn', ZONES[i], taken);
      glints.append(this.glint(x, y, at + d, 1.15));
      if (this.bus) this.tinkle(this.bus, at0 + at + d + 0.07, [2, 4][i], (x - 0.5) * 1.3, 0.9);
    });
    clearTimeout(this.inT);
    this.inT = setTimeout(() => { this.logoIn = true; this.maybeMenu(); }, (at + MAIN_IN * 0.75) * 1000);
  }

  /** Past the cards (their end, or the last cut short): on to Bellmourn's logo. */
  skip(ended = false) {
    if (this.mode !== 'splash') return;
    this.mode = 'main';
    clearTimeout(this.splashT);
    this.skipEl.classList.remove('on');
    if (ended) { for (const c of this.cardEls || []) c.remove(); this.cardEls = []; return; }
    this.fadeCards();
    this.hush(0.08);
    const c = this.audio();
    this.bus = this.newBus();
    this.beginMain(CUT, c ? c.currentTime : 0);
  }

  hush(tc = 0.06) {
    const old = this.bus, c = this.audio();
    this.bus = null;
    if (old && c) { old.gain.setTargetAtTime(0, c.currentTime, tc); setTimeout(() => old.disconnect(), 600); }
    this.stopBells();
  }

  // ------------------------------------------------------------------ what the game tells it
  /** The game is loaded: the menu comes up once the logo is in. state() -> {continue, load}. */
  ready(state) {
    if (state) this.state = state;
    this.isReady = true;
    this.status('');
    this.maybeMenu();
  }

  maybeMenu() {
    if (!this.isReady || !this.logoIn || this.mode !== 'main' || this.menuOn) return;
    this.menuOn = true;
    this.refresh();
    this.main.classList.add('menu-on');
    this.idle();
  }

  refresh() {
    const s = this.state() || {};
    for (const b of this.menuEl.children) {
      const a = b.dataset.a;
      b.disabled = a === 'continue' ? !s.continue : a === 'load' ? !s.load : false;
    }
  }

  /** How far the load is, and the file coming down (src/main.js). */
  progress(pct, file = '') { this.status(`Loading… ${pct}%`, pct, file); }

  status(text, pct = null, file = '') {
    this.statusEl.querySelector('span').textContent = text;
    this.statusEl.querySelector('.t-file').textContent = file;
    this.statusEl.classList.toggle('has-bar', pct != null);
    if (pct != null) this.statusEl.querySelector('.t-bar i').style.transform = `scaleX(${Math.max(0, Math.min(1, pct / 100))})`;
  }

  /** The title away (the game's begun). */
  hide(now = false) {
    if (this.mode === 'hidden' || this.mode === 'off') return;
    if (this.mode === 'splash') { this.skip(true); this.hush(); }
    this.stopBells(1.5);
    this.stopSong(2);
    // A phone lets go of the song and the bells once they've faded (decoded, about 45 MB the game would hold for nothing);
    // toMenu decodes the song again.
    if (isMobileDevice()) { clearTimeout(this.dropT); this.dropT = setTimeout(() => { if (this.mode === 'hidden') this.songBuf = this.bellsBuf = null; }, 3000); }
    this.mode = 'hidden';
    clearTimeout(this.idleT); clearTimeout(this.inT); clearTimeout(this.splashT);
    this.gate.classList.remove('on'); this.skipEl.classList.remove('on');
    document.body.classList.remove('title-up');
    this.screen.classList.add('out');
    clearTimeout(this.goneT);
    this.goneT = setTimeout(() => this.screen.classList.add('gone'), now ? 0 : 900);
  }

  /** Back to the menu from the game (the pause screen's Main Menu): the logo and the menu over black, the song again. */
  toMenu() {
    clearTimeout(this.goneT);
    document.body.classList.add('title-up');
    this.screen.classList.remove('gone');
    void this.screen.offsetWidth;
    this.screen.classList.remove('out');
    this.mode = 'main';
    for (const e of [this.mainLogo, this.statusEl]) { e.style.animation = 'none'; e.style.opacity = '1'; }
    this.menuOn = false;
    this.logoIn = true;
    const c = this.audio();
    if (c && this.songBuf) this.bookSong(c.currentTime + 0.3, 2.5);
    else if (c) this.decode(SONG_URL).then((b) => { this.songBuf = b; if (b && this.mode === 'main' && !this.song) this.bookSong(c.currentTime + 0.1, 2.5); });
    this.maybeMenu();
  }

  get up() { return this.mode !== 'hidden' && this.mode !== 'off'; }

  /** Restart the game (a setting the GPU is set up with), straight to the logo this time. */
  reload() {
    try { sessionStorage.setItem('velscour.skipSplash', '1'); } catch { /* no storage */ }
    location.reload();
  }

  idle() {
    clearTimeout(this.idleT);
    this.idleT = setTimeout(() => {
      if (!this.menuOn || this.mode !== 'main') return;
      const [x, y] = this.spot('bellmourn', [0, 1], []);
      const g = this.glint(x, y, 0, rnd(0.7, 1.05));
      this.mainLogo.querySelector('.t-glints').append(g);
      setTimeout(() => g.remove(), 1400);
      this.idle();
    }, rnd(2800, 6500));
  }

  // ------------------------------------------------------------------ the menu and the windows
  act(a, from) {
    if (a === 'settings' || a === 'howto') this.panel(a, from);
    else this.onMenu?.(a);
  }

  panel(which, from = null) {
    const f = which === 'settings' ? this.settings : this.howto;
    for (const o of this.frames) if (o !== f) this.frame(o, false);
    // (Shown as the settings are now: the game sets one or two itself, Game files the first time it's asked.)
    if (f === this.settings) for (const s of SPEC) this.syncRow(s.k);
    this.opener = from || document.activeElement;
    this.frame(f, true);
  }

  frame(f, on) {
    f.classList.toggle('open', on);
    if (on) {
      f.scrollTop = 0;
      f.querySelector('.m-rail button.on, .m-card :is(button, [tabindex]):not(:disabled), .m-tabs button.on, .m-btn.pri:not(:disabled), select, input, .t-btn:not(:disabled)')?.focus({ preventScroll: true });
    } else if (this.opener?.isConnected) { this.opener.focus({ preventScroll: true }); this.opener = null; }
  }

  /**
   * The "are you sure" box: resolves true (yes) or false. o: {title, name, tone, text, yes, no, danger}: name, what it's about
   * (a quest, a save), under the question in plain letters, coloured tone; danger, yes is drawn red. The window under it dims.
   */
  confirm(o) {
    this.answer?.(false);
    const D = this.dialog, yes = D.querySelector('[data-v=yes]'), no = D.querySelector('[data-v=no]');
    // (Its digits in plain letters: Cinzel's 1 reads as an I.)
    D.querySelector('h2').innerHTML = esc(o.title).replace(/\d+/g, '<i class="m-n">$&</i>');
    const nm = D.querySelector('.t-name');
    nm.hidden = !o.name; nm.textContent = o.name || ''; nm.style.color = o.tone || '';
    D.querySelector('.t-msg').textContent = o.text;
    yes.querySelector('span').textContent = o.yes || 'Yes';
    no.querySelector('span').textContent = o.no || 'Go Back';
    no.style.display = o.no === false ? 'none' : '';
    yes.classList.toggle('danger', !!o.danger);
    yes.classList.toggle('pri', !o.danger);
    const opener = document.activeElement;
    return new Promise((res) => {
      this.answer = (v) => {
        this.answer = null;
        D.classList.remove('open');
        this.modal.classList.remove('asking');
        if (opener?.isConnected && !v) opener.focus({ preventScroll: true });
        res(v);
      };
      this.modal.classList.add('asking');
      D.classList.add('open');
      (o.no === false ? yes : no).focus({ preventScroll: true });
    });
  }

  /** The save slots. mode: save | load. o: { canSave, inGame, snapshot() -> Promise<data|null>, restore(data), onClose() } */
  slots(mode, o) {
    this.slotO = o; this.slotMode = mode === 'save' && !o.canSave ? 'load' : mode;
    for (const f of this.frames) if (f !== this.slotsEl) this.frame(f, false);
    this.renderSlots();
    this.frame(this.slotsEl, true);
  }

  closeSlots() { this.frame(this.slotsEl, false); this.slotO?.onClose?.(); }

  // A save, in a line: who, their level and where ("Aldric, level 12, in the Rustwood"); an old one, its summary.
  saveName(d) {
    const c = d?.card;
    if (c?.level) return `${c.name || 'Tessariel'}, level ${c.level}${c.where ? `, ${c.where}` : ''}`;
    return Array.isArray(d?.summary) && d.summary.length ? d.summary.join(', ') : 'A saved game';
  }

  // Each save as a card: a picture of where it was made, who, their level, where, the quest followed, when and how long played.
  // Save: a new save first (into the first empty slot), then the saves, the newest first, to overwrite. Load: the game as it was
  // last played (Autosave: what Continue picks up), big, then the saves, the newest first; a tap anywhere on one loads it.
  renderSlots() {
    const E = this.slotsEl, o = this.slotO, save = this.slotMode === 'save';
    const slot = []; let used = 0, free = 0;
    for (let i = 1; i <= SLOT_COUNT; i++) { const d = saves.read(i); slot[i] = d; if (d) used++; else free ||= i; }
    const auto = save ? null : saves.auto();
    const list = [...Array(SLOT_COUNT).keys()].map((k) => k + 1).filter((i) => slot[i]).sort((x, y) => slot[y].at - slot[x].at);
    const card = (key, d) => {
      const c = d.card || {}, thumb = typeof c.thumb === 'string' && c.thumb.startsWith('data:image/') ? c.thumb : '';
      const sum = Array.isArray(d.summary) ? d.summary : [], big = key === 'auto';
      const playedW = c.played != null ? `${playedWords(c.played)} played` : sum.find((t) => /played/.test(t)) || '';
      const badge = big ? '<span class="m-tag ready m-badge">Autosave</span>' : `<span class="m-tag m-badge">Slot <i class="m-n">${key}</i></span>`;
      return `<div class="m-card${big ? ' auto' : ''}${save ? '' : ' tap'}" data-slot="${key}">
        <div class="m-thumb${thumb ? '' : ' none'}"${thumb ? ` style="background-image:url('${thumb}')"` : ''}>${thumb ? '' : ic('save')}${badge}</div>
        <div class="m-info"><div class="m-who"><span>${esc(c.name || 'Tessariel')}</span>${c.level ? `<em>Level <i class="m-n">${c.level}</i></em>` : ''}</div>
          <div class="m-where">${esc(c.where || sum[0] || 'Bellmourn')}</div>
          ${c.quest ? `<div class="m-quest">${esc(c.quest)}</div>` : ''}
          <div class="m-when" title="${esc(when(d.at))}">${esc(ago(d.at))}${playedW ? ` · ${esc(playedW)}` : ''}</div></div>
        <div class="m-acts">${save ? '<button type="button" class="m-btn" data-save>Overwrite</button>' : `<button type="button" class="m-btn pri" data-load>${big ? 'Continue' : 'Load'}</button>`}</div>
        ${big ? '' : `<button type="button" class="m-del" data-del aria-label="Delete slot ${key}">Delete</button>`}</div>`;
    };
    let cards = '';
    if (save) {
      const left = SLOT_COUNT - used;
      // (The very first save: the one thing in the window, big and in the middle of it.)
      cards += free ? `<button type="button" class="m-card empty${list.length ? '' : ' first'}" data-slot="${free}" data-new${o.canSave ? '' : ' disabled'}><span class="m-new"><b>+</b><span>${list.length ? 'New save' : 'Save your game'}<small>${list.length ? `Into slot <i class="m-n">${free}</i>: ${left === 1 ? 'the last one empty' : `${left} of ${SLOT_COUNT} are empty`}` : `Into slot <i class="m-n">1</i> of ${SLOT_COUNT}. Saves are kept on this device.`}</small></span></span></button>`
        : `<div class="m-card empty full"><span class="m-new"><b>!</b><span>All ${SLOT_COUNT} slots are full<small>Overwrite one, or delete one to make room</small></span></span></div>`;
      if (list.length) cards += `<div class="m-section">Saved games</div>${list.map((i) => card(i, slot[i])).join('')}`;
    } else {
      if (auto) cards += `<div class="m-section">Last played</div>${card('auto', auto)}`;
      if (list.length) cards += `<div class="m-section">Saved games</div>${list.map((i) => card(i, slot[i])).join('')}`;
      if (!auto && !list.length) cards = `<div class="m-empty" style="grid-column:1/-1">${ic('load')}<span>No saved games yet. Pause the game and choose Save Game to keep one.</span></div>`;
    }
    E.innerHTML = `<div class="m-head">${ic(save ? 'save' : 'load')}<h2>${save ? 'Save Game' : 'Load Game'}</h2>
        <div class="m-tabs" role="tablist">${[['save', 'Save'], ['load', 'Load']].map(([m, w]) => `<button type="button" role="tab" data-m="${m}" class="${m === this.slotMode ? 'on' : ''}" aria-selected="${m === this.slotMode}"${m === 'save' && !o.canSave ? ' disabled title="Only while you\'re playing, on your feet"' : ''}>${w}</button>`).join('')}</div>
        <div class="m-end"><span class="m-store">${used} of ${SLOT_COUNT} slots used</span>${CLOSE_X}</div></div>
      <div class="m-body"><div class="m-cards m-scroll">${cards}</div></div>
      <div class="m-foot"><span class="m-store">${save ? 'A save keeps where you stand, what you carry, your quests and the time played.' : 'Loading takes you back to where that save was made.'}</span><span class="m-gap"></span><button type="button" class="m-btn pri" data-close>Done</button></div>`;
    const read = (b) => { const k = b.closest('[data-slot]').dataset.slot; return { k, d: k === 'auto' ? auto : slot[+k] }; };
    const name = (k) => (k === 'auto' ? 'the autosave' : `slot ${k}`);
    for (const b of E.querySelectorAll('[data-close], .menu-x')) b.onclick = () => { this.chime(); this.closeSlots(); };
    for (const b of E.querySelectorAll('[data-m]')) b.onclick = () => { this.tick(); this.slotMode = b.dataset.m; this.renderSlots(); E.querySelector('.m-tabs button.on')?.focus({ preventScroll: true }); };
    for (const b of E.querySelectorAll('[data-new]')) b.onclick = () => { this.chime(); this.saveTo(+b.dataset.slot); };
    for (const b of E.querySelectorAll('[data-save]')) b.onclick = async () => {
      this.chime();
      const { k, d } = read(b);
      if (await this.confirm({ title: `Overwrite ${name(k)}?`, name: this.saveName(d), text: `Saved ${ago(d.at)}. It will be replaced by your game as it is now, and that can't be undone.`, yes: 'Overwrite', no: 'Keep it', danger: true })) this.saveTo(+k);
    };
    for (const b of E.querySelectorAll('[data-load]')) b.onclick = async () => {
      this.chime();
      const { k, d } = read(b);
      if (o.inGame && !(await this.confirm({ title: `Load ${name(k)}?`, name: this.saveName(d), text: `Saved ${ago(d.at)}. Anything since then that isn't saved in a slot is lost.`, yes: 'Load', no: 'Go Back' }))) return;
      this.frame(this.slotsEl, false);
      o.restore(d);
    };
    // (Loading: a tap anywhere on a save but its Delete loads it.)
    for (const c of E.querySelectorAll('.m-card.tap')) c.onclick = (e) => { if (!e.target.closest('button')) c.querySelector('[data-load]')?.click(); };
    for (const b of E.querySelectorAll('[data-del]')) b.onclick = async () => {
      this.chime();
      const { k, d } = read(b);
      if (!(await this.confirm({ title: `Delete ${name(k)}?`, name: this.saveName(d), text: `Saved ${ago(d.at)}. Once it's deleted, it's gone for good.`, yes: 'Delete', no: 'Keep it', danger: true }))) return;
      saves.clear(+k);
      this.toast(`Slot ${k} deleted`);
      this.renderSlots(); this.refresh();
      E.querySelector('.m-tabs button.on')?.focus({ preventScroll: true });
    };
  }

  async saveTo(i) {
    const data = await this.slotO.snapshot();
    if (!data) this.toast('Nothing to save right now');
    else this.toast(saves.write(i, data) ? `Saved in slot ${i}` : 'Could not save: the browser refused the space');
    this.renderSlots(); this.refresh();
    this.slotsEl.querySelector(`[data-slot="${i}"] [data-save], [data-slot="${i}"]`)?.focus({ preventScroll: true });
  }

  toast(text) {
    let t = this.toastEl;
    if (!t) { t = this.toastEl = el('div', 't-toast'); this.root.append(t); }
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('on'), 2200);
  }

  top() {
    if (this.dialog.classList.contains('open')) return this.dialog;
    return this.frames.find((f) => f.classList.contains('open')) || null;
  }

  closeTop() {
    const f = this.top();
    if (!f) return false;
    if (f === this.dialog) this.answer?.(false);
    else if (f === this.slotsEl) this.closeSlots();
    else this.frame(f, false);
    return true;
  }

  /** Keys: any brings on the next card; Esc shuts the top window; the arrows walk the buttons. */
  key(e) {
    if (this.mode === 'gate') { this.gateKey?.(e); e.stopPropagation(); return; }
    if (this.mode === 'splash') {
      if (!MODS.has(e.key)) { e.preventDefault(); if (!e.repeat) this.next(); }
      e.stopPropagation();
      return;
    }
    const f = this.top(), menu = this.menuOn && this.mode === 'main' ? this.menuEl : null;
    if (!f && !menu) return;
    if (e.code === 'Escape' && f) { e.stopPropagation(); e.preventDefault(); this.closeTop(); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && !(e.target.matches?.('select, input') && f)) {
      const list = [...(f || menu).querySelectorAll('.t-btn, button, select, input')].filter((b) => !b.disabled && b.offsetParent);
      if (list.length) {
        const i = list.indexOf(document.activeElement), d = e.code === 'ArrowUp' || e.code === 'ArrowLeft' ? -1 : 1;
        list[i < 0 ? (d > 0 ? 0 : list.length - 1) : (i + d + list.length) % list.length].focus();
        this.tick();
        e.preventDefault();
      }
      e.stopPropagation();
      return;
    }
    // The game's own keys don't hear what the menus use.
    e.stopPropagation();
  }

  // ------------------------------------------------------------------ the sounds
  audio() { const c = this.ctx; return c && c.state === 'running' ? c : null; }

  newBus() {
    const c = this.audio();
    if (!c) return null;
    if (!this.verb) {
      this.verb = c.createConvolver();
      this.verb.buffer = impulse(c, 2.8, 2.6);
      const wet = c.createGain();
      wet.gain.value = 0.42;
      this.verb.connect(wet); wet.connect(this.out);
    }
    const g = c.createGain();
    g.connect(this.out); g.connect(this.verb);
    return g;
  }

  bell(bus, when, f, gain, pan = 0, len = 1, partials = TING) {
    const c = bus.context;
    let to = bus;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(bus); to = p; }
    for (const [r, a, d] of partials) {
      if (f * r > c.sampleRate * 0.45) continue;   // (above what this output can play)
      const o = c.createOscillator(), e = c.createGain(), end = when + d * len;
      o.frequency.value = f * r * (1 + (Math.random() - 0.5) * 0.004);
      e.gain.setValueAtTime(0.0001, when);
      e.gain.exponentialRampToValueAtTime(gain * a, when + 0.004);
      e.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(e); e.connect(to);
      o.start(when); o.stop(end + 0.05);
    }
  }

  tinkle(bus, when, i, pan = 0, vol = 1) {
    const n = (k) => SCALE[Math.min(SCALE.length - 1, k)];
    this.bell(bus, when, n(i), 0.11 * vol, pan, 1);
    this.bell(bus, when + rnd(0.06, 0.085), n(i + 2), 0.05 * vol, pan * 0.8, 0.8);
    this.bell(bus, when + rnd(0.13, 0.17), n(i + 4) * (i + 4 >= SCALE.length ? 1.5 : 1), 0.025 * vol, pan * 0.6, 0.6);
    const c = bus.context, s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; hp.type = 'highpass'; hp.frequency.value = 7000;
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.02 * vol, when + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    s.connect(hp); hp.connect(g); g.connect(bus);
    s.start(when, Math.random() * 0.5); s.stop(when + 0.35);
  }

  /** Bellmourn's bells (a recording, "Orthodox Church Bells Ringing", Free Sounds Library, CC BY 4.0) as its logo
   * comes up at `when`: ringing out a few seconds, then trailing away, farther and farther off. */
  ring(bus, when) {
    this.stopBells(0);
    const b = this.bellsBuf;
    if (!b) return;
    const c = bus.context, { vol, hold, trail, down } = BELLS, fall = when + hold, end = fall + trail;
    const src = c.createBufferSource(), lp = c.createBiquadFilter(), env = c.createGain(), cut = c.createGain();
    src.buffer = b;
    const curve = new Float32Array(64);
    for (let i = 0; i < 64; i++) curve[i] = vol * Math.pow(10, -down * Math.pow(i / 63, 1.6) / 20);
    curve[63] = 0;
    env.gain.setValueAtTime(vol, when);
    env.gain.setValueCurveAtTime(curve, fall, trail);
    const top = Math.min(18000, c.sampleRate * 0.45);
    lp.type = 'lowpass'; lp.frequency.value = top;
    lp.frequency.setValueAtTime(top, fall);
    lp.frequency.exponentialRampToValueAtTime(1200, end);
    src.connect(lp); lp.connect(env); env.connect(cut); cut.connect(this.out);
    src.start(when, onset(b)); src.stop(end + 0.05);
    const p = this.peal = { src, cut };
    src.onended = () => { cut.disconnect(); if (this.peal === p) this.peal = null; };
  }

  stopBells(fade = 0.08) {
    const p = this.peal, c = this.ctx;
    this.peal = null;
    if (!p || !c) return;
    p.cut.gain.setTargetAtTime(0, c.currentTime, Math.max(0.01, fade / 3));
    try { p.src.stop(c.currentTime + fade + 0.05); } catch { /* done */ }
  }

  /** The title's song ("Frozen Hearts"), round and round from `when`, faded in over `fadeIn` s. */
  bookSong(when, fadeIn = 0) {
    const c = this.ctx;
    if (!c || !this.songBuf) return;
    this.stopSong(0.05);
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = this.songBuf; src.loop = true;
    const t = Math.max(when, c.currentTime);
    g.gain.setValueAtTime(fadeIn ? 0 : SONG_LEVEL, t);
    if (fadeIn) g.gain.linearRampToValueAtTime(SONG_LEVEL, t + fadeIn);
    src.connect(g); g.connect(this.musicBus);
    src.start(t);
    this.song = { src, g };
  }

  stopSong(fade = 2) {
    const S = this.song, c = this.ctx;
    this.song = null;
    if (!S || !c) return;
    const n = c.currentTime, g = S.g.gain;
    g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(0, n + fade);
    try { S.src.stop(n + fade + 0.05); } catch { /* never started */ }
    S.src.onended = () => S.g.disconnect();
  }

  tick(k = 1) {
    const c = this.audio();
    if (!c) return;
    this.ui ||= this.newBus();
    if (this.ui) this.bell(this.ui, c.currentTime + 0.005, 3520 * k * rnd(0.98, 1.02), 0.022, 0, 0.16);
  }

  chime() {
    this.unlock();
    const c = this.audio();
    if (!c) return;
    this.ui ||= this.newBus();
    if (this.ui) this.tinkle(this.ui, c.currentTime + 0.005, 1 + Math.floor(Math.random() * 3), 0, 0.5);
  }
}
