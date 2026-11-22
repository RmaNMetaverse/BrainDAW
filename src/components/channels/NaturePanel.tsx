import { Download, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NatureEngine } from '../../audio/NatureEngine';
import { biomeNames, factoryPresets } from '../../store/factoryPresets';
import { useAudioStore } from '../../store/useAudioStore';
import type { BiomePackManifest, NatureParams } from '../../types/audio';
import { Fader } from '../controls/Fader';
import { XYPad } from '../controls/XYPad';
import { expandBiomeImport, exportBiome, pickDesktopFiles } from '../../platform/fileExport';
import { isDesktop } from '../../platform/platformBridge';
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
  const [wildlifeAxis, setWildlifeAxis] = useState(false);
  useEffect(() => { void NatureEngine.listCustom().then(setCustom).catch(() => undefined); }, []);

  async function importRecordings(files: File[]) {
    if (!files.length || importing) return;
    setImporting(true);
    setMessage('');
    try {
      const manifest = await NatureEngine.importFiles(await expandBiomeImport(files));
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
  const selectedCustom = custom.find(({ id }) => id === params.biome);
  const axis = wildlifeAxis ? 'wildlifeDensity' : 'surrealDepth';
  return <ChannelPanel channel="nature">
    <label className="field"><span>Biome</span>
      <select value={params.biome} onChange={(event) => setParam('biome', event.target.value)}>
        {Object.entries(biomeNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        {custom.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        {!recognized && <option value={params.biome}>{params.biome}</option>}
      </select>
    </label>
    <div className="nature-status"><p className="hint" role="status">{status || 'Recordings load on playback'}</p>
      <button className="axis-button" type="button" aria-pressed={wildlifeAxis} onClick={() => setWildlifeAxis(!wildlifeAxis)}>Wildlife axis</button></div>
    <XYPad x={params.rainIntensity} y={params[axis]} xLabel="Rain" yLabel={wildlifeAxis ? 'Wildlife' : 'Surreal'}
      onChange={(rainIntensity, value) => useAudioStore.setState((state) => ({ nature: { ...state.nature, rainIntensity, [axis]: value } }))} />
    <div className="controls-grid">{controls.map(([key, label]) =>
      <Fader key={key} label={label} value={params[key]} reset={factoryPresets[0].nature[key]} onChange={(value) => setParam(key, value)} />)}</div>
    <div className="biome-import" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
      event.preventDefault();
      void importRecordings(Array.from(event.dataTransfer.files));
    }}>
      <input ref={input} type="file" accept="audio/*,.opus,.flac,.ogg,.wav,.m4a,.json,.zip" multiple hidden aria-label="Biome files"
        onChange={(event) => {
          void importRecordings(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = '';
        }} />
      <button type="button" disabled={importing} onClick={() => {
        if (!isDesktop()) input.current?.click();
        else void pickDesktopFiles(['opus', 'flac', 'ogg', 'wav', 'mp3', 'm4a', 'json', 'zip'], true).then(importRecordings).catch((error: unknown) =>
          setMessage(error instanceof Error ? error.message : 'Could not open the recordings.'));
      }}><Upload size={16} /> {importing ? 'Importing…' : 'Import recordings'}</button>
      <span>Drop audio files or a biome ZIP</span>
      {selectedCustom && <button type="button" onClick={() => {
        void NatureEngine.exportFiles(selectedCustom.id).then((files) => exportBiome(selectedCustom.name, files)).catch((error: unknown) =>
          setMessage(error instanceof Error ? error.message : 'Could not export the biome.'));
      }}><Download size={16} /> Export biome</button>}
      {message && <p role="status">{message}</p>}
    </div>
  </ChannelPanel>;
}
