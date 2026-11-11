# bm

Bellmourn v2.

## Direction: Tessariel is a wizard

The game is now ranged spell combat. Everything below about swords and armour describes files and code kept on the repo but out of play.

- **Out of play:** one and two-handed swords (`BASES` rows with grade `retired`, never rolled) and the armour suits and gauntlets (`GEAR`, `rollArmor`, `assets/fp/gauntlets_*`). Hands are bare. An old save's swords and armour are removed on load.
- **Right hand:** staffs. Left click fires the staff's bolt. Spells are on `1`-`6`, six at a time, chosen in the spellbook from the ones you've learned.
- **Six schools:** Fire, Ice, Earth, Arcane, Lightning and Utility, ten spells each (sixty in all), in skill trees in the spellbook (`B`). You start with the first spell of each, and every level brings a point to spend. See "Spells" below.
- **Left hand:** skulls, the catacomb models (`tools/wizard/build_items.py`, `skull_hold.py`, `fix_arm.py`), in the same five rarities with rolled stats and sockets. Held in a claw: the hand over the crown, the skull hanging under it.
- **Shield:** riding it (hold Space as you jump) is a core mechanic. With a skull equipped the shield still goes under your feet, but the skull is what you hold, you can't guard, and the shield's gems give no stats.
- **Robes:** hats, hoods, robes, jackets, coats, mantles, capes, pants, wraps and boots in five palettes (`ROBES`, `tools/wizard/build_items.py`). Seen as drops and icons; there's no visible body to wear them on.
- **Gems:** socket into staffs, skulls and shields. Each kind has its own stat, particles, motion and light (`src/gfx/gemfx.js`), and a Flawless stone adds a flourish. A shield's show when you ride it.
- **Levels:** kills pay XP (`src/items/levels.js`). Each level adds 7% spell damage, 8 life, 6 mana and 4% mana regeneration, fills you up, and brings a skill point (two at every fifth level). It's kept in the save.

## Play: Velscour's Throne

Run `play.bat`, or `python tools/serve.py`, and open `http://localhost:8402/`. It needs a WebGPU browser: current Chrome,
Edge and Safari on PC and phones, or Firefox on Windows. On a static host it reaches the same state through `coi-sw.js`.

**Game files kept on the device.** The first start asks once whether to keep the game here (a start downloads about
375 MB). Kept, `coi-sw.js` stores each file as it first comes down; every start after that reads `files.json` (every
file's version, about 130 KB) and downloads only the files that changed. Settings, "Game files", turns it off and clears
them. `tools/serve.py` makes `files.json` fresh on each request, so an edit shows at the next start. On a static host,
run `python tools/files.py` each time the game is put up (it's never committed: a stale one would hide changes).
Without `files.json` every file comes from the network as before. Checked by `node tools/keep_check.mjs` (three starts:
375 MB, then the page's first files only, then just the file that was touched).

| | PC | Phone |
| --- | --- | --- |
| Move | `W` `A` `S` `D` | Left thumb |
| Look | Mouse | Right thumb |
| Jump | `Space` | `JUMP` |
| Run | `Shift` | `RUN`, or push the stick past its edge |
| Dodge | `Q` | `DODGE` |
| Combo: two cuts, then a slam | Left click | `CUT` |
| Raise the shield and bash, hold to block, let go and it drops at once. With no shield, a wide swing | Right click | `WIDE` |
| Cast the spell in a slot | `1` to `6`, or click its button | Tap its button |
| Spellbook: the six trees, your points, and what's on the bar | `B` | `B` by the spell bar |
| Pack: staffs, skulls, robes and gems | `I` | `PACK` |
| Take up what's on the ground, or open a chest | `E` | `TAKE` / `OPEN` |
| First person or third, once you're out of Lisandra's cave | `V`, or the eye by the spell bar (hold `Alt` to free the mouse for it) | `3RD` / `1ST` |

Moving backward while cutting gives a rising backhand, running gives an overhead chop, and cutting in the air gives a slam.

A cut opens a gash in the plate, exactly where the blade crossed it on screen. A second blow on that gash goes through, and
the knight bleeds from that spot on every heartbeat. Your X turns red over a cut you could go through. Blood loss weakens
without finishing the knight, so you still have to land the end of it. A blade flashes before it falls: dodge, or swing into
it to parry. Slams and chops break a guard faster than cuts, and running, dodging and swinging all spend your breath. Hitting
the silver knight makes an enemy of them too.

The black knight reads your swings after a human reaction time, and reads the ones you repeat sooner. They answer with the
shield, a roll to clear ground on your flank, or a step back, and punish whiffs with a lunge. They feint, keep a wounded side
turned away, and when badly hurt fall back behind a house and come around the corner fast. Their plans show in how they hold
themselves: bait drops the shield and dares you.

Knight fights are the template for every knight to come (`ATTACKS`, `NEXT` and `STYLES` in `src/sim/knight.js`). Besides
the shipped sword clips they have moves from Lisandra's pack, retargeted onto the master skeleton: a slash, an overhand
chop, a kick, a pounce, two shield blows, a stalk, a run, a point, a taunt and three flinches. Each knight has a style.
Velscour's is a brute who stalks in, kicks and hacks in runs of up to three. Tessariel's is a duellist who leads with the
shield and answers every blocked blow. A run of blows branches on how the last one went: into a raised shield comes a boot
or a board to break it, through a broken guard the big one, and after a pounce the chop (or the overhead, against you).
Every blow is gated by its measured reach (`TIP`): a knight closes to where it lands and no closer, so nobody swings at air
or ends up chest to chest (knights keep 1.3 m apart, and 1.5 m from you). The shield arm keeps its guard through blows whose
clip has an empty left hand. A shield is carried as the period sources show it: at ease the arm hangs palm to thigh and the board
hangs against his left side, face out, its top a hand below the shoulder; on guard it stands upright before him, top at
the chin; in a shield blow it is driven square at the foe instead of rolling with the fist. Each hold is found on each
knight's own body when he loads. Big blows wind up slow and land fast, a heavy or a broken guard can put a knight on his back
(once in ten seconds at most), and he taunts only over a man he's put down. Against spells, a knight raises his shield to
fire from the front and walks in behind it. Great crabs keep the shore of the pool under Brightwater Falls, and come at you
from different sides.

Two animals keep their own ground and want nothing to do with the duel. The Gravehart holds the north: it warns you off, lets
you leave if you do, and stalks you if you don't. The Bone Hydra lies at the bottom of the rift under the catacombs, and its heads can be cut off.

F3 shows frame time, threads and what the knight is thinking. On a phone, turn on **Frame rate readout** in Settings.

### The two sides

- **V is Velscour**, the bad guy, the demon lord: essentially Satan.
- **T is Tessariel**, the good guy: essentially Jesus.

They don't go together. Anything with a V on it is never found anywhere near anything with a T. The cathedral and its catacombs are the church of Velscour, so they carry V items only: no T banners, no T marks, none of Tessariel's blue and gold. Check the picture, not the file name, before placing a banner, a window or any marked art. In the stained glass cut for the cathedral, only `glass_a_1`, `glass_b_1` and `glass_e_1` are Velscour's, with his angels beaten down beneath him; the other panes give the angels the picture, and stay out of his church.

### How it plays

You start on the road south of town with a common staff of a random kind (a different one most games: `rollStarterStaff` in `src/items/items.js`) and a plain kite shield, and no skull or gems; your first skull is Bram Kettle's reward for A Bed and a Bell. The town is safe ground: nothing out of it follows you in (`inTown` in `src/core/town.js`, the box from x = -62 to 95 and z = -58 to 62). Velscour's knight stands at the foot of the cathedral steps, out east of the town, and lets you go 20 m from it, or once you're back in town. Four of Tessariel's knights walk the village streets, one in each of the other suits, and a man-at-arms in plain plate with Velscour's shield keeps the west road (`TOWN_KNIGHTS` in `src/core/knights.js`). Out in the woods, packs climb out of the ground ahead of you (`stepWoods` in `src/sim/undead.js`): 6 to 12 undead in two waves, a champion with every other pack. Every zombie outside the catacombs comes up out of the earth (`Zombie.rise`); four burial grounds in the woods break open as you come near (`stepGraves`, `GRAVEYARDS`). You know the first spell of each of the six schools, and learn the rest with the points your levels bring (see "Spells"). A scroll teaches one spell of a school's second or third tier for no point, once you're of a level to read it; one you can't read yet stays where it lies, and one you know already sells for 40 gold. Gold and orbs collect as you walk over them, and better loot comes from further out and deeper down (`setFind`).

### Third person

`V` (or the eye at the end of the spell bar, or `3RD` on a phone) stands the camera behind you, and the same again brings it
back. The controls don't change: you look, move, shoot, cast, guard and ride as before, and the X in the middle of the
screen is still what you hit. Which view you left it in is kept with the settings.

- **Not in Lisandra's cave.** The switch isn't shown until you're out and the walk down has begun (`thirdAllowed` in
  `src/core/third.js`), and `V` only says so. Your staff and spells wait for the same moment (`Sim.unarmed` in
  `src/sim/sim.worker.js`): from giving your name until the cave has fallen in, a click or a cast does nothing. The waking
  scene's own cast is left as it was.
- **The body** is the owner's Tripo wizard, `assets/game/player/wizard.glb`. It came as an FBX with a walk, a run and a fall;
  `tools/player/build.mjs` (Node, with `three` and `sharp`: the usage is at its top) makes the GLB from it, in metres, sized
  so its eyes stand at the first-person eye, the walk's and run's travel taken out, colour and normal at 2048.
- **Everything he does** is `src/sim/playerbody.js`, on the sim thread, written into a character slot of the snapshot like
  anyone else's (the slot after Lisandra's, not counted in `H.NCHARS`: everything that walks that list is looking for
  someone else). Nothing is posed while the view is first person.
  - *Standing* is the bind pose with the arms let down, breathing.
  - *The legs* are the file's walk and run, mixed by pace and kept in step, played backwards going backwards. The hips turn
    the way you're going and the chest keeps to where you look. A jump hangs in the run's flight. The fall is the death.
    The game's run (5.6 m/s) and sprint (8.6) are well over the clip's own 4.2, so the legs only quicken so far (`QUICKEN`)
    and past it the feet slide a little.
  - *The hands* are put where they hold things by a two-bone solve from the shoulder, the fingers shut round them (`HOLD`):
    the staff as a walking staff in the right fist, the skull under the left hand in a claw (as first person has it), or,
    with no skull, the shield on the left forearm, raised across the chest when you guard. An empty hand swings as the clip
    has it.
  - *The shield on the back.* With the skull in hand the shield is slung on his back, leaned over so its point is down
    toward one hip (`BACK_AT`, `BACK_LEAN`). On a ride it's under his feet instead.
  - *The casts* (`CASTS`) are poses of the arms and chest alone, timed by the first-person hands' own clips, so they play
    standing, walking or running, and a spell leaves on the same tick in either view: the staff's shot (a dip, straight
    up, tipped forward as it fires); a spell thrown with one hand (the staff drawn back by the ear and thrust out) or
    pushed with both (staff and skull, or open hand, or shield, shoved out together); one raised with one hand or with
    both. A held spell keeps the pose, with a tremor.
  - *The shield ride*: side on to the way the board's going, left foot ahead, knees bent, feet on the board's own slope,
    head turned down the hill, the staff held up clear of the ground.
- **What he holds** are the items' own models (the ones that lie on the ground), drawn where the sim says his hands and
  back are (`PlayerBody.hold`, `selfItems` in `src/gfx/renderer.js`). The first-person arms aren't drawn.
- **The camera** (`THIRD` in `src/core/third.js`, `GameView.updateCamera`) looks along the same line you do in first person,
  from a point a step to the right of your eye and a little over it, 4 m back. So the X is still your aim: the sim
  aims from that same point (`Casting.eye`), and bolts leave the staff's head or the palm you can see
  (`Casting.bodyPalm`) for whatever is under the X. The sim finds how far back there's room (walls, the ground, a low roof
  indoors) and the camera closes in at once and eases back out. Closer than a metre, the body isn't drawn.
- `tools/player/view.html` shows the body alone with what it holds, every pose on a button, and makes sheets of stills:
  `?sheet=idle,run,throw2,raise2_run&views=front,side,back&t=0.3`. `node --test tests/player-body.test.mjs` checks the poses with no
  GPU: feet on the ground, things in the hands, the shield where it should be, the casts, and the cave's lock.

Known limits:

- Nobody has played it by hand. It was driven by script in Chromium on a software GPU, on the Mobile and High tiers, and
  the poses judged from stills, not motion. Foot sliding at a sprint and the blends between poses want an eye on them.
- The staff in his hand has no glow at its head and nothing dangles from it: those are the first-person staff's own.
  A skull's gems and burning eyes aren't on the one he carries either.
- Robes found in the game don't change what he wears, and Tripo's sculpt has short sleeves: his forearms are bare.
- The other spells that start from the eye (the cone of Arcane Blast, a Blink's line) still do, half a step left of the
  camera's line.
- Indoors the roof is kept out of the camera's way by holding it low, not by testing the ceiling: looking steeply down in
  a house brings it in close.

### The walk down, and the quest trail

After the cave falls in, Lisandra leads you down the Long Road to Bellmourn (`escort` in `src/sim/opening.js`, the road itself in `src/core/escort.js`). She keeps about 5.5 m ahead of you at your own pace: come up on her back and she hurries on, stand still and she strolls on to about 14 m and waits for you, calling you on. Ride your shield and she jumps on one of her own (the Old Tree kite shield, green with a silver tree: no V, no T) and rides about 9 m ahead, so you never get past her. She talks the whole way: her road lines (`CUES` in `src/core/opening-script.js`) wait their turn and never overlap, a place on the road (the bend, the pines, the town in sight) brings its own line to the front, and between them she runs through the hill's talk above the pines and the low road's after the fight.

A gold dotted line on the ground leads to whatever the quest you follow wants of you now (`src/ui/trail.js`, drawn in `src/gfx/trail.js`). In the journal (J), tap a quest to follow it, or the same one again to hide the trail; a new quest is followed as you take it, unless you're on Lisandra's round of the town, which stays followed (it leads to whoever you've still to see, nearest first). Before any work, it leads to Lisandra where the road comes into town, or to Bram at the inn. In the opening it runs down the road after Lisandra. In town it goes round the houses by the townsfolk's own walking grid (a route asked of `src/folk/folk.worker.js`), out past the town along the roads and paths where they're shorter, and into the cathedral by its own way down to the Bell Crypt (by the Sexton's Door once you have his key).

### The cathedral and the catacombs

Out east of the village, along the church road and 60 m past the last of the town, through the great door at x = 156: the nave, the pulpit, the back office, a long stair, then the Bell Crypt, Reliquary, Gallery, Ossuary, Founders' Hall, Abbots' Gallery and Tomb. Undead are stood at the catacombs' spawn points as you go down (`stepCatacombs` in `src/sim/undead.js`), reusing bodies, because there are more places than bodies.

Where it all stands is two numbers, `CHURCH_X` and `CHURCH_Z` in `src/core/church.js`. `build_interior.py` lays the church out where it was first drawn (the door at x = 66) and moves every piece of it by them; the game reads them wherever it cares where the church is: the ground it's levelled on, the knight, the Hydra's pit, the catacombs' lords, the shaders' `indoorAt`, the map, saves made inside it. To move it again, change them, rebuild the interior and run the checks below. Its first ground, x = 58 to 124, is left levelled and clear of pines for the town.

Below, what makes it a catacomb is built, not painted: tiers of burial niches (loculi) in the Gallery, arched wall tombs (arcosolia) cut back into the walls, two side chambers (cubicula), light wells (lucernaria) in the Gallery, Hall and Tomb, candelabras and hanging wheels of candles, kerbs, gutters, ledger slabs and a lit lane to each altar. Tiles marked `deep` in `manifest.json` are weathered by the `params.z < 0` block in the STATIC shader: deeper relief, mortar and cavities, damp runs, a tide line and standing water. Value 2 also mixes two shifted copies of the tile so it stops repeating; keep that off anything with block courses, or the wall reads as mush. The village has no such tiles, so it's untouched. Underground the frame lights twice the tier's count of lamps (a phone keeps its two). Each room's flames have their own colour: see `hue` in `below()`.

- `tools/interior/cut_sheets.py` cuts the texture sheets, `build_assets.py` makes the game's textures, and `build_interior.py` builds the geometry when run in Blender.
- `node tools/interior/check.mjs` walks the whole route and checks every spawn can be reached. The spawns past the Mourning Rift's gap are left out, since nothing can walk there.
- `node tools/interior/homes.mjs` walks in, up, round, down and out of every house. `node tools/interior/gulf.mjs` crosses the rift: the gap at a run and at a walk, the fall, the scaffold back up, and where the dead can't go.
- Build the village first if the houses moved: `tools/interior/build_interior.py` reads `homes` from `village.json`. In Blender with `-b --factory-startup`: `tools/village/run_build.py`, then `tools/interior/run_build.py`.
- `tools/interior/walk.js` walks the route on the player's own keys and camera, logs stuck spots and hits, and saves first-person shots. It tops up the player's health as it goes.
- `tools/interior/tour.js` and `sheet.py` take and tile the review shots. Set the page to a real size first: a tiny canvas gives blurred shots.
- `indoorAt` in the shaders treats anything below y = -6 as underground, so a catacomb ceiling must stay under that or the sun lights it.

The Mourning Rift is a side branch off the north gate of the Founders' Hall, 30 m across and 20 m down, its terraces stepping down to a narrow floor and a burning stream. The rope bridge sags 2.3 m and is missing 3 m of planks a third of the way over: a run and a jump clears it, and a jump from a walk only does from the very lip. A fall leaves you on your last legs, never dead (`FALL_SAFE` in `src/sim/player.js`), and a scaffold stair along the rift, with a brazier at its foot, brings you back up. The room across has a chest and six undead, and there's another chest on the rift floor. The design follows the Mourning Gulf in the Bellmourn repo, built here with this game's textures and his red in place of its blue. The bridge is static, it doesn't sway. The dead walk the bridge and shelves up to the gap and won't step off (a floor marked `pit`, read by `inPit` in `src/core/interior.js`). Only the player can be under the bridge, so the floors in the rift are an entry in `homes`, chosen by how high you are (`homeFloor`).

### The village's houses and chests

All twelve houses can be entered: furnished, with a stair and an upper floor, built in `class Home` in `tools/interior/build_interior.py`. Colliders with a `b` only stop feet above that height, which is how an upstairs has its own walls. Every door is a model (`tools/doors/model.py`, in Blender, from the pictures by way of `tools/doors/trace.py`), shut until you press E at it, and E shuts it again. `src/items/doors.js` swings them; a shut one stops you, spells and sight.  The dead and the surface creatures don't come in.

Chests (`src/items/chests.js`, placed by `chest(...)` in the builder) open on `E`, the lid swings up on its hinge and gold, gems and gear spill out. Which are open is saved. Gold is counted in the pack.

### Sound

Everything is MP3 in `assets/game/audio/`, named in `BANKS` in `src/audio.js`. The fight's and the dirt steps' sounds load before the
game starts; the rest come in the background once it has.

- **TomMusic's Free Fantasy SFX Pack** (all 204 files, `tools/audio/build_fantasy_sfx.py`): footsteps on dirt, stone, boards and water
  (`src/ui/places.js` says which is underfoot; knights in plate get the chain ones), doors and the cathedral's great doors, the
  Sexton's lock, chests, the woodpile's axe and the smith's hammer (`blows` in `src/folk/folk.worker.js`), a lamp lit as someone
  comes home, the nearest fire's crackle, and a layer over each spell's own made sound (`src/spellsound.js`). Its 60 s beds play by
  where you are (`sounds` in `src/ui/lands.js`): the woods by day and by night, rain on the Weeping Fen and on Sallowmere's shore, a
  storm over Velscour's keep, a house's quiet, the cathedral with the storm on its roof, the catacombs, the Rift, the falls.
  The portcullis is the Test Dungeon's door. Not used anywhere yet: the sea's three beds, the beach's plain and stormy ones, the rain and storm beds
  for a house, the cave in the rain, the river stream, the chest closing, the sword sheathed, the bow's shot and its block.
- **400 Sounds Pack** (`tools/audio/build_extra_sfx.py`; the zip carries no licence): coins, gems and orbs picked up and landing, a
  scroll, robe, skull or staff taken, the spellbook and the journal, the big map, bone snapping and gore on the undead.
- **MenuSFX** by Kevin Fowler (CC BY): the clicks of the game's own panels (`ui_*`). The title and the pause menu keep their own.

### The title, saves and settings

`src/title.js`, from Bellmourn's title screen: Blastorama Gaming's card, then Jamie Herrington's, each with glints flaring on
the edges of its letters, a sheen, gold dust and a tinkle of glass bells for every glint; then Bellmourn's logo with its
church bells ("Orthodox Church Bells Ringing", Free Sounds Library, CC BY 4.0) and the title's song ("Frozen Hearts", from
Bellmourn's music). A click, a tap or a key skips a card. The game loads behind the black, and the village isn't drawn
until you start: the title stays on black.

**New Game**, **Continue**, **Load**, **Test Dungeon** (below), **Settings**, **How to Play**. Esc (or `II`) pauses: **Resume**, **Save Game**,
**Load Game**, **Settings**, **How to Play**, **Main Menu**. There are ten save slots, and the game keeps itself every 20 s
of play, whenever you pause, and when you close the pack or take something up; Continue picks up the newest of those. A save
holds where you stand and which way you face, the time played, and your pack and what's on you: loading starts the world
fresh and puts you there, so whatever was lying on the ground is gone. Saves live in `localStorage` under
`velscour.*`, so they never meet Bellmourn's on a shared host.

A save is a set of named parts (`src/saves.js`), each written and read by the system it belongs to; `player`, `stats` and
`pack` are added in `src/main.js`. Quests and the world's own state are meant to come in as parts of their own with
`addPart`: a save made before a part existed loads it as `null`, as in a new game. When a part's shape changes,
raise `SAVE_VERSION` and add a step to `MIGRATIONS`, so older saves are brought up to date as they load.

Settings: volume, music, ambience, look speed, resolution (Auto lets the frame-rate governor choose), graphics (Auto
picks from your GPU; changing it restarts the game, back to the menu with your game kept for Continue) and the frame rate
readout.

To change the difficulty, the numbers to reach for are `hp` and `delay` (crabs) at the top of `src/sim/sim.worker.js`, `hp` in
`Player.reset`, and `dmg` in `ATTACKS` in `src/sim/knight.js`.

### Auto-play

Velscour's Skull (beside the corner map with the mouse free, or the `` ` `` key) takes a second word: **Jamie**, in any case.
It wakes the **Auto** button under the skull, taken from Velscour (`assets/ui/btn_auto.webp`, and its blue glow from
Velscour's `css/style.css`). The button, or **P**, turns auto-play on and off. Like the cheats, it lasts until the page is
reloaded.

While it's on, the game plays itself as a player would. It works the same controls as you: the move keys, the look, the staff,
the casts, jump, dodge and E. Nothing is moved or handed to it.

- **The opening.** It waits out the cave and answers Lisandra with a name (Jamie, if nobody has yet). It walks out, then
  follows her down the Long Road to Bellmourn, a few strides behind her as she leads. It rides its shield down the steep
  stretches, so she rides hers, and it fights the dead on the road. In town it takes her round of the townsfolk first.
- **Quests.** It takes every quest the town has, talks each step through, and hands in. It does them in an order that suits
  its level (`PLAN` in `src/ui/autobrain.js`), and does night work by night. When something waits on the morning, it sleeps
  at the Tolling Bell.
- **Getting about.** The catacombs are reached by the Sexton's door, kept well clear of the black knight's post. The countries
  are reached by the roads and across country, through the seals it has woken (it steps onto each one it passes near).
  It works its way round walls, the catacombs' light wells and stands of pines by short paths a stretch at a time.
- **The shield.** Before a long downhill stretch it takes a run, jumps and holds Space to ride the shield, and carves with the
  move keys along the way it's going. It steps off where the ground levels out and it's slowing, near where it's going, or
  when there's a fight.
- **Fighting, as a person would.**
  - It takes a moment to settle on a new target and only lets fly once its aim is on. The aim leads a moving target, and is a
    little off, more so on something quick.
  - It backs off from what's close while it shoots, steps side to side, and closes on what's far. When something gets on it,
    it walks backwards toward open ground, still facing it and shooting as it goes (backwards is a walk, as it is for you, a
    little slower while it shoots). Only when it can't back away (something quicker than that at its heels, something right
    on it, a crowd all round, a wall behind) does it turn and run a few strides, then turn back. Hurt, it backs away from
    something slow the same way, and runs from anything quicker.
  - It dodges a knight's blade flash, or takes it on its shield. With a shield in hand and no skull, it raises the shield with
    a shove when something's on it, holds it a moment, and backs off to shoot again. It steps aside from a tumbler rolling at
    it, which can't turn quickly.
  - **The staff is what it fights with.** A spell comes every few seconds at most, and only when the moment suits one: a crowd,
    something big or quick, or once in a while anyway. In trouble it casts at once: a Mend when it's low; a Frost Nova, a
    Thunderclap or Turn the Dead, whichever it knows and has ready, when it's surrounded.
  - **It spends its skill points**, as you do in the book (B), by a build written down for it (`BUILD` in
    `src/ui/autobrain.js`), each thing as soon as it can be bought: a Mend first; Lightning to a Thunderclap by level 6,
    for when they're on it; Turn the Dead for the packs; a Thunderbolt at 11, which is what it takes to the black knight's
    shield; then Fire, to a Meteor at 18; then masteries, more ranks, and Ice to a Frost Nova. Past the end of the build a
    point goes into the known spell with the fewest ranks. Every point it spends is in the balance log.
  - **It sets its own spell bar**, and casts from it as the 1 to 6 keys do. It keeps on it what it leans on, once it knows
    them: Firebolt, Mend, Turn the Dead, the first it has of a Frost Nova or a Thunderclap (what it casts at once when
    it's surrounded), and the first it has of a Meteor or a Thunderbolt (what it brings down on a raised shield). The other
    slots change every four minutes, so in time every spell it knows has been in its hands and in the log. It won't cast a
    spell that isn't ready again yet.
  - It picks the spell that suits the moment from what's on its bar (`USE` in `src/ui/autobrain.js`, a rule for each of
    the sixty). Some of them:
    - Arcane Blast, Cone of Cold, Thunderclap or Turn the Dead when they're close; Stoneskin or an Aegis when it's hurt
      and they're on it.
    - Bone Lance, Earthsplitter, a Phoenix or Disintegrate down a line of them.
    - Gravity Well, Blizzard, an Earthquake, a Thunderstorm, Starfall or a Meteor into a crowd.
    - A Monolith, a Thunderbolt or a Cinder Brand on something big.
    - Life Drain, Renew or a Sanctuary when it's hurt; Shatter only after its own cold has just landed.
    - Frost Shards, a Rime Lance or a Spark on something quick.
    - Blink and Stormstep it leaves alone: both carry it through the fight, and it fights from a distance.
  - It runs from what it can't beat yet: the knights of Velscour, the Gravehart, the Hydra, the dragons and anything else too
    strong for its level.
- **The camera** turns like a hand on a mouse: it eases into and out of every turn, at no more than about 3 rad/s walking,
  4.2 in a fight and 1.6 on the shield. It moves through `Input.look`, so the hands sway as they do for the mouse.
  - Getting about, it faces the way it's going and walks forward (W, with a touch of A or D to keep its line). Its eyes run
    a few strides on along its path, so it looks round a bend before its feet get there. Turned well away from its way (a
    sharp corner, somewhere new to go), it turns on the spot first. It looks a little down at the ground ahead, and up or
    down a hill with the slope.
  - It looks elsewhere only for a reason: at what it's fighting, at a door it's opening (it stops, turns to the door and
    opens it), at whoever it's talking to, at a chest, and at Lisandra when she stops on the road.
- **The black knight.** From level 11, when its build has a Thunderbolt, it goes after Velscour's knight on the cathedral
  steps (it was level 8 when every spell was known from the start, and it had a Meteor):
  - It stands on his flank, just past the 20 m he keeps from his door.
  - It works on him with the staff and with Thunderbolts, and later Meteors, which fall from the sky where his shield can't
    stop them and reach the thirty paces it stands off at. Bolts wait till he's turned from it.
  - If he comes out after it, it backs off, shooting all the way, and runs a few strides when he gets close.
  - If he beats it back to the town, it tries again two levels stronger.

  Before the six trees, at level 8 with a Meteor, he went down in 36 seconds once and in about a minute and a half the next
  time, without the bot falling below 80% of its life. With the trees it was run once, headless, set to level 12 in the gear a new game starts with: it brought thirteen Thunderbolts down on him over about three minutes, between packs of the risen, was never beaten back, and went on to hire a party (his end is read from its status line, which went from "90 of 520 left" to its next job and a new level). An earlier build with only a Wall of Fire couldn't reach him from where it stands, which is why Thunderbolt is in the build and the level is 11. The balance log keeps every attempt.
- **Its party.** From level 6, once it can pay, it walks to the nearer quartermaster of the Free Company, opens his books
  with E, and hires a lancer first, then a paladin, then the best two others it can afford (`hiring` in
  `src/ui/autowarrens.js`). With them at its back it plays as a group does (`helpPick`, `tankNear`, `partyStrong` in
  `src/ui/autobrain.js`):
  - It takes what's on the healer, or on one of the others, off them first: the healer before anyone, then whoever's
    lowest. What's on the tank it leaves to him.
  - Otherwise it shoots what the tank is holding, so the damage goes on one and nothing it pulls is loose.
  - What's on one of them is its fight too, out to 30 m, even on its way somewhere.
  - When something's on it, it backs off toward the tank, so he can take it, rather than off into open ground.
  - With a tank and another standing near, it stands up to what it could take two levels on. Velscour's knights and the
    Gravehart it still judges at its own level.
  - One of them down, it stays by them till they're up again, a few seconds after the fight (ten seconds at most).
  - Down the Warrens it goes on to the next room only with the party up and with it (up to twenty seconds' wait), and
    in a boss fight it takes the rank and file off the healer after the adds.

  It reads who each monster is after, and what each of its party is on, from the snapshot (`C.AFTER`, written by
  `writeAfter` in `src/sim/sim.worker.js`).
- **The Hollowfang Warrens.** From level 7 with a full party it goes in by the portal and walks the caves room by room,
  by the caves' own flow field (the nav thread's grid stops at the edge of the world). Before each boss's room it waits
  for the party to gather and mend. In a fight it answers the boss's calls (`tactics`): out of a circle or a fire before
  anything else, at Venomaw's side and well off when she's down, behind the pillar away from her when she flies, away
  from Skrat's whirlwind, the adds first (diggers, whelps), and the healthier twin. When a boss turns on it, it gets
  behind the tank from it (or well out of its reach with no tank up) and shoots it as it comes. Three wipes count as beaten back: it
  leaves by the way in and comes back two levels stronger. Once Venomaw's dead it goes out by the far portal.
- **The run.** Shift is held for the run whenever it's going somewhere more than a few strides off, in long stretches:
  it lets go when its breath is short and takes it up again once it's back, rather than flickering between the two.
- **Loot and gear.** It picks up what falls and opens the chests it passes. It wears the best of what it carries, sets gems
  in open sockets, sells what it won't wear, and buys upgrades, scrolls it lacks and a mending in the town's shops.
- **Grinding.** It grinds for levels when no quest suits it yet.
- **The Test Dungeon.** It fights whatever's been summoned, going in after it once the door's up, and otherwise waits in the
  hall, mended. It never summons anything itself (`hallRun`).

Its status shows under the button, with its level and how many quests are done. When every quest is done and there's
nothing left but grinding, a menu asks where:

- the woods round Bellmourn
- the catacombs
- the monster lairs it can take
- the jelly camps
- roaming the land

The menu keeps the last choice after 12 seconds, and it comes back when you click the status line.

**For balancing.** Auto-play keeps a log, for reading a whole run afterwards. Open it with **log** under its status line, or
**Balance log** in the menu. It lists:

- each level and how long it took
- each quest, from taken to done, with the level at each end and how often it was beaten back
- fights by level: how many, how long, life lost, kills, lowest life, and where
- kills by foe, the bosses it's been at, and every spell, staff shot and raised shield
- every time it was beaten back, and what it was doing

The log is kept in this browser across reloads until you start a new one, and **Save as JSON** downloads it. When a quest beats
it back, it comes back to it two levels stronger, so the log shows where the difficulty jumps.

While it's on, the mouse is left free: no pointer lock, so the button and the menu can be clicked. Esc pauses and resumes.
Pressing a move key (or the stick) takes the controls back for as long as you hold it.

**Keeping it up with the game.** It has to be taught what's added to the game. Quests, steps, places, foes, lairs, spells
and shops are listed in `src/ui/autobrain.js` (`PLAN`, `area`, `HUNTS`, `fightable`, `LAIR_LEVEL`, `USE` for the spells and
`BUILD` for its points, and the Test Dungeon's counters in `HALL_COUNTERS`); the Warrens' rooms, packs
and bosses in `src/ui/autowarrens.js` (`WAY`, `KNOWN`, `tactics`). `coverage()` there lists
whatever the game has that it doesn't know, in the console when auto-play starts, and from `node tools/autoplay/check.mjs`,
which fails until the list is empty. Until it's taught, it makes do:

- a new quest goes on the end of its plan, at a level guessed from what it pays
- a new foe is judged by its life against its own level
- a new place is found from `SITES`

The check also names a new kind of quest step, a spell it has no use for or that stands in no tree, a build that can't be
bought as written (it's played through from level 1 to 50), and a new block of monsters in the snapshot it doesn't read yet.

**Files.**

- `src/ui/autoplay.js`: the button, the status line and the menu.
- `src/ui/autobrain.js`: the head.
- `src/ui/autowarrens.js`: hiring a party, and the Hollowfang Warrens.
- `src/ui/autolog.js`: the balance log.
- `tools/autoplay/check.mjs`: does it know the whole game?
- `src/sim/nav.worker.js`: its paths. This is the sim's own `World` on a thread of its own, with a half-metre grid worked out
  as paths need it. The sim's grid is a metre, made wide for a knight, and is too coarse for the Sexton's passage. Out in the
  countries it lays a fresh half-metre grid round each short stretch, at the land's own height.
- `Input.auto` and `Input.free` in `src/input.js`.

**Known limits.**

- It doesn't take stairs, so it only talks to people on a ground floor. Someone upstairs, or asleep upstairs, is left until
  later.
- It leaves Velscour's man on the west road alone until level 18.
- The far countries are a long walk until their seals are woken.
- It has been run headless on a software GPU with the drawing switched off, not by a person watching it. Watch the first
  hour of a new game with it.
- The party and the Warrens were watched the same way (headless Chromium on a software GPU, `?auto&noopening&timer`, the
  renderer's frame stubbed so the game runs at full speed): from level 7 it hired a party, cleared every pack, beat
  Grubnash and the twins first time, wiped once on Venomaw's flight (since fixed: see the Warrens), killed her on the next
  go and left by the far portal. On the Fall it boarded at the top, carved down at up to 19 m/s and hopped the rises.
  Nobody has watched it with their own eyes.

### The Free Company: a party of your own

Two quartermasters of the Free Company hire out the other Tessariels: Aldous Fenn by the square, and Captain Merrow Vale at
the Hollowfang Warrens' portal (`BROKERS` in `src/core/heroes.js`, `BROKER_SPOTS` in `src/core/dungeon.js`). E opens his
books (`src/ui/party.js`): up to four at a time, each with a name of the Company's and a level near yours, paid once, in
gold by their level (`hirePrice`). Their levels go up with yours. The party is kept in the save, and down the left of the
screen is a frame for each, with their life.

- **Lancers tank, paladins heal, everyone else does the damage** (`roleOf` in `src/core/dungeon.js`). The tank holds what
  he hits and every few seconds turns anything loose on the rest of you onto himself (`tauntBy` in `src/sim/foes.js`). The
  healer keeps nine metres back and mends whoever needs it most, with a quick light or, for someone low, a great one. The
  rest take the fight's adds first, then what the tank's holding, then what you're shooting.
- **They go where you go**, along your own path, so they come round corners after you, at your pace (they run when you
  do), and stand round you when you stop (`heel` in `src/sim/hero.js`). Left far behind, or through a portal without
  them, they catch you up.
- **They ride the shield with you.** When you get on your board, they get on theirs, beside and behind you, and step off
  when you do (`updateFreeSurf`).
- **They fall and get up.** One who falls lies there till the fight's over, then gets up with half their life.
- **They carry a light.** A spirit-light floats over each one's shoulder, as your Wisp Light does over yours
  (`partyLights` in `src/sim/hero.js`). By night, in the Warrens and below ground it lights them and a pool round their
  feet, so you can see them in the dark; by day it's a small glow over them and lights nothing. The renderer keeps their
  lights a place of their own ahead of the spells' (`FX_CARRIED`, `carried` in `src/gfx/spellfx.js`), so the torches
  and the fighting never put them out: four of them, or the nearest two on a phone.
- What they kill is yours: its loot and its experience.
- A word with one of them (E) lets them go back to the Company.

The bodies are the other Tessariels' own (`makeCast` now puts a lancer and a paladin first, so even a small world has
both). The quartermasters are two more bodies after them.

### The heroes' armour: what's between the plates

A hero's plates are rigid, so where two part as a joint bends, something has to show. `tools/heroes/mail.py` makes it for
all 44 bodies from each one's own plates (run it again after `build.py`): a mail liner under the torso, one sleeve down
each arm and leg, a coif, armpit gussets and a skirt, every end closed. On lancers, paladins, dragoons and boomerang
knights it's drawn as ring mail, bright on a bright suit and blackened on a dark one; on archers, bards, rogues and
ninjas as a dark quilted coat; inside a helm as shadow. The inside of a plate is dark iron, not its outer paint
(`heroLook` in `src/gfx/materials.js`; `docs/RENDERING.md`).

- **A chest put back on the body.** On six bodies (lancer_f2, archer_f2, archer_f4, archer_f5, rogue_m1, rogue_m4) the
  armour tool had cut the chest onto the limbs: the two halves of the breastplate rode the upper arms, the belly and
  skirt a thigh. Arms down, the chest swung up to the ears and left a hole. `python tools/heroes/rebind.py` finds a
  chest cut that way and gives it a coat's weights instead: the trunk by height, only the shoulder caps on the arms, the
  skirts shared between the legs. It also mirrors an arm plate that's on one side only (paladin_f2's right vambrace).
  Run it before `mail.py`, after `build.py`.
- **Every piece checked against the bone it sits on** (`misplaced` in `rebind.py`, all 44 bodies): besides those six
  chests, two boomerang knights had a chest strap bound to the left upper arm; it's on the trunk now. Nothing else
  was bound to the wrong part of the body.
- **Knee and elbow cops ride the bend** (`cops` in `rebind.py`): on 34 bodies the small plates over the knees and
  elbows were each wholly on one bone, so they swung off the joint in a bend. They're bound half to each bone now, and
  stay rigid.
- **Where there's no plate at all.** The bodies are built from the armour parts of the source suits and nothing else:
  no body under them. Where a suit shows bare arm or midriff (paladin_f2's upper arms: the single-suit female paladin
  has none there either), there is nothing to restore, and the mail or the quilted coat is what covers it. Bodies made
  from parts of several suits show more of it at rest (5.3% of the outline, against 3.2% for single-suit bodies).
- `python tools/heroes/gaps.py [ids] --out DIR` poses each body with the game's clips, skins it as the GPU does, and
  counts what shows from four sides: see-through holes, the insides of plates, and the covers. Over all 44 bodies and six
  poses, holes fell from a mean of 0.15% of the outline to under 0.1%, and lancer_f2's chest (2.5%, standing still)
  closed. With her coat back on her, archer_f4's crouch went from 2.5% to 0.01%.
- It was reviewed twice by two reviewers briefed as character artists of thirty years (2026-11-10), from game frames
  taken headless. Left undone from their lists: the lower back in a deep crouch (easing the liner onto the cuirass
  sooner was tried and showed more cover, not less), and the lances' black and yellow stripes (the owner's item art).
- The frames were of ten bodies on a software GPU at one sample a pixel; nobody has looked at the result on a real GPU.

### The Hollowfang Warrens

The first party dungeon (`src/core/dungeon.js`, `src/sim/dungeon.js`): a cave system the kobolds dug and the goblins took,
with Venomaw, the green dragon, asleep on her hoard at the bottom. Its portal stands in a heap of rock in the woods
north-east of the town, near the kobolds' den (`PORTAL`), with Captain Vale beside it. It lets in only a full party: four
with you, a lancer and a paladin among them. Inside, a portal by the way in takes you back out at any time, and one behind
the hoard opens once Venomaw is dead. Clearing it pays 1,500 experience and 250 gold, and it all stands again after.

- **Where it is.** Out past the edge of the world and fifty metres under it, so nothing on the surface is ever near it. Its
  shape is nine rooms and the tunnels between them (`ROOMS`, `TUNNELS`, `PILLARS`), made into one field of how far each
  point is from the rock. The sim walks against that field (`src/sim/world.js`), monsters and the party find their way by
  a flow field of its own (`CaveNav`), and its walls, floor, roof, stalagmites and torches are built from it with the
  world's places (`cave` in `src/core/sites.js`), lit by its fires: about a hundred wall torches (one every seven
  metres round a room, every six down a tunnel) and thirty-odd braziers on posts round the bigger rooms (`torches`,
  `braziers` in `src/core/dungeon.js`). Down there a frame lights the thirty nearest of them (two and a half times the
  tier's count; a phone keeps its two), and a frame's lamps went from 28 to 36 for it (`MAX_LIT` in
  `src/gfx/shaders.js`).
- **The packs.** Five rooms of kobolds and goblins, which wake as you come into them and stay dead till the Warrens reset.
- **Grubnash the Tunnel-King**, a kobold three times the size. Every few seconds he brings the roof down: a circle on the
  ground under each of you, and rocks a moment later. At seven tenths and a third of his life he calls his diggers out of
  three holes round his dig; they run to him, and each one that reaches him is eaten and makes him hit harder. Kill them.
- **Skrit and Skrat**, goblin twins. They share their pain: whichever has less life left takes half of what lands on it,
  so keep them even. Skrit throws firepots that burn the ground; Skrat spins his blades in a whirlwind. When one dies the
  other goes wild.
- **Venomaw, Mother of the Warren.** Only the tank should face her: her breath burns everyone in front of her, and her
  tail sweeps anyone behind. She spits acid that pools. At a little over half her life she takes to the air above her
  hoard and breathes across the whole cavern every few seconds: only rock between you and her keeps it off, so hide
  behind a pillar, while her whelps hatch. Then she lands, frenzied.
- **They come for you too.** The tank doesn't hold everything for ever. Every seventeen seconds or so a boss turns from
  him to you (Venomaw every twenty-two): it's called out, you have a breath to get behind the tank or out of its
  reach, and for four or five seconds nothing holds it (`turnOn` in `src/sim/dungeon.js`, `fixOn` in
  `src/sim/foes.js`). It doesn't turn while it flies, spins or breathes, and Venomaw holds her breath while her head's
  on you. Among the packs, now and then one breaks off the tank and comes for you for a few seconds, two at most at once
  (`stepPacks`); the tank goes after what's loose and takes it back.
- **Every mechanic is called out** on the screen as it happens, with what to do about it (`WARNINGS`), and each boss has a
  bar of its own at the top of the screen.
- **A wipe** stands you and your party at the way in, with everything you'd killed still dead and the boss you fell to at
  its full life again. A save made inside loads at the portal outside.
- **The bosses** are bigger, recoloured copies of the rank and file (`VARIANTS` in `src/core/tripo-monsters.js`): the same
  models and clips, a height and a palette of their own.

`node tools/dungeon/check.mjs` walks it: every room reachable from the way in, every pack's and boss's room in the open, the
portals clear of the rock, the roofs high enough and under the line the shaders call underground.

Tuning, headless (the sim in Node with no GPU): with a level 8 party and a player doing what a level 8 player's staff
does, Grubnash took about a minute and a half, the twins about two minutes and Venomaw nearly five, with the tank as low as
half his life and nobody dying. Its numbers are `BOSSES` in `src/core/dungeon.js` and the mechanics' in `src/sim/dungeon.js`.

### The Test Dungeon

**Test Dungeon** on the main menu is a place for trying out the monsters. You're stood at the south end of a bright white
hall, tiled, with a darker line in the floor every five metres to judge a distance by, and a big iron door at its north
end. Three people stand behind counters, and E at a counter talks to them:

- **Captain Merrow Vale, the Hall Stores.** Any staff, skull, shield, robe or gem in the game, at any rarity, for nothing:
  pick a rarity, then what you want, and it goes in your pack (at your feet if the pack's full). Under **Yourself**: your
  level, set to anything from 1 to 50; skill points for nothing (5 or 20 more), every spell learned in full with a branch
  of each, or everything unlearned; your life and mana filled; the pack emptied; gold. No V or T shields: those are the
  knights' own.
- **Aldous Fenn, the Free Company.** The quartermaster's own books (src/ui/party.js), and in here nobody's paid. With the
  other Tessariels off in Settings there's nobody on them.
- **Ysolde Marr, the Summoning.** A book of every monster in the game (`src/core/testhall-foes.js`): the risen and their
  masters, the great crabs, the Gravehart, the Bone Hydra, the Abyssal Mouth and Velscour's knights, every Tripo model by
  its group (the Warrens' bosses with them), every slime and every tumbler. Choose one, how many (and a size, or colours),
  add it to the summoning, and add more. **Summon** stands them in the arena past the door, and the door rises on them.

Once everything past the door is down (whatever they raised or split into as well), and you're back on this side of it, the
door comes down again and you can summon more. A fall stands you back at the start a moment later, with the arena cleared and
the door down. Nothing in the Test Dungeon is kept: no save is made while you're in it, so **Continue** is still the game you
were playing, and **Main Menu** from the pause screen takes you out.

How many can stand at once is what the world has bodies for (each line of the book says): 12 Tripo monsters in all, the risen
23 (the four kinds of them share their bodies), 40 slimes, 48 tumblers, 3 crabs, and one each of the rest. The one-of-a-kind
beasts are the world's own bodies, brought here with their ground moved under them (the Hydra's pit is the arena), and sent
home after. The Hydra is too big for the door: go in to it.

- `src/core/testhall.js`: where it all is, out past the world's west edge and fifty metres down, the far side of the world
  from the Warrens. Like theirs, its shape is a field the sim walks (`hallRoom`), with the door's way through open or shut,
  and its walls, floors, counters and lights are built from the same numbers (`buildHall`, for `src/core/sites.js`). The
  shaders light it white (`indoorAt` gives it 3).
- `src/sim/testhall.js`: the sim's side: the summoning, the door, what counts as down, a fall. `src/ui/testhall.js`: the
  counters' panels and the line at the top of the screen. `src/core/testhall-foes.js`: the keeper's book.
- `bm.hall('summon', { list: [{ id: 'tripo:kobold_1', n: 3 }] })`, `bm.hall('kill')` and `bm.hallState()` in the console,
  for tests.
- `node tools/testhall/check.mjs` walks the hall (every counter reached, the arena shut off with the door down and reached
  with it up, the doorway wide enough for a dragon) and fails until the book has every monster in the game. **A new
  monster, group, slime or tumbler goes in the book** (`src/core/testhall-foes.js`), and if it's a new family of body, in
  `spawn` in `src/sim/testhall.js`.

Auto-play knows it: in the Test Dungeon it fights whatever's been summoned, going in after it when the door's up, and
otherwise waits in the hall. It never summons, dresses or hires there: that's for whoever's testing.

Known limits: it has been driven through by a script in headless Chromium on a software GPU, on the Low and High tiers
(every counter; a summoning of every kind of body, 19 at once; the door up and down; a fall; auto-play clearing a pack and
coming back through the door; back to the title and a new game), not played by hand, and nobody has heard it. The monsters'
models come in as they're summoned, so the first summoning of a kind waits a moment for them. The Keeper is one more of the
Company's bodies, loaded with the rest whenever the other Tessariels are on.

### Swords, gems and the pack

You start with a common staff in hand and a kite shield on the arm, and nothing in the pack (`startingKit` in `src/items/pack.js`). `I` (or `PACK`) opens it and holds the fight. Click or drag to
move things, right-click or double tap to equip or stow, and click outside the panels to drop. A gem set on a sword goes in an
open socket, for good. Only the Sword slot does anything yet; the others wait for items. The pack stays with you through a new
fight, and only New Game starts it over.

`TEST_KIT` in `src/items/pack.js` is off. Set it true to start with a few rare staffs and skulls, a gem of each kind and some robes
to try out.

There are twelve swords from three Tripo sheets, 8 one-handed and 4 two-handed. Each is one model, used in the hand and on the
ground, where it's drawn at the size the knights carry theirs. A sword rolls a rarity (Common 60%, Uncommon 26%, Rare 10%, Epic 3.4%,
Legendary 0.6%), affixes and sockets. Four sockets only come on a Legendary sword, about one sword in 1,100. Gems come in six kinds and three
grades. The black knight drops a Rare or better sword and shield and a gem, the silver knight an Uncommon or better sword and a Rare or better shield, and a crab a sword (60%)
or a shield or gem (40%). Damage is weighed against a sword of 20, which the swings were balanced on, in `Player.bite`.

To change the rolls, see the tables at the top of `src/items/items.js`, and run `node tools/items/check.mjs` to test them. To add
swords, add the sheet to `tools/swords/sheets.py`, run `separate.py` and `render_icons.py` in Blender and `atlas.py` with Python. `lengthen.py` draws out the one-handers' blades.

Five suits of armour come apart into six pieces each: helm, cuirass, pauldrons, gauntlets, tassets and greaves, in slots of their own. A piece rolls the same five rarities, with its
suit's armour value and affixes, and lies on the ground as a small copy of itself, hovering, slowly turning, and glowing its rarity's colour. Knights and crabs sometimes drop one. Velscour's
side only ever drops the plain Knight's suit: see "The two sides". A chest can hold a piece too: a house's any suit, the priest's and what the dead keep only the Knight's, since those are in Velscour's church. Breakable boxes and pots aren't in the game yet.

### Gauntlets over the hands

The equipped gauntlets go over both first-person hands, in every swing and cast, from `assets/fp/gauntlets_<suit>.glb`. They're metal, and metal doesn't bend. So `tools/gear/gauntlets.py` cuts a
suit's arm into plates, one to a bone, carries each from its bone's frame on the suit to the same bone's on each rig, sizes it once, and weights it wholly to that one joint. The clips aren't touched, and nothing warps.

- The forearm and the back of the hand are the suit's own model. The upper arm is a second copy of its forearm, since a suit's own is modelled over mail. It comes with the gauntlets.
- Each joint of a finger is a round lame on the suit's steel, with a round cap at the tip. A suit's own finger plates hardly reach the first joint of a rig's long fingers, and come to points. `SUIT_FINGERS = True` puts them back on the first two joints.
- All the arm's skin is drawn dark, as leather, in a depth band just behind the plates, so it shows only in gaps, and on the palm.
- The game's depth is reversed, and `swings.html` and `spells.html` have regular depth, so a viewer can't show a band that's the wrong way round. **Judge gauntlets in the game.** Load `?auto&timer`, then `(await import('/tools/gear/game_sheet.js')).suitSheet('knight')` writes the sheets to `tools/build/shots/`.

To add a suit: its file and its gauntlets' segments in `SUITS` at the top of `gauntlets.py`, and its values in `COOL`, `GAIN`, `METAL` and `RELIEF`. Then `python tools/gear/gauntlets.py` and `python tools/gear/check.py`. `?gauntlet=<suit>` on `swings.html` and `spells.html` previews one.

Known limits: a socketed gem only shows on the icon, not on the 3D sword. The two-handers' handles were drawn out ×1.30 to ×1.43
so both fists fit. The sabre is single-edged, but its swings alternate edges as the other swords' do. Nothing is carried in the off
hand. There's no punch: with empty hands, a click tells you to open the pack.

### The forest, the hill and the hours of the day

The town stands in a clearing in a forest of pines, about 16,000 of them out to 1 km, with six big oaks inside the clearing. `src/core/forest.js` says where each pine stands, the same on every thread, so what's drawn is what you walk into. `src/gfx/pines.js` draws one tree in three meshes: full boughs under about 84 m, big cards to 232 m, three crossed paintings past that. Only the two nearer rings throw shadows. Paint the bough and the far tree with `python tools/village/build_pines.py`, which needs nothing but numpy and Pillow.

The land now goes on for 600 m either way (`LAND_EDGE`), and the hill to the west, at (-512, 166) and 146 m up, has two roads from the town, in `ROADS` in `src/core/terrain.js`. Both have a signpost where they leave the town, and a cairn with a fire on it where they end.

- **The Long Road** leaves by the hunter's house: 1,080 m, winding, never over about 9 degrees. On a shield it holds a walking pace or a little better, and you have to bring the speed yourself.
- **The Fall** leaves by the weaver's, with a rag on its post: 525 m, nearly straight, each pitch steeper than the last, up to about 28 degrees, about 19 m/s on a shield at the fastest. A short rise stands at the foot of each pitch. The shield clings on over these rather than leaving the ground, so use Space to hop.

The roads have a 2 m grid of their own in the terrain mesh (`patch` in `buildTerrain`, `src/sim/job.worker.js`), and `farMap`, a coarse map of all the land, gives them and the forest floor their colour past the fine map of the village. Grass blades still stop at 128 m from the middle of the map. Nothing that hunts you goes past `NAV_EDGE`, 250 m out.

Measured on the one machine in the table below, at 1024x768: the forest adds about 3 ms of GPU time a frame in the town and 7 ms among the trees. It has not been measured at a higher resolution or on a phone.

A day is 24 minutes (`src/gfx/daylight.js`: an hour is `SECONDS_PER_HOUR`, the colours are the keys at the top). It starts at 15:00, runs only while the world does, and is kept in a save. The sun gets as far as 6 degrees above the horizon and no lower, so shadows stay within the maps; between sun and moon, the light swaps while there's none of it to see. The sky is painted again every 10 s of play (30 s on a phone). The clock in the corner is `src/clock.js`. In the console: `bm.setTime(21)`.

### What has and hasn't been tested

The owner's first session on a phone found the frame rate too low, which led to the phone tier below. **That rework hasn't
been run on a phone yet.** Everything measured here was on one machine: desktop Chrome on Windows, an AMD RDNA 4 GPU, 16 logical
cores. Whether it holds 60 fps on a given phone is unproven until someone reads the Frame rate readout on one.

| Measured there | Result |
| --- | --- |
| GPU time per frame in a fight, Ultra tier | About 3.2 ms at 1280x720, 5 ms at 2560x1440, 8.3 ms at 3840x2160 |
| Six full fights by a scripted player that dodges on the blade flash and waits for the red X | 5 wins, 1 loss, 68 to 109 s each. It has perfect aim and steady reactions, so expect a person to find it harder |
| After a win | Slow motion on the killing blow, the win message, crabs stand down, restart works |
| Static host with no special headers | One reload, then shared memory and threads |
| Message-passing fallback (`?nosab=1`) | Runs, without the planner |
| Touch controls | Synthetic touch events through the real handlers at phone size, including three thumbs at once. No real finger or screen |
| The opening on a phone | An emulated Pixel 7 in headless Chromium, through the real touch handlers: skipped to the name, answered it, and walked out of the cave by thumb to the walk down. The thumbs are put away only while the story holds you still (`storyHolds` in `src/core/opening.js`); before that fix they stayed hidden for the walk out too, and a phone could never leave the cave. No real phone |
| Quality steps | Each one, called by hand during a fight, with no GPU errors. The phone governor has been seen choosing them under real load, on a software GPU |
| Phone tier against the build before it, same scenes at a Pixel 7's screen size | About 3.5x less GPU time on this desktop GPU (1.47 to about 0.4 ms). About 4 to 5.5x less on SwiftShader, a software GPU (3750 to 665 ms in the village, 2880 to 700 ms in a fight with crabs and blood). Neither is a phone: the ratio is the point, not the times, and neither charges for what a phone's tiled GPU pays most for (extra passes, reloading a target), so it says nothing certain about the gain there |
| Bot fights at phone settings since the rework | 12 full fights: 7 wins, 5 losses (the bot won 5 of 6 at PC settings, but these are too few fights to read much into). Cuts, bleeding, win, restart and the touch test all pass, with no GPU errors. One other run, on a slightly earlier version of this work, had its page crash partway and left no crash report. It hasn't happened again, including with the same script, and its cause is unknown |
| Phone governor | `node tools/test_governor.mjs` against simulated phones; and for real on SwiftShader through `tools/phone_bench.mjs real`, where it dropped multisampling under the title, started at the lowest step, and stopped frames queueing up: 6 fps steady, with the simulation holding its 90 Hz, where the old build stalled for seconds |

**Not run by anyone:** a tablet, an integrated GPU, Safari, Firefox. **Never heard:** the audio, as far as anyone has reported.

To check it yourself:

1. Play for ten minutes with the sound on. Does the fight feel fair, and does anything sound wrong?
2. Watch the knights' feet while they circle you, and the fine scratches beside a fresh cut as the knight moves. Only stills
   have been reviewed, so foot sliding and shimmer haven't been judged.
3. On a phone: `python tools/serve.py 8443 --lan --cert cert.pem --key key.pem`. WebGPU needs HTTPS, so use a certificate your
   phone trusts, such as one from mkcert. Turn on Frame rate readout in Settings, then see whether it holds 60 fps for ten
   minutes, and try the thumbs.
4. On a laptop with integrated graphics, press F3 and watch whether the scale and effects step down sensibly.
5. Turn the difficulty if it needs it, with the numbers above.

### How it runs

- **WebGPU only, no engine.** A frame is compute (dual-quaternion skinning, grass, particles), then shadows, a forward HDR
  pass with 4x MSAA, AO and sun shafts at half resolution, full-resolution particles, bloom and a composite. The whole village
  is one vertex buffer and one draw call against a texture array.
- **Threads.** The game asks first, then uses all but one logical core on PC and caps itself on phones. The simulation runs on
  its own thread at 120 Hz (90 on phones) and publishes snapshots through shared memory, so the render thread never waits on
  it. The pool decodes textures and builds the land at load, then spends a few milliseconds of every 40 playing out the duel,
  and those rollouts weight the knight's tactics (on a phone only two threads, 2 ms of every 80, since heat is what limits it).
  Browsers have no real permission prompt for threads, so that question is the game's own. Without cross-origin isolation it
  falls back to messages between threads.
- **GPU.** It takes the high-performance adapter with all of its limits, and picks a tier from what it finds. Resolution then
  follows GPU timings to hold the display's refresh rate, and effects drop out if 60 fps is out of reach. The render loop never
  queues more than a couple of frames ahead of the GPU, since those would only be input lag. Chrome on Windows currently ignores
  the high-performance hint and says so in the console.
- **Phones** (also the Low setting on a PC). A set number of pixels whatever the screen (about 0.75 million, which the browser
  stretches for nothing), a leaner build of every shader (`if (LEAN)`), and few passes, since a tiled GPU pays for each one: no
  second colour target, particles in the world's own pass, no AO or sun shafts, and the blood map and far shadows drawn only
  when needed. Bodies off screen aren't skinned, and shadows and distant bodies use a coarse mesh. `src/gfx/governor.js` holds
  60 fps by how often frames come round and how long the GPU takes over one, which any browser can tell it. The GPU is timed
  under the title, before anyone's looking, so the first fight starts at a resolution it can hold. A strong phone climbs to as
  much as 1.7 million pixels; a slow one drops multisampling, then grass and bloom, to as few as 0.23 million, which is the
  one step that gives up a good deal of the look: the field goes to a flat lawn.
- **Far bodies** (PCs). Past the distance where a 4.5 cm cell is under a pixel, a body is drawn with a welded mesh of
  a fifth of the triangles, and the far shadow cascade always uses it. Past 40 m a body's pose is made at most 65 times a
  second, past 90 m 33 (phones too), and it holds its pose between. Swords, shields, doors and stalls are left out of the view and
  of any shadow cascade they can't reach. See "Far bodies" in `docs/RENDERING.md`.
- **Edges and contact** (PCs). A leaf's or a needle's cut-out takes a share of each pixel's samples, so foliage is
  smoothed like any other edge. The ground is dark under whoever stands on it where the sun gives no shadow, and the
  grass bends for the five bodies nearest you. See "The look" in `docs/RENDERING.md`.
- **Plates stay plates.** Each armour segment is bound to one joint, or to one constant mix of two joints across its whole
  surface, and blended as dual quaternions, so it moves rigidly. Shells that span a joint are cut along their weights. Only
  fingers and cloth keep soft weights. Because plates are rigid, the blade tests against a bind-space BVH of each plate, and
  wounds are evaluated in bind space, so they ride the plate exactly.

### Files

| Path | What |
| --- | --- |
| `assets/armor/` | Both knights on the UAL master skeleton with all 85 clips, for any other use |
| `assets/game/` | What the game loads: the knights without clips, the 54 clips it uses as a small binary, items, village, textures, audio |
| `assets/game/knights/` | The town knights, one per armour suit, rigged from their own skin weights |
| `tools/armor/rig_armor.py` | Rigs a segmented Tripo armour on the master skeleton: `python tools/armor/rig_armor.py velscour|silver|knight|t_purple|t_white|t_silver|t_pale SOURCE MASTER OUT_FULL OUT_GAME`. The first two are mapped by hand, the rest from their weights |
| `tools/armor/pack_clips.py` | Packs the clips the game uses: `python tools/armor/pack_clips.py MASTER assets/game "F:/!    BM V2/! LISANDRA/LISANDRA - PRETTY.glb"` adds Lisandra's |
| `tools/armor/lisandra_clips.py` | Which of Lisandra's clips the knights use, and which part of each |
| `tools/armor/retarget_mixamo.py` | Retargets a Mixamo-rigged clip onto the master skeleton, joint by joint, with root travel taken out for the game to carry |
| `tools/armor/measure_blows.py` | Measures where in each attack clip the blow falls, which sets the knight's hit windows |
| `tools/armor/fit_shield.py` | Moves a kite shield's handle to where a knight's fist is |
| `tools/village/build_textures.py` | Turns the paintings into colour and detail arrays, reading timber, plaster, glass and mortar from the paint |
| `tools/village/build_village.py` | Builds the village in Blender, including the colliders and lights in `village.json` |
| `tools/village/build_pines.py` | Paints the pines' bough and far tree, and adds them to the texture manifest |
| `tools/review.js`, `tools/sheet.py` | Stage scenes and screenshots, and run a scripted fight, for reviews |
| `tools/test_governor.mjs` | The phone governor against simulated phones |
| `tools/phone_bench.mjs` | The game at a phone's screen size on a software GPU: frame costs, and the governor under real load |
| `src/sim/` | The simulation thread: knights, AI, crabs, player, collisions |
| `src/gfx/` | The renderer and its shaders |
| `src/title.js`, `src/title.css`, `assets/title/` | The title screen, the menus and settings |
| `src/saves.js` | What a save holds, part by part, and where saves are kept |
| `src/sim/skills.js`, `src/sim/treespells.js`, `src/items/skillbook.js`, `src/ui/skilltree.js` | The six skill trees: their rules, the spells they added, what you've learned, and their screen in the spellbook |
| `tools/skills/`, `docs/SKILLS.md` | The trees as a sheet, every spell cast and measured without a page, and how the design was reviewed |
| `src/sim/playerbody.js`, `src/core/third.js`, `src/ui/view.js` | The third-person view: your body's poses, where the camera stands, and the switch |
| `tools/player/` | Makes the player's body from the owner's FBX (`build.mjs`), and shows it (`view.html`) |
| `src/items/`, `src/ui/inventory.js` | Item rolls and gems, the pack, what's lying on the ground, and the pack's screen |
| `assets/game/items/`, `art/swords/` | The swords, their icons and `swords.json`, and the sheets they came from |
| `tools/swords/` | Separates the sheets into swords (in Blender), and renders their icons |
| `tools/items/check.mjs` | Tests the item rules and rarity odds |
| `tools/gear/` | Tears the suits into pieces and renders their icons (in Blender), and fits gauntlets over the first-person arms |
| `assets/fp/gauntlets_*.glb` | A suit's gauntlets and upper arms, fitted to every first-person rig |

## First-person arms with a sword and shield

`assets/fp/arms_1h.glb` (2.8 MB) is one self-contained model: bare arms on their own skeleton, Bellmourn's Arming Sword in
the right fist and its Iron-Bound Roundshield on the left, and the one-handed moves as nineteen clips, cut as first-person Skyrim plays them.

To watch the first-person arms, run `swings-player.bat`. That opens `swings.html` on
`http://localhost:8401/swings.html`, which is Bellmourn's move-picker scene: the training dummy, the X in the middle of
the screen, and a spark where a blow lands. The view shows the path of the blade's tip. Pick the model under **Hands**.

| Clip | What it is | Tip through the X at |
| --- | --- | --- |
| `blade_sky1` | Across from the right | 0.333 s of 0.87 s |
| `blade_sky2` | Back across from the left | 0.333 s of 0.87 s |
| `blade_sky3` | Rising, from the lower right | 0.333 s of 0.87 s |
| `blade_sky4` | Down from the upper left | 0.333 s of 0.87 s |
| `blade_sky5` | The overhead finisher, with the longest draw | 0.483 s of 1.15 s |
| `blade_d1`, `blade_d2` | Slashes from the upper right and upper left | 0.400 s of 1.00 s |
| `blade_over` | Overhead cut, straight down | 0.400 s of 1.00 s |
| `blade_rise1`, `blade_rise2` | Rising cuts from the lower right and lower left | 0.400 s of 1.00 s |
| `blade_flat1`, `blade_flat2` | Flat cuts, right to left and left to right | 0.400 s of 1.00 s |
| `blade_stab` | Thrust from the low right | 0.317 s of 0.72 s |
| `blade_stab_block` | Thrust past the rim, the raised shield swinging aside for it | 0.317 s of 0.75 s |
| `shield_up`, `shield_hold`, `shield_bash`, `shield_down` | Raising the shield, holding it (a loop), a bash from the block and back, lowering it. Cut from first-person Skyrim (YouTube `_ZMx-ejIIBc`, 1.9-2.8 s and 7.4-8.5 s). The wrist is locked straight: the fist is on the grip, the board rests on the top of the hand and along the forearm (`shield` in `rig.py`), and the shield is aimed only by the elbow and the forearm's roll, about 100 degrees in the block (`straight_arm`, `shield_roll`, `ELBOW_UP`). The game doesn't play these yet: the player has no block control, so they only show in the viewer. | |
| `guard_walk` | The carry on the move, sword and shield swaying in step (a 0.92 s loop) | |
| `guard_idle` | The carry standing still: the same loop, 40% as big | |

In the game, left click runs the five `sky` swings in turn. In the air it's `blade_sky5`, stepping back `blade_rise1`, sprinting `blade_stab`, and
right click alternates the flat cuts. `blade_d1`, `blade_d2`, `blade_over` and `blade_rise2` are in the file but the game doesn't use them.

The shield steps aside inside each blow, out and down with its face turned out, and comes back in the recovery, so
those clips drive both arms. In the viewer, left click cycles the combo (1 is the Skyrim five, 2 to 7 the game's old six), holding the
right button raises the shield, clicking with it up thrusts past the rim, and the **Walking** box plays the carry at walking
speed. The clip times, combos and field of view are in `gltf.scene.userData`, and blows that start from the guard also end
on it, so they chain with no join. Play the carries and `shield_hold` at `0.25 + min(1.3, speed / 6.2)` for a ground speed in
m/s, as the two-hander's.

The skeleton is 54 joints, as the two-hander's below, but `weapon` hangs from `hand_R`, so the sword can't drift in the
fist, and there's a `shield` joint on `hand_L`, with its origin on the grip, +y along it and -z toward the enemy.

### Where the motion comes from

The basis is first-person Skyrim, stepped through frame by frame with no sound: `_ZMx-ejIIBc` and `nr62-GnrrOs` for the vanilla game, `9QnSXSsUlY4`
and `jVG7n8yCInI` for first-person animation mods. The mods were used because vanilla footage of a clean sword swing is scarce, so not all of it is vanilla.
The lines through the crosshair are still Bellmourn's (`tools/templates/mocap1h.py`), and the rules are the two-hander's: the tip goes through the X on a frame,
along its line, the edge leads, every blow starts and ends on one guard. The owner's video of the swings is the check on the elbow.

- **The carry.** The hand's off the bottom of the screen and the top half of the blade stands up at the right. The shield sits low in the lower left corner, its point down.
- **The draw-back.** The fist comes back by the shoulder, 0.04 to 0.18 m ahead of the eye, the elbow folds to 53 to 75 degrees and the sword leaves the screen.
  The old build kept the fist 0.46 to 0.56 m out, so its elbow opened on the wind-up and closed into the hit, which is backwards.
- **The elbow swings it.** It opens through the strike and goes on opening past the hit, to 101 to 165 degrees, till shoulder, arm and blade are one line.
  Skyrim shows the blade for only about a fifth to a third of a second, and these show it about as long: the sword's off the screen for most of a blow.
- **Blade across the view.** A metre of blade with its tip on the X sits asin(`a`) off the view ray, for a fist `a` metres off that ray. So the fist is well out to the side at the hit,
  which puts it off the screen. `blade_d1`'s is 0.80 out, about 53 degrees. Fully square to the crosshair can't be reached by an arm this long.
- **Longer, broader blades.** `tools/swords/lengthen.py` draws the eight one-handers' blades out to 1.00 m from the fist and 1.3 times wider
  toward the point, leaving the guards, grips and pommels alone. It's safe to run again. A one-hander's tip now sits as far from the fist as a greatsword's.
- **Weight at the hit, in the game** (`src/sim/player.js`): hit-stop of 0.07 s (0.10 on a heavy), time at 0.08, then 0.07 s of drag at 0.65 speed. The
  view kicks along the cut as it lands, there at once and gone in 0.26 s (`KICK`), on top of the body's lean through the blow. The drag applies to the two-hander too.
- **Drawn at full size.** The game shrinks its one-handers toward the bottom of the screen. These use the two-hander's view,
  so the X is simply straight ahead.
- **A longer sword arm.** The source's right forearm is much shorter than its left (0.21 m to 0.28 m), so it's drawn out 25%, and its upper arm 60% (0.19 m to 0.30 m).
  Without that the arm can't reach through its cuts.

To adjust the feel, change the tables at the top of `tools/fp_arms/swings1h.py`: `DRAW` (the fist and blade drawn back, the fist at the hit, the tip's run), `TIMES`,
`LEAD_HIT` and `LEAD_END` (how far the forearm follows the hand), `ARM_OUT`, `COCK` (how far the wrist may cock), `FLAT` and `FLAT_PAST` (how far the flat turns to the eye), `FINISH`, `OVERLAP`,
`SHOULDER_ROOM` (how far the torso carries the shoulder), `STAB`, `GUARD`, `BACK`, `WALK` and `SHIELD`. `tools/fp_arms/check.py 1h` holds the rules; every limit is at the top of it.

### The hand repair

As below, but this model's sword was fused only into the right fist. The left hand is a closed empty fist, whose grey,
creased palm was also repainted and smoothed, since it faces you when the shield is up.

### Known limits

- `tools/fp_arms/check.py 1h` exits non-zero. The owner approved these blows by eye on 2026-11-04 with these failures standing: wrists bent back past the 20-degree limit (up to 40 on the `sky` blows, 48 on `blade_flat2`), a forearm and handle up to 45 degrees apart (limit 30), the tip up to 0.06 off its line away from the hit (limit 0.01), and several blows' elbows opening under 50 degrees.
- `blade_sky3`'s forearm and upper arm jump 41 and 32 degrees in a frame at 0.23 s (limit 25), and `blade_flat1`'s 31 and 27 at 0.28 s. The sword's off the screen then.
- With a hand off the screen, `check.py`'s on-screen blade length often has only the hit's frame to measure, so it says little about these blows. Many of its on-screen rules (hand height, fold, steel and forearm showing) no longer apply to a one-hander, since Skyrim's hands leave the screen.
- The shield was only moved to where Skyrim holds it. Nobody has judged the raise and the bash against the footage. Blocking was checked in the sim, not with a real mouse.
- The fingers are fused here too, so the finger bones can tighten or loosen a grip, not open the hand.
- The shield is the game's low-poly model, as is the sword, so they differ in style from the detailed arms up close.
- The sculpt's forearm runs almost along the handle, and the pommel sits just past the wrist, so it's close all the time.
  `blender_check.py` tests every second frame of the skinned mesh and lists any where it shows through.
- The sculpt holds its fist a little off the forearm's axis, and its hand is painted dark, so at some angles the fist reads
  nearly black against the forearm.
- A blow chained straight from the last one blends in over 0.1 s, so the blade's length can change faster across that seam than the clip's own numbers show.

## First-person arms with a two-handed sword

`assets/fp/arms_2h.glb` (2.8 MB) is one self-contained model: muscular bare arms on their own skeleton, Bellmourn's
Greatsword in both fists, and the two-handed swings as twelve clips, cut as first-person Skyrim plays them.

| Clip | What it is | Tip through the X at |
| --- | --- | --- |
| `great_sky1` | Left click, first: across from the right | 0.467 s of 1.07 s |
| `great_sky2` | Left click, second: back across from the left | 0.483 s of 1.08 s |
| `great_sky3` | Left click, third: down from the upper right | 0.467 s of 1.07 s |
| `great_sky4` | Left click, fourth: down from the upper left | 0.483 s of 1.08 s |
| `great_sky5` | Left click, fifth: overhead, straight down the middle | 0.617 s of 1.30 s |
| `great_slam` | In the air: the same blow as `great_sky5` | 0.617 s of 1.30 s |
| `great_chop` | Sprinting: overhead chop | 0.567 s of 1.23 s |
| `great_rise` | Stepping back: rising, from the lower right | 0.467 s of 1.07 s |
| `great_wide_r` | Right click: wide, right to left | 0.483 s of 1.10 s |
| `great_wide_l` | Right click: wide, left to right | 0.483 s of 1.10 s |
| `great_walk` | The carry on the move, a smooth figure of eight (a 0.92 s loop) | |
| `great_idle` | The carry standing still: the same loop, 40% as big | |

These timings are in the model too, in `gltf.scene.userData` (`clips[name]`: `hit`, `wind`, `through`, `duration`),
along with `combo`, the cut lines, and `view` (the view model's field of view).

Every swing starts and ends on the same guard, so any clip can follow any other with no join. Play them at normal
speed: unlike the game's rig, these already have their final timing, so the game's `PACE` slowdown doesn't apply. Play the
two carries at `0.25 + min(1.3, speed / 6.2)` for a ground speed in m/s, as `viewmodel.js` does, which is a quarter speed
when standing and about 0.9 at a walk. Both start on the guard, and they stay in step, so one can fade to the other. Draw
the arms with their own camera over the world, as `viewmodel.js` does: origin at the eye, looking down -z, with the
field of view from `view.fov` (76 degrees vertically). That is wider than the world camera's 64 degrees, and it turns
about the middle of the screen, so the X stays where it is.

### The skeleton

53 joints, each with +y running down its bone:

- `root`
- `upperarm_R`, `forearm_R`, `forearm_twist1_R`, `forearm_twist2_R`, `hand_R`
- `thumb`, `index`, `middle`, `ring` and `pinky`, each with `_01_R`, `_02_R`, `_03_R` and `_end_R`
- the same again for `_L`
- `weapon` and `weapon_tip`: the sword hangs from `weapon`, with its origin on the right fist, +y toward the tip and z
  along the guard. Any of the game's two-handed models fits this frame, though the X rule is measured for a 1.00 m reach
  to the tip, so a sword of a different length needs that length (`TIP`) changed and a rebuild.

### What was kept from Bellmourn, and what changed

The basis is first-person Skyrim, stepped through frame by frame with no sound. It's `peh8gI19q90`, a vanilla playthrough with a two-handed axe, at about 905 to 919 s:

- **The carry.** The weapon stands nearly upright at the right of the screen, about 0.8 of the way across, its top near the top of the view and both hands off the bottom.
- **Across** (907.2 to 907.6 s). The weapon's off the screen on the draw. The hands then come in low from the lower right, in sight, with the shaft lying almost flat across the view and trailing
  out to the right. They lead it across to the lower left and it's off that corner, about 0.25 s on the screen in all. In `great_sky1` the tip's on the X with the fists to the left of it.
- **Overhead** (914.6 to 914.9 s). The hands come over from above, with the forearms in a V, and the weapon drops straight down the middle and off the bottom, about 0.3 s on the screen.
- **Home.** It's off the screen for a long while, then rises from the lower right with its top leaning in.

The footage shows only right-to-left and overhead swings. `great_sky2`, `great_sky4` and `great_wide_l` are those mirrored, and `great_rise` is the same method: Skyrim didn't show them.
`great_sky3` follows a diagonal at 918.0 to 918.5 s, with the forearm large in the view.

Kept from Bellmourn's rules: the tip goes through the X on a frame, every blow starts and ends on one guard, the edge leads, the sword doesn't turn in the right fist, and the fist's speed is one hump, baked at 60 Hz.
The drawn line itself is looser than it was, see the known limits below. The elbow no longer has a fixed way to hang: it carries on from the last frame (`Arm.steady_pole`), since an arm pointing along that way would snap round.

To adjust the feel, change the tables at the top of `tools/fp_arms/swings2h.py`: `DRAW` (the fist's way, the blade drawn back, the tip's run), `LINES`, `TIMES`, and `CARRY` (the guard), `WALK` (the sway), `SHO` and `ZOOM`
in `swings.py`. Then rebuild. In the viewer, the **Walking** box plays the carry at walking speed. The model's near plane is 5 cm, the game's for the arms (`src/gfx/renderer.js`).

### The hand repair

The source model's sword was fused to both fists, and the arms were joined only through it and where one hand touched
the other. `tools/fp_arms/repair.py` takes the sword off, parts the arms, and closes every hole left behind with a
smooth patch. Steel colour left on the skin is painted out, the patches get skin blended from their edges in space the
sword left free in the atlas, and normals are rebuilt across the whole surface.

### Known limits

- `tools/fp_arms/check.py 2h` exits non-zero. Away from the hit the tip comes in onto its line, up to 0.72 off it (limit 0.01); it's on the X on the hit's frame in every blow. Some joints jump past 25 degrees in a frame, up to 76 on the draw of `great_sky4` and about 50 on `great_sky2` and `great_wide_l`, behind the eye where they're never seen. `forearm_L` jumps 42 to 46 degrees at about 0.42 s on `great_sky2` and `great_wide_l`, with the fists at the bottom edge of the view. The fist peaks at up to 9.3 m/s (limit 8), and most blows have two or three peaks of blade speed. The near plane still cuts an arm on 3 frames of `great_sky5`, `great_slam` and `great_chop`, a few pixels at the bottom edge at about 0.33 to 0.36 s.
- The sculpted fingers are fused side by side. The finger bones can tighten or loosen a grip, but a fully open hand comes
  out as a webbed mitten. Open hands would need the fingers separated first.
- Each upper arm is cut off flat at its base, with a dark underside. That comes from the source model. `check.py` fails if
  the middle of that end reaches the screen.
- The wrist is sculpted a fixed distance from the handle, and at the carry it sits just under the frame. So you see the
  fist and the heel of the hand, but not the forearm running to the corner as in Bellmourn.
- The arms are detailed PBR and the Greatsword is the game's low-poly retro model, so they differ in style up close.

## First-person arm with a staff

Four staffs (Greenwood Staff, Crystal Staff, Skullhorn Staff, Gnarled Crook) can be equipped, dropped and picked up. Each fires a spell's bolt from its head on a left click, and it costs that spell's mana: Greenwood fires plague, Crystal frost, Skullhorn firebolt, the Crook lightning.

The arm is right-handed only, cut from the Tripo arms holding a wooden stick, with the stick removed and 28 bones added (`assets/fp/arms_staff.glb`, `hands: 3` in `WEAPONS`). The pack's staff hangs on its `weapon` bone, and `weapon_tip` is the muzzle. The cast follows Bellmourn's `R1S_CAST`: dips, lifts straight up and inward, tips forward 18 degrees as it fires at 0.40 s, and settles by 1.00 s. The hand is off the bottom of the screen at the carry and comes into view on the lift.

To adjust the feel, change `CARRY_FIST`, `CARRY_AXIS`, `GRIP` (how far down the shaft the fist holds), `TIP` and the `CAST` table at the top of `tools/fp_staff/build.py`. To rebuild, run these inside Blender, each with `exec(open(path).read(), dict(__file__=path, __name__="__main__"))`: `tools/staffs/separate.py` (splits `art/staffs/staffs_3_common.glb`), `tools/staffs/atlas.py`, `tools/staffs/render_icons.py`, and `tools/fp_staff/build.py`. The viewer shows it at `swings.html?model=staff`.

Known limits:

- A bolt's damage is its spell's. The damage rolled on a staff doesn't change it yet.
- The hole the stick left in the palm is still there. It faces away from the eye, so the player can't see it.
- The Crook's lightning is very bright close to the eye as it leaves.

## Rebuilding the first-person arms

Needs Python with numpy, scipy and Pillow. Run these from the top of the repo, for the sword and shield:

```bash
python tools/fp_arms/repair.py 1h
```

```bash
python tools/fp_arms/build1h.py
```

For the two-hander:

```bash
python tools/fp_arms/repair.py 2h
```

```bash
python tools/fp_arms/build.py
```

Then check both:

```bash
python tools/fp_arms/check.py
```

`repair.py` is only needed once, or when the repair itself changes. `check.py` reads the finished GLBs, using none of the
solver, and fails if a rule is broken, including a fist over 8 m/s, an arm's cut end on screen, a joint jumping in a frame, the
sculpt's unpainted back filling the view, or on the sword and shield a wrist doing the arm's work.
For a second opinion from Blender's own importer, which on the sword and shield also tests the skinned mesh for the pommel
showing through, with `1h` or `2h` as the last word:

```bash
blender -b --factory-startup --python tools/fp_arms/blender_check.py -- 1h
```

Source art is in `art/fp_arms/`: the Tripo models as delivered, the Greatsword, Arming Sword and Iron-Bound Roundshield
from Bellmourn2, and the two-hander's original swing keys from Bellmourn (kept for reference: the build no longer reads them).

## Spells

Sixty spells in six schools, on hands of their own. **F** or the **middle mouse button** casts; hold it to gather a Firebolt or keep up a held spell. The **number keys** or the **wheel** pick from the bar, **B** opens the spellbook. With a one-handed sword the free hand casts and the sword stays up, otherwise whatever's held goes down for the cast. Spells that want two hands always take both.

The bar has six numbered slots. The spellbook (**B**) is where you learn spells and put them on the bar. With a shield up your right hand does the casting: the sword goes away, the hand comes out and casts, and the sword comes back.

### The six schools

You start with the first spell of each school, on the bar. Bellmourn's twenty are sorted into the schools; the forty in *italics* are new.

| School | From the start | Level 2 | Level 6 | Level 11 | Level 17 |
| --- | --- | --- | --- | --- | --- |
| **Fire** | Firebolt | Fire Beam, *Cinderburst* | Wall of Fire, *Ring of Fire*, *Flame Wyrm* | *Phoenix*, *Cinder Brand* | *Inferno*, Meteor |
| **Ice** | Frost Shards | *Cone of Cold*, *Rime Lance* | Frost Nova, *Ray of Frost*, *Prismatic Shard* | Blizzard, *Shatter*, *Frozen Orb* | *Deadwinter* |
| **Earth** | *Stone Shard* | Bone Lance, *Thorn Volley* | Earthsplitter, *Rolling Boulder*, Plague Flask | *Stoneskin*, *Grasping Vines* | *Earthquake*, *Monolith* |
| **Arcane** | Magic Missiles | Arcane Blast, Blink | Spirit Blades, *Rune of Force*, *Moonblade* | Gravity Well, *Stasis* | *Disintegrate*, *Starfall* |
| **Lightning** | *Spark* | Chain Lightning, *Forked Lightning*, *Storm Seed* | Ball Lightning, *Thunderclap*, *Stormstep* | *Thunderbolt*, *Static Field* | *Thunderstorm* |
| **Utility** | Wisp Light | Mend, *Fleetfoot*, *Turn the Dead* | *Renew*, Life Drain, *Aegis* | *Sanctuary*, *Empower* | *Stillness* |

What each school is for:

- **Fire:** burst and burning. It hits hardest in the moment and leaves the ground and the foe alight.
- **Ice:** control. It slows and freezes, and what's frozen takes half again from every blow; Shatter breaks what's frozen.
- **Earth:** stone, bone, root and rot. It knocks things down, runs them through and holds them, and Stoneskin makes you hard to kill.
- **Arcane:** force, space and time. Missiles that find their own targets, a Blink, a rune that waits, a sphere where time stops.
- **Lightning:** speed and spread. It lands the instant it's cast, leaps from one to the next, and stuns.
- **Utility:** light, mending and the edge. Little of it kills anything; it keeps you standing, moving and stronger.

### Points, ranks and branches

- **Points.** One for every level past the first, and one more at every fifth level: 11 by level 10, 23 by level 20, 59 at the cap of 50. A whole school costs about 60, so nobody takes everything.
- **A spell has five ranks.** The first learns it. Each rank past it is 15% more of what the spell does, plus what's its own: Magic Missiles gathers one more missile and gathers them faster with every rank, and looses two at a time from rank 3 and three from rank 5; Frost Shards throws a fourth and a fifth shard; Chain Lightning leaps further.
- **Every spell has two branches, and you take one or the other.** A branch changes how the spell works or looks: Fire Beam either whitens and climbs on one foe or opens into a fan; Meteor either brings smaller stones down beside it or leaves a molten crater; Magic Missiles either arc on to a second foe or wait in the air and fly all at once. A branch's rank can be no more than its spell's rank less one, so a spell is raised before it's shaped.
- **Each school has a mastery:** five ranks, each 4% more from that school's spells and 3% less mana, once 8 points are in the school.
- **What a spell needs before it can be learned:** your level (the columns above), a spell it grows from (the lines in the book), and points already spent in its school: 3 for the third tier, 6 for the fourth, 10 for the fifth.
- **Scrolls** teach a second or third tier spell's first rank for no point, at the tier's level. That rank doesn't count as a point spent.
- **Unlearning** gives every point back for gold (20 and 12 a level). What a scroll taught stays known.
- **Cooldowns.** Most spells are limited only by mana. The spells that stay on you (Stoneskin, Aegis, Fleetfoot and the rest), the great ones and a few others can't be cast again for some seconds; a spell that lasts counts from when it ends. The slot shows the seconds, and what's on you shows over the bar.

In the book, a tab is a school. Its spells stand left to right by tier with their branches under them. A gold edge marks what a point can go into now. Click a node to read it, with its numbers now and at the next rank; the button, or a double click, spends the point. A spell you know goes on the bar by clicking a slot, dragging it there, or pressing 1 to 6 over it.

### How spells meet each other

- **One rule for every freeze and stun** (`holdFor` in `src/sim/casting.js`), so a fight can be slowed and not held still. A passing stop (a shard, a hailstone, most stuns) doesn't land on something already held for longer, and within three seconds of the last one only what it has over that one's length lands. A real hold (Frost Nova, Deadwinter, a Ray of Frost held on, Grasping Vines, Thunderclap, Stasis, a Binding Rune) is 35% as long within six seconds of the last hold's end. Either is 40% as long on anything with 400 life or more.
- **Between schools:** what's frozen takes half again from everything; what's rotting burns twice as fast; what a Spark has left charged takes a tenth more from every spell; lightning that strikes the bearer of a Storm Seed leaps on to everyone near it.
- **What turns harm from you** (Stoneskin, Rime Guard, a Sanctuary's Refuge) multiplies together and never turns more than three quarters; an Aegis then takes what's left until it breaks.
- **Empower** strengthens your next three spells, not everything for a time, and a held spell spends one of them every second and a half.
- **A staff's own shot** is still the left click. Several new spells are grander kin of a staff's shot (Phoenix, Flame Wyrm, Cinderburst, Rime Lance, Prismatic Shard, Stasis, Starfall, Moonblade, Thorn Volley, Rolling Boulder); a staff's is worth about half as much, and never gains ranks or branches. Grasping Vines and Storm Seed work differently from the staffs' (the spell's vines hold, the staff's drag; the spell's seed conducts, the staff's lashes).

### Files and checks

`src/sim/spells.js` is the table of spells and `src/sim/skills.js` the trees, their rules and what each rank and branch changes (`effective()` makes a spell's numbers from both, for the sim and the book alike). `src/sim/casting.js` runs the spells on the sim thread and drives the hands; `src/sim/treespells.js` holds the forty new ones and the spells that stay on you. `src/gfx/spellfx.js` draws them: the new spells are made of the shapes it already drew, with no new models or shaders. `src/items/skillbook.js` is what you've learned, kept in the save; `src/ui/skilltree.js` draws the trees in the book; `src/spellsound.js`, `src/ui/spellbar.js` and `src/ui/spellglyphs.js` are the sounds, the bar and the pictures.

- `node tools/skills/bench.mjs --check` casts every spell at every rank, and every branch at its full rank, through the sim's own `Casting` with no page and no GPU: 600 casts, at packs that stand and packs that die. It fails on an error, a shape with a bad number in it, or a spell that does nothing.
- `node tools/skills/bench.mjs` prints what each spell takes off one foe and off a pack of eight, its mana and its time, at ranks 1 and 5. `--spell meteor meteor=5 meteor:crater=1` measures one spell with the ranks and branches named.
- `node tools/skills/sheet.mjs` prints the six trees as a sheet to read.
- `node --test tests/skills.test.mjs` checks the rules: points, tiers, either/or, scrolls, unlearning, the save.
- `bm.skills()` in the console is what's learned; `bm.skills('spend', id)`, `('give', n)`, `('all')`, `('unlearn')` and `('level', n)` are for tests.

`docs/SKILLS.md` has how the design was reviewed and what the reviewers want watched.

### The hands

`assets/fp/spell_attack.glb` and `assets/fp/spell_raise.glb` are built by `tools/fp_spells/hands.py`. Attack's open hands are the owner's `art/fp_spells/attack_closer.glb`, and that mesh is not to be changed: the file in the game is its points under one scale and one rigid move, its triangles and UVs the same. All that moves it is its skeleton, shoulder, elbow, wrist and three knuckles to a finger. Seen from one eye through the game's lens, it is the owner's picture with nothing moved. In the game a finished cast stands lower than that, the tops of the hands halfway up the screen, by moving the arms back and down: that's `down` in `PLACE`. A reference picture sets a pose and nothing else: an earlier version squeezed the hands' depth to fit one, and flattened the fingers.

Every cast starts on the owner's closed fist, the empty hand of `art/fp_spells/empty_hand.glb` and its mirror. A fist's fingers are fused and can't open, so the fist and the open hand swap in one frame, under the flash at the hit. Attack hands close and go back to the fist at the end, in plain sight, with the arm already moving down.

Finger roundness, thin way over wide way, as shipped: Attack's median is 0.71, its lowest 0.40 at a thumb root. `measure` in `hands.py` prints it. Below about 0.3 a finger reads as flat.

To see them on their own, run `spells-player.bat`: Attack or Raise, one hand or both, any speed, scrubbed, or walked around with **O**.

### Rebuilding the hands

`hands.py` runs inside Blender, through Blender MCP, and its first lines say how. To change the feel, change `CLIPS` at the top of it, and `PLACE` for where the arms stand. To bring new textures in:

```bash
python tools/fp_spells/skin_tone.py
```

That recolours the textures and only the textures, to the fist's skin, so the swap doesn't show. Raise's sculpt is still repaired from its own picture, by `fingers.py`, `match.py`, `fit_fingers.py`, `arm.py` and `fix.py`, in that order.

### Known limits

- **Nobody has seen the forty new spells drawn.** The machine this was built on has no graphics card, so the game's 3D view couldn't be rendered there. What was run: every spell through the sim with no page (above), all sixty cast through the real game's sim thread in a headless browser with no error, and the spellbook's screen, which is ordinary page and was looked at. The new spells are composed from shapes the renderer already drew, but their look, their brightness and how much of a first-person view they fill haven't been judged by an eye. The first thing to do is cast each one in the Test Dungeon.
- **On a phone** the book has a layout of its own (a screen under 520 px high): the slots in one thin row, the tree and what's picked out side by side, each scrolling on its own, and the button that spends a point at the top of its panel. A double tap doesn't spend a point there, only the button. It was run in headless Chromium as a Pixel 7 and as a first iPhone SE on their sides, through the real touch handlers: the page's own way in (the hardware question, keeping the game's files, loading) to the game ready in touch mode with the six first spells on the bar; then the book opened from the bar's **B**, a school chosen, a spell learned and put in a slot, the book shut, and a slot tapped, all by taps and with no error. No real phone, and no world drawn (no GPU, as above).
- **The numbers come from dummies that stand still** and don't hit back. That measures the spells against each other and flatters anything that lies on the ground (a Meteor's crater, a Wall of Fire, Inferno, Plague Flask). No fight has been played with the trees by a person.
- **Auto-play with the trees** was run headless, as it was before them (see "Auto-play"), in three short runs: a new game to level 5, and from levels 10 and 12 set by hand. See `docs/SKILLS.md` for what it did and didn't show.
- Renew, Aegis and the other spells that stay on you are yours only: they can't be put on one of your party. Mend's Shared Light is the one that reaches them.
- Stillness slows the whole world but you and what you cast: your party slows with it.
- There are no summoned creatures and no passive skills beyond the six masteries.
- Bellmourn's twenty were checked in stepped frames against the knight, for their look, their damage and their mana, not by hand at full speed. Real touch and a real phone haven't been tried. The two hand files are 5.1 and 3.8 MB. Spells hurt the Bone Hydra's body at half, as a sword does, and can't aim at a neck to take a head off.

## Crab monster

`assets/monsters/crab_monster/crab_monster.glb` (5.3 MB) is the Tripo crab monster on its own 70-bone skeleton, with eight
clips. It faces +z, stands on y = 0 and is about 1 m wide. To watch it, run `crab-player.bat`, which opens `crab.html` on
`http://localhost:8402/crab.html`.

| Clip | What it is | Frames | Floor speed |
| --- | --- | --- | --- |
| `walk_stalk` | Slow, low prowl, one leg at a time | 64 | 0.10 m/s |
| `walk_skitter` | Fast, rippling leg wave | 20 | 0.32 m/s |
| `run_scuttle` | Low alternating sprint | 18 | 1.07 m/s |
| `run_gallop` | Bounding, with the body flexing | 16 | 1.99 m/s |
| `attack_bite` | Coil, lunge, snap, then shake | 66 | |
| `attack_claw` | Rear up, then left and right rakes | 72 | |
| `attack_slam` | Leap and belly slam | 72 | |
| `jump` | Crouch, launch, land | 58 | |

All clips run at 30 fps and stay in place: `root` never moves. Move the creature at the floor speed during the walks and
runs, or its planted feet will slide. `clips.json`, next to the model, has the same frames and speeds. The attacks and the
jump start and end on the same stance.

### The skeleton

`root`, `cog`, `body_front`, `body_rear`, four mouth lips (`mouth_top`, `mouth_bot`, `mouth_L`, `mouth_R`), and for each side
four legs (`L_leg1_1` to `L_leg4_4`, front to rear), a pincer on the front leg (`L_pincer_1` to `_3`) and a tusk (`L_fang_1`
to `_3`), plus nine belly tendril clumps (`tendril0_1` to `tendril8_2`). The model is one continuous skin once its UV-seam
duplicates are welded, so its weights diffuse across that surface and coincident vertices always match. Moving a piece of it
on its own opens cracks. Only `cog` has a translation track.

### Known limits

- The body sinks up to 57 mm through the floor for about 4 frames at the slam's impact (`attack_slam` f36-39).
- Tusks, lip, tendrils and claw tips dip up to about 39 mm below the floor for moments in other clips.
- `run_gallop`'s legs turn about 45 degrees in a single frame at f7 and f16, and a planted foot can drift up to 11 mm per frame
  at full leg stretch.
- The clips were reviewed from stills and measurements and in a browser, and haven't been tried in a game engine.

### Rebuilding

Needs Blender (on `PATH`, or in `BLENDER`), and Python to run the build. From the top of the repo:

```bash
python tools/crab_monster/build.py
```

The skeleton and weights are in `tools/crab_monster/rig.py`, and the clips, as eased keys, are in `tools/crab_monster/anim.py`.
Source art and the Blender file are in `art/crab_monster/`.

## The Gravehart

`assets/monsters/gravehart/gravehart.glb` (6.8 MB) is a Tripo model of an antlered death-beast on its own 56-bone skeleton,
with 13 clips. It faces +z, stands on y = 0 and is scaled 3x in the game. To watch it, run `gravehart-player.bat`, which opens
`gravehart.html` on `http://localhost:8402/gravehart.html`.

| Clip | What it is | Frames | Floor speed or travel, model units |
| --- | --- | --- | --- |
| `idle` | Tests the air, sniffs the ground, snaps round to listen | 180 | |
| `walk_prowl` | Belly low, each forepaw hung and placed | 72 | 0.16/s |
| `walk_roam` | Easy, swinging road gait | 40 | 0.34/s |
| `run_lope` | Three-beat canter with a rocking back | 20 | 1.17/s |
| `run_gallop` | Rotary gallop, with the spine folding and stretching | 18 | 2.11/s |
| `attack_bite` | Gathers, drives forward, snaps and wrenches | 56 | 0.2 |
| `attack_swipe` | Rears up, rakes twice, slams down | 68 | 0.06 |
| `attack_pounce` | Hip shiver, leap, pin and bite | 76 | 0.95 |
| `attack_antler_charge` | Scrapes the ground, gallops head-down, hooks | 112 | 3.03 |
| `jump` | Crouch, launch, land forefeet first | 60 | 0.55 |
| `taunt_bellow` | Antlers back, three heaving roars, a stamp | 104 | |
| `taunt_thrash` | Rips side to side, then a toss and a stare | 114 | |
| `death` | Forelegs go, topples, propped on its antlers | 62 | |

All clips run at 30 fps and stay in place. `clips.json`, next to the model, has the frames, the floor speeds, and in `root` the
frames over which each attack carries the animal forward.

### How it behaves

`src/sim/gravehart.js`. It has a territory north of the village, and feeds and wanders in it until it notices you by eye, by ear
or by scent on the wind. It warns you off first, and lets you go if you leave. If you stay it hunts: it stalks from behind and
freezes when you look round, pounces on a turned back, charges from range, and breaks off after each strike to circle. Badly
hurt, it runs for its lair and fights like a cornered thing if you follow it there.

### Known limits

- Two critics passed it in their fifth round, from stills and measurements. Nobody has judged it in playback except in short
  checks in the game.
- `run_gallop` slips up to about 8 mm per frame, and `attack_antler_charge`'s hind legs bounce a little at full fold.
- The corpse's rear hangs up to 66 mm clear of the floor at the end of `death`.
- The ears and the antler bones aren't weighted to anything that shows, so there are no ear flicks.
- The neck's texture looks streaky at the far end of a stretch (`idle` f72).

### Rebuilding

Needs Blender (on `PATH`, or in `BLENDER`), and Python to run the build. From the top of the repo:

```bash
python tools/gravehart/build.py
```

This reproduces the checked-in model and `clips.json` byte for byte. The skeleton and weights are in `tools/gravehart/rig.py`,
and the clips are in `tools/gravehart/anim.py`. Source art and the Blender file are in `art/gravehart/`.

## The Bone Hydra

`assets/monsters/bone_hydra/bone_hydra.glb` (6 MB) is a Tripo model of a bone hydra on its own 53-bone skeleton, with 18 clips.
The source had a fourth head with no neck; `tools/bone_hydra/surgery.py` takes it off and patches the shoulder where it was. It
faces +z, stands on y = 0 and is scaled 3.6x in the game. To watch it, run `bone_hydra-player.bat`, which opens `bone_hydra.html`
with a stand-in flame.

| Clip | What it is | Frames | Floor speed or travel, model units |
| --- | --- | --- | --- |
| `idle` | One head on watch, one nosing the ground, one snapping at its neighbour | 180 | |
| `walk_stalk` | Belly low, necks snaking, heads gliding level | 72 | 0.1/s |
| `walk_lumber` | The everyday heavy walk | 44 | 0.24/s |
| `run_lumber` | A heavy trot | 20 | 0.72/s |
| `run_charge` | The flat-out gallop | 15 | 1.35/s |
| `attack_bite` | Middle head coils and strikes, then wrenches | 56 | 0.16 |
| `attack_triple_bite` | Right, left, middle, walking forward through them | 84 | 0.28 |
| `attack_claw` | Rears over one shoulder and rakes, then the other side | 84 | |
| `attack_tail_sweep` | Throws its hips round and cracks the tail across its left and rear | 72 | |
| `attack_stomp` | Hauls its front end up and comes down on both forefeet | 80 | 0.16 |
| `attack_fire_cone` | Middle head breathes a long stream | 110 | |
| `attack_fire_triple` | All three heads, one after another | 122 | |
| `attack_fire_sweep` | The two outer heads rake the ground, closing in | 118 | |
| `jump` | Crouch, launch, land on the forefeet | 66 | 0.42 |
| `taunt_roar` | Warning display from all three heads | 120 | |
| `taunt_bicker` | The heads fall out with each other | 112 | |
| `hurt` | Recoil when a neck is cut | 36 | |
| `death` | The legs go, the belly hits, the necks come down one by one | 92 | |

All clips run at 30 fps and stay in place. `clips.json`, next to the model, has the frames, the floor speeds, in `root` the frames
over which an attack carries the animal forward, in `hits` which part lands when, and in `fire` which head burns when.

### How it behaves

`src/sim/hydra.js`. It lies up on the floor of the rift, the chasm under the catacombs, east of the bridge, basking and roaming. It can't climb out. If you come near it looks a long time,
roars twice, and comes for you if you stay. It's too heavy to circle, so it comes straight on: bites and claws close up, the tail
if you get behind it, and fire from 5 to 13 m. It won't follow you far off its ground, unless you're close enough to still be
cutting at it.

### Cutting it up

Each neck, the tail and the two drapes have their own hit points, and the mesh is already in pieces along the body's own segments.
Cut a neck and the head falls to the ground with whatever neck was above the cut, and the stump bleeds. A neck that has lost its
head can be cut again, lower down. Each head that goes takes that head's attacks with it. Down to its last head it runs for its
lair once, and fights harder if you follow it there. Killing the last head kills it. Restarting clears the pieces.

### Known limits

- The two critics did not pass it. Both turned down round 2, from stills and measurements. The fixes for their must-fix lists are
  in, but nobody has reviewed them. Nobody has judged it in playback except in short checks in the game.
- `attack_claw`'s planted paw slips up to 21 mm per frame as the rake pulls back, and `walk_lumber` slips about 4 mm per frame.
- The belly dips below the floor plane: 53 mm in `death` and `attack_claw`, more visibly on a slope.
- The jump's heads bottom out together with the body.
- Where a head meets its neck, the patch can show in low close-ups, and part 16's crest plate leaves a few open edges on the middle
  neck, hidden by the double-sided material.
- The tail sweep only reaches round the left and rear, so the animal first swings its hips to bring you under it.
- `bone_hydra.html` shows a stand-in flame, not the game's.

### Rebuilding

Needs Blender (on `PATH`, or in `BLENDER`), and Python to run the build. From the top of the repo:

```bash
python tools/bone_hydra/build.py
```

The cut is in `tools/bone_hydra/surgery.py`, the skeleton and weights in `tools/bone_hydra/rig.py`, and the clips in
`tools/bone_hydra/anim.py`. Source art and the Blender file are in `art/bone_hydra/`.

## Wizards and necromancers

Two wizards, a necromancer and a plague-bearer (the zombie necromancer) think for themselves: `Caster` in `src/sim/undead.js`, with what they cast in `src/sim/foespells.js`. Each scores its book against what it can see, so spells follow from the fight: how far you are, whether you're running, whether it's hurt, and who's lying about. Every spell has its own wait.

| Who | Spells | Habits |
|---|---|---|
| Wizard | Bolt, prism volley, crown of storms, falling sky, storm cage, searing ray (jump it), thunderclap, slow star, hound, ward, reveal | Blinks out of the way of what you throw, comes out behind you if you close in, cages you then drops stones in. Walks its rounds, folds its arms and works at something in its hand |
| Necromancer | Bolt, grave rite, bone cage, bone furrow, soul leech, wraiths, corpse bomb, reap | Raises those lying near as they fell, swaps places with a servant when you reach it, drains one to heal when hurt. Kneels at graves and raises a servant or two to follow it |
| Plague-bearer | Bolt, grave rite, thrown flask, blooms, locusts, rot wave (jump it), wraiths, corpse bomb, reap | As the necromancer, closer in |

Solid blows can break a working, then it's steady for a few seconds. Burns can't. A necromancer's body raises what's near it as it falls, and a wizard's goes off a moment later.

All their motion is UAL's own clips, listed in `tools/zombie/caster.py`: nothing text-prompted, nothing played sped up or backwards, and they always walk the way they face. To rebuild one: `blender -b --factory-startup --python-exit-code 1 --python tools/zombie/build_all.py -- necromancer` (or `zombie_necromancer`, `evil_wizard`). `bm.cmd(20, knight, n)` forces the nth spell in `FOE`. The knights are 32 and 33 for the necromancers, and 34 and 35 for the wizards.

## Kite shields and the shield surf

Twenty kite shields, cut from the five sheets by `tools/shields/separate.py` and `render_icons.py` (both in Blender, through Blender MCP) and `tools/shields/atlas.py`. They are `SHIELDS` in `src/items/items.js`: V and T shields are the knights' own and are never rolled.

Jump and keep Space held a moment to get on the shield (`src/sim/surf.js`). It stays under you when you let go. Space on the ground hops, Space in the air steps off. It only carries the speed you bring to it and what slopes give: W adds nothing. A wall stops it, and so does running out of speed.
