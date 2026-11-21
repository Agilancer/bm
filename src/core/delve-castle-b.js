// Castle Velscour's dungeons, set B (src/core/dungeon.js DELVES takes them in after the wards; docs/PHOBOS-CASTLE.md): the
// Clockworks, the Menagerie of Chains, the Ossuary Chapel and the Hall of Mirrors, each written as src/core/delve-barracks.js
// is, in a file of its own. VARIANTS_B: their bosses' and their own kinds' bodies (src/core/tripo-monsters.js VARIANTS
// takes them in). Their fights: src/sim/castle-fights-b.js. What stands in them that nothing else has: src/core/delve-props-b.js.
import { CLOCKWORKS, CLOCKWORKS_VARIANTS } from './delve-clockworks.js';
import { MENAGERIE, MENAGERIE_VARIANTS } from './delve-menagerie.js';
import { OSSUARY, OSSUARY_VARIANTS } from './delve-ossuary.js';
import { MIRRORS, MIRRORS_VARIANTS } from './delve-mirrors.js';

export const CASTLE_DUNGEONS_B = [CLOCKWORKS, MENAGERIE, OSSUARY, MIRRORS];
export const VARIANTS_B = { ...CLOCKWORKS_VARIANTS, ...MENAGERIE_VARIANTS, ...OSSUARY_VARIANTS, ...MIRRORS_VARIANTS };
