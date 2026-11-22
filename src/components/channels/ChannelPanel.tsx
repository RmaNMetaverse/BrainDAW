import { AudioLines, Leaf, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAudioStore, type Channel } from '../../store/useAudioStore';
import { BasicControl } from '../controls/BasicControl';

export const channels = [
  { id: 'brainwave', name: 'Brainwave', sub: 'Entrainment', Icon: AudioLines },
  { id: 'nature', name: 'Nature', sub: 'Soundscape', Icon: Leaf },
  { id: 'synthPad', name: 'Synth Pad', sub: 'Generative harmony', Icon: Waves },
] as const;

export function toggleChannel(channel: Channel) {
  useAudioStore.setState((state) => ({ [channel]: { ...state[channel], enabled: !state[channel].enabled } }));
}

export function setChannelVolume(channel: Channel, volume: number) {
  useAudioStore.setState((state) => ({ [channel]: { ...state[channel], volume } }));
}

export function ChannelPanel({ channel, children }: { channel: Channel; children: ReactNode }) {
  const { name, sub, Icon } = channels.find(({ id }) => id === channel)!;
  const active = useAudioStore((state) => state.activeMobileTab === channel);
  const { enabled, volume } = useAudioStore((state) => state[channel]);
  return <section className={'channel ' + channel} data-active={active} aria-label={name + ' channel'}>
    <header className="channel-header">
      <span className="channel-icon"><Icon size={22} aria-hidden /></span>
      <div><h2>{name}</h2><p>{sub}</p></div>
      <button className="channel-toggle" aria-label={'Enable ' + name} aria-pressed={enabled} onClick={() => toggleChannel(channel)}><i />{enabled ? 'On' : 'Off'}</button>
    </header>
    <BasicControl label={name + ' level'} value={volume} onChange={(value) => setChannelVolume(channel, value)} />
    {children}
  </section>;
}
