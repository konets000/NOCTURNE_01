# Offline-first AI voice system

**Status: requirements and model investigation only. This document does not mean the voice engine or downloads are implemented.**

## Product behavior

NOCTURNE will add local neural text-to-speech for exactly these language profiles:

| Text language | Locale | Rule |
|---|---|---|
| Mandarin Chinese | `zh-CN` | Mandarin; Simplified Chinese is the initial target |
| English | `en-US` by default | English voice; the first release should not silently switch to another language |
| Spanish | `es-MX` only | Mexican Spanish only; never substitute Spain, Argentina, or generic Spanish |

The reader must keep working without an internet connection. Network access is for obtaining voice packages and their signed/pinned catalogue metadata, not for sending study text to a speech service.

## Two quality tiers

### Offline voice: always ready

A medium/decent-quality neural voice for each of the three profiles must be available from a clean install. The baseline cannot depend on a first-run download, an Android system voice being installed, or a cloud endpoint. It must synthesize locally after installation.

The initial Piper catalogue candidates are:

- `zh_CN-huayan-medium` for Mandarin.
- `en_US-lessac-medium` for English.
- `es_MX-ald-medium` for Mexican Spanish.

These are candidates, not final selections. Their individual model cards and licenses must be checked, and their speed, memory use, pronunciation and audio quality must be benchmarked on the target Android device and Windows. The three model files are roughly 60–63 MB each before their configuration and phonemizer/runtime data, so packaging size must be measured rather than guessed.

### High-quality voice: automatic upgrade

When a network connection becomes available, NOCTURNE must automatically check for the high-quality packages for all supported profiles and start downloading missing or outdated packages. The user must not need to open a settings page or press a download button.

Downloads must:

1. Use HTTPS and a small, allowlisted voice catalogue.
2. Be resumable after interruption and survive app restarts.
3. Verify a pinned SHA-256 digest before installation.
4. Install atomically only after every required model/configuration file is present and valid.
5. Store the installed model in the persistent local **Voice Library**, with language, locale, voice name, quality, version, size and verification status.
6. Never remove or replace the offline voice while an upgrade is downloading or if the upgrade fails.
7. Switch the default to the higher-quality voice automatically once it is fully installed; never interrupt speech already in progress.
8. Show honest progress and storage information. Downloading begins automatically, but the user can pause/cancel it and can delete an optional high-quality package later.

The default behavior should start on any available internet connection, not require a manual action, and make the approximate download size visible. A failed, partial, or corrupt download must leave the offline voice ready.

## Model selection: a known gap and alternatives to audition

The current official Piper voice catalogue is a useful candidate because it lists `zh_CN`, `en_US`, and `es_MX` and distributes ONNX models. Its current catalogue has high-quality `en_US` and `es_MX` choices, including `en_US-lessac-high` and `es_MX-claude-high`. Its listed `zh_CN` models, however, are medium or `x_low`; Piper alone does **not** supply the requested premium Mandarin tier in that catalogue snapshot.

There are Mandarin models in the sherpa-onnx ecosystem worth auditioning instead of stopping at the Piper catalogue:

| Candidate | Published information | What must still be established |
|---|---|---|
| sherpa-onnx `aishell3` (VITS) | Chinese-only, 174 speakers; the sherpa benchmark reports real-time factor (RTF) 0.156 with four threads on a Raspberry Pi 4 | Voice quality, pronunciation coverage, licence/redistribution terms, actual Android size and speed |
| sherpa-onnx `matcha-icefall-zh-baker` | Chinese-only, one female speaker; 72 MB acoustic model plus a 51 MB vocoder; four-thread Raspberry Pi 4 RTF 0.391 | Voice quality, licence/redistribution terms, memory and latency on the target Android device |
| sherpa-onnx `matcha-icefall-zh-en` | Chinese + English, one speaker; separate acoustic and vocoder files | English vocabulary coverage, Mexican/English language routing (it is not a Spanish solution), voice quality and device performance |

The RTF values are measurements on a Raspberry Pi 4, **not** on the target phone; they are only an initial performance screen. A model can be fast and still sound poor, or sound good but be too slow for this app. Model size must include every required graph, vocoder, lexicon, FST, tokenizer/phonemizer and runtime file, not only the main ONNX graph.

Sherpa-onnx documents Android support for TTS and provides model-specific sample and Android engine pages. It is a plausible shared inference-runtime candidate to investigate for Android and Windows, but that does not establish that a particular model is premium or that its model licence permits redistribution.

Before the feature can be called complete, NOCTURNE needs a Mandarin premium pack that:
- genuinely targets Mandarin Chinese (`zh-CN`) and has natural, intelligible pronunciation on representative NOCTURNE subtitle/text samples;
- has an explicit, compatible model licence and downloadable weights;
- runs locally on the target Android device and on Windows;
- meets defined quality, latency, memory and storage thresholds on real target hardware.

Do not relabel the Piper medium Mandarin voice as premium, infer quality from model size/speaker count alone, silently fall back to a different Chinese variety, or claim the three premium voices are ready until this gate is passed.

## Reading and playback experience

- A speaker/play button on the visible text starts speech for the current sentence or selected text.
- The text stays visible while its generated audio plays. The reader must not navigate away to another screen or hide the source text.
- Sentence playback uses the selected locale and the best installed quality tier. The offline voice is used immediately while the premium pack is missing or downloading.
- Existing imported-audio playback remains available. TTS is a fallback for text-only material or sessions without matching audio; it must not overwrite or replace the user's original audio.
- Long text is split into safe sentence-sized pieces. Playback state, pause, resume and stop must be deterministic. A new sentence request cancels stale synthesis instead of playing old audio after the user has moved on.
- Voice selection and preferred quality persist locally.

## Voice Library

Add a dedicated voice section to the existing local library. Each profile should expose its offline voice and premium voice state:

- Ready offline
- Premium download queued
- Downloading (bytes and percentage)
- Verifying
- Premium ready
- Download paused / failed (with retry)
- Premium removed

Voice files and their metadata stay inside app-controlled storage. The voice library must survive app restarts, offline launches and application upgrades. The offline baseline remains protected from accidental deletion.

## Privacy and platform boundaries

The current app intentionally has no Android `INTERNET` permission. The Android manifest must gain only the network permissions needed for automatic package downloads, and the download implementation must be native/platform-controlled. Do not grant the WebView general access to the internet.

- Download only the approved catalogue and model/configuration files.
- Do not upload subtitles, plain text, URLs being studied, selected words, audio, generated speech, or usage history for synthesis or analytics.
- Generate speech locally from the user's text once a model is installed.
- Keep model downloads separate from the existing CC-CEDICT/Unihan dictionary pipeline.
- Keep the Windows launcher bound to loopback. Its current Content Security Policy permits only same-origin connections; any download path must be narrowly allowlisted and must not become an arbitrary network proxy.
- Store partial downloads separately from installed packs; validate size, digest and metadata before atomic promotion.
- Review engine, runtime, phonemizer and each individual voice model's licences before redistributing or bundling them. A voice model's licence is not automatically the same as its inference engine's licence.

## Implementation order

1. **Choose and benchmark models.** Confirm the three offline voices and find/validate the separate Mandarin premium model. Record source revision, immutable URLs, SHA-256, model-card licence, expected size and test sentences.
2. **Introduce a voice catalogue.** Treat it as pinned build/runtime input; reject unpinned or digest-mismatched files.
3. **Integrate local synthesis.** Provide a narrow platform adapter for Android and Windows, with no remote synthesis path.
4. **Build the voice download manager.** Automatic connectivity-triggered, resumable, hash-verified, atomic installation and persistent library state.
5. **Add the reader controls.** Sentence/text playback, visible text, progress, pause/resume/stop, locale routing and automatic quality selection.
6. **Test failure modes.** Offline first launch, internet appearing mid-session, partial download, app/process termination, storage exhaustion, digest mismatch, model load failure, language mismatch, upgrade during playback, restart after installation and removal of the optional premium pack.
7. **Validate on real devices.** Test Android and Windows separately for audio output, pronunciation, memory pressure, speed, battery use, interruption behavior and persistent storage.

## Acceptance criteria

The feature is not done until all of these pass:

- A clean offline install can synthesize Mandarin, English and Mexican Spanish without any network or system voice dependency.
- Reconnecting to the internet starts missing premium downloads automatically, without a user download action.
- Each completed premium package is verified and remains available offline in the Voice Library after restart.
- A failed download cannot break or delete the baseline voice.
- The correct locale is selected for each language; Spanish is always `es-MX`.
- Text remains visible during speech and the user's original audio is untouched.
- No study text or audio is sent to a server.
- The download and synthesis paths pass automated tests and physical-device validation.

## Technical references

- [Piper voice catalogue and model guidance](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md)
- [Piper official voice catalogue metadata](https://huggingface.co/rhasspy/piper-voices/blob/main/voices.json)
- [Sherpa-ONNX TTS pre-trained model catalogue](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/index.html)
- [Sherpa-ONNX Chinese VITS models](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/vits.html)
- [Sherpa-ONNX Matcha Chinese model samples and files](https://k2-fsa.github.io/sherpa/onnx/tts/all/Chinese/matcha-icefall-zh-baker.html)
- [Sherpa-ONNX Android build and TTS support](https://k2-fsa.github.io/sherpa/onnx/android/build-sherpa-onnx.html)
- [Sherpa-ONNX model real-time-factor benchmarks](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/rtf.html)
- [Android Piper application reference](https://github.com/piper-tts-apps/piper-app-android)

The Piper engine is a candidate, not a commitment. Its engine licence, each voice model's licence, Android integration requirements and target-device performance must be reviewed before adoption.
