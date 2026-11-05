# NOCTURNE

**An offline-first subtitle reader for language study on Android and Windows.**

NOCTURNE lets you study with the subtitles and audio you already have. Import an SRT file and its matching local audio, follow synchronized captions, replay a sentence, adjust playback speed, and look up Chinese words without sending your study material to a cloud service.

> **Status: development preview · version 0.8.1 (versionCode 13).**  
> Automated tests and CI packaging are in place. Physical-device Android and real Windows runtime validation are still outstanding. CI APKs are temporary debug builds, not stable releases.

## What works today

| Area | Current implementation |
|---|---|
| Shared reader | One HTML/JavaScript reader used by Android and Windows |
| Subtitle workflow | SRT import, timestamp-preserving cues, language-aware handling and synchronized highlighting |
| Audio | Local audio import, playback, seeking, sentence looping and speed control |
| Chinese | Offline word segmentation and dictionary lookup using CC-CEDICT, Unicode Unihan and Jieba data |
| Japanese | Japanese subtitle preservation, language detection and browser word-boundary segmentation |
| Local library | Saved subtitle sessions and vocabulary |
| Android | Native Java shell around a WebView |
| Windows | Portable PowerShell launcher and dedicated Microsoft Edge window |

### Important language distinction

**Chinese is the established dictionary-backed implementation.** CC-CEDICT supplies word definitions, Unihan supplies character-level information, and Jieba frequencies help choose segmentation boundaries. The character-pinyin fallback is best-effort and can select the wrong reading in context.

**Japanese support is an initial foundation, not a complete dictionary.** Japanese text and mixed scripts are preserved, and the browser's Intl.Segmenter supplies word boundaries. A Yomitan v3 dictionary adapter exists, but Japanese dictionary data, a full morphological engine and verified readings are not bundled.

## What is not implemented

These are planned or documented requirements, not current features:

- Neural/AI text-to-speech or generated voices.
- Generating speech from a pasted website URL, extracting text from arbitrary websites, or turning a URL into audio.
- Bundled premium offline voices for Mandarin, English or Spanish.
- Full Japanese dictionary lookup, conjugation analysis, furigana and contextual readings.
- Full-sentence translation, an AI tutor or a spaced-repetition system.
- Background audio playback.

docs/architecture/voice-system.md describes a possible future local-voice system. It does not mean that a TTS engine, voice packs, downloader or voice library are already present.

## Privacy and network boundaries

NOCTURNE is designed to keep study activity on the device:

- The Android app does not request the Android INTERNET permission.
- The Windows launcher serves the app through 127.0.0.1:18473; it is not intended to expose a server to the local network.
- Subtitles, audio, saved sessions and lookups are not sent to a NOCTURNE cloud service. There is no account or sync backend.
- The Windows Edge profile is stored locally at %LOCALAPPDATA%\NOCTURNE\BrowserProfile.

**Runtime privacy is not the same as build-time offline operation.** A first build needs network access for Gradle/Android dependencies and pinned dictionary and audio-processor inputs unless those files are already cached or supplied locally. These are source-level design statements, not an independent security audit. See [SECURITY.md](SECURITY.md).

## Get a development build

1. Open the repository's **Actions** tab.
2. Open the latest successful **CI — test and build** run.
3. Download its NOCTURNE-CI-... artifact and extract the platform file you need.

The artifact contains a debug APK and a portable Windows ZIP. Workflow artifacts are retained for 14 days.

### Android

Install the NOCTURNE-Android-debug-0.8.1.apk file. Android may ask you to allow installation from the app used to open the download.

CI uses a temporary debug signing key. A later build may not install over an earlier CI build. If Android reports a signature conflict, uninstall the previous test build before installing the new one; uninstalling also removes that app's local data. Back up anything important first.

### Windows

Extract NOCTURNE-Windows-Portable-0.8.1.zip to a writable folder and run start-nocturne.bat. Keep the launcher console open while using NOCTURNE. Microsoft Edge is required. No Python, Node.js, Java or Android Studio is needed to run the packaged edition.

## Build from source

### Requirements

- JDK 17 or newer.
- Node.js 22 for the regression suite and shared-reader bundle generation (Android and Windows packaging).
- Gradle 8.9.
- For Android packaging: Android SDK platform 35 and build-tools 35.0.0.
- For the Windows ZIP packager on Linux: bash, zip and unzip.

This repository currently uses an installed Gradle command; it does not rely on a checked-in Gradle wrapper.

### Run the tests

~~~sh
sh tests/run-tests.sh
~~~

The suite uses synthetic fixtures and does not require an Android device. It covers dictionary packaging and SHA-256 pin enforcement, the Java/JavaScript dictionary contract, Chinese and Japanese logic, subtitle handling, application smoke tests, Android activity signatures against local stubs, and Windows archive packaging. Stub compilation and archive inspection do not replace running the app on actual devices.

On Windows, the native logic-test runner is:

~~~powershell
powershell -File tests/run-tests.ps1
~~~

The PowerShell runner does not perform the Linux runner's Windows-ZIP packaging smoke test.

### Build the Android debug APK

~~~sh
gradle --no-daemon :app:assembleDebug
~~~

Output: app/build/outputs/apk/debug/app-debug.apk

The build prepares the pinned dictionary assets and SoundTouch audio processor. First-time builds normally need network access. Dictionary URLs, revisions, hashes and attribution are recorded in dictionary.properties and docs/languages/dictionary-sources.md.

### Package the Windows edition

After the asset preparation/build step, run:

~~~sh
sh tools/package-windows-portable.sh \
  app/build/generated/nocturne/assets/dictionary \
  build/dist \
  app/build/generated/nocturne/audio-assets
~~~

The versioned ZIP is written to build/dist/. Do not commit generated assets, APKs, ZIPs or build directories.

## Repository guide

Long-form product, architecture, language-data, testing and maintainer documentation lives under [`docs/`](docs/README.md). The repository root is reserved for the main project entry points and build configuration.

| Path / document | Purpose |
|---|---|
| app/src/main/assets/ | HTML entry point and language-specific runtime modules |
| app/src/reader/ | Ordered source fragments for the shared reader bundle |
| build/reader/app.js | Generated single-file runtime bundle; not committed |
| app/src/main/java/ | Android WebView host and native integration |
| buildSrc/ | Dictionary acquisition, validation and packaging tasks |
| desktop/ | Windows launcher and local server |
| tests/ | Regression tests and synthetic fixtures |
| tools/ | Reader bundling, packaging and development utilities |
| [docs/architecture/overview.md](docs/architecture/overview.md) | Product scope, architecture and development roadmap |
| [docs/languages/japanese.md](docs/languages/japanese.md) | Japanese implementation status and completion requirements |
| [docs/architecture/voice-system.md](docs/architecture/voice-system.md) | Proposed offline speech system; not shipped |
| [docs/architecture/speed-control.md](docs/architecture/speed-control.md) | Playback-speed implementation and validation requirements |
| [docs/languages/dictionary-sources.md](docs/languages/dictionary-sources.md) | Data sources, licences, attribution and hashes |
| [docs/testing/qa-report.md](docs/testing/qa-report.md) | Automated verification and remaining gaps |
| [docs/testing/device-validation.md](docs/testing/device-validation.md) | Manual Android and Windows checks |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development and contribution workflow |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

## Release and license status

NOCTURNE is a development preview, not a stable release. Automated CI success does not establish that every feature works on every phone or Windows configuration. Complete the device validation checklist before relying on a release.

**The repository does not yet have a project-level license.** Public visibility does not grant permission to reuse or redistribute NOCTURNE's own code. Third-party code and data carry their own terms; see THIRD-PARTY-NOTICES.md and docs/languages/dictionary-sources.md.
