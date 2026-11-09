# bm

Huge rule for this game: V = Velscour = the bad guy (essentially Satan). T = Tessariel = the good guy (essentially Jesus). They don't go together. Anything with a V is never found anywhere near anything with a T. Velscour's church, the cathedral and its catacombs, carries V items only. See "The two sides" in README.md.

Auto-play (the skull's word Jamie; `src/ui/autobrain.js`) plays the whole game, so it has to be kept up with it. Whenever you add or change quests or their steps, foes, monster groups or lairs, places, spells, shops or items, teach auto-play about them in `src/ui/autobrain.js` and run `node tools/autoplay/check.mjs`, which fails until it knows them all. Then watch it play the new part. See "Auto-play" in README.md.
