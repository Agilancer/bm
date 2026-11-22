// Bellmourn and the four roads out: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/bellmourn.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it: nobody at a camp names Velscour or Tessariel, and no line anywhere names anything of the one
// beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs reads every line for it).
//
// The four at the ring camps, each with a voice of their own (tools/folk/cast.md, "The four roads out"): Tobin Wain the
// carter (loads, wheels, the hill, his mare), Nan Dray the drover (beasts, feet, salt), Old Perrin Lowe the palmer (paces,
// the seven stations, forty-one walks), Maren Rush the withy-cutter (rods, ties, her hands never still). And a second at each, with one quest of their own: Bet Carrow,
// Tully Rush, Dickon, Hild Ames.
const DELVE_HINT = "The portal won't open for one alone: Captain Merrow Vale, beside the Warrens' portal on the hill north-east of Bellmourn, hires out a company.";

export const LINES = {
  // ---------------------------------------------------------------- Hillfoot Halt
  tobin: {
    first: [
      "Hold there. That banging's the mare, in the lean-to. She kicks the boards for strangers. ...On foot, from the town end, with a skull where a man keeps his dinner. Tobin Wain. This is the Halt. Carts stop here before the hill. Lately they stop here instead of it.",
    ],
    greet: {
      morning: [
        "Greased both axles before light. Nowhere to go on them. A man likes to be ready.",
        "Mist on the hill. You can't see the bend from here. You can't see it from the bend either.",
      ],
      day: [
        "Four carts a day went up that hill, the year the mare was foaled. Today it's been you, and you've no wheels.",
        "If you're selling, I'm buying. A carter with no load takes what he can get.",
      ],
      evening: [
        "Chocks are under the wheels. I do that at dusk, on the flat, with nothing on the cart. Thirty years of hill does that to a man.",
        "Sit by the fire if you're stopping. Take the cold side. The warm one's mine, and I've been here longer.",
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
        "Pudding. She's nineteen and she's pulled more than you've ever lifted. She won't go past the Halt this year. Won't come out of the lean-to, most days. She stands with her nose to the south-east wall. I trust her nose over my eyes.",
      ],
    },
    topics: { hill: 'The hill', mare: 'The mare' },
    bye: [
      "Mind the bend.",
      "Go steady. Loaded or not.",
    ],
    barks: {
      player: ["Mind the cart-tail.", "Buying, selling, or leaning?"],
      morning: ["Axles are greased.", "Can't see the bend."],
      day: ["Four carts a day. Once.", "Hear her? Kicking the boards again."],
      evening: ["Chocks are in.", "Fire wants a log."],
      night: ["Scratching. By the wheels."],
      magic: ["Now she'll have the lean-to down. Warn a man.", "That'd shift a load."],
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
      "Stand still. Let me see your feet. ...Town boots, a long stride, and you don't know where to put that staff when you stop. Not a drover, then. Nan Dray. The stone's the Fork, the beasts down in the dip are in my keeping, and the fire's anybody's.",
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
        "Beasts are down in the dip for the night, and the hurdles are across. You sleep this side of them.",
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
        "Thirty-eight head, down in the dip behind the stone, out of the wind. You'll hear them. Reds, mostly, and six blacks of Amos Tye's. Don't go down among them with that skull. They've seen enough bone.",
        "You don't push a beast. You stand where it doesn't want to be, and it goes where you do. It works on people. I've not told them.",
      ],
    },
    topics: { fork: 'The Forkstone', beasts: 'The beasts' },
    bye: [
      "Keep out of the dip. They don't know you.",
      "Mind your feet. The rest of you follows.",
    ],
    barks: {
      player: ["Not down the dip.", "You stand like a gatepost."],
      morning: ["Frost on the stone."],
      day: ["Moor one way. Fells the other.", "Hup. Hup, now."],
      evening: ["Hurdles across!", "Who left the gap?"],
      night: ["It's walking round us again."],
      magic: ["You'll have them out of the dip! Stop that!", "...Not a hoof moved. Huh."],
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
        "One's come down the Pilgrims' Road in eleven days. One. She's across the fire with her foot up. The rest go up. I see them go up.",
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
      day: ["Eleven days. One down."],
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
        "North of here it's all water, with a road pretending. Sedgebank's the next dry foot, a quarter of an hour on. Odo Marsh there takes my rods for his traps. Past him I don't go. The water has opinions past him.",
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

  // ---------------------------------------------------------------- the second at each camp, across the fire
  bet: {
    first: [
      "If you've come to tell me a cart with three wheels is no cart, I know. Bet Carrow. That's mine, on the blocks. It had four at the foot of the hill and three at the bend.",
    ],
    greet: {
      morning: ["Morning. Still three wheels. I looked."],
      day: ["Twelve days sat here. Tiles don't spoil. I do."],
      evening: ["Tobin chocks his wheels on the flat. I'd chock mine, if I'd the full set."],
      night: ["I'm sat up with a wheel-brace. Not for you. Sit down."],
    },
    about: [
      "Bet Carrow. I cart tiles and lime down from the Downs kilns to whoever's roof has gone. Lost a wheel on the bend when the pin came out, and went over the bank with the load. The horse had more sense. He stopped.",
      "Tobin's had thirty years on this hill. I've had eight. He says that makes me a visitor.",
    ],
    ask: {
      dead: [
        "One helped me. I'll swear to it. Stood at the top of the bank while I was under the cart. When I'd crawled out, the tiles were stacked. Then it walked off. I don't tell Tobin.",
      ],
      town: [
        "Bellmourn wants tiles and can't get them. Every roof with a hole in it this winter is that pole's doing.",
      ],
    },
    bye: ["Mind the bend. I didn't."],
    barks: {
      player: ["Three wheels. Don't say it."],
      day: ["Twelve days.", "Spokes and felloes."],
      evening: ["Where's that wheel-brace?"],
      magic: ["Do that to the pole!"],
    },
  },

  tully: {
    first: [
      "Maren'll have told you about the light. One boot. Yes. Tully Rush. I mind the racks. I was minding them the night the baskets went, so you'll see how that's going.",
    ],
    greet: {
      morning: ["Morning. If you say so."],
      day: ["Maren says the water's up. I'd not argue."],
      evening: ["I stay by the fire, evenings. Where I can see it's a fire."],
      night: ["There's lights out on the water. I'm not looking at them. You look, if you like."],
    },
    about: [
      "Tully Rush. Maren's cousin. I strip and boil and mind the racks. She cuts. She says I've no opinions since the fen. I couldn't say.",
      "A week, I was out there. I remember the first hour and the last. I had both boots for the first.",
    ],
    ask: {
      dead: [
        "I walked with some, I think. Out there. They knew where the firm ground was. I'd not have come back else. I don't say so to Maren.",
      ],
      town: [
        "Bellmourn? It's dry. I've nothing against it.",
      ],
    },
    bye: ["Mind the lights.", "Go on, then."],
    barks: {
      player: ["Could be.", "Ask Maren."],
      evening: ["That's a fire. Good."],
      night: ["Not looking."],
      magic: ["That's not one of the fen's. Is it?"],
    },
  },

  dickon: {
    first: [
      "You're not to go down the dip. That's the first thing. I'm Dickon. I'm Nan Dray's lad. I keep the back of the herd. The back's where it all happens.",
    ],
    greet: {
      morning: ["Morning. I've been round them twice. All there. All that were there last night, I mean."],
      day: ["The mistress says watch their ears. I'm watching their ears."],
      evening: ["Dusk's when you lose them. I don't blink, dusk."],
      night: ["I'm awake. Tell her I'm awake."],
    },
    about: [
      "Dickon. Two summers droving. I can turn a beast with a look now. Well. A look and a stick. Well. Mostly the stick.",
      "My dad was a drover, till the moor had him. The mistress took me on. She says I've the feet for it.",
    ],
    ask: {
      dead: [
        "They don't frighten the beasts. So they don't frighten me. That's how I work it out. If the reds aren't looking, I'm not looking.",
      ],
      town: [
        "Never been in. The mistress says it's all gates.",
      ],
    },
    bye: ["Mind the dip."],
    barks: {
      player: ["Not down the dip!"],
      day: ["Watch their ears."],
      evening: ["Not blinking."],
      night: ["I'm awake!"],
      magic: ["Do the beasts mind that? ...No. All right, then."],
    },
  },

  hild: {
    first: [
      "Don't look at the foot. It's only a blister. It's a very large blister. Hild. I've five tokens, and I'm going back up for the other two when I can get a boot on.",
    ],
    greet: {
      morning: ["Morning. It's gone down. A bit. Perrin says don't poke it."],
      day: ["Five. Look. He says they start out bright. Mine are bright."],
      evening: ["I'd be at the sixth stone by now. If."],
      night: ["I can't sleep for that mumbling. Perrin says walk round the arch. I can't walk."],
    },
    about: [
      "Hild Ames. From Millhaven way. My gran did the seven, and her mother. I said I would. Nobody said it'd be so empty.",
      "I got to the fifth. The peg at the fifth was full. Nobody had taken a token off it in days, and there'd been people ahead of me. So I came down.",
    ],
    ask: {
      dead: [
        "They were going up too. In a line. I walked behind them a whole morning before I saw what they were. They were the best company I had. That's not a nice thing to know.",
      ],
      town: [
        "I bought these boots in Bellmourn. The cobbler swore to them.",
      ],
    },
    bye: ["Mind your heels."],
    barks: {
      player: ["It's only a blister."],
      day: ["Five. Still bright."],
      night: ["That mumbling."],
      magic: ["Can you do feet?"],
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
    about: "Hob Fenwick's barley goes up the Hill Road to the mill at Millhaven on Tobin Wain's cart, and Tobin hasn't come for it. The carters rest at Hillfoot Halt, ten minutes east along the Hill Road, before the climb. Ask for him there. It's paid at the Halt.",
    offer: [
      "Barley's sacked. Been sacked a fortnight. It goes up the Hill Road to Abel's mill on Tobin Wain's cart, every year, and every year he's at the gate before I've tied the last one.",
      "Not this year. Bess says go and ask. I say I've thistles. The carters rest at Hillfoot Halt, east along the road, before the climb. If he's anywhere, he's there. Tell him it's sacked and waiting. Don't say Bess is cross. He'll know.",
    ],
    accept: "I'll ask at the Halt.",
    acceptLine: "East, but go wide of the church door: south round the yard, where the knight on the steps can't see you. Then the Hill Road, ten minutes. A waystone and a cart. If you hear a mare kicking a lean-to, that's the place.",
    decline: 'Not now, Hob.',
    declineLine: "No hurry. Well. Some hurry. Mice.",
    journal: [
      "Hob Fenwick's barley is waiting on Tobin Wain's cart. Find Tobin at Hillfoot Halt, ten minutes east of Bellmourn along the Hill Road.",
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
    about: "From the south lamp Jory Pell can see the drovers' fires at the Forkstone, where the Barrow Track leaves the Frost Road. There were three all summer. Now there's one, fed all night: and a smaller one nearer, by the road, that's kobolds. Go through them, and find who sits up at the last fire. It's paid at the Forkstone.",
    offer: [
      "From the south lamp, on a clear night, you can see the drovers' fires at the Forkstone. Three, all summer. I say goodnight to them. They don't know. Doesn't matter.",
      "There's one now, and it's fed till dawn. Somebody sits up at it, same as me. I want to know who, and what for. And there's a little fire nearer, by the road, low, with too many round it. Kobolds. You'll have to go through them. I can't. I've the lamps.",
    ],
    accept: "I'll go and ask at the fire.",
    acceptLine: "South down the Frost Road, a quarter of an hour, to where the track splits off for the moor. The little fire's on your left, short of the great stone. Don't go by night; there's always nine of something on that road. Go when you're ready.",
    decline: 'Not now, Jory.',
    declineLine: "No, no. It'll still be burning. That's what bothers me.",
    journal: [
      "Kobolds keep a fire beside the Frost Road south of Bellmourn, on the east side, short of the Forkstone. Put down two of them.",
      "Find whoever keeps the last drovers' fire: at the Forkstone, on south, where the Barrow Track leaves the Frost Road.",
    ],
    progress: [
      "The Forkstone. South, the Frost Road. The little fire first, then the one. I said goodnight to it again last night.",
    ],
    done: [
      "A watchman, counting my fire from the town? ...Tell him it's Nan Dray's. It's fed all night because something walks round my herd, and I'd sooner see it than not.",
      "And you came through the kobolds at the roadside. They'd rolled off my salt, and a beast without salt wanders. I'll fetch the blocks home. Stop, if you've sense. I've beasts lost, and I pay for them found.",
    ],
    after: [
      "Still one fire. But it waved. Somebody stood up and swung a brand at me, the night after you went. I swung the lantern back. We're acquainted now.",
    ],
    others: {
      nan: [
        "A watchman, counting my fire from the town? ...Tell him it's Nan Dray's. It's fed all night because something walks round my herd, and I'd sooner see it than not.",
        "And you came through the kobolds at the roadside. They'd rolled off my salt, and a beast without salt wanders. I'll fetch the blocks home. That's for both. Stop, if you've sense. I've beasts lost, and I pay for them found.",
      ],
      aldric: ["Jory's sent you to count fires. Well, it's one of the half of things he sees that are there. I've seen it myself. Go and ask."],
    },
  },

  palmers_tally: {
    title: "The Palmer's Tally",
    giver: 'aldric',
    about: "Old Perrin Lowe, at Palmers' Rest, notches a stick for everyone who goes west along the Vigil Road and sends Ser Aldric the count each month. None has come since spring, and kobolds are denned by the road between. Go through them, and ask Perrin for his tally: a quarter of an hour west, where the Pilgrims' Road leaves the Vigil Road. It's paid there.",
    offer: [
      "The west gate post logs who goes out. Nobody logs who's still going a quarter-hour past it. Nobody but one old man at Palmers' Rest, with a stick and a knife. Perrin Lowe. He sends me his count each month.",
      "It's the only report I get from the west that isn't Jory's. I've had none since spring. The post says kobolds are denned by the road, most of the way out, which would account for the boy who carried it. Go through them and ask him. I can't spare Tobias.",
    ],
    accept: "I'll ask for the tally.",
    acceptLine: "West gate, the Vigil Road, a quarter of an hour. The kobolds are north of the road, three hundred paces short of him. Keep to that side; something howls south of it that isn't a dog. Then a stone arch, on its own. Past the last lamp I can't come and fetch you.",
    decline: 'Not yet, Captain.',
    declineLine: "When you can. I've waited since spring; I can wait on you.",
    journal: [
      "Kobolds are denned beside the Vigil Road west of Bellmourn, north of the road and short of Palmers' Rest. Put down two of them.",
      "Find Old Perrin Lowe at Palmers' Rest, on west where the Pilgrims' Road leaves the Vigil Road, and ask for his tally.",
    ],
    progress: [
      "Palmers' Rest. West, the Vigil Road, past the last lamp. The kobolds, then an old man and an arch.",
    ],
    done: [
      "The Captain wants his tally? Bless him. I've cut it, every month. It's the boy who never came for it. Forty-four gone west since spring. He'll not like it.",
      "You came by the kobolds. Did you see boots? ...Seven lefts, in a row, toes to the west, a pebble in each. They take one from every sleeper here. They've watched palmers leave things at stones. They think that's how it's done. I'm not sure it isn't.",
    ],
    after: [
      "Perrin's tally came in by a carter. Forty-four went west since spring. I've logged it. I've not told Edric, and I'll thank you to do the same.",
    ],
    others: {
      perrin: [
        "The Captain wants his tally? Bless him. I've cut it, every month. It's the boy who never came for it. Forty-four gone west since spring. He'll not like it.",
        "You came by the kobolds. Did you see boots? ...Seven lefts, in a row, toes to the west, a pebble in each. They take one from every sleeper here. They've watched palmers leave things at stones. They think that's how it's done. I'm not sure it isn't.",
        "The rights went to the goblins in the Thornpit; kobolds sell what they can't use. That's for the walk. Sit. If you're stopping, there's work past my arch.",
      ],
      tobias: ["Uncle's sent YOU to Palmers' Rest? I said I'd go. I said I'd go in the spring. He said I'd need a horse, and a sword, and to be somebody else."],
    },
  },

  willow_bark: {
    title: 'Willow Bark',
    giver: 'sabine',
    about: "Sabine Moss boils willow bark for fevers, and buys it from Maren Rush, who cuts withies at the Landing on the Fen Way. None has come in a month, so something is on the road between. Go through it, and put Sabine's coin in Maren's hand: a quarter of an hour north along the Fen Way. It's paid at the Landing.",
    offer: [
      "Willow bark. Boiled, it takes a fever down. I've four children in this town running hot, and I'm steeping the scrapings of the jar.",
      "Maren Rush cuts it for me, at Withy Landing, up the Fen Way. She's never a day late; she'd think it a weakness. It's been a month. So there's something on the road between us. Go through it. Then put this in her hand: what I owe, and what I'd pay for the next.",
    ],
    accept: "I'll take it to her.",
    acceptLine: "North out of the square, the Fen Way, a quarter of an hour. Whatever's stopped her will be by the road, this side of the Landing. Then an old hull upside down on the bank, and a woman who doesn't stop working to talk. Go when you're fit for it. I've enough to bind.",
    decline: 'Not now.',
    declineLine: "Then it's feverfew, and feverfew is mostly hope. Go on.",
    journal: [
      "Something on the Fen Way has stopped Maren Rush's bark reaching Bellmourn. Three goblins keep the roadside north of town, a little east of the road and short of Withy Landing: put down two of them.",
      "Take Sabine Moss's coin to Maren Rush at Withy Landing, on north along the Fen Way.",
    ],
    progress: [
      "Withy Landing. North, the Fen Way. Whatever's on it first. Then into her hand, mind. Not on the bench.",
    ],
    done: [
      "Sabine's coin? Into my hand? ...And you came up the road, past the three who cut my ties. A bundle's two hundred rods. They slit it and watch it blow. One of them claps. Did the clapper...? Good.",
      "Then the barrow goes down tomorrow with bark on it. And if you're stopping: I've more than a road wrong here.",
    ],
    after: [
      "Maren sent word by a tinker. Bark's cut and sacked, and coming when the road lets it. From Maren, that's a letter.",
    ],
    others: {
      maren: [
        "Sabine's coin? Into my hand? ...And you came up the road, past the three who cut my ties. A bundle's two hundred rods. They slit it and watch it blow. One of them claps. Did the clapper...? Good.",
        "Then the barrow goes down tomorrow with bark on it. That's yours, for the carrying and the other. And if you're stopping: I've more than a road wrong here.",
      ],
      bryony: ["Mam's out of willow. I said use dock. She said dock's for stings. I said fevers sting. She sent me outside."],
    },
  },

  // ================================================================ Hillfoot Halt (Tobin Wain)
  linchpins: {
    title: 'Linchpins',
    giver: 'tobin',
    about: "Kobolds come down to Hillfoot Halt at night and draw the linchpins out of the cart wheels: nothing else. Bet Carrow's cart lost a wheel on the hill for it. Tobin Wain wants two of the three put down at their lair in the rocks, south-east of the Halt across the Hill Road.",
    offer: [
      "See that wheel? Nothing wrong with it. That's the trouble. It'll go round fifty times and come off on the fifty-first, because some little snouted thing had the pin out of it in the night.",
      "They don't take the load. They don't take the oats. Pins. Three of them, denned in the rocks south-east, a hundred and fifty paces off. Bet Carrow lost a wheel on the bend for it, and near enough lost Bet. Put down two. The third won't come alone.",
    ],
    accept: "I'll see to them.",
    acceptLine: "South-east, over the road, where the ground breaks up. Little spears, quick feet. They go for your ankles, same as they go for my wheels.",
    decline: 'Not now.',
    declineLine: "Then I sit up with a mallet again. I'm good with it. I'd sooner be asleep.",
    journal: [
      "Kobolds are drawing the linchpins from the carts at Hillfoot Halt. Put down two of the three at their lair, south-east of the Halt across the Hill Road.",
      "Go back to Tobin Wain at Hillfoot Halt.",
    ],
    progress: [
      "South-east, in the rocks. Two will do it. I can hear them from here when the wind's right. They're arguing over a pin.",
    ],
    done: [
      "Two? That'll hold. Then I sleep under the cart tonight, and not beside it with a mallet.",
      "Here. And tell me: you found no pins on them. No. Thirty they've had off me, and not one in that den. They weren't keeping them. They were carrying them somewhere. I've a notion where. The mare's had her nose to that wall of the lean-to since spring.",
    ],
    after: [
      "Wheels stayed on all week. I check them anyway. I'll check them till I die.",
    ],
  },

  pole_across_the_road: {
    title: 'A Pole Across the Road',
    giver: 'bet',
    about: "Three goblins have laid a pole across the Hill Road east of Hillfoot Halt and take a toll of whatever comes by. No horse will step over it. Bet Carrow, twelve days late with a load of tiles, wants the toll lifted: two of them down will do it. Up the road, where it starts to climb.",
    offer: [
      "Four hundred paces up the road there's a pole across it, on two forked sticks, and three goblins sat by it. They've seen a toll somewhere, and understood about half.",
      "They took a cheese off a tinker and let him by. Then they took his kettle and let the cheese by. I'd laugh, on somebody else's road. No horse will step over a pole with goblins on it, and I'm twelve days late with tiles. Lift it. Two gone, and the third will find other work.",
    ],
    accept: "I'll lift it.",
    acceptLine: "East up the road till it starts to climb. They're just off it, on the north side. Don't offer them anything. Tobin tried a turnip. Now they want a turnip a day.",
    decline: 'Not today.',
    declineLine: "Then it's the long way round, and there isn't one. Spokes and felloes.",
    journal: [
      "Three goblins are taking a toll on the Hill Road east of Hillfoot Halt. Put down two of them at their pole, just north of the road where it starts to climb.",
      "Go back to Bet Carrow at Hillfoot Halt.",
    ],
    progress: [
      "East, where the road tilts. A pole and three goblins. Two, and it's lifted.",
    ],
    done: [
      "Lifted? Good. I'll have that pole. Ash, twelve foot, straight as a die. I need a new shaft, and they'd an eye for timber. I'll give them that and nothing else.",
      "Here. It's what the tiles would have paid me for a day. I've lost twelve. One more won't show.",
    ],
    after: [
      "The pole's a shaft now. Fits as if it were cut for it. I don't like owing goblins.",
    ],
    others: {
      tobin: ["Bet got you to lift the toll? Good. She'd have gone up there herself with a wheel-brace by Friday, and I'd have had to cart her home."],
    },
  },

  iron_on_the_fence: {
    title: 'Iron on the Fence',
    giver: 'tobin',
    needs: 'linchpins',
    about: "The goblins of Gnawbone Stockade, south-west of Hillfoot Halt, have had the iron tyre off every cart wheel left on the hill, and hang them on their fence to beat with bones. Tobin Wain can't shoe a wheel without them. Bring back five: they lie well out from the stockade, where they've been rolled and left. Keep wide and you needn't be seen.",
    offer: [
      "Hear that, nights? South-west. Like a bell with no tune in it. That's Gnawbone. Goblins, in a stockade built out of my trade: shafts, tailboards, spokes for pickets.",
      "They've had the tyre off every wheel left on this hill, to hang on the fence and hit with bones. I can't shoe a wheel with wood. Five would mend two carts. There's some lying well out, rolled and left. Keep wide and they'll not see you. Go nearer and they will.",
    ],
    accept: "Five tyres.",
    acceptLine: "Back toward town a little, then south off the road, two hundred and fifty paces; there's a trodden way. Follow the ringing. A tyre's an iron hoop as high as your hip. You'll want to roll them. Everyone carries the first one.",
    decline: 'Not now.',
    declineLine: "Then I've two carts on blocks. Go on.",
    journal: [
      "Goblins at Gnawbone Stockade, south-west of Hillfoot Halt, hang the iron tyres from broken carts on their fence. Pick up five of the tyres lying round the stockade, well out from it.",
      "Take the tyres back to Tobin Wain at Hillfoot Halt.",
    ],
    progress: [
      "Five. Round the outside, well back from the fence. If it rings when you kick it, it's mine.",
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
    about: "The kobolds that draw the linchpins at Hillfoot Halt carry them to Candlewick Diggings, south-east of the Halt, where kobolds dig by candlelight under the Hill Road. The road has begun to sink. Empty the diggings: every one of them, and the foreman who points.",
    offer: [
      "I walked the road yesterday with a level. A carter's level: a bowl of water on the tailboard. The road's sunk a hand, this side of the Gallows fork. A hand, since spring.",
      "South-east there's a hole with lights in it. Kobolds, digging, each with a candle stuck to its head in its own wax. My pins are their wedges. And a big one in an iron hat, who points. A loaded cart goes through that road, and it's the cart, the horse and the man. Empty it.",
    ],
    accept: "I'll empty the diggings.",
    acceptLine: "South-east, past the rocks where the pin-thieves den, three hundred paces; there's a way in off the Gallows fork, by the spoil heaps. Mind the big one. When he swings that pick the ground opens. Don't be stood where he's looking.",
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
      "Empty. I'll walk it with the bowl before I believe it. But the mare's stopped kicking the boards, first time since spring, and she's never wrong.",
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
    acceptLine: "East up the road, past where the pole was, then the path north by the cairns: ten minutes, all of it uphill. You'll see the beacon post before you see him. He's the one who looks like part of it.",
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
  what_walks_round: {
    title: 'What Walks Round',
    giver: 'nan',
    about: "Something walks round Nan Dray's herd every night, wide of the fire, and every few nights a beast is gone. She has kept the fire fed till dawn since midsummer. The tracks go south. Put down two of the three great spiders that den in the rocks south of the Forkstone, west of the Frost Road.",
    offer: [
      "You'll have wondered why my fire's fed all night. Something walks round us. Wide, where the light stops. It doesn't come in. It waits for one to stray out, and every third or fourth night one does.",
      "I've walked the tracks by day. Not feet. Points, eight to a stride, going south. Three of them, in the rocks west of the road. They don't eat what they take. They carry it. Kill two. One alone can't carry a heifer, and it'll know it.",
    ],
    accept: "I'll go south.",
    acceptLine: "South down the Frost Road, two hundred and fifty paces, then west off it into the rocks. They'll be still till you're close. Then they're not. Burn them, if that's what you do. I'd like to see the light of it from here.",
    decline: 'Not now.',
    declineLine: "Then I feed the fire again. I've wood for a week.",
    journal: [
      "Great spiders walk round Nan Dray's herd by night and carry off strays. Put down two of the three at their den in the rocks, south of the Forkstone and west of the Frost Road.",
      "Go back to Nan Dray at the Forkstone.",
    ],
    progress: [
      "South, then west of the road. Three, in the rocks. Two will do.",
    ],
    done: [
      "Two. I saw the light of it. So did the beasts. I heard them all go quiet in the dip, and then go on chewing.",
      "Here. Tonight the fire goes down at midnight, like a fire should. First time since midsummer. There's a watchman in the town will think I've died. He'll get over it.",
    ],
    after: [
      "Slept. Lying down, like a person. The dog would have laughed.",
    ],
  },

  bring_me_the_bells: {
    title: 'Bring Me the Bells',
    giver: 'nan',
    about: "The cattle that strayed from the Forkstone were carried to the Hanging Larder, a hollow to the north-west, and hung. Every beast wore a bell with its owner's mark. Nan Dray is paid by the head that comes home and must account for those that don't. Bring her five bells: three lie out at the hollow's edge, two close in under the trees.",
    offer: [
      "North-west there's a hollow where the trees are hung with bundles. Some are deer. Fourteen are mine. Not mine; that's the trouble. Mine to mind, and other folks' to own.",
      "Every beast I drive wears a bell with its owner's mark cut in it. For each that's lost I owe a bell and an account. I don't want the beasts; there's nothing in a bundle you'd want. Bring me five bells. They'll have dropped. Things do, when what's wearing them goes thin.",
    ],
    accept: "I'll bring the bells.",
    acceptLine: "North-west, off the road, two hundred and fifty paces. You'll see the white before the hollow. Three bells lie out at the edge, where the beasts were dragged. Two are in under the trees. Be quick for those, and don't look up. They'll see you in there.",
    decline: 'Not that.',
    declineLine: "No. I'd not either, and they're my account. Leave it.",
    journal: [
      "Nan Dray's strayed cattle hang in the Hanging Larder, north-west of the Forkstone. Pick up five of their herd bells: three lie out at the hollow's edge, two close in under the trees.",
      "Take the bells back to Nan Dray at the Forkstone.",
    ],
    progress: [
      "The hung trees, north-west. Five. Brass, the size of your fist, with a mark cut in the lip.",
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
    giver: 'dickon',
    about: "Three goat men east of the Forkstone come at dusk and cut the best cattle out of the back of Nan Dray's herd: quietly, from downwind, as a drover would. Dickon keeps the back of the herd and can't stop them. Put down two, at their ring of stones beside the path up to Lychfield.",
    offer: [
      "Don't tell the mistress I asked. It's the back of the herd they come to, and the back's mine. Three goat men, from the east. At dusk. They cut out the best two, quiet, from downwind. One each side and one behind.",
      "That's droving. That's what she's been teaching me two summers, and they do it better. I watched one turn a heifer with a stick, and I thought: that's well done. Then I thought about what I'd thought. Put down two. I can face one.",
    ],
    accept: "Two of them.",
    acceptLine: "East and a little north, three hundred paces. They keep a ring of stones by the path that goes up to Lychfield. They lead with the horns, and they'll try to get one behind you. Like I said. Drovers.",
    decline: 'Not now.',
    declineLine: "Then they'll have two more by morning. And pick well. They always pick well.",
    journal: [
      "Three goat men are driving cattle off from the Forkstone. Put down two of them at their ring of stones, east of the camp beside the path to Lychfield.",
      "Go back to Dickon at the Forkstone.",
    ],
    progress: [
      "East, by the Lychfield path. If one gets behind you, that's the clever one.",
    ],
    done: [
      "Two? And ours? ...Stood in the ring, unhurt, with grass cut and laid down for them. I knew it. I'd half hoped they were eating them. You'd know where you were.",
      "Here. It's my summer's penny; I'd nothing to spend it on. I'll fetch ours back at first light. They'll be fatter than when they went. I'll have to tell her that.",
    ],
    after: [
      "Fetched five back. Sleek as butter. The mistress looked at them, and at me, and said, 'Well, somebody can drove.' I don't know who she meant.",
    ],
    others: {
      nan: ["Dickon thinks I don't know about his goat men. I've known a month. A lad has to lose a beast to something before he'll keep one. I'd sooner it were them than the Larder."],
    },
  },

  whistled_up: {
    title: 'Whistled Up',
    giver: 'nan',
    about: "Lychfield, north-east of the Forkstone, is where drovers bury those who die on the road. Something stands in the middle of it now, nights, and calls, and they get up for it. Nan Dray's husband Tam has lain there three years. Empty Lychfield: whatever calls, and everything it has called.",
    offer: [
      "The path the goat men sit by goes up to Lychfield. Drovers' ground. Die on the road, and they don't cart you home. They put you where the next herd will pass. Tam's there. Third stone from the thorn.",
      "Something stands in the middle of it, nights, and calls. Not words. And they get up for it, like dogs to a whistle. He never once came when I called him, and I'll not have him come for that. Put them down. All of them. Him too, if he's up.",
    ],
    accept: "I'll quiet Lychfield.",
    acceptLine: "North-east by the path, past the goat men's stones, four hundred and fifty paces. They're a deal harder than anything else I've asked; go when you're sure. Put down whatever does the calling, and all it's called. And don't tell me after which was which.",
    decline: 'Not yet.',
    declineLine: "No. It's kept three years. It'll keep. That's what I can't stand.",
    journal: [
      "Something is calling up the dead of Lychfield, the drovers' burying ground north-east of the Forkstone. Empty it: put down whatever calls them, and every one it has called.",
      "Go back to Nan Dray at the Forkstone.",
    ],
    progress: [
      "Lychfield. North-east, up the path. All of them, and what calls. I'll know when it's done. The beasts will go quiet.",
    ],
    done: [
      "It's done. I know. The herd went still in the dip an hour since, every head, and then went back to the grass. ...Don't tell me. I said don't.",
      "This was his. Tam's droving coat. Oiled every autumn, his way, with goose fat, which is wrong. I've been keeping it for nobody. It'll turn weather and a good deal else. Wear it somewhere he'd not have gone.",
    ],
    after: [
      "I walked up. Third stone from the thorn. The earth's lying flat. I trod it down anyway. He'd have said I was fussing.",
    ],
  },

  down_the_track: {
    title: 'Word Down the Track',
    giver: 'nan',
    needs: 'whistled_up',
    about: "Six of Amos Tye's black cattle walked up the Barrow Track to the Forkstone on their own. Nan Dray has them, and Amos will be thinking them stolen. Tell him, at the Drovers' Stance, twenty minutes south-west down the Barrow Track. It's paid there.",
    offer: [
      "There's six blacks down in the dip that stand apart with their noses up. Not mine. Amos Tye's, from the Drovers' Stance, down the Barrow Track. They walked up here on their own, a month back.",
      "A drover who's short six head thinks one thing: thief. And he knows I'm nearest. Go down the track and tell him I've six of his, on my salt, eating my grass, and he can fetch them or pay their keep. Say it civil. He's bigger than he sounds.",
    ],
    accept: "I'll tell him.",
    acceptLine: "South-west, the track that leaves the Frost Road at the stone. Twenty minutes. A waystone and a ring of hurdles: that's the Stance. Keep to the track. There's a den south of it where things howl on two legs. That's not for you yet.",
    decline: 'Not now.',
    declineLine: "Then he'll come up here with a stick, and we'll do it the long way.",
    journal: [
      "Nan Dray has six of Amos Tye's strayed cattle at the Forkstone. Find Amos at the Drovers' Stance, twenty minutes south-west of the Forkstone down the Barrow Track, and tell him.",
    ],
    progress: [
      "Down the Barrow Track, south-west. The Stance. Amos Tye. Civil, mind.",
    ],
    done: [
      "Six? On her grass? ...I'd them down as stolen and her down as the thief, and I was halfway to fetching a stick. Well. That's the stick put back.",
      "I'll fetch them Friday, and bring a block of salt for their keep. And you: stop a while. There's work on the moor, if you'll have it.",
    ],
    after: [
      "Amos came up for his blacks. Brought salt. Looked every one of them in the mouth in front of me, the dog.",
    ],
    others: {
      amos: [
        "Six? On her grass? ...I'd them down as stolen and her down as the thief, and I was halfway to fetching a stick. Well. That's the stick put back. And that's for your walk.",
        "I'll fetch them Friday, and bring a block of salt for their keep. And you: stop a while. There's work on the moor, if you'll have it.",
      ],
    },
  },

  ponies_for_the_winter: {
    title: 'Ponies for the Winter',
    giver: 'nan',
    needs: 'whistled_up',
    about: "Berin Stoat, the packman at Fellfoot, brings his ponies down off the fells each year to winter with Nan Dray. This year he hasn't come: he'll think the road shut at Lychfield. Tell him it's fit as far as the Fork. Fellfoot is half an hour south down the Frost Road, where the fells begin. It's paid there.",
    offer: [
      "You've been a use to me, and I don't say that of much on two legs. One more, and it's a long one. South, where the Frost Road starts to climb, there's a packman's camp. Fellfoot. Berin Stoat.",
      "He brings his ponies down off the fells to winter with me, every year. This year he's not come. He'll think the road's shut at Lychfield, and till lately he was right. Tell him it's fit as far as the Fork, and I've grass. It's half an hour's walk, and cold at the end of it.",
    ],
    accept: "I'll go south.",
    acceptLine: "The Frost Road, south, and don't leave it. You'll pass under a lot of sky. When you can see your breath and a beacon post, that's Fellfoot. He's a small man with a big voice. The ponies are the other way about.",
    decline: 'Not yet.',
    declineLine: "It's a long road. Go when your legs want it.",
    journal: [
      "Nan Dray will winter Berin Stoat's ponies, now the road's fit. Find Berin at Fellfoot, half an hour south of the Forkstone down the Frost Road, where the fells begin.",
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
  how_far_they_got: {
    title: 'How Far They Got',
    giver: 'perrin',
    about: "The goblins of the Thornpit, north of Palmers' Rest, rob palmers on the road and throw what they can't eat or wear out into the thorns: among it, the lead tokens a palmer takes at each station. Old Perrin Lowe sends tokens home, so a family knows how far their own got. Empty the pit, then bring him six.",
    offer: [
      "A palmer takes a lead token off the peg at each station. One, two, up to seven. When he doesn't come home, somebody finds the tokens and sends them back. Then his people know how far he got. It matters. Four is not the same as six.",
      "The goblins in the Thornpit rob them on the road. Boots they keep. Bread they eat. Lead they throw out into the thorns. There are families who don't know how far. Empty the pit first; it's no place to go stooping while it's full. Then bring me six tokens.",
    ],
    accept: "The pit, then six tokens.",
    acceptLine: "Due north, two hundred and fifty paces. I've walked it off. A ring of cut thorn; you'll hear it before you see it. Their chief throws knives in a fan. Don't stand where the fan opens. The tokens are grey, thumb-sized, thrown well out round the pit.",
    decline: 'Not yet.',
    declineLine: "They'll keep. Lead does. It's the families that don't.",
    journal: [
      "The goblins of the Thornpit, north of Palmers' Rest, rob palmers on the road. Empty the pit: put down every one of them, and their chief.",
      "Pick up six of the palmers' lead tokens, thrown out into the thorns round the Thornpit.",
      "Take the tokens back to Old Perrin Lowe at Palmers' Rest.",
    ],
    progress: [
      "North. The pit first, then the tokens. You'll want both hands and no company.",
      "Six. Grey, thumb-sized. They don't shine. Look for what doesn't.",
    ],
    done: [
      "Let me see. A two. A five; that's a long way to go to be robbed coming home. A one. A one. A six. ...And a seven. Somebody did it all, and got this far back. Two hundred and fifty paces from my arch.",
      "I'll send them where they belong. The seven I'll carry myself. Here. It's what the Rest has in its box. Palmers pay to be remembered. This is what the paying's for.",
    ],
    after: [
      "The seven was a cooper's. His wife said, 'All of it?' I said all of it. She said he'd never finished a thing in his life.",
    ],
  },

  two_who_stand: {
    title: 'The Two Who Stand',
    giver: 'hild',
    about: "Hooded figures with staves stand beside the Pilgrims' Road north-west of Palmers' Rest. They haven't moved in eleven days, and nobody but Hild Ames has come down the road past them. They are not palmers, and she has to go back up that way. Put down two.",
    offer: [
      "There's two stood by the road, north-west, where it bends. Hoods, staves. I thought: good, company. And I called out. Perrin says they've been there eleven days. He took them soup. They didn't want soup.",
      "I came down right past them. They turned their heads as I went by. Both. Together, like a gate. And they kept turning, after a head ought to stop. I've to go back up that road for my six and seven. I can't, with them there. Please.",
    ],
    accept: "I'll stop them.",
    acceptLine: "Up the Pilgrims' Road, north-west, four hundred paces. They're just off it, on the left. They don't move till you're close. Then they move very well. I ran, on this foot. That's how well.",
    decline: 'Not that.',
    declineLine: "No. I know. I'd not either. I'll just sit here with five.",
    journal: [
      "Things in palmers' hoods stand beside the Pilgrims' Road, north-west of Palmers' Rest. Put down two of them.",
      "Go back to Hild Ames at Palmers' Rest.",
    ],
    progress: [
      "North-west, by the bend. Two. I only saw two. If there's more, don't say how many.",
    ],
    done: [
      "Wood? Jointed, with pegs? ...Somebody made them. Somebody put hoods on them and stood them by the road to look like us.",
      "Here. It's what I'd saved to leave at the seventh. I'd sooner you had it than the stone. ...And there was a third? Back in the trees? I walked past that. I'm going to sit down. I am sat down. Good.",
    ],
    after: [
      "Perrin went up for his soup bowl. It had been washed. He's decided you did it. I'm letting him.",
    ],
    others: {
      perrin: ["The two by the bend? I waved at them, the fourth day. One waved back. Wrong: all at once, from the shoulder. I've been looking at the back of my own arch ever since."],
    },
  },

  halfway_stone: {
    title: 'The Halfway Stone',
    giver: 'perrin',
    about: "Old Perrin Lowe and Dag Colley of Ashgate Halt used to meet on the first of each month at a stone halfway between them, to lay their tallies side by side. Goat men have sat at the stone since spring. Put down two of the three: west along the Vigil Road, just south of it. And look on the stone.",
    offer: [
      "I notch a stick for everyone who goes west past my arch. Dag Colley, at Ashgate Halt, notches one for everyone who comes back east past his. First of the month we'd meet at the halfway stone and lay them side by side.",
      "Mine's always the longer. That's the road. But I like to know by how much. Since spring there's been goat men sat at the stone. Three. I went as far as I could see them, and came home. I expect Dag did the same. Two fewer, and an old man could get by.",
    ],
    accept: "Two fewer.",
    acceptLine: "West along the Vigil Road, three hundred and fifty paces. The stone's south of the road, flat-topped, high as a table. They sit against it, and they lead with the horns. And look on the stone, would you. I left nothing there. I'd like to know if anyone did.",
    decline: 'Not now.',
    declineLine: "Then I'll keep cutting, and not knowing. I'm used to half of that.",
    journal: [
      "Goat men keep the halfway stone where Old Perrin Lowe and Dag Colley used to meet. Put down two of the three: west of Palmers' Rest along the Vigil Road, just south of it.",
      "There was a notched stick on the stone, under a pebble. Take it back to Old Perrin Lowe at Palmers' Rest.",
    ],
    progress: [
      "West, south of the road. The flat stone. Two. And look on top of it.",
    ],
    done: [
      "A stick? On the stone, under a pebble? Give it here. ...Nineteen notches. That's Dag's hand; he cuts on the slant. Grey with weather. That's lain there since the first of the month. In spring.",
      "He came. He walked it, past whatever he had to pass, and waited, and left it where I'd find it. I was the one who didn't walk. Here. And don't look at me like that. I'm looking at myself like that.",
    ],
    after: [
      "I keep Dag's stick by mine. His is the shorter and the straighter. That's about right.",
    ],
  },

  what_mumblefast_says: {
    title: 'What Mumblefast Says',
    giver: 'perrin',
    about: "West of Palmers' Rest and north of the Vigil Road, hooded folk stand in a ring at a place called Mumblefast and say something over and over, dusk to dawn. Old Perrin Lowe wants to know what. Go up the path near enough to hear, and no nearer: they're more than a match for you yet.",
    offer: [
      "West of here, north off the road, there's a ring of them. Hoods. They stand and they mumble, dusk to dawn. It carries. I've lain awake to it since midsummer.",
      "I know every prayer said on this road, and it's none of them. It's a list. It goes up at the end of each. I want to know what's on it. Don't go in. Don't be brave. Get near enough to hear, and come and tell an old man what he's been sleeping next to.",
    ],
    accept: "I'll go and listen.",
    acceptLine: "West along the road, near four hundred paces, past the halfway stone. Then a path north. When you can hear words, stop. They're more than you want yet. If one turns its hood your way, you've heard enough.",
    decline: 'Not now.',
    declineLine: "Then I'll go on guessing. I'm good at it. It's all wrong, but it passes the night.",
    journal: [
      "Hooded folk mumble all night at Mumblefast, west of Palmers' Rest. Go west along the Vigil Road and up the path north of it, near enough to hear what they say. Don't go in.",
      "From the path the words carry: first stone, second stone, up to the seventh. Then down again. Go back to Old Perrin Lowe at Palmers' Rest and tell him what Mumblefast says.",
    ],
    progress: [
      "West, then north by the path. Near enough to hear. No nearer.",
    ],
    done: [
      "The stations. They're saying the stations. First stone, second stone, up to the seventh. And then down again. ...Backwards. They're walking my road backwards, standing still.",
      "I don't know what that does. I don't think they do; I think they've been told. Here. You've given me something to lie awake over that's at least mine. I'll have to think what to ask of you. I've a feeling I know.",
    ],
    after: [
      "I say them forwards now, at dusk, out loud, facing west. Seven up. It's probably nothing. It felt rude not to.",
    ],
  },

  seven_down: {
    title: 'Seven Down',
    giver: 'perrin',
    needs: 'what_mumblefast_says',
    about: "The hooded folk at Mumblefast, west of Palmers' Rest, say the seven stations backwards all night, and since they began almost nobody has come back down the Pilgrims' Road. Old Perrin Lowe wants the ring emptied: every one of them, and whoever leads the saying.",
    offer: [
      "I've lain and listened, now I know what it is. Seven, six, five. Down to one. And I've looked at my stick. Forty-four went up since spring. One came down, and she turned back at the fifth.",
      "I don't say the one makes the other. I'm a palmer. I don't know how anything works; I only walk. But they began at midsummer, and that's when the road stopped giving people back. Empty the ring. Whoever stands in the middle and leads: that one above all.",
    ],
    accept: "I'll empty the ring.",
    acceptLine: "West along the road, near four hundred paces, then the path north, as before. This time don't stop. What they throw you'll not see till it lands, and the one in the middle calls weather. Keep moving. I'll say the seven forwards from here. It can't hurt.",
    decline: 'Not yet.',
    declineLine: "No. It's a great deal to ask. I've asked it of nobody else. I'd nobody else to ask.",
    journal: [
      "The hooded folk of Mumblefast say the stations backwards, and the Pilgrims' Road gives nobody back. Empty the ring, west of Palmers' Rest and north of the Vigil Road: put down every one of them, and whoever leads.",
      "Go back to Old Perrin Lowe at Palmers' Rest.",
    ],
    progress: [
      "West, then north by the path. All of them. I'm saying the seven forwards. I've lost my place twice.",
    ],
    done: [
      "It stopped. Mid-count. At four. I was saying mine, and there was suddenly nobody to say them against. I finished anyway. It seemed only civil.",
      "Take this. The Stations, written out fair, the words for each stone, forwards. I've said them forty-one times and nothing ever happened. I'm no longer sure nothing was the wrong thing to happen. You've a different sort of voice.",
    ],
    after: [
      "Two came down the Pilgrims' Road yesterday. Two. With seven each, and complaining of their boots. I never heard anything so fine.",
    ],
    others: {
      hild: ["It's quiet, nights. I slept. Perrin says two came down with seven. I'm going back up Thursday. Blister or not."],
    },
  },

  two_tallies: {
    title: 'Two Tallies',
    giver: 'perrin',
    needs: ['halfway_stone', 'how_far_they_got'],
    about: "Dag Colley, the carter at Ashgate Halt, walked to the halfway stone in spring with his tally and Old Perrin Lowe did not. Perrin owes him a walk. Take Perrin's stick to Dag: ten minutes west along the Vigil Road, past the stone, where the trees stop. It's paid there.",
    offer: [
      "Dag walked to the stone in spring and I didn't. That's sat on my chest since you put his stick in my hand. I owe him a walk, and I've not the knees for it this week.",
      "Take him mine. All of it since spring: forty-four. Lay it by his nineteen. You'll not be back this way soon, so tell him to send the difference by the next cart. And if there's no next cart, that's a count too.",
    ],
    accept: "I'll take the stick.",
    acceptLine: "West along the Vigil Road, past the halfway stone, ten minutes in all, to where the trees stop and the ground goes grey. A halt like Tobin Wain's, with a waystone. Dag's the one not talking. Past him it's another country. Not yet.",
    decline: 'Not now.',
    declineLine: "Then it sits on my chest a while longer. It's had practice.",
    journal: [
      "Old Perrin Lowe sends his tally of those gone west to Dag Colley, the carter at Ashgate Halt. Find Dag there: ten minutes west of Palmers' Rest along the Vigil Road, where the trees stop.",
    ],
    progress: [
      "West, along the road, till the trees stop. Ashgate Halt. Dag Colley.",
    ],
    done: [
      "Perrin's stick. ...Forty-four. Mine's nineteen. Twenty-five went by him and not back by me. It was eight at midsummer.",
      "So he found mine, on the stone. I thought he'd stopped coming because he'd stopped. I'm glad it was only goats. There's work stopped here, too, for want of somebody like you.",
    ],
    after: [
      "Dag sent the difference by a tinker. Twenty-five. I've cut twenty-five small notches in the arch, low down, where I'll not see them unless I look.",
    ],
    others: {
      dag: [
        "Perrin's stick. ...Forty-four. Mine's nineteen. Twenty-five went by him and not back by me. It was eight at midsummer. Here. For bringing it.",
        "So he found mine, on the stone. I thought he'd stopped coming because he'd stopped. I'm glad it was only goats. There's work stopped here, too, for want of somebody like you.",
      ],
    },
  },

  first_station: {
    title: 'The First Station',
    giver: 'perrin',
    needs: 'seven_down',
    about: "The first of the seven stations stands by Mossgate Hide, twenty minutes up the Pilgrims' Road, and Fenn Hollis the trapper keeps its peg in tokens. He'll have stopped casting them: palmers went up past his stone and none came back. Tell him they're coming down again. It's paid there.",
    offer: [
      "The first station's a long way up: a stone at the wood's edge, by a trappers' hide called Mossgate. Fenn Hollis keeps the peg there in tokens for me. Casts them himself, in a spoon.",
      "He'll have stopped. Eleven days of them going up past his stone and not one back; he's a practical boy, and he'll not cast lead for the dead. Tell him one came down. A girl, with five and a blister. He'll ask about the blister. It's the only part of this he believes in.",
    ],
    accept: "I'll go up the Pilgrims' Road.",
    acceptLine: "North-west up the Pilgrims' Road, past where the two stood, twenty minutes in all. The wood closes in. When you see three stones stood together and smell smoke you can't see, stop and say your name. He likes to see you first.",
    decline: 'Not yet.',
    declineLine: "It's a long road for a short message. Go when you're going that way.",
    journal: [
      "Old Perrin Lowe sends word to Fenn Hollis, the trapper at Mossgate Hide, that palmers are coming back down. Mossgate is twenty minutes up the Pilgrims' Road, north-west of Palmers' Rest.",
    ],
    progress: [
      "Up the Pilgrims' Road, north-west, twenty minutes. Mossgate Hide. Fenn Hollis.",
    ],
    done: [
      "You walked right past me. Twice. ...Perrin sent you? Then the old man's still upright. Coming down, are they. A girl with five, you say. Which heel? Never mind.",
      "I'll get the spoon out. And you: you've come this far up, you may as well be a use. There's things in this wood I can't trap.",
    ],
    after: [
      "Fenn sent down a string of new tokens. Sharp-edged, still bright. I'd forgotten they start out bright.",
    ],
    others: {
      fenn: [
        "You walked right past me. Twice. ...Perrin sent you? Then the old man's still upright. Coming down, are they. A girl with five, you say. Which heel? Never mind. That's yours, for the road.",
        "I'll get the spoon out. And you: you've come this far up, you may as well be a use. There's things in this wood I can't trap.",
      ],
    },
  },

  // ================================================================ Withy Landing (Maren Rush)
  hats: {
    title: 'Hats',
    giver: 'tully',
    about: "The goblins of Muddle Camp, west of Withy Landing, had forty eel baskets off the drying racks in one night, while Tully Rush was minding them. They wear them. He wants six back before Maren counts again: they lie round the outside of the camp, well back from it. Keep wide and you needn't be seen.",
    offer: [
      "The racks are mine to mind. A month back the goblins from Muddle came through at night and had forty eel baskets off them. A winter of Maren's weaving. I was awake. I'd like that known. There were a lot of them.",
      "They wear them. On their heads, mouth down over the eyes, walking into each other. Then they get bored and drop them, out round the edge of the camp. Six back would be something to show her. Keep wide and they'll not see you. Go close, and the ones without baskets will.",
    ],
    accept: "Six baskets.",
    acceptLine: "Due west, two hundred paces. There's a way trodden to it. Long narrow baskets, the length of your arm. If one's moving, leave it. It's occupied.",
    decline: 'Not now.',
    declineLine: "No. Well. She's not counted since Tuesday.",
    journal: [
      "Goblins at Muddle Camp, west of Withy Landing, took the eel baskets off Tully Rush's racks. Pick up six of them, lying round the outside of the camp, well back from it.",
      "Take the baskets back to Tully Rush at Withy Landing.",
    ],
    progress: [
      "West. Six, off the ground, round the outside. Not off a goblin.",
    ],
    done: [
      "Six. That one's been chewed. That one's been... lived in. Maren'll boil them. Twice.",
      "Here. It's my own; she doesn't know I've any. And look at this one. Somebody's mended it. With rush, badly, but over and under, the way she does. One of them's been watching her hands. I'll not tell her. You tell her.",
    ],
    after: [
      "She's kept the mended one. It's on the hull. She looks at it when she's binding. Says nothing. Nor do I.",
    ],
    others: {
      maren: ["Tully showed me. Over and under, in rush. One of them's been watching my hands. I don't know what I think about that."],
    },
  },

  muddle: {
    title: 'Muddle',
    giver: 'maren',
    needs: 'hats',
    about: "Muddle Camp's goblins have come back to Withy Landing twice since the baskets went, and next it will be the year's rods under the hull. Maren Rush wants the camp emptied, west of the Landing: every one of them, and the chief who sends them.",
    offer: [
      "They've been back. Twice, since the baskets. Sniffing round the hull, where the boiled rods are. A basket's a week. Those rods are my year.",
      "So it's Muddle. All of it, and the big one with the knives who sends them. ...There'll be one in there with rush under its nails, that sits apart and plaits. I know. I've thought about it. I can't keep a camp of thieves for the sake of one that's learning. All of them.",
    ],
    accept: "All of them.",
    acceptLine: "Due west, two hundred paces, the trodden way. The chief throws knives in a spread. Don't stand in front of his hand. And don't look for the one that plaits. You'd not know it, and then you'd wonder.",
    decline: 'Not yet.',
    declineLine: "No. I'd put it off too. I have been.",
    journal: [
      "The goblins of Muddle Camp, west of Withy Landing, are coming for Maren Rush's rods. Empty the camp: put down every one of them, and their chief.",
      "Go back to Maren Rush at Withy Landing.",
    ],
    progress: [
      "West. Muddle. All of them. Don't tell me what any of them was doing when you came.",
    ],
    done: [
      "Empty. Good. ...Was there a basket in there? Half made? No. Don't answer that. I said don't tell me, and I meant it most of the way.",
      "Here. The racks can stay out at night. Tully can sleep, which he'll take as a judgment.",
    ],
    after: [
      "I went over for my baskets. Thirty-one. And a thing in rush, a hand high, not a basket and not anything. I've put it on the hull, by the other.",
    ],
  },

  path_to_the_water: {
    title: 'The Path to the Water',
    giver: 'maren',
    about: "Great spiders have webbed the path north of Withy Landing, tree to tree, where Maren Rush cuts her best osier and where the Fen Way goes on to Sedgebank. Kill two of the three and the web comes down.",
    offer: [
      "My best osier bed's north, where the path comes down to the water. I've not cut it since the web went up. It's across the whole path, tree to tree, and it's not the sort you brush off your face.",
      "Three of them. Each the size of a calf. They don't come out. They wait, and the web tells them. I threw a stick in to see. It was wrapped before it stopped swinging. That's the way to Sedgebank too. Kill two. One can't keep a web that size.",
    ],
    accept: "Two of them.",
    acceptLine: "North along the Fen Way, two hundred and fifty paces. They're just west of it, where the alders close over. Burn the web if you can do that. Not the osiers. I'll know which you did.",
    decline: 'Not now.',
    declineLine: "Then that bed goes to seed and Odo goes without. It's not you he'll blame.",
    journal: [
      "Great spiders have webbed the path north of Withy Landing. Kill two of the three, at their web just west of the Fen Way.",
      "Go back to Maren Rush at Withy Landing.",
    ],
    progress: [
      "North, under the alders. Two. Don't touch the web with anything you want back.",
    ],
    done: [
      "Two? That'll bring it down. I'm cutting at first light.",
      "Here. I went and looked, while you were washing. There was a punt-pole in it, wrapped to the top. Odo's, by the notches. He never said he'd tried to come.",
    ],
    after: [
      "Cut the north bed. Best rods in three years. I've stood Odo's pole by the hull. He can ask for it.",
    ],
  },

  silk_dell: {
    title: 'The Silk Dell',
    giver: 'maren',
    about: "The Silk Dell, south-east of Withy Landing beside the Fen Way, had two webs in it when Maren Rush was a girl. It has grown all summer toward the road, and something large in the middle of it does the tying. Empty the dell: every one of them, and her.",
    offer: [
      "The dell by the road, south-east, hung with white. When I was a girl it had two webs in it, and we dared each other to the edge. This spring it had twenty. Now the white's a stone's throw from the Fen Way, and it's not stopping there.",
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
    needs: ['silk_dell', 'path_to_the_water'],
    about: "Odo Marsh, the eel-catcher at Sedgebank, weaves his traps from Maren Rush's rods and has had none since the path north was webbed. Tell him the path is open and his rods are cut. Sedgebank is north along the Fen Way, the next dry ground. It's paid there.",
    offer: [
      "Odo Marsh, at Sedgebank. Eel-catcher. He's had my rods every month for twelve years, and none since the web. He'll have decided I'm dead. Or married. He'd take dead better.",
      "Go up the Fen Way and tell him the path's open, and there's four hundred rods cut and boiled with his name on. He's to send the punt to the alders; I'll not carry them. And tell him I want paying for the baskets. He'll go deaf at that part. Say it twice.",
    ],
    accept: "I'll tell him. Twice.",
    acceptLine: "North on the Fen Way, a quarter of an hour, past where the web was. It's the next place you can stand without sinking. There's a mast with no boat on it. He's under it, mending something and swearing at it.",
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
