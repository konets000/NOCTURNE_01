'use strict';
const assert = require('node:assert/strict');
const Core = require('../app/src/main/assets/japanese-core.js');

const sample = '昨日は学校に行きました。';
const tokens = Core.segmentJapanese(sample);
assert.equal(tokens.map(token => token.text).join(''), sample, 'Japanese segmentation preserves every source character');
assert.ok(tokens.some(token => token.text === '昨日'), 'ICU identifies common Japanese lexical units');
assert.ok(tokens.some(token => token.text === '学校'), 'ICU identifies kanji compounds');
assert.ok(tokens.some(token => token.text === '。' && !token.word), 'punctuation is not exposed as a dictionary word');
assert.ok(tokens.filter(token => token.word).length >= 3, 'Japanese words are clickable when Intl.Segmenter is available');

assert.equal(Core.detectLanguage('おはようございます').language, 'ja');
assert.equal(Core.katakanaToHiragana('タベマシタ'), 'たべました');
assert.equal(Core.detectLanguage('你好世界').language, 'ambiguous', 'Han-only text is not silently classified as Japanese');
assert.equal(Core.resolveLanguage('これは日本語です', 'auto'), 'ja');
assert.equal(Core.resolveLanguage('你好世界', 'auto'), 'zh');
assert.equal(Core.resolveLanguage('hello world', 'auto'), 'und');
assert.throws(() => Core.resolveLanguage('日本語', 'unknown'), /Language must/);

const offsetText = 'A😀日本語';
assert.equal(Core.utf8ByteOffsetToUtf16(offsetText, 1), 1);
assert.equal(Core.utf8ByteOffsetToUtf16(offsetText, 5), 3, 'UTF-8 byte offsets after astral code points map to UTF-16 code units');
assert.equal(Core.utf8ByteOffsetToUtf16(offsetText, 8), 4);
assert.throws(() => Core.utf8ByteOffsetToUtf16(offsetText, 2), /inside a multibyte/);
assert.throws(() => Core.utf8ByteOffsetToUtf16(offsetText, 999), /exceeds/);

const linderaSource = '食べました。';
const linderaMock = {
  tokenize() {
    return [
      { text: '食べ', byte_start: 0, byte_end: 6, details: ['動詞', '自立', '*', '*', '一段', '連用形', '食べる', 'タベ', 'タベ'] },
      { text: 'まし', byte_start: 6, byte_end: 12, details: ['助動詞', '*', '*', '*', '特殊・マス', '連用形', 'ます', 'マシ', 'マシ'] },
      { text: 'た', byte_start: 12, byte_end: 15, details: ['助動詞', '*', '*', '*', '特殊・タ', '基本形', 'た', 'タ', 'タ'] },
      { text: '。', byte_start: 15, byte_end: 18, details: ['記号', '句点', '*', '*', '*', '*', '。', '。', '。'] }
    ];
  }
};
const adapter = Core.createLinderaAdapter(linderaMock);
const mapped = adapter.tokenize(linderaSource);
assert.equal(mapped.map(token => token.text).join(''), linderaSource);
assert.equal(mapped[0].lemma, '食べる');
assert.equal(mapped[0].reading, 'たべ', 'katakana morphology readings are normalized to dictionary hiragana');
assert.equal(mapped[0].pronunciation, 'タベ', 'original katakana pronunciation is retained');
assert.equal(mapped[0].partOfSpeech, '動詞,自立');
assert.equal(mapped[3].start, 5, 'UTF-16 offsets remain correct after Japanese multibyte characters');
assert.equal(mapped[3].word, false, 'Lindera punctuation is not exposed as a clickable dictionary word');
assert.throws(() => Core.createLinderaAdapter({}), /tokenize/);

console.log('ok - Japanese core detection, lossless segmentation, Lindera offset adapter and safety checks');
