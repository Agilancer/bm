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
};
