# Brief for whoever makes a region's quests (read docs/QUEST-LOOP.md first, all of it)

You are remaking one region of this game's quests. The framework is done and committed: camps are built, dens are
pinned, the new steps (`clear`, `gather`) work, auto-play knows them, and the rules are checked by
`node tools/quests/check.mjs <region>`. Your job is the content of one region: its people, its quests, every word.

## What you change

- `src/folk/regions/<region>.js`: `PEOPLE`, `RULES`, `LEVELS`.
- `src/folk/lines/regions/<region>.js`: `LINES` (each person), `QUESTS` (each quest's words).
- The region's **old** quests: cut them from where they are (`src/folk/quests.js` RULES and its words in
  `src/folk/lines/quests.js` / `src/folk/lines/beyond.js`; `src/folk/land-quests.js` and its words in
  `src/folk/lines/land.js`) and re-home them in your files where the quest is worth keeping: same idea, given by
  someone who stands near the work. Reuse the old words where they still fit the new mouth. Remove their entries from
  `PLAN` in `src/ui/autobrain.js` (yours go in `LEVELS`). Leave other regions' old quests alone, even where they break
  the rules: their region's maker will move them.
- `LAIR_LEVEL` in `src/core/tripo-monsters.js` if you add a lair; `tools/folk/cast.md` (a paragraph a person, under a heading
  for your region); `README.md` only if told to.
- Tests that name a quest you moved (grep `tests/` for its id) so they still test the same thing.
- Do **not** move camps, dens or lairs, or add any, unless you truly must (it means re-running the land's tools and
  eight minutes of checks). Rename a den or change its faction only if a quest needs it. If you do any of it, run the
  whole chain in docs/QUEST-LOOP.md and say so in your report.
- Do not commit. Do not touch other regions' files.

## What good looks like

- Three to six quests a hub (a camp: three at least), every step within 650 m of its giver, of three kinds or more.
  Use the dens pinned by the hub (`clear`, or `kill`/`gather` at `'outpost:<key>'`) and the lairs near it; cross their
  ground so one walk out does two quests.
- One of them an errand on to each next hub in the spine (a `talk` with `end: true` to the first person named there),
  given once the hub's main work is done (`needs`). The person at the far end may not exist yet: name them by the id in
  the spine and give them their line in the quest's `others`; that region's maker writes the rest of them.
- Each quest a small story with a reason and a turn, in the giver's own voice. Read `src/folk/lines/land.js`
  (Dorcas, Osric, Hasket and their quests) before you write a line: short sentences, concrete things, dry, nobody
  explains the plot. No "kill five wolves because wolves". No modern words. Nobody at a camp names Velscour or
  Tessariel.
- Levels inside the region's band, rising through a hub; pay by the guide in docs/QUEST-LOOP.md; each hub's best quest
  pays an item or a charm (`item: 'staff' | 'robe' | 'skull' | 'scroll'`).
- A sutler at every camp (`trade: 'sutler'`), with `shop` lines; and a second person at a camp with four quests or
  more, on `campPost(<camp>, 2)`, with a quest of their own.
- Everything under "What the critics of the first region found" in docs/QUEST-LOOP.md.

## How to check (all of these, before you report)

```
node tools/quests/check.mjs <region>          # nothing broken in your region (others' old quests may still show under bellmourn)
node tools/quests/sheet.mjs <region> --words  # read it as a player would
node tools/autoplay/check.mjs                 # auto-play knows all of it
node --test tests/quests-beyond.test.mjs tests/quest-log.test.mjs tests/quest-marks.test.mjs tests/quest-drop.test.mjs tests/first-visit.test.mjs tests/phobos-quests.test.mjs tests/voice.test.mjs tests/start-kit.test.mjs
node --test tests/quest-loop.test.mjs         # the whole game's: yours must not be among what fails
node tools/quests/map.mjs <region> <scratch dir>   # a picture; look at it
```

Report back: the hubs, each quest in a line (who, what, where, how far, what it pays), what you cut and what you
moved, anything you changed outside your two files, every check's result, and what you're unsure of.
