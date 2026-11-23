// The camps: small friendly places out in the land where somebody with work for you stands, by a fire, with a landmark to
// find it by. They're what the quests are hung on (docs/QUEST-LOOP.md, README "The quest loop"): work is given at a camp,
// done within a few hundred metres of it, and paid there, and the last of a camp's work sends you on to the next.
//
// Shared by every thread and read by src/core/lands.js (each camp is a place, SITES[key], with `camp: true`), so nothing
// is imported here. What's built at each is src/core/camps.js; who stands there, src/folk/people.js (campPost); the dens
// pinned near them for their quests are placed first by tools/wilds/place.mjs (DENS).
//
// Plain folk's, every one: nobody's letter, no red of his and no blue and gold of hers on any of them (README, "The two
// sides"). style: what's built (src/core/camps.js STYLES). mark: its landmark (MARKS). yaw: the way its front faces (to
// the road, where it has one). r: how far its ground goes. Found with tools/quests/spot.mjs --find.
export const CAMPS = [
  // ---- the ring round Bellmourn, a quarter of an hour's walk out on each road ----
  { key: 'hillfoot', name: 'Hillfoot Halt', x: 652, z: 6, yaw: 0.03, style: 'halt', mark: 'waystone' },
  { key: 'forkstone', name: 'The Forkstone', x: 179, z: 905, yaw: -2.46, style: 'drovers', mark: 'stone' },
  { key: 'palmers', name: "Palmers' Rest", x: -850, z: -150, yaw: 2.05, style: 'pilgrims', mark: 'arch' },
  { key: 'withy', name: 'Withy Landing', x: -43, z: -868, yaw: 0.34, style: 'reeds', mark: 'hull' },
  // ---- the Green Downs ----
  { key: 'cairnwatch', name: 'Cairnwatch', x: 1132, z: -348, yaw: 0.58, style: 'watch', mark: 'beacon' },
  { key: 'dunmow', name: 'Dunmow Fold', x: 1458, z: 571, yaw: 1.08, style: 'fold', mark: 'cairn' },
  { key: 'kestrel', name: 'Kestrel Hide', x: 3308, z: 608, yaw: -2.11, style: 'hunters', mark: 'ribs' },
  // ---- the Weeping Fen ----
  { key: 'sedgebank', name: 'Sedgebank', x: -41, z: -1731, yaw: -1.52, style: 'reeds', mark: 'mast' },
  { key: 'mileend', name: 'Mile-End Camp', x: -296, z: -2659, yaw: -1.57, style: 'diggers', mark: 'crane' },
  { key: 'eelpot', name: 'Eelpot Hythe', x: 1009, z: -2534, yaw: -0.89, style: 'reeds', mark: 'hull' },
  // ---- the Deepwood and the west road ----
  { key: 'mossgate', name: 'Mossgate Hide', x: -1481, z: -1037, yaw: 0.72, style: 'hunters', mark: 'stones' },
  { key: 'ashgate', name: 'Ashgate Halt', x: -1406, z: -90, yaw: -0.2, style: 'halt', mark: 'waystone' },
  // ---- the Rustwood ----
  { key: 'stonecarters', name: "Stonecarters' Halt", x: 2124, z: -788, yaw: -2.3, style: 'halt', mark: 'block' },
  { key: 'emberwatch', name: 'Emberwatch', x: 3612, z: -3700, yaw: 3.11, style: 'watch', mark: 'beacon' },
  { key: 'lasthearth', name: 'Last Hearth', x: 5250, z: -1436, yaw: 0.42, style: 'refugees', mark: 'mast' },
  // ---- the Ashen Waste ----
  { key: 'hollowwatch', name: 'The Hollow Watch', x: -4461, z: 516, yaw: -0.14, style: 'scouts', mark: 'deadtree' },
  { key: 'scavengers', name: "Scavengers' Pit", x: -3825, z: -1850, yaw: -2.02, style: 'diggers', mark: 'ribs' },
  // ---- the Barrow Moor ----
  { key: 'trackside', name: "Drovers' Stance", x: -689, z: 1430, yaw: 0.73, style: 'drovers', mark: 'waystone' },
  { key: 'peatrick', name: "Peatcutters' Rick", x: -2194, z: 2554, yaw: 0.9, style: 'peat', mark: 'cairn' },
  { key: 'diggers', name: "The Diggers' Camp", x: -2735, z: 3316, yaw: -2.66, style: 'diggers', mark: 'crane' },
  // ---- the Rimeholt Fells ----
  { key: 'fellfoot', name: 'Fellfoot', x: 431, z: 2429, yaw: -1.37, style: 'drovers', mark: 'beacon' },
  { key: 'hoarhide', name: 'Hoarfrost Hide', x: -88, z: 3854, yaw: -3.14, style: 'hunters', mark: 'ribs' },
  { key: 'climbers', name: "Climbers' Rest", x: 1364, z: 4574, yaw: 2.5, style: 'watch', mark: 'mast' },
  // ---- the Gallowswood ----
  { key: 'candlecamp', name: 'Corpse-Candle Camp', x: 3555, z: 3984, yaw: 0.96, style: 'hunters', mark: 'stones' },
  { key: 'wagon', name: "The Players' Wagon", x: 3172, z: 4355, yaw: 0.21, style: 'players', mark: 'wagon' },
  // ---- the Marches, on the roads east to Phobos (past the old edge: nothing's pinned out here, tools/wilds/place.mjs
  // lays the land only west of it, and their ways are the roads they stand beside) ----
  { key: 'roadsend', name: 'Roadsend', x: 5506, z: 1700, yaw: -0.42, style: 'halt', mark: 'block' },
  { key: 'marchfoot', name: 'Marchfoot', x: 6432, z: -1510, yaw: -0.93, style: 'refugees', mark: 'mast' },
  { key: 'tollqueue', name: 'The Long Queue', x: 6779, z: 392, yaw: 1.93, style: 'halt', mark: 'waystone' },
  { key: 'widowslee', name: "Widow's Lee", x: 7144, z: 79, yaw: -3.1, style: 'scouts', mark: 'deadtree' },
];
for (const c of CAMPS) { c.r ??= 20; c.pad ??= 15; }
export const CAMP_KEYS = CAMPS.map((c) => c.key);
export const campOf = (key) => CAMPS.find((c) => c.key === key) || null;

// Where people stand at a camp, in its own frame (u across, w out to the front, metres): the first by the fire, the
// second at the sutler's board by the cart, the third on the far side of the fire, the fourth by the landmark. The
// builder keeps each of them clear (src/core/camps.js). face: the way they look when nobody's by, from the camp's yaw.
export const CAMP_POSTS = [
  { u: -3.4, w: 2.2, face: 2.2 },
  { u: 5.6, w: 0.6, face: -1.4 },
  { u: -0.4, w: -3.6, face: 0.3 },
  { u: 14, w: -2.6, face: -2.4 },
];
// A point of a camp's frame on the land: the same turn as the sites' Kit.frame (src/core/places.js).
export function campAt(c, u, w) { const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return [c.x + u * cs + w * sn, c.z - u * sn + w * cs]; }
// For src/folk/people.js: where someone posted at a camp stands, and which way they face.
export function campPost(key, i = 0) { const c = campOf(key), p = CAMP_POSTS[i]; return campAt(c, p.u, p.w).map((v) => Math.round(v * 10) / 10); }
export function campFace(key, i = 0) { return Math.round((campOf(key).yaw + CAMP_POSTS[i].face) * 1000) / 1000; }

// The dens pinned for the camps' quests: outposts like any other (src/core/wilds.js FACTIONS says who holds each and how
// it's built), but stood where they're wanted and named, before the rest of the land is laid out round them
// (tools/wilds/place.mjs puts each on the nearest sound ground to its x, z). key: 'den_<name>' (a quest's `clear`).
// camp: the camp or place whose work it is (tests/quest-loop.test.mjs holds each within reach of it). x, z: where it's
// wanted; where it came to stand is its entry in OUTPOSTS (src/core/wilds-data.js), by the same key.
export const DENS = [
  { key: 'den_gnawbone', faction: 'moss', name: "Gnawbone Stockade", x: 475, z: 183, camp: 'hillfoot' },
  { key: 'den_candlewick', faction: 'dig', name: "Candlewick Diggings", x: 888, z: 192, camp: 'hillfoot' },
  { key: 'den_hanginglarder', faction: 'brood', name: "the Hanging Larder", x: 2, z: 728, camp: 'forkstone' },
  { key: 'den_lychfield', faction: 'grave', name: "Lychfield", x: 458, z: 552, camp: 'forkstone' },
  { key: 'den_thornpit', faction: 'moss', name: "the Thornpit", x: -850, z: -400, camp: 'palmers' },
  { key: 'den_mumblefast', faction: 'hedge', name: "Mumblefast", x: -1235, z: -259, camp: 'palmers' },
  { key: 'den_muddle', faction: 'moss', name: "Muddle Camp", x: -253, z: -868, camp: 'withy' },
  { key: 'den_silkdell', faction: 'brood', name: "the Silk Dell", x: 104, z: -606, camp: 'withy' },
  { key: 'den_strawacre', faction: 'effigy', name: "Strawman's Acre", x: 1228, z: -579, camp: 'cairnwatch' },
  { key: 'den_paupers', faction: 'grave', name: "Paupers' Field", x: 857, z: -565, camp: 'cairnwatch' },
  { key: 'den_bleatmoot', faction: 'herd', name: "Bleatmoot", x: 1554, z: 340, camp: 'dunmow' },
  { key: 'den_screamcrag', faction: 'flock', name: "the Screaming Crag", x: 1747, z: 652, camp: 'dunmow' },
  { key: 'den_gnawedhollow', faction: 'pack', name: "the Gnawed Hollow", x: 3404, z: 377, camp: 'kestrel' },
  { key: 'den_crookedcircle', faction: 'hedge', name: "the Crooked Circle", x: 3240, z: 849, camp: 'kestrel' },
  { key: 'den_reedlarder', faction: 'brood', name: "the Reed Larder", x: -218, z: -1908, camp: 'sedgebank' },
  { key: 'den_sinkfoot', faction: 'mire', name: "Sinkfoot Stockade", x: 177, z: -1853, camp: 'sedgebank' },
  { key: 'den_sunkplot', faction: 'drowned', name: "the Sunk Plot", x: -392, z: -2428, camp: 'mileend' },
  { key: 'den_leechwater', faction: 'mire', name: "Leechwater Camp", x: -594, z: -2624, camp: 'mileend' },
  { key: 'den_reedgraves', faction: 'drowned', name: "the Reed Graves", x: 1186, z: -2711, camp: 'eelpot' },
  { key: 'den_merecoven', faction: 'hedge', name: "the Mere Coven", x: 791, z: -2412, camp: 'eelpot' },
  { key: 'den_howlscrape', faction: 'pack', name: "Howlers' Scrape", x: -1481, z: -737, camp: 'mossgate' },
  { key: 'den_stitched', faction: 'effigy', name: "the Stitched Field", x: -1133, z: -1078, camp: 'mossgate' },
  { key: 'den_pickfall', faction: 'dig', name: "Pickfall Delve", x: -1653, z: -337, camp: 'ashgate' },
  { key: 'den_watchingacre', faction: 'effigy', name: "the Watching Acre", x: -1853, z: -37, camp: 'ashgate' },
  { key: 'den_buttingground', faction: 'herd', name: "the Butting Ground", x: 1893, z: -692, camp: 'stonecarters' },
  { key: 'den_bramble', faction: 'moss', name: "Bramble Stockade", x: 2246, z: -570, camp: 'stonecarters' },
  { key: 'den_brandfast', faction: 'pyre', name: "Brandfast", x: 3435, z: -3877, camp: 'emberwatch' },
  { key: 'den_cinderbed', faction: 'whelps', name: "Cinderbed", x: 3960, z: -3741, camp: 'emberwatch' },
  { key: 'den_sootpit', faction: 'ember', name: "Sootpit Camp", x: 5250, z: -1226, camp: 'lasthearth' },
  { key: 'den_shroudwood', faction: 'rustbrood', name: "Shroudwood", x: 5215, z: -1734, camp: 'lasthearth' },
  { key: 'den_hangingtree', faction: 'dusk', name: "the Hanging Tree", x: 4967, z: -1230, camp: 'lasthearth' },
  { key: 'den_smokefast', faction: 'ashcult', name: "Smokefast", x: -4230, z: 612, camp: 'hollowwatch' },
  { key: 'den_greycut', faction: 'ashdig', name: "the Grey Cut", x: -4414, z: 913, camp: 'hollowwatch' },
  { key: 'den_gallowgate', faction: 'vigil', name: "Gallowgate Fort", x: -4663, z: 663, camp: 'hollowwatch' },
  { key: 'den_churned', faction: 'sand', name: "the Churned Ground", x: -4002, z: -2027, camp: 'scavengers' },
  { key: 'den_greylarder', faction: 'ashbrood', name: "the Grey Larder", x: -4043, z: -1728, camp: 'scavengers' },
  { key: 'den_blackfinger', faction: 'vigiltower', name: "the Black Finger", x: -3767, z: -1607, camp: 'scavengers' },
  { key: 'den_hungryplot', faction: 'grave', name: "the Hungry Plot", x: -689, z: 1180, camp: 'trackside' },
  { key: 'den_spoilheaps', faction: 'dig', name: "the Spoil Heaps", x: -453, z: 1616, camp: 'trackside' },
  { key: 'den_coldhowe', faction: 'barrow', name: "Coldhowe", x: -2290, z: 2323, camp: 'peatrick' },
  { key: 'den_moonbite', faction: 'pack', name: "Moonbite Hollow", x: -2412, z: 2676, camp: 'peatrick' },
  { key: 'den_ravenhowe', faction: 'barrow', name: "Ravenhowe", x: -2558, z: 3493, camp: 'diggers' },
  { key: 'den_sleepless', faction: 'night', name: "the Sleepless Stones", x: -2430, z: 3145, camp: 'diggers' },
  { key: 'den_chilblain', faction: 'rime', name: "Chilblain Camp", x: 61, z: 2276, camp: 'fellfoot' },
  { key: 'den_frozenmoot', faction: 'rimeherd', name: "the Frozen Moot", x: 126, z: 2600, camp: 'fellfoot' },
  { key: 'den_whitelarder', faction: 'frostbrood', name: "the White Larder", x: -282, z: 3934, camp: 'hoarhide' },
  { key: 'den_frozenscrape', faction: 'howlers', name: "the Frozen Scrape", x: 108, z: 4009, camp: 'hoarhide' },
  { key: 'den_thundercrag', faction: 'storm', name: "the Thunder Crag", x: 1087, z: 4689, camp: 'climbers' },
  { key: 'den_winterfast', faction: 'rimecoven', name: "Winterfast", x: 1255, z: 4959, camp: 'climbers' },
  { key: 'den_lazarfield', faction: 'plague', name: "the Lazar Field", x: 3732, z: 4161, camp: 'candlecamp' },
  { key: 'den_nightfall', faction: 'night', name: "Nightfall Ruin", x: 3433, z: 3766, camp: 'candlecamp' },
  { key: 'den_leatherwing', faction: 'dusk', name: "Leatherwing Roost", x: 3268, z: 4124, camp: 'wagon' },
  { key: 'den_poxhollow', faction: 'plague', name: "Poxhollow", x: 2976, z: 4200, camp: 'wagon' },
  { key: 'den_mudwall', faction: 'moss', name: "Mudwall Stockade", x: 1720, z: 0, camp: 'hamlet' },
  { key: 'den_barleyrows', faction: 'effigy', name: "the Barley Rows", x: 2078, z: 318, camp: 'hamlet' },
  { key: 'den_hornedstones', faction: 'herd', name: "the Horned Stones", x: 2754, z: -670, camp: 'belltower' },
  { key: 'den_featherfall', faction: 'flock', name: "Featherfall Roost", x: 2686, z: 1919, camp: 'thornwick' },
  { key: 'den_warlockstones', faction: 'hedge', name: "the Warlocks' Stones", x: 2436, z: 2108, camp: 'thornwick' },
  { key: 'den_scarecrowrows', faction: 'effigy', name: "the Scarecrow Rows", x: -2291, z: -391, camp: 'cinderford' },
  { key: 'den_ashden', faction: 'pack', name: "the Ash Den", x: -2154, z: -657, camp: 'cinderford' },
  { key: 'den_whitefang', faction: 'rime', name: "Whitefang Camp", x: 700, z: 4210, camp: 'frostwatch' },
  { key: 'den_moonbitefell', faction: 'howlers', name: "the Howling Scrape", x: 852, z: 3361, camp: 'frostwatch' },
  { key: 'den_drownedyard', faction: 'drowned', name: "the Drowned Yard", x: -10, z: -3640, camp: 'sallow' },
  { key: 'den_reedstockade', faction: 'mire', name: "the Reed Stockade", x: -706, z: -4494, camp: 'chapel' },
  { key: 'den_orefall', faction: 'rustdig', name: "Orefall Delve", x: 2649, z: -1676, camp: 'quarry' },
  { key: 'den_kilncoven', faction: 'pyre', name: "the Kiln Coven", x: 3950, z: -2520, camp: 'abbey' },
  { key: 'den_redlarder', faction: 'rustbrood', name: "the Red Larder", x: 3680, z: -2729, camp: 'abbey' },
  { key: 'den_redtooth', faction: 'ember', name: "Redtooth Camp", x: 4375, z: -1300, camp: 'cutters' },
  { key: 'den_sextonsrest', faction: 'grave', name: "Sexton's Rest", x: -1720, z: 2113, camp: 'wayhouse' },
  { key: 'den_ninthstone', faction: 'hedge', name: "the Ninth Circle", x: -2154, z: 4295, camp: 'stones' },
  { key: 'den_burningground', faction: 'plague', name: "the Burning Ground", x: 3832, z: 3089, camp: 'crossroads' },
  { key: 'den_widowshollow', faction: 'ashbrood', name: "the Widows' Hollow", x: -3700, z: -1010, camp: 'khel' },
  { key: 'den_weavershollow', faction: 'brood', name: "the Weavers' Hollow", x: -1109, z: -1691, camp: 'hermit' },
  { key: 'den_brokenvigil', faction: 'night', name: "the Broken Vigil", x: -1650, z: -1580, camp: 'stair' },
  { key: 'den_hoarcircle', faction: 'rimecoven', name: "the Hoar Circle", x: -1042, z: 3158, camp: 'shrine' },
  { key: 'den_duskroost', faction: 'dusk', name: "the Toll Roost", x: 3127, z: 2768, camp: 'oldtoll' },
  { key: 'den_grawlden', faction: 'pack', name: "Grawl's Kennel", x: 5049, z: 1497, camp: 'witch' },
  { key: 'den_burnthollow', faction: 'whelps', name: "the Burnt Hollow", x: 2793, z: -4559, camp: 'fungus' },
];
export const denOf = (key) => DENS.find((d) => d.key === key) || null;
