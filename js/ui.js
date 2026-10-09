(async function () {
  'use strict';
  const G = JathrGame, S = JathrStorage;
  const $ = id => document.getElementById(id);
  const feedback = { correct: 'حرف ومكان صحيحان', present: 'حرف موجود في مكان آخر', absent: 'حرف غير موجود' };
  const symbols = { correct: '●', present: '▲', absent: '×' };
  const data = S.load();
  let words, mode = 'daily', round, entry, draft = '', day = G.dayNumber(), animating = false;
  function persist() { S.save(data); $('storage-note').hidden = S.available; }
  function say(text) { $('message').textContent = text; }
  function finished() { return G.roundStatus(round.guesses, entry.root) !== 'playing'; }
  function restore(saved, index, date) {
    if (saved && saved.index === index && saved.day === date && Array.isArray(saved.guesses) && saved.guesses.length <= 6 && saved.guesses.every(g => G.isRoot(g))) {
      const winIndex = saved.guesses.findIndex(g => G.normalize(g) === G.normalize(words[index].root));
      if (winIndex < 0 || winIndex === saved.guesses.length - 1) return { index, day: date, guesses: saved.guesses.map(G.normalize), recorded: saved.recorded === true };
    }
    return { index, day: date, guesses: [], recorded: false };
  }
  function randomIndex() {
    // Exclude the current root so a new practice round offers a different puzzle.
    const candidates = words.map((w, i) => i).filter(i => !entry || words[i].root !== entry.root);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  function start(nextMode, freshPractice = false) {
    mode = nextMode; day = G.dayNumber(); draft = ''; animating = false;
    if (mode === 'daily') {
      const index = words.indexOf(G.dailyWord(words, day));
      round = restore(data.daily, index, day); data.daily = round;
    } else {
      const index = !freshPractice && Number.isInteger(data.practice?.index) && words[data.practice.index] ? data.practice.index : randomIndex();
      round = restore(freshPractice ? null : data.practice, index, null); data.practice = round;
    }
    entry = words[round.index];
    $('word').textContent = entry.word;
    $('round-label').textContent = mode === 'daily' ? `التحدّي #${day.toLocaleString('ar', { useGrouping: false })} · UTC` : 'تدريب حرّ · بلا حدود';
    $('difficulty').textContent = ['سهل', 'متوسط', 'متقدّم'][entry.difficulty - 1];
    $('daily-mode').setAttribute('aria-pressed', String(mode === 'daily'));
    $('practice-mode').setAttribute('aria-pressed', String(mode === 'practice'));
    recordResult(); render(); persist();
  }
  function recordResult() {
    if (finished() && !round.recorded) {
      S.record(data.stats, G.roundStatus(round.guesses, entry.root) === 'won', round.guesses.length);
      round.recorded = true;
    }
  }
  function checkDate() {
    if (mode === 'daily' && day !== G.dayNumber()) { start('daily'); say('بدأ تحدّي يوم جديد.'); return true; }
    return false;
  }
  function renderBoard(reveal = false) {
    $('board').replaceChildren();
    for (let i = 0; i < 6; i++) {
      const row = document.createElement('div'); row.className = 'guess-row';
      const guess = round.guesses[i];
      const letters = [...(guess || (i === round.guesses.length && !finished() ? draft : ''))];
      const result = guess ? G.evaluateGuess(guess, entry.root) : null;
      row.setAttribute('role', 'group'); row.setAttribute('aria-label', `المحاولة ${i + 1}`);
      for (let j = 0; j < 3; j++) {
        const tile = document.createElement('span');
        tile.className = 'tile' + (result ? ` ${result[j]}` : letters[j] ? ' filled' : '');
        if (!guess && i === round.guesses.length && j === draft.length && !finished()) tile.classList.add('cursor');
        const letter = document.createElement('span'); letter.textContent = letters[j] || ''; tile.append(letter);
        if (result) {
          const shape = document.createElement('span'); shape.className = 'shape'; shape.textContent = symbols[result[j]]; shape.setAttribute('aria-hidden', 'true'); tile.append(shape);
          if (reveal && i === round.guesses.length - 1) { tile.classList.add('reveal'); tile.style.animationDelay = `${j * 90}ms`; }
        }
        tile.setAttribute('aria-label', letters[j] ? `${letters[j]}${result ? '، ' + feedback[result[j]] : '، لم يُقيّم بعد'}` : 'خانة فارغة');
        row.append(tile);
      }
      $('board').append(row);
    }
  }
  function render(reveal = false) {
    renderBoard(reveal);
    const status = G.roundStatus(round.guesses, entry.root);
    say(status === 'won' ? `أحسنت! الجذر هو ${[...entry.root].join(' ')}.` : status === 'lost' ? `انتهت المحاولات. الجذر هو ${[...entry.root].join(' ')}.` : `المحاولة ${(round.guesses.length + 1).toLocaleString('ar')} من ٦`);
    $('submit-guess').disabled = finished(); $('clear-guess').disabled = finished();\n    $('result-actions').hidden = !finished(); $('next-button').hidden = mode !== 'practice';
    $('hints').replaceChildren();
    const wrong = round.guesses.filter(g => G.normalize(g) !== G.normalize(entry.root)).length;
    if (wrong >= 2) addHint('الوزن', entry.pattern);
    if (wrong >= 4) addHint('المعنى', entry.meaning);
    const ranks = { absent: 1, present: 2, correct: 3 }, known = {};
    round.guesses.forEach(g => G.evaluateGuess(g, entry.root).forEach((s, i) => { if (!known[g[i]] || ranks[s] > ranks[known[g[i]]]) known[g[i]] = s; }));
    document.querySelectorAll('[data-letter]').forEach(button => {
      const state = known[G.normalize(button.dataset.letter)];
      button.className = 'key' + (state ? ` ${state}` : '');
      button.querySelector('.shape').textContent = state ? symbols[state] : '';
      button.setAttribute('aria-label', `${button.dataset.letter}${state ? '، ' + feedback[state] : ''}`);
    });
    document.querySelectorAll('#keyboard button').forEach(b => { b.disabled = finished(); });
  }
  function addHint(label, text) {
    const p = document.createElement('p'), b = document.createElement('b'); b.textContent = label + ': '; p.append(b, text); $('hints').append(p);
  }
  function input(key) {
    if (!words || checkDate() || finished() || animating) return;
    if (key === 'delete') { draft = draft.slice(0, -1); renderBoard(); return; }
    if (key === 'enter') {
      if (draft.length !== 3) {
        say('أدخل ثلاثة أحرف أولًا.');
        const active = $('board').children[round.guesses.length]; active.classList.remove('shake'); void active.offsetWidth; active.classList.add('shake');
        return;
      }
      round.guesses.push(draft); draft = ''; recordResult(); persist(); render(true);
      animating = true; setTimeout(() => { animating = false; }, 500);
      return;
    }
    const letter = G.normalize(key);
    if (/^[ء-غف-ي]$/.test(letter) && draft.length < 3) { draft += letter; renderBoard(); }
  }
  function buildKeyboard() {
    for (const letters of ['ض ص ث ق ف غ ع ه خ ح ج د', 'ش س ي ب ل ا ت ن م ك ط', 'ئ ء ؤ ر ز و ة ى ذ ظ']) {
      const row = document.createElement('div'); row.className = 'key-row';
      for (const letter of letters.split(' ')) {
        const b = document.createElement('button'); b.className = 'key'; b.dataset.letter = letter; b.setAttribute('aria-label', letter);
        const text = document.createElement('span'); text.textContent = letter;
        const shape = document.createElement('span'); shape.className = 'shape'; shape.setAttribute('aria-hidden', 'true'); b.append(text, shape);
        b.addEventListener('click', () => input(letter)); row.append(b);
      }
      $('keyboard').append(row);
    }
    const controls = document.createElement('div'); controls.className = 'key-row controls';
    for (const [key, label] of [['enter', 'تأكيد'], ['delete', 'حذف']]) {
      const b = document.createElement('button'); b.className = `key ${key}`; b.textContent = label; b.setAttribute('aria-label', key === 'enter' ? 'تأكيد الجذر' : 'حذف آخر حرف'); b.addEventListener('click', () => input(key)); controls.append(b);
    }
    $('keyboard').append(controls);
  }
  function showStats() {
    const s = data.stats, content = $('stats-content'); content.replaceChildren();
    const numbers = document.createElement('div'); numbers.className = 'stat-numbers';
    for (const [value, label] of [[s.played, 'جولات'], [s.played ? Math.round(s.wins / s.played * 100) : 0, '٪ فوز'], [s.streak, 'السلسلة'], [s.best, 'أفضل سلسلة']]) {
      const item = document.createElement('div'), strong = document.createElement('strong'), name = document.createElement('span'); strong.textContent = value.toLocaleString('ar'); name.textContent = label; item.append(strong, name); numbers.append(item);
    }
    content.append(numbers);
    const heading = document.createElement('h3'); heading.textContent = 'توزيع المحاولات الفائزة'; content.append(heading);
    const max = Math.max(1, ...s.distribution);
    s.distribution.forEach((count, i) => {
      const row = document.createElement('div'); row.className = 'distribution'; row.setAttribute('aria-label', `${i + 1} محاولات: ${count} انتصارات`);
      const label = document.createElement('span'); label.textContent = (i + 1).toLocaleString('ar');
      const bar = document.createElement('div'); bar.className = 'bar'; bar.style.width = `${Math.max(8, count / max * 100)}%`; bar.textContent = count.toLocaleString('ar'); row.append(label, bar); content.append(row);
    });
    $('stats-dialog').showModal();
  }
  $('submit-guess').addEventListener('click', () => input('enter'));\n  $('clear-guess').addEventListener('click', () => { if (!finished() && !animating) { draft = ''; renderBoard(); } });\n  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  $('stats-button').addEventListener('click', showStats);
  document.querySelectorAll('.close-dialog').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $('color-blind').checked = data.colorBlind;
  document.body.classList.toggle('color-blind', data.colorBlind);
  $('color-blind').addEventListener('change', e => { data.colorBlind = e.target.checked; document.body.classList.toggle('color-blind', data.colorBlind); persist(); });
  $('daily-mode').addEventListener('click', () => { if (words) start('daily'); });
  $('practice-mode').addEventListener('click', () => { if (words) start('practice'); });
  $('next-button').addEventListener('click', () => start('practice', true));
  $('share-button').addEventListener('click', async () => {
    const text = G.shareText(round.guesses, entry.root, mode === 'daily' ? `#${day}` : 'تدريب');
    try { await navigator.clipboard.writeText(text); say('نُسخت النتيجة. شاركها مع أصدقائك!'); }
    catch (_) { $('share-text').value = text; $('share-dialog').showModal(); $('share-text').focus(); $('share-text').select(); }
  });
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey || e.target.matches('textarea, input')) return;
    // Let focused buttons handle Enter/Space natively for accessible navigation.
    if (e.key === 'Enter' && e.target.closest('button')) {\n      if (e.target.closest('#keyboard') || e.target.id === 'submit-guess') { e.preventDefault(); input('enter'); }\n      return;\n    }
    if (e.key === 'Enter' || e.key === 'Backspace' || /^[ء-غف-يأإآٱ]$/.test(e.key)) {
      e.preventDefault(); input(e.key === 'Enter' ? 'enter' : e.key === 'Backspace' ? 'delete' : e.key);
    }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && words) checkDate(); });
  setInterval(() => { if (words && !document.hidden) checkDate(); }, 30000);
  try {
    const response = await fetch('data/words.json');
    if (!response.ok) throw new Error('Word data unavailable');
    words = await response.json();
    if (!Array.isArray(words) || !words.length) throw new Error('Empty word data');
    buildKeyboard(); start('daily');
  } catch (_) { say('تعذّر تحميل الكلمات. أعد تحميل الصفحة عبر خادم ملفات محلي.'); }
})();
