# Shared brief: building out the world of bm (read all of this first)

Repo: /home/user/bm (a WebGPU browser game, plain ES modules, no build step, no package.json). Read `CLAUDE.md` and the parts
of `README.md` that touch your work (it is 150 KB: grep its headings, read only the sections you need).

## The owner's request (the whole of it; you have one part, named in your own task)

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

("The 43" are the other Tessariels, the hero bodies in assets/game/heroes: README "The Free Company", "The heroes' armour".)

## Hard rules

- **V and T never together.** V = Velscour (the bad guy; red and black; Blackvigil Keep, the cathedral, the Ashen Waste).
  T = Tessariel (the good guy; blue/gold/white, the sunburst; the Bell Tower, the abbey, chapel, shrine, the seals). Nothing of
  one within sight of the other; `node tools/lands/check-vt.mjs` keeps their places 1.5 km apart. No letters or monograms on
  anything you make. Velscour's knights and their castle carry V things only; the paladin carries nothing of Velscour's.
- **Several agents are working in this tree at the same time**, each on its own part (models; dungeons; places; who lives
  there and quests). So:
  - Never `git commit`, `git stash`, `git checkout`, `git reset` or push. Leave the tree as files; the lead commits.
  - Change shared files only with small in-place edits (the Edit tool), never by rewriting a whole file, and re-read the spot
    just before you edit it: someone else may have changed the file since you read it.
  - Keep to the files your task gives you. If you need something in another agent's file, make the smallest edit that works
    and say so in your report.
  - `src/ui/autobrain.js` and `src/ui/autowarrens.js` (auto-play) are NOT yours unless your task says so: a later pass teaches
    auto-play. List in your report what auto-play will have to learn (new quests and steps, places, foes, lairs, rooms, bosses).
- Write code the way the files around it are written: dense, commented in plain words saying why. Match it.
- Monsters' attacks go through `sim.perils` and the named `MOVES` in `src/sim/moves.js` (see CLAUDE.md): no one-off hazards.
- Don't make planning documents. Do add or update the README section for what you build (edit in place, keep it short and
  in the README's own voice: what it is, where the code is, what was and wasn't checked).

## Things already found out

- The world's places are plain geometry made in code: `src/core/sites.js` (a `Kit` of boxes, drums, cones, walls, towers,
  houses, fences, menhirs, spikes, braziers, seals; layers are the town's texture array names like 'stone', 'rubble', 'wood',
  'wall_14', 'roof_2', 'door_3', 'cloth_red', 'iron', 'flame', 'lake', 'ice', 'obsidian', 'fruit', 'bark', with tints
  'dark:', 'pale:', 'frost:' — see STATIC in src/gfx/materials.js for what exists). Where places are: `src/core/lands.js`
  (COUNTRIES, SITES, ROUTES, WATERS). The lead has already added these SITES: `thornwick` (2400, 1800) and `cinderford`
  (-2100, -200), two new small towns, each with a seal; `deepsmouth` (880, 3990) "The Howling Mouth" with a path from
  Frostwatch; `cairnfield` (1250, -420); `causeway` (-420, -2700) "The Sunken Mile"; `tor` (1500, 4600) "Ravens' Tor";
  `charmill` (-3150, -1000) "The Charred Mill". Their geometry, people and monsters are still to be made.
- Monsters out in the land: `LAIRS` in `src/core/tripo-monsters.js` (68 Tripo models in assets/monsters/tripo, roster.json,
  palettes.json; 12 body slots shared by whatever lairs you're near), their glades `HUNT_GROUNDS` in `src/core/hunts.js`
  (`node --test tests/hunts.test.mjs`), slimes/jellies and tumblers elsewhere (`src/sim/tumblers.js`, slimes in
  src/ui/lands.js / src/sim), the risen (`src/sim/undead.js`).
- The party dungeon, the Hollowfang Warrens: `src/core/dungeon.js` (rooms, tunnels, the field), `src/sim/dungeon.js` (the
  portals, packs, boss fights), built by `cave()` and `portalWall()` in `src/core/sites.js`, charted by `src/ui/undermap.js`,
  checked by `node tools/dungeon/check.mjs` and fought headless by `node tools/dungeon/fight.mjs`.
- Quests: `src/folk/quests.js` (RULES, AREAS), their words `src/folk/lines/quests.js` and `src/folk/lines/beyond.js`; people
  `src/folk/people.js`; someone out past the town is talked to through `BEYOND` in beyond.js, whose body today is a knight
  in `TOWN_KNIGHTS` (`src/core/knights.js`) flagged with their id (the Bellwright). Bible: `tools/folk/cast.md`.
- Checks: `node --test tests/*.test.mjs` (25 s; before any of this work 2 tests failed, both about Lisandra's recorded
  voice files: not yours), `node tools/autoplay/check.mjs`, `node tools/dungeon/check.mjs`, `node tools/testhall/check.mjs`,
  `node tools/lands/check-vt.mjs`, `node tools/items/check.mjs`.
- There is no Blender here. Python 3 with numpy and Pillow; `pip install` works. Node 22. No GPU, but:

## Seeing the game (it works here, on a software GPU)

A server is already running: `http://localhost:8481/` (python tools/serve.py 8481; restart it if it's gone:
`nohup python3 tools/serve.py 8481 --no-open >/tmp/serve.log 2>&1 &`). It serves the working tree as it is at that moment.

`tools/world/views.mjs` boots the game headless (about 80 s) and saves pictures to `tools/build/shots/<name>.png`:

    flock /tmp/bm-shot.lock env NODE_PATH=$(npm root -g) node tools/world/views.mjs \
       name:ex,ey,ez:tx,ty,tz[:hour]  [more shots...]

`ex,ey,ez` is the eye and `tx,ty,tz` what it looks at. A y written `+3` means 3 m over the land there, a bare number is
absolute (use absolute down a dungeon, whose floor is near y = -50). The player is teleported to the eye (so monsters near it
wake; damage is off). Env: `W`, `H` (default 960x600), `SETTLE` ms before each shot (default 6000; give monsters/models
15000 to load), `PRE` (page code run once, e.g. `bm.hire(4)`), `Q` (extra query string). **Always take it under that
`flock`**: only one headless game at a time fits on this machine (4 cores), and batch many shots into one run. Then look at
the PNGs with the Read tool. `window.bm` is the game's console API (`api()` at the end of src/main.js): `bm.cmd(19, 0, x, z)`
teleports, `bm.setCam`, `bm.setTime(h)`, `bm.hire(4)`, `bm.warrens('enter'|'boss', {n})`, `bm.hall(...)`, `bm.shot(name)`.
A model alone can be drawn in Python (see tools/heroes/render_posed.py, gaps.py) if that's quicker for your work.

## Your report

End with: what you built (files), what you checked and how (tests run, pictures looked at), what is NOT done or not
verified, and the list for auto-play. Say plainly if something doesn't work.
