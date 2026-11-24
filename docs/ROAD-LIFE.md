# Life on the roads

The owner asked for the roads to be alive: monsters along them now and then, the party ambushed by the kinds that live
there, travellers met and travellers under attack, far more of the other Tessariels about (in groups, fighting on the
road), clearings where they are already fighting a world boss, world bosses risen that you join like a raid, and the
Elder Dragon Gods made a much bigger part of the story. This is how each was done and where it lives. It builds on the
living land (docs/LIVING-LAND.md): the road's own meetings are more of its meetings, the world bosses are temp lairs of
its twelve slots, and auto-play reads all of it the way it reads the rest.

## What's in

| What | Where | How often |
|---|---|---|
| **Ambush**: the country's own monsters rise out of the ditches both sides of you, a little ahead | src/sim/wilds.js startMeet `ambush`, src/core/wilds.js MEETINGS/ROAD | a meeting, weight 6, only on a road |
| **Travellers under attack**: two or three road folk huddled on the road ahead with the country's own at them; they flinch at each blow, run if it goes on, thank you and walk on if you save them | src/sim/wilds.js `rescue`, src/ui/roadfolk.js rescue, src/folk/brain.js roadFix | a meeting, weight 4, only on a road |
| **Tessariels in a fight**: two to four of the other heroes at grips with a pack on the road | src/sim/wilds.js `heroes`, src/sim/hero.js answer | a meeting, weight 5, only on a road |
| **Travellers**: ten road folk (a carter, a pedlar, pilgrims, a drover, a tinker, a charcoal-burner, two going to market), in ones, twos and threes, coming down the road at you, going your way, or resting by it | src/folk/road-folk.js, src/folk/lines/road.js, src/ui/roadfolk.js | a band every 55-110 s on a road, two at most |
| **The other Tessariels about**: one, two or three of the sixteen set down on the road out of sight, walking past you, jogging past, or resting by it | src/sim/hero.js stepPassers (PASS) | every 55-95 s on a road, five at most near you |
| **A clearing with a world boss**: some of the others already at one of the land's greatest, its life a little down | src/sim/worldboss.js clearing | in place of a meeting, 16%, ten minutes apart at least |
| **A world boss risen**: called across the land on the emergency ticker, a crown on both maps, a raid bar; the others come in from the far side to fight it with you | src/sim/worldboss.js call, src/ui/wilds.js, src/ui/party.js showWorldBoss, src/ui/map.js setBoss | first 7-12 min out, then every 15-25 min |
| **The Heralds**: four world bosses that are the Elder Dragon Gods' own, each with a quest that makes it rise at a ground near the quest's giver | src/core/wilds.js WORLD_BOSSES (god), src/folk/regions/{downs,fells,waste,deepwood}.js | when a quest wants it (below) |

Twelve world bosses: the four Heralds (dragons of the gods' own kinds, nine metres, the gods' palettes) and eight of the
land's own (Gorehorn, Old Mother Pox, the Ossuary King, Vethra, the Moon-Eater, the Sleepless One, the Storm Mother, the
Wyrm Below), each an existing body made huge in a palette of its own. Each has a deck of called moves (src/sim/worldboss.js
MOVES_WB: cones, rings, turning lines of wind, waves, rains, a mark to share, marks to spread from, a pull, a "stand in the
light"), more at 70% and its last at 35%, adds that mend it while they live, and a temper at the end of its time. Every
move is called on the ticker as it comes, as a thing happening and a thing to do (src/core/wilds.js BOSS_MOVES), and is a
sim.perils mark or shot, so the party and auto-play dodge it as they dodge every other.

## The Elder Dragon Gods in the story

The gods' delve was a door at the top of the Sorrowhorn at level 100. Now the land knows about them long before:

- **Four Herald quests**, one at the far end of each of four roads, each a level above the last work there:
  *The Empty Sky* (Sib Kestrel, Kestrel Hide, 12: Veyrasz, Herald of the Gale, 495 m north-east), *A Tooth of the Hollow
  Star* (Isla Crag, the Broken Stair, 13: Umbraxes, 380 m east), *The Heat Under the World* (Vesna Kell, the Hollow Watch,
  15: Oskarran, Herald of the Hearth, 341 m north-east), *The Cold That Remembers* (Dain Scree, Climbers' Rest, 17: Selvhra,
  Herald of the Cold, 601 m west). Each giver tells you how to stand to its moves, in their own voice.
- A new quest step, `wboss` (src/folk/quests.js): the quest's Herald rises at the quest's own ground (src/core/boss-grounds.js,
  two new grounds found for it by tools/wilds/boss-grounds.mjs) once you're within 1.6 km of it, waits twenty minutes, goes
  back if you go off, and is up again two and a half minutes after (src/sim/worldboss.js setWant; src/main.js sends the
  wanted list). The quest log, the trail and the tracker lead to the ground. A Herald put down before the step was come to
  doesn't count: they rise again.
- The givers' done lines carry the story on: the heralds go before something; behind the door in the Crown are seals that
  turn over when their herald dies; the Crown is a mouth and its pillars teeth; the black one was going up to it.
- **Yrsa on the Crown** has a new topic, "The heralds", one line more for each Herald put down.
- **The road folk talk of omens** (their "What they say on the road" topic): the Gale's breath, the cold dreaming, the Hearth
  stirring, the Hollow Star eating stars, four shrines facing the Crown, a door with four seals.

Writing rules kept: nobody at a camp names Velscour or Tessariel; no line names anything of one beside anything of the
other (tests/quests-beyond.test.mjs); the door in the Crown is the gods' and nobody's side.

## Auto-play

src/ui/autobrain.js: the road's own are meetings like the rest (WILD_UNDER says how far under you they may be; a rescue is
taken up, an ambush is fought where it stands). A world boss called across the land is gone to only now and then
(BOSS_GAP, twenty minutes between, and never on a first visit or hurt), unless it's near (260 m), already being fought
(120 m), or a quest wants it. A `wboss` quest step goes to the ground and waits there; once it stands, the wild-job takes the
fight. Fights are given up under a fifth of life.

## Memory

No hero and no body is taken away anywhere (owner rule: sixteen other heroes in sixteen bodies on every device). The road
folk are ten dyed copies of bodies every device has loaded already (assets/game/folk/folk.json swaps rd_*), so they cost a
phone a skinned copy each; FOLK is 503 of 512. World bosses are existing Tripo bodies at a bigger scale in existing
palettes. The two new grounds keep pines out (src/core/hunts.js FAR_GROUNDS), which moves the site-corner count a little
(tests/sites-lean.test.mjs).

## How to check it

- `node --test tests/road-folk.test.mjs tests/worldboss.test.mjs tests/quests-beyond.test.mjs tests/quest-loop.test.mjs`
- `node tools/quests/check.mjs` and `node tools/autoplay/check.mjs`
- Live (the built-in browser pane, `?auto&noopening&timer`): `bm.wild(1, 7)` an ambush, `bm.wild(1, 8)` travellers under
  attack, `bm.wild(1, 9)` the others in a fight; `bm.wild(7, n)` world boss n called at the nearest ground, `bm.wild(8, n)`
  the others at it in a clearing; `bm.view.roadFolk.notes` the bands set down. A Herald quest: mark its needs done
  (`bm.view.townUI.quests.q[id] = { stage: 'done', step: 0 }`), take it from its giver, and go within 1.6 km of the ground.

## Not tuned yet

BOSS.hp (1: a world boss's life against a party of four or more), how long travellers last under attack (ROAD.rescue.life),
and how often passers and travellers come round (PASS, ROADFOLK) want a few live hours to set.
