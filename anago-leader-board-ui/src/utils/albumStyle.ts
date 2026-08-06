/**
 * What kind of album the book is.
 *
 * Temporary, exactly like `stageTheme.ts` — it exists so the candidates can be
 * compared live. Once one is chosen, fold its rules into the base album styles,
 * delete the rest, and remove this module along with the switcher in the test
 * panel.
 *
 * Orthogonal to the stage theme: the stage is the screen the book sits on, this
 * is the book itself. One overlap to know about — the stage themes set
 * `--book-inside` on <html> so the inside covers never clash with the surface.
 * An album style setting it on `.album` wins, because that is closer to the
 * element. That is deliberate: once the book has an identity of its own, it
 * should own its own materials.
 *
 * Applied as a class on `.album` rather than on <html>, since nothing outside
 * the book is affected.
 */

export const ALBUM_STYLES = [
  { id: 'leder', label: '1 · leer' },
  { id: 'panini', label: '2 · panini' },
  { id: 'veld', label: '3 · speelveld' },
  { id: 'stadion', label: '4 · stadion' },
  { id: 'kauwgom', label: '5 · kauwgom' },
  { id: 'olymp', label: '6 · olympus' },
] as const;

export type AlbumStyle = (typeof ALBUM_STYLES)[number]['id'];

const KEY = 'tafelvoetbal.cards.albumStyle';
const DEFAULT_STYLE: AlbumStyle = 'leder';

const isValid = (value: string | null): value is AlbumStyle =>
  ALBUM_STYLES.some((style) => style.id === value);

export const getAlbumStyle = (): AlbumStyle => {
  try {
    const stored = window.localStorage.getItem(KEY);
    return isValid(stored) ? stored : DEFAULT_STYLE;
  } catch {
    return DEFAULT_STYLE;
  }
};

export const setAlbumStyle = (style: AlbumStyle): AlbumStyle => {
  try {
    window.localStorage.setItem(KEY, style);
  } catch {
    /* private browsing — the choice just will not persist */
  }
  return style;
};
