import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { clamp } from '../../audio/utils/smoothing';

export interface ControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  reset?: number;
  onChange: (value: number) => void;
}

export function formatValue(value: number, unit = '', step = 0.01) {
  if (!unit) return Math.round(value * 100) + '%';
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return value.toLocaleString('en-US', { maximumFractionDigits: decimals }) + ' ' + unit;
}

export function stepped(value: number, min: number, max: number, step: number) {
  return clamp(Number((min + Math.round((value - min) / step) * step).toFixed(7)), min, max);
}

export function keyboardValue(event: KeyboardEvent, value: number, min: number, max: number, step: number) {
  const offset: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
  if (event.key === 'Home') return min;
  if (event.key === 'End') return max;
  if (event.key in offset) return stepped(value + offset[event.key] * step, min, max, step);
}

export function Fader({ label, value, min = 0, max = 1, step = 0.01, unit, reset, onChange, vertical = false }: ControlProps & { vertical?: boolean }) {
  const drag = useRef<{ position: number; value: number } | null>(null);
  const readPosition = (event: { clientX: number; clientY: number }) => vertical ? -event.clientY : event.clientX;
  const display = formatValue(value, unit, step);
  return <div className={'control fader' + (vertical ? ' vertical' : '')}>
    <span>{label}</span><output aria-hidden>{display}</output>
    <div className="fader-target" tabIndex={0} role="slider" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
      aria-valuetext={display} aria-orientation={vertical ? 'vertical' : 'horizontal'}
      style={{ '--position': (value - min) / (max - min) * 100 + '%' } as CSSProperties}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        const target = event.currentTarget;
        target.focus();
        target.setPointerCapture(event.pointerId);
        const bounds = target.getBoundingClientRect();
        const fraction = vertical ? (bounds.bottom - event.clientY) / bounds.height : (event.clientX - bounds.left) / bounds.width;
        const initial = event.shiftKey ? value : stepped(min + fraction * (max - min), min, max, step);
        drag.current = { position: readPosition(event), value: initial };
        onChange(initial);
      }}
      onPointerMove={(event) => {
        if (!drag.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const range = vertical ? bounds.height : bounds.width;
        const delta = (readPosition(event) - drag.current.position) / range * (max - min) / (event.shiftKey ? 10 : 1);
        onChange(stepped(drag.current.value + delta, min, max, step));
      }}
      onLostPointerCapture={() => { drag.current = null; }}
      onDoubleClick={() => onChange(reset ?? min + (max - min) * 0.5)}
      onKeyDown={(event) => {
        const next = keyboardValue(event, value, min, max, step);
        if (next === undefined) return;
        event.preventDefault();
        onChange(next);
      }}>
      <div className="fader-track"><i /><b /></div>
    </div>
  </div>;
}
