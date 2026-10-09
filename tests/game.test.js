const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateGuess, normalize, isRoot, dayNumber, dailyWord, roundStatus, shareText } = require('../js/game.js');
test('exact positions and misplaced letters', () => {
  assert.deepEqual(evaluateGuess('كتب', 'كتب'), ['correct', 'correct', 'correct']);
  assert.deepEqual(evaluateGuess('بكت', 'كتب'), ['present', 'present', 'present']);
  assert.deepEqual(evaluateGuess('درس', 'كتب'), ['absent', 'absent', 'absent']);
});
test('duplicates cannot claim a letter already used by a green', () => {
  assert.deepEqual(evaluateGuess('ككك', 'كتب'), ['correct', 'absent', 'absent']);
  assert.deepEqual(evaluateGuess('ببك', 'كتب'), ['present', 'absent', 'present']);
});
test('duplicate roots preserve the remaining count', () => {
  assert.deepEqual(evaluateGuess('ددد', 'مدد'), ['absent', 'correct', 'correct']);
  assert.deepEqual(evaluateGuess('ددم', 'مدد'), ['present', 'correct', 'present']);
});
test('hamza forms, vowel marks, spaces and tatweel normalize', () => {
  for (const a of ['أ', 'إ', 'آ', 'ا', 'ٱ']) assert.deepEqual(evaluateGuess(a + 'كَل', 'اكل'), ['correct', 'correct', 'correct']);
  assert.equal(normalize(' كَـ تِ بٌ '), 'كتب');
  assert.equal(normalize('ا\u0654كل'), 'اكل');
});
test('invalid guesses are rejected', () => {
  for (const g of ['كت', 'كتبا', 'abc', '123']) assert.throws(() => evaluateGuess(g, 'كتب'));
  assert.equal(isRoot('ك ت ب'), true);
});
test('UTC daily selection is stable and wraps', () => {
  assert.equal(dayNumber(new Date('2026-01-01T23:59:59Z')), 1);
  assert.equal(dayNumber(new Date('2026-01-02T00:00:00Z')), 2);
  assert.equal(dailyWord(['a', 'b'], 3), 'a');
});
test('round ends after a win or six attempts; share has no spoilers', () => {
  assert.equal(roundStatus(['كتب'], 'كتب'), 'won');
  assert.equal(roundStatus(Array(6).fill('درس'), 'كتب'), 'lost');
  assert.equal(roundStatus(['درس'], 'كتب'), 'playing');
  const share = shareText(['درس', 'كتب'], 'كتب', '#42');
  assert.equal(share, 'جذر #42 2/6\n\n⬜⬜⬜\n🟩🟩🟩');
});
