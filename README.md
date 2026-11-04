# bm

Bellmourn v2.

## First-person arms with a two-handed sword

`assets/fp/arms_2h.glb` (2.7 MB) is one self-contained model: muscular bare arms on their own skeleton, Bellmourn's
Greatsword in both fists, and the game's two-handed swings as eight clips.

To watch it, run `swings-player.bat`. That opens `swings.html`, which is Bellmourn's move-picker scene: the training
dummy, the X in the middle of the screen, and a spark where a blow lands. The view shows the path of the blade's tip.
It's on `http://localhost:8401/swings.html`.

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
- Each upper arm is cut off flat at its base, with a dark underside. That comes from the source model. It doesn't show in
  any swing from the player's view, but it does from outside.
- The arms are detailed PBR and the Greatsword is the game's low-poly retro model, so they differ in style up close.
- The clips aren't in the game yet: bm has no game code so far, only this model and its viewer.

### Rebuilding

Needs Python with numpy, scipy and Pillow. Run these from the top of the repo:

```bash
python tools/fp_arms/repair.py
```

```bash
python tools/fp_arms/build.py
```

```bash
python tools/fp_arms/check.py
```

`repair.py` is only needed once, or when the repair itself changes. `check.py` reads the finished GLB, using none of the
solver, and fails if a rule is broken. For a second opinion from Blender's own importer:

```bash
blender -b --factory-startup --python tools/fp_arms/blender_check.py
```

Source art is in `art/fp_arms/`: the Tripo model as delivered, the Greatsword from Bellmourn2, and the swing keys from
Bellmourn.
