// Every setting the Settings window shows (src/title.js builds it from this; the values live in src/title.js `settings`):
// which tab it's under, what kind of control it is, the words for each choice, and a line or two on what it does, shown
// beside it as it's pointed at or picked. Kept apart from the page so the tests can read it.
//
//   { k, tab, label, help, restart }   restart: it takes hold when the game starts again
//   kind 'range':  min, max, step, fmt ('pct' shows 80%, 'x' shows ×1.5)
//   kind 'seg':    opts [[value, words], ...]   two or three short choices, side by side
//   kind 'select': opts [[value, words], ...]   a longer list
//   kind 'toggle': on, off                       the words for each, shown beside the switch: every plain on-or-off

export const TABS = [
  ['audio', 'Audio', 'Volume, music and the sound of the world'],
  ['video', 'Graphics', 'Quality, resolution and the frame rate'],
  ['controls', 'Controls', 'Look speed and the keys'],
  ['interface', 'Interface', 'What is shown over the world'],
  ['auto', 'Auto-play', 'How the game plays itself, and what it sees to'],
  ['game', 'Game', 'The other Tessariels, running out of sight, game files'],
];

// What auto-play sees to by itself (src/ui/autobrain.js allow()): each 'on' or 'off'. Off, it's left for you to do.
// [key, what it is, on, off]
export const AI_PARTS = [
  ['aiGear', 'Your gear', 'Puts on the best it finds', 'Left to you'],
  ['aiGems', 'Your gems', 'Set in open sockets', 'Left to you'],
  ['aiSkills', 'Your skill points', 'Spent by its build', 'Left to you'],
  ['aiBar', 'Your spell bar', 'Set from what it knows', 'Left as you set it'],
  ['aiPartyGear', "Your party's gear", 'Puts their best on them', 'Left to you'],
  ['aiPartySkills', "Your party's skill points", 'Spent for each by their class', 'Left to you and them'],
  ['aiHire', 'Hiring a party', 'Hires one when it needs one', 'Only the party you hired'],
  ['aiLoot', 'Gear on the ground', 'Taken up', 'Only coin, orbs and stuff'],
  ['aiChests', 'Chests', 'Opened as it passes', 'Left shut'],
  ['aiSell', 'Selling and buying', 'Sells what it won\'t wear, buys mending', 'Left to you'],
  ['aiSleep', 'Nights at the inn', 'Sleeps when a quest waits on morning', 'Never'],
  ['aiWild', 'Raids, tears and bounties', 'Answered when it can', 'Left alone'],
  ['aiSurf', 'Shield riding in a fight', 'Rides away or across them', 'Keeps its feet'],
  ['aiTeleport', 'Getting to a dungeon', 'By the skull\'s teleport', 'Walks there'],
  ['aiBeacon', 'Getting home', 'By the beacon stone', 'Walks back'],
];


export const SPEC = [
  // ---- Audio
  { k: 'volume', tab: 'audio', label: 'Master volume', kind: 'range', min: 0, max: 1, step: 0.05, fmt: 'pct', help: 'Everything you hear, all at once.' },
  { k: 'music', tab: 'audio', label: 'Music', kind: 'range', min: 0, max: 1, step: 0.05, fmt: 'pct', help: 'The songs of each place, and of the fights.' },
  { k: 'ambience', tab: 'audio', label: 'Ambience', kind: 'range', min: 0, max: 1, step: 0.05, fmt: 'pct', help: 'Wind in the trees, the town about its day, the drip down in the dark.' },
  { k: 'bgSound', tab: 'audio', label: 'Sound in the background', kind: 'toggle', on: 'Keeps playing', off: 'Muted', help: 'While you\'re in another window, or another app on a phone.' },
  // ---- Graphics
  { k: 'gfx', tab: 'video', label: 'Graphics quality', kind: 'select', restart: true, opts: [['auto', 'Auto (from your GPU)'], ['ultra', 'Ultra'], ['high', 'High'], ['medium', 'Medium (laptops)'], ['mobile', 'Low']], help: 'How much the world is drawn with: shadows, distance, the grass. Auto picks by your graphics card.' },
  { k: 'res', tab: 'video', label: 'Resolution', kind: 'select', opts: [['auto', 'Auto (keeps it smooth)'], ['1', 'Full'], ['0.75', '75%'], ['0.5', 'Half']], help: 'How sharp the picture is. Auto lowers it a little when the frame rate drops, and raises it again when it can.' },
  { k: 'perf', tab: 'video', label: 'Frame rate readout', kind: 'toggle', on: 'Shown', off: 'Hidden', help: 'Frames a second and the time each takes, in the corner. F3 shows it too.' },
  // ---- Controls
  { k: 'look', tab: 'controls', label: 'Look speed', kind: 'range', min: 0.4, max: 2.5, step: 0.1, fmt: 'x', help: 'How far the view turns for a move of the mouse or a drag of the thumb.' },
  // ---- Interface
  { k: 'tracker', tab: 'interface', label: 'Quest tracker', kind: 'toggle', on: 'Shown', off: 'Hidden', help: 'The quests you track, and what each wants of you now, under the map. Track them in the quest log (J).' },
  { k: 'tags', tab: 'interface', label: 'Names over heads', kind: 'seg', opts: [['full', 'Names, guilds'], ['names', 'Names'], ['off', 'Off']], help: 'Over the townsfolk, the other Tessariels and your party.' },
  { k: 'bubbles', tab: 'interface', label: 'Speech bubbles', kind: 'toggle', on: 'Shown', off: 'Hidden', help: 'What people say, over their heads as they say it.' },
  { k: 'chatlog', tab: 'interface', label: 'Chat log', kind: 'toggle', on: 'Shown', off: 'Hidden', help: 'What\'s been said near you and on the land, kept in the lower left.' },
  { k: 'ticker', tab: 'interface', label: 'Emergency bar size', kind: 'range', min: 1, max: 2.5, step: 0.1, fmt: 'x', help: 'The red bar across the top when a boss calls out. Bigger reads better from across a room.' },
  // ---- Auto-play
  { k: 'autocam', tab: 'auto', label: 'Camera', kind: 'select', opts: [['director', 'Directed: behind him, with shots'], ['third', 'Behind him'], ['first', 'First person: through his eyes'], ['off', 'As you left it']], help: 'Where the camera goes while the game plays itself. V still changes it while it plays.' },
  { k: 'autoread', tab: 'auto', label: 'Talk', kind: 'seg', opts: [['on', 'Left up to read'], ['off', 'Clicked through']], help: 'Whether what people say waits long enough to be read before auto-play answers.' },
  { k: 'autotell', tab: 'auto', label: 'Banners', kind: 'seg', opts: [['on', 'Shown'], ['off', 'Only the feed']], help: 'The big words across the screen as it takes on a quest, kills a boss or reaches a place.' },
  { k: 'phobosAwe', tab: 'auto', label: 'First sight of Phobos', kind: 'seg', opts: [['on', 'Stops to look'], ['off', 'Rides on']], help: 'On: the first time he sees the city, he stops and looks, about five minutes. Off: he rides on.' },
  { k: 'autohide', tab: 'auto', label: 'Interface', kind: 'seg', opts: [['off', 'Always shown'], ['on', 'Hidden till you tap']], help: 'Hidden, a tap, a click or a key brings it straight back; it goes again when you leave it be.' },
  { k: 'autohideMap', tab: 'auto', label: 'Map while hidden', kind: 'seg', opts: [['on', 'Stays'], ['off', 'Hidden too']], help: 'With the interface hidden in auto-play, whether the map in the corner stays.' },
  { k: 'autohideChat', tab: 'auto', label: 'Chat while hidden', kind: 'seg', opts: [['on', 'Stays'], ['off', 'Hidden too']], help: 'With the interface hidden in auto-play, whether the chat stays.' },
  ...AI_PARTS.map(([k, label, on, off]) => ({ k, tab: 'auto', group: 'What auto-play sees to by itself', label, kind: 'toggle', on, off, help: `On: ${on.toLowerCase()}. Off: ${off.toLowerCase()}.` })),
  // ---- Game
  { k: 'heroes', tab: 'game', label: 'Other Tessariels', kind: 'seg', restart: true, opts: [['auto', 'All (16)'], ['few', 'A few'], ['off', 'None']], help: 'The other Tessariels, out on the land with you. Fewer is easier on an old machine.' },
  { k: 'background', tab: 'game', label: 'Out of sight', kind: 'seg', opts: [['run', 'Runs on'], ['auto', 'In auto-play'], ['pause', 'Pauses']], help: 'What the game does while you\'re in another window, or another app on a phone: runs on, runs on only while it plays itself, or pauses.' },
  { k: 'keep', tab: 'game', label: 'Game files', kind: 'seg', opts: [['yes', 'Kept here'], ['no', 'Fetched each time']], help: 'Kept on this device, the game starts faster: as it starts only what\'s changed is downloaded.' },
];

// The keys, for How to Play and the Controls tab. [keys, what they do]
export const KEYS = [
  ['W A S D', 'Move'], ['Mouse', 'Look'], ['Shift', 'Run'], ['Space', 'Jump (hold: ride your shield)'], ['Q', 'Dodge'],
  ['Left click', 'Fire your staff'], ['Right click', 'Guard with your shield'], ['1 – 9', 'Cast the spell in that slot'], ['0  −  +', 'Cast a Utility spell'],
  ['F', 'Cast the chosen spell'], ['Middle click', 'Cast the chosen spell'],
  ['E', 'Take, talk, open'], ['I', 'Pack'], ['B', 'Spellbook'], ['J', 'Quest log'], ['K', 'Party'], ['M', 'Map'], ['H', 'Beacon stone: home'],
  ['V', 'First or third person'], ['Wheel', 'Camera nearer or further'], ['Shift + wheel', 'Turn the spell bar'], ['P', 'Auto-play'],
  ['Tab', 'Free the mouse to click'], ['Alt (hold)', 'A cursor, for a moment'], ['R', 'Rise again, when you\'ve fallen'], ['Esc', 'Pause'], ['F3', 'Frame time'],
];
