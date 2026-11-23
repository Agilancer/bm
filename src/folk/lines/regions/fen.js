// The Weeping Fen: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/fen.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it but the chapel: nobody at a camp or at Sallowmere names Velscour or Tessariel, and no line
// anywhere names anything of the one beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs
// reads every line for it). Sister Oriel is Tessariel's: she speaks of the order and its watches, and of nothing of his.
//
// Each with a voice of their own (tools/folk/cast.md, "The Weeping Fen"): Odo Marsh the eel-catcher (mends, swears at
// what he mends, goes deaf when money's named), Ness Carr the reed-cutter (counts in bundles, cuts things short), Tamar
// Dyke the salvager (weighs and prices everything, the dead included), Corby Lunn her crane-hand (the crane is "she"),
// Grizel Wade the ferrywoman (a penny a crossing, the seventh Wade to ask it), Davy Scrip the chapman (patter, and what
// is under it), Pike Hallam the eel-trapper (weather for news), and Sister Oriel (hours, exactly).
const DELVE_HINT = "The stair won't take one alone: Sergeant Hobb Marlow, beside the portal at the broken arch of the Sunken Mile, hires out a company.";

export const LINES = {
  // ---------------------------------------------------------------- Sedgebank
  odo: {
    first: [
      "Mind that line; it's an hour's work. ...You've stood on it. Never mind. It was a bad hour. Odo Marsh. Eels. This is Sedgebank, and it's as dry as you'll get, which is less dry than it was at Lammas.",
    ],
    greet: {
      morning: [
        "Morning. Traps were empty. They'll say it's the moon. It's not the moon.",
        "Water's up again. I've a notch on the mast for it. I'm running short of mast.",
      ],
      day: [
        "If you're standing there, you can hold this. Tighter. It's a trap, not a kitten.",
        "Selling? Put it down where it's dry. No. Drier than that.",
      ],
      evening: [
        "Mist's coming up off the water. Get near the fire. Not that near; that's my side.",
        "Eels run at dusk. I'd be out, if I'd a punt. I've a pole, somewhere. I've neither, if we're being exact.",
      ],
      night: [
        "Don't follow the lights. I shouldn't have to say. I say it to everyone, and there's always one.",
        "Hear the reeds? No. That's the trouble. North-west they don't rustle any more. They're tied.",
      ],
    },
    about: [
      "Odo Marsh. Eel-catcher, at Sedgebank, on the Fen Way. I weave my own traps, when I can get the rods, and I smoke what's in them, when there's anything in them.",
      "Forty years on this bank. My wife said I'd grow gills. She went to her sister's in Bellmourn to be dry. She writes. I can't read. It suits us both.",
    ],
    ask: {
      dead: [
        "They stand in the water up to the chest and don't mind it. I've minded it forty years. I'll not say I envy them. I'll say they don't get the ache in the knees.",
      ],
      town: [
        "Bellmourn eats my eels and wrinkles its nose at me. Bram Kettle takes a barrel a month, smoked. He calls it river fish on the slate. There's no river.",
      ],
      eels: [
        "An eel goes where it likes. Over wet grass, at night, if the water's wrong. You don't catch an eel. You put a trap where it was going anyway and let it think the trap was its own notion.",
        "Jellied, smoked, or stewed in ale. Not raw. The reed-cutters dared a lad once. He's well now.",
      ],
      mast: [
        "Came up the lode in the big flood, standing upright, with no ship under it. Went past the door like a man walking to market. I roped it before it could think better. Whose it was, I never heard. It's been mine longer.",
      ],
    },
    topics: { eels: 'Eels', mast: 'The mast' },
    bye: [
      "Keep to the path.",
      "Mind the line going out. You'll not. Nobody does.",
    ],
    barks: {
      player: ["Mind the line!", "Hold this. Tighter."],
      morning: ["Empty. Again.", "It's not the moon."],
      day: ["Up a hand. Look at the mast.", "Who's had my good knife?"],
      evening: ["Mist's up. Fire side."],
      night: ["Don't follow the lights."],
      magic: ["Not near the nets! They're tarred!", "...Do that over the water. See what comes up."],
    },
    shop: {
      open: [
        "I'll trade. Eels or coin, it's the same to me. No. Coin's better. Rolls, and dressings; they've been kept in the smoke-box, so they smell of eel. Everything here does.",
        "Set it on the barrel. I'll give you what it's worth, and then I'll not hear you when you say it's worth more.",
      ],
      closed: ["Not now. I've a line to mend that somebody stood on."],
      buy: ["There. It'll smell of eel. That's free."],
      sell: ["I'll have it. What? Can't hear you. It's the water."],
    },
  },

  ness: {
    first: [
      "You're stood in my light. ...No, stay; there's nothing to see by it. Ness Carr. I cut reed, for thatch. Six of us came up for the winter cut. The five with sense went home.",
    ],
    greet: {
      morning: ["Morning. Frost on the reed. That's cutting weather. I'm sat here."],
      day: ["A good day's four hundred bundles. Ask me what today's is."],
      evening: ["I'd be tying, this hour. I've tied the same bundle nine times to have something to do."],
      night: ["Don't ask me about the lights. Ask Odo. He tells it longer."],
    },
    about: [
      "Ness Carr. Reed-cutter. I thatch half of what Bellmourn sleeps under, and the other half's slate and thinks well of itself.",
      "You cut reed in winter, when it's dead and dry. Everything's easier cut dead. Odo says that's a hard thing to hear from a girl. I'm twenty-seven.",
    ],
    ask: {
      dead: [
        "They walk through the beds and don't break a stem. I've watched. A live man in a reed bed sounds like a cow. They go through like wind. I'd hire one, if it could tie.",
      ],
      town: [
        "The inn's slate, and proud of it. Everything else that's dry in Bellmourn is dry under my reed, and they pay me in March for what I cut at Christmas.",
      ],
    },
    bye: ["Go on. You're in the light again.", "Mind the bundles. Both of them."],
    barks: {
      player: ["You're in my light."],
      morning: ["Cutting weather. Look at it."],
      day: ["Four hundred a day. Once."],
      evening: ["Tied it again."],
      magic: ["Not near dry reed! Are you simple?"],
    },
  },

  // ---------------------------------------------------------------- Mile-End Camp
  tamar: {
    first: [
      "Stop there. That's a spoil heap you're about to walk up, and it's sorted. ...From the south, on foot, not selling and not buying. Then you're labour. Tamar Dyke. This is Mile-End. Everything in it came up off the Mile, me included, most evenings.",
    ],
    greet: {
      morning: [
        "Morning. Water's where it was. I look first thing. It's like looking in on somebody ill.",
        "Tide-table? There's no tide. The fen comes up when it likes and tells nobody. I keep a table anyway.",
      ],
      day: [
        "Lead's fourpence a pound in Bellmourn. Dressed stone's a shilling a block, if you can get it there. Ask me what I've sold since Michaelmas.",
        "If you've something to sell, put it on the heap that looks most like it. I'll price it.",
      ],
      evening: [
        "Crane's chocked. Corby does it at dusk and then stands looking at her. I've known men look at wives less.",
        "Eleven went home at the first frost. They'd reasons. I priced the reasons. They were fair.",
      ],
      night: [
        "You'll hear the Mile, nights. Slabs shifting. It's only stone settling. I say that every night, out loud, at about this hour.",
        "Don't go west in the dark. There's some on the causeway who still think it's theirs.",
      ],
    },
    about: [
      "Tamar Dyke. Salvager. Somebody built a mile of good stone and the fen had it. I take it back a slab at a time. Lead, paving, iron cramps. It's not robbing. It's the other thing.",
      "Dyke's a draining name. My people dug the lodes. Then they filled, and we changed trades and kept the name. I'm the first of us to make the fen pay anything back.",
    ],
    ask: {
      dead: [
        "Everything that went down is still there. That's the whole of my trade. I'd not thought it out as far as people, till I saw them stood on the slabs.",
      ],
      town: [
        "Bellmourn buys my lead and doesn't ask where it lay. Orrin Vane asked. I told him. He wrote it down and went the colour of the lead.",
      ],
      mile: [
        "The Sunken Mile. A causeway, west off the Fen Way, pale stone on piers: a toll at this end, and the way to the west pools at the other. Went under in one night, in my grandmother's time. Stone on a hard bottom doesn't do that.",
        "There's one arch of the bridge left, and a waymark down in the reeds in two pieces. I've left those. You don't sell the sign off the shop.",
      ],
      crane: [
        "Corby's. Well. Mine; I paid for the timber. But he built her, and she'll not lift for anyone else. I've tried. She creaks at me.",
      ],
    },
    topics: { mile: 'The Sunken Mile', crane: 'The crane' },
    bye: [
      "Mind the heaps going out. They're sorted.",
      "Go on. If it's heavy and it's not yours, it's mine.",
    ],
    barks: {
      player: ["Not on the heap.", "Labour, or looking?"],
      morning: ["Water's where it was."],
      day: ["Fourpence a pound.", "That's sorted! Leave it!"],
      evening: ["Corby! She's chocked. Come away."],
      night: ["Only stone settling."],
      magic: ["Could you lift a slab with that? ...Pity.", "Not near the crane. He'll sulk."],
    },
    shop: {
      open: [
        "Rolls, dressings, and anything on these heaps you can carry off. I buy what's got weight to it. Show me.",
        "Put it down. I'll tell you what it is, what it was, and what I'll give. The last one's the short one.",
      ],
      closed: ["Not now. I'm tallying, and I've lost my place twice."],
      buy: ["Yours. It came up from under water; so dry it."],
      sell: ["I'll take it. It goes on a heap. Everything goes on a heap."],
    },
  },

  corby: {
    first: [
      "Don't lean on her. ...The crane. She's chocked, but she's not for leaning on. Corby Lunn. I work her. I built her, out of a barge's ribs and a mill's windlass. She's lifted a ton and a quarter. Not lately.",
    ],
    greet: {
      morning: ["Morning. Greased her blocks. She'd lift today. If."],
      day: ["She pulls a little to the left. I've never found why. I've stopped looking; it's hers."],
      evening: ["Chocked. I'll stand a minute. I like to see her against the sky."],
      night: ["She creaks in the cold. It's only the jib. I get up and look anyway."],
    },
    about: [
      "Corby Lunn. Crane-hand. I was a millwright's lad till the mill had no work. Tamar wanted a thing to lift slabs out of a bog. I'd never built one. Nor had anybody.",
      "A crane's a simple notion. What you lift on one side you answer on the other. Take the answer away and she'll go over on her face. That's all of it. Most things are that.",
    ],
    ask: {
      dead: [
        "One stood under the jib a whole morning, looking up. I thought, he'll have been a builder. Then I thought, I'm not lowering a slab on a man who's admiring her. So we stopped work. Tamar docked me.",
      ],
      town: [
        "Bellmourn? The smith there's supposed to be a marvel. I'd like him to see her. I'd not like him to say anything.",
      ],
    },
    bye: ["Mind her guy-ropes going out."],
    barks: {
      player: ["Not for leaning on."],
      morning: ["Blocks are greased."],
      day: ["She pulls left. It's hers."],
      evening: ["Look at her. Go on."],
      magic: ["Not near her ropes!"],
    },
  },

  // ---------------------------------------------------------------- Sallowmere
  grizel: {
    first: [
      "A penny. ...No? Then you've not come to cross, and I'll not get up. Grizel Wade. That's my jetty, what's left of it, and that's my boat. I'm the ferry. You'll have come by the huts. I don't ask what you saw there. I knew every one of them by their knock.",
    ],
    greet: {
      morning: [
        "Morning. Mist on the mere. You'd not see the far side. I've not needed to since I was nine.",
        "Baled her at first light. She takes a bucket a night now. So do I, near enough.",
      ],
      day: [
        "It's a penny over. It's been a penny since the Mile sank. Before that there was a dry way round, and we starved, politely.",
        "If it's trade you want, that's Davy. He's been waiting on me nine days and sold me two papers of pins. I'd no use for the first.",
      ],
      evening: [
        "Light's going. I'd have hung the lantern on the post, once, for late comers. The late ones walk now.",
        "Sit, if you're stopping. Not in the boat. Nobody sits in her that hasn't paid.",
      ],
      night: [
        "There. On the water. See them? No, you'll not, from here; they're low. Lights. Going over, slow, in a line. Not in a boat.",
        "I don't sleep. I listen for the bell on the far post. Forty years of somebody ringing for the ferry. You don't stop hearing for it because they've stopped.",
      ],
    },
    about: [
      "Grizel Wade. Ferrywoman. Seven Wades have had this crossing, mother to daughter. The first rowed it before there was a Mile. Then they built the Mile, and five of us mended nets and waited. We're good at it.",
      "I carry the living over for a penny, and the dead over to the Yard for the same. I've never seen why they'd be dearer. They sit stiller.",
    ],
    ask: {
      dead: [
        "I carried them. That's what you don't follow. Every one stood in those huts went over the mere in my boat, in a box, with a penny from the family. Or would have. They've spared me the rowing. I don't thank them.",
      ],
      town: [
        "Bellmourn's south, and dry, and wants eels. It's a fortnight since anybody came up from it but you. I count. A ferry's a counting trade.",
      ],
      ferry: [
        "From the huts to the east jetty, the east jetty to the Yard, the Yard round to the west shore for the chapel road. A penny a leg. There was a bell-post at each. The mere had two. I hear the third some nights, and nobody at it.",
      ],
      mere: [
        "Sallowmere. Named for a woman, they say, who called the water up to spite a toll-keeper. I never credited it. Then the shore got up and walked this spring, and I've gone quiet on what I credit.",
        "Don't go round by the south-west. Something big wallows there, and east of the huts another. They've not troubled the jetty. Nothing troubles the jetty. It's not worth it.",
      ],
    },
    topics: { ferry: 'The ferry', mere: 'The mere' },
    bye: [
      "Go on, then. No charge for walking.",
      "Mind the edge. It's further in than it looks.",
    ],
    barks: {
      player: ["A penny. No? Then stand clear.", "Not in the boat."],
      morning: ["A bucket a night, she takes."],
      day: ["A penny over. Always was."],
      evening: ["No lantern. No call for one."],
      night: ["There. Low on the water."],
      magic: ["Not over my boat!", "Hm. Can you do that to a leak?"],
    },
  },

  davy: {
    first: [
      "Ribbons, laces, pins by the paper, a looking-glass that flatters! ...No. No, you've the look of a customer who's selling. Davy Scrip. Chapman. I walk the fen villages with a pack. I'm waiting on the ferry. I've been waiting nine days. She says there's no call. I say I'm a call.",
    ],
    greet: {
      morning: ["Morning! Fresh stock! It's the same stock. I turned it over."],
      day: ["Needles, thread, tin whistles... no. Not whistles. I'm out of whistles. What've you got?"],
      evening: ["Nine days. I've sold her pins twice. She's one head, and no hair to speak of."],
      night: ["I keep my back to the west shore, nights. A chapman knows when he's being waited for."],
    },
    about: [
      "Davy Scrip. Thirty years round the fen with a pack. The huts, the Hythe, Sedgebank, the chapel when the sisters wanted thread. I know every door on the water by what it's short of.",
      "A chapman's welcome is the best there is. Everybody's glad of you and nobody wants you to stop. It's like being weather.",
    ],
    ask: {
      dead: [
        "I came up to the huts at dusk, calling my wares. They all turned round. Every door I've knocked at for thirty years, and they all turned round at once. I'd swear one of them looked at my pack. Out of habit.",
      ],
      town: [
        "Bellmourn's where I fill the pack. The Reed sisters do me ribbon at a price. I tell them it's robbery. They tell me to weave my own.",
      ],
    },
    bye: ["Mind how you go! And tell them Davy's at the jetty.", "Come again. I'll be here. Evidently."],
    barks: {
      player: ["Pins by the paper!", "Buying? Selling? Anything?"],
      morning: ["Fresh stock! Same stock."],
      day: ["Nine days."],
      night: ["Not looking west."],
      magic: ["Could you bottle that? I could sell that."],
    },
    shop: {
      open: [
        "Now then! Rolls, clean dressings, and I'll buy near anything: a chapman's pack is other people's mistakes at a fair price. What've you brought me?",
        "Lay it on the pack-lid. I'll say a price, you'll look hurt, I'll say another. It's how it's done.",
      ],
      closed: ["Not this minute. I'm counting stock. It's all I've left to do."],
      buy: ["Sold! And cheap. I'll regret it by dark."],
      sell: ["Mine. Somebody past the mere wants exactly that. If I ever get past the mere."],
    },
  },

  // ---------------------------------------------------------------- Eelpot Hythe
  pike: {
    first: [
      "You came by the lane. I heard you a furlong off; you walk like a man on a floor. Pike Hallam. This is Eelpot. There's no road to it, and you've found out why. Sit downwind of the smoke-house, or you'll wear it a week.",
    ],
    greet: {
      morning: [
        "Morning. Wind's south-west. It's been south-west since Martinmas. That's not weather. That's somebody.",
        "Pots are down. I'll lift them at noon. I know what's in them. I lift them anyway.",
      ],
      day: [
        "We don't get news here. We get weather. If you've news, say it slow; I'm out of the way of it.",
        "If you're selling, I'll look. It's a long way to bring a thing and take it home again.",
      ],
      evening: [
        "Sky's the colour of a bruise, west. It'll blow tonight. It blows every night now. I've stopped staking the nets; I just fold them.",
        "Fire's in the lee of the hull. Everything here's in the lee of the hull.",
      ],
      night: [
        "Hear that? South-west. Like a man whistling for a dog, a long way off. Don't whistle back.",
        "Lights, north-east, low. That's the Graves. We put ours in the reed, feet to the water. They've begun to sit up.",
      ],
    },
    about: [
      "Pike Hallam. Eel-trapper. Hallams have set pots at this hythe since it was a hythe. There were nine roofs. There's the one, and it's a boat.",
      "My father went out the night the Mile went under, to see what the noise was. Punt and all. My mother kept a place for him in the Graves till she went into the one beside it.",
    ],
    ask: {
      dead: [
        "Ours lay quiet till this year. We bury in reed, in the wet; it keeps them. I'd thought that a kindness. I'd not thought what it kept them for.",
      ],
      town: [
        "Bellmourn? I was there once. For a wedding. Everybody talked at once, and the ground didn't move at all. I couldn't sleep.",
      ],
      wind: [
        "A hythe lives by its wind. You want it behind you going out and behind you coming home, and nobody gets that for nothing. My father bought his. So did his. From the ring of stakes south-west. It was eels, then. A basket a knot.",
      ],
      hull: [
        "The Hythe's barge. Forty foot, oak. A wind took her out of the water on a still morning and set her down there, keel up, gentle as a hat. Nobody was under. We took the meaning. We'd been slow paying.",
      ],
    },
    topics: { wind: 'The wind', hull: 'The hull' },
    bye: [
      "Go with it behind you.",
      "Mind the lane. It's only a lane by daylight.",
    ],
    barks: {
      player: ["Downwind of the smoke, I said.", "You walk like a floor."],
      morning: ["South-west. Still."],
      day: ["No news. Good."],
      evening: ["It'll blow."],
      night: ["Don't whistle back."],
      magic: ["...That's not theirs. Is it? No. Too warm.", "Do that into the wind. See which wins."],
    },
    shop: {
      open: [
        "Rolls, a week old; the lane's long. Dressings. And I'll take what you're carrying. What comes to Eelpot stays; nobody carries a thing back down that lane.",
        "Put it on the thwart. I'll weigh it in my hand. That's the only scale that's not blown away.",
      ],
      closed: ["Not now. I've pots to lift."],
      buy: ["Yours. Keep it out of the wind."],
      sell: ["It'll do. Everything does, out here."],
    },
  },

  // ---------------------------------------------------------------- the Drowned Chapel
  oriel: {
    first: [
      "Stand on the planks, please. The ground beside them is not ground. ...You came by the fen road, past the pool, and you are not wet above the knee. That is well done. I am Sister Oriel. This is the house of the fourth watch. There were eleven of us. I am the one who was youngest.",
    ],
    greet: {
      morning: [
        "Good morning. The west end is a finger lower than at midsummer. I measure at the door, on the feast days. It is the only tithe the fen collects, and it is never late.",
        "I have swept the north walk. Not the nave. I do not go into the nave now, and nor should you, without your staff up.",
      ],
      day: [
        "The dead here lie under pale stone and have not stirred. In all this fen they are the only ones who keep to their beds. I am a little proud of them. That is a fault.",
        "If you need thread or bread, the chapman has them, at Sallowmere. I have neither to sell. I have a great deal of quiet.",
      ],
      evening: [
        "It will be dark soon. The first watch was the tower's, the second the abbey's, the third the shrine's in the snow. The fourth was ours: the last before light. Nobody chooses it. It is given to those who can stay awake.",
        "You may sit on the north side. The stones are dry there until October.",
      ],
      night: [
        "It is nearly the hour. I say the office from memory, standing. If you hear a bell, it is not mine, and it is not the hour.",
        "Speak low. South, past the pale ring, something very large is asleep. I should like it to go on.",
      ],
    },
    about: [
      "Sister Oriel. I came here at eleven, with a fever, in the ferry. The sisters kept me, and then they kept me on. The order stopped the watches forty years ago. Nobody wrote to say we might go. So I have not gone.",
      "I keep the fourth watch. I am told it is no longer kept. I find that if one keeps it, it is.",
    ],
    ask: {
      dead: [
        "Those who walk? I do not send them off. They come as far as the plank path and stop, and stand a while, and go. I think they are looking at the ones who managed to stay lying down. I would look, too.",
      ],
      town: [
        "Bellmourn. The tenor bell was cast there, on the green, before there was a town to speak of. I have never seen it. I have heard it, across twelve miles of water, on a still night, once. I was a girl. I thought it was meant for me.",
      ],
      watches: [
        "Four bells in the tower on the downs rang the four watches of the night, and each house answered its own. Ours hung in a frame at the west end. The west end went into the mire, and the bell with it. Then it came out again. Not by my hand.",
      ],
      south: [
        "A green thing, with wings folded, in the reeds two hundred paces south of the pale ring. It has slept there since before I came. Sister Avice said it was a hill. Do not go and see. Come to this house from the east or the north, and leave the same way.",
      ],
    },
    topics: { watches: 'The four watches', south: 'What sleeps to the south' },
    bye: [
      "Go well. On the planks, please.",
      "Leave by the east. Not the south.",
    ],
    barks: {
      player: ["On the planks, please.", "Not into the nave."],
      morning: ["A finger lower."],
      day: ["They keep to their beds. Good."],
      evening: ["It is nearly the hour."],
      night: ["That is not my bell."],
      magic: ["Not toward the south, I beg you.", "...The sisters would have liked that. Not said so."],
    },
  },
};

export const QUESTS = {
  // ================================================================ Sedgebank (Odo Marsh; Ness Carr)
  empty_traps: {
    title: 'Empty Traps',
    giver: 'odo',
    about: "Odo Marsh's eel traps have come up empty for a month. Three children stand in the water at his stakes, a hundred paces north-east of Sedgebank, and haul them. Put down two of the three.",
    offer: [
      "A month of empty traps. Forty years I've set that run. I know what an empty trap means: you've set it wrong, or somebody's been before you. I've not set a trap wrong since my wife was speaking to me.",
      "So I sat up. North-east, at my stakes: three children, stood in the water to the chest. They haul a trap, open it, and tip it out. Then they set it again. Neat. Neater than me. I can't smoke neatness. See to them. Two would break them of it.",
    ],
    accept: "I'll go to your stakes.",
    acceptLine: "North-east, a hundred paces, where the stakes stand in the lode. They'll not look round till you're close. They're busy. When they do look round, it's all three at once, and quick.",
    decline: 'Not now.',
    declineLine: "Then it's nettles again. You can't jelly a nettle. I've tried.",
    journal: [
      "Three children stand at Odo Marsh's eel-stakes, a hundred paces north-east of Sedgebank, and empty his traps. Put down two of the three.",
      "Go back to Odo Marsh at Sedgebank.",
    ],
    progress: [
      "North-east, at the stakes. Two. And don't tread on the traps; they're the only thing out there that's mine.",
    ],
    done: [
      "Two. That'll do it. And the traps? You hauled one? ...Full. Don't tell me full. A month, and the morning you go out there it's full.",
      "Here. ...They never took an eel, you know. Not one. I watched four nights. Up, open, and back in the water with the lot, like a child with a hedgehog. Somebody taught them to let things go. I can't think it did them much good.",
    ],
    after: [
      "Full traps all week. There's a small one still out at the stakes, some dusks. Stands and watches me haul. I've not said anything. I let one go, Tuesday, to see. It didn't clap or anything.",
    ],
    others: {
      ness: ["Odo's eating again. You can tell; he's stopped talking about nettles. He left an eel out on the far stake last night. Says he dropped it. Odo's never dropped an eel in his life."],
    },
  },

  reed_hooks: {
    title: 'Reed-Hooks',
    giver: 'ness',
    about: "When the spiders came down on the reed bed north-west of Sedgebank, six cutters ran and left their hooks standing in the sheaves. Ness Carr can't cut without one. Bring back five from round the Reed Larder: three lie well out from it, two close in under the webs.",
    offer: [
      "We were cutting the big bed, north-west, up the rise. Six of us. Then the reed above us was full of legs. You don't stop to pick up your hook. I'd like to say I thought about it.",
      "A reed-hook's a year's wages and a winter's edge. They're still up there, stood in the sheaves where we dropped them. Five would set up a gang again. Three are well out, where we ran. Two are close in, where we were cutting. For those you'll be seen.",
    ],
    accept: "Five hooks.",
    acceptLine: "North-west, two hundred and fifty paces, up the rise; there's a trodden way. A hook's a blade as long as your forearm on an ash handle. Carry them edge down. I'll not have come this far to be the one who lends you a dressing.",
    decline: 'Not now.',
    declineLine: "No. Then I'll tie this bundle a tenth time.",
    journal: [
      "The reed-cutters left their hooks round the Reed Larder, north-west of Sedgebank and up the rise. Pick up five of them: three lie well out from it, two close in under the webs.",
      "Take the hooks back to Ness Carr at Sedgebank.",
    ],
    progress: [
      "Five. Three out wide, two close in. If it's stuck in a sheaf, pull straight. If the sheaf pulls back, leave it.",
    ],
    done: [
      "Five. That's mine; I'd know that nick. That's Col's. The Pask brothers' two. And this one's... nobody's. Look at the tang. Nobody's forged a hook like that in a hundred years.",
      "Here. ...So somebody cut that bed before there was a Sedgebank, and ran, and left their hook stood in a sheaf. Same as us. And never came back for it. I'd as soon you'd not found that one.",
    ],
    after: [
      "I've sent for Col and the Pasks. The old hook's on the mast, on a nail. It takes an edge better than mine. I don't use it.",
    ],
    others: {
      odo: ["Ness has her hooks? Then she'll be cutting, and I'll have reed-dust in the smoke-box till Easter. Well. It's company."],
    },
  },

  punt_in_the_reeds: {
    title: 'A Punt in the Reeds',
    giver: 'odo',
    about: "Odo Marsh has promised Maren Rush his punt for her rods, and has no punt: it hangs in the Reed Larder, north-west of Sedgebank, ten foot up and wrapped. Empty the Larder: every spider in it, and the great one that does the hanging.",
    offer: [
      "I've told Maren Rush I'll send the punt Thursday. You heard me. I'd like a punt to send. Mine's north-west, up the rise, ten foot off the ground, wrapped like a fly. It's a twelve-foot punt.",
      "That's the Larder. The big one hangs what the small ones bring. Herons. An otter. A boat. I went for the punt with my pole, and came home with neither, and I'd thank you not to carry that south. Empty it. All of them, and her.",
    ],
    accept: "I'll empty the Larder.",
    acceptLine: "North-west, two hundred and fifty paces, where Ness's cutters ran from. Don't stand still under the reed. She drops thread a long way, and it holds. Kill the little ones as they come at you, and keep your feet moving.",
    decline: 'Not yet.',
    declineLine: "Then it's Thursday week. Or the one after. I never said which Thursday.",
    journal: [
      "Odo Marsh's punt hangs in the Reed Larder, north-west of Sedgebank and up the rise. Empty the Larder: put down every spider in it, and the great one that hangs things.",
      "Go back to Odo Marsh at Sedgebank.",
    ],
    progress: [
      "North-west, up the rise. All of them, and the big one. I can see my punt from here, on a clear day. That's the worst of it.",
    ],
    done: [
      "Empty? And she's down? The punt, I mean. ...Whole? There's a hole in her you could post a dog through. That's nothing. That's a morning and a pot of pitch.",
      "Here. And not a word to Maren about the pole. She'll have found it by now; she finds everything. Let her think I threw it at something.",
    ],
    after: [
      "Pitched and floating. She smells of spider. The eels don't mind. I'll send her down for the rods Thursday. I've said so.",
    ],
    others: {
      maren: ["The punt came. With a patch on her the size of a dinner. He says the reed had her. With Odo it's always something had it. ...Ten foot up? Then I'll say no more about the pole."],
      ness: ["It's down? Then that's the big bed open, and four hundred bundles a day. Tell Odo I'll thatch his smoke-house for it. He'll go deaf. Say it anyway."],
    },
  },

  a_hand_a_week: {
    title: 'A Hand a Week',
    giver: 'odo',
    about: "The water at Sedgebank is up a hand a week. East of the camp, goblins have staked and wattled Sinkfoot Stockade right across the lode that drains it. Empty the stockade: every one of them, and their king. Odo Marsh will pull the dam himself.",
    offer: [
      "See the notches on the mast? Each one's a week. The water's up a hand between any two of them. Sedgebank's a bank. It'll be a shoal by Candlemas, and I'll be an eel-catcher with nowhere to stand and catch.",
      "East. The lode that drains us runs that way, or did. Goblins have staked it bank to bank, wattled it, and sat a stockade on top. It stands in its own pond, pleased with itself. Black little things; they like it wet. Empty it, their king and all. I'll have the wattle out myself.",
    ],
    accept: "I'll empty Sinkfoot.",
    acceptLine: "East, three hundred and forty paces; there's a trodden way off the road past my stakes. Mind the ones that spit: stand where it lands and you'll stand there a while. The king's the fat one. He throws what he's sat on.",
    decline: 'Not yet.',
    declineLine: "No. I'll cut another notch, then. I'm good at notches.",
    journal: [
      "Goblins at Sinkfoot Stockade, east of Sedgebank, have dammed the lode that drains the camp. Empty the stockade: put down every one of them, and their king.",
      "Go back to Odo Marsh at Sedgebank.",
    ],
    progress: [
      "East. Sinkfoot. All of them, and the king. Leave the wattle. That's mine. I've been looking forward to it.",
    ],
    done: [
      "Empty? Then that dam's out by dark, and I'll sleep with my feet dry for the first time since Lammas. I'll cut no more notches. I'll leave those there. Let it be known what I put up with.",
      "Take this. Eelskin. Forty skins; it took me a winter. Water goes off it, and so does most else. My wife said I looked like bait in it. It'll sit better on you. It could hardly sit worse.",
    ],
    after: [
      "Down a hand already. There's a stretch of bank out that I'd forgotten I owned. I stood on it. It's not much. It's dry.",
    ],
    others: {
      ness: ["He pulled that dam with his own hands, swearing the whole time, and he was singing by the end. I didn't know he'd a song. It's not a good one."],
      maren: ["Water's down a hand at the Landing. First time this year. Odo's doing? He'll send a bill. I'll pay it. Don't tell him I said so."],
    },
  },

  a_hand_of_water: {
    title: 'A Hand of Water',
    giver: 'odo',
    needs: 'a_hand_a_week',
    about: "The lode Odo Marsh has unstopped drains the Sunken Mile as well as Sedgebank. Tamar Dyke, the salvager at Mile-End Camp, has waited a year for the water there to drop. Tell her it will. Mile-End is twenty minutes north along the Fen Way, and three of the drowned stand by the road short of it: put down two going by. It's paid there.",
    offer: [
      "That lode doesn't only drain me. It drains the Mile. Same water. There's a woman up at Mile-End, Tamar Dyke, digs stone out of the old causeway with a crane. She's waited a year for a hand of water off it.",
      "Go up and tell her it's coming. She'll not credit me; I owe her for a grapnel. She might credit you. There's three by the road short of her camp, dripping, facing north like they're waiting on a cart. You'll want two of them down before you pass. They don't like being passed.",
    ],
    accept: "I'll tell her.",
    acceptLine: "North on the Fen Way, twenty minutes. You'll see her crane before you see her. The three are on the left of the road, a little before the turning. Tell her the dam's out. Don't tell her about the grapnel. She'll tell you.",
    decline: 'Not now.',
    declineLine: "Then she finds out when her boots stay dry. That's a way of telling her.",
    journal: [
      "Odo Marsh's word for Tamar Dyke is that the water will drop. Three of the drowned stand by the Fen Way a little short of Mile-End Camp, twenty minutes north of Sedgebank: put down two of them.",
      "Find Tamar Dyke at Mile-End Camp, where the Sunken Mile leaves the Fen Way, and tell her the dam is out.",
    ],
    progress: [
      "North, the Fen Way. Two of the three by the road, then the crane. Tamar Dyke. The dam's out.",
    ],
    done: [
      "The dam's out? Sinkfoot's? ...A hand. That's the toll-house sill clear of the water. That's a course of dressed stone I've looked at through a foot of mud since last spring.",
      "Odo Marsh did me a kindness. He'll have a reason; he owes me a grapnel. And you came up past the three at the turning. Then you're not labour. You're better. I've work that wants better.",
    ],
    after: [
      "She sent the grapnel's price down by a carter. In lead. I can't spend lead. She knows I can't. That's Tamar being thankful.",
    ],
    others: {
      tamar: [
        "The dam's out? Sinkfoot's? ...A hand. That's the toll-house sill clear of the water. That's a course of dressed stone I've looked at through a foot of mud since last spring. Here. For the walk, and the two.",
        "Odo Marsh did me a kindness. He'll have a reason; he owes me a grapnel. And you came up past the three at the turning. Then you're not labour. You're better. I've work that wants better.",
      ],
    },
  },

  // ================================================================ Mile-End Camp (Tamar Dyke; Corby Lunn)
  counterweight: {
    title: 'Counterweight',
    giver: 'corby',
    about: "The goblins of Leechwater Camp, west of Mile-End, have carried off the crane's counterweights, and she can't lift without them. They use them to sit on. Bring back five from round the camp: three lie well out from it, two close in.",
    offer: [
      "She's got no answer. See the box on her tail? Empty. Five blocks of lead went in that, forty pound each, with a ring cast in the top. The goblins from Leechwater had them. Two to a block. Singing.",
      "I followed. They sit on them. Round the outside of their camp, a goblin to a block, like a jury. Their kind hate to sink, and a block's the one dry seat in a fen. When they get up they leave them. Five. Three are well out. Two are close in. For those you'll be looked at.",
    ],
    accept: "Five weights.",
    acceptLine: "West, past the Mile, four hundred paces, up on the hump; there's a way trodden. They're heavy. Take them by the ring. And if one's warm, put it down and try another.",
    decline: 'Not now.',
    declineLine: "No. Well. She'll keep. She's chocked.",
    journal: [
      "Goblins at Leechwater Camp, west of Mile-End past the Sunken Mile, sit on the crane's lead counterweights. Pick up five of them: three lie well out from the camp, two close in.",
      "Take the weights back to Corby Lunn at Mile-End Camp.",
    ],
    progress: [
      "West, on the hump. Five, by the ring. Not off a goblin. Wait till it's stood up.",
    ],
    done: [
      "Five. In the box with them. There. Hear that? That's her settling. She's stopped pulling left. She only ever pulled left because she was a block light. Two years I thought it was her nature.",
      "Here. It's what I've put by. ...Look at the top of this one. There's a hollow worn in it. Goblin-sized. They've only had it a month. That's a great deal of sitting. I don't know what they were waiting for.",
    ],
    after: [
      "She lifted a slab this morning. Straight up, no left in it. I miss the left. I'll not put it back.",
    ],
    others: {
      tamar: ["She's lifting? Then Corby's a crane-hand again, and I'm not paying a man to look at timber. Don't tell him I timed him. Nine hours, yesterday. Looking."],
    },
  },

  sunken_mile: {
    title: 'The Sunken Mile',
    giver: 'tamar',
    about: "The Sunken Mile is an old causeway west of Mile-End Camp, a mile of pale stone with the water over it. Five of the drowned stand on it where Tamar Dyke's gang worked, and the gang has gone home. Go out on the Mile and put down four of them.",
    offer: [
      "There's a causeway, west, a hundred and thirty paces. A mile of old stone with the water over it to the ankle. The Sunken Mile. It's my living. It's the only dry way to the west pools, too, if anybody still wanted to go.",
      "We were lifting the ninth slab. There are people standing on it. In the water. Not jelly. People, and they turned round, all together. Eleven of my gang were on the Fen Way before I'd put my bar down. Clear it. I'll not ask how.",
    ],
    accept: "I'll clear the causeway.",
    acceptLine: "West, where the pale slabs go out into the reeds. Stones under the water, in a line; keep to the flat ones. If they call to you, they'll be very polite about it. Don't answer. I counted five, before I ran. I ran well.",
    decline: 'Not the Mile.',
    declineLine: "No. I wouldn't either. I didn't. I'm stood here.",
    journal: [
      "The drowned stand on the Sunken Mile, the old causeway a hundred and thirty paces west of Mile-End Camp. Go out onto it.",
      "Put down four of the five drowned who stand on the Sunken Mile.",
      "Go back to Tamar Dyke at Mile-End Camp.",
    ],
    progress: [
      "The causeway. West. Five of them, I counted. Four would give me my slabs back.",
    ],
    done: [
      "Four. You're wet to the thigh and you're shaking. Sit. Drink this. It's only nettle, but it's hot. ...And the fifth? Still stood there? With his hand out?",
      "Then that's the toll. They kept a toll at this end, a penny a wheel. He's still asking it. Leave him. I'll pay him. A penny's cheaper than a fight, and I've paid worse men for less road. Here. That's yours.",
    ],
    after: [
      "I pay him every morning. A penny, in his hand. He closes it. Next day it's open again and there's no penny. I've stopped wondering where they go. I put it down as a cost.",
    ],
    others: {
      corby: ["She pays the one on the slabs a penny a day. I asked what for. She said passage. I said you're only going twenty yards. She said then it's cheap."],
    },
  },

  thrown_back: {
    title: 'Thrown Back',
    giver: 'tamar',
    about: "Every morning what Tamar Dyke lifted off the Mile the day before is back in the water. The goblins of Leechwater Camp, west of Mile-End past the causeway, come over at night and throw it in. Empty the camp: every one of them, and their king.",
    offer: [
      "I've lifted the same pig of lead three times. I know it by the dents. Up on the crane by day, on the heap by dusk, and back in the Mile by morning. That's not salvage. That's a pump.",
      "Leechwater. West, on the hump past the causeway. They come over at night, two to a load, and put it all back. Not for themselves. They don't keep a nail of it. They carry it to the edge, and in it goes, and they clap. Empty that camp. The king as well.",
    ],
    accept: "I'll empty Leechwater.",
    acceptLine: "West along the Mile and on, four hundred paces, up the hump. Corby's blocks came from round it. The king sits highest. He throws, and what he throws spreads. Don't be where he's looking. And mind the spitters: it sticks.",
    decline: 'Not yet.',
    declineLine: "Then I lift it a fourth time. I'm paid by what's on the heap at Michaelmas. Go on.",
    journal: [
      "Goblins from Leechwater Camp, west of Mile-End past the Sunken Mile, throw Tamar Dyke's salvage back into the water every night. Empty the camp: put down every one of them, and their king.",
      "Go back to Tamar Dyke at Mile-End Camp.",
    ],
    progress: [
      "West, on the hump. All of them, and the king. If you see a pig of lead with three dents in it, it's mine. They all are.",
    ],
    done: [
      "Empty. Good. And my lead? ...In a pool. In the middle of their camp. With everything else. Slabs. A cart. Their own pots. Their own king's chair, you say.",
      "Here. ...So they weren't robbing me. They think that's what the place is for. A mile of stone went into this fen in a night; they've only been keeping it up. I've been at war with a parish custom. Well. It's ended.",
    ],
    after: [
      "The heap stays where I put it. I had Corby drag their pool. Four ton of lead, and a goblin's hat. I've kept the hat. It's on the scale.",
    ],
    others: {
      corby: ["We dragged their pool. She lifted a cart out of it. A whole cart. I asked her where they'd got a cart. She'd nothing to say. She looked proud of them."],
    },
  },

  the_sunk_plot: {
    title: 'The Sunk Plot',
    giver: 'tamar',
    about: "The toll-keepers' burying ground, south-south-west of Mile-End Camp, went under the same night as the Mile. For every slab Tamar Dyke lifts off the causeway, one more stands up in the Plot next morning. Empty it: every one of them, and whatever calls them up.",
    offer: [
      "The toll kept its own burying ground. South-south-west, two hundred and eighty paces. It went under the night the Mile did. The Sunk Plot. You can see the stones standing out of the wet, and what stands between them.",
      "I keep a tally. A slab off the Mile by day; one more stood up in the Plot next morning. Forty-one slabs. Forty-one stood. I'm a salvager; I know when I'm being charged. I'll not pay it. Empty the Plot. And whatever's keeping the book.",
    ],
    accept: "I'll empty the Plot.",
    acceptLine: "South-south-west, the trodden way past the spoil. There's a tall one in the middle, a woman, who sings to the water, and it comes. Get to high ground when she lifts her arms. The small ones hold your legs. Don't let them.",
    decline: 'Not yet.',
    declineLine: "No. Then I lift nothing tomorrow. I can't afford forty-two.",
    journal: [
      "The dead stand up in the Sunk Plot, the toll-keepers' burying ground south-south-west of Mile-End Camp, one for every slab lifted off the Mile. Empty it: put down every one of them, and the one who calls them.",
      "Go back to Tamar Dyke at Mile-End Camp.",
    ],
    progress: [
      "South-south-west. The Plot. All of them, and the tall one who sings. Count them for me, if you've the leisure.",
    ],
    done: [
      "All of them. How many? ...You didn't count. No. But more than forty-one. More than there are stones in that Plot. Half of them children, and the toll never buried a child there.",
      "So it wasn't a charge. My tally was a salvager's tally: I counted what I'd lifted and thought it was about me. She'd have called them if I'd never touched a slab. Here. I priced that wrong. I don't, often.",
    ],
    after: [
      "I've burned the tally. First paper I've burned in my life. Corby asked was I ill.",
    ],
    others: {
      corby: ["She burned a paper. With figures on. I've seen her go into the water after a paper with figures on."],
    },
  },

  under_the_mile: {
    title: 'Under the Mile',
    giver: 'tamar',
    needs: 'sunken_mile',
    hint: DELVE_HINT,
    about: "With the Mile cleared, Tamar Dyke has found the water by its broken arch going down into a stair: the old toll's strongroom, under the causeway. Something wallows at the foot of it. Go down, with a company, and kill it.",
    offer: [
      "I went back out on the Mile. The water by the broken arch is going down. Not drying. Going down, into a stair. There was always a stair. The old toll kept its strongroom under the causeway. A year I've dug lead, and the strongroom was under my boots.",
      "Something's wallowing at the foot of it. I heard it breathe, and then I heard it stop, the way you stop when you've noticed somebody. I'd like it dead before it comes up for air. And before I go down there with a lantern and a sack. Would you look?",
    ],
    accept: "I'll go down the stair.",
    acceptLine: "By the broken arch, where the slabs tip. It's a doorway now, with a light in it, and a sergeant stood by it. It won't take one alone, he says: bring a company. And if the thing swells up, get something between you and it.",
    decline: 'Not under the fen.',
    declineLine: "No. I only went as far as the first step, and I've washed three times since.",
    journal: [
      "A stair has opened by the broken arch of the Sunken Mile, west of Mile-End Camp: the old toll's vaults, drowned. Go down, with a company.",
      "Kill the Bloat, which wallows in the Drowned Vaults.",
      "Go back to Tamar Dyke at Mile-End Camp.",
    ],
    progress: [
      "The stair by the broken arch. Something big, in a pool, breathing. That's all I know, and it's more than I wanted.",
    ],
    done: [
      "It burst? No, don't tell me. Tell me it's dead and tell me nothing else. ...Good. Sit. You smell of the fen and of something I haven't a name for. And the strongroom? ...Under water. Of course it is.",
      "This was my mother's. Oiled wool; it's kept the damp off two of us on this Mile. You'll need it more than its peg does, where you keep going.",
    ],
    after: [
      "I've been down four steps. With a lantern. There's a door at the bottom with the toll's lock on it. I've a bar that'd have it off. I've not fetched the bar.",
    ],
    others: {
      corby: ["She wants me to rig a line down that stair. I said the crane's not for holes. She said everything's a hole if you stand in the right place."],
    },
  },

  what_sank_the_mile: {
    title: 'What Sank the Mile',
    giver: 'tamar',
    needs: 'under_the_mile',
    hint: DELVE_HINT,
    about: "Stone on a hard bottom doesn't sink unless something takes the bottom away. Below the Bloat's wallow, in the Drowned Vaults, a woman's voice is calling the water in; and under her is whatever dug out the fen from beneath a mile of causeway. End both.",
    offer: [
      "I know stone. A causeway on a hard bottom doesn't sink. Not in a night, not in a hundred years. Not unless something takes the bottom away. I've said that to buyers for a year, as patter. I should have listened to it.",
      "So it's still there. Whatever dug the fen out from under a mile of stone is at the bottom of those vaults, where the water all goes. And there's a woman's voice down there calling the water in. End both.",
    ],
    accept: "I'll go to the bottom.",
    acceptLine: "Past where the big one was, and round, and down. When the water comes up, find the high ground. When the mud moves, don't stand still. That's fen sense. It's all I've got to give you that isn't lead.",
    decline: 'Not yet.',
    declineLine: "No. Nor would I. But the Mile's sinking a hand a year, and I've counted my hands.",
    journal: [
      "Below the Bloat's wallow a voice is calling the fen in. Kill Mother Sallow, the Tidecaller, in the Drowned Vaults.",
      "At the bottom of the Vaults is what sank the causeway. Kill the Leviathan of the Mile.",
      "Go back to Tamar Dyke at Mile-End Camp.",
    ],
    progress: [
      "The bottom. Where the water goes. The voice first, I think; then the thing itself.",
      "High ground when it floods. Keep moving when the mud does.",
    ],
    done: [
      "A worm. The length of the Mile's first reach, and it ate the bottom out of a causeway. And you went down a hole after it. I'm going to make you something hot, and you're going to drink all of it.",
      "Here. It came up on the crane the first week, tangled in a cramp. I never knew what to do with a staff. It was the one thing off this Mile I couldn't price. You'll know what it's worth.",
    ],
    after: [
      "I stood on the Mile and stamped. It stamped back, like ground. I'll not raise it. It's earned its lie-down. But I'll walk on it.",
    ],
    others: {
      corby: ["She stamped on the Mile for a quarter of an hour. Up and down it, stamping. I've not seen her so pleased since the lead went to fourpence."],
      orrin: ["A burrowing thing, under the old causeway? A salvager told me stone doesn't sink unless something takes the bottom away. I wrote it down as a saying. I shall have to move it to another page."],
    },
  },

  the_crossing: {
    title: 'The Crossing',
    giver: 'tamar',
    needs: 'the_sunk_plot',
    about: "Tamar Dyke won't raise the Sunken Mile: so the only way over the fen is the ferry at Sallowmere again, as it was before the Mile was built. Tell the ferrywoman, Grizel Wade. Sallowmere is a quarter of an hour north along the Fen Way, and the drowned stand among the huts where the road comes down to its south shore: put down four going through. Grizel keeps the east jetty. It's paid there.",
    offer: [
      "There's a ferry at Sallowmere, north. A family called Wade. They had the crossing before the Mile was built. The Mile put them out of work for two hundred years, and they sat on the bank and waited for it to fall down. Then it did.",
      "Somebody ought to tell her it's not coming back up. I lift it; I don't mend it. Tell Grizel Wade the crossing's hers, from me, who'd know. Mind the huts, where the road meets the water. It was the fishers' end. They're still in. Four down, and the rest will let you by.",
    ],
    accept: "I'll tell the ferrywoman.",
    acceptLine: "North on the Fen Way, a quarter of an hour, to the mere. They're in the huts on legs at the water's edge. Then round the shore to your right, to a jetty with half of it gone and a boat tied to it. There's a pedlar camped on it; ask him. She'll want a penny. Don't pay it.",
    decline: 'Not now.',
    declineLine: "Then she goes on waiting. She'll not mind. It's in the blood.",
    journal: [
      "Tamar Dyke's word for the ferrywoman is that the Mile won't be raised. The drowned stand among the fishers' huts where the Fen Way comes down to Sallowmere, a quarter of an hour north of Mile-End Camp: put down four of the five.",
      "Find the half-sunk jetty on Sallowmere's east shore, round the mere to the right of the huts. A chapman, Davy Scrip, is waiting there for the ferry: ask him for the ferrywoman.",
      "Give Tamar Dyke's word to Grizel Wade, the ferrywoman, sat by her boat at the jetty.",
    ],
    progress: [
      "North, the Fen Way, to the mere. Four at the huts. Then the east jetty. Grizel Wade. The crossing's hers.",
    ],
    done: [
      "The salvager says that? Not coming up? ...Seven Wades have sat on this bank to be told so. My mother had it all ready, what she'd say. I've forgotten the most of it. It was rude.",
      "And you came through the huts. Four? Then that's Hal Reedy, and the Marrams. I'll not ask which was the fourth. So the crossing's mine, and everybody I'd carry is walking. Sit down. I've a use for somebody who isn't.",
    ],
    after: [
      "The carter says she laughed. Then she charged him a penny for bringing word that she'd laughed. That's a Wade. I'd have done the same.",
    ],
    others: {
      grizel: [
        "The salvager says that? Not coming up? ...Seven Wades have sat on this bank to be told so. My mother had it all ready, what she'd say. I've forgotten the most of it. It was rude. Here. News is a penny. That was a great deal of news.",
        "And you came through the huts. Four? Then that's Hal Reedy, and the Marrams. I'll not ask which was the fourth. So the crossing's mine, and everybody I'd carry is walking. Sit down. I've a use for somebody who isn't.",
      ],
      davy: ["Word for the ferry? From the Mile? Then say it loud, and say Davy Scrip's first in the queue. I'm the queue. That's her, sat by the boat, not looking at me. Nine days she's not looked at me. She'll ask you for a penny. Everybody pays but me; I've not been let."],
    },
  },

  his_fathers_punt: {
    title: "His Father's Punt",
    giver: 'tamar',
    needs: 'the_sunk_plot',
    about: "Tamar Dyke's crane has lifted an eel-punt off the Sunken Mile, forty years drowned, with the Hallams' mark burned in its thwart. There's a Hallam still at Eelpot Hythe, far off the roads to the east: half an hour by the lane. Tell Pike Hallam. It's paid there.",
    offer: [
      "We lifted a punt off the Mile last week. Under a slab; it had gone down with the stone. Forty years in the peat and you could float her tomorrow. There's a mark burned in the thwart. A pike, the fish, and a letter H.",
      "That's Hallam. Eelpot Hythe, east, off every road there is. There's one of them left, they say. I don't sell a man's father's boat without asking. I'd sell it after. Go and tell Pike Hallam what I've got, and that it's his for the carriage.",
    ],
    accept: "I'll go to Eelpot.",
    acceptLine: "North a little on the Fen Way, then the lane east: half an hour, and it's a lane in the way a ditch is. There are goblins camped on it about half way. Go round or go through. You'll know the Hythe by a barge's hull, upside down, with smoke coming out from under it.",
    decline: 'Not now.',
    declineLine: "Then she sits on my heap. I'll not sell her. Not this month.",
    journal: [
      "Tamar Dyke has lifted a punt with the Hallams' mark off the Sunken Mile. Find Pike Hallam at Eelpot Hythe, far to the east of Mile-End Camp: north a little on the Fen Way, then half an hour by the lane.",
    ],
    progress: [
      "Eelpot Hythe. East, by the lane. Pike Hallam. A punt, with a pike and an H on the thwart.",
    ],
    done: [
      "A pike and an H. On the thwart. Burned, not cut. ...He burned it in with the poker the night I was born. My mother said so. He went out to see what the noise was, the night the Mile sank. So he got there. He saw what the noise was.",
      "Tell her... no. You're not going back that lane today. I'll fetch it myself, when the wind lets me. There's a place been kept for him in the Graves forty years. I'd thought it'd want a body. A boat will do. Stop a while. There's work, and nobody else coming.",
    ],
    after: [
      "He came for it. Poled it home himself, the long way, by water. Never said a word but 'that's her'. Paid the carriage in smoked eel. I'd have let him off. He'd not be let.",
    ],
    others: {
      pike: [
        "A pike and an H. On the thwart. Burned, not cut. ...He burned it in with the poker the night I was born. My mother said so. He went out to see what the noise was, the night the Mile sank. So he got there. Here. You walked the lane for it.",
        "Tell her... no. You're not going back that lane today. I'll fetch it myself, when the wind lets me. There's a place been kept for him in the Graves forty years. I'd thought it'd want a body. A boat will do. Stop a while. There's work, and nobody else coming.",
      ],
    },
  },

  // ================================================================ Sallowmere (Grizel Wade; Davy Scrip)
  sallowmere: {
    title: 'What the Fen Keeps',
    giver: 'grizel',
    about: "The east shore of Sallowmere is the ferry's landing, and this spring the shore moved: it was jelly. Put down six of them, south along the shore from Grizel Wade's jetty, so a boat can be brought in again.",
    offer: [
      "The east shore's my landing. Seven Wades have run a keel up that mud. This spring the shore moved. It was jelly. Lots of it.",
      "They're slow until they aren't. My boathook did nothing; it came back shorter. Your fire might. They're south along the shore, eighty paces, where the mud shelves. Six would give me somewhere to land. Not that I've anyone to land. It's the principle.",
    ],
    accept: "I'll clear the shore.",
    acceptLine: "South along the water from the jetty. You'll see the mud breathing. Don't drink the mere. Don't let one sit on you; they hold on. And the big ones come apart into small ones, so don't stop to feel pleased.",
    decline: 'Not just now.',
    declineLine: "Then the shore keeps what it's got. It usually does.",
    journal: [
      "Jellies hold Sallowmere's east shore, eighty paces south along the water from Grizel Wade's jetty. Put down six of them.",
      "Go back to Grizel Wade at the jetty on Sallowmere's east shore.",
    ],
    progress: [
      "Six, I'd say. Fewer and they'll be back by morning. More and you'll get careless.",
    ],
    done: [
      "Six. You smell of the fen and you've got something green in your hair. Hold still. ...There.",
      "Here. And what's that you're carrying? Iron. A ring, the size of a plate. That's my mooring-ring. It went off the post in March. One of them had it inside? ...I'd blamed Davy for that. I'd said so, to his face. I'll have to buy more pins.",
    ],
    after: [
      "Ran her up on the east mud this morning, for the feel of it. Nobody in her. It felt like a landing all the same.",
    ],
    others: {
      davy: ["She's bought four papers of pins and said nothing. From Grizel that's a sermon and a handshake. What did I do? ...A ring? I never touched her ring. What'd a chapman want with a ring he can't carry?"],
    },
  },

  lights_on_the_mere: {
    title: 'Lights on the Mere',
    giver: 'grizel',
    dayHint: "By day there's nothing on the mere to follow. Grizel Wade's lights cross after dark: come back to the Drowned Yard at night.",
    about: "Every night lights cross Sallowmere, slowly, in a line, from the huts on the south shore toward the Drowned Yard, where Grizel Wade has rowed the fen's dead for forty years. Go by night to the Yard, north-north-east of her jetty, and see where they end. Then pick up what has been left along the path in.",
    offer: [
      "Every night since Candlemas: lights on the mere. From the huts to the north-east side. Slow. In a line. Not in a boat; I'd hear a boat. I'd know whose.",
      "North-east is the Yard. Forty years I've rowed Sallowmere's dead over to it. A penny a body; the family pays. Now something's going over without me, and I want to know where it fetches up. Go to the Yard after dark, and look. By day there's nothing to follow.",
    ],
    accept: "By night, then. I'll look.",
    acceptLine: "North-north-east, two hundred and eighty paces; the path leaves the shore behind the jetty. Go after dark. Stop short of the stones and watch. And look at the path under your feet as you come up to it. I've a notion. I hope I'm wrong.",
    decline: 'Not tonight.',
    declineLine: "No. Then I'll sit and count them over again. Eleven, last night.",
    journal: [
      "Lights cross Sallowmere by night toward the Drowned Yard. Go by night to the Yard, north-north-east of Grizel Wade's jetty, near enough to see who comes to it.",
      "The drowned walk round the mere to the Drowned Yard and stand among its stones. Along the path in, something glints: pick up five of them, the last hard by the Yard.",
      "Go back to Grizel Wade at the jetty on Sallowmere's east shore.",
    ],
    progress: [
      "The Yard. North-north-east, after dark. See where they go. Then the path.",
      "Five, off the path. Mind the last. It's nearer to them than I'd like.",
    ],
    done: [
      "The Yard. So they know the way. They ought to. I rowed most of their mothers there. ...And those? Give them here. Pennies. Old ones. That's a fare penny: see the notch? My mother cut that, so they'd not come round twice.",
      "They're paying. Walking it themselves, round by the shore, and still leaving the ferry's penny on the path. Forty years, and never a one of them tipped. I've never been so insulted, nor so... no. Here. That's yours. Not out of those.",
    ],
    after: [
      "I've the five pennies on the thwart. I'll not spend them. You don't spend a fare you never rowed.",
    ],
    others: {
      davy: ["She showed me a penny with a notch in it and asked was it good. I said good as any. She said it came off a dead woman's path. I said then it's better than most of mine."],
    },
  },

  the_drowned_yard: {
    title: 'The Drowned Yard',
    giver: 'grizel',
    needs: 'lights_on_the_mere',
    about: "The dead of Sallowmere walk to their own burying ground and pay the ferry for it, and then they stand there. Grizel Wade wants them lying down. Empty the Drowned Yard, north-north-east of her jetty: every one of them, and the tall one who called them out of the huts.",
    offer: [
      "They can pay all they like. They don't lie down. A yard's for lying down in. I didn't row them over there, forty years, a penny a body, to have them stood about in it like a market.",
      "There's a tall one among the stones. A woman, all weed. She's not one of mine. I never carried her; I'd know. She sings, and the huts empty, and they come. Put them down. All of them. Her first, if you can get at her. Then they're only where I left them.",
    ],
    accept: "I'll lay them down.",
    acceptLine: "The same path, north-north-east. When she lifts her arms the water comes up round your knees: get on a stone. The children hold on to you. And there's a hag at the back who throws. I'd tell you their names. Better I don't.",
    decline: 'Not yet.',
    declineLine: "No. Then they stand another night. They've the patience for it.",
    journal: [
      "The dead Grizel Wade rowed to the Drowned Yard stand among its stones, north-north-east of her jetty. Empty the Yard: put down every one of them, and the tall one who calls them.",
      "Go back to Grizel Wade at the jetty on Sallowmere's east shore.",
    ],
    progress: [
      "The Yard. All of them, and the one in the weed. Don't tell me who was nearest the gate.",
    ],
    done: [
      "Lying down? All? ...Then I'll go over tomorrow and see they're straight. In the boat. I'll take the pennies and put them back on the stones. A fare's a fare. I'll not be paid for a crossing I didn't make.",
      "Take this. It was in the boat one morning, eleven years back. In the bows, looking forward, like a passenger. I never found who set it there. It's never paid. A skull's no use to a ferry. It might be to you.",
    ],
    after: [
      "I rowed over. First crossing since Candlemas. Forty-one stones, and I said each name at it. Nobody answered. That's as it should be.",
    ],
    others: {
      davy: ["She took the boat out. Alone. Nine days I've asked, and she goes with nobody in it. ...She came back with her face washed. I didn't ask for the ferry. I sold her nothing. We had a quiet evening."],
    },
  },

  four_whistles: {
    title: 'Four Whistles',
    giver: 'davy',
    about: "Every spring Davy Scrip sold four tin whistles to four children at Sallowmere's huts. This spring four children were waiting for him on the west shore, where the chapel road comes round the mere, with their pennies held out. He ran. He wants three of them put down, and won't ask for the fourth. Ten minutes round the north of the mere.",
    offer: [
      "Tin whistles. Penny each. Every spring, four to the huts: the two Marram boys, Jenny Reedy, and a little one who never had her penny. I'd give her hers. A chapman can afford one whistle a year.",
      "I came round the mere by the west, this time. They were on the path. All four. Stood in a row with their hands out, and the pennies in them. Three pennies. I ran. I left a tray of ribbon. See to them. ...Three. I'll not ask for the fourth. I never did.",
    ],
    accept: "Three of them.",
    acceptLine: "Round the mere by the north, and west: ten minutes, where the chapel road comes down. Keep north of them. South of there something wallows that's bigger than both of us. They'll come at you quick. They always did run to meet me.",
    decline: 'Not that.',
    declineLine: "No. No, I'd not either. I didn't. Pins?",
    journal: [
      "Four children wait on Sallowmere's west shore for Davy Scrip, the chapman: ten minutes round the north of the mere from the jetty, where the chapel road comes down. Put down three of them.",
      "Go back to Davy Scrip at the jetty on Sallowmere's east shore.",
    ],
    progress: [
      "West shore, round by the north. Three. If one's very small, and hangs back... you'll do as you see fit.",
    ],
    done: [
      "Three. And the... no. Don't say. Did they still have them? The whistles? ...Round their necks. On the ribbon. It's good ribbon, that. It's the Reeds'. It doesn't rot.",
      "Here. It's more than three pennies. ...She'll want hers, the little one. If she's still stood there next spring, with her hand out and nothing in it. I'll take one round. I always gave her hers.",
    ],
    after: [
      "I've four whistles in the pack again. I'll not sell them this side of the mere. ...One of them's not for selling.",
    ],
    others: {
      grizel: ["Davy told you about the whistles. He's not told me, and I carried all four of those children over the mere the week they were born. He thinks I don't know why he came by the west. He was hoping."],
    },
  },

  forty_names: {
    title: 'Forty Names',
    giver: 'grizel',
    needs: 'the_drowned_yard',
    about: "The dead of the Drowned Yard are lying down again, and Grizel Wade wants them read over by someone whose trade it is. There is one sister left at the Drowned Chapel, north-west across the fen: twenty minutes by the chapel road, which passes under the harpies' roost at the black pool. Put down two of the three, and take Sister Oriel the names. It's paid there.",
    offer: [
      "I said their names at them. That's not the same as having them read. I'm a ferrywoman. I can get them over the water. I can't get them any further; that's a different trade, and I never had the hands for it.",
      "There's a sister at the Drowned Chapel yet. One. I carried her there when she was eleven, with a fever. Tell her Grizel Wade has forty names from the Yard to be read over. And one I haven't. She'll know what to do about that. I don't.",
    ],
    accept: "I'll take her the names.",
    acceptLine: "Round the mere by the north, then the chapel road north-west: twenty minutes. Half way there's a black pool with three harpies roosting over it; have two down or they'll have your hat. Come at the chapel from the east. Not the south. There's a thing asleep, south. Leave it so.",
    decline: 'Not now.',
    declineLine: "Then they lie unread. They've lain worse.",
    journal: [
      "Grizel Wade wants the dead of the Drowned Yard read over. Three harpies roost over the black pool beside the chapel road, north-west of Sallowmere: put down two of them.",
      "Find Sister Oriel at the Drowned Chapel, on north-west by the chapel road. Come to it from the east, not the south.",
    ],
    progress: [
      "North-west, the chapel road. Two harpies at the black pool. Then the sister. Forty names, and one I haven't.",
    ],
    done: [
      "Grizel Wade. She is alive, then, and still charging. Forty names. She will have them by heart, and in the order she carried them. And one she has not. That will be the one who sang. I shall read for her as well. One reads for whoever was there.",
      "At the fourth watch, then; it is the hour for it. I have no book. That is a difficulty, and since you came by the pool dry-shod, perhaps it is yours. Stay, if you will. This house has work, and I have been its only hands.",
    ],
    after: [
      "There was a light north-west, at the hour before dawn. Small. I'd not seen one there in a year. So she's read them. I'll row over and tell them so. No. They'll know.",
    ],
    others: {
      oriel: [
        "Grizel Wade. She is alive, then, and still charging. Forty names. She will have them by heart, and in the order she carried them. And one she has not: the one who sang. I shall read for her as well. Take this, for the road. It was in the alms dish. Nobody else has come for it.",
        "At the fourth watch, then; it is the hour for it. I have no book. That is a difficulty, and since you came by the pool dry-shod, perhaps it is yours. Stay, if you will. This house has work, and I have been its only hands.",
      ],
    },
  },

  // ================================================================ Eelpot Hythe (Pike Hallam)
  five_knots: {
    title: 'Five Knots',
    giver: 'pike',
    about: "The Mere Coven, south-west of Eelpot Hythe, sells wind tied up in knotted cord, and the Hythe has bought it for longer than anyone remembers. The cords hang on stakes round the ring. Pike Hallam wants five, taken and not paid for: three hang well out from the ring, two close in. Don't undo one.",
    offer: [
      "South-west there's a ring of stakes, with folk in hoods stood in it. The Coven. They sell wind. Three knots on a cord: undo one for a breeze, two for a blow. Nobody undoes the third. My father paid a basket of eels a cord. So did his.",
      "This year the price went up. It's not eels. They've not said what. They looked at me, and then at the hull, and then at me. I'll not pay it. But I can't lift a pot in this. Fetch me five cords off their stakes. Three hang well out. Two are close in. Don't undo one.",
    ],
    accept: "Five cords. Not undone.",
    acceptLine: "South-west, two hundred and fifty paces; there's a path, and we made it, more shame to us. Grey cord, three knots, tied to a stake at head height. They hum when the wind's in them. Carry them in your fist, not your pocket.",
    decline: 'Not now.',
    declineLine: "Then I fold the nets again. I'm quick at it now.",
    journal: [
      "The Mere Coven, south-west of Eelpot Hythe, sells wind in knotted cords hung on stakes round its ring. Take five of them: three hang well out from the ring, two close in. Don't undo one.",
      "Take the cords back to Pike Hallam at Eelpot Hythe.",
    ],
    progress: [
      "Five. Three wide, two close. In your fist. If one comes undone on the way, lie down flat and tell me after.",
    ],
    done: [
      "Five. Give them here. ...I'm going to undo one. I know what I said. Stand in the lee of the hull. There. ...Nothing. Not a breath. Try the second. Nothing.",
      "Here. That's for the fetching. ...Three generations of Hallams, a basket a cord. It's string. The wind was never in the cord. It was in them. We weren't buying wind. We were paying them not to send it. That's a different trade. That one has a name.",
    ],
    after: [
      "I've hung the cords on the smoke-house door. Forty years of them would've gone round the hull twice. My father kept every one, in a box. I've burned the box.",
    ],
  },

  the_price_of_wind: {
    title: 'The Price of Wind',
    giver: 'pike',
    needs: 'five_knots',
    about: "The Mere Coven never sold Eelpot Hythe its wind: the Hythe paid them not to send it. Now they want more than eels, and the wind hasn't dropped since Martinmas. Empty the ring, south-west of the Hythe: every one of them, and the two who do the calling.",
    offer: [
      "So it's not a shop. It's a toll. And they've put the toll up, and I know what they looked at when they named it. There's one of me. There's no basket that holds that.",
      "South-west. The ring. All of them. There's an old one who reads the stones and a young one who calls the weather, and the weather comes. It'll come for you. It set a forty-foot barge on its back for being slow with a basket. Think what it'll do to somebody who's rude.",
    ],
    accept: "I'll empty the ring.",
    acceptLine: "The same path, south-west. When the young one lifts her hands, look up, and don't be under where it's going dark. The hooded ones throw from the back. Close on them. They're only strong at a distance. So's most weather.",
    decline: 'Not yet.',
    declineLine: "No. It's a deal to ask. I'll pay them in nothing a while longer, and see what nothing costs.",
    journal: [
      "The Mere Coven, south-west of Eelpot Hythe, sends the wind the Hythe once paid it to hold back. Empty the ring: put down every one of them, and the two who call the weather.",
      "Go back to Pike Hallam at Eelpot Hythe.",
    ],
    progress: [
      "South-west. All of them, and the two in the middle. I'll know. I'll feel it drop.",
    ],
    done: [
      "It dropped. An hour since. I was folding a net, and it lay down in my hands like a dog. I've not heard the reeds stand still since I was a boy. I'd forgotten they made a noise at it.",
      "Here. I'd say it's what I'd have paid them. It's not. It's more. I'd sooner you had it. ...I'll stake the nets tonight. With pegs. I'll have to find the pegs.",
    ],
    after: [
      "Wind's gone round to the north. Then east. Then it stopped a whole day. That's weather. I'd forgotten weather doesn't mean anything by it.",
    ],
  },

  kept_empty: {
    title: 'Kept Empty',
    giver: 'pike',
    about: "The Hythe buries its dead in the reed, feet to the water, north-east of Eelpot. One grave there has been kept open and empty forty years, for Pike Hallam's father. Now the Reed Graves are sitting up. Empty them: every one, and whoever is calling them. And look in the empty one.",
    offer: [
      "North-east, the Graves. We lay ours in reed, feet to the water, and stand their glaive at the head. Forty graves. One's been kept open forty years, lined fresh each spring. My father's. For when he came home. My mother did it, and then I did.",
      "They're sitting up. I see the lights, nights. I'll not have him come home to that: his place, and the neighbours all stood round it. Lay them down. All of them. And look in his. I've not been able to. Tell me it's empty. Or tell me the other.",
    ],
    accept: "I'll lay them down, and look.",
    acceptLine: "North-east, two hundred and fifty paces; the path's the one we carry them by. A tall one sings the water up: get off the low ground when she does. His is the last on the left, with no glaive. You'll know it. It's the tidy one.",
    decline: 'Not yet.',
    declineLine: "No. Then I'll line it again in spring, and not look. I'm practised.",
    journal: [
      "The dead of Eelpot Hythe are sitting up in the Reed Graves, north-east of the Hythe. Empty the Graves: put down every one of them, and the tall one who calls them. The grave kept empty is the last on the left, with no glaive at its head.",
      "Go back to Pike Hallam at Eelpot Hythe and tell him what was in his father's grave.",
    ],
    progress: [
      "North-east. All of them. Then the last on the left. Empty, or the other. I'll take either. I can't take not knowing.",
    ],
    done: [
      "Quiet. All of them. And his? ...Empty. Lined, and dry, and empty. And every one of the others turned to face it. Forty years of neighbours, got up out of the reed to look at the one bed nobody was in.",
      "They were waiting for him, same as me. Take this. His glaive; it never went in the ground, having nobody to stand over. Three tines, on ash. Knock the tines off and it's a staff. He'd say it always was, and the eels were incidental.",
    ],
    after: [
      "I've put the punt in it. Keel down, lined round with reed. It fits. He always said she was the best part of him. The neighbours are lying easy. So am I, some nights.",
    ],
    others: {
      tamar: ["He buried the punt? A sound punt, forty years in peat, tight as a drum? ...No. No, I'd not have got eight shillings for her anyway. Say I said seven."],
    },
  },

  // ================================================================ the Drowned Chapel (Sister Oriel)
  leaves_on_the_water: {
    title: 'Leaves on the Water',
    giver: 'oriel',
    about: "When the west end of the Drowned Chapel dropped, the office-book went off its desk into the water that stands in the nave, and its leaves have washed out through the empty windows. Things live in that water now. Sister Oriel has forty names to read and no book. Bring back five leaves from round the chapel's walls.",
    offer: [
      "The book stood on a desk at the west end. At Michaelmas the west end went down a hand in a night, and the desk with it. The binding gave. The leaves have gone out through the windows and lie round the walls, in the wet.",
      "I would fetch them. But something has come into the water of the nave. Black, and slow, with bones in it that are not ours. It comes out at whoever walks the walls. I have forty names to read, and I would read them from the page. Five leaves would be the office, near enough.",
    ],
    accept: "Five leaves.",
    acceptLine: "They are all outside the walls: two by the sunk end, one against the south side, one at the east under the gable, one on the north by the graves. Vellum; it does not mind water. The black things mind fire. Do not go into the nave for any reason.",
    decline: 'Not now.',
    declineLine: "Then I shall read from memory. It is a good memory. It is fifty years old.",
    journal: [
      "The leaves of the Drowned Chapel's office-book lie round the outside of its walls, where black jellies come out of the nave's water. Pick up five of them.",
      "Take the leaves back to Sister Oriel, by the graves on the chapel's north side.",
    ],
    progress: [
      "Five, from round the walls. Outside them. If one of the black things has a leaf in it, I would rather have the leaf than the courtesy.",
    ],
    done: [
      "Five. Let me see. ...This is washed clean. And this. And these two. Not a letter left; the fen has had the ink. I had thought vellum did not mind water. It is the ink that minds.",
      "And this. Dry. Every word. It was inside one of them? ...It is the office for the fourth watch. The one leaf of that book nobody has opened in forty years but me, and that is the one it kept. I do not know what to make of that. I shall read from it tonight. Take this.",
    ],
    after: [
      "I read the forty names from the leaf's margin, where I had written them small. And the one that Grizel had not. I gave her the name Avice. It was to spare.",
    ],
    others: {
      grizel: ["She read them? From the book? ...One leaf. Well. One's enough, if it's the right one. I got forty over the water in a boat that'd shame a duck."],
    },
  },

  seven_lamps: {
    title: 'Seven Lamps',
    giver: 'oriel',
    about: "Seven lamps on posts marked the plank path to the Drowned Chapel through the mire. The goblins of the Reed Stockade, north-east of the chapel, have carried them off. Bring back five from round the stockade: three lie well out from it, two close in.",
    offer: [
      "There were seven lamps on the path in, on posts, a chain apart. One for each of the hours a traveller might be abroad. I trimmed them at dusk. It was the whole of what this house did for the road, and it was enough; nobody was lost between them in my time.",
      "The goblins of the stockade north-east took them in the autumn. All seven, posts and all, in one night. I do not grudge them the light. I do grudge them the road. Five would mark the path to the first firm ground. Three lie well out from their fence. Two are close in.",
    ],
    accept: "Five lamps.",
    acceptLine: "North-east, two hundred and forty paces; they have trodden a way to it from the plank path, which was thoughtful. A horn lamp in an iron cage, the height of your knee. Carry them upright, if you would. I do not know why. I always have.",
    decline: 'Not now.',
    declineLine: "Then the path keeps its own counsel. It has, since autumn.",
    journal: [
      "Goblins of the Reed Stockade, north-east of the Drowned Chapel, took the seven lamps from the chapel's path. Pick up five of them: three lie well out from the stockade, two close in.",
      "Take the lamps back to Sister Oriel at the Drowned Chapel.",
    ],
    progress: [
      "Five. Three well out, two close in. Upright, please.",
    ],
    done: [
      "Five. Thank you. Set them there. ...There is something in this one. And this. Frogs. They have been keeping frogs in them. One to a lamp, with a little weed. I cannot tell if that is a larder or a kindness.",
      "And this one has its oil yet. They never lit it; they did not know it was for lighting. Then it shall be the first. It will show as far as the mere, on a clear night. Take this. I shall put the frogs in the nave. No. I shall not put them in the nave.",
    ],
    after: [
      "Five lamps on the path, and one lit each dusk, in turn, to spare the oil. The frogs are in the alms dish. They seem content. It is more than the dish has held in a year.",
    ],
    others: {
      grizel: ["So that's her light. I'd wondered. North-west, low, where there's been none since autumn. I've hung my own on the post again. Somebody ought to answer."],
    },
  },

  rung_wrong: {
    title: 'Rung Wrong',
    giver: 'oriel',
    about: "The bell of the fourth watch went into the mire with the west end of the Drowned Chapel. The goblins of the Reed Stockade, north-east, pulled it out and hung it, and ring it whenever they eat. Sister Oriel can bear a bell that's silent, and not one that's rung at the wrong hour. Empty the stockade: every one of them, and their king.",
    offer: [
      "You will have heard it. A bell, north-east, at no hour at all. Noon. Dusk. Twice in the night. That is the bell of the fourth watch. It went into the mire with the west end, and I said the office for it, as for a sister. The goblins of the stockade had it out within the week.",
      "They ring it when they eat. I have borne forty years of its silence; that was obedience. I cannot bear it rung for dinner. The fourth watch is rung at the fourth watch. Empty the stockade. All of them, and the one who pulls the rope. He is the largest. He would be.",
    ],
    accept: "I'll empty the stockade.",
    acceptLine: "North-east, where you found the lamps. Their king throws what is to hand, and it scatters: do not stand before him. The small ones spit, and it holds the feet. I ask one thing more. Do not ring it. Not even once, to see.",
    decline: 'Not yet.',
    declineLine: "No. Then I shall say the office through it. One can. One would rather not.",
    journal: [
      "Goblins at the Reed Stockade, north-east of the Drowned Chapel, have the bell of the fourth watch and ring it at their meals. Empty the stockade: put down every one of them, and their king.",
      "Go back to Sister Oriel at the Drowned Chapel.",
    ],
    progress: [
      "North-east. All of them, and the one at the rope. And do not ring it.",
    ],
    done: [
      "Quiet. Since a little after noon. I noticed at once. ...I find I have been keeping time by it. Wrong hours and all. Noon, dusk, twice in the night: I knew where I was in the day. Forty years I told myself I did not miss it. One season of goblins' dinners, and I am found out.",
      "It will stay where they hung it. I cannot carry it, and I will not ring it; the order said stop. But I shall know it is there, and whole. Take this: the hours of the fourth watch, in my hand, from memory. It is a scroll. It will do more in yours than it has in mine.",
    ],
    after: [
      "I walked out to the stockade and stood under it. I did not ring it. I put my hand flat on it, in the wind, and it hummed. That is not ringing. I have examined my conscience on the point.",
    ],
    others: {
      grizel: ["The bell's stopped. I'd set my day by it since autumn; I knew it was goblins and I set my day by it all the same. She'll have had it stopped. She'd be right. I'll miss it. Don't tell her."],
    },
  },
};
