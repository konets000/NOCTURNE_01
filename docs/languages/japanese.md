# Japanese implementation status

## Current branch scope

This branch introduces the first Japanese reader foundation. It is intentionally not presented as a complete Japanese dictionary release.

Implemented:

- Explicit Chinese / Japanese / Auto import-language selection.
- Japanese kana-aware language detection. Han-only text remains ambiguous; Auto defaults it to Chinese to avoid misclassifying Chinese.
- Auto-detected text without Han or kana remains unclassified (`und`), uses generic platform word boundaries, and does not invoke Chinese dictionary lookup or Mandarin system speech.
- A Japanese subtitle import path that preserves mixed scripts and does not apply the Chinese-only Latin-stripping filter.
- Per-session language persistence, including neutral/unclassified Auto-mode text.
- Offline Japanese word-boundary segmentation through the browser's ICU-backed `Intl.Segmenter`.
- A strict lossless token partition check so offsets cannot silently detach from original subtitle text.
- A Lindera adapter contract, including UTF-8 byte-offset to UTF-16 index conversion, source alignment validation, punctuation classification, and katakana-to-hiragana reading normalization.
- A Yomitan v3 bank adapter that validates term, kanji and tag records; indexes written forms and readings; preserves multiple senses and structured definitions; and retains unclassified term metadata without guessing its schema.
- Lookup ranking that prefers exact surface-form matches before lemma and reading fallbacks.
- Android asset-loader and Windows portable packaging for both Japanese core modules.
- Regression tests for Japanese import preservation, ruby readings, language resolution, segmentation, offset conversion, Lindera normalization and Yomitan bank indexing.

## Explicit non-goals of this first pass

The browser segmenter is a practical offline fallback, not the final Japanese morphological engine. It does not supply a verified dictionary lemma, conjugation, contextual reading, part of speech, or dictionary definition.

This branch does not yet bundle:

- Lindera WASM runtime or a Japanese morphology dictionary.
- Jitendex/JMdict term banks.
- Kanji dictionary banks.
- JMnedict names.
- Furigana alignment data.
- Sentence examples, native audio, or pitch-accent data.

The UI explicitly says that Japanese dictionary data is not installed. It must not fabricate readings or definitions.

## Dictionary ingestion contract

Jitendex distributes a Yomitan archive. The archive should be treated as a source format, not as NOCTURNE's runtime database.

The official Yomitan dictionary schema defines:

- `index.json`: title, revision, format, attribution, language and dictionary metadata.
- `term_bank_N.json`: expression, reading, definition tags, deinflection rules, popularity score, definitions, sequence and term tags.
- `kanji_bank_N.json`: character, onyomi, kunyomi, tags, meanings and statistics.
- `tag_bank_N.json`: tag names and display metadata.
- `term_meta_bank_N.json`: term frequency and pronunciation metadata.

The build/runtime integration must preserve structured definitions and deinflection metadata. It must not reduce a multi-sense dictionary entry to one flattened string.

Reference: https://github.com/yomidevs/yomitan/blob/master/docs/making-yomitan-dictionaries.md

## Required next modules

1. **Japanese morphology engine**
   - Pin a specific Lindera WASM package version and checksum.
   - Pin an IPADIC or UniDic dictionary profile and verify its redistribution licence.
   - Initialize once in a Web Worker.
   - Normalize its tokens into NOCTURNE token records.
   - Keep the ICU segmenter as a safe fallback.

2. **Japanese dictionary packager**
   - Accept a versioned Jitendex Yomitan archive or reviewed local override.
   - Verify source checksum, archive bounds, required files and schema shape.
   - Extract term, kanji, tag and metadata banks.
   - Convert them to a versioned NOCTURNE representation.
   - Preserve source revision, attribution, licence, and per-source checksums.
   - Fail closed on malformed, unpinned or unexpectedly changed input.

3. **Local lookup database**
   - Store term entries, kanji records, tags and metadata separately.
   - Index both written form and reading.
   - Support multiple entries and senses for the same spelling.
   - Preserve deinflection candidates and rule tags.
   - Install atomically; keep the previous working pack if a new import fails.

4. **Dictionary user interface**
   - Show lemma, reading, part of speech, conjugation, all relevant senses, tags, examples and source attribution.
   - Open kanji reference independently from whole-word lookup.
   - Show furigana only when the alignment is available and validated.
   - Keep unknown-word fallbacks explicitly labelled as clues, not definitions.

5. **Evaluation**
   - Test Japanese word-boundary F1 separately from lemma, reading, POS, conjugation, dictionary coverage and contextual sense accuracy.
   - Use a held-out native-reviewed subtitle set that includes colloquial dialogue, names, slang, mixed scripts and domain variation.
   - Do not claim universal 99% Japanese accuracy from a segmentation-only score.

## Licensing

Jitendex's downloadable data and its underlying sources have their own attribution and share-alike conditions. Code licences and data licences must be tracked separately. Before including a source in an APK or Windows bundle, record its exact licence, required notice, attribution, version, source URL and whether any derivative data must remain under the same terms.

Jitendex downloads: https://jitendex.org/pages/downloads.html
Jitendex legal information: https://jitendex.org/pages/legal.html
Yomitan dictionary schema: https://github.com/yomidevs/yomitan/tree/master/ext/data/schemas

## Acceptance conditions for calling Japanese support complete

Japanese support is not complete until all of the following are true:

- A fresh offline install can import and analyze Japanese subtitles.
- Common inflected forms resolve to their correct dictionary lemmas.
- Word readings are sourced from verified lexical/morphological records, not character guessing.
- Kanji and word lookups expose multiple senses and relevant usage tags.
- Android and Windows use identical engine and dictionary versions.
- No network access is needed at runtime.
- All data licences and notices ship with the relevant assets.
- Automated tests and native-speaker-reviewed evaluation pass.
