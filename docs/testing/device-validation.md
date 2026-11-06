# Device validation checklist

Runtime checks for the current development preview. This is not a Google Play or stable-release sign-off.

### Automated checks

- [x] Offline regression suite passed on verified main commit `bdaf16ebc9e7009075278855d5771e23c39c74da` (JDK 17 and Node.js 22; [Actions run #27](https://github.com/konets000/NOCTURNE_01/actions/runs/42268645467)).
- [x] A read-only CI workflow and weekly Dependabot configuration are present in `main`.
- [x] Source review confirms that the Windows launcher binds to loopback and uses an explicit route allowlist. Runtime checks are still pending.
- [x] Android manifest does not request Internet permission.
- [x] GitHub Actions run #27 completed successfully on `main` for the verified commit (Android APK + Windows ZIP packaging).
- [ ] The APK has been installed and exercised on a physical Android device.
- [ ] The portable package has been exercised on a real Windows PC.

### Android

- [ ] Install a CI APK and launch the app.
- [ ] Import `samples/bilingual-filter-demo.srt`. Verify that non-Chinese-only cues are filtered and timestamps remain correct.
- [ ] Import matching local audio. Verify playback, seek, speed, subtitle-cue loop, and active-cue highlighting.
- [ ] Tap simplified and traditional words. Verify pinyin and dictionary senses.
- [ ] Reopen a saved session. Verify that subtitles restore, and reselect audio when prompted.
- [ ] Confirm that playback pauses when the app enters the background.
- [ ] Try rotation, the file picker, and the Back button.
- [ ] In a dedicated debug test, terminate the WebView renderer and verify NOCTURNE creates a fresh reader view; reopen the last saved session.

### Windows

- [ ] Extract the portable ZIP and run `start-nocturne.bat`.
- [ ] Verify that the app opens in Edge and the launcher console stays available.
- [ ] Import the same synthetic SRT and matching audio. Check synchronization and word lookup.
- [ ] Reopen the app. Verify that subtitles persist and audio can be reselected.
- [ ] Close the app window. Verify that the server process exits.
- [ ] Verify that the server cannot be reached from another device on the local network.

### Before a stable release

- [x] Pin all dictionary inputs with reviewed SHA-256 values; Jieba is commit-pinned.
- [ ] Choose and add a project-level license. Verify third-party data terms and notices.
- [ ] Design a separate release-signing process. Never commit, cache, or upload signing keys.
- [ ] Verify the release build on supported Android and Windows versions.
- [ ] Publish clear, versioned release notes and checksums for official artifacts.

---
