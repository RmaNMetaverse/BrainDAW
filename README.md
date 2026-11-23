# BrainDAW

BrainDAW is a single-window sound studio that combines brainwave tones, field-recorded nature, and generative synth pads. The same interface ships as an offline web app, a Tauri desktop app, and a Capacitor mobile app.

| Platform | Distribution |
| --- | --- |
| Web and PWA | [Open BrainDAW](https://rmanmetaverse.github.io/BrainDAW/) or download the web ZIP from [GitHub Releases](https://github.com/RmaNMetaverse/BrainDAW/releases). |
| Windows | EXE and MSI installers in the desktop release. |
| macOS | Universal DMG in the desktop release. |
| Android | Signed APK for direct installation and an unsigned App Bundle for Google Play in the Android release. |
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

### Android APK updates

Use `BrainDAW-Android.apk` from the Android release. Starting with Android v0.2.3, GitHub APKs share a signing certificate and install over earlier APKs from this release line. GitHub Actions installs the previous signed APK and tests the update before publication.

Earlier `BrainDAW-Android-debug.apk` downloads used different signing keys. Before removing one, load each saved mix and use **Presets → Export current**. Use **Nature → Export biome** for any custom biomes. Save the files outside the app, then uninstall the old preview, install the signed APK, and import your files. If a restored preset uses a custom biome, reselect the imported biome and save the mix again.

For each Android release, increment `versionCode` and set `versionName` in `mobile/android/app/build.gradle` before tagging `android-v<versionName>`. Preserve the PKCS12 keystore with alias `braindaw-github` and a secure password backup. The workflow uses `ANDROID_RELEASE_KEYSTORE` (base64-encoded keystore) and `ANDROID_RELEASE_PASSWORD` (keystore password) from GitHub Actions secrets and checks the resulting APK against the pinned public certificate digest. If Google Play and GitHub should update each other's installs, configure Play App Signing to use the same app signing key. The Play upload key is separate.

Physical mobile devices are needed to verify their lock-screen behavior across OS updates, interruptions, and battery-saving settings.
