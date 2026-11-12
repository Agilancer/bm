# Handoff: the world build-out (branch `claude/pensive-ramanujan-eyktne`)

This branch is a job half done, handed over mid-flight. Read this page, then the four stream notes beside it. Nothing here
has been played end to end, and no pull request is open (the owner hasn't asked for one).

## What the owner asked for

> It's time to build out the world more! Do a single pass over the questing areas and the dungeons, improving them visually
> (do a 2 pass on the bell tower and make a new NPC combining parts of the 43 and the head of a villager NPC, he's a special
> paladin, make sure he looks good) then make sure the game world in those areas is populated with enemies and interesting
> things to look at. Make sure all the caves look interesting. Add another 2 dungeons, one of which is a huge castle where you
> fight tons of Velscour's knights and magic users, including some bosses which will be larger knights with a possessed
> villager's head instead of a helmet with glowing red eyes. Make sure to go and do some visual mods to the knights so they
> each look a bit different, but do so in a way that it fits with the art style. Make sure there are plenty of quests that
> bring you into the dungeons, and then add some new areas to the game with a couple new smaller towns and quest givers spread
> throughout the world. Make sure the areas where questing take place seem alive and have monsters throughout of all types,
> depending on the biomes.

And later: **"Make sure there are quests that lead to the new towns and quest hubs and what not."** Every new town, hub and
posted quest giver, and each dungeon's portal, must be led to by a quest reachable from someone in Bellmourn.

## How the work was split

Four streams worked in the same tree, each on its own files, from one shared brief (`BRIEF.md` here: the rules, what was
found out about the engine, and how to take pictures of the game on a machine with no GPU). Each left a note:

| Stream | Note | Its files |
| --- | --- | --- |
| Models: Ser Hale the paladin, the boss knights with possessed heads, six more Velscour knight bodies | `models.md` | `assets/monsters/tripo/*`, `assets/game/knights/paladin_fifthwatch.glb`, `tools/monsters/*`, the eyes' glow in the renderer, `src/core/knights.js` (his entry) |
| Dungeons: several dungeons in one engine, Blackvigil Keep (the castle), the Howling Deeps, the Warrens' cave pass | `dungeons.md` | `src/core/dungeon.js`, `src/sim/dungeon.js`, the dungeon builders, `src/ui/undermap.js`, `tools/dungeon/*` |
| Places: two passes on the Bell Tower, one on every site, Thornwick, Cinderford and the smaller new places | `places.md` | `src/core/sites.js`, `src/core/lands.js` |
| People, monsters and quests: lairs by biome, villagers posted in the new towns, the new quests | `people-quests.md` | `LAIRS` in `src/core/tripo-monsters.js`, `src/core/hunts.js`, `src/folk/*`, `src/ui/folk.js`, `src/core/heroes.js` |

If a stream's note is missing or thin, it was cut off before it could write it: go by the code and the `*-status.txt`
files here (short notes the streams left each other: spots and coordinates, model ids, exports).

## Decisions already made (keep them unless the owner says otherwise)

- **Names and keys.** Dungeons: `warrens`, `blackvigil` (the castle is Blackvigil Keep's inside; its portal stands before
  the keep's gate at about (-4914, 200)), `deeps` (the Howling Deeps, a frozen cavern; portal at the site `deepsmouth`,
  (880, 3990), by Frostwatch). Boss keys: Warrens `grubnash`, `twins`, `venomaw`; Blackvigil `maldrec`, `sorvane`,
  `brothers`, `castellan`; the Deeps `hrymgar`, `broodmother`, `sleeper`. `delveAt(x, z)` and `DELVES` in
  `src/core/dungeon.js`; `BOSSES` is one list with a `delve` on each.
- **The paladin** is Ser Hale Orrowick, Paladin of the Fifth Watch (talk id `hale`): a Millhaven man with a villager's
  face, in harness pieced from what the fallen of the forty-three left on the downs. Tessariel's side. He stands by the
  Bell Tower's door beside the old Bellwright, as a knight in `TOWN_KNIGHTS` flagged `hale: true`.
- **New places** (in `SITES`): the towns Thornwick (2400, 1800) and Cinderford (-2100, -200), each with a seal; the Howling
  Mouth, the Cairnfield, the Sunken Mile, Ravens' Tor, the Charred Mill; and the places stream's own: the Moor Wayhouse,
  the Old Toll, Ossery Quarry. Coordinates for people's spots are in `places-status.txt`.
- **Quest givers out in the land are villagers** (the townsfolk's bodies, posted at a spot by the town's own thread), not
  knights; only the Bellwright and Ser Hale are knights.
- **Boss knights and knight variants are Tripo monsters**: `possessed_knight_1..3`, `velscour_knight_3..6`,
  `velscour_lancer_2`, `velscour_lancer_3` in `assets/monsters/tripo/roster.json`; bosses are bigger copies through
  `VARIANTS` in `src/core/tripo-monsters.js`.

## What is left, in the order to do it

1. **Read the four notes and make the tree whole.** Run every check and fix what's red:
   `node --test tests/*.test.mjs` (two failures are old and not this job's: both about Lisandra's recorded voice files),
   `node tools/dungeon/check.mjs`, `node tools/dungeon/fight.mjs`, `node tools/testhall/check.mjs`,
   `node tools/lands/check-vt.mjs`, `node tools/items/check.mjs`, `node tools/autoplay/check.mjs` (expected to fail until
   step 4).
2. **Finish each stream's "not done" list.** Known when this was written: the eyes' glow on the boss knights was not seen
   working in the game; Ser Hale not yet looked at in the game; Blackvigil's halls are too dark to read (the gate hall
   picture is nearly black); the Warrens' visual pass may not have been started; the Bell Tower's second pass (the knoll's
   ground shows white and broken in front of the yard wall); the people posted in the towns not yet seen standing there;
   the breadcrumb quests to every hub and dungeon to be confirmed by their test.
3. **Look at all of it in the game** (below), as a critic: each site, each room of each dungeon with its packs stood up,
   Ser Hale beside the Bellwright, a boss knight in the dark, the new knights side by side.
4. **Teach auto-play** (CLAUDE.md requires it): every new quest, step kind, place, foe, lair, room, pack and boss in
   `src/ui/autobrain.js` and `src/ui/autowarrens.js`, until `node tools/autoplay/check.mjs` passes; then watch it play the
   new parts (`?auto&noopening&timer`).
5. **README**: each stream was to add its own section; check they are there and true, and say plainly what was not
   checked. Then delete `docs/handoff/` (it's scaffolding, not documentation) once nothing in it is still needed.
6. Commit, push, and tell the owner what works, what doesn't, and what nobody has seen.

## Seeing the game without a GPU

`python3 tools/serve.py 8481 --no-open &`, then

    NODE_PATH=$(npm root -g) node tools/world/views.mjs name:ex,ey,ez:tx,ty,tz[:hour] ...

boots the game in headless Chromium on a software GPU (about 80 s) and saves `tools/build/shots/<name>.png` (that folder
is not committed; a few pictures from this job are in `docs/handoff/pictures/`). A `+3` height means 3 m over the land; a
bare number is absolute (dungeon floors are near y = -50). `BRIEF.md` has the details and the game's console API. Only
one headless game fits on four cores: run them one at a time.

## Hard rules (from CLAUDE.md)

V (Velscour) and T (Tessariel) never together, on anything; no letters or monograms on what you make. Monsters' attacks go
through `sim.perils` and the named `MOVES`. Auto-play must be kept up with the game.

## State when handed over (measured, 2026-11-12)

The four streams were cut off by a usage limit before three of them could write their notes: only `places.md` exists. For
the models, the dungeons and the people-and-quests go by the code, the `*-status.txt` files, `scratch/` (the streams' own
throwaway scripts: model surgery and render helpers, fight logs' helpers, shot lists; not maintained) and `pictures/`.

- `node --test tests/*.test.mjs`: 168 pass, 2 fail (the two old Lisandra voice-file tests).
- `node tools/dungeon/check.mjs`: passes ("The delves hold together"): three delves, ten bosses
  (`grubnash twins venomaw | maldrec sorvane brothers castellan | hrymgar broodmother sleeper`). Boss bodies are
  `VARIANTS` `bv_maldrec bv_sorvane bv_garrow bv_gault bv_castellan hd_hrymgar hd_broodmother hd_spiderling hd_sleeper`.
- `node tools/testhall/check.mjs` and `node tools/lands/check-vt.mjs`: pass.
- `node tools/autoplay/check.mjs`: FAILS, 218 lines, as expected: auto-play has been taught none of this. Its output is in
  `autoplay-check-output.txt`: that is the to-do list for step 4.
- In the tables now: 34 sites, 101 lairs (there were 30), 56 quests (there were 16). The forty new quests include
  breadcrumbs (`word_to_thornwick`, `tracks_west`, `owed_to_frostwatch`, `millhaven_man`, `moor_wayhouse`, `old_toll`,
  `ossery_quarry`...) and dungeon quests (`warrens_mouth`, `tunnel_king`, `mother_of_the_warren`, `into_the_deeps`,
  `broodmother`, `the_sleeper`, `gate_of_blackvigil`, `first_lord`, `lords_of_the_keep`, `the_castellan`...); whether a
  test asserts that every hub and portal is led to has not been confirmed by the lead.
- NOT verified by anyone: the eyes' glow in the game (the picture `models_pk_hall_a` shows an empty hall: the summon
  didn't show), Ser Hale in the game, the new knights in the game, the fights of the two new dungeons beyond the stream's
  own headless runs, any room of the Howling Deeps drawn, the Warrens' visual pass (may not exist), the posted villagers
  standing in their towns, any new quest played in the game. Blackvigil's gate hall is nearly black (`dungeon_bv_gate`).
