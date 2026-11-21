// Castle Velscour's keys, its barred shortcuts and what's said of them. A key is a flag the render thread's quests keep
// ('key:<id>', src/folk/quests.js), given by a boss's death (a boss's gives, src/core/delve-*.js) and asked for by a gate
// between delves (a link's shut: 'key:<id>'; src/sim/dungeon.js open). A latch ('latch:<id>') is a way barred from one side:
// come through it from the other and it's open for good (a link's opens; its far side's shut).
// No key bears a letter or a mark of Tessariel's: iron, bone, glass, brass (the V and T rule).
export const KEYS = {
  'key:archive': { name: 'the Drowned Key', got: 'The Drowned Key: green bronze, still wet. It turns the Sanctuaries Stair in the Long Stacks.' },
  'key:portraits': { name: 'the Painted Key', got: "The Painted Key: it was in the last frame all along. It turns the Clock Tower's door at the end of the Horn Galleries." },
  'key:barracks': { name: "the Marshal's Key", got: "The Marshal's Key: black iron, heavy as a mace. It turns the Menagerie's door in the Conservatory." },
  'key:undercroft': { name: 'the Glass Key', got: "The Glass Key: it rings when you flick it. It turns the Crypt door at the bottom of the Oubliettes." },
  'key:clockworks': { name: 'the Winding Key', got: 'The Winding Key: brass, as long as your arm. It winds the lift in the Clock Tower up to the High Ward.' },
  'key:menagerie': { name: "the Keeper's Key", got: "The Keeper's Key: a ring of them, and only one that isn't a cage's. It opens the Beast Stair up to the Hall of Mirrors." },
  'key:ossuary': { name: 'the Bone Key', got: "The Bone Key: a finger's worth. It opens the Reliquary under the Ossuary Chapel." },
  'key:mirrors': { name: 'the Silvered Key', got: 'The Silvered Key: you can see the door it fits in it. It opens the Throne Antechambers.' },
  'key:sexton': { name: "the Sexton's Ring", got: "The Sexton's Ring: every door of the High Ward that he kept. The way up into Velscour's Keep is open." },
};
// What's said when a latch is first lifted (by its id).
export const LATCH_WORDS = {
  scriveners: "The Scriveners' Lift is unchained. It runs now, between the Gargoyles' Roost and the Deep Stacks: Pell's Holdout is one stair from the top of the castle.",
  sump: "The Sump's grate is unbarred from below. The Deep Stacks and the Drowned Archive are joined.",
  frame: "The empty frame swings out into the Portrait Gallery. The Thousand Portraits let out into the Middle Ward now.",
  trapdoor: "The trapdoor's bolt is drawn. The Alchemists' Undercroft comes up into their wing.",
};
export const latchWord = (id) => LATCH_WORDS[id] || 'A way is unbarred behind you: it will stay open.';
