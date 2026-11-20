# Castle Velscour, grown: the plan and the contract

The owner, 2026-11-19: more detail across all of Phobos and the castle; the castle "cooler and way more impressive", taller,
more towers, spires, lookouts and bridges, every one reachable; the town's houses more their own; quests that sprawl over
the town, go down the sewers and up into the castle; the castle full of monsters, scenarios and dungeons; the Librarian's
holdout deep in the Ancient Library, his quests all round the castle; secret ways, shortcuts unbarred from the far side,
keys, treasure and views off the beaten path; palette swaps of enemies where wanted. Two critics, up to three rounds; then
three critics over the whole world and its speed, a phone's above all.

Read [PHOBOS-HANDOFF.md](PHOBOS-HANDOFF.md) first: its owner rules all stand (V and T; no crosses, bells, letters; no
`wall_NN` on big walls; liveries blood red, royal blue, white with skulls, forest green, grey with gold, and blue never beside
grey-and-gold).

## The mechanics everything here shares

| What | How it's written | Where it works |
|---|---|---|
| A key | a boss's `gives: 'key:<id>'`; the key's name and words in `src/core/castle-keys.js` KEYS | the quests keep it as a flag (`QuestBook.boss`), `src/main.js castleKey` says it's had |
| A locked gate between delves | a link's `shut: 'key:<id>'` (or a boss's key, as before) and `word: '<warning key>'` | `src/sim/dungeon.js open` |
| A dungeon's own door on the land, locked | the delve's `shutBy: 'key:<id>'`, `shutWord: '<warning key>'` | `src/sim/dungeon.js portals` |
| A shortcut, barred from one side | the open side's link has `opens: 'latch:<id>'`, the barred side's `shut: 'latch:<id>'` and a `word` | `DELVE.LATCH`, `LATCHES`, `src/main.js` |
| A secret way | a narrow tunnel (`w` 1.3, `h` 3) behind a prop that hides its mouth (a bookcase, a portrait ajar, a hanging); a delve's chart only shows what's been walked (`src/ui/undermap.js`), so it's on no map till found | the delve's own `tunnels` |
| A treasure chest | the delve's `chests: [{ id, room, x, z, yaw, loot (1-4), up }]`, local to the delve | `src/core/castle-finds.js`, `src/items/chests.js` (kept in a save by id) |
| A lookout | the delve's `vistas: [{ id, name, room, x, z, up, r }]`; the land's in `castleFinds()` (`src/core/phobos-build.js`) | found by standing on it (`src/main.js`), flag `vista:<id>`; a quest's `visit: ['vista:<id>']` |
| Auto-play's way through a delve | the delve's `auto: { way: [room ids in order, bosses' rooms last] }` | `src/ui/autowarrens.js` (its packs and bosses are then known to it) |
| A delve's bodies | `VARIANTS_<set>` in its file: `{ id: { src: '<model>', alt, height, name } }` | `src/core/tripo-monsters.js` |
| Liveries | palettes `Bloodred`/`Oxblood`, `Royal`, `Skullwhite`, `Forest`, `Greygold` (`assets/monsters/tripo/palettes.json`) | a pack's or boss's `pal` |

## Where each delve is, and what opens what

All in the castle's row past the world's north edge, `z: -5700, y: -60`, roofs under y -22 (`node tools/dungeon/check.mjs`).

| Delve (key, tag) | x | Level | Way in | Its last boss gives | Set |
|---|---|---|---|---|---|
| the Lower Ward (`lowerward`, cl) | 10760 | 58 | the castle's door | | (built) |
| the Middle Ward (`middleward`, cm) | 11180 | 75 | the Lower Ward's gate | | (built) |
| the Iron Barracks (`ironbarracks`, ib) | 11620 | 64 | its door in the yard | `key:barracks` | (built) |
| the High Ward (`highward`, ch) | 12080 | 95 | `within: 'middleward'` | `key:sexton` | H |
| the Deep Stacks and Pell's Holdout (`deepstacks`, cd) | 12540 | 78 | `within: 'middleward'` (a bookcase in the Librarian's Rooms) | | H |
| the Drowned Archive (`drownedarchive`, da) | 13000 | 80 | land door at (11030, -194), yaw PI | `key:archive` | A |
| the Gallery of a Thousand Portraits (`thousandportraits`, tp) | 13460 | 83 | land door at (11001, -80), yaw PI/2 | `key:portraits` | A |
| the Alchemists' Undercroft (`undercroft`, au) | 13920 | 86 | land door at (11030, 138), yaw 0 | `key:undercroft` | A |
| the Clockworks (`clockworks`, cw) | 14380 | 90 | land door at (11092, 75), yaw -PI/2, `shutBy: 'key:portraits'` | `key:clockworks` | B |
| the Menagerie of Chains (`menagerie`, mc) | 14840 | 92 | land door at (11000, 183), yaw PI, `shutBy: 'key:barracks'` | `key:menagerie` | B |
| the Ossuary Chapel (`ossuary`, oc) | 15300 | 100 | `within: 'highward'` | `key:ossuary` | B |
| the Hall of Mirrors (`mirrors`, hm) | 15760 | 106 | `within: 'highward'` | `key:mirrors` | B |

(A land door's spot is a first guess: stand it where nothing stops a body, its back to a wall, and say where it went.)

The gates between them (`links`; `n` is the place of the gate back in the other delve's `links`, so these places are fixed):

- `middleward.links`: [0] the Lower Ward (built) · [1] the Sanctuaries Stair → `highward` n 0, shut `key:archive` · [2] the
  Clock Tower's door → `clockworks` n 0, shut `key:portraits` · [3] the Menagerie's door → `menagerie` n 0, shut
  `key:barracks` · [4] the bookcase → `deepstacks` n 0 · [5] a frame in the Portrait Gallery → `thousandportraits` n 0, shut
  `latch:frame` · [6] a trapdoor in the Alchemists' Wing → `undercroft` n 0, shut `latch:trapdoor`
- `lowerward.links`: [0], [1] (built) · [2] the Crypt door in the Oubliettes → `highward` n 1, shut `key:undercroft`
- `highward.links`: [0] → `middleward` n 1 · [1] → `lowerward` n 2 · [2] the Scriveners' Lift → `deepstacks` n 1, opens
  `latch:scriveners` · [3] → `ossuary` n 0 · [4] → `mirrors` n 0, shut `key:menagerie` · [5] the Clock Tower's lift →
  `clockworks` n 1 · [6]/[7] the Reliquary, in and out (shut `key:ossuary`) · [8]/[9] the Throne Antechambers, in and out
  (shut `key:mirrors`)
- `deepstacks.links`: [0] → `middleward` n 4 · [1] → `highward` n 2, shut `latch:scriveners` · [2] the Sump → `drownedarchive`
  n 0, shut `latch:sump`
- `drownedarchive.links`: [0] → `deepstacks` n 2, opens `latch:sump`
- `thousandportraits.links`: [0] → `middleward` n 5, opens `latch:frame`
- `undercroft.links`: [0] → `middleward` n 6, opens `latch:trapdoor`
- `clockworks.links`: [0] → `middleward` n 2 · [1] the lift up → `highward` n 5, shut `key:clockworks`
- `menagerie.links`: [0] → `middleward` n 3
- `ossuary.links`: [0] → `highward` n 3
- `mirrors.links`: [0] → `highward` n 4

## Who does what

- **H** (the main session): the mechanics above; the land castle (every tower climbed, every bridge walked, more and taller
  towers, lookouts and chests on them); the High Ward and the Sexton; the Deep Stacks and Pell's Holdout and its people; the
  Librarian's quests round the castle; the wards' new links, chests and lookouts; the critics; the write-up.
- **A**: the Drowned Archive, the Gallery of a Thousand Portraits, the Alchemists' Undercroft, and quests to them.
- **B**: the Clockworks, the Menagerie of Chains, the Ossuary Chapel, the Hall of Mirrors, and quests to them.
- **Town**: the city's houses made more their own, the streets' polish, and quests that sprawl over the town and go down
  the sewers.

Each set keeps to its own files, already made and wired in (so nothing else needs touching):

| Set | Delves | Fights | Quests' workings | Their words | Tests |
|---|---|---|---|---|---|
| A | `src/core/delve-castle-a.js` (`CASTLE_DUNGEONS_A`, `VARIANTS_A`) | `src/sim/castle-fights-a.js` (`FIGHTS_A`) | `src/folk/phobos-quests-a.js` | `src/folk/lines/phobos-more-a.js` | `tests/castle-a.test.mjs` |
| B | `src/core/delve-castle-b.js` | `src/sim/castle-fights-b.js` | `src/folk/phobos-quests-b.js` | `src/folk/lines/phobos-more-b.js` | `tests/castle-b.test.mjs` |
| Town | `src/core/phobos-build.js` (houses only: `houseFar`, `houseNear`, `upstairsNear`, `backyard`, `shopSign`, `phobosHouses`) | | `src/folk/phobos-quests-town.js` | `src/folk/lines/phobos-more-town.js` | `tests/phobos-town.test.mjs` |
| H | `src/core/delve-highward.js`, `src/core/delve-castle.js` | `src/sim/castle-fights-h.js` | `src/folk/phobos-quests-castle.js` | `src/folk/lines/phobos-more-castle.js` | `tests/castle-high.test.mjs` |

A dungeon may be several files (`delve-castle-a.js` importing `delve-archive.js` and the rest). Quest givers for A and B are
people who already stand somewhere: the Librarian's household (`ph_librarian`, `ph_wynn`, `ph_jory`, `ph_ondine`, `ph_pip`),
Princess Apricot (`apricot`), the hubs' three (`ph_penny`, `ph_watch`, `ph_ash`), his eight servants (`cs_*`).

## What a dungeon wants

- Eight to twelve rooms that are places (what was done here, who did it), no two exits straight across a room, joined rooms
  overlapped by about 4 m; a way round as well as a way through; one secret way to a chest; two or three chests in all; one
  lookout or set-piece room; its livery kept to.
- Five to eight packs with names of their own (`names`), palette swaps by livery, an elite or a patrol among them.
- Two or three bosses, each with one thing of its own to learn (not just marks to step out of), played out with
  `node tools/dungeon/fight.mjs <boss>` (wins; `--still` dies), its calls in `warnings`, its body in `VARIANTS_<set>`.
- A scenario: something in the place changes what the last fight is (the Gate Captain's wings), or a room that's a puzzle of
  where to stand.
- `auto: { way }`, and `node tools/autoplay/check.mjs`, `node tools/dungeon/check.mjs`, `node tools/lands/check-vt.mjs` pass.
- Four to eight quests to it and through it, levels in step with the delve's, every word in the set's lines file.
