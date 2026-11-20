// Phobos's people's own lines, each their own (tools/phobos/crowd_lines_brief.md: two hundred and more apiece), and their
// meetings with each other (meets.js). Laid over their kind's in src/folk/lines/phobos.js; the meetings used by the street
// crowd's brain (src/folk/brain.js exchange). The castle's eight (cs_) are posted in its wards (src/folk/people.js).
import { SAYS as S1 } from './part1.js';
import { SAYS as S2 } from './part2.js';
import { SAYS as S3 } from './part3.js';
import { SAYS as S4 } from './part4.js';
import { SAYS as S5 } from './part5.js';
import { SAYS as S6 } from './part6.js';
// (The forty-nine more, tools/phobos/crowd_roster2.json: their lines and their meetings with each other and the rest.)
import { SAYS as S7, MEETS as M7 } from './part7.js';
import { SAYS as S8, MEETS as M8 } from './part8.js';
import { SAYS as S9, MEETS as M9 } from './part9.js';
import { SAYS as S10, MEETS as M10 } from './part10.js';
import { MEETS as M0 } from './meets.js';
export const MEETS = { ...M0, ...M7, ...M8, ...M9, ...M10 };
export const SAYS = { ...S1, ...S2, ...S3, ...S4, ...S5, ...S6, ...S7, ...S8, ...S9, ...S10 };
