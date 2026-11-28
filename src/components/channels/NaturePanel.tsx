import { CloudRain, Download, Flame, Leaf, Moon, Trees, Upload, Waves, Wind } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NatureEngine } from '../../audio/NatureEngine';
import { natureCornerIndexes, natureSoundForBiome, natureWeights, readNatureBlend, type NatureCornerIndex } from '../../audio/natureBlend';
import { biomeNames } from '../../store/factoryPresets';
import { useAudioStore } from '../../store/useAudioStore';
import type { BiomePackManifest, NatureSoundParams } from '../../types/audio';
import { Fader } from '../controls/Fader';
import { XYPad } from '../controls/XYPad';
import { expandBiomeImport, exportBiome, pickDesktopFiles } from '../../platform/fileExport';
import { isDesktop } from '../../platform/platformBridge';
import { ChannelPanel } from './ChannelPanel';

const controls: [Exclude<keyof NatureSoundParams, 'biome'>, string][] = [
  ['rainIntensity', 'Rain intensity'], ['windGustiness', 'Wind gusts'],
  ['thunderProbability', 'Thunder density'], ['thunderDistance', 'Thunder distance'],
  ['wildlifeDensity', 'Wildlife'], ['insectBed', 'Insects'], ['waterFlow', 'Water flow'],
  ['stereoWidth', 'Stereo width'], ['reverbSpace', 'Reverb space'], ['surrealDepth', 'Surreal depth'],
];
const fireControls: typeof controls = [['fireCrackle', 'Crackle'], ['fireWarmth', 'Fire warmth'], ...controls.slice(7)];
const icons = { fireside: Flame, rainstorm: CloudRain, ocean_coast: Waves, jungle: Trees, night_forest: Moon, alpine_wind: Wind };
const cornerNames = ['Top left', 'Top right', 'Bottom left', 'Bottom right'];

export function NaturePanel() {
  const nature = useAudioStore((state) => state.nature);
  const presetId = useAudioStore((state) => state.activePresetId);
  const setPosition = useAudioStore((state) => state.setNatureBlendPosition);
  const setCorner = useAudioStore((state) => state.setNatureCorner);
  const status = useAudioStore((state) => state.biomeLoadingState);
  const input = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState<BiomePackManifest[]>([]);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [wildlifeAxis, setWildlifeAxis] = useState(false);
  const [selection, setSelection] = useState<{ presetId: string; index: NatureCornerIndex }>();
  const blend = useMemo(() => readNatureBlend(nature), [nature]);
  const weights = natureWeights(blend.x, blend.y);
  const index = selection?.presetId === presetId ? selection.index : natureCornerIndexes.find((corner) => weights[corner] === Math.max(...weights))!;
  const params = blend.corners[index];
  const defaults = natureSoundForBiome(params.biome);
  const biomeLabel = (biome: string) => biomeNames[biome] ?? custom.find(({ id }) => id === biome)?.name ?? biome;
  useEffect(() => { void NatureEngine.listCustom().then(setCustom).catch(() => undefined); }, []);

  async function importRecordings(files: File[]) {
    if (!files.length || importing) return;
    setImporting(true);
    setMessage('');
    try {
      const manifest = await NatureEngine.importFiles(await expandBiomeImport(files));
      setCustom((packs) => [...packs, manifest]);
      setCorner(index, natureSoundForBiome(manifest.id));
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
  const fire = params.biome === 'fireside';
  return <ChannelPanel channel="nature">
    <div className="nature-blend-heading"><h3>Nature blend</h3>
      <button type="button" className="axis-button" onClick={() => setPosition(0.5, 0.5)}>Center mix</button>
    </div>
    <XYPad x={blend.x} y={blend.y} label="Nature blend XY pad" className="nature-blend-pad"
      description={`Use the arrow keys to blend. Home centers the mix. ${blend.corners.map((corner, i) => `${cornerNames[i]} ${biomeLabel(corner.biome)} ${Math.round(weights[i] * 100)}%`).join('. ')}.`}
      onChange={setPosition}>
      {blend.corners.map((corner, i) => {
        const Icon = icons[corner.biome as keyof typeof icons] ?? Leaf;
        return <div className={`nature-pad-corner corner-${i}`} key={i} aria-hidden>
          <b><Icon size={15} /><span>{biomeLabel(corner.biome)}</span></b><small>{Math.round(weights[i] * 100)}%</small>
        </div>;
      })}
    </XYPad>
    <div className="nature-corner-picker" role="group" aria-label="Edit a nature corner">
      {natureCornerIndexes.map((corner) => <button type="button" key={corner} aria-pressed={index === corner}
        aria-label={`Edit ${cornerNames[corner].toLowerCase()} corner`} onClick={() => setSelection({ presetId, index: corner })}>
        {cornerNames[corner]}
      </button>)}
    </div>
    <div className="nature-status"><strong>{cornerNames[index]} settings</strong><p className="hint" role="status">{status || 'Recordings load on playback'}</p></div>
    <label className="field"><span>Biome</span>
      <select value={params.biome} onChange={(event) => setCorner(index, natureSoundForBiome(event.target.value))}>
        {Object.entries(biomeNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        {custom.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        {!recognized && <option value={params.biome}>{params.biome}</option>}
      </select>
    </label>
    {!fire && <>
      <div className="nature-status"><span className="hint">Corner modulation</span>
        <button className="axis-button" type="button" aria-pressed={wildlifeAxis} onClick={() => setWildlifeAxis(!wildlifeAxis)}>Wildlife axis</button></div>
      <XYPad x={params.rainIntensity} y={params[axis]} xLabel="Rain" yLabel={wildlifeAxis ? 'Wildlife' : 'Surreal'}
        onChange={(rainIntensity, value) => setCorner(index, { rainIntensity, [axis]: value })} />
    </>}
    <div className="controls-grid">{(fire ? fireControls : controls).map(([key, label]) =>
      <Fader key={key} label={label} value={params[key] ?? defaults[key] ?? 0} reset={defaults[key]} onChange={(value) => setCorner(index, { [key]: value })} />)}</div>
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
