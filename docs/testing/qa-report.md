# QA and verification status

**Repository:** `konets000/NOCTURNE_01`  
**Audited baseline:** `1053e2baa8ffb2575debd39d241f9df09e8a9817`  
**App version:** 0.8.1 (versionCode 13)  
**Status:** development preview; no device-runtime certification.

This report describes evidence for this repository, not for the similarly named `NOCTURNE_0.9` repository. A successful workflow run on a different repository or commit is not evidence that this tree builds.

## Baseline findings

At the audited baseline commit, the repository had no `.github/workflows/ci.yml`, no `.github/dependabot.yml`, and no GitHub Actions workflow runs. However, `tests/app-smoke.test.cjs` directly reads both missing configuration files and asserts the presence of a pinned, read-only Android/Windows build workflow. The offline test runner therefore cannot pass its application smoke-test stage on that baseline.

The engineering branch restores the repository's public, read-only CI pipeline and weekly Dependabot configuration. GitHub Actions run [#3](https://github.com/konets000/NOCTURNE_01/actions/runs/42265100190) passed on commit `17885c449a6f45d1e9ef03130b81faa9d51525d5`: SoundTouch SHA verification, the complete offline regression suite, Windows packaging with the real verified processor, Android `:app:assembleDebug`, final Windows ZIP packaging, APK copying and artifact upload all succeeded. The first build attempt exposed an MDBG CC-CEDICT hash change; the pin was refreshed to the bytes received by CI, and the subsequent build completed with strict SHA-256 and dictionary-structure validation still enabled. This CI evidence applies to the listed commit; physical-device validation remains separate.

## What the automated checks cover

The checked-in Linux runner is designed to cover:

- The Java dictionary packager's validation and SHA-256 pin enforcement.
- The Java-to-JavaScript dictionary data contract.
- Android host Java compilation against local API stubs (not a real Android SDK/runtime test).
- Reader and application smoke tests, including storage recovery and subtitle/dictionary logic.
- Japanese core and dictionary-adapter tests.
- Windows ZIP contents, using synthetic data and a synthetic SoundTouch processor fixture. This is a packaging smoke test, not a real-audio or Windows runtime test.

The ZIP check is conditional on both `zip` and `unzip`. The runner now prints an explicit `SKIPPED` message when either utility is missing, and does not describe that skipped package check as passed.

The passing workflow is linked above and refers to the exact commit shown. Do not transfer that result to a later source commit without its own completed check.

## Not verified

- A successful GitHub Actions run for the engineering commit, including pinned dictionary acquisition, SoundTouch acquisition, APK assembly and Windows packaging.
- Installation and runtime behaviour on a physical Android device, including renderer-death recovery and file picking.
- Runtime behaviour on a real Windows PC, including Edge launch/exit, port conflicts and local profile persistence.
- Perceptual quality, latency and long-session stability of SoundTouch on target hardware.
- Independent fresh re-download and re-hash of all production dictionary sources during this audit.
- Japanese dictionary coverage, morphological analysis, contextual readings, furigana or pitch-accent data. The shipped Japanese layer remains a segmentation foundation and adapter code, not a complete Japanese dictionary.

## Release gate

Do not describe NOCTURNE as device-verified or stable until the [device validation checklist](device-validation.md) is completed. A passing CI build demonstrates that the tested source compiled and packaged in the CI environment; it does not establish correctness on every Android device or Windows configuration.
