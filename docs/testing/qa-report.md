# QA and verification status

**Repository:** `konets000/NOCTURNE_01`  
**Audited baseline:** `main` at `b7817926d5ab20aa92124d5d0ad18feff3781968`  
**Final verification PR head:** `7879855a4efb24b91862474f4eb88a23807e3d67`  
**Application version:** 0.8.1 (versionCode 13)  
**Status:** development preview; no physical-device certification.

This report distinguishes source review, automated tests, build/package evidence, and runtime checks on real devices. A successful build proves only the exact source and data inputs it used.

## Confirmed baseline reproducibility defect

Two CI runs on the same baseline commit produced different outcomes:

- [Run #28](https://github.com/konets000/NOCTURNE_01/actions/runs/42269216988) completed the Android APK and Windows ZIP pipeline.
- [Run #29](https://github.com/konets000/NOCTURNE_01/actions/runs/42377445177) failed during `:app:assembleDebug` because the moving MDBG CC-CEDICT URL returned different bytes from the configured SHA-256 pin. The dictionary packager correctly rejected the bytes and deleted the mismatched cached file.

The verification branch changes the CC-CEDICT input to the dated, unmodified snapshot release `1.0+20261007032622`, pinned to its published SHA-256:

`00e6c188df0056c42c0448386d0b4f532aa805d9fdd87aef139f72b421ace2f4`.

The strict pin and structural validation remain enabled.

## Additional build-input hardening

Every network dictionary source download is now capped at 64 MiB. A declared oversized Content-Length is rejected before writing; unknown-length/chunked responses are counted during streaming. Partial files are deleted and HTTP connections closed on failure.

The Java packager regression suite starts a local chunked HTTP response with no Content-Length, streams more than the configured limit, and verifies that the download fails with a safety-limit error and leaves neither a destination file nor a partial cache file.

## CI evidence for the verification branch

- [Run #67](https://github.com/konets000/NOCTURNE_01/actions/runs/42404790676) passed on application-code commit `b931f511b5df970d6b213d2b9d7f44a91612046d`. It included the bounded-download regression, offline test suite, SoundTouch preparation, Windows package smoke test, Android debug APK build, Windows ZIP packaging, APK staging and artifact upload.
- Run #67 produced artifact `NOCTURNE-CI-67`, 17,485,285 bytes, SHA-256 `ed20e16eac265bcecdd495a39f41d458d0b215598dec9f438de1473394176c02`, retained until 2026-11-21. It contains the debug APK and portable Windows ZIP. Download it from the [Actions run](https://github.com/konets000/NOCTURNE_01/actions/runs/42404790676), under Artifacts.
- [Run #76](https://github.com/konets000/NOCTURNE_01/actions/runs/42405070855) passed every test/build/package step on the final PR head `7879855a4efb24b91862474f4eb88a23807e3d67`. Artifact upload was skipped because GitHub skips uploads on pull-request events. The commits after #67 changed verification documentation and PR metadata, not application or build code.

## Automated coverage

The Linux workflow and `tests/run-tests.sh` cover:

- Java dictionary packager validation: SHA-256 pin enforcement, immutable source regression, bounded chunked downloads, CC-CEDICT structure, Unihan property handling, strict UTF-8, segmentation validation, gzip/ZIP handling and generated-asset read-back.
- Java-to-JavaScript dictionary data contract.
- Android host compilation against local Android/AndroidX API stubs. This checks signatures/compilation, not actual Android behavior.
- Reader bundle generation, seven-fragment source ordering, strict closure and deterministic output.
- Reader logic smoke tests: subtitle parsing, timestamp preservation, language-aware filtering, Chinese segmentation/lookup, pinyin, manual dictionary imports, persisted-data repair, size limits, Japanese subtitle preservation, and overlapping-cue highlighting.
- Japanese core and Yomitan v3 adapter data-contract tests. These do not prove a full Japanese dictionary or morphology runtime is present.
- Windows ZIP route/content checks and byte-for-byte shared-reader bundle comparison. CI also checks the production SoundTouch processor and licence are included.

The standalone Linux runner conditionally executes its ZIP smoke test only when both `zip` and `unzip` exist. A reported `SKIPPED` is not a pass.

## Feature-by-feature status

See [Feature verification matrix](feature-verification.md) for the shipped functions, source locations, automated evidence, limitations, and the runtime checks still required.

## Not verified on physical platforms

- Installation, launch and actual behavior on the target Android phone.
- Android file-picker behavior across providers, system-bar insets, rotation, renderer termination/recovery, and long sessions.
- Actual audio codec support, seek accuracy, loop boundaries, pitch/time-stretch artifacts, underruns, Bluetooth routing and subjective SoundTouch quality.
- Real Windows Edge lifecycle, persistent profile, file selection, loopback shutdown, port conflicts and network isolation.
- Full Japanese dictionary coverage, morphology, contextual readings, furigana or pitch accent. Shipped Japanese capability remains text preservation, browser segmentation and an adapter contract—not a complete Japanese dictionary.
- Offline neural TTS, URL extraction, translation, AI tutoring, spaced repetition, and background playback; these are not implemented.

## Release decision

The final verification branch has passed CI and produces both platform packages. **NOCTURNE is not yet device-certified or a stable release.** Complete the [device validation checklist](device-validation.md) on the target Android phone and a real Windows PC before relying on the application for long sessions or irreplaceable data.
