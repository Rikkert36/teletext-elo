import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Album, { AlbumSection, albumSlotOrder } from '../components/Album';
import AlbumChoice from '../components/AlbumChoice';
import CardViewer from '../components/CardViewer';
import GameShell from '../components/GameShell';
import PackOpener from '../components/PackOpener';
import LedgerCorner from '../components/LedgerCorner';
import PackTile from '../components/PackTile';
import SigningLedger from '../components/SigningLedger';
import { CollectionState, GrantOptions, httpCardsClient } from '../clients/cardsClient';
import {
  MIN_GAMES,
  Pack,
  RevealedCard,
  SelectablePlayer,
  splitName,
} from '../mock/cardMock';
import { CoverId } from '../utils/albumLeather';
import '../styles/game.css';

const PLAYER_KEY = 'tafelvoetbal.cards.playerId';
const FAST_KEY = 'tafelvoetbal.cards.fastOpen';
const METER_CHUNKS = 24;

/**
 * The test panel. Still on, and still carrying its pack buttons — but those are stubs
 * until the gift endpoint exists, because a pack cannot be invented in the browser any
 * more. See `grant`.
 *
 * What does work is what is a row on the server: emptying a collection and the legends
 * latch. Plus `snel openen`, which was always client-side.
 *
 * It wants to go behind a debug flag rather than a constant, and the pack buttons want
 * wiring to the grant endpoint. Both are the next slice.
 */
const SHOW_DEBUG = true;

/** The seam. Everything behind it is a real call now. */
const client = httpCardsClient;

const forget = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* private browsing — there was nothing stored to forget */
  }
};

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private browsing — the choice just will not persist */
  }
};

const CollectionPage: React.FC = () => {
  const [players, setPlayers] = useState<SelectablePlayer[]>([]);
  const [player, setPlayer] = useState<SelectablePlayer | null>(null);
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const [openingPack, setOpeningPack] = useState<Pack | null>(null);
  /**
   * True from the tear until the last card has settled — *not* for as long as the
   * opener is mounted. A sealed packet lying on the stage is a decision you have not
   * taken yet, so the pile beside it stays live and you can still change your mind.
   *
   * It is raised by the opener's `onStart` and lowered by its `onFinished`, so
   * **every path that unmounts the opener has to lower it too**: an opener that is
   * taken off screen never reaches `onFinished`, and the flag would then sit true
   * for the rest of the session with the shelf dimmed and inert behind it. That is
   * exactly what "terug naar het album" used to do. `closeOpener` is the one way
   * out, and `choosePlayer` and `openPack` clear it for the same reason.
   */
  const [revealing, setRevealing] = useState(false);
  /** Index into `slotOrder` of the card being looked at, or null for none. */
  const [viewing, setViewing] = useState<number | null>(null);
  const [fastMode, setFastMode] = useState(() => read(FAST_KEY) === 'true');
  /**
   * Whatever went wrong, in Dutch. Branched on before anything else.
   *
   * Without it a failed read leaves `collection` null forever, and the state machine reads
   * null as "no album yet" — so an unreachable API would invite you to choose a leather
   * and then fail the write too. An error has to be its own state, not the absence of one.
   */
  const [error, setError] = useState<string | null>(null);
  /**
   * True from the moment a leather is picked until the ceremony reports itself finished.
   *
   * This is what keeps `AlbumChoice` mounted across the write: the response arrives with
   * `album` set, and branching on that alone would swap the component out mid-stamp on a
   * fast server. The sequence decides when it is over, not the network.
   */
  const [creating, setCreating] = useState(false);
  /**
   * True while the remembered name is still being turned back into a player.
   *
   * The pick is stored as an id, and an id alone is not a player — the games gate and the
   * cover both need the record — so it cannot be restored until the player list lands.
   * That one round trip is long enough to see, and without this flag it renders as the
   * ledger: a returning visitor was shown the front door for a moment and then had it
   * replaced by their own album, which also made the collection request that follows look
   * like it was fired with no name set.
   *
   * Seeded from localStorage synchronously, so it is only ever true when there is in fact
   * something to restore. Nobody with no remembered name waits for anything.
   */
  const [restoring, setRestoring] = useState(() => read(PLAYER_KEY) !== null);
  /**
   * The album was bound a moment ago, in this session.
   *
   * Only the book's invitation line uses it. Session state rather than something derived
   * from `album.createdAt`, because the question is not "is this album new" but "did you
   * just watch this book being made" — somebody returning tomorrow to a book they never
   * opened is a different case, and the album answers that one itself off its saved
   * position.
   */
  const [justBound, setJustBound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void client
      .getSelectablePlayers()
      .then((list) => {
        if (cancelled) return;
        setPlayers(list);

        const remembered = read(PLAYER_KEY);
        const found = list.find((p) => p.id === remembered);
        if (found) setPlayer(found);
      })
      .catch((reason) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('[kaarten] GET /api/players mislukt', reason);
        setError('De spelerslijst is niet op te halen. Draait de API?');
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async (playerId: string) => {
    try {
      setCollection(await client.getCollection(playerId));
      setError(null);
    } catch (reason) {
      /*
       * Loud, for the same reason the pool fetch is: a card page that quietly degrades to
       * something plausible is indistinguishable from a working one.
       *
       * A 404 gets its own message, because it has two very different causes that the
       * status code alone cannot separate — the player genuinely not existing, or the
       * *route* not existing because the API is an older build than this page. The second
       * is overwhelmingly the likelier one during development, and it cost a round of
       * confusion the first time: the endpoint returns 404 only for an unknown player by
       * design, so a 404 for a player you just picked off the list looks impossible.
       */
      const missing = reason instanceof Error && reason.message.startsWith('404');

      // eslint-disable-next-line no-console
      console.warn('[kaarten] GET /api/collections mislukt', reason);

      setError(
        missing
          ? 'Deze speler bestaat niet — of de API is een oudere build zonder ' +
              '/api/collections. Herstart de API en probeer het opnieuw.'
          : 'Je collectie is niet op te halen. Draait de API, en is de migratie uitgevoerd?',
      );
    }
  }, []);

  useEffect(() => {
    if (player) void refresh(player.id);
  }, [player, refresh]);

  const choosePlayer = (next: SelectablePlayer) => {
    setPlayer(next);
    write(PLAYER_KEY, next.id);
    setOpeningPack(null);
    setRevealing(false);
    setViewing(null);
    setCreating(false);
    // Somebody else's book, which you did not watch being bound.
    setJustBound(false);
    /*
     * Cleared, not left to be replaced.
     *
     * Two things go wrong otherwise, and both are visible. The stale collection's `album`
     * belongs to the *previous* player, so switching to someone who has not started yet
     * shows their predecessor's book with the new owner's name on the cover for a tick;
     * and on the way back, a null collection is indistinguishable from "no album", so a
     * returning visitor with a remembered name flashes the cover-choice table before their
     * own album. The loading branch below is what covers the gap.
     */
    setCollection(null);
  };

  /**
   * A leather was picked. Fires at the *start* of the ceremony, so the write happens while
   * the book travels and the name goes on rather than after it.
   *
   * The response is applied straight away — it is the whole page, so no refetch is needed
   * and a second one would be another full leaderboard replay — but `creating` keeps the
   * ceremony on screen until it says it is done.
   */
  const chooseCover = (cover: CoverId) => {
    if (!player) return;
    setCreating(true);

    void client
      .createAlbum(player.id, cover)
      .then(setCollection)
      .catch((reason) => {
        // eslint-disable-next-line no-console
        console.warn('[kaarten] POST /api/collections/create mislukt', reason);
        setError('Je album is niet aan te maken. Probeer het nog eens.');
        setCreating(false);
      });
  };

  /**
   * Picking a packet off the shelf. Reachable from the album *and* from the results
   * of the packet before it, which is the whole point of keeping the shelf up.
   *
   * `revealing` is reset here rather than relying on the opener remounting: the new
   * opener starts sealed and its `onStart` has not fired yet, so without this the
   * pile would stay inert until the second packet was torn.
   */
  const openPack = (next: Pack) => {
    /* The shelf is behind the viewer's scrim and so unreachable while one is open,
       but the opener would be layered under a viewer left mounted over it. */
    setViewing(null);
    setRevealing(false);
    setOpeningPack(next);
  };

  /**
   * Putting the opener away. The only way out of it.
   *
   * Clears `revealing` as well as the packet — see the flag's note. This used to be
   * a bare `setOpeningPack(null)`, which meant that leaving mid-reveal unmounted the
   * one component that would ever have lowered the flag, and the shelf stayed dimmed
   * and unclickable until the page was reloaded.
   *
   * The button that calls it is hidden for the length of the reveal anyway, so this
   * is now the guard rather than the fix — but the flag's lifetime should be a
   * property of the page, not of a callback that may never arrive.
   */
  const closeOpener = () => {
    setOpeningPack(null);
    setRevealing(false);
  };

  const toggleFast = () => {
    const next = !fastMode;
    setFastMode(next);
    write(FAST_KEY, String(next));
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    collection?.owned.forEach((owned) => map.set(owned.playerId, owned.count));
    return map;
  }, [collection]);

  /*
   * One book, one sequence. Legends are not a separate view behind a tab, and no
   * longer a block of pages bolted onto the end either — they are **shuffled in
   * among the actives by rating**, so an icoon turns up on the spread its rating
   * earns it rather than in a legends annexe.
   *
   * That is what makes the unlock feel like the book growing rather than gaining
   * an appendix: every spread you already knew gets denser, and the rarest card in
   * the album is now an icoon sitting at the very end past the best active player.
   * Before the unlock they are absent entirely.
   *
   * Consequence worth knowing: an empty slot no longer tells you whether it is an
   * active or a legend, because silhouettes are deliberately identical and not
   * marked as icoons. That used to be readable from which pages you were on.
   */
  const sections: AlbumSection[] = useMemo(() => {
    if (!collection) return [];

    const unlocked = collection.legendsUnlocked ? collection.legends : [];

    /*
     * Ascending by rating, so the book builds toward its best page: you open on
     * the commons and the last spread is the players you are least likely to
     * hold. Sorted explicitly rather than reversed, because the source order is
     * the leaderboard's and should not be relied on here.
     *
     * A legend sorts on the same field as everyone else — `visibleRating` carries
     * their all-time high rather than a current rating, which is exactly the
     * number their card is rated on, so no special case is needed here.
     */
    const players = [...collection.pool, ...unlocked].sort(
      (a, b) => a.visibleRating - b.visibleRating,
    );

    return [{ title: 'Spelers', players, counts }];
  }, [collection, counts]);

  const ownerName = player ? splitName(player.name).display : undefined;

  /*
   * Every slot the book prints, in printed order, for the card viewer to walk.
   *
   * Built by the same function the album renders from, and fed the same owner —
   * which affects the page list (the cover) and so must match, or the two disagree
   * about which page a card is on.
   */
  const slotOrder = useMemo(() => albumSlotOrder(sections, ownerName), [sections, ownerName]);

  /*
   * The album can shrink under the viewer — a different player is picked, or a
   * reveal refreshes the collection — so an index can outlive the slot it pointed
   * at, and it does so *during* the render that shrank the list, before any effect
   * gets a chance to tidy up. Hence the lookup rather than the index everywhere
   * below, with the effect only resetting the state afterwards. Closing is the right
   * answer rather than clamping: clamping silently shows a different card.
   */
  const viewingSlot = viewing === null ? undefined : slotOrder[viewing];

  useEffect(() => {
    setViewing((current) =>
      current === null || current < slotOrder.length ? current : null,
    );
  }, [slotOrder.length]);

  const ownedActive = collection
    ? collection.pool.filter((p) => (counts.get(p.id) ?? 0) > 0).length
    : 0;
  const totalActive = collection?.pool.length ?? 0;
  const totalCards = collection?.owned.reduce((sum, c) => sum + c.count, 0) ?? 0;
  const filledChunks =
    totalActive > 0 ? Math.round((ownedActive / totalActive) * METER_CHUNKS) : 0;

  /**
   * The games gate, derived from the **picked player** rather than from the response.
   *
   * `collection.eligible` says the same thing authoritatively, and the create endpoint
   * enforces it — but it is undefined for the whole fetch window, so branching on it would
   * flash the gate notice on every pick and again after every reveal. The picker already
   * carries the game count, so the check costs nothing here and is stable.
   */
  const eligible = !player || player.numberOfGames >= MIN_GAMES;

  /** The server's gate, for copy only, so the number quoted cannot drift from the rule. */
  const minGames = collection?.minGames ?? MIN_GAMES;

  /**
   * Whether there is an album to draw at all. Distinct from `collection === null`, which
   * means the read has not landed — see `choosePlayer`.
   */
  const hasAlbum = collection?.album != null;
  const showChoice = collection !== null && (creating || collection.album == null);

  const handleOpen = useCallback(
    async (pack: Pack): Promise<RevealedCard[]> =>
      player ? client.revealPack(player.id, pack.id) : [],
    [player],
  );

  const handleFinished = useCallback(() => {
    setRevealing(false);
    if (player) void refresh(player.id);
  }, [player, refresh]);

  /**
   * The pile, less the packet currently on the stage — that one is in your hands, not
   * lying on the table. It leaves the shelf on the click rather than on the refresh
   * at the end of the reveal, so the pile shrinks at the moment you pick one up.
   */
  const shelfPacks = useMemo(
    () => collection?.packs.filter((p) => p.id !== openingPack?.id) ?? [],
    [collection, openingPack],
  );

  /**
   * Hand this player a pack. **Not wired yet, deliberately.**
   *
   * It used to push a pack into a session-local sandbox inside the client. Packs are
   * derived from real games on the server now, so a pack cannot be invented in the
   * browser at all — the endpoint that hands somebody a specific one is the next slice,
   * and these options are the shape it has to take.
   *
   * Kept as a stub rather than deleted along with its buttons: the buttons carry the
   * reasoning for each ceremony level, and this is the one place that slice has to fill
   * in.
   *
   * The console rather than `setError`, which would replace the whole page with a notice
   * and need a reload to get out of — far too much for a scaffolding button.
   */
  const grant = (options: GrantOptions) => {
    // eslint-disable-next-line no-console
    console.warn(
      '[kaarten] Pakjes uitdelen bestaat nog niet. Pakjes komen sinds het claim-eindpunt ' +
        'van de server (wedstrijden van vandaag plus het dagelijkse pakje), dus dit wacht ' +
        'op het cadeau-eindpunt.',
      options,
    );
  };

  /**
   * The legends latch, flipped by hand. Development only, and a real row rather than a
   * client-side flag — the alternative is completing a 37-card set to see one icoon.
   */
  const toggleLegends = () => {
    if (!player) return;

    void client
      .setLegendsUnlocked(player.id, !collection?.legendsUnlocked)
      .then(setCollection)
      .catch((reason) => {
        // eslint-disable-next-line no-console
        console.warn('[kaarten] PUT /api/collections/legends mislukt', reason);
        setError(
          'De legendes omzetten lukt niet. Dit werkt alleen als de API in Development draait.',
        );
      });
  };

  /**
   * Back to the front door: forget who this browser is.
   *
   * The stored id is the *only* thing that makes this browser "you", so removing it is the
   * whole of signing out. Nothing on the server is touched — the album survives, which is
   * the point: this is for checking that a returning visitor lands on their own book
   * without a flash of the ledger, which needs the album to still be there.
   */
  const forgetPlayer = () => {
    forget(PLAYER_KEY);
    setPlayer(null);
    setCollection(null);
    setOpeningPack(null);
    setRevealing(false);
    setViewing(null);
    setCreating(false);
    setRestoring(false);
    setJustBound(false);
    setError(null);
  };

  /**
   * Back to the start of the story: no album, no cards, no packs.
   *
   * Server-side, because the album is a row — `mockDebug` writing to module state would
   * leave the real one in place and the two silently disagreeing, which is exactly the class
   * of bug the test panel is supposed to help find. Lands on the cover choice.
   */
  const emptyCollection = () => {
    if (!player) return;
    setCreating(false);
    // The ceremony is about to run again, and it sets this itself when it finishes.
    setJustBound(false);
    setViewing(null);
    setOpeningPack(null);
    setRevealing(false);

    void client
      .emptyCollection(player.id)
      .then(setCollection)
      .catch((reason) => {
        // eslint-disable-next-line no-console
        console.warn('[kaarten] DELETE /api/collections mislukt', reason);
        setError(
          'Leegmaken lukt niet. Dit werkt alleen als de API in Development draait.',
        );
      });
  };

  /* ---------------------------------------------------------------- */

  /*
   * **There is no header.** It held a type-ahead and a mute button, and both are gone.
   *
   * The picker was the last undisguised control on the table, and it was also the thing that
   * made reading a colleague's collection a matter of typing a different name into a box
   * that was already open. The design has always accepted that as *possible* — there is no
   * authentication and never will be — while not wanting to invite it, and an open text
   * field pointed at everybody's albums is an invitation. Signing out and back in through
   * the register is the same number of clicks and reads as a deliberate act.
   *
   * `snel openen` moved to the test panel, where it belongs: it skips the reveal, which is
   * the part of this feature people are here for, so it is a development convenience rather
   * than a setting.
   *
   * The mute button went for a different reason — see GameShell.
   */

  /*
   * Readouts belong to a book that exists. Gated on `hasAlbum` as well as the games gate,
   * or the cover-choice table gets "0/38 actieve spelers", an empty meter and "verzamel
   * alles voor de legendes" underneath it — counters for a collection nobody has started.
   */
  const footer = player && eligible && hasAlbum && (
    <>
      <span className="game-readout">
        <strong>
          {ownedActive}/{totalActive}
        </strong>{' '}
        actieve spelers
      </span>
      <div className="game-meter" style={{ flex: 1, minWidth: 160, maxWidth: 460 }}>
        {Array.from({ length: METER_CHUNKS }, (_, i) => (
          <span
            key={i}
            className={`game-meter__chunk${i < filledChunks ? '' : ' game-meter__chunk--empty'}`}
          />
        ))}
      </div>
      <span className="game-readout">
        <strong>{totalCards}</strong> kaarten
      </span>
      <span className="game-muted">
        {collection?.legendsUnlocked
          ? 'legendes ontgrendeld'
          : 'verzamel alles voor de legendes'}
      </span>
    </>
  );

  /*
   * Seven states, and **the order is the design**. Four of the orderings are bugs:
   *
   *   error       first, or a failed read looks like "no album" and invites a cover pick
   *               whose write then fails too.
   *   restoring   before the ledger, or a returning visitor is shown the front door for a
   *               round trip and then has it swapped for their own album.
   *   no player   the ledger. The front door.
   *   loading     render nothing. Without it a returning visitor flashes the cover-choice
   *               table before their own album, because a null collection and a null
   *               `album` are indistinguishable.
   *   under gate  before the album check, or an under-gate player spends the whole
   *               ceremony and lands on the notice with it used up. (The server refuses
   *               the write as well; this is what stops them being offered it.)
   *   no album    the opening sequence, held on screen by `creating` rather than by the
   *               response.
   *   otherwise   the book.
   */
  // No title or subtitle: the book's own cover says whose album it is.
  return (
    <GameShell footer={footer || undefined}>
      {error ? (
        <div className="game-notice">{error}</div>
      ) : restoring ? (
        /* A name is remembered but not yet resolved. Blank, not the ledger — see
           `restoring`. This is the only reason the front door is ever withheld. */
        null
      ) : !player ? (
        <SigningLedger players={players} minGames={minGames} onChoose={choosePlayer} />
      ) : collection === null ? (
        /* The read is in flight. Deliberately blank rather than a spinner: it is one
           request against a local API, and a spinner that flashes for 80ms is noise. */
        null
      ) : !eligible ? (
        <div className="game-notice">
          {splitName(player.name).display} heeft {player.numberOfGames} wedstrijden
          gespeeld.
          <br />
          Vanaf {minGames} wedstrijden gaat je album open.
        </div>
      ) : (
        /*
          One layout for **every** signed-in state — the cover choice, the book and the
          opener all take the middle of it in turn.

          The choice used to sit outside this container, and folding it in is what gives the
          register a single home: it is a thing lying on the table, so it has to be on the
          table for as long as you are at it, including before there is a book. The margins
          are out of flow and `--shelf-room` is worked out from the viewport rather than
          measured off whatever is currently in the middle, so nothing in either margin can
          move what is between them.

          The book being replaced rather than dimmed is deliberate: this is the one
          screen where it genuinely is not the subject, and leaving it under the
          reveal would put a second lit object inside the vignette.
        */
        <div className={`album-layout${openingPack ? ' album-layout--opening' : ''}`}>
          {/*
            No plate, no "Jouw pakjes" label, and nothing at all when there are none.
            The packets are objects lying next to the book — a titled panel around them
            is the one piece of furniture on this page that admits to being a UI, and
            it was also what the top row clipped against on hover.

            An empty column is worse than no column, so the aside goes away entirely
            when there is nothing to put in it. That used to move the book — it is
            out of flow now, and the book is centred on the stage whether the aside
            is there or not. See `.album-layout` in game.css.
          */}
          {shelfPacks.length > 0 && !showChoice ? (
            <aside className={`album-side${revealing ? ' album-side--set-aside' : ''}`}>
              <div className="pack-shelf">
                {shelfPacks.map((pack) => (
                  <PackTile key={pack.id} pack={pack} onOpen={openPack} />
                ))}
              </div>
            </aside>
          ) : null}

          {/*
            The register, in the opposite margin: how you leave, lying next to what you came
            for. Stood down while a reveal is running and while a book is being stamped —
            you cannot sign yourself out with a card in the air, and a way to abandon a book
            halfway through having your name blocked into it is not a thing to offer.
          */}
          <aside
            className={`album-register${
              revealing || creating ? ' album-register--set-aside' : ''
            }`}
          >
            <LedgerCorner name={ownerName ?? player.name} onSignOut={forgetPlayer} />
          </aside>

          <div className="album-main">
            {showChoice ? (
              <AlbumChoice
                stampName={ownerName}
                onChoose={chooseCover}
                onDone={() => {
                  setCreating(false);
                  setJustBound(true);
                }}
              />
            ) : openingPack ? (
              <>
                <PackOpener
                  key={openingPack.id}
                  pack={openingPack}
                  onOpen={() => handleOpen(openingPack)}
                  onStart={() => setRevealing(true)}
                  onFinished={handleFinished}
                  fastMode={fastMode}
                />
                {/*
                  The way back, and it is **not offered while the reveal is
                  running**. The shelf beside the opener already stands down for
                  that window — you cannot pick up a second packet with your hands
                  full — and a live exit next to it was the one control that
                  contradicted that, as well as the one way to strand `revealing`
                  true.

                  Hidden rather than unmounted, and the row keeps its box. Removing
                  it would shorten the column at the exact moment the first card is
                  rising out of the wrapper, and everything about this stage is
                  built so that nothing moves from the click to the last card — see
                  `.opener__stage`'s note, and the `&nbsp;` the opener's own hint
                  line renders during the tear for precisely this reason.
                */}
                <div className="game-row" style={{ justifyContent: 'center' }}>
                  <button
                    type="button"
                    className={`game-button${revealing ? ' game-button--away' : ''}`}
                    onClick={closeOpener}
                  >
                    terug naar het album
                  </button>
                </div>
              </>
            ) : (
              <Album
                /*
                  Keyed on the owner, so switching player is a different book rather than
                  the same book showing something else. The album reads its saved reading
                  position once, at mount, from a per-owner key — without the remount it
                  would keep the previous person's page and then save it under the new
                  person's name.
                */
                key={player.id}
                sections={sections}
                owner={ownerName}
                ownerId={player.id}
                cover={collection.album?.cover}
                /*
                  The last beat of the opening sequence, and the only one that is words.
                  Both actions, because both are undiscoverable: the cover is the button,
                  and the page edges are the only other control on the book. The album drops
                  it the moment the cover is turned.
                */
                hint={justBound ? 'Je album ligt klaar! Open het en begin je verzameling!' : undefined}
                onCardOpen={(id) => {
                  const found = slotOrder.findIndex((s) => s.card.player.id === id);
                  if (found >= 0) setViewing(found);
                }}
                /* Keeps the book on the spread of whatever the viewer is showing. */
                focusPlayerId={viewingSlot?.card.player.id ?? null}
              />
            )}
          </div>
        </div>
      )}

      {/*
        `--debug` is what exempts this panel from the table's rule that nothing on
        it gets a panel — see game.css. It is scaffolding, and it has to stay
        readable rather than in character.
      */}
      {SHOW_DEBUG ? (
        <div className="game-plate game-plate--debug" style={{ marginTop: 18 }}>
          <span className="game-plate__label">Testpaneel</span>
          <div className="game-row">
            {/*
              The pack buttons are **kept and not yet wired**. They used to write into a
              session-local sandbox; packs are derived from real games on the server now,
              so there is no client-side way to conjure one and `grant` below says so
              rather than pretending.

              They are the obvious first caller for the grant endpoint — handing a named
              player, or everybody, a specific pack is the one grant-shaped thing left in
              the design — so they stay put and that slice wires them up. Deleting and
              re-adding them would only lose the copy and the reasoning attached to each.
            */}
            {[1, 3, 5].map((size) => (
              <button
                key={size}
                type="button"
                className="game-button game-button--small"
                onClick={() => grant({ size, reason: 'testpakje' })}
                title="Wacht op het cadeau-eindpunt — zie de console"
              >
                pakje ({size} {size === 1 ? 'kaart' : 'kaarten'})
              </button>
            ))}
            {/*
              One card each, so a single ceremony level can be watched in
              isolation. Guaranteed by level rather than tier: 75-79 and 80-84
              are both Goud, so a tier guarantee cannot separate them.

              90+ is a band, not a player. It used to be a `guaranteePlayerId`
              pinned to the top of the active pool — which was Petar and stayed
              Petar even after he was no longer 90+, and could never reach a legend
              at all. As a level it draws uniformly from whoever actually clears 90
              right now, which with legends on includes the icoons — Roel Loonen at
              91 is currently the only card above Petar in the game.

              The draw is server-side now, so a level guarantee is something the grant
              endpoint will have to implement in `PackService.Roll`. Worth knowing that
              the fall-through is the same either way: if nobody clears the level, an
              ordinary weighted draw happens rather than a failure.
            */}
            {[
              { level: 1, label: '1 kaart (75+)' },
              { level: 2, label: '1 kaart (80+)' },
              { level: 3, label: '1 kaart (85+)' },
              { level: 4, label: '1 kaart (90+)' },
            ].map(({ level, label }) => (
              <button
                key={level}
                type="button"
                className="game-button game-button--small"
                onClick={() =>
                  grant({ size: 1, reason: `test — niveau ${level}`, guaranteeLevel: level })
                }
                title="Wacht op het cadeau-eindpunt — zie de console"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="game-button game-button--small"
              onClick={toggleLegends}
              disabled={!player || !hasAlbum}
              title="Zet de legendes-latch om, zonder de hele actieve set te verzamelen"
            >
              legendes {collection?.legendsUnlocked ? 'uit' : 'aan'}
            </button>
            {/*
              The two buttons that put the page back to a state you cannot otherwise
              reach twice. They undo different things on purpose, and the pairing is the
              useful part:

                leegmaken  destroys the album on the server  -> the cover choice
                resetten   forgets who this browser is       -> the ledger

              So `leegmaken` is how the opening ceremony gets watched again, and
              `resetten` is how the *returning visitor* path gets tested — that one needs
              the album to still exist, which is exactly why it does not touch it.
            */}
            <button
              type="button"
              className="game-button game-button--small"
              onClick={emptyCollection}
              disabled={!player}
              title="Album weg, kaarten weg — terug naar het kiezen van een kaft"
            >
              leegmaken
            </button>
            {/*
              No "resetten" any more. Signing out is the register lying on the table beside
              the book, which is a real part of the page rather than scaffolding — and a
              second way to do it, on a panel that is going to be deleted, would be one more
              thing to remember to remove.

              No "kansen" either: it drew a few thousand packs in the browser to check the
              observed frequencies against the odds table, and the browser cannot draw a
              pack any more. That check is `InclusionProbabilitiesSumToThePackSize` in
              UnitTests/PackTests.cs, where it runs on every build rather than when
              somebody remembers to press a button.
            */}
            {/*
              Here rather than in the header, because it skips the reveal — which is the part
              of this feature everybody is actually here for. That makes it a development
              convenience, not a setting somebody should be nudged toward.
            */}
            <label className="game-check">
              <input type="checkbox" checked={fastMode} onChange={toggleFast} />
              snel openen
            </label>
          </div>
        </div>
      ) : null}

      {/*
        The viewer mounts here, as the last child of the shell — the same place
        `.opener__bloom` proves works. `.game-stage` is `overflow: hidden` and
        `position: relative` but carries no transform, filter or perspective, so a
        fixed child escapes the clip.

        **Never inside `.album`**, which sets `perspective: 2600px`: that both makes
        it a containing block for fixed descendants and drops whatever is in it into
        the turning leaves' depth sort.
      */}
      {viewing !== null && viewingSlot ? (
        <CardViewer
          slots={slotOrder}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </GameShell>
  );
};

export default CollectionPage;
