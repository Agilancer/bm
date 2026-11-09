// What the inn, the chandler's, the smithy, the alehouse and the bakehouse say. (Bible: tools/folk/cast.md.)
// Lines kept for while the bell still tolls each midnight, and for after its warden's put down (src/folk/quests.js sayable).
// { met: id, say } in `first`: said instead, once the player's had a word with that person (the last that fits is said).
const ringing = (say) => ({ before: 'toll_of_bell', say }), quiet = (say) => ({ after: 'toll_of_bell', say });

export const LINES = {
  // ---------------------------------------------------------------- The Tolling Bell
  bram: {
    first: [
      "Let me guess. A cave, a ring of candles, a beautiful woman. Hold on... there. Thirteen. Course you are. Bed's four copper, paid before. Tessariels die owing.",
      { met: 'maudie', say: "Maudie's had you already. You've the look: fed, and told off. Hold still... there. Thirteen. Course you are. Bed's four copper, and she doesn't set the price." },
    ],
    greet: {
      morning: [
        "Morning. Still thirteen. Nobody came in the night.",
        "You slept. That puts you ahead of most of them.",
        "Porridge is Maudie's business. Beds are mine. The rest is yours.",
      ],
      day: [
        { after: 'dead_cant_wait', say: "Eight put down, Silas says. I've no column for that. I've started one." },
        "{name}. Still upright. I'll not rub you out yet.",
        "Back again. I keep a column for that. It's short.",
        "I keep wanting to call you Thirteen. I'm trying, {name}.",
      ],
      evening: [
        "Evening. Maudie's singing tonight. Drink fast.",
        "Sit where I can see you. I like to know where the Tessariels are.",
        "Lamps lit, count's the same. Good day, then.",
      ],
      night: [
        "Near enough shut. Say it quick.",
        ringing("Bell's not gone yet. It'll be three. It's always three."),
        quiet("Midnight came and went last night, and I'd nothing to count. I lay there counting that."),
        "Late, {name}. This late, it's a bed or it's trouble. Which are you?",
      ],
    },
    about: [
      "Bram Kettle. The Tolling Bell's mine. So's the slate, the beds upstairs, and every debt in this book.",
      "I count things. Mugs, coppers, strangers in silver. It's the only thing in this town that comes out the same twice.",
    ],
    ask: {
      tessariels: [
        "Twelve before you. Three went up the hill. Two went into the pines. Four wander about asking the way to the Throne. Two talk to my hens. One paid his bill. I think about him.",
        "Every one of them stood where you're standing and told me about the woman. Hair like this, eyes like that. Not one of them could tell me her name.",
      ],
      knight: [
        "Came at the new moon. Hasn't sat down since. I don't trust a man who won't sit.",
        "Three of mine went up to him. What they owed is still on the slate. I'll not rub it out.",
      ],
      dead: [
        "Silas has nine waiting on the ground, and the ground's waiting on the knight. Nine. I don't like a number that only goes up.",
        "Corran counts badly, but he doesn't lie. He says packs. I've bought more lamp oil.",
      ],
      lis: [
        "Twice a year: salt for herbs, an insult for my ale, gone. This time she came down with you, and she's stayed. That's not twice a year.",
        "Twenty years of salt and she's never once been in here after dark. Not my business. I just count.",
      ],
      town: [
        "A bell nobody rings on a road everybody leaves by. I've done well enough.",
        "Tithe's at month's end. The reeve wants a bit more every year and there's a bit less. I can count that too.",
      ],
      tally: [
        "Twelve strokes, and yours. I chalk them when they walk in. I don't rub them out when they die. Maudie says that's morbid. It's bookkeeping.",
        "Nell wants me to write their names by the strokes. I don't know their names. They all said the same one.",
      ],
      bell: [
        ringing("Forty years nobody's touched that rope. Now it goes at midnight. Three. I count it from my bed every night, and it's never once been four."),
        ringing("I asked Orrin what three means. He talked till the candle went out. I took that for 'he doesn't know'."),
        quiet("Forty years of nothing, a month of three, and now nothing again. I've drawn a line under it. In chalk. Chalk rubs off."),
        quiet("Orrin wants to write it up. I told him: three a night, then none. That's the whole of it. He wants it longer."),
      ],
      silver: [
        "Not on the slate. Never once come through that door. I chalk who comes in, not who walks round the green.",
        "Round and round the green, same pace all day. No bill, no speech, no trouble. I've had worse neighbours.",
      ],
    },
    topics: { tally: "The Tally", bell: "The bell" },
    // Said back after "She wasn't beautiful. She was old." (src/ui/folk.js OLD), a line at a time.
    old: [
      "...Old.",
      "Twelve stood where you're standing and said beautiful. I never needed a second column.",
      "I'll not start one now.",
    ],
    barks: {
      morning: [
        "Forty mugs out. Thirty-nine back. Pip.",
        ringing("Three again last night. Course it was."),
        quiet("Nothing at midnight again. Every night I counted three. I've no use for nought."),
        "Floor, mugs, slate. In that order.",
        "Nobody new in the night. Good.",
        "Shutters up. Door open. Credit shut.",
      ],
      day: [
        "Two coppers is two coppers, Dob. Not one and a promise.",
        "If you're standing in my door, stand in it buying.",
        "Nell. Mugs.",
        "Four beds, three paid, one Tessariel. Could be worse.",
      ],
      evening: [
        "Maudie. Not that one. Not tonight.",
        "Every lamp, Nell. Every one.",
        "Boots off the bench.",
        "Supper's on. Sit or go. Don't hover.",
      ],
      night: [
        "Bar's shut. Beds are four copper.",
        "Last one out bolts the door. Then tries it.",
        ringing("Midnight soon. I'll be counting."),
        quiet("Bolt, bar, lamp. No bell to wait up for. Bolt, bar, lamp."),
        "Bolt, bar, lamp. Bolt, bar, lamp.",
      ],
      work: [
        "Wipe, stack, count.",
        "That's four you've had, Wes. I'm not judging. I'm counting.",
        "Seventeen coppers and a button. Who paid in a button?",
        "Hob, that's a mug, not a hat.",
        "Same again? Same again.",
      ],
      player: [
        "Thirteen.",
        "Still on your feet. I'd have lost money on that.",
        "Bed, or are you just here to stare at the slate? They all stare at the slate.",
        "Some of them tap the bar like that. Just before the speech.",
        "{name}. Still the one stroke. Keep it that way.",
      ],
      magic: [
        "Not in the inn. I've just had the floor done.",
        "Twelve of you, and that's the first that's done anything.",
        "Huh.",
        "That'll come out of something. Your bill, likely.",
      ],
      woken: [
        "Four coppers buys you the bed. Not me.",
        "If it's not on fire, it's morning business.",
        ringing("Was it the bell? It was three. Go back to bed."),
        quiet("If you heard a bell, you didn't. Go back to bed."),
        "I heard you on the stairs. I hear everyone on the stairs.",
      ],
    },
    bye: [
      "Go on. Your stroke stays on the slate either way.",
      "Come back. I'd like one of you to.",
      "Pay before, not after. Habit. Off you go.",
    ],
    shop: {
      open: [
        "Bed's four copper. Clean straw, a door that bolts, and Maudie's porridge if you're up for it.",
        "A bed till morning, four copper. No credit for Tessariels. The last one I trusted is still up that hill.",
      ],
      closed: [
        "Beds are let at the bar, and I'm not at the bar. Find me there.",
        "Not from my bed, I don't. Ask me downstairs, with your coin out.",
      ],
      buy: [
        "Second door. Bolt it. Humour me.",
        ringing("Four copper. Counted. Sleep, if you can. The bell goes at midnight. Don't get up for it."),
        quiet("Four copper. Counted. Sleep. It's quiet at midnight now. Takes some getting used to."),
      ],
      sell: [
        "I rent beds. I don't buy what's come out of a hole. Magda's in the square.",
      ],
      poor: [
        "Four copper. You've less. I can count, even if you can't.",
        "The one before last tried that face. Bed's still four.",
      ],
    },
  },

  maudie: {
    first: [
      "Oh, look at you. Thin as a taper and all bones under that sheet. Sit. No, don't tell me about the woman, I've heard it twelve times. Eat first. Then tell me.",
      { met: 'bram', say: "Bram's chalked you, has he? Then you're ours. Stew's on. Don't argue. Nobody argues with me in my own kitchen and wins, not even Bram, and he's had thirty years to practise." },
    ],
    greet: {
      morning: [
        "Up! Good. Porridge. Don't make that face, it's got honey in.",
        "You've slept in that robe again. I can tell. Everyone can tell.",
        "Morning, chick! Have you eaten? You've not eaten.",
      ],
      day: [
        { after: 'dead_cant_wait', say: "You went under the church and came up hungry. Good. Hungry's alive." },
        "Back! Hungry? You're hungry.",
        "If you see Nell out there, send her in. If she's with one of them, send him off.",
        "Mind the floor, Pip's just done it. Well. Pip's done some of it.",
      ],
      evening: [
        "Sit by the fire, chick. You look like the inside of a well.",
        "I'm singing tonight. Bram's already sulking.",
        "There's stew. There's always stew. Sit.",
      ],
      night: [
        "Out of my kitchen, it's late. Whatever you're after, it'll keep till porridge.",
        "Don't stand in doorways at this hour. It's bad luck. I made that up, but it is.",
        "{name}, is Nell in? Did you see Nell? ...Good. Good.",
      ],
    },
    about: [
      "Maudie Kettle. I cook, I sing, I married that one behind the bar, and I've fed every Tessariel that's walked through that door.",
      "Fed them. Couldn't keep them. Fed them, though.",
    ],
    ask: {
      tessariels: [
        "Good boys, most of them. Clean plates. You feed a man and he tells you about his mother. These couldn't remember theirs. Only her.",
        "The tall one cried into my stew. The one with the beard ate three bowls and went up the hill. I still wonder which of them was the brave one.",
      ],
      knight: [
        "Not over food. I won't have him talked about over food.",
        "Nell walked up the hill road to look at him. To look! I didn't sleep. She's not going again. She knows she's not going again.",
      ],
      dead: [
        "Bram says the lamps keep them off, so I keep lamps. Every window. I don't care what Elspeth charges for oil, and I've told her so.",
        "When I was a girl the dead stayed where you put them. You'd visit with a bit of cake. I'm not taking cake up there now.",
      ],
      lis: [
        "She ate my pie standing up and said it wanted salt. It did want salt. Nobody's ever said.",
        "Twice a year she's at my back door, rude as a goose. This time she brought you. I gave her the good bread. Don't know why. My hands just did it.",
      ],
      town: [
        "Busy, chick. Everyone eats, even under him. Especially under him.",
        "Same faces forty years. I've fed them all and buried a few, back when you could bury. Bellmourn's a big pot with the lid on tight.",
      ],
      nell: [
        "She looks at the Long Road like it owes her money. She'll go one day. I only want it not to be with one of them.",
        "She laughs at them. She laughs, and then she goes quiet and wipes the same mug for an hour. I know that quiet. I had it, at her age.",
      ],
      songs: [
        "Old ones. My mam's. Some had words you can't sing now, so I put new ones in. 'The light that does not set' is 'the jam that does not set'. It's true. My jam never sets.",
        "Bram says one day the wrong ears will hear me. Let them. Let them hang a woman for jam.",
      ],
    },
    topics: { nell: "Nell", songs: "Your songs" },
    barks: {
      morning: [
        "Porridge! Porridge for anyone with a spoon!",
        "Who's had the honey? Pip! I know your fingers.",
        "Oh, the jam that does not se-et, the jam of all my da-ays...",
        "Bread's late. Agnes is never late. What's happened?",
        "Kit, your face. Wash it. The other side.",
      ],
      day: [
        "Nell! Mugs! Not that face!",
        "Onions! Somebody fetch me onions before I cry for nothing.",
        "If you're standing about, you're peeling.",
        "Bram, taste this. Don't count it. Taste it.",
      ],
      evening: [
        "O bacon of the infi-inite, burn bright upon my pan...",
        "Supper! Bram, stop counting and eat!",
        "Sit down, sit down, it won't eat itself.",
        "Shine on, my little hearth that does not se-et...",
      ],
      night: [
        "Lamps in every window. Every window, Bram.",
        "Nell? Nell, are you in?",
        ringing("Hush now, bell, hush now, nobody's listening..."),
        quiet("Hush now, hush... oh. Nothing to hush. I'd got used to it."),
        "There's stew in the pot if anyone's awake. Or sad. Stew's for sad too.",
      ],
      work: [
        "More salt. There's always more salt.",
        "Who's been at my good knife?",
        "Stir it, stir it, don't let it catch...",
        "Bless this pot and all who... well. Bless the pot.",
      ],
      player: [
        "You've not eaten. I can see you've not eaten.",
        "Bones and a skull. Put the skull down when you're at my table. It watches me cook.",
        "{name}! Sit! Eat! In that order!",
        "You've a hungry look. I know that look.",
      ],
      magic: [
        "Not near my pans!",
        "Oh! Do that under the pot, would you?",
        "That's not natural. That's not right. Do it again.",
        "Bram! Bram, the thirteenth's doing tricks!",
      ],
      woken: [
        "What? Who's dead?",
        "If you've come for food, it's porridge at six. If you've come for Nell, I'll kill you.",
        "Bram. Bram! There's a Tessariel in the door.",
        "Is it the dead? Is it Nell? No? Then go to bed!",
      ],
    },
    bye: [
      "Come back for supper. You hear me? Come back.",
      "Go on, then. I'll keep a bowl back for you. I keep one back for all of you.",
      "Mind the step, chick. And mind you come back hungry.",
    ],
    // Seeing you off with nothing in your purse, the once (src/ui/folk.js gift).
    gift: { at: 'bye', say: "Take this. No, take it. It's a heel of bread, not a dowry.", note: "Maudie's heel of bread. You eat it before the door's shut.", heal: 14 },
  },

  nell: {
    first: [
      "Oh. You're new. Go on, give me the speech. I've a bet with myself on which one. The woman, or the Dark Lord?",
      { met: 'bram', say: "Dad's chalked you. And you didn't give him a speech, or he'd still have the face on. No face. Huh. That's new. Nothing here's new." },
    ],
    greet: {
      morning: [
        "You're up early for a saviour.",
        "Don't talk to me before the mugs.",
        "Morning. Hob's already told me about turnips. Twice. Say something else.",
      ],
      day: [
        "{name}! Has something happened? Nothing's happened. Hello.",
        "You again. Good. You're the only thing round here that changes.",
        "Back from wherever. Was it interesting? Lie if you have to.",
      ],
      evening: [
        "Sit at the end. They're about to sing.",
        "Same faces, same stools, same Hob. You're a holiday.",
        "You came back. They don't usually come back.",
      ],
      night: [
        "We're shut. I'm still up. Don't read anything into it.",
        ringing("Can't sleep either? It's the bell. It's always the bell."),
        quiet("Can't sleep either? It's the quiet now. I keep waiting for it."),
        "{name}. Sit a minute. Nobody talks to me at night but Jory, and Jory talks to his lantern.",
      ],
    },
    about: [
      "Nell. I pour, I wipe, I listen to Hob talk about turnips. Nineteen years. You'd think it would have got interesting.",
      "I've read every book Orrin has that isn't about bells. There are four.",
    ],
    ask: {
      tessariels: [
        "They're the best thing that's ever happened here, and they're all going to die. Both are true. I've stopped picking one.",
        "Was she beautiful? The woman. They always say beautiful. Just once I'd like one of you to say 'plain, with a nice laugh'.",
        "The fourth one asked me to wait for him. I said I'd been waiting nineteen years, what's a week. He didn't come back. It didn't even hurt. That's the bad part.",
      ],
      knight: [
        "I walked up the hill road to look at him. Not close. He didn't move, not once. I came home and my mother cried. Best afternoon I've had in years.",
        "Cedric Ashby calls him a real knight. Cedric would. Cedric's never stood that still in his life.",
      ],
      dead: [
        "Hob says it's only wolves. Hob thinks everything's wolves. He said that about the knight.",
        "The lamps keep them off, everyone says. So the whole town's agreed to be afraid of the dark again. Very grown up.",
      ],
      lis: [
        "She sits by the door with her back to the wall and watches everyone who comes in. Like my father. Only he's counting. I don't know what she's doing.",
        "There's a woman on the lanes after dark that nobody knows. Hob says she's lovely. Hob's never called anything lovely. Not even a turnip.",
      ],
      town: [
        "You can see all of Bellmourn from the well. I have. Every day.",
        "The road goes two ways out of here, and I've never been down either.",
      ],
      leaving: [
        "There's a city at the end of the Long Road with a hundred inns and nobody who knows me. I'd like to be bored there, for a change.",
        "If you're going to the Throne, it's that way. I've always wanted to know what's that way.",
        "I'll go when the knight's gone. Or when you are. Whichever's first. Don't tell my mother.",
      ],
    },
    topics: { leaving: "Leaving" },
    old: [
      "Huh.",
      "Every one of them said beautiful. Every one. I used to wish one of you would say something different.",
      "...Old how? No. Don't tell me. I've changed my mind. I like being bored.",
    ],
    barks: {
      morning: [
        "Mugs. Mugs. Mugs. My whole life is mugs.",
        "Same sky. Same road. Same mugs.",
        "Morning, Hob. Turnips? Turnips.",
        "Who's left a Tessariel asleep on the step? Oh. It's a sack.",
      ],
      day: [
        "Another speech in the square. I can hear it from here.",
        "Nothing's interesting till past noon. Nothing's interesting after, either.",
        "Two ales, one cider, and Dob's on credit. He isn't, but he thinks he is.",
        "Cedric, say 'real knight' once more and you're wearing this.",
      ],
      evening: [
        "She's singing. Somebody stop her. Nobody stop her.",
        "Hilde's dancing. Clear the tables.",
        "Same faces. Same songs. Same me.",
        "Wenna, sing the sad one. Somebody in here needs to cry and it isn't me.",
      ],
      night: [
        ringing("Three. There. Now I can sleep."),
        quiet("Midnight, and nothing. I liked it better when something happened."),
        "Somebody's on the lane. Walks like she owns it.",
        "Just me and the lamps. Wonderful.",
        ringing("One day I'll be somewhere the bell doesn't reach."),
        quiet("Bell's stopped. Road's still there. Still never been down it."),
      ],
      work: [
        "Coming. Coming. I said coming.",
        "Wipe your own spill, Dob. I'm not your mother.",
        "That's full, that's full, that's half, Bram.",
        "Somebody ordered an ale and walked off. Somebody's drinking it. It's me.",
      ],
      player: [
        "You're the one with the skull.",
        "Does it talk? The skull. I'd ask, if mine did.",
        "{name}. Tell me something that happened. Anything. Lie.",
        "You walk like you've somewhere to be. Nobody here has somewhere to be.",
      ],
      magic: [
        "Do that again. Slowly.",
        "That's the first interesting thing since the knight.",
        "Teach me. No. Take me. No. Do it again.",
        "Do that at the well tomorrow. I'll sell seats.",
      ],
      woken: [
        "Sleep? In this town? Go on, what is it?",
        "If you're running away, I'm coming. If not, get out.",
        "What is it? Is something finally happening?",
        "Go away. Unless it's interesting. ...It's not, is it.",
      ],
    },
    bye: [
      "Go on. Don't die. It's boring when you die.",
      "Bring me something back from that way.",
      "See you tomorrow. I'll be here. Obviously.",
    ],
  },

  pip: {
    first: [
      "You're the new one! I knew it. I said a thirteenth was coming, I said it to Kit. Are you going to give a speech? Can I watch you die? Not die. Fight. Can I watch you fight?",
      { met: 'kit', say: "Kit said you'd got a skull. Kit says everything after me, so I didn't believe him. ...You've GOT a skull! Whose was it? Don't tell Kit he was right." },
    ],
    greet: {
      morning: [
        "{name}! I've got news. It's a copper. It's good news. Mostly.",
        "You're alive! Kit owes me a button.",
        "Morning! I've done four errands already. You've done none.",
      ],
      day: [
        "Did you kill anything? What did it look like when it died?",
        "Have you been up the hill yet? You have to tell me first. Before Hal.",
        "Watch this. This is you.",
      ],
      evening: [
        "You're back! Kit said you'd be dead. I said you wouldn't. I won his button.",
        "Are you telling stories tonight? I'll do the voices.",
      ],
      night: [
        "I'm not up. I'm asleep. This is a dream.",
        ringing("Did you hear it? Three. I counted. Dad counted. We got the same."),
        quiet("It didn't go again. I stayed awake to check. Kit fell asleep checking."),
      ],
    },
    about: [
      "Pip Kettle. I do errands, news, and Tessariels. I can do all twelve. Want to see the one who fell down the well?",
      "Kit's my brother. He copies me. Don't encourage him.",
    ],
    ask: {
      tessariels: [
        "This is the loud one: 'I AM THE BEACON!' This is the one who cried. This is the one who walked into the well. He was all right. He was wet.",
        "Number nine gave me a whole gold piece for carrying his sword to the last lamp. Then he went up the hill. I've still got it. I'm keeping it for when he comes back.",
      ],
      knight: [
        "He's nine feet tall and he eats Tessariels. Hal says eight. Hal's never seen him. I've seen him from the oak.",
        "I watched him from the top of the oak till it got dark. He never blinked. Hal says he's got no eyes. Everybody's got eyes. I'm not going to check.",
      ],
      dead: [
        "Corran says they go about in packs, like dogs. I've got a stick. I've got two sticks. One's Kit's.",
        "Mum makes us put a lamp in every window. Even the privy. Even the dead don't want to go in the privy.",
      ],
      lis: [
        "Old Lis has one tooth and it's black. She cuffed me for nothing. Well. For something. Well. For the frog.",
        "She's a real witch. She turned Hal's hair white. Hal says it's flour. Hal would say that.",
      ],
      town: [
        "It's the best town. It's got a well, and a knight, and dead people, and you.",
        "Nothing ever happened here, then everything happened. I was ten for all of it.",
      ],
      news: [
        "News for a copper: the reeve's frightened of his wife. That's old. That one's free.",
        "Real news: there's a lady on the lanes at night, and Jory says she's the most beautiful lady ever, and Jory's sixty-six. That's two coppers. You can owe me.",
        "News: Ivy's marrying Dob when the roof's on. That's not news. That's never.",
      ],
      silver: [
        "Forty-one times round the green yesterday. I counted. Today's number's a copper.",
        "He stops at the corners and folds his arms, like Dad does at Dob. I said hello nine times. He nodded at nine.",
      ],
    },
    topics: { news: "Any news?" },
    barks: {
      morning: [
        "News! News for a copper! Some of it's true!",
        "Errands! Errands done fast! Faster than Hal!",
        "Mum, I'm going! I'm gone!",
        "Kit, come on! Kit! You're slow!",
      ],
      day: [
        "I AM THE BEACON! Kit, you're the knight. Stand still.",
        "Hal, you're dead. You got killed. Lie down.",
        "This is the one who walked into the well!",
        "Fresh news! The reeve sneezed! It's not that fresh.",
        "Three went up the hill, and AAAAH, and that's all you hear!",
        "Silver man's on sixteen! Seventeen! He's doing the corners slow today!",
      ],
      evening: [
        "One more game! One more! ONE more!",
        "I'm not tired. Kit's tired. Look at him.",
        "Do the hymn with the bacon in, Mum!",
        "Watch, everyone! This is the thirteenth!",
      ],
      night: [
        ringing("I'm not scared of the bell. Kit is."),
        ringing("One... two... three. See? Nothing. Go to sleep, Kit."),
        quiet("No bell now. So how do you know when it's midnight? You don't. It could be now."),
        quiet("It's not going to go, Kit. I said. ...Kit? You awake?"),
        "Kit, stop breathing so loud.",
        "If the dead come, I'll do the Beacon voice at them.",
      ],
      work: [
        "Bread for Mum! Out the way!",
        "Errand! Errand! Mind!",
        "Message for Silas! It's private! It's about coffins!",
        "Dad says two coppers for the oil, Elspeth, not three. ...He says three.",
      ],
      player: [
        "Are you going up the hill? Can I come to the bottom?",
        "Show us the skull. Just a look.",
        "{name}! Want news? It's about you.",
        "Do the thing! Do a thing!",
      ],
      magic: [
        "DO IT AGAIN!",
        "That's better than all twelve! I can't even do that one!",
        "I'm telling everyone! Two coppers each!",
        "Kit, did you see? You didn't see. I saw.",
      ],
      woken: [
        "I wasn't doing anything.",
        "Is it the dead? Is it a fight? Can I come?",
        "Shh! You'll wake Kit, and then he'll copy me being awake.",
        "Is it morning? It's not morning. Is it news?",
      ],
    },
    bye: [
      "Bye! If you die, can I have the skull?",
      "Don't die! Or if you do, remember how, and tell me.",
      "Go on! I'll tell everyone you're brave. A copper and I'll say very.",
    ],
  },

  kit: {
    first: [
      "Pip! Pip, it's the... Pip's not here. Hello. Are you thirteen? I'm seven.",
      { met: 'pip', say: "Pip's met you already. ...So I'm second. Hello. Are you thirteen? Pip says. I'm seven." },
    ],
    greet: {
      morning: [
        "Pip says good morning. ...Good morning.",
        "{name}! I've got news. It's a copper. ...It's Pip's news.",
        "You're alive. ...I owe Pip a button.",
      ],
      day: [
        "Did you kill anything? ...What did it look like?",
        "I'm on an errand with Pip. He's gone. I'm still on it.",
        "Have you been up the hill? You have to tell Pip first. Then me.",
      ],
      evening: [
        "I lost my button. To Pip. Because you're not dead.",
        "Pip's doing you. He's good at you. I'm better at the knight.",
      ],
      night: [
        "I'm asleep. This is a dream. ...Pip said.",
        ringing("One, two, three, then I can sleep. Did it go yet?"),
        quiet("It doesn't go now. So when can I sleep? Pip says whenever. That's not a time."),
      ],
    },
    about: [
      "Kit. I'm Pip's. I mean, I'm Pip's brother.",
      "I'm seven. Pip's ten. When I'm ten, he'll be thirteen. Like you.",
    ],
    ask: {
      tessariels: [
        "I AM THE BEACON! ...That's Pip's. I've got one too. This is the one who cried.",
        "Number nine's gold piece is in Pip's shoe. The left one. Don't tell him I said.",
      ],
      knight: [
        "He's nine feet tall. ...Eight. Hal says eight. ...Pip says nine.",
        "I'm the knight in the game. I stand still and everyone dies. It's the best part, but you mustn't laugh.",
      ],
      dead: [
        "I've got a stick too. It's Pip's old one. It's smaller.",
        "Tam asked if they're cold. Nobody said. I think they're cold.",
      ],
      lis: [
        "She cuffed Pip. For the frog. I didn't do the frog. I held it.",
        "She looked at me for a long time and I didn't cry. Pip says I cried. I didn't cry very much.",
      ],
      town: [
        "It's the best town. It's got a well. ...And a knight. And dead people. And you.",
        "Mum says don't go past the last lamp. I don't. I go to it and touch it.",
      ],
      bell: [
        ringing("It does three. I count with Dad. One, two, three. Then it's finished and I can go to sleep."),
        ringing("Once I counted four. Dad said I counted wrong. Dad doesn't count wrong. So I did."),
        quiet("It stopped. I still count. One, two, three, and nothing comes, so I count again."),
        quiet("Dad says it's finished. Dad doesn't count wrong. ...I listen anyway. In case it forgot."),
      ],
    },
    topics: { bell: "The bell" },
    barks: {
      morning: [
        "...Some of it's true!",
        "News! ...News for a copper!",
        "Pip! Wait! PIP!",
        "Mum washed my face. Both sides.",
      ],
      day: [
        "I AM THE BEACON! ...No, I'm the knight. I'm always the knight.",
        "I'm dead. I got killed. Pip said.",
        "...and AAAAH! And that's all you hear!",
        "I'm standing still. I'm the knight. Don't make me laugh.",
      ],
      evening: [
        "Is it bedtime? Pip says it's not bedtime. ...It's bedtime.",
        "One more game! ...One more!",
        "I'm not tired. Pip's tired. ...Look at him.",
        "Do the bacon one, Mum!",
      ],
      night: [
        ringing("One... two..."),
        quiet("One... two... ...Pip, it didn't."),
        "I'm not scared. Pip's not scared. ...Pip?",
        "Pip, you're breathing loud.",
        ringing("Is it three yet? I want it to be three."),
        quiet("Pip, is it midnight? How do you know?"),
      ],
      work: [
        "Bread for Mum! ...Out the way!",
        "Errand! ...Errand! Mind!",
        "Wait for me! I've got the bread! Half the bread!",
        "Message for Silas! ...What was the message, Pip?",
      ],
      player: [
        "Are you thirteen?",
        "Show us the skull. ...Just a look.",
        "Do a thing! ...Do the thing!",
        "Pip says you're brave. He said very, so you paid.",
      ],
      magic: [
        "...DO IT AGAIN!",
        "Pip! Pip, did you see? PIP!",
        "I saw first. I saw first and Pip didn't.",
        "Can you do it small? I'm small.",
      ],
      woken: [
        "Is it morning? ...Is it news?",
        ringing("Is it the bell?"),
        quiet("Is it midnight? It didn't go. I listened."),
        "I wasn't doing anything. ...Pip wasn't either.",
        "Is it a dream? Pip says if it's a dream I can fly.",
      ],
    },
    bye: [
      "Bye! ...Don't die!",
      "If you die, Pip gets the skull. ...I get the teeth.",
    ],
  },

  orrin: {
    first: [
      "Ah. You're... forgive me. I'd a theory someone like you would come, and I'd hoped to be wrong, which is a novelty for me. Orrin Vey. Scholar. That staff, where did you... no. Later. I'll forget, but later.",
      { met: 'bram', say: "Bram's chalked you. He showed me the stroke, as if I'd want to see it. I did, rather. Orrin Vey. Scholar. The old texts... no, I'll check first. I always check, then forget I checked, then check again." },
    ],
    greet: {
      morning: [
        "Good morning. Or it was. I've been reading since four and I've no idea.",
        "Ah, {name}. I was just... what was I just?",
        "Sit. No, not there, that's a chapter.",
      ],
      day: [
        "I found the passage. Then I lost it. But I found it.",
        "Still in one piece. By every precedent I have, that's remarkable. Personally, I'm pleased.",
        "Have you been below? Tell me the turns. Left or right at the foot of the stair. It matters more than you'd think.",
      ],
      evening: [
        "I spent the afternoon in the square. Sold no scrolls. Two people asked if I was dead.",
        "Maudie's singing the one with the jam tonight. I believe it's older than the kingdom. Don't tell her. She'll sing it louder.",
      ],
      night: [
        ringing("Is it midnight yet? I like to be awake for it. For the notes."),
        quiet("Nearly midnight. I still sit up for it, pencil ready. Nothing comes. I write that down."),
        "Can't sleep? Nor I. I've been arguing with a dead author. I'm losing.",
      ],
    },
    about: [
      "Orrin Vey, of nowhere you'd know. I came for six weeks to read the cathedral library. That was twenty years ago. I'm still on the second shelf.",
      "I lodge in the Kettles' back room with the books and the damp. Bram charges me half. I pretend not to know why.",
    ],
    ask: {
      tessariels: [
        "Twelve men, each wholly certain, each told by a beautiful woman. Certainty is cheap. That much of it, in one shape? Somebody is making them. I'd very much like to know who, and rather less to find out.",
        "I tested one. I asked him the Seven Names of the Beacon. He gave all seven, in the old order, in the old tongue. Then I asked where he was born, and he cried.",
      ],
      knight: [
        "No banner. No word. Nothing on the shield. In every account I've read, that is a man who doesn't need to say whose he is.",
        "He stands on the third step from the door, not the top. I've wondered why for a month. I think it's the drain. No. I don't know. I'd like to measure it.",
      ],
      dead: [
        "The watch thinks it's the lamps keeping them out. It isn't the lamps. It's what the lamps are standing on.",
        "The catacombs go down three levels, if the plan's right. I copied the plan myself, so it's right, except where it isn't.",
      ],
      lis: [
        "Old Lis. Twenty years I've known her, and she hasn't aged a day, which, at her age, is either a mercy or a method.",
        "She walked you down. In twenty years she's never walked anyone down. I find I don't want to ask her why. That's a new feeling. I've written it down.",
        "The woman on the lanes after dark? I saw her once, from behind. She walked exactly like someone. I've decided not to remember who.",
      ],
      town: [
        "Bellmourn sits where the Long Road crosses something much older than roads. Nobody here wants to hear that. They want the price of salt.",
        "A good town. Curious about nothing, kind about most things. I've been happier here than a scholar has any right to be.",
      ],
      library: [
        "Four thousand books, and the knight standing on the door to all of them. I'd go up and ask him to step aside, but I suspect he isn't a reader.",
        "Twenty years I read in there and nobody minded. Nobody minds a man reading about drains. I'd give a great deal to be reading about drains this afternoon.",
      ],
      magic: [
        "What you do with your hands. Fire from nothing, frost from a dry palm. It isn't in any book I own, and I own the ones that claim it is.",
        "Would you... not now. Some day. Would you do it slowly, while I take notes? I'd pay you. I can't, but I'd want to.",
      ],
    },
    topics: { library: "The library", magic: "My magic" },
    old: [
      "I see.",
      "Twelve accounts, all one shape. And the thirteenth is the wrong shape.",
      "...Forgive me. There's something I must look up, and I'd rather not find it.",
    ],
    barks: {
      morning: [
        "Sixty-one, sixty-two... somebody's moved sixty-three.",
        ringing("Three tolls. Not four. Write that down, Orrin. You have. Good."),
        quiet("No tolls. Write that down, Orrin. You have. Again. Good."),
        "Porridge, then the third volume. Or the third volume, then porridge.",
        "Who's been lighting the fire with my notes? Maudie.",
      ],
      day: [
        "Scrolls! Fair copies! Don't sneeze on them!",
        "The Survey is wrong about the drains. I'll say it again. Wrong.",
        "Scrolls! Does anyone read? Anyone at all? Hob, put it down.",
        "If the stair turns left at the fourth landing... no. Right.",
      ],
      evening: [
        "Supper already? I've only just had... no, that was yesterday.",
        "Another chapter. Then supper. Then another chapter.",
        "Maudie, sing the one with the jam. I'm writing down the jam.",
        "The light's going. Pity. I was nearly right about something.",
      ],
      night: [
        ringing("Ah. There. One... two... three. And no fourth. Good."),
        quiet("Midnight. Nothing. ...And still nothing. Hm."),
        "One more page. One more page. One more page.",
        "Somebody's walking in the lane. Lightly. Hm.",
        "Bolt the door, Bram. Yes, I know you have. Again, then.",
      ],
      work: [
        "Hm. Hm. No. Hm.",
        "Crypt under the tower. Warden under the crypt. And under the warden? Hm.",
        "This page is wrong. That page is wrong. This one's mine. Also wrong.",
        "Ink. Where's the... on my hands. And my face. Lovely.",
      ],
      player: [
        "Ah! Don't move. You're standing in my good light.",
        "{name}, a question. Left hand or right, when it burns? It matters. I think.",
        "Have you seen... never mind. You haven't.",
        "You've been below. You smell of the third level. I'd know that damp anywhere.",
      ],
      magic: [
        "Again! Slower! Which hand? What did you say?",
        "No book. No book at all. Goodness.",
        "That's not in the Survey. That's not in anything.",
        "I'm seventy. I'd thought I'd seen my last new thing.",
      ],
      woken: [
        "Mm? I'd got to the good part of a dream. It was footnoted.",
        "Is it important? I've a pencil somewhere. I'm lying on it.",
        "Mm. Yes. Drains. What? Oh. You.",
        "If it's urgent, speak up. If it's scholarly, speak slower.",
      ],
    },
    bye: [
      "Go carefully. Or go quickly. One of those. I've read that both work.",
      "Come back and tell me what's down there. Exactly. Measurements, if you can.",
      "Mind you don't die. I've so many questions.",
    ],
    shop: {
      open: [
        "Scrolls, copied in my own hand from books nobody's supposed to have. Read one aloud and it'll do something. I never managed it. You might.",
        "Fair copies, all of them. That one's less fair. I sneezed. It should still work.",
      ],
      closed: [
        "Not now. Scrolls want daylight and a table. I sold Hob one by candlelight once. It was a recipe for pickled eggs.",
        "Find me in the square on a fair day, or at my table by daylight. Never in my nightshirt. I have standards. Two.",
      ],
      buy: [
        "A good choice. Or a bad one. I'm never sure with that one. Don't read it indoors.",
        "Take it. Read every word. The ones you can't say, say anyway.",
      ],
      sell: [
        "You'll part with it? I'll give you something. Less than it's worth, I'm afraid. I learned that from Magda.",
      ],
      poor: [
        "Ah. You're short. So am I. Always. Come back when one of us isn't.",
      ],
    },
  },

  // ---------------------------------------------------------------- The chandler's
  elspeth: {
    first: [
      "No. Don't open your mouth. I've had twelve speeches and paid for none of them. Candles are a copper, oil's three, and if my sister told you different, she lied.",
      { met: 'magda', say: "You've been at my sister's stall. You've your hand on your purse. Good. Whatever she said about me, it's true, and she's worse. Candles a copper. Oil's three." },
    ],
    greet: {
      morning: [
        "You. Wipe your feet. That's wax on the floor, not mud, and I scraped it.",
        "Morning. Still alive. My sister bet against it. She'll say she didn't.",
        "Early. Good. Late people buy nothing.",
      ],
      day: [
        "Back again. Buying, or standing in my light?",
        "Magda's told you something about me. It isn't true. Unless it's bad. Then it's half true.",
        "{name}. Don't touch the tapers. I know you weren't going to. Don't.",
      ],
      evening: [
        "Lamps lit? Good. Somebody in this town listens.",
        "You'll want oil. Everyone wants oil at dusk. Nobody wants oil at noon.",
      ],
      night: [
        "Shop's shut. The lamps aren't. Praise... well. Praise nobody.",
        "At this hour? Is something on fire? Then it's not my business.",
      ],
    },
    about: [
      "Elspeth Tallow. I make the light in this town. Nobody thanks me, and they all complain when it gutters.",
      "I've a twin. You'll meet her. She'll tell you she's the pretty one. We're twins.",
    ],
    ask: {
      tessariels: [
        "Tin-pots. Twelve walking kettles with one idea between them, and the idea was a woman's.",
        "The seventh bought a candle and asked me to bless it. I said, it's tallow. It's a sheep. He cried on it. Ruined it. He paid, I'll say that for him.",
      ],
      knight: [
        "A man in a black tin. Not Himself, whatever Magda says. Himself wouldn't stand about on a step. He'd send someone. He has.",
        "Nobody's buying grave-candles, because nobody's being buried. One man on a step, and my whole funeral trade's gone. Tell him that.",
      ],
      dead: [
        "Every lamp in Bellmourn burns my oil, and the dead don't come in. Work it out.",
        "I've put oil up a copper. Yes, again. Everyone wants light now. Nobody wanted it before.",
      ],
      lis: [
        "Lis is rude, mean, filthy and fair. Pays what she owes. I'd trust her before my sister, and I've known my sister longer.",
        "There's a woman walks past my shutters after dark. Tall. Walks like the lane's hers. I've never once sold her a candle, and everyone buys my candles.",
      ],
      town: [
        "Smaller every year. Darker every year. Good for trade. I hate it.",
        "Forty years I've lit this town. I could walk it blind. Some nights I nearly have to.",
      ],
      magda: [
        "Magda lies. Not big lies. Little ones, all day, like a dripping tap. She'll tell you she's the elder. I'm the elder, by an hour, and I was quieter about it.",
        "We share a bed. Seventy years. She's had the warm side since the cradle, and I'll not give her the whole thing as well.",
      ],
      wren: [
        "Wren thinks the big oaf at the forge is Tessariel. Well. She's twelve. At twelve I thought Magda was honest.",
        "She comes home from that forge black to the eyes and singing. Don't tell her I said singing. She'd stop.",
      ],
    },
    topics: { magda: "Your sister", wren: "Wren" },
    barks: {
      morning: [
        "Wicks. Wax. Wicks. Who's moved my wicks?",
        "Shutters up. Light's for paying customers.",
        "Magda took the warm side again. Seventy years.",
        "Up before the bread. Somebody has to be.",
      ],
      day: [
        "Candles a copper! Oil three! Not two, Magda, three!",
        "Off my step. You're in the light. My light. That I made.",
        "Tin-pot. Tin-pot. Tin-pot. Where do they come from?",
        "Wren! Your face! Wash it! ...Not with that!",
      ],
      evening: [
        "Lamps! Lamps, all of you! Do you want to wake up dead?",
        "Every window, Hob. That's not every window.",
        "Last of the oil! Then don't come knocking.",
        "Dusk, and they all remember me.",
      ],
      night: [
        "Wren, bed. And blow that out. That's my wax.",
        "Shut. Shut. Read a sign.",
        "Magda. The blanket.",
        "If that's my sister at the door, she's sleeping in the lane.",
      ],
      work: [
        "Dip, cool, dip, cool. Seventy years of dip and cool.",
        "Too thin. Too thin. That'll gutter in a week.",
        "Who taught this wick to lean? Wren.",
        "Smells of mutton. It's tallow. It's supposed to.",
      ],
      player: [
        "Don't touch the tapers.",
        "You've wax on your sleeve. Not mine. Cheap stuff.",
        "You smell of the dark. Buy a lamp.",
        "Stand there much longer and I'll charge you rent.",
      ],
      magic: [
        "Put that out! There's a whole street of tallow!",
        "Do that near my shop again and I'll bill the Throne.",
        "Hm. Free light. That's me finished, then.",
        "Wren saw that. Now I'll never hear the end of it.",
      ],
      woken: [
        "Magda, it's for you. ...Oh. It's for me.",
        "If the shop's on fire, say so. If it isn't, go away.",
        "I sleep with a candlestick. I'll use it.",
        "What? Who? Oil's three. Go to bed.",
      ],
    },
    bye: [
      "Go. Buy a lamp next time. Where you're going, you'll want one.",
      "Don't believe my sister.",
      "Off with you. Mind the wax.",
    ],
    shop: {
      open: [
        "Candles, a copper. Oil, three. Wicks free if you don't haggle. You will. You've a haggling face.",
        "Tallow for the poor, wax for the reeve, oil for everybody. Which are you?",
      ],
      closed: [
        "Shut. The candles are asleep, and so should you be.",
        "Come back when the shutters are up. I don't sell in the dark. I'd be giving it away.",
      ],
      buy: [
        "There. Light. Don't waste it.",
        "Keep it trimmed. A smoking wick's a lazy wick, and so's its owner.",
      ],
      sell: [
        "I sell. I don't buy. My sister buys. She's in the square under the striped cloth, lying.",
      ],
      poor: [
        "Then you'll sit in the dark like the rest of them. No credit. Credit's how Magda got the way she is.",
      ],
    },
  },

  magda: {
    first: [
      "Oh, a new one! Don't tell me where you've been, dear, I'll hear it better from someone else. Anything you drag out of a hole, you bring it to me. I give a good price. Not the best. Good.",
      { met: 'elspeth', say: "You've met my sister, I can tell, you've got the face. Don't mind Elspeth. She came out frowning. Mother said she frowned at the midwife." },
    ],
    greet: {
      morning: [
        "Morning, dear! I've heard something about you. Several things. One of them's lovely.",
        "{name}! You're up! I said to Elspeth, that one's up. She said nothing. That's agreeing, with her.",
      ],
      day: [
        "Anything from a hole, dear? I'll take anything from a hole.",
        "There you are, dear. People are saying things. I'm saying some of them.",
        "Come and look. New stock. Old stock, but new to you.",
      ],
      evening: [
        "Packing up, dear, but for you I'll unpack. A little.",
        "{name}, you'll never guess. No, guess. No, I'll tell you.",
      ],
      night: [
        "Shh. You'll wake Elspeth, and she bites.",
        "Oh! At this hour! I won't tell a soul. I'll tell one.",
      ],
    },
    about: [
      "Magda Tallow. Gems, oddments, and the truth for a little extra. I'm the elder twin, dear, by a whole day. Elspeth won't tell you. She's ashamed she was slow.",
      "I buy anything. I bought the third one's spurs off him. He wasn't using them. He'd stopped using anything, poor lamb.",
    ],
    ask: {
      tessariels: [
        "Lovely boys. Every one a prince somewhere, I'm sure of it. I have it on good authority one was king of the south. My authority, but it's very good.",
        "Elspeth calls them tin-pots. I call them stock. Not unkindly. Somebody's got to keep their spurs in circulation.",
      ],
      knight: [
        "That's no knight, dear. That's Himself, come about the bell. Elspeth says he's a man. Elspeth's never been right about a man in her life. Ask her husband. You can't. He's dead.",
        "I heard he's hollow. Nothing in the armour at all. I heard it from me, but I'm very reliable.",
      ],
      dead: [
        "I hear they're getting clever. I hear one knocked at the bakehouse. Hal let it in, Agnes threw it out. It's all very hushed up. I'm hushing it now.",
        "Bring me what they drop, dear. Bone, iron, that silky stuff. I'll give you a fair price. Near enough fair that you won't notice.",
      ],
      lis: [
        "Lis and I go back. She taught me a charm for warts. It does nothing. But she taught it me, and that's friendship.",
        "Elspeth says Lis is honest. Lis once sold me a bottle of moonlight. It was water. But it was very good water.",
      ],
      town: [
        "Oh, it's the best little town, dear. If you don't count the knight. Or the dead. Or the tithe. Or my sister.",
        "Everyone in Bellmourn owes me something, or thinks I owe them. That's a town, dear. That's all a town is.",
      ],
      elspeth: [
        "She'll say I lie. I don't lie, dear, I embroider. There's a difference, and it's about a copper.",
        "We share a bed because neither of us will take the floor. Seventy years. She kicks. I've not had a night's sleep since the old king.",
      ],
      rumours: [
        "Here's one, fresh: the reeve's wife writes letters to the Throne. Here's another: I made that up. Here's a third: I didn't.",
        "The lady on the lanes at night? The Dark Lord's daughter, dear, come shopping for a husband. That's why the Tessariels are all so handsome. Don't tell Elspeth. She'll want one.",
      ],
    },
    topics: { elspeth: "Your sister", rumours: "Heard anything?" },
    barks: {
      morning: [
        "Setting up! Lovely things! Lovely prices! Mostly lovely!",
        "Elspeth took the blanket again. I'll tell everyone.",
        "Morning, Agnes! What's the news? I'll improve it.",
        "Who's got something from a hole? I can feel it in my knees.",
      ],
      day: [
        "Gems! Oddments! Don't listen to my sister!",
        "I'll buy it! Whatever it is, I'll buy it!",
        "That's a ruby, dear. Nearly.",
        "Have you heard? You haven't. Come here.",
      ],
      evening: [
        "Agnes! What did you hear today? I've heard better.",
        "Packing up, loves! Ask me tomorrow!",
        "Last chance! For today. There's always tomorrow.",
        "Elspeth, it's me! Don't bolt it! ELSPETH!",
      ],
      night: [
        "Elspeth, are you awake? ...She's awake. She's pretending. Seventy years.",
        "Elspeth. You've the blanket. Elspeth.",
        "Shh. I've something to tell you. Tomorrow.",
        ringing("Was that the bell? Was it four? I'll say it was four."),
        quiet("No bell again. I'll say it rang four. Who's to say it didn't?"),
      ],
      work: [
        "That's a ruby. Probably. Almost.",
        "Polish, polish. Shine sells.",
        "Ooh. Somebody's got something from a hole. I can smell it.",
        "Two coppers, dear, and that's robbing me. It's robbing you, but nicely.",
      ],
      player: [
        "There's my favourite Tessariel. Don't tell the other twelve.",
        "Come and see, {name}. Looking costs nothing. Today.",
        "Thirteen! Unlucky, dear! I've a charm for that.",
        "Have you heard what they're saying about you? I have. I started it.",
      ],
      magic: [
        "Oh! Do that on a stone, dear, see if it goes red. Red sells.",
        "Elspeth! ELSPETH! Come and see, so you can say you saw!",
        "I'll be telling that one for years. Bigger every time.",
        "Ooh. Can you make a gem? A little one? Nobody would know.",
      ],
      woken: [
        "Hush, dear. Elspeth's talking in her sleep. All lies. I'm writing them down.",
        "Is it a burglar? I've nothing. Elspeth has everything.",
        "Ooh, a midnight visitor! I'll tell everyone. Kindly.",
        "Elspeth, there's a stranger! ...Oh, it's you, dear. Never mind, Elspeth.",
      ],
    },
    bye: [
      "Bye, dear! Bring me something dead!",
      "Don't believe Elspeth. Believe me. I'm the elder.",
      "Off you go. I'll say nice things about you. Mostly.",
    ],
    shop: {
      open: [
        "Gems, dear, from all over. That one's from a king's crown. That one's from Wes's yard. Both lovely.",
        "Have a look. Touch, if you like. Elspeth won't let anyone touch. That's why she's poor and I'm comfortable.",
      ],
      closed: [
        "I've packed it all away, dear, wrapped in my good stockings. Come back when the stall's up.",
        "Not now, dear. My things are asleep. They're very delicate. Some of them are glass.",
      ],
      buy: [
        "Oh, you've an eye. I said to Elspeth, that one's got an eye.",
        "Wear it in good health. In good light, actually. It's better in good light.",
      ],
      sell: [
        "Oh. Oh, dear. Well, it's not worth much. I'll take it off your hands, as a kindness.",
        "From a hole? I love a hole. Here. For your trouble. And mine.",
      ],
      poor: [
        "Short, dear? I'd let you owe me, but Elspeth would hear, and I'd never be let forget it.",
      ],
    },
  },

  wren: {
    first: [
      "Stand still. Your staff's crooked at the head. The grain runs wrong. Homunculus could fix that. He's the real Tessariel, by the way. Everyone'll tell you he isn't. They're wrong.",
      { met: 'homunculus', say: "He's had a look at you, then. He said you've no sword. He said it like it was good. It is good. A sword's for men who can't think of anything else. He says." },
    ],
    greet: {
      morning: [
        "Your staff's still crooked.",
        "Morning. The forge has been lit an hour. I lit it. Don't tell him.",
        "Don't talk to me, I'm counting rivets.",
      ],
      day: [
        "I'm busy. I'm squiring.",
        "{name}! He said your name today. He said it properly. That's good.",
        "If you want him, he's in the middle of a pronouncement. Give it a minute.",
      ],
      evening: [
        "The forge is banked. He let me bank it. On my own.",
        "Did you hit anything with that staff? You should. It's what it's for. Mostly.",
      ],
      night: [
        "I'm not up. I'm fixing something. That's different.",
        "Both grans think I'm asleep. Both grans think a lot of things.",
      ],
    },
    about: [
      "Wren Tallow. Squire to Homunculus the Proud. He didn't ask. I told him. He said, 'The Light chooses its own.' I said, then it's chosen me.",
      "These are goggles. I made them. Sparks don't go in your eyes. Dusty says I look like a beetle. Dusty's got no eyebrows.",
    ],
    ask: {
      tessariels: [
        "They're fakes. They don't know it, so it isn't their fault. The real one's at the forge. Ask him. Actually, don't. He'll go till dark.",
        "The sixth one's sword was rubbish. You could see the seam. Homunculus offered to fix it for nothing and he said, 'It was forged in heaven.' Heaven can't weld.",
      ],
      knight: [
        "His armour's good. I looked from the oak with Pip's glass. It's really good. I hate that it's good.",
        "Homunculus will go up when the Light tells him. I'm going too. I'll carry the hammer. It's heavy. I've been practising with a brick.",
      ],
      dead: [
        "If they come into town, I've got a plan. It's mostly the forge. Don't tell Gran. Either Gran.",
        "Slow, but they don't stop, Corran says. So's a mill-wheel. You stop a mill-wheel with a bar in the right place.",
      ],
      lis: [
        "She said my goggles were the cleverest thing in Bellmourn. Then she spat. I think both meant something.",
        "Gran Elspeth says Lis is honest. Gran Magda says Lis is her friend. I don't think Lis has friends. I think she has a lot of salt.",
      ],
      town: [
        "Nothing in Bellmourn's ever properly fixed. That's good, if you're a squire.",
        "The well-crank was broken. I fixed it. It's broken again. Pip.",
      ],
      squire: [
        "A squire carries the hammer, keeps the coals, and reminds people who he is. They forget a lot.",
        "Dusty says there's no such thing as a squire to a blacksmith. There is now. There's me.",
      ],
    },
    topics: { squire: "Squiring" },
    barks: {
      morning: [
        "Coals, then bellows, then breakfast.",
        "Morning, Verdict. Morning, Patience.",
        "Dusty! You've let it go grey! Again!",
        "Gran, I washed. ...Other Gran, I washed.",
      ],
      day: [
        "That's not how you hold a hammer, Hal.",
        "Your game's stupid, Tilly. ...I'm the knight.",
        "Pip, give my glass back. I ground it. It's mine.",
        "He's the real one. Write that down. Somebody.",
      ],
      evening: [
        "Tilly, I'm not playing. ...Fine. I'm the smith.",
        "He let me quench it! On my own!",
        "Tongs on the rack, apron on the hook, sweep the scale.",
        "Bed. Fine. Bed. After this rivet.",
      ],
      night: [
        "Just one more rivet. Then bed.",
        "Gran, you're both snoring. In different notes.",
        "If the dead come, the forge is that way. I've drawn a map.",
        "One gran says there's a lady on the lane. One says there isn't. I'm going to look.",
      ],
      work: [
        "More air! More air, Dusty!",
        "The hammer's Verdict. The anvil's Patience. Get it right.",
        "Hold it. Hold it. Now!",
        "That's cherry. That's nearly straw. Quick!",
      ],
      player: [
        "Hold still, your hem's catching.",
        "Your skull's got a crack by the eye. I could pin it.",
        "Is that staff ash? It's ash. It wants oiling.",
        "He knows you're here. He's pretending he doesn't.",
      ],
      magic: [
        "How does it work? Where's the fuel? There has to be fuel.",
        "Do it again. I want to see where it comes out.",
        "That's not the Light. ...It's something. I'm writing it down.",
        "Could it heat iron? Don't tell him I asked.",
      ],
      woken: [
        "Is it them? Finally. I've been waiting to try the plan.",
        "I'm awake. I'm thinking. Go away so I can keep thinking.",
        "Is it him? Does he need me?",
        "Shh. Both grans. Both.",
      ],
    },
    bye: [
      "Get your staff looked at.",
      "Tell people he's real. It helps.",
      "Go on. I've got coals.",
    ],
  },

  // ---------------------------------------------------------------- The smithy
  homunculus: {
    first: [
      "Halt. Another who bears the name? No, do not speak. I see it on you. Robes. A staff. You have not even been given armour. Whoever sent you thought less of you than of the others. I find I like you.",
      { met: 'dusty', say: "Ah. The boy has been at you first. He will have told you what I mean. I mean a great deal more than that. You stand before Homunculus the Proud, and I find, already, that I like you." },
      { met: 'wren', say: "The girl has told you who I am. Good. She is never wrong about me. Welcome to my forge, pilgrim, and to Patience, my anvil, who has outlasted three kings, and will outlast this one. Quietly." },
    ],
    greet: {
      morning: [
        "The forge wakes! The iron wakes! {name} wakes! All is as it should be.",
        "Good morning, {name}. The sun rose without me again. I allowed it.",
        "Dawn. The hour of honest iron.",
      ],
      day: [
        "{name}. Patience is hot and Verdict is hungry. Speak.",
        "Ah. The other Tessariel. Come, stand by the fire. There is room for two of us. Barely.",
        "Behold. A hinge. Is it not, in its way, a miracle?",
      ],
      evening: [
        "Sit, {name}. Watch the coals. A man learns more from embers than from all the speeches of the twelve.",
        "The day's iron is done. Tomorrow's is still asleep in the earth.",
      ],
      night: [
        "Even the Light must bank its fire. Come back at dawn, {name}.",
        "Hush. The boy sleeps. Let him. He works harder than he lets me see.",
      ],
    },
    about: [
      "I am Homunculus the Proud, smith of Bellmourn, paladin of the Light, and, though the world is slow to see it, Tessariel.",
      "The woman came to twelve men and told them they were chosen. She did not come to me. Why? Because she knew I would look her in the eye and know my own name.",
      "Also I shoe horses. Gently. They are honest beasts.",
    ],
    ask: {
      tessariels: [
        "Twelve brave fools in borrowed silver. I do not mock them. I mended their buckles, and each stood very straight while I did it, as if I were knighting him. Perhaps I was.",
        "They wear the Light's colours over hands that have never struck iron. I have struck iron every day of my life. Which of us, would you say, is the Beacon?",
      ],
      knight: [
        "I have looked upon his plate from the hill road. It is the finest work I have ever seen. I would weep to break it. I will break it anyway. When the Light says.",
        "Whoever forged that harness had a master's hand and no heart at all. I could tell from the hill. A smith always knows.",
      ],
      dead: [
        "The dead wear coffin iron. Nails, hinges, old fittings. Bring it to me, and I will make it into something that remembers it was once honest.",
        "Let them come to my forge. Verdict has not yet met one. Verdict is curious.",
      ],
      lis: [
        "The old woman looked me over like a farrier looks at teeth. Then she said, 'Not you, big one.' Not you. She knew. She knew I was the one she could never fool.",
        "She calls me 'big one'. Never 'Tessariel'. She is careful. She is right to be.",
      ],
      town: [
        "Bellmourn is small and frightened and owes me money. I would die for every soul in it.",
        "I have shod every horse in this town and mended every gate. When I am revealed, they will say, 'We always knew.' They will not have known.",
      ],
      true: [
        "Consider. Twelve men were told they were the Beacon, and all twelve were wrong. So the Beacon must be a man nobody told. Nobody has told me anything for years.",
        "I do not need a beautiful woman to tell me. I have Verdict, and Patience, and the girl, who believes. That is three more than most saints get.",
      ],
      verdict: [
        "Verdict is my hammer. Patience is my anvil. Verdict falls, Patience bears it, and between them the iron learns what it is for. As do we all.",
        "Patience was my master's, and his master's. I asked why that name. He said, 'Because you'll need it, boy.' Only years later did I understand he meant me.",
      ],
    },
    topics: { true: "The true Tessariel", verdict: "Hammer and anvil" },
    barks: {
      morning: [
        "Rise, Bellmourn! The iron is waiting, and so am I!",
        "Dusty! The bellows! The dawn will not blow itself!",
        "Good morning, Patience. You look well.",
        "The Beacon is lit! Dusty, light the forge. I meant the forge.",
      ],
      day: [
        "Behold! A hinge! And yet, in its way, a miracle.",
        "Stand aside, good people. The Light is carrying a bucket.",
        "Who brings a lame horse to the Beacon? Bring her in. Gently.",
        "Wren, child! Back from the spark. Further. Good. Further.",
      ],
      evening: [
        "Wren, child. Home. Your grandmothers will blame me, and they will both be right.",
        "Rest now, Patience. You have borne enough for one day.",
        "Bank the fire, Dusty. Even glory sleeps.",
        "Verdict, to your hook. You have judged well today.",
      ],
      night: [
        "Sleep, Bellmourn. The Beacon keeps watch. With one eye.",
        "Even the Beacon sleeps. Lightly.",
        "Who walks out there? ...Only the night. Carry on, night.",
        ringing("The bell. Three. One day I will answer it."),
        quiet("The bell is silent. Someone answered it. I would have liked it to be me."),
      ],
      work: [
        "Verdict falls!",
        "Feel the heat, Dusty. Not with your hand. Never with your hand.",
        "The iron remembers! Do not let it cool!",
        "Again. Again. Again. There. Now it is a nail.",
      ],
      player: [
        "Your staff is crooked at the head. I say this with love.",
        "Ah, the lesser Tessariel. I say that also with love.",
        "Stand straighter, pilgrim. You are among smiths.",
        "{name}! Come. Admire something.",
      ],
      magic: [
        "Hm. Fire without a forge. I do not care for it. I am not jealous.",
        "Even so. Even so. It cannot weld.",
        "The Light shows itself in many ways. Mostly through me.",
        "Dusty, do not look so impressed. It encourages them.",
      ],
      woken: [
        "Who knocks at the Beacon's door at this hour? ...Ah. Quietly. The boy sleeps.",
        "The Light does not answer the door after dark. Dusty, tell them. ...Go away.",
        "A summons! I will get my hammer. ...It is not a summons? Then I will keep my blanket.",
        "A horse in trouble? No? Then dawn, pilgrim. Dawn.",
      ],
    },
    bye: [
      "Go with the Light. I will be along, when it calls me by name.",
      "Stand straight. You carry a staff from Homunculus's town.",
      "Farewell, lesser Tessariel. Do not die. It reflects on all of us.",
    ],
    shop: {
      open: [
        "Staffs. Not swords. You, I think, have no use for swords. Ash, iron-shod, some with the iron of the dead in them. Choose with your hands, not your eyes.",
        "Every staff on this wall I made, and every one is better than the hands that will carry it. Present company, perhaps, excepted.",
      ],
      closed: [
        "The forge is banked. A smith who sells by moonlight sells mistakes.",
        "Not now, pilgrim. Patience is cooling, and so am I.",
      ],
      buy: [
        "Good. That one will not fail you. If it does, it was you.",
        "Take it. Carry it as if someone were watching. Someone is.",
      ],
      sell: [
        "You return it to the forge. There is no shame in that. Even Verdict has been set down.",
      ],
      poor: [
        "The Light provides, pilgrim. The Light does not provide credit.",
      ],
    },
  },

  dusty: {
    first: [
      "He'll come over and say something big. It means hello. You can say hello back. He likes that.",
      { met: 'homunculus', say: "You've had the speech, then. 'Halt' means hello. 'I find I like you' means he does. Don't let it go to your head. He says it to horses." },
    ],
    greet: {
      morning: [
        "Morning. He's been up since four. He's said 'Rise, Bellmourn' eleven times.",
        "{name}. Coals are up. He isn't yet. Enjoy it.",
      ],
      day: [
        "Bellows. Can't stop.",
        "He's been waiting for you. He'll say he hasn't.",
        "If he says 'behold', it's a hinge.",
      ],
      evening: [
        "He's talking to the anvil. It's fine. It's a good anvil.",
        "We're done. He's still going.",
      ],
      night: [
        "He's asleep. Don't. He takes ages to stop being a paladin.",
        "Can't sleep? Me neither. He talks in his sleep. Mostly orders.",
      ],
    },
    about: [
      "Dusty. Dunstan, but no. I work the bellows and tell people what he means.",
      "He took me on when nobody would. He pays me. He's never once hit me. He thinks he's a saint. He's not far off.",
    ],
    ask: {
      tessariels: [
        "He mended all their buckles for nothing. Don't tell anyone. He wants people to think he charged.",
        "They come in, and he gives them the speech, and they give him the speech, and then they all stand there being Tessariel at each other.",
      ],
      knight: [
        "He says he'll go up when the Light tells him. That means when his knee's better. His knee's not getting better.",
        "He went up the hill to see the knight's armour for himself. He came back and didn't talk all day. He's never not talked all day.",
      ],
      dead: [
        "Bring us coffin iron. He'll call it 'the iron of the dead' for an hour. It's nails. They're good nails.",
        "He sleeps with the hammer by the bed now. He says it's tradition. It's not. It's new.",
      ],
      lis: [
        "She told him, 'Not you, big one.' He's been happy for a week. I'm not saying anything.",
        "She looked at me and said, 'That one'll outlive the lot of you.' I don't know what to do with that.",
      ],
      town: [
        "It's all right. Quieter than it was. More nails, less people.",
        "Everybody laughs at him. Then their gate breaks. Nobody laughs at him at the gate.",
      ],
      him: [
        "'Verdict falls, Patience bears it' means hit it on the anvil. 'The iron remembers' means don't let it cool. 'The Light provides' means no.",
        "He's the best smith on the Long Road. Everything else he says, take it or leave it. That bit's true.",
      ],
      wren: [
        "She's not a squire. There's no such thing. Don't tell her. She's better on the bellows than me.",
        "He moves her back from the sparks about forty times a day. He never shouts it. He shouts everything else.",
      ],
    },
    topics: { him: "Homunculus", wren: "Wren" },
    barks: {
      morning: [
        "He's up. So everyone's up.",
        "Coals. Water. Him.",
        "There it is. 'Rise, Bellmourn.' That's one.",
        "He's in a mood, Wren. A good one. A loud one.",
      ],
      day: [
        "Yes. Yes. More air. Yes.",
        "That's a hinge. He'll tell you it's a miracle. It's a hinge.",
        "Wren, the tongs. The other tongs.",
        "Pumping. Pumping. Still pumping.",
      ],
      evening: [
        "He's saying goodnight to the tools. All of them. By name.",
        "Done. Done. Not done. Done.",
        "He's thanking the anvil. Give him a minute.",
        "Sweep, hang, bank. Then food.",
      ],
      night: [
        "If you hear shouting, it's him. He's knighting someone in his sleep.",
        "Night.",
        "He's still talking. In his sleep. Mostly orders.",
        ringing("Three. Right. Sleep."),
        quiet("No bell now. He says the Light saw to it. The Light had help."),
      ],
      work: [
        "He means hotter.",
        "He means don't touch it.",
        "That's not a holy sign. He's burnt his thumb.",
        "'The iron remembers.' Hurry up, he means.",
      ],
      player: [
        "He's watching you. He does that. It's a compliment.",
        "Want a staff? Ask him. Then ask me what he said.",
        "Your staff's crooked at the head. He said. Wren said. Now I've said.",
        "{name}.",
      ],
      magic: [
        "He's going to pretend that's not impressive. Watch.",
        "Huh. ...Don't tell him I said huh.",
        "That's a long speech tonight, that is.",
        "Do it near the coals. Save me pumping.",
      ],
      woken: [
        "I'm up. I'm not up. What.",
        "What. ...What.",
        "If it's him, he's fine. If it's a horse, it's fine. Go away.",
        "Shh. You'll wake him. Then nobody sleeps.",
      ],
    },
    bye: [
      "Bye.",
      "Come back. He's better with someone listening.",
      "Mind the step. It's hot. Everything here's hot.",
    ],
  },

  // ---------------------------------------------------------------- The alehouse
  hilde: {
    first: [
      "Well! Look what the road's coughed up, and isn't it a long drink of something. Hilde Brewer. Best ale on the Long Road, two husbands buried, and both of them died smiling.",
      { met: 'ivy', say: "Ivy's told you about me. I can see it. She'll have said 'mind her'. Mind me, then, my lovely. Closely. Hilde Brewer, and the best ale on the Long Road." },
    ],
    greet: {
      morning: [
        "Too early for ale, they say. They say a lot.",
        "Morning, my lovely. You look like a night I had once.",
      ],
      day: [
        "{name}, you gorgeous ghost. Thirsty?",
        "There's my favourite stranger. Don't tell the others. They're mostly dead.",
        "Stand in my shade, my lovely. I'm a lot of shade.",
      ],
      evening: [
        "Sit close. It's cold, and I'm warm.",
        "Evening, my lovely. I'm dancing later. You're invited. You're required.",
      ],
      night: [
        "It's late, sweetness, and I've my sleeping face on. Off you go.",
        "Out alone at this hour? Brave. Daft. My favourite sort.",
      ],
    },
    about: [
      "Hilde Brewer. I brew, I laugh, I've buried two husbands. Both happy. Ask me how.",
      "And the little one with the crows is Lily, and anybody who frightens her goes in the vat. It's a big vat.",
    ],
    ask: {
      tessariels: [
        "Lovely shoulders on them, every one. Pity about the heads.",
        "The tenth one gave me his heart. Said so, in front of everybody. Went up the hill next morning. That's men. They give you their heart and leave you the slate.",
      ],
      knight: [
        "Nobody stands that still that long unless he's dead or waiting. I don't fancy either.",
        "Lily wanted to go and look at him. I told her he eats little girls. Might be true. I'll not find out with mine.",
      ],
      dead: [
        "Corran drinks here. He used to laugh. He doesn't now. That's how I know it's bad.",
        "I've a ladle that's broken two heads. If one of them comes for my girl, it'll break a third, dead or not.",
      ],
      lis: [
        "Lis drinks my ale like water and says it's water. Every year. One day she'll say it's good, and then I can die.",
        "Twenty years and she's never once flirted back. I respect that. I'm also working on it.",
      ],
      town: [
        "Good town for a drink. Better town for a second. After the third you stop minding the dark.",
        "I'd flirt with Old Horns himself if he came in for a pint. Quietly. Then I'd scrub.",
      ],
      husbands: [
        "First was Ned. Strong as a bull, heart like a sparrow. It gave out on our wedding night. Happy. Second was Lem. Fell in the vat. Also happy.",
        "I'm not looking for a third. I'm not not looking, either. Stand up straight.",
      ],
      lily: [
        "She talks to the crows. Says they talk back. Don't laugh. If they're telling her things, I want to know what.",
        "Anything happens to that girl, I don't care whose knight it is or whose throne. I'll go up that hill myself, and I'll bring the big ladle.",
      ],
    },
    topics: { husbands: "Your husbands", lily: "Lily" },
    barks: {
      morning: [
        "Lily! Shoes! Both of them!",
        "Who's for a morning mug? Nobody? Liars.",
        "Barrels out! And me!",
        "Morning, Bellmourn! You look terrible. I love you.",
      ],
      day: [
        "Ale! Brown ale! Best on the Long Road, and I'll fight you!",
        "Come here, handsome. No, the other handsome.",
        "Wes, you smell like a dead cow. Sit by me anyway.",
        "Garth! Lift that for me. Slowly. Thank you.",
      ],
      evening: [
        "Play something, somebody! I'm dancing whether you play or not!",
        "Who'll dance with a widow? Twice over?",
        "Maudie, sing the bacon one! I'll do the hips!",
        "Lily's in bed? Then I'm out of it.",
      ],
      night: [
        "Lily's in? Lily's in. Good.",
        "Ned, Lem, good night, wherever you are. Both happy.",
        "Is that the pretty one on the lane again? I'll not have competition.",
        "Bolt, and a chair against it. Not for me. For Lily.",
      ],
      work: [
        "Mind the barrel, it's got a temper. Like me.",
        "Stir it, taste it, bless it, drink it.",
        "Pour! Pour! Oh, that's a lovely head on it.",
        "This one's ready. This one's wicked. This one's for Lis.",
      ],
      player: [
        "Look at you. All robe and cheekbones.",
        "Stand still, my lovely. I'm looking.",
        "There's my gorgeous ghost.",
        "Is that skull spoken for?",
      ],
      magic: [
        "Ooh! Do that to my kettle, my lovely, and I'll pay you in kind.",
        "Whatever that was, do it again in the dark.",
        "Lily, inside. Now. ...Oh, it's pretty. Lily, come back, look.",
        "Well! I've had men show me less.",
      ],
      woken: [
        "Oho. Bit forward, this. ...Oh, it's you. Still forward.",
        "Shh! You'll wake the girl, and then you'll meet the ladle.",
        "If you're courting, it's dusk and flowers. Not this.",
        "I've a ladle under the pillow. Speak.",
      ],
    },
    bye: [
      "Off you go. Come back alive. It's better for trade.",
      "Don't let them kill you, sweetness. I've only just met you.",
      "Mind how you go. And mind how you come back. Slowly. Past me.",
    ],
    shop: {
      open: [
        "Ale. Brown, strong and honest. It'll put a little life back in you and a little sense out.",
        "Two copper a mug, my lovely. A kiss is not a copper. I've checked.",
      ],
      closed: [
        "Barrels are home and so am I. Come to the stall tomorrow and I'll pour you something wicked.",
        "In my nightshirt? Selling ale? I've a reputation. A good one, for once. Tomorrow.",
      ],
      buy: [
        "There you go, my lovely. Drink it slow and think of me.",
        "Down in one? Oh, I like you.",
      ],
      sell: [
        "I don't buy, sweetness. I only pour. Magda's the one for buying.",
      ],
      poor: [
        "Short? Pity. I'd let it go for a kiss, but Ivy's watching, and she tells.",
      ],
    },
  },

  lily: {
    first: [
      "The crows said you'd come. Not you. Someone. You'll do.",
      { met: 'hilde', say: "Mum talked about you all through supper. She did her hair after. ...Stop. You're in my game. That's the line. You're dead now. You can still talk." },
    ],
    greet: {
      morning: [
        "The crows are on the barn. Eleven. There were twelve yesterday.",
        "Morning. I'm a crow today. Caw. That means morning.",
        "Don't step on the line.",
      ],
      day: [
        "{name}, you're in the game. You're the horse.",
        "You're back. The greedy crow said you'd be back. He's greedy, but he's not wrong.",
      ],
      evening: [
        "Mum's dancing. Don't look. She shows her knees.",
        "The crows go to bed before me. That isn't fair.",
      ],
      night: [
        "The crows are asleep. I'm not. Don't tell.",
        "Mum's asleep. I'm guarding her. She doesn't know.",
      ],
    },
    about: [
      "Lily. My mum's Hilde. I'm seven and three quarters, and I bite.",
      "I talk to the crows. Mostly they talk about worms. Sometimes not.",
    ],
    ask: {
      tessariels: [
        "They're all called the same. That's silly. I'd call them different. That one was Shiny. That one was Crying. That one was Gone.",
        "One gave Mum his heart. She put it on the shelf. It's not a real heart. I checked.",
      ],
      knight: [
        "The crows won't go near him. Not even the brave one.",
        "I play Knight. You stand still and everyone throws stones, and you don't move, and you don't die. Nobody's won yet.",
      ],
      dead: [
        "They're in the trees. The crows told me. Crows don't lie about trees.",
        "If one comes I'll bite it. Mum says don't, they're dirty. I'll wash after.",
      ],
      lis: [
        "The old lady smells like a fire somebody put out. She said I had a crow's eyes. I said thank you.",
        "The crows like her. They walk behind her. They don't walk behind anybody.",
      ],
      town: [
        "Bellmourn is mine and Mum's and the crows'. You can live here too, if you're good.",
        "It's got the most crows of anywhere. I counted. I've only been here.",
      ],
      crows: [
        "There's a brave one, and a greedy one, and one that only looks at the hill. I don't like that one.",
        "They sit on the barn in rows now. They never used to sit in rows. Rows is for waiting.",
      ],
    },
    topics: { crows: "The crows" },
    barks: {
      morning: [
        "Good morning, crows! ...They said it back.",
        "Caw. Caw. That's 'bread'.",
        "Mum, I've got both shoes! I've got one shoe!",
        "Eleven on the barn. Who's missing?",
      ],
      day: [
        "You're dead! You stepped on the line!",
        "This game's called Knight. You stand still and I throw stones.",
        "Tam, you're the crow. No. You're the worm.",
        "I'm not playing Pip's game. ...What's Pip's game?",
      ],
      evening: [
        "The greedy one's still up. He's waiting for Mum's scraps. So am I.",
        "Mum! Mum, don't dance! MUM!",
        "The brave one's gone to bed. Night, brave one.",
        "I'm not tired. My eyes are.",
      ],
      night: [
        "Shh. The crows are listening.",
        ringing("Three. The crows don't like it either."),
        quiet("No bell. The crows stopped sitting in rows. They're in a heap now. That's better."),
        "I'm guarding Mum. With my teeth.",
        "There's a lady on the lane. The crows went quiet.",
      ],
      work: [
        "Mum, that one's sour. The crows wouldn't drink it.",
        "I'm watching the barrels. Nobody steal.",
        "That's two copper. That's two. That's a button. No.",
        "Mum, a man's looking at you. Mum, he's ugly. Mum!",
      ],
      player: [
        "Are you a crow person or a not-crow person?",
        "Don't step on the line. ...Good.",
        "What's your skull called? The crows want to know.",
        "The greedy one likes your robe. He likes everything.",
      ],
      magic: [
        "Do it to the crows! No. Don't. Do it near them.",
        "The crows didn't like that. I did.",
        "Was that the Light? Mum says don't say the Light.",
        "Again! I won't tell Mum! ...I'll tell Mum.",
      ],
      woken: [
        "The crows said someone would come. They didn't say this late.",
        "Shh. Crows sleep with one eye open. This is my open one.",
        "MUM!",
        "Go away or I'll bite. I will. I've done it.",
      ],
    },
    bye: [
      "Bye. Don't step on the line.",
      "The crows will watch you. That's nice. Mostly.",
    ],
  },

  ivy: {
    first: [
      "Ale's two copper, and before you ask, no, I don't know the way to the Dark Lord. Uphill, I'd think. Everything bad's uphill.",
      { met: 'dob', say: "Dob's found you already, then. He'll have asked to be you for a day. Don't let him. He can't finish a roof. Ale's two copper." },
    ],
    greet: {
      morning: [
        "Morning. Barrels are cold, I'm colder. What'll it be?",
        "Up early. Somebody in this town is.",
      ],
      day: [
        "{name}. Still alive? Good. Ale's two.",
        "Here's the thirteenth. Hilde's been fanning herself since you passed.",
        "You've come back again. That's more than Dob does with a hammer.",
      ],
      evening: [
        "Dob's coming by. If he mentions the roof, nod.",
        "{name}. Nearly packed. You can have the bottom of the barrel. It's the best bit. It isn't.",
      ],
      night: [
        "Packing up. Unless you want to carry a barrel, in which case, hello.",
        "Late. Go to bed. Somebody should, in a house with a roof.",
      ],
    },
    about: [
      "Ivy Thatch. Hilde's niece. I pour the ale while she flirts with it.",
      "I'm marrying Dob Fenwick, once he's built the cottage. He's been building it two years. It's got a door. Mostly, it's got a door.",
    ],
    ask: {
      tessariels: [
        "Dob wants to be one. For a day, he says, just to see. I said, you'll be one for a day and then you'll be dead, and I'll have half a cottage.",
        "They pay. I'll give them that. Plenty of men talk about saving you. These ones tip.",
      ],
      knight: [
        "Nobody's going near him, so nobody's being buried. Silas has nine in his yard. You can smell them on a warm day. I'm sorry. You can.",
        "Cedric Ashby says he'd give an arm to serve a knight like that. I said give it a month, he might take you up on it.",
      ],
      dead: [
        "We pack up before dusk now. Used to sell till the lamps. Hilde says it's the trade. It isn't the trade.",
        "Dob sleeps in the tithe barn. The barn's got a roof, and the dead have never come in. First argument about that cottage I've ever lost.",
      ],
      lis: [
        "Old Lis drank three at the stall and told me Dob would finish the roof the day the bell rang right. Then she laughed. I didn't like the laugh.",
        "She paid in a sprig of something that made the stall smell like summer for a week. She's never paid that well. She's never been in a good mood.",
      ],
      town: [
        "It's the kind of place you leave, Nell says. Nell's never left. Nobody has.",
        "Half the town drinks on the slate and the other half drinks on Hilde. Somehow we still make money. Don't ask me how.",
      ],
      dob: [
        "He's sweet. He's a dreamer. He sleeps in the tithe barn and says the cottage needs to settle. Two years. It's settled. It's lying down.",
        "If you see him, tell him the roof's the bit that keeps the rain off. He seems to think it's decoration.",
      ],
    },
    topics: { dob: "Dob" },
    barks: {
      morning: [
        "Barrels out. Cloth up. Smile on. Two out of three.",
        "Aunt Hilde, shoes. ...Lily, shoes. Both of you.",
        "Morning, Dob. Roof? No? Morning, Dob.",
        "Cold barrels, cold hands, cold Ivy.",
      ],
      day: [
        "Ale! Two copper! No, Dob, you pay too.",
        "Two for Hob, one for Wes, none for Dob till the rafters are up.",
        "Hilde, he's married. Hilde. HILDE.",
        "Going to give a speech? Buy a mug first.",
      ],
      evening: [
        "Hilde, you're not dancing on the barrel. Hilde.",
        "Pack it up, pack it up, the light's going.",
        "Last mugs! Last mugs or nothing!",
        "Dob's coming. Everybody look busy. Especially Dob.",
      ],
      night: [
        "Dob, the barn's that way. The barn. Not me.",
        "Somebody's singing at the inn. Somebody shouldn't be.",
        "One day I'll fall asleep under a roof I own. One day.",
        "Nine coffins and one roofless cottage. Grand town.",
      ],
      work: [
        "Pour, take, pour, take.",
        "Bring the mug back! Bring the... right. That's seven.",
        "Head on that one. Head on that one. Flat. Sorry, Wes.",
        "Stir it, Ivy. Don't taste it, Ivy. Fine, taste it.",
      ],
      player: [
        "You want one? You look like you want one.",
        "{name}. Tell Dob you need a house roofed. He'll do it for you.",
        "Don't stand there looking holy. It frightens the custom.",
        "Tessariel thirteen. Ale's still two.",
      ],
      magic: [
        "Do that to Dob. He might finish something.",
        "That'd keep the rain off. Can you do a roof?",
        "Not near the barrels! Those are worth more than you.",
        "Hilde's going to want to marry that. Stand back.",
      ],
      woken: [
        "Is it the cottage? Has he put a roof on? No? Then why am I awake?",
        "Dob? ...You're not Dob. Thank goodness. Out.",
        "If the cottage fell down, tell me in the morning. I'll want to see his face.",
        "Hilde snores, I've been awake an hour, and now you. Go.",
      ],
    },
    bye: [
      "Go on. And if Dob asks, I'm busy.",
      "Bring the mug back.",
      "Uphill's that way. Everything bad's that way. Off you go.",
    ],
    shop: {
      open: [
        "Two copper a mug. It's Hilde's best, which is everybody's best.",
        "Ale, two copper. Puts a bit of life back in you. Not much. Enough to walk home.",
      ],
      closed: [
        "Stall's shut. Barrels are home. I'm nearly home. Tomorrow.",
        "Not tonight. Tomorrow, at the stall, with my boots on.",
      ],
      buy: [
        "There. Drink it here or carry it, but bring the mug back. Dob's borrowed six.",
        "Two copper. Thanks. Don't drink it near Hilde. She'll want a sip, and her sips are halves.",
      ],
      sell: [
        "We don't buy. Try Magda. She'll buy anything. She bought Dob's drawings of the cottage.",
      ],
      poor: [
        "Two copper. You haven't got two copper. That's all right. Neither has Dob, and I'm marrying him.",
      ],
    },
  },

  // ---------------------------------------------------------------- The bakehouse
  agnes: {
    first: [
      "Here's the one everybody's on about. Bram's slate is the only thing in Bellmourn that gets the news before I do. Agnes. Bakehouse. You'll be hungry.",
    ],
    // To someone with no coin, the once (src/ui/folk.js gift): said instead of her first word, or `again` on a later one.
    gift: {
      at: 'first',
      say: "I heard about you over the dough, before I'd ever seen you. Bread hears everything. Have a roll. Warm. Don't tell the town I gave it you, they'll all want one.",
      again: "You've not a copper on you. I can tell by how you look at the trays. Here. A roll. Warm. Don't tell the town.",
      note: "Agnes's roll, still warm. It's gone in three bites.",
      heal: 14,
    },
    greet: {
      morning: [
        "Morning! I've been up since four. You look like you've been up since never.",
        "Quick, before the rush. What's happened? Something's happened.",
      ],
      day: [
        { after: 'dead_cant_wait', say: "Eight, they're saying over the dough. Eight lying still that weren't. The bread rose better this morning. I'm not saying it's you." },
        "{name}! Done for the day, me. Now I can talk.",
        "Oven's cold, I'm warm. Tell me everything.",
      ],
      evening: [
        "Off to bed soon. Bakers sleep when everyone else gets interesting.",
        "{name}. Did Hal follow you about today? He follows anything with a staff.",
      ],
      night: [
        "Shh. I'm up in four hours. What's happened? Quickly.",
        "This late? It's either very good or very bad. Either way, I want to know first.",
      ],
    },
    about: [
      "Agnes Bramble. Bakehouse. Up at four, flour by five, the whole town's business by six.",
      "My Will died the year Hal was born. Fever. I kept the oven going. You do.",
    ],
    ask: {
      tessariels: [
        "They all buy the same thing. A small loaf, for the road. Every one of them. Nobody buys a small loaf unless he thinks he won't be needing another.",
        "The eighth one helped me knead. Stood there in all that silver with his sleeves rolled, laughing. Went up the hill that night. I still do his end of the board first.",
      ],
      knight: [
        "Garth went past him with the tithe-cart once, the long way round, and saw him from the road. Garth didn't eat for two days. Garth.",
        "Funeral bread was half my trade. Now Silas has nine waiting, and nobody's eating for them.",
      ],
      dead: [
        "Corran came in at dawn for bread, and his hands were shaking. He said it was the cold. It wasn't cold.",
        "Lamps, everyone says. I keep the oven lit all night now. Costs me a fortune in wood. I sleep better. Hal sleeps worse. He wants to sit up with it.",
      ],
      lis: [
        "She buys one stale loaf twice a year and pays in rosemary. Best bargain I ever made.",
        "There's talk of a woman on the lanes after dark, lovely as a bride. Jory, Hob, Dob. Three grown men, and come morning they couldn't give me her face between them.",
      ],
      town: [
        "I know who's courting, who's sick and who's short, by what they buy. Bellmourn's buying less every month. You work out what that means.",
        "Good people. Frightened people. Same people. They still want their bread warm.",
      ],
      talk: [
        "The Ashby boy and the Halloway girl. Don't tell me you hadn't heard. The crows have heard.",
        "Silas bought an extra loaf yesterday. Silas never buys an extra loaf. Either somebody's staying with Silas, or Silas is eating for nerves.",
        "Lady Ashby's ordered a cake. A cake! In a tithe month. Somebody important is coming to that house, and it isn't to see the reeve.",
      ],
      silver: [
        "He was there one morning at four, when I opened the oven door. Stood on the green still as a post, like he was waiting on the bread. He didn't buy any.",
        "Nobody knows his name. I've asked everybody, and I ask everybody everything. That's never happened to me before.",
      ],
      hal: [
        "He wants to fight monsters. I want him to want to be a baker. We meet in the middle. He fights the dough.",
        "He and Pip Kettle. Best friends and worst enemies, both before breakfast.",
      ],
    },
    topics: { talk: "What's the talk?", hal: "Hal" },
    barks: {
      morning: [
        "Hot bread! Hot! Mind your fingers!",
        "Hal! Up! The oven's been up an hour!",
        "First loaves out! First news in!",
        "Morning, Jory. Who did you see last night? Tell me.",
        "That silver one's round the green already. Earlier than me. Nobody's earlier than me.",
      ],
      day: [
        "Done for the day. Now, what's happened?",
        "Magda, that's not what I said. ...It's better, but it's not what I said.",
        "Rolls, the last six! Five! Hal!",
        "Somebody's courting. I can tell by the honey cakes.",
      ],
      evening: [
        "Who's that out at dusk? Hal, go and see. No. Stay in.",
        "Bed soon. Somebody tell me the end of it tomorrow.",
        "Hal, in. Wash. Flour's not a coat.",
        "Banking the oven. Night, oven.",
      ],
      night: [
        ringing("Four hours. If the bell lets me."),
        quiet("Four hours, and no bell to cut them short. Lovely."),
        "Up in four hours. Three and a half.",
        "Oven's lit. Lamps lit. Hal, sleep. I can hear you not sleeping.",
        "That's Jory's step. And that's not.",
      ],
      work: [
        "Knock it, turn it, knock it.",
        "Who's that? I know that knock. I know every knock in town.",
        "Bread for the inn, bread for the reeve, and the burnt ones for Hal.",
        "Rise, you lazy thing. Everyone else has.",
      ],
      player: [
        "You've the face of someone who wants a roll.",
        "{name}! You've news. I can see it. Out with it.",
        "Stand by the oven. You look cold through. Is that the skull, or you?",
        "Hal's been doing you all day. Badly. With a ladle.",
      ],
      magic: [
        "Oh, the whole town'll know about that by noon. I'll see to it.",
        "That's an oven's worth of heat! Do you know what wood costs?",
        "Hal, don't you dare try that. Hal. HAL.",
        "Can you do that at four in the morning? I'll pay in bread.",
      ],
      woken: [
        "I heard you before you knocked. I hear the whole lane.",
        "Is it four? It's not four. Why aren't you four?",
        "Is it Hal? ...Oh. You. Well, I'm up now. What's happened?",
        "If the oven's out, I'll cry. If it's anything else, tell me everything.",
      ],
    },
    bye: [
      "Off you go. Eat something that isn't air.",
      "Tell me what happens. Me first, mind. Before Magda.",
    ],
    shop: {
      open: [
        "Bread, warm. Rolls, warmer. There's nothing wrong with anybody in this town that a hot loaf hasn't made a bit better. Not mended. Better.",
        "Take your pick. That's this morning's, that's yesterday's and cheaper, and that one's Hal's, and I'm not charging for it.",
      ],
      closed: [
        "Oven's cold. Come at dawn, before the town eats the lot.",
        "Bread's sold or sleeping. So should I be.",
      ],
      buy: [
        "There. Eat it warm. Cold bread's a waste, and I don't waste.",
        "Good. You eat that before you go anywhere dark. Promise me.",
      ],
      sell: [
        "I don't buy, love. I bake. Magda's your woman for selling.",
      ],
      poor: [
        "Can't, love. Five Tessariels have told me 'I'll pay when I'm back.' I've stopped baking for 'when I'm back'.",
      ],
    },
  },

  hal: {
    first: [
      "Are you going to fight the dead? Can I come? I've got a stick. It's a better stick than Pip's.",
      { met: 'pip', say: "Pip says he met you first. He didn't. I saw you before him, from the bakehouse roof. I just didn't shout about it. Are you going to fight the dead? I've got a stick." },
    ],
    greet: {
      morning: [
        "Floured again. Mum does it on purpose.",
        "I killed three dead men in my sleep. In a dream. Still counts.",
      ],
      day: [
        "How many did you kill? Pip says none.",
        "Did you see a monster? How big? Bigger than Garth?",
      ],
      evening: [
        "I killed eleven today. Pretend ones. They were really pretending.",
        "{name}, I'm not going in yet. Tell Mum you need me.",
      ],
      night: [
        "I'm guarding. Somebody's got to.",
        "I can't sleep. The oven ticks. It sounds like walking.",
      ],
    },
    about: [
      "Hal Bramble. I'm going to fight monsters. Real ones. Mum says when I'm older. I'm older than I was.",
      "Pip's my best friend. I'm better than him at everything. He'd say he's better. He's wrong. He's mostly wrong.",
    ],
    ask: {
      tessariels: [
        "I'd make a better one. I'd not go up the hill shouting. I'd go up quiet and get him from behind.",
        "The one who helped Mum knead let me hold his sword. It was so heavy. I said I could lift it. I couldn't. He said nobody can, really. Then he went.",
      ],
      knight: [
        "He's eight feet tall. Pip says nine. Pip's never been close. I've never been close either. But eight.",
        "Cedric Ashby says that's what a real knight looks like. Then I don't want to be a real knight. I want to be the other kind.",
      ],
      dead: [
        "Corran says they don't feel it when you hit them. Then what's the point of them?",
        "They come up out of the churchyard, Corran says. My dad's in the churchyard. I'm not scared. I'd just like to know if he'd know me.",
      ],
      lis: [
        "She's got one tooth. Pip says it's black. It's brown. I looked. I'm the only one who looked.",
        "She called me 'little loaf'. I'm going to kill a monster, and then she'll have to call me something else.",
      ],
      town: [
        "It's boring, except the dead and the knight and you. And Pip, sometimes.",
        "If the dead come in, I'll hold the bakehouse door. Mum says she'll hold it. We'll both hold it.",
      ],
      monsters: [
        "First the dead. Then the knight. Then the Dark Lord. Then home for supper.",
        "Corran showed me how to hold a knife so it doesn't turn in your hand. Then he took it back. He said I'd got the idea, and that was what worried him.",
      ],
      silver: [
        "I asked him to fight me. He stopped and looked at me for ages. Then he walked on. I think that means I won.",
        "His sword's never come out. Not once. I watch one half of the green and Pip watches the other.",
      ],
    },
    topics: { monsters: "Fighting monsters" },
    barks: {
      morning: [
        "Flour in my ears. Flour everywhere.",
        "Mum, I'm up! I'm mostly up!",
        "Burnt one's mine! I called it!",
        "Pip! I'm faster today! I've decided!",
      ],
      day: [
        "Have at you, dead man! ...Pip, you're dead. Fall over.",
        "My stick's bigger! Measure it!",
        "I'm the Beacon this time, Pip. You said.",
        "Hah! Hah! You're dead! Twice!",
        "Silver knight! Fight me! ...He's doing the corner. He'll fight me after the corner.",
      ],
      evening: [
        "Pip went in. I win, then. I win by staying.",
        "One more fight! One more!",
        "I won. I won. Pip says he won. I won.",
        "Coming, Mum! After this one!",
      ],
      night: [
        "I'm guarding the bakehouse. From things.",
        "The oven ticks like walking. It's the oven. It's the oven.",
        "If my dad comes, I'll tell him about Pip.",
        ringing("The bell! I'm ready. I've got my boots on. One boot."),
        quiet("The bell's stopped. The thirteenth did it. I'd have done it quicker."),
      ],
      work: [
        "I'm kneading. It's like punching, but Mum's happy.",
        "Knock it, turn it, punch it.",
        "Rolls for the inn! Out of the way! Out of the WAY!",
        "This one's a dead man. Take that, dough.",
      ],
      player: [
        "Teach me something! Not reading. Something good.",
        "Is the staff for hitting? It looks like it's for hitting.",
        "Can I hold the skull? I won't drop it. I'll drop it a little.",
        "{name}! Pip says you're scared of the hill. I said you're not.",
      ],
      magic: [
        "TEACH ME THAT!",
        "That's better than a stick. That's better than two sticks.",
        "Pip didn't see it! Pip didn't see and I did!",
        "Mum! Come and see! Do it on the dough!",
      ],
      woken: [
        "It's not a monster, Mum. It's the thirteenth. Go back to sleep, Mum.",
        "I wasn't asleep. I was guarding with my eyes shut.",
        "Mum! There's a... oh. Never mind, Mum.",
        "Is it monsters? Can I come? I'll get my stick.",
      ],
    },
    bye: [
      "Bye! Kill something for me!",
      "If you see Pip, tell him I'm winning.",
    ],
  },
};
