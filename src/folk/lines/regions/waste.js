// Cinderford and the Ashen Waste: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/waste.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it: nobody at a camp names Velscour or Tessariel, and no line anywhere names anything of the one
// beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs reads every line for it). Out here:
//   Ashgate Halt, Cinderford and Khel are plain folk's; they say "the keep", "red over black", "the riders".
//   The Hollow Watch and Scavengers' Pit are plain folk hiding in sight of the keep's forts and its spire: they name the
//   keep and its lords (they've seen them), and nothing of the other side at all.
// Cinderford's three (Hasket, Colm, Ysolt) have their own lines in src/folk/lines/land.js; their quests are here.
//
// Each with a voice of their own (tools/folk/cast.md, "Cinderford and the Ashen Waste"): Dag Colley the carter (says least;
// notches a stick), Hedda his sister (says the rest; weaves), Old Sarn the porter of Khel (a porter's manners, and a gate he
// shut on his own), Ama Tull his cook (blunt, salts everything), Captain Tolan Renn (rode west to parley and stayed; clipped,
// hard on himself), Vesna Kell his scout (sightlines and fires), Mab Crowe of the Pit (prices everything, the dead
// included), Tad her nephew (soft, counts rings).
// No animals stand at the camps or at Khel: Colm's mule is gone, Edmer's stables are empty, the carts west have stopped.

const DELVE_HINT = "The arch won't open for one alone: come with a company at your back. The Free Company's quartermasters in Bellmourn hire them out.";

export const LINES = {
  // ---------------------------------------------------------------- Ashgate Halt
  dag: {
    first: [
      "Dag Colley. Ashgate Halt. You'll have come from the east. Nobody comes the other way on foot.",
      { after: 'quest:two_tallies', say: "Perrin's stick's in my coat. Nineteen of mine against his forty-four. Dag Colley. This is Ashgate Halt. Past it the trees stop, and so do I." },
    ],
    greet: {
      morning: [
        "Morning. Wind's from the west. Shut your mouth when you walk; it's grit.",
        "Nobody went by in the night. I notch that too. A short notch.",
      ],
      day: [
        "This is where the trees stop. I stop here too.",
        "Selling? Lay it on the tail of the cart. Hedda'll tell you what it's worth. I'll nod.",
      ],
      evening: [
        "Fire's lit. I keep it small.",
        "That's the last of the light on the grey. It goes grey a long way. Then it goes dark the same distance.",
      ],
      night: [
        "Speak low. It carries, out here.",
        "Fires west. Lots. None of them is anyone I'd sit with.",
      ],
    },
    about: [
      "Dag Colley. Carter. I hold the last halt on the west road before the grey ground. I carted salt from Khel and char from Cinderford for twenty-six years.",
      "I keep a stick. A notch for each that goes west past me and doesn't come back east. Perrin keeps one at his arch. His is longer. His is always longer.",
    ],
    ask: {
      dead: [
        "Children, on the road west, by the old stones. Walking in a ring. They stop when a cart comes. They've stopped a long while; no cart comes.",
      ],
      town: [
        "Bellmourn. I took char there. The smith's a slow payer and sends notes. I can't read. Hedda reads them to me, and we laugh.",
      ],
      tally: [
        "A notch a head. Short notch for a quiet night. Long notch for one I knew. Nineteen long ones since spring.",
      ],
      west: [
        "Past here the road goes on seven hundred paces to Cinderford, and the stockade on the ford. Past that, Khel. I used to say 'past that' and mean something.",
      ],
    },
    topics: { tally: 'The stick', west: 'West' },
    bye: ["Go careful.", "Mind the grey. It gets in your boots."],
    barks: {
      player: ["Mm.", "Going west?"],
      morning: ["Short notch."],
      day: ["Trees stop here."],
      evening: ["Keep it small."],
      night: ["Low. It carries."],
      magic: ["...Don't do that facing west.", "Hm. Brighter than our fire."],
    },
    shop: {
      open: [
        "Rolls from Palmers'. Linen. I'll buy what you've carried, if it's not heavy. Nothing's going east to sell it on.",
        "Lay it on the tail of the cart.",
      ],
      closed: ["Not now."],
      buy: ["Yours."],
      sell: ["Done."],
    },
  },

  hedda: {
    first: [
      "He's said his name, has he? That's Dag done for the day. I'm Hedda. His sister. I do the talking and the panniers, and he does the nodding and the notches.",
    ],
    greet: {
      morning: ["Morning. I've a pannier half-staked. Withy's dry out here. Everything's dry out here but the dead, and they're not anything."],
      day: ["Sit if you're sitting. Mind the withies; they're soaking, and they'll have your eye."],
      evening: ["Dag's looking west. He thinks I don't see him do it. I see him do it."],
      night: ["I'll weave by the fire. Hands want something to do in the dark, or they find something."],
    },
    about: [
      "Hedda Colley. I make panniers and creels for the carters, six-stake, close-packed. There were nine carters on this road in spring. I've two orders this month, and one's from Dag.",
      "Dag talks less since the carts stopped. He talked little before. Now I have to listen for it.",
    ],
    ask: {
      dead: [
        "There's a field west, off the road on the left, nobody's sown in years. Straw men in it. Every morning they face the way the last cart went. I watched for a week. I've stopped watching. It's worse not knowing, but it's quicker.",
      ],
      town: [
        "I was in Bellmourn once, at a fair. I sold forty creels and bought a ribbon. I've still got the ribbon. I've not got the forty creels.",
      ],
      weaving: [
        "Six stakes, close-packed, a twist at the rim. Only two on this road weave it that way. I'm one. Lettice Ware's the other. She went west with the May carts.",
      ],
    },
    topics: { weaving: 'The weave' },
    bye: ["Go on. Dag'll nod.", "Mind the withies."],
    barks: {
      player: ["Mind the withies.", "He's nodded. That's a yes."],
      day: ["Six-stake. Close-packed."],
      evening: ["He's looking west."],
      magic: ["Oh, that's handy. Can it dry withy?"],
    },
  },

  // ---------------------------------------------------------------- the Caravanserai of Khel
  sarn: {
    first: [
      "Welcome to the house of Khel. Your name, and your business, and whether you've anything with you that eats. ...No? Then come by. Old Sarn. I keep the gate. I have kept it fifty-one years.",
    ],
    greet: {
      morning: [
        "Good morning. I've unbarred the south gate, as I do every morning. Nobody has come through it. I bar it again at noon.",
        "Nobody on the road. Nobody on the road yesterday. The weather, grey. I say it to the gate. Somebody should.",
      ],
      day: [
        "Ama has the pot, and the board. If you've business with the house, it's with her. If you've business with the gate, it's with me.",
        "Forty mules a night, in a good year. You'd hear the yard from the bend in the road. Listen now. That's what fifty-one years sounds like with the stopper in.",
      ],
      evening: [
        "The lamps would be lit along the arcade now. I've no oil for them. I light the one at the gate. A gate wants a lamp, whether or not.",
        "Don't go round to the north wall at dusk. They're quietest then, and it's easy to stand and look at them.",
      ],
      night: [
        "I sleep in the gate-house. Porters always have. It's the one rule of the house I still keep perfectly.",
        "Late. If you're stopping, there's room inside. There's room for four hundred.",
      ],
    },
    about: [
      "Sarn. Just Sarn; nobody needed the rest. Porter of the Caravanserai of Khel, as my father was. I took the tolls, kept the book, and knew every carter by his knock.",
      "It's an old courtesy, a porter's. You open to anyone who comes with a reason. I have always opened. I am trying to decide if I should have.",
    ],
    ask: {
      dead: [
        "Our people stand under the north wall, facing the stones, the way you stand at a gate waiting on the porter. There is no gate on the north wall. I want you to understand: they are waiting for me, and they are at the wrong wall.",
      ],
      town: [
        "Bellmourn. It's in the book a good deal. 'Bray, smith, Bellmourn, char.' 'Fenwick, barley.' A long way to come for barley. They came anyway. Everyone came here, once.",
      ],
      khel: [
        "A square court, blind walls, a tower at each corner, the well in the middle with two troughs. Stalls under the arcade. The best salt-road house between the ford and the mountains, and I'm told I'm not to say so.",
      ],
      riders: [
        "They came at noon. Riders, red over black, very civil. They asked at the gate for water for their horses. Water is never refused at Khel. ...I've written the time in the book. I've not written anything else.",
      ],
    },
    topics: { khel: 'The house', riders: 'The riders' },
    bye: ["Go in good order. The gate will be here.", "Mind the north wall."],
    barks: {
      player: ["Your business?", "Welcome to the house."],
      morning: ["No arrivals.", "Unbarred."],
      evening: ["A gate wants a lamp."],
      night: ["Barred, now."],
      magic: ["Not in the yard, if you please.", "...That's not in the book."],
    },
  },

  ama: {
    first: [
      "If you're hungry, there's pot. If you're not, there's still pot; it's all there is. Ama Tull. I cooked for four hundred at Khel. Now I cook for him and me and whoever comes, and nobody comes. Eat.",
    ],
    greet: {
      morning: ["Morning. I've the pot on. Barley and what I found. Don't ask what I found."],
      day: [
        "Buying or selling? I'll do either. Copper, cloth, rolls. I'll take what you've no use for; I've a use for everything.",
        "He's at the gate again. He'll stand there till noon. I take him his bowl. He eats it standing. Porters.",
      ],
      evening: ["Sit by the fire and eat, and don't look round the corner of the wall. I mean it."],
      night: ["I sleep with the ladle. It's a good ladle. It's done more than any watch I've known."],
    },
    about: [
      "Ama Tull. Cook of the house of Khel, twenty years. I fed carters, drovers, a bishop once, and a man who said he was a king, who ate like one and paid like a drover.",
      "I was down the root cellar when it happened. Ysolt was down the salt cellar. Sarn was at the gate. That's three of us, and three's what's left.",
    ],
    ask: {
      dead: [
        "They don't eat. That's how I knew, at the end. I put the bowls out, and nobody came for them, and I've never in my life put out a bowl that nobody came for.",
      ],
      town: [
        "Bellmourn? The barley from there's good. Thick in the husk. I'd give a lot for a sack of Bellmourn barley and a morning with nobody standing at the wall.",
      ],
      sarn: [
        "He's a good man. He opens doors. It's what he's for. Don't ask him about the morning. I don't. If I did, he'd tell me, and then we'd both have to carry it.",
      ],
      salt: [
        "Khel's a salt road. Salt came down from the pans in the west, by the cartload, and went east in loaves. Everything here's salted: the walls, the floors, the cook. I'll keep a hundred years.",
      ],
    },
    topics: { sarn: 'Old Sarn', salt: 'Salt' },
    bye: ["Go on. Come back hungry.", "Take a roll. Go on. Take two."],
    barks: {
      player: ["Eat.", "There's pot."],
      morning: ["Pot's on."],
      day: ["Don't ask what I found."],
      evening: ["Don't look round the wall."],
      magic: ["Can that light a fire? Good. Go and light mine."],
    },
    shop: {
      open: [
        "Rolls, my own, salted. Linen, clean, from the stores. And I'll buy what you're carrying. I'll pay in copper. Copper's what I've got. Khel had a lot of pans.",
        "Put it on the board. I'll be fair. I've nobody to cheat, so it's no fun.",
      ],
      closed: ["Pot's on. Come back after."],
      buy: ["Yours. Eat it warm."],
      sell: ["I'll have that. Everything's some use to a cook."],
    },
  },

  // ---------------------------------------------------------------- the Hollow Watch
  renn: {
    first: [
      "Stand still. Off the skyline. ...There. You found us, so somebody told you where. Renn. Captain, of what's here. This is the Hollow Watch. It isn't on any map, and I'd like it to stay off yours.",
    ],
    greet: {
      morning: [
        "Morning. Six fires on the keep's wall overnight. Seven yesterday. We watch. It's most of what we do.",
        "Down off the bank. They've a man on the gate-towers with good eyes, and he has nothing else to do but use them.",
      ],
      day: [
        "If you're trading, it's my board, such as it is. We buy anything that can be carried quietly.",
        "We're nine. We were twelve, and before that, Cinderford's watch. I'll not say more about that. I'll say it once you've earned it.",
      ],
      evening: [
        "They change the guard on the road at dusk. Four ride out, four ride in. You can set your supper by it. We do.",
        "No fire till full dark, and then a small one, in the pit. That's the rule. I made it. I break it on cold nights.",
      ],
      night: [
        "Quiet. Sit low. The keep's gate opens some nights, and what comes out doesn't use the road.",
        "I sleep under the tree. Everyone else sleeps in the hollow. The captain sleeps where he can see. That's a rule too. I didn't make that one.",
      ],
    },
    about: [
      "Tolan Renn. I had the Cinderford watch, thirty on the wall. In spring I rode west with twelve to parley at the keep. I parleyed. Eleven stayed.",
      "I didn't ride home. They'd have followed me back west, the whole wall, and there'd be no Cinderford. So I stopped here, where I can see the gate, and I watch it for them. Don't tell the sergeant. She has enough to carry.",
    ],
    ask: {
      dead: [
        "They don't die, the ones who go in. They come out again in red over black, facing the way they're pointed. I've seen two of mine on the road. I didn't loose. I should have.",
      ],
      town: [
        "Bellmourn sent me a letter once, very civil, with no men in it. I kept it. It's good for starting a fire, and it's the only thing out of the east that's ever been useful here.",
      ],
      keep: [
        "Blackvigil. A curtain wall, four towers, a keep, a taller one behind. Braziers down the road to it, lit day and night. And an arch before the gate, with a light in it, that the garrison walks round.",
      ],
      parley: [
        "I asked for terms. A big man with a villager's face and no helm heard me out, very patient. Then he gave me back my eleven, standing in a row, facing the wrong way. I rode off with Vesna up behind me. That was the parley.",
      ],
    },
    topics: { keep: 'The keep', parley: 'The parley' },
    bye: ["Off the skyline. Go.", "Quietly."],
    barks: {
      player: ["Off the skyline.", "Down. Low."],
      morning: ["Six fires."],
      evening: ["Guard's changing."],
      night: ["Sit low."],
      magic: ["PUT THAT OUT. ...Quietly. Put it out quietly."],
    },
    shop: {
      open: [
        "Rolls, a week old, which is young out here. Linen. And I'll buy what you've carried in. Pay's poor. The keep doesn't send us much.",
        "Lay it down. Quietly. Everything here's quietly.",
      ],
      closed: ["Not now. Watching."],
      buy: ["Take it. Don't drop it on the stones."],
      sell: ["Done. Don't tell anyone where you sold it."],
    },
  },

  vesna: {
    first: [
      "I've had you since the bend in the road. You walk loud. Vesna. I'm the scout. I go up the tree and come down and tell him what's moved. Mostly nothing. Mostly is the part that kills you.",
    ],
    greet: {
      morning: ["Morning. I've been up. Six fires on the wall, two on the road, the gate shut. It's always shut. That's what I look at hardest."],
      day: ["Smoke from the east again. The fires at Smokefast. On an east wind it lies right over us. It's why we're still here."],
      evening: ["Down from the tree for supper. Ten breaths, then up. He says I needn't. I needn't."],
      night: ["Look. Past the dead tree, a hand left of the brightest fire. That's the gate. When it opens you see a line of light. Not tonight."],
    },
    about: [
      "Vesna Kell. From Cinderford. I was the captain's runner when we rode to parley. I rode back up behind him. I'm the only one who did.",
      "I can see the keep's top from the tree, and its fires, and the road. I can't see the gate. The ground's wrong. Since spring, and I've never seen it close.",
    ],
    ask: {
      dead: [
        "The ones who walk out of the keep don't look about. They know where they're going. That's what I watch for: anybody looking about. It'll be one of ours, come back.",
      ],
      town: [
        "Cinderford. My mother's at the kilns. She thinks I'm dead. It's kinder. That's what he says. I've stopped saying it back.",
      ],
      fires: [
        "Six on the wall, four along the road, two at the arch, and the big one at the top of the tall tower that never goes down. I watch them every hour. When one goes out I know something moved to put it out.",
      ],
    },
    topics: { fires: 'The fires' },
    bye: ["Walk quieter.", "Go round the tree, not under it."],
    barks: {
      player: ["You walk loud.", "Round the tree."],
      day: ["Six on the wall."],
      evening: ["Ten breaths."],
      magic: ["That'll be seen from the wall. Do it in the hollow."],
    },
  },

  // ---------------------------------------------------------------- Scavengers' Pit
  mab: {
    first: [
      "Stop there and turn round slow. ...No harness worth having. You're alive, then; the dead dress better out here. Mab Crowe. This is the Pit. We take what the Field gives, and we sell it to whoever's still buying.",
    ],
    greet: {
      morning: [
        "Morning. The worms were up in the night. Ground's turned over north-west. That's money lying in the ash.",
        "Six of us went out at first light, and six came back. Write that down somewhere. It doesn't happen often.",
      ],
      day: [
        "Buying or selling? Selling, everyone's selling. I'll buy. I'll buy anything that isn't still attached to someone.",
        "That's the Finger, south, up on its rock. Of an evening they lean over the top and loose at my diggers. For sport. Keep by the ribs.",
      ],
      evening: [
        "Light's going. The sick ones in iron come down off the east ridge about now. Keep by the ribs.",
        "Sit. Eat. Don't look in the pot. It's honest food; it's only the pot that's been places.",
      ],
      night: [
        "Hear the Field? Bones on bones, like dice. Something big walks it of a night. We don't.",
        "We sleep in the ribs. Something died here so long ago it's turned to stone, and it keeps the wind off. That's the most use anything dead's been to me.",
      ],
    },
    about: [
      "Mab Crowe. I've picked the Bone Field thirty years, and my mother before me, and hers. There was a battle here once, bigger than anyone can remember. It's still paying out.",
      "The keep's men leave us be, mostly. We're crows, to them. Since spring they've taken to shooting at the crows, of an evening, to pass the time.",
    ],
    ask: {
      dead: [
        "The old dead are good dead. Lie still, keep their rings, wait. It's the new ones you've to watch. They get up. No manners.",
      ],
      town: [
        "Bellmourn buys our iron, through three pairs of hands, and never knows it. There's a smith there who's made half his nails from a battle he's never heard of.",
      ],
      field: [
        "West, past the skull with the horn. Ribs the size of a barn, and the spine between. The keep's put its red up on poles down both sides and a black slab between two fires. They feed something there. We don't go to see what.",
      ],
      larder: [
        "The Grey Larder. A cleft in the rock west, cool as a cellar. The Pit's flour's in it, and the salt pork, and since April the widows. I can see my sacks from the mouth of it. Webbed to the roof.",
      ],
    },
    topics: { field: 'The Bone Field', larder: 'The Grey Larder' },
    bye: ["Go on. Come back with something.", "If it's shiny, it's mine first."],
    barks: {
      player: ["Selling?", "Turn round slow."],
      morning: ["Worms were up."],
      day: ["Heads down, by the Finger."],
      evening: ["Keep by the ribs."],
      magic: ["Don't light the Field up! You'll wake it.", "Mm. What's that worth?"],
    },
    shop: {
      open: [
        "I'll buy anything. I sell rolls, from Khel when Khel had flour, and linen off the dead, boiled. It's clean. They didn't need it.",
        "Put it on the slab. I'll tell you what it's worth. Then I'll tell you what I'll pay. They're different numbers.",
      ],
      closed: ["Not now. Sorting."],
      buy: ["Yours. Don't tell me where you'll wear it."],
      sell: ["Mine now. Pleasure doing business."],
    },
  },

  tad: {
    first: [
      "Aunt Mab'll have told you to turn round slow. You did? Good. She likes that. I'm Tad. I do the far side of the Field, and the rings. Mostly the rings.",
    ],
    greet: {
      morning: ["Morning! The worms were up. The Churned Ground'll be thick with it. I'd go myself, only I've been told."],
      day: ["I've forty-one rings. In a bag. I count them. Aunt Mab says it's a bad habit for a scavenger. You're meant to sell them."],
      evening: ["Don't sit with your back to the Field. It's not that anything comes. It's that you keep wanting to look."],
      night: ["I can't sleep in the ribs. The wind goes through them like a comb. Aunt Mab says it's restful. It isn't."],
    },
    about: [
      "Tad Crowe. Mab's my aunt; my mother was her sister. She went to Khel to marry and I came back with a cart and a box. I was six.",
      "I'm not good at this. You're meant to look at a dead man and see boots. I see a dead man. Aunt Mab says I'll grow out of it.",
    ],
    ask: {
      dead: [
        "The old ones are all right. Green. Quiet. You can talk to them while you work, and I do, and they don't mind.",
      ],
      town: [
        "I'd like to go to Bellmourn. I'd like to see a street with nobody dead in it. I'd walk up and down it all day.",
      ],
      rings: [
        "Every ring's green that comes out of the Field. Copper goes green; gold goes dull. Three hundred years in the ash. You can't read them. I make up names for them.",
      ],
    },
    topics: { rings: 'The rings' },
    bye: ["Go careful by the worms.", "Bring me a ring? No. Don't. Well, if you see one."],
    barks: {
      player: ["Did you turn round slow?", "Forty-one."],
      day: ["The worms were up."],
      night: ["Like a comb."],
      magic: ["Whoa. Can you do that again? No, Aunt Mab'll see."],
    },
  },
};

export const QUESTS = {
  // ================================================================ Ashgate Halt (Dag Colley; Hedda Colley)
  mile_plates: {
    title: 'Five Miles to Cinderford',
    giver: 'dag',
    about: "The mileposts on the Vigil Road between Ashgate Halt and Cinderford have lost their iron plates, one a night. Dag Colley found the kobolds at Pickfall Delve, north-west of the halt, prising them off. Pick up five plates from round the diggings and bring them back to him.",
    offer: [
      "Mileposts, on the road west. Iron plates on them, cast at Cinderford. 'Cinderford, four.' 'Three.' In ash-fog you steer post to post. A plate a night's gone since the carts stopped.",
      "Kobolds. Pickfall Delve, north-west. I saw one going home with a plate on his back like a shield. Fetch me five. I'll nail them up. Somebody may want to find the place.",
    ],
    accept: "Five plates. I'll fetch them.",
    acceptLine: "North-west, three hundred and fifty paces, up the trail. The diggings. The plates'll be lying about outside, in their spoil. Don't go in. That's another job.",
    decline: 'Not now.',
    declineLine: "Mm. The posts'll keep.",
    journal: [
      "The kobolds of Pickfall Delve, north-west of Ashgate Halt, have been prising the iron plates off the Vigil Road's mileposts. Pick up five plates from round their diggings.",
      "Take the plates back to Dag Colley at Ashgate Halt.",
    ],
    progress: ["North-west. The diggings. Five plates."],
    done: [
      "Cinderford, five. Four. Four again. Two. One. ...All Cinderford. There were plates for Khel past the ford, and for Bellmourn going east. They've left those.",
      "Kobolds can't read. So somebody told them which ones. Hm. Here. For the walk.",
    ],
    after: ["I've nailed them up. Crooked. Hedda says they'll do. Somebody can find Cinderford again, if they want it."],
    others: {
      hedda: ["Plates? Good. He's been walking out to the bare posts every morning and touching them. Like a man feeling for a tooth."],
    },
  },

  pickfall: {
    title: 'Pickfall Delve',
    giver: 'dag',
    about: "Somebody's been telling the kobolds at Pickfall Delve, north-west of Ashgate Halt, which mile-plates to take off the Vigil Road's posts. Dag Colley wants the diggings emptied, foreman and all, before they're told anything else.",
    offer: [
      "Kobolds. Pickfall Delve, north-west. They've had the iron off my mileposts. Only the ones that say Cinderford. Somebody's telling them which. That's a new thing. I don't like new things out here.",
      "The diggings. All of them, and the foreman with the lamp on his head. Before they're told something else.",
    ],
    accept: "I'll empty the diggings.",
    acceptLine: "North-west, three hundred and fifty paces, up the trail. The foreman's the one that doesn't dig. Mind the spoil-heaps. They tip.",
    decline: 'Not yet.',
    declineLine: "Mm.",
    journal: [
      "Empty Pickfall Delve, the kobolds' diggings north-west of Ashgate Halt: its foreman and all of them.",
      "Go back to Dag Colley at Ashgate Halt.",
    ],
    progress: ["The foreman. The one that doesn't dig."],
    done: [
      "Empty. Good. I'll sleep. Not much. I don't, much.",
      "Here. Hedda's coat. Waxed. She made it for me to go west in. I don't go anywhere. You do.",
    ],
    after: ["Quiet up at Pickfall. I listen for picks of a night. A short notch, every night."],
    others: {
      hedda: ["He's given you my coat? ...Good. It was wasted on a peg. Keep the wax on it."],
    },
  },

  withy_bundles: {
    title: 'Cut Close and Low',
    giver: 'hedda',
    about: "Somebody has been cutting withy in the osier beds round the Watching Acre, west of Ashgate Halt, and leaving it tied in bundles to season, cut close and low the way only two weavers on the road were taught. Hedda Colley is one. She wants five of the bundles brought back to her.",
    offer: [
      "There's osier beds west, round the field with the straw men in it. Nobody's cut there since spring. Only Dag went by last week, and he says there's bundles of it lying tied by the posts. Fresh cut.",
      "Bring me five. I want to see the cut. If it's close and low and on the slant, there's only one person on this road besides me who'd cut it so.",
    ],
    accept: "Five bundles of withy.",
    acceptLine: "West, five hundred paces, a trail off the road on your left. The bundles are round the edge of the beds. Leave the straw men be. They don't like being looked at.",
    decline: 'Not now.',
    declineLine: "No. It'll season where it lies. That's what it's for.",
    journal: [
      "Somebody has been cutting withy round the Watching Acre, west of Ashgate Halt, and leaving it in bundles. Pick up five bundles from round the osier beds.",
      "Take the withy back to Hedda Colley at Ashgate Halt.",
    ],
    progress: ["West. Round the beds by the Acre. Five bundles."],
    done: [
      "Close, low, on the slant, and tied with a twist at the top. ...That's Lettice Ware's knot. She went west with the May carts. Nobody else ties it.",
      "She's out there, then. Cutting withy to season, like it's an ordinary spring. For a pannier nobody's ordered. Here. For the walk. I'll weave hers in with mine.",
    ],
    after: ["I've woven Lettice's withy into a creel. It'll hold. Her cut always held. I've hung it where Dag can see it."],
    others: {
      dag: ["Hedda sent you to the osiers. Mm. I told her about the bundles. I wish I hadn't. I wish I had sooner."],
    },
  },

  nineteen_going_west: {
    title: 'The Other Tally',
    giver: 'dag',
    needs: 'pickfall',
    about: "Dag Colley keeps a stick with a notch for everyone who goes west past Ashgate Halt and doesn't come back: nineteen since spring. He wants it taken west, past the dead children who walk in a ring by the old stones on the road, to the sergeant at Cinderford's wall, who counts what comes the other way. It's paid there.",
    offer: [
      "Perrin's stick came to me. Mine wants to go further. Cinderford. There's a sergeant on the wall there, Hasket. She counts too. What comes east, past her.",
      "Take her my stick. Nineteen. Lay it by hers. ...On the way, by the road, there's children walking in a ring. Put two of them down. They're not children. They were.",
    ],
    accept: "I'll take your stick west.",
    acceptLine: "West, on the road. The children are by the old stones, three hundred paces on. Then the grey, then a stockade on a ford. The sergeant's at the foot of the watchtower, inside the gate. Short notch.",
    decline: 'Not west.',
    declineLine: "Mm. Nobody does. It's how I've got nineteen.",
    journal: [
      "Dag Colley sends his stick of those gone west past Ashgate Halt. On the road west, by the old stones, put down two of the dead children who walk there in a ring.",
      "Take the stick on west to Sergeant Brenna Hasket, at the foot of Cinderford's watchtower inside the gate.",
    ],
    progress: ["West. The children by the stones. Then the ford."],
    done: [
      "Dag Colley's stick? Nineteen. Long notches. ...He sent you seven hundred paces to give me that? Then he wants to know what I count. Sit down.",
      "I count what comes east past my wall at dusk. Walking. Not alive. I'm at nineteen. Here. You're on my wall now. Colm Burrage at the kilns has work for you, and Ysolt Marrow by the ford. So have I.",
    ],
    after: ["I've sent Dag back a notch. Just one. He'll know what it's for."],
    others: {
      hasket: [
        "Dag Colley's stick? Nineteen. Long notches. ...He sent you seven hundred paces to give me that? Then he wants to know what I count. Here, for the walk.",
        "I count what comes east past my wall at dusk. Walking. Not alive. I'm at nineteen. You're on my wall now. Colm Burrage at the kilns has work for you, and Ysolt Marrow by the ford. So have I.",
      ],
      hedda: ["He's sending his stick to Cinderford? He's never let it out of his coat. Go on, then. Mind the children by the stones."],
    },
  },

  // ================================================================ Cinderford (Sergeant Brenna Hasket; Colm Burrage; Ysolt Marrow)
  ash_on_the_wind: {
    title: 'They Know the Gate-Word',
    giver: 'hasket',
    about: "Four of Cinderford's own went west in spring with the captain and came back last night, possessed, and gave the gate-word at the wall: right word, wrong eyes. They stand on the rise south-west of the ford. Sergeant Hasket's watch won't loose at men they danced at the weddings of. Put three of them down.",
    offer: [
      "Four of ours came back last night. Went west in spring with the captain. They stood under the wall and gave the gate-word, clear as you like. Right word. Wrong eyes.",
      "I didn't open. They've gone up on the rise south-west of the ford, and they stand there. My lads won't loose at them. They were at their weddings. You weren't. Three. Leave me the fourth.",
    ],
    accept: "I wasn't. I'll do it.",
    acceptLine: "South-west of the gate, on the rise, two hundred and fifty paces. They'll talk to you. They'll use your name if they hear it. It isn't them.",
    decline: 'Not that.',
    declineLine: "No. Then they stand there, and the wall watches them stand. That's a bad thing for a wall.",
    journal: [
      "Four of Cinderford's own have come back from the west possessed, and stand on the rise south-west of the ford. Put three of them down.",
      "Go back to Sergeant Hasket at the foot of Cinderford's watchtower.",
    ],
    progress: ["The rise above the ford. Three. Don't give them your name."],
    done: [
      "Three. ...I'll tell the wall they went quick. Did they? Don't answer. I'll tell it anyway.",
      "The fourth's Corlew; he was always last at muster. He'll come to the wall tonight and give the word, and I'll answer him. Somebody should. Here. Watch pay. I've changed the gate-word.",
    ],
    after: ["The lads buried three at the ford, faces east. I let them have the afternoon. First I've given."],
    others: {
      ysolt: ["She had you do it. I know why. I'd not have asked you either, in her place. I'd have wanted to."],
    },
  },

  mule_shoes: {
    title: "Bess's Shoes",
    giver: 'colm',
    about: "Colm Burrage's mule went missing in the wood north of Cinderford, where the wolfkin have their den. He doesn't expect her back. He wants her four shoes, from round the outside of the Ash Den, so he knows it was her.",
    offer: [
      "Mm. I had a mule. Bess. Carried char to Khel and back, thirty trips a year, and never once kicked anyone who didn't need it. She went into the wood north a month back for the good grass. The wolfkin have a den there.",
      "I'll not get her back. I'd like her shoes. Four. If they're hers, I'll know. Edmer at Khel shod her every spring, and he cut his own nails, square-headed. Nobody else did that.",
    ],
    accept: "I'll look for her shoes.",
    acceptLine: "North, four hundred and sixty paces, up the trail into the wood. The Ash Den's a hole under a bank. The shoes'll be lying round outside it, where they drag things. Not in. Round.",
    decline: 'Not now.',
    declineLine: "Mm. She'll keep. That's the trouble.",
    journal: [
      "Colm Burrage's mule went into the wood north of Cinderford and the wolfkin of the Ash Den had her. Pick up four of her shoes from round the outside of the den.",
      "Take the shoes back to Colm Burrage at the kilns in Cinderford.",
    ],
    progress: ["North. The Ash Den. Round the outside. Four shoes."],
    done: [
      "Square heads. Edmer's nails. ...That's Bess, then. Four good years of his nails. That's more than he's had.",
      "Here. For the walk. And for not telling me what else was lying round there. I can see you're not.",
    ],
    after: ["I've hung her shoes on the kiln door. Upside down, so the luck runs out. She'd used it all anyway."],
    others: {
      ysolt: ["Edmer's nails? He'd sit on the mounting block with them in his mouth and talk round them. Nobody could understand a word. He talked anyway."],
    },
  },

  the_ash_den: {
    title: 'A Quiet Wood',
    giver: 'colm',
    about: "Colm Burrage's oak stands cut and stacked in the wood north of Cinderford, round the wolfkin's den, and he hasn't been able to fetch it for a month. A burner without wood is a man with a hole in the ground. He wants the Ash Den emptied, the big one with the red eye and all.",
    offer: [
      "My oak's cut. Stacked in that wood north, round the wolfkin's den, a winter's worth. I've not been able to fetch a stick of it in a month. A burner without wood's a man with a hole in the ground.",
      "Empty the den. All of it, and the big one with the red eye. I saw it once, stood on my stack, looking at the town like it was counting the chimneys.",
    ],
    accept: "I'll empty the den.",
    acceptLine: "North, four hundred and sixty paces, up the trail into the wood. The big one comes out last, when it's sure. Don't be stood in front of the hole when it's sure.",
    decline: 'Not wolves.',
    declineLine: "Mm. They're not wolves. That's the trouble with them.",
    journal: [
      "Empty the Ash Den, the wolfkin's den in the wood north of Cinderford, its red-eyed chief and all, so Colm Burrage can fetch his oak.",
      "Go back to Colm Burrage at the kilns in Cinderford.",
    ],
    progress: ["The den. The big one comes out last."],
    done: [
      "Empty. Then I'll have my oak in by Thursday and a burn lit by Friday, and the sergeant'll have her braziers. Mm. Good.",
      "Here. My poking-staff. Forty years in the fire, and it's never caught: ash-wood, cut green and hardened in the stack. I'll cut another. I'll not be poking anything for a while.",
    ],
    after: ["White smoke again, from the north pit. Day one. Hear her? Like a cat."],
    others: {
      hasket: ["Colm's going to burn again? Good. A town that smells of char is a town that's still here."],
    },
  },

  tally_tags: {
    title: 'Brass on the Straw Men',
    giver: 'ysolt',
    about: "Every carter who weighed at Khel carried a brass tally-tag with his mark on it. Ysolt Marrow, who kept the weighing table, has seen them glinting on the scarecrows in the Rows north-west of Cinderford. She wants five of them brought to her, so she can read whose they are.",
    offer: [
      "Every carter who weighed at Khel had a brass tag with his mark: a mule, a wheel, a fish, a crooked cross. I gave them out. I knew them all.",
      "There are scarecrows in the Rows, north-west, and they're wearing our tags. I've seen them catch the sun from the ford. Bring me five. I'll read them. I'd like to know who they've dressed up.",
    ],
    accept: "I'll bring you five tags.",
    acceptLine: "North-west, two hundred and seventy paces, up the trail. They hang on the posts, at the edge, and on the ones that walk. Don't stand and read them there. Bring them here and I will.",
    decline: 'Not now.',
    declineLine: "No. They'll be there. They don't take them off.",
    journal: [
      "The scarecrows in the Rows, north-west of Cinderford, wear the brass tally-tags of Khel's carters. Bring five of them to Ysolt Marrow, who gave them out.",
      "Take the tags to Ysolt Marrow at the refugees' camp by Cinderford's ford.",
    ],
    progress: ["The Rows. North-west. Five tags."],
    done: [
      "Wheel: Hob Tarrant. Fish: the Lusk boys. Crooked cross: Old Pell. Mule: that's the stables, Edmer's. And this...",
      "This is mine. The scale with a bar through. I never gave mine up. I left it on the table when I went down for the salt. ...They've hung me up with the rest. Here. Take something for it. I don't want anything that's been near it.",
    ],
    after: ["I've thrown mine in the ford. It's still there. I can see it from here. I'll stop looking."],
    others: {
      colm: ["The tags? She gave me one, the first year, though I didn't weigh: a little kiln. Mm. I've still got it. I'll not be going to the Rows to see if I'm on a post."],
    },
  },

  red_scouts: {
    title: 'Two on the Ridge',
    giver: 'hasket',
    needs: 'ash_on_the_wind',
    about: "Two of the keep's knights have stood on the ridge west of Cinderford for six days, beside the Vigil Road, counting the wall at dawn and dusk. Sergeant Hasket wants one of them killed. The other can carry the count home one short.",
    offer: [
      "Two of them, without their horses, on the ridge west, off the road. Red over black. Six days. They count my wall at dawn and at dusk. Somebody's being told how many I've got.",
      "Kill one. Just one. Let the other carry it home. A count that comes back one short is a count somebody has to explain, and I'd like them explaining for a change.",
    ],
    accept: "One of them.",
    acceptLine: "West along the road, near six hundred paces, then up on your right. Full harness. Hit what isn't plate. If the second one stands, kill it too. I said I'd like. I didn't say I'd insist.",
    decline: 'Not knights.',
    declineLine: "No. Then they go on counting. I've started standing the cook on the wall, to spoil the sum.",
    journal: [
      "Two of the keep's knights are watching Cinderford from the ridge west of it, beside the Vigil Road. Kill one of them.",
      "Go back to Sergeant Hasket at the foot of Cinderford's watchtower.",
    ],
    progress: ["West, six hundred paces, the ridge on the right. One."],
    done: [
      "One. And the other? ...Doesn't matter. Dead or running, someone at the keep gets a count one short tonight.",
      "Here. That was the captain's rate, not a watchman's. You did a captain's job.",
    ],
    after: ["Nobody on the ridge at dawn. I counted my own wall, for the pleasure of being the only one doing it."],
    others: {
      colm: ["The two on the ridge? I saw their fire. Tiny thing. No smoke. Somebody taught them that, and it wasn't a charcoal burner."],
    },
  },

  word_to_the_porter: {
    title: 'The Cloak',
    giver: 'ysolt',
    needs: ['tally_tags', 'red_scouts'],
    about: "Ysolt Marrow's husband Edmer stands at the door of the Charred Mill, near Khel, with four out of its yard. She can't be the one to put him down. She sends her cloak, her best thing, west to Old Sarn, the porter of Khel, for whoever does. It's paid there.",
    offer: [
      "I'll say it once and then I'd like not to. My husband's at the burnt mill near Khel. Edmer. With four from our yard. They stopped walking there and never started again. He stands at the door, in the blue jerkin I mended.",
      "I can't be the one. Take my cloak west to Sarn, the porter at Khel. He stayed. He'll know what it's for. And there's knights by the road short of Khel. Two of them, at least, mustn't follow you in.",
    ],
    accept: "I'll take your cloak to Khel.",
    acceptLine: "West on the road, the long way, half an hour, past where the ridge was. The knights sit off the road on the left, short of the bend. Khel's walled, with towers. Sarn's by the gate, at the south.",
    decline: "I can't do that.",
    declineLine: "No. No, that's fair. I couldn't either.",
    journal: [
      "Ysolt Marrow sends her cloak west to Khel, for whoever puts her husband to rest. On the Vigil Road short of Khel, put down two of the knights who sit off the road.",
      "Take the cloak to Old Sarn, the porter of the Caravanserai of Khel, by its south gate.",
    ],
    progress: ["West. The knights short of the bend. Then Khel, and Sarn at the gate."],
    done: [
      "Ysolt's cloak. Her mother wove it, and she waxed it herself. She'd not part with it for less than one thing. ...Edmer. Yes. I know where he stands.",
      "Come in. Be welcome in the house. Rest, and when you've rested, ask me about the mill. I'll tell it you plain.",
    ],
    after: ["She sent the cloak. I've hung it on the gate-house peg, where I can see it. It's the first thing anyone's sent to Khel since spring."],
    others: {
      sarn: [
        "Ysolt's cloak. Her mother wove it, and she waxed it herself. She'd not part with it for less than one thing. ...Edmer. Yes. I know where he stands. Here: the house pays for what's carried to it.",
        "Be welcome in the house. Rest. And when you've rested, ask me about the mill. I'll tell it you plain.",
      ],
      hasket: ["The Marrow girl's sending you to Khel? Then go. I'd have sent men a month ago if I'd had men who didn't know him."],
      colm: ["Edmer Marrow shod my mule every spring and never once charged for the nails. Mm. Be quick with him."],
    },
  },

  // ================================================================ the Caravanserai of Khel (Old Sarn; Ama Tull)
  weights_for_the_table: {
    title: 'The Weighing Table',
    giver: 'sarn',
    about: "Khel's weighing table stood in the yard, and its brass weights went with Khel's own people when they walked round to the north wall, in their pockets and their hands. They've dropped them, round about. Old Sarn wants five picked up off the ground, so the house can weigh again.",
    offer: [
      "The weighing table's in the yard. The weights aren't. Brass, stamped with the house's mark. Our people had them in their aprons when they walked round to the north wall, and they've let them fall, the way you'd let anything fall.",
      "Pick me up five. Off the ground round the wall, not off them. Don't go close. They stand facing the stones; they'll not turn for you unless you make them.",
    ],
    accept: "Five weights.",
    acceptLine: "Round the outside, west and then north, to the back of the house, a hundred and fifty paces. The weights'll be lying in the ash, a stone's throw out from the wall. Don't go through the yard.",
    decline: 'Not now.',
    declineLine: "No. The table can stand empty a while longer. It's had practice.",
    journal: [
      "Khel's own people dropped the brass weights of its weighing table round the north wall, where they stand. Pick up five of them off the ground, for Old Sarn.",
      "Take the weights back to Old Sarn by Khel's south gate.",
    ],
    progress: ["The north wall. Off the ground, not off them. Five."],
    done: [
      "The pound, the half, the two-ounce, the ounce, the ounce again. ...No quarter-ounce. And you looked. I can see you looked.",
      "Ama has it. In her apron pocket, since that morning. She thinks a full set means the house is done with, and somebody comes and sells the table. I've never asked her for it. Here. For the carrying.",
    ],
    after: ["I've set the weights out on the table, in their row, with the gap. Ama dusts round the gap. Neither of us says why."],
    others: {
      ama: ["He's sent you for the weights? ...Go on. Mind you bring them round the outside. He'll want to set them out himself. Let him."],
    },
  },

  salt_on_the_track: {
    title: 'A Corner off Each',
    giver: 'ama',
    about: "The carts were on the Mill Track, north-east of Khel, the morning the yard went still, and their salt went into the ash. Ama Tull wants five loaves of it picked up from round the burnt mill. She'll salt the pot with them. Salt doesn't know where it's been.",
    offer: [
      "Four carts were on the Mill Track the morning it happened, going up to the burnt mill with salt. They stopped where they stood, and the salt went in the ash. Loaves of it, wrapped. I've been cooking with ash and wishing.",
      "Fetch me five. From round the mill; that's where they stopped. I'll salt the pot. What? It's salt. It doesn't know where it's been. That's what I like about it.",
    ],
    accept: "Five loaves of salt.",
    acceptLine: "Back east on the road to where the Mill Track goes off north, and up it, to the black mill. The loaves'll be round about, on the track and off it. Keep off the door. Who stands at it, ask Sarn.",
    decline: 'Not now.',
    declineLine: "Then it's ash in the pot again. I'm used to it. I'm not happy about it.",
    journal: [
      "The carts going up to the Charred Mill with salt stopped where they stood, the morning Khel went still. Pick up five loaves of salt from round the mill, north-east of Khel up the Mill Track.",
      "Take the salt back to Ama Tull at Khel.",
    ],
    progress: ["The Mill Track. Round the mill. Five loaves."],
    done: [
      "Five. Good salt. ...Look. A corner off each. Cut clean. That's the porter's toll: a corner a loaf, to show they've been passed at the gate.",
      "Sarn passed these, that morning. At the gate. He's never said he was at the gate that morning. ...Here. Take this. Don't ask him. I'm not going to.",
    ],
    after: ["The pot tastes of something again. He had two bowls. He didn't say why it was better. I didn't tell him."],
    others: {
      sarn: ["Ama has you fetching her salt? Mind you bring it to the gate first. ...That's a joke. I was a porter fifty-one years. I'm allowed one."],
    },
  },

  charred_mill: {
    title: 'The Charred Mill',
    giver: 'sarn',
    needs: 'word_to_the_porter',
    about: "Edmer Marrow kept Khel's stables thirty years. He stands possessed at the door of the Charred Mill, up the Mill Track north-east of Khel, in the blue jerkin Ysolt mended, with four of the yard's people round him. She sent her cloak for whoever puts him to rest. Old Sarn holds it.",
    offer: [
      "Edmer kept my stables thirty years. He walked east with the rest of them that afternoon, as far as the burnt mill, and there they stopped. He stands at the door, the tall one, in the blue jerkin. Four of the yard round him.",
      "Ysolt sent her cloak, and I know what for. I can't leave the gate. You can. Put him to rest, and all four with him; don't leave him standing among the last. He'll say good evening to you. Please don't say it back.",
    ],
    accept: "I'll go to the mill.",
    acceptLine: "Back east on the road to the Mill Track, and north up it, six hundred paces in all. The mill's black; you can't mistake it. He's the tall one at the door. Then come and take her cloak off my peg.",
    decline: "I can't do that.",
    declineLine: "No. Nobody could, who knew him. You didn't. That's why I ask.",
    journal: [
      "Go to the Charred Mill, up the Mill Track north-east of the Caravanserai of Khel.",
      "Put Edmer Marrow to rest at the mill's door, the tall one in the blue jerkin, and all four who stand round him: five in all.",
      "Go back to Old Sarn by Khel's south gate.",
    ],
    progress: ["The burnt mill. Edmer, the tall one, and all four with him."],
    done: [
      "At rest. I'll write him in the book. 'Edmer Marrow, stables, departed.' Thirty years. It's a short line for thirty years.",
      "Her cloak. Take it off the peg. It came out of Khel on her back and it's the best thing she owns, and she sent it for this. Wear it. Don't keep it nice.",
    ],
    after: ["I sent word east by a tinker who wouldn't stop: 'At rest.' Two words. Ysolt will know which two."],
    others: {
      ama: ["The mill? Then he's sending you to Edmer. Eat first. Nobody should do that hungry."],
    },
  },

  the_lost_captain: {
    title: 'The Porter Keeps the Gate',
    giver: 'sarn',
    needs: ['charred_mill', 'weights_for_the_table'],
    about: "There's a watch hidden under a dead tree west of Khel, in sight of the keep, that Old Sarn isn't meant to know about. Its captain came through his gate in spring with twelve, riding west to parley, and came back with none and didn't stop. Sarn sends him a word, past the lancers who sit on the road. It's paid there.",
    offer: [
      "There's a watch west of here, under a dead tree, in sight of the keep. I'm not meant to know. A porter knows who passes. Its captain came through my gate in spring, from the ford, with twelve. He came back with one up behind him, and didn't stop.",
      "Take him a word. 'The porter still keeps the gate.' He'll know it's me, and that I'm still the porter. ...There are lancers on the road west. Three of them, at least, would rather you didn't arrive.",
    ],
    accept: "I'll take your word west.",
    acceptLine: "West along the road, most of half an hour, past the lancers by the bend, then off it south, by the lane, to where a dead tree stands up out of the grey. Walk low when you're near. Say my word.",
    decline: 'Not yet.',
    declineLine: "No. The gate's been kept this long. It'll keep.",
    journal: [
      "Old Sarn sends word to a hidden watch under a dead tree west of Khel. On the Vigil Road west, put down three of the lancers and knights who sit by the bend.",
      "Find the Hollow Watch, south of the road under its dead tree, and give its captain Old Sarn's word.",
    ],
    progress: ["West. The lancers by the bend. Then the dead tree, and walk low."],
    done: [
      "'The porter still keeps the gate.' ...Sarn. The old devil. He opened for me, going west, and I didn't stop for him coming back. He'd write it in the book. 'Passed.' Nothing else.",
      "Renn. Tolan Renn. I had the Cinderford watch, once. Sit. Off the skyline. You've earned the bank, and I've work.",
    ],
    after: ["Sarn's word's on a slip in my coat. I take it out on bad nights. It isn't long. It doesn't need to be."],
    others: {
      renn: [
        "'The porter still keeps the gate.' ...Sarn. The old devil. He opened for me going west, and I didn't stop for him coming back. Here. For the walk, and the lancers.",
        "Renn. Tolan Renn. I had the Cinderford watch, once. Off the skyline. Sit. You've earned the bank, and I've work, if you've the stomach.",
      ],
      vesna: ["You came from Khel? Sarn's alive? ...I'll go up and tell the tree. Somebody should know besides us."],
      ama: ["West? To the tree? He thinks I don't know about it either. Take a roll. Take two. They don't eat out there."],
    },
  },

  copper_for_the_pit: {
    title: 'Pans for Flour',
    giver: 'ama',
    needs: ['the_lost_captain', 'salt_on_the_track'],
    about: "Ama Tull has copper pans and no flour. Mab Crowe, at Scavengers' Pit among the bones north of Khel, buys anything and has flour. Take her the pans, through the Widows' Hollow on the trail north, and under the Black Finger, whose men come down on anyone carrying a load past their rock. It's paid there.",
    offer: [
      "I've forty copper pans and no flour. Mab Crowe at the Pit, north, among the bones, buys anything, and she's always got flour. Nobody asks where. Take her the pans. It's a long carry; I'd not ask it of a beginner.",
      "On the trail north there's a hollow full of grey widows, big as a cart-wheel. Mind them. Then a black spire on a rock, and its men come down on anyone going by with a load. They'll hear the pans. Mind the pans. They're good pans.",
    ],
    accept: "Pans to the Pit.",
    acceptLine: "North out of the gate and round, up the trail, three hundred paces to the Hollow; then on north the long way, a quarter-hour and more, under the spire on its rock. The Pit's under a ribcage. You'll see it.",
    decline: 'Not now.',
    declineLine: "No flour, then. I'll make it out of something. I always do.",
    journal: [
      "Ama Tull sends Khel's copper pans to Mab Crowe at Scavengers' Pit, north of Khel, for flour. On the trail north, put down three of the grey widows in the Widows' Hollow.",
      "Further north, the men of the Black Finger come down off their rock on anyone carrying a load. Put down two of them.",
      "Take the pans on north to Mab Crowe at Scavengers' Pit.",
    ],
    progress: ["North. The Hollow, then the spire. Then the Pit, under the ribs."],
    done: [
      "Copper pans? From Khel? ...Ama Tull's alive, then. She owes me for a ladle. Eleven years.",
      "And you came under the Finger with forty pans rattling, and you're still here? Ha. Flour, she wants. I've a barrel. The rest's where I can't get at it. Here, for carrying.",
    ],
    after: ["Sent Ama her flour by Tad. He came back with a roll in each hand and his face pink. She's that sort of cook."],
    others: {
      mab: [
        "Copper pans? From Khel? ...Ama Tull's alive, then. She owes me for a ladle. Eleven years. And you came under the Finger with forty pans rattling? Here, for carrying.",
        "Flour, she wants. I've a barrel. The rest's where I can't get at it. ...Sit. You're at the Pit now. There's work at the Pit for anyone who'll do it.",
      ],
      tad: ["From Khel? Aunt Ama? ...Not my aunt. Everyone called her that. She fed me when I was six. Is she well?"],
      sarn: ["North, to the Pit? Mind the spire on the rock. Its men don't like anything going by that they haven't looked in."],
    },
  },

  // ================================================================ the Hollow Watch (Captain Tolan Renn; Vesna Kell)
  black_road: {
    title: 'The Black Road',
    giver: 'vesna',
    about: "From the dead tree Vesna Kell can see the keep's top and its fires, but not its gate: the ground's wrong. Since spring she's never seen it close. She wants you to walk the last of the road and look: at the gate, and the arch with a light in it before it. Only look; don't knock.",
    offer: [
      "From the tree I see the keep's top, and its fires, and the road with braziers down it. I can't see the gate. The ground's wrong. Since spring, and I've never once seen it close.",
      "Walk the end of the road and look. The gate, and the arch they say stands before it with a light in it. Is the gate open, ever? I need to know. Only look. Don't knock.",
    ],
    accept: "I'll go and look.",
    acceptLine: "West-north-west, six hundred paces, along the lane and then the road. You'll pass the gibbets. Don't look at the gibbets. Look at the gate, and the arch. Then come back the same way, low.",
    decline: 'Not that close.',
    declineLine: "No. I've wanted to since spring. I'll go on wanting.",
    journal: [
      "Vesna Kell, the Hollow Watch's scout, can't see the keep's gate from her tree. Go to the end of the road and look at Blackvigil Keep: its gate, and the arch before it.",
      "Go back to Vesna Kell at the Hollow Watch.",
    ],
    heard: {
      keep: "A curtain wall, four towers and a keep, and a taller one behind with red down its face. The gate is shut. Before it, an arch with a light in it.",
    },
    progress: ["The end of the road. The gate, and the arch."],
    done: [
      "Shut. Shut since spring, then. And the arch is the only way in, and the captain's been right about that all along, and I'll have to say so. That's the worst of it.",
      "Here. For your eyes. Mine are tired of the same view.",
    ],
    after: ["I look at where the gate is, now, though I can't see it. It's different, knowing it's shut. I can't say how."],
    others: {
      renn: ["She's sent you to look at the gate. Good. She's been wanting to go herself since the day we came. I said no. I'd say it again."],
    },
  },

  gallowgate: {
    title: 'Gallowgate Fort',
    giver: 'renn',
    needs: 'the_castellan',
    about: "With the Castellan dead, what's left of Blackvigil's garrison has drawn back to Gallowgate Fort, west-south-west of the Hollow Watch, where the keep's patrols water their horses and sleep under a row of gibbets. Captain Renn wants the fort emptied, its captain and all, before they find someone else to follow.",
    offer: [
      "The keep's lords are dead. What's left of the garrison didn't stay in the keep. They've gone to Gallowgate Fort, west-south-west, under the gibbets, where the patrols sleep. Vesna watched them go in.",
      "Empty it. Every one, and the one who gives the orders there, before they think of someone new to give them. Then there's nothing between this bank and the ford but the road.",
    ],
    accept: "I'll empty the fort.",
    acceptLine: "West-south-west, two hundred and fifty paces, by the trail. It's a stockade with a gate and a yard. Go in at the gate; they'll come to you. Don't let them shut it on you.",
    decline: 'Not a fort.',
    declineLine: "No. You've done the keep. The fort will keep a day.",
    journal: [
      "What's left of Blackvigil's garrison has drawn back to Gallowgate Fort, west-south-west of the Hollow Watch. Empty it, its captain and all, for Captain Renn.",
      "Go back to Captain Renn at the Hollow Watch.",
    ],
    progress: ["West-south-west. The fort under the gibbets. All of it."],
    done: [
      "Empty. Nothing between us and the ford but the road. ...I'd stopped believing I'd say that.",
      "Here. A lancer's riding-cloak, off the fort's pegs. Good cloth, and it's never been ours. Wear it east. Let them see it come home on somebody else.",
    ],
    after: ["Vesna says there's no smoke from Gallowgate's cookhouse. None. She went up twice to be sure."],
    others: {
      vesna: ["The fort? Good. I watched the last of them go in there the night the big fire went out. I'd like a dusk where nobody rides out of it."],
    },
  },

  vigil_patrols: {
    title: 'The Vigil Road',
    giver: 'vesna',
    about: "The keep's patrols ride the Vigil Road in threes, then fives with a lancer, and the biggest of them sits on the road north of the Hollow Watch, where the lane comes in. Vesna Kell wants it made to cost them. Five of it.",
    offer: [
      "They ride that road in patrols. Threes, then fives with a lancer, thicker the nearer the keep. The big one sits on the road north of us, where our lane comes in. I have to go round it every time I go anywhere.",
      "We can't take the road. We can make it cost them to sit on it. Five of the big patrol. If they have to ride in tens to feel safe, that's tens that aren't anywhere else.",
    ],
    accept: "Five, on their own road.",
    acceptLine: "North, six hundred paces, where the lane meets the road. Don't fight where the next patrol can see you. And don't follow them west. Five is the order.",
    decline: 'Not a patrol.',
    declineLine: "No. It's a great deal of iron to argue with. I understand.",
    journal: [
      "Vesna Kell wants the Vigil Road made costly. Kill five of the big patrol that sits on the road north of the Hollow Watch.",
      "Go back to Vesna Kell at the Hollow Watch.",
    ],
    progress: ["North, where the lane meets the road. Five."],
    done: [
      "Five. I watched from the tree. They've pulled the rest back up the road four hundred paces. Four hundred. That's the first ground anyone's taken off them since spring.",
      "Here. That's the captain's, but he said give it you, and he says it so seldom I'm doing it before he changes his mind.",
    ],
    after: ["Ten of them rode out to look at where the five were. Ten, to look at some ash. Good."],
    others: {
      renn: ["She's sent you at the big patrol? ...Good. I'd not have. I'd have thought of a reason not to. She never does."],
    },
  },

  the_smoke_we_hide_in: {
    title: 'The Smoke We Hide In',
    giver: 'vesna',
    about: "East of the Hollow Watch, Smokefast's fires burn day and night, and on an east wind their smoke lies right over the Watch and hides it from the keep's walls. It's why the Watch is still there. Vesna Kell wants them out anyway.",
    offer: [
      "Smokefast, east, two hundred and fifty paces. The ash-cult's fires. On an east wind the smoke lies right over us. It's why the wall's never seen us. Since spring we've been hid in it.",
      "Put the fires out. All of them, the one in the high hat too. ...Yes. I know. I'd sooner be seen than hid by what they burn in there. Go and see what they burn.",
    ],
    accept: "I'll put their fires out.",
    acceptLine: "East along the trail. The smoke'll show you. Hold your breath at the fires; it's not wood. Don't tell me what it is. I asked, and I find I'd rather you didn't.",
    decline: 'Not now.',
    declineLine: "No. Then we stay hid a while longer. It's not nothing.",
    journal: [
      "The ash-cult's fires at Smokefast, east of the Hollow Watch, hide the Watch in their smoke. Vesna Kell wants them out anyway. Empty Smokefast, its hierophant and all.",
      "Go back to Vesna Kell at the Hollow Watch.",
    ],
    progress: ["East. Smokefast. All of them. Don't tell me what they burn."],
    done: [
      "Out. I can see the keep's wall from the bank now, plain. So it can see us. ...Good. I'll take that.",
      "Here. My cloak from home, Cinderford wool. I'll not wear it again till I'm home, and it wants wearing. Wash before you sit by the fire.",
    ],
    after: ["Clear air over the bank. The captain stood up in it this morning, on purpose, where the wall could see. Then he sat down again. But he stood."],
    others: {
      renn: ["Smokefast? She's put you to their fires? ...She asked me first. I said no. Then I said yes. You'll find I do that."],
    },
  },

  the_warden_of_the_gate: {
    title: 'The Warden of the Gate',
    giver: 'renn',
    needs: 'black_road',
    hint: DELVE_HINT,
    about: "An arch stands before the shut gate of Blackvigil Keep, with a light in it, and the garrison walks round it. Behind it, the first of the keep's lords holds the inner gate behind a shield like a door: Ser Maldrec the Hollow, who heard Captain Renn's parley in spring and gave him back his men facing the wrong way. Go through, and kill him.",
    offer: [
      "Vesna says the gate's shut, and the arch is the only way. The garrison walks round it like a puddle, so it's a way in they don't hold. Behind it, Maldrec, at the inner gate.",
      "I parleyed with him in spring. He heard me out, very patient, with a villager's face where a helm should be. Then he gave me back my eleven, standing in a row, facing the wrong way. Kill him. I want to know they can be killed.",
    ],
    accept: "Through the arch, to Maldrec.",
    acceptLine: "West, five hundred and fifty paces, along the lane. The arch is before the gate, a little left. With a company: it won't open for fewer. Don't look long at his face. It was somebody's.",
    decline: 'Not yet.',
    declineLine: "No. A thing like that, you go when you're sure.",
    journal: [
      "Go through the arch before the gate of Blackvigil Keep, west of the Hollow Watch, with a company at your back.",
      "Kill Ser Maldrec the Hollow, who holds the keep's inner gate.",
      "Go back to Captain Renn at the Hollow Watch.",
    ],
    progress: ["The arch, then the inner gate. Don't look long at the face."],
    done: [
      "Dead. They die. ...Give me a moment. Since spring I've been sure that they didn't, and ashamed of being sure.",
      "This is the best thing I own that isn't on my back. I took it off the road the night we rode off, from one of theirs who'd no more use for it. Carry it back in there.",
    ],
    after: ["I say it at the start of my watch, aloud: one of them is dead. The keep's had nothing to say back."],
    others: {
      vesna: ["Maldrec? The one at the parley? ...I held the reins that day. I was the ninth of us, the one behind. I watched his face the whole time. Good."],
    },
  },

  the_castellan: {
    title: 'The Castellan',
    giver: 'renn',
    needs: 'black_road',
    hint: DELVE_HINT,
    about: "The Castellan holds Blackvigil Keep, and its lords are his: Magister Sorvane with the black book, the Hollow Brothers who fight as one, and Maldrec at the gate. Captain Renn, who rode west to parley and never rode home, asks for Sorvane, the Brothers and the Castellan at the top.",
    offer: [
      "Past the inner gate there's a robed one with a black book, Sorvane, that the others step round. And two that fight as one, the Brothers. That's how they took my eleven: one talking, one behind.",
      "At the top, the Castellan. He holds the keep, and the knights on the road were his, and the ones who came to Khel at noon for water. Kill them all. Take everyone you've got.",
    ],
    accept: "I'll go up through the keep.",
    acceptLine: "Through the arch, and up through the keep, all of it. The robed one won't fight fair. The two, don't let them get either side of you. And come back. I've watched enough go in who didn't.",
    decline: 'Not yet.',
    declineLine: "No. Not till you're ready. I'll be here. It's the one thing I've been good for.",
    journal: [
      "Go through the arch before the gate of Blackvigil Keep, west of the Hollow Watch, with a company at your back.",
      "Kill Magister Sorvane, the robed lord with the black book.",
      "Kill the Hollow Brothers, who fight as one.",
      "Kill the Castellan, at the top of Blackvigil Keep.",
      "Go back to Captain Renn at the Hollow Watch.",
    ],
    progress: ["Sorvane, the Brothers, the Castellan at the top. Take everyone.", "Vesna says the big fire's still lit. When it goes out, I'll know before you tell me."],
    done: [
      "Dead. The Castellan, and his lords. ...Vesna! The big fire. Is it... Then it's out. Since spring that fire's never gone out.",
      "This came off the Field, Mab Crowe's, a while back, and I've kept it against a day I didn't believe in. It's yours.",
      "I'll go home now. Not yet: there's the fort. But I'll go, and I'll stand at the foot of the sergeant's watchtower, and she can say what she likes. She will.",
    ],
    after: ["The fires on the road are going out, one a night, with nobody to feed them. Vesna watches them go. Going down's a fine way to watch."],
    others: {
      vesna: ["The Castellan? ...I'm going up the tree. When the big fire goes out, I want to see it with my own eyes. Don't follow. ...No. Come up. Come and see."],
    },
  },

  // ================================================================ Scavengers' Pit (Mab Crowe; Tad Crowe)
  sick_in_iron: {
    title: 'The Sick Ones in Iron',
    giver: 'mab',
    about: "At dusk the plague knights come down off the ridge east of Scavengers' Pit and pick over the Pit's leavings, the way the Pit picks over the Field. Mab Crowe wants two of them put down. She knows their iron's rotten. She wants them dead for the smell.",
    offer: [
      "The sick ones in iron. They come down off the east ridge at dusk and pick over what we've left. Like we pick over the Field. I don't like being treated like I treat things.",
      "Two. Put two of them down. Don't bother stripping them. Their iron's rotten through, and so's what's in it.",
    ],
    accept: "Two of the sick ones.",
    acceptLine: "East, two hundred and seventy paces, up on the ridge. You'll smell them before you see them. Breathe through your sleeve. And don't bring me anything off them.",
    decline: 'Not now.',
    declineLine: "Then I'll go on being picked over. It's restful, in a way.",
    journal: [
      "The plague knights on the ridge east of Scavengers' Pit come down at dusk to pick over the Pit's leavings. Put down two of them.",
      "Go back to Mab Crowe at Scavengers' Pit.",
    ],
    progress: ["East. The ridge. Two. Breathe through your sleeve."],
    done: [
      "Nothing worth having? I said. Their iron's rotten. I knew. I wanted them dead for the smell, and now they are, and it's still here. It'll go.",
      "Here. That's coin off the Field. Old coin. Spends the same, if you rub it.",
    ],
    after: ["Quiet on the east ridge at dusk. The smell's thinning. Tad says he can taste his supper."],
    others: {
      tad: ["The sick ones? Good. One of them came right to the ribs last week and stood there. Breathing. I was under the cart. I'm not ashamed."],
    },
  },

  turned_up: {
    title: 'What the Worms Turn Up',
    giver: 'tad',
    about: "The sand-worms on the Churned Ground, north-west of Scavengers' Pit, turn the old battlefield over as they go, and rings come up in the ash. Tad Crowe isn't allowed out there. He'd like five of them.",
    offer: [
      "The worms on the Churned Ground turn the earth over as they go, north-west, and the old dead come up. And their rings. Every ring out of the Field's green. Three hundred years.",
      "I'm not allowed on the Churned Ground. Aunt Mab says the worms are worse than the dead, and she's right, she always is. Will you get me five? Round the edge. I'll give you something for them.",
    ],
    accept: "Five rings.",
    acceptLine: "North-west, two hundred and fifty paces, up the trail. Round the edge of the turned ground. Don't stand still on it. They feel you standing.",
    decline: 'Not the worms.',
    declineLine: "No. That's what Aunt Mab says too.",
    journal: [
      "Tad Crowe would like five rings from the Churned Ground, north-west of Scavengers' Pit, where the sand-worms turn up the old battlefield. Pick them up from round its edge.",
      "Take the rings to Tad Crowe at Scavengers' Pit.",
    ],
    progress: ["The Churned Ground. Round the edge. Don't stand still."],
    done: [
      "Five! ...These aren't green. Look. Bright, all of them. And small. Women's, and a child's. The battle was three hundred years back.",
      "These went in the ground this year. Somebody's burying people under the worms, where nobody digs. ...Here. Take this. I don't want to count these ones.",
    ],
    after: ["I've put the five bright ones in a different bag. I don't count that bag."],
    others: {
      mab: ["Tad's sent you to the worms for his rings? Hm. Bring them to me first. ...No, give them to him. He'll only look at me."],
    },
  },

  the_grey_larder: {
    title: 'The Grey Larder',
    giver: 'mab',
    needs: 'sick_in_iron',
    about: "The Grey Larder is a cleft in the rock west of Scavengers' Pit, cool as a cellar, where the Pit kept its flour and its salt meat. In April the ash-widows came in at the back of it and spun it shut. Mab Crowe wants the nest emptied, the big one at its middle and all, so she can get at her flour.",
    offer: [
      "The Larder's ours. A cleft in the rock, west. Cool as a cellar. Every sack of flour the Pit's got, and the salt pork, and the good oil. In April the widows came in at the back and spun the lot shut.",
      "I promised Ama Tull flour for her pans. I can't sell what I can't reach. Empty it. The widows, and the big one that sits in the middle and doesn't move till it does.",
    ],
    accept: "I'll empty the Larder.",
    acceptLine: "West-north-west, two hundred and fifty paces, up the trail. Grey webs on everything. The big one's in the middle, by the sacks. Don't cut the sacks open getting at it.",
    decline: 'Not spiders.',
    declineLine: "No. Then it's weevils and the bottom of the barrel. They're good weevils. There's not many left.",
    journal: [
      "The ash-widows have spun shut the Grey Larder, the cleft west of Scavengers' Pit where the Pit keeps its flour. Empty their nest, the big one at its middle and all.",
      "Go back to Mab Crowe at Scavengers' Pit.",
    ],
    progress: ["West-north-west. The Larder. The big one by the sacks."],
    done: [
      "Empty? Then the flour's mine again. Webbed, but mine. Tad can brush it. He likes that sort of thing.",
      "Ama gets her sack, and a sack over for the ladle I owe her. Here. A coat off the Field, boiled twice. Fine wool, under the ash. Better than you'd think.",
    ],
    after: ["Six sacks out of the Larder, and only one of them chewed. I've sent Ama two. She sent back rolls. I've eaten four."],
    others: {
      tad: ["The Larder's open? I'll brush the flour. I like brushing flour. It's the only thing here that comes up white."],
    },
  },

  the_bone_field: {
    title: 'What Walks the Field',
    giver: 'mab',
    needs: ['the_grey_larder', 'the_black_finger'],
    about: "Something big walks the Bone Field at night, west of Scavengers' Pit among the ribs of the great dead thing: a giant of bones, a knight some nights and a golem of stone and bone on others, with sick ones in iron beside it. The Pit's diggers won't go past its skull. Mab Crowe wants the big one put down.",
    offer: [
      "West, past the skull with the horn: the Field. Ribs the size of barns. The best of it's on the far side, where nobody's picked. Something big walks it, of a night. Bones the height of two men, sometimes in a knight's iron and sometimes in stone.",
      "Tad says there's two of them and they take turns. Tad says a lot of things. Whichever's walking, put the big one down. Then I'll have six on the far side with sacks.",
    ],
    accept: "The big one on the Field.",
    acceptLine: "West, six hundred and forty paces, along the lane. Past the skull. The sick ones walk with it; they'll come first. Don't touch the black slab between the fires. Don't look at what's on it.",
    decline: 'Not the Field.',
    declineLine: "No. Nobody will. That's why it's the best of it.",
    journal: [
      "Something big walks the Bone Field, west of Scavengers' Pit: a giant of bones, in a knight's iron or in stone. Put it down, so the Pit's diggers can get at the far side.",
      "Go back to Mab Crowe at Scavengers' Pit.",
    ],
    progress: ["West, past the skull. The big one. Not the slab."],
    done: [
      "Down? The big one? ...Then the far side's open. I'll send the sacks out at first light. Tad too, if he'll go. He'll go.",
      "Here. A skull, off the Field, with a name scratched in the brow in a hand nobody writes any more. I've kept it nine years for the right buyer. You're not buying. Take it anyway.",
    ],
    after: ["Six sacks off the far side. Swords, mostly. Bent. I'll sell them as bent swords. People need those too."],
    others: {
      tad: ["The big one's down? Then I'll go to the far side. ...Tomorrow. I'll go tomorrow. I said I'd go, so I'll go."],
    },
  },

  the_black_finger: {
    title: 'The Black Finger',
    giver: 'mab',
    needs: 'sick_in_iron',
    about: "The keep's men on the Black Finger, the spire on its rock south of Scavengers' Pit, shoot at the Pit's diggers of an evening, for sport, from the top. Nobody's been hit yet. They're getting closer. Mab Crowe wants the spire emptied before somebody is.",
    offer: [
      "The Finger. South, up on its rock; you came under it. Of an evening they lean over the top and loose at my diggers on the near side of the Field. For sport. They laugh. You can hear them laugh from here.",
      "Nobody's been hit. They're getting closer. Last week it was Tad's hat, off his head, and he's not grown into another. Empty it. All of them, and whoever's laughing loudest.",
    ],
    accept: "I'll empty the Finger.",
    acceptLine: "South, two hundred and fifty paces, up the trail to the rock. They'll see you coming; that's what it's for. Make it the last thing it sees.",
    decline: 'Not yet.',
    declineLine: "No. Not till you're ready. We'll dig on the far side and keep our heads down.",
    journal: [
      "The keep's men on the Black Finger, the spire on its rock south of Scavengers' Pit, shoot at the Pit's diggers for sport. Empty it, its captain and all, for Mab Crowe.",
      "Go back to Mab Crowe at Scavengers' Pit.",
    ],
    progress: ["South, the rock. Whoever's laughing loudest."],
    done: [
      "Quiet on the Finger this evening. ...Good. I sent three out to the near side to dig. They kept looking up. They'll stop.",
      "Here. A staff off the Field, iron-shod, and the iron's not rotten. I'd kept it to throw at them. I'll not need to.",
    ],
    after: ["Tad stood on the ribs at dusk and waved at the Finger. Nobody to see. That was the point."],
    others: {
      tad: ["The Finger? Good. They had my hat. I liked that hat. It was the only one I had that fitted."],
    },
  },

  // ---------------------------------------------------------------- The Heralds (docs/ELDER-DRAGONS.md "On the land")
  the_heat_under_the_world: {
    title: 'The Heat Under the World',
    giver: 'vesna',
    needs: ['the_smoke_we_hide_in'],
    about: "Since Smokefast's fires went out there has been smoke again over the Hollow Watch, and this time nothing is burning: it comes up out of the ground on the rise north-east of the Watch, three hundred and fifty paces off, where the stones have gone red. A red dragon lies in the middle of it with the ground running like wax round its feet: Oskarran, the Herald of the Hearth. Vesna Kell wants it down.",
    offer: [
      "You put the fires out, and I could see the wall from the bank. Three days. Then the smoke came back. Not from Smokefast. From the rise, north-east, three hundred and fifty paces. Nobody's lit a thing up there. I went and looked. The ground is lit.",
      "There's a red one lying on the rise with its belly in the stones, and the stones round it running like candle-ends. The heat came through my boots at a hundred paces. It keeps still the way a kettle keeps still. Put it down before it boils.",
    ],
    accept: "I'll put it down.",
    acceptLine: "When it slams the ground, fire goes out from it in a ring: be past where the ring stops. When it looks up at you, move; the sky comes down where you were. If it marks one of you, everyone into the mark. I watched it a long while.",
    decline: 'Not now.',
    declineLine: "No. Then we're hid in smoke again, and I said I'd sooner be seen. I'll keep watching it.",
    journal: [
      "Smoke rises again over the Hollow Watch, and nothing is burning: it comes out of the ground on the rise north-east of the Watch, where a red dragon lies with the stones running round it. Oskarran, the Herald of the Hearth. Put it down.",
      'Go back to Vesna Kell at the Hollow Watch.',
    ],
    progress: [
      "North-east. The rise with the red stones. When it looks up at you, move.",
      'At the end it rears up, and the ground opens round it. Get in close, right under it. Under it is the only ground that holds.',
    ],
    done: [
      "The smoke's thinning. I can see the wall again. ...Feel the bank. Cold. It's been warm under us for a week and I thought it was spring.",
      "The captain says a herald is a thing sent ahead to say who's coming. I asked him who. He looked at the keep a long time and said it wasn't the keep. I don't like it when he's sure. Here: it's lined, and it doesn't burn. I'd not have believed that before this week.",
    ],
    after: ["Cold ground under the Watch, the way it ought to be. I still put my hand flat on it of a morning. You learn what to watch."],
    others: {
      renn: ["She's sent you at the thing on the rise. Good. I'd have sent you myself, and she knew it, and got there first. She does that."],
    },
  },
};
