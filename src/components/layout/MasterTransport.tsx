import { AudioLines, Pause, Play, Timer, Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../../audio/AudioEngineManager';
import { factoryPresets } from '../../store/factoryPresets';
import { useAudioStore } from '../../store/useAudioStore';
import { BasicControl } from '../controls/BasicControl';

function formatTime(seconds: number) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

export function MasterTransport() {
  const { isPlaying, busy, isMuted, activePresetId, sleepTimerMin, sleepTimerRemainingSec, masterVolume, setMasterVolume, toggleMute, loadPreset, setSleepTimer } = useAudioStore();
  return <>
    <header className="brand"><span className="brand-icon"><AudioLines size={23} /></span><div><h1>BrainDAW</h1><span>NeuroScape Studio</span></div></header>
    <section className="transport" aria-label="Master transport">
      <button className="play" onClick={() => void audioEngine.togglePlay()} disabled={busy}>
        {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <label className="field preset"><span>Session preset</span><select value={activePresetId} onChange={(event) => {
        const preset = factoryPresets.find(({ id }) => id === event.target.value);
        if (preset) loadPreset(preset);
      }}>{factoryPresets.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="field timer"><span><Timer size={14} /> {sleepTimerRemainingSec === null ? 'Sleep timer' : formatTime(sleepTimerRemainingSec)}</span>
        <select aria-label="Sleep timer" value={sleepTimerMin ?? ''} onChange={(event) => setSleepTimer(event.target.value ? Number(event.target.value) : null)}>
          <option value="">Off</option>{[15, 30, 45, 60, 90, 120, 480].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
        </select>
      </label>
      <div className="master">
        <button className="icon-button" title="Mute master (M)" aria-label="Mute master" aria-pressed={isMuted} onClick={toggleMute}>{isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
        <BasicControl label="Master" value={masterVolume} onChange={setMasterVolume} />
      </div>
    </section>
  </>;
}
