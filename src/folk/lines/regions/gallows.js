// Thornwick and the Gallowswood: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/gallows.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it: nobody at a camp names Velscour or Tessariel, and no line anywhere names anything of the one
// beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs reads every line for it).
//
// Each with a voice of their own (tools/folk/cast.md, "Thornwick and the Gallowswood"): Ann Arden at the Old Toll (plain,
// short, her father's ways caught off him), Master Crowle the hangman at the Cross (a reckoner: weights and drops, dry,
// never untidy), Tansy Wight who reads the lights (not who, only where to), Gil Mosse her hunter (by ear), Master Fabian
// Larke of the Winter Company (on, always on), Peg Hollin who sold its tickets (flat, and minds him), Mother Grawl (costs,
// jars, spite kept warm) and Wilf Carder the wool-factor at Roadsend (grades everything; out of wool). Osric's, Dorcas's
// and Wymond's own are in src/folk/lines/land.js. The hubs open differently: Osric on his pound (the Downs' errand in),
// Ann on the toll nobody pays, Crowle by your weight, Tansy on the light that isn't over you, Fabian with an entrance,
// Grawl by your smell, Wilf on the wool you're not carrying.
//
// What the game shows at each lair is what the words say (src/core/lair-dress.js): the werebat by the Gallows Road on a
// roost of forked poles with a harpy for company, the dragonling by Grawl's on a scorched bed, the old gibbet hung; Thornwick's carters stand by the
// road with no carts (so their carts are told of, not seen).
const DELVE_HINT = "The door under the stone table won't open for one alone: Sergeant Maud Halloway, beside it in the grove, hires out a company.";

export const LINES = {
  // ---------------------------------------------------------------- the Old Toll
  ann: {
    first: [
      "If you've come to pay, there's nobody to pay. The bar's up. It's been up since spring. Ann Arden. My father kept this toll. I'm keeping it. That's as far as I've got.",
    ],
    greet: {
      morning: [
        "I lift the bar at first light. For nobody. It's what he did.",
        "Morning. There's water in the well, and it's sweet. That's the one thing here that is.",
      ],
      day: [
        "Nothing up the road, nothing down it. In a good year there'd be a cart every hour and an argument with each.",
        "If you want the rates, they were on the post. They're up the rise now, in pieces.",
      ],
      evening: [
        "Dusk. Don't look up the rise. They like being looked at.",
        "He'd light the lamp on the post about now. I've no oil. I light it anyway, in my head.",
      ],
      night: [
        "Can't sleep? I sit up. The house has no roof; it's warmer by the well than in it.",
        "Something went over, low, toward Thornwick. It'll be back before light.",
      ],
    },
    about: [
      "Ann Arden. Wat Arden's girl. I kept house for the hangman at the Cross from fifteen. When word stopped coming down the road, I came up it, and found the toll like this.",
      "I dug the two graves by the well. One's his. The other's a carter I found on the road; I never knew his name. I put the carter further from the water.",
    ],
    ask: {
      dead: [
        "They face the bar, every one of them. South's only the Cross, and the Cross is only where you stop. I don't know what they think is past it.",
      ],
      town: [
        "Bellmourn? Father went once, to see the bell. He said it was a bell. He'd have liked it better if it had a bar across it and a box.",
      ],
      toll: [
        "A cart, two pence. A horse, a penny. A man on foot, a farthing. It went on the road: gravel, ditching, the bar. He never kept a penny of it. He kept his own pennies in a sock.",
      ],
      crowle: [
        "Master Crowle. He's not what you'd think. He reads. He doesn't sleep. He can't boil an egg; I've watched him try, and it's like watching a man work out the drop for it.",
      ],
    },
    topics: { toll: 'The toll', crowle: 'Master Crowle' },
    bye: [
      "Mind the poles on the way up.",
      "Go on. I'll lift the bar for you. Nobody else will.",
    ],
    barks: {
      player: ['Nothing to pay.', "Bar's up."],
      day: ['Nobody up, nobody down.'],
      evening: ["Don't look up the rise."],
      night: ['Something went over.'],
      magic: ["That's more light than this place has had since it burned.", "Don't. The thatch is gone, but the beams aren't."],
    },
  },

  // ---------------------------------------------------------------- Hangman's Cross
  crowle: {
    first: [
      "Stand where I can see you. I like to see who comes down the road. Most of them never went back up it. Master Crowle. The hangman. Retired. Nobody's told the Cross.",
    ],
    greet: {
      morning: [
        "Morning. I've walked round the mound. The ropes are still up. I've never taken them down. It'd look like I meant something by it.",
        "Up early? So am I. I've not slept past four since I was apprenticed. You get up to have it done before the crowd.",
      ],
      day: [
        "People came to watch, once. From Thornwick, from the toll, a day's walk to see a man dropped. I sold them nothing. Others did.",
        "If you've something to sell, I'll not buy it. I've all a man needs: a chair, a shelf, and a rope I don't use.",
      ],
      evening: [
        "Evening. I'd sit out, but things come to the fires on the Ground now. I sit in and listen.",
        "The sun goes behind the gallows about now. The shadow comes right up to my door. I put the door there.",
      ],
      night: [
        "Can't sleep? Nor can I. I go through them. Not by name. By weight. I remember every one by the weight.",
        "Hush. That's the pit. Something shifting in the lime. It's only settling.",
      ],
    },
    about: [
      "Master Crowle. Hangman of the Cross thirty-one years, by appointment of people who are all dead now. Nobody appointed anybody after. So I stopped.",
      "A good hangman's a reckoner. Weight, height, the length of the drop. Too short and it's slow; too long and it's untidy. I was never untidy. It's the one thing I'm proud of, and you'll notice I've not much else.",
    ],
    ask: {
      dead: [
        "They walk past the Cross and never look up at the beam. The living looked up, every one. That's how I tell which is which, at a distance.",
      ],
      town: [
        "Bellmourn sent me a man once, in a cart, with a letter. The letter was very civil. The man wasn't. I gave him seven foot. He was a big man.",
      ],
      trade: [
        "Arithmetic and a steady hand, and saying nothing on the morning. The saying nothing's the hard part. They talk to you. Some of them were funny.",
      ],
      ann: [
        "Ann kept my house sixteen years and never once asked me what I'd done that day. That's a rare gift. I'd thank her, if she came back. She won't.",
      ],
    },
    topics: { trade: 'The trade', ann: 'Ann Arden' },
    bye: [
      "Go on. Walk round the beam, not under it. Old manners.",
      "Off you go. I'll be here. It's in the name of the place.",
    ],
    barks: {
      player: ['Eleven stone, near enough.', 'Walk round, not under.'],
      morning: ['Ropes are still up.'],
      day: ['Nobody to watch now.'],
      evening: ["Shadow's at the door."],
      night: ['Only the lime settling.'],
      magic: ["Well. That'd have drawn a crowd.", "Not near the beam. It's old wood."],
    },
  },

  // ---------------------------------------------------------------- Corpse-Candle Camp
  tansy: {
    first: [
      "No light over you. I looked as you came up the lane. Tansy Wight. They call this Corpse-Candle Camp because of me. I'd have called it something with fewer bodies in.",
    ],
    greet: {
      morning: [
        "Morning. No lights at dawn. They don't walk in daylight. It's a restful hour.",
        "Fire's in. Gil's out. Nobody's going that I know of. A good morning, then.",
      ],
      day: [
        "Trade? I'll trade. I'm not so wise I don't need salt.",
        "Ask me anything but who. People want to know who. I never know who. Only where to.",
      ],
      evening: [
        "I'll sit up soon and watch the wood. You needn't. It's not catching.",
        "Dusk. The first one goes about now, if there's to be one. ...Not tonight. Not yet.",
      ],
      night: [
        "There. See it? Low, over the trees, going west. No. Don't follow it. It's not for you.",
        "I watch till the fire's down. Then I sleep, and if one goes while I'm asleep, it's somebody else's business.",
      ],
    },
    about: [
      "Tansy Wight. My mother read the lights, and hers. A light goes from where someone is to where they'll be laid, the bearers' road, a night or a week before. I see it. I say so. That's all.",
      "People think I make it happen. I don't. I tried to put one out once, for a child I knew. You can't. You can only tell.",
    ],
    ask: {
      dead: [
        "The dead that walk aren't who the candles are for. They've been carried already. They've only got up again. The candles are for those still to go.",
      ],
      town: [
        "A man came from Bellmourn once to write down what I saw. He went home and wrote it wrong. There was a light for him the next spring. I didn't send to tell him.",
      ],
      candles: [
        "Small, blue at the heart, knee high, and they don't flicker. They go at a walk: the bearers' walk. Where one stops, that's where they'll rest the coffin to change hands.",
      ],
    },
    topics: { candles: 'The corpse-candles' },
    bye: [
      "Go on. Nothing over you. I looked.",
      "Mind the lane after dark. Not for the lights. For the giants.",
    ],
    barks: {
      player: ['Nothing over you.'],
      morning: ['No lights at dawn.'],
      day: ['Not who. Where.'],
      evening: ['Not tonight.'],
      night: ["Don't follow it."],
      magic: ["That's no candle. Too bright and too quick.", "Put that out. You'll muddle me."],
    },
    shop: {
      open: [
        "Salt meat, a roll, lint. Gil's furs aren't for sale; he wears them. What've you got?",
        "Put it down. I'll buy what I can use, and some I can't. It's lonely trade out here.",
      ],
      closed: ["Not now. I'm watching."],
      buy: ['There. Go careful.'],
      sell: ["I'll take it. It's come further than most things here."],
    },
  },

  gil: {
    first: [
      "Don't mind the bow. I keep it strung. It's ruining the bow, and I can't stop. Gil Mosse. I hunt for the camp. Mostly I listen for it.",
    ],
    greet: {
      morning: ["Morning. Heard a roe go by at four. First in a month. I let it go. Something might have been following it."],
      day: ["Out at the edge of the trees, listening. It's like hunting, only nothing comes."],
      evening: ["Dusk's when you hear most. Everything that's going to move, moves. Don't talk for a bit."],
      night: ["That's nothing. ...That's nothing. That one's something. No. Gone."],
    },
    about: [
      "Gil Mosse. I came up to hunt the wood the year after the plague, when nobody else would, and there was meat for the taking. Now there's not much meat and a lot of taking.",
      "I hunt by ear. Deer, boar, hare: you learn what everything sounds like walking. The sick are the worst. They walk like men who've forgotten they're carrying something.",
    ],
    ask: {
      dead: ["The ones in the ruin walk tall and quiet. The sick at the Field shuffle. The giants you hear a field off. Know the sound and you know which way to run."],
      town: ["Never been. Tansy says there's a bell. A bell's no use. It tells everyone where you are."],
    },
    bye: ['Go quiet.'],
    barks: {
      player: ['Shh. Listening.'],
      day: ['Nothing coming.'],
      evening: ["Don't talk for a bit."],
      magic: ["That's every beast for a mile gone.", 'Loud. Very loud.'],
    },
  },

  // ---------------------------------------------------------------- the Players' Wagon
  fabian: {
    first: [
      "Enter a stranger, from the north, in dust. ...Forgive me. Three winters and nobody to say it to. Fabian Larke, master of the Winter Company, such as is left of it: myself, a wagon, and Peg.",
    ],
    greet: {
      morning: [
        "Good morning! A fine house this morning: an empty grove and a crow. I've played to worse.",
        "Morning. I've rehearsed the speech I'd give if they came up. I give it every morning. It's getting good.",
      ],
      day: [
        "Buying? Selling? I'll sell anything off the wagon but the wagon. Crowns, swords, a cloud on a stick. All wood. All paint.",
        "In a good year we'd have played six towns by now and owe five of them. This year I owe one inn eleven suppers and a pest-house a cough.",
      ],
      evening: [
        "Dusk. They'll come and sit in the grove soon. I stand on the steps so they've someone to look at.",
        "The light's going. Best hour for a play. Everyone's tired enough to believe.",
      ],
      night: [
        "Can't sleep? Nor I. I listen at the door under the table. Some nights there's singing. I know the song. I wrote the second verse.",
        "Hush. ...No. I thought I heard the overture. It's only the wind in the grove. It's got the tune wrong.",
      ],
    },
    about: [
      "Fabian Larke. I've run the Winter Company twenty winters: inns and fairs, barns, once a hayloft for a lord who fell asleep. I do the talking. I've never had the money.",
      "Three winters back a woman with a box paid for a house to be dug under the grove, and the company went down to play in it till spring. I had a cough. I stayed with the wagon. I'm still with the wagon.",
    ],
    ask: {
      dead: ["We did a ghost play once. The ghost was Tobias in a sheet. He's down there now. I'd not want to know what he's playing."],
      town: ["Bellmourn! We played the market. They paid in turnips. We ate well that week and played badly."],
      company: ["Eleven players, a seamstress, two hands, and the woman with the box. The Leading Man was my own find: mending nets on a quay, and I gave him a voice. She gave him the rest."],
    },
    topics: { company: 'The Winter Company' },
    bye: [
      "Exit, pursued by nothing in particular. Go well.",
      "Off you go. Come back with a better ending.",
    ],
    barks: {
      player: ['Enter, a stranger!', "A house of one. I'll take it."],
      morning: ['A fine house this morning.'],
      day: ['Crowns! Swords! All wood.'],
      evening: ["They'll sit soon."],
      night: ["That's not the overture."],
      magic: ['Now THAT would have filled a barn.', 'Bravo. No, truly. Bravo.'],
    },
    shop: {
      open: [
        "The company's stock, what's left. Rolls, lint, and I'll buy what you've got for more than it's worth; I was never any good with money.",
        "Lay it out. I'll value it as a prop. A prop's worth whatever the audience believes.",
      ],
      closed: ["Not now. I'm rehearsing."],
      buy: ['Yours! Wear it like you mean it.'],
      sell: ["Sold, to the gentleman in the front row. That's me."],
    },
  },

  peg: {
    first: [
      "Ticket? ...No. There's no play. I just say it when someone comes up the lane. Three winters, and I still say it. Peg Hollin. I sold the tickets.",
    ],
    greet: {
      morning: ["He was at the door under the table again all night. I put a blanket on him at three."],
      day: ["If he tries to sell you a crown, it's wood. He knows it's wood. He'll still try."],
      evening: ["They're coming to sit. Don't look at them too long. They like being looked at."],
      night: ["Can't sleep. I go over the takings that aren't there. It passes the dark."],
    },
    about: [
      "Peg Hollin. Fabian took me on at a fair for my voice; I can shout a price across a market. I sold tickets six winters, and the seventh I didn't go down with them, because somebody had to mind him.",
      "He thinks I stayed out for his cough. I stayed out because the woman with the box asked how tall I was.",
    ],
    ask: {
      dead: ["They don't pay. That's how you tell, at a door. Everyone pays, or argues. They just come in."],
      town: ["Bellmourn paid in turnips. He'll have told you. He tells everyone. He thinks it's a good story."],
    },
    bye: ["Go on. I'll keep him off the stair."],
    barks: {
      player: ['Ticket? ...No. Sorry.'],
      day: ["It's wood."],
      evening: ["Don't look at them long."],
      magic: ["He'll want you in the company now. Run.", "Better than our lightning. Ours was a sheet of tin."],
    },
  },

  // ---------------------------------------------------------------- Mother Grawl's Hut
  grawl: {
    first: [
      "You've been at the Cross. You've Crowle's woodsmoke on you, and the lime off his pit. Stand downwind of my pot, would you. Mother Grawl. You've heard of me. It's not true. Mostly.",
    ],
    greet: {
      morning: [
        "Morning. I've been up since the dew. Dew's for picking. Everything else is for later.",
        "Mind the garden. I don't weed it. What comes up comes up, and I find a use.",
      ],
      day: [
        "Want something? Everything here costs. Talking's cheap. The rest isn't.",
        "Don't touch the poles. The skulls are for keeping off, not for looking at.",
      ],
      evening: [
        "Pot's on. Don't ask what for. If you have to ask, it's not for you.",
        "The lane goes quiet about now. It used to go quiet because of my dogs. Now it goes quiet because it wants to.",
      ],
      night: [
        "Out late? So am I. The best of it comes up by moonlight. So does the worst. You learn which.",
        "Hush. That's out on the burnt ground. Something turning over in its sleep. Let it.",
      ],
    },
    about: [
      "Mother Grawl. Nobody's mother. They called me it at thirty, out of fear, and I let them, out of spite. I sell to the Cross, to Roadsend, to anyone who walks up the lane with coin and a trouble.",
      "A hut, a pot, a garden I don't weed, and things in jars. I know what's in every jar. That's the whole of the trade: knowing what's in the jars.",
    ],
    ask: {
      dead: ["They don't come up my lane. Not for fear of me. There's nothing up it they want. The dead want the road. They want to be going somewhere."],
      town: ["Bellmourn? I sold a cure there once, in the market. The man came back cured and angry. I've not been since. He'd have wanted to pay more."],
      jars: ["Henbane, for sleep and worse. Bat, for seeing in the dark, if you can keep it down. Crowle's, for what he says is his knees. Wilf's, for the cough he says he hasn't. Everyone's something."],
    },
    topics: { jars: 'The jars' },
    bye: [
      "Go on. Don't look back at the hut. It doesn't like it.",
      "Off with you. Come back when you want something. You will.",
    ],
    barks: {
      player: ['Downwind, if you please.', 'Want something?'],
      morning: ["Dew's for picking."],
      day: ['Everything costs.'],
      evening: ["Pot's on."],
      night: ['Let it sleep.'],
      magic: ["Showy. I'd have done it with half.", 'Mind my garden with that.'],
    },
  },

  // ---------------------------------------------------------------- Roadsend
  wilf: {
    first: [
      "Roadsend. It's the name, and it's what you'll find. Are you carrying wool? No. Nobody's carrying wool. Wilf Carder. I buy it, when there is any, and send it on, when there's anywhere to send it.",
    ],
    greet: {
      morning: [
        "Morning. Fire's in, the road's empty, and the block's still where it was. That's my news.",
        "Up early? The dew's on the rise. I don't look at the rise in the mornings. You'll see why.",
      ],
      day: [
        "Selling? I'll buy; I'm a factor. I'm out of wool. I'm not out of coin. It's an unnatural way for a factor to be.",
        "The carts came every week from Thornwick in a good year. Wool down, salt and cloth back. Now nothing comes but weather.",
      ],
      evening: [
        "Dusk. I sit facing the rise. Don't ask. You'll find out if you stop.",
        "The road east goes dark first. It's the hills.",
      ],
      night: [
        "Can't sleep? Nor can I. I go over the clips in my head: Thornwick, Dunmow, the downs. Every fleece I ever bought. It passes the dark.",
        "Hear that? No? Good. Neither did I.",
      ],
    },
    about: [
      "Wilf Carder. My father was a carter on this road and I came up off the cart. Bought my first clip at nineteen off a widow at Thornwick, and paid too much, and she knew, and sold to me every year after.",
      "Roadsend's where the lanes out of the wood come on to the big road. The wool came down the lanes to me and went east on the road. I'm the bit in between. Was.",
    ],
    ask: {
      dead: ["They stand on the big road and go nowhere. Like a queue. You'll see the real one if you go north-east. It moves about as fast."],
      town: ["Bellmourn wool's poor. Coarse. They breed for the mutton. Thornwick breeds for both and gets neither. Dunmow's is the best, and Rafe Dunmow won't sell it to me."],
      wool: ["Grade it by the hand: fine, middling, coarse, and kemp, which is hair and no use. A good fleece rolls like a blanket. A bad one comes apart like an argument."],
    },
    topics: { wool: 'Wool' },
    bye: [
      "Go well. If you see a cart, tell it where I am.",
      "Off you go. The road's that way. Both ways.",
    ],
    barks: {
      player: ['Wool? No. Nobody has.'],
      morning: ["Road's empty."],
      day: ['Out of wool.'],
      evening: ['Facing the rise.'],
      magic: ["That'd card a fleece in a blink. Can it?", "Mind the bales. What's left of them."],
    },
    shop: {
      open: [
        "A roll, lint, and coin for whatever you're carrying. Wool, specially. I'll give you a fair price, and I've never said that and meant it before.",
        "Lay it out. I grade everything. Don't take it to heart.",
      ],
      closed: ["Not now. I'm watching the rise."],
      buy: ['Done. Carry it dry.'],
      sell: ["I'll take it. It's not wool, but it's something come down the road."],
    },
  },
};

export const QUESTS = {
  // ================================================================ Thornwick (Osric Thorne; Dorcas Pym; Wymond Ebb)
  hedge_breakers: {
    title: 'Hedge-Breakers',
    giver: 'osric',
    about: "Three goat men lie up in a hollow on the downs north-west of Thornwick, where the old sheep track leaves the road, and come down at night to lean on Osric Thorne's hedge till it gives. Put down two. The third will run, and Osric wants to see where. Three hundred and twenty paces.",
    offer: [
      "Three goat men. On the downs north-west, where the old sheep track leaves the road. They come down at night and lean on my hedge till it gives. Then they go home. They don't even come in.",
      "I've mended the west side four times this month. I'm out of blackthorn and out of patience. Put two of them down. The third'll run. I'd like to know where to.",
    ],
    accept: 'Two of them.',
    acceptLine: "Out the north-west gate, up the road a little, then left onto the downs: three hundred and twenty paces. A hollow with a dead thorn in it. That's theirs. Mind the horns; they lead with them.",
    decline: 'Not now.',
    declineLine: "Then I'm cutting blackthorn by lamplight again. Mind the gate on your way.",
    journal: [
      "Goat men from a hollow on the downs north-west of Thornwick break its hedge by night. Put down two of the three, and see where the last one goes.",
      "Go back to Osric Thorne at Thornwick's north-west gate.",
    ],
    progress: [
      "North-west, on the downs. The hollow with the dead thorn. Two, and watch the third.",
    ],
    done: [
      "South-west? Up the high down, where there's no hedge and no reason for one? ...Then he's gone home. My father said there was a black one up there. I thought it was to keep me in at night.",
      "Here. It's the hedge-penny: what every house pays me to keep the thorn. This month you kept it.",
    ],
    after: [
      "West side's held nine nights. I've started laying the gaps properly, on the slant. It'll outlast me now.",
    ],
    others: {
      dorcas: ["Osric's got you after his goats? Good. He's been cutting thorn by lamplight and coming in here bleeding on my settle."],
    },
  },

  black_ram: {
    title: 'The Black Ram',
    giver: 'osric',
    needs: 'hedge_breakers',
    about: "The goat man that ran went south-west, up the high down four hundred paces from Thornwick, to the Black Ram: black from horn to hoof, with two that walk behind him. Osric Thorne's father spoke of him. Put down two of the three, and Osric hopes one is the Ram.",
    offer: [
      "The one that ran went to him, then. The Black Ram. Black from horn to hoof, with two that walk behind. My father spoke of him, and I took it for a story for a boy who wouldn't come in.",
      "If he's real he'll send three more by the next moon, and I've no thorn left to cut. Go up and see. Two of them down will do it, if one of the two is him.",
    ],
    accept: "I'll go up and see.",
    acceptLine: "South-west of the gate, four hundred paces, up where there's no hedge. If he's there you'll not need to look for him. He'll be the one looking at you.",
    decline: 'Not that one.',
    declineLine: "No. Well. I'll cut more blackthorn.",
    journal: [
      "The goat men who break Thornwick's hedge answer to a great black one on the high down south-west of the village. Put down two of the three there: the Black Ram among them, if you can.",
      "Go back to Osric Thorne at Thornwick's north-west gate.",
    ],
    progress: [
      "South-west, on the high down. Black from horn to hoof. And two behind.",
    ],
    done: [
      "Real, then. And down. My father was right, and I can't tell him. I'll tell the hedge.",
      "This came down to me with the billhook. A goat's hoof, shod in iron. He said it was cut from one of the Ram's own, long ago, and whoever wore it would never slip. I'm a hedger. I don't climb. You do.",
    ],
    after: [
      "No hoofprint on the west side in a fortnight. The lambs are sleeping outside the fold. I've let them.",
    ],
    others: {
      wymond: ["The Black Ram? I blessed against him as a young clerk, without believing a word. If he's dead I shall be quite smug."],
    },
  },

  up_from_the_gallowswood: {
    title: 'Up from the Hanging Wood',
    giver: 'dorcas',
    about: "Plague stragglers up the road from the Gallowswood have stopped beside it four hundred paces south-east of Thornwick, where the wool carts used to water: one in iron, three not. Dorcas Pym can't serve supper with that at the end of the lane. Put three of the four down.",
    offer: [
      "They come up the road from the south-east. Not walkers like yours. Ours carry the sickness, and one or two have iron on over it. You smell them before you see them.",
      "There's four stopped just off the road past the south gate, where the wool carts used to water: one in iron, three not. They don't come on and they don't go back. I can't serve supper with that sat at the end of the lane. Three down and I'll open the south shutters.",
    ],
    accept: "I'll see to them.",
    acceptLine: "Out the south-east gate and down the road, four hundred paces. You'll know the place by the smell. Don't let them cough on you. And come straight back; I'll have water on to wash.",
    decline: 'Not now.',
    declineLine: "Then I'll keep the shutters to. Again.",
    journal: [
      "Plague stragglers out of the Gallowswood have stopped beside the road south-east of Thornwick, where the wool carts used to water: one in iron, three not. Put down three of the four.",
      "Go back to Dorcas Pym at the Hare and Harrow in Thornwick.",
    ],
    progress: [
      "South-east, off the road. One in iron. You'll smell them.",
    ],
    done: [
      "Down? Then stand there. No, there, on the flags. Don't touch anything. I'm fetching the lye.",
      "Right. You'll do. Here's the house's thanks, and there's mutton, and you're having both.",
    ],
    after: [
      "I had the south shutters open at supper. Somebody nearly smiled. I'll not push it.",
    ],
    others: {
      osric: ["The ones in iron don't mind the hedge. They don't mind anything. I've seen one walk through a gorse fire to get nowhere."],
      wymond: ["Dorcas wants them gone. So do I. But they'll have tags on, and I'd like those first. Come and see me."],
    },
  },

  names_in_lead: {
    title: 'Names in Lead',
    giver: 'wymond',
    about: "The pest-houses down in the Gallowswood hang a lead tag on everyone they take in, with a name scratched on it. Wymond Ebb wants the tags off the stragglers stood by the road south-east of Thornwick, so he can say the names. Four, from round where they stand: four hundred paces.",
    offer: [
      "Those by the road, that Dorcas wants gone: they'll have tags on. The pest-houses down the wood hang a bit of lead round every neck they take in, the name scratched in, so whoever buries them knows what to say.",
      "Nobody buried these. So nobody's said them. Bring me the tags off the ground round where they stand; the string wears through, walking. Four will do. I'll say them tonight, after the Fs.",
    ],
    accept: "I'll fetch the tags.",
    acceptLine: "South-east, four hundred paces, where the wool carts watered. Look low. Lead goes dull in the grass, but it doesn't rot. Nothing about them rots, which is half the trouble.",
    decline: 'Not that.',
    declineLine: "No. Well. They'll keep. They have so far.",
    journal: [
      "Wymond Ebb, Thornwick's hedge-priest, wants the lead name-tags off the plague stragglers stood by the road south-east of the village. Bring back four from the ground round where they stand.",
      "Go back to Wymond Ebb by the market cross in Thornwick.",
    ],
    progress: [
      "South-east, by the water. Lead tags. Four.",
    ],
    done: [
      "Garth. Molly Rede. One I can't read. And... Fitch. Hal Fitch. I buried Hal Fitch in March, under the north side of the hedge, and I've said him every night since.",
      "I'll have to say him differently now. Here. People pay me in eggs, mostly; you'll have coin, and I'll keep the eggs. And come back to me when I've thought.",
    ],
    after: [
      "I said Hal Fitch last night and listened after. I don't know what for. Quiet's quiet.",
    ],
    others: {
      dorcas: ["Wymond's sent you picking lead off them? He would. He'll say every name on them at my fire tonight, and I'll have to hear them."],
    },
  },

  the_warlocks_stones: {
    title: 'A Night Behind Me',
    giver: 'wymond',
    needs: 'names_in_lead',
    about: "Of a night, from the Warlocks' Stones three hundred paces south of Thornwick, Wymond Ebb hears his own list of the buried said back, in his order, a night behind him. Hal Fitch, whom he'd said, came up walking. Empty the Stones: every warlock in the ring, and the one who keeps it.",
    offer: [
      "I've thought. Listen tonight, when I'm done. South, past the hedge, you'll hear it: somebody at the Stones saying names. Mine. My list, in my order, a night behind me. Last night they got to Farrow.",
      "I say them to lay them. Somebody's saying them the other way, and Hal Fitch heard. Go and stop the mouths at the Stones. Every one, and whoever stands in the middle and keeps the time.",
    ],
    accept: "I'll stop their mouths.",
    acceptLine: "South, three hundred paces: the ring of standing stones with the flat one. Robes. They cast from a distance; go in close, and quick. I'd come, but I'd only bless them.",
    decline: 'Not yet.',
    declineLine: "No. I'll say mine quieter, then, and hope they can't hear.",
    journal: [
      "Hedge warlocks at the Warlocks' Stones, south of Thornwick, say Wymond Ebb's list of the buried back of a night, and the buried get up. Empty the Stones: every one, and the one who keeps them.",
      "Go back to Wymond Ebb by the market cross in Thornwick.",
    ],
    progress: [
      "South. The Stones. Every mouth, and the one in the middle.",
    ],
    done: [
      "Nobody left at the Stones? ...Had they written it down? No. They'd only listened. Every night, in the dark, hoods up, getting it by heart off an old man by a cross. I've never had such attention.",
      "Take this. It was a staff of office, in the house that had a roof. I cut the top off so it'd fit any hand. It'll fit yours.",
    ],
    after: [
      "I said the whole list last night, and nothing said it after me. I got past the Gs. There are a great many Gs.",
    ],
    others: {
      dorcas: ["He's sent you to the Stones? Good. He's been saying the names in a whisper all week, like a man with a secret. I can't hear myself think."],
    },
  },

  nothing_for_the_pot: {
    title: 'Nothing for the Pot',
    giver: 'dorcas',
    needs: 'up_from_the_gallowswood',
    about: "Sib Kestrel sends a brace of birds up to the Hare and Harrow every week from Kestrel Hide, north-east of Thornwick. Nine days, nothing. Ask her why. Dorcas thinks Featherfall's harpies, east of the village, are having them on the way: put two down as you pass. Near half an hour. It's paid there.",
    offer: [
      "Sib Kestrel at the hide, north-east, sends me a brace a week by whoever's going. Partridge, plover, a duck if I'm lucky. It's what's on the board when it isn't mutton.",
      "Nine days, nothing. Not a feather. She's never missed. Go and ask her. And look at Featherfall as you pass, east of us: if the harpies are having my birds on the way, put two down and see what's in their nests.",
    ],
    accept: "I'll ask after your birds.",
    acceptLine: "North-east, past Featherfall, then off the road over the down to a hide by a great set of ribs. Near half an hour. If she shushes you, it's not rudeness. It's the trade.",
    decline: 'Not now.',
    declineLine: "Mutton, then. Again. Nobody's surprised.",
    journal: [
      "Dorcas Pym thinks the harpies of Featherfall Roost, east of Thornwick, are taking the birds Sib Kestrel sends her. Put down two.",
      "Go on north-east to Kestrel Hide and ask Sib Kestrel, the fowler, why no birds have come up to the Hare and Harrow in nine days.",
    ],
    progress: [
      "North-east. Featherfall first. Then the hide by the ribs.",
    ],
    done: [
      "Her birds? There's none. Shh. ...Look up. Nine days and nothing over, not a lark. It's not the harpies; they're as hungry as I am. Something south of the hide is whistling them down.",
      "Here; Dorcas would pay you, so I will, and she can owe me. Now keep still. Hear it? That whistle. That's not a bird.",
    ],
    after: [
      "None anywhere? Then it's mutton till spring. I've told the board. The board took it badly.",
    ],
    others: {
      sib: [
        "Her birds? There's none. Shh. ...Look up. Nine days and nothing over, not a lark. It's not the harpies; they're as hungry as I am. Something south of the hide is whistling them down.",
        "Here; Dorcas would pay you, so I will, and she can owe me. Now keep still. Hear it? That whistle. That's not a bird.",
      ],
      osric: ["Sib's birds? Plover, mostly. I'd not say no to plover. Featherfall's on your way; go round it wide, or straight through. Not halfway."],
    },
  },

  old_toll: {
    title: 'Thursdays',
    giver: 'dorcas',
    needs: ['black_ram', 'the_warlocks_stones'],
    about: "Wat Arden, who keeps the toll on the Gallows Road south-east of Thornwick, has eaten at the Hare and Harrow every Thursday of Dorcas Pym's keeping, and missed five. She's kept his pie back each time. Take it down. A werebat and a harpy roost on the forked poles past halfway: put one of the two down. Twenty minutes.",
    offer: [
      "There's a toll on the road halfway to the Cross. A bar, a hut and Wat Arden, who's kept it longer than I've kept this house. He's eaten here every Thursday of it. Pie, and the end of the bread.",
      "He's missed five Thursdays. I've kept the pie back each time, like a fool. It's Thursday. Take it down to him. Past halfway there's forked poles where they hung crows. Something hangs there now the size of a man, and a thing with a woman's face beside it.",
    ],
    accept: "I'll take the pie down.",
    acceptLine: "Straight down the road, south-east, twenty minutes. You can't miss a toll; that's what they're for. And whatever you find, tell me plain. I've had enough of people being kind.",
    decline: 'Not that far.',
    declineLine: "No. I'll keep it back, then. One more Thursday.",
    journal: [
      "A werebat and a harpy roost on the forked poles beside the Gallows Road, past halfway from Thornwick to the Old Toll. Put one of the two down.",
      "Go on to the Old Toll with Dorcas Pym's pie for Wat Arden, who has missed five Thursdays at the Hare and Harrow.",
    ],
    progress: [
      "Down the road. The poles, then the toll. Don't eat the pie.",
    ],
    done: [
      "Dorcas's pie. ...He's dead. Five weeks. I came up from the Cross when word stopped coming, and found the house like that. He's the near grave, by the well.",
      "Leave it on the post. I'll eat it. He'd want it eaten, not kept back. And here: it's out of his box. He'd have paid you himself. He paid for everything, twice if you let him.",
    ],
    after: [
      "Five weeks. And me keeping a pie back like a lamp in a window. ...I'll make one Thursday anyway. Wymond can say the words over it.",
    ],
    others: {
      ann: [
        "Dorcas's pie. ...He's dead. Five weeks. I came up from the Cross when word stopped coming, and found the house like that. He's the near grave, by the well.",
        "Leave it on the post. I'll eat it. He'd want it eaten, not kept back. And here: it's out of his box. He'd have paid you himself. He paid for everything, twice if you let him.",
      ],
      wymond: ["Wat Arden? I've his name by heart already, in case. He's in the As. It's a short walk from there to wherever he's gone."],
    },
  },

  // ================================================================ the Old Toll (Ann Arden)
  what_waits_at_the_bar: {
    title: 'Waiting to Be Let Through',
    giver: 'ann',
    about: "Every dusk things stand on the rise a hundred and eighty paces north of the Old Toll, facing south down at its broken bar, the way carts stood to pay: the possessed, and a man-high doll among them, sometimes more. Ann Arden would like four of them put down.",
    offer: [
      "Look up at the rise, north. No, at dusk you'd see them. They stand up there facing south, down at the bar, like carts in a line. Waiting to be let through. Every dusk since I came.",
      "Some are folk. One at least is... a doll. Man-high, painted. I've watched them from the well. Four of them down and I'd lower the bar again. It's the one thing here I know how to do.",
    ],
    accept: "I'll clear your rise.",
    acceptLine: "North, up the rise, a hundred and eighty paces. The dolls are quicker than they look. The folk aren't, but they don't stop.",
    decline: 'Not now.',
    declineLine: "Then I'll stand at the well again tonight and watch them wait.",
    journal: [
      "At dusk the possessed, and a man-high doll or more among them, stand on the rise north of the Old Toll facing south, down at its broken bar. Put down four.",
      "Go back to Ann Arden by the bar of the Old Toll.",
    ],
    progress: [
      "North, up the rise. Four. The dolls are quick.",
    ],
    done: [
      "A doll. Painted face, jointed like a puppet. ...It'll have come up from the south the night it burned, and he let it through. He let anything through that paid.",
      "Here. It's out of the box, the little that was left in it. Father would say it's the toll's, not mine to give. It's mine now. So's the toll.",
    ],
    after: [
      "I lowered the bar last night. In the morning I lifted it again, for nobody. I've caught that off him.",
    ],
  },

  corpses_nothing: {
    title: 'Corpses, Nothing',
    giver: 'ann',
    about: "The Old Toll's rate-board hung by the bar: what a cart paid, a horse, a man on foot. It's gone up the rise a hundred and eighty paces north, in pieces, where things stand at dusk. Ann Arden wants it back on its post. Bring her four pieces.",
    offer: [
      "Father's rate-board hung on the post by the bar. A cart, two pence. A horse, a penny. A man on foot, a farthing, or a song if he'd one. He painted it fresh every spring.",
      "It's gone. Up on the rise, I think, in pieces, where they stand. I'd like it back on the post. If I'm keeping a toll I'll keep it right. Four pieces will make it.",
    ],
    accept: "I'll find the board.",
    acceptLine: "North, up the rise, in the grass round where they stand. Painted white, with black letters. His letters lean, like he did.",
    decline: 'Not now.',
    declineLine: "No. I know the rates anyway. I'll shout them.",
    journal: [
      "The Old Toll's rate-board lies in pieces on the rise north of the toll, where things stand at dusk. Bring Ann Arden four of them.",
      "Go back to Ann Arden by the bar of the Old Toll.",
    ],
    progress: [
      "North, the rise. White, black letters. Four pieces.",
    ],
    done: [
      "Cart, two pence. Horse, a penny. Man on foot... And this, at the bottom, in fresher paint. 'Corpses, nothing.' His hand. He added that this spring.",
      "There must have been a deal of them going down to the Cross, for him to want a rate. ...I'll put it back as it was. All of it. Here; you've earned more than the farthing home.",
    ],
    after: [
      "The board's up. I read the bottom line every morning. Nobody's come through to pay it.",
    ],
  },

  the_toll_roost: {
    title: 'His Way Home',
    giver: 'ann',
    about: "Dusk bats roost in the Toll Roost, two hundred and fifty paces south-west of the Old Toll, under a great one, the Gallows-Wing. Every dusk they cross the road toward Thornwick: the road Wat Arden walked home by every Thursday after dark. Empty the roost, and the Gallows-Wing.",
    offer: [
      "There's a roost south-west, the dead trees off the road. Bats, more than I can see the end of, and one as big as the bar. Every dusk they go over the road toward Thornwick, low, and come back before light.",
      "Father walked that road home from the Hare every Thursday, after dark. Every Thursday of my life. This spring they started crossing it. I'd like that roost empty: the bats, and the big one over them.",
    ],
    accept: "I'll empty the roost.",
    acceptLine: "South-west, two hundred and fifty paces, off the road. Go by day, if you can; they hang till dusk. The big one doesn't hang. It watches.",
    decline: 'Not yet.',
    declineLine: "No. ...No. I'll not walk that way after dark, then. Nobody will.",
    journal: [
      "Dusk bats roost in the Toll Roost, south-west of the Old Toll, and cross the Gallows Road every dusk, the road Wat Arden walked home by. Empty the roost, and the Gallows-Wing over it.",
      "Go back to Ann Arden by the bar of the Old Toll.",
    ],
    progress: [
      "South-west. The dead trees. The bats, and the big one.",
    ],
    done: [
      "The big one too? ...I'll not ask what was under the trees. I can see you'd tell me if I did.",
      "Here. His coat. It was on its peg the morning I came; he'd gone out without it. Thursday was warm. It's too big for me. It'll be right on you.",
    ],
    after: [
      "I walked up the road to the poles and back last night, after dark, his way. Nothing came over. I didn't stop shaking till the bar.",
    ],
  },

  not_coming_back: {
    title: 'The Pan on the Hook',
    giver: 'ann',
    needs: 'the_toll_roost',
    about: "Ann Arden kept house for Master Crowle at Hangman's Cross from a girl, and came up to the toll when the word stopped. She's staying. Tell him so; and if he asks whether the road's safe for her, put down one of the two tall night things in the trees past halfway. A quarter of an hour south-east.",
    offer: [
      "I kept house at the Cross for Master Crowle from fifteen. He's the hangman. Was. He'll have been cooking for himself five weeks, and he can't.",
      "I'm not going back. Go down and tell him; he'll take it better from a stranger. He'll ask if the road's safe for me to come back by. Tell him it isn't: there's two tall things in the trees past halfway. Put one down, and it'll only be half a lie.",
    ],
    accept: "I'll tell him.",
    acceptLine: "Down the road, south-east, a quarter of an hour. The Cross is where it meets the lanes: the gallows on its mound, his hut by it. He'll be out by the stocks. He likes to see who's coming.",
    decline: 'Not yet.',
    declineLine: "No. He'll guess. He's good at guessing what people are for.",
    journal: [
      "Two tall night things stand in the trees off the Gallows Road past halfway from the Old Toll to Hangman's Cross. Put one down.",
      "Go on to Hangman's Cross and tell Master Crowle, the hangman, that Ann Arden is staying to keep her father's toll.",
    ],
    progress: [
      "Down the road. One of the tall ones in the trees. Then the Cross, and Crowle.",
    ],
    done: [
      "Not coming back. ...No. She wouldn't be. She'll have left the pan on the hook. It's been on the hook five weeks. I've been looking at it.",
      "Here; you walked it. Stand still a moment. ...Eleven stone, near enough. Old habit. I don't do it now. Not on purpose.",
    ],
    after: [
      "He took it? ...He said 'the pan', didn't he. I'd have put money on the pan.",
    ],
    others: {
      crowle: [
        "Not coming back. ...No. She wouldn't be. She'll have left the pan on the hook. It's been on the hook five weeks. I've been looking at it.",
        "Here; you walked it. Stand still a moment. ...Eleven stone, near enough. Old habit. I don't do it now. Not on purpose.",
      ],
    },
  },

  // ================================================================ Hangman's Cross (Master Crowle)
  salt_for_the_hanged: {
    title: 'Salt for the Hanged',
    giver: 'crowle',
    about: "Every spring the hedge-priest at Thornwick sends salt down for the hanged, and Master Crowle has never put a pinch of it down. This year he'd like it done: at the lime-pit a hundred and sixty paces north-west, where the big man stands, and on the Burning Ground past it.",
    offer: [
      "There's a priest up the road at Thornwick. Ebb. Every spring the carter brings me a bag of salt from him, for the hanged, and a note: 'Put it down where they lie.' I've a shelf of it in the hut. Never a pinch down. It's not my trade.",
      "The ones I hanged went in the lime-pit north-west, under the old beam. What the plague left in its year went on the Burning Ground past it. I'm too old to walk among what stands there now. You put it down. You needn't say anything.",
    ],
    accept: "I'll put the salt down.",
    acceptLine: "Here: the newest bag. The pit first, a hundred and sixty paces north-west; then the Burning Ground past it, the black ground with the fires. A pinch in the middle of each. If anything watches you do it, don't wait for it to finish.",
    decline: "That's not for me.",
    declineLine: "No. It's never been for me either. Back on the shelf, then.",
    journal: [
      "Master Crowle, the hangman at Hangman's Cross, keeps a shelf of the salt Thornwick's priest sends for the hanged, and has never put any down. Put it down at the lime-pit north-west of the Cross, and on the Burning Ground past it.",
      "Go back to Master Crowle by the stocks at Hangman's Cross.",
    ],
    progress: [
      "The pit, then the Burning Ground. A pinch. Don't stop to watch.",
    ],
    done: [
      "Both. I put a pinch on my own step while you were gone. Don't tell the priest. He'll think it worked.",
      "Here. Hangman's pay was the clothes off the man, once. I've money now instead, and fewer clothes. Take it.",
    ],
    after: [
      "I've written to Ebb. I said the salt was down, and thank you, and that the step doesn't seem any different.",
    ],
  },

  the_big_man: {
    title: 'No Rope for Him',
    giver: 'crowle',
    about: "Four stand at the lime-pit a hundred and sixty paces north-west of Hangman's Cross, where Master Crowle's hanged were put: three plague knights, and one in plate the size of a cart that no rope would take. Crowle wants him gone. Put three of the four down.",
    offer: [
      "You'll have seen him at the pit. The big one, in plate. You'd want a rope like a ship's cable and a drop of no length at all, and he'd still pull the beam down.",
      "I'd like him gone from there. He stands at the edge and looks in. Three of the four down, and he'll come to you himself; that kind does, in the end.",
    ],
    accept: 'Three of the four.',
    acceptLine: "North-west, a hundred and sixty paces. The knights stand in front of him. He's slow. Don't be where he's going to be.",
    decline: 'Not him.',
    declineLine: "No. He's waited this long. So have I.",
    journal: [
      "Three plague knights and a giant in plate stand at the lime-pit north-west of Hangman's Cross, where Master Crowle's hanged were put. Put down three of the four.",
      "Go back to Master Crowle by the stocks at Hangman's Cross.",
    ],
    progress: [
      "North-west. The pit. Three. Mind the big one's reach.",
    ],
    done: [
      "Three. ...You looked at the big one's face; I can see it on you. I put him in that pit the plague year, with lime over. A drover, up from the south with his sheep and something else. He'd killed nobody. He'd only carried it.",
      "They wanted it done at the Cross, so it was seen. I did it. That's the trade. Here; it's yours.",
    ],
    after: [
      "I walked to the pit's edge this morning. It's a hole with lime in. I don't know what I thought it was.",
    ],
  },

  the_burning_ground: {
    title: 'An Armful a Night',
    giver: 'crowle',
    about: "The Burning Ground, three hundred paces north-west of Hangman's Cross, where the plague dead were burned, has its fires lit again every night, and Master Crowle's woodpile goes down an armful a night. He wants the Ground emptied: the sick, the nurses, and the Pestilent they stand round.",
    offer: [
      "The Burning Ground. I lit those fires, the plague year, for the dead nobody would touch. Nobody's lit them since. They're lit. Every night.",
      "And my woodpile goes down an armful a night. Somebody's carrying it there. I'd like the Ground empty: the sick, the nurses, and the great one in the middle that the rest stand round.",
    ],
    accept: "I'll empty the Burning Ground.",
    acceptLine: "North-west, past the pit, three hundred paces. You'll see the fires. The sick are slow and many; the nurses throw the sickness at you; the great one's bigger than him at the pit. Burn it, if you've fire. It's what the place is for.",
    decline: 'Not yet.',
    declineLine: "No. I'll stack the wood closer to the door.",
    journal: [
      "The plague-taken on the Burning Ground, north-west of Hangman's Cross, keep its fires lit with wood off Master Crowle's pile. Empty it, and put down the Pestilent that keeps them.",
      "Go back to Master Crowle by the stocks at Hangman's Cross.",
    ],
    progress: [
      "North-west, past the pit. The fires, and the great one.",
    ],
    done: [
      "Out, the fires? ...There was bark in my sheets this morning, and lime on my boots. Thirty-one years I didn't sleep. Now I sleep, and carry wood to the Ground in it.",
      "Here. The last man I hanged carried it in his coat to the end; his grandfather's, he said. It's sat on my shelf nine years. Take it. And if you meet me on the lane at night with an armful, don't wake me. Turn me round.",
    ],
    after: [
      "No smoke last night. I tied my ankle to the bedpost, to be sure. It held.",
    ],
  },

  a_light_over_the_cross: {
    title: 'A Light Over the Cross',
    giver: 'crowle',
    needs: 'the_big_man',
    about: "Tansy Wight, at Corpse-Candle Camp south-west of the Cross, reads the lights that go before a burying. Every spring Master Crowle sends to ask if there's one over the Cross yet. A plague giant and his knights stand where the lane bends: put down two. A quarter of an hour. It's paid there.",
    offer: [
      "Every spring I send up to Tansy Wight at the camp south-west, and ask if there's a light over the Cross yet. She reads them: a light that goes from a house to where it'll be buried. Mine'd go about four yards.",
      "Ann carried it. You carry it. There's a giant at the bend of the lane with two knights, and they'll walk after you into her camp if you let them. Put two down; she's enough to read without them.",
    ],
    accept: "I'll ask her.",
    acceptLine: "South-west down the lane, a quarter of an hour. The giant's off to the right where it bends. Her camp's in the trees after, with the stones at its back. Ask her plain. She answers plain.",
    decline: 'Not now.',
    declineLine: "No hurry. That's rather the point of asking.",
    journal: [
      "A plague giant and his knights stand off the lane south-west of Hangman's Cross, where it bends toward Corpse-Candle Camp. Put down two of the three.",
      "Go on to Corpse-Candle Camp and ask Tansy Wight, for Master Crowle, if there's a light over the Cross yet.",
    ],
    progress: [
      "South-west. The giant at the bend. Then Tansy.",
    ],
    done: [
      "Over the Cross? No. Not this spring. Tell him not yet. He'll be put out; he likes things settled.",
      "Here. He sends a coin with the asking; I send it back with whoever carried it. ...And there's nothing over you either. I looked as you came up the lane.",
    ],
    after: [
      "Not yet, she said. ...Well. I'd the pan clean, in case.",
    ],
    others: {
      tansy: [
        "Over the Cross? No. Not this spring. Tell him not yet. He'll be put out; he likes things settled.",
        "Here. He sends a coin with the asking; I send it back with whoever carried it. ...And there's nothing over you either. I looked as you came up the lane.",
      ],
    },
  },

  crowles_jar: {
    title: "Crowle's Jar",
    giver: 'crowle',
    needs: 'the_burning_ground',
    about: "Master Crowle has a jar filled by Mother Grawl, at her hut north-east of the Cross, every month, and won't say what's in it. It's gone a month and a half. The possessed stand under the old gibbet where the lane turns, and follow whoever goes by: put three down. Half an hour. It's paid there.",
    offer: [
      "One more. There's a jar on my shelf, by the salt. Empty. Mother Grawl, at her hut north-east, fills it every month. It's gone a month and a half.",
      "Don't ask what's in it. Take the jar, say it wants filling, and she'll know. You'll go by the old gibbet where the lane turns. There's folk under it again, the way there were on a hanging day. They follow anyone up the lane. Put three down.",
    ],
    accept: "I'll take the jar.",
    acceptLine: "North-east up the lane, half an hour, past the gibbet. Her hut's the crooked one with skulls on poles. They're not meant for you. Mostly.",
    decline: 'Not now.',
    declineLine: "No. It'll keep empty. That's the trouble with it.",
    journal: [
      "The possessed stand under the old gibbet where the lane north-east of Hangman's Cross turns, and follow whoever goes by. Put down three.",
      "Go on north-east to Mother Grawl's hut with Master Crowle's empty jar, and tell her it wants filling.",
    ],
    progress: [
      "North-east, past the gibbet. Three. Then Mother Grawl, and the jar.",
    ],
    done: [
      "Crowle's jar. ...He's sent a stranger the length of the wood with it. Ann's gone, then. She'd not have let him.",
      "It's for his hands. Since the last one he hanged, they shake, and he'll not have anyone see. I'll fill it, and you'll not tell him I said. Here; he pays me too much, so I pay you.",
    ],
    after: [
      "She filled it. ...She'll have told you what for. She tells everybody, and they all tell me she didn't.",
    ],
    others: {
      grawl: [
        "Crowle's jar. ...He's sent a stranger the length of the wood with it. Ann's gone, then. She'd not have let him.",
        "It's for his hands. Since the last one he hanged, they shake, and he'll not have anyone see. I'll fill it, and you'll not tell him I said. Here; he pays me too much, so I pay you.",
      ],
    },
  },

  // ================================================================ Corpse-Candle Camp (Tansy Wight; Gil Mosse)
  the_candle_road: {
    title: 'The Candle Road',
    giver: 'tansy',
    about: "A corpse-candle goes from where someone is to where they'll be laid. Every night this week Tansy Wight has seen one go the same road: from the Lazar Field to Nightfall Ruin, two hundred and fifty paces north-west. Walk it to the ruin before the light does, and put down three there.",
    offer: [
      "A corpse-candle goes from where somebody is to where they'll be laid. It walks the road the bearers will take. I read them. That's the camp's name, and mine, near enough.",
      "Every night this week there's been one from the Lazar Field to Nightfall Ruin, north-west. The same road. Somebody's to be carried it. Walk it before the light does, to the ruin, and put down three of what's there. A road's only walked that way once.",
    ],
    accept: "I'll walk it first.",
    acceptLine: "North-west, two hundred and fifty paces. Broken walls, and things in them that walk tall and pale. Go to the ruin and nowhere else; it's the bearers' road, and you'll want to keep to it.",
    decline: 'Not today.',
    declineLine: "No. It'll go again tonight. It goes every night.",
    journal: [
      "A corpse-candle goes every night from the Lazar Field to Nightfall Ruin, north-west of Corpse-Candle Camp. Walk that road to the ruin before it does.",
      "Things stand in Nightfall Ruin. Put down three of them.",
      "Go back to Tansy Wight at Corpse-Candle Camp.",
    ],
    progress: [
      "North-west, to the ruin, ahead of the light. Three.",
    ],
    done: [
      "You walked it, to the ruin. ...Then there'll be no light on it tonight. You walked it for whoever it was going to be.",
      "Here. Somebody'll live who wasn't going to. They don't know it. Nor do I, who. That's how it mostly is.",
    ],
    after: [
      "No candle on that road since. There's one on another road, over by the wood. Not your business. Not yet.",
    ],
    others: {
      gil: ["She's sent you up the candle road? I'll not walk it. I'm superstitious. She says that's the wrong word for it."],
    },
  },

  clappers: {
    title: 'Clappers',
    giver: 'gil',
    about: "The sick of the Lazar Field, two hundred and fifty paces south-east of Corpse-Candle Camp, were given clappers to warn folk off the path. They've taken them off, and Gil Mosse, who hunts by ear, can't hear them coming. Bring back five from round the field.",
    offer: [
      "I hunt by ear. Everything that walks says so, if you listen. The sick at the Lazar Field, south-east, had clappers, wooden, on a cord, so you'd hear them and get off the path. They clacked all night. I slept to it.",
      "A month back it stopped. They've dropped them round the field, in the grass. Now they walk quiet, and so do I, and one of us is going to be surprised. Fetch me five of the clappers.",
    ],
    accept: "I'll fetch the clappers.",
    acceptLine: "South-east, two hundred and fifty paces, round the outside of the field: they dropped them going in and out. Keep to the edge. Don't let one breathe on you.",
    decline: 'Not now.',
    declineLine: "I'll keep my back to the stones, then.",
    journal: [
      "The sick of the Lazar Field, south-east of Corpse-Candle Camp, have left off their lepers' clappers, and Gil Mosse can't hear them coming. Bring back five from round the field.",
      "Go back to Gil Mosse at Corpse-Candle Camp.",
    ],
    progress: [
      "South-east. The Lazar Field. Five clappers, round the edge.",
    ],
    done: [
      "Five. ...The cord's not broken on any of them. Untied. They took them off careful, the way you'd muffle your own feet before you went after something.",
      "I'll wear one when I go out. They'll hear it and take me for one of theirs. Here. That's for the clappers. The other thing I've learned today I'll not thank you for.",
    ],
    after: [
      "I wore one last night, out to the trees and back. Clack, clack. Nothing came. I felt a fool and a sick man at once.",
    ],
    others: {
      tansy: ["Gil wants the clappers back? He doesn't sleep without the noise. He'll tell you it's the hunting."],
    },
  },

  nightfall_ruin: {
    title: 'Three Roads',
    giver: 'tansy',
    about: "Some nights Tansy Wight sees three lights, on three roads, all to Nightfall Ruin. It isn't that somebody's to be carried there: the ruin's calling for them. She wants it emptied: the dream-eaters, the pale ones, and the long one that keeps them. Two hundred and fifty paces north-west.",
    offer: [
      "Some nights there's three. Three candles, three roads, all to Nightfall Ruin, north-west. It isn't that somebody's to be carried there. It's that the ruin's calling for them.",
      "Empty it. The tall pale ones, the ones that eat dreams, the burning one, and the long one at the back that you'll know when you see it. It's longer than it ought to be.",
    ],
    accept: "I'll empty the ruin.",
    acceptLine: "North-west, two hundred and fifty paces, along the bearers' road. And if one of the lights is over you when you come out, I'll tell you. I'll not lie.",
    decline: 'Not yet.',
    declineLine: "No. I'll watch the roads again tonight.",
    journal: [
      "Some nights three corpse-candles go to Nightfall Ruin, on three roads. Empty the ruin, north-west of Corpse-Candle Camp, and put down the Long Nightmare that keeps it.",
      "Go back to Tansy Wight at Corpse-Candle Camp.",
    ],
    progress: [
      "North-west. The ruin, and the long one at the back.",
    ],
    done: [
      "No light over you; I looked as you came up the lane. ...Nor any to the ruin. The roads are dark.",
      "Here. It came to me from the woman who taught me the lights. A reading, of a sort. 'Read it when you've a light over you,' she said. I've never needed it. You might.",
    ],
    after: [
      "Dark roads three nights now. I'd forgotten what the wood looks like with nothing walking in it.",
    ],
    others: {
      gil: ["The ruin? I'll come as far as the edge. No. I won't. I'll be glad when you're back."],
    },
  },

  the_players_bill: {
    title: 'Every Night Till Spring',
    giver: 'tansy',
    needs: ['the_candle_road', 'nightfall_ruin'],
    about: "Three winters back the players by the Twisted Grove gave Tansy Wight a bill for their play, and she never went. She wants it taken back to Master Fabian Larke at their wagon, with word that she saw them go in. Go by the Lazar Field's edge, where the sick come out after anyone passing: put two down. A quarter of an hour.",
    offer: [
      "Three winters ago a man came up from the grove in a coat with a fur collar and gave me this. A playbill. 'The Winter Company. Every night till spring.' I said I'd come. I never did.",
      "Take it back to him: Master Fabian Larke, by the wagon at the grove, south-west. Tell him I saw them go in. He'll know what I mean, and he'll not want to. Go by the Lazar Field's edge; the sick come out after anyone passing, and Gil would sooner it was you than him.",
    ],
    accept: "I'll take the bill.",
    acceptLine: "By the Lazar Field's edge, then south-west to the grove: a quarter of an hour. Put two down and keep walking. Then the wagon. You'll hear him before you see it.",
    decline: 'Not now.',
    declineLine: "No. It's kept three winters. It's good paper.",
    journal: [
      "The sick of the Lazar Field, south-east of Corpse-Candle Camp, come out after anyone passing its edge. Put down two.",
      "Go on south-west to the Players' Wagon by the Twisted Grove and give Master Fabian Larke back his playbill, from Tansy Wight, who saw his company go in.",
    ],
    progress: [
      "The Lazar Field's edge. Two. Then south-west to the wagon, and the bill.",
    ],
    done: [
      "My bill. 'Every night till spring.' ...She saw them go in. The lights. Yes. I knew. I've stood here three winters knowing, and saying 'tomorrow' to Peg.",
      "Thank you. That's the first honest notice the company ever had. Here, off the wagon's takings, which are mine now. All of them. It's not a fortune.",
    ],
    after: [
      "He took it? It'll be up on the wagon by now. He likes his name in print.",
    ],
    others: {
      fabian: [
        "My bill. 'Every night till spring.' ...She saw them go in. The lights. Yes. I knew. I've stood here three winters knowing, and saying 'tomorrow' to Peg.",
        "Thank you. That's the first honest notice the company ever had. Here, off the wagon's takings, which are mine now. All of them. It's not a fortune.",
      ],
      peg: ["That's our bill. I wrote those out by hand, the week we came. ...He's going to put it up. Let him."],
    },
  },

  // ================================================================ the Players' Wagon (Master Fabian Larke; Peg Hollin)
  the_audience: {
    title: 'The Audience',
    giver: 'fabian',
    about: "Every dusk an audience gathers in the Twisted Grove, ninety paces south of the Players' Wagon, facing the door under the stone table: tall things of the night, and painted figures from the company's own stock among them. Master Fabian Larke would like the house thinned. Put three down.",
    offer: [
      "At dusk they come and sit in the grove, facing the door under the table. Tall, dark, still; and the painted ones from our own stock among them, that we stood in the wings to make a crowd. An audience, in for the night.",
      "Before anyone goes down to find my company, I'd like the stalls thinned. Three of them. A short walk; I'll watch from the steps.",
    ],
    accept: "I'll thin the stalls.",
    acceptLine: "South, ninety paces: the grove with the stone table. They stand when you come at them; they're quick for an audience. The painted ones are ours. Break them; they're only paint.",
    decline: 'Not now.',
    declineLine: "No. They're patient. Audiences are, at the start.",
    journal: [
      "Night demons and a haunted mannequin or more sit in the Twisted Grove at dusk, facing the Hollow Playhouse's door, south of the Players' Wagon. Put down three.",
      "Go back to Master Fabian Larke at the Players' Wagon.",
    ],
    progress: [
      "South. The grove. Three of the audience.",
    ],
    done: [
      "Three. ...Peg says they kept their faces to the door going down. Well. It's been playing three winters. Somebody ought to go and see it.",
      "Here, from the takings, such as they are. You've seen the door now. I've stood at it every night and my feet won't go down. Yours will.",
    ],
    after: [
      "Fewer in the grove last night. I bowed to them from the steps. Nobody clapped. Nobody ever does, from the stalls.",
    ],
    others: {
      peg: ["He calls them the audience. They're not. An audience pays."],
    },
  },

  poxhollow: {
    title: 'For Nothing',
    giver: 'peg',
    about: "On the way in, three winters back, the Winter Company played Poxhollow, the pest-house two hundred and fifty paces north-west of their wagon, for nothing. Fabian Larke came away with a cough and missed the opening. Peg Hollin wants the place emptied: the sick, and the great one that keeps them.",
    offer: [
      "On the way in, three winters back, Fabian had the company play Poxhollow. The pest-house, north-west. For nothing. 'For the sick,' he said. I said the sick can't clap. He said that's why it's charity.",
      "He came away with a cough and lay in the wagon a month, and they opened without him, and they're all down there and he's up here. He wishes every night he'd gone. I've never once wished it. Empty that place, and whatever keeps it.",
    ],
    accept: "I'll empty Poxhollow.",
    acceptLine: "North-west, two hundred and fifty paces. You'll smell it. Knights in iron, nurses who throw what they've got at you, and a big one. Don't take anything off them.",
    decline: 'Not now.',
    declineLine: "No. It's done its harm. It can wait to be paid for.",
    journal: [
      "Poxhollow, the pest-house north-west of the Players' Wagon, is where the Winter Company played for nothing and Fabian Larke caught his cough. Empty it, and put down its master.",
      "Go back to Peg Hollin at the Players' Wagon.",
    ],
    progress: [
      "North-west. Poxhollow, and the big one.",
    ],
    done: [
      "Done? Then I can say it. I've wanted to thank that place for three winters, and I couldn't, for what it'd mean. So I'll thank you.",
      "Here: what I took at the door the last night, before I gave up selling. Nobody's come back to ask for it.",
    ],
    after: [
      "He coughed this morning and I didn't hate the sound. That's new.",
    ],
    others: {
      fabian: ["Peg's sent you to Poxhollow? ...She blames it. I bless it. She knows, and we don't say."],
    },
  },

  the_winter_company: {
    title: 'The Winter Company',
    giver: 'fabian',
    needs: 'the_audience',
    hint: DELVE_HINT,
    about: "Three winters back the Winter Company went down under the Twisted Grove to build a house and play till spring, and never came up. Master Fabian Larke, who stayed with the wagon, would have them found. Go down into the Hollow Playhouse, with a company, and put down its Seamstress.",
    offer: [
      "The company. Eleven players, a seamstress, two hands, and a woman with a box who paid for everything. They went down under the grove three winters ago to build a house and play in it till spring. I was coughing in the wagon. I'm still in the wagon.",
      "Go down. Find them. The Seamstress first: she did our costumes and never sat down, and nothing went on the stage she hadn't measured. If she's as I think she is, she'll be in the Wardrobe still, at work. Stop her.",
    ],
    accept: "I'll find your company.",
    acceptLine: "The door under the stone table, south, past where the audience sits. It'll want more than one of you. Mind the one with the needles. She measured me once, and I felt it for a week.",
    decline: 'Not yet.',
    declineLine: "No. I've waited three winters. I'm good at it now.",
    journal: [
      "The Winter Company went down under the Twisted Grove three winters ago and never came up. Go into the Hollow Playhouse, through the door by the stone table, with a company.",
      "The company's Seamstress is in the Wardrobe, off the side of the House. Kill her.",
      "Go back to Master Fabian Larke at the Players' Wagon.",
    ],
    progress: [
      "The door under the table. The Wardrobe. Mind the needles.",
    ],
    done: [
      "Still in rehearsal. Three winters. And the audience in rows... no. Stop. I'll hear the rest when I've something in my hand.",
      "She left this on my hook the night they went down. I took it for a kindness. I think now it was a measuring. Take it; I'll not have it on the wagon.",
    ],
    after: [
      "I've put Tansy's bill in the trunk after all. Peg says it was the right thing. She'd know; she sold them.",
    ],
    others: {
      peg: ["The Seamstress? She made me a coat once. It fitted. Nothing she made ever didn't. That's what's wrong with her."],
    },
  },

  last_night_of_the_run: {
    title: 'Last Night of the Run',
    giver: 'fabian',
    needs: 'the_winter_company',
    hint: DELVE_HINT,
    about: "With the Seamstress dead, the Leading Man takes the Hollow Playhouse's stage, and over the back of the house the Dollmaker keeps her attic: the woman with the box, who paid for everything. Master Fabian Larke wants the play seen to its end, and the house closed.",
    offer: [
      "I've been thinking who paid. Not me. I did the talking; I never had a coin. It was the woman with the box under her arm, who made the dolls we sold at the door. She paid for the house. She chose the grove.",
      "Our Leading Man's only what she puts on the stage, and he was mine once, and good. Go back, see the play out to the end, and then go up to wherever she keeps herself and close it. For good. No more nights.",
    ],
    accept: "I'll close the house.",
    acceptLine: "He'll be on, now the costumes are seen to. Stay where the light is; I never saw him out of it. And her box plays a tune. When it stops, the whole company stands like posts. I'd stand too.",
    decline: 'Not yet.',
    declineLine: "No. Another night, then. There's always another night. That was the trouble.",
    journal: [
      "With his costume seen to, the Leading Man takes the stage of the Hollow Playhouse. Kill him.",
      "The Dollmaker keeps the attic over the back of the house. Kill her, and the play is over.",
      "Go back to Master Fabian Larke at the Players' Wagon.",
    ],
    progress: [
      "The stage first. Then up, to the one with the box.",
      "Stay in his light. And when her tune stops, you stop.",
    ],
    done: [
      "Over. Truly over? No curtain call? ...Then I'll say it for them, since nobody else will: it was a good week, that first one. They could sing.",
      "This came out of one of their trunks the night they went down; I found it under the wagon's step. It's an ugly thing, and worth more than the wagon. Yours. Call it eleven players and the change.",
    ],
    after: [
      "A carter came up the lane and asked was there anything to see hereabouts. I said no, and it was true. I'm not sure I like it.",
    ],
    others: {
      peg: ["The Dollmaker? I sold her dolls at the door. They looked at you. I put them face down on the board, and they were face up by the interval."],
    },
  },

  the_closing_notice: {
    title: 'House Closed',
    giver: 'fabian',
    needs: 'last_night_of_the_run',
    about: "The Winter Company played the foot of Hangman's Cross on hanging days, twenty springs, and Master Crowle never once came round the beam to watch. Fabian Larke wants him told the company's closed. The company lost its last cart at Nightfall Ruin coming in, and the ruin's filling again: put two down there.",
    offer: [
      "We played the Cross on hanging days. Twenty springs. A crowd that's come to see a man die is in the mood for a tragedy. Crowle never once came round the beam to watch. He'd have heard every word.",
      "Go up and tell him the company's closed. He'll want it in the book; he's a tidy man. And Nightfall Ruin, off the lane by Tansy's: we lost our last cart there coming in, the scenery and the horse. Tansy says it's filling again. Put two down for the horse.",
    ],
    accept: "I'll tell him.",
    acceptLine: "Up the lane, north-east, past Tansy's: the better part of half an hour. Nightfall Ruin's off the lane above Tansy's. Crowle'll be by the stocks; we built our stage against them.",
    decline: 'Not now.',
    declineLine: "No. A house can be closed a while before anyone's told. Most are.",
    journal: [
      "Nightfall Ruin, off the lane by Corpse-Candle Camp, where the Winter Company lost its last cart, is filling again. Put down two there.",
      "Go on to Hangman's Cross and tell Master Crowle, from Master Fabian Larke, that the Winter Company has closed.",
    ],
    progress: [
      "Up the lane. Two at Nightfall Ruin. Then Crowle, by the stocks.",
    ],
    done: [
      "Closed. ...I heard them. Twenty springs, from behind the beam. Larke did a dying speech that went on longer than any I ever arranged, and they clapped him, with a man still turning on the rope.",
      "Here. I'll not owe a player anything; they never let you forget it.",
    ],
    after: [
      "You told him? ...He heard it all, then. Every speech. Best house I ever had, and he never paid.",
    ],
    others: {
      crowle: [
        "Closed. ...I heard them. Twenty springs, from behind the beam. Larke did a dying speech that went on longer than any I ever arranged, and they clapped him, with a man still turning on the rope.",
        "Here. I'll not owe a player anything; they never let you forget it.",
      ],
      peg: ["He's sending word to the hangman? We played his hanging days. I sold the tickets. I never once looked at the beam."],
    },
  },

  // ================================================================ Mother Grawl's Hut (Mother Grawl)
  henbane: {
    title: 'Henbane',
    giver: 'grawl',
    about: "Mother Grawl's henbane grows best on the rise round Grawl's Kennel, two hundred and seventy paces north-east of her hut, where her six dogs lie up that the wood gave back upright. She can't pick it with them there. Bring her five, roots and all, from round the outside.",
    offer: [
      "Henbane. For Crowle's jar, and others. It grows best north-east, on the rise where my dogs lie up. Grows best there because of what they leave on it. I can't get to it.",
      "Six dogs, I had. The wood took them one winter and gave them back walking on two legs. They know me. That's worse. Go and pull me five. Roots and all, dirt on. Don't stop to be looked at.",
    ],
    accept: "I'll pull your henbane.",
    acceptLine: "North-east, two hundred and seventy paces. Round the edge of where they lie; it's fattest there. Sticky leaves, a stink, a purple eye in the flower. Don't lick your fingers after.",
    decline: 'Not now.',
    declineLine: "No. Crowle's hands can shake a week. They've shaken longer.",
    journal: [
      "Mother Grawl's henbane grows round Grawl's Kennel, north-east of her hut, where the wolfkin lie up. Bring her five, roots and all.",
      "Go back to Mother Grawl at her hut.",
    ],
    progress: [
      "North-east. Round the Kennel. Five, roots and all.",
    ],
    done: [
      "Five. Fat, every one. ...Well. They've fed it well. I fed them well. It comes round.",
      "Here: Crowle's coin, passed on. Now. I've been thinking about my dogs while you were gone.",
    ],
    after: [
      "Crowle's jar is full and sent. I put in a little more than he asks for. He won't notice. His hands will.",
    ],
  },

  grawls_kennel: {
    title: "Grawl's Kennel",
    giver: 'grawl',
    needs: 'henbane',
    about: "Mother Grawl kept six dogs at the hut. One winter the wood took them and gave them back on two legs, and now they lie up two hundred and seventy paces north-east, at Grawl's Kennel, and sit at her gate at dusk. The biggest was hers from a pup. Empty the Kennel, and put him down.",
    offer: [
      "They kept the lane quiet, my dogs. Nothing came up from the road to the hut while they were by it. Now they're up on the rise, and they come down at dusk and sit at the gate and look at the door. I don't open it.",
      "Put them down, and the big one: that's Gnash. He was mine from a pup. He'll come when he's called. Don't call him.",
    ],
    accept: "I'll empty the Kennel.",
    acceptLine: "North-east, the rise. You've been round its edge; now go in. Gnash'll be the biggest, the size of a door. He'll come. Don't call him. Don't.",
    decline: 'Not yet.',
    declineLine: "No. They'll sit at the gate again tonight. They're good at sitting. I taught them.",
    journal: [
      "Mother Grawl's six dogs, which the wood gave back as wolfkin, lie up at Grawl's Kennel, north-east of her hut. Empty the Kennel, and put down the great one that was her Gnash.",
      "Go back to Mother Grawl at her hut.",
    ],
    progress: [
      "North-east. The Kennel, and Gnash.",
    ],
    done: [
      "...You called him. I said not to. And he came, and you had to. Well. That's what I'd have done.",
      "Here. My stick, that I walked them with. I'll not walk anything now. The lane'll be busy without them. Something will come up it. It's a lane.",
    ],
    after: [
      "Nothing at the gate last night. I left the door open a crack all the same, and sat up. Nothing came.",
    ],
  },

  under_the_eaves: {
    title: 'The Burnt Ring',
    giver: 'grawl',
    about: "A little black dragon beds down on a ring of scorched ground two hundred paces south-west of Mother Grawl's hut, with a bat as big as a man beside it, and the two watch her pot day and night. She brews to bring them. She didn't think they'd stop. Put one of the two down.",
    offer: [
      "See the burnt ground south-west, the black ring in the grass? A little black dragon beds down there, wings like a wet cloak, and a bat as big as you with it. The two of them watch my pot. Day and night now.",
      "Of course they come. I brew to bring them; there's things in a bat a woman needs, and a dragon's better. I didn't think they'd stop. They've stopped. One down, and the other'll think about it.",
    ],
    accept: 'One of the two.',
    acceptLine: "South-west, two hundred paces, the scorched ring. The little one breathes fire; keep off its front. The bat goes for your neck. Bring me nothing off them; I'll fetch what I want.",
    decline: 'Not now.',
    declineLine: "No. I'll brew something that smells worse.",
    journal: [
      "A werebat and a dragonling bed down on a scorched ring south-west of Mother Grawl's hut, watching her cauldron. Put down one of the two.",
      "Go back to Mother Grawl at her hut.",
    ],
    progress: [
      "South-west. The burnt ring. One of the two.",
    ],
    done: [
      "One down, and the other gone off over the wood to sulk. I'll brew lighter for a while.",
      "Here. Now. Wilf Carder, at Roadsend, east. He's sent me a fleece, and I've a word for him.",
    ],
    after: [
      "The pot smells of nothing now. I miss them a bit. Don't tell Crowle. He thinks I've a heart of flint, and I've let him.",
    ],
  },

  the_wrong_fleece: {
    title: 'The Wrong Colour',
    giver: 'grawl',
    needs: ['grawls_kennel', 'under_the_eaves'],
    about: "Wilf Carder, the wool-factor at Roadsend, sent Mother Grawl a black fleece for her work. It isn't black. Take it back. Thornwick's carters, who were bringing Wilf his wool, stand by the Marshal's Road where they stopped: put down three. Ten minutes east. It's paid there.",
    offer: [
      "Wilf Carder, at Roadsend, east, where my lane comes out on the big road. Wool-factor. I buy a black fleece off him every year; black's for some work, and white's for none. This year he's sent me this.",
      "It's white. Under the black, it's white: he's had it dyed. Take it back. You'll pass Thornwick's carters on the big road. They were bringing Wilf his clip, and they stopped, and they're stood there yet. Not living. Where the carts went, don't ask me. Put three down.",
    ],
    accept: "I'll take it back.",
    acceptLine: "East, ten minutes, down the lane and along the big road. The carters are by it where it runs straight. Then Roadsend: a block of stone at the road's end, a fire, and Wilf, arguing.",
    decline: 'Not now.',
    declineLine: "No. I'll keep it. It'll do for bandages. White's good for that.",
    journal: [
      "Thornwick's carters, not living, stand where they stopped beside the Marshal's Road, between Mother Grawl's lane and Roadsend. Put down three.",
      "Go on east to Roadsend and give Wilf Carder, the wool-factor, Mother Grawl's fleece back: it's the wrong colour.",
    ],
    progress: [
      "East. The carters by the road. Then Wilf, and the fleece.",
    ],
    done: [
      "The wrong colour? It's black. Look at it. ...On the outside. She can tell. I've never known how.",
      "You came past the carters on the road? Thornwick's, bringing me the spring clip. They stopped there, and my clip with them, in the grass. Here, for Grawl's trouble and yours.",
    ],
    after: [
      "He argued? Then the black one comes next week, and a cheese. That's how it goes with Wilf.",
    ],
    others: {
      wilf: [
        "The wrong colour? It's black. Look at it. ...On the outside. She can tell. I've never known how.",
        "You came past the carters on the road? Thornwick's, bringing me the spring clip. They stopped there, and my clip with them, in the grass. Here, for Grawl's trouble and yours.",
      ],
    },
  },

  // ================================================================ Roadsend (Wilf Carder)
  last_clip: {
    title: 'Short by a Pound',
    giver: 'wilf',
    about: "Thornwick's carters were bringing Wilf Carder the spring clip when they stopped by the Marshal's Road, two hundred and sixty paces west of Roadsend. They stand there yet, and the fleeces lie about in the grass round them. Bring Wilf four.",
    offer: [
      "The spring clip. Thornwick's, paid for in the winter, because Thornwick was short and asked. It was coming on the carts with the carters you came past. Where the carts went, I couldn't tell you. The wool's in the grass round where they stand.",
      "Fetch me four. I'll know them; Thornwick ties a tally on every fleece, the shepherd's mark and the weight. I'll not ask you to bring the carters.",
    ],
    accept: "I'll fetch four.",
    acceptLine: "West, two hundred and sixty paces, back the way you came. The fleeces are round about them, rolled. Don't get between a carter and his load. They've not forgotten that much.",
    decline: 'Not now.',
    declineLine: "No. It's paid for. It'll keep.",
    journal: [
      "Thornwick's spring clip lies in the grass round its carters, stopped by the Marshal's Road west of Roadsend. Bring Wilf Carder four fleeces.",
      "Go back to Wilf Carder at Roadsend.",
    ],
    progress: [
      "West, where the carters stand. Four fleeces.",
    ],
    done: [
      "Four. ...Look at the tallies. Every one a pound light of what's written on it. Thornwick shorts me a pound a fleece, every year.",
      "Stood dead by the road, and they've still shorted me. Here; that's the carrying rate, and over. I'll not short you.",
    ],
    after: [
      "I've put the four in the book, at their own weight, less a pound. Somebody has to be honest about Thornwick.",
    ],
  },

  what_lies_on_it: {
    title: 'Laid Out Flat',
    giver: 'wilf',
    about: "Wilf Carder's old stock lay stacked to air on the rise three hundred paces north of Roadsend. Each night more of it is unrolled and laid out flat, in rows, like beds; three tall night things lie on it by day and stand over his fire after dark. Put two of them down.",
    offer: [
      "My old stock. I stacked it on the rise north, under sailcloth, to air. You don't send damp wool east; they weigh it, and the damp's yours. Every morning more of it's unrolled and laid out flat. In rows. Like beds at a fair.",
      "Now I know what for. Three of them, tall and dark, that lie on it by day and stand on the rise at dusk looking down at my fire, all night. Put two of them down. I'd like to sit with my back to that rise again.",
    ],
    accept: 'Two of the three.',
    acceptLine: "North, three hundred paces, the rise. By day they'll be lying on it, or stood about it. They're slower to start than to finish. Go in quick.",
    decline: 'Not yet.',
    declineLine: "No. I'll sit facing it, then. I'm used to it.",
    journal: [
      "Three night demons lie on Wilf Carder's wool, laid out flat in rows on the rise north of Roadsend, and stand over his fire by night. Put down two.",
      "Go back to Wilf Carder at Roadsend.",
    ],
    progress: [
      "North. The rise. Two of the three.",
    ],
    done: [
      "Two, and the third off over the hill. ...Warm under, was it? Middle of the day, on a cold rise. I'll burn the lot. Thornwick's best, and I'll burn it.",
      "Here. A drover left this against his reckoning, the last year anything came this way to be driven. It's writing. I can't read it. You'll get more out of it than I would.",
    ],
    after: [
      "Sat last night with my back to the rise. Turned round once, to look. Nothing. Turned back. It's a start.",
    ],
  },

  wool_for_the_gate: {
    title: 'Wool for the Gate',
    giver: 'wilf',
    needs: ['last_clip', 'what_lies_on_it'],
    about: "Wilf Carder has wool and no carts, and the Long Queue, north-east up the Marshal's Road, is where everything waits that's going in at the gate. He wants to know if they'll take wool there. A plague giant has stood halfway up the road since the carts stopped: put down two of his three. More than half an hour.",
    offer: [
      "I've wool. Not much, and none of it black enough for Grawl. And no carts to take it, and nobody to take it to. Except the Long Queue: north-east, up the road, where everything that's going in at the gate waits to go.",
      "Go up and ask if they'll take wool at the gate. Ask Rollo Bask; he's a carter, he's been in it longest. Halfway, you'll see why no carts come down: a plague giant stands in the road, and two in iron with him. Two of the three down, and I might send one.",
    ],
    accept: "I'll ask at the Queue.",
    acceptLine: "North-east up the road, more than half an hour. The giant's about halfway. He's slow and his knights aren't; take them first.",
    decline: 'Not now.',
    declineLine: "No. It's wool. It's patient. It's mostly air.",
    journal: [
      "A plague giant and two plague knights stand by the Marshal's Road, halfway from Roadsend to the Long Queue. Put down two of the three.",
      "Go on up the road to the Long Queue and ask Rollo Bask, the carter, for Wilf Carder, if they'll take wool at the gate.",
    ],
    progress: [
      "North-east up the road. The giant halfway. Then the Queue, and Rollo.",
    ],
    done: [
      "Wool? They'll take anything at the gate. They take everything at the gate. It's getting to the gate that's the thing. I've been in this queue since the leaves turned.",
      "Here; Wilf'd want you paid, and I've more coin than road. Mind, if you're going in, the end of the queue's back there. Everyone asks.",
    ],
    after: [
      "They'll take it, he says? Everything goes in at that gate. I've been wondering what comes out.",
    ],
    others: {
      rollo: [
        "Wool? They'll take anything at the gate. They take everything at the gate. It's getting to the gate that's the thing. I've been in this queue since the leaves turned.",
        "Here; Wilf'd want you paid, and I've more coin than road. Mind, if you're going in, the end of the queue's back there. Everyone asks.",
      ],
    },
  },
};
