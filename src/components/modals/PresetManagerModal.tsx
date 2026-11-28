import { Download, Search, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { noteName } from '../../audio/utils/musicTheory';
import { natureWeights } from '../../audio/natureBlend';
import { exportFile, fileBasename, pickDesktopFiles } from '../../platform/fileExport';
import { isDesktop } from '../../platform/platformBridge';
import { biomeNames, factoryPresetGroups, presetCategories } from '../../store/factoryPresets';
import { deletePreset, listPresets, parsePreset, savePreset, snapshotPreset } from '../../store/presets';
import { useAudioStore } from '../../store/useAudioStore';
import type { NeuroScapePreset, PresetCategory } from '../../types/audio';
import { Modal } from './Modal';

function searchText(value: string) {
  return value.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function presetSound(preset: NeuroScapePreset) {
  const { beatHz, mode } = preset.brainwave;
  const end = preset.timeline?.at(-1)?.targetBeatHz;
  const beat = end === undefined ? String(beatHz) : beatHz + ' → ' + end;
  const blend = preset.nature.blend;
  const sources = [preset.nature.biome];
  if (blend) {
    const weights = natureWeights(blend.x, blend.y);
    sources.splice(0, 1, ...blend.corners.filter((_, index) => weights[index] > 0).map(({ biome }) => biome));
  }
  const biome = [...new Set(sources.map((source) => biomeNames[source] ?? source))].join(' + ');
  const pad = preset.synthPad.waveform.replace(/_/g, ' ');
  return [
    preset.brainwave.enabled && (mode + ' · ' + beat + ' Hz'),
    preset.nature.enabled && biome,
    preset.synthPad.enabled && (noteName(preset.synthPad.rootNote) + ' ' + pad),
  ].filter(Boolean).join(' / ');
}

export function PresetManagerModal({ onClose, onChange }: { onClose: () => void; onChange: () => void }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PresetCategory | 'all'>('all');
  const [items, setItems] = useState<NeuroScapePreset[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const activeId = useAudioStore((state) => state.activePresetId);
  useEffect(() => { void listPresets().then(setItems).catch(() => setMessage('Preset storage is unavailable.')); }, []);

  const terms = searchText(query).split(' ').filter(Boolean);
  const groups = [...factoryPresetGroups, { label: presetCategories.custom, presets: items }]
    .map(({ label, presets }) => ({
      label,
      presets: presets.filter((preset) => {
        if (category !== 'all' && label !== presetCategories[category]) return false;
        const text = searchText([preset.name, preset.description, label, presetSound(preset)].join(' '));
        return terms.every((term) => text.includes(term));
      }),
    })).filter(({ presets }) => presets.length > 0);

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try { await operation(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The preset could not be updated.'); }
    finally { setBusy(false); }
  }

  async function store(preset: NeuroScapePreset) {
    await savePreset(preset);
    useAudioStore.getState().loadPreset(preset);
    setItems(await listPresets());
    setCategory('custom');
    setQuery('');
    onChange();
    setMessage('Saved ' + preset.name + '.');
  }

  async function importPreset(file?: File) {
    if (!file) return;
    if (file.size > 200_000) throw new Error('Preset files must be under 200 KB.');
    const preset = parsePreset(JSON.parse(await file.text()));
    await store({ ...preset, id: 'preset-' + crypto.randomUUID(), category: 'custom' });
  }

  return <Modal label="Preset library" onClose={onClose}>
    <div className="preset-filters">
      <label className="field"><span><Search size={14} aria-hidden /> Search presets</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, sound, or state" />
      </label>
      <label className="field"><span>Category</span>
        <select value={category} onChange={(event) => setCategory(event.target.value as PresetCategory | 'all')}>
          <option value="all">All presets</option>
          {Object.entries(presetCategories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
    </div>
    <details className="preset-research">
      <summary>Research and listening notes</summary>
      <p>Beat rates shape the rhythm you hear. Experiments on brain responses to auditory beats report mixed results. These sounds are artistic interpretations, and there is no validated audio recipe for intoxication, hallucinations, or an out-of-body experience.</p>
      <p>Human studies measured changes across several brain rhythms after psilocybin and changes in frontal theta coordination after THC. Sleep-onset imagery and lucid dreaming have been studied in sleep experiments. One clinical report elicited an out-of-body sensation with direct electrical stimulation.</p>
      <p>The Lucid Dreaming mixes are designed for bedtime listening or settling back after waking. Lucid REM studies have verified communication with some dreamers. A beat rate for reliably inducing lucidity has not been established.</p>
      <ul>
        <li>Auditory beats. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC7082494/" target="_blank" rel="noreferrer">Orozco Perez et al.</a> · <a href="https://doi.org/10.3389/fnhum.2017.00557" target="_blank" rel="noreferrer">López-Caballero &amp; Escera</a></li>
        <li>Brain activity after <a href="https://pubmed.ncbi.nlm.nih.gov/24048847/" target="_blank" rel="noreferrer">psilocybin</a> and <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3055738/" target="_blank" rel="noreferrer">THC</a>.</li>
        <li>Dream research. <a href="https://doi.org/10.1038/s41598-023-31361-w" target="_blank" rel="noreferrer">Sleep onset</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/33607035/" target="_blank" rel="noreferrer">Lucid REM sleep</a></li>
        <li><a href="https://pubmed.ncbi.nlm.nih.gov/12239558/" target="_blank" rel="noreferrer">Out-of-body perception case report</a>.</li>
      </ul>
    </details>
    {(category === 'lucid' || category === 'psychedelic') && <p className="hint preset-theme-note">These themes describe the sound design. Frequencies and timelines are musical choices.</p>}
    <div className="preset-catalog" aria-label="Preset results">
      {groups.length === 0 && <p className="hint">{category === 'custom' && !query.trim() ? 'Your saved mixes appear here.' : 'No presets match your search.'}</p>}
      {groups.map(({ label, presets }) => <section className="preset-group" key={label} aria-label={label}>
        {category === 'all' && <h3>{label}</h3>}
        <ul className="preset-list">
          {presets.map((preset) => <li key={preset.id}>
            <button className="preset-load" type="button" aria-pressed={activeId === preset.id}
              onClick={() => { useAudioStore.getState().loadPreset(preset); onClose(); }}>
              <strong>{preset.name}</strong>
              {preset.description && <span>{preset.description}</span>}
              <small>{presetSound(preset) || 'All channels off'}</small>
            </button>
            {preset.category === 'custom' && (pendingDelete === preset.id ? <div className="preset-delete">
              <button className="secondary-button" type="button" onClick={() => setPendingDelete(undefined)}>Cancel</button>
              <button className="secondary-button" type="button" disabled={busy} onClick={() => void run(async () => {
                await deletePreset(preset.id);
                setPendingDelete(undefined);
                setItems(await listPresets());
                onChange();
              })}>Delete</button>
            </div> : <button className="icon-button" type="button" aria-label={'Delete ' + preset.name} onClick={() => setPendingDelete(preset.id)}><Trash2 size={16} /></button>)}
          </li>)}
        </ul>
      </section>)}
    </div>
    <form className="preset-save" onSubmit={(event) => {
      event.preventDefault();
      if (name.trim()) void run(async () => { await store(snapshotPreset(name.trim())); setName(''); });
    }}>
      <label className="field"><span>Preset name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name this mix" maxLength={80} required /></label>
      <button className="primary-button" type="submit" disabled={busy || !name.trim()}>Save current mix</button>
    </form>
    <div className="dialog-actions">
      <input ref={input} hidden type="file" accept="application/json,.json" aria-label="Preset JSON" onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (file) void run(() => importPreset(file));
      }} />
      <button className="secondary-button" type="button" disabled={busy} onClick={() => {
        if (!isDesktop()) input.current?.click();
        else void run(async () => importPreset((await pickDesktopFiles(['json'], false))[0]));
      }}><Upload size={16} /> Import JSON</button>
      <button className="secondary-button" type="button" disabled={busy} onClick={() => void run(async () => {
        const preset = snapshotPreset();
        await exportFile(fileBasename(preset.name) + '.json', JSON.stringify(preset, null, 2), 'application/json');
      })}><Download size={16} /> Export current</button>
    </div>
    {message && <p className="hint" role="status">{message}</p>}
  </Modal>;
}
