const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../js/wordgame.js');
const G = require('../js/game.js');
const S = require('../js/wordstorage.js');
const solutions = require('../data/words5.json');
const allowed = require('../data/allowed5.json');
const { validate } = require('../scripts/validate-words5.js');
const set = new Set(allowed.map(e => e.word));
test('five-letter normalization preserves independently typeable hamza, ta marbuta and alef maqsura', () => {
  assert.equal(W.normalize(' إِشَـارَة '), 'اشارة');
  assert.equal(W.normalize('آ أ إ ٱ'), 'اااا');
  assert.equal(W.normalize('ة ى ء ئ ؤ'), 'ةىءئؤ');
  assert.equal(W.isWord('مدرسة'), true);
  for (const x of ['كتاب','مدرستان','abcde','مدر1ة']) assert.equal(W.isWord(x), false);
});
test('generic feedback handles five-letter duplicate counts and preserves Jathr behavior', () => {
  assert.deepEqual(W.evaluateGuess('سسسسس','سلسلة'), ['correct','absent','correct','absent','absent']);
  assert.deepEqual(W.evaluateGuess('مدررس','مدرسة'), ['correct','correct','correct','absent','present']);
  assert.deepEqual(G.evaluateGuess('ككك','كتب'), ['correct','absent','absent']);
  assert.throws(() => W.evaluateGuess('كتب','مدرسة'));
});
test('only attested guesses accepted and solutions all included', () => {
  assert.equal(W.allowedGuess('ضضضضض',set), false);
  assert(solutions.every(e => W.allowedGuess(e.word,set)));
  assert.deepEqual(validate(solutions,allowed), []);
  assert(solutions.every(e => e.frequencySource === 'frequencywords'));
});
test('UTC schedule and random practice have stable boundaries and no immediate repeat', () => {
  assert.equal(W.dayNumber(new Date('2026-01-01T00:00:00Z')),1);
  assert.equal(W.dayNumber(new Date('2026-01-01T23:59:59Z')),1);
  assert.equal(W.dayNumber(new Date('2026-01-02T00:00:00Z')),2);
  assert.equal(W.dailyIndex(1000,1001),0);
  for (let previous=0;previous<5;previous++) for (const n of [0,.2,.5,.9,1]) assert.notEqual(W.practiceIndex(5,previous,()=>n),previous);
  assert.equal(W.practiceIndex(1,0),0);
});
test('restore rejects corrupt/incompatible rounds and stops after a win', () => {
  const answer=solutions[0].word;
  const saved={index:0,day:42,guesses:[answer],recorded:true};
  assert.equal(W.restore(saved,0,42,answer,set).recorded,true);
  assert.equal(W.restore(saved,0,43,answer,set).guesses.length,0);
  assert.equal(W.restore({...saved,guesses:[answer,answer]},0,42,answer,set).guesses.length,0);
  assert.equal(W.restore({...saved,guesses:['ضضضضض']},0,42,answer,set).guesses.length,0);
});
test('sharing reveals grid and score only; wins/losses stop at six', () => {
  const answer=solutions[0].word;
  const text=W.shareText([answer],answer,'#42');
  assert(text.includes('1/6'));assert(!text.includes(answer));assert(text.includes('🟩🟩🟩🟩🟩'));
  assert.equal(W.roundStatus(Array(6).fill('ضضضضض'),answer),'lost');
  assert.equal(W.roundStatus([answer],answer),'won');
});
test('storage is isolated, validated, and survives blocked access', () => {
  const entries=new Map([['jathr.v1','legacy']]);
  const storage=S.create({getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)});
  const data=storage.load();data.stats.played=1;storage.save(data);
  assert.equal(entries.get('jathr.v1'),'legacy');assert.equal(storage.load().stats.played,1);
  entries.set(S.KEY,'{');assert.equal(storage.load().stats.played,0);
  const blocked=S.create({getItem(){throw Error()},setItem(){throw Error()}});
  assert.equal(blocked.load().stats.played,0);assert.equal(blocked.save(data),false);
});
