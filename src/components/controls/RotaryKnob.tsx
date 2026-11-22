import { useEffect, useRef } from 'react';
import { formatValue, keyboardValue, stepped, type ControlProps } from './Fader';

const arc = 'M 15 48 A 23 23 0 1 1 49 48';

export function RotaryKnob({ label, value, min = 0, max = 1, step = 0.01, unit, reset, onChange }: ControlProps) {
  const target = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; value: number } | null>(null);
  const current = useRef({ value, min, max, step, onChange });
  current.current = { value, min, max, step, onChange };
  useEffect(() => {
    const element = target.current;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== element || !event.deltaY) return;
      event.preventDefault();
      const { value, min, max, step, onChange } = current.current;
      onChange(stepped(value - Math.sign(event.deltaY) * step, min, max, step));
    };
    element?.addEventListener('wheel', wheel, { passive: false });
    return () => element?.removeEventListener('wheel', wheel);
  }, []);

  const display = formatValue(value, unit, step);
  const fraction = (value - min) / (max - min);
  return <div className="knob">
    <div ref={target} role="slider" tabIndex={0} className="knob-target" aria-label={label} aria-valuemin={min} aria-valuemax={max}
      aria-valuenow={value} aria-valuetext={display}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { y: event.clientY, value };
      }}
      onPointerMove={(event) => {
        if (!drag.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const distance = (drag.current.y - event.clientY) / (event.shiftKey ? 1500 : 150);
        onChange(stepped(drag.current.value + distance * (max - min), min, max, step));
      }}
      onLostPointerCapture={() => { drag.current = null; }}
      onDoubleClick={() => onChange(reset ?? min + (max - min) * 0.5)}
      onKeyDown={(event) => {
        const next = keyboardValue(event, value, min, max, step);
        if (next === undefined) return;
        event.preventDefault();
        onChange(next);
      }}>
      <svg viewBox="0 0 64 56" aria-hidden>
        <path d={arc} className="knob-track" pathLength="100" />
        <path d={arc} className="knob-arc" pathLength="100" strokeDasharray={fraction * 100 + ' 100'} />
        <circle cx="32" cy="32" r="17.5" className="knob-face" />
        <path d="M32 29V20" className="knob-needle" transform={'rotate(' + (-132 + fraction * 264) + ' 32 32)'} />
      </svg>
    </div>
    <span>{label}</span><output aria-hidden>{display}</output>
  </div>;
}
