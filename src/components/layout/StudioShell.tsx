import { useEffect, useRef } from 'react';
import { audioEngine } from '../../audio/AudioEngineManager';
import { useAudioStore } from '../../store/useAudioStore';
import { BrainwavePanel } from '../channels/BrainwavePanel';
import { channels, setChannelVolume, toggleChannel } from '../channels/ChannelPanel';
import { NaturePanel } from '../channels/NaturePanel';
import { SynthPadPanel } from '../channels/SynthPadPanel';
import { BasicControl } from '../controls/BasicControl';
import { MasterTransport } from './MasterTransport';

function MiniMixer() {
  const state = useAudioStore();
  return <div className="mini-mixer" aria-label="Channel balance">
    {channels.map(({ id, name, Icon }) => <div className={'mini-channel ' + id} key={id}>
      <div><button className="icon-button" aria-label={'Mute ' + name} aria-pressed={!state[id].enabled} onClick={() => toggleChannel(id)}><Icon size={16} /></button>
        <button className="tab" aria-pressed={state.activeMobileTab === id} onClick={() => useAudioStore.setState({ activeMobileTab: id })}>{name}</button></div>
      <BasicControl label={name + ' balance'} value={state[id].volume} onChange={(volume) => setChannelVolume(id, volume)} />
    </div>)}
  </div>;
}

export function StudioShell() {
  const error = useAudioStore((state) => state.error);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') ||
          (event.target as HTMLElement | null)?.closest('input,button,select,textarea,[role="slider"],[contenteditable]')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        void audioEngine.togglePlay();
      }
      if (event.key.toLowerCase() === 'm') useAudioStore.getState().toggleMute();
      if (['1', '2', '3'].includes(event.key)) toggleChannel(channels[Number(event.key) - 1].id);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  return <main className="studio">
    <div className="pinned"><MasterTransport /><MiniMixer /></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="console" data-selected={useAudioStore((state) => state.activeMobileTab)} onTouchStart={(event) => {
      if ((event.target as HTMLElement).closest('button,input,select,[role="slider"]')) return;
      pointerStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }} onTouchCancel={() => { pointerStart.current = null; }} onTouchEnd={(event) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || !window.matchMedia('(max-width: 767px)').matches) return;
      const delta = event.changedTouches[0].clientX - start.x;
      if (Math.abs(delta) < 65 || Math.abs(delta) < Math.abs(event.changedTouches[0].clientY - start.y) * 1.5) return;
      const index = channels.findIndex(({ id }) => id === useAudioStore.getState().activeMobileTab);
      const next = (index + (delta < 0 ? 1 : 2)) % 3;
      useAudioStore.setState({ activeMobileTab: channels[next].id });
    }}>
      <BrainwavePanel /><NaturePanel /><SynthPadPanel />
    </div>
    <footer className="studio-footer"><span>BrainDAW Studio</span><span>Space to play · M to mute · 1–3 to toggle channels</span></footer>
  </main>;
}
