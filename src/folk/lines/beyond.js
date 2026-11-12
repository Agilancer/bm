// Past the town: the Bellwright's lines, and the quests that send you out into the land (src/core/lands.js). Their workings
// are in src/folk/quests.js RULES, beside the starter eight. Bible: tools/folk/cast.md, "Beyond Bellmourn".
// The Bellwright is Tessariel's (a T): nothing of his is ever put near the church, the black knight's door or Blackvigil, he
// never goes west, and no Ashby speaks of him (the two-letter rule, cast.md).

// Who's out there to talk to (src/ui/folk.js adds them after the town's people).
export const BEYOND = [
  { id: 'bellwright', name: 'Ser Anselm Toller', title: 'the Bellwright, at the Tower of the Four Watches', age: 64 },
  // Ser Hale Orrowick, a Millhaven ploughman who swore himself a fifth watch at the Bellwright's door, in harness pieced
  // together from what the fallen claimants left on the downs. His body is the knight in TOWN_KNIGHTS flagged `hale`
  // (src/core/knights.js); at: where he stands till that knight's there. His lines and his quests: src/folk/lines/land.js.
  { id: 'hale', name: 'Ser Hale Orrowick', title: 'Paladin of the Fifth Watch', age: 36, at: [2436, -530.4] },
];

export const LINES = {
  bellwright: {
    first: [
      "Stop there. Let me see your hands. No sword. No sunburst. A staff, and something in the other hand that looks back. Well. The seal by my door woke when you came over the rise. First time in forty years.",
      { after: 'quest:long_way_round', say: "Corran Thrale's tracks came as far as my bracken last autumn, and went away again. Now he sends people. The seal by my door woke for you. First time in forty years." },
    ],
    greet: {
      morning: [
        "First light. Fourth watch done. I count them still, with nothing to ring.",
        "You came back. The road from Bellmourn is long. I walked to Millhaven and back in a day, when I had knees.",
      ],
      day: [
        "No watch by day. The bells want oil whether they ring or not. Hold the ladder, or stand out of the light.",
        "Nothing on the downs but sheep and Millhaven's smoke. That is a good day.",
        { after: 'four_watches', say: "When the wind's right I hear the abbey's bell-cote answer. It's only the wind. I listen anyway." },
      ],
      evening: [
        "First watch. I rang it myself, once, a boy on the rope, and the barrow moor lay down.",
        "Sun's going. Don't be on the fen after dark. The jellies come up out of the water to feel the warm.",
      ],
      night: [
        "Third watch. The worst one. Sit inside the door, where the stone is.",
        "Second watch. Count with me. One. That's all there is to it, now.",
      ],
    },
    about: [
      "Anselm Toller. Sworn to the Four Watches at fourteen. The order's me, now, and the tower, and four bells I'm not to ring.",
      "They call me the Bellwright on the downs. A bellwright makes bells. I've never made one. I keep them. Nobody asked me about the name.",
    ],
    ask: {
      tessariels: [
        "Two of them came over the knoll this summer, in silver, singing. The seal didn't stir for either. One asked me to kneel. I was oiling a bearing.",
      ],
      knight: [
        "Not on my hill. Ask the town.",
      ],
      dead: [
        "Four bells rang the watches here, and every house of the order answered, and the dead kept their beds. Then the ringing was forbidden. You've seen how they keep them now.",
      ],
      lis: [
        "Old Lis? An old woman came up the knoll at noon, years back, and asked if the bells were still hung. I said yes. She said good.",
        "There was a lady on the downs road that same night. Young. Lovely. Asked the very same thing. I've thought about that since.",
      ],
    },
    topics: { watches: 'The Four Watches?', seals: 'The seals?' },
    bye: [
      "Go on, then. Keep the road under you.",
      "If you see Millhaven's miller, tell him the tower still stands. He worries.",
    ],
  },
};
// (The two topics only he answers.)
LINES.bellwright.ask.watches = [
  "Four watches of the night, four bells hung here to ring them, and the abbey, the chapel and the shrine answering each. The order kept them. Forty years ago someone said stop, and we stopped.",
  "The tenor's the oldest. Cast in Bellmourn, in a pit on the green, when Bellmourn was a crossroads. The dead remember where it was cast. That's why they keep out of the town.",
];
LINES.bellwright.ask.seals = [
  "Rings of pale stone, one at each house of the order and one by every road worth keeping. Stand on one that's woken and you can step to any other. They woke for wardens. Then, forty years, for no one.",
  "They wake for you. I don't know what that makes you. I know what it doesn't make you: one of the singing ones.",
];

export const QUESTS = {
  long_way_round: {
    title: 'The Long Way Round',
    giver: 'corran',
    about: "Corran Thrale has tracked the dead east over the downs, where they go wide round a knoll with a tower on it. A man in white plate keeps bells there that he doesn't ring: the Bellwright. Find him, and ask him why the dead won't walk his hill.",
    offer: [
      "Everyone in this town thinks the world stops at my pines. It doesn't. I've tracked the dead east, out where the downs open, a long day's walk. They go round a knoll with a tower on it. Wide round.",
      "There's a man up there in white plate who keeps bells he doesn't ring. Folk on the downs call him the Bellwright. Go and see him. Ask him why the dead won't walk his hill. I'd like to know before I'm dead.",
    ],
    accept: "East, then. The tower on the knoll.",
    acceptLine: "Out the east side, where the downs open. Walk into the sunrise. It's a long way. Longer than anyone here walks. Take bread.",
    decline: 'Not that far. Not yet.',
    declineLine: "It'll be there. That's the point of it.",
    journal: [
      "Corran Thrale has followed the dead east over the downs, to a tower on a knoll they won't go near. Find the Bell Tower of the Four Watches, far east of Bellmourn.",
      "Speak to the man in white plate at the tower: the Bellwright.",
      "Go back to Corran Thrale at the hunter's lodge and tell him what the Bellwright said.",
    ],
    progress: [
      "East, on the downs road. Leave the hill road to the hill. You'll see the tower long before you're there.",
      "Still here? It doesn't come to you.",
    ],
    done: [
      "Bells. The dead walk wide of a tower because of bells nobody rings. Huh.",
      "I'll put that with the other things I know and nobody believes. Here. You walked a long way for a hunter's question.",
    ],
    after: [
      "Went out east again. Saw the tower from the downs. Didn't go up. Didn't need to.",
    ],
    others: {
      bellwright: [
        "Corran Thrale sent you? Tell him the dead walk wide of my hill because my hill has the tenor bell on it, hung and whole. They remember it even silent.",
        "And tell him I saw him last autumn, lying in the bracken watching my door for a day and a night. He can knock next time.",
      ],
      edric: ["The Bell Tower of the Four Watches? It still stands? Then someone still keeps it. Don't say that loudly in this square."],
      orrin: ["The dead keep off this town, and the watch thanks its lamps. I've always said it was older than lamps. Bells, is it? Bells."],
      homunculus: ["A PALADIN? In white? On a hill? Then he has heard of me and is preparing. Tell him I am well. Tell him I am VERY well."],
    },
  },

  millhaven_jelly: {
    title: 'Jelly in the Millpond',
    giver: 'hob',
    about: "Hob Fenwick's cousin Abel farms at Millhaven, far east on the downs. Something green came up out of his millpond and ate a ewe, slowly. Put down eight of the jellies round Millhaven, then tell Hob the pond's clear.",
    offer: [
      "My cousin Abel farms out at Millhaven, on the downs. Sent word by the carter. Something's come up out of his millpond. Green, he says, and it moves on its own, and it ate a ewe.",
      "Ate it slow. He watched. I'd go, but the barley won't cut itself and the tithe's at month's end. You've that staff. Would you?",
    ],
    accept: "I'll go to Millhaven.",
    acceptLine: "Out east along the downs. Abel's is the farmhouse with the windmill on the rise behind it. Tell him Hob sent you, and that I'm sorry about the ewe.",
    decline: "Not now, Hob.",
    declineLine: "Abel'll lose another, then. He's got more. Not many more.",
    journal: [
      "Hob Fenwick's cousin Abel at Millhaven, far east on the downs, has something living in his millpond that eats sheep. Put down eight of the jellies round Millhaven.",
      "Go back to Hob Fenwick and tell him the millpond's clear.",
    ],
    progress: [
      "East, on the downs. Windmill. Can't miss it, says Abel, and Abel misses most things.",
    ],
    done: [
      "Eight of them? In a millpond? I'd not have believed it from Abel. From you I will.",
      "Abel sent this. He'd rather pay than come. Bess says take it and don't argue.",
    ],
    after: [
      "Abel sent a cheese as well. He's never sent a cheese in his life. I think you frightened him into manners.",
    ],
    others: {
      bess: ["Hob's sent you to Abel's? Good. Don't eat anything Abel cooks."],
      tilly: ["A jelly that eats SHEEP? Can I come? I'll be quiet. I won't be quiet."],
    },
  },

  four_watches: {
    title: 'The Four Watches',
    giver: 'bellwright',
    about: "Three houses kept the watches with the Bellwright's tower: the Abbey of Saint Ossery, the Drowned Chapel and the Frozen Shrine. Their seals went dark when the ringing stopped. Stand in all three; if their seals wake for you, he has something for you. It rings.",
    offer: [
      "Three houses kept the watches with this tower: the abbey of Saint Ossery in the rust wood, the chapel on the fen, the shrine up under the snow. Their seals went dark when the ringing stopped. Mine woke for you.",
      "Walk to all three. Stand in each. If their seals wake for you too, I'll know the order isn't only me. I've something for you if they do. It isn't much. It rings.",
    ],
    accept: "I'll walk to all three.",
    acceptLine: "North-east for the abbey, through the rust wood. North-west past Sallowmere for the chapel; mind the water. South-west, a long way, for the shrine. Your feet will hate you. Then the seals will forgive them.",
    decline: "Not yet.",
    declineLine: "Forty years they've waited. They'll wait a little longer.",
    journal: [
      "The Bellwright wants to know if the order's three houses still answer. Stand in each, in any order: the Abbey of Saint Ossery (far north-east, the rust wood), the Drowned Chapel (the fen, north past Sallowmere), the Frozen Shrine (far south, Rimeholt).",
      "Go back to the Bellwright at the Tower of the Four Watches.",
    ],
    progress: [
      "The abbey, the chapel, the shrine. Any order. The seals don't mind which wakes first.",
      "You're footsore. Good. It means you went.",
    ],
    done: [
      "All three woke. All three. Sit down. No, sit. I need a moment and I'd rather you didn't watch.",
      "Here. The order gave these to wardens who had to cross the ice. A bell no bigger than your thumb. Ring it in the air and the air rings back, and holds you one step more. It's yours. I'm too old to jump.",
    ],
    after: [
      "I rang the treble yesterday. Once. Very small. Nobody came to hang me. I'll do it again in a year or so.",
    ],
    others: {
      orrin: ["Saint Ossery's abbey? It's in my books as a ruin in a red wood. If you go, look for the bell-cote over the west door. Tell me if it's still there. Don't tell me if it isn't."],
      edric: ["My grandmother was married at the Frozen Shrine. It wasn't frozen then. Go carefully up there."],
    },
  },

  sallowmere: {
    title: 'What the Fen Keeps',
    giver: 'sabine',
    about: "Sabine Moss, the herbalist, gathers bog myrtle on Sallowmere's east shore for the winter fevers, and this spring the shore moved: it was jelly. Put down ten of them on the fen so she can reach it again.",
    offer: [
      "Bog myrtle grows thick on Sallowmere's east shore and nowhere else I can reach. I've gone every spring for twelve years. This spring the shore moved. It was jelly. Lots of it.",
      "They're slow until they aren't. My knife did nothing. Your fire might. Clear the east shore and I'll have myrtle for the winter fevers, which this year will be bad.",
    ],
    accept: "I'll clear the shore.",
    acceptLine: "North. A long way past the pines, where the ground goes soft. Don't drink the water. Don't let one sit on you; they hold on.",
    decline: "Not just now.",
    declineLine: "Then the fevers will have their way. They usually do.",
    journal: [
      "Sabine Moss can't reach the bog myrtle on Sallowmere's east shore for the jellies. Put down ten of them on the fen, far north of Bellmourn.",
      "Go back to Sabine Moss at the herbalist's.",
    ],
    progress: [
      "Ten, I'd say. Fewer and they'll be back by morning. More and you'll get careless.",
    ],
    done: [
      "Ten. You smell of the fen and you've got something green in your hair. Hold still.",
      "There. The myrtle will keep half this town breathing through the wet months. Nobody will thank you for it. So I will.",
    ],
    after: [
      "The myrtle's drying in the rafters. The house smells like a fen in summer. Bryony loves it.",
    ],
    others: {
      bryony: ["Jory says the moor's jellies have bones in them. Bring me one. A bone, I mean. Not a jelly. Well."],
    },
  },

  black_road: {
    title: 'The Black Road',
    giver: 'aldric',
    about: "The carters won't take the west fork into the ash country any more: braziers burn along the road day and night, all the way to a keep of black stone nobody remembers building. Ser Aldric Halloway wants to know what sits there. Go and look. Only look; don't knock.",
    offer: [
      "The carters won't take the west fork into the ash country anymore. Braziers along the road, they say, lit day and night, all the way to a keep nobody remembers building. Black stone. Red cloth.",
      "I'm not sending the watch. We're two watchmen and my brother. But I'd know what's sitting at the end of that road. Go and look. Only look. Don't knock.",
    ],
    accept: "I'll go and look.",
    acceptLine: "West, out the gate, past the end of everything. Then keep going. When the ground goes grey and you can see fires in daylight, you're near. Come back and tell me. Alive is the important part.",
    decline: "That's too far.",
    declineLine: "It is. I'd say the same.",
    journal: [
      "Ser Aldric Halloway wants eyes on whatever sits at the end of the west road. Go far west, across the Ashen Waste, and find the keep at the end of the braziers. Look; don't knock.",
      "Go back to Ser Aldric Halloway at the tower house.",
    ],
    progress: [
      "West. Then more west. Don't stop at the bones; everyone stops at the bones.",
    ],
    done: [
      "A curtain wall. Four towers and a keep, and a tower behind it taller than the rest. Red down its face. Gibbets on the road.",
      "Blackvigil. I'd heard the name and hoped it was a story. Thank you. Don't tell my brother you went. He'll want to go himself.",
    ],
    after: [
      "I've had the watch learn the way to the west fork. Not to go. To know which way to look.",
    ],
    others: {
      edric: ["My brother sent you down the west road? Then it's worse than he told me. It always is."],
      corwin: ["The west road? There is nothing on the west road that concerns Bellmourn. Do you understand me? Nothing."],
    },
  },

  crown_of_teeth: {
    title: 'The Crown of Teeth',
    giver: 'orrin',
    about: "Orrin Vey's books put a lake that never thaws at the top of the Sorrowhorn, the mountain north-west of Bellmourn, with a spire of black glass in it and a ring of teeth round it. Nobody living has been up. Climb by the Broken Stair and bring him back one true account.",
    needs: 'toll_of_bell',
    offer: [
      "Walk partway up the hill road on a clear day, no further, and look north-west. The mountain. The Sorrowhorn. My books put a lake at the top of it that never thaws, and in the lake a spire of black glass, and round it a ring of teeth.",
      "Every author contradicts the one before, which is how I know it's there. Nobody living has been up. I'm seventy. Would you? I'd like one account written by someone who came back down.",
    ],
    accept: "I'll climb it.",
    acceptLine: "The Broken Stair is the old way up, north-west of here, past the hermit's hollow. Take the shoulder, not the face. Write nothing down up there; your hands will shake. Remember it, and tell me.",
    decline: "Not that climb.",
    declineLine: "Sensible. Every author I've read was sensible too. That's the trouble.",
    journal: [
      "Orrin Vey wants one true account of the top of the Sorrowhorn, the mountain north-west of Bellmourn. Climb to the Crown of Teeth by the Broken Stair.",
      "Go back to Orrin Vey at the Tolling Bell and tell him what's up there.",
    ],
    progress: [
      "The Broken Stair. Then up. That's all the books agree on.",
    ],
    done: [
      "Ice, and the spire in it, and pillars with nothing on them. Twelve? Twelve. And the teeth all round the rim. Black.",
      "Every one of them was right and none of them had the number. Give me your hands; warm them on the cup. Here, for the climb. And this page; it's the only one that's true now.",
    ],
    after: [
      "I've crossed out four chapters. It's the best morning I've had in years.",
    ],
    page: "On the Crown of the Sorrowhorn, as told to Orrin Vey by one who climbed it: a lake frozen to the bottom, and from it a spire of black glass the ice has climbed half its height. Twelve white pillars on the shelf round it, bearing nothing. On the rim, black stone teeth, some taller than a house. No snow lies on the spire. No bird sits on the teeth.",
    others: {
      nell: ["Orrin's sent you up the MOUNTAIN? He gets you to carry a cup across the room and frets you'll spill it."],
    },
  },

  barrow_lights: {
    title: 'Lights on the Barrow Moor',
    dayHint: "Nothing moves on the moor by day. Jory's lights keep night hours: come back after dark.",
    giver: 'jory',
    about: "Jory Pell, the night watchman, has seen white lights moving low on the Barrow Moor, far south-west: like somebody walking with a lamp held down by his knee, only there's nobody. Go there after dark and put out whatever carries them.",
    offer: [
      "Lights. Out on the barrow moor, south-west, past where the road goes. White ones. Moving low, like somebody walking with a lamp held down by his knee. Only there's no somebody.",
      "I've seen them three nights from the tower top. Captain says it's marsh gas. Marsh gas doesn't come up a hill. Go and look, at night. Put out whatever it is.",
    ],
    accept: "At night, then. I'll go.",
    acceptLine: "Night, mind. They don't show by day. And don't step on the mounds. My nan said you don't step on the mounds and I've never asked why.",
    decline: "Not tonight.",
    declineLine: "Nor me. I've a lantern and that's all the brave I've got.",
    journal: [
      "Jory Pell has seen lights moving low on the Barrow Moor, far south-west, at night. Go there after dark.",
      "Put down six of whatever carries the lights on the Barrow Moor.",
      "Go back to Jory Pell and tell him what the lights were.",
    ],
    progress: [
      "Night, the moor, the lights. I'd come but somebody's got to walk the town.",
    ],
    done: [
      "Jelly. Jelly full of bones, glowing like a lamp. Well, I don't know if that's better or worse than ghosts. Worse. It's worse.",
      "Here. Captain gives me a bit extra for night work. You did the night work.",
    ],
    after: [
      "No lights on the moor these three nights. I keep looking anyway. It's habit now.",
    ],
    others: {
      aldric: ["Jory's lights? It's marsh gas. ...Is it? Tell me after."],
    },
  },
};
