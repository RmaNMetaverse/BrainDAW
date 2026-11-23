import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const app = 'com.rmanmetaverse.braindaw';
const [previousApk, updatedApk] = process.argv.slice(2);
assert(previousApk && updatedApk, 'Pass the previous and updated APK paths.');

function adb(...args) {
  return execFileSync('adb', args, { encoding: 'utf8', timeout: 60_000 }).trim();
}

function installedPackage() {
  const details = adb('shell', 'dumpsys', 'package', app);
  const versionCode = Number(details.match(/\bversionCode=(\d+)/)?.[1]);
  const firstInstallTime = details.match(/\bfirstInstallTime=([^\r\n]+)/)?.[1]?.trim();
  assert(versionCode > 0 && firstInstallTime, 'Could not read the installed Android package state.');
  return { versionCode, firstInstallTime };
}

assert.match(adb('install', previousApk), /\bSuccess$/);
const previous = installedPackage();
assert.match(adb('install', '-r', updatedApk), /\bSuccess$/);
const updated = installedPackage();
assert(updated.versionCode > previous.versionCode, 'An update must increase the Android version code.');
assert.equal(updated.firstInstallTime, previous.firstInstallTime, 'The original installation must survive the update.');
assert.match(adb('shell', 'am', 'start', '-W', '-n', `${app}/.MainActivity`), /^Status: ok$/m);
console.log(`Android package updated in place from version code ${previous.versionCode} to ${updated.versionCode} and launched.`);

// Only the disposable CI emulator needs this removal before the separate debug playback test.
assert.equal(adb('uninstall', app), 'Success');
