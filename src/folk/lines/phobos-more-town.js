// The words of City State Phobos's quests, the town's (their workings: src/folk/phobos-quests-town.js). Taken into
// src/folk/lines/phobos-hubs.js's QUESTS. As src/folk/lines/phobos-streets.js: work from the people of the districts, found
// in their own; and from the keepers of the drains and the princess in her garden, where it goes down and comes up again.
// It sprawls on purpose: over the wall and into the city's towers (its lookouts), down every sector of the sewers, and at
// last up the Approach and in at his gate. Nobody here adds to the city's people: LINES_TOWN is empty.
// (His city: no name of hers, no bells, nothing of the other side. The V and T rule.)
export const LINES_TOWN = {};

export const QUESTS_TOWN = {
  // ---- the Barbican: the gate's book, and the wall over it ----
  the_toll_book: {
    title: 'The Toll Book',
    giver: 'ph_toll',
    offer: [
      "Every soul through the Drawbridge Gate pays me a penny, and every penny goes in Wim's book. Two hundred in the book last night. Two hundred and forty souls in the city this morning. I counted. I count everything.",
      "Either the clerk's cheating me, which I'd respect, or forty people came in where there's no gate. Ask Wim. Then ask Hob Quarrel on the wall, who sees everything and says nothing unless you ask him twice.",
    ],
    accept: "I'll ask them both.",
    acceptLine: "Wim's at his desk by the gate, ink to the elbow. Quarrel's wherever the wall is. Ask him twice. I meant that.",
    decline: "Count them yourself.",
    declineLine: "I have. That's the trouble. Forty pennies, walking about my city, unpaid. I can't sleep for it.",
    journal: [
      "Fat Gorrim, toll-keeper of the Drawbridge Gate, has forty more people in the city than pennies in the book. Ask Eustace Wim, the gate's clerk.",
      "Ask Hob Quarrel, the crossbowman of the wall.",
      "Go back to Fat Gorrim at the Drawbridge Gate.",
    ],
    progress: ["Wim first, then Quarrel. Ask Quarrel twice."],
    others: {
      ph_clerk: ["My book is exact. Two hundred through the gate, two hundred pennies, and Master Gorrim may count my columns till his eyes water. If there are more in the city, they did not come past this desk. Ask the wall what it lets over."],
      ph_bolt: ["...Aye. They come over by the Cinder corner, after the third watch, on a rope. Thin folk. Burnt-looking. They don't go to the houses. They go to a grating by the minster and they go down. I don't shoot what's leaving."],
    },
    done: [
      "Over the wall and down a drain. Forty of them. Then they're not in my city at all, are they? They're under it. I don't collect for under. ...I could collect for under.",
      "Here. For the asking. If you go down after them, and I think you're the kind who will, tell them the toll's a penny. Each way.",
    ],
    after: ["I've had a slate put up by the grating. 'Toll: one penny.' Nobody's paid. But they've read it. I can tell. Somebody drew a face on it."],
  },
  eyes_on_the_wall: {
    title: 'Eyes on the Wall',
    giver: 'ph_bolt',
    needs: 'the_toll_book',
    offer: [
      "You asked twice. Most don't. So I'll tell you something for nothing: you can't know this city from the street. The street lies. You want to stand where I stand.",
      "The barbican's guardroom loft, out past the drawbridge. Then the head of the gate itself, up on the walk. Stand in both and look in. Then come and tell me what you saw that the street didn't show you.",
    ],
    accept: "I'll go up and look.",
    acceptLine: "The barbican's two drums stand out past the moat: the loft's up the stair inside. For the gate's head, the wall's stairs are inside the city, south of the Mile. Climb till it stops.",
    decline: "I like the street.",
    declineLine: "Then you'll go on being lied to. It's a comfortable way to live. I did it for years.",
    journal: [
      "Hob Quarrel, a crossbowman of Phobos's wall, says the city can't be known from the street. Stand in the loft of the barbican's guardroom, and at the head of the Drawbridge Gate, on the wall-walk.",
      "Go back to Hob Quarrel in the Barbican.",
    ],
    progress: ["The barbican's loft, and the head of the gate. Look in, not out."],
    done: [
      "You saw it, then. The fires. Every quarter's got its own colour of smoke, and there's one colour that isn't any quarter's, and it comes up from the gratings. Aye. Now you know what I know.",
      "Take this. Bolt money. I don't spend it. There's nothing in this city I want that a bolt can't get me cheaper.",
    ],
    after: ["I watch the gratings now, not the gate. The gate's honest. It's the only thing here that is: it's either open or it's shut."],
  },
  the_long_watch: {
    title: 'The Long Watch',
    giver: 'ph_bolt',
    needs: 'eyes_on_the_wall',
    offer: [
      "There's four posts on this wall that haven't answered the watch-call in a month. The Ashwatch, over the Cinder Quarter. The Rookery Watch. The Charnel Gate's drum, north. The Water Gate's drum, south. Nobody's come down from any of them.",
      "I can't leave my post to go and look. That's what a post is. You've no post. Walk the wall, stand in all four, and tell me who's keeping them. If the answer's nobody, I'd as soon know.",
    ],
    accept: "I'll walk the wall.",
    acceptLine: "It's the whole west half of the city, up on the walk. The posts are the rooms the walk runs through. Go quietly through the ones that have something in them.",
    decline: "That's a long way round.",
    declineLine: "It is. That's why it's called that. Go on, then. The wall'll be here.",
    journal: [
      "Four posts on Phobos's wall have stopped answering the watch: the Ashwatch Post over the Cinder Quarter, the Rookery Watch, the Charnel Gate's drum and the Tanners' Water Gate's drum. Walk the wall and stand in each.",
      "Go back to Hob Quarrel in the Barbican.",
    ],
    progress: ["The Ashwatch, the Rookery Watch, the Charnel Gate, the Water Gate. All four."],
    done: [
      "Nobody. Four posts, bunks made, pots cold, and nobody. Not dead. Gone. Called up the hill to the castle, I'd say, one post at a time, and nobody told the wall.",
      "So I'm the west wall. All of it. Me and a crossbow. Here: I took this off a man who wanted over. You've earned it more than he'd earned the rope.",
    ],
    after: ["I call the watch at each turn of the glass, and I answer it myself, four times, in four voices. It keeps the wall from knowing."],
  },

  // ---- a round of the houses ----
  a_round_of_the_houses: {
    title: 'A Round of the Houses',
    giver: 'ph_tap',
    offer: [
      "A city's as good as its taverns, and I'm owed by four of them. The Hangman's Rest in Chainmarket, under the ale-stake. The Gilded Eel on the Wharf. The Dyed Hand up the Tanners' Steps. The Clinker, what's left standing of it, in the Cinder Quarter.",
      "Each landlord had a cask off me on trust. Walk round, show your face in each quarter, let it be seen that the Lamb sends somebody who walks back out of places. That's all a debt wants. To be visited.",
    ],
    accept: "I'll make the round.",
    acceptLine: "Chainmarket, the Wharf, the Steps, the Cinder Quarter. Look for the bush on the pole and the big lantern: every house in Phobos hangs one. Drink nothing at the Clinker.",
    decline: "I'm no debt collector.",
    declineLine: "No more am I! I'm a host. A host with a long memory and four empty pegs where casks hang.",
    journal: [
      "Fat Jory Crane of the Gutted Lamb is owed by four taverns: the Hangman's Rest in Chainmarket, the Gilded Eel on the Drowned Wharf, the Dyed Hand on the Tanners' Steps and the Clinker in the Cinder Quarter. Show your face in each quarter.",
      "Go back to Fat Jory Crane in the Rookeries.",
    ],
    progress: ["Chainmarket, the Wharf, the Steps, the Cinder Quarter. A bush on a pole, a big lantern."],
    done: [
      "Not a penny! Ha! No, I never thought there would be. But they saw you, and tomorrow there'll be four boys at my door with four purses and four stories. That's how it's done.",
      "Your cut, in advance, because I'm certain. And a stool at the Lamb whenever you want one. The one with four legs.",
    ],
    after: ["Three paid. The Clinker sent a brick. I've hung it over the bar. It's the most honest thing anyone's ever sent me."],
  },

  // ---- up the city's towers ----
  the_sweeps_eye: {
    title: "The Sweep's Eye",
    giver: 'ph_soot',
    offer: [
      "I know every chimney in the Cinder Quarter by its smoke, same as you'd know a dog by its bark. And there's three smokes these mornings I can't put a chimney to. Thin ones. Greasy. Coming up where no house is.",
      "I'm too old for the minster's stair and they won't have me on the wall. You go. Up the burnt minster's one standing drum, then the Ashwatch Post on the wall over us. Count me the smokes that have nothing under them.",
    ],
    accept: "I'll count your smokes.",
    acceptLine: "The minster's north of Ash Lane, the black shell: its door's at the foot of the drum that's left. The Ashwatch is up on the wall's walk, west of us. Mind the minster's top step. It minds nobody.",
    decline: "Smoke's smoke.",
    declineLine: "Is it! And a face is a face, I suppose. Go on with you. I'll find someone with eyes.",
    journal: [
      "Wick Hollis, a chimney sweep of the Cinder Quarter, has seen three smokes rising where no house stands. Look from the loft of the burnt minster's standing drum, and from the Ashwatch Post on the wall over the quarter.",
      "Go back to Wick Hollis in the Cinder Quarter.",
    ],
    progress: ["The burnt minster's loft, and the Ashwatch Post on the wall. Count the smokes with no house under."],
    done: [
      "Out of the gratings. I knew it. I knew it! Somebody's cooking, down in the drains, and what they're burning isn't coal and it isn't wood. Thirty years a sweep, I know fat when I smell it.",
      "Here, that's for your legs. If you go down there, and you've the look of one who will, breathe through a wet rag. That's free. That's trade knowledge.",
    ],
    after: ["I've stopped sweeping the houses by the minster. Not for fear. It's the soot. It comes off on the brush the wrong colour."],
  },
  the_gibbet_loft: {
    title: 'The Gibbet Loft',
    giver: 'ph_mag',
    offer: [
      "Silver in my palm. ...No? Then I'll tell you this one for nothing, because it frightens me, and I like company in that. The cages on the gibbet in the market square. Eight of them. I read them every dusk, like tea leaves. Who's in, who's new.",
      "Three nights now they've swung with nobody in them. Full by day. Empty by night. Go up into the gibbet's loft after dark, where the arms come out of the wall, and look down into them for me. I daren't. I've only nine fingers left.",
    ],
    accept: "I'll go up after dark.",
    acceptLine: "The door's at its foot, in the middle of Chainmarket, among the stalls. The loft's up the stair. After dark, mind. By day they're only dead, and dead I can read from here.",
    decline: "Read your own cages.",
    declineLine: "I have, dear. That's why I'm asking a stranger. A stranger's futures are so much less upsetting.",
    journal: [
      "Mag Ninefingers, a fortune-teller of Chainmarket, says the cages on the gibbet tower hang full by day and empty by night. Go up into the gibbet's loft, after dark.",
      "Go back to Mag Ninefingers in Chainmarket.",
    ],
    progress: ["The gibbet's loft, in the middle of the market. After dark."],
    done: [
      "Empty. And the doors of the cages shut, and the chains still. ...Then they aren't being taken out, dear. They're getting out. And going somewhere at night, and coming back before the market opens. Like clerks.",
      "Take this. I'd have told you a fortune for it, but you've just told me mine, and I didn't care for it.",
    ],
    after: ["I've moved my pitch to the far side of the square. The cards kept coming up the same one. A man walking, with a cage for a head."],
  },
  the_toll_on_the_water: {
    title: 'The Toll on the Water',
    giver: 'ph_oar',
    offer: [
      "There are two footbridges over the Slough, and a toll-house built across each, with a keeper's room over the way. I've rowed under them forty years. A light in each window, every night. A keeper each. I knew them both.",
      "The lights are still lit. Nobody's taken my penny in a fortnight. Walk over both for me: the upper, north of the Mile, and the lower, by the Wharf. I'm a ferryman. I don't go on bridges. It's not superstition. It's trade.",
    ],
    accept: "I'll walk both bridges.",
    acceptLine: "The upper's above the weir, north. The lower's down past the quays. A house on a bridge: you can't mistake it. Go through the passage under and look up at the room. Tell me if anyone looks back.",
    decline: "Not today.",
    declineLine: "No. Well. The water will still be here. It's the one thing in Phobos that doesn't go up the hill.",
    journal: [
      "Grey Abelard, the ferryman of the Slough, says the keepers of the two toll-houses on its footbridges have gone, and their lamps still burn. Walk through the passage of each: the upper bridge north of the King's Mile, and the lower by the Drowned Wharf.",
      "Go back to Grey Abelard on the Drowned Wharf.",
    ],
    progress: ["The upper toll-house, and the lower. Walk through the passage under each."],
    done: [
      "Lit, and empty. Then somebody comes to trim two lamps every night in two empty houses. That's worse than dark windows. Dark I understand.",
      "Here. Forty years of other people's pennies; you may as well have some. I'll go on rowing under. I'll just not look up.",
    ],
    after: ["I looked up. Last night. There was a shape at the upper window, holding the lamp. It was holding it very carefully, the way you'd hold something you'd been told to."],
  },
  the_fever_house: {
    title: 'The Fever House',
    giver: 'ph_beak',
    offer: [
      "A house in the Rookeries was shut up with the fever in it. Nine inside. I chalked the door myself. I went back on the seventh day to count the dead, which is the part of my work I am paid for. The door was open. The house was empty. The roof has since burnt.",
      "Nine fevered people do not walk. Somebody carried them, or something did. Widow Crake keeps the lodging-house opposite and sees everything through one eye. Ask her. She will send you on to someone. They always do.",
    ],
    accept: "I'll ask the widow.",
    acceptLine: "Crake's about the Rookeries, counting her lodgers. Do not stand close to her. That is not medical advice. She pinches.",
    decline: "I'd rather not catch it.",
    declineLine: "Sensible. Neither would I. That is what the beak is for. You have no beak. Good day.",
    journal: [
      "The Beaked Doctor shut nine fevered people in a house in the Rookeries, and found it empty on the seventh day. Ask Widow Crake, the lodging-house keeper.",
      "Ask Wren, a street girl of the Rookeries.",
      "Go back to the Beaked Doctor in the Rookeries.",
    ],
    progress: ["Widow Crake first. She will send you on."],
    others: {
      ph_flop: ["Carried? Nobody carried anybody, dear. I watch that door like it owes me rent. Nobody went in. But the girl Wren sleeps on my step, and she says different about who came out. Ask her. Don't give her money. Give it to me."],
      ph_wren: ["They came out by themselves. In a line. Like when the garrison walks. All nine, and the little one last, and none of them coughing any more. They went to the well in the yard and they climbed down it. I counted. I can count to nine."],
    },
    done: [
      "Walked. Down a well. In a line. ...I have treated the fever in this city for eleven years and I have never once seen it cure anybody. It appears I chalked the wrong word on that door.",
      "My fee for the house. I did not earn it. You may as well have it. And if you go down that well, I should like, very much, to be told what is at the bottom. In writing. From a distance.",
    ],
    after: ["I chalk a different mark on the doors now. Not the fever's. A question. It is the only honest thing a doctor in this city can write."],
  },
  the_scrying_room: {
    title: 'The Scrying Room',
    giver: 'ph_orrery',
    needs: 'what_the_stars_say',
    offer: [
      "You told me what colour the crown fire burns. Red at the heart, and something paler round it, turning. I have not slept since. A thing that turns has a period, and a thing with a period can be reckoned, and I am too old to climb to where it can be seen whole.",
      "The Ninefold Eye has a scrying room at the head of its stair: the pool there shows the Keep without the houses between. And the Magewall Post, on the wall above the Rise, shows it plain. Stand in both. Tell me which way it turns.",
    ],
    accept: "I'll watch it turn.",
    acceptLine: "The Eye is the tallest thing in the city: its door is at its foot, on the Rise. The scrying pool is in its top room. The Magewall Post is on the wall-walk east of here. Note the direction. Sunwise, or against.",
    decline: "I've looked at it enough.",
    declineLine: "So I had thought, at your age. One never has. Good evening.",
    journal: [
      "Master Thibault Vane, the astrologer of the Mages' Rise, wants to know which way the pale thing round the Keep's crown fire turns. Look from the scrying room at the top of the Ninefold Eye's stair, and from the Magewall Post on the wall above the Rise.",
      "Go back to Master Thibault Vane on the Mages' Rise.",
    ],
    progress: ["The scrying room of the Ninefold Eye, and the Magewall Post. Which way does it turn?"],
    done: [
      "Against the sun. Of course. Of course it is. Then it is not his. His fire has burned one way for two hundred years. Something else is up there with him, turning the other way, and getting brighter.",
      "Here. I have no use for money and less for sleep. Forty years of charts, and the first new thing in the sky is the one I was happiest not knowing.",
    ],
    after: ["I have drawn it. Every night, a little wider. I do not show the drawings to the other tutors. They would want to name it, and I think it would hear."],
  },
  the_castle_from_the_wall: {
    title: 'The Castle from the Wall',
    giver: 'ph_garrow',
    offer: [
      "Night watch counts the castle's fires. Has done since my father's father. So many on the curtain, so many on the towers, so many up the Keep. It's how we know he's home. I've the tally for every night for sixty years.",
      "My eyes aren't what they were, and the numbers have stopped adding. Go up on the east wall for me: the Dukes' Wall Post, south, and the drum of the Castle Gate itself, where the Approach goes through. Count his fires from both. Don't count out loud.",
    ],
    accept: "I'll count his fires.",
    acceptLine: "Up the wall's stair by the Approach, then along the walk. The Dukes' post is the middle one of three, south. The Castle Gate's drum is as high as the wall goes. You'll see the whole of him from there. He'll see you.",
    decline: "Count them yourself.",
    declineLine: "I do. Every night. And every night I get a different number, and none of them is the right one. Go on, then.",
    journal: [
      "Garrow Teague of the night watch tallies the castle's fires, and the tally no longer adds. Count them from the Dukes' Wall Post, and from the drum of the Castle Gate where the Approach goes through the wall.",
      "Go back to Garrow Teague on the Castle Approach.",
    ],
    progress: ["The Dukes' Wall Post, and the Castle Gate's drum. Count, and don't count out loud."],
    done: [
      "More. I thought so. Sixty years it's been the same number, and now there's new towers lit on that rock that weren't built last winter. Either he's building, or the castle's growing. I don't know which I'd rather.",
      "Take this. Watch pay. And take a word with it: when you go up there, and you will, go up by a way that isn't the gate. Everyone I ever knew who went in by the gate was expected.",
    ],
    after: ["I've stopped writing the number down. I draw the castle instead, the shape of it against the sky. It's a different shape most nights. I keep the drawings under the bed."],
  },

  // ---- down the West Drains ----
  a_pie_for_the_drains: {
    title: 'A Pie for the Drains',
    giver: 'ph_pie',
    offer: [
      "There's two brothers keep the drains under this city, and the stout one's been buying my pies off a string through a grating for nine years. Mutton. Six a week. He's never missed, and he's never once paid on the day.",
      "The string's not been pulled since Tuesday. Take him this one, down the Barbican Outfall, and tell him he owes Rosie Crust for six. If he's well, he'll argue. If he doesn't argue, come and tell me quick.",
    ],
    accept: "I'll take him his pie.",
    acceptLine: "The mouth's down by the wall in the Barbican, where the Main lets out. Their office is off the Great Grate, with a lamp in it. Don't eat the pie. I'll know.",
    decline: "I don't go down drains.",
    declineLine: "Nobody does, till they do. That's what he said, nine years gone. Go on, then, I've a tray going cold.",
    journal: [
      "Rosie Crust, a pie-seller of Chainmarket, hasn't heard from her best customer since Tuesday. Go down into the West Drains by the Barbican Outfall.",
      "Take the pie to Martleboro, Keeper of the Drains, in the Keepers' Office off the Great Grate.",
      "Go back to Rosie Crust in Chainmarket.",
    ],
    progress: ["Down the Barbican Outfall, to the Keepers' Office. Don't eat the pie."],
    others: {
      martleboro: ["Rosie! Bless her. Six? It's five. It's five, the sixth had gristle, I sent word. ...The string? Spiders had the string. Had it Tuesday. Wrapped it up like a present. Tell her Thursday. Tell her it's a very good pie."],
    },
    done: [
      "He argued? About the gristle? Oh, thank goodness. Thank goodness. He's well, then. He only argues when he's well.",
      "That's for your trouble, and here's one for yourself, and it has not got gristle, whatever anyone under the street tells you.",
    ],
    after: ["New string. Thicker. I've tarred it. Let the spiders try. He's paid for four of the six. I'm calling that a triumph."],
  },
  under_the_rookery_well: {
    title: 'Under the Rookery Well',
    giver: 'ph_hettie',
    needs: 'down_the_drains',
    offer: [
      "I've caught rats in this city since I was nine, and I'll tell you a thing about rats: they know. Three weeks back, every rat in the Rookeries came up out of the well in the yard behind Crake's. All at once. In daylight. And ran.",
      "A rat doesn't run from a cat, nor from me. So what's down the Rookery Drain? Go and walk it for me, the Drain and the chamber under the well, and put down what you find there. I'd go myself, but I've a living to make, and it's all up here now.",
    ],
    accept: "I'll see what scared them.",
    acceptLine: "Down the West Drains, then the Rookery Drain off the Great Grate, north. The chamber under the well's at its end. If you see a rat down there, love, follow it. It'll be going the right way.",
    decline: "Not for rats.",
    declineLine: "Not for rats, no. For whatever's worse than rats. But suit yourself.",
    journal: [
      "Hettie Drain, a rat-catcher, says every rat in the Rookeries fled up the well in one day. Walk the Rookery Drain and the chamber Under the Rookery Well, in the West Drains.",
      "Put down four of what's nesting under the well.",
      "Go back to Hettie Drain on the Drowned Wharf.",
    ],
    progress: ["The Rookery Drain, and under the well. Then four of whatever's there."],
    done: [
      "Spiders. Big as dogs. Well, that'd do it. A rat's a practical animal. ...And folk climbing down to them, you say, in a line? No. No, I'll not think on that. I catch rats.",
      "Here's your share. Rat money. It spends the same. And the rats'll be back in a week, now, and so will my living. Bless you.",
    ],
    after: ["First rat back in the yard this morning. Big grey buck. Sat on the well's rim and looked down it a long while. Then looked at me. We've an understanding."],
  },
  the_soot_cistern: {
    title: 'The Soot Cistern',
    giver: 'ph_brann',
    needs: 'down_the_drains',
    offer: [
      "Slag's got to go somewhere. Mine goes down the Cinder Run, same as my father's did, and it washes out to the Soot Cistern and sits there and troubles nobody. Thirty years. Only now it's backing up. My quench-trough's full of drain.",
      "Something's stopped the Run. Go and walk it, and the Cistern past it, and tell me what. I'll not send my boy. He's the only one I've got that can hold tongs straight.",
    ],
    accept: "I'll walk your Run.",
    acceptLine: "West Drains, by the Barbican Outfall, then the Cinder Run east off the Main. The Cistern's where it ends. It'll be hot down there. That's me. Sorry.",
    decline: "Unblock your own drain.",
    declineLine: "With what? I'm a smelter. I've a hammer and a temper. Neither goes round corners.",
    journal: [
      "Brann Cinder, a smelter of the Cinder Quarter, says his slag is backing up the drain. Walk the Cinder Run and the Soot Cistern, in the West Drains.",
      "Go back to Brann Cinder in the Cinder Quarter.",
    ],
    progress: ["The Cinder Run, and the Soot Cistern at its end."],
    done: [
      "Living on it. On the slag. In the warm. ...Well, I'll be damned. Thirty years I've been pouring that down the hole, and all the while I've been keeping something's feet warm.",
      "Here. For the walk. I'll dig a pit in the yard and pour it there. I'm not feeding it any more. Let it come up and ask.",
    ],
    after: ["Trough's clear. But the forge floor's warm in the mornings, now, before I've lit anything. From underneath. I've put the boy's bed in the loft."],
  },
  the_turning_basin: {
    title: 'The Turning Basin',
    giver: 'martleboro',
    needs: 'the_main_runs_clear',
    offer: [
      "Right. The Main runs clear, thanks to you, which means everything in it now fetches up in the Turning Basin, which is where the barges used to turn when there were barges. It's not turning. It's sitting. Louis says it's looking at him.",
      "Clear the Basin for me: four of whatever's in it. Then go on past and see if the Overflow's open, because if the Overflow's shut and it rains, Phobos gets its own back, all of it, through the floors. And I'll be blamed.",
    ],
    accept: "I'll clear the Basin.",
    acceptLine: "Down the Main, past the Grate, bear south: the big round water. The Overflow's the arch on its far side. Take a breath before the Basin. Take it somewhere else.",
    decline: "Not just now.",
    declineLine: "No hurry. It's only the whole city's floors. I'll put a bucket out.",
    journal: [
      "Martleboro, Keeper of the Drains, says the Turning Basin has stopped turning. Put down four of what's in it.",
      "Go on to the Overflow past it, and see that it's open.",
      "Go back to Martleboro in the Keepers' Office.",
    ],
    progress: ["Four in the Basin. Then look at the Overflow."],
    done: [
      "Turning? Louis! It's turning! He can't hear me, he's got his fingers in his ears. And the Overflow's open. Then let it rain. Let it rain on the lot of them.",
      "Keeper's wages. I've not seen any myself in six years, but I know the rate, and that's it. Well done. I mean that. I don't say it to Louis.",
    ],
    after: ["Basin's turning lovely. Had a hat come round it this morning. Good hat. Went round four times before I could hook it. Louis is wearing it."],
  },

  // ---- the Slough Mains ----
  whats_in_the_dye: {
    title: "What's in the Dye",
    giver: 'ph_woad',
    needs: 'down_the_drains',
    offer: [
      "I dye three colours: his red, the blue, and black. The spent vats go down the Tanners' Main to the Dye Sump, and what comes back up the pump is water I can use again. That's the craft. Clean in, colour out.",
      "A week now the pump's given me a colour I never put in. A sort of white. It won't take on cloth and it won't wash off my hands. Go down to my Sump, see what's in it, and clear the Mains of half a dozen of whatever's doing it.",
    ],
    accept: "I'll look in your sump.",
    acceptLine: "The Slough Mains, down by the Wharf Outfall, then the Tanners' Main south. The Dye Sump's the one with three colours on the walls. Four, now.",
    decline: "Dye's not my trade.",
    declineLine: "Nor white mine. Look at my hands. Go on, look. I'd shake yours but it comes off on people.",
    journal: [
      "Indra Vatt, a dyer of the Tanners' Steps, is pumping up a colour she never put down. Go to the Dye Sump, in the Slough Mains.",
      "Put down six of what's in the Slough Mains.",
      "Go back to Indra Vatt on the Tanners' Steps.",
    ],
    progress: ["My Dye Sump first. Then six of them, anywhere in the Mains."],
    done: [
      "Nesting. In my sump. And the white's what, their... no. Don't tell me. I've had it on my hands for a week. I've eaten bread with these hands.",
      "Here. And a length of the red, the good red, the kind he pays for. Wear it somewhere he won't like.",
    ],
    after: ["The pump runs clear. My hands are coming back. Not the nails. The nails are staying white, I think. I tell people it's the fashion."],
  },
  the_market_cistern: {
    title: 'The Market Cistern',
    giver: 'ph_cleaver',
    needs: 'caps_for_the_keepers',
    offer: [
      "Butcher's trade makes waste. Always has. Chainmarket's goes down the grating behind my block, into the Chainmarket Main, and on to the cistern. It's a big cistern. It's never filled. I never asked myself why.",
      "I asked myself last week, when I heard chewing. Up through the grating. At night. Walk the Main and the Cistern, put down four of them in the Cistern itself, and tell me I've not been feeding something for twenty years.",
    ],
    accept: "I'll go and see what's chewing.",
    acceptLine: "The Slough Mains, then the Chainmarket Main north off the Weir Hall. The Cistern's under the square. You'll smell my shop before you see it. I'm sorry about that.",
    decline: "I've just eaten.",
    declineLine: "Aye. So've they. That's my whole trouble.",
    journal: [
      "Hob Gristle, a butcher of Chainmarket, hears chewing under his grating. Walk the Chainmarket Main and the Market Cistern, in the Slough Mains.",
      "Put down four of what's in the Market Cistern.",
      "Go back to Hob Gristle in Chainmarket.",
    ],
    progress: ["The Chainmarket Main, the Market Cistern. Four of them, in the Cistern."],
    done: [
      "Twenty years. Bones and trimmings, twenty years, and all that time I've been a larder. They'll have grown up on my scraps. Whole families of them. I've been a good provider.",
      "Take it, take it. And I'll burn the waste from now on, and let the market complain about the smell. Better a smell than a grateful customer of that kind.",
    ],
    after: ["Quiet under the grating now. I miss it, more fool me. Twenty years, somebody was always pleased to see what I threw away."],
  },
  the_weir_hall: {
    title: 'The Weir Hall',
    giver: 'louis_g',
    needs: 'caps_of_the_slough',
    offer: [
      "Oh. You're back. Good. I wanted to ask somebody who isn't my brother. The Weir Hall, in the Slough Mains. It's where the Slough's water comes down a step. I used to like it. It's got a sound. Had.",
      "It's gone quiet. Water doesn't go quiet. Something's in the weir, holding its breath. Would you go and... three of them would do. And then look in at the Silt Run past it, and tell me it's only silt. Please tell me it's only silt.",
    ],
    accept: "I'll go and listen.",
    acceptLine: "The Slough Mains, the big hall with the step in it. The Silt Run goes on east from it, toward the Bed. Don't go as far as the Bed. That's the Worm's. I mean, it was. I mean, don't.",
    decline: "Ask your brother.",
    declineLine: "I did. He said 'water can't hold its breath, Louis.' He wasn't there. He's never there when it's quiet.",
    journal: [
      "Louis G, Keeper of the Far Drains, says the Weir Hall in the Slough Mains has gone quiet. Put down three of what's in it.",
      "Look in at the Silt Run past it.",
      "Go back to Louis G in the Keepers' Office.",
    ],
    progress: ["Three in the Weir Hall. Then the Silt Run. It's only silt."],
    done: [
      "It moves. When you watch it. ...No, that's fine. That's fine! That's just what silt does, I expect, when you watch it. I won't watch it. Nobody need watch it.",
      "Here. This was the old weir-keeper's. He left it leaning on the rail, forty years ago, and nobody's wanted to pick it up. You've got the hands for it. You don't mind things.",
    ],
    after: ["The weir's got its sound back. I go and sit by it, some evenings. I sit with my back to the Silt Run. I think that's fair to both of us."],
  },

  // ---- the Charnel Runs ----
  lamechs_missing_dead: {
    title: "Lamech's Missing Dead",
    giver: 'ph_sexton',
    needs: 'lamechs_keys',
    offer: [
      "A hundred and fourteen keys, a hundred and fourteen vaults, and you brought four of my wanderers home. I thanked you. I've counted since. I'm eleven short. Not walking the rows: gone. Vaults shut, locks whole, shelves bare.",
      "There's only one way out of a locked vault, and it's down. The old drains run under the Bone Yards. Go into the Charnel Runs, walk the Cistern and the old Catacomb, and find me my eleven. I don't ask you to bring them. Only to say where they lie.",
    ],
    accept: "I'll find your eleven.",
    acceptLine: "The Bone Yards Outfall, by the north wall. The Ossuary Main, then the Charnel Cistern, then down the Bone Stair to the old Catacomb. They'll know the way. They've all been carried down it once.",
    decline: "The dead can keep.",
    declineLine: "They can't, though. That's the whole of my trade, in four words, and you've got it wrong.",
    journal: [
      "Old Lamech, sexton of the Bone Yards, is eleven dead short in vaults still locked. Go down into the Charnel Runs.",
      "Walk the Charnel Cistern and the Old Catacomb.",
      "Go back to Old Lamech in the Bone Yards.",
    ],
    progress: ["The Charnel Runs. The Cistern, and the old Catacomb down the Bone Stair."],
    done: [
      "In the old Catacomb. All eleven, and standing. Then they went down through their own floors to get there. Through the stone. I laid that stone. ...They were called. Nothing leaves a good vault unless it's called.",
      "Take this. Vault money: every family pays a penny a year, to be kept. Eleven families are owed a refund. I'd rather you had it than I told them why.",
    ],
    after: ["I've cut eleven notches off my tally-stick and I've kept the shavings. A sexton's got to be able to put his hand on everyone. Even if it's only that much of them."],
  },
  the_old_catacomb: {
    title: 'The Old Catacomb',
    giver: 'ph_wake',
    needs: 'lamechs_missing_dead',
    offer: [
      "Lamech told me where his eleven went. I carry the lamp on the dead-watch: I walk the rows at night and I say each name, so they know they're kept. Sixty years it's been enough. A name and a light.",
      "It's not enough for the ones in the old Catacomb. They're past names. Go down and lay five of them, by whatever means you have. Then I'll go down after, with the lamp, and say the names over what's left. Somebody must.",
    ],
    accept: "I'll lay five of them.",
    acceptLine: "The Charnel Runs, down the Bone Stair. Don't speak to them. I mean it kindly: they'll answer, and it won't be them that answers.",
    decline: "That's your watch, not mine.",
    declineLine: "It is. And I'm seventy-one, with a lamp. If you won't, I'll go as I am. I only thought I'd ask.",
    journal: [
      "Corwin Lamp, a lantern-man of the dead-watch, wants the walking dead of the Old Catacomb laid. Put down five of them there, in the Charnel Runs.",
      "Go back to Corwin Lamp in the Bone Yards.",
    ],
    progress: ["Five, in the old Catacomb, down the Bone Stair. Don't speak to them."],
    done: [
      "Five lying down. Then I can do the rest. A name and a light, over each. It'll take me the night. I've had longer nights.",
      "This was my father's lantern, and his mother's. It's lit the dead-watch a hundred and ten years. I've another. I want this one carried somewhere it's needed, and that's not the rows, any more.",
    ],
    after: ["I said the names. All eleven. The last one, a girl, I'd swear the dark got a little less, after. I'm old. I'm allowed to swear to things like that."],
  },
  under_the_rise: {
    title: 'Under the Rise',
    giver: 'ph_tutor',
    offer: [
      "A delicate matter. The colleges of the Rise have, for some generations, disposed of the residue of their work down the Mages' Culvert. Spent reagents. Failed preparations. The odd familiar. It was understood to be inert.",
      "A student of mine looked down the culvert's grating last week and it looked back, and addressed him by name. I should like the Culvert and the chamber under the Rise walked, and three of whatever is in that chamber made, shall we say, inert.",
    ],
    accept: "I'll make them inert.",
    acceptLine: "The Charnel Runs. The Mages' Culvert leads east from the old Catacomb; the chamber Under the Rise is at its end. If anything down there offers to teach you something, decline. That is how we got here.",
    decline: "Clean up your own leavings.",
    declineLine: "A fair position, and one I have put to the college many times. They voted. It was eleven to one. I was the one.",
    journal: [
      "Magister Odo Pell, a tutor of the Mages' Rise, says what the colleges poured down their culvert has woken. Walk the Mages' Culvert and the chamber Under the Mages' Rise, in the Charnel Runs.",
      "Put down three of what's Under the Mages' Rise.",
      "Go back to Magister Odo Pell on the Mages' Rise.",
    ],
    progress: ["The Mages' Culvert, and the chamber under the Rise. Three, made inert."],
    done: [
      "It does not stay poured. No. I had feared as much: sixty years of failed preparations, each failing in the same pool, into each other. We have been conducting one very long experiment and nobody thought to take notes.",
      "The college's thanks, which are worth nothing, and my own purse, which is worth this. I shall move a motion to brick up the culvert. It will fail eleven to one.",
    ],
    after: ["The motion failed. Twelve to nothing. I voted against it myself, at the last. One does wonder, you see, what it would have become. That is the trouble with all of us up here."],
  },

  // ---- the High Conduits ----
  the_dukes_conduit: {
    title: "The Dukes' Conduit",
    giver: 'ph_major',
    offer: [
      "I keep a great house on Dukes' Row. One keeps it dry. The cellars of the Row drain into the Dukes' Conduit, a most respectable drain, tiled, with the arms of four families over its arches. This month the cellars are wet. The wine is floating.",
      "And there are lamps down there. One sees them through the cellar grating: a row of lamps, where no lamp was hung by this household. Walk the Conduit and the Lamp Store beyond it, and extinguish four of whoever is tending them.",
    ],
    accept: "I'll see to your cellars.",
    acceptLine: "The High Conduits: one goes down by the Barracks Outfall, I am told. The Dukes' Conduit is the tiled one. The Lamp Store lies past it. One apologises for the necessity. One does not, as a rule, send guests into the drains.",
    decline: "Bail it yourself.",
    declineLine: "One has footmen for bailing. One does not have footmen for lamps that light themselves. Good day.",
    journal: [
      "Ambrose Quillfeather, majordomo of a great house on Dukes' Row, has wet cellars and strange lamps beneath them. Walk the Dukes' Conduit and the Lamp Store, in the High Conduits.",
      "Put down four of what tends the lamps in the Lamp Store.",
      "Go back to Ambrose Quillfeather on Dukes' Row.",
    ],
    progress: ["The Dukes' Conduit, the Lamp Store. Four of whoever tends the lamps."],
    done: [
      "Not ours. I had thought not. Then somebody keeps a store of lamps beneath the best addresses in Phobos, and lights them, and waits. One would give a great deal to know for what occasion.",
      "The household's gratitude. And a word, since you have been below: her ladyship next door, Lady Vasque, asks after the drains more than a lady should. You might call on her.",
    ],
    after: ["The cellars are dry. The wine has been re-racked. Three bottles were found to have been opened, tasted, and correctly re-corked. One finds that the most disturbing part."],
  },
  a_garden_under_the_street: {
    title: 'A Garden under the Street',
    giver: 'ph_lady',
    needs: 'the_dukes_conduit',
    offer: [
      "Quillfeather sent you. He disapproves of me, which is how I know he's sound. Sit. When I was a girl there was a garden at the end of the Row, sunk below the street, with a fountain. My mother had it bricked over the year the Keep's fire turned red.",
      "It's still there. Under the Approach. And someone tends it: I have had a flower from it, every year, on the same day, left on my sill. I'm too old to go and say thank you. Go to the Sunk Garden. Ask whoever is there whether it's still kept.",
    ],
    accept: "I'll ask who keeps it.",
    acceptLine: "The High Conduits, to their far end: the Approach Culvert, and the garden beyond. You'll know it. It's the only place under this city where anything grows on purpose.",
    decline: "I'm no gardener.",
    declineLine: "Nor am I, child. I'm an old woman with a flower in a glass. Come back if you find you've a free afternoon and a conscience.",
    journal: [
      "Lady Morwenna Vasque of Dukes' Row is left a flower each year from a garden bricked over in her girlhood. Go to the Sunk Garden, at the far end of the High Conduits.",
      "Ask Princess Apricot whether the garden is still kept.",
    ],
    progress: ["The Sunk Garden, past the Approach Culvert. Ask whoever's there."],
    others: {
      apricot: ["Morwenna Vasque. Little Wenna, with the plaits? She used to steal my apricots, which is how I came by the name. Tell her it's kept. Tell her the fountain runs. Tell her the flower's from me, and that next year she may come and pick it herself."],
    },
    done: [
      "She remembers the fountain. Oh, I am glad. One wonders, down here, whether anything one kept was ever seen. Sit a moment. You've been through the Lamp Store to get here, and you look it.",
      "Take this. It was hers: her mother's mourning silk, sent down the drain to me the year they bricked the garden, with a note. 'Keep it till it's wanted.' I think it's wanted.",
    ],
    after: ["A flower on my sill this morning, child, and it's not the day. A second one. With a ribbon. Somebody down there has been told something. I've put on my good cap."],
  },

  // ---- up the Approach, and in at his gate ----
  the_pilgrims_road: {
    title: "The Pilgrim's Road",
    giver: 'ph_pilgrim',
    needs: 'the_castle_from_the_wall',
    offer: [
      "I walked four hundred miles to stand at his gate. Barefoot, the last forty. And I have stood at the foot of the Approach for a month and I cannot go up it. My feet won't. They stop at the first brazier. They're wiser than I am.",
      "You go. By night, as the pilgrims do, up between the fires. And in at the gate, where the yard is, and the door in the drum. Then come back and tell me what's inside, so that I may stop wanting to know.",
    ],
    accept: "I'll go up for you.",
    acceptLine: "By night. Up the Approach, between the braziers, to the two great drums. The castle's door is in the north drum's yard face, just inside. They say it's never locked. They say that's the worst thing about it.",
    decline: "Go home, Brother.",
    declineLine: "I've tried that too. My feet won't do that either. I seem to have been left here, like a hat.",
    journal: [
      "Brother Ashe, a pilgrim to the Keep, cannot make himself climb the last of the road. Go up the Castle Approach, by night.",
      "Go in at the castle's door, into the Lower Ward.",
      "Go back to Brother Ashe on the Castle Approach.",
    ],
    progress: ["Up the Approach by night, and in at the door in the north drum."],
    done: [
      "A passage. A yard. A captain. Kitchens. ...Kitchens? He has kitchens. Somebody peels turnips for him. I walked four hundred miles to a house with a cellar and a cook.",
      "Take my purse. I shan't need it: I find I can walk again, and it's downhill all the way home. Don't follow me, you said. I won't follow you either. But I'll remember somebody went in.",
    ],
    after: ["Still here, yes. I've a reason, now. I tell the other pilgrims about the turnips. Two have gone home. It's the best preaching I ever did."],
  },
  the_servants_ways: {
    title: "The Servants' Ways",
    giver: 'apricot',
    needs: 'up_the_aqueduct',
    offer: [
      "You've been up my Aqueduct and seen his kitchens. Good. Now, a castle is two castles: the one its lord walks, and the one behind the walls that carries his dinner. The second one has no guards. Guards don't carry trays.",
      "The servants' ways run behind six wings of the Lower Ward. Walk three for me: the Cellars, the Servants' Hall, and the door they keep in the West Range. I want to know they still join. My last map of them is older than I am.",
    ],
    accept: "I'll walk them.",
    acceptLine: "Up the Aqueduct to the Kitchens. The Cellars are under the yard's west side. The Hall's up behind the Aqueduct. The West Range door is at the end of the way from the Hall. Walk like you're carrying something.",
    decline: "Not yet.",
    declineLine: "No. Have some tea first. Nobody should go behind his walls on an empty stomach; it's how one ends up in his kitchens.",
    journal: [
      "Princess Apricot wants to know the servants' ways behind the Lower Ward's walls still join. Walk the Cellars, the Servants' Hall and the West Range, in Castle Velscour's Lower Ward.",
      "Go back to Princess Apricot in the Sunk Garden.",
    ],
    progress: ["The Cellars, the Servants' Hall, the West Range. Walk like you're carrying something."],
    done: [
      "They join. All three. Then a person may go from my garden to the Captain's back door without once being seen by a soldier. I have waited nineteen years for someone to tell me that.",
      "Here. And a second cup. You're the first guest I've had who came back from his house with better manners than they went with.",
    ],
    after: ["I've redrawn the map. In thread, on a cushion. Nobody ever looks at an old woman's needlework. I'm not old, of course. But I intend to be, and I'm practising."],
  },
  the_garrisons_pot: {
    title: "The Garrison's Pot",
    giver: 'ph_stew',
    needs: 'up_the_aqueduct',
    offer: [
      "Thirty years I've cooked for the city garrison, and every month the castle's kitchens send down for a cask of my stock. Send down. Never pay. And this month they sent back the empty with something in the bottom I'll not describe to a stranger.",
      "You've been up there, I hear. Go into his Kitchens and thin them by three: scullions, turnspits, I'm not particular. Then look in the Cellars under for my cask. The one with three notches cut in the lid. My notches. I'd know them in the dark.",
    ],
    accept: "I'll thin his kitchens.",
    acceptLine: "The Lower Ward. His Kitchens are west of the yard; the Cellars are under them. Don't taste anything. Thirty years a cook, and that's the only advice I've ever given that I'd stake my life on.",
    decline: "Not my quarrel.",
    declineLine: "Nor mine, till they sent the cask back. Go on. I've forty men to feed and one pot.",
    journal: [
      "Mother Gruel, the city garrison's cook, has a quarrel with the castle's kitchens. Put down three of what works in the Kitchens of the Lower Ward.",
      "Look in the Cellars under them for her cask.",
      "Go back to Mother Gruel in the Barracks Ward.",
    ],
    progress: ["Three in his Kitchens. Then my cask, in the Cellars."],
    done: [
      "Short three hands. Good. Let the Captain wait for his dinner. And my cask's there, in a row with forty others, all mine, all with my three notches. Thirty years of my stock. They never used it. They kept it.",
      "Take this, and this, and sit down, you're grey. What does a kitchen like that want with forty casks of good stock it doesn't eat? No. Don't answer. I've a pot on.",
    ],
    after: ["No cask this month. I didn't send one, and nobody came to ask. That's worse, somehow. Thirty years they wanted something of me. Now they've enough."],
  },
  rivets_for_the_watch: {
    title: 'Rivets for the Watch',
    giver: 'ph_mail',
    needs: 'up_the_aqueduct',
    offer: [
      "I mend the garrison's plate. Every rivet in this ward's been under my hammer. And I'll tell you what's wrong with the harness that comes down from the castle to be mended: there's no sweat in it. No wear inside. Nobody's ever been in it.",
      "It comes down dented, though. From the outside. Go up to his Armoury, see what's standing on those racks, and put four of them down. Then tell me what was inside when it fell. I've a bet with myself.",
    ],
    accept: "I'll see what's in his harness.",
    acceptLine: "The Lower Ward: east off the yard, the Drill Floor, then up the Armoury Stair. The racks are in rows. If a set of plate turns its helm to watch you go by, that's one of the four.",
    decline: "I'd rather not know.",
    declineLine: "Nor would I. But I've mended sixty sets of it, and I've started dreaming about the insides.",
    journal: [
      "Hanne Riveter, the Barracks Ward's armourer, says nobody has ever worn the harness the castle sends down to be mended. Go up to the Armoury, in the Lower Ward.",
      "Put down four of what stands on its racks.",
      "Go back to Hanne Riveter in the Barracks Ward.",
    ],
    progress: ["His Armoury, up the stair off the Drill Floor. Four sets of it."],
    done: [
      "Nothing. Nothing in it. Then I win my bet, and I wish I'd lost. Sixty sets I've mended, and sent back up, good as new, for nothing to wear.",
      "Here: I made this from the rivets I pulled out of his plate. They wouldn't melt down with honest iron. They wanted to stay together. Take them out of my shop.",
    ],
    after: ["I've stopped taking the castle's work. Told the carter my arm's gone. He left the harness on my step anyway. It was stood up by the door this morning. I'd left it lying down."],
  },
  the_oubliettes: {
    title: 'The Oubliettes',
    giver: 'ph_keys',
    needs: 'the_servants_ways',
    offer: [
      "I turn keys at Ironmercy. It's a gaol. Folk go in, and mostly folk come out, thinner. That's a gaol. But there's a wagon comes down from the castle, twice a year, and takes the ones nobody's asked after. To the Oubliettes. I load it.",
      "I've loaded it eleven years. I want to know what I've been loading it for. Go down the Pit Stair in his Lower Ward, look in the pits, and put five of what's there out of it. I'm not a good man. But I'd like to have done one thing.",
    ],
    accept: "I'll go down the Pit Stair.",
    acceptLine: "Off the Captain's Yard, west of the gate's line: a stair down. Or by the gaolers' way from the Servants' Hall, if you'd sooner he didn't see you. The pits are in the floor. There's cages over them. Don't look long.",
    decline: "That's on you, gaoler.",
    declineLine: "It is. I know it is. That's why I asked somebody else. I said I wasn't a good man.",
    journal: [
      "Brute Hallam, a gaoler of Ironmercy, has loaded the castle's wagon for the Oubliettes for eleven years. Go down the Pit Stair to the Oubliettes, in the Lower Ward.",
      "Put down five of what's in them.",
      "Go back to Brute Hallam in the Barracks Ward.",
    ],
    progress: ["Down the Pit Stair, to the Oubliettes. Five of them."],
    done: [
      "Children. He kept the... no. No, you needn't. I can see it on you. Eleven years. Twice a year. I knew the wagon was light. I knew, and I loaded it.",
      "Take this. It's my tally: a notch for each I put on that wagon. I can't keep it and I can't burn it. And tell me the next time the wagon's due. It won't get as far as the Approach.",
    ],
    after: ["Wagon came Tuesday. It's in the gaol yard yet, with its wheels off. The driver's in a cell. I've not decided which of us is the prisoner. I bring him his dinner."],
  },
};
