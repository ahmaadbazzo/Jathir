(async function () {
  'use strict';
  const G = JathrGame, S = JathrStorage, A = JathrAudio;
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
      if (winIndex < 0 || winIndex === saved.guesses.length - 1) return { index, day: date, guesses: saved.guesses.map(G.normalize), recorded: saved.recorded === true && G.roundStatus(saved.guesses, words[index].root) !== 'playing' };
    }
    return { index, day: date, guesses: [], recorded: false };
  }
  function eligible(w) { return w.difficulty === Number(data.practiceLevel); }
  function randomIndex() {
    // Exclude the current root so a new practice round offers a different puzzle.
    let candidates = words.map((w, i) => i).filter(i => eligible(words[i]) && (!entry || G.normalize(words[i].root) !== G.normalize(entry.root)));
    if (!candidates.length) candidates = words.map((w, i) => i).filter(i => eligible(words[i]));
    if (!candidates.length) candidates = words.map((w, i) => i);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  function start(nextMode, freshPractice = false) {
    mode = nextMode; day = G.dayNumber(); draft = ''; animating = false;
    if (mode === 'daily') {
      const index = words.indexOf(G.dailyWord(words.slice(0, 120), day));
      round = restore(data.daily, index, day); data.daily = round;
    } else {
      const index = !freshPractice && Number.isInteger(data.practice?.index) && words[data.practice.index] && eligible(words[data.practice.index]) ? data.practice.index : randomIndex();
      round = restore(freshPractice ? null : data.practice, index, null); data.practice = round;
    }
    entry = words[round.index];
    $('word').textContent = entry.word;
    $('round-label').textContent = mode === 'daily' ? `#${day.toLocaleString('ar', { useGrouping: false })}` : '∞';
    $('difficulty').textContent = ['سهل', 'متوسط', 'متقدم', 'نخبة'][entry.difficulty - 1];
    $('daily-mode').setAttribute('aria-pressed', String(mode === 'daily'));
    $('practice-mode').setAttribute('aria-pressed', String(mode === 'practice'));
    $('practice-options').hidden = mode !== 'practice';
    for (let level = 1; level <= 4; level++) $('level-' + level).setAttribute('aria-pressed', String(data.practiceLevel === String(level)));
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
    say(status === 'won' ? `أحسنت! ${[...entry.root].join(' ')}` : status === 'lost' ? `الجذر: ${[...entry.root].join(' ')}` : `${(round.guesses.length + 1).toLocaleString('ar')} / ٦`);
    $('submit-guess').disabled = finished(); $('clear-guess').disabled = finished(); $('delete-letter').disabled = finished();
    $('result-actions').hidden = !finished(); $('next-button').hidden = mode !== 'practice';
    $('root-story').textContent = finished() ? entry.meaning : '';
    $('game-screen').classList.toggle('won', status === 'won');
    document.querySelector('.play-actions').hidden = finished();
    $('welcome-status').textContent = '';
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
    if (key === 'delete') { draft = draft.slice(0, -1); A.play('delete'); renderBoard(); return; }
    if (key === 'enter') {
      if (draft.length !== 3) {
        say('أدخل ثلاثة أحرف أولًا.'); A.play('error');
        const active = $('board').children[round.guesses.length]; active.classList.remove('shake'); void active.offsetWidth; active.classList.add('shake');
        return;
      }
      round.guesses.push(draft); draft = ''; recordResult(); persist(); render(true); A.play(finished() ? G.roundStatus(round.guesses, entry.root) : 'submit');
      animating = true; setTimeout(() => { animating = false; }, 500);
      return;
    }
    const letter = G.normalize(key);
    if (/^[ء-غف-ي]$/.test(letter) && draft.length < 3) { draft += letter; A.play('tap'); renderBoard(); }
  }
  function buildKeyboard() {
    for (const letters of ['ا ب ت ث ج ح خ د ذ', 'ر ز س ش ص ض ط ظ', 'ع غ ف ق ك ل م ن', 'ه و ي ء ؤ ئ ة ى']) {
      const row = document.createElement('div'); row.className = 'key-row';
      for (const letter of letters.split(' ')) {
        const b = document.createElement('button'); b.className = 'key'; b.dataset.letter = letter; b.setAttribute('aria-label', letter);
        const text = document.createElement('span'); text.textContent = letter;
        const shape = document.createElement('span'); shape.className = 'shape'; shape.setAttribute('aria-hidden', 'true'); b.append(text, shape);
        b.addEventListener('click', () => input(letter)); row.append(b);
      }
      $('keyboard').append(row);
    }
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
  $('delete-letter').addEventListener('click', () => input('delete'));
  $('submit-guess').addEventListener('click', () => input('enter'));
  $('clear-guess').addEventListener('click', () => { if (words && !checkDate() && !finished() && !animating) { draft = ''; renderBoard(); } });
  $('settings-button').addEventListener('click', () => $('settings-dialog').showModal());
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
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
    if (document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey || e.target.matches('textarea, input, select') || !$('welcome-screen').hidden) return;
    // Let focused buttons handle Enter/Space natively for accessible navigation.
    if (e.key === 'Enter' && e.target.closest('button')) {
      if (e.target.id === 'submit-guess' || e.target.closest('#keyboard')) { e.preventDefault(); input('enter'); }
      return;
    }
    if (e.key === 'Enter' || e.key === 'Backspace' || /^[ء-غف-يأإآٱ]$/.test(e.key)) {
      e.preventDefault(); input(e.key === 'Enter' ? 'enter' : e.key === 'Backspace' ? 'delete' : e.key);
    }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && words) checkDate(); });
  setInterval(() => { if (words && !document.hidden) checkDate(); }, 30000);
  async function loadWords() {
    say('جارٍ تحميل الكلمات…');
    $('retry-load').hidden = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('data/words.json', { signal: controller.signal });
      if (!response.ok) throw new Error('Word data unavailable');
      const loaded = await response.json();
      if (!Array.isArray(loaded) || !loaded.length || !loaded.every(w => w &&
        ['word', 'root', 'pattern', 'meaning'].every(k => typeof w[k] === 'string' && w[k].trim()) &&
        G.isRoot(w.root) && [1, 2, 3, 4].includes(w.difficulty))) throw new Error('Invalid word data');
      if (!loaded.some(w => w.difficulty <= 3)) throw new Error('Daily pool unavailable');
      words = loaded.map(w => ({ ...w, root: G.normalize(w.root) }));
      if (data.practiceLevel === 'all') {
        const savedWord = words[data.practice?.index];
        data.practiceLevel = String(savedWord?.difficulty || 1);
      }
      buildKeyboard(); start('daily');
      ['daily-mode', 'practice-mode', 'start-daily'].forEach(id => { $(id).disabled = false; });
    } catch (_) {
      words = null;
      $('keyboard').replaceChildren();
      $('submit-guess').disabled = $('clear-guess').disabled = true;
      say(location.protocol === 'file:' ? 'افتح اللعبة عبر خادم محلي أو رابط الموقع لتتمكّن من تحميل الكلمات.' : 'تعذّر تحميل الكلمات. تحقّق من اتصالك ثم حاول مجددًا.');
      $('welcome-status').textContent = $('message').textContent;
      $('retry-load').hidden = false;
    } finally { clearTimeout(timeout); }
  }

  A.setEnabled(data.sound);
  function soundLabel() {
    $('sound-button').setAttribute('aria-pressed', String(data.sound));
    $('sound-button').setAttribute('aria-label', data.sound ? 'كتم الصوت' : 'تشغيل الصوت');
    $('sound-button').classList.toggle('muted', !data.sound);
  }
  soundLabel();
  $('sound-button').addEventListener('click', () => { data.sound = !data.sound; A.setEnabled(data.sound); soundLabel(); persist(); A.play('tap'); });
  $('reduce-motion').checked = data.reduceMotion;
  document.body.classList.toggle('motion-off', data.reduceMotion);
  $('reduce-motion').addEventListener('change', e => { data.reduceMotion = e.target.checked; document.body.classList.toggle('motion-off', data.reduceMotion); persist(); });
  for (let level = 1; level <= 4; level++) {
    $('level-' + level).addEventListener('click', () => {
      if (!words || mode !== 'practice' || data.practiceLevel === String(level)) return;
      data.practiceLevel = String(level); start('practice', true); A.play('start');
    });
  }
  function openGame(nextMode) {
    if (!words) return;
    $('welcome-screen').hidden = true; $('game-screen').hidden = false;
    start(nextMode); A.play('start'); $('word').focus();
  }
  function home() { $('welcome-screen').hidden = false; $('game-screen').hidden = true; $('start-daily').focus(); }
  $('home-button').addEventListener('click', home);
  $('back-home').addEventListener('click', home);
  $('start-daily').addEventListener('click', () => openGame('daily'));



  $('retry-load').addEventListener('click', loadWords);
  await loadWords();
})();

