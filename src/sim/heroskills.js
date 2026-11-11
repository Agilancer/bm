// The other Tessariels' moves past their first ones (src/sim/hero.js has those): eight and more for every class, after how
// the same classes play in Velscour (the isometric game: src/data/skilldata.js there). What they share is here too: things
// thrown that home, bounce and come back; things that turn round a hero; which move suits the moment (chooseSkill); what a
// class does between its blows (classRoutine: a rogue in and out, a ninja round and round); and the bards' lutes.
//
// A move is a line in MORE_SKILLS (when it may be used) and a function in CAST (what it does). To add one, add both; give
// it a `lvl` to come by, and use rank(h) for what grows with the hero's level. Everything drawn is made of the spell
// shapes (src/sim/spells.js FX, src/gfx/spellfx.js): BOX and SHARD for hammers, stars and boomerangs, GLYPH for notes,
// sound, crescents and wings.
//
// They grow with their level, as you do with yours (a hired party's follows yours: src/ui/party.js). Each move is come by
// at a level (lvl), and its numbers go up with the hero's rank, one every five levels: more hammers round the paladin, more
// shields round the lancer, more bounces, wider novas.
import { MOVE_KEYS } from '../core/heroes.js';
import { EV } from '../core/layout.js';
import { clamp, wrapAngle } from '../core/math.js';
import { ELEM, FX, GLYPHS, MAT } from './spells.js';

const { FIRE, FROST, ARCANE, STORM, HEAL, LIGHT, DRAIN, VOID, SPIRIT, POISON } = ELEM;
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dirTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// What src/sim/hero.js lends this file (it imports this one, so they're handed over once it's loaded).
let E = null;
export const install = (env) => { E = env; };
// What only the render thread can do for a move (EV.HERO_FX; GameView.heroFx in src/main.js).
export const HFX = { BLOOD: 1, PLUCK: 2, SPARKS: 3, CHIME: 4, THUD: 5 };

// A hero's rank: one at first, another every five levels, six at most.
export const rank = (h) => clamp(1 + Math.floor(h.person.level / 5), 1, 6);
// The colour a boomerang knight's rangs burn, by the pair they carry; a dragoon's spear the same.
const TINT = { fire: FIRE, blue: FROST, verdant: HEAL, lion: LIGHT, spiked: SPIRIT, wooden: STORM, red: FIRE, frost: FROST, icefang: FROST, goldcross: LIGHT, whitegold: LIGHT, crimson: DRAIN, pennon: STORM };
export const tintOf = (h) => { const id = h.person.kit.main || ''; for (const k in TINT) if (id.startsWith(k)) return TINT[k]; return SPIRIT; };
const RAINBOW = [FIRE, LIGHT, HEAL, SPIRIT, FROST, ARCANE, STORM, DRAIN];

// ---- when each may be used -------------------------------------------------------------------------------------------
// key, cd (seconds), range (to the foe's edge, metres), lvl (the level it's come by at), and what it is, for chooseSkill:
// line (needs a clear line), move (takes the hero off his feet or his place: not from a post), aoe (better the more there
// are), gap (closes one), finish (for what's nearly dead), def (for when he's hurt), big (kept for what's worth it), crowd
// (that many about the foe), w (how much it's liked), need (h, m, x) for anything else, name (as the Company's books have it).
export const MORE_SKILLS = {
  paladin: [
    { key: 'zeal', name: 'Zeal', cd: 6, range: [0, 1.9], lvl: 2 },
    { key: 'blessed_shield', name: 'Blessed Shield', cd: 9, range: [3, 14], lvl: 3, line: true, w: 1.4 },
    { key: 'holy_nova', name: 'Holy Nova', cd: 12, range: [0, 3.2], lvl: 4, aoe: true, crowd: 2 },
    { key: 'crusaders_charge', name: "Crusader's Charge", cd: 10, range: [4, 10], lvl: 5, line: true, gap: true, move: true },
    { key: 'fist_of_heavens', name: 'Fist of the Heavens', cd: 11, range: [2, 14], lvl: 6, aoe: true },
    { key: 'divine_shield', name: 'Divine Shield', cd: 22, lvl: 7, w: 2.5, need: (h, m, x) => !!lowest(x.w, h, 12, 0.45) },
    { key: 'heavens_fury', name: "Heaven's Fury", cd: 16, range: [2, 13], lvl: 8, aoe: true, crowd: 2 },
    { key: 'judgment_beam', name: 'Judgment Beam', cd: 14, range: [3, 12], lvl: 9, line: true },
    { key: 'solar_hammer', name: 'Solar Hammer', cd: 20, range: [0, 12], lvl: 12, big: true, w: 1.5 },
    { key: 'hammer_storm', name: 'Storm of Hammers', cd: 24, range: [0, 12], lvl: 15, aoe: true, crowd: 3, big: true },
  ],
  lancer: [
    { key: 'lance_barrage', name: 'Lance Barrage', cd: 6, range: [0, 2.8], lvl: 2 },
    { key: 'tower_shields', name: 'Tower Shields', cd: 18, range: [0, 7], lvl: 3, w: 2.2, need: (h) => !h.orbiting },
    { key: 'sweeping_cleave', name: 'Sweeping Cleave', cd: 8, range: [0, 2.6], lvl: 4, aoe: true },
    { key: 'shield_throw', name: 'Shield Throw', cd: 10, range: [3, 13], lvl: 5, line: true, w: 1.3 },
    { key: 'sunspear', name: 'Sunspear', cd: 9, range: [4, 16], lvl: 6, line: true },
    { key: 'bulwark_nova', name: 'Bulwark Nova', cd: 14, range: [0, 3.5], lvl: 7, aoe: true, crowd: 2 },
    { key: 'lance_of_light', name: 'Lance of Light', cd: 12, range: [2, 11], lvl: 8, line: true },
    { key: 'valiant_leap', name: 'Valiant Leap', cd: 13, range: [4, 11], lvl: 9, line: true, gap: true, move: true },
    { key: 'phalanx_rush', name: 'Phalanx Rush', cd: 12, range: [2, 9], lvl: 10, line: true, move: true, aoe: true },
    { key: 'spear_wall', name: 'Spear Wall', cd: 15, range: [0, 6], lvl: 12, aoe: true, crowd: 2 },
    { key: 'charge_of_the_order', name: 'Charge of the Order', cd: 26, range: [2, 12], lvl: 16, aoe: true, big: true },
  ],
  archer: [
    { key: 'disengage', name: 'Disengage', cd: 9, lvl: 1, move: true, w: 2.4, need: (h, m, x) => x.gap < 3.2 },
    { key: 'piercing_arrow', name: 'Piercing Arrow', cd: 6, range: [4, 20], lvl: 2, line: true },
    { key: 'split_shot', name: 'Split Shot', cd: 7, range: [6, 20], lvl: 3, line: true, aoe: true },
    { key: 'guided_arrow', name: 'Guided Arrow', cd: 7, range: [4, 22], lvl: 4 },
    { key: 'explosive_arrow', name: 'Explosive Arrow', cd: 10, range: [5, 20], lvl: 5, line: true, aoe: true },
    { key: 'frost_arrow', name: 'Frost Arrow', cd: 11, range: [5, 20], lvl: 6, line: true, aoe: true },
    { key: 'sniper_shot', name: 'Sniper Shot', cd: 12, range: [8, 24], lvl: 7, line: true, big: true, w: 1.4 },
    { key: 'chain_shot', name: 'Constellation Shot', cd: 10, range: [4, 20], lvl: 9, line: true, aoe: true, crowd: 2 },
    { key: 'arrow_storm', name: 'Arrow Storm', cd: 22, range: [5, 20], lvl: 12, line: true, aoe: true, crowd: 3, big: true },
    { key: 'black_hole_arrow', name: 'Black Hole Arrow', cd: 24, range: [5, 18], lvl: 15, line: true, aoe: true, crowd: 3, big: true },
  ],
  rogue: [
    { key: 'backflip', name: 'Backflip', cd: 8, lvl: 1, move: true, w: 1.8, need: (h, m, x) => x.gap < 2.4 && (x.hpF < 0.7 || h.combo >= 3 || x.onMe) },
    { key: 'flip_strike', name: 'Flip Strike', cd: 7, range: [2.5, 9], lvl: 2, line: true, gap: true, move: true, w: 1.5 },
    { key: 'fan_of_knives', name: 'Fan of Knives', cd: 9, range: [0, 7], lvl: 4, aoe: true },
    { key: 'rupture', name: 'Rupture', cd: 10, range: [0, 1.8], lvl: 5, w: 1.4 },
    { key: 'whirling_blades', name: 'Whirling Blades', cd: 9, range: [0, 2.4], lvl: 6, aoe: true },
    { key: 'smoke_bomb', name: 'Smoke Bomb', cd: 16, lvl: 7, def: true, need: (h, m, x) => x.near >= 2 || x.hpF < 0.5 },
    { key: 'shadow_dance', name: 'Shadow Dance', cd: 14, range: [0, 9], lvl: 9, aoe: true, crowd: 2, move: true, w: 1.5 },
    { key: 'death_from_above', name: 'Death from Above', cd: 15, range: [3, 10], lvl: 11, line: true, gap: true, move: true, w: 1.4 },
    { key: 'eviscerate', name: 'Eviscerate', cd: 12, range: [0, 1.8], lvl: 13, finish: true, w: 1.6, need: (h, m, x) => x.mhp < 0.4 || x.w.dots.some((d) => d.m === m) },
  ],
  ninja: [
    { key: 'twin_fangs', name: 'Twin Fangs', cd: 5, range: [0, 1.7], lvl: 1 },
    { key: 'fire_star', name: 'Fire Star', cd: 7, range: [3, 15], lvl: 2, line: true, aoe: true },
    { key: 'spin_kick', name: 'Spin Kick', cd: 7, range: [0, 1.8], lvl: 3, aoe: true },
    { key: 'star_storm', name: 'Star Storm', cd: 12, range: [2, 12], lvl: 3, line: true, move: true, w: 1.8 },
    { key: 'frost_star', name: 'Frost Stars', cd: 8, range: [3, 15], lvl: 4, line: true },
    { key: 'whirlwind', name: 'Whirlwind', cd: 9, range: [0, 2.6], lvl: 5, aoe: true, move: true },
    { key: 'storm_star', name: 'Storm Star', cd: 9, range: [3, 15], lvl: 6, line: true, aoe: true },
    { key: 'rising_dragon', name: 'Rising Dragon', cd: 10, range: [0, 2], lvl: 7, move: true, w: 1.3 },
    { key: 'spirit_star', name: 'Spirit Star', cd: 10, range: [3, 16], lvl: 8 },
    { key: 'kick_chain', name: 'Kick Chain', cd: 12, range: [2, 8], lvl: 9, line: true, crowd: 2, aoe: true, move: true },
    { key: 'substitution', name: 'Substitution', cd: 18, lvl: 10, def: true, move: true, need: (h, m, x) => x.hpF < 0.5 && x.hitNow },
    { key: 'giant_shuriken', name: 'Great Shuriken', cd: 14, range: [3, 14], lvl: 12, line: true, aoe: true, w: 1.4 },
  ],
  dragoon: [
    { key: 'lance_flurry', name: 'Lance Flurry', cd: 6, range: [0, 2.8], lvl: 2 },
    { key: 'dragon_dive', name: 'Dragon Dive', cd: 7, range: [3, 12], lvl: 3, line: true, gap: true, move: true, leap: true, w: 1.5 },
    { key: 'spearstep', name: 'Spearstep', cd: 8, range: [3, 9], lvl: 3, line: true, gap: true, move: true },
    { key: 'spiral_lance', name: 'Spiral Lance', cd: 8, range: [3, 15], lvl: 4, line: true },
    { key: 'sweeping_lance', name: 'Sweeping Lance', cd: 8, range: [0, 2.8], lvl: 5, aoe: true },
    { key: 'comet_dive', name: 'Comet Dive', cd: 9, range: [4, 14], lvl: 6, line: true, gap: true, move: true, leap: true, w: 1.5 },
    { key: 'lance_barrier', name: 'Lance Barrier', cd: 16, range: [0, 6], lvl: 8, need: (h) => !h.orbiting },
    { key: 'storm_dive', name: 'Storm Dive', cd: 10, range: [3, 13], lvl: 9, line: true, gap: true, move: true, leap: true, aoe: true, w: 1.5 },
    { key: 'spear_rain', name: 'Spear Rain', cd: 16, range: [3, 13], lvl: 10, aoe: true, crowd: 2 },
    { key: 'dragon_breath', name: 'Dragon Breath', cd: 15, range: [0, 4.4], lvl: 12, aoe: true },
    { key: 'dragonfall', name: 'Dragonfall', cd: 18, range: [3, 14], lvl: 14, line: true, move: true, leap: true, big: true, w: 1.6 },
    { key: 'heavens_rain', name: "Heaven's Rain", cd: 28, range: [0, 13], lvl: 17, aoe: true, big: true },
  ],
  boomerang: [
    { key: 'cross_cut', name: 'Cross Cut', cd: 6, range: [2, 9], lvl: 1, line: true, need: (h) => !h.flight },
    { key: 'energy_rang', name: 'Energy Boomerang', cd: 7, range: [3, 12], lvl: 2, line: true, w: 1.3 },
    { key: 'wind_slash', name: 'Wind Slash', cd: 6, range: [1, 9], lvl: 3, line: true },
    { key: 'chakram', name: 'Chakram', cd: 9, range: [3, 12], lvl: 4, line: true, aoe: true },
    { key: 'orbiting_rangs', name: 'Orbiting Boomerangs', cd: 16, range: [0, 6], lvl: 5, need: (h) => !h.orbiting },
    { key: 'homing_salvo', name: 'Homing Salvo', cd: 14, range: [3, 14], lvl: 6, line: true, w: 1.8 },
    { key: 'tempest_dash', name: 'Tempest Dash', cd: 11, range: [3, 10], lvl: 7, line: true, move: true, aoe: true },
    { key: 'blade_ring', name: 'Blade Ring', cd: 13, range: [0, 5], lvl: 8, aoe: true, crowd: 2 },
    { key: 'bladestorm', name: 'Bladestorm Dance', cd: 15, range: [0, 5], lvl: 9, aoe: true, crowd: 2, move: true },
    { key: 'golden_boomerang', name: 'Golden Boomerang', cd: 18, range: [3, 13], lvl: 10, line: true, big: true, w: 2 },
    { key: 'razor_tornado', name: 'Razor Tornado', cd: 17, range: [2, 11], lvl: 12, aoe: true, crowd: 2 },
  ],
  bard: [
    { key: 'power_chord', name: 'Power Chord', cd: 7, range: [2, 11], lvl: 2, line: true },
    { key: 'fan_of_notes', name: 'Fan of Notes', cd: 8, range: [0, 8], lvl: 3, line: true, aoe: true },
    { key: 'shockwave_riff', name: 'Shockwave Riff', cd: 9, range: [0, 9], lvl: 3, line: true, aoe: true },
    { key: 'echo', name: 'Echo', cd: 8, range: [3, 13], lvl: 4, line: true, aoe: true },
    { key: 'dancing_notes', name: 'Dancing Notes', cd: 16, range: [0, 7], lvl: 5, need: (h) => !h.orbiting },
    { key: 'bass_drop', name: 'Bass Drop', cd: 12, range: [3, 13], lvl: 6, aoe: true },
    { key: 'swashbuckle', name: 'Swashbuckle', cd: 12, range: [2, 8], lvl: 6, line: true, move: true },
    { key: 'resonance_beam', name: 'Resonance Beam', cd: 13, range: [3, 12], lvl: 7, line: true },
    { key: 'lullaby', name: 'Lullaby', cd: 18, range: [0, 9], lvl: 8, aoe: true, crowd: 2 },
    { key: 'sonic_boom', name: 'Sonic Boom', cd: 15, range: [0, 4.5], lvl: 9, aoe: true, crowd: 2 },
    { key: 'crescendo', name: 'Crescendo', cd: 11, range: [4, 15], lvl: 10, line: true },
    { key: 'grand_finale', name: 'The Grand Finale', cd: 26, range: [0, 12], lvl: 14, aoe: true, big: true },
  ],
};
// The first moves' leanings (src/sim/hero.js SKILLS), in the same words.
const FIRST = {
  charge: { gap: true, move: true }, consecration: { aoe: true }, rain_of_arrows: { aoe: true }, volley: { aoe: true }, shadow_step: { move: true }, vanish: { move: true },
  leaping_kick: { gap: true, move: true }, jump: { move: true, leap: true, w: 1.3 }, spear_barrage: { w: 6 }, blessed_hammers: { w: 1.6, need: (h) => !h.hammersUp }, shield_wall: { def: true },
};
export const LINE_MORE = new Set(Object.values(MORE_SKILLS).flat().filter((s) => s.line).map((s) => s.key));
// Every move there is with its name and level, for the Company's books (src/ui/party.js).
export const movesOf = (cls, level) => (MORE_SKILLS[cls] || []).filter((s) => s.lvl <= level);

// ---- finding things --------------------------------------------------------------------------------------------------

function nearest(w, x, z, r, skip, from) {
  let best = null, bd = r;
  for (const m of w.targets) {
    if (!E.fightable(m) || skip?.has(m)) continue;
    const d = Math.hypot(m.x - x, m.z - z) - E.radiusOf(m);
    if (d < bd && (!from || w.sim.world.sees(from[0], from[1], from[2], m.x, m.y + 1.1, m.z))) { bd = d; best = m; }
  }
  return best;
}
function foesIn(w, x, z, r) { return w.targets.filter((m) => E.fightable(m) && Math.hypot(m.x - x, m.z - z) < r + E.radiusOf(m)); }
// Whoever of his own side near him is lowest, below a share of their life: a hero, or you.
function lowest(w, h, r, below) {
  let who = null, low = below;
  const p = w.sim.player;
  for (const o of [...w.heroes, p]) {
    if (o.dead || o.hidden || o.broker || Math.hypot(o.x - h.x, o.z - h.z) > r) continue;
    if (o !== p && !h.hired !== !o.hired && o !== h) continue;
    const f = o.hp / o.maxHp;
    if (f < low) { low = f; who = o; }
  }
  return who;
}
const sideOf = (h) => (h.hired ? [...w0(h).company.members, w0(h).sim.player] : h.party ? [...h.party.members] : [h]);
const w0 = (h) => h.simRef.heroWorld;
const hfx = (sim, code, x, y, z, a = 0, b = 0, c = 0) => sim.event(EV.HERO_FX, code, x, y, z, a, b, c);
// Blood thrown off a foe, the way (ux, uz): the render thread's gout, and red streaks and drops of the sim's own.
function blood(sim, m, ux, uz, k = 0.6) {
  if (Math.hypot(sim.player.x - m.x, sim.player.z - m.z) > 60) return;
  hfx(sim, HFX.BLOOD, m.x, m.y + 1.1, m.z, ux, k, uz);
  const c = sim.casting, n = 3 + Math.round(k * 4);
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(ux, uz) + rand(-0.7, 0.7), up = rand(0.3, 1.1), L = Math.hypot(1, up), v = rand(0.6, 1.5);
    c.burst(FX.TRAIL, DRAIN, m.x, m.y + 1.1, m.z, 0.05, 0.02, rand(0.25, 0.45), { ax: Math.sin(a) / L, ay: up / L, az: Math.cos(a) / L, len: v });
    c.burst(FX.GLYPH, DRAIN, m.x + Math.sin(a) * v, m.y + 1.1 + up * v * 0.5, m.z + Math.cos(a) * v, 0.07, 0.13, rand(0.3, 0.5), { ay: 0, len: rand(0, TAU), extra: GLYPHS.DROP });
  }
}
// Off its stride: the dead reel; anything is held a moment (a stun the way your own spells stun).
function daze(sim, w, m, secs, by) {
  w.stun(m, secs, by);
  if (E.radiusOf(m) <= 1.2 && !m.boss) { const a = sim.casting.affOf(m); a.stun = Math.max(a.stun, secs * 0.6); }
}
const slow = (sim, m, secs) => { const a = sim.casting.affOf(m); a.slow = Math.max(a.slow, secs); };
const taunt = (sim, h, m, secs = 5) => { m.tauntBy = h; m.tauntT = sim.time + secs; m.heroFoe = h; m.heroFoeT = sim.time; };
function sayMove(h, sim, key, chance = 0.35) { const i = MOVE_KEYS.indexOf(key); if (i >= 0 && h.r() < chance) h.say(sim, 'class_skill', -1, -1, -1, i); }
// Somewhere to stand `r` from a point the way `a`, out of walls; null if there's no room that way.
function spotAt(h, sim, x, z, a, r) {
  const room = sim.world.clearance(x, z, Math.sin(a), Math.cos(a), r, 0.45);
  if (room < Math.min(r, 1.6)) return null;
  const k = Math.max(0, Math.min(r, room) - 0.3);
  return h.clearSpot(sim, x + Math.sin(a) * k, z + Math.cos(a) * k);
}

// ---- things drawn ----------------------------------------------------------------------------------------------------
// (c: sim.casting. fx(shape, elem, x, y, z, size, ax, ay, az, len, alpha, light, lightR, age, seed, extra).)

// A war hammer, tumbling end over end in the upright plane through `yaw`: gold head, wood haft, lit by its element.
export function hammer3(c, x, y, z, yaw, spin, size, elem = LIGHT, glow = 1, light = 0) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), cs = Math.cos(spin), sn = Math.sin(spin);
  const hx = fx * sn, hy = cs, hz = fz * sn;             // up the haft
  const px = fx * cs, py = -sn, pz = fz * cs;            // along the head
  c.fx(FX.BOX, elem, x, y, z, 0.03 * size, hx, hy, hz, 0.62 * size, 0.25 * glow, 0, 0, MAT.WOOD, 0, 0.03 * size);
  const tx = x + hx * 0.3 * size, ty = y + hy * 0.3 * size, tz = z + hz * 0.3 * size;
  c.fx(FX.BOX, elem, tx, ty, tz, 0.105 * size, px, py, pz, 0.4 * size, glow, light, light ? 3 + size * 2 : 0, MAT.GOLD, 0, 0.105 * size);
  c.fx(FX.BOX, elem, tx, ty, tz, 0.118 * size, px, py, pz, 0.1 * size, glow * 1.6, 0, 0, MAT.LIGHT, 0, 0.118 * size);
  if (glow > 0.3) c.fx(FX.ORB, elem, tx, ty, tz, 0.2 * size, 0, 1, 0, 0, 0.5 * glow);
}
// A throwing star: `n` shards crossed, turning in a plane. flat: lying level; else upright, in the plane through `yaw`.
export function star3(c, x, y, z, spin, size, elem, mat = MAT.STEEL, n = 2, glow = 1, yaw = 0, flat = true) {
  for (let i = 0; i < n; i++) {
    const a = spin + i * Math.PI / n;
    if (flat) c.fx(FX.SHARD, elem, x, y, z, size * 0.3, Math.sin(a), 0, Math.cos(a), size * 2, glow, 0, 0, mat, 0);
    else c.fx(FX.SHARD, elem, x, y, z, size * 0.3, Math.sin(yaw) * Math.cos(a), Math.sin(a), Math.cos(yaw) * Math.cos(a), size * 2, glow, 0, 0, mat, Math.PI / 2);
  }
}
// A boomerang: two arms from an elbow, lying nearly level, turning about its middle.
export function rang3(c, x, y, z, spin, size, elem, mat = MAT.LIGHT, glow = 1, tilt = 0.12) {
  for (const k of [-1, 1]) {
    const a = spin + k * 0.95, dx = Math.sin(a), dz = Math.cos(a), dy = tilt * k;
    c.fx(FX.BOX, elem, x + dx * size * 0.24, y + dy * size * 0.24, z + dz * size * 0.24, size * 0.085, dx, dy, dz, size * 0.56, glow, 0, 0, mat, 0, size * 0.022);
  }
}
// A spear of light, or of bone and light: haft and head along a line.
function spear3(c, x, y, z, ax, ay, az, len, elem, glow = 1, light = 0) {
  c.fx(FX.LANCE, elem, x, y, z, 0.05, ax, ay, az, len, 1, light, light ? 4 : 0);
  if (glow) c.fx(FX.BEAM, elem, x, y, z, 0.05 * glow, ax, ay, az, len, 0.8, 0, 0, 0, 0, 0.02);
}
// A crescent of light: level round him the way he faces (reach metres out), or upright before him, tipped by `tilt`.
function crescent(c, h, reach, elem, o = {}) {
  const yaw = (o.yaw ?? h.yaw) + (o.turn || 0), y = h.y + (o.y ?? 1.15);
  if (o.up === undefined) c.burst(FX.GLYPH, elem, h.x, y, h.z, reach * 0.8, reach * 1.25, o.life || 0.22, { ax: 0, ay: 1, az: 0, len: yaw, extra: GLYPHS.CRESCENT, light: o.light ?? 4, lightR: 3 });
  else c.burst(FX.GLYPH, elem, h.x + Math.sin(yaw) * 0.3, y, h.z + Math.cos(yaw) * 0.3, reach * 0.8, reach * 1.2, o.life || 0.22, { ax: -Math.cos(yaw), ay: 0, az: Math.sin(yaw), len: o.up, extra: GLYPHS.CRESCENT, light: o.light ?? 4, lightR: 3 });
}
// A sign that drifts: a note rising off the lute, a sleeper's breath. Drawn till it's gone.
function drift(w, h, x, y, z, vx, vy, vz, glyph, elem, size, life, spin = 0) {
  const turn0 = rand(-0.5, 0.5);
  w.zones.push({ kind: 'fx', owner: h, t: 0, life, quiet: true, draw: (c, q) => {
    const k = q.t / life, a = Math.min(1, k * 6) * (1 - k) ** 0.7;
    c.fx(FX.GLYPH, elem, x + vx * q.t, y + vy * q.t + Math.sin(q.t * 5 + turn0 * 9) * 0.05, z + vz * q.t, size * (0.7 + 0.5 * k), 0, 0, 0, turn0 + spin * q.t, a, 0, 0, k, turn0, glyph);
  } });
}
// Sound going out along the ground from a point, the way `yaw`: arcs that widen and fade.
function waves(c, x, y, z, yaw, reach, elem, life = 0.6) {
  c.burst(FX.GLYPH, elem, x, y, z, reach * 0.25, reach, life, { ax: 0, ay: 1, az: 0, len: yaw, extra: GLYPHS.WAVES, ease: 1.4 });
}

// ---- things thrown ---------------------------------------------------------------------------------------------------
// A shot of this file's (kind 'x' in HeroWorld.shots): x, y, z, vx, vy, vz, dmg, r (how near it must pass), life, and
// homing (radians a second it turns toward foe), only (strikes its foe and no other), pierce (goes on through), bounce (that many more foes, hop metres apart),
// ret (comes back to the hand it left, cutting again on the way), grav, grow (a second, in size and hurt), o (as Hero.hit),
// onHit (m, s), onEnd (s), tick (s, dt), draw (c, s), end (s).
function shot(w, h, o) {
  const s = { kind: 'x', owner: h, t: 0, life: 2, r: 0.45, hitSet: new Set(), size: 1, ...o };
  w.shots.push(s);
  return s;
}
// Velocity from a point to a foe's chest at speed v.
function toward(x, y, z, m, v, up = 1.1) {
  const dx = m.x - x, dy = m.y + up - y, dz = m.z - z, L = Math.hypot(dx, dy, dz) || 1;
  return { vx: dx / L * v, vy: dy / L * v, vz: dz / L * v };
}
export function stepShotX(w, s, dt) {
  const sim = w.sim, o = s.owner;
  const v0 = Math.hypot(s.vx, s.vy, s.vz) || 1;
  const stop = (hit) => { if (!s.done) { s.done = true; s.onEnd?.(s, hit); s.end?.(s); } };
  if (o.dead) return stop();
  if (s.wait > 0) { s.wait -= dt; s.t -= dt; s.tick?.(s, dt); return; }
  if (s.ret && !s.back && s.t > s.life * 0.5) { s.back = true; s.hitSet.clear(); s.onTurn?.(s); }
  if (s.back) {
    // Home to the hand that threw it.
    const hp = o.handPos(s.hand ? 'l' : 'r'), dx = hp[0] - s.x, dy = hp[1] - s.y, dz = hp[2] - s.z, L = Math.hypot(dx, dy, dz);
    if (L < 0.8 || s.t > s.life + 3) { s.caught?.(s); return stop(); }
    const v = Math.max(v0, s.v || v0) * (s.t > s.life ? 1.6 : 1.1);
    s.vx = dx / L * v; s.vy = dy / L * v; s.vz = dz / L * v;
  } else if (s.homing) {
    let m = s.foe;
    if (!m || !E.fightable(m) || s.hitSet.has(m)) m = s.foe = nearest(w, s.x, s.z, 10, s.hitSet);
    if (m && s.t > (s.loft || 0)) {
      const want = Math.atan2(m.x - s.x, m.z - s.z), have = Math.atan2(s.vx, s.vz), vh = Math.hypot(s.vx, s.vz) || 1;
      const a = have + clamp(wrapAngle(want - have), -s.homing * dt, s.homing * dt);
      const flat = Math.max(vh, v0 * 0.85);
      s.vx = Math.sin(a) * flat; s.vz = Math.cos(a) * flat;
      s.vy += (clamp((m.y + 1.1 - s.y) * 4, -v0, v0) - s.vy) * Math.min(1, dt * 8);
    }
  }
  if (s.grav) s.vy -= s.grav * dt;
  if (s.grow) { const k = 1 + s.grow * dt; s.size = Math.min(s.sizeMax || 2, s.size * k); s.dmg *= 1 + (s.growDmg ?? s.grow) * dt; }
  const v = Math.hypot(s.vx, s.vy, s.vz) || 1;
  // A wall, a corner or a pine: what comes back turns for home there; what bounces or flies on ends there.
  if (!s.back && !s.lob && sim.world.rayBoxes(s.x, s.y, s.z, s.vx / v, s.vy / v, s.vz / v, v * dt) >= 0) {
    if (s.ret) { s.back = true; s.hitSet.clear(); s.onTurn?.(s); }
    else { if (o.fxOk()) sim.casting.burst(FX.PUFF, s.elem ?? SPIRIT, s.x, s.y, s.z, 0.12, 0.35, 0.25); return stop(); }
  }
  s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
  const ground = sim.world.height(s.x, s.z);
  if (s.y < ground + 0.12) {
    if (s.lob || !s.skim) { s.y = ground; return stop(); }
    s.y = ground + 0.12; s.vy = Math.max(0, s.vy);
  }
  s.tick?.(s, dt);
  if (!s.ret && s.t > s.life) return stop();
  if (s.lob) return;
  for (const m of w.targets) {
    if (!E.fightable(m) || s.hitSet.has(m)) continue;
    // (Meant for one alone, it passes the rest by while that one stands.)
    if (s.only && s.foe !== m && E.fightable(s.foe)) continue;
    const top = (m instanceof E.Gravehart ? 3.5 : 2.2) * (m.scale || 1);
    if (Math.hypot(m.x - s.x, m.z - s.z) > E.radiusOf(m) + s.r * s.size || s.y < m.y - 0.3 || s.y > m.y + top + 0.4) continue;
    s.hitSet.add(m);
    o.hit(sim, m, s.dmg, s.hk || 'gash', s.poise ?? 30, 0, s.o || {});
    s.onHit?.(m, s);
    if (s.back) continue;
    if (s.bounce > 0) {
      s.bounce--;
      const nx = nearest(w, m.x, m.z, s.hop || 7, s.hitSet, [s.x, s.y, s.z]);
      if (nx) { Object.assign(s, toward(s.x, s.y, s.z, nx, v)); s.foe = nx; s.life = Math.max(s.life, s.t + 1.2); continue; }
      if (s.ret) { s.back = true; s.hitSet.clear(); s.onTurn?.(s); continue; }
      return stop(m);
    }
    if (s.ret && s.bounce === 0) { s.back = true; s.hitSet.clear(); s.onTurn?.(s); continue; }
    if (!s.pierce) return stop(m);
    if (typeof s.pierce === 'number' && --s.pierce <= 0) return stop(m);
  }
}

// Things that turn round a hero for a while, cutting what they touch: hammers, shields, spears, notes, boomerangs.
// o: n, r, speed (radians a second), life, y, dmg, reach, onHit (m), draw (c, x, y, z, a, i, zone), spiral (out from him).
function orbit(w, h, o) {
  h.orbiting = (h.orbiting || 0) + 1;
  const hitT = new Map(), a0 = rand(0, TAU), sim = w.sim;
  const at = (z, i) => {
    const a = a0 + i * TAU / o.n + z.t * o.speed, r = o.spiral ? Math.min(o.r, 0.4 + z.t * o.spiral) : o.r * Math.min(1, z.t * 3 + 0.15);
    return [h.x + Math.sin(a) * r, h.y + (o.y ?? 1.1), h.z + Math.cos(a) * r, a];
  };
  w.zones.push({ kind: 'fx', owner: h, t: 0, life: o.life,
    step: (z, dt) => {
      for (let i = 0; i < o.n; i++) {
        const [x, , zz] = at(z, i);
        for (const m of w.targets) {
          if (!E.fightable(m) || Math.hypot(m.x - x, m.z - zz) > E.radiusOf(m) + (o.reach || 0.6)) continue;
          if (sim.time - (hitT.get(m) ?? -9) < 0.33) continue;
          hitT.set(m, sim.time);
          h.hit(sim, m, o.dmg, o.hk || 'gash', 20, 0, o.o || {});
          o.onHit?.(m, x, zz);
        }
      }
      o.step?.(z, dt);
    },
    draw: (c, z) => { const k = Math.min(1, z.t * 4, (o.life - z.t) * 3); for (let i = 0; i < o.n; i++) { const [x, y, zz, a] = at(z, i); o.draw(c, x, y, zz, a, i, z, k); } },
    end: () => { h.orbiting = Math.max(0, (h.orbiting || 1) - 1); o.end?.(); },
  });
}
// Something of this file's that lasts a while and is drawn: draw (c, zone), step (zone, dt), end ().
function zone(w, h, life, draw, step, end) { const z = { kind: 'fx', owner: h, t: 0, life, draw, step, end }; w.zones.push(z); return z; }

// ---- how a body gets about -------------------------------------------------------------------------------------------

// A run through whatever's on the line: `len` metres the way `dir`, untouchable. o: v, clip, dmg, kind, o (as Hero.hit),
// onHit (m), each (dt), done (), draw (c, h), aim (the weapon pointed down it).
function dash(h, sim, dir, len, o = {}) {
  const v = o.v || 16;
  len = Math.max(0.5, Math.min(len, sim.world.clearance(h.x, h.z, Math.sin(dir), Math.cos(dir), len, 0.45) - 0.2));
  const clip = h.bank.clips[o.clip || 'Sword_Dash'] ? o.clip || 'Sword_Dash' : 'Sword_Regular_A', T = len / v;
  h.yaw = h.faceYaw = dir;
  h.startSwing(clip, h.bank.clips[clip].dur / (T + 0.3) * (o.hold || 0.5), [], () => {}, { root: true, cut: () => { h.aim = null; } });
  h.charge = { dir, left: len, v, hitSet: new Set(), quick: true, dmg: o.dmg ?? 12, kind: o.kind, o: o.o, onHit: o.onHit, each: o.each, noShove: o.noShove, draw: o.draw, done: () => { h.aim = null; o.done?.(); } };
  if (o.aim) h.aim = [Math.sin(dir), 0.02, Math.cos(dir)];
  h.iframesT = T + 0.08;
  sim.event(EV.WHOOSH, h.x, h.y + 1, h.z);
}
// Gone from here and there at once, in smoke.
function blink(h, sim, x, z, elem = VOID) {
  const w = sim.heroWorld;
  w.puff(h.x, h.y + 1, h.z, elem);
  sim.event(EV.BLINK, h.x, h.y + 1, h.z);
  [h.x, h.z] = h.clearSpot(sim, x, z);
  h.lastX = h.x; h.lastZ = h.z;
  h.y = sim.world.height(h.x, h.z);
  w.puff(h.x, h.y + 1, h.z, elem);
}
const behind = (m, r) => { const a = (m.yaw ?? 0) + Math.PI; return [m.x + Math.sin(a) * (E.radiusOf(m) + r), m.z + Math.cos(a) * (E.radiusOf(m) + r)]; };

// ---- which move, and what between -------------------------------------------------------------------------------------

// The move that suits the moment best, of those ready: come by at his level, in range, with a line if it needs one. Each
// is weighed by what it's for (a crowd for what strikes many, a gap for what closes one, the foe's last third for a
// finisher, his own hurt for what saves him, a foe working a spell for whatever would stop it) and by how long it's gone
// unused, so a fight shows all of them. posted: he
// fights from a place he was given, so nothing that leaves it.
export function chooseSkill(h, sim, w, m, d, R, line, _env, posted = false) {
  const lvl = h.person.level, gap = d - R;
  const crowd = w.crowd(m.x, m.z, 5), near = w.crowd(h.x, h.z, 4);
  const x = { w, sim, d, gap, crowd, near, hpF: h.hp / h.maxHp, mhp: m.hp / (m.maxHp || m.opts?.hp || m.hp || 1),
    onMe: m.heroFoe === h && sim.time - (m.heroFoeT ?? -9) < 3 && (m.aggro ?? true), hitNow: sim.time - (h.lastHitBy?.t ?? -9) < 1.2 };
  const worth = !!m.boss || m.champion || (m.maxHp || m.opts?.hp || 0) > 350 || crowd >= 3;
  let best = null, bs = 0.55;
  for (const s of h.skills) {
    if (s.t > 0 || s.song || s.heal || (s.lvl || 1) > lvl) continue;
    const f = FIRST[s.key], q = f ? { ...s, ...f } : s;
    if (q.range && (gap < q.range[0] || gap > q.range[1])) continue;
    if (!line && (q.line || E.LINE_SKILLS.has(q.key))) continue;
    if (q.crowd && crowd < q.crowd && !(q.orUndead && m instanceof E.Zombie)) continue;
    if (q.undead && !(m instanceof E.Zombie)) continue;
    // The dragoon's rhythm: leap, and leap again, and after so many leaps the barrage.
    if (q.after && h.leaps < h.leapGoal) continue;
    if (q.leap && h.leaps >= h.leapGoal && gap < 2.6) continue;
    if (posted && q.move) continue;
    if (h.role === 'heal' && q.move) continue;
    if (q.need && !q.need(h, m, x)) continue;
    let sc = q.w || 1;
    if (q.aoe) sc *= 0.55 + 0.45 * Math.min(5, crowd);
    if (q.gap) sc *= gap > 3.5 ? 2.4 : 0.45;
    if (q.finish) sc *= x.mhp < 0.35 ? 2.5 : 0.7;
    if (q.def) sc *= x.hpF < 0.5 ? 3 : 0.2;
    if (q.big) sc *= worth ? 1.8 : 0.3;
    // (Something working a spell: whatever would knock it out of it, now.)
    if (m.casting && STUNS.has(q.key)) sc *= 3;
    sc *= 0.7 + Math.min(1.3, (sim.time - (h.used[q.key] ?? -30)) / 14);
    sc *= 0.75 + h.r() * 0.5;
    if (sc > bs) { bs = sc; best = s; }
  }
  return best;
}

// What takes a foe off its stride, and so out of a spell it's working.
const STUNS = new Set(['smite', 'holy_nova', 'fist_of_heavens', 'crusaders_charge', 'shield_bash', 'bulwark_nova', 'sunspear', 'charge', 'flip_strike', 'smoke_bomb', 'death_from_above', 'frost_star', 'kick_chain',
  'storm_dive', 'golden_boomerang', 'bass_drop', 'lullaby', 'shockwave_riff', 'frost_arrow', 'sniper_shot', 'ninja_flurry']);
const AGILE = new Set(['rogue', 'ninja', 'archer', 'boomerang', 'bard']);
// What a class does between its blows. True if it has the body this tick (fight() then leaves it alone).
//   Anyone light on their feet, struck: a roll out from under it, now and then.
//   A rogue: in, three or four cuts, and out again five strides to come back with a leap (hit and run).
//   A ninja: round the foe at a run, throwing stars of every kind as he goes; then in with both blades; then round again.
//   A boomerang knight: never still between throws, sidling round at his distance.
export function classRoutine(h, sim, w, m, d, R, line, dt) {
  const cls = h.person.cls, gap = d - R;
  if (h.post || h.role === 'heal' || h.role === 'tank') return false;
  // A roll away from a blow.
  if (AGILE.has(cls) && h.tumbleCd <= 0 && sim.time - (h.lastHitBy?.t ?? -9) < 0.3 && gap < 3.5 && h.bank.clips.Roll) {
    h.tumbleCd = rand(5, 9);
    const away = Math.atan2(h.x - m.x, h.z - m.z), a = away + (h.r() < 0.5 ? 1 : -1) * rand(0.5, 1.1);
    if (sim.world.clearance(h.x, h.z, Math.sin(a), Math.cos(a), 3.6, 0.45) > 2.4) {
      dash(h, sim, a, 3.6, { v: 9, clip: 'Roll', dmg: 0, hold: 0.8, noShove: true, done: () => { h.yaw = h.faceYaw = dirTo(h, m); } });
      h.charge.hitSet = { has: () => true, add() {} };
      return true;
    }
  }
  const k = h.skirm;
  if (cls === 'rogue') {
    if (!k && h.combo >= 3 + (h.slot % 2) && gap < 2.5 && m.hp > 0 && !(m.hp / (m.maxHp || 1) < 0.15)) {
      const a = Math.atan2(h.x - m.x, h.z - m.z) + rand(-0.6, 0.6), to = spotAt(h, sim, h.x, h.z, a, 5.5);
      h.combo = 0;
      if (to) h.skirm = { mode: 'out', t: rand(0.9, 1.3), to };
    }
    if (k?.mode === 'out') {
      k.t -= dt;
      if (k.t <= 0 || dist(h, { x: k.to[0], z: k.to[1] }) < 0.5) { h.skirm = null; h.gcd = Math.min(h.gcd, 0.15); return false; }
      h.goal = { x: k.to[0], z: k.to[1], speed: 6.4, stop: 0.3 };
      return true;
    }
  }
  if (cls === 'ninja') {
    if (!k && (h.combo >= 4 || (h.orbitCd ?? 0) < sim.time) && line && gap < 9) {
      h.combo = 0; h.orbitCd = sim.time + rand(7, 11);
      h.skirm = { mode: 'orbit', t: rand(2.2, 3.2), a: Math.atan2(h.x - m.x, h.z - m.z), dir: h.r() < 0.5 ? 1 : -1, fire: 0.35, every: 0.42, r: rand(5, 6.5), n: 0 };
    }
    if (k?.mode === 'orbit') return orbitRun(h, sim, w, m, k, line, dt);
  }
  if (cls === 'boomerang') {
    // (Sidling: a step round at his distance while the next throw's coming. fight() takes it for where to stand.)
    if ((h.sideT ?? 0) < sim.time) {
      h.sideT = sim.time + rand(0.9, 1.6);
      const want = h.cls.want ?? 5.5, a = Math.atan2(h.x - m.x, h.z - m.z) + (h.slot % 2 ? 1 : -1) * rand(0.35, 0.6);
      const x = m.x + Math.sin(a) * (want + R), z = m.z + Math.cos(a) * (want + R);
      h.sideGoal = sim.world.inside(x, z, 0.5) ? null : { x, z, speed: 2.8, stop: 0.4, face: dirTo(h, m) };
    }
  } else h.sideGoal = null;
  return false;
}

// The ninja's run round his foe, a star off his hand every few strides: steel, then fire, frost, storm and spirit in turn.
const STARS = ['steel', 'fire', 'steel', 'frost', 'steel', 'storm', 'steel', 'spirit'];
function orbitRun(h, sim, w, m, k, line, dt) {
  k.t -= dt; k.fire -= dt;
  if (k.t <= 0 || !E.fightable(m)) { h.skirm = null; h.gcd = Math.min(h.gcd, 0.2); return false; }
  k.a += k.dir * (6.2 / k.r) * dt;
  let x = m.x + Math.sin(k.a) * (k.r + E.radiusOf(m)), z = m.z + Math.cos(k.a) * (k.r + E.radiusOf(m));
  if (sim.world.inside(x, z, 0.5)) { k.dir = -k.dir; k.a += k.dir * 0.3; x = h.x; z = h.z; }
  h.goal = { x, z, speed: 6.2, stop: 0.2 };
  h.shieldTarget = 0;
  if (k.fire <= 0 && line) {
    k.fire = k.every;
    const kind = k.rapid ? STARS[k.n % STARS.length] : pick(STARS);
    k.n++;
    h.play('OverhandThrow', 2.4, 'upper', 0.05);
    h.actT = 0.35 * (h.bank.clips.OverhandThrow?.dur || 1);
    throwStar(h, sim, m, kind, k.n % 2);
  }
  return true;
}

// A star off the hand at a foe: steel (a cut), fire (bursts), frost (holds what it strikes), storm (leaps on to more),
// spirit (bends after its mark, and goes through).
function throwStar(h, sim, m, kind, hand = 0, spread = 0, big = 1) {
  const w = sim.heroWorld, c = sim.casting, P = h.power(), rk = rank(h), hp = h.handPos(hand ? 'l' : 'r');
  const a = Math.atan2(m.x - hp[0], m.z - hp[2]) + spread, v = 24;
  const base = { x: hp[0], y: hp[1], z: hp[2], vx: Math.sin(a) * v, vy: (m.y + 1.1 - hp[1]) / Math.max(0.2, Math.hypot(m.x - hp[0], m.z - hp[2]) / v), vz: Math.cos(a) * v, life: 1.1, hand, size: big };
  const drawAs = (elem, mat, n, glyph) => (cc, s) => {
    star3(cc, s.x, s.y, s.z, s.t * 28, 0.16 * s.size, elem, mat, n, 1, Math.atan2(s.vx, s.vz), true);
    if (mat !== MAT.STEEL) { cc.fx(FX.GLYPH, elem, s.x, s.y, s.z, 0.3 * s.size, 0, 0, 0, s.t * 14, 0.9, 3, 3, 0, 0, glyph); cc.fx(FX.TRAIL, elem, s.x, s.y, s.z, 0.05 * s.size, -s.vx / v, -s.vy / v, -s.vz / v, 0.9, 0.8); }
    else cc.fx(FX.TRAIL, SPIRIT, s.x, s.y, s.z, 0.02, -s.vx / v, -s.vy / v, -s.vz / v, 0.5, 0.5);
  };
  if (kind === 'fire') shot(w, h, { ...base, dmg: 5 * P, elem: FIRE, draw: drawAs(FIRE, MAT.LIGHT, 2, GLYPHS.STAR4), onEnd: (s) => {
    w.blast(h, s.x, s.z, sim.world.height(s.x, s.z), 1.8 + 0.1 * rk, 8 * P, { kind: 'burn', poise: 30, quiet: true });
    if (h.fxOk()) { c.burst(FX.SHOCK, FIRE, s.x, s.y, s.z, 0.3, 2, 0.3, { light: 10, lightR: 6 }); c.burst(FX.FLAME, FIRE, s.x, s.y - 0.4, s.z, 0.6, 1.6, 0.4, { len: 0.9 }); c.burst(FX.GLYPH, FIRE, s.x, s.y, s.z, 0.4, 1.3, 0.3, { ay: 0, extra: GLYPHS.SPARK }); }
  } });
  else if (kind === 'frost') shot(w, h, { ...base, dmg: 6 * P, elem: FROST, draw: drawAs(FROST, MAT.LIGHT, 3, GLYPHS.STAR6), onHit: (k, s) => {
    daze(sim, w, k, 1); slow(sim, k, 3);
    if (h.fxOk()) for (let i = 0; i < 5; i++) { const q = i * 1.26; c.burst(FX.ICE, FROST, k.x + Math.sin(q) * 0.3, k.y + 0.1, k.z + Math.cos(q) * 0.3, 0.09, 0.06, 0.9, { ax: Math.sin(q) * 0.4, ay: 0.9, az: Math.cos(q) * 0.4, len: rand(0.7, 1.2) }); }
  } });
  else if (kind === 'storm') {
    const s0 = shot(w, h, { ...base, dmg: 6 * P, elem: STORM, bounce: 2 + Math.ceil(rk / 2), hop: 7, draw: drawAs(STORM, MAT.LIGHT, 2, GLYPHS.SPARK), onHit: (k, s) => {
      if (h.fxOk()) { if (s.last) { const dx = k.x - s.last[0], dy = k.y + 1.1 - s.last[1], dz = k.z - s.last[2], L = Math.hypot(dx, dy, dz) || 1; c.burst(FX.BOLT, STORM, s.last[0], s.last[1], s.last[2], 0.35, 0.35, 0.18, { ax: dx / L, ay: dy / L, az: dz / L, len: L, extra: 0.06, light: 8, lightR: 5 }); } c.burst(FX.FLARE, STORM, k.x, k.y + 1.1, k.z, 0.3, 0.9, 0.2); }
      s.last = [k.x, k.y + 1.1, k.z];
    } });
    s0.last = null;
  } else if (kind === 'spirit') shot(w, h, { ...base, dmg: 7 * P, elem: SPIRIT, homing: 7, foe: m, pierce: 2 + Math.floor(rk / 2), life: 1.8, draw: drawAs(SPIRIT, MAT.LIGHT, 4, GLYPHS.STAR4) });
  else shot(w, h, { ...base, dmg: 6 * P, elem: SPIRIT, draw: drawAs(SPIRIT, MAT.STEEL, 2, GLYPHS.STAR4), o: { quiet: false } });
  sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
}

// ---- the lute ----------------------------------------------------------------------------------------------------------

// While a bard plays: on every stroke a note thrown up off the strings (a quaver, a pair, a crotchet, turning as it
// rises), the sound of it going out along the ground before him, and the string itself (the render thread plucks it).
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19];
export function strumFx(h, sim) {
  const t = h.tune, c = sim.casting, w = sim.heroWorld;
  const per = (t.v === 1 ? 5.6 : t.v === 2 ? 0.95 : 2.7 * 2) * (t.rate || 1);       // strokes a second (a strum is down and up)
  const beat = Math.floor(t.t * per + (t.v === 2 ? 0.28 : 0));
  if (beat === t.beat || t.t < 0.12) return;
  t.beat = beat;
  if (t.v === 1 && beat % 2) return;
  if (!h.fxOk()) return;
  const elem = t.elem ?? ARCANE, s = Math.sin(h.yaw), co = Math.cos(h.yaw);
  const lx = h.luteT ? h.luteT[0] : h.x + s * 0.3, ly = h.luteT ? h.luteT[1] : h.y + 1.1, lz = h.luteT ? h.luteT[2] : h.z + co * 0.3;
  const big = t.v === 2;
  // The note: out and up, a little to one side or the other.
  const side = (beat % 2 ? 1 : -1) * rand(0.2, 0.7), n = big ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const g = pick([GLYPHS.NOTE, GLYPHS.NOTES, GLYPHS.NOTE, GLYPHS.CROTCHET]);
    drift(w, h, lx + s * 0.1, ly + 0.1, lz + co * 0.1, s * rand(0.5, 1.1) + co * side * (1 + i * 0.5), rand(0.7, 1.2), co * rand(0.5, 1.1) - s * side * (1 + i * 0.5), g, t.rainbow ? pick(RAINBOW) : elem, big ? 0.24 : 0.17, rand(0.9, 1.4), rand(-1, 1));
  }
  // The sound: arcs along the ground before him, and one in the air off the soundboard.
  waves(c, h.x + s * 0.5, h.y + 0.08, h.z + co * 0.5, h.yaw, big ? 4.2 : 2.6, elem, big ? 0.7 : 0.5);
  c.burst(FX.GLYPH, elem, lx + s * 0.25, ly, lz + co * 0.25, 0.25, big ? 1.5 : 0.9, 0.4, { ax: -co, ay: 0, az: s, len: 0, extra: GLYPHS.WAVES, alpha: 0.8, ease: 1.3 });
  if (big) c.burst(FX.RING, elem, h.x, h.y + 0.05, h.z, 0.4, 2.4, 0.5, { light: 5, lightR: 4 });
  // The string: a walk up and down a five-note scale, each bard starting from their own place in it.
  t.note = clamp((t.note ?? (h.slot * 3) % 6) + pick([-2, -1, 1, 1, 2]), 0, SCALE.length - 1);
  if (!t.quiet) { hfx(sim, HFX.PLUCK, lx, ly, lz, SCALE[t.note] + (t.key || 0), big ? 0.75 : 0.45); if (big) hfx(sim, HFX.PLUCK, lx, ly, lz, SCALE[Math.max(0, t.note - 2)] + (t.key || 0), 0.55); }
}

// ---- the moves ---------------------------------------------------------------------------------------------------------
// CAST[key](h, sim, m, X): h does it to m. X: { w (the heroes' world), c (sim.casting), P (his power), rk (his rank), yaw (to m) }.
const CAST = {};
// The words for a move, where the writers have some that fit (script.json moves, by class).
const BARK = { lance_barrage: 'lance_thrust', lance_of_light: 'lance_thrust', phalanx_rush: 'charge', bulwark_nova: 'shield_bash', tower_shields: 'shield_wall', solar_hammer: 'hammer_throw', hammer_storm: 'blessed_hammers', zeal: 'smite',
  piercing_arrow: 'aimed_shot', sniper_shot: 'aimed_shot', split_shot: 'volley', arrow_storm: 'rain_of_arrows', disengage: 'kite', rupture: 'flurry', whirling_blades: 'flurry', eviscerate: 'backstab', shadow_dance: 'vanish',
  twin_fangs: 'ninja_flurry', whirlwind: 'ninja_flurry', spin_kick: 'leaping_kick', kick_chain: 'leaping_kick', fire_star: 'throwing_stars', frost_star: 'throwing_stars', storm_star: 'throwing_stars', spirit_star: 'throwing_stars', giant_shuriken: 'throwing_stars', star_storm: 'throwing_stars',
  dragon_dive: 'jump', comet_dive: 'jump', storm_dive: 'jump', dragonfall: 'jump', lance_flurry: 'spear_combo', heavens_rain: 'spear_barrage', spear_rain: 'spear_barrage',
  cross_cut: 'double_throw', energy_rang: 'throw', golden_boomerang: 'throw', chakram: 'throw', homing_salvo: 'double_throw' };

export function castSkill(h, sim, key, m) {
  const fn = CAST[key];
  if (!fn) return false;
  fn(h, sim, m, { w: sim.heroWorld, c: sim.casting, P: h.power(), rk: rank(h), yaw: dirTo(h, m) });
  sayMove(h, sim, BARK[key] || key, 0.3);
  return true;
}

// A board in the air: the hero's own, as a matrix. Flat like a discus, its painted face up and a little back toward whoever
// threw it; or (upright) standing, turning about its own height.
function boardFlight(s, upright) {
  const a = s.t * 16, v = Math.hypot(s.vx, s.vz) || 1, tx = s.vx / v, tz = s.vz / v;
  let X, Y, Z;
  if (upright) { Y = [0, 1, 0]; Z = [Math.sin(a), 0, Math.cos(a)]; X = [Z[2], 0, -Z[0]]; }
  else {
    const L = Math.hypot(0.32, 1);
    Z = [tx * 0.32 / L, -1 / L, tz * 0.32 / L];
    const u = [tz, 0, -tx], q = [Z[1] * u[2] - Z[2] * u[1], Z[2] * u[0] - Z[0] * u[2], Z[0] * u[1] - Z[1] * u[0]], cs = Math.cos(a), sn = Math.sin(a);
    Y = [u[0] * cs + q[0] * sn, u[1] * cs + q[1] * sn, u[2] * cs + q[2] * sn];
    X = [Y[1] * Z[2] - Y[2] * Z[1], Y[2] * Z[0] - Y[0] * Z[2], Y[0] * Z[1] - Y[1] * Z[0]];
  }
  return new Float32Array([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, s.x, s.y, s.z, 1]);
}
// The board thrown: it strikes, turns for the next within eight metres, and the next, then comes home to the arm. The
// hero's own board if he carries one (it leaves his arm and is back on it); a board of light if he doesn't.
function throwBoard(h, sim, m, X, o) {
  const { w, c, P } = X, real = !!h.offP && h.shieldStyle;
  h.startSwing('OverhandThrow', 1.3, [0.42], () => {
    if (!E.fightable(m)) return;
    const hp = h.handPos(real ? 'l' : 'r'), v = 17;
    shot(w, h, { x: hp[0], y: hp[1] + 0.1, z: hp[2], ...toward(hp[0], hp[1] + 0.1, hp[2], m, v), v, dmg: o.dmg * P, hk: 'bash', poise: 60, o: { stun: 0.5 }, r: 0.75, life: 4, bounce: o.bounce, hop: 8, ret: true, hand: real ? 1 : 0, elem: o.elem, skim: true,
      onHit: (k, s) => {
        if (h.fxOk()) {
          c.burst(FX.SHOCK, o.elem, k.x, k.y + 1.1, k.z, 0.25, 1.2, 0.25);
          c.burst(FX.FLARE, o.elem, k.x, k.y + 1.1, k.z, 0.35, 1.1, 0.22, { light: 10, lightR: 5 });
          hfx(sim, o.elem === LIGHT ? HFX.CHIME : HFX.SPARKS, k.x, k.y + 1.1, k.z, o.elem === LIGHT ? 5 + s.hitSet.size * 2 : 30, 0.5);
        }
        o.onHit?.(k);
      },
      tick: (s) => { if (real) h.free[1] = boardFlight(s, o.upright); },
      draw: (cc, s) => {
        const vv = Math.hypot(s.vx, s.vy, s.vz) || 1;
        if (!real) cc.fx(FX.KITE, o.elem, s.x, s.y, s.z, 0.42, Math.sin(s.t * 16), 0, Math.cos(s.t * 16), 0, 1, 0, 0, 0.3, 0);
        cc.fx(FX.ORB, o.elem, s.x, s.y, s.z, 0.42, 0, 1, 0, 0, real ? 0.35 : 0.6, 7, 5);
        cc.fx(FX.TRAIL, o.elem, s.x, s.y, s.z, 0.16, -s.vx / vv, -s.vy / vv, -s.vz / vv, 1.6, 0.8);
        cc.fx(FX.GLYPH, o.elem, s.x, s.y + 0.02, s.z, 0.7, 0, 1, 0, s.t * 9, 0.5, 0, 0, 0, 0, GLYPHS.SPARK);
      },
      end: (s) => { if (real) h.free[1] = null; if (h.fxOk()) c.burst(FX.FLARE, o.elem, s.x, s.y, s.z, 0.2, 0.7, 0.2, { light: 6, lightR: 3 }); },
    });
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  }, { mask: 'upper' });
}
// A pillar of light on a place, and what stands there takes it.
function pillar(h, sim, x, z, r, dmg, elem = LIGHT, o = {}) {
  const w = sim.heroWorld, c = sim.casting, y = sim.world.height(x, z);
  if (h.fxOk()) {
    c.burst(FX.COLUMN, elem, x, y, z, 5.5, 7, 0.45, { len: r * 1.1, light: 16, lightR: 7 });
    c.burst(FX.RING, elem, x, y + 0.05, z, 0.3, r + 0.4, 0.4);
    c.burst(FX.FLARE, elem, x, y + 0.9, z, 0.4, 1.3, 0.25);
  }
  return w.blast(h, x, z, y, r, dmg, { kind: 'burn', poise: 50, ...o });
}

// ---- paladin: hammers, the board, and the light out of the sky ----------------------------------------------------------

// Five blows as fast as the arm will go, a crescent of light off each, one way and then the other.
CAST.zeal = (h, sim, m, { c, P }) => {
  h.startSwing('Sword_Regular_Combo', 1.55, [0.08, 0.2, 0.33, 0.46, 0.6], (i) => {
    h.strikeAround(sim, 2.3, 1.1, 6 * P, 0, 2, { poise: 25 });
    if (h.fxOk()) crescent(c, h, 2.2, LIGHT, i % 2 ? { up: 0.5 + (i - 2) * 0.25 } : { turn: (i - 2) * 0.2 });
  }, { lunge: 1.6, end: 0.72 });
};
CAST.blessed_shield = (h, sim, m, X) => throwBoard(h, sim, m, X, { dmg: 15, bounce: 2 + X.rk, elem: LIGHT });
// The light breaks outward from him: what's near is thrown back reeling, and his own side is mended.
CAST.holy_nova = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('Spell_Simple_Shoot', 0.9, [0.45], () => {
    const r = 4 + 0.3 * rk;
    w.blast(h, h.x, h.z, h.y, r, 12 * P, { kind: 'bash', poise: 70, shove: 7, stun: 0.8 });
    for (const o of sideOf(h)) if (!o.dead && dist(o, h) < r + 1) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.08);
    if (h.fxOk()) {
      c.burst(FX.SHOCK, LIGHT, h.x, h.y + 0.6, h.z, 0.5, r * 1.1, 0.45, { light: 16, lightR: 8 });
      c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.5, r, 0.5);
      c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.3, r * 0.6, 0.6);
      c.burst(FX.COLUMN, LIGHT, h.x, h.y, h.z, 3, 4.5, 0.5, { len: 1.6 });
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; drift(w, h, h.x + Math.sin(a) * 0.6, h.y + 1.1, h.z + Math.cos(a) * 0.6, Math.sin(a) * r * 1.6, 0.4, Math.cos(a) * r * 1.6, GLYPHS.CROSS, LIGHT, 0.3, 0.55); }
      hfx(sim, HFX.CHIME, h.x, h.y + 1.2, h.z, 0, 0.7); hfx(sim, HFX.CHIME, h.x, h.y + 1.2, h.z, 7, 0.6);
    }
    sim.event(EV.GROUND, h.x, h.y, h.z);
  }, { still: true });
};
// Behind the board (or the maul) in a blaze, through whatever's in the way.
CAST.crusaders_charge = (h, sim, m, { c, yaw }) => {
  h.shieldTarget = h.shieldStyle ? 1 : 0;
  dash(h, sim, yaw, Math.min(9, dist(h, m) + 1.2), { v: 15, clip: h.shieldStyle ? 'Shield_Dash' : 'Sword_Dash', dmg: 14, kind: 'bash', o: { stun: 0.6 },
    onHit: (k) => { if (h.fxOk()) c.burst(FX.FLARE, LIGHT, k.x, k.y + 1.1, k.z, 0.4, 1.2, 0.22, { light: 10, lightR: 5 }); },
    draw: (cc) => {
      const s = Math.sin(h.yaw), co = Math.cos(h.yaw);
      cc.fx(FX.KITE, LIGHT, h.x + s * 0.9, h.y + 1.1, h.z + co * 0.9, 0.75, s, 0, co, 0, 0.9, 8, 5, 0.3, 0);
      for (let i = 0; i < 3; i++) cc.fx(FX.TRAIL, LIGHT, h.x - co * (i - 1) * 0.35, h.y + 0.6 + i * 0.4, h.z + s * (i - 1) * 0.35, 0.16, -s, 0, -co, 2.6, 0.7);
    },
    done: () => { if (h.fxOk()) { c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.4, 2.4, 0.4); c.burst(FX.SHOCK, LIGHT, h.x, h.y + 0.5, h.z, 0.4, 2, 0.3); } },
  });
};
// Bolts of light out of a clear sky, on the foe and those about it, one after another.
CAST.fist_of_heavens = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('Spell_Simple_Shoot', 1.0, [0.45], () => {
    const marks = [m, ...foesIn(w, m.x, m.z, 6).filter((k) => k !== m)].slice(0, 2 + rk);
    marks.forEach((k, i) => w.later(i * 0.09, () => {
      if (h.dead || !E.fightable(k)) return;
      h.hit(sim, k, 14 * P, 'burn', 60, 0, { stun: 0.5 });
      if (h.fxOk()) {
        c.burst(FX.BOLT, LIGHT, k.x + rand(-0.6, 0.6), k.y + 10, k.z + rand(-0.6, 0.6), 0.7, 0.5, 0.24, { ax: 0, ay: -1, az: 0, len: 10, extra: 0.5, light: 18, lightR: 8 });
        c.burst(FX.COLUMN, LIGHT, k.x, k.y, k.z, 3, 5, 0.3, { len: 0.9 });
        c.burst(FX.RING, LIGHT, k.x, k.y + 0.05, k.z, 0.3, 1.3, 0.35);
        c.burst(FX.GLYPH, LIGHT, k.x, k.y + 1.2, k.z, 0.5, 1.4, 0.25, { ay: 0, extra: GLYPHS.SPARK });
        hfx(sim, HFX.CHIME, k.x, k.y + 1.2, k.z, 12 + i * 2, 0.55);
      }
    }));
  }, { still: true, mask: 'upper' });
};
// A ward of light on whoever of his side is lowest: it takes the next blows for them, and mends a little.
CAST.divine_shield = (h, sim, m, { w, c, rk }) => {
  const who = lowest(w, h, 12, 0.6) || h;
  h.startSwing('Spell_Simple_Shoot', 1.1, [0.45], () => {
    if (who.dead) return;
    who.hp = Math.min(who.maxHp, who.hp + who.maxHp * 0.12);
    if (who !== sim.player) { who.ward = who.maxHp * (0.2 + 0.03 * rk); who.wardT = 6; }
    else who.hp = Math.min(who.maxHp, who.hp + who.maxHp * 0.12);
    if (h.fxOk()) { c.burst(FX.COLUMN, LIGHT, who.x, who.y, who.z, 2.6, 3.4, 0.6, { len: 1.3, light: 12, lightR: 6 }); hfx(sim, HFX.CHIME, who.x, who.y + 1.4, who.z, 4, 0.6); }
    zone(w, h, 5, (cc, z) => {
      if (who.dead) return;
      const k = Math.min(1, z.t * 4, (5 - z.t) * 2), tall = who.rig ? who.rig.height : 1.8;
      cc.fx(FX.RING, LIGHT, who.x, who.y + 0.06, who.z, 0.9, 0, 1, 0, 0, 0.8 * k);
      for (let i = 0; i < 3; i++) { const a = z.t * 2.2 + i * 2.094; cc.fx(FX.GLYPH, LIGHT, who.x + Math.sin(a) * 0.85, who.y + tall * 0.6, who.z + Math.cos(a) * 0.85, 0.34, Math.sin(a), 0, Math.cos(a), 0, 0.8 * k, 0, 0, 0, i, GLYPHS.SHIELD); }
      // (Wings of light at the shoulders, opening as it lands.)
      const s = Math.sin(who.yaw ?? 0), co = Math.cos(who.yaw ?? 0), open = Math.min(1, z.t * 2.5);
      for (const sd of [-1, 1]) cc.fx(FX.GLYPH, LIGHT, who.x - s * 0.25 + co * sd * 0.5 * open, who.y + tall * 0.8, who.z - co * 0.25 - s * sd * 0.5 * open, 0.75, -s, 0, -co, sd * (0.35 + 0.5 * open), 0.6 * k, 0, 0, 0, sd, GLYPHS.WING);
    });
  }, { still: true, mask: 'upper' });
};
// Pillars of light where the foe and its fellows stand: a ring on the ground first, then the pillar.
CAST.heavens_fury = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('Spell_Simple_Shoot', 0.9, [0.45], () => {
    const cx = m.x, cz = m.z, n = 4 + rk;
    for (let i = 0; i < n; i++) {
      const k = i === 0 ? null : pick(foesIn(w, cx, cz, 4)), a = rand(0, TAU), r = Math.sqrt(Math.random()) * 2.6;
      const x = i === 0 ? cx : k && Math.random() < 0.6 ? k.x : cx + Math.sin(a) * r, z = i === 0 ? cz : k && Math.random() < 0.6 ? k.z : cz + Math.cos(a) * r;
      w.later(i * 1.6 / n, () => { if (!h.dead && h.fxOk()) c.burst(FX.RING, LIGHT, x, sim.world.height(x, z) + 0.05, z, 1.3, 1.2, 0.35); });
      w.later(i * 1.6 / n + 0.35, () => { if (!h.dead) { pillar(h, sim, x, z, 1.3, 11 * P); if (h.fxOk()) hfx(sim, HFX.CHIME, x, sim.world.height(x, z) + 1, z, pick([0, 4, 7, 12]), 0.4); } });
    }
  }, { still: true, mask: 'upper' });
};
// A beam of light from the hand, held on the foe as it moves: it burns down the whole line.
CAST.judgment_beam = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  let dir = yaw, tick = 0;
  h.startSwing('Spell_Simple_Shoot', 0.31, [0.18], () => {
    zone(w, h, 1.2, (cc, z) => {
      const p = h.handPos('r'), ax = Math.sin(dir), az = Math.cos(dir), k = Math.min(1, z.t * 6, (1.2 - z.t) * 5), len = 11;
      cc.fx(FX.BEAM, LIGHT, p[0], p[1], p[2], 0.32 * k, ax, 0, az, len, 0.35, 0, 0, 0, 0, 0.4 * k);
      cc.fx(FX.BEAM, LIGHT, p[0], p[1], p[2], 0.13 * k, ax, 0, az, len, 1, 14 * k, 7, 0, 0.3, 0.16 * k);
      cc.fx(FX.FLARE, LIGHT, p[0], p[1], p[2], 0.5 * k, 0, 1, 0, 0, 1);
      cc.fx(FX.GLYPH, LIGHT, p[0] + ax * 0.5, p[1], p[2] + az * 0.5, 0.5, ax, 0, az, z.t * 6, 0.8 * k, 0, 0, 0, 0, GLYPHS.STAR6);
    }, (z, dt) => {
      if (E.fightable(m)) dir += clamp(wrapAngle(dirTo(h, m) - dir), -1.6 * dt, 1.6 * dt);
      h.yaw = h.faceYaw = dir;
      if ((tick -= dt) > 0) return;
      tick += 0.13;
      const hit = w.line(h, h.x, h.z, dir, 11, 0.5, 3.4 * P, { kind: 'burn', poise: 12, quiet: true });
      if (h.fxOk()) for (const k of hit) c.burst(FX.FLARE, LIGHT, k.x, k.y + 1.1, k.z, 0.3, 0.7, 0.15);
    });
    if (h.fxOk()) hfx(sim, HFX.CHIME, h.x, h.y + 1.4, h.z, 0, 0.7);
  }, { still: true, end: 0.95 });
};
// A hammer of light as tall as a house, out of the sky onto the foe: the ground is hallowed where it lands.
CAST.solar_hammer = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('Spell_Simple_Shoot', 0.7, [0.5], () => {
    const x = m.x, z = m.z, y = sim.world.height(x, z), T = 0.55, r = 2.6 + 0.2 * rk, face = dirTo(h, m);
    let struck = false;
    if (h.fxOk()) c.burst(FX.RUNE, LIGHT, x, y + 0.06, z, r, r, T + 0.3, { alpha: 0.9 });
    zone(w, h, T + 0.9, (cc, q) => {
      const u = Math.min(1, q.t / T), fall = u * u, hy = y + 1.5 + (1 - fall) * 11;
      const fade = q.t > T + 0.5 ? Math.max(0, 1 - (q.t - T - 0.5) / 0.4) : 1;
      // (Head down: the haft stands up out of it. It leans in as it comes and stands upright in the ground.)
      hammer3(cc, x, hy + 0.9, z, face, Math.PI + (1 - u) * 0.5, 3.2, LIGHT, 1.6 * fade, 18 * fade);
      if (u < 1) for (let i = 0; i < 5; i++) { const a = i * 1.257 + q.t * 2; cc.fx(FX.BEAM, LIGHT, x + Math.sin(a) * 0.9, hy + 1.6, z + Math.cos(a) * 0.9, 0.05, 0, 1, 0, 4 + i * 0.5, 0.5, 0, 0, 0, i * 0.2, 0.2); }
      else cc.fx(FX.DISC, LIGHT, x, y + 0.04, z, r, 0, 1, 0, 0, 0.6 * fade, 8 * fade, r * 2);
    }, (q) => {
      if (struck || q.t < T) return;
      struck = true;
      w.blast(h, x, z, y, r, 34 * P, { kind: 'bash', poise: 100, stun: 1.5, shove: 5 });
      for (let i = 0; i < 4; i++) w.line(h, x, z, face + i * Math.PI / 2, 4.5, 0.6, 10 * P, { kind: 'burn', poise: 30, quiet: true });
      w.zones.push({ kind: 'consecrate', owner: h, x, z, y, t: 0, life: 6, r: 2.8, tick: 0 });
      if (h.fxOk()) {
        c.burst(FX.SHOCK, LIGHT, x, y + 0.4, z, 0.6, r * 1.6, 0.5, { light: 26, lightR: 12 });
        c.burst(FX.RING, LIGHT, x, y + 0.05, z, 0.5, r + 1.5, 0.6);
        c.burst(FX.COLUMN, LIGHT, x, y, z, 6, 9, 0.6, { len: 2.4 });
        for (let i = 0; i < 4; i++) { const a = face + i * Math.PI / 2; c.burst(FX.BEAM, LIGHT, x, y + 0.25, z, 0.3, 0.05, 0.5, { ax: Math.sin(a), ay: 0, az: Math.cos(a), len: 4.5, extra: 0.25 }); }
        hfx(sim, HFX.THUD, x, y, z, 1); hfx(sim, HFX.CHIME, x, y + 1, z, -5, 0.9);
      }
      sim.event(EV.GROUND, x, y, z);
    });
  }, { still: true });
};
// Hammers out of the sky, one after another, all over where the foe and its fellows stand.
CAST.hammer_storm = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('Spell_Simple_Shoot', 0.8, [0.5], () => {
    const cx = m.x, cz = m.z, n = 8 + 2 * rk, T = 0.45, drops = [];
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 4; drops.push({ x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r, t0: i * 2.2 / n, a, hit: false }); }
    if (h.fxOk()) c.burst(FX.RING, LIGHT, cx, sim.world.height(cx, cz) + 0.05, cz, 4, 4.2, 2.4, { alpha: 0.7 });
    zone(w, h, 2.2 + T + 0.3, (cc, q) => {
      for (const d of drops) {
        const u = (q.t - d.t0) / T;
        if (u < 0 || u > 1.5) continue;
        const y = sim.world.height(d.x, d.z);
        if (u <= 1) { hammer3(cc, d.x - Math.sin(d.a) * (1 - u) * 1.5, y + 0.5 + (1 - u * u) * 8, d.z - Math.cos(d.a) * (1 - u) * 1.5, d.a, u * 9, 1.25, LIGHT, 1.2, 0); cc.fx(FX.TRAIL, LIGHT, d.x, y + 0.6 + (1 - u * u) * 8, d.z, 0.12, 0, 1, 0, 2, 0.6); }
      }
    }, (q) => {
      for (const d of drops) {
        if (d.hit || q.t < d.t0 + T) continue;
        d.hit = true;
        const y = sim.world.height(d.x, d.z);
        w.blast(h, d.x, d.z, y, 1.15, 9 * P, { kind: 'bash', poise: 50, quiet: true });
        if (h.fxOk()) { c.burst(FX.SHOCK, LIGHT, d.x, y + 0.2, d.z, 0.2, 1.3, 0.25, { light: 9, lightR: 5 }); c.burst(FX.RING, LIGHT, d.x, y + 0.05, d.z, 0.2, 1.1, 0.3); if (Math.random() < 0.5) hfx(sim, HFX.THUD, d.x, y, d.z, 0.3); }
      }
    });
  }, { still: true });
};

// ---- lancer: the lance's light, the boards that turn round him, and the run ---------------------------------------------

// Four thrusts, the lance's light down each.
CAST.lance_barrage = (h, sim, m, { P }) => {
  h.startSwing('Sword_Regular_Combo', 1.45, [0.08, 0.24, 0.4, 0.56], (i) => { h.yaw += (i % 2 ? 0.12 : -0.12); h.thrust(sim, 3.2, 7 * P, i === 3 ? 4 : 0); }, { lunge: 1.2, end: 0.7 });
};
// Boards of light turning round him: they cut what they touch, and everything they touch, and everything near, is his.
CAST.tower_shields = (h, sim, m, { w, c, P, rk }) => {
  const n = Math.min(8, 2 + rk), elem = STORM;
  h.shieldTarget = 1;
  h.startSwing('Idle_Shield_Loop', 1, [0.3], () => {
    let pulse = 0;
    if (h.fxOk()) { c.burst(FX.SHOCK, elem, h.x, h.y + 1, h.z, 0.4, 2.2, 0.35, { light: 10, lightR: 6 }); hfx(sim, HFX.SPARKS, h.x, h.y + 1.2, h.z, 40); }
    orbit(w, h, { n, r: 1.7, speed: 2.6, life: 10, y: 1.15, dmg: 4 * P, hk: 'bash', reach: 0.75,
      onHit: (k, x, z) => { taunt(sim, h, k); if (h.fxOk()) c.burst(FX.FLARE, elem, x, h.y + 1.15, z, 0.25, 0.7, 0.15); },
      step: (z, dt) => {
        // (Every two seconds the ring calls everything within seven metres onto him.)
        if ((pulse -= dt) > 0) return;
        pulse = 2;
        for (const k of foesIn(w, h.x, h.z, 7)) taunt(sim, h, k, 4);
        if (h.fxOk()) c.burst(FX.RING, elem, h.x, h.y + 0.06, h.z, 1.6, 7, 0.55, { alpha: 0.7 });
      },
      draw: (cc, x, y, z, a, i, q, k) => {
        cc.fx(FX.KITE, i % 2 ? FROST : elem, x, y, z, 0.46, Math.sin(a), 0, Math.cos(a), 0, 0.95 * k, i === 0 ? 7 * k : 0, 5, 0.3, i);
        cc.fx(FX.TRAIL, elem, x, y, z, 0.1, Math.cos(a), 0, -Math.sin(a), 1.1, 0.5 * k);
        if (i === 0) cc.fx(FX.RING, elem, h.x, h.y + 0.06, h.z, 1.7, 0, 1, 0, 0, 0.5 * k);
      } });
  }, { still: true, end: 0.4, mask: 'upper' });
};
// The lance swung flat through everything before him.
CAST.sweeping_cleave = (h, sim, m, { c, P }) => {
  h.startSwing('Sword_Attack', 1.0, [0.24], () => {
    h.strikeAround(sim, 3.3, 1.75, 13 * P, 0, 8, { kind: 'bash', poise: 70, shove: 7 });
    if (h.fxOk()) { crescent(c, h, 3.3, STORM, { life: 0.3, light: 8 }); crescent(c, h, 2.6, FROST, { life: 0.25, y: 0.9 }); }
  }, { lunge: 1.5 });
};
CAST.shield_throw = (h, sim, m, X) => throwBoard(h, sim, m, X, { dmg: 13, bounce: 3 + Math.floor(X.rk / 2), elem: STORM, upright: true, onHit: (k) => taunt(sim, h, k, 4) });
// A spear of the lance's own light, thrown: through everything on its line, and what it goes through reels.
CAST.sunspear = (h, sim, m, { w, c, P }) => {
  h.startSwing('OverhandThrow', 1.2, [0.42], () => {
    const hp = h.handPos('r'), v = 30, vel = toward(hp[0], hp[1], hp[2], m, v);
    shot(w, h, { x: hp[0], y: hp[1], z: hp[2], ...vel, dmg: 18 * P, hk: 'puncture', poise: 70, o: { stun: 0.8 }, pierce: true, r: 0.6, life: 0.7, elem: LIGHT,
      draw: (cc, s) => { const ax = s.vx / v, ay = s.vy / v, az = s.vz / v; spear3(cc, s.x - ax * 1.2, s.y - ay * 1.2, s.z - az * 1.2, ax, ay, az, 2.4, LIGHT, 2, 10); cc.fx(FX.TRAIL, LIGHT, s.x - ax * 1.2, s.y - ay * 1.2, s.z - az * 1.2, 0.14, -ax, -ay, -az, 3, 0.8); cc.fx(FX.FLARE, LIGHT, s.x + ax * 1.2, s.y + ay * 1.2, s.z + az * 1.2, 0.35, 0, 1, 0, 0, 1); },
      onHit: (k) => { if (h.fxOk()) c.burst(FX.SHOCK, LIGHT, k.x, k.y + 1.1, k.z, 0.2, 1, 0.2, { light: 8, lightR: 4 }); } });
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  }, { mask: 'upper' });
};
// The board into the ground: a ring of force, and boards of light flung out every way. What it throws back is his.
CAST.bulwark_nova = (h, sim, m, { w, c, P, rk }) => {
  h.shieldTarget = 1;
  h.startSwing('Shield_OneShot', 1.0, [0.42], () => {
    const r = 4.2 + 0.2 * rk;
    for (const k of w.blast(h, h.x, h.z, h.y, r, 12 * P, { kind: 'bash', poise: 90, stun: 1.2, shove: 8 })) taunt(sim, h, k, 6);
    for (const k of foesIn(w, h.x, h.z, 8)) taunt(sim, h, k, 5);
    if (h.fxOk()) {
      c.burst(FX.SHOCK, STORM, h.x, h.y + 0.5, h.z, 0.5, r * 1.2, 0.4, { light: 16, lightR: 8 });
      c.burst(FX.RING, STORM, h.x, h.y + 0.05, h.z, 0.5, r, 0.5);
      zone(w, h, 0.45, (cc, q) => { const k = q.t / 0.45; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; cc.fx(FX.KITE, i % 2 ? FROST : STORM, h.x + Math.sin(a) * (0.8 + k * r), h.y + 1, h.z + Math.cos(a) * (0.8 + k * r), 0.4 + k * 0.5, Math.sin(a), 0, Math.cos(a), 0, 1 - k, 0, 0, 0.3, i); } });
      hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.8); hfx(sim, HFX.SPARKS, h.x, h.y + 0.6, h.z, 50);
    }
    sim.event(EV.GROUND, h.x, h.y, h.z);
  }, { still: true });
};
// The lance's light let go down its whole length and eight metres past it.
CAST.lance_of_light = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  h.startSwing('Sword_Regular_C', 0.85, [0.33], () => {
    const p = h.handPos('r'), ax = Math.sin(h.yaw), az = Math.cos(h.yaw), len = 11;
    const hit = w.line(h, h.x, h.z, h.yaw, len, 0.65, 22 * P, { kind: 'puncture', poise: 70, knock: 3 });
    if (h.fxOk()) {
      c.burst(FX.BEAM, STORM, p[0], p[1], p[2], 0.5, 0.2, 0.45, { ax, ay: 0, az, len, extra: 0.35 });
      c.burst(FX.BEAM, LIGHT, p[0], p[1], p[2], 0.2, 0.04, 0.45, { ax, ay: 0, az, len, extra: 0.1, light: 14, lightR: 8 });
      c.burst(FX.SHOCK, STORM, p[0] + ax * 0.8, p[1], p[2] + az * 0.8, 0.2, 1, 0.3);
      c.burst(FX.FLARE, LIGHT, p[0] + ax * len, p[1], p[2] + az * len, 0.5, 1.4, 0.3);
      for (const k of hit) c.burst(FX.FLARE, STORM, k.x, k.y + 1.1, k.z, 0.3, 0.9, 0.2);
    }
    sim.event(EV.WHOOSH, p[0], p[1], p[2]);
  }, { still: true });
};
// Up, board first, and down among them: the ground rings, and everything near is his.
const VALIANT = { T: 0.7, apex: 2.6, r: 3, dmg: 16, elem: STORM, air: 'NinjaJump_Idle_Loop', hang: true, o: { stun: 0.9 },
  tick: (h, sim) => { h.shieldTarget = 1; },
  draw: (c, h) => { const s = Math.sin(h.yaw), co = Math.cos(h.yaw); c.fx(FX.KITE, STORM, h.x + s * 0.7, h.y + 0.9, h.z + co * 0.7, 0.7, s, -0.5, co, 0, 0.8, 6, 5, 0.3, 0); c.fx(FX.TRAIL, STORM, h.x, h.y + 1, h.z, 0.25, -s, 0.4, -co, 2.2, 0.7); } };
CAST.valiant_leap = (h, sim, m, { w, c }) => {
  h.leap(sim, m, { ...VALIANT, land: (hh, s2, j, fx, fz) => {
    for (const k of w.blast(h, fx, fz, h.y, 3, 16 * h.power(), { kind: 'bash', poise: 80, stun: 0.9, shove: 6 })) taunt(sim, h, k, 6);
    for (const k of foesIn(w, h.x, h.z, 7)) taunt(sim, h, k, 5);
    if (h.fxOk()) { c.burst(FX.SHOCK, STORM, h.x, h.y + 0.3, h.z, 0.4, 3.8, 0.4, { light: 14, lightR: 7 }); c.burst(FX.RING, STORM, h.x, h.y + 0.05, h.z, 0.4, 3.5, 0.5); hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.7); }
    sim.event(EV.GROUND, h.x, h.y, h.z);
  } });
};
// Three runs, one after another, each through whoever's nearest that he hasn't yet run through.
CAST.phalanx_rush = (h, sim, m, { w, c, yaw }) => {
  const seen = new Set();
  const go = (k, left) => {
    if (h.dead || !E.fightable(k)) return;
    seen.add(k);
    h.shieldTarget = 1;
    dash(h, sim, dirTo(h, k), Math.min(8, dist(h, k) + 2.2), { v: 18, clip: 'Shield_Dash', dmg: 12, o: { stun: 0.5 },
      draw: (cc) => { const p = h.handPos('r'), s = Math.sin(h.yaw), co = Math.cos(h.yaw); cc.fx(FX.BEAM, STORM, p[0], p[1], p[2], 0.09, s, 0, co, 3, 1, 6, 4, 0, 0, 0.03); cc.fx(FX.TRAIL, STORM, h.x, h.y + 1, h.z, 0.3, -s, 0, -co, 3, 0.7); cc.fx(FX.KITE, FROST, h.x - s * 1.4, h.y + 1, h.z - co * 1.4, 0.6, s, 0, co, 0, 0.35, 0, 0, 0.3, 0); },
      done: () => { const nx = left > 0 && nearest(w, h.x, h.z, 8, seen); if (nx) w.later(0.08, () => go(nx, left - 1)); else if (left > 0 && E.fightable(k)) w.later(0.08, () => { seen.delete(k); go(k, 0); }); } });
  };
  go(m, 2);
};
// Spears of stone and light up out of the ground in a row before him.
CAST.spear_wall = (h, sim, m, { w, c, P, rk, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  h.startSwing('Sword_Regular_C', 0.9, [0.33], () => {
    const n = 7 + rk, s = Math.sin(h.yaw), co = Math.cos(h.yaw), pts = [];
    for (let i = 0; i < n; i++) { const u = (i / (n - 1) - 0.5) * 2, f = 2.2 + (1 - u * u) * 1.6 + (i % 2) * 0.7, x = h.x + s * f + co * u * 2.6, z = h.z + co * f - s * u * 2.6; pts.push([x, sim.world.height(x, z), z, i * 0.03, rand(1.5, 2.3)]); }
    w.blast(h, h.x + s * 3, h.z + co * 3, h.y, 3, 14 * P, { kind: 'puncture', poise: 80, stun: 1 });
    zone(w, h, 1.3, (cc, q) => {
      for (const [x, y, z, t0, L] of pts) {
        const u = clamp((q.t - t0) / 0.14, 0, 1), fade = q.t > 1 ? 1 - (q.t - 1) / 0.3 : 1;
        if (u <= 0) continue;
        cc.fx(FX.SPIKE, STORM, x, y - L * (1 - u) - 0.1, z, 0.2, s * 0.25, 1, co * 0.25, L * fade, 1, 0, 0, clamp(q.t / 1.2, 0, 1), x + z);
      }
    });
    if (h.fxOk()) { c.burst(FX.RING, STORM, h.x + s * 3, h.y + 0.05, h.z + co * 3, 0.5, 3.2, 0.5); hfx(sim, HFX.THUD, h.x + s * 3, h.y, h.z + co * 3, 0.6); }
    sim.event(EV.GROUND, h.x + s * 3, h.y, h.z + co * 3);
  }, { still: true });
};
// The Order rides: five lancers of light out from behind him in a wedge, through everything before them.
CAST.charge_of_the_order = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  h.startSwing('LP_Pointing_at_an_enemy', 1.4, [0.3], () => {
    const s = Math.sin(yaw), co = Math.cos(yaw), riders = [];
    for (let i = 0; i < 5; i++) { const k = i - 2; riders.push({ x: h.x - s * (3.5 + Math.abs(k) * 1.2) + co * k * 1.5, z: h.z - co * (3.5 + Math.abs(k) * 1.2) - s * k * 1.5, hit: new Set() }); }
    h.guardT = Math.max(h.guardT, 6);
    if (h.fxOk()) { c.burst(FX.RING, STORM, h.x, h.y + 0.05, h.z, 0.5, 4, 0.6); hfx(sim, HFX.CHIME, h.x, h.y + 1.5, h.z, -7, 0.8); }
    sim.event(EV.ROAR, h.x, h.y + 1.6, h.z, 0.5);
    zone(w, h, 1.15, (cc, q) => {
      const k = Math.min(1, q.t * 5, (1.15 - q.t) * 4);
      for (const r of riders) {
        const y = sim.world.height(r.x, r.z);
        cc.fx(FX.KITE, FROST, r.x, y + 1.5, r.z, 0.75, s, 0, co, 0, 0.8 * k, 0, 0, 0.3, 0);
        cc.fx(FX.BEAM, STORM, r.x, y + 1.3, r.z, 0.1, s, -0.05, co, 3.4, k, 6 * k, 4, 0, 0, 0.03);
        cc.fx(FX.FLARE, LIGHT, r.x + s * 3.4, y + 1.15, r.z + co * 3.4, 0.3, 0, 1, 0, 0, k);
        cc.fx(FX.TRAIL, SPIRIT, r.x, y + 0.9, r.z, 0.5, -s, 0, -co, 3.5, 0.5 * k);
        cc.fx(FX.PUFF, SPIRIT, r.x - s * 0.8, y + 0.4, r.z - co * 0.8, 0.7, 0, 1, 0, 0, 0.3 * k, 0, 0, q.t, r.x);
      }
    }, (q, dt) => {
      for (const r of riders) {
        r.x += s * 13 * dt; r.z += co * 13 * dt;
        for (const k of w.targets) {
          if (!E.fightable(k) || r.hit.has(k) || Math.hypot(k.x - r.x - s * 1.5, k.z - r.z - co * 1.5) > 1.3 + E.radiusOf(k)) continue;
          r.hit.add(k);
          h.hit(sim, k, 20 * P, 'puncture', 90, 0, { stun: 1, shove: 6, fromX: r.x, fromZ: r.z });
          if (h.fxOk()) c.burst(FX.SHOCK, STORM, k.x, k.y + 1.1, k.z, 0.3, 1.4, 0.25, { light: 10, lightR: 5 });
        }
      }
    });
  }, { still: true, end: 0.6 });
};

// ---- archer: arrows that do more than fly ------------------------------------------------------------------------------

// An arrow of this file's: off the bow hand at the foe. o as shot(), plus spread.
function arrow(h, sim, m, o) {
  const w = sim.heroWorld, hp = h.handPos('l'), v = o.v || 46;
  const a = Math.atan2(m.x - hp[0], m.z - hp[2]) + (o.spread || 0), d = Math.hypot(m.x - hp[0], m.z - hp[2]), t = d / v, ty = m.y + (m instanceof E.Gravehart ? 1.8 : 1.1);
  h.draw = 0;
  sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  const elem = o.elem ?? h.stringElem;
  return shot(w, h, { x: hp[0], y: hp[1], z: hp[2], vx: Math.sin(a) * v, vy: (ty - hp[1]) / Math.max(t, 0.05) + (o.grav ?? 5) * 0.5 * t, vz: Math.cos(a) * v, grav: o.grav ?? 5, hk: 'puncture', life: 1.6, r: 0.4, elem,
    draw: (cc, s) => { const vv = Math.hypot(s.vx, s.vy, s.vz) || 1; cc.fx(FX.TRAIL, elem, s.x, s.y, s.z, 0.04 * (o.fat || 1), -s.vx / vv, -s.vy / vv, -s.vz / vv, 1.1 * (o.fat || 1), 1, 1.5, 2); o.more?.(cc, s, vv); }, ...o });
}
// Draw and loose, with whatever the arrow is.
function bowShot(h, sim, rate, fn) { h.aimT = 0; h.draw = 1; h.startSwing('Spell_Simple_Shoot', rate, [0.55], fn, { still: true, mask: 'upper' }); }

// A backward somersault out of reach, three arrows loosed from the top of it.
const BACKFLIP = { T: 0.62, apex: 1.9, flip: -1, back: true, r: 0, dmg: 0, air: 'NinjaJump_Idle_Loop', hang: true, rest: 0.22, land: (h, sim) => { sim.event(EV.LAND, h.x, h.y, h.z, 0.5); if (h.fxOk()) sim.casting.burst(FX.RING, SPIRIT, h.x, h.y + 0.05, h.z, 0.2, 1, 0.3); } };
function leapAway(h, sim, m, far, L, mid) {
  const away = Math.atan2(h.x - m.x, h.z - m.z);
  let to = null;
  for (const da of [0, 0.5, -0.5, 1, -1]) { to = spotAt(h, sim, h.x, h.z, away + da, far); if (to) break; }
  if (!to) return false;
  let done = false;
  h.leap(sim, m, { ...L, tick: (hh, s2, j) => { if (!done && j.u > 0.45) { done = true; mid?.(); } }, draw: (c) => { c.fx(FX.TRAIL, SPIRIT, h.x, h.y + 1, h.z, 0.2, Math.sin(away + Math.PI), 0.3, Math.cos(away + Math.PI), 1.6, 0.5); } }, { to });
  return true;
}
CAST.disengage = (h, sim, m, { P }) => {
  if (!leapAway(h, sim, m, 6.5, BACKFLIP, () => { for (let i = -1; i <= 1; i++) if (E.fightable(m)) h.loose(sim, m, i * 0.12, 7 * P, i !== 0); })) h.gcd = 0.1;
};
CAST.piercing_arrow = (h, sim, m, { c, P, rk }) => bowShot(h, sim, 0.8, () => {
  arrow(h, sim, m, { v: 64, grav: 1, dmg: 13 * P, pierce: 3 + rk, fat: 2, life: 0.6, more: (cc, s, vv) => { cc.fx(FX.BEAM, h.stringElem, s.x, s.y, s.z, 0.05, -s.vx / vv, -s.vy / vv, -s.vz / vv, 4, 0.7, 4, 3, 0, 0, 0.01); },
    onHit: (k) => { if (h.fxOk()) c.burst(FX.SHOCK, h.stringElem, k.x, k.y + 1.1, k.z, 0.15, 0.8, 0.18); } });
});
// One arrow that parts in the air into three or four, each finding its own mark.
CAST.split_shot = (h, sim, m, { w, c, P, rk }) => bowShot(h, sim, 0.85, () => {
  arrow(h, sim, m, { dmg: 6 * P, life: 0.16, fat: 1.5, onEnd: (s, hitM) => {
    if (hitM) return;
    const n = 3 + Math.floor(rk / 2), marks = [m, ...foesIn(w, m.x, m.z, 6).filter((k) => k !== m)];
    if (h.fxOk()) c.burst(FX.GLYPH, h.stringElem, s.x, s.y, s.z, 0.2, 0.9, 0.2, { ay: 0, extra: GLYPHS.SPARK, light: 6, lightR: 4 });
    for (let i = 0; i < n; i++) {
      const k = marks[i % marks.length], a = Math.atan2(s.vx, s.vz) + (i - (n - 1) / 2) * 0.16, v = 40;
      shot(w, h, { x: s.x, y: s.y, z: s.z, vx: Math.sin(a) * v, vy: s.vy * 0.5 + 2, vz: Math.cos(a) * v, homing: 5, foe: k, dmg: 8 * P, hk: 'puncture', life: 1.1, r: 0.4, elem: h.stringElem,
        draw: (cc, q) => { const vv = Math.hypot(q.vx, q.vy, q.vz) || 1; cc.fx(FX.TRAIL, h.stringElem, q.x, q.y, q.z, 0.035, -q.vx / vv, -q.vy / vv, -q.vz / vv, 0.9, 1, 1.5, 2); } });
    }
  } });
});
// An arrow that bends after its mark, winding as it goes.
CAST.guided_arrow = (h, sim, m, { c, P }) => bowShot(h, sim, 0.85, () => {
  arrow(h, sim, m, { v: 30, grav: 0, spread: pick([-0.5, 0.5]), homing: 6, foe: m, dmg: 16 * P, life: 2, pierce: 1, fat: 1.6, elem: SPIRIT,
    more: (cc, s) => { for (const k of [0, Math.PI]) { const a = s.t * 16 + k; cc.fx(FX.ORB, SPIRIT, s.x + Math.cos(a) * 0.14, s.y + Math.sin(a) * 0.14, s.z, 0.05, 0, 1, 0, 0, 0.9); } cc.fx(FX.GLYPH, SPIRIT, s.x, s.y, s.z, 0.2, 0, 0, 0, s.t * 10, 0.8, 0, 0, 0, 0, GLYPHS.STAR4); },
    onHit: (k) => { if (h.fxOk()) c.burst(FX.FLARE, SPIRIT, k.x, k.y + 1.1, k.z, 0.3, 0.9, 0.2, { light: 6, lightR: 4 }); } });
});
// Fire where it lands, and fire left on the ground.
function firePatch(h, sim, x, z, r, life, dps) {
  const w = sim.heroWorld, y = sim.world.height(x, z);
  let tick = 0;
  zone(w, h, life, (cc, q) => {
    const k = Math.min(1, q.t * 4, (life - q.t) * 1.5);
    cc.fx(FX.DISC, FIRE, x, y + 0.04, z, r, 0, 1, 0, 0, 0.7 * k, 6 * k, r * 2);
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; cc.fx(FX.FLAME, FIRE, x + Math.sin(a) * r * 0.5, y, z + Math.cos(a) * r * 0.5, 0.9 * k, 0, 1, 0, 0.7, k, 0, 0, 0, i * 0.3 + x); }
  }, (q, dt) => {
    if ((tick -= dt) > 0) return;
    tick += 0.5;
    for (const k of foesIn(w, x, z, r)) h.hit(sim, k, dps * 0.5, 'burn', 5, 0, { dot: true });
  });
}
CAST.explosive_arrow = (h, sim, m, { w, c, P, rk }) => bowShot(h, sim, 0.8, () => {
  arrow(h, sim, m, { dmg: 5 * P, elem: FIRE, fat: 1.8, more: (cc, s) => cc.fx(FX.ORB, FIRE, s.x, s.y, s.z, 0.14, 0, 1, 0, 0, 1, 5, 4), onEnd: (s) => {
    const y = sim.world.height(s.x, s.z), r = 2.4 + 0.15 * rk;
    w.blast(h, s.x, s.z, y, r, 15 * P, { kind: 'burn', poise: 60, shove: 5 });
    firePatch(h, sim, s.x, s.z, r * 0.75, 3, 5 * P);
    if (h.fxOk()) { c.burst(FX.SHOCK, FIRE, s.x, s.y + 0.3, s.z, 0.4, r * 1.2, 0.35, { light: 18, lightR: 9 }); c.burst(FX.FLAME, FIRE, s.x, y, s.z, 1.2, 2.6, 0.5, { len: 1.8 }); c.burst(FX.PUFF, FIRE, s.x, y + 1, s.z, 0.6, 2, 0.8, { alpha: 0.6 }); hfx(sim, HFX.THUD, s.x, y, s.z, 0.6); }
  } });
});
// Ice where it lands: what's near is held in it, and slowed after.
CAST.frost_arrow = (h, sim, m, { w, c, P, rk }) => bowShot(h, sim, 0.8, () => {
  arrow(h, sim, m, { dmg: 5 * P, elem: FROST, fat: 1.8, more: (cc, s) => cc.fx(FX.GLYPH, FROST, s.x, s.y, s.z, 0.22, 0, 0, 0, s.t * 9, 0.9, 3, 3, 0, 0, GLYPHS.STAR6), onEnd: (s) => {
    const y = sim.world.height(s.x, s.z), r = 2.5 + 0.15 * rk;
    for (const k of w.blast(h, s.x, s.z, y, r, 9 * P, { kind: 'gash', poise: 40 })) { daze(sim, w, k, 1.5); slow(sim, k, 3.5); }
    if (h.fxOk()) {
      c.burst(FX.SHOCK, FROST, s.x, y + 0.3, s.z, 0.3, r * 1.1, 0.35, { light: 12, lightR: 7 });
      c.burst(FX.DISC, FROST, s.x, y + 0.04, s.z, r, r, 3, { alpha: 0.8 });
      for (let i = 0; i < 9; i++) { const a = i * 0.7, q = i < 3 ? 0.3 : r * 0.7; c.burst(FX.ICE, FROST, s.x + Math.sin(a) * q, y - 0.1, s.z + Math.cos(a) * q, 0.14, 0.1, 1.6, { ax: Math.sin(a) * 0.35, ay: 0.93, az: Math.cos(a) * 0.35, len: rand(0.8, 1.6) }); }
    }
  } });
});
// Drawn long, the light gathering at the arrow's head; then it's simply there, and the line it took is lit behind it.
CAST.sniper_shot = (h, sim, m, { w, c, P }) => {
  h.aimT = 0; h.draw = 1;
  const z0 = zone(w, h, 1.15, (cc, q) => {
    const hp = h.handPos('l'), k = Math.min(1, q.t / 1.05);
    cc.fx(FX.ORB, h.stringElem, hp[0], hp[1], hp[2], 0.05 + 0.16 * k, 0, 1, 0, 0, 1, 8 * k, 4);
    cc.fx(FX.RUNE, h.stringElem, h.x, h.y + 0.06, h.z, 1.1, 0, 1, 0, 0, 0.7 * k);
    if (E.fightable(m)) cc.fx(FX.BEAM, h.stringElem, hp[0], hp[1], hp[2], 0.008, (m.x - hp[0]) / (dist(h, m) || 1), (m.y + 1.1 - hp[1]) / (dist(h, m) || 1), (m.z - hp[2]) / (dist(h, m) || 1), dist(h, m), 0.5 * k, 0, 0, 0, 0, 0.008);
  });
  h.startSwing('Spell_Simple_Shoot', 0.36, [0.78], () => {
    z0.done = true;
    if (!E.fightable(m)) return;
    const hp = h.handPos('l'), dx = m.x - hp[0], dy = m.y + 1.1 - hp[1], dz = m.z - hp[2], L = Math.hypot(dx, dy, dz) || 1;
    h.hit(sim, m, 32 * P * (L > 12 ? 1.5 : 1), 'puncture', 100, 0, { shove: 6, stun: 0.6 });
    h.draw = 0;
    if (h.fxOk()) {
      c.burst(FX.BEAM, h.stringElem, hp[0], hp[1], hp[2], 0.12, 0.01, 0.5, { ax: dx / L, ay: dy / L, az: dz / L, len: L, extra: 0.05, light: 10, lightR: 6 });
      c.burst(FX.SHOCK, h.stringElem, m.x, m.y + 1.1, m.z, 0.3, 1.8, 0.3, { light: 16, lightR: 8 });
      c.burst(FX.GLYPH, h.stringElem, m.x, m.y + 1.1, m.z, 0.5, 1.8, 0.3, { ay: 0, extra: GLYPHS.SPARK });
      c.burst(FX.SHOCK, h.stringElem, hp[0], hp[1], hp[2], 0.2, 0.9, 0.2);
    }
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  }, { still: true, mask: 'upper', cut: () => { z0.done = true; } });
};
// An arrow that leaps from one to the next, a line of light drawn between each: a constellation of them.
CAST.chain_shot = (h, sim, m, { w, c, P, rk }) => bowShot(h, sim, 0.85, () => {
  const s0 = arrow(h, sim, m, { dmg: 10 * P, bounce: 3 + rk, hop: 8, fat: 1.5, elem: SPIRIT, grav: 0, v: 40, more: (cc, s) => cc.fx(FX.GLYPH, SPIRIT, s.x, s.y, s.z, 0.25, 0, 0, 0, s.t * 9, 1, 3, 3, 0, 0, GLYPHS.STAR4),
    onHit: (k, s) => {
      if (h.fxOk()) {
        if (s.last) { const dx = k.x - s.last[0], dy = k.y + 1.1 - s.last[1], dz = k.z - s.last[2], L = Math.hypot(dx, dy, dz) || 1; c.burst(FX.BEAM, SPIRIT, s.last[0], s.last[1], s.last[2], 0.03, 0.03, 0.9, { ax: dx / L, ay: dy / L, az: dz / L, len: L, extra: 0.03 }); }
        c.burst(FX.GLYPH, SPIRIT, k.x, k.y + 1.3, k.z, 0.35, 0.6, 0.9, { ay: 0, extra: GLYPHS.STAR4, light: 6, lightR: 4 });
      }
      s.last = [k.x, k.y + 1.1, k.z];
    } });
  s0.last = null;
});
// The sky full of them: forty and more, over a wide ring, for three seconds.
CAST.arrow_storm = (h, sim, m, { w, c, rk }) => {
  const cx = m.x, cz = m.z, cy = sim.world.height(cx, cz);
  bowShot(h, sim, 0.8, () => {
    const hp = h.handPos('l');
    for (let i = 0; i < 3; i++) w.shots.push({ kind: 'arrow', owner: h, x: hp[0], y: hp[1], z: hp[2], vx: (i - 1) * 2, vy: 32, vz: 0, t: 0, dmg: 0, elem: h.stringElem, up: true });
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
    if (h.fxOk()) { c.burst(FX.RING, h.stringElem, cx, cy + 0.05, cz, 0.5, 4.2, 3.2); c.burst(FX.RUNE, h.stringElem, cx, cy + 0.06, cz, 4.2, 4.2, 3.2, { alpha: 0.6 }); }
    w.zones.push({ kind: 'rain', owner: h, x: cx, z: cz, y: cy, r: 4.2, t: -0.5, life: 3, n: 36 + 4 * rk, dropped: 0, elem: h.stringElem });
  });
};
// It opens where it lands: a hole in the world that draws them in, and then lets go all at once.
CAST.black_hole_arrow = (h, sim, m, { w, c, P, rk }) => bowShot(h, sim, 0.75, () => {
  arrow(h, sim, m, { dmg: 4 * P, elem: VOID, fat: 2, more: (cc, s) => cc.fx(FX.VORTEX, VOID, s.x, s.y, s.z, 0.25, 0, 1, 0, 0, 1, 4, 4), onEnd: (s) => {
    const x = s.x, z = s.z, y = sim.world.height(x, z) + 1.1, life = 3;
    let tick = 0, burst = false;
    zone(w, h, life + 0.1, (cc, q) => {
      const k = Math.min(1, q.t * 3), end = q.t > life - 0.25 ? 1 + (q.t - life + 0.25) * 6 : 1;
      cc.fx(FX.VORTEX, VOID, x, y, z, 1.5 * k * end, 0, 1, 0, 0, 1, 10, 8, 0, x);
      cc.fx(FX.RING, VOID, x, y - 1.05, z, 5 * (1 - (q.t * 0.8) % 1), 0, 1, 0, 0, 0.6 * k);
      for (let i = 0; i < 6; i++) { const a = q.t * 3 + i * 1.05, r = 4.5 * (1 - ((q.t * 0.7 + i * 0.17) % 1)); cc.fx(FX.GLYPH, ARCANE, x + Math.sin(a) * r, y + Math.sin(a * 2) * 0.5, z + Math.cos(a) * r, 0.14, 0, 0, 0, a, 0.8 * k, 0, 0, 0, i, GLYPHS.STAR4); }
    }, (q, dt) => {
      for (const k of foesIn(w, x, z, 5)) { const d = Math.hypot(k.x - x, k.z - z) || 1; if (d > 0.8 && E.radiusOf(k) <= 1.2 && !k.boss) sim.casting.shove(k, (x - k.x) / d * 26 * dt, (z - k.z) / d * 26 * dt); }
      if ((tick -= dt) <= 0) { tick += 0.4; for (const k of foesIn(w, x, z, 4)) h.hit(sim, k, 2 * P, 'burn', 5, 0, { dot: true }); }
      if (!burst && q.t >= life) {
        burst = true;
        w.blast(h, x, z, y - 1.1, 4 + 0.2 * rk, 24 * P, { kind: 'bash', poise: 90, shove: 8, stun: 0.8 });
        if (h.fxOk()) { c.burst(FX.SHOCK, VOID, x, y, z, 0.5, 5.5, 0.45, { light: 22, lightR: 10 }); c.burst(FX.SHOCK, ARCANE, x, y, z, 0.3, 3.5, 0.6); c.burst(FX.RING, VOID, x, y - 1.05, z, 0.5, 5, 0.5); hfx(sim, HFX.THUD, x, y - 1.1, z, 1); }
      }
    });
  } });
});

// ---- rogue: over them, through them, and the blood everywhere ---------------------------------------------------------

// The colours a rogue's knives leave in the air, one for each hand, changing as he turns.
function flipTrails(c, h, t, k = 1) {
  for (const [side, o] of [['l', 0], ['r', 3]]) {
    const p = h.handPos(side), e = RAINBOW[(Math.floor(t * 9) + o) % RAINBOW.length];
    c.fx(FX.ORB, e, p[0], p[1], p[2], 0.09, 0, 1, 0, 0, k, 3, 2);
    c.fx(FX.TRAIL, e, p[0], p[1], p[2], 0.11, -Math.sin(h.yaw), 0.2, -Math.cos(h.yaw), 1.3, 0.9 * k);
  }
  c.fx(FX.GLYPH, RAINBOW[Math.floor(t * 9) % RAINBOW.length], h.x, h.y + 1, h.z, 1.1, Math.cos(h.yaw), 0, -Math.sin(h.yaw), -h.bodyFlip, 0.5 * k, 0, 0, 0, 0, GLYPHS.CRESCENT);
}
// A cut that throws blood: the foe's, out along the blow and every way.
function gore(sim, h, m, k = 0.7, n = 1) {
  const a0 = dirTo(h, m);
  for (let i = 0; i < n; i++) { const a = n === 1 ? a0 + rand(-0.4, 0.4) : i * TAU / n + rand(-0.2, 0.2); blood(sim, m, Math.sin(a), Math.cos(a), k); }
}
// Backward over himself and away, three knives thrown from the top of it. Then he comes back.
CAST.backflip = (h, sim, m, { P }) => {
  h.combo = 0;
  if (dist(h, m) - E.radiusOf(m) < 2 && E.fightable(m)) { h.hit(sim, m, 7 * P * h.backstab(sim, m), 'gash', 20, 0, { bleed: true }); gore(sim, h, m, 0.4); }
  if (!leapAway(h, sim, m, 5.5, { ...BACKFLIP, draw: (c) => flipTrails(c, h, sim.time) }, () => { for (let i = -1; i <= 1; i++) if (E.fightable(m)) knife(h, sim, dirTo(h, m) + i * 0.16, 5 * P, i + 1); })) h.gcd = 0.1;
};
// A knife thrown: it bites, and what it bites bleeds.
function knife(h, sim, a, dmg, i = 0, v = 22) {
  const w = sim.heroWorld, hp = h.handPos(i % 2 ? 'l' : 'r');
  shot(w, h, { x: hp[0], y: hp[1], z: hp[2], vx: Math.sin(a) * v, vy: 0.6, vz: Math.cos(a) * v, grav: 2, dmg, o: { bleed: true }, life: 0.5, r: 0.4, elem: SPIRIT,
    onHit: (k) => blood(sim, k, Math.sin(a), Math.cos(a), 0.35),
    draw: (c, s) => { c.fx(FX.BLADE, RAINBOW[i % RAINBOW.length], s.x - Math.sin(a) * 0.2, s.y, s.z - Math.cos(a) * 0.2, 0.05, Math.sin(a), 0.05, Math.cos(a), 0.45, 1, 0, 0, 0, i); c.fx(FX.TRAIL, RAINBOW[i % RAINBOW.length], s.x, s.y, s.z, 0.03, -Math.sin(a), 0, -Math.cos(a), 0.8, 0.7); } });
}
// A forward somersault onto it, both knives coming down as he lands.
CAST.flip_strike = (h, sim, m, { w, c }) => {
  h.leap(sim, m, { T: 0.55, apex: 2.3, flip: 1, r: 1.8, dmg: 0, air: 'NinjaJump_Idle_Loop', hang: true, rest: 0.25, landClip: 'L_Chop', landRate: 2.2, short: 1.1,
    draw: (cc) => flipTrails(cc, h, sim.time),
    land: (hh, s2, j) => {
      const k = j.aimAt, P = h.power();
      if (E.fightable(k) && dist(h, k) < 2.6 + E.radiusOf(k)) { h.hit(sim, k, 15 * P * h.backstab(sim, k), 'gash', 70, 0, { bleed: true, stun: 0.4 }); gore(sim, h, k, 0.8); }
      w.blast(h, h.x, h.z, h.y, 1.8, 5 * P, { kind: 'gash', poise: 30, skip: k, bleed: true });
      if (h.fxOk()) { crescent(c, h, 1.8, pick(RAINBOW), { up: 0.9 }); crescent(c, h, 1.8, pick(RAINBOW), { up: 0.9, turn: 0.5 }); c.burst(FX.RING, DRAIN, h.x, h.y + 0.05, h.z, 0.2, 1.6, 0.3); }
      sim.event(EV.LAND, h.x, h.y, h.z, 0.7);
      h.combo = 1;
    } });
};
// Round on his heel, a knife off his hand at every point of the turn.
CAST.fan_of_knives = (h, sim, m, { c, P, rk }) => {
  const n = 8 + 2 * rk, y0 = h.yaw;
  let thrown = 0;
  h.startSwing('Sword_Attack', 1.5, [0.9], () => {}, { end: 0.62, tick: (dt, f) => {
    const u = clamp(f / 0.6, 0, 1), want = Math.floor(u * n);
    h.yaw = h.faceYaw = wrapAngle(y0 + u * TAU);
    while (thrown < want) { knife(h, sim, y0 + thrown * TAU / n, 5 * P, thrown, 18); thrown++; }
  }, cut: () => { h.yaw = h.faceYaw = y0; } });
  if (h.fxOk()) c.burst(FX.RING, SPIRIT, h.x, h.y + 0.05, h.z, 0.3, 3, 0.5);
  sim.event(EV.WHOOSH, h.x, h.y + 1.2, h.z);
};
// Opened from hip to shoulder: it runs, and goes on running, and throws its blood about for as long as it does.
CAST.rupture = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('L_Slash', 1.2, [0.65], () => {
    if (!E.fightable(m) || dist(h, m) > 2.6 + E.radiusOf(m)) return;
    const dmg = 16 * P * h.backstab(sim, m);
    h.hit(sim, m, dmg, 'gash', 60, 0, {});
    w.bleed(h, m, dmg * (0.4 + 0.05 * rk));
    gore(sim, h, m, 1, 3);
    if (h.fxOk()) { crescent(c, h, 1.9, DRAIN, { up: 0.8, life: 0.3, light: 6 }); c.burst(FX.SHOCK, DRAIN, m.x, m.y + 1.1, m.z, 0.2, 1.2, 0.25); }
    let next = 0.35;
    zone(w, h, 3, (cc, q) => { if (E.fightable(m)) cc.fx(FX.DISC, DRAIN, m.x, m.y + 0.04, m.z, 0.5 + q.t * 0.35, 0, 1, 0, 0, 0.5 * Math.min(1, (3 - q.t) * 2)); },
      (q) => { if (q.t < next || !E.fightable(m)) return; next += 0.45; const a = rand(0, TAU); blood(sim, m, Math.sin(a), Math.cos(a), 0.55); });
  }, { lunge: 1.8 });
};
// A cartwheel through the air where he stands, both knives out: everything round him is cut three times.
CAST.whirling_blades = (h, sim, m, { w, c, P }) => {
  let cuts = 0;
  const e1 = pick(RAINBOW), e2 = pick(RAINBOW);
  h.leap(sim, m, { T: 0.6, apex: 1.3, roll: 1, spin: 1, r: 0, dmg: 0, air: 'NinjaJump_Idle_Loop', rest: 0.2, crouch: 0.08,
    draw: (cc) => { flipTrails(cc, h, sim.time); cc.fx(FX.GLYPH, e1, h.x, h.y + 0.9, h.z, 2.2, 0, 1, 0, sim.time * 20, 0.8, 4, 3, 0, 0, GLYPHS.CRESCENT); cc.fx(FX.GLYPH, e2, h.x, h.y + 1.2, h.z, 2.0, 0, 1, 0, sim.time * 20 + Math.PI, 0.8, 0, 0, 0, 0, GLYPHS.CRESCENT); },
    tick: (hh, s2, j) => {
      if (j.u < (cuts + 1) / 4) return;
      cuts++;
      for (const k of w.blast(h, h.x, h.z, h.y - h.air, 2.5, 6 * P, { kind: 'gash', poise: 30, bleed: true, quiet: cuts > 1 })) if (cuts === 2) gore(sim, h, k, 0.5);
      sim.event(EV.WHOOSH, h.x, h.y + 1, h.z);
    },
    land: () => { if (h.fxOk()) c.burst(FX.RING, e1, h.x, h.y + 0.05, h.z, 0.3, 2.4, 0.35); sim.event(EV.LAND, h.x, h.y, h.z, 0.5); } }, { to: [h.x, h.z] });
};
// Smoke at his own feet: what's in it can't see to strike, and he's out the far side of it.
CAST.smoke_bomb = (h, sim, m, { w, c }) => {
  h.startSwing('OverhandThrow', 1.8, [0.42], () => {
    w.zones.push({ kind: 'smoke', owner: h, x: h.x, z: h.z, y: h.y, t: 0, life: 4.5, r: 3.6, seed: rand(0, TAU) });
    for (const k of foesIn(w, h.x, h.z, 3.6)) { daze(sim, w, k, 1.4); slow(sim, k, 3); }
    if (h.fxOk()) { c.burst(FX.SHOCK, VOID, h.x, h.y + 0.4, h.z, 0.3, 3.4, 0.35); c.burst(FX.FLARE, SPIRIT, h.x, h.y + 0.5, h.z, 0.6, 1.6, 0.2, { light: 14, lightR: 7 }); }
    sim.event(EV.BLINK, h.x, h.y + 0.5, h.z);
    h.iframesT = 0.7; h.tumbleCd = 0; h.combo = 9;
  }, { mask: 'upper', end: 0.6 });
};
// From one to the next to the next, out of the smoke behind each with a cut, too fast to follow; and back where he began.
CAST.shadow_dance = (h, sim, m, { w, c, P, rk }) => {
  const marks = [m, ...foesIn(w, m.x, m.z, 8).filter((k) => k !== m)].slice(0, 3 + Math.floor(rk / 2)), home = [h.x, h.z];
  if (marks.length < 3) marks.push(marks[0]);
  h.iframesT = marks.length * 0.24 + 0.3; h.dodgeT = marks.length * 0.24 + 0.1;
  marks.forEach((k, i) => w.later(i * 0.24, () => {
    if (h.dead || !E.fightable(k)) return;
    const from = [h.x, h.y + 1, h.z], e = RAINBOW[(i * 3) % RAINBOW.length];
    blink(h, sim, ...behind(k, 0.9), VOID);
    h.yaw = h.faceYaw = dirTo(h, k);
    h.play(i % 2 ? 'Punch_Cross' : 'Punch_Jab', 2.2, 'full', 0.03);
    h.hit(sim, k, 11 * P * 1.8, 'gash', 50, 0, { bleed: true });
    gore(sim, h, k, 0.6);
    if (h.fxOk()) {
      const dx = h.x - from[0], dz = h.z - from[2], L = Math.hypot(dx, dz) || 1;
      c.burst(FX.BEAM, e, from[0], from[1], from[2], 0.12, 0.01, 0.3, { ax: dx / L, ay: 0, az: dz / L, len: L, extra: 0.02 });
      crescent(c, h, 1.6, e, { up: i % 2 ? 0.6 : 2.5, life: 0.25 });
    }
  }));
  w.later(marks.length * 0.24 + 0.05, () => { if (h.dead) return; blink(h, sim, home[0], home[1], VOID); if (E.fightable(m)) h.yaw = h.faceYaw = dirTo(h, m); h.combo = 0; });
};
// As high as a roof, twice over himself, and down on it point first.
CAST.death_from_above = (h, sim, m, { w, c }) => {
  h.leap(sim, m, { T: 0.95, apex: 5, flip: 2, r: 2.4, dmg: 0, air: 'NinjaJump_Idle_Loop', hang: true, rest: 0.35, landClip: 'L_Chop', landRate: 2, short: 0.9,
    draw: (cc) => { flipTrails(cc, h, sim.time, 1.2); cc.fx(FX.TRAIL, DRAIN, h.x, h.y + 1, h.z, 0.3, 0, 1, 0, 2.2, 0.6); },
    land: (hh, s2, j) => {
      const k = j.aimAt, P = h.power();
      if (E.fightable(k) && dist(h, k) < 2.8 + E.radiusOf(k)) { h.hit(sim, k, 30 * P * h.backstab(sim, k), 'puncture', 100, 0, { bleed: true, stun: 1 }); gore(sim, h, k, 1, 6); }
      w.blast(h, h.x, h.z, h.y, 2.4, 10 * P, { kind: 'bash', poise: 60, skip: k, shove: 5 });
      if (h.fxOk()) { c.burst(FX.SHOCK, DRAIN, h.x, h.y + 0.3, h.z, 0.4, 3, 0.4, { light: 14, lightR: 7 }); c.burst(FX.RING, DRAIN, h.x, h.y + 0.05, h.z, 0.3, 2.6, 0.45); crescent(c, h, 2.2, SPIRIT, { up: 1.2 }); hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.7); }
      sim.event(EV.GROUND, h.x, h.y, h.z);
      h.combo = 2;
    } });
};
// The last cut, for what's already bleeding or nearly down: it empties it.
CAST.eviscerate = (h, sim, m, { w, c, P }) => {
  h.startSwing('Sword_Regular_C', 1.1, [0.33], () => {
    if (!E.fightable(m) || dist(h, m) > 2.8 + E.radiusOf(m)) return;
    const bleeding = w.dots.some((d) => d.m === m);
    h.hit(sim, m, 26 * P * (bleeding ? 1.6 : 1) * h.backstab(sim, m), 'gash', 100, 0, { bleed: true });
    gore(sim, h, m, 1, 10);
    if (h.fxOk()) { c.burst(FX.SHOCK, DRAIN, m.x, m.y + 1, m.z, 0.3, 2.6, 0.4, { light: 12, lightR: 6 }); c.burst(FX.DISC, DRAIN, m.x, m.y + 0.04, m.z, 0.6, 2.2, 2.5, { alpha: 0.7 }); crescent(c, h, 2.1, DRAIN, { up: 0.4, life: 0.3 }); crescent(c, h, 2.1, DRAIN, { up: 2.6, life: 0.3 }); }
  }, { lunge: 2.2 });
};

// ---- ninja: stars of every kind, both blades, and his feet -------------------------------------------------------------

// Both blades, one after the other and then together: a crescent of a colour off each hand.
CAST.twin_fangs = (h, sim, m, { c, P }) => {
  h.startSwing('LP_box_03', 1.9, [0.14, 0.28, 0.42, 0.56, 0.72], (i) => {
    h.strikeAround(sim, 1.8, 1.0, (i === 4 ? 9 : 5) * P * h.backstab(sim, m), i === 4 ? 4 : 0, 2, { poise: i === 4 ? 50 : 15 });
    if (!h.fxOk()) return;
    if (i === 4) { crescent(c, h, 1.9, SPIRIT, { up: 0.7 }); crescent(c, h, 1.9, ARCANE, { up: 2.4 }); }
    else crescent(c, h, 1.7, i % 2 ? ARCANE : SPIRIT, { up: i % 2 ? 0.5 : 2.6, turn: i % 2 ? -0.3 : 0.3, life: 0.16 });
  }, { lunge: 1.6, end: 0.82 });
};
CAST.fire_star = (h, sim, m) => h.startSwing('OverhandThrow', 1.5, [0.42], () => { if (E.fightable(m)) throwStar(h, sim, m, 'fire', 0, 0, 1.5); }, { mask: 'upper' });
CAST.frost_star = (h, sim, m, { rk }) => h.startSwing('OverhandThrow', 1.5, [0.42], () => { if (E.fightable(m)) for (let i = -1; i <= 1; i++) throwStar(h, sim, m, 'frost', (i + 1) % 2, i * 0.13, 1.1 + 0.05 * rk); }, { mask: 'upper' });
CAST.storm_star = (h, sim, m) => h.startSwing('OverhandThrow', 1.5, [0.42], () => { if (E.fightable(m)) throwStar(h, sim, m, 'storm', 0, 0, 1.4); }, { mask: 'upper' });
CAST.spirit_star = (h, sim, m) => h.startSwing('OverhandThrow', 1.5, [0.42], () => { if (E.fightable(m)) for (const sp of [-0.5, 0.5]) throwStar(h, sim, m, 'spirit', sp > 0 ? 1 : 0, sp, 1.3); }, { mask: 'upper' });
// Round and round his foe at a run, a star off his hand every stride: every kind he has, one after another.
CAST.star_storm = (h, sim, m, { rk }) => {
  h.combo = 0; h.orbitCd = sim.time + 9;
  h.skirm = { mode: 'orbit', t: 2.4 + 0.15 * rk, a: Math.atan2(h.x - m.x, h.z - m.z), dir: h.r() < 0.5 ? 1 : -1, fire: 0.1, every: 0.17, r: 5.5, n: 0, rapid: true };
};
// Round on one foot, the other out level: everything in reach goes back.
CAST.spin_kick = (h, sim, m, { w, c, P }) => {
  const y0 = h.yaw;
  let struck = false;
  h.startSwing('LP_front_kick_01', 2.0, [0.9], () => {}, { end: 0.6, tick: (dt, f) => {
    const u = clamp((f - 0.12) / 0.4, 0, 1);
    h.yaw = h.faceYaw = wrapAngle(y0 + u * u * (3 - 2 * u) * TAU);
    if (!struck && u > 0.45) {
      struck = true;
      w.blast(h, h.x, h.z, h.y, 2.5, 9 * P, { kind: 'bash', poise: 60, shove: 7 });
      if (h.fxOk()) { c.burst(FX.SHOCK, SPIRIT, h.x, h.y + 0.9, h.z, 0.4, 2.8, 0.3, { light: 8, lightR: 5 }); crescent(c, h, 2.5, SPIRIT, { y: 0.9, life: 0.25 }); crescent(c, h, 2.5, SPIRIT, { y: 0.9, turn: Math.PI, life: 0.25 }); }
      sim.event(EV.WHOOSH, h.x, h.y + 1, h.z);
    }
  }, cut: () => { h.yaw = h.faceYaw = y0; } });
};
// Both blades out and turning, twice round, going through them as he turns.
CAST.whirlwind = (h, sim, m, { w, c, P, rk }) => {
  const y0 = h.yaw, turns = 2 + (rk > 3 ? 1 : 0);
  let cuts = 0;
  h.startSwing('LP_box_03', 0.95, [0.99], () => {}, { end: 0.34, lunge: 0, tick: (dt, f) => {
    const u = clamp(f / 0.32, 0, 1);
    h.yaw = wrapAngle(y0 + u * turns * TAU); h.faceYaw = h.yaw;
    if (E.fightable(m) && dist(h, m) > 1.2 + E.radiusOf(m)) { const a = dirTo(h, m); h.vx = Math.sin(a) * 3.2; h.vz = Math.cos(a) * 3.2; }
    if (u * turns * 4 > cuts) {
      cuts++;
      w.blast(h, h.x, h.z, h.y, 2.4, 4 * P, { kind: 'gash', poise: 20, quiet: cuts % 2 === 0 });
      if (h.fxOk()) crescent(c, h, 2.4, cuts % 2 ? SPIRIT : ARCANE, { y: cuts % 2 ? 1.2 : 0.9, life: 0.18 });
      if (cuts % 2) sim.event(EV.WHOOSH, h.x, h.y + 1, h.z);
    }
  }, cut: () => { h.yaw = h.faceYaw = y0; } });
  h.iframesT = 0.5;
};
// Up with both blades through it, turning as he rises, and down on it again.
CAST.rising_dragon = (h, sim, m, { w, c, P }) => {
  if (E.fightable(m) && dist(h, m) < 2.6 + E.radiusOf(m)) { h.hit(sim, m, 12 * P, 'gash', 70, 0, { shove: 2, up: 5 }); if (h.fxOk()) crescent(c, h, 1.8, FIRE, { up: 1.57, life: 0.3, light: 8 }); }
  h.leap(sim, m, { T: 0.75, apex: 3.2, spin: 1.5, r: 2, dmg: 0, air: 'NinjaJump_Idle_Loop', hang: true, crouch: 0.06, rest: 0.25, landClip: 'L_Chop', landRate: 2.2,
    draw: (cc) => { for (const [sd, e] of [['l', FIRE], ['r', LIGHT]]) { const p = h.handPos(sd); cc.fx(FX.TRAIL, e, p[0], p[1], p[2], 0.12, 0, -1, 0, 1.6, 0.9); cc.fx(FX.ORB, e, p[0], p[1], p[2], 0.1, 0, 1, 0, 0, 1, 4, 3); } cc.fx(FX.GLYPH, FIRE, h.x, h.y + 0.6, h.z, 1.5, 0, 1, 0, sim.time * 16, 0.7, 0, 0, 0, 0, GLYPHS.CRESCENT); },
    land: () => {
      w.blast(h, h.x + Math.sin(h.yaw) * 0.8, h.z + Math.cos(h.yaw) * 0.8, h.y, 2, 12 * h.power(), { kind: 'gash', poise: 70, stun: 0.5 });
      if (h.fxOk()) { c.burst(FX.SHOCK, FIRE, h.x, h.y + 0.3, h.z, 0.3, 2.4, 0.3, { light: 10, lightR: 6 }); crescent(c, h, 2, FIRE, { up: 0.9 }); crescent(c, h, 2, LIGHT, { up: 2.2 }); }
      sim.event(EV.LAND, h.x, h.y, h.z, 0.8);
    } }, { to: E.fightable(m) ? [m.x - Math.sin(dirTo(h, m)) * (E.radiusOf(m) + 0.9), m.z - Math.cos(dirTo(h, m)) * (E.radiusOf(m) + 0.9)] : [h.x, h.z] });
};
// A flying kick, and off that one's chest to the next, and the next.
const KICK = { T: 0.42, apex: 1.6, r: 1.6, dmg: 0, air: 'LP_front_kick_02', airRate: 1.8, rest: 0.08, crouch: 0.06, landClip: 'NinjaJump_Idle_Loop' };
CAST.kick_chain = (h, sim, m, { w, c, P, rk }) => {
  const seen = new Set();
  const go = (k, left) => {
    if (h.dead || !E.fightable(k)) return;
    seen.add(k);
    h.leap(sim, k, { ...KICK, draw: (cc) => { cc.fx(FX.TRAIL, SPIRIT, h.x, h.y + 0.9, h.z, 0.22, -Math.sin(h.yaw), 0, -Math.cos(h.yaw), 2, 0.7); },
      land: (hh, s2, j) => {
        if (E.fightable(k)) { h.hit(sim, k, 12 * P, 'bash', 70, 5, { shove: 6, stun: 0.4 }); if (h.fxOk()) { c.burst(FX.SHOCK, SPIRIT, k.x, k.y + 1.2, k.z, 0.2, 1.5, 0.22, { light: 8, lightR: 4 }); c.burst(FX.GLYPH, SPIRIT, k.x, k.y + 1.2, k.z, 0.4, 1.2, 0.2, { ay: 0, extra: GLYPHS.SPARK }); } }
        sim.event(EV.LAND, h.x, h.y, h.z, 0.6);
      } }, { after: () => { const nx = left > 0 && nearest(w, h.x, h.z, 7, seen); if (nx) go(nx, left - 1); } });
  };
  go(m, 1 + Math.ceil(rk / 2));
};
// Struck, and where he stood there's smoke: he's six strides off, with three stars already in the air.
CAST.substitution = (h, sim, m, { w, c }) => {
  const away = Math.atan2(h.x - m.x, h.z - m.z);
  let to = null;
  for (const da of [0, 0.7, -0.7, 1.4, -1.4]) { to = spotAt(h, sim, h.x, h.z, away + da, 6.5); if (to) break; }
  if (!to) { h.gcd = 0.1; return; }
  w.zones.push({ kind: 'smoke', owner: h, x: h.x, z: h.z, y: h.y, t: 0, life: 2.5, r: 2, seed: rand(0, TAU) });
  blink(h, sim, to[0], to[1], VOID);
  h.yaw = h.faceYaw = dirTo(h, m);
  h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.12);
  h.iframesT = 0.6;
  if (m.heroFoe === h) m.heroFoeT = sim.time - 6;
  h.startSwing('OverhandThrow', 1.7, [0.42], () => { if (E.fightable(m)) for (let i = -1; i <= 1; i++) throwStar(h, sim, m, i ? 'steel' : 'frost', (i + 1) % 2, i * 0.12); }, { mask: 'upper' });
};
// A star as wide as his arms, thrown to turn through everything out and back.
CAST.giant_shuriken = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('OverhandThrow', 1.1, [0.42], () => {
    if (!E.fightable(m)) return;
    const hp = h.handPos('r'), v = 13, a = dirTo(h, m), size = 1 + 0.08 * rk;
    shot(w, h, { x: hp[0], y: h.y + 1.05, z: hp[2], vx: Math.sin(a) * v, vy: 0, vz: Math.cos(a) * v, v, dmg: 16 * P, o: { bleed: true }, pierce: true, ret: true, life: 1.7, r: 1.0, size, elem: SPIRIT, skim: true,
      onHit: (k, s) => { blood(sim, k, s.vx / v, s.vz / v, 0.4); if (h.fxOk()) hfx(sim, HFX.SPARKS, k.x, k.y + 1.1, k.z, 16); },
      draw: (cc, s) => {
        star3(cc, s.x, s.y, s.z, s.t * 20, 0.62 * s.size, SPIRIT, MAT.STEEL, 2, 1.4);
        star3(cc, s.x, s.y + 0.01, s.z, s.t * 20 + 0.785, 0.34 * s.size, ARCANE, MAT.LIGHT, 2, 1);
        cc.fx(FX.GLYPH, SPIRIT, s.x, s.y, s.z, 1.0 * s.size, 0, 1, 0, s.t * 20, 0.7, 7, 5, 0, 0, GLYPHS.STAR4);
        cc.fx(FX.RING, SPIRIT, s.x, s.y - 0.95, s.z, 0.9 * s.size, 0, 1, 0, 0, 0.4);
        cc.fx(FX.TRAIL, SPIRIT, s.x, s.y, s.z, 0.3, -s.vx / v, 0, -s.vz / v, 2, 0.5);
      } });
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  });
};

// ---- dragoon: the dives, each its own, and the spear he's holding ------------------------------------------------------

// The spear's own light while it's aimed: along the spear in his fist, from its butt to past its point.
function spearGlow(c, h, elem, k = 1) {
  if (!h.aim) return;
  const p = h.handPos('r'), a = h.aim, reach = h.mainP?.reach ?? 1.4, butt = h.mainP?.butt ?? 0.8;
  c.fx(FX.BEAM, elem, p[0] - a[0] * butt, p[1] - a[1] * butt, p[2] - a[2] * butt, 0.07 * k, a[0], a[1], a[2], reach + butt + 0.5, 0.9, 6, 4, 0, 0, 0.02);
  c.fx(FX.FLARE, elem, p[0] + a[0] * (reach + 0.1), p[1] + a[1] * (reach + 0.1), p[2] + a[2] * (reach + 0.1), 0.28 * k, 0, 1, 0, 0, 1);
}
export const diveDraw = (elem) => (c, h, j) => { spearGlow(c, h, elem); c.fx(FX.TRAIL, elem, h.x, h.y + 1, h.z, 0.16, -Math.sin(j.head), -Math.cos(j.u * Math.PI) * 0.6, -Math.cos(j.head), 1.8, 0.6); };
const DIVES = {
  // Fire wound round him in two ribbons as he comes down, and fire left where he lands.
  dragon_dive: { T: 0.85, apex: 3.6, r: 2.4, dmg: 18, elem: FIRE, lance: true, hang: true, air: 'NinjaJump_Idle_Loop',
    draw: (c, h, j) => { spearGlow(c, h, FIRE, 1.3); for (const k of [0, Math.PI]) { const a = j.u * 14 + k, s = Math.sin(j.head), co = Math.cos(j.head); c.fx(FX.TRAIL, k ? LIGHT : FIRE, h.x + co * Math.cos(a) * 0.6, h.y + 1 + Math.sin(a) * 0.6, h.z - s * Math.cos(a) * 0.6, 0.14, -s, 0.3, -co, 1.8, 0.9); } },
    after: (h, sim, x, z) => { firePatch(h, sim, x, z, 1.9, 3, 5 * h.power()); if (h.fxOk()) sim.casting.burst(FX.FLAME, FIRE, x, h.y, z, 1.2, 2.8, 0.5, { len: 2 }); } },
  // Higher and faster: a comet's tail behind him.
  comet_dive: { T: 0.72, apex: 5, r: 3, dmg: 24, elem: FIRE, lance: true, hang: true, air: 'NinjaJump_Idle_Loop',
    draw: (c, h, j) => { spearGlow(c, h, LIGHT, 1.5); const s = Math.sin(j.head), co = Math.cos(j.head), up = Math.cos(j.u * Math.PI); c.fx(FX.TRAIL, FIRE, h.x, h.y + 1, h.z, 0.5, -s, -up, -co, 4, 0.9); c.fx(FX.TRAIL, LIGHT, h.x, h.y + 1, h.z, 0.22, -s, -up, -co, 3, 1); c.fx(FX.ORB, FIRE, h.x + s * 0.5, h.y + 1, h.z + co * 0.5, 0.55, 0, 1, 0, 0, 0.7, 10, 7); },
    after: (h, sim, x, z) => { if (h.fxOk()) { sim.casting.burst(FX.SHOCK, FIRE, x, h.y + 0.5, z, 0.5, 4.5, 0.45, { light: 20, lightR: 10 }); sim.casting.burst(FX.COLUMN, FIRE, x, h.y, z, 3, 5, 0.4, { len: 1.6 }); hfx(sim, HFX.THUD, x, h.y, z, 0.9); } } },
  // Out of a storm: bolts strike all round where he lands.
  storm_dive: { T: 0.8, apex: 4, r: 2.8, dmg: 22, elem: STORM, lance: true, hang: true, air: 'NinjaJump_Idle_Loop',
    draw: (c, h, j) => { spearGlow(c, h, STORM, 1.4); const s = Math.sin(j.head), co = Math.cos(j.head); c.fx(FX.BOLT, STORM, h.x, h.y + 1, h.z, 0.4, -s + rand(-0.3, 0.3), 0.5, -co + rand(-0.3, 0.3), 2.2, 0.9, 6, 4, 0, Math.floor(j.t * 20), 0.8); c.fx(FX.TRAIL, STORM, h.x, h.y + 1, h.z, 0.2, -s, 0.3, -co, 2, 0.7); },
    after: (h, sim, x, z) => {
      const w = sim.heroWorld, c = sim.casting, marks = foesIn(w, x, z, 6).slice(0, 3 + rank(h));
      marks.forEach((k, i) => w.later(0.05 + i * 0.07, () => {
        if (h.dead || !E.fightable(k)) return;
        h.hit(sim, k, 8 * h.power(), 'burn', 40, 0, { stun: 0.4 });
        if (h.fxOk()) { c.burst(FX.BOLT, STORM, k.x, k.y + 9, k.z, 0.6, 0.5, 0.22, { ax: 0, ay: -1, az: 0, len: 9, extra: 0.9, light: 14, lightR: 7 }); c.burst(FX.RING, STORM, k.x, k.y + 0.05, k.z, 0.2, 1.2, 0.3); }
      }));
    } },
  // The great one: from far up, wings of fire off his back, and the ground burning for strides round where he comes down.
  dragonfall: { T: 1.15, apex: 7, r: 3.8, dmg: 44, elem: FIRE, lance: true, hang: true, air: 'NinjaJump_Idle_Loop', o: { stun: 1.2, shove: 7 },
    draw: (c, h, j) => {
      spearGlow(c, h, FIRE, 1.8);
      const s = Math.sin(h.yaw), co = Math.cos(h.yaw), beat = Math.sin(j.t * 16) * 0.35;
      for (const sd of [-1, 1]) c.fx(FX.GLYPH, FIRE, h.x - s * 0.3 + co * sd * 0.75, h.y + 1.5, h.z - co * 0.3 - s * sd * 0.75, 1.5, -s, 0.2, -co, sd * (0.75 + beat), 0.9, sd > 0 ? 10 : 0, 7, 0, sd, GLYPHS.WING);
      c.fx(FX.TRAIL, FIRE, h.x, h.y + 1, h.z, 0.5, -Math.sin(j.head), -Math.cos(j.u * Math.PI), -Math.cos(j.head), 4, 0.8);
    },
    after: (h, sim, x, z) => {
      firePatch(h, sim, x, z, 3, 4, 6 * h.power());
      if (h.fxOk()) { const c = sim.casting; c.burst(FX.SHOCK, FIRE, x, h.y + 0.5, z, 0.6, 6, 0.5, { light: 26, lightR: 12 }); c.burst(FX.SHOCK, LIGHT, x, h.y + 0.5, z, 0.4, 3.5, 0.35); c.burst(FX.COLUMN, FIRE, x, h.y, z, 5, 8, 0.6, { len: 2.6 }); for (let i = 0; i < 6; i++) { const a = i * 1.047; c.burst(FX.FLAME, FIRE, x + Math.sin(a) * 2.2, h.y, z + Math.cos(a) * 2.2, 1, 2.6, 0.6, { len: 1.4 }); } hfx(sim, HFX.THUD, x, h.y, z, 1); }
    } },
};
for (const [key, L] of Object.entries(DIVES)) {
  CAST[key] = (h, sim, m) => h.leap(sim, m, { ...L, land: (hh, s2, j, fx, fz) => {
    const w = sim.heroWorld, c = sim.casting;
    if (h.fxOk()) { c.burst(FX.SHOCK, L.elem, h.x, h.y + 0.2, h.z, 0.4, L.r * 1.2, 0.4, { light: 12, lightR: 7 }); c.burst(FX.RING, L.elem, h.x, h.y + 0.05, h.z, 0.4, L.r + 0.5, 0.5); }
    sim.event(EV.GROUND, h.x, h.y, h.z);
    w.blast(h, fx, fz, h.y, L.r + 0.1 * rank(h), L.dmg * h.power(), { kind: 'puncture', poise: 80, shove: 5, ...(L.o || {}) });
    L.after?.(h, sim, fx, fz);
  } });
}
// Six thrusts as fast as the arms will go.
CAST.lance_flurry = (h, sim, m, { P }) => {
  h.startSwing('Sword_Regular_Combo', 1.7, [0.06, 0.16, 0.26, 0.36, 0.46, 0.56], (i) => { h.yaw += (i % 2 ? 0.1 : -0.1); h.thrust(sim, 2.9, 5 * P, i === 5 ? 4 : 0); }, { lunge: 1.2, end: 0.68 });
};
// Through it, spear levelled, and out the far side.
CAST.spearstep = (h, sim, m, { c, yaw }) => {
  const e = tintOf(h);
  dash(h, sim, yaw, Math.min(8.5, dist(h, m) + 2.4), { v: 17, clip: 'Sword_Dash', dmg: 20, aim: true, o: { stun: 0.4 },
    onHit: (k) => { if (h.fxOk()) c.burst(FX.SHOCK, e, k.x, k.y + 1.1, k.z, 0.2, 1.1, 0.2, { light: 8, lightR: 4 }); },
    draw: (cc) => { spearGlow(cc, h, e, 1.4); const s = Math.sin(h.yaw), co = Math.cos(h.yaw); for (let i = 0; i < 3; i++) cc.fx(FX.TRAIL, e, h.x - co * (i - 1) * 0.3, h.y + 0.7 + i * 0.3, h.z + s * (i - 1) * 0.3, 0.14, -s, 0, -co, 3, 0.7); } });
};
// The spear's likeness in light, turning as it flies, through everything on its line.
CAST.spiral_lance = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  const e = tintOf(h);
  h.startSwing('Sword_Regular_C', 1.0, [0.33], () => {
    const hp = h.handPos('r'), v = 26, vel = toward(hp[0], hp[1], hp[2], m, v), len = (h.mainP?.length ?? 2.2);
    shot(w, h, { x: hp[0], y: hp[1], z: hp[2], ...vel, dmg: 16 * P, hk: 'puncture', poise: 60, pierce: true, r: 0.6, life: 0.65, elem: e,
      draw: (cc, s) => {
        const ax = s.vx / v, ay = s.vy / v, az = s.vz / v;
        spear3(cc, s.x - ax * len * 0.5, s.y - ay * len * 0.5, s.z - az * len * 0.5, ax, ay, az, len, e, 2, 8);
        for (const k of [0, Math.PI]) { const a = s.t * 30 + k; cc.fx(FX.TRAIL, k ? LIGHT : e, s.x + az * Math.cos(a) * 0.3, s.y + Math.sin(a) * 0.3, s.z - ax * Math.cos(a) * 0.3, 0.08, -ax, -ay, -az, 2, 0.9); }
      },
      onHit: (k) => { if (h.fxOk()) c.burst(FX.SHOCK, e, k.x, k.y + 1.1, k.z, 0.2, 1, 0.2); } });
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  }, { still: true });
};
CAST.sweeping_lance = (h, sim, m, { c, P }) => {
  const e = tintOf(h);
  h.startSwing('Sword_Attack', 1.0, [0.24], () => {
    h.strikeAround(sim, 3.2, 1.75, 12 * P, 0, 8, { kind: 'gash', poise: 60, shove: 6 });
    if (h.fxOk()) { crescent(c, h, 3.2, e, { life: 0.3, light: 8 }); crescent(c, h, 2.5, LIGHT, { life: 0.22, y: 1.0 }); }
  }, { lunge: 1.5 });
};
// Spears of light standing in the air round him, turning: what comes near is run through.
CAST.lance_barrier = (h, sim, m, { w, c, P, rk }) => {
  const e = tintOf(h);
  h.startSwing('Spell_Simple_Shoot', 1.2, [0.4], () => {
    if (h.fxOk()) c.burst(FX.SHOCK, e, h.x, h.y + 1, h.z, 0.3, 2, 0.3, { light: 8, lightR: 5 });
    orbit(w, h, { n: 3 + rk, r: 1.5, speed: 4.2, life: 6, y: 0.35, dmg: 5 * P, hk: 'puncture', reach: 0.7,
      draw: (cc, x, y, z, a, i, q, k) => { spear3(cc, x, y, z, Math.cos(a) * 0.14, 1, -Math.sin(a) * 0.14, 1.9 * k, e, 1.4, i === 0 ? 6 : 0); cc.fx(FX.TRAIL, e, x, y + 1, z, 0.07, Math.cos(a), 0, -Math.sin(a), 0.9, 0.5 * k); } });
  }, { mask: 'upper' });
};
// Spears down out of the sky, on a slant, all over where they stand.
function spearRain(h, sim, cx, cz, R, n, dur, dmg, elem, r = 0.9) {
  const w = sim.heroWorld, c = sim.casting, T = 0.32, drops = [];
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), q = Math.sqrt(Math.random()) * R; drops.push({ x: cx + Math.sin(a) * q, z: cz + Math.cos(a) * q, t0: i * dur / n, hit: false, L: rand(1.6, 2.3) }); }
  if (h.fxOk()) c.burst(FX.RING, elem, cx, sim.world.height(cx, cz) + 0.05, cz, R, R + 0.2, dur + 0.4, { alpha: 0.7 });
  zone(w, h, dur + T + 0.6, (cc, q) => {
    for (const d of drops) {
      const u = (q.t - d.t0) / T;
      if (u < 0 || u > 2.6) continue;
      const y = sim.world.height(d.x, d.z), k = Math.min(1, u), up = (1 - k * k) * 9, fade = u > 1.8 ? 1 - (u - 1.8) / 0.8 : 1;
      // (On a slant from behind and above, a third of it into the ground, standing there a moment.)
      const ax = 0.28, ay = -0.94, az = 0.18;
      cc.fx(FX.LANCE, elem, d.x - ax * (d.L * 0.68 + up), y - ay * (d.L * 0.68 + up), d.z - az * (d.L * 0.68 + up), 0.05, ax, ay, az, d.L, fade, k >= 1 && u < 1.3 ? 4 : 0, 3);
      if (u < 1) cc.fx(FX.TRAIL, elem, d.x - ax * up, y - ay * up, d.z - az * up, 0.08, -ax, -ay, -az, 2.4, 0.7);
    }
  }, (q) => {
    for (const d of drops) {
      if (d.hit || q.t < d.t0 + T) continue;
      d.hit = true;
      const y = sim.world.height(d.x, d.z);
      w.blast(h, d.x, d.z, y, r, dmg, { kind: 'puncture', poise: 30, quiet: true, ...(r > 1.2 ? { stun: 0.8 } : {}) });
      if (h.fxOk()) c.burst(FX.RING, elem, d.x, y + 0.05, d.z, 0.1, r + 0.2, 0.25);
    }
  });
}
CAST.spear_rain = (h, sim, m, { P, rk }) => {
  const x = m.x, z = m.z;
  h.startSwing('OverhandThrow', 1.1, [0.42], () => { spearRain(h, sim, x, z, 3.2, 12 + 3 * rk, 1.6, 6 * P, tintOf(h)); sim.event(EV.WHOOSH, h.x, h.y + 2, h.z); }, { still: true });
};
// The dragon's own breath: a cone of fire before him for as long as he has wind.
CAST.dragon_breath = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  let tick = 0;
  h.startSwing('Spell_Simple_Shoot', 0.36, [0.15], () => {
    zone(w, h, 1.2, (cc, q) => {
      const s = Math.sin(h.yaw), co = Math.cos(h.yaw), k = Math.min(1, q.t * 5, (1.2 - q.t) * 5), p = h.handPos('r');
      for (let i = 0; i < 7; i++) {
        const f = 0.6 + ((q.t * 3 + i * 0.143) % 1) * 3.8, sp = (i % 3 - 1) * 0.28 * f / 4.4 * 2.2;
        cc.fx(FX.FLAME, i % 2 ? FIRE : LIGHT, h.x + s * f + co * sp, h.y + 0.5 + f * 0.05, h.z + co * f - s * sp, (0.7 + f * 0.3) * k, 0, 1, 0, 0.5 + f * 0.28, k, i === 3 ? 12 * k : 0, 7, 0, i * 0.37);
      }
      cc.fx(FX.BEAM, FIRE, p[0], p[1] + 0.2, p[2], 0.2 * k, s, -0.05, co, 4.4, 0.6, 0, 0, 0, 0, 1.3 * k);
    }, (q, dt) => {
      if (E.fightable(m)) h.yaw = h.faceYaw = h.yaw + clamp(wrapAngle(dirTo(h, m) - h.yaw), -1.5 * dt, 1.5 * dt);
      if ((tick -= dt) > 0) return;
      tick += 0.15;
      h.strikeAround(sim, 4.6, 0.5, 3.5 * P, 0, 9, { kind: 'burn', poise: 8, quiet: true });
    });
    sim.event(EV.ROAR, h.x, h.y + 1.6, h.z, 0.5);
  }, { still: true, end: 0.95 });
};
// Eight great lances out of the sky, one on each of them, and the wind of it at his back after.
CAST.heavens_rain = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('LP_cheer', 1.6, [0.3], () => {
    const marks = [m, ...foesIn(w, m.x, m.z, 9).filter((k) => k !== m)], e = tintOf(h);
    for (let i = 0; i < 8; i++) {
      const k = marks[i % marks.length];
      w.later(i * 0.07, () => { if (!h.dead) spearRain(h, sim, k.x + (i >= marks.length ? rand(-1.5, 1.5) : 0), k.z + (i >= marks.length ? rand(-1.5, 1.5) : 0), 0.3, 1, 0.01, 16 * P, i % 2 ? LIGHT : e, 1.45); });
      w.later(i * 0.07 + 0.34, () => { if (!h.dead && h.fxOk()) { c.burst(FX.SHOCK, e, k.x, k.y + 0.3, k.z, 0.3, 2.2, 0.3, { light: 10, lightR: 6 }); if (i % 3 === 0) hfx(sim, HFX.THUD, k.x, k.y, k.z, 0.5); } });
    }
    h.buff = { ...(h.buff || {}), speed: 1.4, dmg: 1.2 }; h.buffT = Math.max(h.buffT, 6);
    if (h.fxOk()) c.burst(FX.COLUMN, e, h.x, h.y, h.z, 3, 4.5, 0.6, { len: 1.4, light: 12, lightR: 6 });
  }, { still: true, end: 0.5 });
};

// ---- boomerang knight: one in each hand, and what he can make of light ------------------------------------------------

// A boomerang of light: out, through everything, and back to the hand. o: size, v, dmg, life, hand, and the rest as shot().
function energyRang(h, sim, m, o) {
  const w = sim.heroWorld, c = sim.casting, hp = h.handPos(o.hand ? 'l' : 'r'), v = o.v || 15, a = (o.dir ?? dirTo(h, m)) + (o.spread || 0), e = o.elem ?? tintOf(h), mat = o.mat ?? MAT.LIGHT;
  sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  return shot(w, h, { x: hp[0], y: Math.max(hp[1], h.y + 1), z: hp[2], vx: Math.sin(a) * v, vy: o.vy ?? 0, vz: Math.cos(a) * v, v, pierce: true, ret: true, skim: true, r: 0.55, life: 1.5, elem: e,
    draw: (cc, s) => {
      const vv = Math.hypot(s.vx, s.vz) || 1, big = (o.size || 1) * s.size;
      rang3(cc, s.x, s.y, s.z, s.t * 19 * (o.spin || 1), 0.62 * big, e, mat, 1.5, 0.1);
      cc.fx(FX.GLYPH, e, s.x, s.y + 0.02, s.z, 0.6 * big, 0, 1, 0, s.t * 19 * (o.spin || 1), 0.75, o.light ?? 5, 3 + big, 0, 0, GLYPHS.RANG);
      cc.fx(FX.TRAIL, e, s.x, s.y, s.z, 0.13 * big, -s.vx / vv, 0, -s.vz / vv, 1.2 + big * 0.8, 0.7);
      o.more?.(cc, s, big);
    },
    onHit: (k, s) => { if (h.fxOk()) c.burst(FX.SHOCK, e, k.x, k.y + 1.1, k.z, 0.15, 0.7 + (o.size || 1) * 0.3, 0.18); o.hit?.(k, s); },
    caught: (s) => { if (h.fxOk()) c.burst(FX.FLARE, e, s.x, s.y, s.z, 0.1, 0.5, 0.2, { light: 5, lightR: 3 }); },
    ...o, hit: undefined });
}
// Both at once, crossing in front of him and crossing again behind the foe: his own two, with a cross of light where they meet.
CAST.cross_cut = (h, sim, m, { c, P }) => {
  h.startSwing('OverhandThrow', 1.2, [0.42], () => {
    if (!E.fightable(m) || h.flight) return;
    const out = Math.min(10, dist(h, m) + 3), dir = dirTo(h, m);
    h.flight = [];
    for (const hand of [0, 1]) { const hp = h.handPos(hand ? 'l' : 'r'); h.flight.push({ hand, t: 0, dur: 1.45, x0: hp[0], y0: hp[1], z0: hp[2], dir, out, side: hand ? -2.2 : 2.2, hitSet: new Set(), dmg: 10 * P, x: hp[0], y: hp[1], z: hp[2], glow: tintOf(h) }); }
    if (h.fxOk()) w0(h).later(0.36, () => { if (E.fightable(m)) { c.burst(FX.GLYPH, tintOf(h), m.x, m.y + 1.1, m.z, 0.6, 1.9, 0.3, { ax: 0, ay: 1, az: 0, len: dir + 0.6, extra: GLYPHS.CRESCENT, light: 8, lightR: 5 }); c.burst(FX.GLYPH, tintOf(h), m.x, m.y + 1.1, m.z, 0.6, 1.9, 0.3, { ax: 0, ay: 1, az: 0, len: dir + Math.PI - 0.6, extra: GLYPHS.CRESCENT }); } });
    sim.event(EV.WHOOSH, h.x, h.y + 1.3, h.z);
  });
  h.shotCd = 1.2;
};
CAST.energy_rang = (h, sim, m, { P, rk }) => h.startSwing('OverhandThrow', 1.2, [0.42], () => { if (E.fightable(m)) energyRang(h, sim, m, { dmg: 13 * P, size: 1.5 + 0.1 * rk, r: 0.95, v: 14, life: 1.6, light: 8 }); });
// Both arms across and apart: a crescent of wind off them, three deep, through everything it meets.
CAST.wind_slash = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  h.startSwing('LP_box_03', 2.2, [0.3], () => {
    const v = 21, e = tintOf(h);
    shot(w, h, { x: h.x + Math.sin(yaw) * 0.8, y: h.y + 1.1, z: h.z + Math.cos(yaw) * 0.8, vx: Math.sin(yaw) * v, vy: 0, vz: Math.cos(yaw) * v, dmg: 12 * P, pierce: true, r: 1.1, life: 0.48, elem: e, skim: true,
      draw: (cc, s) => { for (let i = 0; i < 3; i++) cc.fx(FX.GLYPH, i === 1 ? LIGHT : e, s.x - Math.sin(yaw) * i * 0.4, s.y + (i - 1) * 0.02, s.z - Math.cos(yaw) * i * 0.4, 1.5 - i * 0.2, 0, 1, 0, yaw, 1 - i * 0.28, i ? 0 : 6, 4, 0, i, GLYPHS.CRESCENT); },
      onHit: (k) => { if (h.fxOk()) c.burst(FX.SHOCK, e, k.x, k.y + 1.1, k.z, 0.2, 0.9, 0.18); } });
    if (h.fxOk()) { crescent(c, h, 1.8, e, { up: 0.6 }); crescent(c, h, 1.8, e, { up: 2.5 }); }
    sim.event(EV.WHOOSH, h.x, h.y + 1.2, h.z);
  }, { end: 0.5 });
};
// A ring of blades that goes from one to the next to the next before it comes home.
CAST.chakram = (h, sim, m, { P, rk }) => h.startSwing('OverhandThrow', 1.2, [0.42], () => {
  if (!E.fightable(m)) return;
  const v = 16, e = tintOf(h);
  Object.assign(energyRang(h, sim, m, { dmg: 9 * P, v, life: 3.5, bounce: 4 + rk, hop: 8, pierce: false, o: { bleed: true }, size: 1.1,
    draw: (cc, s) => { const vv = Math.hypot(s.vx, s.vz) || 1; star3(cc, s.x, s.y, s.z, s.t * 24, 0.36, e, MAT.STEEL, 3, 1.4); cc.fx(FX.GLYPH, e, s.x, s.y + 0.02, s.z, 0.55, 0, 1, 0, s.t * 24, 0.8, 5, 4, 0, 0, GLYPHS.STAR6); cc.fx(FX.TRAIL, e, s.x, s.y, s.z, 0.12, -s.vx / vv, 0, -s.vz / vv, 1.6, 0.7); } }), {});
});
// Boomerangs of light turning round him, level, cutting whatever comes near.
CAST.orbiting_rangs = (h, sim, m, { w, c, P, rk }) => {
  const e = tintOf(h);
  h.startSwing('Spell_Simple_Shoot', 1.3, [0.4], () => {
    if (h.fxOk()) c.burst(FX.SHOCK, e, h.x, h.y + 1, h.z, 0.3, 2.2, 0.3, { light: 8, lightR: 5 });
    orbit(w, h, { n: 2 + rk, r: 1.8, speed: 5, life: 7, y: 1.05, dmg: 4 * P, reach: 0.7,
      draw: (cc, x, y, z, a, i, q, k) => { rang3(cc, x, y, z, q.t * 17 + i, 0.5 * k, i % 2 ? LIGHT : e, MAT.LIGHT, 1.4, 0.08); cc.fx(FX.TRAIL, e, x, y, z, 0.08, Math.cos(a), 0, -Math.sin(a), 1.2, 0.5 * k); if (i === 0) cc.fx(FX.RING, e, h.x, h.y + 0.06, h.z, 1.8, 0, 1, 0, 0, 0.35 * k); } });
  }, { mask: 'upper' });
};
// Fifteen small ones, off both hands as fast as he can let them go: up and out, and then every one of them turns on the mark.
CAST.homing_salvo = (h, sim, m, { w, c, P, rk }) => {
  const e = tintOf(h), N = 15;
  h.startSwing('LP_box_03', 1.5, [0.12], () => {
    for (let i = 0; i < N; i++) w.later(i * 0.045, () => {
      if (h.dead || !E.fightable(m)) return;
      const hand = i % 2, hp = h.handPos(hand ? 'l' : 'r'), a = dirTo(h, m) + (hand ? 1 : -1) * rand(0.5, 1.5), v = 15;
      const el = i % 3 === 0 ? LIGHT : e;
      shot(w, h, { x: hp[0], y: hp[1] + 0.2, z: hp[2], vx: Math.sin(a) * v * 0.7, vy: rand(4, 9), vz: Math.cos(a) * v * 0.7, homing: 8 + rk, loft: 0.16, foe: m, only: true, dmg: (3 + 0.3 * rk) * P, life: 2.4, r: 0.45, elem: el,
        draw: (cc, s) => { const vv = Math.hypot(s.vx, s.vy, s.vz) || 1; rang3(cc, s.x, s.y, s.z, s.t * 26 + i, 0.3, el, MAT.LIGHT, 1.6, 0.1); cc.fx(FX.TRAIL, el, s.x, s.y, s.z, 0.06, -s.vx / vv, -s.vy / vv, -s.vz / vv, 1.1, 0.8, i % 5 === 0 ? 3 : 0, 3); },
        onHit: (k) => { if (h.fxOk()) c.burst(FX.GLYPH, el, k.x + rand(-0.3, 0.3), k.y + rand(0.7, 1.5), k.z + rand(-0.3, 0.3), 0.15, 0.55, 0.18, { ay: 0, len: rand(0, TAU), extra: GLYPHS.SPARK }); } });
      if (i % 3 === 0) sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
    });
  }, { end: 0.62, still: true });
  h.shotCd = 1.2;
};
// The storm's own quickness: he's a bolt for the length of the run, and it breaks out of him where he stops.
CAST.tempest_dash = (h, sim, m, { w, c, P, yaw }) => {
  const x0 = h.x, y0 = h.y + 1.1, z0 = h.z, len = Math.max(1, Math.min(9, dist(h, m) + 2.5, sim.world.clearance(h.x, h.z, Math.sin(yaw), Math.cos(yaw), 9, 0.45) - 0.3));
  w.line(h, h.x, h.z, yaw, len, 0.8, 14 * P, { kind: 'gash', poise: 50, bleed: true });
  blink(h, sim, h.x + Math.sin(yaw) * len, h.z + Math.cos(yaw) * len, STORM);
  h.yaw = h.faceYaw = wrapAngle(yaw + Math.PI);
  h.iframesT = 0.35;
  w.blast(h, h.x, h.z, h.y, 2.2, 8 * P, { kind: 'bash', poise: 40, shove: 5 });
  if (h.fxOk()) {
    for (let i = 0; i < 3; i++) c.burst(FX.BOLT, i ? STORM : LIGHT, x0, y0 + (i - 1) * 0.3, z0, 0.6, 0.4, 0.3 + i * 0.05, { ax: Math.sin(yaw), ay: 0, az: Math.cos(yaw), len, extra: 1.1, light: i ? 0 : 16, lightR: 9 });
    c.burst(FX.SHOCK, STORM, h.x, h.y + 0.6, h.z, 0.3, 2.6, 0.3); c.burst(FX.RING, STORM, h.x, h.y + 0.05, h.z, 0.3, 2.2, 0.35);
  }
  h.startSwing('Sword_Regular_B', 1.6, [0.4], () => {}, { end: 0.6 });
};
// Eight, flung out every way at once: they go, they turn, they all come back through whatever's between.
CAST.blade_ring = (h, sim, m, { c, P, rk }) => {
  h.startSwing('Sword_Attack', 1.3, [0.24], () => {
    const n = 8 + (rk > 3 ? 4 : 0);
    for (let i = 0; i < n; i++) energyRang(h, sim, m, { dir: h.yaw + i * TAU / n, dmg: 7 * P, v: 12, life: 1.3, size: 0.9, hand: i % 2, elem: i % 2 ? LIGHT : tintOf(h), light: i % 4 ? 0 : 5 });
    if (h.fxOk()) { c.burst(FX.RING, tintOf(h), h.x, h.y + 0.05, h.z, 0.4, 5, 0.6); c.burst(FX.SHOCK, tintOf(h), h.x, h.y + 1, h.z, 0.3, 2, 0.25, { light: 10, lightR: 6 }); }
  });
  h.shotCd = 1.3;
};
// Turning, a boomerang out in each fist, through the lot of them: two and a half seconds of it.
CAST.bladestorm = (h, sim, m, { w, c, P, rk }) => {
  const life = 2.3 + 0.1 * rk, e = tintOf(h);
  let tick = 0, cuts = 0;
  h.play('LP_box_03', 0.9, 'upper', 0.1);
  zone(w, h, life, (cc, q) => {
    const k = Math.min(1, q.t * 5, (life - q.t) * 5);
    for (let i = 0; i < 2; i++) cc.fx(FX.GLYPH, i ? LIGHT : e, h.x, h.y + 0.95 + i * 0.3, h.z, 2.4, 0, 1, 0, h.yaw + i * Math.PI, 0.85 * k, i ? 0 : 7 * k, 5, 0, i, GLYPHS.CRESCENT);
    for (const sd of ['l', 'r']) { const p = h.handPos(sd); cc.fx(FX.ORB, e, p[0], p[1], p[2], 0.14, 0, 1, 0, 0, k, 0, 0); cc.fx(FX.TRAIL, e, p[0], p[1], p[2], 0.12, Math.cos(h.yaw), 0, -Math.sin(h.yaw), 1.5, 0.8 * k); }
    cc.fx(FX.RING, e, h.x, h.y + 0.06, h.z, 2.3, 0, 1, 0, 0, 0.4 * k);
  }, (q, dt) => {
    h.dodgeT = 0.1; h.iframesT = Math.max(h.iframesT, 0.05);
    h.yaw = wrapAngle(h.yaw + 15 * dt); h.faceYaw = h.yaw;
    if (!h.action) h.play('LP_box_03', 0.9, 'upper', 0.1);
    const k = E.fightable(m) ? m : nearest(w, h.x, h.z, 8);
    h.goal = k ? { x: k.x, z: k.z, speed: 4.2, stop: 0.6, face: h.yaw } : null;
    if ((tick -= dt) > 0) return;
    tick += 0.14; cuts++;
    for (const f of w.blast(h, h.x, h.z, h.y, 2.3, 3.2 * P, { kind: 'gash', poise: 15, bleed: true, quiet: cuts % 3 !== 0 })) if (cuts % 4 === 0) blood(sim, f, Math.cos(h.yaw), -Math.sin(h.yaw), 0.3);
    if (cuts % 3 === 0) sim.event(EV.WHOOSH, h.x, h.y + 1, h.z);
  }, () => { h.goal = null; h.stopAction(0.2); h.yaw = h.faceYaw = E.fightable(m) ? dirTo(h, m) : h.yaw; });
};
// The great one: gold, as long as he is tall, slow and wide. It leaves a thread of gold from each it strikes to the next, and
// when it's home in his hand the threads pull tight and cut whatever stands across them.
CAST.golden_boomerang = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('LP_Overhand_cleaver_downward_ch', 1.5, [0.5], () => {
    if (!E.fightable(m)) return;
    const threads = [];
    let last = null, pulse = 0;
    energyRang(h, sim, m, { dmg: 34 * P, size: 3.2 + 0.15 * rk, r: 0.62, v: 10, life: 2.5, elem: LIGHT, mat: MAT.GOLD, spin: 0.6, light: 16, hk: 'bash', poise: 90, o: { stun: 0.6, shove: 6 },
      hit: (k) => { const p = [k.x, k.y + 1.1, k.z]; if (last) threads.push([last, p]); last = p; if (h.fxOk()) { c.burst(FX.FLARE, LIGHT, k.x, k.y + 1.1, k.z, 0.5, 1.6, 0.25, { light: 14, lightR: 7 }); hfx(sim, HFX.CHIME, k.x, k.y + 1.1, k.z, threads.length * 2, 0.5); } },
      more: (cc, s, big) => {
        cc.fx(FX.ORB, LIGHT, s.x, s.y, s.z, 0.5 * big, 0, 1, 0, 0, 0.45);
        cc.fx(FX.GLYPH, LIGHT, s.x, s.y + 0.03, s.z, 0.75 * big, 0, 1, 0, -s.t * 7, 0.5, 0, 0, 0, 1, GLYPHS.SPARK);
        cc.fx(FX.DISC, LIGHT, s.x, sim.world.height(s.x, s.z) + 0.04, s.z, 0.5 * big, 0, 1, 0, 0, 0.5);
        for (const [a, b] of threads) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1; cc.fx(FX.BEAM, LIGHT, a[0], a[1], a[2], 0.025, dx / L, dy / L, dz / L, L, 0.9, 0, 0, 0, 0, 0.025); }
      },
      tick: (s, dt) => { if ((pulse -= dt) <= 0 && h.fxOk()) { pulse = 0.2; c.burst(FX.RING, LIGHT, s.x, sim.world.height(s.x, s.z) + 0.05, s.z, 0.6, 2.2, 0.4, { alpha: 0.7 }); } },
      onTurn: (s) => { if (h.fxOk()) { c.burst(FX.SHOCK, LIGHT, s.x, s.y, s.z, 0.5, 3, 0.35, { light: 16, lightR: 8 }); hfx(sim, HFX.THUD, s.x, s.y - 1, s.z, 0.4); } },
      caught: (s) => {
        if (h.fxOk()) { c.burst(FX.FLARE, LIGHT, s.x, s.y, s.z, 0.3, 1.4, 0.3, { light: 12, lightR: 6 }); hfx(sim, HFX.CHIME, s.x, s.y, s.z, 12, 0.7); }
        // The web pulled tight.
        w.later(0.35, () => {
          if (h.dead) return;
          for (const [a, b] of threads) {
            const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1;
            for (const k of w.line(h, a[0], a[2], Math.atan2(dx, dz), L, 0.5, 8 * P, { kind: 'gash', poise: 30, bleed: true, quiet: true })) blood(sim, k, dz / L, -dx / L, 0.4);
            if (h.fxOk()) c.burst(FX.BEAM, LIGHT, a[0], a[1], a[2], 0.14, 0.01, 0.35, { ax: dx / L, ay: (b[1] - a[1]) / L, az: dz / L, len: L, extra: 0.02, light: 8, lightR: 5 });
          }
        });
      } });
    if (h.fxOk()) { c.burst(FX.SHOCK, LIGHT, h.x, h.y + 1.2, h.z, 0.4, 2.4, 0.3, { light: 14, lightR: 7 }); hfx(sim, HFX.CHIME, h.x, h.y + 1.4, h.z, 0, 0.8); }
  }, { end: 0.8 });
  h.shotCd = 1.5;
};
// A wind with knives in it: it wanders among them, draws them in and cuts them as they turn in it.
CAST.razor_tornado = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('Spell_Simple_Shoot', 1.0, [0.45], () => {
    const e = tintOf(h), life = 4 + 0.2 * rk, at = { x: m.x, z: m.z };
    let tick = 0;
    zone(w, h, life, (cc, q) => {
      const k = Math.min(1, q.t * 3, (life - q.t) * 3), y = sim.world.height(at.x, at.z);
      for (let i = 0; i < 6; i++) { const f = i / 5, r = (0.5 + f * 1.5) * k; cc.fx(FX.GLYPH, i % 2 ? SPIRIT : e, at.x + Math.sin(q.t * 3 + i) * 0.15 * i, y + 0.25 + f * 2.6, at.z + Math.cos(q.t * 3 + i) * 0.15 * i, r, 0, 1, 0, q.t * (13 - i) + i * 1.3, 0.75 * k, i === 2 ? 6 * k : 0, 5, 0, i, GLYPHS.CRESCENT); }
      for (let i = 0; i < 3; i++) { const a = q.t * 9 + i * 2.094; rang3(cc, at.x + Math.sin(a) * 1.3 * k, y + 0.7 + i * 0.6, at.z + Math.cos(a) * 1.3 * k, q.t * 20, 0.35, e, MAT.LIGHT, 1.4); }
      cc.fx(FX.RING, e, at.x, y + 0.06, at.z, 2.4 * k, 0, 1, 0, 0, 0.5 * k);
      cc.fx(FX.PUFF, SPIRIT, at.x, y + 0.6, at.z, 1.6 * k, 0, 1, 0, 0, 0.25 * k, 0, 0, q.t / life, 1);
    }, (q, dt) => {
      const k = nearest(w, at.x, at.z, 9);
      if (k) { const d = Math.hypot(k.x - at.x, k.z - at.z) || 1, sp = Math.min(2.6, d * 2); at.x += (k.x - at.x) / d * sp * dt; at.z += (k.z - at.z) / d * sp * dt; }
      for (const f of foesIn(w, at.x, at.z, 4.5)) { const d = Math.hypot(f.x - at.x, f.z - at.z) || 1; if (d > 0.7 && E.radiusOf(f) <= 1.2 && !f.boss) sim.casting.shove(f, (at.x - f.x) / d * 20 * dt, (at.z - f.z) / d * 20 * dt); }
      if ((tick -= dt) > 0) return;
      tick += 0.3;
      for (const f of foesIn(w, at.x, at.z, 2.3)) { h.hit(sim, f, 3 * P, 'gash', 10, 0, { bleed: true, quiet: true }); if (Math.random() < 0.3) blood(sim, f, rand(-1, 1), rand(-1, 1), 0.25); }
    });
    sim.event(EV.WHOOSH, m.x, m.y + 1, m.z);
  }, { mask: 'upper' });
};

// ---- bard: the lute, and what comes off its strings --------------------------------------------------------------------

// A note in the air: its own sign, five lines of a stave drawn out behind it.
const noteDraw = (glyph, size = 0.2, lines = true) => (c, s) => {
  const v = Math.hypot(s.vx, s.vy, s.vz) || 1, e = s.elem, big = size * s.size;
  c.fx(FX.GLYPH, e, s.x, s.y, s.z, big, 0, 0, 0, Math.sin(s.t * 9 + (s.seed || 0)) * 0.3, 1, 4, 3, 0, s.seed || 0, glyph);
  if (lines) for (let k = 0; k < 5; k++) c.fx(FX.TRAIL, e, s.x, s.y + (k - 2) * 0.055 * s.size, s.z, 0.012, -s.vx / v, -s.vy / v, -s.vz / v, 0.9 * s.size, 0.6, 0, 0, 0, k * 0.2);
};
// A note off the lute at a foe: it bends after it as it flies. o as shot().
function note(h, sim, m, o = {}) {
  const w = sim.heroWorld, c = sim.casting, s = Math.sin(h.yaw), co = Math.cos(h.yaw);
  const x = h.luteT ? h.luteT[0] + s * 0.2 : h.x + s * 0.5, y = h.luteT ? h.luteT[1] + 0.1 : h.y + 1.2, z = h.luteT ? h.luteT[2] + co * 0.2 : h.z + co * 0.5;
  const a = dirTo({ x, z }, m) + (o.spread || 0), v = o.v || 12, elem = o.elem ?? h.tune?.elem ?? ARCANE;
  return shot(w, h, { x, y, z, vx: Math.sin(a) * v, vy: 0.5, vz: Math.cos(a) * v, homing: o.homing ?? 3, foe: m, dmg: 7 * h.power(), hk: 'bash', life: 2, r: 0.45, elem, seed: rand(0, 6),
    draw: noteDraw(o.glyph ?? pick([GLYPHS.NOTE, GLYPHS.NOTES, GLYPHS.CROTCHET]), o.big || 0.2),
    onHit: (k, q) => { if (h.fxOk()) { c.burst(FX.SHOCK, elem, k.x, k.y + 1.1, k.z, 0.15, 0.8 * q.size, 0.2); c.burst(FX.GLYPH, elem, k.x, k.y + 1.4, k.z, 0.2, 0.5, 0.35, { ay: 0, extra: GLYPHS.NOTES }); } },
    ...o });
}
// What a bard does for an ordinary blow: a few bars on the lute, a note off it at the foe (Hero.pluck).
export function pluckNote(h, sim, m) {
  h.playLute(1.0, h.tune?.v === 2 ? 2 : (h.slot + Math.floor(sim.time / 9)) % 2, { elem: ARCANE });
  sim.heroWorld.later(0.22, () => { if (!h.dead && E.fightable(m)) { note(h, sim, m, {}); sim.event(EV.WHOOSH, h.x, h.y + 1.2, h.z); } });
}
// Play, and when the hand comes down do the rest. v: which way of playing. at: seconds in.
function riff(h, sim, secs, v, elem, at, fn) {
  h.playLute(secs, v, { elem, rainbow: false });
  h.hold = Math.max(h.hold, at + 0.15); h.holdFace = h.yaw;
  h.gcd = Math.max(h.gcd, at + 0.5); h.shotCd = Math.max(h.shotCd, at + 0.4);
  sim.heroWorld.later(at, () => { if (!h.dead) fn(); });
}
// Three notes at once, thrown wide: what they strike is thrown back.
CAST.power_chord = (h, sim, m, { c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  riff(h, sim, 1.2, 2, FIRE, 0.62, () => {
    if (!E.fightable(m)) return;
    for (let i = -1; i <= 1; i++) note(h, sim, m, { spread: i * 0.21, dmg: 9 * P, v: 15, elem: FIRE, glyph: GLYPHS.NOTES, big: 0.3, o: { shove: 5 }, poise: 50 });
    if (h.fxOk()) { waves(c, h.x, h.y + 0.08, h.z, h.yaw, 6, FIRE, 0.6); c.burst(FX.SHOCK, FIRE, h.x + Math.sin(h.yaw), h.y + 1.1, h.z + Math.cos(h.yaw), 0.3, 1.6, 0.25, { light: 10, lightR: 6 }); }
  });
};
// Six notes in a fan, sharp as knives: what they cut, bleeds.
CAST.fan_of_notes = (h, sim, m, { c, P, rk, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  riff(h, sim, 1.0, 1, DRAIN, 0.4, () => {
    const n = 6 + rk;
    for (let i = 0; i < n; i++) {
      const a = h.yaw + (i / (n - 1) - 0.5) * 0.8, v = 17;
      shot(sim.heroWorld, h, { x: h.x + Math.sin(a) * 0.5, y: h.y + 1.2, z: h.z + Math.cos(a) * 0.5, vx: Math.sin(a) * v, vy: 0, vz: Math.cos(a) * v, dmg: 6 * P, o: { bleed: true }, life: 0.5, r: 0.4, elem: RAINBOW[i % RAINBOW.length], seed: i,
        draw: (cc, s) => { noteDraw(GLYPHS.NOTE, 0.18, false)(cc, s); cc.fx(FX.BLADE, s.elem, s.x - Math.sin(a) * 0.25, s.y - 0.1, s.z - Math.cos(a) * 0.25, 0.04, Math.sin(a), 0, Math.cos(a), 0.5, 1, 0, 0, 0, i); },
        onHit: (k) => blood(sim, k, Math.sin(a), Math.cos(a), 0.3) });
    }
    if (h.fxOk()) waves(c, h.x, h.y + 0.08, h.z, h.yaw, 5, DRAIN, 0.5);
    sim.event(EV.WHOOSH, h.x, h.y + 1.2, h.z);
  });
};
// One great downstroke, and the sound of it goes down the ground in rings, one after another, out to nine metres.
CAST.shockwave_riff = (h, sim, m, { w, c, P, rk, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  riff(h, sim, 1.2, 2, STORM, 0.62, () => {
    const s = Math.sin(h.yaw), co = Math.cos(h.yaw), n = 5 + Math.floor(rk / 2);
    for (let i = 0; i < n; i++) w.later(i * 0.08, () => {
      if (h.dead) return;
      const x = h.x + s * (1.4 + i * 1.6), z = h.z + co * (1.4 + i * 1.6), y = sim.world.height(x, z);
      w.blast(h, x, z, y, 1.35, 8 * P, { kind: 'bash', poise: 40, quiet: i > 0, stun: 0.3 });
      if (h.fxOk()) { c.burst(FX.RING, STORM, x, y + 0.05, z, 0.2, 1.5 + i * 0.12, 0.35, { light: i % 2 ? 0 : 6, lightR: 4 }); c.burst(FX.GLYPH, STORM, x, y + 0.5, z, 0.4, 1.3, 0.3, { ax: -co, ay: 0, az: s, len: 0, extra: GLYPHS.WAVES }); c.burst(FX.GLYPH, STORM, x, y + 1 + i * 0.1, z, 0.15, 0.3, 0.5, { ay: 0, extra: pick([GLYPHS.NOTE, GLYPHS.NOTES]) }); }
    });
    if (h.fxOk()) hfx(sim, HFX.THUD, h.x + s * 2, h.y, h.z + co * 2, 0.4);
  });
};
// A note that leaps from one to the next; and, a beat behind it, its echo doing the same.
CAST.echo = (h, sim, m, { w, P, rk, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  riff(h, sim, 1.2, 0, SPIRIT, 0.3, () => {
    for (const d of [0, 0.32]) w.later(d, () => { if (!h.dead && E.fightable(m)) note(h, sim, m, { dmg: (d ? 5 : 8) * P, bounce: 3 + Math.floor(rk / 2), hop: 8, v: 14, elem: d ? FROST : SPIRIT, glyph: GLYPHS.NOTES, big: d ? 0.16 : 0.24, life: 2.5 }); });
  });
};
// Notes turning round him, ringing on whatever they touch.
CAST.dancing_notes = (h, sim, m, { w, c, P, rk }) => {
  h.playLute(1.4, 1, { elem: HEAL });
  const n = 3 + rk;
  orbit(w, h, { n, r: 1.7, speed: 3.6, life: 8, y: 1.2, dmg: 4 * P, hk: 'bash', reach: 0.65,
    onHit: (k, x, z) => { if (h.fxOk()) { c.burst(FX.SHOCK, RAINBOW[Math.floor(rand(0, 8))], x, h.y + 1.2, z, 0.1, 0.6, 0.18); hfx(sim, HFX.PLUCK, x, h.y + 1.2, z, pick(SCALE), 0.3); } },
    draw: (cc, x, y, z, a, i, q, k) => { const e = RAINBOW[i % RAINBOW.length]; cc.fx(FX.GLYPH, e, x, y + Math.sin(q.t * 4 + i * 1.3) * 0.2, z, 0.24 * k, 0, 0, 0, Math.sin(q.t * 3 + i) * 0.3, 0.95 * k, i === 0 ? 4 * k : 0, 4, 0, i, [GLYPHS.NOTE, GLYPHS.NOTES, GLYPHS.CROTCHET][i % 3]); cc.fx(FX.TRAIL, e, x, y, z, 0.02, Math.cos(a), 0, -Math.sin(a), 1.0, 0.5 * k); if (i === 0) cc.fx(FX.RING, HEAL, h.x, h.y + 0.06, h.z, 1.7, 0, 1, 0, 0, 0.3 * k); } });
};
// One note, the lowest there is, dropped on them from a height.
CAST.bass_drop = (h, sim, m, { w, c, P, rk }) => {
  const x = m.x, z = m.z, y = sim.world.height(x, z), r = 2.5 + 0.2 * rk;
  riff(h, sim, 1.5, 2, ARCANE, 0.55, () => {
    let hit = false;
    const T = 0.5;
    if (h.fxOk()) c.burst(FX.RING, ARCANE, x, y + 0.05, z, r, r * 0.3, T, { alpha: 0.8, ease: 1 });
    zone(w, h, T + 0.1, (cc, q) => { const u = Math.min(1, q.t / T); if (u < 1) { cc.fx(FX.GLYPH, ARCANE, x, y + 1 + (1 - u * u) * 9, z, 1.1, 0, 0, 0, 0, 1, 10, 6, 0, 0, GLYPHS.NOTE); cc.fx(FX.TRAIL, ARCANE, x, y + 1.6 + (1 - u * u) * 9, z, 0.3, 0, 1, 0, 3, 0.7); } },
      (q) => {
        if (hit || q.t < T) return;
        hit = true;
        w.blast(h, x, z, y, r, 20 * P, { kind: 'bash', poise: 100, stun: 1.2, shove: 4 });
        if (h.fxOk()) { for (let i = 0; i < 3; i++) c.burst(FX.RING, i === 1 ? VOID : ARCANE, x, y + 0.05, z, 0.3, r * (0.6 + i * 0.35), 0.4 + i * 0.12); c.burst(FX.SHOCK, ARCANE, x, y + 0.5, z, 0.5, r * 1.5, 0.45, { light: 20, lightR: 10 }); for (let i = 0; i < 6; i++) { const a = i * 1.047; drift(w, h, x, y + 0.6, z, Math.sin(a) * 3, 2.2, Math.cos(a) * 3, pick([GLYPHS.NOTE, GLYPHS.NOTES]), ARCANE, 0.25, 0.7, rand(-3, 3)); } hfx(sim, HFX.THUD, x, y, z, 1); hfx(sim, HFX.PLUCK, x, y + 1, z, -12, 0.9); }
        sim.event(EV.GROUND, x, y, z);
      });
  });
};
// The sword out and the lute left to hang: three runs, one foe to the next, a cut for each.
CAST.swashbuckle = (h, sim, m, { w, c }) => {
  const seen = new Set();
  h.tune = null;
  const go = (k, left) => {
    if (h.dead || !E.fightable(k)) return;
    seen.add(k);
    dash(h, sim, dirTo(h, k), Math.min(7, dist(h, k) + 1.8), { v: 17, clip: 'Sword_Dash', dmg: 10, kind: 'gash', o: { bleed: true }, noShove: true,
      onHit: (f) => { blood(sim, f, Math.cos(h.yaw), -Math.sin(h.yaw), 0.4); if (h.fxOk()) crescent(c, h, 1.8, ARCANE, { up: 0.6, life: 0.2 }); },
      draw: (cc) => { const s = Math.sin(h.yaw), co = Math.cos(h.yaw); cc.fx(FX.TRAIL, ARCANE, h.x, h.y + 1.1, h.z, 0.2, -s, 0, -co, 2.6, 0.7); cc.fx(FX.GLYPH, ARCANE, h.x - s * 1.2, h.y + 1.3, h.z - co * 1.2, 0.2, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, GLYPHS.NOTE); },
      done: () => { const nx = left > 0 && (nearest(w, h.x, h.z, 7, seen) || (E.fightable(k) ? k : null)); if (nx) w.later(0.1, () => go(nx, left - 1)); } });
  };
  go(m, 2);
};
// A stave of light from the lute to the foe, held: five lines, and the notes running down them.
CAST.resonance_beam = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  let tick = 0, dir = yaw;
  riff(h, sim, 1.9, 1, SPIRIT, 0.3, () => {
    zone(w, h, 1.4, (cc, q) => {
      const s = Math.sin(dir), co = Math.cos(dir), k = Math.min(1, q.t * 6, (1.4 - q.t) * 5), x = h.x + s * 0.6, y = h.y + 1.15, z = h.z + co * 0.6, len = 11;
      for (let i = 0; i < 5; i++) cc.fx(FX.BEAM, SPIRIT, x, y + (i - 2) * 0.11, z, 0.018, s, 0, co, len, 0.9 * k, i === 2 ? 8 * k : 0, 6, 0, i * 0.3, 0.018);
      for (let i = 0; i < 6; i++) { const f = ((q.t * 1.6 + i / 6) % 1) * len; cc.fx(FX.GLYPH, i % 2 ? LIGHT : SPIRIT, x + s * f, y + ((i * 7) % 5 - 2) * 0.11, z + co * f, 0.2, 0, 0, 0, 0, k, 0, 0, 0, i, [GLYPHS.NOTE, GLYPHS.CROTCHET, GLYPHS.NOTES][i % 3]); }
    }, (q, dt) => {
      if (E.fightable(m)) dir += clamp(wrapAngle(dirTo(h, m) - dir), -1.4 * dt, 1.4 * dt);
      h.yaw = h.faceYaw = dir; h.hold = Math.max(h.hold, 0.1); h.holdFace = dir;
      if ((tick -= dt) > 0) return;
      tick += 0.15;
      w.line(h, h.x, h.z, dir, 11, 0.55, 3.2 * P, { kind: 'bash', poise: 10, quiet: true });
    });
  });
};
// A slow air, and they nod where they stand.
CAST.lullaby = (h, sim, m, { w, c, rk }) => {
  riff(h, sim, 2.4, 1, FROST, 0.5, () => {
    const marks = foesIn(w, m.x, m.z, 6);
    for (const k of marks) { daze(sim, w, k, 2.2 + 0.2 * rk); slow(sim, k, 5); }
    if (h.fxOk()) { c.burst(FX.RING, FROST, m.x, m.y + 0.05, m.z, 0.5, 6, 0.9); for (const k of marks.slice(0, 8)) for (let i = 0; i < 3; i++) w.later(i * 0.5, () => drift(w, h, k.x, k.y + 1.7, k.z, rand(-0.2, 0.2), 0.6, rand(-0.2, 0.2), GLYPHS.CROTCHET, FROST, 0.18, 1.5, 0.5)); }
  });
};
// Everything the lute has, twice: the air itself goes out from him in two walls.
CAST.sonic_boom = (h, sim, m, { w, c, P, rk }) => {
  riff(h, sim, 1.5, 2, LIGHT, 0.62, () => {
    for (const d of [0, 0.3]) w.later(d, () => {
      if (h.dead) return;
      const r = 5.2 + 0.25 * rk;
      w.blast(h, h.x, h.z, h.y, r, 10 * P, { kind: 'bash', poise: 80, shove: 8, stun: 0.5 });
      if (h.fxOk()) {
        c.burst(FX.SHOCK, d ? ARCANE : LIGHT, h.x, h.y + 1, h.z, 0.5, r * 1.3, 0.45, { light: 16, lightR: 9 });
        c.burst(FX.RING, d ? ARCANE : LIGHT, h.x, h.y + 0.05, h.z, 0.5, r, 0.5);
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + d; waves(c, h.x + Math.sin(a) * 0.6, h.y + 0.08, h.z + Math.cos(a) * 0.6, a, r, d ? ARCANE : LIGHT, 0.5); }
        hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.6);
      }
      sim.event(EV.GROUND, h.x, h.y, h.z);
    });
  });
};
// A note that swells as it goes: small off the string, the size of a door when it arrives. Through everything.
CAST.crescendo = (h, sim, m, { P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  riff(h, sim, 1.2, 0, LIGHT, 0.3, () => { if (E.fightable(m)) note(h, sim, m, { dmg: 9 * P, v: 13, pierce: true, grow: 1.4, growDmg: 0.9, sizeMax: 3.2, homing: 1.5, elem: LIGHT, glyph: GLYPHS.NOTES, big: 0.22, r: 0.4, life: 1.5 }); });
};
// The last number: lights of every colour bursting over them, one after another, and then all of it at once.
CAST.grand_finale = (h, sim, m, { w, c, P, rk }) => {
  const cx = m.x, cz = m.z;
  h.playLute(2.8, 2, { rainbow: true, elem: LIGHT });
  h.hold = 2.4; h.holdFace = h.yaw; h.gcd = 3; h.shotCd = 2.6;
  for (let i = 0; i < 5; i++) w.later(0.5 + i * 0.26, () => {
    if (h.dead) return;
    const a = rand(0, TAU), r = rand(0.5, 3), x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r, y = sim.world.height(x, z) + rand(1.6, 2.6), e = RAINBOW[(i * 3) % RAINBOW.length];
    w.blast(h, x, z, y - 2, 1.7, 8 * P, { kind: 'burn', poise: 30, quiet: true });
    if (!h.fxOk()) return;
    c.burst(FX.FLARE, e, x, y, z, 0.6, 2, 0.3, { light: 14, lightR: 8 });
    c.burst(FX.SHOCK, e, x, y, z, 0.2, 2.2, 0.4);
    c.burst(FX.GLYPH, e, x, y, z, 0.4, 2.4, 0.45, { ay: 0, extra: GLYPHS.SPARK });
    for (let k = 0; k < 10; k++) { const q = k * 0.628, up = rand(-0.3, 0.6); drift(w, h, x, y, z, Math.sin(q) * 4, up * 4, Math.cos(q) * 4, k % 2 ? GLYPHS.STAR4 : GLYPHS.NOTE, RAINBOW[(i + k) % RAINBOW.length], 0.16, 0.6, rand(-4, 4)); }
    hfx(sim, HFX.PLUCK, x, y, z, SCALE[(i * 2) % SCALE.length] + 12, 0.6);
  });
  w.later(2.0, () => {
    if (h.dead) return;
    const y = sim.world.height(cx, cz), r = 4.2 + 0.2 * rk;
    w.blast(h, cx, cz, y, r, 26 * P, { kind: 'bash', poise: 100, stun: 1, shove: 6 });
    if (h.fxOk()) {
      [LIGHT, ARCANE, FIRE].forEach((e, i) => c.burst(FX.SHOCK, e, cx, y + 0.8, cz, 0.5, r * (1.5 - i * 0.3), 0.5 + i * 0.1, { light: i ? 0 : 26, lightR: 12 }));
      c.burst(FX.COLUMN, LIGHT, cx, y, cz, 5, 8, 0.6, { len: 2.4 });
      c.burst(FX.RING, ARCANE, cx, y + 0.05, cz, 0.5, r + 0.5, 0.6);
      for (let k = 0; k < 14; k++) { const q = k * 0.449; drift(w, h, cx, y + 1, cz, Math.sin(q) * 5, rand(1, 4), Math.cos(q) * 5, pick([GLYPHS.NOTE, GLYPHS.NOTES, GLYPHS.STAR6]), RAINBOW[k % RAINBOW.length], 0.24, 0.9, rand(-3, 3)); }
      hfx(sim, HFX.THUD, cx, y, cz, 1); for (const n of [0, 4, 7, 12]) hfx(sim, HFX.PLUCK, cx, y + 1, cz, n, 0.7);
    }
    sim.event(EV.GROUND, cx, y, cz);
  });
};
