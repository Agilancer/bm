// Lisandra in Bellmourn, after the walk down: where the Long Road comes into town, she stands and looks at everyone looking
// at her. Lovely to you by day, the crone to you by night (src/core/opening.js prettyShown); the crone to everyone else.
// Her quest sends you round the town to everyone with work to give, to start each of their quests (src/folk/quests.js RULES).
// Facts agree with src/core/opening-script.js and tools/folk/cast.md (Old Lis).

export const LISANDRA = { id: 'lisandra', name: 'Lisandra', title: 'late of a cave up the Long Road', age: 300 };

// Everyone in the town with work to give: Lisandra's quest wants a quest taken from each (the Bellwright is reached by
// Corran's, out past the town).
export const GIVERS = ['bram', 'silas', 'homunculus', 'tamsin', 'corran', 'orrin', 'cedric', 'hob', 'sabine', 'aldric', 'jory'];

export const LINES = {
  lisandra: {
    first: [
      "Stop there a moment. I've a word for you before you go in.",
    ],
    greet: {
      morning: [
        "Morning. I slept in a hedge. Don't ask how it was. It was a hedge.",
        "First light. The baker's been out twice to look at me. Neither time did she bring bread.",
      ],
      day: [
        "Go on, then. I'm only standing here. It's what I do now, it seems.",
        "Half the town's found a reason to walk past me. The other half's watching from behind its curtains.",
      ],
      evening: [
        "Lamps are coming on. Mind the pines tonight. The dead don't keep my hours.",
        "Sun's going. Look at me while you can.",
      ],
      night: [
        "Don't stare. It's the dark. Everyone looks older in the dark.",
        "You see the crone too, by night. I'd hoped you'd be spared that. Nobody else is.",
      ],
    },
    about: [
      "Lisandra. I had a cave, a ledger and a great many candles. Now I have you.",
      "Old Lis, they call me down there. To my face, only the children. I cuffed one this morning. He'd brought a frog.",
    ],
    ask: {
      lis: [
        "What about me? I'm standing in a road. Ask me something useful.",
        "I've been coming down here twice a year since before the inn had a sign. They still cross the street.",
      ],
      tessariels: [
        "Twelve came before you, in borrowed armour, and every one of them made a speech. You haven't made one yet. Keep that up.",
        "Who told them they were Tessariel? Couldn't say. Somebody with very poor judgement and very good cheekbones.",
      ],
      town: [
        "Bellmourn. Named for a bell nobody rings. It rings itself now, at midnight, and nobody's said thank you.",
        "Small, poor, and frightened. Which makes it the best town in Eldravayne to be useful in.",
      ],
      dead: [
        "The pines are full of them. Keep to the road after dark, and if one gets up out of the ground near you, don't stop to be polite.",
      ],
      knight: [
        "The black one at the cathedral? Not yet. Not with that staff, and not on your first day.",
      ],
    },
  },
};

export const QUESTS = {
  lisandra_work: {
    title: 'Known in Bellmourn',
    giver: 'lisandra',
    giverName: 'Lisandra',
    offer: [
      "There it is. Forty roofs, one well, and the Dark Lord's cathedral looking down on all of it. You're not ready for that hill. You're not ready for his knight. You're ready for Bellmourn.",
      "Nobody follows a prophecy, {name}. They follow whoever mended their roof. So be useful. Everyone in that town with a trouble worth the name: find them, and take it off their hands. That's how you'll learn what your own can do.",
      "Start with Bram Kettle at the inn. He counts strangers, so let him count you. Then the rest. You'll know them. They're the ones looking at you as if you might be the answer to something.",
    ],
    accept: "I'll find them.",
    acceptLine: "Good. I'll be here, being stared at. Come back when every one of them has given you something to do.",
    decline: 'Not yet.',
    declineLine: "The other twelve said 'not yet' too. Ask Bram where they are now.",
    journal: [
      "Lisandra wants Bellmourn to owe you. Find everyone in town with work to give, and take on some of it from each of them.",
      "Everyone in Bellmourn with work to give has given you some. Go back to Lisandra, where the Long Road comes into town.",
    ],
    progress: [
      "Still here? I can count, {name}. That's not all of them.",
      "Bram's at the inn. Silas is the one who smells of pine and doesn't blink. Off you go.",
      "Ask around. In a town this size, everyone's trouble is everyone's business.",
    ],
    done: [
      "There. Look at them. Half the town's watching the road for you now instead of watching me. That's worth more than a cave.",
      "Here. For your trouble. Don't ask where I had it. I've lost my home; I'm allowed a purse.",
    ],
    after: [
      "Every one of them asks after you. Not one asks after me. I'd be hurt, if I weren't delighted.",
    ],
    others: {
      bram: ["The old woman sent you round? Twenty years of salt and insults, and she's never once sent anyone anywhere but away."],
    },
  },
};
