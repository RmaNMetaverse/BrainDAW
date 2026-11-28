import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { BrainwaveParams, BrainwavePresetId, NatureParams, NatureSoundParams, NeuroScapePreset, SessionStage, SynthPadParams } from '../types/audio';
import { readNatureBlend, type NatureCornerIndex } from '../audio/natureBlend';
import { brainwaveBands, factoryPresets } from './factoryPresets';

export type Channel = 'brainwave' | 'nature' | 'synthPad';
type StudioState = Pick<NeuroScapePreset, 'masterVolume' | 'sleepTimerMin' | 'fadeOutSec' | Channel> & {
  isPlaying: boolean;
  isMuted: boolean;
  busy: boolean;
  error: string | null;
  activePresetId: string;
  activePresetName: string;
  activePresetDescription?: NeuroScapePreset['description'];
  activePresetCategory?: NeuroScapePreset['category'];
  sleepTimerRemainingSec: number | null;
  activeMobileTab: Channel;
  biomeLoadingState: string;
  usingProceduralFallback: boolean;
  timeline: SessionStage[];
  sessionElapsedSec: number;
  actualBeatHz: number;
  setMasterVolume: (value: number) => void;
  toggleMute: () => void;
  setSleepTimer: (minutes: number | null) => void;
  setBrainwaveParam: <K extends keyof BrainwaveParams>(key: K, value: BrainwaveParams[K]) => void;
  applyBrainwavePreset: (preset: Exclude<BrainwavePresetId, 'custom'>) => void;
  setNatureParam: <K extends keyof NatureParams>(key: K, value: NatureParams[K]) => void;
  setNatureBlendPosition: (x: number, y: number) => void;
  setNatureCorner: (index: NatureCornerIndex, settings: Partial<NatureSoundParams>) => void;
  setBiome: (biome: string) => void;
  setSynthPadParam: <K extends keyof SynthPadParams>(key: K, value: SynthPadParams[K]) => void;
  loadPreset: (preset: NeuroScapePreset) => void;
};

function presetState(preset: NeuroScapePreset) {
  return {
    activePresetId: preset.id, activePresetName: preset.name, masterVolume: preset.masterVolume,
    activePresetDescription: preset.description, activePresetCategory: preset.category,
    sleepTimerMin: preset.sleepTimerMin, sleepTimerRemainingSec: preset.sleepTimerMin === null ? null : preset.sleepTimerMin * 60,
    fadeOutSec: preset.fadeOutSec, brainwave: preset.brainwave, nature: preset.nature, synthPad: preset.synthPad,
    timeline: preset.timeline ?? [], sessionElapsedSec: 0, actualBeatHz: preset.brainwave.beatHz,
  };
}

export const useAudioStore = create<StudioState>()(subscribeWithSelector((set) => ({
  ...presetState(factoryPresets[0]),
  isPlaying: false, isMuted: false, busy: false, error: null, activeMobileTab: 'brainwave',
  biomeLoadingState: '', usingProceduralFallback: true,
  setMasterVolume: (masterVolume) => set({ masterVolume }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setSleepTimer: (sleepTimerMin) => set({ sleepTimerMin, sleepTimerRemainingSec: sleepTimerMin === null ? null : sleepTimerMin * 60 }),
  setBrainwaveParam: (key, value) => set((state) => ({
    brainwave: { ...state.brainwave, [key]: value, preset: key === 'beatHz' || key === 'carrierHz' ? 'custom' : state.brainwave.preset },
  })),
  applyBrainwavePreset: (preset) => set((state) => {
    const { beatHz, carrierHz } = brainwaveBands[preset];
    return { brainwave: { ...state.brainwave, preset, beatHz, carrierHz } };
  }),
  setNatureParam: (key, value) => set((state) => ({ nature: { ...state.nature, [key]: value } })),
  setNatureBlendPosition: (x, y) => set((state) => ({ nature: { ...state.nature,
    blend: { ...readNatureBlend(state.nature), x, y } } })),
  setNatureCorner: (index, settings) => set((state) => {
    const blend = readNatureBlend(state.nature);
    const corners: typeof blend.corners = [...blend.corners];
    corners[index] = { ...corners[index], ...settings };
    return { nature: { ...state.nature, blend: { ...blend, corners } } };
  }),
  setBiome: (biome) => set((state) => ({ nature: { ...state.nature, biome } })),
  setSynthPadParam: (key, value) => set((state) => ({ synthPad: { ...state.synthPad, [key]: value } })),
  loadPreset: (preset) => set(presetState(preset)),
})));
