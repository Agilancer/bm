// The people down Phobos's sewers (src/core/delve-sewers.js), what they say, and the words of their quests (their workings:
// src/folk/phobos-quests.js). Taken into src/folk/lines/phobos-hubs.js's LINES and QUESTS. As src/folk/lines/land.js.
//   Martleboro: the elder of the two sewer-keepers, short, broad, moustached, in red leathers. Keeps the drains as other men
//     keep horses. Proud, quick, and certain every pipe in the city has a name, which he knows.
//   Louis G (said "Luigi"): his brother, the taller, in green. Brave the way frightened people are brave: he goes anyway.
//   Princess Apricot: keeps her court in the Sunk Garden, at the far end of the High Conduits, under the dukes' old gardens.
//     The brothers call her their princess and won't say of what. She doesn't correct them.
// Nothing of Tessariel's in any of it (README "The two sides"): no bells, no seals of hers, nobody's oath to her.

export const LINES = {
  martleboro: {
    first: [
      "Mind the step, it's slick. Mind the other step, it's slicker. ...There. Martleboro. Keeper of the drains of Phobos, the Main, the Overflow and everything that runs into them. That's my brother. Louis G. Wave, Louis.",
    ],
    greet: {
      morning: [
        "Morning. The Main's running high. Somebody up there had a bath. Somebody up there always has a bath on a Thursday.",
        "Morning! You've come down early. The spiders haven't had their breakfast. Don't be it.",
      ],
      day: [
        "Every drain in this city has a name, and I gave most of them. That one's Gertrude. Don't ask.",
        "You hear that? That's the Cinder Run backing up. I can hear a blocked drain at two hundred paces. Louis can't. Louis hears ghosts.",
      ],
      evening: [
        "Lamps are lit up top. You can tell: the soot comes down the Cinder Run thicker. Evening, then.",
        "Evening. Sit down if you like. Not there. That's where the Overflow comes in when it rains.",
      ],
      night: [
        "Night's when they come up out of the Larder. Keep to the lit side of the Main.",
        "Up late? So are they. Everything down here's up late.",
      ],
    },
    about: [
      "Our father kept these drains, and his before him. Then the city changed hands and nobody up top cared who kept them. We kept them anyway. Somebody's got to, or the whole of Phobos floods by spring.",
      "Mushrooms. That's what we live on. Drain caps grow on whatever dies down here, and the apothecaries up top pay good silver for them and never ask where from.",
    ],
    ask: {
      sewers: [
        "Four parts to it. The West Drains, which are ours. The Slough Mains under the Wharf. The Charnel Runs under the Bone Yards. The High Conduits under the castle's feet. Gates between them. Sluices on the gates. Mind the sluices.",
      ],
      louis: [
        "My brother's the best keeper in Phobos and he doesn't know it. Jumps at his own echo. Then walks straight into whatever made it. That's not fear. I don't know what that is.",
      ],
      princess: [
        "Our princess. She keeps her court in the Sunk Garden, far end of the High Conduits. Princess of what? Of the Garden. Of us. Don't ask her the rest. We didn't.",
      ],
    },
    topics: { sewers: 'The sewers', louis: 'Louis G', princess: 'The princess' },
    bye: [
      "Off you go. Keep your feet out of the channel. It's a hand deep and it's never just water.",
    ],
  },

  louis_g: {
    first: [
      "Ah! Oh. Oh, it's a person. Sorry. Louis G. You say it quick, all of a piece: Louis G. My brother says it like he's calling a dog. Welcome to the West Drains. Mind the spiders.",
    ],
    greet: {
      morning: [
        "Morning. I've been up the Overflow and back already. Nothing in it. I checked twice. I'll check again later.",
        "Oh, good, it's you. Something was breathing in the Soot Cistern all night. I'm sure it was the pipes. Mostly sure.",
      ],
      day: [
        "These caps here, the pale ones, they light up a little in the dark. I like them. They're the only thing down here that's pleased to see you.",
        "Martleboro says I'm jumpy. I say I'm alive. Both of those are true.",
      ],
      evening: [
        "Evening. The light goes funny in the Main this time of day. Like the walls are leaning in. They aren't. I measured.",
        "If you're going past the Rookery well, wave up the shaft. Somebody always waves back. I don't know who.",
      ],
      night: [
        "Night. Stay close to the lamps. And if you hear somebody humming in the Larder, that's not me. I never go in the Larder.",
        "Can't sleep. Never can down here at night. You get used to it. No, you don't.",
      ],
    },
    about: [
      "I keep the far drains, the ones Martleboro says are too dull for him. The Slough Mains. The Charnel Runs. I'm the one who goes. He's the one who knows. That's how we've always done it.",
      "The princess? I carry her letters. Across the whole of the sewers, every week. It's the best day of the week. It's also the most frightening one. Those can be the same day.",
    ],
    ask: {
      caps: [
        "Every kind of thing that dies down here grows its own caps. Spiders grow little white ones. The drowned grow grey. The worms grow these fat blue ones that smell of copper. We pick them off. Somebody has to.",
      ],
      brother: [
        "Martleboro was the first down the Great Grate the night the street fell in. Went in after a cart horse. Came out with the horse. I held the rope. I always hold the rope.",
      ],
      princess: [
        "She's kind. She's very... she dresses for the heat. The Sunk Garden's warm. It's warm. Don't tell Martleboro I went red.",
      ],
    },
    topics: { caps: 'The caps', brother: 'Martleboro', princess: 'The princess' },
    bye: [
      "Go careful. If something's following you, it's just your echo. Walk faster anyway.",
    ],
  },

  apricot: {
    first: [
      "Oh, a visitor. Down the Approach, or all the way across? ...All the way. Then you've earned a chair. I'm Apricot. The brothers will have told you I'm a princess. They're quite right. Sit.",
    ],
    greet: {
      morning: [
        "Morning. The shaft lights the Garden for an hour, about now. I take my breakfast in it, like a lizard.",
        "You're up early for the High Conduits. Did the Lamplighter's men see you? They do report to someone. I'd like to know who.",
      ],
      day: [
        "The dukes kept their gardens right over our heads. When they went, the gardens came down the shaft a seed at a time. Everything you see grew from what they threw away.",
        "Sit, sit. Nobody stands in my court. It makes the caps nervous.",
      ],
      evening: [
        "Evening. The great caps start to glow about now. I've named them. That's Ser Pallid. That's the Dowager. Don't touch the Dowager.",
        "The castle's lamps go on up there. You can feel it through the stone: the whole crag hums.",
      ],
      night: [
        "Night's the Garden's best hour. Everything that glows, glows. Everything that bites stays out. Mostly.",
        "Can't sleep? Nor can I. Have some tea. It's from the caps. It's perfectly safe. Louis drinks it.",
      ],
    },
    about: [
      "Princess of the Sunk Garden. Of the brothers. Of whoever comes down here frightened and needs a chair. It's a small realm. It's mine.",
      "Before that? There was a house up there, once, with a garden on its roof. When the city changed hands I came down the shaft with the seeds. That's all you're getting.",
    ],
    ask: {
      garden: [
        "Light down the shaft, water off the Aqueduct, and everything the dukes threw away. That's a garden. Most of them are.",
      ],
      brothers: [
        "Martleboro keeps the drains. Louis keeps me in letters. Between them they keep this city from drowning in itself, and nobody up top has ever once said thank you. So I do. Every week.",
      ],
      castle: [
        "The Aqueduct climbs from here into the castle's Lower Ward. Water comes down it. One day, something will go up it. Not yet. You're not ready, and neither is it.",
      ],
    },
    topics: { garden: 'The Garden', brothers: 'The brothers', castle: 'The castle' },
    bye: [
      "Go well. Come back up the Approach next time: it's shorter, and the stairs are dry.",
    ],
  },
};

export const QUESTS = {
  // ---- the way down, from the Pennyless ----
  down_the_drains: {
    title: 'Down the Drains',
    giver: 'ph_penny',
    offer: [
      "Half this city's trouble comes up out of the drains, and half its secrets go down them. There are two brothers who keep them. Keepers. Plumbers, if you're rude. They know every pipe under Phobos.",
      "Go down by the Barbican, by the King's Mile: there's a stair in the wall. Find their office off the Great Grate. Tell them Lowe sent you. They'll put you to work. They always do.",
    ],
    accept: "I'll go down.",
    acceptLine: "The stair's in the wall beside the King's Mile, just in from the Barbican. Hold your nose. Then hold your purse. Then hold your nose again.",
    decline: 'Not the sewers.',
    declineLine: "No? Then you'll never know this city. It's down there. Most of it.",
    journal: [
      "Fennick Lowe says two brothers keep the sewers of Phobos. Go down by the stair beside the King's Mile, by the Barbican, and find their office off the Great Grate in the West Drains.",
      "Speak to Louis G in the keepers' office.",
      "Speak to Martleboro in the keepers' office.",
    ],
    progress: [
      "The stair by the King's Mile. The Great Grate. Their office is off its east side.",
    ],
    others: {
      louis_g: ["Lowe? Fennick Lowe sent you? Oh, thank goodness, I thought you were a spider. A tall one. Martleboro! Somebody from Lowe!"],
      martleboro: ["From Lowe, are you? Good man, Lowe. Pays in bread and never floods a cellar. Right. Pull up a crate. We've work, and it's honest, and it smells."],
    },
    done: [
      "Lowe sends us somebody every year or so. Most of them go back up the stair the same day. You came all the way to the Grate. That's something.",
      "Here's for your trouble, and welcome to the drains. You'll want to know about the caps. Everyone does, eventually.",
    ],
    after: [
      "The brothers? Still there? Course they are. They'll be there when the castle falls down. Somebody's got to mop up after.",
    ],
  },

  // ---- Martleboro ----
  caps_for_the_keepers: {
    title: 'Caps for the Keepers',
    giver: 'martleboro',
    needs: 'down_the_drains',
    offer: [
      "Drain caps. Pale mushrooms. They grow on whatever dies down here, and plenty dies down here. The apothecaries up top pay silver for them and never ask where they came from.",
      "Kill what's in the West Drains and pick the caps off them. Ten will do. Ten, and the rent's paid for the month.",
    ],
    accept: "Ten caps. I'll pick them.",
    acceptLine: "Anything that dies down here grows them in an hour. Kill it, wait for it to stop twitching, pick. The Cinder Run's thick with things. Start there.",
    decline: 'Not today.',
    declineLine: "No? The rent's still due. It always is.",
    journal: [
      "Martleboro buys drain caps: the pale mushrooms that grow on whatever dies in the sewers. Kill what's in the West Drains and bring him ten.",
    ],
    progress: [
      "Ten caps. Off whatever's dead. The Cinder Run's busy.",
    ],
    done: [
      "Ten. Good ones too, look at the gills on that. Louis! Silver tonight!",
      "Your share, and a bit over. Bring me more whenever you've a mind. I never say no to a cap.",
    ],
    after: [
      "The apothecaries sent down for more. Everybody's poorly up there this month. I don't ask. They don't ask. That's the trade.",
    ],
  },
  the_main_runs_clear: {
    title: 'The Main Runs Clear',
    giver: 'martleboro',
    needs: 'down_the_drains',
    offer: [
      "Something's nesting in my drains. The Main, the Cinder Run, the Rookery Drain: every one of them. Rakers, spiders, the sunk. They foul the channels, and a fouled channel backs up into somebody's cellar.",
      "Put down twelve of them. Anywhere in the West Drains. Then I can get a rod down the Main without a spider on the end of it.",
    ],
    accept: "Twelve. I'll clear them.",
    acceptLine: "Anywhere in the West Drains. Mind the Larder, though. That's not twelve. That's her.",
    decline: 'Not now.',
    declineLine: "Then somebody's cellar floods tonight. Not mine. I live in a sewer.",
    journal: [
      "Things are nesting in the West Drains and fouling the channels. Put down twelve of them.",
      "Go back to Martleboro in the keepers' office.",
    ],
    progress: [
      "Twelve, anywhere in the West Drains.",
    ],
    done: [
      "Twelve! I put a rod right down the Main this morning, end to end. Not one spider on it. Not one.",
      "Here. You've earned it. Louis, write it in the book: the Main runs clear.",
    ],
    after: [
      "The Main's running like a river. I stood and listened to it for an hour. Louis thinks I'm soft. Louis is right.",
    ],
  },
  the_queens_larder: {
    title: "The Queen's Larder",
    giver: 'martleboro',
    needs: 'the_main_runs_clear',
    offer: [
      "Past the Rookery well, there's a cistern we used to call the Turning Basin's big sister. Now we call it the Larder. There's a spider in it the size of a dray, and she's been taking our rakers. Our cats. A horse, once.",
      "Kill her. The Spider Queen. Then the West Drains are ours again, end to end, for the first time since our father kept them.",
    ],
    accept: "I'll go into the Larder.",
    acceptLine: "Up the Rookery Drain, past the well, east. Don't stand in her webs: what's caught stays caught. And kill her brood before they get to the cocoons. They eat what's in them.",
    decline: 'Not her. Not yet.',
    declineLine: "No. Not yet. She'll still be there. That's the trouble with her.",
    journal: [
      "A spider the size of a dray has made the cistern past the Rookery well her larder. Kill the Spider Queen.",
      "Go back to Martleboro in the keepers' office.",
    ],
    progress: [
      "Past the Rookery well, east. The Larder. Her.",
    ],
    done: [
      "She's dead? The Queen? ...Louis. Louis, come here. Say it again, so he hears it. She's dead.",
      "Our father would've given you his good rod. I'll give you this instead, which is worth more and smells less.",
    ],
    after: [
      "I went into the Larder this morning. First time in nine years. Cut the cocoons down. Some of what was in them, I knew. We buried them proper, up top.",
    ],
  },
  the_great_worm: {
    title: 'The Great Worm',
    giver: 'martleboro',
    needs: 'the_queens_larder',
    offer: [
      "The Slough Mains. Under the Wharf and the market. Louis keeps them, and Louis hasn't been past the Weir Hall in a month. There's a worm in the Silt Bed, past the Dye Sump. Long as a street.",
      "It's been coming up through the floors. It took a sluice gate clean off its hinges. I want my brother back in his own drains. Kill it.",
    ],
    accept: "I'll kill the worm.",
    acceptLine: "Through the Slough Gate, past the Turning Basin. The Weir Hall, the Tanners' Main, the Dye Sump, then north up the Silt Run. When it goes under, keep moving. It comes up where you stood.",
    decline: 'Not a worm that big.',
    declineLine: "No. Nobody wants that one. That's why it's still there.",
    journal: [
      "A worm long as a street has taken the Silt Bed in the Slough Mains, past the Dye Sump. Kill the Great Worm.",
      "Go back to Martleboro in the keepers' office.",
    ],
    progress: [
      "The Slough Mains. Past the Dye Sump, up the Silt Run. The Silt Bed.",
    ],
    done: [
      "Dead. Long as a street, and dead. Louis went down this morning to look at it. He came back walking taller. He's been walking taller all day.",
      "That's for the worm. And this is from Louis, who wants you to know he'd have done it himself. He wouldn't. But he wants you to know.",
    ],
    after: [
      "Louis is back in the Slough Mains. Whistling. I could hear it from here. I've never heard him whistle down there.",
    ],
  },

  // ---- Louis G ----
  caps_of_the_slough: {
    title: 'Caps of the Slough',
    giver: 'louis_g',
    needs: 'caps_for_the_keepers',
    offer: [
      "Every kind of thing grows its own caps. The worms in the Slough Mains grow fat blue ones that smell like copper. The apothecaries go mad for them. I go mad getting them.",
      "Could you? Fifteen, off whatever's dead in the Slough Mains. I'd go. I'd go. I'd just rather you did.",
    ],
    accept: "Fifteen from the Slough.",
    acceptLine: "Through the Slough Gate, at the end of the Turning Basin. The Weir Hall's beautiful. Don't stop to look at it. Things look at you while you look at it.",
    decline: 'Not now.',
    declineLine: "That's all right. That's fine. I'll go. Probably. Tomorrow.",
    journal: [
      "Louis G wants the blue caps that grow on the dead of the Slough Mains. Bring him fifteen drain caps from there.",
    ],
    progress: [
      "Fifteen caps. Off the dead in the Slough Mains.",
    ],
    done: [
      "Fifteen! And look, three of them are blue. The good kind. The copper kind. I could kiss you. I won't. But I could.",
      "Here. It's the silver from the last lot. I was saving it for a new lamp. I'll get a new lamp next week.",
    ],
    after: [
      "I bought the new lamp. It's brighter. Everything's still there when it's brighter, but at least I see it coming.",
    ],
  },
  letters_for_the_princess: {
    title: 'Letters for the Princess',
    giver: 'louis_g',
    needs: 'the_great_worm',
    offer: [
      "Every week I take the princess her letters. From up top, from the brothers, from whoever's written. All the way across: the Slough Mains, the Charnel Runs, the High Conduits, to the Sunk Garden.",
      "This week I... the Charnel Runs. Something's singing in the Charnel Runs. Would you take them? All the way across. Hand them to her yourself. She likes a new face.",
    ],
    accept: "I'll take her letters across.",
    acceptLine: "The Slough Gate, and round the Worm's old bed. Because of you. Then the Charnel Runs, and up the Mages' Rise stair. Don't go on through the Conduits: along the High Loop, down the Approach stair, and you're in her Garden.",
    decline: 'Not all that way.',
    declineLine: "No. That's fine. It's a long way. I know how long. I know every step of how long.",
    journal: [
      "Louis G carries Princess Apricot's letters across the sewers every week, and this week he can't face the Charnel Runs. Cross the Slough Mains, the Charnel Runs and the High Conduits to the Sunk Garden, and give them to her yourself.",
      "Get to the Charnel Runs.",
      "Get to the High Conduits: up the Mages' Rise stair, along the High Loop, and down the Approach stair into the Sunk Garden.",
      "Give Princess Apricot her letters in the Sunk Garden.",
    ],
    progress: [
      "All the way across. The Sunk Garden, at the far end of the High Conduits.",
    ],
    others: {
      apricot: ["Letters? From Louis? But you're not Louis. ...Something's singing in the Charnel Runs, isn't it. Poor lamb. Give them here, and thank you, and sit down before you fall down."],
    },
    done: [
      "There. Three from up top, one from Martleboro, which will be about drains, and one from Louis, which will be about me. Don't tell him I read his first.",
      "Take this for your walk. It's from the Garden: it doesn't grow anywhere else. Neither do I.",
    ],
    after: [
      "Louis came across himself this week. He said the singing's stopped. He looked at you when he said it. So did I.",
    ],
  },

  // ---- Princess Apricot ----
  the_drowned_abbot: {
    title: 'The Drowned Abbot',
    giver: 'apricot',
    needs: 'letters_for_the_princess',
    offer: [
      "You heard the singing in the Charnel Runs. That's the Abbot, in the Drowned Chapter. He kept the charnel house up top, once, and when it flooded he kept his hours anyway, under the water, with his chapter round him.",
      "He sings them up at all hours and they wander. Into my conduits. Into Louis's way. I'd like the singing stopped. Permanently, please.",
    ],
    accept: "I'll stop the singing.",
    acceptLine: "Up the Approach stair and along the High Loop, then down the Mages' Rise stair. The Drowned Chapter's at the end of the Mages' Culvert. When he calls his chapter up out of the water, put them down before they reach him.",
    decline: 'Not yet.',
    declineLine: "Of course. He'll keep. He's very good at keeping. That's the whole trouble with him.",
    journal: [
      "The Drowned Abbot keeps his hours in the Drowned Chapter in the Charnel Runs, and his chapter wanders into the princess's conduits. Kill him.",
      "Go back to Princess Apricot in the Sunk Garden.",
    ],
    progress: [
      "The Drowned Chapter, at the end of the Mages' Culvert.",
    ],
    done: [
      "Quiet. Do you hear it? Nothing. Not a note. I'd forgotten the Garden could be this quiet. The caps are opening. They never open at night.",
      "Take this, with my thanks. And sit a while. You look as though nobody's said thank you to you in a long time either.",
    ],
    after: [
      "Louis says the Charnel Runs are only frightening now, not unbearable. From Louis, that's a love letter.",
    ],
  },
  lamps_out_in_the_conduits: {
    title: 'Lamps Out in the Conduits',
    giver: 'apricot',
    needs: 'the_drowned_abbot',
    offer: [
      "Off the Long Conduit, near my Garden, there's a hall full of lamps. They never go out. Someone keeps them lit: the Lamplighter. His wick-men go up and down the conduits, and every lamp they light is one more eye looking down here for me.",
      "I've hidden a long time. I'd like to stop hiding. Put his lamps out. All of them. Starting with him.",
    ],
    accept: "I'll put out the Lamplighter.",
    acceptLine: "Out of the Garden, down the Approach and up the Lamp Cut. His hall's at the end of the Long Conduit. Keep off his fire: everything he lights stays lit. And put his wick-men down before they get to a lamp.",
    decline: 'Not him. Not yet.',
    declineLine: "No. I've waited this long. I'm very good at waiting. I'd simply rather not be.",
    journal: [
      "The Lamplighter keeps a hall of lamps off the Long Conduit, near the Sunk Garden, and his wick-men watch the conduits for whoever sent him. Put him out.",
      "Go back to Princess Apricot in the Sunk Garden.",
    ],
    progress: [
      "Down the Approach Culvert. His hall.",
    ],
    done: [
      "The conduits are dark. I went to the end of the culvert and looked, and for the first time there was nothing looking back.",
      "This was mine, before. From the house with the garden on the roof. It's yours. Wear it, and remember the Garden when you're somewhere colder.",
    ],
    after: [
      "I walked up the Approach yesterday, into the street, in daylight. Nobody knew me. I bought an apricot. I'd never had one.",
    ],
  },
  up_the_aqueduct: {
    title: 'Up the Aqueduct',
    giver: 'apricot',
    needs: 'lamps_out_in_the_conduits',
    offer: [
      "Off the east side of my Garden there's a gate nobody uses: the Aqueduct Foot. The castle's water comes down through it, and I've always thought, if the water comes down, someone can go up.",
      "I've never gone. I'm a princess; I'm allowed to be a coward about one thing. Would you go up for me, and tell me what's at the top?",
    ],
    accept: "I'll go up the Aqueduct.",
    acceptLine: "Through the gate off the Garden's east side. At the top it's his castle: the Lower Ward, where his garrison lives. Don't fight the whole garrison. Look, and come back and tell me.",
    decline: 'Not into the castle.',
    declineLine: "No. Very sensible. I've been sensible about it for years. It hasn't made the castle any smaller.",
    journal: [
      "Princess Apricot has never gone through the gate off her Garden and up the Aqueduct. Go up it into the castle's Lower Ward and see what's there.",
      "Go back to Princess Apricot in the Sunk Garden.",
    ],
    progress: [
      "The gate off the Garden's east side, and up the Aqueduct.",
    ],
    done: [
      "His kitchens? The castle's kitchens, at the top of my aqueduct? All these years. No. I'm not going to think about what's been coming down it.",
      "Thank you. Truly. Now I know what's up there, it's only a castle. Only a very large castle, full of his men.",
    ],
    after: [
      "I keep looking at that gate. It's only a gate, now. Isn't it funny, what knowing does.",
    ],
  },
  the_gate_captain: {
    title: 'The Gate Captain',
    giver: 'apricot',
    needs: 'up_the_aqueduct',
    offer: [
      "Whoever comes up to the castle by the front meets the Gate Captain, in his yard behind the gate. Nobody gets past him. His garrison comes down off the walls, and their shields cover him while they stand.",
      "But you've been in by the back now. You know the servants' ways. When you're ready, and not before, go and see him from the inside.",
    ],
    accept: "I'll see to the Gate Captain.",
    acceptLine: "Up the Aqueduct, through the Kitchens, along the West Range to his yard. Bring his garrison down first: while one of them stands, he hardly feels you. And when he drops the gate's teeth, don't be under them.",
    decline: 'Not yet. He can keep his gate.',
    declineLine: "He will. He's kept it a long time. Come and tell me when you're bigger. Stronger, I mean. You're quite tall enough.",
    journal: [
      "The Gate Captain holds the yard behind the castle's gate, and his garrison's shields cover him while any of them stand. Kill him.",
      "Go back to Princess Apricot in the Sunk Garden.",
    ],
    progress: [
      "His yard, behind the gate. The garrison first.",
    ],
    done: [
      "He's dead? Then anyone can walk up to the castle and in at the front. Oh, they'll all be going up there now, won't they. All the brave idiots. I'd better put the kettle on.",
      "This came out of his gate, didn't it. I can tell. It's cold. Take it anyway; it's yours, you won it.",
    ],
    after: [
      "Louis says people go up to the castle in daylight now. He says it's because of you. He was cross about it. He's proud of you, really.",
    ],
  },
};
