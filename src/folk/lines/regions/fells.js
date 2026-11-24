// The Rimeholt Fells: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/fells.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it but the shrine: nobody at a camp or at Frostwatch names Velscour or Tessariel, and no line names
// anything of the one beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs reads every line
// for it). Sister Brynn is Tessariel's: she speaks of the house, its watch and its fires, and of nothing of his.
//
// Each with a voice of their own (tools/folk/cast.md, "The Rimeholt Fells"): Berin Stoat the packman (loads, weights and
// prices, all at once and loud; no ponies), Corrie Blane at his beacon (lights, and who they're for), Signy Arn the
// quartermaster (the tally; writes Garrick's "Hm" down as yes), Ulla Thorsby the trapper (her line, her sets, in order),
// Arne her husband (grades everything, people too), Sister Brynn (brisk, her flint, the third watch), Dain Scree (came up
// from the sea with a mast; rope) and Wynn Halse (cuts the holds; two fingers short). Garrick's own are in
// src/folk/lines/land.js. Hubs open differently: Berin mid-count, Garrick on your clothes, Ulla on her snare, Brynn on her
// fires before you ask, Dain from below his mast.
// No beasts are built at Fellfoot and none is said to stand there: Berin's ponies are at Nan Dray's.
const DELVE_HINT = "The Mouth won't take one alone: come with a company at your back. The Free Company's quartermasters in Bellmourn hire them out.";

export const LINES = {
  // ---------------------------------------------------------------- Fellfoot
  berin: {
    first: [
      "Thirty-nine, forty, forty-one. Forty-one packs. And not a pony to put them on, because they're all at Nan Dray's eating her grass, which I arranged, and which was clever, and which I regret. Berin Stoat. Packman. You've legs. I like legs.",
    ],
    greet: {
      morning: [
        "Morning! Frost on the packs. Salt doesn't mind. Needles mind. Everything minds but salt.",
        "I've counted them again. Forty-one. I count them every morning, the way you'd feel for your purse in a crowd.",
      ],
      day: [
        "Two hundredweight to a pony, twenty-two ponies, and me. That's a train. Now it's me. That's a man with a lot of luggage.",
        "Selling? Show me. I buy anything that's lighter than what I'd give you for it.",
      ],
      evening: [
        "Corrie'll light the beacon soon. Not for me. I'm already here. A light's for them that aren't, she says.",
        "Dusk. In a good year I'd be halfway up to the fort by now, singing. The ponies hate my singing. Every one of them.",
      ],
      night: [
        "Hear that? Rams, at the Moot, south-west. Butting the stones. You get used to it. I haven't.",
        "I don't sleep up here. I lie in the bothy and do sums.",
      ],
    },
    about: [
      "Berin Stoat. I carry for the fells: salt, needles, lamp-oil, lead, thread, up to Frostwatch and the Hide every autumn; furs and horn back down. Twenty-six years.",
      "My father carried before me with mules. Mules! A mule'll carry for you and hate you for it. A pony carries for you and forgets. Give me a pony.",
    ],
    ask: {
      dead: [
        "Too cold for the dead up here, mostly. They lie down in the snow and stay. It's the living things on the fell you want to look out for. And the goats. They're not living things. They're goat men. It's a difference.",
      ],
      town: [
        "Bellmourn? I sell there at the spring fair. Bram Kettle stands me a drink and I carry a purse for him. Every year. Ask me about the purse. No, don't.",
      ],
      packs: [
        "Salt for the fort, ten packs. Lamp-oil for the shrine, two. Needles and thread for the Hide. Lead for the climbers, who want it for something they won't say. The rest's mine to sell, and the fells to sell it to.",
      ],
      road: [
        "The Frost Road goes on south up to Frostwatch, a long half-hour of it, all climbing. Past the fort it goes three ways and they all go up. That's the fells: everything's up.",
      ],
    },
    topics: { packs: 'The packs', road: 'The road up' },
    bye: [
      "Go on. Mind the goats.",
      "Off you go. Count something while you walk. It helps.",
    ],
    barks: {
      player: ["Legs! Good.", "Forty-one packs."],
      morning: ["Frost on the packs."],
      day: ["Two hundredweight a pony."],
      evening: ["Beacon soon."],
      night: ["Hear the rams?"],
      magic: ["Can you carry things with that? ...No. Pity.", "Ha! Do it again. No. Don't."],
    },
    shop: {
      open: [
        "Trade? I'm a packman. I'd trade with a goat if it had coin. Rolls, linen; the rest's spoken for.",
        "Lay it down. I'll weigh it in my hand. My hand's never wrong. My head is, but not my hand.",
      ],
      closed: ["Not now. I'm counting."],
      buy: ["Yours! Carry it high."],
      sell: ["I'll take that. I'll carry it down in spring and get twice. Don't tell anyone."],
    },
  },

  corrie: {
    first: [
      "You came up in the light. Good. Then you don't need me. Corrie Blane. That's my beacon. I light it when somebody's coming over who might not find the camp in the snow.",
    ],
    greet: {
      morning: ["Morning. Fire's out on top. I let it go at first light. No sense burning wood at the sun."],
      day: ["Clear. You can see the fort from the ladder on a day like this. You can't, mostly."],
      evening: ["I'll go up soon. Thirty-one rungs. I counted them once. Berin counts everything; it catches."],
      night: ["Lit. If you're going up the road tonight, look back at it. It's the last friendly thing you'll see."],
    },
    about: [
      "Corrie Blane. I've kept the beacon at Fellfoot since my husband stopped being able to climb the ladder. Then since he stopped. It's a light, a ladder and a woodpile. I'm good at all three.",
    ],
    ask: {
      dead: ["I lit it once for a train that never came. Next morning there were four stood in the snow at the top of the road, looking at it. Not living. I let it burn out. They went."],
      town: ["Bellmourn's got lamps on every corner. Nobody climbs a ladder for any of them. That's a town."],
      beacon: ["It tells a train where the camp is, in snow, in dark. It doesn't tell them the way. There isn't one, in snow. Just the light, and toward it."],
    },
    topics: { beacon: 'The beacon' },
    bye: ["Look back at it, going up."],
    barks: {
      player: ["Came up in the light."],
      day: ["Fort's out of sight."],
      evening: ["Thirty-one rungs."],
      night: ["Look back at it."],
      magic: ["That's a light. Not much of one.", "Don't do that near the woodpile."],
    },
  },

  // ---------------------------------------------------------------- Frostwatch
  signy: {
    first: [
      "Name, and what you're carrying. I'm not being short. I'm the quartermaster, and I write down what comes in the gate. You're the first thing in a month that wasn't snow. Signy Arn. There. Now you're on the tally.",
    ],
    greet: {
      morning: [
        "Morning. Salt for sixty, flour for forty, mouths for two. I do the sums every morning and they come out the same.",
        "He's up. He was up before me. He's always up before me, and I'm up at the fourth hour.",
      ],
      day: [
        "If you've anything to sell, bring it to the stores. I pay in coin. I've a good deal of coin. There's nobody to pay it to.",
        "I issued sixty cloaks the year I came. I've two out now. The rest are on the tally as 'not returned'.",
      ],
      evening: [
        "Gate's barred at dark. I bar it; he checks it. Every night. He's never once found it open. He still checks.",
        "The tower fire's lit. That's his. I've never been let up to it. I don't ask.",
      ],
      night: [
        "Can't sleep? Nor can I. Count something. I count the stores. It's very restful.",
        "He says 'Hm'. I write it down as yes. Eleven years, and he's never said I'd got it wrong.",
      ],
    },
    about: [
      "Signy Arn. Quartermaster of Frostwatch, when it had a garrison to quarter. It has a warden now, and me, and stores for a winter of sixty men.",
      "I came up from Fellfoot at nineteen to keep the books for a captain whose name you'd not know. The captain went. The books stayed. So did I.",
    ],
    ask: {
      dead: ["They come up the road sometimes and stand at the gate in the snow. I write them down. 'One, dead, at the gate, didn't come in.' The tally doesn't care what you are."],
      town: ["Bellmourn sends nothing up but Berin, and Berin's sent by himself."],
      warden: [
        "Hew Garrick. He took six down the Mouth and came up with two, and the things at the Mouth had both in their beds the winter after. Since then he holds the fort. I keep it. There's a difference, and we don't talk about it.",
      ],
      stores: ["Salt, flour, oil, iron, cloaks. Sixty of everything, or there was. I'll sell you a roll and a dressing. The rest I'm keeping for the garrison."],
    },
    topics: { warden: 'The warden', stores: 'The stores' },
    bye: [
      "Shut the gate.",
      "Go on. I'll put you down as 'out'.",
    ],
    barks: {
      player: ["On the tally.", "Name, and what you're carrying."],
      morning: ["Mouths for two."],
      day: ["Not returned."],
      evening: ["Gate's barred."],
      night: ["I write it down as yes."],
      magic: ["I'll put that down as 'a light'.", "Is that on the tally? It should be."],
    },
    shop: {
      open: [
        "The stores are open. Rolls and dressings, and I buy what you carry in. Lay it on the board; I'll write it down.",
        "Coin for goods. I've more coin than I've ever had goods. Bring me goods.",
      ],
      closed: ["Not now. I'm doing the sums."],
      buy: ["Written down. It's yours."],
      sell: ["Into the stores. 'One, from a stranger, fair.'"],
    },
  },

  // ---------------------------------------------------------------- Hoarfrost Hide
  ulla: {
    first: [
      "Mind the snare. Not that one. That one. ...There. You're the first thing that's walked in here this month that I didn't set for. Ulla Thorsby. This is the Hide. Don't touch the frames.",
    ],
    greet: {
      morning: [
        "Morning. I've walked the line. Thirty-six sets. Don't ask me what was in them.",
        "Frost on the frames. Good. Pelts take a frost well. People don't.",
      ],
      day: [
        "Selling? Show me. I'll give you fair for anything that isn't a pelt. Pelts I know too much about.",
        "Arne's at the frames. He's been at the frames since he could stand. Don't talk to him while he's cutting.",
      ],
      evening: [
        "Dusk. I'll walk the line again, the near half. You can come. Don't step where I don't.",
        "Smoke's on the rack. If you smell meat, it's not for you. It's for the winter.",
      ],
      night: [
        "Sleep in the lean-to if you're stopping. Arne snores. You'll not hear anything else, which is a mercy up here.",
        "I don't go out at night now. I used to. Something walks the line at night that walks it better than me.",
      ],
    },
    about: [
      "Ulla Thorsby. Trapper. My line runs north from the Hide and round, thirty-six sets, and I walk it every morning in the same order, because that's how you walk a line.",
      "Arne skins what I take, and grades it, and we send it down with Berin when Berin comes. He's not come.",
    ],
    ask: {
      dead: ["The ribs out the back aren't from anything dead. They were here when we came. Arne says they're a first. I don't ask a first of what."],
      town: ["Never been. Arne went once. He says it was a second."],
      line: ["Thirty-six sets, north and round. Each one's got a name. I'll not tell you the names; you'd laugh. Arne laughed, once, and walked it himself for a week."],
    },
    topics: { line: 'The line' },
    bye: ["Mind the snare going out."],
    barks: {
      player: ["Mind the snare.", "Don't touch the frames."],
      morning: ["Walked the line."],
      day: ["Pelts I know too much about."],
      evening: ["The near half."],
      night: ["Not at night."],
      magic: ["That'd spoil a pelt.", "Not near the frames."],
    },
    shop: {
      open: [
        "I'll trade. Rolls, and linen for a cut. Anything you've picked up off the fell, I'll weigh.",
        "Put it on the block. Not the frames. The block.",
      ],
      closed: ["Not now. I'm on the line."],
      buy: ["Yours. Keep it dry."],
      sell: ["That'll go down with Berin. If he comes."],
    },
  },

  arne: {
    first: [
      "That's a second. Your coat. Nothing wrong with a second; most things are. Arne Thorsby. I skin. She sets. Mind the knife.",
    ],
    greet: {
      morning: ["Morning. Cold. A first of a morning."],
      day: ["Second. Second. Third, that one, it was in the snare too long. Don't mind me."],
      evening: ["Light's going. I'll not cut by firelight. You lose an eye or a pelt."],
      night: ["She says I snore. I say she grades me unfair."],
    },
    about: [
      "Arne Thorsby. I've graded every pelt out of these fells since I was a boy, first, second, third. Fort's furs were mine. The shrine's lamps burn our fat. That's the Hide.",
    ],
    ask: {
      dead: ["Never skinned one. Wouldn't. You'd not get a second out of it."],
      town: ["Went once. Everything's a second down there. Even the beer."],
      grades: ["A first's thick, even, no rub, no bite. A second's what you'll wear. A third's what you'll sell to a man who doesn't know. Berin knows. Berin buys seconds and sells firsts. I like Berin."],
    },
    topics: { grades: 'Grades' },
    bye: ["Mind the knife."],
    barks: {
      player: ["That's a second.", "Mind the knife."],
      morning: ["A first of a morning."],
      day: ["Third, that one."],
      evening: ["Not by firelight."],
      magic: ["Don't do that at the frames.", "Hm. A third."],
    },
  },

  // ---------------------------------------------------------------- the Frozen Shrine
  brynn: {
    first: [
      "They've never gone out. The fires. You were going to ask; everyone does. Sister Brynn. Mind the ice on the steps, there's no mending it. This is the shrine of the third watch, and I keep it, and it's colder than it looks.",
    ],
    greet: {
      morning: [
        "Good morning. I've swept the steps. They'll be ice again by noon. I sweep them anyway. That's most of what a house is.",
        "First light. The third watch was kept here, in the hours after middle night. I keep it still. Then I sweep.",
      ],
      day: [
        "Pilgrims come up in summer and tie their strips on the lines. Nobody comes in winter. Nobody but you.",
        "The fires want feeding every hour. If you stand by one, feed it. That's the toll.",
      ],
      evening: [
        "The light goes off the hill early here. I'll be at the fires. Come and stand on the warm side if you like.",
        "Dusk. Keep the shrine at your back if you're out. Whatever comes up to the fires comes from below.",
      ],
      night: [
        "Third watch soon. I'll be awake. I'm always awake for it. I'm asleep for most of the rest of the day, and that's between me and the house.",
        "Hear the wind on the lintel? The ice sings. The old sisters wrote it down as a hymn. It's the wind.",
      ],
    },
    about: [
      "Sister Brynn. I came up to the shrine at sixteen, with two others, to learn the third watch from the last sister who knew it. She taught it to me. The others went down. She died. So: me.",
      "The bell tower kept the first watch, the abbey the second, us the third, the chapel in the fen the last. When the order said stop, the shrine didn't hear. It's a long way up.",
    ],
    ask: {
      dead: ["I've had them come up the lane in winter and stand at the steps. They don't come up. I say the watch at them, and they turn round. I don't know if that's the watch, or the steps."],
      town: ["I've not been down since I came up. Twenty years. I'm told there's a new road. I'm told a lot of things."],
      fires: ["Two fires, either side of the steps. The pilgrims say they've never gone out since the shrine was built. Pilgrims say a great many things, and I don't argue with any of them."],
    },
    topics: { fires: 'The fires' },
    bye: [
      "Go carefully. The steps.",
      "Go well. Feed a fire on your way past.",
    ],
    barks: {
      player: ["They've never gone out.", "Mind the steps."],
      morning: ["Swept the steps."],
      day: ["Feed it. That's the toll."],
      evening: ["The warm side."],
      night: ["Third watch soon."],
      magic: ["Don't light the fires with that. I'd never hear the end of it.", "That's bright. Not here."],
    },
  },

  // ---------------------------------------------------------------- Climbers' Rest
  dain: {
    first: [
      "You looked up. Everyone looks up first; it's the mast. I'm down here. Dain Scree. I came up from the sea with that on a cart, and I've never been sorry. Climbers' Rest. We go up the Tor. Most of us come down.",
    ],
    greet: {
      morning: [
        "Morning. Pennon's stiff, and pointing south. It's pointed south a month, whatever the smoke does.",
        "I've been up the mast already. You can see the fort's tower fire from the nest, when it's lit, and the Tor, always.",
      ],
      day: [
        "Selling? I buy rope, iron, anything with a good edge. I'll sell you a roll. I keep a store for whoever comes down hurt.",
        "Wynn's on the Tor's east face, cutting. Don't shout up to her. She'll answer, and lose her hold.",
      ],
      evening: [
        "Light's off the Tor. Nobody goes up after this. Nobody sensible. I've known three not sensible.",
        "Coil a rope with me, if you've hands. Sunwise, always. It's the only thing the sea taught me I kept.",
      ],
      night: [
        "Can't sleep? Climb the mast. Halfway. Then you'll sleep.",
        "Watch the fort's light, north-west there. If it goes out, somebody's dead, or somebody's forgot. I've sat up for both.",
      ],
    },
    about: [
      "Dain Scree. Bosun, once, on a ship with no business so far up a coast. When she broke, I brought her mast up here on a cart, and stepped it, because a climbers' camp wants a thing to climb that won't fall on you.",
      "We go up Ravens' Tor for the ravens' eggs, and for the going up. There's twelve of us in a good summer. There's two in winter, and the mast.",
    ],
    ask: {
      dead: ["The fell keeps what falls on it. You find them in spring, at the foot of the Tor, facing up. I bring them in. Somebody did that for my brother."],
      town: ["Bellmourn's flat. I can't think on the flat. Everything's too far away and too easy to get to."],
      tor: ["The Tor's three lifts of rock and a cap stone. A stair's cut up the west to the first ledge, and an old cell under it. Above that you climb. The ravens' nest's on the cap. Three eggs in it now, and the harpies sat round it."],
    },
    topics: { tor: "Ravens' Tor" },
    bye: [
      "Rock at your back.",
      "Go on. Sunwise.",
    ],
    barks: {
      player: ["Everyone looks up first.", "Rock at your back."],
      morning: ["Pennon's stiff."],
      day: ["Don't shout up to her."],
      evening: ["Sunwise, always."],
      night: ["Watch the fort's light."],
      magic: ["That'd light a ship home.", "Not near the rope."],
    },
    shop: {
      open: [
        "Trade's on the rope-chest. Rolls and dressings: up here you'll want both. Show me what you've brought down.",
        "Lay it on the chest. I'll give you fair. Fair up a hill's more than fair on the flat.",
      ],
      closed: ["Not now. I'm on the mast."],
      buy: ["Yours. Stow it tight."],
      sell: ["I'll take that. Iron's always wanted up a rock."],
    },
  },

  wynn: {
    first: [
      "Don't look at the hand. Everyone looks at the hand. Two fingers, the winter before last, on the north face. I cut holds with the other eight. Wynn Halse.",
    ],
    greet: {
      morning: ["Morning. I'll be on the east face by the time the frost's off it. You cut a hold in frost and it cracks in spring."],
      day: ["Every hold on the Tor's east face is mine. Two hundred and nine. I don't count them; Dain does, and tells me."],
      evening: ["Down off the face. Hands are cold. The eight of them."],
      night: ["I don't go on the Tor at night. Nobody does. The Tor doesn't mind either way."],
    },
    about: [
      "Wynn Halse. My mother cut the holds on the west stair. I cut the east face. A good hold's a good hold: deep enough for a hand, angled so the wet runs out. That's all there is to it, and it takes years.",
    ],
    ask: {
      dead: ["Dain brings them in from the foot of the Tor in spring. I don't look. I look at the holds they were on. Usually it wasn't the hold."],
      town: ["I've been. There's a man there sells chisels. That's the whole of Bellmourn to me."],
    },
    bye: ["Mind your hands."],
    barks: {
      player: ["Don't look at the hand."],
      day: ["Two hundred and nine."],
      evening: ["Hands are cold."],
      night: ["Not at night."],
      magic: ["Can that cut stone? ...No. I'll keep the chisel."],
    },
  },
};

export const QUESTS = {
  // ---------------------------------------------------------------- Fellfoot
  rams_at_the_beacon: {
    title: 'Something at the Beacon',
    giver: 'corrie',
    about: "Corrie Blane's beacon at Fellfoot leans a hand further south every morning: something comes up from the hollow three hundred and fifty paces south, down the road to Frostwatch, and puts its head to the legs at night. White goat men lie up there by day. Put down two.",
    offer: [
      "My beacon leans. A hand further south every morning. I go up the ladder at dusk and I can feel it in the rungs, like a boat. Thirty-one rungs and every one of them leaning.",
      "It's the white goat men. They lie up in the hollow south, down the road, by day, and come up at night and put their heads to the legs. I've seen the hair on the timber. Two of them not coming up again would do.",
    ],
    accept: "I'll see to the goat men.",
    acceptLine: "South down the road toward the fort, three hundred and fifty paces, a hollow on the right of it. Three of them. Two'll do; the third can lean on something else.",
    decline: 'Not now.',
    declineLine: "It's leaned a month. It'll lean a night more.",
    journal: [
      "White goat men lie up in a hollow south of Fellfoot, down the road to Frostwatch, and come up at night to butt Corrie Blane's beacon. Put down two.",
      "Go back to Corrie Blane at Fellfoot.",
    ],
    progress: ["South. The hollow by the road. Two of them."],
    done: [
      "Rubbing? Not butting. Rubbing. ...Like a tup on a gatepost, in the back end of the year. On my beacon. Thirty-one rungs, and it's a gatepost to them.",
      "Here. Don't tell Berin what they were doing. He'd tell the fells, and the fells would tell the fort, and the warden would say 'Hm' at me for a year.",
    ],
    after: ["It's stopped leaning. I'll have it pulled straight in spring. I'll have something put on the legs. Thorns. Let them rub on that."],
    others: {
      berin: ["Corrie's beacon? She thinks I've not noticed it lean. I've noticed. I lean the other way when I pass it, to help."],
    },
  },

  salt_at_the_moot: {
    title: 'Ten Packs of Salt',
    giver: 'berin',
    about: "Two of Berin Stoat's ten packs of salt for Frostwatch went from Fellfoot in the night, and the same week the hill rams came down to the Frozen Moot, the ring of stones three hundred and fifty paces south-west, a month before the snow. Bring back five cakes of his salt from round the stones.",
    offer: [
      "Salt for the fort. Ten packs, a hundredweight a pack, cut in cakes. That's Frostwatch's winter: Signy Arn salts anything that holds still. Eight packs now. Two went in the night, sacking and all, and nobody heard a thing. You hear a man carrying a hundredweight. Usually.",
      "And the same week the rams came down to the Moot, south-west, a month before the snow. Big brown ones, and goat men, pied ones, with them. I don't say it's them. I say they came down, and the salt went. Look round the stones. Five cakes and I'll call it found.",
    ],
    accept: "I'll look for your salt.",
    acceptLine: "South-west, three hundred and fifty paces, a ring of stones in the white. The cakes'll be about the outside; a couple in close. Rams don't like being stood near. Nor do goat men. Nor do I, near goats.",
    decline: 'Not now.',
    declineLine: "Eight packs, then. The fort'll salt thinner. They're good at thin up there.",
    journal: [
      "Two packs of Berin Stoat's salt for Frostwatch went from Fellfoot in the night, and the hill rams came down to the Frozen Moot, south-west of the camp, the same week. Bring back five cakes from round the stones.",
      "Go back to Berin Stoat at Fellfoot with the salt.",
    ],
    progress: ["South-west. The Moot. Five cakes. Mine are stamped with a B. I'm not proud of it."],
    done: [
      "Licked. Every one. Licked down to the size of a fist, and the B gone off the top. ...They came down a month early because a packman left his salt out in sacks on the fell, where a ram on the tops could smell it. That's me. I've shut my own road.",
      "Well. They'll go back up when it's gone, and it's going fast. Take that; it's coin, and coin doesn't get licked. I'll tell Signy the fort's salt went to a good cause. She'll write it down as delivered.",
    ],
    after: ["I've put the salt in the bothy and shut the door. A ram came and stood at it all last night, breathing."],
    others: {
      corrie: ["The salt? I saw a goat man go past the beacon with a sack on his shoulder, the night it went, walking like a packman. I thought it was Berin. It's how they walk."],
    },
  },

  the_other_light: {
    title: 'The Other Light',
    giver: 'corrie',
    about: "On nights when Corrie Blane's beacon at Fellfoot isn't lit, a fire burns at Chilblain Camp, the frost goblins' stockade four hundred paces west, as high as hers. Two drovers walked into the camp last winter, taking it for Fellfoot. Empty Chilblain, and its chief.",
    offer: [
      "I don't light every night. Wood's dear, and a clear night wants no beacon. But on the nights I don't, there's a fire at Chilblain. West, over the rise. Up on a pole, about the height of mine. From the road you'd swear it was me.",
      "Last winter two drovers came down off the tops in snow, saw it, and walked to it. Toward the light: that's what I tell them all. They walked into Chilblain. One got out. Empty it. The goblins, and the big one with the ice on him.",
    ],
    accept: "I'll empty Chilblain.",
    acceptLine: "West, four hundred paces, the trail past the pens. A stockade of hides and ice, and the fire on its pole in the middle. Put it out when you've done. I'll not have it burning for nobody.",
    decline: 'Not yet.',
    declineLine: "Then I'll light mine every night till you are. Berin can carry the wood.",
    journal: [
      "On nights Corrie Blane's beacon isn't lit, the frost goblins of Chilblain Camp, west of Fellfoot, light a fire as high as hers, and travellers walk to it. Empty the camp, and its chief.",
      "Go back to Corrie Blane at Fellfoot.",
    ],
    progress: ["West. Chilblain. The fire on the pole, and the big one."],
    done: [
      "A hide behind it? On the road side? ...Then it threw its light up the fell, not down the road. They weren't lighting it for drovers. They were lighting it for their own, out on the tops, on the nights mine wasn't. The drovers saw the edge of it.",
      "A light's for them that aren't here yet. I've said it forty years and never thought who else was out. Here: the beacon's old poker, iron, ash in the hand. It's lit more fires than you've had dinners. It'll do you for a staff.",
    ],
    after: ["Lit every night now. Berin says it costs him wood. It costs me wood. Berin carries it."],
    others: {
      berin: ["Corrie's sent you to Chilblain? She's not said a word about those drovers all year. That's how you know she's thought of nothing else."],
    },
  },

  kettles_slate: {
    title: "Kettle's Slate",
    giver: 'berin',
    needs: 'salt_at_the_moot',
    about: "Every autumn Berin Stoat carries Bram Kettle's purse up to Frostwatch for its warden, Hew Garrick: venison, owed eleven years. Every autumn Garrick won't take it. Carry it up and make him keep it. Rime rams hold a ring of stones by the road halfway: put down two. The fort is half an hour south. It's paid there.",
    offer: [
      "On top of all that I carry a purse. Every autumn. Bram Kettle's, from the Tolling Bell in Bellmourn, for the warden at Frostwatch. Venison, the winter the well froze. Three carts. Never paid.",
      "And every autumn Garrick looks at it and says 'Hm' and won't take it, and I carry it down again. You take it up. You've legs, and he doesn't know you well enough to say 'Hm' at. Make him keep it.",
    ],
    accept: "I'll carry Kettle's purse.",
    acceptLine: "South, the road up, half an hour of climbing. Halfway there's a ring of stones by the road, on the east side, and white rams in it. Two'll come down to you. They always come down to me. Then the tower.",
    decline: 'Not yet.',
    declineLine: "It's waited this long. It's a patient purse.",
    journal: [
      "White rime rams hold the Rime Ring, a ring of stones beside the Frost Road halfway up from Fellfoot to Frostwatch, and come down at whoever walks the road. Put down two.",
      "Go on up to Frostwatch and make the warden, Hew Garrick, keep Bram Kettle's purse, eleven years owed.",
    ],
    progress: ["South, up the road. Two at the ring of stones. Then the warden. Don't let him say 'Hm'."],
    done: [
      "Kettle. Eleven years. ...Hm. Every autumn that packman carries this up, and every autumn I send it down. A man wants a reason to climb a hill, and he's no ponies to talk to this year. You've spoilt that.",
      "Tell Kettle it's wiped. Tell him the venison was old, too; he'll like that less than the debt. And here. The fort pays for the road walked, if Kettle won't. You came up past the rams for it. Stand by the fire.",
    ],
    after: ["Garrick kept it. Berin says he's going up anyway, in spring, to see it's still kept."],
    others: {
      garrick: [
        "Kettle. Eleven years. ...Hm. Every autumn that packman carries this up, and every autumn I send it down. A man wants a reason to climb a hill, and he's no ponies to talk to this year. You've spoilt that.",
        "Tell Kettle it's wiped. Tell him the venison was old, too; he'll like that less than the debt. And here. The fort pays for the road walked, if Kettle won't. You came up past the rams for it. Stand by the fire.",
      ],
      signy: ["Kettle's purse? It's on my tally. 'Owed in, one purse, refused.' A line a year. I'll be glad to cross it off. I'll miss it."],
      corrie: ["He gave you the purse? I'll light the beacon tonight, then. Not for you. For him. He'll stand and look at it."],
    },
  },

  // ---------------------------------------------------------------- Frostwatch
  whitefang_camp: {
    title: 'Counting the Wall',
    giver: 'signy',
    about: "Frost goblins from Whitefang Camp, three hundred paces south of Frostwatch's south gate, come under the wall at night. Signy Arn has heard them counting, in their own tongue. Empty the camp, and the one with the ice in its teeth.",
    offer: [
      "Something comes under the south wall at night. Not over; under, along the foot of it, where the drift is. I've heard it. It counts. One, two, three; in its own tongue, but I know counting when I hear it. I've done nothing else since I was nineteen.",
      "Frost goblins, from Whitefang Camp, south of the gate. I'd like it empty, and the big one with it, the one with ice in its teeth. And I'd like to know what they were counting. I've a fair idea. I'd like to be wrong.",
    ],
    accept: "I'll empty Whitefang Camp.",
    acceptLine: "Out the south gate and straight on, three hundred paces. A stockade of ice and hides. The little ones go for your legs; the big ones go for the rest. The chief's the one with the teeth.",
    decline: 'Not yet.',
    declineLine: "Then I'll stand by the south wall tonight and count back at them.",
    journal: [
      "Frost goblins from Whitefang Camp, south of Frostwatch, come under the fort's wall at night, counting. Empty the camp, and its chief.",
      "Go back to Signy Arn, quartermaster, by the stores in Frostwatch's yard.",
    ],
    progress: ["South gate, three hundred paces. Whitefang. The one with the teeth."],
    done: [
      "Empty. ...Did you see notches, anywhere? On a post, by their chief? ...Two. Yes. They were counting the wall. Men on it. They'd got to two, and they were going to come over when they'd counted it twice and got the same.",
      "That's what I'd have done. ...Here. It was the armoury's last good staff, and the armoury's not had a hand to put anything in since the garrison went. On the tally: 'One, issued.' First in a long while.",
    ],
    after: ["I walked the south wall last night. Nothing counting. I counted to two myself, on the way back, to see how it sounded. Short."],
    others: {
      garrick: ["She's sent you to Whitefang? Hm. She's been sleeping by the south wall a week. She thinks I don't know."],
    },
  },

  mouth_guard: {
    title: 'What Sits on Your Chest',
    giver: 'garrick',
    about: "Two long-armed things have come up out of the Howling Mouth and stayed up, keeping the rocks three hundred and thirty paces east of Frostwatch, past the Mouth. They come at night to sleeping men and sit on them. They come as a pair. Kill one.",
    offer: [
      "Two things have come up out of the Mouth and stayed up. Long in the arm. Black, or dark blue; you only see them at night. They come to a sleeping man and sit on him. He wakes, and can't move, and then he doesn't wake.",
      "They come as a pair: one at the head, one at the feet. I lost my last two men that way, in their beds. Kill one and the other's half a thing; it'll go back down. Do that and I'll give you something for the dark. You'll want it, where I think you're going.",
    ],
    accept: "I'll kill one of them.",
    acceptLine: "Out my gate, round the fell by the path, past the Mouth. They'll be in the rocks beyond, east. They're fast and they come from the side. Don't lie down.",
    decline: 'Not those.',
    declineLine: "Hm. Then sleep sitting up, while you're here. I do.",
    journal: [
      "Two night demons out of the Howling Mouth keep the rocks east of it, round the fell from Frostwatch. They come as a pair: kill one.",
      "Go back to Hew Garrick in Frostwatch's yard.",
    ],
    progress: ["East of the Mouth, in the rocks. One of the two. They come from the side."],
    done: [
      "One. And the other went down the Mouth this morning, on its own. I watched it go. It went slow, like a man carrying half a load. Then I'll sleep lying down tonight. Eleven years. I'll have to remember how.",
      "Here. I carried it down the Mouth and it's the only reason I came up. A stone on a wire. It's nothing in daylight. Take it underground and it gives back what light it's drunk. It's yours. I'm not going down again.",
    ],
    after: ["Slept flat. Woke up and could move. Lay there a while moving things, to be sure."],
    others: {
      signy: ["He's sent you after the things at the Mouth? Then he's going to give you the stone. I've had it on the tally since he came up as 'the warden's, not issued'."],
    },
  },

  furs_for_the_fort: {
    title: 'Sixteen Pelts',
    giver: 'signy',
    needs: 'whitefang_camp',
    about: "Signy Arn orders the winter's furs for Frostwatch from Hoarfrost Hide, the trappers' camp a quarter-hour west down the lane, every year. Ask Ulla Thorsby for sixteen pelts. White goat men stand by the lane three hundred paces out of the gate: put down two. It's paid at the Hide.",
    offer: [
      "Furs for the winter. I send down to the Hide every year for them: sixteen pelts, for the doors and the beds of the long house. Ulla Thorsby traps, her husband skins, and they're the best on the fells. They'd tell you so.",
      "Sixteen. Write it down if you can't hold it. And there's goat men stood by the lane west, three hundred paces out, who'd stop a sledge. Not you. Go through them. The Hide's at the lane's end. You'll smell it first.",
    ],
    accept: "I'll go to the Hide.",
    acceptLine: "West out of the gate, the Hoarfrost Hide Lane. Goat men by it, three hundred paces on: two down and the third'll go up the fell. Then a quarter-hour of lane, and bones standing up out of the ground. That's the Hide.",
    decline: 'Not yet.',
    declineLine: "The doors are draughty. They've been draughty since the garrison went.",
    journal: [
      "White goat men stand by the Hoarfrost Hide Lane west of Frostwatch. Put down two.",
      "Go on down the lane to Hoarfrost Hide and ask Ulla Thorsby for the fort's sixteen winter pelts.",
    ],
    progress: ["West, down the lane. Through the goat men. Then Ulla. Sixteen."],
    done: [
      "Sixteen pelts? For two of them, in a fort for sixty? ...She's ordered sixteen every year since the garrison went. I've sent four. She writes sixteen. Tell her I'll send four. No. Don't tell her anything yet.",
      "Take the coin; Signy pays in salt, and coin's lighter. And stay. I'd send her more if I'd more. Something's been walking my line before me, and there's nothing left on it to skin.",
    ],
    after: ["I sent four pelts up the lane with Berin. Signy wrote back: 'Sixteen received, with thanks.' She always does."],
    others: {
      ulla: [
        "Sixteen pelts? For two of them, in a fort for sixty? ...She's ordered sixteen every year since the garrison went. I've sent four. She writes sixteen. Tell her I'll send four. No. Don't tell her anything yet.",
        "Take the coin; Signy pays in salt, and coin's lighter. And stay. I'd send her more if I'd more. Something's been walking my line before me, and there's nothing left on it to skin.",
      ],
      arne: ["From the fort? Sixteen? She'll want firsts, too. She's never had a second off us that she didn't send back with a note."],
    },
  },

  the_beacon_out: {
    title: "The Fort's Light",
    giver: 'signy',
    needs: 'mouth_guard',
    about: "The fire on Frostwatch's tower went out one night last week: the warden fell asleep. The climbers at Climbers' Rest, a quarter-hour south-east, watch for it from their mast. Tell Dain Scree nobody's dead. Frost goblins from the Ice Stockade, short of the Rest, have been out on the track since: put down three.",
    offer: [
      "The fire on the tower. He lights it every night; every night since I came, and before. Last week he didn't. I came out at the second hour and it was dark up there, and him asleep in his chair by the yard fire. First time.",
      "The climbers watch for it. Dain Scree, at their Rest, south-east under the Tor; they've a mast they sit up. If it's out, they think we're dead. Go and tell Dain we're not. And the goblins at the Ice Stockade saw it dark too. They've been out on the track since. Go through.",
    ],
    accept: "I'll go to the climbers.",
    acceptLine: "Out the south gate, then south-east, past the Mouth on your left, a quarter-hour. Short of the Rest the track bends by a stockade of ice: put three down and the rest'll go back in. Then a ship's mast in the snow. Don't ask.",
    decline: 'Not yet.',
    declineLine: "Then they'll go on thinking we're dead. It's not the worst thing to be thought, up here.",
    journal: [
      "Frost goblins from the Ice Stockade, north of Climbers' Rest, have been out on the track from Frostwatch since the fort's tower fire went out. Put down three.",
      "Go on south-east to Climbers' Rest, under Ravens' Tor, and tell Dain Scree that Frostwatch's tower fire was out, and nobody's dead.",
    ],
    progress: ["South-east. The Ice Stockade, short of the Rest. Then the mast. Dain Scree."],
    done: [
      "Out? I didn't see. ...I saw. I sat up all night at the foot of the mast with a rope coiled and my boots on, ready to go over. Tell her that and I'll say you're a liar. Tell her it's a fine fire.",
      "Here. That's for the goblins on the track, and for the coming. Stop a while; there's work under the Tor, and not much daylight to do it in.",
    ],
    after: ["Dain's taken to climbing the mast at dusk to see the fort's fire come up. He says it's for the pennon."],
    others: {
      dain: [
        "Out? I didn't see. ...I saw. I sat up all night at the foot of the mast with a rope coiled and my boots on, ready to go over. Tell her that and I'll say you're a liar. Tell her it's a fine fire.",
        "Here. That's for the goblins on the track, and for the coming. Stop a while; there's work under the Tor, and not much daylight to do it in.",
      ],
      garrick: ["The tower fire? ...She told you. Hm. I fell asleep. It's allowed, once. Don't tell the climbers. She has, hasn't she."],
      wynn: ["The fort's light? Dain sat at the mast all night. I brought him broth at the fourth hour. He said he was checking the stays."],
    },
  },

  into_the_deeps: {
    title: 'The First Hall',
    giver: 'garrick',
    needs: 'mouth_guard',
    hint: DELVE_HINT,
    about: "The Howling Mouth, two hundred paces east round the fell from Frostwatch, goes down into the Howling Deeps: the Wind Galleries, the Frozen Herd, then the Goat-King's Hall. Hrymgar keeps that, horned, and three times a goat man's size. Go down with a company and kill him.",
    offer: [
      "You've the stone. So. The Mouth goes down through galleries the wind cut, and past what we called the Frozen Herd, to a hall somebody cut long ago. The Goat-King's Hall. In it is Hrymgar. Horned, like the goat men on the high ground, three times the size, with ice grown on him.",
      "He took my rope and four of my six. I've had a long while to think about him. Go down with people at your back and kill him. Then come up and tell me how he lay. I'd like to hear it from somebody.",
    ],
    accept: "I'll go down.",
    acceptLine: "The split in the rock, east round the fell. It won't take one alone; the dark doesn't. Bring a company. And when it howls, that isn't him. That's what's under him. He only bellows.",
    decline: 'Not yet.',
    declineLine: "Hm. No. I've waited this long. I can't call you slow.",
    journal: [
      "The Howling Mouth, east round the fell from Frostwatch, leads down into the Howling Deeps. Go in, with a company.",
      "Kill Hrymgar the Goat-King, in the Goat-King's Hall of the Howling Deeps, past the Frozen Herd.",
      "Go back to Hew Garrick in Frostwatch's yard.",
    ],
    progress: ["Down the Mouth. Past the herd. The Goat-King's Hall. You'll not mistake him."],
    done: [
      "Dead. In his own hall, under his own roof. ...I left four of mine past the herd, going down. I'd like to think they saw him carried by them the other way.",
      "I had this made for the day I went back down. I'm not going. It ought to go, though. Take it. And the fort's coin; there's nobody else to spend it on.",
    ],
    after: ["I've struck four names off the list. Not off the list. Off the part of it headed 'owed'."],
    others: {
      signy: ["Down the Mouth? He's not sent anyone down since the six. On the tally that's 'one, sent'. I'll want to write 'one, back'."],
    },
  },

  the_sleeper: {
    title: 'The Sleeper',
    giver: 'garrick',
    needs: 'into_the_deeps',
    hint: DELVE_HINT,
    about: "Below the Goat-King's Hall the Howling Deeps stop being cut and start being grown: the Brood Mother breeds there, in her pit. Under her, in a lake of ice, something sleeps, and its breathing is the howl out of the Mouth. Go down with a company and kill her, then the Sleeper.",
    offer: [
      "Below the hall it stops being cut and starts being grown. Something breeds there. I never saw her. I saw what she bred: eight legs apiece, down the walls at us on threads. With Hrymgar dead there's nothing between her and the Mouth.",
      "And under her there's a lake of ice, and a thing asleep in it. That's the howl: when the wind drops and the Mouth keeps going, that's it breathing. The climbers at the Rest hear it from the Tor. Kill her, then go to the bottom and end it while it's lying down.",
    ],
    accept: "I'll go to the bottom.",
    acceptLine: "Past the hall, down. Burn the webs where you can and look up; they're on the roof before they're on you. Then a stair with no light, and the lake. If it opens its eyes before you're ready, don't be proud. Come up and go down again.",
    decline: 'Not yet.',
    declineLine: "No. When you're ready. It's slept this long.",
    journal: [
      "Below the Goat-King's Hall of the Howling Deeps, the Brood Mother breeds. Find her in her pit and kill her.",
      "At the bottom of the Howling Deeps, something sleeps in a lake of ice, and its breathing is the howl. Kill the Sleeper.",
      "Go back to Hew Garrick in Frostwatch's yard.",
    ],
    progress: ["Below the hall. The mother of them, then the lake. Look up."],
    done: [
      "It's stopped. I stood in the yard an hour to be sure. There's only wind. Real wind. I'd forgotten it had gaps in.",
      "Signy came out and stood by me a while and didn't say anything. Then she fetched this from the stores and wrote something on the tally, and wouldn't tell me what. For whoever stopped it.",
    ],
    after: ["The fells are quiet. I find I miss the howl. Hm. I'm glad to."],
    others: {
      signy: ["He's sending you to the bottom? Then he thinks it can be done. I've a thing in the stores I've kept for that day. Go and make it the day."],
    },
  },

  // ---------------------------------------------------------------- Hoarfrost Hide
  the_round: {
    title: 'My Round',
    giver: 'ulla',
    about: "Something walks Ulla Thorsby's trap-line every night before she does, in the order she walks it, and takes what's in the sets. Two wolves that stand up lie in the rocks two hundred and ninety paces north of Hoarfrost Hide, where her line turns. Put down one: she'll know which.",
    offer: [
      "My line goes north from the Hide and round. I walk it every morning in the same order: old Haskel's order. He had the line before me, and taught me it, and one winter didn't come in off it. Every morning now something's walked it before me, in that order, and emptied it.",
      "It's learned my round. Off me. Wolves that stand up, two of them, in the rocks north where the line turns. I want the one that walks it. Kill one; it'll be that one. The other's never had the patience.",
    ],
    accept: "I'll walk your round.",
    acceptLine: "North, two hundred and ninety paces, up along the line. Don't touch the sets. Rocks where it turns. They stand up when they see you. Then they come on all fours, faster. Go for the legs.",
    decline: 'Not now.',
    declineLine: "Then I'll walk it after it again tomorrow. I'm getting good at it.",
    journal: [
      "Something walks Ulla Thorsby's trap-line every night before her, in the same order, and empties it. Two wolves that stand up lie in the rocks north of Hoarfrost Hide where her line turns. Put down one.",
      "Go back to Ulla Thorsby at Hoarfrost Hide.",
    ],
    progress: ["North, where the line turns. One of the two."],
    done: [
      "Arne went up and looked at it. It had boots on. Old ones, laced round the shin with gut, the way Haskel laced his. ...It never learned my round. It's his round. I'm the one that learned it.",
      "Take that. I'll walk it the other way round tomorrow, and a new way the day after. It's my line now. He'd have said about time.",
    ],
    after: ["I walked the line backwards this morning. Two martens. First in a month. Arne says they're seconds. I don't care."],
    others: {
      arne: ["Her round? Haskel's, it was. She walks it the way he did, stop for stop. I walked it for her a week once and did it wrong and she knew from the snares."],
    },
  },

  the_white_larder: {
    title: 'The Whole Trap',
    giver: 'ulla',
    about: "Five of Ulla Thorsby's iron traps have gone from her sets, pegs and all, and turned up round the White Larder, the white spiders' nest two hundred and ten paces west of Hoarfrost Hide. Bring back five, from round its outside.",
    offer: [
      "Something else. I've lost traps. Iron traps, the big ones, pegged, for marten and fox. Five gone. Not sprung and dragged off. Lifted, peg and chain, the way I'd lift them myself.",
      "Arne's seen one, west, by the White Larder. The spiders' nest; the white kind, in the rocks. Bring me five back from round the outside of it. I'll not ask you into it. I'll not go near it.",
    ],
    accept: "I'll bring your traps.",
    acceptLine: "West, past the frames and the bones, two hundred and ten paces. White thread on the rocks. The traps'll be round it; a couple close in. Mind where you put your feet. I would.",
    decline: 'Not now.',
    declineLine: "I've other traps. Not as good.",
    journal: [
      "Five of Ulla Thorsby's iron traps have gone from her sets and turned up round the White Larder, the white spiders' nest west of Hoarfrost Hide. Bring back five from round it.",
      "Go back to Ulla Thorsby at Hoarfrost Hide with the traps.",
    ],
    progress: ["West. The Larder. Five traps. Mind your feet."],
    done: [
      "Set, were they? ...Look at the chains. That's not my knot. That's a skinner's hitch. That's Arne's. He's been setting my traps round the Larder, for the spiders. For the thread. He's been after white silk to sew his firsts with all winter.",
      "He'll say he was going to tell me. Take the coin. I'll keep the traps, and he can ask me nicely for them, and I'll say no, nicely.",
    ],
    after: ["Arne's on the block today, sewing with plain thread. He's not said a word. Nor have I. It's very restful."],
    others: {
      arne: ["The traps? ...Did she say where they'd got to? ...Ah. Well. A white silk's a first. You'd do the same."],
    },
  },

  white_at_the_root: {
    title: 'White at the Root',
    giver: 'arne',
    about: "White howlers den in the Frozen Scrape, two hundred and fifty paces south-east of Hoarfrost Hide, and Arne Thorsby has graded every pelt off these fells since he was a boy, and never had a white one off his frames. Empty the Scrape, and the big one.",
    offer: [
      "The Frozen Scrape. South-east, past the frames. White howlers. Big. A white pelt's a first. The best there is, and I've never had one on my frames. Not one. She says they don't come near the line. They don't come near anything. They come out of the Scrape and back in.",
      "Empty it. The big one too. I'll go up after with the knife. I'd like a white one on my frames before I'm done. One.",
    ],
    accept: "I'll empty the Scrape.",
    acceptLine: "South-east, two hundred and fifty paces, past the frames. A scrape in the snow, deep, and bones round it. They come out together. The big one comes last. It's the one to watch.",
    decline: 'Not yet.',
    declineLine: "Mm. I've waited this long. I can wait a month.",
    journal: [
      "White howlers den in the Frozen Scrape, south-east of Hoarfrost Hide. Empty it: every one of them, and the big one.",
      "Go back to Arne Thorsby at Hoarfrost Hide.",
    ],
    progress: ["South-east. The Scrape. The big one comes last."],
    done: [
      "I went up with the knife. ...Grey at the root. Every one of them. They're not white wolves. They're old ones. Wolves that lived long enough to go white. Old as me, some of them, for a wolf.",
      "Seconds, then. All of them. ...Here. It was in the Scrape, under the big one. Take it. I'll not have it on the frames. I'll cut you a second off the big one for your coat. It's a good second.",
    ],
    after: ["I've one of the white ones on the frames. Grey at the root. I look at it and it looks like a first, till you part the hair. Like most things."],
    others: {
      ulla: ["He's sent you for a white one? He's wanted a white one since before we were married. I'd have gone myself, if I'd thought it'd stop him talking about it."],
    },
  },

  fat_for_the_lamps: {
    title: 'Fat for the Lamps',
    giver: 'ulla',
    needs: 'white_at_the_root',
    about: "Every winter Hoarfrost Hide sends the fat off its pelts up to the Frozen Shrine, a quarter-hour north-west up the lane, for the lamps. Tell Sister Brynn it's put by. Frost goblins have camped by the lane under the shrine this winter, at Snowgate: put down two. It's paid there.",
    offer: [
      "There's a sister at the shrine, north-west up the lane. Brynn. She burns fat in the lamps when the pilgrims' candles are gone, and they're gone by now. I send her the fat off the pelts every winter. Twelve crocks. It's put by.",
      "Go and tell her it's ready. She'll come with her hand-sledge, and try and pay me; don't let her. And there's goblins camped by the lane under her this winter, at Snowgate. She'll not have said. Go through two of them, so she can get her sledge down.",
    ],
    accept: "I'll go to the shrine.",
    acceptLine: "North-west, up the lane, a quarter-hour. Near the top there's a goblin camp just off it, east of the shrine. Then the lane goes round the hill and comes out under the steps: white stone, four pillars, two fires.",
    decline: 'Not yet.',
    declineLine: "Then she'll come asking. She always comes asking.",
    journal: [
      "Frost goblins have camped at Snowgate, by the lane up from Hoarfrost Hide, just short of the Frozen Shrine. Put down two.",
      "Go on up the lane to the Frozen Shrine and tell Sister Brynn that Ulla Thorsby has the winter's fat put by for the lamps.",
    ],
    progress: ["North-west up the lane. Two at Snowgate. Then Brynn. Tell her she's not to pay."],
    done: [
      "Fat from the Hide? Then the lamps go through to spring. Thank you. Ulla always says she doesn't want anything. She always says it the same way, and I always bring her a candle, and she always lights it.",
      "And you came up past Snowgate. I hear them at night from the steps. Take this, from the shrine's box. Stay a little. Something comes up to my fires at night, and I'd be glad of someone awake who isn't me.",
    ],
    after: ["Sister Brynn came down with the hand-sledge. She left a candle on the block. Ulla says she didn't light it. Arne says she did."],
    others: {
      brynn: [
        "Fat from the Hide? Then the lamps go through to spring. Thank you. Ulla always says she doesn't want anything. She always says it the same way, and I always bring her a candle, and she always lights it.",
        "And you came up past Snowgate. I hear them at night from the steps. Take this, from the shrine's box. Stay a little. Something comes up to my fires at night, and I'd be glad of someone awake who isn't me.",
      ],
      arne: ["The fat? Twelve crocks. Firsts, all of it. The only firsts we've had this winter, and they're going to a lamp."],
    },
  },

  // ---------------------------------------------------------------- the Frozen Shrine
  the_fires: {
    title: 'Never Gone Out',
    giver: 'brynn',
    about: "Something comes up by night from the Rime Coven, the witches' ring four hundred and forty paces south-west of the Frozen Shrine, down off its hill, and puts the shrine's two fires out with snow. Go to the coven after dark and put down three of them.",
    offer: [
      "Something comes up to my fires at night. From the Rime Coven, south-west, down the slope: women in white, with ice in their hair. They don't come up the steps. They stand at the fires and put them out. With snow, a handful at a time, carried up in their hands.",
      "Go down there after dark, when they're out among the stones, and stop three. I'll be at the fires. Somebody has to be.",
    ],
    accept: "I'll go after dark.",
    acceptLine: "South-west, four hundred and forty paces, down off the shrine's hill. Black stones in a ring, a slab in the middle, and a fire by it that gives no heat. After dark they're out on it. They throw cold at you, and worse. Keep moving.",
    decline: 'Not yet.',
    declineLine: "Then I'll sit up with them again. I'm good at sitting up.",
    journal: [
      "Rime witches come up from the Rime Coven, south-west of the Frozen Shrine, by night, and put the shrine's fires out with snow. Go to the coven after dark.",
      "Put down three of those at the Rime Coven.",
      "Go back to Sister Brynn at the Frozen Shrine.",
    ],
    progress: ["South-west, the Rime Coven, after dark. Three of them."],
    done: [
      "Carrying snow. Yes. ...You'll have heard the pilgrims say these fires have never gone out since the shrine was built. They've gone out every night this month. I've a flint. I light them again before first light.",
      "Don't tell the pilgrims. It's true in the way that matters: nobody's ever come up the hill and found them out. Here. That's the shrine's, for keeping the watch with me.",
    ],
    after: ["They stayed in last night. I sat up anyway, with the flint in my hand, out of habit. I'll get out of it."],
    others: {},
  },

  names_on_the_wind: {
    title: 'Names on the Wind',
    giver: 'brynn',
    about: "Pilgrims to the Frozen Shrine tie strips of cloth on its lines, each with a name on it, for someone. The strips are going, and they're seen at Hornfrost Stones, the goat men's stones three hundred and twenty paces south-east, by the lane. Bring back five, from round them.",
    offer: [
      "In summer the pilgrims tie strips on the lines by the cairns. A name on each, for somebody: the dead, mostly, or somebody far off. The wind takes the names away. It's a good use for wind.",
      "This winter the strips are going off the lines, and not on the wind. They're down at Hornfrost Stones, south-east by the lane. I've seen them from the steps, on the stones, and on the goat men. Bring me five back. Round the outside will do.",
    ],
    accept: "I'll bring the strips back.",
    acceptLine: "South-east, three hundred and twenty paces, down by the lane. Standing stones, and white goat men among them, and rams. The strips'll be about the stones, a couple close in. You'll know them by the writing. Pilgrims write badly. It's cold.",
    decline: 'Not now.',
    declineLine: "They'll keep. Names keep.",
    journal: [
      "The pilgrims' strips are going off the Frozen Shrine's lines, each with a name on it, and they're seen at Hornfrost Stones, the goat men's stones south-east of the shrine. Bring back five from round them.",
      "Go back to Sister Brynn at the Frozen Shrine with the strips.",
    ],
    progress: ["South-east. Hornfrost Stones. Five strips. The bad writing."],
    done: [
      "Tied on? To the stones, and round their own horns? Facing the wind, names out? ...That's how it's done. Just so. They don't know what they're for. They know they're for something.",
      "I'll put these back on the lines. And this is the shrine's thanks, which is coin; it's all the shrine has that isn't cold. Somebody's going to have their name said again tonight, at the third watch, who'd stopped being said.",
    ],
    after: ["I say the five names at the third watch now, with the rest. One of them's mine. My mother tied it the year I came up. I didn't know till you brought it."],
    others: {},
  },

  the_hoar_circle: {
    title: 'The First Ring',
    giver: 'brynn',
    needs: ['names_on_the_wind', 'the_fires'],
    about: "The Hoar Circle, three hundred and eighty paces west of the Frozen Shrine up the hill, is a ring of old stones, and things keep it that never sleep, with a nightmare among them. Empty it, and the big one.",
    offer: [
      "The circle up the hill, west. Things keep it that never sleep: thin, pale, quick. And one among them that walks into your dreams and sits down. On the bad nights I don't keep the third watch. It keeps me.",
      "I'd like it empty. And I'd like it ours again.",
    ],
    accept: "I'll empty the circle.",
    acceptLine: "West, up the hill, three hundred and eighty paces. A ring of stones with frost on it even in summer. The pale ones come fast. The big one comes slow, and you'll want to lie down when it does. Don't.",
    decline: 'Not yet.',
    declineLine: "No. When you've a mind. I'll sweep.",
    journal: [
      "The Hoar Circle, west of the Frozen Shrine, is kept by things that never sleep. Empty it: every one of them, and the nightmare among them.",
      "Go back to Sister Brynn at the Frozen Shrine.",
    ],
    progress: ["West. The circle. The big one. Don't lie down."],
    done: [
      "Empty. ...It was ours, the circle. The first one. The sisters kept the third watch up there in a ring of stones, before there was a shrine: awake all night, so nothing else had to be.",
      "Then a hard winter got into the stones, and they came down the hill and built this, out of the wind. Something went up and kept the watch for them. Badly. Here. That came down with the first sisters. It's no use to anyone in a chest.",
    ],
    after: ["I walked up to the circle this morning and said the third watch in it. It's very cold. I can see why they came down."],
    others: {},
  },

  // ---------------------------------------------------------------- Climbers' Rest
  ravens_tor: {
    title: "Ravens' Tor",
    giver: 'dain',
    about: "Harpies have taken the top of Ravens' Tor, the crag a hundred and thirty paces east of Climbers' Rest, and their queen with them. They cut the climbers' ropes and drop the ends on whoever's below. Go to the Tor and put down two of the three.",
    offer: [
      "The Tor. A crag with a flat top. It was ravens' ground; three eggs in the nest on the cap right now. Now it's harpies', and they've a queen. They cut our ropes. Not bite; cut. And drop the ends on whoever's below, to watch them look up.",
      "With the queen dead the rest scatter; they're not clever without her. There's three up there. Go up and kill two. Take her first, if you can tell her. You'll be able to tell her.",
    ],
    accept: "I'll go up the Tor.",
    acceptLine: "East, a hundred and thirty paces. The stair's cut up the west side to the first ledge. They dive. Stand where there's rock at your back, and let them come to you.",
    decline: 'Not a climb.',
    declineLine: "No. It's a climb. Not everyone's built for it.",
    journal: [
      "Harpies have taken Ravens' Tor, east of Climbers' Rest, and cut the climbers' ropes. Go to the Tor.",
      "Put down two of the three harpies on Ravens' Tor.",
      "Go back to Dain Scree at Climbers' Rest.",
    ],
    progress: ["The Tor. East. Two of the three. The big one's the queen. She'll let the others come first."],
    done: [
      "Two. I saw the third go over this morning, heading south, screaming at nothing. On its own. That's the end of them on the Tor.",
      "That's yours. And there's three eggs still in the nest; Wynn went up at first light to look. That's what we climb for, in the end. To look at them, and leave them.",
    ],
    after: ["Ravens on the Tor again. Two. They sit where she sat. I approve of that."],
    others: {
      wynn: ["The Tor? They cut my rope on the east face last week with me on it. I was on a hold. A good hold. Tell Dain I said 'a good hold'."],
      garrick: ["The Tor? The climbers' now. I'd a snare line up there once. She had it. I hope the climbers have better luck. Hm."],
    },
  },

  by_my_holds: {
    title: 'Five Chisels',
    giver: 'wynn',
    about: "Five of Wynn Halse's chisels have gone off the ledge on Ravens' Tor where she leaves them overnight, and a storm harpy of the Thunder Crag, three hundred paces west-south-west of Climbers' Rest, was seen carrying iron. Bring back five, from round the crag.",
    offer: [
      "I cut holds with a chisel and a maul, and I leave them on the first ledge overnight, because carrying iron up the Tor every morning is how you lose a finger. I've lost two the other way. Five chisels gone. Good ones.",
      "The storm harpies on the Thunder Crag, west, over the rise. Dain saw one go over with something in its feet that flashed. Bring me back five. I'd go myself. Dain's hidden my boots.",
    ],
    accept: "I'll fetch your chisels.",
    acceptLine: "West-south-west, three hundred paces, the crag the lightning likes. They'll be round it; a couple in close by the roost. Don't stand on the top in a storm. Don't stand under it either.",
    decline: 'Not now.',
    declineLine: "I'll cut with the little one. It's slow. Everything up here is.",
    journal: [
      "Storm harpies from the Thunder Crag, west of Climbers' Rest, have carried off Wynn Halse's chisels from the ledge on Ravens' Tor. Bring back five from round the crag.",
      "Go back to Wynn Halse at Climbers' Rest with the chisels.",
    ],
    progress: ["West-south-west. The Thunder Crag. Five chisels. Mine have tape on the haft."],
    done: [
      "Four of these are mine. This one isn't. ...That's Mother's mark on the haft, the M with a tail. She dropped one off the north face the winter before she stopped climbing, and looked for it every spring after. They've had it all this time.",
      "Take that. I'll cut with hers tomorrow, on the north face, where she lost it. Dain needn't know where. Dain! My boots. ...And the fifth of mine they've still got. Let them keep it. They've earned one.",
    ],
    after: ["Cut three holds on the north face with Mother's chisel. They came out like hers. I don't know how a chisel remembers."],
    others: {
      dain: ["Her chisels? She'd have gone after them herself in her socks. I hid her boots. I'll give them back when you're down."],
    },
  },

  winterfast: {
    title: 'The Pennon',
    giver: 'dain',
    needs: 'ravens_tor',
    about: "The pennon on Climbers' Rest's mast has pointed at Winterfast, the rime coven's fast four hundred paces south, for a month, whatever the wind's doing. Dain Scree wants the wind back. Empty Winterfast, and its storm-caller.",
    offer: [
      "Look at my pennon. It points south. It's pointed south a month. This morning the smoke off the fire went north and the pennon went south. A pennon can't do that. Mine does.",
      "It's pointing at Winterfast. Four hundred paces south: a coven of them, and one who calls the weather down. Every time we go up the Tor, the wind comes round on us. Empty it. The caller too. I want my wind back.",
    ],
    accept: "I'll empty Winterfast.",
    acceptLine: "South, four hundred paces. Follow the pennon; it'll take you. Witches with ice on them, the little ones between, and the caller. She'll throw lightning. Get behind something that isn't the mast.",
    decline: 'Not yet.',
    declineLine: "No. I'll climb into the wind a while more. I'm used to it.",
    journal: [
      "The pennon on Climbers' Rest's mast has pointed at Winterfast, the rime coven's fast south of the camp, for a month, whatever the wind. Empty it: every one of them, and its storm-caller.",
      "Go back to Dain Scree at Climbers' Rest.",
    ],
    progress: ["South, four hundred paces. Follow the pennon. The caller."],
    done: [
      "Look. ...It's hanging. Just hanging, and now it's going round to the north-west. Where the smoke goes. It points where the wind goes. I'd forgotten that was all a pennon did.",
      "Here. A climber wants a stick for the going down, and that's a better stick than most. Take it. We'll go up the Tor in the morning, all of us, into a wind that's only a wind.",
    ],
    after: ["Pennon's north-west this morning, and the smoke with it. I stood and watched it a good while. Wynn asked if I was well. I said the pennon was."],
    others: {
      wynn: ["Winterfast? Good. The wind's been at my back on the face all month, pushing. You don't want a wind that's trying."],
    },
  },

  // ---------------------------------------------------------------- The Heralds (docs/ELDER-DRAGONS.md "On the land")
  the_cold_that_remembers: {
    title: 'The Cold That Remembers',
    giver: 'dain',
    needs: ['winterfast'],
    about: "Dain Scree's mast frosts over on its lee side, at noon, in the sun, and his ropes freeze stiff on the pins. It comes from the west: six hundred paces west of Climbers' Rest, on a level shelf below the scree, a dragon of old bone and ice lies with its head on its claws and the cold pouring off it like water off a bow. Selvhra, the Herald of the Cold. Put it down.",
    offer: [
      "Everyone looks up first. You did. Good. Now look at the mast. Frost. On the lee side, at noon, with the sun on her. That's not weather. Weather comes from somewhere, and it comes from all round. This comes from west.",
      "I took the glass out. Six hundred paces west, on the shelf below the scree, there's a dragon of old bone and ice with its head on its claws, and the cold comes off it like water off a bow. I've seen whales, and the thing that eats whales. Not that. Put it down.",
    ],
    accept: "I'll put it down.",
    acceptLine: "It stands when you come close. The cold goes out from it in rings; you'll see the frost run across the stone ahead of each. Be off the ring before it comes. Others will come to it when it stands. Let them in. There's no pride on a lee shore.",
    decline: 'Not today.',
    declineLine: "Then I'll be thawing rope over the kettle till you do. Mind the frost going down.",
    journal: [
      "Dain Scree's mast frosts on the lee side at noon. Six hundred paces west of Climbers' Rest, a dragon of bone and ice lies on a shelf below the scree with the cold pouring off it: Selvhra, the Herald of the Cold. Put it down.",
      "Go back to Dain Scree at Climbers' Rest.",
    ],
    progress: [
      'West, six hundred paces, on the shelf. You\'ll know it when your breath stops smoking and starts falling.',
      "When it reaches for whoever's furthest off, don't be the furthest. Come in to the others.",
      'At the end the cold comes down everywhere at once. Get in the light it leaves on the stone: the only warm place on that shelf.',
    ],
    done: [
      "Hear that? The mast. The frost's coming off her, running. Drip, drip, off every pin. ...Best sound I've heard since I stepped her up here.",
      "On ships we'd say a thing like that was running before something. The pilgrims up the Sorrowhorn say there's a door at the top with seals on it, and what's behind each seal turns over when its herald dies. Turns over to sleep, or to wake? Here. Take it.",
    ],
    after: [
      "No frost on her since. I check every noon, all the same. Old habits. A ship teaches you that the thing you stopped watching is the thing that gets you.",
    ],
    others: {
      wynn: ["Dain's had you after the ice-beast? He sat up all night with the glass. Two fingers short, and I'd still not go near that shelf. You've all yours. Use them."],
    },
  },
};
