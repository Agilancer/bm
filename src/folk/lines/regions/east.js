// The Marches and the road to Phobos: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/east.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it: nobody at a camp names Velscour or Tessariel, and no line anywhere names anything of the one
// beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs reads every line for it).
// (Wenna Coyle's own lines are the first visit's: src/folk/lines/first-visit.js. The Sill's three words into the city are
// hers, below, and so are what Fennick Lowe, Edda Grail and Maud Treller say to them.)
export const LINES = {
  // ---------------------------------------------------------------- Marchfoot
  hester: {
    first: [
      "Not off the March. You've come from the west, by your boots. Nobody comes from the west. Hester Pyke. This was the March's fold, at the bottom of the road. I keep the fire in it, and the cairn, so they can see from the top where the road stops.",
    ],
    greet: {
      morning: ["Morning. Two came down in the night. They're asleep in the tent. Let them be.", "The cairn's the first thing they see from the top. Then the smoke. Then me."],
      day: ["If you've come from the west, you're the first this week who has.", "Mind the slope. It's steeper going up. Everyone says so and nobody believes it till they're on it."],
      evening: ["Dusk. They can't see the cairn from the top now. They come down by the fire instead, and so does anything else that's looking."],
      night: ["Keep to the fire. The road's not yours at night. It's not theirs either, and that's the trouble."],
    },
    about: [
      "Hester Pyke. My man and I kept the March's sheep, from this fold. The keep's lancers took the flock in the spring, for their table. They left the pens. People coming down started stopping in them.",
      "Marchfoot's the bottom of the March. They come down it with what they could carry, and I send them on west to Mother Tibb's. Not all of them. She takes what she can.",
    ],
    ask: {
      march: ["The March is the long hill. The road comes up it from Gatewatch, past the Lantern, and down to me. On a clear day you can see the city from the top. Nobody stops to."],
      keep: ["Greywarden. West, on its hill, with the fire-basket on top. When the basket's lit, his lancers are out. When it isn't, they're out anyway. It's a pretty fire. I'll give it that."],
    },
    topics: { march: 'The March', keep: 'The keep on the hill' },
    bye: ["Go careful.", "Mind the slope."],
    barks: {
      player: ["West boots. Fancy.", "Stand by the fire, not in front of it."],
      morning: ["Fire's in."],
      evening: ["Bank it up, somebody."],
      magic: ["Not by the pens! The hay's all we've got."],
    },
    shop: { open: ["I'll buy what you've got and sell you what I have, which is a roll and a dressing. Don't ask for more. There isn't any."], closed: ["Not now. I'm feeding people."] },
  },

  piers: {
    first: [
      "You're not— no. Theirs don't come from the west. Piers Lusk. I was a clerk. Now I'm a man by a fire with ink on his hand that won't come off.",
    ],
    greet: {
      morning: ["Morning. I dreamed in columns again. Name, load, paid. I woke up and tried to rule a line under it."],
      day: ["Don't mind me. I keep looking at the slope. They keep standing on it."],
      evening: ["Gate's shut by now, at Gatewatch. Somebody else is writing the names. Badly, I hope."],
      night: ["I don't sleep near the edge of the fire. I sleep in the middle of the camp. Hester's idea. I'm not proud."],
    },
    about: [
      "Nine years I kept the book at Gatewatch, at the toll. Every cart, every name, where it was going and to whom. Then one morning I picked up the book and walked out of the gate the wrong way.",
      "I didn't plan it. I'd like to say I planned it. I'd been writing a woman's name, and I knew whose name it was going to be on next, at the keep. My hand stopped. My feet didn't.",
    ],
    ask: {
      toll: ["The toll at Gatewatch was coin, once. Then it was coin and a name. Then just the name. A name's dearer. You can't earn another."],
      queue: ["The carts at the gate? They'll be backed down the road by now, waiting for somebody to write them in. Rollo Bask will be at the front. He always is. If you pass, tell him the book's not coming back. He'll know what I mean, and he'll hate me."],
    },
    topics: { toll: 'The toll', queue: 'The carts at the gate' },
    bye: ["Mind the gully.", "Go on. I'll be here. Where else."],
    barks: {
      player: ["Not one of theirs. Good."],
      morning: ["Name, load, paid. Stop it."],
      evening: ["Gate's shut."],
      magic: ["Careful! That's the only blanket I've got!"],
    },
  },

  // ---------------------------------------------------------------- the Long Queue
  rollo: {
    first: [
      "You came up past the Needle? Then you'll want the back of the queue. It's down the road, round the bend, and getting further. Rollo Bask. I'm the front of it. I've been the front of it twelve days.",
    ],
    greet: {
      morning: ["Morning. Gate's shut. It was shut yesterday, if you're keeping track. Nobody is any more."],
      day: ["Don't stand in the road. Somebody'll think it's moving.", "Mags is selling nails again. To me. They were mine Tuesday."],
      evening: ["Dusk. The gate shuts at dusk and doesn't open at dawn. I still watch it shut. Habit."],
      night: ["Sleep under a cart if you're stopping. It's near enough a town now, the Queue. It's got a draper. Had."],
    },
    about: [
      "Rollo Bask. I carry for whoever pays, east and back. Flour in, cloth out. My father did the road before me. The toll was always a toll. You paid it and you went on.",
      "Now they want names, and the man who wrote them down walked off one morning, and nobody else up there can spell. So we wait. We're very good at it.",
    ],
    ask: {
      queue: ["They call it the Long Queue. It started as six carts. I've stopped walking down to see how far it goes. You join at the back and the back gets further off."],
      toll: ["Gatewatch, where the two roads meet. A gate across the road, and men in red stood under it. They don't speak to you. They don't have to."],
    },
    topics: { queue: 'The Long Queue', toll: 'The toll gate' },
    bye: ["Mind the gate.", "If the queue moves, run."],
    barks: {
      player: ["Back's that way.", "You're not queue-jumping, are you?"],
      morning: ["Shut."],
      evening: ["Gate's shut."],
      magic: ["Not near the flour! It's not even mine any more."],
    },
    shop: { open: ["I've a cart of somebody else's flour and a box of what I sell. Rolls. Dressings. Pick one of the two."], closed: ["Shut. Like the gate."] },
  },

  bride: {
    first: [
      "You'll be the one walking the wrong way up the queue. Bride Sayer. Carrier. My cart's down the line, behind where the draper's was.",
    ],
    greet: {
      morning: ["Morning. I walked down to Cobb's cart. Sheet's still flat. I look at it first thing. I can't help it."],
      day: ["Pass the time? I've passed it. It's all down the road behind us."],
      evening: ["Getting dark. I'll have my back to the road, if you don't mind. Not to the rise."],
      night: ["I don't look up the rise at night. You can look. Tell me nothing's there."],
    },
    about: [
      "Bride Sayer. I carry small. Bolts, pins, a crate of something somebody wants on the other side of a gate. Thirty years of other people's crates and I've never once opened one.",
      "Cobb was the draper. Up the line from me. He'd talk to his load at night. I thought it was company. You do, in a queue.",
    ],
    ask: {
      cobb: ["Master Cobb. A draper out of the west, carrying for the city's tailors. Thin man, careful with his hands. Folded his sheet down every night like a bed."],
    },
    topics: { cobb: 'The draper' },
    bye: ["Back before dark, mind.", "Go on, then."],
    barks: {
      player: ["Wrong way. Queue's that way."],
      morning: ["Sheet's still flat."],
      evening: ["Back to the road."],
      magic: ["Do that up the rise. Not here."],
    },
  },

  // ---------------------------------------------------------------- Widow's Lee
  ines: {
    first: [
      "Stop there. Don't look at the tree. Look at me. ...You walked in. Nobody walks in. So somebody sent you, or you're the worst scout I've seen. Ines Mar. Sergeant, once, of a watch that isn't.",
    ],
    greet: {
      morning: ["Morning. Keep low. The Needle can see the top of the tree, and nothing else, and I'd like it kept that way."],
      day: ["Quiet. Sleep while it's light. We walk at night."],
      evening: ["Dusk. They always want to go at dusk. Dusk is when the keeps look hardest."],
      night: ["No fire. It's laid, and it stays laid. Better cold than seen."],
    },
    about: [
      "Ines Mar. I was a sergeant of the watch in the city, before. When it fell, some of us rode out and some stayed. I rode out. I've been under this ridge since, bringing people over the Notch to where they can walk.",
      "It's called Widow's Lee for the woman who lived here. The tree was hers. She's not. I never asked which way she went.",
    ],
    ask: {
      notch: ["Widow's Notch. East. The only way over the ridge to the city. Something big stands in it. Somebody called him the Toll-Giant once, and it stuck. There's no gate. There's him."],
      city: ["I can see it from the top of the ridge. Most nights I go up and look. You don't stop looking at your own house when it's on fire."],
    },
    topics: { notch: "Widow's Notch", city: 'The city' },
    bye: ["Low, now.", "Don't look at the tree."],
    barks: {
      player: ["Low.", "Not there. Where I can see you."],
      morning: ["Keep down."],
      evening: ["Not yet."],
      magic: ["Put that out! The Needle can see that!"],
    },
    shop: { open: ["I'll buy. We need everything. I've a roll or two I can spare, and dressings. Mostly dressings."], closed: ["Not now. Down."] },
  },

  oswy: {
    first: [
      "Sergeant says don't talk to anyone who walks in. You walked in. ...Oswy. Oswy Holm. I do the arrows.",
    ],
    greet: {
      morning: ["Morning. I've a stick with a point on it, if you need one. It's not an arrow. Don't call it one."],
      day: ["She's asleep. Don't wake her. I did once."],
      evening: ["She'll go up the ridge in a bit and look at it. She thinks I don't know. I know."],
      night: ["You can sit by me. It's not warmer. It's less cold."],
    },
    about: [
      "Oswy Holm. I was a fletcher's boy in the city, on the Tanners' side, by the water. The sergeant brought me out over the Notch when I was fourteen, because I could make an arrow. I still can. When there's feathers.",
    ],
    ask: {
      tanners: ["The Tanners' Steps. Stink like you'd not believe, and the best water for a dye in the city. My master said the dyers were the only honest men there. Then he said not to say so."],
    },
    topics: { tanners: "The Tanners' Steps" },
    bye: ["Go on.", "Mind the birds."],
    barks: {
      player: ["Sergeant's watching. She's always watching."],
      morning: ["No feathers. Sticks."],
      evening: ["She's going up again."],
      magic: ["Can you do that to a feather? Make it more feathers?"],
    },
  },

  // ---------------------------------------------------------------- Ashfold, on the Outwall under the north gate
  out_reeve: {
    first: [
      "Mind the sacks. That's somebody's grandmother, sieved. Hode Callow. Ash-reeve of Ashfold, which is the name for this yard and everyone in it. The city burns its dead now. We cart what's left.",
    ],
    greet: {
      morning: ["Carts go out at first light. You're in the way of one. There, now you're not.", "Morning. The pyre's still warm from the night. It's always warm."],
      day: ["Sixteen sacks to the Hithe today, eight to the fields, and none back to the city. Nothing goes back in.", "If you're buying, buy. If you're looking, the Delf's a better view."],
      evening: ["They light the big pyre at dusk. Don't stand downwind of it. Don't stand upwind either, if you can help it."],
      night: ["Keep to the lamps. What's on the burning ground at night isn't the keepers."],
    },
    about: [
      "Hode Callow. I was a sexton, in the city, when the city had yards to bury in. They filled. Now there's the Pyre Ground and the keepers, and the ash comes out here in carts, and I count it.",
      "Ashfold sieves it. Fine ash goes to the Hithe, for the lye: the tanners can't take a hair off a hide without it. The bone goes to the fields. The rest goes on the Middens with everything else nobody wants.",
    ],
    ask: {
      pyre: ["The Pyre Ground's east, along the ditch, under the gate. The keepers lay them out on the flags and burn them in rows. Lately a row sits up before it's lit. The keepers have gone careful. So have I."],
      delf: ["The Old Delf. Where the city's stone came from, west, down the Delf Way. Three benches cut down into the plain and a ramp to haul out by. Nobody's cut there since. Something's moved in and taken to the work."],
    },
    topics: { pyre: 'The Pyre Ground', delf: 'The Old Delf' },
    bye: ["Mind the sacks.", "Go on, then."],
    barks: {
      player: ["Not in the ash. Round it.", "That's a sack, not a seat."],
      morning: ["Carts out!"],
      evening: ["They're lighting it."],
      magic: ["Don't burn anything here. It's been burnt."],
    },
    shop: { open: ["I'll buy what you've got. I sell a loaf and a dressing and nothing grey, I promise you that."], closed: ["Not now. I'm counting."] },
  },

  out_nell: {
    first: [
      "You've a face that's not been ashed. Give it a week. Nell Sallow. I drive the white cart: the good ash, the fine, to the Hithe for the tanners. Twice a day, round the long way, because the short way's the city.",
    ],
    greet: {
      morning: ["The mule's in a mood. He knows where we're going.", "First load's on. You can ride the tail if you don't mind the company."],
      day: ["Hithe and back. Hithe and back. I could do it asleep. Some days I think I have."],
      evening: ["Last load. The tanners pay at dusk, so I'm there at dusk."],
      night: ["Mule's in. I'm in. Lamps are lit. That's Ashfold done."],
    },
    about: [
      "Nell Sallow. My mother drove the cart before me, and she sieved before that. It's not a trade anyone chooses. It's the one that was left when the city closed its gates on the ones outside them.",
      "The white ash is the best of it. It's what's left at the heart of the pyre, burnt clean. The tanners swear by it. I swear at it. It gets in everything.",
    ],
    ask: {
      hithe: ["Tanners' Hithe. South side, past the fields and the Sump, where the Leat comes out from under the wall. Joss Harrow's yard. He pays fair and he talks less, which I like in a man who handles skins."],
      mule: ["He's called Penny, because that's what he cost. He's worth more. Don't tell him."],
    },
    topics: { hithe: "Tanners' Hithe", mule: 'The mule' },
    bye: ["Watch your feet.", "Hithe and back."],
    barks: {
      player: ["You've got ash on you. Everyone has.", "Mind the mule. He bites."],
      morning: ["Come on, Penny."],
      evening: ["Last load!"],
      magic: ["Don't. Penny hates that."],
    },
  },

  // ---------------------------------------------------------------- Tanners' Hithe, on the Leat under the south gate
  out_tanner: {
    first: [
      "You'll get used to the smell, or you won't, and either way you'll stop telling me about it. Joss Harrow, master of the Hithe. Hides in, leather out, and the Leat takes the rest down to the Sump.",
    ],
    greet: {
      morning: ["Pits first. Then talk. The pits don't wait.", "Morning. Mind the edges. They're slick, and the liquor takes the skin off a man as well as a cow."],
      day: ["Every hide that goes in at the Water Gate was cured here. Every one. Think on that next time you buy a belt in there."],
      evening: ["Nell's cart's late. It's never late. ...There she is."],
      night: ["Pits are covered. Lamps are lit. If you hear a splash, it wasn't me."],
    },
    about: [
      "Joss Harrow. The tanners were always outside the wall. The city likes its leather and doesn't like where it comes from. Fair enough. I wouldn't have us inside either.",
      "Lime first, to loosen the hair. Bark liquor, months of it. Then the dyers in the city take them, at the works on the Tanners' Steps. I sell to the works and to nobody else. They pay in good coin, and they ask nothing about it.",
    ],
    ask: {
      pits: ["Twelve pits. Two of my men went in the far row in the spring, and came out of it in the autumn. They walk the yard at night. I'd rather they didn't. They were good with a fleshing knife, and they still are."],
      kilns: ["The Limekilns are east, under the cliff, past the gate. The lime-burners went quiet a month back. Something big's been keeping the kilns hot since. My lime's running low."],
    },
    topics: { pits: 'The pits', kilns: 'The Limekilns' },
    bye: ["Mind the edges.", "Go on."],
    barks: {
      player: ["Not that pit. Or that one.", "Leave the hides be. They're not done."],
      morning: ["Turn the hides!"],
      evening: ["Cover the pits."],
      magic: ["Not near the liquor! It'll go up."],
    },
    shop: { open: ["I'll buy. I sell a roll and a dressing and leather, but you'd not want the leather yet. Give it a year."], closed: ["Not now. I'm up to the elbow."] },
  },

  out_agna: {
    first: [
      "Sit down if you like. Everyone else stands. Agna Ruddock. I've lived on the Leat sixty years and I'll die on it, and it'll carry me down to the Sump and the eels will have me. It's fair. I've had a lot of them.",
    ],
    greet: {
      morning: ["Mist's on the Sump. Good for eels. Bad for knees."],
      day: ["The Leat's low. When it's low you can see what's in it. I'd rather not."],
      evening: ["Lamps on the water. That's the dyers in the city, letting their pits out. The Leat goes red for an hour."],
      night: ["Go to bed. I'm not, but you should."],
    },
    about: [
      "Agna Ruddock. My man laid the eel-traps in the Sump, and I've laid them since he went in after one. Wicker, bark-tied. The tanners eat the eels and I eat what they don't.",
      "The Sump's where the Leat ends. Everything the city lets go down its drains comes out under the south wall, and down the Leat, and stops there. The eels like it. Eels like anything.",
    ],
    ask: {
      sump: ["Down past the fields' end, west. Still water and reeds round it and the dead pines. There's something in it bigger than an eel. It's been turning my traps over."],
      leat: ["The Leat's the old mill-race. It ran the city's mills when the city had mills. Now it runs the city's leavings. Same water. Different job."],
    },
    topics: { sump: 'The Sump', leat: 'The Leat' },
    bye: ["Mind the water.", "Off you go."],
    barks: {
      player: ["Sit, if you're stopping.", "You've wet boots. Everyone's got wet boots."],
      morning: ["Eels!"],
      evening: ["Red water."],
      magic: ["Pretty. Does it catch eels?"],
    },
  },
};

export const QUESTS = {
  // ================================================================ Marchfoot (Hester Pyke; Piers Lusk)
  back_of_the_line: {
    title: 'The Back of the Line',
    giver: 'hester',
    about: "Wolves come down off the March after dark and take whoever's last into Marchfoot's fold. Three lie up in the gorse south of it, under three hundred paces off, on two legs when they want, one bigger. Hester Pyke wants two of them dead. The third won't stay on its own.",
    offer: [
      "They come down in a line. Nobody tells them to. The strong first, then the ones with children, then the old. And behind the old, at dusk, the wolves.",
      "Three of them, on two legs when they want. One bigger. They lie up in the gorse down there, south, a short walk. Kill two. The third won't stay on its own.",
    ],
    accept: "I'll go down into the gorse.",
    acceptLine: "South, down the slope, where the gorse is thick. They sleep by day. Don't let them.",
    decline: 'Not yet.',
    declineLine: "Then I'll put the strong ones at the back tonight, and lose a strong one.",
    journal: [
      "Wolves come down off the March after dark and take the last of whoever's coming down to Marchfoot. Three lie up in the gorse south of the fold. Kill two.",
      "Go back to Hester Pyke at Marchfoot.",
    ],
    progress: [
      "South, in the gorse. Three. One bigger.",
    ],
    done: [
      "Two? Then the third's gone back up the March. ...I worked something out while you were down there. They've never once gone for Mother Tibb's, at Last Hearth. Only here.",
      "It's the fold. Twenty years of sheep in these pens. They come down the March after the smell, and find people in the pens instead. Nobody sleeps in the pens from tonight. Take this. It's what the last ones had on them. Spend it on something with teeth.",
    ],
    after: [
      "Nobody sleeps in the pens now. We'll burn them when it's dry. Nobody's been taken off the back, either.",
    ],
  },

  every_name: {
    title: 'Every Name',
    giver: 'piers',
    about: "Piers Lusk kept the toll-book at Gatewatch for nine years, every name through the gate, and ran with it. Something came out of the bank at him in the gully north-east of Marchfoot and he threw the book at it. Its pages lie white in the gorse round the spiders there. Pick up five.",
    offer: [
      "I ran with it. The book. Every name that went through the gate at Gatewatch, and where they were going, and who to. They hang people out of that book. I couldn't carry it another day and not know that.",
      "I came down the gully, north-east of here, at night. Something with a lot of legs came out of the bank. I threw the book at it. I'm not proud. It came apart. The pages are still down there, round the webs. You can see them from the edge, white in the gorse.",
    ],
    accept: "I'll fetch your pages.",
    acceptLine: "North-east, down in the gully, two hundred and some paces. Round the outside. Don't go in among them for paper. It's only paper. Five will do. It's a start.",
    decline: 'Not now.',
    declineLine: "No. It'll keep. That's what's wrong with it.",
    journal: [
      "Piers Lusk ran from Gatewatch with the toll-book, every name through its gate, and threw it at something in the gully north-east of Marchfoot. Its pages lie round the spiders there. Pick up five.",
      "Take the pages back to Piers Lusk at Marchfoot.",
    ],
    progress: [
      "North-east, the gully. Round the webs. White, in the gorse.",
    ],
    done: [
      "Give them over. ...No, don't hand them so I can see. I'll read them. I'll know every one. I wrote every one.",
      "There. And there. Hester, is that fire hot enough? It is. You'll think I should have kept them. Somebody ought to know who went through. I know. It's me. That's enough people. Toll money. I never paid it in.",
    ],
    after: [
      "There's more down there. I know there is. I'll go down myself, when I'm braver. You'll hear me.",
    ],
  },

  riders_on_the_slope: {
    title: 'Lancers on the Slope',
    giver: 'hester',
    needs: 'every_name',
    about: "Lancers from the keep have stood on the slope three hundred paces north of Marchfoot since Piers Lusk came in, watching the fire and coming no nearer. Hester Pyke wants them down before they're sure enough to come down to it.",
    offer: [
      "You see them? Up the slope, north. They came the day after Piers did, and they've stood there since. They don't come down. They look. Four of them, spears up.",
      "They want Piers. They'll come the day they're sure he's here, and take him, and whoever's stood next to him. Make them not sure. Make them nothing.",
    ],
    accept: "I'll go up to them.",
    acceptLine: "North, up the slope, three hundred paces. They'll see you coming the whole way. So will we.",
    decline: 'Not yet.',
    declineLine: "Then Piers sleeps in the middle of the camp again, and I hope they're the sort that minds.",
    journal: [
      "Lancers from the keep have stood on the slope three hundred paces north of Marchfoot since Piers Lusk came in, watching the fire. Put them down.",
      "Go back to Hester Pyke at Marchfoot.",
    ],
    progress: [
      "North, up the slope. Four lancers. Spears up.",
    ],
    done: [
      "Down? Then nobody's going back to the keep to say he's here. They'd have had a likeness of him. 'A clerk. Lean. Ink on the right hand.'",
      "So everyone who's come down since him, I've inked their right hands before I sent them west. A whole road of clerks, walking to Last Hearth. ...It was my husband's. He'd want it on somebody going east.",
    ],
    after: [
      "Piers is teaching the ones who stop here their letters, ink and all. He says it's for cover. He's smiling, though.",
    ],
  },

  under_the_lantern: {
    title: 'Under the Lantern',
    giver: 'hester',
    needs: 'riders_on_the_slope',
    about: "Ines Mar of Widow's Lee, south-east under the ridge, brings people out over the Notch and walks them up to Marchfoot by night, past the Lantern. Its keepers stand under it after dark now, and she's stopped. Put two down, then go on over the hill and tell her the slope is clear.",
    offer: [
      "There's a woman under the ridge, south-east, at a place called Widow's Lee. You won't find it. She'll find you. Ines Mar. She brings people out over the Notch and walks them up to me, at night, past the Lantern.",
      "She's stopped. The Lantern's keepers stand under it in the dark now, and she won't bring them past. Put two of those down on your way. Then tell her the slope's clear, the wolves and the lancers both, and to send them while it is.",
    ],
    accept: "I'll find Widow's Lee.",
    acceptLine: "South-east down the road to the Lantern, the tall one with the lit head. Then leave the road and go south, over the hill. Not on to the gate. Half an hour. Look for a dead tree. Then don't look at it.",
    decline: 'Not yet.',
    declineLine: "Then they stay up there another week, behind her, in the cold. She'll keep them. She's good at keeping.",
    journal: [
      "Hester Pyke wants Ines Mar of Widow's Lee to bring her people up again. The Lantern's keepers stand under it, south-east of Marchfoot down the road: put two of them down.",
      "Leave the road at the Lantern and go south over the hill to Widow's Lee, not on by the gate, and tell Ines Mar the slope is clear.",
    ],
    progress: [
      "The Lantern first. Then south over the hill, not the gate. Ines Mar.",
    ],
    done: [
      "Hester sent you? Then you came past the Lantern and you're still walking. ...The slope's clear. Both? The wolves and the lancers? She'd not say it if it wasn't.",
      "Then they go up tonight. I've had them in the rocks since the new moon. ...You walked in on me and you're not hurt. That's twice the use of anyone I've got.",
    ],
    after: [
      "Ines took a whole line up in one night. Nobody at the back. Hester kissed her, Piers says. Ines let her.",
    ],
    others: {
      ines: [
        "Hester sent you? Then you came past the Lantern and you're still walking. ...The slope's clear. Both? The wolves and the lancers? She'd not say it if it wasn't.",
        "Then they go up tonight. I've had them in the rocks since the new moon. ...You walked in on me and you're not hurt. That's twice the use of anyone I've got.",
      ],
    },
  },

  // ================================================================ the Long Queue (Rollo Bask; Bride Sayer)
  waiting_their_turn: {
    title: 'Waiting Their Turn',
    giver: 'bride',
    about: "Master Cobb the draper went up the rise east of the Long Queue after dark, after the tailors' dummies off his cart, with his best cloth over his arm, and never came back down. Bride Sayer wants someone up there after dark: what's standing there put down, and his cloth brought back.",
    offer: [
      "Cobb. The draper. He carried for the city's tailors: dummies, the kind you hang a coat on to sew it, roped down under a sheet. He fussed over them. He'd put their arms down for the night.",
      "A week back his sheet was flat in the morning and they were up the rise, east, standing. He went up after them at dark with his best cloth over his arm. To dress them, he said, so they'd look right going into the city. He's not come down.",
    ],
    accept: "I'll go up the rise after dark.",
    acceptLine: "East, up the rise, two hundred paces. After dark, mind. That's when he went, and that's when they stand waiting. Bring his cloth down, if it's there. Somebody should.",
    decline: 'Not tonight.',
    declineLine: "No. Nor me. I've not slept with my back to that side since.",
    journal: [
      "Cobb the draper went up the rise east of the Long Queue after dark, after his cart of tailors' dummies, and never came back. Go up there after dark, two hundred paces.",
      "Put down what's standing up the rise.",
      "Pick up Cobb's cloth from the ground round the rise.",
      "Take the cloth back to Bride Sayer at the Long Queue.",
    ],
    progress: [
      "Up the rise, east, after dark. Where Cobb went. His cloth.",
    ],
    done: [
      "Them. Standing about up there in the dark like they were waiting to be served. ...And Cobb? No. You'd have said.",
      "His best. All of it. I've never opened a load I carried, and I'll not open this. I'll take it to his tailors myself, the day the gate opens. He owed me for carriage. You have it. I'll not take money off that cart.",
    ],
    after: [
      "Bride keeps Cobb's cloth under her own sheet, folded down every night like a bed. She says the gate will open. She's the only one at the Queue who says it.",
    ],
  },

  the_long_queue: {
    title: 'The Long Queue',
    giver: 'rollo',
    about: "The Long Queue has waited twelve days at Gatewatch's toll gate, near four hundred paces north where the roads meet. The toll is paid in names now, and the clerk who wrote them ran off. Rollo Bask wants the men on the gate put down, so the Queue can go through.",
    offer: [
      "Twelve days at the front of a queue. You'd think it'd feel like something. The gate's north, where the roads meet, and men in red stood under it.",
      "They don't want money. They want names, written down, and their man who wrote them walked off with the book. So nobody goes through, and nobody goes back, because you'd lose your place. Put them down. Then we'll go through while they're finding new ones.",
    ],
    accept: "I'll open the gate.",
    acceptLine: "North, where the two roads meet. The one in front first, if you can. The rest stand about waiting to be told.",
    decline: 'Not yet.',
    declineLine: "Then I'm front of the queue a thirteenth day. It's an honour. Somebody tell my wife.",
    journal: [
      "The Long Queue has waited twelve days at Gatewatch's toll gate, north where the roads meet. The toll is paid in names now. Put down the men on the gate.",
      "Go back to Rollo Bask at the Long Queue.",
    ],
    progress: [
      "North, the gate where the roads meet. The one in front first.",
    ],
    done: [
      "Down? The gate? ...Then we go. I'll walk down the line and tell them. ...No. Wait. Mags has my flour.",
      "And I've her nails. Twelve days we've been selling each other our loads. There's nothing left to take through. We'd only turn round. ...Off a cart going west. I paid two sacks for it. I was going to give it to the gate.",
    ],
    after: [
      "Three carts went through the gate this morning, empty, to see if they could. They came back. There's a market at the Queue now. Rollo's talking about a sign.",
    ],
  },

  over_the_hill: {
    title: 'Over the Hill',
    giver: 'rollo',
    needs: 'the_long_queue',
    about: "A woman comes down to the Long Queue for bread after dark and pays in old city coin. Rollo Bask followed her once, over the hill north-east. He has a word for her: the Queue will carry for her. Three of the keep's men watch the Queue from the gorse south-east. Put two down on the way.",
    offer: [
      "There's a woman comes down to the Queue for bread. Twice a week, after dark. Pays in good coin, old city coin, and never says where from. I followed her once, over the hill north-east. Then she wasn't there.",
      "She's buying for a lot of people. Tell her the Queue's going nowhere, but it's going nowhere with a lot of carts. We'll carry, west, and nobody looks in an empty cart. Three of the keep's men sit in the gorse south-east and watch us all day. Start with them.",
    ],
    accept: "I'll go over the hill.",
    acceptLine: "South-east first, to the three in the gorse, a few hundred paces. Then north, over the hill. She'll find you. Her name's Ines. She said it once, by mistake.",
    decline: 'Not yet.',
    declineLine: "Then she buys her bread and goes, and I carry flour I've sold to Mags. We're all carrying something.",
    journal: [
      "Rollo Bask wants the woman who buys bread at the Long Queue to know the Queue will carry for her. Three of the keep's men watch the Queue from the gorse south-east: put two down.",
      "Go on north over the hill to Widow's Lee and find Ines Mar.",
    ],
    progress: [
      "South-east, the three in the gorse. Then north over the hill. Ines.",
    ],
    done: [
      "Rollo. The carter. He followed me once. He walks like a cart, too. ...You came by the gorse? Then nobody's looking at the Queue from it any more.",
      "Empty carts going west, and nobody looks in an empty cart. ...Tell him yes. No. I'll tell him myself, with the bread. The keep will send to ask where its eyes went. I'd sooner you were about when it does.",
    ],
    after: [
      "Rollo's carts go west at night now, with straw in the bottom and people under the straw. He says it's the first load he's been paid for in a month.",
    ],
    others: {
      ines: [
        "Rollo. The carter. He followed me once. He walks like a cart, too. ...You came by the gorse? Then nobody's looking at the Queue from it any more.",
        "Empty carts going west, and nobody looks in an empty cart. ...Tell him yes. No. I'll tell him myself, with the bread. The keep will send to ask where its eyes went. I'd sooner you were about when it does.",
      ],
    },
  },

  // ================================================================ Widow's Lee (Ines Mar; Oswy Holm)
  oswys_quills: {
    title: 'Feathers',
    giver: 'oswy',
    about: "Oswy Holm fletches Widow's Lee's arrows, and he's out of feathers. The harpies roosting on the slope under the Notch, near four hundred paces south-east of the Lee, drop long quills round where they sit. Pick up five, round the outside.",
    offer: [
      "I make the arrows. The sergeant shoots them. Lately I make sticks with points on, because there's no feathers. A stick with a point on goes where it likes.",
      "There's birds roost on the slope south-east, under the Notch. The big ugly ones with faces. They moult round where they sit: quills as long as your arm. Five would do me a month. The sergeant says don't go up. She says it to me. Not to you.",
    ],
    accept: "I'll fetch you quills.",
    acceptLine: "South-east, up under the Notch, four hundred paces near enough. Round the edge of the roost, where they drop them. Don't go in under them. They don't like being looked at either.",
    decline: 'Not now.',
    declineLine: "Then I'll make sticks. She'll throw them.",
    journal: [
      "Oswy Holm is out of feathers for Widow's Lee's arrows. The harpies roosting on the slope south-east of the Lee, under the Notch, drop long quills round their roost. Pick up five.",
      "Take the quills back to Oswy Holm at Widow's Lee.",
    ],
    progress: [
      "South-east, under the Notch. Round the roost. Quills as long as your arm.",
    ],
    done: [
      "Look at the length of them. ...They're warm. Were they warm when you picked them up? Don't tell me.",
      "That's a month of arrows. Two, if she misses less, and she won't. The sergeant pays for feathers. She doesn't know she does.",
    ],
    after: [
      "Real arrows. She shot one at a crow on the ridge to try it. Missed. Said it was the arrow. It wasn't.",
    ],
  },

  the_birds_go_up: {
    title: 'The Birds Go Up',
    giver: 'ines',
    about: "When anyone walks the slope under the Notch, the harpies go up off their roost south-east of Widow's Lee. That's how Ines Mar knows where her people are on the hill at night. It's how the keep's watch on the Needle knows too. Kill the roost, the queen first.",
    offer: [
      "The birds on the slope south-east, under the Notch. Whenever anyone walks the hill, they go up off the roost, and I see them from here. So I know where my people are at night.",
      "So does the Needle. I've known that a year, and kept them, because they're useful. Go up and kill them. The queen first. I'll miss them. Don't tell Oswy.",
    ],
    accept: "I'll go up under the Notch.",
    acceptLine: "South-east, under the Notch. The queen first, or the others won't come down to you. When it's done, look up. Nothing.",
    decline: 'Not yet.',
    declineLine: "Then I keep them another week, and so does the Needle.",
    journal: [
      "The harpies roosting south-east of Widow's Lee go up whenever anyone walks the hill, and the keep's watch on the Needle reads them as well as Ines Mar does. Kill the roost, the queen too.",
      "Go back to Ines Mar at Widow's Lee.",
    ],
    progress: [
      "South-east, under the Notch. The queen first.",
    ],
    done: [
      "Nothing up over the slope. Good. Now I'm as blind as they are. ...Fairer.",
      "Oswy will want the quills off the queen. Let him. A sergeant's pay. It used to be more, and it used to come from somebody.",
    ],
    after: [
      "The sky's empty over the Lee. Oswy keeps looking up at it. I keep telling him that's the point.",
    ],
  },

  the_toll_giant: {
    title: 'The Toll-Giant',
    giver: 'ines',
    needs: ['oswys_quills', 'the_birds_go_up'],
    about: "Something big stands in Widow's Notch, east of the Lee, on the only way over the ridge to the city. They call him the Toll-Giant. He takes the coats off everyone who crosses, and two sick knights stand with him. Ines Mar wants him dead.",
    offer: [
      "Widow's Notch. East, up. Something stands in it, big as a house end, with two sick knights who never fall over. Somebody called him the Toll-Giant once, and it stuck. There's no gate. There's him.",
      "Everything over the ridge goes past him. He takes coats, blankets, the boots off your feet. They come down this side barefoot on the stones. Kill him, and they'll come over in their boots.",
    ],
    accept: "I'll kill the Toll-Giant.",
    acceptLine: "East, up into the Notch. He wakes when you're a good way off. Let him come to you down the slope. It's harder for him than for you.",
    decline: 'Not yet.',
    declineLine: "Then the next line comes over in their shirts. It's nearly spring. Nearly.",
    journal: [
      "The Toll-Giant stands in Widow's Notch, east of the Lee, with two sick knights, and takes the coats off everyone who crosses the ridge. Kill him.",
      "Go back to Ines Mar at Widow's Lee.",
    ],
    progress: [
      "East, up into the Notch. The giant first.",
    ],
    done: [
      "Dead? ...Then the Notch is open. Open both ways. I've waited a year to say that.",
      "Both ways. The ones in the rocks heard you coming down. They're asking to go back over, for the ones they left inside. A year getting them out, and the first thing they want is in. ...Take it. It was our captain's. I'll want the Span watched now.",
    ],
    after: [
      "Some went back over the Notch last night, in their coats. Ines walked them to the top. She didn't try to stop them.",
    ],
  },

  down_to_the_sill: {
    title: 'A Lamp for the Dye Works',
    giver: 'ines',
    needs: 'the_toll_giant',
    about: "With the Toll-Giant dead, the Notch is open both ways. Ines Mar wants word taken to Wenna Coyle, who keeps the lamps on the Sill above the city: down the Chasm, past the Broken Span, where something red and black waits in its stumps. Put four of those down on the way.",
    offer: [
      "Past the Notch the road goes down the Chasm to the Broken Span, and over what's left of it, and on to the Sill, where you look down at the city. A woman keeps the lamps there. Wenna Coyle.",
      "Wenna lights the way down for anyone. Some of her lamps say more than that, to people inside who know how to look. Tell her the Notch is open, and to light one for the dye works. She'll know. And mind the Span. Something red and black waits in it.",
    ],
    accept: "I'll go down to the Sill.",
    acceptLine: "East, through the Notch, and down. The Span's most of the way. They stand among its stumps. Then the Sill: half an hour, near enough, and the city under you at the end of it.",
    decline: 'Not yet.',
    declineLine: "Then I'll send Oswy. Oswy can't fight. Oswy can run, which is the next best thing.",
    journal: [
      "Ines Mar wants word taken to Wenna Coyle on the Sill: the Notch is open. Down the Chasm east, put down four of what waits at the Broken Span.",
      "Go on to the Sill and tell Wenna Coyle the Notch is open, and to light a lamp for the dye works.",
    ],
    progress: [
      "Through the Notch, down past the Span. Wenna, on the Sill.",
    ],
    done: [
      "Ines. Ines Mar. She's alive, then, and still sergeant of something. ...Open? The Notch? Then the giant's dead, and you did it, by the look of you.",
      "A lamp for the dye works. I've not lit that one in four years. I kept trimming it. You don't stop. ...There. Lit. Now somebody has to walk down after it, and I'm looking at them.",
    ],
    after: [
      "The lamp for the dye works is lit at the bottom of the Sill road. Ines saw it from the ridge, Oswy says. She sat down where she stood.",
    ],
    others: {
      fv_wenna: [
        "Ines. Ines Mar. She's alive, then, and still sergeant of something. ...Open? The Notch? Then the giant's dead, and you did it, by the look of you.",
        "A lamp for the dye works. I've not lit that one in four years. I kept trimming it. You don't stop. ...There. Lit. Now somebody has to walk down after it, and I'm looking at them.",
      ],
    },
  },

  // ================================================================ the Sill (Wenna Coyle): three words into the city
  smoke_in_the_east: {
    title: 'Smoke in the East',
    giver: 'fv_wenna',
    needs: 'down_to_the_sill',
    about: "Every dusk for years a chimney smoked behind the burnt chandlery in the Cinder Quarter, where Fennick Lowe of the Pennyless feeds whoever comes to his back door. Wenna Coyle has watched it stay cold since the new moon. Go down past the burnt houses and see if he's still real.",
    offer: [
      "See there, north of the gate, the burnt part? The Cinder Quarter. You've been to his yard. The chimney in it has smoked every dusk for years. Fennick Lowe's ovens. Half the people who ever got out of that city ate at his back door first.",
      "It's not smoked since the new moon. If he's taken, I want to know before I light another lamp that sends people to his door. Go down and see. The burnt houses on the way have things in them that came up through the floors. Mind those.",
    ],
    accept: "I'll find him.",
    acceptLine: "In by the Drawbridge Gate. The Cinder Quarter's the burnt part, north of the market. You know the yard. Go in by the back, and quietly.",
    decline: 'Not into his city.',
    declineLine: "No. I'd not either, at your age. But someone should, and you're the one who comes back.",
    journal: [
      "Fennick Lowe's chimney behind the burnt chandlery in the Cinder Quarter used to smoke every dusk; Wenna Coyle has watched it stay cold since the new moon. Go down into the city and put down two of what walks the burnt houses.",
      "Find Fennick Lowe of the Pennyless in the Cinder Quarter and see if he's still real.",
    ],
    progress: [
      "The Drawbridge Gate. The burnt houses. The Pennyless. Quietly.",
    ],
    done: [
      "You. Wenna's. I said come back when you'd teeth, and you've brought them. ...Real? I'm as real as I was. My chimney's cold because his lancers learned to read it.",
      "Smoke at dusk meant bread at the back door. So they came to the back door, at dusk, and waited. Tell her no smoke means we're well. The oven's in the cellar now and the bread comes out flat. His coin. It always is.",
    ],
    after: [
      "The chimney behind the chandlery still doesn't smoke. Wenna says she's never been so glad to see nothing.",
    ],
    others: {
      ph_penny: [
        "You. Wenna's. I said come back when you'd teeth, and you've brought them. ...Real? I'm as real as I was. My chimney's cold because his lancers learned to read it.",
        "Smoke at dusk meant bread at the back door. So they came to the back door, at dusk, and waited. Tell her no smoke means we're well. The oven's in the cellar now and the bread comes out flat. His coin. It always is.",
      ],
    },
  },

  wardens_of_ash: {
    title: 'Wardens of Ash',
    giver: 'fv_wenna',
    needs: 'down_to_the_sill',
    about: "Wenna Coyle had an apprentice, Bet, who watched the Ashwardens' pyres from the Sill one night and went down to them in the morning. Go down to the Bone Yards, past the risen there, and ask Edda Grail, their warden, if Bet is any good.",
    offer: [
      "I had a girl up here once. Bet. Two winters, learning the lamps. Steady hands. One night she stood at the edge there, north, watching the pyres in the Bone Yards, and in the morning she'd gone down to them. To the Ashwardens. They burn what gets up.",
      "Edda Grail's their warden. Go down and ask her if Bet's any good. That's all. Not if she's well. If she's good. Mind the Rows on your way: what's up on that hill is up again.",
    ],
    accept: "I'll ask Edda Grail.",
    acceptLine: "The Bone Yards are the north side of the city, terraced up the hill. The charnel house is on the High Loop. Follow the smoke.",
    decline: 'Not into the Bone Yards.',
    declineLine: "No. Sensible. Bet wasn't. I liked that in her, and then I didn't.",
    journal: [
      "Wenna Coyle's old apprentice Bet went down into the city to the Ashwardens, who burn what gets up in the Bone Yards. Go to the Bone Yards, on the city's north side, and put down two of the risen there.",
      "Find Edda Grail in the Ashwardens' charnel yard on the High Loop, and ask if Bet is any good.",
    ],
    progress: [
      "The Bone Yards. Two of the risen. The charnel house on the High Loop. Edda Grail.",
    ],
    done: [
      "Wenna Coyle? Out with it, then. Is she dead? ...No? She wants to know if Bet's good?",
      "Ha! She's the best I've got. She lights the pyres. First go, every one, in the rain. Tell Wenna she taught her that, and she can't have her back. She'll laugh. Let her. A warden's pay for a warden's message.",
    ],
    after: [
      "Wenna laughed. Then she went down the Sill road and trimmed every lamp on it twice.",
    ],
    others: {
      ph_ash: [
        "Wenna Coyle? Out with it, then. Is she dead? ...No? She wants to know if Bet's good?",
        "Ha! She's the best I've got. She lights the pyres. First go, every one, in the rain. Tell Wenna she taught her that, and she can't have her back. She'll laugh. Let her. A warden's pay for a warden's message.",
      ],
    },
  },

  // (Ser Hale's once, from the Bell Tower, a walk of 7.7 km; its words are kept, of Ines's watch now, and the ending Maud
  // Treller had in her mouth and never said is said.)
  quiet_men: {
    title: 'Quiet Men',
    giver: 'fv_wenna',
    needs: 'down_to_the_sill',
    about: "When the city fell, some of its watch rode out with Ines Mar and some stayed, took up honest trades and kept a promise in the dark. Wenna Coyle has lit their lamp. Go down past the Drowned Wharf to the dye works on the Tanners' Steps and tell its captain the oath still holds.",
    offer: [
      "When the city fell, not all of Ines's watch rode out. Some stayed. Put down their arms, took up honest trades, and kept a promise in the dark. She's not heard from them in four years. I light their lamp, and nobody lights one back.",
      "There's a dye works on the Tanners' Steps, the city's south side, by the water. Ask for the captain. Tell her the oath still holds. Say nothing else, and say it to nobody else. The Wharf's on your way. Something lives under it now.",
    ],
    accept: 'I can carry that.',
    acceptLine: "In by the Drawbridge Gate, then south, past the Rookeries, to the water. The Wharf first, and what's under it. Then the Tanners' Steps: follow the stink. Whatever you see in that yard, it's a dye works. Remember that.",
    decline: "That's not my promise.",
    declineLine: "No. It's Ines's. And a little mine, for the lamp. I'll find another way. There's never another way.",
    journal: [
      "Some of the city's watch stayed when it fell, and kept a promise in the dark. Go down into the city, south to the Drowned Wharf, and put down two of what lives under it.",
      "Find the captain of the dye works on the Tanners' Steps, Maud Treller, and tell her the oath still holds.",
    ],
    progress: [
      "The Wharf. Then the Tanners' Steps. The dye works. The captain. Nothing else.",
    ],
    done: [
      "A message? Not at the gate. By the vats, where the steam covers what's said. ...It holds. Does it. Four years we've had nothing, and now a stranger walks in with madder on their boots and says it holds.",
      "Ines. She got out, then. Stand, the dyers are watching. Take this, it's for your road. Tell her: fifteen. Tell her we're fifteen.",
    ],
    after: [
      "Fifteen. Still fifteen. Ines says she'd have taken five.",
    ],
    others: {
      ph_watch: [
        "A message? Not at the gate. By the vats, where the steam covers what's said. ...It holds. Does it. Four years we've had nothing, and now a stranger walks in with madder on their boots and says it holds.",
        "Ines. She got out, then. Stand, the dyers are watching. Take this, it's for your road. Tell her: fifteen. Tell her we're fifteen.",
      ],
    },
  },

  // ---------------------------------------------------------------- the Outwall: Wenna's word down to Ashfold
  the_ash_road: {
    title: 'The Ash Road',
    giver: 'fv_wenna',
    needs: 'down_to_the_sill',
    about: "Wenna Coyle's lamp-wicks are soaked in lye from Ashfold, the ash-gatherers' yard on the Outwall under the north gate. The ash hasn't come up in a month. Go down past the Old Delf and ask the ash-reeve, Hode Callow, why.",
    offer: [
      "My wicks want lye, and the lye wants ash, and the ash comes from Ashfold, down on the Outwall under the north gate. Hode Callow sends a sack up every new moon. Not this one. Not the last one.",
      "Go down and ask him. The Delf Way goes past the old stone-cutting on the way, and something's living in it that throws rocks. Take the Carrion Steps down off the causeway and keep to the path.",
    ],
    accept: "I'll go and ask him.",
    acceptLine: "Down the steps by the carrion, then the Delf Way north. Hode's the old one counting sacks. If he's not counting sacks, something's wrong.",
    decline: 'Buy your ash elsewhere.',
    declineLine: "There is no elsewhere. There's Ashfold. I'll burn tallow, then. It smokes.",
    journal: [
      "Wenna Coyle's lye-ash hasn't come up from Ashfold in a month. Take the Carrion Steps down off the causeway and the Delf Way north, and put down four of what's in the Old Delf.",
      "Find Hode Callow, the ash-reeve of Ashfold, under the north gate, and ask him about Wenna's ash.",
    ],
    progress: ["The steps, the Delf, then Ashfold. Hode's the one counting."],
    done: [
      "Wenna's sack? It went up the Delf Way with the boy at new moon. The boy came back without it. So that's where it went: whatever's in the Delf has my sack and Wenna's lye, and I suppose you've put a few of them down.",
      "Here. And tell her she'll have two next month. If you're stopping, I've work. The city's dead won't stay lying down on the burning ground, and I've nobody to send.",
    ],
    after: ["Two sacks up to the Sill, new moon. I'll send them by the road. The long way."],
    others: {
      out_reeve: [
        "Wenna's sack? It went up the Delf Way with the boy at new moon. The boy came back without it. So that's where it went: whatever's in the Delf has my sack and Wenna's lye, and I suppose you've put a few of them down.",
        "Here. And tell her she'll have two next month. If you're stopping, I've work. The city's dead won't stay lying down on the burning ground, and I've nobody to send.",
      ],
    },
  },

  // ---------------------------------------------------------------- Ashfold (Hode Callow; Nell Sallow)
  the_pyre_ground: {
    title: 'The Pyre Ground',
    giver: 'out_reeve',
    about: "On the Pyre Ground east of Ashfold, the city's dead are sitting up on the flags before they're lit. The keepers have stopped going near. Put four of the ash-walkers down so the burning can go on.",
    offer: [
      "The keepers lay them out in rows on the Pyre Ground and light them at dusk. Lately, a row sits up first. Then it walks. Ash-walkers, Nell calls them. They don't go anywhere. They just stand on the flags, waiting to be lit.",
      "No burning, no ash. No ash, no lye, no leather, and the Hithe goes hungry. East along the ditch, under the gate. Four of them down, and the keepers will do the rest.",
    ],
    accept: "I'll put them down.",
    acceptLine: "East along the Ditch Road, then the Pyre Path. You'll see the fire. Don't stand in it.",
    decline: 'Burn them yourself.',
    declineLine: "I've tried. They don't stand still for it. That's the trouble.",
    journal: [
      "The dead on the Pyre Ground east of Ashfold are getting up before they're burnt. Put down four of the ash-walkers.",
      "Go back to Hode Callow at Ashfold.",
    ],
    progress: ["East, the Pyre Path. Four of them."],
    done: [
      "Four. The keepers saw. They're laying the rows again already, and this time they're tying the feet. I don't ask. I count.",
      "For your trouble. Ash is ash. It doesn't care whose it was. I try not to care either. Some days that's harder.",
    ],
    after: ["They light at dusk again. Rows and rows. The carts are full."],
  },
  white_ash: {
    title: 'White Ash',
    giver: 'out_nell',
    about: "Nell Sallow drives the white ash, the finest, from the heart of the pyres to the tanners at the Hithe. Nobody will go out on the Pyre Ground to sack it now. Bring her five sacks of it.",
    offer: [
      "The white ash is the heart of the fire. Clean as snow. The tanners won't have anything else for the fine hides, and Joss Harrow's had grey off me three weeks running. He's too polite to say so. He makes a face.",
      "The keepers leave it sacked at the pyres' ends, and none of us will go and fetch it while those things are standing about. Five sacks. You'll find them in the ash.",
    ],
    accept: "Five sacks. I'll fetch them.",
    acceptLine: "At the ends of the pyres. White sacks. If it's grey, it's not mine, and if it's moving, it's not ash.",
    decline: 'Not ash. Not today.',
    declineLine: "Grey again, then. He'll make the face.",
    journal: [
      "Nell Sallow wants the white ash the keepers sacked at the ends of the pyres on the Pyre Ground. Bring her five sacks.",
      "Take the sacks back to Nell Sallow at Ashfold.",
    ],
    progress: ["White sacks. Five. Pyre Ground."],
    done: [
      "That's it. That's the good stuff. Look at it, it squeaks. Joss will weep. He won't, but his face will do something new.",
      "Here. And if you're ever at the Hithe, tell Joss the white came by somebody else's hand, so he knows I didn't go out there.",
    ],
    after: ["White ash to the Hithe. He made a new face. I think it was a smile."],
  },
  the_middens: {
    title: 'The Middens',
    giver: 'out_reeve',
    needs: 'the_pyre_ground',
    about: "Everything the city throws out ends up on the Middens, east under the north cliff, and now spiders the size of carts have taken the heaps. Ashfold's rag-pickers won't go out. Put down four of them, the red mother among them.",
    offer: [
      "East, past the gate, under the cliff: the Middens. Every broken crate and every bad barrel and every bone the knackers don't want. The rag-pickers live off it. Lived. The spiders came up out of the heaps in the summer.",
      "There's one bigger than the rest, red. The pickers say it's the mother. Put her down, and three of hers, and the pickers can go back to their heaps. I've three families eating out of my sacks while they can't.",
    ],
    accept: "I'll clear the heaps.",
    acceptLine: "Along the Ditch Road east, past the north gate, under the cliff. The heaps are the hills that smell. The red one first. She'll come.",
    decline: 'Spiders. No.',
    declineLine: "No. Nor me. That's why I asked you.",
    journal: [
      "Spiders have taken the Middens, the city's rubbish-heaps under the north cliff east of the gate. Put down four of them, the red mother among them.",
      "Go back to Hode Callow at Ashfold.",
    ],
    progress: ["The Middens, east past the gate. The red one."],
    done: [
      "The pickers saw you go up the heaps from the road. They came running back to say. They've gone out already with their hooks. There's a lot of city in those heaps that the city doesn't know it threw away.",
      "This came out of the heaps last year. Somebody's, once. Yours now. Then go south. The Hithe needs a hand more than I do.",
    ],
    after: ["The pickers are back on the heaps. They found a door. A whole door. They're very pleased."],
  },
  the_lazar_house: {
    title: 'The Lazar House',
    giver: 'out_reeve',
    about: "The lazar house stands where the north arm of the Ditch Road gives out, east past the Middens: the city put its lepers there, when it kept any. Its dead have got up in plate, and something in a robe walks with them. Put three of them down.",
    offer: [
      "There's a house at the end of the north road, past the Middens, where the road gives up. The lazar house. The city sent its lepers there, back when it sent them anywhere. The last of them died in the winter. I carted them myself. Wrapped, the way you do.",
      "Except they're up. Not in their wraps. In plate, black and red, walking the yard inside the wall, and something in a robe walking with them. I want them back in the ground. Three will do for a start.",
    ],
    accept: "I'll go to the lazar house.",
    acceptLine: "The north road, east, past the heaps. Where it stops, that's their wall. Go in at the gate. Don't drink from the well.",
    decline: 'Not the lazar house.',
    declineLine: "Nobody goes. That's what it was built for.",
    journal: [
      "Hode Callow says the lepers buried at the lazar house, at the end of the north road east of the Middens, are walking again in plate. Put down three of them.",
      "Go back to Hode Callow at Ashfold.",
    ],
    progress: ["The lazar house. The end of the north road. Three of them."],
    done: [
      "Three. I'll go out with the cart tomorrow and wrap them again. Properly, this time, and nothing in a robe walking behind me.",
      "Here. That's out of the ash-tithe. Nobody else was ever going to spend it on lepers.",
    ],
    after: ["The lazar house is quiet. I put a lamp on its wall. Somebody should."],
  },
  round_to_the_hithe: {
    title: 'Round to the Hithe',
    giver: 'out_reeve',
    needs: 'the_middens',
    about: "Hode Callow's ash goes to Tanners' Hithe, under the south gate, the long way round outside the wall. Something in the Sump has turned the eel-traps over and taken the road there. Go round, put it down, and tell Joss Harrow the white ash is coming.",
    offer: [
      "The Hithe is the other side of the city: south gate, by the Leat. Nell takes the long way round, back west past the causeway's foot and down past the fields to the Sump, because nothing outside the wall gets in through the city.",
      "Something in the Sump came up on the path last week and turned her cart. Put it down, and go on to Joss Harrow at the Hithe. Tell him the white ash is coming. He'll have work. He always has work.",
    ],
    accept: "I'll go round.",
    acceptLine: "West along the ditch, under the causeway, and south. Past the fields, round the Sump. Joss is the one with the arms.",
    decline: 'Not the long way.',
    declineLine: "There's no short way. There's the city. You'd not like the short way.",
    journal: [
      "Something in the Sump, at the end of the Leat, has been coming up on the road round to Tanners' Hithe. Go round the Outwall by the Ditch Road and put down two of what's in the Sump.",
      "Find Joss Harrow, master of Tanners' Hithe under the south gate, and tell him the white ash is coming.",
    ],
    progress: ["West, south, past the fields. The Sump. Then the Hithe."],
    done: [
      "White? Nell's white? Then I can finish the fine hides. And you came round by the Sump, did you. Not many come that way twice.",
      "Here. And stop, if you've a strong stomach. The Hithe has troubles the Sump only starts.",
    ],
    after: ["White ash. Proper white. You can see your face in a hide."],
    others: {
      out_tanner: [
        "White? Nell's white? Then I can finish the fine hides. And you came round by the Sump, did you. Not many come that way twice.",
        "Here. And stop, if you've a strong stomach. The Hithe has troubles the Sump only starts.",
      ],
    },
  },

  // ---------------------------------------------------------------- Tanners' Hithe (Joss Harrow; Agna Ruddock)
  the_far_row: {
    title: 'The Far Row',
    giver: 'out_tanner',
    about: "Two of Joss Harrow's men went into the far row of the tan pits in the spring and climbed out in the autumn. They walk the yard by night, and they've brought others up with them. Put three of the drowned tanners down.",
    offer: [
      "The far row's the old pits. Deep, and nobody's emptied them since my father's day. Two of my men went in, in the spring. A rope went. In the autumn they came out, with the hides they'd gone in for still in their hands.",
      "There's more than two now. They come out of the liquor at night and work. Flesh hides. Turn them. They're good at it. That's the worst of it. Put three of them down. I'll pay, and I'll say a word for them.",
    ],
    accept: "I'll put them down.",
    acceptLine: "East along the Leat, past the bridge: the pits, in rows. The far row's the dark one. They don't come out by day unless you lean over.",
    decline: 'Not into the pits.',
    declineLine: "Nobody goes into the pits. That's the rule. It was the rule before, too.",
    journal: [
      "Joss Harrow's drowned tanners climb out of the far row of the tan pits east of the Hithe. Put down three of them.",
      "Go back to Joss Harrow at Tanners' Hithe.",
    ],
    progress: ["The pits. The far row. Three of them."],
    done: [
      "Three. I'll have the row filled in. Lime and rubble, and a stone over it with their names, though I'll not cut the names. They'd not want it known they were tanners.",
      "Here. You've earned it, and the yard's quieter for it. One more thing, and it's a big one, and then I'll stop asking.",
    ],
    after: ["The far row's filled. We work the near rows. It's enough."],
  },
  agnas_traps: {
    title: "Agna's Traps",
    giver: 'out_agna',
    about: "Agna Ruddock has laid eel-traps in the Sump for sixty years. Something big has been turning them over and scattering them in the reeds. Bring her five of them back.",
    offer: [
      "Something in the Sump's taken against my traps. Wicker, bark-tied, my man made the first and I've made the rest. It turns them over and pulls them into the reeds and leaves them. It doesn't even eat the eels. It's spite.",
      "Five of them. In the reeds round the water, west of here. I'd go, but my knees went in first, years ago, and the rest of me's waiting for them to come back.",
    ],
    accept: 'Five traps. I can find them.',
    acceptLine: "In the reeds. Mind the water. Mind what's in the water more.",
    decline: 'Not in the reeds.',
    declineLine: "No. Nor anyone. I'll weave new. It takes a winter.",
    journal: [
      "Agna Ruddock's eel-traps have been dragged into the reeds round the Sump, west of the Hithe. Bring her five of them.",
      "Take the traps back to Agna Ruddock at Tanners' Hithe.",
    ],
    progress: ["Five traps. The Sump's reeds."],
    done: [
      "That's his. The first one, my man's. I knew it by the knot. You found it. Sit a moment. No? No. Nobody sits.",
      "Here. It's eel money. It spends the same.",
    ],
    after: ["Five traps in. Three eels this morning. And a boot, but it was a good boot."],
  },
  the_lime_burnt: {
    title: 'The Lime-Burnt',
    giver: 'out_tanner',
    needs: 'the_far_row',
    about: "The lime-burners at the Limekilns, east under the south cliff, went quiet a month ago. Something huge has kept the kilns lit since, and goat-men stoke them. Without lime the Hithe stops. Put it down, and three of what serves it.",
    offer: [
      "No lime, no hair off a hide, no leather. And my lime's from the Limekilns, east, under the cliff past the south gate: three kilns in a bank, and six burners. The burners went quiet a month back. The kilns didn't.",
      "Something big's been keeping them hot. Goat-men carry the chalk in for it. My boy went to look and came back white to the eyes. Put it down, and three of the goats. Then I can buy lime from men again.",
    ],
    accept: "I'll go to the kilns.",
    acceptLine: "East along the Ditch Road, past the south gate, and up the Kiln Track. You'll see the smoke. You'll smell it before that.",
    decline: 'Buy your lime elsewhere.',
    declineLine: "There's nowhere else. There's the kilns. I'll close the pits.",
    journal: [
      "Something huge has taken the Limekilns, east under the south cliff past the gate, and goat-men stoke the kilns for it. Put it down, and three of what serves it.",
      "Go back to Joss Harrow at Tanners' Hithe.",
    ],
    progress: ["The Kiln Track, east past the south gate. The big one."],
    done: [
      "The burners are back. Two of them. They'd been hiding in the chalk-cave behind the bank, the whole month, eating chalk, near enough. They'll have the kilns cold by tonight and lit again by morning, properly.",
      "This was the master burner's. He gave it me for you. He says it's warm. He says it's always been warm. Then one more errand, and it's into the city, and it's not for me.",
    ],
    after: ["Lime by the cart. The pits are full. It's a good smell, if you know what it means."],
  },
  the_knackers: {
    title: "The Knackers' Yard",
    giver: 'out_tanner',
    about: "Joss Harrow's hides start at the knackers' yard, where the south arm of the Ditch Road gives out, east past the Limekilns. The knackers are gone. Goblins boil what's in the pens, and a wolf that walks on two legs eats what they leave. Put three of them down.",
    offer: [
      "Every hide I tan starts at the knackers' yard. The end of the south road, east, past the kilns. Dead horses in; hides, bone and glue out. Old Pell and his boys ran it. Pell's gone.",
      "Goblins have the yard now. They boil what's in the pens, and they're not particular what's in the pens. There's a wolf with them that walks on two legs and eats what they don't. Put three of them down.",
    ],
    accept: "I'll clear the yard.",
    acceptLine: "The south road, east, past the kilns, to where it stops. You'll smell it before you see it. You'll smell it after, too.",
    decline: 'Not the knackers.',
    declineLine: "No. Nobody likes the knackers. Not even the goblins, by the look of it.",
    journal: [
      "Goblins and a wolf on two legs hold the knackers' yard at the end of the south road, east of the Limekilns. Put down three of them for Joss Harrow.",
      "Go back to Joss Harrow at Tanners' Hithe.",
    ],
    progress: ["The knackers'. The end of the south road. Three."],
    done: [
      "Three, and the wolf. Good. I'll send the boys for what hides are left. Pell would have wanted them used.",
      "Here. And leather, when it's cured. Not now. In a year.",
    ],
    after: ["There's a new knacker. Pell's nephew. He doesn't talk either."],
  },
  cured_hides: {
    title: 'Cured Hides',
    giver: 'out_tanner',
    needs: 'the_lime_burnt',
    about: "Joss Harrow sells his hides to the dye works on the Tanners' Steps, inside the south gate, and to nobody else. He wants its captain told, word for word: the Hithe's hides are cured, and there are twelve.",
    offer: [
      "The dye works on the Tanners' Steps buys every hide I cure. In by the Water Gate, up the steps, the yard with the vats. Ask for the captain. Not the foreman. The captain.",
      "Tell her this, and only this: the Hithe's hides are cured, and there are twelve. She'll know. If anyone else asks, you're selling leather.",
    ],
    accept: "Twelve hides. I'll tell her.",
    acceptLine: "The Water Gate's just east. Up the Tanners' Steps. The captain. Twelve. That's all.",
    decline: 'Not my business.',
    declineLine: "No. It's hers. And mine, a little. I'll send Nell. She'll forget the number.",
    journal: [
      "Joss Harrow of Tanners' Hithe has a word for the captain of the dye works on the Tanners' Steps, in at the Water Gate: the Hithe's hides are cured, and there are twelve.",
    ],
    progress: ["The Water Gate. The Tanners' Steps. Twelve."],
    done: [
      "Twelve. Harrow said twelve? ...He's had them in the pits all this time. Under the hides. Twelve good blades, cured in lime, and not a spot of rust, I'll wager. The old fox.",
      "Not here. By the vats. Take this, for the walk. And if you go back that way, tell him: the dyers will fetch the hides on a dark night. He'll know which.",
    ],
    after: ["Twelve. And fifteen. It's beginning to be a number."],
    others: {
      ph_watch: [
        "Twelve. Harrow said twelve? ...He's had them in the pits all this time. Under the hides. Twelve good blades, cured in lime, and not a spot of rust, I'll wager. The old fox.",
        "Not here. By the vats. Take this, for the walk. And if you go back that way, tell him: the dyers will fetch the hides on a dark night. He'll know which.",
      ],
    },
  },
};
