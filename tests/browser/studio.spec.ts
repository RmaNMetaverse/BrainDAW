import { expect, test } from '@playwright/test';

test('first click starts live audio across the three-channel console', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function () {
      const analyser = original.call(this);
      Object.assign(window, { testAnalyser: analyser, testAudioContext: this });
      return analyser;
    };
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'BrainDAW' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const analyser = (window as Window & { testAnalyser?: AnalyserNode }).testAnalyser;
    if (!analyser) return 0;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    return Math.max(...samples.map(Math.abs));
  })).toBeGreaterThan(0.008);
  await expect(page.getByText('Field recordings active')).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { testAudioContext?: AudioContext }).testAudioContext?.state)).toBe('suspended');
  expect(errors).toEqual([]);
});

test('an unavailable biome leaves the procedural engine running', async ({ page }) => {
  await page.route('**/biomes/**', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByText('Procedural soundscape')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

test('a custom mix and timeline survive an IndexedDB round trip', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('slider', { name: 'Master', exact: true }).press('Home');
  await expect(page.getByRole('slider', { name: 'Master', exact: true })).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('button', { name: 'Session timeline' }).click();
  await page.getByRole('button', { name: 'Add stage' }).click();
  await page.getByLabel('Target beat (Hz)').fill('4.25');
  await page.getByRole('button', { name: 'Apply timeline' }).click();
  await page.getByRole('button', { name: 'Preset library' }).click();
  await page.getByLabel('Preset name').fill('Test Mix');
  await page.getByRole('button', { name: 'Save current mix' }).click();
  await expect(page.getByText('Saved Test Mix.')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export current' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Test-Mix.json');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Session preset' })).toContainText('Test Mix');
  await page.getByRole('combobox', { name: 'Session preset' }).selectOption({ label: 'Test Mix' });
  await expect(page.getByRole('slider', { name: 'Master', exact: true })).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('button', { name: 'Session timeline' }).click();
  await expect(page.getByLabel('Target beat (Hz)')).toHaveValue('4.25');
});

test('the installed web app starts field audio with the network disconnected', async ({ page, context }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 20_000 }).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(page.getByText('Field recordings active')).toBeVisible();
});

test('searchable factory sessions apply their sound settings and preserve metadata in exports', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Preset library' }).click();
  const library = page.getByRole('dialog', { name: 'Preset library' });
  await library.getByLabel('Category').selectOption('psychedelic');
  await library.getByRole('searchbox', { name: 'Search presets' }).fill('magic mushroom');
  await expect(library.getByRole('button', { name: /Warm Drift/ })).toHaveCount(0);
  await library.getByRole('button', { name: /Psilocybin.*Bloom/ }).click();
  await expect(page.getByLabel('Session preset')).toHaveValue('psilocybin-bloom');
  await expect(page.getByLabel('Entrainment mode')).toHaveValue('hybrid');
  await expect(page.getByRole('button', { name: 'Session timeline 3 stages' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preset library' }).click();
  const download = page.waitForEvent('download');
  await library.getByRole('button', { name: 'Export current' }).click();
  const stream = await (await download).createReadStream();
  const chunks = await stream.toArray();
  const preset = JSON.parse(Buffer.concat(chunks).toString());
  expect(preset.category).toBe('psychedelic');
  expect(preset.description).toContain('rainforest');
  expect(preset.timeline).toHaveLength(3);
});

test('mobile can switch between channels while transport and mixer remain available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Brainwave channel' })).toBeVisible();
  await page.getByRole('button', { name: 'Nature', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Nature channel' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Brainwave channel' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});
