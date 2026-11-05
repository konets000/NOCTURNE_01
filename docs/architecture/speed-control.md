# High-quality audio speed control

**Status: first implementation integrated. Device-specific listening and performance validation is still pending; this is not yet a claim of studio-quality output.**

## Product objective

Let the listener slow fast Mandarin speech enough to understand it while keeping voices natural: no chipmunk/deep-voice effect, no avoidable metallic or watery artifacts, no chopped consonants, no stutters, and no broken subtitle synchronization.

This is a **pitch-preserving time-stretch** feature, not ordinary slow-motion resampling. A rate of `0.80×` should make the passage take 25% longer while keeping the speaker's pitch close to the original. The original audio file must remain untouched. Processing happens locally during playback; NOCTURNE should not create a re-encoded copy just to apply the speed setting.

"Without quality loss" needs a truthful qualification: no time-stretch algorithm can guarantee a mathematically identical sound after changing its duration. Good algorithms can make moderate changes sound natural, but extreme slowdown, noisy recordings, overlapping music and difficult consonants can expose artifacts. The acceptance target is **no obvious degradation at the normal study speeds**, not a false promise of zero loss at every rate.

## What exists today

The reader now exposes a speed slider from `0.65×` to `1.50×` in `0.05×` steps, plus a one-tap `0.80×` **Clear speech** preset. The selected value is persisted locally and can be changed during playback.

The advanced path is the pinned `@soundtouchjs/audio-worklet` **2.1.1** processor, bundled at build time and executed locally through Web Audio. The player connects its existing HTML audio element to the SoundTouch AudioWorklet, disables the browser's own pitch compensation while that processor is active, and mirrors the media element's playback rate into the processor's pitch-compensation parameter. The original audio file is not rewritten and no remote synthesis or runtime download is involved.

The same HTML/JavaScript player runs in Android WebView and Windows Edge. Subtitle highlighting, seek, current cue and sentence looping continue to use the media element's original `currentTime` timeline. The processor changes the playback tempo and compensates pitch; it does not replace the media element as the source of timeline truth.

If AudioWorklet is unsupported or the local processor cannot initialize, NOCTURNE falls back to the browser's built-in pitch-preserving `playbackRate` path and identifies that mode in the player. This fallback is for availability, not a promise of equal sound quality.

## Recommended user experience

### Main control

Replace the one-button cycle with a compact speed control showing the exact current value, with a slider and useful quick choices.

Suggested initial range and steps:

- Study range: `0.65×–1.10×`, in `0.05×` increments.
- Quick choices: `0.70×`, `0.75×`, `0.80×`, `0.85×`, `0.90×`, `1.00×`.
- Optional faster choices: `1.10×`, `1.25×`, `1.50×`.

The initial Mandarin "Clear speech" shortcut should choose `0.80×`, but it must remain only a shortcut. The speed slider always stays directly adjustable. Do not label `0.80×` as universally optimal; the user controls the rate.

### Learning controls

- Apply speed immediately without restarting the track or losing the current position.
- Keep pitch preservation on by default. Do not offer a pitch-changing slow-motion mode in the initial release.
- Let the user loop the current subtitle sentence at the chosen rate.
- Persist a preferred rate locally. Separate Mandarin, English and Mexican-Spanish preferences are a future refinement; the current implementation stores one global speed preference.
- Keep speech speed independent from volume, equalization and voice selection.
- Do not change the original source file, session timestamps or subtitle text.

### A later optional intelligence layer

After fixed-rate playback is reliable, consider an opt-in **Adaptive study speed** mode. It could estimate reading difficulty from cue density (for example, Hanzi characters per subtitle second), then ease between user-approved rates near subtitle boundaries. It must show the active rate and obey a strict user-set floor/ceiling.

This should not be in the first release. Subtitle density is only a rough proxy: captions may be summarized, late, early, or split differently from speech. The system should never claim to know exact spoken speed from text alone, and it should never silently alter playback without showing the user.

## Processing technology candidates

Evaluate three approaches against the same set of fast Mandarin recordings. Do not select an engine from its name or a benchmark number alone.

### 1. Rubber Band — quality reference candidate

Rubber Band is a high-quality C++ time-stretch/pitch-shift library with a real-time streaming mode. Its integration guidance specifically recommends its finer engine, channels-together processing and short windows when CPU is limited and the material is speech, vocals or acoustic recordings. It also documents the buffering and source/output-clock mapping that a real-time integration must handle.

Use it as the **quality reference** in listening tests. It is not automatically the shipping choice: its public licence is GPL v2-or-later, while proprietary distribution needs a separate commercial licence. NOCTURNE has not selected a project-level licence, so this must be resolved before integration.

### 2. SoundTouch / SoundTouchJS AudioWorklet — shared-reader candidate

SoundTouch supports real-time time stretching and Android. A newer SoundTouchJS AudioWorklet package provides a browser-side processing path. An AudioWorklet executes audio processing away from the UI thread, and the Web Audio API can use WebAssembly for heavier processing.

This path is architecturally attractive because the same reader runs in Android WebView and Windows Edge. It is only a candidate: package maturity, licence, Android WebView compatibility, buffer stability, processing latency and Mandarin intelligibility must all be verified. Its own docs describe trade-offs and audible artifacts at aggressive settings; do not assume it is equivalent to Rubber Band.

### 3. Android Media3 / Sonic — native baseline

Android Media3 provides a `SonicAudioProcessor` and documents playback parameters that adjust speed without changing pitch. It is worth using as an Android-native baseline in the comparison.

It is not by itself a cross-platform answer: the portable Windows edition still runs the shared reader in Edge. Adopting it as the only engine would create two playback implementations and a more complicated synchronization/maintenance burden.

## Proposed architecture direction

Prefer **one shared playback-speed interface** with a consistent rate, state model and source-time mapping.

**First implementation selected: SoundTouchJS AudioWorklet 2.1.1.** It provides the shared Web Audio processing path and WSOLA-based tempo adjustment while keeping the existing Android/Windows reader architecture. NOCTURNE creates the AudioContext only during playback, loads the processor from its local same-origin asset path, and sends source playback rate plus the matching processor compensation parameter. The npm archive is pinned to version 2.1.1 and SHA-256 `360c233284a44c30f6a7a20578e48f2011c988c86b737d422bc73da37bf8a24b`. The build extracts only the pre-bundled processor and the upstream MPL-2.0 licence file; no package code is fetched at runtime.

The Android asset loader and Windows loopback server expose only the processor's explicit path. Windows CSP permits same-origin worklet scripts only. The Android manifest still requests no `INTERNET` permission. Keep the native Media3/Sonic and Rubber Band comparisons as possible future alternatives only if listening tests show that the shared processor is insufficient. Do not claim that a selected library is the best-sounding engine before blind listening and target-device tests.

For either architecture:

1. Decode source audio to PCM for processing; keep the original compressed file unchanged.
2. Process in bounded, buffered chunks. Never run heavy DSP on the UI thread or block the audio callback.
3. Keep a mapping from processed output frames to original media timestamps. The subtitle synchronizer, seek bar, current sentence and loop boundary must use source-media time, not wall-clock output time.
4. Smooth parameter changes over a short transition so changing the slider does not click or cause a sudden phase jump.
5. Keep a safe fallback to the existing pitch-preserving browser playback mode if the advanced processor cannot initialize or starts underrunning. Tell the user which mode is active.
6. Reset buffers correctly on seek, source replacement, session change, loop restart, pause/resume and audio-device change.

## AI-generated speech

Treat generated speech separately from imported recordings:

- If the selected TTS model exposes a reliable generation-time speed/duration parameter, request the desired rate from the TTS engine first. This may preserve natural phoneme timing better than stretching fully generated audio afterwards.
- If a model has no usable speed parameter, pass its output through the same selected time-stretch engine.
- Apply the speed setting to both offline and downloaded premium voices. Voice quality tier and speaking rate must be separate preferences.
- Do not synthesize speech remotely just to achieve slow playback. The voice engine and its audio processing stay local.

## Engineering risks to test

- Consonants, fricatives, aspirated sounds and fast Mandarin transitions becoming smeared or shortened.
- Metallic/robotic/warbling artifacts, transient smearing, echo-like repetitions or phase cancellation.
- Mono versus stereo, sample-rate conversion, different codecs, low-bitrate audio and recordings with background music.
- Processor underruns, Bluetooth latency, audio route changes, CPU/battery use, thermal throttling and memory pressure.
- Position drift between audio and subtitle cues during fixed-rate playback, speed changes, seek and sentence loop.
- Differences between Android WebView and Windows Edge.
- Licence compatibility and the full dependency chain, including native/WASM binaries.

## Validation plan

Use the following test matrix to decide whether the current integrated processor is good enough for production:

| Test material | Rates | What to judge |
|---|---|---|
| Fast native Mandarin conversation | 1.00, 0.90, 0.80, 0.70 | Consonants, tones, syllable boundaries, naturalness |
| Male and female Mandarin speakers | 0.90, 0.80, 0.70 | Pitch stability and voice artifacts |
| Clean speech versus noisy/mixed audio | 0.90, 0.80 | Robustness and intelligibility |
| English and Mexican Spanish | 0.90, 0.80 | Cross-language behavior |
| AI-generated voice output | 1.00, 0.90, 0.80 | Native TTS speed versus post-stretching |

Use identical source segments and blind A/B listening among the integrated SoundTouchJS path, the browser fallback, Media3/Sonic (Android) and Rubber Band where builds are available. Include native Mandarin listeners in the quality review; objective measurements can help detect stalls, timing drift and loudness changes, but cannot replace listening tests.

Run performance tests on the actual Android device and a normal Windows PC, including long playback sessions and Bluetooth headphones. Record the target device, OS/WebView/Edge version, model/library version, CPU use, memory, buffer underruns and latency. Test low-end hardware before enabling the most expensive quality mode by default.

## Release gates

The feature is ready only when:

- The same speed settings work on Android and Windows.
- Speech remains understandable and natural at `0.80×` and acceptable at `0.70×` on the agreed Mandarin test set.
- Pitch does not fall simply because playback is slower.
- No clicks, gaps, buffer underruns or noticeable audio/subtitle drift occur in long sessions.
- Speed changes do not restart playback, lose position, break looping or modify the source file.
- The advanced processor fails safely to the basic playback path.
- The chosen engine and all transitive dependencies have compatible documented licences.
- AI voice output obeys the same speed setting offline and after premium voice downloads.

## Technical references

- [HTML audio playback rate](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate)
- [HTML audio pitch preservation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preservesPitch)
- [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [Using AudioWorklet, including WebAssembly processing](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet)
- [Rubber Band Library](https://www.breakfastquay.com/rubberband/)
- [Rubber Band real-time integration guidance](https://www.breakfastquay.com/rubberband/integration.html)
- [Rubber Band licensing](https://www.breakfastquay.com/rubberband/license.html)
- [SoundTouch](https://soundtouch.surina.net/)
- [SoundTouchJS AudioWorklet](https://github.com/cutterbl/SoundTouchJS/tree/master/packages/audio-worklet)
- [Android Media3 PlaybackParameters](https://developer.android.com/reference/androidx/media3/common/PlaybackParameters)
- [Android Media3 SonicAudioProcessor](https://developer.android.com/reference/androidx/media3/common/audio/SonicAudioProcessor)
- [Sherpa-ONNX speech generation configuration](https://k2-fsa.github.io/sherpa/onnx/c-api/html/structSherpaOnnxGenerationConfig.html)

SoundTouchJS 2.1.1 is now integrated as the first processing engine, and the slider/fallback paths are implemented. Automated source checks and a successful Android/Windows packaging run are still required; blind listening, Android WebView and Windows Edge runtime tests, Mandarin intelligibility, long-session stability and Bluetooth tests remain release gates. The feature must not be described as lossless or proven high-fidelity until those tests are completed.
