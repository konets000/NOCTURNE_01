# Device validation checklist

Runtime checks for the current development preview. This is not a Google Play or stable-release sign-off.

### Automated checks

- [x] Historical full CI build succeeded on baseline commit `b7817926d5ab20aa92124d5d0ad18feff3781968` (JDK 17, Node.js 22, Gradle 8.9; [run #28](https://github.com/konets000/NOCTURNE_01/actions/runs/42269216988)).
- [x] The offline regression suite and Android/Windows packaging steps completed in run #28.
- [x] Android manifest does not request Internet permission.
- [x] Windows launcher source binds to loopback and uses bounded HTTP parsing and an explicit route allowlist.
- [ ] Confirm this verification branch passes CI using the immutable CC-CEDICT release snapshot. The baseline run #29 failed closed when the mutable MDBG URL returned different bytes.
- [ ] Install the resulting APK on a physical Android device.
- [ ] Exercise the portable ZIP on a real Windows PC.

### Android

- [ ] Install the exact verification-branch CI APK and launch it from a clean install.
- [ ] Import `samples/bilingual-filter-demo.srt`. Verify non-Chinese-only cue filtering, timestamps, and ordering.
- [ ] Import a Japanese SRT containing kana, kanji, Latin text and ruby markup. Verify language selection and lossless text preservation. Do not expect full dictionary lookup.
- [ ] Import matching local audio. Verify play/pause, seek, ±2-second skip, active cue highlighting, and end-of-file behavior.
- [ ] Test subtitle-cue loop at short and long cues, including overlapping cue ranges and gaps.
- [ ] Test speed at 0.65×, 0.80×, 1.00×, 1.25× and 1.50×. Compare SoundTouch and browser fallback. Listen for pitch instability, artifacts, clicks and stutters.
- [ ] Test a long audio session and Bluetooth output. Record underrun warnings and observed audio quality; do not infer quality from a successful build.
- [ ] Tap simplified and traditional Chinese words. Verify word senses, multiple readings, character pinyin and Unihan fallback.
- [ ] Import a reviewed CC-CEDICT `.txt`, `.txt.gz`, or supported `.zip` file. Verify size/structure rejection and manual-import precedence after app restart.
- [ ] Reopen a saved session. Verify subtitle restoration and reselect audio when prompted.
- [ ] Verify saved words, session recovery after malformed storage, and behavior when app storage is nearly full.
- [ ] Confirm playback pauses when the app enters the background.
- [ ] Test file picker cancellation, multiple file selection, rotation, system-bar insets and Back dismissal of sheets/modals.
- [ ] In a dedicated debug test, terminate the WebView renderer and verify NOCTURNE destroys the dead view, creates a fresh one, and restores the saved session.
- [ ] Launch with network disabled after installation and verify the bundled reader/dictionaries still load.

### Windows

- [ ] Extract the exact verification-branch portable ZIP and run `start-nocturne.bat` on Windows 10/11.
- [ ] Verify Microsoft Edge opens in the dedicated NOCTURNE profile and the launcher console remains available.
- [ ] Verify required-file preflight fails with a clear message when a bundled file is deliberately removed.
- [ ] Import Chinese and Japanese sample SRT files and matching local audio. Check dictionary lookup, playback, synchronization and segmentation.
- [ ] Test SoundTouch and browser fallback at the supported speed range; listen for artifacts and underruns.
- [ ] Reopen the app. Verify local sessions and saved vocabulary persist; reselect audio as required.
- [ ] Close the managed Edge app window. Verify the PowerShell listener exits.
- [ ] Test a port 18473 conflict and recovery.
- [ ] Verify the server is not reachable from another device on the local network.
- [ ] Verify the portable app works with network disconnected.

### Before a stable release

- [x] CC-CEDICT, Unihan and Jieba inputs have explicit SHA-256 pins; CC-CEDICT now uses an immutable dated snapshot on the verification branch.
- [ ] Choose and add a project-level license. Verify all third-party code and data terms.
- [ ] Design a separate release-signing process. Never commit, cache, or upload signing keys.
- [ ] Complete the physical Android and Windows checks above.
- [ ] Publish versioned release notes, support boundaries and SHA-256 checksums.

---

This checklist intentionally distinguishes automated build evidence from real-device behavior. A compiled APK is not proof of audio quality, file-picker reliability, WebView lifecycle, or long-session stability.
