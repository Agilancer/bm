// The Hollow Playhouse: the sixth party dungeon, in the Gallowswood by the Twisted Grove, for a party of level 13 and up. A
// company of players wintered in the wood, in a house they built for the purpose, and gave one play all winter to
// whoever came. Nobody who came went home. The company is still in rehearsal: the Dollmaker who dressed them has been
// making more of them ever since, out of the audience.
//
// Its shape is a theatre's, and it's walked the way a theatre is used. Front of house: the foyer (the doors of the House
// are chained), round by the cloakroom at its side, and up the Gallery of Faces. Then the House itself, the stalls full
// and the stage dark, with the Wardrobe off its cross-aisle to one side and the Property Store to the other. The
// Leading Man won't come on undressed: the Seamstress in the Wardrobe has to die first (`needs`), and then the stage is
// lit, and the Dollmaker won't leave her box while he's still on (`needs` again). There are two ways onto it: up over the footlights, or round through the Property Store and the green room and
// on from the wing, as a player would. Backstage after that: the fly stair up from the green room, the nursery, and
// the Dollmaker's attic, a long roof-space over the back of the house.
// Three bosses: the Seamstress (she ties her threads to you: put a dress form between you and her), the Leading Man (the
// house lights go down three times, an act each: stay in his spotlight as he walks the boards), and the Dollmaker (when
// the music stops, stand still).
//
// This is its layout only, as plain data: src/core/dungeon.js makes the field of it (a castle's shell: straight walls,
// level floors), src/core/delve-build.js builds what's seen (plaster and board, not stone; plum cloth; candles),
// src/sim/delve-fights.js has the fights. Everything is local: x east, z south of the way in. Rooms and passages keep
// to even metres.
//
// Nobody's letter is on any of it (README "The two sides"): no red of his, none of the other's gilt. Players' plum.
import { R } from './delve-lay.js';

const rooms = [
  R('ph_foyer', 'the Foyer', 0, -2, 8, 12, 0, 9, { rock: 'ashlar', foot: 'course', ground: 'flags' }),
  R('ph_cloak', 'the Cloakroom', 24, -4, 10, 10, 0, 7, { ground: 'flags' }),
  R('ph_gallery', 'the Gallery of Faces', 0, -54, 6, 28, 0, 10, { rock: 'wall_17', foot: 'dark:wood' }),
  R('ph_house', 'the House', 0, -120, 18, 28, 0, 15, { fires: 14 }),
  R('ph_wardrobe', 'the Wardrobe', -50, -120, 18, 18, 0, 12, { rock: 'cloth_oat', foot: 'dark:wood' }),
  R('ph_props', 'the Property Store', 44, -120, 14, 14, 0, 9, { rock: 'course', foot: 'block', ground: 'stone' }),
  R('ph_stage', 'the Stage', 0, -168, 20, 14, 1, 16, { fires: 0, rock: 'dark:wood', foot: 'dark:wood' }),
  R('ph_green', 'the Green Room', 36, -168, 10, 10, 1, 8, { rock: 'mire:wall_13', foot: 'dark:wood' }),
  // (The fly stair climbs eight metres going north: its floor is a slope, the steps are laid on it.)
  R('ph_stair', 'the Fly Stair', 36, -200, 6, 18, 5, 12, { tz: -8 / 36, fires: 12, rock: 'course', foot: 'block', ground: 'stone' }),
  R('ph_nursery', 'the Nursery', 36, -240, 12, 14, 9, 9, { rock: 'pale:wall_13', ground: 'pale:wood' }),
  R('ph_attic', "the Dollmaker's Attic", -10, -240, 28, 14, 9, 8, { fires: 12, rock: 'wood', foot: 'dark:wood', ground: 'dark:wood' }),
];

// Passages: w is half the width, h the height.
const tunnels = [
  // Out of the foyer by its side door, through the cloakroom, and round the corner to the foot of the Gallery.
  { pts: [[8, -4], [14, -4]], w: 3, h: 6 },
  { pts: [[18, -14], [18, -28], [6, -28]], w: 3, h: 6 },
  { pts: [[0, -82], [0, -92]], w: 4, h: 8 },
  // The proscenium: the whole front of the stage, open to the House.
  { pts: [[0, -148], [0, -154]], w: 11, h: 11 },
  // The cross-aisle's two doors: the Wardrobe, the Property Store.
  { pts: [[-18, -120], [-32, -120]], w: 3, h: 6 },
  { pts: [[18, -120], [30, -120]], w: 3, h: 6 },
  // The players' way round: out of the back of the Store, into the green room, and on from the wing.
  { pts: [[40, -134], [40, -158]], w: 3, h: 6 },
  { pts: [[20, -168], [26, -168]], w: 3, h: 6 },
  { pts: [[36, -178], [36, -182]], w: 3, h: 6 },
  { pts: [[36, -218], [36, -226]], w: 3, h: 6 },
  { pts: [[24, -240], [18, -240]], w: 3, h: 6 },
  // Where the understudies come on from: the far wing, and the door upstage (dead ends off the stage).
  { pts: [[-20, -168], [-26, -168]], w: 2, h: 4, dead: true, door: 'ph_stage' },
  { pts: [[0, -182], [0, -188]], w: 2, h: 4, dead: true, door: 'ph_stage' },
  // The toy cupboards the dolls come out of, down both sides of the attic (dead ends off it).
  { pts: [[-18, -254], [-18, -259]], w: 2, h: 4, dead: true, door: 'ph_attic' },
  { pts: [[6, -254], [6, -259]], w: 2, h: 4, dead: true, door: 'ph_attic' },
  { pts: [[-6, -226], [-6, -221]], w: 2, h: 4, dead: true, door: 'ph_attic' },
];

// The plinths down the Gallery of Faces, where the company's faces stand: east and west by turns.
const PLINTHS = [[-4, -42], [4, -50], [-4, -58], [4, -66], [-4, -74]];
// The dress forms in the Wardrobe, in a ring about its middle (where the Seamstress stands to tie her threads): what
// there is to put between you and her.
export const DRESS_FORMS = [[-61, -113.5], [-39, -113.5], [-61, -126.5], [-39, -126.5], [-50, -131.5], [-50, -107.5]];
// Where the Leading Man walks while the lights are down: his marks on the boards, in the order he takes them.
export const STAGE_MARKS = [[-11, -162], [11, -174], [11, -162], [-11, -174], [0, -168]];
// Floor raised a step: the Dollmaker's end of the attic.
const daises = [{ x: -31, z: -240, hx: 6, hz: 13, dy: 0.5 }];

// ---- what stands in the rooms (src/core/delve-build.js draws each kind) ----------------------------------------------------
const props = [];
const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
// The foyer: the box office, playbills on the walls, a chandelier that's still lit; the doors of the House, chained.
add('counter', -5, -6, { hx: 0.6, hz: 2.6, solid: true }); add('playbill', -7.9, 0, { yaw: Math.PI / 2 }); add('playbill', -7.9, -9, { yaw: Math.PI / 2 }); add('playbill', 7.9, 3, { yaw: -Math.PI / 2 });
add('chandelier', 0, -4, { up: 6 }); add('carpet', 0, -2, { hx: 2, hz: 11, layer: 'spore:cloth_oat' });
add('housedoors', 0, -13.7, { w: 2.6, h: 5 });
// The cloakroom: rails of coats nobody came back for, hats, a heap of boots.
for (const z of [-9, -4, 1]) { add('coatrail', 18, z, { hx: 2.4, yaw: 0 }); add('coatrail', 30, z, { hx: 2.4, yaw: 0 }); }
add('heap', 31, 3.5, { r: 1, layer: 'dark:cloth_oat' }); add('crates', 17, 3.5);
// The passage round to the Gallery: the season's bills, pasted one over another.
add('playbill', 20.9, -19, { yaw: -Math.PI / 2 }); add('playbill', 20.9, -24, { yaw: -Math.PI / 2 }); add('playbill', 12, -30.9, { yaw: 0 });
// The Gallery of Faces: the company on their plinths, a runner between, their portraits behind them.
PLINTHS.forEach(([x, z]) => { add('plinth', x, z); add('portrait', x < 0 ? -5.9 : 5.9, z, { yaw: x < 0 ? Math.PI / 2 : -Math.PI / 2 }); });
add('carpet', 0, -54, { hx: 1.5, hz: 27, layer: 'spore:cloth_oat' });
// The House: the stalls, two blocks of benches at the back and two at the front with the aisle between, and the wide
// cross-aisle in the middle where the side doors are; boxes on the walls by the stage.
for (const z of [-102, -107, -133, -138, -143]) { add('pew', -9, z, { hx: 5.5, hz: 0.6, solid: true }); add('pew', 9, z, { hx: 5.5, hz: 0.6, solid: true }); }
add('carpet', 0, -120, { hx: 2, hz: 27, layer: 'spore:cloth_oat' });
for (const z of [-104, -136]) add('chandelier', 0, z, { up: 10 });
for (const z of [-112, -128]) { add('box', -17.2, z, { yaw: Math.PI / 2 }); add('box', 17.2, z, { yaw: -Math.PI / 2 }); }
// The proscenium: the curtain drawn up and to the sides, the footlights along the stage's lip.
add('curtain', -9.6, -151, { w: 1.3, h: 11 }); add('curtain', 9.6, -151, { w: 1.3, h: 11 }); add('swag', 0, -151, { w: 10, up: 9.5 });
for (let x = -9; x <= 9; x += 3) add('footlight', x, -154.6);
// The stage: a painted wood on flats at the back, rigging from the flies; clear boards between, and his marks on them.
add('backdrop', -8, -181.2, { w: 6.5, h: 10 }); add('backdrop', 8, -181.2, { w: 6.5, h: 10 }); add('flat', -16, -177, { yaw: 0.5, w: 2.4, h: 6 }); add('flat', 16, -159, { yaw: 2.6, w: 2.4, h: 6 });
add('rigging', -14, -160, { up: 12 }); add('rigging', 14, -178, { up: 12 }); add('rigging', -4, -179, { up: 13 });
STAGE_MARKS.forEach(([x, z]) => add('stagemark', x, z));
// The Wardrobe: dress forms in a ring, the long cutting table, rails of costume, bolts of cloth.
DRESS_FORMS.forEach(([x, z]) => add('dressform', x, z, { r: 0.75, solid: true }));
add('table', -50, -136.6, { hx: 6, hz: 1, solid: true });
for (const z of [-132, -120, -108]) add('coatrail', -66.6, z, { hx: 2.6, yaw: Math.PI / 2 });
add('bolts', -34, -105); add('bolts', -34, -135); add('mirror', -67.6, -126, { yaw: Math.PI / 2 }); add('chandelier', -50, -120, { up: 8 });
// The Property Store: a forest in pieces, thrones, swords in barrels: everything a play needs. A door at the back.
for (const [x, z] of [[36, -111], [52, -111]]) add('shelf', x, z, { hx: 0.6, hz: 3, h: 4.5, solid: true });
add('flat', 33, -130, { yaw: 0.3, w: 2.2, h: 5 }); add('flat', 54, -131, { yaw: -0.4, w: 2.2, h: 5 }); add('proptree', 47, -131); add('proptree', 53, -124);
add('crates', 55, -112); add('barrels', 33, -122); add('rack', 57.5, -118, { yaw: -Math.PI / 2 }); add('seat', 44, -107.6, { hx: 1.2, hz: 1, solid: true, stone: 'wood', cloth: 'spore:cloth_oat' });
// The green room: mirrors with candles round them, a table of paint pots, a couch.
for (const z of [-174, -168, -162]) { add('mirror', 45.6, z, { yaw: -Math.PI / 2 }); add('candles', 44.4, z + 1.6, { up: 0.9 }); }
add('table', 43.6, -168, { hx: 0.7, hz: 8, solid: true }); add('bunk', 30, -160, { hx: 2.2, hz: 1.1, solid: true, cloth: 'spore:cloth_oat' });
// The fly stair: ropes and counterweights down the well of it.
add('rigging', 32, -192, { up: 9 }); add('rigging', 40, -208, { up: 9 }); add('carpet', 36, -200, { hx: 1.5, hz: 17, layer: 'dark:cloth_oat' });
// The nursery: cots in two rows, a rocking horse, dolls sat along the walls.
for (const z of [-250, -242, -234]) { add('cot', 28, z); add('cot', 44, z); }
add('horse', 36, -248); add('dollshelf', 47.4, -230, { yaw: -Math.PI / 2 }); add('dollshelf', 24.6, -250, { yaw: Math.PI / 2 }); add('candles', 36, -232);
// The Dollmaker's attic: a long roof-space, posts down it, limbs hung up to dry; her bench and her music box at the far end.
add('table', -30, -251.4, { hx: 5, hz: 1, solid: true }); add('musicbox', -30, -240, { r: 1.3 });
for (const x of [-10, 6]) for (const z of [-248, -232]) add('column', x, z, { r: 0.6, solid: true, wood: true });
for (const x of [-6, 14]) add('limbs', x, -252.6, { up: 6.6 });
add('dollshelf', -18, -226.6, { yaw: 0 }); add('dollshelf', 8, -226.6, { yaw: 0 });
for (const x of [-20, 0, 12]) add('chandelier', x, -240, { up: 6 });

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const COMPANY = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const PATRONS = ['possessed_man_1', 'possessed_man_2', 'possessed_woman_1', 'possessed_woman_2'];
const DOLLS = ['zombie_boy_1', 'zombie_boy_2', 'zombie_boy_3', 'zombie_girl_1', 'zombie_girl_2'];
const PROMPTERS = ['necromancer_2', 'necromancer_3'];
const HANDS = ['night_demon_black'];
const CHINA = ['Porcelain', 'Porcelain', 'Ashen'];
// (tough: a pack's own, where the delve's doesn't suit. ai: how it fights, if not as its kind does: the company on their
// plinths stand still while you look at them, as their kind does; the rest of them come on regardless.)
const packs = [
  { key: 'ph_cloak', room: 'ph_cloak', pick: DOLLS, n: 6, pal: CHINA, tough: { hp: 23, damage: 3.2 } },
  { key: 'ph_gallery', room: 'ph_gallery', pick: COMPANY, n: 5, pal: ['Porcelain'], spots: PLINTHS.map(([x, z]) => [x, z]), wake: 40 },
  // (The audience, got up from where the play left them and stood at the ends of their rows, on the aisle: they turn to
  // look as you come down it. A bench between you and one of them hides you from it, so none stands deep in a row. The back
  // row, and thirty-one metres on the front rows, with the prompters in their corners by the stage.)
  { key: 'ph_house_back', room: 'ph_house', pick: PATRONS, n: 5, pal: ['Ashen', 'Base'], at: [0, 14], spots: [[-2.6, -104.5], [2.6, -104.5], [-8, -104.5], [8, -104.5], [2.6, -109.5]] },
  { key: 'ph_house_front', room: 'ph_house', pick: PATRONS, n: 5, elite: PROMPTERS, pal: ['Ashen', 'Porcelain'], at: [0, -16], spots: [[-16, -145.5], [-2.6, -135.5], [2.6, -135.5], [-2.6, -140.5], [2.6, -140.5]] },
  { key: 'ph_props', room: 'ph_props', pick: COMPANY, n: 4, elite: HANDS, pal: ['Porcelain', 'Sable'], ai: 'melee', at: [0, 2], r: 4 },
  { key: 'ph_green', room: 'ph_green', pick: COMPANY.concat(PATRONS), n: 4, pal: CHINA, ai: 'melee', at: [2, -6], r: 3, more: { n: 2, pick: DOLLS, from: [36, -186], when: 0.5 } },
  { key: 'ph_stair', room: 'ph_stair', pick: DOLLS, n: 5, pal: CHINA, tough: { hp: 23, damage: 3.2 }, spots: [[34, -203], [38, -206], [34, -209], [38, -212], [36, -215]] },
  { key: 'ph_nursery', room: 'ph_nursery', pick: DOLLS, n: 6, elite: HANDS, pal: CHINA, tough: { hp: 14, damage: 2.6 } },
];
const bosses = [
  { key: 'seamstress', room: 'ph_wardrobe', name: 'The Seamstress', models: ['ph_seamstress'], pal: ['Porcelain'], hp: 8600, damage: 62, reach: 3.0, loot: 8, cue: 'sea_dead' },
  { key: 'leadingman', room: 'ph_stage', name: 'The Leading Man', models: ['ph_lead'], pal: ['Gravegilt'], hp: 10000, damage: 58, reach: 3.0, loot: 8, needs: ['seamstress'], shut: 'led_shut' },
  { key: 'dollmaker', room: 'ph_attic', name: 'The Dollmaker', models: ['ph_dollmaker'], pal: ['Porcelain'], hp: 13000, damage: 72, reach: 2.8, loot: 0, at: [-12, 0], needs: ['leadingman'], shut: 'dol_shut' },
];
const warnings = {
  sea_open: 'The Seamstress. When she ties her threads to you, put a dress form between you and her to cut them.',
  sea_needles: 'Needles, three flights of them! Step across each.',
  sea_stitch: 'She stitches the floor! Out of the lines.',
  sea_shears: 'The shears! Out of the arc.',
  sea_pins: 'Pins rain down! Out of the circles.',
  sea_hem: 'A hem of needles comes on! Find the gap.',
  sea_threads: 'THE SEAMSTRESS TIES HER THREADS! She stands in the middle to reel: if one is on you, get a dress form between you and her.',
  sea_cut: 'A thread is cut!',
  sea_reel: 'She reels one of you in!',
  sea_forms: 'Her fitters step out from among the rails! Kill them.',
  sea_dead: 'The Seamstress is dead. Out in the House, a curtain goes up.',
  sea_turn: 'The Seamstress turns on you! Get behind the tank, or out of her reach, till she lets go.',
  sea_enrage: 'The Seamstress is enraged!',
  led_shut: 'The stage is dark. He will not come on undressed: someone in the Wardrobe is keeping him.',
  led_open: 'The Leading Man takes the stage. When the house lights go down, the only light is his: stay in it, and go where he goes.',
  led_bow: 'He bows! Out of the arc.',
  led_speech: 'A speech! His words come after you: keep moving, they tire.',
  led_curtain: 'The curtain comes down the stage! Jump its hem as it reaches you.',
  led_exit: 'He exits, pursued: out of the line!',
  led_roses: 'Roses from the gods! Out of the circles: they burn.',
  led_dark: 'THE HOUSE LIGHTS GO DOWN! Into his spotlight, and walk the boards with him!',
  led_lights: 'The lights come up.',
  led_under: 'His understudies come on from the wings! Kill them.',
  led_turn: 'The Leading Man turns on you! Get behind the tank, or out of his reach, till he lets go.',
  led_enrage: 'The Leading Man is enraged!',
  dol_shut: 'The attic is empty, and the music box is shut. She will not come down while her play is still running: the stage first.',
  dol_open: 'The Dollmaker. When her music box runs down, STAND STILL until it plays again: what moves, she takes.',
  dol_strings: 'Strings sweep the room! Keep ahead of them, or get out past their ends.',
  dol_march: 'Tin soldiers march! Out of their way.',
  dol_gaze: 'She looks at you! Out from in front of her.',
  dol_rings: 'The music box chimes! Out of the rings, then step in behind.',
  dol_wind: 'The music slows... out of the chimes under you, and be ready to stop.',
  dol_still: 'THE MUSIC STOPS! Stand still! Do not take a step!',
  dol_play: 'The music plays again. Move!',
  dol_feint: 'The music slows... and picks up again! Move: out of the rings!',
  dol_dolls: 'Dolls climb out of the cupboards! Kill them.',
  dol_turn: 'The Dollmaker turns on you! Get behind the tank till she looks away.',
  dol_enrage: 'The Dollmaker is enraged: she will keep you all!',
};

export const PLAYHOUSE = {
  key: 'playhouse', tag: 'ph', name: 'The Hollow Playhouse', short: 'the Playhouse', x: 3100, z: 6200, y: -70, level: 13, style: 'castle',
  rooms, tunnels, daises, props, packs, bosses, warnings,
  turnWarn: { seamstress: 'sea_turn', leadingman: 'led_turn', dollmaker: 'dol_turn' },
  entry: { x: 0, z: 2.5, yaw: Math.PI }, exitIn: { x: 0, z: 5.4 }, exitOut: { x: -33.4, z: -240, yaw: Math.PI / 2 },
  // In the Twisted Grove (SITES.grove), facing its stone table.
  portal: { x: 3087, z: 4493, yaw: 1.08, r: 2.2 },
  last: 'dollmaker', tough: { hp: 10.5, damage: 2 }, pay: { xp: 3800, gold: 620 },
  names: { 'Haunted Mannequins': 'THE COMPANY', 'The Possessed': 'PATRON', 'Dead Children': 'DOLL', 'Night Paralysis Demons': 'STAGEHAND', Necromancers: 'PROMPTER' },
  look: { wall: 'wall_13', foot: 'wood', floor: 'wood', roof: 'dark:wood', flame: 'flame', banner: 'spore:cloth_oat', light: [1, 0.72, 0.42], fire: [1, 0.76, 0.46], every: 9, high: 2.6, glow: 1.6, lit: true },
  words: { enter: 'The Hollow Playhouse. One play, all winter, to whoever came. The company is still in rehearsal.', clear: 'The Hollow Playhouse is cleared. The Dollmaker is dead!', wipe: 'Your party falls... and wakes in the Foyer.' },
};
