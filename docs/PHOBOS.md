# City State Phobos : Castle Velscour

The biggest zone in the game, and its ending. The owner asked for it on 2026-11-14. This file is the plan: what it is, where it
goes, the order it's built in, and the rules. What's left to do, and what didn't pass the critics, is in
[PHOBOS-TODO.md](PHOBOS-TODO.md). Read both before starting any chunk, and update both when you finish one.

Work lives in the worktree `work/bm-phobos` on branch `phobos` (cut from origin/main b6aa9e5, which has the owner's textures).
Each chunk gets its own branch and PR off main when it's ready; nothing is merged without the owner.

## The four parts

1. **The City State.** A walled city of tight streets and alleys, crowded with houses, forts, guard towers and squares. A wall,
   a moat and a giant drawbridge. Thieves, evil mages, necromancers, every kind of undead, and Velscour's own: knights,
   generals, dukes, sergeants, wizards, sorcerers, necromancers, liches. Foes respawn over time. Most houses can be gone into:
   burnt out, run down or abandoned in the poor quarters, finer in the mages' quarter. Many portals (seals) to tag. Six
   dungeons open from it.
2. **The Sewers.** A huge labyrinth under the city, an area of its own. Reached from the city and from tunnels and outfalls
   that lead out to the moat. Undead, spiders, worm things, slimes and worse. World bosses and quest hubs of its own: the
   sewer-keepers' office and Princess Apricot's court (below).
3. **Castle Velscour.** A massive branching labyrinth of a castle, with stairs up and down in dozens of places to dozens of
   wings. Eight dungeons inside. Some wings stay locked until you have keys from dungeon bosses, earned through dozens of
   quests. The Librarian's home is deep in the ancient library.
4. **Velscour's Keep.** On top of the castle (owner, 2026-11-15). Giant, thick towers fought through floor by floor, climbing. Bridges between towers, balconies, and
   stairs that wind round the outside, with boss fights on all three. Five dungeons, each run at least five times for the
   materials that open the next sections, and finally the last dungeon, to the top, where Velscour is fought.

**World bosses** stand in important spots in all four parts: big, not very hard, slow to kill, respawning, a better chance of
good gear, and the targets of quests.

## Rules for this zone

- **The V and T rule** (CLAUDE.md): nothing with a V near anything with a T. Phobos is Velscour's: V everywhere. The people
  here loyal to Tessariel (the hidden knights, the Librarian and his household) are *in hiding*: they carry **no T marks, no
  T items, no blue with gold**, nothing of Tessariel's that could be seen. Their places look like plain folk's. (Owner to
  confirm, see open questions.) Tessariel's places outside (the Abbey at 3950, -2880; Hangman's Cross; the Gallowswood) stay
  1.5 km from any V site; `tools/lands/check.mjs` holds it.
- **The game's name** is "Bellmourn : Velscour's Throne". The town is Bellmourn. The zone is "City State Phobos : Castle
  Velscour"; its parts are the City State, the Sewers, Castle Velscour and Velscour's Keep.
- **The CLAUDE.md checklist** applies to every chunk: auto-play learns every quest, foe, place, spell and item
  (`src/ui/autobrain.js`, `node tools/autoplay/check.mjs`), roads are laid by `tools/roads/lay.mjs`, the living land by
  `tools/wilds/place.mjs`, monster attacks go through `sim.perils`, and phone memory is checked with `tools/phone_memory.mjs`.
- **No letters or monograms** on anything (also keeps the sewer-keepers clear of a certain pair of famous plumbers' caps).
- **Owner models are not edited in shape.** Rigging may change; meshes and skins may not, unless the owner asks.
  Background Blender only for imports (a rigged GLB import drops a 2 m Icosphere into the scene).
- **Critics**: the owner's two-critic system for art, layout and design: a 30-year veteran (3D models, textures, game design)
  and a young up-and-comer with hit games and immaculate taste in design and gameplay. Up to 3 rounds per chunk; what doesn't
  pass round 3 goes into PHOBOS-TODO.md with full notes. The owner can switch them off per task (they did for the three
  sewer characters). Critic approval is not the owner's: show the owner after the rounds and wait.
- **Be lean.** Build each chunk to the point it can be seen and played, then iterate. Don't redo research this file records.

- **The liveries** (owner, 2026-11-15): Velscour's forces are palette swaps; blood red in his area; royal blue, white
  with extra skulls, forest green and grey with gold in particular castle and Keep wings; mixed on the bigger bosses.
  Which goes where: PHOBOS-LAYOUT.md, "The liveries of Velscour's own".

- **The basin and the wall** (owner, 2026-11-15): the cliff-walled basin the city and castle stand in is not round and
  butts up against the north and south gates; the way there meanders; the city wall is a dodecagon. Built as ground in
  chunk 3 (`src/core/east.js`).

- **Order of work (owner, 2026-11-15)**: the basic layout of everything first (the block-out), then quick carve-outs,
  then section by section; two critic rounds per area; pictures every 45 minutes; first sight last; even taller, more
  towers, more bridges than his reference (`art/phobos/owner_reference_section.webp`). See PHOBOS-TODO.md, "The block-out".

- **The city, as the owner wants it lived in (2026-11-16)**: almost every house and tower in the city can be entered; the
  streets have sidewalks where they are useful, and the districts are well-planned zones; street lamps, and lights
  and torches hanging from buildings, so the place looks alive at night; roofs detailed, and small details everywhere
  so it looks lived in. It is full of ruffians, riff-raff and adventurer folk wherever the undead, Velscour's loyal
  and the other horrors between the walls do not congregate. And: the village's half-timbered house walls (`wall_NN`)
  are never used on big walls (Phobos has its own `ph_*` layers: `tools/phobos/textures/wire_layers.py`). He said to
  keep going without waiting for approval.

## Where it goes: the east

**Superseded by [PHOBOS-LAYOUT.md](PHOBOS-LAYOUT.md)** (chunk 1): the walled city is 1.4 km by 1.6 km, the Keep is on
top of the castle, and the east edge is x 11,700. The sketch below is kept for the record.

Today the world runs to `WORLD_EDGE = 5600` m every way (`src/core/lands.js`). The east is Tessariel's side: the Rustwood
and the Abbey of Saint Ossery (north-east), the Gallowswood and Hangman's Cross (south-east). So Phobos goes **past the
current east edge**, behind a mountain ridge, which also keeps it 1.5 km clear of every T site. Proposed (to settle in chunk 3):

| Band (x, metres) | What's there |
|---|---|
| 5,600 – 7,400 | **The Marches.** Rising foothills. Velscour's watch keeps and towers dot the hills; patrols; the first world boss. The Hill Road and the Abbey Road's branches run on east. |
| 7,400 – 7,800 | **The ridgeline.** About 600 m up. The road crosses at a pass. |
| 7,800 – 9,000 | **The Chasm.** A long cut down through the rock. Its far mouth is where Phobos is first seen: the walls, the castle, the keep's towers far above. |
| 9,000 – 9,400 | **The moat** and the drawbridge, then the wall, running north–south along most of the east side (about z -5,000 to +5,000). |
| 9,400 – 13,000 | **The City State**, rising toward the castle crag in the east middle. |
| ~12,000 – 13,500 | **Castle Velscour** on the crag, and **Velscour's Keep**'s towers above it, the highest ground in the world. |

The east edge moves to about 13,500 (the other three edges stay at 5,600). What must change with it: `LAND_EDGE`, the nav
edge (`NAV_EDGE`, `src/sim/world.js`), the far-land texture and the map (`src/ui/map`), the living land's placement, and
the phone memory budget. The Sewers lie under the city, and the city's dungeons, the castle's and the keep's are delves
(built on the GPU only while you're in them, like the existing delves).

### First sight

Over the ridge and down the long chasm, the player comes out with the walls ahead, the castle beyond and the keep's
connected towers high above. **In auto-play** the hero stops and stands in awe while the camera sinks low and pans up the
castle, for about **5 minutes**. A setting, *"Pause auto-play at first sight of Phobos"*, stops auto-play there instead so
the player can take it in and play on themselves. It plays the first time only.

## The City State

**Districts** (a first list; chunk 1 lays them out): the Drawbridge Gate and the Barbican; the Cinder Quarter (burnt out);
the Rookeries (slum tenements, alleys a cart can't pass); Gallows Market; the Tanners' Steps; the Mages' Rise (fine stone
houses of the evil mages); the Bone Yards and the City Ossuary; the Barracks Ward with the parade ground; the Dukes' Row; the
Drowned Wharf on the inner canal; the Guard Tower Ring along the wall; the Castle Approach.

**Streets**: a labyrinth, not a grid. Main streets carry patrols; alleys, courtyards, roof-walks and broken walls make short
cuts. Houses are butted wall to wall, two to four storeys, many enterable: a modular house kit (walls, floors, stairs, roofs
in kit pieces, burnt, ruined, poor and rich variants) dressed by rules, not by hand.

**Safe places and quest hubs** (names are first drafts for the owner):
- **The thieves' guild**, *the Pennyless*: steal from the rich, give to the poor. Their hideout is under a burnt chandlery.
  You team up with them; heists in the Dukes' Row and the Mages' Rise.
- **Tessariel's hidden knights**, *the Quiet Watch*: a hidden compound. You find it by word of mouth, or they find you and
  invite you in. No T marks (in hiding).
- **The demon hunters**, *the Ashwardens*: holed up in the most remote corner of the city.
- **The sewer-keepers' office** (in the Sewers, near an entrance) and **Princess Apricot** (the far side of the Sewers).

**Quests through the whole game**: as the player levels, people elsewhere ask them into Phobos from time to time (a level
band per visit), so it's never a stranger. Once every other quest in the world is done, a big run of Phobos quests opens.

**Six dungeons** from the city (first drafts): 1. *The Cistern Maze* (flooded locks in the sewers), 2. *The Undercroft* (giant
catacombs under the city), 3. *The Tower of the Ninefold Eye* (raiding a wizard's tower, floor by floor), 4. *Ironmercy
Gaol* (the prison), 5. *The Rotting Hospice* (plague house), 6. *The Gilded Vault* (the dukes' counting house; a heist with
the Pennyless).

## The Sewers

A labyrinth, tunnels, cisterns, sluices, collapsed vaults, fungus caverns. Entrances in the city (grates, wells, cellars) and
outfalls to the moat and outside the wall. Undead, giant spiders, worms, slimes, rat swarms, drowned things, fungus horrors.
World bosses (e.g. a spider queen, a great worm).

**The sewer-keepers.** Two mustached brothers who keep the sewers (plumbers, in short): **Martleboro** (red light leather
armour) and **Louis G** (said "Luigi", green light leather armour). They've set up an office near one of the entrances and
send you to pick mushrooms of every kind, to kill monsters and pick mushrooms off their corpses, and to cross to the far side
of the sewers on errands for their "princess".

**Princess Apricot** keeps court on the far side. She's the Bellmourn townswoman's model with the long red curly hair and the
short undercut (`redhead`, Tamsin Reed's body, `FEMALE VILLAGER - PETITE RED CURLY UNDERCUT.glb`) out of her villager clothes
and into something skimpy and revealing, in keeping with the brothers. Her own quests.

Characters' state: see PHOBOS-TODO.md, chunk 0.

## Castle Velscour

A massive branching labyrinth with stairs up and down in dozens of places. Wings (a first list; chunk 8 lays them out): the
Ancient Library, the Barracks and drill halls, the Great Hall, the Sanctuaries (V only), the Armoury, the Kitchens and
cellars, the Servants' Warren, the Portrait Gallery, the Clock Tower, the Alchemists' wing, the Menagerie, the Ossuary
Chapel, the Treasury, the Map Room, the Observatory, the Hall of Mirrors, the Horn Galleries, the Forge, the Conservatory of
dead plants, the Aqueduct, the Oubliettes, the Generals' Crypt, the Throne Antechambers.

**Keys**: some wings open only with keys from bosses of particular dungeons, which open as you work through dozens of quests
in the castle.

**The Librarian** (name to choose) has an office deep in the ancient library that is really his home, and fairly large. Four
others stay with him, all loyal to Tessariel. He's a powerful mage hiding his allegiance from Velscour behind deception magic.
He and his household give quests all through the castle and help you gather what's needed to craft **the sacrificial idol**,
which opens the Keep. The idol's materials come from all **eight castle dungeons, each run at least five times**.

**Eight dungeons** (first drafts): *the Drowned Archive*, *the Iron Barracks*, *the Gallery of a Thousand Portraits*, *the
Clockworks*, *the Alchemists' Undercroft*, *the Menagerie of Chains*, *the Ossuary Chapel*, *the Hall of Mirrors*.

## Velscour's Keep

Several huge, thick towers, extremely vertical. Each floor is big enough to take a while to clear; then you climb. Bridges
between towers, balconies off them, and stairs and paths that wind round their outsides, with boss fights on all of these.
**Five dungeons** off the Keep (first drafts: *the Ember Spire*, *the Storm Spire*, *the Bone Spire*, *the Shadow Spire*, *the
Blood Spire*), each run at least five times for the materials that unlock the next sections of the Keep, and in the end the
**final dungeon**, *the Throne Above*, to the top.

### Velscour

The owner's models (2026-11-14):
- `F:\!    BM V2\DEMON LORD VELSCOUR - HUMAN FORM.glb` (11.7 MB)
- `F:\!    BM V2\DEMON LORD VELSCOUR - DEMON MODE.glb` (10.8 MB)

Both need heavy rigging work, the demon form's wings above all (wing bones and finger bones like the Elder Dragon Gods'
rigs), and a bank of new clips for the fights. That's done near the end, in chunk 12.

**The fight**, raid style. Take the research and the fight framework from the Elder Dragon Gods
(`work/bm-dragons/docs/ELDER-DRAGONS.md`, and `src/sim/delve-fights.js`: deck, marks, steps, order), and use the same kind of
WoW-style mechanics for the other boss fights in the zone too.
- **Human form** (mage and paladin): several hard phases.
- His body catches fire and his **demon form** rises: a whole new, harder fight with crazier mechanics and more phases.

**The ending.** A cinematic: you stand on the balcony atop his tower looking over the world, and a terrible feeling comes
over you, that the world has just changed for the worse. The castle starts to shake; you and your party burst into light in a
beam going up. You wake in Bellmourn: Lisandra teleported you back and saved you from the evil about to swallow the castle,
because Velscour can never truly die. Then the game tells you **Hard** and **Mythic** modes are open on every dungeon.

## After the ending

**Hard and Mythic** on every dungeon in the game, for level 200. The game keeps each dungeon's **top 10 run times** per mode,
with your **average DPS** over the run and your **gear score** when you finished.

**Pinnacle levels.** Level 200 is the cap, but XP keeps coming: each level past it gives 1 **Pinnacle Point** and +1 Pinnacle
Level. The **Pinnacle menu** spends points: increased magic damage, MP regen, HP regen, defence, max HP, bag space (5 points),
a little move speed, staff casting speed, spell casting speed, and more (crit chance and damage, cooldowns, resistances, gold
and magic find, potion strength, shield block, companions' health, surf speed). Each point does little; 50 to 100 points
together are a real difference. The loop: better gear and points let you clear Hard faster, then start on Mythic, then clear
all of Mythic, then chase times, and on into new content as it's added.

## Textures

- **The owner's folder** `assets/citystatephobos/`: about 126 raw photographs (pexels and vecteezy: stone walls, bricks, castle
  masonry; not seamless) and ChatGPT's seamless tiles (`Bellmourn_Inner_Walls_20`, `_Revised`, `Bellmourn_Phobos_Interior_Batch_02`,
  `Bellmourn_Phobos_Velscour_Batch_01`, `Bellmourn_Rugs_and_Carpets_20`, each with a CATALOG, CONTACT_SHEET and EDGE_CHECKS).
- **Photos made seamless**: crop each to a span that repeats (find the course and joint period of the masonry, cut on mortar
  lines so the edges meet), then hide what's left with offset blending and histogram-preserving stochastic tiling in the
  shader, so no seam or repeat is seen. Check every one at 3x3 tiling on a contact sheet before use. Photos that can't be
  made to repeat are used whole, on surfaces sized to them (a single gate face, a plaque, a floor slab).
- **Also**: every texture already in the game, the Tripo textures in `art/tripo-textures`, and anything usable from
  velscourtactics.

## Assets from velscourtactics

Pull over anything that could serve Bellmourn: new NPC and player models, monsters, textures, houses, furniture, terrain,
trees (repo Agilancer/velscourtactics, local copy `work/velscourtactics`; models made by Meshy, list in its `docs/MODELS.md`).
Each goes through a few Blender MCP passes for the right animations and enough polygons and texture resolution to look right
in Bellmourn. Tell the owner about any that aren't good enough.

## Castle design research

Done properly in chunk 1, before anything is laid out. Starting points: the 2D Castlevanias' interconnected castle (one map,
wings with their own look and music, locked ways opened later, warp rooms, save rooms, vertical shafts like the clock tower,
short cuts that loop back, landmarks you navigate by), the 3D ones (Lament of Innocence, Lords of Shadow), the Souls games'
castles (Anor Londo, Lothric, Drangleic) and Bloodborne's Yharnam for a city of tight streets climbing to a castle, and real
places: Carcassonne (double walls, 52 towers), Malbork (the biggest castle by area), Krak des Chevaliers, Mont-Saint-Michel
(a town climbing to an abbey), Prague Castle. Phobos is to be far bigger than any of them.

## The order it's built in

Each chunk: build, critics (up to 3 rounds, unless the owner says otherwise), show the owner, wait, PR. Details and status of
each are in PHOBOS-TODO.md.

0. **Apricot, Martleboro, Louis G**: pictures, owner approval, then 3D, rig and clips.
1. **Research and the layout bible**: castle research; a full map of all four parts with districts, wings, towers, dungeons,
   hubs, world bosses, portals and the key/idol gates; critics on the layout.
2. **Textures**: the seamless pipeline for the photos; material sets for city, sewers, castle and keep.
3. **The east**: the new land band, the Marches' keeps and towers, the ridge, the chasm, the roads, first sight and its
   auto-play scene and setting.
4. **Wall, moat, drawbridge and the city's bones**: the street labyrinth generator, the house kit and its interiors,
   streaming and instancing so it runs (phone included).
5. **The city's people and hubs**: factions, respawning, the three hubs, portals, the levelling drip quests and the endgame arc.
6. **The Sewers**: the labyrinth, entrances and outfalls, monsters, the sewer-keepers' office, Apricot's court, mushroom
   quests, world bosses.
7. **The city's six dungeons.**
8. **Castle Velscour**: wings, the stair graph, key gates, the Librarian's home and household, quests.
9. **The castle's eight dungeons** and the sacrificial idol (materials and crafting).
10. **Velscour's Keep**: towers, bridges, balconies, outside stairs; the five dungeons; section unlocks.
11. **World bosses** in all four parts.
12. **Velscour**: the final dungeon, his two models rigged (the demon's wings), new clips, the human and demon fights.
13. **The ending**: the cinematic, Lisandra's rescue, Hard and Mythic unlocked.
14. **Hard and Mythic**, run timing, top-10 boards with DPS and gear score.
15. **Pinnacle levels** and the Pinnacle menu.
16. **velscourtactics imports** (can run alongside from chunk 2 on).

## Open questions for the owner

1. Phobos past the current east edge (x 5,600 to ~13,500), behind a ridge, as above? (The east inside the edge is Tessariel's.)
2. Blackvigil Keep, Velscour's keep in the west, stays as his outer watch keep, and his throne is in Phobos?
3. The hidden Tessariel loyalists show nothing of Tessariel's, to keep the V and T rule?
4. Names: the Librarian and his four, the thieves' guild, the hidden knights, the demon hunters (drafts above).
5. Meshy: the API key the Meshy connection uses has hit its own credit limit (the account has 4,136 credits). Raise that key's
   limit on meshy.ai, or give the connection another key.
