import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import type { SessionStage } from '../../types/audio';
import { Modal } from './Modal';

export function TimelineModal({ onClose }: { onClose: () => void }) {
  const [stages, setStages] = useState(() => useAudioStore.getState().timeline);
  function change(index: number, patch: Partial<SessionStage>) {
    setStages((current) => current.map((stage, position) => index === position ? { ...stage, ...patch } : stage));
  }
  function move(index: number, direction: number) {
    setStages((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  }

  return <Modal label="Session timeline" onClose={onClose}>
    <form className="dialog-form" onSubmit={(event) => {
      event.preventDefault();
      useAudioStore.setState({ timeline: stages, sessionElapsedSec: 0 });
      onClose();
    }}>
      {!stages.length && <p className="hint">Add a stage to ramp the carrier and beat over time.</p>}
      {stages.map((stage, index) => <fieldset className="timeline-stage" key={stage.id}>
        <legend>Stage {index + 1}</legend>
        <label className="field stage-name"><span>Name</span><input value={stage.label} maxLength={48} required onChange={(event) => change(index, { label: event.target.value })} /></label>
        <label className="field"><span>Seconds</span><input type="number" required min={1} max={28800} value={Number.isFinite(stage.durationSec) ? stage.durationSec : ''} onChange={(event) => change(index, { durationSec: event.target.valueAsNumber })} /></label>
        <label className="field"><span>Target beat (Hz)</span><input type="number" required min={0.5} max={45} step="any" value={Number.isFinite(stage.targetBeatHz) ? stage.targetBeatHz : ''} onChange={(event) => change(index, { targetBeatHz: event.target.valueAsNumber })} /></label>
        <label className="field"><span>Target carrier (Hz)</span><input type="number" required min={60} max={500} step="any" value={Number.isFinite(stage.targetCarrierHz) ? stage.targetCarrierHz : ''} onChange={(event) => change(index, { targetCarrierHz: event.target.valueAsNumber })} /></label>
        <div className="stage-actions">
          <button type="button" className="icon-button" aria-label={'Move stage ' + (index + 1) + ' up'} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
          <button type="button" className="icon-button" aria-label={'Move stage ' + (index + 1) + ' down'} disabled={index === stages.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
          <button type="button" className="icon-button" aria-label={'Delete stage ' + (index + 1)} onClick={() => setStages((current) => current.filter(({ id }) => id !== stage.id))}><Trash2 size={16} /></button>
        </div>
      </fieldset>)}
      <div className="dialog-actions">
        <button type="button" className="secondary-button" disabled={stages.length >= 32} onClick={() => {
          const brainwave = useAudioStore.getState().brainwave;
          setStages((current) => [...current, { id: crypto.randomUUID(), label: 'Stage ' + (current.length + 1), durationSec: 300, targetBeatHz: brainwave.beatHz, targetCarrierHz: brainwave.carrierHz }]);
        }}><Plus size={15} /> Add stage</button>
        <button className="primary-button" type="submit">Apply timeline</button>
      </div>
    </form>
  </Modal>;
}
