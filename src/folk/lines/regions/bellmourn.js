// Bellmourn and the four roads out: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/bellmourn.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it: nobody at a camp names Velscour or Tessariel, and no line anywhere names anything of the one
// beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs reads every line for it).
//
// The four at the ring camps, each with a voice of their own (tools/folk/cast.md, "The four roads out"): Tobin Wain the
// carter (loads, wheels, the hill, his mare), Nan Dray the drover (beasts, feet, salt), Old Perrin Lowe the palmer (paces,
// the seven stations, forty-one walks), Maren Rush the withy-cutter (rods, ties, her hands never still).
const DELVE_HINT = "The portal won't open for one alone: Captain Merrow Vale, beside the Warrens' portal on the hill north-east of Bellmourn, hires out a company.";

export const LINES = {
  // ---------------------------------------------------------------- Hillfoot Halt
  tobin: {
    first: [
      "Whoa. Not you; the mare. She backs up for strangers. ...On foot, from the town end, with a skull where a man keeps his dinner. Tobin Wain. This is the Halt. Carts stop here before the hill. Lately they stop here instead of it.",
    ],
    greet: {
      morning: [
        "Greased both axles before light. Nowhere to go on them. A man likes to be ready.",
        "Mist on the hill. You can't see the bend from here. You can't see it from the bend either.",
      ],
      day: [
        "Four carts a day went up that hill, the year the mare was foaled. Today it's been you.",
        "If you're selling, I'm buying. A carter with no load takes what he can get.",
      ],
      evening: [
        "Chocks are under the wheels. I do that at dusk, on the flat, with nothing on the cart. Thirty years of hill does that to a man.",
        "Sit by the fire if you're stopping. Mind the mare. She thinks the warm side is hers.",
      ],
      night: [
        "Hear that? Scratching, down by the wheels. They wait till the fire's low.",
        "I sleep under the cart. It's the one roof I trust. I know what it weighs.",
      ],
    },
    about: [
      "Tobin Wain. I cart between Bellmourn and the Downs. Barley up, flour down, and whatever else can't walk.",
      "The Halt's where you rest a horse before the hill and check your pins after it. I've stopped here thirty years. This year I've stopped here since spring.",
    ],
    ask: {
      dead: [
        "They don't trouble a cart. They step aside for it, most of them, as if they remembered what one was. It's the little live things that rob me.",
      ],
      town: [
        "Bellmourn's the flat end of my road. I know every house by what it sends up the hill. Fenwick's barley, the Brewers' empties. A coffin once, for Millhaven. That one I drove slow.",
      ],
      hill: [
        "A mile of climb and one bad bend. You take it loaded, at a walk, and you don't stop, because you'll not start again. Everything I know is that.",
        "Everything's a load. It's only a question of how far.",
      ],
      mare: [
        "Pudding. She's nineteen and she's pulled more than you've ever lifted. She won't go past the Halt this year. She stands and stares south-east. I trust her nose over my eyes.",
      ],
    },
    topics: { hill: 'The hill', mare: 'The mare' },
    bye: [
      "Mind the bend.",
      "Go steady. Loaded or not.",
    ],
    barks: {
      player: ["Don't stand behind her.", "Buying, selling, or leaning?"],
      morning: ["Axles are greased.", "Can't see the bend."],
      day: ["Four carts a day. Once.", "Steady, Pudding."],
      evening: ["Chocks are in.", "Fire wants a log."],
      night: ["Scratching. By the wheels."],
      magic: ["Easy! Easy, girl! ...Warn a man.", "That'd shift a load."],
    },
    shop: {
      open: [
        "It's what was on the cart when the road shut. Rolls, clean linen. And I'll buy what you're carrying: a cart ought to have something on it.",
        "Lay it on the tailboard. You'll get a carter's price, which is fair and not a penny over.",
      ],
      closed: ["Not now. The mare's unsettled, and so am I."],
      buy: ["That's yours. Mind how you stow it."],
      sell: ["I'll take it. Somebody up the hill will want it, when there's an up the hill."],
    },
  },

  // ---------------------------------------------------------------- the Forkstone
  nan: {
    first: [
      "Stand still. Let me see your feet. ...Town boots, a long stride, and you don't know where to put that staff when you stop. Not a drover, then. Nan Dray. The stone's the Fork, the beasts are in my keeping, and the fire's anybody's.",
    ],
    greet: {
      morning: [
        "Up, are you? The beasts were up at four. They don't hold it against you.",
        "Frost on the stone. It'll be a hard road south today and a soft one west. Take your pick.",
      ],
      day: [
        "One way's the moor, the other's the fells. That's all a forkstone says, and it's said it since before there were roads.",
        "If you've something to sell, I'll look at it. I look at the teeth first, mind. Force of habit.",
      ],
      evening: [
        "Beasts are in the ring. You sleep outside it or inside it, but you don't sleep in the gap.",
        "There were three fires here at midsummer. Two went home by other roads. I'd beasts that couldn't be hurried.",
      ],
      night: [
        "Hush. Hear them shifting? Something's walking round us. Wide. It's been at it since the moon turned.",
        "I don't sleep nights. I sleep at noon, stood up, like a horse. Ask the beasts.",
      ],
    },
    about: [
      "Nan Dray. Drover. I take other folks' cattle where the grass is and bring them back fatter, and I'm paid by the head that comes home.",
      "Dray's my man's name. Tam. He's in Lychfield, north-east of here, these three years. I kept the name and the dog. The dog died.",
    ],
    ask: {
      dead: [
        "A beast knows a dead man from a live one at a furlong. They don't run. They turn their backs, all together, like a wedding at a drunk.",
      ],
      town: [
        "Bellmourn? I drive round it. A town's a place that wants to know what you've got and what it's worth. I know both already.",
      ],
      fork: [
        "The Frost Road goes on south, to the fells and the fort. The Barrow Track goes off south-west over the moor. Drovers have split their herds at this stone longer than Bellmourn's had a bell.",
      ],
      beasts: [
        "Forty-one head. Reds, mostly, and nine blacks of Amos Tye's that walked up the track on their own. Don't go through them with that skull. They've seen enough bone.",
        "You don't push a beast. You stand where it doesn't want to be, and it goes where you do. It works on people. I've not told them.",
      ],
    },
    topics: { fork: 'The Forkstone', beasts: 'The beasts' },
    bye: [
      "Go round the herd, not through.",
      "Mind your feet. The rest of you follows.",
    ],
    barks: {
      player: ["Not through the beasts.", "You stand like a gatepost."],
      morning: ["Frost on the stone."],
      day: ["Moor one way. Fells the other.", "Hup. Hup, now."],
      evening: ["In the ring. All of you.", "Shut the gap."],
      night: ["It's walking round us again."],
      magic: ["You'll have them over the stone! Stop that!", "...They never even looked up. Huh."],
    },
    shop: {
      open: [
        "Drovers trade at the stone; always have. I've rolls, and dressing for cuts, yours or a beast's. What've you got?",
        "Put it on the stone where I can see it. I buy by weight, and by whether I can carry it south.",
      ],
      closed: ["Not while the beasts are restless. Later."],
      buy: ["Done. Spat on and shaken, if you hold with that."],
      sell: ["I'll have it. Somebody on the moor's short of everything."],
    },
  },

  // ---------------------------------------------------------------- Palmers' Rest
  perrin: {
    first: [
      "Come in under the arch. Everyone does; it's the only door I have. You've walked a quarter of an hour and you look as if it were a week. Good. That's the right way to walk. Perrin Lowe. I'm a palmer. It means I've been somewhere and come back.",
    ],
    greet: {
      morning: [
        "Morning. I've swept the arch. There's nothing to sweep, but it's a habit, and I've few left.",
        "Forty-one times to the foot of the Horn, and every time I set out it was a morning like this. Damp. I blame myself.",
      ],
      day: [
        "Rest your feet. That's what it's called and that's what it's for.",
        "Nobody's come down the Pilgrims' Road in eleven days. They go up. I see them go up.",
      ],
      evening: [
        "The west goes dark first. It oughtn't, by the sun, but it does. I've stopped arguing.",
        "Soup's on. It's nettle. It's been nettle since the carters stopped.",
      ],
      night: [
        "Can't sleep? Walk round the arch seven times. It does nothing. But by the seventh you're tired.",
        "Listen. West of here, low. That's Mumblefast, saying its piece. It's not a prayer. I know what a prayer sounds like.",
      ],
    },
    about: [
      "Perrin Lowe. Old Perrin, since there was a young one, and he's dead. I've walked the seven stations to the foot of the Horn forty-one times. Now I keep the Rest, for those on their first.",
      "I've never gone up it. You walk to the foot and you turn round. That's the whole of it. People are disappointed.",
    ],
    ask: {
      dead: [
        "They walk the Pilgrims' Road too. Slow, heads down, in a line. With shells in their hats I'd take them for a guild. I let them by. They don't stop at the Rest, and I don't ask them to.",
      ],
      town: [
        "Bellmourn is where palmers buy the wrong boots. I tell them so at my arch, and they say the cobbler swore to them. He always swears. They're always wrong.",
      ],
      stations: [
        "Seven stones up the Pilgrims' Road, a day apart for a slow walker. At each you leave something and take a lead token off the peg. Seven tokens, and you've done it. Nobody's ever said what 'it' is. That's why it's lasted.",
      ],
      horn: [
        "The Sorrowhorn. North-west, the one with its head in cloud. There are lights up there some nights. I've seen them forty-one times and it's never once been my business.",
      ],
    },
    topics: { stations: 'The seven stations', horn: 'The Horn' },
    bye: [
      "Go easy. It isn't a race. Nobody's ever won it.",
      "Left foot, then the other. It's all I know.",
    ],
    barks: {
      player: ["Rest your feet. It's in the name.", "Under the arch, not round it."],
      morning: ["Swept the arch. Again.", "Damp. I blame myself."],
      day: ["Eleven days. Nobody down."],
      evening: ["Nettle soup. Don't ask what else."],
      night: ["That's Mumblefast. Not a prayer."],
      magic: ["Oh! ...Do that again. No. Don't.", "Forty-one walks, and I never saw THAT."],
    },
    shop: {
      open: [
        "Palmers leave what they can't carry and take what they forgot. That's all my board is. Rolls, and dressings for blisters. I'll take what's weighing on you.",
        "Set it down. I'll give you what it's worth to a man who has to carry it no further.",
      ],
      closed: ["Not just now. I'm resting my feet. It's allowed."],
      buy: ["Take it, and walk well on it."],
      sell: ["Left with me, then. Somebody will come by wanting exactly that. They always do."],
    },
  },

  // ---------------------------------------------------------------- Withy Landing
  maren: {
    first: [
      "Mind the bundles. No, those are drying. Those. Stand there. You're from town; you've the look of someone who's never had wet feet on purpose. Maren Rush. I cut withies. If it's woven and it's in Bellmourn, it grew here.",
    ],
    greet: {
      morning: [
        "Cut forty rods before light. They cut sweeter with the dew on.",
        "Water's up a hand since yesterday. The fen's leaning on us again.",
      ],
      day: [
        "Talk if you like. I can't stop; the bark sets if you leave it.",
        "That hull? It was a barge. It came up the cut one spring full of nobody, and I've kept my rods under it since.",
      ],
      evening: [
        "Midges. Stand in the smoke or be eaten. Those are the choices.",
        "I've a hurdle to finish by dark, and it's dark. Hold that end.",
      ],
      night: [
        "Lights out on the fen. Don't follow one. My cousin followed one. He came back a week on with one boot and no opinions.",
        "Quiet. The reeds only go quiet when something's standing in them.",
      ],
    },
    about: [
      "Maren Rush. Withy-cutter, like my mother, and hers. Baskets, hurdles, eel-traps, the wattle in half Bellmourn's walls.",
      "Willow's the only honest thing I know. Cut it to the ground and it comes back thicker. I've tried that with people. It doesn't take.",
    ],
    ask: {
      dead: [
        "They come up out of the wet some mornings and stand in my osier bed like herons. I work round them. One's been there since autumn. I've started hanging my coat on him.",
      ],
      town: [
        "Sabine buys my bark, the Reeds my finest rods, Hob my hurdles, and Silas my long baskets. I don't ask Silas what for. He told me anyway.",
      ],
      withies: [
        "Osier for baskets, crack willow for hurdles, white willow for the bark. Cut in the cold, boil, strip, dry. Done right, a rod will bend round your wrist a year on.",
      ],
      fen: [
        "North of here it's all water, with a road pretending. Sedgebank's the next dry foot, half an hour on. Odo Marsh there takes my rods for his traps. Past him I don't go. The water has opinions past him.",
      ],
    },
    topics: { withies: 'Withies', fen: 'The fen' },
    bye: [
      "Mind the bundles going out.",
      "Keep to the path. The rest is only pretending to be ground.",
    ],
    barks: {
      player: ["Not on the bundles.", "Hold this. No. Never mind."],
      morning: ["Water's up a hand."],
      day: ["Bark's setting. Can't stop."],
      evening: ["Midges. Get in the smoke."],
      night: ["Reeds have gone quiet."],
      magic: ["Not near the dry rods!", "Well. That's the midges gone."],
    },
    shop: {
      open: [
        "Rolls from town, and dressings I made myself: willow-bark lint. Works better than Sabine's, and I'll thank you not to tell her. What've you brought?",
        "Put it in the basket. Not that basket. I'll say what it's worth when I've a hand free.",
      ],
      closed: ["Not now. My hands are full."],
      buy: ["There. Keep it dry."],
      sell: ["I'll take it. It can go to town with the baskets."],
    },
  },

  // ---------------------------------------------------------------- placeholders: moved to their own region's file when
  // it's made (the six the ring's errands on are said to; what each says to the errand is in its quest's `others`).
  cuddy: {
    first: ["Up through the cairns on your own feet. Well. Cuddy Stone. I keep the beacon, when there's anyone to keep it for."],
    greet: {
      morning: ["Morning. The cairns are all where I left them. I look."],
      day: ["You can see four roads from here. Nothing on any of them."],
      evening: ["Light's going. That's when a beacon earns its oil."],
      night: ["Keep by the fire. The cairns aren't for walking among after dark."],
    },
    about: ["Cuddy Stone. Cairn-keeper at Cairnwatch, as my father was. I mind the stones and the light."],
    bye: ["Mind the path going down."],
    shop: { open: ["I've a little to sell and I'll buy what you've carried up."], closed: ["Not now."] },
  },
  amos: {
    first: ["You're no drover. You walk like you're going somewhere. Amos Tye. This is the Stance."],
    greet: {
      morning: ["Morning. Mist on the moor. Keep to the track."],
      day: ["Beasts are quiet. I don't trust it."],
      evening: ["Fire's lit. Sit where the smoke isn't."],
      night: ["Don't go out on the moor by night. There are lights. They're not ours."],
    },
    about: ["Amos Tye. Drover. I hold the Stance on the Barrow Track for whoever's driving over the moor."],
    bye: ["Keep to the track."],
    shop: { open: ["I'll trade. Drovers always will."], closed: ["Not now."] },
  },
  berin: {
    first: ["Who's that on the road? On foot, and no pack? Berin Stoat. Packman. This is Fellfoot, and that's the last flat ground you'll see."],
    greet: {
      morning: ["Morning. There's ice on the water butt. There always is."],
      day: ["The ponies know more about that fell than I do. I just walk in front."],
      evening: ["Cold's coming down off the top. Get by the fire."],
      night: ["Listen to that wind. It's got a long way to come, and nothing to stop it."],
    },
    about: ["Berin Stoat. I pack goods up to the fort on the fells with a string of ponies, and bring down what they've no use for."],
    bye: ["Wrap up. I mean it."],
    shop: { open: ["A packman's always selling. And buying, if it's light."], closed: ["Not now."] },
  },
  dag: {
    first: ["Dag Colley. Ashgate Halt. You'll have come from the east; nobody comes from the other way on foot."],
    greet: {
      morning: ["Morning. Wind's from the west. Shut your mouth when you walk; it's grit."],
      day: ["This is where the trees stop. I stop here too."],
      evening: ["Fire's lit. I keep it small."],
      night: ["Speak low. It carries, out here."],
    },
    about: ["Dag Colley. Carter. I hold the last halt on the west road before the grey ground."],
    bye: ["Go careful."],
    shop: { open: ["I buy and I sell. Not much of either, lately."], closed: ["Not now."] },
  },
  fenn: {
    first: ["Stand there. I saw you a hundred paces back. Fenn Hollis. Trapper. Don't touch the lines."],
    greet: {
      morning: ["Morning. Two snares sprung in the night, and nothing in them."],
      day: ["Quiet. I'm listening to the wood. It's saying you're here."],
      evening: ["Fire's banked low. I like to see out, not be seen."],
      night: ["Don't walk about. Half of what's set out there is mine, and the other half isn't."],
    },
    about: ["Fenn Hollis. I trap the wood's edge from Mossgate Hide, and I keep the first station's peg in tokens for old Perrin."],
    bye: ["Go quiet."],
    shop: { open: ["Pelts I don't want, I sell. Things I can use, I buy."], closed: ["Not now."] },
  },
  odo: {
    first: ["Mind that line; it's an hour's work. Odo Marsh. Eels. This is Sedgebank, and it's as dry as you'll get."],
    greet: {
      morning: ["Morning. Traps were empty. They'll say it's the moon."],
      day: ["If you're standing there, you can hold this."],
      evening: ["Mist's coming up off the water. Get near the fire."],
      night: ["Don't follow the lights. I shouldn't have to say."],
    },
    about: ["Odo Marsh. Eel-catcher, at Sedgebank, on the Fen Way. I weave my own traps, when I can get the rods."],
    bye: ["Keep to the path."],
    shop: { open: ["I'll trade. Eels or coin, it's the same to me."], closed: ["Not now."] },
  },
};

export const QUESTS = {
  // ================================================================ Bellmourn: the Hollowfang Warrens
  warrens_mouth: {
    title: 'Something Dug This',
    giver: 'corran',
    needs: 'pines',
    hint: DELVE_HINT,
    about: "There's a stone arch in the hillside north-east of Bellmourn, and kobold and goblin tracks going into it: and the wheel-mark of Hob Fenwick's barrow, with nine sacks of his barley. Corran Thrale wants to know what's under his hill. Go through, put down twelve of the thieves, and tell him.",
    offer: [
      "Up the hill north-east, past the kobolds' den, there's a stone arch in the hillside with a light in it. It wasn't there when I was a boy. There's a soldier stood by it, hiring out swords.",
      "Kobold tracks go in. Goblin tracks go in. And a wheel-mark: Hob's barrow, and nine sacks of his barley. I want to know what's under my hill. Go through. Thin what's taken to thieving; twelve would show them. Then tell me what's down there.",
    ],
    accept: "I'll go through.",
    acceptLine: "North-east track, then the path up past the den. The soldier's a Captain Vale. He'll tell you it won't open for one. He's right. Hire who he says.",
    decline: 'Not down a hole.',
    declineLine: "No. I only track to the edge of things myself.",
    journal: [
      "Corran Thrale wants to know what's under the hill north-east of Bellmourn. Go through the portal into the Hollowfang Warrens.",
      "Goblins and kobolds from the Warrens have been stealing Hob Fenwick's barley. Put down twelve of them, down in the Warrens.",
      "Go back to Corran Thrale at the hunter's lodge and tell him what's under his hill.",
    ],
    progress: [
      "The arch on the hill. North-east. You'll want company; ask the Captain beside it.",
      "Twelve. Goblins or the snouted ones; Hob's not particular, and nor am I.",
    ],
    done: [
      "Tunnels. Miles of them. Kobold-dug, then goblins in the kobolds' work, and something under both that neither of them dug.",
      "Under my hill. All my life. I'd thought it was badgers. Here: that's mine, and that's Hob's, the price of nine sacks. And don't tell the inn. They'll want it to be badgers.",
    ],
    after: [
      "I put my ear to the hill last night. You can hear them digging. I'd always thought that was my own blood.",
    ],
    others: {
      aldric: ["The arch on the north-east hill? I've a watchman's report of it. I filed it under 'unlikely'. I may have to move it."],
      hob: ["Twelve! Bess, twelve! And the barley? ...Eaten. Well. They'll not eat the next lot."],
      dob: ["I followed the wheel-mark right up to the arch. Then I thought about Ivy, and came home."],
      tilly: ["Goblins took our barrow! Dad says I'm not to go and ask for it back. I wasn't going to ask."],
    },
  },

  tunnel_king: {
    title: 'The Tunnel-King',
    giver: 'corran',
    needs: 'warrens_mouth',
    hint: DELVE_HINT,
    offer: [
      "Kobolds don't dig like that on their own. They scratch. Those tunnels are planned. Something's telling them where.",
      "There'll be a big one. There always is, with pack things: one that eats first. Find the one the kobolds dig for and kill it. Then they're only scratching again, and scratching I can live over.",
    ],
    accept: "I'll find their king.",
    acceptLine: "It'll be where the newest digging is. Follow the fresh spoil. And it'll be bigger than you think; things that eat first always are.",
    decline: 'Not yet.',
    declineLine: "Then they keep digging. Toward the town, I'd say, by the sound.",
    journal: [
      "The kobolds of the Hollowfang Warrens dig for a king. Find Grubnash the Tunnel-King in the Warrens and kill him.",
      "Go back to Corran Thrale at the hunter's lodge.",
    ],
    progress: [
      "The big one. Where the digging's fresh.",
    ],
    done: [
      "Grubnash. It had a name. Somebody down there was calling it something. That's worse than tracks.",
      "The digging's stopped. I listened. Here. And this: I had the smith make it up for whoever did it. I didn't think it'd be needed. I'm glad I'm wrong.",
    ],
    after: [
      "No digging these four nights. The hill's just a hill. I don't trust it, but I've stopped lying on it.",
    ],
    others: {
      homunculus: ["A KING? Of KOBOLDS? Under MY town? Verdict was not consulted. Verdict would have had views."],
    },
  },

  mother_of_the_warren: {
    title: 'Mother of the Warren',
    giver: 'aldric',
    needs: 'tunnel_king',
    hint: DELVE_HINT,
    offer: [
      "Corran came to me. Corran. He doesn't come to me; he shouts at me from the gate. He says you killed a king under the north-east hill and that it wasn't the worst thing down there.",
      "He says the goblins have chiefs of their own, a pair, and that below them there's something old that the whole warren feeds. I'm the watch. That's a mile from my wall. End it, all the way down.",
    ],
    accept: "All the way down.",
    acceptLine: "The two goblin chiefs first, Corran says; you can't pass their hall otherwise. Then down. I'd send men with you. I've counted my men. Take the Captain's.",
    decline: 'Not yet.',
    declineLine: "No. But don't leave it long. Things that are fed grow.",
    journal: [
      "The goblins of the Hollowfang Warrens answer to two chiefs. Kill Skrit and Skrat in their hall.",
      "Go down to the bottom of the Warrens and kill what sleeps there: Venomaw, Mother of the Warren.",
      "Go back to Ser Aldric Halloway at the tower house.",
    ],
    progress: [
      "The chiefs, then the thing below. I've had the north-east post doubled. It's Tobias and a dog.",
      "Still down there, is it? I can't hear it. Corran says he can.",
    ],
    done: [
      "A dragon. Under the hill. A mile from the well. ...I'm going to sit down, and you're going to tell me again, slowly.",
      "Bellmourn won't know. I'll put it in the watch book and nobody reads the watch book. But I'll know. This is from the tower's own chest. And this was my father's; he'd want it carried by someone who goes down holes.",
    ],
    after: [
      "I walked up to that arch myself. Stood in front of it. Then I came home. That's as brave as I've been in a year.",
    ],
    others: {
      corran: ["He believed me. Aldric. First time in six years. I had to sit down."],
      edric: ["My brother's opened the tower chest. He hasn't opened it since our father died. What did you DO?"],
    },
  },

  // ================================================================ Bellmourn: a word down each of the four roads
  carter_is_late: {
    title: "The Carter's Late",
    giver: 'hob',
    about: "Hob Fenwick's barley goes up the Hill Road to the mill at Millhaven on Tobin Wain's cart, and Tobin hasn't come for it. The carters rest at Hillfoot Halt, a quarter of an hour east along the Hill Road, before the climb. Ask for him there. It's paid at the Halt.",
    offer: [
      "Barley's sacked. Been sacked a fortnight. It goes up the Hill Road to Abel's mill on Tobin Wain's cart, every year, and every year he's at the gate before I've tied the last one.",
      "Not this year. Bess says go and ask. I say I've thistles. The carters rest at Hillfoot Halt, east along the road, before the climb. If he's anywhere, he's there. Tell him it's sacked and waiting. Don't say Bess is cross. He'll know.",
    ],
    accept: "I'll ask at the Halt.",
    acceptLine: "East out past the church, along the Hill Road. A quarter-hour. A waystone, a cart, and a brown mare that doesn't like strangers. Go when you're ready for the road. He'll keep. So will barley, a while.",
    decline: 'Not now, Hob.',
    declineLine: "No hurry. Well. Some hurry. Mice.",
    journal: [
      "Hob Fenwick's barley is waiting on Tobin Wain's cart. Find Tobin at Hillfoot Halt, a quarter of an hour east of Bellmourn along the Hill Road.",
    ],
    progress: [
      "Hillfoot Halt. East, along the Hill Road. Tobin Wain. Barley's still sacked. I looked.",
    ],
    done: [
      "Fenwick's barley. I've not forgotten it. I've thought of little else. It's the only load I've been promised since spring.",
      "You'll not be going straight back, so I'll not give you an answer to carry. Stop here. I can't take a cart up that hill as things are, and you look like somebody who could change how things are.",
    ],
    after: [
      "Tobin sent word down by a tinker. He's coming. Didn't say when. Carters don't.",
    ],
    others: {
      tobin: [
        "Fenwick's barley. I've not forgotten it. I've thought of little else. It's the only load I've been promised since spring. That's for the walk; a carter pays for a message.",
        "You'll not be going straight back, so I'll not give you an answer to carry. Stop here. I can't take a cart up that hill as things are, and you look like somebody who could change how things are.",
      ],
      bess: ["Hob's sent you after Tobin Wain? He's been meaning to go himself since the sacks were tied. He gets as far as the gate."],
    },
  },

  one_fire_at_the_fork: {
    title: 'One Fire at the Fork',
    giver: 'jory',
    about: "From the south lamp Jory Pell can see the drovers' fires at the Forkstone, where the Barrow Track leaves the Frost Road. There were three all summer. Now there's one, and it's fed all night. He wants to know who sits up at it, and why. It's paid at the Forkstone.",
    offer: [
      "From the south lamp, on a clear night, you can see the drovers' fires at the Forkstone. Three, all summer. I say goodnight to them. They don't know. Doesn't matter.",
      "There's one now. One, and it doesn't go down at midnight like a fire should. It's fed till dawn. Somebody's sat up at it every night, same as me. I want to know who, and what they're sitting up for. I can't go. I've the lamps. You've legs and no lamps.",
    ],
    accept: "I'll go and ask at the fire.",
    acceptLine: "South down the Frost Road, twenty minutes, to where the track splits off for the moor. There's a great stone. Don't go by night; there's always nine of something on that road. Go when you're a bit more... when you're ready.",
    decline: 'Not now, Jory.',
    declineLine: "No, no. It'll still be burning. That's what bothers me.",
    journal: [
      "Jory Pell has watched the drovers' fires at the Forkstone go from three to one. Find whoever keeps the last: at the Forkstone, south of Bellmourn down the Frost Road, where the Barrow Track leaves it.",
    ],
    progress: [
      "The Forkstone. South, the Frost Road. One fire. I said goodnight to it again last night.",
    ],
    done: [
      "A watchman, counting my fire from the town? ...Tell him it's Nan Dray's, and it's fed all night because something walks round my herd, and I'd sooner see it than not.",
      "No. You'll not be telling him yet. You'll be stopping, if you've sense. I've lost beasts, and I pay for them found.",
    ],
    after: [
      "Still one fire. But it waved. Somebody stood up and swung a brand at me, the night after you went. I swung the lantern back. We're acquainted now.",
    ],
    others: {
      nan: [
        "A watchman, counting my fire from the town? ...Tell him it's Nan Dray's, and it's fed all night because something walks round my herd, and I'd sooner see it than not. That's for your trouble.",
        "No. You'll not be telling him yet. You'll be stopping, if you've sense. I've lost beasts, and I pay for them found.",
      ],
      aldric: ["Jory's sent you to count fires. Well, it's one of the half of things he sees that are there. I've seen it myself. Go and ask."],
    },
  },

  palmers_tally: {
    title: "The Palmer's Tally",
    giver: 'aldric',
    about: "Old Perrin Lowe, at Palmers' Rest, notches a stick for everyone who goes west along the Vigil Road and sends Ser Aldric the count each month. It's the only word the watch has of the west, and none has come since spring. Palmers' Rest is a quarter of an hour west, where the Pilgrims' Road leaves the Vigil Road. It's paid there.",
    offer: [
      "The west gate post logs who goes out. Nobody logs who's still going a quarter-hour past it. Nobody but one old man at Palmers' Rest, with a stick and a knife. Perrin Lowe. He sends me his count each month.",
      "It's the only report I get from the west that isn't Jory's. I've had none since spring. Either he's dead, or the boy who carried it is, or there's nothing to count. I need to know which. Walk out and ask him. I can't spare Tobias and I won't spare the dog.",
    ],
    accept: "I'll ask for the tally.",
    acceptLine: "West gate, the Vigil Road, a quarter of an hour. A stone arch on its own by the road. Go when you can hold your own out there. Past the last lamp isn't my ground, and I can't come and fetch you.",
    decline: 'Not yet, Captain.',
    declineLine: "When you can. I've waited since spring; I can wait on you.",
    journal: [
      "Ser Aldric Halloway has had no tally from the west road since spring. Find Old Perrin Lowe at Palmers' Rest, west of Bellmourn along the Vigil Road, where the Pilgrims' Road leaves it.",
    ],
    progress: [
      "Palmers' Rest. West, the Vigil Road, past the last lamp. An old man and an arch.",
    ],
    done: [
      "The Captain wants his tally? Bless him. I've cut it, every month. It's the boy who didn't come for it. And then I'd nobody with two boots to send. Forty-four gone west since spring. He'll not like it.",
      "I'll send it by the next cart. Sit. And if you're stopping, there's a thing about boots I'd like looked into.",
    ],
    after: [
      "Perrin's tally came in by a carter. Forty-four went west since spring. I've logged it. I've not told Edric, and I'll thank you to do the same.",
    ],
    others: {
      perrin: [
        "The Captain wants his tally? Bless him. I've cut it, every month. It's the boy who didn't come for it. And then I'd nobody with two boots to send. Forty-four gone west since spring. He'll not like it.",
        "I'll send it by the next cart. Sit. That's for the walk; palmers pay for news. And if you're stopping, there's a thing about boots I'd like looked into.",
      ],
      tobias: ["Uncle's sent YOU to Palmers' Rest? I said I'd go. I said I'd go in the spring. He said I'd need a horse, and a sword, and to be somebody else."],
    },
  },

  willow_bark: {
    title: 'Willow Bark',
    giver: 'sabine',
    about: "Sabine Moss boils willow bark for fevers, and buys it from Maren Rush, who cuts withies at the Landing on the Fen Way. None has come in a month. Take Sabine's coin to Maren, a quarter of an hour north along the Fen Way, and find out why. It's paid at the Landing.",
    offer: [
      "Willow bark. Boiled, it takes a fever down. I've four children in this town running hot, and I'm steeping the scrapings of the jar.",
      "Maren Rush cuts it for me, at Withy Landing, up the Fen Way. She's never a day late; she'd think it a weakness. It's been a month. Here's what I owe her and what I'd pay for the next. Put it in her hand and ask what's wrong. She won't say. Look at what she doesn't mention.",
    ],
    accept: "I'll take it to her.",
    acceptLine: "North out of the square, the Fen Way, a quarter of an hour. An old hull upside down on the bank, and a woman who doesn't stop working to talk. Go when you're fit for the road. Not before. I've enough to bind.",
    decline: 'Not now.',
    declineLine: "Then it's feverfew, and feverfew is mostly hope. Go on.",
    journal: [
      "Sabine Moss is out of willow bark. Take her coin to Maren Rush at Withy Landing, a quarter of an hour north of Bellmourn along the Fen Way, and find out why none has come.",
    ],
    progress: [
      "Withy Landing. North, the Fen Way. Into her hand, mind. Not on the bench.",
    ],
    done: [
      "Sabine's coin? Into my hand? She thinks I've been robbed, then. ...I've bark. Sacks of it. What I've not got is a road I can push a barrow down with the ties still on.",
      "If she wants that bark in Bellmourn, there are three goblins between it and her. Ask me.",
    ],
    after: [
      "A barrow of bark came down the Fen Way this morning with every tie on it. Maren sent no message. From Maren, that's a letter.",
    ],
    others: {
      maren: [
        "Sabine's coin? Into my hand? She thinks I've been robbed, then. ...I've bark. Sacks of it. What I've not got is a road I can push a barrow down with the ties still on.",
        "That's yours, for the carrying. It's out of hers; she'll not mind. And if she wants that bark in Bellmourn, there are three goblins between it and her. Ask me.",
      ],
      bryony: ["Mam's out of willow. I said use dock. She said dock's for stings. I said fevers sting. She sent me outside."],
    },
  },

  // ================================================================ Hillfoot Halt (Tobin Wain)
  linchpins: {
    title: 'Linchpins',
    giver: 'tobin',
    about: "Kobolds come down to Hillfoot Halt at night and draw the linchpins out of the cart wheels: nothing else. A cart lost a wheel on the hill for it. Tobin Wain wants the three of them put down at their lair in the rocks, south-east of the Halt across the Hill Road.",
    offer: [
      "See that wheel? Nothing wrong with it. That's the trouble. It'll go round fifty times and come off on the fifty-first, because some little snouted thing had the pin out of it in the night.",
      "They don't take the load. They don't take the oats. Pins. Three of them, denned in the rocks south-east, not two hundred paces off. Jem Carrow lost a wheel on the bend for it, and near enough lost Jem. Put them down.",
    ],
    accept: "I'll see to the three.",
    acceptLine: "South-east, over the road, where the ground breaks up. Little spears, quick feet. They go for your ankles, same as they go for my wheels.",
    decline: 'Not now.',
    declineLine: "Then I sit up with a mallet again. I'm good with it. I'd sooner be asleep.",
    journal: [
      "Kobolds are drawing the linchpins from the carts at Hillfoot Halt. Put down the three of them at their lair, south-east of the Halt across the Hill Road.",
      "Go back to Tobin Wain at Hillfoot Halt.",
    ],
    progress: [
      "Three, south-east in the rocks. I can hear them from here when the wind's right. They're arguing over a pin.",
    ],
    done: [
      "All three? Then I sleep under the cart tonight, and not beside it with a mallet.",
      "Here. And tell me: you found no pins on them. No. Thirty they've had off me, and not one in that den. They weren't keeping them. They were carrying them somewhere. I've a notion where, and the mare's been staring at it.",
    ],
    after: [
      "Wheels stayed on all week. I check them anyway. I'll check them till I die.",
    ],
  },

  pole_across_the_road: {
    title: 'A Pole Across the Road',
    giver: 'tobin',
    about: "Three goblins have laid a pole across the Hill Road east of Hillfoot Halt and take a toll of whatever comes by. No horse will step over it. Tobin Wain wants them put down, up the road where it starts to climb.",
    offer: [
      "Up the road, four hundred paces, there's a pole across it on two forked sticks. Three goblins sat by it. One's got a hat. They've seen a toll somewhere, and understood about half of it.",
      "They took a cheese off a tinker and let him by. Then they took the tinker's kettle and let the cheese by. It'd be funny on somebody else's road. A horse won't step over a pole with goblins on it. Lift the toll.",
    ],
    accept: "I'll lift it.",
    acceptLine: "East up the road till it starts to climb; they're just off it, on the north side. Don't offer them anything. They'll take it and want the same tomorrow. I know. I tried a turnip.",
    decline: 'Not today.',
    declineLine: "Then it's the long way round, and there isn't one.",
    journal: [
      "Three goblins are taking a toll on the Hill Road east of Hillfoot Halt. Put them down at their pole, just north of the road where it starts to climb.",
      "Go back to Tobin Wain at Hillfoot Halt.",
    ],
    progress: [
      "East, where the road tilts. Three and a pole. The one in the hat does the talking.",
    ],
    done: [
      "Lifted? Good. I'll go up and have the pole. It's a decent pole. Ash, twelve foot. They'd an eye for timber, I'll give them that.",
      "Here's what I'd have paid them in turnips by midsummer. It comes to more than I'd thought.",
    ],
    after: [
      "I've the pole on the cart now. And the hat. The mare won't have the hat near her.",
    ],
  },

  iron_on_the_fence: {
    title: 'Iron on the Fence',
    giver: 'tobin',
    about: "The goblins of Gnawbone Stockade, south-west of Hillfoot Halt, have had the iron tyre off every cart wheel left on the hill, and hang them on their fence to beat with bones. Tobin Wain can't shoe a wheel without them. Bring back five: they lie round the outside of the stockade.",
    offer: [
      "Hear that, nights? South-west. Like a bell with no tune in it. That's Gnawbone. Goblins, in a stockade built out of my trade: shafts, tailboards, spokes for pickets.",
      "They've had the tyre off every wheel that's been left on this hill. They hang them on the fence and hit them with bones. I can't shoe a wheel with wood. Five would put two carts back on the road. They lie about outside, where they've fallen. You needn't go in. They may come out.",
    ],
    accept: "Five tyres.",
    acceptLine: "Back toward town a little, then south off the road; there's a trodden way. Follow the ringing. A tyre's an iron hoop as high as your hip. You'll want to roll them. Everyone carries the first one.",
    decline: 'Not now.',
    declineLine: "Then I've two carts on blocks and a mare getting fat. Go on.",
    journal: [
      "Goblins at Gnawbone Stockade, south-west of Hillfoot Halt, have hung the iron tyres from broken carts on their fence. Pick up five of the tyres lying round the stockade.",
      "Take the tyres back to Tobin Wain at Hillfoot Halt.",
    ],
    progress: [
      "Five. Round the outside of the fence. If it rings when you kick it, it's mine.",
    ],
    done: [
      "Five! Roll them over here. Careful, that one's hot. No. It's only been in the sun. I'm jumpy.",
      "That's two carts shod. Here. ...It'll be quiet tonight, without the ringing. I've slept to it since spring. I'll not know what to do with my ears.",
    ],
    after: [
      "Shod both carts. Lay awake all night in the quiet. Got up and hit one myself, once, just to settle.",
    ],
  },

  candlewick: {
    title: 'Candlewick',
    giver: 'tobin',
    needs: 'linchpins',
    about: "The kobolds that drew Tobin Wain's linchpins were carrying them to Candlewick Diggings, south-east of Hillfoot Halt, where kobolds dig by candlelight under the Hill Road. The road has begun to sink. Empty the diggings: every one of them, and the foreman who points.",
    offer: [
      "I walked the road yesterday with a level. A carter's level: a bowl of water on the tailboard. The road's sunk a hand, this side of the Gallows fork. A hand, since spring.",
      "South-east there's a hole with lights in it. Kobolds, digging, each with a candle stuck to its head in its own wax. My pins are their wedges. And a big one in an iron hat, who points. A loaded cart goes through that road, and it's the cart, the horse and the man. Empty it.",
    ],
    accept: "I'll empty the diggings.",
    acceptLine: "South-east, past where you found the three; there's a way in off the Gallows fork, by the spoil heaps. Mind your footing. And mind the big one. When he swings that pick the ground opens. Don't be stood where he's looking.",
    decline: 'Not yet.',
    declineLine: "No. But I'll not take a load over that road, and nor will anyone I can stop.",
    journal: [
      "Kobolds at Candlewick Diggings, south-east of Hillfoot Halt, are digging under the Hill Road. Empty the diggings: put down every one of them, and their foreman.",
      "Go back to Tobin Wain at Hillfoot Halt.",
    ],
    progress: [
      "The hole with the lights, south-east. All of them, and the one in the iron hat. A road with one kobold under it is a road with a hole in it.",
    ],
    done: [
      "Empty. I'll walk it with the bowl before I believe it. But the mare's stopped staring south-east, and she's never wrong.",
      "Take this. It's the near shaft off my father's cart. Ash, shod at both ends. He drove this hill forty years behind it. It's a staff now. It was always more of a staff.",
    ],
    after: [
      "Took the mare to the bend and back. Empty cart. She went. Next week, barley.",
    ],
    others: {
      hob: ["Tobin's road is sound again? Then the barley goes up. Bess! It's going up!"],
    },
  },

  beacon_for_the_bend: {
    title: 'A Light for the Bend',
    giver: 'tobin',
    needs: 'candlewick',
    about: "Tobin Wain means to take a cart up the hill again, but not blind. Lit, the beacon at Cairnwatch stands right over the bad bend. Its keeper, Cuddy Stone, let it go out when the carts stopped. Tell him there's a cart coming. Cairnwatch is east up the Hill Road, then north by the Cairn Path. It's paid there.",
    offer: [
      "I'm taking a load up. First since spring. But I'll not take that bend blind, and from down here you can't tell the bend from the sky.",
      "There's a beacon at Cairnwatch, up the Cairn Path. Cuddy Stone keeps it. Lit, it stands right over the bend, and you steer on it. He let it go out when the carts stopped. Go up and tell him there's a cart. He'd not believe a carter. He might believe you.",
    ],
    accept: "I'll tell him.",
    acceptLine: "East up the road, past where the pole was, then the path north by the cairns. You'll see the beacon post before you see him. He's the one who looks like part of it.",
    decline: 'Not now.',
    declineLine: "Then the barley waits. It's waited this long.",
    journal: [
      "Tobin Wain wants the beacon at Cairnwatch lit, to take a cart up the hill by. Find Cuddy Stone at Cairnwatch: east up the Hill Road from Hillfoot Halt, then north by the Cairn Path.",
    ],
    progress: [
      "Cairnwatch. Up the road, then the path by the cairns. Cuddy Stone.",
    ],
    done: [
      "A cart? On the hill? ...Tobin Wain. So he's not dead. I'd wondered. I'll light it tonight.",
      "And since you've legs, and came up through the cairns unbitten: there's work here, if you want it.",
    ],
    after: [
      "It's lit. I saw it from the tailboard last night, right over the bend, where it ought to be. I sat and looked at it like a boy.",
    ],
    others: {
      cuddy: [
        "A cart? On the hill? ...Tobin Wain. So he's not dead. I'd wondered. I'll light it tonight. You needn't tell him; he'll see. That's for the climb.",
        "And since you've legs, and came up through the cairns unbitten: there's work here, if you want it.",
      ],
    },
  },

  // ================================================================ the Forkstone (Nan Dray)
  salt_for_the_beasts: {
    title: 'Salt',
    giver: 'nan',
    about: "Kobolds have rolled away the block salt the drovers set out for the herds at the Forkstone, and a beast without salt wanders. Nan Dray wants the three of them put down at their lair, north beside the Frost Road.",
    offer: [
      "A beast wants salt like you want sleep. Give it none and it goes looking, and round here what goes looking gets found. I'd four blocks set out by the stone. Kobolds had the lot. Rolled them. I saw the tracks.",
      "They're denned north, beside the Frost Road, the town end. Three. They sit round my salt and lick it and pull faces. I've lost eleven head wandering since. Put them down, and I'll fetch the blocks home myself.",
    ],
    accept: "I'll put down the three.",
    acceptLine: "North by the road, a long quarter-hour, on your right as you go. They'll hear you. They hear everything. Good: they come to you, and you needn't hunt the bracken.",
    decline: 'Not now.',
    declineLine: "Then I sit up another night turning beasts back with a stick. I've done it before.",
    journal: [
      "Kobolds have taken the drovers' salt from the Forkstone. Put down the three of them at their lair, north of the camp beside the Frost Road.",
      "Go back to Nan Dray at the Forkstone.",
    ],
    progress: [
      "North, by the road. Three, and my salt. You'll know it. It's the only white thing for a mile. Nearly the only.",
    ],
    done: [
      "Down? Then the salt comes home tonight and the beasts will stand. Watch them. An hour after it's set out they'll be like a street on market day.",
      "Here. And I'll tell you what I couldn't till the herd was steady. Eleven wandered, and I know where to. North-west. There's a hollow hung with white. I've not had the stomach to go and look.",
    ],
    after: [
      "They stood all night. Every head. First time since the moon turned.",
    ],
  },

  bring_me_the_bells: {
    title: 'Bring Me the Bells',
    giver: 'nan',
    about: "The cattle that wandered from the Forkstone were taken by the spiders of the Hanging Larder, a hollow to the north-west. Every beast wore a bell with its owner's mark. Nan Dray is paid by the head that comes home and must account for those that don't. Bring her five of the bells from under the trees.",
    offer: [
      "North-west there's a hollow where the trees are hung with bundles. Some are deer. Eleven are mine. Not mine; that's the trouble. Mine to mind, and other folks' to own.",
      "Every beast I drive wears a bell with its owner's mark cut in it. For each that's lost I owe a bell and an account. I don't want the beasts; there's nothing in a bundle you'd want. Bring me five bells. They'll have dropped. Things do, when what's wearing them goes thin.",
    ],
    accept: "I'll bring the bells.",
    acceptLine: "North-west, off the road, a short quarter-hour. You'll see the white before you see the hollow. Pick them up from under the trees, and don't look up more than you must. What's up there is in no hurry. What's on the ground is.",
    decline: 'Not that.',
    declineLine: "No. I'd not either, and they're my account. Leave it.",
    journal: [
      "Spiders have hung Nan Dray's strayed cattle in the Hanging Larder, north-west of the Forkstone. Pick up five of the herd bells lying under the trees there.",
      "Take the bells back to Nan Dray at the Forkstone.",
    ],
    progress: [
      "Under the hung trees, north-west. Five. Brass, the size of your fist, with a mark cut in the lip.",
    ],
    done: [
      "Give them here. Harl's. Harl's. Widow Penn's. Amos Tye's black; that's the split one. Harl's. ...Five accounts I can square. I've had worse days droving. Not many.",
      "And this. You've brought six. This one's none of mine. No mark, and it's a sheep bell. Nobody's driven sheep through the Fork in my time. Something's been hanging things there longer than I've been alive. Keep it or bury it. Here's your pay.",
    ],
    after: [
      "Sent word to Harl. He'll say I lost three. I'll say I found three bells. We'll both be right, and he'll still pay.",
    ],
  },

  they_drive_them: {
    title: 'They Drive Them',
    giver: 'nan',
    about: "Three goat men east of the Forkstone come at dusk and cut the best cattle out of Nan Dray's herd, quietly, from downwind, as a drover would. They keep a ring of stones beside the path up to Lychfield. Put them down.",
    offer: [
      "I've had beasts stolen before. A thief grabs what's nearest and runs. These don't. Three goat men, east of here. They come at dusk and cut out the best two. Quiet, from downwind, one each side and one behind.",
      "That's droving. That's how I do it. I watched one turn a heifer with a stick, and it was well done. I don't know what they want with them. And I'll not stand to be bettered at my own trade by a thing with hooves. All three.",
    ],
    accept: "All three.",
    acceptLine: "East and a little north. They keep a ring of stones by the path that goes up to Lychfield. They lead with the horns, and they'll try to get one behind you. I told you. Drovers.",
    decline: 'Not now.',
    declineLine: "Then they'll have two more by morning. And pick well.",
    journal: [
      "Three goat men are driving cattle off from the Forkstone. Put them down at their ring of stones, east of the camp beside the path to Lychfield.",
      "Go back to Nan Dray at the Forkstone.",
    ],
    progress: [
      "East, by the Lychfield path. Three. If one gets behind you, that's the clever one.",
    ],
    done: [
      "All three. And the beasts? ...Stood in the ring, unhurt, with grass cut and laid down for them. I thought so. I'd half hoped they were eating them. I'd have known where I was.",
      "Here. I'll fetch mine back at first light. They'll be fatter than when they went. I'll have that to live with.",
    ],
    after: [
      "Fetched nine back. Sleek as butter. I've not told the owners who had the keeping of them.",
    ],
  },

  whistled_up: {
    title: 'Whistled Up',
    giver: 'nan',
    needs: 'they_drive_them',
    about: "Lychfield, north-east of the Forkstone, is where drovers bury those who die on the road. Something stands in the middle of it now, nights, and calls, and they get up for it. Nan Dray's husband Tam has lain there three years. Empty Lychfield: whatever calls, and everything it has called.",
    offer: [
      "The path the goat men sat on goes up to Lychfield. Drovers' ground. Die on the road, and they don't cart you home. They put you where the next herd will pass. Tam's there. Third stone from the thorn.",
      "Something stands in the middle of it, nights, and calls. Not words. And they get up for it, like dogs to a whistle. He never once came when I called him, and I'll not have him come for that. Put them down. All of them. Him too, if he's up.",
    ],
    accept: "I'll quiet Lychfield.",
    acceptLine: "North-east by the path, past the goat men's stones. They're a deal harder than kobolds; go when you're sure. Put down whatever does the calling, and all it's called. And don't tell me after which was which.",
    decline: 'Not yet.',
    declineLine: "No. It's kept three years. It'll keep. That's what I can't stand.",
    journal: [
      "Something is calling up the dead of Lychfield, the drovers' burying ground north-east of the Forkstone. Empty it: put down whatever calls them, and every one it has called.",
      "Go back to Nan Dray at the Forkstone.",
    ],
    progress: [
      "Lychfield. North-east, up the path. All of them, and what calls. I'll know when it's done. The beasts will turn round.",
    ],
    done: [
      "It's done. I know. The herd turned and faced north-east an hour since, all together, and then went back to the grass. ...Don't tell me. I said don't.",
      "This was his. Tam's droving coat. Oiled every autumn, his way, with goose fat, which is wrong. I've been keeping it for nobody. It'll turn weather and a good deal else. Wear it somewhere he'd not have gone.",
    ],
    after: [
      "I walked up. Third stone from the thorn. The earth's lying flat. I trod it down anyway. He'd have said I was fussing.",
    ],
  },

  down_the_track: {
    title: 'Word Down the Track',
    giver: 'nan',
    needs: 'salt_for_the_beasts',
    about: "Nine of Amos Tye's black cattle walked up the Barrow Track to the Forkstone on their own when the salt went. Nan Dray has them, and Amos will be thinking them stolen. Tell him, at the Drovers' Stance, south-west down the Barrow Track. It's paid there.",
    offer: [
      "Those blacks at the back, standing apart with their noses up. Not mine. Amos Tye's, from the Drovers' Stance, down the Barrow Track. They walked up here on their own when his salt went the way mine did.",
      "A drover who's short nine head thinks one thing: thief. And he knows I'm nearest. Go down the track and tell him I've nine of his, on my salt, eating my grass, and he can fetch them or pay their keep. Say it civil. He's bigger than he sounds.",
    ],
    accept: "I'll tell him.",
    acceptLine: "South-west, the track that leaves the Frost Road at the stone. A long half-hour. A waystone and a ring of hurdles: that's the Stance. Keep to the track. The moor's only firm where beasts have proved it.",
    decline: 'Not now.',
    declineLine: "Then he'll come up here with a stick, and we'll do it the long way.",
    journal: [
      "Nan Dray has nine of Amos Tye's strayed cattle at the Forkstone. Find Amos at the Drovers' Stance, south-west of the Forkstone down the Barrow Track, and tell him.",
    ],
    progress: [
      "Down the Barrow Track, south-west. The Stance. Amos Tye. Civil, mind.",
    ],
    done: [
      "Nine? On her salt? ...I'd them down as stolen and her down as the thief, and I was halfway to fetching a stick. Well. That's the stick put back.",
      "I'll fetch them Friday, and bring a block for their keep. And you: stop a while. There's work on the moor, if you'll have it.",
    ],
    after: [
      "Amos came up for his blacks. Brought salt. Looked every one of them in the mouth in front of me, the dog.",
    ],
    others: {
      amos: [
        "Nine? On her salt? ...I'd them down as stolen and her down as the thief, and I was halfway to fetching a stick. Well. That's the stick put back. And that's for your walk.",
        "I'll fetch them Friday, and bring a block for their keep. And you: stop a while. There's work on the moor, if you'll have it.",
      ],
    },
  },

  ponies_for_the_winter: {
    title: 'Ponies for the Winter',
    giver: 'nan',
    needs: 'whistled_up',
    about: "Berin Stoat, the packman at Fellfoot, brings his ponies down off the fells each year to winter with Nan Dray. This year he hasn't come: he'll think the road shut at Lychfield. Tell him it's fit as far as the Fork. Fellfoot is a long walk south down the Frost Road, where the fells begin. It's paid there.",
    offer: [
      "You've been a use to me, and I don't say that of much on two legs. One more, and it's a long one. South, where the Frost Road starts to climb, there's a packman's camp. Fellfoot. Berin Stoat.",
      "He brings his ponies down off the fells to winter with me, every year. This year he's not come. He'll think the road's shut at Lychfield, and till lately he was right. Tell him it's fit as far as the Fork, and I've grass. It's an hour's walk, and cold at the end of it.",
    ],
    accept: "I'll go south.",
    acceptLine: "The Frost Road, south, and don't leave it. You'll pass under a lot of sky. When you can see your breath and a beacon post, that's Fellfoot. He's a small man with a big voice. The ponies are the other way about.",
    decline: 'Not yet.',
    declineLine: "It's a long road. Go when your legs want it.",
    journal: [
      "Nan Dray will winter Berin Stoat's ponies, now the road's fit. Find Berin at Fellfoot, a long way south of the Forkstone down the Frost Road, where the fells begin.",
    ],
    progress: [
      "South, the Frost Road, till it climbs. Fellfoot. Berin Stoat.",
    ],
    done: [
      "Nan Dray's got grass? And the road's fit past Lychfield? Who made it fit? ...You. Hm. You don't look it.",
      "I'll bring them down this week. Twenty-two, and a foal she's not seen. And if you came all that road, you'll want a fire. Sit. There's things up here want doing too.",
    ],
    after: [
      "Berin's ponies came down. Twenty-two and a foal. He talked the whole road, they tell me. The foal didn't mind.",
    ],
    others: {
      berin: [
        "Nan Dray's got grass? And the road's fit past Lychfield? Who made it fit? ...You. Hm. You don't look it. Here. A packman pays for the road walked.",
        "I'll bring them down this week. Twenty-two, and a foal she's not seen. And if you came all that road, you'll want a fire. Sit. There's things up here want doing too.",
      ],
    },
  },

  // ================================================================ Palmers' Rest (Old Perrin Lowe)
  left_boots: {
    title: 'Left Boots',
    giver: 'perrin',
    about: "Something comes into Palmers' Rest at night and takes one boot from each sleeping palmer: always the left. Kobolds, by the prints, from the east. Old Perrin Lowe wants the three put down at their lair, back along the Vigil Road toward Bellmourn and north of it.",
    offer: [
      "You'll think I'm wandering. I do wander, but not now. Something takes the palmers' boots at night. One boot each. The left. Nine lefts since the new moon.",
      "A palmer with one boot isn't a palmer. He's a man hopping home. Kobolds: I've seen the prints, three sets, from the east. They den north of the road, toward the town. Put them down. And if you find what they want with nine left boots, I'd give a good deal to know.",
    ],
    accept: "I'll deal with the three.",
    acceptLine: "Back east along the road, as if for Bellmourn, three hundred paces. Then north into the trees. Keep to that side. Something howls south of the road that isn't a dog. Don't go and see.",
    decline: 'Not now.',
    declineLine: "Then tonight I sleep in my boots. Both. It's bad for the feet. So is hopping.",
    journal: [
      "Kobolds are stealing the palmers' left boots at Palmers' Rest. Put down the three of them at their lair, east of the Rest along the Vigil Road and north of it.",
      "Go back to Old Perrin Lowe at Palmers' Rest.",
    ],
    progress: [
      "East along the road, then north of it. Three. Mind the south side.",
    ],
    done: [
      "Three, and no boots. Not one. ...Then they weren't keeping them. Kobolds dig and goblins hoard, and one sells to the other. There's a pit of thorns north of here, full of goblins and other people's things.",
      "Here. For nine pairs of feet. I'd say eighteen feet, but that's rather the point.",
    ],
    after: [
      "Slept with my boots off. Both there in the morning. I looked at them a good while.",
    ],
  },

  how_far_they_got: {
    title: 'How Far They Got',
    giver: 'perrin',
    needs: 'left_boots',
    about: "The goblins of the Thornpit, north of Palmers' Rest, rob palmers on the road and throw what they can't eat or wear into the thorns: among it, the lead tokens a palmer takes at each station. Old Perrin Lowe sends tokens home, so a family knows how far their own got. Empty the pit, then bring him six.",
    offer: [
      "A palmer takes a lead token off the peg at each station. One, two, up to seven. When he doesn't come home, somebody finds the tokens and sends them back. Then his people know how far he got. It matters. Four is not the same as six.",
      "The goblins in the Thornpit rob them on the road. Boots they keep. Bread they eat. Lead they throw in the thorns. There are families who don't know how far. Empty the pit; you'll pick nothing up while it's full. Then bring me six tokens.",
    ],
    accept: "The pit, then six tokens.",
    acceptLine: "Due north, two hundred and fifty paces. I've walked it off. A ring of cut thorn; you'll hear it before you see it. Their chief throws knives in a fan. Don't stand where the fan opens. The tokens are grey, thumb-sized, in the thorns round the outside.",
    decline: 'Not yet.',
    declineLine: "They'll keep. Lead does. It's the families that don't.",
    journal: [
      "The goblins of the Thornpit, north of Palmers' Rest, rob palmers on the road. Empty the pit: put down every one of them, and their chief.",
      "Pick up six of the palmers' lead tokens from the thorns round the Thornpit.",
      "Take the tokens back to Old Perrin Lowe at Palmers' Rest.",
    ],
    progress: [
      "North. The pit first, then the tokens. You'll want both hands and no company.",
      "Six. Grey, thumb-sized. They don't shine. Look for what doesn't.",
    ],
    done: [
      "Let me see. A two. A five; that's a long way to go to be robbed coming home. A one. A one. A six. ...And a seven. Somebody did it all, and got this far back. Three hundred paces from my arch.",
      "I'll send them where they belong. The seven I'll carry myself. Here: the Stations, written out fair, the words for each stone. I've said them forty-one times and nothing's happened. You've a different sort of voice.",
    ],
    after: [
      "The seven was a cooper's. His wife said, 'All of it?' I said all of it. She said he'd never finished a thing in his life.",
    ],
  },

  two_who_stand: {
    title: 'The Two Who Stand',
    giver: 'perrin',
    about: "Two figures in palmers' hoods have stood beside the Pilgrims' Road, north-west of Palmers' Rest, for eleven days without moving, and nobody has come down the road since. They are not palmers. Old Perrin Lowe wants them stopped.",
    offer: [
      "Two palmers have been stood by the Pilgrims' Road for eleven days. North-west, where it bends. Hoods, staves, the lot. I took them soup the second day. They didn't want soup.",
      "The fourth day I waved. One waved back. Wrong: all at once, from the shoulder, like a gate. Nobody's come down that road since they took up their place. They're not palmers. I don't know what they are. I'd like them to stop.",
    ],
    accept: "I'll stop them.",
    acceptLine: "Up the Pilgrims' Road, north-west, four hundred paces. They're just off it, on the left. They'll not move till you're close. Then they move very well. I left the soup bowl up there. Don't trouble about the bowl.",
    decline: 'Not that.',
    declineLine: "No. I only went the twice. I've been looking at the back of my own arch ever since.",
    journal: [
      "Two things in palmers' hoods stand beside the Pilgrims' Road, north-west of Palmers' Rest. Put down both.",
      "Go back to Old Perrin Lowe at Palmers' Rest.",
    ],
    progress: [
      "North-west, by the bend. Two. If they've moved, don't tell me where to.",
    ],
    done: [
      "Wood? Jointed, with pegs? ...That's worse, and I'd thought I'd thought of everything. Somebody made them. Somebody put hoods on them and stood them by my road.",
      "Here. And a girl came down the Pilgrims' Road this morning, with five tokens and a blister. First in eleven days. She asked who the two by the bend used to be. I said nobody. It's true now.",
    ],
    after: [
      "I went up for the bowl. It was washed. I don't want to think about that, so I've decided you did it.",
    ],
  },

  what_mumblefast_says: {
    title: 'What Mumblefast Says',
    giver: 'perrin',
    about: "West of Palmers' Rest and north of the Vigil Road, hooded folk stand in a ring at a place called Mumblefast and say something over and over, dusk to dawn. Old Perrin Lowe wants to know what. Go near enough to hear, and no nearer: they're more than a match for you yet.",
    offer: [
      "West of here, north off the road, there's a ring of them. Hoods. They stand and they mumble, dusk to dawn. It carries. I've lain awake to it since midsummer.",
      "I know every prayer said on this road, and it's none of them. It's a list. It goes up at the end of each. I want to know what's on it. Don't go in. Don't be brave. Get near enough to hear, and come and tell an old man what he's been sleeping next to.",
    ],
    accept: "I'll go and listen.",
    acceptLine: "West along the road three hundred paces, then a path north. When you can hear words, stop. They're more than you want yet. If one turns its hood your way, you've heard enough.",
    decline: 'Not now.',
    declineLine: "Then I'll go on guessing. I'm good at it. It's all wrong, but it passes the night.",
    journal: [
      "Hooded folk mumble all night at Mumblefast, west of Palmers' Rest and north of the Vigil Road. Go near enough to hear what they say. Don't go in.",
      "Go back to Old Perrin Lowe at Palmers' Rest and tell him what you heard.",
    ],
    progress: [
      "West, then north by the path. Near enough to hear. No nearer.",
    ],
    done: [
      "The stations. They're saying the stations. First stone, second stone, up to the seventh. And then down again. ...Backwards. They're walking my road backwards, standing still.",
      "I don't know what that does. I don't think they do; I think they've been told. Here. You've given me something to lie awake over that's at least mine. And when you're a good deal stronger, I'd not weep if that ring were empty.",
    ],
    after: [
      "I say them forwards now, at dusk, out loud, facing west. Seven up. It's probably nothing. It felt rude not to.",
    ],
  },

  two_tallies: {
    title: 'Two Tallies',
    giver: 'perrin',
    needs: 'left_boots',
    about: "Old Perrin Lowe notches a stick for everyone who goes west past Palmers' Rest. Dag Colley, the carter at Ashgate Halt, notches one for everyone who comes back east. They used to lay them side by side. Take Perrin's stick to Dag: west along the Vigil Road, where the trees stop. It's paid there.",
    offer: [
      "I notch a stick for everyone who goes west past my arch. Dag Colley, at Ashgate Halt, notches one for everyone who comes back east past his. First of the month we used to meet halfway and lay them side by side.",
      "Mine's always the longer. That's the road. But I like to know by how much, and neither of us has liked the walk since spring. Take him my stick. Ask him his count. He'll send it by the next cart. And if there's no next cart, that's a count too.",
    ],
    accept: "I'll take the stick.",
    acceptLine: "West along the Vigil Road, six hundred paces, to where the trees stop and the ground goes grey. A halt like Tobin Wain's, with a waystone. Dag's the one not talking. Past him it's another country. Don't go and see that either. Not yet.",
    decline: 'Not now.',
    declineLine: "Then I'll keep cutting, and not knowing. I'm used to half of that.",
    journal: [
      "Old Perrin Lowe sends his tally of those gone west to Dag Colley, the carter at Ashgate Halt. Find Dag there: west of Palmers' Rest along the Vigil Road, where the trees stop.",
    ],
    progress: [
      "West, along the road, till the trees stop. Ashgate Halt. Dag Colley.",
    ],
    done: [
      "Perrin's stick. ...Forty-four. Give me a minute. Mine's nineteen. That's twenty-five went by him and not back by me. It was eleven at midsummer.",
      "I'll cut him a copy. And since you walked it, and you're not one of the twenty-five: there's work stopped here for want of somebody like you.",
    ],
    after: [
      "Dag sent his count by a tinker. Twenty-five short. I've cut twenty-five small notches in the arch, low down, where I'll not see them unless I look.",
    ],
    others: {
      dag: [
        "Perrin's stick. ...Forty-four. Give me a minute. Mine's nineteen. That's twenty-five went by him and not back by me. It was eleven at midsummer. Here. For bringing it.",
        "I'll cut him a copy. And since you walked it, and you're not one of the twenty-five: there's work stopped here for want of somebody like you.",
      ],
    },
  },

  first_station: {
    title: 'The First Station',
    giver: 'perrin',
    needs: 'two_who_stand',
    about: "The first of the seven stations stands by Mossgate Hide, far up the Pilgrims' Road, and Fenn Hollis the trapper keeps its peg in tokens. With the road shut he'll have stopped casting them. Tell him palmers are walking again. It's a long way north-west, and paid there.",
    offer: [
      "The first station's a long way up: a stone at the wood's edge, by a trappers' hide called Mossgate. Fenn Hollis keeps the peg there in tokens for me. Casts them himself, in a spoon.",
      "He'll have stopped. No palmers, no tokens; he's a practical boy. Go up and tell him the road's walked again, and that a girl came down it with five and a blister. He'll want to know about the blister. It's the only part of this he believes in.",
    ],
    accept: "I'll go up the Pilgrims' Road.",
    acceptLine: "North-west up the Pilgrims' Road, past where the two stood, and a good half-hour more. The wood closes in. When you see three stones stood together and smell smoke you can't see, stop and say your name. He likes to see you first.",
    decline: 'Not yet.',
    declineLine: "It's a long road for a short message. Go when you're going that way.",
    journal: [
      "Old Perrin Lowe sends word to Fenn Hollis, the trapper at Mossgate Hide, that palmers are walking again. Mossgate is far up the Pilgrims' Road, north-west of Palmers' Rest.",
    ],
    progress: [
      "Up the Pilgrims' Road, north-west, a long way. Mossgate Hide. Fenn Hollis.",
    ],
    done: [
      "You walked right past me. Twice. ...Perrin sent you? Then the old man's still upright. A girl with five tokens, you say. Which heel? Never mind.",
      "I'll get the spoon out. And you: you've come this far up, you may as well be a use. There's things in this wood I can't trap.",
    ],
    after: [
      "Fenn sent down a string of new tokens. Sharp-edged, still bright. I'd forgotten they start out bright.",
    ],
    others: {
      fenn: [
        "You walked right past me. Twice. ...Perrin sent you? Then the old man's still upright. A girl with five tokens, you say. Which heel? Never mind. That's yours, for the road.",
        "I'll get the spoon out. And you: you've come this far up, you may as well be a use. There's things in this wood I can't trap.",
      ],
    },
  },

  // ================================================================ Withy Landing (Maren Rush)
  cut_loose: {
    title: 'Cut Loose',
    giver: 'maren',
    about: "Three goblins beside the Fen Way, south of Withy Landing, cut the ties on Maren Rush's bundles as she barrows them to Bellmourn, and watch a week's work blow across the road. They take nothing. Put them down.",
    offer: [
      "A bundle's two hundred rods and four ties. It takes me a day to cut and an hour to bind. It takes a goblin one go with a knife, and then it's two hundred rods across the Fen Way and a week's work for the wind.",
      "Three of them, south toward town, by the road. They don't take the rods. They cut the ties and watch. One of them claps. I've stopped taking the barrow down, and Bellmourn's stopped getting baskets. Put them down. The clapper first, if you can tell which.",
    ],
    accept: "I'll put them down.",
    acceptLine: "South down the Fen Way, as if you were going home, four hundred paces. They're a little east of the road. You'll pass a dell on your left, hung with white. Don't go in for a look. That's another day's work.",
    decline: 'Not now.',
    declineLine: "Then the rods stay here, and so do I. Mind the bundles.",
    journal: [
      "Three goblins cut Maren Rush's bundles loose on the Fen Way. Put them down at their camp, south of Withy Landing and a little east of the road.",
      "Go back to Maren Rush at Withy Landing.",
    ],
    progress: [
      "South, by the road, the east side. Three. One claps.",
    ],
    done: [
      "All three? And the clapper? Good. I'll take the barrow down tomorrow with every tie showing.",
      "Here. And you came back past the dell. You'll have seen it's bigger than it was. So have I. I tie my bundles with bast. Something in there's been tying theirs with better.",
    ],
    after: [
      "Six bundles to town, and every one arrived a bundle. Tamsin Reed counted the ties. She would.",
    ],
    others: {
      sabine: ["Bark. A barrowful, and every tie on it. I don't know what you did on the Fen Way and Maren won't say. Give me your hands; I'll look at them for nothing."],
    },
  },

  hats: {
    title: 'Hats',
    giver: 'maren',
    about: "The goblins of Muddle Camp, west of Withy Landing, had forty eel baskets off Maren Rush's drying racks in one night: a winter's weaving, half of it paid for already. They wear them. She wants six back, off the ground round the camp.",
    offer: [
      "West of here there's a goblin camp. Muddle, we call it, because it is. A month back they came through at night and had forty eel baskets off my racks. A winter's weaving. Odo Marsh has paid for half of them.",
      "They wear them. On their heads. The long ones, mouth down over the eyes, walking into each other. I'd laugh, if they were somebody else's. They drop them when they're bored. Six would let me send Odo something. Round the outside; no need to go in. Mind the ones without hats.",
    ],
    accept: "Six baskets.",
    acceptLine: "Due west, two hundred paces. There's a way trodden to it. Long narrow baskets, the length of your arm. If one's moving, leave it. It's occupied.",
    decline: 'Not now.',
    declineLine: "Then Odo waits, and Odo doesn't wait well. Go on.",
    journal: [
      "Goblins at Muddle Camp, west of Withy Landing, took Maren Rush's eel baskets. Pick up six of them, lying round the camp.",
      "Take the baskets back to Maren Rush at Withy Landing.",
    ],
    progress: [
      "West. Six, off the ground. Not off a goblin.",
    ],
    done: [
      "Six. That one's been chewed. That one's been... lived in. I'll boil them. Twice.",
      "Here's your pay. And look at this one. Somebody's mended it. Badly, with rush, but it's a mend. Over and under. One of them's been watching my hands. I don't know what I think about that.",
    ],
    after: [
      "Sent Odo five. Kept the mended one. It's on the hull. I look at it when I'm binding.",
    ],
  },

  path_to_the_water: {
    title: 'The Path to the Water',
    giver: 'maren',
    about: "Two great spiders have webbed the path north of Withy Landing, tree to tree, where Maren Rush cuts her best osier and where the Fen Way goes on to Sedgebank. She wants both dead and the path open.",
    offer: [
      "My best osier bed's north, where the path comes down to the water. I've not cut it since the web went up. It's across the whole path, tree to tree, and it's not the sort you brush off your face.",
      "Two of them. Each the size of a calf. They don't come out. They wait, and the web tells them. I threw a stick in to see. It was wrapped before it stopped swinging. That's the way to Sedgebank too, and Odo's rods can't go round. Kill both.",
    ],
    accept: "Both of them.",
    acceptLine: "North along the Fen Way, two hundred and fifty paces. They're just west of it, where the alders close over. Burn the web if you can do that. Not the osiers. I'll know which you did.",
    decline: 'Not now.',
    declineLine: "Then that bed goes to seed and Odo goes without. It's not you he'll blame.",
    journal: [
      "Two great spiders have webbed the path north of Withy Landing. Kill both, at their web just west of the Fen Way.",
      "Go back to Maren Rush at Withy Landing.",
    ],
    progress: [
      "North, under the alders. Two. Don't touch the web with anything you want back.",
    ],
    done: [
      "Both? Then I'm cutting at first light.",
      "Here. I went and looked, while you were washing. That web's good work. Even all through, no slack, tied off clean at every cross. Twenty years at my trade, and I stood there and learned something. I hate that.",
    ],
    after: [
      "Cut the north bed. Best rods in three years. Nothing had been at them. Nothing dared.",
    ],
  },

  silk_dell: {
    title: 'The Silk Dell',
    giver: 'maren',
    needs: 'cut_loose',
    about: "The Silk Dell, south-east of Withy Landing beside the Fen Way, had two webs in it when Maren Rush was a girl. It has grown all summer toward the road, and something large in the middle of it does the tying. Empty the dell: every one of them, and her.",
    offer: [
      "The dell you passed. When I was a girl it had two webs in it, and we dared each other to the edge. This spring it had twenty. Now the white's a stone's throw from the Fen Way, and it's not stopping there.",
      "There's a big one in the middle. I've seen her. She doesn't hunt; the little ones bring it. She ties. Sits and ties, all day, like me. If the road goes, the Landing goes, and I'm a woman with a hull and no town. Empty it. Her as well. Her most of all.",
    ],
    accept: "I'll empty the dell.",
    acceptLine: "South-east, three hundred paces, left of the road going down. Don't stand still in there. She throws thread a long way, and what it touches stays where it is. Kill the small ones as they come, and keep moving.",
    decline: 'Not yet.',
    declineLine: "No. But it's a foot nearer the road every morning. I've a stick in the ground. I measure.",
    journal: [
      "The spiders of the Silk Dell, south-east of Withy Landing, are spreading toward the Fen Way. Empty the dell: put down every one of them, and the great one in the middle that ties.",
      "Go back to Maren Rush at Withy Landing.",
    ],
    progress: [
      "South-east. The dell. All of them, and her. I'll measure the stick tomorrow.",
    ],
    done: [
      "Empty? And her? ...I'll go and look at how she tied off. Don't say anything.",
      "Take this. It came up on my hook in the osier bed, six years back. Old; older than the Landing. I've kept it on the hull, because it was better company than Muddle. It's a skull for a hand like yours. I never knew what to do with it. It always looked as if it did.",
    ],
    after: [
      "The white's going grey and coming down in the rain. I've pulled up my measuring stick. Burned it.",
    ],
  },

  rods_for_sedgebank: {
    title: 'Rods for Sedgebank',
    giver: 'maren',
    needs: 'path_to_the_water',
    about: "Odo Marsh, the eel-catcher at Sedgebank, weaves his traps from Maren Rush's rods and has had none since the path north was webbed. Tell him the path is open and his rods are cut. Sedgebank is north along the Fen Way, the next dry ground. It's paid there.",
    offer: [
      "Odo Marsh, at Sedgebank. Eel-catcher. He's had my rods every month for eleven years, and none since the web. He'll have decided I'm dead. Or married. He'd take dead better.",
      "Go up the Fen Way and tell him the path's open, and there's four hundred rods cut and boiled with his name on. He's to send the punt to the alders; I'll not carry them. And tell him I want paying for the baskets. He'll go deaf at that part. Say it twice.",
    ],
    accept: "I'll tell him. Twice.",
    acceptLine: "North on the Fen Way, half an hour, past where the web was. It's the next place you can stand without sinking. There's a mast with no boat on it. He's under it, mending something and swearing at it.",
    decline: 'Not now.',
    declineLine: "Then he goes on thinking I'm married. Go on.",
    journal: [
      "Maren Rush has rods cut for Odo Marsh, the eel-catcher at Sedgebank, and the path north is open. Find Odo at Sedgebank, north of Withy Landing along the Fen Way.",
    ],
    progress: [
      "North, the Fen Way, to the next dry ground. Sedgebank. Odo Marsh. Twice, mind.",
    ],
    done: [
      "Maren Rush? Not dead, then. Nor... no. Good. Four hundred? I'll send the punt Thursday. What's that? Baskets? Can't hear you. It's the water.",
      "...Twice. She told you to say it twice. All right. All RIGHT. And you: you came up that path on your own feet. I've a use for feet like that.",
    ],
    after: [
      "The punt came. Rods went. He sent the basket money inside a dead eel. That's Odo being gracious.",
    ],
    others: {
      odo: [
        "Maren Rush? Not dead, then. Nor... no. Good. Four hundred? I'll send the punt Thursday. What's that? Baskets? Can't hear you. It's the water. Here. For the walk.",
        "...Twice. She told you to say it twice. All right. All RIGHT. And you: you came up that path on your own feet. I've a use for feet like that.",
      ],
    },
  },
};
