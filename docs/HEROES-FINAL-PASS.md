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

## After the critics (PR 271's follow-up; they did not see these)

- A joint of its own for each pauldron (tools/heroes/pauldrons.py, Hero.posePauldrons): it follows the arm while the
  arm is at or below level and is held back past that, so the helm shows in a cheer or an overhead blow.
- paladin_m2: his cloak hung as cloth (tools/heroes/cloakhang.py); the chop, the cut and the shield bash have keyed
  arm arcs (BOARD_ARCS in src/sim/hero.js).
- Cloth weighted by where it hangs wherever that tears less (tools/build/h3/r6_hang.py, 20 heroes: archer_f5, the
  bards, rogues, ninjas). Edges drawn out past 3x now: standing 896, cheer 2929, fights 6844, run and crouch 5365.
- Stowed spears canted off the helm.

## Open, most important first

1. paladin_m2: dark flecks on the breastplate; pale ribbed thigh and knee covers.
2. dragoon_f1 and boomerang_f3: the tall neck tube is the suits' own modelled neck piece (a plate all round the
   throat), not the mail cover. Changing it means editing the armour.
3. Ninjas: quilted patch with a square hole at the shoulder, notch in the cowl.
4. bard_f1-f3 chalk-white upper arms; bard_m1/m3 black tabs by the neck; bard_m2 loose hoop.
5. Carried things: back shield flat like a lid in a crouch; shield inner faces flat black; lance held crosswise when
   armed; paladin_f1's stowed mace sticks out sideways.
6. The sleeve cover on a raised arm is still a fat cone. lancer_f1's neck mantle is wide.
7. Small: dragoon_f4 pauldron notch, dragoon_f3 belly gap, boomerang_m1 elbow fragments.
8. Not seen by the critics: everything in "After the critics", and paladin_m1's re-draped cloak.

## Trade made

Rogues and ninjas no longer have their cloak pinned under the back shield (it tore them far worse than main). Their
shield relies on the swing-out probes alone.
