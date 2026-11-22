export interface ControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function formatValue(value: number, unit = '', step = 0.01) {
  if (!unit) return Math.round(value * 100) + '%';
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return value.toLocaleString('en-US', { maximumFractionDigits: decimals }) + ' ' + unit;
}

export function BasicControl({ label, value, min = 0, max = 1, step = 0.01, unit, onChange }: ControlProps) {
  return <label className="control">
    <span>{label}</span>
    <output>{formatValue(value, unit, step)}</output>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.valueAsNumber)} />
  </label>;
}
