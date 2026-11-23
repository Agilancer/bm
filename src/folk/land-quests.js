// The quests of the land beyond Bellmourn: the roads out to the small towns, what besets each of them, and the party
// dungeons (the Hollowfang Warrens, Blackvigil Keep, the Howling Deeps, and the four made after them: the Drowned Vaults,
// the Sporehold, the Hollow Playhouse, the Kingsbarrow). Their workings only:
// every word of them is in src/folk/lines/land.js, and how a step is finished is src/folk/quests.js (which spreads these
// into RULES). Givers: Bellmourn's own (the ones Lisandra sends you round), the people posted in the small towns
// (src/folk/people.js POSTED), and the two at the Bell Tower (src/folk/lines/beyond.js BEYOND).
//
// Pay grows with how far it is and how hard: a walk and a word about what a town errand paid; a lair cleared a little more;
// a dungeon's boss a good deal more, with something rare; a long chain's end a charm (src/ui/lands.js CHARMS).
// tests/quests-beyond.test.mjs walks every one of them through.
import { REGION_RULES, REGION_LEVELS } from './regions/index.js';

export const LAND_RULES = {
  // ---- out of Bellmourn, to the small towns and the forts ----
  // (Ser Aldric's word to Thornwick is cut: it was a walk of 3.3 km to say the road still runs.)
  // (Bram's purse for Frostwatch is carried up from Fellfoot now, by Berin Stoat the packman: src/folk/regions/fells.js.)
  // (The two hub-to-hub words in Thornwick, hare_and_harrow and man_at_the_cross, are cut: the hubs there open on their own.)
  // (Cinderford's two, and the road west from Bellmourn to it, are the Ashen Waste's now: src/folk/regions/waste.js.)
  // (Orrin Vey's quarry, and the Sporehold under the Fungal Ring after it, are the Rustwood's now, each given by
  // whoever stands by the work: src/folk/regions/rustwood.js.)
  // (Thornwick's own, and the Old Toll's, the Cross's and the salt, are given by whoever stands by the work: src/folk/regions/gallows.js.)
  // (Cinderford's, Khel's and the Vigil Road's are the Ashen Waste's now, each given by someone by the work:
  // src/folk/regions/waste.js.)
  // (Frostwatch's and the Howling Deeps', Ser Hale's bottom of the Deeps among them, are Hew Garrick's at the Deeps' door,
  // and Ravens' Tor is the climbers' under it: src/folk/regions/fells.js. Ser Hale's first, the_howling, is cut: it was
  // into_the_deeps' door asked about from the Bell Tower, 4.8 km off.)
  // (Blackvigil Keep's are Captain Renn's, at the Hollow Watch by its door: src/folk/regions/waste.js. The gate's and the
  // arch's were one quest given twice, by Ser Hale and Sergeant Hasket; it and the lords' are one, the_castellan, there.)
  // ---- the four delves made after those: two quests each, the first to its door and its first boss, the second to its last ----
  // (The Drowned Vaults' two, under the Sunken Mile, are Tamar Dyke's at Mile-End Camp now: src/folk/regions/fen.js.)
  // (The Sporehold's two, under the Fungal Ring, are Dilly Roe's at the ring now: src/folk/regions/rustwood.js.)
  // The Hollow Playhouse, in the Twisted Grove.
  // (Its two are Master Fabian Larke's at the Players' Wagon by its door now: src/folk/regions/gallows.js.)
  // (The Kingsbarrow's two, and the Moor Wayhouse's, are the Barrow Moor's now: src/folk/regions/moor.js.)
  // (The Elder Dragon Gods' two are Yrsa's now, on the Crown of Teeth by their door: src/folk/regions/deepwood.js.)
};
// And the land's quests made region by region since (src/folk/regions/, docs/QUEST-LOOP.md), and the level each wants.
Object.assign(LAND_RULES, REGION_RULES);
export const LAND_LEVELS = REGION_LEVELS;
