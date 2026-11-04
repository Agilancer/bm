// Boot: the permission gate, threads, GPU, assets, and the render thread's loop.
import { Audio } from './audio.js';
import { C, C_BLEEDS, C_SIZE, CHARS_START, CTRL, EV, EV_CAPACITY, EV_FLOATS, H, INPUT, SNAP_FLOATS, STATE_NAMES, TACTICS, TOTAL_BYTES, mapShared } from './core/layout.js';
import { clamp, damp, wrapAngle } from './core/math.js';
import { initGPU, isMobileDevice } from './gfx/gpu.js';
import { Renderer } from './gfx/renderer.js';
import { Input } from './input.js';
import { saves, settings, Title } from './title.js';

const BASE = new URL('..', import.meta.url).href;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const AUTO = params.has('auto');
const CONSENT_KEY = 'bm-threads-consent';
const AUTOSAVE_EVERY = 20;   // seconds of play between the saves Continue picks up
const title = new Title();
window.bmTitle = title;

// ---- job pool ----------------------------------------------------------------------------------------------

class Pool {
  constructor(size) {
    this.size = size;
    this.workers = [];
    this.waiting = new Map();
    this.next = 1;
    this.rr = 0;
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('./sim/job.worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => {
        const { id, result, error } = e.data;
        const p = this.waiting.get(id);
        this.waiting.delete(id);
        if (error) p.reject(new Error(error)); else p.resolve(result);
      };
      w.onerror = (e) => { console.error('job worker', e.message); };
      this.workers.push(w);
    }
  }

  run(type, args, transfer) {
    const id = this.next++;
    const w = this.workers[this.rr++ % this.size];
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      w.postMessage({ id, type, args }, transfer || []);
    });
  }

  startPlanners(buffer, budget, interval) {
    this.workers.forEach((w, index) => w.postMessage({ id: 0, type: 'plan', args: { buffer, index: index + 1, budget, interval } }));
  }
}

// ---- thread budget ---------------------------------------------------------------------------------------------

function threadPlan(mobile) {
  const cores = navigator.hardwareConcurrency || 4;
  // Leave one logical core for the OS and browser, two on a phone where heat is the real limit.
  const spare = mobile ? 2 : 1;
  const usable = Math.max(2, cores - spare);
  const pool = Math.max(1, Math.min(usable - 2, mobile ? 4 : 30));
  return { cores, usable: pool + 2, pool };
}

// ---- gate ---------------------------------------------------------------------------------------------------------

const state = { started: false, paused: false, gameShown: 0 };

async function enableIsolation() {
  if (window.crossOriginIsolated || !('serviceWorker' in navigator) || !window.isSecureContext) return false;
  // One try. If the page comes back still not isolated, the game runs on message passing instead.
  if (sessionStorage.getItem('bm-coi-tried')) return false;
  try {
    sessionStorage.setItem('bm-coi-tried', '1');
    const reg = await navigator.serviceWorker.register('coi-sw.js');
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        const sw = reg.installing || reg.waiting || reg.active;
        if (sw && sw.state === 'activated') resolve();
        else if (sw) sw.addEventListener('statechange', () => { if (sw.state === 'activated') resolve(); });
        else resolve();
        setTimeout(resolve, 4000);
      });
    }
    location.reload();
    return true;
  } catch (e) {
    console.warn('no service worker, so threads will talk by message', e);
    return false;
  }
}

function showFail(message) {
  $('card').innerHTML = `<b>This game needs WebGPU.</b><br>${message}<div class="small">Current versions of Chrome, Edge and Safari have it, on PC and on phones. Firefox has it on Windows. If yours is up to date, check that hardware acceleration is on.</div>`;
  $('buttons').innerHTML = '';
}

async function main() {
  const mobile = isMobileDevice();
  const plan = threadPlan(mobile);
  if (!navigator.gpu) { showFail('This browser does not offer it.'); return; }
  if (AUTO) { boot(plan, plan.pool); return; }
  // The title comes up once the page won't reload under it for shared memory, and the game loads behind it.
  const go = async (pool) => {
    if (!window.crossOriginIsolated && (await enableIsolation())) return;
    $('gate').classList.add('gone');
    title.start();
    boot(plan, pool);
  };
  const consented = localStorage.getItem(CONSENT_KEY);
  if (consented === 'all') { go(plan.pool); return; }
  if (consented === 'few') { go(1); return; }
  $('card').innerHTML = `<b>Bellmourn is asking to use your hardware.</b><br>
    ${plan.usable} of your ${plan.cores} CPU threads${mobile ? ' (some left free, so your phone stays cool)' : ''}, and your GPU at its highest performance setting.
    One thread runs the world, one draws it, and the rest load the game and plan the enemy's moves.
    <div class="small">Browsers have no pop-up for this, so this is the question. Shared memory between threads may need one quick page reload. You can change your mind later by clearing this site's data.</div>`;
  $('buttons').innerHTML = '<button class="big" id="allow">ALLOW</button><button class="alt" id="few">Use fewer threads</button>';
  // (the click also lets the title's sound play, so it needn't ask for one)
  $('allow').onclick = () => {
    title.unlock();
    localStorage.setItem(CONSENT_KEY, 'all');
    $('card').textContent = 'Preparing...';
    $('buttons').innerHTML = '';
    go(plan.pool);
  };
  $('few').onclick = () => {
    title.unlock();
    localStorage.setItem(CONSENT_KEY, 'few');
    $('buttons').innerHTML = '';
    go(1);
  };
}

function failOnTitle(message) {
  title.hide(true);
  $('gate').classList.remove('gone');
  $('bar').style.display = 'none';
  $('card').style.display = '';
  $('card').textContent = message;
}

async function boot(plan, poolSize) {
  $('card').style.display = 'none';
  $('buttons').innerHTML = '';
  $('bar').style.display = 'block';
  const setProgress = (t, msg) => {
    $('bar').firstElementChild.style.width = `${Math.round(t * 100)}%`;
    if (msg) $('status').textContent = msg;
    if (title.up) title.progress(Math.round(t * 100));
  };
  setProgress(0.02, 'Waking the GPU...');
  let gpu;
  try { gpu = await initGPU(settings.gfx); } catch (e) { failOnTitle(''); showFail(e.message); return; }
  gpu.device.lost.then((info) => {
    console.error('device lost', info.message);
    if (info.reason !== 'destroyed') failOnTitle('The GPU reset. Reload the page to continue.');
  });
  let gpuErrors = 0;
  gpu.device.addEventListener('uncapturederror', (e) => { window.__gpuErrors = ++gpuErrors; if (gpuErrors < 6) console.error('GPU error:', e.error.message); });
  const canvas = $('view');
  const pool = new Pool(poolSize);
  const isolated = window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined' && !params.has('nosab');
  const buffer = isolated ? new SharedArrayBuffer(TOTAL_BYTES) : null;
  const shared = buffer ? mapShared(buffer) : mapShared(new ArrayBuffer(TOTAL_BYTES));
  const input = new Input(canvas, shared.input);
  // The world holds still under the title.
  if (!AUTO) shared.input[INPUT.PAUSE] = 1;
  setProgress(0.05, `Loading with ${poolSize} threads...`);

  const renderer = new Renderer(gpu, canvas, pool);
  const simWorker = new Worker(new URL('./sim/sim.worker.js', import.meta.url), { type: 'module' });
  const audio = new Audio(BASE, title.ctx, title.out, settings.ambience);
  let latestSnap = null;
  // Saves and loads are asked of the simulation thread, and answered by id.
  const calls = new Map();
  let callId = 0;
  const simCall = (type, data) => new Promise((resolve, reject) => {
    const id = ++callId;
    calls.set(id, { resolve, reject });
    simWorker.postMessage({ type, id, data });
  });
  const simReady = new Promise((resolve, reject) => {
    simWorker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'ready') resolve();
      else if (m.type === 'error') { console.error(m.message); reject(new Error(m.message)); }
      else if (m.type === 'snap') { latestSnap = m.snap; if (m.events) pendingEvents.push(m.events); }
      else if (m.type === 'look') { input.yaw = m.yaw; input.pitch = m.pitch; }
      else if (m.type === 'restart') { input.yaw = Math.PI; input.pitch = 0; hud.reset(); renderer.clearBlood(); }
      else if (m.type === 'saved' || m.type === 'loaded') {
        const c = calls.get(m.id);
        calls.delete(m.id);
        if (c) { if (m.error) c.reject(new Error(m.error)); else c.resolve(m.data); }
      }
    };
    simWorker.onerror = (e) => { console.error('sim worker', e.message); reject(new Error(e.message)); };
  });
  const pendingEvents = [];
  const hz = gpu.tier.sim;
  simWorker.postMessage({ type: 'boot', buffer, hz, base: BASE });

  const hud = new Hud(gpu, plan, poolSize, isolated, input);
  const start = performance.now();
  try {
    await Promise.all([
      renderer.load(BASE, (t) => setProgress(0.05 + t * 0.9, 'Building the village...')),
      simReady,
      audio.load().catch((e) => console.warn('audio', e)),
    ]);
  } catch (e) {
    failOnTitle(`Failed to load: ${e.message}`);
    console.error(e);
    return;
  }
  const loadMs = performance.now() - start;
  setProgress(1, `Ready in ${(loadMs / 1000).toFixed(1)} s.`);
  // Tasks for the pool once the load is done: thinking about the fight.
  if (buffer) {
    shared.ctrl[CTRL.PLAN_RUN] = 1;
    pool.startPlanners(buffer, gpu.mobile ? 2.5 : 4, 40);
  }

  // ---- the render thread's loop --------------------------------------------------------------------------------------

  const game = new GameView(renderer, shared, input, audio, hud, gpu, simWorker, buffer);
  window.bm = game.api(shared, simWorker, buffer, pool);
  game.pendingEvents = pendingEvents;
  game.getNonSharedSnap = () => latestSnap;

  const enter = async (fresh = true) => {
    title.hide();
    game.idle = false;
    state.paused = false;
    $('pause').style.display = 'none';
    shared.input[INPUT.PAUSE] = 0;
    audio.setAmbience(settings.ambience);
    $('gate').classList.add('gone');
    $('hud').style.display = 'block';
    if (input.touch) { $('touch').style.display = 'block'; shared.input[INPUT.TOUCH] = 1; }
    input.enabled = true;
    document.body.classList.add('playing');
    audio.start();
    input.lock();
    if (input.touch && document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); await screen.orientation?.lock?.('landscape'); } catch { /* optional on this device */ }
    }
    try { game.wake = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
    if (fresh) hud.intro();
  };

  // ---- saving, loading and the menus ---------------------------------------------------------------------------------

  const fightOn = () => game.gameState() === 0;
  const snapshot = () => (fightOn() ? simCall('save').catch((e) => { console.warn('save', e); return null; }) : Promise.resolve(null));
  // The game keeps itself as it's played (Continue); a fight that's over is nothing to continue.
  const autosave = async () => {
    if (!input.enabled) return;
    if (!fightOn()) { saves.clearAuto(); return; }
    const data = await snapshot();
    if (data) saves.writeAuto(data);
  };
  let playT = 0;
  game.onTick = (dt) => {
    if (!input.enabled || state.paused) return;
    playT += dt;
    if (playT > AUTOSAVE_EVERY) { playT = 0; autosave(); }
  };
  const loadInto = async (data) => {
    try { await simCall('load', data); } catch (e) {
      await title.confirm({ title: 'Could not load', text: e.message, yes: 'Back', no: false });
      return false;
    }
    hud.reset(); renderer.clearBlood(); playT = 0;
    return true;
  };
  const startFrom = async (data) => { if (await loadInto(data)) enter(false); };
  const slotOptions = () => ({ canSave: input.enabled && fightOn(), snapshot, restore: (d) => (input.enabled ? loadInGame(d) : startFrom(d)) });
  const loadInGame = async (d) => { if (await loadInto(d)) resume(); };
  const resume = () => { if (input.touch) input.onPauseChange(false); else input.lock(); };
  const toTitle = async () => {
    await autosave();
    input.enabled = false;
    state.paused = false;
    shared.input[INPUT.PAUSE] = 1;
    if (document.pointerLockElement) document.exitPointerLock();
    $('pause').style.display = 'none'; $('hud').style.display = 'none'; $('touch').style.display = 'none';
    document.body.classList.remove('playing');
    game.idle = true;
    audio.setAmbience(0);
    title.toMenu();
  };
  title.onMenu = async (a) => {
    if (a === 'new') {
      if (saves.auto() && !(await title.confirm({ title: 'New Game', text: 'Start the fight over from the beginning? The game you were playing stays in Continue until you play on.', yes: 'New Game' }))) return;
      saves.clearAuto();
      shared.input[INPUT.RESTART] += 1;   // (taken up on the first step after the world is let go)
      playT = 0;
      enter(true);
    } else if (a === 'continue') {
      const d = saves.newest();
      if (d) startFrom(d);
    } else if (a === 'load') title.slots('load', slotOptions());
  };
  for (const b of $('pause').querySelectorAll('[data-p]')) {
    b.onclick = () => {
      title.chime();
      const a = b.dataset.p;
      if (a === 'resume') resume();
      else if (a === 'save' || a === 'load') title.slots(a, slotOptions());
      else if (a === 'settings' || a === 'howto') title.panel(a, b);
      else if (a === 'menu') toTitle();
    };
  }
  const applySetting = (k, v) => {
    if (k === 'look') input.sens = v;
    else if (k === 'ambience' && input.enabled) audio.setAmbience(v);
    else if (k === 'res') {
      game.fixedScale = v !== 'auto';
      if (game.fixedScale) renderer.scale = Number(v);
    } else if (k === 'gfx') {
      title.confirm({ title: 'Restart?', text: 'The graphics setting takes hold when the game restarts. Where you are is kept for Continue.', yes: 'Restart Now', no: 'Later' })
        .then(async (yes) => { if (yes) { await autosave(); title.reload(); } });
    }
  };
  title.onSetting = applySetting;
  applySetting('look', settings.look);
  applySetting('res', settings.res);
  input.onPauseChange = (paused) => {
    if (!input.enabled) return;
    if (paused && !state.paused) autosave();
    state.paused = paused;
    $('pause').style.display = paused ? 'flex' : 'none';
    shared.input[INPUT.PAUSE] = paused ? 1 : 0;
  };
  $('bPause').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); input.onPauseChange(true); }, { passive: false });
  document.addEventListener('visibilitychange', () => {
    const hidden = document.hidden;
    shared.input[INPUT.PAUSE] = hidden || state.paused ? 1 : 0;
    if (hidden && audio.ctx) audio.ctx.suspend(); else if (audio.ctx && (input.enabled || title.up)) audio.ctx.resume();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && input.enabled && shared.snaps && game.gameState() !== 0) shared.input[INPUT.RESTART] += 1;
    if (e.code === 'F3') { e.preventDefault(); hud.toggleDebug(); }
  });
  $('touch').addEventListener('touchstart', () => {
    const snap = game.currentSnap();
    if (input.enabled && snap && snap[H.GAME] !== 0 && snap[H.GAME_T] > 1.5) shared.input[INPUT.RESTART] += 1;
  });
  game.run();
  $('controls').innerHTML = input.touch
    ? 'Left thumb moves. Right thumb looks, on or off the buttons. <b>CUT</b> and <b>WIDE</b> swing, <b>DODGE</b> gets you out.'
    : '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move &nbsp; <kbd>Space</kbd> jump &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Q</kbd> dodge &nbsp; <kbd>Left click</kbd> cut &nbsp; <kbd>Right click</kbd> wide swing';
  // Loaded: the title's menu comes up (once Bellmourn's logo is in).
  game.idle = !AUTO;
  title.ready(() => ({ continue: !!saves.newest(), load: saves.any() }));
  if (AUTO) { $('gate').classList.add('gone'); $('hud').style.display = 'block'; input.enabled = true; audio.start(); if (input.touch) { $('touch').style.display = 'block'; shared.input[INPUT.TOUCH] = 1; } }
}

// ---- HUD --------------------------------------------------------------------------------------------------------------

class Hud {
  constructor(gpu, plan, poolSize, isolated, input) {
    this.gpu = gpu; this.plan = plan; this.poolSize = poolSize; this.isolated = isolated; this.input = input;
    this.debug = params.has('debug');
    this.t = 0;
    this.frames = 0; this.fps = 0; this.lastFpsT = performance.now();
    $('debug').style.display = this.debug ? 'block' : 'none';
    this.msgShown = 0;
    this.tips = [];
    this.tipT = 0;
    this.hpEl = $('hp').firstElementChild;
    this.foeHp = $('foeHp').firstElementChild;
    this.foeArm = $('foeArmor').firstElementChild;
    this.stamEl = $('stam').firstElementChild;
    this.shown = {};
  }

  reset() { this.msgShown = 0; $('msg').style.opacity = 0; $('msg').innerHTML = ''; this.shown = {}; }

  toggleDebug() { this.debug = !this.debug; $('debug').style.display = this.debug ? 'block' : 'none'; }

  intro() {
    this.tip('Find the black knight. A cut opens the armour.', 5);
  }

  // Each lesson once, at the moment it means something.
  once(id, text, secs = 4.5) {
    if (this.shown[id]) return;
    this.shown[id] = true;
    this.tip(text, secs);
  }

  tip(text, secs) {
    $('tip').textContent = text;
    $('tip').style.opacity = 1;
    clearTimeout(this.tipTimer);
    this.tipTimer = setTimeout(() => { $('tip').style.opacity = 0; }, secs * 1000);
  }

  crossHit() {
    const c = $('cross');
    c.classList.add('hit');
    clearTimeout(this.crossT);
    this.crossT = setTimeout(() => c.classList.remove('hit'), 140);
  }

  update(dt, snap, stats) {
    this.frames++;
    const now = performance.now();
    if (now - this.lastFpsT > 500) {
      this.fps = this.frames * 1000 / (now - this.lastFpsT);
      this.frames = 0; this.lastFpsT = now;
    }
    this.t += dt;
    $('cross').classList.toggle('wound', snap[H.AIM_WOUND] > 0.5);
    if (this.t < 0.08) return;
    this.t = 0;
    this.stamEl.style.width = `${clamp(snap[H.STAMINA] / 100, 0, 1) * 100}%`;
    this.hpEl.style.width = `${clamp(snap[H.HP] / snap[H.MAX_HP], 0, 1) * 100}%`;
    const co = CHARS_START;
    const hostile = snap[co + C.STATE] !== 0 || snap[co + C.GASH_COUNT] > 0;
    const hpf = clamp(snap[co + C.HP] / snap[co + C.MAX_HP], 0, 1);
    $('foe').style.opacity = hostile && snap[co + C.STATE] !== 10 ? 1 : 0;
    this.foeHp.style.width = `${hpf * 100}%`;
    this.foeArm.style.width = `${clamp(snap[co + C.ARMOR], 0, 1) * 100}%`;
    const bleeds = snap[co + C.N_BLEEDS];
    $('bleed').textContent = bleeds >= 3 ? 'BLEEDING OUT' : bleeds >= 1 ? 'BLEEDING' : '';
    const g = snap[H.GAME];
    if (g !== this.msgShown) {
      this.msgShown = g;
      const m = $('msg');
      const again = this.input.touch ? 'Tap to play again' : 'R to play again';
      if (g === 1) { m.innerHTML = `The knight has fallen<small>${again}</small>`; m.style.opacity = 1; }
      if (g === 2) { m.innerHTML = `You have fallen<small>${again}</small>`; m.style.opacity = 1; }
    }
    if (this.debug) {
      const k = this.gpu.tier;
      $('debug').textContent = `${this.fps.toFixed(0)} fps   gpu ${stats.gpuMs.toFixed(2)} ms
${this.gpu.info.vendor || ''} ${this.gpu.info.architecture || ''}  tier ${k.name}
render ${stats.W}x${stats.H}  scale ${stats.scale.toFixed(2)}
threads ${this.plan.cores} logical, ${this.poolSize + 2} used, shared ${this.isolated ? 'yes' : 'no'}
sim ${k.sim} Hz  planner rollouts ${(snap[H.ROLLOUTS] / 1000).toFixed(0)}k
knight ${STATE_NAMES[snap[co + C.STATE]]}  tactic ${TACTICS[snap[H.TACTIC]]}
hp ${snap[co + C.HP].toFixed(0)}  stam ${snap[co + C.STAM].toFixed(0)}  gashes ${snap[co + C.GASH_COUNT]}  bleeds ${bleeds}`;
    }
  }
}

// ---- view ---------------------------------------------------------------------------------------------------------------

class GameView {
  constructor(renderer, shared, input, audio, hud, gpu, sim, buffer) {
    Object.assign(this, { renderer, shared, input, audio, hud, gpu, sim, buffer });
    this.evSeen = 0;
    this.last = performance.now();
    this.cam = { x: 0, y: 2, z: 0, fx: 0, fy: 0, fz: 1, ux: 0, uy: 1, uz: 0 };
    this.bobT = 0; this.swayX = 0; this.swayY = 0; this.sway = new Float32Array(16);
    this.sway.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this.heartPrev = new Float32Array(8);
    this.smokeT = 0; this.moteT = 0; this.overrideCam = null;
    this.govT = 0; this.govMs = 0; this.govN = 0; this.frozenSnap = null;
    this.prevSnap = new Float32Array(SNAP_FLOATS);
  }

  gameState() { const s = this.currentSnap(); return s ? s[H.GAME] : 0; }

  currentSnap() {
    if (this.buffer) {
      const { ctrl, snaps } = this.shared;
      if (Atomics.load(ctrl, CTRL.TICK) === 0) return null;
      const latest = Atomics.load(ctrl, CTRL.LATEST);
      Atomics.store(ctrl, CTRL.READING, latest);
      return snaps[latest];
    }
    return this.getNonSharedSnap();
  }

  run() {
    // ?timer=1 keeps the loop alive in an occluded window, for automated review.
    const useTimer = params.has('timer');
    const schedule = useTimer ? (f) => setTimeout(() => f(performance.now()), 16) : requestAnimationFrame.bind(window);
    const loop = (now) => {
      schedule(loop);
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.input.update();
      if (!this.buffer) this.sim.postMessage({ input: this.shared.input.slice() });
      const snap = this.currentSnap();
      if (!snap) return;
      // Under the title the village isn't drawn: a few frames, so the pipelines are built, then nothing.
      if (this.idle) { if (this.idleFrames > 3) return; this.idleFrames = (this.idleFrames || 0) + 1; } else this.idleFrames = 0;
      if (this.onTick) this.onTick(dt);
      if (this.input.touch && this.input.enabled) this.aimAssist(dt, snap);
      this.processEvents(snap);
      this.updateCamera(dt, snap);
      this.emitAmbient(dt, snap);
      this.emitBleeds(dt, snap);
      this.updateTrail(dt, snap);
      const c = this.overrideCam || this.cam;
      this.renderer.frame(c, snap, this.sway, dt);
      this.audio.listener(c.x, c.y, c.z, c.fx, c.fy, c.fz, c.ux, c.uy, c.uz);
      this.govern(dt);
      this.hud.update(dt, snap, { gpuMs: this.renderer.stats.gpuMs, W: this.renderer.W, H: this.renderer.H, scale: this.renderer.scale });
      if (this.onFrame) this.onFrame();
    };
    schedule(loop);
  }

  // Thumbs can't track a moving target the way a mouse can, so the view drifts onto the nearest enemy's chest.
  aimAssist(dt, snap) {
    const inp = this.input;
    let best = 0.42, target = null;
    for (let i = 0; i < snap[H.NCHARS]; i++) {
      const co = CHARS_START + i * C_SIZE;
      if (snap[co + C.STATE] === 10 || !snap[co + C.HOSTILE]) continue;
      const dx = snap[co + C.X] - snap[H.PX], dz = snap[co + C.Z] - snap[H.PZ], d = Math.hypot(dx, dz);
      if (d > 5.5) continue;
      const off = Math.abs(wrapAngle(Math.atan2(dx, dz) - inp.yaw));
      if (off < best) { best = off; target = { yaw: Math.atan2(dx, dz), d, h: snap[co + C.Y] + (i < 2 ? 1.32 : 0.9) }; }
    }
    if (!target) return;
    const strength = 1 - Math.exp(-dt * (snap[H.SWINGING] > 0.5 ? 2.2 : 0.8));
    inp.yaw += wrapAngle(target.yaw - inp.yaw) * strength;
    const pitch = Math.atan2(target.h - (snap[H.PY] + 1.62), Math.max(target.d, 0.8));
    inp.pitch += (pitch - inp.pitch) * strength * 0.7;
  }

  // Dynamic resolution: hold the display's refresh rate, spend what's left on pixels.
  govern(dt) {
    const r = this.renderer;
    this.govT += dt; this.govMs += dt * 1000; this.govN++;
    if (this.govT < 1.5) return;
    const frameMs = this.govMs / this.govN;
    this.govT = 0; this.govMs = 0; this.govN = 0;
    if (document.hidden) return;
    if (this.fixedScale) return;
    const budget = this.gpu.mobile ? 1000 / 60 : Math.max(1000 / 144, Math.min(frameMs, 1000 / 60));
    const gpuMs = r.stats.gpuMs;
    // Resolution moves in fixed steps, so each only has to be built once.
    const STEPS = [1, 0.88, 0.76, 0.66, 0.55];
    let step = STEPS.indexOf(r.scale);
    if (step < 0) step = 0;
    // A steady 30 Hz with no GPU timings is a browser's low-power cap, not a slow GPU.
    const capped = gpuMs <= 0 && Math.abs(frameMs - 33.3) < 2.5;
    const tooSlow = !capped && (gpuMs > 0 ? gpuMs > budget * 0.92 : frameMs > 1000 / 50);
    const roomy = gpuMs > 0 ? gpuMs < budget * 0.55 : frameMs < 1000 / 58;
    // Chasing a high-refresh display only ever spends resolution. Effects go only when 60 Hz itself is out of reach.
    const below60 = !capped && (gpuMs > 0 ? gpuMs > 15.3 : frameMs > 20);
    this.fastRuns = roomy ? (this.fastRuns || 0) + 1 : 0;
    // A browser's power cap and a GPU stuck at 30 look alike from here, so try one resolution step and see.
    if (capped && !this.capProbe) {
      this.capProbe = { step, frameMs, waiting: true };
      step = Math.min(step + 1, STEPS.length - 1);
    } else if (this.capProbe?.waiting) {
      this.capProbe.waiting = false;
      if (frameMs > this.capProbe.frameMs - 2) step = this.capProbe.step;
    } else if (below60) {
      if (step < 2) step++;
      else if (!r.demote()) step = Math.min(step + 1, STEPS.length - 1);
    } else if (tooSlow) {
      if (step < 2) step++;
    } else if (this.fastRuns >= 3 && step > 0) { step--; this.fastRuns = 0; }
    r.scale = STEPS[step];
  }

  updateCamera(dt, snap) {
    const inp = this.input;
    const yaw = inp.yaw, pitch = inp.pitch;
    const sx = snap[H.SHAKE_X], sy = snap[H.SHAKE_Y], sr = snap[H.SHAKE_R];
    const y2 = yaw + sx, p2 = pitch + sy;
    const cp = Math.cos(p2);
    const fx = Math.sin(y2) * cp, fy = Math.sin(p2), fz = Math.cos(y2) * cp;
    // Roll the camera about its forward axis for shake.
    const rx = -Math.cos(y2), rz = Math.sin(y2);
    const uxb = -Math.sin(y2) * Math.sin(p2), uyb = cp, uzb = -Math.cos(y2) * Math.sin(p2);
    // Leans into a sidestep.
    this.dodgeLean = damp(this.dodgeLean || 0, snap[H.DODGE] > 0 ? (inp.moveX || 0) * -0.11 : 0, 16, dt);
    const roll = sr + this.dodgeLean;
    const cr = Math.cos(roll), srn = Math.sin(roll);
    const ux = uxb * cr + rx * srn, uy = uyb * cr, uz = uzb * cr + rz * srn;
    const sp = snap[H.GROUND_SPEED];
    this.bobT += dt * sp * 1.25 * (snap[H.ON_GROUND] > 0.5 ? 1 : 0);
    const bobA = clamp(sp / 6, 0, 1);
    const bobY = Math.sin(this.bobT * 2) * 0.03 * bobA;
    const bobX = Math.cos(this.bobT) * 0.018 * bobA;
    // Extrapolate from the newest sim state, so high refresh rates stay smooth.
    let age = 0;
    if (this.buffer) {
      const now = (performance.timeOrigin + performance.now()) % 2147483647;
      age = clamp((now - Atomics.load(this.shared.ctrl, CTRL.PUB_MS)) / 1000, 0, 0.02);
    }
    const eyeX = snap[H.PX] + snap[H.VX] * age + rx * bobX;
    const eyeY = snap[H.PY] + 1.62 + bobY - snap[H.CAM_DROP] - Math.min(snap[H.DODGE], 0.2) * 0.45;
    const eyeZ = snap[H.PZ] + snap[H.VZ] * age + rz * bobX;
    Object.assign(this.cam, { x: eyeX, y: eyeY, z: eyeZ, fx, fy, fz, ux, uy, uz });
    // The sword lags your hands a little, and rides with your steps.
    this.swayX = damp(this.swayX, clamp(inp.yawVel * 1.5, -0.05, 0.05), 11, dt);
    this.swayY = damp(this.swayY, clamp(inp.pitchVel * 1.5, -0.05, 0.05), 11, dt);
    inp.yawVel = 0; inp.pitchVel = 0;
    const vy = Math.sin(this.bobT * 2) * 0.012 * bobA - Math.min(0, snap[H.VY]) * -0.002 + this.swayY;
    const vx = Math.cos(this.bobT) * 0.01 * bobA - this.swayX;
    const m = this.sway;
    const vmRoll = -this.swayX * 0.6;
    m[0] = Math.cos(vmRoll); m[1] = Math.sin(vmRoll); m[4] = -Math.sin(vmRoll); m[5] = Math.cos(vmRoll);
    m[12] = vx; m[13] = vy; m[14] = 0;
  }

  // The blade's arc over the last moments, as a strip from hilt to tip.
  updateTrail(dt, snap) {
    const pts = this.trail || (this.trail = []);
    for (const p of pts) p.age += dt;
    while (pts.length && pts[0].age > 0.16) pts.shift();
    if (snap[H.SWINGING] > 0.5 && pts.length < 60) {
      pts.push({ age: 0, r: [snap[H.ROOT_X], snap[H.ROOT_Y], snap[H.ROOT_Z]], t: [snap[H.TIP_X], snap[H.TIP_Y], snap[H.TIP_Z]] });
    }
    const d = this.renderer.trailData;
    let n = 0;
    for (const p of pts) {
      const a = (1 - p.age / 0.16) ** 2;
      d[n * 4] = p.r[0] * 0.45 + p.t[0] * 0.55; d[n * 4 + 1] = p.r[1] * 0.45 + p.t[1] * 0.55; d[n * 4 + 2] = p.r[2] * 0.45 + p.t[2] * 0.55; d[n * 4 + 3] = a; n++;
      d[n * 4] = p.t[0]; d[n * 4 + 1] = p.t[1]; d[n * 4 + 2] = p.t[2]; d[n * 4 + 3] = a; n++;
    }
    this.renderer.trailCount = n;
  }

  emitAmbient(dt, snap) {
    const r = this.renderer;
    this.smokeT += dt;
    if (this.smokeT > 0.09) {
      this.smokeT = 0;
      for (const s of r.village.smoke) r.emit(4, 1, s.p[0], s.p[1], s.p[2], 0.1, 1, 0.08, 0.22, 0.45, 0.8, 0.09, 0.17, 7, 12);
    }
    this.moteT += dt;
    if (this.moteT > 0.06) {
      this.moteT = 0;
      const a = Math.random() * 6.28, d = 2 + Math.random() * 16;
      r.emit(5, 1, this.cam.x + Math.cos(a) * d, this.cam.y - 1.4 + Math.random() * 4, this.cam.z + Math.sin(a) * d, 0, 1, 0, 1, 0.02, 0.1, 0.005, 0.011, 5, 9);
    }
  }

  emitBleeds(dt, snap) {
    const r = this.renderer;
    for (let i = 0; i < snap[H.NCHARS]; i++) {
      const co = CHARS_START + i * C_SIZE;
      const n = snap[co + C.N_BLEEDS];
      if (!n) continue;
      const heart = snap[co + C.HEART];
      const phase = heart - Math.floor(heart);
      const pulse = Math.pow(Math.max(Math.sin(phase * Math.PI * 2), 0), 3);
      const beat = this.heartPrev[i] < 0.25 && phase >= 0.25;
      this.heartPrev[i] = phase;
      const dead = snap[co + C.STATE] === 10;
      const strength = dead ? 0.35 : 1;
      for (let b = 0; b < n; b++) {
        const o = co + C_BLEEDS + b * 8;
        const x = snap[o], y = snap[o + 1], z = snap[o + 2];
        const nx = snap[o + 3], ny = snap[o + 4], nz = snap[o + 5];
        // A steady pour, and an arterial jet on each heartbeat, stronger for a fresh wound.
        const flow = snap[o + 6];
        const rate = (420 + 3000 * pulse) * strength * flow;
        const count = rate * dt + Math.random();
        const speed = 0.4 + 3.2 * pulse * strength;
        r.emit(0, count | 0, x, y, z, nx, ny + 0.1, nz, 0.3, speed * 0.4, speed, 0.0012, 0.0055, 1.6, 3);
        if (Math.random() < dt * 22 * strength) r.emit(1, 1, x, y, z, nx, ny, nz, 0.5, 0.3, 1.1, 0.02, 0.06, 0.4, 1);
        if (beat && !dead) {
          r.emit(0, Math.round(220 * flow), x, y, z, nx, ny + 0.22, nz, 0.055, 2.6, 5.4, 0.0014, 0.0065, 1.2, 2.4);
          r.emit(1, 4, x, y, z, nx, ny + 0.2, nz, 0.3, 0.8, 2, 0.02, 0.05, 0.3, 0.7);
          if (b === 0) this.audio.gore(x, y, z, 0.3, 0.22, 700);
        }
      }
    }
  }

  processEvents(snap) {
    if (this.buffer) {
      const { ctrl, events } = this.shared;
      const head = Atomics.load(ctrl, CTRL.EV_HEAD);
      if (head - this.evSeen > EV_CAPACITY) this.evSeen = head - EV_CAPACITY;
      while (this.evSeen < head) {
        const o = (this.evSeen % EV_CAPACITY) * EV_FLOATS;
        this.onEvent(events[o], events[o + 1], events[o + 2], events[o + 3], events[o + 4], events[o + 5], events[o + 6], events[o + 7]);
        this.evSeen++;
      }
    } else if (this.pendingEvents) {
      for (const list of this.pendingEvents) {
        for (let o = 0; o < list.length; o += 8) this.onEvent(list[o], list[o + 1], list[o + 2], list[o + 3], list[o + 4], list[o + 5], list[o + 6], list[o + 7]);
      }
      this.pendingEvents.length = 0;
    }
  }

  onEvent(type, a, b, c, d, e, f, g) {
    const r = this.renderer, au = this.audio;
    switch (type) {
      case EV.SWING: break;
      case EV.WHOOSH:
        au.play('attack', d === 1 ? null : a, b, c, d === 1 ? 0.8 : 0.9, d === 1 ? 0.92 : 1.05);
        break;
      case EV.GASH:
        au.play('impact', a, b, c, 1.1, 0.92);
        au.play('blocked', a, b, c, 0.7, 1.2);
        r.emit(2, 42, a, b, c, d, e, f, 0.9, 1.4, 6.5, 0.0018, 0.005, 0.2, 0.6);
        this.hud.once('gash', g < 2 ? 'The plate is cut. Strike that same cut again to go through. Your X turns red over it.' : 'A cut. Strike it again to go through.');
        r.emit(6, 8, a, b, c, d, e, f, 0.6, 0.3, 1.1, 0.004, 0.01, 0.5, 1.3);
                this.hud.crossHit();
        break;
      case EV.PUNCTURE: {
        au.play('impact', a, b, c, 1.2, 0.72);
        au.gore(a, b, c, 1.2, 0.5, 1100);
        au.gore(a, b, c, 0.9, 0.34, 2200);
        r.emit(0, 900, a, b, c, d, e + 0.1, f, 0.5, 0.8, 6.8, 0.0014, 0.011, 1.2, 3);
        r.emit(0, 80, a, b, c, d, e, f, 0.1, 5.5, 9, 0.002, 0.01, 1, 2);
        r.emit(1, 22, a, b, c, d, e, f, 0.9, 0.4, 2.5, 0.03, 0.08, 0.4, 0.9);
        r.emit(2, 30, a, b, c, d, e, f, 1.0, 1, 4.5, 0.002, 0.004, 0.2, 0.5);
        this.hud.crossHit();
        if (g < 2) this.hud.once('puncture', 'Through the armour. The knight is bleeding.', 3);
        break;
      }
      case EV.BLOCK:
        au.play('blocked', a, b, c, 1.2, 0.85);
        r.emit(2, 90, a, b, c, d, e, f, 1.1, 1.5, 6, 0.0022, 0.005, 0.2, 0.6);
        break;
      case EV.PARRY:
        au.play('parry', a, b, c, 1.3);
        r.emit(2, 200, a, b, c, 0, 0.3, 0, 1.6, 2, 8, 0.0022, 0.0055, 0.2, 0.8);
        break;
      case EV.WALL:
        au.play('blocked', a, b, c, 0.8, 0.7);
        r.emit(2, 26, a, b, c, d, e, f, 1, 1, 4, 0.002, 0.004, 0.15, 0.4);
        r.emit(3, 12, a, b, c, d, e, f, 1, 0.3, 1.2, 0.05, 0.12, 0.5, 1.1);
        break;
      case EV.GROUND:
        au.play('land', a, b, c, 1.0, 0.8);
        r.emit(3, 34, a, b + 0.03, c, 0, 1, 0, 1.3, 0.6, 2.4, 0.06, 0.15, 0.5, 1.3);
        r.emit(2, 10, a, b + 0.05, c, 0, 1, 0, 1, 1, 3, 0.002, 0.004, 0.15, 0.3);
        break;
      case EV.HURT:
        au.play('impact', a, b, c, 1.2, 1.15);
        au.gore(a, b, c, 0.6, 0.25, 900);
        r.emit(0, 60, a, b, c, 0, 0.2, 0, 1.2, 0.8, 2.6, 0.0025, 0.006, 0.8, 1.5);
        break;
      case EV.STEP: {
        const loud = d;
        if (f === -1) au.play(loud > 0.7 ? 'run' : 'walk', null, 0, 0, 0.2 + loud * 0.15, 1, false);
        else if (e === 2) {
          au.play('armorWalk', a, b, c, 0.35 + loud * 0.35, 1.55);
          if (loud > 0.6) r.emit(3, 1, a, b + 0.05, c, 0, 0.5, 0, 1, 0.15, 0.5, 0.05, 0.1, 0.4, 0.8);
        } else {
          au.play(loud > 0.6 ? 'armorRun' : 'armorWalk', a, b, c, 0.75 + loud * 0.4);
          if (loud > 0.45) r.emit(3, 2, a, b + 0.05, c, 0, 0.5, 0, 1, 0.15, 0.5, 0.05, 0.1, 0.5, 1);
        }
        break;
      }
      case EV.ROLL:
        au.play('armorRun', a, b, c, 1.3, 0.8);
        r.emit(3, 22, a, b + 0.08, c, 0, 0.6, 0, 1.2, 0.3, 1.4, 0.07, 0.17, 0.6, 1.5);
        break;
      case EV.GRUNT:
        if (d === 2) { au.gore(a, b, c, 0.5, 0.45, 3400); au.gore(a, b, c, 0.4, 0.3, 240); }
        break;
      case EV.CRAB_DIE:
        au.play('armorLand', a, b, c, 1.5, 0.6);
        au.gore(a, b, c, 0.9, 0.7, 500);
        r.emit(3, 50, a, b, c, 0, 0.6, 0, 1.6, 0.5, 2.4, 0.1, 0.25, 0.9, 2);
        break;
      case EV.DEATH:
        au.play('armorLand', a, b, c, 1.4, 0.75);
        au.play('impact', a, b, c, 1.3, 0.5);
        au.gore(a, b, c, 1, 0.9, 500);
        r.emit(3, 40, a, b - 0.8, c, 0, 0.6, 0, 1.5, 0.4, 2, 0.08, 0.2, 0.8, 1.8);
        break;
      case EV.GLINT:
        r.emit(2, 3, a, b, c, 0, 1, 0, 2, 0.1, 0.5, 0.004, 0.008, 0.1, 0.2);
        this.hud.once('glint', this.input.touch ? 'A blade flashes before it falls. DODGE, or swing into it to parry.' : 'A blade flashes before it falls. Q to dodge, or swing into it to parry.');
        break;
      case EV.JUMP: au.play('jump', null, 0, 0, 0.32, 1, false); break;
      case EV.DODGE: au.play('run', null, 0, 0, 0.5, 1.15, false); break;
      case EV.CRAB_WAKE: this.hud.once('crab', 'Something is coming out of the fields.'); break;
      case EV.WIN:
        au.play('impact', null, 0, 0, 0.8, 0.45);
        this.hud.tip('', 0.1);
        break;
      case EV.LOSE: au.play('armorLand', null, 0, 0, 1, 0.7); break;
      case EV.LAND: au.play('land', null, 0, 0, 0.25 + d * 0.4, 1, false); break;
      case EV.ALERT: au.play('draw', a, b, c, 1.2); break;
      case EV.SHIELD_BREAK:
        au.play('blocked', a, b, c, 1.4, 0.55);
        r.emit(2, 60, a, b, c, 0, 0.2, 0, 1.5, 1, 5, 0.0022, 0.005, 0.2, 0.6);
        this.hud.tip('The guard is broken.', 2);
        break;
      default: break;
    }
  }

  // A small console API, for playing with the scene and staging screenshots.
  api(shared, sim, buffer, pool) {
    const view = this;
    const cmd = (code, a = 0, b = 0, c = 0) => {
      shared.input[INPUT.ASPECT] = code;
      shared.input[INPUT.CMD_A] = a; shared.input[INPUT.CMD_B] = b; shared.input[INPUT.CMD_C] = c;
      shared.input[INPUT.CMD] += 1;
    };
    return {
      view, renderer: this.renderer, input: this.input, shared, pool,
      snap: () => view.currentSnap(),
      cmd,
      look: (yaw, pitch) => { view.input.yaw = yaw; view.input.pitch = pitch; },
      attack: () => { shared.input[INPUT.ATTACK] += 1; },
      wide: () => { shared.input[INPUT.WIDE] += 1; },
      jump: () => { shared.input[INPUT.JUMP] += 1; },
      setCam: (c) => { view.overrideCam = c; },
      fixScale: (s) => { view.fixedScale = true; view.renderer.scale = s; },
      shot: (name) => new Promise((resolve) => {
        view.onFrame = () => {
          view.onFrame = null;
          view.renderer.canvas.toBlob(async (blob) => {
            await fetch(`/shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
            resolve(name);
          }, 'image/png');
        };
      }),
    };
  }
}

main().catch((e) => { console.error(e); showFail(e.message); });
