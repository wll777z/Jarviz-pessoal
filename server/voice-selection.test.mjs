import test from 'node:test';
import assert from 'node:assert/strict';
import { selectVoice } from '../voice-selection.mjs';

test('automatic voice prefers Portuguese male voices and respects explicit selection', () => {
  const voices = [
    { voiceURI: 'female', name: 'Microsoft Maria', lang: 'pt-BR', localService: true },
    { voiceURI: 'male', name: 'Microsoft Daniel', lang: 'pt-BR', localService: true },
    { voiceURI: 'british', name: 'Microsoft George', lang: 'en-GB', localService: true },
  ];
  assert.equal(selectVoice(voices).voiceURI, 'male');
  assert.equal(selectVoice(voices, 'british').voiceURI, 'british');
  assert.equal(selectVoice(voices, 'deleted-voice').voiceURI, 'male');
  assert.equal(selectVoice([]), null);
  assert.equal(selectVoice([voices[0], voices[2]]).voiceURI, 'female');
});
