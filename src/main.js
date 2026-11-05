// Boot: the permission gate, threads, GPU, assets, and the render thread's loop.
import { Audio } from './audio.js';
import { C, C_BLEEDS, C_SIZE, CHARS_START, CTRL, EV, EV_CAPACITY, EV_FLOATS, H, INPUT, MAX_CHARS, SNAP_FLOATS, STATE_NAMES, TACTICS, TOTAL_BYTES, WEAPONS, mapShared } from './core/layout.js';
import { clamp, damp, wrapAngle } from './core/math.js';
import { initGPU, isMobileDevice } from './gfx/gpu.js';
import { Governor } from './gfx/governor.js';
import { Clock } from './clock.js';
import { Renderer } from './gfx/renderer.js';
import { Input } from './input.js';
import { Drops, boardPose } from './items/drops.js';
import { GEAR, SHIELDS, colorOf, gearTotals, nameOf, rollArmor, rollGem, rollShield, rollWeapon, makeRng, writeWeapon } from './items/items.js';
import { Pack } from './items/pack.js';
import { addPart, capture, restore, saves } from './saves.js';
import { Chests } from './items/chests.js';
import { settings, Title } from './title.js';
import { SPELLS } from './sim/spells.js';
import { Inventory } from './ui/inventory.js';
import { SpellBar } from './ui/spellbar.js';
import { SpellSound } from './spellsound.js';

const BASE = new URL('..', import.meta.url).href;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const AUTO = params.has('auto');
const CONSENT_KEY = 'bm-threads-consent';
const AUTOSAVE_EVERY = 20;   // seconds of play between the saves Continue picks up
const title = new Title();
window.bmTitle = title;

// ---- job pool ----------------------------------------------------------------------------------------------

const FOE_NAMES = ['KNIGHT OF VELSCOUR', 'KNIGHT OF VELSCOUR', 'GREAT CRAB', 'GRAVEHART', 'BONE HYDRA', 'THE RISEN', 'OGRE'];

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

  startPlanners(buffer, budget, interval, threads = this.size) {
    this.workers.slice(0, threads).forEach((w, index) => w.postMessage({ id: 0, type: 'plan', args: { buffer, index: index + 1, budget, interval } }));
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
      else if (m.type === 'restart') { input.yaw = Math.PI; input.pitch = 0; hud.reset(); renderer.clearBlood(); game?.drops.clear(); }
      else if (m.type === 'placed') {
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
  let swordList, game = null;
  try {
    await Promise.all([
      fetch(`${BASE}assets/game/items/swords.json`).then((r) => r.json()).then((j) => { swordList = j; }),
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
    // On a phone every thread awake is heat the GPU then can't spend, so the planners take far less: the fight doesn't
    // need many rollouts to read, and they never slowed the frame on a PC.
    if (gpu.mobile) pool.startPlanners(buffer, 2, 80, 2);
    else pool.startPlanners(buffer, 4, 40);
  }

  // ---- the render thread's loop --------------------------------------------------------------------------------------

  game = new GameView(renderer, shared, input, audio, hud, gpu, simWorker, buffer);
  const pack = new Pack();
  pack.load(null);
  const arm = () => {
    writeWeapon(shared.input, pack.slots.main, gearTotals(pack.slots));
    renderer.gauntlets = pack.slots.hands ? GEAR[pack.slots.hands.base].suit : null;
    const off = pack.slots.off;
    shared.input[INPUT.SHIELD] = off ? 1 : 0;
    $('bWide').textContent = off && (WEAPONS.find((w) => w?.id === pack.slots.main?.base)?.hands || 1) === 1 ? 'GUARD' : 'WIDE';
    renderer.offHand = off ? off.base : null;
    renderer.board.sword = renderer.offHand;
  };
  arm();
  const inventory = new Inventory(pack, swordList, BASE, input.touch, {
    change: arm,
    drop: (item) => { const snap = game.currentSnap(); game.drops.fromPlayer(item, snap[H.PX], snap[H.PY], snap[H.PZ], input.yaw); },
  });
  Object.assign(game, { pack, inventory });
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
    if (fresh) hud.intro(!!pack.slots.main);
  };

  // ---- saving, loading and the menus ---------------------------------------------------------------------------------

  // What a save holds, part by part (saves.js): where you stand and which way you face, the time played, and the pack and
  // what's on the body. Quests will be a part of their own. What's lying on the ground isn't kept: a load starts the world fresh.
  let played = 0, playT = 0;
  addPart('player', {
    save: () => { const s = game.currentSnap(); return { x: s[H.PX], y: s[H.PY], z: s[H.PZ], yaw: input.yaw, pitch: input.pitch }; },
    load: (d) => simCall('place', d),   // (a fresh world, and you where the save says; null: where a new game starts)
    summary: () => 'Velscour village',
  });
  addPart('stats', {
    save: () => ({ played: Math.round(played) }),
    load: (d) => { played = d?.played || 0; },
    summary: (d) => `${Math.floor(d.played / 60)}:${String(d.played % 60).padStart(2, '0')} played`,
  });
  addPart('pack', {
    save: () => pack.save(),
    load: (d) => { pack.load(d); arm(); game.drops.clear(); },
  });
  addPart('chests', { save: () => game.chests.save(), load: (d) => game.chests.load(d) });
  addPart('clock', { save: () => ({ hour: renderer.hour }), load: (d) => renderer.setHour(d?.hour ?? 15) });
  // Not while you lie fallen.
  const canSave = () => input.enabled && !!game.currentSnap() && game.gameState() !== 2;
  const snapshot = () => (canSave() ? capture().catch((e) => { console.warn('save', e); return null; }) : Promise.resolve(null));
  // The game keeps itself as it's played: that's Continue.
  const autosave = async () => { const data = await snapshot(); if (data) saves.writeAuto(data); };
  game.onTaken = autosave;
  game.onTick = (dt) => {
    if (!input.enabled || state.paused) return;
    played += dt; playT += dt;
    if (playT > AUTOSAVE_EVERY) { playT = 0; autosave(); }
  };
  const loadInto = async (data) => {
    try { await restore(data); } catch (e) {
      await title.confirm({ title: 'Could not load', text: e.message, yes: 'Back', no: false });
      return false;
    }
    hud.reset(); renderer.clearBlood(); playT = 0;
    return true;
  };
  const startFrom = async (data) => { if (await loadInto(data)) enter(false); };
  const slotOptions = () => ({ canSave: canSave(), snapshot, restore: (d) => (input.enabled ? loadInGame(d) : startFrom(d)) });
  const loadInGame = async (d) => { if (await loadInto(d)) resume(); };
  const resume = () => { if (input.touch || AUTO) input.onPauseChange(false); else input.lock(); };
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
      played = 0; playT = 0;
      pack.load(null);
      arm();
      game.drops.clear();
      game.chests.load(null);
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
    else if (k === 'perf') hud.setDebug(v === 'on');
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
  if (settings.perf === 'on') hud.setDebug(true);
  input.onPauseChange = (paused) => {
    if (!input.enabled || inventory.open) return;
    if (paused && !state.paused) autosave();
    state.paused = paused;
    $('pause').style.display = paused ? 'flex' : 'none';
    shared.input[INPUT.PAUSE] = paused ? 1 : 0;
  };
  input.onLockRefused = () => input.onPauseChange(true);
  const openPack = () => {
    state.paused = true;
    shared.input[INPUT.PAUSE] = 1;
    input.menu = true;
    inventory.show();
    if (document.pointerLockElement) document.exitPointerLock();
  };
  // viaEsc: a browser won't lock the pointer again off the Esc key, so that stops at the pause screen, which will on a click.
  const openBook = () => {
    state.paused = true;
    shared.input[INPUT.PAUSE] = 1;
    input.menu = true;
    bookOpen = true;
    $('spellbook').classList.add('open');
    if (document.pointerLockElement) document.exitPointerLock();
  };
  const closeBook = (viaEsc) => {
    bookOpen = false;
    $('spellbook').classList.remove('open');
    input.menu = false;
    if (viaEsc === true && !input.touch && !AUTO) input.onPauseChange(true); else resume();
  };
  let bookOpen = false;
  game.spellbar = new SpellBar(shared, input, { openBook, closeBook, tip: (t) => hud.tip(t, 2.5) });
  addPart('spells', {
    save: () => game.spellbar.save(),
    load: (d) => game.spellbar.load(d),
  });
  game.closeBook = closeBook;
  const closePack = (viaEsc) => {
    inventory.hide();
    input.menu = false;
    autosave();
    if (viaEsc && !input.touch && !AUTO) input.onPauseChange(true); else resume();
  };
  $('invClose').onclick = () => closePack(false);
  $('bPause').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); input.onPauseChange(true); }, { passive: false });
  document.addEventListener('visibilitychange', () => {
    const hidden = document.hidden;
    shared.input[INPUT.PAUSE] = hidden || state.paused ? 1 : 0;
    if (hidden && audio.ctx) audio.ctx.suspend(); else if (audio.ctx && (input.enabled || title.up)) audio.ctx.resume();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && input.enabled && !input.menu && shared.snaps && game.gameState() !== 0) shared.input[INPUT.RESTART] += 1;
    if (!input.enabled || e.repeat) return;
    if (e.code === 'KeyI') { if (inventory.open) closePack(false); else if (!state.paused) openPack(); }
    if (e.code === 'KeyB') { if (bookOpen) closeBook(); else if (!state.paused) openBook(); }
    if (e.code === 'Escape' && bookOpen) closeBook(true);
    if (e.code === 'Escape' && inventory.open) closePack(true);
    if (e.code === 'KeyE' && !input.menu && !state.paused) game.takeNearest();
    if (e.code === 'F3') { e.preventDefault(); hud.toggleDebug(); }
  });
  $('bPack').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (input.enabled && !state.paused) openPack(); }, { passive: false });
  $('bTake').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (input.enabled && !state.paused) game.takeNearest(); }, { passive: false });
  $('touch').addEventListener('touchstart', () => {
    const snap = game.currentSnap();
    if (input.enabled && snap && snap[H.GAME] !== 0 && snap[H.GAME_T] > 1.5) shared.input[INPUT.RESTART] += 1;
  });
  game.run();
  $('controls').innerHTML = input.touch
    ? 'Left thumb moves. Right thumb looks, on or off the buttons. <b>CUT</b> swings, <b>WIDE</b> swings wide, or with a shield on, <b>GUARD</b> brings it up with a shove. <b>DODGE</b> gets you out. Tap a numbered spell to cast it, hold it to keep casting, and <b>B</b> beside them changes them. <b>PACK</b> holds your swords.'
    : '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move &nbsp; <kbd>Space</kbd> jump, hold it to ride your shield &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Q</kbd> dodge &nbsp; <kbd>1</kbd>-<kbd>6</kbd> cast, hold to keep casting &nbsp; <kbd>F</kbd> cast the last again &nbsp; <kbd>Wheel</kbd> choose &nbsp; <kbd>B</kbd> equip spells &nbsp; <kbd>Alt</kbd> cursor, to click a spell &nbsp; <kbd>Left click</kbd> cut &nbsp; <kbd>Right click</kbd> shield up with a shove, hold to keep it up, or a wide swing with no shield &nbsp; <kbd>I</kbd> pack &nbsp; <kbd>E</kbd> take or open';
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
    this.worst = 0; this.worstShown = 0;
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

  setDebug(on) { this.debug = on; $('debug').style.display = on ? 'block' : 'none'; }

  toggleDebug() { this.setDebug(!this.debug); }

  // A bar is scaled, not resized: that's the compositor's work alone, where a width means layout and paint on the
  // thread that's drawing the game.
  setBar(el, v) {
    if (Math.abs(v - el.shown) < 0.004) return;
    el.shown = v;
    el.style.transform = `scaleX(${v.toFixed(3)})`;
  }

  intro(armed) {
    this.tip(armed ? 'The dead are walking out in the fields. Cut them apart.' : `Your hands are empty. ${this.input.touch ? 'PACK' : 'Press I'} to take up a sword.`, 7);
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
      this.worstShown = this.worst; this.worst = 0;
    }
    this.worst = Math.max(this.worst, dt * 1000);
    this.t += dt;
    const onWound = snap[H.AIM_WOUND] > 0.5;
    if (onWound !== this.onWound) { this.onWound = onWound; $('cross').classList.toggle('wound', onWound); }
    if (this.t < 0.08) return;
    this.t = 0;
    this.setBar(this.stamEl, clamp(snap[H.STAMINA] / 100, 0, 1));
    this.setBar(this.hpEl, clamp(snap[H.HP] / snap[H.MAX_HP], 0, 1));
    // The bar is for whatever's closest and means you harm.
    let co = CHARS_START, near = 9;
    for (let i = 0; i < snap[H.NCHARS]; i++) {
      const o = CHARS_START + i * C_SIZE;
      if (snap[o + C.ACTIVE] < 0.5 || !snap[o + C.HOSTILE] || snap[o + C.STATE] === 10) continue;
      const d = Math.hypot(snap[o + C.X] - snap[H.PX], snap[o + C.Z] - snap[H.PZ]);
      if (d < near) { near = d; co = o; }
    }
    const hpf = clamp(snap[co + C.HP] / snap[co + C.MAX_HP], 0, 1);
    $('foe').style.opacity = near < 9 ? 1 : 0;
    const foeName = FOE_NAMES[snap[co + C.KIND]] || '';
    if (foeName !== this.foeNameShown) { this.foeNameShown = foeName; $('foeName').textContent = foeName; }
    this.setBar(this.foeHp, hpf);
    this.setBar(this.foeArm, clamp(snap[co + C.ARMOR], 0, 1));
    const bleeds = snap[co + C.N_BLEEDS];
    const bleedText = bleeds >= 3 ? 'BLEEDING OUT' : bleeds >= 1 ? 'BLEEDING' : '';
    if (bleedText !== this.bleedText) { this.bleedText = bleedText; $('bleed').textContent = bleedText; }
    const g = snap[H.GAME];
    if (g !== this.msgShown) {
      this.msgShown = g;
      const m = $('msg');
      const again = this.input.touch ? 'Tap to play again' : 'R to play again';
      if (g === 2) { m.innerHTML = `You have fallen<small>${again}</small>`; m.style.opacity = 1; }
    }
    if (this.debug) {
      const k = this.gpu.tier;
      $('debug').textContent = `${this.fps.toFixed(0)} fps   worst ${this.worstShown.toFixed(0)} ms   gpu busy ${stats.busyMs.toFixed(1)} ms${stats.gpuMs > 0 ? `   timer ${stats.gpuMs.toFixed(1)} ms` : ''}
${this.gpu.info.vendor || ''} ${this.gpu.info.architecture || ''}  tier ${k.name}
render ${stats.W}x${stats.H}  scale ${stats.scale.toFixed(2)}  msaa ${stats.msaa}  effects -${stats.demoted}  refresh ${stats.vsync.toFixed(1)} ms
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
    this.heartPrev = new Float32Array(MAX_CHARS);
    this.smokeT = 0; this.moteT = 0; this.overrideCam = null;
    this.govT = 0; this.govMs = 0; this.govN = 0; this.frozenSnap = null;
    this.prevSnap = new Float32Array(SNAP_FLOATS);
    this.drops = new Drops(renderer, audio);
    this.clock = new Clock($('clock'));
    this.chests = new Chests(renderer, audio, this.drops, renderer.things);
    this.nearChest = null;
    this.nearDrop = null;
    this.takeShown = null;
    this.hudStats = { gpuMs: 0, busyMs: 0, W: 0, H: 0, scale: 1, msaa: 1, demoted: 0, vsync: 0 };
    // Frames queued beyond this are only input lag. A phone's governor, and what it goes by.
    this.maxInFlight = gpu.tier.lean ? 2 : 3;
    this.vsyncMs = 1000 / 60; this.rafLast = 0; this.rafGaps = new Float32Array(45); this.rafN = 0; this.rafSkip = 0;
    if (gpu.mobile || gpu.tier.lean) this.governor = new Governor({ apply: (s) => { renderer.scale = s; }, demote: () => renderer.demote() });
    this.busySum = 0; this.busyN = 0; this.timed = []; this.benched = false;
    renderer.onBusy = (ms) => {
      this.busySum += ms; this.busyN++;
      if (this.idle && !this.benched) this.timeFrame(ms);
    };
  }

  // Under the title, before anyone's looking: what does this GPU make of this village? So the first fight already starts
  // where it can hold. (The first frames are pipelines being built, so they don't count.)
  timeFrame(ms) {
    if (!this.governor || this.fixedScale) { this.benched = true; return; }
    this.timed.push(ms);
    if (this.timed.length < 14) return;
    const typical = this.timed.slice(6).sort((a, b) => a - b)[4];
    this.timed.length = 0;
    const r = this.renderer;
    // Well over budget, multisampling goes (while it still can), and it's timed again without.
    if (typical > 25 && r.msaa > 1) { r.dropMSAA(); return; }
    this.governor.seed(typical);
    r.resize();
    this.benched = true;
  }

  // What the display refreshes at, from the time between callbacks.
  watchRefresh(now) {
    if (this.rafLast) {
      this.rafGaps[this.rafN++] = now - this.rafLast;
      if (this.rafN === this.rafGaps.length) { this.rafN = 0; this.vsyncMs = this.rafGaps.slice().sort()[this.rafGaps.length >> 1]; }
    }
    this.rafLast = now;
  }

  // The nearest thing on the ground, into the pack if there's room for it.
  takeNearest() {
    const d = this.nearDrop;
    if (!d) {
      if (this.nearChest) this.chests.open(this.nearChest);
      return;
    }
    if (d.coins) { this.pack.gold += d.item.amount; this.hud.tip(`${nameOf(d.item)}. ${this.pack.gold} in all.`, 2); }
    else if (!this.pack.add(d.item)) { this.hud.tip('Your pack is full.', 2); return; }
    this.drops.take(d);
    this.nearDrop = null;
    if (this.onTaken) this.onTaken();
  }

  updateDrops(dt, snap) {
    this.nearDrop = this.input.enabled && !this.input.menu ? this.drops.update(dt, snap[H.PX], snap[H.PY], snap[H.PZ]) : null;
    const d = this.nearDrop;
    const ch = this.chests.update(dt, snap[H.PX], snap[H.PY], snap[H.PZ], this.input.yaw);
    this.nearChest = this.input.enabled && !this.input.menu ? ch : null;
    const near = d || this.nearChest;
    if (near === this.takeShown) return;
    this.takeShown = near;
    $('take').style.display = near ? 'block' : 'none';
    $('bTake').style.display = near && this.input.touch ? 'flex' : 'none';
    $('bTake').textContent = d || !near ? 'TAKE' : 'OPEN';
    if (near) $('take').innerHTML = `${this.input.touch ? '' : '<kbd>E</kbd> '}${d ? `<span style="color:${colorOf(d.item)}">${nameOf(d.item)}</span>` : 'Open the chest'}`;
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
      this.watchRefresh(now);
      this.input.update();
      if (!this.buffer) this.sim.postMessage({ input: this.shared.input.slice() });
      // A phone on a 120 Hz screen takes every other refresh: a steady 60 is as smooth to the eye, and the battery and the
      // heat are what would slow it down later.
      if (this.gpu.mobile && this.vsyncMs < 10 && (this.rafSkip++ & 1)) return;
      // Don't get ahead of the GPU: what's on its way to the screen is already out of date.
      // (Unless a browser has stopped saying when the GPU's done, which mustn't freeze the game.)
      if (this.renderer.inFlight >= (this.idle ? 1 : this.maxInFlight) && performance.now() - this.renderer.lastSent < 1000) return;
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      const snap = this.currentSnap();
      if (!snap) return;
      // Under the title the village isn't drawn: a few frames, so the pipelines are built (and on a phone, timed), then nothing.
      if (this.idle) { if (this.idleFrames > (this.governor && !this.benched ? 40 : 3)) return; this.idleFrames = (this.idleFrames || 0) + 1; } else this.idleFrames = 0;
      if (this.onTick) this.onTick(dt);
      if (this.input.touch && this.input.enabled) this.aimAssist(dt, snap);
      this.processEvents(snap);
      this.updateCamera(dt, snap);
      this.emitAmbient(dt, snap);
      this.emitBleeds(dt, snap);
      this.updateTrail(dt, snap);
      this.updateDrops(dt, snap);
      const c = this.overrideCam || this.cam;
      this.renderer.frame(c, snap, this.sway, dt);
      this.audio.listener(c.x, c.y, c.z, c.fx, c.fy, c.fz, c.ux, c.uy, c.uz);
      if (!this.idle) this.govern(dt);
      const r = this.renderer, hs = this.hudStats;
      hs.gpuMs = r.stats.gpuMs; hs.busyMs = r.stats.busyMs; hs.W = r.W; hs.H = r.H; hs.scale = r.scale; hs.msaa = r.msaa; hs.demoted = r.demoted || 0; hs.vsync = this.vsyncMs;
      this.hud.update(dt, snap, hs);
      this.clock.set(r.hour);
      if (this.spellbar) this.spellbar.update(snap);
      if (this.spellSound) this.spellSound.channel(snap[H.CAST_HELD] | 0);
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

  // Dynamic resolution: hold the display's refresh rate, spend what's left on pixels. (Phones: gfx/governor.js.)
  govern(dt) {
    const r = this.renderer;
    this.govT += dt; this.govMs += dt * 1000; this.govN++;
    if (this.govT < (this.governor ? 1 : 1.5)) return;
    const frameMs = this.govMs / this.govN;
    const busyMs = this.busyN ? this.busySum / this.busyN : 0;
    this.govT = 0; this.govMs = 0; this.govN = 0; this.busySum = 0; this.busyN = 0;
    if (document.hidden) return;
    if (this.fixedScale) return;
    if (this.governor) {
      // A 90 Hz screen has no 60: it's 90 or 45, and 45 isn't worth a lot of resolution to escape.
      this.governor.lateMs = this.vsyncMs > 10 && this.vsyncMs < 13.5 ? 24 : 1000 / 60 * 1.14;
      this.governor.update(frameMs, busyMs, performance.now() / 1000);
      return;
    }
    const budget = Math.max(1000 / 144, Math.min(frameMs, 1000 / 60));
    const gpuMs = r.stats.gpuMs || busyMs;
    // Resolution moves in fixed steps, so each only has to be built once.
    const STEPS = [1, 0.88, 0.76, 0.66, 0.55];
    let step = STEPS.indexOf(r.scale);
    if (step < 0) step = 0;
    const tooSlow = gpuMs > budget * 0.92;
    const roomy = gpuMs < budget * 0.55;
    // Chasing a high-refresh display only ever spends resolution. Effects go only when 60 Hz itself is out of reach.
    const below60 = gpuMs > 15.3;
    this.fastRuns = roomy ? (this.fastRuns || 0) + 1 : 0;
    if (below60) {
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
    if (snap[H.SURF] > 0.5) {
      const hs = Math.hypot(snap[H.VX], snap[H.VZ]);
      if (hs > 0.5) { this.boardX = snap[H.VX] / hs; this.boardZ = snap[H.VZ] / hs; } else if (this.boardX === undefined) { this.boardX = 0; this.boardZ = 1; }
      boardPose(this.renderer.board.mat, snap[H.PX] + snap[H.VX] * age, snap[H.PY], snap[H.PZ] + snap[H.VZ] * age, this.boardX, this.boardZ, snap[H.ON_GROUND] > 0.5);
    }
    Object.assign(this.cam, { x: eyeX, y: eyeY, z: eyeZ, fx, fy, fz, ux, uy, uz });
    // The sword lags your hands a little. (It rides your steps in its own clip, great_idle.)
    this.swayX = damp(this.swayX, clamp(inp.yawVel * 1.5, -0.05, 0.05), 11, dt);
    this.swayY = damp(this.swayY, clamp(inp.pitchVel * 1.5, -0.05, 0.05), 11, dt);
    inp.yawVel = 0; inp.pitchVel = 0;
    const vy = Math.min(0, snap[H.VY]) * 0.002 + this.swayY;
    const vx = -this.swayX;
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
      case EV.SPELL_CAST:
        if (!this.spellSound) this.spellSound = new SpellSound(au);
        this.spellSound.gather(a);
        this.hud.once('cast', '1 to 6 cast what is in each slot: hold to keep casting. B changes them. Alt gives you a cursor to click them with.', 5);
        break;
      case EV.SPELL_LOOSE:
        if (!this.spellSound) this.spellSound = new SpellSound(au);
        this.spellSound.loose(a, c, d, e);
        break;
      case EV.SPELL_HIT:
        this.spellSound?.hit(a, b, c, d);
        r.emit(16 + a, 16, b, c, d, 0, 0.4, 0, 1.4, 1, 5.5, 0.008, 0.02, 0.2, 0.6);
        if (a !== 0 && a !== 9) this.hud.crossHit();
        break;
      case EV.SPELL_BOOM: {
        this.spellSound?.boom(a, b, c, d, e);
        const big = Math.min(4, e);
        r.emit(16 + a, Math.ceil(70 * big), b, c, d, 0, 0.5, 0, 1.6, 2 + big * 1.4, 7 + big * 3.5, 0.012, 0.03 + big * 0.012, 0.3, 0.9 + big * 0.22);
        if (a === 0) r.emit(6, Math.ceil(26 * big), b, c, d, 0, 1, 0, 1, 0.8, 3 + big, 0.012, 0.03, 0.8, 2.4);
        if (a === 11) { r.emit(3, Math.ceil(28 * big), b, c, d, 0, 0.7, 0, 1.2, 1, 4.5, 0.08, 0.26, 0.7, 1.7); r.emit(4, 3, b, c + 0.3, d, 0, 1, 0, 1, 0.2, 0.6, 0.5, 1, 1.6, 2.6); }
        if (a === 0 && e > 1.5) r.emit(4, Math.ceil(8 * big), b, c, d, 0, 1, 0, 1, 0.4, 1.8, 0.4, 1.1, 1.6, 3.4);
        break;
      }
      case EV.SPELL_FIZZLE:
        if (!this.spellSound) this.spellSound = new SpellSound(au);
        this.spellSound.fizzle();
        this.hud.tip('Not enough mana.', 1.2);
        break;
      case EV.WHOOSH:
        au.play('attack', d === 1 ? null : a, b, c, d === 1 ? 0.8 : 0.9, d === 1 ? 0.92 : 1.05);
        break;
      case EV.GASH:
        au.play('impact', a, b, c, 1.1, 0.92);
        if (r.chars[g]?.flesh) {
          // Rotten meat: no steel to ring or throw sparks, only the blood it was holding.
          au.gore(a, b, c, 0.8, 0.34, 1600);
          r.emit(0, 220, a, b, c, d, e + 0.1, f, 0.6, 0.8, 5.5, 0.0014, 0.009, 0.8, 2);
        } else {
          au.play('blocked', a, b, c, 0.7, 1.2);
          r.emit(2, 42, a, b, c, d, e, f, 0.9, 1.4, 6.5, 0.0018, 0.005, 0.2, 0.6);
        }
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
        if (!r.chars[g]?.flesh) r.emit(2, 30, a, b, c, d, e, f, 1.0, 1, 4.5, 0.002, 0.004, 0.2, 0.5);        this.hud.crossHit();
        if (g < 2) this.hud.once('puncture', 'Through the wound. Now it bleeds.', 3);
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
      case EV.HYDRA_NOTICE: this.hud.once('hydra', 'Three heads have turned your way. It has given you one warning.', 5); break;
      case EV.FIRE: {
        // One head's breath, this instant. A hiss under it, not on every puff.
        r.emit(7, 8, a, b, c, d, e, f, 0.13, 9, 16, 0.07, 0.24, 0.5, 0.95);
        if (Math.random() < 0.35) r.emit(6, 2, a, b, c, d, e + 0.15, f, 0.3, 4, 10, 0.012, 0.03, 0.6, 1.3);
        if (Math.random() < 0.2) r.emit(4, 1, a + d * 2, b + e * 2 + 0.5, c + f * 2, 0, 1, 0, 0.5, 0.4, 1.2, 0.4, 0.8, 1.2, 2.4);
        if (Math.random() < 0.2) au.gore(a, b, c, 0.32, 0.3, 2600);
        break;
      }
      case EV.FIRE_HIT:
        r.emit(7, 4, a, b + 0.1, c, 0, 1, 0, 1.2, 1, 3.2, 0.14, 0.34, 0.3, 0.7);
        if (Math.random() < 0.3) r.emit(4, 1, a, b + 0.3, c, 0, 1, 0, 0.8, 0.4, 1, 0.5, 0.9, 1.4, 2.6);
        break;
      case EV.BURN:
        au.gore(a, b, c, 0.4, 0.2, 1800);
        r.emit(7, 8, a, b, c, 0, 1, 0, 1, 0.8, 2.6, 0.08, 0.2, 0.25, 0.55);
        break;
      case EV.SEVER:
        // It comes off with a crack of bone, and everything that was in the neck comes after it.
        au.play('impact', a, b, c, 1.5, 0.7);
        au.gore(a, b, c, 1, 0.8, 420);
        r.emit(0, 170, a, b, c, d, e + 0.6, f, 1.1, 1.5, 6, 0.004, 0.012, 0.8, 1.7);
        r.emit(1, 30, a, b, c, 0, 0.5, 0, 1.4, 0.4, 1.8, 0.1, 0.28, 0.7, 1.4);
        r.emit(2, 22, a, b, c, d, e, f, 1.2, 1, 5, 0.003, 0.006, 0.2, 0.5);
        break;
      case EV.STUMP:
        r.emit(0, Math.ceil(14 * g), a, b, c, d, e, f, 0.3, 1.6 + 2.6 * g, 3 + 4 * g, 0.004, 0.01, 0.7, 1.3);
        break;
      case EV.CHUNK_LAND:
        au.play('armorLand', a, b, c, 0.5 + d * 0.9, 0.5);
        r.emit(3, Math.ceil(30 * d), a, b + 0.05, c, 0, 1, 0, 1.3, 0.4, 2.2, 0.08, 0.2, 0.5, 1.2);
        break;
      case EV.BEAST_NOTICE: this.hud.once('gravehart', 'Something in the trees has noticed you. Leave its ground and it may let you go.', 5); break;
      case EV.ROAR:
        // A stag's roar, far too big: a groan under a rasp, carrying a long way.
        au.gore(a, b, c, 1.6 * d, 1.7, 130); au.gore(a, b, c, 1.2 * d, 1.4, 240); au.gore(a, b, c, 0.5 * d, 1.1, 620);
        break;
      case EV.LOOT: this.drops.fromKill(a, b, c, d); break;
      case EV.EMPTY_HANDS: this.hud.tip(`Nothing in your hands. ${this.input.touch ? 'PACK' : 'Press I'} to take up a sword.`, 3); break;
      case EV.GROAN:
        // A throat with nothing behind it: a low drone under a wet rasp. d is how big the chest is.
        au.gore(a, b, c, 0.5 + 0.5 * d, 0.7 + 0.5 * d, (150 + Math.random() * 90) / (0.6 + 0.4 * d));
        au.gore(a, b, c, 0.22, 0.45, 520 + Math.random() * 300);
        break;
      case EV.DIRT:
        // The ground giving way. d is how much of it.
        if (d >= 1) au.gore(a, b, c, 0.5, 0.55, 240);
        r.emit(3, Math.ceil(26 * d) + 3, a, b + 0.05, c, 0, 1, 0, 1.2, 0.5, 2.6 * d + 0.5, 0.05, 0.16, 0.5, 1.3);
        break;
      case EV.CHANT:
        au.gore(a, b, c, 0.9, 1.4, 96); au.gore(a, b, c, 0.45, 1.2, 190);
        break;
      case EV.BLINK:
        au.gore(a, b, c, 0.5, 0.25, 1500);
        r.emit(4, 16, a, b, c, 0, 1, 0, 1.3, 0.3, 1.2, 0.2, 0.5, 0.4, 0.9);
        break;
      case EV.UNDEAD_DIE:
        au.gore(a, b, c, 0.8, 0.6, 300);
        r.emit(3, 26, a, b, c, 0, 0.6, 0, 1.4, 0.4, 1.6, 0.08, 0.2, 0.7, 1.5);
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
      view, renderer: this.renderer, input: this.input, shared, pool, pack: this.pack, inventory: this.inventory, drops: this.drops,
      // bm.give('frost_sword', { rarity: 3, sockets: 4 }) or bm.give('gem', { kind: 'ruby', grade: 2 }), into the pack.
      give: (base, opts = {}) => {
        const rng = makeRng((Math.random() * 4294967296) >>> 0);
        const item = base === 'gem' ? rollGem(rng, opts) : SHIELDS[base] ? rollShield(rng, { base }) : GEAR[base] ? rollArmor(rng, { base, ...opts }) : rollWeapon(rng, { base, ...opts });
        return view.pack.add(item) ? item : null;
      },
      // Lays one on the ground beside the player: bm.lay('fluked_greatsword', { rarity: 2 }).
      lay: (base, opts = {}) => {
        const rng = makeRng((Math.random() * 4294967296) >>> 0);
        const s = view.currentSnap();
        view.drops.fromPlayer(base === 'gem' ? rollGem(rng, opts) : SHIELDS[base] ? rollShield(rng, { base }) : GEAR[base] ? rollArmor(rng, { base, ...opts }) : rollWeapon(rng, { base, ...opts }), s[H.PX], s[H.PY], s[H.PZ], view.input.yaw);
      },
      snap: () => view.currentSnap(),
      cmd,
      look: (yaw, pitch) => { view.input.yaw = yaw; view.input.pitch = pitch; },
      attack: () => { shared.input[INPUT.ATTACK] += 1; },
      wide: () => { shared.input[INPUT.WIDE] += 1; },
      spell: (i) => { const n = typeof i === 'number' ? i : SPELLS.findIndex((s) => s.key === i); view.spellbar.pick(n); return n; },
      cast: (held = 0) => { shared.input[INPUT.CAST_N] += 1; shared.input[INPUT.CAST] = held; },
      castKey: () => shared.input[INPUT.CAST],
      book: () => $('spellbook').classList.toggle('open'),
      jump: () => { shared.input[INPUT.JUMP] += 1; },
      setCam: (c) => { view.overrideCam = c; },
      setTime: (h) => view.renderer.setHour(h),
      hour: () => view.renderer.hour,
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
