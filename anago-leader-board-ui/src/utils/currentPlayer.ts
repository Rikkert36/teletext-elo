/**
 * Who this browser is.
 *
 * The card layer has no authentication and never will — signing in is writing your name
 * in the ledger, and the whole of "staying signed in" is this one id in localStorage.
 * It lives here rather than in `CollectionPage` because it is no longer only that page's
 * business: the match form defaults its first slot to whoever is signed in, and a second
 * copy of the key string in a second file is the kind of drift nothing would ever surface.
 *
 * Reading is guarded because private browsing throws on `localStorage` rather than
 * returning null — a signed-out browser and an unreachable store are the same answer
 * here, so both come back as `null`.
 */
export const CURRENT_PLAYER_KEY = 'tafelvoetbal.cards.playerId';

/** The signed-in player's id, or null if nobody has signed in on this browser. */
export const readCurrentPlayerId = (): string | null => {
  try {
    return window.localStorage.getItem(CURRENT_PLAYER_KEY);
  } catch {
    return null;
  }
};
