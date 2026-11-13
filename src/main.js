// Boot: the permission gate, threads, GPU, assets, and the render thread's loop.
import { setOpeningTerrain } from './core/terrain.js';
import { GROUPS, GROUP_KEYS, TRIPO_KIND } from './core/tripo-monsters.js';
import { BOSSES as DELVE_BOSSES, DELVE as DELVE_CODE } from './core/dungeon.js';
import { OPENING, OPENING_REVISION } from './core/opening.js';
import { OpeningHUD } from './ui/opening.js';
import { ChatLog } from './ui/chatlog.js';
import { QuestTrail } from './ui/trail.js';
import { Audio } from './audio.js';
import { Music } from './music.js';
import { inTown } from './core/town.js';
import { C, C_BLEEDS, C_SIZE, CHARS_START, CTRL, EV, EV_CAPACITY, EV_FLOATS, H, INPUT, MAX_CHARS, SNAP_FLOATS, STATE_NAMES, TACTICS, TOTAL_BYTES, WEAPONS, mapShared } from './core/layout.js';
import { clamp, damp, lerp, smoothstep, wrapAngle } from './core/math.js';
import { FileWatch, getFile, watchFiles } from './core/files.js';
import { initGPU, isMobileDevice, lighten } from './gfx/gpu.js';
import { Governor } from './gfx/governor.js';
import { STEPS as DESK_STEPS, deskStep } from './gfx/deskscale.js';
import { RenderDiagnostics } from './gfx/render-diagnostics.js';
import { Clock } from './clock.js';
import { Renderer } from './gfx/renderer.js';
import { Input } from './input.js';
import { Drops, boardPose } from './items/drops.js';
import { settleSkull } from './items/skins.js';
import { ROBES, ROBE_SETS, SET_PARTS, SHIELDS, SKULLS, colorOf, gearTotals, nameOf, rollGem, rollRobe, rollShield, rollSkull, rollWeapon, makeRng, writeWeapon } from './items/items.js';
import { levelPerks, stepXp, xpFor, XP_OF } from './items/levels.js';
import { GemFx } from './gfx/gemfx.js';
import { Pack } from './items/pack.js';
import { addPart, capture, restore, saves } from './saves.js';
import { Chests } from './items/chests.js';
import { Doors } from './items/doors.js';
import { saveSettings, settings, Title } from './title.js';
import { ViewSwitch } from './ui/view.js';
import { paintIcons, setIcon } from './ui/icons.js';
import { place as placeThumbs } from './ui/thumbs.js';
import { loadSkin } from './ui/skin.js';
import { SKIN_PARTS, pickSets } from './gfx/bodyskin.js';
import { THIRD } from './core/third.js';
import { SPELLS } from './sim/spells.js';
import { TIER_LEVEL, TIER_OF } from './sim/skills.js';
import { Inventory } from './ui/inventory.js';
import { SpellBar } from './ui/spellbar.js';
import { WorldMap } from './ui/map.js';
import { WildsUI } from './ui/wilds.js';
import { SpellSound } from './spellsound.js';
import { HERO_SLOTS, makeCast, withBrokers } from './core/heroes.js';
import { HeroTalk } from './ui/heroes.js';
import { PartyUI } from './ui/party.js';
import { TownClient } from './folk/client.js';
import { FolkBodies } from './gfx/folk.js';
import { TownUI } from './ui/folk.js';
import { hands, matName, RARITIES } from './items/items.js';
import { Lands } from './ui/lands.js';
import { AutoPlay } from './ui/autoplay.js';
import { FoeBars, isBoss } from './ui/foebars.js';
import { Arrange } from './ui/arrange.js';
import { groundAt, setHomes } from './ui/places.js';
import { HallUI } from './ui/testhall.js';
import { HALL, SPAWN, hallAt } from './core/testhall.js';
import { beginRun, deathWords, noteRun } from './core/lastrun.js';

const BASE = new URL('..', import.meta.url).href;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const AUTO = params.has('auto');
// How the last run ended, and how light to load (src/core/lastrun.js). (Tests under ?auto are killed, not left: not judged.)
const RUN = AUTO && !params.has('light') ? { died: null, light: 0 } : beginRun(params);
const renderDiagnostics = new RenderDiagnostics(params.has('diagnose'));
// Every new game begins with the witch in the cave.
const OPENING_ENABLED = !params.has('noopening');   // (?noopening starts in the town, for tests)
const CONSENT_KEY = 'bm-threads-consent';
// What a start downloads, for the keep-files question: 375 MB over about 940 files, measured by tools/keep_check.mjs
// (2026-11-09, a fresh browser, desktop graphics).
const KEEP_MB = 375;
const AUTOSAVE_EVERY = 20;   // seconds of play between the saves Continue picks up
const title = new Title();
window.bmTitle = title;

// ---- job pool ----------------------------------------------------------------------------------------------

// (From 11 on, the Tripo monsters' groups: src/core/tripo-monsters.js.)
const FOE_NAMES = ['KNIGHT OF VELSCOUR', 'KNIGHT OF TESSARIEL', 'GREAT CRAB', 'GRAVEHART', 'BONE HYDRA', 'THE RISEN', 'OGRE', '', '', 'WEREWOLF', 'ABYSSAL MOUTH',
  ...GROUP_KEYS.map((g) => GROUPS[g].name)];

// A picture to decode is passed straight to the thread with the fewest in hand: the decoding is the browser's, off to one
// side, and the thread is free again at once. Anything else is work that keeps its thread until it's done, so those wait
// in a line and each thread takes one at a time: a picture then never waits behind more than one piece of it (the land is
// cut into small pieces for that, src/gfx/renderer.js load).
class Pool {
  constructor(size) {
    this.size = 0;
    this.workers = [];
    this.waiting = new Map();
    this.next = 1;
    this.line = [];        // work waiting for a thread
    this.working = [];     // which threads have a piece of work
    this.decoding = [];    // how many pictures each has in hand
    this.leaving = [];     // lent for the load, and to go once idle
    for (let i = 0; i < size; i++) this.add();
  }

  add() {
    const i = this.workers.length;
    const w = new Worker(new URL('./sim/job.worker.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      const { id, result, error } = e.data;
      const p = this.waiting.get(id);
      this.waiting.delete(id);
      if (!p) return;
      if (p.light) this.decoding[i]--; else { this.working[i] = false; this.hand(); }
      this.dismiss(i);
      if (error) p.reject(new Error(error)); else p.resolve(result);
    };
    w.onerror = (e) => { console.error('job worker', e.message); };
    this.workers.push(w);
    this.working[i] = false; this.decoding[i] = 0;
    this.size = this.workers.length;
  }

  /** More threads for the load: the two kept for the simulation and the drawing have little to do until the game is up. */
  lend(n) { for (let k = 0; k < n; k++) this.add(); return n; }

  /** And given back once the load is done: each as soon as it has nothing in hand. */
  takeBack(n) {
    this.size -= n;
    for (let i = this.size; i < this.size + n; i++) { this.leaving[i] = true; this.dismiss(i); }
  }

  dismiss(i) {
    if (this.leaving[i] && !this.working[i] && !this.decoding[i]) { this.workers[i].terminate(); this.leaving[i] = false; }
  }

  run(type, args, transfer) {
    const id = this.next++;
    return new Promise((resolve, reject) => {
      const job = { id, type, args, transfer, resolve, reject, light: type === 'decode' };
      if (job.light) {
        let to = 0;
        for (let i = 1; i < this.size; i++) if (this.decoding[i] < this.decoding[to]) to = i;
        this.decoding[to]++;
        this.send(to, job);
      } else { this.line.push(job); this.hand(); }
    });
  }

  /** The next pieces of work, to whichever threads have none. */
  hand() {
    for (let i = 0; i < this.size && this.line.length; i++) {
      if (this.working[i]) continue;
      this.working[i] = true;
      this.send(i, this.line.shift());
    }
  }

  send(i, job) {
    this.waiting.set(job.id, job);
    this.workers[i].postMessage({ id: job.id, type: job.type, args: job.args }, job.transfer || []);
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
    const reg = await navigator.serviceWorker.register(settings.keep === 'yes' ? 'coi-sw.js?keep=1' : 'coi-sw.js');
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

// ---- keeping the game on this device (coi-sw.js) -------------------------------------------------------------------

const canKeep = () => 'serviceWorker' in navigator && window.isSecureContext && 'caches' in window;

/** Asked once, before the title. Kept, the next start reads the files from here and downloads only what has changed. */
function askKeep() {
  return new Promise((resolve) => {
    $('card').style.display = '';
    $('card').innerHTML = `<b>Keep Bellmourn on this device?</b><br>
      The game downloads about ${KEEP_MB} MB as it starts. Kept here, the next start reads those files from your device and
      downloads only what has changed since (it checks once, at the start). Not kept, they come down every time.
      <div class="small">They're kept in this browser's storage for this site. You can change your mind in Settings, under Game files, which also clears them.</div>`;
    $('buttons').innerHTML = '<button class="big" id="keepYes">KEEP IT HERE</button><button class="alt" id="keepNo">Download each time</button>';
    const pick = (v) => {
      title.unlock();
      settings.keep = v;
      saveSettings();
      const sel = document.querySelector('[data-k="keep"]');
      if (sel) sel.value = v;
      $('card').textContent = 'Preparing...';
      $('buttons').innerHTML = '';
      resolve(v);
    };
    $('keepYes').onclick = () => pick('yes');
    $('keepNo').onclick = () => pick('no');
  });
}

/** The service worker as the player wants it: keeping the files, or not. (It also lends shared memory where the host can't.) */
async function useStore(keep) {
  if (!canKeep()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const keeping = ((reg?.active || reg?.waiting || reg?.installing)?.scriptURL || '').includes('keep=1');
    if (keep !== keeping && (keep || reg)) await navigator.serviceWorker.register(keep ? 'coi-sw.js?keep=1' : 'coi-sw.js');
    if (keep) navigator.storage?.persist?.().catch(() => { /* the browser's call */ });
    else await Promise.all(['bm-files-v1', 'bm-meta-v1'].map((k) => caches.delete(k)));
  } catch (e) { console.warn('game files', e); }
}

function showFail(message) {
  $('card').innerHTML = `<b>This game needs WebGPU.</b><br>${message}<div class="small">Current versions of Chrome, Edge and Safari have it, on PC and on phones. Firefox has it on Windows. If yours is up to date, check that hardware acceleration is on.</div>`;
  $('buttons').innerHTML = '';
}

async function main() {
  const mobile = isMobileDevice();
  const plan = threadPlan(mobile);
  if (!navigator.gpu) { showFail('This browser does not offer it.'); return; }
  // (?keep: keep the files, unasked, for tests of coi-sw.js.)
  if (AUTO) { if (params.has('keep')) { settings.keep = 'yes'; await useStore(true); } boot(plan, plan.pool); return; }
  // The title comes up once the page won't reload under it for shared memory, and the game loads behind it.
  const go = async (pool) => {
    if (settings.keep === 'ask' && canKeep()) await askKeep();
    await useStore(settings.keep === 'yes');
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

// (A lost GPU, src/main.js boot: when it last happened, and that Continue's to be offered once the page is back.)
const GPU_LOST_AT = 'velscour.gpuLostAt', GPU_LOST_OFFER = 'velscour.gpuLostOffer', GPU_LOST_NOTE = 'velscour.gpuLostNote';
let keepForReset = null;          // saves the game for Continue, once there's a game to save
let gpuNote = null;               // what the GPU was doing as it went: told when Continue's offered, for the next fix
let leaving = false;              // the page going away: a GPU lost then is only the page shutting
addEventListener('pagehide', () => { leaving = true; });

async function boot(plan, poolSize) {
  $('card').style.display = 'none';
  $('buttons').innerHTML = '';
  $('bar').style.display = 'block';
  // The bar only goes forward, and holds short of the end until the game is ready to play: 100% is shown as the title's
  // menu comes up, and not before. (It used to count past 100%, to 114%, on a guess at how many steps the load had.)
  // Under it, the file coming down: every thread's fetches are told to `files` (src/core/files.js).
  let shown = 0, fileAsked = false;
  const files = new FileWatch();
  const paint = () => {
    const pct = Math.floor(shown * 100);
    $('bar').firstElementChild.style.width = `${pct}%`;
    $('file').textContent = files.name;
    if (title.up && shown < 1) title.progress(pct, files.name);
  };
  const setProgress = (t, msg, final = false) => {
    shown = final ? 1 : Math.max(shown, Math.min(0.99, t));
    if (msg) $('status').textContent = msg;
    paint();
  };
  // (Files come and go by the dozen: the name on screen is brought up to date once a frame.)
  const fileNoted = (f) => {
    files.note(f);
    if (fileAsked) return;
    fileAsked = true;
    requestAnimationFrame(() => { fileAsked = false; if (shown < 1) paint(); });
  };
  watchFiles(fileNoted);
  setProgress(0.02, 'Waking the GPU...');
  let gpu;
  try { gpu = await initGPU(settings.gfx); } catch (e) { failOnTitle(''); showFail(e.message); return; }
  // (A phone whose browser closed the game last time loads lighter: src/core/lastrun.js.)
  if (gpu.mobile && RUN.light) gpu.tier = lighten(gpu.tier, RUN.light);
  noteRun({ stage: 'loading' });
  // A lost GPU: a phone or tablet takes its graphics back (its memory, a GPU that hung, the app put away), and Safari calls
  // that 'destroyed' too, so it's any loss (the game never destroys its own). Where you are is kept, and the page comes back
  // to the menu with Continue offered (gpuLostOffer, below). Not if it went the same way within the last minute: then it
  // says so, rather than reload over and over.
  gpu.device.lost.then(async (info) => {
    if (leaving) return;
    console.error('device lost', info.reason, info.message);
    renderDiagnostics.fail(new Error(info.message || 'no message'), `device lost (${info.reason})`);
    let last = 0;
    try { last = +sessionStorage.getItem(GPU_LOST_AT) || 0; } catch { /* no storage */ }
    if (Date.now() - last < 60000) { failOnTitle('The graphics reset again. Reload the page to carry on: your game is kept for Continue.'); return; }
    try {
      sessionStorage.setItem(GPU_LOST_AT, String(Date.now())); sessionStorage.setItem(GPU_LOST_OFFER, '1'); sessionStorage.setItem('velscour.skipSplash', '1');
      sessionStorage.setItem(GPU_LOST_NOTE, gpuNote?.() || '');
    } catch { /* no storage */ }
    noteRun({ ended: 'gpu', gpu: gpuNote?.() || '' });
    failOnTitle('The graphics reset. Keeping your game, and starting again...');
    await Promise.race([keepForReset?.(), new Promise((r) => setTimeout(r, 3000))]).catch(() => {});
    leaving = true;
    location.reload();
  });
  let gpuErrors = 0;
  gpu.device.addEventListener('uncapturederror', (e) => { window.__gpuErrors = ++gpuErrors; renderDiagnostics.fail(e.error, 'GPU validation'); if (gpuErrors < 6) console.error('GPU error:', e.error.message); });
  const canvas = $('view');
  const pool = new Pool(poolSize);
  // While the game loads, the threads kept back for the simulation and the drawing work on it too (not on a phone, where
  // every thread is memory and heat, nor when fewer threads were asked for).
  const lent = !gpu.mobile && poolSize === plan.pool ? pool.lend(Math.max(0, Math.min(2, plan.cores - 1 - poolSize))) : 0;
  const isolated = window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined' && !params.has('nosab');
  const buffer = isolated ? new SharedArrayBuffer(TOTAL_BYTES) : null;
  const shared = buffer ? mapShared(buffer) : mapShared(new ArrayBuffer(TOTAL_BYTES));
  const input = new Input(canvas, shared.input);
  // The world holds still under the title.
  if (!AUTO) shared.input[INPUT.PAUSE] = 1;
  setProgress(0.05, `Loading with ${poolSize} threads...`);

  const renderer = new Renderer(gpu, canvas, pool);
  renderer.openingEnabled = OPENING_ENABLED;
  setOpeningTerrain(OPENING_ENABLED);
  const simWorker = new Worker(new URL('./sim/sim.worker.js', import.meta.url), { type: 'module' });
  // The townsfolk, on a thread of their own (src/folk/). The sim has where they stand, to bump you off them.
  const town = new TownClient(BASE, isolated, !!gpu.mobile);
  renderer.folk = new FolkBodies(renderer, town.map);
  town.onReady = (m) => renderer.folk.setBeds(m.beds);
  if (town.buffer) simWorker.postMessage({ type: 'folk', buffer: town.buffer });
  const audio = new Audio(BASE, title.ctx, title.out, settings.ambience);
  // The music of where you are, and a fight's (src/music.js), down the title's music line: the Music setting is its volume.
  const music = new Music(BASE, title.ctx, title.musicBus, () => settings.music);
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
      else if (m.type === 'file') fileNoted(m);
      else if (m.type === 'snap') { latestSnap = m.snap; if (m.events) pendingEvents.push(m.events); }
      else if (m.type === 'look') { input.yaw = m.yaw; input.pitch = m.pitch; }
      else if (m.type === 'heroState') { const c = calls.get(m.id); calls.delete(m.id); c?.resolve(m.heroes); }
      else if (m.type === 'warrens') { game?.party?.onWarrens(m); renderer?.setScenery?.(m.flipped); }
      // (What monsters have marked on the ground and thrown, near you: src/sim/perils.js. Auto-play steps out of it.)
      else if (m.type === 'perils') { if (game) game.perils = { marks: m.marks, shots: m.shots, at: performance.now() }; }
      else if (m.type === 'hall') game?.hallUI?.onHall(m);
      else if (m.type === 'hallSummoned') game?.hallUI?.onSummoned(m);
      else if (m.type === 'restart') { input.yaw = m.yaw ?? Math.PI; input.pitch = 0; hud.reset(); renderer.clearBlood(); game?.drops.clear(); }
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
  // The other Tessariels this session (src/core/heroes.js): who they are is kept, so the same people are about next time.
  // How many: by the tier, the setting, or ?heroes=N for tests.
  const heroCount = params.has('heroes') ? Number(params.get('heroes')) : settings.heroes === 'off' ? 0
    : Math.min(settings.heroes === 'few' ? 8 : 99, HERO_SLOTS[gpu.tier.lean ? 'lean' : 'desktop'],
      // (Each is a body, its pictures and its rig, some 10 MB: a phone that's been killed once has four, twice two. Not
      // none: the quartermasters come with the cast, and they're how a party is hired.)
      gpu.mobile && RUN.light ? (RUN.light > 1 ? 2 : 4) : 99);
  let cast = [];
  if (heroCount > 0) {
    try {
      const [roster, kit, names] = await Promise.all(['roster', 'kit', 'names'].map((n) => getFile(`${BASE}assets/game/heroes/${n}.json`, 'json')));
      let kept = null;
      try { kept = JSON.parse(localStorage.getItem('bm.heroes') || 'null'); } catch { /* none */ }
      const seed = kept?.seed || Math.floor(Math.random() * 2 ** 31);
      try { localStorage.setItem('bm.heroes', JSON.stringify({ ...(kept || {}), seed })); } catch { /* full */ }
      cast = withBrokers(makeCast(roster, kit, names, Math.min(heroCount, 16), seed, params.get('bodies')?.split(',') || null), roster, kit, !!gpu.tier.lean);
    } catch (e) { console.warn('heroes', e); cast = []; }
  }
  renderer.heroCast = cast;
  simWorker.postMessage({ type: 'boot', buffer, hz, base: BASE, opening: OPENING_ENABLED, heroes: cast, hour: renderer.hour, lean: !!gpu.mobile });

  const hud = new Hud(gpu, plan, poolSize, isolated, input);
  const start = performance.now();
  let swordList, game = null, simMs = 0;
  try {
    await Promise.all([
      getFile(`${BASE}assets/game/items/swords.json`, 'json').then((j) => { swordList = j; }),
      renderer.load(BASE, (t) => setProgress(0.05 + t * 0.9, 'Building the village...')),
      simReady.then(() => { simMs = performance.now() - start; }),
      audio.load().catch((e) => console.warn('audio', e)),
    ]);
  } catch (e) {
    failOnTitle(`Failed to load: ${e.message}`);
    console.error(e);
    return;
  }
  const loadMs = performance.now() - start;
  pool.takeBack(lent);
  setProgress(0.99, 'Opening the gates...');
  // Tasks for the pool once the load is done: thinking about the fight.
  if (buffer) {
    shared.ctrl[CTRL.PLAN_RUN] = 1;
    // On a phone every thread awake is heat the GPU then can't spend, so the planners take far less: the fight doesn't
    // need many rollouts to read, and they never slowed the frame on a PC.
    if (gpu.mobile) pool.startPlanners(buffer, 2, 80, 2);
    else pool.startPlanners(buffer, 4, 40);
    // (The planners keep their threads for good, so the land laid again round you out in the countries has one of its own.)
    renderer.landPool = renderer.landPool || new Pool(1);
  }

  // ---- the render thread's loop --------------------------------------------------------------------------------------

  game = new GameView(renderer, shared, input, audio, hud, gpu, simWorker, buffer);
  game.town = town;
  town.on((e) => game.townEvent(e));
  addPart('town', { save: () => town.save(), load: (d) => town.load(d) });
  renderer.folk.load(BASE).catch((e) => console.warn('townsfolk', e));
  const pack = new Pack();
  pack.load(null);
  const worldMap = new WorldMap(BASE, input.touch, renderer.landPool);
  worldMap.load(null);
  worldMap.input = input;
  game.worldMap = worldMap;
  // What of the land you've seen.
  addPart('map', { save: () => worldMap.save(), load: (d) => worldMap.load(d) });
  game.gemFx = new GemFx(renderer);
  const GEM_COLOR = (g) => ({ ruby: '#d8362c', topaz: '#e2a63a', emerald: '#3fb56a', sapphire: '#3f7fe0', amethyst: '#a45ad6', diamond: '#cfe6ee' }[g.kind]);
  // (bm.wear('crimson_regalia') dresses the whole body in one set, to look at it; bm.wear() goes back to what's worn.)
  let forcedSkin = null;
  const wearSkins = () => {
    const skin = renderer.bodySkin;
    if (!skin) return;
    skin.ready.then(() => skin.wear(forcedSkin ? Object.fromEntries(SKIN_PARTS.map((p) => [p, forcedSkin])) : pickSets(skin.sets, pack.slots))).catch((e) => console.warn('body skin', e));
  };
  game.wearSkin = (id) => { forcedSkin = id || null; wearSkins(); };
  const arm = () => {
    writeWeapon(shared.input, pack.slots.main, gearTotals(pack.slots), levelPerks(pack.level));
    // (GOD MODE, from the skull: everything dies at one blow.)
    if (game.lands?.cheats.god) for (const k of [INPUT.POWER, INPUT.W_MIN, INPUT.W_MAX]) shared.input[k] *= 1000;
    // (Bare hands: the gauntlet code is still in the renderer, nothing asks for it.)
    renderer.gauntlets = null;
    const off = pack.slots.off, skull = pack.slots.skull;
    shared.input[INPUT.SHIELD] = off ? 1 : 0;
    shared.input[INPUT.SKULL] = skull ? 1 : 0;
    $('bWide').style.display = off && !skull ? 'flex' : '';
    renderer.offHand = off && !skull ? off.base : null;
    // (What the body you see in third person holds: src/gfx/renderer.js selfItems.)
    renderer.mainHand = pack.slots.main && hands(pack.slots.main.base) === 3 ? pack.slots.main.base : null;
    // And what it wears: the robes in the pack's slots, by the sets of gear made for them (src/gfx/bodyskin.js).
    wearSkins();
    renderer.board.sword = off ? off.base : null;
    if (off) renderer.sword('surf_arm');     // (Ready before the first landing.)
    renderer.skull = skull ? skull.base : null;
    renderer.skullItem = skull ? settleSkull(skull) : null;
    if (skull) renderer.sword('skull_gems');
    renderer.board.glow = off?.gems?.length ? GEM_COLOR(off.gems[0]) : null;
    showLevel();
    // (Your level may have changed: the points it's earned, on the book's button and in the book.)
    if (game.spellbar) { game.spellbar.skills.fit(); game.spellbar.draw(); if ($('spellbook').classList.contains('open')) game.spellbar.drawMenu(); }
  };
  const showLevel = () => {
    // (The level in its medal, and round it how far to the next: src/ui/hud.css #levelBox.)
    $('levelNum').innerHTML = `<em>Level </em>${pack.level}`;
    const lo = xpFor(pack.level), hi = xpFor(pack.level + 1), far = Math.max(0, Math.min(100, (pack.xp - lo) / (hi - lo) * 100));
    $('xpBar').firstElementChild.style.width = `${far}%`;
    $('levelBox').style.setProperty('--xpf', far.toFixed(1));
  };
  // A kill's worth of experience, and whatever that buys. The sim only says something died.
  // (kind: what it leaves, drops.js; what: 1 + what it was. A Tripo monster's worth goes by its life too, so the tough ones
  // out in the countries pay for the time they take: src/core/tripo-monsters.js GROUPS.)
  game.gainXp = (kind, what = 0) => {
    renderer.skullEyes?.feel('glee', 3);
    const g = what - 1 >= TRIPO_KIND ? GROUPS[GROUP_KEYS[what - 1 - TRIPO_KIND]] : null;
    game.addXp(Math.max(XP_OF[kind | 0] ?? 10, g ? Math.round(g.hp * 0.35) : 0));
  };
  // So much experience, for whatever earned it (a kill above; a tear sealed, an outpost cleared: src/ui/wilds.js).
  game.addXp = (amount) => {
    if (!stepXp(pack, amount)) { showLevel(); return; }
    arm();
    game.party?.levelled();
    // A new level fills you up, as it should.
    shared.input[INPUT.HEAL] += 9999; shared.input[INPUT.MANA_UP] += 9999;
    const snap = game.currentSnap();
    for (const e of [4, 5, 10]) renderer.emit(16 + e, 90, snap[H.PX], snap[H.PY] + 1, snap[H.PZ], 0, 1, 0, 1.6, 1, 5, 0.012, 0.03, 0.5, 1.4);
    audio.play('draw', null, 0, 0, 1, 0.6, false);
    hud.tip(`Level ${pack.level}. Your spells bite harder, your well runs deeper, and there's a point to spend in your spellbook${input.touch ? '' : ' (B)'}.`, 5);
  };
  arm();
  // The living land: what's happening out there, told and paid for (src/ui/wilds.js; the sim's side is src/sim/wilds.js).
  game.wilds = new WildsUI({ touch: input.touch, xp: (n) => game.addXp(n), drop: (x, y, z, kind) => game.drops?.fromKill(x, y, z, kind), log: (t) => game.chatLog?.system(t),
    pos: () => { const s = game.currentSnap?.(); return s ? [s[H.PX], s[H.PZ]] : null; } });
  hud.wildName = (model) => renderer.tripo?.wildName(model);
  addPart('wilds', { save: () => game.wilds.save(), load: (d) => game.wilds.load(d) });
  const inventory = new Inventory(pack, swordList, BASE, input.touch, {
    change: arm,
    drop: (item) => { const snap = game.currentSnap(); game.drops.fromPlayer(item, snap[H.PX], snap[H.PY], snap[H.PZ], input.yaw); },
    sound: (k) => audio.play({ open: 'packOpen', close: 'packClose', socket: 'gemLand' }[k] || k, null, 0, 0, 0.55, 1, false),
  });
  Object.assign(game, { pack, inventory });
  // The chat log (src/ui/chatlog.js): the other Tessariels' words, and Lisandra's.
  const chatLog = game.chatLog = new ChatLog({ settings, touch: input.touch });
  // What the other Tessariels say, and their names over their heads.
  if (cast.length) {
    game.heroTalk = new HeroTalk({ base: BASE, cast, renderer, sim: simWorker, settings, touch: input.touch, chatLog,
      playerName: () => { try { return openingHUD?.name || 'Tessariel'; } catch { return 'Tessariel'; } }, playerSkull: () => !!pack.slots.skull,
      // A word with a hero (E): the same menu hold as the townsfolk's panel.
      ui: {
        opened: () => { input.menu = true; input.releaseControls(); if (document.pointerLockElement) document.exitPointerLock(); },
        closed: () => { input.menu = false; resume(); },
        click: () => title.chime?.(),
        // (The Free Company: a quartermaster's books, and your own party: src/ui/party.js.)
        broker: (h) => game.party?.talkTo(h),
        isMember: (slot) => !!game.party?.member(slot),
        dismiss: (slot) => game.party?.dismiss(slot),
      } });
    game.heroTalk.fetchScript();
    game.party = new PartyUI({ base: BASE, cast, sim: simWorker, pack, heroTalk: game.heroTalk, level: () => pack.level,
      firstHero: () => renderer.firstHero, tip: (t, s) => hud.tip(t, s),
      opened: () => { input.menu = true; input.releaseControls(); if (document.pointerLockElement) document.exitPointerLock(); },
      closed: () => { input.menu = false; resume(); },
      click: () => title.chime?.(),
      // (Each delve pays its own: src/core/dungeon.js DELVES' pay. The Warrens 1,500 xp and 250 gold, the Deeps and the keep more.)
      cleared: (d) => { const pay = d?.pay || { xp: 1500, gold: 250 }; giveXp?.(pay.xp); pack.gold += pay.gold; hud.tip(`The Free Company pays out ${pay.gold} gold for ${d?.short || 'the Warrens'}, and the tale is worth more.`, 5); autosave(); },
    });
    addPart('party', { save: () => game.party.save(), load: (d) => game.party.load(d) });
  }
  // A word with the town (src/ui/folk.js): E to someone, J for the quest log.
  const giveXp = (n) => {
    if (!stepXp(pack, n)) { showLevel(); return; }
    arm();
    game.party?.levelled();
    shared.input[INPUT.HEAL] += 9999; shared.input[INPUT.MANA_UP] += 9999;
    hud.tip(`Level ${pack.level}. Your spells bite harder, your well runs deeper, and there's a point to spend in your spellbook${input.touch ? '' : ' (B)'}.`, 5);
  };
  const townUI = new TownUI({
    town, renderer, pack, input, hud, inventory, spellbar: null,
    act: {
      sound: (k) => audio.play(k, null, 0, 0, 0.7, 1, false),
      triumph: () => music.stinger('triumph'),
      // What Lisandra says to you, into the chat log (src/ui/folk.js speak).
      log: (who, text) => chatLog.line('her', who, text),
      heal: (n) => { shared.input[INPUT.HEAL] += n; },
      hp: () => { const s = game.currentSnap(); return s ? s[H.HP] / (s[H.MAX_HP] || 1) : 1; },
      // A night's sleep: dawn, mended, and the game kept.
      sleep: () => {
        // (Slept from the evening: the morning is the next day's. The town's clock only counts a day on its own as it turns past midnight.)
        if (renderer.hour > 6.1) { town.day++; town.lastHour = -1; }
        renderer.setHour(6.1); shared.input[INPUT.HEAL] += 9999; shared.input[INPUT.MANA_UP] += 9999; autosave(); },
      give: (item) => {
        if (pack.add(item)) return;
        const snap = game.currentSnap();
        game.drops.fromPlayer(item, snap[H.PX], snap[H.PY], snap[H.PZ], input.yaw);
        townUI.note('Your pack is full: it is on the ground at your feet.', 'hint');
      },
      xp: giveXp,
      day: () => town.day,
      hour: () => renderer.hour,
      opened: () => { input.menu = true; input.releaseControls(); if (document.pointerLockElement) document.exitPointerLock(); },
      closed: () => { input.menu = false; resume(); },
      saved: () => autosave(),
      canMenu: () => input.enabled && !input.menu && !state.paused && !naming,
      click: () => title.chime?.(),
      // A charm for a quest (src/ui/lands.js), into the pouch.
      charm: (k) => !!game.lands?.addCharm(k, true),
      // The quest log: what auto-play is working on (src/ui/autoplay.js), and the big map framed on where a quest is.
      auto: () => game.autoplay?.current(),
      map: (p) => { if (!worldMap.open) toggleMap(); worldMap.showPlace(p); },
    },
  });
  game.townUI = townUI;
  game.music = music;
  // The gold trail on the ground to the quest you follow (or, in the opening, down the road after Lisandra).
  game.questTrail = new QuestTrail({ renderer, townUI, town });
  addPart('folk', { save: () => townUI.save(), load: (d) => townUI.load(d) });
  // Out past the town: the seals, the charms, the countries' sounds, and Velscour's Skull (src/ui/lands.js).
  const lands = new Lands({
    shared, input, hud, audio, pack, worldMap,
    found: () => music.stinger('found'),
    cmd: (code, a = 0, b = 0, c = 0) => { shared.input[INPUT.ASPECT] = code; shared.input[INPUT.CMD_A] = a; shared.input[INPUT.CMD_B] = b; shared.input[INPUT.CMD_C] = c; shared.input[INPUT.CMD] += 1; },
    snap: () => game.currentSnap(),
    hour: () => renderer.hour,
    // The hearths, braziers and torches (the lights that flicker like a fire does), for their crackle.
    flames: renderer.lights.filter((L) => L.flicker >= 0.79),
    opened: () => { input.menu = true; input.releaseControls(); if (document.pointerLockElement) document.exitPointerLock(); },
    closed: () => { input.menu = false; resume(); },
    canMenu: () => input.enabled && !input.menu && !naming,
    arm: () => arm(),
    level: (d) => {
      pack.level = Math.max(1, Math.min(50, pack.level + d));
      pack.xp = xpFor(pack.level);
      arm();
      return `Level ${pack.level}.`;
    },
    gear: (kind) => {
      const rng = makeRng((Math.random() * 4294967296) >>> 0);
      const tiers = kind === 'god' ? [3, 4, 5] : [0, 1, 2];
      const items = [];
      for (const r of tiers) {
        items.push(rollSkull(rng, { rarity: r }), rollWeapon(rng, { rarity: Math.min(r, 4) }), rollShield(rng, { rarity: Math.min(r, 4) }));
        if (Object.keys(ROBES).length) items.push(rollRobe(rng, { rarity: Math.min(r, 4) }));
        items.push(rollGem(rng, { grade: Math.min(2, r - tiers[0]) }));
      }
      const snap = game.currentSnap();
      let dropped = 0;
      for (const it of items) if (!pack.add(it)) { game.drops.fromPlayer(it, snap[H.PX], snap[H.PY], snap[H.PZ], input.yaw); dropped++; }
      pack.gold += kind === 'god' ? 25000 : 2500;
      inventory.render();
      return `${items.length} things of ${tiers.map((r) => RARITIES[r].name).join(', ')}, and ${kind === 'god' ? '25,000' : '2,500'} gold${dropped ? `; ${dropped} on the ground at your feet, the pack being full` : ''}.`;
    },
  });
  lands.load(null);
  game.lands = lands;
  // The Test Dungeon's three counters (src/ui/testhall.js): off till the main menu's Test Dungeon.
  game.hallUI = new HallUI({
    base: BASE, sim: simWorker, pack, renderer, audio,
    party: () => game.party, heroTalk: () => game.heroTalk, inventory: () => inventory, skills: () => game.spellbar?.skills,
    give: (item) => {
      if (pack.add(item)) { inventory.render(); return; }
      const snap = game.currentSnap();
      game.drops.fromPlayer(item, snap[H.PX], snap[H.PY], snap[H.PZ], input.yaw);
      hud.tip('Your pack is full: it is on the ground at your feet.', 2.5);
    },
    fill: () => { shared.input[INPUT.HEAL] += 9999; shared.input[INPUT.MANA_UP] += 9999; },
    level: (d) => { pack.level = Math.max(1, Math.min(50, pack.level + d)); pack.xp = xpFor(pack.level); arm(); game.party?.levelled(); },
    tip: (t, secs) => hud.tip(t, secs),
    opened: () => { input.menu = true; input.releaseControls(); if (document.pointerLockElement) document.exitPointerLock(); },
    closed: () => { input.menu = false; resume(); },
    click: () => title.chime?.(),
  });
  if (game.party) game.party.freeHire = () => !!game.hallUI?.on;
  addPart('lands', { save: () => lands.save(), load: (d) => lands.load(d) });
  window.bm = game.api(shared, simWorker, buffer, pool);
  // How long the start took, part by part (tools/load_time.mjs).
  window.bm.loadLaps = [['the simulation ready', Math.round(simMs)], ...renderer.loadLaps];
  gpuNote = () => `Before it went, the GPU took ${Math.round(renderer.stats.busyMs || 0)} ms a frame (${Math.round(renderer.worstMs)} ms at worst), with ${renderer.inFlight} frames waiting; the picture was ${renderer.W}x${renderer.H}.`;
  renderDiagnostics.attach(() => ({
    'Simulation tick': buffer ? Atomics.load(shared.ctrl, CTRL.TICK) : latestSnap?.[H.TICK],
    'GPU queue': `${renderer.inFlight} pending; last submit ${Math.round(performance.now() - renderer.lastSent)} ms ago; last done ${Math.round(performance.now() - renderer.lastDone)} ms ago`,
    'GPU frame': `${Math.round(renderer.stats.busyMs || 0)} ms on average, ${Math.round(renderer.worstMs)} ms at worst lately`,
    'Graphics': `${gpu.tierName} ${renderer.W}x${renderer.H}; MSAA ${renderer.msaa}; scale ${renderer.scale}`,
    'State': `idle=${!!game.idle}; paused=${!!shared.input[INPUT.PAUSE]}; shared=${!!buffer}`,
    'Render stage': renderer.stage || 'not started',
  }));
  game.pendingEvents = pendingEvents;
  game.getNonSharedSnap = () => latestSnap;

  let naming = false;
  const openingHUD = OPENING_ENABLED ? new OpeningHUD(() => {
    naming = false;
    input.menu = false;
    simWorker.postMessage({ type: 'openingName' });
    if (!input.touch && !AUTO) input.lock();
  }, { audio, renderer, log: chatLog, onSkip: () => simWorker.postMessage({ type: 'openingSkip' }) }) : null;
  const enter = async (fresh = true) => {
    noteRun({ stage: 'playing' });
    title.hide();
    game.idle = false;
    state.paused = false;
    document.body.classList.remove('paused');
    $('pause').style.display = 'none';
    shared.input[INPUT.PAUSE] = 0;
    audio.setAmbience(settings.ambience);
    $('gate').classList.add('gone');
    $('hud').style.display = 'block';
    if (input.touch) { $('touch').style.display = 'block'; shared.input[INPUT.TOUCH] = 1; }
    input.enabled = true;
    document.body.classList.add('playing');
    audio.start();
    music.unlock(); music.play();
    if (!openingHUD || (!fresh && openingHUD.name)) input.lock();
    if (input.touch && document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); await screen.orientation?.lock?.('landscape'); } catch { /* optional on this device */ }
    }
    try { game.wake = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
  };

  // ---- saving, loading and the menus ---------------------------------------------------------------------------------

  // What a save holds, part by part (saves.js): where you stand and which way you face, the time played, and the pack and
  // what's on the body. Quests will be a part of their own. What's lying on the ground isn't kept: a load starts the world fresh.
  let played = 0, playT = 0, runT = 0, noteT = 0;   // (runT: played this run of the page; noteT: since the run's note was last written)
  addPart('player', {
    save: () => {
      const s = game.currentSnap();
      return { x: s[H.PX], y: s[H.PY], z: s[H.PZ], yaw: input.yaw, pitch: input.pitch, ...openingHUD?.save(s) };
    },
    load: (d) => { openingHUD?.reset(d?.openingRevision === OPENING_REVISION ? d.name : ''); return simCall('place', d); },   // (a fresh world, and you where the save says; null: where a new game starts)
    summary: () => 'Bellmourn',
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
  addPart('doors', { save: () => game.doors.save(), load: (d) => game.doors.load(d) });
  addPart('clock', { save: () => ({ hour: renderer.hour }), load: (d) => renderer.setHour(d?.hour ?? 6) });
  // Not while you lie fallen.
  // (Nor in the Test Dungeon: nothing of it is kept, and Continue stays the game you were playing.)
  let testMode = false;
  const canSave = () => input.enabled && !!game.currentSnap() && game.gameState() !== 2 && !testMode;
  const snapshot = () => (canSave() ? capture().catch((e) => { console.warn('save', e); return null; }) : Promise.resolve(null));
  // The game keeps itself as it's played: that's Continue.
  const autosave = async () => { const data = await snapshot(); if (data) saves.writeAuto(data); };
  keepForReset = autosave;
  game.onTaken = autosave;
  if (openingHUD) game.drawOpening = (snap, cam) => openingHUD.feel(snap, cam);
  game.onTick = (dt) => {
    if (openingHUD) {
      const snap = game.currentSnap();
      if (snap) {
        const active = input.enabled && !state.paused;
        openingHUD.draw(snap, active, dt);
        // While the story has the camera: its view, no hands, no HUD. (Paused, it holds the last view.)
        if (active) game.overrideCam = openingHUD.direct(snap, dt, input);
        // (A camera set for a review picture, bm.setCam, holds through the story's.)
        if (game.reviewCam) game.overrideCam = game.reviewCam;
        renderer.hideVM = openingHUD.cinematic(snap) && !openingHUD.handsUp(snap);
        if (active && snap[H.OPENING] === OPENING.NAME && !naming && !openingHUD.name) {
          naming = true;
          input.menu = true;
          input.releaseControls();
          if (document.pointerLockElement) document.exitPointerLock();
        } else if (snap[H.OPENING] !== OPENING.NAME && naming) {
          naming = false;
          input.menu = false;
        }
      }
    }
    const named = openingHUD?.name;
    if (named && named !== townUI.name) { townUI.name = named; town.setName(named); }
    if (input.enabled && !state.paused) {
      const night = town.day * 2 + (renderer.hour < 12 ? 0 : 1);
      if (townUI.quests.wantsWarden(renderer.hour) && townUI.wardenAsked !== night) { townUI.wardenAsked = night; simWorker.postMessage({ type: 'warden' }); }
    }
    if (!input.enabled || state.paused) return;
    played += dt; playT += dt; runT += dt; noteT += dt;
    if (playT > AUTOSAVE_EVERY) { playT = 0; autosave(); }
    // The run's note (src/core/lastrun.js): how long it's been played and where you stand, for the start after a death.
    if (noteT > 8) {
      noteT = 0;
      const s = game.currentSnap();
      noteRun({ stage: 'playing', mins: runT / 60, where: s ? `at (${Math.round(s[H.PX])}, ${Math.round(s[H.PZ])})` : '', gpu: gpuNote?.() || '' });
    }
  };
  const loadInto = async (data) => {
    leaveTest();
    try { await restore(data); } catch (e) {
      await title.confirm({ title: 'Could not load', text: e.message, yes: 'Back', no: false });
      return false;
    }
    hud.reset(); renderer.clearBlood(); playT = 0;
    return true;
  };
  const startFrom = async (data) => { if (await loadInto(data)) enter(false); };
  // Back after the GPU was lost (above): Continue, offered once, with a word on why. (A tap, which also lets the sound back
  // on in a browser that wants one first.)
  // Back after the browser closed the game (src/core/lastrun.js): said, with Continue if there's a game kept.
  const diedOffer = async () => {
    if (!RUN.died || AUTO) return;
    console.warn('the last run was ended by the browser', RUN.died);
    await new Promise((r) => setTimeout(r, 700));
    const kept = !!saves.newest();
    const text = `The browser closed the game last time, ${deathWords(RUN.died)}. It does that when a page wants more memory than the device has to give.`
      + `${gpu.mobile && RUN.light ? ` This time the game is using less: ${RUN.light > 1 ? 'only two' : 'fewer'} of the other heroes are about, and bodies are painted smaller.` : ''}`
      + `${kept ? ' Continue picks up from where the game was last kept.' : ''}`;
    if (await title.confirm({ title: 'The game was closed', text, yes: kept ? 'Continue' : 'Back', no: kept ? 'Main Menu' : false }) && kept) {
      const d = saves.newest();
      if (d) startFrom(d);
    }
  };
  const gpuLostOffer = async () => {
    let ask = false, note = '';
    try { ask = sessionStorage.getItem(GPU_LOST_OFFER) === '1'; note = sessionStorage.getItem(GPU_LOST_NOTE) || ''; sessionStorage.removeItem(GPU_LOST_OFFER); } catch { /* no storage */ }
    if (!ask || AUTO || !saves.newest()) return;
    await new Promise((r) => setTimeout(r, 700));
    const text = `The game was kept as it was a moment before. Continue picks up from there.${note ? ` (${note})` : ''}`;
    if (await title.confirm({ title: 'The graphics reset', text, yes: 'Continue', no: 'Main Menu' })) {
      const d = saves.newest();
      if (d) startFrom(d);
    }
  };
  const slotOptions = () => ({ canSave: canSave(), snapshot, restore: (d) => (input.enabled ? loadInGame(d) : startFrom(d)) });
  const loadInGame = async (d) => { if (await loadInto(d)) resume(); };
  const resume = () => { if (input.touch || AUTO || input.free) input.onPauseChange(false); else input.lock(); };
  const toTitle = async () => {
    game.autoplay?.toggle(false);
    await autosave();
    leaveTest();
    input.enabled = false;
    state.paused = false;
    shared.input[INPUT.PAUSE] = 1;
    if (document.pointerLockElement) document.exitPointerLock();
    $('pause').style.display = 'none'; $('hud').style.display = 'none'; $('touch').style.display = 'none';
    document.body.classList.remove('playing', 'paused');
    game.idle = true;
    audio.setAmbience(0);
    audio.surf(0, false);
    music.stop();
    noteRun({ stage: 'title' });
    title.toMenu();
  };
  title.onMenu = async (a) => {
    if (a === 'new') {
      if (saves.auto() && !(await title.confirm({ title: 'New Game', text: 'Start the fight over from the beginning? The game you were playing stays in Continue until you play on.', yes: 'New Game' }))) return;
      saves.clearAuto();
      openingHUD?.reset();
      shared.input[INPUT.RESTART] += 1;   // (taken up on the first step after the world is let go)
      played = 0; playT = 0;
      pack.load(null);
      arm();
      game.drops.clear();
      game.chests.load(null);
      game.spellbar.load(null);
      game.doors.load(null);
      worldMap.load(null);
      townUI.load(null);
      town.load(null);
      game.party?.load(null);
      // (The seals woken and the hour of the day are the old game's too.)
      game.lands?.load(null);
      renderer.setHour(15);
      enter(true);
    } else if (a === 'continue') {
      const d = saves.newest();
      if (d) startFrom(d);
    } else if (a === 'load') title.slots('load', slotOptions());
    else if (a === 'test') enterTest();
  };
  // The Test Dungeon (src/core/testhall.js): a white hall for trying the monsters, with all the gear and a party for nothing.
  // A fresh pack and a fresh world, the story long over; nothing kept, so the game you were playing is still in Continue.
  async function enterTest() {
    testMode = true;
    game.hallUI.setOn(true); hud.testHall = true; game.questTrail.off = true;
    played = 0; playT = 0;
    pack.load(null); arm(); game.drops.clear();
    game.chests.load(null); game.spellbar.load(null); game.doors.load(null);
    townUI.load(null); town.load(null);
    game.party?.load(null);
    renderer.setHour(12);
    simWorker.postMessage({ type: 'hall', cmd: 'enter' });
    const [x, z] = hallAt(SPAWN.x, SPAWN.z), name = openingHUD?.name || 'Tessariel';
    openingHUD?.reset(name);
    try { await simCall('place', { x, y: HALL.y, z, yaw: SPAWN.yaw, pitch: 0, openingRevision: OPENING_REVISION, opening: OPENING.ARRIVED, guide: [0, 0, 0, 0], name }); } catch (e) { console.error('test dungeon', e); }
    hud.reset(); renderer.clearBlood();
    await enter(false);
    if (!input.touch && !AUTO) input.lock();
    hud.tip('The Test Dungeon. Captain Vale keeps the stores, Aldous Fenn the Free Company, and Ysolde Marr by the door summons whatever you would fight. E to talk.', 9);
  }
  // Out of it, back to the title: whatever was hired goes back on the books, and the hall's own are sent home.
  function leaveTest() {
    if (!testMode) return;
    testMode = false;
    game.party?.load(null);
    simWorker.postMessage({ type: 'hall', cmd: 'leave' });
    game.hallUI.setOn(false); hud.testHall = false; game.questTrail.off = false;
  }
  // (For tests and review pictures: bm.testDungeon() goes in as the title's Test Dungeon does.)
  if (window.bm) window.bm.testDungeon = enterTest;
  for (const b of $('pause').querySelectorAll('[data-p]')) {
    b.onclick = () => {
      title.chime();
      const a = b.dataset.p;
      if (a === 'resume') resume();
      else if (a === 'save' || a === 'load') title.slots(a, slotOptions());
      else if (a === 'settings' || a === 'howto') title.panel(a, b);
      else if (a === 'arrange') game.arrange.open();
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
    } else if (k === 'keep') {
      useStore(v === 'yes');
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
    if (!input.enabled || inventory.open || naming || townUI.open || townUI.book || game.heroTalk?.open || game.party?.open || game.hallUI?.open) return;
    if (paused && !state.paused) { input.releaseControls(); autosave(); }
    state.paused = paused;
    document.body.classList.toggle('paused', paused);
    $('pause').style.display = paused ? 'flex' : 'none';
    shared.input[INPUT.PAUSE] = paused ? 1 : 0;
  };
  input.onLockRefused = () => input.onPauseChange(true);
  const openPack = () => {
    state.paused = true;
    shared.input[INPUT.PAUSE] = 1;
    input.menu = true;
    input.releaseControls();
    inventory.show();
    if (document.pointerLockElement) document.exitPointerLock();
  };
  // viaEsc: a browser won't lock the pointer again off the Esc key, so that stops at the pause screen, which will on a click.
  const openBook = () => {
    state.paused = true;
    shared.input[INPUT.PAUSE] = 1;
    input.menu = true;
    input.releaseControls();
    if (!bookOpen) audio.play('bookOpen', null, 0, 0, 0.7, 1, false);
    bookOpen = true;
    $('spellbook').classList.add('open');
    if (document.pointerLockElement) document.exitPointerLock();
  };
  const closeBook = (viaEsc) => {
    if (bookOpen) audio.play('bookClose', null, 0, 0, 0.7, 1, false);
    bookOpen = false;
    $('spellbook').classList.remove('open');
    input.menu = false;
    if (viaEsc === true && !input.touch && !AUTO) input.onPauseChange(true); else resume();
  };
  let bookOpen = false;
  game.spellbar = new SpellBar(shared, input, { openBook, closeBook, tip: (t) => hud.tip(t, 2.5), level: () => pack.level,
    gold: { have: () => pack.gold, pay: (n) => { pack.gold -= n; } }, sound: (k) => audio.play(k, null, 0, 0, 0.6, 1, false) });
  // What's learned in the six trees goes to the sim, which casts the spells with it (Casting.setSkills).
  game.spellbar.onSkills = (ranks) => simWorker.postMessage({ type: 'skills', ranks });
  game.spellbar.refresh();
  addPart('spells', {
    save: () => game.spellbar.save(),
    load: (d) => game.spellbar.load(d),
  });
  game.closeBook = closeBook;
  townUI.spellbar = game.spellbar;
  // First person or third: V, the eye by the spell bar, VIEW on a phone.
  // A life bar over every enemy's head (the interface's own is a boss's only: Hud.update).
  game.foeBars = new FoeBars({ renderer, heroCount: () => renderer.heroCast?.length || 0 });
  hud.dungeonBoss = () => !!game.party?.boss;
  game.viewSwitch = new ViewSwitch({ input, shared, settings, save: saveSettings, tip: (t, s) => hud.tip(t, s), busy: () => state.paused || naming });
  // Auto-play, the Auto button under the skull or P: the game plays itself (src/ui/autoplay.js, src/ui/autobrain.js).
  game.autoplay = new AutoPlay({
    base: BASE, opening: OPENING_ENABLED, game, shared, input, hud, audio, pack, inventory, townUI, lands, renderer, town,
    spellbar: () => game.spellbar, paused: () => state.paused, pause: (on) => input.onPauseChange(on), foeNames: FOE_NAMES, settings,
  });
  // Move Buttons, on the pause screen: every button, bar and the map where the player wants them, kept for every game after
  // (src/ui/arrange.js). The game stays paused under it; the pause screen comes back when it's done.
  game.arrange = new Arrange({
    touch: input.touch, input,
    onOpen: () => { $('pause').style.display = 'none'; },
    onClose: () => { if (state.paused) $('pause').style.display = 'flex'; },
  });
  // The quest log (J): beside the spellbook's B on the spell bar, and on a phone QUESTS beside PACK (the only way to it there).
  const questBtn = document.createElement('div');
  questBtn.id = 'questOpen';
  questBtn.title = 'Quest log (J)';
  questBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8"/><path d="M6 4a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2z"/><path d="M8 20a2 2 0 0 1-2-2V7"/><path d="M10 9h6M10 12.5h6M10 16h4"/></svg><kbd>J</kbd>';
  const questLog = (e) => { e.preventDefault(); e.stopPropagation(); if (townUI.book) townUI.closeBook(); else if (townUI.act.canMenu()) townUI.openBook(); };
  questBtn.addEventListener('mousedown', questLog);
  questBtn.addEventListener('touchstart', questLog, { passive: false });
  $('spellOpen').after(questBtn);
  const closePack = (viaEsc) => {
    inventory.hide();
    input.menu = false;
    autosave();
    if (viaEsc && !input.touch && !AUTO) input.onPauseChange(true); else resume();
  };
  $('invClose').onclick = () => closePack(false);
  $('invX').onclick = () => closePack(false);
  $('bPause').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); input.onPauseChange(true); }, { passive: false });
  document.addEventListener('visibilitychange', () => {
    const hidden = document.hidden;
    if (hidden) input.releaseControls();
    shared.input[INPUT.PAUSE] = hidden || state.paused || game.upright ? 1 : 0;
    if (hidden && audio.ctx) audio.ctx.suspend(); else if (audio.ctx && (input.enabled || title.up)) audio.ctx.resume();
  });
  // A phone stood upright. The manifest asks for landscape and the lock's asked for too (above, and src/title.js), but an
  // iPhone grants a page neither, so it can still be turned. Upright, the world holds still and nothing's drawn (index.html
  // #rotate covers it); the picture keeps its sideways shape (Renderer.resize), so turning it back makes nothing again.
  const turned = () => {
    const up = input.touch && window.innerHeight > window.innerWidth;
    if (up === !!game.upright) return;
    game.upright = up;
    if (!input.enabled) return;     // (under the title, the world's held still already)
    if (up) input.releaseControls();
    shared.input[INPUT.PAUSE] = up || document.hidden || state.paused ? 1 : 0;
  };
  window.addEventListener('resize', turned);
  window.addEventListener('orientationchange', turned);
  turned();
  // The game's own panels (the talk, the shops, the seals, the skull's menu, the book, the pack): a tick under the pointer and a
  // click as one's pressed (MenuSFX, by Kevin Fowler). The title and the pause menu have their own (src/title.js chime, tick).
  let uiHover = null;
  const ownUI = (e) => { const b = e.target.closest?.('button'); return b && !b.disabled && !b.closest('#title, #pause, .t-btn') ? b : null; };
  document.addEventListener('pointerover', (e) => { const b = ownUI(e); if (b && b !== uiHover && e.pointerType === 'mouse') audio.play('uiHover', null, 0, 0, 0.18, 1, false); uiHover = b; });
  document.addEventListener('click', (e) => {
    const b = ownUI(e);
    if (b) audio.play(/^\s*(stay|close|cancel|back|leave|no|goodbye|farewell)\b/i.test(b.getAttribute('aria-label') || b.textContent) ? 'uiCancel' : 'uiConfirm', null, 0, 0, 0.35, 1, false);
  }, true);
  // The big map unrolled and rolled up again.
  const toggleMap = () => {
    const was = worldMap.open;
    worldMap.toggle();
    const now = worldMap.open;
    if (now !== was) audio.play(now ? 'mapOpen' : 'mapClose', null, 0, 0, 0.6, 1, false);
  };
  worldMap.onClose = toggleMap;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && input.enabled && !input.menu && shared.snaps && game.gameState() !== 0) shared.input[INPUT.RESTART] += 1;
    if (!input.enabled || e.repeat || naming) return;
    if (e.code === 'KeyI') { if (inventory.open) closePack(false); else if (!state.paused) openPack(); }
    if (e.code === 'KeyB') { if (bookOpen) closeBook(); else if (!state.paused) openBook(); }
    if (e.code === 'Escape' && bookOpen) closeBook(true);
    if (e.code === 'Escape' && inventory.open) closePack(true);
    if (e.code === 'KeyE' && !input.menu && !state.paused) game.takeNearest();
    if (e.code === 'KeyM' && !input.menu && !state.paused) toggleMap();
    if (e.code === 'F3') { e.preventDefault(); hud.toggleDebug(); }
  });
  $('bPack').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (input.enabled && !state.paused && !naming) openPack(); }, { passive: false });
  // The rest of a phone's top row: the spellbook and the quest log, which a keyboard has B and J for.
  $('bBook').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (input.enabled && !input.menu && !state.paused && !naming) openBook(); }, { passive: false });
  $('bQuests').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (input.enabled && !input.menu && !state.paused && !naming) questLog(e); }, { passive: false });
  $('bMap').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (input.enabled && !state.paused && !naming) toggleMap(); }, { passive: false });
  $('bTake').addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); if (input.enabled && !state.paused && !naming) game.takeNearest(); }, { passive: false });
  $('touch').addEventListener('touchstart', () => {
    const snap = game.currentSnap();
    if (input.enabled && snap && snap[H.GAME] !== 0 && snap[H.GAME_T] > 1.5) shared.input[INPUT.RESTART] += 1;
  });
  // A phone's screen (src/ui/hud.css, src/ui/thumbs.js): each button in its place with its picture, and what's said in the
  // middle of the top (the foe's bar, a great foe's, the hall's word, the notes, the tips) gathered one under the other.
  placeThumbs();
  paintIcons();
  if (input.touch) for (const id of ['foe', 'bossFrame', 'hallStatus', 'folkNotes', 'tip']) { const el = $(id); if (el) $('topStack').appendChild(el); }
  // The painted pieces of the art kit, where they've come back (tools/ui/, assets/ui/kit/): never waited for.
  loadSkin(BASE);
  game.run();
  $('controls').innerHTML = input.touch
    ? 'Left thumb moves. Right thumb looks, on or off the buttons. The big button fires your <b>staff</b>; round it are <b>dodge</b>, <b>jump</b> and, with a shield on and no skull, <b>guard</b>. The six <b>spells</b> stand in a ring round those: tap one to cast it, hold to keep casting. Along the top: the <b>menu</b>, your <b>pack</b>, your <b>spellbook</b> and your <b>quest log</b>; tap the map in the corner to open the big one. <b>Auto</b>, beside the map, lets the game play itself.'
    : '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move &nbsp; <kbd>Space</kbd> jump, hold it to ride your shield &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Q</kbd> dodge &nbsp; <kbd>1</kbd>-<kbd>6</kbd> cast, hold to keep casting &nbsp; <kbd>F</kbd> cast the last again &nbsp; <kbd>Wheel</kbd> choose &nbsp; <kbd>B</kbd> spellbook: learn spells and set your bar &nbsp; <kbd>Alt</kbd> cursor, to click a spell &nbsp; <kbd>Left click</kbd> fire your staff &nbsp; <kbd>Right click</kbd> shield up with a shove, hold to keep it up (not with a skull in hand) &nbsp; <kbd>I</kbd> pack &nbsp; <kbd>M</kbd> map &nbsp; <kbd>E</kbd> take, open, shut or talk &nbsp; <kbd>J</kbd> quest log: what each quest is, where on the map, what auto-play is on &nbsp; <kbd>P</kbd> auto-play: the game plays itself';
  // Loaded: the title's menu comes up (once Bellmourn's logo is in).
  game.idle = !AUTO;
  watchFiles(null);
  files.last = '';
  setProgress(1, `Ready in ${(loadMs / 1000).toFixed(1)} s.`, true);
  title.ready(() => ({ continue: !!saves.newest(), load: saves.any() }));
  noteRun({ stage: AUTO ? 'playing' : 'title' });
  gpuLostOffer();
  diedOffer();
  if (AUTO) { $('gate').classList.add('gone'); $('hud').style.display = 'block'; input.enabled = true; audio.start(); music.play(); if (input.touch) { $('touch').style.display = 'block'; shared.input[INPUT.TOUCH] = 1; } }
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
    this.hpNum = $('hpNum'); this.hpShown = -1;
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
    const hp = Math.max(0, Math.ceil(snap[H.HP]));
    if (hp !== this.hpShown) { this.hpShown = hp; this.hpNum.textContent = hp; }
    // The bar on the interface is a boss's, and only a boss's: the nearest that means you harm (isBoss in src/ui/foebars.js;
    // a dungeon's boss has its own frame, src/ui/party.js, and this gives way to it). Everything else that can be fought
    // carries its life over its head (FoeBars).
    const BOSS_FAR = 34;
    let co = CHARS_START, near = BOSS_FAR;
    for (let i = 0; i < snap[H.NCHARS]; i++) {
      const o = CHARS_START + i * C_SIZE;
      if (snap[o + C.ACTIVE] < 0.5 || !snap[o + C.HOSTILE] || snap[o + C.STATE] === 10 || !isBoss(snap[o + C.KIND] | 0, snap[o + C.MAX_HP])) continue;
      const d = Math.hypot(snap[o + C.X] - snap[H.PX], snap[o + C.Z] - snap[H.PZ]);
      if (d < near) { near = d; co = o; }
    }
    const hpf = clamp(snap[co + C.HP] / snap[co + C.MAX_HP], 0, 1);
    $('foe').style.opacity = near < BOSS_FAR && !this.dungeonBoss?.() ? 1 : 0;
    // (One of the land's new kinds says its own name: src/core/wilds.js.)
    const foeName = this.wildName?.(snap[co + C.MODEL]) || FOE_NAMES[snap[co + C.KIND]] || '';
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
      const again = this.testHall ? 'Back to the hall in a moment' : this.input.touch ? 'Tap to play again' : 'R to play again';
      if (g === 2) { m.innerHTML = `You have fallen<small>${again}</small>`; m.style.opacity = 1; }
    }
    if (this.debug) {
      const k = this.gpu.tier;
      $('debug').textContent = `${this.fps.toFixed(0)} fps   worst ${this.worstShown.toFixed(0)} ms   gpu busy ${stats.busyMs.toFixed(1)} ms${stats.gpuMs > 0 ? `   timer ${stats.gpuMs.toFixed(1)} ms` : ''}
${this.gpu.info.vendor || ''} ${this.gpu.info.architecture || ''}  tier ${k.name}
render ${stats.W}x${stats.H}  scale ${stats.scale.toFixed(2)}  msaa ${stats.msaa}  effects -${stats.demoted}  refresh ${stats.vsync.toFixed(1)} ms
threads ${this.plan.cores} logical, ${this.poolSize + 2} used, shared ${this.isolated ? 'yes' : 'no'}
sim ${stats.sim ? `${stats.sim.ms.toFixed(1)} ms a tick, worst ${stats.sim.worst.toFixed(1)}, ${stats.sim.rate.toFixed(0)} a second${stats.sim.paced ? ', by the frames' : ` (own clock, ${k.sim} Hz)`}` : `${k.sim} Hz`}${stats.sim?.town ? `  town ${stats.sim.town.ms.toFixed(1)} ms, ${stats.sim.town.rate.toFixed(0)} a second` : ''}  planner rollouts ${(snap[H.ROLLOUTS] / 1000).toFixed(0)}k
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
    this.doors = new Doors(renderer, audio, renderer.things, { set value(m) { shared.input[INPUT.DOORS] = m; } });
    this.nearDoor = null;
    setHomes(renderer.interior.data.homes);
    this.underfoot = 'dirt';
    // A house's lamps lit again as someone comes home or wakes: heard if you're near.
    renderer.homeLights.onLit = (L) => {
      const c = this.cam;
      if (L && Math.hypot(L.p[0] - c.x, L.p[2] - c.z) < 16) audio.play('kindle', L.p[0], L.p[1], L.p[2], 0.7);
    };
    this.nearDrop = null;
    this.nearFolk = null;
    this.takeShown = null;
    this.hudStats = { gpuMs: 0, busyMs: 0, W: 0, H: 0, scale: 1, msaa: 1, demoted: 0, vsync: 0 };
    // Frames queued beyond this are only input lag. A phone's governor, and what it goes by.
    this.maxInFlight = gpu.tier.lean ? 2 : 3;
    this.vsyncMs = 1000 / 60; this.rafLast = 0; this.rafGaps = new Float32Array(45); this.rafN = 0; this.rafSkip = 0;
    // The sim's ticks go by the screen's frames (pace), except on a phone, which keeps the sim's own clock (it takes every other
    // frame of a fast screen, and its ticks cost more). ?unpaced, or view.unpaced = true, for the old way, to compare.
    this.unpaced = gpu.mobile || params.has('unpaced');
    this.paceAt = -1; this.snapSlot = 0; this.snapUs = 0; this.pacedSnap = false;
    this.simT = 0; this.simStats = { ms: 0, worst: 0, rate: 0, paced: false };
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

  // Asks the sim (src/sim/sim.worker.js, its loop) for this frame's time: how long since the last frame began, up to a tenth of a
  // second. After a gap longer than a quarter of one (a hidden tab), the sim has kept its own time, so nothing's asked for it.
  pace(now) {
    if (!this.buffer || this.unpaced) { this.paceAt = -1; return; }
    const ctrl = this.shared.ctrl, ms = now - this.paceAt;
    if (this.paceAt >= 0 && ms > 0 && ms < 250) {
      Atomics.store(ctrl, CTRL.PACE_US, (Atomics.load(ctrl, CTRL.PACE_US) + Math.round(Math.min(ms, 100) * 1000)) | 0);
      Atomics.add(ctrl, CTRL.PACE_SEQ, 1);
      Atomics.notify(ctrl, CTRL.PACE_SEQ);
    }
    this.paceAt = now;
  }

  // What the sim's ticks have cost, each second, for the Frame rate readout.
  watchSim(dt) {
    if (!this.buffer || (this.simT += dt) < 1) return;
    const c = this.shared.ctrl, n = Atomics.exchange(c, CTRL.STEPS, 0), us = Atomics.exchange(c, CTRL.STEP_US, 0), worst = Atomics.exchange(c, CTRL.STEP_MAX, 0);
    Object.assign(this.simStats, { ms: n ? us / n / 1000 : 0, worst: worst / 1000, rate: n / this.simT, paced: !this.unpaced && this.paceAt >= 0 });
    const town = this.town?.takeCost();
    this.simStats.town = town ? { ms: town.ms, rate: town.n / this.simT } : null;
    this.simT = 0;
  }

  // What the display refreshes at, from the time between callbacks.
  watchRefresh(now) {
    if (this.rafLast) {
      this.rafGaps[this.rafN++] = now - this.rafLast;
      if (this.rafN === this.rafGaps.length) { this.rafN = 0; this.vsyncMs = this.rafGaps.slice().sort()[this.rafGaps.length >> 1]; }
    }
    this.rafLast = now;
  }

  // What the town says back (src/folk/client.js).
  townEvent(e) {
    if (e.type === 'door') this.doors.byFolk(e.id, e.open);
    else if (e.type === 'stall') this.renderer.stallOpen(e.id, e.open);
    else if (e.type === 'dish') this.renderer.dish(e.id, e.on, e.kind, e.at, e.yaw);
    else if (e.type === 'work') this.audio.play(e.kind, e.at[0], e.at[1], e.at[2], e.kind === 'chop' ? 1.1 : 0.8, e.kind === 'anvil' ? 1.25 : 1);
    else if (this.onTownEvent) this.onTownEvent(e);
  }

  // A door with a lock on it, and no key for it yet. (The Sexton's Door: Silas gives you its key with The Dead Can't Wait.)
  locked(door) {
    return door.lock === 'sexton' && !door.open && !this.townUI?.quests.state('dead_cant_wait');
  }

  // The nearest thing on the ground, into the pack if there's room for it.
  takeNearest() {
    const d = this.nearDrop;
    if (!d) {
      if (this.lands?.use()) return;
      if (this.nearStation) { this.hallUI.talk(this.nearStation.key); this.takeShown = undefined; return; }
      if (this.nearChest) this.chests.open(this.nearChest);
      else if (this.nearFolk) { if (!this.nearFolk.busy) { this.townUI.talk(this.nearFolk.i); this.takeShown = undefined; } }
      else if (this.nearHero) { if (!this.nearHero.busy) { this.heroTalk.talkTo(this.nearHero.h); this.takeShown = undefined; } }
      else if (this.nearDoor) {
        if (this.locked(this.nearDoor)) { this.hud.tip('Locked, and solid. Silas Crane at the coffin yard keeps the key.', 3); return; }
        this.doors.toggle(this.nearDoor); this.takeShown = undefined;
      }
      return;
    }
    if (d.item.type === 'spell') {
      const name = nameOf(d.item);
      // (A scroll past your level stays where it lies, for when you can read it.)
      if (!this.spellbar.known.has(d.item.spell) && !this.spellbar.canRead(d.item.spell)) { this.hud.tip(`${name}: you can't make sense of it yet. Level ${TIER_LEVEL[TIER_OF[d.item.spell]]}.`, 3); return; }
      if (this.spellbar.learn(d.item.spell)) this.hud.tip(`${name} read: its first rank is yours, for no point. B: your spellbook.`, 3.5);
      else { this.pack.gold += 40; this.hud.tip('You know that one already. Sold for 40 gold.', 2.5); }
    } else if (!this.pack.add(d.item)) { this.hud.tip('Your pack is full.', 2); return; }
    this.drops.take(d);
    this.nearDrop = null;
    if (this.onTaken) this.onTaken();
  }

  updateDrops(dt, snap) {
    this.drops.low = snap[H.HP] / (snap[H.MAX_HP] || 1) < 0.35;
    this.drops.onGrab ||= (g) => {
      if (g.coins) this.pack.gold += g.item.amount;
      else if (g.item.type === 'mat') { this.pack.addMat(g.item.kind, g.item.n); this.townUI?.note(`${g.item.n} ${matName(g.item.kind, g.item.n)}  (${this.pack.mats[g.item.kind]})`, 'mat'); }
      else this.shared.input[g.item.kind === 'life' ? INPUT.HEAL : INPUT.MANA_UP] += g.item.kind === 'life' ? 32 : 40;
    };
    if (this.pack && this.input.enabled) this.gemFx?.step(dt, snap, this.cam, this.pack);
    this.nearDrop = this.input.enabled && !this.input.menu ? this.drops.update(dt, snap[H.PX], snap[H.PY], snap[H.PZ]) : null;
    const d = this.nearDrop;
    const ch = this.chests.update(dt, snap[H.PX], snap[H.PY], snap[H.PZ], this.input.yaw);
    this.nearChest = this.input.enabled && !this.input.menu ? ch : null;
    const door = this.doors.update(dt, snap[H.PX], snap[H.PY], snap[H.PZ], this.input.yaw);
    this.nearDoor = this.input.enabled && !this.input.menu ? door : null;
    // Someone to talk to, if there's nothing to take or open first.
    const free = this.input.enabled && !this.input.menu && !d && !this.nearChest;
    let folk = free && this.townUI ? this.townUI.nearest(snap[H.PX], snap[H.PY], snap[H.PZ], this.input.yaw) : null;
    // Or one of the other Tessariels: E stops them for a word (src/ui/heroes.js talkTo). Whichever of the two is nearer.
    let hero = free && this.heroTalk ? this.heroTalk.nearest(snap[H.PX], snap[H.PY], snap[H.PZ], this.input.yaw) : null;
    if (folk && hero) {
      const w = this.townUI.whereOf(folk.i);
      if (w && hero.h.dist < Math.hypot(w.x - snap[H.PX], w.z - snap[H.PZ])) folk = null; else hero = null;
    }
    // Or, in the Test Dungeon, one of its counters (src/ui/testhall.js): before anyone, and its people are only at them.
    const station = free && this.hallUI?.on ? this.hallUI.nearest(snap[H.PX], snap[H.PY], snap[H.PZ], this.input.yaw) : null;
    if (station || (hero?.h.p.broker && this.hallUI?.on)) { folk = null; hero = null; }
    this.nearStation = station;
    this.nearFolk = folk; this.nearHero = hero;
    const near = d || this.nearChest || station?.label || (folk && folk.label) || hero?.label || this.nearDoor;
    if (near === this.takeShown) return;
    this.takeShown = near;
    $('take').style.display = near ? 'block' : 'none';
    $('bTake').style.display = near && this.input.touch ? 'flex' : 'none';
    const shuts = !d && !this.nearChest && !station && !folk && !hero && this.nearDoor?.open;
    const locked = !d && !this.nearChest && !station && !folk && !hero && this.nearDoor && this.locked(this.nearDoor);
    const [pic, word] = d || !near ? ['take', 'Take'] : station || folk || hero ? ['talk', 'Talk'] : shuts ? ['shut', 'Shut'] : locked ? ['locked', 'Try'] : ['open', 'Open'];
    setIcon($('bTake'), pic, word);
    if (near) $('take').innerHTML = `${this.input.touch || folk?.busy || hero?.busy ? '' : '<kbd>E</kbd> '}${d ? `<span style="color:${colorOf(d.item)}">${nameOf(d.item)}</span>` : this.nearChest ? 'Open the chest' : station ? station.label : folk ? folk.label : hero ? hero.label : shuts ? 'Shut the door' : locked ? 'Try the door' : 'Open the door'}`;
  }

  gameState() { const s = this.currentSnap(); return s ? s[H.GAME] : 0; }

  currentSnap() {
    if (this.buffer) {
      const { ctrl, snaps } = this.shared;
      if (Atomics.load(ctrl, CTRL.TICK) === 0) return null;
      // The writer can publish between reading LATEST and reserving the slot.
      // Recheck before using the pose so the GPU never reads an overwritten palette.
      let latest;
      do {
        latest = Atomics.load(ctrl, CTRL.LATEST);
        Atomics.store(ctrl, CTRL.READING, latest);
      } while (Atomics.load(ctrl, CTRL.LATEST) !== latest);
      this.snapSlot = latest;
      return snaps[latest];
    }
    return this.getNonSharedSnap();
  }

  run() {
    // ?timer=1 keeps the loop alive in an occluded window, for automated review.
    const useTimer = params.has('timer');
    const schedule = useTimer ? (f) => setTimeout(() => f(performance.now()), 16) : requestAnimationFrame.bind(window);
    const draw = (now) => {
      renderDiagnostics.stage = 'input';
      this.watchRefresh(now);
      this.input.update();
      if (!this.buffer) this.sim.postMessage({ input: this.shared.input.slice() });
      // (A phone stood upright draws nothing: see turned.)
      if (this.upright) { this.last = now; return; }
      // A phone on a 120 Hz screen takes every other refresh: a steady 60 is as smooth to the eye, and the battery and the
      // heat are what would slow it down later.
      if (this.gpu.mobile && this.vsyncMs < 10 && (this.rafSkip++ & 1)) return;
      // Paced (see pace): this frame draws the world the last frame asked for, and then asks for its own frame's time. Taken
      // before asking, so a quick tick can never land in it: every frame is the same one step on from the last.
      renderDiagnostics.stage = 'snapshot';
      const paced = this.buffer && !this.unpaced ? this.currentSnap() : null;
      if (paced) this.snapUs = Atomics.load(this.shared.ctrl, CTRL.SNAP_US + this.snapSlot);
      this.pace(now);
      this.pacedSnap = !!paced;
      // Don't get ahead of the GPU: what's on its way to the screen is already out of date. (Unless a browser has stopped
      // saying when the GPU's done, which mustn't freeze the game: after 5 s of it saying nothing, a frame a second. A GPU
      // that's only slow still says so now and then, and isn't sent more than it can take: frames piled on one that had
      // stalled went with an iPad's GPU being lost in the road's fight.)
      { const r = this.renderer, t = performance.now();
        if (r.inFlight >= (this.idle ? 1 : this.maxInFlight) && (t - r.lastDone < 5000 || t - r.lastSent < 1000)) return; }
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.watchSim(dt);
      const snap = paced || this.currentSnap();
      if (!snap) return;
      // Under the title the village isn't drawn: a few frames, so the pipelines are built (and on a phone, timed), then nothing.
      if (this.idle) { if (this.idleFrames > (this.governor && !this.benched ? 40 : 3)) return; this.idleFrames = (this.idleFrames || 0) + 1; } else this.idleFrames = 0;
      if (this.onTick) this.onTick(dt);
      if (this.input.touch && this.input.enabled && !this.shared.input[INPUT.PAUSE]) this.aimAssist(dt, snap);
      renderDiagnostics.stage = 'scene update';
      this.processEvents(snap);
      this.viewSwitch?.frame(snap);
      this.updateCamera(dt, snap);
      this.emitAmbient(dt, snap);
      this.emitBleeds(dt, snap);
      this.updateTrail(dt, snap);
      this.updateDrops(dt, snap);
      this.autoplay?.frame(dt, snap);
      const c = this.overrideCam || this.cam;
      if (this.town) this.town.frame(snap, c, this.renderer.hour, !!this.shared.input[INPUT.PAUSE] || !!this.idle);
      this.questTrail?.frame(dt, snap);
      renderDiagnostics.stage = 'renderer';
      this.renderer.frame(c, snap, this.sway, dt);
      // Who's drawn, body or shadow: the world poses them every tick (if near) and everyone else less often.
      { const seen = this.shared.input, rc = this.renderer.chars; for (let i = 0; i < MAX_CHARS; i++) seen[INPUT.SEEN + i] = rc[i]?.casts ? 1 : 0; }
      // The townsfolk are paced the same way, but asked once the renderer has drawn them: their next poses have until the next
      // frame to be ready.
      if (!this.unpaced) this.town?.pace(now);
      renderDiagnostics.presented();
      renderDiagnostics.stage = 'HUD';
      this.drawOpening?.(snap, c);
      this.townUI?.frame(dt, c, snap[H.PX], snap[H.PY], snap[H.PZ], this.input.yaw, !!this.shared.input[INPUT.PAUSE] || !!this.idle, snap);
      this.lands?.frame(snap);
      // (Nothing of the music's begins in the opening, which has its own sound, till you're on the road with her.)
      this.music?.frame(dt, snap, !!this.shared.input[INPUT.PAUSE] || !!this.idle, snap[H.OPENING] > 0 && snap[H.OPENING] < OPENING.ESCORT);
      this.audio.listener(c.x, c.y, c.z, c.fx, c.fy, c.fz, c.ux, c.uy, c.uz);
      if (!this.idle) this.govern(dt);
      const r = this.renderer, hs = this.hudStats;
      hs.gpuMs = r.stats.gpuMs; hs.busyMs = r.stats.busyMs; hs.W = r.W; hs.H = r.H; hs.scale = r.scale; hs.msaa = r.msaa; hs.demoted = r.demoted || 0; hs.vsync = this.vsyncMs;
      hs.sim = this.simStats;
      this.hud.update(dt, snap, hs);
      this.foeBars?.update(snap, !this.idle && !this.input.menu && this.input.enabled);
      this.clock.set(r.hour);
      this.chatLog?.update(dt, !this.idle && (!this.input.menu || !!this.heroTalk?.open));
      if (this.heroTalk) {
        // (Names and bubbles stay up while a hero is talking to you: the panel is theirs.)
        this.heroTalk.update(dt, snap, r.hour, !this.idle && (!this.input.menu || !!this.heroTalk.open));
        this.party?.update(dt, snap);
        // The sim keeps the heroes' day by this clock.
        if ((this.hourT = (this.hourT ?? 0) - dt) <= 0) { this.hourT = 2; this.sim.postMessage({ type: 'hour', hour: r.hour }); }
      }
      if (this.spellbar) this.spellbar.update(snap);
      if (this.worldMap) this.worldMap.update(dt, snap, this.input.yaw, !this.idle && this.input.enabled && !this.input.menu && !(snap[H.OPENING] > 0 && snap[H.OPENING] < OPENING.ESCORT));
      if (this.spellSound) this.spellSound.channel(snap[H.CAST_HELD] | 0);
      if (this.onFrame) this.onFrame();
    };
    const loop = (now) => {
      schedule(loop);
      try { draw(now); } catch (error) {
        renderDiagnostics.fail(error);
      }
    };
    schedule(loop);
  }

  // Thumbs can't track a moving target the way a mouse can, so the view drifts onto the nearest enemy's chest.
  aimAssist(dt, snap) {
    const inp = this.input;
    let best = 0.42, target = null;
    for (let i = 0; i < snap[H.NCHARS]; i++) {
      const co = CHARS_START + i * C_SIZE;
      if (snap[co + C.ACTIVE] < 0.5 || snap[co + C.STATE] === 10 || !snap[co + C.HOSTILE]) continue;
      const dx = snap[co + C.X] - snap[H.PX], dz = snap[co + C.Z] - snap[H.PZ], d = Math.hypot(dx, dz);
      if (d > 5.5) continue;
      const dy = snap[co + C.Y] - snap[H.PY];
      if (Math.abs(dy) > 2.2) continue;
      const yaw = Math.atan2(dx, dz);
      const pitch = Math.atan2(dy + (i < 2 ? 1.32 : 0.9) - 1.62, Math.max(d, 0.8));
      const off = Math.hypot(wrapAngle(yaw - inp.yaw), pitch - inp.pitch);
      if (off < best) { best = off; target = { yaw, pitch }; }
    }
    if (!target) return;
    const strength = 1 - Math.exp(-dt * (snap[H.SWINGING] > 0.5 ? 2.2 : 0.8));
    inp.yaw += wrapAngle(target.yaw - inp.yaw) * strength;
    inp.pitch += (target.pitch - inp.pitch) * strength * 0.7;
  }

  // Dynamic resolution: hold the display's refresh rate, spend what's left on pixels. (PCs: gfx/deskscale.js. Phones:
  // gfx/governor.js.)
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
    const step = Math.max(0, DESK_STEPS.indexOf(r.scale));
    this.deskScale ||= {};
    r.scale = DESK_STEPS[deskStep(this.deskScale, r.stats.gpuMs || busyMs, frameMs, step, () => r.demote())];
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
    const sp = snap[H.SURF] > 0.5 ? 0 : snap[H.GROUND_SPEED];    // (No steps, on the shield.)
    this.bobT += dt * sp * 1.25 * (snap[H.ON_GROUND] > 0.5 ? 1 : 0);
    const bobA = clamp(sp / 6, 0, 1);
    const bobY = Math.sin(this.bobT * 2) * 0.03 * bobA;
    const bobX = Math.cos(this.bobT) * 0.018 * bobA;
    // The eye is put where the player is now, on from where the snapshot has them: by the frames' time since it (paced: a frame,
    // the same every frame), or else by the clock since it was written.
    let age = 0;
    // (In third person your body is drawn where the snapshot has it, and the camera keeps to it: THIRD below.)
    const third = snap[H.TP] > 0.5;
    if (third) age = 0;
    else if (this.buffer && this.pacedSnap && this.snapUs) {
      age = clamp(((Atomics.load(this.shared.ctrl, CTRL.PACE_US) - this.snapUs) | 0) / 1e6, 0, 0.04);
    } else if (this.buffer) {
      const now = (performance.timeOrigin + performance.now()) % 2147483647;
      age = clamp((now - Atomics.load(this.shared.ctrl, CTRL.PUB_MS)) / 1000, 0, 0.02);
    }
    const eyeX = snap[H.PX] + snap[H.VX] * age + rx * bobX;
    const eyeY = snap[H.PY] + 1.62 + bobY - snap[H.CAM_DROP] - Math.min(snap[H.DODGE], 0.2) * 0.45;
    const eyeZ = snap[H.PZ] + snap[H.VZ] * age + rz * bobX;
    this.audio.surf(snap[H.SURF] > 0.5 && inp.enabled ? Math.hypot(snap[H.VX], snap[H.VZ]) : 0, snap[H.ON_GROUND] > 0.5);
    // What's under your own feet, for their sound (onEvent STEP), looked up a few times a second.
    if (!(this.groundT-- > 0)) { this.groundT = 8; this.underfoot = groundAt(snap[H.PX], snap[H.PY], snap[H.PZ]); }
    // Third person (src/core/third.js): from a step to the right of the eye and a little over it, back along the same line
    // you look along, as far as the sim found room for. Coming up to a wall it closes in at once, and eases back out after.
    let cx = eyeX, cy = eyeY, cz = eyeZ;
    if (third) {
      const room = clamp(snap[H.TP_DIST], THIRD.near, THIRD.dist), side = THIRD.side * snap[H.TP_SIDE];
      this.boom = this.boom === undefined ? THIRD.near : room < this.boom ? room : Math.min(room, this.boom + (room - this.boom) * (1 - Math.exp(-6 * dt)) + 0.4 * dt);
      const px = snap[H.PX] + rx * side, py = snap[H.PY] + 1.62 - snap[H.TP_DROP] + THIRD.up, pz = snap[H.PZ] + rz * side;
      cx = px - fx * this.boom; cy = py - fy * this.boom; cz = pz - fz * this.boom;
    } else this.boom = undefined;
    this.renderer.third = third;
    this.renderer.thirdNear = third && this.boom < THIRD.hide;
    if (snap[H.SURF] > 0.5 && !third) {
      const hs = Math.hypot(snap[H.VX], snap[H.VZ]);
      if (hs > 0.5) { this.boardX = snap[H.VX] / hs; this.boardZ = snap[H.VZ] / hs; } else if (this.boardX === undefined) { this.boardX = 0; this.boardZ = 1; }
      boardPose(this.renderer.board.mat, snap[H.PX] + snap[H.VX] * age, snap[H.PY], snap[H.PZ] + snap[H.VZ] * age, this.boardX, this.boardZ, snap[H.ON_GROUND] > 0.5);
    }
    Object.assign(this.cam, { x: cx, y: cy, z: cz, fx, fy, fz, ux, uy, uz });
    // The sword lags your hands a little. (It rides your steps in its own clip, great_idle.)
    this.swayX = damp(this.swayX, clamp(inp.yawVel * 1.5, -0.05, 0.05), 11, dt);
    this.swayY = damp(this.swayY, clamp(inp.pitchVel * 1.5, -0.05, 0.05), 11, dt);
    inp.yawVel = 0; inp.pitchVel = 0;
    const vy = (snap[H.SURF] > 0.5 ? 0 : Math.min(0, snap[H.VY]) * 0.002) + this.swayY;
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
    this.sparkT = (this.sparkT || 0) + dt;
    if (this.sparkT > 0.11) { this.sparkT = 0; r.fireSparks(this.cam); }
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

  // What one of the other Tessariels' moves does that only this thread can (HFX in src/sim/heroskills.js): at (x, y, z).
  heroFx(code, x, y, z, a, b, c) {
    const r = this.renderer, au = this.audio;
    switch (code) {
      case 1: {
        // Blood thrown from a cut, the way (a, c) with how much (b): a gout along it, and a spatter every way. It falls and soaks in.
        // (Jets of it, in drops big enough to be seen across a field.)
        // (A third of what it was, and not thrown so far: a fight of knives was a red fan with nobody to be seen in it.)
        const n = Math.ceil(50 + 110 * b);
        r.emit(0, n, x, y, z, a * 1.5, 0.8, c * 1.5, 0.45, 1.8, 4.5 + 2 * b, 0.004, 0.02, 0.6, 1.5);
        r.emit(0, Math.ceil(n * 0.4), x, y, z, 0, 1, 0, 1.4, 1, 5, 0.003, 0.014, 0.5, 1.3);
        au.play('splat', x, y, z, 0.3 + b * 0.35);
        break;
      }
      // A lute's string (a: semitones from its lowest, b: how loud), and a bell-like one for the paladin's light.
      case 2: au.pluck(x, y, z, a, b || 0.5); break;
      case 4: au.pluck(x, y, z, a, b || 0.5, true); break;
      // Sparks off steel (a: how many).
      case 3: r.emit(2, Math.ceil(a || 30), x, y, z, 0, 0.4, 0, 1.4, 1.5, 6, 0.002, 0.005, 0.15, 0.5); break;
      // Something heavy coming down.
      case 5: au.play('land', x, y, z, 0.8 + (a || 0) * 0.6, 0.7); r.emit(3, 30, x, y + 0.03, z, 0, 1, 0, 1.4, 0.6, 2.6, 0.06, 0.16, 0.5, 1.3); break;
      default: break;
    }
  }

  onEvent(type, a, b, c, d, e, f, g) {
    const r = this.renderer, au = this.audio;
    switch (type) {
      case EV.SWING: break;
      case EV.HERO: this.heroTalk?.onEvent(a, b, c, d, e, f); break;
      case EV.HERO_FX: this.heroFx(a | 0, b, c, d, e, f, g); break;
      // (A boss down is told to the quests too: src/folk/quests.js QuestBook.boss.)
      case EV.WILD: this.wilds?.on(a, b, c, d, e, f, g); break;
      case EV.DELVE: this.party?.onDelve(a, b, c, d); if ((a | 0) === DELVE_CODE.BOSS_DOWN) { this.townUI?.quests.boss(DELVE_BOSSES[b | 0]?.key); this.music?.stinger('triumph'); } break;
      case EV.HERO_LEVEL: case EV.HERO_DUEL: break;
      case EV.SPELL_CAST:
        this.heroTalk?.onSpell(b);
        r.castFlare = performance.now();
        if (!this.spellSound) this.spellSound = new SpellSound(au);
        this.spellSound.gather(a);
        if (this.town) this.town.cast++;   // (The town's never seen real magic: src/folk/talk.js.)
        this.hud.once('cast', this.input.touch ? 'Tap a spell to cast it, and hold to keep casting. Your spellbook is in the top row.' : '1 to 6 cast what is in each slot: hold to keep casting. B is your spellbook. Alt gives you a cursor to click them with.', 5);
        break;
      case EV.SPELL_LOOSE:
        if (!this.spellSound) this.spellSound = new SpellSound(au);
        this.spellSound.loose(a, c, d, e, SPELLS[b]?.key ?? null);
        break;
      case EV.SPELL_ZONE:
        this.spellSound?.zone(SPELLS[b]?.key, c, d, e, f);
        break;
      case EV.SPELL_HIT:
        this.heroTalk?.onSpellHit(f);
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
        // (Yours comes with no place. One with a place is a caster of the dead's working, broken by a blow
        // (src/sim/undead.js interrupt): heard, but it's not your mana that ran out.)
        if (!a && !b && !c) this.hud.tip('Not enough mana.', 1.2);
        break;
      case EV.WHOOSH:
        au.play('attack', d === 1 ? null : a, b, c, d === 1 ? 0.8 : 0.9, d === 1 ? 0.92 : 1.05);
        break;
      case EV.BITE:
        // One of the other Tessariels' blows landing (src/sim/hero.js): (x, y, z, how hard 0-1, flesh). Heard and seen
        // where it lands; nothing on your HUD, since it isn't your hit.
        au.play('impact', a, b, c, 0.55 + d * 0.5, 0.95 + Math.random() * 0.12);
        if (e) {
          if (d > 0.4) au.play('splat', a, b, c, 0.35 + d * 0.3);
          r.emit(0, Math.ceil(50 + 150 * d), a, b, c, 0, 0.3, 0, 0.9, 0.6, 3.5, 0.0014, 0.008, 0.5, 1.4);
        } else r.emit(2, Math.ceil(10 + 30 * d), a, b, c, 0, 0.3, 0, 1.1, 1, 5, 0.0018, 0.005, 0.15, 0.45);
        break;
      case EV.GASH:
        au.play('impact', a, b, c, 1.1, 0.92);
        if (r.chars[g]?.flesh) {
          // Rotten meat: no steel to ring or throw sparks, only the blood it was holding.
          au.gore(a, b, c, 0.8, 0.34, 1600);
          au.play('splat', a, b, c, 0.8);
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
        if (r.chars[g]?.flesh) au.play('squelch', a, b, c, 1);
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
        // Each on what it's walking on: dirt, stone, boards or water (src/ui/places.js). Dust only off dry ground.
        const loud = d;
        if (f === -1) { au.play(`${loud > 0.7 ? 'run' : 'walk'}_${this.underfoot}`, null, 0, 0, 0.2 + loud * 0.15, 1, false); break; }
        const g = groundAt(a, b, c), dust = g === 'dirt';
        if (e === 2) {
          au.play(`armorWalk_${g}`, a, b, c, 0.35 + loud * 0.35, 1.55);
          if (loud > 0.6 && dust) r.emit(3, 1, a, b + 0.05, c, 0, 0.5, 0, 1, 0.15, 0.5, 0.05, 0.1, 0.4, 0.8);
        } else {
          au.play(`${loud > 0.6 ? 'armorRun' : 'armorWalk'}_${g}`, a, b, c, 0.75 + loud * 0.4);
          if (loud > 0.45 && dust) r.emit(3, 2, a, b + 0.05, c, 0, 0.5, 0, 1, 0.15, 0.5, 0.05, 0.1, 0.5, 1);
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
        // (Now and then a man goes down the way they do in the pictures.)
        if (Math.random() < 0.04) au.play('wilhelm', a, b, c, 1.1);
        au.play('armorLand', a, b, c, 1.4, 0.75);
        au.play('impact', a, b, c, 1.3, 0.5);
        au.gore(a, b, c, 1, 0.9, 500);
        r.emit(3, 40, a, b - 0.8, c, 0, 0.6, 0, 1.5, 0.4, 2, 0.08, 0.2, 0.8, 1.8);
        break;
      case EV.GLINT:
        r.emit(2, 3, a, b, c, 0, 1, 0, 2, 0.1, 0.5, 0.004, 0.008, 0.1, 0.2);
        this.hud.once('glint', this.input.touch ? 'A blade flashes before it falls. Dodge, or swing into it to parry.' : 'A blade flashes before it falls. Q to dodge, or swing into it to parry.');
        break;
      case EV.JUMP: au.play(`jump_${this.underfoot}`, null, 0, 0, 0.32, 1, false); break;
      case EV.DODGE: au.play(`run_${this.underfoot}`, null, 0, 0, 0.5, 1.15, false); break;
      case EV.HYDRA_NOTICE: this.hud.once('hydra', 'Three heads have turned your way. It has given you one warning.', 5); break;
      case EV.FIRE: {
        // One head's breath, this instant. A hiss under it, not on every puff, and a roar of flame as a gout begins.
        if (performance.now() - (this.breathAt || 0) > 700) au.play('torchStrike', a, b, c, 1.4, 0.65);
        this.breathAt = performance.now();
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
        au.play('boneSnap', a, b, c, 1.3, 0.85);
        au.play('squelch', a, b, c, 1, 0.9);
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
      case EV.LOOT: this.drops.fromKill(a, b, c, d); this.gainXp?.(d, e); this.heroTalk?.onPlayerKill(e ? e - 1 : d); this.townUI?.kill(a, b, c, d | 0, e > TRIPO_KIND ? GROUP_KEYS[e - 1 - TRIPO_KIND] || null : null); this.autoplay?.kill(e ? FOE_NAMES[e - 1] || 'FOE' : d === 9 ? 'JELLY OR SMALL TUMBLER' : d === 6 ? 'BIG TUMBLER' : d === 8 ? 'CHAMPION' : d >= 20 ? 'HOARD' : 'FOE'); break;
      case EV.CHAMPION: this.renderer.emit(2, 4, a, b, c, 0, 1, 0, 1.6, 0.25, 0.6, 0.01, 0.03, 0.25, 0.5); break;
      case EV.EMPTY_HANDS: this.hud.tip(`Nothing in your hands. ${this.input.touch ? 'Open your pack' : 'Press I'} to take up a staff.`, 3); break;
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
        au.play('crunch', a, b, c, 1.1, 0.85);
        r.emit(3, 26, a, b, c, 0, 0.6, 0, 1.4, 0.4, 1.6, 0.08, 0.2, 0.7, 1.5);
        break;
      case EV.LOSE:
        au.play('armorLand', null, 0, 0, 1, 0.7); this.music?.stinger('fell');
        // (Cut down in Bellmourn's streets, with the town looking on.)
        if (inTown(a, c, 10)) { au.play('crowdGasp', a, b, c, 1.6); au.play('crowdPanic', a, b, c, 1.2); }
        break;
      case EV.LAND: au.play(`land_${this.underfoot}`, null, 0, 0, 0.25 + d * 0.4, 1, false); break;
      case EV.ALERT: au.play('unsheath', a, b, c, 1.2); break;
      case EV.SHIELD_BREAK:
        au.play('blocked', a, b, c, 1.4, 0.55);
        r.emit(2, 60, a, b, c, 0, 0.2, 0, 1.5, 1, 5, 0.0022, 0.005, 0.2, 0.6);
        // (Yours, out of breath; or a knight's, opened up by a blow or a spell on his board.)
        // (Only one near enough to be your doing, or your party's beside you.)
        if (d > 0.5) this.hud.tip('Your guard is broken: out of breath.', 2);
        else { const sn = this.currentSnap(); if (sn && Math.hypot(a - sn[H.PX], c - sn[H.PZ]) < 16) this.hud.tip('His guard is broken!', 2); }
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
      // bm.give('vesperglass_epic'): all five pieces of that set of gear.
      give: (base, opts = {}) => {
        const rng = makeRng((Math.random() * 4294967296) >>> 0);
        if (ROBE_SETS[base]) return SET_PARTS.map((slot) => { const it = rollRobe(rng, { set: base, slot }); return view.pack.add(it) ? it : null; });
        const item = base === 'gem' ? rollGem(rng, opts) : SHIELDS[base] ? rollShield(rng, { base, ...opts }) : SKULLS[base] ? rollSkull(rng, { base, ...opts }) : ROBES[base] ? rollRobe(rng, { base, ...opts }) : rollWeapon(rng, { base, ...opts });
        return view.pack.add(item) ? item : null;
      },
      // Lays one on the ground beside the player: bm.lay('fluked_greatsword', { rarity: 2 }).
      lay: (base, opts = {}) => {
        const rng = makeRng((Math.random() * 4294967296) >>> 0);
        const s = view.currentSnap();
        view.drops.fromPlayer(base === 'gem' ? rollGem(rng, opts) : SHIELDS[base] ? rollShield(rng, { base, ...opts }) : SKULLS[base] ? rollSkull(rng, { base, ...opts }) : ROBES[base] ? rollRobe(rng, { base, ...opts }) : rollWeapon(rng, { base, ...opts }), s[H.PX], s[H.PY], s[H.PZ], view.input.yaw);
      },
      snap: () => view.currentSnap(),
      cmd,
      // The living land's own (src/sim/wilds.js debug): bm.wild(1, n) a meeting of the nth kind ahead of you; bm.wild(2) to the
      // nearest open tear; bm.wild(3, n) to the nth outpost; bm.wild(4, n) to the nth standing battle; bm.wild(6, n) a raid on the nth town.
      wild: (a, b = 0, c = 0) => cmd(50, a, b, c),
      look: (yaw, pitch) => { view.input.yaw = yaw; view.input.pitch = pitch; },
      attack: () => { shared.input[INPUT.ATTACK] += 1; },
      // Starts the run over (with the opening on, from the first breath in the cave).
      replay: () => { shared.input[INPUT.RESTART] += 1; },
      // For testing the opening: skip a scene, or hold Lisandra in a pose ({ at: [x, z], face, clip, from, hold, rate }; null lets go).
      skip: () => sim.postMessage({ type: 'openingSkip' }),
      pose: (b) => sim.postMessage({ type: 'openingPose', b }),
      wide: () => { shared.input[INPUT.WIDE] += 1; },
      spell: (i) => { const n = typeof i === 'number' ? i : SPELLS.findIndex((s) => s.key === i); view.spellbar.pick(n); return n; },
      cast: (held = 0) => { shared.input[INPUT.CAST_N] += 1; shared.input[INPUT.CAST] = held; },
      castKey: () => shared.input[INPUT.CAST],
      book: () => $('spellbook').classList.toggle('open'),
      // The six trees, for tests: skills() is what's learned; skills('spend', id), skills('give', n) points, skills('all') learns
      // everything, skills('unlearn'), skills('level', n) sets your level.
      skills: (cmd, a) => {
        const S = view.spellbar.skills;
        if (cmd === 'spend') return S.spend(a) || S.why(a);
        if (cmd === 'give') S.give(a | 0);
        if (cmd === 'all') S.learnAll();
        if (cmd === 'unlearn') S.unlearn();
        if (cmd === 'level') { view.pack.level = Math.max(1, Math.min(50, a | 0)); view.pack.xp = xpFor(view.pack.level); view.spellbar.refresh(); }
        return { level: view.pack.level, points: S.points, spent: S.spent, ranks: { ...S.ranks } };
      },
      jump: () => { shared.input[INPUT.JUMP] += 1; },
      setCam: (c) => { view.overrideCam = c; view.reviewCam = c; },
      // The third-person body dressed whole in one set of gear (src/gfx/bodyskin.js), to look at it: wear() for what's really worn.
      wear: (id) => view.wearSkin(id),
      setTime: (h) => view.renderer.setHour(h),
      hour: () => view.renderer.hour,
      fixScale: (s) => { view.fixedScale = true; view.renderer.scale = s; },
      // The other Tessariels, for review: heroes('dump') lists them; near, at, task, surf, gesture, skill, freeze stage scenes.
      heroes: (cmd = 'dump', o = {}) => {
        const id = Math.floor(Math.random() * 1e9);
        sim.postMessage({ type: 'heroDebug', cmd, id, ...o });
        if (cmd !== 'dump' && cmd !== 'undead') return Promise.resolve(cmd);
        // (undead: where every zombie and caster is and what it's doing, and the other monsters' places.)
        return new Promise((resolve) => { const on = (e) => { if (e.data.type === 'heroState' && e.data.id === id) { sim.removeEventListener('message', on); if (e.data.undead) { resolve({ undead: e.data.undead, others: e.data.others }); return; } window.bmHeroFx = { zones: e.data.zones, shots: e.data.shots, dots: e.data.dots }; resolve(e.data.heroes); } }; sim.addEventListener('message', on); });
      },
      // Your party and the Hollowfang Warrens, for tests: hire(n) takes the first n offered (a tank and a healer first);
      // warrens('enter' | 'boss', { n }) goes straight in, or to the nth boss's door; warrens('hurt', { n, frac }).
      // (Any delve: warrens('enter', { delve: 'blackvigil' | 'deeps' }), warrens('boss', { boss: 'maldrec' }),
      // warrens('room', { room: 'bv_hall' }) to a room's middle. src/sim/dungeon.js debug)
      hire: (n = 4) => { const P = view.party; if (!P) return []; P.makeOffers(); const by = (r) => P.offers.filter((o) => (o.cls === 'lancer') === (r === 'tank') && (o.cls === 'paladin') === (r === 'heal'));
        for (const o of [...by('tank').slice(0, 1), ...by('heal').slice(0, 1), ...by('dps')].slice(0, n)) P.hire(o, true); return P.members; },
      warrens: (cmd = 'enter', o = {}) => sim.postMessage({ type: 'warrensDebug', cmd, ...o }),
      warrensState: () => view.party?.warrens,
      // The Test Dungeon, for tests: hall('summon', { list: [{ id: 'tripo:kobold_1', n: 3 }] }), hall('kill') drops everything
      // past the door, hall('clear') empties the arena; hallState() is the sim's last word on it.
      hall: (cmd, o = {}) => (cmd === 'summon' && view.hallUI ? view.hallUI.send(o.list || []) : sim.postMessage({ type: 'hall', cmd, ...o })),
      hallState: () => view.hallUI?.hall,
      heroSay: (slot, trig) => view.heroTalk?.say(view.heroTalk.heroes[slot], trig, null, {}),
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
