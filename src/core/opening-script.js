import { OPENING } from './opening.js';

// Final revision after two review rounds by the narrative and dialogue critics.
// Short pauses are performance beats, with no dialogue balloon.
export const OPENING_SCRIPT = {
  [OPENING.NAME]: [
    { at: 1.2, text: 'Let the veil hold. Let the summons take.', gesture: 'Spell_Simple_Idle_Loop' },
    { at: 3.5, text: '', gesture: 'afraid', breath: 'gasp' },
    { at: 4.7, text: 'What do you see?', gesture: 'scared_02' },
    { at: 7.3, text: 'An old woman. Am I dead?', who: 'player' },
    { at: 10.1, text: 'Old…?', gesture: 'afraid', breath: 'catch' },
    { at: 12.1, text: '', gesture: 'scared_02' },
    { at: 14.4, text: 'No. Listen to me. You’re Tessariel reborn.', gesture: 'greet_01' },
    { at: 18.0, text: 'The chosen one.', gesture: 'idle' },
    { at: 20.0, text: 'Chosen for what?', who: 'player' },
    { at: 22.2, text: 'To kill Velscour.', gesture: 'idle' },
    { at: 24.6, text: 'But first—your name. What is your name?', gesture: 'idle' },
  ],
  [OPENING.LEAVE]: [
    { at: 0, text: '{name}. Right. You can walk? Good. Outside.', gesture: 'Pointing into the distance' },
    { at: 4.2, text: 'Mind the—never mind. Keep moving.' },
    { at: 8.2, text: '' },
  ],
  [OPENING.REVEAL]: [
    { at: 0, text: '', gesture: 'scared_02' },
    { at: 1.85, text: 'WHAT HAVE YOU DONE?!', gesture: 'frightened', breath: 'gasp' },
    { at: 4.6, text: 'Your face. You were… older.', who: 'player' },
    { at: 7.5, text: 'You saw—inside the cave?', gesture: 'scared_02', breath: 'catch' },
    { at: 10.6, text: 'Don’t touch anything.', gesture: 'afraid' },
    { at: 12.7, text: 'Please.', gesture: 'idle', breath: 'release' },
    { at: 14.7, text: 'Lisandra. My name’s Lisandra.', gesture: 'idle' },
    { at: 17.5, text: 'Town’s down the trail. Stay with me.', gesture: 'Pointing into the distance' },
  ],
};
export function openingBeat(stage, time) {
  const beats = OPENING_SCRIPT[stage];
  return beats?.findLast((beat) => time >= beat.at);
}
