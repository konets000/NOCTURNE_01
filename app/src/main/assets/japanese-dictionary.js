(function attachJapaneseDictionary(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NocturneJapaneseDictionary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createJapaneseDictionary() {
  'use strict';

  const FORMAT = 3;

  function requireArray(value, name) {
    if (!Array.isArray(value)) throw new TypeError(name + ' must be an array.');
    return value;
  }
  function splitTags(value) {
    return String(value || '').trim().split(/\s+/u).filter(Boolean);
  }
  function requireString(value, name) {
    if (typeof value !== 'string') throw new TypeError(name + ' must be a string.');
    return value;
  }
  function validateTermRow(row, bankName, index) {
    requireArray(row, bankName + '[' + index + ']');
    if (row.length !== 8) throw new TypeError(bankName + '[' + index + '] must contain exactly 8 fields.');
    const [expression, reading, definitionTags, rules, score, definitions, sequence, termTags] = row;
    requireString(expression, bankName + '[' + index + '].expression');
    requireString(reading, bankName + '[' + index + '].reading');
    if (!expression) throw new TypeError(bankName + '[' + index + '] has an empty expression.');
    if (definitionTags !== null && typeof definitionTags !== 'string') throw new TypeError(bankName + '[' + index + '].definitionTags must be a string or null.');
    requireString(rules, bankName + '[' + index + '].rules');
    if (typeof score !== 'number' || !Number.isFinite(score)) throw new TypeError(bankName + '[' + index + '].score must be finite.');
    requireArray(definitions, bankName + '[' + index + '].definitions');
    if (!Number.isSafeInteger(sequence)) throw new TypeError(bankName + '[' + index + '].sequence must be an integer.');
    requireString(termTags, bankName + '[' + index + '].termTags');
    return {
      expression,
      reading,
      normalizedReading: reading || expression,
      definitionTags: splitTags(definitionTags),
      rules: splitTags(rules),
      score,
      definitions,
      sequence,
      termTags: splitTags(termTags),
      sourceFormat: 'yomitan-term-bank-v3'
    };
  }

  function validateKanjiRow(row, bankName, index) {
    requireArray(row, bankName + '[' + index + ']');
    if (row.length !== 6) throw new TypeError(bankName + '[' + index + '] must contain exactly 6 fields.');
    const [character, onyomi, kunyomi, tags, meanings, stats] = row;
    requireString(character, bankName + '[' + index + '].character');
    if (Array.from(character).length !== 1) throw new TypeError(bankName + '[' + index + '] must describe exactly one character.');
    requireString(onyomi, bankName + '[' + index + '].onyomi');
    requireString(kunyomi, bankName + '[' + index + '].kunyomi');
    requireString(tags, bankName + '[' + index + '].tags');
    requireArray(meanings, bankName + '[' + index + '].meanings');
    if (!meanings.every(value => typeof value === 'string')) throw new TypeError(bankName + '[' + index + '].meanings must contain strings.');
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) throw new TypeError(bankName + '[' + index + '].stats must be an object.');
    return {
      character,
      onyomi: splitTags(onyomi),
      kunyomi: splitTags(kunyomi),
      tags: splitTags(tags),
      meanings: meanings.slice(),
      stats: { ...stats },
      sourceFormat: 'yomitan-kanji-bank-v3'
    };
  }

  function validateTagRow(row, bankName, index) {
    requireArray(row, bankName + '[' + index + ']');
    if (row.length !== 5) throw new TypeError(bankName + '[' + index + '] must contain exactly 5 fields.');
    const [name, category, order, notes, score] = row;
    requireString(name, bankName + '[' + index + '].name');
    requireString(category, bankName + '[' + index + '].category');
    if (typeof order !== 'number' || !Number.isFinite(order)) throw new TypeError(bankName + '[' + index + '].order must be finite.');
    requireString(notes, bankName + '[' + index + '].notes');
    if (typeof score !== 'number' || !Number.isFinite(score)) throw new TypeError(bankName + '[' + index + '].score must be finite.');
    return { name, category, order, notes, score };
  }

  function addToIndex(index, key, value) {
    if (!key) return;
    const bucket = index.get(key);
    if (bucket) bucket.push(value);
    else index.set(key, [value]);
  }

  function createIndex(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Japanese dictionary input must be an object.');
    const termBanks = input.termBanks || [];
    const kanjiBanks = input.kanjiBanks || [];
    const tagBanks = input.tagBanks || [];
    const termMetaBanks = input.termMetaBanks || [];
    requireArray(termBanks, 'termBanks');
    requireArray(kanjiBanks, 'kanjiBanks');
    requireArray(tagBanks, 'tagBanks');
    requireArray(termMetaBanks, 'termMetaBanks');

    const termsByExpression = new Map();
    const termsByReading = new Map();
    const kanjiByCharacter = new Map();
    const tagsByName = new Map();
    const termMetadata = [];
    let termCount = 0, kanjiCount = 0, tagCount = 0;

    termBanks.forEach((bank, bankIndex) => {
      requireArray(bank, 'termBanks[' + bankIndex + ']');
      bank.forEach((row, rowIndex) => {
        const entry = validateTermRow(row, 'term_bank_' + (bankIndex + 1), rowIndex);
        addToIndex(termsByExpression, entry.expression, entry);
        addToIndex(termsByReading, entry.normalizedReading, entry);
        termCount++;
      });
    });

    kanjiBanks.forEach((bank, bankIndex) => {
      requireArray(bank, 'kanjiBanks[' + bankIndex + ']');
      bank.forEach((row, rowIndex) => {
        const entry = validateKanjiRow(row, 'kanji_bank_' + (bankIndex + 1), rowIndex);
        kanjiByCharacter.set(entry.character, entry);
        kanjiCount++;
      });
    });

    tagBanks.forEach((bank, bankIndex) => {
      requireArray(bank, 'tagBanks[' + bankIndex + ']');
      bank.forEach((row, rowIndex) => {
        const tag = validateTagRow(row, 'tag_bank_' + (bankIndex + 1), rowIndex);
        tagsByName.set(tag.name, tag);
        tagCount++;
      });
    });

    termMetaBanks.forEach((bank, bankIndex) => {
      requireArray(bank, 'termMetaBanks[' + bankIndex + ']');
      // Meta-bank schemas vary by metadata mode. Preserve their raw records until
      // a specific metadata type is supported and validated; never guess the tuple.
      for (const row of bank) termMetadata.push({ bank: bankIndex + 1, record: row });
    });

    function lookupTerm(query, options = {}) {
      const surface = String(query || '');
      if (!surface) return [];
      const lemma = String(options.lemma || '');
      const reading = String(options.reading || '');
      const candidates = [];
      const seen = new Set();
      const add = (entries, match, constrainReading = false) => {
        for (const entry of entries || []) {
          if (constrainReading && reading && entry.normalizedReading !== reading && entry.reading !== reading) continue;
          if (seen.has(entry)) continue;
          seen.add(entry);
          candidates.push({ ...entry, match });
        }
      };
      add(termsByExpression.get(surface), 'surface', true);
      if (lemma && lemma !== surface) add(termsByExpression.get(lemma), 'lemma');
      if (!candidates.length && reading) add(termsByReading.get(reading), 'reading', true);
      const priority = { surface: 0, lemma: 1, reading: 2 };
      return candidates.sort((a, b) => priority[a.match] - priority[b.match] || b.score - a.score || a.sequence - b.sequence);
    }

    function lookupKanji(character) {
      return kanjiByCharacter.get(String(character || '')) || null;
    }

    function resolveTags(names) {
      return splitTags(Array.isArray(names) ? names.join(' ') : names).map(name => tagsByName.get(name) || { name, category: 'unknown', order: 0, notes: '', score: 0, missing: true });
    }

    return Object.freeze({
      format: FORMAT,
      counts: Object.freeze({ terms: termCount, kanji: kanjiCount, tags: tagCount, termMetadata: termMetadata.length }),
      lookupTerm,
      lookupKanji,
      resolveTags,
      hasTerm(expression) { return termsByExpression.has(String(expression || '')); },
      hasKanji(character) { return kanjiByCharacter.has(String(character || '')); },
      getTermMetadata() { return termMetadata.slice(); }
    });
  }

  return Object.freeze({ format: FORMAT, createIndex });
});
