import type { ScaleId } from '../../types/audio';

export const scales: Record<ScaleId, number[]> = {
  lydian: [0, 2, 4, 6, 7, 9, 11, 14],
  dorian: [0, 2, 3, 5, 7, 9, 10, 14],
  minor_pentatonic: [0, 3, 5, 7, 10, 12, 15],
  sus2_drone: [0, 2, 7, 12, 14, 19],
  aeolian: [0, 2, 3, 5, 7, 8, 10, 12],
};

const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const midiToHz = (midi: number, tuning: 432 | 440 = 440) => tuning * 2 ** ((midi - 69) / 12);
export const noteName = (midi: number) => names[midi % 12] + (Math.floor(midi / 12) - 1);
export function initialVoicing(root: number, scale: ScaleId) {
  const tone = scale === 'lydian' ? 4 : scale === 'sus2_drone' ? 2 : 3;
  const upper = scale === 'minor_pentatonic' ? 15 : 14;
  return [root, root + 7, root + 12, root + 12 + tone, root + 12 + upper];
}

export function neighboringNotes(root: number, scale: ScaleId, notes: number[], voice: number) {
  const degrees = new Set(scales[scale].map((degree) => degree % 12));
  return Array.from({ length: 11 }, (_, index) => notes[voice] - 5 + index).filter((note) =>
    note >= root && note <= root + 36 && degrees.has((note - root) % 12)
    && notes.every((other, index) => Math.abs(note - other) > (index === voice ? 0 : 1)));
}
