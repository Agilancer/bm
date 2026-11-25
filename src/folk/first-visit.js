// Your first visit to City State Phobos, in the first quarter of an hour (docs/FIRST-VISIT.md): their workings, as
// src/folk/quests.js RULES (spread into it); every word of them is in src/folk/lines/first-visit.js.
//
// Once Bram's first errand has put a skull in your hand, Lisandra offers to show you what you're up against. She opens a
// door of candles (`door`: src/ui/folk.js lisDoor) and sets you down on the Sill, in sight of his city, beside Wenna Coyle, who
// keeps the lamps on the way down to it and was her apprentice once. Wenna has four things for you there, all at about level
// three to five: put down his hanged debtors on the Gibbet Field and the carrion birds under the Sill; walk down through the
// Drawbridge Gate and see the city for yourself, as far as the Chainmarket and Fennick Lowe of the Pennyless; and go into the
// Redoubt his knights cut into the Sill's north cliff, and kill the Red Hand who holds it. Fennick, down in the city, has three
// yards of it cleared: the toll's runners off the Barbican, the chain-thieves behind Chainmarket, and what comes up the
// Rookeries' drain. Then she opens Lisandra's door back (`door: 'home'`), and you tell Lisandra what you saw.
//
// Places: 'ph:<district>' (inside the wall, src/core/phobos-data.js), 'lair:sill_gibbets' and 'lair:sill_carrion' (the plain
// under the Sill, src/core/tripo-monsters.js), and the Redoubt ('redoubt', src/core/delve-redoubt.js).
export const FIRST_VISIT_RULES = {
  // Lisandra's: through her door, to Wenna on the Sill. Paid there.
  // (due: or once that flag's set, Bram's errand or no: DOOR_DUE.)
  the_door_east: { needs: 'bed_and_bell', due: 'door_due', door: 'sill', steps: [{ talk: 'fv_wenna', say: 'Lisandra sent me. Through a door of candles.', end: true }], gold: 30, xp: 60 },
  // Wenna's four: the hunts on the plain first, straight after the long look at the city from the Sill, then the walk down
  // into it, and the Redoubt last.
  fv_gibbet_field: { needs: 'the_door_east', steps: [{ kill: 'lair:sill_gibbets', n: 8 }, { back: true, say: 'The hanged are down again. All of them.' }], gold: 45, xp: 110 },
  fv_carrion: { needs: 'the_door_east', steps: [{ kill: 'lair:sill_carrion', n: 5 }, { back: true, say: 'The birds under the Sill are dead.' }], gold: 45, xp: 80 },
  fv_the_way_down: { needs: 'the_door_east', steps: [{ visit: ['ph:barbican', 'ph:market'] }, { talk: 'ph_penny', say: 'Wenna Coyle of the Sill says her lamps are lit.', end: true }], gold: 40, xp: 100 },
  fv_the_redoubt: { needs: ['fv_gibbet_field', 'fv_carrion'], steps: [{ enter: 'redoubt' }, { boss: 'rothgar' }, { back: true, say: 'The Red Hand is dead. His Redoubt is broken.' }], gold: 120, xp: 200, item: 'staff', named: "Wenna's Lamp-Iron", seed: 0xf1a5e },
  // Fennick Lowe's, once you've found him in the Cinder Quarter: three yards of his city to clear, each in a part of it you
  // walked through on the way down (lairs ph_toll_runners, ph_chain_thieves, ph_gutter_nest: src/core/tripo-monsters.js).
  // Told to Wenna, up on the Sill, when they're done: she and Fennick keep the one purse, and she pays. (So the door home,
  // hers, knows they're done: tests/quest-loop.test.mjs.)
  fv_toll_runners: { needs: 'fv_the_way_down', steps: [{ kill: 'lair:ph_toll_runners', n: 5 }, { talk: 'fv_wenna', say: "Fennick's toll-runners off the Barbican are dead.", end: true }], gold: 30, xp: 50 },
  fv_chain_thieves: { needs: 'fv_the_way_down', steps: [{ kill: 'lair:ph_chain_thieves', n: 5 }, { talk: 'fv_wenna', say: 'The yard behind Chainmarket is clear, for Fennick.', end: true }], gold: 30, xp: 50 },
  fv_gutter_nest: { needs: 'fv_the_way_down', steps: [{ kill: 'lair:ph_gutter_nest', n: 4 }, { talk: 'fv_wenna', say: "Nothing's coming up the Rookeries' drain now.", end: true }], gold: 35, xp: 60 },
  // And home: Wenna opens Lisandra's door back, and you tell Lisandra. (Once the Redoubt's broken and Fennick's yards are
  // clear: the city's work done before Bellmourn's.)
  fv_home: { needs: ['fv_the_redoubt', 'fv_toll_runners', 'fv_chain_thieves', 'fv_gutter_nest'], door: 'home', steps: [{ talk: 'lisandra', say: "I've seen his city. And his knights.", end: true }], gold: 60, xp: 80, item: 'scroll' },
};
// The level each wants (src/ui/autobrain.js PLAN; the quest log suggests the same): the door at one, straight after Bram's
// errand (auto-play takes it then, before the town's other work); out there, three to five; home at five or six.
export const FIRST_VISIT_LEVELS = [
  ['the_door_east', 1], ['fv_gibbet_field', 3], ['fv_carrion', 3], ['fv_the_way_down', 3], ['fv_toll_runners', 3], ['fv_chain_thieves', 3],
  ['fv_gutter_nest', 4], ['fv_the_redoubt', 4], ['fv_home', 4],
];
// Lisandra's door is offered after Bram's errand, or at twelve minutes played whatever that errand has come to (the 'door_due'
// flag, set by src/main.js), so the first visit comes inside the game's first quarter hour however the evening's gone. A run
// came to Silas while he sat upstairs in the inn and waited on him till morning, and came to the door at eighteen minutes.
export const DOOR_DUE = 720;
// Wenna's, in the order she gives them (auto-play keeps to them while it's out there: src/ui/autobrain.js).
export const FIRST_VISIT = FIRST_VISIT_LEVELS.map(([id]) => id);
// Where Lisandra's door sets you down on the Sill: a few steps short of Wenna, by the seal, facing east to the city.
export const SILL_DOOR = { x: 8939.5, z: 9.5, yaw: Math.PI / 2 };
// What you say to go through it (src/ui/folk.js; auto-play says it too, src/ui/autobrain.js).
export const DOOR_STEP = 'Step through.';
