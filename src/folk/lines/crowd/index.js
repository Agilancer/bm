// Phobos's people's own lines, each their own (tools/phobos/crowd_lines_brief.md: two hundred and more apiece), and their
// meetings with each other (meets.js). Laid over their kind's in src/folk/lines/phobos.js; the meetings used by the street
// crowd's brain (src/folk/brain.js exchange). The castle's eight (cs_) are posted in its wards (src/folk/people.js).
import { SAYS as S1 } from './part1.js';
import { SAYS as S2 } from './part2.js';
import { SAYS as S3 } from './part3.js';
import { SAYS as S4 } from './part4.js';
import { SAYS as S5 } from './part5.js';
import { SAYS as S6 } from './part6.js';
export { MEETS } from './meets.js';
export const SAYS = { ...S1, ...S2, ...S3, ...S4, ...S5, ...S6 };
