// The frame graph: compute (skinning, grass, particles) -> shadows -> forward HDR pass with MSAA ->
// AO, sun shafts, particles at full resolution -> bloom -> composite. WebGPU only, from the start.
import { FIELD_CREATURES } from '../core/field-creatures.js';
import { TRIPO_BASE, TRIPO_SLOTS, withVariants } from '../core/tripo-monsters.js';
import { TripoSlots } from './tripo-slots.js';
import { BodySkin } from './bodyskin.js';
import { TOWN_KNIGHTS } from '../core/knights.js';
import { LISANDRA_FORMS, LISANDRA_SCALE, SKIRT_PALETTE_JOINTS } from '../core/lisandra.js';
import { FOREST_REACH } from '../core/forest.js';
import { WORLD_EDGE } from '../core/lands.js';
import { PORTAL_MODELS, buildSites } from '../core/sites.js';
import { braziers, inDungeon, torches } from '../core/dungeon.js';
import { DOOR, HALL, hallLights, inHall } from '../core/testhall.js';
import { SlimeBodies } from './slimes.js';
import { DUST_AT, OPENING, SWAP_AT, prettyShown } from '../core/opening.js';
import { CHURCH_FOOTPRINT, CHURCH_PATCH, CHURCH_WING, LAND_HOLE } from '../core/church.js';
import { loadOpeningStage } from './opening.js';
import { DAWN_HOUR, DUSK_HOUR, secondsPerHour, daylight } from './daylight.js';
import { Pines } from './pines.js';
import { Rocks } from './rocks.js';
import { accessor, imageBytes, parseGLB } from '../core/glb.js';
import { getFile, lanes, watched } from '../core/files.js';
import { C, C_BLEEDS, C_MASKS, C_GASH, C_PALETTE, C_PROPS, C_SIZE, CHARS_START, H, MAX_CHARS, SLIMES_START, SPELL_PALETTE, VM_PALETTE, WEAPONS } from '../core/layout.js';
import { addStumps } from './stumps.js';
import { GEAR, ROBES, SKULLS } from '../items/items.js';
import { SkullEyes } from './skulleyes.js';
import { ShadowCache } from './shadowcache.js';
import { GEM_CUTS, SKULL_ANCHORS } from './skullgemdata.js';
import { PATTERNS, SKINS } from '../items/skins.js';
import { BODIES } from '../sim/undead.js';
import { lerp, mat4Invert, mat4LookTo, mat4Mul, mat4Ortho, mat4Perspective, smoothstep } from '../core/math.js';
import { shieldPose } from '../core/shield-pose.js';
import { MipGen, makeBuffer, mipCountFor, loadTextureArray, decodeScaledBitmap } from './gpu.js';
import { ARMOR, ARMOR_TRUE, GRASS, GRASS_CULL, ITEM, PROP, SHADOW, SKY, SKY_BAKE, STATIC, TERRAIN, VIEWMODEL, VIEWMODEL_SKULL, staticSoftCut } from './materials.js';
import { AO, BLOOM, COMPOSITE, PARTICLE_DRAW, PARTICLE_SIM, SHAFTS, STAIN, TRAIL } from './post.js';
import { SpellFX } from './spellfx.js';
import { bodyRadius, inCascade } from './shadowcull.js';
import { buildGlowPipeline, drawGlow, drawOpaque, loadInterior, visibility } from './interior.js';
import { TrailFX } from './trail.js';
import { HomeLights } from './homelights.js';
import { CRAB_SCALE } from '../sim/crab.js';
import { GRAVEHART_SCALE } from '../sim/gravehart.js';
import { HYDRA_SCALE } from '../sim/hydra.js';
import { MAX_LIT, SKIN } from './shaders.js';
import { Dangles } from './dangles.js';
import { CURIO_GEMS, CURIO_TRAY_Y, MR as WARE_MR, PALETTE as WARE_PALETTE, SHADE as WARE_SHADE, wareMesh } from './wares.js';
import { PLACES } from '../folk/town.js';
import { STAFF_GLOW, STAFF_SPIN } from '../items/staffglow.js';
import { STAFF_CORES } from '../items/staffcores.js';
import { staffEffect, BARE } from '../items/staffeffects.js';
import { VIEWMODEL_STAFF, STAFF_FX_OFFSET, STAFF_AXES_OFFSET, STAFF_UBO_SIZE } from './stafffx.js';
const FX_STRENGTH = new Float32Array(1);
import { eyeAxes, staffBind } from './dangles.js';
import { STAFFS2 } from '../items/staffs2.js';

const STAFFS2_IDS = new Set(STAFFS2.map((s) => s.id));
const OLD_STAFF_HELD = 0.8;

const WORLD_FOV = 64 * Math.PI / 180;
// (The lights, and after them the dark under whoever stands near: writeFeet.)
const FRAME_FLOATS = 224 + MAX_LIT * 8 + 56;
// A body's uniforms (materials.js CharU): its wounds, the pieces cut off, info, and the witch's mouth and lip line.
const CHAR_UBO = 24 * 64 + 256 + 48;
// The surfing hand's one joint, as a dual quaternion: it leans and swings about the shoulder with the steering (-1 left, 1 right), and rises as it comes out.
const SURF_PIVOT = [-0.33, -0.33, 0.2], surfPal = new Float32Array(8);
function surfHandPose(tilt, up, time) {
  const hy = -tilt * 0.08, hz = -tilt * 0.15, sy = Math.sin(hy), cy = Math.cos(hy), sz = Math.sin(hz), cz = Math.cos(hz);
  const x = sy * sz, y = sy * cz, z = cy * sz, w = cy * cz;
  const [px, py, pz] = SURF_PIVOT, cx1 = y * pz - z * py, cy1 = z * px - x * pz, cz1 = x * py - y * px;
  const ease = up * (2 - up);
  const tx = -2 * (w * cx1 + y * cz1 - z * cy1), ty = -2 * (w * cy1 + z * cx1 - x * cz1) - (1 - ease) * 0.7 + Math.sin(time * 1.3) * 0.004, tz = -2 * (w * cz1 + x * cy1 - y * cx1);
  surfPal[0] = x; surfPal[1] = y; surfPal[2] = z; surfPal[3] = w;
  surfPal[4] = 0.5 * (tx * w + ty * z - tz * y); surfPal[5] = 0.5 * (-tx * z + ty * w + tz * x);
  surfPal[6] = 0.5 * (tx * y - ty * x + tz * w); surfPal[7] = -0.5 * (tx * x + ty * y + tz * z);
  return surfPal;
}

// The middle of the skull in the left hand, in the view's own space. Printed by tools/wizard/skull_arm.py.
export const SKULL_AT = [-0.483, -0.159, -0.783];

const O = { VP: 0, VIEW: 16, PROJ: 32, IVP: 48, VMP: 64, VMW: 80, CASC: 96, CAM: 144, SUN: 148, SUNC: 152, SKY: 156, GND: 160, FOG: 164, FOGP: 168, SPLIT: 172, SCREEN: 176, WIND: 180, GROUND: 184, BLOOD: 188, CHARS: 192, LIGHTS: 216, COUNTS: 216 + MAX_LIT * 8, CAVE: 220 + MAX_LIT * 8, FEET: 224 + MAX_LIT * 8, FEET_BOX: 272 + MAX_LIT * 8, FEET_Y: 276 + MAX_LIT * 8 };
// Four floats, or a light's eight, into the frame's uniforms at o: as d.set([...], o) did, without an array each time.
const put4 = (d, o, a, b, c, e) => { d[o] = a; d[o + 1] = b; d[o + 2] = c; d[o + 3] = e; };
const putLight = (d, o, L, i) => { d[o] = L.p[0]; d[o + 1] = L.p[1]; d[o + 2] = L.p[2]; d[o + 3] = L.r; d[o + 4] = L.c[0]; d[o + 5] = L.c[1]; d[o + 6] = L.c[2]; d[o + 7] = i; };
// The kite shield on the arm, as the owner's photo has it: its point straight down the screen as shield_hold has it, and its inner face lying on the top of the hand and along
// the forearm toward the elbow (fitted to the skinned arm, within a millimetre at both, on the rig's shield joint). Bigger than on the ground, to fill the owner's outline.
const KITE_TURN = -2 * Math.PI / 180, KITE_TILT = -9.5 * Math.PI / 180, KITE_SCALE = 1.25, KITE_SEAT = [-0.06, -0.08, -0.023];
// The raised arm (assets/game/items/shield_arm.glb, already posed in view space) and the socket on it, printed by tools/fp_shield_arm/bake.py.
const SHIELD_SOCKET = [0.99692, -0.01765, 0.07643, 0.00000, 0.00000, 0.97437, 0.22495, 0.00000, -0.07844, -0.22426, 0.97137, 0.00000, 0.05418, -0.29743, -0.51052, 1.00000];
// A shield on the socket, as the owner's outline has it: this wide and its top this high, its inner face to the eye and on the back of the arm. SHIELD_FACE: which way its inner face looks in its own model.
const SHIELD_WIDTH = 0.675, SHIELD_TOP = 0.4932, SHIELD_FACE = 1, SHIELD_PLANE = -0.018, SHIELD_ARM_Y = 0.107;
const FAR_HALF = WORLD_EDGE + 32;   // What the coarse map of the land covers, either way: all of it (src/core/lands.js).
// Out past this from where the land's grid and the pines were last laid, they're laid again round you (followLand).
const FOLLOW_AT = 420;
const GROUND_SIZE = 1024, GROUND_HALF = 128, BLOOD_HALF = 64;
const LINEAR_DEPTH = 'r16float';
const DEPTH = 'depth32float';
const FLAT = { iron: 100, flame: 101, water: 102, fruit: 103, fruit2: 104, white: 106, tile: 107, glow: 108, lake: 110, falls: 111, ice: 112, seal: 113, obsidian: 114 };
// A painting in another light (src/core/sites.js): its layer plus a thousand times which (materials.js STATIC).
const TINTS = { dark: 1, pale: 2, frost: 3 };
const MAX_GROUND = 160;
// The portals (portalModel): the Warrens' three in their walls, at these spots (src/core/sites.js portalWall), and a seal's at
// every seal (seal_*). How big each is drawn is PORTAL_MODELS's. SWIRL: each one's whirl for the shader (src/gfx/materials.js
// ITEM), its middle and radius in the model's own units (tools/portal/pack.py) and which it is; and where its motes go round
// (portalFx), in the same units: the doorway's middle and the funnel's rim (back from the dais's middle), the seal's swirl's
// face and radius.
const PORTAL_SPOTS = ['hf_portal', 'hf_in', 'hf_out'];
const SWIRL = { dungeon: [0, 0.37, 0.3, -2], ground: [0, 0, 0.267, -3] };
const MOTES = { dungeon: { mid: 0.37, rim: -0.17, deck: 0.107 }, ground: { face: 0.086, r: 0.267 } };
// A PC's far bodies (addLod, bodyDetail): the coarse mesh's cell in metres, and how much of a pixel a cell must have shrunk
// to before that mesh is drawn. At 4.5 cm it keeps 95% or more of a body's outline (a fifth of the triangles); a coarser
// one was tried for the farthest and thinned them (11 cm kept 70 to 80%: arms weld away), so there's the one.
const LOD_CELL = 0.045;
const LOD_PIXELS = 0.8;
// The dark the ground has under whoever stands on it (shaders.js underfoot): for the twelve bodies nearest you, out to
// this far, where it's faded to nothing.
const FEET = 12, FEET_REACH = 30;
// How far off a body's pose is made less often than the screen's drawn (skinEvery), and how often it's still made, a second.
const SKIN_MID = 40, SKIN_FAR = 90, SKIN_MID_HZ = 65, SKIN_FAR_HZ = 33;

// A rigid model's bounding sphere where its matrix (16 floats of m, at o) puts it: its own origin's place, and its radius
// by the matrix's largest scale. Into t.sx, sy, sz, sr.
function placeSphere(t, m, o, radius) {
  t.sx = m[o + 12]; t.sy = m[o + 13]; t.sz = m[o + 14];
  t.sr = radius * Math.sqrt(Math.max(m[o] * m[o] + m[o + 1] * m[o + 1] + m[o + 2] * m[o + 2], m[o + 4] * m[o + 4] + m[o + 5] * m[o + 5] + m[o + 6] * m[o + 6], m[o + 8] * m[o + 8] + m[o + 9] * m[o + 9] + m[o + 10] * m[o + 10]));
}
// Whether a sphere reaches into the camera's view (pl: its five planes, facing in).
function inView(pl, x, y, z, r) {
  for (let k = 0; k < 20; k += 4) if (pl[k] * x + pl[k + 1] * y + pl[k + 2] * z + pl[k + 3] < -r) return false;
  return true;
}
// The farthest a mesh's points lie from its own origin.
function reachOf(pos) {
  let r = 0;
  for (let i = 0; i < pos.length; i += 3) r = Math.max(r, pos[i] * pos[i] + pos[i + 1] * pos[i + 1] + pos[i + 2] * pos[i + 2]);
  return Math.sqrt(r);
}

const norm3 = (x, y, z) => { const l = 1 / Math.hypot(x, y, z); return [x * l, y * l, z * l]; };

// A coarser index list over the same skinned vertices, by merging everything in a small cell: for shadows on a phone, and
// for bodies in the distance.
function clusterIndices({ pos, idx, uv, skinTag }, cell) {
  const first = new Map();
  const map = new Uint32Array(pos.length / 3);
  for (let v = 0; v < map.length; v++) {
    // Hidden stump caps collapse to the origin in the skin shader. Never weld
    // them into the skin or let a distant mesh join parts that can separate.
    if (skinTag && uv[v * 2] < -1.5) { map[v] = v; continue; }
    const spatialKey = (Math.floor(pos[v * 3] / cell) + 1024) * 4194304 + (Math.floor(pos[v * 3 + 1] / cell) + 1024) * 2048 + Math.floor(pos[v * 3 + 2] / cell) + 1024;
    const key = skinTag ? spatialKey * 16 + (skinTag[v] & 15) : spatialKey;
    let r = first.get(key);
    if (r === undefined) { r = v; first.set(key, v); }
    map[v] = r;
  }
  const out = new Uint32Array(idx.length);
  let n = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = map[idx[i]], b = map[idx[i + 1]], c = map[idx[i + 2]];
    if (a !== b && b !== c && a !== c) { out[n++] = a; out[n++] = b; out[n++] = c; }
  }
  return out.subarray(0, n);
}

// A staff is held turned about its own shaft (STAFF_SPIN, src/items/staffglow.js), the head's face to the eye: its points and normals.
function spinPoint(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
}
function spinStaff(prim, a) {
  const c = Math.cos(a), s = Math.sin(a), pos = new Float32Array(prim.pos), nrm = new Float32Array(prim.nrm);
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], z = pos[v + 2], nx = nrm[v], nz = nrm[v + 2];
    pos[v] = c * x + s * z; pos[v + 2] = -s * x + c * z;
    nrm[v] = c * nx + s * nz; nrm[v + 2] = -s * nx + c * nz;
  }
  prim.pos = pos; prim.nrm = nrm;
}

export class Renderer {
  constructor(gpu, canvas, pool) {
    this.gpu = gpu;
    this.device = gpu.device;
    this.tier = gpu.tier;
    this.canvas = canvas;
    this.pool = pool;
    this.context = canvas.getContext('webgpu');
    this.context.configure({ device: this.device, format: gpu.format, alphaMode: 'opaque' });
    this.frameData = new Float32Array(FRAME_FLOATS);
    this.time = 0;
    this.scale = 1;
    this.mip = new MipGen(this.device);
    this.gashVersions = new Int32Array(MAX_CHARS).fill(-1);
    this.tmpV = new Float32Array(16); this.tmpP = new Float32Array(16); this.tmpVP = new Float32Array(16); this.tmpI = new Float32Array(16);
    this.emitted = [];
    this.emitHead = 0;
    this.prevTip = [];
    this.flash = 0;
    // Mid-afternoon going gold, over the shoulder as you come up the road, so plate and faces read.
    this.hour = DAWN_HOUR;
    this.farSize = gpu.tier.lean ? 1024 : 2048;
    this.sunDir = norm3(-0.78, 0.5, 0.38);
    this.splits = gpu.tier.splits || [12, 38, 130];
    this.shadowFrame = 0;
    this.planes = new Float32Array(20);
    this.bloodUntil = 0;
    this.inFlight = 0;
    this.lastSent = 0;
    this.onBusy = null;
    this.stats = { gpuMs: 0, busyMs: 0, draws: 0 };
  }

  // Every shader is built knowing whether it's for a phone: `if (LEAN)` picks the cheap path, and the compiler drops the
  // other. A phone also has no second colour target, so the depth that would go in it goes nowhere.
  shader(code) {
    let text = `const LEAN = ${!!this.tier.lean};\n${code}`;
    // All fragment return paths must lose the unused depth write. ITEM has an
    // early return named `out`, so matching only `o.depth` leaves invalid WGSL.
    if (this.tier.lean) text = text.replace(/@location\(1\)\s+depth:\s*f32/g, '').replace(/\b\w+\.depth\s*=\s*[^;]*;/g, '');
    return this.device.createShaderModule({ code: text });
  }

  // ---- loading -------------------------------------------------------------------------------------

  // Everything is asked for at the start and comes in side by side: the pictures a few at a time, the models fetched a few
  // ahead of the ones being built, and the land worked out in the pool's threads meanwhile. What's built is still put
  // together in the one order the simulation counts on (this.chars, this.props). How much is in hand at once is set by the
  // tier: a phone has little memory to spare, and every decoded picture is held whole.
  async load(base, progress) {
    const { device, tier, pool } = this;
    this.base = base;
    const lean = !!tier.lean;
    const pictures = lanes(lean ? 2 : 6);     // pictures decoding or going up to the GPU at once, over all the arrays
    const ahead = lanes(lean ? 2 : 6);        // models fetched, waiting to be built or being built
    const building = lanes(lean ? 1 : 4);     // models being built at once (each decodes its three pictures together)
    // Every step that ticks is counted before it's begun: each picture, each model, each piece of the land, and the few
    // steps below that tick on their own. The bar can't run past its end (main.js holds it short of 100% until the game is
    // up), but a miscount here shows as a stall or a jump.
    let done = 0, total = 0;
    const steps = { add: (n = 1) => { total += n; }, tick: () => { done++; progress(done / Math.max(total, 1)); } };
    const { tick } = steps;
    // How long each part took, for tools/load_time.mjs (window.bm.loadLaps): [what, ms since the load began].
    const began = performance.now();
    this.loadLaps = [];
    const lap = (what) => this.loadLaps.push([what, Math.round(performance.now() - began)]);
    const timed = (what, work) => { work.then(() => lap(what), () => {}); return work; };
    this.buildSamplers();
    this.buildBaseLayouts();
    // Swords are fetched the first time one is wanted, in the hand or on the ground, and kept: there are too many maps to load them all up front.
    this.swords = new Map();
    this.gems = new Map();
    this.ground = [];
    this.gauntletSets = new Map();
    this.chests = [];
    this.doorItems = [];
    this.portalItems = null;              // the portals, each its stone and its swirl (portalModel), made the first time they're drawn
    this.stallItems = null;               // the market's wares and their tarps (src/gfx/wares.js), made the first time they're drawn
    this.stallsOpen = new Set();          // which stalls have their wares out (src/folk/brain.js, stall)
    this.board = { sword: null, mat: new Float32Array(16), slot: -1, model: null };   // the shield being ridden
    this.itemInstances = device.createBuffer({ size: 64 * MAX_GROUND, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.itemData = new Float32Array(16 * MAX_GROUND);
    // Tiling noise for clouds and macro variation: four channels of smooth noise.
    this.noiseTex = this.makeNoise();

    const models = ['assets/game/village.glb', 'assets/game/velscour_knight.glb', 'assets/game/silver_knight.glb', 'assets/fp/arms_2h.glb',
      'assets/game/items/crimson_sword.glb', 'assets/game/items/kite_v_red.glb', 'assets/game/items/gilded_sword.glb', 'assets/game/items/kite_t_white.glb',
      'assets/monsters/crab_monster/crab_monster.glb', 'assets/fp/arms_1h.glb', 'assets/monsters/gravehart/gravehart.glb', 'assets/monsters/bone_hydra/bone_hydra.glb', 'assets/fp/spell_attack.glb', 'assets/fp/spell_raise.glb', 'assets/fp/arms_staff.glb',
      ...BODIES.map((b) => `assets/monsters/zombie/${b.model}.glb`), ...LISANDRA_FORMS.map((f) => f.asset), ...FIELD_CREATURES.map((c) => 'assets/monsters/new_creatures/' + c.model + '.glb'), ...TOWN_KNIGHTS.map((k) => k.asset)];
    const cast = this.heroCast || [];
    // A model: fetched when a place ahead is free, built when a builder is, and the place given up once it's built, so no
    // more than a few files are held at once. Asked for in the order they're wanted below; make(glb) is what's kept.
    // (A failure is the caller's to hear, where it awaits the model.)
    // (A file wanted by two models, the dead's small bodies and their own: fetched and read once, and kept till the second has it.)
    const twice = new Map(), wanted = new Map();
    for (const path of models) wanted.set(path, (wanted.get(path) || 0) + 1);
    const read = (path) => {
      if (wanted.get(path) < 2) return getFile(base + path).then(parseGLB);
      const glb = twice.get(path) || twice.set(path, getFile(base + path).then(parseGLB)).get(path);
      wanted.set(path, wanted.get(path) - 1);
      if (wanted.get(path) < 1) twice.delete(path);
      return glb;
    };
    const model = (path, make) => {
      steps.add();
      const made = ahead(async () => {
        const glb = await read(path);
        tick();
        return building(() => make(glb));
      });
      made.catch(() => {});
      return made;
    };

    const [manifest, village, tripoRoster, tripoPalettes] = await Promise.all([
      getFile(`${base}assets/game/tex/manifest.json`, 'json'), getFile(`${base}assets/game/village.json`, 'json'),
      getFile(base + TRIPO_BASE + 'roster.json', 'json'), getFile(base + TRIPO_BASE + 'palettes.json', 'json'),
    ]);
    this.village = village;
    const layerNames = manifest.layers.map((l) => l.name);
    const tw = Math.round(manifest.size[0] * tier.texScale), th = Math.round(manifest.size[1] * tier.texScale);
    const dw = Math.round(manifest.detail[0] * tier.texScale), dh = Math.round(manifest.detail[1] * tier.texScale);
    const gs = Math.round(1024 * tier.texScale), gd = Math.round(512 * tier.texScale);

    // ---- the land, in the pool's threads ----
    // Terrain and the ground maps, cut into bands of a few rows: a thread is never long on one, so the pictures it's also
    // asked to decode aren't kept waiting (src/main.js Pool).
    const BAND = 16;
    const land = (type, args) => { steps.add(); return pool.run(type, args).then((r) => { tick(); return r; }); };
    const groundJobs = [], farJobs = [];
    const groundColliders = village.colliders.concat(village.footprints || [], [CHURCH_FOOTPRINT, CHURCH_WING]);
    // Finer patches of the land where the coarse grid won't do: the hill and its roads, and round the church, with a hole left under
    // the wing over its stair (src/core/church.js).
    const cell = tier.lean ? 4 : 2;
    const patches = [{ x0: -614, x1: -90, z0: -44, z1: 344, cell }, { ...CHURCH_PATCH, cell, hole: LAND_HOLE }];
    this.terrainArgs = { opening: this.openingEnabled, n: tier.terrainN, extent: 2400, patches };
    this.landAt = [0, 0]; this.landBusy = false;
    const terrainJob = land('terrain', this.terrainArgs), forestJob = land('forest', { opening: this.openingEnabled, reach: FOREST_REACH });
    for (let r = 0; r < GROUND_SIZE; r += BAND) groundJobs.push(land('ground', { opening: this.openingEnabled, size: GROUND_SIZE, half: GROUND_HALF, colliders: groundColliders, rowStart: r, rowEnd: Math.min(GROUND_SIZE, r + BAND) }));
    for (let r = 0; r < this.farSize; r += BAND) farJobs.push(land('farground', { opening: this.openingEnabled, size: this.farSize, half: FAR_HALF, rowStart: r, rowEnd: Math.min(this.farSize, r + BAND) }));
    const landJobs = timed('the land worked out', Promise.all([terrainJob, forestJob, Promise.all(farJobs), Promise.all(groundJobs)]));
    landJobs.catch(() => {});

    // ---- the pictures ----
    steps.add(manifest.layers.length * 2 + manifest.ground.length * 2);
    const shrink = tier.texScale !== 1;
    const decode = (name, width, height) => {
      const url = `${base}assets/game/tex/${name}.webp`;
      return watched(url, pool.run('decode', { url, ...(shrink ? { width, height } : {}) })).then((b) => { tick(); return b; });
    };
    const worldPictures = timed('the world\'s pictures', Promise.all([
      loadTextureArray(device, this.mip, layerNames, (n) => decode(`${n}_c`, tw, th), 'rgba8unorm-srgb', pictures),
      loadTextureArray(device, this.mip, layerNames, (n) => decode(`${n}_d`, dw, dh), 'rgba8unorm', pictures),
      loadTextureArray(device, this.mip, manifest.ground, (n) => decode(`${n}_c`, gs, gs), 'rgba8unorm-srgb', pictures),
      loadTextureArray(device, this.mip, manifest.ground, (n) => decode(`${n}_d`, gd, gd), 'rgba8unorm', pictures),
    ]));
    worldPictures.catch(() => {});
    const interior = timed('the interiors', loadInterior(this, base, pool, tier, pictures, steps));
    interior.catch(() => {});

    // ---- the models, in the order they're wanted ----
    const villageGlb = model(models[0], (glb) => glb);
    const character = (i) => model(models[i], (glb) => this.buildCharacter(glb));
    const crabs = (i, count, scale, prepare, extra) => model(models[i], (glb) => this.buildCrabs(glb, count, scale, prepare, extra));
    const first = [character(1), character(2), crabs(8, 3, CRAB_SCALE), crabs(10, 1, GRAVEHART_SCALE), crabs(11, 1, HYDRA_SCALE)];
    const undead = BODIES.map((b, i) => crabs(15 + i, b.count, b.scale, addStumps));
    const creatures = FIELD_CREATURES.map((c, i) => crabs(15 + BODIES.length + LISANDRA_FORMS.length + i, 1, c.scale));
    const townKnights = TOWN_KNIGHTS.map((k, i) => character(15 + BODIES.length + LISANDRA_FORMS.length + FIELD_CREATURES.length + i));
    const heroes = cast.map((p) => model(`assets/game/heroes/${p.body}.glb`, (glb) => this.buildCharacter(glb)));
    const forms = LISANDRA_FORMS.map(({ skirtCenter }, i) => model(models[15 + BODIES.length + i], async (glb) => {
      const [form] = await this.buildCrabs(glb, 1, LISANDRA_SCALE, (prim, glb, scale) => {
        // A form with no skirt (Pretty in her leathers) has no _SKIRT mask: nothing of her sways as a dress.
        const mask = glb.json.meshes[0].primitives[0].attributes._SKIRT;
        if (mask === undefined) return prim;
        const skirt = accessor(glb, mask);
        const skirtDirection = new Uint16Array(skirt.length);
        for (let v = 0; v < skirt.length; v++) {
          const angle = Math.atan2(prim.pos[v * 3] / scale - skirtCenter[0], prim.pos[v * 3 + 2] / scale - skirtCenter[1]);
          skirtDirection[v] = Math.round((angle / (2 * Math.PI) + 0.5) * 65535);
        }
        return { ...prim, flex: Float32Array.from(skirt, (weight) => -weight), skirtDirection };
      }, SKIRT_PALETTE_JOINTS);
      return { form, jaw: glb.json.scenes[0].extras?.jaw };
    }));
    // (Your own body, and its colour picture as it came, for the gear painted onto it: src/gfx/bodyskin.js.)
    const self = model('assets/game/player/wizard.glb', async (glb) => {
      const [body] = await this.buildCrabs(glb, 1, 1);
      const mat = glb.json.materials[glb.json.meshes[0].primitives[0].material];
      return { body, colour: imageBytes(glb, glb.json.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source) };
    });
    const viewModel = (i) => model(models[i], (glb) => this.buildViewModel(glb));
    const vms = [viewModel(9), viewModel(3), viewModel(14)], spellVMs = [viewModel(12), viewModel(13)];
    const knightProps = [4, 5, 6, 7].map((i) => model(models[i], (glb) => this.buildProp(glb)));
    // Each hero's three: main hand, off hand, the board on the back (assets/game/heroes/kit, tools/heroes/kit.py). One model per
    // item, shared.
    const kitModels = new Map();
    const kitOf = (k) => [k.main, k.off || (k.style === 'daggers' || k.style === 'boomerang' ? k.main : null), k.back];   // (Two daggers or two boomerangs: the same item in both hands.)
    for (const p of cast) for (const id of kitOf(p.kit || {})) if (id && !kitModels.has(id)) kitModels.set(id, model(`assets/game/heroes/kit/${id}.glb`, (glb) => this.buildProp(glb)));
    // The opening's cave and her book (src/gfx/opening.js): their pictures now, the stage itself once the arms are built.
    // (It waits its turn as a model does: its book's three pictures are as big as any.)
    const openingStage = this.openingEnabled ? ahead(() => building(() => loadOpeningStage(this, base))) : null;
    openingStage?.catch(() => {});
    steps.add(3);   // (the three that tick on their own below: the village built, the last of the scene, the opening)

    // ---- putting it together ----
    [this.colorArr, this.detailArr, this.groundColor, this.groundDetail] = await worldPictures;
    const [terrain, forest, farRows, rows] = await landJobs;
    this.farMap = device.createTexture({ size: [this.farSize, this.farSize], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.farTint = device.createTexture({ size: [this.farSize, this.farSize], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.farKind = device.createTexture({ size: [this.farSize, this.farSize], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    // The roads close round you, finely (src/gfx/rocks.js followRoads): where it lies (x, z), one over its size, and whether it's laid.
    this.nearRoad = device.createTexture({ size: [512, 512], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.nearRoadU = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(this.nearRoadU, 0, new Float32Array([0, 0, 0, 0]));
    for (const row of farRows) {
      const rowsN = row.data.length / 4 / this.farSize;
      device.queue.writeTexture({ texture: this.farMap, origin: [0, row.rowStart] }, row.data, { bytesPerRow: this.farSize * 4 }, [this.farSize, rowsN]);
      device.queue.writeTexture({ texture: this.farTint, origin: [0, row.rowStart] }, row.tint, { bytesPerRow: this.farSize * 4 }, [this.farSize, rowsN]);
      device.queue.writeTexture({ texture: this.farKind, origin: [0, row.rowStart] }, row.kind, { bytesPerRow: this.farSize * 4 }, [this.farSize, rowsN]);
    }
    this.groundMap = device.createTexture({ size: [GROUND_SIZE, GROUND_SIZE], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.heightTex = device.createTexture({ size: [GROUND_SIZE, GROUND_SIZE], format: 'r32float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    for (const row of rows) {
      const h = row.data.length / 4 / GROUND_SIZE;
      device.queue.writeTexture({ texture: this.groundMap, origin: [0, row.rowStart] }, row.data, { bytesPerRow: GROUND_SIZE * 4 }, [GROUND_SIZE, h]);
      device.queue.writeTexture({ texture: this.heightTex, origin: [0, row.rowStart] }, row.heights, { bytesPerRow: GROUND_SIZE * 4 }, [GROUND_SIZE, h]);
    }
    this.terrainVB = makeBuffer(device, terrain.verts, GPUBufferUsage.VERTEX);
    this.terrainIB = makeBuffer(device, terrain.idx, GPUBufferUsage.INDEX);
    this.terrainCount = terrain.idx.length;
    this.buildLandBindings();

    this.buildStatics(await villageGlb, layerNames, manifest.layers, village.trees);
    this.pines = new Pines(this, forest.trees, layerNames);
    this.farSpan = 2 * FAR_HALF;
    this.rocks = new Rocks(this);
    this.slimeBodies = new SlimeBodies(this);
    tick();
    lap('the village built');
    this.interior = await interior;
    this.chars = [await first[0], await first[1], ...(await first[2]), ...(await first[3]), ...(await first[4])];
    // The undead, in the order the sim adds them: a body per place in BODIES.count, sharing that model's mesh and paint.
    for (const bodies of undead) for (const b of await bodies) { b.flesh = 1; this.chars.push(b); }
    for (const creature of creatures) {
      const [body] = await creature;
      body.flesh = 1;
      this.chars.push(body);
    }
    // The knights in the other suits, in the sim's order. Plate like the first two; Tessariel's polished.
    for (let i = 0; i < TOWN_KNIGHTS.length; i++) {
      const knight = await townKnights[i];
      knight.armored = true; knight.steel = TOWN_KNIGHTS[i].kind === 1;
      this.chars.push(knight);
    }
    this.chars[0].armored = this.chars[1].armored = true; this.chars[1].steel = true;
    this.firstTown = this.chars.length - TOWN_KNIGHTS.length;
    // The Tripo monsters' slots, in the sim's order: after the town knights. Built when the sim stands a monster in one.
    this.tripo = new TripoSlots(this, base, withVariants(tripoRoster), tripoPalettes, this.chars.length, TRIPO_SLOTS);
    // The other Tessariels this session (src/core/heroes.js makeCast, chosen in src/main.js), in the sim's order: after the
    // knights, before Lisandra.
    this.firstHero = this.chars.length;
    for (let i = 0; i < heroes.length; i++) {
      const hero = await heroes[i];
      hero.armored = true; hero.hero = true;
      // (Their paint read as theirs, not as a knight's blackened steel: -2 for the classes in plate, -3 in armour that isn't
      // all steel, -1 for the rest. It also says what shows in their gaps: mail, or a padded coat. materials.js heroLook.)
      hero.heroLook = ['lancer', 'paladin'].includes(cast[i].cls) ? -2 : ['dragoon', 'boomerang'].includes(cast[i].cls) ? -3 : -1;
      this.chars.push(hero);
    }
    for (const made of forms) {
      const { form, jaw } = await made;
      form.flesh = 1;
      // Her gown moves with her body alone (the skinning shader's ripple is off for her), and she is drawn with the
      // model-true shading (ARMOR_TRUE): see docs/RENDERING.md.
      form.stillSkirt = true;
      form.trueLook = true;
      // The witch's jaw (tools/lisandra/jaw_rig.py): where the line between her lips is, in bind space, for the dark
      // that opens there as she speaks (materials.js MOUTH_WGSL).
      const s = LISANDRA_SCALE;
      if (jaw?.lip) {
        const l = jaw.lip;
        form.jaw = { y0: l.y0 * s, k: l.k / s, mid: l.mid * s, half: l.half * s, front: (l.z - 0.02) * s, rise: l.rise * s, gap: jaw.open * l.perRad * s };
      }
      this.chars.push(form);
    }
    this.firstForm = this.chars.length - LISANDRA_FORMS.length;
    // Your own body, for the third-person view (src/sim/playerbody.js, tools/player/build.mjs): the slot after hers, drawn
    // only while that view is on. What it holds are the items' own models, laid where the sim says its hands are (selfItems).
    {
      const { body, colour } = await self;
      body.flesh = 1; body.trueLook = true; body.self = true;
      this.selfSlot = this.chars.length;
      this.chars.push(body);
      this.selfItems = [0, 1, 2].map(() => ({ mat: new Float32Array(16), sword: null, slot: -1, model: null }));
      // The gear you wear, painted onto it (src/gfx/bodyskin.js): main.js says what's worn.
      this.bodySkin = new BodySkin(this, base, body, colour);
    }
    // The arms by how many hands they have on the sword. Which is on screen comes with each snapshot, along with its pose.
    this.vms = { 1: await vms[0], 2: await vms[1], 3: await vms[2] };
    this.vm = this.vms[1];
    this.spellVMs = { 1: await spellVMs[0], 2: await spellVMs[1] };
    this.things = (village.things || []).concat(this.interior.data.things || []);
    // One prop instance per sword and shield in a knight's hands: the black knight's crimson and V, the silver's gilded
    // and T, then each town knight's own pair, sharing those four models. propBase: a knight's first instance.
    this.props = [];
    for (const prop of knightProps) this.props.push(await prop);
    this.chars[0].propBase = 0; this.chars[1].propBase = 2;
    const firstTown = this.firstTown;
    TOWN_KNIGHTS.forEach((k, i) => {
      this.chars[firstTown + i].propBase = this.props.length;
      this.props.push({ ...this.props[k.sword === 'crimson' ? 0 : 2] }, { ...this.props[k.shield === 'v' ? 1 : 3] });
    });
    // The heroes' own: owner, drawn only while its hero is (an empty hand draws nothing).
    for (let i = 0; i < cast.length; i++) {
      const c = this.chars[this.firstHero + i];
      c.propBase = this.props.length; c.propCount = 3;
      for (const id of kitOf(cast[i].kit || {})) this.props.push(id ? { ...(await kitModels.get(id)), owner: this.firstHero + i } : { empty: true });
    }
    this.tripo.reserveProps();
    this.propInstances = device.createBuffer({ size: 64 * this.props.length, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.propData = new Float32Array(16 * this.props.length);
    lap('the models built');
    this.buildEnv();
    this.buildPipelines();
    this.buildParticles();
    this.buildGrass();
    // (And the Hollowfang Warrens' torches, and the fires either side of its portal: src/core/dungeon.js.)
    // (And its braziers, bigger fires that light the floor where the fighting is.)
    const warrens = torches().map(([x, y, z, nx, nz]) => ({ p: [x + nx * 0.25, y + 0.25, z + nz * 0.25], c: [1, 0.56, 0.24], r: 12, i: 3.8, flicker: 0.8 }));
    for (const [x, y, z] of braziers()) warrens.push({ p: [x, y + 1.9, z], c: [1, 0.6, 0.28], r: 15, i: 5.2, flicker: 0.9 });
    // (The portals' swirl, a cold blue that breathes: in front of the Warrens' doorways, and over every seal: portalModel.)
    const portalSpots = buildSites().spots;
    for (const key of PORTAL_SPOTS) {
      const [x, y, z, yaw] = portalSpots[key];
      warrens.push({ p: [x - Math.sin(yaw) * 0.3, y + 2.2, z - Math.cos(yaw) * 0.3], c: [0.4, 0.62, 1], r: 14, i: 4.2, flicker: 0.3 });
    }
    for (const key in portalSpots) {
      if (!key.startsWith('seal_')) continue;
      const [x, y, z] = portalSpots[key];
      warrens.push({ p: [x, y + 2.2, z], c: [0.4, 0.62, 1], r: 13, i: 3.6, flicker: 0.3 });
    }
    // (And the Test Dungeon's panels of light, white, steady and wide: src/core/testhall.js.)
    const hall = hallLights().map(([x, y, z]) => ({ p: [x, y - 0.5, z], c: [1, 0.98, 0.95], r: 15, i: 2.4, flicker: 0 }));
    this.lights = village.lights.concat(this.interior.data.lights, warrens, hall);
    this.homeLights = new HomeLights(device, this.interior, this.interior.data.lights);
    tick();
    if (openingStage) this.openingStage = (await openingStage)();
    this.smokeT = 0;
    this.moteT = 0;
    this.resize();
    tick();
    lap('done');
    if (done !== total) console.warn(`loading bar: ${done} steps ticked of ${total} counted (renderer.js load)`);
  }

  makeNoise() {
    const S = 256;
    const data = new Uint8Array(S * S * 4);
    const rnd = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
    for (let ch = 0; ch < 4; ch++) {
      const r = rnd(ch * 977 + 13);
      const grids = [4, 8, 16, 32, 64].map((g) => { const a = new Float32Array(g * g); for (let i = 0; i < a.length; i++) a[i] = r(); return { g, a }; });
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          let v = 0, amp = 0.5, sum = 0;
          for (const { g, a } of grids) {
            const fx = x / S * g, fy = y / S * g;
            const ix = fx | 0, iy = fy | 0, u = fx - ix, w = fy - iy;
            const su = u * u * (3 - 2 * u), sw = w * w * (3 - 2 * w);
            const at = (i, j) => a[((j + g) % g) * g + ((i + g) % g)];
            v += amp * (at(ix, iy) * (1 - su) * (1 - sw) + at(ix + 1, iy) * su * (1 - sw) + at(ix, iy + 1) * (1 - su) * sw + at(ix + 1, iy + 1) * su * sw);
            sum += amp; amp *= 0.5;
          }
          data[(y * S + x) * 4 + ch] = Math.max(0, Math.min(255, ((v / sum - 0.5) * 1.9 + 0.5) * 255));
        }
      }
    }
    const tex = this.device.createTexture({ size: [S, S], format: 'rgba8unorm', mipLevelCount: mipCountFor(S, S), usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    this.device.queue.writeTexture({ texture: tex }, data, { bytesPerRow: S * 4 }, [S, S]);
    const enc = this.device.createCommandEncoder();
    this.mip.generate(tex, 'rgba8unorm', 1, mipCountFor(S, S), enc);
    this.device.queue.submit([enc.finish()]);
    return tex;
  }

  buildSamplers() {
    const { device } = this;
    this.repeatSmp = device.createSampler({ addressModeU: 'repeat', addressModeV: 'repeat', minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: this.tier.aniso });
    this.clampSmp = device.createSampler({ minFilter: 'linear', magFilter: 'linear', mipmapFilter: 'linear' });
    this.shadowSmp = device.createSampler({ compare: 'less', minFilter: 'linear', magFilter: 'linear' });
    this.frameUBO = device.createBuffer({ size: FRAME_FLOATS * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  }

  buildBaseLayouts() {
    const { device } = this;
    const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    this.bgl0 = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
      { binding: 1, visibility: VF, sampler: { type: 'filtering' } },
      { binding: 2, visibility: VF, sampler: { type: 'filtering' } },
      { binding: 3, visibility: VF, sampler: { type: 'comparison' } },
      { binding: 4, visibility: VF, texture: { sampleType: 'depth', viewDimension: '2d-array' } },
      { binding: 5, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 6, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 7, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 8, visibility: VF, texture: { sampleType: 'float' } },
    ] });
    this.bglArr2 = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 1, visibility: VF, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 2, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 3, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 4, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 5, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 6, visibility: VF, buffer: { type: 'uniform' } },
    ] });
    this.bglStatic = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 1, visibility: VF, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 2, visibility: VF, buffer: { type: 'uniform' } },
    ] });
    this.bglArmor = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
      { binding: 1, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 2, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 3, visibility: VF, texture: { sampleType: 'float' } },
    ] });
    this.bglProp = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: VF, texture: { sampleType: 'float' } },
      { binding: 1, visibility: VF, buffer: { type: 'uniform' } },
    ] });
    this.bglSkin = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ] });
    this.skinModule = device.createShaderModule({ code: SKIN });
    this.skinPipeline = device.createComputePipeline({ layout: device.createPipelineLayout({ bindGroupLayouts: [this.bglSkin] }), compute: { module: this.skinModule, entryPoint: 'main' } });
  }

  // Land textures, whose bind group is shared by terrain and grass. (Made once the land's pictures and maps are in: the layouts
  // above are wanted before then, by the models built while those come down.)
  buildLandBindings() {
    const { device } = this;
    this.terrainBG = device.createBindGroup({ layout: this.bglArr2, entries: [
      { binding: 0, resource: this.groundColor.createView({ dimension: '2d-array' }) },
      { binding: 1, resource: this.groundDetail.createView({ dimension: '2d-array' }) },
      { binding: 2, resource: this.farMap.createView() },
      { binding: 3, resource: this.farTint.createView() },
      { binding: 4, resource: this.farKind.createView() },
      { binding: 5, resource: this.nearRoad.createView() },
      { binding: 6, resource: { buffer: this.nearRoadU } },
    ] });
  }

  // Out in the countries the land's grid and the pines are laid again round you, a few hundred metres at a time, in the pool's
  // threads; the old ones are drawn till the new are ready. Near the town both stay as they were laid at the start.
  followLand(cam) {
    const pool = this.landPool || this.pool;
    if (this.landBusy || !pool) return;
    const near = Math.abs(cam.x) < 700 && Math.abs(cam.z) < 700;
    const cx = near ? 0 : Math.round(cam.x / 128) * 128, cz = near ? 0 : Math.round(cam.z / 128) * 128;
    if (cx === this.landAt[0] && cz === this.landAt[1]) return;
    if (!near && Math.hypot(cam.x - this.landAt[0], cam.z - this.landAt[1]) < FOLLOW_AT) return;
    this.landBusy = true;
    Promise.all([pool.run('terrain', { ...this.terrainArgs, cx, cz }), pool.run('forest', { opening: this.openingEnabled, reach: FOREST_REACH, cx, cz })]).then(([terrain, forest]) => {
      const old = [this.terrainVB, this.terrainIB];
      this.terrainVB = makeBuffer(this.device, terrain.verts, GPUBufferUsage.VERTEX);
      this.terrainIB = makeBuffer(this.device, terrain.idx, GPUBufferUsage.INDEX);
      this.terrainCount = terrain.idx.length;
      this.pines.setTrees(forest.trees);
      this.shadowEpoch = (this.shadowEpoch || 0) + 1;
      this.landAt = [cx, cz];
      // (Gone once this frame's work that drew them is done: nothing new is recorded with them.)
      setTimeout(() => { for (const b of old) b.destroy(); }, 500);
    }).catch((e) => console.warn('followLand', e)).finally(() => { this.landBusy = false; });
  }

  buildStatics(glb, layerNames, layers, oaks) {
    const { device } = this;
    // Merge every primitive into one buffer, opaque first so the cutouts are one range at the end.
    const prims = [];
    const nodes = glb.json.nodes.filter((n) => n.mesh !== undefined);
    for (const n of nodes) {
      for (const pr of glb.json.meshes[n.mesh].primitives) {
        const name = glb.json.materials[pr.material].name;
        let layer = layerNames.indexOf(name);
        if (layer < 0) layer = FLAT[name] ?? 100;
        const cutout = layer < 100 && layers[layer].cutout;
        prims.push({ layer, cutout, pos: accessor(glb, pr.attributes.POSITION), nrm: accessor(glb, pr.attributes.NORMAL), uv: accessor(glb, pr.attributes.TEXCOORD_0), idx: accessor(glb, pr.indices) });
      }
    }
    // And everything out in the countries.
    for (const [name, part] of buildSites().parts) {
      const m = /^(dark|pale|frost):(.*)$/.exec(name), base = m ? m[2] : name;
      let layer = layerNames.indexOf(base);
      if (layer < 0) layer = FLAT[base] ?? 100;
      const cutout = layer < 100 && layers[layer].cutout;
      prims.push({ layer: layer + (m ? TINTS[m[1]] * 1000 : 0), cutout, pos: part.pos, nrm: part.nrm, uv: part.uv, idx: part.idx });
    }
    prims.sort((a, b) => a.cutout - b.cutout);
    let nv = 0, ni = 0;
    for (const p of prims) { nv += p.pos.length / 3; ni += p.idx.length; }
    // Each oak its own bark and leaves, going by the tree a vertex stands under. (Anything else in bark nearby may take it too; it's only bark.)
    const oakSets = ['bark', 'leaves'].map((n) => [n, `${n}_2`, `${n}_3`, `${n}_4`].map((x) => layerNames.indexOf(x)));
    const oakLayer = (layer, x, z) => {
      const set = oakSets.find((s) => s[0] === layer);
      if (!set) return layer;
      for (let t = 0; t < oaks.length; t++) {
        if (Math.hypot(x - oaks[t].p[0], z - oaks[t].p[1]) < oaks[t].s * 1.5) return set[t % set.length];
      }
      return layer;
    };
    const verts = new ArrayBuffer(nv * 36);
    const f = new Float32Array(verts), u = new Uint32Array(verts);
    const indices = new Uint32Array(ni);
    let vo = 0, io = 0, cutStart = -1;
    for (const p of prims) {
      if (p.cutout && cutStart < 0) cutStart = io;
      const base = vo;
      const n = p.pos.length / 3;
      for (let i = 0; i < n; i++) {
        const o = vo * 9;
        f[o] = p.pos[i * 3]; f[o + 1] = p.pos[i * 3 + 1]; f[o + 2] = p.pos[i * 3 + 2];
        f[o + 3] = p.nrm[i * 3]; f[o + 4] = p.nrm[i * 3 + 1]; f[o + 5] = p.nrm[i * 3 + 2];
        f[o + 6] = p.uv[i * 2]; f[o + 7] = p.uv[i * 2 + 1];
        u[o + 8] = oakLayer(p.layer, p.pos[i * 3], p.pos[i * 3 + 2]);
        vo++;
      }
      for (let i = 0; i < p.idx.length; i++) indices[io++] = p.idx[i] + base;
    }
    this.staticVB = makeBuffer(device, new Float32Array(verts), GPUBufferUsage.VERTEX);
    this.staticIB = makeBuffer(device, indices, GPUBufferUsage.INDEX);
    this.staticOpaque = cutStart < 0 ? ni : cutStart;
    this.staticTotal = ni;
    this.shadowEpoch = (this.shadowEpoch || 0) + 1;
    // Per-layer parameters: cutout, parallax depth in uv, has windows, foliage.
    const params = new Float32Array(64 * 4);
    const pomDepth = this.tier.pom > 0 ? 1 : 0;
    layers.forEach((l, i) => {
      params[i * 4] = l.cutout ? 1 : 0;
      params[i * 4 + 1] = pomDepth * ({ wall: 0.011, roof: 0.022, stone: 0.02, door: 0.012 }[l.kind] || 0);
      params[i * 4 + 2] = l.kind === 'wall' ? 1 : 0;
      params[i * 4 + 3] = /^(leaves|pine|pine_far)(_\d)?$/.test(l.name) ? 1 : 0;
    });
    const layerUBO = makeBuffer(device, params, GPUBufferUsage.UNIFORM);
    this.staticBG = device.createBindGroup({ layout: this.bglStatic, entries: [
      { binding: 0, resource: this.colorArr.createView({ dimension: '2d-array' }) },
      { binding: 1, resource: this.detailArr.createView({ dimension: '2d-array' }) },
      { binding: 2, resource: { buffer: layerUBO } },
    ] });
    this.stats.staticTris = ni / 3;
  }

  async imageTexture(glb, imageIndex, format, scale = 1) {
    return this.bitmapTexture(imageBytes(glb, imageIndex), format, scale);
  }

  async bitmapTexture(blob, format, scale) {
    const bmp = await decodeScaledBitmap(blob, scale);
    const mips = mipCountFor(bmp.width, bmp.height);
    const tex = this.device.createTexture({ size: [bmp.width, bmp.height], format, mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    try {
      this.device.queue.copyExternalImageToTexture({ source: bmp }, { texture: tex, premultipliedAlpha: false }, [bmp.width, bmp.height]);
    } finally { bmp.close(); }
    const enc = this.device.createCommandEncoder();
    this.mip.generate(tex, format, 1, mips, enc);
    this.device.queue.submit([enc.finish()]);
    await this.device.queue.onSubmittedWorkDone();
    return tex;
  }

  // Compute-skinned mesh streams shared by the knights and the arms.
  makeSkinned(prims, jointCount) {
    const { device } = this;
    let nv = 0, ni = 0;
    for (const p of prims) { nv += p.pos.length / 3; ni += p.idx.length; }
    const src = new ArrayBuffer(nv * 48);
    const f = new Float32Array(src), u = new Uint32Array(src);
    const side = new ArrayBuffer(nv * 36);
    const sf = new Float32Array(side), su = new Uint32Array(side);
    const indices = new Uint32Array(ni);
    const ranges = [];
    let vo = 0, io = 0, bindR = 0;
    for (const p of prims) {
      const base = vo;
      ranges.push({ first: io, count: p.idx.length });
      const n = p.pos.length / 3;
      for (let i = 0; i < n; i++) {
        const o = vo * 12, s = vo * 9;
        f[o] = p.pos[i * 3]; f[o + 1] = p.pos[i * 3 + 1]; f[o + 2] = p.pos[i * 3 + 2]; f[o + 3] = p.flex ? p.flex[i] : 0;
        f[o + 4] = p.nrm[i * 3]; f[o + 5] = p.nrm[i * 3 + 1]; f[o + 6] = p.nrm[i * 3 + 2];
        u[o + 7] = p.skirtDirection?.[i] ?? p.skinTag?.[i] ?? p.piece?.[i] ?? 0;
        let j0 = p.fixedJoint ?? 0, j1 = 0, j2 = 0, j3 = 0, w0 = 255, w1 = 0, w2 = 0, w3 = 0;
        if (p.joints) {
          j0 = p.joints[i * 4]; j1 = p.joints[i * 4 + 1]; j2 = p.joints[i * 4 + 2]; j3 = p.joints[i * 4 + 3];
          const W = p.weights, a = W[i * 4], b = W[i * 4 + 1], c = W[i * 4 + 2], d = W[i * 4 + 3];
          const k = 255 / ((a + b + c + d) || 1);
          w0 = Math.round(a * k); w1 = Math.round(b * k); w2 = Math.round(c * k); w3 = 255 - w0 - w1 - w2;
          if (w3 < 0) { w0 += w3; w3 = 0; }
        }
        u[o + 8] = j0 | (j1 << 8) | (j2 << 16) | (j3 << 24);
        u[o + 9] = w0 | (w1 << 8) | (w2 << 16) | (w3 << 24);
        f[o + 10] = p.uv[i * 2]; f[o + 11] = p.uv[i * 2 + 1];
        const sp = p.sidePos || p.pos;
        sf[s] = sp[i * 3]; sf[s + 1] = sp[i * 3 + 1]; sf[s + 2] = sp[i * 3 + 2];
        su[s + 3] = p.piece ? p.piece[i] : 0;
        sf[s + 4] = p.uv[i * 2]; sf[s + 5] = p.uv[i * 2 + 1];
        sf[s + 6] = p.nrm[i * 3]; sf[s + 7] = p.nrm[i * 3 + 1]; sf[s + 8] = p.nrm[i * 3 + 2];
        // (How far the bind pose reaches from the body's origin, for the shadow cascades' culling: shadowcull.js.)
        bindR = Math.max(bindR, Math.hypot(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]));
        vo++;
      }
      for (let i = 0; i < p.idx.length; i++) indices[io++] = p.idx[i] + base;
    }
    const srcBuf = makeBuffer(device, new Float32Array(src), GPUBufferUsage.STORAGE);
    const sideVB = makeBuffer(device, new Float32Array(side), GPUBufferUsage.VERTEX);
    const IB = makeBuffer(device, indices, GPUBufferUsage.INDEX);
    const outBuf = device.createBuffer({ size: nv * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
    const palette = device.createBuffer({ size: jointCount * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const params = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bg = device.createBindGroup({ layout: this.bglSkin, entries: [
      { binding: 0, resource: { buffer: params } }, { binding: 1, resource: { buffer: palette } },
      { binding: 2, resource: { buffer: srcBuf } }, { binding: 3, resource: { buffer: outBuf } },
    ] });
    return { count: nv, indices: ni, ranges, sideVB, IB, srcBuf, outBuf, palette, params, bg, jointCount, bindR };
  }

  // A coarser index list over the same skinned vertices. On a phone, of the cell given: for every shadow, and for bodies
  // past 16 m. On a PC, of LOD_CELL: for bodies so far off that a cell is under a pixel (bodyDetail), and for the far
  // shadow cascade, whose texels are wider than its cells.
  addLod(sk, prim, cell) {
    const idx = clusterIndices(prim, this.tier.lean ? cell : LOD_CELL);
    // (A mesh too small or too plain to gain by it keeps its own.)
    if (!this.tier.lean && (!idx.length || idx.length >= sk.indices)) { sk.lodIB = sk.IB; sk.lodCount = sk.indices; return; }
    sk.lodIB = makeBuffer(this.device, idx, GPUBufferUsage.INDEX);
    sk.lodCount = idx.length;
  }

  // Which mesh a body d metres off is drawn with on a PC: 0 the whole one, 1 the coarse (addLod). was: what it had last
  // frame, so one standing right at the line doesn't flicker between the two.
  bodyDetail(d, was) {
    if (this.tier.lean || this.fullDetail) return 0;
    return d > this.lodAt * (was ? 0.94 : 1.06) ? 1 : 0;
  }

  // Every how many frames a body d metres off is skinned again: its skinned mesh is kept from frame to frame, in the world's
  // own space, so between times it holds the pose it had. Far enough off, 65 and then 33 poses a second can't be told from
  // the screen's own rate, and they're most of a crowd's skinning.
  skinEvery(d) {
    return this.fullDetail ? 1 : d > SKIN_FAR ? this.skinSteps[1] : d > SKIN_MID ? this.skinSteps[0] : 1;
  }

  // Another body on the same mesh: its own pose buffers, sharing the geometry.
  cloneSkinned(base) {
    const { device } = this;
    const outBuf = device.createBuffer({ size: base.count * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
    const palette = device.createBuffer({ size: base.jointCount * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const params = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bg = device.createBindGroup({ layout: this.bglSkin, entries: [
      { binding: 0, resource: { buffer: params } }, { binding: 1, resource: { buffer: palette } },
      { binding: 2, resource: { buffer: base.srcBuf } }, { binding: 3, resource: { buffer: outBuf } },
    ] });
    return { ...base, outBuf, palette, params, bg };
  }

  async buildCrabs(glb, count, scale, prepare, paletteExtra = 0) {
    const pr = glb.json.meshes[0].primitives[0];
    const a = pr.attributes;
    const pos = accessor(glb, a.POSITION).slice();
    for (let i = 0; i < pos.length; i++) pos[i] *= scale;
    let prim = { pos, nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices), joints: accessor(glb, a.JOINTS_0), weights: accessor(glb, a.WEIGHTS_0) };
    if (prepare) prim = prepare(prim, glb, scale);
    const base = this.makeSkinned([prim], glb.json.skins[0].joints.length + paletteExtra);
    this.addLod(base, prim, 0.14);
    const mat = glb.json.materials[pr.material];
    const srcOf = (t) => glb.json.textures[t.index].source;
    const texScale = this.tier.texScale;
    const [alb, nrm, mr] = await Promise.all([
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb', texScale),
      this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', texScale),
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', texScale),
    ]);
    const out = [];
    for (let i = 0; i < count; i++) {
      const sk = i === 0 ? base : this.cloneSkinned(base);
      const ubo = this.device.createBuffer({ size: CHAR_UBO, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const bg = this.device.createBindGroup({ layout: this.bglArmor, entries: [
        { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
      ] });
      out.push({ ...sk, ubo, matBG: bg, gashData: new Float32Array(CHAR_UBO / 4), maps: [alb, nrm, mr] });
    }
    return out;
  }

  async buildCharacter(glb) {
    const pr = glb.json.meshes[0].primitives[0];
    const a = pr.attributes;
    const prim = {
      pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices),
      joints: accessor(glb, a.JOINTS_0), weights: accessor(glb, a.WEIGHTS_0), flex: accessor(glb, a._FLEX), piece: accessor(glb, a._PIECE),
    };
    const jc = glb.json.skins[0].joints.length;
    const sk = this.makeSkinned([prim], jc);
    this.addLod(sk, prim, 0.055);
    const scale = this.tier.texScale;
    const [alb, nrm, mr] = await Promise.all([
      this.imageTexture(glb, 0, 'rgba8unorm-srgb', scale), this.imageTexture(glb, 1, 'rgba8unorm', scale), this.imageTexture(glb, 2, 'rgba8unorm', scale),
    ]);
    const ubo = this.device.createBuffer({ size: CHAR_UBO, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bg = this.device.createBindGroup({ layout: this.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
    ] });
    return { ...sk, ubo, matBG: bg, gashData: new Float32Array(CHAR_UBO / 4) };
  }

  async buildViewModel(glb) {
    const { device } = this;
    const skin = glb.json.skins[0];
    const weaponJoint = skin.joints.findIndex((j) => glb.json.nodes[j].name === 'weapon');
    const weaponBind = mat4Invert(new Float32Array(16), accessor(glb, skin.inverseBindMatrices).subarray(weaponJoint * 16, weaponJoint * 16 + 16));
    const prims = [];
    const texOf = [];
    for (const node of glb.json.nodes) {
      // (The one-handed rig's own sword and shield were for working out its swings. The swords come from the pack now.)
      if (node.mesh === undefined || node.name === 'arming_sword' || node.name === 'ironbound') continue;
      const pr = glb.json.meshes[node.mesh].primitives[0];
      const a = pr.attributes;
      const p = { pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices) };
      if (a.JOINTS_0 !== undefined && node.skin !== undefined) { p.joints = accessor(glb, a.JOINTS_0); p.weights = accessor(glb, a.WEIGHTS_0); } else this.onWeaponJoint(p, weaponJoint, weaponBind);
      prims.push(p);
      texOf.push({ mat: glb.json.materials[pr.material], name: node.name });
    }
    const sk = this.makeSkinned(prims, skin.joints.length);
    const flatNormal = this.flatNormal || (this.flatNormal = this.pixel('rgba8unorm', [128, 128, 255, 255]));
    // (A part with no metal/rough map: matte and not metal, not half-metal chrome.)
    const flatMR = this.pixel('rgba8unorm', [255, 217, 0, 255]);
    const parts = [];
    for (let i = 0; i < prims.length; i++) {
      const { mat, name } = texOf[i];
      const srcOf = (t) => glb.json.textures[t.index].source;
      const texScale = this.tier.texScale;
      const alb = await this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb', texScale);
      const nrm = mat.normalTexture ? await this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', texScale) : flatNormal;
      const mr = mat.pbrMetallicRoughness.metallicRoughnessTexture ? await this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', texScale) : flatMR;
      const ubo = device.createBuffer({ size: 64 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const bg = device.createBindGroup({ layout: this.bglArmor, entries: [
        { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
      ] });
      parts.push({ range: sk.ranges[i], bg, ubo, name, isSword: name === 'greatsword', nrm });
    }
    const shieldJoint = skin.joints.findIndex((j) => glb.json.nodes[j].name === 'shield');
    const shieldBind = shieldJoint < 0 ? null : mat4Invert(new Float32Array(16), accessor(glb, skin.inverseBindMatrices).subarray(shieldJoint * 16, shieldJoint * 16 + 16));
    return { ...sk, parts, weaponJoint, weaponBind, shieldJoint, shieldBind, prims, jointNames: skin.joints.map((j) => glb.json.nodes[j].name) };
  }

  pixel(format, rgba) {
    const tex = this.device.createTexture({ size: [1, 1], format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.device.queue.writeTexture({ texture: tex }, new Uint8Array(rgba), { bytesPerRow: 4 }, [1, 1]);
    return tex;
  }

  // A rigid part modelled in the weapon joint's own frame: carries it to bind space for the skinning palette.
  onWeaponJoint(p, weaponJoint, bind) {
    p.fixedJoint = weaponJoint;
    const pos = new Float32Array(p.pos.length), nrm = new Float32Array(p.nrm.length);
    for (let v = 0; v < p.pos.length; v += 3) {
      const x = p.pos[v], y = p.pos[v + 1], z = p.pos[v + 2];
      pos[v] = bind[0] * x + bind[4] * y + bind[8] * z + bind[12];
      pos[v + 1] = bind[1] * x + bind[5] * y + bind[9] * z + bind[13];
      pos[v + 2] = bind[2] * x + bind[6] * y + bind[10] * z + bind[14];
      const nx = p.nrm[v], ny = p.nrm[v + 1], nz = p.nrm[v + 2];
      nrm[v] = bind[0] * nx + bind[4] * ny + bind[8] * nz;
      nrm[v + 1] = bind[1] * nx + bind[5] * ny + bind[9] * nz;
      nrm[v + 2] = bind[2] * nx + bind[6] * ny + bind[10] * nz;
    }
    p.sidePos = p.pos;
    p.pos = pos; p.nrm = nrm;
  }

  // A sword, by its id: { ready } until its file is in, and then what it takes in the hand and on the ground.
  sword(id) {
    let s = this.swords.get(id);
    if (!s) {
      s = { ready: false };
      this.swords.set(id, s);
      this.buildSword(id, s).catch((e) => console.error(`sword ${id}`, e));
    }
    return s;
  }

  async buildSword(id, s) {
    const { device } = this;
    const w = WEAPONS.find((x) => x && x.id === id);
    const buf = await fetch(`${this.base}assets/game/items/${id}.glb`).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
    const glb = parseGLB(buf);
    const pr = glb.json.meshes[0].primitives[0];
    const a = pr.attributes;
    const mat = glb.json.materials[pr.material];
    const srcOf = (t) => glb.json.textures[t.index].source;
    const scale = this.tier.texScale;
    const [alb, nrm, mr] = await Promise.all([
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb', scale),
      this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', scale),
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', scale),
    ]);
    const prim = { pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices) };
    s.lying = this.lyingModel(prim, alb, nrm, mr, [0, 0, 0, 0]);
    s.tip = prim.pos.reduce((best, v, i) => (i % 3 === 1 ? Math.max(best, v) : best), 0);
    // (A piece of a suit is only ever seen on the ground, or in a slot. So is a skull, for now: the arm in the left hand has its own, fused to it.)
    if (GEAR[id] || ROBES[id] || SKULLS[id]) { s.ready = true; return; }
    // (The gems for the skull: kept to cut up as each skull wants them. See skullGems.)
    if (id === 'skull_gems') { Object.assign(s, { prim, alb, nrm, mr, ready: true }); return; }
    // The arm that holds the skull, one mesh with it, and the others like it are rigid, already in the view's own space (tools/wizard/skull_arm.py), so one joint that never moves.
    if (id === 'skull_arm' || id === 'surf_arm' || id === 'shield_arm') {
      this.onWeaponJoint(prim, 0, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
      s.hand = this.makeSkinned([prim], 1);
      device.queue.writeBuffer(s.hand.palette, 0, new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));
      s.skinned = id === 'skull_arm';
      s.ubo = device.createBuffer({ size: s.skinned ? 144 : 64 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      s.bg = device.createBindGroup({ layout: this.bglArmor, entries: [
        { binding: 0, resource: { buffer: s.ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
      ] });
      s.ready = true;
      return;
    }
    const vm = this.vms[w ? w.hands : 1];
    if (w) {
      // Carry the staff kind alongside its original model coordinates. Other gear stays untagged.
      if (w.hands === 3) {
        // The staff's own glow colour rides each vertex (the head's living light, in materials.js): top bit set, then 8-bit RGB.
        const g = STAFF_GLOW[id] || [255, 56, 6], painted = STAFFS2_IDS.has(id) ? 0x40000000 : 0;
        prim.piece = new Uint32Array(prim.pos.length / 3).fill((0x80000000 | painted | (g[0] << 16) | (g[1] << 8) | g[2]) >>> 0);
        spinStaff(prim, STAFF_SPIN);
        // The first twelve are cut bigger than the painted ones: face-on after the turn they filled the view, so in the hand
        // they're 0.8 of their size about the fist (the owner's call, 2026-11-08). The one on the ground keeps its size.
        if (!painted) {
          for (let v = 0; v < prim.pos.length; v++) prim.pos[v] *= OLD_STAFF_HELD;
          s.tip *= OLD_STAFF_HELD;
        }
        // Its power point's light (src/gfx/stafffx.js): the point turned and sized as the staff was, then the kind and colours.
        const core = STAFF_CORES[id];
        if (core) {
          const k = painted ? 1 : OLD_STAFF_HELD, at = spinPoint(core, STAFF_SPIN), fx = staffEffect(id);
          s.fx = new Float32Array([at[0] * k, at[1] * k, at[2] * k, core[3] * k, fx[1], fx[2], fx[3], fx[0], fx[4], fx[5], fx[6], fx[7]]);
          s.fxAt = [at[0] * k, at[1] * k, at[2] * k];
          s.fxBind = staffBind(vm.weaponBind);
          s.fxAxes = new Float32Array(8);
          s.fxBare = BARE.has(id) ? 1 : 0;
        }
      }
      this.onWeaponJoint(prim, vm.weaponJoint, vm.weaponBind);
      // What hangs off it: one more joint each past the rig's own, swung by Dangles each frame.
      const hang = w.hands === 3 && glb.json.meshes[0].extras?.dangles;
      if (hang?.length && a._DANGLE !== undefined) {
        const D = accessor(glb, a._DANGLE), n = prim.pos.length / 3;
        prim.joints = new Uint8Array(n * 4); prim.weights = new Float32Array(n * 4);
        for (let v = 0; v < n; v++) {
          const k = D[v * 2], wt = D[v * 2 + 1];
          prim.joints[v * 4] = vm.weaponJoint; prim.weights[v * 4] = 1 - (k ? wt : 0);
          if (k) { prim.joints[v * 4 + 1] = vm.jointCount + k - 1; prim.weights[v * 4 + 1] = wt; }
        }
        const parts = hang.map((d) => ({ ...d, pivot: spinPoint(d.pivot, STAFF_SPIN) }));
        s.dangles = new Dangles(parts, vm.weaponBind);
        s.extraJoints = parts.length;
      }
    }
    else {
      // (Not a weapon: a shield, on the arm's shield joint.)
      const c = Math.cos(KITE_TURN), sn = Math.sin(KITE_TURN), ct = Math.cos(KITE_TILT), st = Math.sin(KITE_TILT), pos = new Float32Array(prim.pos), nrm = new Float32Array(prim.nrm);
      const seat = (from, to, v, size, at) => {
        const x = from[v] * c - from[v + 1] * sn, y = from[v] * sn + from[v + 1] * c, z = from[v + 2];
        to[v] = (x * ct + z * st) * size + at[0]; to[v + 1] = y * size + at[1]; to[v + 2] = (-x * st + z * ct) * size + at[2];
      };
      for (let v = 0; v < pos.length; v += 3) { seat(prim.pos, pos, v, KITE_SCALE, KITE_SEAT); seat(prim.nrm, nrm, v, 1, [0, 0, 0]); }
      // The same shield for the raised arm, on one joint of its own.
      s.up = { hand: this.makeSkinned([this.onShieldSocket(prim)], 1) };
      prim.pos = pos; prim.nrm = nrm;
      this.onWeaponJoint(prim, vm.shieldJoint, vm.shieldBind);
    }
    s.hand = this.makeSkinned([prim], vm.jointCount + (s.extraJoints || 0));
    s.ubo = device.createBuffer({ size: s.fx ? STAFF_UBO_SIZE : 64 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    if (s.fx) device.queue.writeBuffer(s.ubo, STAFF_FX_OFFSET, s.fx);
    s.bg = device.createBindGroup({ layout: this.bglArmor, entries: [
      { binding: 0, resource: { buffer: s.ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
    ] });
    if (s.up) { s.up.ubo = s.ubo; s.up.bg = s.bg; s.up.ready = true; }
    s.ready = true;
  }

  // A shield's model, carried to the raised arm's socket and on into the view's space. Fitted by its own size, since they aren't all cut alike.
  onShieldSocket(from) {
    const P = from.pos, N = from.nrm, n = P.length / 3;
    let x0 = Infinity, x1 = -Infinity, top = -Infinity;
    for (let v = 0; v < n; v++) { x0 = Math.min(x0, P[v * 3]); x1 = Math.max(x1, P[v * 3]); top = Math.max(top, P[v * 3 + 1]); }
    const k = SHIELD_WIDTH / (x1 - x0), cx = (x0 + x1) / 2, F = SHIELD_FACE, pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    let near = -Infinity;
    for (let v = 0; v < n; v++) {
      const X = F * (P[v * 3] - cx) * k, Y = (P[v * 3 + 1] - top) * k + SHIELD_TOP, Z = F * P[v * 3 + 2] * k;
      pos[v * 3] = X; pos[v * 3 + 1] = Y; pos[v * 3 + 2] = Z;
      if (Math.abs(X) < 0.22 && Math.abs(Y - SHIELD_ARM_Y) < 0.07) near = Math.max(near, Z);   // what the arm's back comes to first
    }
    const m = SHIELD_SOCKET, seat = SHIELD_PLANE - near;
    for (let v = 0; v < n; v++) {
      const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2] + seat, nx = F * N[v * 3], ny = N[v * 3 + 1], nz = F * N[v * 3 + 2];
      for (let c = 0; c < 3; c++) {
        pos[v * 3 + c] = m[c] * x + m[c + 4] * y + m[c + 8] * z + m[c + 12];
        nrm[v * 3 + c] = m[c] * nx + m[c + 4] * ny + m[c + 8] * nz;
      }
    }
    const p = { pos, nrm, uv: from.uv, idx: from.idx };
    this.onWeaponJoint(p, 0, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return p;
  }

  // Something to lay on the ground: positions in the item's own frame, and its maps. glow is added to whatever light it gets.
  lyingModel(prim, alb, nrm, mr, glow) {
    const { device } = this;
    const n = prim.pos.length / 3;
    const v = new Float32Array(n * 8);
    const P = prim.sidePos || prim.pos;
    for (let i = 0; i < n; i++) {
      v.set(P.subarray(i * 3, i * 3 + 3), i * 8); v.set(prim.nrm.subarray(i * 3, i * 3 + 3), i * 8 + 3); v.set(prim.uv.subarray(i * 2, i * 2 + 2), i * 8 + 6);
    }
    const indices = new Uint32Array(prim.idx);
    const ubo = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(ubo, 0, new Float32Array(glow));
    const bg = device.createBindGroup({ layout: this.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
    ] });
    return { VB: makeBuffer(device, v, GPUBufferUsage.VERTEX), IB: makeBuffer(device, indices, GPUBufferUsage.INDEX), count: indices.length, bg, maps: [alb, nrm, mr], tints: new Map(), radius: reachOf(P) };
  }

  // The same model, glowing a colour: its rarity's, when it's dropped.
  tinted(model, hex) {
    let t = model.tints.get(hex);
    if (t) return t;
    const { device } = this;
    const glow = [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.2);
    const ubo = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(ubo, 0, new Float32Array([...glow, 1]));
    t = { ...model, bg: device.createBindGroup({ layout: this.bglArmor, entries: [
      { binding: 0, resource: { buffer: ubo } }, ...model.maps.map((m, i) => ({ binding: i + 1, resource: m.createView() })),
    ] }) };
    model.tints.set(hex, t);
    return t;
  }

  // A suit's gauntlets, by its id: { ready } until its file is in, and then, per first-person rig, what goes on it. See tools/gear/gauntlets.py.
  gauntletSet(suit) {
    let s = this.gauntletSets.get(suit);
    if (!s) {
      s = { ready: false, rigs: new Map() };
      this.gauntletSets.set(suit, s);
      this.buildGauntlets(suit, s).catch((e) => console.error(`gauntlets ${suit}`, e));
    }
    return s;
  }

  async buildGauntlets(suit, s) {
    const { device } = this;
    const buf = await fetch(`${this.base}assets/fp/gauntlets_${suit}.glb`).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
    const glb = parseGLB(buf);
    const mat = glb.json.materials[0];
    const srcOf = (t) => glb.json.textures[t.index].source;
    const scale = this.tier.texScale;
    const [alb, nrm, mr] = await Promise.all([
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb', scale),
      this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', scale),
      this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', scale),
    ]);
    const rigs = { arms_1h: this.vms[1], arms_2h: this.vms[2], arms_staff: this.vms[3], spell_attack: this.spellVMs[1], spell_raise: this.spellVMs[2] };
    for (const m of glb.json.meshes) {
      const vm = rigs[m.name];
      if (!vm) continue;
      const a = m.primitives[0].attributes;
      const prim = { pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, m.primitives[0].indices), joints: accessor(glb, a.JOINTS_0), weights: accessor(glb, a.WEIGHTS_0) };
      const hand = this.makeSkinned([prim], vm.jointCount);
      const ubo = device.createBuffer({ size: 64 + 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      const bg = device.createBindGroup({ layout: this.bglArmor, entries: [
        { binding: 0, resource: { buffer: ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
      ] });
      // (The leather has the arm's own normal map, a part at a time: the creases of a knuckle, where a flat colour reads as rubber.)
      const under = vm.parts.map((part) => device.createBindGroup({ layout: this.bglArmor, entries: [
        { binding: 0, resource: { buffer: ubo } }, ...this.underMaps().map((t, i) => ({ binding: i + 1, resource: (i === 1 ? part.nrm : t).createView() })),
      ] }));
      s.rigs.set(vm, { hand, ubo, bg, under, bare: this.armsUnder(vm, m.extras.cut) });
    }
    s.ready = true;
  }

  // What's under armour: dark leather, in a texel each of colour, normal and roughness.
  underMaps() {
    if (this.underTex) return this.underTex;
    const { device } = this;
    const texel = (rgba, format) => {
      const t = device.createTexture({ size: [1, 1], format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
      device.queue.writeTexture({ texture: t }, new Uint8Array(rgba), { bytesPerRow: 4 }, [1, 1]);
      return t;
    };
    this.underTex = [texel([30, 25, 21, 255], 'rgba8unorm-srgb'), texel([128, 128, 255, 255], 'rgba8unorm'), texel([255, 230, 0, 255], 'rgba8unorm')];
    return this.underTex;
  }

  // The arms, sorted about the armour: an index buffer of their own, with the skin that shows in the parts' ranges, and what's under the plates in `dark`.
  // cut: per side and per part, a point and which way is under.
  armsUnder(vm, cut) {
    const { prims, jointNames } = vm;
    const out = [], ranges = [], leather = [], dark = [];
    let base = 0;
    prims.forEach((p, k) => {
      const first = out.length, leatherAt = leather.length, n = p.pos.length / 3;
      const name = vm.parts[k].name;
      const sideOf = (i) => {
        let best = 0, w = -1;
        for (let c = 0; c < 4; c++) if (p.weights[i * 4 + c] > w) { w = p.weights[i * 4 + c]; best = p.joints[i * 4 + c]; }
        return jointNames[best].endsWith('_L') ? 'L' : 'R';
      };
      const under = (i) => {
        if (!p.joints || vm.parts[k].isSword) return false;
        const pl = (cut[name] || cut)[sideOf(i)];
        if (!pl) return false;
        return (p.pos[i * 3] - pl[0]) * pl[3] + (p.pos[i * 3 + 1] - pl[1]) * pl[4] + (p.pos[i * 3 + 2] - pl[2]) * pl[5] > 0;
      };
      const seen = new Int8Array(n).fill(-1);
      const test = (i) => { if (seen[i] < 0) seen[i] = under(i) ? 1 : 0; return seen[i] === 1; };
      for (let t = 0; t < p.idx.length; t += 3) {
        const a = p.idx[t], b = p.idx[t + 1], c = p.idx[t + 2];
        (test(a) && test(b) && test(c) ? leather : out).push(a + base, b + base, c + base);
      }
      ranges.push({ first, count: out.length - first });
      if (leather.length > leatherAt) dark.push({ first: leatherAt, count: leather.length - leatherAt, part: k });
      base += n;
    });
    for (const r of dark) r.first += out.length;
    return { IB: makeBuffer(this.device, new Uint32Array([...out, ...leather]), GPUBufferUsage.INDEX), ranges, dark };
  }

  // A gem on the ground: a long-pointed eight-sided stone, flat-shaded, in its one colour and giving off a little of it.
  gem(hex) {
    let m = this.gems.get(hex);
    if (m) return m;
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const lin = c.map((x) => (x / 255) ** 2.2);
    const R = 0.05, H_ = 0.075;
    const corners = [[R, 0, 0], [0, 0, R], [-R, 0, 0], [0, 0, -R]];
    const pos = [], nrm = [], uv = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      for (const [apex, flip] of [[[0, H_, 0], false], [[0, -H_, 0], true]]) {
        const t = flip ? [apex, b, a] : [apex, a, b];
        const u = t[1].map((x, k) => x - t[0][k]), v = t[2].map((x, k) => x - t[0][k]);
        const nr = norm3(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
        for (const q of t) { pos.push(...q); nrm.push(...nr); uv.push(0.5, 0.5); }
      }
    }
    const idx = new Uint32Array(pos.length / 3).map((_, i) => i);
    m = this.lyingModel({ pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx }, this.pixel('rgba8unorm-srgb', [...c, 255]), this.flatNormal, this.pixel('rgba8unorm', [255, 40, 60, 255]),
      [lin[0] * 1.6, lin[1] * 1.6, lin[2] * 1.6, 0]);
    this.gems.set(hex, m);
    return m;
  }

  // What's brought up from the dead (items.js MATS), a small heap of each: splinters of bone, bent coffin nails and a strap,
  // a folded length of shroud, candle-ends, and an ember that burns.
  stuff(kind) {
    const have = (this.stuffs ||= new Map()).get(kind);
    if (have) return have;
    if (kind === 'ember') { const m = this.gem('#ff6a2a'); this.stuffs.set(kind, m); return m; }
    const pos = [], nrm = [], uv = [];
    let seed = 11 + kind.length * 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const tri = (a, b, c) => {
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = norm3(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
      for (const q of [a, b, c]) { pos.push(...q); nrm.push(...n); uv.push(0.5, 0.5); }
    };
    // A prism from a to b, its ends r0 and r1 across, `sides` faces round, capped.
    const prism = (a, b, r0, r1, sides, twist = 0) => {
      const d = norm3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      const e1 = norm3(d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]);
      const e2 = [d[1] * e1[2] - d[2] * e1[1], d[2] * e1[0] - d[0] * e1[2], d[0] * e1[1] - d[1] * e1[0]];
      const ring = (o, r) => Array.from({ length: sides }, (_, k) => { const t = twist + k / sides * 6.283; return [o[0] + (e1[0] * Math.cos(t) + e2[0] * Math.sin(t)) * r, o[1] + (e1[1] * Math.cos(t) + e2[1] * Math.sin(t)) * r, o[2] + (e1[2] * Math.cos(t) + e2[2] * Math.sin(t)) * r]; });
      const A = ring(a, r0), B = ring(b, r1);
      for (let k = 0; k < sides; k++) {
        const k1 = (k + 1) % sides;
        tri(A[k], B[k], B[k1]); tri(A[k], B[k1], A[k1]);
        tri(a, A[k1], A[k]); tri(b, B[k], B[k1]);
      }
    };
    const box = (c, hx, hy, hz, yaw = 0) => {
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      const P = (x, y, z) => [c[0] + x * cs + z * sn, c[1] + y, c[2] - x * sn + z * cs];
      const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
      for (const [a, b, c2, d] of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]]) { tri(v[a], v[b], v[c2]); tri(v[a], v[c2], v[d]); }
    };
    let color, mr, glow = [0, 0, 0, 0];
    if (kind === 'bone') {
      // Splinters, crossed over each other, broken off ragged at one end.
      for (let i = 0; i < 5; i++) {
        const a = rnd() * 6.283, l = 0.09 + rnd() * 0.08, y = 0.012 + i * 0.011;
        const cx = (rnd() - 0.5) * 0.06, cz = (rnd() - 0.5) * 0.06;
        prism([cx - Math.cos(a) * l / 2, y, cz - Math.sin(a) * l / 2], [cx + Math.cos(a) * l / 2, y + (rnd() - 0.5) * 0.02, cz + Math.sin(a) * l / 2], 0.013 + rnd() * 0.008, 0.004 + rnd() * 0.006, 5, rnd());
      }
      color = [216, 204, 174]; mr = [255, 205, 0, 255];
    } else if (kind === 'iron') {
      // Coffin nails, bent, and a hinge strap.
      for (let i = 0; i < 5; i++) {
        const a = rnd() * 6.283, cx = (rnd() - 0.5) * 0.08, cz = (rnd() - 0.5) * 0.08, y = 0.008 + i * 0.006, l = 0.07 + rnd() * 0.03;
        const m = [cx, y + 0.01, cz], bend = (rnd() - 0.5) * 0.9;
        const p0 = [cx - Math.cos(a) * l / 2, y, cz - Math.sin(a) * l / 2], p1 = [cx + Math.cos(a + bend) * l / 2, y + 0.004, cz + Math.sin(a + bend) * l / 2];
        prism(p0, m, 0.006, 0.0055, 4); prism(m, p1, 0.0055, 0.0015, 4);
        prism([p0[0] - Math.cos(a) * 0.004, p0[1], p0[2] - Math.sin(a) * 0.004], [p0[0] + Math.cos(a) * 0.003, p0[1], p0[2] + Math.sin(a) * 0.003], 0.013, 0.013, 6);
      }
      box([0.01, 0.006, -0.01], 0.075, 0.004, 0.017, 0.5);
      color = [128, 116, 102]; mr = [255, 130, 200, 255];
    } else if (kind === 'silk') {
      // A length folded on itself, each fold a little off the one under it, the top one turned back.
      for (let i = 0; i < 4; i++) box([(rnd() - 0.5) * 0.012, 0.008 + i * 0.014, (rnd() - 0.5) * 0.012], 0.085 - i * 0.004, 0.0065, 0.06 - i * 0.003, (rnd() - 0.5) * 0.12);
      box([0.03, 0.066, 0.0], 0.05, 0.004, 0.058, 0.05);
      color = [205, 191, 159]; mr = [255, 235, 0, 255];
    } else {
      // Candle-ends of every height, burnt down crooked, each with its wick.
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + rnd(), r = i ? 0.035 : 0, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.025 + rnd() * 0.045, w = 0.017 + rnd() * 0.006;
        prism([x, 0, z], [x + (rnd() - 0.5) * 0.006, h, z + (rnd() - 0.5) * 0.006], w, w * 0.92, 9, rnd());
        prism([x, h, z], [x, h + 0.012, z], 0.0018, 0.0012, 4);
      }
      color = [226, 207, 142]; mr = [255, 120, 0, 255]; glow = [0.05, 0.035, 0.01, 0];
    }
    // (Drawn a little larger than life, to be seen on the ground in a fight.)
    for (let k = 0; k < pos.length; k++) pos[k] *= 1.8;
    const idx = new Uint32Array(pos.length / 3).map((_, i) => i);
    const m = this.lyingModel({ pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx }, this.pixel('rgba8unorm-srgb', [...color, 255]), this.flatNormal || (this.flatNormal = this.pixel('rgba8unorm', [128, 128, 255, 255])),
      this.pixel('rgba8unorm', mr), glow);
    this.stuffs.set(kind, m);
    return m;
  }

  // The market's stalls: what's on each counter while it's open, the tarp over it when it's not, and the curios stall's gems.
  // Placed in each stall's own frame (`stall` in src/folk/town.js PLACES), on the village's ground.
  makeStalls() {
    // (lx, ly, lz) in the stall's frame, turned a further `spin` on its own spot, scaled k.
    const at = (x, z, yaw, lx = 0, ly = 0, lz = 0, spin = 0, k = 1) => {
      const c = Math.cos(yaw), s = Math.sin(yaw), c2 = Math.cos(yaw + spin) * k, s2 = Math.sin(yaw + spin) * k;
      return new Float32Array([c2, 0, -s2, 0, 0, k, 0, 0, s2, 0, c2, 0, x + lx * c + lz * s, ly, z - lx * s + lz * c, 1]);
    };
    const out = [];
    for (const p of PLACES) {
      if (!p.stall) continue;
      const [x, z, yaw] = p.stall;
      out.push({ id: p.id, open: true, ware: p.id, mat: at(x, z, yaw), slot: -1, model: null });
      out.push({ id: p.id, open: false, ware: 'tarp', mat: at(x, z, yaw), slot: -1, model: null });
      if (p.id === 'curios') CURIO_GEMS.forEach(([gx, gz, hex], i) => out.push({ id: p.id, open: true, gem: hex, glow: hex, mat: at(x, z, yaw, gx, CURIO_TRAY_Y, gz, i * 2.1, 0.62), slot: -1, model: null }));
    }
    return out;
  }

  stallOpen(id, open) {
    if (open) this.stallsOpen.add(id); else this.stallsOpen.delete(id);
  }

  // A place set at table for one of the townsfolk (src/folk/brain.js, setPlace): kind 'setting' or 'tankard', on the table top
  // at `at`, turned to face away from the one sat at it.
  dish(id, on, kind, at, yaw) {
    const m = (this.dishes ||= new Map());
    if (!on) { m.delete(id); return; }
    const c = Math.cos(yaw), s = Math.sin(yaw);
    m.set(id, { ware: kind, mat: new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, at[0], at[1], at[2], 1]), slot: -1, model: null });
  }

  // A stall's wares, coloured from one small palette by their uvs (src/gfx/wares.js).
  ware(kind) {
    const have = (this.wares ||= new Map()).get(kind);
    if (have) return have;
    if (!this.warePalette) {
      // Two rows: each colour, and its shade (a vertex's v runs between them).
      const tex = (format, rows, shade) => {
        const n = rows.length, t = this.device.createTexture({ size: [n, 2], format, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
        this.device.queue.writeTexture({ texture: t }, new Uint8Array([...rows, ...shade].flatMap((r) => [...r, 255].slice(0, 4))), { bytesPerRow: n * 4 }, [n, 2]);
        return t;
      };
      this.warePalette = { alb: tex('rgba8unorm-srgb', WARE_PALETTE, WARE_SHADE), mr: tex('rgba8unorm', WARE_MR, WARE_MR) };
    }
    const m = this.lyingModel(wareMesh(kind), this.warePalette.alb, this.flatNormal || (this.flatNormal = this.pixel('rgba8unorm', [128, 128, 255, 255])), this.warePalette.mr, [0, 0, 0, 0]);
    this.wares.set(kind, m);
    return m;
  }

  // A heap of coins on the ground, each an eight-sided disc lying as it fell.
  coins() {
    if (this.coinHeap) return this.coinHeap;
    const R = 0.034, T = 0.005;
    const pos = [], nrm = [], uv = [];
    const tri = (o, a, b, c, n) => { for (const q of [a, b, c]) { pos.push(o[0] + q[0], o[1] + q[1], o[2] + q[2]); nrm.push(...n); uv.push(0.5, 0.5); } };
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 18; i++) {
      const a = rnd() * 6.283, r = Math.sqrt(i / 18) * 0.11, o = [Math.cos(a) * r, 0.006 + (1 - r / 0.11) * 0.03 * rnd() + (i < 6 ? 0.012 : 0), Math.sin(a) * r];
      const tx = (rnd() - 0.5) * 0.35, tz = (rnd() - 0.5) * 0.35;   // its tilt
      const up = norm3(tx, 1, tz), at = (b, y) => { const x = Math.cos(b) * R, z = Math.sin(b) * R; return [x, y - x * tx - z * tz, z]; };
      for (let k = 0; k < 8; k++) {
        const b0 = k / 8 * 6.283, b1 = (k + 1) / 8 * 6.283, bm = (b0 + b1) / 2, side = [Math.cos(bm), 0, Math.sin(bm)];
        tri(o, [0, T, 0], at(b1, T), at(b0, T), up);
        tri(o, at(b0, T), at(b1, T), at(b1, -T), side);
        tri(o, at(b0, T), at(b1, -T), at(b0, -T), side);
      }
    }
    const idx = new Uint32Array(pos.length / 3).map((_, i) => i);
    this.coinHeap = this.lyingModel({ pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx }, this.pixel('rgba8unorm-srgb', [232, 186, 74, 255]), this.flatNormal || (this.flatNormal = this.pixel('rgba8unorm', [128, 128, 255, 255])),
      this.pixel('rgba8unorm', [255, 90, 255, 255]), [0.2, 0.13, 0.03, 0]);
    return this.coinHeap;
  }

  // The chest, the first time one comes near: its box and its lid, the lid's frame on the hinge. See src/items/chests.js.
  chestModel() {
    this.chestModels = {};
    (async () => {
      const buf = await fetch(`${this.base}assets/game/items/chest.glb`).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
      const glb = parseGLB(buf);
      const prim = (name) => {
        const pr = glb.json.meshes[glb.json.nodes.find((n) => n.name === name).mesh].primitives[0], a = pr.attributes;
        return { pr, pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices) };
      };
      const body = prim('chest_body'), lid = prim('chest_lid');
      const mat = glb.json.materials[body.pr.material], scale = this.tier.texScale;
      const srcOf = (t) => { const x = glb.json.textures[t.index]; return x.source ?? x.extensions.EXT_texture_webp.source; };
      const [alb, nrm, mr] = await Promise.all([
        this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb', scale),
        this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', scale),
        this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', scale),
      ]);
      this.chestModels = { body: this.lyingModel(body, alb, nrm, mr, [0, 0, 0, 0]), lid: this.lyingModel(lid, alb, nrm, mr, [0, 0, 0, 0]) };
    })().catch((e) => console.error('chest', e));
  }

  // The Test Dungeon's door: one slab of grey iron the width of its doorway, banded across, that slides straight up into the wall
  // over it and down again. Where it should be (0 down, 1 up) is the sim's (src/sim/testhall.js, the 'hall' message in src/main.js),
  // and it's moved here at the sim's own pace, so the two keep together.
  hallDoorItem(dt) {
    const d = this.hallDoor ||= { k: 0, want: 0, item: { mesh: null, mat: new Float32Array(16) } };
    d.want = this.hallDoorWant ?? 0;
    // (Where the sim has it, when that's far from here: a load, a fall.)
    if (this.hallDoorSync !== undefined) { if (Math.abs(this.hallDoorSync - d.k) > 0.25) d.k = this.hallDoorSync; this.hallDoorSync = undefined; }
    const step = Math.min(0.1, dt || 0) / DOOR.open;
    d.k = d.want > d.k ? Math.min(d.want, d.k + step) : Math.max(d.want, d.k - step);
    if (!d.item.mesh) {
      const pos = [], nrm = [], uv = [];
      const box = (x0, x1, y0, y1, z0, z1) => {
        const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
        const faces = [[[0, 3, 2, 1], [0, 0, -1]], [[4, 5, 6, 7], [0, 0, 1]], [[0, 4, 7, 3], [-1, 0, 0]], [[1, 2, 6, 5], [1, 0, 0]], [[3, 7, 6, 2], [0, 1, 0]], [[0, 1, 5, 4], [0, -1, 0]]];
        for (const [q, n] of faces) for (const t of [0, 1, 2, 0, 2, 3]) { pos.push(...P[q[t]]); nrm.push(...n); uv.push(0, 0); }
      };
      const w = (DOOR.x1 - DOOR.x0) / 2 + 0.25, h = DOOR.h + 0.3, t = (DOOR.slab[1] - DOOR.slab[0]) / 2;
      box(-w, w, 0, h, -t, t);
      // Bands across both faces, and a heavy foot.
      for (let y = 0.9; y < h - 0.4; y += 1.6) box(-w + 0.15, w - 0.15, y, y + 0.28, -t - 0.07, t + 0.07);
      box(-w, w, 0, 0.35, -t - 0.1, t + 0.1);
      const idx = new Uint32Array(pos.length / 3).map((_, i) => i);
      d.item.mesh = this.lyingModel({ pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uv), idx }, this.pixel('rgba8unorm-srgb', [118, 121, 128, 255]),
        this.flatNormal || (this.flatNormal = this.pixel('rgba8unorm', [128, 128, 255, 255])), this.pixel('rgba8unorm', [255, 140, 90, 255]), [0, 0, 0, 0]);
    }
    const k = d.k * d.k * (3 - 2 * d.k);
    d.item.mat.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, HALL.x + (DOOR.x0 + DOOR.x1) / 2, HALL.y + k * (DOOR.h + 0.2), HALL.z + (DOOR.slab[0] + DOOR.slab[1]) / 2, 1]);
    return d.item;
  }

  // The doors, the first time one comes near: every leaf from one glb, on one set of maps. See src/items/doors.js and tools/doors/model.py.
  doorModel() {
    this.doorModels = {};
    (async () => {
      const buf = await fetch(`${this.base}assets/game/items/doors.glb`).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
      const glb = parseGLB(buf);
      const prims = glb.json.nodes.filter((n) => n.mesh !== undefined).map((n) => {
        const pr = glb.json.meshes[n.mesh].primitives[0], a = pr.attributes;
        return { name: n.name, pr, pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices) };
      });
      const mat = glb.json.materials[prims[0].pr.material], scale = this.tier.texScale;
      const srcOf = (t) => { const x = glb.json.textures[t.index]; return x.source ?? x.extensions.EXT_texture_webp.source; };
      const [alb, nrm, mr] = await Promise.all([
        this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb', scale),
        this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', scale),
        this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', scale),
      ]);
      const models = {};
      for (const p of prims) models[p.name] = this.lyingModel(p, alb, nrm, mr, [0, 0, 0, 0]);
      this.doorModels = models;
    })().catch((e) => console.error('doors', e));
  }

  // The portals, the first time one comes near: the owner's two models (tools/portal/pack.py), each in two, its stone and the
  // face its whirl is painted on. The stone's blue runes and gems glow of themselves (ITEM, glow a 3); the face is drawn moving
  // (ITEM, glow a -2 or -3: SWIRL).
  portalModel() {
    this.portalModels = {};
    (async () => {
      const load = async (kind) => {
        const buf = await fetch(`${this.base}assets/game/items/${PORTAL_MODELS[kind].file}.glb`).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });
        const glb = parseGLB(buf);
        const prim = (name) => {
          const pr = glb.json.meshes[glb.json.nodes.find((n) => n.name === name).mesh].primitives[0], a = pr.attributes;
          return { pr, pos: accessor(glb, a.POSITION), nrm: accessor(glb, a.NORMAL), uv: accessor(glb, a.TEXCOORD_0), idx: accessor(glb, pr.indices) };
        };
        const stone = prim('stone'), swirl = prim('swirl');
        const mat = glb.json.materials[stone.pr.material], scale = this.tier.texScale;
        const srcOf = (t) => { const x = glb.json.textures[t.index]; return x.source ?? x.extensions.EXT_texture_webp.source; };
        const [alb, nrm, mr] = await Promise.all([
          this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.baseColorTexture), 'rgba8unorm-srgb', scale),
          this.imageTexture(glb, srcOf(mat.normalTexture), 'rgba8unorm', scale),
          this.imageTexture(glb, srcOf(mat.pbrMetallicRoughness.metallicRoughnessTexture), 'rgba8unorm', scale),
        ]);
        return { [`${kind}_stone`]: this.lyingModel(stone, alb, nrm, mr, [0, 0, 0, 3]), [`${kind}_swirl`]: this.lyingModel(swirl, alb, nrm, mr, SWIRL[kind]) };
      };
      const [g, d] = await Promise.all([load('ground'), load('dungeon')]);
      this.portalModels = { ...g, ...d };
    })().catch((e) => console.error('portal', e));
  }

  // Where the portals stand: the Warrens' three and every seal (src/core/sites.js portalWall, seal), each model stood on its
  // spot at its size, let down by its sink, looking the spot's way. Two items each, the stone and its swirl, on the one matrix,
  // and where it is for its motes.
  makePortals() {
    const { spots } = buildSites(), out = [];
    const put = (kind, [x, y, z, yaw]) => {
      const { scale: S, sink } = PORTAL_MODELS[kind], c = Math.cos(yaw), s = Math.sin(yaw);
      const mat = new Float32Array([S * c, 0, -S * s, 0, 0, S, 0, 0, S * s, 0, S * c, 0, x, y - sink, z, 1]);
      const at = { kind, x, y: y - sink, z, c, s, S };
      out.push({ portal: `${kind}_stone`, mat, at }, { portal: `${kind}_swirl`, mat, at });
    };
    for (const key of PORTAL_SPOTS) if (spots[key]) put('dungeon', spots[key]);
    for (const key in spots) if (key.startsWith('seal_')) put('ground', spots[key]);
    return out;
  }

  // The portals' motes (src/gfx/post.js ORBIT), from the ones near enough to see: up out of a seal's swirl, opening out over it
  // so it shows from down the road; round the Warrens' portals' doorways and back into their funnels, and low round their daises.
  portalFx(dt, cam) {
    const items = this.portalItems;
    if (!items) return;
    const k = Math.min(dt || 0, 0.05) * this.tier.emit;
    for (let i = 0; i < items.length; i += 2) {
      const p = items[i].at, d2 = (p.x - cam.x) ** 2 + (p.z - cam.z) ** 2;
      if (p.kind === 'ground') {
        if (d2 > 220 ** 2) continue;
        const { face, r } = MOTES.ground, y = p.y + face * p.S;
        this.orbit(8, 120 * k, p.x, y, p.z, r * p.S, 2.6, 3.8, 0.035, 0.1);
        this.orbit(8, 9 * k, p.x, y, p.z, r * p.S, 2.8, 4, 0.5, 0.9);
      } else {
        if (d2 > 90 ** 2) continue;
        const { mid, rim, deck } = MOTES.dungeon, w = rim * p.S;
        this.orbit(9, 170 * k, p.x + w * p.s, p.y + mid * p.S, p.z + w * p.c, Math.atan2(p.s, p.c), 1.6, 2.6, 0.025, 0.08);
        this.orbit(9, 8 * k, p.x + w * p.s, p.y + mid * p.S, p.z + w * p.c, Math.atan2(p.s, p.c), 1.8, 2.8, 0.25, 0.45);
        this.orbit(10, 30 * k, p.x, p.y + deck * p.S + 0.08, p.z, 0.42 * p.S, 2.2, 3.2, 0.025, 0.07);
      }
    }
  }

  // n motes of a portal's (a fraction's a chance of one), going round x, y, z (kind and pad: src/gfx/post.js ORBIT).
  orbit(kind, n, x, y, z, pad, life0, life1, sz0, sz1) {
    const f = this.emitF, u = this.emitU, cap = f.length / 12;
    n = Math.floor(n + Math.random());
    for (let i = 0; i < n && this.emitN < cap; i++) {
      const o = this.emitN++ * 12;
      f[o] = x; f[o + 1] = y; f[o + 2] = z;
      f[o + 3] = f[o + 7] = life0 + (life1 - life0) * Math.random();
      f[o + 4] = x; f[o + 5] = y; f[o + 6] = z;
      f[o + 8] = sz0 + (sz1 - sz0) * Math.random() ** 2;
      u[o + 9] = kind; f[o + 10] = Math.random(); f[o + 11] = pad;
    }
  }

  async buildProp(glb) {
    const { device } = this;
    const pr = glb.json.meshes[0].primitives[0];
    const a = pr.attributes;
    const pos = accessor(glb, a.POSITION), nrm = accessor(glb, a.NORMAL), uv = accessor(glb, a.TEXCOORD_0), idx = accessor(glb, pr.indices);
    const n = pos.length / 3;
    const v = new Float32Array(n * 8);
    for (let i = 0; i < n; i++) {
      v.set(pos.subarray(i * 3, i * 3 + 3), i * 8); v.set(nrm.subarray(i * 3, i * 3 + 3), i * 8 + 3); v.set(uv.subarray(i * 2, i * 2 + 2), i * 8 + 6);
    }
    const indices = new Uint32Array(idx);
    const mat = glb.json.materials[pr.material];
    const tex = await this.imageTexture(glb, glb.json.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source, 'rgba8unorm-srgb');
    const ubo = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bg = device.createBindGroup({ layout: this.bglProp, entries: [{ binding: 0, resource: tex.createView() }, { binding: 1, resource: { buffer: ubo } }] });
    return { VB: makeBuffer(device, v, GPUBufferUsage.VERTEX), IB: makeBuffer(device, indices, GPUBufferUsage.INDEX), count: indices.length, bg, ubo, radius: reachOf(pos) };
  }

  // Bake the sky panorama: every reflection in the game looks at this picture.
  buildEnv() {
    const { device, tier } = this;
    const W = tier.texScale < 1 ? 512 : 1024, H_ = W / 2;
    const mips = mipCountFor(W, H_);
    this.envTex = device.createTexture({ size: [W, H_], format: 'rgba16float', mipLevelCount: mips, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT });
    this.envMips = mips;
    const mod = device.createShaderModule({ code: SKY_BAKE });
    this.bakePipe = device.createRenderPipeline({ layout: 'auto', vertex: { module: mod, entryPoint: 'vs' }, fragment: { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba16float' }] } });
    this.bakeU = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.bakeBG = device.createBindGroup({ layout: this.bakePipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.bakeU } }] });
    this.setHour(this.hour);
  }

  // The sky, painted again for the hour. It lights every reflection and fills the view, so it's not done often.
  bakeSky() {
    const { device, light } = this;
    device.queue.writeBuffer(this.bakeU, 0, new Float32Array([...light.trueSun, light.day, ...light.gnd, 0, ...light.sky, light.day]));
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: this.envTex.createView({ baseMipLevel: 0, mipLevelCount: 1 }), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
    pass.setPipeline(this.bakePipe); pass.setBindGroup(0, this.bakeBG); pass.draw(3); pass.end();
    this.mip.generate(this.envTex, 'rgba16float', 1, this.envMips, enc);
    device.queue.submit([enc.finish()]);
    this.bakeAge = 0;
  }

  // Straight to an hour, and everything lit for it.
  setHour(h) {
    this.hour = ((h % 24) + 24) % 24;
    this.light = daylight(this.hour);
    this.sunDir = this.light.dir;
    this.lightAge = 0;
    this.bakeSky();
  }

  // On with the clock, as far as the world's time has gone. (The sun's only moved twice a second: a shadow that crept every frame would shimmer.)
  turnDay(time) {
    const dt = time - (this.dayTime ?? time);
    this.dayTime = time;
    if (dt <= 0 || dt > 2) return;
    this.hour = (this.hour + dt / secondsPerHour(this.hour)) % 24;
    this.lightAge += dt; this.bakeAge += dt;
    if (this.lightAge >= 0.5) {
      this.lightAge = 0;
      this.light = daylight(this.hour);
      this.sunDir = this.light.dir;
    }
    if (this.bakeAge >= (this.tier.lean ? 30 : 10)) this.bakeSky();
  }

  buildPipelines() {
    const { device, gpu, tier } = this;
    const hdr = gpu.hdrFormat;
    this.msaa = tier.msaa;
    const targets = tier.lean ? [{ format: hdr }] : [{ format: hdr }, { format: LINEAR_DEPTH }];
    this.worldTargets = targets;
    const depth = (write = true, cmp = 'greater') => ({ format: DEPTH, depthWriteEnabled: write, depthCompare: cmp });
    const ms = { count: this.msaa };
    const layout = (...g) => device.createPipelineLayout({ bindGroupLayouts: g });
    const module = (code) => this.shader(code);

    const terrainMod = module(TERRAIN.replaceAll('FAR_SPAN', (2 * FAR_HALF).toFixed(1)));
    this.pTerrain = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArr2),
      vertex: { module: terrainMod, entryPoint: 'vs', buffers: [{ arrayStride: 24, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] }] },
      fragment: { module: terrainMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: depth(), multisample: ms,
    });
    const staticVB = [{ arrayStride: 36, attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' },
      { shaderLocation: 2, offset: 24, format: 'float32x2' }, { shaderLocation: 3, offset: 32, format: 'uint32' }] }];
    this.pGlow = buildGlowPipeline(this, module, layout, DEPTH, ms);
    this.trail ||= new TrailFX(this);
    const staticMod = module(STATIC);
    const staticPipeline = (mod) => device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglStatic),
      vertex: { module: mod, entryPoint: 'vs', buffers: staticVB },
      fragment: { module: mod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    // A shader that can discard turns off the early depth test and a tiled GPU's hidden surface removal, so only the
    // leaves get one.
    // (In a multisampled frame their edges take a share of each pixel's samples, not all or none: materials.js staticSoftCut.
    // renderer.hardCut = true before the pipelines are made keeps the old test, for comparing.)
    this.pStaticCut = staticPipeline(this.msaa > 1 && !tier.lean && !this.hardCut ? module(staticSoftCut(this.msaa)) : staticMod);
    this.pStatic = staticPipeline(module(STATIC.replace('if (params.x > 0.0 && tex.a < 0.5) { discard; }', '')));
    this.staticVBLayout = staticVB;
    this.pineArgs = [layout, targets, depth, ms, staticVB];
    const armorMod = module(ARMOR);
    const skinnedVB = [
      { arrayStride: 16, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] },
      { arrayStride: 36, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }, { shaderLocation: 2, offset: 12, format: 'uint32' }, { shaderLocation: 3, offset: 16, format: 'float32x2' }, { shaderLocation: 4, offset: 24, format: 'float32x3' }] },
    ];
    this.pArmor = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArmor),
      vertex: { module: armorMod, entryPoint: 'vs', buffers: skinnedVB },
      fragment: { module: armorMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    // The same, with the model-true shading (materials.js ARMOR_TRUE), for the bodies marked trueLook: Lisandra's forms.
    const armorTrueMod = module(ARMOR_TRUE);
    this.pArmorTrue = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArmor),
      vertex: { module: armorTrueMod, entryPoint: 'vs', buffers: skinnedVB },
      fragment: { module: armorTrueMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const vmMod = module(VIEWMODEL);
    const vmVB = [skinnedVB[0], { arrayStride: 36, attributes: skinnedVB[1].attributes.slice(0, 3) }];
    this.pVM = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArmor),
      vertex: { module: vmMod, entryPoint: 'vs', buffers: vmVB },
      fragment: { module: vmMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const vmStaffMod = module(VIEWMODEL_STAFF);
    this.pVMStaff = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArmor),
      vertex: { module: vmStaffMod, entryPoint: 'vs', buffers: vmVB },
      fragment: { module: vmStaffMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    this.skullEyes = new SkullEyes(device, this.bgl0, targets, DEPTH, this.msaa, module);
    const vmSkullMod = module(VIEWMODEL_SKULL);
    this.pVMSkull = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArmor),
      vertex: { module: vmSkullMod, entryPoint: 'vs', buffers: vmVB },
      fragment: { module: vmSkullMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    const itemMod = module(ITEM);
    const propMod = module(PROP);
    this.propVB = [
      { arrayStride: 32, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }, { shaderLocation: 2, offset: 24, format: 'float32x2' }] },
      { arrayStride: 64, stepMode: 'instance', attributes: [5, 6, 7, 8].map((l, i) => ({ shaderLocation: l, offset: i * 16, format: 'float32x4' })) },
    ];
    this.pProp = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglProp),
      vertex: { module: propMod, entryPoint: 'vs', buffers: this.propVB },
      fragment: { module: propMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    this.pItem = device.createRenderPipeline({
      layout: layout(this.bgl0, this.bglArmor),
      vertex: { module: itemMod, entryPoint: 'vs', buffers: this.propVB },
      fragment: { module: itemMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: depth(), multisample: ms,
    });
    if (!this.spellfx) this.spellfx = new SpellFX(this);
    this.spellfx.buildSolid((bgl) => layout(this.bgl0, bgl), targets, depth(), ms);
    const skyMod = module(SKY);
    this.pSky = device.createRenderPipeline({
      layout: layout(this.bgl0),
      vertex: { module: skyMod, entryPoint: 'vs' },
      fragment: { module: skyMod, entryPoint: 'fs', targets },
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: DEPTH, depthWriteEnabled: false, depthCompare: 'equal' }, multisample: ms,
    });

    // Shadow pipelines.
    // (Slots 0-2 the cascades; 3 and 4 the kept maps being drawn, src/gfx/shadowcache.js.)
    this.shadowU = device.createBuffer({ size: 256 * 5, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.bglShadow = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 80 } }] });
    this.shadowBG = device.createBindGroup({ layout: this.bglShadow, entries: [{ binding: 0, resource: { buffer: this.shadowU, size: 80 } }] });
    const shMod = device.createShaderModule({ code: SHADOW });
    const shDepth = { format: DEPTH, depthWriteEnabled: true, depthCompare: 'less', depthBias: 2, depthBiasSlopeScale: 2.0, depthBiasClamp: 0.01 };
    const shLayout = layout(this.bglShadow);
    const posVB = (stride) => [{ arrayStride: stride, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }];
    this.pShTerrain = device.createRenderPipeline({ layout: shLayout, vertex: { module: shMod, entryPoint: 'vsPos', buffers: posVB(24) }, primitive: { cullMode: 'none' }, depthStencil: shDepth });
    this.pShStatic = device.createRenderPipeline({ layout: shLayout, vertex: { module: shMod, entryPoint: 'vsPos', buffers: posVB(36) }, primitive: { cullMode: 'none' }, depthStencil: shDepth });
    this.pShSkin = device.createRenderPipeline({ layout: shLayout, vertex: { module: shMod, entryPoint: 'vsSkin', buffers: [{ arrayStride: 16, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] }] }, primitive: { cullMode: 'none' }, depthStencil: shDepth });
    this.pShProp = device.createRenderPipeline({
      layout: shLayout,
      vertex: { module: shMod, entryPoint: 'vsProp', buffers: [posVB(32)[0], { arrayStride: 64, stepMode: 'instance', attributes: [1, 2, 3, 4].map((l, i) => ({ shaderLocation: l, offset: i * 16, format: 'float32x4' })) }] },
      primitive: { cullMode: 'none' }, depthStencil: shDepth,
    });
    this.bglShCut = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
    ] });
    this.shCutBG = device.createBindGroup({ layout: this.bglShCut, entries: [{ binding: 0, resource: this.colorArr.createView({ dimension: '2d-array' }) }, { binding: 1, resource: this.repeatSmp }] });
    this.pines.buildPipelines(...this.pineArgs, shDepth, this.bglShadow, this.bglShCut);
    this.rocks.buildPipelines(...this.pineArgs.slice(0, 4), shDepth, this.bglShadow);
    this.pShCut = device.createRenderPipeline({
      layout: layout(this.bglShadow, this.bglShCut),
      vertex: { module: shMod, entryPoint: 'vsCut', buffers: [{ arrayStride: 36, attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 2, offset: 24, format: 'float32x2' }, { shaderLocation: 3, offset: 32, format: 'uint32' }] }] },
      fragment: { module: shMod, entryPoint: 'fsCut', targets: [] },
      primitive: { cullMode: 'none' }, depthStencil: shDepth,
    });
    this.shadowTex = device.createTexture({ size: [tier.shadowSize, tier.shadowSize, tier.cascades], format: DEPTH, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    // The middle and far cascades keep what never moves from frame to frame (not on a phone: it hasn't the memory to spare).
    this.shCache?.destroy();
    this.shCache = !tier.lean && tier.cascades === 3 && this.keepShadows !== false ? new ShadowCache(this) : null;
    this.shadowViews = Array.from({ length: tier.cascades }, (_, i) => this.shadowTex.createView({ dimension: '2d', baseArrayLayer: i, arrayLayerCount: 1 }));
    this.bloodMap = device.createTexture({ size: [tier.bloodSize, tier.bloodSize], format: 'rg8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    this.bloodView = null;
    // Stands in for the targets a phone doesn't have (nothing reads them there, but their bind groups still ask).
    this.stubView = this.stubView || device.createTexture({ size: [2, 2], format: LINEAR_DEPTH, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT }).createView();
    const enc = device.createCommandEncoder();
    enc.beginRenderPass({ colorAttachments: [{ view: this.bloodMap.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] }).end();
    device.queue.submit([enc.finish()]);
    this.frameBG = device.createBindGroup({ layout: this.bgl0, entries: [
      { binding: 0, resource: { buffer: this.frameUBO } }, { binding: 1, resource: this.repeatSmp }, { binding: 2, resource: this.clampSmp }, { binding: 3, resource: this.shadowSmp },
      { binding: 4, resource: this.shadowTex.createView({ dimension: '2d-array' }) }, { binding: 5, resource: this.envTex.createView() },
      { binding: 6, resource: this.groundMap.createView() }, { binding: 7, resource: this.bloodMap.createView() }, { binding: 8, resource: this.noiseTex.createView() },
    ] });

    // Post pipelines. Layouts come from the shaders.
    const bloomMod = module(BLOOM);
    this.bglBloom = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 16 } },
    ] });
    const bloomLayout = layout(this.bglBloom);
    this.pBloomDown = device.createRenderPipeline({ layout: bloomLayout, vertex: { module: bloomMod, entryPoint: 'vsTri' }, fragment: { module: bloomMod, entryPoint: 'down', targets: [{ format: hdr }] } });
    this.pBloomUp = device.createRenderPipeline({ layout: bloomLayout, vertex: { module: bloomMod, entryPoint: 'vsTri' }, fragment: { module: bloomMod, entryPoint: 'up', targets: [{ format: hdr, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }] } });
    this.bloomU = device.createBuffer({ size: 256 * 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.bglDepthOnly = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } }] });
    this.bglAOApply = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    ] });
    if (tier.ao) {
      const aoMod = module(AO);
      this.pAO = device.createRenderPipeline({ layout: layout(this.bgl0, this.bglDepthOnly), vertex: { module: aoMod, entryPoint: 'vsTri' }, fragment: { module: aoMod, entryPoint: 'fsAO', targets: [{ format: 'r8unorm' }] } });
      this.pAOApply = device.createRenderPipeline({
        layout: layout(this.bgl0, this.bglAOApply), vertex: { module: aoMod, entryPoint: 'vsTri' },
        fragment: { module: aoMod, entryPoint: 'fsApply', targets: [{ format: hdr, blend: { color: { srcFactor: 'dst', dstFactor: 'zero' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } }] },
      });
    }
    if (tier.shafts) {
      const shMod2 = module(SHAFTS);
      this.pShafts = device.createRenderPipeline({ layout: layout(this.bgl0, this.bglDepthOnly), vertex: { module: shMod2, entryPoint: 'vsTri' }, fragment: { module: shMod2, entryPoint: 'fs', targets: [{ format: hdr }] } });
    }
    const compMod = module(COMPOSITE);
    this.bglComposite = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    ] });
    this.pComposite = device.createRenderPipeline({ layout: layout(this.bglComposite), vertex: { module: compMod, entryPoint: 'vsTri' }, fragment: { module: compMod, entryPoint: 'fs', targets: [{ format: gpu.format }] } });
    this.compU = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.compData = new Float32Array(12);
    if (gpu.timestamps) {
      this.querySet = device.createQuerySet({ type: 'timestamp', count: 2 });
      this.queryResolve = device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
      this.queryRead = [0, 1, 2].map(() => device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }));
      this.queryBusy = [false, false, false];
      this.queryI = 0;
    }
  }

  buildParticles() {
    const { device, tier } = this;
    const N = tier.particles;
    this.pCount = N;
    this.pBuffer = device.createBuffer({ size: N * 48, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.pAlive = device.createBuffer({ size: N * 4, usage: GPUBufferUsage.STORAGE });
    this.pArgs = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST });
    const stainCap = 8192;
    this.stainList = device.createBuffer({ size: stainCap * 16, usage: GPUBufferUsage.STORAGE });
    this.stainArgs = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST });
    this.pSimU = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.pSimData = new Float32Array(12);
    const sim = device.createShaderModule({ code: PARTICLE_SIM });
    this.pSim = device.createComputePipeline({ layout: 'auto', compute: { module: sim, entryPoint: 'main' } });
    this.pSimBG = device.createBindGroup({ layout: this.pSim.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: this.pSimU } }, { binding: 1, resource: { buffer: this.pBuffer } }, { binding: 2, resource: { buffer: this.pArgs } },
      { binding: 3, resource: { buffer: this.pAlive } }, { binding: 4, resource: { buffer: this.stainArgs } }, { binding: 5, resource: { buffer: this.stainList } },
      { binding: 6, resource: this.heightTex.createView() },
    ] });
    const draw = this.shader(PARTICLE_DRAW);
    // A phone draws them inside the world's pass, against its depth. On a tiled GPU another pass means reloading the
    // whole picture to carry on.
    const inWorld = (cmp) => (tier.lean ? { depthStencil: { format: DEPTH, depthWriteEnabled: false, depthCompare: cmp }, multisample: { count: this.msaa } } : {});
    this.bglPDraw = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'unfilterable-float' } },
    ] });
    this.pDraw = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.bgl0, this.bglPDraw] }),
      vertex: { module: draw, entryPoint: 'vs' },
      fragment: { module: draw, entryPoint: 'fs', targets: [{ format: this.gpu.hdrFormat, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } } }] },
      ...inWorld('greater'),
    });
    this.spellfx.buildGlow(inWorld);
    const trail = this.shader(TRAIL);
    this.pTrail = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.bgl0] }),
      vertex: { module: trail, entryPoint: 'vs', buffers: [{ arrayStride: 16, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x4' }] }] },
      fragment: { module: trail, entryPoint: 'fs', targets: [{ format: this.gpu.hdrFormat, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }] },
      primitive: { topology: 'triangle-strip' },
      ...inWorld('always'),
    });
    this.skullEyes.makeAura((code) => this.shader(code), this.bgl0, this.gpu.hdrFormat, inWorld('always'));
    this.trailVB = device.createBuffer({ size: 128 * 16, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.trailData = new Float32Array(128 * 4);
    this.trailCount = 0;
    const stain = device.createShaderModule({ code: STAIN });
    this.pStain = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: stain, entryPoint: 'vs' },
      fragment: { module: stain, entryPoint: 'fs', targets: [{ format: 'rg8unorm', blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }] },
    });
    const stainU = makeBuffer(device, new Float32Array([-BLOOD_HALF, -BLOOD_HALF, 1 / (2 * BLOOD_HALF), tier.lean ? 2 * BLOOD_HALF / tier.bloodSize * 0.5 : 0]), GPUBufferUsage.UNIFORM);
    this.stainBG = device.createBindGroup({ layout: this.pStain.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: stainU } }, { binding: 1, resource: { buffer: this.stainList } }] });
    this.emitBuf = new ArrayBuffer(48 * 4096);
    this.emitF = new Float32Array(this.emitBuf);
    this.emitU = new Uint32Array(this.emitBuf);
    this.emitN = 0;
  }

  buildGrass() {
    const { device, tier } = this;
    this.grassSpacing = tier.grassSpacing; this.grassRadius = tier.grassRadius;
    this.useShafts = !!tier.shafts; this.useAO = !!tier.ao; this.useBloom = true; this.grassOn = true;
    this.farShadowEvery = tier.lean ? 4 : 2;
    this.grassN = Math.ceil(2 * this.grassRadius / this.grassSpacing);
    const near = Math.floor(tier.grassCap * 0.62), far = Math.floor(tier.grassCap * 0.38);
    this.grassNear = device.createBuffer({ size: near * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
    this.grassFar = device.createBuffer({ size: far * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
    this.grassNearArgs = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST });
    this.grassFarArgs = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST });
    this.grassU = device.createBuffer({ size: 192, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.grassData = new Float32Array(48);
    const cull = this.shader(GRASS_CULL);
    this.pGrassCull = device.createComputePipeline({ layout: 'auto', compute: { module: cull, entryPoint: 'main' } });
    this.grassBG = device.createBindGroup({ layout: this.pGrassCull.getBindGroupLayout(0), entries: [
      { binding: 0, resource: { buffer: this.grassU } }, { binding: 1, resource: { buffer: this.grassNearArgs } }, { binding: 2, resource: { buffer: this.grassFarArgs } },
      { binding: 3, resource: { buffer: this.grassNear } }, { binding: 4, resource: { buffer: this.grassFar } }, { binding: 5, resource: this.groundMap.createView() }, { binding: 6, resource: this.heightTex.createView() },
    ] });
    const mod = this.shader(GRASS);
    const vb = [{ arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'uint32' }] }];
    const layout = device.createPipelineLayout({ bindGroupLayouts: [this.bgl0, this.bglArr2] });
    const targets = this.worldTargets;
    const depth = { format: DEPTH, depthWriteEnabled: true, depthCompare: 'greater' };
    this.pGrassNear = device.createRenderPipeline({ layout, vertex: { module: mod, entryPoint: 'vsNear', buffers: vb }, fragment: { module: mod, entryPoint: 'fs', targets }, primitive: { topology: 'triangle-strip', cullMode: 'none' }, depthStencil: depth, multisample: { count: this.msaa } });
    this.pGrassFar = device.createRenderPipeline({ layout, vertex: { module: mod, entryPoint: 'vsFar', buffers: vb }, fragment: { module: mod, entryPoint: 'fs', targets }, primitive: { topology: 'triangle-list', cullMode: 'none' }, depthStencil: depth, multisample: { count: this.msaa } });
    this.grassNearRadius = tier.grassRadius * 0.42;
  }

  // ---- targets -------------------------------------------------------------------------------------

  resize() {
    const { gpu, canvas, tier } = this;
    const dpr = Math.min(window.devicePixelRatio || 1, gpu.mobile ? 3 : 2);
    let cw = Math.max(2, Math.floor(canvas.clientWidth * dpr)), ch = Math.max(2, Math.floor(canvas.clientHeight * dpr));
    const screen = `${cw}x${ch}`;
    if (this.screen !== screen) { this.screen = screen; this.dropTargetSets(); }
    let W, H_;
    if (tier.maxPixels) {
      // The canvas itself is only as big as the picture, and the browser stretches it to the screen for nothing. Scale
      // over 1 is for the GPUs that have room to spare, as far as the screen's own pixels.
      const k = Math.min(1, Math.sqrt(tier.maxPixels / (cw * ch)) * this.scale);
      W = cw = Math.max(2, Math.floor(cw * k)); H_ = ch = Math.max(2, Math.floor(ch * k));
    } else {
      const k = Math.min(1, this.scale) * tier.scaleMax;
      W = Math.max(2, Math.floor(cw * k)); H_ = Math.max(2, Math.floor(ch * k));
    }
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const key = `${W}x${H_}`;
    if (this.activeKey === key) return;
    if (!this.targetSets) this.targetSets = new Map();
    let set = this.targetSets.get(key);
    if (!set) {
      // Two sets at most: the one in use and the one before it.
      if (this.targetSets.size >= 2) {
        const oldest = [...this.targetSets.keys()].find((k) => k !== this.activeKey);
        for (const t of this.targetSets.get(oldest).textures) t.destroy();
        this.targetSets.delete(oldest);
      }
      set = this.buildTargetSet(W, H_);
      this.targetSets.set(key, set);
    }
    this.activeKey = key;
    Object.assign(this, set.fields);
    this.W = W; this.H = H_;
    this.device.queue.writeBuffer(this.bloomU, 0, set.bloomData);
  }

  dropTargetSets() {
    if (this.targetSets) for (const set of this.targetSets.values()) for (const t of set.textures) t.destroy();
    this.targetSets = new Map();
    this.activeKey = null;
  }

  buildTargetSet(W, H_) {
    const { device, gpu, tier } = this;
    const make = (w, h, format, usage, sampleCount = 1) => device.createTexture({ size: [w, h], format, usage, sampleCount });
    const RT = GPUTextureUsage.RENDER_ATTACHMENT, TB = GPUTextureUsage.TEXTURE_BINDING;
    const lean = !!tier.lean, multi = this.msaa > 1;
    const hdr = make(W, H_, gpu.hdrFormat, RT | TB);
    const hdrMS = multi ? make(W, H_, gpu.hdrFormat, RT, this.msaa) : hdr;
    const depthMS = make(W, H_, DEPTH, RT, this.msaa);
    const hw = Math.max(2, W >> 1), hh = Math.max(2, H_ >> 1);
    const textures = multi ? [hdrMS, hdr, depthMS] : [hdr, depthMS];
    // Only the full tiers read depth back, for AO, sun shafts and soft particles.
    let ldMS = null, ld = null, aoTex = null, shaftTex = null;
    if (!lean) {
      // (One sample a pixel, as after dropMSAA: the linear depth is drawn straight into, with nothing to resolve.)
      ld = make(W, H_, LINEAR_DEPTH, RT | TB); ldMS = multi ? make(W, H_, LINEAR_DEPTH, RT, this.msaa) : null;
      aoTex = make(hw, hh, 'r8unorm', RT | TB); shaftTex = make(hw, hh, gpu.hdrFormat, RT | TB);
      textures.push(...(ldMS ? [ldMS] : []), ld, aoTex, shaftTex);
    }
    const bloomChain = [];
    let bw = hw, bh = hh;
    for (let i = 0; i < tier.bloom; i++) {
      const t = make(Math.max(2, bw), Math.max(2, bh), gpu.hdrFormat, RT | TB);
      bloomChain.push({ tex: t, view: t.createView(), w: Math.max(2, bw), h: Math.max(2, bh) });
      textures.push(t);
      bw >>= 1; bh >>= 1;
    }
    const hdrView = hdr.createView(), ldView = lean ? this.stubView : ld.createView();
    const aoView = lean ? this.stubView : aoTex.createView(), shaftView = lean ? this.stubView : shaftTex.createView();
    const hdrMSView = multi ? hdrMS.createView() : hdrView;
    const clear = [0, 0, 0, 1];
    const worldPass = {
      colorAttachments: [multi ? { view: hdrMSView, resolveTarget: hdrView, loadOp: 'clear', storeOp: 'discard', clearValue: clear } : { view: hdrView, loadOp: 'clear', storeOp: 'store', clearValue: clear }],
      depthStencilAttachment: { view: depthMS.createView(), depthLoadOp: 'clear', depthClearValue: 0, depthStoreOp: 'discard' },
    };
    if (!lean) worldPass.colorAttachments.push(multi ? { view: ldMS.createView(), resolveTarget: ldView, loadOp: 'clear', storeOp: 'discard', clearValue: [4000, 0, 0, 1] } : { view: ldView, loadOp: 'clear', storeOp: 'store', clearValue: [4000, 0, 0, 1] });
    const bgFor = (view) => device.createBindGroup({ layout: this.bglBloom, entries: [
      { binding: 0, resource: view }, { binding: 1, resource: this.clampSmp }, { binding: 2, resource: { buffer: this.bloomU, size: 16 } }] });
    const bloomDownBG = [bgFor(hdrView)];
    for (let i = 0; i + 1 < bloomChain.length; i++) bloomDownBG.push(bgFor(bloomChain[i].view));
    const bloomUpBG = [];
    for (let i = bloomChain.length - 1; i > 0; i--) bloomUpBG.push(bgFor(bloomChain[i].view));
    const bd = new Float32Array(256 * 16 / 4);
    let slot = 0;
    const bloomSlots = { down: [], up: [] };
    let sw = W, sh = H_;
    for (let i = 0; i < bloomChain.length; i++) {
      const o = slot * 64;
      bd[o] = 0.5 / sw; bd[o + 1] = 0.5 / sh; bd[o + 2] = 1; bd[o + 3] = i === 0 ? 1 : 0;
      bloomSlots.down.push(slot * 256);
      slot++;
      sw = bloomChain[i].w; sh = bloomChain[i].h;
    }
    for (let i = bloomChain.length - 1; i > 0; i--) {
      const o = slot * 64;
      bd[o] = 1 / bloomChain[i].w; bd[o + 1] = 1 / bloomChain[i].h; bd[o + 2] = 0.72;
      bloomSlots.up.push(slot * 256);
      slot++;
    }
    const fields = {
      hdr, bloomChain, hdrView, bloomDownBG, bloomUpBG, bloomSlots, aoView, shaftView, worldPass,
      compBG: device.createBindGroup({ layout: this.bglComposite, entries: [
        { binding: 0, resource: hdrView }, { binding: 1, resource: bloomChain[0].view }, { binding: 2, resource: shaftView },
        { binding: 3, resource: this.clampSmp }, { binding: 4, resource: { buffer: this.compU } },
      ] }),
      depthBG: device.createBindGroup({ layout: this.bglDepthOnly, entries: [{ binding: 0, resource: ldView }] }),
      aoApplyBG: device.createBindGroup({ layout: this.bglAOApply, entries: [{ binding: 0, resource: ldView }, { binding: 1, resource: aoView }] }),
      pDrawBG: device.createBindGroup({ layout: this.bglPDraw, entries: [
        { binding: 0, resource: { buffer: this.pBuffer } }, { binding: 1, resource: { buffer: this.pAlive } }, { binding: 2, resource: ldView },
      ] }),
      fxBG: this.spellfx.depthBG(ldView),
    };
    return { fields, textures, bloomData: bd };
  }

  // Step quality down when even a lower resolution can't hold the frame rate. Returns false when nothing's left.
  demote() {
    if ((this.demoted || 0) >= (this.tier.lean ? 7 : 5)) return false;
    this.demoted = (this.demoted || 0) + 1;
    switch (this.demoted) {
      case 1: if (this.useShafts) { this.useShafts = false; return true; } this.demoted = 2; // falls through
      case 2: if (this.useAO) { this.useAO = false; return true; } this.demoted = 3; // falls through
      case 3:
        this.grassSpacing *= 1.35; this.grassRadius *= 0.85; this.grassN = Math.ceil(2 * this.grassRadius / this.grassSpacing);
        return true;
      case 4: this.farShadowEvery *= 2; return true;
      case 5:
        this.grassSpacing *= 1.35; this.grassRadius *= 0.8; this.grassN = Math.ceil(2 * this.grassRadius / this.grassSpacing);
        return true;
      case 6: if (this.tier.lean) { this.useBloom = false; return true; } return false;
      case 7: if (this.tier.lean) { this.grassOn = false; return true; } return false;
      default: return false;
    }
  }

  // Multisampling can't be changed in the middle of things, so this is for before anyone's seen a frame.
  dropMSAA() {
    this.tier.msaa = 1;
    this.shadowTex.destroy(); this.bloodMap.destroy();
    this.buildPipelines();
    this.buildParticles();
    this.buildGrass();
    this.dropTargetSets();
    this.resize();
  }

  clearBlood() {
    const enc = this.device.createCommandEncoder();
    enc.beginRenderPass({ colorAttachments: [{ view: this.bloodMap.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] }).end();
    this.device.queue.submit([enc.finish()]);
  }

  // ---- particles from the CPU -------------------------------------------------------------------------

  // Emit a burst. kind: 0 droplet, 1 mist, 2 spark, 3 dust, 4 smoke, 5 mote, 6 ember, 7 flame.
  emit(kind, count, x, y, z, dx, dy, dz, spread, sp0, sp1, sz0, sz1, life0, life1) {
    const f = this.emitF, u = this.emitU, cap = this.emitF.length / 12;
    // (Blood is what this game is about, so it's the last thing to go thin.)
    if (this.tier.emit !== 1) count = Math.floor(count * (kind < 2 ? 0.8 : this.tier.emit) + Math.random());
    // Blood soaks in when it lands, so the ground needs drawing on until the last of it has (slow motion included).
    if (kind === 0) this.bloodUntil = performance.now() + (life1 * 4 + 1) * 1000;
    for (let i = 0; i < count; i++) {
      if (this.emitN >= cap) return;
      const o = this.emitN * 12;
      const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
      const rx = Math.cos(a) * r + (Math.random() - 0.5) * spread * 0.4, ry = Math.sin(a) * r, rz = (Math.random() - 0.5) * spread;
      let vx = dx + rx, vy = dy + ry, vz = dz + rz;
      const L = 1 / (Math.hypot(vx, vy, vz) || 1);
      const s = sp0 + (sp1 - sp0) * Math.random() ** 1.6;
      f[o] = x; f[o + 1] = y; f[o + 2] = z;
      f[o + 3] = life0 + (life1 - life0) * Math.random();
      f[o + 4] = vx * L * s; f[o + 5] = vy * L * s; f[o + 6] = vz * L * s;
      f[o + 7] = f[o + 3];
      // Mostly small with a few large: the way any spray of liquid breaks up.
      f[o + 8] = sz0 + (sz1 - sz0) * Math.random() ** 3;
      u[o + 9] = kind;
      f[o + 10] = Math.random(); f[o + 11] = 0;
      this.emitN++;
    }
  }

  flushEmits() {
    const n = this.emitN;
    if (!n) return;
    const N = this.pCount;
    let head = this.emitHead;
    const first = Math.min(n, N - head);
    this.device.queue.writeBuffer(this.pBuffer, head * 48, this.emitBuf, 0, first * 48);
    if (first < n) this.device.queue.writeBuffer(this.pBuffer, 0, this.emitBuf, first * 48, (n - first) * 48);
    this.emitHead = (head + n) % N;
    this.emitN = 0;
  }

  // ---- a frame ---------------------------------------------------------------------------------------

  writeFrame(cam, snap) {
    const d = this.frameData;
    const { W, H: Ht } = this;
    const aspect = W / Ht;
    // (A cinematic camera can narrow the lens: cam.fov, in radians.)
    const fov = cam.fov || WORLD_FOV;
    mat4Perspective(this.tmpP, fov, aspect, 0.08);
    mat4LookTo(this.tmpV, cam.x, cam.y, cam.z, cam.fx, cam.fy, cam.fz, cam.ux, cam.uy, cam.uz);
    mat4Mul(this.tmpVP, this.tmpP, this.tmpV);
    mat4Invert(this.tmpI, this.tmpVP);
    d.set(this.tmpVP, O.VP); d.set(this.tmpV, O.VIEW); d.set(this.tmpP, O.PROJ); d.set(this.tmpI, O.IVP);
    // Left, right, bottom, top, near from the combined matrix.
    const m = this.tmpVP, pl = this.planes;
    for (let i = 0; i < 5; i++) {
      const axis = i >> 1, sign = i === 4 ? -1 : (i & 1 ? -1 : 1);
      const a = m[3] + sign * m[axis], b = m[7] + sign * m[axis + 4], c = m[11] + sign * m[axis + 8], e = m[15] + sign * m[axis + 12];
      const L = 1 / Math.hypot(a, b, c);
      pl[i * 4] = a * L; pl[i * 4 + 1] = b * L; pl[i * 4 + 2] = c * L; pl[i * 4 + 3] = e * L;
    }
    const vmFov = (this.vmFov || 76) * Math.PI / 180;
    mat4Perspective(this.tmpP, vmFov, aspect, 0.05);
    d.set(this.tmpP, O.VMP);
    // View model space to world: the camera's own frame at the eye.
    const rx = cam.fy * cam.uz - cam.fz * cam.uy, ry = cam.fz * cam.ux - cam.fx * cam.uz, rz = cam.fx * cam.uy - cam.fy * cam.ux;
    put4(d, O.VMW, rx, ry, rz, 0); put4(d, O.VMW + 4, cam.ux, cam.uy, cam.uz, 0); put4(d, O.VMW + 8, -cam.fx, -cam.fy, -cam.fz, 0); put4(d, O.VMW + 12, cam.x, cam.y, cam.z, 1);
    // Cascades.
    this.turnDay(snap[H.TIME]);
    const n = this.tier.cascades;
    const tan = Math.tan(fov / 2);
    const sun = this.sunDir;
    this.followLand(cam);
    this.slimeBodies?.update(snap, snap[H.TIME], cam);
    this.pines.update(cam, aspect, tan);
    this.rocks.update(cam, aspect, tan);
    this.rocks.updateTumblers(snap, cam);
    let prev = 0.1;
    // The far cascade is drawn less often, and keeps the matrix it was drawn with until the next.
    this.shadowFrame++;
    this.farNow = this.shadowFrame % this.farShadowEvery === 1 % this.farShadowEvery;
    // The kept cascades first (src/gfx/shadowcache.js), so the near one can take the sun they were drawn with and the
    // three agree where they meet.
    const kept = this.shCache;
    let shSun = sun;
    if (kept) {
      // (A new key, and what's lit, only when one of them changes.)
      const under = cam.y <= -6, rocks = this.rocksOn !== false;
      if (!this.keptLit || this.keptLit.under !== under || this.keptLit.rocks !== rocks || this.keptKeyEpoch !== this.shadowEpoch) {
        this.keptLit = { under, rocks }; this.keptKeyEpoch = this.shadowEpoch;
        this.keptKey = `${this.shadowEpoch}|${under}|${rocks}`;
      }
      const key = this.keptKey;
      for (let c = 1; c < n; c++) kept.plan(c, cam, this.splits[c], tan, aspect, sun, key, d, O.CASC + c * 16);
      shSun = kept.sunFor(sun);
    }
    for (let c = 0; c < n; c++) {
      if (kept && c > 0) break;
      if (c === n - 1 && !this.farNow) break;
      const far = this.splits[n === 2 && c === 1 ? 2 : c];
      const mid = (prev + far) / 2;
      const hf = far * tan, wf = hf * aspect, hn = prev * tan, wn = hn * aspect;
      const rad = Math.ceil(Math.max(Math.hypot(far - mid, wf, hf), Math.hypot(mid - prev, wn, hn)));
      const cx = cam.x + cam.fx * mid, cy = cam.y + cam.fy * mid, cz = cam.z + cam.fz * mid;
      mat4LookTo(this.tmpV, 0, 0, 0, -shSun[0], -shSun[1], -shSun[2], 0, 1, 0);
      // Snap the centre to the shadow map's texels, so edges don't crawl as you move.
      const texel = 2 * rad / this.tier.shadowSize;
      const lx = this.tmpV[0] * cx + this.tmpV[4] * cy + this.tmpV[8] * cz;
      const ly = this.tmpV[1] * cx + this.tmpV[5] * cy + this.tmpV[9] * cz;
      const lz = this.tmpV[2] * cx + this.tmpV[6] * cy + this.tmpV[10] * cz;
      const sx = Math.round(lx / texel) * texel, sy = Math.round(ly / texel) * texel;
      mat4Ortho(this.tmpP, sx - rad, sx + rad, sy - rad, sy + rad, -lz - 260, -lz + 260);
      mat4Mul(this.tmpVP, this.tmpP, this.tmpV);
      d.set(this.tmpVP, O.CASC + c * 16);
      prev = far;
    }
    this.camNow = cam;
    d[O.CAM] = cam.x; d[O.CAM + 1] = cam.y; d[O.CAM + 2] = cam.z; d[O.CAM + 3] = snap[H.TIME] + (this.renderTimeOffset || 0);
    d[O.SUN] = sun[0]; d[O.SUN + 1] = sun[1]; d[O.SUN + 2] = sun[2]; d[O.SUN + 3] = 2.4 / this.tier.shadowSize;
    const day = this.light;
    put4(d, O.SUNC, day.sun[0], day.sun[1], day.sun[2], day.glass);
    put4(d, O.SKY, day.sky[0], day.sky[1], day.sky[2], day.day);
    put4(d, O.GND, day.gnd[0], day.gnd[1], day.gnd[2], 0);
    d.set(day.fog, O.FOG);
    put4(d, O.FOGP, 0.018, 0.8, 0, 0);
    put4(d, O.SPLIT, this.splits[0], this.splits[n === 2 ? 2 : 1], this.splits[2], 0);
    put4(d, O.SCREEN, W, Ht, 1 / W, 1 / Ht);
    const t = d[O.CAM + 3];
    const gust = 0.42 + 0.3 * Math.sin(t * 0.21) + 0.15 * Math.sin(t * 0.67);
    put4(d, O.WIND, 0.82, gust, 0.57, t);
    put4(d, O.GROUND, -GROUND_HALF, -GROUND_HALF, 1 / (2 * GROUND_HALF), 0);
    put4(d, O.BLOOD, -BLOOD_HALF, -BLOOD_HALF, 1 / (2 * BLOOD_HALF), this.useBloom ? 1 : 0);
    // Bodies in the grass: you, and whoever's nearest (writeFeet, below).
    put4(d, O.CHARS, snap[H.PX], snap[H.PY], snap[H.PZ], 0.45);
    // Lanterns, the nearest to the camera first. When there are more than the tier can light, each fades out before the
    // next one takes its place, so none switches off in view.
    const lights = this.lights;
    // (The houses' lamps go out when everyone in is asleep: src/gfx/homelights.js sets L.dim.)
    const now = performance.now();
    this.homeLights.frame(this.folk?.slot || null, Math.min(0.25, (now - (this.homeLightsAt || now)) / 1000));
    this.homeLightsAt = now;
    // (Below, where every light there is is a flame, twice the tier's count; down the Warrens, with its torches and
    // braziers, two and a half times. A phone keeps its two.)
    // (And in Lisandra's cave, lit by her candles.)
    // (Room kept for the lights your party carries: src/gfx/spellfx.js carried.)
    const under = this.tier.lean || !(cam.y < -6 || this.inCave) ? 1 : inDungeon(cam.x, cam.z) ? 2.5 : 2;
    const take = Math.min(lights.length, Math.round(this.tier.lights * under), MAX_LIT - this.spellfx.carried(snap));
    const lit = this.litOrder || (this.litOrder = lights.map((L) => ({ L, d: 0 })));
    // (A lamp behind you counts as further off: its glow on a wall you can't see is wasted.)
    for (const e of lit) e.d = Math.hypot(e.L.p[0] - cam.x, e.L.p[2] - cam.z) + ((e.L.p[0] - cam.x) * cam.fx + (e.L.p[2] - cam.z) * cam.fz < 0 ? 12 : 0);
    if (take < lit.length) lit.sort((a, b) => a.d - b.d);
    const nextD = take < lit.length ? lit[take].d : 1e9;
    for (let i = 0; i < take; i++) {
      const L = lit[i].L;
      const fl = 1 + L.flicker * 0.25 * (Math.sin(t * 9.1 + i * 2.1) * 0.6 + Math.sin(t * 17.3 + i) * 0.4);
      const fade = Math.min(1, nextD - lit[i].d);
      putLight(d, O.LIGHTS + i * 8, L, L.i * fl * fade * (L.dim ?? 1));
    }
    let spellLights = this.spellfx.frame(snap, d, O.LIGHTS, take);
    // The light off the gems you carry. src/gfx/gemfx.js.
    for (const L of this.gemLights || []) {
      if (take + spellLights >= MAX_LIT) break;
      putLight(d, O.LIGHTS + (take + spellLights++) * 8, L, L.i);
    }
    // A candle or a lamp the player's carrying (src/ui/folk.js: bought of Elspeth Tallow).
    if (this.carryLight && take + spellLights < MAX_LIT) { const L = this.carryLight; putLight(d, O.LIGHTS + (take + spellLights++) * 8, L, L.i); }
    put4(d, O.COUNTS, take + spellLights, this.tier.cascades, this.tier.pom, this.grassNearRadius * 1.9);
    if (this.caveAmb) d.set(this.caveAmb, O.CAVE); else put4(d, O.CAVE, 0, 0, 0, 0);
    this.writeFeet(d, snap, cam);
    this.device.queue.writeBuffer(this.frameUBO, 0, d);
  }

  // What each body needs this frame. Off the screen it needn't be drawn, and if its shadow can't reach the screen either it
  // needn't even be skinned. On a phone a body far away is drawn from its coarse index list.
  // Who's near you: for the grass they press flat (the five nearest, after you), and for the dark the ground has
  // under whoever stands on it (shaders.js underfoot: the nearest twelve). Whoever was drawn last frame, the townsfolk
  // among them, each where its soles are and as wide as it stands. (The grass used to bend for the first five bodies
  // in the world and nobody else: the two knights of the duel and the crabs. A villager crossed a field like a ghost.)
  // No dark under you, which you'd only see looking at your own boots, nor under the dead, who have no feet under
  // them. If more than twelve stand near, the dark has faded out by the thirteenth, so nobody's comes or goes at a stroke.
  writeFeet(d, snap, cam) {
    const list = this.feetList || (this.feetList = []);
    let n = 0;
    const add = (x, y, z, r, down = false) => {
      const dist = Math.hypot(x - cam.x, z - cam.z);
      if (dist > FEET_REACH) return;
      const e = list[n] || (list[n] = { x: 0, y: 0, z: 0, r: 0, d: 0, down: false });
      e.x = x; e.y = y; e.z = z; e.r = r; e.d = dist; e.down = down; n++;
    };
    for (let i = 0; i < this.chars.length; i++) {
      const c = this.chars[i], co = CHARS_START + i * C_SIZE;
      if (!c.casts || snap[co + C.ACTIVE] < 0.5) continue;
      add(snap[co + C.X], snap[co + C.Y], snap[co + C.Z], Math.min(3, Math.max(0.36, (c.bindR || 1.8) * 0.26)), snap[co + C.STATE] === 10);
    }
    const s = this.folk?.slot;
    if (s) this.folk.feet(s, add);
    list.length = n;
    list.sort((a, b) => a.d - b.d);
    // The grass: slots 1 to 5 (a phone's shader reads the first three).
    for (let i = 1; i < 6; i++) {
      const e = i <= n ? list[i - 1] : null;
      if (e) put4(d, O.CHARS + i * 4, e.x, e.y, e.z, Math.min(1.8, Math.max(0.6, e.r * 1.3))); else d[O.CHARS + i * 4 + 3] = 0;
    }
    // The dark under them.
    let take = 0, past = FEET_REACH;
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9;
    if (!this.tier.lean && !this.noFeet) {
      for (let i = 0; i < n; i++) {
        const e = list[i];
        if (e.down) continue;
        if (take === FEET) { past = e.d; break; }
        const o = O.FEET + take++ * 4;
        d[o] = e.x; d[o + 1] = e.z; d[o + 2] = e.y; d[o + 3] = e.r;
        x0 = Math.min(x0, e.x - e.r); x1 = Math.max(x1, e.x + e.r); z0 = Math.min(z0, e.z - e.r); z1 = Math.max(z1, e.z + e.r);
        y0 = Math.min(y0, e.y - 0.5); y1 = Math.max(y1, e.y + 0.3);
      }
    }
    put4(d, O.FEET_BOX, x0, z0, x1, z1);
    put4(d, O.FEET_Y, y0, y1, past, take);
  }

  cullBodies(cam, snap) {
    const pl = this.planes;
    this.skinFrame = (this.skinFrame || 0) + 1;
    const stage = snap[H.OPENING];
    // Lisandra as you see her (src/core/opening.js prettyShown). Everyone else only ever sees the witch.
    const pretty = prettyShown(stage, snap[H.OPENING_TIME], this.hour >= DAWN_HOUR && this.hour < DUSK_HOUR);
    for (let i = 0; i < this.chars.length; i++) {
      const c = this.chars[i];
      const co = CHARS_START + i * C_SIZE;
      const otherForm = stage && (i === this.firstForm + (pretty ? 1 : 0));
      // (Your own body: only in the third-person view, and not with the camera right up against its back.)
      if (otherForm || c.pending || snap[co + C.ACTIVE] < 0.5 || (c.self && !this.third)) { c.seen = false; c.casts = false; c.skin = false; c.wasCast = false; continue; }
      const x = snap[co + C.X], y = snap[co + C.Y] + 1, z = snap[co + C.Z];
      const r = c.armored ? 2.6 : 5;
      c.bx = x; c.by = y; c.bz = z; c.br = bodyRadius(r, c.bindR);
      let inside = 1e9;
      for (let k = 0; k < 5; k++) inside = Math.min(inside, pl[k * 4] * x + pl[k * 4 + 1] * y + pl[k * 4 + 2] * z + pl[k * 4 + 3]);
      c.seen = inside > -r;
      c.casts = inside > -(r + 5);
      // The other Tessariels are many and wander far: past 120 m one is a speck in the haze, past 50 m its shadow is a
      // smudge. Neither is worth skinning sixteen bodies into every cascade for.
      // (casts also decides skinning, so a hero in view keeps it; noShadow only leaves it out of the shadow passes.)
      c.noShadow = false;
      const d = Math.hypot(x - cam.x, z - cam.z);
      if (c.hero) {
        if (d > 120) { c.seen = false; c.casts = false; }
        if (d > 50) { c.noShadow = true; if (!c.seen) c.casts = false; }
      }
      // (Different distances each way, so a body standing right at the line doesn't flicker between the two.)
      c.far = d > (c.far ? 14 : 16);
      if (c.self) { c.casts = true; c.seen = !this.thirdNear; c.far = false; }
      // (Lisandra keeps her whole mesh: her mouth is shaded off it.)
      c.detail = c.trueLook ? 0 : this.bodyDetail(d, c.detail);
      // Skinned this frame? Always the first frame it's back, so it never shows a pose from before it left.
      const every = this.skinEvery(d);
      c.skin = c.casts && (!c.wasCast || every < 2 || (this.skinFrame + i) % every === 0);
      c.wasCast = c.casts;
    }
    // The townsfolk (src/gfx/folk.js).
    if (this.folk) this.folk.cull(cam, pl);
  }

  // The gems on the skull in the left hand, in its own pattern: one mesh, made when what's on it changes. An empty socket is a small black stone.
  skullGems() {
    const it = this.skullItem, src = this.sword('skull_gems');
    if (!it || !src.ready) return null;
    const spots = PATTERNS[it.pattern] || [], gems = it.gems || [];
    const key = `${it.pattern}:${gems.map((g) => `${g.kind}${g.grade}`).join()}`;
    const cache = this.gemMeshes || (this.gemMeshes = new Map());
    if (cache.has(key)) return cache.get(key);
    const { prim, alb, nrm, mr } = src, device = this.device, out = [];
    let verts = 0, tris = 0;
    spots.forEach((name, i) => {
      const cut = GEM_CUTS[gems[i]?.kind || 'empty'];
      out.push({ name, cut, gem: gems[i] }); verts += cut.v[1]; tris += cut.i[1];
    });
    const pos = new Float32Array(verts * 3), nr = new Float32Array(verts * 3), uv = new Float32Array(verts * 2), idx = new Uint32Array(tris);
    const gemSpots = [];
    let vAt = 0, iAt = 0;
    for (const { name, cut, gem } of out) {
      const A = SKULL_ANCHORS[name], size = gem ? 0.0118 + gem.grade * 0.0011 : 0.0085;
      const zx = A[3], zy = A[4], zz = A[5];
      let xx = zz, xz = -zx, xl = Math.hypot(xx, xz) || 1; xx /= xl; xz /= xl;
      const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
      const [v0, vn] = cut.v, [i0, inn] = cut.i;
      const cx = A[0] + zx * 0.0035, cy = A[1] + zy * 0.0035, cz = A[2] + zz * 0.0035;
      for (let v = 0; v < vn; v++) {
        const a = prim.pos[(v0 + v) * 3], b = prim.pos[(v0 + v) * 3 + 1], c = prim.pos[(v0 + v) * 3 + 2];
        const na = prim.nrm[(v0 + v) * 3], nb = prim.nrm[(v0 + v) * 3 + 1], nc = prim.nrm[(v0 + v) * 3 + 2], o = (vAt + v) * 3;
        pos[o] = cx + (xx * a + yx * b + zx * c) * size; pos[o + 1] = cy + (yy * b + zy * c) * size; pos[o + 2] = cz + (xz * a + yz * b + zz * c) * size;
        nr[o] = xx * na + yx * nb + zx * nc; nr[o + 1] = yy * nb + zy * nc; nr[o + 2] = xz * na + yz * nb + zz * nc;
        uv[(vAt + v) * 2] = prim.uv[(v0 + v) * 2]; uv[(vAt + v) * 2 + 1] = prim.uv[(v0 + v) * 2 + 1];
      }
      for (let k = 0; k < inn; k++) idx[iAt + k] = prim.idx[i0 + k] - v0 + vAt;
      vAt += vn; iAt += inn;
      if (gem) gemSpots.push({ x: A[0] + zx * 0.012, y: A[1] + zy * 0.012, z: A[2] + zz * 0.012, size, kind: gem.kind, phase: gemSpots.length * 1.9 });
    }
    const made = { pos, nrm: nr, uv, idx };
    this.onWeaponJoint(made, 0, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const h = { hand: this.makeSkinned([made], 1), gemSpots };
    device.queue.writeBuffer(h.hand.palette, 0, new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));
    h.ubo = device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    h.bg = device.createBindGroup({ layout: this.bglArmor, entries: [
      { binding: 0, resource: { buffer: h.ubo } }, { binding: 1, resource: alb.createView() }, { binding: 2, resource: nrm.createView() }, { binding: 3, resource: mr.createView() },
    ] });
    cache.set(key, h);
    return h;
  }

  // What never moves, into cascade c's map: the ground (in the far cascade only), the buildings, the trees, the rocks, the
  // cathedral's floor. (The cathedral's shell shades the green. What's under the ground has no sun to shade.)
  drawStillShadows(sp, c, last) {
    sp.setPipeline(this.pShTerrain);
    if (c === 2) {
      sp.setVertexBuffer(0, this.terrainVB);
      sp.setIndexBuffer(this.terrainIB, 'uint32');
      sp.drawIndexed(this.terrainCount);
    }
    sp.setPipeline(this.pShStatic);
    sp.setVertexBuffer(0, this.staticVB);
    sp.setIndexBuffer(this.staticIB, 'uint32');
    sp.drawIndexed(this.staticOpaque);
    sp.setPipeline(this.pShCut);
    sp.setBindGroup(1, this.shCutBG);
    sp.drawIndexed(this.staticTotal - this.staticOpaque, 1, this.staticOpaque);
    if (this.camNow.y > -6) this.pines.drawShadow(sp, c, last, this.shCutBG);
    if (this.camNow.y > -6 && this.rocksOn !== false) this.rocks.drawShadow(sp, last);
    sp.setPipeline(this.pShStatic);
    sp.setVertexBuffer(0, this.interior.tiles.VB);
    sp.setIndexBuffer(this.interior.tiles.IB, 'uint32');
    sp.drawIndexed(this.interior.tiles.cath);
  }

  // The draws that make a kept shadow map (src/gfx/shadowcache.js), in pieces of about a frame's worth each: what never
  // moves, round where its box was set.
  keptShadowJobs(k, b) {
    const c = k.c, last = c === this.tier.cascades - 1, [x, z] = b.at, lit = this.keptLit;
    const jobs = [(sp) => {
      if (c === 2) {
        sp.setPipeline(this.pShTerrain);
        sp.setVertexBuffer(0, this.terrainVB);
        sp.setIndexBuffer(this.terrainIB, 'uint32');
        sp.drawIndexed(this.terrainCount);
      }
      sp.setPipeline(this.pShStatic);
      sp.setVertexBuffer(0, this.staticVB);
      sp.setIndexBuffer(this.staticIB, 'uint32');
      sp.drawIndexed(this.staticOpaque);
      sp.setPipeline(this.pShCut);
      sp.setBindGroup(1, this.shCutBG);
      sp.drawIndexed(this.staticTotal - this.staticOpaque, 1, this.staticOpaque);
      sp.setPipeline(this.pShStatic);
      sp.setVertexBuffer(0, this.interior.tiles.VB);
      sp.setIndexBuffer(this.interior.tiles.IB, 'uint32');
      sp.drawIndexed(this.interior.tiles.cath);
    }];
    if (lit.under) return jobs;
    // (The full trees are most of the work: in four pieces, or two and the next ring's three in the far cascade.)
    this.pines.fillShadowSet(k.pines, x, z, last);
    (last ? [2, 3] : [4]).forEach((m, lod) => {
      const n = k.pines.n[lod];
      for (let i = 0; i < m; i++) {
        const a = Math.floor(n * i / m), e = Math.floor(n * (i + 1) / m);
        if (e > a) jobs.push((sp) => this.pines.drawShadowSet(sp, k.pines, this.shCutBG, lod, a, e));
      }
    });
    if (lit.rocks) {
      this.rocks.fillShadowSet(k.rocks, x, z, last);
      jobs.push((sp) => this.rocks.drawShadowSet(sp, k.rocks));
    }
    return jobs;
  }

  frame(cam, snap, vmSway, dt) {
    const { device, tier } = this;
    // Keep worker-owned memory out of WebGPU uploads. Safari versions differ in
    // whether writeBuffer accepts a bare SharedArrayBuffer. One reusable local
    // copy also gives all palette/wound uploads the same pose for this frame.
    // (Not all of it: half a megabyte out of shared memory every frame was the slowest line in this function. What every
    // frame reads of it, here; a body's pose and wounds when they're uploaded, below. The snapshot is this frame's own for
    // as long as the frame lasts, so the parts taken later are of the same tick.)
    const live = snap;
    if (typeof SharedArrayBuffer !== 'undefined' && snap.buffer instanceof SharedArrayBuffer) {
      if (this.uploadSnap?.length !== snap.length) this.uploadSnap = new Float32Array(snap.length);
      const up = this.uploadSnap;
      up.set(snap.subarray(0, CHARS_START));
      up.set(snap.subarray(SLIMES_START), SLIMES_START);
      for (let i = 0, co = CHARS_START; i < MAX_CHARS; i++, co += C_SIZE) {
        // (Whether it's there at all; and of one that is, its head, what it holds and its hero's card: not its pose, bleeds, wounds or masks.)
        if ((up[co + C.ACTIVE] = snap[co + C.ACTIVE]) < 0.5) continue;
        for (let k = co + 1; k < co + C_PALETTE; k++) up[k] = snap[k];
        for (let k = co + C_PROPS; k < co + C_BLEEDS; k++) up[k] = snap[k];
      }
      snap = up;
    }
    this.stage = 'resize';
    this.resize();
    this.stage = 'frame uniforms';
    this.writeFrame(cam, snap);
    this.tripo?.sync(snap);
    // How far off the coarse mesh's cells are LOD_PIXELS of a pixel, at this lens and this many pixels; and how many frames
    // apart the far bodies' poses are made, at the rate frames are coming.
    this.lodAt = LOD_CELL * this.H / (2 * Math.tan((cam.fov || WORLD_FOV) / 2)) / LOD_PIXELS;
    const skinSteps = this.skinSteps || (this.skinSteps = [1, 1]);
    this.frameDt = lerp(this.frameDt ?? 1 / 60, Math.min(Math.max(dt || 1 / 60, 0.002), 0.1), 0.05);
    skinSteps[0] = Math.max(1, Math.min(3, Math.floor(1 / SKIN_MID_HZ / this.frameDt + 0.2)));
    skinSteps[1] = Math.max(1, Math.min(6, Math.floor(1 / SKIN_FAR_HZ / this.frameDt + 0.2)));
    this.cullBodies(cam, snap);
    const time = this.frameData[O.CAM + 3];

    this.stage = 'character uploads';
    // Characters: palettes, wounds, weapons.
    const q = device.queue;
    const skinParams = this.skinParamData || (this.skinParamData = new Float32Array(8));
    const skinParamsU = this.skinParamU || (this.skinParamU = new Uint32Array(skinParams.buffer));
    for (let i = 0; i < this.chars.length; i++) {
      const c = this.chars[i];
      const co = CHARS_START + i * C_SIZE;
      if (snap[co + C.ACTIVE] < 0.5 || c.pending) continue;
      // Not skinned this frame, so not drawn either (seen needs casts): its palette, wounds and params wait until it is. (The wound
      // version is only taken once it's written, so a wound made off screen goes up the first frame it's back.) What it holds
      // still goes in: the knights' own swords and shields have no owner, so they're drawn whether the knight is or not.
      if (c.casts) {
        if (c.skin) {
          if (live !== snap) snap.set(live.subarray(co + C_PALETTE, co + C_PALETTE + c.jointCount * 8), co + C_PALETTE);
          q.writeBuffer(c.palette, 0, snap.buffer, snap.byteOffset + (co + C_PALETTE) * 4, c.jointCount * 32);
        }
        const ver = snap[co + C.GASH_VERSION];
        if (ver !== this.gashVersions[i]) {
          this.gashVersions[i] = ver;
          if (live !== snap) snap.set(live.subarray(co + C_GASH, co + C_SIZE), co + C_GASH);
          q.writeBuffer(c.ubo, 0, snap.buffer, snap.byteOffset + (co + C_GASH) * 4, 24 * 64);
          q.writeBuffer(c.ubo, 24 * 64, snap.buffer, snap.byteOffset + (co + C_MASKS) * 4, 256);
        }
        c.gashData[0] = snap[co + C.HEART];
        c.gashData[1] = c.armored || c.flesh ? 1 : 0.62;
        c.gashData[2] = c.steel ? 1 : c.heroLook || 0; // polished steel: its dark paint is shadow, not blackening; a hero's own look (materials.js)
        c.gashData[3] = c.flesh ? 1 : 0;
        if (c.jaw) {
          // Her lips part by mouth * gap, and the triangles across the line, rise tall at rest, stretch by that much: of
          // them in bind space, the share that's new is the dark between her lips.
          const J = c.jaw, d = c.gashData, m = Math.min(Math.max(snap[co + C_PROPS + 15] || 0, 0), 1), g = m * J.gap;
          d[4] = smoothstep(0.02, 0.12, m); d[5] = g * J.rise / (2 * (J.rise + g)); d[6] = J.front; d[7] = J.half;
          d[8] = J.y0; d[9] = J.k; d[10] = J.mid; d[11] = 0;
          q.writeBuffer(c.ubo, 24 * 64 + 256, d, 0, 12);
        } else q.writeBuffer(c.ubo, 24 * 64 + 256, c.gashData, 0, 4);
        if (c.skin) {
          skinParamsU[0] = c.count;
          skinParams[1] = 1; skinParams[2] = time; skinParamsU[3] = snap[co + C.CUT];
          skinParams[4] = 0.05; skinParams[5] = 0; skinParams[6] = 0.035;
          // (1: a still gown, no ripple of its own: Lisandra's, on the owner's word. 0 for everyone else.)
          skinParams[7] = c.stillSkirt ? 1 : 0;
          q.writeBuffer(c.params, 0, skinParams);
        }
      }
      if (c.propBase !== undefined) this.propData.set(snap.subarray(co + C_PROPS, co + C_PROPS + 16 * (c.propCount || 2)), c.propBase * 16);
      if (i < 2) {
        this.glintData = this.glintData || new Float32Array(4);
        this.glintData[0] = snap[co + C.GLINT];
        q.writeBuffer(this.props[i * 2].ubo, 0, this.glintData);
      }
    }
    q.writeBuffer(this.propInstances, 0, this.propData);
    // Where each sword and shield is, for leaving it out of the view or of a shadow cascade it can't reach. (A knight's
    // have no owner to go by, and were drawn into everything wherever they were.)
    for (let i = 0; i < this.props.length; i++) {
      const pr = this.props[i];
      if (pr.empty || pr.radius === undefined) continue;
      placeSphere(pr, this.propData, i * 16, pr.radius);
      pr.inView = inView(this.planes, pr.sx, pr.sy, pr.sz, pr.sr);
    }
    // (Everything skinned from here on, the townsfolk and the arms, keeps its ripple: the slot goes back to 0.)
    skinParams[7] = 0;
    if (this.folk) this.folk.upload(q, time, skinParams, skinParamsU);
    this.stage = 'viewmodel uploads';
    // View model: the arms the snapshot posed, and what's in them.
    const weapon = WEAPONS[snap[H.WEAPON] | 0] || null;
    this.vm = this.vms[weapon ? weapon.hands : 1];
    const held = weapon && weapon.id !== 'greatsword' ? this.sword(weapon.id) : null;
    this.held = held && held.ready ? held : null;
    this.holdingOld = !!weapon && weapon.id === 'greatsword';
    // The skull in the left hand, on the staff's arms, which have no left of their own.
    this.skullParts = this.skullParts || [];
    this.skullParts.length = 0;
    this.eyesOn = false;
    const surfArm = snap[H.SURF_ARM];
    if (this.skull && this.vm === this.vms[3] && surfArm < 1) {
      const arm = this.sword('skull_arm');     // (Whichever skull it is, for now.)
      if (arm.ready) {
        this.skullParts.push(arm); this.eyesOn = true;
        const gems = this.skullGems();
        if (gems) this.skullParts.push(gems);
      }
    }
    // The surfing hand: rigid, from SURFING.glb, up once the shield's on the ground.
    this.surfHand = null;
    if (surfArm > 0 && this.sword('surf_arm').ready) { this.surfHand = this.sword('surf_arm'); this.skullParts.push(this.surfHand); }
    // Use one arm and shield for both resting and guarding so the shield stays seated as it rises.
    this.shieldParts = this.shieldParts || [];
    this.shieldParts.length = 0;
    const surf = snap[H.SURF], shieldUp = snap[H.SHIELD_UP];
    const shield = this.offHand ? this.sword(this.offHand) : null;
    if (shield && surf < 0.5 && (!weapon || weapon.hands === 3 || shieldUp > 0)) {
      const arm = this.sword('shield_arm');
      if (arm.ready && shield.up?.ready) this.shieldParts.push(arm, shield.up);
    }
    // The rig still carries the shield during the jump onto it, until it becomes the board.
    this.onArm = shield?.ready && !this.shieldParts.length && this.vm === this.vms[1] && surf < 1.5 ? shield : null;
    q.writeBuffer(this.vm.palette, 0, snap.buffer, snap.byteOffset + VM_PALETTE * 4, this.vm.jointCount * 32);
    skinParamsU[0] = this.vm.count;
    skinParams[1] = 0; skinParams[2] = time; skinParamsU[3] = 0;
    q.writeBuffer(this.vm.params, 0, skinParams);
    const vmData = this.vmData || (this.vmData = new Float32Array(20));
    vmData.set(vmSway, 0);
    // A spell that wants the hands takes the sword down out of the way.
    const lowered = snap[H.VM_LOWER];
    vmData[13] -= lowered * 0.85; vmData[14] += lowered * 0.2;
    // (The old hands' own left arm would be a second one, so those stand aside for it. A staff's rig has none, and stays.)
    this.vmDown = lowered > 0.995 || (this.shieldParts.length > 0 && this.vm === this.vms[1]);
    vmData[16] = snap[H.BLOOD_SWORD];
    for (const part of this.vm.parts) {
      vmData[17] = part.isSword ? 1 : 0; vmData[18] = part.isSword ? 1 : 0; vmData[19] = 1;
      q.writeBuffer(part.ubo, 0, vmData);
    }
    if (this.held) {
      const h = this.held;
      const rigJoints = h.hand.jointCount - (h.extraJoints || 0);
      q.writeBuffer(h.hand.palette, 0, snap.buffer, snap.byteOffset + VM_PALETTE * 4, rigJoints * 32);
      if (h.dangles) {
        const wj = this.vm.weaponJoint, at = VM_PALETTE + wj * 8;
        const swing = h.dangles.step(dt, snap.subarray(at, at + 8), vmData, this.frameData.subarray(O.VMW, O.VMW + 16), time);
        q.writeBuffer(h.hand.palette, rigJoints * 32, swing);
        if (this.lastHeld !== h) h.dangles.reset();
      }
      this.lastHeld = h;
      skinParamsU[0] = h.hand.count;
      q.writeBuffer(h.hand.params, 0, skinParams);
      vmData[17] = 0; vmData[18] = weapon?.hands === 3 ? 0 : 1; vmData[19] = h.tip;
      q.writeBuffer(h.ubo, 0, vmData);
      if (h.fx) {
        const at = VM_PALETTE + this.vm.weaponJoint * 8;
        eyeAxes(snap.subarray(at, at + 8), h.fxBind, vmData, h.fxAt, h.fxAxes);
        h.fxAxes[3] = h.fxBare;
        q.writeBuffer(h.ubo, STAFF_AXES_OFFSET, h.fxAxes);
        // A cast flares the stone for a breath and lets it fall back (main.js sets castFlare on each cast).
        const age = (performance.now() - (this.castFlare ?? -1e9)) / 1000;
        FX_STRENGTH[0] = h.fx[11] * (1 + 1.0 * Math.exp(-age * 3.5));
        q.writeBuffer(h.ubo, STAFF_FX_OFFSET + 44, FX_STRENGTH);
      }
    }
    if (this.onArm) {
      const h = this.onArm;
      q.writeBuffer(h.hand.palette, 0, snap.buffer, snap.byteOffset + VM_PALETTE * 4, h.hand.jointCount * 32);
      skinParamsU[0] = h.hand.count;
      q.writeBuffer(h.hand.params, 0, skinParams);
      vmData[17] = 0; vmData[18] = 0; vmData[19] = 1;
      q.writeBuffer(h.ubo, 0, vmData);
    }
    // It breathes with you, a very little: arm and skull as one.
    const breath = this.breathData || (this.breathData = new Float32Array([0, 0, 0, 1, 0, 0, 0, 0]));
    breath[4] = Math.sin(time * 0.7) * 0.0015; breath[5] = Math.sin(time * 1.3) * 0.002;
    // What's held rigid rides the same stride as the hand on the staff (staff_walk: side to side once, up and down twice), in step with it.
    const stride = snap[H.CARRY_T] * Math.PI * 2, carryRate = 1 - Math.exp(-18 * dt);
    this.carryX = (this.carryX || 0) + (Math.sin(stride) * 0.008 * snap[H.CARRY_K] - (this.carryX || 0)) * carryRate;
    this.carryY = (this.carryY || 0) + (Math.sin(stride * 2) * 0.012 * snap[H.CARRY_K] - (this.carryY || 0)) * carryRate;
    breath[4] += this.carryX; breath[5] += this.carryY;
    breath[5] -= surfArm * 0.35;      // (the skull's arm going down; half, as this is a dual quaternion)
    // A one-handed spell lowers the staff and leaves the skull where it is.
    const skullLow = snap[H.SKULL_LOWER];
    this.skullDown = skullLow > 0.995;
    const vmY = vmData[13], vmZ = vmData[14], skullY = vmSway[13] - skullLow * 0.85, skullZ = vmSway[14] + skullLow * 0.2;
    for (const h of this.skullParts) {
      q.writeBuffer(h.hand.palette, 0, h === this.surfHand ? surfHandPose(snap[H.SURF_TILT], surfArm, time) : breath);
      skinParamsU[0] = h.hand.count;
      q.writeBuffer(h.hand.params, 0, skinParams);
      // (Negative: the spell hands' warm fill from the eye, so this arm is the same skin as the one that casts, and the skull, on less of it, doesn't go black at night.)
      vmData[17] = 0; vmData[18] = 0; vmData[19] = h === this.surfHand ? -1 : -0.5;   // (Less on the skull's arm: so much pale bone lights up the night.)
      vmData[13] = h === this.surfHand ? vmY : skullY; vmData[14] = h === this.surfHand ? vmZ : skullZ;
      q.writeBuffer(h.ubo, 0, vmData);
    }
    if (this.eyesOn) {
      const it = this.skullItem, skin = SKINS[it?.skin] || SKINS.bone;
      const sd = this.skinData || (this.skinData = new Float32Array(16));
      sd.set(skin.a, 0); sd[3] = skin.metal; sd.set(skin.b, 4); sd[7] = skin.rough; sd.set(skin.c, 8); sd[11] = skin.fx; sd.set(skin.glow, 12); sd[15] = skin.power;
      q.writeBuffer(this.skullParts[0].ubo, 80, sd);
      const gems = this.skullParts[1];
      if (gems?.gemSpots) {
        sd[11] = -1; sd[15] = 0.3 + (it?.rarity || 0) * 0.14;
        q.writeBuffer(gems.ubo, 80, sd);
      }
      this.skullEyes.setSkin(skin, gems?.gemSpots || null);
      vmData[13] = skullY; vmData[14] = skullZ;
      this.skullEyes.update(dt, cam, snap, vmData, breath);
    }
    vmData[13] = vmY; vmData[14] = vmZ;
    if (this.shieldParts.length) {
      const pal = this.shieldPal || (this.shieldPal = new Float32Array(8));
      shieldPose(pal, shieldUp, this.W / this.H);
      // The stride, moved in view space: half of it times the board's rotation, on the dual part.
      const hx = this.carryX, hy = this.carryY;
      pal[4] += hx * pal[3] + hy * pal[2]; pal[5] += hy * pal[3] - hx * pal[2]; pal[6] += hx * pal[1] - hy * pal[0]; pal[7] -= hx * pal[0] + hy * pal[1];
      for (const h of this.shieldParts) {
        q.writeBuffer(h.hand.palette, 0, pal);
        skinParamsU[0] = h.hand.count;
        q.writeBuffer(h.hand.params, 0, skinParams);
        vmData[17] = 0; vmData[18] = 0; vmData[19] = -1;   // (Arm and board in the one light: the back of a board is a dark texture, and would be a black shape in the view.)
        q.writeBuffer(h.ubo, 0, vmData);
      }
    }
    // The gauntlets, when they're worn and in: each rig's on that rig's palette.
    const set = this.gauntlets ? this.gauntletSet(this.gauntlets) : null;
    this.vmGloves = set && set.ready ? set.rigs.get(this.vm) || null : null;
    if (this.vmGloves) {
      const h = this.vmGloves;
      q.writeBuffer(h.hand.palette, 0, snap.buffer, snap.byteOffset + VM_PALETTE * 4, h.hand.jointCount * 32);
      skinParamsU[0] = h.hand.count;
      q.writeBuffer(h.hand.params, 0, skinParams);
      vmData[17] = 0; vmData[18] = 0; vmData[19] = 1;
      q.writeBuffer(h.ubo, 0, vmData);
    }
    // The spell hands, when they're up, with their own pose.
    this.spellVM = this.spellVMs[snap[H.SPELL_RIG] | 0] || null;
    if (this.spellVM) {
      const sv = this.spellVM;
      q.writeBuffer(sv.palette, 0, snap.buffer, snap.byteOffset + SPELL_PALETTE * 4, sv.jointCount * 32);
      skinParamsU[0] = sv.count;
      q.writeBuffer(sv.params, 0, skinParams);
      vmData.set(vmSway, 0);
      vmData[16] = 0; vmData[17] = 0; vmData[18] = 0; vmData[19] = -1;
      for (const part of sv.parts) q.writeBuffer(part.ubo, 0, vmData);
      this.spellGloves = set && set.ready ? set.rigs.get(sv) || null : null;
      if (this.spellGloves) {
        const h = this.spellGloves;
        q.writeBuffer(h.hand.palette, 0, snap.buffer, snap.byteOffset + SPELL_PALETTE * 4, h.hand.jointCount * 32);
        skinParamsU[0] = h.hand.count;
        q.writeBuffer(h.hand.params, 0, skinParams);
        q.writeBuffer(h.ubo, 0, vmData);
      }
    } else this.spellGloves = null;
    // What's lying on the ground.
    let nGround = 0;
    const drawn = this.drawnItems || (this.drawnItems = []);
    drawn.length = 0;
    this.openingStage?.append(drawn, snap, dt, cam);
    for (const g of this.ground) drawn.push(g);
    if (this.chests.length && !this.chestModels) this.chestModel();
    for (const g of this.chests) drawn.push(g);
    if (this.doorItems.length && !this.doorModels) this.doorModel();
    for (const g of this.doorItems) drawn.push(g);
    this.portalItems ||= this.makePortals();
    if (this.portalItems.length && !this.portalModels) this.portalModel();
    for (const g of this.portalItems) if ((g.at.x - cam.x) ** 2 + (g.at.z - cam.z) ** 2 < 600 ** 2) drawn.push(g);
    // The Test Dungeon's door, sliding up into its wall and down again (src/core/testhall.js), from wherever in the hall you are.
    if (inHall(cam.x, cam.z)) drawn.push(this.hallDoorItem(dt));
    this.stallItems ||= this.makeStalls();
    for (const g of this.stallItems) if (this.stallsOpen.has(g.id) === g.open) drawn.push(g);
    if (this.dishes) for (const g of this.dishes.values()) drawn.push(g);
    if (snap[H.SURF] > 1.5 && this.board.sword && !this.third) drawn.push(this.board);
    // In third person, what your body holds: the staff, the left hand's (the skull, or the shield on the arm), and the
    // shield on the back or under the feet. The sim says where (a matrix each, none if there's nothing: PlayerBody.hold).
    if (this.third && !this.thirdNear) {
      const at = CHARS_START + this.selfSlot * C_SIZE + C_PROPS, riding = snap[H.SURF] > 0.5;
      const ids = [this.mainHand, this.skull || this.board.sword, this.board.sword];
      for (let k = 0; k < 3; k++) {
        const g = this.selfItems[k];
        if (!ids[k] || !(snap[at + k * 16 + 15] > 0.5)) { g.slot = -1; continue; }
        g.sword = ids[k];
        g.glow = k === 2 && riding ? this.board.glow : null;
        g.mat.set(snap.subarray(at + k * 16, at + k * 16 + 16));
        drawn.push(g);
      }
    }
    for (const g of drawn) {
      let model = g.openingModel ?? g.mesh ?? (g.portal ? this.portalModels?.[g.portal] : g.door ? this.doorModels?.[g.piece] : g.ware ? this.ware(g.ware) : g.piece ? this.chestModels?.[g.piece] : g.coins ? this.coins() : g.stuff ? this.stuff(g.stuff) : g.gem ? this.gem(g.gem) : this.sword(g.sword).lying);
      if (model && g.glow) model = this.tinted(model, g.glow);
      g.model = model;
      if (!model || nGround >= MAX_GROUND) { g.slot = -1; continue; }
      g.slot = nGround;
      this.itemData.set(g.mat, nGround++ * 16);
      // (Where it lies, for the same: out of view it isn't drawn, and it's in no cascade its shadow can't reach.)
      if (model.radius !== undefined) { placeSphere(g, g.mat, 0, model.radius); g.inView = inView(this.planes, g.sx, g.sy, g.sz, g.sr); } else { g.sr = -1; g.inView = true; }
    }
    if (nGround) q.writeBuffer(this.itemInstances, 0, this.itemData, 0, nGround * 16);

    // Grass culling input.
    const g = this.grassData;
    const m = this.frameData.subarray(O.VP, O.VP + 16);
    g.set(m, 0);
    g[16] = cam.x; g[17] = cam.y; g[18] = cam.z; g[19] = 0;
    g[20] = this.grassN; g[21] = this.grassSpacing; g[22] = this.grassRadius; g[23] = this.grassNearRadius;
    g[24] = -GROUND_HALF; g[25] = -GROUND_HALF; g[26] = 1 / (2 * GROUND_HALF); g[27] = 0;
    g.set(this.planes, 28);
    if (!this.args7) { this.args7 = new Uint32Array([tier.lean ? 5 : 7, 0, 0, 0]); this.args3 = new Uint32Array([3, 0, 0, 0]); this.args6 = new Uint32Array([6, 0, 0, 0]); }
    // On a phone the grass is culled every other frame, and its frustum test has a margin that covers the difference.
    const cullGrass = this.grassOn && (!tier.lean || this.shadowFrame % 2 === 0);
    if (cullGrass) {
      q.writeBuffer(this.grassU, 0, g);
      q.writeBuffer(this.grassNearArgs, 0, this.args7);
      q.writeBuffer(this.grassFarArgs, 0, this.args3);
    }
    q.writeBuffer(this.pArgs, 0, this.args6);
    // On a phone what's landed is soaked in every fourth frame, together, so that pass costs a quarter as much.
    const bleeding = performance.now() < this.bloodUntil;
    const soakNow = bleeding && (!tier.lean || this.shadowFrame % 4 === 0);
    if (this.stainsDone !== false) q.writeBuffer(this.stainArgs, 0, this.args6);
    this.stainsDone = soakNow || !bleeding;
    this.portalFx(dt, cam);
    this.flushEmits();
    const ps = this.pSimData;
    ps[0] = Math.min(dt, 0.05) * snap[H.TIME_SCALE]; ps[1] = time;
    this.pSimU32 = this.pSimU32 || new Uint32Array(ps.buffer);
    this.pSimU32[2] = this.pCount;
    ps[4] = 0.5; ps[5] = 0.02; ps[6] = 0.35; ps[8] = -GROUND_HALF; ps[9] = -GROUND_HALF; ps[10] = 1 / (2 * GROUND_HALF);
    q.writeBuffer(this.pSimU, 0, ps);

    const enc = device.createCommandEncoder();
    const useTime = this.querySet && !this.queryBusy[this.queryI];
    this.stage = 'compute';
    // ---- compute ----
    const cp = enc.beginComputePass(useTime ? { timestampWrites: { querySet: this.querySet, beginningOfPassWriteIndex: 0 } } : undefined);
    cp.setPipeline(this.skinPipeline);
    for (let i = 0; i < this.chars.length; i++) {
      const c = this.chars[i];
      if (!c.skin) continue;
      cp.setBindGroup(0, c.bg);
      cp.dispatchWorkgroups(Math.ceil(c.count / 128));
    }
    if (this.folk) this.folk.compute(cp);
    cp.setBindGroup(0, this.vm.bg);
    cp.dispatchWorkgroups(Math.ceil(this.vm.count / 128));
    if (this.held) {
      cp.setBindGroup(0, this.held.hand.bg);
      cp.dispatchWorkgroups(Math.ceil(this.held.hand.count / 128));
    }
    for (const h of this.shieldParts) {
      cp.setBindGroup(0, h.hand.bg);
      cp.dispatchWorkgroups(Math.ceil(h.hand.count / 128));
    }
    for (const h of this.skullParts) {
      cp.setBindGroup(0, h.hand.bg);
      cp.dispatchWorkgroups(Math.ceil(h.hand.count / 128));
    }
    if (this.onArm) {
      cp.setBindGroup(0, this.onArm.hand.bg);
      cp.dispatchWorkgroups(Math.ceil(this.onArm.hand.count / 128));
    }
    if (this.spellVM) {
      cp.setBindGroup(0, this.spellVM.bg);
      cp.dispatchWorkgroups(Math.ceil(this.spellVM.count / 128));
    }
    for (const h of [this.vmGloves, this.spellGloves]) {
      if (!h) continue;
      cp.setBindGroup(0, h.hand.bg);
      cp.dispatchWorkgroups(Math.ceil(h.hand.count / 128));
    }
    if (cullGrass) {
      cp.setPipeline(this.pGrassCull);
      cp.setBindGroup(0, this.grassBG);
      cp.dispatchWorkgroups(Math.ceil(this.grassN * this.grassN / 64));
    }
    cp.setPipeline(this.pSim);
    cp.setBindGroup(0, this.pSimBG);
    cp.dispatchWorkgroups(Math.ceil(this.pCount / 256));
    cp.end();

    // ---- shadows, the far cascades on alternating frames ----
    const shadowData = this.shadowData || (this.shadowData = new Float32Array(64 * 5));
    for (let c = 0; c < tier.cascades; c++) shadowData.set(this.frameData.subarray(O.CASC + c * 16, O.CASC + c * 16 + 16), c * 64);
    const kept = this.shCache;
    if (kept) kept.slots(shadowData);
    q.writeBuffer(this.shadowU, 0, shadowData);
    // (The kept maps' next few draws, src/gfx/shadowcache.js: before they're copied in below.)
    if (kept) kept.encode(enc, this.shadowBG);
    for (let c = 0; c < tier.cascades; c++) {
      const isKept = kept && c > 0;
      if (isKept) { if (!kept.copy(enc, c, this.farNow, this.shadowTex)) continue; } else if (c === tier.cascades - 1 && !this.farNow) continue;
      const sp = enc.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: this.shadowViews[c], depthLoadOp: isKept ? 'load' : 'clear', depthClearValue: 1, depthStoreOp: 'store' } });
      sp.setBindGroup(0, this.shadowBG, [c * 256]);
      // A kept cascade has all that never moves already: only the rocks that tumble are left of it.
      if (!isKept) this.drawStillShadows(sp, c, c === tier.cascades - 1);
      else if (this.camNow.y > -6 && this.rocksOn !== false && this.rocks.pShadow) this.rocks.drawTumblers(sp, true);
      sp.setPipeline(this.pShStatic);
      if (c < 2) this.slimeBodies?.draw(sp);
      sp.setPipeline(this.pShSkin);
      // Only the bodies (and what they hold) that reach this cascade's square: the rest couldn't darken a texel of it
      // (shadowcull.js). Most bodies in view are far past the near cascades, so this halves the shadows' cost or better.
      // (And into the far cascade, whose texels are wider than the coarse mesh's cells, the coarse mesh. A phone's shadows
      // are all of its one coarse mesh.)
      const cm = this.frameData, co = O.CASC + c * 16;
      const coarse = tier.lean || (c === tier.cascades - 1 && !this.fullDetail);
      for (let i = 0; i < this.chars.length; i++) {
        const ch = this.chars[i];
        ch.inCascade = ch.casts && !ch.noShadow && inCascade(cm, co, ch.bx, ch.by, ch.bz, ch.br);
        if (!ch.inCascade) continue;
        sp.setVertexBuffer(0, ch.outBuf);
        if (coarse) { sp.setIndexBuffer(ch.lodIB, 'uint32'); sp.drawIndexed(ch.lodCount); } else { sp.setIndexBuffer(ch.IB, 'uint32'); sp.drawIndexed(ch.indices); }
      }
      if (this.folk) this.folk.shadow(sp, cm, co, coarse);
      sp.setPipeline(this.pShProp);
      sp.setVertexBuffer(1, this.propInstances);
      for (let i = 0; i < this.props.length; i++) {
        const pr = this.props[i];
        if (pr.empty || (pr.owner !== undefined && !this.chars[pr.owner].inCascade)) continue;
        if (pr.radius !== undefined && !inCascade(cm, co, pr.sx, pr.sy, pr.sz, pr.sr)) continue;
        sp.setVertexBuffer(0, pr.VB);
        sp.setIndexBuffer(pr.IB, 'uint32');
        sp.drawIndexed(pr.count, 1, 0, 0, i);
      }
      if (nGround) {
        sp.setVertexBuffer(1, this.itemInstances);
        for (const g of drawn) {
          if (g.slot < 0 || g.noShadow) continue;
          if (g.sr >= 0 && !inCascade(cm, co, g.sx, g.sy, g.sz, g.sr)) continue;
          sp.setVertexBuffer(0, g.model.VB);
          sp.setIndexBuffer(g.model.IB, 'uint32');
          sp.drawIndexed(g.model.count, 1, 0, 0, g.slot);
        }
      }
      sp.end();
    }

    // ---- blood soaking into the ground ----
    // (Only while there's blood in the air: a pass over the whole map costs a tiled GPU its full size, drawn on or not.)
    if (soakNow) {
      this.bloodView = this.bloodView || this.bloodMap.createView();
      const stainPass = enc.beginRenderPass({ colorAttachments: [{ view: this.bloodView, loadOp: 'load', storeOp: 'store' }] });
      stainPass.setPipeline(this.pStain);
      stainPass.setBindGroup(0, this.stainBG);
      stainPass.drawIndirect(this.stainArgs, 0);
      stainPass.end();
    }

    // (The first-person arms: not under the story's bars, nor in third person.)
    const noVM = this.hideVM || this.third;
    this.stage = 'world pass';
    // ---- the world ----
    const mp = enc.beginRenderPass(this.worldPass);
    mp.setBindGroup(0, this.frameBG);
    // Nearest first, so what's behind fails the depth test before it's lit: the arms, in front of everything, with their
    // own camera, and then the knights.
    if (!noVM) {
      mp.setViewport(0, 0, this.W, this.H, 0.97, 1);
      mp.setPipeline(this.pVM);
      if (this.spellVM) {
        const sv = this.spellVM;
        mp.setVertexBuffer(0, sv.outBuf);
        mp.setVertexBuffer(1, sv.sideVB);
        const bare = this.spellGloves?.bare;
        mp.setIndexBuffer(bare ? bare.IB : sv.IB, 'uint32');
        sv.parts.forEach((part, i) => {
          const r = bare ? bare.ranges[i] : part.range;
          mp.setBindGroup(1, part.bg);
          mp.drawIndexed(r.count, 1, r.first);
        });
        if (this.spellGloves) {
          const h = this.spellGloves;
          // (In a depth band behind the plates, a lower one, since nearer is greater here: a plate's shape doesn't follow the skin, and it's always the plate you see. Only a gap shows this.)
          mp.setViewport(0, 0, this.W, this.H, 0.96, 0.97);
          for (const r of bare.dark) { mp.setBindGroup(1, h.under[r.part]); mp.drawIndexed(r.count, 1, r.first); }
          mp.setViewport(0, 0, this.W, this.H, 0.97, 1);
          mp.setVertexBuffer(0, h.hand.outBuf);
          mp.setVertexBuffer(1, h.hand.sideVB);
          mp.setIndexBuffer(h.hand.IB, 'uint32');
          mp.setBindGroup(1, h.bg);
          mp.drawIndexed(h.hand.indices);
        }
      }
      mp.setVertexBuffer(0, this.vm.outBuf);
      mp.setVertexBuffer(1, this.vm.sideVB);
      const bare = this.vmGloves?.bare;
      mp.setIndexBuffer(bare ? bare.IB : this.vm.IB, 'uint32');
      if (!this.vmDown) this.vm.parts.forEach((part, i) => {
        if (part.isSword && !this.holdingOld) return;
        const r = bare ? bare.ranges[i] : part.range;
        mp.setBindGroup(1, part.bg);
        mp.drawIndexed(r.count, 1, r.first);
      });
      if (this.vmGloves && !this.vmDown) {
        const h = this.vmGloves;
        mp.setViewport(0, 0, this.W, this.H, 0.96, 0.97);
        for (const r of bare.dark) { mp.setBindGroup(1, h.under[r.part]); mp.drawIndexed(r.count, 1, r.first); }
        mp.setViewport(0, 0, this.W, this.H, 0.97, 1);
        mp.setVertexBuffer(0, h.hand.outBuf);
        mp.setVertexBuffer(1, h.hand.sideVB);
        mp.setIndexBuffer(h.hand.IB, 'uint32');
        mp.setBindGroup(1, h.bg);
        mp.drawIndexed(h.hand.indices);
      }
      if (this.held && !this.vmDown) {
        const h = this.held;
        if (h.fx) mp.setPipeline(this.pVMStaff);
        mp.setVertexBuffer(0, h.hand.outBuf);
        mp.setVertexBuffer(1, h.hand.sideVB);
        mp.setIndexBuffer(h.hand.IB, 'uint32');
        mp.setBindGroup(1, h.bg);
        mp.drawIndexed(h.hand.indices);
        if (h.fx) mp.setPipeline(this.pVM);
      }
      for (const h of this.shieldParts) {
        mp.setVertexBuffer(0, h.hand.outBuf);
        mp.setVertexBuffer(1, h.hand.sideVB);
        mp.setIndexBuffer(h.hand.IB, 'uint32');
        mp.setBindGroup(1, h.bg);
        mp.drawIndexed(h.hand.indices);
      }
      for (const h of this.skullParts) {
        if (h === this.surfHand ? this.vmDown : this.skullDown) continue;
        mp.setPipeline(h === this.surfHand ? this.pVM : this.pVMSkull);
        mp.setVertexBuffer(0, h.hand.outBuf);
        mp.setVertexBuffer(1, h.hand.sideVB);
        mp.setIndexBuffer(h.hand.IB, 'uint32');
        mp.setBindGroup(1, h.bg);
        mp.drawIndexed(h.hand.indices);
      }
      mp.setPipeline(this.pVM);
      if (this.onArm && !this.vmDown) {
        const h = this.onArm;
        mp.setVertexBuffer(0, h.hand.outBuf);
        mp.setVertexBuffer(1, h.hand.sideVB);
        mp.setIndexBuffer(h.hand.IB, 'uint32');
        mp.setBindGroup(1, h.bg);
        mp.drawIndexed(h.hand.indices);
      }
      if (this.eyesOn && !this.skullDown) this.skullEyes.draw(mp);
    }
    mp.setViewport(0, 0, this.W, this.H, 0, 0.96);
    this.spellfx.drawSolid(mp);
    const drawBody = (ch) => {
      mp.setBindGroup(1, ch.matBG);
      mp.setVertexBuffer(0, ch.outBuf);
      mp.setVertexBuffer(1, ch.sideVB);
      if (tier.lean ? ch.far : ch.detail) {
        mp.setIndexBuffer(ch.lodIB, 'uint32');
        mp.drawIndexed(ch.lodCount);
      } else {
        mp.setIndexBuffer(ch.IB, 'uint32');
        mp.drawIndexed(ch.indices);
      }
    };
    // Lisandra first, with the model-true shading. Then the armour shader goes back on for everyone else, in the same
    // order as ever, and stays on for the townsfolk, who draw with whatever is bound (folk.js draw).
    mp.setPipeline(this.pArmorTrue);
    for (const ch of this.chars) if (ch.seen && ch.trueLook) drawBody(ch);
    mp.setPipeline(this.pArmor);
    for (const ch of this.chars) if (ch.seen && !ch.trueLook) drawBody(ch);
    if (this.folk) this.folk.draw(mp, tier.lean);
    mp.setPipeline(this.pProp);
    mp.setVertexBuffer(1, this.propInstances);
    for (let i = 0; i < this.props.length; i++) {
      const pr = this.props[i];
      if (pr.empty || (pr.owner !== undefined && !this.chars[pr.owner].seen) || (pr.radius !== undefined && !pr.inView)) continue;
      mp.setBindGroup(1, pr.bg);
      mp.setVertexBuffer(0, pr.VB);
      mp.setIndexBuffer(pr.IB, 'uint32');
      mp.drawIndexed(pr.count, 1, 0, 0, i);
    }
    if (nGround) {
      mp.setPipeline(this.pItem);
      mp.setVertexBuffer(1, this.itemInstances);
      for (const g of drawn) {
        if (g.slot < 0 || !g.inView) continue;
        mp.setBindGroup(1, g.model.bg);
        mp.setVertexBuffer(0, g.model.VB);
        mp.setIndexBuffer(g.model.IB, 'uint32');
        mp.drawIndexed(g.model.count, 1, 0, 0, g.slot);
      }
    }
    const vis = visibility(this.interior.data.f0, this.camNow);
    drawOpaque(this, mp, this.interior, vis);
    // (From under the ground, none of the world above can be seen; but see visibility.)
    if (vis.world) {
    mp.setPipeline(this.pStatic);
    mp.setBindGroup(1, this.staticBG);
    mp.setVertexBuffer(0, this.staticVB);
    mp.setIndexBuffer(this.staticIB, 'uint32');
    mp.drawIndexed(this.staticOpaque);
    if (this.staticTotal > this.staticOpaque) {
      mp.setPipeline(this.pStaticCut);
      mp.drawIndexed(this.staticTotal - this.staticOpaque, 1, this.staticOpaque);
    }
    if (this.slimeBodies?.count) { mp.setPipeline(this.pStatic); this.slimeBodies.draw(mp); }
    // (Down the Warrens nothing of the land above can be seen: its rock is all there is.)
    if (!vis.warrens) {
    this.pines.draw(mp);
    if (this.rocksOn !== false) this.rocks.draw(mp, this.terrainBG);
    // Grass before the ground it stands on: its shader is next to nothing, and the ground's is the costliest there is.
    if (this.grassOn) {
      mp.setBindGroup(1, this.terrainBG);
      mp.setPipeline(this.pGrassNear);
      mp.setVertexBuffer(0, this.grassNear);
      mp.drawIndirect(this.grassNearArgs, 0);
      mp.setPipeline(this.pGrassFar);
      mp.setVertexBuffer(0, this.grassFar);
      mp.drawIndirect(this.grassFarArgs, 0);
    }
    mp.setPipeline(this.pTerrain);
    mp.setBindGroup(1, this.terrainBG);
    mp.setVertexBuffer(0, this.terrainVB);
    mp.setIndexBuffer(this.terrainIB, 'uint32');
    mp.drawIndexed(this.terrainCount);
    }
    }
    if (!vis.warrens) { mp.setPipeline(this.pSky); mp.draw(3); }
    drawGlow(this, mp, this.interior, vis.hall || vis.deep);
    this.openingStage?.drawGlow(mp);
    this.trail?.draw(mp);
    if (tier.lean) {
      mp.setPipeline(this.pDraw);
      mp.setBindGroup(1, this.pDrawBG);
      mp.drawIndirect(this.pArgs, 0);
      this.spellfx.draw(mp);
      if (this.trailCount >= 4 && !noVM) {
        q.writeBuffer(this.trailVB, 0, this.trailData, 0, this.trailCount * 4);
        mp.setViewport(0, 0, this.W, this.H, 0.97, 1);
        mp.setPipeline(this.pTrail);
        mp.setVertexBuffer(0, this.trailVB);
        mp.draw(this.trailCount);
      }
      if (this.eyesOn && !this.skullDown && !noVM) { mp.setViewport(0, 0, this.W, this.H, 0.97, 1); this.skullEyes.drawAura(mp); }
    }
    mp.end();

    // ---- screen-space passes ----
    if (this.useAO) {
      const ap = enc.beginRenderPass({ colorAttachments: [{ view: this.aoView, loadOp: 'clear', storeOp: 'store', clearValue: [1, 1, 1, 1] }] });
      ap.setPipeline(this.pAO); ap.setBindGroup(0, this.frameBG); ap.setBindGroup(1, this.depthBG); ap.draw(3); ap.end();
    }
    if (this.useShafts) {
      const sp = enc.beginRenderPass({ colorAttachments: [{ view: this.shaftView, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
      sp.setPipeline(this.pShafts); sp.setBindGroup(0, this.frameBG); sp.setBindGroup(1, this.depthBG); sp.draw(3); sp.end();
    }
    if (!tier.lean) {
      const pp = enc.beginRenderPass({ colorAttachments: [{ view: this.hdrView, loadOp: 'load', storeOp: 'store' }] });
      pp.setBindGroup(0, this.frameBG);
      if (this.useAO) { pp.setPipeline(this.pAOApply); pp.setBindGroup(1, this.aoApplyBG); pp.draw(3); }
      pp.setPipeline(this.pDraw);
      pp.setBindGroup(1, this.pDrawBG);
      pp.drawIndirect(this.pArgs, 0);
      this.spellfx.draw(pp);
      if (this.eyesOn && !this.skullDown && !noVM) this.skullEyes.drawAura(pp);
      if (this.trailCount >= 4 && !noVM) {
        q.writeBuffer(this.trailVB, 0, this.trailData, 0, this.trailCount * 4);
        pp.setPipeline(this.pTrail);
        pp.setVertexBuffer(0, this.trailVB);
        pp.draw(this.trailCount);
      }
      pp.end();
    }

    // ---- bloom ----
    const chain = this.useBloom ? this.bloomChain : [];
    for (let i = 0; i < chain.length; i++) {
      const b = enc.beginRenderPass({ colorAttachments: [{ view: chain[i].view, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
      b.setPipeline(this.pBloomDown); b.setBindGroup(0, this.bloomDownBG[i], [this.bloomSlots.down[i]]); b.draw(3); b.end();
    }
    for (let i = chain.length - 1, k = 0; i > 0; i--, k++) {
      const b = enc.beginRenderPass({ colorAttachments: [{ view: chain[i - 1].view, loadOp: 'load', storeOp: 'store' }] });
      b.setPipeline(this.pBloomUp); b.setBindGroup(0, this.bloomUpBG[k], [this.bloomSlots.up[k]]); b.draw(3); b.end();
    }

    this.stage = 'presentation';
    // ---- to the screen ----
    const cd = this.compData;
    cd[0] = snap[H.DMG_FLASH]; cd[1] = snap[H.WEAK]; cd[2] = time;
    cd[3] = tier.lean ? 0 : this.W < this.canvas.width * 0.92 ? 0.55 : 0.18;
    cd[4] = this.useShafts ? 1 : 0; cd[5] = this.useBloom ? 0.3 : 0; cd[6] = this.fade || 0;
    cd[7] = snap[H.HIT_DIR]; cd[8] = window.__reviewShots ? 0 : Math.max(0, 1 - snap[H.HIT_DIR_T] * 1.5);   // (tools/interior/walk.js photographs the place, not its own wounds)
    q.writeBuffer(this.compU, 0, cd);
    const fp = enc.beginRenderPass({
      colorAttachments: [{ view: this.context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }],
      ...(useTime ? { timestampWrites: { querySet: this.querySet, endOfPassWriteIndex: 1 } } : {}),
    });
    fp.setPipeline(this.pComposite); fp.setBindGroup(0, this.compBG); fp.draw(3); fp.end();
    if (useTime) {
      const slot = this.queryI;
      enc.resolveQuerySet(this.querySet, 0, 2, this.queryResolve, 0);
      enc.copyBufferToBuffer(this.queryResolve, 0, this.queryRead[slot], 0, 16);
      this.queryBusy[slot] = true;
      q.submit([enc.finish()]);
      this.queryRead[slot].mapAsync(GPUMapMode.READ).then(() => {
        const t = new BigInt64Array(this.queryRead[slot].getMappedRange());
        const ms = Number(t[1] - t[0]) / 1e6;
        if (ms > 0 && ms < 200) this.stats.gpuMs = lerp(this.stats.gpuMs, ms, 0.1);
        this.queryRead[slot].unmap();
        this.queryBusy[slot] = false;
      }).catch(() => {});
      this.queryI = (slot + 1) % 3;
    } else {
      q.submit([enc.finish()]);
    }
    // How long the GPU really took, in any browser. It's also how the game loop knows not to queue up more frames.
    this.stage = 'submitted';
    this.inFlight++;
    const sent = this.lastSent = performance.now();
    q.onSubmittedWorkDone().then(() => {
      this.inFlight--;
      const ms = performance.now() - sent;
      this.stats.busyMs = lerp(this.stats.busyMs, ms, 0.1);
      if (this.onBusy) this.onBusy(ms);
    });
  }
}
