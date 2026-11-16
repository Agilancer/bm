# The Elder Dragon Gods

The eighth delve: islands broken off the world, hanging in a purple nebula around a black hole, the Maw. Four Elder
Dragon Gods sleep on four islands round it, each built for its own fight. Between them: bridges, dragonling packs and
drakes (the same four dragons, small). Tuned for a party at level 100 and up (the cap is 200); under 100 it should be
close to hopeless.

The fights borrow from the World of Warcraft raid bosses players liked most in the last expansions (research notes:
Dimensius, Crown of the Cosmos, Raszageth, Fyrakk, Sarkareth, Belo'ren, Al'Akir, Ragnaros, Sindragosa, Spine and Madness
of Deathwing, Tindral). What was taken from each is named beside it. What players hated in those fights was taken as a
rule here: no death the player can't see coming, no marathon, every movement mechanic has an answer the AI party can
find, and a fall is never the end (see "Falling" below).

## The four

| God | Dragon | Island | What the fight asks of you |
|---|---|---|---|
| Thyrraxis, the Gale Eternal | green | the Galeward: a disc ringed by pylons, islets below | be pushed and thrown, hold on, ride the wind back up |
| Kaldurra, the Hearth of the World | red | the Cinderwell: a caldera round a magma vent | the floor is lava: keep above it, find shelter |
| Morvekh, Who Remembers the Cold | undead | the Rimespire: a spire of ice, a ramp round it | climb, slide, hide in the ice |
| Nihvaroth, the Hollow Star | black | the Lip of the Maw: the biggest island, on the black hole's edge | resist the pull, leap the gaps |

They're fought in that order; each one's death opens the next bridge from the hub. Nihvaroth is last: the other three
were its teeth.

## The way through

1. **Threshold** (portal in, the broker, the first view of the whole chain and the Maw below).
2. **The Whelp Bridge**: a long stone span. Its dragonlings wait out of sight under the Span's two sides, and come up
   over its edges when you reach its middle (src/sim/voidland.js spanWhelps).
3. **The Shard Garden**: an islet of purple crystal; two dragonling packs and a drake (a green dragon a third of a god's
   size) that fights from the air and the ground.
4. **The Scale Altar**: the hub. Four bridges, one to each god's island, sealed but the first; a seal breaks with each
   god. The altar's four scales are lit in their gods' colours, and each goes out when its god dies. A drake guards
   each bridge's far end (green, red, undead, black in turn), and each has a small piece of its god's fight: the green
   one beats its wings and drives you toward the edge, the red one sends out a lava wave to jump, the undead one's grasp
   drags you to the edge unless you hold to the rime crystal there, and the black one pulls you toward the Maw unless
   you stand in its well of light. As you come onto a god's stair it says its first words.

## Back to the altar, and the way in

Once a god is dead, a gust stone on its island (the Galeward, the Cinderwell, the Rimespire's summit) throws you back to
the Scale Altar: no bridge is walked twice. The first time you come into the void, the eye comes in from high over the
whole of it and down to your own in six seconds; a step or a look ends it (src/main.js entryCam).

## Falling

The void doesn't kill. Fall off an island and the Rift throws you back up onto the nearest safe ground with a heavy
hit (a fifth of your health) and three seconds of void-sickness (slowed). Allies too. The only exceptions: a fight's
last phase on the hardest setting (not in the first build), and Nihvaroth's last Devour (below 8%), where a fall is
into the Maw and kills. A fight may say where its falls
land instead: the Galeward's islets, the shelf Morvekh's beside, the Maw's hand you're on.

## 1. Thyrraxis, the Gale Eternal (green)

The Galeward: a stone disc 60 m across with four storm pylons at its quarters, 19 m from the middle; three islets 18-21 m
below its western rim, 48 m out; a gust stone on each islet (an updraft back up) and between the islets. 165,000 life.

**Phase 1 (100-70%).** Deck: breath, claw rake, squall, gale, spark, conduit.
- *Gale* (Raszageth's Hurricane Wing): wing_buffet twice, and while the wings beat, everyone in the open is driven away
  from him at 4.6 m/s and thrown off the edge when they reach it. Behind a pylon from him (its lee) you're held.
- *Squall Line* (Raszageth, Al'Akir): two lengths of storm sweep the disc from one side to the other at 9 m/s, a 5 m gap
  between them somewhere along the line. Stand in the gap.
- *Lightning breath*: a cone held where it's aimed; the tank in front is spared.
- *Fulminating Spark* (Raszageth): a ring on one of you that follows them for 7 s, then bursts on everyone in it. Carry
  it to the rim, away from the party.
- *Conduit* (Lei Shen): a pylon charges; someone into its ring within 8 s drains it. Unsoaked, it overloads: that
  quarter of the disc burns for the rest of the fight. Three can be live at once.

**Storm Nova (70%).** Enrage roar, a nova, and everyone is thrown off the disc onto the islets below. Three storm whelps
come down after you, one to each islet. He takes wing and comes down on the islet with the most of you on it.

**Phase 2, the islets (70-40%).** The updrafts are still while he's down among the islets; the gust stones between
islets work. Deck: breath, claw rake, Tempest Wing, clouds, tail.
- He fights on one islet for 21-25 s, then flies to the next: a strafe of lightning is laid down the length of the one
  he's going to (2.8 s to get out of the strip), and he lands on it.
- *Tempest Wing* (Raszageth): three rings of wind roll out from him along the ground. Jump each.
- *Lightning clouds* (Al'Akir): a storm over the islet with the most of you on it, 5 s to leave by its gust stone.

**Phase 3 (40-0%).** The updrafts open; he flies back to the disc and lands on its north side. *The disc breaks*: its
middle (7 m round) is live to the end. His blows are 12% harder. Deck: phase 1's and Tempest Wing.

A fall comes down on the nearest islet. Enrage at 9 minutes.

## 2. Kaldurra, the Hearth of the World (red)

The Cinderwell: a ring of black rock 80 m across round a magma vent 7 m wide; 32 basalt pillars a step and a half high
in three rings, 8.5-10 m between their middles. 136,000 life.

**Throughout.** Deck: Claw Smash, wildfire, living meteor, breath (leaves fire 5 s), claw rake, Flamefall run, and below
a third, tail spin.
- *Claw Smash* (Ragnaros's Sulfuras Smash): claw_slam, a blow in front of her, and three lava waves rolling out from it
  in a fan, each to be jumped.
- *Wildfire* (Fyrakk): a front of fire from the vent to the rim, walking round the ring for 15 s at 0.14 rad/s (5.6 m/s
  at the rim, 2 by the vent: keep inside of it, or get behind it).
- *Living Meteor* (Ragnaros): spat at whoever's furthest, it rolls after them at 4.6 m/s and gets faster; it bursts on
  reaching them, or after 15 s where it is. Lead it round the ring, away from the others.
- *Flamefall*: she lifts, glides the length of the ring through the vent's middle and lands, a strip of fire where
  she went, for 4 s.

**Molten Flood (66%, 33% and 10%)** (Nefarian, Smolderon). She hovers over the vent and the caldera floods: everything but the
pillar tops burns for 11 s (drawn as a dark crust with fire in its cracks). Up onto a pillar, one to a pillar; her
breath comes down on a pillar every 4.6 s (two pillars at once from the second flood), and each pillar breathed on
melts, and its two nearest neighbours with it: once the flood ebbs their tops are molten for the rest of the fight,
so each flood has far fewer to stand on (seven are always left). Then the lava
falls, rings of fire roll out from the vent (three, then four) to be jumped, and she lands. After the second and third floods she
crash-lands (crash_land): sprawled for 7 s, everything hits her twice as hard.

**Apocalypse Roar (40% and 15%)** (Fyrakk). Four ember flowers open about the ring; 11 s later she roars, and whoever
isn't in a flower takes more than three of her blows at once. Two to a flower.

Enrage at 9 m 20 s.

## 3. Morvekh, Who Remembers the Cold (undead)

The Rimespire: a spire of ice, a ramp round its south and west sides at 27 m past four shelves (the Foot, the First, the
Second, the Last), to a summit 30 m up; rime crystals on every shelf and round the summit; three claw islets out east of
the summit, reached by gust stones. 172,000 life.

**The climb (100-40%)** (Sennarth). He hangs off the spire beside the First Shelf, 8.5 m out from its middle and low,
his chest over its edge: a blade can reach him from the shelf. At 80% and 60% he climbs to the next shelf, and 12 s
later the freezing mist takes the shelf he's left and the ramp up to it: it stays to the end. He does nothing else for
10 s after a climb (time to follow him up the ramp). At 40% he lands on the summit. Whelps at 80% and 40%. From his
perch, only what needs no claws:
- *Frost breath*: a narrow cone onto the shelf at one of you (24 m, 17° each side), held where it's aimed (he turns it
  slowly), leaving frozen ground for 4 s. Never while the Grasp has you.
- *Grasp of the Grave*: for 5 s everyone is dragged toward the nearest edge at 2.6 m/s, over it if they reach it, unless
  they're within 3.4 m of a rime crystal. Never while his breath, or the ground it froze, is about.
- *Frost bombs* (Sindragosa): one on each of you in turn, 0.7 s apart, a moment's warning each.

**The summit (40-25%)** (Sindragosa, Onyxia). On the ground: claw rake, tail slam, breath, grasp, bombs, and *Deep
Breath*: a 9 m white line across the whole summit.

**Absolute Zero (25%)** (Madness of Deathwing). He lifts off and hangs from the spire; the mist takes the summit too. A
grip in each of the three claw islets: two of you in it break it in 4 s, one alone in 7 (each break takes 3% of his
life). A rime whelp is on each claw, his frost bombs go on (two of you at a time), and ice comes down off the spire
beside every grip that's held. He shrugs off nearly everything meanwhile. All three broken inside 32 s: he crashes onto the summit (crash_land), 9 s at double
damage, then the end. Any left: a blow on everyone for 3.4-5.4 of his, and he comes down anyway, at full strength.

A fall comes down on the shelf he's beside, or the summit. Enrage at 10 minutes.

## 4. Nihvaroth, the Hollow Star (black)

The Lip of the Maw: the biggest island, 92 m across, on the black hole's rim; eight stars go round over it 30 m from its
middle (their sockets show dimly on the ground at all times); an accretion belt of rock going round outside its edge;
violet cracks across its flags running north to the Maw; its two hands, islets out over the Maw. 100,000 life.

**Phase 1 (100-60%).** Deck: Devour, Reverse Gravity, void spheres, breath, claw rake, tail.
- *Devour* (Dimensius): it inhales for 1.6 s and then for 7 s everything is pulled north toward the Maw at 3.1 m/s, and
  over the edge. A star's well (a ring under each star, moving with it) holds you.
- *Reverse Gravity* (Dimensius): one of you floats, three and a half metres up off the Lip. Someone else under them within 6.5 s pulls them down (a little hurt to
  each); nobody, and they take two of its blows and are thrown toward the Maw.
- *Void spheres* (Dimensius's Shattered Space): two land (three later), a few strides from one of you, 7.5 s each, never
  during a Devour. Stand in one to drain it: its blow (about two of its blows) is split among whoever's in it; whoever's
  low is let off if there are enough without them. Unsoaked, it bursts on everyone for most of a blow.

**The Swallow (60%)** (Crown of the Cosmos). The Lip goes dark (it burns to stand on), it hangs out over the Maw out of
reach, and the party is thrown onto its left hand. An echo of Thyrraxis stands there, shielded (8% of what it's hit
with) but for 11 s after someone stands on the hand's star core (one every 16 s). From 24 s on the hand, *Devouring
Cosmos* eats in across it from its outer side. The echo down or 46 s gone: the hand closes and you're flung to the right
hand, the echo of Kaldurra, and the same again. Each echo fights as its god did: Thyrraxis's blows a gale out from
itself while each star core is up (the core's ring is the one place that holds) and sends out rings of wind to jump;
Kaldurra's does her Claw Smash with its three lava waves and looses a living meteor. Nihvaroth breathes a strip down
the hand every 12 s. Then back to the Lip, where a third echo, Morvekh's, comes up and drops frost on two of you every
9 s till it's killed; if both echoes were broken in time, Nihvaroth is destabilized: 10 s stunned, at 180% damage taken.

**Phase 3 (below 30%).** The accretion ring closes in from the edge (to 21 m from the middle, 0.16 m a second), burning,
and the stars are drawn in ahead of it (their wells never in its fire); every 26 s, never during a Devour, a supernova
puts out a star, eight down to three; each well stays under its own star. Devour comes round more often. At 8%, the last
Devour: it doesn't end, its wells close from 3.4 m to nothing over 55 s, a star goes out every 6 s (it gutters red for 2 s first), he takes
half again as much from every blow, his breath and claws go on, and a fall is into the Maw. Kill him before the wells are gone. When he dies the Maw drags him back across the
Lip and over its north edge. (Each god has its own end: Thyrraxis staggers back off his disc, Kaldurra goes back into
her vent, Morvekh goes off the spire's top.) As each star goes out in the last Devour, the count of those left is called.

A fall comes down on the hand you're on, during the Swallow; else on the Lip's south half. Enrage at 11 minutes.

## What the party does

Every rule above is also an order the fight gives (src/sim/elder-fights.js `order`): where to be, or not a step. The
hired party obeys it and jumps the gaps between islands of its own accord (src/sim/voidland.js); auto-play and the
headless test player are given the same orders, routed by way of the gust stone that goes where they're sent (the
player can't jump the gaps). Into the pylon's lee, the spark to the rim, the conduit's ring, off the clouded islet,
one to a pillar, two to a flower, around the ring ahead of the meteor, to the next shelf ahead of the mist, to a rime
crystal, one or two to each grip, into a star well, under the floater, into the spheres, onto the star core, ahead of
the cosmos.

## Tuning

Played by the sim itself (tools/dungeon/fight.mjs: a level-101 player, Firebolt only, fighting inside the 9-pace spell
reach and aiming at what of a god is in reach, with a hired party of lancer, paladin, archer, rogue at 101). Plain: no
gear, three tries. Geared (GEAR=1, a stand-in: half again the power, two fifths more life, a quarter off what's taken):
two tries.

| God | Life | Blow | Plain | Geared |
|---|---|---|---|---|
| Thyrraxis | 165,000 | 385 | 0 of 3 (best 33% left) | 1 of 2 |
| Kaldurra | 136,000 | 350 | 0 of 3 (13% and 17% left) | 1 of 2 |
| Morvekh | 172,000 | 380 | 1 of 3 | 1 of 2 |
| Nihvaroth | 100,000 | 340 | 2 of 3 | 0 of 2 (8% and 13% left) |

Three tries is a small sample and the results swing a good deal from run to run. Under level 100 none is meant to be won.

## Lines

Spoken over the fight as subtitles first. Recording waits on the owner approving a sample voice for each god (the
anchor method, docs/VOICES.md; no lone words, no "!"). About 18 a god.

### Thyrraxis

| When | Line |
|---|---|
| intro | Small things, crossing my sky on a thread of stone. Do you know how far down the bottom is? |
| pull | I am the wind that broke the mountains flat. Come and be weighed against it. |
| gale | Hold on to something, if you can find anything to hold. |
| squall | The storm walks. Find its door or be torn through it. |
| breath | Burn in the lightning's mouth. |
| conduit | Feed my pylon, little ones, or I will. |
| nova | Enough standing. Let us see how you fall. |
| updraft | Back up, then. The sky is not finished with you. |
| rings | Ring upon ring. Leap, or be swept away. |
| spark | A spark for you. Carry it far from your friends. |
| break | This ground offends me. I will have none of it. |
| clouds | Rise and the clouds take you. Fall and the void does. |
| kill | Gone on the wind, like all the rest. |
| kill | Another leaf, torn from the branch. |
| kill | Fly, then. You were never built for it. |
| low | The sky does not bleed. The sky does not bleed. |
| wipe | Lie still. The wind will scatter what is left. |
| death | Even the storm must rest, at the last. |

### Kaldurra

| When | Line |
|---|---|
| intro | Come in out of the cold, children. I lit the first fire. Let me show you the last. |
| pull | Every hearth you ever warmed your hands at was a spark of mine. I want them back. |
| smash | The ground remembers my weight. |
| wildfire | The fire walks. You will run out of island before it runs out of hunger. |
| meteor | Catch, little one. It is still warm. |
| flood | My blood is the sea now. Swim. |
| rings | Dance in my rings. I always loved the dancing. |
| seeds | Plant your little seeds. I will see what grows. |
| roar | Now the world ends. Hide, if you have somewhere to hide. |
| run | Down the length of you, all in one breath. |
| crash | The ground came up to meet me. |
| kill | Ash, and then nothing. |
| kill | One less cold hand in the world. |
| low | The hearth is going out. Not yet. Not yet. |
| wipe | Sleep in the warm, children. |
| death | Keep the fire for me. Someone must. |

### Morvekh

| When | Line |
|---|---|
| intro | I died here once. It was quiet. You have come to make it loud. |
| pull | I remember every warm thing that ever froze. I will remember you. |
| climb | Up, then. The cold is following you. |
| breath | Breathe in. It is the last warm breath you take. |
| grasp | The grave reaches up. Hold fast, or come down to me. |
| bombs | Stand behind your friends. They are colder than you now. |
| deep | I will draw a white line across the world. |
| zero | When it reaches nothing, so will you. |
| grip | My grip, my grip is gone. |
| kill | Still now. Good. |
| kill | You will keep. You will keep a very long time. |
| kill | Another one for the ice. |
| low | I remember dying. It was easier than this. |
| wipe | Quiet again, as it should be. |
| death | Warm. I had forgotten what warm was. |

### Nihvaroth

| When | Line |
|---|---|
| intro | You have come to the edge of everything. Look down. That is where your gods went. |
| pull | I am the hunger under the stars. The other three were only my teeth. |
| devour | Come closer. Closer. Everything comes to me in the end. |
| float | One of you is lighter than the others. I will take that one first. |
| spheres | Pieces of nothing. Hold them, if you dare. |
| swallow | Into me, then. See what I have eaten. |
| echoes | Meet my brothers again. They are mine now. |
| cosmos | Your island is a crumb, and I am still hungry. |
| stunned | What have you put in me. What have you done. |
| nova | Your little stars. Watch them go out. |
| ring | The edge comes in. It always comes in. |
| kill | Taken, and gone. |
| kill | Nothing ever comes back from me. |
| kill | Another light, swallowed. |
| low | I have never been empty before. |
| wipe | Hush now. There is no sound where you are going. |
| death | So this is what it is, to be filled. |
