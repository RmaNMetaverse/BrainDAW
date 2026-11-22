import { database } from './database';
import { useAudioStore } from './useAudioStore';
import type { BrainwaveParams, NatureParams, NeuroScapePreset, SessionStage, SynthPadParams } from '../types/audio';

type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value && typeof value === 'object' && !Array.isArray(value) ? value as Obj : {};
const number = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const string = (value: unknown, limit: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
const choice = (value: unknown, values: readonly string[]) => typeof value === 'string' && values.includes(value);
const levels = (value: Obj, keys: string[]) => keys.every((key) => number(value[key], 0, 1));

export function parsePreset(value: unknown): NeuroScapePreset {
  const data = object(value);
  const brain = object(data.brainwave), nature = object(data.nature), pad = object(data.synthPad);
  const valid = string(data.id, 100) && string(data.name, 80) && typeof data.createdAt === 'string' && Number.isFinite(Date.parse(data.createdAt)) &&
    (data.description === undefined || string(data.description, 1000)) &&
    (data.category === undefined || choice(data.category, ['sleep', 'meditation', 'focus', 'lucid', 'custom'])) &&
    number(data.masterVolume, 0, 1) && (data.sleepTimerMin === null || number(data.sleepTimerMin, 1 / 60, 480)) &&
    number(data.fadeOutSec, 1, 120) && [brain, nature, pad].every((channel) => typeof channel.enabled === 'boolean' && number(channel.volume, 0, 1)) &&
    choice(brain.preset, ['delta', 'theta', 'alpha', 'smr', 'beta', 'gamma', 'custom']) &&
    choice(brain.mode, ['binaural', 'isochronic', 'monaural', 'hybrid']) && number(brain.carrierHz, 60, 500) && number(brain.beatHz, 0.5, 45) &&
    levels(brain, ['isochronicDepth', 'rhythmModDepth', 'frequencyDriftDepth']) &&
    number(brain.rhythmModHz, 0, 0.5) && number(brain.warmthFilterHz, 300, 4000) &&
    typeof nature.biome === 'string' && /^[a-z0-9_-]{1,64}$/.test(nature.biome) &&
    levels(nature, ['rainIntensity', 'thunderProbability', 'thunderDistance', 'windGustiness', 'wildlifeDensity', 'insectBed', 'waterFlow', 'stereoWidth', 'reverbSpace', 'surrealDepth']) &&
    number(pad.rootNote, 24, 72) && Number.isInteger(pad.rootNote) && (pad.tuningHz === 432 || pad.tuningHz === 440) &&
    choice(pad.scale, ['lydian', 'dorian', 'minor_pentatonic', 'sus2_drone', 'aeolian']) &&
    choice(pad.waveform, ['sine', 'triangle', 'warm_saw', 'glass_pad']) &&
    number(pad.detuneCents, 0, 25) && number(pad.filterCutoffHz, 200, 6000) && number(pad.filterLfoRateHz, 0.01, 0.3) &&
    levels(pad, ['filterLfoDepth', 'evolutionSpeed', 'shimmerAmount']) && number(pad.reverbDecaySec, 2, 16);
  if (!valid) throw new Error('This file does not contain a valid BrainDAW preset.');

  let timeline: SessionStage[] | undefined;
  if (data.timeline !== undefined) {
    if (!Array.isArray(data.timeline) || data.timeline.length > 32) throw new Error('Invalid session timeline.');
    const ids = new Set<string>();
    timeline = data.timeline.map((value: unknown) => {
      const stage = object(value);
      if (!string(stage.id, 100) || !string(stage.label, 48) || !number(stage.durationSec, 1, 28800) ||
          !number(stage.targetBeatHz, 0.5, 45) || !number(stage.targetCarrierHz, 60, 500) || ids.has(stage.id as string)) {
        throw new Error('Invalid session timeline stage.');
      }
      ids.add(stage.id as string);
      return stage as unknown as SessionStage;
    });
  }

  return {
    id: data.id as string, name: data.name as string, createdAt: data.createdAt as string,
    category: data.category as NeuroScapePreset['category'], description: data.description as string | undefined,
    masterVolume: data.masterVolume as number, sleepTimerMin: data.sleepTimerMin as number | null, fadeOutSec: data.fadeOutSec as number,
    brainwave: brain as unknown as BrainwaveParams, nature: nature as unknown as NatureParams,
    synthPad: pad as unknown as SynthPadParams, timeline,
  };
}

export function snapshotPreset(name?: string): NeuroScapePreset {
  const state = useAudioStore.getState();
  return {
    id: name ? 'preset-' + crypto.randomUUID() : state.activePresetId,
    name: name ?? state.activePresetName, category: name ? 'custom' : undefined,
    createdAt: new Date().toISOString(),
    masterVolume: state.masterVolume, sleepTimerMin: state.sleepTimerMin, fadeOutSec: state.fadeOutSec,
    brainwave: state.brainwave, nature: state.nature, synthPad: state.synthPad, timeline: state.timeline,
  };
}

export async function savePreset(preset: NeuroScapePreset) { await (await database()).put('presets', preset); }
export async function deletePreset(id: string) { await (await database()).delete('presets', id); }
export async function listPresets() {
  const items = await (await database()).getAll('presets');
  return items.sort((first, second) => first.name.localeCompare(second.name));
}

export async function restoreStudio() {
  const db = await database();
  const last = await db.get('settings', 'last');
  if (last && !useAudioStore.getState().isPlaying) {
    try {
      useAudioStore.getState().loadPreset(parsePreset(last));
    } catch {
      // Keep the factory defaults if the previous session cannot be read.
    }
  }
  let save: ReturnType<typeof setTimeout>;
  const select = (state: ReturnType<typeof useAudioStore.getState>) =>
    [state.activePresetId, state.brainwave, state.nature, state.synthPad, state.masterVolume, state.sleepTimerMin, state.fadeOutSec, state.timeline];
  useAudioStore.subscribe(select, () => {
    clearTimeout(save);
    save = setTimeout(() => { void db.put('settings', snapshotPreset(), 'last').catch(() => undefined); }, 260);
  }, { equalityFn: (previous, current) => previous.every((item, index) => item === current[index]) });

  window.addEventListener('pagehide', () => {
    clearTimeout(save);
    void db.put('settings', snapshotPreset(), 'last').catch(() => undefined);
  });
}
