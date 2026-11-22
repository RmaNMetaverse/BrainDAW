# BrainDAW

BrainDAW is a single-window sound studio that combines brainwave tones, field-recorded nature, and generative synth pads. The same interface ships as an offline web app, a Tauri desktop app, and a Capacitor mobile app.

| Platform | Distribution |
| --- | --- |
| Web and PWA | [Open BrainDAW](https://rmanmetaverse.github.io/BrainDAW/) or download the web ZIP from [GitHub Releases](https://github.com/RmaNMetaverse/BrainDAW/releases). |
| Windows | EXE and MSI installers in the desktop release. |
| macOS | Universal DMG in the desktop release. |
| Android | APK for testing and an unsigned App Bundle in the Android preview. |
| iOS | Simulator app in the iOS preview. Device and TestFlight builds require Apple signing and provisioning. |

## Use the studio

Select a session preset and press Play. Use stereo headphones for binaural playback. Each channel has a level and an independent on/off switch. The master transport controls volume and the sleep timer. Space toggles playback, M toggles master mute, and 1–3 toggle the three channels.

Use the preset library to save, load, and move mixes as JSON. Use the timeline to set timed carrier and beat ramps. Nature accepts individual audio files, a manifest with its recordings, or a previously exported biome ZIP. Presets and imported recordings are stored on the current device. The PWA caches its built-in recordings and worklets for offline use.

See the [field recording credits](public/biomes/credits.md) and the three engineering specifications in the repository root.

## Build and verify

Use Node.js 22 or later. The web app requires a browser with AudioWorklet support and HTTPS or localhost.

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

- **Desktop** — Install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) and run `npm run tauri -- dev` or `npm run tauri -- build` on the target desktop OS. GitHub installers are unsigned on Windows and ad-hoc signed on macOS.
- **Android** — Install JDK 21 and Android SDK 36. Run `npm run mobile:sync -- android` and open `mobile/android` in Android Studio. To verify a debug APK on a running emulator, run `node scripts/check-android.mjs` with one device attached to ADB.
- **iOS** — Use Xcode 26 or newer. Run `npm run mobile:sync -- ios` and open `mobile/ios/App/App.xcodeproj`. Build the App scheme for a simulator, or select your Apple development team and provisioning for a device running iOS 16.4 or newer.

The [Actions workflows](https://github.com/RmaNMetaverse/BrainDAW/actions) validate the web app, deploy Pages from `main`, and build platform artifacts from `web-v*`, `desktop-v*`, `android-v*`, and `ios-v*` tags. The release jobs publish after the corresponding build and automated checks succeed.

Physical mobile devices are needed to verify their lock-screen behavior across OS updates, interruptions, and battery-saving settings.
