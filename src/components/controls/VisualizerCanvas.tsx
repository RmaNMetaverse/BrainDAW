import { useEffect, useRef } from 'react';
import { audioEngine } from '../../audio/AudioEngineManager';
import { useAudioStore } from '../../store/useAudioStore';

export function VisualizerCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const colors = [[56, 189, 248], [52, 211, 153], [167, 139, 250]];
    let frame = 0;
    let width = 1, height = 1;
    let samples: Float32Array<ArrayBuffer> | undefined;

    const paint = () => {
      frame = 0;
      const state = useAudioStore.getState();
      const playing = state.isPlaying && !document.hidden;
      const analyser = audioEngine.analyser;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(174,199,235,.12)';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5);
      ctx.lineTo(width, height * 0.5);
      ctx.stroke();
      if (!playing || !analyser) return;
      if (!samples || samples.length !== analyser.fftSize) samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      const mix = [state.brainwave, state.nature, state.synthPad].map((channel) => channel.enabled ? channel.volume : 0);
      const total = mix.reduce((sum, volume) => sum + volume, 0);
      const rgb = [0, 1, 2].map((channel) => total ? Math.round(colors.reduce((sum, color, index) => sum + color[channel] * mix[index], 0) / total) : 163);
      const tint = 'rgb(' + rgb.join(' ') + ')';
      ctx.beginPath();
      const length = samples.length / 4;
      for (let index = 0; index < length; index++) {
        const x = index * width / (length - 1);
        const y = height * (0.5 - samples[index * 4] * 1.7);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * Math.PI * 2 * Math.min(state.actualBeatHz, 3));
      ctx.lineWidth = 1.45;
      ctx.strokeStyle = tint;
      ctx.shadowColor = tint;
      ctx.shadowBlur = 4 + pulse * 4;
      ctx.stroke();
      ctx.shadowBlur = 0;
      frame = requestAnimationFrame(paint);
    };

    const update = () => {
      cancelAnimationFrame(frame);
      paint();
    };
    const resize = new ResizeObserver(() => {
      const { width: cssWidth, height: cssHeight } = element.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio, 2);
      width = Math.max(cssWidth, 1);
      height = Math.max(cssHeight, 1);
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!document.hidden) update();
    });
    resize.observe(element);
    const unsubscribe = useAudioStore.subscribe((state) => state.isPlaying, update);
    document.addEventListener('visibilitychange', update);
    return () => {
      unsubscribe();
      resize.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return <canvas ref={canvas} className="visualizer" aria-hidden />;
}
