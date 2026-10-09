#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const W = require('../js/wordgame.js');
const sources = new Set(require('../data/sources.json').map(s => s.id));
function validate(solutions, allowed) {
  const errors = [];
  if (!Array.isArray(solutions) || solutions.length !== 1000) errors.push('Expected 1000 solutions');
  if (!Array.isArray(allowed) || allowed.length < 3000) errors.push('Expected at least 3000 allowed guesses');
  for (const [label, entries] of [['solution',solutions],['guess',allowed]]) {
    const seen = new Set();
    for (const [i, entry] of (Array.isArray(entries) ? entries : []).entries()) {
      if (!entry || !W.isWord(entry.word) || W.normalize(entry.word) !== entry.word) errors.push(`${label} ${i}: invalid normalized word`);
      if (!entry || !sources.has(entry.source) || typeof entry.sourceWord !== 'string' || W.normalize(entry.sourceWord) !== entry.word) errors.push(`${label} ${i}: invalid provenance`);
      if (seen.has(entry?.word)) errors.push(`${label} ${i}: duplicate`);
      seen.add(entry?.word);
    }
  }
  const guesses = new Set((allowed || []).map(e => e.word));
  if ((solutions || []).some(e => !guesses.has(e.word))) errors.push('Solution missing from allowed guesses');
  return errors;
}
if (require.main === module) {
  try {
    const solutions = require('../data/words5.json'), allowed = require('../data/allowed5.json');
    const errors = validate(solutions, allowed);
    const hash = crypto.createHash('sha256').update(solutions.map(e => e.word).join('\n')).digest('hex');
    if (hash !== fs.readFileSync(path.join(__dirname,'../data/words5-order.sha256'),'utf8').trim()) errors.push('Daily solution order changed');
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log(`Validated ${solutions.length} solutions and ${allowed.length} allowed guesses.`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { validate };
