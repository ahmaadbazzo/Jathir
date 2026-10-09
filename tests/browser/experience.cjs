// Optional development tool; the site and node:test suite have no dependencies.
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const roots=require('../../data/words.json');
const solutions=require('../../data/words5.json');
const G=require('../../js/game.js');
const W=require('../../js/wordgame.js');
const url=process.env.JATHIR_URL||'http://127.0.0.1:8010';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];
 const shots=path.join(__dirname,'../../docs/screenshots');fs.mkdirSync(shots,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('Test clipboard fallback');}},configurable:true});});
  async function ready(){await page.waitForFunction(()=>!document.querySelector('#start-daily').disabled&&!document.querySelector('#wordgame-launch').disabled);}
  async function type(text,prefix=''){for(const letter of text)await page.click(`${prefix||'#keyboard'} [data-letter="${letter}"]`);}
  async function saved(key){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
  await page.goto(url);await ready();
  for(const [width,height,name] of [[320,740,'320'],[390,844,'390'],[1440,1000,'desktop']]){
   await page.setViewportSize({width,height});
   assert(await page.locator('#welcome-screen').isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(shots,`home-${name}.png`)});
   await page.click('#start-daily');
   assert(await page.locator('#board .tile').count()===18);
   assert(await page.evaluate(()=>document.querySelector('.site-shell').scrollWidth<=document.querySelector('.site-shell').clientWidth));
   await page.screenshot({path:path.join(shots,`jathr-${name}.png`)});
   await page.click('#back-home');await page.click('#wordgame-launch');
   assert.equal(await page.locator('#wg-board .tile').count(),30);
   await page.screenshot({path:path.join(shots,`word-${name}.png`)});
   const gutter=await page.locator('#sources-button').boundingBox();
   const scrollport=await page.locator('.site-shell').boundingBox();
   assert(gutter.y>=scrollport.y+scrollport.height);
   await page.click('#wg-home');
  }
  await page.setViewportSize({width:390,height:844});
  await page.click('#start-daily');
  const originalDay=await page.locator('#word').textContent();
  await page.click('#practice-mode');await page.click('#level-4');
  assert.equal(await page.locator('#difficulty').textContent(),'نخبة');
  let j=await saved('jathr.v1');assert.equal(j.practiceLevel,'4');
  await type(roots[j.practice.index].root);await page.keyboard.press('Enter');
  assert.match(await page.locator('#message').textContent(),/أحسنت/);
  await page.click('#share-button');assert(await page.locator('#share-dialog').isVisible());await page.keyboard.press('Escape');
  const jathrStats=(await saved('jathr.v1')).stats;
  await page.click('#daily-mode');assert.equal(await page.locator('#word').textContent(),originalDay);
  assert.equal(await page.locator('#practice-options').isVisible(),false);
  await page.click('#back-home');await page.click('#wordgame-launch');
  await page.click('#wg-practice');
  let w=await saved('jathr.wordgame.v1');const answer=solutions[w.practice.index].word;
  await type('ضضضضض','#wg-keyboard');await page.click('#wg-submit');
  assert.match(await page.locator('#wg-message').textContent(),/المعجم/);
  assert.equal((await saved('jathr.wordgame.v1')).practice.guesses.length,0);
  await page.click('#wg-clear');await type('ا','#wg-keyboard');await page.click('#wg-delete');
  assert.equal(await page.locator('#wg-board .filled').count(),0);
  await type(answer,'#wg-keyboard');await page.keyboard.press('Enter');
  assert.match(await page.locator('#wg-message').textContent(),/أحسنت/);
  assert.deepEqual((await saved('jathr.v1')).stats,jathrStats);
  assert.equal((await saved('jathr.wordgame.v1')).stats.wins,1);
  await page.click('#wg-share');const share=await page.locator('#share-text').inputValue();assert(!share.includes(answer));assert(share.includes('1/6'));await page.keyboard.press('Escape');
  await page.reload();await ready();await page.click('#wordgame-launch');await page.click('#wg-practice');
  assert.equal((await saved('jathr.wordgame.v1')).stats.wins,1);
  await page.click('#wg-next');w=await saved('jathr.wordgame.v1');assert.notEqual(solutions[w.practice.index].word,answer);
  await page.click('#help-button');assert.equal(await page.locator('#rules-content p').count(),4);await page.keyboard.press('Escape');
  await page.click('#stats-button');assert((await page.locator('#stats-title').textContent()).includes(W.NAME));await page.keyboard.press('Escape');
  await page.click('#sources-button');await page.waitForSelector('.source-card');assert.equal(await page.locator('.source-card').count(),3);assert((await page.locator('#sources-content').textContent()).includes('CC BY-SA 4.0'));await page.keyboard.press('Escape');
  await page.click('#sound-button');await page.click('#settings-button');await page.check('#reduce-motion');await page.check('#color-blind');await page.keyboard.press('Escape');
  await page.reload();await ready();assert.equal(await page.locator('#sound-button').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#reduce-motion').isChecked(),true);assert.equal(await page.locator('#color-blind').isChecked(),true);
  const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto(url);assert.equal(await reduced.locator('.ambient-pattern').evaluate(e=>getComputedStyle(e).animationName),'none');
  // Failed data can be retried without affecting the other game.
  const failed=await browser.newPage();let fail=true;await failed.route('**/data/words5.json',route=>fail?route.fulfill({status:503,body:'unavailable'}):route.continue());
  await failed.goto(url);await failed.waitForSelector('#wg-retry:not([hidden])');assert(await failed.locator('#wordgame-launch').isDisabled());
  await failed.waitForFunction(()=>!document.querySelector('#start-daily').disabled);fail=false;await failed.click('#wg-retry');await failed.waitForFunction(()=>!document.querySelector('#wordgame-launch').disabled);
  // Both games remain playable when persistent storage is blocked.
  const blocked=await browser.newPage();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));await blocked.goto(url);await blocked.waitForFunction(()=>!document.querySelector('#wordgame-launch').disabled);await blocked.click('#wordgame-launch');assert(await blocked.locator('#storage-note').isVisible());
  // Cross midnight: daily rounds reset using UTC, not local time.
  const clock=await browser.newPage();await clock.clock.install({time:new Date('2026-01-01T23:59:00Z')});await clock.goto(url);await clock.waitForFunction(()=>!document.querySelector('#wordgame-launch').disabled);await clock.click('#wordgame-launch');
  assert.equal(await clock.evaluate(()=>JSON.parse(localStorage.getItem('jathr.wordgame.v1')).daily.day),1);
  await clock.clock.setSystemTime(new Date('2026-01-02T00:00:01Z'));await clock.click('#wg-keyboard [data-letter="ا"]');
  const day=await clock.evaluate(()=>JSON.parse(localStorage.getItem('jathr.wordgame.v1')).daily.day);assert.equal(day,2);
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: 320/390/desktop, both games, dictionary rejection, isolated stats, restored wins, share fallback, levels, source gutter, dialogs, preferences, retries, blocked storage, reduced motion and UTC rollover.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
