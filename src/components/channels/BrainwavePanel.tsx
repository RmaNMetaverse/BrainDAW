import { Headphones, ListMusic } from 'lucide-react';
import { useState } from 'react';
import { brainwaveBands, factoryPresets } from '../../store/factoryPresets';
import { useAudioStore } from '../../store/useAudioStore';
import type { BrainwaveParams, EntrainmentMode } from '../../types/audio';
import { Fader, type ControlProps } from '../controls/Fader';
import { RotaryKnob } from '../controls/RotaryKnob';
import { TimelineModal } from '../modals/TimelineModal';
import { hapticTick } from '../../platform/platformBridge';
import { ChannelPanel } from './ChannelPanel';

const controls: (Pick<ControlProps, 'label' | 'min' | 'max' | 'step' | 'unit'> & {
  key: Exclude<keyof BrainwaveParams, 'enabled' | 'preset' | 'mode'>;
})[] = [
  { key: 'carrierHz', label: 'Carrier', min: 60, max: 500, step: 1, unit: 'Hz' },
  { key: 'beatHz', label: 'Beat', min: 0.5, max: 45, step: 0.1, unit: 'Hz' },
  { key: 'isochronicDepth', label: 'Pulse depth' },
  { key: 'rhythmModDepth', label: 'Breathing depth' },
  { key: 'rhythmModHz', label: 'Breathing rate', min: 0, max: 0.5, step: 0.005, unit: 'Hz' },
  { key: 'frequencyDriftDepth', label: 'Frequency drift' },
  { key: 'warmthFilterHz', label: 'Warmth', min: 300, max: 4000, step: 10, unit: 'Hz' },
];

export function BrainwavePanel() {
  const params = useAudioStore((state) => state.brainwave);
  const setParam = useAudioStore((state) => state.setBrainwaveParam);
  const applyPreset = useAudioStore((state) => state.applyBrainwavePreset);
  const liveBeat = useAudioStore((state) => state.isPlaying ? state.actualBeatHz : state.brainwave.beatHz);
  const timeline = useAudioStore((state) => state.timeline);
  const elapsed = useAudioStore((state) => state.sessionElapsedSec);
  const [editing, setEditing] = useState(false);
  const total = timeline.reduce((seconds, stage) => seconds + stage.durationSec, 0);
  return <ChannelPanel channel="brainwave">
    <div className="beat-display"><strong>{liveBeat.toFixed(1)} <small>Hz</small></strong><span>{params.preset === 'custom' ? 'Custom frequency' : params.preset.toUpperCase()}</span></div>
    <div className="bands" aria-label="Brainwave bands">
      {(Object.keys(brainwaveBands) as (keyof typeof brainwaveBands)[]).map((band) =>
        <button key={band} title={brainwaveBands[band].range + ' Hz'} aria-pressed={params.preset === band} onClick={() => { hapticTick(); applyPreset(band); }}>{band === 'smr' ? 'SMR' : band}</button>)}
    </div>
    <label className="field"><span>Entrainment mode</span>
      <select value={params.mode} onChange={(event) => setParam('mode', event.target.value as EntrainmentMode)}>
        <option value="binaural">Binaural</option><option value="isochronic">Isochronic</option>
        <option value="monaural">Monaural</option><option value="hybrid">Hybrid</option>
      </select>
    </label>
    <div className="controls-grid frequency-controls">{controls.slice(0, 2).map(({ key, ...control }) =>
      <Fader key={key} {...control} value={params[key]} reset={factoryPresets[0].brainwave[key]} onChange={(value) => setParam(key, value)} />)}</div>
    <div className="knob-grid">{controls.slice(2).map(({ key, ...control }) =>
      <RotaryKnob key={key} {...control} value={params[key]} reset={factoryPresets[0].brainwave[key]} onChange={(value) => setParam(key, value)} />)}</div>
    {(params.mode === 'binaural' || params.mode === 'hybrid') && <p className="hint"><Headphones size={15} /> Use stereo headphones for binaural playback.</p>}
    <button className="secondary-button timeline-button" onClick={() => setEditing(true)}><ListMusic size={16} /> Session timeline <span>{timeline.length > 0 ? timeline.length + ' stages' : 'Edit'}</span></button>
    {total > 0 && <progress className="session-progress" aria-label="Session timeline progress" max={total} value={elapsed} />}
    {editing && <TimelineModal onClose={() => setEditing(false)} />}
  </ChannelPanel>;
}
