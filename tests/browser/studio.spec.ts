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
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { testAudioContext?: AudioContext }).testAudioContext?.state)).toBe('suspended');
  expect(errors).toEqual([]);
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
