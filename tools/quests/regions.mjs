// The parts of the land the quests are made in, one at a time (docs/QUEST-LOOP.md): each a handful of hubs, a hub being
// anywhere work is given: Bellmourn, a camp (src/core/camps-data.js), or one of the land's places with someone posted at it.
// levels: about what a player is when they're there.
export const REGIONS = [
  { key: 'bellmourn', name: 'Bellmourn and the four roads out', hubs: ['bellmourn', 'hillfoot', 'forkstone', 'palmers', 'withy'], levels: [1, 9] },
  { key: 'downs', name: 'The Green Downs', hubs: ['cairnwatch', 'hamlet', 'farm', 'mill', 'falls', 'belltower', 'dunmow', 'kestrel', 'cairnfield'], levels: [5, 11] },
  { key: 'fen', name: 'The Weeping Fen', hubs: ['sedgebank', 'mileend', 'causeway', 'sallow', 'eelpot', 'chapel'], levels: [6, 16] },
  { key: 'deepwood', name: 'The Deepwood and the Sorrowhorn', hubs: ['mossgate', 'hermit', 'stair', 'crown'], levels: [7, 13] },
  { key: 'rustwood', name: 'The Rustwood', hubs: ['stonecarters', 'quarry', 'abbey', 'emberwatch', 'cutters', 'fungus', 'lasthearth'], levels: [8, 15] },
  { key: 'waste', name: 'Cinderford and the Ashen Waste', hubs: ['ashgate', 'cinderford', 'charmill', 'khel', 'scavengers', 'hollowwatch', 'keep', 'bones', 'obelisks'], levels: [6, 18] },
  { key: 'moor', name: 'The Barrow Moor', hubs: ['trackside', 'wayhouse', 'peatrick', 'diggers', 'barrows', 'stones'], levels: [5, 18] },
  { key: 'fells', name: 'The Rimeholt Fells', hubs: ['fellfoot', 'frostwatch', 'hoarhide', 'climbers', 'shrine', 'deepsmouth', 'tor'], levels: [8, 16] },
  { key: 'gallows', name: 'Thornwick and the Gallowswood', hubs: ['thornwick', 'oldtoll', 'crossroads', 'candlecamp', 'wagon', 'witch', 'grove', 'roadsend'], levels: [8, 18] },
  { key: 'east', name: 'The Marches and the road to Phobos', hubs: ['marchfoot', 'tollqueue', 'widowslee', 'greywarden', 'lantern', 'gatewatch', 'needle', 'marshal', 'notch', 'span', 'sill'], levels: [14, 22] },
  { key: 'phobos', name: 'City State Phobos and Castle Velscour', hubs: ['phobos'], levels: [20, 110], inside: true },
];
export const regionOf = (hub) => REGIONS.find((r) => r.hubs.includes(hub)) || null;
