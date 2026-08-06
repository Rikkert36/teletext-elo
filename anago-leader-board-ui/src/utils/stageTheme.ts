/**
 * Which visual direction the stage takes.
 *
 * Temporary — this exists so the candidates can be compared live. Once one is
 * chosen, fold its tokens into `.game-stage` in game.css, delete the other
 * theme blocks, and remove this module along with the switcher in the test panel.
 *
 * Applied as a class on <html> so a single class swap re-themes the header,
 * footer, plates, buttons, tabs, meter and the book's inside covers at once.
 *
 * **Two families.** A–E (game.css) treat the stage as a *screen* the book is
 * displayed on. F–J (tabletop.css) treat it as a *table the book is lying on*,
 * seen from straight above — so everything else on the page has to become an
 * object on that table too: paper dockets, a card of notes, real packets. They
 * additionally get a `stage-tabletop` class, which carries everything the five
 * share, so a tabletop theme only has to describe its own surface.
 */

export const STAGE_THEMES = [
  { id: 'teletext', label: 'A · teletekst' },
  { id: 'broadcast', label: 'B · sportuitzending' },
  { id: 'scrapbook', label: 'C · plakboek' },
  { id: 'vitrine', label: 'D · vitrine' },
  { id: 'arcade', label: 'E · arcade' },
  /* Named for the timber, because the timber is the thing being judged. */
  { id: 'eiken', label: 'F · eiken', tabletop: true },
  { id: 'grenen', label: 'G · grenen', tabletop: true },
  { id: 'mahonie', label: 'H · mahonie', tabletop: true },
  { id: 'beuken', label: 'I · beuken', tabletop: true },
  { id: 'noten', label: 'J · noten', tabletop: true },
] as const;

export type StageTheme = (typeof STAGE_THEMES)[number]['id'];

const KEY = 'tafelvoetbal.cards.stageTheme';
const DEFAULT_THEME: StageTheme = 'teletext';

const isValid = (value: string | null): value is StageTheme =>
  STAGE_THEMES.some((theme) => theme.id === value);

const load = (): StageTheme => {
  try {
    const stored = window.localStorage.getItem(KEY);
    return isValid(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

let current = load();

const publish = (): void => {
  const root = document.documentElement;
  STAGE_THEMES.forEach((theme) => root.classList.remove(`stage-${theme.id}`));
  root.classList.remove('stage-tabletop');
  root.classList.add(`stage-${current}`);

  const theme = STAGE_THEMES.find((t) => t.id === current);
  if (theme && 'tabletop' in theme) root.classList.add('stage-tabletop');
};

publish();

export const getStageTheme = (): StageTheme => current;

export const setStageTheme = (theme: StageTheme): StageTheme => {
  current = theme;
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* private browsing — applies for this session only */
  }
  publish();
  return current;
};
