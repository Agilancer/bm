# The other Tessariels, final pass: where it stands

Four rounds with the three critics (veteran, hit-maker, scientist). They never approved.

| Round | Veteran | Hit-maker | Scientist |
|---|---|---|---|
| 1 | 6 | 6 | 6.5 |
| 2 | 7 | 6.5 | 7 |
| 3 | 7.5 | 7 | 7.5 |
| 4 | 8 | 7.5 | 8 |

Their briefs and notes: `tools/build/h3/critics/` (not in git: tools/build is ignored).

## Done

- Heroes run on the player's gaits (A_walk, A_jog, A_run, A_sprint).
- Paladin, great mace: two-handed holds, lift past the helm, back shield outside the cloak, stowed mace canted.
- Paladin, mace and shield: chop, cross cut and shield bash with the shield kept square.
- Fingers: a hand shape per action (src/sim/herohands.js).
- Sleeve tops of breastplates cut off as rigid arm pieces (tools/heroes/armcut.py); quivers upright.
- Backings under shattered plates (tools/heroes/backing.py, runs in Blender).
- Cloth weights eased where they tear (tools/heroes/relax.py). Edges drawn out past 3x, all 44 heroes:
  standing 4162 on main, 1159 now; cheer 3954, 2771; fights 19009, 10252; run and crouch 22323, 10420.
- paladin_m1's arm-draped cloak cloth hung down (tools/heroes/drape.py), after the last critic round.
- Neck covers flared over the collar bones; mail covers darker; plate insides lit dark iron.

## Open, most important first (the critics' last lists, merged)

1. paladin_m1's raised arm still lifts the pauldron over the helm (see 3). His black blades under the left pauldron
   are FIXED after round 4 (the critics did not see this): his cloak was modelled draped along the outstretched arms,
   and tools/heroes/drape.py hangs that cloth down and ties it to the trunk. This is the one place a model's cloth
   was re-shaped; the body before it is tools/build/h3/prer5/paladin_m1.glb.
2. paladin_m2: the chop has no arc, the bash barely travels, the cloak is two stiff boards, flecks on the breastplate,
   pale ribbed thigh and knee covers.
3. Raised arms in plate: the pauldron covers the helm and the sleeve cover is a fat cone (lancers, bard_m1/m3,
   paladin_m1). Wants a helper joint for pauldrons and a sleeve cover that narrows to the elbow.
4. Cloth still in flat planes in a crouch or run: archer_f5 (worst), bard_f3, bard_f1, bard_m1, bard_m3; dragoon_f1
   needles in a crouch; thin spike under the skirt on lancer_m4 and paladin_f1.
5. Necks: dragoon_f1 and boomerang_f3 still a tall mail tube (held in by collar plates); lancer_f1 a wide bib.
6. Ninjas: quilted patch with a square hole at the shoulder, notch in the cowl.
7. bard_f1-f3 chalk-white upper arms; bard_m1/m3 black tabs by the neck; bard_m2 loose hoop.
8. Carried things: back shield flat like a lid in a crouch; shield inner faces flat black; dragoon spear heads above
   the helm; lance held crosswise when armed; paladin_f1's stowed mace sticks out sideways.
9. Small: dragoon_f4 pauldron notch, dragoon_f3 belly gap, boomerang_m1 elbow fragments, rogue_m2/m3 small holes.
10. Never shown readably to the critics: the rogue's attack, paladin_m2's blows from the front. Watch them in play.

## Trade made

Rogues and ninjas no longer have their cloak pinned under the back shield (it tore them far worse than main). Their
shield relies on the swing-out probes alone.
