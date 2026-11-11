// The quests of the land beyond Bellmourn: the roads out to the small towns, what besets each of them, and the three party
// dungeons (the Hollowfang Warrens, Blackvigil Keep, the Howling Deeps) and the cathedral's catacombs. Their workings only:
// every word of them is in src/folk/lines/land.js, and how a step is finished is src/folk/quests.js (which spreads these
// into RULES). Givers: Bellmourn's own (the ones Lisandra sends you round), the people posted in the small towns
// (src/folk/people.js POSTED), and the two at the Bell Tower (src/folk/lines/beyond.js BEYOND).
//
// Pay grows with how far it is and how hard: a walk and a word about what a town errand paid; a lair cleared a little more;
// a dungeon's boss a good deal more, with something rare; a long chain's end a charm (src/ui/lands.js CHARMS).
// tests/quests-beyond.test.mjs walks every one of them through.
const KNIGHTS = ["Velscour's Knights"];

export const LAND_RULES = {
  // ---- out of Bellmourn, to the small towns and the forts ----
  word_to_thornwick: { steps: [{ enter: 'thornwick' }, { talk: 'osric', say: 'Ser Aldric Halloway asks if the Gallows Road still runs.' }, { back: true, say: "Thornwick's hedge-reeve sends his answer." }], gold: 80, xp: 500 },
  tracks_west: { needs: 'pines', steps: [{ enter: 'cinderford' }, { talk: 'hasket', say: 'Corran Thrale tracked the dead to your wall.' }, { back: true, say: 'The sergeant at Cinderford counted them too.' }], gold: 90, xp: 550 },
  owed_to_frostwatch: { needs: 'bed_and_bell', steps: [{ enter: 'frostwatch' }, { talk: 'garrick', say: 'Bram Kettle pays what he owes.' }, { back: true, say: "The warden's taken it off your slate." }], gold: 100, xp: 600 },
  millhaven_man: { needs: 'millhaven_jelly', steps: [{ enter: 'belltower' }, { talk: 'hale', say: 'Abel Fenwick asks if you mean to come home for the barley.' }, { back: true, say: "Hale Orrowick isn't coming home." }], gold: 70, xp: 500 },
  // ---- the land's own troubles, given in Bellmourn ----
  cairnfield: { needs: 'dead_cant_wait', steps: [{ enter: 'cairnfield' }, { kill: 'lair:cairn_keepers', n: 4 }, { back: true, say: 'The cairns are let alone.' }], gold: 90, xp: 550 },
  sunken_mile: { needs: 'sallowmere', steps: [{ enter: 'causeway' }, { kill: 'lair:mile_drowned', n: 5 }, { back: true, say: 'The Sunken Mile can be walked.' }], gold: 120, xp: 800 },
  moor_wayhouse: { needs: 'barrow_lights', steps: [{ enter: 'wayhouse' }, { kill: 'lair:wayhouse_dead', n: 4 }, { back: true, say: "The wayhouse is empty. It's a better empty." }], gold: 150, xp: 900 },
  // ---- the cathedral's catacombs ----
  deeper_dead: { needs: 'bones_for_carver', steps: [{ kill: 'catacombs', n: 20 }, { back: true, say: 'Twenty more are at rest.' }], gold: 120, xp: 500 },
  waxed_thread: { needs: 'shroud_and_thread', steps: [{ bring: 'wax', n: 6 }], gold: 100, xp: 300 },
  // ---- the Hollowfang Warrens ----
  warrens_mouth: { needs: 'pines', steps: [{ enter: 'warrens' }, { back: true, say: "I've been down the hole on the hill." }], gold: 80, xp: 500 },
  barley_thieves: { steps: [{ kill: 'warrens', n: 12, foe: ['Goblins', 'Kobolds'] }, { back: true, say: 'Twelve of your thieves are done thieving.' }], gold: 150, xp: 900 },
  tunnel_king: { needs: 'warrens_mouth', steps: [{ boss: 'grubnash' }, { back: true, say: 'The big kobold is dead.' }], gold: 180, xp: 1200, item: 'staff' },
  mother_of_the_warren: { needs: 'tunnel_king', steps: [{ boss: 'twins' }, { boss: 'venomaw' }, { back: true, say: 'The thing at the bottom of the Warrens is dead.' }], gold: 400, xp: 2500, item: 'skull' },
  // ---- Thornwick ----
  hedge_breakers: { steps: [{ kill: 'lair:thorn_goats', n: 3, foe: ['Goat Men'] }, { back: true, say: "Three goat men won't be through your hedge again." }], gold: 120, xp: 800 },
  black_ram: { needs: 'hedge_breakers', steps: [{ kill: 'lair:thorn_ram', n: 3, foe: ['Goat Men'] }, { back: true, say: 'The Black Ram is dead, and his two with him.' }], charm: 'goatfoot', charmName: 'the Goatfoot', xp: 1100 },
  up_from_the_gallowswood: { steps: [{ kill: 'lair:thorn_stragglers', n: 4 }, { back: true, say: "They're down. Burn what's left." }], gold: 130, xp: 900 },
  old_toll: { needs: 'up_from_the_gallowswood', steps: [{ enter: 'oldtoll' }, { kill: 'lair:toll_ambush', n: 5 }, { back: true, say: "Wat Arden won't be coming for his supper." }], gold: 170, xp: 1200 },
  salt_for_the_hanged: { steps: [{ visit: ['crossroads', 'grove'] }, { back: true, say: 'The salt is down at the Cross and in the Grove.' }], gold: 150, xp: 1400 },
  // ---- Cinderford ----
  ash_on_the_wind: { steps: [{ kill: 'lair:cinder_refugees', n: 4, foe: ['The Possessed'] }, { back: true, say: 'The four above the ford are down.' }], gold: 130, xp: 900 },
  red_scouts: { needs: 'ash_on_the_wind', steps: [{ kill: 'lair:cinder_scouts', n: 2, foe: KNIGHTS }, { back: true, say: 'Your two watchers are dead.' }], gold: 180, xp: 1300 },
  vigil_patrols: { needs: 'red_scouts', steps: [{ kill: 'waste', n: 8, foe: KNIGHTS }, { back: true, say: 'Eight fewer on the Vigil Road.' }], gold: 260, xp: 2000 },
  charcoal_for_khel: { steps: [{ enter: 'khel' }, { kill: 'lair:khel_ghouls', n: 4 }, { back: true, say: "Nobody at Khel is buying. I'm sorry." }], gold: 160, xp: 1300 },
  charred_mill: { steps: [{ enter: 'charmill' }, { kill: 'lair:charmill_possessed', n: 5 }, { back: true, say: 'Edmer is at rest. I saw to it myself.' }], item: 'robe', xp: 1500 },
  // ---- Frostwatch and the Howling Deeps ----
  mouth_guard: { steps: [{ kill: 'lair:mouth_demons', n: 2, foe: ['Night Paralysis Demons'] }, { back: true, say: 'The two at the Mouth are dead.' }], charm: 'glimmerstone', charmName: 'the Glimmerstone', xp: 1500 },
  ravens_tor: { steps: [{ enter: 'tor' }, { kill: 'lair:tor_roost', n: 3, foe: ['Harpies'] }, { back: true, say: "The Tor's queen is dead." }], gold: 200, xp: 1600 },
  into_the_deeps: { needs: 'mouth_guard', steps: [{ enter: 'deeps' }, { boss: 'hrymgar' }, { back: true, say: "Hrymgar's dead. I counted the doors." }], gold: 250, xp: 2000, item: 'staff' },
  broodmother: { needs: 'into_the_deeps', steps: [{ boss: 'broodmother' }, { back: true, say: 'The Broodmother is dead.' }], gold: 300, xp: 2600, item: 'robe' },
  // ---- Ser Hale's: Blackvigil Keep, and the bottom of the Deeps ----
  the_howling: { needs: 'millhaven_man', steps: [{ talk: 'garrick', say: 'Ser Hale Orrowick asks what howls under your fell.' }, { enter: 'deeps' }, { back: true, say: "I've stood inside the Howling Deeps." }], gold: 180, xp: 1500 },
  the_sleeper: { needs: 'the_howling', steps: [{ boss: 'sleeper' }, { back: true, say: 'What slept under the fells is dead.' }], gold: 500, xp: 4500, item: 'scroll' },
  gate_of_blackvigil: { needs: 'millhaven_man', steps: [{ enter: 'blackvigil' }, { back: true, say: "I've been through the gate at the end of the west road." }], gold: 150, xp: 1200 },
  red_cloth: { needs: 'gate_of_blackvigil', steps: [{ kill: 'blackvigil', n: 20, foe: ["Velscour's Knights", 'Necromancers', 'Plague Knights'] }, { back: true, say: 'Twenty of the garrison are dead.' }], gold: 300, xp: 2200 },
  first_lord: { needs: 'gate_of_blackvigil', steps: [{ boss: 'maldrec' }, { back: true, say: 'Maldrec is dead.' }], gold: 250, xp: 2000, item: 'staff' },
  lords_of_the_keep: { needs: 'first_lord', steps: [{ boss: 'sorvane' }, { boss: 'brothers' }, { back: true, say: 'Sorvane is dead, and the Brothers.' }], gold: 350, xp: 3000, item: 'robe' },
  the_castellan: { needs: 'lords_of_the_keep', steps: [{ boss: 'castellan' }, { back: true, say: 'The Castellan of Blackvigil is dead.' }], gold: 600, xp: 5000, item: 'skull', rarity: 4 },
};
