// Castle Velscour's dungeons, set A (src/core/dungeon.js DELVES takes them in after the wards; docs/PHOBOS-CASTLE.md):
// the Drowned Archive, the Gallery of a Thousand Portraits and the Alchemists' Undercroft, each a delve written as
// src/core/delve-barracks.js is, in a file of its own. VARIANTS_A: their bosses' and their own kinds' bodies
// (src/core/tripo-monsters.js VARIANTS takes them in). Their fights: src/sim/castle-fights-a.js.
import { ARCHIVE_VARIANTS, DROWNED_ARCHIVE } from './delve-archive.js';
import { PORTRAITS_VARIANTS, THOUSAND_PORTRAITS } from './delve-portraits.js';
import { UNDERCROFT, UNDERCROFT_VARIANTS } from './delve-undercroft.js';

export const CASTLE_DUNGEONS_A = [DROWNED_ARCHIVE, THOUSAND_PORTRAITS, UNDERCROFT];
export const VARIANTS_A = { ...ARCHIVE_VARIANTS, ...PORTRAITS_VARIANTS, ...UNDERCROFT_VARIANTS };
