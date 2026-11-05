# NOCTURNE — product and technical overview

**A local-first reading and listening tool built around real subtitle material.**

This document describes what NOCTURNE is, what the current code actually implements, how its platforms fit together, and which improvements remain future work. It deliberately separates shipped behavior from proposals.

## 1. Product definition

NOCTURNE is a subtitle-centered language-study reader. The current workflow is:

1. Import a subtitle file in SRT format.
2. Select the matching audio file stored on the same device.
3. Read along with the active subtitle cue synchronized to playback.
4. Replay, seek, loop a sentence or change playback speed.
5. Inspect supported language data and save useful vocabulary or sessions locally.

The product is not currently a full language course, translation service, general web browser, AI tutor or media-streaming platform. Its core value is a focused reading/listening loop with local materials.

## 2. Implementation status

| Capability | Status | What that means |
|---|---|---|
| SRT reader | Implemented | Parses timestamped cues and preserves cue timing |
| Audio synchronization | Implemented in shared reader | Local audio playback drives active-cue highlighting |
| Playback controls | Implemented | Seeking, sentence looping and speed adjustment |
| Pitch-preserving speed engine | Integrated; device validation pending | SoundTouchJS AudioWorklet is bundled; browser fallback remains available |
| Chinese dictionary | Implemented | Offline CC-CEDICT entries with character-level Unihan information |
| Chinese segmentation | Implemented | Jieba frequency data helps choose word boundaries |
| Japanese import and segmentation | Foundation implemented | Mixed Japanese scripts are preserved; Intl.Segmenter provides platform word boundaries |
| Japanese dictionary and morphology | Not complete | No bundled Japanese dictionary banks or morphology runtime |
| Local sessions and vocabulary | Implemented | Data is kept in local application/browser storage |
| Offline neural TTS | Not implemented | The voice document is a requirements specification only |
| Speech from pasted URLs | Not implemented | There is no URL extraction, remote voice service or website-to-audio pipeline |
| Background playback | Not implemented | Playback pauses when the app leaves the foreground |

A visible module, adapter or design document must not be mistaken for a complete user-facing feature. In particular, the Japanese Yomitan adapter validates and indexes records but does not supply the missing dictionary data or morphology engine.

## 3. Platform architecture

Both editions use the same reader assets. The platform-specific layer is kept relatively small.

~~~text
                         Shared reader
             HTML + JavaScript + local browser storage
                              |
                 ---------------------------
                 |                         |
          Android application        Windows portable app
          Java + WebView             PowerShell + Edge
                 |                         |
          Android file picker        127.0.0.1:18473
          asset allowlist            explicit static routes
                 |                         |
                 -------- local files -----

        Build-time data pipeline (Gradle + Java in buildSrc)
                 |                         |
           pinned source data       verified processor asset
                 |                         |
        generated dictionary assets / app packages
~~~

### Android shell

The Android app is a Java host around a WebView. The manifest targets Android API 35 and sets a minimum supported API of 24. App assets are loaded from the packaged application, and files are selected through the Android document picker. The manifest intentionally does not request general internet access.

### Windows shell

The portable edition uses a PowerShell launcher and a dedicated Microsoft Edge window. A local server binds to 127.0.0.1:18473 and serves an explicit allowlist of application files. The Edge profile is stored under %LOCALAPPDATA%\NOCTURNE\BrowserProfile so browser-local data can persist between launches.

### Shared reader

The shared reader is maintained as seven ordered, responsibility-based source fragments in `app/src/reader/`. `tools/build-reader.js` assembles them into one `app.js` runtime bundle at `build/reader/app.js`. The Android Gradle build includes that generated bundle as an app asset, and the Windows packager places the same bundle in its portable ZIP. The fragments intentionally share one private runtime closure: this is build-time source organization, not a set of independently loadable ES modules. That preserves the existing runtime contract while making the source easier to navigate and test.

### Build and data preparation

Gradle tasks in the Android build and buildSrc/ prepare the offline dictionary data and the SoundTouch processor. Inputs are pinned and validated before being included in the app. Generated assets belong under build output directories; they should not be copied back into source control as if they were hand-maintained source files.

## 4. Language data

### Chinese

The current Chinese path uses separate sources for separate jobs:

- **CC-CEDICT:** word-level headwords and English glosses.
- **Unicode Unihan:** character properties, including Mandarin reading and character definitions.
- **Jieba frequency data:** segmentation hints used to select likely word boundaries.
- **Character pinyin fallback:** a broad character-level fallback, not a contextual pronunciation engine.

These layers are not interchangeable. A segmentation boundary is not a definition. A character's common reading is not guaranteed to be the reading of that character in a particular compound. Whole-word dictionary lookup is preferred when a matching entry exists.

### Japanese

The current foundation supports explicit Chinese/Japanese/Auto language selection, Japanese-aware detection, mixed-script preservation and browser-based word-boundary segmentation.

The Yomitan v3 adapter establishes a path for structured term, kanji and tag banks. The actual dictionary and morphology layer still needs to be integrated. A complete implementation will need a pinned morphological runtime and dictionary, licensed term/kanji data, structured multi-sense lookup, verified readings, and native-speaker-reviewed evaluation. See [the Japanese implementation notes](../languages/japanese.md).

Do not market the present Japanese implementation as equivalent to a mature dictionary such as a dedicated Japanese dictionary app. It is not there yet.

## 5. Audio behavior

The player offers speed adjustment from 0.65× to 1.50× in 0.05× increments, including a 0.80× preset. The SoundTouchJS AudioWorklet 2.1.1 processor is downloaded and hash-verified during build, then included as an app asset. A browser-native pitch-preserving fallback is available if the worklet cannot run.

The integration is present in source and CI packaging. That does not prove perceptual quality on target hardware. Acoustic artifacts, long playback sessions, cue synchronization and loop boundaries still need manual Android and Windows testing. See [the playback speed-control notes](speed-control.md).

## 6. Privacy model and its limits

The intended runtime model is local:

- No NOCTURNE account, cloud sync service or upload endpoint exists.
- The Android manifest has no INTERNET permission.
- Windows exposes the app through a loopback-only local server.
- Imported study materials and local session data are not intentionally transmitted to NOCTURNE servers.

There is a separate build-time network requirement. A clean build may need to download Gradle/Android dependencies, pinned dictionary inputs and the pinned audio processor. “Offline-first app” does not mean “first source build requires no network.”

These claims describe the code and packaging configuration. They are not a formal security audit. The Android file-picker flow, WebView behavior and Windows process lifecycle should be checked on real devices.

## 7. Planned work — not current functionality

### Japanese dictionary completion

The missing pieces are a pinned Lindera-compatible morphology runtime and dictionary, a reviewed Jitendex/Yomitan data-packaging path, a local structured lookup index, kanji lookup, readings and examples, plus a native-speaker-reviewed test set. The browser segmenter should remain as a safe fallback.

### Offline speech generation

[The offline voice-system specification](voice-system.md) captures proposed requirements for local neural text-to-speech in Mandarin, English and Mexican Spanish, with optional verified higher-quality model packs. This work is not implemented. A suitable Mandarin model, redistribution rights, runtime compatibility, device performance and quality thresholds must be validated before this can become a feature.

The separate idea of pasting a URL and automatically extracting its text is also not implemented. URL ingestion, text extraction and synthesis are distinct engineering tasks; one must not be silently presented as the other.

### Reader module boundaries

The first organization pass separates dictionary data, persistence and dictionary management, subtitle parsing and segmentation, reader/audio/session behavior, and lookup/library UI into five source fragments. They are concatenated into the existing single-file runtime bundle. Future refactoring should move independently testable behavior behind explicit interfaces, one responsibility at a time. Do not turn the fragments into a web of shared globals or rewrite the working reader wholesale just to change frameworks.

### Data durability

Saved sessions and vocabulary are user data. A future storage change should first define schema versions, validation, migrations, export and recovery behavior. Data migration should be tested before more learning-history features are added.

## 8. Engineering principles

1. **Local by default.** Study materials should remain on the device. Optional downloads must be explicit, integrity-checked and limited to reviewed sources.
2. **No invented certainty.** Missing words, readings and definitions should be shown as missing or uncertain, not fabricated.
3. **Separate data roles.** Dictionary definitions, character information, segmentation frequencies, pronunciation and speech synthesis are different systems.
4. **Test core logic without a device.** Parsing, normalization, segmentation contracts, lookup ranking and storage validation should be covered by deterministic regression tests.
5. **Validate platform behavior on hardware.** WebView compilation, mocked activity signatures and ZIP inspection do not certify Android or Windows runtime behavior.
6. **Make claims track implementation.** A roadmap item or adapter is not a shipped capability.

## 9. Repository map

- app/src/main/assets/ — HTML entry point and language-specific runtime modules.
- app/src/reader/ — ordered source fragments for the shared application reader.
- build/reader/app.js — generated single-file runtime bundle; do not commit this build output.
- app/src/main/java/ — Android host and native integration.
- app/src/main/AndroidManifest.xml — Android permissions, components and platform declaration.
- buildSrc/ — dictionary packaging and validation tasks.
- desktop/ — Windows launcher and platform documentation.
- tests/ — regression tests and synthetic inputs.
- tools/ — deterministic reader bundling and platform packaging scripts.
- dictionary.properties — pinned dictionary source configuration.
- [Offline voice-system specification](voice-system.md) — proposed TTS requirements.
- [Japanese implementation](../languages/japanese.md) — current support status and completion gates.
- [QA report](../testing/qa-report.md) and [device validation checklist](../testing/device-validation.md) — verification evidence and manual test requirements.

## 10. Definition of a dependable release

Before calling a version stable:

- Run the full regression suite from a clean source snapshot.
- Build the Android APK and Windows portable ZIP from the same commit.
- Install and exercise the APK on a physical Android device.
- Run the Windows package on a real Windows PC.
- Verify file import, playback, synchronization, dictionary behavior, persistence and shutdown.
- Check generated artifacts, dictionary hashes, third-party notices and project licensing.
- Use a separate, controlled release-signing process; never commit or upload signing keys as ordinary CI artifacts.

For the current check results, see [the QA report](../testing/qa-report.md). For manual tests, see [the device validation checklist](../testing/device-validation.md).
