// The beacon stone: every Tessariel carries one from the start, a cell of the pack (src/items/pack.js). Used (H, or a right
// click or double click on it in the pack), it takes CHANNEL seconds: blue light gathers round you and everyone in your
// party until it has you whole, and then you're all set down at Bellmourn's seal, the town's own, to hand in, sell and mend.
// Then it's dark for COOLDOWN seconds of play. Moving, jumping, dodging or a cast breaks it off, and that costs nothing. The
// channel and its light are src/ui/beacon.js; the carrying, the sim's (src/sim/dungeon.js home).
export const CHANNEL = 15;
export const COOLDOWN = 600;
export const BEACON_COLOR = '#7fc4ff';

// How long it's dark for yet, as the pack has it: set by src/ui/beacon.js, for the stone's card.
export const BEACON = { left: () => 0 };

export const beaconStone = () => ({ type: 'beacon', base: 'beacon_stone', rarity: 0 });
export const isBeacon = (item) => item?.type === 'beacon';

// "7:32", "45 s".
export const waitText = (s) => { const t = Math.ceil(s); return t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : `${t} s`; };

export function beaconLines(left = BEACON.left()) {
  return [
    { text: 'Beacon Stone', kind: 'title' },
    { text: 'Carried', kind: 'sub' },
    { text: 'Fifteen seconds standing still, and you and your party are set down at Bellmourn\'s seal.', kind: 'stat' },
    left > 0 ? { text: `Dark for ${waitText(left)} more.`, kind: 'open' } : { text: 'It glows: ready.', kind: 'gem', color: BEACON_COLOR },
    { text: 'H, or right-click it here. Moving, jumping, dodging or casting breaks it off. Once every ten minutes.', kind: 'sub' },
    { text: 'It stays with you: it can\'t be sold or left behind.', kind: 'sub' },
  ];
}
