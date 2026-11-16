// Phobos's street crowd (src/folk/people.js CROWD): what each sort of them says to you, aloud as you pass, and to each other
// when two stop to talk (src/folk/brain.js roam). One set to each kind, shared by everyone of that kind. They live under
// Velscour's castle and keep out of the way of what walks for him: nobody here's surprised by a spell, and nobody says his
// name above a mutter. (No Bellmourn in any of it: they've never heard of the place.)
import { CROWD } from '../people.js';

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
      night: ["The Loyal change the watch at the second bell. Don't be on the Approach when they do."],
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

// Everyone in the crowd, by id, with their kind's lines.
export const LINES = Object.fromEntries(CROWD.map((p) => [p.id, KINDS[p.kind]]));
