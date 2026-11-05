# NOCTURNE for Windows

This directory contains the source for NOCTURNE's portable Windows launcher. The packaged edition runs the same HTML/JavaScript reader as Android; it does not contain a separate learning engine.

## Run the packaged edition

1. Download the NOCTURNE-CI-... artifact from the latest successful **CI — test and build** workflow.
2. Extract NOCTURNE-Windows-Portable-<version>.zip into a writable folder.
3. Double-click start-nocturne.bat.
4. Keep the console window open while using the app.
5. Import an SRT subtitle file, then select its matching local audio.
6. Close the managed NOCTURNE Edge window when finished. The launcher then shuts down its local server.

Microsoft Edge is required. The packaged edition does not require Python, Node.js, Java or Android Studio.

## What the Windows edition supports

- The shared subtitle reader and synchronized cue highlighting.
- Local audio playback, seeking, sentence looping and playback-speed controls.
- Chinese offline dictionary lookup and segmentation.
- Japanese subtitle preservation and browser word-boundary segmentation; a complete Japanese dictionary is not bundled.
- Local browser storage for sessions and saved vocabulary.

Neural TTS, AI-generated voices, web URL extraction and website-to-audio conversion are not implemented.

## Local data and network behavior

- The PowerShell host binds to 127.0.0.1:18473; it is not intended to be reachable from another device on your network.
- The launcher serves a fixed allowlist of local application files.
- The Edge profile and browser-local session data are stored under %LOCALAPPDATA%\NOCTURNE\BrowserProfile.
- No NOCTURNE account or cloud sync service is used. Imported subtitles and audio are intended to remain on this computer.
- This runtime design does not make source builds network-independent. Build-time dependencies and pinned assets may need to be downloaded before packaging.

These are implementation-level design claims, not an independent security audit.

## Troubleshooting

### The app says the port is already in use

The launcher uses a fixed port, 18473, to keep the local browser origin stable. Close an earlier NOCTURNE window and its console before starting another copy. If another program owns the port, close that program or resolve the conflict before retrying.

### Microsoft Edge does not open

Verify that Microsoft Edge is installed and that Windows can launch it normally. The launcher expects Edge to provide the dedicated application window.

### Sessions do not appear on another computer

Sessions are stored locally in the Edge profile; they are not cloud-synchronized. Copying the ZIP to another machine does not copy the profile or session data.

### Audio is missing after reopening a session

The saved subtitle session does not persist the operating-system audio file handle. Re-select the matching audio file after reopening the session.

## Build the Windows package from source

Build the dictionary and audio assets first. From the repository root, run:

~~~sh
gradle --no-daemon :app:assembleDebug
sh tools/package-windows-portable.sh \
  app/build/generated/nocturne/assets/dictionary \
  build/dist \
  app/build/generated/nocturne/audio-assets
~~~

The versioned ZIP is created under build/dist/. The packager assembles the shared `app.js` bundle from `app/src/reader/` automatically. Node.js 22 is required for packaging; it is not required to run the resulting Windows ZIP. The packager can be invoked from Linux with bash/sh; a packaged Windows runtime still needs Windows and Microsoft Edge.

For the full architecture, test commands and limitations, see the [root README](../README.md) and [product/technical overview](../docs/architecture/overview.md).
