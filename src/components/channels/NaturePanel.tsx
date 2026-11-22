import { biomeNames } from '../../store/factoryPresets';
import { useAudioStore } from '../../store/useAudioStore';
import type { NatureParams } from '../../types/audio';
import { BasicControl } from '../controls/BasicControl';
import { ChannelPanel } from './ChannelPanel';

const controls: [Exclude<keyof NatureParams, 'biome' | 'enabled'>, string][] = [
  ['rainIntensity', 'Rain intensity'], ['windGustiness', 'Wind gusts'],
  ['thunderProbability', 'Thunder density'], ['thunderDistance', 'Thunder distance'],
  ['wildlifeDensity', 'Wildlife'], ['insectBed', 'Insects'], ['waterFlow', 'Water flow'],
  ['stereoWidth', 'Stereo width'], ['reverbSpace', 'Reverb space'], ['surrealDepth', 'Surreal depth'],
];

export function NaturePanel() {
  const params = useAudioStore((state) => state.nature);
  const setParam = useAudioStore((state) => state.setNatureParam);
  return <ChannelPanel channel="nature">
    <label className="field"><span>Biome</span>
      <select value={params.biome} onChange={(event) => setParam('biome', event.target.value)}>
        {Object.entries(biomeNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
    <div className="controls-grid">{controls.map(([key, label]) =>
      <BasicControl key={key} label={label} value={params[key]} onChange={(value) => setParam(key, value)} />)}</div>
  </ChannelPanel>;
}
