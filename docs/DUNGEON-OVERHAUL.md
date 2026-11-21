# The dungeon once-over (graphics, logic, light, clipping)

The owner's ask: go through every dungeon, overhaul the graphics, make every light source make sense (no glowing green
things all over the sewers), make them fancier and moodier, fix bugs, keep bosses and monsters out of the terrain. Two
critics (a 30-year modelling/texture veteran and a young hit-maker) reviewed it round by round.

## What changed

**Light that makes sense**
- Sewers: the green wisps are gone. Each sector has lanterns on its walls and day through a street grate or two, set
  off to one side of the walk; a third of the runs are under no street at all. Each sector has its own colour: West
  Drains fen-green, the Slough brown and silted (with silt heaps), the Charnel Runs bone-grey and cold (with bones
  heaped along them), the High Conduits clean, with every pipe running.
- Light wells: a modelled mouth in the vault (Blender `oculus`: moulding, throat, iron grille, a dim grey sky). A beam
  falls only from a well 1.4 m across or wider, and it's dim. Courts open to the sky show a dim sky with a stone kerb
  round it and no beam. Underground naves get no beam. The floor under a grate or a well is standing water with a
  broken edge (`slate:p2_puddles` laid flat): the sky over it shows in it as a grey-blue sheen (materials.js), so it is
  neither a pale disc nor a black hole.
- Every delve has its own ambient fill colour (`look.fill`, `delveFill` in the shaders), so no fighting room is a black
  hole. There's no auto-exposure in the delves: a fill raised shows as raised. Reflections in a delve are cut to 5%,
  so still water reads black unless a flame is close to it.
- No standing fire within 3 m either side of a doorway, no torch on a banner, and no entry braziers in the path.

**Props made in Blender** (`tools/dungeon/stamps.py`, built through Blender MCP, or `stamps_bg.py` in background
Blender when MCP is down)
- `lantern_wall` / `lantern_hang`: smoked horn with the flame bright low in it.
- `oculus`, `streetgrate`, `outfall`: the outfall's water leaves the bore, runs over the ledge, falls in an arc and
  splashes.
- `candles`: crowds of tallow, mixed new, yellowed and old, with melted lips.
- `boards`: the Vaults' mudlarks' walks.
- `jar`: the Undercroft's specimen jars, straight-sided, lit green liquid two-thirds up and dark empty glass over it.
  `forest:flame` in materials.js is bright where you look through it and deep green at the edges.
- `gravelamp`: the Kingsbarrow's dished bowl of rusted iron on chains, smoky tallow, three wicks, each with its own
  small glow (one glow a metre across, cut by the bowl, read as a halo). Its light hangs just over the wicks
  (`src/gfx/renderer.js`, `L.lamp === 'bowl'`), not 1.6 m down as a coal basket's: from under it the dish's underside
  was lit like a lampshade.
- `cocoon`: dirty silk, sagging, with strands to the roof.
- `dressform`: the Playhouse's padded torsos, each with a half-made gown in the company's cloth (`$cloth`).

**Paintings** (Thousand Portraits)
- `tools/dungeon/portraits_blender.py` renders the house of Velscour's own royal-blue folk (assets/game/folk) in
  Blender, head and shoulders, lit by one high window.
- `tools/dungeon/portraits_paint.py` turns those renders into oils: Kuwahara brushwork, amber varnish, craquelure and
  canvas weave. There is one unfinished canvas for the Painter.
- The paintings live in two PH2 layers, `p2_portraits_a` and `p2_portraits_b` (six to a square).
- `painting()` and `moulding()` in `src/core/delve-props-a.js` hang them in mitred frames.
- `wire_ph2.py` calls `portraits_paint.wire()` after a rebuild, so the layers stay in the manifest.

**Caves**
- The Deeps: ice is ice, with a cold light at the tip. Floors are grey stone, not frost-white. Sheets, the lake and the
  old litter on the floor are dark old ice (`slate:ice`) or grit-grey snow. Drifts are snow on rock.
- Litter patches (`flat()` in `src/core/delve-dress.js`) are quads with floor UVs: `K.tri` paints by x + z and height,
  so a textured patch on a floor came out in stripes.
- The Sporehold: hung caps no longer make faces. Great-cap stems are grained, and the gill light is halved.

**Mirrors**: no streaks on the glass. The glass is old silvered glass (`pale:obsidian` in materials.js): grey metal,
the hall's lamps glinting in it, a dim haze of the room, its silver gone in clouds.

**Collision**
- Boss radii come from each model's footprint (`bodyRadius` in `src/sim/tripo.js`).
- `tools/dungeon/clipcheck.mjs` measures head room and overhang for every boss.
  - Everyone fits except Venomaw, whose wing tips overhang by 0.43 m.
  - The Elder "ROOF" flags are open void.
- Furniture is not solid, on purpose: it's walked through, not blocked on.

## Tools
- `node tools/dungeon/check.mjs`: builds every delve and counts its triangles.
- `node tools/dungeon/clipcheck.mjs`: boss fit.
- `NODE_PATH=$(npm root -g) OUT=r4 node tools/dungeon/survey.mjs [delve]`: room shots plus close-ups of the made props
  (zz_*). Fight effects are hidden for review (`window.__reviewShots = "calm"`).
- `python tools/dungeon/pairs.py b0 r4`: before|after sheets.
- `stamps_sheet.py`: every Blender prop in three views.

## Left as is
- The Kingsbarrow's east side chamber is unlit on purpose: a doorway into the dark.
- The High Conduits' pillar texture stretch.

## The critics' verdicts
- Round 1: both rejected.
- Round 2: both rejected at 6.5.
- Round 3: both rejected at 7.0. Both said the Thousand Portraits, the sewer light logic, the Deeps floors, the Slough
  and the braziers were fixed. After round 3, before the owner saw it (not seen by the critics): the grave-lamp halo
  and its lit underside, the black puddles, the Bone Porch's fires, and the darkest delves' fill half as much again.

Still open from round 3 (for the owner to rule on):
- The Undercroft jars read as opaque green canisters: no see-through glass, nothing inside, no green light on the
  floor.
- Light beams under grates (Slough ps_bed/ps_weir, High Conduits pa_fall/pa_lamp) are the same width top to bottom and
  read as poles. They should taper and fade before the floor.
- The sky up the High Ward oculus and the Middle Ward gate court is a flat plate: no gradient, no depth.
- The High Conduits waterfall (pa_fall) starts in mid-air and lands with no splash. The West Drains outfall close-up
  is still a dark disc.
- The West Drains cocoon reads as an orange pine cone under the lanterns.
- The Thousand Portraits great easel: its legs stand in front of the canvas, and the charcoal canvas reads as a blank
  board. The twelve paintings repeat down tp_long. The tp_salon black slabs.
- The Hall of Mirrors' tarnish clouds read as storm or marble. hm_work's yellow frames and white blanks.
- Grey fog fills openings meant to be dark (kb_east, kb_ossuary bays).
- Twin red flames on red discs read as horns (ch_sanct, cd_vault, mc_pit and others). Odd glowing triangles in
  ch_observ and ch_ante.
- The castle wards (Lower and Middle Ward, Iron Barracks, Blackvigil) changed little. Flat one-colour runners.
- The Vaults' boardwalk is an island. The hd_ramshall ice sheet is still a hard octagon.
