import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Album, { AlbumSection } from '../components/Album';
import GameShell from '../components/GameShell';
import PackOpener from '../components/PackOpener';
import PlayerPicker from '../components/PlayerPicker';
import { CollectionState, mockCardsClient, mockDebug } from '../clients/cardsClient';
import {
  CardPlayer,
  Pack,
  RevealedCard,
  activePool,
  ceremonyBuildRatio,
  splitName,
} from '../mock/cardMock';
import {
  getCeremonyMs,
  getSpeed,
  ms,
  setCeremonyMs,
  setSpeed,
} from '../utils/animationSpeed';
import {
  STAGE_THEMES,
  StageTheme,
  getStageTheme,
  setStageTheme,
} from '../utils/stageTheme';
import { playRareRise } from '../utils/sounds';
import '../styles/game.css';

const PLAYER_KEY = 'tafelvoetbal.cards.playerId';
const FAST_KEY = 'tafelvoetbal.cards.fastOpen';
const MIN_GAMES = 10;
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
  const [tab, setTab] = useState<'actief' | 'legendes'>('actief');
  const [fastMode, setFastMode] = useState(() => read(FAST_KEY) === 'true');
  const [speed, setSpeedState] = useState(getSpeed);
  const [stageTheme, setStageThemeState] = useState<StageTheme>(getStageTheme);
  const [ceremony, setCeremonyState] = useState(getCeremonyMs);

  /** Auditions a level at exactly the length and intensity a real reveal uses. */
  const previewRiser = (level: number) =>
    playRareRise(ms(Math.round(getCeremonyMs() * ceremonyBuildRatio(level))), level / 4);

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

  const sections: AlbumSection[] = useMemo(() => {
    if (!collection) return [];
    return tab === 'legendes'
      ? [{ title: 'Legendes', players: collection.legends, counts }]
      : [{ title: 'Actieve spelers', players: collection.pool, counts }];
  }, [collection, counts, tab]);

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
    if (player) void refresh(player.id);
  }, [player, refresh]);

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

  return (
    <GameShell
      title="Het Album"
      subtitle={player ? splitName(player.name).display : undefined}
      controls={controls}
      footer={footer || undefined}
    >
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
      ) : openingPack ? (
        <>
          <PackOpener
            key={openingPack.id}
            pack={openingPack}
            onOpen={() => handleOpen(openingPack)}
            onFinished={handleFinished}
            fastMode={fastMode}
          />
          <div className="game-row" style={{ justifyContent: 'center' }}>
            <button type="button" className="game-button" onClick={() => setOpeningPack(null)}>
              terug naar het album
            </button>
          </div>
        </>
      ) : (
        <div className="album-layout">
          <aside className="album-side">
            <div className="game-plate">
              <span className="game-plate__label">Jouw pakjes</span>
              {collection && collection.packs.length > 0 ? (
                <div className="album-side__packs">
                  {collection.packs.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      className="game-button game-button--stacked"
                      onClick={() => setOpeningPack(pack)}
                    >
                      {pack.size} {pack.size === 1 ? 'kaart' : 'kaarten'}
                      <small>{pack.reason}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="game-muted">
                  Geen pakjes meer vandaag. Speel een wedstrijd of kom morgen terug.
                </span>
              )}
            </div>
          </aside>

          <div className="album-main">
            <div className="game-tabs">
              <button
                type="button"
                className={`game-tab${tab === 'actief' ? ' game-tab--active' : ''}`}
                onClick={() => setTab('actief')}
              >
                Actief
              </button>
              <button
                type="button"
                className={`game-tab${tab === 'legendes' ? ' game-tab--active' : ''}`}
                onClick={() => setTab('legendes')}
                disabled={!collection?.legendsUnlocked}
                title={
                  collection?.legendsUnlocked ? undefined : 'Verzamel eerst alle actieve spelers'
                }
              >
                Legendes {collection?.legendsUnlocked ? '' : '🔒'}
              </button>
            </div>

            <Album sections={sections} />
          </div>
        </div>
      )}

      {SHOW_DEBUG ? (
        <div className="game-plate" style={{ marginTop: 18 }}>
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
            The single pacing knob. Drives both the JS sequencing and every CSS
            duration, so they cannot drift apart. Persists per browser; bake the
            value you settle on into DEFAULT_SCALE in utils/animationSpeed.ts.
          */}
          <div className="game-row" style={{ marginTop: 10 }}>
            <span className="game-muted" style={{ minWidth: 128 }}>
              tempo ×{speed.toFixed(2)}
            </span>
            <input
              type="range"
              min={0.4}
              max={4}
              step={0.05}
              value={speed}
              onChange={(e) => setSpeedState(setSpeed(parseFloat(e.target.value)))}
              style={{ flex: 1, maxWidth: 320 }}
              aria-label="Animatietempo"
            />
            <button
              type="button"
              className="game-button game-button--small"
              onClick={() => setSpeedState(setSpeed(1))}
            >
              1× terug
            </button>
            <span className="game-muted">hoger = langzamer</span>
          </div>

          {/*
            Stage-direction comparison. Swaps a class on <html>, which re-themes
            the chrome and the book's inside covers together. Delete once one is
            chosen.
          */}
          <div className="game-row" style={{ marginTop: 10 }}>
            <span className="game-muted" style={{ minWidth: 128 }}>
              achtergrond
            </span>
            {STAGE_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className="game-button game-button--small"
                onClick={() => setStageThemeState(setStageTheme(theme.id))}
                disabled={stageTheme === theme.id}
              >
                {theme.label}
              </button>
            ))}
          </div>

          {/*
            One slider for the whole build-up beat. The riser, the glow's CSS
            transition and the timeout before the card turns all derive from this,
            so sound and visual cannot drift apart.
          */}
          <div className="game-row" style={{ marginTop: 10 }}>
            <span className="game-muted" style={{ minWidth: 128 }}>
              opbouw {ceremony} ms
            </span>
            <input
              type="range"
              min={350}
              max={3200}
              step={10}
              value={ceremony}
              onChange={(e) => setCeremonyState(setCeremonyMs(parseInt(e.target.value, 10)))}
              style={{ flex: 1, maxWidth: 320 }}
              aria-label="Lengte van de opbouw"
            />
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
              ×{speed.toFixed(2)} tempo → {ms(ceremony)} ms echt
            </span>
          </div>
        </div>
      ) : null}
    </GameShell>
  );
};

export default CollectionPage;
