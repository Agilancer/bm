# City State Phobos : Castle Velscour — the layout bible (chunk 1)

Where everything goes, what you do there, and the order you meet it. The data is `tools/phobos/layout.json`; the maps
in `art/phobos/layout/` (`overview.png`, `city.png`, `sewers.png`, `castle.png`, `keep.png`, and `section.png`, the
side view to scale) are drawn from it by
`python tools/phobos/draw_layout.py`, which also checks the V and T rule, that the castle's keys can't lock you out,
and that the Keep's top is in view from nine named spots. Change the JSON and redraw; never edit the pictures. Every
name is a draft for the owner. The plan this serves is [PHOBOS.md](PHOBOS.md); status is in
[PHOBOS-TODO.md](PHOBOS-TODO.md). This is revision 4: the critics' three rounds are done (both approved the third; their conditions are met here) and the owner's word that
**the Keep is on top of the castle**.

## Ten rules (from the research; sources at the end)

1. **The Keep is in view** from the road, the drawbridge, every district and every castle ward. Checked by the tool:
   it stands 5.5° tall from the Sill, 12° from the parade ground, 55° from the Great Hall's steps, and no ward wall
   or the city wall cuts the line to its top from any of the nine (`section.png` shows two of the lines).
2. **First sight is staged**: a pinch (the Chasm), then the open view across a gap you can't cross (the moat), on the
   line you're walking.
3. **The gate is a killing ground**: a 30 m moat, a bent uphill passage, the inner gate offset from the outer.
4. **A city is its landmarks, its interiors and what you do in them**, not its street count. Every district has a verb.
5. **Three wards stepping up**, each overlooking the last, and the Keep on top of them all.
6. **Each wing is one silhouette and one great room** with a payoff of its own.
7. **Few rest points, and every wing loops back to one** by a door opened from its far side.
8. **Always two ways**: the defended front, and a side way over roofs, along the water or under through the sewers.
9. **The sewers are small, lit by sector, and drain to the moat** (downstream is out); they go down into older ruins.
10. **The way to the throne doubles back** to about 2.5 times its straight line, with a boss on every crossing.

## Size: one decision for the owner

PHOBOS.md's first sketch made the walled city 3.6 km by 10 km, which could not be filled or run. Here **the zone** is
still the east side, but **the walled city is 1.4 km by 1.6 km** (about 176 hectares, sixteen Carcassonnes, 4.7 km of
wall). About 40% of that is not streets: burnt fields, grave rows, the parade ground, the Slough's basin, the crag's
foot. The castle (640 m by 600 m) stands east of it, the Keep on top of the castle. The east edge moves to x 11,700.

## The east, west to east (`overview.png`)

| x (m) | What | Levels |
|---|---|---|
| 5,600 – 7,300 | **The Marches.** Three keeps and two towers, each with a job (below). Two world bosses. | 14–22 |
| 7,300 – 7,700 | **The ridge**, crossed at **Widow's Notch** (7,500, 0), where the Toll-Giant stands. | |
| 7,700 – 8,950 | **The Chasm.** 1.3 km as the crow flies, about 2.5 km on foot: it meanders (the owner, 2026-11-15), a long bend north, back south, north again, snaking a hundred metres a turn between, from a slot one cart wide to chambers. Half way, **the Broken Span**: the bridge is down, and an ambush comes from the ledges while you cross the fallen stones. The towers are glimpsed at the first bend and hidden at the second. | |
| 8,950 | **The Sill.** The Chasm's mouth, 60 m above the moat plain, on the drawbridge's line. First sight; the first seal. | |
| 8,950 – 9,350 | **The moat plain** and the moat. | |
| 9,350 – 10,750 | **The City State**; **the Sewers** under it. | 20–45; sewers 28–58 |
| 10,750 – 11,400 | **Castle Velscour**, three wards at +70, +90, +115 m, and on top of it **Velscour's Keep**, +115 to +330 m. | 58–112; Keep 112–180 |

**The Marches' five places**: Greywarden Keep (its beacon calls the patrols; put it out and the road is quiet for a
day), the Lantern (a signal tower; lit, it marks the safe line to the pass), Gatewatch Keep (the toll chain across the
road), the Needle (a lookout that opens the Marches' map), Marshal's Hold (Old Marshal Brannoch, world boss). The
nearest V place to a T site is Greywarden Keep, 2,182 m from the Abbey (the rule is 1,500 m).

**First sight, twice.** At the Sill, the first time: in auto-play the hero stands in awe for about five minutes as
the owner asked, skippable, with the setting *"Pause auto-play at first sight of Phobos"*; a player on the sticks just
gets the view. From the Sill the Keep is only 5.5° tall, so the scene is five one-minute beats that go to the place
and preview the route, not one pan:

| Time | Beat |
|---|---|
| 0:00 | The pinch opens. Low camera at the hero's boots on the Sill; the moat plain, the wall, the raised drawbridge. A bell, far off. |
| 1:00 | The city: the camera slides along the wall from the Barbican to the Slough's gate; smoke over the Cinder Quarter, lamps on the Mages' Rise. |
| 2:00 | The wards: a slow climb up the Approach's switchback and over the three ward walls, each higher. |
| 3:00 | The Keep: the five spires named one by one as the camera rounds them, the Wyrm stirring on the Crown Court's roofs. |
| 4:00 | The Throne Tower's top, a figure on its balcony; the camera falls all the way back to the hero. Control returns. |

Sound carries it: a single bell and wind; Lisandra's voice naming the city as low strings begin; drums as each ward
wall is crossed; a choir and each spire's name spoken; silence, then one struck bell. On Low (phones) it runs on a
fixed camera path with the castle and Keep at full detail for the scene only and the city at its far detail.
 The second reveal is earned: the drawbridge is
**up**. You go in by the west outfall, fight up through the Barbican to the winch-house and lower it yourself, bells
ringing across the city.

## The City State (`city.png`)

**The wall is a dodecagon** (the owner, 2026-11-15): twelve straight sides about (10,050, 0), longer north to south, a flat side square to the drawbridge, the castle and the north and south gates (`city.wall` in layout.json). **The basin it stands in is not round**: its cliffs stand about 40 m outside the north and south gates and close hard against the castle's crag (`art/phobos/east/relief_way.jpg`). Inside the wall the ground is as before: climbing from the Slough (−3 m) in the west to the Castle Approach (+55 m). **The King's
Mile** is the spine and bends at every district. **The Slough** runs north to south; **the Corpse Quay**, a towpath up
its east bank, joins the Wharf to the Bone Yards so the north is no detour. Poor and low in the west, rich and high in
the east.

| District | Levels | What you do there |
|---|---|---|
| The Barbican | 20–24 | storm or slip the killing ground; the winch-house and the drawbridge |
| The Cinder Quarter | 20–26 | floors that give way, embers that flare: pick your footing. The Pennyless. |
| The Rookeries | 22–28 | roof-running: chases over the tenements, lines to cut |
| Chainmarket | 24–30 | the patrols' crossroads: time the watch changes, cut prisoners down. The Chain Duke. |
| The Drowned Wharf | 26–32 | one great sluice wheel raises sunk boats into bridges |
| The Tanners' Steps | 26–32 | stepped lanes under dye-vat ambushes. The Quiet Watch. |
| The Bone Yards | 28–36 | the dead rise by rows: break a row's marker to still it. The Ashwardens. |
| The Barracks Ward | 30–38 | curfew: keep out of the lantern light or the alarm pulls the patrol. General Varkoth. |
| The Mages' Rise | 34–42 | wards on every door: find and break each house's anchor |
| Dukes' Row | 34–42 | walled gardens and guard dogs: the heist district |
| The Castle Approach | 40–45 | the switchback under arrow fire: shield walls that move with you |

**Streets.** Three loops hang off the King's Mile so no district is an island: **Ash Lane** (Barbican, Cinder
Quarter, Bone Yards), **the Low Road** (Barbican, Rookeries, Wharf, Tanners' Steps) and **the High Loop** (Bone Yards,
Mages' Rise, the Approach, Dukes' Row, Tanners' Steps), with the Corpse Quay up the Slough.

**Level order.** You arrive at 20. **The Outfall Run**, from the west outfall to the Barbican's drain, is its own
short level-20 stretch, grated off from the West Drains proper, which open at 28. Each dungeon sits a tier above its
district: you clear the streets first and come back for the door.

**Gates.** The Drawbridge Gate (lowered by you). The Charnel Gate (north) and the Tanners' Water Gate (south) are
shortcuts, opened from inside by the Ashwardens' and the Quiet Watch's lines. The Castle Gate is held by the Gate
Captain, a wall at level 68. **Forts**: the Barbican Fort, the Parade Fort, the Dukes' Redoubt. **The Guard Tower
Ring**: of about 78 wall towers, eight can be taken (a chest, a view, a chain that opens a stretch of wall-walk as a
shortcut): the Winch Tower, Cinder Watch, the Charnel Tower, the Mage's Finger, the Castle Bastion, the Dukes' Tower,
the Dyers' Tower, the Rook Tower (squares on the wall in `city.png`). The rest are scenery.

**Hubs** (each safe, each with a seal): the Pennyless under a burnt chandlery in the Cinder Quarter; the Quiet Watch
behind a dye works on the Tanners' Steps (word of mouth or invitation; no T marks); the Ashwardens walled into a
charnel house at the far north tip. **Eight seals** in all: those three, the Sill, Barbican Yard, Chainmarket, the
Parade Ground, the Castle Gate.

**The city answers you.** Each hub's finished line turns its district: the Pennyless reopen stalls in the Cinder
Quarter, the Quiet Watch man the Water Gate, the Ashwardens still the Bone Yards' rows; the hubs visibly grow.

**Auto-play and phones.** Every verb has a plain answer for both. Auto-play takes the King's Mile and the three
loops, never roofs or ledges; it treats curfew light, wards, grave markers and embers as hazards to walk round or
break, the way it already treats perils; heists and chases are fights with a timer for it. On phones (Low) the roof
routes and wall-walks stay but are never required, and moving shield walls and the sluice wheel are scripted, not
simulated.

**Six dungeons**: 1 the Rotting Hospice (30, Rookeries), 2 the Cistern Maze (34, Wharf), 3 the Undercroft (38, Bone
Yards), 4 Ironmercy Gaol (44, Barracks Ward; its warden holds the Approach's portcullis key), 5 the Tower of the
Ninefold Eye (50, Mages' Rise), 6 the Gilded Vault (56, Dukes' Row; the Pennyless' heist).

## The Sewers (`sewers.png`)

About **6 km of tunnel**: four landmark halls and the connectors between them, not a mirror of every street. Eight
entrances (one a district), three outfalls. Water runs to the moat. Nothing is swum, and only one wheel moves: the
Wharf's sluice wheel, seen from below in the Weir Hall.

| Sector | Under | Light | Landmark (with a seal) | Levels | World boss |
|---|---|---|---|---|---|
| The West Drains | Barbican, Cinder Quarter, Rookeries | green fungus | the Great Grate: a fallen street, sky above | 28–36 | the Spider Queen |
| The Slough Mains | Chainmarket, Wharf, Tanners' Steps | blue water glow | the Weir Hall | 34–42 | the Great Worm |
| The Charnel Runs | Bone Yards, Mages' Rise | violet grave light | the Bone Stair, down into older catacombs | 40–50 | the Drowned Abbot |
| The High Conduits | Barracks Ward, Dukes' Row, the Approach | amber old lamps | the Aqueduct Fall | 48–58 | the Lamplighter |

**The sewer-keepers' office** (Martleboro and Louis G) is at the Great Grate, by the Rookery well: the first sector,
the first thing you find. **Princess Apricot's court, the Sunk Garden**, is at the far east end of the High Conduits
under the castle crag, with its own seal, so you cross the sewer to her once (five sewer seals: the four halls and her garden; the keepers'
office shares the Great Grate's). From her garden **the Aqueduct** climbs
into the castle's Lower Ward: the way in at 58, ten levels before you can beat the Gate Captain.

## Castle Velscour (`castle.png`)

Twenty-four wings in three wards. Every wing has one great room with a use (each is written under its box in
`castle.png`):

- **Lower Ward** (+70 m, 58–75). The Gatehouse (the Captain's yard; rest point). The Kitchens (the Great Hearth; rest
  point). The Servants' Warren (unseen ways behind six wings). The Barracks (the drill floor: spar the garrison's
  ghosts for a weapon skill). The Armoury (you arm the Quiet Watch from it). The Forge (the idol is cast here; gear
  reforged). The Oubliettes (the pit stair; prisoners to free, who turn up at the Crown Court later). The Aqueduct
  (the back way from the Sunk Garden).
- **Middle Ward** (+90 m, 75–95). The Great Hall (the long table; rest point). The Portrait Gallery (painting doors:
  three secret links on no map). The Ancient Library (the Librarian's home; rest point). The Map Room (its table marks
  every secret you haven't found). The Alchemists' Wing (the still room: potions past shop strength). The Conservatory
  (reagents for the Alchemists' line, and a boss seed). The Menagerie (the cage rows). The Clock Tower (a shaft climbed
  on moving gears). The Horn Galleries (sound them to change the castle's patrols).
- **High Ward** (+115 m, 95–112). The Sanctuaries (V only: the black nave; rest point, the first wing you reach). The Ossuary Chapel (the Sexton's rites).
  The Generals' Crypt (they get up). The Hall of Mirrors (the way is in the glass: a secret link to the Portrait
  Gallery). The Treasury (two keys deep: a unique reward and a whole idol part). the Observatory (names the Keep's
  spires and shows which are won). The Throne Antechambers (the idol's door).

**The castle answers you**: horns sounded change the patrols, and each key turns a ward (lamps lit, a gate left open,
the household's people moving in).

**Eight dungeons.** Each one's own door is opened by a line of the Librarian's household's quests (dozens in all).
What their bosses' keys do:

| Dungeon (level) | Its key |
|---|---|
| The Iron Barracks (64) | opens the Menagerie |
| The Gallery of a Thousand Portraits (72) | opens the Clock Tower |
| The Drowned Archive (80) | opens **the Sanctuaries Stair**: Library to the High Ward (the High Ward's first way in) |
| The Alchemists' Undercroft (86) | opens **the Crypt door** from the Oubliettes: Lower Ward to the High Ward (its second way in) |
| The Menagerie of Chains (92) | opens the Treasury (with the Mirrors' key: two keys deep; a unique reward and a whole idol part) |
| The Clockworks (98) | opens the Hall of Mirrors |
| The Ossuary Chapel (104; entered by the Sexton's rites, a quest line) | opens **the Horn Bridge**: Horn Galleries straight to the Observatory |
| The Hall of Mirrors (110) | the Treasury's second key |

Three of the eight keys open shortcuts between wards (thick red lines in `castle.png`), not more doors. The tool's
check walks the keys, the three locked links and the Treasury's two keys, starting from both the Gatehouse and the
Aqueduct, and reaches all 24 wings and all 8 dungeons.

**The household** (all loyal to Tessariel, none showing it): the Librarian (the idol); his ward, a map-maker (the Map
Room, the secret links); a lapsed sister of the Sanctuaries (the Sexton's rites); an old quartermaster (the Armoury,
the Forge); a horn-blower boy (the Horn Galleries).

**The sacrificial idol.** One part from each of the eight dungeons, five clears a part: the owner's rule. No two
clears are alike: the first is the story run; the second to fifth each take a different route, boss order and
modifier, and each leaves a permanent shortcut. Spare fifths (from castle world bosses and the household's quests)
never shorten the five: they raise the part's second tier, which strengthens what that part opened. Every finished
part opens something at once. Cast at the Forge; it opens the Throne Antechambers.

**The five clears, written out for one dungeon** (the template for all eight; clears 2 to 5 are each about half
the first's length):

| Clear of the Iron Barracks | Way in | Route | Bosses | Modifier | Shortcut it leaves | Minutes |
|---|---|---|---|---|---|---|
| 1, the story run | the drill yard gate | all four halls in order | the Drill Sergeant, then the Iron Marshal | none | the yard gate stays open | 25 |
| 2 | the armoury hatch | halls 3 and 4 only | the Marshal alone, with his banner guard | reveille: packs wake in waves | a rope down the mess wall | 12 |
| 3 | the mess wall rope | halls 2 and 4, through the bunk lofts | the Sergeant and Marshal together | curfew: lantern light calls reinforcements | the loft bridge | 13 |
| 4 | the loft bridge | hall 4 from above | the Marshal, enraged from the start | no healing fonts | the Marshal's back stair | 10 |
| 5 | the back stair | the Marshal's rooms only | the Marshal and the ghost of the garrison | the bells are ringing (hardest packs) | the part is whole | 10 |

Auto-play may re-run, unattended, any variant you have already cleared yourself, for XP, loot and (after the ending)
Hard and Mythic; it always takes the inside route and never ledges, chains or the gear shaft.

World bosses: the Gate Captain (68), the Feast That Walks (88), the Sexton of the High Ward (105).

## Velscour's Keep, on top of the castle (`keep.png`)

`section.png` is the side view to scale. The spires do not start at one height: each stands on a part of the
castle that carries it up. The Ember Spire stands on the Sanctuaries' nave roof (+115); the Storm Spire on the Clock
Tower's head (+150); the Bone Spire on the Horn Galleries' campanile (+190); the Shadow Spire on the Observatory's
drum (+225); the Blood Spire on the Great Pier, a buttress off the Hall of Mirrors (+255). **The Throne Tower** is one
trunk from the Throne Antechambers (+115) to +330: solid to +285 but for the Crown Court's lift, and the last dungeon
is the twelve floors above the Last Stair's landing. The Crown Court is at +115. In plan the spires ring the trunk on its north, east and south (z −95 to +95), so from
the Sill they stand out to either side of it: a tall trunk with five shoulders stepping up round it. **The Crown Court**, the roof terrace at their feet, is
the Keep's hub and rest point, reached by a lift from the Throne Antechambers; every crossing you win drops a lift
back to it. Each spire has two routes up (inside by the floors; outside by ledges and chains, harder and shorter), a
rule of its own, and is a dungeon cleared five times, no two alike, for what opens the next crossing. Each crossing has
a seal at its landing and a boss you can watch pacing from the spire below.

| Spire | Heights (m) | Its rule | Level | Opens | Crossing (leaves → lands) | Boss |
|---|---|---|---|---|---|---|
| Ember | +115 → +175 | rising fire: the floors below burn behind you | 114 | the Storm Bridge | +170 → +160 | the Bridge Warden |
| Storm | +150 → +215 | wind: half the climb is on outside ledges | 126 | the Ossein Stair | +210 → +200 | the Twin Gargoyles |
| Bone | +190 → +250 | a descent first, down the marrow shaft, then up | 138 | the Gloam Balconies | +245 → +235 | the Balcony Duellist |
| Shadow | +225 → +285 | darkness: lamps you carry and relight | 150 | the Red Span | +280 → +270 | the Bleeding Knight |
| Blood | +255 → +305 | a timed bleed between its fonts | 162 | the Last Stair | +300 → +285 | Velscour's Herald |
| **The Throne Tower** | +115 → +330 (the dungeon is the twelve floors above +285) | **one run** | 175 | | | Velscour (180) |

**What five clears collect, and who else gives it.** Each spire has a named part: the Ember Coal, the Storm Glass,
the Marrow Key, the Shade Wick, the Blood Seal. One prisoner freed on each spire's first clear stays at the Crown
Court (a smith, a healer, a scout, a herald, a jailer turned), with quests of their own. Their quests, the Wyrm and each crossing boss give spare fifths of the part of the spire
just climbed; as in the castle, spares never shorten the five clears, they raise that part's second tier. Every spire
has an inside route auto-play and phones can always take. **The Keep answers you**: a spire won is lit,
and its light is seen from the whole city.

| Clear of the Ember Spire | Way up | Bosses | Modifier | Shortcut it leaves | Minutes |
|---|---|---|---|---|---|
| 1, the story run | inside, all six floors | the Cinder Warden; the prisoner freed | the fire rises slowly | the floor-3 chain | 30 |
| 2 | outside ledges to floor 4 | the Warden with ember adds | the fire rises fast | the ledge anchors stay | 15 |
| 3 | inside from the floor-3 chain | two lesser wardens | floors fall away behind you | a lift to floor 4 | 15 |
| 4 | outside, the whole way | the Warden on the roof | wind and fire together | the roof stair | 14 |
| 5 | the lift, then the roof | the Warden, reborn | everything burns: a race | the Ember Coal is whole | 12 |

World boss: the Chained Wyrm of the Crown Court (112).

## The liveries of Velscour's own (owner, 2026-11-15)

His knights, generals, necromancers, wizards and the rest are **palette swaps** of the models the game already has
(recoloured textures, no new models). Outside his area they wear various swaps. **Once in his area they wear blood
red.** Some wings of the castle and the Keep have a colour of their own, and some areas mix the schemes, the bigger
boss fights above all. The data is `liveries` in `tools/phobos/layout.json`.

| Scheme | Where |
|---|---|
| blood red | the city, the sewers (tarnished), the castle's Lower Ward, the Ember Spire: the default everywhere |
| grey with gold highlights | the Barracks, Armoury and Forge; the Shadow Spire |
| royal blue | the Library, Portrait Gallery and Map Room; the Storm Spire |
| forest green | the Menagerie, Conservatory and Alchemists' Wing; the Blood Spire |
| white with extra skulls | the Sanctuaries, Ossuary Chapel and Generals' Crypt; the Bone Spire |
| mixed | the Great Hall, Clock Tower, Hall of Mirrors, Treasury and Throne Antechambers; every crossing boss (two schemes each); the Throne Tower |

**Kept apart** (owner, 2026-11-15): royal blue and grey-with-gold are never on one figure and never side by side in
one pack or one boss fight, because blue beside gold is Tessariel's. Mixed areas pair each of them with red, white or
green instead.

## Progression

Today's game runs to about level 18. Nothing hard-gates by level; quests gate by `needs`. XP to reach a level is
`90 × (level − 1)^1.75`, so the whole climb from 18 to 180 is about 775,000 XP, 62 times what the game gives today:

| Tier | Levels | XP | Itemised | Hours |
|---|---|---|---|---|
| Marches, first sight | 18 → 20 | 2,750 | four drip visits 2,000; the road and two world bosses 750 | 1 |
| The city | 20 → 45 | 52,000 | three hub lines 20,000; eleven districts' packs and finds 14,000; three world bosses 4,000; dungeons 1 to 4 14,000 | 12 |
| Sewers, last city dungeons | 45 → 58 | 39,000 | the keepers' line 8,000; Apricot's line 8,000; four world bosses 8,000; dungeons 5 and 6 10,000; the four halls 5,000 | 6 |
| The castle | 58 → 112 | 235,000 | the household's quests 60,000; eight first clears 64,000; 32 repeat clears 80,000; three world bosses and the wings 31,000 | 22 |
| The Keep | 112 → 172 | 386,000 | five first clears 100,000; 20 repeat clears 120,000; five crossing bosses 70,000; the Crown Court's people 60,000; the Wyrm and the roofs 36,000 | 14 |
| The Throne Above, Velscour | 172 → 180 | 61,000 | the last run 25,000; the human form 16,000; the demon form 20,000 | 2 |
| After the ending | 180 → 200 | 161,000 | Hard, then Mythic | open |

About 57 hours from the Marches to the ending. Repeat clears are 200,000 of 775,000 XP (26%): a third of the
castle's, under a third of the Keep's. A castle dungeon's five clears take about 70 minutes, a spire's about 85.

**What a level buys.** Every district's hub line, every finished idol part and every crossing gives one thing you can
hold: a spell rank, a gear slot's next tier, a party member's new skill, a Pinnacle-style passive, or a shortcut.
Nothing in the zone pays in numbers alone. (The list of which gives what is chunk 5's and chunk 9's.)

**Drip visits** at levels 12, 14, 16 and 18, each needing an existing quest of that level: to Greywarden's beacon, to
the Lantern, to Widow's Notch, and last to the Sill. They never go inside the wall, so first sight is the fourth
visit's reward and the drawbridge is the endgame's.

**The endgame arc** opens when every other quest is done: the west outfall, the winch-house, the drawbridge; then the
hubs' lines; the sewers; the Aqueduct into the castle; the idol; the Keep; Velscour; the ending.

Counts: 20 dungeons (6 city, 8 castle, 5 spires, the Throne Above; 27 delves with today's seven), 13 respawning world
bosses (2 Marches, 3 city, 4 sewers, 3 castle, 1 Crown Court), 5 crossing bosses, 8 city seals, 5 sewer seals, 5
castle rest points (Gatehouse, Kitchens, Great Hall, Library, Sanctuaries), 6 Keep seals (the Crown Court and the five
crossings).

## Open questions for the owner

1. The size decision above.
2. Five clears a dungeon is kept as you asked; both critics would rather three. The plan makes each clear different
   and lets world bosses and quests give spare fifths. Your call whether the count stays at five.
3. The auto-play awe scene stays about five minutes as you asked (skippable); one critic would cut it to a minute.
4. Level bands: the city starts at 20, Velscour is 180, Hard and Mythic are for 200.
5. Names: every district, hub, dungeon, boss, keep and gate here is a draft.

## Sources

Castlevania: gamedeveloper.com/design/economy-and-thematic-structure-symphony-of-the-night-s-level-design. Stormveil:
escapistmagazine.com/elden-ring-stormveil-castle-game-design-tutorial-anatomy. Dark Souls:
gamedeveloper.com/design/cutting-through-the-fog-of-dark-souls-part-one-. Dunwall: killscreen.com/knotting-dishonoreds-decaying-city;
rooftops: electrondance.com/across-the-rooftops. Sewers: sidequest.zone/2025/03/03/video-game-sewers. Wayfinding:
book.leveldesignbook.com/process/blockout/wayfinding. Fortifications: Wikipedia on Beaumaris, Caernarfon, Krak des
Chevaliers, Himeji, Malbork, Prague Castle, the Walls of Dubrovnik, the Cité de Carcassonne, York city walls.

## The critics (three rounds, 2026-11-15)

Round 1: both REJECT (best 6, progression 3.5 to 4). Round 2: both REJECT, close (6 to 8). Round 3: **both APPROVE**
as a layout bible to build from (veteran: city 8, sewers 7.5, castle 8, keep 7.5, progression 7.5; young: first sight 8,
city 8, sewers 7, castle 8, keep 7.5, progression 7). Their round-3 conditions (map label and tunnel errors, a High
Ward rest point, the spare-fifths rule, the Throne Tower's heights, sound and a phone plan for the scene) are fixed in
this revision. Still open after round 3, for the chunks that build these:

- **Reward cadence**: about 20 held rewards over 162 levels is one per eight; set a floor (one per three levels) and
  define each (chunks 5 and 9).
- **Castle and Keep plans to scale**: `castle.png` and `keep.png` are diagrams; a to-scale ward plan and spire plan
  are needed before blockout (chunks 8 and 10).
- **The other clear tables**: only the Iron Barracks and the Ember Spire are written out (chunks 9 and 10).
- **Not judged by anyone**: whether 5.5° reads as awe; whether clears 2 to 5 feel different in play; whether a
  12-hour city holds eleven verbs; phone cost of a 215 m Keep in view from everywhere; all names.
