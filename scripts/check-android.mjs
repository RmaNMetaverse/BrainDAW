import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { _android as android } from 'playwright';

const app = 'com.rmanmetaverse.braindaw';
const competingApp = 'com.rmanmetaverse.audiofixture';
const apk = process.argv[2] ?? 'mobile/android/app/build/outputs/apk/debug/app-debug.apk';
const competingApk = process.argv[3];
function adb(...args) {
  return execFileSync('adb', args, { encoding: 'utf8', timeout: 30_000 }).trim();
}

async function waitFor(read, predicate, message, timeout = 15_000) {
  const until = Date.now() + timeout;
  let value;
  do {
    try { value = await read(); } catch { value = undefined; }
    if (predicate(value)) return value;
    await delay(300);
  } while (Date.now() < until);
  throw new Error(message + ' Last value: ' + JSON.stringify(value));
}

const [device] = await android.devices();
if (!device) throw new Error('No device is connected to ADB.');
try {
  if (competingApk) adb('install', '-r', competingApk);
  adb('install', '-r', apk);
  console.log(adb('shell', 'am', 'start', '-W', '-n', app + '/.MainActivity'));
  const webview = await device.webView({ pkg: app }, { timeout: 45_000 });
  const page = await webview.page();
  console.log('WebView opened at ' + page.url());
  await page.addInitScript(() => {
    window.testWindowBlurs = 0;
    window.addEventListener('braindawwindowblur', () => { window.testWindowBlurs++; });
    const createAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function () {
      const analyser = createAnalyser.call(this);
      Object.assign(window, { testAnalyser: analyser, testContext: this });
      return analyser;
    };
  });
  await page.reload();
  await page.getByRole('heading', { name: 'BrainDAW' }).waitFor();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
  const readAudio = () => page.evaluate(() => {
    if (!window.testAnalyser) return null;
    const values = new Float32Array(window.testAnalyser.fftSize);
    window.testAnalyser.getFloatTimeDomainData(values);
    return { time: window.testContext.currentTime, state: window.testContext.state, baseLatency: window.testContext.baseLatency,
      underrunSeconds: window.testContext.playbackStats?.underrunDuration, blurs: window.testWindowBlurs,
      peak: Math.max(...values.map(Math.abs)) };
  });
  await waitFor(readAudio, (audio) => audio?.state === 'running' && audio.peak > 0.005, 'Android Web Audio was silent.');
  await waitFor(() => adb('shell', 'dumpsys', 'activity', 'services', app),
    (services) => services?.includes('StudioPlaybackService') && services.includes('isForeground=true'), 'Media playback was not foregrounded.');
  await page.getByRole('combobox', { name: 'Session preset' }).selectOption('four-seasons-still');
  await page.getByRole('button', { name: 'Nature', exact: true }).click();
  await page.getByText('Four-corner mix active', { exact: true }).waitFor();
  await waitFor(readAudio, (audio) => audio?.peak > 0.002, 'The four-corner Nature mix was silent.');
  const beforeShade = await readAudio();
  for (let pass = 0; pass < 2; pass++) {
    adb('shell', 'cmd', 'statusbar', 'expand-notifications');
    await waitFor(readAudio, (audio) => audio?.blurs > beforeShade.blurs + pass && audio.state === 'running' && audio.peak > 0.002,
      'The app did not lose window focus and keep audio playing under the notification shade.');
    const opened = await readAudio();
    await waitFor(readAudio, (audio) => audio?.time > opened.time + 0.8 && audio.state === 'running' && audio.peak > 0.002,
      'Audio stopped while the notification shade was open.');
    adb('shell', 'cmd', 'statusbar', 'collapse');
    await delay(450);
  }
  const afterShade = await readAudio();
  console.log(`Notification shade playback passed. Audio buffer: ${Math.round(afterShade.baseLatency * 1000)} ms.`);
  if (afterShade.underrunSeconds !== undefined && beforeShade.underrunSeconds !== undefined) {
    console.log(`WebView-reported underrun time during shade checks: ${Math.round((afterShade.underrunSeconds - beforeShade.underrunSeconds) * 1000)} ms.`);
  }
  if (competingApk) {
    adb('shell', 'am', 'start', '-W', '-n', competingApp + '/.PlaybackActivity');
    await waitFor(() => adb('logcat', '-d', '-s', 'BrainDAWFixture:I'),
      (logs) => logs?.includes('Media tone started with audio focus'), 'The competing app did not play with focus.');
    const before = await readAudio();
    for (let sample = 0; sample < 6; sample++) {
      await delay(500);
      const audio = await readAudio();
      if (audio?.state !== 'running' || audio.peak < 0.002) {
        throw new Error('BrainDAW stopped while the other app held focus: ' + JSON.stringify(audio));
      }
      if (sample === 5 && audio.time < before.time + 2.5) throw new Error('BrainDAW fell behind during concurrent playback.');
    }
    adb('shell', 'am', 'force-stop', competingApp);
    adb('shell', 'am', 'start', '-W', '-n', app + '/.MainActivity');
    console.log('A separate app played a media tone with Android audio focus while BrainDAW kept playing in the background.');
  }
  adb('shell', 'input', 'keyevent', 'KEYCODE_SLEEP');
  const before = await readAudio();
  await waitFor(readAudio, (audio) => audio?.time > before.time + 1.2 && audio.peak > 0.002, 'Audio stopped after the display turned off.');
  adb('shell', 'cmd', 'media_session', 'dispatch', 'pause');
  await waitFor(readAudio, (audio) => audio?.state === 'suspended', 'The media session did not pause the studio.');
  console.log('Android playback, foreground service, display-off audio, and media pause passed on the emulator.');
} catch (error) {
  console.error(adb('logcat', '-d', '-t', '1000', '-s', 'AndroidRuntime', 'Capacitor', 'Capacitor/Console', 'chromium'));
  throw error;
} finally {
  adb('shell', 'cmd', 'statusbar', 'collapse');
  if (competingApk) adb('shell', 'am', 'force-stop', competingApp);
  adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  await device.close();
}
