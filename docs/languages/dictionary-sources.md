# Dictionary sources

Download URLs and reviewed SHA-256 pins are recorded in `dictionary.properties`. The build verifies the exact source bytes before packaging and fails if a network source is unpinned or has changed. The CC-CEDICT and Jieba inputs use versioned or immutable source references. Local files can replace downloads through the `-Pnocturne*File` Gradle properties; local overrides participate in Gradle's file inputs but intentionally skip upstream pin checks.

Before publishing stable binaries, review these pins whenever a dataset is deliberately updated. A pin change is a data update and must be accompanied by a reviewed source, attribution/licence check, and a successful clean build.

### CC-CEDICT: Chinese–English words

- Original project and attribution: [MDBG CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict).
- Build input: the dated, unmodified CC-CEDICT gzip snapshot `1.0+20261007032622` from [oxalis-ink/cc-cedict Releases](https://github.com/oxalis-ink/cc-cedict/releases/tag/1.0%2B20261007032622). The mirror states that its release assets are unmodified MDBG exports and labels the release by the export timestamp.
- Exact asset URL and SHA-256 are pinned in `dictionary.properties`. The current asset SHA-256 is `00e6c188df0056c42c0448386d0b4f532aa805d9fdd87aef139f72b421ace2f4`.
- The mirror is a distribution mirror, not the original dictionary maintainer. Attribution remains with MDBG, the CC-CEDICT editors/contributors, and the CEDICT project begun by Paul Andrew Denisowski.
- License: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/.
- Provides simplified and traditional headwords, numeric-tone pinyin, and slash-separated English senses.
- The build requires at least 100,000 valid entries and records the actual count and source header in the generated manifest.

**Why the URL changed:** CI run #29 received different bytes from the mutable MDBG export URL than the SHA-256 previously recorded in `dictionary.properties`. The build correctly rejected the mismatch. Run #28 had succeeded on the same source commit, demonstrating that the build result depended on which bytes the upstream endpoint returned. The dated snapshot makes the input reproducible; SHA-256 validation and the minimum-entry check remain mandatory. Do not solve upstream drift by disabling pin verification or silently accepting a new digest.

### Unicode Unihan: character readings and definitions

- Source: https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip (Unicode 17.0.0). Its expected SHA-256 is configured in `dictionary.properties`.
- Uses only two fields: `kMandarin` (from `Unihan_Readings.txt`) and `kDefinition` (from `Unihan_DictionaryLikeData.txt`). All other properties are ignored.
- Terms: https://www.unicode.org/license.html
- This is character-level data. A character's reading inside a compound can differ, so the app looks up whole words in CC-CEDICT first.

### Jieba: segmentation frequencies

- Source: https://raw.githubusercontent.com/fxsjy/jieba/67fa2e36e72f69d9134b8a1037b83fbb070b9775/extra_dict/dict.txt.big (immutable source revision recorded in `dictionary.properties`).
- Keeps Han-only terms of 1 to 12 code points with a positive frequency.
- Frequencies set word boundaries only. They are not English definitions and not a contextual model.
- License: MIT. The full upstream notice is included in the generated `dictionary/NOTICE.txt`. Source license: https://github.com/fxsjy/jieba/blob/master/LICENSE

### Character pinyin fallback (41,000+ characters)

- Stored in `app/src/reader/01-chinese-character-pinyin-data.js` and included in the generated reader bundle. Derived from the xpinyin database, which states that it was generated from Unihan `kMandarin`.
- Source project: https://github.com/lxneng/xpinyin
- License stated by the source file: LPPL 1.3c or later, https://www.latex-project.org/lppl/lppl-1-3c.txt
- Gives one common reading per character. It cannot resolve context-dependent pronunciation.

### What the dictionaries do not cover

- Regional expressions, neologisms, names, and specialist vocabulary can be missing.
- Character definitions are not compound definitions.
- Word boundaries are conventional and can differ from other tools.
- Glosses can be ambiguous without context. There is no full-sentence translation.

---
