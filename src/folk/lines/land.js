// The land beyond Bellmourn: the people posted in the small towns and the forts (src/folk/people.js POSTED), Ser Hale Orrowick
// at the Bell Tower (BEYOND in beyond.js), and every word of the quests that take you out to them and down into the three
// party dungeons. Their workings are src/folk/land-quests.js. Bible: tools/folk/cast.md, "The small towns" and "Quests of
// the land".
//
// The two letters hold in the writing out here too. Thornwick and Cinderford are plain folk's, of neither letter: they name
// neither power. Ser Hale is Tessariel's man: where he speaks of the keep at the end of the west road and what's in it, he
// names nothing of the order's (the tower, the bells, the watches, the seals) in the same line, and never says whose keep it is.
// Nobody at Cinderford speaks of the Bell Tower, and nobody at Thornwick of the keep.

export const LINES = {
  // ---------------------------------------------------------------- Thornwick
  dorcas: {
    first: [
      "Dust to the knee and nothing on your back. You've walked from Bellmourn. Sit. You'll eat before you tell me why. That's the rule of this house, and I made it.",
    ],
    greet: {
      morning: [
        "Porridge is on. It's been on since before light. So have I.",
        "Road's empty both ways this morning. I've stopped liking that.",
      ],
      day: [
        "Nobody up from the south since the wool carts stopped. You're the first boots through that door in nine days.",
        "If you're hungry, say so. If you're not, you're lying. It's two days from anywhere.",
      ],
      evening: [
        "Bar the door behind you. Not for thieves. For the smell that comes up the road after dark.",
        "Supper's mutton. It's always mutton. Thornwick is a thing sheep do.",
      ],
      night: [
        "Still up? So's the lamp in the south window. I keep it for whoever's still coming. Nobody is. I keep it.",
        "Quiet. Listen to that. A whole inn, and you can hear the thatch settle.",
      ],
    },
    about: [
      "Dorcas Pym. The Hare and Harrow's mine since Pym died, and it was mine before that, only he held the key.",
      "Six rooms. I used to turn carters away. Now I air the beds so they don't forget what they're for.",
    ],
    ask: {
      dead: [
        "Ours walk too. Not many. They come up the road from the hanging wood with the sickness still on them. Osric says the hedge stops them. The hedge stops sheep.",
      ],
      town: [
        "Bellmourn? I had a girl from there one summer, to help with the wool fair. She said you've a bell that rings itself. I said we've a cockerel does the same and nobody writes it down.",
      ],
      road: [
        "North-west to Bellmourn, two days for a cart. South-east to Hangman's Cross, one, and nobody goes. There's a toll halfway, or was. Wat Arden kept it. He ate here Thursdays.",
        "A road's only a road while somebody's on it. Go nine days without boots and it starts being a field again.",
      ],
      tessariels: [
        "One came through in spring, all in silver. Wouldn't eat. Said the light would feed him. He went south. I'd have packed him something.",
      ],
    },
    topics: { road: 'The Gallows Road' },
    bye: [
      "Mind the road. And come back by it.",
      "There's a bed if you want one. There's always a bed.",
    ],
    barks: {
      player: ["You're letting the cold in, standing there.", "Are you eating or looking?"],
      day: ["Nine days. Not a cart.", "Somebody see to that south shutter."],
      evening: ["Lamp's lit in the south window.", "Mutton. Don't ask."],
      magic: ["Not in my yard! The thatch is dry!", "Well. That's the fire lit, then."],
    },
  },

  osric: {
    first: [
      "Hold there. Hands where I can see them. ...A staff. And that's a skull. Well, you came in by the gate and not through the hedge, so you're no goat. That's the whole of my test.",
    ],
    greet: {
      morning: [
        "Walked the hedge at first light. Two new gaps on the west side. Something leaned on it.",
        "Morning. If you see a sheep outside the thorn, it isn't ours any more.",
      ],
      day: [
        "A laid hedge takes seven years to make and one night to break. I've had a lot of nights lately.",
        "Gate's open till dusk. After that you knock, and I think about it.",
      ],
      evening: [
        "Light's going. Inside the thorn, if you're staying.",
        "Count the lambs in, shut the gate, and hope whatever's out there had a long day too.",
      ],
      night: [
        "Who's that? ...You. Come in off the road. Nothing good stands out there at this hour, and that includes you.",
        "Hear that? West side. That's horn on blackthorn. They're trying it again.",
      ],
    },
    about: [
      "Osric Thorne. Hedge-reeve. My father laid the west side and his father the north. I've mostly mended.",
      "A reeve in Bellmourn has a desk, I'm told. I have a billhook. It gets more done.",
    ],
    ask: {
      dead: [
        "The dead don't trouble the hedge. They walk into it and stand there till morning, like a man who's forgotten what he came for. It's the goat men that break it.",
      ],
      town: [
        "Bellmourn sends a letter once a year to ask if we're still here. We send one back to say we are. That's been the whole of it since my father's time.",
      ],
      hedge: [
        "Blackthorn and hawthorn, laid on the slant and woven. Eight foot high and four through. It's the only wall plain folk were ever let build, because it's only a hedge.",
        "Thornwick's the hedge. The houses are just what's inside it.",
      ],
      goats: [
        "Goat men. Up on the downs, north-west, where the track leaves the road. They stand on two legs and they hate a fence. I don't know why. I've never got near enough to ask.",
      ],
    },
    topics: { hedge: 'The hedge', goats: 'The goat men' },
    bye: [
      "Go by the gate. Always by the gate.",
      "Mind the thorns going out. They don't know you.",
    ],
    barks: {
      player: ["Looking for the way out? It's the gap with a gate in it.", "Don't lean on that."],
      morning: ["Two new gaps. West side.", "Something leaned on it in the night."],
      day: ["Gate's open till dusk.", "That's not a sheep track. Too wide."],
      magic: ["Mind the hedge! It's dry as tinder!", "That's no shepherd's trick."],
    },
  },

  wymond: {
    first: [
      "Ah. Somebody new, and walking, and not yet dead. That's three blessings before I've opened my mouth. Wymond Ebb. I bless things. Don't look for a house on me; I haven't one.",
    ],
    greet: {
      morning: [
        "I've blessed the well, the ewes and Dorcas's porridge. The porridge needed it most.",
        "Good morning. It usually is, till somebody tells me otherwise.",
      ],
      day: [
        "A hedge-priest is a priest with no roof. So nobody can burn it. I thought of that myself.",
        "You've a skull in your hand. I've buried a good many. I never thought to carry one about. Does it mind?",
      ],
      evening: [
        "The light goes, and I say the words over it, and it goes anyway. But it comes back. I take some of the credit.",
        "Sit by the cross a while. It doesn't stand for anything. That's why it's still standing.",
      ],
      night: [
        "Can't sleep? Nor I. I say the names of everyone I've buried. I'm at the Fs.",
        "There's something on the south road tonight. I've blessed it from here. I shan't go closer.",
      ],
    },
    about: [
      "Wymond Ebb. I was a clerk, once, in a house with a roof and a name, and then one year there was neither. So now I walk. Lambs, wells, weddings, the newly dead.",
      "Whose words do I say? Mine. Old ones. I've rubbed the names off them so they'll fit in any mouth.",
    ],
    ask: {
      dead: [
        "They aren't wicked. I've stood near enough to see. They're lost, and somebody has hold of the other end of them. I'd bless that somebody if I knew where to throw it.",
      ],
      town: [
        "Bellmourn! I buried a carter from Bellmourn. He asked for the bell to be rung. I rang a sheep bell. He was past minding.",
      ],
      blessing: [
        "Salt, water, and saying it as if you mean it. That's all a blessing is. The meaning it is the hard part. Some days I only manage the salt.",
        "I bless what's put in front of me. I don't ask it which side it's on. A lamb doesn't know.",
      ],
      lis: [
        "An old woman with a stick came through at lambing and blessed the same ewe I had, straight after, without asking. The ewe had triplets. I haven't decided how I feel.",
      ],
    },
    topics: { blessing: 'Blessings' },
    bye: [
      "Go well. I've said the words for your feet.",
      "Mind how you go. I'd rather not get to your letter yet.",
    ],
    barks: {
      player: ["Bless you. No, stand still, I've started.", "You've a kind face. The skull hasn't."],
      morning: ["Well's blessed. Drink up.", "The Fs. Farrow, Fenn, Fitch..."],
      day: ["It doesn't stand for anything. That's the point.", "Salt, water, and meaning it."],
      magic: ["Now THAT wants blessing. Hold still.", "I felt that in my fillings."],
    },
  },

  // ---------------------------------------------------------------- Cinderford
  hasket: {
    first: [
      "Halt. Name and business. ...No, look at you. No harness, no horse, and you came from the east. You're not theirs. Hasket. Sergeant. This is Cinderford, and it stops here.",
    ],
    greet: {
      morning: [
        "Morning report. West road: clear to the second marker. Past that I can't see, and I don't send.",
        "Eleven on the wall at muster. It was thirty the year I took the stripe.",
      ],
      day: [
        "If you're going west, say so now, so I know which way to look for you.",
        "Smoke's from the kilns. If you see smoke west of the ford, that isn't ours. Tell me.",
      ],
      evening: [
        "Gate shuts at dusk. If you're out, you're out. I won't open it for a voice.",
        "They ride at dusk. Twos and threes. They don't come to the wall. They sit their horses and look at it.",
      ],
      night: [
        "Quiet on the wall. Speak low. Sound carries over ash.",
        "See those lights, far west? Fires. Lit day and night. That's the road to the keep. You get used to them. That's the worst of it.",
      ],
    },
    about: [
      "Brenna Hasket. Sergeant of the Cinderford watch. There's no captain. There was. He rode west to parley.",
      "A stockade, a ford and a tower. I hold all three with eleven and a charcoal burner who can shout.",
    ],
    ask: {
      dead: [
        "The dead I can manage. They walk at a wall and stop. It's the ones that used to be neighbours I've no order for. They come back from the west, and they know the gate-word.",
      ],
      town: [
        "Bellmourn's four days east, with a watch of three and a hunter. I know, because I wrote to ask for men. Captain Halloway wrote back, very civil, with none.",
      ],
      knight: [
        "One knight? At a church door? Send him here. I've a road full of them, and mine move.",
      ],
      west: [
        "West of the ford the ground goes grey. Past the burnt mill, the old carters' rest at Khel. Past Khel, the keep. Blackvigil. I've seen its fires. I've not seen its gate, and I mean to keep it so.",
        "They wear red over black. They don't shout, they don't loot, and they don't hurry. I'd be happier if they did.",
      ],
      cinderford: [
        "Last free hearths on the west road. That's not a boast. It's a count. There were others.",
      ],
    },
    topics: { west: 'The west road', cinderford: 'Cinderford' },
    bye: [
      "Gate's that way. Dusk, mind.",
      "Go on. And if you go west, come back the same shape.",
    ],
    barks: {
      player: ["Stand clear of the gate.", "State it or move on."],
      morning: ["Eleven at muster.", "West road clear to the second marker."],
      evening: ["Gate shuts at dusk!", "Twos and threes. Watch the ridge."],
      magic: ["HOLD! ...Hold. It's on our side. I think.", "Do that facing west."],
    },
  },

  colm: {
    first: [
      "Mm. Stand upwind. No, the other upwind. There. You'll want to know who I am. Burrage. I burn wood slow till it's worth more. Took me thirty years to say it that short.",
    ],
    greet: {
      morning: [
        "White smoke. That's the wet coming off. Day two. Don't touch the turf.",
        "I've not slept. You don't, on a burn. You doze stood up and listen for it to breathe wrong.",
      ],
      day: [
        "Blue smoke by tomorrow, if she holds. Blue's the wood giving up. Then you shut her down and wait.",
        "A kiln's like a town. Let air in at the wrong place and it all goes at once.",
      ],
      evening: [
        "She's drawing nicely. Hear that? Like a cat. If she starts to roar, run and fetch me, even if I'm stood right here.",
        "Sergeant says the west's full of fires. I say they're wasteful ones. All flame. Nothing kept.",
      ],
      night: [
        "Night's the dangerous watch. A burn goes wrong in the dark out of spite.",
        "Sit, if you like. Not on that. That's hot. Everything here's hot, or was.",
      ],
    },
    about: [
      "Colm Burrage. Charcoal burner. My stacks fed every forge from here to Khel. Now they feed Cinderford's, and the sergeant's braziers.",
      "Five days a burn. A cord of oak goes in, a few sacks come out, black and light as bread. It's the only honest shrinking I know.",
    ],
    ask: {
      dead: [
        "A dead man walked into my stack once. Right in. Didn't burn, the way you'd think. Cooked. Slow. I don't sell from that pit.",
      ],
      town: [
        "Bellmourn. There's a smith there buys my oak char by the cartload and sends back a note about how he suffers. Never the money on time. Always the note.",
      ],
      khel: [
        "Khel. Half a day west. A walled yard for carters, with a well, a cookhouse and stabling for forty. I sold there every month. Then one month there was nobody at the weighing table. Sacks still stacked.",
      ],
      burning: [
        "You stack it tight, turf it over and light it from the middle. Then you starve it. Fire wants to eat it all. Your whole trade is saying no to a fire for five days.",
      ],
    },
    topics: { khel: 'Khel', burning: 'Charcoal' },
    bye: [
      "Mm. Mind the turf.",
      "Go on, then. I've a fire to disappoint.",
    ],
    barks: {
      player: ["Upwind. The other upwind.", "Not on that. It's hot."],
      morning: ["White smoke. Day two.", "Don't touch the turf."],
      day: ["Blue by tomorrow, if she holds.", "Hear her? Like a cat."],
      magic: ["All flame and nothing kept. Wasteful.", "Not near the stacks!"],
    },
  },

  ysolt: {
    first: [
      "You're not from the west. Your boots are the wrong colour. ...I'm sorry. I look at boots now. Ysolt. I had a house in Khel. I have a blanket here.",
    ],
    greet: {
      morning: [
        "I counted the camp at first light. Nobody new came in. Nobody went.",
        "They gave me bread. I've kept half. I keep half of everything. I don't know who for.",
      ],
      day: [
        "I carried out a kettle, a blanket and my mother's shears. I'd have carried Edmer. He was too heavy by then. Not his body.",
        "The sergeant says I can stay inside the wall. I'd rather be by the ford. I can see the road.",
      ],
      evening: [
        "This is the hour they went strange. Dusk. All of them at once, like a flock turning.",
        "Don't ask me to look west at this hour. I'll talk to you. I'll look at the fire.",
      ],
      night: [
        "I don't sleep much. When I do I'm weighing charcoal, and the scale won't come level.",
        "If someone calls your name from over the ford tonight, don't answer. They keep the voices.",
      ],
    },
    about: [
      "Ysolt Marrow. I kept the weighing table at Khel. Charcoal, salt and wool, in and out. I knew every carter by his mule.",
      "Twenty-seven. I know. Everyone here guesses older.",
    ],
    ask: {
      dead: [
        "The dead are the easy ones. They're empty. Ours aren't empty. Something else is at the window, wearing them, and it's polite. It says good evening.",
      ],
      town: [
        "Bellmourn was a name on a sack. Bray, smith, Bellmourn: oak char, six. I thought it must be a fine big place, to burn so much.",
      ],
      khel: [
        "Riders came in at noon. Red over black. They didn't draw. They asked for water, very civil, and one of them took his helm off to drink. By dusk the whole yard was standing still, facing the gate.",
        "I was in the cellar after salt. That's all. That's the whole reason I'm me.",
      ],
      edmer: [
        "My husband. Edmer Marrow. He kept the stables at Khel. He walked east with the rest of them as far as the burnt mill, and there they stopped. I've seen him from the ridge. He stands at the door like he's waiting for a cart.",
      ],
    },
    topics: { khel: 'Khel', edmer: 'Edmer' },
    bye: [
      "Go carefully. I mean that more than people do.",
      "If you go west, look at their boots.",
    ],
    barks: {
      player: ["Your boots are the wrong colour. Good.", "I kept half. Do you want it?"],
      day: ["Nobody new. Nobody gone.", "A kettle, a blanket, the shears."],
      evening: ["Don't look west. Not at this hour.", "All at once. Like a flock turning."],
      magic: ["...That's not theirs. Theirs is quiet.", "Oh. Warm. I'd forgotten warm."],
    },
  },

  // ---------------------------------------------------------------- Frostwatch
  garrick: {
    first: [
      "You climbed the Frost Road in that. No fur. Either you don't feel cold or you don't feel sense. Garrick. Warden. Stand by the fire before you tell me which.",
    ],
    greet: {
      morning: [
        "Wind's north. The Mouth will howl by noon.",
        "Snow in the night. No tracks on it but mine. Good morning, then.",
      ],
      day: [
        "Frostwatch was built to watch the pass. Now it watches a hole. I didn't choose it. The hole did.",
        "If you're cold, move. If you're tired, don't sit. That's the whole of what I teach here.",
      ],
      evening: [
        "Fire's banked. Door's barred at dark. What walks the fell at night doesn't knock, but I'd sooner it had to.",
        "Hear it? That's the Mouth. Wind's dropped, and it's still going. It does that.",
      ],
      night: [
        "Third hour. Coldest. Keep your hands under your arms.",
        "I had a garrison once. Now I've a yard and a list. Speak if you like. It's company.",
      ],
    },
    about: [
      "Hew Garrick. Warden of Frostwatch, which is a tower, two long houses and me.",
      "I took six men down the Howling Mouth, eleven winters back, roped. I came up with two and no rope. So I know it. Ask.",
    ],
    ask: {
      dead: [
        "Too cold for the dead up here. They stiffen. I've found them stood on the pass like markers, facing downhill. I leave them. They're useful in fog.",
      ],
      town: [
        "Bellmourn. There's an innkeeper there owes me for a winter's venison. Or I owe him. One of us keeps a slate and it isn't me.",
      ],
      deeps: [
        "The Howling Deeps. East of my gate, round the fell, a split in the rock you could drive a cart into. It goes down in halls. Somebody cut the first one. Nobody cut the rest.",
        "Three things I know are down there. Hrymgar, in the first hall, who took my rope. Something that breeds, below him. And under that, a lake of ice with a thing asleep in it. It's the breathing of that one you hear.",
        "Don't go alone. I'm not being kind. One torch isn't enough light to see what's behind you.",
      ],
      fells: [
        "Goat men on the high ground, the white sort. Wolves that stand up. Harpies on Ravens' Tor, south-east, with a queen. And the long-armed things that come at night and sit on your chest. Those keep near the Mouth.",
      ],
    },
    topics: { deeps: 'The Howling Deeps', fells: 'The fells' },
    bye: [
      "Keep moving. Don't sit.",
      "Go on. Shut the gate; it's the only one I've got.",
    ],
    barks: {
      player: ["Stand by the fire or stand aside.", "No fur. Hm."],
      morning: ["Wind's north.", "No tracks but mine."],
      evening: ["Bar the door at dark.", "That's the Mouth. Wind's dropped."],
      magic: ["Warm. Do that again, by the woodpile.", "Hm. Saves on flint."],
    },
  },

  // ---------------------------------------------------------------- the Bell Tower: Ser Hale Orrowick, Paladin of the Fifth Watch
  hale: {
    first: [
      "Mind the left pauldron if you come close. It's off a bigger man and it swings. Hale Orrowick. I was ploughing at Millhaven two springs back. Now I'm this. Ser Anselm says the seal woke for you. I'd like to shake your hand, if the gauntlet lets me.",
      { after: 'quest:millhaven_man', say: "You'll be from Abel. He sends somebody every quarter-day. Mind the left pauldron; it's off a bigger man and it swings. Hale Orrowick. I'd shake your hand, if the gauntlet lets me." },
    ],
    greet: {
      morning: [
        "Fifth watch is done. That's mine: the hour after the fourth, before the sun's properly up. Nobody had it. So I took it.",
        "Morning. I've been stood since the dark. The greaves don't bend enough to sit in, so it's no hardship.",
      ],
      day: [
        "Ser Anselm's up the ladder. I hold it. He says I hold a ladder better than any paladin he's known. I can't tell if that's praise.",
        "Good ploughing weather. I notice it still. I expect I always will.",
      ],
      evening: [
        "First watch soon. That's his. I stand mine after his four, when he's gone grey in the face and won't say so.",
        "Sun's going over Millhaven. I can see my own chimney from here. Abel's got it smoking. He burns too green.",
      ],
      night: [
        "Quiet. He's counting. Don't speak over the count; he starts again from one, and it's a long night as it is.",
        "You're out late. Stand by me a while. I'm no great company, but I'm between you and the dark, and I'm wide.",
      ],
    },
    about: [
      "Hale Orrowick. Orrowicks have farmed the low field at Millhaven since there was a Millhaven. I'm the first to leave it, and I went four miles.",
      "Paladin of the Fifth Watch. There wasn't a fifth. Ser Anselm keeps four and he's sixty-four. Somebody ought to keep the one after. I swore it at his door. He said it wasn't a real oath. Then he lent me his whetstone.",
      "The harness is from the downs. Men in silver come over them singing, and not all of them go home. A breastplate here, a greave there. None of it matches. I've packed it with fleece where it's big.",
    ],
    ask: {
      tessariels: [
        "I buried four of them myself, off the downs, before I ever swore anything. Good gear. No sense. I kept the gear. I think they'd sooner it stood a watch than rusted.",
        "Ser Anselm says a claimant kneels to be seen. I knelt to see if I could get up again in this. I could. Just.",
      ],
      dead: [
        "They go wide round the knoll. You can see the path they've worn, like sheep round a dog. I walk it some mornings to see nothing's been dropped.",
      ],
      lis: [
        "An old woman came by at harvest, the year I left. Watched me plough a whole furrow. Said, that's straight; you'd do. I thought she wanted a ploughman.",
      ],
      anselm: [
        "He calls me the ploughman. I call him Ser. He's taught me the counts and how to oil a bearing, and I've taught him you can sit down to eat. We get on.",
        "He won't say he's glad of me. He leaves the second cup out. That's how he says it.",
      ],
      fifth: [
        "Four watches of the night, and then the hour when everyone's sure it's over and stops looking. That's when the fox comes. Any farmer knows it. That's the fifth.",
        "I've no bell for it. I stand it. One day there'll be a bell, and somebody younger than both of us on the rope.",
      ],
      west: [
        "I drove a cart west once, years back, to the carters' rest at Khel, for salt. I saw what rides out of the keep past it. Big men on black horses, in twos, not talking. And one on foot behind them, bigger than a man ought to be, with no helm. A face. Eyes like a banked forge.",
        "I've not gone west since. I'm sworn here. But I know what I saw, and I know nobody's gone to meet it. That sits badly with a man who's just learned which end of a sword to hold.",
      ],
    },
    topics: { anselm: 'Ser Anselm', fifth: 'The fifth watch', west: 'What you saw in the west' },
    bye: [
      "Go well. Keep your feet under you.",
      "If you pass Millhaven, tell Abel he burns too green.",
    ],
  },
};

// ---------------------------------------------------------------- the quests
const DELVE_HINT = "The portal won't open for one alone: Captain Merrow Vale, beside the Warrens' portal on the hill north-east of Bellmourn, hires out a company.";

export const QUESTS = {
  // ---- out of Bellmourn ----
  word_to_thornwick: {
    title: 'Word to Thornwick',
    giver: 'aldric',
    offer: [
      "There's a village two days south-east, where the downs run out. Thornwick. We send them a letter every year and they send one back. This year ours went and nothing came.",
      "It may be a lame carter. It may not. Their man's the hedge-reeve, Osric Thorne. Go and ask him, to his face, if the Gallows Road still runs. I'd rather know from boots than from a letter.",
    ],
    accept: "I'll walk to Thornwick.",
    acceptLine: "East along the downs road, then the fork that goes south-east. That's the Gallows Road. You'll know Thornwick by its hedge. It hasn't a wall. It was never let have one.",
    decline: 'Not that road.',
    declineLine: "No. Well. The letter may still come.",
    journal: [
      "Ser Aldric Halloway has had no answer from Thornwick, a village two days south-east of Bellmourn on the Gallows Road. Go there.",
      "Find Thornwick's hedge-reeve, Osric Thorne, at the north-west gate, and ask him if the road still runs.",
      "Go back to Ser Aldric Halloway at the tower house with Thornwick's answer.",
    ],
    progress: [
      "The Gallows Road. It forks off the downs road past the second rise. South-east.",
      "No word yet? Then nor have I. Go on.",
    ],
    done: [
      "Still there. Hedge mended, gate kept, and the road open as far as their inn and no further. That's more than I feared and less than I'd like.",
      "Here. The watch's purse, such as it is. And tell nobody the road's shut past Thornwick. They'll only want to go and look.",
    ],
    after: [
      "I've written to Thornwick again. I've told the carter to wait for the answer this time, and to take a dog.",
    ],
    others: {
      osric: [
        "Bellmourn's letter? It came. I wrote the answer myself. The carter took it south by mistake, toward the Cross, and he's not been seen. So. Tell your captain this, since I've no carter left to tell him.",
        "The road runs from his gate to mine. Past mine, to the south-east, it doesn't. Things come up it from the hanging wood, and goat men come down on it off the downs. We're holding. That's the whole letter.",
      ],
      dorcas: ["From Bellmourn's watch? Then eat first and carry it after. Osric's at the gate. He's always at the gate."],
      jory: ["Thornwick? My nan was Thornwick. All hedge and mutton, she said. She never went back. That's Thornwick for you."],
    },
  },

  tracks_west: {
    title: 'Tracks Going West',
    giver: 'corran',
    needs: 'pines',
    offer: [
      "The ones you put down in the pines. I followed where they'd come from. West. Along the Vigil Road, two days, past where anyone here's been.",
      "The tracks stop at a stockade on a ford. Cinderford. There's a watch on its wall; I saw helmets. I didn't go in. Go in. Ask whoever's got the stripe what comes down that road, and how many.",
    ],
    accept: "West, to Cinderford.",
    acceptLine: "Out the west gate and keep the road. There's a knight on it not far out; go round him. After that it's only long. You'll smell the kilns before you see the wall.",
    decline: "Not west.",
    declineLine: "No. Nobody goes west. That's how it got like this.",
    journal: [
      "Corran Thrale tracked the dead in the pines back along the Vigil Road to a stockade called Cinderford, far west of Bellmourn. Go there.",
      "Speak to the sergeant of the Cinderford watch, Brenna Hasket, at the foot of the watchtower inside the west gate.",
      "Go back to Corran Thrale at the hunter's lodge and tell him what the sergeant said.",
    ],
    progress: [
      "West gate. The Vigil Road. Two days. Round the knight.",
      "You've not gone. I can tell. You'd look worse.",
    ],
    done: [
      "She counts them. A sergeant on a wall, counting, same as me. And nobody listens to her either.",
      "Then it's not the pines they come out of. They come down that road and through the pines. I'll put that with the rest. Here. For the boots you wore out.",
    ],
    after: [
      "I've half a mind to write to that sergeant. I don't write. I'd send her a tally stick.",
    ],
    others: {
      hasket: [
        "A hunter? Two days east, and he tracked them here? Then he's better than my scouts were. Tell him he's right. They come down the west road. Not all at once. Twos, sixes. They walk at my wall, stop, and go round.",
        "Tell him I count forty in a month, going east. And tell him this, because nobody else will hear it: not one comes back the other way.",
      ],
      aldric: ["Corran's sent you west? He told me the dead come from the west. I said they come from the churchyard. One of us will be right, and I'd rather it were me."],
    },
  },

  owed_to_frostwatch: {
    title: 'Owed to Frostwatch',
    giver: 'bram',
    offer: [
      "There's one mark on my slate that's the wrong way round. Hew Garrick, warden at Frostwatch, up the Frost Road in the snow. He sent venison down the winter the well froze. Three carts. I never paid.",
      "Eleven years it's sat there. A slate ought to come level. Take him this purse. Tell him it's from Kettle, and to wipe it off. I'd go, but I'd have to shut, and I don't shut.",
    ],
    accept: "I'll take it to Frostwatch.",
    acceptLine: "South, past where you came in, and keep on. The Frost Road. It goes white before you get there. Frostwatch is the tower at the top. He'll be the one who doesn't say much.",
    decline: 'Not up there.',
    declineLine: "Then it sits another winter. It's used to it.",
    journal: [
      "Bram Kettle has owed the warden of Frostwatch for eleven years. Carry his purse up the Frost Road, far south of Bellmourn, to the fort in the snow.",
      "Find the warden, Hew Garrick, in Frostwatch's yard, and pay what Bram owes.",
      "Go back to Bram Kettle at the Tolling Bell and tell him it's off the slate.",
    ],
    progress: [
      "South. The Frost Road. When your breath shows, you're halfway.",
      "It's still on the slate. I look at it every night.",
    ],
    done: [
      "He took it? And said what? ...'Hm.' That's him. That's Garrick paid in full.",
      "There. Wiped. First time that corner's been clean since the well froze. Here; you don't carry a man's debt up a mountain for nothing.",
    ],
    after: [
      "I keep looking at the clean corner. I may have to owe somebody something, to feel right.",
    ],
    others: {
      garrick: [
        "Kettle. Eleven years. I'd forgotten which of us owed. ...Hm. Tell him it's wiped. Tell him the venison was old, too. He'll like that less than the debt.",
      ],
      maudie: ["He's paying Garrick? At last. That venison was like boot. I made it into pies and nobody knew."],
    },
  },

  millhaven_man: {
    title: 'The Millhaven Man',
    giver: 'hob',
    needs: 'millhaven_jelly',
    offer: [
      "Abel's sent word again. Not jelly this time. His neighbour. Hale Orrowick, that had the low field. Left his plough stood in the furrow two springs back and went up the knoll, to the old tower.",
      "He's up there yet, in iron, Abel says, stood like a post. Abel's been cutting his barley for him two years and wants to know if he's to cut a third. You've been up that way. Would you ask him?",
    ],
    accept: "I'll ask him.",
    acceptLine: "The tower on the knoll, east past Millhaven. You'll know him. Abel says he's the one who isn't old.",
    decline: "Not now, Hob.",
    declineLine: "Then Abel cuts it. He'll moan. He'd moan anyway.",
    journal: [
      "Hob Fenwick's cousin Abel wants to know if his neighbour Hale Orrowick is ever coming home to Millhaven. He's at the Bell Tower of the Four Watches, on the knoll far east of Bellmourn. Go there.",
      "Speak to Hale Orrowick, the younger of the two in plate before the tower's door.",
      "Go back to Hob Fenwick and tell him what Hale said.",
    ],
    progress: [
      "The knoll. Past Abel's. The one in iron who isn't old.",
    ],
    done: [
      "Not coming. Sworn. To an hour of the night? ...Well. Orrowicks were always a bit particular.",
      "Abel can have the barley, then, and welcome. He sent this for the asking. It's two years of somebody else's harvest, so it's not mean.",
    ],
    after: [
      "Abel's ploughed the low field himself. Says it's the straightest furrow on the downs and he can't match it. He's quite put out.",
    ],
    others: {
      hale: [
        "Abel. He'd send the king if he could, to ask about that barley. Tell him no. I'm sworn, and it isn't the sort you plough round.",
        "Tell him the low field's his till I'm back, and that he burns too green. And thank you for walking it. It's a long way to carry a farmer's question.",
      ],
      bellwright: ["They want my ploughman back? They can't have him. ...Don't tell him I said that."],
      bess: ["Hale Orrowick? He danced with me at Abel's wedding. Trod on both feet. And now he's a knight? Mind his feet."],
    },
  },

  // ---- hub to hub ----
  hare_and_harrow: {
    title: 'A Plate at the Hare',
    giver: 'osric',
    offer: [
      "You've walked two days and you're stood at a gate talking to a hedger. Go and eat. The Hare and Harrow, across the road, with the lamp in the south window.",
      "And listen to Dorcas while you do. I keep the hedge. She keeps the road, or what's left of it, and the road's the worse off. Tell her I sent you; she'll charge you less, or more.",
    ],
    accept: "I'll go and eat.",
    acceptLine: "In through the gate, down the road, on your right before the square. You'll smell mutton. Everyone does.",
    decline: "I'm not hungry.",
    declineLine: "You will be. It's Thornwick. There's nothing else to do but eat and mend.",
    journal: [
      "Osric Thorne says the keeper of Thornwick's inn, Dorcas Pym, has troubles of her own on the Gallows Road. Find her before the door of the Hare and Harrow.",
    ],
    progress: [
      "The inn. Across the road. The one with a door.",
    ],
    done: [
      "Osric sent you? Then he's noticed you're thin. He notices sheep the same way. Sit.",
      "And since you're sat: yes, there's trouble on my road. Ask me when you've a plate in front of you.",
    ],
    after: [
      "She fed you? Good. She feeds me, too, and tells me I'm bleeding on the settle.",
    ],
    others: {
      dorcas: [
        "Osric sent you? Then he's noticed you're thin. He notices sheep the same way. Sit. That's for the road; I pay anyone who walks it now.",
        "And since you're sat: yes, there's trouble on my road. Two troubles. Ask me when you've a plate in front of you.",
      ],
    },
  },

  man_at_the_cross: {
    title: 'The Man at the Cross',
    giver: 'dorcas',
    offer: [
      "See the old fellow by the market cross, talking to nobody? That's Wymond. He's our priest, near enough. He's no roof, so he's mine to feed.",
      "He's been wanting something carried, somewhere he can't make his legs go. He'll not ask a stranger. So I'm asking for him. Go and say I sent you, and let him get round to it.",
    ],
    accept: "I'll speak to him.",
    acceptLine: "By the cross, on the square. Let him bless you first. It's quicker than arguing.",
    decline: 'Not a priest.',
    declineLine: "He's hardly one. That's the best of him.",
    journal: [
      "Dorcas Pym says Thornwick's hedge-priest, Wymond Ebb, wants something carried where he can't go. Find him by the market cross on the square.",
    ],
    progress: [
      "The cross. On the square. He's the one talking to it.",
    ],
    done: [
      "Dorcas sent you. She would. She's decided I'm to be helped.",
      "Well. There is a thing. Ask me about the salt, when you've a moment and a strong stomach.",
    ],
    after: [
      "He asked you? Good. He'll sleep. He's been saying names at my ceiling till all hours.",
    ],
    others: {
      wymond: [
        "Dorcas sent you. She would. She's decided I'm to be helped, and when Dorcas decides, you're helped. Here; a wool merchant's penny, for walking across a square.",
        "Well. There is a thing. It wants carrying a long way south-east, and my legs turn me round at the toll. Ask me about the salt, when you've a moment and a strong stomach.",
      ],
    },
  },

  ask_the_burner: {
    title: 'Sacks Nobody Came For',
    giver: 'hasket',
    offer: [
      "You want to know the west? I know it from a wall. The charcoal burner sold into it every month for thirty years. Burrage. At the kilns, north side.",
      "He's forty sacks stacked that nobody's come for, and he won't stop looking at them. Talk to him. He'll tell you more about what's past the ford than my scouts did, and he'll be slower about it.",
    ],
    accept: "I'll talk to him.",
    acceptLine: "North side, by the kilns. Stand upwind. He'll tell you which wind.",
    decline: 'Not now.',
    declineLine: "As you like. He's not going anywhere. That's his trade.",
    journal: [
      "Sergeant Hasket says Cinderford's charcoal burner, Colm Burrage, sold west as far as Khel. Find him before the kilns on the north side of the village.",
    ],
    progress: [
      "The kilns. North side. Follow the smoke.",
    ],
    done: [
      "The sergeant sent you. Mm. She thinks I know things. I know one thing, forty times.",
      "There's an order nobody came for. Ask me about Khel.",
    ],
    after: [
      "Burrage talked? Then you've had more out of him than I have in a year.",
    ],
    others: {
      colm: [
        "The sergeant sent you. Mm. She thinks I know things. I know one thing, forty times: forty sacks, ordered, half paid, and nobody at the other end. Here. For hearing it.",
        "If you're going west anyway, there's a thing I'd have checked. Ask me about Khel.",
      ],
    },
  },

  girl_from_khel: {
    title: 'Out of Khel',
    giver: 'colm',
    offer: [
      "There's a girl in the camp over the ford. Marrow. She kept the weighing table at Khel. Weighed every sack I ever sold there and never once shorted me.",
      "She came in with a kettle and a blanket and she's not said twenty words. She'll not ask anyone for anything. Go and stand near her a while. If she asks you, it'll be the only thing she wants in the world.",
    ],
    accept: "I'll go to the camp.",
    acceptLine: "Over the ford, south-east. The one sat facing the road. Don't hurry her. Mm. You can't hurry a burn either.",
    decline: 'Not now.',
    declineLine: "Mm. She'll be there. She's nowhere else to be.",
    journal: [
      "Colm Burrage says Ysolt Marrow, who kept the weighing table at Khel, wants one thing and won't ask for it. Find her in the refugees' camp over the ford, south-east of Cinderford.",
    ],
    progress: [
      "The camp. Over the ford. Facing the road.",
    ],
    done: [
      "Colm sent you. He shod... no. Edmer shod his mule. I get them muddled now, who did what for whom.",
      "There is a thing. I'll say it once. Ask me about the mill.",
    ],
    after: [
      "She asked you. Mm. Good. That's the first thing she's asked of anyone.",
    ],
    others: {
      ysolt: [
        "Colm sent you. Edmer shod his mule every spring. He'll have told you that. He tells everyone; it's how he says he's sorry. This was in the kettle. I've no use for coin. Take it.",
        "There is a thing. I'll say it once, and then I'd like not to. Ask me about the mill.",
      ],
    },
  },

  // ---- the land's own troubles, given in Bellmourn ----
  cairnfield: {
    title: 'Stones on the Cairnfield',
    giver: 'silas',
    needs: 'dead_cant_wait',
    offer: [
      "Before there was a churchyard, Bellmourn put its dead on the downs' edge, north-east, under stones. The Cairnfield. My great-grandfather's there. Every Crane before him.",
      "A drover tells me the cairns are being opened. Not robbed. Opened, tidy, and the stones stacked. Somebody up there is taking stock. I won't have my people counted by a stranger. Go and stop it.",
    ],
    accept: "I'll go to the Cairnfield.",
    acceptLine: "East on the downs road, then north before the Abbey Road forks. Grey heaps on a green rise. If one's open, don't look in. Or look. They're mine, and they won't mind you.",
    decline: 'Not today.',
    declineLine: "They've waited two hundred years. But they weren't being unpacked, then.",
    journal: [
      "Someone is opening the old cairns on the Cairnfield, on the downs' edge north-east of Bellmourn, where Silas Crane's people lie. Go there.",
      "Put down whoever is opening the cairns, and the four they've raised.",
      "Go back to Silas Crane at the coffin yard.",
    ],
    progress: [
      "The Cairnfield. Grey stones, green rise. Whoever's there can read; they've been at the name-stones.",
    ],
    done: [
      "A robed one, and children. Raised children, to carry the stones. ...No. I'll not say what I think of that. I'd have to wash my mouth.",
      "I'll go up myself at the month's end and put the stones back. I know which is which. Here. It's what I'd charge for a reburial. You've earned the family rate.",
    ],
    after: [
      "I've restacked nine. My knees say that's a year's work. The Cranes say thank you. I'm translating.",
    ],
    others: {
      orrin: ["The Cairnfield! The name-stones there are older than my oldest book. If you could rub one for me... no. Silas would know. He always knows."],
    },
  },

  sunken_mile: {
    title: 'The Sunken Mile',
    giver: 'sabine',
    needs: 'sallowmere',
    offer: [
      "There's a causeway in the fen, north-west of the Fen Way, before you reach the mere. A mile of old stone with the water over it to the ankle. The Sunken Mile. It's the only dry way to the west pools.",
      "I tried it for marsh-mallow. There are people standing on it. In the water. Not jelly. People, and they turned round, all together. Clear it. I'll not ask how.",
    ],
    accept: "I'll clear the causeway.",
    acceptLine: "Take the Fen Way north till the ground goes soft, then bear left of it. Stones under the water, in a line. If they call to you, they'll be very polite about it. Don't answer.",
    decline: 'Not the fen again.',
    declineLine: "No. I wouldn't either. I'll do without mallow.",
    journal: [
      "Sabine Moss can't cross the Sunken Mile, an old causeway in the fen north of Bellmourn, west of the Fen Way. Go there.",
      "Put down five of the drowned who stand on the Sunken Mile.",
      "Go back to Sabine Moss at the herbalist's.",
    ],
    progress: [
      "The causeway. West of the Fen Way, short of the mere. Five of them, I counted, before I ran.",
    ],
    done: [
      "All five. You're wet to the thigh and you're shaking. Sit. Drink this. It's only nettle, but it's hot.",
      "Somebody's family, those were. I'll burn something for them. And this is for you. Mallow root's worth more than I can pay, so that's most of what I have.",
    ],
    after: [
      "I walked the Mile yesterday. Nobody on it. I kept turning round anyway.",
    ],
    others: {
      bryony: ["Mam says there were people in the water. Were their eyes open? Don't tell Mam I asked."],
    },
  },

  moor_wayhouse: {
    title: 'The Wayhouse on the Moor',
    giver: 'jory',
    needs: 'barrow_lights',
    offer: [
      "After the lights, I got to watching the moor proper. There's a drovers' wayhouse on the Barrow Track, halfway out. Been shut since I was a lad. Four nights now there's been a lamp in it.",
      "Not a jelly light. A lamp, in a window, held still. Somebody's moved in. Nobody moves in on that moor that you'd want for a neighbour. Would you knock? You're better at it than me.",
    ],
    accept: "I'll knock.",
    acceptLine: "South road, then the track that splits off west over the moor. Stone house, half a roof, peat stacks. If the lamp's lit, somebody's home. That's the trouble.",
    decline: 'Not the moor.',
    declineLine: "No. I only look at it. Looking's free.",
    journal: [
      "Jory Pell has seen a lamp in the old drovers' wayhouse on the Barrow Track, far south-west of Bellmourn. Go there.",
      "Put down whoever has moved into the Moor Wayhouse, and the three they keep.",
      "Go back to Jory Pell and tell him who had the lamp.",
    ],
    progress: [
      "The wayhouse. On the track, halfway to the barrows. I can see the lamp from here on a clear night. I wish I couldn't.",
    ],
    done: [
      "One in a robe, with a lamp, and three little ones stood round the door. Dead little ones. Oh, that's... no. No, I'm glad you went and not me.",
      "No lamp tonight. I looked. Here, it's the night pay again. You keep doing my nights for me.",
    ],
    after: [
      "I've stopped looking at the moor. I look at the church instead. I'm not sure that's better.",
    ],
    others: {
      aldric: ["A lamp on the moor. Jory told me. I said drovers. There haven't been drovers in twenty years. ...Go and see."],
    },
  },

  ossery_quarry: {
    title: "The Masons' Marks",
    giver: 'orrin',
    offer: [
      "Every stone of Saint Ossery's was cut at one quarry, on the Abbey Road, north-east, in the red wood. Each mason cut his own mark in the face before he lifted a block. A book of names, in rock, older than any I own.",
      "A carter tells me there's digging in the workings again. Small things with snouts, tunnelling behind the face. If it falls, the marks go with it. Clear them out. And look at the marks for me. Only look.",
    ],
    accept: "I'll go to the quarry.",
    acceptLine: "East on the downs road, then the Abbey Road north-east, into the red trees. A cut cliff on your left, with a crane. Mind the edge. Masons fell off it sober.",
    decline: 'Not that road.',
    declineLine: "No. It's far. The marks have lasted this long. I haven't, quite.",
    journal: [
      "Orrin Vey wants the masons' marks at Ossery Quarry kept from falling. The quarry is beside the Abbey Road, far north-east of Bellmourn, in the Rustwood. Go there.",
      "Kobolds are tunnelling behind the quarry's face. Put down five of them.",
      "Go back to Orrin Vey at the Tolling Bell and tell him the marks stand.",
    ],
    progress: [
      "The Abbey Road. A cut cliff, a crane. Kobolds, the carter says. He called them 'dog-rats'.",
    ],
    done: [
      "The face stands? And the marks? A fish, a key, three strokes and a ring... You looked. You actually looked. Say them again, slower.",
      "Eleven masons, and now I've their signatures. Here. And don't tell Silas I paid for stones. He thinks they're his department.",
    ],
    after: [
      "I've drawn the marks in the back of my oldest book. It's the only page in it I trust.",
    ],
    others: {
      silas: ["Ossery stone? Good stone. Takes a chisel like cheese and then lasts. I've a slab of it. I'm not saying what for."],
    },
  },

  // ---- the catacombs ----
  deeper_dead: {
    title: 'Further Down',
    giver: 'silas',
    needs: 'bones_for_carver',
    offer: [
      "It's quiet under the hill by the stair. Thank you for that. But I've been listening lower. Past the Reliquary there's a deal more church than anyone buried in my lifetime, and it's all awake.",
      "Twenty would do it. I know that's a number. I've a yard full of people who can't go down till it's safe to carry them, and I'm running short of yard.",
    ],
    accept: 'Twenty. I will.',
    acceptLine: "Same door. Same key. Go further than you did. If a passage looks like nobody's used it, somebody has.",
    decline: 'Not yet.',
    declineLine: "They'll keep. That's rather the problem.",
    journal: [
      "Put down twenty more of the dead in the catacombs below the cathedral, deeper than before.",
      "Go back to Silas Crane at the coffin yard.",
    ],
    progress: [
      "I can hear the difference already. Like a house when the children have finally gone to bed.",
      "Not twenty yet. I'd know.",
    ],
    done: [
      "Twenty. I slept last night. In the bed. I'd got used to the chair by the window.",
      "I'll start carrying them down this week. The Hollis girl first; she's waited longest. Here. The yard's thanks, and mine.",
    ],
    after: [
      "Three in the ground this week, and they've stayed there. I'd forgotten what it was to finish a job.",
    ],
    others: {
      corran: ["Twenty more, under the church? Good. Every one down there is one that doesn't get as far as my pines."],
    },
  },

  waxed_thread: {
    title: 'Waxed Thread',
    giver: 'tamsin',
    needs: 'shroud_and_thread',
    offer: [
      "That robe I made you. It'll turn a blade. It won't turn rain. I've been thinking about it at night, which is when I think about seams.",
      "Grave wax. The candle-ends off the crypt shelves. It's been burning down there a hundred years and it's hard as horn. Bring me six and I'll wax every thread in a new winter's stock. I'll pay; it's my trade it mends, not yours.",
    ],
    accept: 'Six. I can find six.',
    acceptLine: "On the shelves, in the niches, by the old coffins. Don't take one that's still lit. I don't know why. I'd just rather you didn't.",
    decline: 'Not just now.',
    declineLine: "Then it's beeswax, and beeswax cracks. Never mind.",
    journal: [
      "Bring six Grave Wax up from the catacombs to Tamsin Reed at the weaver's.",
    ],
    progress: [
      "Six. The hard yellow sort, not tallow. Wenna says you can tell by biting it. Don't.",
    ],
    done: [
      "Oh, that's lovely stuff. Feel that. No, you can't, you've gloves on. Take my word.",
      "There's your coin. And the next wet day you see somebody in Bellmourn dry to the skin, that's you did that.",
    ],
    after: [
      "Waxed the lot. Wenna's hands smell of crypt and she won't stop telling people.",
    ],
    others: {
      elspeth: ["Grave wax? For THREAD? That's candle stock. That's MY candle stock. ...How much is she paying?"],
    },
  },

  // ---- the Hollowfang Warrens ----
  warrens_mouth: {
    title: 'Something Dug This',
    giver: 'corran',
    needs: 'pines',
    hint: DELVE_HINT,
    offer: [
      "Up the hill north-east, past the kobolds' den, there's a stone arch in the hillside with a light in it. It wasn't there when I was a boy. There's a soldier stood by it, hiring out swords.",
      "Kobold tracks go in. Goblin tracks go in. Nothing comes out the same size. I want to know what's under my hill. Go through. Just through, and back. Tell me what's down there.",
    ],
    accept: "I'll go through.",
    acceptLine: "North-east track, then the path up past the den. The soldier's a Captain Vale. He'll tell you it won't open for one. He's right. Hire who he says.",
    decline: 'Not down a hole.',
    declineLine: "No. I only track to the edge of things myself.",
    journal: [
      "Corran Thrale wants to know what's under the hill north-east of Bellmourn. Go through the portal into the Hollowfang Warrens.",
      "Go back to Corran Thrale at the hunter's lodge and tell him what's under his hill.",
    ],
    progress: [
      "The arch on the hill. North-east. You'll want company; ask the Captain beside it.",
    ],
    done: [
      "Tunnels. Miles of them. Kobold-dug, then goblins in the kobolds' work, and something under both that neither of them dug.",
      "Under my hill. All my life. I'd thought it was badgers. Here. And don't tell the inn. They'll want it to be badgers.",
    ],
    after: [
      "I put my ear to the hill last night. You can hear them digging. I'd always thought that was my own blood.",
    ],
    others: {
      aldric: ["The arch on the north-east hill? I've a watchman's report of it. I filed it under 'unlikely'. I may have to move it."],
    },
  },

  barley_thieves: {
    title: 'Barley Thieves',
    giver: 'hob',
    hint: DELVE_HINT,
    offer: [
      "Something's been at the barley. Not crows. Crows don't take the sacks. I've lost nine sacks out of the barn since the moon turned, and a wheelbarrow.",
      "Dob followed the wheel-mark. It goes up the north-east hill to that glowing arch and in. Little feet either side. Goblins, or the other sort with the snouts. I want twelve of them shown it's not a free barn.",
    ],
    accept: "Twelve. I'll see to it.",
    acceptLine: "Up the hill, through the arch. Bess says take friends. If you find the barrow, it's got a split handle. I'd like it back, but I'll not weep.",
    decline: "Not now, Hob.",
    declineLine: "Then it's ten sacks by Friday. I'll sit up with a rake.",
    journal: [
      "Goblins and kobolds from the Hollowfang Warrens have been stealing Hob Fenwick's barley. Put down twelve of them, down in the Warrens.",
      "Go back to Hob Fenwick and tell him it's done.",
    ],
    progress: [
      "Twelve. Goblins or the snouty ones, I'm not particular. Down the arch on the hill.",
    ],
    done: [
      "Twelve! Bess, twelve! And the barley? ...Eaten. Well. They'll not eat the next lot.",
      "Here. It's the price of nine sacks, near enough. I'd sooner you had it than have it sat reminding me.",
    ],
    after: [
      "Not a sack gone since. Dob found the barrow, half up the hill, full of stones. They'd been using it. Cheek.",
    ],
    others: {
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

  // ---- Thornwick ----
  hedge_breakers: {
    title: 'Hedge-Breakers',
    giver: 'osric',
    offer: [
      "Three goat men. On the downs north-west, where the old sheep track leaves the road. They come down at night and lean on my hedge till it gives. Then they go home. They don't even come in.",
      "I've mended the west side four times this month. I'm out of blackthorn and I'm out of patience. Put them down. All three, or the one left will only fetch more.",
    ],
    accept: "All three.",
    acceptLine: "Out the north-west gate, up the road a little, then left onto the downs. There's a hollow with a dead thorn in it. That's theirs. Mind the horns; they lead with them.",
    decline: 'Not now.',
    declineLine: "Then I'm cutting blackthorn by lamplight again. Mind the gate on your way.",
    journal: [
      "Goat men on the downs north-west of Thornwick are breaking its hedge by night. Put down the three of them at their hollow.",
      "Go back to Osric Thorne at Thornwick's north-west gate.",
    ],
    progress: [
      "North-west, on the downs. Three. I counted the hoofprints, and then counted them again in twos.",
    ],
    done: [
      "All three? Then I may sleep tonight. I'll not know how. I'll lie there listening for it.",
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
    offer: [
      "The shepherds say the three you put down weren't the trouble. They were sent. There's a big one south-west, on the high down, black from horn to hoof, with two that walk behind him.",
      "The Black Ram. My father spoke of him, and I thought it was to keep me in at night. If he's real he'll send three more. Go and see. If he's real, make him otherwise.",
    ],
    accept: "I'll go and see.",
    acceptLine: "South-west of the gate, a long mile, up where there's no hedge and no reason for one. If he's there you'll not need to look for him. He'll be the one looking at you.",
    decline: 'Not that one.',
    declineLine: "No. Well. I'll cut more blackthorn.",
    journal: [
      "The goat men who break Thornwick's hedge answer to a great black one on the high down south-west of the village. Kill the Black Ram and the two that walk with him.",
      "Go back to Osric Thorne at Thornwick's north-west gate.",
    ],
    progress: [
      "South-west, on the high down. Black from horn to hoof. And two behind.",
    ],
    done: [
      "Real, then. And dead. My father was right, and I can't tell him. I'll tell the hedge.",
      "This came down to me with the billhook. A goat's hoof, shod in iron. He said it was cut from one of the Ram's own, long ago, and that whoever wore it would never slip. I'm a hedger. I don't climb. You do.",
    ],
    after: [
      "No hoofprint on the west side in a fortnight. The lambs are sleeping outside the fold. I've let them.",
    ],
    others: {
      wymond: ["The Black Ram? I blessed against him, as a young clerk, without believing a word. If he's dead I shall be quite smug."],
    },
  },

  up_from_the_gallowswood: {
    title: 'Up from the Hanging Wood',
    giver: 'dorcas',
    offer: [
      "They come up the road from the south-east. Not walkers like yours. Ours have iron on, some of them, and the sickness under it. You smell them before the dogs do.",
      "There's four stopped just off the road, a short way past the south gate, where the wool carts used to water. They don't come on and they don't go back. I can't serve supper with that sat at the end of the lane. See them off.",
    ],
    accept: "I'll see to them.",
    acceptLine: "Out the south-east gate and down the road. You'll know the place by the smell. Don't let them cough on you. And come straight back; I'll have water on to wash.",
    decline: 'Not now.',
    declineLine: "Then I'll keep the shutters to. Again.",
    journal: [
      "Plague stragglers out of the Gallowswood have stopped beside the road south-east of Thornwick. Put down the four of them.",
      "Go back to Dorcas Pym at the Hare and Harrow in Thornwick.",
    ],
    progress: [
      "South-east, off the road. Four. Two in iron. You'll smell them.",
    ],
    done: [
      "Gone? All four? Then stand there. No, there, on the flags. Don't touch anything. I'm fetching the lye.",
      "Right. You'll do. Here's the house's thanks, and there's mutton, and you're having both.",
    ],
    after: [
      "I had the south shutters open at supper. First time since the wool fair. Somebody nearly smiled.",
    ],
    others: {
      osric: ["The ones in iron don't mind the hedge. They don't mind anything. I've seen one walk through a gorse fire to get nowhere."],
    },
  },

  old_toll: {
    title: 'Thursdays',
    giver: 'dorcas',
    needs: 'up_from_the_gallowswood',
    offer: [
      "There's a toll on the road halfway to the Cross. A bar, a hut and Wat Arden, who's kept it thirty years and eaten here every Thursday of them. Pie, and the end of the bread.",
      "He's missed five Thursdays. I've kept the pie back each time, like a fool. Go down and see. If he's only poorly, tell him I'm cross. If he isn't... see he's left decent. He'd want that.",
    ],
    accept: "I'll go to the toll.",
    acceptLine: "Straight down the road, south-east. You can't miss a toll; that's what they're for. And whatever you find, tell me plain. I've had enough of people being kind.",
    decline: 'Not that far.',
    declineLine: "No. I'll keep the pie back, then. One more Thursday.",
    journal: [
      "Wat Arden, who keeps the toll on the Gallows Road south-east of Thornwick, has missed five Thursdays at the Hare and Harrow. Go to the Old Toll.",
      "The Old Toll is burnt, and things are waiting in it. Put down five of them.",
      "Go back to Dorcas Pym at the Hare and Harrow and tell her plain.",
    ],
    progress: [
      "The toll. South-east. I've the pie back again this week. Don't say anything.",
    ],
    done: [
      "Burnt. And the bar broken. And things stood in it, waiting for the next cart. ...Was he among them? You'd not know him. No. Thank you for not guessing.",
      "I'll stop keeping the pie. Here. He'd have paid you himself; he paid for everything, the same coin, counted twice. So it's from Wat.",
    ],
    after: [
      "I made the pie anyway, Thursday. Wymond ate it and said the words. It was a sort of funeral. Wat would have said it wanted salt.",
    ],
    others: {
      wymond: ["Wat Arden? I've his name by heart already, in case. He's in the As. It's a short walk from there to wherever he's gone."],
    },
  },

  salt_for_the_hanged: {
    title: 'Salt for the Hanged',
    giver: 'wymond',
    offer: [
      "There's a crossroads in the hanging wood, south-east, where they used to hang people. And a grove past it, further south, where the trees grew up twisted afterwards. Nobody ever said the words over either.",
      "I'd go. I've started out four times and my legs turned me round at the toll. Take my salt. Stand in the middle of each and put it down. You needn't say anything. The salt knows the words by now.",
    ],
    accept: "I'll carry your salt.",
    acceptLine: "Here. It's only a bag. Hangman's Cross first, where the roads meet. Then the Twisted Grove, south and west of it. Put a pinch down in each. If anything watches you do it, be civil.",
    decline: "That's not for me.",
    declineLine: "No. It's a great deal to ask of a stranger. I've only strangers left to ask.",
    journal: [
      "Wymond Ebb, Thornwick's hedge-priest, wants his salt put down where nobody ever said the words: at Hangman's Cross and in the Twisted Grove, in the Gallowswood far south-east of Thornwick.",
      "Go back to Wymond Ebb at the market cross in Thornwick.",
    ],
    progress: [
      "The Cross and the Grove. Either first. A pinch will do. I'm not made of salt.",
    ],
    done: [
      "Both. You stood in both. I felt it; no, I didn't, I'm an old man by a stone cross. But I slept, the second night, and I think that was you.",
      "Take this. People pay me in eggs, mostly, but there was a wool merchant once who was dying and generous. I've been keeping it for something that mattered.",
    ],
    after: [
      "I've added two names to the ones I say at night. 'Whoever hung at the Cross.' 'Whoever's in the Grove.' They're long names, but I've time.",
    ],
    others: {
      dorcas: ["He's sent you to the Cross with his salt? He's tried to go himself four times. Comes back grey and asks for soup."],
    },
  },

  // ---- Cinderford ----
  ash_on_the_wind: {
    title: 'They Know the Gate-Word',
    giver: 'hasket',
    offer: [
      "Four of ours came back last night. Went west in spring with the captain. They stood under the wall and gave the gate-word, clear as you like. Right word. Wrong eyes.",
      "I didn't open. They've gone up on the rise above the ford, north-west, and they're standing there. My lads won't loose at them. They were at their weddings. You weren't.",
    ],
    accept: "I wasn't. I'll do it.",
    acceptLine: "North-west of the gate, on the rise. Four. They'll talk to you. They'll use your name if they hear it. It isn't them.",
    decline: 'Not that.',
    declineLine: "No. Then they stand there, and the wall watches them stand. That's a bad thing for a wall.",
    journal: [
      "Four of Cinderford's own have come back from the west possessed, and stand on the rise north-west of the ford. Put them down.",
      "Go back to Sergeant Hasket at the foot of Cinderford's watchtower.",
    ],
    progress: [
      "The rise above the ford. Four. Don't give them your name.",
    ],
    done: [
      "Done. ...I'll tell the wall they went quick. Did they?",
      "Good. Here. Watch pay. And I've changed the gate-word. It's a word they never knew. I had to ask a child for one.",
    ],
    after: [
      "The lads buried the four at the ford. Faces east. I let them have the afternoon. First I've given.",
    ],
    others: {
      ysolt: ["She had you do it. I know why. I'd not have asked you either, in her place. I'd have wanted to."],
    },
  },

  red_scouts: {
    title: 'Two on the Ridge',
    giver: 'hasket',
    needs: 'ash_on_the_wind',
    offer: [
      "Riders. Two, without their horses now, on the ridge west of here, off the road. Red over black. They've been there six days. They count my wall at dawn and at dusk.",
      "Somebody's being told how many I've got. I'd like that somebody to stop being told. I can't spare two men to go, and I'd lose both. Kill the watchers.",
    ],
    accept: "I'll kill them.",
    acceptLine: "West along the road, half a mile, then up to your left. They're knights. Full harness. Hit what isn't plate. And look behind you once you're done: they came in a pair, but they report to more.",
    decline: "Not knights.",
    declineLine: "No. Then they go on counting. I've started standing the cook on the wall, to spoil the sum.",
    journal: [
      "Two of the keep's knights are watching Cinderford from the ridge west of it, beside the Vigil Road. Kill both.",
      "Go back to Sergeant Hasket at the foot of Cinderford's watchtower.",
    ],
    progress: [
      "West, half a mile, the ridge on the left. Two. In full harness.",
    ],
    done: [
      "Both. Then whoever they report to has heard nothing for a day. Tomorrow, two days. Let them wonder. I've wondered long enough.",
      "Here. And this was the captain's rate, not a watchman's. You did a captain's job.",
    ],
    after: [
      "Nobody on the ridge at dawn. I counted my own wall, for the pleasure of being the only one doing it.",
    ],
    others: {
      colm: ["The two on the ridge? I saw their fire. Tiny thing. No smoke. Somebody taught them that, and it wasn't a charcoal burner."],
    },
  },

  vigil_patrols: {
    title: 'The Vigil Road',
    giver: 'hasket',
    needs: 'red_scouts',
    offer: [
      "You've seen what two of them are worth. They ride that road in patrols, west of the burnt mill, thicker the nearer you get to the keep. Threes, then fives, with a lancer.",
      "I can't take the road. I can make it cost them to hold it. Eight. Anywhere in the grey country. If they have to ride in tens to feel safe, that's tens that aren't at my wall.",
    ],
    accept: "Eight. On their own road.",
    acceptLine: "West past the mill, past Khel. You'll find them by the fires. Don't fight where two patrols can see each other. And don't go to the gate. Eight is the order. The gate isn't.",
    decline: 'Not the Waste.',
    declineLine: "No. It's a great deal of nothing with knights in it. I understand.",
    journal: [
      "Sergeant Hasket wants the Vigil Road made costly. Kill eight of the keep's knights anywhere in the Ashen Waste, far west of Cinderford.",
      "Go back to Sergeant Hasket at the foot of Cinderford's watchtower.",
    ],
    progress: [
      "Eight. In the grey country. The ones in red over black; nothing else counts.",
      "Fewer fires on the road last night. Was that you?",
    ],
    done: [
      "Eight. I watched the far fires. They've pulled two of them in. Two fires fewer between me and the keep. Nobody's done that in my time.",
      "This is everything in the watch chest but the candle money. I'm not being generous. I'm paying for the only good news this wall's had.",
    ],
    after: [
      "A patrol came as far as the mill yesterday. Ten of them. Ten, to look at a mill. Good.",
    ],
    others: {
      ysolt: ["Eight of the red ones? ...Did any take his helm off? No. Don't tell me."],
    },
  },

  arch_before_the_gate: {
    title: 'The Arch Before the Gate',
    giver: 'hasket',
    hint: DELVE_HINT,
    offer: [
      "A carter came through raving. Last one I'll see. He said there's an arch stood in front of the keep's gate, with a light in it, and that the garrison walks round it and won't look at it.",
      "If it's a way in that they don't hold, I want it on my slate. Go to the end of the road. Find the arch. If it opens, go through, and come back and tell me what's the other side of that wall.",
    ],
    accept: "To the end of the road.",
    acceptLine: "West. Past the mill, past Khel, past every fire. The gate's shut and always was; it's the arch you want, before it. And don't go through alone. Nothing does.",
    decline: "Not the keep.",
    declineLine: "No. I'd not order it. I'm only asking.",
    journal: [
      "Sergeant Hasket has heard of an arch standing before the gate of Blackvigil Keep. Follow the Vigil Road west across the Ashen Waste to its end.",
      "Go through the arch before the keep's gate, with a company.",
      "Go back to Sergeant Hasket at the foot of Cinderford's watchtower.",
    ],
    progress: [
      "The end of the west road. The arch before the gate.",
    ],
    done: [
      "It opens. And inside's a whole garrison, yards and halls. Then the wall I've been afraid of is the least of it.",
      "On the slate it goes. Here. That's scout's pay, and the scouts I had would've wanted more for less.",
    ],
    after: [
      "I look at that line on the slate every muster. 'A way in.' Eleven of us, and a way in. It's a start.",
    ],
    others: {
      colm: ["An arch with a light in it and no smoke? Mm. A fire that wants nothing. I don't trust it."],
    },
  },

  charcoal_for_khel: {
    title: 'Nobody at the Weighing Table',
    giver: 'colm',
    offer: [
      "I've forty sacks of oak char stacked that Khel ordered. Paid half. That's a carter's bargain: half down, half on the table. So half's still owed me, or I owe them forty sacks.",
      "The girl says there's nobody. I believe her. But I'm a man who checks a kiln twice. Go to Khel. See if there's anyone to take delivery. If what's there isn't buying, see it doesn't follow you home.",
    ],
    accept: "I'll go to Khel.",
    acceptLine: "West on the road, past the burnt mill, half a day. Walled yard on your left with a well in it. The weighing table's by the gate. If there's a hand on it, look at whose.",
    decline: 'Not west.',
    declineLine: "Mm. Then the sacks sit. Char keeps. Better than most things.",
    journal: [
      "Colm Burrage has forty sacks of charcoal owed to the Caravanserai of Khel, far west of Cinderford on the Vigil Road. Go and see if anyone is left there.",
      "Khel is not empty. Put down four of what's in it.",
      "Go back to Colm Burrage at the kilns in Cinderford.",
    ],
    progress: [
      "Khel. Half a day west. Check the weighing table.",
    ],
    done: [
      "Nobody. Mm. Well. I'd known it. Knowing's one thing and being told's the burn finished.",
      "Then the sacks are the sergeant's, for her braziers, and I'll not charge. Here. That's Khel's half, that they paid down. It ought to go to whoever made the delivery. You did, near enough.",
    ],
    after: [
      "I've turfed over the Khel pit. I'll not burn in it again. A man can retire a hole.",
    ],
    others: {
      ysolt: ["He's sent you to my table. He means it kindly. If the scale's still there, the brass one, leave it. I don't want it. I just want it to be there."],
    },
  },

  charred_mill: {
    title: 'The Charred Mill',
    giver: 'ysolt',
    offer: [
      "I'll say it once and then I'd like not to. My husband is at the burnt mill, south of the road, past the ridge. Edmer. With four from our yard. They stopped walking there and never started again.",
      "He stands at the door. He's wearing the blue jerkin I mended. I can't be the one. I've tried to be. Will you? I've nothing to pay with but a cloak, and it's a good cloak.",
    ],
    accept: "I'll go to the mill.",
    acceptLine: "West, then south off the road where a cart track goes. The mill's black; you can't mistake it. He's the tall one. He'll say good evening. Please don't say it back.",
    decline: "I can't do that.",
    declineLine: "No. No, that's fair. I couldn't either.",
    journal: [
      "Ysolt Marrow's husband Edmer stands possessed at the Charred Mill, south of the Vigil Road far west of Cinderford, with four others out of Khel. Go there.",
      "Put down Edmer Marrow and the four with him at the Charred Mill.",
      "Go back to Ysolt Marrow at the refugees' camp by Cinderford's ford.",
    ],
    progress: [
      "The burnt mill. He's the tall one, at the door. I'm sorry. I shouldn't keep describing him.",
    ],
    done: [
      "He's... yes. Thank you. Was he... no. I said I wouldn't ask, and I won't.",
      "Take it. It came out of Khel on my back and it's the best thing I own. My mother wove it and I waxed it myself. I don't need to look fine. I need to not be cold, and they've given me a blanket.",
    ],
    after: [
      "I slept. All of a night. I dreamed the scale came level. I don't know what it was weighing.",
    ],
    others: {
      hasket: ["The Marrow girl asked you? Then go. I'd have sent men a month ago if I'd had men who didn't know him."],
      colm: ["Edmer Marrow shod my mule every spring and never once charged for the nails. Mm. Be quick with him."],
    },
  },

  // ---- Frostwatch and the Howling Deeps ----
  mouth_guard: {
    title: 'What Sits on Your Chest',
    giver: 'garrick',
    offer: [
      "Two things have come up out of the Mouth and stayed up. Long in the arm. Black, or dark blue; you only see them at night. They come to a sleeping man and sit on him. He wakes, and can't move, and then he doesn't wake.",
      "I lost my last two men that way, in their beds, in my own long house. They keep the rocks east of the Mouth by day. Kill both and I'll give you something for the dark. You'll want it, where I think you're going.",
    ],
    accept: "Both of them.",
    acceptLine: "Out my gate, round the fell by the path, past the Mouth. They'll be in the rocks beyond. They're fast and they come from the side. Don't lie down.",
    decline: 'Not those.',
    declineLine: "Hm. Then sleep sitting up, while you're here. I do.",
    journal: [
      "Two night demons out of the Howling Mouth keep the rocks east of it, round the fell from Frostwatch. Kill both.",
      "Go back to Hew Garrick in Frostwatch's yard.",
    ],
    progress: [
      "East of the Mouth, in the rocks. Two. They come from the side.",
    ],
    done: [
      "Both. Then I'll sleep lying down tonight. Eleven years. I'll have to remember how.",
      "Here. I carried it down the Mouth and it's the only reason I came up. A stone on a wire. It's nothing in daylight. Take it underground and it gives back what light it's drunk. It's yours. I'm not going down again.",
    ],
    after: [
      "Slept flat. Woke up and could move. Lay there a while moving things, to be sure.",
    ],
    others: {},
  },

  ravens_tor: {
    title: "Ravens' Tor",
    giver: 'garrick',
    offer: [
      "There's a tor south-east of here. A crag with a flat top. It was ravens' ground. Now it's harpies', and they've a queen. They take my snares, my hares, and last month a goat off the roof.",
      "With the queen dead the rest scatter; they're not clever without her. Climb the Tor and kill her, and the two that fly with her. I'd pay in hares, but she's had them. It'll have to be coin.",
    ],
    accept: "I'll climb the Tor.",
    acceptLine: "South-east. You'll see it from the pass: a black tooth with birds on it that aren't birds. They dive. Stand where there's rock at your back.",
    decline: 'Not a climb.',
    declineLine: "Hm. Then I eat turnip.",
    journal: [
      "Harpies have taken Ravens' Tor, a crag far south-east of Frostwatch, and their queen robs the warden's snares. Go to the Tor.",
      "Kill the harpy queen on Ravens' Tor, and the two that fly with her.",
      "Go back to Hew Garrick in Frostwatch's yard.",
    ],
    progress: [
      "The Tor. South-east. The big one's the queen. She'll let the others come first.",
    ],
    done: [
      "The queen. Good. I saw them go over this morning, a dozen, heading south, all quarrelling. No queen. That's the end of them here.",
      "Coin, as I said. And there was a hare in the low snare today. First in a month. I ate it. I'd have shared it, but you weren't back.",
    ],
    after: [
      "Ravens on the Tor again. Two. They sit where she sat. I approve of that.",
    ],
    others: {},
  },

  into_the_deeps: {
    title: 'The First Hall',
    giver: 'garrick',
    needs: 'mouth_guard',
    hint: DELVE_HINT,
    offer: [
      "You've the stone. So. The Mouth goes down into a hall somebody cut, long ago, with doors off it. Seven doors. In that hall is Hrymgar. Horned, like the goat men on the high ground, and three times the size, with ice grown on him.",
      "He took my rope and four of my six. I've had eleven winters to think about him. Go down with people at your back and kill him. Then come and tell me you counted the doors, so I know you were really there.",
    ],
    accept: "I'll go down.",
    acceptLine: "The split in the rock, east round the fell. It won't take one alone; the dark doesn't. Bring a company. And when it howls, that isn't him. That's what's under him. He only bellows.",
    decline: 'Not yet.',
    declineLine: "Hm. No. I waited eleven years. I can't call you slow.",
    journal: [
      "The Howling Mouth, east round the fell from Frostwatch, leads down into the Howling Deeps. Go in, with a company.",
      "Kill Hrymgar, who keeps the first hall of the Howling Deeps.",
      "Go back to Hew Garrick in Frostwatch's yard.",
    ],
    progress: [
      "Down the Mouth. The first hall. The horned one. You'll not mistake him.",
    ],
    done: [
      "Seven doors. Yes. ...Yes. You were there. And he's dead.",
      "I had this made for the day I went back down. I'm not going. It ought to go, though. Take it. And the fort's coin; there's nobody else to spend it on.",
    ],
    after: [
      "I've struck four names off the list. Not off the list. Off the part of it headed 'owed'.",
    ],
    others: {
      hale: ["Garrick's sent you down after Hrymgar? Then he's decided to trust somebody. He's not done that since before I could plough."],
    },
  },

  broodmother: {
    title: 'What Breeds Below',
    giver: 'garrick',
    needs: 'into_the_deeps',
    hint: DELVE_HINT,
    offer: [
      "Below the first hall it stops being cut and starts being grown. There's something down there that breeds. I never saw it. I saw what it bred. Eight legs apiece, and they came down the walls at us on threads.",
      "With Hrymgar dead there's nothing between it and the Mouth. So it'll come up. Things do. Go down past the hall and kill the mother of it before the fell's full of her young.",
    ],
    accept: "I'll kill it.",
    acceptLine: "Past the seven doors, down. Burn the webs where you can. Look up; they're on the roof before they're on you. Hm. That's all I have. I never got that far.",
    decline: 'Not yet.',
    declineLine: "Then I'll bar the gate and watch the path. It's what I do anyway.",
    journal: [
      "Below the first hall of the Howling Deeps, something breeds. Find the Broodmother and kill her.",
      "Go back to Hew Garrick in Frostwatch's yard.",
    ],
    progress: [
      "Below the hall. The mother of them. Look up.",
    ],
    done: [
      "Dead. And the young? ...They'll starve, then, without her. Good. I'll not pretend to be sorry for them.",
      "Coin. And this was my wife's, for the cold. She'd say it was wasted on a peg. Wear it. And there's still the breathing, under all of it. But that's not mine to ask. Somebody else has asked you, I think.",
    ],
    after: [
      "Nothing's come up the path in a week. I've unbarred the gate by day. It squeaks. I'd forgotten it squeaked.",
    ],
    others: {},
  },

  // ---- Ser Hale Orrowick's ----
  the_howling: {
    title: 'The Howling',
    giver: 'hale',
    needs: 'millhaven_man',
    hint: DELVE_HINT,
    offer: [
      "When the wind's from the south you can hear it from the tower top. A long way off. A howl that doesn't stop for breath. Ser Anselm says it's the fells. He says it too quickly.",
      "There's a warden at Frostwatch, Garrick, who knows what makes it. I can't leave my watch to ask. Would you? And if he says it's a hole, go and stand in it. I'd like one of us to have.",
    ],
    accept: "I'll ask the warden.",
    acceptLine: "Frostwatch is far south, up the Frost Road, in the snow. Tell Garrick who sent you. He'll say 'Hm'. That means he's listening.",
    decline: 'Not the fells.',
    declineLine: "No. It's a long cold way. I'd not have asked, only I can't go.",
    journal: [
      "Ser Hale Orrowick hears a howling from the south. Ask the warden of Frostwatch, Hew Garrick, far south of Bellmourn in the Rimeholt Fells, what makes it.",
      "The warden says it comes from the Howling Deeps, down the Howling Mouth east round the fell from Frostwatch. Go in, with a company.",
      "Go back to Ser Hale Orrowick at the Bell Tower of the Four Watches.",
    ],
    progress: [
      "Frostwatch. The warden. Then wherever he points.",
    ],
    done: [
      "A hole, with halls in it, and something asleep at the bottom, breathing. So that's the sound. I've stood my watch to that for two years and called it wind.",
      "Thank you. Here. It's what I had from selling the plough team. I've no other use for it. Ser Anselm feeds me, and the harness was free.",
    ],
    after: [
      "I listen for it now, on my watch. It's company, in a way. I'd still sooner it stopped.",
    ],
    others: {
      garrick: [
        "Orrowick. The ploughman in the borrowed plate. Hm. He hears it from there? Then it's louder than it was.",
        "Tell him it's the Howling Deeps. A split in the rock east of my gate. It's not wind. Something sleeps at the bottom and that's it breathing. If he wants more than that, somebody will have to go and look. I've been.",
      ],
      bellwright: ["He's asking about the howling. I told him it was the fells. It is the fells. It's what's under them I didn't care to say."],
    },
  },

  the_sleeper: {
    title: 'The Sleeper',
    giver: 'hale',
    needs: 'the_howling',
    hint: DELVE_HINT,
    offer: [
      "I've thought about that breathing. A thing that sleeps, wakes. That's all sleeping is: waiting to. And when it does, there's a warden with no garrison between it and the whole south.",
      "I know farming. You don't wait for the bull to get up. Go down to the bottom of the Deeps and end it while it's lying down. I'd come. I'm sworn to a doorstep. It shames me a little to ask.",
    ],
    accept: "I'll go to the bottom.",
    acceptLine: "All the way down, past whatever Garrick's told you of. Take everyone who'll come. And if it opens its eyes before you're ready, don't be proud. Come back up and go down again.",
    decline: 'Not yet.',
    declineLine: "No. When you're ready. It's slept this long.",
    journal: [
      "At the bottom of the Howling Deeps, something sleeps, and its breathing is the howl. Kill the Sleeper before it wakes.",
      "Go back to Ser Hale Orrowick at the Bell Tower of the Four Watches.",
    ],
    progress: [
      "The bottom of the Deeps. The thing asleep. While it's lying down.",
    ],
    done: [
      "It's stopped. I stood my watch this morning and there was only wind. Real wind. I'd forgotten it had gaps in.",
      "Ser Anselm came out and stood by me a while and didn't say anything. Then he fetched this from the chest inside and said, 'For whoever stopped it.' He's never opened that chest for me.",
    ],
    after: [
      "The south's quiet. I find I miss it, the way you miss a tooth. I'm glad to.",
    ],
    others: {
      garrick: ["The breathing's stopped. I stood in the yard an hour to be sure. Hm. Tell the ploughman he was right to ask."],
    },
  },

  gate_of_blackvigil: {
    title: 'The Gate at the End of the West Road',
    giver: 'hale',
    needs: 'millhaven_man',
    hint: DELVE_HINT,
    offer: [
      "I told you what I saw ride out of the keep past Khel, the year I drove west for salt. I've carried it since. Everyone's seen the fires. Nobody's been through the gate.",
      "There's an arch stood before that gate now, the carters say, with a light in it, like the one on the hill by Bellmourn. If it's a way in, somebody ought to take it. You, with good people round you. Go through. Come and tell me what's inside.",
    ],
    accept: "I'll go through the gate.",
    acceptLine: "West, past everything. You know the road. Don't go alone and don't go proud. It's a garrison, and they've had a long time with nobody knocking.",
    decline: 'Not that gate.',
    declineLine: "No. I'd not blame anyone. I only ploughed near it and I still dream of the horses.",
    journal: [
      "Ser Hale Orrowick wants to know what is inside Blackvigil Keep, at the far end of the Vigil Road across the Ashen Waste. Go through the portal before its gate, with a company.",
      "Go back to Ser Hale Orrowick and tell him what's inside.",
    ],
    progress: [
      "The keep at the end of the west road. Through the arch before its gate. With a company.",
    ],
    done: [
      "A whole castle of them. Knights in the yards, robed ones in the halls, and lords over them, big, with no helms. I knew it. I'd hoped I'd dreamed it.",
      "Here. It's little enough. And sit a moment; you've come a long way to tell a farmer he wasn't mad.",
    ],
    after: [
      "I've stopped dreaming of the horses. Now I dream of the yard you told me of. I think that's worse, but it's truer.",
    ],
    others: {
      hasket: ["Through the gate? You went IN? ...Sit down. Start at the arch. Leave nothing out. Lad! Fetch the slate."],
      aldric: ["You've been inside it. I asked you only to look. I'm glad you can't follow an order."],
    },
  },

  red_cloth: {
    title: 'Twenty of the Garrison',
    giver: 'hale',
    needs: 'gate_of_blackvigil',
    hint: DELVE_HINT,
    offer: [
      "A garrison's like a hedge. It looks like one thing. It's a great many small things laid across each other, and if you take enough of them out it's only sticks.",
      "Go back in and take twenty out. Knights, the robed ones, the sick ones in iron; I'm not particular. It won't empty the place. But the next man through that arch will find it thinner.",
    ],
    accept: "Twenty.",
    acceptLine: "The robed ones first, if you've the choice. A neighbour's lad who soldiered told me that: the ones at the back are why the ones at the front get up again.",
    decline: 'Not yet.',
    declineLine: "No. It's hard work. Come when you're rested.",
    journal: [
      "Thin the garrison of Blackvigil Keep: kill twenty of its knights, plague knights and necromancers, inside the keep.",
      "Go back to Ser Hale Orrowick.",
    ],
    progress: [
      "Twenty, inside the walls. The robed ones first.",
    ],
    done: [
      "Twenty. That's a whole furrow turned. It doesn't look like much from the hedge. It's how fields get done.",
      "Here. Abel sent up my share of two harvests. I've nothing to spend it on, and you've boots to mend.",
    ],
    after: [
      "I think of it thinner, now. It helps me stand.",
    ],
    others: {},
  },

  first_lord: {
    title: 'The First of the Lords',
    giver: 'hale',
    needs: 'gate_of_blackvigil',
    hint: DELVE_HINT,
    offer: [
      "The big ones with the faces. You said there are lords in there, over the rest. I think the one I saw on the road was one. Walking behind the horses like a drover.",
      "The first you'll come to holds the gate, behind a shield like a door. Maldrec; the carters had the name from somewhere. Kill him. I want to know they can be killed. So does everyone who's ever seen one, and we've none of us dared to ask.",
    ],
    accept: "I'll kill Maldrec.",
    acceptLine: "He'll be bigger than his armour ought to allow. Don't look long at the face. It was somebody's. That's how they get into you: you start wondering whose.",
    decline: 'Not yet.',
    declineLine: "No. A thing like that, you go when you're sure.",
    journal: [
      "The lords of Blackvigil Keep are great knights with a villager's face where a helm should be. Kill the first of them, Maldrec, inside the keep.",
      "Go back to Ser Hale Orrowick.",
    ],
    progress: [
      "Maldrec. The first of the lords. Don't look long at the face.",
    ],
    done: [
      "Dead. They die. ...I'm sorry, give me a moment. I've been two years afraid that they didn't.",
      "This is the best I own that isn't strapped to me. I had it off the downs with the rest, and it's too fine for a ploughman. Carry it in there.",
    ],
    after: [
      "I say it aloud at the start of my watch: one of them is dead. The dark's had nothing to say back. It usually has.",
    ],
    others: {},
  },

  lords_of_the_keep: {
    title: 'Sorvane and the Brothers',
    giver: 'hale',
    needs: 'first_lord',
    hint: DELVE_HINT,
    offer: [
      "One's dead. Then they're only strong, and not certain. There are more between the gate and whoever holds the place. A robed one with a black book, Sorvane, that the others fear. And two that fight as one: the Brothers.",
      "Kill all three and there's nothing left between you and the top of that keep. I'll not pretend it's a small thing to ask. I'm asking.",
    ],
    accept: "Sorvane, and the Brothers.",
    acceptLine: "The robed one won't fight fair; they don't. The two, don't let them get either side of you. That's sheepdog work, that is. I know what it looks like from the sheep's end.",
    decline: 'Not yet.',
    declineLine: "No. Rest. Eat. They'll keep; they've nowhere else to be.",
    journal: [
      "Kill Sorvane, the lord the garrison of Blackvigil Keep fears.",
      "Kill the Brothers, who fight as one, deeper in Blackvigil Keep.",
      "Go back to Ser Hale Orrowick.",
    ],
    progress: [
      "Sorvane. Then the Brothers. Don't let the two get either side of you.",
    ],
    done: [
      "All three. Then there's only the one at the top. I never thought I'd say 'only' about that place.",
      "Here. And this was in the harness when I found it, sewn into the lining. A lady's work. Whoever it was meant to keep warm, it didn't reach him. Let it reach somebody.",
    ],
    after: [
      "Three lords. I say it to myself at the start of my watch. It's better than counting.",
    ],
    others: {},
  },

  the_castellan: {
    title: 'The Castellan',
    giver: 'hale',
    needs: 'lords_of_the_keep',
    hint: DELVE_HINT,
    offer: [
      "There's one left, at the top. The Castellan. He holds the keep, and the lords were his, and the riders on the road, and I think the ones who came to Khel for water.",
      "I'll say it plain, the way I'd say it over a gate. Go up and kill him. Not for me. For the carters, and the yard at Khel, and every hearth west of here that's cold. I'd give my field to come. I'm sworn. So I'm asking the one person the oath left me to ask.",
    ],
    accept: "I'll kill the Castellan.",
    acceptLine: "Then go with every good wish a farmer has, and that's a great many; we've little else. Take everyone. And come back. I've stood enough watches for people who didn't.",
    decline: 'Not yet.',
    declineLine: "No. Not till you're ready. I'll be here. It's the one thing I'm good for.",
    journal: [
      "The Castellan holds Blackvigil Keep. Go up through the keep and kill him.",
      "Go back to Ser Hale Orrowick.",
    ],
    progress: [
      "The Castellan. At the top. Take everyone.",
      "I look west every dawn now. I don't know what I expect to see. Fewer fires.",
    ],
    done: [
      "Dead. The Castellan. ...I can't kneel in this, or I would. Take my hand instead. Mind the gauntlet.",
      "I've nothing fit to give for it. So I asked. I went down to Bellmourn on my one free day in two years and asked an old man who carves, and I gave him everything Abel ever sent me. He said it's the best he's made. It's yours.",
      "The road's still long, and the keep's still stone. But nobody's home in it. You did that. A ploughman asked, and you did that.",
    ],
    after: [
      "The carters say the fires on the west road are going out, one a night, with nobody to feed them. I count them on my watch. Going down's a fine way to count.",
    ],
    others: {
      hasket: ["The Castellan's dead? Say it again. ...Lad! Ring the... no. We've no bell. Bang something!"],
      aldric: ["Dead, at the top of his own keep. I sent you to look at a wall. I'll be dining on that for the rest of my life, and I'll tell it wrong every time."],
      ysolt: ["Then the one who took his helm off to drink has nobody to ride home to. Good. ...Good."],
    },
  },

  // ---- the Drowned Vaults, under the Sunken Mile ----
  under_the_mile: {
    title: 'Under the Mile',
    giver: 'sabine',
    needs: 'sunken_mile',
    hint: DELVE_HINT,
    offer: [
      "I went back to the Mile for my mallow. The water by the broken arch is going down. Not drying. Going down, into a stair. There was always a stair. The old toll kept its strongroom under the causeway.",
      "Something's wallowing at the foot of it. I heard it breathe, and then I heard it stop, the way you stop when you've noticed somebody. I'd like it dead before it comes up for air. Would you look?",
    ],
    accept: "I'll go down the stair.",
    acceptLine: "By the broken arch, where the slabs tip. It's a doorway now, with a light in it. It won't take one alone, they say: bring a company. And if it swells up, get something between you and it.",
    decline: 'Not under the fen.',
    declineLine: "No. I only went as far as the first step, and I've washed three times since.",
    journal: [
      "A stair has opened by the Sunken Mile, in the fen north of Bellmourn: the old toll's vaults, drowned. Go down, with a company.",
      "Kill the Bloat, which wallows in the Drowned Vaults.",
      "Go back to Sabine Moss at the herbalist's.",
    ],
    progress: [
      "The stair by the broken arch. Something big, in a pool, breathing. That's all I know, and it's more than I wanted.",
    ],
    done: [
      "It burst? No, don't tell me. Tell me it's dead and tell me nothing else. ...Good. Sit. You smell of the fen and of something I haven't a name for.",
      "This was my mother's. It's kept the damp off two of us. You'll need it more than my hook does, where you keep going.",
    ],
    after: [
      "The mallow's coming back along the Mile. It likes what's under it gone. So do I.",
    ],
    others: {
      bryony: ["Mam says there's a stair under the water now. Does it go all the way down? How do you know when it's all the way?"],
    },
  },

  what_sank_the_mile: {
    title: 'What Sank the Mile',
    giver: 'sabine',
    needs: 'under_the_mile',
    hint: DELVE_HINT,
    offer: [
      "I asked Orrin why a causeway sinks. He said they don't, not stone on a hard bottom, not unless something takes the bottom away. He looked quite pleased. Then he looked at me and stopped.",
      "So it's still there. Whatever dug the fen out from under a mile of stone is at the bottom of those vaults, where the water all goes. And there's a woman's voice down there calling the water in. End both.",
    ],
    accept: "I'll go to the bottom.",
    acceptLine: "Past where the big one was, and round, and down. When the water comes up, find the high ground. When the mud moves, don't stand still. That's fen sense. It's all I've got to give you.",
    decline: 'Not yet.',
    declineLine: "No. Nor would I. But the Mile's sinking a hand a year, and I've counted my hands.",
    journal: [
      "Below the Bloat's wallow a voice is calling the fen in. Kill Mother Sallow, the Tidecaller, in the Drowned Vaults.",
      "At the bottom of the Vaults is what sank the causeway. Kill the Leviathan of the Mile.",
      "Go back to Sabine Moss at the herbalist's.",
    ],
    progress: [
      "The bottom. Where the water goes. The voice first, I think; then the thing itself.",
      "High ground when it floods. Keep moving when the mud does.",
    ],
    done: [
      "A worm. The length of the square, and it ate the bottom out of a causeway. And you went down a hole after it. I'm going to make you something hot and you're going to drink all of it.",
      "Here. It came up in the reeds the spring the Mile first cracked, and I never knew what to do with a staff. You do.",
    ],
    after: [
      "I stood on the Mile and stamped. It stamped back, like ground. First time in my life.",
    ],
    others: {
      orrin: ["A burrowing thing, under the Mile. I said 'something took the bottom away' to be clever. I should like, in future, to be wrong when I'm clever."],
    },
  },

  // ---- the Sporehold, under the Fungal Ring ----
  the_ring_below: {
    title: 'The Ring Below',
    giver: 'orrin',
    needs: 'ossery_quarry',
    hint: DELVE_HINT,
    offer: [
      "Past the quarry, deep in the red wood, there is a ring of caps the height of a man. Every herbal I own calls a ring the fruit of one growth, under the ground, as wide as the ring. That ring is forty paces across.",
      "A man camped there to draw it and left his tent. I want to know what's under it. Not to own. To know. There's a way down beside it now, I'm told. Go and stand at the ring; then go under, and tell me what it is.",
    ],
    accept: "I'll go under the ring.",
    acceptLine: "The Abbey Road, then north through the red trees till they thin. You'll smell it first. Touch nothing that glows. And something howls down there, the carter says. I'd deal with the howling first.",
    decline: 'Not under a mushroom.',
    declineLine: "Put like that, no. I'd not either. I'll go on reading about it, which is safer and worse.",
    journal: [
      "Orrin Vey wants to know what the Fungal Ring grows from. The ring is in the Rustwood, far north-east of Bellmourn, north of the Abbey Road's end. Go there.",
      "There is a way down beside the ring, into the Sporehold. Go in, with a company.",
      "Something howls under the ring. Kill Mouldfang, in his den down the west way.",
      "Go back to Orrin Vey at the Tolling Bell.",
    ],
    progress: [
      "The ring, north of the Abbey Road. And under it. I'll want every particular, and I'll want them in order.",
    ],
    done: [
      "A hollow hill. One growth, wearing wolves. Wearing people. Stood rooted, you say, and turning their heads. ...Give me a moment. I asked to know, and now I do.",
      "Take this. It was to be read by somebody with steadier hands than mine. You went under a hill for a question. That's steady enough.",
    ],
    after: [
      "I've burned the page with the ring on it. Then I drew it again from memory. I'm not proud of either.",
    ],
    others: {
      sabine: ["Under the ring? I pick round the edge of it, and only the small ones. I've never liked how they lean toward you."],
    },
  },

  what_it_fruits_from: {
    title: 'What It Fruits From',
    giver: 'orrin',
    needs: 'the_ring_below',
    hint: DELVE_HINT,
    offer: [
      "I've been at the herbals all night. A thing like that has one heart. Everything else is its hands. The woman you saw tending pods is a hand. The wolf was a hand. Cut off hands and it grows more.",
      "So it must be the heart. It will be at the middle, or past it, and it will keep itself shut while it has hands left. Kill the gardener; then the way will open; then kill what she gardens for.",
    ],
    accept: "I'll find its heart.",
    acceptLine: "East from the great cavern for the gardener. Then north, where it was shut. If it has things rooted round it, feeding it, I'd cut those first. That's not learning. That's weeding.",
    decline: 'Not again.',
    declineLine: "No. Once was more than I'd a right to ask. But it's forty paces now, and the herbals say it grows.",
    journal: [
      "The growth under the Fungal Ring has a gardener. Kill Mother Morel, in her bower up the east way of the Sporehold.",
      "With both its keepers dead the Heart of the Ring is open, north of the great cavern. Kill it.",
      "Go back to Orrin Vey at the Tolling Bell.",
    ],
    progress: [
      "The gardener, east. Then the heart, north. Weed first, if it's rooted.",
    ],
    done: [
      "Dead. All of it? You're sure: the caps on the hill will tell us, by autumn. If they don't come up, you're sure.",
      "I've nothing that's worth a hill. Have this: it's the best thing in the bag, and I only kept it because I couldn't lift it properly.",
    ],
    after: [
      "No ring this autumn, the carter says. Bare ground, forty paces across. I've written it in the margin. It's the only note in that book in my own hand.",
    ],
    others: {
      silas: ["Orrin says you killed a mushroom the size of the square. He was shaking. I gave him the good chair."],
    },
  },

  // ---- the Hollow Playhouse, in the Twisted Grove ----
  the_winter_company: {
    title: 'The Winter Company',
    giver: 'dorcas',
    needs: 'hare_and_harrow',
    hint: DELVE_HINT,
    offer: [
      "Three winters back a company of players took all six of my rooms for a week, and paid in songs, which I let them. They were going on into the Gallowswood to build a house and play there till spring.",
      "They'd a woman with them who did the costumes, and never sat down. They owe me for eleven suppers. Nobody's seen them since, and people who went to see the play didn't come home. Go to the old grove and find my players.",
    ],
    accept: "I'll find your players.",
    acceptLine: "South-east past the Cross, a long way, to the grove with the stone table. If there's a door there that wasn't, it's theirs. It'll want more than one of you. And mind the one with the needles.",
    decline: 'Not the Gallowswood.',
    declineLine: "No. Well. Eleven suppers. I've written off worse.",
    journal: [
      "A company of players went into the Gallowswood three winters ago and never came out. Go to the Twisted Grove, far south-east of Thornwick.",
      "There is a door in the grove: the Hollow Playhouse. Go in, with a company.",
      "The company's seamstress is in the Wardrobe, off the side of the House. Kill her.",
      "Go back to Dorcas Pym at the Hare and Harrow, in Thornwick.",
    ],
    progress: [
      "The grove with the table. Past the Cross and on. If you hear clapping, it isn't for you.",
    ],
    done: [
      "Still in rehearsal. Three winters. And the audience sat there in rows... no. Stop. I fed those people. I'll hear the rest when I've a drink in my hand.",
      "She left this on the bed when they went. I thought it was a kindness. I think now it was a measuring. Take it; I'll not have it in the house.",
    ],
    after: [
      "I've taken the playbill down off the taproom wall. There's a clean square where it was. I look at that instead.",
    ],
    others: {
      osric: ["Players. I remember them. One of them asked me how tall I was. I told him. He wrote it down."],
    },
  },

  last_night_of_the_run: {
    title: 'Last Night of the Run',
    giver: 'dorcas',
    needs: 'the_winter_company',
    hint: DELVE_HINT,
    offer: [
      "I've been thinking who paid. It wasn't the tall one who did all the talking. He never had a coin. It was a woman at the back with a box under her arm, who made the dolls they sold at the door.",
      "It'll be her house. He's only what she puts on the stage. Go back, see the play out to the end, and then go up to wherever she keeps herself and close it. For good. No more nights.",
    ],
    accept: "I'll close the house.",
    acceptLine: "He'll be on, now the costumes are seen to. Stay where the light is; I never saw him out of it. And her box played a tune. When it stopped, the whole company stood like posts. I'd stand too.",
    decline: 'Not yet.',
    declineLine: "No. Sit, then. Mutton. On the house; I'm in the habit of not being paid.",
    journal: [
      "With his costume seen to, the Leading Man will take the stage of the Hollow Playhouse. Kill him.",
      "The Dollmaker keeps the attic over the back of the house. Kill her, and the play is over.",
      "Go back to Dorcas Pym at the Hare and Harrow, in Thornwick.",
    ],
    progress: [
      "The stage first. Then up, to the one with the box.",
      "Stay in his light. And when her tune stops, you stop.",
    ],
    done: [
      "Over. Truly over? No curtain call? ...Then I'll say it for them, since nobody else will: it was a good week, that first one. They could sing.",
      "This came out of one of their trunks the night they left; I found it under the stair. It's an ugly thing and it's worth more than the inn. It's yours. Call it eleven suppers and the change.",
    ],
    after: [
      "A carter came through and asked was there anything to see hereabouts. I said no. First time in three winters that's been true.",
    ],
    others: {
      wymond: ["The grove's quiet. I walked out and stood at the table. Nothing clapped. I said a few words over the door, and it's only a door."],
    },
  },

  // ---- the Kingsbarrow, in the great mound of the Barrows ----
  sung_open: {
    title: 'Sung Open',
    giver: 'jory',
    needs: 'moor_wayhouse',
    hint: DELVE_HINT,
    offer: [
      "That one with the lamp, at the wayhouse. I've been thinking what a body like that wants on a moor. Then last night the lights weren't drifting. They were all going one way. To the big mound.",
      "And there was singing. Low, a lot of voices, no tune you'd whistle. My gran said the great mound was shut on a king with his guard stood round him alive. I think somebody's singing at the door. I think it's opened.",
    ],
    accept: "I'll go to the mound.",
    acceptLine: "The Barrow Track to its end. The big one, with the ring of stones. If there's a way in at its foot, that's it. Gran said he had a warden who never sat down. He'll be the first thing through the door.",
    decline: 'Not the barrows.',
    declineLine: "No. I only watch it. I've watched it sixty years and it never once watched back, till now.",
    journal: [
      "The lights on the Barrow Moor are gathering at the great mound, and something is singing there. Go to the Barrows, far south-west of Bellmourn, at the end of the Barrow Track.",
      "The great mound is open at its foot: the Kingsbarrow. Go in, with a company.",
      "The king's warden keeps the hall off the east walk. Kill the Gravewarden.",
      "Go back to Jory Pell and tell him what was singing.",
    ],
    progress: [
      "The big mound. The one with the stones round it. I can hear it from the wall now, when the wind's south.",
    ],
    done: [
      "Stood up in his plate, after all that while, and came at you. And you put him down by making him run into a rock. Ha! ...No. I shouldn't laugh. Gran would've, though.",
      "Singers in robes, at the door of a grave. Here. It's not the night pay this time; this is out of my own box. A man ought to pay for his own bad dreams.",
    ],
    after: [
      "No singing these three nights. The lights still go that way. Slower. Like they've forgotten what for.",
    ],
    others: {
      aldric: ["A king under the moor. Jory's gran had that tale. I had it down as a tale. I've had a number of things down as tales."],
    },
  },

  king_under_the_moor: {
    title: 'The King Under the Moor',
    giver: 'jory',
    needs: 'sung_open',
    hint: DELVE_HINT,
    offer: [
      "I've remembered the rest of Gran's tale. He didn't walk to his grave, the king. He rode. And what he rode was shut in with him, chained, and it wasn't a horse. She'd flap her arms when she told that part.",
      "If the singing's woken his guard it'll wake that. There's a seal on the stair down, you said, and two things holding it. Break what holds it and go down. I'd as soon it never came up and looked at Bellmourn.",
    ],
    accept: "I'll go down to the king.",
    acceptLine: "West walk for the other one that holds it, the heap of bones that gets up. Don't let its bits walk home. Then the stair. And if the thing marks you, stand close together. Gran said that. I never knew why.",
    decline: 'Not yet.',
    declineLine: "No. It's a long way down to go for a watchman's gran. I'll keep the lamp lit either way.",
    journal: [
      "The Ossuary Golem, in the hall off the west walk of the Kingsbarrow, is the other thing that holds the king's stair shut. Kill it.",
      "The stair is open. In the vault below is what the king rode. Kill Ossivar, the Barrow Wyrm.",
      "Go back to Jory Pell.",
    ],
    progress: [
      "The bones in the west hall. Then down the stair.",
      "Close together when it marks you. Apart when it burns. Gran's words, near enough.",
    ],
    done: [
      "A wyrm. Bones and all, and flew. Under our moor, all my life, under the lights I've been counting. ...I'll sit down a minute. Don't mind me.",
      "This was Gran's, and her gran's, and nobody ever said where it came from, only that it came off the moor. It should go back to somebody who's been in there. That's you. There's nobody else.",
    ],
    after: [
      "The moor's dark. All of it. First night in sixty years. I stood my whole watch looking at nothing, and it was the best watch I ever had.",
    ],
    others: {
      silas: ["Jory says the moor's gone dark. I've carved him a little light to hang in the watch-house. He says he won't light it. He'll light it."],
    },
  },
};
