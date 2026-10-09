(function (global) {
  'use strict';
  const KEY = 'jathr.v1';
  const fresh = () => ({ stats: { played: 0, wins: 0, streak: 0, best: 0, distribution: [0, 0, 0, 0, 0, 0] }, daily: null, practice: null, colorBlind: false });
  let available = true;
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (!saved) return fresh();
      const s = saved.stats;
      if (!s || !['played', 'wins', 'streak', 'best'].every(k => Number.isInteger(s[k]) && s[k] >= 0) || s.wins > s.played || !Array.isArray(s.distribution) || s.distribution.length !== 6 || !s.distribution.every(n => Number.isInteger(n) && n >= 0)) return fresh();
      return { ...fresh(), ...saved, colorBlind: saved.colorBlind === true };
    } catch (_) { available = false; return fresh(); }
  }
  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); available = true; return true; }
    catch (_) { available = false; return false; }
  }
  function record(stats, won, guesses) {
    stats.played++;
    if (won) { stats.wins++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); stats.distribution[guesses - 1]++; }
    else stats.streak = 0;
  }
  global.JathrStorage = { load, save, record, get available() { return available; } };
})(globalThis);
