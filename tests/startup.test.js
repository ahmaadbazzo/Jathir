'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

test('all shipped JavaScript parses, including the UI entry point', () => {
  for (const file of fs.readdirSync(path.join(root, 'js'))) {
    assert.doesNotThrow(() => new vm.Script(source('js/' + file), { filename: file }));
  }
});

// Minimal DOM adapter exercises actual UI handlers without external dependencies.
async function boot(responses, saved = null, blocked = false) {
  const elements = new Map();
  class Element {
    constructor() { this.style = {}; this.children = []; this.handlers = {}; this.dataset = {}; this.classList = { add() {}, remove() {}, toggle() {} }; }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren() { this.children = []; }
    setAttribute() {}
    querySelector() { return this.children[1]; }
    showModal() { this.open = true; }
    focus() {}
    select() {}
  }
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const document = { getElementById: get, createElement: () => new Element(), body: new Element(),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
  let value = saved;
  const context = vm.createContext({ document, console, AbortController, location: { protocol: 'https:' }, navigator: {},
    localStorage: { getItem() { if (blocked) throw Error('blocked'); return value; }, setItem(k, v) { if (blocked) throw Error('blocked'); value = v; } },
    setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    fetch: async () => { const next = responses.shift(); if (next instanceof Error) throw next; return { ok: true, json: async () => next }; } });
  for (const file of ['js/game.js', 'js/storage.js', 'js/ui.js']) await vm.runInContext(source(file), context);
  return { get, context, saved: () => JSON.parse(value), click: id => get(id).handlers.click(),
    type: text => { for (const letter of text) get('keyboard').children.flatMap(row => row.children).find(b => b.dataset.letter === letter).handlers.click(); } };
}
const words = JSON.parse(source('data/words.json'));

test('starts, accepts a winning guess, saves once, restores and shares without clipboard', async () => {
  const app = await boot([words]);
  assert.equal(app.get('board').children.length, 6);
  const entry = words.find(w => w.word === app.get('word').textContent);
  app.type(entry.root);
  app.click('submit-guess');
  assert.equal(app.saved().stats.wins, 1);
  assert.equal(app.get('submit-guess').disabled, true);
  await app.click('share-button');
  assert.equal(app.get('share-dialog').open, true);
  assert.ok(app.get('share-text').value.includes('1/6'));
  const restored = await boot([words], JSON.stringify(app.saved()));
  assert.equal(restored.saved().stats.wins, 1);
  assert.equal(restored.get('result-actions').hidden, false);
  restored.click('practice-mode');
  assert.notEqual(restored.get('word').textContent, entry.word);
  assert.equal(restored.get('submit-guess').disabled, false);
});

test('failed loading is recoverable and clear is safe before a round exists', async () => {
  const app = await boot([new Error('offline'), words]);
  assert.equal(app.get('retry-load').hidden, false);
  assert.doesNotThrow(() => app.click('clear-guess'));
  await app.click('retry-load');
  assert.equal(app.get('retry-load').hidden, true);
  assert.equal(app.get('board').children.length, 6);
});

test('malformed word entries are rejected before rendering', async () => {
  for (const data of [[], [null], [{ word: 'كتاب', root: 'x' }]]) {
    const app = await boot([data]);
    assert.equal(app.get('retry-load').hidden, false);
    assert.equal(app.get('submit-guess').disabled, true);
  }
});

test('blocked storage still permits gameplay', async () => {
  const app = await boot([words], null, true);
  assert.equal(app.get('board').children.length, 6);
  assert.equal(app.get('storage-note').hidden, false);
});

test('practice remains playable with a single root', async () => {
  const app = await boot([[words[0]]]);
  app.click('practice-mode');
  assert.equal(app.get('word').textContent, words[0].word);
  app.click('next-button');
  assert.equal(app.get('board').children.length, 6);
});
