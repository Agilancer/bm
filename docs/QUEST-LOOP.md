# The quest loop: camps, hubs, and work that's near where it's given

The owner, 2026-11-22: *"Redesign all the quests in the game so that it creates an interesting and fun game loop if
actually playing and is ton of fun to watch as well. Make sure your character isn't given quests to travel 9 miles just
to kill a guy, and run back, and crap like that. Have small outposts and camps throughout the world with different NPCs
that have you go into different caves/overworld dungeons to kill monsters or gather things or do other quest stuff, and
have these be in places near and far from the roads so that there's things for the characters to do as they travel
around the world and discover things. Put near landmarks by some of the camps, make sure there's paths, monsters to
kill, and stuff to do out in the game world so your characters aren't spending most of their time running. And make
sure there aren't a bunch of quests around Bellmourn over and over. Send the player out into the world and to Phobos
and all the other interesting places."*

Before this, 50 quests sent you more than 800 m from their giver and back; five of Ser Hale's were a 14.7 km round
trip each (the Bell Tower to Blackvigil); 36 of the land's quests were given in Bellmourn.
`node tools/quests/report.mjs` prints every quest's walk.

## The loop

A **hub** is anywhere work is given: Bellmourn, a small town, a **camp** (`src/core/camps-data.js`), or one of the
land's places with someone posted at it. The loop a player (and auto-play, and whoever's watching it) goes round:

1. You come to a hub because an errand from the last one sent you there (a word to carry: paid where it's said).
2. Its people have three to six pieces of work, all **within 650 m**: a lair to thin, a den to empty of its chief and
   all, things to gather from among monsters, a place to look at, a dungeon's door a few minutes off.
3. You do them in a round trip of a few hundred metres, selling what you've picked up to the camp's sutler.
4. The last of its work is an errand to the next hub along the road, or off it.

So nobody walks a country to kill something and walks back. The walking that's left is the journey out, in hops of a
kilometre or so, each ending somewhere with something to do.

### The rules (held by `tests/quest-loop.test.mjs`; `node tools/quests/check.mjs [region]` lists what breaks them)

| # | Rule | Number |
| --- | --- | --- |
| 1 | **Work is local.** A quest handed in to whoever gave it never takes you far from them. | every step within `LOCAL` = 650 m of the giver |
| 2 | **Errands are one-way and short.** A quest that takes you further ends there (its last step a `talk` with `end: true`, paid there), at the next hub. | `LEAD` = 1,850 m at most |
| 3 | **Bellmourn is the first hub, not the only one.** | `TOWN_MAX` = 17 quests given in Bellmourn |
| 4 | **Every camp has somebody posted, somebody who buys, and work.** | `CAMP_MIN` = 3 quests a camp |
| 5 | **Every hub is come to** by an errand from another, all the way back to Bellmourn. | |
| 6 | **A hub's work is of several kinds.** With four quests or more, three kinds at least among: kill, clear (a den), gather, visit, bring, delve (a dungeon), word (an errand), night. | `KINDS_MIN` = 3 |
| 7 | **Each hub sends you on**, unless it's the end of its road (`ROADS_END` in `tools/quests/rules.mjs`). | |
| 8 | **A den to empty is pinned** (`DENS`), within reach, and of a level with the quest. | quest level no more than 2 under the den's |
| 9 | **A lair to hunt at is of a level with the quest** (`LAIR_LEVEL` in `src/core/tripo-monsters.js`, or the lair's own `lvl`). | no more than 2 under |

What makes it fun to play and to watch, which no test can hold and the critics are for:

- **Each quest is a small story with a turn in it**, told in the giver's own voice, not "kill 5 of X". Somebody
  wants something for a reason you can see from where they stand.
- **A hub's quests cross each other's ground**, so one trip out does two or three of them: the den is past the lair,
  the things to gather lie round the den.
- **Something is always in sight**: the camp's landmark from the road, the den's stockade from the camp, the next camp
  named by the last.
- **The fights step up** through a hub: a lair of four, then a den with its chief, then (at the big hubs) a dungeon.
- **Pay grows with distance and danger**, and each hub's last quest pays something to keep (an item, a charm).
- **No two hubs in a row feel the same**: carters, reed-cutters, a hidden watch, players with a wagon.

## What's there to build with

### Hubs and camps

`CAMPS` in `src/core/camps-data.js`: 29 camps, each a place (`SITES[key]`, `camp: true`): its ground levelled and
cleared, named on the map, with a way of its own to its front (`tools/roads/lay.mjs`). `src/core/camps.js` builds each
by its `style` (halt, drovers, fold, pilgrims, reeds, watch, hunters, diggers, scouts, refugees, peat, players) with a
`mark`, its landmark, stood tall at its back (waystone, stone, arch, hull, beacon, cairn, crane, mast, ribs, stones,
block, deadtree, wagon). A phone has each camp's fire, one shelter, its cart and its landmark; the rest is a PC's and
stops nobody. People stand on a camp's four posts (`campPost(key, 0..3)`: by the fire, at the sutler's board, across
the fire, by the landmark). The old places have their own spots (`node tools/lands/check-sites.mjs --spots`, slow; or
read `K.spots` in `src/core/sites.js` and `src/core/places.js`).

To move a camp or add one: `node tools/quests/spot.mjs --find <x> <z>` for sound ground, change `CAMPS`, then **the
whole chain**: `node tools/wilds/place.mjs && node tools/roads/lay.mjs && node tools/roads/bed.mjs`, then
`node tools/lands/check-sites.mjs` (eight minutes) and the land's tests (`tests/roads.test.mjs`,
`tests/auto-roads.test.mjs`, `tests/roadbed.test.mjs`, `tests/sites-lean.test.mjs`, `tests/wilds.test.mjs`,
`tests/quests-beyond.test.mjs`, `tests/hunts.test.mjs`).

### People

In a region's file, `src/folk/regions/<region>.js`, `PEOPLE`:

```js
{ id: 'tobin', camp: 'hillfoot', name: 'Tobin Wain', title: 'Carter, at Hillfoot Halt', body: 'c_worker_2_1', sex: 'm', age: 54,
  post: campPost('hillfoot', 0), face: campFace('hillfoot', 0), trade: 'sutler', idles: ['fold_arms', 'look_around', 'idle'] },
```

- `body`: one of the camps' own, `c_<body>_<1-3>` (`tools/folk/camp_swaps.mjs`: men `elder`, `sage`, `worker_2`,
  `dude`, `smith`, `wes`, `worker`, `old_man`; women `wife_jolly`, `young_2`, `crone`, `young_3`, `wife_big`,
  `young_5`, `redhead`, `young_4`, `worker_f`, `young_1`). They're Bellmourn's bodies recoloured, so they cost a phone
  nothing. Don't use Phobos's crowd bodies out here: each is a model and three pictures more to hold.
- `trade: 'sutler'`: buys anything, sells a roll and a dressing (`src/folk/shops.js`). **One at every camp.**
- `idles`: clips from `assets/game/folk/clips.json` (`idle`, `idle_ual`, `fold_arms`, `fold_arms_ual`,
  `look_around`, `wait`, `scratch`, and others the town's people use).
- Someone at an old place: `post: [x, z]` on one of its spots, clear of colliders, and no `camp`.
- Each needs `LINES[id]` in `src/folk/lines/regions/<region>.js`: `first`, `greet` (morning, day, evening, night),
  `about`, `ask` (with `topics`), `bye`, `barks`, as `dorcas` has in `src/folk/lines/land.js`. A sutler also wants
  `shop: { open: [...], closed: [...] }`.
- And a paragraph in `tools/folk/cast.md` (who they are, what they talk about, one line that's theirs).

### Quests

Workings in `src/folk/regions/<region>.js` (`RULES`, and `LEVELS`: the level each wants), every word in
`src/folk/lines/regions/<region>.js` (`QUESTS`). The steps (`src/folk/quests.js`, the top of the file):

| Step | What it is |
| --- | --- |
| `{ talk: id, say }` | a word with someone; with `end: true` the quest ends and is paid there (an errand) |
| `{ back: true, say }` | back to the giver |
| `{ kill: place, n, foe? }` | put down n at a place: `'lair:<key>'`, `'outpost:<den key>'`, a site's key, a dungeon's |
| `{ clear: 'den_<name>' }` | empty a pinned den: its chief and all its own. **New.** |
| `{ gather: place, n, what }` | pick up n things lying round a place (each glints; walk up to it). **New.** |
| `{ enter: place, night? }`, `{ visit: [places] }` | get there; see each |
| `{ bring: mat, n, at? }` | n of a material from the dead (bone, iron, silk, wax) |
| `{ boss: key }` | a dungeon's boss (`BOSSES` in `src/core/dungeon.js`) |

A quest's words: `title`, `giver`, `about`, `offer` (2+), `accept`, `acceptLine`, `decline`, `declineLine`,
`journal` (one line a step), `progress`, `done` (2+), `after`, and `others: { <id>: [...] }` for everyone a `talk`
step names (what they say when you bring the word). Lines are 280 letters at most (a journal line 320; `accept`,
`decline` and a step's `say` 70). `tests/quests-beyond.test.mjs` walks every one through.

Pay (as a guide; the first pass paid three times this and the ring round Bellmourn came to ten levels): a small kill,
gather or visit quest about 22 xp a level; a den about 40 a level and something to keep; an errand 30 to 35; a
dungeon's boss 250 a level and an item; gold about a tenth of the xp. A level is `90 * (level - 1) ^ 1.75` xp in all
(`src/items/levels.js`): a hub's quests should come to about half a level, its kills the rest.

What the critics of the first region found, which holds for every region:

- **Ask for one fewer than a lair holds** (`kill n` under its boss and n together): a missed count leaves auto-play
  hunting an empty lair for ten minutes.
- **A hub's levels step up, and neighbouring hubs don't share a band.** Errands on are a level or two above the hub's
  own work, so auto-play finishes the hub before it follows one.
- **Two people at a camp** where there's the work for it: one gives most of it and keeps the board, the other has a
  quest of their own. The same face for six quests is dull to play and to watch.
- **No two hubs open the same way**, and no twist is used twice in a region.
- **Don't send anyone back up the road they came in by.** What stands beside the road in belongs on the errand in
  (a `kill` step before its `talk`), so the walk has a fight in it; the hub's own work lies beyond it.
- **Things to gather lie outside a den's sight** (38 to 53 m from its middle), so "round the outside" is true; give a
  step its own `spots` to put one or two close in.
- **Say only what the game shows.** No animals stand at the camps; a walk to somewhere must have something seen or
  done at the end of it. Distances in paces under 500 m, and about a quarter-hour for 850 m above that.
- **`needs` only where the words need it** (and on the errand on, which needs the hub's last quest). Auto-play holds
  its hand-ins while other work is within 450 m, so a hub's quests are done in one round.

### Things to fight and find

- **Lairs** (`LAIRS` in `src/core/tripo-monsters.js`): hand-placed, 101 of them. A new one near a hub is a line there
  and a level in `LAIR_LEVEL` (`src/core/tripo-monsters.js`); then the chain above from `lay.mjs` on. Keep it 150 m from
  anyone posted (85 m at a camp) and off the roads.
- **Dens** (`DENS` in `src/core/camps-data.js`): 78 outposts pinned near the hubs, named, each of a faction
  (`FACTIONS` in `src/core/wilds.js` says who's in it, how it's built and its level). They're "overworld dungeons": a
  stockade, diggings, a barrow, a ruin, with a chief. Renaming one or changing its faction is a change there and then
  `place.mjs`, `lay.mjs`, `bed.mjs`. `node tools/quests/sheet.mjs <region>` lists the ones round each hub and says
  which no quest uses yet.
- **Dungeons** (`DELVES`): the Warrens (by Bellmourn), the Drowned Vaults (the Sunken Mile), the Sporehold (the Fungal
  Ring), the Hollow Playhouse (the Twisted Grove), the Kingsbarrow (the Barrows), the Howling Deeps (Frostwatch),
  Blackvigil Keep (the end of the Vigil Road), the Elder Dragon Gods (the Sorrowhorn's crown), the Redoubt (the Sill).
  Each one's quests are given by someone within 650 m of its door.
- **The living land** does the rest by itself: tears, meetings on the way, raids, bounties, small things to find
  (README, "The living land").

## The spine: every hub, who's there, and what sends you on

Levels are about what a player is when they're there. The first name at each hub is who an errand to it is said to.
New people are marked *; the rest are there already. A region's maker may add people or change a name, but the ids
here are what the other regions' errands point at.

| Region | Hub | Level | Who | Sent here from | Sends on to |
| --- | --- | --- | --- | --- | --- |
| bellmourn | Bellmourn | 1-9 | the town; Lisandra | | hillfoot (Hob), withy (Sabine), forkstone (Jory), palmers (Aldric) |
| | hillfoot, Hillfoot Halt | 3-5 | `tobin` Tobin Wain, carter; `bet` Bet Carrow, carter | Bellmourn | cairnwatch |
| | withy, Withy Landing | 4-6 | `maren` Maren Rush, withy-cutter; `tully` Tully Rush, her cousin | Bellmourn | sedgebank |
| | forkstone, the Forkstone | 5-7 | `nan` Nan Dray, drover; `dickon` Dickon, her herd-lad | Bellmourn | trackside; fellfoot |
| | palmers, Palmers' Rest | 6-8 | `perrin` Old Perrin Lowe, palmer; `hild` Hild Ames, palmer | Bellmourn | ashgate; mossgate |
| downs | cairnwatch | 5-6 | *`cuddy` Cuddy Stone, cairn-keeper | hillfoot | hamlet |
| | hamlet, Millhaven (with the farm and mill) | 5-7 | *`abel` Abel Fenwick, farmer (Hob's cousin); *`joan` Joan Millward, at the mill | cairnwatch | belltower; dunmow |
| | belltower | 6-9 | `bellwright`, `hale` | hamlet | stonecarters |
| | dunmow, Dunmow Fold (off the roads) | 6-8 | *`rafe` Rafe Dunmow, shepherd | hamlet | thornwick |
| | kestrel, Kestrel Hide (off the roads) | 9-11 | *`sib` Sib Kestrel, fowler | thornwick | (road's end) |
| fen | sedgebank | 6-8 | *`odo` Odo Marsh, eel-catcher | withy | mileend |
| | mileend, Mile-End Camp (the Drowned Vaults' door) | 8-11 | *`tamar` Tamar Dyke, salvager | sedgebank | sallow; eelpot |
| | sallow, Sallowmere | 10-12 | *`grizel` Grizel Wade, ferrywoman | mileend | chapel |
| | eelpot, Eelpot Hythe (off the roads) | 10-12 | *`pike` Pike Hallam, eel-trapper | mileend | (road's end) |
| | chapel, the Drowned Chapel (Tessariel's) | 12-14 | *`oriel` Sister Oriel | sallow | (road's end) |
| deepwood | mossgate, Mossgate Hide (off the roads) | 8-10 | *`fenn` Fenn Hollis, trapper | palmers | hermit |
| | hermit, the Hermit's Hollow | 9-11 | *`bede` Old Bede | mossgate | stair |
| | stair, the Broken Stair | 11-13 | *`isla` Isla Crag, guide | hermit | crown |
| | crown, the Crown of Teeth (the Elder Gods' door, 100) | 11+ | *`yrsa` Yrsa, who watches the lights | stair | (road's end) |
| rustwood | stonecarters | 8-9 | *`jem` Jem Sledge, stone-carter | belltower | quarry |
| | quarry, Ossery Quarry | 9-11 | *`marta` Marta Rudd, quarry-mistress | stonecarters | abbey |
| | abbey, the Abbey of Saint Ossery (Tessariel's) | 11-12 | *`caddoc` Brother Caddoc, almoner | quarry | emberwatch; cutters |
| | emberwatch (off the roads) | 12-13 | *`rowan` Rowan Slate, fire-watcher; *`hollis` Hollis Wick, collier | abbey | fungus |
| | fungus, the Fungal Ring (the Sporehold's door) | 13-14 | *`dilly` Dilly Roe, mushroomer | emberwatch | abbey |
| | cutters, the Woodcutters' Camp | 15-16 | *`huw` Huw Axton, foreman; *`bryn` Bryn Pitt, sawyer | abbey | lasthearth |
| | lasthearth, Last Hearth | 16-17 | *`tibb` Mother Tibb; *`corin` Corin Vale, outrider | cutters | marchfoot |
| waste | ashgate, Ashgate Halt | 6-7 | *`dag` Dag Colley, carter | palmers | cinderford |
| | cinderford | 7-12 | `hasket`, `colm`, `ysolt` | ashgate | khel |
| | khel, the Caravanserai (and the Charred Mill) | 12-13 | *`sarn` Old Sarn, last porter of Khel | cinderford | hollowwatch; scavengers |
| | scavengers, Scavengers' Pit (off the roads) | 15-17 | *`mab` Mab Crowe, scavenger | khel | (road's end) |
| | hollowwatch, the Hollow Watch (hidden; Blackvigil's door) | 14-18 | *`renn` Captain Tolan Renn (Cinderford's lost captain); *`vesna` Vesna Kell, scout | khel | (road's end) |
| moor | trackside, Drovers' Stance | 5-7 | *`amos` Amos Tye, drover | forkstone | wayhouse |
| | wayhouse, the Moor Wayhouse | 9-10 | *`alis` Widow Alis Penn | trackside | peatrick; diggers |
| | peatrick, Peatcutters' Rick (off the roads) | 11-13 | *`brom` Brom Tarn, peat-cutter | wayhouse | (road's end) |
| | diggers, the Diggers' Camp (the Kingsbarrow's door) | 10-18 | *`lucan` Master Lucan Dree, antiquary; *`sal` Sal Mattock, digger | wayhouse | stones |
| | stones, the Nine Maidens | 12-13 | *`morwen` Old Morwen, who counts the stones | diggers | (road's end) |
| fells | fellfoot | 8-10 | *`berin` Berin Stoat, packman | forkstone | frostwatch |
| | frostwatch (the Howling Deeps' door) | 9-16 | `garrick`; *`signy` Signy, quartermaster | fellfoot | hoarhide; climbers; shrine |
| | hoarhide, Hoarfrost Hide (off the roads) | 12-14 | *`ulla` Ulla Thorsby, trapper | frostwatch | (road's end) |
| | climbers, Climbers' Rest (Ravens' Tor) | 13-15 | *`dain` Dain Scree, climber | frostwatch | (road's end) |
| | shrine, the Frozen Shrine (Tessariel's) | 10-11 | *`brynn` Sister Brynn | frostwatch | (road's end) |
| gallows | thornwick | 8-11 | `osric`, `dorcas`, `wymond` | dunmow | kestrel; oldtoll |
| | oldtoll, the Old Toll | 11 | *`ann` Ann Arden, the toll-keeper's daughter | thornwick | crossroads |
| | crossroads, Hangman's Cross | 12-14 | *`crowle` Master Crowle, the hangman | oldtoll | candlecamp; wagon; witch |
| | candlecamp, Corpse-Candle Camp (off the roads) | 13-15 | *`tansy` Tansy Wight | crossroads | (road's end) |
| | wagon, the Players' Wagon (the Hollow Playhouse's door) | 14-15 | *`fabian` Master Fabian Larke, last of the Winter Company | crossroads | (road's end) |
| | witch, Mother Grawl's Hut | 13-14 | *`grawl` Mother Grawl | crossroads | roadsend |
| | roadsend | 16-18 | *`wilf` Wilf Carder, wool-factor | witch | tollqueue |
| east | marchfoot | 14-16 | *`hester` Hester Pyke | lasthearth | widowslee |
| | tollqueue, the Long Queue | 17-18 | *`rollo` Rollo Bask, carter | roadsend | widowslee |
| | widowslee, Widow's Lee (hidden) | 18-22 | *`ines` Sergeant Ines Mar | marchfoot; tollqueue | sill |
| | sill, the Sill | 3-5, then 20 | `fv_wenna` Wenna Coyle | widowslee (and Lisandra's door, at 1) | Phobos (`ph_penny`) |
| phobos | the city, its sewers and the castle | 20-110 | its three hubs and its streets | sill | (its own) |

The dungeons' quests move to whoever stands by their doors: the Vaults' to `tamar`, the Sporehold's to `dilly`, the
Playhouse's to `fabian`, the Kingsbarrow's to `lucan`, the Deeps' to `garrick`, Blackvigil's to `renn`, the Elder
Gods' to `yrsa`. The Warrens' stay Bellmourn's (its door is 240 m from the square).

## The two letters, out here

V is Velscour, T is Tessariel; nothing of one goes near anything of the other (README, "The two sides").

- The camps are plain folk's: nobody at one names either power, and nothing built at one carries a letter, a cross, his
  red or her blue and gold. A camp's people say "the keep", "red over black", "the tower on the knoll", "the sisters".
- The Abbey, the Drowned Chapel, the Frozen Shrine and the Bell Tower are Tessariel's: their people never name
  Velscour or his keep.
- The Hollow Watch and Scavengers' Pit are in the Ashen Waste, in sight of his forts: plain folk hiding, who name
  nothing of hers.
- No line names anything of one beside anything of the other (`tests/quests-beyond.test.mjs` reads every line).

## Making a region (what its maker does, and what the two critics look at)

1. `node tools/quests/sheet.mjs <region>` and `node tools/quests/map.mjs <region>` (a picture, `tools/build/quests/`):
   what's there now.
2. Move or cut the region's old quests (the starter ones in `src/folk/quests.js` and `src/folk/lines/quests.js`,
   `beyond.js`; the land's in `src/folk/land-quests.js` and `src/folk/lines/land.js`) and write the new ones in the
   region's two files. Old words are worth keeping where the quest's the same in a new mouth.
3. `node tools/quests/check.mjs <region>` until nothing's broken there; `node tools/autoplay/check.mjs`;
   `node --test tests/quest-loop.test.mjs tests/quests-beyond.test.mjs tests/quest-log.test.mjs tests/quest-marks.test.mjs`.
4. Two critics read the sheet (`--words`), the picture and the diff, each from their own side: one as a player (is it
   fun to do, does it read, is anything a chore), one as someone watching auto-play (does it flow, is there always
   something happening, would the pathing look silly). Each says approve or revise, with what. Up to four rounds.

## Checked, and not

Checked by test: the rules above; every quest taken, walked through and handed in with made-up reports; every place,
lair, den, boss and person named is there; lines' lengths; the two letters. Auto-play knows the new steps
(`node tools/autoplay/check.mjs`).

Not yet (as of the framework): nobody has played a camp's quests by hand; the camps and their landmarks have been built
and checked for what blocks what, and not looked at in the game.
