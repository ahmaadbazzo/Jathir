(function (global) {
  'use strict';
  const KEY = 'jathr.wordgame.v1';
  const fresh = () => ({ stats: { played: 0, wins: 0, streak: 0, best: 0, distribution: [0, 0, 0, 0, 0, 0] }, daily: null, practice: null });
  function create(storage) {
    let available = true;
    return {
      get available() { return available; },
      load() {
        try {
          const saved = JSON.parse(storage.getItem(KEY));
          if (!saved) return fresh();
          const s = saved.stats;
          if (!s || !['played','wins','streak','best'].every(k => Number.isSafeInteger(s[k]) && s[k] >= 0) || s.wins > s.played || s.streak > s.best || s.best > s.wins || !Array.isArray(s.distribution) || s.distribution.length !== 6 || !s.distribution.every(n => Number.isSafeInteger(n) && n >= 0) || s.distribution.reduce((a,b) => a+b, 0) !== s.wins) return fresh();
          return { stats: s, daily: saved.daily || null, practice: saved.practice || null };
        } catch (_) { available = false; return fresh(); }
      },
      save(data) {
        try { storage.setItem(KEY, JSON.stringify(data)); available = true; return true; }
        catch (_) { available = false; return false; }
      }
    };
  }
  const api = { KEY, fresh, create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.JathrWordStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
