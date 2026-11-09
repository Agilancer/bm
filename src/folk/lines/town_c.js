// What the Fenwicks, the tanner, the Reeds, the hunter, the undertaker and the herbalist's say. (Bible: tools/folk/cast.md.)
// Lines kept for while the bell still tolls each midnight, and for after its warden's put down (src/folk/quests.js sayable).
const ringing = (say) => ({ before: 'toll_of_bell', say }), quiet = (say) => ({ after: 'toll_of_bell', say });

export const LINES = {
  // Hob Fenwick, farmer. Slow, short, plain. Measures the world in sacks and seasons.
  hob: {
    first: [
      "Mind the furrow. ...You're not like the others. They clanked. You'd hear them a field off.",
      { met: 'bess', say: "Bess said you'd be by. Said I was to give you something to eat. I've an apple. She'll say that's not eating." },
    ],
    greet: {
      morning: [
        "Morning. Been up since dark. Barley doesn't wait for daylight. Nor does Bess.",
        "Morning. Heavy dew. Good for the roots. Bad for my knees.",
        "{name}. Morning. You'll want Bess, I expect. Everyone wants Bess.",
      ],
      day: [
        { after: 'dead_cant_wait', say: 'Bess says you put eight back down. Honest work. Dirtier than mine.' },
        "Hot one. Barley likes it. I don't.",
        "Sit if you want. I can't. Thistles.",
        "Afternoon. If you've come about the tithe, I've not got it. If it's anything else, I've not got that either.",
      ],
      evening: [
        "Evening, {name}. That's the day done. One closer to month's end.",
        "Bess has kept a plate back. She'll say she hasn't. She has.",
        "Evening. I'd be indoors before the light goes. I'm not telling you. Just saying what I'd do.",
      ],
      night: [
        "It's late, {name}. Late's no good for anyone round here.",
        "Out, at this hour? ...No. Don't tell me. Just get indoors after.",
        "Night. I'm only out to check the shutters. Checked them twice. Checking again.",
      ],
    },
    about: [
      "Hob Fenwick. I farm the south strips, past the cottage.",
      "Bess is my wife. Tilly and Tam are ours. Dob's my brother. Same face. Different everything else.",
      "That's about all of me. I'm not a long story.",
    ],
    ask: {
      tessariels: [
        "Found one asleep in my barley in all his armour. Flattened a patch the shape of a man. I gave him an apple. He said I'd be rewarded in the life to come. I'd have liked a sack of seed in this one.",
        "Twelve, Bram says. Thirteen with you. I don't count them. Bram counts. I count sacks.",
      ],
      knight: [
        "Never been up there. Don't need to. Three went up shouting. I heard it from the south strip, and that's a fair way.",
        "I don't go east. Nothing grows east I need.",
      ],
      dead: [
        "Bess wanted the shutters nailed. I nailed them. Now I lie awake listening to the nails.",
        "Corran says they're in the pines. Corran's a hard man to like and an easy one to believe.",
      ],
      lis: [
        "She gave Bess a root for Tam's chest, the winter he was born. Tam's alive. I don't ask more than that of anyone.",
        "Rude. Smells of goat. Pays fair, in salt. I've known worse. I'm related to some.",
      ],
      town: [
        "Folk think the town's the square. It's not. It's the strips. The square's just where we go to complain about them.",
        "Small. You could stand at one end and shout to the other. Nobody'd come, mind.",
      ],
      harvest: [
        "Barley's good this year. Best in five. They'll take one sack in three. So it's the best year I'll be poorer for.",
        "Garth came by to look at the barley. Not to take it. Just to look. He looked sorry about it. That's worse, somehow.",
      ],
      dob: [
        "Dob? Same face as me. He got the dreams and I got the field. Seemed fair when we were six.",
        "Two years on that cottage. I offered to help with the roof. He said he hadn't decided what sort. I said the sort that keeps rain out. He's still deciding.",
      ],
    },
    topics: { harvest: 'The harvest', dob: 'Your brother' },
    barks: {
      morning: [
        "Dew's heavy. Good.",
        "Up before the crows. Nearly.",
        "Bess! Where's the whetstone? ...Never mind. It's in my hand.",
        "Barley's standing. That's a start.",
        "Another day nearer month's end.",
      ],
      day: [
        "Hot. Barley likes it.",
        "Thistles. Every year, thistles.",
        "Rain by evening, I'd say. Or not.",
        "One sack in three. One sack in three.",
        "Back's gone. It'll come back.",
      ],
      evening: [
        "That's the day.",
        "Light's going. Time we were in.",
        "Smell that? Bess's pot. Best smell in Bellmourn.",
        "Shutters. Then supper. Then the shutters again.",
      ],
      night: [
        "Checking the shutters. Again.",
        "Quiet. Dogs aren't even barking.",
        "Get in, whoever you are. Get in.",
        ringing("That's the bell. I didn't count it. I never count it."),
        quiet("No bell again. I still woke for it."),
      ],
      work: [
        "Come on. Come on, you beggar.",
        "Straight row. Straight row. ...Near enough.",
        "That's a good ear. That's a very good ear.",
        "Another stone. This field grows stones better than barley.",
        "Dob! You're on the wrong strip. ...Again.",
      ],
      player: [
        "{name}. Mind the furrow.",
        "Not on the barley, {name}. Next to it's fine.",
        "All right, {name}?",
        "Bess is at the cottage, if it's Bess you want.",
      ],
      magic: [
        "Not near the barley. Please.",
        "Frost? In harvest month? That's you, is it?",
        "Well. I'll not mention that to Bess.",
        "That's not right. That's not right at all.",
      ],
      woken: [
        "Bess? ...Bess, there's a wizard in the house.",
        "What is it? Is something at the hens?",
        "I was dreaming of rain. Go away.",
        "It's the middle of the night. Even the barley's asleep.",
      ],
    },
    bye: [
      "Go steady.",
      "Right, {name}. Back to it.",
      "Bess'll ask if you ate. Say yes.",
    ],
    gift: { at: 'bye', say: "Here. The apple. Bess'll say it's not eating. It's what there is.", note: "Hob's apple. Sharp, and a bit bruised.", heal: 8 },
  },

  // Bess Fenwick. Quick, bossy, funny; runs the house, the husband and anyone who stands still.
  bess: {
    first: [
      "Have you eaten? You haven't. Robes don't hide everything. Hob's got an apple on him. Make him give it you.",
      { met: 'hob', say: "Hob said you'd been by the strips. He said you were 'all right'. From Hob, that's a speech. Have you eaten?" },
      { met: 'tilly', say: "So Tilly's got you. I saw you walking funny by the well. You can stop. I'm her mother; I outrank her. Mostly." },
    ],
    greet: {
      morning: [
        "Morning. If you're passing the well, you're carrying a bucket. That's the toll.",
        "Milk's turned again. Don't ask me. Ask the cow.",
        "Morning. You're up. Good. So's the whole house, except Hob, who's up but hasn't noticed.",
      ],
      day: [
        { after: 'dead_cant_wait', say: "You went down there. Under it. Come here. ...No, I'm only looking for bites. Go on." },
        "{name}. Can't stop. Can talk. Walk with me.",
        "Afternoon. Have you seen Tam? Small, quiet, looks like he's thinking about death. That one.",
        "Oh, it's you. Good. Tell Tilly she's not in charge. She won't believe me.",
      ],
      evening: [
        "Pot's on. There's never enough, but there's enough.",
        "Evening. Back before dark, good. Hob worries. I don't. I count heads.",
        "{name}. You've got that look. Sit. Eat. Have the look after.",
      ],
      night: [
        "Get under a roof at this hour. Any roof. Not Dob's.",
        "It's dark. You know it's dark? Go home. Wherever that is for you.",
        "Late, {name}. If you see my children out, they're not mine. Bring them back anyway.",
      ],
    },
    about: [
      "Bess Fenwick. I run the south cottage. And Hob. And the children. And Dob, when he lets me, which is never.",
      "Hob does the fields. I do everything that isn't a field.",
    ],
    ask: {
      tessariels: [
        "Number seven had supper with us. Lovely manners. Promised Tilly a castle. Went off up the Long Road next morning. Tilly still asks when the castle's coming.",
        "A pretty woman tells a man he's the one, and he believes her. That's the only part of it that's no surprise.",
        "Eat like horses, all of them. Being chosen must take it out of you.",
      ],
      knight: [
        "I've told my two: go east of the well and I'll kill you before the knight gets the chance. They believe me. They should.",
        "A month he's stood there. Doesn't eat, doesn't sit, never once goes behind a bush. I'd want to know how.",
      ],
      dead: [
        "I've moved the children's bed to the inside wall. Don't ask me what good it does. It was the only thing I could move.",
        "Milk's turned three nights running. Hob says it's the weather. Hob says everything's the weather.",
      ],
      lis: [
        "Rude as a goose and twice as loud. Her salve took the burn off Hob's arm in one night. I can put up with rude.",
        "She looked at Tilly once and said, 'That one'll run the world.' Then she spat. I've never known if it was a blessing.",
      ],
      town: [
        "Sneeze at the south end and Agnes has it in the bread by morning.",
        "It's a good town. Poor, frightened and nosy, but good. Like most families.",
      ],
      hob: [
        "Hob's a good man. Slow. You could plant him in spring and he'd come up in autumn, still thinking about it.",
        "Never once raised his voice. He's raised a barn, a fence and two children. His voice, never.",
      ],
      silver: [
        "He walks the green all day while the children play. I watched him a week before I let Tilly near. He stops when they run across. Every time. That decided me.",
        "Tam asked him his name. He bowed. Tam's been bowing at everything since. The hens. The well. Hob.",
      ],
      children: [
        "Tilly runs the other children. Tam watches. I don't know which one worries me more.",
        "Tam asked me if the dead are cold. I said go to sleep. He said that's not an answer. He's right. It isn't.",
      ],
    },
    topics: { hob: 'Your husband', children: 'Your children' },
    barks: {
      morning: [
        "Tilly! Shoes! Both of them!",
        "Milk's turned. Again.",
        "Hob, your hat. Your hat, Hob.",
        "Up, up, up. Sun's not waiting.",
        "Who's had the bread? Somebody's had the bread.",
      ],
      day: [
        "Tam? Tam! ...Oh. There you are. Stop doing that.",
        "If that's Dob singing, tell him to sing on a ladder.",
        "Hob! Water! You've not had any, I can tell from here.",
        "Ten things to do and I've done eleven.",
      ],
      evening: [
        "In! All of you, in!",
        "Tilly, count your brother. Is he all there? Good.",
        "Shutters, Hob.",
        "Supper's on. Whoever's nearest, stir.",
      ],
      night: [
        "Who's that? Go home, whoever you are.",
        "Lamp's lit. Lamp stays lit.",
        "Hob's asleep. I'm not. Somebody has to listen.",
        "Tilly, back in bed. I can hear you being awake.",
      ],
      work: [
        "Come here, you. Come here. Stupid hen.",
        "Four eggs. Five yesterday. Somebody's slacking.",
        "Twelve rows of beans and not one of them grateful.",
        "If the reeve wants my onions he can pull them himself.",
      ],
      player: [
        "{name}. Eaten?",
        "You're stood in my light, {name}.",
        "Oh, it's the wizard. Hello, wizard. Wipe your feet.",
        "Don't let Tilly put you in her game, {name}. You'll never get out.",
      ],
      magic: [
        "Not in front of the children! ...Well, go on, they've seen it now.",
        "Can you light an oven like that? I'll pay in onions.",
        "Hob! Hob, come and see this before it stops.",
        "Put that out before the thatch catches!",
        "Oh, my heart. Don't ever do that by my door.",
      ],
      woken: [
        "Out. Out of my house. I've a ladle and I'm awake now.",
        "Do you know how long it takes to get Tam down? Do you?",
        "Hob, there's a wizard. Hob. Hob. ...Useless.",
        "If you've woken the children, you're putting them back.",
      ],
    },
    bye: [
      "Go on then. Watch the dark.",
      "Go on, then. Come back fed or come back hungry, just come back.",
      "Right. I've a pot to watch and a husband to watch, and the pot's quicker.",
    ],
  },

  // Tilly Fenwick, 9. In charge. Makes the rules up as she goes, and the rules are always hers.
  tilly: {
    first: [
      "Stop. You're in the game now. You're thirteen, so you're the bad luck. You have to walk funny.",
      { met: 'tam', say: "Tam talked to you first. He's not allowed to do things first. You're in the game now. You're thirteen, so you're the bad luck. Walk funny." },
    ],
    greet: {
      morning: [
        "{name}! You can play, but you're not in charge.",
        "Mam says I'm not allowed out. I'm out. Don't tell.",
        "You're late. The game started ages ago. You're out. You can come back in later.",
      ],
      day: [
        "You're the knight today. Tam's resting. Stand there. Don't talk. ...Good. You're really good at it.",
        "We need one more. You'll do. You're the dead.",
        "{name}! Tam keeps winning and he doesn't even know the rules. Make him stop.",
      ],
      evening: [
        "We have to go in when the lamps go on. That's not my rule. I'd make a better one.",
        "Are you staying out? Can I? ...Don't tell Mam I asked.",
      ],
      night: [
        "I'm not out. I'm in bed. This is a dream. Go away.",
        "I'm only getting Tam. He walks in his sleep. Last time he got as far as the well.",
      ],
    },
    about: [
      "I'm Tilly. I'm nine. I'm in charge of the game and our lamp and Tam.",
      "When I'm big I'll be the reeve. I'll have lots of rules, but they'll be good ones.",
    ],
    ask: {
      tessariels: [
        "There's twelve. You're thirteen. Thirteen's always the bad one in games, so you have to be extra careful.",
        "One of them said I'd have a castle. I'm still waiting. When I'm reeve I'm going to fine him.",
      ],
      knight: [
        "He's in our game. You walk up to the door and he gets you and you lie down. You can't get up till the bell goes three times. I made that rule.",
        quiet("The bell doesn't go any more, so if he gets you, you can't ever get up. I'm thinking about the rule."),
        "Tam's always the knight. He's good at standing still and not saying anything. It's his best thing.",
      ],
      dead: [
        "They can't come in because of the lamps. So I'm in charge of our lamp. I'm in charge of most things.",
        "In the game the dead walk really slow, like this. Then they get you. Then you're dead too and you're on their side. It's fair.",
      ],
      lis: [
        "She's ugly. She said I was ugly. Then she gave me a sweet. I don't know whose side she's on.",
        "Mam says don't stare at Old Lis. I stared. She stared back. I won.",
      ],
      town: [
        "Tamsin's is the swearing house. Wes's is the smelly house. Silas's is the box house. Ours is the best house.",
        ringing("When I'm reeve I'll make the bell stop. I'll make a rule."),
        quiet("The bell stopped by itself, before I was even reeve. I was going to make a rule."),
      ],
      silver: [
        "Corners. He walks to a corner, stops, folds his arms, then the next one. Four corners. He never cuts across. Not once. I've watched.",
        "I put a stone on every corner he stops at. He stepped over every one. So he knows they're there. Tomorrow I'm putting one in the middle.",
      ],
      game: [
        "It's Knight and Tessariels. Everyone's a Tessariel but one. Everyone loses but one. Hal wants a game where he wins. That's not how it goes.",
        "Bryony's the undertaker. She's the only one who wants to be. She brings real bones. We've asked her not to.",
      ],
    },
    topics: { game: 'Your game' },
    barks: {
      morning: [
        "Everyone in a line! ...A straight line, Tam.",
        "First one to the well's the reeve!",
        "No, Hal, Tam's the knight. Tam's always the knight.",
        "New rule: no new rules. Except mine.",
        "Tam, hold my shoe. Don't ask why.",
      ],
      day: [
        "You're dead, Pip! Lie down! Properly!",
        "That doesn't count, it was practice.",
        "Bryony, put the bone back. It's not that sort of game.",
        "Three bells and you can get up. One... not yet...",
        "Wren says it's a stupid game. Wren's playing it.",
        "Silver man's at the third corner! Everybody freeze till he turns!",
      ],
      evening: [
        "Lamps are on. Game's over. I won.",
        "Tam! Home! I'm not saying it twice. ...Tam!",
        "Last one in's the dead.",
        "Same again tomorrow. Same rules. Different rules.",
      ],
      night: [
        "I'm not scared. Tam's scared. I'm holding his hand for him.",
        "Is that the pretty lady? Don't look. Tam, don't look.",
        ringing("Shh. If we're quiet the bell won't know we're up."),
        quiet("Shh. There's no bell any more, so Mam can hear everything."),
        "I'm only checking the lamp. I'm in charge of the lamp.",
      ],
      work: [
        "Walk slower! The dead don't run!",
        "That's not how you die. Do it again.",
        "The knight doesn't talk, Tam. You're doing really well.",
        "Everyone's a Tessariel! Everyone up the hill!",
        "Lily, the crows aren't playing. Stop asking them.",
      ],
      player: [
        "{name}! Do you want to be the dead or the knight?",
        "You can't walk there, {name}. That's the churchyard. In the game.",
        "{name}'s playing. {name}, you're the bad luck.",
        "Do a spell. Go on. I'm allowed to ask, I'm in charge.",
      ],
      magic: [
        "That's cheating! ...Do it again, and that's not cheating.",
        "New rule: that's allowed.",
        "Tam! Did you see? Tam, you missed it, you always miss it.",
        "Can you teach me? Not now. When I'm reeve.",
      ],
      woken: [
        ringing("Three. It always goes three. I'm waiting for a four, so I can tell everyone."),
        quiet("No bell again. I stayed up for it anyway. Somebody has to."),
        "Mam! There's someone! ...It's only the wizard. Mam, it's only the wizard!",
        "Go away. I was dreaming I was in charge.",
        "Don't wake Tam. He'll ask things.",
      ],
    },
    bye: [
      "You can go. I said you can go.",
      "Bye, {name}. You're still in the game. You're always in the game now.",
    ],
  },

  // Tam Fenwick, 6. Quiet. Follows Tilly. Asks the questions the grown-ups won't answer.
  tam: {
    first: [
      "Is that a real skull? Was it somebody?",
      { met: 'tilly', say: "Did Tilly put you in the game? She puts everyone. Are you the dead? I'm the knight. The knight doesn't talk. ...Sorry." },
    ],
    greet: {
      morning: [
        "{name}. Did you sleep? Do skulls sleep?",
        "Morning. Tilly says I have to say morning. Morning.",
        "I had a dream about you. You were taller.",
      ],
      day: [
        "Tilly's busy. You can talk to me.",
        "Hello. I'm being the knight. I'm not allowed to talk. ...Hello.",
        "{name}. Can I hold your staff? Only the bottom end.",
      ],
      evening: [
        "It's getting dark. Do you go in, or do you stay out like the lady?",
        "Mam's calling. I'm going in a minute. A minute's quite long.",
      ],
      night: [
        ringing("I came out to see the bell. Don't tell."),
        quiet("I came out to see if the bell would. It didn't. Can I stay till it does?"),
        "I'm not out. I'm walking in my sleep. Tilly says that's allowed.",
      ],
    },
    about: [
      "I'm Tam. I'm six.",
      "I'm Tilly's brother. She's in charge. I'm the knight.",
      "I ask things. Mam says I ask too many. I asked how many is too many. She didn't know.",
    ],
    ask: {
      tessariels: [
        "Where do the Tessariels go after the hill? Nobody comes back down. Is there a bottom on the other side?",
        "When they stop being Tessariel, what are they? Are they just men again? Do they mind?",
      ],
      knight: [
        "Does he sleep standing up? Horses do. Is he a horse inside?",
        "I'm the knight in our game. I just stand. Does he get bored? I get bored. I don't say.",
      ],
      dead: [
        "Are they cold? Mam won't say. If they're cold they could come in by our fire. We'd let them, I think.",
        "Do they know they're dead? Somebody should tell them. Not me. Somebody tall.",
      ],
      lis: [
        "The pretty lady at night has Old Lis's shawl on. I asked if she'd borrowed it. She said shh.",
        "Old Lis let me hold her stick. It's warm in the middle. Is it alive?",
      ],
      town: [
        "Silas has nine boxes. He says I can't have one till I'm a hundred. I'm six.",
        "Is the town the same at night? I think it moves a bit when we're asleep.",
      ],
      silver: [
        "He bowed at me. I bowed back. Now we both do it. Is there a man in there? Is he hot?",
        "Round and round. Is he lost? Tilly says no, he's minding the green. Who'd take a green?",
      ],
      skull: [
        "Was it a man or a lady? Does it mind? Can it see out of the holes?",
        "Bryony says a skull is just the inside of a face. I touched my face. It's in there.",
        "If I die, can I be somebody's skull? I'd want somebody nice to hold me.",
      ],
    },
    topics: { skull: 'My skull' },
    barks: {
      morning: [
        "Is the sun the same one as yesterday?",
        "Tilly, wait.",
        "I counted the crows. Twenty. Same as yesterday.",
        "Morning, bell. ...It didn't say anything.",
      ],
      day: [
        "Tilly, why am I always the knight?",
        "Is that a beetle or a bit of a beetle?",
        "The silver man bowed at me. I bowed back.",
        "I'm being still. I'm being very still.",
        "Where does the well go at the bottom?",
      ],
      evening: [
        "Why do the lamps keep them out?",
        "Coming, Mam. ...In a minute.",
        "Is it nearly night? How nearly?",
        "Do the crows go home? Where's home for a crow?",
      ],
      night: [
        ringing("Was that three? I only heard two."),
        quiet("Is the bell asleep? Is it dead? Can a bell be dead?"),
        "Is someone outside? Is it a nice someone?",
        "Tilly's holding my hand. I'm holding hers too.",
        ringing("Does the bell get tired?"),
        quiet("When the bell stopped, did it mind?"),
      ],
      work: [
        "I'm not talking. I'm the knight.",
        "Am I dead now? Can I get up?",
        "Bryony, can I hold the jaw? Just the jaw.",
        "Is it three bells yet?",
      ],
      player: [
        "{name}. Does your skull have a name?",
        "Is your staff heavy? Is it heavier at night?",
        "{name}, are you the real one? Tilly says nobody is.",
        "Can I look in its eyes? The skull's, I mean.",
      ],
      magic: [
        "Did that hurt the fire?",
        "Where does it go after?",
        "Can you do it slower? I want to see where it comes out.",
        "Tilly! ...She missed it.",
      ],
      woken: [
        "Is it morning? It doesn't look like morning.",
        "Are you a dream? You don't feel like one.",
        ringing("Did you hear the bell too?"),
        quiet("Was that the bell? ...No. The bell doesn't any more."),
        "Is it the lady? ...Oh. It's you.",
      ],
    },
    bye: [
      "Bye. Will you come back? How do you know?",
      "Bye, {name}. Bring the skull.",
    ],
  },

  // Dob Fenwick, Hob's twin. Dreamer. Two years building Ivy a cottage; it has everything but a top.
  dob: {
    first: [
      "Oh! The new one. I've always thought I'd make a good one of you lot. A day, say. Just to see.",
      { met: 'hob', say: "You've met Hob, then. Same face; don't let it fool you. I'm the one with the house. That one. ...The one without the top." },
      { met: 'ivy', say: "Ivy said there was a new one, and I wasn't to ask it about roofs. I wasn't going to. ...Do you know anything about roofs?" },
    ],
    greet: {
      morning: [
        "Lovely morning for a roof. If I had one ready. Which I will.",
        "Slept under the crows again. They sit in rows now. Like they're waiting for something to start.",
        "Morning. Garth says I snore. He says it the way you'd tell a man he's on fire.",
      ],
      day: [
        "{name}! Come and look. No, stand here. Now look up. See that? That's where it'll go.",
        "Afternoon. I'm thinking. It looks like sitting, but it's thinking.",
        "Have you ever built anything? With your hands, I mean. Not the other thing.",
      ],
      evening: [
        "Evening, {name}. Ivy's not speaking to me. That's not new. It's how she's not speaking that's new.",
        "Best part of the day, this. You can see the first stars through my house.",
      ],
      night: [
        "{name}! You're up. I'm up. I can't sleep with the crows like that. They're too quiet.",
        "Night. Just checking the walls are still there. They are. All four.",
      ],
    },
    about: [
      "Dob Fenwick. Hob's twin. I'm the one with the house.",
      "Well. Most of a house. I'm building it for Ivy. Two years now. It's very nearly something.",
      "I sleep in the tithe barn loft with Garth meanwhile. Lovely roof, the barn. I lie there studying it.",
    ],
    ask: {
      tessariels: [
        "Do you think she picks you, or you pick her? The woman. I'd only want a day. To know what it's like, being that sure of something.",
        "They all look so certain. I've never been certain of anything but Ivy. And slate. I'm fairly certain about slate.",
      ],
      knight: [
        "I climbed Fenner's Rise to look at him once. Just a black shape by the door. I watched an hour. He never moved. I think he was watching me back.",
        "Cedric Ashby says that's what a real knight looks like. I think he looks like a man who's never been allowed to sit down.",
      ],
      dead: [
        "Garth says they're just men gone wrong. I said that's all any of us are. He didn't speak the rest of the night. Then he said, 'Fair.'",
        "If they ever come in, I'll get Ivy up the barn ladder. Barn's got a roof. I've thought about that a lot.",
      ],
      lis: [
        "I asked her once if she had anything for a man who doesn't finish things. She laughed so long I went home.",
        "She told me my house would be done the day I stopped needing it. I've been trying to work out if that's nice.",
      ],
      town: [
        "I love it here. I'd love it more with a roof. Well. Ivy would.",
        "Everyone in Bellmourn has known me since I was a baby. So they all think I still am. Hob especially.",
      ],
      cottage: [
        "The roof's the easy part. That's why I've left it.",
        "I had it thatched in my head, then slated, then thatched again. You can't rush a roof. Ivy says you can. Ivy says you must.",
        "Four walls, a door, a window and the stars. Ivy says the stars are the problem. I say they're free.",
      ],
      ivy: [
        "She says she'll wed me the first night it rains and she stays dry under my roof. So really it's up to the weather.",
        "Ivy's the cleverest person in Bellmourn. She agrees with me about that. It's nearly the only thing.",
      ],
    },
    topics: { cottage: 'The cottage', ivy: 'Ivy' },
    barks: {
      morning: [
        "Morning, house!",
        "Crows in rows again. Did anyone else see?",
        "Today's the day. ...For the shutters, maybe.",
        "Slept lovely. Garth didn't.",
        "I've had an idea about the roof.",
      ],
      day: [
        "Hob! Come and look at this beam! ...He's not coming.",
        "Thatch or slate. Thatch or slate. Thatch.",
        "Ivy! I've measured it! ...She's gone.",
        "If I were a Tessariel they'd just build me a roof.",
      ],
      evening: [
        "Look at that. Stars already. Through the house.",
        "I'll go to the ale stall and not mention the roof.",
        "That's a good wall. I built that.",
        "Tomorrow. Proper start, tomorrow.",
      ],
      night: [
        "Can't sleep. Crows are too quiet.",
        "Garth's snoring now. Fair's fair.",
        "There's a lady on the lane. Hello! ...She's gone.",
        ringing("Bell. One. Two. ...I won't count the third."),
        quiet("No bell tonight. You can hear the stars."),
      ],
      work: [
        "Hoe, hoe, hoe. Then the beams. Then the roof.",
        "Hob says I've done this row twice. It's a good row.",
        "You can see my house from this strip. Well. The walls.",
        "Lovely soil. You could build with this. Mud and straw. That's an idea.",
        "Finish this strip, then the roof. This strip first.",
      ],
      player: [
        "{name}! Do you know anything about roofs?",
        "{name}, what's it like? Being one of them?",
        "Want to see the house, {name}? Look up. That's the best bit.",
        "{name}. Could you magic a roof? I'm joking. Could you?",
      ],
      magic: [
        "Oh! That's the best thing I've ever seen. Do it on the house!",
        "Can you do that upwards? Like a sort of ceiling?",
        "Ivy! Ivy, did you— She'll say I made it up.",
        "I knew it. I knew it was real. Somebody owes me a copper.",
      ],
      woken: [
        "Is it the crows? Have they moved?",
        "Garth, it's not me snoring, it's— oh. Hello.",
        "I was dreaming the roof. It was lovely. Now it's gone.",
        "Mm? I'm up. I'm awake. I'll start the roof.",
      ],
    },
    bye: [
      "Come back when it's done! Or before. Before's likelier.",
      "Bye, {name}. Next time there'll be a roof. Or a plan for one.",
    ],
  },

  // Wes Harrow, tanner. Few words. Knows he smells. Reads a man by his boots. Doesn't talk about her.
  wes: {
    first: [
      "You walked here. ...Feet show it. The others didn't.",
      { met: 'corran', say: "Corran said you'd walked in. ...He's right. Feet show it. Stay there, I'll move. Wind's wrong." },
    ],
    greet: {
      morning: [
        "Morning.",
        "Moth heard you coming. She's gone under the bench. She does that with people she likes.",
        "Morning. You're early. Smell's not up yet.",
      ],
      day: [
        { after: 'dead_cant_wait', say: "Moth smelled it on you. Sat down. Didn't growl." },
        "{name}.",
        "Busy. Talk while I work.",
        "Afternoon. Don't touch the hides.",
      ],
      evening: [
        "Evening, {name}.",
        "Evening. She'd have liked this light. ...Never mind.",
        "Done for the day. Smell isn't.",
      ],
      night: [
        "Late.",
        "Go home. Dog's restless.",
        "Can't sleep? Me neither. Don't talk about it.",
      ],
    },
    about: [
      "Wes Harrow. Tanner.",
      "You'll have smelled me first. Everyone does.",
      "Just me and the dog. Dog was hers.",
    ],
    ask: {
      tessariels: [
        "Same boots, all twelve. Good boots. Cordwain, double-stitched. Walked the whole Long Road, they say. Not a scuff on the toe.",
        "Thirty mile of road and clean soles. You tell me how.",
        "Asked one to show me his boots. He thought I was kneeling to him. Let him think it.",
      ],
      knight: [
        "Not been. Won't go.",
        "Black plate. Leather under, has to be. Straps. Buckles. Somebody stitched that man in. Like to know who.",
      ],
      dead: [
        "Dog knows. Won't go west after dark. I don't make her.",
        "Corran brings me deer from the pines. Some half eaten. Not by wolves. Wolves take the good bits.",
      ],
      lis: [
        "Brought me a bladder of something for the vats, years back. Best hides I ever turned. Didn't ask what. Still don't want to know.",
        "Doesn't mind the smell. Only one who doesn't. Says she's smelled worse. I believe her.",
      ],
      town: [
        "Upwind of me, mostly. Suits them.",
        "Good folk. Keep their distance. Can't blame them.",
      ],
      boots: [
        "Boots tell you where a man's been. Theirs say nowhere. Yours say a cave, and a long way down.",
        "Look after your feet. Spells won't carry you home. Feet will.",
      ],
      moth: [
        "Moth. Good dog. Deaf one side. My wife named her.",
        "Sleeps under the bench by day, by the door at night. Waiting for someone. Not me.",
      ],
    },
    topics: { boots: 'Boots', moth: 'Your dog' },
    barks: {
      morning: [
        "Vats first.",
        "Moth's not out yet. Won't be till the smell's up.",
        "Wind's turned. Sorry, town.",
        "Lime's low.",
      ],
      day: [
        "Hot. Smell's worse hot.",
        "Don't touch that. Not dry.",
        "Moth's under the bench. Sulking.",
        "Good hide, that.",
      ],
      evening: [
        "Done.",
        "Moth's off to the stream. Back when it's dark. Always is.",
        "Hands won't wash. Never do.",
        "Another day in the lime.",
      ],
      night: [
        "Dog's restless.",
        "Who's there? ...Go home.",
        "Can't sleep. Never mind.",
        "Moth's at the west wall again. Growling.",
        quiet("Bell's done. Moth's sleeping through. First time in a month."),
      ],
      work: [
        "Scrape. Scrape. Turn.",
        "Stinks. Good. Means it's working.",
        "Moth won't come near the vats. Clever dog.",
        "Old bull. Thick hide. Stubborn as me.",
        "Week more in the lime.",
      ],
      player: [
        "{name}. Still walking. Good.",
        "Careful of the hides, {name}.",
        "Feet holding up, {name}?",
        "{name}. Stand off a bit. For your sake.",
      ],
      magic: [
        "Hm.",
        "Not near the lime.",
        "That's Moth gone under the house for the day.",
        "Seen a lot. Not that.",
      ],
      woken: [
        "Moth didn't bark. Why didn't Moth bark?",
        "Out.",
        "Thought you were— Never mind. Out.",
        "What. What is it. Who's hurt.",
      ],
    },
    bye: [
      "Right.",
      "Look after your feet.",
      "Go on. Mind Moth's bowl on the step.",
    ],
  },

  // Tamsin Reed, tailor. Small, red, fierce, brilliant with cloth. Swears and catches it halfway.
  tamsin: {
    first: [
      "Turn round. Slowly. ...Who did that to you? The hem. Who did that to your hem?",
      { met: 'wenna', say: "So you're Wenna's new colour. Turn round. ...You came out of a cave in that? It looks like the cave came out in it." },
    ],
    greet: {
      morning: [
        "Morning. You're still wearing that. Bold.",
        "{name}. If you're here to buy, buy. If you're here to talk, talk fast.",
        "Morning. My sister's singing. Sorry. She does that. Every bl— every morning.",
      ],
      day: [
        { after: 'dead_cant_wait', say: "You've catacomb on your hem. Eight of them, by the smell. Don't sit on anything of mine." },
        "Stand still. No, stiller. I'm looking at your seams.",
        "Afternoon. You've torn it. Don't lie to me, I can see it from here.",
        "Oh, it's you. Sit. Not there, there's pins there. There's pins everywhere.",
      ],
      evening: [
        "Evening, {name}. Shop's shutting. My temper isn't.",
        "I've been thinking about your sleeves all day. Not kindly.",
        "Evening. Did you get blood on it? You got blood on it.",
      ],
      night: [
        "What do you want at this hour? If it's a robe, no. If it's anything else, also no.",
        "{name}. It's dark. Go and be mysterious somewhere I'm not.",
      ],
    },
    about: [
      "Tamsin Reed. I weave and I tailor, and I'm the only one in fifty miles who does either properly.",
      "That's my sister Wenna, the purple one. She dyes. I do everything else.",
      "I'm told I've a temper. I'm told by people who don't hem.",
    ],
    ask: {
      tessariels: [
        "Same blue, same silver, same crooked sunburst, every one. That's one pair of hands. I'd like a word with whoever owns them.",
        "One asked me to mend his tabard for 'the final battle'. I charged him double. He never came back for it. It's still on the peg.",
      ],
      knight: [
        "Black cloak. Good wool. I've watched it from the rise in a gale and it never once moved. Explain that to me. No, don't. I'd like to sleep.",
        "Cedric Ashby asked me for a black cloak like the knight's. I said I'd make it when he's stood still for a month.",
      ],
      dead: [
        "Every shroud in that ground's a Reed shroud. My mother's, mostly. I'd know our stitch on a corpse at fifty paces. I've had to.",
        "They're walking about in our best work. Mother's hems, holding up lovely. I don't know whether to be proud or sick, so I'm both.",
      ],
      lis: [
        "Same black shawl every visit for thirty years. Never faded, never frayed. I offered her gold for it. She laughed in my face. Lovely woman.",
        "She's the only one in town who's never asked me to make her anything. I find that very suspicious.",
      ],
      town: [
        "Every b— everyone in this town has worn the same coat since their wedding. I could dress them blind.",
        "When the wind's from the tannery I shut the shop. Wes sends a boy to say sorry. The boy smells as well.",
      ],
      robes: [
        "Who cut that? No, don't tell me. I'll only go and find them.",
        "Your hem's been through a cave, a road and something on fire. You need a robe so badly I'd sell you one at cost. I won't. But I'd want to.",
        "You move like you fight in it, so it wants room in the shoulder and none at the ankle. Whoever made that thought you'd stand about looking wise.",
      ],
      silk: [
        "Shroud silk's the best cloth in Eldravayne. Nobody'll wear it because of where it's been. More fool them. The dead don't sweat.",
        "Bring me the silk they're buried in and I'll make you something you won't be buried in. That's a promise, not a guarantee.",
      ],
    },
    topics: { robes: 'My robes', silk: 'Shroud silk' },
    barks: {
      morning: [
        "Wenna! Not that song. Any other song.",
        "Who's had my shears? Who's had my— oh.",
        "Morning, morning, yes, morning.",
        "Somebody's left a door open and I can smell Wes.",
      ],
      day: [
        "Look at that coat. Look at it. Somebody fetch the watch.",
        "Son of a— needle. Needle went in.",
        "Homunculus wants the cloak bigger. It's always bigger.",
        "That's not a seam, that's a rumour.",
        "Ashby red again. Every day, Ashby red.",
      ],
      evening: [
        "Shutting! Shut! Gone!",
        "My eyes. My bl— my eyes.",
        "Wenna, bring the lamp. No, the good lamp.",
        "Pins out. Shears away. Temper... later.",
      ],
      night: [
        "Who's out there? I've got shears.",
        "If that's a Tessariel, I'm not mending anything.",
        "Can't sleep. Thinking about hems.",
        "Wenna, you're humming in your sleep again.",
      ],
      work: [
        "Over, under, over. Sh— under.",
        "Pins. Pins. Where's the— pins.",
        "That'll hang. That'll hang lovely.",
        "Who wove this? Oh. Me. Never mind.",
        "Wenna, your elbows are on my white!",
      ],
      player: [
        "That hem, {name}. I can't stop looking at it.",
        "{name}! Don't walk past me in that. It hurts.",
        "You've singed it. You've gone and singed it, {name}.",
        "{name}. Come here. I've an opinion.",
      ],
      magic: [
        "Not near the cloth! Not near the bl— cloth!",
        "Did that come out of your sleeve? I need to see that sleeve.",
        "That's going to scorch the lining. I know it is.",
        "Do it again and I'll charge you for the smoke.",
      ],
      woken: [
        "Sh— What? It's the middle of the bl— Get out of my window.",
        "If it's about a robe, I'll make you one to be buried in.",
        "Wenna, there's a wizard. Hit it with something.",
        "I'm not open. I'm not even dressed. Go.",
      ],
    },
    bye: [
      "Go on. Try not to tear it.",
      "Bye, {name}. Look after that hem. Somebody has to.",
    ],
    shop: {
      open: [
        "Robes. Proper ones. Wash your hands before you touch anything.",
        "Everything here's ours, start to finish. Wenna dyed it, I did the rest. Look. Don't paw.",
      ],
      closed: [
        "Shut. I've pins in my mouth and murder in my heart. Come back tomorrow.",
        "Shop's shut. Ask again and it'll be shut longer.",
      ],
      buy: [
        "Good. Wear it. Fight in it, that's what it's for. Just don't bleed on the hem.",
        "There. Now you look like you meant to.",
      ],
      sell: [
        "Hm. Not bad. Not mine, so not good. I'll take it.",
        "Who made this? ...Fine. I'll unpick it and make it into something decent.",
      ],
      poor: [
        "That's not enough. That's not near enough. Come back with coin, or a dead man's nightshirt.",
        "I don't do credit. I did once. He's in Silas's yard now.",
      ],
    },
  },

  // Wenna Reed, dyer. Dreamy, sweet, purple to the elbows. Sees everyone as a colour. Sings to the vats.
  wenna: {
    first: [
      "Oh. You're a colour I haven't got. Hold still, I'm trying to remember it.",
      { met: 'tamsin', say: "Tamsin's been at your hem, hasn't she? You've gone a sort of pinched pink. Don't shake my hand. I'll mark you purple for a week." },
    ],
    greet: {
      morning: [
        "Morning. You're a pale gold today. That's a hopeful colour. Be careful with it.",
        "{name}! The madder's come up perfect. Look. No, look properly.",
        "Morning. I've been singing to the woad. Tamsin says it doesn't help. It doesn't hurt.",
      ],
      day: [
        "You've gone a bit grey round the edges. Sit in the sun a minute.",
        "Hello, {name}. Careful of the vats. Careful of me, I'm all wet.",
        "Hold this. It's only wet. It's only purple.",
      ],
      evening: [
        "This is my favourite light. Everything's the same colour for a minute. Even the Ashbys.",
        "{name}. Come to the inn later. I'm singing. Tamsin will pretend not to listen.",
      ],
      night: [
        "Oh. I thought you were someone else. You were the wrong colour for it.",
        "It's so dark, {name}. Dark isn't black, you know. It's blue that's given up.",
      ],
    },
    about: [
      "Wenna Reed. I'm the dyer. Tamsin's the tailor. I'm the purple one.",
      "I make the colours and she makes them into things. She shouts and I sing. It works.",
    ],
    ask: {
      tessariels: [
        "Every one of them comes in gold, like the inside of an egg. By the third day they've gone grey. They always go grey.",
        "Their blue's wrong. Too even. Real woad goes patchy, like sky. Theirs looks poured.",
      ],
      knight: [
        "I can't see a colour on him. Black isn't a colour. It's what's left when the others go.",
        "Tamsin says his cloak doesn't move. I've looked. It does move. It moves against the wind.",
      ],
      dead: [
        "Corran came in with something on his sleeve from the pines. I couldn't name the colour. I can name every colour.",
        "At night the pines go a green that isn't in any plant. I've never told anyone. Now I've told you.",
      ],
      lis: [
        "She brought me a lichen once that dyes the exact colour of a bruise healing. I've never found it since. She said I wouldn't.",
        "She said my vats smell like her mother's kitchen. I didn't know she had a mother. I can't picture it at all.",
      ],
      town: [
        "Bellmourn's grey-green. Moss and slate and old smoke. Except the Ashbys. Their red's too sure of itself.",
        "Everyone's a colour. Hob's brown bread. Bess is mustard. Silas is the blue just before snow.",
      ],
      purple: [
        "I saw the purple light on the hill road. Only once. I've been trying to dye it ever since. I'm getting close. I don't think I should be.",
        "Everyone says 'the purple light' like it's one colour. It was nine. I counted. I've made four.",
      ],
      songs: [
        "Mother taught me the dyeing songs. You sing while it steeps, so you know when to lift. Madder for the morning, woad for the night...",
        "Maudie knows the old songs with the words changed. I know a few with the words still in. I only sing those to the vats.",
      ],
    },
    topics: { purple: 'The purple light', songs: 'Your songs' },
    barks: {
      morning: [
        "Madder for the morning, woad for the night...",
        "Oh, look at the sky. Nobody's looking at the sky.",
        "The woad's gone green. It's meant to. It still makes me jump.",
        "Morning, crows. You're very black today.",
      ],
      day: [
        "Oak gall for the mourning, alder for the grave...",
        "Tamsin! It took! The blue took!",
        "That's not purple. That's nearly purple.",
        "Everyone's a bit grey today. Is something coming?",
      ],
      evening: [
        "This light. Oh, this light.",
        "Down to the water, the cloth goes in white...",
        "Everything's one colour now. Just for a minute.",
        "I'll sing at the inn. Tamsin will hum. She'll deny it.",
      ],
      night: [
        "There it is again. No. No, it's gone.",
        "Who's that in the lane? She's a lovely colour.",
        ringing("When the bell goes, everything goes bruise-coloured."),
        quiet("No bell. The dark's stayed blue all night. I didn't know it could."),
        "Hush now, the vat's asleep...",
      ],
      work: [
        "Stir and lift. Stir and lift.",
        "Not yet. Not yet. ...Now.",
        "Look at my arms. Purple to the bone.",
        "Madder and alum, madder and alum...",
        "Tamsin, it's the wrong red. It's a lovely wrong red.",
      ],
      player: [
        "{name}! You're a different colour today.",
        "Hello, {name}. Don't shake my hand.",
        "{name}, your skull's gone a lovely ivory.",
        "You look tired, {name}. Tired's a sort of lilac.",
      ],
      magic: [
        "That colour! What was that colour?",
        "Oh. Oh, that's the one. No. Nearly.",
        "Your fire's the wrong orange. It's beautiful.",
        "I need that blue. Can I have that blue?",
      ],
      woken: [
        "Is it morning? It's so blue.",
        "I was dreaming in a colour that doesn't exist. Now it's gone.",
        "Tamsin! ...No, don't wake Tamsin. Whisper.",
        "Oh, it's you. I thought it was the light again.",
      ],
    },
    bye: [
      "Bye, {name}. Try to stay that colour.",
      "Go gently. I'll sing you something when you're back.",
    ],
  },

  // Corran Thrale, hunter. Lives at the west edge where the Long Road comes in. Has seen the pines. Nobody listens.
  corran: {
    first: [
      "Stop there. ...You came in off the Long Road. Did anything follow? Turn round. Look properly.",
      { met: 'aldric', say: "Aldric's had his look at you. Now I'll have mine. ...Nothing followed you in. Good. You're something new, or the worst of them yet. I'll know by the week's end." },
    ],
    greet: {
      morning: [
        "You came back. Good. Not everyone does.",
        "Morning. Seven by the north stream last night. Nobody wants to hear it. You can.",
        "Morning. Ground's soft. Tracks are clear. I don't like what's in them.",
      ],
      day: [
        "{name}. Busy. Speak or walk.",
        "Afternoon. They're quiet in the sun. Quiet isn't gone.",
        "Been out past the stones? What did you see? Don't round it down.",
      ],
      evening: [
        "Light's going, {name}. If you're going out, go now or not at all.",
        "Evening. They're moving. You won't see them yet. I can hear them.",
        "Lamps going on in town. Like that's the answer.",
      ],
      night: [
        "You're out. So am I. That's two of us with any sense.",
        "Quiet. ...Listen. That's not deer.",
        "Back to the light, {name}. Eyes on the trees.",
      ],
    },
    about: [
      "Corran Thrale. I hunt. I trap. I watch the road.",
      "Lodge is the last door before the pines. First thing you see coming in. Last thing going out.",
      "And I'm the one nobody listens to. You'll hear that about me. It's true.",
    ],
    ask: {
      tessariels: [
        "I've walked four of them in off the road. Every one asked me where the Dark Lord lives. Like asking the way to the mill.",
        "Every one of them talks about the woman. I've been on that road every night for a month and never seen her. She picks who sees her.",
      ],
      knight: [
        "I don't care about the knight. He stands still. I care about the ones that don't.",
        "The knight's the reeve's trouble, or the Throne's. The pines are mine. Nobody else wants them.",
      ],
      dead: [
        "Packs of six, eight. They don't track like wolves. Wolves go round. These go straight. Through bramble, through the stream, through a deer if it's in the way.",
        "Eleven last night under the north pines. Standing in a ring, facing in. Like they were waiting for someone to start talking.",
        "I told Aldric. He lit another lamp. I told the reeve. He wrote it down. I told the inn. They bought me a drink to stop.",
      ],
      lis: [
        "She came down the road with you. Kept up the whole way. Seventy if she's a day, and she kept up.",
        "She trades me herbs for salt. Thirty years. I can name every plant in those woods, and I can't name hers.",
      ],
      town: [
        "This town would rather light a lamp than look out of the window.",
        "Good people. Blind as moles, by choice. They'll still be lighting lamps the night the lamps stop working.",
      ],
      pines: [
        "West and north, past the stones, the pines go thick. That's where they walk. Mornings I find the needles scuffed in lines, like a crowd went to church.",
        "I loved those woods. Thirty years. Now I go in at noon and I'm out by one, and I don't stop for anything.",
        "Put them down. Not chase them off. Not shout at them. Put them down so they stay down. I'll pay. I'm the only one in Bellmourn who will.",
      ],
      silver: [
        "Walks the green, round and round, where the children are. Never looks at the trees. I've stopped asking him to.",
        "I asked him to come west with me one night. He bowed. Then he went back to his corner. I'll take that as no.",
      ],
      road: [
        "Long Road's the only way in that isn't through trees. That's why I live on it. I want to see what comes.",
        "Up the road's where you came from. Lis's cave. Nothing up there now but rock and candle grease. And whatever let you walk out.",
      ],
    },
    topics: { pines: 'The pines', road: 'The Long Road' },
    barks: {
      morning: [
        "Tracks by the gate. Fresh.",
        "Seven last night. Seven.",
        "Morning. Count your children.",
        "Frost on the snare. Nothing in it. Something tried.",
      ],
      day: [
        "They don't sleep. They wait.",
        "Nobody listens. Fine.",
        "Sun's high. Pines are quiet. Pines are lying.",
        "Another lamp. That'll fix it.",
      ],
      evening: [
        "Light's going. In, the lot of you.",
        "There. Hear it? No. You never do.",
        "Shut your doors. Not for me. For you.",
        "Last light. First of them.",
      ],
      night: [
        "Something in the pines. Big.",
        "Stay by the lamps.",
        "Six. Seven. ...Eight. Getting bolder.",
        "I can see you. Can you see them?",
      ],
      work: [
        "Wire's cut. Not by teeth.",
        "Snare's good. Bait's gone. Hm.",
        "Wood for the lamps. Everyone wants lamps. Nobody cuts for them.",
        "Fletching's wet. Damn it.",
        "Need arrowheads. Means a speech from Homunculus first.",
      ],
      player: [
        "{name}. Been out? How many?",
        "Don't go west after dark, {name}. Or do. Just come back.",
        "{name}. You're the only one who looks at the trees.",
        "Twelve, {name}. Put down twelve and I'll pay.",
      ],
      magic: [
        "...Do that in the pines. That. Exactly that.",
        "Will that keep them down? Tell me it keeps them down.",
        "Finally. Somebody with something.",
        "Fire. Good. They don't like fire. I've seen.",
      ],
      woken: [
        "Who— Hand off the door. Slowly.",
        "If it's them, say so. If not, go.",
        "I heard you three doors off. Night's when I hear things.",
        "How many? Where? ...Oh. It's you.",
      ],
    },
    bye: [
      "Watch the trees.",
      "Go on. Come back, {name}. I'll be watching the road.",
      "Back to the light. Eyes on the dark.",
    ],
  },

  // Silas Crane, undertaker and sexton. Gallows humour, gentle hands. Nine coffins in the yard and nowhere to put them.
  silas: {
    first: [
      "Ah. You're the one with a friend in your hand. May I? ...Lovely brow. Somebody looked after him.",
      { met: 'bram', say: "Bram sent word. Don't mind me looking; I measure everyone. It's a habit, not a forecast. ...And who's this in your hand? Lovely brow. Somebody looked after him." },
    ],
    greet: {
      morning: [
        "Morning. Still breathing, I see. That's the best I can say for anybody.",
        "My nine send their regards. Well. They don't. They would.",
        "Morning. Dew on the lids. I dried them off. Habit.",
      ],
      day: [
        "Afternoon, {name}. Come in out of the sun. The coffins don't mind it. I do.",
        "Careful in the yard. They're stacked three high, and the bottom's Wat Cotter, who never liked being stood on.",
        "Ah, {name}. Still got all your parts. I always check.",
      ],
      evening: [
        "Long shadows. Good light for a funeral. Not that I'm allowed one.",
        "Evening. I've lit a lamp in the yard. They don't need it. I do.",
      ],
      night: [
        "{name}. Late to be out. The dead keep worse hours than you, and they're not the worst of it.",
        "Late to be walking. I'd say mind how you go, but I'd only be drumming up business.",
      ],
    },
    about: [
      "Silas Crane. Undertaker, sexton, coffin maker. Forty years. Everyone in Bellmourn comes to me in the end. I try not to take it personally.",
      "I carve skulls, too. Cleaned, boiled, done properly. Somebody ought to look after them, and the somebody's me.",
    ],
    ask: {
      tessariels: [
        "I measure everyone by eye. Can't help it. I've had the numbers on every one of them. Never needed them. Nothing came back to measure.",
        "They look at my yard like it's somebody else's yard. That's youth. It's a lovely thing, and I'm sorry for it every time.",
      ],
      knight: [
        "Forty years I kept that ground. Now a man stands at the door and won't let me in to dig. I'd ask for his papers, but I'd like to keep my head for my own funeral.",
        "A month and more on my step. Never once wiped his feet.",
      ],
      dead: [
        "A grave's a promise. Six foot of earth and a lid, and you stay put. Somebody down there's breaking promises, and I don't think it was the dead's idea.",
        "They're coming up because nobody's going down. Leave a house empty long enough and something moves in.",
      ],
      lis: [
        "I made her a box forty years back, on spec. She's never fit it twice.",
        "She came by to look at the yard. Counted the coffins, nodded, and said, 'Not yet.' I've never known which of us she meant.",
      ],
      town: [
        "Lovely town. I've buried the best of it. The rest are coming along nicely.",
        "Small enough that I've known everyone in it. Big enough to keep me busy. It's the right size, for my trade.",
      ],
      coffins: [
        "Nine in the yard, stacked three high. The smallest's the Hollis girl. Four days old. I keep her in the shed, out of the rain.",
        "The Widow Garrow wanted elm. Wat Cotter wanted pine and no fuss. Old Aunt Ashby wants burying facing Halloway House, to keep an eye on them. I've written it all down.",
      ],
      door: [
        "There's a little door low in the back wing, round the south side, out of the great door's sight. Sextons' door, for when you'd rather not use the front. Key's on my belt. Heavy for its size, like most things I carry.",
        "Old stair, low roof, straight down to the Reliquary. I've not been since the knight came. I've been meaning to. I've been meaning to for a month.",
      ],
    },
    topics: { coffins: 'The nine coffins', door: "The Sexton's Door" },
    barks: {
      morning: [
        "Morning, neighbours.",
        "Dew on the lids. Never mind.",
        "Up early, Wat? No. Just me, then.",
        "Good morning to be alive. I'd know.",
      ],
      day: [
        "Measure twice, bury once.",
        "Lovely bit of elm, this.",
        "Nine. Still nine. Good.",
        "Not yet, Widow. Not yet.",
      ],
      evening: [
        "Evening, all. Sleep well. Stay put.",
        "Lids on. Good night, everyone.",
        "Long shadows. Good for nothing but funerals.",
        "Lamp's lit. Nobody wander.",
      ],
      night: [
        ringing("Bell'll go soon. Always does."),
        quiet("No bell tonight. My nine sleep sounder for it. So do I."),
        "Stay down, the lot of you. Please.",
        "Who's that? Not one of mine, I hope.",
        "Quiet night. Quiet nights are bad for trade. I shouldn't say that. I've said it.",
      ],
      work: [
        "Plane, plane, plane. Smooth as a goodbye.",
        "Boil, scrape, polish. There's a good fellow.",
        "Hold still, sir. You're nearly a skull.",
        "Bit of beeswax on the brow. There. Handsome.",
        "Pegs, not nails. Nails rust. Pegs just wait.",
      ],
      player: [
        "{name}! Still all in one piece?",
        "How's your skull, {name}? Treating you well?",
        "{name}. You're looking very alive today.",
        "I've a lovely jaw in, {name}, if you're shopping.",
      ],
      magic: [
        "That'd save me a lot of digging.",
        "Oh, my. Not in the yard. They're sensitive.",
        "Well. Now I've seen everything. That's usually a sign.",
        "Lovely. Terrible. Lovely.",
      ],
      woken: [
        "I'm not dead. Come back when I am, you'll get better service.",
        ringing("Is it the bell? Is it my turn? ...Oh. It's you."),
        quiet("Is it my turn? ...Oh. It's you. I'll take that."),
        "Even my customers sleep at this hour.",
        "Shop's shut. So's the undertaker. Goodnight.",
      ],
    },
    bye: [
      "Go carefully. Come back the same shape.",
      "Mind how you go, {name}. Come back all of you, if you can.",
      "Goodbye, {name}. Not the long one.",
    ],
    shop: {
      open: [
        "Skulls. Cleaned, boiled, carved. Nobody's grandmother, I promise. Well. Nobody's you'd know.",
        "Have a look. Pick them up. They like being held.",
      ],
      closed: [
        "Shop's shut. The dead keep hours. So do I.",
        "Not now. At my age, being alive's a whole day's work.",
      ],
      buy: [
        "Mind the jaw. It's carved, but it remembers.",
        "There. You two will get on. He was very quiet in life, too.",
      ],
      sell: [
        "I'll take him. Poor fellow. He'll go on the shelf with friends.",
        "He's been carried hard, this one. I'll give him a rest on the shelf before anyone else takes him out.",
      ],
      // (Bone Shards sold to him: src/ui/folk.js sellMat.)
      sell_bone: [
        "Bone shards. Lovely. Somebody's going to be a skull again.",
        "A satchel of somebody. I'll sort them by who. It takes a while. I've the while.",
      ],
      poor: [
        "That's short. I'd give it you on credit, but I know how my customers end up.",
        "Not enough. Come back richer. Or don't, and I'll see you eventually.",
      ],
    },
  },

  // Sabine Moss, herbalist and midwife. Calm, dry, clinical. Has half worked out what Old Lis is and won't finish the thought.
  sabine: {
    first: [
      "You came down with Lis. ...Sit. Let me see your eyes. I'm not being kind. I'm being careful.",
      { met: 'bryony', say: "Bryony's told me about your skull. Twice, with measurements. Sit. Show me your hands. Burns? Of course burns." },
    ],
    greet: {
      morning: [
        "Morning. Sleep? You didn't. Valerian, a pinch, in warm milk. If you can find milk that hasn't turned.",
        "Bryony's taken the trowel again. If you see a small girl digging up something dead, she's mine.",
        "Morning. I was up with a breech baby at the mill. Both fine. I'm not.",
      ],
      day: [
        { after: 'dead_cant_wait', say: "You came up smelling of lime and old linen. Eight, is it? Give me your hands; I'll take the cold out of them." },
        "{name}. Sit or stand, but don't touch the foxglove.",
        "Afternoon. You're favouring that side. Don't tell me it's nothing. I'll decide what's nothing.",
        "Good, you're here. Hold this bundle. Upside down. It's drying, not dead.",
      ],
      evening: [
        "Evening, {name}. You're back. I make a note of that. Professionally.",
        "Evening. Lis went up the lane an hour ago. Old. Slow. ...Old.",
        "Lamps are lit. Go wherever you're going, or stay. Don't do the in-between.",
      ],
      night: [
        "{name}. Out at night. Are you hurt? No? Then you're only foolish. I've nothing for that.",
        "If you've seen a woman in the lane, {name}, I don't want to hear about it.",
      ],
    },
    about: [
      "Sabine Moss. Herbalist. Midwife. I bind what's broken, mostly, and I bring in what's new.",
      "I've delivered half the children in this town. The other half came while I was on the road and have never let me forget it.",
      "Bryony's mine. Don't let her near your skull. She'll want to measure it.",
    ],
    ask: {
      tessariels: [
        "Every one comes in with pupils like coins and something sweet on the breath. By the third day it's gone, and they're just frightened men in someone else's armour.",
        "I sat up with two of them, fevered. Both talked in their sleep. Same words. Same woman. I wrote it down. In the morning I burned it.",
      ],
      knight: [
        "Three men went up the hill. I heard them for an hour. I've sat with the dying. That wasn't dying. Dying's quieter.",
        "Aldric asked what I'd need if anyone came back from the door. I told him nothing. I'd need nothing at all.",
      ],
      dead: [
        "Corran brought me a hand from the pines. Wanted to know how long it had been dead. Forty years, I said. Then it closed.",
        "Milk's turning all over town. Bess blames the weather. I've tested it. It isn't the weather. I don't know what it is. I hate that.",
      ],
      lis: [
        "Twelve years I've traded with her. I know her cough, her teeth, her bad hip. The woman in the lanes at night has no bad hip. That's all. That's all I'm saying.",
        "She brings feverfew picked fresh. It wilts in an hour. So she picked it here, in town, last night. Which means— No. Which means I pay her and stop thinking.",
        "She asked me once what I'd give to be young again. I said nothing, I was busy. She laughed like a girl. Exactly like a girl.",
      ],
      town: [
        "Hilde's ale and Agnes's bread keep more people alive than I do. Don't tell either of them.",
        "Healthy, mostly. Sick with worry. I've nothing for worry but valerian, and Agnes has the gossip, which works better.",
      ],
      bryony: [
        "She found a fox skull, a whole one, and now she wants the rest of the fox. Not a living fox. A complete one.",
        "She asked me what happens to us after. I said we go back to the earth. She said, 'Which bits?' She wanted a list.",
      ],
      babies: [
        "Three due before the tithe. I've told them all to hurry. Nobody listens to a midwife, least of all the babies.",
        "I delivered the Hollis girl. Silas has her now, in a box I watched him plane. That's the trade. Some you catch, and some you hand on.",
      ],
    },
    topics: { bryony: 'Your daughter', babies: 'Midwifery' },
    // Said back, after the tessariels: "She wasn't beautiful. She was old." (src/ui/folk.js OLD)
    old: [
      "Old. ...Did she favour the left? Stand with her weight off the hip, like this?",
      "Don't answer that. I didn't ask it.",
    ],
    barks: {
      morning: [
        "Bryony. Trowel. Now.",
        "Comfrey's up. Good.",
        "Three babies due. All late. Typical.",
        "Who's had the willow bark? Somebody's head hurts.",
      ],
      day: [
        "Don't touch the foxglove.",
        "Bryony, that's not a beetle, it's a— well. It is a beetle.",
        "Hm. Hm. No.",
        "Sage, then rue. Never rue, then sage.",
      ],
      evening: [
        "That's enough sun for the sage.",
        "Lamp, Bryony. And wash. Under the nails.",
        "Feverfew on the step. Fresh. ...Thank you, Lis.",
        "If anyone's bleeding, now's the time.",
      ],
      night: [
        "There's a woman in the lane. No. There isn't.",
        "If someone's bleeding, knock. If not, don't.",
        "Valerian. Then sleep. Then more valerian.",
        "Bryony, back in bed. The owl will wait.",
      ],
      work: [
        "A pinch, not a fistful. A pinch.",
        "Hold still. It stings. Then it doesn't.",
        "Rosemary, sage, a little rue. Not too much rue.",
        "This one heals. This one kills. Don't mix them up.",
        "Bryony, the drying rack is for herbs.",
      ],
      player: [
        "{name}. You're limping.",
        "Let me see that hand, {name}.",
        "{name}. Colour's better. Slightly.",
        "{name}. Eat something. That's advice, not kindness.",
      ],
      magic: [
        "That's— Hm. I'll need to think about that.",
        "Wrist. Give me your wrist. No, do it first, then the wrist.",
        "You'll have burns. Come and see me.",
        "That's not in any book I own.",
      ],
      woken: [
        "Is it a baby? Whose? ...It's not a baby.",
        "If you're not bleeding, I'm going back to sleep.",
        "I'm awake. I'm always awake for the wrong reasons.",
        "Bryony, stay in bed. It's only the wizard.",
      ],
    },
    bye: [
      "Go. Don't come back hurt. Or do. I'll be here.",
      "Keep it clean, {name}. Whatever it is.",
    ],
    shop: {
      open: [
        "Sit. Show me. No, the real one, not the one you're pointing at.",
        "Linen, honey, yarrow, and me. Tell me where it hurts. Then tell me where it really hurts.",
      ],
      closed: [
        "I'm shut. If you're dying, I'm open. Are you dying? Then I'm shut.",
        "Come back in the morning. If it's still bleeding then, we'll talk.",
      ],
      buy: [
        "Hold still. It'll sting, then it won't, and you'll forget it ever did. That's the whole trade.",
        "There. You'll mend. Try not to do whatever that was again.",
      ],
      sell: [
        "I don't buy. Take it to Magda. She'll give you half what it's worth and a story for the rest.",
        "I don't want it. I want you not bleeding. Different thing.",
      ],
      poor: [
        "That's short. I'd do it for love, but love doesn't buy linen.",
        "Not enough. Come back with more coin, or less blood.",
      ],
    },
  },

  // Bryony Moss, 8. Collects bones, beetles and dead things, and takes it very seriously.
  bryony: {
    first: [
      "That's a skull. Is it a man? It's a man. The brow's heavy. Can I hold it? I'll wash my hands after. Before, if you like.",
      { met: 'sabine', say: "Mam says I'm not to ask to hold your skull. ...I'm not asking. I'm only standing near it." },
    ],
    greet: {
      morning: [
        "I found a jaw by the stream. Sheep. Probably sheep.",
        "Mam says I can't keep the vole in my bed. I'm keeping it under my bed.",
        "Morning. First light's best for finding things. That's when you get the ones the owls dropped.",
      ],
      day: [
        "{name}, hold still. You've got a moth on you. It's dead. Can I have it?",
        "Did you kill anything today? Did it have bones?",
        "{name}. I'm busy. I'm sorting toes.",
      ],
      evening: [
        "Beetles come out when it gets dark. I'm allowed one more.",
        "Evening. I have to go in soon. I have to finish burying this bird first. Properly. Silas says properly or not at all.",
      ],
      night: [
        "I'm waiting for the owl. It's got a mouse. I want the mouse after.",
        "Shh. Corran says you can hear them in the pines at night. He doesn't say it to children. I listened at his window.",
      ],
    },
    about: [
      "I'm Bryony Moss. I collect bones.",
      "I've got a crow, a vole, a toad's skull, half a cat, and something Mam won't tell me the name of.",
      "Silas has the most bones in Bellmourn. I've got the second most. I'm eight.",
    ],
    ask: {
      tessariels: [
        "I asked one if I could have his finger bones when he was finished with them. He cried. I said I meant later.",
        "Hal says they're heroes. Heroes have the same number of bones as everyone. Two hundred and six. I asked Mam.",
      ],
      knight: [
        "Nobody's been near enough to see if there's a man inside. I'd look. I'd look very carefully and then run.",
        "If there's no man inside, there's no bones. Then what's holding him up? Mam won't say. Silas won't say. That means it's something.",
      ],
      dead: [
        "If they walk, the bones must still be joined up. That's very interesting. I'd like to see the knees.",
        "Mam says the dead don't heal. So if you cut one it stays cut. Like a drawing you can't rub out.",
      ],
      lis: [
        "She gave me a toad's skull. A whole one, with the little teeth. She's the only grown-up who gives proper presents.",
        "She knows the names of all the bones. Even the tiny ones in the ear. Mam was surprised. Mam's never surprised.",
      ],
      town: [
        "Wes's yard has good bones, but they smell. Silas's yard has better bones, but he won't share. Ours has beetles.",
        "Tam's my friend. He asks good questions. Tilly makes rules. Rules aren't questions.",
      ],
      collection: [
        "I've got sixty-two bones in a box under my bed. I've named them. Not names. What they are. That's better than names.",
        "My best one's a fox skull. My worst one's a chicken. Everybody's got a chicken.",
        "When I'm grown I'll be like Silas, but with a bigger shelf.",
      ],
    },
    topics: { collection: 'Your collection' },
    barks: {
      morning: [
        "Dead wren. Poor thing. Mine now.",
        "Mam! I found a— I'll show you later.",
        "Beetles first. Breakfast after.",
        "Dew makes the bones shiny.",
      ],
      day: [
        "Two hundred and six. Two hundred and six.",
        "That's not a stick. That's a femur.",
        "Tilly, I'm not playing unless I'm the undertaker.",
        "Hal, give that back. It's a vertebra.",
      ],
      evening: [
        "Owls hunt now. I'll get the leftovers.",
        "One more beetle. One more.",
        "I buried the bird properly. Silas would say so.",
        "Mam, I washed. Mostly. The important bits.",
      ],
      night: [
        "Was that an owl or a person?",
        "Can't sleep. Counting my bones. The box ones.",
        "The lady in the lane has very good cheekbones.",
        "I'd like to see one walk. From very far away.",
      ],
      work: [
        "Don't move. Beetle. Don't. Move.",
        "Scrape it gently. Gently. There.",
        "This is a shrew. Shrews are tiny on the inside.",
        "Into the box. Label. Next.",
        "Sorry, worm. You're not the one I want.",
      ],
      player: [
        "{name}! Can I see your skull? Just the teeth.",
        "{name}, if you find any bones, I'll trade.",
        "{name}, how old is your skull? I can guess. Let me guess.",
        "{name}. Is it true there's bones under the church? How many?",
      ],
      magic: [
        "Did it burn the bones too? Can I see?",
        "That's not in Mam's book. I'm telling her.",
        "Do it to a beetle! A dead one!",
        "Is the skull doing that, or you?",
      ],
      woken: [
        "I'm not asleep. I'm guarding the box.",
        "Is it the owl? Did it leave anything?",
        "Mam! ...No, don't tell Mam. She'll take the box.",
        "Shh. The vole's asleep.",
      ],
    },
    bye: [
      "Bye. Bring me something dead.",
      "Bye, {name}. Don't lose your skull. It's a good one.",
    ],
  },
};
