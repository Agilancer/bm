// Past the town: the Bellwright's lines, and the quests that send you out into the land (src/core/lands.js). Their workings
// are in src/folk/quests.js RULES, beside the starter eight. Bible: tools/folk/cast.md, "Beyond Bellmourn".
// The Bellwright is Tessariel's (a T): nothing of his is ever put near the church, the black knight's door or Blackvigil, he
// never goes west, and no Ashby speaks of him (the two-letter rule, cast.md).

// Who's out there to talk to (src/ui/folk.js adds them after the town's people).
export const BEYOND = [
  { id: 'bellwright', name: 'Ser Anselm Toller', title: 'the Bellwright, at the Tower of the Four Watches', age: 64 },
  // Ser Hale Orrowick, a Millhaven ploughman who swore himself a fifth watch at the Bellwright's door, in harness pieced
  // together from what the fallen claimants left on the downs. His body is the knight in TOWN_KNIGHTS flagged `hale`
  // (src/core/knights.js); at: where he stands till that knight's there. His lines and his quests: src/folk/lines/land.js.
  { id: 'hale', name: 'Ser Hale Orrowick', title: 'Paladin of the Fifth Watch', age: 36, at: [2436, -530.4] },
];

export const LINES = {
  bellwright: {
    first: [
      "Stop there. Let me see your hands. No sword. No sunburst. A staff, and something in the other hand that looks back. Well. The seal by my door woke when you came over the rise. First time in forty years.",
      { after: 'quest:not_for_the_barley', say: "Up from Millhaven. Abel Fenwick sends somebody up this knoll every quarter-day, and it is always about barley. Let me see your hands. ...Well. The seal by my door woke when you came over the rise. First time in forty years." },
    ],
    greet: {
      morning: [
        "First light. Fourth watch done. I count them still, with nothing to ring.",
        "You came back. The road from Bellmourn is long. I walked to Millhaven and back in a day, when I had knees.",
      ],
      day: [
        "No watch by day. The bells want oil whether they ring or not. Hold the ladder, or stand out of the light.",
        "Nothing on the downs but sheep and Millhaven's smoke. That is a good day.",
        { after: 'what_answers', say: "When the wind's right I hear the abbey's bell-cote answer. It's only the wind. I listen anyway." },
      ],
      evening: [
        "First watch. I rang it myself, once, a boy on the rope, and the barrow moor lay down.",
        "Sun's going. Don't be on the fen after dark. The jellies come up out of the water to feel the warm.",
      ],
      night: [
        "Third watch. The worst one. Sit inside the door, where the stone is.",
        "Second watch. Count with me. One. That's all there is to it, now.",
      ],
    },
    about: [
      "Anselm Toller. Sworn to the Four Watches at fourteen. The order's me, now, and the tower, and four bells I'm not to ring.",
      "They call me the Bellwright on the downs. A bellwright makes bells. I've never made one. I keep them. Nobody asked me about the name.",
    ],
    ask: {
      tessariels: [
        "Two of them came over the knoll this summer, in silver, singing. The seal didn't stir for either. One asked me to kneel. I was oiling a bearing.",
      ],
      knight: [
        "Not on my hill. Ask the town.",
      ],
      dead: [
        "Four bells rang the watches here, and every house of the order answered, and the dead kept their beds. Then the ringing was forbidden. You've seen how they keep them now.",
      ],
      lis: [
        "Old Lis? An old woman came up the knoll at noon, years back, and asked if the bells were still hung. I said yes. She said good.",
        "There was a lady on the downs road that same night. Young. Lovely. Asked the very same thing. I've thought about that since.",
      ],
    },
    topics: { watches: 'The Four Watches?', seals: 'The seals?' },
    bye: [
      "Go on, then. Keep the road under you.",
      "If you see Millhaven's miller, tell him the tower still stands. He worries.",
    ],
  },
};
// (The two topics only he answers.)
LINES.bellwright.ask.watches = [
  "Four watches of the night, four bells hung here to ring them, and the abbey, the chapel and the shrine answering each. The order kept them. Forty years ago someone said stop, and we stopped.",
  "The tenor's the oldest. Cast in Bellmourn, in a pit on the green, when Bellmourn was a crossroads. The dead remember where it was cast. That's why they keep out of the town.",
];
LINES.bellwright.ask.seals = [
  "Rings of pale stone, one at each house of the order and one by every road worth keeping. Stand on one that's woken and you can step to any other. They woke for wardens. Then, forty years, for no one.",
  "They wake for you. I don't know what that makes you. I know what it doesn't make you: one of the singing ones.",
];

export const QUESTS = {

  // (Orrin Vey's climb to the Crown of Teeth is Isla Crag's now, at the Broken Stair: src/folk/lines/regions/deepwood.js.)

};
