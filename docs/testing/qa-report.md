# QA and verification status

**Repository:** `konets000/NOCTURNE_01`  
**Audited main commit:** `b7817926d5ab20aa92124d5d0ad18feff3781968`  
**App version:** 0.8.1 (versionCode 13)  
**Status:** development preview; no physical-device certification.

This report describes evidence for this repository. A successful workflow run proves only the exact source commit and inputs that it built.

## CI evidence on the audited main commit

- [Run #28](https://github.com/konets000/NOCTURNE_01/actions/runs/42269216988) completed successfully on `b7817926d5ab20aa92124d5d0ad18feff3781968`. It prepared the pinned SoundTouch processor, ran the offline regression suite, smoke-tested Windows packaging, built the Android debug APK, produced the portable Windows ZIP, staged the APK, and uploaded artifact `NOCTURNE-CI-28`.
- [Run #29](https://github.com/konets000/NOCTURNE_01/actions/runs/42377445177) ran on the same source commit and failed during `:app:assembleDebug`. The CC-CEDICT URL returned SHA-256 `8a506d01724a4f528db965bf3598efaf3be3ade121749f5c2730262996a80ad1`, while the configured pin expected `7708295976336e3c077b05df0f3beb598caccf1dddf01c9b04c90828d8810cd9`. The packager rejected the unexpected bytes and deleted the mismatched cached copy. The test suite and earlier Windows processor smoke step had passed; later package and artifact steps were skipped because the Android build failed.

This is a reproducibility defect in the moving upstream input, not a reason to weaken integrity checks. The verification branch replaces the mutable MDBG export URL with the dated, unmodified CC-CEDICT snapshot release `1.0+20261007032622`, pinned to the release asset's published SHA-256 `00e6c188df0056c42c0448386d0b4f532aa805d9fdd87aef139f72b421ace2f4`. The branch's own CI must pass before this fix is considered verified.

## Automated coverage in the existing suite

The Linux workflow and `tests/run-tests.sh` cover:

- Java dictionary packager validation, including SHA-256 pin enforcement, CC-CEDICT structure, Unihan property handling, strict UTF-8, segmentation validation, gzip/ZIP handling and generated-asset read-back.
- Java-to-JavaScript dictionary data contract.
- Android host compilation against local Android/AndroidX stubs. This is a compile check, not a physical Android test.
- Reader bundle generation and deterministic source ordering.
- Reader logic smoke tests: subtitle parsing, timestamp preservation, language-aware filtering, Chinese segmentation/lookup, pinyin, dictionary imports, persisted-data repair, size limits, Japanese subtitle preservation, and overlapping-cue highlighting.
- Japanese core and Yomitan v3 adapter data-contract tests. These do not prove the presence of a production Japanese dictionary or morphology runtime.
- Windows ZIP route/content checks and byte-for-byte shared-reader bundle comparison. Run #28 also checked the production SoundTouch processor and licence in the package.

The standalone Linux runner conditionally executes its Windows ZIP check only when both `zip` and `unzip` are installed. A reported `SKIPPED` is not a pass.

## Feature implementation versus proof

See [Feature verification matrix](feature-verification.md) for every user-facing subsystem, its implementation location, automated evidence, and remaining runtime proof.

## Not verified

- The verification branch's own clean CI result using the immutable CC-CEDICT snapshot.
- Installation and real runtime behaviour on a physical Android device, including file picking, system-bar layout, renderer recovery, playback and long sessions.
- Runtime behaviour on a real Windows PC, including Edge lifecycle, profile persistence, file selection, audio and loopback shutdown.
- Perceptual SoundTouch quality, latency, underruns, cue/loop synchronization and Bluetooth behaviour on target hardware.
- Full Japanese dictionary coverage, morphological analysis, contextual readings, furigana or pitch-accent data. Shipped Japanese support remains a segmentation foundation and adapter code, not a complete Japanese dictionary.
- Offline neural TTS, arbitrary URL extraction, translation, AI tutoring, spaced repetition and background playback; these are not implemented.

## Release gate

The verification branch has a successful CI build, but do not call NOCTURNE stable or device-verified until the [device validation checklist](device-validation.md) is completed. A successful APK build does not prove runtime correctness or acoustic quality.
