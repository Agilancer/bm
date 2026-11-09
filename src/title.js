// The title screen, from Bellmourn's (src/fps/title.js there). Two cards first, Blastorama Gaming and then
// Jamie Herrington, each fading in with glints flaring on the edges of its letters, a sheen across them, gold dust
// rising and a tinkle of little glass bells for every glint; then Bellmourn's logo with its church bells ringing
// out and trailing away under the title's song, over black while the game loads behind it; then the menu (New
// Game, Continue, Load, Settings, How to Play). No village behind it: the title stays on black.
//
// Here too: the Settings and How to Play windows, the save slots and the "are you sure" box (the pause screen
// opens them as well), the settings themselves, and the "click to begin" a browser asks for before it plays sound.
//
// The cards, glints and fades are CSS animations of opacity and transform, all set going at one moment, and every
// sound is booked on the audio clock at that moment, so they keep time however hard the loading holds the thread.

import { SLOT_COUNT, saves } from './saves.js';
import { isMobileDevice } from './gfx/gpu.js';

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
const MENU = [['new', 'New Game'], ['continue', 'Continue'], ['load', 'Load'], ['settings', 'Settings'], ['howto', 'How to Play']];
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
export const settings = { volume: 0.8, music: 0.7, ambience: 0.8, look: 1, res: 'auto', gfx: 'auto', perf: 'off', tags: 'full', bubbles: 'on', chatlog: 'on', heroes: 'auto' };
try { Object.assign(settings, JSON.parse(store.get(SETTINGS_KEY) || '{}')); } catch { /* defaults */ }
// A phone's Graphics stops at Low (initGPU holds it there too): High and Ultra crash a phone.
const PHONE = isMobileDevice();
if (PHONE && settings.gfx !== 'auto' && settings.gfx !== 'mobile') settings.gfx = 'mobile';

const when = (t) => {
  const d = new Date(t);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};
const describe = (s) => (Array.isArray(s) ? s.join(' · ') : '');

// ---- the windows' contents ---------------------------------------------------------------------------------------

const SETTINGS = `
  <h2>Settings</h2><div class="t-rule"></div>
  <div class="t-set">
    <label><span>Volume</span><input data-k="volume" type="range" min="0" max="1" step="0.05"></label>
    <label><span>Music</span><input data-k="music" type="range" min="0" max="1" step="0.05"></label>
    <label><span>Ambience</span><input data-k="ambience" type="range" min="0" max="1" step="0.05"></label>
    <label><span>Look speed</span><input data-k="look" type="range" min="0.4" max="2.5" step="0.1"></label>
    <label><span>Resolution</span><select data-k="res"><option value="auto">Auto (holds the frame rate)</option><option value="1">Full</option><option value="0.75">75%</option><option value="0.5">Half</option></select></label>
    <label><span>Graphics</span><select data-k="gfx"><option value="auto">Auto (from your GPU)</option><option value="ultra">Ultra</option><option value="high">High</option><option value="mobile">Low</option></select></label>
    <label><span>Names over heads</span><select data-k="tags"><option value="full">Names and guilds</option><option value="names">Names only</option><option value="off">Off</option></select></label>
    <label><span>Speech bubbles</span><select data-k="bubbles"><option value="on">On</option><option value="off">Off</option></select></label>
    <label><span>Chat log</span><select data-k="chatlog"><option value="on">On</option><option value="off">Off</option></select></label>
    <label><span>Other Tessariels</span><select data-k="heroes"><option value="auto">As many as the graphics allow</option><option value="few">A few</option><option value="off">None</option></select></label>
    <label><span>Frame rate readout</span><select data-k="perf"><option value="off">Off</option><option value="on">On</option></select></label>
  </div>
  <p class="t-note">Graphics and Other Tessariels take hold when the game restarts.</p>
  <div class="t-dbtns"><button class="t-btn" data-close><span>Done</span></button></div>`;

const KEYS = [['W A S D', 'move'], ['Mouse', 'look'], ['Shift', 'run'], ['Space', 'jump; hold it to ride your shield'], ['Q', 'dodge'],
  ['Left click', 'fire your staff'], ['Right click', 'raise the shield; hold to guard'], ['1 to 6', 'cast the spell in that slot'],
  ['F', 'cast the chosen spell'], ['B', 'spellbook: fill the six slots'], ['I', 'pack: staffs, skulls, robes, gems'],
  ['E', 'take, open, talk'], ['M', 'map'], ['J', 'journal'], ['Alt', 'a cursor for the spell bar'], ['Esc', 'pause: save, load, settings'], ['F3', 'frame time']];
const HOWTO = `
  <h2>How to Play</h2><div class="t-rule"></div>
  <div class="t-keys">${KEYS.map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('')}</div>
  <div class="t-touchkeys">
    <p><b>Left thumb</b> moves (push it right out to run); <b>right thumb</b> looks, on or off the buttons.</p>
    <p><b>Staff</b> fires your staff, and a tap on a spell casts it. <b>GUARD</b> raises the shield while you hold it. <b>JUMP</b> (hold it to ride your shield), <b>DODGE</b>, <b>RUN</b>, <b>PACK</b> holds your staffs, skulls, robes and gems, <b>MAP</b>, <b>TAKE</b> takes up, opens or talks, and <b>II</b> pauses.</p>
  </div>
  <h3>Along the way</h3>
  <ul class="t-tips">
    <li>Hold <b>jump</b> as you leave the ground and the shield goes under your feet. Downhill it carries you fast.</li>
    <li>A gem set in a staff, a skull or a shield goes in an open socket, for good.</li>
    <li>With a skull in your left hand you can't guard, but you can still ride the shield.</li>
    <li>Kills pay experience. Each level adds spell damage, life and mana, and fills you up.</li>
    <li>The town is safe ground: nothing from the woods follows you in. Better loot lies further out and deeper down.</li>
    <li>Velscour's cathedral stands east of the town, and the catacombs lie beneath it.</li>
    <li>The game keeps itself as you play: <b>Continue</b> picks up where you were. Pause to keep a copy in one of ten save slots.</li>
  </ul>
  <div class="t-dbtns"><button class="t-btn" data-close><span>Done</span></button></div>`;

const DIALOG = `<h2></h2><div class="t-rule"></div><p class="t-msg"></p>
  <div class="t-dbtns"><button class="t-btn" data-v="yes"><span></span></button><button class="t-btn" data-v="no"><span></span></button></div>`;

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
    try { const r = await fetch(url); return await this.ctx.decodeAudioData(await r.arrayBuffer()); } catch (e) { console.warn('title audio', url, e); return null; }
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
      <div class="t-under"><div class="t-status"><span></span><div class="t-bar"><i></i></div></div><nav class="t-menu"></nav></div>`);
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

    // the windows over everything: settings, how to play, the save slots, the confirm box
    this.modal = R.appendChild(el('div', 't-modal'));
    this.scrim = el('div', 't-scrim');
    this.settings = el('div', 't-frame t-settings', SETTINGS);
    if (PHONE) {
      for (const o of this.settings.querySelectorAll('[data-k="gfx"] option[value="ultra"], [data-k="gfx"] option[value="high"]')) o.remove();
      this.settings.querySelector('[data-k="gfx"] option[value="auto"]').textContent = 'Auto (Low on a phone)';
    }
    this.howto = el('div', 't-frame t-howto', HOWTO);
    this.slotsEl = el('div', 't-frame t-slots');
    this.dialog = el('div', 't-frame t-dialog', DIALOG);
    this.frames = [this.settings, this.howto, this.slotsEl];
    this.modal.append(this.scrim, ...this.frames, this.dialog);
    for (const f of [this.settings, this.howto]) f.querySelector('[data-close]').onclick = () => { this.chime(); this.frame(f, false); };
    for (const b of this.dialog.querySelectorAll('[data-v]')) b.onclick = () => { this.chime(); this.answer?.(b.dataset.v === 'yes'); };
    this.scrim.onclick = () => this.closeTop();
    new MutationObserver(() => this.scrim.classList.toggle('on', !!this.top())).observe(this.modal, { subtree: true, attributes: true, attributeFilter: ['class'] });
    R.addEventListener('pointerover', (e) => { const b = e.target.closest?.('.t-btn'); if (b && b !== this.hovered && !b.disabled) { this.hovered = b; this.tick(); } });
    R.addEventListener('pointerout', (e) => { if (this.hovered && e.target.closest?.('.t-btn') === this.hovered && !this.hovered.contains(e.relatedTarget)) this.hovered = null; });
    addEventListener('keydown', (e) => this.key(e), true);
    // the settings: each kept, and handed to whoever applies it (the sound's are applied here)
    for (const input of this.settings.querySelectorAll('[data-k]')) {
      const k = input.dataset.k;
      input.value = String(settings[k]);
      const apply = () => {
        settings[k] = input.type === 'range' ? Number(input.value) : input.value;
        store.set(SETTINGS_KEY, JSON.stringify(settings));
        if (k === 'volume' && this.out) this.out.gain.setTargetAtTime(settings.volume, this.ctx.currentTime, 0.03);
        if (k === 'music' && this.musicBus) this.musicBus.gain.setTargetAtTime(settings.music, this.ctx.currentTime, 0.05);
        this.onSetting?.(k, settings[k]);
      };
      input.addEventListener(input.type === 'range' ? 'input' : 'change', apply);
      if (input.type === 'range') input.addEventListener('change', () => this.tick(1.6));
    }
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

  progress(pct) { this.status(`Loading… ${pct}%`, pct); }

  status(text, pct = null) {
    this.statusEl.querySelector('span').textContent = text;
    this.statusEl.classList.toggle('has-bar', pct != null);
    if (pct != null) this.statusEl.querySelector('.t-bar i').style.transform = `scaleX(${Math.max(0, Math.min(1, pct / 100))})`;
  }

  /** The title away (the game's begun). */
  hide(now = false) {
    if (this.mode === 'hidden' || this.mode === 'off') return;
    if (this.mode === 'splash') { this.skip(true); this.hush(); }
    this.stopBells(1.5);
    this.stopSong(2);
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
    if (c) this.bookSong(c.currentTime + 0.3, 2.5);
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
    this.opener = from || document.activeElement;
    this.frame(f, true);
  }

  frame(f, on) {
    f.classList.toggle('open', on);
    if (on) { f.scrollTop = 0; f.querySelector('select, input, .t-btn:not(:disabled)')?.focus({ preventScroll: true }); }
    else if (this.opener?.isConnected) { this.opener.focus({ preventScroll: true }); this.opener = null; }
  }

  /** The "are you sure" box: resolves true (yes) or false. o: {title, text, yes, no} */
  confirm(o) {
    this.answer?.(false);
    const D = this.dialog;
    D.querySelector('h2').textContent = o.title;
    D.querySelector('.t-msg').textContent = o.text;
    D.querySelector('[data-v=yes] span').textContent = o.yes || 'Yes';
    D.querySelector('[data-v=no] span').textContent = o.no || 'Go Back';
    D.querySelector('[data-v=no]').style.display = o.no === false ? 'none' : '';
    const opener = document.activeElement;
    return new Promise((res) => {
      this.answer = (v) => {
        this.answer = null;
        D.classList.remove('open');
        if (opener?.isConnected && !v) opener.focus({ preventScroll: true });
        res(v);
      };
      D.classList.add('open');
      D.querySelector(o.no === false ? '[data-v=yes]' : '[data-v=no]').focus({ preventScroll: true });
    });
  }

  /** The save slots. mode: save | load. o: { canSave, snapshot() -> Promise<data|null>, restore(data), onClose() } */
  slots(mode, o) {
    this.slotO = o; this.slotMode = mode; this.slotConfirm = null;
    for (const f of this.frames) if (f !== this.slotsEl) this.frame(f, false);
    this.renderSlots();
    this.frame(this.slotsEl, true);
  }

  closeSlots() { this.frame(this.slotsEl, false); this.slotO?.onClose?.(); }

  renderSlots() {
    const E = this.slotsEl, o = this.slotO, save = this.slotMode === 'save';
    E.innerHTML = `<h2>${save ? 'Save Game' : 'Load Game'}</h2><div class="t-rule"></div>`;
    const tabs = el('div', 't-tabs');
    for (const [m, label] of [['save', 'Save'], ['load', 'Load']]) {
      const b = el('button', 't-btn' + (m === this.slotMode ? ' sel' : ''), `<span>${label}</span>`);
      b.disabled = m === 'save' && !o.canSave;
      b.onclick = () => { this.chime(); this.slotMode = m; this.slotConfirm = null; this.renderSlots(); };
      tabs.append(b);
    }
    E.append(tabs);
    const list = el('div', 't-slotlist');
    for (let i = 1; i <= SLOT_COUNT; i++) {
      const d = saves.read(i), c = this.slotConfirm;
      const row = el('div', 't-slot' + (d ? '' : ' empty'));
      row.innerHTML = d
        ? `<div class="si"><b>Slot ${i}</b><span class="when">${when(d.at)}</span><span class="who">${describe(d.summary)}</span></div>`
        : `<div class="si"><b>Slot ${i}</b><span class="when">Empty</span></div>`;
      const btns = el('div', 'sb');
      const button = (label, fn, red) => { const b = el('button', 't-btn small' + (red ? ' red' : ''), `<span>${label}</span>`); b.onclick = () => { this.chime(); fn(); }; btns.append(b); };
      if (save) {
        button(c === i ? 'Overwrite?' : 'Save here', async () => {
          if (d && c !== i) { this.slotConfirm = i; this.renderSlots(); return; }
          const data = await o.snapshot();
          this.slotConfirm = null;
          if (!data) this.toast('Nothing to save right now');
          else this.toast(saves.write(i, data) ? `Saved in slot ${i}` : 'Could not save: the browser refused the space');
          this.renderSlots();
        }, c === i);
      } else if (d) {
        button('Load', () => { this.frame(this.slotsEl, false); o.restore(d); });
      }
      if (d) button(c === -i ? 'Delete?' : '✕', () => { if (c !== -i) { this.slotConfirm = -i; this.renderSlots(); return; } saves.clear(i); this.slotConfirm = null; this.renderSlots(); this.refresh(); }, true);
      row.append(btns);
      list.append(row);
    }
    E.append(list);
    E.append(el('p', 't-note', save ? 'Ten slots. Each keeps where you stand and how long you\'ve played.' : 'Loading puts you back where that save was made.'));
    const done = el('div', 't-dbtns', '<button class="t-btn"><span>Done</span></button>');
    done.firstChild.onclick = () => { this.chime(); this.closeSlots(); };
    E.append(done);
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
