(function (global) {
  'use strict';
  const MAX_GUESSES = 6;
  const EPOCH = Date.UTC(2026, 0, 1);
  function normalize(text) {
    return String(text).normalize('NFC').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640\s]/g, '').replace(/[أإآٱ]/g, 'ا');
  }
  function isRoot(text) { return /^[ء-غف-ي]{3}$/.test(normalize(text)); }
  function evaluateGuess(guess, root) {
    const g = [...normalize(guess)], r = [...normalize(root)];
    if (!g.length || g.length !== r.length || !/^[ء-غف-ي]+$/.test(g.join('')) || !/^[ء-غف-ي]+$/.test(r.join(''))) throw new Error('Expected equally long Arabic words');
    const result = Array(g.length).fill('absent'), remaining = new Map();
    r.forEach((letter, i) => {
      if (g[i] === letter) result[i] = 'correct';
      else remaining.set(letter, (remaining.get(letter) || 0) + 1);
    });
    g.forEach((letter, i) => {
      if (result[i] !== 'correct' && remaining.get(letter) > 0) {
        result[i] = 'present'; remaining.set(letter, remaining.get(letter) - 1);
      }
    });
    return result;
  }
  function dayNumber(date = new Date()) {
    return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - EPOCH) / 86400000) + 1;
  }
  function dailyWord(words, day) { return words[((day - 1) % words.length + words.length) % words.length]; }
  function roundStatus(guesses, root) {
    if (guesses.some(g => normalize(g) === normalize(root))) return 'won';
    return guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
  }
  function shareText(guesses, root, label) {
    const status = roundStatus(guesses, root);
    const icons = { correct: '🟩', present: '🟨', absent: '⬜' };
    return `جذر ${label} ${status === 'won' ? guesses.length : 'X'}/${MAX_GUESSES}\n\n` + guesses.map(g => evaluateGuess(g, root).map(s => icons[s]).join('')).join('\n');
  }
  const api = { MAX_GUESSES, normalize, isRoot, evaluateGuess, dayNumber, dailyWord, roundStatus, shareText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.JathrGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
