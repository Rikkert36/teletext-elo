/**
 * Which visual direction the stage takes.
 *
 * Temporary — this exists so the five candidates can be compared live. Once one
 * is chosen, fold its tokens into `.game-stage` in game.css, delete the other
 * theme blocks, and remove this module along with the switcher in the test panel.
 *
 * Applied as a class on <html> so a single class swap re-themes the header,
 * footer, plates, buttons, tabs, meter and the book's inside covers at once.
 */

export const STAGE_THEMES = [
  { id: 'teletext', label: 'A · teletekst' },
  { id: 'broadcast', label: 'B · sportuitzending' },
  { id: 'scrapbook', label: 'C · plakboek' },
  { id: 'vitrine', label: 'D · vitrine' },
  { id: 'arcade', label: 'E · arcade' },
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
  root.classList.add(`stage-${current}`);
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
