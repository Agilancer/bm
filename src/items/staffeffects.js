// The living light in each staff's power point: which of the twenty kinds it is, and its colours. The light stays in the
// orb, gem or heart found by tools/staffeffects (src/items/staffcores.js); the shader is STAFF_FX in src/gfx/materials.js.
import { STAFFS2 } from './staffs2.js';
import { STAFF_GLOW } from './staffglow.js';

export const FX = {
  ember: 0, magma: 1, frost: 2, aurora: 3, storm: 4, void: 5, eye: 6, heartbeat: 7, sap: 8, spores: 9,
  sunflare: 10, moonphase: 11, starfield: 12, sand: 13, souls: 14, toxic: 15, prism: 16, phoenix: 17, runes: 18, wind: 19,
};

const C = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Each kind's second colour: the spark, the crack, the glint, the far edge of its light.
const SECOND = {
  ember: '#ffd27a', magma: '#ffe9a0', frost: '#f2faff', aurora: '#7affc8', storm: '#f4f8ff', void: '#ff6ae0', eye: '#fff0a0',
  heartbeat: '#ff9a8a', sap: '#ffb030', spores: '#dcff96', sunflare: '#fff6da', moonphase: '#ffffff', starfield: '#ffffff',
  sand: '#ffe9b0', souls: '#c8fff0', toxic: '#f2ff3a', prism: '#ffffff', phoenix: '#fff0a0', runes: '#ffffff', wind: '#eef6ff',
};

// What a staff's shot makes of its light, unless the staff says otherwise below.
const BY_SHOT = {
  sunburst: 'sunflare', crescent: 'moonphase', stasis: 'sand', singularity: 'void', prism: 'prism', leech: 'heartbeat',
  wyrm: 'magma', phoenix: 'phoenix', tesla: 'storm', souls: 'souls', thorns: 'toxic', starfall: 'starfield',
  judgement: 'runes', vine: 'sap', rime: 'frost', comet: 'ember', bloom: 'spores', shade: 'void', frost: 'aurora',
};

// A kind's own first colour, where its light isn't the staff's: acid is acid, whatever green the stone.
const FIRST = { toxic: '#9cf020', sap: '#e89a20' };

// Where the staff's own look asks for something else: [kind, first colour (default its glow), second colour].
const OWN = {
  // The first twelve.
  greenwood_staff: ['sap'], crystal_staff: ['frost'], skullhorn_staff: ['ember'], gnarled_crook: ['storm'],
  death_staff: ['souls'], fire_staff: ['ember'], ice_staff: ['frost'], life_staff: ['spores'],
  vine_staff: ['sap'], wind_staff: ['wind'],
  // The earth staff's stone is a yellow geode: amber, not lava.
  earth_staff: ['sap', '#ffa020', '#ffe080'],
  // Eyes look back.
  abyssal_eye: ['eye'], voidgaze_staff: ['eye'], eye_of_the_maelstrom: ['eye', null, '#ff3a6a'], umbral_eye: ['eye'],
  // Skies and stars.
  galaxy_coil: ['starfield', '#6a5cff', '#ff9af0'], wayfinder_staff: ['runes', '#cfe0ff'], celestial_orrery: ['runes', '#a890ff', '#e0d4ff'],
  moonstone_staff: ['moonphase', '#dfe8ff'], twilight_staff: ['starfield', '#7a40ff'], nightflame_staff: ['ember', '#a040ff', '#e8b8ff'],
  // Water and wind.
  riptide_staff: ['aurora', '#30c8ff', '#a0fff0'], whisper_spiral: ['wind', '#b070ff'], stormwood_staff: ['storm', '#4a9cff'],
  // Ice that's more northern sky than ice.
  glacier_spire: ['aurora'], icecrown_staff: ['aurora'], frostbanner_staff: ['aurora', '#5ab8ff'], cobalt_staff: ['frost'],
  driftwood_staff: ['frost'], sapphire_staff: ['frost', '#3a9cff'], frostwheel_staff: ['frost'], icefall_staff: ['frost'],
  shardstorm_staff: ['storm', '#7ab8ff'],
  // Hearts beat.
  dragonheart_staff: ['heartbeat', '#ff4a12', '#ffd070'], emerald_thornheart: ['heartbeat', '#3aff6a', '#d0ffb0'],
  verdant_heart: ['heartbeat', '#b0ff40', '#f0ffb0'], mossheart_staff: ['sap'],
  // Fire of the earth.
  lavaroot_staff: ['magma'], magma_heart: ['magma'], emberheart_staff: ['phoenix', '#ff5a10'], ember_staff: ['phoenix', '#ff6a10'],
  // The holy suns write.
  angels_dawn: ['runes', '#ffb838', '#ffe070'], sunpillar_staff: ['runes', '#ffd27a', '#ffe8b0'],
  // The dead.
  lichs_lantern: ['souls', '#30ffb8', '#a0fff0'], shroud_of_the_lich: ['souls', '#a05aff'], bonecrystal_staff: ['souls', '#b06aff'],
  ironcrystal_staff: ['void'], amethyst_staff: ['prism', '#b89aff'],
  // Growing things.
  oakroot_staff: ['spores', '#5aff6a'], greenmoon_staff: ['moonphase', '#5aff7a', '#d8ffd8'], forest_charm: ['sap'],
  vinewood_staff: ['spores', '#40ff7a'], mossgem_staff: ['toxic'],
  // Round 3: ten suns that looked alike, a green and a purple crowd. Each sun its own light; the greens and violets spread.
  dawnwheel_staff: ['sunflare', '#ff8a60', '#ffd0e0'], sunwheel_staff: ['runes', '#ffb020', '#ffe070'],
  gilded_sun_staff: ['heartbeat', '#ffb000', '#fff0a0'], sunrod: ['ember', '#ffc030', '#fff0b0'],
  sunbanner_staff: ['phoenix', '#ffa818', '#ffe8a0'], dawnspire_staff: ['prism', '#ffd0a0'], sunspoke_staff: ['sunflare', null, '#ffe8a0'],
  seraphs_coil: ['phoenix', '#ffd070', '#fff0c0'],
  druids_reliquary: ['spores', '#ffd860', '#fff0a0'], wildcage_staff: ['spores', '#40ffd0', '#c8fff0'],
  verdant_oath: ['spores', '#c8ff60', '#f0ffc0'], dark_staff: ['void', '#a040ff', '#ff80f0'],
  // The old crook's brass ball on its pin: a gold whirl, the crook's own spiral turning inside it.
  old_crook: ['wind', '#ff9a20', '#ffe8a0'],
};

// tier -> how strong (the first twelve count as common).
const TIER = Object.fromEntries(STAFFS2.map((s) => [s.id, s.tier]));

// id -> [kind, r, g, b (0..1, linear-ish), r2, g2, b2, strength]
export function staffEffect(id) {
  const shot = STAFFS2.find((s) => s.id === id)?.shot;
  const own = OWN[id] || [BY_SHOT[shot] || 'ember'];
  const kind = own[0];
  const a = own[1] ? C(own[1]) : FIRST[kind] ? C(FIRST[kind]) : STAFF_GLOW[id] || [255, 56, 6];
  const b = C(own[2] || SECOND[kind]);
  const tier = TIER[id] ?? 1;
  return [FX[kind], ...a.map((v) => v / 255), ...b.map((v) => v / 255), 0.8 + 0.12 * tier];
}

export const FX_NAMES = Object.keys(FX);

// Staffs whose light takes whatever is in its sphere: no stone at all, only carving, or a stone painted another colour than
// its light (the lich's lantern: violet glass, cyan-green souls; the magma heart: a dark crust over where its heart burns).
export const BARE = new Set(['gnarled_crook', 'old_crook', 'wayfinder_staff', 'lichs_lantern', 'magma_heart']);
