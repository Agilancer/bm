// The Barrow Moor: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/moor.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it: nobody at a camp names Velscour or Tessariel, and no line anywhere names anything of the one
// beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs reads every line for it).
//
// Each with a voice of their own (tools/folk/cast.md, "The Barrow Moor"): Amos Tye the drover (heads, names, hurdles; a
// ring with nothing in it), Rue his daughter (fifteen, can drive, says so), Alis Penn of the wayhouse (prices, the
// slate, a penny for everything and the company free), Cobb Hollin the tinker (his granddam's sayings, and a pot in his
// hands), Brom Tarn the peat-cutter (counts turves, says little, keeps the old rules but one), Hulda his mother (talks for
// him), Master Lucan Dree the antiquary (measures and labels; the Moor Account), Sal Mattock his foreman (by the yard,
// and no sleep), and Old Morwen (counts the Maidens: nine, every time, the lying one too).
// No beasts are built at the Stance and none is said to stand there: Amos's drove is lost, six of it at Nan Dray's.
// Hubs open differently: Amos with a stick half-lifted, Alis with her lamp, Brom with his count, Lucan with a measure,
// Morwen with hers.
const DELVE_HINT = "The mound won't take one alone: Corporal Edric Fenn, on the terrace by its door, hires out a company.";

export const LINES = {
  // ---------------------------------------------------------------- the Drovers' Stance
  amos: {
    first: [
      "Stop there. I'd a stick in my hand for whoever came down that track next. ...You'll do without it. Amos Tye. This is the Stance: grass, water, a ring of hurdles and the waystone. It used to have a drove in it.",
    ],
    greet: {
      morning: [
        "Morning. Mist on the moor. It lifts off the Stance first and the Plot last. Always has.",
        "I walked the hurdles at first light. All standing. Nothing to keep in them, but they're standing.",
      ],
      day: [
        "Twenty-two years I've held this ring for whoever's driving over. Nobody's driving over.",
        "If you've anything to sell, I'll look at it. A drover buys what'll walk or what'll keep.",
      ],
      evening: [
        "Fire's lit. Sit where the smoke isn't. It goes where you sit; that's the moor's humour.",
        "Dusk's when a drove settles. I still go and stand at the gap in the hurdles. Habit.",
      ],
      night: [
        "Don't go out on the moor by night. There are lights. They're not ours.",
        "Keep this side of the waystone after dark. My grandfather set it there for a reason and never said what.",
      ],
    },
    about: [
      "Amos Tye. Drover, as my father was, and his. We hold the Stance on the Barrow Track: a night's grass and water for anyone taking beasts over the moor.",
      "I had thirty-eight blacks in that ring at Lammas. I've six at Nan Dray's, and a daughter who thinks she can drive. That's the stock.",
    ],
    ask: {
      dead: [
        "Rue says they come down from the Plot of a night and stand along the hurdles, outside, like buyers at a fair. I've not seen it. I've not looked.",
      ],
      town: [
        "Bellmourn? I take beasts to its fair. I don't stop. A town's all gates, and nobody shuts them.",
      ],
      drove: [
        "Thirty-eight head of black cattle, small and hardy, worth their weight on the hill. The hurdles went down in the night a month back. Six went up the track to Nan. The rest went the other way.",
      ],
      stance: [
        "A stance is grass, water and a ring of hurdles, a day's drive apart all the way over the moor. The next is the wayhouse. Widow Penn keeps it, and charges like a toll.",
      ],
    },
    topics: { drove: 'The drove', stance: 'The Stance' },
    bye: [
      "Keep to the track.",
      "Mind the Plot, north of the ring. You'll see it.",
    ],
    barks: {
      player: ["Who's that on the track?", "Keep to the track."],
      morning: ["Hurdles all standing."],
      day: ["Nobody driving over."],
      evening: ["Stood at the gap again."],
      night: ["This side of the waystone."],
      magic: ["That'd turn a drove.", "Not near the hurdles."],
    },
    shop: {
      open: [
        "I'll trade. Drovers always will. Rolls, and linen for a cut: on the moor you bind your own.",
        "Lay it on the board. I pay what it's worth to a man who'd have to walk to Bellmourn for it.",
      ],
      closed: ["Not now. I'm walking the hurdles."],
      buy: ["Yours. Keep it dry."],
      sell: ["I'll have that. It's more than's come down the track in a month."],
    },
  },

  rue: {
    first: [
      "I can drive. Before you ask. I've taken six head to the Fork and back on my own, twice, and he counts it as once. Rue Tye.",
    ],
    greet: {
      morning: ["Morning. He's walking the hurdles. He'll walk them again at noon."],
      day: ["The Spoil Heaps are south-east. I can see the dust off them from the waystone. They dig all day."],
      evening: ["He's at the gap again. Don't say anything to him about it."],
      night: ["I don't sleep much. I lie and listen to them digging. You can hear it through the ground."],
    },
    about: [
      "Rue Tye. Fifteen at Candlemas. Amos is my father. My mother drove the moor with him till the winter she didn't. I mean to drive it the first year I'm let.",
    ],
    ask: {
      dead: ["Father says never wave at the little ones on the bank up the track. He won't say why. That's the only reason I've not."],
      town: ["I've been. Once, to the fair. I sold a heifer for more than he would've, and he said it was the weather."],
    },
    bye: ["Go careful."],
    barks: {
      player: ["I can drive, you know."],
      day: ["Still digging."],
      evening: ["Don't say anything."],
      magic: ["Can you teach that? ...No. It'd scare the beasts."],
    },
  },

  // ---------------------------------------------------------------- the Moor Wayhouse
  alis: {
    first: [
      "You'll have heard of my lamp. Everyone has, from Bellmourn's tower down. It's lit because I live here. Alis Penn. Bed's a penny, the fire's a penny, and the company's free, because nobody's paid for it in years.",
    ],
    greet: {
      morning: [
        "Morning. Kettle's on. That's a penny too, but I'll not ask it of a face like that.",
        "Mist on the track. You'd hear a drove before you saw it, if there were ever one.",
      ],
      day: [
        "Half a roof and a whole well. I've run on less.",
        "If you've things to sell, I'll weigh them up. I keep a slate. Everyone's on it, the dead too.",
      ],
      evening: [
        "Lamp's lit. Mine. In the kitchen, low, where it's always been.",
        "I put the shutters to at dusk now. Tom never did. He said a wayhouse with its shutters up is only a house.",
      ],
      night: [
        "Late. I'll sit up a while. I've sat up most nights this month.",
        "Stay off the yard after dark. Go round by the lane if you've to go at all.",
      ],
    },
    about: [
      "Alis Penn. Widow of Tom Penn, who kept this house thirty years and has been in Sexton's Rest these six. I kept it with him. I keep it now.",
      "The other wing fell in the year the drovers stopped. I let it fall. You can't heat a house for nobody.",
    ],
    ask: {
      dead: ["They've a lamp out there of their own. You'll see. I'll not say more till you have."],
      town: ["Bellmourn sent its watchman's worries down here with every carter for a year. Not one of them stopped for a bed."],
      tom: [
        "A drover till his knees went, then a landlord, which he said was a drover who'd stopped. He kept a lamp in the window for anyone on the moor. We buried it with him. It's the moor's way: a light to go by.",
      ],
    },
    topics: { tom: 'Tom Penn' },
    bye: [
      "Mind the lane.",
      "Come back with money or news. Either's welcome.",
    ],
    barks: {
      player: ["Bed's a penny."],
      morning: ["Kettle's on."],
      day: ["It's on the slate."],
      evening: ["Mine's in the kitchen."],
      night: ["Off the yard."],
      magic: ["Not near the thatch."],
    },
    shop: {
      open: [
        "I buy, I sell, and I write it all down. Rolls, and clean linen: a wayhouse keeps both or it's no wayhouse.",
        "On the board with it. I'll give you a fair price and a fair look, and you'll get the look for nothing.",
      ],
      closed: ["Not now. I'm at the slate."],
      buy: ["There. I've written it."],
      sell: ["I'll take that. Something on the slate that isn't owed."],
    },
  },

  cobb: {
    first: [
      "Mind the pot. And the other pot. Cobb Hollin, tinker. I came over the moor in March with a pack and a good leg, and I've been paying my board in mending since. The widow's never had so many saucepans.",
    ],
    greet: {
      morning: ["Morning. Cold solder and a warm leg. One of them'll come right."],
      day: [
        "Pass me that? No, the other. Ta.",
        "I've mended every pot in the house, and some twice. She breaks them to keep me, I think. Or to keep busy.",
      ],
      evening: ["Shutters up. Good. My granddam said iron over the door and wood over the window."],
      night: ["Can't sleep for the leg. I sit and tap. Tap's company."],
    },
    about: [
      "Cobb Hollin. Tinker, from everywhere. I put a foot in a peat-hole in March and the widow took me in, and here I am, sat by her well like a bucket.",
    ],
    ask: {
      dead: ["Iron keeps them down. My granddam swore by it, and she lived to ninety and never once saw one walk. Mind, she never came to this moor."],
      town: ["Good place for pots, Bellmourn. Bad place for tinkers. There's a smith."],
    },
    bye: ["Go on. Mind the holes."],
    barks: {
      player: ["Mind the pot."],
      day: ["Tap, tap."],
      night: ["It's the leg."],
      magic: ["That'd solder a seam!"],
    },
  },

  // ---------------------------------------------------------------- Peatcutters' Rick
  brom: {
    first: [
      "Forty-one. Forty-two. ...Don't stand on the spit; it's cut. Brom Tarn. Peat. You'll want my mother. She does the talking.",
    ],
    greet: {
      morning: ["Morning. Dry wind. Good for the ricks.", "Cutting at first light. You'll have heard the slane."],
      day: ["Forty a day, if the face holds.", "Board's there. I'll buy. Mother sets the price."],
      evening: ["Ricks covered. That's the day."],
      night: ["Bed. Turf doesn't cut itself, and it doesn't cut in the dark."],
    },
    about: [
      "Brom Tarn. I cut peat. My father did. You cut it, you stack it, you sell it to whoever's cold. The wayhouse, the diggers, the town in a hard year.",
    ],
    ask: {
      dead: [
        "The peat keeps them. You cut down a spit and there's a hand, brown as a boot, and the ring still on it. We lay them out at the edge and bury them deep in the dry. That's how it's done.",
      ],
      town: ["Bellmourn burns wood. More fool it."],
      peat: [
        "Two spits down it's black, and it burns like coal. Ten spits down it's older than anybody, and you don't burn that. You leave it.",
      ],
    },
    topics: { peat: 'The peat' },
    bye: ["Mind the cut."],
    barks: {
      player: ["Mind the spit."],
      morning: ["Dry wind."],
      day: ["Forty-three."],
      magic: ["Don't set the ricks off."],
    },
    shop: {
      open: [
        "Turf, a roll, a bit of linen. And I buy. Mother'll say what it's worth.",
        "Lay it down. I'll give a fair price. If it's not fair, she'll say.",
      ],
      closed: ["Not now. Cutting."],
      buy: ["Yours."],
      sell: ["Right. That's on the rick."],
    },
  },

  hulda: {
    first: [
      "He'll not say good day, so I will. Good day. Hulda Tarn. I've cut peat on this moor since I could lift a slane, and that's seventy years, and I'll thank you not to say I'm too old for it.",
    ],
    greet: {
      morning: ["Morning. He's started without me. He always does. He's slower."],
      day: ["Seventy years. You'd think the moor'd be cut through by now. It grows faster than we take it."],
      evening: ["Fire's peat. Of course it is. Sit."],
      night: ["Old woman's hours. I'm up. I'm always up."],
    },
    about: [
      "Hulda Tarn. Widow of Arn Tarn, who went out to the cutting in the hard winter and never came back from it. Mother to that one. He's a good son. He's slow.",
    ],
    ask: {
      dead: ["The peat gives them up and we put them back. Seventy years I've done that. It's only lately they've stopped staying put."],
      town: ["Went once, to be married. Didn't care for it. Came back the same night."],
    },
    bye: ["Go on with you."],
    barks: {
      player: ["He'll not say good day."],
      day: ["Slower than me."],
      night: ["Always up."],
      magic: ["Hm. I've seen better at a fair."],
    },
  },

  // ---------------------------------------------------------------- the Diggers' Camp
  lucan: {
    first: [
      "Stand still. ...Five foot ten in your boots. I measure everything that comes into camp; it saves argument later. Master Lucan Dree, antiquary. I'm opening the Barrows, with a crane, a book, and Sal.",
    ],
    greet: {
      morning: [
        "Morning. The mounds have been there four thousand years and I've a summer. Sit, if you must.",
        "I've a find for every hour of daylight this month. Sal says I'd label the weather.",
      ],
      day: [
        "If you've anything old, I'll buy it. If you've anything new, I'll buy that too; Sal eats.",
        "Don't walk on the spoil. It's in order.",
      ],
      evening: ["Light's going. We stop. The account is very clear about the moor after dark, and so, lately, is Sal."],
      night: ["I'm writing up. Don't let me keep you."],
    },
    about: [
      "Lucan Dree. I find the past and sell it to people who can't be bothered to dig. I own the only copy of the Moor Account, which tells what's in the Barrows. It is right more often than I'd like.",
    ],
    ask: {
      dead: ["The account says the moor's dead sleep light. I took it for a figure of speech. That was an error, and I've written it down as one."],
      town: ["Bellmourn has a church I'd give a finger to measure, and a priest who won't let me. One day."],
      account: [
        "Forty leaves, in three hands, the oldest older than anything I own. A king under the great mound, shut in alive with his guard stood round him; a warden who never sat; and something he rode. I've had it twenty years. I believed the first part.",
      ],
    },
    topics: { account: 'The Moor Account' },
    bye: ["Mind the trench.", "Bring me anything with writing on it."],
    barks: {
      player: ["Stand still. ...Thank you."],
      morning: ["Four thousand years. One summer."],
      day: ["Don't walk on the spoil."],
      evening: ["We stop."],
      magic: ["Do that again. Slower. I'm writing it down."],
    },
    shop: {
      open: [
        "I buy anything old and sell anything useful. Rolls, linen: Sal insists. She says an antiquary ought to keep the living in mind.",
        "On the board. I'll pay over the odds for anything with a mark on it, and the going rate for the rest.",
      ],
      closed: ["Not now. I'm labelling."],
      buy: ["Yours. I've noted it."],
      sell: ["Mm. Yes. I'll have that. Numbered."],
    },
  },

  sal: {
    first: [
      "If he's measured you, you're in the book. Sal Mattock. I dig where he points and he pays by the yard, and I've not slept a night through since June.",
    ],
    greet: {
      morning: ["Morning. If it is. I can't tell any more."],
      day: ["Six of us when we came. Two now. The rest went home to sleep."],
      evening: ["Stop's called. Good. I'll sit and not sleep in comfort."],
      night: ["Don't mind me. I'm awake. I'm always awake."],
    },
    about: [
      "Sal Mattock. Foreman, though there's not much left to fore. Master Lucan finds it and I lift it. He's mad, and he pays on the nail, and I'd sooner that than sane and owing.",
    ],
    ask: {
      dead: ["One of the lads swore one walked out of the trench at him in the second week. Master Lucan wrote down what he said it wore. He'll write anything down."],
      town: ["Never been. I've spent my life in holes the other side of the moor."],
      south: [
        "Don't go south of the mounds. Three hundred paces off, a thing lies out on the moor: bones, and wings folded, long as the crane. Within two hundred paces it lifts its head. Be going the other way by then. Master Lucan wants to measure it. I've told him to do it from here.",
      ],
    },
    topics: { south: 'South of the mounds' },
    bye: ["Mind where you put your feet. It's all somebody's.", "And not south of the mounds. I mean it."],
    barks: {
      player: ["You're in the book."],
      evening: ["Not south. Not after dark either."],
      day: ["By the yard."],
      night: ["Awake."],
      magic: ["Don't light up the trench."],
    },
  },

  // ---------------------------------------------------------------- the Nine Maidens
  morwen: {
    first: [
      "Seven. Eight. Nine. ...Ten. No. Nine, and you. Stand outside the ring till I've done, you're spoiling it. ...Nine. Old Morwen. I count the Maidens. Somebody must.",
    ],
    greet: {
      morning: ["Morning. Nine. I've counted.", "Mist in the ring. They stand in it like washing."],
      day: ["They say you can't count the Maidens twice the same. I can. I've done it every morning and evening for seventy years."],
      evening: ["Dusk. I'll count them again. You'll stand still."],
      night: ["Sit by the stone. Don't sit on it."],
    },
    about: [
      "Morwen. My mother counted them, and hers. Eight standing and one lying down, and you count her too, or she's not counted, and then where are you.",
    ],
    ask: {
      dead: ["They don't come into the ring. Nothing does, but me, and you, and lately those three in robes, and they don't come in. They sit at the edge and look at her."],
      town: ["Bellmourn. They ring a bell there, I'm told, for the hours. I count stones. It comes to the same."],
      piper: [
        "The tall one off by himself, north-west. The Piper. He played for them to dance on a feast day, and they did, and they were stood where they were. Mother said so. She also said not to whistle in the ring.",
      ],
    },
    topics: { piper: 'The Piper' },
    bye: ["Go on. I'll count you out."],
    barks: {
      player: ["Stand still. Nine."],
      morning: ["Nine."],
      evening: ["Again. Nine."],
      night: ["Not on the stone."],
      magic: ["Not in the ring!"],
    },
  },
};

export const QUESTS = {
  // ================================================================ the Drovers' Stance (Amos Tye; Rue Tye)
  led_by_nothing: {
    title: 'Led by Nothing',
    giver: 'amos',
    about: "Amos Tye kept a rail of halters by the gap in his hurdles, one for every beast. They're gone, all of them, and the dead of the Hungry Plot, two hundred and fifty paces north of the Drovers' Stance, have been seen walking about on the end of them, leading nothing. Bring five back from round the Plot.",
    offer: [
      "A halter for every head, on the rail by the gap. Thirty-eight. Rope, a wooden toggle, and each beast's name cut in the noseband. You don't need names for cattle. I like them.",
      "The rail's bare. And I've seen them up at the Plot of an evening, walking about with my halters, holding the end, leading nothing. Bring me five back. I'll know them.",
    ],
    accept: "I'll bring your halters.",
    acceptLine: "North, the trail past the waystone, two hundred and fifty paces: a low fence half down, and a gate with a roof to it. The toggles are pale ash. They show in the grass.",
    decline: 'Not now.',
    declineLine: "They'll keep. Rope's patient.",
    journal: [
      "The halters off Amos Tye's rail lie round the Hungry Plot, north of the Drovers' Stance, where the dead walk about with them. Bring back five.",
      "Go back to Amos Tye at the Drovers' Stance with the halters.",
    ],
    progress: ["North. The Plot. Five halters. I'll know them."],
    done: [
      "Bess. Clover. Old Tup, who was a cow, whatever her name says. Dun. ...And this one. Wren. Wren's at Nan's. I counted her into Nan's six myself. Then what were they leading, on Wren's halter?",
      "Nothing. They were leading nothing. ...Here. A penny a halter, and one over. I'll hang them up. I'll not look at them.",
    ],
    after: ["Five back on the rail. I touch them going past, the way you'd touch a beast's neck. Daft."],
    others: {
      rue: ["He's sent you for the halters? He cut those names himself, every one, by the fire. He'll say he didn't."],
    },
  },

  the_spoil_heaps: {
    title: 'The Old Drove-Road',
    giver: 'rue',
    about: "Rue Tye means to drive her father's six over the moor in spring by the old drove-road south-east of the Drovers' Stance, not by the track. Kobolds have dug the old road into the Spoil Heaps, three hundred paces off. Empty the diggings, and their foreman.",
    offer: [
      "When he takes the six over in spring, I'm to drive. He hasn't said so. I've said so. Not down the track: by the old drove-road, south-east, the way his grandfather drove. It's softer on their feet.",
      "Only kobolds have dug it into heaps. They're at it all day; I hear them through the ground at night. Empty them, foreman and all. Then it's a road again, and I'll have nobody to blame but me.",
    ],
    accept: "I'll empty the heaps.",
    acceptLine: "South-east, three hundred paces, the trail off the back of the ring. You'll see the heaps before the holes. They come out of the holes like rain. The foreman's the biggest, and he keeps to the back. Don't tell Father where you're going. Tell him after.",
    decline: 'Not now.',
    declineLine: "Then I'll go myself, with a stick. ...No. I'll wait.",
    journal: [
      "Kobolds have dug the old drove-road south-east of the Drovers' Stance into the Spoil Heaps. Empty the diggings: every one of them, and their foreman.",
      "Go back to Rue Tye at the Drovers' Stance.",
    ],
    progress: ["South-east. The heaps. The foreman too, or they'll start again by Friday."],
    done: [
      "Quiet. I can't hear them. I put my ear to the ground at the waystone and there's nothing, first time since spring. ...What were they digging? Flags? Square stones, a cart wide, under the turf?",
      "That's the road. A real road, laid, under the moor. They were lifting it. I'm going to drive on that. Here, it's mine, from the heifer I sold. Don't tell him.",
    ],
    after: ["I walked out to the heaps and stood on the flags. Square stones, a cart wide, going off south-east under the turf. Somebody built that. For beasts."],
    others: {
      amos: ["She's sent you out to the heaps? She would. She thinks I don't know about the drove-road. I showed it her. She was four."],
    },
  },

  the_hungry_plot: {
    title: 'The Hungry Plot',
    giver: 'amos',
    needs: 'led_by_nothing',
    about: "The Hungry Plot, north of the Drovers' Stance, took a drove once, in Amos Tye's grandfather's father's day. A month ago his own thirty-two ran into it in the night, and its dead have walked about on his halters since. Empty it: every one of them, and the one that calls them up.",
    offer: [
      "My grandfather said the Plot's called Hungry because it took a drove. Forty head, in a night, in his father's time. Walked in at the lych gate and never walked out. I'd it down as a tale for children.",
      "A month back the hurdles went down in the night. Six ran to Nan. Thirty-two ran north. To the Plot. Empty it. All of it. And the one that calls them up: there's always one that calls.",
    ],
    accept: "I'll empty the Plot.",
    acceptLine: "North, the trail past the waystone, and in at the lych gate. They stand among the stones till you're close. The one that calls stands at the back and lifts its arms, and the rest come when it does. Put that one down first, if you can get at it.",
    decline: 'Not yet.',
    declineLine: "It's waited since my grandfather's father. It'll wait on you.",
    journal: [
      "Amos Tye's drove ran into the Hungry Plot, north of the Drovers' Stance, a month ago. Empty it: every one of the dead there, and the one that calls them up.",
      "Go back to Amos Tye at the Drovers' Stance.",
    ],
    progress: ["North. In at the gate. All of them, and the caller. I'll stand at the waystone till you're back."],
    done: [
      "No beasts? None? No bones, no hides, no horn? ...And the grass inside the fence trodden flat, in a ring, going round. That's how a drove treads a stance. A night's grass, going round and round, before they settle.",
      "They were holding a stance of their own. With my beasts in it. And they've driven them on over the moor, the moor knows where. Well. Six is a start. My grandfather started with two. This was his drover's coat. It turns weather. Wear it.",
    ],
    after: ["I walked up to the Plot this morning. The ring in the grass is still there. I didn't step in it."],
    others: {
      rue: ["The Plot? He's never let me past the waystone that way. Go on. Tell me what's in it after, and tell him less."],
    },
  },

  rate_for_a_drove: {
    title: 'Six, and a Man',
    giver: 'amos',
    needs: 'the_hungry_plot',
    about: "Amos Tye means to take his six over the moor in spring, and wants the Moor Wayhouse's rate for a drove before he does. Three of the possessed stand beside the Barrow Track to the south-west: put down two. The wayhouse is on past them, twenty-five minutes down the track. It's paid there.",
    offer: [
      "Six head and a man is a drove. Not much of one. In spring I'll take them over the moor to the far fair, the way we always did, and the first night's at the wayhouse. Widow Penn's. She'll have put her prices up. She always does.",
      "Ask her rate. For six, and me. And there's three stood by the track south-west, past the cairn, that I'd not drive past. You'll not walk past them either. Go through.",
    ],
    accept: "I'll ask her rate.",
    acceptLine: "South-west down the track, twenty-five minutes. The three stand beside it, short of halfway: two down will do. Then a stone house with half a roof and a lamp-post at its lane. That's her. She'll write you down.",
    decline: 'Not yet.',
    declineLine: "Spring's a way off. Go when your legs say.",
    journal: [
      "Three of the possessed stand beside the Barrow Track south-west of the Drovers' Stance. Put down two of them.",
      "Go on down the Barrow Track to the Moor Wayhouse and ask Widow Alis Penn her rate for a drove of six and a man.",
    ],
    progress: ["South-west. Through the three. Then the widow. Don't let her charge you for the asking."],
    done: [
      "Six head and Amos Tye? A penny a head the grass, a penny the water, and him in the stable for a penny or the house for three. Same as I charged his father. Tell him I've not put it up. ...Tell him I've not had the heart.",
      "There: I've put you on the slate, one walk, paid; he'll not have thought to pay it. Stop, if you're stopping. A wayhouse is for that, and I've a lamp that isn't mine to talk about.",
    ],
    after: ["Amos sent word back: six, in spring, and he'll take the house. Three pennies. I've written it on the slate a season early."],
    others: {
      alis: [
        "Six head and Amos Tye? A penny a head the grass, a penny the water, and him in the stable for a penny or the house for three. Same as I charged his father. Tell him I've not put it up. ...Tell him I've not had the heart.",
        "There: I've put you on the slate, one walk, paid; he'll not have thought to pay it. Stop, if you're stopping. A wayhouse is for that, and I've a lamp that isn't mine to talk about.",
      ],
      rue: ["The wayhouse? Tell the widow I'm coming too. She'll put me in the stable. I don't mind the stable."],
    },
  },

  // ================================================================ the Moor Wayhouse (Alis Penn; Cobb Hollin)
  moor_wayhouse: {
    title: 'The Other Lamp',
    giver: 'alis',
    about: "Bellmourn's watchman has seen a lamp at the Moor Wayhouse. Alis Penn says that one's hers. The other is carried round her windows each night by two in robes, with small dead at their heels, from the old peat-cuttings west of the house. Put out the other lamp: put down four of them.",
    offer: [
      "Your watchman in Bellmourn sees a lamp at the wayhouse from his tower, and he's told every carter for a year. It's mine. In the kitchen, low. What he can't see from there is the other one.",
      "Two in robes, and small ones round their feet, from the old cuttings west of the yard. Each night they carry a lamp round the house and hold it up to every window, the way a drover does at a house he's not sure of. Looking for a room. Put the other lamp out.",
    ],
    accept: "I'll put it out.",
    acceptLine: "West, past the stable and the stacks, a hundred and seventy paces, where the old cuttings are. By day they sit down in the cutting with it. The two in robes do the harm. The small ones only follow.",
    decline: 'Not tonight.',
    declineLine: "No. Nor any night. I'll keep the shutters up.",
    journal: [
      "Two in robes, with small dead, carry a lamp round the Moor Wayhouse each night from the old peat-cuttings west of it. Put down four of them.",
      "Go back to Alis Penn at the Moor Wayhouse.",
    ],
    progress: ["West. The cuttings. Two in robes, and their small ones. Four will do it."],
    done: [
      "Out. ...Their lamp. Give it here. ...It's Tom's. The brass one, with the dent where the cow kicked it. That's Tom's lamp. We buried it with him in Sexton's Rest, six years since. A light for the walk.",
      "Then they've been to him to get it. Here. That's for four, and for bringing it me, which you didn't have to. I'll not light it. I'll put it on the sill.",
    ],
    after: ["One lamp tonight. Mine. I looked out at the yard and there was nothing in it. I'd forgotten what that looks like."],
    others: {
      cobb: ["The lamp? I've seen it go round, held up to the glass. I stopped sitting by the window. A tinker can mend anything but a fright."],
    },
  },

  iron_on_the_graves: {
    title: 'Iron on the Graves',
    giver: 'cobb',
    about: "Cobb Hollin the tinker laid ox-cues, the half-shoes nailed on a drover's beasts, on the graves of Sexton's Rest, two hundred and sixty paces north of the Moor Wayhouse: iron, to keep the dead down. It hasn't. And they were his stock. Bring five back from round the burying ground.",
    offer: [
      "My granddam said iron keeps them down. A shoe over the door, a nail in the lid, a bit of iron on the grave. So in April I took a sack of ox-cues up to Sexton's Rest, the little half-shoes you nail on a beast for a long road, and laid one on every grave.",
      "Didn't work. You'll have noticed. And that's my stock: forty pair of cues, and I've a leg and nothing to sell. Go up the Rest and bring me five. Don't stop to read the stones.",
    ],
    accept: "I'll bring the cues.",
    acceptLine: "North, up the lane past the stacks, two hundred and sixty paces. A low fence, a lych gate, and a lot of standing about. They'll be kicked all over, in and out. Count five and come away.",
    decline: 'Not now.',
    declineLine: "No hurry. My leg's not going anywhere, and nor am I.",
    journal: [
      "Cobb Hollin laid iron ox-cues on the graves of Sexton's Rest, north of the Moor Wayhouse, to keep the dead down. Bring back five from round it.",
      "Go back to Cobb Hollin at the Moor Wayhouse.",
    ],
    progress: ["North. The Rest. Five cues. Count, and come away."],
    done: [
      "Five. Let's see. ...Worn. Bright at the toe, every one, a road's worth of wear on them, and I laid them new out of the box. These have been on a beast's feet.",
      "Somebody's shod a drove with my iron, and driven it, and put the cues back on the graves after. ...I'll not ask whose drove. Here. Have that off the board. And whatever you've got that's dented, I'll mend.",
    ],
    after: ["I sent word to Amos Tye about the cues. He walked over, and sat with them in his lap a while, and said nothing. For a drover that's a speech."],
    others: {
      alis: ["He's sent you up the Rest for his iron? I told him. Iron on Tom's grave. As if Tom ever let a horseshoe keep him in."],
    },
  },

  sextons_rest: {
    title: "Sexton's Rest",
    giver: 'alis',
    needs: 'moor_wayhouse',
    about: "Sexton's Rest, north of the Moor Wayhouse, is where the wayhouse buried the drovers who died on the moor, and Alis Penn's husband Tom with them; and its dead are up. Empty the burying ground, and whatever keeps them. Then bring her the top stone off Tom's cairn, inside the gate.",
    offer: [
      "Forty-one we buried up there, Tom and I. Drovers who died on the track, and one who didn't wake one morning in the back room. I wrote every one on the slate, and then on a board, and the board's nailed up in the dead-house at the back. Then Tom made forty-two.",
      "They're up, Cobb says, the lot of them. He's been and looked; I haven't. I want them lying down. Every one, and whatever keeps them up. Then bring me a stone off Tom's cairn. The top one. I'll not go up. I'll not.",
    ],
    accept: "I'll empty the Rest.",
    acceptLine: "North, up the lane past the stacks, and in at the lych gate. Something keeps the dead-house door at the back, and the rest are its. Tom's inside the gate, on the left. A cairn on him, not a stone. He'd not have a stone.",
    decline: 'Not yet.',
    declineLine: "He's waited six years in the wet. He can wait for you to be ready.",
    journal: [
      "The dead of Sexton's Rest, north of the Moor Wayhouse, are up, Tom Penn's among them. Empty the burying ground: every one of its dead, and whatever keeps them.",
      "Bring Alis Penn the top stone off Tom's cairn, inside the lych gate of Sexton's Rest, on the left.",
      "Go back to Alis Penn at the Moor Wayhouse with the stone.",
    ],
    progress: ["North. In at the gate. All of them. Then the top stone off Tom, on the left."],
    done: [
      "That's the top stone. There's his mark on it that I cut: a T, and a crook. ...And another beside it. Not mine. A mark I don't know, cut new, and neat, the way a drover marks a beast he's bought.",
      "Then they've had him. Tom. Marked like a beast at a fair. ...Leave it. I'll go up myself tomorrow with Cobb's chisel and cut it off. This was his stick. Blackthorn, forty years in his hand. He'd want it walking about, not stood in my corner. Take it.",
    ],
    after: ["I cut the other mark off his stone, and built him again, his T on top where it goes. I talked to him the whole while. He always did like the last word, and he didn't get it."],
    others: {
      cobb: ["She's sent you up to Tom? Then I'll sit here and mend something loud while you're gone, so she's something else to listen to."],
    },
  },

  the_kettle: {
    title: 'Forty Turves',
    giver: 'alis',
    needs: 'sextons_rest',
    about: "Alis Penn paid Peatcutters' Rick for forty turves at Lammas and has had none, and Cobb Hollin has mended Hulda Tarn's kettle besides. The Rick is five hundred paces west down the lane from the Moor Wayhouse. Tell Hulda her kettle's ready, then ask Brom Tarn for the peat. It's paid there.",
    offer: [
      "I paid the Rick for forty turves at Lammas. Brom Tarn's, the best on the moor, cut black. I've had none, and the nights are drawing in. Brom's not been late in twenty years. Brom isn't a man who's late.",
      "Go and ask. West, down the lane, five hundred paces: you'll smell it before you see it. And Cobb's mended old Hulda's kettle. Tell her first; she'll be civil. Then ask Brom. He'll not be.",
    ],
    accept: "I'll ask for the peat.",
    acceptLine: "West down the lane, five hundred paces, where it meets the Hollow Watch road. Ricks like long houses, and a cairn. Hulda's the small one with the big voice. Brom's the one cutting.",
    decline: 'Not now.',
    declineLine: "Then I'll burn the stable door. It's no good to me.",
    journal: [
      "Go west from the Moor Wayhouse to Peatcutters' Rick and tell Hulda Tarn that Cobb Hollin has her kettle mended.",
      "Ask Brom Tarn, at Peatcutters' Rick, for the forty turves Alis Penn paid for at Lammas.",
    ],
    progress: ["West. The Rick. Hulda first, then Brom."],
    done: [
      "Forty turves. Paid at Lammas. ...Aye. They're cut. They're stacked. They're on the rick by the Hollow, and I'll not go to that rick. Not with what's on it of a night. Tell her that.",
      "No. Don't tell her. Stop here and help me shift what's on it, and I'll take her the forty myself.",
    ],
    after: ["Brom brought the forty down himself, on his back, in four goes. He didn't say a word. He never does. I gave him tea, and he drank it."],
    others: {
      hulda: [
        "My kettle? The tinker's done it? Ha. He's quicker with a kettle than a leg. Tell him I'll pay him in turf, when there's turf to pay with.",
        "And you'll be after Brom about the widow's forty. Go on. He'll not look up. Ask him anyway.",
      ],
      brom: [
        "Forty turves. Paid at Lammas. ...Aye. They're cut. They're stacked. They're on the rick by the Hollow, and I'll not go to that rick. Not with what's on it of a night. Tell her that.",
        "No. Don't tell her. Stop here and help me shift what's on it, and I'll take her the forty myself. Here. Turf money.",
      ],
    },
  },

  board_owing: {
    title: 'Board Owing',
    giver: 'alis',
    needs: 'sextons_rest',
    about: "The diggers at the Diggers' Camp by the Barrows have eaten at the Moor Wayhouse on account, and Alis Penn says their board is three weeks owing. Take word to Master Lucan Dree. The camp is south-west down the Barrow Track, twenty-five minutes, under a crane. Carrion birds keep the track short of the camp: put down two. It's paid there.",
    offer: [
      "There's a gang digging the Barrows, south-west, under a crane: an antiquary and his diggers. They came through in spring, six of them, and ate like twelve, and he said put it on the slate, and I did, being a fool for a man with clean hands.",
      "Three weeks owing. Go and tell him. Civil: he's a gentleman, he'll pay. They always do, in the end. It's the end that takes the time. And mind the birds on the last stretch. Grey, with faces. They've something down by the track.",
    ],
    accept: "I'll take word.",
    acceptLine: "South-west down the track, twenty-five minutes. Short of the camp, off the road on your right, the birds: two down. The great mound's the one with stones round it; the crane's at the camp, east of it. He'll measure you. Let him.",
    decline: 'Not now.',
    declineLine: "Then it'll be four weeks. I'll write it.",
    journal: [
      "Carrion birds keep the Barrow Track short of the Diggers' Camp, on the way down from the Moor Wayhouse. Put down two of them.",
      "Go on down the Barrow Track to the Diggers' Camp by the Barrows, and tell Master Lucan Dree his diggers' board is three weeks owing to Alis Penn.",
    ],
    progress: ["South-west. The birds, short of the camp. Then the crane. Master Dree. Three weeks."],
    done: [
      "Three weeks? Is it? ...It's four. I keep accounts. Sal will take her the money, and I'll put a note with it apologising in a good hand.",
      "Do you dig? No. You do the other thing. I've a great deal of need of the other thing just now. Stay.",
    ],
    after: ["Sal walked the money up. She says the widow counted it twice and gave her a bed for the night free. Sal slept in it. The first night through since June, nearly."],
    others: {
      lucan: [
        "Three weeks? Is it? ...It's four. I keep accounts. Sal will take her the money, and I'll put a note with it apologising in a good hand. And that's for your time. I've noted it.",
        "Do you dig? No. You do the other thing. I've a great deal of need of the other thing just now. Stay.",
      ],
    },
  },

  // ================================================================ Peatcutters' Rick (Brom Tarn; Hulda Tarn)
  slanes: {
    title: 'Five Slanes',
    giver: 'hulda',
    about: "Wolfkin out of Moonbite Hollow, two hundred and sixty paces west of Peatcutters' Rick, have carried off the cutters' slanes, the narrow peat-spades, and chew the handles for the salt of their hands. Hulda Tarn wants five back from round the Hollow.",
    offer: [
      "A slane's a spade with a wing on it, for peat. Narrow, sharp, and the ash handle black from hands. We'd eight on the rack. We've three. The wolfkin come out of the Hollow of a night and take them.",
      "They chew the handles. It's the salt, off our hands. Seventy years of my salt in some of that ash. I'll not have it chewed. Go round the Hollow, the outside, and bring me five. He'll not ask you. He'd sooner cut with his fingers.",
    ],
    accept: "I'll bring your slanes.",
    acceptLine: "West, two hundred and sixty paces, the trail past the long rick: a hollow in the moor, the heather pulled out round it. They drop what they're tired of. Look for the chewing.",
    decline: 'Not now.',
    declineLine: "Then he'll cut with three and complain with none. Same as ever.",
    journal: [
      "Wolfkin from Moonbite Hollow, west of Peatcutters' Rick, have carried off the cutters' slanes. Bring Hulda Tarn back five from round the Hollow.",
      "Go back to Hulda Tarn at Peatcutters' Rick.",
    ],
    progress: ["West. The Hollow. Five slanes. The handles'll be chewed. Bring them anyway."],
    done: [
      "Mine. His. His father's, that he won't use. Mine again. ...And this one. That's Brom's own. It's never been on the rack; he keeps it in the bothy. He told me the wolfkin had it off the rack a month back.",
      "They never. He dropped it at the Hollow and ran, and said nothing, and he's cut with the old one since. ...Here. That's for five. Don't tell him I know. I'll put it back in the bothy, and he can find it.",
    ],
    after: ["I put his slane back in the bothy. He came out with it this morning and cut forty-four. He looked at me once. I looked at the weather."],
    others: {
      brom: ["She's sent you for the slanes? Good. She'll not have to say it at me again."],
    },
  },

  what_the_peat_gives_up: {
    title: 'What the Peat Gives Up',
    giver: 'brom',
    about: "The peat at Peatcutters' Rick gives up its old dead, brown as leather, and Brom Tarn laid them in a row at the edge of the cutting to be buried. Now they're up, built into one great thing of bones, and it stands in the cutting three hundred and forty paces south. Put down two of what stands there.",
    offer: [
      "Peat keeps them. Old ones. You cut down and there's a face, brown as a boot, asleep. We lay them out at the edge of the cutting, and come back with a cart, and bury them in the dry. Father always did. It's how it's done.",
      "I'd eleven laid out, south, by the deep cut. Waiting on the cart. They're not laid out now. Something's had them up and built them into one thing, tall as a rick, and two little ones walk round it. Put it down. Two'll do.",
    ],
    accept: "I'll put it down.",
    acceptLine: "South, three hundred and forty paces, past the end of the ricks. The deep cut. It'll be standing in it. Don't stand in front of it when it swings. I watched it take the top off a rick.",
    decline: 'Not yet.',
    declineLine: "It'll stand. It's got nothing else to do.",
    journal: [
      "The old dead Brom Tarn laid out by the deep cut, south of Peatcutters' Rick, have been built into a thing of bones. Put down two of what stands there.",
      "Go back to Brom Tarn at Peatcutters' Rick.",
    ],
    progress: ["South. The deep cut. Two."],
    done: [
      "Down. ...Good. Leave it lie. I'll take the cart down tomorrow and bury what's left, the right way this time, deep, in the dry. Should have done it the day I cut them.",
      "Here. That's turf money. It's what I've got.",
    ],
    after: ["Buried them. Eleven, and some I couldn't count. Deep, in the dry, like Father said. I stood a while after. Didn't know what to say. Said nothing."],
    others: {
      hulda: ["The ones by the deep cut? I told him: you don't leave them lying out a month. He said the cart had a wheel off. The cart's always got a wheel off."],
    },
  },

  moonbite_hollow: {
    title: 'Moonbite Hollow',
    giver: 'brom',
    about: "Wolfkin out of Moonbite Hollow, west of Peatcutters' Rick, climb the long rick at night and howl from the top of it, and Brom Tarn won't go near it, though the wayhouse's forty turves are on it. Empty the Hollow: every one of them, and the great one that leads them.",
    offer: [
      "The long rick. Forty turves of it are the widow's, and more of it's mine. I'll not go to it. They come up out of the Hollow of a night and get on top of it, all of them, and howl.",
      "Sat up there like dogs on a midden. The great one too, that the rest make room for. Empty the Hollow. Then I'll go to my own rick.",
    ],
    accept: "I'll empty the Hollow.",
    acceptLine: "West, where Mother sent you. Down in. They come up the sides at you. The great one hangs back till the rest are down, then it doesn't hang back.",
    decline: 'Not yet.',
    declineLine: "Then the widow's cold. Not my doing.",
    journal: [
      "Wolfkin from Moonbite Hollow, west of Peatcutters' Rick, sit on the long rick by night and howl. Empty the Hollow: every one of them, and the great one that leads them.",
      "Go back to Brom Tarn at Peatcutters' Rick.",
    ],
    progress: ["West. The Hollow. All of them."],
    done: [
      "Empty. ...I lay out on the rick last night to see what they were howling at. It isn't the moon. They face north. Every one of them faced north, up there. At Coldhowe.",
      "Here. That's for the Hollow. I'll take the widow's forty down tomorrow. Myself.",
    ],
    after: ["Nothing on the rick last night. I slept. Woke once, and listened, and there was only the wind."],
    others: {
      hulda: ["The rick? He's been feared of that rick a month, and he'll not say so. Go on. Then he'll say he never was."],
    },
  },

  coldhowe: {
    title: 'A Rod of Turf',
    giver: 'brom',
    needs: 'moonbite_hollow',
    about: "Brom Tarn cut peat to the very kerb of Coldhowe, the barrow two hundred and fifty paces north of Peatcutters' Rick, against his father's rule to leave a rod of turf round a howe. The face fell in, and what was in the howe walked out along the cutting. Empty Coldhowe, and its king.",
    offer: [
      "Father said leave a rod of turf round a howe. Sixteen foot and a half, all round, and don't cut it, not in the hardest year. I cut it. Last winter. The best black peat on the moor's under that rod, and I was cold.",
      "In spring the face fell in, and the howe was open into the cutting. And out they came, along it, the way we'd come in. Their king too, in his crown. That's what the wolfkin were howling at. Empty it. I'll put the turf back after. All of it.",
    ],
    accept: "I'll empty Coldhowe.",
    acceptLine: "North, two hundred and fifty paces, along the cutting. You'll see the howe, and the face fallen in. They'll be all round it. The king's the one with the crown. There's bigger than him with him. Mind those first.",
    decline: 'Not yet.',
    declineLine: "No. It's my doing. I'll sit with it a while longer.",
    journal: [
      "Brom Tarn cut too near Coldhowe, north of Peatcutters' Rick, and its dead walked out along the cutting. Empty the barrow: every one of them, and its king.",
      "Go back to Brom Tarn at Peatcutters' Rick.",
    ],
    progress: ["North. Coldhowe. The king, and his."],
    done: [
      "Down? In his own door? ...What had he in his hand? A slane? Bronze? ...He was cutting. He'd a slane, and he was cutting, out of the howe, toward us. Same as we cut toward him.",
      "I'll put the rod back, turf by turf, and more. This came out of the cutting the week the face fell. Out of the howe, I'd think. Older than him. Take it. I'll not have it on the rick.",
    ],
    after: ["I've laid back the rod round Coldhowe. Two rods. Mother says it's more than Father ever left. I said Father never had to."],
    others: {
      hulda: ["Coldhowe. I knew it. I said to him at Candlemas: you're cutting where your father wouldn't. He said Father's not cold. I said he is now."],
    },
  },

  // ================================================================ the Diggers' Camp (Master Lucan Dree; Sal Mattock)
  barrow_lights: {
    title: 'Lights on the Barrow Moor',
    dayHint: "Nothing moves among the mounds by day. Sal's lights keep night hours: come back after dark.",
    giver: 'sal',
    about: "Sal Mattock's diggers won't stay on the Barrows after dark for the white lights that move low among the mounds, like someone walking with a lamp held down by his knee, only there's nobody. Go among the mounds at night, two hundred paces west of the Diggers' Camp, and put out five of whatever carries them.",
    offer: [
      "You'll not get a digger on the mounds after dark. Not mine. White lights, moving low among the barrows, like somebody walking with a lamp held down by his knee. Only there's no somebody.",
      "My lads say ghosts. Master Lucan says marsh gas. Marsh gas doesn't come up a mound. I say I want my trench after supper. Go out among them at night. Put out five, and I'll know what they are.",
    ],
    accept: "At night, then. I'll go.",
    acceptLine: "Night, mind. They don't show by day. The mounds are west, two hundred paces: the big one with the ring of stones round it. And don't step on the mounds. My nan said don't step on the mounds. I dig them for a living and I still don't.",
    decline: 'Not tonight.',
    declineLine: "Nor me. I've a lantern, and that's all the brave I've got.",
    journal: [
      "White lights move low among the Barrows by night, west of the Diggers' Camp. Go there after dark.",
      "Put out five of whatever carries the lights among the mounds.",
      "Go back to Sal Mattock at the Diggers' Camp and tell her what the lights were.",
    ],
    progress: ["Night. The mounds. The lights. I'd come, but I'm watching the trench."],
    done: [
      "Jelly. Jelly full of bones, glowing like a lamp. ...Full of bones. Whose bones? ...Those are our finds. Master Lucan pays me by the bone, and they've been eating the stock.",
      "Here. That's out of the stock money, which is only fair. And I'll get a night's digging out of the lads now. Not sleep, mind. Digging.",
    ],
    after: ["We dug till midnight. No lights. One of the lads cried, after. He said it was the relief."],
    others: {
      lucan: ["Sal's lights? Phosphorescence, I said. ...Is it? Tell me after. I shall want a description."],
    },
  },

  the_singers: {
    title: 'The Singers',
    giver: 'lucan',
    about: "Robed ones stand on the north side of the great mound of the Barrows, a hundred and seventy paces west of the Diggers' Camp, and sing at it: low, many voices, no tune. Master Lucan Dree's account says the mound was shut on a king, with a song. He'd sooner it were opened with a spade. Put down five of the singers.",
    offer: [
      "The account says the great mound was shut on a king, his guard stood round him alive, and the door sealed with a song. I'd hoped to open it with a spade, properly, a course at a time, and write down each course.",
      "Somebody's singing at it instead. They stand on the north side of it, in robes, and sing. Low, a great many voices, no tune you'd whistle. Sal says it comes up the spade into your teeth. Stop them. Five should break the voice of it.",
    ],
    accept: "I'll stop the singing.",
    acceptLine: "West, a hundred and seventy paces, round the north side of the great mound. You'll hear them first. Two of them stand taller than the rest and lead. Don't let those two be the last you get to.",
    decline: 'Not yet.',
    declineLine: "Then I'll write down what they sing. Somebody ought to.",
    journal: [
      "Robed ones sing at the north side of the great mound, west of the Diggers' Camp. Put down five of them.",
      "Go back to Master Lucan Dree at the Diggers' Camp.",
    ],
    progress: ["West, the north side of the great mound. Five. I want the singing stopped, not the mound."],
    done: [
      "Five, and the rest scattered. And the door? ...Still shut. The slab across it, as it's been since they put it there. Then they weren't singing it open. You don't sing at a door you mean to open. You sing at what's behind it.",
      "They've been singing him awake. ...Here. For the five, and for the news, which is the worst I've had in twenty years and the best. The corporal by the Barrow Door has been waiting on exactly this.",
    ],
    after: ["No singing. I can hear the crane creak. I hadn't heard it creak since we put it up."],
    others: {
      sal: ["The singers? You hear it up the spade. In your teeth. I'd go myself, but I'd sooner keep my teeth."],
    },
  },

  the_sleepless_stones: {
    title: 'The Sleepless Stones',
    giver: 'sal',
    about: "Not one of Sal Mattock's diggers has slept a whole night since they cut a trial trench past the old ruin three hundred and fifty paces north-east of the Diggers' Camp, and four have gone home to sleep. The ruin is the Sleepless Stones. Empty it, and whatever's chief in it.",
    offer: [
      "We cut a trial trench in June, north-east, by the old ruin. Master's idea. Three courses of wall, a doorway, and nothing in it. Since that day not one of us has slept a night through. You lie down and something sits on your chest and looks in your face.",
      "Four of my six went home. To sleep, they said. The ruin's called the Sleepless Stones. I thought that was a name. Empty it. Whatever's in it, and whatever it answers to. I'd like to sleep before I'm fifty.",
    ],
    accept: "I'll empty the ruin.",
    acceptLine: "North-east, three hundred and fifty paces, past the end of our trench. Broken walls, and standing stones in among them. They don't show till you're in. And there's one worse than the rest, that the rest get out of the way of. That's the one that sits on you.",
    decline: 'Not now.',
    declineLine: "Then I'll not sleep. I'm used to it.",
    journal: [
      "Since they dug past the Sleepless Stones, north-east of the Diggers' Camp, none of Sal Mattock's diggers has slept. Empty the ruin: everything in it, and its chief.",
      "Go back to Sal Mattock at the Diggers' Camp.",
    ],
    progress: ["North-east. The ruin. All of it. And the one that sits on you."],
    done: [
      "Empty. And the one that sits on you, down. ...I'm going to lie down. Here, on the heap. Don't move me.",
      "Here. That's what I owe you, and I'd pay it twice. If I'm asleep when you come back, that's thanks. Leave me be.",
    ],
    after: ["Slept ten hours on the spoil heap, in my boots. Master says I snored the whole north side down. I don't care. I'd do it again tonight."],
    others: {
      lucan: ["Sal tells me she hasn't slept since June. I've been sleeping quite well. I put it down to a clear conscience. She puts it down to something less flattering."],
    },
  },

  ravenhowe: {
    title: 'Ravenhowe',
    giver: 'lucan',
    about: "Ravenhowe, two hundred and fifty paces south-east of the Diggers' Camp, is a lesser barrow Master Lucan Dree meant to open properly in September. Its dead have come out of it first, and their king with them. Empty it, and its king.",
    offer: [
      "Ravenhowe. The account calls it that for the birds that sat on it. No bird sits on it now; I've watched. South-east, two hundred and fifty paces, a lesser mound with its door to the moor. I'd marked it for September.",
      "It won't wait. Its dead are out, walking round it, and its king with them, in his crown, which I would very much like to see from closer than I dare. Empty it. If he falls, bring me his crown. I want to see what they put on him.",
    ],
    accept: "I'll empty Ravenhowe.",
    acceptLine: "South-east, the trail past the end of the camp: a lesser mound with its door to the moor. They keep round it. When the king falls, bring me his crown. That's all I ask.",
    decline: 'Not yet.',
    declineLine: "It's been there four thousand years. September will do.",
    journal: [
      "Ravenhowe, a lesser barrow south-east of the Diggers' Camp, has emptied itself onto the moor. Empty it again: every one of its dead, and its king.",
      "Bring Master Lucan Dree the crown of Ravenhowe's king.",
      "Go back to Master Lucan Dree at the Diggers' Camp with the crown.",
    ],
    progress: ["South-east. Ravenhowe. The king, and all his house. And his crown."],
    done: [
      "Bronze. Thin as a leaf, and dog's teeth set round the inside of it. ...Hold out your hand. There. It goes round your wrist. It goes round my wrist.",
      "A child's. The king of Ravenhowe was a boy, and they shut his guard in with him all the same. The account never said he was small. Here: my copy of what it does say of him, with my notes. I shall write the rest in.",
    ],
    after: ["I've measured the crown: six inches across. I've labelled it and put it away, and I keep taking it out again."],
    others: {
      sal: ["Ravenhowe? He's wanted that one since spring. Don't let him come with you. He'll want to measure them."],
    },
  },

  sung_open: {
    title: 'Sung Awake',
    giver: 'lucan',
    needs: 'the_singers',
    hint: DELVE_HINT,
    about: "The singers have sung the great mound of the Barrows awake: the Kingsbarrow. Its own door is still slabbed, but the Barrow Door at its south foot, two hundred paces west of the Diggers' Camp, goes in. Master Lucan Dree's account says the king's warden never sat down. Go in, with a company, and put down the Gravewarden.",
    offer: [
      "It's awake, then. The account says what wakes first: the king's warden, who never sat down. A man in his plate, stood at the king's door for four thousand years. I took that as a figure of speech. I've been taking a great many things as figures of speech.",
      "Go in. Not alone: the corporal on the terrace by the Barrow Door hires out a company. Put down the warden. And look at everything on the way. I'll want it all after, as near as you can say it.",
    ],
    accept: "I'll go into the mound.",
    acceptLine: "West, two hundred paces: the Barrow Door, in the little mound at the great one's south foot. The warden keeps the hall off the east walk. If he runs at you, let him run into something. Stone's patient. He isn't.",
    decline: 'Not yet.',
    declineLine: "No. It's a company's work. Get one.",
    journal: [
      "The singers have sung the great mound of the Barrows awake. Go into the Kingsbarrow, with a company, by the Barrow Door at the mound's south foot, west of the Diggers' Camp.",
      "The king's warden keeps the hall off the east walk. Kill the Gravewarden.",
      "Go back to Master Lucan Dree at the Diggers' Camp.",
    ],
    progress: ["The Barrow Door. The east walk. The warden. Then come and tell me everything."],
    done: [
      "Stood up in his plate, after all that while, and came at you. And you put him down by making him run into a pillar. Ha! ...No. I shouldn't laugh. The account would. Its third hand had a sense of humour.",
      "Here. Not for the warden: for the telling. A man ought to pay for his own history. This came out of the first trench: bog-oak, with a bronze shoe on it. Walk with it. And there's more below. The account has a seal on a stair, and two things holding it.",
    ],
    after: ["I've drawn the warden from your telling. Sal says the helm's wrong. Sal's never seen it. Neither have I. I've left it wrong."],
    others: {
      sal: ["You're going in? Down there? Rather you than me, and that's not a thing I say about holes."],
    },
  },

  king_under_the_moor: {
    title: 'The King Under the Moor',
    giver: 'lucan',
    needs: 'sung_open',
    hint: DELVE_HINT,
    about: "Below the Kingsbarrow's halls a stair is sealed, held by two things: the Gravewarden, who is down, and the Ossuary Golem off the west walk. Master Lucan Dree's account says the king rode to his grave on one of a pair: what he rode was shut in with him, and its mate lies out on the moor south of the mounds to this day. Put down the Golem, then go down the stair and kill what's below.",
    offer: [
      "The rest of the account, the oldest hand. He didn't walk to his grave, the king. He rode. There were two of them, and the scribe drew both in the margin. One went in with him, chained. The other lay down outside the door and wouldn't be moved.",
      "That's Sal's thing, south of the mounds, that lifts its head. Leave it lie. The one inside matters: break what holds the stair and go down. I'd as soon it never came up and looked at the moor. I'd also very much like to know what it looks like.",
    ],
    accept: "I'll go down to the king.",
    acceptLine: "The west walk for the other thing that holds it: the heap of bones that gets up. Don't let its bits walk home. Then the stair. And if the thing marks one of you, stand close together. The account says that. I never knew why.",
    decline: 'Not yet.',
    declineLine: "No. It's a long way down. I'll keep my lamp lit either way.",
    journal: [
      "The Ossuary Golem, in the hall off the west walk of the Kingsbarrow, is the other thing that holds the king's stair shut. Kill it.",
      "The stair is open. In the vault below is what the king rode. Kill Ossivar, the Barrow Wyrm.",
      "Go back to Master Lucan Dree at the Diggers' Camp.",
    ],
    progress: [
      "The bones in the west hall. Then down the stair.",
      "Close together when it marks you. Apart when it burns. The account's words, near enough.",
    ],
    done: [
      "A wyrm. Bones and all, and flew. Under the moor, all my years of reading, under the lights Sal's lads were frightened of. ...I'll sit down a minute. Don't mind me.",
      "This came out of the ditch in our first week. I labelled it, and I've never known what it was. It should go to somebody who's been where it came from. That's you. There's nobody else.",
    ],
    after: ["Its mate's still out south. Sal says it lifted its head last night and looked at the mound a long while, then put it down. I've written that it was grieving. Sal says I'm to cross that out."],
    others: {
      sal: ["He's sending you to the bottom? Then I'll put the kettle on. When you come up you'll want it, and he'll want to talk."],
    },
  },

  how_many_maidens: {
    title: 'How Many Maidens',
    giver: 'lucan',
    needs: 'ravenhowe',
    about: "Master Lucan Dree's survey wants a count of the Nine Maidens, the ring of stones south-east of the Diggers' Camp, and his account says nobody counts them the same twice. Old Morwen keeps their count. Three tomb drakes sit on the path: put down two. The Maidens are twenty-five minutes on. It's paid there.",
    offer: [
      "My survey wants the Nine Maidens: the ring south-east, at the moor's edge. The account says nobody counts them the same twice. I counted them in spring and made it eleven. Sal made it eight. Neither of us is a fool. One of us is.",
      "There's a woman out there who counts them every morning. Morwen. Ask her how many. And there are small drakes on the path, bone and leather, three of them, that sit and won't shift. Go through them.",
    ],
    accept: "I'll ask her.",
    acceptLine: "South-east, the camp path, twenty-five minutes. The drakes are a third of the way, on the path: two down will do. You'll see the Piper, the tall stone off by himself, before you see the ring. She'll be inside it, counting.",
    decline: 'Not now.',
    declineLine: "Then I'll put eleven, and a query.",
    journal: [
      "Three tomb drakes sit on the path south-east of the Diggers' Camp. Put down two of them.",
      "Go on to the Nine Maidens and ask Old Morwen how many there are, for Master Lucan Dree's survey.",
    ],
    progress: ["South-east. The drakes, then the ring. Ask her how many."],
    done: [
      "How many? Nine. Always nine. Eight standing and one lying, and you count her too. Tell your antiquary he counted the Piper and the two at the door, and missed her lying down. And his digger forgot her too.",
      "Sit. One, two, three: there. I've counted it out, so it's right. Not on the stone. I've work, if you'll stop. There's others come to the ring lately, and they're not counting.",
    ],
    after: ["Lucan Dree wrote back. Nine, he's put, and a note in the margin about me. I can't read. I'm told it's civil."],
    others: {
      morwen: [
        "How many? Nine. Always nine. Eight standing and one lying, and you count her too. Tell your antiquary he counted the Piper and the two at the door, and missed her lying down. And his digger forgot her too.",
        "Sit. One, two, three: there. I've counted it out, so it's right. Not on the stone. I've work, if you'll stop. There's others come to the ring lately, and they're not counting.",
      ],
      sal: ["The Maidens? I made it eight. I'll stand by eight. I'm not counting a stone that's lying down; you might as well count the path."],
    },
  },

  // ================================================================ the Nine Maidens (Old Morwen)
  the_one_lying_down: {
    title: 'The One Lying Down',
    giver: 'morwen',
    about: "Three in robes come up to the Nine Maidens from the north-west at dusk and sit round the one that lies fallen, and last night they had a rope round her. Old Morwen wants them put down: two will do. They keep a hundred and sixty paces north-west of the ring.",
    offer: [
      "Three in robes. They come up from the north-west at dusk and sit at the edge of the ring and look at her. The one lying down. They don't come in. Nothing comes in.",
      "Last night they'd a rope round her. Not to stand her up. You don't loop a stone round the middle to stand her. You loop her to drag. Put them down. Two'll do.",
    ],
    accept: "I'll put them down.",
    acceptLine: "North-west, a hundred and sixty paces, on the slope. By day they sit in the heather, the three together. I'd say mind the one in front, but they take turns.",
    decline: 'Not yet.',
    declineLine: "Then I'll sit up with her. I've sat up with worse.",
    journal: [
      "Three in robes come to the Nine Maidens at dusk, and have put a rope round the fallen stone. Put down two of them, north-west of the ring.",
      "Go back to Old Morwen at the Nine Maidens.",
    ],
    progress: ["North-west. Two of the three. And bring me the rope."],
    done: [
      "Two. And the rope. ...Look at it. Hemp, new, a cart-rope, with a drover's knot in it. They've had it off somebody's wagon. Off somebody.",
      "Here. That's for the two. I'll burn the rope. Nine, still: eight standing, and her. I counted while you were gone, to be sure.",
    ],
    after: ["I sat up with her the night after, in case. Nobody came. I counted nine at first light and slept till noon."],
  },

  cairn_stones: {
    title: 'My Own Five',
    giver: 'morwen',
    about: "Old Morwen has built five small cairns inside the Nine Maidens, a stone a morning for fifty years, and every morning lately they're a stone shorter. Her stones lie round the Ninth Circle, a coven's ring two hundred and seventy-five paces west. Bring five back from round it.",
    offer: [
      "Five cairns, inside the ring. Mine. A stone a morning since I was thirty, when I came to it after Mother. They're shorter. Every morning a stone shorter, and I'm not the one taking them.",
      "West, there's a ring of their own they've stood up on the moor. Warlocks, and worse. They call it the Ninth Circle. My stones are round it. I know my stones. Bring me five.",
    ],
    accept: "I'll bring your stones.",
    acceptLine: "West, two hundred and seventy-five paces, by the trail. Their ring's on the flat. Grey stones with a white mark on: my thumb, in lime. Wherever they've got to, you'll know them.",
    decline: 'Not now.',
    declineLine: "Then they'll be shorter tomorrow. I'll still count them.",
    journal: [
      "Somebody has been taking the stones of Old Morwen's five cairns inside the Nine Maidens. They lie round the Ninth Circle, west of the ring: bring back five.",
      "Go back to Old Morwen at the Nine Maidens.",
    ],
    progress: ["West. Their ring. Five of mine. The white mark. My thumb."],
    done: [
      "Mine. All five; that's my thumb. And earth on the bottoms, packed hard. These were wedged: pushed in at the foot of something heavy, to hold it upright while it settled, and pulled out after.",
      "Their stones. My cairns, holding their ring up. Fifty years of mornings. Here: one for each, counted out. I'll put these back where they go.",
    ],
    after: ["I put them back. Five cairns, a stone taller each than they were. I'm ahead, for once."],
  },

  the_ninth_circle: {
    title: 'The Ninth Circle',
    giver: 'morwen',
    needs: 'cairn_stones',
    about: "West of the Nine Maidens a coven has stood up a ring of its own and called it the Ninth Circle, as if Old Morwen's weren't. Empty it: every one of them, and the seer who reads the stones for them.",
    offer: [
      "There were nine rings on this moor once, Mother said. Eight were carted off for walls and gateposts, a stone at a time, by people who'd not count them. Ours is the last. The ninth.",
      "And now there's them, west, with a ring of their own stood up, and they call it the Ninth. As if ours weren't. Empty it. Every one, and the one who reads the stones for them. I'll stand here and count while you do.",
    ],
    accept: "I'll empty their ring.",
    acceptLine: "West, two hundred and seventy-five paces, on the flat. In among them. The one who reads the stones keeps the middle and doesn't move much. The rest come at you from between the stones. Don't stop to count them. That's my work.",
    decline: 'Not yet.',
    declineLine: "It'll stand till you're ready. That's the trouble with stones.",
    journal: [
      "A coven has stood up a ring of its own west of the Nine Maidens, the Ninth Circle. Empty it: every one of them, and the seer who leads them.",
      "Go back to Old Morwen at the Nine Maidens.",
    ],
    progress: ["West. All of them. The one in the middle too."],
    done: [
      "Empty. ...I'll tell you a thing. I walked to the Piper's foot last week and counted their ring from there. Eight, and a space between two of them a stone wide. A space the size of a Maiden. Her. They meant her for their ninth.",
      "Here. That's for the ring. Leave their eight stood; the moor'll have them down in its own time. It's patient. So am I. And there's one more thing south I'd have done, if you're stopping.",
    ],
    after: ["Nine, this morning. Eight standing and her. Nine this evening. I've stopped counting the moor west. There's nothing there to count."],
  },

  cold_hearth: {
    title: 'Cold Hearth',
    giver: 'morwen',
    needs: 'the_ninth_circle',
    about: "Cold Hearth, the ruin two hundred and seventy paces south of the Nine Maidens, was Old Morwen's aunt's farm. Nobody has lived in it for fifty years, and something keeps it now, by night and by day. Morwen wants it emptied, every one in it and the worst of them, before she makes up her mind about it.",
    offer: [
      "South, past the end of the ring, there's a ruin. Cold Hearth. It was my aunt's farm; she had it off her father. They called it that the winter she went, because nobody came to light the fire, and nobody has since.",
      "I'm eighty-one. I'll not sleep out by the ring for ever, and there's walls to it still. Only something keeps it, of a night and all day. Empty it. All of it, and the worst. Then I'll think.",
    ],
    accept: "I'll empty the farm.",
    acceptLine: "South, two hundred and seventy paces, down the trail from the ring's foot. Broken walls on the slope. They keep inside them. The worst is the one the others won't stand near; you'll see the room they leave it.",
    decline: 'Not yet.',
    declineLine: "It's been cold fifty years. Another week won't warm it.",
    journal: [
      "Something keeps Cold Hearth, the ruin of Old Morwen's aunt's farm, south of the Nine Maidens. Empty it: every one of them, and the worst.",
      "Go back to Old Morwen at the Nine Maidens.",
    ],
    progress: ["South. My aunt's. All of them, and the worst."],
    done: [
      "Empty. ...Then it's a farm again, near enough. Three walls and a door, and the wind kept off from most sides. I could live there. Mother would say I'd earned a roof.",
      "And who'd count them? ...No. They'd be eight by Candlemas, with nobody to count her. I'll stop where I am. Here. Mother's counting-shawl: a knot a stone, and start again at the fringe. I know the count. Wear it.",
    ],
    after: ["I walked down to Cold Hearth and sat in my aunt's doorway an hour. Then I walked back and counted. Nine."],
  },
};
