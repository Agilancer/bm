# Texture requests for ChatGPT (City State Phobos and Castle Velscour)

Five zips of twenty textures each, 100 in all. For each zip:

1. Start a new ChatGPT chat (one that can run code and make images), upload the zip, and paste:

   > Unzip this and read README_FOR_CHATGPT.md, then do everything it says for every item, one image per item.
   > Work through all twenty without stopping to ask me, and hand back the RETURN zip at the end.

2. If it stops part-way (out of generations or time), say "carry on from where you stopped", or ask it to pack what it
   has with `scripts/pack_return.py`.
3. Download `RETURN_PH2_BATCH_<nn>.zip` and give it to Claude (drop it anywhere and say where). If it came back in
   parts (`_part1.zip`, `_part2.zip`, ...: no zip is over 30 MB), download every part.

Claude then makes them repeat cleanly, grades them to their district, builds the normal and roughness maps, and puts
them on the city, the castle and the Keep.

| Zip | What's in it |
|---|---|
| PH2_BATCH_01 | Iron, gates, bones and streets: bars, rivets, rust, studded gates, a bone wall, copings, arch stones, setts, ash streets, wharf decks, moat water |
| PH2_BATCH_02 | Roofs, timber, doors and windows: slate, lead, blood-red tiles, burnt roofs, copper, planks, char, three doors, shutters, leaded glass by day and lit at night, awnings |
| PH2_BATCH_03 | Velscour's liveries, cloth and interiors: five livery banners and his war banner, two tapestries, thorn brocade, lacquer panelling, oxblood marble, checker floor, books, jars |
| PH2_BATCH_04 | Castle Velscour, the Keep and the crag: curtain granite, the Keep's bone-netted basalt, skull courses, demon friezes, corbels, cliffs, scree, spire roofs, bloodstone, obsidian, his stained glass |
| PH2_BATCH_05 | Grime overlays and decals: soot, damp, moss, blood, rust streaks, cracks, lichen, ash, cobwebs, gouges, scorch, puddles, dead ivy, rags, straw, bones, litter, wax, chain |
