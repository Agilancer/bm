# The six skill trees: how they were designed and reviewed

What the trees are and how to use them is in the README under "Spells". This file is the record of how the design got there,
what was measured, and what nobody has seen yet.

## What was asked for

- Six skill trees: Fire, Ice, Earth, Arcane, Lightning, Utility.
- The player starts with the first spell of each.
- Parts of the trees branch off and add damage, range, area, new abilities and visuals to the spells as points go in.
- At least ten spells a tree: the twenty the game had, moved into their proper trees, and more made to fill them out.
- Magic Missiles fires its missiles significantly faster, and gains more missiles as it's levelled.
- Utility starts with the light orb (Wisp Light) and has small heals, buffs and utility spells.
- Two critics, both thirty-year veterans of fantasy game design and balance, for the trees' balance, the new spells, and how
  they're used in the game.

## The two critics

Two reviewers were run as separate agents, each with the design sheet, the source and the engine's numbers, and neither
seeing the other's report:

- **The systems critic:** point economy, tier gates, damage and mana across spells and schools, loops and locks.
- **The combat critic:** what each school is for in a fight, duplicated spells, whether a branch is a real choice, what
  would be unreadable in first person, names and wording.

They reviewed in three rounds. Each round they returned a verdict, a score, and numbered must-fixes with the concrete change.

| Round | What they had | Systems critic | Combat critic |
| --- | --- | --- | --- |
| 1 | The design as data and a sheet; no new spell coded yet | Reject, 6 / 10 | Reject, 6 / 10 |
| 2 | The revised design, coded, with every spell measured | Approve, 8 / 10, with 2 must-fixes | Approve, 8 / 10, with 5 must-fixes |
| 3 | Those fixes | Approve, 9 / 10, nothing left to fix | Approve, 9 / 10, nothing left to fix |

Both gave 9 and not 10 for the same two reasons, which are still true: the spells were measured against dummies that stand
still, and nobody has seen them drawn.

## Round 1: what they turned down, and what changed

Both rejected the first draft, and agreed on most of why.

- **Branches weren't a choice.** Nothing stopped a player taking both, and a one-point branch was worth far more than a rank.
  Now a spell's two branches are one or the other, a branch's rank can't pass its spell's rank less one, and a rank is 15%
  (was 12%).
- **Trees were ladders.** Tiers were gated by level alone, so at level 14 a player could hold the last spell of three
  schools, and a four-point dip into Utility bought every build a time stop and a quarter more damage. Now a tier also needs
  points already in its school (3, 6 and 10), the tiers open later (levels 1, 2, 6, 11, 17), and a mastery needs 8.
- **Freezes and stuns had no shared limit.** Thunderclap with its branch was a permanent area stun; a refrozen Frost Nova
  outlasted its own cast; and the engine's rule for freezing cut a long freeze short if any small one had landed first. Now
  there is one rule for all of it (`holdFor` in `src/sim/casting.js`).
- **Three ways to cast for nothing:** mana back per bite from Life Drain's branch, per leap from Static Field's, per foe
  from Ring of Fire's. All three are capped.
- **Outliers.** Thunderstorm did 1100 listed to one foe for 52 mana (now a third of that). Static Field did 1029 hands-free.
  Meteor, the last spell of Fire, did less than Firebolt (now 150).
- **Magic Missiles could be tapped** for its whole opening volley at the price of one press. The volley now costs 2 mana a
  missile.
- **Six spells were another spell in different colours.** Each was changed into something of its own:

  | It was | The trouble | It is now |
  | --- | --- | --- |
  | Stormstep | Blink, in lightning | A charge onto the foe you look at, that stuns it. Blink escapes; Stormstep engages |
  | Grasping Vines | Gravity Well's drag | Vines that hold five where they stand (the staff's vines still drag) |
  | Storm Seed | Ball Lightning's lash | A conductor: lightning that strikes its bearer leaps on to everyone near |
  | Ring of Fire | Thunderclap's ring and shove | A ring that rolls out and then stands as a moat of fire |
  | Bone Spirits | Magic Missiles, in bone | Replaced by Monolith: one great blow for one big thing, which Earth lacked |
  | Sunburst | A staff's shot, in the school that kills nothing | Replaced by Turn the Dead |

- **Names and wording.** Modern or doubled names went (Living Bomb, Absolute Zero, Event Horizon, Supernova, Dynamo; three
  "Twin"s; "Static" twice). Soul Tap, Blood Bond and Hungry Dead were Velscour's words in Tessariel's hand, and are Tithe and
  Second Thread now (Hungry Dead went with Bone Spirits). Earth says "rot", not "bleeding": the dead don't bleed.

Not taken from round 1, with the reason: Wisp Light stays on the bar rather than on a key of its own (the light orb was
asked for as Utility's first spell). Renew and Aegis land on you only, not on a hero under the crosshair. There are no
summons, and no passives beyond the masteries.

## Round 2: with the spells coded and measured

The second round had real numbers: `tools/skills/bench.mjs` casts every spell through the sim's own `Casting` at dummies.
That run also found an old fault. A bolt that struck a body told its landing no direction, so a prism staff's beams went
nowhere unless the shot hit a wall; fixed in `stepBolts`.

The systems critic's must-fixes:

1. **Stasis was the one hold outside the rule**, and what it held counted as frozen. It goes through `holdFor` now, as a
   stun.
2. **Rolling Boulder bounded three times on the same body**, out-hitting Monolith from two tiers down. A boulder now hurts a
   body once.

The combat critic's must-fixes:

1. **Whether a stop was a stagger or a hold went by its seconds**, so raising Rime Lance to its third rank shortened your
   Frost Nova. It's the spell's own word now, not its length.
2. **Staggers ate each other**: a half-second stun blocked a Thunderbolt's. A longer one now lands for the difference.
3. **Ring of Fire's moat hid everything outside it** in first person. Its flames are low from inside and full height in
   third person.
4. **Monolith's Standing Stone blocked your view and stopped nothing.** It's Broken Ground now: the slab goes back down and
   leaves low rubble that slows.
5. **The book showed Flame Wyrm "turning the dead"**: two spells shared a field's name.

Should-fixes taken: Thunderstorm and Meteor's cooldowns; Frozen Orb aims some of its shards; Earthsplitter, Starfall, Static
Field, Stone Shard and Firebolt up; Magic Missiles and Turn the Dead down; Stillness no longer slows your own spells;
Thunderstorm lights every third stroke and Earthquake shakes the view half as much; a second pass on names.

## Round 3

Both approved with nothing left to fix. The systems critic asked that Molten Crater be measured before Fire was called
done. It was, and so was Sweeping Flame; each turned out worth far more than a one-point branch should be, and both were cut:

| Branch | Before | After |
| --- | --- | --- |
| Molten Crater (Meteor, rank 5, a pack of eight) | 2440 | 2008 (without it: 1552) |
| Sweeping Flame (Fire Beam, rank 5, a pack of eight) | 1469 | 899 (Chain Lightning at rank 5: 674) |

Neither critic has seen those two changes.

## What the measurements are

`node tools/skills/bench.mjs` prints the table; these are a few lines of it, for scale. Level 1, no gear, so listed damage
times 0.6. "One" is a single foe, "pack" eight together.

| Spell | Tier | Mana | One, rank 1 | One, rank 5 | Pack, rank 1 |
| --- | --- | --- | --- | --- | --- |
| Firebolt (2.85 s to gather and throw) | 1 | 10 | 57 | 86 | 111 |
| Frost Shards | 1 | 12 | 40 | 63 | 40 |
| Stone Shard | 1 | 7 | 24 | 38 | 24 |
| Spark | 1 | 7 | 20 | 33 | 20 |
| Magic Missiles (held 3.5 s) | 1 | 41 | 96 | 214 | 96 |
| Fire Beam (held 3.5 s) | 2 | 47 | 124 | 184 | 124 |
| Chain Lightning (held 3.5 s) | 2 | 47 | 81 | 130 | 364 |
| Blizzard | 4 | 38 | 68 | 109 | 547 |
| Monolith | 5 | 36 | 114 | 182 | 433 |
| Meteor | 5 | 42 | 182 | 234 | 1223 |
| Thunderstorm | 5 | 52 | 186 | 297 | 587 |
| Deadwinter (and a six-second freeze) | 5 | 55 | 54 | 86 | 432 |

For scale: one of the risen has 34 life, a caster 80 to 95, an ogre 130, a werewolf 170, a bone giant 420, the black knight
about 480, a dragon 1100.

**What these numbers don't show.** The dummies stand still and never hit back. A Meteor's 182 on one foe is 90 of blow and
92 of standing seven seconds in its crater; Inferno, Wall of Fire and Plague Flask are the same kind of number. A pack that
walks will take a good deal less from anything that lies on the ground.

## What was run, and what wasn't

Run:

- Every spell at every rank, and every branch at its full rank, through the sim with no page: 600 casts, at packs that
  stand and packs that die (`node tools/skills/bench.mjs --check`).
- All sixty spells cast one after another through the real game's sim thread, in headless Chromium, with everything
  learned: no error from the sim, cooldowns and what's on you reported to the page.
- The spellbook's screen in that browser: the trees drawn, points spent, a second branch refused, a tier refused below its
  level.
- Auto-play in that browser from a new game, with the renderer's frame stubbed (the same way it was run before the trees).
  See below.
- The rules as tests (`tests/skills.test.mjs`), and the game's other tests and checks, which pass.

Not run:

- **The 3D view.** The machine this was built on has no graphics card and its software GPU fails on the game's buffers, so
  no frame of the world was drawn. **Nobody has seen any of the forty new spells, or what the branches add to the old
  twenty.** They're composed from shapes the renderer already drew (orbs, bolts, rings, flames, ice, spikes, columns), so
  they will draw; whether they look right is unjudged.
- A fight played by a person with the trees.
- A phone, touch, or the sounds.

## What the critics want watched in motion

- Ring of Fire's moat, and a Monolith cast at arm's length, in first person.
- A full Barrage of Magic Missiles let fly at a harpy overhead.
- Thunderstorm with Eye of the Storm, for flicker.
- Stillness with a hired party.
- Inferno, Static Field, Spirit Blades and Stoneskin's Stoneshock together, the close-range build: are the effects at your
  feet out of the way of your eyes?
- Whether a walking pack takes about a third of what the table says from a Meteor's crater.
- Chain Lightning held on the bearer of a Storm Seed, against eight.
- Whether Magic Missiles feels thin for its mana at rank 1 (the systems critic's fix if it does: 10 mana a second, not 12).

## Auto-play with the trees

AUTOPLAY_RESULT
