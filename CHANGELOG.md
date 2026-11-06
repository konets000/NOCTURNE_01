# Changelog

### Unreleased — plain-text reader and build reliability

- Added untimed `.txt` document import with paragraph segmentation, bounded display blocks, local session persistence, and no fabricated timestamps.
- Kept SRT timestamp parsing and audio synchronization separate; untimed text cannot trigger cue seeking or looping.
- Restored the missing read-only CI workflow, Dependabot configuration, and repository ignore rules.
- Corrected stale source paths, reader-fragment counts, subtitle-cue terminology, and build provenance metadata.

### Unreleased — reader source organization
- Split the shared reader into seven responsibility-based source fragments under `app/src/reader/` and added a deterministic build tool that assembles the same single-file `app.js` runtime bundle.
- Wired reader assembly into Android Gradle builds, the Windows portable packager and regression tests. The generated bundle lives under `build/reader/` and is not committed.
- No reader feature or runtime behavior was intentionally changed; the fragments still share the original private closure.


### Unreleased — offline AI voice requirements
- Refreshed the reviewed CC-CEDICT source SHA-256 for the MDBG export observed on 2026-11-05; strict hash verification and the 100,000-entry minimum validation remain enabled.


- Added `docs/architecture/voice-system.md`, specifying offline neural voices for Mandarin, English and Mexican Spanish, automatic background downloads of high-quality voice packs, persistent local voice-library storage, and text-visible speech playback.
- Recorded a release-blocking model gap: the current Piper catalogue lists high-quality English and Mexican Spanish models, but its listed Mandarin models are medium/lower quality. A separate Mandarin premium model still needs licensing, device-performance and pronunciation validation.
- **Documentation only:** no TTS runtime, voice packs, automatic downloader, network permission, or APK feature is implemented by this change.
- Added `docs/architecture/speed-control.md` with the initial pitch-preserving speed-control design; the current SoundTouchJS implementation and remaining acoustic validation are recorded below.

### Unreleased — Japanese and platform integration fixes

- Added explicit Windows loopback routes and startup-file checks for the Japanese core and dictionary modules, matching the files already packaged in the portable ZIP.
- Kept Auto-detected non-CJK text in a generic, dictionary-neutral mode instead of routing it through Chinese segmentation, CC-CEDICT lookup or Mandarin system speech.
- Added regression coverage for the Windows Japanese routes, Android asset allowlist, and unclassified-text behavior.
- Updated product documentation to distinguish the current Japanese segmentation foundation from the not-yet-bundled Lindera/Jitendex dictionary engine.

### Unreleased — pitch-preserving audio speed control

- Integrated the pinned SoundTouchJS AudioWorklet 2.1.1 processor for local pitch-preserving tempo changes across Android WebView and Windows Edge.
- Added a 0.65×–1.50× speed slider in 0.05× steps, a 0.80× Clear speech preset, persisted speed preference, and a browser-native pitch-preserving fallback.
- Kept original media time as the subtitle/seek/loop timeline; mirrored playback rate into the processor's pitch-compensation parameter.
- Added a SHA-256-pinned build-time archive download, size cap, processor extraction, explicit Android/Windows asset allowlists, and bundled MPL-2.0 licence.
- **Validation still pending:** actual Android/Windows audio playback, blind Mandarin listening, long-session underruns and cue/loop synchronization. No lossless or high-fidelity claim is made yet.


### Public repository preparation

- Rewrote the README for public visitors, separating local runtime privacy from networked build-time downloads.
- Replaced the private-use CI workflow with a read-only public CI workflow for pushes, pull requests, and manual runs.
- Removed signing-key caching, secret restoration, and signing-key backup artifacts. CI debug builds are explicitly temporary test outputs.
- Pinned GitHub Actions dependencies to verified full commit SHAs and added Dependabot update checks.
- Added contributor guidance, a security-reporting policy, and a platform validation checklist.
- Expanded `.gitignore` to cover build outputs, generated Android packages, common signing material, and local secret files.
- Kept the missing project-level license and stable release process explicit as release-readiness items.

### 0.8.1: input validation and portable-launcher hardening

- Bounded compressed dictionary expansion before allocating untrusted input, and reject malformed or encrypted ZIP entries.
- Reject invalid SRT minute and second fields and repair persisted sessions into timestamp order before playback synchronization.
- Require Microsoft Edge for the managed Windows app window so closing it deterministically stops the local loopback server.

### 0.8.0: reproducible dictionary inputs and storage recovery

- Pinned CC-CEDICT and Unicode Unihan by SHA-256, and Jieba by immutable upstream commit plus SHA-256. Network builds now fail when a source is unpinned or changes unexpectedly.
- Declared local dictionary override files as Gradle file inputs so content or filename changes trigger repackaging.
- Validated saved sessions, cues, vocabulary, playback speed, and loop state before restoring them. Invalid or stale browser data is repaired without preventing startup, and the user is told when a repair occurred.
- Moved application JavaScript into a same-origin asset, tightened the Windows Content Security Policy to disallow inline scripts, and bounded HTTP request-line and header parsing.
- Added regression coverage for corrupted storage and pin enforcement, and bumped the app version to 0.8.0 (versionCode 12).

### 0.7.0: private-device build and portable Windows edition

- Re-scoped the project for private sideloading to one Android device and local use on a Windows PC. No Google Play submission, store signing, or publishing checklist is on the critical path.
- Adopted the simpler API-35 / AGP 8.7.3 / Gradle 8.9 toolchain, which the official Android compatibility table supports.
- Added a portable Windows package that uses the same `index.html` and generated dictionary assets as Android. It starts with a double-click, serves only `127.0.0.1:18473`, decompresses dictionary data locally, and uses a strict URL allowlist.
- Expanded the one-click GitHub Actions workflow to build an installable debug APK and the Windows portable ZIP together.
- Added a cache for the private build's Android debug signing key so successive builds can normally install as updates. The workflow also uploaded a private key backup artifact, which was to be retained securely for future recovery.
- Removed Play-driven API-36 requirements and release-signing and pin gates from the personal debug-build path. Dictionary inputs are still validated, and observed source hashes are written to the build log and manifest.
- Bumped the app version to 0.7.0 (versionCode 11).

### 0.6.1: source hardening

- Corrected the Unicode 17 Unihan source URL.
- Detected CC-CEDICT input format by magic bytes rather than file extension.
- Restricted Android app asset delivery to the entry point and an explicit dictionary allowlist.
- Avoided rewriting the session library on every automatic subtitle transition.
- Added an initial manual cloud build workflow and a Windows test runner.

### 0.6.0: reviewed offline app foundation

- Corrected dictionary Gradle provider wiring, strict UTF-8 handling, Android system-bar insets, gesture-gated external links, and API-24-compatible immutable set creation.
- Added offline packager and app-logic regression tests.
- Retained first-class SRT import, Chinese-only cue filtering, local audio, synchronized highlighting, word lookup, pinyin fallback, and dictionary storage.

---
