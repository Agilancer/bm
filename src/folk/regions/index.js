// The land's quests, region by region (docs/QUEST-LOOP.md): each region's file has who's posted at its hubs (PEOPLE), its
// quests' workings (RULES) and the level each wants (LEVELS). Taken into src/folk/people.js, src/folk/land-quests.js and
// src/ui/autobrain.js from here. Their words: src/folk/lines/regions/.
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
export const REGION_PEOPLE = ALL.flatMap((r) => r.PEOPLE);
export const REGION_RULES = Object.assign({}, ...ALL.map((r) => r.RULES));
export const REGION_LEVELS = ALL.flatMap((r) => r.LEVELS);
