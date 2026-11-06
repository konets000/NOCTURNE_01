# QA and verification status

NOCTURNE 0.8.1 is a development preview. This report applies only to the `NOCTURNE_01` repository and distinguishes configured checks from checks that have actually completed.

## Current source status

The current branch restores the missing read-only GitHub Actions workflow and Dependabot configuration required by the application smoke tests. It also adds regression tests for untimed plain-text documents, local persistence of text documents, text-size bounds, and the rule that untimed text never receives fabricated cue timestamps.

A passing workflow run on this exact branch commit is required before this report can state that the current source snapshot passed. A workflow definition is not evidence of a successful build.

## Historical evidence that does not apply to this snapshot

The previously cited GitHub Actions run #224 belongs to the separate `NOCTURNE_0.9` repository. It does not validate this `NOCTURNE_01` source tree and must not be presented as a test result for this repository.

## Verification boundaries

The automated suite contains source-level assertions, parser and storage tests, dictionary packaging tests, Android Java compilation against local API stubs, and a synthetic Windows ZIP test. Stub compilation does not prove Android runtime behavior; archive inspection does not prove the PowerShell launcher works on Windows.

The following still require real platform validation:

- Install and exercise the APK on a physical Android device, including file picking, WebView asset loading, local audio, speed processing, storage recovery, and background behavior.
- Run the portable package on a Windows PC, including Edge startup/exit, port conflicts, text/SRT import, audio playback and profile persistence.
- Perform listening tests for Mandarin speed processing, cue synchronization, underruns and long-session stability.
- Independently re-download and re-hash each production dictionary input during a clean build.

Japanese remains an initial segmentation foundation, not a full dictionary-backed implementation. Neural TTS, plain-text speech generation and URL extraction are not implemented.

See [Device validation checklist](device-validation.md) before describing the app as device-verified or publishing stable binaries.
