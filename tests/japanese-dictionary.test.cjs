'use strict';
const assert = require('node:assert/strict');
const Dictionary = require('../app/src/main/assets/japanese-dictionary.js');

const index = Dictionary.createIndex({
  termBanks: [[
    ['食べる', 'たべる', '', 'v1', 10, ['to eat', {type:'text', text:'to consume food'}], 1, ''],
    ['行く', 'いく', '', 'v5k', 20, ['to go; to proceed'], 2, 'common'],
    ['かな', '', 'prt', '', 2, ['a kana particle'], 3, ''],
    ['食べました', 'たべました', '', '', 0, ['polite past form'], 4, '']
  ]],
  kanjiBanks: [[
    ['食', 'ショク', 'た.べる', 'grade-2', ['eat', 'food'], {freq:'950', strokes:'9'}],
    ['行', 'コウ ギョウ', 'い.く おこな.う', 'grade-2', ['go', '行う'], {freq:'100', strokes:'6'}]
  ]],
  tagBanks: [[
    ['v1', 'partOfSpeech', 10, 'Ichidan verb', 1],
    ['v5k', 'partOfSpeech', 11, 'Godan verb with ku ending', 1],
    ['common', 'popular', 0, 'Common word', 3],
    ['grade-2', 'misc', 2, 'Second grade kanji', 0]
  ]],
  termMetaBanks: [[['食べる', 'pitch-accent', {patterns:[0,1]}]]]
});

assert.deepEqual(index.counts, {terms:4,kanji:2,tags:4,termMetadata:1});
const eaten = index.lookupTerm('食べ', {lemma:'食べる',reading:'たべ'});
assert.equal(eaten.length,1);
assert.equal(eaten[0].expression,'食べる');
assert.equal(eaten[0].match,'lemma');
assert.deepEqual(eaten[0].rules,['v1']);
assert.deepEqual(eaten[0].definitions,['to eat',{type:'text',text:'to consume food'}], 'rich definitions remain structured');
assert.deepEqual(index.resolveTags(eaten[0].rules).map(tag=>tag.notes), ['Ichidan verb']);

const exactSurface = index.lookupTerm('食べました', {lemma:'食べる'});
assert.equal(exactSurface[0].match,'surface', 'surface-form dictionary matches outrank lemma fallbacks even when less frequent');

const walked = index.lookupTerm('行く');
assert.equal(walked[0].expression,'行く');
assert.deepEqual(index.resolveTags(walked[0].termTags).map(tag=>tag.category), ['popular']);
assert.equal(index.lookupTerm('かな')[0].normalizedReading,'かな', 'empty Yomitan readings mean the expression itself');

const shoku = index.lookupKanji('食');
assert.deepEqual(shoku.onyomi,['ショク']);
assert.deepEqual(shoku.kunyomi,['た.べる']);
assert.deepEqual(shoku.meanings,['eat','food']);
assert.equal(index.lookupKanji('水'),null);

assert.throws(() => Dictionary.createIndex({termBanks:[[['壊れた']]]}), /exactly 8 fields/);
assert.throws(() => Dictionary.createIndex({kanjiBanks:[[['二文字','ニ','ふた','',[],{}]]]}), /exactly one character/);
assert.throws(() => Dictionary.createIndex({tagBanks:[[['v1','partOfSpeech',1,'notes']]]}), /exactly 5 fields/);
assert.throws(() => Dictionary.createIndex({termBanks:[{}]}), /must be an array/);

console.log('ok - Yomitan v3 term, kanji, tag and metadata records are indexed without flattening senses');
