import { noteName } from '../../audio/utils/musicTheory';
import { factoryPresets } from '../../store/factoryPresets';
import { useAudioStore } from '../../store/useAudioStore';
import type { PadWaveform, ScaleId, SynthPadParams } from '../../types/audio';
import type { ControlProps } from '../controls/Fader';
import { RotaryKnob } from '../controls/RotaryKnob';
import { XYPad } from '../controls/XYPad';
import { ChannelPanel } from './ChannelPanel';

const controls: (Pick<ControlProps, 'label' | 'min' | 'max' | 'step' | 'unit'> & {
  key: Exclude<keyof SynthPadParams, 'scale' | 'waveform' | 'tuningHz' | 'enabled'>;
})[] = [
  { key: 'detuneCents', label: 'Detune', max: 25, step: 0.5, unit: '¢' },
  { key: 'filterCutoffHz', label: 'Filter cutoff', min: 200, max: 6000, step: 10, unit: 'Hz' },
  { key: 'filterLfoRateHz', label: 'Filter LFO rate', min: 0.01, max: 0.3, step: 0.005, unit: 'Hz' },
  { key: 'filterLfoDepth', label: 'Filter LFO depth' },
  { key: 'evolutionSpeed', label: 'Evolution' },
  { key: 'shimmerAmount', label: 'Shimmer' },
  { key: 'reverbDecaySec', label: 'Reverb decay', min: 2, max: 16, step: 0.1, unit: 's' },
];
const scales: Record<ScaleId, string> = { lydian: 'Lydian', dorian: 'Dorian', minor_pentatonic: 'Minor Pentatonic', sus2_drone: 'Sus2 Drone', aeolian: 'Aeolian' };
const waves: Record<PadWaveform, string> = { sine: 'Sine', triangle: 'Triangle', warm_saw: 'Warm Saw', glass_pad: 'Glass Pad' };

export function SynthPadPanel() {
  const params = useAudioStore((state) => state.synthPad);
  const setParam = useAudioStore((state) => state.setSynthPadParam);
  return <ChannelPanel channel="synthPad">
    <div className="controls-grid">
      <label className="field"><span>Root note</span><select value={params.rootNote} onChange={(event) => setParam('rootNote', Number(event.target.value))}>
        {Array.from({ length: 49 }, (_, index) => index + 24).map((note) => <option key={note} value={note}>{noteName(note)}</option>)}
      </select></label>
      <label className="field"><span>Tuning</span><select value={params.tuningHz} onChange={(event) => setParam('tuningHz', Number(event.target.value) as 432 | 440)}>
        <option value={432}>432 Hz</option><option value={440}>440 Hz</option>
      </select></label>
      <label className="field"><span>Scale</span><select value={params.scale} onChange={(event) => setParam('scale', event.target.value as ScaleId)}>
        {Object.entries(scales).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select></label>
      <label className="field"><span>Waveform</span><select value={params.waveform} onChange={(event) => setParam('waveform', event.target.value as PadWaveform)}>
        {Object.entries(waves).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select></label>
    </div>
    <XYPad x={(params.filterCutoffHz - 200) / 5800} y={params.shimmerAmount} xLabel="Cutoff" yLabel="Shimmer"
      onChange={(x, shimmerAmount) => useAudioStore.setState((state) => ({
        synthPad: { ...state.synthPad, filterCutoffHz: Math.round((200 + x * 5800) / 10) * 10, shimmerAmount },
      }))} />
    <div className="knob-grid">{controls.map(({ key, ...control }) => <RotaryKnob key={key} {...control}
      value={params[key]} reset={factoryPresets[0].synthPad[key]} onChange={(value) => setParam(key, value)} />)}</div>
  </ChannelPanel>;
}
