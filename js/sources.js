(function (global) {
  'use strict';
  function counts(source, roots, legacy, solutions, guesses) {
    const inherited = new Map(legacy.map(e=>[e.word,e.source]));
    const used = (entry, id) => entry.source === id || entry.frequencySource === id;
    return {
      jathr: roots.filter(e=>used(e,source) || (!e.source && inherited.get(e.word)===source)).length,
      solutions: solutions.filter(e=>used(e,source)).length,
      guesses: guesses.filter(e=>used(e,source)).length
    };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { counts }; return; }
  const $ = id=>document.getElementById(id);
  let loaded=false;
  function link(text,url) {
    const a=document.createElement('a');a.textContent=text;a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
  }
  async function load() {
    $('sources-retry').hidden=true;
    const content=$('sources-content');content.textContent='تحميل…';
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const responses=await Promise.all(['sources','words','legacy-sources','words5','allowed5'].map(name=>fetch(`data/${name}.json`,{signal:controller.signal})));
      if(responses.some(r=>!r.ok))throw Error('Unavailable');
      const [sources,roots,legacy,solutions,guesses]=await Promise.all(responses.map(r=>r.json()));
      if(![sources,roots,legacy,solutions,guesses].every(Array.isArray))throw Error('Invalid source data');
      content.replaceChildren();
      sources.forEach(source=>{
        const article=document.createElement('article');article.className='source-card';
        const heading=document.createElement('h3');heading.append(link(source.name,source.url));article.append(heading);
        const license=document.createElement('p');license.append(source.licenseUrl?link(source.license,source.licenseUrl):source.license);article.append(license);
        const count=counts(source.id,roots,legacy,solutions,guesses),summary=document.createElement('p');
        summary.textContent=`جذر: ${count.jathr.toLocaleString('ar')} · ${JathrWordGame.NAME}: ${count.solutions.toLocaleString('ar')} حل / ${count.guesses.toLocaleString('ar')} تخمين`;
        article.append(summary);
        for(const text of [source.authors,source.used,source.notice])if(text){const p=document.createElement('p');p.textContent=text;article.append(p);}
        const retrieved=document.createElement('p');retrieved.textContent=`استرجاع: ${source.retrieved}`;retrieved.dir='auto';article.append(retrieved);
        content.append(article);
      });
      const files=document.createElement('p');files.append(link('مداخل جذر','data/words.json'),' · ',link('الحلول','data/words5.json'),' · ',link('التخمينات','data/allowed5.json'),' · ',link('إشعار الترخيص','data/LICENSE.md'));content.append(files);
      loaded=true;
    } catch(_) {content.textContent='تعذّر تحميل المصادر';$('sources-retry').hidden=false;}
    finally{clearTimeout(timeout);}
  }
  $('sources-button').addEventListener('click',()=>{$('sources-dialog').showModal();if(!loaded)load();});
  $('sources-retry').addEventListener('click',load);
})(typeof globalThis !== 'undefined' ? globalThis : this);
