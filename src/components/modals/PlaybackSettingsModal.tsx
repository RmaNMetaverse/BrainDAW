import { useState } from 'react';
import { getMixWithOthers, prepareMobilePlayback, saveMixWithOthers } from '../../platform/nativeAudio';
import { useAudioStore } from '../../store/useAudioStore';
import { Modal } from './Modal';

export function PlaybackSettingsModal({ onClose }: { onClose: () => void }) {
  const [mix, setMix] = useState(getMixWithOthers);
  return <Modal label="Playback settings" onClose={onClose}>
    <label className="mix-option"><input type="checkbox" checked={mix} onChange={(event) => {
      const value = event.target.checked;
      setMix(value);
      saveMixWithOthers(value);
      if (useAudioStore.getState().isPlaying) void prepareMobilePlayback().catch(() => undefined);
    }} /> Mix with audio from other apps</label>
  </Modal>;
}
