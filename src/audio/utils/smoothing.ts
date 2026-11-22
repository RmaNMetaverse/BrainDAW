export function smoothParam(param: AudioParam, target: number, now: number, timeConstant = 0.04): void {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
  else param.cancelScheduledValues(now);
  param.setTargetAtTime(target, now, timeConstant);
}

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (start: number, end: number, fraction: number) => start + (end - start) * fraction;

export function equalPowerCrossfade(fraction: number): [number, number] {
  const angle = clamp(fraction) * Math.PI * 0.5;
  return [Math.cos(angle), Math.sin(angle)];
}
