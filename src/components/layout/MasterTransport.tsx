import { AudioLines, BookOpen, Pause, Play, Settings2, Timer, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { audioEngine } from '../../audio/AudioEngineManager';
import { factoryPresetGroups, factoryPresets, presetCategories } from '../../store/factoryPresets';
import { listPresets } from '../../store/presets';
import { useAudioStore } from '../../store/useAudioStore';
import type { NeuroScapePreset } from '../../types/audio';
import { Fader } from '../controls/Fader';
import { VisualizerCanvas } from '../controls/VisualizerCanvas';
import { Modal } from '../modals/Modal';
import { PresetManagerModal } from '../modals/PresetManagerModal';
import { PlaybackSettingsModal } from '../modals/PlaybackSettingsModal';
import { detectPlatform } from '../../platform/platformBridge';

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(Math.floor(seconds % 60)).padStart(2, '0');
  return minutes >= 60 ? Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0') + ':' + remainder : minutes + ':' + remainder;
}

export function MasterTransport() {
  const state = useAudioStore(useShallow((s) => ({
    isPlaying: s.isPlaying, busy: s.busy, isMuted: s.isMuted, activePresetId: s.activePresetId,
    activePresetName: s.activePresetName, sleepTimerMin: s.sleepTimerMin, sleepTimerRemainingSec: s.sleepTimerRemainingSec,
    fadeOutSec: s.fadeOutSec, masterVolume: s.masterVolume, setMasterVolume: s.setMasterVolume, toggleMute: s.toggleMute,
    loadPreset: s.loadPreset, setSleepTimer: s.setSleepTimer,
  })));
  const { isPlaying, busy, isMuted, activePresetId, sleepTimerMin, sleepTimerRemainingSec, masterVolume, setMasterVolume, toggleMute, loadPreset, setSleepTimer } = state;
  const [custom, setCustom] = useState<NeuroScapePreset[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const refresh = () => { void listPresets().then(setCustom).catch(() => undefined); };
  useEffect(refresh, []);
  const presets = [...factoryPresets, ...custom];
  const timerMinutes = [15, 30, 45, 60, 90, 120, 480];
  if (sleepTimerMin !== null && !timerMinutes.includes(sleepTimerMin)) timerMinutes.push(sleepTimerMin);
  const fadeOptions = [30, 60, 90, 120];
  if (!fadeOptions.includes(state.fadeOutSec)) fadeOptions.push(state.fadeOutSec);
  return <>
    <header className="brand" data-tauri-drag-region><span className="brand-icon"><AudioLines size={23} /></span><div><h1>BrainDAW</h1><span>NeuroScape Studio</span></div>
      <button className="secondary-button library-button" onClick={() => setLibraryOpen(true)}><BookOpen size={16} /> Preset library</button>
      {detectPlatform() === 'capacitor-ios' && <button className="icon-button" aria-label="Playback settings" onClick={() => setSettingsOpen(true)}><Settings2 size={17} /></button>}
    </header>
    <section className="transport" aria-label="Master transport">
      <button className="play" onClick={() => void audioEngine.togglePlay()} disabled={busy}>
        {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <label className="field preset"><span>Session preset</span><select value={activePresetId} onChange={(event) => {
        const preset = presets.find(({ id }) => id === event.target.value);
        if (preset) loadPreset(preset);
      }}>
        {factoryPresetGroups.map(({ label, presets }) => <optgroup key={label} label={label}>
          {presets.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </optgroup>)}
        {custom.length > 0 && <optgroup label={presetCategories.custom}>
          {custom.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </optgroup>}
        {!presets.some(({ id }) => id === activePresetId) && <option value={activePresetId}>{state.activePresetName}</option>}
      </select></label>
      <VisualizerCanvas />
      <button className="secondary-button timer" aria-label="Sleep timer" onClick={() => setTimerOpen(true)}>
        <Timer size={16} /> <span>{sleepTimerRemainingSec === null ? 'Timer' : formatTime(sleepTimerRemainingSec)}</span>
      </button>
      <div className="master">
        <button className="icon-button" title="Mute master (M)" aria-label="Mute master" aria-pressed={isMuted} onClick={toggleMute}>{isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
        <Fader label="Master" value={masterVolume} reset={0.72} onChange={setMasterVolume} />
      </div>
    </section>
    {libraryOpen && <PresetManagerModal onClose={() => setLibraryOpen(false)} onChange={refresh} />}
    {settingsOpen && <PlaybackSettingsModal onClose={() => setSettingsOpen(false)} />}
    {timerOpen && <Modal label="Sleep timer" onClose={() => setTimerOpen(false)}>
      <div className="dialog-form">
        <label className="field"><span>Duration</span><select value={sleepTimerMin ?? ''} onChange={(event) => setSleepTimer(event.target.value ? Number(event.target.value) : null)}>
          <option value="">Off</option>{timerMinutes.map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
        </select></label>
        <label className="field"><span>Fade out</span><select value={state.fadeOutSec} onChange={(event) => useAudioStore.setState({ fadeOutSec: Number(event.target.value) })}>
          {fadeOptions.map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
        </select></label>
        {sleepTimerRemainingSec !== null && <p className="hint">{formatTime(sleepTimerRemainingSec)} remaining</p>}
      </div>
    </Modal>}
  </>;
}
