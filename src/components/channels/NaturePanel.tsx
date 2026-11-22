import { biomeNames } from '../../store/factoryPresets';
import { useAudioStore } from '../../store/useAudioStore';
import type { BiomePackManifest, NatureParams } from '../../types/audio';
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
  const status = useAudioStore((state) => state.biomeLoadingState);
  const input = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState<BiomePackManifest[]>([]);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  useEffect(() => { void NatureEngine.listCustom().then(setCustom).catch(() => undefined); }, []);

  async function importRecordings(files: File[]) {
    if (!files.length || importing) return;
    setImporting(true);
    setMessage('');
    try {
      const manifest = await NatureEngine.importFiles(files);
      setCustom((packs) => [...packs, manifest]);
      setParam('biome', manifest.id);
      setMessage(manifest.name + ' saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The recordings could not be imported.');
    } finally {
      setImporting(false);
    }
  }

  const recognized = params.biome in biomeNames || custom.some(({ id }) => id === params.biome);
  return <ChannelPanel channel="nature">
    <label className="field"><span>Biome</span>
      <select value={params.biome} onChange={(event) => setParam('biome', event.target.value)}>
        {Object.entries(biomeNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        {custom.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        {!recognized && <option value={params.biome}>{params.biome}</option>}
      </select>
    </label>
    <p className="hint" role="status">{status || 'Recordings load on playback'}</p>
    <div className="controls-grid">{controls.map(([key, label]) =>
      <BasicControl key={key} label={label} value={params[key]} onChange={(value) => setParam(key, value)} />)}</div>
    <div className="biome-import" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      event.preventDefault();
      void importRecordings(Array.from(event.dataTransfer.files));
    }}>
      <input ref={input} type="file" accept="audio/*,.opus,.flac,.ogg,.wav,.m4a,.json" multiple hidden aria-label="Biome files"
        onChange={(event) => {
          void importRecordings(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = '';
        }} />
      <button type="button" disabled={importing} onClick={() => input.current?.click()}><Upload size={16} /> {importing ? 'Importing…' : 'Import recordings'}</button>
      <span>Drop audio files or a manifest with its recordings</span>
      {message && <p role="status">{message}</p>}
    </div>
  </ChannelPanel>;
}
import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NatureEngine } from '../../audio/NatureEngine';
