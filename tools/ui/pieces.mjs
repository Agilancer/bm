// The interface's art kit: every picture the game would like painted, sheet by sheet. This is the one list.
//
//   node tools/ui/build_kit.mjs      writes tools/ui/spec.json from it (what import_kit.py and the kit's own check script
//                                    read), renders a template for every sheet, and zips the kit
//
// A sheet is one picture ChatGPT makes: 1024 x 1024, or 1536 x 1024 (the two sizes it can make that suit). What's on it:
//   grid   so many cells across and down, one picture in each (icons; the round buttons and rings, four to a sheet)
//   boxes  named boxes of different shapes (the plates, the bars)
//   nine   one frame filling the sheet, which the game cuts in nine: corners kept, sides drawn out
//   full   the whole sheet is the picture (the app's icon)
// Each picture has a name the game knows it by (src/ui/skin.js), which group it's listed under in the manifest (pieces,
// icons, spells, goods), and the size it's kept at.
import { SPELLS } from '../../src/sim/spells.js';
import { STARTERS, TREES } from '../../src/sim/skills.js';
import { COLOURS } from '../../src/ui/spellglyphs.js';
import { boxes, TOP } from '../../src/ui/thumbs.js';

const ICON = 192;      // an icon as kept (shown at 20 to 60 px, on screens up to three pixels to one)
const SPELL = 224;

const icons = (names) => names.map(([name, what]) => ({ name, group: 'icons', what }));
const goods = (names) => names.map(([name, what]) => ({ name, group: 'goods', what }));
const empty = { name: null };

const ACTIONS = icons([
  ['staff', 'A wizard\'s staff held at a slant, its head a glowing orb throwing off three small sparks. The main attack.'],
  ['guard', 'A kite shield, front on, plain steel face with a raised rim and a single boss. No device on it.'],
  ['jump', 'A pair of worn leather boots leaving the ground, a small puff of dust under them, an upward sweep above.'],
  ['dodge', 'A cloaked figure in a low sideways lunge with speed streaks trailing behind. A quick sidestep.'],
  ['sprint', 'A single leather boot in mid stride, leaning forward, three speed streaks trailing behind it. Running.'],
  ['cast', 'An open hand, palm up, with a four-pointed star of light bursting above it. Cast a spell.'],
  ['take', 'A gloved hand reaching down to grasp, fingers spread. Pick something up.'],
  ['talk', 'Two overlapping speech scrolls (curled parchment ribbons), blank. Talk to someone.'],
  ['open', 'A heavy wooden door with iron bands, standing ajar, warm light spilling through the gap.'],
  ['shut', 'The same heavy wooden door with iron bands, closed, a ring handle on it.'],
  ['locked', 'An old iron padlock, closed, with a keyhole. A locked door.'],
  ['pack', 'A traveller\'s leather backpack with a buckled flap and a bedroll strapped on top. The inventory.'],
  ['book', 'A thick closed spellbook with metal corners and a clasp, a four-pointed star gem set in its cover.'],
  ['journal', 'A rolled parchment scroll partly unrolled, with a quill pen lying across it. The quest journal.'],
  ['map', 'A folded parchment map with a dotted path ending at a small red diamond, one corner curling.'],
  ['menu', 'Three short horizontal iron bars stacked, each with a small rivet at both ends. The menu.'],
]);
const MENUS = icons([
  ['view1', 'A single open eye, heavy lidded, iris catching light. First-person view.'],
  ['view3', 'A small robed wizard figure seen from behind and above, pointed hat, staff in hand. Third-person view.'],
  ['close', 'Two short iron bars crossed on the diagonal, riveted where they meet (the one place in the set a crossed shape is wanted). Close.'],
  ['sort', 'Three small stacked chests, biggest at the bottom, smallest on top. Sort the pack.'],
  ['plus', 'A brass magnifying lens with a wooden handle, a bright four-pointed glint in its glass. Look closer.'],
  ['minus', 'The same brass magnifying lens, held further off and smaller in its cell, its glass dark and plain. Look from further away.'],
  ['centre', 'A brass compass rose with a needle, four points. Centre the map on yourself.'],
  ['resume', 'A right-pointing arrowhead of polished gold. Resume.'],
  ['save', 'A quill writing in an open book. Save the game.'],
  ['load', 'An open book with a ribbon bookmark and a page turning back. Load a game.'],
  ['settings', 'Two interlocking iron cogwheels. Settings.'],
  ['howto', 'A lit candle beside an open book. How to play.'],
  ['home', 'A small stone gatehouse with an arched doorway and a pointed roof. Main menu.'],
  ['gold', 'A small heap of plain gold coins, blank faces. Gold.'],
  ['quest', 'A gold four-pointed star with a small diamond at its centre. A quest marker.'],
  ['rotate', 'A hand-held slate tablet shown twice: upright and faint, then lying on its side and solid, a curved arrow between them. Turn the screen sideways.'],
]);
const SLOTS = icons([
  ['slot_head', 'A wizard\'s pointed hat, as a faint engraved silhouette. An empty head slot.'],
  ['slot_shoulders', 'A pair of shoulder guards on a short mantle, as a faint engraved silhouette.'],
  ['slot_neck', 'A pendant on a chain, as a faint engraved silhouette.'],
  ['slot_chest', 'A long tunic, sleeveless, as a faint engraved silhouette.'],
  ['slot_legs', 'A pair of trousers, as a faint engraved silhouette.'],
  ['slot_feet', 'A pair of boots, as a faint engraved silhouette.'],
  ['slot_ring', 'A plain finger ring with one small stone, as a faint engraved silhouette.'],
  ['slot_main', 'A tall staff standing upright, as a faint engraved silhouette. Fill the cell\'s height.'],
  ['slot_off', 'A kite shield, blank, as a faint engraved silhouette.'],
  ['slot_skull', 'A small plain human skull in profile, as a faint engraved silhouette. A spell focus the wizard carries.'],
]).concat([
  { name: 'mark_branch', group: 'spells', what: 'A small faceted diamond-shaped crystal, point up. Marks a branch of a spell.' },
  { name: 'mark_mastery', group: 'spells', what: 'A five-pointed star medal with a small gem at its centre. Marks a school\'s mastery.' },
  empty, empty, empty, empty,
]);
const GOODS = goods([
  ['bed', 'A simple wooden bed with a red blanket and a pale pillow. A night at the inn.'],
  ['ale', 'A wooden tankard banded with iron, foam on top.'],
  ['roll', 'A round bread roll with a scored top.'],
  ['loaf', 'A crusty loaf of bread on a board.'],
  ['dressing', 'A roll of linen bandage with a sprig of green herbs.'],
  ['candle', 'A lit tallow candle in a small holder.'],
  ['oil', 'A small stoppered flask of lamp oil, amber through green glass.'],
  ['grave_candle', 'A tall pale grave candle with wax runs, a soft pale flame.'],
  ['bone', 'A few old bones crossed in a small pile. A crafting material.'],
  ['iron', 'A stack of rough iron ingots with two nails. A crafting material.'],
  ['silk', 'Folded bolts of pale spider silk. A crafting material.'],
  ['wax', 'Three blocks of yellow beeswax. A crafting material.'],
  ['ember', 'A glowing orange ember crystal, hot at its heart. A crafting material.'],
  ['wingbell', 'A tiny silver bell with a swift\'s wing cast on its shoulder, hung on a violet thread. A charm.'],
  ['goatfoot', 'A small cloven hoof shod in iron, hung on a leather thong. A charm.'],
  ['glimmerstone', 'A shard of pale blue crystal bound in silver wire, faintly glowing. A charm.'],
]);

// The spells, a school to a sheet: its ten spells, then its emblem.
const EMBLEM = {
  fire: 'A single tall flame.', ice: 'A six-armed ice crystal.', earth: 'A rough standing stone with a crack.', arcane: 'A crescent moon with one star.',
  lightning: 'A forked lightning bolt.', utility: 'A radiant sun disc with short rays.',
};
const spellSheets = TREES.map((t) => {
  const cells = t.spells.map((n) => { const d = SPELLS[n.spell]; return { name: d.key, group: 'spells', what: `${d.name}. ${d.desc}`, colour: COLOURS[d.elem] }; });
  cells.push({ name: `school_${t.key}`, group: 'icons', what: `The emblem of the school of ${t.name}: ${EMBLEM[t.key]} Simple and bold, to sit on a tab.`, colour: COLOURS[t.elem] }, empty);
  return { id: `spells_${t.key}`, title: `Spells: ${t.name}`, priority: 'B', size: [1536, 1024], kind: 'grid', cols: 4, rows: 3, out: SPELL, cells, colour: COLOURS[t.elem],
    brief: `The ten spells of the school of ${t.name}, and its emblem. Every icon on this sheet is lit by and coloured with the school's own colour, ${COLOURS[t.elem]}, on the dark neutral ground of the style lock: one glowing magical effect in each cell, no hands, no figures, no frame or border round it (the game puts each in a round socket).` };
});

export const SHEETS = [
  { id: 'buttons', title: 'The round buttons', priority: 'A', size: [1024, 1024], kind: 'grid', cols: 2, rows: 2, out: 256, fill: true,
    brief: 'The bases of the buttons a thumb presses on a phone: a round boss, seen straight on, perfectly circular, filling its cell to the guide circle. The game draws an icon in the middle, so the middle is an empty, dark, slightly domed field. No icon, no gem in the centre.',
    cells: [
      { name: 'btn_round', group: 'pieces', what: 'The ordinary button, at rest: a blackened iron disc with a bronze-gold rim worked in fine filigree, four tiny garnet studs at the compass points of the rim, the centre a dark, slightly domed field.' },
      { name: 'btn_round_on', group: 'pieces', what: 'The same button, pressed or switched on: identical shape and rim, the rim brighter gold and the centre lit with a warm inner glow, the garnets alight.' },
      { name: 'btn_main', group: 'pieces', what: 'The big main-attack button, at rest: the same make but grander, a heavier double rim with eight garnet studs and small pointed finials at the four compass points (kept inside the guide circle), the centre a dark domed field.' },
      { name: 'btn_main_on', group: 'pieces', what: 'The same big button, pressed: identical shape, rim blazing gold, centre lit from within.' },
    ] },
  { id: 'icons_actions', title: 'Icons: what the thumbs do', priority: 'A', size: [1024, 1024], kind: 'grid', cols: 4, rows: 4, out: ICON, cells: ACTIONS,
    brief: 'Sixteen icons that sit on the round buttons. Pale bone-and-gold objects that read at a glance on a dark button at the size of a fingernail: one object each, bold silhouette, no frame, no background.' },
  { id: 'icons_menus', title: 'Icons: the menus', priority: 'A', size: [1024, 1024], kind: 'grid', cols: 4, rows: 4, out: ICON, cells: MENUS,
    brief: 'Sixteen more icons of the same family as the first sheet, for the top bar and the menus. Same make, same weight, same palette.' },
  { id: 'panel', title: 'The window frame', priority: 'A', size: [1024, 1024], kind: 'nine', slice: 192, out: 512, name: 'panel', group: 'pieces',
    brief: 'The frame of every window in the game (the pack, the spellbook, a conversation, the settings). One square frame filling the sheet edge to edge, seen straight on: a border of blackened iron with a bronze-gold inner bead, ornate corners with a small garnet stud in each, and a plain dark centre (near-black warm brown, very faint leather grain, no picture). The game cuts it in nine and stretches it: the four corners are kept as they are, so every ornament must stay inside the corner squares the template marks; the four sides between the corners must be plain, straight and the same all along their length; the centre must be even.' },
  ...spellSheets,
  { id: 'sockets', title: 'Sockets and the medal', priority: 'B', size: [1024, 1024], kind: 'grid', cols: 2, rows: 2, out: 256, fill: true,
    brief: 'Four round or square settings that things sit in, each filling its cell to the guide. Their centres are empty: the game draws what goes in them.',
    cells: [
      { name: 'slot_spell', group: 'pieces', what: 'A round socket a spell\'s icon sits in: a thin dark iron ring with a narrow bronze-gold inner bead, the centre a dark recessed well. Plainer and thinner-rimmed than the buttons.' },
      { name: 'slot_spell_on', group: 'pieces', what: 'The same socket, chosen: identical shape, its rim glowing pale gold-white.' },
      { name: 'slot_item', group: 'pieces', what: 'A square cell of the paper doll that a piece of gear sits in: a recessed dark square with a thin bronze bevel and tiny corner rivets, the centre empty. Square, filling the guide square.' },
      { name: 'medallion', group: 'pieces', what: 'The round medal that carries the player\'s level number: a thick bronze-gold ring with a plain channel round it (the game fills the channel to show progress) and a dark domed centre for the number. No number, no emblem.' },
    ] },
  { id: 'rings', title: 'The map\'s rim and the stick', priority: 'B', size: [1024, 1024], kind: 'grid', cols: 2, rows: 2, out: 320, fill: true,
    brief: 'Round pieces for the corner map and the left thumb\'s stick. Each fills its cell to the guide circle.',
    cells: [
      { name: 'ring_map', group: 'pieces', what: 'The rim of the round corner map: a ring only, its whole centre empty and transparent (the map shows through). Blackened iron with a bronze-gold inner bead and four small pointed finials at the compass points, the top one a little larger. The ring is thin: its inner edge is at the inner guide circle.' },
      { name: 'stick_base', group: 'pieces', what: 'The base the thumbstick moves in: a wide, shallow, mostly see-through dark dish with a thin bronze rim and four faint tick marks at the compass points. Understated: it sits over the game\'s picture.' },
      { name: 'stick_nub', group: 'pieces', what: 'The thumbstick\'s knob: a domed disc of pale polished bone with a bronze collar, lit from the top left.' },
      empty,
    ] },
  { id: 'plates', title: 'Buttons, tabs and the rule', priority: 'B', size: [1536, 1024], kind: 'boxes',
    brief: 'The flat rectangular pieces. Each is drawn straight on, filling its box. The game cuts each plate in nine and stretches it to any width, so the ends carry the ornament and the long middle is plain and even. No words on any of them.',
    boxes: [
      { name: 'button', group: 'pieces', rect: [48, 48, 696, 232], out: [384, 128], what: 'A wide button plate, at rest: dark iron with a bronze-gold border, a small ornament at each end, plain dark middle.' },
      { name: 'button_on', group: 'pieces', rect: [792, 48, 696, 232], out: [384, 128], what: 'The same plate, pressed or under the pointer: same shape, border bright gold, middle faintly lit.' },
      { name: 'tab', group: 'pieces', rect: [48, 344, 696, 232], out: [384, 128], what: 'A tab, not chosen: like the button plate but flatter and dimmer, its top corners rounded.' },
      { name: 'tab_on', group: 'pieces', rect: [792, 344, 696, 232], out: [384, 128], what: 'The same tab, chosen: brighter border, warm lit middle, a thin gold line along its bottom edge.' },
      { name: 'rule', group: 'pieces', rect: [48, 664, 1440, 120], out: [720, 60], keep: true, what: 'A dividing rule that sits under a window\'s title: a thin gold line fading to nothing at both ends, with one small diamond-shaped garnet at its middle.' },
    ] },
  { id: 'bars', title: 'The bars', priority: 'B', size: [1536, 1024], kind: 'boxes',
    brief: 'The player\'s life, mana and breath, and a foe\'s life. First the trough they sit in, then four fills. Each fill is a long strip of one glowing substance, even from end to end (the game crops it to show how much is left), lit along its top edge. No end caps on the fills, no numbers.',
    boxes: [
      { name: 'bar_frame', group: 'pieces', rect: [48, 40, 1440, 216], out: [720, 108], what: 'The trough: a long dark iron channel with a bronze-gold border and a small ornate cap at each end, its middle plain and even (it is stretched). Empty inside.' },
      { name: 'bar_life', group: 'pieces', rect: [48, 296, 1440, 136], out: [360, 34], keep: true, what: 'Life: deep blood red, glassy, a brighter band along the top.' },
      { name: 'bar_mana', group: 'pieces', rect: [48, 472, 1440, 136], out: [360, 34], keep: true, what: 'Mana: luminous sapphire blue, like lit water.' },
      { name: 'bar_stamina', group: 'pieces', rect: [48, 648, 1440, 136], out: [360, 34], keep: true, what: 'Breath: pale straw gold.' },
      { name: 'bar_foe', group: 'pieces', rect: [48, 824, 1440, 136], out: [360, 34], keep: true, what: 'A foe\'s life: dark crimson with an ember glow, harsher than the player\'s red.' },
    ] },
  { id: 'paper', title: 'Parchment', priority: 'C', size: [1024, 1024], kind: 'nine', slice: 192, out: 512, name: 'paper', group: 'pieces',
    brief: 'A sheet of old parchment for letters and pages the player reads: one square sheet filling the picture, seen straight on, warm cream-tan, darker and a little worn toward its edges, slightly ragged outline, even and blank across the middle. Cut in nine like the window frame: keep any tears, stains or curled corners inside the corner squares, and keep the sides and the middle plain.' },
  { id: 'icons_slots', title: 'Icons: empty gear slots, and two marks', priority: 'C', size: [1024, 1024], kind: 'grid', cols: 4, rows: 4, out: ICON, cells: SLOTS,
    brief: 'Ten faint silhouettes that show what goes in an empty gear slot, and two small marks for the spellbook. The silhouettes are dim, single-colour engravings (dull bronze, low contrast), not full paintings: they must not look like an item is there. Leave the last four cells empty.' },
  { id: 'icons_goods', title: 'Icons: goods, materials and charms', priority: 'C', size: [1024, 1024], kind: 'grid', cols: 4, rows: 4, out: ICON, cells: GOODS,
    brief: 'Sixteen small things bought, gathered and carried, painted in full colour as items: one object each, no frame, no background.' },
  { id: 'app_icon', title: 'The app\'s icon', priority: 'C', size: [1024, 1024], kind: 'full', out: 512, name: 'app_icon', group: 'pieces', opaque: true,
    brief: 'The icon on a phone\'s home screen. A full square picture with no transparency and no rounded corners (the phone rounds them): a great bronze church bell hanging in darkness, lit from below by a faint ember glow, on a near-black background with a subtle vignette. Keep the bell inside the middle 70% of the square (phones crop the edges). No letters, no title, no frame.' },
];

/** Everything flattened: [{ sheet, name, group, out }] for whatever has a name. */
export function pieces() {
  const out = [];
  for (const s of SHEETS) {
    if (s.kind === 'grid') for (const c of s.cells) if (c.name) out.push({ sheet: s.id, name: c.name, group: c.group, out: [s.out, s.out] });
    if (s.kind === 'boxes') for (const b of s.boxes) out.push({ sheet: s.id, name: b.name, group: b.group, out: b.out });
    if (s.kind === 'nine' || s.kind === 'full') out.push({ sheet: s.id, name: s.name, group: s.group, out: [s.out, s.out] });
  }
  return out;
}

export const FORMAT = 'bm-ui-kit/1';

// Where things sit on a phone (src/ui/thumbs.js), each place with the pieces that go there: for the kit's check to put a
// phone's screen together from whatever has been painted.
export const PHONE = [844, 390];
export function hudLayout() {
  const first = STARTERS.slice(0, 6).map((i) => SPELLS[i].key);
  const ICON_OF = { bAttack: ['btn_main', 'staff', 0.5], bDodge: ['btn_round', 'dodge'], bWide: ['btn_round', 'guard'], bJump: ['btn_round', 'jump'], bTake: ['btn_round_on', 'take'],
    bSprint: ['btn_round', 'sprint'], bPause: ['btn_round', 'menu'], bPack: ['btn_round', 'pack'], bBook: ['btn_round', 'book'], bJournal: ['btn_round', 'journal'], bView: ['btn_round', 'view3'], mapMini: ['ring_map', null] };
  const out = [];
  for (const b of boxes(...PHONE)) {
    const slot = /^slot(\d)$/.exec(b.id);
    const [base, icon, scale] = slot ? ['slot_spell', first[+slot[1] - 1], 0.72] : ICON_OF[b.id] || [];
    if (base) out.push({ id: b.id, x: +b.x.toFixed(1), y: +b.y.toFixed(1), r: +b.r.toFixed(1), base, icon, ...(scale ? { scale } : {}) });
  }
  out.push({ id: 'levelBox', x: TOP.side + TOP.medal / 2, y: TOP.pad + TOP.medal / 2, r: TOP.medal / 2, base: 'medallion', icon: null });
  return { size: PHONE, boxes: out, bars: { x: TOP.side + TOP.medal + 7, y: TOP.pad + 5, w: TOP.bars } };
}

/** What's written to tools/ui/spec.json (and into the kit), as text. */
export const specText = () => `${JSON.stringify({ format: FORMAT, sheets: SHEETS, hud: hudLayout() }, null, 1)}\n`;
