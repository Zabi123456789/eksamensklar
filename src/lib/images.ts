// Egne bilder per tema. Bildene lastes opp av brukeren, skaleres ned og lagres
// bare i denne nettleseren (localStorage), som resten av appen.

import type { ThemeId } from './themes';

const key = (theme: ThemeId) => `eksamensklar:img:${theme}`;

/** Maks bredde på lagret bilde. Holder størrelsen godt under grensen for localStorage. */
const MAX_WIDTH = 1600;

export function loadThemeImage(theme: ThemeId): string | null {
  try {
    return localStorage.getItem(key(theme));
  } catch {
    return null;
  }
}

/** Returnerer false hvis bildet ikke fikk plass. */
export function saveThemeImage(theme: ThemeId, dataUrl: string | null): boolean {
  try {
    if (dataUrl) localStorage.setItem(key(theme), dataUrl);
    else localStorage.removeItem(key(theme));
    return true;
  } catch {
    return false;
  }
}

/** Leser en bildefil og skalerer den ned til en JPEG-data-URL. */
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_WIDTH / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Kunne ikke lese bildet'));
    };
    img.src = url;
  });
}
