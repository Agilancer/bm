// The people in Castle Velscour's wards (src/core/delve-castle.js), what they say, and the words of their quests (their
// workings: src/folk/phobos-quests.js). Taken into src/folk/lines/phobos-hubs.js's LINES and QUESTS. As src/folk/lines/land.js.
// The Librarian and his household, in his rooms off the Ancient Library in the Middle Ward. All five are loyal to Tessariel,
// and nothing of it shows or is said (the V and T rule): no name of whom they serve, no oath, no mark, no bells. They keep
// his books, his maps, his horns and his stores, and they're very good at it, and that's all anyone in the castle sees.
//   Master Aldric Pell, the Librarian: old, courtly, dry, and a great deal stronger than he lets anyone see; the castle sees
//     a harmless old man who knows where every book is, because that's the face he's spent forty years keeping up.
//   Wynn Pell, his ward: the castle's map-maker. Quick, sharp, ink to the wrists; draws everything; says what she thinks.
//   Ondine, once a sister of his Sanctuaries: she sang at his feasts until she saw what was carried in to them. Quiet, exact.
//   Jory Tallis, once quartermaster of the Armoury: counts everything, still has every key he ever held, and copies.
//   Pip Carrow, the horn-blower of the Galleries: twelve, loud, fearless, and the only one of them who lies badly.

export const LINES = {
  ph_librarian: {
    first: [
      "Ah. You'll be the one who killed the Gate Captain. Come in, come in, and mind the cases: they're older than the castle. Aldric Pell. I keep the library. Or it keeps me. At my age it's hard to say which.",
    ],
    greet: {
      morning: [
        "Good morning. The light comes down the oculus for an hour. I read in it. One more page, I always say. It's been forty years of one more page.",
        "You're early. So am I. The archivists don't wake till noon, and I like the stacks without them.",
      ],
      day: [
        "Every book in this library is his, and every book in it was somebody else's first. He doesn't read them. He just likes to own the shelves.",
        "Sit, if you can find a chair that isn't holding a book. No, not that one. That one's holding a war.",
      ],
      evening: [
        "Evening. The court eats in the Great Hall about now. Listen. ...No. Better not to listen.",
        "The candles go on in the stacks at dusk. Someone has to light them. Someone always has.",
      ],
      night: [
        "Can't sleep either? This is the best hour in a library. Nobody wants anything of you but the books.",
        "Speak softly. Sound carries up the oculus, and there are people on the roof who are paid to hear it.",
      ],
    },
    about: [
      "Forty years I've kept this library. Before me, my master. Before him, his. Lords come and go; somebody has to know where everything was put.",
      "What do I do? I find things. A treaty, a recipe, the name of a man's grandfather. You'd be astonished what a lord will give the old fool who can find him the right page.",
    ],
    ask: {
      household: [
        "Wynn's my ward: she draws the castle. Jory kept the Armoury, and still has the keys, which nobody has noticed. Ondine sang in the Sanctuaries and doesn't any more. Pip blows the horns. We're a household. We look after each other. That's all we are.",
      ],
      castle: [
        "Three wards, stepping up the crag, and his Keep on top of them all. You're in the middle one. Above us is the High Ward, and the only stair up to it from here is in the Long Stacks, and it's locked. The key isn't anywhere in this ward. I've looked. For years.",
      ],
      library: [
        "Most of it's his. Some of it's older than him. A little of it is older than anyone remembers, and those books I keep on the high shelves, and I don't lend.",
      ],
    },
    topics: { household: 'The household', castle: 'The castle', library: 'The library' },
    bye: [
      "Go carefully. If anyone asks, you came to me for a book on drains.",
    ],
  },

  ph_wynn: {
    first: [
      "Don't step on that. Or that. That's the Horn Galleries, you're standing on the Horn Galleries. ...Fine. I'll draw them again. Wynn. I'm his ward. I draw the castle, every room of it, so I know where I am, which is more than he does.",
    ],
    greet: {
      morning: [
        "Morning. I've been up since four. The Clock Tower's off by eleven minutes and I wanted to see if it's getting worse. It is.",
        "You've got ink on you. No, that's mine. It gets on everyone. Sorry.",
      ],
      day: [
        "Every map of this castle is wrong. Mine are less wrong. That's the most anyone can say about a map.",
        "There's a door in the Portrait Gallery that isn't on any plan. There's a portrait in front of it. I'm the only one who knows. Well. Me and whoever hung the portrait.",
      ],
      evening: [
        "The lamps are lit in the court. You can see the whole ward from the wall-walk, if the knights let you up. They don't let me up.",
        "Evening. I'm inking. Talk if you like; I can listen and ink. I can't listen and draw.",
      ],
      night: [
        "Things move about at night here. Not people. Rooms, I mean. A door that was there in the day isn't. I'm writing it all down.",
        "Can't sleep? I measure corridors when I can't sleep. In paces. It's very calming.",
      ],
    },
    about: [
      "He found me in the stacks when I was six, drawing on the backs of his books. He said if I was going to draw on things I'd better draw something useful. So I drew the castle. I'm still drawing it.",
      "Map-maker to the household. Which means I know three ways out of every room, and I've never told anyone but him. Until now. Don't make me sorry.",
    ],
    ask: {
      maps: [
        "Every wing has two ways in, if you look. His builders liked a back door. So do I.",
      ],
      door: [
        "The painting in the Gallery's west wall, halfway along. It swings. Behind it there's a passage straight through to the Alchemists' Wing. The servants used it before there were servants. I don't know who before that.",
      ],
    },
    topics: { maps: 'The maps', door: 'The painted door' },
    bye: [
      "Go on. If you find a room I haven't got, come and tell me. I mean it.",
    ],
  },

  ph_ondine: {
    first: [
      "You're quieter than the last one. The last one was a knight of his, looking for a book of hymns. I gave him one. I wrote it. ...Ondine. I was a sister of his Sanctuaries, once. I'm not now.",
    ],
    greet: {
      morning: [
        "Morning. I don't sing any more, so I get up with the light instead. It's quieter. It doesn't need me.",
        "You've slept. Good. Not everyone here does.",
      ],
      day: [
        "The household eats here, not in the Hall. You'll know why if you ever see what's carried into the Hall.",
        "Sit. Tea? It's only tea. Nothing in this room is anything other than what it looks like. Almost nothing.",
      ],
      evening: [
        "That's the Hall's horns. The court's sitting down to eat. I used to sing for them. Every night, for eleven years.",
        "Evening. Stay here till the Hall's quiet. There's no need to walk past it while they're at table.",
      ],
      night: [
        "The Feast walks at night, when the tables are cleared. You can hear him in the screens passage, looking for more. Stay in.",
        "Can't sleep. No. I don't either, much.",
      ],
    },
    about: [
      "I sang in his Sanctuaries from when I was a girl. Then they put me to sing at the feasts in the Great Hall. I saw what the servers carried in. I stopped singing. Master Pell took me in, and told the castle I'd lost my voice. I let them believe it.",
      "I keep the household's linen and its medicines and its secrets. The first two are a lot of work.",
    ],
    ask: {
      feast: [
        "He was a man once. A steward, a glutton, a favourite. He ate at the high table every night for a hundred years and never once got up from it hungry. Then one night he got up, and he hasn't sat down since.",
      ],
      sanctuaries: [
        "Up in the High Ward. Black, and very beautiful, and nothing in them is kind. That's all I'll say about them.",
      ],
    },
    topics: { feast: 'The Feast', sanctuaries: 'The Sanctuaries' },
    bye: [
      "Go well. Eat before you go up to the Hall. Never go into that room hungry.",
    ],
  },

  ph_jory: {
    first: [
      "Name? ...No, I don't need it, I just like to write it down. Old habit. Jory Tallis. Quartermaster of the Armoury, thirty-one years. Retired, now. They retired me. They forgot to ask for the keys.",
    ],
    greet: {
      morning: [
        "Morning. Two hundred and twelve spears in the Armoury, last I counted. That was yesterday. Somebody's taken three.",
        "Up and about? Good. Nothing gets counted lying down.",
      ],
      day: [
        "Every key in this castle passed through my hands at one time or another. I copied the useful ones. A quartermaster who can't open a door isn't worth his salt.",
        "You want something kept, you bring it to me. I'll keep it so well even I won't find it.",
      ],
      evening: [
        "Evening. The garrison changes about now. Different men, same boots. I issued the boots.",
        "Sit. My knees are telling me there's weather coming. My knees are wrong more often than the almanac, but less often than the General.",
      ],
      night: [
        "Can't sleep? Count something. I count the keys. Ninety-four. Always ninety-four.",
        "Night. Keep your voice down; the Horn Walk carries.",
      ],
    },
    about: [
      "Thirty-one years in the Armoury, under four masters. I armed his whole garrison, man by man. I know every buckle on every one of them. That's useful, if you're the sort of person who wants to know where a buckle's weak.",
      "Retired. Which means the castle stopped paying me, and I stopped telling it things. Fair's fair.",
    ],
    ask: {
      armoury: [
        "Down in the Lower Ward, up its stair off the Drill Floor. Racks and racks. And not one man down there knows what's in the third rack on the left, because I never wrote it down.",
      ],
      keys: [
        "Ninety-four keys. Not one of them opens the stair to the High Ward. That one was never issued to anybody. Whoever has it got it from somewhere else.",
      ],
    },
    topics: { armoury: 'The Armoury', keys: 'The keys' },
    bye: [
      "Off you go. Bring back anything you borrow. I'll know.",
    ],
  },

  ph_pip: {
    first: [
      "Are you the one who killed the Gate Captain? Are you? Everyone's talking about it. Not out loud. I'm Pip. I blow the horns. The big ones, in the Galleries. Well. I'm meant to.",
    ],
    greet: {
      morning: [
        "Morning! I've already been up the Galleries. The hornwings were asleep. I didn't wake them. Probably.",
        "I'm not meant to be in here, I'm meant to be at my horns. Don't tell. Master Pell knows. He doesn't count.",
      ],
      day: [
        "Every horn in the Galleries means something different. One's for the guard changing. One's for the gate. One's for 'everyone hide'. I'm not telling you which. That's the job.",
        "Did you see the Feast? Did you? Was he big? I bet he's not as big as they say.",
      ],
      evening: [
        "That was me, the horn for the Hall. I did it from here, I've got a little one. Nobody knows. Don't tell.",
        "Evening! Are you going up to the Galleries? Can I come? ...No. Fine.",
      ],
      night: [
        "I'm supposed to be in bed. So are you, probably.",
        "At night the hornwings come down off the horns and walk about on the floor. I've seen them. They walk like chickens.",
      ],
    },
    about: [
      "My dad blew the horns before me, and his dad. Then Dad was gone, and they needed someone with the wind for it, and I've got the most wind of anybody. Ondine says so. She says it's not always a compliment.",
      "I live with Master Pell and everybody. It's all right. Wynn draws me in her maps sometimes, as a little dot.",
    ],
    ask: {
      horns: [
        "If you sound the right horn, the patrols change. The knights go where the horn tells them. Even if it's a boy blowing it. Especially then. They don't know it's a boy.",
      ],
    },
    topics: { horns: 'The horns' },
    bye: [
      "Bye! Kill something big!",
    ],
  },
};

export const QUESTS = {
  // ---- Princess Apricot's last: a bottle down her Aqueduct ----
  the_librarians_letters: {
    title: "A Letter Down the Aqueduct",
    giver: 'apricot',
    needs: 'the_gate_captain',
    offer: [
      "Something came down the Aqueduct the day after you went up. A bottle, stoppered with wax, with a letter in it. Addressed, if you please, to whoever killed the Gate Captain.",
      "It says a gentleman in the castle's library would be glad of a word. Up through the Middle Ward Gate, now there's nobody to keep it down. It's beautifully written. I don't trust beautiful handwriting. Will you go anyway?",
    ],
    accept: "I'll go up and find him.",
    acceptLine: "Up the Aqueduct, through the Lower Ward, up the Middle Ward Stair off the East Range, and through the gate. The library's at the head of the Portrait Gallery, north off the court. Don't stop in the Great Hall. Whatever's in there.",
    decline: "Not on the strength of a letter in a bottle.",
    declineLine: "No. Quite right. Though I notice you didn't say no to the bottle.",
    journal: [
      "A letter came down the Aqueduct to Princess Apricot, for whoever killed the Gate Captain: a gentleman in the castle's library would be glad of a word. Go up through the Middle Ward Gate into the Middle Ward.",
      "Find the gentleman who keeps the library: up the Portrait Gallery, north off the Middle Court.",
    ],
    progress: [
      "The Middle Ward Gate, off the Lower Ward's East Range. Then the library, at the head of the Portrait Gallery.",
    ],
    others: {
      ph_librarian: ["The princess sent you? Then the bottle reached her. Thank her for me. Tell her the hand is my ward's: I can't write that well any more. Sit down. We have a great deal to talk about, and none of it out loud."],
    },
    done: [
      "Aldric Pell. You'll find him in his rooms off the library, with his household. Four of them. He'll have work for you.",
      "And thank the princess for me, when you're next down. The bottle was my ward's idea. She's very good at ideas. They're always a little wet.",
    ],
    after: [
      "He writes to me now. Every week, down the Aqueduct. Martleboro fishes the bottles out. He's very proud of that.",
    ],
  },

  // ---- the Librarian's ----
  the_household: {
    title: 'The Household',
    giver: 'ph_librarian',
    needs: 'the_librarians_letters',
    offer: [
      "There are four others in these rooms, and every one of them will want something of you. Better you meet them on my word than on theirs.",
      "Wynn, my ward, who draws the castle. Jory, who kept the Armoury. Ondine, who sang in his Sanctuaries. And Pip, who blows the horns, when he's at them. Go and say good evening to each of them.",
    ],
    accept: "I'll meet them.",
    acceptLine: "They're all about these rooms somewhere. Pip may be hiding. Pip is usually hiding.",
    decline: 'Later.',
    declineLine: "As you like. They'll find you, sooner or later. Pip especially.",
    journal: [
      "The Librarian keeps a household of four in his rooms off the Ancient Library. Meet Wynn Pell, his ward.",
      "Meet Jory Tallis, once quartermaster of the Armoury.",
      "Meet Ondine, once a sister of his Sanctuaries.",
      "Meet Pip Carrow, the horn-blower.",
      "Go back to Master Aldric Pell.",
    ],
    progress: [
      "Wynn, Jory, Ondine and Pip, about his rooms.",
    ],
    others: {
      ph_wynn: ["He sent you to me first? Good. He always sends the interesting ones to me first. I've got a map that wants walking. Come back when you've met the others."],
      ph_jory: ["Did he. Well, I do. Ninety-four of them. Stand still while I write you down. ...There. Now you're on the list. Everybody worth anything is on the list."],
      ph_ondine: ["Good evening. ...You've come from the Hall end? No. Good. Sit with us a while, when you've met Pip. He'll talk your ear off."],
      ph_pip: ["I wasn't hiding! I was being quiet. It's different. Are you really the one who killed the Gate Captain? Will you help me with my horns?"],
    },
    done: [
      "There. Now you know us, and we know you, and none of us will ever say so to anyone else. That's what a household is, in this castle.",
      "Take this for your trouble. Pip didn't bite, I hope. He's been known to.",
    ],
    after: [
      "Pip asks after you every day. Every single day. I've told him you're busy. He says busy doing what. I've told him to ask you.",
    ],
  },
  dust_in_the_stacks: {
    title: 'Dust in the Stacks',
    giver: 'ph_librarian',
    needs: 'the_librarians_letters',
    offer: [
      "His archivists keep the Long Stacks, past the reading room. They don't read. They don't let anyone else read. And lately they've been coming into my reading room to see who does.",
      "Clear the ward of a few of them, and of whatever else walks it: the sitters out of the Gallery's frames, the things in the Conservatory. Ten will do. The ward will notice ten. It won't notice who.",
    ],
    accept: "Ten of them. I'll see to it.",
    acceptLine: "The Long Stacks, past my reading room. The Gallery, where the sitters get down out of their frames. The Conservatory, down the Reading Walk. Anywhere in the ward will do. Don't come back through the Great Hall.",
    decline: 'Not yet.',
    declineLine: "No. They'll keep. They're very good at keeping. It's the one thing they're good at.",
    journal: [
      "His archivists have been coming into the Librarian's reading room to see who reads there. Put down ten of whatever walks the Middle Ward.",
      "Go back to Master Aldric Pell in his rooms off the Ancient Library.",
    ],
    progress: [
      "Ten of them, anywhere in the ward. Not in the Great Hall.",
    ],
    done: [
      "Quieter already. I heard one of them drop a book in the Stacks just now, and nobody came running. Thank you.",
      "Take this. Gold is the only thing in this castle that nobody looks at twice.",
    ],
    after: [
      "The archivists keep to the Stacks now. One looked in yesterday, saw me, and left. I almost felt sorry for it.",
    ],
  },

  // ---- Wynn's ----
  wynns_map: {
    title: "Wynn's Map",
    giver: 'ph_wynn',
    needs: 'the_household',
    offer: [
      "I've got four rooms I can't finish. The Gallery, the Horn Galleries, the Alchemists' Wing, the Conservatory. Every time I go to pace them out, something's in them that wants to eat me.",
      "You go. Just walk them, end to end. I'll know from how long you were gone how long they are. ...I'm joking. Mostly. Come back and tell me what's in them.",
    ],
    accept: "I'll walk them for you.",
    acceptLine: "The Gallery's north off the court. The Horn Galleries are up from the Map Room, off the Gallery's east side. The Alchemists' Wing is down the Reading Walk from the library, and the Conservatory past it. Or through the painted door, if you can find it.",
    decline: "Not now.",
    declineLine: "Fine. They'll still be wrong tomorrow.",
    journal: [
      "Wynn Pell, the Librarian's ward, can't finish her map of four rooms of the Middle Ward. Walk the Portrait Gallery, the Horn Galleries, the Alchemists' Wing and the Conservatory.",
      "Go back to Wynn Pell in the Librarian's rooms.",
    ],
    progress: [
      "The Portrait Gallery, the Horn Galleries, the Alchemists' Wing and the Conservatory.",
    ],
    done: [
      "The Conservatory's twelve paces longer than the plans say. I knew it. I knew it. Somebody's moved a wall. Somebody's always moving a wall.",
      "Here. A copy of the ward, the parts I trust. Don't let anyone see it. I mean anyone.",
    ],
    after: [
      "I've drawn you on the map. As a little dot. Like Pip. You're the dot by the Conservatory.",
    ],
  },

  // ---- Jory's ----
  the_quiet_watchs_steel: {
    title: "The Quiet Watch's Steel",
    giver: 'ph_jory',
    needs: 'the_household',
    offer: [
      "There's a dye works on the Tanners' Steps, down in the city. The captain there and I have an understanding. She needs steel. The Armoury has steel. Nobody in the Armoury knows how much.",
      "Go down to the Lower Ward. Walk the Armoury and the Forge, so I know they're clear and what's in them. Then go into the city and tell the captain of the dye works the third rack on the left is hers. She'll know what that means.",
    ],
    accept: "The Armoury, the Forge, and the dye works.",
    acceptLine: "The Armoury's up its stair off the Drill Floor, the Forge along the Coal Way from it. Then down out of the castle, into the city, to the Tanners' Steps. Maud Treller. Say the third rack on the left. Say nothing else.",
    decline: "Not now.",
    declineLine: "Suit yourself. The rack's not going anywhere. That's rather the point of a rack.",
    journal: [
      "Jory Tallis, once quartermaster of the Armoury, wants the Quiet Watch armed out of it. Walk the Armoury and the Forge in the Lower Ward.",
      "Go down into the city, to the dye works on the Tanners' Steps, and tell Maud Treller the third rack on the left is hers.",
    ],
    progress: [
      "The Armoury and the Forge, in the Lower Ward. Then the dye works on the Tanners' Steps.",
    ],
    others: {
      ph_watch: ["The third rack on the left. ...Jory. The old devil. Thirty spears and a dozen good blades, and not a man in that Armoury who'll miss them. Tell him we'll come for them on the first dark night. Don't tell him thank you; he hates it."],
    },
    done: [
      "Thirty spears and a dozen good blades, out of the Armoury and into the right hands, and not a man in it who'll miss them. I've done that, in my time.",
      "Here's your share. Don't argue. A quartermaster always pays the carrier. It's the only way anything ever gets carried.",
    ],
    after: [
      "Twenty-eight spears in the third rack on the left. Two went to the Quiet Watch's friends in the Bone Yards. I'm told. I don't count them any more. I don't need to.",
    ],
  },

  // ---- Maud Treller's, of the Quiet Watch ----
  the_iron_muster: {
    title: 'The Iron Muster',
    giver: 'ph_watch',
    needs: 'the_gate_captain',
    offer: [
      "The Gate Captain's dead. Good. But he was the door, not the house. Under his yard there's a stair down to where the garrison musters: the Iron Barracks. Kennels, stores, cells, and the Iron Marshal over all of it.",
      "Every patrol that walks this city in red comes up out of that stair. Break the Marshal and his muster, and the Watch breathes easier for a season. Take friends. Take the Free Company if you can pay them.",
    ],
    accept: "I'll go down the Muster Stair.",
    acceptLine: "The barracks' door is on the south side of the castle yard, past the Lower Ward's. Mind his hounds, mind his powder, and when he plants his standard, cut it down.",
    decline: "Not yet.",
    declineLine: "Not yet. They'll be mustering tomorrow, and the day after. They always are.",
    journal: [
      "Under the castle yard, the Iron Barracks: Maud Treller of the Quiet Watch wants the Iron Marshal dead. Its door is on the south side of the yard.",
      "Break the Iron Marshal in his hall. The Kennelmaster and the Quartermaster keep its doors.",
      "Go back to Maud Treller of the Quiet Watch.",
    ],
    progress: [
      "Down the Muster Stair, into the Iron Barracks.",
      "The Iron Marshal, in the Iron Hall.",
    ],
    done: [
      "The Marshal's dead? Then the muster's broken, and his patrols will be thin on the Mile for weeks. You've given this city a breath it hasn't had in years.",
      "Here. It's his muster-roll, every name down there. Half of them are struck through now, by you. Keep it. A reminder of what one person can do.",
    ],
    after: [
      "Fewer red cloaks on the Mile. Not none. Fewer. That's how it goes here: fewer, and then fewer, and one day none.",
    ],
  },

  // ---- Pip's ----
  the_hornwings: {
    title: 'The Hornwings',
    giver: 'ph_pip',
    needs: 'the_household',
    offer: [
      "The hornwings roost on my horns. Right on them. In their mouths. I can't sound a horn with a hornwing in it, it just goes HONK and the hornwing comes out angry.",
      "Can you get them off? Four of them, in the Horn Galleries. Then I can sound the patrols again and nobody will know it was a boy. Please?",
    ],
    accept: "I'll clear your horns.",
    acceptLine: "The Horn Galleries, up from the Map Room. Or along the Horn Walk from the library, but there's knights on the Horn Walk. They walk it. Up and down. They're very boring.",
    decline: "Not now, Pip.",
    declineLine: "Everybody says not now. Then it's later and they still say not now.",
    journal: [
      "Hornwings roost in the mouths of the great horns in the Horn Galleries, and Pip Carrow can't sound them. Put down four of them there.",
      "Go back to Pip Carrow in the Librarian's rooms.",
    ],
    progress: [
      "Four hornwings, in the Horn Galleries.",
    ],
    done: [
      "You did it! I heard it from here, they went all quiet. I'm going to sound the guard-change horn wrong tomorrow, just to see what they do.",
      "Here. It's from my dad's things. He'd want somebody brave to have it. And I'm not giving it to the Feast.",
    ],
    after: [
      "I sounded the 'everyone hide' horn by accident yesterday. The whole court hid. For an hour. It was the best hour of my life.",
    ],
  },

  // ---- Ondine's: the Feast That Walks ----
  the_feast_that_walks: {
    title: 'The Feast That Walks',
    giver: 'ph_ondine',
    needs: 'dust_in_the_stacks',
    offer: [
      "Every night his servers carry courses through the screens into the Great Hall, and every night the thing at the high table eats them. I sang over it, for eleven years. I won't tell you what the courses are.",
      "Go into the Hall and put him down. His servers will come through the doors by the screens with the next course: kill them before they reach him, or he eats, and grows. When he throws the long tables, get into the aisle. When he sweeps the aisle, get among the benches.",
    ],
    accept: "I'll put him down.",
    acceptLine: "Through the Screens Passage, off the court's west side. Eat first. And when you've done it, the Hall's north door opens, behind the high table: you needn't come back past the screens.",
    decline: "Not yet.",
    declineLine: "No. Nobody ever is. He's counting on it.",
    journal: [
      "Every night the Feast That Walks eats at the high table of the Great Hall, and his servers carry in courses that Ondine won't speak of. Kill him: cut down his servers before they reach him.",
      "Go back to Ondine in the Librarian's rooms.",
    ],
    progress: [
      "The Great Hall, through the Screens Passage off the court. The servers first.",
    ],
    done: [
      "He's dead. He's really... I'll sing tonight. Quietly. Just here, just for the household. The first time in nine years.",
      "Take this. I kept it from the Sanctuaries, the last thing I kept. I'd rather you wore it than I looked at it.",
    ],
    after: [
      "The court eats in its own rooms now, Master Pell says. The Hall's dark. I walked through it yesterday. It's only a room.",
    ],
  },
};
