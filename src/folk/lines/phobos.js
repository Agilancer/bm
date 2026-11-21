// Phobos's street crowd (src/folk/people.js CROWD): what each sort of them says to you, aloud as you pass, and to each other
// when two stop to talk (src/folk/brain.js roam). One set to each kind, shared by everyone of that kind. They live under
// Velscour's castle and keep out of the way of what walks for him: nobody here's surprised by a spell, and nobody says his
// name above a mutter. (No Bellmourn in any of it: they've never heard of the place.)
import { CROWD } from '../people.js';
import { SAYS } from './crowd/index.js';
export { MEETS } from './crowd/index.js';

const KINDS = {
  cutpurse: {
    first: ["You're new. Everyone's new for about a day. Keep your purse inside your coat and your back to a wall, and you'll get a second one."],
    greet: {
      morning: ["Early for a stranger. The honest ones are still abed. So it's just us."],
      day: ["Busy street, this. Lots of people bumping into lots of people. Mind yourself.", "Lost? The Mile goes up to the gate. Everything worth taking goes the other way."],
      evening: ["Lamps are going up. Lamps are bad for business, but they never last."],
      night: ["Out late with a full pack. Brave. Or you've got friends I can't see."],
    },
    barks: {
      player: ["You're standing very close for someone with that much on them.", "Something you want, friend? No? Then walk on."],
      night: ["Dark corner, this. I'd not stand in it."],
      magic: ["Put that away before the Loyal smell it. They come for lights."],
    },
  },
  sellsword: {
    first: ["Looking for steel? I'm dear, but I come back. Most of them don't come back."],
    greet: {
      morning: ["Morning. Took a job at the Bone Yards last night. I'm the one who came back."],
      day: ["Coin for a contract, half up front. The other half if you're still breathing to pay it.", "Everyone who comes through the gate's going to take the Keep. I've buried a few of them."],
      evening: ["Drink's cheap in the Rookeries and dear on Dukes' Row. Same drink."],
      night: ["The Loyal change the watch at the turn of the night. Don't be on the Approach when they do."],
    },
    barks: {
      player: ["Hiring? No? Then you're in my light.", "That staff's seen use. Good. The pretty ones don't last."],
      evening: ["Somebody's paying for a fight tonight. Somebody always is."],
      magic: ["Nice trick. Do it to something with teeth and I'll be impressed."],
    },
  },
  drunk: {
    first: ["Ah! A friend! You've the look of someone who'd stand a man a drink. No? A look's still a look."],
    greet: {
      morning: ["Is it morning? It's always morning somewhere I've already been."],
      day: ["I had a house once. Up by the Mages' Rise. They wanted it more than I did."],
      evening: ["The gutter's warm on this side. I've tried both."],
      night: ["Don't look up at the Keep at night. It looks back. I looked back once. Never again."],
    },
    barks: {
      player: ["You've two faces. No. Wait. That's better.", "Spare a coin for a man who's seen the inside of the castle and lived? I'm lying. But spare it."],
      night: ["Sing with me! No? Nobody sings with me any more."],
      magic: ["Pretty lights! Do it again! Don't do it again."],
    },
  },
  beggar: {
    first: ["A copper for the old? I was a mason once. I built half that wall. It didn't need me after."],
    greet: {
      morning: ["Bread's cheapest at first light, if you've a copper. I haven't."],
      day: ["They throw the dead in the Bone Yards and the living on the street. I know which pays better."],
      evening: ["Cold coming. Cold always comes."],
      night: ["Sleep in a doorway with your back to the door. Then you hear it open."],
    },
    barks: {
      player: ["A copper. Anything. Bless you anyway.", "You've a kind face. Kind faces don't last here."],
      morning: ["Alms for the old mason."],
      magic: ["Don't. They count the lights from the Keep."],
    },
  },
  dicer: {
    first: ["Fancy a throw? Bones are honest. More honest than me. Not hard."],
    greet: {
      morning: ["Lost it all last night. Won it back this morning. Lost it again on the way here."],
      day: ["Two coppers says the next one through the gate doesn't last the week.", "I've a system. The system loses. I'm working on it."],
      evening: ["Tables are filling up. Fools with full purses. My favourite sort."],
      night: ["Never dice with the Loyal. They don't pay, and you can't stop them winning."],
    },
    barks: {
      player: ["Throw? One throw. For luck.", "You've a lucky look. I could use some of that."],
      evening: ["Who's in? Bones, cards, anything with a wager on it."],
      magic: ["Can you make the dice land? I'd split it with you. Mostly."],
    },
  },
  fence: {
    first: ["If something's come into your hands you'd rather were out of them, I'm the one to see. I don't ask where. Asking costs extra."],
    greet: {
      morning: ["Delvers come back up in the morning with full sacks. That's my morning."],
      day: ["Rings, blades, the odd skull with a gem in it. Bring me what the castle drops.", "I'll give a fair price. Fair for here."],
      evening: ["The Watch don't come down this way after dark. That's why I do."],
      night: ["Quiet hours. Best hours."],
    },
    barks: {
      player: ["Anything to sell? Anything at all?", "You look like someone with too much to carry."],
      day: ["Buying! Quietly."],
      magic: ["Careful. That's the kind of thing that gets bought, and the buyer's up the hill."],
    },
  },
  delver: {
    first: ["You're for the Keep too? Get in line. Thirty of us went down the Sewers last month. I'm the one telling you about it."],
    greet: {
      morning: ["Kit check, then the Bone Yards. Same as every day. One of these days it'll be the Castle."],
      day: ["There's a way under the wall by the Drowned Wharf. Water to the chest and things in the water.", "Fighting the dead's easy. It's the ones that stay standing after that'll have you."],
      evening: ["Back with all my fingers. A good day."],
      night: ["Don't go down at night. They don't sleep down there, but you do."],
    },
    barks: {
      player: ["Another one for the castle? Go careful.", "Had a party of five yesterday. Today it's a party of me."],
      morning: ["Anyone for the Bone Yards? Split four ways!"],
      magic: ["That's useful. Come with us and do that at the things in the dark."],
    },
  },
  hunter: {
    first: ["Silver, salt and a short blade. If you're hunting what lives in this city you'll want all three. I don't hunt with strangers."],
    greet: {
      morning: ["Three of them came over the Cinder Quarter roofs last night. Two came back down."],
      day: ["The ones in red serve him alive. The ones that rot serve him dead. Both bleed, if you're quick.", "Don't ask who we are. We're the ones still here."],
      evening: ["The dark comes up out of the Slough first. Watch the water."],
      night: ["Off the street. Now. You don't want to meet what I'm waiting for."],
    },
    barks: {
      player: ["Keep moving. You're spoiling my watch.", "You've the smell of the grave on you. Been down already?"],
      night: ["Something's out. Off the street."],
      magic: ["Hm. That'd burn one. Maybe two."],
    },
  },
  fortune: {
    first: ["Let me see your hand. Ah. You'll go up the hill. Everyone goes up the hill. Whether you come down is a copper more."],
    greet: {
      morning: ["The cards are cold in the morning. Come back when they've warmed."],
      day: ["I see a tall house and a long stair. I see it for everyone. It's true for everyone."],
      evening: ["Your fortune, stranger? Tonight's are cheap. They're short."],
      night: ["The Keep's lit in the top window. Someone's awake up there who shouldn't be."],
    },
    barks: {
      player: ["A copper for your fortune. Two and I'll make it a good one.", "I know your face. I've dreamt it. On fire, mostly."],
      evening: ["Fortunes! Fates! Lies, cheap!"],
      magic: ["Now that's no card trick. Mind it doesn't mind you back."],
    },
  },
  tavern: {
    first: ["You'll want the Gutted Lamb, two streets down. Ale's thin and the rooms are worse, but the door has a bar on it."],
    greet: {
      morning: ["Don't. I've had four hours' sleep and a man died in the back room. Come back at noon."],
      day: ["Pies at the Lamb. Don't ask what's in them, nobody knows."],
      evening: ["Busy tonight. Delvers back, purses full. Come in and empty yours."],
      night: ["Last orders. After that it's the street, and the street's not for you."],
    },
    barks: {
      player: ["Thirsty? You look thirsty.", "Coming in, or just looking?"],
      evening: ["Ale and a bed! Bar on the door!"],
      magic: ["Not in the street! You'll have the Loyal on the whole row."],
    },
  },
  ratcatcher: {
    first: ["Rats, sir. Big as dogs under the wharf. Bigger under the Bone Yards, and they've stopped running from me."],
    greet: {
      morning: ["Forty tails last night. Paid by the tail. Something else is eating them before I get there, though."],
      day: ["The sewers go under all of it. Under the castle too. I don't go that far."],
      evening: ["They come up when it's dark. So do I."],
      night: ["Hear that? Scratching. That's not rats."],
    },
    barks: {
      player: ["Mind the drain. Something lives in it.", "Got a dog? I'll buy a dog."],
      night: ["Rats! Rats for the pot!"],
      magic: ["Do that down the drains, would you? Save me a night."],
    },
  },
  ruffian: {
    first: ["This is our street. You can walk on it. Walking's free. Stopping costs."],
    greet: {
      morning: ["Bit early to be looking at me like that."],
      day: ["Toll for the Low Road's a copper. No, there isn't one. There is now.", "You've got a lot of nice things. I've got a lot of friends."],
      evening: ["Evening. Mind the dark bits. We live in the dark bits."],
      night: ["Out late. Brave, or stupid. We'll find out which."],
    },
    barks: {
      player: ["Something to say? Say it.", "Keep looking. See what it gets you."],
      evening: ["Who's buying? You're buying."],
      magic: ["Oi! Do that somewhere else, before the red cloaks come."],
    },
  },
  urchin: {
    first: ["Ooh, a staff! Is it a real one? Can I hold it? I won't run. Much."],
    greet: {
      morning: ["My mam says don't talk to strangers. You're not strange, you're just new."],
      day: ["I can show you the way to the Gutted Lamb for a copper. Or I can show you the wrong way for free."],
      evening: ["The lamplighter's coming. He hits you with the pole if you're slow."],
      night: ["I'm not out. You didn't see me."],
    },
    barks: {
      player: ["Copper, mister? Copper?", "Are you going up the castle? My brother went up the castle."],
      day: ["Race you to the corner!"],
      magic: ["Do it again! Do it again!"],
    },
  },
  // (The ten made on Meshy, 2026-11-19: the people who live here, not passing through. tools/phobos/residents.json.)
  sweep: {
    first: ["Mind the coat, it's all soot. So am I. Don't shake my hand, you'll be black to the elbow for a week."],
    greet: {
      morning: ["Up before the fires are lit, that's the trade. Can't sweep a chimney that's burning."],
      day: ["Four flues since sunup. One had a dead crow in it. One had a live one."],
      evening: ["Everyone's lighting up. Every chimney in the Cinder's drawing. You can taste it."],
      night: ["I sleep on the warm side of a stack. Best bed in Phobos, if you don't mind the bricks."],
    },
    barks: {
      player: ["Want your flue done? No? Suit yourself. Your house'll burn down.", "You've got soot on you already. Must be catching."],
      night: ["Chimneys talk at night. The wind in them. That's all it is. That's all it is."],
      magic: ["Don't do fire near me, I'm mostly kindling."],
    },
  },
  fishwife: {
    first: ["Eel, pike, something that was a pike once. Fresh up the Slough this morning. Well. Up the Slough, anyway."],
    greet: {
      morning: ["Best of the catch goes early. The rest goes to the Rookeries, and they don't ask."],
      day: ["Two for a copper, and don't look at the eyes. Nobody looks at the eyes."],
      evening: ["What's left is cheap. What's left after dark is free, and you don't want it."],
      night: ["Never fish the Slough at night. Things come up to see what's on the hook."],
    },
    barks: {
      player: ["Fish? You look like you need fish.", "Hands off the basket unless there's coin in them."],
      day: ["Eel! Black eel, fat eel, eel!"],
      magic: ["Light like that brings the big ones up. Don't."],
    },
  },
  bonecarver: {
    first: ["Buttons, combs, dice, needles. All bone. Everyone's leaving bone behind, here. Somebody ought to make use of it."],
    greet: {
      morning: ["The Yards give up something new every morning. Not always the same kind of something."],
      day: ["A good knuckle makes a fine die. A good shin makes a flute. Don't ask whose."],
      evening: ["My hands shake now. Not from age. From the carving. It goes into you."],
      night: ["They knock, some nights, in the sack. I don't open the sack."],
    },
    barks: {
      player: ["A comb? You've hair enough for one.", "Good bones on you. Strong. I notice, it's my trade."],
      night: ["Don't walk the Yards after dark. Not because of the dead. Because of the diggers."],
      magic: ["Careful. Bone remembers. It might remember that."],
    },
  },
  tanner: {
    first: ["Yes, it stinks. Everything that makes leather stinks. You'll stop smelling it in a week, and then you'll be one of us."],
    greet: {
      morning: ["Hides in by dawn, in the pits by noon. The pits don't wait."],
      day: ["Belts, straps, boots, saddles. If it holds something together, I made the bit that does."],
      evening: ["Hands are brown to the bone. Wash them all you like. They stay."],
      night: ["Don't fall in a pit after dark. Takes three days to get you out, and you come out tanned."],
    },
    barks: {
      player: ["That pack's coming apart at the seam. I could fix that.", "Good boots. Mine, probably."],
      day: ["Out the way, hides coming through!"],
      magic: ["Don't. The lime catches."],
    },
  },
  watchman: {
    first: ["You. Name and business. Don't bother lying, I won't remember either and I don't care. Just keep walking."],
    greet: {
      morning: ["Night watch's done. I've seen what I've seen and I'm going to bed."],
      day: ["Move along. Nothing to see. If there were, I'd be paid more."],
      evening: ["Lamps up on the Mile. Anyone in the dark after this is in the dark on their own."],
      night: ["Out after curfew. I could take you in. I'm not going to. Don't make me change my mind."],
    },
    barks: {
      player: ["Eyes front.", "I've got my eye on you, stranger. One of them, anyway."],
      night: ["Keep to the lamps. What's past them isn't mine to stop."],
      magic: ["Put that out. Now. Before someone higher up than me sees it."],
    },
  },
  ragwoman: {
    first: ["Rags and bones, rags and bones. What's no good to you is good to someone, dearie. What've you got that's no good?"],
    greet: {
      morning: ["Early pickings. The rich throw out the best things before they're awake to miss them."],
      day: ["This shawl was a lady's once. Now it's mine. Next year it'll be a rag. Then it'll be paper."],
      evening: ["My back's bent from the sack, not the years. Well. The years too."],
      night: ["I hear everything from the gutter. Everything. Want to buy some of it?"],
    },
    barks: {
      player: ["Anything you're done with, dearie?", "Pretty boots. When you're dead, I'll have them."],
      night: ["Shh. Listen. No? Good. Nothing's coming then."],
      magic: ["Ooh. Sparkly. I had a sparkly once."],
    },
  },
  smelter: {
    first: ["Out of the way of the cart. That's slag, and it's still hot, and it'll take your foot off at the ankle."],
    greet: {
      morning: ["Fires never go out in the Cinder. We just change who's feeding them."],
      day: ["Iron for the castle. Always iron for the castle. Never asks what it's for."],
      evening: ["You can tell a smelter by the eyebrows. We don't have any."],
      night: ["Furnace glow on the clouds tonight. Means the Keep's ordered more."],
    },
    barks: {
      player: ["Strong arms on you. You'd last a month at the bellows.", "Mind the sparks."],
      day: ["Heat! Coming through!"],
      magic: ["Call that a fire? Come see a real one."],
    },
  },
  apothecary: {
    first: ["Feverwort, lung moss, black salve, sleep in a bottle. And something for the cough, which everyone in Phobos has."],
    greet: {
      morning: ["The night's sick come in at dawn. The ones who made it through the night, I mean."],
      day: ["Two drops, not three. Three drops and you'll sleep forever. People always take three."],
      evening: ["Every ailment in this city comes back to the water, the smoke or the castle. I can only help with two."],
      night: ["If you're knocking at this hour, it's poison or a birth. Tell me which before I open."],
    },
    barks: {
      player: ["You've a cut that wants cleaning. Don't let it go green.", "That cough's the smoke. Everyone's got it. It's free."],
      night: ["Shutters closed. Remedies are for the day."],
      magic: ["Spells mend nothing that a poultice can't. Slower, but it doesn't bite back."],
    },
  },
  merchant: {
    first: ["Fine cloth, finer wine, papers of passage, and a word in the right ear. Everything has a price on Dukes' Row. Even you."],
    greet: {
      morning: ["Early trade is honest trade. That's why I'm up before it."],
      day: ["Silk from the south, salt from the north, and from the Keep, orders. Always orders."],
      evening: ["The Row's lamps are better than the Mile's. We pay for them. Twice, I suspect."],
      night: ["I don't walk at night. I'm carried. You should try it."],
    },
    barks: {
      player: ["Coin talks, stranger. What's yours saying?", "A traveller with a staff. Is that for sale?"],
      day: ["Mind the coat. It's worth more than your house."],
      magic: ["Careful with that. My coat's velvet."],
    },
  },
  // (The thirty more made on Meshy, 2026-11-19: the people who keep the city going, or under.)
  baker: {
    first: ["Bread's a copper, pie's two, and don't ask what's in the pie. It's meat. It was meat."],
    greet: {
      morning: ["Up since the third hour. The ovens don't care how tired you are."],
      day: ["Fresh loaves! Black bread, rye, and the good white, if you've the coin."],
      evening: ["End of day, the stale goes cheap. Stale's still bread."],
      night: ["Ovens are banked. Come back in the morning, if there is one."],
    },
    barks: {
      player: ["You look like you've not eaten since the gate. Here, a crust, no charge. Don't tell anyone.", "Flour's gone up again. Everything's gone up."],
      night: ["Ovens are banked. Come back in the morning, if there is one."],
      magic: ["Careful with that near my ovens!"],
    },
  },
  butcher: {
    first: ["Pork, mutton, and goat. And something the Slough men bring in that I call goat. You want goat?"],
    greet: {
      morning: ["First cuts are the best. After noon it's what's left."],
      day: ["Mind the floor, it's slick. It's always slick."],
      evening: ["Blood sausage at dusk. It goes fast."],
      night: ["Shop's shut. Knives are sharp. Keep walking."],
    },
    barks: {
      player: ["Strong arms on you. I could use a pair to hold the pig.", "Don't touch the hooks."],
      night: ["Shop's shut. Knives are sharp. Keep walking."],
      magic: ["Put that out before it singes my hams."],
    },
  },
  gravedigger: {
    first: ["Business is good. Business is always good here. That's the trouble."],
    greet: {
      morning: ["Dug three before breakfast. Small ones. Don't ask."],
      day: ["Every hole's the same size, near enough. People aren't so different, flat."],
      evening: ["Evening's when they come for the fresh ones. The diggers. Not me. The other diggers."],
      night: ["I don't sleep near the Yards. Nobody who knows does."],
    },
    barks: {
      player: ["You'll want measuring, one day. Everybody does.", "Mind the mud, it doesn't let go."],
      night: ["I don't sleep near the Yards. Nobody who knows does."],
      magic: ["Don't. They wake up for less."],
    },
  },
  lamplighter: {
    first: ["Lamps, lamps, all the way up the Mile and back down Ash Lane. Somebody has to, or nobody sees what's coming."],
    greet: {
      morning: ["Lamps out at dawn. Best part of the job, putting the night away."],
      day: ["Day's for trimming wicks and filling oil. Dull, but nobody dies of it."],
      evening: ["Here comes the dark. Here I come too."],
      night: ["Keep to my lamps tonight. I can't light the alleys."],
    },
    barks: {
      player: ["Stand aside, friend, ladder coming through.", "Every lamp I light is one less corner for them."],
      night: ["Keep to my lamps tonight. I can't light the alleys."],
      magic: ["Ha! Now that's a light. Do the Rookeries while you're at it."],
    },
  },
  washer: {
    first: ["Bring your washing to the Slough steps and I'll have it back to you grey. It's the best colour you'll get in this water."],
    greet: {
      morning: ["Water's coldest at dawn and cleanest. Clean for the Slough."],
      day: ["Scrub, wring, scrub. My hands haven't been warm since I was nine."],
      evening: ["Bring it in before the soot comes down with the dark."],
      night: ["Night washing's for blood. I don't ask whose."],
    },
    barks: {
      player: ["That coat could stand up by itself. Let me have it.", "You've dripped on my clean ones."],
      night: ["Night washing's for blood. I don't ask whose."],
      magic: ["Dry my sheets with it, go on."],
    },
  },
  ferryman: {
    first: ["Across the Slough, a copper. Back, two. Coming back is always dearer."],
    greet: {
      morning: ["Mist's thick on the water this morning. Mind the boat's middle."],
      day: ["I've ferried lords and corpses. The corpses tip better."],
      evening: ["Last crossing before the dark. After that you swim."],
      night: ["Things come up to the boat at night. I don't take passengers at night."],
    },
    barks: {
      player: ["Need a crossing? Mind your feet in the boat.", "Don't trail your hand in the water."],
      night: ["Things come up to the boat at night. I don't take passengers at night."],
      magic: ["No lights on the water. It draws them up."],
    },
  },
  plaguedoctor: {
    first: ["Stand back. Further. The air here carries it, and you've been breathing it all day, haven't you?"],
    greet: {
      morning: ["Three new in the Rookeries overnight. The rot keeps early hours."],
      day: ["Vinegar, myrrh and patience. Mostly patience."],
      evening: ["Dusk, the bad air rises off the Slough. Cover your mouth."],
      night: ["If you see a lantern on a door with a rag tied to it, don't knock."],
    },
    barks: {
      player: ["Let me look at your eyes. ...Good. Not yet.", "You're healthy. For now. Enjoy it."],
      night: ["If you see a lantern on a door with a rag tied to it, don't knock."],
      magic: ["Fire cleanses. Keep doing that."],
    },
  },
  grinder: {
    first: ["Knives, shears, swords, razors! Ground sharp while you wait, and I don't ask what they've cut."],
    greet: {
      morning: ["Morning's when the butchers come. Then the cutpurses. Same knives, near enough."],
      day: ["Hold still. ...There. Shave a mouse with that."],
      evening: ["One more before the light goes. Sparks show better at dusk."],
      night: ["Wheel's still. So should you be."],
    },
    barks: {
      player: ["That blade's got a nick in it. Who'd you hit?", "Sharp edge, sharp mind, my old master said. He was dull as a spoon."],
      night: ["Wheel's still. So should you be."],
      magic: ["Spells, pah. Steel doesn't run out."],
    },
  },
  chandler: {
    first: ["Tallow for the poor, beeswax for the rich, and black candles for those who ask quietly."],
    greet: {
      morning: ["Rendering since before light. The smell gets in your hair forever."],
      day: ["Twelve dips for a good candle. Twelve. Count them."],
      evening: ["Dusk's my best hour. Everyone runs out at once."],
      night: ["If you need candles at this hour, you need them for something I don't want to know."],
    },
    barks: {
      player: ["You'll want light where you're going. Everyone does.", "Wax drips on the cobbles, mind your step."],
      night: ["If you need candles at this hour, you need them for something I don't want to know."],
      magic: ["Ooh, that's a fine flame. Wasteful, but fine."],
    },
  },
  mason: {
    first: ["The castle's forever wanting new stone, and forever breaking the old. Steady work. Bad sleep."],
    greet: {
      morning: ["Up to the castle at dawn with the cart. They count us in and count us out."],
      day: ["Every block I set up there, I wonder what it'll hold in."],
      evening: ["Hands are raw. Stone takes the skin first and the knees after."],
      night: ["Don't walk under the scaffold at night. It sings in the wind."],
    },
    barks: {
      player: ["Good square shoulders. You'd make a hod-carrier.", "Mind the dust."],
      night: ["Don't walk under the scaffold at night. It sings in the wind."],
      magic: ["Don't crack my stone with that."],
    },
  },
  dockhand: {
    first: ["Lift, carry, stack. If it floats into the Wharf, I've had my back under it."],
    greet: {
      morning: ["Barges in at first light. Whatever's in them, it's heavy."],
      day: ["Crates with his red seal, we don't drop. Crates without, we drop a bit."],
      evening: ["Last barge of the day. Then the Lamb."],
      night: ["Night barges don't need us. Nobody unloads them. Nobody's ever seen what's in them."],
    },
    barks: {
      player: ["Strong-looking. Want a shift? Pays in coppers and bruises.", "Out of the way, load coming!"],
      night: ["Night barges don't need us. Nobody unloads them. Nobody's ever seen what's in them."],
      magic: ["Hah, light the Wharf like that and we'd work all night."],
    },
  },
  moneylender: {
    first: ["Coin now, coin back with a little more. A little more each week. It's arithmetic, not cruelty."],
    greet: {
      morning: ["Early clients are desperate clients. Good terms, for me."],
      day: ["Interest is a patient creditor. I'm also patient. Mostly."],
      evening: ["Payments are due at dusk. Those who don't come, I send someone."],
      night: ["My door's locked at night. My ledger never is."],
    },
    barks: {
      player: ["A traveller! You'll need a loan. Everybody does, eventually.", "Your name? For my records."],
      night: ["My door's locked at night. My ledger never is."],
      magic: ["Spare me the light. Gold shines well enough on its own."],
    },
  },
  acolyte: {
    first: ["You're not of the castle. You walk under it like you don't feel it. You will."],
    greet: {
      morning: ["The first hour belongs to Him. Then the rest of us may have ours."],
      day: ["Kneel or don't. The stone doesn't care. He does."],
      evening: ["When the fire in the Keep's crown burns high, someone has pleased Him. Or displeased."],
      night: ["Pray quietly at night. He's listening hardest then."],
    },
    barks: {
      player: ["Your eyes keep going to the Keep. They all do.", "Walk carefully. His city sees you."],
      night: ["Pray quietly at night. He's listening hardest then."],
      magic: ["Such light. Does it warm you? It wouldn't warm Him."],
    },
  },
  mourner: {
    first: ["I weep for those who've no one to weep for them. A copper a funeral. It's honest work, and there's plenty."],
    greet: {
      morning: ["Three funerals today. I've no voice left by noon."],
      day: ["The rich hire six of us. The poor get the rain."],
      evening: ["Dusk funerals are for those the family won't name."],
      night: ["I don't weep at night. Nobody pays at night."],
    },
    barks: {
      player: ["Has someone died? No? Not yet, then.", "You've the look of someone who's lost someone."],
      night: ["I don't weep at night. Nobody pays at night."],
      magic: ["Pretty. Like a pyre."],
    },
  },
  veteran: {
    first: ["Lost the eye at Varrow's Pass. Lost the rest of me after. Got a pension, though. Two coppers a month. Generous."],
    greet: {
      morning: ["Morning drill, every morning, though there's no one left to drill with."],
      day: ["Every lad in red on the Mile thinks he's the first to wear it. I wore it."],
      evening: ["My leg tells me the weather. Says rain. Always says rain."],
      night: ["Don't go up to the castle at night. I did, once, on duty. Once."],
    },
    barks: {
      player: ["Hold your staff like that and you'll lose it. Lower. There.", "You've seen a fight or two. I can tell by the walk."],
      night: ["Don't go up to the castle at night. I did, once, on duty. Once."],
      magic: ["Mages. We used to hunt your sort. Different days."],
    },
  },
  dyer: {
    first: ["Purple's for the Dukes. Black's for everyone. Red's for him. Blue's for nobody, these days."],
    greet: {
      morning: ["Vats are on since before dawn. You smell us before you see us."],
      day: ["My hands haven't been the colour of hands in twenty years."],
      evening: ["Hang the cloth to dry before the soot comes down."],
      night: ["Don't fall in a vat in the dark. You come out a different person. A different colour, anyway."],
    },
    barks: {
      player: ["That cloak's faded. I could fix it. Black?", "Mind the drips."],
      night: ["Don't fall in a vat in the dark. You come out a different person. A different colour, anyway."],
      magic: ["Do that again. I want to match that colour."],
    },
  },
  weaver: {
    first: ["Thread and warp and weft and the same pattern, day on day. It's calming, until you look up."],
    greet: {
      morning: ["The loom's warm by morning. I sleep under it."],
      day: ["This one's for a lady on Dukes' Row. She'll never know my name."],
      evening: ["Light's going. Can't count threads by candle."],
      night: ["I weave at night when I can't sleep. Most nights."],
    },
    barks: {
      player: ["That's good wool you're wearing. Southern?", "Mind my shuttle."],
      night: ["I weave at night when I can't sleep. Most nights."],
      magic: ["Pretty. Like gold thread. I've never touched gold thread."],
    },
  },
  busker: {
    first: ["A tune for a copper, a song for two, and for three I'll stop playing and go away!"],
    greet: {
      morning: ["Morning's for slow songs. Nobody wants a jig before breakfast."],
      day: ["Here's one about a knight who went up to the castle. It's short."],
      evening: ["Evening crowd tips better. Drunker."],
      night: ["Night songs are sad songs. Everyone wants those at night."],
    },
    barks: {
      player: ["A hero! I'll write a song about you. You'll need to do something first.", "Spare a copper for art?"],
      night: ["Night songs are sad songs. Everyone wants those at night."],
      magic: ["Ooh, a light show! Hold that, I'll play along."],
    },
  },
  scribe: {
    first: ["Letters written, read, copied and lost. Can't read? I can. For a fee. Can read? Then you don't need me, and I hate you."],
    greet: {
      morning: ["The castle sends down lists every morning. I copy them. I don't read them twice."],
      day: ["Ink's dear, paper's dearer, my time's free. That's the problem."],
      evening: ["Evening's when people want letters home. Most never get there."],
      night: ["I burn the drafts at night. All of them."],
    },
    barks: {
      player: ["Need something written? I'm discreet. Mostly.", "You have the look of a letter that should be sent."],
      night: ["I burn the drafts at night. All of them."],
      magic: ["Careful! Paper burns."],
    },
  },
  barber: {
    first: ["Shave, trim, tooth pulled, arm set, blood let. Same chair, same price, mostly."],
    greet: {
      morning: ["The morning shave, before the shakes set in. Theirs and mine."],
      day: ["Hold still. Don't look at the bowl."],
      evening: ["Evening's for the bloodletting. Calms them."],
      night: ["Night calls are for wounds. I don't ask how."],
    },
    barks: {
      player: ["You've a cut there. Want it stitched? Two coppers. One if you don't scream.", "Beard could use a trim."],
      night: ["Night calls are for wounds. I don't ask how."],
      magic: ["Warm hands. Good for the work."],
    },
  },
  joiner: {
    first: ["Doors, beams, coffins, shutters. Mostly coffins lately. A man takes the work there is."],
    greet: {
      morning: ["Timber comes in the West Gate at dawn. I pick the straight ones."],
      day: ["Measure twice, cut once, swear thrice."],
      evening: ["Light's going, and you don't saw in the dark if you want your fingers."],
      night: ["Can't sleep, so I plane. Planing's quieter than thinking."],
    },
    barks: {
      player: ["You'd want a good door in this city. Two bolts. Three.", "Sawdust in your boots? Sorry."],
      night: ["Can't sleep, so I plane. Planing's quieter than thinking."],
      magic: ["Not near the shavings!"],
    },
  },
  gaoler: {
    first: ["Got a cell with your name on it. Not yet. But I keep the chalk handy."],
    greet: {
      morning: ["Count them in the morning. Count them again. The numbers never match."],
      day: ["They scream less after the first week."],
      evening: ["Feeding time at dusk. For them. Then me."],
      night: ["Keys never leave my belt. Not at night. Not ever."],
    },
    barks: {
      player: ["Hands where I can see them.", "You've a face I'll remember. That's not a compliment."],
      night: ["Keys never leave my belt. Not at night. Not ever."],
      magic: ["Do that in my cells and you'll stay there."],
    },
  },
  servant: {
    first: ["Good day. I'm not permitted to speak to you. I am speaking to you. Please don't tell anyone."],
    greet: {
      morning: ["The house rises at dawn, which means I rise before dawn."],
      day: ["Errands for the mistress. She wants silk the colour of old blood. All of it is."],
      evening: ["Evening, the guests arrive. I become furniture."],
      night: ["I'm allowed out at night only when something needs burying. Usually papers."],
    },
    barks: {
      player: ["You'll excuse me. My mistress is watching from a window. She always is.", "Your boots are muddy. The house would never allow it."],
      night: ["I'm allowed out at night only when something needs burying. Usually papers."],
      magic: ["Please put that out. The house disapproves of spectacle."],
    },
  },
};

// Two of them stopped to talk in the street: a few lines each way, A first. (Whoever they are: it's the city talking.)
export const CHATTER = [
  ["Heard they hung three off the gibbet tower this morning.", "Only three? Slow week."],
  ["Bone Yards were loud last night.", "Loud's fine. It's when they go quiet you move house."],
  ["You still owe me for the dice.", "I owe everyone for the dice. Get in line."],
  ["Red cloaks on the Mile at noon. Six of them.", "Then I wasn't on the Mile at noon."],
  ["Another lot went up to the Castle today.", "Up's easy. Ask me how many came down."],
  ["Price of bread's doubled.", "Price of everything's doubled. Except us."],
  ["Did you see the light in the top of the Keep?", "I never look at the Keep. You shouldn't either."],
  ["The Wharf's flooding again.", "It's not the water I mind. It's what floats in on it."],
  ["They say there's a guild down under the Rookeries. Thieves that give it back.", "Give what back? And to who? Nobody here's got anything."],
  ["Who's that new one with the staff?", "Another hero. Give it a week."],
  ["Lamb's got a new ale.", "Same piss, new barrel."],
  ["My cousin went to the Mages' Rise for work.", "And?", "And nothing. That's the thing. Nothing."],
];

// Woken in their own bed (src/folk/brain.js phSleep: the crowd sleep at home, src/folk/phobos-homes.js), by a stranger
// stood over them. By the sort of work that has them up: those who work the night are abed by day.
const WOKEN_ANY = [
  "Who let you in? No. Don't tell me. Just go out the way you came.",
  "If the house is on fire, say so. If it isn't, get out of it.",
  "I've nothing worth taking. I checked. Twice.",
  "Is it the Loyal? It isn't. Then it can wait for the light.",
];
const WOKEN_NIGHT = [
  "I work nights. That makes this my night. Get out of my night.",
  "It's broad day. Broad day is when I sleep. Come back at dark like everyone else.",
  "Unless you're paying, I'm asleep. Are you paying? Then I'm asleep.",
];
const WOKEN_EARLY = [
  "The ovens want me in three hours. Every minute you stand there is one I'll feel at the trough.",
  "I'm up before the bells as it is. Let me have what's left of the dark.",
];
const WOKEN_POOR = [
  "It's a bed. It's mine for the night. I paid the penny. Find your own.",
  "Don't kick it. It's only straw, but it's my straw.",
];
const WOKEN_HIGH = [
  "There is a bell for the servants. You are not a servant, and you did not ring it.",
  "My man is downstairs. He'll see you out, one way or another.",
];
const WOKEN_DEAD = [
  "I spend all day with the dead. They don't wake me. Have their manners.",
  "If somebody's died, they'll keep till morning. They always do.",
];
const NIGHT_KINDS = ['watchman', 'lamplighter', 'tavern', 'cutpurse', 'drunk', 'fortune', 'ruffian', 'fence', 'dicer'];
const woken = (kind) => NIGHT_KINDS.includes(kind) ? WOKEN_NIGHT : kind === 'baker' ? WOKEN_EARLY : ['beggar', 'urchin', 'sweep', 'mourner'].includes(kind) ? WOKEN_POOR
  : ['moneylender', 'merchant'].includes(kind) ? WOKEN_HIGH : ['gravedigger', 'bonecarver', 'plaguedoctor'].includes(kind) ? WOKEN_DEAD : WOKEN_ANY;

// Everyone in the crowd, by id, with their kind's lines.
// (Each one's own lines laid over their kind's: theirs where they have them, the kind's for anything they haven't. And the
// castle's eight, posted in its wards, theirs alone.)
const over = (k = {}, o = {}) => ({ ...k, ...o, greet: { ...k.greet, ...o.greet }, barks: { ...k.barks, ...o.barks } });
export const LINES = {
  ...Object.fromEntries(CROWD.map((p) => [p.id, over({ ...KINDS[p.kind], barks: { woken: woken(p.kind), ...KINDS[p.kind]?.barks } }, SAYS[p.base || p.id])])),
  ...Object.fromEntries(Object.entries(SAYS).filter(([id]) => id.startsWith('cs_')).map(([id, v]) => [id, over({}, v)])),
};
