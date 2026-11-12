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
import { ELEM, FX, GLYPHS, MAT, SHIELDS } from './spells.js';

const { FIRE, FROST, ARCANE, STORM, HEAL, LIGHT, DRAIN, VOID, SPIRIT, POISON, STONE } = ELEM;
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
  charge: { gap: true, move: true }, consecration: { aoe: true }, rain_of_arrows: { aoe: true }, volley: { aoe: true }, strafe: { move: true }, shadow_step: { move: true }, vanish: { move: true },
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
// (Something heavy coming down is felt as well as heard: the eye shakes with it, less the further off you are.)
const hfx = (sim, code, x, y, z, a = 0, b = 0, c = 0) => {
  sim.event(EV.HERO_FX, code, x, y, z, a, b, c);
  if (code !== HFX.THUD) return;
  const p = sim.player, near = Math.hypot(p.x - x, p.z - z);
  if (near < 40 && !p.dead) p.trauma = Math.min(1, (p.trauma || 0) + clamp((0.2 + 0.35 * a) / (1 + near * 0.16), 0, 0.5));
};
// Blood thrown off a foe, the way (ux, uz): the render thread's own blood, in a gout along the blow, which falls and soaks
// in; and a few dark streaks of it in the air for the moment it leaves. (No light with it: a red light on a cut made
// everyone near it look hurt.)
function blood(sim, m, ux, uz, k = 0.6) {
  if (Math.hypot(sim.player.x - m.x, sim.player.z - m.z) > 60) return;
  hfx(sim, HFX.BLOOD, m.x, m.y + 1.1, m.z, ux, k, uz);
  const c = sim.casting, n = 2 + Math.round(k * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(ux, uz) + rand(-0.6, 0.6), up = rand(0.2, 0.9), L = Math.hypot(1, up);
    c.burst(FX.TRAIL, DRAIN, m.x, m.y + 1.1, m.z, 0.035, 0.012, rand(0.16, 0.28), { ax: Math.sin(a) / L, ay: up / L, az: Math.cos(a) / L, len: rand(0.5, 1.1), alpha: 0.7 });
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
  c.fx(FX.BOX, elem, x, y, z, 0.028 * size, hx, hy, hz, 0.8 * size, 0.2 * glow, 0, 0, MAT.WOOD, 0, 0.028 * size);
  const tx = x + hx * 0.4 * size, ty = y + hy * 0.4 * size, tz = z + hz * 0.4 * size;
  // The head: twice as long as it's thick, a band of light round its middle, and a wider face at each end to strike with.
  c.fx(FX.BOX, elem, tx, ty, tz, 0.1 * size, px, py, pz, 0.44 * size, 0.45 * glow, light, light ? 3 + size * 2 : 0, MAT.GOLD, 0, 0.1 * size);
  for (const k of [-1, 1]) c.fx(FX.BOX, elem, tx + px * k * 0.235 * size, ty + py * k * 0.235 * size, tz + pz * k * 0.235 * size, 0.125 * size, px, py, pz, 0.07 * size, 0.6 * glow, 0, 0, MAT.GOLD, 0, 0.125 * size);
  c.fx(FX.BOX, elem, tx, ty, tz, 0.108 * size, px, py, pz, 0.08 * size, 1.3 * glow, 0, 0, MAT.LIGHT, 0, 0.108 * size);
  if (glow > 0.3) c.fx(FX.ORB, elem, tx, ty, tz, 0.16 * size, 0, 1, 0, 0, 0.3 * glow);
}
// One of the lancers' golden shields (SHIELDS: round, diamond, kite, tower), standing, its face the way (fx, fz) looks:
// a real board, seen from the front and from behind. size: half its height. glow: its element's light on its edge.
// Each of the four stands its own height, so a ring of them reads as four shields, not one.
const SHIELD_ORDER = [SHIELDS.TOWER, SHIELDS.ROUND, SHIELDS.KITE, SHIELDS.DIAMOND], SHIELD_TALL = [0.8, 0.95, 1, 1.05];
export function shield3(c, kind, elem, x, y, z, size, fx, fz, glow = 0.6, light = 0, turn = 0) {
  c.fx(FX.SHIELD, elem, x, y, z, size * SHIELD_TALL[kind], fx, 0, fz, turn, glow, light, light ? 5 : 0, kind);
}
// A throwing star: `n` shards crossed, turning in a plane. flat: lying level; else upright, in the plane through `yaw`.
export function star3(c, x, y, z, spin, size, elem, mat = MAT.STEEL, n = 2, glow = 1, yaw = 0, flat = true) {
  for (let i = 0; i < n; i++) {
    const a = spin + i * Math.PI / n;
    if (flat) c.fx(FX.SHARD, elem, x, y, z, size * 0.3, Math.sin(a), 0, Math.cos(a), size * 2, glow, 0, 0, mat, 0);
    else c.fx(FX.SHARD, elem, x, y, z, size * 0.3, Math.sin(yaw) * Math.cos(a), Math.sin(a), Math.cos(yaw) * Math.cos(a), size * 2, glow, 0, 0, mat, Math.PI / 2);
  }
}
// A boomerang: two arms from an elbow, lying nearly level, turning about its middle. Gold, each arm in three lengths that
// narrow to its tip, its element's light along its edges; and behind it, the way it turns, the ghost of where it was a
// moment ago and the blur of its turning under it: it's seen to turn, and never read as a letter standing still.
export function rang3(c, x, y, z, spin, size, elem, mat = MAT.GOLD, glow = 0.8, tilt = 0.12) {
  for (const k of [-1, 1]) {
    const a = spin + k * 0.81, dx = Math.sin(a), dz = Math.cos(a), dy = tilt * k;
    c.fx(FX.BOX, elem, x + dx * size * 0.1, y + dy * size * 0.1, z + dz * size * 0.1, size * 0.1, dx, dy, dz, size * 0.28, glow, 0, 0, mat, 0, size * 0.022);
    c.fx(FX.BOX, elem, x + dx * size * 0.32, y + dy * size * 0.32, z + dz * size * 0.32, size * 0.07, dx, dy, dz, size * 0.22, glow, 0, 0, mat, 0, size * 0.016);
    c.fx(FX.BOX, elem, x + dx * size * 0.48, y + dy * size * 0.48, z + dz * size * 0.48, size * 0.04, dx, dy, dz, size * 0.14, glow, 0, 0, mat, 0, size * 0.011);
  }
  for (const [da, al] of [[-0.4, 0.3], [-0.8, 0.16]]) { const a = spin + da, gs = size * 0.5; c.fx(FX.GLYPH, elem, x + Math.sin(a) * 0.42 * gs, y - 0.005, z + Math.cos(a) * 0.42 * gs, gs, 0, 1, 0, a + Math.PI / 2, al * Math.min(1, glow * 1.4), 0, 0, 0, 0, GLYPHS.RANG); }
  c.fx(FX.DISC, elem, x, y - 0.01, z, size * 0.56, 0, 1, 0, 0, 0.22 * Math.min(1, glow * 1.4));
}
// A spear of steel and light: a shaft, a broad head, and its element down its edges. (x, y, z): its butt.
export function pike3(c, x, y, z, ax, ay, az, len, elem, glow = 1, thick = 1) {
  c.fx(FX.BOX, elem, x + ax * len * 0.42, y + ay * len * 0.42, z + az * len * 0.42, 0.026 * thick, ax, ay, az, len * 0.84, 0.5 * glow, 0, 0, MAT.STEEL, 0, 0.026 * thick);
  for (const roll of [0, Math.PI / 2]) c.fx(FX.SHARD, elem, x + ax * len * 0.86, y + ay * len * 0.86, z + az * len * 0.86, 0.08 * thick, ax, ay, az, len * 0.3, 1.1 * glow, 0, 0, MAT.STEEL, roll);
  if (glow > 0.5) c.fx(FX.BEAM, elem, x + ax * len * 0.55, y + ay * len * 0.55, z + az * len * 0.55, 0.045 * thick * glow, ax, ay, az, len * 0.5, 0.55, 0, 0, 0, 0, 0.01);
}
// An arrow in the air: its shaft, and the light it leaves behind it.
export function arrow3(c, x, y, z, vx, vy, vz, elem, fat = 1) {
  const v = Math.hypot(vx, vy, vz) || 1, ux = vx / v, uy = vy / v, uz = vz / v;
  c.fx(FX.LANCE, elem, x - ux * 0.75, y - uy * 0.75, z - uz * 0.75, 0.016 * fat, ux, uy, uz, 0.8, 1);
  c.fx(FX.TRAIL, elem, x, y, z, 0.05 * fat, -ux, -uy, -uz, 1.4 + 0.5 * fat, 0.9, 1.5, 2);
}
// A spear of light, or of bone and light: haft and head along a line.
function spear3(c, x, y, z, ax, ay, az, len, elem, glow = 1, light = 0) {
  c.fx(FX.LANCE, elem, x, y, z, 0.05, ax, ay, az, len, 1, light, light ? 4 : 0);
  if (glow) c.fx(FX.BEAM, elem, x, y, z, 0.05 * glow, ax, ay, az, len, 0.8, 0, 0, 0, 0, 0.02);
}
// A blast, seen from any side: a flare and a burst of rays at its heart (the ring on the ground is the caller's, and it's
// the ring that says how far it reached: the flare is never wider than a body is tall).
function boom(c, elem, x, y, z, r, light = 0) {
  c.burst(FX.FLARE, elem, x, y, z, Math.min(0.5, r * 0.25), Math.min(1.7, r * 0.7), 0.2, light ? { light, lightR: 3 + r * 1.5 } : {});
  c.burst(FX.GLYPH, elem, x, y, z, Math.min(0.6, r * 0.3), Math.min(2.2, r * 0.9), 0.18, { ay: 0, len: rand(0, TAU), extra: GLYPHS.SPARK, alpha: 0.8 });
}
// A crescent of light where a blade went: level round him the way he faces (as far out as the weapon reaches), or upright
// before him, tipped by `up` (0 forward, a quarter turn straight up). It is the size of the blow, lit in the class's colour
// and half seen through, and gone in a tenth of a second: it marks the arc, it doesn't hide who made it.
function crescent(c, h, reach, elem, o = {}) {
  const yaw = (o.yaw ?? h.yaw) + (o.turn || 0), y = h.y + (o.y ?? 1.15), life = o.life || 0.13, alpha = o.alpha ?? 0.6;
  if (o.up === undefined) c.burst(FX.GLYPH, elem, h.x, y, h.z, reach * 1.05, reach * 1.25, life, { ax: 0, ay: 1, az: 0, len: yaw, extra: GLYPHS.CRESCENT, alpha, light: o.light ?? 0, lightR: 3 });
  else {
    const r = Math.min(reach * 0.62, 1.25), f = 0.2 + r * 0.1;
    c.burst(FX.GLYPH, elem, h.x + Math.sin(yaw) * f, y, h.z + Math.cos(yaw) * f, r * 1.05, r * 1.3, life, { ax: -Math.cos(yaw), ay: 0, az: Math.sin(yaw), len: o.up, extra: GLYPHS.CRESCENT, alpha, light: o.light ?? 0, lightR: 3 });
  }
}
// A cut left in the air a moment, through a point: a streak lying across the way the blow went, tipped over by `tilt`,
// thinning to both ends. Two of them crossed (xcut) where two blades went through the same thing.
function slash(c, x, y, z, yaw, tilt, len, elem, life = 0.14, light = 0) {
  const rx = Math.cos(yaw), rz = -Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
  for (const k of [-1, 1]) c.burst(FX.BEAM, elem, x, y, z, 0.075, 0.02, life, { ax: rx * ct * k, ay: st * k, az: rz * ct * k, len: len * 0.5, extra: 0.004, light: k > 0 ? light : 0, lightR: 3 });
}
const xcut = (c, x, y, z, yaw, len, e1, e2 = e1, light = 0) => { slash(c, x, y, z, yaw, 0.8, len, e1, 0.16, light); slash(c, x, y, z, yaw, -0.8, len, e2, 0.16); };
// The arc an ordinary cut leaves, for those with a blade in each hand: small, in the class's colours, one high and one low.
const CUT = { rogue: [DRAIN, ARCANE], ninja: [ARCANE, ARCANE] };
export function cutArc(h, sim, i, size = 1) {
  const e = CUT[h.person.cls];
  if (e && h.fxOk()) crescent(sim.casting, h, 1.5 * size, e[i % 2], { up: i % 2 ? -0.4 : 0.4, y: 1.05, life: 0.12, alpha: 0.8 });
}
// Light drawn in to his feet while he readies something: a ring closing on him for as long as the gather lasts.
function gather(c, h, elem, r, secs) { if (h.fxOk()) c.burst(FX.RING, elem, h.x, h.y + 0.06, h.z, r, 0.5, secs, { alpha: 0.7, ease: 1 }); }
// Something made in the hand before it's thrown: drawn there (draw(c, [x, y, z], 0..1)) till the returned stop() is called.
function inHand(h, side, secs, draw) {
  const z = zone(w0(h), h, secs + 0.5, (c, q) => draw(c, h.handPos(side), Math.min(1, q.t / secs)));
  return () => { z.done = true; };
}
// Blows one after another, each its own short clip: steps [clip, rate, where it lands, where it's cut, where it's begun],
// fn(i) as each lands. o: lunge, aimed, mask, done (after the last).
function chain(h, sim, steps, fn, o = {}) {
  const go = (i) => {
    if (h.dead) return;
    if (i >= steps.length) { o.done?.(); return; }
    const [clip, rate, at, end, from] = steps[i];
    h.startSwing(clip, rate, [at], () => fn(i), { lunge: o.lunge ?? 1.2, end: end ?? 0.8, from, aimed: o.aimed, stab: o.stab, mask: o.mask, fade: 0.06, after: () => go(i + 1) });
  };
  go(0);
}
// A throw, out of the clip of one: it leaves the hand a quarter of the way in, as the hand comes past the shoulder, and the
// clip's cut at half (the rest is standing bent over).
const THROW = 0.23;
function throwIt(h, rate, fn, o = {}) { h.startSwing('OverhandThrow', rate, [THROW], fn, { end: 0.5, mask: h.speed > 0.6 ? 'upper' : 'full', ...o }); }
// Where a run ends: turned to whatever's nearest, braced, the ground rung under him.
export function arrive(h, sim, elem) {
  const k = nearest(sim.heroWorld, h.x, h.z, 6);
  if (k) h.yaw = h.faceYaw = dirTo(h, k);
  if (!h.swing && !h.jump && h.bank.clips.Sword_Block) h.play('Sword_Block', 2, 'full', 0.08);
  if (h.fxOk()) { const c = sim.casting; c.burst(FX.RING, elem, h.x, h.y + 0.05, h.z, 0.4, 2.2, 0.35); c.burst(FX.PUFF, STONE, h.x, h.y + 0.3, h.z, 0.4, 1.2, 0.4, { alpha: 0.4 }); hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.3); }
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
function waves(c, x, y, z, yaw, reach, elem, life = 0.35) {
  c.burst(FX.GLYPH, elem, x, y, z, reach * 0.25, reach, life, { ax: 0, ay: 1, az: 0, len: yaw, extra: GLYPHS.WAVES, ease: 1.4 });
}

// ---- things thrown ---------------------------------------------------------------------------------------------------
// A shot of this file's (kind 'x' in HeroWorld.shots): x, y, z, vx, vy, vz, dmg, r (how near it must pass), life, and
// homing (radians a second it turns toward foe), only (strikes its foe and no other), pierce (goes on through), bounce (that many more foes, hop metres apart;
// hopV its speed between them, hopPause a moment held on each), hang (slows to the far end of its throw), backV (how fast it comes home),
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
  // (The speed it left the hand at: what it comes home by, so the way back never feeds on itself.)
  s.thrownV ??= v0;
  const stop = (hit) => { if (!s.done) { s.done = true; s.onEnd?.(s, hit); s.end?.(s); } };
  if (o.dead) return stop();
  if (s.wait > 0) { s.wait -= dt; s.t -= dt; s.tick?.(s, dt); return; }
  // (Held where it struck, a moment: seen, and turning, and going nowhere.)
  if (s.pause > 0) { s.pause -= dt; s.t -= dt; s.tick?.(s, dt); return; }
  if (s.ret && !s.back && s.t > s.life * 0.5) { s.back = true; s.hitSet.clear(); s.onTurn?.(s); }
  if (s.back) {
    // Home to the hand that threw it.
    const hp = o.handPos(s.hand ? 'l' : 'r'), dx = hp[0] - s.x, dy = hp[1] - s.y, dz = hp[2] - s.z, L = Math.hypot(dx, dy, dz);
    // Home by its own pace, half as fast again once it's overdue. (It took its pace from how fast it was already going,
    // so overdue it gained half again every tick, never came within reach of the hand, and in two seconds was ten to the
    // thirty-eighth metres off.) Caught once this tick's step would take it there.
    const v = (s.v || s.thrownV) * (s.t > s.life ? 1.6 : s.backV ?? 1.1);
    if (L < 0.8 || L <= v * dt || s.t > s.life + 3) { s.caught?.(s); return stop(); }
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
  // (hang: what comes back slows as it nears the far end of its throw, and hangs there turning before it does.)
  const sp = s.hang && s.ret && !s.back ? Math.max(0.22, 1 - 0.85 * clamp(s.t / (s.life * 0.5), 0, 1) ** 2) : 1;
  s.x += s.vx * dt * sp; s.y += s.vy * dt * sp; s.z += s.vz * dt * sp;
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
      if (nx) { Object.assign(s, toward(s.x, s.y, s.z, nx, s.hopV || v)); s.foe = nx; s.life = Math.max(s.life, s.t + 1.2); if (s.hopPause) s.pause = s.hopPause; continue; }
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
// onHit (m), each (dt), done (), draw (c, h), aim (the weapon pointed down it), skid (an element: he ends it braced, turned
// to the nearest, the ground rung in that colour).
function dash(h, sim, dir, len, o = {}) {
  const v = o.v || 16;
  len = Math.max(0.5, Math.min(len, sim.world.clearance(h.x, h.z, Math.sin(dir), Math.cos(dir), len, 0.45) - 0.2));
  const clip = h.bank.clips[o.clip || 'Sword_Dash'] ? o.clip || 'Sword_Dash' : 'Sword_Regular_A', T = len / v;
  h.yaw = h.faceYaw = dir;
  h.startSwing(clip, h.bank.clips[clip].dur / (T + 0.3) * (o.hold || 0.5), [], () => {}, { root: true, cut: () => { h.aim = null; } });
  h.charge = { dir, left: len, v, hitSet: new Set(), quick: true, dmg: o.dmg ?? 12, kind: o.kind, o: o.o, onHit: o.onHit, each: o.each, noShove: o.noShove, draw: o.draw, aside: o.aside, done: () => { h.aim = null; o.done?.(); if (o.skid !== undefined) arrive(h, sim, o.skid); } };
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
  // An archer's strafe: across its front at a sprint, the bow on it all the way, an arrow off the string every tenth of a second.
  if (k?.mode === 'strafe') {
    k.t -= dt; k.next -= dt;
    if (k.t <= 0 || !E.fightable(m)) { h.skirm = null; return false; }
    if (k.to) h.goal = { x: k.to[0], z: k.to[1], speed: 4.2, stop: 0.2, face: dirTo(h, m) };
    h.bowUntil = sim.time + 0.3; h.draw = Math.max(h.draw, 0.7); h.pull = Math.max(h.pull, 0.6);
    if (k.next <= 0 && k.n < 8) { k.next = 0.1; k.n++; h.loose(sim, m, rand(-0.3, 0.3), k.dmg, k.n % 2 === 0); h.pull = 0.3; }
    return true;
  }
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
    if (h.orbiting > 0) h.sideGoal = null;
    else if ((h.sideT ?? 0) < sim.time) {
      h.sideT = sim.time + rand(0.9, 1.6);
      const want = h.cls.want ?? 5.5, a = Math.atan2(h.x - m.x, h.z - m.z) + (h.slot % 2 ? 1 : -1) * rand(0.35, 0.6);
      const x = m.x + Math.sin(a) * (want + R), z = m.z + Math.cos(a) * (want + R);
      h.sideGoal = sim.world.inside(x, z, 0.5) ? null : { x, z, speed: 2.8, stop: 0.4, face: dirTo(h, m) };
    }
  } else h.sideGoal = null;
  return false;
}

// The ninja's run round his foe, a star off one hand and then the other every few strides, thrown across his body at it as
// he goes: steel, then fire, frost, storm and spirit in turn. At the end of a storm of them, three at once from a standstill.
const STARS = ['steel', 'fire', 'steel', 'frost', 'steel', 'storm', 'steel', 'spirit'];
function orbitRun(h, sim, w, m, k, line, dt) {
  k.t -= dt; k.fire -= dt;
  if (k.t <= 0 || !E.fightable(m)) {
    h.skirm = null; h.gcd = Math.min(h.gcd, 0.2);
    if (k.rapid && E.fightable(m)) { h.yaw = h.faceYaw = dirTo(h, m); h.hold = 0.35; h.holdFace = h.yaw; h.toss('r', 0.3, () => { if (E.fightable(m)) for (let i = -1; i <= 1; i++) throwStar(h, sim, m, 'steel', 0, i * 0.14, 1.25); }); }
    return false;
  }
  // (Always a quarter of the ring ahead of where he is, so he's at a run the whole way round and never waiting on a mark.)
  const R = k.r + E.radiusOf(m), ha = Math.atan2(h.x - m.x, h.z - m.z);
  let a = ha + k.dir * 0.75, x = m.x + Math.sin(a) * R, z = m.z + Math.cos(a) * R;
  if (sim.world.inside(x, z, 0.5) || sim.world.clearance(h.x, h.z, (x - h.x) / (Math.hypot(x - h.x, z - h.z) || 1), (z - h.z) / (Math.hypot(x - h.x, z - h.z) || 1), 2, 0.45) < 1.2) { k.dir = -k.dir; a = ha + k.dir * 0.75; x = m.x + Math.sin(a) * R; z = m.z + Math.cos(a) * R; }
  h.goal = { x, z, speed: 6.4, stop: 0.1 };
  h.shieldTarget = 0;
  if (k.fire <= 0 && line && !h.tossing) {
    k.fire = k.every;
    const kind = k.rapid ? STARS[k.n % STARS.length] : pick(STARS), hand = k.n % 2;
    k.n++;
    h.toss(hand ? 'l' : 'r', 0.2, () => { if (E.fightable(m)) throwStar(h, sim, m, kind, hand); }, dirTo(h, m));
  }
  return true;
}

// A star off the hand at a foe: steel (a cut), fire (bursts, and burns where it burst), frost (holds what it strikes),
// storm (leaps on to more), spirit (bends after its mark, goes through, and comes back). As wide as a hand and a half,
// whatever it is: steel edged in his own violet, or its element's own colour, a tail of it behind and the blur of its turning.
function throwStar(h, sim, m, kind, hand = 0, spread = 0, big = 1) {
  const w = sim.heroWorld, c = sim.casting, P = h.power(), rk = rank(h), hp = h.handPos(hand ? 'l' : 'r');
  const d = Math.hypot(m.x - hp[0], m.z - hp[2]), a = Math.atan2(m.x - hp[0], m.z - hp[2]) + spread, v = 19;
  const base = { x: hp[0], y: hp[1], z: hp[2], vx: Math.sin(a) * v, vy: (m.y + 1.15 - hp[1]) / Math.max(0.2, d / v), vz: Math.cos(a) * v, life: Math.min(1.3, d / v + 0.25), hand, size: big };
  const drawAs = (elem, mat, n) => (cc, s) => {
    const vv = Math.hypot(s.vx, s.vy, s.vz) || 1, sz = 0.2 * s.size;
    star3(cc, s.x, s.y, s.z, s.t * 26, sz, elem, mat, n, 0.9, 0, true);
    cc.fx(FX.DISC, elem, s.x, s.y - 0.01, s.z, sz * 1.15, 0, 1, 0, 0, 0.22, mat === MAT.STEEL ? 0 : 3, 3);
    cc.fx(FX.TRAIL, elem, s.x, s.y, s.z, 0.05 * s.size, -s.vx / vv, -s.vy / vv, -s.vz / vv, 0.7, 0.7);
  };
  if (kind === 'fire') shot(w, h, { ...base, dmg: 5 * P, elem: FIRE, draw: drawAs(FIRE, MAT.LIGHT, 2), onEnd: (s, on) => {
    if (on) { s.x = on.x; s.z = on.z; }
    const y = sim.world.height(s.x, s.z);
    w.blast(h, s.x, s.z, y, 1.8 + 0.1 * rk, 8 * P, { kind: 'burn', poise: 50, quiet: true, shove: 3 });
    firePatch(h, sim, s.x, s.z, 1.1, 1.1, 3 * P);
    if (h.fxOk()) { c.burst(FX.FLARE, FIRE, s.x, y + 1, s.z, 0.25, 0.8, 0.1, { light: 10, lightR: 5 }); c.burst(FX.RING, FIRE, s.x, y + 0.05, s.z, 0.2, 1.9, 0.3); c.burst(FX.FLAME, FIRE, s.x, y, s.z, 0.8, 1.7, 0.7, { len: 1.2 }); }
  } });
  else if (kind === 'frost') shot(w, h, { ...base, dmg: 6 * P, elem: FROST, draw: drawAs(FROST, MAT.LIGHT, 3), onHit: (k) => {
    daze(sim, w, k, 1); slow(sim, k, 3);
    if (h.fxOk()) for (let i = 0; i < 5; i++) { const q = i * 1.26; c.burst(FX.ICE, FROST, k.x + Math.sin(q) * 0.3, k.y + 0.1, k.z + Math.cos(q) * 0.3, 0.09, 0.06, 0.9, { ax: Math.sin(q) * 0.4, ay: 0.9, az: Math.cos(q) * 0.4, len: rand(0.7, 1.2) }); }
  } });
  else if (kind === 'storm') {
    // (The line of it from each to the next, twice over so it's seen; and a bolt out of the sky on the first.)
    const s0 = shot(w, h, { ...base, dmg: 6 * P, elem: STORM, bounce: 2 + Math.ceil(rk / 2), hop: 7, hopV: 16, draw: drawAs(STORM, MAT.LIGHT, 2), onHit: (k, s) => {
      if (h.fxOk()) {
        const from = s.last, to = [k.x, k.y + 1.1, k.z];
        if (from) { const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2], L = Math.hypot(dx, dy, dz) || 1; for (const t of [0, 0.15]) w.later(t, () => c.burst(FX.BOLT, STORM, from[0], from[1], from[2], 0.35, 0.3, 0.2, { ax: dx / L, ay: dy / L, az: dz / L, len: L, extra: 0.06, light: t ? 0 : 8, lightR: 5 })); }
        else c.burst(FX.BOLT, STORM, k.x, k.y + 8, k.z, 0.5, 0.4, 0.2, { ax: 0, ay: -1, az: 0, len: 8, extra: 0.6, light: 10, lightR: 6 });
        c.burst(FX.FLARE, STORM, k.x, k.y + 1.1, k.z, 0.3, 0.9, 0.2);
      }
      s.last = [k.x, k.y + 1.1, k.z];
    } });
    s0.last = null;
  } else if (kind === 'spirit') shot(w, h, { ...base, dmg: 7 * P, elem: SPIRIT, homing: 7, foe: m, pierce: true, ret: true, backV: 1, life: 2 * (d + 2) / (v * 0.72), hang: true, draw: (cc, s) => { drawAs(SPIRIT, MAT.LIGHT, 2)(cc, s); const vv = Math.hypot(s.vx, s.vy, s.vz) || 1; cc.fx(FX.TRAIL, SPIRIT, s.x, s.y, s.z, 0.09 * s.size, -s.vx / vv, -s.vy / vv, -s.vz / vv, 2.2, 0.4); },
    onHit: (k) => { if (h.fxOk()) c.burst(FX.FLARE, SPIRIT, k.x, k.y + 1.1, k.z, 0.2, 0.8, 0.18); } });
  else shot(w, h, { ...base, dmg: 6 * P, elem: ARCANE, draw: drawAs(ARCANE, MAT.STEEL, 2), o: { quiet: false }, onHit: (k, s) => blood(sim, k, s.vx / v, s.vz / v, 0.25) });
  sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
}

// ---- the lute ----------------------------------------------------------------------------------------------------------

// While a bard plays: on every stroke a note thrown off the strings, out from the lute's belly and away before him
// (never up in his own face), and the string itself (the render thread plucks it). Each way of playing has its own: a
// strum's notes with the sound of it going out along the ground on the downstroke; picking, a quick run of small single
// notes and nothing else; the great wheeling strum, three big ones at once and the ground rung under him.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19];
export function strumFx(h, sim) {
  const t = h.tune, c = sim.casting, w = sim.heroWorld;
  const per = (t.v === 1 ? 5.6 : t.v === 2 ? 0.95 : 2.7 * 2) * (t.rate || 1);       // strokes a second (a strum is down and up)
  const beat = Math.floor(t.t * per + (t.v === 2 ? 0.3 : 0));
  if (beat === t.beat || t.t < 0.12) return;
  t.beat = beat;
  if (t.v === 1 && beat % 2) return;
  if (!h.fxOk() || t.bare) return;
  const elem = t.elem ?? ARCANE, s = Math.sin(h.yaw), co = Math.cos(h.yaw);
  const lx = (h.luteT ? h.luteT[0] : h.x) + s * 0.3, ly = (h.luteT ? h.luteT[1] : h.y + 1.1) - 0.12, lz = (h.luteT ? h.luteT[2] : h.z) + co * 0.3;
  const big = t.v === 2, fine = t.v === 1, down = big || beat % 2 === 0;
  const side = (beat % 2 ? 1 : -1) * rand(0.3, 0.8), n = big ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const g = fine ? GLYPHS.NOTE : pick([GLYPHS.NOTE, GLYPHS.CROTCHET]);
    const out = rand(1.1, 1.8) * (big ? 1.5 : 1), sd = side * (1 + i * 0.6);
    drift(w, h, lx, ly, lz, s * out + co * sd, rand(0.35, 0.7) + (big ? 0.5 : 0), co * out - s * sd, g, t.rainbow ? pick(RAINBOW) : elem, big ? 0.2 : fine ? 0.1 : 0.13, fine ? 0.7 : rand(0.8, 1.2), rand(-1, 1));
  }
  if (!fine && down) {
    waves(c, h.x + s * 0.5, h.y + 0.08, h.z + co * 0.5, h.yaw, big ? 4.2 : 2.2, ARCANE);
    c.burst(FX.GLYPH, ARCANE, lx + s * 0.15, ly, lz + co * 0.15, 0.25, big ? 1.4 : 0.8, 0.3, { ax: -co, ay: 0, az: s, len: 0, extra: GLYPHS.WAVES, alpha: 0.45, ease: 1.3 });
  }
  if (big) c.burst(FX.RING, elem, h.x, h.y + 0.05, h.z, 0.4, 2.4, 0.4, { light: 5, lightR: 4 });
  // The string: a walk up and down a five-note scale, each bard starting from their own place in it.
  t.note = clamp((t.note ?? (h.slot * 3) % 6) + pick([-2, -1, 1, 1, 2]), 0, SCALE.length - 1);
  if (!t.quiet) { hfx(sim, HFX.PLUCK, lx, ly, lz, SCALE[t.note] + (t.key || 0), big ? 0.75 : fine ? 0.35 : 0.45); if (big) hfx(sim, HFX.PLUCK, lx, ly, lz, SCALE[Math.max(0, t.note - 2)] + (t.key || 0), 0.55); }
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

// A board in the air: the hero's own, as a matrix (drawn half as big again, so it's seen). Flat like a discus, its painted
// face up and a little back toward whoever threw it; or (upright) standing, turning about its own height.
function boardFlight(s, upright, big = 1) {
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
  return new Float32Array([X[0] * big, X[1] * big, X[2] * big, 0, Y[0] * big, Y[1] * big, Y[2] * big, 0, Z[0] * big, Z[1] * big, Z[2] * big, 0, s.x, s.y, s.z, 1]);
}
// The board thrown, off the arm that carries it. The paladin's goes from foe to foe: it strikes, hangs there a moment
// turning, and goes for the next within eight metres slower than it left him, the line from each to the next left in the
// air a moment. The lancer's (o.through) goes straight through the whole line of them, standing and turning, and comes
// straight back through them again. Then it's home on the arm, which braces to take it. The hero's own board if he
// carries one; a board of light if he doesn't.
function throwBoard(h, sim, m, X, o) {
  const { w, c, P } = X, real = !!h.offP && h.shieldStyle, side = real ? 'l' : 'r';
  let last = null, n = 0;
  h.yaw = h.faceYaw = dirTo(h, m);
  h.hold = Math.max(h.hold, 0.45); h.holdFace = h.yaw; h.shotCd = Math.max(h.shotCd, 1.7);
  h.toss(side, 0.5, () => {
    if (!E.fightable(m)) return;
    const hp = h.handPos(side), v = 17;
    const legs = o.through ? { pierce: true, hang: true, life: Math.min(1.6, 2 * (dist(h, m) + 4) / (v * 0.72)), backV: 1 } : { bounce: o.bounce, hop: 8, hopV: 8, hopPause: 0.14, backV: 0.85, life: 4 };
    shot(w, h, { x: hp[0], y: hp[1] + 0.1, z: hp[2], ...toward(hp[0], hp[1] + 0.1, hp[2], m, v), v, dmg: o.dmg * P, hk: 'bash', poise: 60, o: { stun: 0.5, elem: o.elem }, r: 0.75, ret: true, hand: real ? 1 : 0, elem: o.elem, skim: true, ...legs,
      onHit: (k, s) => {
        n++;
        if (h.fxOk()) {
          const p = [k.x, k.y + 1.1, k.z];
          if (last && !o.through) { const dx = p[0] - last[0], dy = p[1] - last[1], dz = p[2] - last[2], L = Math.hypot(dx, dy, dz) || 1; c.burst(FX.BEAM, o.elem, last[0], last[1], last[2], 0.14, 0.03, 0.4, { ax: dx / L, ay: dy / L, az: dz / L, len: L, alpha: 0.6, extra: 0.02 }); }
          c.burst(FX.FLARE, o.elem, k.x, k.y + 1.1, k.z, 0.35, 1.1, 0.22, { light: 10, lightR: 5 });
          c.burst(FX.RING, o.elem, k.x, k.y + 0.05, k.z, 0.2, 1.1, 0.3);
          hfx(sim, o.elem === LIGHT ? HFX.CHIME : HFX.SPARKS, k.x, k.y + 1.1, k.z, o.elem === LIGHT ? 5 + n * 2 : 30, 0.5);
          last = p;
        }
        o.onHit?.(k);
      },
      tick: (s) => { if (real) h.free[1] = boardFlight(s, o.upright, 1.5); },
      draw: (cc, s) => {
        const vv = Math.hypot(s.vx, s.vy, s.vz) || 1;
        if (!real) shield3(cc, SHIELDS.ROUND, o.elem, s.x, s.y, s.z, 0.5, Math.sin(s.t * 16), Math.cos(s.t * 16), 1);
        cc.fx(FX.ORB, o.elem, s.x, s.y, s.z, 0.55, 0, 1, 0, 0, real ? 0.3 : 0.5, 7, 5);
        if (!(s.pause > 0)) cc.fx(FX.TRAIL, o.elem, s.x, s.y, s.z, 0.26, -s.vx / vv, -s.vy / vv, -s.vz / vv, 1.6, 0.6);
        cc.fx(FX.DISC, o.elem, s.x, s.y - 0.02, s.z, 0.7, 0, 1, 0, 0, 0.18);
      },
      caught: () => { if (h.fxOk()) hfx(sim, HFX.SPARKS, h.x, h.y + 1.2, h.z, 12); if (!h.swing && !h.jump) h.play(real ? 'Shield_OneShot' : 'Sword_Block', 1.8, 'upper', 0.06); },
      end: (s) => { if (real) h.free[1] = null; if (h.fxOk()) c.burst(FX.FLARE, o.elem, s.x, s.y, s.z, 0.2, 0.7, 0.2, { light: 6, lightR: 3 }); },
    });
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  });
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

// Five blows as fast as the arm will go, feet planted, no two alike and the last from over his head: a thin crescent of
// light where each went, as it lands.
CAST.zeal = (h, sim, m, { c, P }) => {
  const A = ['Sword_Regular_A', 1.5, 0.55, 0.8], B = ['Sword_Regular_B', 1.5, 0.48, 0.78], C = ['Sword_Regular_C', 2.4, 0.33, 0.5];
  let i0 = 0;
  const step = (i) => {
    const last = i === 4;
    h.strikeAround(sim, 2.3, 1.1, (last ? 10 : 6) * P, 0, 2, { poise: last ? 90 : 25, ...(last ? { shove: 4 } : {}) });
    if (h.fxOk()) crescent(c, h, last ? 2.1 : 1.7, LIGHT, { up: last ? 1.2 : [0.6, -0.4, 0.2, -0.6][i], life: last ? 0.16 : 0.1 });
    i0 = i;
  };
  chain(h, sim, [A, B, C, B], step, { lunge: 0.8, mask: 'upper', done: () => chain(h, sim, [['Sword_Attack', 1.25, 0.24, 0.42]], () => step(4), { lunge: 1.4 }) });
};
// A hammer of light made in the raised fist, flung end over end, and coming home to the hand: what it strikes first, it stops on.
CAST.hammer_throw = (h, sim, m, { w, P, rk }) => {
  const big = 1.5 + 0.08 * rk;
  const stop = inHand(h, 'r', 0.3, (c, p, k) => hammer3(c, p[0], p[1] + 0.2 * k, p[2], h.yaw, 0, big * k, LIGHT, 1.3, 6 * k));
  throwIt(h, 1.0, () => {
    stop();
    if (!E.fightable(m)) return;
    const p = h.handPos('r');
    w.shots.push({ kind: 'hammer', owner: h, x: p[0], y: p[1], z: p[2], tx: m.x, tz: m.z, ty: m.y + 1.1, v: 13, out: true, t: 0, hitSet: new Set(), dmg: 18 * P });
    sim.event(EV.WHOOSH, p[0], p[1], p[2]);
  }, { mask: 'full', cut: stop });
};
// The board (or the maul) in its face, and the light comes down on whatever it struck: a pillar on each, and a ring round its feet.
CAST.smite = (h, sim, m, { c, P }) => {
  const board = h.style === 'sword_board';
  h.startSwing(board ? 'L_ShieldJab' : 'Sword_Attack', board ? 1.2 : 1.0, [board ? 0.55 : 0.24], () => {
    const hit = h.strikeAround(sim, 1.9, 0.7, 9 * P, 0, 3, { kind: 'bash', poise: 90, stun: 1.1, shove: 6 });
    if (!h.fxOk()) return;
    hit.forEach((k, i) => {
      c.burst(FX.COLUMN, LIGHT, k.x, k.y, k.z, 3.2, 4.6, 0.32, { len: 0.8, light: i ? 0 : 12, lightR: 6 });
      c.burst(FX.RING, LIGHT, k.x, k.y + 0.05, k.z, 0.3, 1.4, 0.32);
    });
    const f = hit[0] ? [hit[0].x, hit[0].y + 1.2, hit[0].z] : h.ahead(0.9);
    hfx(sim, HFX.CHIME, f[0], f[1], f[2], 0, 0.5);
  }, { lunge: 1.6, end: board ? 0.85 : 0.45 });
};
// The mace brought down into the ground at his feet, and the ground is hallowed where it struck: it burns what stands on it
// (the dead twice over) and mends his own side.
CAST.consecration = (h, sim, m, { w, c }) => {
  h.startSwing('Sword_Attack', 1.0, [0.26], () => {
    const y = sim.world.height(h.x, h.z), f = h.ahead(1.1, 0.2);
    w.zones.push({ kind: 'consecrate', owner: h, x: h.x, z: h.z, y, t: 0, life: 7, r: 2.8, tick: 0 });
    if (h.fxOk()) { boom(c, LIGHT, f[0], y + 0.3, f[2], 1.6, 10); c.burst(FX.RING, LIGHT, h.x, y + 0.05, h.z, 0.4, 2.8, 0.45); hfx(sim, HFX.THUD, f[0], y, f[2], 0.5); hfx(sim, HFX.CHIME, h.x, y + 1, h.z, -5, 0.6); }
    sim.event(EV.GROUND, h.x, y, h.z);
  }, { still: true, hold: [0.32, 0.22], end: 0.5 });
};
CAST.blessed_shield = (h, sim, m, X) => throwBoard(h, sim, m, X, { dmg: 15, bounce: 2 + X.rk, elem: LIGHT });
// Both arms thrown up, and the light breaks outward from him: what's near is thrown back reeling, and his own side is mended.
CAST.holy_nova = (h, sim, m, { w, c, P, rk }) => {
  const r = 4 + 0.3 * rk;
  gather(c, h, LIGHT, r * 0.8, 0.3);
  // (Out of a cheer: both fists overhead a tenth of the way into it, and held there while the light goes out.)
  h.startSwing('LP_cheer', 1.1, [0.115], () => {
    w.blast(h, h.x, h.z, h.y, r, 12 * P, { kind: 'bash', poise: 70, shove: 7, stun: 0.8 });
    for (const o of sideOf(h)) if (!o.dead && dist(o, h) < r + 1) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.08);
    if (h.fxOk()) {
      boom(c, LIGHT, h.x, h.y + 0.6, h.z, r * 1.1, 16);
      c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.5, r, 0.5);
      c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.3, r * 0.6, 0.6);
      c.burst(FX.COLUMN, LIGHT, h.x, h.y, h.z, 3, 4.5, 0.5, { len: 1.6 });
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; drift(w, h, h.x + Math.sin(a) * 0.6, h.y + 1.1, h.z + Math.cos(a) * 0.6, Math.sin(a) * r * 1.6, 0.4, Math.cos(a) * r * 1.6, GLYPHS.CROSS, LIGHT, 0.3, 0.55); }
      hfx(sim, HFX.CHIME, h.x, h.y + 1.2, h.z, 0, 0.7); hfx(sim, HFX.CHIME, h.x, h.y + 1.2, h.z, 7, 0.6);
    }
    sim.event(EV.GROUND, h.x, h.y, h.z);
  }, { still: true, from: 0.085, end: 0.14, hold: [0.125, 0.3] });
};
// Behind the board (or the maul) in a blaze, through whatever's in the way; and stopped hard at the end of it, turned on them.
CAST.crusaders_charge = (h, sim, m, { c, yaw }) => {
  h.shieldTarget = h.shieldStyle ? 1 : 0;
  dash(h, sim, yaw, Math.min(9, dist(h, m) + 1.2), { v: 15, clip: h.shieldStyle ? 'Shield_Dash' : 'Sword_Dash', dmg: 14, kind: 'bash', o: { stun: 0.6 }, skid: LIGHT,
    onHit: (k) => { if (h.fxOk()) c.burst(FX.FLARE, LIGHT, k.x, k.y + 1.1, k.z, 0.4, 1.2, 0.22, { light: 10, lightR: 5 }); },
    draw: (cc) => {
      const s = Math.sin(h.yaw), co = Math.cos(h.yaw);
      cc.fx(FX.KITE, LIGHT, h.x + s * 0.9, h.y + 1.1, h.z + co * 0.9, 0.75, s, 0, co, 0, 0.9, 8, 5, 0.3, 0);
      for (let i = 0; i < 3; i++) cc.fx(FX.TRAIL, LIGHT, h.x - co * (i - 1) * 0.35, h.y + 0.6 + i * 0.4, h.z + s * (i - 1) * 0.35, 0.16, -s, 0, -co, 2.6, 0.7);
    },
    done: () => { if (h.fxOk()) boom(c, LIGHT, h.x + Math.sin(h.yaw) * 0.8, h.y + 0.8, h.z + Math.cos(h.yaw) * 0.8, 1.8, 8); },
  });
};
// The mace held to the sky, and bolts of light out of it on the foe and those about it, one after another.
CAST.fist_of_heavens = (h, sim, m, { w, c, P, rk }) => {
  const marks = [m, ...foesIn(w, m.x, m.z, 6).filter((k) => k !== m)].slice(0, 2 + rk);
  gather(c, h, LIGHT, 2, 0.25);
  h.startSwing('LP_cheer', 1.0, [0.02], () => {
    marks.forEach((k, i) => w.later(i * 0.09, () => {
      if (h.dead || !E.fightable(k)) return;
      h.hit(sim, k, 14 * P, 'burn', 60, 0, { stun: 0.5 });
      if (h.fxOk()) {
        c.burst(FX.BOLT, LIGHT, k.x + rand(-0.6, 0.6), k.y + 10, k.z + rand(-0.6, 0.6), 0.7, 0.5, 0.24, { ax: 0, ay: -1, az: 0, len: 10, extra: 0.5, light: 18, lightR: 8 });
        c.burst(FX.COLUMN, LIGHT, k.x, k.y, k.z, 3, 5, 0.3, { len: 0.9 });
        c.burst(FX.RING, LIGHT, k.x, k.y + 0.05, k.z, 0.3, 1.3, 0.35);
        hfx(sim, HFX.CHIME, k.x, k.y + 1.2, k.z, 12 + i * 2, 0.55);
      }
    }));
  }, { still: true, mask: 'upper', end: 0.05, hold: [0.03, marks.length * 0.09 + 0.1], aimed: SKY });
};
// A ward of light on whoever of his side is lowest: it takes the next blows for them, and mends a little. A shell of light
// about them and three boards of it turning; it flashes where a blow lands on it.
CAST.divine_shield = (h, sim, m, { w, c, rk }) => {
  const who = lowest(w, h, 12, 0.6) || h;
  h.startSwing('LP_cheer', 1.0, [0.02], () => {
    if (who.dead) return;
    who.hp = Math.min(who.maxHp, who.hp + who.maxHp * 0.12);
    if (who !== sim.player) { who.ward = who.maxHp * (0.2 + 0.03 * rk); who.wardT = 6; }
    else who.hp = Math.min(who.maxHp, who.hp + who.maxHp * 0.12);
    if (h.fxOk()) { c.burst(FX.COLUMN, LIGHT, who.x, who.y, who.z, 2.6, 3.4, 0.6, { len: 1.3, light: 12, lightR: 6 }); hfx(sim, HFX.CHIME, who.x, who.y + 1.4, who.z, 4, 0.6); }
    let hp0 = who.ward ?? 0, flash = 0;
    zone(w, h, 5, (cc, z) => {
      if (who.dead) return;
      const k = Math.min(1, z.t * 4, (5 - z.t) * 2), tall = who.rig ? who.rig.height : 1.8;
      cc.fx(FX.RING, LIGHT, who.x, who.y + 0.06, who.z, 1.1, 0, 1, 0, 0, 0.8 * k);
      cc.fx(FX.SHOCK, LIGHT, who.x, who.y + tall * 0.55, who.z, 1.25, 0, 1, 0, 0, (0.2 + 0.6 * flash) * k);
      for (let i = 0; i < 3; i++) { const a = z.t * 2.2 + i * 2.094; cc.fx(FX.KITE, LIGHT, who.x + Math.sin(a) * 1.05, who.y + tall * 0.55, who.z + Math.cos(a) * 1.05, 0.5, Math.sin(a), 0, Math.cos(a), 0, 0.7 * k, 0, 0, 0.3, i); }
    }, (z, dt) => { const now = who.ward ?? 0; if (now < hp0 - 0.5) flash = 1; hp0 = now; flash = Math.max(0, flash - dt * 5); });
  }, { still: true, mask: 'upper', end: 0.05, hold: [0.03, 0.35], aimed: SKY });
};
// The mace held up for as long as it lasts, and pillars of light where the foe and its fellows stand: a ring on the ground
// first, then the pillar, white at its heart.
CAST.heavens_fury = (h, sim, m, { w, c, P, rk }) => {
  h.startSwing('LP_cheer', 1.0, [0.02], () => {
    const cx = m.x, cz = m.z, n = 4 + rk;
    for (let i = 0; i < n; i++) {
      // (On one of them where there's one to be on; where there isn't, near where they were, and never at his own feet.)
      const k = i === 0 ? null : pick(foesIn(w, cx, cz, 4.5));
      let x = cx, z = cz;
      if (k) { x = k.x; z = k.z; } else if (i) for (let t = 0; t < 4; t++) { const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 2.6; x = cx + Math.sin(a) * r; z = cz + Math.cos(a) * r; if (Math.hypot(x - h.x, z - h.z) > 2.2) break; }
      w.later(i * 1.6 / n, () => { if (!h.dead && h.fxOk()) c.burst(FX.RING, LIGHT, x, sim.world.height(x, z) + 0.05, z, 1.3, 1.2, 0.33); });
      w.later(i * 1.6 / n + 0.35, () => {
        if (h.dead) return;
        pillar(h, sim, x, z, 1.3, 11 * P);
        if (h.fxOk()) { const y = sim.world.height(x, z); c.burst(FX.BEAM, LIGHT, x, y + 7, z, 0.22, 0.03, 0.14, { ax: 0, ay: -1, az: 0, len: 7, extra: 0.1, light: 10, lightR: 5 }); hfx(sim, HFX.CHIME, x, y + 1, z, pick([0, 4, 7, 12]), 0.4); }
      });
    }
  }, { still: true, mask: 'upper', end: 0.05, hold: [0.03, 1.9], aimed: SKY });
};
// The mace levelled at the foe, the light gathering on its head; and then a beam of it, held on the foe as it moves, wide
// at the mace and a point at its far end, beating as it burns down the whole line.
CAST.judgment_beam = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  let dir = yaw, tick = 0;
  const reach = h.mainP?.reach ?? 0.9, T0 = 0.32, T = 1.25, len = 11;
  const tip = () => { const p = h.handPos('r'), a = h.aim || [Math.sin(dir), 0, Math.cos(dir)]; return [p[0] + a[0] * reach, p[1] + a[1] * reach, p[2] + a[2] * reach]; };
  h.startSwing('Sword_Block', 1.2, [0.99], () => {}, { still: true, hold: [0.25, T0 + T + 0.1], end: 0.6 });
  h.pointAt([Math.sin(dir), 0.04, Math.cos(dir)], T0 + T + 0.15, { lean: 0.14 });
  let far = len;
  gather(c, h, LIGHT, 2.2, T0);
  zone(w, h, T0 + T, (cc, z) => {
    const p = tip(), ax = Math.sin(dir), az = Math.cos(dir);
    if (z.t < T0) { const k = z.t / T0; cc.fx(FX.ORB, LIGHT, p[0], p[1], p[2], 0.08 + 0.2 * k, 0, 1, 0, 0, 1, 8 * k, 4); cc.fx(FX.GLYPH, LIGHT, p[0], p[1], p[2], 0.6 * (1.3 - k), 0, 0, 0, z.t * 9, 0.7 * k, 0, 0, 0, 0, GLYPHS.STAR4); return; }
    const t = z.t - T0, k = Math.min(1, t * 8, (T - t) * 5), beat = 1 + 0.18 * Math.sin(t * 38);
    // (As far as the last of them it's burning and a stride past: wide at the mace, a point where it ends, and a flare there.)
    cc.fx(FX.BEAM, LIGHT, p[0], p[1], p[2], 0.3 * k * beat, ax, 0, az, far, 0.3, 0, 0, 0, 0, 0.05 * k);
    cc.fx(FX.BEAM, LIGHT, p[0], p[1], p[2], 0.12 * k * beat, ax, 0, az, far, 1, 14 * k, 7, 0, 0.3, 0.02 * k);
    cc.fx(FX.FLARE, LIGHT, p[0] + ax * far, p[1], p[2] + az * far, 0.3 * k * beat, 0, 1, 0, 0, 0.9);
    cc.fx(FX.FLARE, LIGHT, p[0], p[1], p[2], 0.45 * k * beat, 0, 1, 0, 0, 1);
    for (let i = 0; i < 3; i++) { const f = ((t * 2.2 + i / 3) % 1) * far; cc.fx(FX.GLYPH, LIGHT, p[0] + ax * f, p[1], p[2] + az * f, 0.4 * (1 - f / far * 0.6), ax, 0, az, t * 6 + i, 0.6 * k, 0, 0, 0, i, GLYPHS.STAR4); }
  }, (z, dt) => {
    if (E.fightable(m)) dir += clamp(wrapAngle(dirTo(h, m) - dir), -1.6 * dt, 1.6 * dt);
    h.yaw = h.faceYaw = dir;
    if (h.point) h.point.d = [Math.sin(dir), 0.04, Math.cos(dir)];
    if (z.t < T0) { if (z.t + dt >= T0 && h.fxOk()) hfx(sim, HFX.CHIME, h.x, h.y + 1.4, h.z, 0, 0.7); return; }
    if ((tick -= dt) > 0) return;
    tick += 0.13;
    const hit = w.line(h, h.x, h.z, dir, len, 0.5, 3.4 * P, { kind: 'burn', poise: 55, quiet: true });
    let reach = 4;
    for (const k of hit) { reach = Math.max(reach, dist(h, k) + 1); sim.casting.shove(k, Math.sin(dir) * 2.5, Math.cos(dir) * 2.5); if (h.fxOk()) c.burst(FX.FLARE, LIGHT, k.x, k.y + 1.1, k.z, 0.3, 0.7, 0.15); }
    far += (Math.min(len, reach) - far) * 0.5;
  });
};
// A hammer of light as tall as a house: it's there over the foe, the light gathering on it, and then his own arm brings
// it down. It lands as his blow does, and the ground is hallowed where it lands.
CAST.solar_hammer = (h, sim, m, { w, c, P, rk }) => {
  const x = m.x, z = m.z, y = sim.world.height(x, z), T0 = 0.26, T = 0.44, r = 2.6 + 0.2 * rk, face = dirTo(h, m);
  let struck = false;
  const strike = () => {
    if (struck || h.dead) return;
    struck = true;
    w.blast(h, x, z, y, r, 34 * P, { kind: 'bash', poise: 100, stun: 1.5, shove: 5, fromX: x, fromZ: z });
    for (let i = 0; i < 4; i++) w.line(h, x, z, face + i * Math.PI / 2, 4.5, 0.6, 10 * P, { kind: 'burn', poise: 30, quiet: true });
    w.zones.push({ kind: 'consecrate', owner: h, x, z, y, t: 0, life: 6, r: 2.8, tick: 0 });
    if (h.fxOk()) {
      boom(c, LIGHT, x, y + 0.4, z, r * 1.6, 26);
      c.burst(FX.RING, LIGHT, x, y + 0.05, z, 0.5, r + 1.5, 0.6);
      c.burst(FX.COLUMN, LIGHT, x, y, z, 6, 9, 0.6, { len: 2.4 });
      for (let i = 0; i < 4; i++) { const a = face + i * Math.PI / 2; c.burst(FX.BEAM, LIGHT, x, y + 0.25, z, 0.3, 0.05, 0.5, { ax: Math.sin(a), ay: 0, az: Math.cos(a), len: 4.5, extra: 0.25 }); }
      hfx(sim, HFX.THUD, x, y, z, 1); hfx(sim, HFX.CHIME, x, y + 1, z, -5, 0.9);
    }
    sim.event(EV.GROUND, x, y, z);
  };
  if (h.fxOk()) c.burst(FX.RUNE, LIGHT, x, y + 0.06, z, r, r, T + 0.3, { alpha: 0.9, extra: 1 });
  zone(w, h, T + 0.45, (cc, q) => {
    // (Hung four metres up, head down and leaning, growing out of the light; then down, faster as it comes; then gone in a third of a second.)
    const hang = Math.min(1, q.t / T0), u = clamp((q.t - T0) / (T - T0), 0, 1), hy = y + 1.5 + (1 - u * u) * 3.6;
    const fade = q.t > T + 0.1 ? Math.max(0, 1 - (q.t - T - 0.1) / 0.3) : 1;
    hammer3(cc, x - Math.sin(face) * (1 - u) * 0.8, hy + 0.9, z - Math.cos(face) * (1 - u) * 0.8, face + 0.6, Math.PI + (1 - u) * 0.35, 3.2 * (0.5 + 0.5 * hang), LIGHT, 0.7 * fade * hang, 18 * fade * hang);
    if (u < 1) for (let i = 0; i < 5; i++) { const a = i * 1.257 + q.t * 2; cc.fx(FX.BEAM, LIGHT, x + Math.sin(a) * 0.9, hy + 1.6, z + Math.cos(a) * 0.9, 0.05, 0, 1, 0, 3 + i * 0.4, 0.5 * hang, 0, 0, 0, i * 0.2, 0.2); }
    else cc.fx(FX.DISC, LIGHT, x, y + 0.04, z, r, 0, 1, 0, 0, 0.6 * fade, 8 * fade, r * 2);
  }, (q) => { if (q.t >= T + 0.06) strike(); });
  // (His own blow, from over his head, timed to it: the mace is down as the hammer is.)
  h.startSwing('Sword_Attack', 0.84, [0.24], strike, { still: true, hold: [0.3, 0.2], end: 0.45 });
};
// The mace held to the sky for as long as it lasts, and hammers out of it three at a time, all over where the foe and its
// fellows stand: a ring on the ground where each will land, and then the hammer.
CAST.hammer_storm = (h, sim, m, { w, c, P, rk }) => {
  const n = 12 + 3 * rk, T = 0.42, dur = 2.2, bursts = Math.ceil(n / 3);
  gather(c, h, LIGHT, 2.4, 0.25);
  h.startSwing('LP_cheer', 1.0, [0.02], () => {
    const cx = m.x, cz = m.z, drops = [];
    for (let i = 0; i < n; i++) {
      let x, z;
      // (Never on himself.)
      for (let tries = 0; tries < 4; tries++) { const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 4; x = cx + Math.sin(a) * r; z = cz + Math.cos(a) * r; if (Math.hypot(x - h.x, z - h.z) > 2) break; }
      drops.push({ x, z, t0: Math.floor(i / 3) * dur / bursts + (i % 3) * 0.08, a: rand(0, TAU), hit: false });
    }
    if (h.fxOk()) c.burst(FX.RING, LIGHT, cx, sim.world.height(cx, cz) + 0.05, cz, 4, 4.1, dur + 0.2, { alpha: 0.35 });
    zone(w, h, dur + T + 0.3, (cc, q) => {
      for (const d of drops) {
        const u = (q.t - d.t0) / T;
        if (u < -0.4 || u > 1) continue;
        const y = sim.world.height(d.x, d.z);
        cc.fx(FX.RING, LIGHT, d.x, y + 0.06, d.z, 1.15, 0, 1, 0, 0, 0.6 * clamp(u + 0.4, 0, 1));
        if (u >= 0) { hammer3(cc, d.x - Math.sin(d.a) * (1 - u) * 2.2, y + 0.7 + (1 - u * u) * 7, d.z - Math.cos(d.a) * (1 - u) * 2.2, d.a, u * 9, 2.2, LIGHT, 0.9, 0); cc.fx(FX.TRAIL, LIGHT, d.x - Math.sin(d.a) * (1 - u) * 2.2, y + 0.9 + (1 - u * u) * 7, d.z - Math.cos(d.a) * (1 - u) * 2.2, 0.16, -Math.sin(d.a) * 0.3, 1, -Math.cos(d.a) * 0.3, 2.4, 0.6); }
      }
    }, (q) => {
      for (const d of drops) {
        if (d.hit || q.t < d.t0 + T) continue;
        d.hit = true;
        const y = sim.world.height(d.x, d.z);
        w.blast(h, d.x, d.z, y, 1.15, 9 * P, { kind: 'bash', poise: 50, quiet: true, fromX: d.x, fromZ: d.z });
        if (h.fxOk()) { boom(c, LIGHT, d.x, y + 0.2, d.z, 1.5, 9); c.burst(FX.RING, LIGHT, d.x, y + 0.05, d.z, 0.2, 1.3, 0.3); if (Math.random() < 0.5) hfx(sim, HFX.THUD, d.x, y, d.z, 0.3); }
      }
    });
  }, { still: true, end: 0.05, hold: [0.03, dur + 0.2], aimed: SKY });
};

// ---- lancer: the lance's light, the boards that turn round him, and the run ---------------------------------------------

// A sweep: the point carried from his right round to his left through the blow (the turn, for each moment of the clip).
const SWEEP = (f) => 1.5 - 3 * Math.min(1, Math.max(0, (f - 0.08) / 0.3));

// (A thrust, off the right arm: the cross from where the fist starts forward to where it's out, and back for the next.)
const STAB = ['Punch_Cross', 2.2, 0.42, 0.62, 0.15], STAB_LAST = ['Punch_Cross', 1.3, 0.42, 0.78];
// (How long the light off the point is: a thrust in a string of them, and the last and longest.)
const JAB_LIGHT = 1.25, LAST_LIGHT = 2.6;
// Four thrusts, the lance's light off its point down each, and the last of them the longest.
CAST.lance_barrage = (h, sim, m, { P }) => chain(h, sim, [STAB, STAB, STAB, STAB_LAST], (i) => {
  const last = i === 3;
  h.yaw += last ? 0 : (i % 2 ? 0.1 : -0.1);
  h.thrust(sim, 3.2, (last ? 11 : 7) * P, last ? 4 : 0, last ? LAST_LIGHT : JAB_LIGHT);
}, { lunge: 1.2, aimed: true, stab: true });
// The board raised, and boards of gold come up round him and turn: low, wide, as tall as his own. They cut what they
// touch, and everything they touch, and everything near, is his.
CAST.tower_shields = (h, sim, m, { w, c, P, rk }) => {
  const n = Math.min(8, 2 + rk), elem = STORM;
  h.shieldTarget = 1;
  h.startSwing('Shield_OneShot', 1.0, [0.2], () => {
    let pulse = 0;
    if (h.fxOk()) { c.burst(FX.RING, elem, h.x, h.y + 0.06, h.z, 0.4, 2.4, 0.35); hfx(sim, HFX.SPARKS, h.x, h.y + 1.2, h.z, 40); }
    orbit(w, h, { n, r: 2.1, speed: 2.4, life: 10, y: 0.95, dmg: 4 * P, hk: 'bash', reach: 0.8,
      onHit: (k, x, z) => { taunt(sim, h, k); if (h.fxOk()) c.burst(FX.FLARE, elem, x, h.y + 1, z, 0.25, 0.7, 0.15); },
      step: (z, dt) => {
        // (Every two seconds the ring calls everything within seven metres onto him.)
        if ((pulse -= dt) > 0) return;
        pulse = 2;
        for (const k of foesIn(w, h.x, h.z, 7)) taunt(sim, h, k, 4);
        if (h.fxOk()) c.burst(FX.RING, elem, h.x, h.y + 0.06, h.z, 2.1, 7, 0.55, { alpha: 0.6 });
      },
      draw: (cc, x, y, z, a, i, q, k) => {
        shield3(cc, SHIELD_ORDER[i % 4], i % 2 ? FROST : elem, x, y + 0.08 * Math.sin(q.t * 2.6 + i * 1.7), z, 0.58 * (0.25 + 0.75 * k), Math.sin(a), Math.cos(a), 0.7 * k, i === 0 ? 7 * k : 0);
        cc.fx(FX.TRAIL, elem, x, y, z, 0.1, -Math.cos(a), 0, Math.sin(a), 1.3, 0.5 * k);
        if (i === 0) cc.fx(FX.RING, elem, h.x, h.y + 0.06, h.z, 2.1, 0, 1, 0, 0, 0.5 * k);
      } });
  }, { still: true, end: 0.8, hold: [0.32, 0.3] });
};
// The lance swung flat through everything before him: one arc, as far out as its point.
CAST.sweeping_cleave = (h, sim, m, { c, P }) => {
  h.startSwing('Sword_Attack', 1.0, [0.24], () => {
    h.strikeAround(sim, 3.3, 1.75, 13 * P, 0, 8, { kind: 'bash', poise: 70, shove: 7 });
    if (h.fxOk()) crescent(c, h, 2.6, STORM, { life: 0.18, light: 8 });
  }, { lunge: 1.5, aimed: SWEEP, end: 0.5 });
};
CAST.shield_throw = (h, sim, m, X) => throwBoard(h, sim, m, X, { dmg: 13, through: true, elem: STORM, upright: true, onHit: (k) => taunt(sim, h, k, 4) });
// The light gathered on the lance's own point; and a spear of that light thrown off it: through everything on its line,
// and what it goes through reels.
CAST.sunspear = (h, sim, m, { w, c, P }) => {
  const z0 = zone(w, h, 0.6, (cc, q) => { const t = weaponTip(h), k = Math.min(1, q.t / 0.3); cc.fx(FX.ORB, LIGHT, t[0], t[1], t[2], 0.08 + 0.2 * k, 0, 1, 0, 0, 1, 8 * k, 4); });
  throwIt(h, 1.0, () => {
    z0.done = true;
    if (!E.fightable(m)) return;
    const hp = h.handPos('r'), v = 30, vel = toward(hp[0], hp[1], hp[2], m, v);
    shot(w, h, { x: hp[0], y: hp[1], z: hp[2], ...vel, dmg: 18 * P, hk: 'puncture', poise: 90, o: { stun: 0.8, elem: LIGHT }, pierce: true, r: 0.6, life: 0.7, elem: LIGHT,
      draw: (cc, s) => { const ax = s.vx / v, ay = s.vy / v, az = s.vz / v; pike3(cc, s.x - ax * 1.4, s.y - ay * 1.4, s.z - az * 1.4, ax, ay, az, 2.6, LIGHT, 2.2, 1.6); cc.fx(FX.TRAIL, LIGHT, s.x - ax * 1.2, s.y - ay * 1.2, s.z - az * 1.2, 0.14, -ax, -ay, -az, 2.4, 0.7); cc.fx(FX.FLARE, LIGHT, s.x + ax * 1.2, s.y + ay * 1.2, s.z + az * 1.2, 0.3, 0, 1, 0, 0, 1); }, });
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  }, { mask: 'full', end: 0.42, cut: () => { z0.done = true; } });
};
// The board into the ground: a ring of force, and boards of gold flung out every way. What it throws back is his.
CAST.bulwark_nova = (h, sim, m, { w, c, P, rk }) => {
  h.shieldTarget = 1;
  gather(c, h, STORM, 3, 0.3);
  h.startSwing('Shield_OneShot', 1.0, [0.42], () => {
    const r = 4.2 + 0.2 * rk;
    for (const k of w.blast(h, h.x, h.z, h.y, r, 12 * P, { kind: 'bash', poise: 90, stun: 1.2, shove: 8 })) taunt(sim, h, k, 6);
    for (const k of foesIn(w, h.x, h.z, 8)) taunt(sim, h, k, 5);
    if (h.fxOk()) {
      boom(c, STORM, h.x, h.y + 0.5, h.z, r * 0.9, 16);
      c.burst(FX.RING, STORM, h.x, h.y + 0.05, h.z, 0.5, r, 0.5);
      c.burst(FX.RING, FROST, h.x, h.y + 0.05, h.z, 0.3, r * 0.7, 0.6);
      zone(w, h, 0.45, (cc, q) => { const k = q.t / 0.45; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; shield3(cc, SHIELD_ORDER[i % 4], i % 2 ? FROST : STORM, h.x + Math.sin(a) * (0.8 + k * r), h.y + 1, h.z + Math.cos(a) * (0.8 + k * r), (0.5 + k * 0.25) * Math.min(1, (1 - k) * 4), Math.sin(a), Math.cos(a), 1 - k); } });
      hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.8); hfx(sim, HFX.SPARKS, h.x, h.y + 0.6, h.z, 50);
    }
    sim.event(EV.GROUND, h.x, h.y, h.z);
  }, { still: true, hold: [0.5, 0.22] });
};
// Drawn back, the light gathering on its point; and let go: the lance's light down its whole length and eight metres past
// it, wide at the point and thinning to nothing.
CAST.lance_of_light = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  const z0 = zone(w, h, 0.6, (cc, q) => { const t = weaponTip(h), k = Math.min(1, q.t / 0.4); cc.fx(FX.ORB, STORM, t[0], t[1], t[2], 0.06 + 0.2 * k, 0, 1, 0, 0, 1, 8 * k, 4); });
  h.startSwing('Sword_Regular_C', 1.6, [0.33], () => {
    z0.done = true;
    const p = weaponTip(h), ax = Math.sin(h.yaw), az = Math.cos(h.yaw), len = 9;
    const hit = w.line(h, h.x, h.z, h.yaw, len + 2, 0.65, 22 * P, { kind: 'puncture', poise: 90, knock: 3 });
    if (h.fxOk()) {
      c.burst(FX.BEAM, STORM, p[0], p[1], p[2], 0.45, 0.15, 0.4, { ax, ay: 0, az, len, extra: 0.03 });
      c.burst(FX.BEAM, LIGHT, p[0], p[1], p[2], 0.18, 0.04, 0.4, { ax, ay: 0, az, len, extra: 0.01, light: 14, lightR: 8 });
      c.burst(FX.FLARE, STORM, p[0], p[1], p[2], 0.3, 0.9, 0.18);
      for (const k of hit) slash(c, k.x, k.y + 1.1, k.z, h.yaw + Math.PI / 2, 0, 2, STORM, 0.2);
    }
    sim.event(EV.WHOOSH, p[0], p[1], p[2]);
  }, { still: true, aimed: true, end: 0.6, cut: () => { z0.done = true; } });
};
// Up, board first, and down among them: the ground rings, and everything near is his.
const VALIANT = { T: 0.58, apex: 1.9, snap: true, r: 3, dmg: 16, elem: STORM, air: 'NinjaJump_Idle_Loop', o: { stun: 0.9 }, landClip: 'Jump_Land', landRate: 2,
  // (Board up before him, and the lance levelled down at where he'll land: not hanging from his fist.)
  tick: (h, sim, j) => { h.shieldTarget = 1; const dn = 0.25 + 0.5 * j.u, n = Math.hypot(1, dn); h.aim = [Math.sin(j.head) / n, -dn / n, Math.cos(j.head) / n]; },
  draw: (c, h, j) => { const s = Math.sin(h.yaw), co = Math.cos(h.yaw); mark(c, h, j, STORM, 3); c.fx(FX.TRAIL, STORM, h.x, h.y + 1, h.z, 0.25, -s, 0.4, -co, 2.2, 0.7); } };
CAST.valiant_leap = (h, sim, m, { w, c }) => {
  h.leap(sim, m, { ...VALIANT, land: (hh, s2, j, fx, fz) => {
    for (const k of w.blast(h, fx, fz, h.y, 3, 16 * h.power(), { kind: 'bash', poise: 80, stun: 0.9, shove: 6 })) taunt(sim, h, k, 6);
    for (const k of foesIn(w, h.x, h.z, 7)) taunt(sim, h, k, 5);
    if (h.fxOk()) { boom(c, STORM, h.x, h.y + 0.3, h.z, 3.8, 14); c.burst(FX.RING, STORM, h.x, h.y + 0.05, h.z, 0.4, 3.5, 0.5); hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.7); }
    sim.event(EV.GROUND, h.x, h.y, h.z);
  } });
};
// Three runs, one after another, each through whoever's nearest that he hasn't yet run through: the line of each is left
// in the air behind him, and he stops hard at the end of the last, turned on them.
CAST.phalanx_rush = (h, sim, m, { w, c }) => {
  const seen = new Set();
  const go = (k, left) => {
    if (h.dead || !E.fightable(k)) return;
    seen.add(k);
    h.shieldTarget = 1;
    const x0 = h.x, y0 = h.y + 1, z0 = h.z;
    const nx = () => left > 0 && nearest(w, h.x, h.z, 8, seen);
    dash(h, sim, dirTo(h, k), Math.min(8, dist(h, k) + 2.2), { v: 18, clip: 'Shield_Dash', dmg: 12, o: { stun: 0.5 }, aim: true,
      onHit: (f) => { if (h.fxOk()) slash(c, f.x, f.y + 1.1, f.z, h.yaw + Math.PI / 2, 0, 2, STORM, 0.2); },
      draw: (cc) => { const p = h.handPos('r'), s = Math.sin(h.yaw), co = Math.cos(h.yaw); cc.fx(FX.BEAM, STORM, p[0], p[1], p[2], 0.09, s, 0, co, 3, 1, 6, 4, 0, 0, 0.03); cc.fx(FX.TRAIL, STORM, h.x, h.y + 1, h.z, 0.3, -s, 0, -co, 3, 0.7); shield3(cc, SHIELDS.TOWER, STORM, h.x + s * 1.0, h.y + 1, h.z + co * 1.0, 0.7, s, co, 0.8); },
      done: () => {
        if (h.fxOk()) { const dx = h.x - x0, dz = h.z - z0, L = Math.hypot(dx, dz) || 1; c.burst(FX.BEAM, STORM, x0, y0, z0, 0.16, 0.02, 0.6, { ax: dx / L, ay: 0, az: dz / L, len: L, alpha: 0.6, extra: 0.05 }); }
        const f = nx();
        if (f) w.later(0.1, () => go(f, left - 1));
        else arrive(h, sim, STORM);
      } });
  };
  go(m, 2);
};
// The lance's butt struck down, and spears of steel, lit violet, up out of the ground under them in a row, leaning away from him.
CAST.spear_wall = (h, sim, m, { w, c, P, rk, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  h.startSwing('Sword_Regular_C', 1.3, [0.33], () => {
    const n = 7 + rk, s = Math.sin(h.yaw), co = Math.cos(h.yaw), d0 = clamp(E.fightable(m) ? dist(h, m) : 3, 2.2, 5), cx = h.x + s * d0, cz = h.z + co * d0, pts = [];
    for (let i = 0; i < n; i++) { const u = (i / (n - 1) - 0.5) * 2, f = (i % 2 ? 0.5 : -0.3) - u * u * 0.9, x = cx + s * f + co * u * 2.6, z = cz + co * f - s * u * 2.6; pts.push([x, sim.world.height(x, z), z, Math.abs(u) * 0.12, rand(1.7, 2.4)]); }
    for (const k of w.blast(h, cx, cz, h.y, 3, 14 * P, { kind: 'puncture', poise: 90, stun: 1, shove: 1, up: 4.5 })) blood(sim, k, s, co, 0.5);
    zone(w, h, 1.05, (cc, q) => {
      for (const [x, y, z, t0, L] of pts) {
        const u = clamp((q.t - t0) / 0.1, 0, 1), sink = q.t > 0.85 ? (q.t - 0.85) / 0.2 : 0, fan = (x - cx) * co - (z - cz) * s, ax = s * 0.3 + co * fan * 0.07, az = co * 0.3 - s * fan * 0.07, nn = Math.hypot(ax, 1, az);
        if (u > 0) pike3(cc, x, y - L * (1 - u + sink) - 0.15, z, ax / nn, 1 / nn, az / nn, L, STORM, 1.2, 1.4);
      }
    });
    if (h.fxOk()) { c.burst(FX.RING, STORM, cx, h.y + 0.05, cz, 0.5, 3.2, 0.5); for (const [x, y, z] of pts) if (Math.random() < 0.6) c.burst(FX.PUFF, STONE, x, y + 0.2, z, 0.2, 0.7, 0.4, { alpha: 0.4 }); hfx(sim, HFX.THUD, cx, h.y, cz, 0.6); }
    sim.event(EV.GROUND, cx, h.y, cz);
  }, { still: true });
};
// The Order rides: five lancers of light out from behind him in a wedge, through everything before them.
CAST.charge_of_the_order = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  // (The clip is ten seconds of pointing: its first second is the arm coming up, which is all that's wanted.)
  gather(c, h, STORM, 3, 0.3);
  h.pointAt([Math.sin(yaw), 0, Math.cos(yaw)], 1.6);
  h.startSwing('LP_Pointing_at_an_enemy', 1.5, [0.05], () => {
    const s = Math.sin(yaw), co = Math.cos(yaw), riders = [];
    for (let i = 0; i < 5; i++) { const k = i - 2; riders.push({ x: h.x - s * (3.5 + Math.abs(k) * 1.2) + co * k * 1.5, z: h.z - co * (3.5 + Math.abs(k) * 1.2) - s * k * 1.5, hit: new Set() }); }
    h.guardT = Math.max(h.guardT, 6);
    if (h.fxOk()) { c.burst(FX.RING, STORM, h.x, h.y + 0.05, h.z, 0.5, 4, 0.6); hfx(sim, HFX.CHIME, h.x, h.y + 1.5, h.z, -7, 0.8); }
    sim.event(EV.ROAR, h.x, h.y + 1.6, h.z, 0.5);
    zone(w, h, 1.15, (cc, q) => {
      const k = Math.min(1, q.t * 5, (1.15 - q.t) * 4);
      for (const r of riders) {
        const y = sim.world.height(r.x, r.z);
        shield3(cc, SHIELDS.KITE, FROST, r.x + s * 0.5, y + 1.5, r.z + co * 0.5, 0.6 * k, s, co, 0.8 * k);
        cc.fx(FX.BEAM, STORM, r.x, y + 1.3, r.z, 0.1, s, -0.05, co, 3.4, k, 6 * k, 4, 0, 0, 0.03);
        cc.fx(FX.FLARE, LIGHT, r.x + s * 3.4, y + 1.15, r.z + co * 3.4, 0.3, 0, 1, 0, 0, k);
        cc.fx(FX.TRAIL, STORM, r.x, y + 0.9, r.z, 0.4, -s, 0, -co, 3.5, 0.5 * k);
        cc.fx(FX.COLUMN, STORM, r.x, y, r.z, 1.9, 0, 1, 0, 0.35, 0.3 * k);
        cc.fx(FX.PUFF, STONE, r.x - s * 0.8, y + 0.4, r.z - co * 0.8, 0.7, 0, 1, 0, 0, 0.3 * k, 0, 0, q.t, r.x);
      }
    }, (q, dt) => {
      for (const r of riders) {
        r.x += s * 13 * dt; r.z += co * 13 * dt;
        for (const k of w.targets) {
          if (!E.fightable(k) || r.hit.has(k) || Math.hypot(k.x - r.x - s * 1.5, k.z - r.z - co * 1.5) > 1.3 + E.radiusOf(k)) continue;
          r.hit.add(k);
          h.hit(sim, k, 20 * P, 'puncture', 90, 0, { stun: 1, shove: 6, fromX: r.x, fromZ: r.z });
        }
      }
    });
  }, { still: true, end: 0.14 });
};

// ---- archer: arrows that do more than fly ------------------------------------------------------------------------------

// An arrow of this file's: off the bow hand at the foe. o as shot(), plus spread, fat (how thick it's drawn), more (c, s, v).
function arrow(h, sim, m, o) {
  const w = sim.heroWorld, hp = h.handPos('l'), v = o.v || 46;
  const a = Math.atan2(m.x - hp[0], m.z - hp[2]) + (o.spread || 0), d = Math.hypot(m.x - hp[0], m.z - hp[2]), t = d / v, ty = m.y + (m instanceof E.Gravehart ? 1.8 : 1.1);
  h.draw = 0; h.bowUntil = sim.time + 0.32;
  sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  const elem = o.elem ?? h.stringElem;
  return shot(w, h, { x: hp[0], y: hp[1], z: hp[2], vx: Math.sin(a) * v, vy: (ty - hp[1]) / Math.max(t, 0.05) + (o.grav ?? 5) * 0.5 * t, vz: Math.cos(a) * v, grav: o.grav ?? 5, hk: 'puncture', life: 1.6, r: 0.4, elem,
    draw: (cc, s) => { arrow3(cc, s.x, s.y, s.z, s.vx, s.vy, s.vz, elem, o.fat || 1); o.more?.(cc, s, Math.hypot(s.vx, s.vy, s.vz) || 1); }, ...o });
}
// Draw and loose, with whatever the arrow is.
function bowShot(h, sim, rate, fn) { h.aimT = 0; h.draw = 1; h.startSwing('Spell_Simple_Shoot', rate * 0.9, [0.6], fn, { still: true, mask: 'upper' }); }

// A backward somersault out of reach, low and quick, something thrown from the top of it (a rogue's).
const BACKFLIP = { T: 0.5, apex: 1.0, flip: -1, back: true, snap: true, r: 0, dmg: 0, air: 'NinjaJump_Idle_Loop', rest: 0.2, land: (h, sim) => { sim.event(EV.LAND, h.x, h.y, h.z, 0.5); if (h.fxOk()) sim.casting.burst(FX.RING, ARCANE, h.x, h.y + 0.05, h.z, 0.2, 1, 0.3); } };
// A long low spring backward, feet first and facing it still (an archer's): no turning over, the bow never off the mark.
const SPRING = { T: 0.42, apex: 0.8, back: true, snap: true, r: 0, dmg: 0, air: 'NinjaJump_Idle_Loop', rest: 0.16, crouch: 0.05, landClip: 'Jump_Land', landRate: 2.4, land: (h, sim) => { sim.event(EV.LAND, h.x, h.y, h.z, 0.4); if (h.fxOk()) sim.casting.burst(FX.PUFF, SPIRIT, h.x, h.y + 0.2, h.z, 0.3, 1, 0.4, { alpha: 0.4 }); } };
function leapAway(h, sim, m, far, L, mid) {
  const away = Math.atan2(h.x - m.x, h.z - m.z);
  let to = null;
  for (const da of [0, 0.5, -0.5, 1, -1]) { to = spotAt(h, sim, h.x, h.z, away + da, far); if (to) break; }
  if (!to) return false;
  let done = false;
  h.leap(sim, m, { draw: (c) => { c.fx(FX.TRAIL, SPIRIT, h.x, h.y + 1, h.z, 0.2, Math.sin(away + Math.PI), 0.3, Math.cos(away + Math.PI), 1.6, 0.5); }, ...L,
    tick: (hh, s2, j) => { if (h.style === 'bow') { h.bowUntil = sim.time + 0.25; h.pull = Math.max(h.pull, 0.8); } if (!done && j.u > 0.45) { done = true; mid?.(); } } }, { to });
  return true;
}
// Sprung back out of reach, three arrows off the string before her feet are down.
CAST.disengage = (h, sim, m, { P }) => {
  if (!leapAway(h, sim, m, 6.5, SPRING, () => { for (let i = -1; i <= 1; i++) if (E.fightable(m)) h.loose(sim, m, i * 0.12, 7 * P, i !== 0); })) h.gcd = 0.1;
};
// Five arrows off one draw, each to a mark of its own where there are five to be had.
CAST.volley = (h, sim, m, { w, P }) => bowShot(h, sim, 0.75, () => {
  const marks = [m, ...foesIn(w, m.x, m.z, 6).filter((k) => k !== m)];
  for (let i = 0; i < 5; i++) { const k = marks[i % marks.length]; if (E.fightable(k)) arrow(h, sim, k, { spread: i < marks.length ? 0 : (i - 2) * 0.1, dmg: 9 * P, v: 34, fat: 1.4 }); }
});
// Eight arrows as fast as the string will go, loosed on the run: across its front at a sprint, the bow on it all the way.
CAST.strafe = (h, sim, m, { P }) => {
  const side = (h.slot + Math.floor(sim.time)) % 2 ? 1 : -1, a = dirTo(h, m) + side * Math.PI / 2;
  h.skirm = { mode: 'strafe', t: 0.95, to: spotAt(h, sim, h.x, h.z, a, 4.5) || spotAt(h, sim, h.x, h.z, a + Math.PI, 4.5), n: 0, next: 0.1, dmg: 6 * P };
  h.shotCd = 1.3;
};
// The bow to the sky: a sheaf of three sent up, and again, and then they come down on a slant all over where the foe
// stands, and stand in the ground where they land.
function arrowRain(h, sim, m, r, n, secs) {
  const ups = Math.max(2, Math.round((secs + 0.3) / 0.28));
  const w = sim.heroWorld, c = sim.casting, cx = m.x, cz = m.z, cy = sim.world.height(cx, cz), e = h.stringElem;
  h.bowLoftT = 0.6 + ups * 0.28; h.aimT = 0; h.draw = 1;
  h.startSwing('Spell_Simple_Shoot', 0.8, [0.55], () => {
    for (let k = 0; k < ups; k++) w.later(k * 0.28, () => {
      if (h.dead) return;
      const hp = h.handPos('l'), s = Math.sin(h.yaw), co = Math.cos(h.yaw);
      h.bowUntil = sim.time + 0.4; h.pull = 0.9; h.hold = Math.max(h.hold, 0.35);
      for (let i = -1; i <= 1; i++) w.shots.push({ kind: 'arrow', owner: h, x: hp[0], y: hp[1], z: hp[2], vx: s * 12 + co * i * 1.5, vy: 30, vz: co * 12 - s * i * 1.5, t: 0, dmg: 0, elem: e, up: true });
      sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
    });
    if (h.fxOk()) { c.burst(FX.RING, e, cx, cy + 0.05, cz, r, r, secs + 0.6, { alpha: 0.35 }); if (r > 4) c.burst(FX.RING, e, cx, cy + 0.05, cz, r * 0.6, r * 0.6, secs + 0.6, { alpha: 0.2 }); }
    w.zones.push({ kind: 'rain', owner: h, x: cx, z: cz, y: cy, r, t: -0.55, life: secs, n, dropped: 0, elem: e, from: h.yaw });
  }, { still: true, mask: 'upper', hold: [0.9, ups * 0.28] });
}
CAST.rain_of_arrows = (h, sim, m) => arrowRain(h, sim, m, 3.5, 55, 1.3);
CAST.piercing_arrow = (h, sim, m, { c, P, rk }) => bowShot(h, sim, 0.8, () => {
  arrow(h, sim, m, { v: 64, grav: 1, dmg: 13 * P, pierce: 3 + rk, fat: 2, life: 0.6, more: (cc, s, vv) => { cc.fx(FX.BEAM, h.stringElem, s.x, s.y, s.z, 0.1, -s.vx / vv, -s.vy / vv, -s.vz / vv, 7, 0.7, 4, 3, 0, 0, 0.01); },
    onHit: (k) => { if (h.fxOk()) c.burst(FX.FLARE, h.stringElem, k.x, k.y + 1.1, k.z, 0.2, 0.7, 0.14); } });
});
// One arrow that parts in the air, in a burst of light, into three or four: each bends away to a mark of its own.
CAST.split_shot = (h, sim, m, { w, c, P, rk }) => bowShot(h, sim, 0.85, () => {
  arrow(h, sim, m, { dmg: 6 * P, life: clamp(dist(h, m) * 0.55 / 46, 0.08, 0.3), fat: 1.8, more: (cc, s) => cc.fx(FX.ORB, h.stringElem, s.x, s.y, s.z, 0.12, 0, 1, 0, 0, 1, 4, 3), onEnd: (s, hitM) => {
    if (hitM) return;
    const n = 3 + Math.floor(rk / 2), marks = [m, ...foesIn(w, m.x, m.z, 6).filter((k) => k !== m)];
    if (h.fxOk()) c.burst(FX.FLARE, h.stringElem, s.x, s.y, s.z, 0.2, 0.6, 0.1, { light: 8, lightR: 5 });
    for (let i = 0; i < n; i++) {
      // (Slow enough to turn inside the ground it has: each fork bends round onto its own mark and stops in it.)
      const k = marks[i % marks.length], a = Math.atan2(s.vx, s.vz) + (i - (n - 1) / 2) * 0.5, v = 17;
      shot(w, h, { x: s.x, y: s.y, z: s.z, vx: Math.sin(a) * v, vy: 2.5, vz: Math.cos(a) * v, homing: 13, foe: k, only: true, dmg: 8 * P, hk: 'puncture', life: 1.1, r: 0.4, elem: h.stringElem,
        draw: (cc, q) => { arrow3(cc, q.x, q.y, q.z, q.vx, q.vy, q.vz, h.stringElem, 1.2); const vv = Math.hypot(q.vx, q.vy, q.vz) || 1; cc.fx(FX.TRAIL, h.stringElem, q.x, q.y, q.z, 0.07, -q.vx / vv, -q.vy / vv, -q.vz / vv, 2.6, 0.5); } });
    }
  } });
});
// The mark lit first, at its feet and over its head, while she draws; then an arrow sent up and wide of it that bends
// round in the air and comes down on it.
CAST.guided_arrow = (h, sim, m, { w, c, P }) => {
  const z0 = zone(w, h, 2.6, (cc, q) => {
    if (!E.fightable(m)) return;
    cc.fx(FX.RING, SPIRIT, m.x, m.y + 0.06, m.z, 1.3 - 0.55 * Math.min(1, q.t / 0.5) + 0.06 * Math.sin(q.t * 14), 0, 1, 0, 0, 0.8);
    cc.fx(FX.GLYPH, SPIRIT, m.x, m.y + 2.25, m.z, 0.2, 0, 0, 0, q.t * 4, 0.9, 0, 0, 0, 0, GLYPHS.STAR4);
  });
  h.bowLoftT = 0.5;
  bowShot(h, sim, 0.85, () => {
    const side = pick([-0.7, 0.7]);
    arrow(h, sim, m, { v: 16, grav: 0, spread: side, loft: 0.25, homing: 12, foe: m, only: true, dmg: 16 * P, life: 2.4, fat: 1.7, elem: SPIRIT, vy: 6,
      more: (cc, s, vv) => { cc.fx(FX.TRAIL, SPIRIT, s.x, s.y, s.z, 0.08, -s.vx / vv, -s.vy / vv, -s.vz / vv, 3.4, 0.5); for (const k of [0, Math.PI]) { const a = s.t * 16 + k; cc.fx(FX.ORB, SPIRIT, s.x + Math.cos(a) * 0.16, s.y + Math.sin(a) * 0.16, s.z, 0.06, 0, 1, 0, 0, 0.9); } },
      onHit: (k) => { if (h.fxOk()) c.burst(FX.FLARE, SPIRIT, k.x, k.y + 1.1, k.z, 0.3, 0.9, 0.2, { light: 6, lightR: 4 }); },
      end: () => { z0.done = true; } });
  });
};
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
    if (h.fxOk()) { boom(c, FIRE, s.x, s.y + 0.3, s.z, r * 1.2, 18); c.burst(FX.FLAME, FIRE, s.x, y, s.z, 1.2, 2.6, 0.5, { len: 1.8 }); c.burst(FX.PUFF, FIRE, s.x, y + 1, s.z, 0.6, 2, 0.8, { alpha: 0.6 }); hfx(sim, HFX.THUD, s.x, y, s.z, 0.6); }
  } });
});
// Ice where it lands: what's near is held in it, and slowed after.
CAST.frost_arrow = (h, sim, m, { w, c, P, rk }) => bowShot(h, sim, 0.8, () => {
  arrow(h, sim, m, { dmg: 5 * P, elem: FROST, fat: 1.8, more: (cc, s) => cc.fx(FX.GLYPH, FROST, s.x, s.y, s.z, 0.22, 0, 0, 0, s.t * 9, 0.9, 3, 3, 0, 0, GLYPHS.STAR6), onEnd: (s) => {
    const vv = Math.hypot(s.vx, s.vz) || 1; s.x += s.vx / vv * 0.9; s.z += s.vz / vv * 0.9;
    const y = sim.world.height(s.x, s.z), r = 2.5 + 0.15 * rk;
    for (const k of w.blast(h, s.x, s.z, y, r, 9 * P, { kind: 'gash', poise: 40 })) { daze(sim, w, k, 1.5); slow(sim, k, 3.5); }
    if (h.fxOk()) {
      boom(c, FROST, s.x, y + 0.3, s.z, r * 1.1, 12);
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
    cc.fx(FX.RING, h.stringElem, h.x, h.y + 0.06, h.z, 1.6 - 0.9 * k, 0, 1, 0, 0, 0.3 + 0.6 * k);
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
      boom(c, h.stringElem, m.x, m.y + 1.1, m.z, 1.8, 16);
      c.burst(FX.GLYPH, h.stringElem, m.x, m.y + 1.1, m.z, 0.5, 1.8, 0.3, { ay: 0, extra: GLYPHS.SPARK });
      boom(c, h.stringElem, hp[0], hp[1], hp[2], 0.9, 0);
    }
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  }, { still: true, mask: 'upper', cut: () => { z0.done = true; } });
};
// An arrow that leaps from one to the next, a line of light drawn between each: a constellation of them.
CAST.chain_shot = (h, sim, m, { w, c, P, rk }) => bowShot(h, sim, 0.85, () => {
  const s0 = arrow(h, sim, m, { dmg: 10 * P, bounce: 3 + rk, hop: 8, hopV: 16, hopPause: 0.05, fat: 1.5, elem: SPIRIT, grav: 0, v: 40, more: (cc, s) => cc.fx(FX.GLYPH, SPIRIT, s.x, s.y, s.z, 0.25, 0, 0, 0, s.t * 9, 1, 3, 3, 0, 0, GLYPHS.STAR4),
    onHit: (k, s) => {
      if (h.fxOk()) {
        if (s.last) { const dx = k.x - s.last[0], dy = k.y + 1.1 - s.last[1], dz = k.z - s.last[2], L = Math.hypot(dx, dy, dz) || 1; c.burst(FX.BEAM, SPIRIT, s.last[0], s.last[1], s.last[2], 0.05, 0.02, 0.6, { ax: dx / L, ay: dy / L, az: dz / L, len: L, extra: 0.03 }); }
        c.burst(FX.GLYPH, LIGHT, k.x, k.y + 1.1, k.z, 0.35, 0.15, 0.3, { ay: 0, extra: GLYPHS.STAR4, light: 6, lightR: 4 });
      }
      s.last = [k.x, k.y + 1.1, k.z];
    } });
  s0.last = null;
});
// The sky full of them: sheaf after sheaf sent up, and seventy and more come down over a wide ring, for three seconds.
CAST.arrow_storm = (h, sim, m, { rk }) => arrowRain(h, sim, m, 4.2, 120 + 12 * rk, 2.6);
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
        if (h.fxOk()) { boom(c, VOID, x, y, z, 5.5, 22); boom(c, ARCANE, x, y, z, 3.5, 0); c.burst(FX.RING, VOID, x, y - 1.05, z, 0.5, 5, 0.5); hfx(sim, HFX.THUD, x, y - 1.1, z, 1); }
      }
    });
  } });
});

// ---- rogue: over them, through them, and the blood everywhere ---------------------------------------------------------

// What a rogue's knives leave in the air as he turns over: crimson off one hand, violet off the other.
function flipTrails(c, h, t, k = 1) {
  for (const [side, e] of [['l', DRAIN], ['r', ARCANE]]) {
    const p = h.handPos(side);
    c.fx(FX.ORB, e, p[0], p[1], p[2], 0.07, 0, 1, 0, 0, k);
    c.fx(FX.TRAIL, e, p[0], p[1], p[2], 0.09, -Math.sin(h.yaw), 0.2, -Math.cos(h.yaw), 1.1, 0.8 * k);
  }
  c.fx(FX.GLYPH, Math.floor(t * 9) % 2 ? DRAIN : ARCANE, h.x, h.y + 1, h.z, 0.7, Math.cos(h.yaw), 0, -Math.sin(h.yaw), -h.bodyFlip, 0.4 * k, 0, 0, 0, 0, GLYPHS.CRESCENT);
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
  const w = sim.heroWorld, hp = h.handPos(i % 2 ? 'l' : 'r'), e = i % 2 ? ARCANE : DRAIN;
  // (At the height of a chest four strides off, from wherever the hand is.)
  shot(w, h, { x: hp[0], y: hp[1], z: hp[2], vx: Math.sin(a) * v, vy: (h.y - h.air + 1.0 - hp[1]) * v / 4 + 0.5, vz: Math.cos(a) * v, grav: 2, dmg, o: { bleed: true }, life: 0.5, r: 0.45, elem: e,
    onHit: (k) => blood(sim, k, Math.sin(a), Math.cos(a), 0.35),
    draw: (c, s) => { c.fx(FX.BLADE, e, s.x - Math.sin(a) * 0.25, s.y, s.z - Math.cos(a) * 0.25, 0.07, Math.sin(a), 0.05, Math.cos(a), 0.55, 1, 0, 0, 0, i); c.fx(FX.TRAIL, e, s.x, s.y, s.z, 0.05, -Math.sin(a), 0, -Math.cos(a), 1.1, 0.7); } });
}
// A forward somersault onto it, both knives coming down as he lands.
CAST.flip_strike = (h, sim, m, { w, c }) => {
  h.leap(sim, m, { T: 0.46, apex: 1.3, flip: 1, snap: true, r: 1.8, dmg: 0, air: 'NinjaJump_Idle_Loop', rest: 0.2, short: 1.1,
    draw: (cc, hh, j) => { mark(cc, h, j, DRAIN, 1.6); flipTrails(cc, h, sim.time); },
    land: (hh, s2, j) => {
      const k = j.aimAt, P = h.power();
      if (E.fightable(k) && dist(h, k) < 2.6 + E.radiusOf(k)) { h.hit(sim, k, 15 * P * h.backstab(sim, k), 'gash', 90, 0, { bleed: true, stun: 0.4 }); gore(sim, h, k, 0.8); if (h.fxOk()) { xcut(c, k.x, k.y + 1.2, k.z, h.yaw, 2, DRAIN, ARCANE); crescent(c, h, 2, DRAIN, { up: -0.3, life: 0.14, alpha: 0.75 }); } }
      w.blast(h, h.x, h.z, h.y, 1.8, 5 * P, { kind: 'gash', poise: 30, skip: k, bleed: true });
      if (h.fxOk()) c.burst(FX.RING, DRAIN, h.x, h.y + 0.05, h.z, 0.2, 1.6, 0.3);
      sim.event(EV.LAND, h.x, h.y, h.z, 0.7);
      h.combo = 1;
    } });
};
// Six cuts, a knife in each hand, high and low and across, stepping in on every one and every one left bleeding: and the
// last, a hook from the off hand, opens it.
CAST.flurry = (h, sim, m, { c, P }) => {
  const A = ['Sword_Regular_A', 2.1, 0.55, 0.78], B = ['Sword_Regular_B', 2.1, 0.48, 0.76], K = ['Melee_Hook', 1.9, 0.5, 0.8];
  chain(h, sim, [A, B, K, A, B, ['Melee_Hook', 1.3, 0.5, 0.9]], (i) => {
    const last = i === 5, hit = h.strikeAround(sim, 1.7, 1.0, (last ? 8 : 4.5) * P * h.backstab(sim, m), 0, 2, { bleed: true, poise: last ? 90 : 15 });
    cutArc(h, sim, i, last ? 1.3 : 1);
    if (hit[0]) { if (h.fxOk()) slash(c, hit[0].x, hit[0].y + 0.85 + (i % 3) * 0.25, hit[0].z, h.yaw, i % 2 ? 0.6 : -0.6, last ? 1.6 : 1.1, i % 2 ? ARCANE : DRAIN, 0.12); if (last || i === 2) gore(sim, h, hit[0], last ? 0.8 : 0.4); }
  }, { lunge: 2.2 });
};
// Smoke thrown down at his own feet, thick enough to lose him in; and then he's behind it, and the knife goes in to the
// hilt. The smoke hangs where he stood.
CAST.vanish = (h, sim, m, { w, c, P }) => {
  const smoke = (x, y, z) => { if (!h.fxOk()) return; for (let i = 0; i < 6; i++) { const a = i * 1.05; c.burst(FX.PUFF, VOID, x + Math.sin(a) * 0.3, y + 0.4 + (i % 3) * 0.4, z + Math.cos(a) * 0.3, 0.4, 1.0, 0.5, { alpha: 0.6 }); } c.burst(FX.RING, ARCANE, x, y + 0.05, z, 0.3, 1.4, 0.3); };
  smoke(h.x, h.y, h.z);
  sim.event(EV.BLINK, h.x, h.y + 1, h.z);
  w.zones.push({ kind: 'smoke', owner: h, x: h.x, z: h.z, y: h.y, t: 0, life: 1.3, r: 1.3, seed: rand(0, TAU) });
  h.vanishT = 0.7; h.hidden = true;
  w.later(0.7, () => {
    h.hidden = false;
    if (h.dead || !E.fightable(m)) return;
    [h.x, h.z] = h.clearSpot(sim, ...behind(m, 0.9));
    h.lastX = h.x; h.lastZ = h.z; h.y = sim.world.height(h.x, h.z);
    h.yaw = h.faceYaw = dirTo(h, m);
    smoke(h.x, h.y, h.z);
    sim.event(EV.BLINK, h.x, h.y + 1, h.z);
    h.startSwing('Sword_Regular_C', 1.5, [0.33], () => {
      if (!E.fightable(m)) return;
      h.hit(sim, m, 26 * P * h.backstab(sim, m), 'puncture', 100, 0, { bleed: true });
      gore(sim, h, m, 0.9, 3);
      if (h.fxOk()) xcut(c, m.x, m.y + 1.2, m.z, h.yaw, 2.4, DRAIN, ARCANE, 6);
    }, { end: 0.6 });
  });
};
// Round on his heel through half a turn, a knife off his hand at every point of it: a fan of them across everything before him.
CAST.fan_of_knives = (h, sim, m, { c, P, rk }) => {
  const n = 10 + 2 * rk, y0 = h.yaw, a0 = dirTo(h, m) - 1.45;
  let thrown = 0;
  h.spreadT = 0.5;
  h.startSwing('Sword_Regular_B', 1.1, [0.99], () => {}, { end: 0.9, tick: (dt, f) => {
    const u = clamp((f - 0.1) / 0.6, 0, 1), want = Math.floor(u * n);
    h.yaw = h.faceYaw = wrapAngle(a0 + u * 2.9);
    while (thrown < want) { knife(h, sim, a0 + thrown * 2.9 / (n - 1), 5 * P, thrown, 18); thrown++; }
  }, cut: () => { h.yaw = h.faceYaw = y0; }, after: () => { if (E.fightable(m)) h.yaw = h.faceYaw = dirTo(h, m); } });
  if (h.fxOk()) c.burst(FX.RING, ARCANE, h.x, h.y + 0.05, h.z, 0.3, 3, 0.5);
  sim.event(EV.WHOOSH, h.x, h.y + 1.2, h.z);
};
// A stab to fix it, and then it's opened from hip to shoulder: it runs, and goes on running, and throws its blood about
// for as long as it does.
CAST.rupture = (h, sim, m, { w, c, P, rk }) => {
  chain(h, sim, [['Sword_Regular_A', 1.8, 0.55, 0.75], ['L_Slash', 1.7, 0.65, 0.88, 0.3]], (i) => {
    if (!E.fightable(m) || dist(h, m) > 2.6 + E.radiusOf(m)) return;
    if (i === 0) { h.hit(sim, m, 5 * P * h.backstab(sim, m), 'puncture', 55, 0, {}); cutArc(h, sim, 1); return; }
    const dmg = 13 * P * h.backstab(sim, m);
    h.hit(sim, m, dmg, 'gash', 90, 0, {});
    w.bleed(h, m, dmg * (0.5 + 0.06 * rk));
    gore(sim, h, m, 1, 3);
    if (h.fxOk()) { crescent(c, h, 1.9, DRAIN, { up: 0.8, life: 0.16 }); slash(c, m.x, m.y + 1.05, m.z, h.yaw, 0.6, 1.4, DRAIN, 0.2); }
    let next = 0.35;
    zone(w, h, 3, (cc, q) => { if (E.fightable(m)) cc.fx(FX.DISC, DRAIN, m.x, m.y + 0.04, m.z, 0.5 + q.t * 0.35, 0, 1, 0, 0, 0.5 * Math.min(1, (3 - q.t) * 2)); },
      (q) => { if (q.t < next || !E.fightable(m)) return; next += 0.45; const a = rand(0, TAU); blood(sim, m, Math.sin(a), Math.cos(a), 0.55); });
  }, { lunge: 1.8 });
};
// A cartwheel, low, through them and out the far side, both knives out at arm's length: everything he passes is cut three times.
CAST.whirling_blades = (h, sim, m, { w, c, P }) => {
  let cuts = 0;
  const to = spotAt(h, sim, h.x, h.z, dirTo(h, m), Math.min(6, dist(h, m) + E.radiusOf(m) + 1.6)) || [h.x, h.z];
  h.spreadT = 0.75;
  h.leap(sim, m, { T: 0.55, apex: 0.35, roll: 1, r: 0, dmg: 0, air: 'NinjaJump_Idle_Loop', rest: 0.16, crouch: 0.06,
    draw: (cc) => { flipTrails(cc, h, sim.time); cc.fx(FX.GLYPH, DRAIN, h.x, h.y + 0.9, h.z, 1.5, 0, 1, 0, sim.time * 20, 0.6, 0, 0, 0, 0, GLYPHS.CRESCENT); cc.fx(FX.GLYPH, ARCANE, h.x, h.y + 1.0, h.z, 1.4, 0, 1, 0, sim.time * 20 + Math.PI, 0.6, 0, 0, 0, 0, GLYPHS.CRESCENT); },
    tick: (hh, s2, j) => {
      if (j.u < (cuts + 1) / 4) return;
      cuts++;
      for (const k of w.blast(h, h.x, h.z, h.y - h.air, 2.2, 6 * P, { kind: 'gash', poise: 30, bleed: true, quiet: cuts > 1 })) { if (cuts === 2) gore(sim, h, k, 0.5); if (h.fxOk()) slash(c, k.x, k.y + 1, k.z, j.head, cuts % 2 ? 0.5 : -0.5, 1.4, cuts % 2 ? DRAIN : ARCANE, 0.12); }
      sim.event(EV.WHOOSH, h.x, h.y + 1, h.z);
    },
    land: () => { if (h.fxOk()) c.burst(FX.RING, DRAIN, h.x, h.y + 0.05, h.z, 0.3, 2, 0.35); sim.event(EV.LAND, h.x, h.y, h.z, 0.5); if (E.fightable(m)) h.yaw = h.faceYaw = dirTo(h, m); } }, { to });
};
// A flask of it lobbed in among them: it breaks in smoke where it lands, what's in it can't see to strike, and he's away.
CAST.smoke_bomb = (h, sim, m, { w, c }) => {
  const tx = m.x, tz = m.z, ty = sim.world.height(tx, tz);
  throwIt(h, 1.6, () => {
    const hp = h.handPos('r'), T = 0.32;
    shot(w, h, { x: hp[0], y: hp[1], z: hp[2], vx: (tx - hp[0]) / T, vy: (ty + 0.2 - hp[1]) / T + 4 * T, vz: (tz - hp[2]) / T, grav: 8, lob: true, dmg: 0, life: T + 0.3, elem: VOID,
      draw: (cc, s) => { const v = Math.hypot(s.vx, s.vy, s.vz) || 1; cc.fx(FX.FLASK, VOID, s.x, s.y, s.z, 0.1, Math.sin(s.t * 13), Math.cos(s.t * 13), 0.2, 0.36, 1, 3, 3, 0, 1); cc.fx(FX.TRAIL, ARCANE, s.x, s.y, s.z, 0.05, -s.vx / v, -s.vy / v, -s.vz / v, 0.8, 0.6); },
      onEnd: (s) => {
        const y = sim.world.height(s.x, s.z);
        w.zones.push({ kind: 'smoke', owner: h, x: s.x, z: s.z, y, t: 0, life: 4.5, r: 3.6, seed: rand(0, TAU) });
        for (const k of foesIn(w, s.x, s.z, 3.6)) { daze(sim, w, k, 1.4); slow(sim, k, 3); }
        if (h.fxOk()) {
          for (let i = 0; i < 8; i++) { const a = i * 0.785; c.burst(FX.PUFF, VOID, s.x + Math.sin(a) * 0.8, y + 0.5 + (i % 3) * 0.4, s.z + Math.cos(a) * 0.8, 1.3, 2.4, 0.9, { alpha: 0.85 }); }
          c.burst(FX.RING, ARCANE, s.x, y + 0.05, s.z, 0.4, 3.6, 0.45);
          c.burst(FX.FLARE, ARCANE, s.x, y + 0.4, s.z, 0.4, 1.2, 0.15);
          hfx(sim, HFX.SPARKS, s.x, y + 0.3, s.z, 10);
        }
        sim.event(EV.BLINK, s.x, y + 0.5, s.z);
      } });
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
    h.iframesT = 0.7; h.tumbleCd = 0; h.combo = 9;
  });
};
// From one to the next to the next, out of the smoke behind each with a cut, too fast to follow; and back where he began.
CAST.shadow_dance = (h, sim, m, { w, c, P, rk }) => {
  const marks = [m, ...foesIn(w, m.x, m.z, 8).filter((k) => k !== m)].slice(0, 3 + Math.floor(rk / 2)), home = [h.x, h.z];
  if (marks.length < 3) marks.push(marks[0]);
  h.iframesT = marks.length * 0.24 + 0.3; h.dodgeT = marks.length * 0.24 + 0.1;
  marks.forEach((k, i) => w.later(i * 0.24, () => {
    if (h.dead || !E.fightable(k)) return;
    const from = [h.x, h.y + 1, h.z], e = i % 2 ? ARCANE : DRAIN;
    blink(h, sim, ...behind(k, 0.9), VOID);
    h.yaw = h.faceYaw = dirTo(h, k);
    h.play(i % 2 ? 'Punch_Cross' : 'Punch_Jab', 2.2, 'full', 0.03);
    h.hit(sim, k, 11 * P * 1.8, 'gash', i === marks.length - 1 ? 95 : 50, 0, { bleed: true });
    gore(sim, h, k, 0.6);
    if (h.fxOk()) {
      const dx = h.x - from[0], dz = h.z - from[2], L = Math.hypot(dx, dz) || 1;
      c.burst(FX.BEAM, e, from[0], from[1], from[2], 0.3, 0.03, 0.25, { ax: dx / L, ay: 0, az: dz / L, len: L, alpha: 0.6, extra: 0.05 });
      crescent(c, h, 1.6, i === marks.length - 1 ? DRAIN : ARCANE, { up: [0.7, -0.4, 0.2, 1.1, -0.2][i % 5], life: 0.14, alpha: 0.8 });
      xcut(c, k.x, k.y + 1.15, k.z, h.yaw, 1.9, e, i % 2 ? DRAIN : ARCANE);
    }
  }));
  w.later(marks.length * 0.24 + 0.05, () => { if (h.dead) return; blink(h, sim, home[0], home[1], VOID); if (E.fightable(m)) h.yaw = h.faceYaw = dirTo(h, m); h.combo = 0; });
};
// As high as an eave, twice over himself, and down on it point first.
CAST.death_from_above = (h, sim, m, { w, c }) => {
  h.leap(sim, m, { T: 0.72, apex: 2.6, flip: 2, snap: true, r: 2.4, dmg: 0, air: 'NinjaJump_Idle_Loop', rest: 0.3, short: 0.9, landClip: 'Jump_Land', landRate: 1.8,
    draw: (cc, hh, j) => { mark(cc, h, j, DRAIN, 2.4); flipTrails(cc, h, sim.time, 1.2); cc.fx(FX.TRAIL, DRAIN, h.x, h.y + 1, h.z, 0.24, 0, j.u < 0.6 ? -1 : 1, 0, 2, 0.6); },
    land: (hh, s2, j) => {
      const k = j.aimAt, P = h.power();
      if (E.fightable(k) && dist(h, k) < 2.8 + E.radiusOf(k)) { h.hit(sim, k, 30 * P * h.backstab(sim, k), 'puncture', 100, 0, { bleed: true, stun: 1 }); gore(sim, h, k, 1, 6); if (h.fxOk()) xcut(c, k.x, k.y + 1.2, k.z, h.yaw, 2.6, DRAIN, ARCANE, 8); }
      w.blast(h, h.x, h.z, h.y, 2.4, 10 * P, { kind: 'bash', poise: 60, skip: k, shove: 5 });
      if (h.fxOk()) { boom(c, DRAIN, h.x, h.y + 0.3, h.z, 2, 0); c.burst(FX.RING, DRAIN, h.x, h.y + 0.05, h.z, 0.3, 2.6, 0.45); c.burst(FX.RING, ARCANE, h.x, h.y + 0.05, h.z, 0.2, 1.6, 0.5); hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.7); }
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
    if (h.fxOk()) { c.burst(FX.DISC, DRAIN, m.x, m.y + 0.04, m.z, 0.6, 2.2, 2.5, { alpha: 0.7 }); xcut(c, m.x, m.y + 1.1, m.z, h.yaw, 2, DRAIN, ARCANE); crescent(c, h, 2.1, DRAIN, { up: 0.4, life: 0.16 }); }
  }, { lunge: 2.2 });
};

// ---- ninja: stars of every kind, both blades, and his feet -------------------------------------------------------------

// Both blades: a cut from one hand, a cut from the other, and then the two together, crossing through it.
CAST.twin_fangs = (h, sim, m, { c, P }) => {
  chain(h, sim, [['Sword_Regular_A', 1.9, 0.55, 0.78], ['Sword_Regular_B', 1.9, 0.48, 0.76], ['Sword_Regular_A', 1.3, 0.55, 0.9]], (i) => {
    const last = i === 2, hit = h.strikeAround(sim, 1.8, 1.0, (last ? 12 : 6) * P * h.backstab(sim, m), last ? 4 : 0, 2, { poise: last ? 90 : 15 });
    if (!last) { cutArc(h, sim, i, 1.1); return; }
    if (!h.fxOk()) return;
    const f = hit[0] ? [hit[0].x, hit[0].y + 1.15, hit[0].z] : h.ahead(1.1, 1.15);
    crescent(c, h, 2, ARCANE, { up: 0.6, life: 0.16, alpha: 0.9 }); crescent(c, h, 2, LIGHT, { up: -0.6, life: 0.16, alpha: 0.7 });
    xcut(c, f[0], f[1], f[2], h.yaw, 2, ARCANE, LIGHT);
    c.burst(FX.GLYPH, ARCANE, f[0], f[1], f[2], 0.15, 0.5, 0.14, { ay: 0, extra: GLYPHS.STAR4 });
  }, { lunge: 1.6 });
};
// A star made in the palm and thrown: the arm back behind his head and over, the other hand in at his chest, and it
// leaves the hand as the hand comes over. Whichever kind.
const starCast = (kind, n, big, sp) => (h, sim, m) => {
  const e = { fire: FIRE, frost: FROST, storm: STORM, spirit: SPIRIT }[kind] ?? ARCANE;
  const stop = inHand(h, 'r', 0.2, (c, p, k) => c.fx(FX.ORB, e, p[0], p[1], p[2], 0.04 + 0.07 * k, 0, 1, 0, 0, 1));
  h.yaw = h.faceYaw = dirTo(h, m);
  h.hold = Math.max(h.hold, 0.45); h.holdFace = h.yaw; h.shotCd = Math.max(h.shotCd, 0.7);
  h.toss('r', 0.42, () => { stop(); if (E.fightable(m)) for (let i = 0; i < n; i++) throwStar(h, sim, m, kind, 0, (i - (n - 1) / 2) * sp, big); });
  sim.heroWorld.later(0.3, stop);
};
CAST.throwing_stars = starCast('steel', 3, 1.1, 0.12);
CAST.fire_star = starCast('fire', 1, 1.5, 0);
CAST.frost_star = starCast('frost', 3, 1.15, 0.13);
CAST.storm_star = starCast('storm', 1, 1.4, 0);
CAST.spirit_star = starCast('spirit', 2, 1.3, 1);




// Round and round his foe at a run, a star off one hand and then the other every stride: every kind he has, one after another.
CAST.star_storm = (h, sim, m, { rk }) => {
  h.combo = 0; h.orbitCd = sim.time + 9;
  h.skirm = { mode: 'orbit', t: 2.6 + 0.15 * rk, a: 0, dir: h.r() < 0.5 ? 1 : -1, fire: 0.1, every: 0.24, r: 5.5, n: 0, rapid: true };
};
// Round on one foot, the other out level at the height of a hip: everything in reach goes back.
CAST.spin_kick = (h, sim, m, { w, c, P }) => {
  const y0 = h.yaw;
  let struck = false;
  h.startSwing('LP_front_kick_02', 1.5, [0.99], () => {}, { from: 0.2, end: 0.78, tick: (dt, f) => {
    const u = clamp((f - 0.3) / 0.36, 0, 1);
    h.yaw = h.faceYaw = wrapAngle(y0 + u * u * (3 - 2 * u) * TAU);
    if (!struck && u > 0.4) {
      struck = true;
      w.blast(h, h.x, h.z, h.y, 2.3, 9 * P, { kind: 'bash', poise: 60, shove: 7 });
      if (h.fxOk()) { crescent(c, h, 1.5, ARCANE, { y: 0.95, life: 0.16 }); crescent(c, h, 1.5, ARCANE, { y: 0.95, turn: Math.PI, life: 0.16 }); c.burst(FX.RING, ARCANE, h.x, h.y + 0.05, h.z, 0.5, 2.3, 0.25); }
      sim.event(EV.WHOOSH, h.x, h.y + 1, h.z);
    }
  }, cut: () => { h.yaw = h.faceYaw = y0; } });
};
// Wound back a quarter turn; then both blades out at arm's length and round, twice, hips low and leaning into it, going
// through them as he turns.
CAST.whirlwind = (h, sim, m, { w, c, P, rk }) => {
  const y0 = h.yaw, turns = 2 + (rk > 3 ? 1 : 0), T = 0.34 * turns;
  let cuts = 0, t = 0;
  h.spreadT = T + 0.25;
  h.startSwing('Sword_Block', 1.5, [0.99], () => {}, { hold: [0.3, T + 0.1], end: 0.5, tick: (dt) => {
    t += dt;
    const u = clamp((t - 0.13) / T, 0, 1);
    h.yaw = h.faceYaw = wrapAngle(y0 - 0.6 * Math.min(1, t / 0.13) + u * (turns * TAU + 0.6));
    h.bodyRoll = 0.24 * Math.sin(u * Math.PI);
    if (u <= 0) return;
    if (E.fightable(m) && dist(h, m) > 1.2 + E.radiusOf(m)) { const a = dirTo(h, m); h.vx = Math.sin(a) * 3.2; h.vz = Math.cos(a) * 3.2; }
    if (u * turns * 4 > cuts) {
      cuts++;
      const reach = 1.2 + 0.5 * Math.min(1, u * 2);
      w.blast(h, h.x, h.z, h.y, reach + 0.2, 4 * P, { kind: 'gash', poise: 20, quiet: cuts % 2 === 0 });
      if (h.fxOk()) crescent(c, h, reach, ARCANE, { y: cuts % 2 ? 1.15 : 0.95, life: 0.14, alpha: cuts % 2 ? 0.65 : 0.35 });
      if (cuts % 2) sim.event(EV.WHOOSH, h.x, h.y + 1, h.z);
    }
    if (u >= 1 && cuts < 99) { cuts = 99; if (h.fxOk()) c.burst(FX.RING, ARCANE, h.x, h.y + 0.05, h.z, 0.6, 2.8, 0.3); }
  }, cut: () => { h.yaw = h.faceYaw = y0; h.bodyRoll = 0; } });
  h.iframesT = 0.5;
};
// Down on his haunches, and up with both blades through it, turning as he rises with his own violet wound round him, the
// foe lifted off its feet with him; and down on it again.
CAST.rising_dragon = (h, sim, m, { w, c, P }) => {
  const near = E.fightable(m) && dist(h, m) < 2.6 + E.radiusOf(m);
  h.spreadT = 0.5;
  h.leap(sim, m, { T: 0.6, apex: 1.6, spin: 1, snap: true, r: 2, dmg: 0, air: 'NinjaJump_Idle_Loop', crouch: 0.14, rest: 0.22,
    tick: (hh, s2, j) => {
      if (j.cut || j.u < 0.05) return;
      j.cut = true;
      if (!near || !E.fightable(m)) return;
      h.hit(sim, m, 12 * P, 'gash', 90, 0, { shove: 1.2, up: 7 }); gore(sim, h, m, 0.6);
      if (h.fxOk()) { crescent(c, h, 1.9, ARCANE, { up: 1.2, life: 0.18, alpha: 0.9 }); slash(c, m.x, m.y + 1.1, m.z, h.yaw + Math.PI / 2, 1.3, 2, ARCANE, 0.18, 6); }
    },
    draw: (cc, hh, j) => {
      // (Two threads of it wound up round him as he turns.)
      for (const k of [0, Math.PI]) { const a = j.u * 16 + k; cc.fx(FX.TRAIL, ARCANE, h.x + Math.sin(a) * 0.55, h.y + 0.5 + Math.sin(a * 0.5) * 0.3, h.z + Math.cos(a) * 0.55, k ? 0.04 : 0.07, -Math.cos(a) * 0.6, -0.8, Math.sin(a) * 0.6, 1.3, 0.8); }
    },
    land: () => {
      w.blast(h, h.x + Math.sin(h.yaw) * 0.8, h.z + Math.cos(h.yaw) * 0.8, h.y, 2, 12 * h.power(), { kind: 'gash', poise: 70, stun: 0.5 });
      if (h.fxOk()) { crescent(c, h, 2, ARCANE, { up: -0.4, life: 0.16, alpha: 0.9 }); c.burst(FX.RING, ARCANE, h.x + Math.sin(h.yaw) * 0.8, h.y + 0.05, h.z + Math.cos(h.yaw) * 0.8, 0.3, 1.8, 0.3); }
      sim.event(EV.LAND, h.x, h.y, h.z, 0.8);
    } }, { to: E.fightable(m) ? [m.x - Math.sin(dirTo(h, m)) * (E.radiusOf(m) + 0.9), m.z - Math.cos(dirTo(h, m)) * (E.radiusOf(m) + 0.9)] : [h.x, h.z] });
};
// A leap that ends in a kick: tucked and turned over once on the way, the leg out for the last of it, his own violet along
// the way he came.
const flyKick = (h, o = {}) => {
  let out = false;
  return { T: 0.44, apex: 1.1, snap: true, flip: 1, r: 1.6, dmg: 0, air: 'NinjaJump_Idle_Loop', rest: 0.1, crouch: 0.07, short: 0.8, ...o,
    tick: (hh, sim, j) => { if (!out && j.u > 0.56) { out = true; h.play('LP_front_kick_02', 1.6, 'full', 0.06); h.actT = 0.42 * h.bank.clips.LP_front_kick_02.dur; } },
    draw: (c, hh, j) => { const up = j.u < 0.5 ? -0.8 : 0.8, n = Math.hypot(1, up); c.fx(FX.TRAIL, ARCANE, h.x, h.y + 0.6, h.z, 0.08, -Math.sin(j.head) / n, up / n, -Math.cos(j.head) / n, 0.8, 0.5); } };
};
// Where a kick lands: on its chest, and it goes back.
function kicked(h, sim, k, dmg, big = 1) {
  const c = sim.casting;
  if (E.fightable(k)) {
    h.hit(sim, k, dmg, 'bash', big > 1 ? 90 : 70, 5, { shove: 6 * big, stun: 0.4 });
    if (h.fxOk()) { c.burst(FX.GLYPH, ARCANE, k.x, k.y + 1.2, k.z, 0.2, 0.6 * big, 0.12, { ay: 0, extra: GLYPHS.STAR4 }); slash(c, k.x, k.y + 1.2, k.z, h.yaw + Math.PI / 2, 0, 1.6 * big, ARCANE, 0.14); }
  }
  if (h.fxOk()) { const at = E.fightable(k) ? k : h; c.burst(FX.RING, ARCANE, at.x, at.y + 0.05, at.z, 0.3, 1.2 * big, 0.25); }
  sim.event(EV.LAND, h.x, h.y, h.z, 0.6);
}
// A flying kick: over himself once on the way and into its chest, heel first.
CAST.leaping_kick = (h, sim, m, { w, P }) => {
  h.leap(sim, m, { ...flyKick(h, { T: 0.5, apex: 1.3 }), land: () => { kicked(h, sim, m, 12 * P, 1.2); w.blast(h, h.x, h.z, h.y, 2, 5 * P, { kind: 'bash', poise: 30, skip: m, quiet: true }); } });
};
// A flying kick, and off that one's chest to the next, and the next: each harder than the last.
CAST.kick_chain = (h, sim, m, { w, P, rk }) => {
  const seen = new Set(), n = 1 + Math.ceil(rk / 2);
  const go = (k, left) => {
    if (h.dead || !E.fightable(k)) return;
    seen.add(k);
    h.leap(sim, k, { ...flyKick(h), land: () => kicked(h, sim, k, 12 * P, left === 0 ? 1.4 : 1) },
      { after: () => { const nx = left > 0 && nearest(w, h.x, h.z, 7, seen); if (nx) go(nx, left - 1); } });
  };
  go(m, n);
};
// Struck, and where he stood there's smoke and a log falling out of it: he's five strides off, with three stars already in the air.
CAST.substitution = (h, sim, m, { w, c }) => {
  const away = Math.atan2(h.x - m.x, h.z - m.z), x0 = h.x, y0 = h.y, z0 = h.z;
  let to = null;
  for (const da of [1.1, -1.1, 0.6, -0.6, 0]) { to = spotAt(h, sim, h.x, h.z, away + da, 4.5); if (to) break; }
  if (!to) { h.gcd = 0.1; return; }
  w.zones.push({ kind: 'smoke', owner: h, x: x0, z: z0, y: y0, t: 0, life: 1.2, r: 1.3, seed: rand(0, TAU) });
  zone(w, h, 0.7, (cc, q) => { const fall = Math.min(1.05, q.t * q.t * 9), a = q.t * 7; cc.fx(FX.BOX, STONE, x0, y0 + 1.2 - fall, z0, 0.15, Math.sin(a) * 0.5, Math.cos(a), 0.3, 0.9, 0.02, 0, 0, MAT.WOOD, 0, 0.15); });
  blink(h, sim, to[0], to[1], VOID);
  h.yaw = h.faceYaw = dirTo(h, m);
  h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.12);
  h.iframesT = 0.6;
  if (m.heroFoe === h) m.heroFoeT = sim.time - 6;
  h.hold = Math.max(h.hold, 0.5); h.holdFace = h.yaw; h.shotCd = Math.max(h.shotCd, 0.7);
  h.toss('r', 0.4, () => { if (E.fightable(m)) for (let i = -1; i <= 1; i++) throwStar(h, sim, m, 'steel', 0, i * 0.12, 1.15); });
};
// A star as wide as his arms, thrown to turn through everything out and back: steel, four blades, his violet on its edges.
CAST.giant_shuriken = (h, sim, m, { w, c, P, rk }) => {
  throwIt(h, 1.0, () => {
    if (!E.fightable(m)) return;
    const hp = h.handPos('r'), v = 13, a = dirTo(h, m), size = 1 + 0.08 * rk;
    shot(w, h, { x: hp[0], y: h.y + 1.05, z: hp[2], vx: Math.sin(a) * v, vy: 0, vz: Math.cos(a) * v, v, dmg: 16 * P, o: { bleed: true }, pierce: true, ret: true, hang: true, backV: 1, poise: 60, life: 1.9, r: 1.0, size, elem: ARCANE, skim: true,
      onHit: (k, s) => { blood(sim, k, s.vx / v, s.vz / v, 0.4); if (h.fxOk()) { hfx(sim, HFX.SPARKS, k.x, k.y + 1.1, k.z, 16); slash(c, k.x, k.y + 1.1, k.z, Math.atan2(s.vx, s.vz) + Math.PI / 2, 0, 2, ARCANE, 0.14); } },
      draw: (cc, s) => {
        const sp = s.t * 15;
        star3(cc, s.x, s.y, s.z, sp, 0.66 * s.size, ARCANE, MAT.STEEL, 2, 0.5);
        star3(cc, s.x, s.y + 0.02, s.z, sp + 0.785, 0.3 * s.size, ARCANE, MAT.STEEL, 2, 0.4);
        cc.fx(FX.DISC, ARCANE, s.x, s.y - 0.02, s.z, 1.25 * s.size, 0, 1, 0, 0, 0.07, 4, 4);
        // (The tips' own trails, bent round the way it turns.)
        for (let i = 0; i < 4; i++) { const q = sp + i * Math.PI / 2, r = 1.25 * s.size; cc.fx(FX.TRAIL, ARCANE, s.x + Math.sin(q) * r, s.y, s.z + Math.cos(q) * r, 0.06, -Math.cos(q), 0, Math.sin(q), 1.1, 0.6); }
      },
      caught: () => { if (!h.swing && !h.jump) h.play('Sword_Block', 2.2, 'upper', 0.06); } });
    sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  }, { mask: 'full' });
};
// Six cuts, a blade in each hand, one side and the other and stepping in on each; then the kick, and seven strokes of gold round it.
CAST.ninja_flurry = (h, sim, m, { c, P }) => {
  const A = ['Sword_Regular_A', 2.2, 0.55, 0.78], B = ['Sword_Regular_B', 2.2, 0.48, 0.76];
  chain(h, sim, [A, B, A, B, A, B], (i) => {
    const hit = h.strikeAround(sim, 1.6, 1.0, 5 * P, 0, 2, { poise: 15 });
    cutArc(h, sim, i);
    if (hit[0] && h.fxOk()) slash(c, hit[0].x, hit[0].y + 0.9 + (i % 3) * 0.2, hit[0].z, h.yaw, i % 2 ? 0.6 : -0.6, 1.1, ARCANE, 0.11);
    if (hit[0] && i % 2) blood(sim, hit[0], Math.sin(h.yaw), Math.cos(h.yaw), 0.3);
  }, { lunge: 1.8, done: () => h.sevenSided(sim, m) });
};
// Down on his haunches, gone in a column of dark, a thread of it along the ground to where he comes out behind it: with a
// cut across its back that he means.
CAST.shadow_step = (h, sim, m, { w, c, P }) => {
  const x0 = h.x, y0 = h.y, z0 = h.z;
  h.play('NinjaJump_Start', 2.5, 'full', 0.05); h.hold = 0.2; h.dodgeT = 0.18; h.shotCd = Math.max(h.shotCd, 0.7);
  if (h.fxOk()) c.burst(FX.VORTEX, ARCANE, h.x, h.y + 1, h.z, 1.0, 0.3, 0.35);
  w.later(0.15, () => {
    if (h.dead || !E.fightable(m)) return;
    const [bx, bz] = behind(m, 1);
    if (h.fxOk()) {
      for (let i = 0; i < 4; i++) c.burst(FX.PUFF, VOID, x0, y0 + 0.4 + i * 0.45, z0, 0.5, 1.1, 0.5, { alpha: 0.8 });
      const dx = bx - x0, dz = bz - z0, L = Math.hypot(dx, dz) || 1;
      c.burst(FX.BEAM, VOID, x0, y0 + 0.06, z0, 0.4, 0.05, 0.4, { ax: dx / L, ay: 0, az: dz / L, len: L, alpha: 0.45, extra: 0.25 });
    }
    blink(h, sim, bx, bz, VOID);
    h.yaw = h.faceYaw = dirTo(h, m);
    h.startSwing('Sword_Regular_B', 1.3, [0.3], () => {
      if (!E.fightable(m)) return;
      h.hit(sim, m, 16 * P * h.backstab(sim, m), 'gash', 90, 4, {});
      w.blast(h, h.x, h.z, h.y, 2.2, 6 * P, { kind: 'bash', poise: 30, skip: m, quiet: true });
      blood(sim, m, Math.sin(h.yaw), Math.cos(h.yaw), 0.6);
      if (h.fxOk()) { crescent(c, h, 2.2, ARCANE, { up: 0.5, life: 0.16, alpha: 1 }); slash(c, m.x, m.y + 1.2, m.z, h.yaw, 0.75, 2.3, ARCANE, 0.16, 6); }
    }, { end: 0.85, hold: [0.6, 0.15] });
  });
};

// ---- dragoon: the dives, each its own, and the spear he's holding ------------------------------------------------------

// The spear's own light while it's aimed: on its head and the top of its haft, on the spear in his fist.
function spearGlow(c, h, elem, k = 1) {
  if (!h.aim) return;
  const p = h.handPos('r'), a = h.aim, reach = h.mainP?.reach ?? 1.4;
  c.fx(FX.BEAM, elem, p[0] + a[0] * reach * 0.45, p[1] + a[1] * reach * 0.45, p[2] + a[2] * reach * 0.45, 0.05 * k, a[0], a[1], a[2], reach * 0.6, 0.9, 6, 4, 0, 0, 0.015);
  c.fx(FX.FLARE, elem, p[0] + a[0] * (reach + 0.05), p[1] + a[1] * (reach + 0.05), p[2] + a[2] * (reach + 0.05), 0.2 * k, 0, 1, 0, 0, 1);
}
// Where a leap means to land, on the ground from the moment he's up: a ring that closes and brightens as he comes down.
function mark(c, h, j, elem, r) {
  const y = h.simRef.world.height(j.x1, j.z1);
  c.fx(FX.RING, elem, j.x1, y + 0.06, j.z1, 0.6 + Math.min(r, 2.5) * 0.45 * (1 - j.u), 0, 1, 0, 0, 0.3 + 0.5 * j.u);
}
// The point of what's in his right hand, where it is now, and the way it's pointed.
const weaponTip = (h) => { const m = h.propMatrices, r = h.mainP?.reach ?? 1.4; return m[15] ? [m[12] + m[4] * r, m[13] + m[5] * r, m[14] + m[6] * r, [m[4], m[5], m[6]]] : [...h.handPos('r'), [Math.sin(h.yaw), 0, Math.cos(h.yaw)]]; };
const spearTip = weaponTip;
// (Held to the sky: what's in the fist stood up along the raised arm, not lying across it.)
const SKY = () => [0, 1, 0.02];
// (A dragoon's leap: dark on the way up, so the dive is the loud part. The spear lit, and a tail of it off the point, on the way down.)
export const diveDraw = (elem, r = 2) => (c, h, j) => {
  mark(c, h, j, elem, r);
  if (j.u < 0.42) return;
  spearGlow(c, h, elem);
  const t = spearTip(h), a = t[3];
  c.fx(FX.TRAIL, elem, t[0], t[1], t[2], 0.1, -a[0], -a[1], -a[2], 1.6, 0.6);
};
const DIVES = {
  // Fire wound round the spear in two ribbons as he comes down, and fire left where he lands.
  dragon_dive: { T: 0.72, apex: 2.4, snap: true, r: 2.4, dmg: 18, elem: FIRE, lance: true, air: 'NinjaJump_Idle_Loop',
    draw: (c, h, j) => {
      mark(c, h, j, FIRE, 2.4);
      if (j.u < 0.42) return;
      spearGlow(c, h, FIRE, 1.3);
      const t = spearTip(h), a = t[3], s = Math.sin(j.head), co = Math.cos(j.head);
      for (const k of [0, Math.PI]) { const q = j.u * 18 + k; c.fx(FX.TRAIL, k ? LIGHT : FIRE, t[0] + co * Math.cos(q) * 0.35, t[1] + Math.sin(q) * 0.35, t[2] - s * Math.cos(q) * 0.35, 0.12, -a[0], -a[1], -a[2], 1.8, 0.9); }
    },
    after: (h, sim, x, z) => { firePatch(h, sim, x, z, 1.9, 3, 5 * h.power()); if (h.fxOk()) { sim.casting.burst(FX.FLAME, FIRE, x, h.y, z, 1.2, 2.8, 0.5, { len: 2 }); sim.casting.burst(FX.RING, FIRE, x, h.y + 0.05, z, 0.4, 2.8, 0.4); } } },
  // Higher, steeper and faster: a white-gold point with a comet's tail behind it, and the ground scorched where it lands.
  comet_dive: { T: 0.52, apex: 3, snap: true, r: 3, dmg: 24, elem: LIGHT, lance: true, air: 'NinjaJump_Idle_Loop',
    draw: (c, h, j) => {
      mark(c, h, j, LIGHT, 3);
      if (j.u < 0.42) return;
      spearGlow(c, h, LIGHT, 1.6);
      const t = spearTip(h), a = t[3];
      c.fx(FX.ORB, LIGHT, t[0], t[1], t[2], 0.3, 0, 1, 0, 0, 0.9, 10, 7);
      c.fx(FX.TRAIL, FIRE, t[0], t[1], t[2], 0.4, -a[0], -a[1], -a[2], 5, 0.7); c.fx(FX.TRAIL, LIGHT, t[0], t[1], t[2], 0.16, -a[0], -a[1], -a[2], 4, 1);
    },
    after: (h, sim, x, z) => {
      if (!h.fxOk()) return;
      const c = sim.casting;
      boom(c, LIGHT, x, h.y + 0.4, z, 3, 20); c.burst(FX.DISC, FIRE, x, h.y + 0.04, z, 2.6, 2.8, 1.6, { alpha: 0.6 }); c.burst(FX.RING, LIGHT, x, h.y + 0.05, z, 0.5, 4.2, 0.4);
      for (let i = 0; i < 8; i++) { const q = i * 0.785; c.burst(FX.BEAM, LIGHT, x, h.y + 0.2, z, 0.08, 0.01, 0.3, { ax: Math.sin(q), ay: 0.12, az: Math.cos(q), len: 3, extra: 0.01 }); }
      hfx(sim, HFX.THUD, x, h.y, z, 0.9);
    } },
  // Out of a storm: a bolt down the spear as it goes in, and bolts from it to everything near.
  storm_dive: { T: 0.68, apex: 2.6, snap: true, r: 2.8, dmg: 22, elem: STORM, lance: true, air: 'NinjaJump_Idle_Loop',
    draw: (c, h, j) => {
      mark(c, h, j, STORM, 2.8);
      if (j.u < 0.42) return;
      spearGlow(c, h, STORM, 1.4);
      const t = spearTip(h), a = t[3];
      c.fx(FX.BOLT, STORM, t[0], t[1], t[2], 0.3, -a[0] + rand(-0.3, 0.3), -a[1], -a[2] + rand(-0.3, 0.3), 2.2, 0.9, 6, 4, 0, Math.floor(j.t * 20), 0.8);
    },
    after: (h, sim, x, z) => {
      const w = sim.heroWorld, c = sim.casting, marks = foesIn(w, x, z, 6).slice(0, 3 + rank(h));
      if (h.fxOk()) {
        c.burst(FX.BOLT, STORM, x, h.y + 11, z, 0.9, 0.6, 0.25, { ax: 0, ay: -1, az: 0, len: 11, extra: 0.9, light: 18, lightR: 9 });
        for (let i = 0; i < 6; i++) { const q = i * 1.047 + 0.3; c.burst(FX.BOLT, STORM, x, h.y + 0.25, z, 0.3, 0.2, 0.25, { ax: Math.sin(q), ay: 0.05, az: Math.cos(q), len: 3, extra: 0.5 }); }
        hfx(sim, HFX.THUD, x, h.y, z, 0.7);
      }
      marks.forEach((k, i) => w.later(0.05 + i * 0.07, () => {
        if (h.dead || !E.fightable(k)) return;
        h.hit(sim, k, 8 * h.power(), 'burn', 50, 0, { stun: 0.4 });
        if (h.fxOk()) { const dx = k.x - x, dz = k.z - z, L = Math.hypot(dx, dz) || 1; c.burst(FX.BOLT, STORM, x, h.y + 0.9, z, 0.4, 0.3, 0.3, { ax: dx / L, ay: 0.1, az: dz / L, len: L, extra: 0.4, light: i ? 0 : 10, lightR: 6 }); c.burst(FX.RING, STORM, k.x, k.y + 0.05, k.z, 0.2, 1.2, 0.3); }
      }));
    } },
  // The great one: from far up, wings of fire at his back, a sign burning on the ground where he'll come down, and the
  // ground burning for strides round it when he has.
  dragonfall: { T: 0.95, apex: 3.8, snap: true, r: 3.8, dmg: 44, elem: FIRE, lance: true, air: 'NinjaJump_Idle_Loop', o: { stun: 1.2, shove: 7 },
    draw: (c, h, j) => {
      const y = h.simRef.world.height(j.x1, j.z1), s = Math.sin(h.yaw), co = Math.cos(h.yaw), beat = Math.sin(j.t * 16) * 0.25;
      for (let i = 0; i < 3; i++) c.fx(FX.RING, FIRE, j.x1, y + 0.07, j.z1, 3.8 * (1 - ((j.t * 1.2 + i / 3) % 1) * 0.8), 0, 1, 0, 0, 0.6 * Math.min(1, j.u * 3), i ? 0 : 6 * j.u, 6);
      c.fx(FX.DISC, FIRE, j.x1, y + 0.05, j.z1, 3.8 * j.u, 0, 1, 0, 0, 0.35 * j.u);
      c.fx(FX.GLYPH, FIRE, h.x - s * 0.3, h.y + 1.5, h.z - co * 0.3, 1.5 + beat, 0, 0, 0, 0, 0.8, 10, 7, 0, 0, GLYPHS.WING);
      if (j.u < 0.42) return;
      spearGlow(c, h, FIRE, 1.8);
      const t = spearTip(h), a = t[3];
      c.fx(FX.TRAIL, FIRE, t[0], t[1], t[2], 0.4, -a[0], -a[1], -a[2], 4, 0.8);
    },
    after: (h, sim, x, z) => {
      firePatch(h, sim, x, z, 3, 4, 6 * h.power());
      if (h.fxOk()) { const c = sim.casting; boom(c, FIRE, x, h.y + 0.5, z, 4, 26); c.burst(FX.RING, FIRE, x, h.y + 0.05, z, 0.5, 5, 0.5); c.burst(FX.COLUMN, FIRE, x, h.y, z, 5, 8, 0.6, { len: 2.6 }); for (let i = 0; i < 6; i++) { const a = i * 1.047; c.burst(FX.FLAME, FIRE, x + Math.sin(a) * 2.4, h.y, z + Math.cos(a) * 2.4, 1, 2.6, 0.6, { len: 1.4 }); } hfx(sim, HFX.THUD, x, h.y, z, 1); }
    } },
};
for (const [key, L] of Object.entries(DIVES)) {
  CAST[key] = (h, sim, m) => h.leap(sim, m, { ...L, land: (hh, s2, j, fx, fz) => {
    const w = sim.heroWorld, c = sim.casting;
    if (h.fxOk()) { boom(c, L.elem, h.x, h.y + 0.2, h.z, L.r * 1.2, 12); c.burst(FX.RING, L.elem, h.x, h.y + 0.05, h.z, 0.4, L.r + 0.5, 0.5); }
    sim.event(EV.GROUND, h.x, h.y, h.z);
    w.blast(h, fx, fz, h.y, L.r + 0.1 * rank(h), L.dmg * h.power(), { kind: 'puncture', poise: 80, shove: 5, ...(L.o || {}) });
    L.after?.(h, sim, fx, fz);
  } });
}
// Six thrusts as fast as the arm will go, the spear's light off its point down each: and the last of them twice as far.
CAST.lance_flurry = (h, sim, m, { P }) => chain(h, sim, [STAB, STAB, STAB, STAB, STAB, STAB_LAST], (i) => {
  const last = i === 5;
  h.yaw += last ? 0 : (i % 2 ? 0.09 : -0.09);
  h.thrust(sim, 2.9, (last ? 9 : 5) * P, last ? 4 : 0, last ? LAST_LIGHT : JAB_LIGHT);
}, { lunge: 1.2, aimed: true, stab: true });
// Through it, spear levelled, and out the far side, a line of light left through each he passes: stopped hard there, and turned.
CAST.spearstep = (h, sim, m, { c, yaw }) => {
  const e = tintOf(h);
  dash(h, sim, yaw, Math.min(9, dist(h, m) + E.radiusOf(m) + 2.6), { v: 19, clip: 'Sword_Dash', dmg: 20, aim: true, o: { stun: 0.4 }, skid: e, aside: true,
    onHit: (k) => { if (h.fxOk()) c.burst(FX.FLARE, e, k.x, k.y + 1.1, k.z, 0.25, 0.8, 0.12); if (h.fxOk()) c.burst(FX.BEAM, e, k.x - Math.sin(yaw) * 0.4, k.y + 1.1, k.z - Math.cos(yaw) * 0.4, 0.1, 0.02, 0.22, { ax: Math.sin(yaw), ay: 0, az: Math.cos(yaw), len: 2.4, extra: 0.01, light: 6, lightR: 4 }); },
    draw: (cc) => { spearGlow(cc, h, e, 1.4); const s = Math.sin(h.yaw), co = Math.cos(h.yaw); for (let i = 0; i < 3; i++) cc.fx(FX.TRAIL, e, h.x - co * (i - 1) * 0.3, h.y + 0.7 + i * 0.3, h.z + s * (i - 1) * 0.3, 0.14, -s, 0, -co, 3, 0.7); } });
};
// The spear drawn back, light gathering on its point; then its likeness in light, off the point and through everything on
// its line, the air wound round it as it flies.
CAST.spiral_lance = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  const e = tintOf(h);
  const z0 = zone(w, h, 0.5, (cc, q) => { const t = spearTip(h), k = Math.min(1, q.t / 0.38); cc.fx(FX.ORB, e, t[0], t[1], t[2], 0.06 + 0.16 * k, 0, 1, 0, 0, 1, 6 * k, 4); });
  h.startSwing('Sword_Regular_C', 1.7, [0.33], () => {
    z0.done = true;
    const t = spearTip(h), v = 24, tgt = E.fightable(m) ? m : { x: h.x + Math.sin(yaw) * 6, y: h.y, z: h.z + Math.cos(yaw) * 6 }, vel = toward(t[0], t[1], t[2], tgt, v), len = (h.mainP?.length ?? 2.2);
    shot(w, h, { x: t[0], y: t[1], z: t[2], ...vel, dmg: 16 * P, hk: 'puncture', poise: 60, pierce: true, r: 0.6, life: 0.7, elem: e,
      draw: (cc, s) => {
        const ax = s.vx / v, ay = s.vy / v, az = s.vz / v;
        cc.fx(FX.BEAM, e, s.x - ax * 1.2, s.y - ay * 1.2, s.z - az * 1.2, 0.03, ax, ay, az, 1.5, 1, 0, 0, 0, 0, 0.09);
        cc.fx(FX.FLARE, e, s.x + ax * 0.3, s.y + ay * 0.3, s.z + az * 0.3, 0.22, 0, 1, 0, 0, 1);
        // (Wound round the line it flies: arcs of it, each a little behind and a little further round than the last.)
        for (let i = 0; i < 4; i++) cc.fx(FX.GLYPH, e, s.x - ax * i * 0.5, s.y - ay * i * 0.5, s.z - az * i * 0.5, 0.5 - i * 0.07, ax, ay, az, s.t * 26 + i * 1.6, 0.8 - i * 0.17, 0, 0, 0, i, GLYPHS.CRESCENT);
        cc.fx(FX.TRAIL, e, s.x, s.y, s.z, 0.08, -ax, -ay, -az, 2.4, 0.6);
      }, });
    if (h.fxOk()) c.burst(FX.FLARE, e, t[0], t[1], t[2], 0.2, 0.8, 0.15, { light: 8, lightR: 4 });
    sim.event(EV.WHOOSH, t[0], t[1], t[2]);
  }, { still: true, aimed: true, cut: () => { z0.done = true; } });
};
// The spear carried flat from his right round to his left through everything before him: one arc, as far out as its point.
CAST.sweeping_lance = (h, sim, m, { c, P }) => {
  const e = tintOf(h);
  h.startSwing('Sword_Attack', 1.0, [0.24], () => {
    h.strikeAround(sim, 3.2, 1.75, 12 * P, 0, 8, { kind: 'gash', poise: 90, shove: 6 });
    if (h.fxOk()) crescent(c, h, 2.5, e, { life: 0.18, light: 6 });
  }, { lunge: 1.5, aimed: SWEEP });
};
// The spear's butt struck down, and six spears of steel and light stand up out of the ground round him, leaning out, and
// turn: what comes near is run through.
CAST.lance_barrier = (h, sim, m, { w, c, P, rk }) => {
  const e = tintOf(h);
  h.startSwing('Sword_Block', 1.3, [0.14], () => {
    if (h.fxOk()) { c.burst(FX.RING, e, h.x, h.y + 0.06, h.z, 0.3, 1.6, 0.3); hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.3); }
    orbit(w, h, { n: 6, r: 1.3, speed: 1.6, life: 6, y: 0.05, dmg: (5 + 0.5 * rk) * P, hk: 'puncture', reach: 0.8,
      onHit: (k, x, z) => { if (h.fxOk()) c.burst(FX.FLARE, e, x, h.y + 1.1, z, 0.25, 0.8, 0.15, { light: 5, lightR: 3 }); },
      draw: (cc, x, y, z, a, i, q, k) => { const ox = Math.sin(a) * 0.18, oz = Math.cos(a) * 0.18, n = Math.hypot(ox, 1, oz); pike3(cc, x, y - 1.6 * (1 - k), z, ox / n, 1 / n, oz / n, 1.6, e, 1.1, 1.2); if (i === 0) { cc.fx(FX.RING, e, h.x, h.y + 0.06, h.z, 1.3, 0, 1, 0, 0, 0.4 * k); cc.fx(FX.RING, e, h.x, h.y + 1.0, h.z, 1.45, 0, 1, 0, 0, 0.18 * k); } } });
  }, { still: true, hold: [0.3, 0.25], end: 0.6 });
};
// Spears down out of the sky, on a slant, all over where they stand: each a spear, with a spear's head, a puff of earth
// where it goes in; standing there a moment and then gone.
function spearRain(h, sim, cx, cz, R, n, dur, dmg, elem, r = 0.9, thick = 1.5) {
  const w = sim.heroWorld, c = sim.casting, T = 0.3, drops = [];
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), q = Math.sqrt(Math.random()) * R; drops.push({ x: cx + Math.sin(a) * q, z: cz + Math.cos(a) * q, t0: Math.floor(i / 5) * dur / Math.max(1, Math.ceil(n / 5)) + (i % 5) * 0.03, hit: false, L: rand(1.8, 2.4) }); }
  if (h.fxOk() && R > 1) c.burst(FX.RING, elem, cx, sim.world.height(cx, cz) + 0.05, cz, R, R, dur + 0.4, { alpha: 0.3 });
  const ax = 0.28, ay = -0.94, az = 0.18;
  zone(w, h, dur + T + 0.9, (cc, q) => {
    for (const d of drops) {
      const u = (q.t - d.t0) / T;
      if (u < 0 || u > 2.8) continue;
      const y = sim.world.height(d.x, d.z), k = Math.min(1, u), up = (1 - k * k) * 9, sink = u > 1.6 ? (u - 1.6) * d.L * 1.2 : 0;
      pike3(cc, d.x - ax * (d.L * 0.68 + up), y - ay * (d.L * 0.68 + up) - sink, d.z - az * (d.L * 0.68 + up), ax, ay, az, d.L, elem, 1.2, thick);
      if (u < 1) cc.fx(FX.TRAIL, elem, d.x - ax * up, y - ay * up, d.z - az * up, 0.09 * thick, -ax, -ay, -az, 2.6, 0.7);
    }
  }, (q) => {
    for (const d of drops) {
      if (d.hit || q.t < d.t0 + T) continue;
      d.hit = true;
      const y = sim.world.height(d.x, d.z);
      w.blast(h, d.x, d.z, y, r, dmg, { kind: 'puncture', poise: thick > 2 ? 100 : 30, quiet: thick <= 2, ...(r > 1.2 ? { stun: 0.8 } : {}) });
      if (h.fxOk()) { if (thick > 2) c.burst(FX.RING, elem, d.x, y + 0.05, d.z, 0.1, r + 0.2, 0.25); c.burst(FX.PUFF, STONE, d.x, y + 0.2, d.z, 0.2, 0.7 * thick / 1.5, 0.4, { alpha: 0.4 }); }
    }
  });
}
// The spear held to the sky, a bolt of its light sent up off the point; and then spears come down in sheaves for as long
// as he holds it there.
CAST.spear_rain = (h, sim, m, { c, P, rk }) => {
  const x = m.x, z = m.z, e = tintOf(h), dur = 1.6;
  h.pointAt([Math.sin(h.yaw) * 0.12, 1, Math.cos(h.yaw) * 0.12], dur + 0.9);
  h.hold = Math.max(h.hold, dur + 0.7); h.holdFace = h.yaw; h.shotCd = Math.max(h.shotCd, dur + 0.6);
  sim.heroWorld.later(0.25, () => {
    if (h.dead) return;
    const t = spearTip(h);
    if (h.fxOk()) { c.burst(FX.BEAM, e, t[0], t[1], t[2], 0.14, 0.02, 0.35, { ax: 0, ay: 1, az: 0, len: 12, extra: 0.02, light: 8, lightR: 5 }); c.burst(FX.FLARE, e, t[0], t[1], t[2], 0.2, 0.9, 0.2); }
    sim.event(EV.WHOOSH, h.x, h.y + 2, h.z);
    spearRain(h, sim, x, z, 3.2, 15 + 5 * rk, dur, 6 * P, e);
  });
};
// The spear levelled, and the dragon's own breath off its point: a cone of fire swept across them for as long as he has wind.
CAST.dragon_breath = (h, sim, m, { w, c, P, yaw }) => {
  const T = 1.3, len = 4.4;
  let tick = 0, base = yaw;
  h.yaw = h.faceYaw = yaw;
  h.startSwing('Sword_Block', 1.2, [0.99], () => {}, { still: true, hold: [0.25, T + 0.25], end: 0.6 });
  h.pointAt([Math.sin(yaw), -0.03, Math.cos(yaw)], T + 0.35, { lean: -0.1 });
  sim.event(EV.ROAR, h.x, h.y + 1.6, h.z, 0.5);
  zone(w, h, T + 0.2, (cc, q) => {
    if (q.t < 0.2) return;
    const t = q.t - 0.2, k = Math.min(1, t * 5, (T - t) * 5), p = spearTip(h), s = Math.sin(h.yaw), co = Math.cos(h.yaw);
    // (Yellow at the point, orange and red as it widens: flames one after another down the cone, and smaller ones along its edges.)
    for (let i = 0; i < 8; i++) {
      const f = ((t * 3 + i * 0.125) % 1) * len, wide = 0.25 + f * 0.3, sp = ((i % 3) - 1) * wide * 0.7;
      cc.fx(FX.FLAME, f < 1.2 ? LIGHT : FIRE, p[0] + s * f + co * sp, p[1] - 0.3 - f * 0.1, p[2] + co * f - s * sp, (0.45 + f * 0.2) * k, 0, 1, 0, 0.5 + f * 0.2, 0.75 * k, i === 3 ? 10 * k : 0, 6, 0, i * 0.37);
    }
    cc.fx(FX.BEAM, FIRE, p[0], p[1], p[2], 0.1 * k, s, -0.06, co, 2.6, 0.55 * k, 0, 0, 0, t, 0.7 * k);
    cc.fx(FX.FLARE, FIRE, p[0], p[1], p[2], 0.3 * k, 0, 1, 0, 0, 1);
  }, (q, dt) => {
    if (E.fightable(m)) base += clamp(wrapAngle(dirTo(h, m) - base), -1.5 * dt, 1.5 * dt);
    // (Swept: from one side of them across to the other.)
    const dir = base + 0.45 * Math.sin((q.t / (T + 0.2) - 0.5) * Math.PI);
    h.yaw = h.faceYaw = dir;
    if (h.point) h.point.d = [Math.sin(dir), -0.03, Math.cos(dir)];
    if (q.t < 0.2 || (tick -= dt) > 0) return;
    tick += 0.15;
    for (const k of h.strikeAround(sim, len + 0.4, 0.45, 3.5 * P, 0, 9, { kind: 'burn', poise: 8, quiet: true })) { sim.casting.shove(k, Math.sin(dir) * 2.2, Math.cos(dir) * 2.2); if (h.fxOk()) c.burst(FX.FLAME, FIRE, k.x, k.y, k.z, 0.5, 0.9, 0.4, { len: 0.9 }); }
  });
};
// The spear held to the sky and the sky answers: a sheaf of golden spears on them, and another, and then one as tall as a
// tree in the middle of them all. The wind of it is at his back after.
CAST.heavens_rain = (h, sim, m, { w, c, P, rk }) => {
  const cx = m.x, cz = m.z, cy = sim.world.height(cx, cz);
  h.pointAt([Math.sin(h.yaw) * 0.1, 1, Math.cos(h.yaw) * 0.1], 2.2);
  h.hold = Math.max(h.hold, 2); h.holdFace = h.yaw; h.shotCd = Math.max(h.shotCd, 2);
  gather(c, h, LIGHT, 3, 0.3);
  if (h.fxOk()) { c.burst(FX.COLUMN, LIGHT, h.x, h.y, h.z, 3, 4.5, 0.6, { len: 1.2, light: 12, lightR: 6 }); c.burst(FX.RUNE, LIGHT, cx, cy + 0.06, cz, 1, 4.5, 2.2, { alpha: 0.7, extra: 1, ease: 3 }); hfx(sim, HFX.CHIME, h.x, h.y + 2, h.z, 0, 0.8); }
  w.later(0.3, () => {
    if (h.dead) return;
    // (On each of them first, then all about them.)
    foesIn(w, cx, cz, 5).slice(0, 8).forEach((k, i) => w.later(i * 0.05, () => { if (!h.dead) spearRain(h, sim, k.x, k.z, 0.2, 1, 0.01, 12 * P, LIGHT, 1.3, 1.8); }));
    spearRain(h, sim, cx, cz, 4.2, 16 + 3 * rk, 0.9, 7 * P, LIGHT, 1, 1.6);
  });
  w.later(1.5, () => {
    if (h.dead) return;
    spearRain(h, sim, cx, cz, 0.05, 1, 0.01, 30 * P, LIGHT, 3.2, 4.5);
    w.later(0.3, () => {
      if (h.dead || !h.fxOk()) return;
      boom(c, LIGHT, cx, cy + 0.5, cz, 4, 24); c.burst(FX.COLUMN, LIGHT, cx, cy, cz, 6, 9, 0.6, { len: 2.2 }); c.burst(FX.RING, LIGHT, cx, cy + 0.05, cz, 0.5, 5.5, 0.55); c.burst(FX.RING, LIGHT, cx, cy + 0.05, cz, 0.3, 3.5, 0.7);
      hfx(sim, HFX.THUD, cx, cy, cz, 1); hfx(sim, HFX.CHIME, cx, cy + 1, cz, -5, 0.9);
      sim.event(EV.GROUND, cx, cy, cz);
    });
  });
  h.buff = { ...(h.buff || {}), speed: 1.4, dmg: 1.2 }; h.buffT = Math.max(h.buffT, 6);
};
// After the leaps, planted: a ring of spears comes down round it, all at once (Velscour's Thousandfold), and he stands to
// it, spear levelled, till they're in.
CAST.spear_barrage = (h, sim, m, { w, c, P }) => {
  h.leaps = 0; h.leapGoal = 3 + Math.floor(h.r() * 4);
  h.startSwing('Sword_Regular_C', 1.6, [0.33], () => {
    const cx = m.x, cz = m.z, cy = sim.world.height(cx, cz);
    w.zones.push({ kind: 'barrage', owner: h, x: cx, z: cz, y: cy, t: 0, life: 1.7, R: 2.9, seed: rand(0, TAU) });
    if (h.fxOk()) c.burst(FX.RING, SPIRIT, cx, cy + 0.05, cz, 0.5, 3.1, 0.6);
    w.later(0.22, () => {
      if (h.dead) return;
      w.blast(h, cx, cz, cy, 2.9, 20 * P, { kind: 'puncture', poise: 90 });
      if (h.fxOk()) { hfx(sim, HFX.THUD, cx, cy, cz, 0.6); for (let i = 0; i < 5; i++) { const a = i * 1.257; c.burst(FX.PUFF, STONE, cx + Math.sin(a) * 1.8, cy + 0.2, cz + Math.cos(a) * 1.8, 0.3, 0.9, 0.45, { alpha: 0.4 }); } }
      sim.event(EV.GROUND, cx, cy, cz);
    });
  }, { still: true, aimed: true, hold: [0.45, 0.35], end: 0.6 });
};

// ---- boomerang knight: one in each hand, and what he can make of light ------------------------------------------------

// A boomerang of gold and light: out, slowing, hung turning at the far end of its throw; through everything, and back to
// the hand, which closes on it. o: size, v, dmg, life, hand, glow, halo, trail, and the rest as shot().
function energyRang(h, sim, m, o) {
  const w = sim.heroWorld, c = sim.casting, hp = h.handPos(o.hand ? 'l' : 'r'), v = o.v || 13, a = (o.dir ?? dirTo(h, m)) + (o.spread || 0), e = o.elem ?? LIGHT, mat = o.mat ?? MAT.GOLD;
  sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  return shot(w, h, { x: hp[0], y: Math.max(hp[1], h.y + 1), z: hp[2], vx: Math.sin(a) * v, vy: o.vy ?? 0, vz: Math.cos(a) * v, v, pierce: true, ret: true, hang: true, backV: 0.9, skim: true, r: 0.55, life: 1.5, elem: e, o: { elem: e },
    draw: (cc, s) => {
      const vv = Math.hypot(s.vx, s.vz) || 1, big = s.size, spin = s.t * 17 * (o.spin || 1), tr = o.trail ?? 1;
      rang3(cc, s.x, s.y, s.z, spin, 0.62 * big, e, mat, o.glow ?? 0.8, 0.1);
      cc.fx(FX.ORB, e, s.x, s.y, s.z, 0.16 * big, 0, 1, 0, 0, o.halo ?? 0.35, o.light ?? 4, 3 + big);
      if (!(s.pause > 0)) cc.fx(FX.TRAIL, e, s.x, s.y, s.z, 0.09 * big * tr, -s.vx / vv, 0, -s.vz / vv, (0.7 + big * 0.35) * tr, 0.45);
      o.more?.(cc, s, big);
    },
    // (Where it goes through something: a cut of gold along the way it went.)
    onHit: (k, s) => { if (h.fxOk()) { slash(c, k.x, k.y + 1.1, k.z, Math.atan2(s.vx, s.vz) + Math.PI / 2, 0.15, 1.2 + 0.4 * s.size, e, 0.14); o.hit?.(k, s); } },
    caught: (s) => { if (h.fxOk()) c.burst(FX.FLARE, e, s.x, s.y, s.z, 0.1, 0.5, 0.2, { light: 5, lightR: 3 }); if (!h.swing && !h.jump && !h.tossing) h.play('Sword_Block', 2.4, 'upper', 0.06); },
    ...o, hit: undefined, ...(o.y !== undefined ? { y: o.y } : {}) });
}
// Both at once, out to either side: they cross on the foe, a cross of gold cut there as they do, and come home each on the
// other's side.
CAST.cross_cut = (h, sim, m, { c, P }) => {
  const out = dist(h, m) + 0.4;
  stand(h, m, 1.75);
  h.throwBoomerang(sim, m, 0, 1, { cross: true, out, dmg: 10 });
  h.throwBoomerang(sim, m, 1, 1, { cross: true, out, dmg: 10 });
  w0(h).later(0.99, () => {
    if (h.dead || !E.fightable(m) || !h.flight) return;
    h.hit(sim, m, 8 * P, 'gash', 95, 0, { elem: LIGHT });
    // (A cross of gold on it, seen from before it and from its side.)
    if (h.fxOk()) { const a = dirTo(h, m); xcut(c, m.x, m.y + 1.15, m.z, a, 2.4, LIGHT, LIGHT, 8); xcut(c, m.x, m.y + 1.15, m.z, a + Math.PI / 2, 2.4, LIGHT, LIGHT); c.burst(FX.RING, LIGHT, m.x, m.y + 0.05, m.z, 0.3, 1.3, 0.2); }
  });
  h.shotCd = 1.6;
};
// One from each hand, a breath apart, each out round its own wide side of the foe and home to the hand that threw it.
CAST.double_throw = (h, sim, m) => {
  stand(h, m, 1.8);
  h.throwBoomerang(sim, m, 0, 1.8);
  sim.heroWorld.later(0.12, () => { if (!h.dead && E.fightable(m)) h.throwBoomerang(sim, m, 1, 1.8); });
  h.shotCd = 1.7;
};
// A boomerang of gold light as wide as he is tall: out through them, hung turning eight strides off, and back through them
// to his hand. He stands to it till it's home.
CAST.energy_rang = (h, sim, m, { P, rk }) => {
  stand(h, m, 2.3);
  throwIt(h, 1.25, () => { if (E.fightable(m)) energyRang(h, sim, m, { dmg: 13 * P, size: 2.3 + 0.12 * rk, r: 0.4, v: 13, life: 1.7, light: 6, poise: 55 }); }, { mask: 'full' });
};
// He stands where he is, facing it, till what he's thrown is home: so long, and no blow of his own meanwhile.
function stand(h, m, secs) { h.yaw = h.faceYaw = dirTo(h, m); h.hold = Math.max(h.hold, secs); h.holdFace = h.yaw; h.shotCd = Math.max(h.shotCd, secs); h.sideGoal = null; }
// A cut across the air before him, and the cut goes on without him: a crescent of gold, widening, through everything it meets.
CAST.wind_slash = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  h.startSwing('Sword_Regular_B', 1.1, [0.48], () => {
    const v = 18, s = Math.sin(yaw), co = Math.cos(yaw);
    shot(w, h, { x: h.x + s * 0.9, y: h.y + 1.1, z: h.z + co * 0.9, vx: s * v, vy: 0, vz: co * v, dmg: 12 * P, pierce: true, r: 1.0, life: 0.5, elem: LIGHT, skim: true, size: 0.9, grow: 2.4, sizeMax: 2.1, growDmg: 0, poise: 55, o: { elem: LIGHT },
      draw: (cc, q) => { for (let i = 0; i < 2; i++) cc.fx(FX.GLYPH, LIGHT, q.x - s * (0.6 + i * 0.35) * q.size, q.y, q.z - co * (0.6 + i * 0.35) * q.size, (1.15 - i * 0.25) * q.size, 0, 1, 0, yaw, 0.75 - i * 0.35, i ? 0 : 5, 4, 0, i, GLYPHS.CRESCENT); },
      tick: (q) => { if (h.fxOk() && Math.random() < 0.25) c.burst(FX.PUFF, STONE, q.x + rand(-0.8, 0.8), sim.world.height(q.x, q.z) + 0.15, q.z + rand(-0.8, 0.8), 0.15, 0.5, 0.35, { alpha: 0.3 }); } });
    sim.event(EV.WHOOSH, h.x, h.y + 1.2, h.z);
  }, { end: 0.85, lunge: 0.6 });
};
// A ring of blades, as wide as a forearm: it bites one, hangs there grinding, and goes for the next, and the next, before
// it comes home.
CAST.chakram = (h, sim, m, { P, rk }) => { stand(h, m, 1.6); throwIt(h, 1.25, () => {
  if (!E.fightable(m)) return;
  energyRang(h, sim, m, { dmg: 9 * P, v: 13, life: 3.5, bounce: 4 + rk, hop: 8, hopV: 12, hopPause: 0.1, pierce: false, hang: false, o: { bleed: true, elem: LIGHT }, r: 0.6,
    draw: (cc, s) => {
      const vv = Math.hypot(s.vx, s.vz) || 1;
      star3(cc, s.x, s.y, s.z, s.t * 22, 0.46, LIGHT, MAT.GOLD, 2, 0.8);
      cc.fx(FX.RING, LIGHT, s.x, s.y, s.z, 0.46, 0, 1, 0, 0, 1, 5, 4);
      cc.fx(FX.DISC, LIGHT, s.x, s.y - 0.01, s.z, 0.44, 0, 1, 0, 0, 0.4);
      if (s.pause > 0) cc.fx(FX.GLYPH, LIGHT, s.x, s.y, s.z, 0.45, 0, 0, 0, s.t * 30, 0.8, 0, 0, 0, 0, GLYPHS.SPARK);
      else cc.fx(FX.TRAIL, LIGHT, s.x, s.y, s.z, 0.1, -s.vx / vv, 0, -s.vz / vv, 1.2, 0.6);
    },
    hit: (k) => hfx(sim, HFX.SPARKS, k.x, k.y + 1.1, k.z, 14) });
}, { mask: 'full' }); };
// Boomerangs of gold turning round him, level, at the height of a chest: he takes them in among the foe, and they cut
// whatever they pass.
CAST.orbiting_rangs = (h, sim, m, { w, c, P, rk }) => {
  h.spreadT = 0.5;
  h.startSwing('Sword_Block', 1.6, [0.12], () => {
    if (h.fxOk()) c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.4, 2.2, 0.35);
    orbit(w, h, { n: 2 + rk, r: 2, speed: 5, life: 7, y: 1.05, dmg: 4 * P, reach: 0.75, o: { elem: LIGHT },
      draw: (cc, x, y, z, a, i, q, k) => { rang3(cc, x, y, z, q.t * 17 + i, 0.7 * k, LIGHT, MAT.GOLD, 0.9, 0.06); cc.fx(FX.TRAIL, LIGHT, x, y, z, 0.06, -Math.cos(a), 0, Math.sin(a), 0.5, 0.4 * k); if (i === 0) cc.fx(FX.RING, LIGHT, h.x, h.y + 0.06, h.z, 2, 0, 1, 0, 0, 0.35 * k); } });
  }, { still: true, end: 0.45 });
};
// Fifteen small ones, off one hand and then the other as fast as he can let them go: up and back over his shoulders in a
// fan, hung there a breath, and then every one of them turns on the one mark.
CAST.homing_salvo = (h, sim, m, { w, c, P, rk }) => {
  const N = 15, goAt = sim.time + 0.62, back = dirTo(h, m) + Math.PI;
  stand(h, m, 1.7);
  gather(c, h, LIGHT, 2, 0.3);
  const loose = (hand, i0, n) => { for (let j = 0; j < n; j++) w.later(j * 0.03, () => {
    if (h.dead || !E.fightable(m)) return;
    const i = i0 + j, hp = h.handPos(hand ? 'l' : 'r'), a = back + (i / (N - 1) - 0.5) * 2.4;
    shot(w, h, { x: hp[0], y: hp[1] + 0.1, z: hp[2], vx: Math.sin(a) * 4, vy: 7.5 + (i % 3) * 0.8, vz: Math.cos(a) * 4, grav: 19, foe: m, only: true, dmg: (3 + 0.3 * rk) * P, poise: i >= N - 3 ? 95 : 20, life: 3, r: 0.5, elem: LIGHT, o: { elem: LIGHT },
      tick: (s) => {
        if (s.go) return;
        if (sim.time < goAt + i * 0.025) { if (s.vy < 0) { s.vy = 0; s.grav = 0; s.vx *= 0.3; s.vz *= 0.3; } return; }
        s.go = true; s.grav = 0; s.homing = 9 + rk;
        if (E.fightable(m)) Object.assign(s, toward(s.x, s.y, s.z, m, 19));
      },
      draw: (cc, s) => { const vv = Math.hypot(s.vx, s.vy, s.vz) || 1; rang3(cc, s.x, s.y, s.z, s.t * 24 + i, 0.58, LIGHT, MAT.GOLD, 1, 0.1); if (s.go) cc.fx(FX.TRAIL, LIGHT, s.x, s.y, s.z, 0.05, -s.vx / vv, -s.vy / vv, -s.vz / vv, 0.6, 0.5, i % 5 === 0 ? 3 : 0, 3); },
      onHit: (k) => { if (h.fxOk()) c.burst(FX.GLYPH, LIGHT, k.x + rand(-0.3, 0.3), k.y + rand(0.7, 1.5), k.z + rand(-0.3, 0.3), 0.15, i >= N - 3 ? 0.9 : 0.5, 0.16, { ay: 0, len: rand(0, TAU), extra: GLYPHS.SPARK }); } });
    if (j % 2 === 0) sim.event(EV.WHOOSH, hp[0], hp[1], hp[2]);
  }); };
  h.toss('r', 0.3, () => loose(0, 0, 8));
  w.later(0.2, () => { if (!h.dead) h.toss('l', 0.3, () => loose(1, 8, 7)); });
  // (And his hand out at the mark till the last of them is in.)
  w.later(0.55, () => { if (!h.dead && E.fightable(m)) { const a = dirTo(h, m); h.pointAt([Math.sin(a), 0.1, Math.cos(a)], 0.8, { aim: false }); } });
};
// Down on his haunches, arms out; and then he's a streak of gold through the lot of them, a cut left across each he
// passes, and stopped hard a stride past the last, turned on them.
CAST.tempest_dash = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  h.play('NinjaJump_Start', 2, 'full', 0.06); h.hold = 0.24; h.holdFace = yaw; h.dodgeT = 0.22; h.shotCd = Math.max(h.shotCd, 0.9); h.spreadT = 0.65;
  gather(c, h, LIGHT, 1.8, 0.2);
  w.later(0.2, () => {
    if (h.dead) return;
    const x0 = h.x, y0 = h.y + 1.1, z0 = h.z;
    dash(h, sim, yaw, Math.min(10, (E.fightable(m) ? dist(h, m) + E.radiusOf(m) : 4) + 3), { v: 32, clip: 'Sword_Dash', dmg: 14, kind: 'gash', o: { bleed: true, elem: LIGHT }, aside: true, skid: LIGHT,
      onHit: (k) => { blood(sim, k, Math.cos(yaw), -Math.sin(yaw), 0.4); if (h.fxOk()) xcut(c, k.x, k.y + 1.1, k.z, yaw + Math.PI / 2, 2, LIGHT, LIGHT, 5); },
      draw: (cc) => { const s = Math.sin(yaw), co = Math.cos(yaw); for (let i = 0; i < 3; i++) cc.fx(FX.TRAIL, LIGHT, h.x - co * (i - 1) * 0.4, h.y + 0.6 + i * 0.4, h.z + s * (i - 1) * 0.4, 0.16, -s, 0, -co, 3.2, 0.7); for (const sd of ['l', 'r']) { const p = h.handPos(sd); cc.fx(FX.ORB, LIGHT, p[0], p[1], p[2], 0.12, 0, 1, 0, 0, 1); } },
      done: () => {
        w.blast(h, h.x, h.z, h.y, 2.2, 8 * P, { kind: 'bash', poise: 40, shove: 5, quiet: true });
        if (h.fxOk()) { const dx = h.x - x0, dz = h.z - z0, L = Math.hypot(dx, dz) || 1; c.burst(FX.BEAM, LIGHT, x0, y0, z0, 0.02, 0.01, 0.2, { ax: dx / L, ay: 0, az: dz / L, len: L, alpha: 0.5, extra: 0.3, light: 10, lightR: 6 }); }
      } });
    h.spreadT = 0.4;
  });
};
// Wound back, arms out; and round once on his heel, one let go off each hand at every point of the turn: eight, out every
// way at once. They go, they hang, they all come back through whatever's between.
CAST.blade_ring = (h, sim, m, { c, P, rk }) => {
  const n = 8 + (rk > 3 ? 4 : 0), y0 = h.yaw;
  let out = 0, t = 0;
  h.spreadT = 0.7;
  if (h.fxOk()) c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.4, 2.6, 0.45, { alpha: 0.5 });
  h.startSwing('Sword_Block', 1.4, [0.99], () => {}, { still: true, hold: [0.3, 0.5], end: 0.55, tick: (dt) => {
    t += dt;
    const u = clamp((t - 0.14) / 0.36, 0, 1);
    h.yaw = h.faceYaw = wrapAngle(y0 - 0.5 * Math.min(1, t / 0.14) + u * (TAU + 0.5));
    while (out < n && u * n > out) { energyRang(h, sim, m, { dir: h.yaw, dmg: 7 * P, v: 10, life: 1.3, size: 0.95, hand: out % 2, light: out % 4 ? 0 : 4, y: h.y + 1.1 }); out++; }
  }, cut: () => { h.yaw = h.faceYaw = y0; } });
  h.shotCd = 1.3;
};
// Wound back; then turning, arms out, six of gold out round him on two rings, through the lot of them: faster, and faster
// again, and at the end of it every one of them flung out and called home.
CAST.bladestorm = (h, sim, m, { w, c, P, rk }) => {
  const life = 2.4 + 0.1 * rk, N = 6, y0 = h.yaw;
  let tick = 0, cuts = 0, ang = 0;
  gather(c, h, LIGHT, 2.6, 0.2);
  zone(w, h, life + 0.2, (cc, q) => {
    const t = q.t - 0.2;
    if (t < 0) return;
    const k = Math.min(1, t * 5);
    for (let i = 0; i < N; i++) {
      const hi = i % 2, r = (hi ? 2.2 : 1.6) * k, a = ang * (hi ? 1 : 1.15) + i * TAU / N, x = h.x + Math.sin(a) * r, y = h.y + (hi ? 1.35 : 0.85), z = h.z + Math.cos(a) * r;
      rang3(cc, x, y, z, q.t * 22 + i, 0.5, LIGHT, MAT.GOLD, 0.9, 0.08);
      cc.fx(FX.TRAIL, LIGHT, x, y, z, 0.05, -Math.cos(a), 0, Math.sin(a), 1.5 * k, 0.5 * k);
    }
    cc.fx(FX.RING, LIGHT, h.x, h.y + 0.06, h.z, 2.3 * k, 0, 1, 0, 0, 0.4 * k, 5 * k, 5);
  }, (q, dt) => {
    const t = q.t - 0.2;
    h.spreadT = 0.2; h.dodgeT = 0.1; h.iframesT = Math.max(h.iframesT, 0.05);
    if (t < 0) { h.yaw = h.faceYaw = wrapAngle(y0 - 0.7 * (q.t / 0.2)); return; }
    const sp = t < life / 3 ? 10 : t < life * 2 / 3 ? 14 : 19;
    ang += sp * dt;
    h.yaw = wrapAngle(h.yaw + sp * dt); h.faceYaw = h.yaw;
    h.bodyRoll = 0.2;
    const k = E.fightable(m) ? m : nearest(w, h.x, h.z, 8);
    // (At the edge of them, not in among them: where he can be seen.)
    h.goal = k ? { x: k.x, z: k.z, speed: 4.4, stop: 1.7 + E.radiusOf(k), face: h.yaw } : null;
    if ((tick -= dt) > 0) return;
    tick += sp > 15 ? 0.1 : 0.14; cuts++;
    for (const f of w.blast(h, h.x, h.z, h.y, 2.4, 3.2 * P, { kind: 'gash', poise: 15, bleed: true, quiet: cuts % 3 !== 0, elem: LIGHT })) if (cuts % 4 === 0) blood(sim, f, Math.cos(h.yaw), -Math.sin(h.yaw), 0.3);
    if (cuts % 3 === 0) sim.event(EV.WHOOSH, h.x, h.y + 1, h.z);
  }, () => {
    h.goal = null; h.bodyRoll = 0;
    if (h.dead) return;
    h.yaw = h.faceYaw = E.fightable(m) ? dirTo(h, m) : h.yaw;
    // (The last of it: all of them flung out, a ring of gold on the ground half as wide again, and whatever's near thrown back.)
    for (let i = 0; i < 8; i++) energyRang(h, sim, m, { dir: i * TAU / 8, dmg: 6 * P, v: 11, life: 1.1, size: 0.9, hand: i % 2, light: i % 4 ? 0 : 4, y: h.y + 1.1 });
    w.blast(h, h.x, h.z, h.y, 3, 8 * P, { kind: 'gash', poise: 95, shove: 5, elem: LIGHT });
    if (h.fxOk()) { c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.5, 3.4, 0.4); boom(c, LIGHT, h.x, h.y + 1, h.z, 1.6, 10); hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.4); }
    if (!h.swing && !h.jump) h.play('Sword_Block', 1.8, 'full', 0.08);
  });
};
// The great one. It's made over his raised hand, turning, the light drawn in to it; then thrown: gold, as wide as he is
// tall and half as wide again, slow, hung turning at the far end. It leaves a thread of gold from each it strikes to the
// next, and when it's home in his hand the threads pull tight and cut whatever stands across them.
CAST.golden_boomerang = (h, sim, m, { w, c, P, rk }) => {
  const T0 = 0.73, big = 5.5 + 0.2 * rk, dir0 = dirTo(h, m);
  stand(h, m, 3.9);
  gather(c, h, LIGHT, 3.2, T0);
  if (h.fxOk()) { c.burst(FX.RING, LIGHT, h.x, h.y + 0.06, h.z, 1.4, 1.5, T0, { alpha: 0.7 }); hfx(sim, HFX.CHIME, h.x, h.y + 1.4, h.z, 0, 0.8); }
  const stop = inHand(h, 'r', T0, (cc, p, k) => { rang3(cc, p[0], p[1] + 0.3 + 0.5 * k, p[2], sim.time * (6 + 8 * k), 0.62 * big * (0.15 + 0.85 * k * k), LIGHT, MAT.GOLD, 0.45, 0.1); cc.fx(FX.ORB, LIGHT, p[0], p[1] + 0.3 + 0.5 * k, p[2], 0.2 + 0.5 * k, 0, 1, 0, 0, 0.35, 8 * k, 6); });
  throwIt(h, 0.42, () => {
    stop();
    if (!E.fightable(m)) return;
    const threads = [];
    let last = null, pulse = 0;
    energyRang(h, sim, m, { dmg: 34 * P, size: big, r: 0.33, v: 9.5, life: 2.6, spin: 1, glow: 0.5, halo: 0, trail: 0.3, light: 8, hk: 'bash', poise: 95, o: { stun: 0.6, shove: 6, elem: LIGHT },
      hit: (k) => { const p = [k.x, k.y + 1.1, k.z]; if (last) threads.push([last, p]); last = p; c.burst(FX.FLARE, LIGHT, k.x, k.y + 1.1, k.z, 0.4, 1.1, 0.2, { light: 8, lightR: 5 }); hfx(sim, HFX.CHIME, k.x, k.y + 1.1, k.z, threads.length * 2, 0.5); hfx(sim, HFX.THUD, k.x, k.y, k.z, 0.5); },
      more: (cc, s, sz) => {
        cc.fx(FX.DISC, LIGHT, s.x, sim.world.height(s.x, s.z) + 0.04, s.z, 0.3 * sz, 0, 1, 0, 0, 0.35);
        for (const [a, b] of threads) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1; cc.fx(FX.BEAM, LIGHT, a[0], a[1], a[2], 0.025, dx / L, dy / L, dz / L, L, 0.9, 0, 0, 0, 0, 0.025); }
      },
      tick: (s, dt) => { if ((pulse -= dt) <= 0 && h.fxOk()) { pulse = 0.25; c.burst(FX.RING, LIGHT, s.x, sim.world.height(s.x, s.z) + 0.05, s.z, 0.6, 2, 0.35, { alpha: 0.5 }); } },
      onTurn: (s) => { if (h.fxOk()) { boom(c, LIGHT, s.x, s.y, s.z, 1.8, 8); hfx(sim, HFX.THUD, s.x, s.y - 1, s.z, 0.3); } },
      caught: (s) => {
        // (It takes catching: braced, and the ground rung under him.)
        h.hold = 0.5;
        if (!h.swing && !h.jump) h.play('Sword_Block', 1.5, 'full', 0.06);
        if (h.fxOk()) { c.burst(FX.FLARE, LIGHT, s.x, s.y, s.z, 0.3, 1.1, 0.25, { light: 10, lightR: 6 }); c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.4, 2.4, 0.35); hfx(sim, HFX.CHIME, s.x, s.y, s.z, 12, 0.7); hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.5); }
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
  }, { mask: 'full', end: 0.55, cut: stop });
};
// A wind with knives in it, called up out of the ground among them, his hand held out to it: it wanders after them, draws
// them in and cuts them as they turn in it, and breaks apart when he lets it go.
CAST.razor_tornado = (h, sim, m, { w, c, P, rk }) => {
  const life = 4 + 0.2 * rk, at = { x: m.x, z: m.z };
  let tick = 0.35;
  stand(h, m, life * 0.6);
  h.pointAt([Math.sin(dirTo(h, m)), 0.25, Math.cos(dirTo(h, m))], life * 0.6 + 0.2, { aim: false });
  zone(w, h, life, (cc, q) => {
    const grow = Math.min(1, q.t / 0.35), k = Math.min(1, (life - q.t) * 3), y = sim.world.height(at.x, at.z);
    // (Thin slices of wind, wider the higher they are, up as far as it has grown; and six blades going up it round and round.)
    for (let i = 0; i < 10; i++) { const f = i / 9; if (f > grow) break; const r = 0.4 + f * 1.6; cc.fx(FX.GLYPH, LIGHT, at.x + Math.sin(q.t * 3 + i) * 0.1 * i, y + 0.2 + f * 2.8, at.z + Math.cos(q.t * 3 + i) * 0.1 * i, r, 0, 1, 0, q.t * (13 - i * 0.5) + i * 1.3, (i % 2 ? 0.25 : 0.4) * k, i === 4 ? 5 * k : 0, 5, 0, i, GLYPHS.CRESCENT); }
    for (let i = 0; i < 6; i++) { const f = ((q.t * 0.5 + i / 6) % 1) * grow, a = q.t * 8 + i * 1.047, r = 0.5 + f * 1.4; rang3(cc, at.x + Math.sin(a) * r, y + 0.3 + f * 2.7, at.z + Math.cos(a) * r, q.t * 20 + i, 0.55, LIGHT, MAT.GOLD, 1, 0.3); }
    cc.fx(FX.RING, LIGHT, at.x, y + 0.06, at.z, 2.4 * grow, 0, 1, 0, 0, 0.5 * k);
    cc.fx(FX.PUFF, STONE, at.x, y + 0.5, at.z, 1.5 * grow, 0, 1, 0, 0, 0.18 * k, 0, 0, q.t / life, 1);
  }, (q, dt) => {
    const k = nearest(w, at.x, at.z, 9);
    if (k) { const d = Math.hypot(k.x - at.x, k.z - at.z) || 1, sp = Math.min(2.6, d * 2); at.x += (k.x - at.x) / d * sp * dt; at.z += (k.z - at.z) / d * sp * dt; }
    if (h.point) { const a = Math.atan2(at.x - h.x, at.z - h.z); h.point.d = [Math.sin(a) * 0.97, 0.25, Math.cos(a) * 0.97]; }
    for (const f of foesIn(w, at.x, at.z, 4.5)) { const d = Math.hypot(f.x - at.x, f.z - at.z) || 1; if (d > 0.7 && E.radiusOf(f) <= 1.2 && !f.boss) sim.casting.shove(f, (at.x - f.x) / d * 20 * dt, (at.z - f.z) / d * 20 * dt); }
    if ((tick -= dt) > 0) return;
    tick += 0.3;
    for (const f of foesIn(w, at.x, at.z, 2.3)) { h.hit(sim, f, 3 * P, 'gash', 10, 0, { bleed: true, elem: LIGHT }); if (Math.random() < 0.3) blood(sim, f, rand(-1, 1), rand(-1, 1), 0.25); }
  }, () => {
    if (h.dead) return;
    const y = sim.world.height(at.x, at.z);
    w.blast(h, at.x, at.z, y, 2.6, 8 * P, { kind: 'gash', poise: 60, shove: 5, quiet: true });
    if (h.fxOk()) { boom(c, LIGHT, at.x, y + 1.2, at.z, 2, 8); c.burst(FX.RING, LIGHT, at.x, y + 0.05, at.z, 0.5, 3.2, 0.4); }
  });
  sim.event(EV.WHOOSH, m.x, m.y + 1, m.z);
};

// ---- bard: the lute, and what comes off its strings --------------------------------------------------------------------

// A note in the air: its own sign, and behind it the five lines of a stave (stave), or only the light it leaves.
const noteDraw = (glyph, size = 0.2, stave = false) => (c, s) => {
  const v = Math.hypot(s.vx, s.vy, s.vz) || 1, e = s.elem, big = size * s.size, y = s.y + (s.bob ? Math.sin(s.t * 7 + (s.seed || 0)) * 0.12 : 0);
  c.fx(FX.GLYPH, e, s.x, y, s.z, big, 0, 0, 0, Math.sin(s.t * 9 + (s.seed || 0)) * 0.3, s.dim ?? 1, 4 * (s.dim ?? 1), 3, 0, s.seed || 0, glyph);
  if (s.pause > 0) return;
  if (stave) for (let k = 0; k < 5; k++) c.fx(FX.TRAIL, e, s.x, y + (k - 2) * 0.055 * s.size, s.z, 0.012, -s.vx / v, -s.vy / v, -s.vz / v, 0.9 * s.size, 0.6, 0, 0, 0, k * 0.2);
  else c.fx(FX.TRAIL, e, s.x, y, s.z, big * 0.3, -s.vx / v, -s.vy / v, -s.vz / v, 0.5 + big * 1.5, 0.35 * (s.dim ?? 1));
};
// A note off the lute at a foe: it bends after it as it flies. o as shot(), plus glyph, big, stave, spread.
function note(h, sim, m, o = {}) {
  const w = sim.heroWorld, c = sim.casting, s = Math.sin(h.yaw), co = Math.cos(h.yaw);
  const x = h.luteT ? h.luteT[0] + s * 0.3 : h.x + s * 0.5, y = h.luteT ? h.luteT[1] : h.y + 1.1, z = h.luteT ? h.luteT[2] + co * 0.3 : h.z + co * 0.5;
  const a = dirTo({ x, z }, m) + (o.spread || 0), v = o.v || 12, elem = o.elem ?? h.tune?.elem ?? ARCANE;
  return shot(w, h, { x, y, z, vx: Math.sin(a) * v, vy: 0.5, vz: Math.cos(a) * v, homing: o.homing ?? 5, foe: m, dmg: 7 * h.power(), hk: 'bash', life: 1.2, r: 0.45, elem, seed: rand(0, 6), o: { elem },
    draw: noteDraw(o.glyph ?? pick([GLYPHS.NOTE, GLYPHS.CROTCHET]), o.big || 0.2, o.stave),
    onHit: (k) => { if (h.fxOk()) c.burst(FX.GLYPH, elem, k.x, k.y + 1.5, k.z, 0.14, 0.32, 0.2, { ay: 0, extra: GLYPHS.NOTE }); },
    ...o });
}
// What a bard does for an ordinary blow: a few bars on the lute, a note off it at the foe (Hero.pluck).
export function pluckNote(h, sim, m) {
  h.playLute(1.0, h.tune?.v === 2 ? 2 : (h.slot + Math.floor(sim.time / 9)) % 2, { elem: ARCANE });
  sim.heroWorld.later(0.22, () => { if (!h.dead && E.fightable(m)) { note(h, sim, m, { stave: true }); sim.event(EV.WHOOSH, h.x, h.y + 1.2, h.z); } });
}
// Play, and when the hand comes down do the rest. v: which way of playing (the great wheeling strum is timed so its
// stroke lands then). at: seconds in. stay: how long after that he stands to it.
function riff(h, sim, secs, v, elem, at, fn, stay = 0.15) {
  h.tune = null;
  h.playLute(secs, v, { elem, rainbow: false, rate: v === 2 ? 0.7 / (0.95 * at) : 1 });
  h.hold = Math.max(h.hold, at + stay); h.holdFace = h.yaw;
  h.gcd = Math.max(h.gcd, at + 0.5); h.shotCd = Math.max(h.shotCd, at + stay + 0.25);
  sim.heroWorld.later(at, () => { if (!h.dead) fn(); });
}
// The arm round and down through every string: three notes at once, thrown wide, and what they strike is thrown back.
CAST.power_chord = (h, sim, m, { c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  riff(h, sim, 1.1, 2, FIRE, 0.6, () => {
    if (!E.fightable(m)) return;
    for (let i = -1; i <= 1; i++) note(h, sim, m, { spread: i * 0.21, dmg: 9 * P, v: 15, elem: FIRE, glyph: i ? GLYPHS.CROTCHET : GLYPHS.NOTE, big: 0.32, o: { shove: 5, elem: FIRE }, poise: i ? 50 : 90 });
    if (h.fxOk()) hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.25);
  });
};
// A fan of notes, every colour there is, sharp as knives: level, at the height of a chest, out across eighty degrees of
// what's before him. What they cut, bleeds.
CAST.fan_of_notes = (h, sim, m, { c, P, rk, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  riff(h, sim, 1.0, 0, ARCANE, 0.4, () => {
    // (Across the middle of them, not past one of them: and what finds nothing is gone in five strides.)
    const pack = E.fightable(m) ? foesIn(sim.heroWorld, m.x, m.z, 4.5) : [], mid = pack.length ? { x: pack.reduce((q, k) => q + k.x, 0) / pack.length, z: pack.reduce((q, k) => q + k.z, 0) / pack.length } : null;
    const n = 6 + rk, dir = mid ? dirTo(h, mid) : h.yaw, v = 13;
    for (let i = 0; i < n; i++) {
      const a = dir + (i / (n - 1) - 0.5) * 1.1, e = RAINBOW[i % RAINBOW.length];
      shot(sim.heroWorld, h, { x: h.x + Math.sin(a) * 0.6, y: h.y + 1.15, z: h.z + Math.cos(a) * 0.6, vx: Math.sin(a) * v, vy: 0, vz: Math.cos(a) * v, dmg: 6 * P, o: { bleed: true, elem: e }, pierce: 2, life: 0.4, r: 0.5, elem: e, seed: i, size: 1,
        draw: noteDraw(GLYPHS.NOTE, 0.24),
        onHit: (k) => blood(sim, k, Math.sin(a), Math.cos(a), 0.3) });
    }
    if (h.fxOk()) waves(c, h.x, h.y + 0.08, h.z, dir, 4, ARCANE);
    sim.event(EV.WHOOSH, h.x, h.y + 1.2, h.z);
  });
};
// One great downstroke, and the sound of it goes down the ground in rings, one after another, out to nine metres: each
// kicks up the dust and shoves back what's standing on it.
CAST.shockwave_riff = (h, sim, m, { w, c, P, rk, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  riff(h, sim, 1.1, 2, STORM, 0.6, () => {
    const dir = E.fightable(m) ? dirTo(h, m) : h.yaw, s = Math.sin(dir), co = Math.cos(dir), n = 5 + Math.floor(rk / 2);
    for (let i = 0; i < n; i++) w.later(i * 0.08, () => {
      if (h.dead) return;
      const x = h.x + s * (1.4 + i * 1.6), z = h.z + co * (1.4 + i * 1.6), y = sim.world.height(x, z);
      w.blast(h, x, z, y, 1.35, 8 * P, { kind: 'bash', poise: 55, quiet: i > 0, stun: 0.3, shove: 4, fromX: h.x, fromZ: h.z, elem: STORM });
      if (h.fxOk()) {
        c.burst(FX.RING, STORM, x, y + 0.05, z, 0.2, 1.5 + i * 0.12, 0.3, { light: i % 2 ? 0 : 6, lightR: 4 }); c.burst(FX.RING, STORM, x, y + 0.05, z, 0.1, 1.3 + i * 0.12, 0.3);
        c.burst(FX.PUFF, STONE, x, y + 0.2, z, 0.3, 1, 0.4, { alpha: 0.35 });
        c.burst(FX.GLYPH, STORM, x, y + 0.5, z, 0.4, 1.3, 0.25, { ax: -co, ay: 0, az: s, len: 0, extra: GLYPHS.WAVES });
      }
    });
    if (h.fxOk()) hfx(sim, HFX.THUD, h.x + s * 2, h.y, h.z + co * 2, 0.4);
  });
};
// A note that leaps from one to the next; and, a beat behind it, its echo doing the same, smaller and fainter; and the
// echo's echo after that.
CAST.echo = (h, sim, m, { w, c, P, rk, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  riff(h, sim, 1.3, 1, SPIRIT, 0.3, () => {
    [[0, 1, 8, 0.26], [0.3, 0.6, 5, 0.18], [0.6, 0.35, 3, 0.13]].forEach(([d, dim, dmg, big]) => w.later(d, () => {
      if (!h.dead && E.fightable(m)) note(h, sim, m, { dmg: dmg * P, bounce: 3 + Math.floor(rk / 2), hop: 8, hopV: 12, v: 14, elem: d ? FROST : SPIRIT, glyph: GLYPHS.NOTE, big, dim, life: 2.5, quiet: !!d, o: { elem: d ? FROST : SPIRIT, quiet: !!d },
        onHit: (k) => { if (h.fxOk()) c.burst(FX.RING, d ? FROST : SPIRIT, k.x, k.y + 0.05, k.z, 0.2, 0.8 + d * 1.2, 0.3, { alpha: dim }); } });
    }));
  }, 0.7);
};
// He stands and picks, and the notes go out from him one after another and dance: from one head to the next to the next,
// ringing on each.
CAST.dancing_notes = (h, sim, m, { w, c, P, rk }) => {
  const n = 3 + Math.ceil(rk / 2);
  h.tune = null;
  h.playLute(0.5 + n * 0.22 + 0.4, 1, { elem: HEAL });
  h.hold = Math.max(h.hold, 0.4 + n * 0.22); h.holdFace = dirTo(h, m); h.shotCd = Math.max(h.shotCd, 0.6 + n * 0.22);
  for (let i = 0; i < n; i++) w.later(0.2 + i * 0.22, () => {
    if (h.dead || !E.fightable(m)) return;
    const e = i % 2 ? LIGHT : HEAL;
    note(h, sim, m, { dmg: 5 * P, v: 10, bounce: 5 + rk, hop: 8, hopV: 9, hopPause: 0.12, elem: e, glyph: i % 2 ? GLYPHS.CROTCHET : GLYPHS.NOTE, big: 0.42, life: 4, homing: 5, bob: true, poise: 55, o: { elem: e },
      onHit: (k, s) => { if (h.fxOk()) { c.burst(FX.RING, e, k.x, k.y + 0.05, k.z, 0.2, 0.9, 0.25); hfx(sim, HFX.PLUCK, k.x, k.y + 1.5, k.z, SCALE[(i * 2 + s.hitSet.size) % SCALE.length], 0.35); } } });
  });
};
// One note, the lowest there is, as tall as a man: it hangs over them a moment, growing, and then it falls, faster as it
// comes, and the ground jumps where it lands.
CAST.bass_drop = (h, sim, m, { w, c, P, rk }) => {
  const x = m.x, z = m.z, y = sim.world.height(x, z), r = 2.5 + 0.2 * rk;
  riff(h, sim, 1.4, 2, ARCANE, 0.6, () => {
    let hit = false;
    const T0 = 0.3, T = 0.5;
    if (h.fxOk()) c.burst(FX.RING, ARCANE, x, y + 0.05, z, r, r * 0.4, T, { alpha: 0.8, ease: 1 });
    zone(w, h, T + 0.1, (cc, q) => {
      const hang = Math.min(1, q.t / T0), u = clamp((q.t - T0) / (T - T0), 0, 1), up = (1 - u * u) * 3.2;
      if (u >= 1) return;
      cc.fx(FX.GLYPH, ARCANE, x, y + 1 + up, z, 0.4 + 0.6 * hang, 0, 0, 0, 0.15 * Math.sin(q.t * 20) * (1 - u), hang, 10 * hang, 6, 0, 0, GLYPHS.NOTE);
      if (u > 0) { cc.fx(FX.COLUMN, ARCANE, x, y, z, 1.2 + up, 0, 1, 0, 0.5, 0.3 * u); cc.fx(FX.TRAIL, ARCANE, x, y + 1.6 + up, z, 0.4, 0, 1, 0, 3, 0.7); }
    }, (q) => {
      if (hit || q.t < T) return;
      hit = true;
      w.blast(h, x, z, y, r, 20 * P, { kind: 'bash', poise: 100, stun: 1.2, shove: 5, elem: ARCANE, fromX: x, fromZ: z });
      if (h.fxOk()) {
        c.burst(FX.DISC, ARCANE, x, y + 0.04, z, r, r * 1.1, 0.35, { alpha: 0.8, light: 16, lightR: 8 });
        for (let i = 0; i < 2; i++) c.burst(FX.RING, ARCANE, x, y + 0.05, z, 0.3, r * (0.8 + i * 0.35), 0.35 + i * 0.12);
        c.burst(FX.FLARE, ARCANE, x, y + 0.5, z, 0.5, 1.6, 0.18);
        for (let i = 0; i < 6; i++) { const a = i * 1.047; drift(w, h, x, y + 0.6, z, Math.sin(a) * 3, 2.2, Math.cos(a) * 3, GLYPHS.NOTE, ARCANE, 0.25, 0.7, rand(-3, 3)); c.burst(FX.PUFF, STONE, x + Math.sin(a) * r * 0.7, y + 0.2, z + Math.cos(a) * r * 0.7, 0.3, 1, 0.45, { alpha: 0.35 }); }
        hfx(sim, HFX.THUD, x, y, z, 1); hfx(sim, HFX.PLUCK, x, y + 1, z, -12, 0.9);
      }
    });
  }, 0.6);
};
// The sword out and the lute left to hang: three runs, one foe to the next, a cut and a note for each; and a chord
// struck at the end of it.
CAST.swashbuckle = (h, sim, m, { w, c }) => {
  const seen = new Set();
  h.tune = null;
  const go = (k, left) => {
    if (h.dead || !E.fightable(k)) return;
    seen.add(k);
    dash(h, sim, dirTo(h, k), Math.min(7, dist(h, k) + 1.8), { v: 17, clip: 'Sword_Dash', dmg: 10, kind: 'gash', o: { bleed: true }, noShove: true,
      onHit: (f) => {
        blood(sim, f, Math.cos(h.yaw), -Math.sin(h.yaw), 0.4);
        if (h.fxOk()) { slash(c, f.x, f.y + 1.15, f.z, h.yaw, 0.6, 1.7, ARCANE, 0.14); drift(w, h, f.x, f.y + 1.6, f.z, rand(-0.5, 0.5), 1.4, rand(-0.5, 0.5), GLYPHS.NOTE, ARCANE, 0.18, 0.6, rand(-2, 2)); hfx(sim, HFX.PLUCK, f.x, f.y + 1.4, f.z, SCALE[(3 - left) * 2], 0.4); }
      },
      draw: (cc) => { const s = Math.sin(h.yaw), co = Math.cos(h.yaw); cc.fx(FX.TRAIL, ARCANE, h.x, h.y + 1.1, h.z, 0.18, -s, 0, -co, 2.4, 0.6); },
      done: () => {
        const nx = left > 0 && (nearest(w, h.x, h.z, 7, seen) || (E.fightable(k) ? k : null));
        if (nx) w.later(0.1, () => go(nx, left - 1));
        else w.later(0.12, () => { if (h.dead) return; const sting = () => { h.playLute(0.7, 2, { elem: ARCANE, rate: 1.6 }); h.hold = 0.6; h.holdFace = h.yaw; }; if (!E.fightable(k) || !leapAway(h, sim, k, 4, { ...BACKFLIP, draw: (cc) => { const s = Math.sin(h.yaw), co = Math.cos(h.yaw); cc.fx(FX.TRAIL, ARCANE, h.x, h.y + 1, h.z, 0.16, s, 0.2, co, 1.4, 0.5); }, land: () => { sim.event(EV.LAND, h.x, h.y, h.z, 0.5); sting(); } })) sting(); });
      } });
  };
  go(m, 2);
};
// A stave of light let out from the lute to the foe and held there, leaning into it: five lines, beating with each note
// he picks, the notes running down them, and a flare of it on everything they cross.
CAST.resonance_beam = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  let tick = 0, dir = yaw;
  const T = 1.4, len = 11;
  riff(h, sim, 1.9, 1, SPIRIT, 0.3, () => {
    if (h.tune) h.tune.lean = 0.12;
    zone(w, h, T, (cc, q) => {
      const s = Math.sin(dir), co = Math.cos(dir), k = Math.min(1, (T - q.t) * 6), reach = len * Math.min(1, q.t / 0.15, (T - q.t) / 0.12 + 0.05), x = h.x + s * 0.6, y = h.y + 1.15, z = h.z + co * 0.6;
      const beat = 1 + 0.5 * Math.max(0, Math.sin(q.t * 5.6 * TAU / 2));
      cc.fx(FX.BEAM, SPIRIT, x, y, z, 0.3, s, 0, co, reach, 0.1 * k, 0, 0, 0, 0, 0.3);
      for (let i = 0; i < 5; i++) cc.fx(FX.BEAM, SPIRIT, x, y + (i - 2) * 0.12 + 0.015 * Math.sin(q.t * 40 + i * 1.7), z, 0.018 * beat, s, 0, co, reach, 0.9 * k, i === 2 ? 8 * k : 0, 6, 0, i * 0.3, 0.018 * beat);
      for (let i = 0; i < 6; i++) { const f = ((q.t * 1.6 + i / 6) % 1) * len; if (f < reach) cc.fx(FX.GLYPH, i % 2 ? LIGHT : SPIRIT, x + s * f, y + ((i * 7) % 5 - 2) * 0.12, z + co * f, 0.4, 0, 0, 0, 0, k, 0, 0, 0, i, i % 2 ? GLYPHS.CROTCHET : GLYPHS.NOTE); }
    }, (q, dt) => {
      if (E.fightable(m)) dir += clamp(wrapAngle(dirTo(h, m) - dir), -1.4 * dt, 1.4 * dt);
      h.yaw = h.faceYaw = dir; h.hold = Math.max(h.hold, 0.1); h.holdFace = dir;
      if ((tick -= dt) > 0) return;
      tick += 0.18;
      const hit = w.line(h, h.x, h.z, dir, len, 0.55, 3.8 * P, { kind: 'bash', poise: 55, quiet: true, elem: SPIRIT });
      if (h.fxOk()) for (const k of hit) { c.burst(FX.FLARE, SPIRIT, k.x, k.y + 1.15, k.z, 0.25, 0.8, 0.15); c.burst(FX.RING, SPIRIT, k.x, k.y + 0.05, k.z, 0.2, 0.8, 0.2); }
    });
  });
};
// A slow air, picked, and he sways to it where he stands: it goes out over them soft and wide, and they nod where they
// stand, a moon and a star or two over each.
CAST.lullaby = (h, sim, m, { w, c, rk }) => {
  gather(c, h, FROST, 2.2, 0.5);
  if (h.fxOk()) c.burst(FX.RING, FROST, m.x, m.y + 0.05, m.z, 3.6, 3.4, 0.5, { alpha: 0.25 });
  riff(h, sim, 2.4, 1, FROST, 0.5, () => {
    const marks = foesIn(w, m.x, m.z, 6), secs = 2.2 + 0.2 * rk;
    for (const k of marks) { daze(sim, w, k, secs); slow(sim, k, 5); }
    if (!h.fxOk()) return;
    for (const d of [0, 0.6]) w.later(d, () => { if (!h.dead) c.burst(FX.RING, FROST, m.x, m.y + 0.05, m.z, 0.5, 3.6, 1.2, { alpha: 0.3 }); });
    for (const k of marks.slice(0, 8)) {
      zone(w, h, secs, (cc, q) => {
        if (!E.fightable(k)) return;
        const a = Math.min(1, q.t * 3, (secs - q.t) * 2);
        cc.fx(FX.GLYPH, FROST, k.x, k.y + 2.45, k.z, 0.26, 0, 0, 0, 2.2 + 0.1 * Math.sin(q.t * 2), 0.9 * a, 0, 0, 0, 0, GLYPHS.CRESCENT);
        for (let i = 0; i < 2; i++) cc.fx(FX.GLYPH, LIGHT, k.x + (i ? 0.35 : -0.3), k.y + 2.3 + i * 0.3, k.z, 0.08 + 0.03 * Math.sin(q.t * 6 + i * 2), 0, 0, 0, q.t, 0.8 * a, 0, 0, 0, i, GLYPHS.STAR4);
      });
      for (let i = 0; i < 3; i++) w.later(i * 0.6, () => drift(w, h, k.x + rand(-0.3, 0.3), k.y + 2.3, k.z + rand(-0.3, 0.3), rand(-0.1, 0.1), -0.45, rand(-0.1, 0.1), GLYPHS.CROTCHET, FROST, 0.26, 1.6, 0.4));
    }
  }, 1.2);
};
// The air drawn in to him, the arm up; and down through every string: the air itself goes out from him in two walls.
CAST.sonic_boom = (h, sim, m, { w, c, P, rk }) => {
  const r = 5.2 + 0.25 * rk;
  if (h.fxOk()) c.burst(FX.RING, LIGHT, h.x, h.y + 0.06, h.z, r * 0.7, 0.6, 0.6, { alpha: 0.6, ease: 1 });
  riff(h, sim, 1.4, 2, LIGHT, 0.62, () => {
    for (const d of [0, 0.3]) w.later(d, () => {
      if (h.dead) return;
      w.blast(h, h.x, h.z, h.y, r, 10 * P, { kind: 'bash', poise: 90, shove: 8, stun: 0.5, elem: LIGHT });
      if (h.fxOk()) {
        c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.5, r * 0.7, 0.45, { light: d ? 0 : 14, lightR: 8 }); c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.3, r * 0.5, 0.45);
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + d; waves(c, h.x + Math.sin(a) * 0.6, h.y + 0.08, h.z + Math.cos(a) * 0.6, a, r * 0.7, LIGHT, 0.45); }
        hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.6);
      }
    });
  }, 0.5);
};
// Four strokes, each quicker and each note bigger than the last, the ground rung wider under him with every one: the
// fourth is the great wheeling strum, a note the size of a door, and it goes through everything and throws it back.
CAST.crescendo = (h, sim, m, { w, c, P, yaw }) => {
  h.yaw = h.faceYaw = yaw;
  const at = [0.3, 0.75, 1.15, 1.75], size = [0.2, 0.35, 0.5, 0.8];
  h.tune = null;
  h.playLute(1.2, 0, { elem: LIGHT });
  h.hold = Math.max(h.hold, 2.0); h.holdFace = yaw; h.gcd = Math.max(h.gcd, 2.2); h.shotCd = Math.max(h.shotCd, 2.2);
  // (The last stroke is the arm's whole circle, begun so it comes down through the strings as the fourth note leaves.)
  w.later(1.18, () => { if (!h.dead) { h.tune = null; h.playLute(0.95, 2, { elem: LIGHT, rate: 0.7 / (0.95 * 0.57) }); } });
  at.forEach((t, i) => w.later(t, () => {
    if (h.dead) return;
    const last = i === 3;
    if (h.tune && !last) h.tune.rate = 1 + i * 0.3;
    if (h.fxOk()) { c.burst(FX.RING, LIGHT, h.x, h.y + 0.05, h.z, 0.4, 1.2 + i * 0.9, 0.35, { alpha: 0.5 + i * 0.15 }); if (last) hfx(sim, HFX.THUD, h.x, h.y, h.z, 0.5); }
    if (E.fightable(m)) note(h, sim, m, { dmg: (5 + i * 4) * P, v: 13 + i * 2, pierce: last ? true : 2, elem: LIGHT, glyph: i % 2 ? GLYPHS.CROTCHET : GLYPHS.NOTE, big: size[i], r: 0.4 + i * 0.25, life: 1.6, homing: 2, poise: last ? 100 : 30 + i * 15, o: last ? { shove: 7, stun: 0.6, elem: LIGHT } : { elem: LIGHT } });
  }));
};
// The last number, and he stands to all of it: lights of every colour sent up off the lute one after another, each
// bursting over them in sparks and notes, somewhere new and higher or lower than the last; and then all of it at once.
CAST.grand_finale = (h, sim, m, { w, c, P, rk }) => {
  const cx = m.x, cz = m.z;
  h.tune = null;
  h.playLute(2.5, 2, { rainbow: true, elem: LIGHT, rate: 2.2 });
  h.hold = 2.9; h.holdFace = dirTo(h, m); h.gcd = 3.2; h.shotCd = 3;
  for (let i = 0; i < 6; i++) w.later(0.3 + i * 0.26, () => {
    if (h.dead) return;
    const a = i * 2.4 + rand(-0.3, 0.3), r = 1 + (i % 3) * 1.1, x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r, y = sim.world.height(x, z) + 2.4 + (i % 3) * 0.8, e = RAINBOW[(i * 3) % RAINBOW.length];
    const x0 = h.luteT ? h.luteT[0] : h.x, y0 = h.luteT ? h.luteT[1] : h.y + 1.1, z0 = h.luteT ? h.luteT[2] : h.z, T = 0.22;
    // (Up off the strings in a streak, and it bursts where it gets to.)
    zone(w, h, T, (cc, q) => { const u = q.t / T, px = x0 + (x - x0) * u, py = y0 + (y - y0) * u + Math.sin(u * Math.PI) * 1.2, pz = z0 + (z - z0) * u; cc.fx(FX.ORB, e, px, py, pz, 0.12, 0, 1, 0, 0, 1, 5, 4); const L = Math.hypot(x - x0, y - y0, z - z0) || 1; cc.fx(FX.TRAIL, e, px, py, pz, 0.08, (x0 - x) / L, (y0 - y) / L, (z0 - z) / L, 1.2, 0.7); }, null, () => {
      if (h.dead) return;
      w.blast(h, x, z, y - 2.4, 1.8, 8 * P, { kind: 'burn', poise: 30, quiet: true, elem: e });
      if (!h.fxOk()) return;
      c.burst(FX.FLARE, e, x, y, z, 0.3, 0.9, 0.2, { light: 12, lightR: 8 });
      c.burst(FX.GLYPH, e, x, y, z, 0.3, 1.2, 0.3, { ay: 0, len: rand(0, TAU), extra: GLYPHS.SPARK });
      for (let k = 0; k < 12; k++) { const q = k * 0.524, up = rand(-0.2, 0.7); drift(w, h, x, y, z, Math.sin(q) * 3.4, up * 3 - 1, Math.cos(q) * 3.4, k % 3 === 0 ? GLYPHS.NOTE : k % 3 === 1 ? GLYPHS.STAR4 : GLYPHS.CROTCHET, RAINBOW[(i + k) % RAINBOW.length], 0.17, 0.75, rand(-4, 4)); }
      hfx(sim, HFX.PLUCK, x, y, z, SCALE[(i * 2) % SCALE.length] + 12, 0.6);
    });
  });
  w.later(2.1, () => {
    if (h.dead) return;
    const y = sim.world.height(cx, cz), r = 4.2 + 0.2 * rk;
    w.blast(h, cx, cz, y, r, 26 * P, { kind: 'bash', poise: 100, stun: 1, shove: 6, elem: LIGHT });
    if (h.fxOk()) {
      c.burst(FX.FLARE, LIGHT, cx, y + 1, cz, 0.6, 2.4, 0.25, { light: 22, lightR: 10 });
      c.burst(FX.COLUMN, LIGHT, cx, y, cz, 5, 8, 0.6, { len: 2.4 });
      [LIGHT, ARCANE, FIRE].forEach((e, i) => c.burst(FX.RING, e, cx, y + 0.05, cz, 0.5, r * 0.8 - i * 0.9, 0.5 + i * 0.1));
      for (let k = 0; k < 16; k++) { const q = k * 0.393; drift(w, h, cx + Math.sin(q) * r * 0.5, y + rand(3, 5), cz + Math.cos(q) * r * 0.5, Math.sin(q) * 1.2, -rand(1.5, 3), Math.cos(q) * 1.2, k % 3 ? GLYPHS.NOTE : GLYPHS.STAR6, RAINBOW[k % RAINBOW.length], 0.28, 1.1, rand(-3, 3)); }
      hfx(sim, HFX.THUD, cx, y, cz, 1); for (const n of [0, 4, 7, 12]) hfx(sim, HFX.PLUCK, cx, y + 1, cz, n, 0.7);
    }
  });
  // (And a bow of sorts: both arms up, as the last of it comes down.)
  w.later(2.55, () => { if (!h.dead && !h.swing && !h.jump) { h.tune = null; h.startSwing('LP_cheer', 1.0, [], () => {}, { still: true, from: 0.09, end: 0.15, hold: [0.13, 0.4] }); } });
};
