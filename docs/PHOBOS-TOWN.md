# Phobos, the town's share of its growing (the Town set of [PHOBOS-CASTLE.md](PHOBOS-CASTLE.md))

The owner, 2026-11-19: "making the town look unique and interesting, and make the houses look even more unique. Add more
and more quests that sprawl all over the town, bring you down to the sewers, then starts bringing you into the castle."

## The houses (`src/core/phobos-houses.js`; called from `phobosHouses`, `houseFar`, `houseNear`, `phobosCell`)

No house was added, moved or taken away: a house's door is its place in the list. Each now has a **style** (`h.st`, from
`styleOf`) by its district (`h.dk`) and a number of its own, the same from far and near:

| District | Roofs (most first) | What else is its own |
|---|---|---|
| the Barbican | hip, flat behind a parapet with his V at its corners, gable | dark plinths, quoins, stone door heads with a V cut |
| the Cinder Quarter | burnt-out rafters between two standing end walls, gable, pent | charred walls, a leant beam and ash at the foot, great stacks |
| the Rookeries | gable, gambrel, pent, a few mansards | deep jetties from the third storey, boarded galleries hung with washing, timbering, board hoods over doors |
| Chainmarket | stepped (crow) gables, gable | timbering with a V of braces under every upper window, jetties, oriels, hoists |
| the Drowned Wharf | gambrel (warehouses), gable, pent | hoists with a bale on a chain, galleries |
| the Tanners' Steps | gable, pent, gambrel | drying lofts (tarred boards across the top of the front), great stacks, umber walls |
| the Bone Yards | hip, gable, flat | pale walls, a band of bone-inlaid stone under the eaves |
| the Barracks Ward | flat with V merlons, hip | plinths, stone door heads |
| the Mages' Rise | mansard, hip, stepped gables | oriels of frost-lit glass, dormers, finials, pennants |
| Dukes' Row | mansard, hip, stepped gables | oriels, dormers, quoins, plinths, finials |
| the Castle Approach | stepped gables, hip, mansard | plinths, quoins |

The **one-off houses** (`LANDMARKS`; each is a house that already stood there, marked `h.mark`): eleven taverns (an
ale-stake with its bush, a great light, casks, a bench), six guildhalls (an arcade of stone posts, stepped gables, his
banner), six tower-houses (half as tall again and more, a corbelled corner turret), three burnt shells; and a **toll-house
across each of the Slough's two footbridges** (`bridgeHouse`: the way through under it is the bridge's own deck).
`landmarks()` gives each with its house.

**Along the streets** (`streetLife`, the near cells'): against the house fronts by district (dyers' vats and hides on
frames, spear racks, tubs with dead shrubs, mounting blocks, ash heaps, bone heaps, kegs, benches, troughs), and at the
King's Mile's kerb carts, stalls and his banner on poles. Nothing of it stops a body.

**The V and T rule, as kept here**: timbers are uprights and V braces only, and no post is put on a shop's front (it has a
stone course at every floor, and a post through a course is a cross); a hoist's chain hangs from the beam's end; a
gallery's front is boarded (no rails on balusters); no decals (the near cells draw no cut-outs).

**Budgets**: the city's far build is 520,898 corners on a PC (486,802 before: +34,096 of the 40,000 allowed) and 306,630
on a phone (unchanged); the whole land 1,683,955 and 930,618 (`node tools/phobos/corners.mjs`). Colliders and floors are
what they were (61,773 and 10,423 in the city). Near cells are 3 to 12% more corners (`node tools/phobos/cell_times.mjs`).

## Lookouts and finds (`src/core/phobos-finds.js`, `src/core/delve-sewers.js`)

Sixteen lookouts in the city, each on a floor that's walked: eight rooms the wall-walk runs through (the four gates'
drums and four posts), six towers' top rooms (the barbican, the burnt minster, the gibbet tower, the hospice, the sluice
house, the Ninefold Eye) and the two toll-houses' passages. Down the sewers: two chests to a sector, each at the end of a
spur off the beaten way, and each sector's great room named.

## Quests (`src/folk/phobos-quests-town.js`, words in `src/folk/lines/phobos-more-town.js`)

Twenty-seven, from people who walk their own quarter, the drains' keepers and the princess: ten over the streets, the
wall and the towers (20 to 28), four down the West Drains, three in the Slough Mains, three in the Charnel Runs, two in
the High Conduits, and five up the Approach and in the Lower Ward (58 to 64).

## Left open

- Auto-play knows every step (`tools/autoplay/check.mjs`), but whether it can climb to a lookout on the wall-walk or up a
  tower's stair has not been watched: it walks to the spot and, if it can't get up, gives the job up for a while.
- Pictures: `node tools/phobos/town_shots.mjs` (the machine's own Chrome and graphics card: Playwright's Chromium can't
  bring the game up on this machine, so `city_shots.mjs` as it stands times out here).
- A lookout's toast says "Lookout found" for the sewers' halls too (the main session's wording, `src/main.js`).
- From across the city the far houses differ in roof shape and wall shade only; jetties, oriels, galleries and timbering are
  the near cells'. The districts' street props are light on Dukes' Row and the Mages' Rise.

## Round 2 (the critics rejected round 1: 5.5 and 6; docs/PHOBOS-CRITICS-R1.md)

- **Rule breaks.** The tall washing on two posts before the poor houses is gone (end on it was a pole with a yard and two
  flags, red and buff: a T); washing is over sills and galleries now, in buff, hessian and grey, never red beside buff. An
  open window's inner surround is its two jambs only (its head and sill, seen from the street, lay across the mullion as a
  transom). No quoin and no post on a shop's front (they crossed its stone courses); a post elsewhere stops short of the
  floor under it and the one over. The tavern's ale-stake is a bush hung from the end of an iron arm. Shutters: the pack's
  painting is a Z brace on each leaf (looked at close in tn_shell); dark on pale walls.
- **From far.** Each district is roofed in a stuff and colour of its own (`LOOK`, tints and layers only): dark slate (the
  Barbican), burnt black (Cinder), brown shingle (the Rookeries), old clay (Chainmarket), moss green (the Wharf), olive (the
  Tanners), pale (the Bone Yards), blue slate with a third red (the Barracks), verdigris (the Rise), lead (Dukes' Row),
  ox-blood (the Approach), grey slate between. Heights differ more (the Rookeries 11 to 20 m, the Rise 12 to 19, the Wharf 6
  to 9, the Bone Yards 5 to 8). Sixteen tower-houses now, each a main block under a parapet, a narrower stage with one
  great lit window, a steep cap and a coned corner turret (`towerStage`, far and near); guildhalls a storey over their rows
  under steep stepped gables.
- **The toll-houses**: a boarded room jettied out all round on brackets, windows on every side, a stack, a pointed head to
  the way through, a brighter lantern, struts down to the bridge's piers.
- **Night**: more upper windows lit; a pool of light at each tavern's door and bay; tn_night retaken on the street.
- **Windows**: a V of braces under one timbered window in three; the rest a cloth over the sill, a box of dead stalks, shut
  shutters, or nothing.
- **The tavern**: its ground floor in dark oak under a fascia, a bay of lit glass, a bench, casks, a board half again a
  shop's size (the brewer's or its own: three taverns are named for the boards the city has), the bush, two door lamps.
- **Bugs**: a stone stoop under every door on a slope (no more voids under houses); the hoist's bale on a rope as thick
  as a wrist; cold-fire braziers on the Rise and urns on Dukes' Row, and more of what stands along both.
- **Quests**: nine re-cut so no two neighbours are the same errand: night watches and a word (the Long Watch), a hunt at a
  lair (the Sweep's Eye, the Scrying Room), a talk on from the lookouts (the Toll on the Water, the Market Cistern),
  things brought back (the Castle from the Wall, the Soot Cistern, Rivets for the Watch), a boss (Under the Rise).
- **Not done**: the banding on big blank fronts is the wall shader's own (its soot and tone bands in the world's metres),
  not the houses' build: left. Far houses still carry no jetties or oriels (the land's corners).
