# The living land: where it stands, and what's next

Written for whoever picks this up (the owner asked for a handover another model could work from). README, "The living
land", says what it is; this is the state of the work, how to check it, and what's left, most useful first.

## What's in

| Thing | How many | Where it's said | Where it's done |
| --- | --- | --- | --- |
| New kinds of monster (an old body, a palette, a size, a name, its own numbers, tricks and spell) | 100 | `WILD_VARIANTS` in `src/core/wilds.js` | `optsFor` in `src/sim/tripo.js` |
| New palettes | 15 (31 in all) | `assets/monsters/tripo/palettes.json` | baked as ever, `src/gfx/palette-bake.js` |
| Factions, with a side each | 35 | `FACTIONS`, `COUNTRY_FACTIONS`, `TRUCES` | |
| Outposts, each a lair with a chief | 388 (171 with a trail) | `OUTPOSTS` in `src/core/wilds-data.js` | built by `src/core/wild-dress.js`; lairs through `outpostLair` |
| Standing battles | 12 | `BATTLES` | two lairs each, `battleLairs` |
| Tear spots (42% open at a time, turning over every 13 minutes) | 221 | `TEAR_SPOTS`, `TEARS_KINDS`, `TEAR` | `src/sim/wilds.js` |
| Things to find, each with a cache | 247 | `FINDS` | glint and pay-out in `src/sim/wilds.js`, `src/ui/wilds.js` |
| Kinds of meeting on the way | 7 | `MEETINGS`, `MEET` | `src/sim/wilds.js` |

`src/core/wilds-data.js` is written by `node tools/wilds/place.mjs` and never by hand. Change a count, a spacing or a
faction's country there (or in `src/core/wilds.js`) and run it again; it's the same every run.

## How the pieces fit

- An outpost and each side of a standing battle is an ordinary lair, pushed onto `LAIRS` in
  `src/core/tripo-monsters.js`. So it has its glade in the pines, wakes when you're within 110 m, sleeps when you leave,
  and comes back after `respawn` seconds, with no code of its own. It carries `side`, `lvl`, `wild` and `dress`.
- Only twelve Tripo bodies can stand at once (`TRIPO_SLOTS`; `MAX_CHARS` in `src/core/layout.js` is full). Everything
  here lives inside that: the placement tool keeps every spot's neighbours within 262 m to twelve bodies, and the sim
  rolls nothing new while the slots are busy (`room()` in `src/sim/wilds.js`).
- Tears and meetings are temp lairs (`stand()` in `src/sim/wilds.js`), as the dungeons' adds are.
- Monster against monster is `m.rival`, set twice a second by `rivals()` and read by `foeOf` in `src/sim/foes.js`;
  the blow lands through `TripoMonster.damage`. `rivalTake` on a lair slows a fight down so it's still on when you arrive.
- The sim tells the page through `EV.WILD` with a code from `WILD` in `src/core/wilds.js`; `src/ui/wilds.js` shows it
  and pays (experience through `game.addXp`, loot through `drops.fromKill`).

## How to check it

```
node tools/wilds/place.mjs            # lays the land out again (about a minute)
node --test tests/wilds.test.mjs      # the tables' rules (quick)
node tools/wilds/play.mjs             # plays all of it in the sim with no page (about five minutes); or one part:
node tools/wilds/play.mjs kinds       # (or battle, tear, meet, outpost, walk)
node tools/lands/check-sites.mjs      # nothing solid on a road, a trail, a seal or a spot; the triangle count
node tools/autoplay/check.mjs         # auto-play knows every lair (the wild ones carry their own level)
node --test tests/quests-beyond.test.mjs tests/hunts.test.mjs tests/lair-dress.test.mjs
```

In the game's console: `bm.wild(1, n)` stands meeting n ahead of you (0 pack, 1 skirmish, 2 warband, 3 bounty, 4 ritual,
5 duel, 6 drake); `bm.wild(2)` takes you to the nearest open tear; `bm.wild(3, n)` to outpost n; `bm.wild(4, n)` to
battle n; `bm.wild(5)` rolls the next meeting as soon as there's room.

To see it in the desktop app's browser pane: the server entry `bm-alive` (port 8595) in `work/bm/.claude/launch.json`
serves this worktree; open `/?auto&noopening&timer`.

## What has and hasn't been seen

- **Played by the sim, no page:** every kind stood up by its own name; a battle's two sides hurting and killing each
  other and leaving the player alone; a tear through all four stages, sealed, and one walked away from; each of the
  seven meetings begun, ended and paid; an outpost found and cleared; ten minutes up the Gallows Road (seven meetings).
- **Seen in the browser on a real GPU (the desktop app's pane, 800x600):** a Vigil fort, a goblin stockade with its
  trail, a graveyard with its lych gate, a tear from 70 m and from inside with storm harpies coming through, a skirmish
  with its tracker, the banner, the chat line, the new names on the life bar.
- **Not seen by anyone:** most outpost kinds (diggings, tombs, towers, rings, covens, nests, ruins, fields, pest camps,
  roosts, dens, beds), the finds, the map's marks, a ritual's circle, a colossus, the rewards landing, anything at
  night, a phone. **Nobody has played it by hand.** Frame time isn't measured: the places are 463,000 triangles now
  (261,000 before), all in the village's one draw call. The pane read 48 frames a second at a graveyard, with nothing
  from before this work to set beside it.
- **Two tests fail on a fresh Windows checkout and did before this:** `tests/auto-show.test.mjs` (the hurried clock)
  and `tests/touch-hud.test.mjs` (spec.json). Both match text across a line ending; they aren't this work's.

## What's left, most useful first

1. **Play it and tune it.** Every number is a first guess: how often a meeting comes (`MEET.every`), how hard a tear's
   waves hit (`tough` in `nextStage`), what a sealed tear pays (`src/ui/wilds.js`), how long a battle lasts
   (`rivalTake`). The duel's sorcerers killed neither in 40 seconds of the sim's run; watch one.
2. **Look at every outpost kind** in the game (`bm.wild(3, n)`) and mend what's ugly in `src/core/wild-dress.js`.
   Things on slopes are the likeliest to look wrong.
3. **Measure the frame** with the places nearly doubled. If it's too much, the cheapest cut is the spacing in
   `tools/wilds/place.mjs` (470 m between outposts) or the lairs' own dressing.
4. **Town defence.** Invasions that march on Thornwick, Cinderford and Frostwatch and are met by defenders (RIFT's
   wardstones) aren't in: a warband marches at you, not at a town. The posted villagers can't fight or flee.
5. **The other Tessariels don't join in.** They hunt at three near lairs (`PLACES` in `src/core/heroes.js`); sending
   them to open tears and battles would make the land busier still.
6. **Auto-play** fights what comes at it but doesn't seek tears or outposts out. Its check passes.
7. **Quests.** None sends you to an outpost, a tear or a named chief. A bounty board (a named chief at an outpost,
   posted in a town) is the obvious first one: `src/folk/land-quests.js`; a `kill` step of `lair:wo_...` already works.
8. **A phone.** The banner and tracker aren't in `src/ui/thumbs.js`'s table, so `tests/touch-hud.test.mjs` doesn't
   know them; they sit top middle and may cover something there.
9. **Sound.** A tear and a meeting use sounds the game has (a roar); neither has its own.
