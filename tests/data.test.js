const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const roots=require('../data/words.json');
const original=require('./fixtures/original120.json');
const sources=require('../data/sources.json');
const legacy=require('../data/legacy-sources.json');
const solutions=require('../data/words5.json');
const allowed=require('../data/allowed5.json');
const {validate}=require('../scripts/validate-words.js');
const {counts}=require('../js/sources.js');
test('all 120 original objects/order are immutable; daily selection never expands',()=>{
 assert.deepEqual(roots.slice(0,120),original);
 assert.deepEqual(validate(roots),[]);
 assert.equal(roots.length,600);
 for(let level=1;level<=4;level++)assert.equal(roots.filter(w=>w.difficulty===level).length,150);
});
test('every entry resolves to a recorded source; legacy records stay honest and external',()=>{
 const ids=new Set(sources.map(s=>s.id));assert.equal(ids.size,sources.length);
 for(const s of sources){assert.match(s.url,/^https:\/\//);assert(s.license);assert(s.used);assert.match(s.retrieved,/^\d{4}-\d{2}-\d{2}$/);}
 assert.equal(legacy.length,120);
 for(const [i,word] of roots.entries())assert(ids.has(word.source||legacy[i]?.source));
 for(const word of [...solutions,...allowed])assert(ids.has(word.source));
 assert.deepEqual(counts('enwiktionary',roots,legacy,solutions,allowed),{jathr:455,solutions:1000,guesses:6872});
 assert.equal(counts('legacy-jathir',roots,legacy,solutions,allowed).jathr,145);
 assert.equal(counts('frequencywords',roots,legacy,solutions,allowed).solutions,1000);
});
test('five-letter daily solution order matches frozen fingerprint',()=>{
 const hash=crypto.createHash('sha256').update(solutions.map(e=>e.word).join('\n')).digest('hex');
 assert.equal(hash,fs.readFileSync(path.join(__dirname,'../data/words5-order.sha256'),'utf8').trim());
});
