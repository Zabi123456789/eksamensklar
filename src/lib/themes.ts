// Visuelle temaer. Fargene og mønstrene ligger i styles.css under [data-theme="…"];
// her ligger tekster, skrift og forhåndsvisning for velgeren.

export type ThemeId = 'classic' | 'demon-slayer' | 'avatar' | 'aot' | 'vinland' | 'jojo' | 'hxh' | 'jjk' | 'marvel';

export interface Theme {
  id: ThemeId;
  name: string;
  tagline: string;
  /** Tekst på tidtakeren i fokus- og pausefasen. */
  focusLabel: string;
  breakLabel: string;
  doneTitle: string;
  /** Google Fonts-familier temaet trenger (lastes når temaet velges). */
  fonts?: string;
  /** Tre farger til forhåndsvisningen i velgeren: bakgrunn, tekst, aksent. */
  swatch: [string, string, string];
}

export const THEMES: Theme[] = [
  {
    id: 'classic',
    name: 'Klassisk',
    tagline: 'Din personlige leseplan',
    focusLabel: 'Fokus',
    breakLabel: 'Pause',
    doneTitle: 'Godt jobbet',
    swatch: ['#f6f3ec', '#1c1b19', '#b5532f'],
  },
  {
    id: 'demon-slayer',
    name: 'Demon Slayer',
    tagline: 'Total konsentrasjon, hele tiden',
    focusLabel: 'Pusteteknikk: total konsentrasjon',
    breakLabel: 'Hvil før neste form',
    doneTitle: 'Demonen er beseiret',
    fonts: 'Shippori+Mincho+B1:wght@700;800',
    swatch: ['#121110', '#f1e9dc', '#d1253a'],
  },
  {
    id: 'avatar',
    name: 'Avatar',
    tagline: 'Mestre alle fire fagene',
    focusLabel: 'Meditasjon',
    breakLabel: 'Te-pause med onkel Iroh',
    doneTitle: 'Et element er mestret',
    fonts: 'Marcellus',
    swatch: ['#f3e7cd', '#2b2118', '#e07b24'],
  },
  {
    id: 'aot',
    name: 'Attack on Titan',
    tagline: 'Vi dedikerer våre hjerter til pensum',
    focusLabel: 'Ekspedisjon utenfor murene',
    breakLabel: 'Tilbake innenfor murene',
    doneTitle: 'Ekspedisjonen er fullført',
    fonts: 'Oswald:wght@500;600;700',
    swatch: ['#1c1a16', '#e9e1d0', '#4f7a4a'],
  },
  {
    id: 'vinland',
    name: 'Vinland Saga',
    tagline: 'Ingen fiender. Bare eksamener.',
    focusLabel: 'Arbeid på åkeren',
    breakLabel: 'Hvil ved bålet',
    doneTitle: 'En ny dag på gården',
    fonts: 'Cinzel:wght@500;700',
    swatch: ['#141a1f', '#e3e7e9', '#c9a24a'],
  },
  {
    id: 'jojo',
    name: 'JoJo',
    tagline: 'Ditt bisarre eventyr mot eksamen',
    focusLabel: 'Stand aktivert',
    breakLabel: 'To be continued →',
    doneTitle: 'Yare yare daze',
    fonts: 'Bangers',
    swatch: ['#fff1c9', '#2a0b3d', '#e6007e'],
  },
  {
    id: 'hxh',
    name: 'Hunter × Hunter',
    tagline: 'Hunter-eksamenen venter',
    focusLabel: 'Nen: Ren',
    breakLabel: 'Nen: Zetsu',
    doneTitle: 'Eksamensfasen er bestått',
    fonts: 'Dela+Gothic+One',
    swatch: ['#eef5e4', '#13261a', '#2f8f3a'],
  },
  {
    id: 'jjk',
    name: 'Jujutsu Kaisen',
    tagline: 'Forbannet eksamensenergi',
    focusLabel: 'Domeneutvidelse',
    breakLabel: 'Omvendt forbannet teknikk: hvile',
    doneTitle: 'Forbannelsen er utdrevet',
    fonts: 'Dela+Gothic+One',
    swatch: ['#0d0b15', '#ece9f7', '#7b5cff'],
  },
  {
    id: 'marvel',
    name: 'Marvel',
    tagline: 'Med stor kraft følger stort pensum',
    focusLabel: 'Avengers, samles',
    breakLabel: 'Shawarma-pause',
    doneTitle: 'Oppdrag fullført',
    fonts: 'Bebas+Neue',
    swatch: ['#101218', '#f2f2f2', '#e62429'],
  },
];

export function themeFor(id?: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
