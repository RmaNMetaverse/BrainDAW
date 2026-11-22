import { expect, test, vi } from 'vitest';
import { splitFrequencies } from '../../src/audio/BrainwaveEngine';
import { initialVoicing, midiToHz, neighboringNotes } from '../../src/audio/utils/musicTheory';
import { equalPowerCrossfade, smoothParam } from '../../src/audio/utils/smoothing';
import { ShuffleBag } from '../../src/audio/utils/shuffleBag';

test('binaural tones preserve the requested center and separation', () => {
  expect(splitFrequencies(144, 6)).toEqual([141, 147]);
  expect(splitFrequencies(110, 0.5)).toEqual([109.75, 110.25]);
});

test('gain smoothing holds the current value and crossfading preserves power', () => {
  const param = { cancelAndHoldAtTime: vi.fn(), setTargetAtTime: vi.fn() };
  smoothParam(param as unknown as AudioParam, 0.6, 10);
  expect(param.cancelAndHoldAtTime).toHaveBeenCalledWith(10);
  expect(param.setTargetAtTime).toHaveBeenCalledWith(0.6, 10, 0.04);
  expect(equalPowerCrossfade(0.5).reduce((sum, gain) => sum + gain * gain, 0)).toBeCloseTo(1);
});

test('tuning and neighboring voices remain in key without adjacent semitones', () => {
  expect(midiToHz(69, 432)).toBe(432);
  expect(midiToHz(57, 440)).toBe(220);
  const chord = initialVoicing(48, 'dorian');
  const candidates = neighboringNotes(48, 'dorian', chord, 2);
  expect(candidates.length).toBeGreaterThan(0);
  for (const note of candidates) expect(chord.filter((_, index) => index !== 2).every((other) => Math.abs(other - note) > 1)).toBe(true);
});

test('shuffle bag uses every sample and avoids immediate repeats across cycles', () => {
  const bag = new ShuffleBag(['a', 'b', 'c'], () => 0);
  const values = Array.from({ length: 6 }, () => bag.next());
  expect(new Set(values.slice(0, 3))).toEqual(new Set(['a', 'b', 'c']));
  expect(new Set(values.slice(3))).toEqual(new Set(['a', 'b', 'c']));
  expect(values[2]).not.toBe(values[3]);
});
