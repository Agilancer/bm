// Phobos's people meeting each other: who they are to each other, and what they say when they stop (tools/phobos/crowd_lines_brief.md).
// Keyed 'idA|idB' (either order is looked up). Each pair: what they are to each other, and two to four exchanges, each a mood
// and its lines, alternating A, B, A, B...: [text, gesture]. Gestures: talk, laugh, nod, agree, angry, rant, complain, point, wave, bow, hug, sob, cheer, afraid, scratch.
export const MEETS = {
  // ---- Chainmarket ----
  'ph_bun|ph_cleaver': { are: 'neighbours on facing sides of a Chainmarket lane, forever squabbling over the gutter', talk: [
    { mood: 'argue', lines: [["Hob Gristle, your gutter's running pink into my doorstep again.", 'complain'], ["It's a gutter, Dora. Things run in it. That's the whole idea of a gutter.", 'angry'], ["Not blood! I had a woman ask was my rye a meat loaf.", 'rant'], ["Then sell her one. Fourpence, and I'll throw in the trimmings.", 'point']] },
    { mood: 'gossip', lines: [["Did you see the Loyal take the cooper's boy off the gibbet steps?", 'afraid'], ["Saw it. Said nothing. That's how a man keeps a shop open, Dora.", 'nod'], ["You said nothing very loudly. You dropped a whole side of mutton.", 'point'], ["Slipped. My hands were greasy. Don't you go telling it any other way.", 'scratch']] },
    { mood: 'joke', lines: [["Your loaves are hard enough to stun a pig, you know. I could use them.", 'laugh'], ["And your sausages could hold a door shut. We'd make a fine wall between us.", 'laugh'], ["We've got one. It's called the gutter.", 'point']] },
  ] },
  'ph_bun|ph_pie': { are: 'the old baker and the girl she taught, who now sells her own pies off a tray', talk: [
    { mood: 'argue', lines: [["Rosie Crust. That's my crimp on your pastry, girl. Nine years I showed you that crimp.", 'point'], ["And seven of them you had me scrubbing tins, Dora. I earned the crimp.", 'complain'], ["You earned a thank-you, is what you earned. Not half my lane's custom.", 'angry'], ["They come to me because I walk to them. Your oven doesn't have legs.", 'laugh']] },
    { mood: 'comfort', lines: [["You look done in, love. Are they working you at that tray?", 'talk'], ["Strap's rubbed me raw. And a soldier took three pies and said he'd pay Thursday.", 'sob'], ["They all pay Thursday. Thursday never comes. Come round, I've goose fat for that shoulder.", 'hug'], ["You're a hard old crust, Dora Kettlewick.", 'laugh']] },
  ] },
  'ph_cleaver|ph_pie': { are: 'the butcher who sells the pie-girl her meat, and wants it known he asks no questions', talk: [
    { mood: 'deal', lines: [["Two pound of shin, Hob, and none of last week's grey stuff.", 'point'], ["That was mutton, Rosie. Old mutton. Wise mutton.", 'scratch'], ["It was wise enough to have a tail I didn't recognise.", 'complain'], ["Then charge extra for the mystery. Shin's tuppence the pound. Cash.", 'nod']] },
    { mood: 'gossip', lines: [["Somebody's been asking what goes in my pies. A man in a good coat.", 'afraid'], ["Tell him it's meat and keep walking. Never say more than meat.", 'talk'], ["He wanted to know whose meat.", 'afraid'], ["Then he's a Keep man, or a fool. Either way, he doesn't get my name.", 'angry']] },
  ] },
  'ph_pim|ph_quick': { are: 'a cutpurse of the Pennyless and the market boy he is teaching the trade', talk: [
    { mood: 'scheme', lines: [["Pim. See the fat one by the spice stall? Purse on the left. Tell me how.", 'point'], ["Bump him from the right, so he grabs right. Then left hand in.", 'nod'], ["And after?", 'talk'], ["Say sorry, sir. Walk, don't run. Running's for people with something to hide.", 'agree'], ["Good lad. You'll be in the Pennyless before your voice breaks.", 'cheer']] },
    { mood: 'argue', lines: [["You gave me a copper for that whole purse yesterday. There was silver in it.", 'angry'], ["There was a guild's cut in it, and my cut, and your lesson. Lessons aren't free.", 'complain'], ["Then teach me how to count, so I can see you robbing me.", 'rant'], ["Ha. That's the first lesson, and you just learned it.", 'laugh']] },
  ] },
  'ph_quick|ph_sorrel': { are: 'two young cutpurses of the Pennyless, working the same market and pretending not to like each other', talk: [
    { mood: 'flirt', lines: [["Sorrel Vey. You lifted the miller's ring and left him the finger. Very neat.", 'laugh'], ["I'm told I've light hands, Quick. Lighter than yours, anyway.", 'wave'], ["My hands are fine. You could judge for yourself, sometime.", 'scratch'], ["I'd count my rings afterwards, though.", 'laugh']] },
    { mood: 'argue', lines: [["You worked my side of the gibbet on market day. That's my side.", 'angry'], ["The gibbet doesn't have sides. It's round. Mostly a rope.", 'point'], ["Mother Quill says the north stalls are mine till the frost.", 'rant'], ["Then go and tell Quill I took a pie-seller's apron money. I dare you.", 'laugh']] },
    { mood: 'threat', lines: [["The Watch had my name off a stallholder. Was it you put it there?", 'angry'], ["If I wanted you hanged, Quick, I'd not need a stallholder.", 'point'], ["That's not a no.", 'afraid'], ["It's not a yes either. Keep guessing. It suits your face.", 'wave']] },
  ] },
  'ph_mag|ph_osk': { are: 'the fortune-teller and the tout who walks her the gullible for a share', talk: [
    { mood: 'deal', lines: [["Three today, Mag. A widow, a farm lad and a clerk who thinks he's clever.", 'point'], ["The clerk tipped a farthing. Your share of a farthing is nothing, Osk.", 'complain'], ["The widow paid a crown!", 'angry'], ["The widow paid for her husband's message. Her husband was generous. You'll have a shilling.", 'nod']] },
    { mood: 'joke', lines: [["Read my hand, then. Free, for a partner.", 'laugh'], ["I see a man who'll lose at dice tonight and blame the dice.", 'talk'], ["That's not reading, that's knowing me.", 'scratch'], ["Same thing, love, if you charge for it.", 'laugh']] },
  ] },
  'ph_fiddle|ph_pie': { are: 'the tuneless fiddler, sweet on the pie-seller, who is not sweet on his fiddling', talk: [
    { mood: 'flirt', lines: [["Rosie! I've a new tune. I call it Pastry of My Heart.", 'cheer'], ["Is it the same three notes as the last one, Tom?", 'laugh'], ["Four. I found a fourth. It was hiding under the third.", 'talk'], ["Play it far off and I'll give you a crust for it.", 'wave']] },
    { mood: 'comfort', lines: [["Somebody broke your string. I saw the soldier do it.", 'point'], ["It was the E. Nobody ever misses the E but me.", 'sob'], ["Here. That's for a string, and the pie's for you. Don't tell Dora I'm soft.", 'hug'], ["I'll write you a tune, Rosie. A proper one. Five notes.", 'cheer']] },
  ] },
  'ph_peddle|ph_spice': { are: 'the peddler who sells dyed sawdust for saffron, and the spice-seller who would like him drowned in the Slough', talk: [
    { mood: 'argue', lines: [["Tinker Wim. Somebody brought me your saffron to match. It was marigold and brick-dust.", 'angry'], ["Marigold's a flower. Flowers are honest.", 'scratch'], ["You sold her a flower for the price of a goat.", 'rant'], ["She was very happy with it until she met you.", 'laugh'], ["Sell it on my stretch of the market again and you'll be happy in the Slough.", 'point']] },
    { mood: 'deal', lines: [["All right, truce. I've real pepper off a barge. Eight ounces, nobody's asking where.", 'talk'], ["Let me bite one.", 'point'], ["Bite away. I've nothing to hide from your teeth, Saffi.", 'nod'], ["Hm. Real. Tuppence the ounce, and you'll keep away from my lane a month.", 'agree']] },
  ] },
  'ph_mason|ph_pim': { are: 'the old beggar of the gibbet steps and the urchin he half raised', talk: [
    { mood: 'comfort', lines: [["You've a black eye, boy. Who?", 'point'], ["Nobody. I fell off a barrow.", 'scratch'], ["Barrows with fists, the market's got. Sit. Put the cold step on it.", 'talk'], ["Don't tell Quick. He'll go after them and I'll owe him.", 'afraid']] },
    { mood: 'gossip', lines: [["Aldo, is it true you saw the gibbet built?", 'talk'], ["Saw it built, saw it mended, saw the first man and maybe four hundred after.", 'nod'], ["Was the first one anyone?", 'scratch'], ["He was the man who built it. They're thorough up there, Pim. Remember that.", 'afraid']] },
  ] },
  'ph_cleaver|ph_mason': { are: 'the butcher who sets aside scraps for the old beggar, and won\'t be thanked for it', talk: [
    { mood: 'comfort', lines: [["Bone with a bit on it, Aldo. Don't make a song of it.", 'talk'], ["You're a good man, Hob Gristle.", 'bow'], ["I said don't make a song. People'll think I'm soft and stop paying.", 'angry'], ["Then I'll curse you loudly as I go, for your trade's sake.", 'laugh']] },
    { mood: 'gossip', lines: [["They've put a new man in the gibbet cage. Watched him all morning.", 'point'], ["Who was it?", 'afraid'], ["Couldn't say. Had a tanner's hands. Brown to the elbow.", 'scratch'], ["Not one of Hesk's lot. Don't say it's one of Hesk's lot.", 'sob']] },
  ] },
  'ph_bun|ph_spice': { are: 'two Chainmarket women who swap a bit of cinnamon for a loaf and the week\'s news', talk: [
    { mood: 'deal', lines: [["A thumb of cinnamon for the feast loaf, Saffi, and a loaf for you.", 'talk'], ["A thumb? Dora, you've a thumb like a turnip.", 'laugh'], ["Then you'll have a loaf like a turnip. Fair's fair.", 'nod'], ["Done. And put a currant in it this time.", 'agree']] },
    { mood: 'gossip', lines: [["Hob's taken to whistling. That man never whistled in his life.", 'point'], ["He's courting. I saw him give the Widow Sorrow a whole tongue.", 'laugh'], ["A tongue! That's practically a proposal, in Chainmarket.", 'cheer'], ["Don't tell him I told you. He'll stop whistling, and I've grown fond of it.", 'nod']] },
  ] },
  'ph_mag|ph_sorrel': { are: 'the old fortune-teller and the young cutpurse whose palm she keeps reading for free, and fearing for', talk: [
    { mood: 'comfort', lines: [["Give me your hand, Sorrel.", 'talk'], ["You read it Monday. Has it changed?", 'scratch'], ["Lines change when you're foolish. There's a rope in it now that wasn't.", 'afraid'], ["There's a rope in everybody's, Mag. That's Chainmarket.", 'wave'], ["Not this close to the wrist, child.", 'sob']] },
    { mood: 'deal', lines: [["Bring me back the shawl you lifted off the dyer's girl. She's good to me.", 'point'], ["It was blowing about. I rescued it.", 'scratch'], ["Rescue it back, or I tell your fortune at the top of my voice.", 'angry'], ["All right, all right. You old witch.", 'laugh']] },
  ] },
  'ph_fiddle|ph_osk': { are: 'the fiddler and the tout who rigs shell games under cover of his playing', talk: [
    { mood: 'scheme', lines: [["Play louder when the Watch comes by, Tom. Same as always.", 'point'], ["I always play loud. It's the only way I play.", 'talk'], ["Then play badly louder. Gives the shell a moment to vanish.", 'laugh'], ["That's my cut, Osk. Two coppers a vanish.", 'nod']] },
    { mood: 'argue', lines: [["You stopped dead in the middle of a song! The man saw the pea!", 'angry'], ["My E string went. A man can't play on through a broken E.", 'complain'], ["You've no E! I've never once heard an E from you!", 'rant'], ["And now you never will, will you? Two coppers for a new string.", 'scratch']] },
  ] },
  'ph_peddle|ph_quick': { are: 'the peddler who quietly buys what the young cutpurse brings him, cheaper than the fence would', talk: [
    { mood: 'deal', lines: [["Six spoons, Wim. Pewter. Good ones.", 'talk'], ["These have a crest on the handle. Crests are for the Slough, boy.", 'scratch'], ["File it off, then. You've got a file.", 'point'], ["Filing's work. Two coppers a spoon, and Quill never hears you came to me.", 'nod']] },
    { mood: 'threat', lines: [["Quill's asking where my spoons went. Somebody blabbed.", 'afraid'], ["Not me. I keep my mouth shut. It's half my stock.", 'wave'], ["If I go to the Pennyless floor for this, Wim, I'm bringing your pack.", 'angry'], ["Then let's both be quiet, and both be happy.", 'agree']] },
  ] },
  'ph_mag|ph_mason': { are: 'two of Chainmarket\'s oldest, who remember it before the gibbet tower was there', talk: [
    { mood: 'gossip', lines: [["Do you remember the well, Aldo? Before they put the tower on it?", 'talk'], ["I remember the water. Sweetest in the city. My mother sold cups of it.", 'nod'], ["And now we drink from the Slough butts and say thank you.", 'complain'], ["We say nothing, Mag. Saying's how you end up in the tower.", 'afraid']] },
    { mood: 'joke', lines: [["Tell my fortune, then, if you're so clever.", 'laugh'], ["You'll sit on those steps till you die.", 'point'], ["I could have told you that for nothing.", 'scratch'], ["And so could I, but nobody'd believe it free.", 'laugh']] },
  ] },
  'ph_pie|ph_pim': { are: 'the pie-seller and the urchin who gets the broken ones if he keeps the strays off her tray', talk: [
    { mood: 'deal', lines: [["Broken ones, Rosie? I kept off two dogs and a soldier.", 'point'], ["The soldier took one anyway.", 'complain'], ["He was a big soldier. I'm a small me.", 'scratch'], ["Fair enough. Two broken and one whole. Don't tell Dora I pay in pie.", 'laugh']] },
    { mood: 'comfort', lines: [["Your feet are blue, Pim. Where are your boots?", 'afraid'], ["Traded them. For a knife.", 'talk'], ["What does a boy want with a knife more than boots?", 'rant'], ["Quick says a knife gets you boots. Boots never got anyone a knife.", 'nod']] },
  ] },

  // ---- The Rookeries ----
  'ph_bess|ph_tap': { are: 'the landlord of the Gutted Lamb and Red Bess, who serves his ale and runs his house better than he does', talk: [
    { mood: 'argue', lines: [["Bess, who watered the dark? I can see the bottom of the cask through it.", 'complain'], ["You did, Jory. Tuesday. You said the Loyal won't know the difference.", 'point'], ["I said that in confidence!", 'angry'], ["You said it to the whole taproom. Standing on a chair.", 'laugh']] },
    { mood: 'gossip', lines: [["Who was that in the snug last night with the hood up?", 'afraid'], ["Paid in new silver and drank nothing. I'd not ask, Jory.", 'nod'], ["New silver's Keep silver. I'm not having Keep silver in the Lamb.", 'rant'], ["Then give it me. I'm not so fussy.", 'laugh']] },
    { mood: 'comfort', lines: [["You look grey, old man. Is it the chest again?", 'talk'], ["It's the rent, Bess. Quist's put it up a third.", 'sob'], ["Then we'll put the pies up a third and the ale down a third, and nobody'll count.", 'hug'], ["You'd make a good landlord, girl. Better than me.", 'nod']] },
  ] },
  'ph_bess|ph_wenna': { are: 'the Gutted Lamb\'s two barmaids, friends who share a bed in the loft and quarrel over the good tips', talk: [
    { mood: 'gossip', lines: [["Wenna, the sellsword in the corner asked your name twice.", 'point'], ["Brannick? He asks everyone's name twice. He forgets the first time.", 'laugh'], ["He tipped a silver penny.", 'talk'], ["Then I'll tell him my name twice. Slowly.", 'laugh']] },
    { mood: 'argue', lines: [["You took the fiddler's table and his coppers. That was my table.", 'complain'], ["Tom never has coppers. He had a button.", 'scratch'], ["It was a brass button! I'd have sewn it on something.", 'rant'], ["Have it, then. And give me back my stockings.", 'point']] },
    { mood: 'comfort', lines: [["You cried in your sleep again. About your brother.", 'talk'], ["He went up the Approach for work and never wrote.", 'sob'], ["He can't write, Wen. Not one of us can. It doesn't mean anything.", 'hug'], ["It means something, Bess. It means he's up there.", 'afraid']] },
  ] },
  'ph_tap|ph_tolly': { are: 'the landlord and the drunk whose tab has run so long it has its own chalk wall', talk: [
    { mood: 'deal', lines: [["Jory, old friend. A small one on the slate?", 'bow'], ["The slate's full, Tolly. I've started a second slate. Bess named it after you.", 'point'], ["An honour. Put it on the second slate, then.", 'nod'], ["Sweep the floor at closing and I'll rub off a pint. One.", 'agree']] },
    { mood: 'joke', lines: [["You know I was a cooper once, Jory? I made the barrels you sell from.", 'talk'], ["You've told me. And now you drink from them. The barrels are paying you back.", 'laugh'], ["They're paying me back very slowly.", 'scratch'], ["Then they're the only debtors in the Rookeries that pay at all.", 'laugh']] },
  ] },
  'ph_jask|ph_tap': { are: 'the dicer who runs games in the Lamb\'s back room, and the landlord who takes a cut and pretends he doesn\'t', talk: [
    { mood: 'deal', lines: [["Back room tonight, Jory? Two tables. Your cut's the usual.", 'talk'], ["Usual was a tenth. Make it a fifth. The Watch has been sniffing.", 'point'], ["A fifth! For a room with a hole in the floor?", 'angry'], ["The hole's how you leave when they come. That's worth a tenth by itself.", 'nod']] },
    { mood: 'threat', lines: [["A man lost his boots to you last night and went home in the snow.", 'angry'], ["He bet the boots. I can't help what men bet.", 'scratch'], ["He was the gaoler's cousin. You'll see him again, Jask, and so will I.", 'afraid'], ["Then I'll give him the boots back. Most of a boot.", 'agree']] },
  ] },
  'ph_nib|ph_quill': { are: 'the fence of the Rookeries and Nib, one of the thieves Quill buys from and bullies', talk: [
    { mood: 'deal', lines: [["Silver salt-cellar, Mother. Dukes' Row. Still warm.", 'talk'], ["Silver-washed brass, Nib. And a dent where you dropped it.", 'scratch'], ["It's heavy! Brass isn't that heavy.", 'complain'], ["Brass with lead in the foot. Somebody on Dukes' Row was cheated before you were. Four pence.", 'point'], ["Four pence for a climb up three storeys.", 'rant']] },
    { mood: 'threat', lines: [["You've been selling to the peddler, Nib. I hear things.", 'point'], ["Never. Not once. A spoon, maybe.", 'afraid'], ["A spoon's the first step. The second's the Slough. The Pennyless has long arms.", 'angry'], ["Only you, Mother. I swear it on my mother.", 'bow']] },
  ] },
  'ph_quill|ph_wren': { are: 'the fence and the street girl Quill keeps as eyes on the Rookeries\' lanes', talk: [
    { mood: 'deal', lines: [["What did you see today, Wren?", 'talk'], ["Two of the Loyal at the Hospice door. A man in a beak went in after.", 'point'], ["Was the doctor carrying anything out?", 'scratch'], ["A long bag. Long as a person.", 'afraid'], ["Good girl. A penny, and forget you saw it.", 'nod']] },
    { mood: 'comfort', lines: [["You're shaking, child. Come in by the stove.", 'talk'], ["Jask's dicer friends chased me. They said I'm a spy.", 'sob'], ["You are a spy. You're my spy. They'll learn that, and they'll be sorry.", 'angry'], ["Can I have the stove all night?", 'scratch']] },
  ] },
  'ph_nib|ph_wren': { are: 'the young cutpurse and the street girl he treats as a kid sister and a lookout', talk: [
    { mood: 'scheme', lines: [["Wren. Stand at the Lamb's corner and sneeze if the Watch comes.", 'point'], ["I can't sneeze when I want. I can cough.", 'scratch'], ["Then cough. Twice for Garrow. Once for anyone else.", 'nod'], ["What do I get?", 'talk'], ["Half a pie. A whole one if I'm not caught.", 'agree']] },
    { mood: 'joke', lines: [["Nib, is it true you fell in the Slough off a roof?", 'laugh'], ["Who told you that?", 'angry'], ["Bess. And Wenna. And everyone in the Lamb, Nib.", 'point'], ["It was a strategic dive. A man lands soft in the Slough.", 'scratch'], ["You landed on a barge.", 'laugh']] },
  ] },
  'ph_beak|ph_tolly': { are: 'the plague doctor and the drunk he keeps telling he\'ll be dead by spring', talk: [
    { mood: 'comfort', lines: [["Your eyes are yellow, Tolly. Your liver is speaking.", 'point'], ["What's it saying, doctor?", 'scratch'], ["It is saying goodbye.", 'talk'], ["It's said that every winter for twenty years. It's a very slow liver.", 'laugh']] },
    { mood: 'deal', lines: [["I'll buy your body, Tolly. After. For study. A shilling now.", 'nod'], ["A whole shilling? For me, after?", 'afraid'], ["For your liver. It's a remarkable liver. I've never seen one last.", 'talk'], ["Make it two and you can have the kidneys too.", 'agree']] },
  ] },
  'ph_beak|ph_wenna': { are: 'the masked plague doctor and the barmaid who is curious what face is under the beak', talk: [
    { mood: 'flirt', lines: [["Doctor. Do you ever take that beak off to drink?", 'laugh'], ["I drink through the beak. There's a straw.", 'nod'], ["I'd like to see you drink through a straw.", 'talk'], ["You would not, Miss Glass. It's very undignified.", 'bow']] },
    { mood: 'gossip', lines: [["They say three more died in the Hospice. Is it the cough?", 'afraid'], ["It is the cough, and the cold, and Quist's rents. Mostly the rents.", 'talk'], ["Can you do nothing?", 'sob'], ["I can carry them out. And I can tell you to boil your water. Boil it, Wenna.", 'point']] },
  ] },
  'ph_jask|ph_nib': { are: 'the dicer and the cutpurse who owes him eleven pence and keeps losing more', talk: [
    { mood: 'deal', lines: [["Eleven pence, Nib. It was nine Tuesday. Wednesday it learned to grow.", 'point'], ["I'll win it back. One throw. Double or nothing.", 'cheer'], ["You said that at nine. That's how it grew.", 'laugh'], ["Then I'll pay. Friday. When the Dukes' Row lot have their wash out.", 'nod']] },
    { mood: 'threat', lines: [["If you're cutting purses, you can cut eleven pence, boy.", 'angry'], ["Quill takes most of what I cut.", 'complain'], ["Then Quill can pay me. Or your fingers can. You've ten; I'll leave you eight.", 'point'], ["Jask, it's me! I held your coat when Cob Mallet broke your nose.", 'afraid']] },
  ] },
  'ph_bess|ph_nib': { are: 'the barmaid and the cutpurse who keeps trying to court her with stolen things', talk: [
    { mood: 'flirt', lines: [["I brought you a ribbon, Bess. Red, like your name.", 'wave'], ["It's got a pin still in it. Whose is it?", 'scratch'], ["Was. Now it's yours. That's how gifts work.", 'laugh'], ["That's how hanging works, Nib Scarrow. Put it back on the girl it came off.", 'point']] },
    { mood: 'comfort', lines: [["You look starved. Sit. There's a heel of bread and the end of the stew.", 'talk'], ["What does Jory say to that?", 'afraid'], ["Jory's asleep. Eat quick and wipe the bowl.", 'nod'], ["I'll pay you back, Bess. With real money.", 'bow']] },
  ] },
  'ph_tolly|ph_wren': { are: 'the old drunk and the street girl who leads him home when he can\'t find the Rookeries\' alleys', talk: [
    { mood: 'comfort', lines: [["Wren, is it? Which way's my door?", 'scratch'], ["Left, Tolly. Then left again. You always go right.", 'point'], ["Right feels more like home.", 'talk'], ["Right is the Slough. Hold my hand, you old sot.", 'hug']] },
    { mood: 'joke', lines: [["Tell me the barrel story, Tolly. The one with the goat.", 'cheer'], ["Once upon a time, I made a barrel so fine a goat moved into it.", 'talk'], ["And then?", 'laugh'], ["And then I drank what was in the next one, and I forget the rest.", 'laugh']] },
  ] },
  'ph_quill|ph_sorrel': { are: 'the fence and the cutpurse Quill thinks is the best of the Pennyless\'s young hands, and the hardest to keep honest', talk: [
    { mood: 'deal', lines: [["A garnet ring, Mother. Real.", 'talk'], ["Real. From the Lady Vasque's maid's pocket, I'd wager.", 'point'], ["The maid had it from the Lady. I had it from the maid. A chain of honest giving.", 'laugh'], ["Three shillings, and never on Dukes' Row again till spring. They count their rings up there.", 'nod']] },
    { mood: 'argue', lines: [["You took a cut from Quick's take. That was my lifting.", 'angry'], ["You worked his side. A side's a side.", 'complain'], ["You're both mine, girl. And the sides are mine. And the gibbet.", 'rant'], ["Fine. Have the gibbet, Mother. It's all yours.", 'wave']] },
  ] },
  'ph_quick|ph_quill': { are: 'the fence and the cutpurse who suspects Quill of short-changing the young hands', talk: [
    { mood: 'argue', lines: [["You paid Sorrel three shillings for a ring. You paid me one for a better one.", 'angry'], ["Hers was garnet. Yours was glass, with ambition.", 'point'], ["It cut a pane of glass!", 'rant'], ["So does a sharp stone, Quick. I'm not paying for stones.", 'scratch']] },
    { mood: 'scheme', lines: [["There's a coach comes up the King's Mile Thursdays, Mother. A lord's.", 'talk'], ["Lord Vell's. His bags ride on the roof. Badly tied.", 'nod'], ["I want two hands on the corner and Pim for the noise.", 'point'], ["Have them. And if it goes wrong, I never heard the word Thursday.", 'agree']] },
  ] },
  'ph_jask|ph_osk': { are: 'two dicers, one of the Rookeries and one of the market, who each say the other\'s dice are loaded', talk: [
    { mood: 'argue', lines: [["Those dice of yours roll six like a dog rolls over, Osk.", 'point'], ["They're trained. I've had them since they were pips.", 'laugh'], ["One of them's lead-heavy. I weighed it in my hand.", 'angry'], ["And yours are shaved, Two-Bones. Fair's fair.", 'rant']] },
    { mood: 'deal', lines: [["Joint game Saturday? Your marks, my room.", 'talk'], ["Your room's got a hole in the floor.", 'scratch'], ["That's the feature, Osk. That's the fire door.", 'laugh'], ["Halves. And no lead in either hand, on your honour.", 'agree']] },
  ] },
  'ph_pim|ph_wren': { are: 'two street children, one of the market and one of the Rookeries, who trade what they know', talk: [
    { mood: 'deal', lines: [["I've a secret, Pim. It's worth a pie.", 'talk'], ["Half a pie. Rosie only gave me half.", 'scratch'], ["Then half a secret. A Loyal man drinks at the Lamb with his cloak off.", 'point'], ["Which one?", 'afraid'], ["That's the other half. Bring the other half.", 'laugh']] },
    { mood: 'joke', lines: [["Race you to the gibbet steps?", 'cheer'], ["You always win. You cut through the butcher's.", 'complain'], ["Hob doesn't mind. He thinks I'm a cat.", 'laugh']] },
  ] },
  'ph_tib|ph_wren': { are: 'two street girls, the Rookeries\' and the Wharf\'s, sworn friends since one pulled the other out of the Slough', talk: [
    { mood: 'comfort', lines: [["Your hands are all cut, Tib.", 'afraid'], ["Fish hooks. Mog had me picking the nets.", 'complain'], ["Here. Bess gave me goose grease. It stings, then it doesn't.", 'hug'], ["You're my best friend, Wren. Since the Slough.", 'nod']] },
    { mood: 'gossip', lines: [["The ferryman says there's a lady's ring at the bottom by Corpse Quay.", 'point'], ["Grey Abelard says lots of things. Mostly to the water.", 'laugh'], ["He said if a girl dives for it she'll come up rich or not come up.", 'afraid'], ["Then we don't dive. Promise.", 'agree']] },
  ] },
  'ph_pim|ph_tib': { are: 'the market boy and the wharf girl, rivals for the same scraps and the same corners', talk: [
    { mood: 'argue', lines: [["That's my corner, Tib. By the fish steps. I had it first.", 'angry'], ["The fish steps are the Wharf's. You're market. Go home.", 'point'], ["The fish come to market. So the steps are halfway mine.", 'rant'], ["Then stand on half a step, Pim, and see how you like it.", 'laugh']] },
    { mood: 'joke', lines: [["You smell of fish.", 'laugh'], ["You smell of Hob's gutter.", 'laugh'], ["At least gutter's dry, mostly.", 'scratch']] },
  ] },

  // ---- The Drowned Wharf ----
  'ph_mog|ph_suds': { are: 'the fishwife and the washerwoman who share the Wharf steps, one gutting and one scrubbing, and all its gossip', talk: [
    { mood: 'gossip', lines: [["Bet. The Lady Vasque's linen had a stain on it this week. Red.", 'point'], ["Wine, Mog. I'd swear it was wine.", 'scratch'], ["Wine doesn't come in a handprint.", 'afraid'], ["Then I scrubbed it and it's gone and I never saw it. Neither did you.", 'nod']] },
    { mood: 'argue', lines: [["Your scales are in my rinse water again! Lady's sheets come back smelling of herring.", 'complain'], ["Then rinse upstream. The Slough runs one way, last I looked.", 'point'], ["Upstream is the Corpse Quay!", 'rant'], ["Then pick your smell, Bet. Herring or the other.", 'laugh']] },
    { mood: 'joke', lines: [["Coll still snoring?", 'laugh'], ["Like a barge horn. I sleep with my head in the wash basket.", 'complain'], ["Marry a fishwife next time. We snore back.", 'laugh']] },
  ] },
  'ph_rope|ph_yoke': { are: 'two dockhands who work the same barges, Ysa who lifts more and Coll who says less', talk: [
    { mood: 'joke', lines: [["Coll. That sack's got your name on it. And so has the next one.", 'point'], ["You carried three last time. Show-off.", 'complain'], ["I carried three because you sat on the fourth.", 'laugh'], ["I was guarding it. From thieves.", 'scratch']] },
    { mood: 'gossip', lines: [["Barge in from upriver last night. No lanterns. Crates marked nothing.", 'afraid'], ["I saw. Loyal took it off. Didn't want us near.", 'nod'], ["Heavy crates. And something in one was moving.", 'afraid'], ["Then we never saw it, Ysa. We were drinking. Remember?", 'agree']] },
    { mood: 'deal', lines: [["Swap you the dawn shift for a quart.", 'talk'], ["Make it the quart and your gloves.", 'point'], ["Done. Mind, they've a hole where the rope bit.", 'agree']] },
  ] },
  'ph_net|ph_oar': { are: 'two old men of the Wharf, the net-mender and the ferryman, who have argued about the same knot for forty years', talk: [
    { mood: 'argue', lines: [["You tied that bow-line wrong again, Abelard. A granny knot. On a ferry.", 'point'], ["It's held forty years, Bramm.", 'scratch'], ["It's held by luck and spite. One day it'll let go mid-Slough.", 'rant'], ["Then I'll drift to the Corpse Quay and save them the fare.", 'laugh']] },
    { mood: 'gossip', lines: [["You've had a lot of fares to the Quay this month.", 'talk'], ["More than any winter I can remember. All of them quiet.", 'afraid'], ["Fares are always quiet, the ones you take there.", 'nod'], ["These were quiet before I took them, Bramm. Sitting up.", 'afraid']] },
    { mood: 'comfort', lines: [["Your hands are bad this cold.", 'talk'], ["Can't feel the needle. I've mended my own thumb into a net twice.", 'complain'], ["Come on the ferry with me. The brazier's lit. Fare's free for fools.", 'hug']] },
  ] },
  'ph_barge|ph_oar': { are: 'the bargewoman and the ferryman, who share one narrow canal and think the other owns too much of it', talk: [
    { mood: 'argue', lines: [["Grey Abelard! You cut under my bow again at the Quay bend!", 'angry'], ["I was there first, Hild. I'm always there first. I'm slower.", 'nod'], ["You'll be at the bottom first if you do it again. My pole's longer than your oar.", 'point'], ["So's your temper, woman.", 'laugh']] },
    { mood: 'deal', lines: [["Tow me up past the lock tomorrow and I'll take your Quay fares for a week.", 'talk'], ["A week? Those fares don't pay.", 'complain'], ["They don't argue either. Done?", 'scratch'], ["Done. And keep your pole on your side of the water.", 'agree']] },
  ] },
  'ph_hettie|ph_mog': { are: 'the rat-catcher and the fishwife whose stall feeds every rat on the Wharf', talk: [
    { mood: 'argue', lines: [["Mog, you leave the heads in a bucket by the wall. Every rat on the Slough comes to dinner.", 'point'], ["Where else would I leave heads?", 'scratch'], ["In the Slough! Anywhere but a bucket with a step up to it!", 'rant'], ["The bucket's for the stockpot. You'd have me throw away soup?", 'angry']] },
    { mood: 'deal', lines: [["Clear my stall of them for a week and you'll have fish every night.", 'talk'], ["Fish every night and two pennies, and the bucket goes.", 'point'], ["The bucket stays. The lid comes. That's my last.", 'nod'], ["A lid. Well. That's half a war won.", 'agree']] },
  ] },
  'ph_mog|ph_tib': { are: 'the fishwife and the wharf girl who steals from her stall and is half-fed by her on purpose', talk: [
    { mood: 'threat', lines: [["Tib. Where's my eel?", 'angry'], ["What eel?", 'scratch'], ["The one with your teeth marks in it, sticking out your coat.", 'point'], ["It jumped in. Eels are like that.", 'afraid']] },
    { mood: 'comfort', lines: [["Come here. You'll have the cod cheeks, they don't sell.", 'talk'], ["You said that yesterday.", 'nod'], ["And they didn't sell yesterday either. Eat. And no more eels.", 'hug'], ["No more eels. Maybe a herring.", 'laugh']] },
  ] },
  'ph_net|ph_tib': { are: 'the old net-mender and the wharf girl he is teaching to tie knots, so she has a trade', talk: [
    { mood: 'comfort', lines: [["Show me the sheet bend, Tib.", 'talk'], ["Under, round, and tuck it under itself.", 'nod'], ["And what happens if you get it wrong?", 'scratch'], ["The fish get out and you shout.", 'laugh'], ["Ha. Good girl. A knot's a living, child. Remember that.", 'cheer']] },
    { mood: 'gossip', lines: [["Bramm, why does nobody fish past the Corpse Quay?", 'afraid'], ["Because what comes up in the nets there isn't fish.", 'talk'], ["What is it?", 'afraid'], ["Hands, mostly. And they hold on.", 'afraid']] },
  ] },
  'ph_barge|ph_rope': { are: 'the bargewoman and the dockhand who unloads her, and lingers over it', talk: [
    { mood: 'flirt', lines: [["Ysa. You took your time with the last crate.", 'laugh'], ["It was a heavy crate, Hild.", 'scratch'], ["It was full of feathers. I loaded it.", 'point'], ["Then I was admiring your knots.", 'laugh'], ["Admire them Thursday. I'm in at dusk.", 'wave']] },
    { mood: 'deal', lines: [["Three pence the load, same as always.", 'talk'], ["Four. Coll's back is gone, I'm doing his half.", 'complain'], ["Three and a supper, then. On the barge.", 'nod'], ["Done. And a fire in the stove this time.", 'agree']] },
  ] },
  'ph_suds|ph_yoke': { are: 'husband and wife: the washerwoman and the porter, married fifteen years and still bickering', talk: [
    { mood: 'argue', lines: [["Coll, your boots are on my clean pile again.", 'angry'], ["They're on the dry pile. I thought dry meant done.", 'scratch'], ["Dry means dry. Done means folded. How long have we been married?", 'rant'], ["Fifteen years, Bet. I still don't know which pile.", 'complain']] },
    { mood: 'comfort', lines: [["Your back's worse. I saw you set the sack down twice.", 'afraid'], ["It's nothing. The yoke slipped.", 'nod'], ["The yoke's on your neck fifteen years. It doesn't slip. Sit and let me rub it.", 'hug'], ["You're a good woman, Bet Rinsewater.", 'bow']] },
    { mood: 'gossip', lines: [["Did you hear, the Prim boy from the Vasque house was down here sick?", 'talk'], ["Simeon? He'd never set foot on the Wharf.", 'scratch'], ["Brought her ladyship's gloves himself. Wouldn't let me touch them. Wouldn't say why.", 'point']] },
  ] },
  'ph_hettie|ph_net': { are: 'the rat-catcher and the net-mender whose nets the rats keep eating', talk: [
    { mood: 'argue', lines: [["Hettie, a rat's had a hole the size of a hat in my best seine. You said the wall was clear.", 'complain'], ["The wall's clear. They come in off the barges now. Hild's barges.", 'point'], ["Then catch them off the barges!", 'rant'], ["On the water? I'm a rat-catcher, Bramm, not a fish.", 'angry']] },
    { mood: 'deal', lines: [["Mend my ferret's harness and I'll set the dog on your shed a week.", 'talk'], ["The ferret bit me last time.", 'scratch'], ["He bites everyone. It's how he says thank you.", 'laugh'], ["Bring him muzzled and it's done.", 'agree']] },
  ] },
  'ph_oar|ph_tib': { are: 'the old ferryman and the girl who rides his ferry for nothing and bails it for him', talk: [
    { mood: 'comfort', lines: [["Bail, Tib. Faster. She's taking water at the stern.", 'point'], ["She's always taking water, Abelard. She's a sieve with a seat.", 'complain'], ["She's older than both of us. Show some respect for the old girl.", 'laugh'], ["When I'm rich I'll buy you a new ferry.", 'cheer']] },
    { mood: 'gossip', lines: [["Who was the fare last night? With the long box?", 'afraid'], ["Nobody, child. A box and a man who paid in silver and said nothing.", 'talk'], ["Was something in the box?", 'afraid'], ["Something knocked. Twice. I rowed faster.", 'afraid']] },
  ] },

  // ---- The Cinder quarter ----
  'ph_brann|ph_char': { are: 'the smelter and the charcoal-burner who sells him his fuel, and wets the sacks to make them weigh more', talk: [
    { mood: 'argue', lines: [["Ember Coll. Your charcoal's damp again. It hisses in my furnace like a cat.", 'angry'], ["It rained on the way in, Brann.", 'scratch'], ["It rained inside the sacks? Only the inside?", 'rant'], ["Sacks draw water. It's a known thing about sacks.", 'nod'], ["So's a fist. Dry weight next time, or I'll find another burner.", 'point']] },
    { mood: 'gossip', lines: [["They've taken two of my burners for the Keep's foundry.", 'afraid'], ["Mine too. Sorted us by the size of our arms.", 'nod'], ["What do they make up there, all day and all night?", 'scratch'], ["Don't know. Don't ask. Whatever it is, it needs the whole quarter's iron.", 'afraid']] },
  ] },
  'ph_soot|ph_tallow': { are: 'the chimney sweep and the widowed candle-maker who took him in when his master died in a flue', talk: [
    { mood: 'comfort', lines: [["Wick. Your knees are cut to ribbons.", 'afraid'], ["The flue at the smelter's had a nail in it. I went round it.", 'scratch'], ["You went over it. Sit down. There's tallow for that, at least.", 'hug'], ["Thank you, Widow. You smell of beeswax. It's nice.", 'nod']] },
    { mood: 'argue', lines: [["You went up the Barracks chimneys again. I told you never the Barracks.", 'angry'], ["They pay double, Widow.", 'complain'], ["They pay double because they're double the height. Your master went up a chimney for double.", 'sob'], ["All right. All right. Not the Barracks.", 'agree']] },
  ] },
  'ph_merrin|ph_whet': { are: 'the knife-grinder and the young ruffian who has his blades sharpened and never pays', talk: [
    { mood: 'deal', lines: [["Edge on this, Nell. And my knuckle-spikes.", 'point'], ["You owe me for the last four, Merrin.", 'complain'], ["I'll pay when I'm paid. Cob Mallet's people owe me.", 'scratch'], ["Then sharpen Cob Mallet's people, and let them pay me.", 'angry']] },
    { mood: 'threat', lines: [["If I go round the quarter saying your edges don't hold, Nell, you'll grind nothing.", 'angry'], ["My edges always hold, boy. Want me to show you on your coat?", 'point'], ["You wouldn't.", 'afraid'], ["Sparks fly. Accidents happen. Pay me Friday.", 'nod']] },
  ] },
  'ph_brann|ph_merrin': { are: 'uncle and nephew: the big smelter and the ruffian his sister\'s boy has grown into', talk: [
    { mood: 'argue', lines: [["Your mother came to me crying, boy. Knuckles Merrin. That's what they call you now?", 'angry'], ["It's a good name, Uncle. Men step aside.", 'cheer'], ["They step aside from a gibbet too. I'll get you a place at the furnace.", 'point'], ["For a penny a day and no eyebrows? No thanks.", 'rant']] },
    { mood: 'comfort', lines: [["You've a split lip.", 'talk'], ["The Tanners' Steps lot. Cob's lot. I got two of them.", 'nod'], ["Come on. Your aunt'll put a cold iron on it and shout at you.", 'hug'], ["Can it be the cold iron without the shouting?", 'scratch']] },
  ] },
  'ph_char|ph_soot': { are: 'the charcoal-burner and the sweep, the two blackest men in the Cinder, who compare their blackness', talk: [
    { mood: 'joke', lines: [["Wick! I didn't see you there. I never see you anywhere.", 'laugh'], ["You can talk, Ember. A lamp went out last week and folk said it was you walking past.", 'laugh'], ["I'm blacker than you. Burner's black. Goes to the bone.", 'point'], ["Sweep's black goes up the nose and stays.", 'scratch']] },
    { mood: 'gossip', lines: [["You go in all the chimneys, boy. What's up the Keep road ones like?", 'talk'], ["Hot. Too hot. And there's scratching in some of them that isn't me.", 'afraid'], ["Birds.", 'nod'], ["Birds don't call your name, Ember.", 'afraid']] },
  ] },
  'ph_tallow|ph_whet': { are: 'the candle-maker widow and the knife-grinder, courting very slowly, two years and counting', talk: [
    { mood: 'flirt', lines: [["I've ground your wick-knives, Widow. Free. No charge.", 'bow'], ["You did that last week, Nell.", 'laugh'], ["They'd gone a touch dull since.", 'scratch'], ["They've not touched a wick since. They're on the shelf, sharp as you like.", 'laugh'], ["Then I'll grind the shelf.", 'laugh']] },
    { mood: 'gossip', lines: [["Hob Gristle the butcher gave me a tongue, Nell. A whole ox tongue.", 'talk'], ["Did he. Did he now.", 'angry'], ["I made it into a supper. Would you come and eat it?", 'nod'], ["I'd eat it gladly, if it means he doesn't.", 'cheer']] },
  ] },
  'ph_brann|ph_whet': { are: 'the smelter and the knife-grinder, who wakes him every morning with his wheel under the window', talk: [
    { mood: 'argue', lines: [["Nell. That wheel. Before dawn. Under my window.", 'angry'], ["Before dawn's when the dull knives come. Cooks.", 'nod'], ["I work the night pour! Grind under the chandler's, you've a fondness for it.", 'point'], ["I'll grind softer.", 'scratch'], ["There's no soft grinding! It's a stone!", 'rant']] },
    { mood: 'deal', lines: [["I've a bar of good steel off the last pour. Make me a knife and you can keep the offcut.", 'talk'], ["The offcut and a sack of coals.", 'point'], ["Half a sack. Damp, from Ember.", 'laugh'], ["Done, and done.", 'agree']] },
  ] },
  'ph_char|ph_tallow': { are: 'the charcoal-burner and the chandler next door, who complains his smoke yellows her candles', talk: [
    { mood: 'argue', lines: [["Ember Coll, look at this taper. Yellow. Your smoke yellows them while they cool.", 'complain'], ["It's the Cinder, Widow. Everything's yellow or black.", 'scratch'], ["My candles were white before you moved your stack.", 'rant'], ["I'll move it back if you'll sell me tapers at cost.", 'nod']] },
    { mood: 'comfort', lines: [["You're coughing blood, Ember. Don't hide it from me.", 'afraid'], ["Burner's cough. All of us get it at fifty.", 'nod'], ["Mother Gall on the Rise has a syrup. I'll buy it if you'll drink it.", 'hug'], ["You're kinder than your candles, Widow.", 'bow']] },
  ] },

  // ---- The Tanners' Steps ----
  'ph_hesk|ph_woad': { are: 'the tanner and the dyer whose vats stand side by side, and leak into each other', talk: [
    { mood: 'argue', lines: [["Indra, your purple's in my lime pit. My hides came up looking like bruises.", 'angry'], ["Your lime's in my woad, Hesk. My blue came out the colour of soup.", 'complain'], ["Then build a wall.", 'point'], ["You build it. You've the arms for it.", 'rant']] },
    { mood: 'gossip', lines: [["Cob's lot came round again for their pennies.", 'afraid'], ["Gave them mine. Not worth a broken vat.", 'nod'], ["I gave them a hide-scraper over the knuckles.", 'laugh'], ["Hesk! They'll burn you out.", 'afraid'], ["Let them. Tannery won't burn. It's too wet and it stinks too much.", 'laugh']] },
    { mood: 'deal', lines: [["Lend me a boy for the scraping and I'll dye your apron any colour you like.", 'talk'], ["Brown.", 'nod'], ["It is brown, Hesk.", 'laugh']] },
  ] },
  'ph_loom|ph_woad': { are: 'the weaver and the dyer who colours her thread, the only friendly pair on the Tanners\' Steps', talk: [
    { mood: 'deal', lines: [["Two skeins of madder red, Indra. For the Vasque order.", 'talk'], ["Madder's dear this winter. Barges aren't coming.", 'complain'], ["Then a dull red. Her ladyship won't know, she'll have it in candlelight.", 'point'], ["She'll know. She knows everything she's paid for. I'll find the madder.", 'nod']] },
    { mood: 'comfort', lines: [["You've not slept, Pell. Your eyes are like my vats.", 'afraid'], ["Three nights at the loom. Quist wants his rent and the shawl isn't done.", 'sob'], ["I'll come and wind for you tonight. Two of us are faster than one.", 'hug'], ["You'll get purple on my grey.", 'laugh'], ["Then call it a pattern.", 'laugh']] },
  ] },
  'ph_cob|ph_hesk': { are: 'the Tanners\' Steps bravo who takes the pennies, and the one tanner who won\'t give hers', talk: [
    { mood: 'threat', lines: [["Hesk Marrow. A penny a week keeps the Steps safe. Everyone pays.", 'point'], ["Safe from who, Cob? From you?", 'angry'], ["From all sorts. Fires. Falls. Vats going over.", 'scratch'], ["My vats are full of lye. Come near them and see who goes over.", 'rant']] },
    { mood: 'argue', lines: [["You hit Dickon with a scraper.", 'angry'], ["Over the knuckles. He's still got all ten.", 'nod'], ["That's not the point. People see that, they stop paying.", 'complain'], ["Then they'll stop, and you'll have to go and tan something honest.", 'laugh']] },
  ] },
  'ph_cob|ph_nan': { are: 'grandmother and grandson: the rag-and-bone woman and the bravo, who is still afraid of her', talk: [
    { mood: 'argue', lines: [["Cobbet Mallet. I hear you've been taking pennies off the Steps.", 'angry'], ["It's protection, Nan. It's a trade.", 'scratch'], ["It's thieving. I taught you better. I taught you to steal from the dead.", 'rant'], ["The dead don't pay protection, Nan.", 'complain'], ["The dead don't hit back either. Have some sense.", 'point']] },
    { mood: 'comfort', lines: [["Here, Nan. A shawl. Proper wool.", 'bow'], ["Where'd it come from?", 'scratch'], ["Bought it. Honest.", 'nod'], ["You've never bought a thing in your life. I'll wear it anyway. It's cold.", 'hug']] },
  ] },
  'ph_loom|ph_nan': { are: 'the weaver and the rag-woman who brings her old cloth to pick apart and spin again', talk: [
    { mood: 'deal', lines: [["A sack of good grey rags, Pell. All wool. Off the Bone Yards.", 'talk'], ["Off the Bone Yards? Off whom in the Bone Yards?", 'afraid'], ["Folk that won't need them. Washed in the Slough. Mostly.", 'nod'], ["Tuppence for the sack. And I'll wash it again myself.", 'agree']] },
    { mood: 'gossip', lines: [["Indra says you're making a shawl for the Lady Vasque.", 'point'], ["For her maid to give her. The maid can't afford it. She's paying by the month.", 'talk'], ["The silly girl. Is she in love with someone?", 'laugh'], ["She's frightened of someone, Nan. It's a peace offering.", 'afraid']] },
  ] },
  'ph_cob|ph_merrin': { are: 'two bravos, the Tanners\' and the Cinder\'s, who have fought three times and drawn every time', talk: [
    { mood: 'threat', lines: [["Knuckles. You're on the Steps. You're a long way from your soot.", 'point'], ["Thought I'd see the sights, Cob. The vats. The smell. Your face.", 'laugh'], ["Last time you saw my face you couldn't see out of one eye.", 'angry'], ["And you couldn't chew for a week. Call it four draws, then?", 'rant']] },
    { mood: 'scheme', lines: [["Barracks lot are moving on the Low Road. Brannick's taking pennies there now.", 'afraid'], ["A sellsword taking pennies? That's our work.", 'angry'], ["Then we stop fighting each other a week and go and remind him.", 'point'], ["A week. Then I'm breaking your nose again.", 'agree']] },
  ] },

  // ---- The Bone Yards ----
  'ph_digger|ph_spade': { are: 'the gravedigger and the grave-robber who undoes his work by night, and the bargain between them neither will name', talk: [
    { mood: 'argue', lines: [["Corbin. The Hatch grave's been opened. My corners are all wrong.", 'angry'], ["Ground settles, Mallow. Frost does that.", 'scratch'], ["Frost doesn't take a brooch and leave a shovel-print size of yours.", 'point'], ["Lots of men have my size shovel.", 'complain'], ["Not in my yard, they don't.", 'rant']] },
    { mood: 'deal', lines: [["Look. Tell me which ones went down with rings, and I'll fill your holes back neat.", 'talk'], ["I'll do no such thing.", 'angry'], ["A shilling a ring. You dig them; I tidy them. It's a circle, Mallow.", 'nod'], ["It's a sin, is what it is. Two shillings, and never the children.", 'agree']] },
    { mood: 'gossip', lines: [["Did the north row walk last night?", 'afraid'], ["Four of them. Sat up and went for the wall and stood there. Waiting.", 'afraid'], ["For what?", 'scratch'], ["For the crown fire to go dark, I think. They all face the Keep.", 'point']] },
  ] },
  'ph_greta|ph_vane': { are: 'the Bone Yards\' two demon hunters, once partners, now rivals for every bounty', talk: [
    { mood: 'argue', lines: [["You took the ghast at the Hatch wall. That was my ghast, Vane.", 'angry'], ["It wasn't wearing your name, Greta.", 'scratch'], ["I'd been tracking it three nights! I knew its walk!", 'rant'], ["And I knew its neck. That's the part the bounty pays for.", 'point']] },
    { mood: 'comfort', lines: [["You're limping.", 'talk'], ["Something under the Stack Row. It had a lot of teeth and very little sense.", 'nod'], ["Let me see it. Granny Thistle's poultice is in my bag.", 'hug'], ["You still carry that for me?", 'scratch'], ["I carry it for idiots. You qualify.", 'laugh']] },
    { mood: 'scheme', lines: [["There's a nest under the old ossuary. Too big for one.", 'point'], ["Halves?", 'nod'], ["Halves. And you go in first. Your armour's thicker and your head's thicker.", 'laugh']] },
  ] },
  'ph_abel|ph_spade': { are: 'the defrocked priest and the gravedigger, who drink together on the cemetery wall every night', talk: [
    { mood: 'gossip', lines: [["Who've you put down today, Mallow?", 'talk'], ["A carter, a widow, and a baby with no name.", 'sob'], ["I'll say the words over the baby, then. Old habit.", 'nod'], ["Whose words, Abel? Nobody up there's listening.", 'point'], ["That's never stopped me talking.", 'laugh']] },
    { mood: 'deal', lines: [["I've a bottle, if you've a cup.", 'cheer'], ["I've a skull with the top off.", 'scratch'], ["Damn, man. Well. Pour.", 'laugh']] },
  ] },
  'ph_spade|ph_veil': { are: 'the gravedigger and the hired mourner, who meet at every burial: she weeps, he shovels', talk: [
    { mood: 'deal', lines: [["Three today, Mother Hollow. Can you weep for three?", 'talk'], ["Depends. Is it the tuppenny weep or the full keening?", 'nod'], ["One full, two tuppenny. The full one's a merchant's wife.", 'point'], ["She'll have it. I'll throw in a faint for a groat.", 'agree']] },
    { mood: 'comfort', lines: [["You were crying real, at the baby. I know your real one.", 'talk'], ["Twelve years I've done this. I can still tell the difference, Mallow.", 'sob'], ["So can I. That's why I dig the little ones deeper.", 'nod'], ["Thank you.", 'hug']] },
  ] },
  'ph_digger|ph_osric_bone': { are: 'the bone-carver and the grave-robber who sells him the raw stuff and swears it is all ox', talk: [
    { mood: 'deal', lines: [["Six good long bones, Fenwick. Ox.", 'talk'], ["Ox. With a finger-ring still on this one.", 'point'], ["A very fancy ox.", 'scratch'], ["I'll keep the ring and give you a penny the bone. And you'll not bring me children's, Corbin. Ever.", 'angry']] },
    { mood: 'gossip', lines: [["Something's following me home from the north row.", 'afraid'], ["What does it look like?", 'nod'], ["Like the man I dug Tuesday. With his good coat still on.", 'afraid'], ["Then give him back his ring, you young fool.", 'point']] },
  ] },
  'ph_greta|ph_herb': { are: 'the demon hunter and the hedge-witch who sells her charms that sometimes work', talk: [
    { mood: 'deal', lines: [["Granny. The ghoul-ward you sold me. It ate it.", 'angry'], ["Ate it? The whole thing?", 'scratch'], ["String and all. Then it came at me.", 'rant'], ["Then it worked, love. It's not meant to be worn. It's meant to be thrown.", 'nod'], ["You might have said!", 'angry']] },
    { mood: 'comfort', lines: [["Sit. Let me see that bite.", 'talk'], ["It's nothing.", 'nod'], ["It's going green, and it's a funny green. Nettle and rue, and don't argue.", 'hug']] },
  ] },
  'ph_abel|ph_veil': { are: 'the defrocked priest and the mourner, both paid to look sad, who know each other\'s tricks', talk: [
    { mood: 'joke', lines: [["You wept very handsomely for the merchant's wife, Mother.", 'bow'], ["She left a lot of money. Money brings out my grief.", 'laugh'], ["The merchant tipped me for the words. I made them up on the spot.", 'laugh'], ["They were lovely. What did they mean?", 'scratch'], ["Nothing at all. That's what makes them safe.", 'nod']] },
    { mood: 'gossip', lines: [["Did you know the dead woman? From the Hospice?", 'afraid'], ["I know all of them, by the end. I make it my business to.", 'nod'], ["The Beaked Doctor brought her in himself. He stood the whole time.", 'talk']] },
  ] },
  'ph_herb|ph_osric_bone': { are: 'the hedge-witch and the bone-carver, the oldest heads in the Bone Yards, who trade bones and herbs and old stories', talk: [
    { mood: 'deal', lines: [["Knucklebones, Fenwick. Twelve. For my readings.", 'talk'], ["Carved or plain?", 'nod'], ["Plain. The carved ones lie. They want to be looked at.", 'point'], ["Then a penny each, and a bunch of your rue for the ache in my hands.", 'agree']] },
    { mood: 'gossip', lines: [["When did the dead start walking, Thistle? You were here.", 'talk'], ["When the crown fire first lit on the Keep. I was a girl.", 'afraid'], ["And before?", 'scratch'], ["Before, they stayed where they were put, and we put flowers on them.", 'sob']] },
  ] },
  'ph_digger|ph_vane': { are: 'the demon hunter and the grave-robber he keeps catching in the Bone Yards after dark', talk: [
    { mood: 'threat', lines: [["Corbin. Middle of the night, middle of a grave. Again.", 'point'], ["Fixing it. Mallow asked me. Corners.", 'scratch'], ["With a lantern and a bag?", 'angry'], ["The bag's for the corners.", 'afraid']] },
    { mood: 'deal', lines: [["You open graves. I hunt what comes out of them. We're in business together, boy.", 'talk'], ["Are we?", 'afraid'], ["Tell me which ones you've opened, and I'll know where to wait.", 'nod'], ["And you'll not tell the Watch?", 'afraid'], ["The Watch won't come here at night. Nobody will. Except us.", 'laugh']] },
  ] },
  'ph_abel|ph_herb': { are: 'the defrocked priest and the hedge-witch, who used to be enemies and now are the only two who understand each other', talk: [
    { mood: 'argue', lines: [["Your charms are nonsense, Thistle.", 'scratch'], ["And your prayers were what, Abel? Better nonsense?", 'laugh'], ["Mine had a book behind them.", 'complain'], ["And where's your book now? Up the Keep road, burning.", 'point']] },
    { mood: 'comfort', lines: [["You're shaking. Is it the drink or the cold?", 'talk'], ["Both. And the dreams. Who I preached to, before. Where they went.", 'sob'], ["Come by my fire. Valerian, and no words. Words never helped you.", 'hug']] },
  ] },

  // ---- The Barracks quarter ----
  'ph_patch|ph_redcoat': { are: 'the one-eyed veteran and the cocky young soldier who will be him in thirty years if he lives', talk: [
    { mood: 'argue', lines: [["Button your tunic, boy. You'll catch your death and save the enemy the bother.", 'point'], ["I'm off duty, Garrett. Off duty means unbuttoned.", 'laugh'], ["Off duty means alive another day. Learn the difference.", 'angry'], ["You're a grumpy old relic.", 'wave']] },
    { mood: 'comfort', lines: [["They're sending us up the Approach. Gate duty. Under the Keep.", 'afraid'], ["Keep your eyes down and your mouth shut. Don't look at the windows.", 'talk'], ["What's in the windows?", 'afraid'], ["I looked once. Hence the patch.", 'point']] },
    { mood: 'joke', lines: [["How'd you really lose the eye, Garrett?", 'laugh'], ["Fell asleep on watch. Sergeant woke me with a spoon.", 'scratch'], ["A spoon!", 'laugh'], ["A very angry spoon.", 'nod']] },
  ] },
  'ph_chisel|ph_plane': { are: 'the stonemason and the carpenter who work the Barracks jobs together and blame each other for every crooked lintel', talk: [
    { mood: 'argue', lines: [["Nat, your scaffold sways like a drunk. I was on it all morning holding my breath.", 'complain'], ["It's good oak. It's meant to give.", 'nod'], ["It's meant to stand! Stone doesn't give!", 'rant'], ["That's why your arches crack, Aldous. No give in them.", 'laugh']] },
    { mood: 'gossip', lines: [["They want more cells under the Iron Barracks. A whole new row.", 'afraid'], ["I saw the drawings. No windows. No doors I could see.", 'afraid'], ["How do they get in, then?", 'scratch'], ["I asked. The man said: they don't get out. That's all.", 'afraid']] },
    { mood: 'deal', lines: [["Share a cart up the Loop tomorrow?", 'talk'], ["If your stone's not on my side of it.", 'point'], ["Done.", 'agree']] },
  ] },
  'ph_keys|ph_redcoat': { are: 'the gaoler and the off-duty soldier who drink together and bet on which prisoner breaks first', talk: [
    { mood: 'joke', lines: [["Hallam! What's the betting on the new one?", 'cheer'], ["The scribe? Three days. He's already crying for his mother.", 'laugh'], ["I'll say two. Scribes are soft.", 'point'], ["A copper says three. You've never been down there, Dace.", 'nod']] },
    { mood: 'threat', lines: [["You were talking in the Lamb about the cells. Loudly.", 'angry'], ["Only to the barmaid. Bess.", 'scratch'], ["The barmaid hears everything and so does the man she tells. Shut your mouth or you'll be on my side of the door.", 'point'], ["All right. All right, Hallam.", 'afraid']] },
  ] },
  'ph_brannick|ph_patch': { are: 'the sellsword and the old soldier, who fought on opposite sides of a war nobody else remembers', talk: [
    { mood: 'gossip', lines: [["You were at the river fight, weren't you, Garrett? Forty years back?", 'talk'], ["I was. On the left bank.", 'nod'], ["I was on the right. Boy with a borrowed spear.", 'laugh'], ["Then we might've stuck each other. Small world.", 'laugh'], ["Small city. Drink?", 'agree']] },
    { mood: 'argue', lines: [["You sell your sword to anyone. Even them up there.", 'angry'], ["I sell it to whoever pays. You gave yours for nothing.", 'point'], ["I gave it for my town, before there was a Keep.", 'rant'], ["And where's your town now? Under the Keep.", 'complain']] },
  ] },
  'ph_brannick|ph_keys': { are: 'the sellsword and the gaoler, who hire each other for the dirty work the garrison won\'t put its name to', talk: [
    { mood: 'scheme', lines: [["There's a man to fetch from the Rookeries. Tonight. Quiet.", 'talk'], ["Who?", 'nod'], ["A cooper's boy who saw something on the Approach. The Keep wants him downstairs.", 'point'], ["Price?", 'scratch'], ["Two crowns. And you've never been to the Rookeries.", 'agree']] },
    { mood: 'deal', lines: [["You never paid me for the last one.", 'angry'], ["It wasn't finished. He talked before you brought him.", 'complain'], ["Not my fault he was chatty. Pay me, Hallam.", 'point']] },
  ] },
  'ph_chisel|ph_keys': { are: 'the stonemason who builds the new cells and the gaoler who will fill them', talk: [
    { mood: 'deal', lines: [["Walls thicker, Flint. I hear them through the old ones.", 'complain'], ["Two feet of granite. What do you want, a mountain?", 'angry'], ["I want quiet. They whisper at night. All night.", 'afraid'], ["Then I'll stuff the joints with lead. Extra charge.", 'nod']] },
    { mood: 'threat', lines: [["You've been asking what the new row is for.", 'point'], ["A man likes to know what he's building.", 'scratch'], ["A man likes to keep his tongue. Build and ask nothing.", 'angry'], ["I've asked nothing. I said nothing. I'm only stone.", 'afraid']] },
  ] },

  // ---- The Barbican and the gate ----
  'ph_toll|ph_wulf': { are: 'the toll-keeper of the Drawbridge Gate and the old sellsword who stands at it for hire and checks his sums', talk: [
    { mood: 'argue', lines: [["Gorrim, you charged that carter for four wheels. It was a two-wheeled cart.", 'point'], ["It had four wheels when it came in, Wulfram.", 'scratch'], ["Two on the cart and two in the back for mending!", 'rant'], ["Wheels is wheels. The ledger doesn't ask where they're sitting.", 'nod']] },
    { mood: 'deal', lines: [["Stand by my booth through the night and I'll halve your gate fee for the month.", 'talk'], ["Halve it? I don't pay it now. I just walk through.", 'laugh'], ["That's what I'm offering to stop noticing.", 'point'], ["Then call it a bargain, you old toad.", 'agree']] },
    { mood: 'gossip', lines: [["A woman came in yesterday with no toll and no name. The Loyal waved her through.", 'afraid'], ["A pale one? Hood up? I saw her. She looked at me and my bad knee stopped aching.", 'scratch'], ["That's not a comfort, Wulfram.", 'afraid']] },
  ] },
  'ph_alms|ph_toll': { are: 'the toll-keeper and the beggar woman who sits at his gate and shames travellers into giving her their change', talk: [
    { mood: 'argue', lines: [["Meg, you're in my light again.", 'complain'], ["The light's free, Gorrim. Even you can't charge for it.", 'laugh'], ["Give me time. I've written to the Keep about it.", 'point'], ["And when they answer, I'll sit in the dark and you'll hear me there too.", 'rant']] },
    { mood: 'deal', lines: [["Somebody overpaid by a farthing, Meg. Here. Don't tell anyone I did that.", 'talk'], ["You've a heart under all that coat.", 'bow'], ["It's not a heart. It's a farthing I can't put in the ledger. It's no good to me.", 'scratch'], ["It's good to me. I'll call it a heart anyway.", 'nod']] },
  ] },
  'ph_lark|ph_toll': { are: 'the toll-keeper and the young delver who goes out and in the gate every week and argues every toll', talk: [
    { mood: 'argue', lines: [["A penny for me and a penny for my pack, Lark.", 'point'], ["The pack's empty. I'm going out to fill it.", 'complain'], ["Empty packs are still packs.", 'nod'], ["Then I'll leave it here and you can charge it for staying.", 'angry']] },
    { mood: 'gossip', lines: [["You came back with nothing last week. And a cut on your face.", 'afraid'], ["There's a hole east of the gate that wasn't there before. Something came out.", 'afraid'], ["Something with a toll, I hope.", 'laugh'], ["Charge it a penny, Gorrim. I'd like to watch.", 'laugh']] },
  ] },
  'ph_razor|ph_wulf': { are: 'the barber-surgeon and the old sellsword whose every scar he has stitched', talk: [
    { mood: 'comfort', lines: [["Back again, Wulfram? Where is it this time?", 'nod'], ["Shoulder. A sellsword's spear. Young lad. Very keen.", 'point'], ["Sit. Bite the strap. You've had worse.", 'talk'], ["I've had you stitch it. That's worse.", 'laugh']] },
    { mood: 'deal', lines: [["You owe me for the knee and the ear.", 'complain'], ["The ear fell off anyway.", 'scratch'], ["It fell off very neatly, because of me.", 'point'], ["I'll pay you half, then. It's half an ear.", 'agree']] },
  ] },
  'ph_alms|ph_razor': { are: 'the barber-surgeon and the beggar woman he treats for nothing and gripes about it to everyone', talk: [
    { mood: 'comfort', lines: [["Show me the foot, Meg.", 'talk'], ["It's only a cut.", 'nod'], ["It's a cut with a smell, and the smell has a colour. Sit down.", 'complain'], ["You'll not take it off?", 'afraid'], ["Not today. Today we wash it. Don't tell my paying customers I'm soft.", 'hug']] },
    { mood: 'gossip', lines: [["Doctor, you've blood on your smock that isn't fresh.", 'point'], ["A Loyal man came in in the night. Wanted something cut out quietly.", 'afraid'], ["What?", 'scratch'], ["Something that was moving, Meg, under his skin. I'll say no more.", 'afraid']] },
  ] },
  'ph_lark|ph_wulf': { are: 'the old sellsword and the young delver he taught to hold a blade, who now outfights him', talk: [
    { mood: 'joke', lines: [["Wulfram! Fancy a bout in the yard? I'll go easy.", 'cheer'], ["Easy? I taught you that feint, girl.", 'laugh'], ["And I taught it to put you on your back.", 'point'], ["Respect your elders. And their knees.", 'laugh']] },
    { mood: 'comfort', lines: [["You've stopped coming out with me.", 'talk'], ["My knee won't do the miles, Lark. Not any more.", 'sob'], ["Then sit at the gate and wait for me. Somebody should.", 'hug'], ["I'll wait. I'll keep the toad from charging you double.", 'nod']] },
  ] },
  'ph_peddle|ph_toll': { are: 'the toll-keeper and the peddler who tries every trick to get his pack through without paying', talk: [
    { mood: 'argue', lines: [["Wim. What's in the pack?", 'point'], ["Nothing. Trinkets. Air.", 'scratch'], ["It's clinking.", 'angry'], ["The air's very cold this morning. It clinks.", 'laugh'], ["Open it.", 'rant']] },
    { mood: 'deal', lines: [["A pair of real silver earrings for your lady wife, Gorrim. Instead of the toll.", 'bow'], ["My lady wife's ears went green last time.", 'complain'], ["That was a different pair! Made from a different kind of silver.", 'nod'], ["The kind that's copper. Penny and a half, Wim, and keep your earrings.", 'point']] },
  ] },
  'ph_pilgrim|ph_toll': { are: 'the toll-keeper and the pilgrim to the Keep, who says a pilgrim pays no toll, and is wrong', talk: [
    { mood: 'argue', lines: [["Pilgrims don't pay, gatekeeper. I go up to the Keep.", 'point'], ["Everyone pays. The Keep says so. In writing. I've got it here.", 'nod'], ["He would not tax those who walk to him.", 'rant'], ["He taxes his own soldiers' boots, brother. A penny.", 'angry']] },
    { mood: 'threat', lines: [["When I stand before him, I'll tell him your name.", 'point'], ["Tell him my sums are right, while you're there.", 'afraid'], ["I'll tell him what you are, gatekeeper.", 'angry'], ["Then I'll let you through free. Go on. Go on, and don't tell him anything.", 'afraid']] },
  ] },
  'ph_spice|ph_toll': { are: 'the toll-keeper and the spice-seller, who argues the gate\'s weights are short every time a barge-load comes through', talk: [
    { mood: 'deal', lines: [["Your weights are short, Gorrim. My pepper weighed a pound at the wharf and a pound and a half at your gate.", 'angry'], ["The gate's weights are the Keep's weights.", 'nod'], ["Then the Keep's weights are a liar's weights.", 'rant'], ["I didn't hear that. I'll call it a pound and a quarter, and I didn't hear that.", 'afraid']] },
    { mood: 'flirt', lines: [["You smell of cinnamon, Saffi.", 'scratch'], ["And you smell of other people's money.", 'laugh'], ["Is that so bad?", 'nod'], ["It's the only smell you've got. Pass me through.", 'wave']] },
  ] },

  // ---- The Approach ----
  'ph_corve|ph_rook': { are: 'two delvers, the grizzled old hand and the young one he lets carry the rope', talk: [
    { mood: 'argue', lines: [["You went down the east shaft alone, Rook. Alone.", 'angry'], ["It was a shallow one. I could see the top.", 'complain'], ["Shallow ones are the ones that close. I lost two friends to a shallow one.", 'rant'], ["All right, Corve. Not alone.", 'agree']] },
    { mood: 'deal', lines: [["Halves on the Warrens find? You did the light, I did the finding.", 'talk'], ["I did the finding. You fell into it.", 'point'], ["Fell into it, found it. Same thing in the end.", 'laugh'], ["Sixty and forty. And next time, watch your feet.", 'nod']] },
    { mood: 'gossip', lines: [["Something's carving marks on the walls down there. New ones, every week.", 'afraid'], ["Not marks. Scratches. Claws.", 'afraid'], ["Something that's counting, then.", 'scratch'], ["Counting us, lad. Don't go down in fours.", 'afraid']] },
  ] },
  'ph_pilgrim|ph_vey': { are: 'the acolyte of the Keep and the pilgrim who has walked a long way to her door and is not let in', talk: [
    { mood: 'argue', lines: [["Sister. I've waited at the gate nine days.", 'complain'], ["The Master's gate opens when he wills it, Brother Ashe.", 'nod'], ["I came from the far valleys on bound feet!", 'rant'], ["Then your feet are tired. Your will isn't. Wait ten.", 'point']] },
    { mood: 'comfort', lines: [["Will he see me?", 'afraid'], ["He sees you now. He sees all of us on this road.", 'talk'], ["And he says nothing?", 'sob'], ["He is the silence before the fire, brother. Kneel and be warm.", 'bow']] },
  ] },
  'ph_garrow|ph_wick': { are: 'the night-watchman and the lamplighter, the two men who walk the Approach every night and keep each other company', talk: [
    { mood: 'gossip', lines: [["You lit the far lamp, Tamsin? By the castle wall?", 'talk'], ["I lit it. It went out the second I turned my back.", 'afraid'], ["Again?", 'scratch'], ["Third night. Something there likes the dark, Garrow.", 'afraid'], ["Then let it have that one. We'll keep the others.", 'nod']] },
    { mood: 'joke', lines: [["Your hat's grown, Tamsin. Is it a taller one?", 'laugh'], ["Same hat. You've shrunk. It's the nights.", 'laugh'], ["Hand me the oil can, beanpole.", 'point']] },
    { mood: 'comfort', lines: [["You're shaking. Go home, Garrow. I'll walk the Loop on my own.", 'talk'], ["Saw a face at the Keep's gate tonight. A child's. Pale.", 'afraid'], ["There are no children up there.", 'nod'], ["That's what I said to it.", 'afraid']] },
  ] },
  'ph_garrow|ph_quick': { are: 'the night-watchman and the cutpurse he has caught three times and let go twice', talk: [
    { mood: 'threat', lines: [["Dell. Third time. There's a rule about third times.", 'point'], ["I was walking, Garrow. A man can walk.", 'scratch'], ["With a merchant's purse in your boot?", 'angry'], ["The boot's mine. The purse just got in.", 'afraid']] },
    { mood: 'deal', lines: [["Tell me who on the Approach is selling to the Loyal, and you walk.", 'talk'], ["I'm no snitch.", 'angry'], ["You're no anything, if they hang you. Who?", 'point'], ["A peddler. Wears a hat with things on it. That's all I know.", 'afraid']] },
  ] },
  'ph_garrow|ph_nib': { are: 'the night-watchman and the cutpurse of the Rookeries, whose mother Garrow walked out with long ago', talk: [
    { mood: 'comfort', lines: [["Nib. Does your mother still keep her lamp in the window?", 'talk'], ["Every night. For my father, she says. Was he you, Garrow?", 'scratch'], ["No. But I'd have liked to be. Go home, lad. I didn't see you.", 'nod'], ["You never do.", 'wave']] },
    { mood: 'threat', lines: [["You'll be in the cage on the gibbet tower by spring if you keep on.", 'angry'], ["Not if you keep not seeing me.", 'laugh'], ["One day it won't be me on the street, Nib. It'll be the Loyal.", 'afraid']] },
  ] },
  'ph_garrow|ph_sorrel': { are: 'the night-watchman and the quick-handed cutpurse who has never once been caught by him, and teases him for it', talk: [
    { mood: 'joke', lines: [["Evening, Garrow. Lose anything?", 'laugh'], ["My patience. My knife. Wait. Give me my knife.", 'angry'], ["It was hanging loose. I'm returning it. That's honesty.", 'wave'], ["That's theft with good manners, girl.", 'point']] },
    { mood: 'threat', lines: [["I've a warrant on you from a Dukes' Row maid. A ring.", 'point'], ["Pansy? She gave me the ring to sell. She's paying off a shawl.", 'scratch'], ["Then she lied to me.", 'angry'], ["Everyone lies to you, Garrow. You've a trusting face.", 'laugh']] },
  ] },
  'ph_vey|ph_wick': { are: 'the lamplighter of the Approach and the acolyte who tells him which lamps the Keep wants dark', talk: [
    { mood: 'argue', lines: [["Lamplighter. The lamps by the gate must stay dark tonight.", 'point'], ["They light the whole road, Sister. People fall.", 'complain'], ["The Master's guests come by night. They prefer to come unseen.", 'nod'], ["What kind of guests can't bear a lamp?", 'afraid'], ["The kind you should be glad you can't see.", 'angry']] },
    { mood: 'flirt', lines: [["You've oil on your hands, Sister.", 'talk'], ["I carry the temple's lamps too.", 'nod'], ["Then we're in the same trade, you and I.", 'bow'], ["No. You give light. I'm told when to take it away.", 'sob']] },
  ] },
  'ph_corve|ph_lark': { are: 'two delvers, the old one who won\'t retire and the young woman who keeps out-finding him', talk: [
    { mood: 'argue', lines: [["Lark Tamsey. You took the barrow-hoard under the east hill. I'd marked it.", 'angry'], ["With a pile of stones? Corve, that's not marking. That's a pile of stones.", 'laugh'], ["It's the delvers' sign! Everybody knows it!", 'rant'], ["Everybody over forty.", 'point']] },
    { mood: 'comfort', lines: [["You've your father's eye for a shaft, girl. He was the best I ever knew.", 'nod'], ["He went down the Warrens and didn't come up.", 'sob'], ["Nor will the best of us. But not you. Not yet.", 'hug']] },
  ] },
  'ph_lark|ph_rook': { are: 'two young delvers sweet on each other, who will only admit it underground', talk: [
    { mood: 'flirt', lines: [["Rook. You've a cobweb in your hair. Hold still.", 'laugh'], ["You saved my life in the east shaft and now you're picking my hair?", 'scratch'], ["I like my things tidy.", 'nod'], ["Your things?", 'laugh'], ["Hold still, I said.", 'wave']] },
    { mood: 'scheme', lines: [["Corve's found a stair under the Warrens. Old. Older than the city.", 'afraid'], ["He'd not tell anyone that.", 'scratch'], ["He told me. He's frightened. He wants us both.", 'talk'], ["Then we go, all three, and nobody goes alone.", 'agree']] },
  ] },

  // ---- The Mages' Rise ----
  'ph_gall|ph_sable': { are: 'the apothecary and the apprentice of the Rise who buys her powders and asks too many questions about them', talk: [
    { mood: 'deal', lines: [["An ounce of grave-moss, Mother Gall, and a dram of nightshade.", 'talk'], ["What's it for?", 'scratch'], ["For study. My master's orders.", 'nod'], ["Your master's orders were valerian and chalk last week. What are you making, Isolde?", 'point'], ["Something that keeps one awake when one shouldn't be.", 'scratch']] },
    { mood: 'comfort', lines: [["You've not slept. Your hands shake.", 'afraid'], ["The Keep sent for three of the senior apprentices. I'm fourth.", 'afraid'], ["Then stop being so clever, girl. Be fifth. Be tenth.", 'hug'], ["Can you make a powder for that?", 'sob']] },
  ] },
  'ph_quill2|ph_sable': { are: 'the old scribe and the apprentice who pays him to copy books the Rise won\'t let her read', talk: [
    { mood: 'scheme', lines: [["Master Inkle. The fourth folio. Have you copied it?", 'talk'], ["Half. I stopped where the ink went strange.", 'afraid'], ["Strange how?", 'scratch'], ["It moved when I wasn't writing. It finished words for me. I don't like what it finished.", 'afraid']] },
    { mood: 'deal', lines: [["Two shillings for the rest of it.", 'point'], ["Four. And you take it off my desk tonight, and I never had it.", 'nod'], ["Three and my thanks.", 'bow'], ["Your thanks won't buy my candles, girl. Three and a half.", 'agree']] },
  ] },
  'ph_gall|ph_quill2': { are: 'the apothecary and the scribe who write her labels, and who have been quietly fond of each other for years', talk: [
    { mood: 'flirt', lines: [["Ambrose. Your hand's slipping. This says nightshade where it means nutmeg.", 'laugh'], ["The light's poor, Agatha. I keep thinking of other things.", 'scratch'], ["What things?", 'nod'], ["You'd have me write them down, and then where would we be?", 'laugh']] },
    { mood: 'gossip', lines: [["The Isolde girl's buying grave-moss.", 'afraid'], ["And having me copy the fourth folio. I've half a mind to burn it.", 'nod'], ["Burn it, then, and write her a dull one. Save her from herself.", 'point']] },
  ] },
  'ph_gall|ph_herb': { are: 'the apothecary of the Rise and the hedge-witch of the Bone Yards, rival healers who secretly buy from each other', talk: [
    { mood: 'argue', lines: [["You told the Hask woman my poultice was rubbish, Thistle.", 'angry'], ["Your poultice was rubbish. It was mostly flour.", 'laugh'], ["It's bound with flour! The rest is comfrey!", 'rant'], ["Then it's comfrey cake. Eat it.", 'point']] },
    { mood: 'deal', lines: [["I need wolfsbane, and the Rise won't sell it.", 'talk'], ["I've a root. Grown on the north row.", 'nod'], ["Grown in a grave?", 'afraid'], ["It's the best soil in the city, love. Everyone in it's been resting.", 'laugh']] },
  ] },
  'ph_beak|ph_gall': { are: 'the plague doctor and the apothecary who fills his beak with sweet herbs and his bag with what really works', talk: [
    { mood: 'deal', lines: [["Fill the beak, Mother Gall. Rosemary, clove, and something for the stench of the Hospice.", 'talk'], ["Rosemary's dear this winter. Clove I've not seen since autumn.", 'complain'], ["Then lavender, and anything that isn't the Hospice.", 'nod'], ["Lavender and smoked lemon peel. And a bottle for your own cough.", 'point']] },
    { mood: 'gossip', lines: [["How many this week?", 'afraid'], ["Eleven. Four of them got up again before Mallow got there.", 'afraid'], ["Got up?", 'afraid'], ["I put them down again. I keep a mallet in the bag now.", 'nod']] },
  ] },
  'ph_ledger|ph_quill2': { are: 'the moneylender and the scribe who keeps his books, and knows exactly who owes Quist what', talk: [
    { mood: 'deal', lines: [["Inkle. Fair copy of the Rookeries ledger by Friday.", 'point'], ["The Rookeries ledger's half the size of the city, Master Quist.", 'complain'], ["Then you'll copy half the city by Friday. I pay by the page.", 'nod'], ["You pay by the half-page. I've counted.", 'scratch']] },
    { mood: 'threat', lines: [["You've been reading the ledgers you copy.", 'angry'], ["A scribe has to read what he writes, sir.", 'scratch'], ["Then read it and forget it. My debtors' names stay in my book, Inkle.", 'point'], ["I've forgotten it already. All of it. I'm very forgetful.", 'afraid']] },
  ] },

  // ---- Dukes' Row ----
  'ph_lady|ph_maid': { are: 'the lady of a great house and her nervous maid, who lost her ring and is too frightened to say so', talk: [
    { mood: 'threat', lines: [["Pansy. My garnet. It was on the tray.", 'point'], ["It must have rolled, my lady. I'll find it.", 'afraid'], ["Rings don't roll off trays, girl. They're taken off them.", 'angry'], ["I'll find it. I swear I'll find it.", 'sob']] },
    { mood: 'comfort', lines: [["Your hands are cold, Pansy. Stop shaking.", 'talk'], ["Yes, my lady. Sorry, my lady.", 'bow'], ["Brush my hair. And sing the one about the river. Not loudly.", 'nod'], ["Yes, my lady.", 'agree']] },
  ] },
  'ph_lady|ph_livery': { are: 'the lady of the house and her manservant, who serves her with perfect manners and hates her with perfect patience', talk: [
    { mood: 'argue', lines: [["Simeon, the silver is dull.", 'point'], ["I polished it at dawn, my lady.", 'bow'], ["Then dawn was dull. Polish it again.", 'angry'], ["At once, my lady.", 'bow']] },
    { mood: 'scheme', lines: [["The Keep is holding a supper. We are invited.", 'talk'], ["My lady will want the black velvet and the jet.", 'nod'], ["And you'll come with me and stand behind my chair, and listen.", 'point'], ["To whom, my lady?", 'afraid'], ["To everyone. Remember everything. Say nothing. Something is changing up there.", 'nod']] },
  ] },
  'ph_lordling|ph_maid': { are: 'the young lord who keeps cornering the maid in the passage, and the maid who keeps finding an errand', talk: [
    { mood: 'flirt', lines: [["Pansy. You never smile at me.", 'laugh'], ["I'm busy, my lord. Her ladyship's linen.", 'afraid'], ["Leave the linen. Come and look at my new hawk.", 'point'], ["I've to take it to the Wharf, my lord. Now. Excuse me.", 'bow']] },
    { mood: 'threat', lines: [["I could have you turned out of the house, you know. With a word to my cousin.", 'angry'], ["Yes, my lord.", 'afraid'], ["So you'll be kinder to me.", 'nod'], ["I'll be wherever her ladyship sends me, my lord.", 'sob']] },
  ] },
  'ph_ledger|ph_orme': { are: 'the merchant and the moneylender who has financed every cargo Orme ever lost', talk: [
    { mood: 'deal', lines: [["Quist. The Slough barge is late. I need a month.", 'complain'], ["You had a month at harvest, Orme. And at Candle-fair.", 'point'], ["The roads are bad! The Loyal take a tithe on every bale!", 'rant'], ["Then a month, at a quarter more. And your house deeds in my strongbox.", 'nod']] },
    { mood: 'gossip', lines: [["They say Lord Vell's boy owes you more than his father's house is worth.", 'talk'], ["They say true. I'll have the house by spring.", 'nod'], ["What will you do with it?", 'scratch'], ["Live in it, Orme. Somebody should, with some sense.", 'laugh']] },
  ] },
  'ph_harl|ph_ledger': { are: 'the moneylender and his hired brute, who collects his debts with his hands', talk: [
    { mood: 'scheme', lines: [["Harl. Jask Two-Bones. Forty shillings. Two months late.", 'point'], ["Fingers or face, Master Quist?", 'nod'], ["Neither. A broken hand can't throw dice to pay me. Break his table.", 'talk'], ["And if he's got no table?", 'scratch'], ["Then break the Lamb's. Jory will pay to keep it.", 'agree']] },
    { mood: 'argue', lines: [["You owe me for last month's collecting.", 'complain'], ["I'll take it off what you owe me.", 'nod'], ["I don't owe you anything!", 'angry'], ["Read the small print, Harl. Oh. You can't read.", 'laugh']] },
  ] },
  'ph_ledger|ph_lordling': { are: 'the moneylender and the young lord who borrows against his father\'s house and gambles it away', talk: [
    { mood: 'deal', lines: [["Quist, old man. Another fifty. Sure thing at the cards.", 'cheer'], ["You've borrowed against the house, the coach, and the hawk, my lord.", 'point'], ["Then against my name.", 'bow'], ["Your name is worth less than the hawk, my lord. Ten. And the silver.", 'nod']] },
    { mood: 'threat', lines: [["My father will hear you spoke to me like this.", 'angry'], ["Your father owes me too, my lord. Tell him I asked after his health.", 'laugh'], ["You wouldn't dare.", 'afraid'], ["I dare to the penny. That's all a moneylender is.", 'point']] },
  ] },
  'ph_livery|ph_maid': { are: 'the manservant and the maid of the same house, allies against their mistress and her cousin', talk: [
    { mood: 'comfort', lines: [["He cornered you again, Pansy.", 'angry'], ["In the back stair. I dropped the coal scuttle on his foot.", 'nod'], ["Good. I'll see his boots are polished with lard. They'll slip.", 'laugh'], ["Oh, Simeon, you mustn't.", 'laugh']] },
    { mood: 'scheme', lines: [["Her garnet. You didn't take it. Who did?", 'talk'], ["I gave it to a girl in the market to sell. To pay for a shawl. For her ladyship.", 'sob'], ["You sold her ring to buy her a present?", 'scratch'], ["It made sense at the time!", 'afraid'], ["Leave it with me. I know a fence.", 'agree']] },
    { mood: 'gossip', lines: [["The Keep sent a letter. Black wax. Her ladyship read it twice and burned it.", 'afraid'], ["Then we never saw it.", 'nod'], ["We never see anything, do we.", 'sob']] },
  ] },
  'ph_lady|ph_orme': { are: 'the lady of an old house and the merchant who bought his way onto her street, whom she will not forgive for it', talk: [
    { mood: 'argue', lines: [["Master Orme. You've had your windows glazed in red glass, I see.", 'point'], ["In honour of up there, my lady. A loyal gesture.", 'bow'], ["It looks like a brothel at night.", 'angry'], ["Then your nephew will feel at home, visiting.", 'laugh']] },
    { mood: 'deal', lines: [["I need forty bolts of black velvet for the Keep's supper. Your barge has it.", 'talk'], ["My barge is late, my lady.", 'complain'], ["Then make it early. I'll pay your price.", 'nod'], ["And come to my supper next month? Sit at my table where the street can see?", 'scratch'], ["Velvet first. Supper second. And only the soup.", 'agree']] },
  ] },
  'ph_lady|ph_lordling': { are: 'the widowed lady and her young cousin, who lives in her house, eats her suppers, and owes everyone', talk: [
    { mood: 'argue', lines: [["Cassian. Master Quist sent a note. He wants the hawk.", 'angry'], ["He can't have the hawk. I've only just named it.", 'complain'], ["What did you name it?", 'scratch'], ["Morwenna. After you.", 'bow'], ["Then he can have it all the faster.", 'point']] },
    { mood: 'scheme', lines: [["You're going to the Keep supper with me, and you'll behave.", 'point'], ["I always behave.", 'laugh'], ["You'll behave like a man who wants to keep his tongue. Not a word about cards.", 'angry'], ["Not a word, cousin. Not a whisper.", 'afraid']] },
  ] },
  'ph_harl|ph_livery': { are: 'the hired brute and the prim manservant of the house next door, who loathe each other over the shared back step', talk: [
    { mood: 'argue', lines: [["Harl. Your boots. On our step.", 'point'], ["It's a step. Boots go on steps.", 'scratch'], ["Your boots go on your master's step. You've mud from the Rookeries on ours.", 'angry'], ["I'll scrape it off on your cravat.", 'rant']] },
    { mood: 'deal', lines: [["Want a man watched, Prim? I'm good at watching.", 'talk'], ["Lord Vell. Who he meets, where he goes at night.", 'nod'], ["For your lady?", 'scratch'], ["For me. A shilling a night, and you never knew me.", 'point']] },
  ] },
  'ph_orme|ph_spice': { are: 'the merchant who brings in her spices and the seller who swears he skims every bale', talk: [
    { mood: 'deal', lines: [["Six bales of pepper in by the Slough, Saffi. Six shillings the bale.", 'talk'], ["Last time six bales came in as five and a smell.", 'complain'], ["Barges leak. Rats eat.", 'scratch'], ["Rats don't eat pepper, Master Orme. Five shillings, and I open every bale.", 'point']] },
    { mood: 'flirt', lines: [["You'd make a fine merchant's wife, Saffi.", 'bow'], ["And you'd make a fine fish for the Slough.", 'laugh'], ["One of these days you'll say yes.", 'nod'], ["One of these days you'll weigh your bales honestly. Then ask me again.", 'wave']] },
  ] },

  // ---- From one district to another ----
  'ph_jask|ph_ledger': { are: 'the moneylender and the dicer who owes him forty shillings and is always one throw from paying', talk: [
    { mood: 'deal', lines: [["Master Quist. A week. I've a game Saturday with a lord's son in it.", 'bow'], ["The lord's son owes me more than you do, Two-Bones. You'll win nothing but his paper.", 'laugh'], ["Then I'll give you his paper.", 'nod'], ["I've a drawer full of his paper. Bring me coin, or Harl brings you a visit.", 'point']] },
    { mood: 'threat', lines: [["Harl broke my table.", 'angry'], ["I asked him to be gentle. That was gentle.", 'nod'], ["It was my grandfather's table!", 'rant'], ["Then your grandfather should have taught you not to borrow from me.", 'point']] },
  ] },
  'ph_harl|ph_jask': { are: 'the moneylender\'s brute and the dicer he is sent to frighten, who were boys on the same Rookeries street', talk: [
    { mood: 'threat', lines: [["Sorry about the table, Jask. Orders.", 'scratch'], ["You used to steal apples with me, Harl. Now you break my furniture.", 'complain'], ["The apples didn't pay as well.", 'nod'], ["Tell Quist I'll have it by the new moon.", 'afraid'], ["I'll tell him. He won't listen. Bring it anyway.", 'point']] },
    { mood: 'joke', lines: [["Remember old Gristle chasing us with the cleaver?", 'laugh'], ["He's still chasing. Slower now.", 'laugh'], ["So are we, Harl. So are we.", 'nod']] },
  ] },
  'ph_bess|ph_lordling': { are: 'the young lord who goes slumming at the Gutted Lamb, and the barmaid who takes his money and none of his nonsense', talk: [
    { mood: 'flirt', lines: [["Red Bess! The fairest flower of the Rookeries.", 'bow'], ["The Rookeries don't grow flowers, my lord. We grow mould.", 'laugh'], ["Then the fairest mould.", 'laugh'], ["Pay your slate, Lord Vell, and I'll listen to your poetry.", 'point']] },
    { mood: 'argue', lines: [["You put your hand on Wenna's waist last night.", 'angry'], ["A friendly hand!", 'complain'], ["Then keep it friendly in your own pocket, or Jory'll put it in the stew.", 'point']] },
  ] },
  'ph_lordling|ph_mag': { are: 'the young lord who pays the market fortune-teller to tell him he\'ll win at cards, and the woman who won\'t', talk: [
    { mood: 'deal', lines: [["A crown, woman, if the cards love me tonight.", 'cheer'], ["They don't love you, my lord. They've never loved you.", 'nod'], ["Two crowns.", 'angry'], ["For two crowns they'll pretend. You'll still lose.", 'laugh']] },
    { mood: 'threat', lines: [["You've a sharp tongue for a market hag.", 'angry'], ["And you've a soft head for a lord. I see a moneylender in your hand.", 'point'], ["What else?", 'afraid'], ["A hawk flying away. That one's free.", 'wave']] },
  ] },
  'ph_orme|ph_peddle': { are: 'the merchant whose cast-offs the peddler sells on, and who suspects him of selling the rest too', talk: [
    { mood: 'deal', lines: [["Your old coats, Master Orme. I'll take the lot. A shilling.", 'bow'], ["A shilling? There's fur on two of them.", 'complain'], ["Moth on three.", 'scratch'], ["Two shillings, and you'll not sell them in Chainmarket where my wife will see.", 'point']] },
    { mood: 'argue', lines: [["My silver snuffbox was on your tray last market. With my initials filed off.", 'angry'], ["Lots of men have snuffboxes.", 'scratch'], ["With a dent where I sat on it?", 'rant'], ["Sat on it! Fancy. Tuppence and it's yours again.", 'laugh']] },
  ] },
  'ph_patch|ph_wulf': { are: 'two old soldiers, the Barracks veteran and the Barbican sellsword, who drink to their dead every month', talk: [
    { mood: 'comfort', lines: [["Wulfram. It's the night, isn't it.", 'nod'], ["Thirty years. Eight of us. Two left.", 'sob'], ["Then two cups, and six poured on the ground.", 'talk'], ["You were always the soft one, Garrett.", 'hug']] },
    { mood: 'joke', lines: [["Your back's worse than mine.", 'laugh'], ["My back's a palace of pain, my friend.", 'complain'], ["Mine's just an old shed.", 'laugh'], ["At least sheds don't need priests.", 'laugh']] },
  ] },
  'ph_bess|ph_redcoat': { are: 'the barmaid and the off-duty soldier who drinks at the Lamb in his red tunic and wonders why nobody sits near him', talk: [
    { mood: 'argue', lines: [["Dace Ferrow, take the red off before you come in here.", 'point'], ["I'm off duty, Bess.", 'complain'], ["The tunic isn't. Half the room went quiet when you walked in.", 'angry'], ["I'll turn it inside out.", 'scratch'], ["It's red inside too.", 'laugh']] },
    { mood: 'flirt', lines: [["You've nice eyes for a Loyal man.", 'laugh'], ["I'm not Loyal. I'm barracks. There's a difference.", 'nod'], ["Not from where we sit, love. Not from this side of the bar.", 'sob']] },
  ] },
  'ph_merrin|ph_redcoat': { are: 'the Cinder ruffian and the off-duty soldier who fought him once and lost, and wants another go', talk: [
    { mood: 'threat', lines: [["Knuckles Merrin. You broke two of my teeth.", 'point'], ["You fell on my fist, soldier.", 'laugh'], ["I want a rematch. Behind the drill yard.", 'angry'], ["Bring your teeth. I'll take the rest.", 'rant']] },
    { mood: 'scheme', lines: [["Your sergeant sells the garrison's boots out the back. I know it.", 'talk'], ["What of it?", 'scratch'], ["I want boots. Twenty pair. For my boys.", 'point'], ["Twenty pair, and we call the teeth even.", 'agree']] },
  ] },
  'ph_maid|ph_suds': { are: 'the lady\'s maid who brings the great house\'s washing down to the Wharf, and the washerwoman who reads its secrets in the stains', talk: [
    { mood: 'gossip', lines: [["Another bundle, Bet. And her ladyship says, no starch in the cuffs.", 'talk'], ["Her ladyship says that every week, and every week she sends them back for starch.", 'laugh'], ["She's been sleeping badly. The sheets are all twisted.", 'afraid'], ["Lot of that on the Row since the Keep's letter came round, love.", 'nod']] },
    { mood: 'comfort', lines: [["Your eyes are red, Pansy.", 'talk'], ["Lord Vell. In the passage again.", 'sob'], ["Here. Lye soap. Wash your face and put a bit in his collar next time.", 'hug'], ["That's wicked.", 'laugh'], ["That's laundry.", 'nod']] },
  ] },
  'ph_cleaver|ph_hesk': { are: 'the butcher who sells his hides to the tanner, and the tanner who says he skins like a drunk', talk: [
    { mood: 'deal', lines: [["Twelve hides, Hesk. Fresh this morning.", 'talk'], ["Fresh and full of holes. Do you skin with that cleaver?", 'complain'], ["I skin with what's in my hand.", 'scratch'], ["Then put a knife in your hand. Ninepence the hide, not a shilling.", 'point']] },
    { mood: 'gossip', lines: [["Somebody's selling the Steps cheap hides. Not ox, not cow.", 'afraid'], ["Then what?", 'scratch'], ["Pale. Thin. Tattooed. I sent the man off with a hook.", 'afraid'], ["Damn. Don't tell me who.", 'afraid']] },
  ] },
  'ph_lady|ph_woad': { are: 'the lady of Dukes\' Row and the dyer whose oxblood she wears, who has never once been paid on time', talk: [
    { mood: 'deal', lines: [["Indra. The oxblood was a shade too brown.", 'point'], ["It was the madder, my lady. The barges are late.", 'complain'], ["Then dye it again.", 'nod'], ["And will my lady pay for the first time, or only the second?", 'scratch'], ["The second, if it's right.", 'angry']] },
    { mood: 'argue', lines: [["You came to my door with purple hands. In daylight.", 'angry'], ["They're always purple, my lady. It doesn't come off.", 'complain'], ["Then come by the back stair.", 'point']] },
  ] },
  'ph_loom|ph_maid': { are: 'the weaver making the shawl and the maid paying for it in pennies, a gift to frighten her mistress less', talk: [
    { mood: 'deal', lines: [["Fourpence this week, Pell. I'm sorry. It's all I had.", 'sob'], ["That's fine, love. It's grey and red. Nearly done.", 'nod'], ["Will it be done before the Keep's supper?", 'afraid'], ["It'll be done if I have to weave all night. Again.", 'agree']] },
    { mood: 'gossip', lines: [["Is she so terrible, your lady?", 'scratch'], ["No. She's frightened. Like all of us. She just shouts it.", 'talk'], ["Then a shawl's a kind thought.", 'hug']] },
  ] },
  'ph_nan|ph_tib': { are: 'the old rag-and-bone woman and the wharf girl who helps her sort the sacks for a share', talk: [
    { mood: 'deal', lines: [["Wool here, linen there, and bones in the pot, Tib.", 'point'], ["What's this?", 'scratch'], ["A glove. A fine one. Black lace. Off the Row.", 'nod'], ["Can I keep it?", 'cheer'], ["One glove's no use to anyone. Have it, child.", 'hug']] },
    { mood: 'gossip', lines: [["Nan, did you really steal from the dead?", 'afraid'], ["Took what they didn't need. That's not stealing, it's tidying.", 'laugh'], ["Corbin says that too.", 'scratch'], ["Corbin takes rings. I take socks. There's a difference, girl.", 'angry']] },
  ] },
  'ph_digger|ph_quill': { are: 'the Rookeries fence and the grave-robber who brings rings and brooches still cold', talk: [
    { mood: 'deal', lines: [["Two rings and a locket, Mother.", 'talk'], ["Grave-cold. I can feel it through the gloves. Half price.", 'complain'], ["Why half?", 'angry'], ["Because nobody wants to wear the dead's ring, Corbin, once they know. And they always know.", 'point']] },
    { mood: 'threat', lines: [["The locket has a picture in it. A Pennyless man's wife.", 'angry'], ["I didn't know!", 'afraid'], ["Put it back. Tonight. And if you dig a Pennyless grave again, you'll fill one.", 'point']] },
  ] },
  'ph_abel|ph_tolly': { are: 'two drunks of different districts, the priest who lost his calling and the cooper who lost his trade', talk: [
    { mood: 'joke', lines: [["Abel! You came all the way from the Bone Yards for the Lamb's ale?", 'cheer'], ["The Bone Yards' ale is drawn from the Slough, Tolly.", 'complain'], ["So's the Lamb's. Jory just charges more for it.", 'laugh'], ["Then I'm paying for the company.", 'laugh']] },
    { mood: 'comfort', lines: [["Do you miss it, Abel? Your old church?", 'talk'], ["I miss the singing. Nobody sings here.", 'sob'], ["Tom sings.", 'nod'], ["That's not singing, my friend. That's a fiddle being hurt.", 'laugh']] },
  ] },
  'ph_tallow|ph_veil': { are: 'the candle-maker and the hired mourner, who buys her black funeral candles by the dozen', talk: [
    { mood: 'deal', lines: [["A dozen black, Widow. Big funeral. A merchant's wife.", 'talk'], ["A dozen black is dear. Lampblack's scarce.", 'complain'], ["Ten, then. And two plain I'll dip in soot myself.", 'nod'], ["Don't you dare. Ten black and two for nothing. You wept at my husband's.", 'hug']] },
    { mood: 'gossip', lines: [["Do you ever cry for yourself, Mother Hollow?", 'scratch'], ["I've not had the time, Widow. Somebody's always dying.", 'sob'], ["Come by one evening and cry for free. I'll light you a candle.", 'nod']] },
  ] },
  'ph_lady|ph_vey': { are: 'the lady of Dukes\' Row who gives to the Keep\'s temple, and the acolyte sent to collect', talk: [
    { mood: 'deal', lines: [["The Master thanks you for your gift, my lady.", 'bow'], ["Does he? Personally?", 'scratch'], ["He sees all gifts. He weighs them.", 'nod'], ["Then tell him to weigh it again. It was heavy.", 'point']] },
    { mood: 'threat', lines: [["You did not come to the last rite, my lady.", 'point'], ["I was unwell.", 'afraid'], ["The Master notices who is unwell, and how often.", 'nod'], ["I'll be well next time. Quite well.", 'afraid']] },
  ] },
  'ph_abel|ph_pilgrim': { are: 'the defrocked priest and the pilgrim to the Keep, who once sat in his church and now walks to the other place', talk: [
    { mood: 'argue', lines: [["Ashe. I knew you as a boy. You sang in my choir.", 'sob'], ["That boy is gone, Abel. The fire took him.", 'nod'], ["The fire takes everything. That's all it does.", 'rant'], ["It warms, old man. Your church never did.", 'point']] },
    { mood: 'comfort', lines: [["Your feet are bleeding.", 'afraid'], ["It is a road of offering.", 'nod'], ["Sit a moment. Just a moment. Have a drink with an old man who taught you letters.", 'hug'], ["One drink, then. For the boy.", 'agree']] },
  ] },
  'ph_corve|ph_digger': { are: 'two men who dig for a living, the delver and the grave-robber, who argue which ground is worse', talk: [
    { mood: 'argue', lines: [["You dig for dead men's rings, Corbin. That's not delving.", 'point'], ["You dig for dead men's swords, Corve. It's the same thing with a longer drop.", 'laugh'], ["My dead are a thousand years old!", 'rant'], ["So they've had time to get used to it.", 'scratch']] },
    { mood: 'deal', lines: [["Lend me your short shovel for the Warrens. Mine broke on a skull.", 'talk'], ["Rent it. Penny a day.", 'nod'], ["Done. And if I find a ring, you get first look.", 'agree']] },
  ] },
  'ph_beak|ph_hettie': { are: 'the plague doctor and the rat-catcher, who agree the rats spread the sickness and disagree what to do', talk: [
    { mood: 'argue', lines: [["Hettie. Burn them. Don't drown them in the Slough. The Slough's sick enough.", 'point'], ["Burn them? With whose coal? Ember's? At his prices?", 'complain'], ["The Hospice will pay.", 'nod'], ["The Hospice hasn't paid me in a year, doctor.", 'angry']] },
    { mood: 'gossip', lines: [["The rats are leaving the Rookeries, doctor. Going up the Approach.", 'afraid'], ["Rats leave a place that's about to be empty.", 'afraid'], ["Then where are they going?", 'scratch'], ["Toward the warm. Toward the fire.", 'point']] },
  ] },
  'ph_oar|ph_veil': { are: 'the ferryman and the mourner, who ride together on every barge funeral down to the Corpse Quay', talk: [
    { mood: 'gossip', lines: [["Another to the Quay, Mother Hollow?", 'talk'], ["The merchant's wife. Full keening, all the way down.", 'nod'], ["She sat up on the last one. Halfway. In the middle of your keening.", 'afraid'], ["I kept keening. She lay back down. Professional courtesy.", 'nod']] },
    { mood: 'deal', lines: [["Fare's a penny each way.", 'point'], ["I don't go back. I walk.", 'complain'], ["Then a penny one way, and a penny for the song I have to listen to.", 'laugh']] },
  ] },
  'ph_soot|ph_wick': { are: 'the lamplighter and the chimney sweep, who share a ladder and argue whose climb is worse', talk: [
    { mood: 'deal', lines: [["Lend me the ladder tonight, Wick. Mine's split.", 'talk'], ["You'll get soot on it.", 'complain'], ["I'll get oil on it. Fair trade.", 'laugh'], ["Back by dawn. I've the Barracks flues.", 'agree']] },
    { mood: 'gossip', lines: [["Something put the far lamp out again, Wick. By the castle.", 'afraid'], ["Something's in the Keep road chimneys too. It knows my name.", 'afraid'], ["Then let's not go up there either of us. Not tonight.", 'nod']] },
  ] },
  'ph_digger|ph_keys': { are: 'the gaoler and the grave-robber who has slept in his cells more nights than in his own bed', talk: [
    { mood: 'joke', lines: [["Corbin! Your usual cell? I kept the straw for you.", 'laugh'], ["Not tonight, Hallam. Tonight I'm innocent.", 'wave'], ["You've mud on your boots to the knee.", 'point'], ["I was gardening.", 'scratch']] },
    { mood: 'threat', lines: [["They're moving the cells. Not to keep men. To keep something else.", 'afraid'], ["What else would they keep?", 'scratch'], ["The ones you dig up, maybe. Keep digging and you'll meet them in a cell.", 'point']] },
  ] },
  'ph_fiddle|ph_tap': { are: 'the landlord and the fiddler who plays at the Lamb for his supper, and is paid to stop as often as to start', talk: [
    { mood: 'deal', lines: [["A tune, Jory? For a bowl?", 'bow'], ["A bowl if you play by the door. Half a bowl if you play inside.", 'nod'], ["And if I don't play?", 'scratch'], ["A whole bowl and a pint, Tom. On the house.", 'laugh']] },
    { mood: 'joke', lines: [["Bess says you've got a new tune.", 'laugh'], ["Pastry of My Heart. It's for Rosie.", 'cheer'], ["Does Rosie know?", 'scratch'], ["She threw a crust at me. I think it went well.", 'laugh']] },
  ] },
  'ph_lordling|ph_sable': { are: 'the young lord who has noticed the clever apprentice of the Rise, and the apprentice who has noticed his debts', talk: [
    { mood: 'flirt', lines: [["You're the clever one, aren't you? The girl in purple.", 'bow'], ["And you're the one who owes Master Quist a house.", 'nod'], ["Gossip is beneath a scholar.", 'laugh'], ["Gossip is a scholar's first book, my lord.", 'laugh']] },
    { mood: 'scheme', lines: [["They say the Rise can make a man lucky.", 'talk'], ["They say the Rise can make a man a goat.", 'point'], ["Could you?", 'afraid'], ["For a crown I'll try the lucky. For two I'll try the other.", 'laugh']] },
  ] },
  'ph_herb|ph_mag': { are: 'the hedge-witch and the market fortune-teller, old rivals who each say the other makes it all up', talk: [
    { mood: 'argue', lines: [["Mag. You told Sorrel there's a rope in her hand. You frightened the girl.", 'angry'], ["There is a rope in her hand, Thistle.", 'nod'], ["There's a rope in yours. You just can't read it.", 'rant'], ["I read better than you. Your bones are always rolling sixes.", 'laugh']] },
    { mood: 'comfort', lines: [["Do you ever see your own?", 'scratch'], ["Never look. It's the rule.", 'nod'], ["I looked once. I saw the crown fire, and nothing after.", 'afraid'], ["That's everyone's, love. Don't look again.", 'hug']] },
  ] },
  'ph_brannick|ph_harl': { are: 'two hired swords, the sellsword of the Barracks and the brute of Dukes\' Row, who undercut each other for every job', talk: [
    { mood: 'argue', lines: [["You took the Orme job for half my price, Harl.", 'angry'], ["I took it for what he offered.", 'scratch'], ["You don't haggle. That's the trouble. You make us all cheap.", 'rant'], ["I make us all employed.", 'nod']] },
    { mood: 'scheme', lines: [["There's a job going on the Approach. Escort. Big money. Two needed.", 'talk'], ["Escort of what?", 'scratch'], ["Not what. Who. And we don't look in the coach.", 'afraid'], ["For big money I can not-look very hard.", 'agree']] },
  ] },
  'ph_greta|ph_razor': { are: 'the demon hunter and the barber-surgeon who stitches her up and wants to buy what she kills', talk: [
    { mood: 'deal', lines: [["The ghast's hand, Greta. I'll give you a shilling for it.", 'point'], ["What would you want with that?", 'scratch'], ["Study. The tendons in them don't stop.", 'nod'], ["They don't. That's why I cut it off. Two shillings. And keep it in a jar.", 'afraid']] },
    { mood: 'comfort', lines: [["Hold still. This one's deep.", 'talk'], ["You say that every time.", 'complain'], ["It's deep every time. Stop going near things with claws.", 'angry'], ["It's my trade, Snipe. As this is yours.", 'nod']] },
  ] },
  'ph_alms|ph_mason': { are: 'the two beggars, the Barbican\'s and Chainmarket\'s, who split the city between them like old married folk', talk: [
    { mood: 'argue', lines: [["Aldo. You were at my gate on fair day.", 'angry'], ["The gate was full of people with money, Meg. And you were asleep.", 'scratch'], ["I was resting my eyes!", 'rant'], ["Rest them in Chainmarket next time and I'll take your gate.", 'laugh']] },
    { mood: 'comfort', lines: [["Your cough's worse.", 'afraid'], ["Snipe looked at my foot and wouldn't look at my chest. That's how I know.", 'sob'], ["Come and sit on the gibbet steps with me. They're warmer than they look.", 'hug']] },
  ] },
  'ph_cleaver|ph_whet': { are: 'the butcher and the knife-grinder who comes to Chainmarket each week for his cleavers', talk: [
    { mood: 'deal', lines: [["Three cleavers and the boning knife, Nell.", 'talk'], ["What did you do to this one? There's a notch you could post a letter through.", 'complain'], ["Hit a bone that hit back.", 'scratch'], ["Two pence extra. And who gave the Widow Sorrow a tongue?", 'angry'], ["Ah.", 'afraid']] },
    { mood: 'threat', lines: [["Stay away from the Widow, Hob.", 'point'], ["It was a gift. A neighbourly tongue.", 'scratch'], ["You're not her neighbour. I'm her neighbour. Keep your tongues in Chainmarket.", 'angry']] },
  ] },

  // ---- The castle's household (with each other only) ----
  'cs_butler|cs_steward': { are: 'the steward of the Lower Ward and the bone butler of the Middle, who disagree on whose stair the Master\'s wine goes up', talk: [
    { mood: 'argue', lines: [["Hollowell. The Master's wine came up the kitchen stair. Again.", 'angry'], ["The great stair is being scrubbed, Steward. The Quiet Man had a guest on it.", 'bow'], ["The wine goes up the great stair. Always. It is how the Master knows it is his.", 'rant'], ["Then the Master shall have it a little late, and very properly.", 'nod']] },
    { mood: 'scheme', lines: [["The Dukes' Row supper. Forty covers. The lady Vasque is to be seated beside the fire.", 'point'], ["Beside it, Steward, or within reach of it?", 'scratch'], ["That is the Master's question to answer. Lay her place close.", 'nod'], ["Close it is. I shall polish her chair very thoroughly.", 'bow']] },
  ] },
  'cs_imp|cs_steward': { are: 'the steward and the imp page who runs his errands, badly and on purpose', talk: [
    { mood: 'argue', lines: [["Snick. The message to the Library. Where is it?", 'point'], ["I delivered it, Steward! To a ghost. He's blind, so I read it to him.", 'laugh'], ["It was sealed.", 'angry'], ["It was very loosely sealed.", 'scratch'], ["Fetch the Quiet Man's apron for washing. All the way down, all the way up.", 'rant']] },
    { mood: 'joke', lines: [["Steward, why do you never sit?", 'scratch'], ["A steward does not sit in the Master's house.", 'nod'], ["Not even when he's not looking?", 'laugh'], ["He is always looking, Snick. Remember it.", 'afraid']] },
  ] },
  'cs_ghoul|cs_steward': { are: 'the steward and the ghoul scullion of the kitchens, whom he catches eating from the scraps meant for the hounds', talk: [
    { mood: 'threat', lines: [["Grue. The hounds' bucket was half empty.", 'point'], ["The hounds were not hungry, Steward. I helped.", 'scratch'], ["You helped yourself. Again, and you will feed them from the other end.", 'angry'], ["Grue understands. Grue is very sorry. Grue is a little full.", 'afraid']] },
    { mood: 'deal', lines: [["The roast for the supper. It must be done to the bone. Not past it.", 'talk'], ["Past it is where the flavour is.", 'nod'], ["Past it is where you are, Grue. Just to the bone.", 'complain'], ["Just to the bone. Grue will only taste.", 'agree']] },
  ] },
  'cs_butler|cs_imp': { are: 'the bone butler and the imp page he is meant to be teaching the manners of the Great Hall', talk: [
    { mood: 'argue', lines: [["Snick. The forks go outward from the plate. Not into the guests.", 'point'], ["He wasn't using it.", 'laugh'], ["He was using his hand, which you had pinned to the table.", 'complain'], ["Pinned very neatly, though.", 'scratch']] },
    { mood: 'joke', lines: [["Hollowell, do your bones rattle when you bow?", 'laugh'], ["Only on the damp days.", 'nod'], ["Bow again. I'll listen.", 'cheer'], ["I shall not. A butler does not bow for an imp.", 'bow']] },
  ] },
  'cs_ghoul|cs_torturer': { are: 'the torturer of the Oubliettes and the ghoul scullion who brings his suppers down and stays for what\'s left', talk: [
    { mood: 'deal', lines: [["Supper, Quiet Man. Bread and a bone.", 'talk'], ["Set it there.", 'nod'], ["Grue could take what is left of the guest. To save you the stairs.", 'scratch'], ["The left side. Not the right. He is still using the right.", 'point'], ["Only the left side. Yes. Grue understands.", 'agree']] },
    { mood: 'gossip', lines: [["The new one sings at night. It upsets the kitchen.", 'complain'], ["I know. I let him.", 'nod'], ["You let him sing? Why?", 'scratch'], ["It is the last thing he has. Leave him it.", 'talk']] },
  ] },
  'cs_archivist|cs_imp': { are: 'the blind ghost of the Library and the imp page who hides his books and reads him things that aren\'t in them', talk: [
    { mood: 'argue', lines: [["Imp. The fourth folio of the Rites is not on its shelf.", 'angry'], ["How do you know? You're blind.", 'laugh'], ["I know where every book is the way you know where your tail is.", 'point'], ["I've lost my tail before.", 'scratch'], ["Then put the folio back before you lose the rest.", 'rant']] },
    { mood: 'comfort', lines: [["Read to me, Snick. The old histories. Before the Keep.", 'talk'], ["There's nothing before the Keep in these.", 'scratch'], ["There was once. Someone has been tearing pages.", 'sob'], ["I'll read you what's left. Slowly, so it lasts.", 'nod']] },
  ] },
  'cs_hellguard|cs_priestess': { are: 'the hellguard who stands at the Master\'s door and the priestess who passes through it', talk: [
    { mood: 'threat', lines: [["Halt, Mother.", 'point'], ["You know my face, Vargoth. I have passed this door a thousand nights.", 'angry'], ["And on the thousand-and-first, the Master may say no.", 'nod'], ["Then ask him. I will wait. He will not like that you made me.", 'rant']] },
    { mood: 'comfort', lines: [["Your armour is scored, guard. Something tried the door.", 'afraid'], ["Something tried. Something is in the oubliette now.", 'nod'], ["The Master will be pleased with you.", 'bow'], ["The Master is not pleased with anything, Mother. He notices.", 'afraid']] },
  ] },
  'cs_priestess|cs_steward': { are: 'the priestess of the Keep and the steward, who divide the Master\'s household between rite and kitchen and resent the line', talk: [
    { mood: 'argue', lines: [["Steward. The rite needs the great hall cleared by midnight.", 'point'], ["The great hall has a supper for forty until midnight, Mother.", 'complain'], ["Then the supper ends at eleven.", 'nod'], ["The guests will want their dessert.", 'scratch'], ["The guests may stay for the rite. Some will be the dessert.", 'angry']] },
    { mood: 'scheme', lines: [["The lady Vasque does not come to the rites.", 'talk'], ["She sends gifts. Heavy ones.", 'nod'], ["The Master does not want gifts. He wants her.", 'point'], ["Then she will come to supper, and she will stay late.", 'agree']] },
  ] },
  'cs_archivist|cs_butler': { are: 'two old servants of the castle, the ghost and the skeleton, who were alive together long ago and remember it differently', talk: [
    { mood: 'gossip', lines: [["Hollowell. Do you remember when you had a face?", 'talk'], ["Vaguely, Thorne. It was round. I had a moustache I was proud of.", 'nod'], ["I remember you trimmed it in the Library window. Every morning.", 'laugh'], ["And you remember the window. You had eyes then.", 'sob']] },
    { mood: 'comfort', lines: [["Are you tired, old friend?", 'talk'], ["A ghost does not tire. He only thins.", 'nod'], ["Then I shall bring you a candle to read by. You won't see it, but you'll know it's there.", 'bow']] },
  ] },
  'cs_hellguard|cs_imp': { are: 'the hellguard and the imp page who climbs his armour, steals from his belt and has never once been crushed', talk: [
    { mood: 'joke', lines: [["Vargoth! Bet you can't catch me before the stair.", 'laugh'], ["I am on duty.", 'nod'], ["Bet you can't catch me when you're off it, either.", 'cheer'], ["I am never off it, imp. Get off my shoulder.", 'angry']] },
    { mood: 'threat', lines: [["You have my whetstone.", 'point'], ["What whetstone?", 'scratch'], ["The one in your tail.", 'angry'], ["Oh. That whetstone. I was keeping it warm.", 'afraid']] },
  ] },
  'cs_archivist|cs_priestess': { are: 'the blind ghost of the archive and the priestess who comes to him for the old rites, and wants some pages kept from everyone', talk: [
    { mood: 'scheme', lines: [["Archivist. The third book of the crown fire. Is it whole?", 'talk'], ["Whole and waiting, Mother. No one has asked for it in two hundred years.", 'nod'], ["Then no one shall ask again. You will forget where it is.", 'point'], ["A ghost cannot forget, Mother. Only be silent.", 'sob'], ["Then be silent.", 'angry']] },
    { mood: 'gossip', lines: [["Someone has been tearing pages from the histories.", 'afraid'], ["Then someone has done the Master's work. Do not look for them.", 'nod'], ["I cannot look, Mother. I can only listen. And I hear tearing at night.", 'afraid']] },
  ] },
  'cs_steward|cs_torturer': { are: 'the steward who keeps the household\'s accounts and the torturer who keeps the Oubliettes\', silently', talk: [
    { mood: 'deal', lines: [["Your accounts, Quiet Man. How many below?", 'talk'], ["Nine. Three going.", 'nod'], ["Three that will not last the week. Then I'll order fewer candles.", 'point'], ["No. More. They should see it coming.", 'scratch'], ["More candles, then. Very well. I will write it.", 'agree']] },
    { mood: 'threat', lines: [["The Master asked whether you are tired of the work.", 'afraid'], ["Never.", 'talk'], ["Good. Those who tire go below.", 'nod']] },
  ] },
  'cs_hellguard|cs_torturer': { are: 'the hellguard who brings the prisoners down and the torturer who takes them from him, two silent giants who understand each other', talk: [
    { mood: 'deal', lines: [["One more for you.", 'point'], ["Good.", 'nod'], ["He bit me. Mind him.", 'complain'], ["Then he has spirit. Spirit lasts longer below.", 'laugh'], ["Then leave him his teeth for now.", 'agree']] },
    { mood: 'gossip', lines: [["The Master's crown burns lower these nights.", 'afraid'], ["Shh.", 'afraid'], ["You spoke.", 'scratch'], ["Only for that.", 'nod']] },
  ] },
  'cs_ghoul|cs_imp': { are: 'the ghoul scullion and the imp page, the castle\'s two lowest servants, who share the kitchen floor and its scraps', talk: [
    { mood: 'joke', lines: [["Grue! I stole a bone from the high table. With meat on.", 'cheer'], ["Whose bone?", 'scratch'], ["A guest's. From his plate. Not from him.", 'laugh'], ["Pity. Give Grue half.", 'laugh']] },
    { mood: 'comfort', lines: [["You've been crying, Snick. Imps don't cry.", 'afraid'], ["The steward threw me down the kitchen stair.", 'sob'], ["Come sit by the ovens. Grue will tell you about the old cook she ate.", 'hug'], ["The whole story?", 'cheer']] },
  ] },
};
