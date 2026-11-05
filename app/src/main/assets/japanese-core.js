(function attachJapaneseCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NocturneJapaneseCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createJapaneseCore() {
  'use strict';

  const KANA_RE = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
  const HAN_RE = /\p{Script=Han}/u;
  let segmenter;

  function countScripts(input) {
    const text = String(input || '');
    let kana = 0, han = 0, latin = 0, other = 0;
    for (const ch of text) {
      if (KANA_RE.test(ch)) kana++;
      else if (HAN_RE.test(ch)) han++;
      else if (/\p{Script=Latin}/u.test(ch)) latin++;
      else if (!/\s/u.test(ch)) other++;
    }
    return { kana, han, latin, other };
  }

  function detectLanguage(input) {
    const counts = countScripts(input);
    if (counts.kana > 0) {
      return { language: 'ja', confidence: Math.min(0.99, 0.82 + counts.kana / Math.max(1, counts.kana + counts.han) * 0.17), reason: 'kana-present', counts };
    }
    if (counts.han > 0) {
      return { language: 'ambiguous', confidence: 0.45, reason: 'han-without-kana', counts };
    }
    return { language: 'und', confidence: 0.2, reason: 'no-cjk-script', counts };
  }

  function resolveLanguage(input, requested) {
    if (requested === 'ja' || requested === 'zh') return requested;
    if (requested !== 'auto') throw new TypeError('Language must be "zh", "ja", or "auto".');
    const detected = detectLanguage(input);
    return detected.language === 'ja' ? 'ja' : detected.language === 'ambiguous' ? 'zh' : 'und';
  }

  function getSegmenter() {
    if (segmenter !== undefined) return segmenter;
    segmenter = null;
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      try { segmenter = new Intl.Segmenter('ja', { granularity: 'word' }); } catch { segmenter = null; }
    }
    return segmenter;
  }

  function segmentJapanese(input) {
    const text = String(input || '');
    if (!text) return [];
    const engine = getSegmenter();
    if (!engine) {
      return [{ text, start: 0, end: text.length, word: false, analyzer: 'unavailable', quality: 'display-only' }];
    }
    const result = [];
    for (const item of engine.segment(text)) {
      const value = String(item.segment);
      const start = Number(item.index);
      const end = start + value.length;
      result.push({
        text: value,
        start,
        end,
        word: item.isWordLike === true,
        analyzer: 'intl-segmenter',
        quality: 'platform-segmentation'
      });
    }
    // Assert the segmentation is a lossless partition of the original cue.
    if (result.map(token => token.text).join('') !== text) {
      throw new Error('Japanese segmenter returned non-contiguous text; refusing to render unsafe offsets.');
    }
    return result;
  }

  function utf8ByteOffsetToUtf16(text, byteOffset) {
    if (!Number.isInteger(byteOffset) || byteOffset < 0) throw new RangeError('UTF-8 byte offset must be a non-negative integer.');
    let bytes = 0, utf16 = 0;
    if (byteOffset === 0) return 0;
    for (const codePoint of String(text)) {
      const point = codePoint.codePointAt(0);
      const byteLength = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
      const nextBytes = bytes + byteLength;
      if (byteOffset === bytes) return utf16;
      if (byteOffset > bytes && byteOffset < nextBytes) {
        throw new RangeError('UTF-8 byte offset falls inside a multibyte character.');
      }
      bytes = nextBytes;
      utf16 += codePoint.length;
      if (byteOffset === bytes) return utf16;
    }
    if (byteOffset === bytes) return utf16;
    throw new RangeError('UTF-8 byte offset exceeds the source text.');
  }

  function katakanaToHiragana(input) {
    return Array.from(String(input || ''), character => {
      const point = character.codePointAt(0);
      return point >= 0x30a1 && point <= 0x30f6 ? String.fromCodePoint(point - 0x60) : character;
    }).join('');
  }
  function usableMorphologyField(value, fallback = '') {
    const text = String(value ?? '').trim();
    return !text || text === '*' ? fallback : text;
  }

  function readLinderaToken(token, sourceText, cursor) {
    const details = Array.isArray(token.details) ? token.details : [];
    const surface = String(token.text ?? token.surface ?? token.token ?? '');
    let start, end;
    const byteStart = token.byte_start ?? token.byteStart;
    const byteEnd = token.byte_end ?? token.byteEnd;
    if (Number.isInteger(byteStart) && Number.isInteger(byteEnd)) {
      start = utf8ByteOffsetToUtf16(sourceText, byteStart);
      end = utf8ByteOffsetToUtf16(sourceText, byteEnd);
    } else {
      start = sourceText.indexOf(surface, cursor);
      if (start < 0) throw new Error('Lindera token cannot be aligned to the original subtitle text.');
      end = start + surface.length;
    }
    if (!surface || start < cursor || end <= start || sourceText.slice(start, end) !== surface) {
      throw new Error('Lindera token offsets do not match the original subtitle text.');
    }
    return {
      text: surface,
      start,
      end,
      word: !String(details[0] || '').includes('記号') && !/^\s+$/u.test(surface),
      lemma: usableMorphologyField(token.lemma ?? token.base_form ?? details[6], surface),
      reading: katakanaToHiragana(usableMorphologyField(token.reading ?? details[7])),
      pronunciation: usableMorphologyField(token.pronunciation ?? details[8]),
      partOfSpeech: details.slice(0, 4).filter(value => value && value !== '*').join(','),
      analyzer: 'lindera',
      quality: 'morphological'
    };
  }

  function createLinderaAdapter(tokenizer) {
    if (!tokenizer || typeof tokenizer.tokenize !== 'function') throw new TypeError('A Lindera tokenizer with tokenize(text) is required.');
    return {
      tokenize(text) {
        const source = String(text || '');
        const raw = tokenizer.tokenize(source);
        if (!Array.isArray(raw)) throw new TypeError('Lindera returned an unexpected token result.');
        let cursor = 0;
        const tokens = raw.map(token => {
          const normalized = readLinderaToken(token, source, cursor);
          cursor = normalized.end;
          return normalized;
        });
        if (tokens.map(token => token.text).join('') !== source) {
          throw new Error('Lindera tokens do not reconstruct the original subtitle text.');
        }
        return tokens;
      }
    };
  }

  return Object.freeze({
    version: '0.1.0',
    countScripts,
    katakanaToHiragana,
    detectLanguage,
    resolveLanguage,
    segmentJapanese,
    utf8ByteOffsetToUtf16,
    createLinderaAdapter
  });
});
