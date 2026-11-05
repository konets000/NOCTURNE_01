# QA and verification status

NOCTURNE 0.8.1 is a development preview. Japanese support is currently a subtitle-preservation and segmentation foundation; real Japanese dictionary data and morphological analysis are not yet bundled. This report distinguishes offline automated checks from full Android and Windows runtime validation.

## Verified in the current packaged source

The following checks passed when run from this exact source tree with OpenJDK 21 and Node.js 22.16.0:

- All 10 Java dictionary-packager self-tests, including pinned-download success, pin mismatch rejection, unpinned-download rejection, malformed UTF-8 rejection, CC-CEDICT ZIP handling, and output read-back verification.
- Java-to-JavaScript dictionary contract checks: app parser counts and packaged manifest metadata agree for CC-CEDICT, Unihan, and segmentation data.
- `MainActivity.java` compilation against the repository's Android/AndroidX stubs, with no compiler warnings. This checks signatures, not Android runtime behaviour.
- Node application smoke tests, including browser-storage recovery, Chinese dictionary/segmentation logic, Japanese and unclassified subtitle handling, pinyin conversion, and overlapping subtitle cues. Japanese core and Yomitan v3 adapter regression suites are also included.
- Portable Windows ZIP smoke test using synthetic fixtures, plus source-level assertions that the Windows loopback server requires and maps both Japanese modules to their exact packaged files.
- GitHub Actions run [#224](https://github.com/konets000/NOCTURNE_0.9/actions/runs/42065972398) passed on the current branch head: pinned SoundTouch preparation, offline regression suite, real-processor Windows package smoke test, Android `:app:assembleDebug`, portable Windows packaging, APK copy and artifact upload. The uploaded artifact is `NOCTURNE-CI-224`.

Source-level checks also cover the local asset allowlist and the Windows loopback server's bounded HTTP parsing. These are code and smoke-test checks, not an independent security audit or device-runtime certification.

## Not yet verified

- Physical Android runtime behaviour, including file picking, WebView asset loading, system speech availability, audio time-stretch quality, and storage migration. CI has successfully completed `:app:assembleDebug` in run #224, but that is a build check, not device validation.
- Runtime behaviour on a Windows PC, including Edge launch/exit, port conflicts, Japanese module loading, file import and browser-profile persistence. The Japanese HTTP routes are now covered by source-level regression assertions; actual Windows execution remains outstanding.
- Independent re-download and re-hash of all three full upstream dictionary datasets in this review. The package contains explicit pins and the tests cover pin enforcement, but this report does not claim a fresh network verification of those production files.

Japanese remains incomplete: the current build has platform word segmentation and a Yomitan v3 bank indexer, but does not yet bundle Lindera WASM, a Japanese morphology dictionary, Jitendex/JMdict data, verified furigana, or pitch-accent assets.

See [Device validation checklist](device-validation.md) before describing the app as device-verified or publishing stable binaries.
