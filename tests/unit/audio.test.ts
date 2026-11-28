import { expect, test, vi } from 'vitest';
import { splitFrequencies } from '../../src/audio/BrainwaveEngine';
import { sealLoop } from '../../src/audio/SeamlessLooper';
import { natureCornerPositions, natureWeights, readNatureBlend } from '../../src/audio/natureBlend';
import { factoryPresets } from '../../src/store/factoryPresets';
import { parsePreset } from '../../src/store/presets';
import { initialVoicing, midiToHz, neighboringNotes } from '../../src/audio/utils/musicTheory';
import { equalPowerCrossfade, smoothParam } from '../../src/audio/utils/smoothing';
import { ShuffleBag } from '../../src/audio/utils/shuffleBag';

test('every factory preset has a unique ID and survives preset JSON validation', () => {
  expect(new Set(factoryPresets.map((preset) => preset.id)).size).toBe(factoryPresets.length);
  for (const preset of factoryPresets) {
    expect(parsePreset(JSON.parse(JSON.stringify(preset)))).toEqual(preset);
  }
});

test('nature pad has isolated corners, equal center weights and a constant mix share', () => {
  expect(natureWeights(0.5, 0.5)).toEqual([0.25, 0.25, 0.25, 0.25]);
  for (const [index, { x, y }] of natureCornerPositions.entries()) {
    expect(natureWeights(x, y)).toEqual([0, 1, 2, 3].map((i) => Number(i === index)));
  }
  expect(natureWeights(0.27, 0.81).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1);
});

test('legacy nature picks retain their sound and blend imports validate all four corners', () => {
  const legacy = factoryPresets.find(({ id }) => id === 'delta-midnight-storm')!;
  const blend = readNatureBlend(legacy.nature);
  expect([blend.x, blend.y]).toEqual([1, 1]);
  expect(blend.corners[1].rainIntensity).toBe(legacy.nature.rainIntensity);
  const preset = factoryPresets.find(({ id }) => id === 'four-seasons-still')!;
  const malformed = structuredClone(preset);
  malformed.nature.blend!.corners[0].fireWarmth = 3;
  expect(() => parsePreset(malformed)).toThrow(/valid BrainDAW preset/);
  for (const pure of factoryPresets.filter(({ category }) => category === 'pure')) {
    expect(pure.brainwave.enabled && !pure.nature.enabled && !pure.synthPad.enabled).toBe(true);
  }
});

test('binaural tones preserve the requested center and separation', () => {
  expect(splitFrequencies(144, 6)).toEqual([141, 147]);
  expect(splitFrequencies(110, 0.5)).toEqual([109.75, 110.25]);
});

test('the native field loop crossfades into the next head sample without a gap', () => {
  const left = Float32Array.from({ length: 16 }, (_, index) => (index + 1) / 20);
  const right = left.map((value) => -value);
  const buffer = { length: 16, sampleRate: 8, numberOfChannels: 2,
    getChannelData: (channel: number) => [left, right][channel] } as AudioBuffer;
  expect(sealLoop(buffer)).toBe(0.5);
  expect(left[12]).toBeCloseTo(13 / 20);
  expect(left[14]).toBeCloseTo(15 / 20 * Math.cos(Math.PI / 3) + 3 / 20 * Math.sin(Math.PI / 3));
  expect(left[15]).toBeCloseTo(4 / 20);
  expect(right[15]).toBeCloseTo(-4 / 20);
  expect(left[4] - left[15]).toBeCloseTo(left[5] - left[4]);
  const sealed = left.slice();
  expect(sealLoop(buffer)).toBe(0.5);
  expect(left).toEqual(sealed);
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
