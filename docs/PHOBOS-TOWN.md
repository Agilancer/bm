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
