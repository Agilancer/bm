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
        "Bellmourn's half an hour east, and more, with a watch of three and a hunter. I know, because I wrote to ask for men. Captain Halloway wrote back, very civil, with none.",
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
        "Khel. Half an hour west, near enough. A walled yard for carters, with a well, a cookhouse and stabling for forty. I sold there every month. Then one month there was nobody at the weighing table. Sacks still stacked.",
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
      { after: 'quest:not_for_the_barley', say: "You'll be from Abel. He sends somebody every quarter-day. Mind the left pauldron; it's off a bigger man and it swings. Hale Orrowick. I'd shake your hand, if the gauntlet lets me." },
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

export const QUESTS = {
  // ---- out of Bellmourn ----
  // (Ser Aldric's word to Thornwick is cut.)
  // (Owed to Frostwatch is Berin Stoat's errand up from Fellfoot now, kettles_slate: src/folk/lines/regions/fells.js.)

  // (Thornwick's two hub-to-hub words, hare_and_harrow and man_at_the_cross, are cut.)
  // (Orrin Vey's quarry is Marta Rudd's at Ossery Quarry now: src/folk/lines/regions/rustwood.js.)
  // (Thornwick's own, the Old Toll's and the salt are src/folk/lines/regions/gallows.js now, each given by whoever stands by the work.)
  // ---- Cinderford's, Khel's, the Vigil Road's and Blackvigil Keep's: the Ashen Waste's now (src/folk/lines/regions/waste.js) ----
  // ---- Frostwatch and the Howling Deeps ----
  // (Garrick's four down the Mouth, Ser Hale's Sleeper among them, are src/folk/lines/regions/fells.js now; Ravens' Tor is
  // Dain Scree's, at Climbers' Rest under it. Ser Hale's Howling is cut.)

  // ---- the Drowned Vaults, under the Sunken Mile ----


  // (The Sporehold's two, under the Fungal Ring, are Dilly Roe's there now: src/folk/lines/regions/rustwood.js.)


  // ---- the Hollow Playhouse, in the Twisted Grove ----
  // (Its two are Master Fabian Larke's at the Players' Wagon now: src/folk/lines/regions/gallows.js.)
  // (the Kingsbarrow's two are the Barrow Moor's now, given at its door: src/folk/lines/regions/moor.js)

  // (the Elder Dragon Gods' two are Yrsa's now, on the Crown of Teeth by their door: src/folk/lines/regions/deepwood.js)

};

// And the regions' (src/folk/lines/regions/, docs/QUEST-LOOP.md).
import { REGION_LINES, REGION_QUESTS } from './regions/index.js';
Object.assign(LINES, REGION_LINES);
Object.assign(QUESTS, REGION_QUESTS);
