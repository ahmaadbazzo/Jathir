(function (global) {
  'use strict';
  const G = typeof module !== 'undefined' && module.exports ? require('./game.js') : global.JathrGame;
  const NAME = 'كلمة';
  const LENGTH = 5, MAX_GUESSES = 6;
  const normalize = G.normalize;
  function isWord(word) { return typeof word === 'string' && /^[ء-غف-ي]{5}$/.test(normalize(word)); }
  function allowedGuess(word, allowed) { return isWord(word) && (!allowed || allowed.has(normalize(word))); }
  function evaluateGuess(guess, answer) {
    if (!isWord(guess) || !isWord(answer)) throw new Error('Expected five Arabic letters');
    return G.evaluateGuess(guess, answer);
  }
  function dailyIndex(length, day = G.dayNumber()) {
    if (!Number.isInteger(length) || length < 1) throw new Error('Empty solution pool');
    return ((day - 1) % length + length) % length;
  }
  function practiceIndex(length, previous = -1, random = Math.random) {
    if (!Number.isInteger(length) || length < 1) throw new Error('Empty solution pool');
    if (length === 1) return 0;
    const valid = Number.isInteger(previous) && previous >= 0 && previous < length;
    const n = Math.min(1 - Number.EPSILON, Math.max(0, random()));
    const index = Math.floor(n * (length - (valid ? 1 : 0)));
    return valid && index >= previous ? index + 1 : index;
  }
  function restore(saved, index, day, answer, allowed) {
    const empty = { index, day, guesses: [], recorded: false };
    if (!saved || saved.index !== index || saved.day !== day || !Array.isArray(saved.guesses) || saved.guesses.length > MAX_GUESSES || !saved.guesses.every(g => allowedGuess(g, allowed))) return empty;
    const guesses = saved.guesses.map(normalize);
    const win = guesses.indexOf(normalize(answer));
    if (win >= 0 && win !== guesses.length - 1) return empty;
    return { index, day, guesses, recorded: saved.recorded === true && G.roundStatus(guesses, answer) !== 'playing' };
  }
  function shareText(guesses, answer, label) {
    const icons = { correct: '🟩', present: '🟨', absent: '⬜' };
    return `${NAME} ${label} ${G.roundStatus(guesses, answer) === 'won' ? guesses.length : 'X'}/${MAX_GUESSES}\n\n` + guesses.map(g => evaluateGuess(g, answer).map(s => icons[s]).join('')).join('\n');
  }
  const api = { NAME, LENGTH, MAX_GUESSES, normalize, isWord, allowedGuess, evaluateGuess, dailyIndex, practiceIndex, restore, shareText, dayNumber: G.dayNumber, roundStatus: G.roundStatus };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.JathrWordGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
