# bm

Bellmourn v2.

## Play: The Knight of Velscour

Run `play.bat`, or `python tools/serve.py`, and open `http://localhost:8402/`. It needs a WebGPU browser: current Chrome,
Edge and Safari on PC and phones, or Firefox on Windows. On a static host it reaches the same state through `coi-sw.js`.

| | PC | Phone |
| --- | --- | --- |
| Move | `W` `A` `S` `D` | Left thumb |
| Look | Mouse | Right thumb |
| Jump | `Space` | `JUMP` |
| Run | `Shift` | `RUN`, or push the stick past its edge |
| Dodge | `Q` | `DODGE` |
| Combo: two cuts, then a slam | Left click | `CUT` |
| Wide swing | Right click | `WIDE` |

Moving backward while cutting gives a rising backhand, running gives an overhead chop, and cutting in the air gives a slam.

A cut opens a gash in the plate, exactly where the blade crossed it on screen. A second blow on that gash goes through, and
the knight bleeds from that spot on every heartbeat. Your X turns red over a cut you could go through. Blood loss weakens
without finishing the knight, so you still have to land the end of it. A blade flashes before it falls: dodge, or swing into
it to parry. Slams and chops break a guard faster than cuts, and running, dodging and swinging all spend your breath. Hitting
the silver knight makes an enemy of them too.

The black knight reads your swings after a human reaction time, and reads the ones you repeat sooner. They answer with the
shield, a roll to clear ground on your flank, or a step back, and punish whiffs with a lunge. They feint, keep a wounded side
turned away, and when badly hurt fall back behind a house and come around the corner fast. Their plans show in how they hold
themselves: bait drops the shield and dares you. Great crabs come out of the fields from 20 seconds after first blood, from
different sides.

F3 shows frame time, threads and what the knight is thinking.

### The title, saves and settings

`src/title.js`, from Bellmourn's title screen: Blastorama Gaming's card, then Jamie Herrington's, each with glints flaring on
the edges of its letters, a sheen, gold dust and a tinkle of glass bells for every glint; then Bellmourn's logo with its
church bells ("Orthodox Church Bells Ringing", Free Sounds Library, CC BY 4.0) and the title's song ("Frozen Hearts", from
Bellmourn's music). A click, a tap or a key skips a card. The game loads behind the black, and the village isn't drawn
until you start: the title stays on black.

**New Game**, **Continue**, **Load**, **Settings**, **How to Play**. Esc (or `II`) pauses: **Resume**, **Save Game**,
**Load Game**, **Settings**, **How to Play**, **Main Menu**. There are ten save slots, and the game keeps itself every 20 s
of play and whenever you pause; Continue picks up the newest of those. A save is the whole fight, taken from the simulation
thread (`Sim.save` and `Sim.load` in `src/sim/sim.worker.js`): where everyone stands, their health, breath and armour, the
knight's tactics and what he has learned of your swings, the crabs, and every gash and bleeding wound. Saves live in
`localStorage` under `velscour.*`, so they never meet Bellmourn's on a shared host.

Settings: volume, music, ambience, look speed, resolution (Auto lets the frame-rate governor choose) and graphics (Auto
picks from your GPU; changing it restarts the game, back to the menu with your game kept for Continue).

To change the difficulty, the numbers to reach for are `hp` and `delay` (crabs) at the top of `src/sim/sim.worker.js`, `hp` in
`Player.reset`, and `dmg` in `ATTACKS` in `src/sim/knight.js`.

### What has and hasn't been tested

**No human has played this.** All of it was run on one machine: desktop Chrome on Windows, an AMD RDNA 4 GPU, 16 logical cores.
Whether it fulfils the aim of running as well as possible on phones and on modest PCs is still unproven.

| Measured there | Result |
| --- | --- |
| GPU time per frame in a fight, Ultra tier | About 3.2 ms at 1280x720, 5 ms at 2560x1440, 8.3 ms at 3840x2160 |
| Six full fights by a scripted player that dodges on the blade flash and waits for the red X | 5 wins, 1 loss, 68 to 109 s each. It has perfect aim and steady reactions, so expect a person to find it harder |
| After a win | Slow motion on the killing blow, the win message, crabs stand down, restart works |
| Static host with no special headers | One reload, then shared memory and threads |
| Message-passing fallback (`?nosab=1`) | Runs, without the planner |
| Touch controls | Synthetic touch events through the real handlers at phone size, including three thumbs at once. No real finger or screen |
| Quality steps | Each one, called by hand during a fight, with no GPU errors. The governor has never been seen choosing one, because nothing here is slow enough |
| Mobile tier | Runs on this desktop GPU with a phone's user agent, which says nothing about a phone's speed |

**Never run:** a phone or tablet, an integrated GPU, Safari, Firefox. **Never heard:** the audio.

To check it yourself:

1. Play for ten minutes with the sound on. Does the fight feel fair, and does anything sound wrong?
2. Watch the knights' feet while they circle you, and the fine scratches beside a fresh cut as the knight moves. Only stills
   have been reviewed, so foot sliding and shimmer haven't been judged.
3. On a phone: `python tools/serve.py 8443 --lan --cert cert.pem --key key.pem`. WebGPU needs HTTPS, so use a certificate your
   phone trusts, such as one from mkcert. Hold 60 fps for ten minutes, and try the thumbs.
4. On a laptop with integrated graphics, press F3 and watch whether the scale and effects step down sensibly.
5. Turn the difficulty if it needs it, with the numbers above.

### How it runs

- **WebGPU only, no engine.** A frame is compute (dual-quaternion skinning, grass, particles), then shadows, a forward HDR
  pass with 4x MSAA, AO and sun shafts at half resolution, full-resolution particles, bloom and a composite. The whole village
  is one vertex buffer and one draw call against a texture array.
- **Threads.** The game asks first, then uses all but one logical core on PC and caps itself on phones. The simulation runs on
  its own thread at 120 Hz (90 on phones) and publishes snapshots through shared memory, so the render thread never waits on
  it. The pool decodes textures and builds the land at load, then spends a few milliseconds of every 40 playing out the duel,
  and those rollouts weight the knight's tactics. Browsers have no real permission prompt for threads, so that question is the
  game's own. Without cross-origin isolation it falls back to messages between threads.
- **GPU.** It takes the high-performance adapter with all of its limits, and picks a tier from what it finds. Resolution then
  follows GPU timings to hold the display's refresh rate, and effects drop out if 60 fps is out of reach. Chrome on Windows
  currently ignores the high-performance hint and says so in the console.
- **Plates stay plates.** Each armour segment is bound to one joint, or to one constant mix of two joints across its whole
  surface, and blended as dual quaternions, so it moves rigidly. Shells that span a joint are cut along their weights. Only
  fingers and cloth keep soft weights. Because plates are rigid, the blade tests against a bind-space BVH of each plate, and
  wounds are evaluated in bind space, so they ride the plate exactly.

### Files

| Path | What |
| --- | --- |
| `assets/armor/` | Both knights on the UAL master skeleton with all 85 clips, for any other use |
| `assets/game/` | What the game loads: the knights without clips, the 41 clips it uses as a small binary, items, village, textures, audio |
| `tools/armor/rig_armor.py` | Rigs a segmented Tripo armour on the master skeleton: `python tools/armor/rig_armor.py velscour|silver SOURCE MASTER OUT_FULL OUT_GAME` |
| `tools/armor/pack_clips.py` | Packs the clips the game uses |
| `tools/armor/measure_blows.py` | Measures where in each attack clip the blow falls, which sets the knight's hit windows |
| `tools/armor/fit_shield.py` | Moves a kite shield's handle to where a knight's fist is |
| `tools/village/build_textures.py` | Turns the paintings into colour and detail arrays, reading timber, plaster, glass and mortar from the paint |
| `tools/village/build_village.py` | Builds the village in Blender, including the colliders and lights in `village.json` |
| `tools/review.js`, `tools/sheet.py` | Stage scenes and screenshots, and run a scripted fight, for reviews |
| `src/sim/` | The simulation thread: knights, AI, crabs, player, collisions |
| `src/gfx/` | The renderer and its shaders |
| `src/title.js`, `src/title.css`, `assets/title/` | The title screen, the menus, saves and settings |

## First-person arms with a sword and shield

`assets/fp/arms_1h.glb` (2.7 MB) is one self-contained model: bare arms on their own skeleton, Bellmourn's Arming Sword in
the right fist and its Iron-Bound Roundshield on the left, and the game's one-handed moves as thirteen clips.

To watch the first-person arms, run `swings-player.bat`. That opens `swings.html` on
`http://localhost:8401/swings.html`, which is Bellmourn's move-picker scene: the training dummy, the X in the middle of
the screen, and a spark where a blow lands. The view shows the path of the blade's tip. Pick the model under **Hands**.

| Clip | What it is | Tip through the X at |
| --- | --- | --- |
| `blade_d1` | Slash from the upper right | 0.400 s of 1.18 s |
| `blade_d2` | Slash from the upper left | 0.400 s of 1.18 s |
| `blade_over` | Overhead cut, straight down | 0.550 s of 1.32 s |
| `blade_rise1` | Rising cut from the lower right | 0.567 s of 1.33 s |
| `blade_rise2` | Rising cut from the lower left | 0.567 s of 1.33 s |
| `blade_flat1` | Flat cut, right to left | 0.383 s of 1.18 s |
| `blade_flat2` | Flat cut, left to right | 0.383 s of 1.18 s |
| `blade_stab` | Thrust from the hip | 0.500 s of 1.08 s |
| `blade_stab_block` | Thrust over the rim, shield up | 0.417 s of 0.92 s |
| `shield_up`, `shield_hold`, `shield_down` | Raising the shield with a shove, holding it (a loop), lowering it | |
| `guard_idle` | The guard, breathing (a 4 s loop) | |

The shield steps aside inside each blow, out and down with its face turned out, and comes back in the recovery, so
those clips drive both arms. In the viewer, left click cycles the combo (1 to 6 pick from the game's six), holding the
right button raises the shield, and clicking with it up thrusts over the rim. The clip times, combos and field of view
are in `gltf.scene.userData`, and blows that start from the guard also end on it, so they chain with no join.

The skeleton is 54 joints, as the two-hander's below, but `weapon` hangs from `hand_R`, so the sword can't drift in the
fist, and there's a `shield` joint on `hand_L`, with its origin on the grip, +y along it and -z toward the enemy.

### What was kept from Bellmourn, and what changed

Kept, from `tools/templates/mocap1h.py` and `moves.py`: the lines through the crosshair, the wind-up and hit places, the
six combos, and the shield's carry, block and step-aside. The rules are the two-hander's: the tip goes through the X on a
frame, along its line, the edge leads, every blow starts and ends on one guard, and speed is one bell with no holds.

Changed:

- **More follow-through.** Past the hit, the slashes carry 95 and 98 degrees (50 in the game), the overhead cut 96 (46),
  the flat cuts 108 (68) and the rising cuts 70 and 73 (38).
- **No whip.** The game's keys have the fist hang back and then rush, up to half a metre in ten degrees of blade. Here its
  travel is spread evenly over the blade's turn, and the fastest fist is under 7 m/s.
- **Drawn at full size.** The game shrinks its one-handers toward the bottom of the screen. These use the two-hander's view,
  so the X is simply straight ahead.
- **A longer sword arm.** The source's right forearm is much shorter than its left (0.21 m to 0.28 m), so it's drawn out 25%
  to match. Without that the arm can't reach through its cuts.
- **The overhead wind-up** stays lower and further forward than in the video, so the arm's cut-off end never comes into view.

To adjust the feel, change the tables at the top of `tools/fp_arms/swings1h.py`: `THROUGH`, `TIMES`, `WIND_CAP`, `WIND_AT`,
`BESIDE` and `SHIELD`.

### The hand repair

As below, but this model's sword was fused only into the right fist. The left hand is a closed empty fist, whose grey,
creased palm was also repainted and smoothed, since it faces you when the shield is up.

### Known limits

- The fingers are fused here too, so the finger bones can tighten or loosen a grip, not open the hand.
- The shield is the game's low-poly model, as is the sword, so they differ in style from the detailed arms up close.

## First-person arms with a two-handed sword

`assets/fp/arms_2h.glb` (2.7 MB) is one self-contained model: muscular bare arms on their own skeleton, Bellmourn's
Greatsword in both fists, and the game's two-handed swings as eight clips.

| Clip | What it is | Tip through the X at |
| --- | --- | --- |
| `great_cut1` | Left click, first: slash from the upper right | 0.517 s of 1.23 s |
| `great_cut2` | Left click, second: slash from the upper left | 0.517 s of 1.23 s |
| `great_slam` | Left click, third: the slam, straight down | 0.667 s of 1.40 s |
| `great_chop` | Overhead chop | 0.633 s of 1.38 s |
| `great_rise` | Rising backhand | 0.533 s of 1.23 s |
| `great_wide_r` | Right click: wide, right to left | 0.467 s of 1.22 s |
| `great_wide_l` | Right click: wide, left to right | 0.467 s of 1.22 s |
| `great_idle` | The guard, breathing (a 4 s loop) | |

These timings are in the model too, in `gltf.scene.userData` (`clips[name]`: `hit`, `wind`, `through`, `duration`),
along with `combo`, the cut lines, and `view` (the view model's field of view).

Every swing starts and ends on the same guard, so any clip can follow any other with no join. Play them at normal
speed: unlike the game's rig, these already have their final timing, so the game's `PACE` slowdown doesn't apply. Draw
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

Kept, from `tools/templates/mocap2h.py`: the keys from the swing video (`art/fp_arms/mocap2h_keys.json`), the lines
through the crosshair, and the order of the combo. The tip runs along its line and goes through the X at the hit. The
edge leads the cut, and the sword doesn't turn in the right fist.

Changed:

- **Smooth motion.** The game plays one pose per tic with holds, then smooths it. Here the blade's angle drives the
  swing, the fists are a continuous curve of that angle, and its speed is a single bell, baked at 60 Hz with a frame
  exactly on the hit.
- **More follow-through.** The blade carries 62 degrees past the hit on the cuts and 71 on the slam, up from about 33 and
  24 in the game. The slam also drives the fists off the bottom of the screen.
- **Further from the eye.** These arms are much bulkier than the game's gauntlets, so the shoulders are wider, lower and
  further forward, the fists are further out along the same lines, and the view model has a wider field of view.
- **Fists beside the line.** The fists run a little to one side of the line, so they clear the X. Only the tip stays
  exactly on it, turned there by the blade's angle.
- **Shallower wind-ups.** They go less far back than in the video, to spare the wrists. Where an arm would run out of
  reach, its unseen shoulder eases toward the hand, so the sword's path is never disturbed.

To adjust the feel, change the tables at the top of `tools/fp_arms/swings.py`: `THROUGH` (follow-through), `TIMES`,
`WIND_CAP`, `BESIDE`, and `SHO`, `OUT` and `ZOOM` for the distance from the eye. Then rebuild.

### The hand repair

The source model's sword was fused to both fists, and the arms were joined only through it and where one hand touched
the other. `tools/fp_arms/repair.py` takes the sword off, parts the arms, and closes every hole left behind with a
smooth patch. Steel colour left on the skin is painted out, the patches get skin blended from their edges in space the
sword left free in the atlas, and normals are rebuilt across the whole surface.

### Known limits

- The sculpted fingers are fused side by side. The finger bones can tighten or loosen a grip, but a fully open hand comes
  out as a webbed mitten. Open hands would need the fingers separated first.
- Each upper arm is cut off flat at its base, with a dark underside. That comes from the source model. `check.py` reports
  the middle of that end reaching the screen in the overhead wind-ups (23 frames of the slam, 10 of the chop).
- The arms are detailed PBR and the Greatsword is the game's low-poly retro model, so they differ in style up close.
- The clips aren't in the game yet: bm has no game code so far, only this model and its viewer.

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
solver, and fails if a rule is broken. On the sword and shield that includes a fist over 8 m/s or an arm's cut end on
screen. For a second opinion from Blender's own importer, with `1h` or `2h` as the last word:

```bash
blender -b --factory-startup --python tools/fp_arms/blender_check.py -- 1h
```

Source art is in `art/fp_arms/`: the Tripo models as delivered, the Greatsword, Arming Sword and Iron-Bound Roundshield
from Bellmourn2, and the two-hander's swing keys from Bellmourn.

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
