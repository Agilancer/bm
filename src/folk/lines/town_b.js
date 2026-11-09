// What the Ashbys, the Halloways, the watch and the tithe-man say. (Bible: tools/folk/cast.md.)
// A line kept for while the cathedral's bell still tolls each midnight, or for once its warden's put down (toll_of_bell);
// { met: id, say } in `first`: once the player has had a word with that person. (src/folk/quests.js sayable.)
const ringing = (say) => ({ before: 'toll_of_bell', say }), quiet = (say) => ({ after: 'toll_of_bell', say });

export const LINES = {
  // ---------------------------------------------------------------- The stone manor at the east end: the Ashbys (red and gold)

  corwin: {
    first: [
      "You. Thirteen, is it? Corwin Ashby, Reeve of Bellmourn. Before you begin: no speeches in the square before noon. And is that a skull? There's an ordinance on the carrying of remains. I'm almost certain there is.",
      { met: 'isolde', say: "Ah. My wife has spoken to you. You're still standing, so she has plans for you. Corwin Ashby, Reeve of Bellmourn. Whatever she told you I'd allow, I should very much like to hear it first." },
    ],
    greet: {
      morning: [
        "Good morning. Still alive, I see. I'll leave you on the roll, then.",
        ringing("Morning. I didn't sleep. The bell. Three times. I counted them, and then I counted the ceiling."),
        quiet("Good morning. It didn't ring. A month of it, and now nothing, and I shall have to write to someone. I don't know who wants to hear."),
        "Ah, {name}. Don't stand there, people will think I've stopped you. Walk with me, if you must.",
      ],
      day: [
        "I am extremely busy, which is to say I've been standing here worrying in an official capacity. What is it?",
        "Yes, {name}? Quickly. My wife is watching from the window. She's always watching from some window.",
        "Have you done anything today that I'll need to write down? Please say no.",
      ],
      evening: [
        "Have you seen the knight today? No? Good. Neither have I. Let's both keep it that way.",
        "Ah, {name}. Thirty-one households assessed, and only two of them cried. In this office, that's a good day.",
        "Off the streets soon, I hope. There's no curfew. There is simply a very strong recommendation.",
      ],
      night: [
        "What are you doing out? I'm out because I'm the Reeve. It's different.",
        "It's late. I'm only checking the lamps. Personally. All of them. Twice.",
        "Don't tell my wife you saw me. I'm not hiding. I'm reviewing the night.",
      ],
    },
    about: [
      "Corwin Ashby. Reeve of Bellmourn, by appointment of the Throne, with seal and ribbon. I keep the roll, the peace and the tithe, in that order, except at month's end, when it's the other way round.",
      "It is an honour to serve His Lordship. I say so every morning, to the mirror. Most mornings I believe it.",
    ],
    ask: {
      tessariels: [
        "Twelve of them. I've had to open a file. There is no regulation against claiming to be a god reborn. I have looked. Twice.",
        "They make speeches at the well, and speeches block the well. Ser Aldric says he can't arrest a man for being sad. I've checked. He's right. It's very frustrating.",
        "You're the thirteenth. Bram has it on his slate. I asked him to rub the slate out. He says it's a private slate. I have no authority over slates.",
      ],
      knight: [
        "I sent a polite note up the hill asking his business. My clerk came back without the note. Or his hat. He won't say what happened to the hat.",
        "Don't you see what it means? The Throne is taking an interest in Bellmourn. The Throne has never taken an interest in Bellmourn. I liked it that way. I liked it very much.",
        "Nobody goes up there. That isn't a regulation. It's just sense, which is rarer.",
      ],
      dead: [
        "The dead are not on the roll. They can't be taxed, fined or moved on. Frankly they're the most irregular thing in the parish, and that includes you.",
        "Silas wants leave to bury his nine. Bury them where? Past the knight? I've written him a very sympathetic letter. It doesn't help, but it's in writing.",
      ],
      lis: [
        "She lived outside the town bounds, so she was never assessed. Now her cave's fallen in and she's inside the bounds. I shall have to assess her. I'm dreading it.",
        "Old Lis called me a little lamp with no oil, in front of the whole market. I've no idea what she meant. My wife laughed for a week.",
      ],
      town: [
        "Bellmourn is an orderly market town of two hundred and six souls. Seven. I'll amend the roll. Unless you're leaving. Are you leaving?",
        ringing("A good town. Quiet. Pays its tithe, mostly on time. The bell tolls itself at midnight, but that's the bell, and the bell is not my department."),
        quiet("A good town. Quieter, now the bell's stopped. Everyone tells me that's good news. Nobody tells me whose."),
      ],
      tithe: [
        "Month's end. One part in ten of grain, wool and coin, one fowl in twelve, and anything of bell-metal over a pound. I don't write them. I only read them out, in a firm voice.",
        "Garth carts it to the barn, the Throne's wagon takes it from the barn, and everyone looks at me. I'm only the middle. Nobody ever forgives the middle.",
        "I don't keep a penny of it for myself. Hob Fenwick says otherwise. Hob Fenwick may say what he likes, quietly, in his own field.",
      ],
      isolde: [
        "My wife is the finest woman in Eldravayne. Please don't repeat that to her. It only encourages her.",
        "Isolde has plans. For the children, for the house, for me. I'm told about them afterwards, which saves time.",
      ],
    },
    topics: { tithe: 'The tithe', isolde: 'Lady Isolde' },
    barks: {
      morning: [
        "The roll. The roll. Where have I put the roll?",
        "Fine morning. Fine. Is anyone burning anything?",
        ringing("Three tolls again. Three. Everyone counted. I saw them counting."),
        quiet("No tolls. None. Somebody will want to know why. I'd rather it wasn't me."),
        "Morning, Hob. Fine field. Very... assessable.",
        "Breakfast, then the ledger, then the worrying. In that order.",
      ],
      day: [
        "Move along from the well, please. It is a well, not a pulpit.",
        "That cart is over the line. There is a line. I'll have one painted.",
        "Has anyone seen my clerk? Or his hat? Either would do.",
        "Market prices posted by noon! I'll post them myself. I always post them myself.",
        "Not now, not now. Reeve's business.",
      ],
      evening: [
        "Lamps! Lamps before it's dark, not after!",
        "Ledger shut. Day survived. Well done, Corwin.",
        "Isolde's guests again. More men from the capital. Smile, Corwin.",
        "Indoors, everyone. It's only a recommendation. A strong one.",
      ],
      night: [
        ringing("Is that the bell? It isn't the bell. It'll be the bell soon."),
        quiet("Midnight, and nothing. Is that allowed? Who allows it?"),
        "Inspection. Lamps, doors, bolts. It wants doing by someone with a title.",
        "Every lamp lit. Good. Good. I'll count them again.",
        "Hello? Hello? I have a lantern. And a title!",
      ],
      work: [
        "Fenwick, two sacks. Underhill, one. No, that's backwards. Again.",
        "A tenth. Just a tenth. Nobody ever says 'only' a tenth.",
        "Sign here. Or mark here. Or I'll mark it for you; it's quicker.",
        "Ink. Where's the ink? Who drinks ink?",
        "The figures don't lie. They do sulk.",
      ],
      player: [
        "{name}. Is this official? Please don't let it be official.",
        "Ah. The thirteenth. Not so close, please. People talk.",
        "Mind the skull near the stalls, {name}. People are eating.",
        "Do I bow? Is one meant to bow? There's nothing in the rules.",
      ],
      magic: [
        "Stop that! Is that licensed? Who licensed that?",
        "Fire! In the street! There's a regulation! There must be a regulation!",
        "Nobody saw that. I'm the Reeve, and I saw nothing. Nothing!",
        "Oh, good grief. I'll have to write to someone.",
        "Was that ice? In this month? I'll need a form for that.",
      ],
      woken: [
        "Isolde. Isolde! There's a Tessariel in the room.",
        "Is it the Throne? Tell them I'm dressed. I'm not. Tell them anyway.",
        "This is a private bedchamber! There's a regulation about bedchambers!",
        "I'm awake. I'm the Reeve. I'm awake. What's on fire?",
      ],
    },
    bye: [
      "Good day, {name}. Try not to cause any paperwork.",
      "Yes. Go. Carefully. And nowhere near the churchyard.",
      "Off you go, {name}. I'll put you down as 'helpful'. In pencil.",
    ],
  },

  isolde: {
    first: [
      "So you're the thirteenth. You walked in without making a speech. At last, someone with manners. Isolde Ashby. My husband is the Reeve. I'm the reason he still is.",
      { met: 'corwin', say: "Don't bow; you'd do it badly. Isolde Ashby. My husband will have quoted something at you, so you know what this house sounds like. This is what it thinks." },
    ],
    greet: {
      morning: [
        "You're up. I've four letters written already, and you wouldn't want to read one of them.",
        "Good morning, {name}. You still look like someone a woman sent. It suits you better than it did the others.",
        "Walk with me as far as the well. People should see us talking. I'll decide later what about.",
      ],
      day: [
        "I hear you've been useful. Don't let it become a habit; people start to expect it.",
        "Ah, the thirteenth. Do something today, would you? It would make such a change on that slate.",
        "{name}. You're in my light. No, stay. It makes a change to be blocked by something interesting.",
      ],
      evening: [
        "I have guests tonight, men from the capital with very clean boots. Don't come by. Or do, and be impressive.",
        "Evening, {name}. I've never minded the dark. It's honest about what it is.",
      ],
      night: [
        "Late for wandering. I'm allowed; I'm the one people tell things to.",
        "Out? So am I. Neither of us will mention it, I think.",
        "Night suits you. Most people look smaller in it. You don't.",
      ],
    },
    about: [
      "Isolde Ashby. The Reeve's wife, mother of four, and the only person in Bellmourn who reads the Throne's letters before the Reeve does.",
      "People think I serve His Lordship because I'm afraid. I'm not afraid. I've seen what the other side offered: candles and patience. I prefer roads that are kept.",
    ],
    ask: {
      tessariels: [
        "Twelve men, each told by a beautiful woman that he was chosen. I'd very much like to meet her. I have three daughters to marry, and she has a gift I've been doing without.",
        "They come in armour nobody's made in forty years, polished as if it were new. Someone in this kingdom is keeping it for them. I'd like to know who. I'd like to know very much.",
        "You're not like them. They all wanted to be told. You look like you'd rather be the one telling.",
      ],
      knight: [
        "My husband calls him a sign. He's right, for once. The Throne doesn't send a knight to a town it means to forget.",
        "He kills whoever knocks. Barbaric. It's also the most attention anyone has paid Bellmourn in twenty years.",
        "Cedric wants to be him. I want Cedric to marry the daughter of the man who sent him. One of us is being sensible.",
      ],
      dead: [
        "The dead are walking, the living are complaining, and the tithe is still due. Only one of those is my business.",
        "Ser Aldric says his lamps keep them out. I'm so pleased. I'd hate to think it was anything else keeping them out.",
      ],
      lis: [
        "Twice a year she comes down ugly and rude. This time she brought you. I don't trust a coincidence that walks.",
        "A beautiful woman sends men down the road. An ugly one walks the last of them into town. I'm sure there's no connection. I'm sure of it every morning, at some length.",
      ],
      town: [
        "Pretty, poor and loyal. I'm working on the middle one.",
        "Small towns are where people from large ones come to be noticed. When they come, Bellmourn will be worth noticing. I'll see to it.",
        quiet("The bell's stopped. My husband calls it a mercy. I think someone up the road will want to know why, and I mean to be the one who tells them."),
      ],
      children: [
        "Rosalind wants to be swept away. Seraphine wants to be useful. Juliana wants to be left alone. I can arrange two of those.",
        "Cedric wants to ride to the capital and serve. I'd rather he rode there and married. He's very handsome. It would be a waste to have him killed.",
        "Do not confuse my daughters. They take it badly, and I take it personally.",
      ],
      halloways: [
        "Our cousins. Charming people. A very old house, and very old habits. I do hope, for their sake, the habits aren't as old as the house.",
        "Margery and I take tea once a month. We say nothing for an hour. It's the most honest conversation in Bellmourn.",
        "Edric looks at you the way a hungry man looks at bread. If I were bread, I'd keep my distance.",
      ],
    },
    topics: { children: 'Your children', halloways: 'The Halloways' },
    barks: {
      morning: [
        "Seraphine. A word, after breakfast. In the little room.",
        "Letters first. Husband after.",
        "Corwin, your collar. No. The other way.",
        "Rosalind, put the book down. I know it's a book. It's always a book.",
      ],
      day: [
        "Smile at the Halloways, girls. Smile as if you mean it.",
        "Juliana. Shoulders. You're an Ashby, not a question.",
        "Speak up, Magda. If it's gossip, I have first claim on it.",
        "No, Corwin. Say it again, and this time sound sure.",
        "A man from the capital by the new moon. Have the good linen aired.",
      ],
      evening: [
        "Lamps already. My husband likes to be early to his fears.",
        "Cedric, where are you going? ...A walk. Of course.",
        "Guests within the hour. Everyone in red. Juliana, that means you.",
        "Here comes the dark. Always so polite about it.",
      ],
      night: [
        "Bed, all of you. I can hear who isn't.",
        ringing("Midnight soon. Count with me if you're frightened. I'm not."),
        quiet("No bell again. How very rude of someone."),
        "Whoever's out there, I'll know your name by breakfast.",
        ringing("Corwin, stop counting. It's always three."),
        quiet("Corwin, stop listening for it. It isn't coming."),
      ],
      work: [
        "Dear sir, my daughter Rosalind... No. Dear sir, my daughter Seraphine...",
        "Twelve candles a week. Who is burning twelve candles a week?",
        "Seal. Wax. The red. Always the red.",
        "If he wants Juliana, he can want her in writing.",
        "The accounts never lie. The household does.",
      ],
      player: [
        "The thirteenth. Stand there; you make the square look expensive.",
        "{name}. Walk on my left. People should see us.",
        "Better posture than any of the twelve. Good.",
        "That skull has better manners than half my guests.",
      ],
      magic: [
        "Do that again. Slowly.",
        "Useful. Very useful.",
        "Put it away before my husband sees and writes to someone.",
        "So it's real. How inconvenient for everyone.",
        "Now that I'll be mentioning in a letter.",
      ],
      woken: [
        "Whoever you are, you have until I find a candle.",
        "Corwin, there's a wizard in our room. Don't scream; it's undignified.",
        "You'd better be dying, or bringing news. Ideally both.",
        "If you've come to kill me, do it before I'm properly awake. It'll go easier for you.",
      ],
    },
    bye: [
      "Run along, {name}. Be interesting somewhere else for a while.",
      "Good day. If anyone asks, we discussed the weather. It was fascinating.",
      "{name}. Do keep living. I may have a use for you.",
    ],
  },

  cedric: {
    first: [
      "You're the new one. No armour? No sword? That's either very brave, or you lost them on the road. Cedric Ashby, the Reeve's son. Don't hold it against me. I'm leaving the first chance I get.",
      { met: 'elowen', say: "There's chalk on your sleeve. You've been at Elowen Halloway's lesson. Did she— does she ever mention— No. Cedric Ashby. The Reeve's son. Forget I said anything. I didn't." },
    ],
    greet: {
      morning: [
        "Morning! Want to watch me ride? I'm much better in the mornings.",
        "Morning, {name}. Ignore the yawning. I was up late. Thinking. About... horses.",
        "Going up the hill? Tell me what he's like up close. The knight. Every buckle.",
      ],
      day: [
        "Tell me again what the knight looks like. Oh, you haven't seen him. Pity.",
        "{name}. Mother's matchmaking again. If anyone from the capital asks, I've a terrible temper. Which is true.",
        "Thirteen! Fight me. With sticks. Tobias won't. He says it isn't fair, because I'm better.",
      ],
      evening: [
        "Getting dark. Good. I mean, nothing. I like the dark. For walking.",
        "Don't let me keep you. Really. Off you go. Please.",
        "{name}. Is my hair all right? Not that it matters. Forget I asked.",
      ],
      night: [
        "You! What are you doing here? I'm not here. I'm in bed. Asleep. Snoring.",
        "Shh. Keep your voice down. Owls. You'll frighten the owls.",
        "It's a big town. Plenty of trees. Go and find your own.",
      ],
    },
    about: [
      "Cedric Ashby. Best rider in Bellmourn, best blade in Bellmourn, and next spring I'm riding to the capital to serve the Throne, whatever anyone says.",
      "Father wants me to collect the tithe after him. Me. Counting other men's chickens. I'd rather fall off a horse. I'd rather fall off a cliff on a horse.",
    ],
    ask: {
      tessariels: [
        "Twelve men in borrowed tin, and all twelve sat a horse like a sack of meal. I watched the fifth try to mount from the wrong side. Twice. The horse was embarrassed for him.",
        "They make speeches about the darkness, then ask Bram for a bed on credit. Some chosen ones.",
        "You're different, I'll give you that. You don't talk about her. They all talked about her. Who was she? Was she really that beautiful? ...Never mind.",
      ],
      knight: [
        "Not a word. Three of your lot went up there shouting about darkness, and he didn't even answer. He just did it. That's a knight. That's what they're meant to be.",
        "Black plate, head to heel, and he hasn't left that door since the new moon. Not to eat, not to sleep. Imagine wanting anything that much.",
        "I'd give my left hand to hold his horse. Has he a horse? Nobody's seen one. I've thought about that a lot.",
      ],
      dead: [
        "I'd go out to the pines and put a few down myself. I would. Father's hidden my sword. He thinks I don't know where. It's in the flour bin.",
        "Corran says they come in packs. Good. A pack's just more to fight. Tobias says that isn't how numbers work. Tobias would.",
      ],
      lis: [
        "Old Lis told me I'd die young and handsome. Half of that's going very well.",
        "She's an old woman with a foul tongue, that's all. The other one, the one on the roads at night... No. That's nothing. People talk.",
      ],
      town: [
        "You can walk round Bellmourn before your ale goes warm. I've done it. Every night. Not for any reason.",
        "Bellmourn? I'd leave tomorrow. I would. There's nothing keeping me here. Nothing. Why are you looking at me like that?",
      ],
      capital: [
        "Next spring. Me, the grey mare and the Long Road. They say the Throne's guard wear black plate like his. They say you can see half the kingdom from the walls.",
        "I'll go, and I'll serve, and I'll come back a knight. Then nobody can tell me who I'm allowed to... who I'm allowed to do anything with.",
        "Mother wants me to marry upward. Father wants me to marry quietly. I want to ride to the capital. That's what I want. Obviously.",
      ],
      sisters: [
        "Rosalind sighs, Seraphine tells, Juliana bites. I love them. Through a wall.",
        "Never tell Seraphine anything. Never. She doesn't even mean harm by it. That's what makes it worse.",
      ],
    },
    topics: { capital: 'The capital', sisters: 'Your sisters' },
    barks: {
      morning: [
        "Who's for a ride before Father wakes?",
        "Yawn all you like. I had a very long night. Of sleeping.",
        "I'm not counting chickens, Father. I don't care whose they are.",
        "The grey mare's lame again. She does it to spite me.",
        "Up! It's a beautiful day to be somewhere else.",
      ],
      day: [
        "Black plate. Not a word. That's a knight.",
        "Tobias! Put the stick down before you hurt the stick.",
        "If one more person calls me 'the Reeve's boy'...",
        "One day I'll ride east and not look back. One day soon.",
        "Hah! Missed me. Everything does.",
      ],
      evening: [
        "Is it dark yet? It's dark enough.",
        "Just going for a walk. Nobody follow me. There's nothing to follow.",
        "Supper with the capital men again? I'll be ill. I can feel it coming on.",
        "Has anyone got a comb? No reason.",
      ],
      night: [
        "Shh. I'm not here.",
        "It's only me. Go back to sleep, Jory.",
        "Owls. That noise was owls.",
        "Mind the root. If there were a root. Generally.",
        "Who's there? Oh. I didn't see you, if you didn't see me.",
      ],
      work: [
        "Again. Cut, step, cut. He'd never miss. Again.",
        "Guard high. Higher. That's how he'd stand.",
        "Come on, you grey nag. The capital won't come to us.",
        "Thrust! Hah! Sorry, fence.",
      ],
      player: [
        "Thirteen! Been up the hill yet? No? Coward. Me neither.",
        "{name}. Is it true you can set a man on fire? From how far?",
        "Here's the wizard. Show us a trick. Small one. Behind the barn.",
        "{name}! If you ever go up the hill, I'm coming. Don't tell Mother.",
      ],
      magic: [
        "Now THAT's... No. No, a knight uses steel. Do it again, though.",
        "Did you see that? Did anyone see that?",
        "Ha! Burn it! Burn something else!",
        "That's cheating. That's brilliant. That's cheating.",
        "Do that up the hill and I'll write songs about you. Bad ones.",
      ],
      woken: [
        "I'm up! I'm up. I was never down. What?",
        "Is it morning? Did anyone see me come in?",
        "If it's Father, I'm ill. If it's Mother, I'm very ill.",
        "Out, thirteen, before I find my sword. It's in the flour bin.",
      ],
    },
    bye: [
      "If you see the knight, tell him... nothing. He wouldn't care. That's the beauty of him.",
      "See you, thirteen. Try not to die before I do something worth watching.",
      "Go. I've somewhere to be. Nowhere. Somewhere. Go.",
    ],
  },

  rosalind: {
    first: [
      "Oh. Oh, look at you. You've the look, you know. In the stories the doomed one always has a skull and nobody to love. I'm Rosalind Ashby. The one who reads. Not the one who prays, and not the one who bites.",
      { met: 'seraphine', say: "Seraphine's written you down; I saw her ink. Don't mind it. I'm Rosalind, the one who reads. If she's put you in her little book, I'll put you in a better one." },
    ],
    greet: {
      morning: [
        "Oh! I dreamt about you. Not like that. You were on a bridge, in the rain, and nobody came. It was lovely.",
        "Morning, {name}. I sat up all night finishing a book. She died. They always die. I'm starving.",
        "Mornings are so dull. Nothing romantic has ever happened before noon.",
      ],
      day: [
        "Has anything happened? Anything at all? Has somebody looked at somebody across the square?",
        "Oh, it's you. Stand there, against the light. Yes. Like that. Ah.",
        "{name}, if you were going to elope, which road would you take? It's for a book. Hypothetically.",
      ],
      evening: [
        "This is the best hour. Everything's half dark and everyone looks like a secret.",
        "Somebody in this town is in love. I can feel it in the air, like a storm coming. It isn't me. It's never me.",
        "Oh, {name}. Isn't dusk sad? I adore it.",
      ],
      night: [
        ringing("I couldn't sleep. I never can on the good nights. The bell might go. Somebody might be climbing a wall."),
        quiet("I couldn't sleep. There's no bell to wait up for now, so I wait up for footsteps. There are always footsteps."),
        "Out walking? Alone? In the dark? With a skull? You're wasted on this town.",
        "Shh. Mother thinks I'm asleep. I'm at a window. It's practically the same.",
      ],
    },
    about: [
      "Rosalind Ashby. Twenty, unmarried, unswept, and I've read every book in Bellmourn twice, including several that aren't supposed to exist.",
      "Mother means to marry me to a man from the capital with clean boots. I mean to be carried off by somebody with muddy ones. We haven't settled it.",
    ],
    ask: {
      tessariels: [
        "Every one of them loved her. You could see it in their faces. Loved her, and couldn't say what she was called. Isn't that the saddest thing you ever heard? I cried for a week. Juliana timed it.",
        "The sixth one let me hold his gauntlet. It was so cold. I keep thinking about how cold it was.",
        "You don't talk about her. They all talked about her. Either you're over her or you never met her, and I can't decide which is more romantic.",
      ],
      knight: [
        "What if he's under a curse? What if he's waiting for someone, and he's waited so long he's forgotten who? Don't laugh. It happens in three of my books.",
        "He kills everyone who comes near. Everyone. That's either very evil or very lonely, and in my experience it's both.",
      ],
      dead: [
        "In books the dead come back for love. These ones just come back. It seems such a waste of coming back.",
        "Silas has nine coffins in his yard. Nine. I walked past at dusk, and it was so sad I had to go home and lie on the floor.",
      ],
      lis: [
        "There's a woman on the roads at night, very beautiful, and every one of those poor men was sent by a beautiful woman, and nobody will listen to my theory. She's looking for her one true love. She just keeps choosing wrong.",
        "Old Lis? Oh, she's horrid. She told me my books would rot my teeth. Can books rot teeth? I've checked my teeth. I think they're all right.",
      ],
      town: [
        "Nothing happens here. Then twelve men walk in out of a story, and it's still nothing. That takes a kind of genius.",
        "Bellmourn has one bell that nobody rings, one road out, and one girl at a window waiting for anything at all. That's me. I'm the girl.",
      ],
      books: [
        "They're not forbidden. They're just not allowed. There's a difference, and the difference is the cover. I sew plain ones on. This one says 'Household Tallow'.",
        "Mother burned 'The Lantern and the Lady'. I'd already read it four times. You can't burn a book out of someone. You can only make them read it in their head.",
        "Orrin lends them to me. Don't tell anyone. He thinks they're history. Some of them might be, which is even better.",
      ],
      sisters: [
        "We're nothing alike. Seraphine is a shut door and Juliana is a slammed one. I'm a window. People mix us up anyway, and it makes me want to drown beautifully in a river.",
        "Tell Seraphine anything and you've told Mother. Tell Juliana anything and she'll tell you why you're wrong. Tell me. I'll only sigh.",
      ],
    },
    topics: { books: 'Your books', sisters: 'Your sisters' },
    barks: {
      morning: [
        "Morning. Nothing's happened yet. Nothing ever has.",
        "Where's my book? Who's hidden my book? Seraphine!",
        "Such a plain sky. Not one ominous cloud.",
        "I'm not reading. I'm resting my eyes on a page.",
      ],
      day: [
        "Somebody ought to propose at that well. The light's perfect.",
        "If a stranger asked me to run away, I'd at least hear him out.",
        "I'm Rosalind. Rosalind. The reading one. Honestly.",
        "Magda says a man in the next valley married a ghost. I need to know everything.",
        "Nothing. Still nothing. Still, still nothing.",
      ],
      evening: [
        "Dusk. At last. Everyone looks like a secret at dusk.",
        "Something's going to happen tonight. I can feel it. It won't, but I can feel it.",
        "Cedric's gone out again. Where does he go? Nobody ever tells me anything good.",
        "Is that a lute? Somebody's playing a lute. Oh. It's a cart.",
      ],
      night: [
        "A beautiful woman on the roads at night. Oh, I do hope she's sad.",
        "If I were a ghost, I'd haunt somewhere better than this.",
        ringing("Three tolls. How wonderfully awful."),
        quiet("No bell tonight. Even the bell's given me up."),
        "I should be asleep. Nothing in any book ever happened to someone asleep.",
      ],
      work: [
        "No. Don't open that letter. Oh, she's opened it.",
        "Kiss him, you fool. Kiss him. Oh. He's dead.",
        "Chapter nine. Somebody's going to be poisoned. I hope it's the husband.",
        "I'm not crying. The page is damp. It's an old book.",
        "'Her heart was a lamp in a shut room.' Oh. Oh, that's me.",
      ],
      player: [
        "There's the thirteenth, walking about being doomed. Lovely.",
        "{name}! Stand still. I'm memorising you for later.",
        "Oh, {name}. Do you ever brood? You'd brood beautifully.",
        "Has anyone ever written a poem about you? I might. A short one.",
      ],
      magic: [
        "Oh! Oh, do it again! In the rain, if you can!",
        "That's the most beautiful thing I've ever seen. Is it meant to hurt?",
        "Real magic. In Bellmourn. Mother will be furious. Wonderful.",
        "I think I'm going to faint. I'm not. But I could.",
      ],
      woken: [
        "Is it a rescue? Tell me it's a rescue.",
        "If you're a highwayman, I'm ready. I've been ready for years.",
        "Oh, it's you. I thought you were a ghost. I was rather looking forward to it.",
        "Seraphine, wake up, there's a— no. Don't wake Seraphine.",
      ],
    },
    bye: [
      "Go, {name}. Go sadly. It suits you.",
      "Goodbye, {name}. Look back once as you go. Just once. Thank you.",
      "Don't die without telling me, {name}. I'd want to be there. At a distance.",
    ],
  },

  seraphine: {
    first: [
      "I've been waiting to see you. I'm Seraphine Ashby. Not Rosalind. Not Juliana. Please remember. I'll remember you.",
      { met: 'isolde', say: "Mother's told me about you. Not everything; she never tells anyone everything. I'm Seraphine, the middle one. You stood very still while she spoke to you. People do. I write down who doesn't." },
    ],
    greet: {
      morning: [
        "Good morning. I prayed for you last night. To the Throne. I hope you don't mind; it's done now.",
        "I've been in to see Mother already. She asked after you. I told her what I knew.",
      ],
      day: [
        "Good day, {name}. You look well. I'll say so, if anyone asks. Someone always asks.",
        "Do you need anything? I like to be useful. Mother says it's my gift.",
        "{name}. I'm Seraphine. You looked as if you were about to call me Rosalind.",
      ],
      evening: [
        "Good evening. Evening prayers for the Throne soon, in my room. You'd be welcome. No one ever comes.",
        "The lamps are lit. I like the lamps. They show everyone.",
      ],
      night: [
        "{name}. You're out late. So is somebody else. I'm not saying who. Not yet.",
        "I don't sleep much. Someone in this house ought to be awake.",
      ],
    },
    about: [
      "Seraphine Ashby. Eighteen. I pray to the Throne every morning and every night, and in between I try to be useful.",
      "Mother says I'm her eyes. I don't mind. Eyes don't have to decide anything. They only have to be open.",
    ],
    ask: {
      tessariels: [
        "They're very sad. I pray to the Throne for them, which is the kindest thing anyone does for them. Except soup. Some people give them soup. I notice who.",
        "They wear his old sunburst on their chests, out in the open, in the square. It's almost brave. Mother says it's almost something else.",
        "You don't wear the sunburst. That's wise. Or it's clever. I haven't decided which, and I'd like to before Mother asks.",
      ],
      knight: [
        "He's the Throne's. You can tell by how still he is. Holy things are still.",
        "He doesn't ask anyone's name. He doesn't need to. I think that must be very restful.",
      ],
      dead: [
        "They're the Throne's as well. Everything is. That's a comfort, if you think about it properly. Most people don't think about it properly.",
        "They stop at the edge of town. Something here stops them. I've been trying to find out what. I've looked in every house but one.",
      ],
      lis: [
        "She doesn't pray. To anyone. I've watched her every visit since I was twelve. Not once.",
        "She spat at Mother's feet in the square. Mother laughed. I didn't. I've kept it.",
      ],
      town: [
        "People here mostly do what they should. I keep an eye on the rest. Someone has to; Father's eyes are always on his ledger.",
        "Everyone in Bellmourn has a secret. That isn't a complaint. It gives me something to do.",
      ],
      throne: [
        "You say it as if you're afraid of it. That's right. That's how you begin.",
        "His Lordship keeps the roads and the seasons and us. All he asks is a tenth and our attention. Most people only give the tenth.",
        quiet("His Lordship's bell has gone quiet. I've been praying to know why. Don't look away when I say that. The ones who look away are the ones I pray about."),
      ],
      book: [
        "It's only for things I want to remember. Mother says I mustn't write down what people say. So I write down what they mean.",
        "You're in it. Just a line. Don't worry, it's a good line. So far.",
      ],
    },
    topics: { throne: 'The Throne', book: 'Your little book' },
    barks: {
      morning: [
        "Morning prayers done. Now the day.",
        "His Lordship sees. Good morning.",
        "Rosalind, your hair. Mother will notice. I noticed first.",
        "Who was up in the night? Somebody was up in the night.",
        "Up early, Garth. Was that a full sack or a light one?",
      ],
      day: [
        "Mm. I'll remember that.",
        "Magda, you said the same thing yesterday, but differently.",
        "I'm Seraphine. No, it's all right. You'll learn.",
        "What a lovely shawl, Lady Margery. Very blue.",
        "I'm not listening. I'm only standing near.",
      ],
      evening: [
        "The lamps are lit. Now we can all see each other.",
        "Cedric's gone out again. I'll pray for him. Specifically.",
        "Goodnight, Lady Halloway. Sleep well. Pray well.",
        "Evening prayers. Who's coming? No one. As usual.",
      ],
      night: [
        "Good evening. I'm watching the windows. It's surprising what people do with a lamp lit.",
        ringing("Three tolls. His Lordship's bell. I like that he rings it himself."),
        quiet("His Lordship's bell has stopped. Somebody did that. I'll find out who."),
        "Someone's by the oak. I'll know who by morning.",
        "Lamp, door, window, lamp. All in order. Except one.",
      ],
      work: [
        "His Lordship sees. His Lordship keeps. His Lordship takes the tenth.",
        "Market day. Magda, three lies. Hob, two sighs. Lady Margery, one look.",
        "Let me be useful. Let me notice. Let me tell.",
        "I'll write that down later. No. I'll just remember it.",
      ],
      player: [
        "The thirteenth. I'm Seraphine. You were going to ask.",
        "{name}. Mother asked after you again. I said nice things. Mostly.",
        "You smell of smoke, {name}. What have you been burning?",
        "{name}. Stand still. No. I was only looking.",
      ],
      magic: [
        "That isn't allowed. Is it? I'll ask.",
        "Mother will want to hear about that.",
        "Where does it come from? Not from the Throne. So from where?",
        "Do it again. I want to describe it properly.",
        "Oh. Oh, that's going in.",
      ],
      woken: [
        "I was at my prayers. Mother will want to know you were up this late.",
        "I heard you on the third stair. It creaks for everyone but me.",
        "You've woken Rosalind. Now you'll have to listen to her.",
        "Mother's room is just across the hall. Should I call her? I think I should.",
      ],
    },
    bye: [
      "Goodbye, {name}. I'll remember this.",
      "His Lordship keep you, {name}. He keeps everyone, in the end.",
      "Go on. I'll tell Mother you were polite.",
    ],
  },

  juliana: {
    first: [
      "Oh good, another one. No, wait. You look tired instead of holy. You might be the first honest one. Juliana. The youngest Ashby. Don't call me Rosalind. Don't call me Seraphine. Especially don't call me Seraphine.",
      { met: 'seraphine', say: "Oh no. You've the look of someone who's been prayed at. Seraphine got to you first. Juliana Ashby, the youngest. Whatever you told her, Mother knows by now. Whatever you tell me, I'll forget on purpose." },
    ],
    greet: {
      morning: [
        "Morning. Mother's writing letters about me again. If I go missing, I'm married.",
        "Oh, it's you, {name}. Good. I was about to be useful, and you've saved me.",
        "Breakfast was Seraphine praying over the porridge till it went cold. Every morning. Every porridge.",
      ],
      day: [
        "Still alive. Bad luck for everyone who bet against you, which is most of the inn.",
        "Look, it's the thirteenth. Everyone's staring at you. Now they're staring at me. I'll want paying.",
        "{name}. Tell me something nobody in this town knows. Quickly, before Seraphine finds out first.",
      ],
      evening: [
        "Supper soon. Men from the capital. One of them's meant for me. I'm going to be very dull at him.",
        "Cedric's gone for his walk. He goes every night. He's very fond of walking. He's never been fond of anything.",
      ],
      night: [
        "Can't sleep either? Rosalind talks in hers. All night. All about kissing.",
        "Out late, {name}? Me too. If you tell, I'll say you were the one who woke me.",
        "Don't go near the oak tonight. Not for any reason. Just... don't spoil it.",
      ],
    },
    about: [
      "Juliana Ashby. Sixteen. The youngest, so I get the old dresses, the old lectures and the old suitors, once my sisters have turned them down.",
      "Everyone in my family wants something. Father wants to be safe, Mother wants to be important, Cedric wants out. I want everyone to stop lying at supper. I'll be waiting a while.",
    ],
    ask: {
      tessariels: [
        "Everyone laughs at them. So I don't. Somebody has to be on their side, and the dogs already are.",
        "I liked the seventh. He cried at the well, and then he apologised to it. Best manners anyone's shown in that square.",
        "Bram's slate says thirteen. I've a copper on you lasting the week. Don't make me look stupid. Everyone thinks I am already, and I'd hate them to be right.",
      ],
      knight: [
        "He's killed everyone who went near. Cedric thinks that makes him a hero. I think it makes him a door with a sword.",
        "Mother thinks he's an opportunity. Father thinks he's a punishment. Seraphine thinks he's beautiful. I think he hasn't eaten in a month, and someone ought to mention it.",
      ],
      dead: [
        "Corran says there are packs of them in the pines. Father says Corran exaggerates. Corran has never once made a joke. I don't see how he'd manage it.",
        "Tam Fenwick asked me if the dead are cold. I said yes. He said, then why don't they come in by the fire? I couldn't answer him. I still can't.",
      ],
      lis: [
        "She called Mother 'that tall frost' to her face, in the square. I'd follow Lis into a cave for that. Not her cave. Her cave fell in.",
        "She's the only grown woman in Bellmourn who's never once told me to smile. I'd marry her, if Mother allowed it.",
      ],
      town: [
        "Bellmourn. Fine bell, never rung. That's us all over.",
        "Two lion families, one well. They take turns not looking at each other.",
      ],
      sisters: [
        "Rosalind looks like a sigh. Seraphine looks like she's taking notes. I look like I'd rather be elsewhere. People still mix us up. People are hopeless.",
        "Rosalind will cry at your funeral. Seraphine will write down who else did. I'll be the one who brought food.",
      ],
      mother: [
        "Mother's going to marry me to a man from the capital with a soft voice and cold hands. I've asked for a loud voice and warm hands. That's all the bargaining I'm allowed.",
        "She isn't cruel. She loves us the way a general loves a good map.",
      ],
    },
    topics: { sisters: 'Your sisters', mother: 'Your mother' },
    barks: {
      morning: [
        "Another morning. The same one as yesterday, I think.",
        "Seraphine, stop praying at the porridge. It isn't going to repent.",
        "No, I'm not Rosalind. She's the one sighing.",
        "Fine day to be married off. Shame.",
      ],
      day: [
        "Look, a Halloway. Everyone be polite. Everyone be very, very polite.",
        "If you're looking for Rosalind, follow the sighing.",
        "Magda's lying again. I like this one better than the last.",
        "Old Horns takes a tenth, and Mother takes the rest.",
        "I'm not sulking. This is my face.",
      ],
      evening: [
        "There goes Cedric, walking. Such a keen walker.",
        "Supper with strangers. I'll be as dull as a spoon.",
        "Seraphine's watching the street again. Wave at her. She hates that.",
        "Lamps. Wonderful. Now we can see how bored we are.",
      ],
      night: [
        "Rosalind's talking in her sleep again. Kissing, mostly.",
        ringing("Three tolls. Don't count. Everyone counts. Don't."),
        quiet("No bell. Everyone still lies awake for it. Me too. Don't tell."),
        "If anyone asks, I'm asleep. I'm very good at it.",
        "If that's Seraphine on the stairs, I'm asleep.",
      ],
      work: [
        "Another lion. Another gold lion. Its face is wrong. Good.",
        "Mother wants this hem by supper. Mother wants a great many things.",
        "Ow. Even the needle's on Mother's side.",
        "Gold thread, red silk. Never blue. Blue's for cousins.",
      ],
      player: [
        "Thirteen! My favourite number. Since you.",
        "{name}. You're losing, aren't you? Everyone's against you? Good. Then I'm for you.",
        "Don't stand so near, {name}. Seraphine's watching. I'll get a sermon.",
        "{name}. You look like you need someone rude. Here I am.",
      ],
      magic: [
        "Oh, that's going in Seraphine's book.",
        "Do it to the lion banner. Please. Just once.",
        "Finally. Something happens.",
        "Mother saw that. Look at her face. Worth it.",
        "So the woman wasn't lying to everyone.",
      ],
      woken: [
        "If this is a rescue, take Rosalind. She's been waiting.",
        "Go away. Unless you're here to carry me off. Then give me a moment to pack.",
        "I'm awake. I'm always awake. This family snores in turns.",
        "Get out before Seraphine wakes and writes you down.",
      ],
    },
    bye: [
      "Go on, {name}. Don't let them win. Whoever they are this week.",
      "Bye, thirteen. Try not to become a lesson for the children. We've got twelve.",
      "I'll be here, {name}. Being sixteen. Forever.",
    ],
  },

  // ---------------------------------------------------------------- The old house on the square: the Halloways (blue and gold)

  edric: {
    first: [
      "Forgive me for staring. They tell me you made fire out of nothing in the lane, and I've waited a long time to hear something worth repeating. Edric Halloway. Ours is the old house on the square, with more rooms than candles. I'll say no more in the street.",
      { met: 'aldric', say: "My brother says you're no fool. He's never said that of me. Edric Halloway. Aldric will have told you to keep the lamps lit. I'd tell you something else, but not in the street. The old house on the square. The garden gate." },
    ],
    greet: {
      morning: [
        "Good morning. You slept? Good. Some of us were up praying for— for rain. The barley needs it.",
        "Morning, {name}. You look as if you've been thinking. Keep at it. It's rarer here than courage.",
        "A word, when you've a moment. Not here. Perhaps not today. But a word.",
      ],
      day: [
        "Still here. I'd half feared you'd gone up the hill already. I'd half hoped it, too. I'm a poor judge of my own halves.",
        "Good day. Isolde's crossing the square. Smile at her. She likes to be noticed, and she notices who doesn't.",
        "{name}. Walk slowly. In Bellmourn, people who walk quickly look as if they've something to hide.",
        "I've my brother's gate this afternoon. I stand in it and look honest. It's most of the job.",
      ],
      evening: [
        "Evening, {name}. My wife will have the kettle on. You might come by. Use the garden gate. The front door sticks.",
        "The light's going. I always mind that more than I should.",
      ],
      night: [
        "You're about late. So am I. We'll both say we couldn't sleep, which will be true.",
        "The nights are long lately. All of them. Mind the lanes.",
      ],
    },
    about: [
      "Edric Halloway. The eldest of a family that used to matter. I have a house, a wife, two children and a roof that lets in the stars. My wife says it saves on candles.",
      "I keep my father's ways, as far as a man can keep anything in Bellmourn. He had a great many ways. Some of them I've had to keep quietly.",
    ],
    ask: {
      tessariels: [
        "Twelve came in the old armour, and it hung on every one of them. You came in a robe, and I can't take my eyes off you. Forgive me. I'm out of practice at hoping.",
        "The first one asked me the way to the Throne. I told him. I've wondered since whether I ought to have told him the way home.",
        "You carry no sunburst. That's wisdom, or it's forgetting. I'd like very much to know which, one day, somewhere with the shutters closed.",
      ],
      knight: [
        "He's waiting for someone. Men don't stand at a door for a month otherwise.",
        "I'd ask you not to go up there yet. Not because you'd fail. Because I'm not ready to find out.",
      ],
      dead: [
        "They don't come past the edge of town. Aldric says it's the lamps. I let him say it.",
        "We buried my father in the garden behind the house, by his own wish, not up the hill. I look at that ground every morning. It's still flat. I'm grateful every time.",
      ],
      lis: [
        "My father bought herbs from her when I was a boy. She was old then. She's old now. She has always been precisely that old.",
        "She brought you down the road herself. Lis has never brought anyone anywhere. I've been trying not to make too much of that, and failing.",
      ],
      town: [
        "My family held this valley once, under the gold lion. Now we hold a roof, and our tongues.",
        "It's a good town with its head down. I don't blame it. I only wish it would look up, once, before it forgets how.",
      ],
      father: [
        "A stubborn man. He kept a book he wasn't supposed to keep, in a place I shan't tell you, and read it aloud in a voice I shan't do. He died in his bed. That was his great trick.",
        "He used to say the light doesn't set. He said a great many things. Mostly about the weather.",
      ],
      ashbys: [
        "My cousin Corwin collects the tithe. It isn't his fault, and I tell him so, and it makes him furious.",
        "Isolde is the cleverest person in Bellmourn. I admire her greatly, from the far side of a shut door.",
      ],
    },
    topics: { father: 'Your father', ashbys: 'The Ashbys' },
    barks: {
      morning: [
        "Morning. Yes, still standing, thank you.",
        "The roof's let the rain in again. Margery's put a bowl where the stars come through.",
        "Good morning, Corwin. Yes, it'll be paid. It's always paid.",
        "Dew on the barley. Small mercies. Small ones are allowed.",
      ],
      day: [
        "Good day, Isolde. You're looking well. You always are.",
        "No news. There's never any news. That's the news.",
        "Bless— good day to you. Good day.",
        "Tobias, mind your footing. A knight falls once, not twice.",
        "The gate, the road, the gate. Aldric does this every day?",
      ],
      evening: [
        "Lamps lit. Good. Every little light counts.",
        "Lock the front, Margery. Leave the garden gate.",
        "Shutters, Tobias. All of them. Yes, that one too.",
        "A lamp in every window tonight, if you can spare the oil.",
      ],
      night: [
        ringing("Three. There. It's done for tonight."),
        quiet("Midnight. Not a sound. I may sleep tonight. I've forgotten how."),
        "Couldn't sleep. Never mind me.",
        "The light doesn't— no. Goodnight.",
        "Elowen? Is that you? ...No. The wind.",
      ],
      work: [
        "Another slate off the roof. The house is leaving us one piece at a time.",
        "Two pennies, a button and my father's buckle. We'll manage.",
        "Hold the ladder, Tobias. Both hands. That's your father up here.",
        "This beam was here before the Throne. It'll be here after.",
      ],
      player: [
        "There you are. I've been looking. Not looking. Noticing.",
        "{name}. Careful in the square. People count your steps.",
        "{name}. Walk on. I'll find you later, when it's quieter.",
        "{name}. You look tired. Good. The ones who aren't tired aren't doing anything.",
      ],
      magic: [
        "...There it is.",
        "I'd stopped believing I'd see that. Not where the Reeve's wife can see, please.",
        "Steady. Steady, old man. It's only fire.",
        "Not here. Not in the open. Please.",
        "My father would have wept. I very nearly shall.",
      ],
      woken: [
        "Who's— is it the Reeve's men? Margery, the book.",
        "Oh. It's you. For a moment I hoped you were someone else. For a moment I feared it.",
        "We've nothing worth taking. I've looked, at length.",
        "In the middle of the night? Has something happened? Has it begun?",
      ],
    },
    bye: [
      "Go carefully, {name}. Some of us are counting on it.",
      "Good day, {name}. Come by the house. The garden gate. Don't knock; we'll hear you.",
      "{name}. Don't let anyone tell you what you are. Not even me.",
    ],
  },

  margery: {
    first: [
      "Come here, let me look at you. Thin. Burnt fingers. Eyes that haven't slept since the road. I'm Margery Halloway. Sit down before you fall down, and then tell me nothing at all.",
      { met: 'elowen', say: "Come here, let me look at you. Yes. Elowen said you'd a kind face under the soot. She's usually right about faces, and wrong about hours. Margery Halloway, her mother. If anyone here is unkind to you, tell me, and I'll be kind at them until they stop." },
    ],
    greet: {
      morning: [
        "Morning. Have you eaten? Don't lie to me; I can see your belt.",
        "Good morning. I've been up with the bread and the gossip. The bread came out better.",
        "Morning, love. Oh, it's {name}. I call everyone love before noon. You'll have to put up with it.",
      ],
      day: [
        "Sit by me a moment. Nobody starts an argument while I'm talking to someone. It's very useful.",
        "Ah, {name}. Isolde walked past and smiled at me. I'll need to lie down.",
        "You look like somebody's been shouting at you. Who was it? I'll have them to tea.",
      ],
      evening: [
        "Evening, {name}. Elowen's late again. Lessons, she says. They must be very long letters she's teaching.",
        "Come in out of the dusk. You can go straight back out in it. I'd only like to have offered.",
      ],
      night: [
        "{name}! You gave me a fright. I'm only waiting up. For the house to settle. Houses take ages.",
        "If you see my daughter tonight, you haven't. Do you understand me? Good.",
      ],
    },
    about: [
      "Margery Halloway. Edric's wife, Elowen and Tobias's mother, and whatever this town needs between breakfast and bed, which is mostly someone to say 'there now'.",
      "I keep the peace in Bellmourn. Nobody appointed me. Somebody had to, and the Reeve was busy being frightened.",
    ],
    ask: {
      tessariels: [
        "Each of them had a mother. I think of that when they're shouting at the well. Somebody stitched the padding under all that steel. Somebody worried.",
        "I mend their cloaks when they tear. Elspeth says I'm encouraging them. I'm only encouraging the cloaks.",
        "You don't shout. I noticed that first. The quiet ones are the ones who mean it. They're the ones I worry for.",
      ],
      knight: [
        "Silas has nine in his yard and nowhere to put them. I take him soup. It doesn't help the coffins, but it helps Silas.",
        "I don't think about him. I've decided not to. It's a thing you can decide, mostly, if you keep your hands busy.",
      ],
      dead: [
        "We buried Annis Webb in the blue shawl I knitted her. Corran says he's seen a blue shawl in the pines. I've stopped knitting blue.",
        "They stay out of town. I don't ask why. Some questions you only ask on your knees.",
      ],
      lis: [
        "She takes her tea with five sugars and insults my cups. I'm terribly fond of her. Don't tell her; she'd stop coming.",
        "She's ruder than anyone I've ever met, and she's never once been unkind. People don't see the difference. She does.",
      ],
      town: [
        "Everyone here owes everyone else a pie or an apology. It keeps us talking.",
        "It's a town that's learned to be quiet. I'd like it to learn to be quiet and kind. We're about halfway.",
      ],
      elowen: [
        "My girl teaches the children their letters, gives the Tessariels soup, and comes home after dark with leaves in her hair. Teaching, she says. I've decided to believe it until it's a problem.",
        "Elowen is braver than her father and kinder than her mother, and she hasn't learned to be careful yet. I'm told that comes with age. I'm told a great many things.",
      ],
      houses: [
        "Isolde comes to tea once a month. We talk for an hour, and neither of us says a single thing. I call it keeping the peace. I think she calls it keeping watch.",
        "We were one family once, under the one lion. Now we're two families who know exactly how the other takes its tea. That's not nothing.",
      ],
    },
    topics: { elowen: 'Elowen', houses: 'The two houses' },
    barks: {
      morning: [
        "Morning, Agnes. Two loaves, and whatever you've heard.",
        "Tobias, your stick's in the porridge pot again.",
        "Bright morning. Nobody spoil it.",
        "Elowen, you've a leaf in your— never mind. Breakfast.",
      ],
      day: [
        "Now, now. Hob. Corwin. Both of you, sit down.",
        "Good day, Isolde. Lovely red. You always wear it so firmly.",
        "Elspeth, Magda, you're both right. Go home.",
        "Who's crying? Somebody's crying. Where?",
        "Have you eaten? You. Yes, you.",
      ],
      evening: [
        "Elowen's late. Elowen's always late, lately.",
        "Kettle on, somebody. It's going to be a long dark.",
        "Home, children! Your mothers want you. Some of you, anyway.",
        "There goes the light. In you come, all of you.",
      ],
      night: [
        "I'm only waiting up. Houses take ages to settle.",
        ringing("That's the bell. Now the kettle."),
        quiet("No bell. I still put the kettle on at midnight. Habit."),
        "If that's my girl, I didn't hear the gate.",
        "Goodnight, Jory. Keep to the lamps.",
      ],
      work: [
        "Another elbow out of Tobias's sleeve. He fights the air, and the air wins.",
        "Mended. Mended. That one's beyond me.",
        "The kettle's the only thing in this house that works.",
        "A patch on a patch on a patch. Very old family, the Halloways.",
      ],
      player: [
        "{name}! You're thin. Come by for supper.",
        "Don't let them stare you out of town, love. Stare back.",
        "{name}, your hem's torn. Tamsin would charge you. I won't.",
        "Oh, {name}. You look like you need a sit-down. Here's a wall.",
      ],
      magic: [
        "Oh! Oh my. Well. Well, then.",
        "Put that out before you burn your sleeves, love.",
        "Careful. People will want things from you now.",
        "Edric will want to hear about that. Quietly.",
      ],
      woken: [
        "Edric, it's— oh. It's only you. Sit. Tea?",
        "I was awake. I'm always half awake. Mothers are.",
        "If something's on fire, tell me. If not, go back to bed.",
        "Is it Elowen? Is she— oh. Good. Go away, then.",
      ],
    },
    bye: [
      "Go on, {name}. Eat something on the way.",
      "Mind yourself, love. And mind other people a little, too.",
      "Come back in one piece, {name}. I'm no good with pieces.",
    ],
  },

  elowen: {
    first: [
      "You walked down with Lis? Then you've had the worst company on the Long Road and lived. Elowen Halloway. I teach the children their letters. They'll want to know if your skull has a name. So do I, a little.",
      { met: 'margery', say: "Has my mother fed you yet? She'll have tried. Elowen Halloway. If she asked you anything about me: I teach the children their letters, I'm home by dark, and I've never been near the oak in my life." },
    ],
    greet: {
      morning: [
        "Morning! I'm late for lessons. I'm always late for lessons. I'm usually up late the night before. With letters.",
        "Morning, {name}. Tam wrote his name yesterday. Backwards, but it's his.",
        "You look like you slept on a bench. I hope it was a kind bench.",
      ],
      day: [
        "Come and tell the children something true. All they've got is rumours and Pip.",
        "Have you ever been to the capital? What's it like? No— I don't care. I'm only asking.",
        "{name}. You've a good face for this town. It doesn't look away.",
      ],
      evening: [
        "It's nearly dark. I like the dark. Things are kinder in it. People are.",
        "Evening, {name}. If my mother asks, I've been teaching. I have been. Mostly.",
        "Do I look— no. Never mind. Good evening.",
      ],
      night: [
        "Oh! You frightened me. I'm only out for air. There's a lot of it out here.",
        "You didn't see me. Please. I'd do the same for you.",
        "It's a lovely night, isn't it? Don't look at me like that. It's just a lovely night.",
      ],
    },
    about: [
      "Elowen Halloway. I teach Bellmourn's children to read, which the Reeve says is a waste of candles and my mother says is the only thing worth the candles.",
      "I want to see the sea. I want to see a city. I want to stand somewhere a person can say what they mean out loud, in the square. Until then, I teach.",
    ],
    ask: {
      tessariels: [
        "Number nine couldn't remember his own name, but he remembered every word she said to him. Every one. Think how she must have said them.",
        "People laugh at them. They're lost, that's all. Being lost isn't funny. Laughing at it is just cruelty with an audience.",
      ],
      knight: [
        "Three of them went up that hill. I'd given one of them my scarf, because he was cold. I keep thinking about the scarf.",
        "Some people think he's magnificent. Some people want shaking until their teeth rattle. Often they're the same people.",
      ],
      dead: [
        "The children have a game where one of them is dead and the rest run. I stopped it. Then I watched them play it when they thought I'd gone. They're practising.",
        "Corran won't let me walk the west road any more. I didn't know Corran knew my name. That's how bad it is.",
      ],
      lis: [
        "She gave Tam a dried frog for his cough. It did nothing for his cough. He loves that frog more than anyone on earth.",
        "I've seen her at night, I think. Or someone. Out on the road, walking as if she owned it, beautiful enough to stop your heart. Then I blinked, and I was looking at the tithe barn.",
      ],
      town: [
        "The children here can count to a hundred and spell 'tithe'. They learned the second one first.",
        "It's small and it's frightened and I love it. I'd love it better from a hundred miles off, for a year or two.",
      ],
      lessons: [
        "Six children, one slate, Orrin's oldest primer and a great deal of shouting. Pip charges the little ones a copper to watch him write. I'm trying to decide whether that's a lesson learned.",
        "Tilly Fenwick has rewritten the alphabet. It has nine new letters, all of them hers. I've let her keep two.",
      ],
      ashbys: [
        "The Ashbys? They're... well. The Reeve is very punctual. Lady Isolde is very Lady Isolde. The girls are the girls. The others are fine. Why? Has someone said something?",
        "We're cousins, the Ashbys and us. We nod. We smile. We marry who we're told. Mostly. That's how it's always been. Mostly.",
      ],
      silver: [
        "He walks round my lesson. Round, never through. The children wave, and now and then he lifts a hand, and then there's no getting any work out of them for an hour.",
        "I asked him once if he needed anything. He thought about it for a long time, then shook his head, very kindly. I've never been refused so politely.",
      ],
    },
    topics: { lessons: 'Your lessons', ashbys: 'The Ashbys' },
    barks: {
      morning: [
        "Slates, chalk, Tam's frog. Right. Lessons.",
        "Late, late, late. Morning, Agnes!",
        "Who's seen Pip? He owes me a whole alphabet.",
        "No yawning. Teachers don't yawn. Teachers... don't...",
      ],
      day: [
        "Don't laugh at him, he's lost. Help him up. Help him up!",
        "Soup for the poor fellow by the well, Maudie. Put it on mine.",
        "Good day, Lady Isolde. Lovely day. Yes. Lovely.",
        "Pip, if you're selling news, sell some true news for once.",
      ],
      evening: [
        "Dark enough. Nearly dark enough.",
        "Off to lessons. Evening lessons. Very advanced.",
        ringing("Mother, I'll be home before the bell. Before the third one, anyway."),
        quiet("Mother, I'll be home by midnight. Roughly. Midnight's harder to hear now."),
        "Night air's good for the lungs. Everyone says so. Someone said so.",
      ],
      night: [
        "Shh. I'm only out for air.",
        "Mind the root. There's always that root.",
        "What a night. What a night for... air.",
        ringing("That was the second toll. I've time. Haven't I?"),
        quiet("No bell to go home by. That's my excuse, and it's a good one."),
      ],
      work: [
        "A, B, C. Tilly, that isn't a letter, that's a cat.",
        "Tam, the S faces the other way. The other other way.",
        "Lily, the crows can't learn their letters. Sit down.",
        "Bryony, that's a beetle, not a full stop.",
        "Read it again. Slowly. As if you mean it.",
        "Wave to the silver knight, children. Now letters. Letters!",
      ],
      player: [
        "{name}! Have you eaten? You haven't. Come on.",
        "Here's the thirteenth. Children, don't stare. Stare politely.",
        "{name}, the children want to know if the skull has a name.",
        "Oh, {name}. Don't mind the starers. They're only frightened.",
      ],
      magic: [
        "Oh! Do it again. No, wait. Children, look!",
        "That's real. That's actually real.",
        "You might have told me you could do that. I'd have stopped worrying.",
        "Careful, careful— oh, that's beautiful.",
        "Wait till Father hears. No. Not in the street. Not here.",
      ],
      woken: [
        "Of course I'm in bed. Where else would I be?",
        "Did my mother send you? Tell her I'm asleep. I am asleep.",
        "Oh, it's you. I was dreaming about the sea. Thank you for that.",
        "If it's the children, they'll keep till morning. Everything keeps till morning.",
      ],
    },
    bye: [
      "Be kind to somebody today, {name}. It's catching.",
      "Goodbye, {name}. Eat something. Sleep somewhere warm.",
      "See you, {name}. And if you're out tonight, you didn't see me.",
    ],
  },

  tobias: {
    first: [
      "Is that a staff? Can you fight with it? Uncle Aldric says a staff's a walking stick with opinions. Oh— sorry. Tobias Halloway. I'm going to be a knight. This is Mercy. She's a stick at the moment. In spirit she's a blade.",
      { met: 'aldric', say: "Uncle Aldric's talked to you! What did he say about me? Did he say 'the boy'? He says 'the boy' when he's pleased. Tobias Halloway. This is Mercy. She's a stick, but in spirit she's a blade." },
    ],
    greet: {
      morning: [
        "I've done two hundred cuts already! Mercy's done two hundred too. She doesn't complain.",
        "Morning, {name}! Uncle says you can tell a knight by how early he rises. I was up before the crows.",
        "Good morning. I read a whole chapter on the proper greeting of a stranger of rank. I've forgotten it. Good morning.",
      ],
      day: [
        "Will you look at my guard? Cedric says it's sloppy. Cedric holds his like a man carrying soup.",
        "Ah, {name}! I've a question. Several. Fourteen. Have you a moment for fourteen?",
        "If you ever need a squire, I'm very nearly available.",
      ],
      evening: [
        "Uncle's lighting the lamps. I'm allowed to hold the ladder now. It's practically a command.",
        "Evening, {name}. I'm going to practise in the dark. Real fights don't wait for daylight. Uncle says that. He also says go to bed.",
      ],
      night: [
        "I'm not supposed to be up. I'm keeping watch. Unofficially. With Mercy.",
        "Shh. Mother's waiting up for Elowen and pretending she isn't.",
      ],
    },
    about: [
      "Tobias Halloway. Seventeen. I've read every book about knights in Bellmourn, all four, and Uncle Aldric says reading isn't the same as doing. So I'm doing. With a stick.",
      "Uncle Aldric is the best man in Eldravayne. Don't tell Father. Father knows.",
    ],
    ask: {
      tessariels: [
        "Their armour is wonderful. The men inside it aren't, very. I try to only look at the armour.",
        "The tenth one let me hold his sword. It was much heavier than Mercy. I've been carrying a log about since, to get used to it.",
        "Are you really him? Reborn? You can tell me. I'd only tell Uncle. And maybe Father. Father would want to know. Father would really want to know.",
      ],
      knight: [
        "Uncle won't let me go up the hill. He says practise. I've practised so much Mercy's got a groove where my hand goes.",
        "Cedric says the black knight is what a real knight is. Cedric's never read a book with a knight in it. A real knight would at least say something first.",
      ],
      dead: [
        "I've read every book in the house about the dead. There are two. They disagree about everything except running.",
        "Uncle says if I ever see one, I'm to run for a lamp and not be brave. I said that didn't sound very knightly. He said, no, it sounds like you alive.",
      ],
      lis: [
        "Uncle says she's harmless. Uncle says that about a lot of things he keeps a hand on his sword around.",
        "She looked at Mercy and laughed for a very long time. I've decided she was laughing at something else.",
      ],
      town: [
        "In books you have to leave home to find adventure. I've never been further than the tannery. So adventure came here instead. It's standing at the cathedral door, killing people.",
        "Bellmourn's all right for practising. There's a post by the well, a fence by the tannery and a goat that fights back.",
      ],
      uncle: [
        "Uncle Aldric says a knight's first duty is to come home. I said that didn't sound very brave. He said that's why it's first.",
        "He soldiered on the marches for fifteen years. He won't tell me about it. He says the good parts are short and the rest isn't for supper.",
      ],
      training: [
        "Two hundred cuts at dawn, two hundred at dusk, and a hundred at the goat, but the goat doesn't count, because it always starts it.",
        "Mercy's my third stick. Patience broke on the fence. Valour was eaten by the goat.",
      ],
      silver: [
        "His guard's perfect. Even walking. Even with his arms folded, somehow. I've tried folding my arms in guard. You fall over.",
        "I asked if I could be his squire. He looked at Mercy for a long time, and then he nodded. Uncle says a nod isn't a contract. I've decided it is.",
      ],
    },
    topics: { uncle: 'Ser Aldric', training: 'Your training' },
    barks: {
      morning: [
        "One! Two! Three! ...Forty! I skipped some. Don't tell.",
        "Good morning, Mercy. Ready? Ready.",
        "Uncle! Uncle, watch! Uncle? He's gone.",
        "Dawn cuts. Two hundred. A knight doesn't complain. Ow.",
      ],
      day: [
        "Hah! Have at you, post!",
        "Back, foul goat! Back, I say! ...Please.",
        "Cedric, that isn't a guard, that's a shrug.",
        "Guard, step, cut. Guard, step, cut. Guard, trip.",
        "The silver one folded his arms at me again. I think it means 'better'.",
      ],
      evening: [
        "Uncle's lamps! Let me hold the ladder!",
        "Dusk cuts. Two hundred. Then supper. Then more cuts.",
        "Shutters? All done, Father. All of them.",
        "Real knights train in the dark. Real knights also sleep. Which is it?",
      ],
      night: [
        "On watch. Unofficially. Very unofficially.",
        "Was that a dead man? It was a cat. Good. Good cat.",
        "Mercy and I are guarding the door. From the inside. Near the bed.",
        "I'm not scared. I'm alert. It's different.",
      ],
      work: [
        "Cut! Cut! Thrust! Ow, my thumb.",
        "A true knight is courteous, brave and— ow— patient.",
        "Again. Uncle says a hundred bad cuts make one good one.",
        "Feet like roots. Arms like... I forget. Arms like arms.",
      ],
      player: [
        "{name}! Do you need a squire? I've got a stick.",
        "Thirteen! Can I ask you about fighting? Just fourteen questions.",
        "{name}, does the skull help with the magic? Is that a rude question?",
        "{name}! Look at my guard! It's good, isn't it? It's good?",
      ],
      magic: [
        "Could you teach me that? Is a stick a staff, if you mean it hard enough?",
        "That's not in any of the books. Not one.",
        "Uncle! UNCLE! Did you see that?",
        "Mercy, did you see? Mercy saw.",
        "I'll be a wizard. No. A knight. A knight who knows a wizard.",
      ],
      woken: [
        "I'm up! On guard! Who goes— oh. Sorry.",
        "Is it a fight? Can I come? Where's Mercy? I'm lying on Mercy.",
        "Uncle? Is it time? Is something happening?",
        "I'm up! I'm armed! ...That's a candlestick. But I'm up.",
      ],
    },
    bye: [
      "Farewell, {name}! That's how knights say goodbye. I looked it up.",
      "Go well, {name}. If you go up the hill, take me. Or tell me. Or at least wave.",
      "Bye, {name}! Mercy says goodbye too. She's shy.",
    ],
  },

  // ---------------------------------------------------------------- The tower house: the watch

  aldric: {
    first: [
      "Robes and a staff. No plate. Better than armour you can't run in, I'll grant you. Ser Aldric Halloway, captain of the watch. I don't care who a woman told you you are. I care whether you can keep a lamp lit, and what that fire of yours does to the dead.",
      { met: 'corran', say: "Corran will have told you what's in the pines. Believe him; he's the only man in Bellmourn who counts low. Ser Aldric, captain of the watch. Don't start fights in my square, don't give speeches at my well, and we'll get on." },
      { met: 'jory', say: "Jory's told you about the lady, then. He tells everyone. Ser Aldric, captain of the watch. Half of what Jory sees is there. I'd like to know which half. So would you, if you mean to be out after dark." },
    ],
    greet: {
      morning: [
        "Morning. Still breathing. Good start.",
        "Morning, {name}. Jory says the night was quiet. Jory also says the moon follows him home.",
        ringing("Three tolls, two dead at the west lamp, one watchman asleep at his post. Ordinary night."),
        quiet("No tolls, two dead at the west lamp, one watchman asleep at his post. Nearly ordinary."),
      ],
      day: [
        "Any news from the roads? Real news. Not Magda's.",
        "{name}. Walk the west road with me as far as the last lamp, if you like. It's not far.",
        "Still here. Good. Most of your lot have gone by now. One way or the other.",
      ],
      evening: [
        "Lamps going up. Want to hold the ladder? Tobias will be jealous.",
        "Evening, {name}. Light's going. Stay where the oil is.",
      ],
      night: [
        "Stay in the light. That's not advice. It's an order, if I'm allowed to give you one.",
        "Late. Anything moving out on the road? Tell me straight.",
      ],
    },
    about: [
      "Aldric Halloway. Edric's brother, Tobias's bad example, captain of the watch. I keep the lamps lit and the gate shut, and the gate doesn't shut.",
      "I soldiered fifteen years on the marches, for a Throne I'd not have picked. Don't ask me about it. It wasn't a story. It was a ditch, with weather.",
    ],
    ask: {
      tessariels: [
        "Prophecy is a thing someone tells you so you'll walk somewhere and die. I've watched twelve walk. I stopped learning their names. Yours I'll learn, if you last the week.",
        "They come in chosen and leave the way everyone leaves. I've no quarrel with them. I just don't let them near the oil.",
        "You're the first of them who's done anything I could put in a report. Don't let it go to your head. The report's short.",
      ],
      knight: [
        "He doesn't come down. That's the only good thing I know about him, and I hold on to it with both hands.",
        "I went up once, to the last turn of the hill, with a lamp. He didn't move. Neither did I. Then I came back down and was sick in Silas's yard. I don't tell Tobias that part.",
        "If you mean to go up there: go in daylight, take your fire, and come back. That's three things. Most of them managed none.",
      ],
      dead: [
        "They don't come past the lamps. I don't know why. I don't need to know why. I need oil.",
        "Two packs in the north pines, one in the west. Corran counts them. I count lamps. Between us we know exactly how worried to be.",
      ],
      lis: [
        "She comes down twice a year, trades, and goes. This time she didn't go. I don't like anyone changing their habits this month.",
        "Jory swears there's a woman on the roads at night, too beautiful to look at. Jory drinks. Jory's also not usually wrong. I hate that.",
      ],
      town: [
        "Forty-one lamps, two watchmen, one of them asleep, my brother on the gate of an afternoon, and a gate that doesn't shut. That's Bellmourn. It's held so far.",
        "Good people. Frightened people. They'll forgive you anything except saying so.",
      ],
      watch: [
        "Me by day, Jory by night, and Tobias whenever I'm not looking. Elspeth sells me oil at cost. She calls it duty. She means she's frightened.",
        "A lamp every thirty paces, lit by dusk, trimmed at midnight, filled at dawn. That's the whole of my faith. It's held up better than most.",
      ],
      brother: [
        "Edric hopes. Somebody in the family has to buy the oil.",
        "My brother is a better man than me. He's also going to get us all hanged one day. Gently. With excellent manners.",
      ],
      silver: [
        "Walks his square round the green, stops, folds his arms, walks on. I asked him his business once. He nodded as if I'd asked a good question, and walked on. No trouble. I've stopped asking.",
        "He's never gone near the gate, the oil or the well. If every armed man kept to a square of grass, I'd sleep four hours a night.",
      ],
    },
    topics: { watch: 'The watch', brother: 'Your brother' },
    barks: {
      morning: [
        "Lamps out. Count them. Forty-one? Forty-one.",
        "Jory. Bed. You're asleep standing up.",
        "Nothing dead in the square. Good morning, then.",
        "Tobias, put the stick down and eat.",
      ],
      day: [
        "Off the well, friend. Off. Thank you.",
        "Gate's open again. Who keeps opening the gate?",
        "Corran says three in the pines. Right.",
        "Elspeth, I'll need another barrel. Yes, already.",
        "Carts to the left. Keep the road clear.",
        "Gate's yours, Edric. Look at the road. Not the sky. The road.",
      ],
      evening: [
        "Lamps! Ladder. Oil. Move.",
        "In before dark, if you're going in.",
        "Jory! Up. Your shift.",
        "Light's going. Eyes on the west road.",
      ],
      night: [
        "Stay in the light.",
        "Who's there? ...Fine. Go home.",
        ringing("Three tolls. Right. Nothing changes."),
        quiet("Midnight. Quiet up the hill. Don't trust it yet."),
        "If you're going to be out, be out where I can see you.",
      ],
      work: [
        "Wick's short. Trim it. Higher.",
        "That one's flickering. I don't like flickering.",
        "Pull, step, pull. Gate, you useless thing.",
        "Thirty paces. Lamp. Thirty paces. Lamp.",
        "Oil's low. Oil's always low.",
      ],
      player: [
        "{name}. Stay in the light.",
        "Thirteenth. You're making the watch look idle.",
        "{name}. Anything on the road? Straight answer.",
        "{name}. If you're going out, go west, by daylight.",
      ],
      magic: [
        "...Right. That's useful.",
        "Can you do that at the west gate, around midnight?",
        "Don't do that near the lamps. Do it near the dead.",
        "Huh. First real thing a Tessariel's ever done.",
        "Mind the thatch!",
      ],
      woken: [
        "What? Report. Quickly.",
        "Is it the gate? The lamps? Speak.",
        "I sleep three hours a night. You've just had two of them.",
        "If it isn't on fire or dead, it can wait.",
      ],
    },
    bye: [
      "Stay in the light, {name}.",
      "Go. Come back. That's the whole order.",
      "{name}. Daylight on the roads, dark in a bed. Remember it.",
    ],
  },

  jory: {
    first: [
      "Well now. Thirteen. I said it'd be thirteen, didn't I, I said it to the lamp. Jory Pell, night watch. I don't sleep when you sleep, and I don't see what you see. I see more. You've a skull. Good. Skulls don't lie. Lanterns do, now and then.",
      { met: 'aldric', say: "Hold up, let me get the lantern on you. Ah. The Captain's had a look at you; you've that face. He gives everyone that face. Jory Pell, night watch. Did he tell you I see things? I do. I've seen her, you know. Twice." },
    ],
    greet: {
      morning: [
        "Morning. Is it? Then I'm late for bed. Nothing came in. Nothing I'll swear to.",
        "{name}! Long night. Crows on the barn in rows of nine. Nine's bad. Seven's worse. I'd sooner nine.",
        "Not so loud. I've been awake since yesterday.",
      ],
      day: [
        "I'm up for a bite and then down again. Like a badger. A badger with duties.",
        "Ah, {name}. Can't sleep. The sun's too loud.",
      ],
      evening: [
        "Evening! Lamp's trimmed, boots are on, and there's salt in both. Can't be too careful. You can, but I can't.",
        "Evening, {name}. Here's my hour. Everybody else's day ends and mine starts. It's like owning something.",
      ],
      night: [
        "Walk with me a bit? Only to the well and back. The well gets lonely this time of night.",
        ringing("Midnight soon. Count with me. I always hope it'll be two."),
        quiet("Midnight soon. Nothing to count now. I count anyway, in my head, where it can't hear me."),
        "Saw something by the tithe barn. A cat, probably. Big cat. Walked on two legs. Probably a cat.",
      ],
    },
    about: [
      "Jory Pell. Sixty-six, night watch these thirty years. I keep the lamps, I walk the lanes, and I see what's to be seen. Some nights there's a lot to be seen.",
      "The Captain says it's the lamps keep the dead out. I keep the lamps. So it's me keeps them out, really. You tell him I said that. Go on. I dare you.",
    ],
    ask: {
      tessariels: [
        "The fourth one walked the lanes with me all one night, telling me about her. Never once looked at his feet. Walked straight into Hob's horse trough and stood in it, still talking. I gave him a lamp. He kept the lamp.",
        "Thirteen. That's a number. I'm not saying a good number. I'm not saying a bad number. I'm saying it's a number, and here you are, and here it is.",
        "They all saw her, the lady. Every one of them. I've seen her too. Nobody calls me chosen. Nobody gives me armour.",
      ],
      knight: [
        "I've seen him from the bell road. He doesn't breathe. You can see a man's breath on a cold night. Not his. Not once.",
        "Never look straight at him. Look at his shadow. If he's got one, you're safe. I didn't look long enough to find out.",
      ],
      dead: [
        "They come up to the edge of the light and stand there, like dogs at a butcher's door. Polite, almost. I don't like polite.",
        "Salt in your boots, a coin under your tongue, and don't answer if you hear your name from the pines. That's three rules. I've forty more.",
      ],
      lis: [
        "Twice I've seen her. The lady. Once by the well, once on the hill road. Both times my lantern went down low as a bow. Lanterns know a lady.",
        "Old Lis bought salt off me once and looked me in the eye. I've seen those eyes since, in a face a good deal prettier, and I'll say no more, because I'd like to keep mine.",
      ],
      town: [
        "By day it's a town. By night it's me, forty-one lamps, and whatever else is walking. Mostly me.",
        "Never whistle by the tithe barn, never count the crows, never answer the bell. You'll do fine here. Everyone who's died broke one of those. I've checked.",
      ],
      seen: [
        "A purple light on the hill road, a fox walking backwards, Hob Fenwick dancing alone in his field, and the lady, twice. Only one of those I'd swear to on my mother, and it's Hob.",
        "Milk went sour overnight in four houses on the north lane. Four. I walked past every one of them at midnight. I'm not saying it was me. I'm saying I walked past.",
      ],
      bell: [
        ringing("Three at midnight. I count every one. Every night I hope it'll stop at two, and it never does. One night it'll go four. I don't want to be awake for four."),
        ringing("Nobody's pulled that rope in forty years. I'd know. You hear everything at night. That's the trouble with it."),
        quiet("It's stopped. You'd know why better than me. Thirty years of nights, and now it's the quiet keeps me up. I stand under a lamp at midnight and wait for three, and then for four, and then for nothing."),
        quiet("I don't trust a bell that's minding its manners. Still. I've stopped putting salt in the second boot."),
      ],
      silver: [
        "Says good evening to me at every corner of that green. Four corners, four good evenings. Never a word to the Captain. I've not told the Captain.",
        "My lantern never dips for him. Dips for the lady, every time. Never for him. Make of that what you like. I've made a good deal of it.",
      ],
    },
    topics: { seen: "Things you've seen", bell: 'The bell' },
    barks: {
      morning: [
        "Dawn. Lamps out. Jory in.",
        "Nothing came. Nothing I'd swear to.",
        "Crows on the barn again. Don't count them. I counted them.",
        "Morning, is it? Then goodnight.",
      ],
      day: [
        "Too bright. Who left all this light lying about?",
        "Only up for a pie. Then down again.",
        "Nobody looks at anything by day. Daft, the lot of them.",
        "Don't wake me. I'm awake. Don't let it happen again.",
      ],
      evening: [
        "Lamp, oil, salt, boots. Off we go.",
        "Evening! My shift. My town now.",
        "Captain! Lamps up? I'll see to the far ones.",
        "There goes the sun. Good riddance. Sorry, sun.",
        "Evening, sir. ...Evening, sir. That's two corners.",
      ],
      night: [
        "Midnight, and all's... well, it's midnight.",
        "Two o'clock and nothing's dead. Walking, I mean. Nothing's walking.",
        "Who's that? Show your face. Ah. A cat. Show your other face.",
        "Lamp's gone low as a bow. Somebody's about. Somebody pretty.",
        ringing("One... two... three. There. Now we can all breathe."),
        quiet("Midnight, and not a peep. Hold your breath anyway."),
        "Not answering. Not answering. Whoever's calling, I'm not answering.",
      ],
      work: [
        "Trim the wick, mind the glass, don't look past the light.",
        "Forty-one lamps. Forty-one. Counted. Counted again.",
        "Easy, little light. Easy. I'm here.",
        "Salt by the door. Salt by the door. Salt by the— out of salt.",
      ],
      player: [
        "{name}! Walk with me. Two lights are better than one.",
        "There's the thirteenth. Thirteen. I said thirteen.",
        "{name}. Seen her yet? The lady? You'd know if you had.",
        "{name}. That skull of yours. Does it ever look back?",
      ],
      magic: [
        "Lantern's gone out! No— that was you. That was you!",
        "I knew it! I said! I said it to the lamp!",
        "That's not lamplight. That's no light I know.",
        "Do that by the barn and the crows'll go. Go on. Do it.",
        "Salt! Where's my salt?",
      ],
      woken: [
        "Is it night? It's not night. Why isn't it night?",
        "I'm on watch! I'm— oh. It's bright. I'm off watch.",
        "Let a man sleep. The dead don't come by day. Neither should you.",
        "What? Fire? Dead? Pie? Which one?",
      ],
    },
    bye: [
      "Mind the dark, {name}. And mind the light, too. It's not always on your side.",
      "Mind how you go, {name}. And don't count the crows.",
      "Night, {name}. Or morning. Whichever it is.",
    ],
  },

  // ---------------------------------------------------------------- The tithe barn

  garth: {
    first: [
      "Hm. You're the new one. I'm Garth. I carry things. ...For the Reeve, mostly. Sorry.",
      { met: 'dob', say: "Hm. Dob said you'd come by. He talks about you. ...In his sleep, too. I'm Garth. I share the loft. I carry things for the Reeve. ...Sorry." },
    ],
    greet: {
      morning: [
        "Morning, {name}. Dob talked in his sleep. About roofs.",
        "Morning. Crows are up. Same rows as yesterday.",
        "Morning. I'm off to Hob's with the cart. ...You don't need to come.",
      ],
      day: [
        "Hm. Hot. Sacks don't get lighter.",
        "{name}. Mind the cart. It doesn't stop quick. Like me.",
        "Sit a bit, if you like. I'm sitting a bit.",
      ],
      evening: [
        "Evening. Barn's shut. Feels better when it's shut.",
        "Hm. Day's done. Done for me, more like.",
      ],
      night: [
        "{name}. Can't sleep. Dob. ...And the other thing.",
        "Late. I walk round the barn sometimes. Counting the doors. There's two.",
      ],
    },
    about: [
      "Garth. Garth Underhill. I carry the tithe from the houses to the barn, and from the barn to the wagon. That's my work. ...That's all of it.",
      "Hilde calls me big. Maudie calls me gentle. The Reeve says 'have the man take it'. I'm the man.",
    ],
    ask: {
      tessariels: [
        "One gave me his helmet to mind. Never came back for it. It's in the loft. Dob wears it to sleep.",
        "They talk a lot. About her. About the light. ...I like the light. I just don't talk about it.",
        "You don't say much. ...Good. Me neither.",
      ],
      knight: [
        "He doesn't eat. Not that I've seen. A man who doesn't eat doesn't need grain. ...He's the only one I don't take from.",
        "Silas asked me to carry a coffin up the hill. I said no. First time I've said no to anything. Felt bad. Still do. Still no.",
      ],
      dead: [
        "Dead don't need feeding. That's something. ...I don't know what.",
        "Corran has me cart the ones he puts down, for burning. I do it. They weigh less than grain. That's the bit I don't like.",
      ],
      lis: [
        "She paid tithe once. One egg. Looked at me till I gave it back.",
        "She calls me 'ox'. Nicely. ...I think nicely.",
      ],
      town: [
        "Good people. Poorer every year. ...I'd know.",
        "I know every family's sack by the weight of it. The Fenwicks' gets lighter every year. I don't say so. I just carry it.",
      ],
      barn: [
        "Big barn. Full at month's end, empty after. In between it's me and the crows and the smell of other people's summer.",
        "The crows sit on the roof in rows. Same rows every morning. I counted them once. Then I stopped. Jory says never count them. ...I'd already counted.",
      ],
      dob: [
        "Dob sleeps up in the loft with me till his cottage has a roof. Two years now. He snores like a cart on cobbles. ...I'll miss it.",
        "Dob wants to be a Tessariel for a day. Just to see. ...I said I'd carry his armour.",
      ],
    },
    topics: { barn: 'The tithe barn', dob: 'Dob' },
    barks: {
      morning: [
        "Morning. Hm.",
        "Crows. Rows. Same as yesterday.",
        "Up, Dob. Up. Your roof won't build itself. ...It won't.",
        "Cart's loaded. Wish it wasn't.",
      ],
      day: [
        "Hup. Hup. Heavy one.",
        "Sorry, Hob. Sorry. I know.",
        "Mind your feet. Cart's coming.",
        "Lighter this year. Don't tell the Reeve.",
      ],
      evening: [
        "Barn's shut. Good.",
        "Day's done. Back's done too.",
        "Evening, Hilde. One ale. ...Two.",
        "Crows still there. They don't go home. Maybe that is home.",
      ],
      night: [
        "Shh, Dob. Shh.",
        "Can't sleep. Walking.",
        ringing("Dob. Dob. You're snoring over the bell."),
        quiet("Dob. Bell's stopped. You've no excuse for that noise now."),
        "Doors shut. Both of them. Good.",
      ],
      work: [
        "Fenwicks. Two sacks. ...Light.",
        "One for the Throne. One for the Throne. One for the Throne.",
        "Hup. Hup. Sorry.",
        "Easy, cart. Easy. Not your fault either.",
        "Wagon's late. Good.",
      ],
      player: [
        "Hm. {name}.",
        "{name}. The one with the skull. ...Hm.",
        "Thirteen. Hm. Good luck.",
        "{name}. Need anything carried? I carry.",
      ],
      magic: [
        "...Do that by the barn, and I'll say it was lightning.",
        "Huh.",
        "Easy. Easy. The cart's frightened.",
        "Hm. ...Do it again? No. Don't. ...Do.",
        "Never seen that. Nobody has.",
      ],
      woken: [
        "Mm. Is it the wagon? ...No? Then I'm asleep.",
        "Dob, it's for you. ...No. It's for me.",
        "Hm? Fire? No. Then go to sleep.",
        "...Thirteen. In the loft. Hm. Dob, wake up. No. Don't.",
      ],
    },
    bye: [
      "Hm. Go careful, {name}.",
      "Bye. ...Mind the cart.",
      "Go on, {name}. I've a sack to carry. Always a sack.",
    ],
  },
};
