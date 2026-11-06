# QA and verification status

**Repository:** `konets000/NOCTURNE_01`  
**Verified main commit:** `bdaf16ebc9e7009075278855d5771e23c39c74da`  
**App version:** 0.8.1 (versionCode 13)  
**Status:** development preview; no physical-device certification.

This report describes evidence for this repository, not for the similarly named `NOCTURNE_0.9` repository. A successful workflow run on a different repository or commit is not evidence that this tree builds.

## Repository repair and current CI evidence

The audited baseline commit `1053e2baa8ffb2575debd39d241f9df09e8a9817` lacked `.github/workflows/ci.yml`, `.github/dependabot.yml`, and `.gitignore`. The application smoke test required both GitHub configuration files, so the offline suite could not pass against that baseline. The missing read-only CI workflow, weekly Dependabot configuration and build-output ignore rules have since been restored and merged into `main`.

GitHub Actions run [#27](https://github.com/konets000/NOCTURNE_01/actions/runs/42268645467) passed on the verified main commit `bdaf16ebc9e7009075278855d5771e23c39c74da`. It completed pinned SoundTouch preparation, the offline regression suite, the real-processor Windows packaging smoke test, Android `:app:assembleDebug`, the final portable Windows ZIP, APK staging and artifact upload.

The first build attempt exposed an MDBG CC-CEDICT hash change. The source pin was refreshed to the exact bytes received in CI, and the subsequent build passed while retaining strict SHA-256 checking and the 100,000-entry CC-CEDICT validation minimum.

## Automated coverage

The passing Linux workflow covers:

- Java dictionary packager validation and SHA-256 pin enforcement.
- Java-to-JavaScript dictionary data contract.
- Android host Java compilation against local Android/AndroidX API stubs. This is a compile check, not an Android runtime test.
- Reader and app smoke tests, including storage recovery, subtitle/dictionary logic, and source assertions for Android WebView renderer recovery.
- Japanese core and dictionary-adapter tests.
- Windows ZIP contents, using a verified SoundTouch processor in the workflow packaging smoke test. This does not replace a real Windows runtime test.

The standalone Linux runner conditionally executes its Windows ZIP check only when both `zip` and `unzip` are installed. When either is missing, it explicitly reports `SKIPPED`; that check is not counted as passed.

## Not verified

- Installation and real runtime behaviour on a physical Android device, including renderer-death recovery, file picking, orientation changes and audio playback.
- Runtime behaviour on a real Windows PC, including Edge launch/exit, port conflicts and local profile persistence.
- Perceptual quality, latency and long-session stability of SoundTouch on target hardware.
- Independent fresh re-download and re-hash of all production dictionary sources beyond the successful pinned CI acquisition.
- Japanese dictionary coverage, morphological analysis, contextual readings, furigana or pitch-accent data. The shipped Japanese layer remains a segmentation foundation and adapter code, not a complete Japanese dictionary.

## Release gate

Do not describe NOCTURNE as device-verified or stable until the [device validation checklist](device-validation.md) is completed. A passing CI build demonstrates that the tested source compiled and packaged in the CI environment; it does not establish correctness on every Android device or Windows configuration.
