import { Download, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { exportFile, fileBasename } from '../../platform/fileExport';
import { deletePreset, listPresets, parsePreset, savePreset, snapshotPreset } from '../../store/presets';
import { useAudioStore } from '../../store/useAudioStore';
import type { NeuroScapePreset } from '../../types/audio';
import { Modal } from './Modal';

export function PresetManagerModal({ onClose, onChange }: { onClose: () => void; onChange: () => void }) {
  const [name, setName] = useState('');
  const [items, setItems] = useState<NeuroScapePreset[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { void listPresets().then(setItems).catch(() => setMessage('Preset storage is unavailable.')); }, []);

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
    onChange();
    setMessage('Saved ' + preset.name + '.');
  }

  return <Modal label="Preset library" onClose={onClose}>
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
        if (!file) return;
        void run(async () => {
          if (file.size > 200_000) throw new Error('Preset files must be under 200 KB.');
          const preset = parsePreset(JSON.parse(await file.text()));
          await store({ ...preset, id: 'preset-' + crypto.randomUUID(), category: 'custom' });
        });
      }} />
      <button className="secondary-button" type="button" disabled={busy} onClick={() => input.current?.click()}><Upload size={16} /> Import JSON</button>
      <button className="secondary-button" type="button" disabled={busy} onClick={() => void run(async () => {
        const preset = snapshotPreset();
        await exportFile(fileBasename(preset.name) + '.json', JSON.stringify(preset, null, 2), 'application/json');
      })}><Download size={16} /> Export current</button>
    </div>
    {items.length > 0 && <ul className="preset-list">
      {items.map((preset) => <li key={preset.id}>
        <button className="preset-load" type="button" onClick={() => { useAudioStore.getState().loadPreset(preset); onClose(); }}>{preset.name}</button>
        {pendingDelete === preset.id ? <>
          <button className="secondary-button" type="button" onClick={() => setPendingDelete(undefined)}>Cancel</button>
          <button className="secondary-button" type="button" disabled={busy} onClick={() => void run(async () => {
            await deletePreset(preset.id);
            setPendingDelete(undefined);
            setItems(await listPresets());
            onChange();
          })}>Delete</button>
        </> : <button className="icon-button" type="button" aria-label={'Delete ' + preset.name} onClick={() => setPendingDelete(preset.id)}><Trash2 size={16} /></button>}
      </li>)}
    </ul>}
    {message && <p className="hint" role="status">{message}</p>}
  </Modal>;
}
