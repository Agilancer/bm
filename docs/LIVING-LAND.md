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
| Towns that are raided, and held by the other Tessariels | 5 | `RAID_TOWNS`, `RAID` | `lookRaid` in `src/sim/wilds.js`, `answer` in `src/sim/hero.js` |
| Bounty boards | 6 | `BOARDS` in `src/ui/wilds.js` | `bountyTick` there |

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
node tools/wilds/play.mjs kinds       # (or battle, tear, colossus, meet, outpost, raid, walk)
node tools/lands/check-sites.mjs      # nothing solid on a road, a trail, a seal or a spot; the triangle count
node tools/autoplay/check.mjs         # auto-play knows every lair (the wild ones carry their own level)
node --test tests/quests-beyond.test.mjs tests/hunts.test.mjs tests/lair-dress.test.mjs
```

In the game's console: `bm.wild(1, n)` stands meeting n ahead of you (0 pack, 1 skirmish, 2 warband, 3 bounty, 4 ritual,
5 duel, 6 drake); `bm.wild(2)` takes you to the nearest open tear; `bm.wild(3, n)` to outpost n; `bm.wild(4, n)` to
battle n; `bm.wild(5)` rolls the next meeting as soon as there's room; `bm.wild(6, n)` takes you to raid town n with a raid on it.

To see it in the desktop app's browser pane: the server entry `bm-alive` (port 8595) in `work/bm/.claude/launch.json`
serves this worktree; open `/?auto&noopening&timer`.

## What has and hasn't been seen

- **Played by the sim, no page (`node tools/wilds/play.mjs`):** every kind stood up by its own name; a battle's two
  sides hurting and killing each other and leaving the player alone; a tear through all four stages with every wave
  whole and its lord through, sealed, and one walked away from; a colossus on the third sealed; each of the seven
  meetings begun, ended and paid; an outpost found and cleared; a raid on Thornwick with three Tessariels out of its
  seal, both bands, and the Tessariels sent home; ten minutes up the Gallows Road.
- **Seen in the browser on a real GPU (the desktop app's pane):** a Vigil fort and a Vigil tower, a goblin stockade with
  its trail, a graveyard with its lych gate, diggings with their propped adit, a barrow, a ruin, a scarecrow field, a
  pest camp, a wrecked wagon, a tear by day from 70 m and from inside and by night, a skirmish with its tracker, the
  banner, the chat line, the new names on the life bar, a raid's banner and count, a bounty's line. At a phone's size
  (760x360, touch) the tracker and banner sit in the top stack with the foe's bar and the tip, one under another.
- **Measured:** GPU time a frame at 1024x768 on this machine, at the same three spots, with all of this and on a build
  from before it: the Downs 9.4 against 11.3 ms, the Barrow Moor 12.3 against 14.7, Bellmourn 11.4 against 14.2, both at
  59 frames a second. So no cost that shows (the newer build has other changes in it; it isn't a like-for-like). The
  land is 739,000 corners on a PC and 313,000 on a phone, which leaves the outposts' fences, tents and stones out
  (`buildSites(true, true)`; `tests/sites-lean.test.mjs` holds a phone's under 600,000).
- **Not seen by anyone:** a coven, a spiders' hollow, a roost, a den and a drake's bed up close; the map's marks; a
  ritual's circle; a colossus on screen; the rewards landing; a raid fought through on screen; a real phone.
  **Nobody has played it by hand.**
- **One test fails on a fresh Windows checkout and did before this:** `tests/touch-hud.test.mjs` (spec.json), from line
  endings.

## Three things found by looking, and mended

- A tear's later waves found no free body: what died hunting still said it was hunting, and a slot that says so is
  never given up (`freeSlot` in `src/sim/tripo.js`). `stand()` in `src/sim/wilds.js` clears that on the dead and asks
  with `must`. The colossus scene in `play.mjs` is what showed it.
- A find's cart stood inside a boulder: tear spots, finds and the ground round an outpost's buildings are clearings now
  (`FAR_GROUNDS` in `src/core/hunts.js`), so no boulder or pine stands in them.
- A meeting could be stood at an outpost you'd just walked up to: none is rolled within reach of a lair that's awake
  or about to be.

## What's left, most useful first

1. **Play it and tune it.** Every number is a first guess: how often a meeting comes (`MEET.every`), how hard a tear's
   waves hit (`tough` in `nextStage`), what things pay (`src/ui/wilds.js`), how long a battle lasts (`rivalTake`), how
   soon a town is raided (`RAID`). A duel takes about 80 seconds to end by itself.
2. **Look at the outpost kinds nobody has** (`bm.wild(3, n)`) and mend what's ugly in `src/core/wild-dress.js`. Things
   on slopes are the likeliest to look wrong; the barrow's mound reads low.
3. **The posted villagers don't react to a raid.** They stand at their posts through it (`posted` in
   `src/folk/brain.js` never runs). Raiders can't hurt them. A word from them when it starts and ends would be cheap.
4. **Auto-play** fights what comes at it but doesn't seek tears, outposts or bounties out. Its check passes.
5. **Bounties aren't quests.** They live in `src/ui/wilds.js`, not the quest log, and have no trail on the ground or
   mark on the map: the tracker's distance and direction are all there is.
6. **A phone's land** has the towers and crags and nothing else at an outpost: its monsters stand on bare ground with a
   fire. If a real phone has memory to spare, `K.lean` in `src/core/wild-dress.js` is where to give some back.
7. **Sound.** A tear, a raid and a meeting use sounds the game has (a roar); none has its own. The music's `stinger`
   (`src/main.js`) would suit a sealed tear and a held town.
