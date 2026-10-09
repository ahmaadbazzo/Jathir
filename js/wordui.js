(async function () {
  'use strict';
  const W = JathrWordGame, A = JathrAudio, $ = id => document.getElementById(id);
  // Lazy access also catches browsers that throw when localStorage is accessed.
  const storage = JathrWordStorage.create({ getItem: key => localStorage.getItem(key), setItem: (key,value) => localStorage.setItem(key,value) });
  const data = storage.load();
  let solutions, allowed, mode = 'daily', day, round, answer, draft = '', locked = false;
  const shapes = { correct:'●', present:'▲', absent:'×' };
  const labels = { correct:'حرف ومكان صحيحان', present:'حرف في مكان آخر', absent:'حرف غير موجود' };
  const say = text => { $('wg-message').textContent = text; };
  const status = () => W.roundStatus(round.guesses,answer);
  const persist = () => { storage.save(data); $('storage-note').hidden = storage.available; };
  $('wordgame-name').textContent = $('wg-name').textContent = W.NAME;
  $('wordgame-launch').setAttribute('aria-label', `لعبة ${W.NAME}، خمّن خمسة أحرف`);
  function record() {
    if (status() !== 'playing' && !round.recorded) {
      JathrStorage.record(data.stats,status() === 'won',round.guesses.length);
      round.recorded = true;
    }
  }
  function start(nextMode, fresh = false) {
    mode = nextMode; day = W.dayNumber(); draft = ''; locked = false;
    let index;
    if (mode === 'daily') index = W.dailyIndex(solutions.length,day);
    else {
      const saved = data.practice?.index;
      index = !fresh && Number.isInteger(saved) && solutions[saved] ? saved : W.practiceIndex(solutions.length,round?.index);
    }
    answer = solutions[index].word;
    round = W.restore(fresh ? null : data[mode],index,mode === 'daily' ? day : null,answer,allowed);
    data[mode] = round; record(); render(); persist();
    $('wg-daily').setAttribute('aria-pressed',String(mode === 'daily'));
    $('wg-practice').setAttribute('aria-pressed',String(mode === 'practice'));
    $('wg-round').textContent = mode === 'daily' ? '#' + day.toLocaleString('ar',{useGrouping:false}) : '∞';
  }
  function rollover() {
    if (solutions && round && mode === 'daily' && day !== W.dayNumber()) { start('daily'); say('تحدٍّ جديد'); return true; }
    return false;
  }
  function board(reveal = false) {
    $('wg-board').replaceChildren();
    for (let i=0;i<6;i++) {
      const row=document.createElement('div'); row.className='guess-row';
      row.setAttribute('role','group');row.setAttribute('aria-label',`المحاولة ${i+1}`);
      const guess=round.guesses[i];
      const text=guess || (i === round.guesses.length && status() === 'playing' ? draft : '');
      const feedback=guess ? W.evaluateGuess(guess,answer) : null;
      for (let j=0;j<5;j++) {
        const tile=document.createElement('span');tile.className='tile'+(feedback?' '+feedback[j]:text[j]?' filled':'');
        const letter=document.createElement('span');letter.textContent=text[j]||'';tile.append(letter);
        if (!guess && status() === 'playing' && i === round.guesses.length && j === draft.length) tile.classList.add('cursor');
        if (feedback) { const shape=document.createElement('span');shape.className='shape';shape.textContent=shapes[feedback[j]];shape.setAttribute('aria-hidden','true');tile.append(shape); }
        tile.setAttribute('aria-label',text[j]?`${text[j]}، ${feedback?labels[feedback[j]]:'لم يقيّم بعد'}`:'خانة فارغة');
        if (reveal && i === round.guesses.length-1) { tile.classList.add('reveal');tile.style.animationDelay=`${j*70}ms`; }
        row.append(tile);
      }
      $('wg-board').append(row);
    }
  }
  function render(reveal = false) {
    board(reveal);const state=status(), done=state!=='playing';
    say(state==='won'?'أحسنت!':state==='lost'?answer:`${(round.guesses.length+1).toLocaleString('ar')} / ٦`);
    $('wg-play').hidden=done;$('wg-results').hidden=!done;$('wg-next').hidden=mode!=='practice';
    $('wordgame-screen').classList.toggle('won',state==='won');
    const known={},rank={absent:1,present:2,correct:3};
    round.guesses.forEach(g=>W.evaluateGuess(g,answer).forEach((s,i)=>{if(!known[g[i]] || rank[s]>rank[known[g[i]]])known[g[i]]=s;}));
    document.querySelectorAll('#wg-keyboard button').forEach(b=>{
      const s=known[W.normalize(b.dataset.letter)];b.className='key'+(s?' '+s:'');b.disabled=done;
      b.querySelector('.shape').textContent=s?shapes[s]:'';
      b.setAttribute('aria-label',`${b.dataset.letter}${s?'، '+labels[s]:''}`);
    });
  }
  function input(key) {
    if (!solutions || rollover() || status()!=='playing' || locked) return;
    if(key==='delete') {draft=draft.slice(0,-1);A.play('delete');board();return;}
    if(key==='clear') {draft='';board();return;}
    if(key==='enter') {
      if(!W.isWord(draft)) {say('أدخل خمسة أحرف');A.play('error');return;}
      if(!W.allowedGuess(draft,allowed)) {say('ليست في المعجم');A.play('error');return;}
      round.guesses.push(draft);draft='';record();persist();render(true);A.play(status()==='playing'?'submit':status());
      locked=true;setTimeout(()=>{locked=false;},450);return;
    }
    const letter=W.normalize(key);
    if(/^[ء-غف-ي]$/.test(letter) && draft.length<5) {draft+=letter;A.play('tap');board();}
  }
  function keyboard() {
    $('wg-keyboard').replaceChildren();
    for(const letters of ['ا ب ت ث ج ح خ د ذ','ر ز س ش ص ض ط ظ','ع غ ف ق ك ل م ن','ه و ي ء ؤ ئ ة ى']) {
      const row=document.createElement('div');row.className='key-row';
      for(const letter of letters.split(' ')) {const b=document.createElement('button');b.className='key';b.dataset.letter=letter;b.setAttribute('aria-label',letter);const span=document.createElement('span');span.textContent=letter;const shape=document.createElement('span');shape.className='shape';shape.setAttribute('aria-hidden','true');b.append(span,shape);b.addEventListener('click',()=>input(letter));row.append(b);}
      $('wg-keyboard').append(row);
    }
  }
  function open() {
    if(!solutions)return;
    document.body.dataset.game='word';$('welcome-screen').hidden=true;$('game-screen').hidden=true;$('wordgame-screen').hidden=false;$('stats-button').hidden=false;
    start(mode);A.play('start');$('wg-title').focus();
  }
  function showStats() {
    const content=$('stats-content');content.replaceChildren();const s=data.stats;
    const numbers=document.createElement('div');numbers.className='stat-numbers';
    for(const [n,label] of [[s.played,'جولات'],[s.played?Math.round(s.wins/s.played*100):0,'٪ فوز'],[s.streak,'السلسلة'],[s.best,'الأفضل']]){const item=document.createElement('div'),value=document.createElement('strong'),name=document.createElement('span');value.textContent=n.toLocaleString('ar');name.textContent=label;item.append(value,name);numbers.append(item);}
    content.append(numbers);
    s.distribution.forEach((n,i)=>{const row=document.createElement('div');row.className='distribution';row.setAttribute('aria-label',`${i+1} محاولات: ${n} انتصارات`);const label=document.createElement('span');label.textContent=(i+1).toLocaleString('ar');const bar=document.createElement('div');bar.className='bar';bar.style.width=`${Math.max(8,n/Math.max(1,...s.distribution)*100)}%`;bar.textContent=n.toLocaleString('ar');row.append(label,bar);content.append(row);});
    $('stats-title').textContent=W.NAME+' · إنجازاتك';$('stats-dialog').showModal();
  }
  globalThis.JathrWordUI={showStats};
  $('wordgame-launch').addEventListener('click',open);$('wg-home').addEventListener('click',()=>JathrUI.home());
  $('wg-daily').addEventListener('click',()=>start('daily'));$('wg-practice').addEventListener('click',()=>start('practice'));$('wg-next').addEventListener('click',()=>start('practice',true));
  for(const [id,key] of [['submit','enter'],['delete','delete'],['clear','clear']])$('wg-'+id).addEventListener('click',()=>input(key));
  $('wg-share').addEventListener('click',async()=>{
    const text=W.shareText(round.guesses,answer,mode==='daily'?'#'+day:'تدريب');
    try{await navigator.clipboard.writeText(text);say('نُسخت');}catch(_){$('share-text').value=text;$('share-dialog').showModal();$('share-text').focus();$('share-text').select();}
  });
  document.addEventListener('keydown',e=>{
    if($('wordgame-screen').hidden || document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey || e.target.matches('input,textarea,select'))return;
    if(e.key==='Enter' && e.target.closest('button') && !e.target.closest('#wg-keyboard') && e.target.id!=='wg-submit')return;
    if(e.key==='Enter'||e.key==='Backspace'||/^[ء-غف-يأإآٱ]$/.test(e.key)){e.preventDefault();input(e.key==='Enter'?'enter':e.key==='Backspace'?'delete':e.key);}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)rollover();});
  setInterval(()=>{if(!document.hidden)rollover();},30000);
  async function load() {
    $('wg-retry').hidden=true;$('wg-load-status').hidden=true;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const responses=await Promise.all(['data/words5.json','data/allowed5.json'].map(url=>fetch(url,{signal:controller.signal})));
      if(responses.some(r=>!r.ok))throw Error('Unavailable');
      const [entries,guesses]=await Promise.all(responses.map(r=>r.json()));
      if(!Array.isArray(entries)||entries.length!==1000||!Array.isArray(guesses)||!entries.every(e=>e&&W.isWord(e.word))||!guesses.every(e=>e&&W.isWord(e.word)))throw Error('Invalid data');
      const permitted=new Set(guesses.map(e=>W.normalize(e.word)));
      if(entries.some(e=>!permitted.has(W.normalize(e.word))))throw Error('Missing guesses');
      solutions=entries;allowed=permitted;keyboard();$('wordgame-launch').disabled=false;
    } catch(_) {solutions=null;$('wg-load-status').hidden=false;$('wg-load-status').textContent='تعذّر التحميل';$('wg-retry').hidden=false;}
    finally {clearTimeout(timeout);}
  }
  $('wg-retry').addEventListener('click',load);await load();
})();
