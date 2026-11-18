// City State Phobos's three hubs (src/core/phobos-hubs.js): what their givers say (src/folk/people.js POSTED, hub), and the
// words of the city's first quests (their workings: src/folk/phobos-quests.js). As src/folk/lines/land.js.
//   Fennick Lowe, the Pennyless' Purse: thieves who give it back, behind the burnt chandlery on Ash Lane.
//   Maud Treller, Captain of the Quiet Watch: knights in hiding at a dye works. Nothing of theirs shows: no mark, no oath
//     said aloud, no name of whom they serve (the V and T rule). They're dyers, and they'd like you to say so too.
//   Edda Grail, Warden of the Ashwardens: demon hunters in a charnel yard at the Bone Yards' north end.
// (And the people down the sewers, and their quests: src/folk/lines/phobos-sewers.js, taken in at the end.)
import { LINES as SEWER_LINES, QUESTS as SEWER_QUESTS } from './phobos-sewers.js';
import { LINES as CASTLE_LINES, QUESTS as CASTLE_QUESTS } from './phobos-castle.js';

export const LINES = {
  ph_penny: {
    first: [
      "Don't stand in the gate, you'll be counted. In. ...There. Fennick Lowe. I keep the purse for the Pennyless, which is a joke, because the purse is the one thing we never keep.",
    ],
    greet: {
      morning: [
        "Bread went out at first light. Forty loaves to the Cinder cellars. Bought with a lancer's own coin. He'll miss it at dinner.",
        "Morning. If you've come to rob us, the queue's long and we're at the back of it.",
      ],
      day: [
        "Daylight's for counting. Dark's for collecting. You've caught me counting.",
        "Every coin in this yard came out of a red purse. Every coin goes out of it to someone who'd starve otherwise. We're the shortest road money takes in Phobos.",
      ],
      evening: [
        "Lamps lit on Ash Lane. That's my lads going out. Don't follow them; they're shy.",
        "Evening. Sit if you like. That bench has held better thieves than you. Not many.",
      ],
      night: [
        "Speak soft. The Loyal walk the Lane at night, and they've ears like a tax.",
        "Night's when the city's honest. Everyone's stealing something.",
      ],
    },
    about: [
      "The Pennyless. Cutpurses, fences, a few honest beggars who got tired of it. We take from his and give to the rest. Somebody has to, and the priests are all his now.",
      "The chandlery out front burnt the year his knights came. The candlemaker was mine. So's the yard. I kept it.",
    ],
    ask: {
      city: [
        "Phobos? It's three cities in a wall. His, at the top. The dead's, in the Bone Yards. And ours, which is everyone in between keeping their head down and their door barred.",
      ],
      watch: [
        "The dyers on the Tanners' Steps? Good people. Very good people. Too good. Nobody's that good at dyeing. Go and see Captain Treller if you want honest work done quietly.",
      ],
      ash: [
        "The Ashwardens are mad, and I like them. They go into the Bone Yards on purpose. Edda Grail buys her lamp oil from me and pays full price, which is how I know she's mad.",
      ],
    },
    topics: { city: 'The city', watch: 'The dye works', ash: 'The Ashwardens' },
    bye: [
      "Go on. Keep your purse inside your shirt. Not from us. From everybody else.",
      "Mind the Lane. And if you find a red purse lying about, it's ours.",
    ],
    barks: {
      player: ["In or out. Don't hang in the gate.", "Purse inside your shirt."],
      morning: ["Forty loaves out.", "Who's on the cellars today?"],
      evening: ["Lamps on the Lane. Off you go, lads.", "Quiet now."],
      magic: ["Do that out on the Lane, not in my yard.", "Pretty. Don't do it near the tallow."],
    },
  },

  ph_watch: {
    first: [
      "Mind the vats, that's madder; it'll be on your hands for a week. ...You're not a buyer. Treller. I run the works. If anyone asks, that's all I run.",
    ],
    greet: {
      morning: [
        "Morning. Red vat's on the boil. Weld's ready by noon. And the street's had three of his patrols past since dawn, which is one more than yesterday.",
        "We open at first light like honest dyers. We are honest dyers. Mostly.",
      ],
      day: [
        "Cloth on the poles, wind from the east. Good drying day. Good watching day.",
        "Customers come to the gate, not the yard. You're in the yard. So you're not a customer.",
      ],
      evening: [
        "Vats covered, fires down. Evening's when we see who's walking where.",
        "Sit by the vats if you're cold. They hold their warmth. So do we.",
      ],
      night: [
        "Night's quiet on the Steps. The tanneries stink too much for his men to stand about in. That's why we're here.",
        "Lower. Sound carries off the water.",
      ],
    },
    about: [
      "Maud Treller. A dyer, with a yard of dyers. We keep an old promise, quietly, and that's all you'll get out loud.",
      "Fifteen of us, some old enough to remember the city before his banners. We dye his red, more fool us. It pays, and it lets us carry cloth anywhere.",
    ],
    ask: {
      oath: [
        "What oath? I said a promise. A promise isn't said in a dye yard with the gate open. Ask me again in a year if we're both alive.",
      ],
      red: [
        "Half the red on his knights' backs came out of that vat. We know every one of them by the hang of his cloak. That's worth knowing.",
      ],
      penny: [
        "Lowe? A thief with a conscience, which is the dangerous sort. He feeds the Cinder cellars. I'd trust him with my life and not my purse.",
      ],
    },
    topics: { oath: 'The promise', red: 'His red', penny: 'The Pennyless' },
    bye: [
      "Out by the gate, not over the wall. Dyers use gates.",
      "Go careful. And wash your hands before you meet anyone of his. Madder tells tales.",
    ],
    barks: {
      player: ["Mind the vats.", "Gate's for customers."],
      morning: ["Red's on the boil.", "Three patrols since dawn."],
      evening: ["Cover the vats.", "Who's on the gate tonight?"],
      magic: ["Not by the cloth!", "Put that out. You'll have the whole street looking."],
    },
  },

  ph_ash: {
    first: [
      "Stop there. Hands where I can see them. ...Warm. Breathing. Good. Edda Grail. Warden. This is the Ashwardens' yard, and nothing that's died comes through that gate twice.",
    ],
    greet: {
      morning: [
        "Morning rounds done. Two rows by the north wall stirred in the night. We put them back.",
        "Ash on the stones is fresh. That's the pyre, not the dead. Breathe through your sleeve if you like.",
      ],
      day: [
        "Daylight's when we stack and bless. Bones in the yard, salt on the bones, fire after.",
        "The Bone Yards are quiet by day. Quiet's not the same as still.",
      ],
      evening: [
        "Braziers lit. Keep inside the light after dusk. That's not a kindness, it's the rule.",
        "Evening. Something's walking on the High Loop. One of ours is watching it walk.",
      ],
      night: [
        "Night's our working hours. Stand behind me, or stand somewhere else.",
        "Hear that? Bones on cobbles. North end. Don't go alone.",
      ],
    },
    about: [
      "The Ashwardens. We hunt what he raises and what he calls up, and we burn what's left so it stays left. There were sixty of us. There are eleven.",
      "This was the city's charnel house before it was ours. The dead came here to be stacked. Now they come here to be finished.",
    ],
    ask: {
      bones: [
        "The Bone Yards are the city's old graves, all of them, terraced up the hill. He wakes them by the row. We put them down by the row. It's slow work on both sides.",
      ],
      rise: [
        "The Mages' Rise, above us. His sorcerers keep their lamps there. Every lamp lit up there is a grave opening down here. I've counted.",
      ],
      demons: [
        "His dead I can burn. His demons I can only send back where they came from, and that costs more than oil. You'll know one when you see it. Everybody does. It's the last thing they know.",
      ],
    },
    topics: { bones: 'The Bone Yards', rise: "The Mages' Rise", demons: 'Demons' },
    bye: [
      "Go on. Keep to lit streets. Come back warm.",
      "If something you killed gets up again, bring it here. In pieces is fine.",
    ],
    barks: {
      player: ["Hands where I can see them.", "Warm? Good."],
      morning: ["Two rows stirred.", "Salt the stack."],
      evening: ["Braziers lit!", "Inside the light."],
      magic: ["Good. Do that at the north end tonight.", "Fire's welcome here. Mind the oil."],
    },
  },
};

// ---------------------------------------------------------------- the quests
export const QUESTS = {
  // ---- the way in ----
  smoke_in_the_east: {
    title: 'Smoke in the East',
    giver: 'hasket',
    offer: [
      "You've been past the keep and come back. Then you can go further. East of Bellmourn, past the Sill, there's the city. Phobos. His. They say nobody living walks there.",
      "They're wrong. Some of the refugees we take in came out of it. They talk about a man in the Cinder Quarter who fed them. Lowe. Fennick Lowe. Go and find him. If he's real, we've a friend inside the wall.",
    ],
    accept: "I'll find him.",
    acceptLine: "In by the Drawbridge Gate. The Cinder Quarter's the burnt part, north of the King's Mile. Ask for the Pennyless. Don't ask loudly.",
    decline: 'Not into his city.',
    declineLine: "No. I'd not either. But someone should, and you're the one who comes back.",
    journal: [
      "Sergeant Hasket of Cinderford says a man in Phobos, the walled city east past the Sill, fed refugees who escaped it. Go into the city by the Drawbridge Gate.",
      "Find Fennick Lowe of the Pennyless, in a walled yard behind a burnt chandlery in the Cinder Quarter.",
    ],
    progress: [
      "The Drawbridge Gate. The Cinder Quarter. The Pennyless. Quietly.",
    ],
    done: [
      "Hasket? The sergeant at the ford? She's still holding it? ...Good. Good. Tell her the Pennyless send their love, and I mean that, which I don't usually.",
      "Here. Coin for the walk. It's his coin. It always is. You're welcome in this yard from now on. Most aren't.",
    ],
    after: [
      "Lowe's real, then. I've written it in the book. A friend inside his wall. First I've written in two years.",
    ],
    others: {
      ph_penny: ["From Cinderford? Off the street, then, quick. Anyone who walks that far to find me has something to say."],
    },
  },

  quiet_men: {
    title: 'Quiet Men',
    giver: 'hale',
    offer: [
      "When the city fell, not all of us rode out. Some stayed. Put down their arms, took up honest trades, and kept a promise in the dark. I've not heard from them in four years.",
      "There's a dye works on the Tanners' Steps, in Phobos. Ask for the captain. Tell her the oath still holds. Say nothing else, and say it to nobody else.",
    ],
    accept: 'I can carry that.',
    acceptLine: "The Tanners' Steps run down to the water at the city's south side. Follow the stink. And whatever you see in that yard, it's a dye works. Remember that.",
    decline: "That's not my promise.",
    declineLine: "No. It isn't. I'll find another way. There's never another way.",
    journal: [
      "Ser Hale Orrowick has a message for people who stayed behind in Phobos. Go to the Tanners' Steps, at the city's south side.",
      "Find the captain of the dye works on the Tanners' Steps, Maud Treller, and tell her the oath still holds.",
    ],
    progress: [
      "The Tanners' Steps. The dye works. The captain. Nothing else.",
    ],
    done: [
      "...It holds. Does it. Four years we've had nothing, and now a stranger walks in with madder on their boots and says it holds.",
      "Sit down. No. Stand, the dyers are watching. Take this, it's for your road. Tell him: fifteen. Tell him we're fifteen.",
    ],
    after: [
      "Fifteen. Still fifteen. I'd have taken five.",
    ],
    others: {
      ph_watch: ["A message? Not at the gate. By the vats, where the steam covers what's said."],
    },
  },

  wardens_of_ash: {
    title: 'Wardens of Ash',
    giver: 'garrick',
    offer: [
      "I hold Frostwatch. That's all I do: hold. The dead come to my wall and I knock them back, and they come again. There are people who don't hold. They hunt.",
      "The Ashwardens. In Phobos, in the old charnel house at the Bone Yards. Their warden's Edda Grail. I served with her. Go and tell her I'm still holding. She'll laugh. Let her.",
    ],
    accept: "I'll tell her.",
    acceptLine: "The Bone Yards are the north side of the city, terraced graves up the hill. The charnel house is on the High Loop. Follow the smoke.",
    decline: 'Not into the Bone Yards.',
    declineLine: "No. Sensible. She'd call you sensible, too, and mean it as an insult.",
    journal: [
      "Hew Garrick, Warden of Frostwatch, served with the warden of the Ashwardens, demon hunters in Phobos. Go to the Bone Yards, on the city's north side.",
      "Find Edda Grail in the Ashwardens' charnel yard on the High Loop, and tell her Garrick's still holding.",
    ],
    progress: [
      "The Bone Yards. The charnel house on the High Loop. Edda Grail.",
    ],
    done: [
      "Holding. Ha! He's still holding. Thirty years I've told him you can't hold, you have to go and get them. And he's still holding.",
      "Here. A warden's pay for a warden's message. And come back. I've work, and you've plainly the stomach for it.",
    ],
    after: [
      "She laughed? Good. She was always the one who laughed.",
    ],
    others: {
      ph_ash: ["Garrick? Hew Garrick? Out with it, then. Is he dead?"],
    },
  },

  // ---- the Pennyless ----
  cinder_floors: {
    title: 'The Cinder Floors',
    giver: 'ph_penny',
    offer: [
      "The burnt houses on Ash Lane. We used them for sleeping, before. Now something's come up through the floors. Four of them. They walk like people and they look like people and they aren't.",
      "My lads won't go back in. I don't blame them. You've a stronger stomach. Clear them out and the cellars are ours again.",
    ],
    accept: "I'll clear them.",
    acceptLine: "North-east of here, down Ash Lane, where the roofs are gone. You'll smell the tallow. Don't let them talk to you.",
    decline: 'Not today.',
    declineLine: "No. Then forty people sleep in the street another night. They're used to it. That's the worst of it.",
    journal: [
      "Things that look like people have come up through the floors of the burnt houses on Ash Lane, in the Cinder Quarter. Put down four of them.",
      "Go back to Fennick Lowe in the Pennyless' yard.",
    ],
    progress: [
      "Ash Lane. The burnt houses. Four.",
    ],
    done: [
      "Gone? All four? ...Right. Lads! Blankets, the lot, down to the Lane. Tonight.",
      "That's from the purse. Don't look at me like that, the purse can afford it. He's paying.",
    ],
    after: [
      "Forty in out of the rain last night. They asked who did it. I said a stranger. They liked that better than a name.",
    ],
  },

  loaves_for_the_rookeries: {
    title: 'Loaves for the Rookeries',
    heard: {
      'ph:rookeries': "A woman takes two loaves without a word and is gone up a ladder. A boy follows her, and doesn't look back.",
      'ph:barbican': "A man in a patched gambeson takes one, hides it in his coat, and says \"Tell Lowe the gate's changing its watch at dusk.\"",
    },
    giver: 'ph_penny',
    offer: [
      "Forty loaves go out of this yard every morning. My lads take them down the Cinder cellars. The Rookeries and the lanes by the Barbican, they can't: the Loyal know their faces.",
      "They don't know yours. Take a sack round the Rookeries, then down by the Barbican. Hand them out, don't stop to be thanked, and come back by a different street.",
    ],
    accept: "I'll take the bread round.",
    acceptLine: "The Rookeries are west of here, the tall slums. The Barbican's just inside the Drawbridge Gate. Hand them to whoever's thinnest. You'll know.",
    decline: 'Not today.',
    declineLine: "Then the Rookeries go without till tomorrow. They're good at it. They've had practice.",
    journal: [
      "Fennick Lowe can't send his own people to the Rookeries or the Barbican with bread: the Loyal know their faces. Take a sack round both.",
      "Go back to Fennick Lowe in the Pennyless' yard.",
    ],
    progress: [
      "The Rookeries, then the Barbican. Hand it out. Don't stop.",
    ],
    done: [
      "Nobody followed you? Good. Then the Rookeries ate tonight, and nobody's going to burn a house for it.",
      "Here. For your feet. And if a child in the Rookeries asks you your name, give them a different one. Everyone does.",
    ],
    after: [
      "A girl from the Rookeries came to the gate this morning asking for the stranger with the bread. I said you were a rumour.",
    ],
  },

  red_purses: {
    title: 'Red Purses',
    giver: 'ph_penny',
    needs: 'cinder_floors',
    offer: [
      "Once a month his lancers ride through the Cinder Quarter collecting. Tithe, they call it. Everyone pays or the house burns. You've seen the houses.",
      "They muster at the Barracks Ward before they ride. Kill four of them before collection day and there's no collection. The Quarter keeps a month's bread.",
    ],
    accept: "Four lancers. Done.",
    acceptLine: "The Barracks Ward, east of the market, behind the long walls. They drill in the yard. They'll see you coming. Let them.",
    decline: "That's a lot of lancers.",
    declineLine: "It is. That's why I asked you and not my lads.",
    journal: [
      "Velscour's lancers ride out of the Barracks Ward each month to take the Cinder Quarter's tithe. Put down four of them.",
      "Go back to Fennick Lowe in the Pennyless' yard.",
    ],
    progress: [
      "The Barracks Ward. Four lancers. Before collection day.",
    ],
    done: [
      "No collection! The whole Quarter's out on the Lane wondering why nobody came. I'm not telling them. Let them wonder.",
      "Here. That's what four lancers carry in their purses. Some of it, anyway. The rest's already gone down the cellars.",
    ],
    after: [
      "They'll come again next month, with more. But this month's bread is this month's bread.",
    ],
  },

  the_pennyless_word: {
    title: "The Pennyless' Word",
    giver: 'ph_penny',
    offer: [
      "There's a dye works on the Tanners' Steps. Captain Treller. She did me a turn last winter: hid six of mine in a vat of weld while the Loyal searched the street. Came out yellow. Alive, though.",
      "I owe her. Go and tell her the Pennyless pay their debts, and ask what she needs. And don't stare at the dyers. They don't like being looked at, and they're very good at noticing.",
    ],
    accept: "I'll take the word.",
    acceptLine: "South, down to the water. The Tanners' Steps. Follow the smell and the coloured cloth.",
    decline: 'Not now.',
    declineLine: "No hurry. Debts keep. Mine do, anyway.",
    journal: [
      "Fennick Lowe owes the dye works on the Tanners' Steps a favour. Take his word to Captain Maud Treller there.",
    ],
    progress: [
      "The Tanners' Steps. Captain Treller. The Pennyless pay their debts.",
    ],
    done: [
      "Lowe sent you? Ha. Six yellow thieves. I still see them about. They've never quite washed out.",
      "Tell him it's paid if he lends us eyes on the Wharf. Boats go under there and don't come up, and none of his go near it. Here. For your feet.",
    ],
    after: [
      "Treller said it's paid? Then it isn't. She always says that.",
    ],
    others: {
      ph_watch: ["From Lowe? Say it low. The dyers have ears, and most of them are mine."],
    },
  },

  // ---- the Quiet Watch ----
  asking_around: {
    title: 'Asking Around',
    heard: {
      'ph:wharf': "Overheard on the Wharf: \"Third boat this month. Went under the old quay. The rope came back chewed.\"",
      'ph:market': "Overheard in the Chainmarket: \"Patrols? Doubled. And not one of them goes down to the Wharf. Not one.\"",
      'ph:rookeries': "Overheard in the Rookeries: \"Something's feeding under the Wharf. His lot know. They walk round it.\"",
    },
    giver: 'ph_watch',
    offer: [
      "Something's changed in the city. His patrols have doubled and nobody's said why. I can't send my dyers asking: dyers don't ask.",
      "You can. Walk the Drowned Wharf, the Chainmarket and the Rookeries. Stand about, buy something, listen. Then come and tell me what the city's saying.",
    ],
    accept: "I'll go and listen.",
    acceptLine: "The Wharf's just north of here, along the Slough. The Chainmarket's in the middle, where the Mile crosses. The Rookeries are west, the tall slums. Don't ask; listen.",
    decline: 'Not now.',
    declineLine: "Then we keep dyeing, and keep not knowing. It's what we're best at.",
    journal: [
      "Captain Treller wants to know why Velscour's patrols have doubled. Walk the Drowned Wharf, the Chainmarket and the Rookeries, and listen.",
      "Go back to Captain Treller at the dye works on the Tanners' Steps.",
    ],
    progress: [
      "The Wharf, the Chainmarket, the Rookeries. Listen.",
    ],
    done: [
      "Chewed rope, and patrols that walk round it. Something's feeding under the Wharf, and his lot stand back from it. So it's his, or he's afraid of it.",
      "Either way, it's work. Here. For listening. It's rarer than you'd think.",
    ],
    after: [
      "I've the dyers watching the Wharf now. They hate it. The water ruins the colour.",
    ],
  },

  the_wharf_web: {
    title: 'The Wharf Web',
    giver: 'ph_watch',
    offer: [
      "Under the Drowned Wharf, where the Slough goes into the dark, something's made a nest. Boatmen go down and don't come up. His patrols won't go near it, which tells me it's not on his leash.",
      "Kill it. And whatever's with it. Then the Wharf's open to the boats again, and boats carry more than fish.",
    ],
    accept: "I'll go down.",
    acceptLine: "North along the Slough, where the old quays drop into the water. Go at low light. It likes the dark, and so should you.",
    decline: 'Not under the water.',
    declineLine: "No. I wouldn't either. That's why it's still there.",
    journal: [
      "Something has nested under the Drowned Wharf, where the Slough runs into the dark. Put it down, and the two with it.",
      "Go back to Captain Treller at the dye works on the Tanners' Steps.",
    ],
    progress: [
      "Under the Wharf. Three of them. The big one at the back.",
    ],
    done: [
      "Dead? The boatmen'll be on the water by morning. And on the water, a boat can carry fifteen dyers anywhere in the city without anyone looking twice.",
      "Here. You've opened a road. The best sort: one nobody knows is a road.",
    ],
    after: [
      "Two boats on the Slough last night. One of them was ours. Nobody looked twice.",
    ],
  },

  the_approach_by_night: {
    title: 'The Approach by Night',
    giver: 'ph_watch',
    needs: 'the_wharf_web',
    offer: [
      "The Castle Approach. The road up to his gate. Nobody of ours has been up it in four years and come down. I need to know what's on it at night: how many, where they stand, when they change.",
      "Go up after dark. Look. Don't fight unless you have to. Come down. I know how that sounds.",
    ],
    accept: "After dark. Up and down.",
    acceptLine: "East up the King's Mile, past the Barracks, to where it climbs. Count everything. Remember everything. Come back.",
    decline: 'Not up there.',
    declineLine: "No. Nor would I, and I've sworn to. Keep your answer; it's an honest one.",
    dayHint: "The Approach by day tells you nothing: his watch changes after dark. Come back at night.",
    journal: [
      "Captain Treller needs to know what holds the Castle Approach at night. Go up it after dark.",
      "Go back to Captain Treller at the dye works on the Tanners' Steps.",
    ],
    progress: [
      "The Castle Approach. After dark. Count, and come back.",
    ],
    done: [
      "You went up. You came down. ...Sit. Tell me all of it, and slowly. Lamp by lamp.",
      "That's worth more than anything in this yard. Take this. And the next time anyone asks you what's on the Approach, you don't know.",
    ],
    after: [
      "I've drawn it all on cloth and dyed it over. You'd never know. That's the point.",
    ],
  },

  the_watchs_word: {
    title: "The Watch's Word",
    giver: 'ph_watch',
    offer: [
      "The Ashwardens, in the charnel yard at the Bone Yards. Edda Grail's people. They hunt his things in the open, which is brave and loud and gets them killed.",
      "We could help each other. Go and ask Grail what she needs. Not from the dyers: from a friend. She'll know what I mean.",
    ],
    accept: "I'll ask her.",
    acceptLine: "North, across the city, to the Bone Yards. The charnel house is on the High Loop. You'll see the smoke.",
    decline: 'Not now.',
    declineLine: "No. Another day. They'll still be fighting. They always are.",
    journal: [
      "Captain Treller wants to know what the Ashwardens need. Ask Edda Grail in their charnel yard at the Bone Yards.",
    ],
    progress: [
      "The Bone Yards. Edda Grail. From a friend.",
    ],
    done: [
      "The dyers ask what we need? ...Oil. Salt. Eyes on the Mages' Rise. And that's from a friend, too. Tell her.",
      "Here. And tell Treller the dyeing's very convincing. I nearly believed it myself.",
    ],
    after: [
      "Grail said that? ...She's not wrong. She's never wrong, which is why she's so tiring.",
    ],
    others: {
      ph_ash: ["From the dyers? Treller never sends anyone. Go on, then."],
    },
  },

  // ---- the Ashwardens ----
  still_the_rows: {
    title: 'Still the Rows',
    giver: 'ph_ash',
    offer: [
      "The north rows, by the city wall. The oldest graves in Phobos. He woke them last week, all at once, and something big woke with them. We lost two holding the line.",
      "Put down five of what's up there. The big ones first, if you can. Then we can go in after and salt the rest.",
    ],
    accept: "Five. The big ones first.",
    acceptLine: "North-west of here, against the city wall, where the stones are tallest. You'll hear them before you see them.",
    decline: 'Not yet.',
    declineLine: "Then we hold the line one more night with nine. We've done it with fewer.",
    journal: [
      "Velscour has woken the oldest graves in Phobos, in the Bone Yards' north rows by the city wall. Put down five of them.",
      "Go back to Edda Grail in the Ashwardens' charnel yard.",
    ],
    progress: [
      "The north rows, by the wall. Five. The big ones first.",
    ],
    done: [
      "Still? All of them? ...Wardens! Salt and oil, to the north rows. Now, before he wakes them again.",
      "Here. And come and watch them burn tonight, if you like. Nobody should do that kind of work and not see it finished.",
    ],
    after: [
      "We burned the north rows to the stone. He'll have to dig deeper next time.",
    ],
  },

  bone_tithe: {
    title: 'The Bone Tithe',
    giver: 'ph_ash',
    offer: [
      "Everything he raises was somebody. We can't give them back their names. We can give them a proper end: stacked, salted, blessed and burned.",
      "The north rows you stilled: what's left of them is lying out by the city wall. Bring me twelve bones from there. They go on the stack in the yard, and they don't get up again.",
    ],
    accept: "Twelve. I'll bring them.",
    acceptLine: "The north rows, against the city wall, where you put them down. Bring them here. We'll do the rest.",
    decline: 'Not now.',
    declineLine: "No. The dead are patient. Too patient, here.",
    journal: [
      "Bring twelve bones from the Bone Yards' north rows to Edda Grail at the Ashwardens' charnel yard, to be stacked, blessed and burned for good.",
    ],
    progress: [
      "Twelve bones from the north rows. They won't get up off our stack.",
    ],
    done: [
      "Twelve. On the stack with them. ...There. Say a word if you've got one. No? I'll say it.",
      "Here. It's not payment for bones. It's payment for carrying them. Nobody likes carrying them.",
    ],
    after: [
      "That stack burned clean. Not one of them twitched. That's how it should be.",
    ],
  },

  lamps_on_the_rise: {
    title: 'Lamps on the Rise',
    giver: 'ph_ash',
    needs: 'still_the_rows',
    offer: [
      "The Mages' Rise, above the Bone Yards. His sorcerers. Every lamp they light up there is a row of graves opening down here. I've watched it, night after night. One goes on, a row stirs.",
      "There's one up there who lights more than the rest. A lord of them. Put him out, and the two that tend his lamps. Then the Yards sleep.",
    ],
    accept: "I'll put out his lamps.",
    acceptLine: "East and up, past the Bone Yards, to the towers on the Rise. His is the one with the green light. Go fast. He doesn't need to see you to wake things.",
    decline: 'Not a lord of them.',
    declineLine: "No. Not yet. Get stronger, and come back. He'll still be lighting lamps.",
    journal: [
      "A sorcerer lord on the Mages' Rise wakes the Bone Yards' graves with his lamps. Put him down, and the two who tend them.",
      "Go back to Edda Grail at the Ashwardens' charnel yard.",
    ],
    progress: [
      "The Mages' Rise. The green light. Three.",
    ],
    done: [
      "The green lamp's dark. I watched it go out from the yard. Every row in the Yards went still at once. I've never heard that quiet.",
      "Take this. We call it the Warden's Ember. It was a warden's, before she fell. It knows what to do with things like him. So do you, now.",
    ],
    after: [
      "The Rise is dark on the north side. He'll send another lord. We'll be ready. You made us ready.",
    ],
  },
};

Object.assign(LINES, SEWER_LINES, CASTLE_LINES);
Object.assign(QUESTS, SEWER_QUESTS, CASTLE_QUESTS);
