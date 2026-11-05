# Third-party notices

## SoundTouchJS AudioWorklet 2.1.1

NOCTURNE bundles the unmodified prebuilt processor from the npm package `@soundtouchjs/audio-worklet@2.1.1`.

- Copyright: Steve 'Cutter' Blades and the contributors identified by the upstream project.
- Licence: Mozilla Public License 2.0 (MPL-2.0).
- Package: https://www.npmjs.com/package/@soundtouchjs/audio-worklet/v/2.1.1
- Source repository: https://github.com/cutterbl/SoundTouchJS/tree/d9e39a7ddcf74c7a145bbba45856f30068c82b79/packages/audio-worklet
- Pinned npm archive SHA-256: `360c233284a44c30f6a7a20578e48f2011c988c86b737d422bc73da37bf8a24b`.

The build extracts `.dist/soundtouch-processor.js` and the package's original `LICENSE` file from that archive. The licence is bundled into the Android app assets and the portable Windows package as `SOUNDTOUCH-LICENSE.txt`. NOCTURNE does not modify the upstream processor code.

The processor runs locally via Web Audio AudioWorklet. It is not downloaded or updated at runtime. Review the licence file shipped with each build for the complete MPL-2.0 text.
