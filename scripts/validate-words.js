#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { normalize, isRoot } = require('../js/game.js');
function validate(words) {
  if (!Array.isArray(words) || !words.length) return ['Expected a nonempty array'];
  const errors = [], seen = new Set();
  words.forEach((entry, index) => {
    const label = `Entry ${index + 1}`;
    if (!entry || typeof entry !== 'object') { errors.push(`${label}: expected object`); return; }
    for (const field of ['word', 'root', 'pattern', 'meaning']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) errors.push(`${label}: missing ${field}`);
    }
    if (![1, 2, 3].includes(entry.difficulty)) errors.push(`${label}: difficulty must be 1–3`);
    if (!isRoot(entry.root || '')) errors.push(`${label}: root must contain exactly 3 Arabic letters`);
    const root = normalize(entry.root || ''), word = normalize(entry.word || '');
    if (/[اويءؤئ]/.test(root) || new Set(root).size !== 3) errors.push(`${label}: expected a sound, non-doubled root`);
    let cursor = 0;
    for (const letter of word) if (letter === root[cursor]) cursor++;
    if (cursor !== 3) errors.push(`${label}: root letters must appear in order in the word`);
    if (seen.has(word)) errors.push(`${label}: duplicate word ${word}`);
    seen.add(word);
  });
  return errors;
}
if (require.main === module) {
  try {
    const words = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/words.json'), 'utf8'));
    const errors = validate(words);
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log(`Validated ${words.length} words: all checks passed.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { validate };
