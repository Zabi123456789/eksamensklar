/** Dempede emnefarger som fungerer på varm, lys bakgrunn. */
export const PALETTE = ['#3d5a80', '#a4475f', '#4f7a5a', '#b07d2b', '#6b4f8a', '#2f7378', '#a8483a', '#6d7a35'];

/** Den gamle, mettede paletten. Lagrede emner med disse fargene får tilsvarende ny farge. */
const OLD_PALETTE = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#65a30d'];

export function migrateColor(color: string): string {
  const i = OLD_PALETTE.indexOf(color.toLowerCase());
  return i >= 0 ? PALETTE[i] : color;
}

export function nextColor(used: string[]): string {
  return PALETTE.find((c) => !used.includes(c)) ?? PALETTE[used.length % PALETTE.length];
}
