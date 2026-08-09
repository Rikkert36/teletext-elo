import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Album, { AlbumSection, albumSlotOrder } from '../components/Album';
import CardViewer from '../components/CardViewer';
import GameShell from '../components/GameShell';
import PackOpener, { REVEAL_MS, REVEAL_RIM_AT } from '../components/PackOpener';
import PackTile from '../components/PackTile';
import PlayerPicker from '../components/PlayerPicker';
import { CollectionState, mockCardsClient, mockDebug } from '../clients/cardsClient';
import {
  CardPlayer,
  MIN_GAMES,
  Pack,
  RevealedCard,
  activePool,
  ceremonyBuildRatio,
  splitName,
} from '../mock/cardMock';
import {
  DEFAULT_CEREMONY_MS,
  DEFAULT_SCALE,
  getCeremonyMs,
  ms,
} from '../utils/animationSpeed';
import {
  STAGE_THEMES,
  StageTheme,
  getStageTheme,
  setStageTheme,
} from '../utils/stageTheme';
import {
  ALBUM_STYLES,
  AlbumStyle,
  getAlbumStyle,
  setAlbumStyle,
} from '../utils/albumStyle';
import { REVEAL_SOUNDS, getRevealSound, setRevealSound } from '../utils/revealSound';
import { playNameReveal, playRareRise } from '../utils/sounds';
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
  const [stageTheme, setStageThemeState] = useState<StageTheme>(getStageTheme);
  const [albumStyle, setAlbumStyleState] = useState<AlbumStyle>(getAlbumStyle);
  const [revealSound, setRevealSoundState] = useState(getRevealSound);

  /** Auditions a level at exactly the length and intensity a real reveal uses. */
  const previewRiser = (level: number) =>
    playRareRise(ms(Math.round(getCeremonyMs() * ceremonyBuildRatio(level))), level / 4);

  /**
   * Auditions the face reveal at exactly the accent a real one uses.
   *
   * The candidates are timed in fractions of the reveal and take only the accent
   * from the caller, so passing the beat's own number is the whole of what makes
   * this the real thing rather than an approximation — and it tracks the pacing
   * multiplier for free, because `ms()` is what produces it.
   */
  const previewRevealSound = () => playNameReveal(ms(REVEAL_MS * REVEAL_RIM_AT));

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
                style={albumStyle}
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
        `--debug` keeps the tabletop stages (F–J) from dressing the test panel as a
        piece of furniture along with everything else on the table. It is
        scaffolding, and it has to stay readable rather than in character.
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

          {/*
            Stage-direction comparison. Swaps a class on <html>, which re-themes
            the chrome and the book's inside covers together. Delete once one is
            chosen.
          */}
          {/*
            Two rows, because the two families answer different questions. A–E ask
            what screen the book is displayed on; F–J ask what table it is lying on
            — and in those, the rest of the page becomes objects on that table too.
          */}
          {[
            { label: 'achtergrond', tabletop: false },
            { label: 'tafelblad', tabletop: true },
          ].map((group) => (
            <div key={group.label} className="game-row" style={{ marginTop: 10 }}>
              <span className="game-muted" style={{ minWidth: 128 }}>
                {group.label}
              </span>
              {STAGE_THEMES.filter((theme) => 'tabletop' in theme === group.tabletop).map(
                (theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className="game-button game-button--small"
                    onClick={() => setStageThemeState(setStageTheme(theme.id))}
                    disabled={stageTheme === theme.id}
                  >
                    {theme.label}
                  </button>
                ),
              )}
            </div>
          ))}

          {/*
            Album candidates. Independent of the stage theme — that is the screen
            the book sits on, this is the book. Delete once one is chosen, along
            with utils/albumStyle.ts and styles/albumstyle.css.
          */}
          <div className="game-row" style={{ marginTop: 10 }}>
            <span className="game-muted" style={{ minWidth: 128 }}>
              album
            </span>
            {ALBUM_STYLES.map((option) => (
              <button
                key={option.id}
                type="button"
                className="game-button game-button--small"
                onClick={() => setAlbumStyleState(setAlbumStyle(option.id))}
                disabled={albumStyle === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/*
            What the face reveal sounds like. The shipped sound plus three that
            each bring their own accent voice rather than a garnish on a shared
            bell — see the note in utils/revealSound.ts about why the first
            version of this row was not an audition at all. What each one is
            and what it is trying to prove lives in utils/revealSound.ts. Delete
            this row and that module once one is chosen, and fold the winner into
            `playNameReveal` as its only body.

            ▶ auditions the current one at the live candidate's own accent, so it
            can be judged without opening a pack — but judge the winner on a real
            new card too, because on a rare one it plays over a D-minor chord and
            that is the only thing it has to survive.
          */}
          <div className="game-row" style={{ marginTop: 10 }}>
            <span className="game-muted" style={{ minWidth: 128 }}>
              onthullingsgeluid
            </span>
            <button
              type="button"
              className="game-button game-button--small"
              onClick={previewRevealSound}
            >
              ▶
            </button>
            {REVEAL_SOUNDS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="game-button game-button--small"
                onClick={() => {
                  setRevealSoundState(setRevealSound(option.id));
                  /*
                   * Plays as it is picked. Auditioning a sound is one click, not
                   * two, and switching without hearing the result is the one
                   * thing this row exists to prevent.
                   */
                  previewRevealSound();
                }}
                disabled={revealSound.id === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/*
            Auditions the build-up sound for each level without opening a pack.
            The pacing itself is settled (DEFAULT_SCALE and DEFAULT_CEREMONY_MS in
            utils/animationSpeed.ts) and no longer adjustable here.
          */}
          <div className="game-row" style={{ marginTop: 10 }}>
            <span className="game-muted" style={{ minWidth: 128 }}>
              opbouw beluisteren
            </span>
            {[
              { level: 1, label: '▶ 75+' },
              { level: 2, label: '▶ 80+' },
              { level: 3, label: '▶ 85+' },
              { level: 4, label: '▶ 90+' },
            ].map(({ level, label }) => (
              <button
                key={level}
                type="button"
                className="game-button game-button--small"
                onClick={() => previewRiser(level)}
              >
                {label}
              </button>
            ))}
            <span className="game-muted">
              ×{DEFAULT_SCALE.toFixed(2)} tempo → {ms(DEFAULT_CEREMONY_MS)} ms opbouw
            </span>
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
