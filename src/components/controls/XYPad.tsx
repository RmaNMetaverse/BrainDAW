import type { CSSProperties, PointerEvent } from 'react';
import { clamp } from '../../audio/utils/smoothing';

export function XYPad({ x, y, xLabel, yLabel, onChange }: {
  x: number;
  y: number;
  xLabel: string;
  yLabel: string;
  onChange: (x: number, y: number) => void;
}) {
  function move(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    onChange(clamp((event.clientX - bounds.left) / bounds.width), clamp(1 - (event.clientY - bounds.top) / bounds.height));
  }
  return <div className="xy-control">
    <div role="group" aria-label={xLabel + ' and ' + yLabel + ' XY pad'} tabIndex={0} className="xy-pad"
      style={{ '--x': x * 100 + '%', '--y': (1 - y) * 100 + '%' } as CSSProperties}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event); }}
      onKeyDown={(event) => {
        const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
        const direction = moves[event.key];
        if (!direction) return;
        event.preventDefault();
        const step = event.shiftKey ? 0.005 : 0.025;
        onChange(clamp(x + direction[0] * step), clamp(y + direction[1] * step));
      }}>
      <span className="xy-left">{yLabel}</span><span className="xy-bottom">{xLabel}</span><i />
    </div>
  </div>;
}
