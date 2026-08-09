import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Album, { AlbumSection, albumSlotOrder } from '../components/Album';
import CardViewer from '../components/CardViewer';
import GameShell from '../components/GameShell';
import PackOpener from '../components/PackOpener';
import PackTile from '../components/PackTile';
import PlayerPicker from '../components/PlayerPicker';
import { CollectionState, mockCardsClient, mockDebug } from '../clients/cardsClient';
import {
  CardPlayer,
  MIN_GAMES,
  Pack,
  RevealedCard,
  activePool,
  splitName,
} from '../mock/cardMock';
import '../styles/game.css';

const PLAYER_KEY = 'tafelvoetbal.cards.playerId';
const FAST_KEY = 'tafelvoetbal.cards.fastOpen';
const METER_CHUNKS = 24;

/** Phase 1 only. Delete along with mock/cardMock.ts when the backend lands. */
const SHOW_DEBUG = true;

const client = mockCardsClient;

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
  const [players, setPlayers] = useState<CardPlayer[]>([]);
  const [player, setPlayer] = useState<CardPlayer | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    void client.getSelectablePlayers().then((list) => {
      if (cancelled) return;
      setPlayers(list);

      const remembered = read(PLAYER_KEY);
      const found = list.find((p) => p.id === remembered);
      if (found) setPlayer(found);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async (playerId: string) => {
    setCollection(await client.getCollection(playerId));
  }, []);

  useEffect(() => {
    if (player) void refresh(player.id);
  }, [player, refresh]);

  const choosePlayer = (next: CardPlayer) => {
    setPlayer(next);
    write(PLAYER_KEY, next.id);
    setOpeningPack(null);
    setRevealing(false);
    setViewing(null);
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
    collection?.owned.forEach((card) => map.set(card.player.id, card.count));
    return map;
  }, [collection]);

  /*
   * One book. Legends are not a separate view behind a tab — they are simply more
   * pages, appended once unlocked, so the album grows rather than splitting in
   * two. Before the unlock they are absent entirely; the point of the unlock is
   * discovering there is more book than you thought.
   */
  const sections: AlbumSection[] = useMemo(() => {
    if (!collection) return [];
    /*
     * Ascending by rating, so the book builds toward its best page: you open on
     * the commons and the last spread is the players you are least likely to
     * hold. Sorted explicitly rather than reversed, because the source order is
     * the leaderboard's and should not be relied on here.
     */
    const ascending = (players: CardPlayer[]): CardPlayer[] =>
      players.slice().sort((a, b) => a.visibleRating - b.visibleRating);

    const all: AlbumSection[] = [
      { title: 'Actieve spelers', players: ascending(collection.pool), counts },
    ];
    if (collection.legendsUnlocked && collection.legends.length > 0) {
      all.push({ title: 'Legendes', players: ascending(collection.legends), counts });
    }
    return all;
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

  const eligible = !player || player.numberOfGames >= MIN_GAMES;

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

  const grant = (options: Parameters<typeof mockDebug.grantPack>[0]) => {
    mockDebug.grantPack(options);
    if (player) void refresh(player.id);
  };

  /* ---------------------------------------------------------------- */

  const controls = (
    <div className="game-row">
      <PlayerPicker players={players} value={player} onChange={choosePlayer} />
      <label className="game-check">
        <input type="checkbox" checked={fastMode} onChange={toggleFast} />
        snel openen
      </label>
    </div>
  );

  const footer = player && eligible && (
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

  // No title or subtitle: the book's own cover says whose album it is.
  return (
    <GameShell controls={controls} footer={footer || undefined}>
      {!player ? (
        <div className="game-notice">
          Typ je naam hierboven om je album te openen.
        </div>
      ) : !eligible ? (
        <div className="game-notice">
          {splitName(player.name).display} heeft {player.numberOfGames} wedstrijden
          gespeeld.
          <br />
          Vanaf {MIN_GAMES} wedstrijden gaat je album open.
        </div>
      ) : (
        /*
          One layout for both states. The opener takes the book's place inside
          `.album-main`; the shelf never unmounts and never moves, because
          `--shelf-room` is worked out from the viewport rather than measured off
          whatever is currently in the middle. So the packet you open next is a click
          in the place you just clicked, with no return trip through the album.

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
          {shelfPacks.length > 0 ? (
            <aside className={`album-side${revealing ? ' album-side--set-aside' : ''}`}>
              <div className="pack-shelf">
                {shelfPacks.map((pack) => (
                  <PackTile key={pack.id} pack={pack} onOpen={openPack} />
                ))}
              </div>
            </aside>
          ) : null}

          <div className="album-main">
            {openingPack ? (
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
                sections={sections}
                owner={ownerName}
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
          <span className="game-plate__label">Testpaneel — fase 1</span>
          <div className="game-row">
            {/*
              Only the three real pack sizes. There are no tier-guaranteed packs:
              every card in every pack is drawn on the agreed odds. (A forced
              draw is still reachable from the console via
              `cardDebug.grantPack({ size, reason, guaranteeTier })` for
              exercising the 85+ ceremony without waiting on a ~3% roll.)
            */}
            {[1, 3, 5].map((size) => (
              <button
                key={size}
                type="button"
                className="game-button game-button--small"
                onClick={() => grant({ size, reason: 'testpakje' })}
              >
                pakje ({size} {size === 1 ? 'kaart' : 'kaarten'})
              </button>
            ))}
            {/* One card each, so a single ceremony level can be watched in
                isolation. Guaranteed by level rather than tier: 75-79 and 80-84
                are both Goud, so a tier guarantee cannot separate them. */}
            {[
              { level: 1, label: '1 kaart (75+)' },
              { level: 2, label: '1 kaart (80+)' },
              { level: 3, label: '1 kaart (85+)' },
            ].map(({ level, label }) => (
              <button
                key={level}
                type="button"
                className="game-button game-button--small"
                onClick={() =>
                  grant({ size: 1, reason: `test — niveau ${level}`, guaranteeLevel: level })
                }
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="game-button game-button--small"
              onClick={() =>
                // activePool is ordered by rating, so [0] is the top player.
                grant({
                  size: 1,
                  reason: 'test — nummer 1',
                  guaranteePlayerId: activePool()[0]?.id,
                })
              }
            >
              1 kaart (Petar)
            </button>
            <button
              type="button"
              className="game-button game-button--small"
              onClick={() => {
                mockDebug.setLegendsUnlocked(!collection?.legendsUnlocked);
                if (player) void refresh(player.id);
              }}
            >
              legendes aan/uit
            </button>
            <button
              type="button"
              className="game-button game-button--small"
              onClick={() => {
                mockDebug.clearCollection();
                if (player) void refresh(player.id);
              }}
            >
              leegmaken
            </button>
            <button
              type="button"
              className="game-button game-button--small"
              onClick={() => {
                mockDebug.resetCollection();
                if (player) void refresh(player.id);
              }}
            >
              resetten
            </button>
            <button
              type="button"
              className="game-button game-button--small"
              onClick={() => mockDebug.sampleOdds()}
            >
              kansen (console)
            </button>
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
