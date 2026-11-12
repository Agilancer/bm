# People, monsters and quests out in the land: handoff

What this part of the work was: who and what lives in the world beyond Bellmourn. Monsters by country, quest givers in the
small towns, and quests that lead out to every new place and down into the three party dungeons. This file says what exists,
what was checked, what wasn't, and what is left.

## State of the tree

`node --test tests/*.test.mjs`: 168 pass, 2 fail. The 2 are the old ones about Lisandra's recorded voice files (they failed
before any of this). `node tools/testhall/check.mjs` and `node tools/lands/check-vt.mjs` pass. `node tools/autoplay/check.mjs`
fails, as expected: auto-play has not been taught any of this (list at the end).

**Known fault, not fixed: the seven posted people are not drawn.** In the headless game their places in the folk buffer are
right (position, height, the `!` mark worked out and projected over where the head should be) but
`renderer.folk.bodies[i]` was still empty for them when the pictures were taken, so nobody is seen (see
`docs/handoff/pictures/people-*.png`: the spots, empty). Not yet known whether their bodies only load late (the loader in
`src/gfx/folk.js` `load()` goes through everyone in order, and they are last) or fail to load (it catches and warns
`folk body <id>` in the console). First thing to do: open the game, go to Thornwick (2394, 1806), look at the console.
Things to check: the seven `*_c.webp` textures in `assets/game/folk/` and their `swaps` entries in `folk.json`.

## Posted folk: how they work

A posted person is a villager with the townsfolk's body, on the town's own worker thread and in its buffer, but with no
house, bed or day. So the talk panel, the `!`/`?` marks, balloons, shadows, bumping and the quest trail to them are the
town's own code, unchanged.

- `src/folk/people.js`: `POSTED` (after `PEOPLE`), `FOLK = PEOPLE.concat(POSTED)`. An entry: id, name, title, body, sex, age,
  `post: [x, z]` (optional third number: y, if they stand on something built), `face` (yaw when nobody is by), idles.
  Job is `posted`.
- `src/folk/days.js`: `DAYS.posted`. `src/folk/brain.js`: `Folk.posted`; `posted()` (stands at the post at the land's height,
  plays idles); `Life.attend()` (looks at the player within 10 m, turns to them within 4.5 m, turns back after); posted are
  skipped by beds, `fright` (never flee) and `place()`. `src/folk/talk.js`: no small talk for them. Barks work (their
  `barks` in the lines file).
- `src/folk/folk.worker.js` passes `people: FOLK` and their lines; `src/gfx/folk.js` draws `FOLK`; `src/ui/folk.js`:
  `people = PEOPLE, POSTED, BEYOND, Lisandra` in that order (so an index at or past `PEOPLE.length` is "out past the town",
  which is what auto-play already assumes for the Bellwright).
- Bodies: recoloured copies of townsfolk textures, made by `tools/folk/posted_swaps.py` (hue/saturation/value on everything
  that isn't skin-coloured), registered as `swaps` in `assets/game/folk/folk.json`. Crude; not judged in the game yet.
- **Room:** `FOLK_MAX` is 48 (`src/folk/layout.js`), `PEOPLE` is 41, so the seven fill it. An eighth needs `FOLK_MAX` and
  `FIN.SIZE` raised (FIN.SEEN is 32 + one per person).
- To add one: an entry in `POSTED`, a swap (or an existing body) in folk.json, lines in `src/folk/lines/land.js` `LINES`
  (first, greet x4, about, ask, topics, bye, barks), a section in `tools/folk/cast.md`. `tests/quests-beyond.test.mjs` then
  checks they stand in a site, not in water, 150 m from any lair, have words, and give work.

## The people, and where they stand

| id | who | where (x, z) |
|---|---|---|
| `osric` | Osric Thorne, 44, hedge-reeve of Thornwick | inside Thornwick's north-west gate (2369.6, 1776.6) |
| `dorcas` | Dorcas Pym, 57, keeper of the Hare and Harrow | before the inn's door, Thornwick (2393.7, 1806.3) |
| `wymond` | Wymond Ebb, 63, hedge-priest of no letter | by the market cross, Thornwick (2408, 1791) |
| `hasket` | Brenna Hasket, 39, sergeant of the Cinderford watch | foot of the watchtower, Cinderford (-2129, -201.5) |
| `colm` | Colm Burrage, 52, charcoal burner | before the kilns, Cinderford (-2098, -229) |
| `ysolt` | Ysolt Marrow, 27, out of Khel | the refugees' camp, Cinderford (-2067, -180) |
| `garrick` | Hew Garrick, 48, warden of Frostwatch | Frostwatch's yard (690, 3899) |
| `hale` | Ser Hale Orrowick, 36, Paladin of the Fifth Watch | beside the Bellwright at the Bell Tower (2436, -530.4) |

The spots are the places agent's (`K.spots` in `src/core/sites.js`: thornwick_gate/inn/cross, cinderford_watch/kiln/camp,
frostwatch_yard, hale). Hale is not posted: he is a `BEYOND` entry in `src/folk/lines/beyond.js`, like the Bellwright,
whose body is a knight in `TOWN_KNIGHTS` (`src/core/knights.js`) flagged `hale: true`. **That knight was not in knights.js
when this was written** (the models agent's): until it is, Hale can be talked to at his spot (`at` in his BEYOND entry) but
has no body and no mark. His route should be [[2434.6, -530.4], [2437.4, -530.4]].
Voices, ages and the two-letter rule for each: `tools/folk/cast.md`, "The small towns".

## The quests (40; rules `src/folk/land-quests.js`, words `src/folk/lines/land.js`)

Level is a guess at what the player should be. Step words: enter a place; kill n at a place; boss key; talk to someone;
visit places; bring materials; back to the giver.

| id | title | giver | needs | steps | pays | level |
|---|---|---|---|---|---|---|
| `word_to_thornwick` | Word to Thornwick | aldric | - | enter thornwick; talk osric; back | 80g, 500xp | 6 |
| `tracks_west` | Tracks Going West | corran | pines | enter cinderford; talk hasket; back | 90g, 550xp | 7 |
| `owed_to_frostwatch` | Owed to Frostwatch | bram | bed_and_bell | enter frostwatch; talk garrick; back | 100g, 600xp | 9 |
| `millhaven_man` | The Millhaven Man | hob | millhaven_jelly | enter belltower; talk hale; back | 70g, 500xp | 6 |
| `hare_and_harrow` | A Plate at the Hare | osric | - | talk dorcas (ends there) | 20g, 200xp | 6 |
| `man_at_the_cross` | The Man at the Cross | dorcas | - | talk wymond (ends there) | 20g, 200xp | 6 |
| `ask_the_burner` | Sacks Nobody Came For | hasket | - | talk colm (ends there) | 20g, 200xp | 7 |
| `girl_from_khel` | Out of Khel | colm | - | talk ysolt (ends there) | 20g, 200xp | 7 |
| `cairnfield` | Stones on the Cairnfield | silas | dead_cant_wait | enter cairnfield; kill 4 at lair:cairn_keepers; back | 90g, 550xp | 6 |
| `sunken_mile` | The Sunken Mile | sabine | sallowmere | enter causeway; kill 5 at lair:mile_drowned; back | 120g, 800xp | 9 |
| `moor_wayhouse` | The Wayhouse on the Moor | jory | barrow_lights | enter wayhouse; kill 4 at lair:wayhouse_dead; back | 150g, 900xp | 9 |
| `ossery_quarry` | The Masons' Marks | orrin | - | enter quarry; kill 5 at lair:quarry_kobolds (Kobolds); back | 150g, 1000xp | 9 |
| `deeper_dead` | Further Down | silas | bones_for_carver | kill 20 at catacombs; back | 120g, 500xp | 4 |
| `waxed_thread` | Waxed Thread | tamsin | shroud_and_thread | bring 6 wax | 100g, 300xp | 4 |
| `warrens_mouth` | Something Dug This | corran | pines | enter warrens; back | 80g, 500xp | 7 |
| `barley_thieves` | Barley Thieves | hob | - | kill 12 at warrens (Goblins/Kobolds); back | 150g, 900xp | 7 |
| `tunnel_king` | The Tunnel-King | corran | warrens_mouth | boss grubnash; back | 180g, 1200xp, staff | 8 |
| `mother_of_the_warren` | Mother of the Warren | aldric | tunnel_king | boss twins; boss venomaw; back | 400g, 2500xp, skull | 9 |
| `hedge_breakers` | Hedge-Breakers | osric | - | kill 3 at lair:thorn_goats (Goat Men); back | 120g, 800xp | 8 |
| `black_ram` | The Black Ram | osric | hedge_breakers | kill 3 at lair:thorn_ram (Goat Men); back | 1100xp, goatfoot | 10 |
| `up_from_the_gallowswood` | Up from the Hanging Wood | dorcas | - | kill 4 at lair:thorn_stragglers; back | 130g, 900xp | 9 |
| `old_toll` | Thursdays | dorcas | up_from_the_gallowswood | enter oldtoll; kill 5 at lair:toll_ambush; back | 170g, 1200xp | 11 |
| `salt_for_the_hanged` | Salt for the Hanged | wymond | - | visit crossroads+grove; back | 150g, 1400xp | 12 |
| `ash_on_the_wind` | They Know the Gate-Word | hasket | - | kill 4 at lair:cinder_refugees (The Possessed); back | 130g, 900xp | 9 |
| `red_scouts` | Two on the Ridge | hasket | ash_on_the_wind | kill 2 at lair:cinder_scouts (Velscour's Knights); back | 180g, 1300xp | 11 |
| `vigil_patrols` | The Vigil Road | hasket | red_scouts | kill 8 at waste (Velscour's Knights); back | 260g, 2000xp | 14 |
| `arch_before_the_gate` | The Arch Before the Gate | hasket | - | enter keep; enter blackvigil; back | 200g, 1500xp | 14 |
| `charcoal_for_khel` | Nobody at the Weighing Table | colm | - | enter khel; kill 4 at lair:khel_ghouls; back | 160g, 1300xp | 12 |
| `charred_mill` | The Charred Mill | ysolt | - | enter charmill; kill 5 at lair:charmill_possessed; back | 1500xp, robe | 12 |
| `mouth_guard` | What Sits on Your Chest | garrick | - | kill 2 at lair:mouth_demons (Night Paralysis Demons); back | 1500xp, glimmerstone | 13 |
| `ravens_tor` | Ravens' Tor | garrick | - | enter tor; kill 3 at lair:tor_roost (Harpies); back | 200g, 1600xp | 13 |
| `into_the_deeps` | The First Hall | garrick | mouth_guard | enter deeps; boss hrymgar; back | 250g, 2000xp, staff | 14 |
| `broodmother` | What Breeds Below | garrick | into_the_deeps | boss broodmother; back | 300g, 2600xp, robe | 15 |
| `the_howling` | The Howling | hale | millhaven_man | talk garrick; enter deeps; back | 180g, 1500xp | 14 |
| `the_sleeper` | The Sleeper | hale | the_howling | boss sleeper; back | 500g, 4500xp, scroll | 16 |
| `gate_of_blackvigil` | The Gate at the End of the West Road | hale | millhaven_man | enter blackvigil; back | 150g, 1200xp | 14 |
| `red_cloth` | Twenty of the Garrison | hale | gate_of_blackvigil | kill 20 at blackvigil (Velscour's Knights/Necromancers/Plague Knights); back | 300g, 2200xp | 15 |
| `first_lord` | The First of the Lords | hale | gate_of_blackvigil | boss maldrec; back | 250g, 2000xp, staff | 15 |
| `lords_of_the_keep` | Sorvane and the Brothers | hale | first_lord | boss sorvane; boss brothers; back | 350g, 3000xp, robe | 17 |
| `the_castellan` | The Castellan | hale | lords_of_the_keep | boss castellan; back | 600g, 5000xp, skull r4 | 18 |

## The breadcrumb chain to each hub and dungeon (the owner's requirement)

"Quests must lead to every new town, hub and dungeon." Asserted by the test `every hub is led to...` in
`tests/quests-beyond.test.mjs`: starting from Bellmourn's own givers and following `needs` and the people quests send you
to, every one of the 40 can be come by; every posted person and Hale is the target of a `talk` step; each hub has a quest
given in Bellmourn with at most one starter quest in front of it; wayhouse, oldtoll, quarry, cairnfield, causeway,
charmill, khel, tor and the three dungeons are each the target of an `enter` step; and each dungeon is entered by a quest
from its nearest hub.

- **Thornwick**: Aldric (Bellmourn, no needs) `word_to_thornwick` -> talk Osric. Then Osric `hare_and_harrow` -> Dorcas;
  Dorcas `man_at_the_cross` -> Wymond. On from Thornwick: Dorcas `old_toll` -> the Old Toll; Wymond `salt_for_the_hanged`
  -> Hangman's Cross and the Twisted Grove.
- **Cinderford**: Corran (Bellmourn, after `pines`) `tracks_west` -> talk Hasket. Then Hasket `ask_the_burner` -> Colm; Colm
  `girl_from_khel` -> Ysolt. On: Colm `charcoal_for_khel` -> Khel; Ysolt `charred_mill` -> the Charred Mill; Hasket
  `vigil_patrols` -> the Waste; Hasket `arch_before_the_gate` -> Blackvigil's portal.
- **Frostwatch**: Bram (Bellmourn, after `bed_and_bell`) `owed_to_frostwatch` -> talk Garrick. Also Hale `the_howling` ->
  talk Garrick. On: Garrick `mouth_guard` -> the Howling Mouth's rocks; `ravens_tor` -> Ravens' Tor; `into_the_deeps`.
- **The Bell Tower / Ser Hale**: Hob (Bellmourn, after `millhaven_jelly`) `millhaven_man` -> talk Hale. (The Bellwright was
  already reached by Corran's `long_way_round`.)
- **Lesser places, from Bellmourn**: Silas `cairnfield`; Sabine `sunken_mile` (the Sunken Mile); Jory `moor_wayhouse`;
  Orrin `ossery_quarry`.
- **Hollowfang Warrens portal**: Corran `warrens_mouth` (enter), Hob `barley_thieves`, then `tunnel_king`, `mother_of_the_warren`.
- **Blackvigil Keep portal**: Hasket `arch_before_the_gate` (enter the keep's ground, then the dungeon); Hale
  `gate_of_blackvigil` (enter), `red_cloth`, `first_lord`, `lords_of_the_keep`, `the_castellan`.
- **Howling Deeps portal**: Garrick `into_the_deeps` (enter, after `mouth_guard`); Hale `the_howling` (enter), `the_sleeper`;
  Garrick `broodmother`.

## New step kinds and areas (`src/folk/quests.js`)

- `enter`, `kill`, `visit` take: an old named area; any `SITES` key (within 1.2 x its radius); a dungeon key `warrens`,
  `blackvigil`, `deeps` (true down inside it: `delveAt`); `lair:<key>` (within the lair's r + 70 m); `waste` (anywhere in
  the Ashen Waste country, above ground).
- `kill` takes `foe: [group names]` (keys of `GROUPS`); at a `lair:` area only Tripo monsters count. The group comes from
  `EV.LOOT` in `src/main.js` (fifth argument of `QuestBook.kill`).
- `boss: '<key>'` (a key in `BOSSES`, `src/core/dungeon.js`): done by `QuestBook.boss(key)`, called from `src/main.js` on
  `EV.DELVE` / `DELVE.BOSS_DOWN`. The kill is kept as flag `boss:<key>` (saved), so a boss dead before the quest counts.
- `talk` takes `end: true`: the quest finishes and pays with that person (`stepTalk` in `src/ui/folk.js`).
- `bring` takes `at` (a place, for the trail). Not used by any quest yet.
- Exports: `areaAt`, `hasArea`, `delvePortal(key)`, `placeSpot(key)` (where the trail leads: a lair's glade, a site, a
  dungeon's portal out in the land). `src/ui/trail.js` uses them; down in a dungeon the trail leads nowhere.
- Rewards used: gold, xp, `item` staff/robe/skull/scroll, `rarity: 4` on the Castellan's skull, charms `goatfoot` (Black
  Ram) and `glimmerstone` (mouth_guard), which existed but nothing gave.

## The lairs (71 new, 101 in all; `LAIRS` in `src/core/tripo-monsters.js`)

Stood with `node tools/monsters/place-lairs.mjs want.json out.json` (off roads, places, water, steep ground, tumbler and
jelly camps; Velscour's knights 520 m from any seal; no more than 12 bodies in lairs within 235 m of one). Glades are
automatic past 330 m from town (`src/core/hunts.js`, now a grid lookup). `lairFor()` thins a lair's lists to what
roster.json holds, so the Waste's lairs name `velscour_knight_1..6`, `velscour_lancer`, `_2`, `_3`, `possessed_knight_1..3`.
Level is a guess, for auto-play's `LAIR_LEVEL`.

| key | x, z | country | nearest place | boss | others | tricks | level |
|---|---|---|---|---|---|---|---|
| `dark_goblins_nw` | -582, -451 | darkwood | hermit 1271 m | goblin_green | 4 x goblin/goblin_green |  | 5 |
| `dark_spiders_ne` | 472, -509 | darkwood | cairnfield 783 m | - | 3 x spider |  | 4 |
| `dark_goats_e` | 461, 732 | darkwood | farm 1382 m | - | 3 x goatman |  | 6 |
| `dark_children_s` | -367, 574 | darkwood | cinderford 1897 m | - | 3 x zombie |  | 4 |
| `dark_wolf_w` | -792, 559 | darkwood | cinderford 1512 m | werewolf | - |  | 7 |
| `hill_kobolds` | 741, 86 | darkwood | cairnfield 717 m | - | 3 x kobold |  | 3 |
| `hill_goblins` | 1047, -6 | darkwood | cairnfield 461 m | - | 3 x goblin/goblin_green |  | 4 |
| `frost_kobolds` | 75, 491 | darkwood | cairnfield 1486 m | - | 3 x kobold |  | 3 |
| `frost_spiders` | 38, 1109 | darkwood | farm 1931 m | - | 3 x spider |  | 5 |
| `frost_wolf` | 301, 1860 | darkwood | shrine 1753 m | werewolf | - |  | 8 |
| `fenway_goblins` | 70, -480 | darkwood | cairnfield 1181 m | - | 3 x goblin/goblin_green |  | 3 |
| `fenway_spiders` | -78, -1109 | darkwood | hermit 1283 m | - | 2 x spider |  | 5 |
| `vigil_kobolds` | -550, -159 | darkwood | hermit 1536 m | - | 3 x kobold |  | 3 |
| `vigil_goats` | -1169, -5 | darkwood | cinderford 951 m | - | 2 x goatman |  | 6 |
| `vigil_children` | -1713, -174 | deepwood | cinderford 387 m | - | 3 x zombie |  | 7 |
| `track_children` | -448, 1355 | darkwood | wayhouse 1632 m | - | 4 x zombie |  | 5 |
| `cairn_keepers` | 1276, -358 | downs | cairnfield 67 m | necromancer | 3 x zombie |  | 6 |
| `downs_raiders` | 1453, 181 | downs | farm 267 m | - | 4 x goblin_green/goblin |  | 5 |
| `abbey_rd_goblins` | 1693, -275 | downs | farm 435 m | - | 3 x goblin/goblin_green |  | 5 |
| `gallows_rd_goblins` | 1264, 478 | downs | farm 555 m | - | 2 x goblin/goblin_green |  | 4 |
| `cliff_harpies` | 2563, 424 | downs | falls 546 m | - | 3 x harpy_warrior |  | 7 |
| `downs_goats` | 1784, 1321 | downs | thornwick 780 m | - | 2 x goatman |  | 7 |
| `thorn_goats` | 2183, 1514 | downs | thornwick 359 m | - | 3 x goatman |  | 8 |
| `thorn_ram` | 2067, 2064 | downs | thornwick 424 m | goatman | 2 x goatman | yes | 10 |
| `thorn_stragglers` | 2655, 2103 | downs | thornwick 396 m | - | 4 x plague_knight/possessed |  | 9 |
| `fenway_children` | 17, -1807 | fen | causeway 994 m | - | 3 x zombie |  | 6 |
| `fenway_drowned` | -190, -2450 | fen | causeway 339 m | - | 3 x possessed |  | 8 |
| `mile_drowned` | -420, -2610 | fen | causeway 90 m | - | 5 x possessed/zombie |  | 9 |
| `fen_east_harpies` | 720, -3120 | fen | sallow 1009 m | - | 3 x harpy |  | 10 |
| `fen_children` | -700, -3560 | fen | sallow 477 m | - | 4 x zombie |  | 9 |
| `abbey_rd_raiders` | 2347, -1169 | downs | belltower 635 m | - | 4 x goblin/goblin_red |  | 8 |
| `quarry_kobolds` | 2924, -1600 | rustwood | quarry 76 m | kobold | 4 x kobold |  | 9 |
| `rust_bat` | 3687, -2120 | rustwood | abbey 804 m | werebat | - |  | 11 |
| `abbey_webs` | 3637, -3083 | rustwood | abbey 373 m | - | 3 x spider |  | 11 |
| `rust_spiders` | 4300, -2008 | rustwood | cutters 813 m | flesh_spider_demon | 2 x spider | yes | 13 |
| `rust_kobolds` | 4064, -1179 | rustwood | cutters 647 m | - | 4 x kobold |  | 10 |
| `rust_warband` | 3302, -3516 | rustwood | fungus 881 m | goblin_red | 6 x goblin/goblin_red | yes | 12 |
| `pilgrim_dolls` | -1083, -516 | deepwood | hermit 1007 m | - | 2 x mannequin |  | 6 |
| `pilgrim_spiders` | -1123, -856 | deepwood | hermit 667 m | - | 3 x spider |  | 7 |
| `deep_spiders` | -1877, -1343 | deepwood | hermit 597 m | - | 4 x spider/possessed |  | 9 |
| `deep_worm` | -1751, -913 | deepwood | hermit 740 m | worm | - |  | 14 |
| `horn_whelps` | -1969, -2304 | deepwood | stair 514 m | - | 3 x dragonling |  | 12 |
| `horn_demons` | -1996, -2397 | deepwood | stair 605 m | - | 3 x night_demon | yes | 14 |
| `cinder_refugees` | -2341, -39 | deepwood | cinderford 289 m | - | 4 x possessed |  | 9 |
| `cinder_scouts` | -2660, -440 | deepwood | cinderford 609 m | - | 2 x velscour_knight |  | 11 |
| `charmill_possessed` | -3157, -924 | ashen | charmill 76 m | possessed | 4 x possessed |  | 12 |
| `khel_ghouls` | -3705, -812 | ashen | khel 112 m | - | 4 x possessed/zombie |  | 12 |
| `vigil_patrol_1` | -3200, -430 | ashen | khel 568 m | - | 3 x velscour_knight |  | 13 |
| `vigil_patrol_2` | -4246, -202 | ashen | khel 738 m | velscour_lancer | 4 x velscour_knight | yes | 14 |
| `vigil_patrol_3` | -4457, -90 | ashen | keep 615 m | possessed_knight/velscour_lancer | 5 x velscour_knight | yes | 15 |
| `keep_necros` | -4700, 368 | ashen | keep 343 m | - | 4 x necromancer/plague_knight | yes | 16 |
| `waste_lancers` | -4326, -1282 | ashen | bones 738 m | - | 3 x velscour_lancer | yes | 15 |
| `waste_plague` | -3586, -1729 | ashen | charmill 849 m | - | 3 x plague_knight |  | 13 |
| `waste_golem` | -4889, -1170 | ashen | bones 916 m | bone_golem | 1 x skeleton_knight_giant | yes | 16 |
| `waste_necros` | -4057, -2304 | ashen | bones 537 m | necromancer_lord | 3 x necromancer | yes | 15 |
| `track_possessed` | -1080, 1900 | barrow | wayhouse 798 m | - | 3 x possessed |  | 7 |
| `wayhouse_dead` | -1820, 2330 | barrow | wayhouse 110 m | necromancer | 3 x zombie |  | 9 |
| `moor_golem` | -2162, 2893 | barrow | wayhouse 678 m | bone_golem | 2 x zombie |  | 12 |
| `moor_whelps` | -2450, 3712 | barrow | barrows 547 m | - | 3 x dragonling |  | 13 |
| `moor_knight` | -1475, 3359 | rimeholt | shrine 777 m | skeleton_knight_giant | 1 x necromancer | yes | 14 |
| `rime_goats` | 382, 2771 | rimeholt | frostwatch 1172 m | - | 3 x goatman |  | 10 |
| `fells_goats` | 428, 3776 | rimeholt | frostwatch 298 m | - | 3 x goatman |  | 11 |
| `fells_wolves` | -56, 3561 | rimeholt | shrine 694 m | werewolf | 1 x werewolf | yes | 12 |
| `mouth_demons` | 1025, 3867 | rimeholt | deepsmouth 190 m | - | 2 x night_demon | yes | 13 |
| `tor_roost` | 1493, 4516 | rimeholt | tor 84 m | harpy_queen | 2 x harpy_warrior | yes | 13 |
| `tor_demons` | 1640, 4700 | rimeholt | tor 172 m | - | 2 x night_demon | yes | 14 |
| `toll_ambush` | 3314, 2500 | gallows | oldtoll 81 m | - | 5 x possessed/mannequin |  | 11 |
| `gallows_bat` | 2967, 2384 | gallows | oldtoll 399 m | werebat | - |  | 10 |
| `gallows_demons` | 3680, 2960 | gallows | crossroads 483 m | - | 2 x night_demon | yes | 13 |
| `gibbet_possessed` | 4393, 2504 | gallows | crossroads 755 m | - | 4 x possessed |  | 12 |
| `gallows_giant` | 3707, 3796 | gallows | crossroads 713 m | plague_giant | 2 x plague_knight | yes | 14 |

Also: a jelly camp `mile` north of the Sunken Mile (`src/sim/slimes.js`); three hunt places for the other Tessariels at
`hill_kobolds`, `fenway_goblins`, `dark_spiders_ne` and MOBS `goblin`, `kobold`, `spider` (`src/core/heroes.js`,
`mobKind` in `src/sim/hero.js`).

## Done and verified (by Node tests only)

- All 40 quests can be offered, taken, advanced step by step with made-up reports, saved, loaded and handed in; every
  giver, place, lair, monster group and boss key exists; line lengths (280 panel, 90 balloon); no line names a V thing and
  a T thing together; Thornwick and Cinderford name neither power; Hale never names Velscour or Blackvigil.
- Posted folk on the real brain with the real rigs and clips: a day and a night at their posts, on the ground, never
  fleeing with a danger beside them, turning to the player and back, barking, held by a talk; the town's 41 keep their places.
- Lairs: unique keys, none in water or on a road, slots never over 12, every non-safe site has a lair within r + 320 m,
  every lair has a glade with no pines, all 68 original models used.
- In the headless game: posted people's positions, heights and `offer` marks are right (but see the fault above).

## Done but not verified

- The posted people's bodies in the game (not drawn when looked at), their recoloured textures, their turning and talk
  panel in the browser.
- Nothing was played by hand: no quest accepted in the talk panel, no `end: true` talk paid, no boss kill seen to advance
  a quest in the running game, no lair kill counted in the running game, the trail to a lair or a portal not looked at.
- None of the 71 new lairs was looked at in the game (ground under them, how they read from the road, slot pressure).
- The heroes' three far hunt places: a lair only stands while the player is within its `wake` (110 m), so heroes sent
  there usually find nothing; they may also make the town feel emptier. Consider removing if so.
- `delvePortal('blackvigil')` is the dungeons agent's (-4914, 200); `hasket`'s line says the arch is "before the gate".

## Not done

- Hale's knight body (models agent) and its `hale: true` flag.
- The risen dead have no ground at the Cairnfield or the barrows (`GRAVEYARDS` in `src/sim/undead.js` is the town's own).
- No quest marks on the map (`src/ui/map.js`).
- No recorded voice for any new line (only Lisandra is voiced; the voice test doesn't cover these).

## What auto-play must learn (`src/ui/autobrain.js`, `autowarrens.js`; `node tools/autoplay/check.mjs` lists it)

- The 40 quests in PLAN with the levels above; givers `osric dorcas wymond hasket colm ysolt garrick hale` (people past
  `PEOPLE.length`: found with `townUI.whereOf`, far from town).
- Steps: `foe` on kill; `boss`; `talk` with `end`; `enter`/`kill` at `lair:<key>`, at a dungeon key, at `waste`, and at the
  new sites (thornwick, cinderford, frostwatch, deepsmouth, cairnfield, causeway, tor, charmill, wayhouse, oldtoll,
  quarry, khel, crossroads, grove); `area()` and `HUNTS` for each (use `placeSpot`).
- `LAIR_LEVEL` for the 71 lairs above. Without a level it keeps `wake + 15` m clear of a lair till level 10, and the
  roadside lairs are 45 to 110 m off the roads, so the roads may be blocked for it until levels are given.
- The two new dungeons' rooms, ways through and boss fights (the dungeons agent's list), and that their portals need a party.
- The jelly camp `mile`.
