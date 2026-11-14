// What Homunculus says to the great axe on its rack, and what it says back. He says his part aloud as he goes to it with
// his rag (src/folk/brain.js `forge`); the axe's is a balloon of its own, over the rack, a breath after.
//
// The axe is Varrow's, out of VELSCOUR (src/data/homunculus.js there): Varrow the Rimebound, Knight of the Pale Rune, a
// death knight shut in it under seven chains. Homunculus found it on the wall of the forge he took in Herrington Hollow,
// two hundred years ago, with a note that said DO NOT; took the note down; has polished it and wished it good morning
// every day since; and has not aged a day, which he puts down to clean living. He took the voice in it for the Light, and
// then for a saint. It could have had him any night of those two hundred years. It hasn't, because he says good morning.
//
// Each entry: [his, the axe's (or null)].
export const AXE_SAID = {
  // First thing, every day.
  morning: [
    ["Good morning, Saint Varrow! You look well. You always look well.", "...good morning... smith..."],
    ["Good morning, Saint Varrow. Two hundred years, and not one morning missed.", "...I have counted them... also..."],
    ["Rise and shine, Saint Varrow! Well. Shine. You need not rise.", "...I cannot... rise... we have spoken of this..."],
    ["Good morning, old friend. The sun is up. I allowed it. So did you.", "...it was... not my doing..."],
    ["Good morning, Saint Varrow! Did you sleep? You never say.", "...I do not... sleep... good morning..."],
    ["Good morning! The grass by your rack has frozen again. A blessing. I shall tell the reeve it is a blessing.", "...it is... the cold... it is always the cold..."],
  ],
  // And when he comes back to it in the day.
  day: [
    ["A little rust is a little sin, Saint Varrow. Hold still.", "...I am... an axe... I hold still..."],
    ["The children asked for a ride on you again. I said you would think on it.", "...once... I said... once..."],
    ["Seven chains they had on you, in the Hollow. And a note. DO NOT. Very rude. I took the note down.", "...he took... the note... down..."],
    ["Bellmourn is not the Hollow, I know. But the iron here is honest, and nobody has chained you to anything.", "...it is... adequate..."],
    ["Verdict is jealous of you. I have told him a hammer and an axe are different callings.", "...the hammer... is right... to be afraid..."],
    ["Do you still want the vessel? The bucket is right there. I have kept it dry for you.", "...not... a bucket... two hundred years... not a bucket..."],
    ["They say there is a demon on a throne under that church. You would know. You are well read.", "...do not... go down there... smith..."],
    ["I have been thinking of your hymn. The low part is very low.", "...all the parts... are low..."],
  ],
  // The rag put away, standing back to look.
  after: [
    ["There. You could see a saint's face in that.", "...you could see... yours..."],
    ["Not a day older, either of us. Clean living, Saint Varrow. Faith, and forearms.", "...it is not... the forearms..."],
    ["Done. Gold star for the week. That is fifty-two this year.", "...I have... kept them all..."],
    ["There. Rest now. I will be at the anvil, where you can see me.", null],
    ["Beautiful. I say it to Patience too. Do not tell her I said it to you first.", "...I will not... tell... the anvil..."],
    ["Shining. Like the Light itself. A little greener. Humbler.", null],
  ],
};
// The axe, on its own, to nobody, when the yard's empty of him and someone stands near it. (src/folk/talk.js)
export const AXE_ALONE = [
  "...so warm... the living...",
  "...he says... good morning... every morning...",
  "...I am Varrow... remember it...",
  "...two hundred years... he has not noticed...",
  "...he polishes... too much...",
  "...do not... tell him... he is happy...",
  "...winter... is patient...",
];
