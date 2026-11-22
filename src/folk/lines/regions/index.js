// What the land's people say and every word of its quests, region by region (their workings: src/folk/regions/).
// Taken into src/folk/lines/land.js.
import * as BELLMOURN from './bellmourn.js';
import * as DOWNS from './downs.js';
import * as FEN from './fen.js';
import * as DEEPWOOD from './deepwood.js';
import * as RUSTWOOD from './rustwood.js';
import * as WASTE from './waste.js';
import * as MOOR from './moor.js';
import * as FELLS from './fells.js';
import * as GALLOWS from './gallows.js';
import * as EAST from './east.js';

const ALL = [BELLMOURN, DOWNS, FEN, DEEPWOOD, RUSTWOOD, WASTE, MOOR, FELLS, GALLOWS, EAST];
export const REGION_LINES = Object.assign({}, ...ALL.map((r) => r.LINES));
export const REGION_QUESTS = Object.assign({}, ...ALL.map((r) => r.QUESTS));
