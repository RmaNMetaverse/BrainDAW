import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const app = 'com.rmanmetaverse.braindaw';
const apk = process.argv[2] ?? 'mobile/android/app/build/outputs/apk/debug/app-debug.apk';
const port = 57202;
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

adb('install', '-r', apk);
adb('shell', 'am', 'start', '-W', '-n', app + '/.MainActivity');
const pid = await waitFor(() => adb('shell', 'pidof', '-s', app), (value) => /^\d+$/.test(value), 'Android activity did not start.');
adb('forward', 'tcp:' + port, 'localabstract:webview_devtools_remote_' + pid);

let browser;
try {
  browser = await waitFor(
    () => chromium.connectOverCDP('http://127.0.0.1:' + port, { timeout: 2000 }),
    Boolean, 'WebView did not expose its test endpoint.');
  const page = await waitFor(() => browser.contexts().flatMap((context) => context.pages()).find((entry) => entry.url().startsWith('https://localhost')),
    Boolean, 'WebView did not open the studio.');
  await page.addInitScript(() => {
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
    return { time: window.testContext.currentTime, state: window.testContext.state, peak: Math.max(...values.map(Math.abs)) };
  });
  await waitFor(readAudio, (audio) => audio?.state === 'running' && audio.peak > 0.005, 'Android Web Audio was silent.');
  await waitFor(() => adb('shell', 'dumpsys', 'activity', 'services', app),
    (services) => services?.includes('StudioPlaybackService') && services.includes('isForeground=true'), 'Media playback was not foregrounded.');
  adb('shell', 'input', 'keyevent', 'KEYCODE_SLEEP');
  const before = await readAudio();
  await waitFor(readAudio, (audio) => audio?.time > before.time + 1.2 && audio.peak > 0.002, 'Audio stopped after the display turned off.');
  adb('shell', 'cmd', 'media_session', 'dispatch', 'pause');
  await waitFor(readAudio, (audio) => audio?.state === 'suspended', 'The media session did not pause the studio.');
  console.log('Android playback, foreground service, display-off audio, and media pause passed on the emulator.');
} finally {
  adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  adb('forward', '--remove', 'tcp:' + port);
  await browser?.close();
}
