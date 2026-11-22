import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { detectPlatform, isMobile } from './platformBridge';

export interface MobilePlayback {
  title: string;
  playing: boolean;
  remaining: number | null;
  mixWithOthers: boolean;
}

export type MobileAudioAction = 'play' | 'pause' | 'stop' | 'interrupt' | 'resume' | 'lost-route';

interface StudioAudioPlugin {
  prepare(options: { mixWithOthers: boolean }): Promise<void>;
  setPlayback(options: MobilePlayback): Promise<void>;
  addListener(event: 'transport', listener: (event: { action: MobileAudioAction }) => void): Promise<PluginListenerHandle>;
}

export const studioAudio = registerPlugin<StudioAudioPlugin>('StudioAudio');
const mixKey = 'braindaw.mix-with-others';

export function getMixWithOthers() { return localStorage.getItem(mixKey) === 'true'; }
export function saveMixWithOthers(value: boolean) { localStorage.setItem(mixKey, String(value)); }

export async function prepareMobilePlayback() {
  if (isMobile()) await studioAudio.prepare({ mixWithOthers: getMixWithOthers() });
}

export class PlaybackOutput {
  private readonly media?: HTMLAudioElement;
  private direct = true;

  constructor(private readonly context: AudioContext, private readonly source: AudioNode) {
    source.connect(context.destination);
    if (detectPlatform() !== 'capacitor-ios') return;
    const stream = context.createMediaStreamDestination();
    const media = new Audio();
    media.srcObject = stream.stream;
    media.disableRemotePlayback = true;
    media.setAttribute('playsinline', '');
    source.connect(stream);
    this.media = media;
  }

  async play() {
    const media = this.media;
    if (!media) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const started = await Promise.race([
      media.play().then(() => true, () => false),
      new Promise<boolean>((resolve) => { timeout = setTimeout(() => resolve(false), 1000); }),
    ]);
    clearTimeout(timeout);
    if (started && this.direct) {
      this.source.disconnect(this.context.destination);
      this.direct = false;
    }
    if (!started) {
      media.pause();
      if (!this.direct) this.source.connect(this.context.destination);
      this.direct = true;
    }
  }

  pause() { this.media?.pause(); }
}
